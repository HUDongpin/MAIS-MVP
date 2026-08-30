import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { parse as parseYaml } from "yaml";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");

async function loadWorkflow() {
  const source = await readFile(workflowPath, "utf8");
  return { source, workflow: parseYaml(source) };
}

const githubWorkspaceExpression = "${{ github.workspace }}";
const selectorPrefix =
  "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-legacy-byte-review-20260828/reaffirmations";
const selectorContracts = Object.freeze({
  legacy: Object.freeze({
    manifest: `${selectorPrefix}/session-privacy-ux-20260828/promotion-manifest.v2.json`,
    receipt: `${selectorPrefix}/session-privacy-ux-20260828/shadow-receipt.v2.json`,
    receiptAbsolute: `${githubWorkspaceExpression}/${selectorPrefix}/session-privacy-ux-20260828/shadow-receipt.v2.json`
  }),
  reaffirmed: Object.freeze({
    manifest: `${selectorPrefix}/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/promotion-manifest.v2.json`,
    receipt: `${selectorPrefix}/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/promotion-shadow-receipt.v2.json`,
    receiptAbsolute: `${githubWorkspaceExpression}/${selectorPrefix}/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/promotion-shadow-receipt.v2.json`,
    reaffirmation: `${selectorPrefix}/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/reaffirmation.v2.json`
  })
});

function assertPromotionSelectorContract(job) {
  const env = job?.env ?? {};
  const hasReaffirmation = Object.prototype.hasOwnProperty.call(env, "PROMOTION_REAFFIRMATION");
  const expected = hasReaffirmation ? selectorContracts.reaffirmed : selectorContracts.legacy;

  assert.equal(env.PROMOTION_MANIFEST, expected.manifest);
  assert.equal(env.PROMOTION_CANONICAL_RECEIPT, expected.receipt);
  assert.equal(env.PROMOTION_CANONICAL_RECEIPT_ABSOLUTE, expected.receiptAbsolute);
  assert.equal(env.PROMOTION_REAFFIRMATION, expected.reaffirmation);
  assert.equal(
    path.posix.dirname(env.PROMOTION_MANIFEST),
    path.posix.dirname(env.PROMOTION_CANONICAL_RECEIPT),
    "the selected Manifest and canonical Receipt must be one atomic revision pair"
  );
  if (hasReaffirmation) {
    assert.equal(
      path.posix.dirname(env.PROMOTION_MANIFEST),
      path.posix.dirname(env.PROMOTION_REAFFIRMATION),
      "the selected Manifest, Receipt, and Reaffirmation must share one atomic root"
    );
  }
}

function rewriteSelectorFixture(source, workflow, contract) {
  const currentEnv = workflow.jobs["promotion-shadow-gate"].env;
  let fixtureSource = source;
  for (const [key, value] of [
    ["PROMOTION_MANIFEST", contract.manifest],
    ["PROMOTION_CANONICAL_RECEIPT", contract.receipt],
    ["PROMOTION_CANONICAL_RECEIPT_ABSOLUTE", contract.receiptAbsolute]
  ]) {
    fixtureSource = fixtureSource.replace(`      ${key}: ${currentEnv[key]}\n`, `      ${key}: ${value}\n`);
  }

  const currentReaffirmationLine = currentEnv.PROMOTION_REAFFIRMATION
    ? `      PROMOTION_REAFFIRMATION: ${currentEnv.PROMOTION_REAFFIRMATION}\n`
    : "";
  const targetReaffirmationLine = contract.reaffirmation
    ? `      PROMOTION_REAFFIRMATION: ${contract.reaffirmation}\n`
    : "";
  if (currentReaffirmationLine) {
    fixtureSource = fixtureSource.replace(currentReaffirmationLine, targetReaffirmationLine);
  } else if (targetReaffirmationLine) {
    const runIdLine = "      PROMOTION_RUN_ID: ci-${{ github.run_id }}-${{ github.run_attempt }}\n";
    assert.ok(fixtureSource.includes(runIdLine), "selector fixture must contain the CI run identity");
    fixtureSource = fixtureSource.replace(runIdLine, `${runIdLine}${targetReaffirmationLine}`);
  }
  return fixtureSource;
}

test("Promotion Gate public scripts select v2.6 and expose no live-capable command", async () => {
  const pkg = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
  assert.deepEqual(
    Object.fromEntries([
      "promotion:validate",
      "promotion:shadow",
      "promotion:verify-receipt"
    ].map((name) => [name, pkg.scripts[name]])),
    {
      "promotion:validate": "node coordination/integration/v2/promotion-gate-v2.mjs validate",
      "promotion:shadow": "node coordination/integration/v2/promotion-gate-v2.mjs shadow",
      "promotion:verify-receipt": "node coordination/integration/v2/promotion-gate-v2.mjs verify-receipt"
    }
  );
  assert.match(pkg.scripts["test:promotion-gate"], /coordination\/integration\/v2\/promotion-gate-v2\.test\.mjs/u);
  assert.match(pkg.scripts["test:promotion-gate"], /scripts\/promotion-shadow-workflow-v2\.test\.mjs/u);
  for (const forbidden of [
    "promotion:preview",
    "promotion:deploy",
    "promotion:live",
    "promotion:promote-live",
    "promote:live",
    "promote-live"
  ]) {
    assert.equal(pkg.scripts[forbidden], undefined, `${forbidden} must not exist`);
  }
});

test("Promotion Shadow v2 CI validates current HEAD and replays the exact canonical execution commit", async () => {
  const { source, workflow } = await loadWorkflow();
  assert.equal(workflow.name, "promotion-shadow-gate");
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push", "workflow_dispatch"]);
  assert.equal(workflow.on.pull_request, null);
  assert.deepEqual(workflow.on.push, { branches: ["main"] });
  assert.equal(workflow.on.workflow_dispatch, null);
  assert.doesNotMatch(source, /^\s*paths(?:-ignore)?\s*:/mu);
  assert.doesNotMatch(source, /continue-on-error\s*:/u);

  const job = workflow.jobs?.["promotion-shadow-gate"];
  assert.ok(job);
  assert.equal(job.name, "promotion-shadow-gate");
  assert.equal(job.permissions?.contents, "read");
  assertPromotionSelectorContract(job);
  assert.ok(Array.isArray(job.steps));
  const stepByName = new Map(job.steps.map((step) => [step.name, step]));
  const checkout = stepByName.get("Check out repository");
  assert.equal(checkout.uses, "actions/checkout@11d5960a326750d5838078e36cf38b85af677262");
  assert.equal(checkout.with?.["fetch-depth"], 0);
  assert.equal(checkout.with?.["persist-credentials"], false);
  assert.equal(
    stepByName.get("Set up Node").uses,
    "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020"
  );
  assert.equal(
    stepByName.get("Upload Promotion Shadow gate artifacts").uses,
    "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02"
  );

  const currentValidation = stepByName.get("Validate current Promotion inputs and runtime graph");
  assert.equal(currentValidation.if, "${{ always() }}");
  assert.match(currentValidation.run, /promotion:validate -- --manifest "\$PROMOTION_MANIFEST" --json/u);
  assert.match(currentValidation.run, /promotion-validation-result\.v2/u);
  assert.match(currentValidation.run, /liveAllowed !== false/u);

  const resolver = stepByName.get("Resolve committed canonical Receipt execution commit");
  const prepare = stepByName.get("Prepare detached canonical execution worktree");
  assert.equal(resolver.id, "resolve-promotion-execution");
  assert.equal(resolver.if, "${{ always() }}");
  assert.match(resolver.run, /execFileSync\("git", \["show", `HEAD:\$\{receiptRelativePath\}`\]/u);
  assert.match(resolver.run, /receipt\.schemaVersion !== "promotion-receipt\.v2"/u);
  assert.match(resolver.run, /receipt\.result !== "pass"/u);
  assert.match(resolver.run, /receipt\.binding\?\.liveAllowed !== false/u);
  assert.match(resolver.run, /openSync\(copyPath, "wx", 0o600\)/u);
  assert.match(prepare.run, /git merge-base --is-ancestor "\$PROMOTION_EXECUTION_COMMIT" HEAD/u);
  assert.match(prepare.run, /git worktree add --detach "\$PROMOTION_EXECUTION_WORKTREE" "\$PROMOTION_EXECUTION_COMMIT"/u);
  assert.doesNotMatch(prepare.run, /\bgit\s+(?:fetch|pull|clone)\b/u);

  const fresh = stepByName.get("Execute canonical pilot shadow");
  const replay = stepByName.get("Replay canonical pilot with distinct run identity");
  const compare = stepByName.get("Compare canonical semantic Receipt digests");
  const verify = stepByName.get("Verify fresh replay and canonical Receipts");
  for (const step of [fresh, replay, compare, verify]) {
    assert.ok(step);
    assert.equal(step.if, "${{ always() }}");
  }
  assert.match(fresh.run, /promotion:shadow -- --manifest "\$PROMOTION_MANIFEST" --run-id "\$PROMOTION_RUN_ID" --json/u);
  assert.match(replay.run, /promotion:shadow -- --manifest "\$PROMOTION_MANIFEST" --run-id "\$PROMOTION_REPLAY_RUN_ID" --json/u);
  assert.match(compare.run, /semanticReceiptDigest/u);
  assert.doesNotMatch(compare.run, /rawReceiptDigest/u);
  assert.match(verify.run, /promotion:verify-receipt/u);
  assert.match(verify.run, /promotion-receipt-verification\.v2/u);
  assert.match(verify.run, /report\.valid !== true/u);
  assert.match(verify.run, /report\.liveAllowed !== false/u);

  const upload = stepByName.get("Upload Promotion Shadow gate artifacts");
  assert.equal(upload.if, "${{ always() && steps.assert-artifact-set.outcome == 'success' }}");
  assert.equal(upload.with?.path, "${{ runner.temp }}/promotion-shadow-gate-v2-artifacts/");
  assert.equal(upload.with?.["if-no-files-found"], "error");
  const final = stepByName.get("Enforce Promotion Shadow Gate outcome");
  assert.equal(final.if, "${{ always() }}");
  assert.match(final.run, /result !== "pass"/u);
  assert.match(final.run, /Promotion Shadow Gate remains red/u);

  const gateRuns = [currentValidation.run, fresh.run, replay.run, verify.run].join("\n");
  assert.doesNotMatch(gateRuns, /promotion:(?:preview|deploy|live|promote-live)/u);
  assert.doesNotMatch(gateRuns, /\b(?:curl|wget|vercel|provider|database|promote-live)\b/iu);
});

test("Promotion Shadow selector contract is transition-aware and exact", async () => {
  const { source, workflow } = await loadWorkflow();
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "promotion-shadow-selector-contract-"));
  try {
    for (const [name, contract] of Object.entries(selectorContracts)) {
      const fixturePath = path.join(fixtureRoot, `${name}.yml`);
      await writeFile(fixturePath, rewriteSelectorFixture(source, workflow, contract));
      const fixtureWorkflow = parseYaml(await readFile(fixturePath, "utf8"));
      assertPromotionSelectorContract(fixtureWorkflow.jobs["promotion-shadow-gate"]);
    }

    const reaffirmedFixture = parseYaml(
      await readFile(path.join(fixtureRoot, "reaffirmed.yml"), "utf8")
    );
    const invalidSelectors = [
      ["PROMOTION_MANIFEST", `${selectorContracts.reaffirmed.manifest}.suffix`],
      ["PROMOTION_CANONICAL_RECEIPT", selectorContracts.legacy.receipt],
      ["PROMOTION_CANONICAL_RECEIPT_ABSOLUTE", selectorContracts.legacy.receiptAbsolute],
      ["PROMOTION_REAFFIRMATION", `${selectorContracts.reaffirmed.reaffirmation}.suffix`]
    ];
    for (const [key, value] of invalidSelectors) {
      const mutatedWorkflow = structuredClone(reaffirmedFixture);
      mutatedWorkflow.jobs["promotion-shadow-gate"].env[key] = value;
      assert.throws(
        () => assertPromotionSelectorContract(mutatedWorkflow.jobs["promotion-shadow-gate"]),
        `${key} must reject a non-exact selector`
      );
    }
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("Promotion Shadow v2 final enforcement fails closed for any authentic non-pass artifact", async () => {
  const { workflow } = await loadWorkflow();
  const final = workflow.jobs["promotion-shadow-gate"].steps.find(
    (step) => step.name === "Enforce Promotion Shadow Gate outcome"
  );
  assert.ok(final);
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "promotion-shadow-workflow-v2-"));
  const names = [
    "PROMOTION_CURRENT_VALIDATION",
    "PROMOTION_FRESH_RECEIPT",
    "PROMOTION_REPLAY_RECEIPT",
    "PROMOTION_CANONICAL_RECEIPT_COPY",
    "PROMOTION_FRESH_VERIFICATION",
    "PROMOTION_REPLAY_VERIFICATION",
    "PROMOTION_CANONICAL_VERIFICATION"
  ];
  const paths = Object.fromEntries(names.map((name) => [name, path.join(fixtureRoot, `${name}.json`)]));
  const runFinal = () => spawnSync("bash", ["-c", final.run], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, GITHUB_WORKSPACE: repoRoot, ...paths }
  });
  try {
    for (const artifactPath of Object.values(paths)) {
      await writeFile(artifactPath, `${JSON.stringify({ result: "pass" })}\n`);
    }
    const passing = runFinal();
    assert.equal(passing.status, 0, `${passing.stdout}\n${passing.stderr}`);

    await writeFile(paths.PROMOTION_CURRENT_VALIDATION, `${JSON.stringify({ result: "blocked" })}\n`);
    const blocked = runFinal();
    assert.notEqual(blocked.status, 0);
    assert.match(`${blocked.stdout}\n${blocked.stderr}`, /currentValidation=blocked/u);

    await writeFile(paths.PROMOTION_CURRENT_VALIDATION, `${JSON.stringify({ result: "pass" })}\n`);
    await writeFile(paths.PROMOTION_CANONICAL_RECEIPT_COPY, `${JSON.stringify({ result: "fail" })}\n`);
    const failed = runFinal();
    assert.notEqual(failed.status, 0);
    assert.match(`${failed.stdout}\n${failed.stderr}`, /canonicalReceipt=fail/u);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
