import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import YAML from "yaml";

const workflowUrl = new URL(
  "../.github/workflows/production-deploy.yml",
  import.meta.url
);

async function readWorkflow() {
  const text = await readFile(workflowUrl, "utf8");
  return { text, workflow: YAML.parse(text) };
}

function stepByName(job, name) {
  const step = job.steps.find((candidate) => candidate.name === name);
  assert.ok(step, `Missing workflow step: ${name}`);
  return step;
}

test("production release has one manual entrypoint and one workflow-wide writer lock", async () => {
  const { text, workflow } = await readWorkflow();

  assert.deepEqual(Object.keys(workflow.on), ["workflow_dispatch"]);
  assert.doesNotMatch(text, /^\s*(?:push|pull_request|pull_request_target|schedule):/mu);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.deepEqual(workflow.concurrency, {
    group: "mais-production-schema-deploy-promote-v1",
    "cancel-in-progress": false
  });

  const inputs = workflow.on.workflow_dispatch.inputs;
  assert.deepEqual(Object.keys(inputs).sort(), [
    "candidate_sha",
    "mode",
    "schema_confirmation"
  ]);
  assert.equal(inputs.mode.type, "choice");
  assert.equal(inputs.mode.required, true);
  assert.equal(inputs.mode.default, "schema-preflight");
  assert.deepEqual(inputs.mode.options, ["schema-preflight", "deploy"]);
  assert.equal(inputs.candidate_sha.type, "string");
  assert.equal(inputs.candidate_sha.required, true);
  assert.equal(inputs.schema_confirmation.type, "string");
  assert.equal(inputs.schema_confirmation.required, false);
  assert.equal(inputs.schema_confirmation.default, "");
});

test("both modes bind a protected main event to the exact checked-out SHA and tree", async () => {
  const { workflow } = await readWorkflow();

  for (const [jobName, mode] of [
    ["schema-preflight", "schema-preflight"],
    ["deploy", "deploy"]
  ]) {
    const job = workflow.jobs[jobName];
    assert.ok(job, `Missing ${jobName} job`);
    assert.equal(job.if, `\${{ inputs.mode == '${mode}' }}`);
    assert.equal(job["runs-on"], "ubuntu-latest");
    assert.equal(job.environment, "production");

    const checkout = stepByName(job, "Check out exact protected-main candidate");
    assert.equal(
      checkout.uses,
      "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683"
    );
    assert.equal(checkout.with.ref, "${{ github.sha }}");
    assert.equal(checkout.with["fetch-depth"], 1);
    assert.equal(checkout.with["persist-credentials"], false);

    const binding = stepByName(job, "Bind protected main SHA and tree");
    assert.equal(binding.env.EXPECTED_CANDIDATE_SHA, "${{ inputs.candidate_sha }}");
    assert.match(binding.run, /GITHUB_REPOSITORY" = "HUDongpin\/MAIS-MVP/u);
    assert.match(binding.run, /GITHUB_EVENT_NAME" = "workflow_dispatch/u);
    assert.match(binding.run, /GITHUB_REF" = "refs\/heads\/main/u);
    assert.match(binding.run, /GITHUB_REF_PROTECTED" = "true/u);
    assert.match(binding.run, /GITHUB_SHA" = "\$EXPECTED_CANDIDATE_SHA/u);
    assert.match(binding.run, /git rev-parse --verify HEAD/u);
    assert.match(binding.run, /git rev-parse --verify 'HEAD\^\{tree\}'/u);
    assert.match(binding.run, /MAIS_RELEASE_SHA/u);
    assert.match(binding.run, /MAIS_RELEASE_TREE_SHA/u);
    assert.match(binding.run, /git status --porcelain=v1 --untracked-files=all/u);

    const setup = stepByName(job, "Set up Node 24");
    assert.equal(
      setup.uses,
      "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020"
    );
    assert.equal(setup.with["node-version"], 24);
    assert.equal(stepByName(job, "Install locked dependencies").run, "npm ci");
  }
});

test("schema preflight emits only the schema gate safe JSON evidence and confirmation", async () => {
  const { workflow } = await readWorkflow();
  const job = workflow.jobs["schema-preflight"];
  const gate = stepByName(job, "Read-only production schema preflight");

  assert.ok(job["timeout-minutes"] >= 20);
  assert.deepEqual(gate.env, {
    VERCEL_TOKEN: "${{ secrets.VERCEL_TOKEN }}"
  });
  assert.match(
    gate.run,
    /^node --import tsx scripts\/teacher-notice-production-schema-gate\.mjs --preflight \\\n+  "--candidate-sha=\$MAIS_RELEASE_SHA" \\\n+  "--expected-tree-sha=\$MAIS_RELEASE_TREE_SHA"$/u
  );
  assert.equal(job.outputs, undefined);
  assert.equal(job.steps.at(-1), gate, "No later step may decorate or leak schema evidence.");
});

test("deploy requires the exact confirmation and invokes the serialized production wrapper", async () => {
  const { workflow } = await readWorkflow();
  const job = workflow.jobs.deploy;
  const deploy = stepByName(job, "Apply schema and deploy the exact candidate");

  assert.ok(job["timeout-minutes"] >= 60);
  assert.deepEqual(deploy.env, {
    GITHUB_TOKEN: "${{ secrets.MAIS_RELEASE_GITHUB_TOKEN }}",
    MAIS_PRODUCTION_DEPLOY_EXECUTION_CONTEXT: "github-actions-serialized-v1",
    MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM:
      "${{ inputs.schema_confirmation }}",
    VERCEL_TOKEN: "${{ secrets.VERCEL_TOKEN }}"
  });
  assert.match(
    deploy.run,
    /^test -n "\$MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM"\n+npm run vercel:production -- --run-id "\$GITHUB_RUN_ID-\$GITHUB_RUN_ATTEMPT"$/u
  );

  const bindingIndex = job.steps.findIndex(
    (step) => step.name === "Bind protected main SHA and tree"
  );
  const installIndex = job.steps.findIndex((step) => step.name === "Install locked dependencies");
  const deployIndex = job.steps.indexOf(deploy);
  assert.ok(bindingIndex >= 0 && bindingIndex < installIndex && installIndex < deployIndex);

  const releaseRecord = stepByName(job, "Retain the safe production release record");
  assert.equal(
    releaseRecord.uses,
    "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02"
  );
  assert.deepEqual(releaseRecord.with, {
    name: "mais-production-release-${{ github.run_id }}-${{ github.run_attempt }}",
    path: ".tmp/vercel-production-evidence/run-${{ github.run_id }}-attempt-${{ github.run_attempt }}-${{ github.sha }}.json",
    "if-no-files-found": "error",
    "include-hidden-files": true,
    "retention-days": 90,
    "compression-level": 0
  });
  assert.ok(job.steps.indexOf(releaseRecord) > deployIndex);
});

test("no shell body interpolates a secret or emits a credential-like value", async () => {
  const { text, workflow } = await readWorkflow();
  const runBodies = Object.values(workflow.jobs)
    .flatMap((job) => job.steps)
    .map((step) => step.run)
    .filter((run) => typeof run === "string");

  for (const run of runBodies) {
    assert.doesNotMatch(run, /\$\{\{\s*secrets\./u);
    assert.doesNotMatch(run, /\becho\b.*(?:TOKEN|CONFIRM|SECRET|PASSWORD)/iu);
  }
  assert.doesNotMatch(text, /secrets\.GITHUB_TOKEN/u);
  assert.match(text, /secrets\.MAIS_RELEASE_GITHUB_TOKEN/u);
  assert.match(text, /secrets\.VERCEL_TOKEN/u);
  assert.doesNotMatch(text, /\b(?:git push|git pull|vercel promote|vercel deploy)\b/iu);
});
