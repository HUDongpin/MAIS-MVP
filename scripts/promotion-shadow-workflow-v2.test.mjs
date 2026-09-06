import assert from "node:assert/strict";
import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, truncate, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import "./promotion-reaffirmation-history.test.mjs";
import { parse as parseYaml } from "yaml";
import { assertRequiredWorkflowShape } from "./promotion-required-check-semantic-rescope.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(repoRoot, ".github/workflows/promotion-shadow.yml");

async function loadWorkflow() {
  const source = await readFile(workflowPath, "utf8");
  return { source, workflow: parseYaml(source) };
}

function gitAt(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function commitFixture(root, paths, message) {
  gitAt(root, ["add", "--", ...paths]);
  gitAt(root, ["commit", "--quiet", "-m", message]);
  return gitAt(root, ["rev-parse", "HEAD"]);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function createBootstrapResolverFixture({ includeDescendant = true, intermediary = false, splitBinding = false, receiptAtBinding = false, descriptorPatch = null } = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "promotion-shadow-bootstrap-")));
  const manifestPath = "coordination/integration/pilots/example/promotion-manifest.v2.json";
  const receiptPath = "coordination/integration/pilots/example/promotion-shadow-receipt.v2.json";
  const reaffirmationPath = "coordination/integration/pilots/example/reaffirmation.v2.json";
  const runnerTemp = path.join(root, "runner-temp");
  const outputPath = path.join(root, "github-output.txt");
  const copyPath = path.join(runnerTemp, "promotion-canonical-receipt.v2.json");
  const absoluteReceiptPath = path.join(root, receiptPath);
  await mkdir(path.dirname(absoluteReceiptPath), { recursive: true });
  await mkdir(runnerTemp);
  await mkdir(path.join(root, "scripts"));
  await copyFile(path.join(repoRoot, "scripts", "promotion-workflow-json-guard.mjs"), path.join(root, "scripts", "promotion-workflow-json-guard.mjs"));
  await copyFile(path.join(repoRoot, "scripts", "promotion-reaffirmation-history.mjs"), path.join(root, "scripts", "promotion-reaffirmation-history.mjs"));
  gitAt(root, ["init", "--quiet", "--initial-branch=main"]);
  gitAt(root, ["config", "user.name", "Promotion bootstrap test"]);
  gitAt(root, ["config", "user.email", "promotion-bootstrap@example.invalid"]);
  await writeFile(path.join(root, "evidence.txt"), "evidence\n");
  gitAt(root, ["add", "--", "evidence.txt"]);
  gitAt(root, ["commit", "--quiet", "-m", "evidence"]);
  const evidenceCommit = gitAt(root, ["rev-parse", "HEAD"]);
  if (intermediary) {
    await writeFile(path.join(root, "intermediary.txt"), "not the evidence parent\n");
    commitFixture(root, ["intermediary.txt"], "intermediary");
  }
  const manifestBytes = Buffer.from(`${JSON.stringify({ schemaVersion: "promotion-manifest.v2", gateId: "fixture" })}\n`);
  const descriptor = {
    schemaVersion: "promotion-reaffirmation.v2",
    relation: "append-only-reaffirmation",
    directParent: {
      manifest: { path: "coordination/integration/pilots/parent/promotion-manifest.v2.json", rawSha256: "a".repeat(64) },
      receipt: { path: "coordination/integration/pilots/parent/promotion-shadow-receipt.v2.json", rawSha256: "b".repeat(64) }
    },
    historicalBase: {
      manifest: { path: "coordination/integration/pilots/base/promotion-manifest.v2.json", rawSha256: "c".repeat(64) },
      receipt: { path: "coordination/integration/pilots/base/promotion-shadow-receipt.v2.json", rawSha256: "d".repeat(64) },
      closure: { path: "coordination/integration/pilots/base/shadow-closure.v2.json", rawSha256: "e".repeat(64) },
      registry: { path: "coordination/integration/pilots/base/lifecycle-registry.v2.json", rawSha256: "f".repeat(64) }
    },
    revision: { manifest: { path: manifestPath, rawSha256: sha256(manifestBytes) } },
    unchangedBindings: {
      candidateDigest: "1".repeat(64), sourceCommit: "2".repeat(40), checkerVersion: "fixture", checkerBundleDigest: "3".repeat(64), checkerReleaseCommit: "4".repeat(40)
    },
    baselineDelta: {
      fromCommit: "5".repeat(40), toCommit: "6".repeat(40), unrelatedToCandidate: true, candidatePathsChanged: false, checkerPathsChanged: false, changedPathsDigest: "7".repeat(64), reviewEvidence: []
    },
    ordering: { evidenceCommit }
  };
  descriptorPatch?.(descriptor);
  await writeFile(path.join(root, manifestPath), manifestBytes);
  await writeFile(path.join(root, reaffirmationPath), `${JSON.stringify(descriptor)}\n`);
  if (receiptAtBinding) await writeFile(absoluteReceiptPath, `${JSON.stringify({ schemaVersion: "promotion-receipt.v2", result: "pass" })}\n`);
  if (splitBinding) {
    commitFixture(root, [manifestPath], "add manifest alone");
    const descriptorCommit = commitFixture(root, [reaffirmationPath], "add descriptor alone");
    if (receiptAtBinding) throw new Error("receiptAtBinding fixture must retain atomic binding");
    if (includeDescendant) {
      await writeFile(path.join(root, "workflow-fix.txt"), "descendant\n");
      commitFixture(root, ["workflow-fix.txt"], "workflow fix descendant");
    }
    return { root, manifestPath, receiptPath, reaffirmationPath, runnerTemp, outputPath, copyPath, absoluteReceiptPath, evidenceCommit, bindingCommit: descriptorCommit, manifestBytes, descriptor };
  }
  const bindingPaths = [manifestPath, reaffirmationPath, ...(receiptAtBinding ? [receiptPath] : [])];
  const bindingCommit = commitFixture(root, bindingPaths, "bind manifest and descriptor");
  if (includeDescendant) {
    await writeFile(path.join(root, "workflow-fix.txt"), "descendant\n");
    commitFixture(root, ["workflow-fix.txt"], "workflow fix descendant");
  }
  return { root, manifestPath, receiptPath, reaffirmationPath, runnerTemp, outputPath, copyPath, absoluteReceiptPath, evidenceCommit, bindingCommit, manifestBytes, descriptor };
}

function validReceiptFor(fixture, overrides = {}) {
  const receipt = {
    schemaVersion: "promotion-receipt.v2",
    result: "pass",
    manifest: { path: fixture.manifestPath, rawSha256: sha256(fixture.manifestBytes) },
    binding: { liveAllowed: false },
    lifecycle: { liveAllowed: false },
    worktreeProof: { executionCommit: fixture.bindingCommit }
  };
  return Object.assign(receipt, overrides);
}

async function runBootstrapResolver(fixture, { githubWorkspace = fixture.root } = {}) {
  const { workflow } = await loadWorkflow();
  const resolver = workflow.jobs["promotion-shadow-gate"].steps.find(
    (step) => step.name === "Resolve committed canonical Receipt execution commit"
  );
  assert.ok(resolver, "resolver step must exist");
  return spawnSync("bash", ["-c", resolver.run], {
    cwd: fixture.root,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_WORKSPACE: githubWorkspace,
      PROMOTION_CANONICAL_RECEIPT: fixture.receiptPath,
      PROMOTION_CANONICAL_RECEIPT_ABSOLUTE: fixture.absoluteReceiptPath,
      PROMOTION_MANIFEST: fixture.manifestPath,
      PROMOTION_CANONICAL_RECEIPT_COPY: fixture.copyPath,
      RUNNER_TEMP: fixture.runnerTemp,
      GITHUB_OUTPUT: fixture.outputPath
    }
  });
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
    manifest: `${selectorPrefix}/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/reaffirmations/runtime-policy-exact-delta-20260901/reaffirmations/u224-r10/promotion-manifest.v2.json`,
    receipt: `${selectorPrefix}/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/reaffirmations/runtime-policy-exact-delta-20260901/reaffirmations/u224-r10/promotion-shadow-receipt.v2.json`,
    receiptAbsolute: `${githubWorkspaceExpression}/${selectorPrefix}/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/reaffirmations/runtime-policy-exact-delta-20260901/reaffirmations/u224-r10/promotion-shadow-receipt.v2.json`,
    reaffirmation: `${selectorPrefix}/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830/reaffirmations/runtime-policy-exact-delta-20260901/reaffirmations/u224-r10/reaffirmation.v2.json`
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
  assert.match(pkg.scripts["test:promotion-gate"], /scripts\/promotion-required-check-semantic-rescope\.test\.mjs/u);
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
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push"]);
  assert.equal(workflow.on.pull_request, null);
  assert.deepEqual(workflow.on.push, { branches: ["main"] });
  assertRequiredWorkflowShape(workflow);
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
  assert.match(resolver.run, /execFileSync\("git", \["show", "--format=%H%x00%P%x00", "--raw", "-z", "--no-abbrev", "--no-renames", `\$\{evidenceCommit\}\.\.HEAD`\]/u);
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
  assert.match(final.run, /promotion-required-check-semantic-rescope-cli\.mjs" verify/u);
  assert.match(final.run, /"\$PROMOTION_REQUIRED_CHECK_DECISION"/u);
  assert.doesNotMatch(final.run, /Object\.entries\(outcomes\)/u);

  const gateRuns = [currentValidation.run, fresh.run, replay.run, verify.run].join("\n");
  assert.doesNotMatch(gateRuns, /promotion:(?:preview|deploy|live|promote-live)/u);
  assert.doesNotMatch(gateRuns, /\b(?:curl|wget|vercel|provider|database|promote-live)\b/iu);
});

test("Promotion Shadow resolver bootstraps from the committed Manifest binding when the canonical Receipt is absent", async () => {
  const fixture = await createBootstrapResolverFixture();
  try {
    const result = await runBootstrapResolver(fixture);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(await readFile(fixture.outputPath, "utf8"), `execution_commit=${fixture.bindingCommit}\n`);
    await assert.rejects(readFile(fixture.copyPath), { code: "ENOENT" });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Promotion Shadow resolver rejects a Receipt sibling merged beside its declared execution binding", async () => {
  const fixture = await createBootstrapResolverFixture({ includeDescendant: false });
  try {
    gitAt(fixture.root, ["branch", "receipt-sibling", fixture.evidenceCommit]);
    gitAt(fixture.root, ["checkout", "--quiet", "receipt-sibling"]);
    await mkdir(path.dirname(fixture.absoluteReceiptPath), { recursive: true });
    await writeFile(fixture.absoluteReceiptPath, `${JSON.stringify(validReceiptFor(fixture))}\n`);
    commitFixture(fixture.root, [fixture.receiptPath], "Receipt sibling");
    gitAt(fixture.root, ["checkout", "--quiet", "main"]);
    gitAt(fixture.root, ["merge", "--no-ff", "--no-edit", "receipt-sibling"]);
    const result = await runBootstrapResolver(fixture);
    assert.notEqual(result.status, 0, `Receipt sibling must not be accepted\n${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Promotion Shadow resolver rejects every non-canonical Manifest, descriptor, and Receipt history", async () => {
  const fixtures = [];
  const make = async (options) => {
    const fixture = await createBootstrapResolverFixture(options);
    fixtures.push(fixture);
    return fixture;
  };
  const assertRejected = async (fixture, label) => {
    const result = await runBootstrapResolver(fixture);
    assert.notEqual(result.status, 0, `${label} unexpectedly resolved\n${result.stdout}\n${result.stderr}`);
  };
  try {
    const bindingHead = await make({ includeDescendant: false });
    const bindingHeadResult = await runBootstrapResolver(bindingHead);
    assert.equal(bindingHeadResult.status, 0, `${bindingHeadResult.stdout}\n${bindingHeadResult.stderr}`);
    assert.equal(await readFile(bindingHead.outputPath, "utf8"), `execution_commit=${bindingHead.bindingCommit}\n`);

    await assertRejected(await make({ descriptorPatch: (descriptor) => { descriptor.baselineDelta.executionCommit = "a".repeat(40); } }), "nested descriptor execution self-authority");
    await assertRejected(await make({ intermediary: true }), "binding that is not the direct evidence child");
    await assertRejected(await make({ splitBinding: true }), "Manifest and descriptor introduced in different commits");
    await assertRejected(await make({ receiptAtBinding: true }), "Receipt added at the execution binding");

    const laterManifest = await make();
    await writeFile(path.join(laterManifest.root, laterManifest.manifestPath), "{\"schemaVersion\":\"promotion-manifest.v2\",\"gateId\":\"mutated\"}\n");
    commitFixture(laterManifest.root, [laterManifest.manifestPath], "later Manifest mutation");
    await assertRejected(laterManifest, "later Manifest mutation");

    const laterDescriptor = await make();
    await writeFile(path.join(laterDescriptor.root, laterDescriptor.reaffirmationPath), `${JSON.stringify(laterDescriptor.descriptor, null, 2)}\n `);
    commitFixture(laterDescriptor.root, [laterDescriptor.reaffirmationPath], "later descriptor mutation");
    await assertRejected(laterDescriptor, "later descriptor mutation");

    const readdedManifest = await make();
    gitAt(readdedManifest.root, ["rm", "--", readdedManifest.manifestPath]);
    gitAt(readdedManifest.root, ["commit", "--quiet", "-m", "delete Manifest"]);
    await writeFile(path.join(readdedManifest.root, readdedManifest.manifestPath), readdedManifest.manifestBytes);
    commitFixture(readdedManifest.root, [readdedManifest.manifestPath], "re-add Manifest");
    await assertRejected(readdedManifest, "delete and re-add Manifest");

    const storageReceipt = await make();
    await writeFile(storageReceipt.absoluteReceiptPath, `${JSON.stringify(validReceiptFor(storageReceipt))}\n`);
    commitFixture(storageReceipt.root, [storageReceipt.receiptPath], "store valid Receipt descendant");
    const storageResult = await runBootstrapResolver(storageReceipt);
    assert.equal(storageResult.status, 0, `${storageResult.stdout}\n${storageResult.stderr}`);
    assert.equal(await readFile(storageReceipt.outputPath, "utf8"), `execution_commit=${storageReceipt.bindingCommit}\n`);
    assert.deepEqual(await readFile(storageReceipt.copyPath), await readFile(storageReceipt.absoluteReceiptPath));

    for (const [label, mutate] of [
      ["wrong Receipt Manifest", (receipt) => { receipt.manifest.path = "coordination/integration/pilots/other/promotion-manifest.v2.json"; }],
      ["wrong Receipt execution", (receipt) => { receipt.worktreeProof.executionCommit = "f".repeat(40); }],
      ["live Receipt binding", (receipt) => { receipt.binding.liveAllowed = true; }]
    ]) {
      const fixture = await make();
      const receipt = validReceiptFor(fixture);
      mutate(receipt);
      await writeFile(fixture.absoluteReceiptPath, `${JSON.stringify(receipt)}\n`);
      commitFixture(fixture.root, [fixture.receiptPath], label);
      await assertRejected(fixture, label);
    }
  } finally {
    await Promise.all(fixtures.map((fixture) => rm(fixture.root, { recursive: true, force: true })));
  }
});

test("Promotion Shadow resolver bounds inputs and fails closed on Receipt drift, unsafe copies, workspace mismatch, and invalid raw paths", async () => {
  const fixtures = [];
  const makeReceiptFixture = async () => {
    const fixture = await createBootstrapResolverFixture();
    fixtures.push(fixture);
    await writeFile(fixture.absoluteReceiptPath, `${JSON.stringify(validReceiptFor(fixture))}\n`);
    commitFixture(fixture.root, [fixture.receiptPath], "valid Receipt descendant");
    return fixture;
  };
  const assertRejected = async (fixture, label, options) => {
    const result = await runBootstrapResolver(fixture, options);
    assert.notEqual(result.status, 0, `${label} unexpectedly resolved\n${result.stdout}\n${result.stderr}`);
    return result;
  };
  try {
    const valid = await makeReceiptFixture();
    const validResult = await runBootstrapResolver(valid);
    assert.equal(validResult.status, 0, `${validResult.stdout}\n${validResult.stderr}`);
    const copied = await lstat(valid.copyPath);
    assert.ok(copied.isFile() && !copied.isSymbolicLink());
    assert.equal(copied.nlink, 1);
    assert.equal(copied.mode & 0o777, 0o600);

    const mismatch = await createBootstrapResolverFixture();
    fixtures.push(mismatch);
    await assertRejected(mismatch, "mismatched GITHUB_WORKSPACE", { githubWorkspace: repoRoot });

    for (const [label, mutate] of [
      ["Receipt later mutation", async (fixture) => { await writeFile(fixture.absoluteReceiptPath, `${JSON.stringify(validReceiptFor(fixture))}\n `); commitFixture(fixture.root, [fixture.receiptPath], "Receipt mutation"); }],
      ["Receipt deletion", async (fixture) => { gitAt(fixture.root, ["rm", "--", fixture.receiptPath]); gitAt(fixture.root, ["commit", "--quiet", "-m", "Receipt deletion"]); }],
      ["Receipt delete and re-add", async (fixture) => { gitAt(fixture.root, ["rm", "--", fixture.receiptPath]); gitAt(fixture.root, ["commit", "--quiet", "-m", "Receipt deletion"]); await writeFile(fixture.absoluteReceiptPath, `${JSON.stringify(validReceiptFor(fixture))}\n`); commitFixture(fixture.root, [fixture.receiptPath], "Receipt re-add"); }]
    ]) {
      const fixture = await makeReceiptFixture();
      await mutate(fixture);
      await assertRejected(fixture, label);
    }

    const collision = await makeReceiptFixture();
    await writeFile(collision.copyPath, "collision\n", { mode: 0o600 });
    await assertRejected(collision, "canonical copy collision");
    assert.equal(await readFile(collision.copyPath, "utf8"), "collision\n");

    const linkCopy = await makeReceiptFixture();
    const linkTarget = path.join(linkCopy.root, "copy-target.json");
    await writeFile(linkTarget, "target\n");
    await symlink(linkTarget, linkCopy.copyPath);
    await assertRejected(linkCopy, "canonical copy symlink");

    const oversizedDescriptor = await createBootstrapResolverFixture();
    fixtures.push(oversizedDescriptor);
    await truncate(path.join(oversizedDescriptor.root, oversizedDescriptor.reaffirmationPath), (32 * 1024 * 1024) + 1);
    const descriptorResult = await assertRejected(oversizedDescriptor, "oversized descriptor");
    assert.match(descriptorResult.stderr, /bounded canonical regular file/u, "descriptor must fail before parsing its sparse body");

    const oversizedReceipt = await makeReceiptFixture();
    await truncate(oversizedReceipt.absoluteReceiptPath, (32 * 1024 * 1024) + 1);
    const receiptResult = await assertRejected(oversizedReceipt, "oversized Receipt");
    assert.match(receiptResult.stderr, /bounded canonical regular file/u, "Receipt must fail before readFileSync");

    const invalidPath = await createBootstrapResolverFixture();
    fixtures.push(invalidPath);
    const invalidUtf8Path = Buffer.concat([Buffer.from("unrelated-"), Buffer.from([0xff]), Buffer.from(".txt")]);
    const blob = spawnSync("git", ["hash-object", "-w", "--stdin"], { cwd: invalidPath.root, input: "invalid path\n", encoding: "utf8" });
    assert.equal(blob.status, 0, `${blob.stdout}\n${blob.stderr}`);
    const indexInfo = Buffer.concat([Buffer.from(`100644 ${blob.stdout.trim()}\t`), invalidUtf8Path, Buffer.from("\0")]);
    const index = spawnSync("git", ["update-index", "-z", "--index-info"], { cwd: invalidPath.root, input: indexInfo, encoding: "utf8" });
    assert.equal(index.status, 0, `${index.stdout}\n${index.stderr}`);
    gitAt(invalidPath.root, ["commit", "--quiet", "-m", "invalid UTF-8 unrelated path"]);
    await assertRejected(invalidPath, "invalid UTF-8 unrelated Git path");
  } finally {
    await Promise.all(fixtures.map((fixture) => rm(fixture.root, { recursive: true, force: true })));
  }
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

test("Promotion Shadow v2 final enforcement delegates complete evidence replay to the tracked verifier", async () => {
  const { workflow } = await loadWorkflow();
  const final = workflow.jobs["promotion-shadow-gate"].steps.find(
    (step) => step.name === "Enforce Promotion Shadow Gate outcome"
  );
  assert.ok(final);
  assert.match(final.run, /^set -euo pipefail$/mu);
  assert.match(final.run, /promotion-required-check-semantic-rescope-cli\.mjs" verify/u);
  for (const variable of [
    "GITHUB_WORKSPACE",
    "GITHUB_EVENT_NAME",
    "GITHUB_EVENT_PATH",
    "PROMOTION_MANIFEST",
    "PROMOTION_CANONICAL_RECEIPT",
    "PROMOTION_CURRENT_VALIDATION",
    "PROMOTION_FRESH_RECEIPT",
    "PROMOTION_REPLAY_RECEIPT",
    "PROMOTION_CANONICAL_RECEIPT_COPY",
    "PROMOTION_FRESH_VERIFICATION",
    "PROMOTION_REPLAY_VERIFICATION",
    "PROMOTION_CANONICAL_VERIFICATION",
    "PROMOTION_REQUIRED_CHECK_DECISION",
    "PROMOTION_ARTIFACT_ROOT"
  ]) {
    assert.match(final.run, new RegExp(`"\\$${variable}"`, "u"), variable);
  }
});

test("Promotion required-check semantic rescope is wired to exact checkout, artifacts, and final verification", async () => {
  const { workflow } = await loadWorkflow();
  const job = workflow.jobs["promotion-shadow-gate"];
  const stepByName = new Map(job.steps.map((step) => [step.name, step]));
  const checkout = stepByName.get("Check out repository");
  assert.equal(checkout.with?.ref, "${{ github.event.pull_request.head.sha || github.sha }}");

  const configure = stepByName.get("Configure isolated Promotion Shadow paths");
  assert.match(configure.run, /PROMOTION_REQUIRED_CHECK_DECISION/u);
  assert.match(configure.run, /promotion-required-check-decision\.v1\.json/u);

  const evaluate = stepByName.get("Evaluate current-head semantic required-check decision");
  assert.ok(evaluate);
  assert.equal(evaluate.if, "${{ always() }}");
  assert.match(evaluate.run, /promotion-required-check-semantic-rescope-cli\.mjs" evaluate/u);
  assert.match(evaluate.run, /"\$GITHUB_EVENT_NAME"/u);
  assert.match(evaluate.run, /"\$GITHUB_EVENT_PATH"/u);
  assert.match(evaluate.run, /"\$PROMOTION_REQUIRED_CHECK_DECISION"/u);
  assert.doesNotMatch(evaluate.run, /cd "\$PROMOTION_EXECUTION_WORKTREE"/u);

  const artifactSet = stepByName.get("Assert exact Promotion Shadow artifact set");
  assert.match(artifactSet.run, /promotion-required-check-decision\.v1\.json/u);
  assert.match(artifactSet.run, /"\$PROMOTION_REQUIRED_CHECK_DECISION"/u);

  const final = stepByName.get("Enforce Promotion Shadow Gate outcome");
  assert.match(final.run, /promotion-required-check-semantic-rescope-cli\.mjs" verify/u);
  assert.match(final.run, /"\$PROMOTION_REQUIRED_CHECK_DECISION"/u);
  assert.doesNotMatch(final.run, /Object\.entries\(outcomes\)/u);
});
