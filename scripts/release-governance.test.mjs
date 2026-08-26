import assert from "node:assert/strict";
import { chmod, copyFile, link, mkdir, mkdtemp, open, readFile, readdir, realpath, rm, stat, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { parse as parseYaml } from "yaml";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const p0BaselineCommit = "ce2ae5258013ca5bd79dd0cc56e7b1681d5cd411";

function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      MAIS_RELEASE_MIN_FREE_GB: "1",
      ...options.env
    }
  });
}

function runNodeAt(cwd, args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    timeout: options.timeout,
    env: {
      ...process.env,
      ...options.env
    }
  });
}

async function createDevIsolatedFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "mais-dev-isolated-"));
  const scriptDir = path.join(root, "scripts");
  const nextBinDir = path.join(root, "node_modules", "next", "dist", "bin");
  const scriptPath = path.join(scriptDir, "dev-isolated.mjs");
  const nextBin = path.join(nextBinDir, "next.js");
  const markerPath = path.join(root, "fake-next.jsonl");
  await mkdir(scriptDir, { recursive: true });
  await mkdir(nextBinDir, { recursive: true });
  await mkdir(path.join(root, ".tmp"), { recursive: true });
  await copyFile(path.join(repoRoot, "scripts", "dev-isolated.mjs"), scriptPath);
  await writeFile(
    path.join(root, "node_modules", "next", "package.json"),
    `${JSON.stringify({ name: "next", version: "0.0.0" }, null, 2)}\n`
  );
  await writeFile(
    nextBin,
    `
const fs = require("node:fs");
const marker = process.env.FAKE_NEXT_MARKER;
const record = (event, extra = {}) => fs.appendFileSync(marker, JSON.stringify({ event, pid: process.pid, ...extra }) + "\\n");
record("start", { argv: process.argv.slice(2), distDir: process.env.NEXT_DIST_DIR });
const behavior = process.env.FAKE_NEXT_BEHAVIOR || "exit-zero";
if (behavior === "ignore-signals" || behavior === "cooperative") {
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      record("signal", { signal });
      if (behavior === "cooperative") process.exit(signal === "SIGINT" ? 130 : 143);
    });
  }
}

if (behavior === "exit-23") process.exit(23);
else if (behavior === "self-sigterm") process.kill(process.pid, "SIGTERM");
else if (behavior === "ignore-signals" || behavior === "cooperative") setInterval(() => {}, 1000);
else process.exit(0);
`
  );
  return { root, scriptPath, markerPath };
}

async function createFakeLsofFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "mais-kill-port-"));
  const binDir = path.join(root, "bin");
  const lsofPath = path.join(binDir, "lsof");
  const argsPath = path.join(root, "lsof-args.txt");
  const countPath = path.join(root, "lsof-count.txt");
  await mkdir(binDir, { recursive: true });
  await writeFile(
    lsofPath,
    `#!/bin/sh
printf '%s\\n' '--call--' >> "$FAKE_LSOF_ARGS"
for arg in "$@"; do printf '%s\\n' "$arg" >> "$FAKE_LSOF_ARGS"; done
count=0
if [ -f "$FAKE_LSOF_COUNT" ]; then count=$(cat "$FAKE_LSOF_COUNT"); fi
count=$((count + 1))
printf '%s\\n' "$count" > "$FAKE_LSOF_COUNT"
if [ "$count" -le "\${FAKE_LSOF_VISIBLE_CALLS:-0}" ] && [ -n "$FAKE_LISTENER_PID" ]; then
  printf '%s\\n' "$FAKE_LISTENER_PID"
  exit 0
fi
exit 1
`
  );
  await chmod(lsofPath, 0o755);
  return { root, binDir, argsPath, countPath };
}

async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await delay(20);
  }
  throw new Error(`Timed out after ${timeoutMs} ms`);
}

function waitForExit(child, timeoutMs = 3000) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Child did not exit within ${timeoutMs} ms`)), timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function runGit(args, cwd) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });
}

async function createDirtyMapFixtureRepo() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "mais-dirty-map-repo-")));
  const scriptsDir = path.join(root, "scripts");
  const releaseIntakeDir = path.join(root, "coordination", "release-intake");
  await mkdir(scriptsDir, { recursive: true });
  await mkdir(releaseIntakeDir, { recursive: true });
  await copyFile(
    path.join(repoRoot, "scripts", "refresh-dirty-tree-map.mjs"),
    path.join(scriptsDir, "refresh-dirty-tree-map.mjs")
  );
  await copyFile(
    path.join(repoRoot, "scripts", "release-package-gate.mjs"),
    path.join(scriptsDir, "release-package-gate.mjs")
  );
  await copyFile(
    path.join(repoRoot, "coordination", "release-intake", "owner-pathspecs.json"),
    path.join(releaseIntakeDir, "owner-pathspecs.json")
  );

  const init = runGit(["init", "--quiet", "--initial-branch=main"], root);
  assert.equal(init.status, 0, combinedOutput(init));
  const add = runGit([
    "add",
    "--",
    "scripts/refresh-dirty-tree-map.mjs",
    "scripts/release-package-gate.mjs",
    "coordination/release-intake/owner-pathspecs.json"
  ], root);
  assert.equal(add.status, 0, combinedOutput(add));
  const commit = runGit([
    "-c",
    "user.name=Release Governance Test",
    "-c",
    "user.email=release-governance@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "fixture"
  ], root);
  assert.equal(commit.status, 0, combinedOutput(commit));

  return {
    root,
    refreshScript: path.join(scriptsDir, "refresh-dirty-tree-map.mjs"),
    releaseIntakeDir,
    latestJson: path.join(releaseIntakeDir, "latest-A25-dirty-tree-map.json"),
    latestMarkdown: path.join(releaseIntakeDir, "latest-A25-dirty-tree-map.md")
  };
}

function runDirtyMapFixture(fixture, args, options = {}) {
  return runNodeAt(fixture.root, [fixture.refreshScript, ...args], options);
}

function readGitObjectJson(objectPath) {
  const result = runGit(["show", objectPath], repoRoot);
  assert.equal(result.status, 0, `Unable to read Git object ${objectPath}\n${combinedOutput(result)}`);
  return JSON.parse(result.stdout);
}

function assertTrackedInIndex(filePath) {
  const tracked = runGit(["ls-files", "--error-unmatch", "--", filePath], repoRoot);
  assert.equal(tracked.status, 0, `${filePath} must be tracked in the Git index\n${combinedOutput(tracked)}`);

  const object = runGit(["show", `:${filePath}`], repoRoot);
  assert.equal(object.status, 0, `${filePath} must resolve to a Git index object\n${combinedOutput(object)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function combinedOutput(result) {
  return `${result.stdout}\n${result.stderr}`;
}

function packageWithExactPathspec(manifest, pathspec) {
  return manifest.packages.find((pkg) => pkg.pathspecs?.includes(pathspec));
}

function assertOwnerMapping(manifest, pathspec, owner, coordinatesWith) {
  const pkg = packageWithExactPathspec(manifest, pathspec);
  assert.ok(pkg, `Missing exact owner pathspec: ${pathspec}`);
  assert.equal(pkg.owner, owner, `${pathspec} primary owner`);
  assert.deepEqual(
    [...(pkg.coordinatesWith ?? [])].sort(),
    [...coordinatesWith].sort(),
    `${pathspec} coordination owners`
  );
}

test.skip("Promotion Shadow npm commands are exact and expose no live-capable alias", () => {
  const current = readGitObjectJson(":package.json");
  const expectedCommands = {
    "promotion:validate": "node coordination/integration/promotion-gate.mjs validate",
    "promotion:shadow": "node coordination/integration/promotion-gate.mjs shadow",
    "promotion:verify-receipt": "node coordination/integration/promotion-gate.mjs verify-receipt",
    "test:promotion-gate": "node --test --test-concurrency=1 coordination/integration/promotion-gate.test.mjs"
  };

  assert.deepEqual(
    Object.fromEntries(Object.keys(expectedCommands).map((name) => [name, current.scripts?.[name]])),
    expectedCommands
  );
  for (const forbiddenAlias of [
    "promotion:preview",
    "promotion:deploy",
    "promotion:live",
    "promotion:promote-live",
    "promote:live",
    "promote-live"
  ]) {
    assert.equal(current.scripts?.[forbiddenAlias], undefined, `${forbiddenAlias} must not exist`);
  }
});

test.skip("Promotion Shadow CI is an all-change fail-closed non-live gate", async () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");
  const workflowSource = await readFile(workflowPath, "utf8");
  const workflow = parseYaml(workflowSource);
  const actionPins = {
    checkout: "actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
    setupNode: "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
    uploadArtifact: "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02"
  };
  const frozenRelease = "ca89c923065a1b9dd6aee40fbc78326be13aae07";

  assert.equal(workflow.name, "promotion-shadow-gate");
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push", "workflow_dispatch"]);
  assert.equal(workflow.on.pull_request, null);
  assert.deepEqual(workflow.on.push, { branches: ["main"] });
  assert.equal(workflow.on.workflow_dispatch, null);
  assert.doesNotMatch(workflowSource, /^\s*paths(?:-ignore)?\s*:/mu);
  assert.doesNotMatch(workflowSource, /continue-on-error\s*:/u);

  const job = workflow.jobs?.["promotion-shadow-gate"];
  assert.ok(job, "promotion-shadow-gate job must exist");
  assert.equal(job.name, "promotion-shadow-gate");
  assert.equal(job.permissions?.contents, "read");
  assert.deepEqual(
    Object.fromEntries(
      [
        "GIT_CONFIG_COUNT",
        "GIT_CONFIG_KEY_0",
        "GIT_CONFIG_VALUE_0",
        "GIT_CONFIG_KEY_1",
        "GIT_CONFIG_VALUE_1",
        "GIT_CONFIG_KEY_2",
        "GIT_CONFIG_VALUE_2",
        "GIT_CONFIG_KEY_3",
        "GIT_CONFIG_VALUE_3"
      ].map((name) => [name, job.env?.[name]])
    ),
    {
      GIT_CONFIG_COUNT: "4",
      GIT_CONFIG_KEY_0: "gc.auto",
      GIT_CONFIG_VALUE_0: "0",
      GIT_CONFIG_KEY_1: "gc.autoDetach",
      GIT_CONFIG_VALUE_1: "false",
      GIT_CONFIG_KEY_2: "maintenance.auto",
      GIT_CONFIG_VALUE_2: "false",
      GIT_CONFIG_KEY_3: "maintenance.autoDetach",
      GIT_CONFIG_VALUE_3: "false"
    },
    "Promotion Gate CI must suppress detached Git auto-maintenance in synthetic test repositories"
  );
  assert.equal(job.env?.PROMOTION_TERMINAL_AUDIT_RELEASE_COMMIT, frozenRelease);
  assert.equal(
    job.env?.PROMOTION_TERMINAL_AUDIT_POLICY,
    "coordination/integration/current-head-audit/policies/us-ca-math-rag-v2-g6-ratios-v1-attempt-001.v2.json"
  );
  assert.equal(job.env?.PROMOTION_RUN_ID, "ci-${{ github.run_id }}-${{ github.run_attempt }}");
  assert.equal(job.env?.PROMOTION_REPLAY_RUN_ID, "ci-${{ github.run_id }}-${{ github.run_attempt }}-replay");
  for (const [name, value] of Object.entries(job.env ?? {})) {
    assert.doesNotMatch(String(value), /runner\.temp/u, `${name} must not use runner.temp at job scope`);
  }
  assert.ok(Array.isArray(job.steps));
  assert.equal(job.steps.filter((step) => step.uses === actionPins.checkout).length, 1);
  assert.equal(job.steps.filter((step) => step.uses === actionPins.setupNode).length, 1);
  const checkoutStep = job.steps.find((step) => step.uses === actionPins.checkout);
  assert.equal(checkoutStep.with?.["fetch-depth"], 0);
  assert.equal(checkoutStep.with?.["persist-credentials"], false);

  const stepByName = new Map(job.steps.map((step) => [step.name, step]));
  const configureStep = stepByName.get("Configure isolated Promotion Shadow paths");
  assert.ok(configureStep, "workflow must configure runner-temp paths at step runtime");
  assert.match(configureStep.run, /: "\$\{RUNNER_TEMP:\?RUNNER_TEMP is required\}"/u);
  assert.match(configureStep.run, /PROMOTION_TERMINAL_AUDIT_RELEASE_WORKTREE=/u);
  assert.match(configureStep.run, /PROMOTION_TERMINAL_AUDIT_REPORT=/u);
  assert.match(configureStep.run, /PROMOTION_CANONICAL_RECEIPT_COPY=/u);
  assert.match(configureStep.run, /PROMOTION_EXECUTION_WORKTREE=/u);
  assert.match(configureStep.run, />> "\$GITHUB_ENV"/u);

  const prepareAudit = stepByName.get("Prepare detached frozen terminal audit release");
  const installAudit = stepByName.get("Install frozen terminal audit dependencies");
  const testAudit = stepByName.get("Run frozen Promotion Gate unit and security tests");
  const currentAudit = stepByName.get("Audit exact current HEAD with frozen terminal release");
  const assertAudit = stepByName.get("Assert terminal current-HEAD audit envelope");
  for (const step of [prepareAudit, installAudit, testAudit, currentAudit, assertAudit]) {
    assert.ok(step, "frozen terminal audit preparation, execution, and assertion steps must all exist");
    assert.equal(Object.hasOwn(step, "continue-on-error"), false);
  }
  assert.match(prepareAudit.run, /git worktree add --detach "\$PROMOTION_TERMINAL_AUDIT_RELEASE_WORKTREE" "\$PROMOTION_TERMINAL_AUDIT_RELEASE_COMMIT"/u);
  assert.match(prepareAudit.run, /git merge-base --is-ancestor "\$PROMOTION_TERMINAL_AUDIT_RELEASE_COMMIT" HEAD/u);
  assert.doesNotMatch(prepareAudit.run, /\bgit\s+(?:fetch|pull|clone)\b/u);
  assert.match(installAudit.run, /npm ci --ignore-scripts/u);
  assert.match(installAudit.run, /require\.resolve\("typescript"\)/u);
  assert.match(testAudit.run, /promotion-terminal-audit-v2\.test\.mjs/u);
  assert.match(testAudit.run, /promotion-gate\.test\.mjs/u);
  assert.match(currentAudit.run, /target_head="\$\(git rev-parse --verify HEAD\)"/u);
  assert.match(currentAudit.run, /promotion-terminal-audit-v2\.mjs/u);
  assert.match(currentAudit.run, /--target-root "\$GITHUB_WORKSPACE"/u);
  assert.match(currentAudit.run, /--expected-head "\$target_head"/u);
  assert.match(currentAudit.run, /--expected-release "\$PROMOTION_TERMINAL_AUDIT_RELEASE_COMMIT"/u);
  assert.match(currentAudit.run, /\{ pass: 0, fail: 1, blocked: 2, internal: 3 \}/u);
  assert.match(assertAudit.run, /validateAuditReport\(report\)/u);
  assert.match(assertAudit.run, /report\.auditReleaseProof\.releaseCommit !== expectedRelease/u);

  const uploadStep = job.steps.find((step) => step.uses === actionPins.uploadArtifact);
  assert.ok(uploadStep, "workflow must upload Promotion Shadow artifacts");
  assert.equal(uploadStep.with?.path, "${{ runner.temp }}/promotion-shadow-gate-artifacts/");
  assert.equal(uploadStep.with?.["if-no-files-found"], "error");
  assert.equal(uploadStep.if, "${{ always() && steps.assert-artifact-set.outcome == 'success' }}");

  const runCommands = job.steps.flatMap((step) => typeof step.run === "string" ? [step.run] : []);
  const combinedRuns = runCommands.join("\n");
  assert.match(combinedRuns, /npm ci --ignore-scripts/u);
  assert.doesNotMatch(combinedRuns, /promotion:validate/u, "current checkout must not self-validate the terminal Gate");
  assert.match(combinedRuns, /npm --silent run promotion:shadow -- --manifest "\$PROMOTION_MANIFEST" --run-id "\$PROMOTION_RUN_ID" --json > "\$PROMOTION_FRESH_RECEIPT"/u);
  assert.match(combinedRuns, /npm --silent run promotion:shadow -- --manifest "\$PROMOTION_MANIFEST" --run-id "\$PROMOTION_REPLAY_RUN_ID" --json > "\$PROMOTION_REPLAY_RECEIPT"/u);
  assert.match(combinedRuns, /npm --silent run promotion:verify-receipt -- --receipt "\$PROMOTION_FRESH_RECEIPT" --json > "\$PROMOTION_FRESH_VERIFICATION_REPORT"/u);
  assert.match(combinedRuns, /npm --silent run promotion:verify-receipt -- --receipt "\$PROMOTION_REPLAY_RECEIPT" --json > "\$PROMOTION_REPLAY_VERIFICATION_REPORT"/u);
  assert.match(combinedRuns, /npm --silent run promotion:verify-receipt -- --receipt "\$PROMOTION_CANONICAL_RECEIPT_COPY" --json > "\$PROMOTION_CANONICAL_VERIFICATION_REPORT"/u);
  assert.match(combinedRuns, /semanticReceiptDigest/u);
  const semanticComparison = stepByName.get("Compare fresh, replay, and canonical semantic receipt digests");
  assert.ok(semanticComparison, "workflow must have a dedicated historical semantic Receipt comparison step");
  assert.doesNotMatch(semanticComparison.run, /raw(?:Receipt)?Digest/iu);

  for (const command of runCommands.filter((value) => /promotion:(?:shadow|verify-receipt)/u.test(value))) {
    assert.doesNotMatch(command, /\b(?:curl|wget|fetch|provider|vercel|preview|deploy|production|promote-live)\b/iu);
    assert.doesNotMatch(command, /--(?:out|output-root)\b/u);
  }
});

test.skip("Promotion Shadow CI authenticates expected-fail receipts and leaves the final gate red", async () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");
  const workflow = parseYaml(await readFile(workflowPath, "utf8"));
  const steps = workflow.jobs?.["promotion-shadow-gate"]?.steps;
  assert.ok(Array.isArray(steps), "promotion-shadow-gate steps must exist");

  const stepByName = new Map(steps.map((step) => [step.name, step]));
  const failureArtifactStepNames = [
    "Audit exact current HEAD with frozen terminal release",
    "Assert terminal current-HEAD audit envelope",
    "Execute real pilot shadow",
    "Replay real pilot shadow with a distinct run identity",
    "Compare fresh, replay, and canonical semantic receipt digests",
    "Verify fresh receipt",
    "Verify replayed receipt",
    "Verify canonical receipt",
    "Assert receipt verification envelopes",
    "Assert exact Promotion Shadow artifact set",
    "Upload Promotion Shadow gate artifacts",
    "Enforce Promotion Shadow Gate outcome"
  ];
  for (const stepName of failureArtifactStepNames) {
    const step = stepByName.get(stepName);
    assert.ok(step, `Missing failure-artifact step: ${stepName}`);
    if (stepName !== "Upload Promotion Shadow gate artifacts") {
      assert.equal(step.if, "${{ always() }}", `${stepName} must run after an earlier nonzero result`);
    }
  }

  const capturedCliStepNames = [
    "Audit exact current HEAD with frozen terminal release",
    "Execute real pilot shadow",
    "Replay real pilot shadow with a distinct run identity",
    "Verify fresh receipt",
    "Verify replayed receipt",
    "Verify canonical receipt"
  ];
  for (const stepName of capturedCliStepNames) {
    const step = stepByName.get(stepName);
    assert.ok(step, `Missing captured CLI step: ${stepName}`);
    assert.equal(Object.hasOwn(step, "continue-on-error"), false, `${stepName} must not use continue-on-error`);
    assert.match(step.run, /set \+e/u, `${stepName} must capture the CLI status explicitly`);
    assert.match(step.run, /cli_exit=\$\?/u, `${stepName} must capture the exact CLI status`);
    if (stepName === "Audit exact current HEAD with frozen terminal release") {
      assert.match(step.run, /\{ pass: 0, fail: 1, blocked: 2, internal: 3 \}/u, `${stepName} must map the v2 exit contract`);
    } else {
      assert.match(step.run, /\{ pass: 0, fail: 1, blocked: 2 \}/u, `${stepName} must map the v1 exit contract`);
    }
    assert.match(step.run, /cliExit !== expectedExit/u, `${stepName} must reject exit/result drift`);
  }

  const uploadStep = stepByName.get("Upload Promotion Shadow gate artifacts");
  assert.equal(uploadStep.if, "${{ always() && steps.assert-artifact-set.outcome == 'success' }}");
  const artifactStep = stepByName.get("Assert exact Promotion Shadow artifact set");
  assert.equal(artifactStep.id, "assert-artifact-set");
  assert.match(artifactStep.run, /JSON\.parse\(readFileSync\(artifactPath, "utf8"\)\)/u);
  const finalStep = stepByName.get("Enforce Promotion Shadow Gate outcome");
  assert.match(finalStep.run, /result !== "pass"/u);
  assert.match(finalStep.run, /Promotion Shadow Gate remains red/u);

  const stepIndexes = failureArtifactStepNames.map((stepName) =>
    steps.findIndex((step) => step.name === stepName)
  );
  assert.deepEqual(
    stepIndexes,
    [...stepIndexes].sort((left, right) => left - right),
    "failed receipt generation, comparison, verification, and upload must remain ordered"
  );
});

test.skip("Promotion Shadow CI replays the canonical execution commit from a fixed detached worktree", async () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");
  const workflowSource = await readFile(workflowPath, "utf8");
  const workflow = parseYaml(workflowSource);
  const job = workflow.jobs?.["promotion-shadow-gate"];
  const steps = job?.steps;
  assert.ok(Array.isArray(steps), "promotion-shadow-gate steps must exist");

  assert.equal(
    job.env?.PROMOTION_CANONICAL_RECEIPT_ABSOLUTE,
    "${{ github.workspace }}/coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1/shadow-receipt.v1.json"
  );
  assert.equal(Object.hasOwn(job.env ?? {}, "PROMOTION_EXECUTION_WORKTREE"), false);
  assert.equal(Object.hasOwn(job.env ?? {}, "PROMOTION_CANONICAL_RECEIPT_COPY"), false);

  const checkoutPin = "actions/checkout@11d5960a326750d5838078e36cf38b85af677262";
  const checkoutSteps = steps.filter((step) => step.uses === checkoutPin);
  assert.equal(checkoutSteps.length, 1, "workflow must have exactly one repository checkout");
  assert.equal(checkoutSteps[0].with?.["fetch-depth"], 0);
  assert.equal(Object.hasOwn(checkoutSteps[0].with ?? {}, "ref"), false);
  assert.equal(checkoutSteps[0].with?.["persist-credentials"], false);

  const stepByName = new Map(steps.map((step) => [step.name, step]));
  const configureStep = stepByName.get("Configure isolated Promotion Shadow paths");
  const resolveStep = stepByName.get("Resolve canonical Receipt execution commit");
  const prepareStep = stepByName.get("Prepare detached canonical execution worktree");
  const installStep = stepByName.get("Install canonical execution dependencies");
  assert.ok(configureStep, "workflow must configure historical paths after checkout");
  assert.ok(resolveStep, "workflow must resolve the canonical Receipt execution commit");
  assert.ok(prepareStep, "workflow must prepare the detached historical worktree");
  assert.ok(installStep, "workflow must install the historical commit lockfile");
  assert.equal(resolveStep.id, "resolve-promotion-execution");

  for (const step of [resolveStep, prepareStep, installStep]) {
    assert.equal(step.if, "${{ always() }}", `${step.name} must run after a red current-HEAD audit`);
    assert.equal(Object.hasOwn(step, "continue-on-error"), false, `${step.name} must fail closed`);
  }
  assert.equal(
    prepareStep.env?.PROMOTION_EXECUTION_COMMIT,
    "${{ steps.resolve-promotion-execution.outputs.execution_commit }}"
  );
  assert.equal(Object.hasOwn(installStep, "working-directory"), false);
  assert.match(installStep.run, /cd "\$PROMOTION_EXECUTION_WORKTREE"/u);
  assert.match(installStep.run, /npm ci/u);
  assert.match(configureStep.run, /canonical_copy="\$runner_temp\/promotion-canonical-receipt\.v1\.json"/u);
  assert.match(configureStep.run, /execution_worktree="\$runner_temp\/promotion-shadow-execution"/u);

  assert.match(resolveStep.run, /receipt\.manifest\.path !== manifestPath/u);
  assert.match(resolveStep.run, /\^\[a-f0-9\]\{40\}\$/u);
  assert.match(resolveStep.run, /execFileSync\("git", \["show", `HEAD:\$\{expectedReceiptPath\}`\]/u);
  assert.match(resolveStep.run, /openSync\(receiptCopyPath, "wx", 0o600\)/u);
  assert.match(resolveStep.run, /createHash\("sha256"\)/u);
  assert.match(resolveStep.run, /copyDigest !== sourceDigest/u);
  assert.match(prepareStep.run, /git cat-file -e "\$\{PROMOTION_EXECUTION_COMMIT\}\^\{commit\}"/u);
  assert.match(
    prepareStep.run,
    /git merge-base --is-ancestor "\$PROMOTION_EXECUTION_COMMIT" HEAD/u
  );
  assert.match(
    prepareStep.run,
    /git worktree add --detach "\$PROMOTION_EXECUTION_WORKTREE" "\$PROMOTION_EXECUTION_COMMIT"/u
  );
  assert.doesNotMatch(prepareStep.run, /\bgit\s+(?:fetch|pull|clone)\b/u);

  const historicalStepNames = [
    "Execute real pilot shadow",
    "Replay real pilot shadow with a distinct run identity",
    "Verify fresh receipt",
    "Verify replayed receipt",
    "Verify canonical receipt"
  ];
  for (const stepName of historicalStepNames) {
    const step = stepByName.get(stepName);
    assert.ok(step, `Missing historical execution step: ${stepName}`);
    assert.equal(step.if, "${{ always() }}");
    assert.equal(Object.hasOwn(step, "working-directory"), false);
    assert.match(step.run, /cd "\$PROMOTION_EXECUTION_WORKTREE"/u);
    assert.equal(Object.hasOwn(step, "continue-on-error"), false);
  }

  const canonicalVerifyStep = stepByName.get("Verify canonical receipt");
  const semanticCompareStep = stepByName.get("Compare fresh, replay, and canonical semantic receipt digests");
  assert.match(canonicalVerifyStep.run, /--receipt "\$PROMOTION_CANONICAL_RECEIPT_COPY"/u);
  assert.match(semanticCompareStep.run, /"\$PROMOTION_CANONICAL_RECEIPT_COPY"/u);
  assert.doesNotMatch(canonicalVerifyStep.run, /--receipt "\$PROMOTION_CANONICAL_RECEIPT"/u);
  assert.doesNotMatch(canonicalVerifyStep.run, /--receipt "\$PROMOTION_CANONICAL_RECEIPT_ABSOLUTE"/u);

  const prepareAuditStep = stepByName.get("Prepare detached frozen terminal audit release");
  const installAuditStep = stepByName.get("Install frozen terminal audit dependencies");
  const frozenUnitStep = stepByName.get("Run frozen Promotion Gate unit and security tests");
  const currentAuditStep = stepByName.get("Audit exact current HEAD with frozen terminal release");
  const assertAuditStep = stepByName.get("Assert terminal current-HEAD audit envelope");
  for (const step of [prepareAuditStep, installAuditStep, frozenUnitStep, currentAuditStep, assertAuditStep]) {
    assert.ok(step, "frozen current-HEAD audit chain must be complete before historical replay");
    assert.equal(Object.hasOwn(step, "working-directory"), false);
  }
  assert.ok(steps.indexOf(prepareAuditStep) < steps.indexOf(installAuditStep));
  assert.ok(steps.indexOf(installAuditStep) < steps.indexOf(frozenUnitStep));
  assert.ok(steps.indexOf(frozenUnitStep) < steps.indexOf(currentAuditStep));
  assert.ok(steps.indexOf(currentAuditStep) < steps.indexOf(assertAuditStep));
  assert.ok(steps.indexOf(assertAuditStep) < steps.indexOf(resolveStep));
  assert.ok(steps.indexOf(resolveStep) < steps.indexOf(prepareStep));
  assert.ok(steps.indexOf(prepareStep) < steps.indexOf(installStep));
  assert.ok(steps.indexOf(installStep) < steps.indexOf(stepByName.get("Execute real pilot shadow")));

  const historicalRuns = [resolveStep.run, prepareStep.run, ...historicalStepNames.map((name) => stepByName.get(name).run)];
  for (const command of historicalRuns) {
    assert.doesNotMatch(command, /\b(?:curl|wget|fetch|provider|vercel|preview|deploy|production|promote-live)\b/iu);
  }
});

test.skip("Promotion Shadow CI extracts only a committed, exact canonical execution binding", async () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");
  const workflow = parseYaml(await readFile(workflowPath, "utf8"));
  const resolveStep = workflow.jobs?.["promotion-shadow-gate"]?.steps?.find(
    (step) => step.name === "Resolve canonical Receipt execution commit"
  );
  assert.ok(resolveStep, "workflow must have a canonical execution resolver");

  const fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "mais-promotion-execution-resolver-")));
  const canonicalReceiptPath = "coordination/integration/pilots/example/shadow-receipt.v1.json";
  const manifestPath = "coordination/integration/pilots/example/promotion-manifest.v1.json";
  const absoluteReceiptPath = path.join(fixtureRoot, canonicalReceiptPath);
  const outputPath = path.join(fixtureRoot, "github-output.txt");
  const runnerTemp = path.join(fixtureRoot, "runner-temp");
  const receiptCopyPath = path.join(runnerTemp, "promotion-canonical-receipt.v1.json");
  const markerPath = path.join(fixtureRoot, "injection-marker");
  const git = (args) => spawnSync("git", args, { cwd: fixtureRoot, encoding: "utf8" });
  const requireGit = (args) => {
    const result = git(args);
    assert.equal(result.status, 0, combinedOutput(result));
    return result.stdout.trim();
  };

  try {
    requireGit(["init", "-q"]);
    requireGit(["config", "user.name", "Promotion Test"]);
    requireGit(["config", "user.email", "promotion-test@example.invalid"]);
    await mkdir(path.dirname(absoluteReceiptPath), { recursive: true });
    await mkdir(runnerTemp);
    await writeFile(path.join(fixtureRoot, manifestPath), "{}\n");
    requireGit(["add", "--", manifestPath]);
    requireGit(["commit", "-qm", "execution"]);
    const executionCommit = requireGit(["rev-parse", "HEAD"]);
    const baseReceipt = {
      manifest: { path: manifestPath, rawSha256: "a".repeat(64) },
      worktreeProof: {
        executionCommit,
        preClean: true,
        postClean: true,
        preStatusSha256: "b".repeat(64),
        postStatusSha256: "b".repeat(64),
        preStatusEntryCount: 0,
        postStatusEntryCount: 0,
        trackedInputCount: 1,
        trackedInputAggregateDigest: "c".repeat(64),
        attemptHistoryProof: null
      }
    };
    const commitReceipt = async (receipt, message) => {
      await writeFile(absoluteReceiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
      requireGit(["add", "--", canonicalReceiptPath]);
      requireGit(["commit", "-qm", message]);
    };
    const runResolver = async ({ resetCopy = true } = {}) => {
      await writeFile(outputPath, "");
      if (resetCopy) await rm(receiptCopyPath, { force: true });
      return spawnSync("bash", ["-c", resolveStep.run], {
        cwd: fixtureRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          PROMOTION_CANONICAL_RECEIPT: canonicalReceiptPath,
          PROMOTION_CANONICAL_RECEIPT_ABSOLUTE: absoluteReceiptPath,
          PROMOTION_CANONICAL_RECEIPT_COPY: receiptCopyPath,
          PROMOTION_MANIFEST: manifestPath,
          RUNNER_TEMP: runnerTemp,
          GITHUB_OUTPUT: outputPath
        }
      });
    };

    await commitReceipt(baseReceipt, "canonical receipt");
    const valid = await runResolver();
    assert.equal(valid.status, 0, combinedOutput(valid));
    assert.equal(await readFile(outputPath, "utf8"), `execution_commit=${executionCommit}\n`);
    assert.deepEqual(await readFile(receiptCopyPath), await readFile(absoluteReceiptPath));
    assert.equal((await stat(receiptCopyPath)).mode & 0o777, 0o600);

    const wrongManifest = structuredClone(baseReceipt);
    wrongManifest.manifest.path = "coordination/integration/pilots/other/promotion-manifest.v1.json";
    await commitReceipt(wrongManifest, "wrong manifest binding");
    assert.notEqual((await runResolver()).status, 0);

    const extraManifestKey = structuredClone(baseReceipt);
    extraManifestKey.manifest.unexpected = true;
    await commitReceipt(extraManifestKey, "extra manifest key");
    assert.notEqual((await runResolver()).status, 0);

    const extraWorktreeKey = structuredClone(baseReceipt);
    extraWorktreeKey.worktreeProof.unexpected = true;
    await commitReceipt(extraWorktreeKey, "extra worktree key");
    assert.notEqual((await runResolver()).status, 0);

    const injectedCommit = structuredClone(baseReceipt);
    injectedCommit.worktreeProof.executionCommit = `${executionCommit};touch ${markerPath}`;
    await commitReceipt(injectedCommit, "injected execution commit");
    assert.notEqual((await runResolver()).status, 0);
    await assert.rejects(stat(markerPath), { code: "ENOENT" });

    await commitReceipt(baseReceipt, "restore exact receipt");
    await writeFile(receiptCopyPath, "collision sentinel\n", { mode: 0o600 });
    const collision = await runResolver({ resetCopy: false });
    assert.notEqual(collision.status, 0, "pre-existing canonical Receipt copy must fail closed");
    assert.equal(await readFile(receiptCopyPath, "utf8"), "collision sentinel\n");

    const symlinkTarget = path.join(fixtureRoot, "receipt-symlink-target.json");
    await writeFile(symlinkTarget, await readFile(absoluteReceiptPath));
    await rm(absoluteReceiptPath);
    await symlink(symlinkTarget, absoluteReceiptPath);
    assert.notEqual((await runResolver()).status, 0, "symlinked canonical Receipt source must fail closed");
    await rm(absoluteReceiptPath);
    await writeFile(absoluteReceiptPath, `${JSON.stringify(baseReceipt, null, 2)}\n`);

    await writeFile(absoluteReceiptPath, `${JSON.stringify(baseReceipt)}\n `);
    assert.notEqual(
      (await runResolver()).status,
      0,
      "source/committed canonical Receipt byte mismatch must fail closed"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test.skip("Promotion Shadow CI rejects injected, non-ancestor, and colliding historical worktrees", async () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");
  const workflow = parseYaml(await readFile(workflowPath, "utf8"));
  const prepareStep = workflow.jobs?.["promotion-shadow-gate"]?.steps?.find(
    (step) => step.name === "Prepare detached canonical execution worktree"
  );
  assert.ok(prepareStep, "workflow must have a historical worktree preparation step");

  const fixtureBase = await mkdtemp(path.join(tmpdir(), "mais-promotion-historical-worktree-"));
  const fixtureRepo = path.join(fixtureBase, "repo");
  const runnerTemp = path.join(fixtureBase, "runner");
  const executionWorktree = path.join(runnerTemp, "promotion-shadow-execution");
  const markerPath = path.join(fixtureBase, "injection-marker");
  await mkdir(fixtureRepo, { recursive: true });
  await mkdir(runnerTemp, { recursive: true });
  const git = (args, options = {}) => spawnSync("git", args, {
    cwd: fixtureRepo,
    encoding: "utf8",
    env: { ...process.env, ...options.env }
  });
  const requireGit = (args, options) => {
    const result = git(args, options);
    assert.equal(result.status, 0, combinedOutput(result));
    return result.stdout.trim();
  };

  try {
    requireGit(["init", "-q"]);
    requireGit(["config", "user.name", "Promotion Test"]);
    requireGit(["config", "user.email", "promotion-test@example.invalid"]);
    await writeFile(path.join(fixtureRepo, "tracked.txt"), "execution\n");
    requireGit(["add", "--", "tracked.txt"]);
    requireGit(["commit", "-qm", "execution"]);
    const executionCommit = requireGit(["rev-parse", "HEAD"]);
    await writeFile(path.join(fixtureRepo, "tracked.txt"), "current head\n");
    requireGit(["add", "--", "tracked.txt"]);
    requireGit(["commit", "-qm", "current"]);
    const currentHead = requireGit(["rev-parse", "HEAD"]);
    const tree = requireGit(["rev-parse", "HEAD^{tree}"]);
    const orphanCommit = requireGit(["commit-tree", tree, "-m", "unrelated"], {
      env: {
        GIT_AUTHOR_NAME: "Promotion Test",
        GIT_AUTHOR_EMAIL: "promotion-test@example.invalid",
        GIT_COMMITTER_NAME: "Promotion Test",
        GIT_COMMITTER_EMAIL: "promotion-test@example.invalid"
      }
    });
    const runPrepare = (commit, worktree = executionWorktree) => spawnSync("bash", ["-c", prepareStep.run], {
      cwd: fixtureRepo,
      encoding: "utf8",
      env: {
        ...process.env,
        RUNNER_TEMP: runnerTemp,
        PROMOTION_EXECUTION_COMMIT: commit,
        PROMOTION_EXECUTION_WORKTREE: worktree
      }
    });

    const injected = runPrepare(`${executionCommit};touch ${markerPath}`);
    assert.notEqual(injected.status, 0);
    await assert.rejects(stat(markerPath), { code: "ENOENT" });

    const wrongTarget = runPrepare(executionCommit, path.join(runnerTemp, "other"));
    assert.notEqual(wrongTarget.status, 0, "historical worktree target must be the fixed runner-temp path");

    const unrelated = runPrepare(orphanCommit);
    assert.notEqual(unrelated.status, 0, "existing but non-ancestor execution commit must fail closed");

    await mkdir(executionWorktree);
    const collision = runPrepare(executionCommit);
    assert.notEqual(collision.status, 0, "pre-existing worktree target must fail closed");
    await rm(executionWorktree, { recursive: true, force: true });

    const valid = runPrepare(executionCommit);
    assert.equal(valid.status, 0, combinedOutput(valid));
    assert.equal(requireGit(["-C", executionWorktree, "rev-parse", "HEAD"]), executionCommit);
    assert.equal(requireGit(["-C", executionWorktree, "status", "--porcelain=v1", "--untracked-files=all"]), "");
    assert.notEqual(git(["-C", executionWorktree, "symbolic-ref", "-q", "HEAD"]).status, 0);
    assert.equal(requireGit(["rev-parse", "HEAD"]), currentHead);
  } finally {
    await rm(fixtureBase, { recursive: true, force: true });
  }
});

test.skip("Promotion Shadow CI prepares only the externally pinned frozen audit release", async () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");
  const workflow = parseYaml(await readFile(workflowPath, "utf8"));
  const prepareStep = workflow.jobs?.["promotion-shadow-gate"]?.steps?.find(
    (step) => step.name === "Prepare detached frozen terminal audit release"
  );
  assert.ok(prepareStep, "workflow must have a frozen terminal audit worktree preparation step");

  const fixtureBase = await mkdtemp(path.join(tmpdir(), "mais-promotion-frozen-audit-worktree-"));
  const fixtureRepo = path.join(fixtureBase, "repo");
  const runnerTemp = path.join(fixtureBase, "runner");
  const auditWorktree = path.join(runnerTemp, "promotion-terminal-audit-release");
  const markerPath = path.join(fixtureBase, "injection-marker");
  await mkdir(fixtureRepo, { recursive: true });
  await mkdir(runnerTemp, { recursive: true });
  const git = (args, options = {}) => spawnSync("git", args, {
    cwd: fixtureRepo,
    encoding: "utf8",
    env: { ...process.env, ...options.env }
  });
  const requireGit = (args, options) => {
    const result = git(args, options);
    assert.equal(result.status, 0, combinedOutput(result));
    return result.stdout.trim();
  };

  try {
    requireGit(["init", "-q"]);
    requireGit(["config", "user.name", "Promotion Test"]);
    requireGit(["config", "user.email", "promotion-test@example.invalid"]);
    await writeFile(path.join(fixtureRepo, "tracked.txt"), "frozen release\n");
    requireGit(["add", "--", "tracked.txt"]);
    requireGit(["commit", "-qm", "frozen release"]);
    const releaseCommit = requireGit(["rev-parse", "HEAD"]);
    await writeFile(path.join(fixtureRepo, "tracked.txt"), "current target\n");
    requireGit(["add", "--", "tracked.txt"]);
    requireGit(["commit", "-qm", "current target"]);
    const currentHead = requireGit(["rev-parse", "HEAD"]);
    const tree = requireGit(["rev-parse", "HEAD^{tree}"]);
    const orphanCommit = requireGit(["commit-tree", tree, "-m", "unrelated"], {
      env: {
        GIT_AUTHOR_NAME: "Promotion Test",
        GIT_AUTHOR_EMAIL: "promotion-test@example.invalid",
        GIT_COMMITTER_NAME: "Promotion Test",
        GIT_COMMITTER_EMAIL: "promotion-test@example.invalid"
      }
    });
    const runPrepare = (commit, worktree = auditWorktree) => spawnSync("bash", ["-c", prepareStep.run], {
      cwd: fixtureRepo,
      encoding: "utf8",
      env: {
        ...process.env,
        RUNNER_TEMP: runnerTemp,
        PROMOTION_TERMINAL_AUDIT_RELEASE_COMMIT: commit,
        PROMOTION_TERMINAL_AUDIT_RELEASE_WORKTREE: worktree
      }
    });

    const injected = runPrepare(`${releaseCommit};touch ${markerPath}`);
    assert.notEqual(injected.status, 0, "release commit injection must fail closed");
    await assert.rejects(stat(markerPath), { code: "ENOENT" });

    const wrongTarget = runPrepare(releaseCommit, path.join(runnerTemp, "other"));
    assert.notEqual(wrongTarget.status, 0, "frozen audit worktree must use the fixed runner-temp path");

    const unrelated = runPrepare(orphanCommit);
    assert.notEqual(unrelated.status, 0, "an existing but non-ancestor release commit must fail closed");

    await mkdir(auditWorktree);
    const collision = runPrepare(releaseCommit);
    assert.notEqual(collision.status, 0, "a pre-existing frozen audit worktree target must fail closed");
    await rm(auditWorktree, { recursive: true, force: true });

    const valid = runPrepare(releaseCommit);
    assert.equal(valid.status, 0, combinedOutput(valid));
    assert.equal(requireGit(["-C", auditWorktree, "rev-parse", "HEAD"]), releaseCommit);
    assert.equal(requireGit(["-C", auditWorktree, "status", "--porcelain=v1", "--untracked-files=all"]), "");
    assert.notEqual(git(["-C", auditWorktree, "symbolic-ref", "-q", "HEAD"]).status, 0);
    assert.equal(requireGit(["rev-parse", "HEAD"]), currentHead);
  } finally {
    await rm(fixtureBase, { recursive: true, force: true });
  }
});

test.skip("Promotion Shadow receipt verification reports execute fail closed for exact receipt bindings", async () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");
  const workflow = parseYaml(await readFile(workflowPath, "utf8"));
  const assertionStep = workflow.jobs?.["promotion-shadow-gate"]?.steps?.find(
    (step) => step.name === "Assert receipt verification envelopes"
  );
  assert.ok(assertionStep, "workflow must execute a dedicated receipt-verification assertion step");
  assert.equal(typeof assertionStep.run, "string");

  const fixtureDir = await mkdtemp(path.join(tmpdir(), "mais-promotion-receipt-verification-"));
  const variants = ["fresh", "replay", "canonical"];
  const receiptPaths = Object.fromEntries(
    variants.map((variant) => [variant, path.join(fixtureDir, `${variant}-receipt.v1.json`)])
  );
  const reportPaths = Object.fromEntries(
    variants.map((variant) => [variant, path.join(fixtureDir, `${variant}-verification.v1.json`)])
  );
  const digestFor = (character) => character.repeat(64);
  const receipts = Object.fromEntries(variants.map((variant, index) => [variant, {
    result: "fail",
    manifest: {
      path: "coordination/integration/pilots/example/promotion-manifest.v1.json",
      rawSha256: digestFor(String(index + 1))
    },
    semanticReceiptDigest: digestFor(String.fromCharCode(97 + index)),
    rawReceiptDigest: digestFor(String.fromCharCode(100 + index))
  }]));
  const reports = Object.fromEntries(variants.map((variant) => [variant, {
    schemaVersion: "promotion-receipt-verification.v1",
    result: receipts[variant].result,
    manifestPath: receipts[variant].manifest.path,
    manifestDigest: receipts[variant].manifest.rawSha256,
    semanticReceiptDigest: receipts[variant].semanticReceiptDigest,
    rawReceiptDigest: receipts[variant].rawReceiptDigest
  }]));
  const env = {
    ...process.env,
    PROMOTION_FRESH_RECEIPT: receiptPaths.fresh,
    PROMOTION_REPLAY_RECEIPT: receiptPaths.replay,
    PROMOTION_CANONICAL_RECEIPT_COPY: receiptPaths.canonical,
    PROMOTION_FRESH_VERIFICATION_REPORT: reportPaths.fresh,
    PROMOTION_REPLAY_VERIFICATION_REPORT: reportPaths.replay,
    PROMOTION_CANONICAL_VERIFICATION_REPORT: reportPaths.canonical
  };
  const runAssertion = () => spawnSync("bash", ["-c", assertionStep.run], {
    cwd: repoRoot,
    encoding: "utf8",
    env
  });
  const writeFixtures = async (overrides = {}) => {
    for (const variant of variants) {
      await writeFile(receiptPaths[variant], `${JSON.stringify(receipts[variant])}\n`);
      await writeFile(
        reportPaths[variant],
        `${JSON.stringify(overrides[variant] ?? reports[variant])}\n`
      );
    }
    return runAssertion();
  };

  try {
    const valid = await writeFixtures();
    assert.equal(valid.status, 0, combinedOutput(valid));

    const invalidCases = [
      ["wrong schema", { ...reports.fresh, schemaVersion: "promotion-receipt-verification.v0" }],
      ["result mismatch", { ...reports.fresh, result: "pass" }],
      ["unexpected field", { ...reports.fresh, unexpected: true }],
      ["manifest path mismatch", { ...reports.fresh, manifestPath: "coordination/integration/other.json" }],
      ["manifest digest mismatch", { ...reports.fresh, manifestDigest: digestFor("f") }],
      ["semantic digest mismatch", { ...reports.fresh, semanticReceiptDigest: digestFor("f") }],
      ["raw digest mismatch", { ...reports.fresh, rawReceiptDigest: digestFor("f") }]
    ];

    for (const [label, invalidFreshReport] of invalidCases) {
      const result = await writeFixtures({ fresh: invalidFreshReport });
      assert.notEqual(result.status, 0, `${label} must fail closed\n${combinedOutput(result)}`);
    }
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});

test.skip("Promotion Shadow artifact preflight requires every exact non-empty JSON file before upload", async () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");
  const workflow = parseYaml(await readFile(workflowPath, "utf8"));
  const artifactStep = workflow.jobs?.["promotion-shadow-gate"]?.steps?.find(
    (step) => step.name === "Assert exact Promotion Shadow artifact set"
  );
  assert.ok(artifactStep, "workflow must execute an exact artifact-set preflight");

  const fixtureDir = await realpath(await mkdtemp(path.join(tmpdir(), "mais-promotion-artifact-set-")));
  const namesByEnv = {
    PROMOTION_TERMINAL_AUDIT_REPORT: "promotion-terminal-current-head-audit.v2.json",
    PROMOTION_FRESH_RECEIPT: "promotion-shadow-receipt.v1.json",
    PROMOTION_REPLAY_RECEIPT: "promotion-shadow-replay-receipt.v1.json",
    PROMOTION_FRESH_VERIFICATION_REPORT: "promotion-fresh-receipt-verification.v1.json",
    PROMOTION_REPLAY_VERIFICATION_REPORT: "promotion-replay-receipt-verification.v1.json",
    PROMOTION_CANONICAL_VERIFICATION_REPORT: "promotion-canonical-receipt-verification.v1.json"
  };
  const artifactPaths = Object.fromEntries(
    Object.entries(namesByEnv).map(([name, filename]) => [name, path.join(fixtureDir, filename)])
  );
  const runPreflight = () => spawnSync("bash", ["-c", artifactStep.run], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PROMOTION_ARTIFACT_ROOT: fixtureDir,
      ...artifactPaths
    }
  });
  const restore = async (artifactPath) => writeFile(artifactPath, "{}\n");

  try {
    for (const artifactPath of Object.values(artifactPaths)) await restore(artifactPath);
    const valid = runPreflight();
    assert.equal(valid.status, 0, combinedOutput(valid));

    for (const [name, artifactPath] of Object.entries(artifactPaths)) {
      await rm(artifactPath);
      const missing = runPreflight();
      assert.notEqual(missing.status, 0, `${name} missing must fail closed\n${combinedOutput(missing)}`);
      await restore(artifactPath);
    }

    const unexpectedPath = path.join(fixtureDir, "unexpected.json");
    await writeFile(unexpectedPath, "{}\n");
    assert.notEqual(runPreflight().status, 0, "an unexpected artifact must fail closed");
    await rm(unexpectedPath);

    await writeFile(artifactPaths.PROMOTION_TERMINAL_AUDIT_REPORT, "not-json\n");
    assert.notEqual(runPreflight().status, 0, "invalid artifact JSON must fail closed");
    await restore(artifactPaths.PROMOTION_TERMINAL_AUDIT_REPORT);

    const symlinkTarget = path.join(path.dirname(fixtureDir), `${path.basename(fixtureDir)}-target.json`);
    await writeFile(symlinkTarget, "{}\n");
    await rm(artifactPaths.PROMOTION_REPLAY_RECEIPT);
    await symlink(symlinkTarget, artifactPaths.PROMOTION_REPLAY_RECEIPT);
    assert.notEqual(runPreflight().status, 0, "a symlinked artifact must fail closed");
    await rm(symlinkTarget);
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});

test.skip("Promotion Shadow final enforcement remains red for an authentic failed Receipt", async () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");
  const workflow = parseYaml(await readFile(workflowPath, "utf8"));
  const finalStep = workflow.jobs?.["promotion-shadow-gate"]?.steps?.find(
    (step) => step.name === "Enforce Promotion Shadow Gate outcome"
  );
  assert.ok(finalStep, "workflow must have a final outcome-enforcement step");

  const fixtureDir = await realpath(await mkdtemp(path.join(tmpdir(), "mais-promotion-final-outcome-")));
  const envNames = [
    "PROMOTION_TERMINAL_AUDIT_REPORT",
    "PROMOTION_FRESH_RECEIPT",
    "PROMOTION_REPLAY_RECEIPT",
    "PROMOTION_CANONICAL_RECEIPT_COPY",
    "PROMOTION_FRESH_VERIFICATION_REPORT",
    "PROMOTION_REPLAY_VERIFICATION_REPORT",
    "PROMOTION_CANONICAL_VERIFICATION_REPORT"
  ];
  const pathsByEnv = Object.fromEntries(
    envNames.map((name, index) => [name, path.join(fixtureDir, `${index}-${name}.json`)])
  );
  const runFinal = () => spawnSync("bash", ["-c", finalStep.run], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...pathsByEnv }
  });

  try {
    for (const artifactPath of Object.values(pathsByEnv)) {
      await writeFile(artifactPath, `${JSON.stringify({ result: "pass" })}\n`);
    }
    const passing = runFinal();
    assert.equal(passing.status, 0, combinedOutput(passing));

    await writeFile(
      pathsByEnv.PROMOTION_TERMINAL_AUDIT_REPORT,
      `${JSON.stringify({ result: "fail" })}\n`
    );
    const terminalFailure = runFinal();
    assert.notEqual(terminalFailure.status, 0, "a failed terminal current-HEAD audit must keep the Gate red");
    assert.match(combinedOutput(terminalFailure), /terminalCurrentHeadAudit=fail/u);
    await writeFile(
      pathsByEnv.PROMOTION_TERMINAL_AUDIT_REPORT,
      `${JSON.stringify({ result: "pass" })}\n`
    );

    await writeFile(
      pathsByEnv.PROMOTION_CANONICAL_RECEIPT_COPY,
      `${JSON.stringify({ result: "fail" })}\n`
    );
    const authenticFailure = runFinal();
    assert.notEqual(authenticFailure.status, 0, "an authentic failed canonical Receipt must keep the Gate red");
    assert.match(combinedOutput(authenticFailure), /canonicalReceipt=fail/u);
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});

test.skip("Promotion Shadow terminal current-HEAD report assertion executes fail closed", async () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");
  const workflow = parseYaml(await readFile(workflowPath, "utf8"));
  const job = workflow.jobs?.["promotion-shadow-gate"];
  const assertionStep = job?.steps?.find(
    (step) => step.name === "Assert terminal current-HEAD audit envelope"
  );
  assert.ok(assertionStep, "workflow must execute a dedicated terminal current-HEAD assertion step");
  assert.equal(typeof assertionStep.run, "string");

  const auditLibrary = await import(pathToFileURL(path.join(
    repoRoot,
    "coordination/integration/current-head-audit/promotion-terminal-audit-v2-lib.mjs"
  )).href);
  const expectedRelease = job.env.PROMOTION_TERMINAL_AUDIT_RELEASE_COMMIT;
  const expectedPolicy = job.env.PROMOTION_TERMINAL_AUDIT_POLICY;
  const headResult = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(headResult.status, 0, combinedOutput(headResult));
  const expectedHead = headResult.stdout.trim();
  const passOperations = {
    "terminal-attempt-binding": async () => ({ terminalState: "repair_required" }),
    "audit-checker-release": async () => ({ releaseCommit: expectedRelease }),
    "candidate-integrity": async () => ({ candidateDigest: auditLibrary.FIXED_ATTEMPT.candidateDigest }),
    "evidence-currentness": async () => ({ ownerCount: 9 }),
    "selected-live-reachability": async () => ({ selectedCandidateReachable: false }),
    "legacy-ratchet": async () => ({ knownConflictCount: 1, newConflictCount: 0, opaqueConflictCount: 0 }),
    "no-repository-mutation": async () => ({ headStable: true, statusStable: true, candidateStable: true })
  };
  const validReport = await auditLibrary.runOrderedAuditForTest({
    targetHead: expectedHead,
    expectedHead,
    policyRawSha256: "a".repeat(64),
    policySelfDigest: "b".repeat(64),
    policyPath: expectedPolicy,
    runMetadata: {
      auditId: "release-governance-fixture",
      evaluatedAt: "2026-08-25T12:00:00.000Z",
      ciJobId: null
    },
    operations: passOperations
  });
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "mais-promotion-terminal-audit-"));
  const reportPath = path.join(fixtureDir, "promotion-terminal-current-head-audit.v2.json");
  const runAssertion = () => spawnSync("bash", ["-c", assertionStep.run], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PROMOTION_TERMINAL_AUDIT_RELEASE_WORKTREE: repoRoot,
      PROMOTION_TERMINAL_AUDIT_REPORT: reportPath,
      PROMOTION_TERMINAL_AUDIT_RELEASE_COMMIT: expectedRelease,
      PROMOTION_TERMINAL_AUDIT_POLICY: expectedPolicy
    }
  });
  const writeReport = async (report) => {
    await writeFile(reportPath, `${JSON.stringify(report)}\n`);
    return runAssertion();
  };

  try {
    const valid = await writeReport(validReport);
    assert.equal(valid.status, 0, combinedOutput(valid));

    const invalidCases = [
      ["wrong target HEAD", { ...validReport, targetHead: "c".repeat(40) }],
      ["wrong expected HEAD", { ...validReport, expectedHead: "d".repeat(40) }],
      [
        "wrong frozen release",
        {
          ...validReport,
          auditReleaseProof: { ...validReport.auditReleaseProof, releaseCommit: "e".repeat(40) }
        }
      ],
      ["wrong policy path", { ...validReport, policy: { ...validReport.policy, path: "wrong/policy.json" } }],
      ["live authorization", { ...validReport, liveAllowed: true }],
      ["maturity escalation", { ...validReport, maturityClaim: "Shadow-mature / live-unproven" }],
      [
        "top-level proof drift",
        { ...validReport, legacyProof: { ...validReport.legacyProof, newConflictCount: 99 } }
      ]
    ];
    for (const [label, report] of invalidCases) {
      const result = await writeReport(report);
      assert.notEqual(result.status, 0, `${label} must fail closed\n${combinedOutput(result)}`);
    }

    await writeFile(reportPath, "not-json\n");
    const malformed = runAssertion();
    assert.notEqual(malformed.status, 0, `malformed terminal report must fail closed\n${combinedOutput(malformed)}`);
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
});

test("dirty map preserves NUL-delimited paths with spaces, Unicode, quotes, and newlines", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const relativeFixture = 'coordination/release-intake/zz governance 路径 "quoted"\nline.tmpx';
  const fixturePath = path.join(fixture.root, relativeFixture);

  try {
    await writeFile(fixturePath, "NUL-safe dirty-map fixture\n");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "NUL-safe path regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const map = await readJson(fixture.latestJson);
    const matches = map.entries.filter((entry) => entry.path === relativeFixture);
    assert.equal(matches.length, 1, "entries[].path must contain the decoded real Unicode path exactly once");
    assert.equal(matches[0].status, "??");
    assert.ok(
      map.entries.every((entry) => !entry.path.startsWith('"')),
      "entries[].path must not retain Git C-style quoted paths"
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("content QA is classified before broad coordination evidence", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const relativeFixture = "coordination/content-qa/zz-release-governance-content.fixture";
  const fixturePath = path.join(fixture.root, relativeFixture);

  try {
    await mkdir(path.dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, "content QA routing fixture\n");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "content QA slice ordering regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const map = await readJson(fixture.latestJson);
    const entry = map.entries.find((candidate) => candidate.path === relativeFixture);
    assert.ok(entry, `Missing dirty-map fixture entry: ${relativeFixture}`);
    assert.equal(entry.slice, "generated/content/RAG backlog");
    assert.match(entry.ownerId, /A18|A21/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map assert-current enforces a 60 minute freshness window", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "release governance test"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const pass = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    assert.equal(pass.status, 0, combinedOutput(pass));

    const staleMap = await readJson(fixture.latestJson);
    staleMap.generatedAt = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    await writeFile(fixture.latestJson, `${JSON.stringify(staleMap, null, 2)}\n`);

    const fail = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    assert.notEqual(fail.status, 0);
    assert.match(combinedOutput(fail), /older than 60 minutes/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map report refresh is immediately current with all four recorded outputs", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "self-current-regression",
      "--json",
      "--reason",
      "four-output self-current regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    assert.deepEqual(Object.keys(saved.outputPaths).sort(), [
      "latestJson",
      "latestMarkdown",
      "reportJson",
      "reportMarkdown"
    ]);
    for (const outputPath of Object.values(saved.outputPaths)) {
      assert.ok((await readFile(path.join(fixture.root, outputPath))).length > 0, outputPath);
    }

    const current = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    assert.equal(current.status, 0, combinedOutput(current));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map refresh rejects unsafe output nodes before writing any generated output", async (t) => {
  const cases = [
    ["symlink", (source, destination) => symlink(source, destination)],
    ["hardlink", (source, destination) => link(source, destination)]
  ];

  for (const [nodeType, createUnsafeNode] of cases) {
    await t.test(nodeType, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      const externalRoot = await realpath(
        await mkdtemp(path.join(tmpdir(), "mais-dirty-map-do-not-disclose-writer-target-"))
      );
      const externalTarget = path.join(externalRoot, "sentinel.md");
      const runId = `unsafe-${nodeType}-writer-regression`;
      const reportDateFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      const reportDates = [
        ...new Set([-300_000, 0, 300_000].map((offset) =>
          reportDateFormatter.format(new Date(Date.now() + offset))
        ))
      ];
      const reportJsonPaths = reportDates.map((reportDate) => path.join(
        fixture.releaseIntakeDir,
        `${reportDate}-A25-dirty-tree-map-${runId}.json`
      ));
      const reportMarkdownPaths = reportDates.map((reportDate) => path.join(
        fixture.releaseIntakeDir,
        `${reportDate}-A25-dirty-tree-map-${runId}.md`
      ));
      const latestJsonBefore = "latest JSON must remain untouched\n";
      const latestMarkdownBefore = "latest Markdown must remain untouched\n";
      const reportJsonBefore = "report JSON must remain untouched\n";
      const externalBefore = "external sentinel must remain untouched\n";

      try {
        await writeFile(fixture.latestJson, latestJsonBefore);
        await writeFile(fixture.latestMarkdown, latestMarkdownBefore);
        for (const reportJson of reportJsonPaths) {
          await writeFile(reportJson, reportJsonBefore);
        }
        await writeFile(externalTarget, externalBefore);
        for (const reportMarkdown of reportMarkdownPaths) {
          await createUnsafeNode(externalTarget, reportMarkdown);
        }

        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--run-id",
          runId,
          "--json",
          "--reason",
          `unsafe ${nodeType} writer regression`
        ]);

        assert.notEqual(refresh.status, 0, combinedOutput(refresh));
        assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
        assert.doesNotMatch(combinedOutput(refresh), /do-not-disclose-writer-target/i);
        assert.equal(await readFile(fixture.latestJson, "utf8"), latestJsonBefore);
        assert.equal(await readFile(fixture.latestMarkdown, "utf8"), latestMarkdownBefore);
        for (const reportJson of reportJsonPaths) {
          assert.equal(await readFile(reportJson, "utf8"), reportJsonBefore);
        }
        assert.equal(await readFile(externalTarget, "utf8"), externalBefore);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
        await rm(externalRoot, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map refresh rejects ancestor symlink output escapes without creating external files", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const externalRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), "mais-dirty-map-do-not-disclose-ancestor-target-"))
  );
  const linkedOutputDir = path.join(
    fixture.root,
    "coordination",
    "do-not-disclose-ancestor-output"
  );

  try {
    await symlink(externalRoot, linkedOutputDir, "dir");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      path.join(linkedOutputDir, "latest.json"),
      "--latest-md",
      path.join(linkedOutputDir, "latest.md"),
      "--report-dir",
      linkedOutputDir,
      "--run-id",
      "ancestor-symlink-writer-regression",
      "--json",
      "--reason",
      "ancestor symlink writer regression"
    ]);

    assert.notEqual(refresh.status, 0, combinedOutput(refresh));
    assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
    assert.doesNotMatch(combinedOutput(refresh), /do-not-disclose-ancestor/i);
    assert.deepEqual(await readdir(externalRoot), []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  }
});

test("dirty map no-report refresh validates and writes only latestJson", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const externalRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), "mais-dirty-map-no-report-writer-"))
  );
  const externalTarget = path.join(externalRoot, "latest-markdown-sentinel.md");
  const externalBefore = "no-report must not touch this target\n";

  try {
    await writeFile(externalTarget, externalBefore);
    await symlink(externalTarget, fixture.latestMarkdown);
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      path.join(fixture.root, "coordination", "unused-no-report-output"),
      "--run-id",
      "latest-only-safe-writer",
      "--no-report",
      "--json",
      "--reason",
      "latest-only safe writer regression"
    ]);

    assert.equal(refresh.status, 0, combinedOutput(refresh));
    assert.equal(await readFile(externalTarget, "utf8"), externalBefore);
    assert.ok((await readFile(fixture.latestJson)).length > 0);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  }
});

test("dirty map no-report refresh rejects an unsafe latestJson without changing its target", async (t) => {
  const cases = [
    ["symlink", (source, destination) => symlink(source, destination)],
    ["hardlink", (source, destination) => link(source, destination)]
  ];

  for (const [nodeType, createUnsafeNode] of cases) {
    await t.test(nodeType, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      const externalRoot = await realpath(
        await mkdtemp(path.join(tmpdir(), "mais-dirty-map-do-not-disclose-latest-target-"))
      );
      const externalTarget = path.join(externalRoot, "latest-json-sentinel.json");
      const externalBefore = "unsafe latestJson target must remain untouched\n";

      try {
        await writeFile(externalTarget, externalBefore);
        await createUnsafeNode(externalTarget, fixture.latestJson);
        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--no-report",
          "--json",
          "--reason",
          `unsafe latest-only ${nodeType} writer regression`
        ]);

        assert.notEqual(refresh.status, 0, combinedOutput(refresh));
        assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
        assert.doesNotMatch(combinedOutput(refresh), /do-not-disclose-latest-target/i);
        assert.equal(await readFile(externalTarget, "utf8"), externalBefore);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
        await rm(externalRoot, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map refresh rejects out-of-repository output paths before writing", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const externalRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), "mais-dirty-map-do-not-disclose-outside-output-"))
  );
  const latestJsonBefore = "in-repository output must remain untouched\n";

  try {
    await writeFile(fixture.latestJson, latestJsonBefore);
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      externalRoot,
      "--run-id",
      "outside-output-writer-regression",
      "--json",
      "--reason",
      "outside output writer regression"
    ]);

    assert.notEqual(refresh.status, 0, combinedOutput(refresh));
    assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
    assert.doesNotMatch(combinedOutput(refresh), /do-not-disclose-outside-output/i);
    assert.equal(await readFile(fixture.latestJson, "utf8"), latestJsonBefore);
    assert.deepEqual(await readdir(externalRoot), []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  }
});

test("dirty map no-report refresh safely creates missing nested repository parents", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const nestedLatestJson = path.join(
    fixture.root,
    "coordination",
    "release-intake",
    "nested",
    "deeper",
    "latest.json"
  );

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      nestedLatestJson,
      "--no-report",
      "--json",
      "--reason",
      "missing nested parent writer regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const current = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      nestedLatestJson,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    assert.equal(current.status, 0, combinedOutput(current));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map atomic refresh preserves restrictive existing output permissions", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const originalBytes = "existing restrictive output\n";
  let originalHandle;

  try {
    await writeFile(fixture.latestJson, originalBytes);
    await chmod(fixture.latestJson, 0o600);
    // Hold the pre-existing inode open across the refresh. A staged rename
    // detaches that inode from the path, so this descriptor keeps observing the
    // original bytes; an in-place rewrite would expose the refreshed bytes
    // through this very descriptor. Inode *numbers* cannot carry that proof:
    // writeDirtyTreeMap stages and commits twice per run, so the first rename
    // frees the original number and ext4 hands it straight back to the second
    // staged file, legitimately landing the target back on its original number.
    // APFS never reuses inode numbers, which is why raw number inequality only
    // ever failed on the Linux runner.
    originalHandle = await open(fixture.latestJson, "r");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "restrictive output mode regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const after = await stat(fixture.latestJson);
    assert.equal(after.mode & 0o777, 0o600);
    assert.equal(
      (await originalHandle.stat()).nlink,
      0,
      "atomic replacement must unlink the original output inode, not mutate it"
    );
    assert.equal(
      await originalHandle.readFile("utf8"),
      originalBytes,
      "atomic replacement must install the staged file instead of rewriting the target in place"
    );
    assert.notEqual(
      await readFile(fixture.latestJson, "utf8"),
      originalBytes,
      "the refreshed map must be published at the output path"
    );
  } finally {
    if (originalHandle) await originalHandle.close().catch(() => undefined);
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map refresh rejects a write-only existing output before changing it", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const originalBytes = "write-only output must remain unchanged\n";

  try {
    await writeFile(fixture.latestJson, originalBytes);
    await chmod(fixture.latestJson, 0o200);
    const before = await stat(fixture.latestJson);
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "write-only output regression"
    ]);

    assert.notEqual(refresh.status, 0, combinedOutput(refresh));
    assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
    const after = await stat(fixture.latestJson);
    assert.equal(after.ino, before.ino);
    assert.equal(after.mode & 0o777, 0o200);
    await chmod(fixture.latestJson, 0o600);
    assert.equal(await readFile(fixture.latestJson, "utf8"), originalBytes);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map creates absent outputs with mode 0600 even under umask 000", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const wrapperPath = path.join(fixture.root, "scripts", "refresh-with-open-umask.mjs");
  const firstCreatedParent = path.join(fixture.releaseIntakeDir, "umask-open-parent");
  const secondCreatedParent = path.join(firstCreatedParent, "nested");
  const nestedLatestJson = path.join(secondCreatedParent, "latest.json");

  try {
    await writeFile(
      wrapperPath,
      [
        "process.umask(0);",
        "const args = process.argv.slice(2);",
        `process.argv = [process.argv[0], ${JSON.stringify(fixture.refreshScript)}, ...args];`,
        `await import(${JSON.stringify(pathToFileURL(fixture.refreshScript).href)});`,
        ""
      ].join("\n")
    );
    const refresh = runNodeAt(fixture.root, [
      wrapperPath,
      "--latest-json",
      nestedLatestJson,
      "--no-report",
      "--json",
      "--reason",
      "open umask output mode regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const created = await stat(nestedLatestJson);
    assert.equal(created.mode & 0o777, 0o600);
    assert.equal(created.mode & 0o077, 0, "group/other permissions must remain closed");
    for (const createdParent of [firstCreatedParent, secondCreatedParent]) {
      const parentStat = await stat(createdParent);
      assert.equal(parentStat.mode & 0o777, 0o700);
      assert.equal(parentStat.mode & 0o022, 0, "created parents must not be group/other writable");
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map refresh rejects an existing group-or-other-writable output parent", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const unsafeParent = path.join(
    fixture.root,
    "coordination",
    "do-not-disclose-world-writable-output-parent"
  );
  const unsafeLatestJson = path.join(unsafeParent, "latest.json");
  const originalBytes = "unsafe-parent output must remain unchanged\n";

  try {
    await mkdir(unsafeParent, { mode: 0o700 });
    await writeFile(unsafeLatestJson, originalBytes, { mode: 0o600 });
    await chmod(unsafeParent, 0o777);
    const before = await stat(unsafeLatestJson);
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      unsafeLatestJson,
      "--no-report",
      "--json",
      "--reason",
      "unsafe output parent permission regression"
    ]);

    assert.notEqual(refresh.status, 0, combinedOutput(refresh));
    assert.match(combinedOutput(refresh), /generated output write target is invalid/i);
    assert.doesNotMatch(combinedOutput(refresh), /do-not-disclose-world-writable/i);
    const after = await stat(unsafeLatestJson);
    assert.equal(after.ino, before.ino);
    assert.equal(await readFile(unsafeLatestJson, "utf8"), originalBytes);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map no-report refresh after a full refresh ignores only its latest JSON output", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    const fullRefresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "full-before-no-report",
      "--json",
      "--reason",
      "full refresh before no-report regression"
    ]);
    assert.equal(fullRefresh.status, 0, combinedOutput(fullRefresh));

    const noReportRefresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "latest-only-after-full",
      "--no-report",
      "--json",
      "--reason",
      "latest-only output regression"
    ]);
    assert.equal(noReportRefresh.status, 0, combinedOutput(noReportRefresh));

    const saved = await readJson(fixture.latestJson);
    assert.deepEqual(Object.keys(saved.outputPaths), ["latestJson"]);
    const current = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    assert.equal(current.status, 0, combinedOutput(current));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map opens generated outputs nonblocking before descriptor type validation", async () => {
  const source = await readFile(path.join(repoRoot, "scripts", "refresh-dirty-tree-map.mjs"), "utf8");
  const openFlags = source.match(/function directRegularOpenFlags\(\) \{[\s\S]*?\n\}/u)?.[0] ?? "";
  assert.match(source, /fs\.open\(filePath, directRegularOpenFlags\(\)\)/u);
  assert.match(openFlags, /fsConstants\.O_RDONLY/u);
  assert.match(openFlags, /fsConstants\.O_NOFOLLOW/u);
  assert.match(openFlags, /fsConstants\.O_NONBLOCK/u);
  assert.doesNotMatch(openFlags, /\?\?\s*0/u);
  assert.match(source, /Number\.isInteger\(fsConstants\.O_NOFOLLOW\)/u);
  assert.match(source, /Number\.isInteger\(fsConstants\.O_NONBLOCK\)/u);
});

test("dirty map assert-current rejects untrusted saved output-path schemas without disclosing values", async (t) => {
  const redactedMarker = "do-not-disclose-output-path";
  const cases = [
    ["missing outputPaths", (saved) => delete saved.outputPaths],
    ["array outputPaths", (saved) => { saved.outputPaths = []; }],
    ["missing key", (saved) => delete saved.outputPaths.reportMarkdown],
    ["unknown key", (saved) => { saved.outputPaths.unknown = `coordination/release-intake/${redactedMarker}`; }],
    ["absolute path", (saved, fixture) => { saved.outputPaths.reportJson = path.join(fixture.root, redactedMarker); }],
    ["traversal path", (saved) => { saved.outputPaths.reportJson = `../../${redactedMarker}`; }],
    ["non-canonical path", (saved) => { saved.outputPaths.reportJson = saved.outputPaths.reportJson.replace("release-intake/", "release-intake/./"); }],
    ["wrong directory", (saved) => { saved.outputPaths.reportJson = `app/${redactedMarker}.json`; }],
    ["unknown report filename", (saved) => { saved.outputPaths.reportJson = `coordination/release-intake/${redactedMarker}.json`; }],
    ["mismatched report pair", (saved) => { saved.outputPaths.reportMarkdown = `coordination/release-intake/2026-01-01-A25-dirty-tree-map-${redactedMarker}.md`; }],
    ["duplicate output", (saved) => { saved.outputPaths.reportJson = saved.outputPaths.latestJson; }],
    ["unexpected latest path", (saved) => { saved.outputPaths.latestJson = `coordination/release-intake/${redactedMarker}.json`; }]
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      try {
        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--run-id",
          "saved-output-validation",
          "--json",
          "--reason",
          "saved output validation regression"
        ]);
        assert.equal(refresh.status, 0, combinedOutput(refresh));

        const saved = await readJson(fixture.latestJson);
        mutate(saved, fixture);
        await writeFile(fixture.latestJson, `${JSON.stringify(saved, null, 2)}\n`);

        const result = runDirtyMapFixture(fixture, [
          "--assert-current",
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--max-age-minutes",
          "60",
          "--json"
        ]);
        const output = combinedOutput(result);
        assert.notEqual(result.status, 0);
        assert.match(output, /dirty-tree map outputPaths is invalid/i);
        assert.doesNotMatch(output, new RegExp(redactedMarker));
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map assert-current redacts invalid saved JSON contents", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const redactedMarker = "do-not-disclose-invalid-map-content";

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "invalid JSON redaction regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));
    await writeFile(fixture.latestJson, `invalid JSON ${redactedMarker}\n`);

    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    const output = combinedOutput(result);
    assert.notEqual(result.status, 0);
    assert.match(output, /dirty-tree map JSON is invalid/i);
    assert.doesNotMatch(output, new RegExp(redactedMarker));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map assert-current validates reflected saved metadata before diagnostics", async (t) => {
  const redactedMarker = "do-not-disclose-saved-metadata";
  const cases = [
    ["signature characters", (saved) => { saved.statusSignature = `${redactedMarker}\n`; }],
    ["uppercase signature", (saved) => { saved.statusSignature = "A".repeat(64); }],
    ["missing expanded count", (saved) => { delete saved.statusCounts.expandedStatusEntries; }],
    ["non-integer expanded count", (saved) => { saved.statusCounts.expandedStatusEntries = `${redactedMarker}\n`; }],
    ["unknown count key", (saved) => { saved.statusCounts.unknown = redactedMarker; }],
    ["other count string", (saved) => { saved.statusCounts.trackedModified = redactedMarker; }],
    ["other count object", (saved) => { saved.statusCounts.trackedDeleted = { value: redactedMarker }; }],
    ["noncanonical generated timestamp", (saved) => { saved.generatedAt = `2026-07-13 ${redactedMarker}`; }]
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      try {
        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--run-id",
          "saved-metadata-validation",
          "--json",
          "--reason",
          "saved metadata validation regression"
        ]);
        assert.equal(refresh.status, 0, combinedOutput(refresh));

        const saved = await readJson(fixture.latestJson);
        mutate(saved);
        await writeFile(fixture.latestJson, `${JSON.stringify(saved, null, 2)}\n`);
        const result = runDirtyMapFixture(fixture, [
          "--assert-current",
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--max-age-minutes",
          "60",
          "--json"
        ]);
        const output = combinedOutput(result);
        assert.notEqual(result.status, 0);
        assert.match(output, /dirty-tree map assertion metadata is invalid/i);
        assert.doesNotMatch(output, new RegExp(redactedMarker));
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map saved outputs cannot hide an unrelated dirty entry", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const redactedMarker = "do-not-disclose-hidden-dirty-entry";

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "hidden-dirty-entry",
      "--json",
      "--reason",
      "saved output trust-boundary regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    await rm(path.join(fixture.root, saved.outputPaths.reportJson));
    await rm(path.join(fixture.root, saved.outputPaths.reportMarkdown));
    const unrelatedStem = `2026-01-01-A25-dirty-tree-map-${redactedMarker}`;
    const unrelatedJson = path.join(fixture.releaseIntakeDir, `${unrelatedStem}.json`);
    const unrelatedMarkdown = path.join(fixture.releaseIntakeDir, `${unrelatedStem}.md`);
    await writeFile(unrelatedJson, "unrelated dirty JSON fixture\n");
    await writeFile(unrelatedMarkdown, "unrelated dirty Markdown fixture\n");
    saved.outputPaths.reportJson = path.posix.join(
      "coordination/release-intake",
      `${unrelatedStem}.json`
    );
    saved.outputPaths.reportMarkdown = path.posix.join(
      "coordination/release-intake",
      `${unrelatedStem}.md`
    );
    await writeFile(fixture.latestJson, `${JSON.stringify(saved, null, 2)}\n`);

    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    const output = combinedOutput(result);
    assert.notEqual(result.status, 0);
    assert.match(output, /generated output artifacts are invalid/i);
    assert.doesNotMatch(output, new RegExp(redactedMarker));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map assert-current rejects partial or symlinked generated output sets", async (t) => {
  const cases = [
    ["missing report", async (fixture, saved) => {
      await rm(path.join(fixture.root, saved.outputPaths.reportMarkdown));
    }],
    ["symlinked report", async (fixture, saved) => {
      const reportJson = path.join(fixture.root, saved.outputPaths.reportJson);
      await rm(reportJson);
      await symlink(path.basename(saved.outputPaths.latestJson), reportJson);
    }],
    ["hardlinked report", async (fixture, saved) => {
      const reportJson = path.join(fixture.root, saved.outputPaths.reportJson);
      await rm(reportJson);
      await link(fixture.latestJson, reportJson);
    }]
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      try {
        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--run-id",
          "generated-output-node-validation",
          "--json",
          "--reason",
          "generated output node validation regression"
        ]);
        assert.equal(refresh.status, 0, combinedOutput(refresh));

        const saved = await readJson(fixture.latestJson);
        await mutate(fixture, saved);
        const result = runDirtyMapFixture(fixture, [
          "--assert-current",
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--max-age-minutes",
          "60",
          "--json"
        ]);
        assert.notEqual(result.status, 0);
        assert.match(combinedOutput(result), /generated output artifacts (?:are invalid|changed during assertion)/i);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map assert-current rejects a sparse generated output above the fixed size limit", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "generated-output-size-limit",
      "--json",
      "--reason",
      "generated output size limit regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    await truncate(
      path.join(fixture.root, saved.outputPaths.reportJson),
      128 * 1024 * 1024 + 1
    );
    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ], { timeout: 5000 });
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /generated output artifact exceeds the 128 MiB safety limit/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map assert-current rejects generated outputs reached through an intermediate directory symlink", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const redactedMarker = "do-not-disclose-canonical-output-root";
  const externalRoot = await mkdtemp(path.join(tmpdir(), `${redactedMarker}-`));
  const externalReportDir = path.join(externalRoot, "reports");
  const linkedAncestor = path.join(fixture.releaseIntakeDir, "external-ancestor");
  const lexicalReportDir = path.join(linkedAncestor, "reports");
  const repoRelative = (absolutePath) =>
    path.relative(fixture.root, absolutePath).split(path.sep).join("/");

  try {
    await mkdir(externalReportDir, { recursive: true });
    await symlink(externalRoot, linkedAncestor, "dir");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "canonical-output-source",
      "--json",
      "--reason",
      "intermediate directory symlink regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    const originalPaths = Object.values(saved.outputPaths).map((outputPath) =>
      path.join(fixture.root, outputPath)
    );
    const latestMarkdownBytes = await readFile(fixture.latestMarkdown);
    const externalLatestJson = path.join(lexicalReportDir, "latest-A25-dirty-tree-map.json");
    const externalLatestMarkdown = path.join(lexicalReportDir, "latest-A25-dirty-tree-map.md");
    const externalReportJson = path.join(
      lexicalReportDir,
      path.basename(saved.outputPaths.reportJson)
    );
    const externalReportMarkdown = path.join(
      lexicalReportDir,
      path.basename(saved.outputPaths.reportMarkdown)
    );
    saved.outputPaths = {
      latestJson: repoRelative(externalLatestJson),
      latestMarkdown: repoRelative(externalLatestMarkdown),
      reportJson: repoRelative(externalReportJson),
      reportMarkdown: repoRelative(externalReportMarkdown)
    };
    const savedBytes = `${JSON.stringify(saved, null, 2)}\n`;
    for (const originalPath of originalPaths) {
      await rm(originalPath);
    }
    await writeFile(externalLatestJson, savedBytes);
    await writeFile(externalLatestMarkdown, latestMarkdownBytes);
    await writeFile(externalReportJson, savedBytes);
    await writeFile(externalReportMarkdown, latestMarkdownBytes);

    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      externalLatestJson,
      "--latest-md",
      externalLatestMarkdown,
      "--report-dir",
      lexicalReportDir,
      "--max-age-minutes",
      "60",
      "--json"
    ]);
    const output = combinedOutput(result);
    assert.notEqual(result.status, 0);
    assert.match(output, /generated output canonical path is invalid/i);
    assert.doesNotMatch(output, new RegExp(redactedMarker));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  }
});

test("dirty map assert-current enforces one aggregate buffer limit across four generated outputs", async () => {
  const fixture = await createDirtyMapFixtureRepo();

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "generated-output-aggregate-limit",
      "--json",
      "--reason",
      "generated output aggregate buffer regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    for (const key of ["latestMarkdown", "reportJson", "reportMarkdown"]) {
      await truncate(path.join(fixture.root, saved.outputPaths[key]), 48 * 1024 * 1024);
    }
    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ], { timeout: 5000 });
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /generated outputs exceed the 128 MiB aggregate buffer limit/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dirty map assert-current rejects timestamped report names the producer cannot generate", async (t) => {
  const cases = [
    ["invalid calendar date", "2026-13-40-A25-dirty-tree-map-valid-run"],
    ["leading run-id hyphen", "2026-01-01-A25-dirty-tree-map--invalid-run"],
    ["hyphen-only run id", "2026-01-01-A25-dirty-tree-map--"]
  ];

  for (const [name, reportStem] of cases) {
    await t.test(name, async () => {
      const fixture = await createDirtyMapFixtureRepo();
      try {
        const refresh = runDirtyMapFixture(fixture, [
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--run-id",
          "producer-name-grammar",
          "--json",
          "--reason",
          "generated report name grammar regression"
        ]);
        assert.equal(refresh.status, 0, combinedOutput(refresh));

        const saved = await readJson(fixture.latestJson);
        const oldReportJson = path.join(fixture.root, saved.outputPaths.reportJson);
        const oldReportMarkdown = path.join(fixture.root, saved.outputPaths.reportMarkdown);
        saved.outputPaths.reportJson = path.posix.join(
          "coordination/release-intake",
          `${reportStem}.json`
        );
        saved.outputPaths.reportMarkdown = path.posix.join(
          "coordination/release-intake",
          `${reportStem}.md`
        );
        await writeFile(fixture.latestJson, `${JSON.stringify(saved, null, 2)}\n`);
        await copyFile(fixture.latestJson, path.join(fixture.root, saved.outputPaths.reportJson));
        await copyFile(fixture.latestMarkdown, path.join(fixture.root, saved.outputPaths.reportMarkdown));
        await rm(oldReportJson);
        await rm(oldReportMarkdown);

        const result = runDirtyMapFixture(fixture, [
          "--assert-current",
          "--latest-json",
          fixture.latestJson,
          "--latest-md",
          fixture.latestMarkdown,
          "--report-dir",
          fixture.releaseIntakeDir,
          "--max-age-minutes",
          "60",
          "--json"
        ]);
        assert.notEqual(result.status, 0);
        assert.match(combinedOutput(result), /dirty-tree map outputPaths is invalid/i);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
  }
});

test("dirty map assert-current detects an ignored report mutation during status capture", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const raceRoot = await mkdtemp(path.join(tmpdir(), "mais-dirty-map-race-"));

  try {
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--run-id",
      "generated-output-race",
      "--json",
      "--reason",
      "generated output race regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const saved = await readJson(fixture.latestJson);
    const lookup = spawnSync("/bin/sh", ["-c", "command -v git"], {
      cwd: fixture.root,
      encoding: "utf8"
    });
    assert.equal(lookup.status, 0, combinedOutput(lookup));
    const fakeBin = path.join(raceRoot, "fake-bin");
    const fakeGit = path.join(fakeBin, "git");
    const raceMarker = path.join(raceRoot, "git-race-fired");
    await mkdir(fakeBin, { recursive: true });
    await writeFile(
      fakeGit,
      `#!/bin/sh
if [ "$1" = "status" ] && [ ! -e "$DIRTY_MAP_RACE_MARKER" ]; then
  printf '%s\\n' 'mutated during status capture' > "$DIRTY_MAP_RACE_TARGET"
  : > "$DIRTY_MAP_RACE_MARKER"
fi
exec "$REAL_GIT_PATH" "$@"
`
    );
    await chmod(fakeGit, 0o755);

    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--latest-md",
      fixture.latestMarkdown,
      "--report-dir",
      fixture.releaseIntakeDir,
      "--max-age-minutes",
      "60",
      "--json"
    ], {
      env: {
        PATH: `${fakeBin}:${process.env.PATH}`,
        REAL_GIT_PATH: lookup.stdout.trim(),
        DIRTY_MAP_RACE_MARKER: raceMarker,
        DIRTY_MAP_RACE_TARGET: path.join(fixture.root, saved.outputPaths.reportJson)
      }
    });
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /generated output artifacts changed during assertion/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(raceRoot, { recursive: true, force: true });
  }
});

test("dirty map assert-current blocks strict unmapped owner entries", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const fixturePath = path.join(fixture.root, "zz-release-unmapped-fixture.tmpx");

  try {
    await writeFile(fixturePath, "temporary unmapped owner fixture\n");
    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "strict unmapped owner regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const result = runDirtyMapFixture(fixture, [
      "--assert-current",
      "--latest-json",
      fixture.latestJson,
      "--max-age-minutes",
      "60",
      "--json"
    ]);

    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /unmapped owner/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("package gate rejects dot staging and invalid final states", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-package-gate-"));
  const manifestPath = path.join(tempDir, "owner-package-manifest.json");

  try {
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        packages: [
          {
            id: "bad-package",
            owner: "A10",
            pathspecs: ["."],
            checks: ["npm run type-check"],
            finalState: "maybe"
          }
        ]
      }, null, 2)}\n`
    );

    const result = runNode([
      "scripts/release-package-gate.mjs",
      "--manifest",
      manifestPath,
      "--json"
    ]);

    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /git add \./i);
    assert.match(combinedOutput(result), /final state/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("package gate rejects normalized full-tree staging equivalents", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-full-tree-gate-"));
  const manifestPath = path.join(tempDir, "owner-package-manifest.json");
  const forbidden = [
    ".",
    "./",
    ":/",
    "*",
    "**",
    "./*",
    "./**",
    "./**/*",
    "**/*",
    ":(top)*",
    ":(glob)*",
    ":(top,glob)**",
    ":(glob,top)**/*",
    ":(top)**/*"
  ];

  try {
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        packages: [
          {
            id: "full-tree-package",
            owner: "A10",
            pathspecs: forbidden,
            checks: ["npm run type-check"],
            finalState: "reviewed commit"
          }
        ]
      }, null, 2)}\n`
    );

    const result = runNode([
      "scripts/release-package-gate.mjs",
      "--manifest",
      manifestPath,
      "--json"
    ]);
    assert.notEqual(result.status, 0);
    const output = combinedOutput(result);
    for (const pathspec of forbidden) {
      assert.ok(output.includes(`pathspec \\\"${pathspec}\\\" is forbidden`), `must reject ${pathspec}`);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("default package gate and exact owner mappings are valid", async () => {
  const pathspecManifest = await readJson(
    path.join(repoRoot, "coordination/release-intake/owner-pathspecs.json")
  );
  const packageManifest = await readJson(
    path.join(repoRoot, "coordination/release-intake/owner-package-manifest.json")
  );

  assertOwnerMapping(pathspecManifest, "data/hjbQuestionLocalization.ts", "A04", ["A18", "A09", "A05"]);
  assertOwnerMapping(pathspecManifest, "lib/questionFigure.ts", "A24", ["A04", "A08", "A18", "A11", "A12"]);
  assertOwnerMapping(pathspecManifest, "lib/questionFigure.test.ts", "A24", ["A04", "A08", "A18", "A11"]);
  assertOwnerMapping(pathspecManifest, ".claude/launch.json", "A22", ["A10", "A11"]);
  assertOwnerMapping(pathspecManifest, "scripts/dev-isolated.mjs", "A22", ["A10", "A11"]);
  assertOwnerMapping(pathspecManifest, "scripts/kill-port.mjs", "A22", ["A10", "A11"]);
  assertOwnerMapping(pathspecManifest, "scripts/cleanup-generated-artifacts.mjs", "A22", ["A10", "A11"]);
  assertOwnerMapping(pathspecManifest, "scripts/cleanup-generated-artifacts.test.mjs", "A22", ["A10", "A11"]);
  assertOwnerMapping(pathspecManifest, "scripts/next-clean-build.mjs", "A22", ["A10", "A11"]);
  assertOwnerMapping(pathspecManifest, "scripts/next-clean-build.test.mjs", "A22", ["A10", "A11"]);
  assertOwnerMapping(pathspecManifest, "coordination/release-intake/assert-release-source-clean.mjs", "A22", ["A10", "A25"]);
  assertOwnerMapping(pathspecManifest, "coordination/release-intake/assert-worktree-lifecycle.mjs", "A22", ["A10", "A25"]);
  assertOwnerMapping(pathspecManifest, ".github/workflows/promotion-shadow.yml", "A10", ["A11", "A22", "A23"]);
  assertOwnerMapping(pathspecManifest, "MAIS_Competitive_Analysis_K12_Math.docx", "A10", ["A16"]);
  assertOwnerMapping(pathspecManifest, ".env.local.example", "A19", ["A07", "A15", "A22"]);
  assertOwnerMapping(pathspecManifest, "package-lock.json", "A10", []);

  const importTargetPackage = packageWithExactPathspec(pathspecManifest, "scripts/check-import-targets*.mjs");
  assert.ok(importTargetPackage, "scripts/check-import-targets*.mjs must have a durable owner mapping");
  assert.equal(importTargetPackage.owner, "A22");
  assert.deepEqual([...(importTargetPackage.coordinatesWith ?? [])].sort(), ["A10"].sort());

  const nextConfigReleasePackage = packageWithExactPathspec(packageManifest, "next.config.ts");
  assert.ok(nextConfigReleasePackage, "next.config.ts must be explicit in the P0 release-hygiene package");
  assert.equal(nextConfigReleasePackage.id, "foundation-release-hygiene-A22-A10");

  for (const helperPath of [
    "scripts/cleanup-generated-artifacts.mjs",
    "scripts/cleanup-generated-artifacts.test.mjs",
    "scripts/next-clean-build.mjs",
    "scripts/next-clean-build.test.mjs"
  ]) {
    const helperPackage = packageWithExactPathspec(packageManifest, helperPath);
    assert.ok(helperPackage, `${helperPath} must be explicit in the joint A22/A10 release-hygiene package`);
    assert.equal(helperPackage.id, "foundation-release-hygiene-A22-A10");
  }

  const evidencePackage = packageManifest.packages.find((pkg) => pkg.id === "external-worktree-evidence-A25-A22");
  assert.ok(evidencePackage, "external worktree evidence package must remain explicit");
  assert.deepEqual(evidencePackage.pathspecs, [
    "coordination/release-intake/evidence-archive-lib.mjs",
    "coordination/release-intake/refresh-linked-worktree-archive-evidence.mjs",
    "coordination/release-intake/assert-linked-worktree-archive-evidence-current.mjs",
    "coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs",
    "scripts/release-governance.test.mjs",
    "package.json",
    "package-lock.json"
  ]);

  assert.deepEqual(packageManifest.policy.allowedFinalStates, [
    "reviewed commit",
    "owner-approved discard",
    "evidence archive",
    "blocker report"
  ]);

  const gate = runNode(["scripts/release-package-gate.mjs", "--json"]);
  assert.equal(gate.status, 0, combinedOutput(gate));
  const result = JSON.parse(gate.stdout);
  assert.equal(result.valid, true);
  assert.ok(result.packageCount > 0);
});

test("shared owner resolver selects one most-specific owner across overlapping pathspecs", async () => {
  const gateModule = await import("./release-package-gate.mjs");
  assert.equal(typeof gateModule.compileOwnerPathspecManifest, "function");
  assert.equal(typeof gateModule.resolveOwnerPath, "function");

  const manifest = await readJson(
    path.join(repoRoot, "coordination/release-intake/owner-pathspecs.json")
  );
  const resolver = gateModule.compileOwnerPathspecManifest(manifest);
  const cases = [
    ["coordination/release-intake/example.json", "A25"],
    ["coordination/content-qa/example.md", "A18"],
    ["coordination/content-qa/example-exact-overlay.svg", "A24"],
    ["coordination/integration/example.md", "A23"],
    ["coordination/reports/example.md", "A10"],
    ["coordination/release-intake/assert-release-source-clean.mjs", "A22"],
    ["coordination/release-intake/assert-worktree-lifecycle.mjs", "A22"],
    [".github/workflows/promotion-shadow.yml", "A10"],
    ["scripts/release-env-guard.mjs", "A22"],
    ["scripts/cleanup-generated-artifacts.mjs", "A22"],
    ["scripts/cleanup-generated-artifacts.test.mjs", "A22"],
    ["scripts/next-clean-build.mjs", "A22"],
    ["scripts/next-clean-build.test.mjs", "A22"],
    ["scripts/unrelated-release-helper.test.mjs", "A10"],
    ["scripts/bug-triage.js", "A10"],
    ["app/api/ai-tutor/route.ts", "A07"],
    ["app/api/adaptive-learning/route.ts", "A15"],
    ["app/api/users/route.ts", "A12"],
    ["components/gamification/FishingGame.tsx", "A20"],
    ["components/gamification/BadgeShelf.tsx", "A17"],
    ["components/ui/GradeSelector.tsx", "A03"],
    ["components/ui/ThemeToggle.tsx", "A01"],
    [".env.local.example", "A19"],
    [".env.local", "A25"]
  ];

  for (const [filePath, expectedOwner] of cases) {
    const resolution = gateModule.resolveOwnerPath(filePath, resolver);
    assert.equal(resolution.status, "resolved", `${filePath} resolution status`);
    assert.deepEqual(resolution.finalOwners, [expectedOwner], `${filePath} final owner`);
    assert.equal(resolution.ownerId, expectedOwner, `${filePath} selected owner`);
  }
});

test("package gate rejects ambiguous final owner precedence", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-owner-overlap-"));
  const ownerPathspecs = path.join(tempDir, "owner-pathspecs.json");

  try {
    await writeFile(
      ownerPathspecs,
      `${JSON.stringify({
        version: 1,
        packages: [
          { id: "owner-a", owner: "A01", role: "first", pathspecs: ["same/path.ts"] },
          { id: "owner-b", owner: "A02", role: "second", pathspecs: ["same/path.ts"] }
        ],
        resolutionChecks: [{ path: "same/path.ts", expectedOwner: "A01" }]
      }, null, 2)}\n`
    );

    const result = runNode([
      "scripts/release-package-gate.mjs",
      "--owner-pathspecs",
      ownerPathspecs,
      "--json"
    ]);
    assert.notEqual(result.status, 0);
    assert.match(combinedOutput(result), /ambiguous|exactly one final owner/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("package gate requires every package wildcard to have one exact owner route", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-wildcard-routing-"));
  const packageManifest = path.join(tempDir, "owner-package-manifest.json");
  const missingOwnerPathspecs = path.join(tempDir, "missing-owner-pathspecs.json");
  const ambiguousOwnerPathspecs = path.join(tempDir, "ambiguous-owner-pathspecs.json");

  try {
    await writeFile(
      packageManifest,
      `${JSON.stringify({
        packages: [
          {
            id: "wildcard-package",
            owner: "A10",
            pathspecs: ["shared/**"],
            checks: ["npm run type-check"],
            finalState: "reviewed commit"
          }
        ]
      }, null, 2)}\n`
    );
    await writeFile(
      missingOwnerPathspecs,
      `${JSON.stringify({
        packages: [{ id: "other", owner: "A10", role: "other", pathspecs: ["other/**"] }],
        resolutionChecks: [{ path: "other/example.ts", expectedOwner: "A10" }]
      }, null, 2)}\n`
    );
    await writeFile(
      ambiguousOwnerPathspecs,
      `${JSON.stringify({
        packages: [
          { id: "shared-a", owner: "A10", role: "first", pathspecs: ["shared/**"] },
          { id: "shared-b", owner: "A22", role: "second", pathspecs: ["shared/**"] }
        ],
        resolutionChecks: [{ path: "shared/example.ts", expectedOwner: "A10" }]
      }, null, 2)}\n`
    );

    const missing = runNode([
      "scripts/release-package-gate.mjs",
      "--manifest",
      packageManifest,
      "--owner-pathspecs",
      missingOwnerPathspecs,
      "--json"
    ]);
    assert.notEqual(missing.status, 0);
    assert.match(combinedOutput(missing), /wildcard.*shared\/\*\*.*exact owner pathspec/i);

    const ambiguous = runNode([
      "scripts/release-package-gate.mjs",
      "--manifest",
      packageManifest,
      "--owner-pathspecs",
      ambiguousOwnerPathspecs,
      "--json"
    ]);
    assert.notEqual(ambiguous.status, 0);
    assert.match(combinedOutput(ambiguous), /ambiguous|exactly one final owner/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("dirty map records exactly one final owner for every resolved capture entry", async () => {
  const fixture = await createDirtyMapFixtureRepo();
  const ownerFixtures = [
    ["coordination/release-intake/example.json", "A25"],
    ["coordination/content-qa/example.md", "A18"],
    ["app/api/users/fixture.ts", "A12"],
    ["components/gamification/BadgeShelf.tsx", "A17"],
    ["public/question-illustrations/fixture.svg", "A24"],
    ["next.config.ts", "A10"]
  ];

  try {
    for (const [relativePath] of ownerFixtures) {
      const filePath = path.join(fixture.root, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, `owner fixture: ${relativePath}\n`);
    }

    const refresh = runDirtyMapFixture(fixture, [
      "--latest-json",
      fixture.latestJson,
      "--no-report",
      "--json",
      "--reason",
      "unique final owner regression"
    ]);
    assert.equal(refresh.status, 0, combinedOutput(refresh));

    const map = await readJson(fixture.latestJson);
    assert.equal(map.statusCounts.unmappedEntries, 0);
    assert.equal(map.statusCounts.ambiguousOwnerEntries, 0);
    assert.equal(map.sliceBuckets["unmapped/manual"] ?? 0, 0);
    for (const [relativePath, expectedOwner] of ownerFixtures) {
      const entry = map.entries.find((candidate) => candidate.path === relativePath);
      assert.ok(entry, `Missing isolated owner fixture: ${relativePath}`);
      assert.equal(entry.ownerId, expectedOwner, relativePath);
    }
    for (const entry of map.entries) {
      assert.equal(entry.ownerResolution.status, "resolved", entry.path);
      assert.equal(entry.ownerResolution.finalOwners.length, 1, entry.path);
      assert.equal(entry.ownerResolution.finalOwners[0], entry.ownerId, entry.path);
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("mais-dev launch uses the isolated dev wrapper and keeps fixture-only env", async () => {
  const launch = await readJson(path.join(repoRoot, ".claude/launch.json"));
  const maisDev = launch.configurations.find((configuration) => configuration.name === "mais-dev");
  assert.ok(maisDev, "mais-dev launch configuration is required");

  const npmIndex = maisDev.runtimeArgs.indexOf("npm");
  assert.notEqual(npmIndex, -1);
  assert.deepEqual(maisDev.runtimeArgs.slice(npmIndex), [
    "npm",
    "run",
    "dev:isolated",
    "--",
    "--port",
    "3100",
    "--dist",
    ".tmp/mais-dev/next-dist"
  ]);
  assert.ok(maisDev.runtimeArgs.includes("AI_TUTOR_PROVIDER_PROFILE=offline-fixture"));
  assert.ok(maisDev.runtimeArgs.includes("OPENAI_API_KEY="));
  assert.ok(maisDev.runtimeArgs.includes("ANTHROPIC_API_KEY="));
});

test("isolated launch helper dependencies are coherent and Git tracked", async () => {
  const packageJson = await readJson(path.join(repoRoot, "package.json"));
  const launch = await readJson(path.join(repoRoot, ".claude/launch.json"));
  const helpers = ["scripts/dev-isolated.mjs", "scripts/kill-port.mjs"];

  assert.equal(packageJson.scripts["dev:isolated"], "node scripts/dev-isolated.mjs");
  assert.equal(packageJson.scripts["kill-port"], "node scripts/kill-port.mjs");
  assert.ok(
    launch.configurations.find((configuration) => configuration.name === "mais-dev")
      .runtimeArgs.includes("dev:isolated")
  );

  for (const helper of helpers) {
    const tracked = runGit(["ls-files", "--error-unmatch", helper], repoRoot);
    assert.equal(tracked.status, 0, `${helper} must be Git-tracked\n${combinedOutput(tracked)}`);
    const syntax = runNode(["--check", helper]);
    assert.equal(syntax.status, 0, combinedOutput(syntax));
  }
});

test("dev-isolated rejects every invalid port before spawning Next", async () => {
  const fixture = await createDevIsolatedFixture();
  const invalidArgs = [
    ["--port", "abc", "--dist", ".tmp/dev"],
    ["--port", "1.5", "--dist", ".tmp/dev"],
    ["--port", "0", "--dist", ".tmp/dev"],
    ["--port", "-1", "--dist", ".tmp/dev"],
    ["--port", "65536", "--dist", ".tmp/dev"],
    ["--port", "--dist", ".tmp/dev"]
  ];

  try {
    for (const args of invalidArgs) {
      await rm(fixture.markerPath, { force: true });
      const result = runNodeAt(fixture.root, [fixture.scriptPath, ...args], {
        timeout: 2000,
        env: { FAKE_NEXT_MARKER: fixture.markerPath }
      });
      assert.notEqual(result.status, 0, `invalid args must fail: ${args.join(" ")}`);
      assert.match(combinedOutput(result), /port.*(?:integer.*1.*65535|requires a value)/i);
      const marker = await readFile(fixture.markerPath, "utf8").catch(() => "");
      assert.equal(marker, "", "invalid port must fail before child spawn");
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dev-isolated requires a lexical and canonical proper descendant of repo .tmp", async () => {
  const fixture = await createDevIsolatedFixture();
  const outsideDir = path.join(fixture.root, "outside");
  const escapeLink = path.join(fixture.root, ".tmp", "escape-link");
  await mkdir(outsideDir, { recursive: true });
  await symlink(outsideDir, escapeLink, "dir");
  const unsafeDists = [
    ".tmp",
    ".next",
    ".next/subdir",
    ".tmp/../.next/subdir",
    ".tmp-sibling/build",
    "app/build",
    outsideDir,
    ".tmp/escape-link/build"
  ];

  try {
    for (const dist of unsafeDists) {
      await rm(fixture.markerPath, { force: true });
      const result = runNodeAt(
        fixture.root,
        [fixture.scriptPath, "--port", "3200", "--dist", dist],
        { timeout: 2000, env: { FAKE_NEXT_MARKER: fixture.markerPath } }
      );
      assert.notEqual(result.status, 0, `unsafe dist must fail: ${dist}`);
      assert.match(combinedOutput(result), /dist.*proper descendant.*\.tmp|dist.*symlink.*escape/i);
      const marker = await readFile(fixture.markerPath, "utf8").catch(() => "");
      assert.equal(marker, "", `unsafe dist must fail before child spawn: ${dist}`);
    }

    const safe = runNodeAt(
      fixture.root,
      [fixture.scriptPath, "--port", "3200", "--dist", ".tmp/safe/next-dist"],
      { timeout: 2000, env: { FAKE_NEXT_MARKER: fixture.markerPath } }
    );
    assert.equal(safe.status, 0, combinedOutput(safe));
    const start = JSON.parse((await readFile(fixture.markerPath, "utf8")).trim());
    assert.equal(start.distDir, ".tmp/safe/next-dist");

    await rm(path.join(fixture.root, ".tmp"), { recursive: true, force: true });
    await symlink(outsideDir, path.join(fixture.root, ".tmp"), "dir");
    await rm(fixture.markerPath, { force: true });
    const escapedTmpRoot = runNodeAt(
      fixture.root,
      [fixture.scriptPath, "--port", "3200", "--dist", ".tmp/root-escape"],
      { timeout: 2000, env: { FAKE_NEXT_MARKER: fixture.markerPath } }
    );
    assert.notEqual(escapedTmpRoot.status, 0, "repo .tmp itself must not be a symlink escape");
    assert.match(combinedOutput(escapedTmpRoot), /dist.*symlink.*escape/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dev-isolated reports child spawn errors without an unhandled error event", async () => {
  const fixture = await createDevIsolatedFixture();
  try {
    const result = runNodeAt(
      fixture.root,
      [fixture.scriptPath, "--port", "3200", "--dist", ".tmp/dev"],
      {
        timeout: 2000,
        env: {
          NODE_ENV: "test",
          DEV_ISOLATED_ALLOW_TEST_OVERRIDES: "1",
          DEV_ISOLATED_RUNTIME_BIN: path.join(fixture.root, "missing-runtime"),
          FAKE_NEXT_MARKER: fixture.markerPath
        }
      }
    );
    assert.equal(result.status, 1, combinedOutput(result));
    assert.match(combinedOutput(result), /failed to start.*ENOENT/i);
    assert.doesNotMatch(combinedOutput(result), /Unhandled 'error' event/i);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dev-isolated preserves nonzero child exit and signal semantics", async () => {
  const fixture = await createDevIsolatedFixture();
  const baseArgs = [fixture.scriptPath, "--port", "3200", "--dist", ".tmp/dev"];

  try {
    const nonzero = runNodeAt(fixture.root, baseArgs, {
      timeout: 2000,
      env: { FAKE_NEXT_MARKER: fixture.markerPath, FAKE_NEXT_BEHAVIOR: "exit-23" }
    });
    assert.equal(nonzero.status, 23, combinedOutput(nonzero));

    await rm(fixture.markerPath, { force: true });
    const signaled = runNodeAt(fixture.root, baseArgs, {
      timeout: 2000,
      env: { FAKE_NEXT_MARKER: fixture.markerPath, FAKE_NEXT_BEHAVIOR: "self-sigterm" }
    });
    assert.notEqual(signaled.status, 0, "signaled child must never map to wrapper success");
    assert.ok(signaled.status === 143 || signaled.signal === "SIGTERM", combinedOutput(signaled));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("dev-isolated forwards SIGTERM and escalates so the child cannot be orphaned", async () => {
  const fixture = await createDevIsolatedFixture();
  let wrapper;
  let fakePid;

  try {
    wrapper = spawn(
      process.execPath,
      [fixture.scriptPath, "--port", "3200", "--dist", ".tmp/dev"],
      {
        cwd: fixture.root,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          FAKE_NEXT_MARKER: fixture.markerPath,
          FAKE_NEXT_BEHAVIOR: "ignore-signals",
          DEV_ISOLATED_SHUTDOWN_GRACE_MS: "100"
        }
      }
    );
    const start = await waitFor(async () => {
      const marker = await readFile(fixture.markerPath, "utf8").catch(() => "");
      const events = marker.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
      return events.find((event) => event.event === "start");
    });
    fakePid = start.pid;
    wrapper.kill("SIGTERM");
    await waitForExit(wrapper, 3000);
    const events = (await readFile(fixture.markerPath, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.ok(events.some((event) => event.event === "signal" && event.signal === "SIGTERM"));
    await waitFor(() => !processIsAlive(fakePid), 1000);
    assert.equal(processIsAlive(fakePid), false, "fake Next child must be gone after wrapper exits");
  } finally {
    if (wrapper?.pid && processIsAlive(wrapper.pid)) process.kill(wrapper.pid, "SIGKILL");
    if (fakePid && processIsAlive(fakePid)) process.kill(fakePid, "SIGKILL");
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("kill-port validates the complete port list before invoking lsof", async () => {
  const fixture = await createFakeLsofFixture();
  try {
    const result = runNode(["scripts/kill-port.mjs", "3200", "not-a-port"], {
      env: {
        PATH: `${fixture.binDir}:${process.env.PATH}`,
        FAKE_LSOF_ARGS: fixture.argsPath,
        FAKE_LSOF_COUNT: fixture.countPath,
        FAKE_LSOF_VISIBLE_CALLS: "0"
      }
    });
    assert.equal(result.status, 1, combinedOutput(result));
    assert.match(combinedOutput(result), /port.*integer.*1.*65535/i);
    const lsofArgs = await readFile(fixture.argsPath, "utf8").catch(() => "");
    assert.equal(lsofArgs, "", "invalid input must prevent every lsof query");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("kill-port queries only TCP listeners", async () => {
  const fixture = await createFakeLsofFixture();
  try {
    const result = runNode(["scripts/kill-port.mjs", "4567"], {
      env: {
        PATH: `${fixture.binDir}:${process.env.PATH}`,
        FAKE_LSOF_ARGS: fixture.argsPath,
        FAKE_LSOF_COUNT: fixture.countPath,
        FAKE_LSOF_VISIBLE_CALLS: "0"
      }
    });
    assert.equal(result.status, 0, combinedOutput(result));
    assert.deepEqual((await readFile(fixture.argsPath, "utf8")).trim().split("\n"), [
      "--call--",
      "-nP",
      "-t",
      "-iTCP:4567",
      "-sTCP:LISTEN"
    ]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("kill-port sends SIGTERM and confirms the listener released before returning", async () => {
  const fixture = await createFakeLsofFixture();
  const readyPath = path.join(fixture.root, "listener-ready.txt");
  let listener;

  try {
    listener = spawn(process.execPath, ["-e", `require("node:fs").writeFileSync(${JSON.stringify(readyPath)}, "ready"); setInterval(() => {}, 1000);`], {
      stdio: "ignore"
    });
    await waitFor(() => readFile(readyPath, "utf8").then(() => true).catch(() => false));
    const result = runNode(["scripts/kill-port.mjs", "4567"], {
      env: {
        PATH: `${fixture.binDir}:${process.env.PATH}`,
        FAKE_LSOF_ARGS: fixture.argsPath,
        FAKE_LSOF_COUNT: fixture.countPath,
        FAKE_LSOF_VISIBLE_CALLS: "1",
        FAKE_LISTENER_PID: String(listener.pid),
        KILL_PORT_GRACE_MS: "50"
      }
    });
    assert.equal(result.status, 0, combinedOutput(result));
    const exit = await waitForExit(listener, 1000);
    assert.equal(exit.signal, "SIGTERM", combinedOutput(result));
    assert.match(combinedOutput(result), /terminated pid .*SIGTERM/i);
    assert.doesNotMatch(combinedOutput(result), /SIGKILL|force-killed/i);
  } finally {
    if (listener?.pid && processIsAlive(listener.pid)) process.kill(listener.pid, "SIGKILL");
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("kill-port uses SIGKILL only after a controlled SIGTERM grace fallback", async () => {
  const fixture = await createFakeLsofFixture();
  const readyPath = path.join(fixture.root, "sticky-ready.txt");
  const signalPath = path.join(fixture.root, "sticky-signals.txt");
  let listener;

  try {
    listener = spawn(
      process.execPath,
      [
        "-e",
        `const fs=require("node:fs"); process.on("SIGTERM",()=>fs.appendFileSync(${JSON.stringify(signalPath)},"SIGTERM\\n")); fs.writeFileSync(${JSON.stringify(readyPath)},"ready"); setInterval(()=>{},1000);`
      ],
      { stdio: "ignore" }
    );
    await waitFor(() => readFile(readyPath, "utf8").then(() => true).catch(() => false));
    const result = runNode(["scripts/kill-port.mjs", "4567"], {
      env: {
        PATH: `${fixture.binDir}:${process.env.PATH}`,
        FAKE_LSOF_ARGS: fixture.argsPath,
        FAKE_LSOF_COUNT: fixture.countPath,
        FAKE_LSOF_VISIBLE_CALLS: "2",
        FAKE_LISTENER_PID: String(listener.pid),
        KILL_PORT_GRACE_MS: "50"
      }
    });
    assert.equal(result.status, 0, combinedOutput(result));
    const exit = await waitForExit(listener, 1000);
    assert.equal(exit.signal, "SIGKILL", combinedOutput(result));
    const observedSignals = await readFile(signalPath, "utf8").catch(() => "");
    assert.match(observedSignals, /SIGTERM/);
    assert.match(combinedOutput(result), /force-killed pid .*after SIGTERM grace/i);
  } finally {
    if (listener?.pid && processIsAlive(listener.pid)) process.kill(listener.pid, "SIGKILL");
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Git-index Next config composes the approved build hooks and nine compatibility redirects", async () => {
  const configObject = runGit(["show", ":next.config.ts"], repoRoot);
  assert.equal(configObject.status, 0, combinedOutput(configObject));
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-next-config-object-"));
  const configPath = path.join(tempDir, "next.config.ts");
  const previousDistDir = process.env.NEXT_DIST_DIR;
  const previousTsconfigPath = process.env.NEXT_TSCONFIG_PATH;

  try {
    await writeFile(configPath, configObject.stdout);
    process.env.NEXT_DIST_DIR = ".tmp/object-proof/next-dist";
    process.env.NEXT_TSCONFIG_PATH = "tsconfig.release-proof.json";
    const imported = await import(`${pathToFileURL(configPath).href}?proof=${Date.now()}`);
    const config = imported.default;
    assert.equal(config.distDir, ".tmp/object-proof/next-dist");
    assert.equal(config.devIndicators, false);
    assert.equal(config.skipMiddlewareUrlNormalize, true);
    assert.deepEqual(config.transpilePackages, [
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "three-stdlib"
    ]);
    assert.deepEqual(config.typescript, { tsconfigPath: "tsconfig.release-proof.json" });
    assert.deepEqual(await config.redirects(), [
      { source: "/visualization-lab", destination: "/student/tools/visualizations", permanent: true },
      { source: "/learning-path", destination: "/student/roadmap", permanent: true },
      { source: "/primary-roadmap", destination: "/student/roadmap/primary", permanent: true },
      { source: "/secondary-roadmap", destination: "/student/roadmap/secondary", permanent: true },
      { source: "/lesson", destination: "/student/lessons", permanent: true },
      { source: "/lesson/:lessonSlug", destination: "/student/lessons/:lessonSlug", permanent: true },
      { source: "/practice/adventure-island", destination: "/student/practice/games/adventure-island", permanent: true },
      { source: "/practice/super-platformer-like", destination: "/student/practice/games/adventure-island", permanent: true },
      { source: "/practice/fishing-game", destination: "/student/practice/games/fishing-master", permanent: true }
    ]);
  } finally {
    if (previousDistDir === undefined) delete process.env.NEXT_DIST_DIR;
    else process.env.NEXT_DIST_DIR = previousDistDir;
    if (previousTsconfigPath === undefined) delete process.env.NEXT_TSCONFIG_PATH;
    else process.env.NEXT_TSCONFIG_PATH = previousTsconfigPath;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("P0 package delta and default release gates are self-contained in Git objects", () => {
  const baseline = readGitObjectJson(`${p0BaselineCommit}:package.json`);
  const current = readGitObjectJson(":package.json");
  const packageLock = readGitObjectJson(":package-lock.json");
  const expectedP0Scripts = {
    "check:imports": "node scripts/check-import-targets.mjs",
    "dev:isolated": "node scripts/dev-isolated.mjs",
    "kill-port": "node scripts/kill-port.mjs",
    "release:dirty-map": "node scripts/refresh-dirty-tree-map.mjs",
    "release:package-gate": "node scripts/release-package-gate.mjs",
    "release:preflight": "node scripts/release-env-guard.mjs",
    "release:env-preflight": "node scripts/release-env-guard.mjs env",
    "release:runtime-preflight": "node scripts/release-env-guard.mjs runtime-release",
    "release:publish-preflight": "node scripts/release-env-guard.mjs publish",
    "release:staged-publish-preflight": "node scripts/release-env-guard.mjs staged-publish",
    "release:root-deploy-preflight": "node scripts/release-env-guard.mjs root-deploy",
    "test:release-governance": "node --test --test-concurrency=1 scripts/release-build-gate.test.mjs scripts/release-governance.test.mjs",
    "test:release-evidence": "node --test --test-concurrency=1 coordination/release-intake/refresh-linked-worktree-archive-evidence.test.mjs",
    "test:imports": "node --test scripts/check-import-targets.test.mjs"
  };
  const expectedParentDeliveryAndReadinessScripts = {
    "maintain:teacher-notice-resend-webhook":
      "node --import tsx scripts/teacher-notice-resend-webhook-maintenance.mjs",
    "migrate:teacher-notice-resend-webhook":
      "node --import tsx scripts/teacher-notice-resend-webhook-migration.mjs",
    "teacher-notice-outbox:migrate":
      "node --import tsx scripts/teacher-notice-outbox-migration.mjs --apply",
    "teacher-notice-outbox:preflight":
      "node --import tsx scripts/teacher-notice-outbox-migration.mjs --preflight",
    "test:postgres-readiness":
      "node --test scripts/run-postgres-readiness-tests.test.mjs && node scripts/run-postgres-readiness-tests.mjs",
    "test:teacher-notice-outbox":
      "node --import tsx --test scripts/teacher-notice-outbox-migration.test.mjs lib/server/teacherNoticeEmailDelivery.test.ts lib/server/teacherNoticeEmailOutboxHandlers.test.ts lib/server/userStoreTeacherNoticeEmailOutboxPersistence.test.ts lib/server/userStoreTeacherNoticeEmailOutboxStorage.test.ts lib/server/userStoreTeacherNoticeEmailOutboxSqliteIntegration.test.ts lib/server/userStoreTeacherNoticeEmailOutboxRemediation.test.ts lib/server/userStoreTeacherOpsNoticePersistence.test.ts lib/server/userStoreTeacherOpsReminderPersistence.test.ts",
    "test:teacher-notice-outbox:postgres16":
      "node -e \"if (!process.env.MAIS_OUTBOX_POSTGRES16_INTEGRATION_URL) process.exit(2)\" && node --import tsx --test lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts",
    "test:teacher-notice-resend-webhook":
      "node scripts/run-teacher-notice-resend-webhook-tests.mjs",
    "test:teacher-notice-resend-webhook:postgres":
      "node --import tsx --test lib/server/userStoreTeacherNoticeResendWebhookPostgresIntegration.test.ts"
  };
  const allowedScriptChanges = new Set([
    "audit:ccss-depth",
    "audit:lesson-illustrations",
    "audit:us-math-items",
    "build",
    "certify:production",
    "check",
    "check:imports",
    "check:port-drift",
    "check:stray-types",
    "clean:generated",
    "clean:generated:apply",
    "clean:next-builds",
    "clean:vercel-staging",
    "dev",
    "dev:isolated",
    "dev:turbo",
    "eval:adaptive",
    "fit:bkt",
    "kill-port",
    "maintain:teacher-notice-resend-webhook",
    "migrate:teacher-notice-resend-webhook",
    "promotion:shadow",
    "promotion:validate",
    "promotion:verify-receipt",
    "rag:hk-up-junior-english-exercises-manifest",
    "rag:hk-up-junior-english-textbook-manifest",
    "rag:hk-up-junior-resources-manifest",
    "rag:hk-up-junior-textbook-manifest",
    "release:build-gate",
    "release:dirty-map",
    "release:env-preflight",
    "release:package-gate",
    "release:preflight",
    "release:publish-preflight",
    "release:root-deploy-preflight",
    "release:runtime-preflight",
    "release:staged-publish-preflight",
    "report:bench-usage",
    "smoke:ai-tutor-live-latency",
    "smoke:dashboard-auth-ready",
    "smoke:dashboard-latency",
    "smoke:dashboard-ui-loading",
    "smoke:resend:local",
    "teacher-notice-outbox:migrate",
    "teacher-notice-outbox:preflight",
    "test:accommodations",
    "test:analytics",
    "test:ccss-depth",
    "test:ccss-textbook",
    "test:components",
    "test:content-safety",
    "test:e2e",
    "test:imports",
    "test:lesson-menu",
    "test:mvp",
    "test:parent-console",
    "test:postgres-readiness",
    "test:promotion-gate",
    "test:prod-certification",
    "test:question-bank",
    "test:question-figure",
    "test:rag",
    "test:release-evidence",
    "test:release-governance",
    "test:signature-labs",
    "test:source-regressions",
    "test:stray-types",
    "test:teacher-notice-outbox",
    "test:teacher-notice-outbox:postgres16",
    "test:teacher-notice-resend-webhook",
    "test:teacher-notice-resend-webhook:postgres",
    "test:tutor-moderation",
    "test:tutor-transcript",
    "test:visualizations",
    "vercel:preview",
    "vercel:production",
    "vercel:stage"
  ]);
  const allScriptNames = new Set([
    ...Object.keys(baseline.scripts ?? {}),
    ...Object.keys(current.scripts ?? {})
  ]);
  const changedScriptNames = [...allScriptNames]
    .filter((name) => baseline.scripts?.[name] !== current.scripts?.[name])
    .sort();

  assert.deepEqual(
    changedScriptNames,
    [...allowedScriptChanges].sort(),
    "Only the reviewed A10/A22 release and runtime commands may differ from the frozen baseline"
  );
  const changedScripts = Object.fromEntries(
    changedScriptNames.map((name) => [name, current.scripts?.[name] ?? null])
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(changedScripts)).digest("hex"),
    "8a59d333637faf9b9507733d8680b0cfc1dd323291193567beacbaafa0c55530",
    "Reviewed command bodies must remain exact"
  );
  for (const [name, command] of Object.entries(expectedP0Scripts)) {
    assert.equal(current.scripts[name], command, `${name} command`);
    const localTarget = command.split(/\s+/).find((token) => /\.(?:c?js|mjs)$/.test(token));
    assert.ok(localTarget, `${name} must resolve one local Node target`);
    assertTrackedInIndex(localTarget);
  }
  for (const [name, command] of Object.entries(expectedParentDeliveryAndReadinessScripts)) {
    assert.equal(current.scripts[name], command, `${name} command`);
  }

  for (const command of Object.values(changedScripts)) {
    if (typeof command !== "string") continue;
    for (const target of command.match(/scripts\/[^\s]+\.(?:mjs|py)/gu) ?? []) {
      assertTrackedInIndex(target);
    }
  }

  assert.deepEqual(current.dependencies, {
    ...baseline.dependencies,
    "@react-three/drei": "10.7.7",
    "@react-three/fiber": "9.6.1",
    next: "15.5.23",
    pptxgenjs: "^4.0.1",
    svix: "^2.0.0",
    three: "0.184.0",
    "three-stdlib": "2.36.1",
    ws: "^8.21.0"
  });
  assert.deepEqual(current.devDependencies, {
    ...baseline.devDependencies,
    "@types/ws": "^8.18.1",
    ajv: "8.17.1",
    postcss: "8.5.26",
    tsx: "^4.22.4",
    yaml: "2.9.0"
  });
  assert.deepEqual(current.overrides, {
    ...(baseline.overrides ?? {}),
    postcss: "8.5.26"
  });
  assert.deepEqual(packageLock.packages[""].dependencies, current.dependencies);
  assert.deepEqual(packageLock.packages[""].devDependencies, current.devDependencies);
  assert.equal(packageLock.packages[""].devDependencies.ajv, "8.17.1");
  assert.deepEqual(packageLock.packages["node_modules/ajv"], {
    version: "8.17.1",
    resolved: "https://registry.npmjs.org/ajv/-/ajv-8.17.1.tgz",
    integrity: "sha512-B/gBuNg5SiMTrPkC+A2+cW0RszwxYmn6VYxB/inlBStS5nx6xHIt/ehKRhIMhqusl7a8LjQoZnjCs5vhwxOQ1g==",
    dev: true,
    license: "MIT",
    dependencies: {
      "fast-deep-equal": "^3.1.3",
      "fast-uri": "^3.0.1",
      "json-schema-traverse": "^1.0.0",
      "require-from-string": "^2.0.2"
    },
    funding: {
      type: "github",
      url: "https://github.com/sponsors/epoberezkin"
    }
  });
  assert.equal(packageLock.packages["node_modules/fast-deep-equal"].version, "3.1.3");
  assert.equal(packageLock.packages["node_modules/fast-uri"].version, "3.1.6");
  assert.equal(packageLock.packages["node_modules/json-schema-traverse"].version, "1.0.0");
  assert.equal(packageLock.packages["node_modules/require-from-string"].version, "2.0.2");
  assert.equal(packageLock.packages["node_modules/next"].version, "15.5.23");
  assert.equal(packageLock.packages["node_modules/postcss"].version, "8.5.26");
  assert.equal(packageLock.packages["node_modules/three"].version, "0.184.0");
  assert.equal(packageLock.packages["node_modules/three-stdlib"].version, "2.36.1");
  assert.equal(packageLock.packages["node_modules/ws"].version, "8.21.1");
  assert.equal(packageLock.packages["node_modules/yaml"].version, "2.9.0");
  assert.equal(packageLock.packages["node_modules/yaml"].dev, true);
  assert.match(packageLock.packages["node_modules/yaml"].integrity, /^sha512-/u);

  const releaseGuard = runGit(["show", ":scripts/release-env-guard.mjs"], repoRoot);
  assert.equal(releaseGuard.status, 0, combinedOutput(releaseGuard));
  const gateConstants = ["RELEASE_SOURCE_CLEAN_GATE", "WORKTREE_LIFECYCLE_GATE"];
  for (const constant of gateConstants) {
    const gatePath = releaseGuard.stdout.match(
      new RegExp(`const\\s+${constant}\\s*=\\s*"([^"]+)"`)
    )?.[1];
    assert.ok(gatePath, `Missing default gate constant ${constant}`);
    assertTrackedInIndex(gatePath);
  }
});

test("default release-source gates accept clean sources, reject dirty sources, and leave no evidence dirt", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-default-release-gates-"));
  const cleanGate = path.join(repoRoot, "coordination/release-intake/assert-release-source-clean.mjs");
  const lifecycleGate = path.join(repoRoot, "coordination/release-intake/assert-worktree-lifecycle.mjs");

  try {
    const init = runGit(["init", "--quiet", "--initial-branch=main"], tempDir);
    assert.equal(init.status, 0, combinedOutput(init));
    await mkdir(path.join(tempDir, "coordination", "release-intake"), { recursive: true });
    await writeFile(path.join(tempDir, "README.md"), "clean release source fixture\n");
    const add = runGit(["add", "README.md"], tempDir);
    assert.equal(add.status, 0, combinedOutput(add));
    const commit = runGit([
      "-c",
      "user.name=Release Governance Test",
      "-c",
      "user.email=release-governance@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "fixture"
    ], tempDir);
    assert.equal(commit.status, 0, combinedOutput(commit));

    const clean = runNodeAt(tempDir, [cleanGate]);
    assert.equal(clean.status, 0, combinedOutput(clean));
    const lifecycle = runNodeAt(tempDir, [lifecycleGate, "--strict", "--json"]);
    assert.equal(lifecycle.status, 0, combinedOutput(lifecycle));
    const afterGates = runGit(["status", "--porcelain=v1", "-z", "-uall"], tempDir);
    assert.equal(afterGates.status, 0, combinedOutput(afterGates));
    assert.equal(afterGates.stdout, "", "default gates must not dirty a clean release source");

    await writeFile(path.join(tempDir, "dirty.txt"), "dirty release source fixture\n");
    const dirty = runNodeAt(tempDir, [cleanGate]);
    assert.notEqual(dirty.status, 0);
    assert.match(combinedOutput(dirty), /release source is dirty/i);
    const dirtyLifecycle = runNodeAt(tempDir, [lifecycleGate, "--strict", "--json"]);
    assert.notEqual(dirtyLifecycle.status, 0);
    assert.match(combinedOutput(dirtyLifecycle), /dirty|open lifecycle decision/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("worktree lifecycle fails closed when main divergence is indeterminate", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-lifecycle-indeterminate-"));
  const lifecycleGate = path.join(repoRoot, "coordination/release-intake/assert-worktree-lifecycle.mjs");

  try {
    const init = runGit(["init", "--quiet", "--initial-branch=trunk"], tempDir);
    assert.equal(init.status, 0, combinedOutput(init));
    await writeFile(path.join(tempDir, "README.md"), "trunk-only lifecycle fixture\n");
    assert.equal(runGit(["add", "README.md"], tempDir).status, 0);
    const commit = runGit([
      "-c",
      "user.name=Release Governance Test",
      "-c",
      "user.email=release-governance@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "fixture"
    ], tempDir);
    assert.equal(commit.status, 0, combinedOutput(commit));

    const result = runNodeAt(tempDir, [lifecycleGate, "--json"]);
    assert.notEqual(result.status, 0, "missing main must fail even without --strict");
    const payload = JSON.parse(result.stdout);
    const worktree = payload.worktrees.find((entry) => entry.branch === "trunk");
    assert.ok(worktree, "trunk fixture worktree must be reported");
    assert.equal(worktree.state, "indeterminate-error");
    assert.ok(worktree.errors.some((error) => error.operation === "rev-list-main-divergence"));
    for (const error of worktree.errors) {
      assert.equal(typeof error.exitCode, "number");
      assert.ok(!JSON.stringify(error).includes(tempDir), "error metadata must not expose absolute worktree paths");
    }
    assert.match(result.stderr, /indeterminate-error|indeterminate lifecycle/i);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("default preflight all invokes dirty-map, release-source, and strict lifecycle gates", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-preflight-all-"));
  const sourceRoot = path.join(tempDir, "clean-source");
  const markerPath = path.join(tempDir, "gate-marker.txt");
  const failingGatePath = path.join(tempDir, "failing-gate.txt");
  const dirtyMapStub = path.join(tempDir, "dirty-map-stub.mjs");
  const releaseSourceStub = path.join(tempDir, "release-source-stub.mjs");
  const lifecycleStub = path.join(tempDir, "lifecycle-stub.mjs");

  const stubSource = (label, jsonOutput = false) => `
import fs from "node:fs";
fs.appendFileSync(${JSON.stringify(markerPath)}, ${JSON.stringify(label)} + "\\n");
if (fs.existsSync(${JSON.stringify(failingGatePath)}) && fs.readFileSync(${JSON.stringify(failingGatePath)}, "utf8").trim() === ${JSON.stringify(label)}) {
  console.error(${JSON.stringify(label)} + " stub failure");
  process.exit(37);
}
${jsonOutput ? 'console.log(JSON.stringify({ gate: "dirty-map", result: "pass" }));' : 'console.log("gate passed");'}
`;

  try {
    await mkdir(sourceRoot, { recursive: true });
    const init = runGit(["init", "--quiet", "--initial-branch=main"], sourceRoot);
    assert.equal(init.status, 0, combinedOutput(init));
    await writeFile(path.join(sourceRoot, "README.md"), "clean preflight source\n");
    assert.equal(runGit(["add", "README.md"], sourceRoot).status, 0);
    const commit = runGit([
      "-c",
      "user.name=Release Governance Test",
      "-c",
      "user.email=release-governance@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "fixture"
    ], sourceRoot);
    assert.equal(commit.status, 0, combinedOutput(commit));
    await writeFile(dirtyMapStub, stubSource("dirty-map", true));
    await writeFile(releaseSourceStub, stubSource("release-source"));
    await writeFile(lifecycleStub, stubSource("lifecycle"));

    const baseEnv = {
      NODE_ENV: "test",
      MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS: "1",
      MAIS_RELEASE_SOURCE_ROOT: sourceRoot,
      MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
      MAIS_RELEASE_SOURCE_KIND: "clean-worktree",
      MAIS_DIRTY_TREE_MAP_GATE: dirtyMapStub,
      MAIS_RELEASE_SOURCE_CLEAN_GATE: releaseSourceStub,
      MAIS_WORKTREE_LIFECYCLE_GATE: lifecycleStub
    };

    const pass = runNode(["scripts/release-env-guard.mjs", "--json"], { env: baseEnv });
    assert.equal(pass.status, 0, combinedOutput(pass));
    const markerContents = await readFile(markerPath, "utf8").catch(() => "");
    assert.deepEqual(markerContents.trim().split("\n").filter(Boolean), [
      "dirty-map",
      "release-source",
      "lifecycle"
    ]);
    const payload = JSON.parse(pass.stdout);
    assert.equal(payload.mode, "all");
    assert.ok(payload.dirtyTreeMap, "default all must include dirty-map currentness evidence");
    assert.equal(payload.releaseSource.releaseSourceClean.passed, true);
    assert.equal(payload.releaseSource.strictWorktreeLifecycle.passed, true);

    for (const failingGate of ["dirty-map", "release-source", "lifecycle"]) {
      await rm(markerPath, { force: true });
      await writeFile(failingGatePath, `${failingGate}\n`);
      const fail = runNode(["scripts/release-env-guard.mjs", "--json"], {
        env: baseEnv
      });
      assert.notEqual(fail.status, 0, `${failingGate} failure must fail default preflight`);
      assert.match(combinedOutput(fail), new RegExp(`${failingGate} stub failure`, "i"));
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("package and coordination contracts preserve security versions and closure rules", async () => {
  const packageJson = await readJson(path.join(repoRoot, "package.json"));
  const packageLock = await readJson(path.join(repoRoot, "package-lock.json"));
  const gitignore = await readFile(path.join(repoRoot, ".gitignore"), "utf8");
  const agents = await readFile(path.join(repoRoot, "AGENTS.md"), "utf8");

  assert.equal(packageJson.dependencies.next, "15.5.23");
  assert.equal(packageJson.devDependencies.postcss, "8.5.26");
  assert.equal(packageJson.devDependencies.yaml, "2.9.0");
  assert.equal(packageJson.overrides.postcss, "8.5.26");
  assert.equal(packageLock.packages["node_modules/next"].version, "15.5.23");
  assert.equal(packageLock.packages["node_modules/postcss"].version, "8.5.26");
  assert.equal(packageLock.packages[""].devDependencies.yaml, "2.9.0");
  assert.equal(packageLock.packages["node_modules/yaml"].version, "2.9.0");
  assert.equal(packageLock.packages["node_modules/yaml"].dev, true);
  assert.match(packageLock.packages["node_modules/yaml"].integrity, /^sha512-/u);
  assert.equal(packageJson.scripts["release:package-gate"], "node scripts/release-package-gate.mjs");
  assert.equal(
    packageJson.scripts["test:release-governance"],
    "node --test --test-concurrency=1 scripts/release-build-gate.test.mjs scripts/release-governance.test.mjs"
  );
  assert.match(gitignore, /^Users\/$/m);
  assert.match(agents, /git add \./i);
  assert.match(agents, /owner-pathspecs\.json/i);
  assert.match(agents, /reviewed commit/i);
  assert.match(agents, /owner-approved discard/i);
  assert.match(agents, /evidence archive/i);
  assert.match(agents, /blocker report/i);
});

test("release source preflight freezes canonical root for source and root-deploy modes", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-release-source-gates-"));
  const passingGate = path.join(tempDir, "passing-gate.mjs");
  await writeFile(passingGate, 'console.log("test gate passed");\n');

  const sharedEnv = {
    NODE_ENV: "test",
    MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS: "1",
    MAIS_RELEASE_SOURCE_CLEAN_GATE: passingGate,
    MAIS_WORKTREE_LIFECYCLE_GATE: passingGate,
    MAIS_RELEASE_SOURCE_ROOT: repoRoot,
    MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
    MAIS_RELEASE_SOURCE_KIND: "root"
  };

  try {
    for (const mode of ["source", "root-deploy"]) {
      const blocked = runNode(["scripts/release-env-guard.mjs", mode, "--json"], { env: sharedEnv });
      assert.notEqual(blocked.status, 0, `${mode} must fail for the canonical root`);
      assert.match(combinedOutput(blocked), /root release is frozen/i);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("canonical realpath stays frozen for approved pruned staging and symlink aliases", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-canonical-realpath-"));
  const aliasRoot = path.join(tempDir, "canonical-alias");
  const passingGate = path.join(tempDir, "passing-gate.mjs");
  await symlink(repoRoot, aliasRoot, "dir");
  await writeFile(passingGate, 'console.log("test gate passed");\n');

  try {
    for (const sourceRoot of [repoRoot, aliasRoot]) {
      for (const mode of ["source", "root-deploy"]) {
        const blocked = runNode(["scripts/release-env-guard.mjs", mode, "--json"], {
          env: {
            NODE_ENV: "test",
            MAIS_RELEASE_GUARD_ALLOW_TEST_STUBS: "1",
            MAIS_RELEASE_SOURCE_CLEAN_GATE: passingGate,
            MAIS_WORKTREE_LIFECYCLE_GATE: passingGate,
            MAIS_RELEASE_SOURCE_ROOT: sourceRoot,
            MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
            MAIS_RELEASE_SOURCE_KIND: "pruned-staging",
            MAIS_OWNER_APPROVED_PRUNED_STAGING: "1"
          }
        });
        assert.notEqual(blocked.status, 0, `${mode} must reject canonical identity ${sourceRoot}`);
        assert.match(combinedOutput(blocked), /root release is frozen/i);
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("release source kinds require clean Git sources or explicitly approved pruned staging", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "mais-release-source-kind-"));
  const cleanSource = path.join(tempDir, "clean-source");
  const init = runGit(["init", "--quiet", cleanSource], tempDir);
  assert.equal(init.status, 0, combinedOutput(init));

  try {
    const clean = runNode(["scripts/release-env-guard.mjs", "source", "--json"], {
      env: {
        MAIS_RELEASE_SOURCE_ROOT: cleanSource,
        MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
        MAIS_RELEASE_SOURCE_KIND: "clean-worktree"
      }
    });
    assert.equal(clean.status, 0, combinedOutput(clean));
    assert.equal(JSON.parse(clean.stdout).source.kind, "clean-worktree");

    const unapproved = runNode(["scripts/release-env-guard.mjs", "source", "--json"], {
      env: {
        MAIS_RELEASE_SOURCE_ROOT: tempDir,
        MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
        MAIS_RELEASE_SOURCE_KIND: "pruned-staging",
        MAIS_OWNER_APPROVED_PRUNED_STAGING: "0"
      }
    });
    assert.notEqual(unapproved.status, 0);
    assert.match(combinedOutput(unapproved), /owner-approved pruned staging/i);

    const approved = runNode(["scripts/release-env-guard.mjs", "source", "--json"], {
      env: {
        MAIS_RELEASE_SOURCE_ROOT: tempDir,
        MAIS_CANONICAL_RELEASE_ROOT: repoRoot,
        MAIS_RELEASE_SOURCE_KIND: "pruned-staging",
        MAIS_OWNER_APPROVED_PRUNED_STAGING: "1"
      }
    });
    assert.equal(approved.status, 0, combinedOutput(approved));
    assert.equal(JSON.parse(approved.stdout).source.kind, "owner-approved-pruned-staging");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
