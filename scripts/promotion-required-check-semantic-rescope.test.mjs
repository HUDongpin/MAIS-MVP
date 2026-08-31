import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const subjectPath = path.join(repoRoot, "scripts", "promotion-required-check-semantic-rescope.mjs");

async function subject() {
  return import(pathToFileURL(subjectPath).href);
}

const sha = (digit) => digit.repeat(40);
const digest = (digit) => digit.repeat(64);
const bytesDigest = (bytes) => createHash("sha256").update(bytes).digest("hex");

function git(args, cwd) {
  const result = spawnSync("/usr/bin/git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

async function createGitDiffFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "promotion-semantic-git-"));
  git(["init", "--quiet", "--initial-branch=main"], root);
  await writeFile(path.join(root, "base.txt"), "base\n");
  git(["add", "--", "base.txt"], root);
  git(["-c", "user.name=Promotion Test", "-c", "user.email=promotion@example.invalid", "commit", "--quiet", "-m", "base"], root);
  const base = git(["rev-parse", "HEAD"], root);
  for (const filePath of ["space/a file.txt", "unicode/數學.txt", "quotes/'item'.txt", "newline/a\nb.txt"]) {
    await mkdir(path.dirname(path.join(root, filePath)), { recursive: true });
    await writeFile(path.join(root, filePath), "changed\n");
  }
  await writeFile(path.join(root, "base.txt"), "changed\n");
  git(["add", "--", "base.txt", "space/a file.txt", "unicode/數學.txt", "quotes/'item'.txt", "newline/a\nb.txt"], root);
  git(["-c", "user.name=Promotion Test", "-c", "user.email=promotion@example.invalid", "commit", "--quiet", "-m", "head"], root);
  return { root, base, head: git(["rev-parse", "HEAD"], root) };
}

function passingInput(overrides = {}) {
  return {
    github: {
      eventName: "pull_request",
      pullRequest: { number: 220, base: { sha: sha("a") }, head: { sha: sha("b") } },
      eventBytes: JSON.stringify({ number: 220, base: { sha: sha("a") }, head: { sha: sha("b") } }),
      checkoutHead: sha("b"),
      diff: {
        complete: true, shallow: false, base: sha("a"), head: sha("b"), ancestor: true,
        command: "git diff --name-only -z <base> <head> --", rawNul: ""
      }
    },
    currentValidation: {
      result: "blocked",
      schemaVersion: "promotion-validation-result.v2",
      code: "V2_TARGET_BASELINE_DRIFT",
      liveAllowed: false
    },
    canonicalIntegrity: {
      manifest: { path: "coordination/integration/promotion-manifest.v2.json", bytes: '{"kind":"manifest"}\n', rawSha256: bytesDigest('{"kind":"manifest"}\n') },
      receipt: { path: "coordination/integration/promotion-receipt.v2.json", bytes: '{"kind":"receipt"}\n', rawSha256: bytesDigest('{"kind":"receipt"}\n') },
      checker: { path: "scripts/promotion-gate-checker.mjs", bytes: '{"kind":"checker"}\n', rawSha256: bytesDigest('{"kind":"checker"}\n') },
      evidence: { path: "coordination/integration/evidence-index.v2.json", bytes: '{"kind":"evidence"}\n', rawSha256: bytesDigest('{"kind":"evidence"}\n') },
      registry: { path: "coordination/integration/registry.v2.json", bytes: '{"kind":"registry"}\n', rawSha256: bytesDigest('{"kind":"registry"}\n') },
      candidate: { path: "coordination/content-qa/candidate/package.v2.json", bytes: '{"kind":"candidate"}\n', rawSha256: bytesDigest('{"kind":"candidate"}\n') },
      approval: { path: "coordination/integration/approval.v2.json", bytes: '{"kind":"approval"}\n', rawSha256: bytesDigest('{"kind":"approval"}\n') },
      replay: { result: "pass", digest: digest("8") },
      verification: { result: "pass", digest: digest("9") },
      liveAllowed: false
    },
    semantic: {
      result: "pass",
      exactHead: sha("b"),
      scanAvailable: true,
      nonliteralNextDynamic: 0,
      zeroBaselineLoaders: 0,
      selectedCandidateReachable: false,
      legacyCandidateReachable: false,
      approvedProjectionDrift: false,
      canonicalConflictDrift: false,
      alternateEntrypoints: 0,
      unknownClassifications: 0
    },
    graph: { digest: digest("c"), targetDrift: true },
    ...overrides
  };
}

test("1. exact GitHub pull-request event, base SHA, and head SHA bind the decision", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope, parseStrictGithubEventJson } = await subject();
  assert.deepEqual(
    parseStrictGithubEventJson(Buffer.from(JSON.stringify(passingInput().github.pullRequest))),
    passingInput().github.pullRequest
  );
  assert.throws(() => parseStrictGithubEventJson(Buffer.from('{"number":220,"number":221}')));
  const pass = evaluatePromotionRequiredCheckSemanticRescope(passingInput());
  assert.equal(pass.result, "pass");
  assert.equal(pass.binding.pullRequestNumber, 220);
  assert.equal(pass.binding.headCommit, sha("b"));
  const bad = evaluatePromotionRequiredCheckSemanticRescope(passingInput({ github: { ...passingInput().github, checkoutHead: sha("c") } }));
  assert.equal(bad.result, "blocked");
  assert.equal(bad.code, "GITHUB_HEAD_BINDING_INVALID");
});

test("2. missing, shallow, non-ancestor, truncated, and inconsistent GitHub diff evidence fail closed", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope } = await subject();
  for (const diff of [
    null,
    { complete: false, shallow: false, base: sha("a"), head: sha("b"), ancestor: true, command: "git diff --name-only -z <base> <head> --", rawNul: "" },
    { complete: true, shallow: true, base: sha("a"), head: sha("b"), ancestor: true, command: "git diff --name-only -z <base> <head> --", rawNul: "" },
    { complete: true, shallow: false, base: sha("a"), head: sha("b"), ancestor: false, command: "git diff --name-only -z <base> <head> --", rawNul: "" },
    { complete: true, shallow: false, base: sha("c"), head: sha("b"), ancestor: true, command: "git diff --name-only -z <base> <head> --", rawNul: "" },
    { complete: true, shallow: false, base: sha("a"), head: sha("c"), ancestor: true, command: "git diff --name-only -z <base> <head> --", rawNul: "" }
  ]) {
    const input = passingInput();
    input.github.diff = diff;
    const result = evaluatePromotionRequiredCheckSemanticRescope(input);
    assert.equal(result.result, "blocked");
    assert.match(result.code, /^GITHUB_DIFF_/u);
  }
});

test("3. NUL-safe changed paths preserve spaces, Unicode, quotes, and newlines while rejecting unsafe or duplicate values", async () => {
  const { normalizePromotionChangedPaths } = await subject();
  const accepted = normalizePromotionChangedPaths("a space/file.mjs\0unicode/數學.json\0quotes/'x'.mjs\0newline/a\nb.mjs\0");
  assert.deepEqual(accepted, ["a space/file.mjs", "newline/a\nb.mjs", "quotes/'x'.mjs", "unicode/數學.json"]);
  for (const value of ["dup/a.mjs", "dup/a.mjs", "../escape", "a\\b", "/absolute", "unterminated"]) {
    const values = value === "dup/a.mjs" ? `${value}\0${value}\0` : value === "unterminated" ? value : `${value}\0`;
    assert.throws(() => normalizePromotionChangedPaths(values));
  }
});

test("4. static and artifact bindings form a deterministic canonical path union", async () => {
  const { buildPromotionControlledPathUnion } = await subject();
  const first = buildPromotionControlledPathUnion(passingInput().canonicalIntegrity);
  const second = buildPromotionControlledPathUnion(passingInput().canonicalIntegrity);
  assert.deepEqual(first, second);
  assert.ok(first.includes(".github/workflows/promotion-shadow.yml"));
  assert.ok(first.includes("coordination/content-qa/candidate/package.v2.json"));
  assert.ok(first.includes("scripts/promotion-gate-checker.mjs"));
});

test("5. promotion-controlled changes combined with target or graph drift are blocked for full validation", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope } = await subject();
  const input = passingInput();
  input.github.diff.rawNul = "scripts/promotion-gate-checker.mjs\0";
  const result = evaluatePromotionRequiredCheckSemanticRescope(input);
  assert.equal(result.result, "blocked");
  assert.equal(result.code, "PROMOTION_CONTROLLED_GRAPH_DRIFT_FULL_VALIDATION_REQUIRED");
});

test("6. no promotion-controlled path change still blocks every semantic failure", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope } = await subject();
  const input = passingInput({ semantic: { ...passingInput().semantic, unknownClassifications: 1 } });
  const result = evaluatePromotionRequiredCheckSemanticRescope(input);
  assert.equal(result.result, "blocked");
  assert.equal(result.code, "SEMANTIC_RUNTIME_SAFETY_FAILED");
});

test("7. an unchanged promotion scope and semantic pass get only the explicit non-live historical-pilot code", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope } = await subject();
  const result = evaluatePromotionRequiredCheckSemanticRescope(passingInput());
  assert.equal(result.result, "pass");
  assert.equal(result.code, "historical_pilot_intact_semantic_runtime_safe");
  assert.equal(result.liveAllowed, false);
});

test("8. an unavailable or internally failed semantic scan blocks", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope } = await subject();
  for (const semantic of [
    { ...passingInput().semantic, scanAvailable: false },
    { ...passingInput().semantic, result: "internal" }
  ]) {
    const result = evaluatePromotionRequiredCheckSemanticRescope(passingInput({ semantic }));
    assert.equal(result.result, "blocked");
    assert.equal(result.code, "SEMANTIC_RUNTIME_SCAN_UNAVAILABLE");
  }
});

test("9. semantic safety is bound to the pull-request head, never a historical execution alone", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope } = await subject();
  const result = evaluatePromotionRequiredCheckSemanticRescope(passingInput({ semantic: { ...passingInput().semantic, exactHead: sha("d") } }));
  assert.equal(result.result, "blocked");
  assert.equal(result.code, "SEMANTIC_HEAD_BINDING_INVALID");
});

test("10. exact PR #220 fixture preserves the 34-runtime/4-test graph digest evidence", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope } = await subject();
  const input = passingInput({
    graph: {
      digest: digest("c"), targetDrift: true,
      runtimePathCount: 34,
      testOnlyPathCount: 4,
      runtimeDigest: "5fc6fcc9d6c13c4ebee4858ae91877e9a1e31f27322df56f6954d0f4bb2cc5d8",
      testDigest: "fbca4125ea52c447a1961319d6b3207da9d4a4f4e2d713a96aa9326bf700a604"
    }
  });
  const result = evaluatePromotionRequiredCheckSemanticRescope(input);
  assert.equal(result.result, "pass");
  assert.equal(result.graph.runtimePathCount, 34);
  assert.equal(result.graph.testOnlyPathCount, 4);
  assert.equal(result.graph.runtimeDigest, "5fc6fcc9d6c13c4ebee4858ae91877e9a1e31f27322df56f6954d0f4bb2cc5d8");
});

test("11. enforcement decisions use strict JSON, deterministic digests, event binding, and replay equivalence", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope, parseStrictDecisionJson } = await subject();
  const first = evaluatePromotionRequiredCheckSemanticRescope(passingInput());
  const second = evaluatePromotionRequiredCheckSemanticRescope(passingInput());
  assert.equal(first.decisionDigest, second.decisionDigest);
  assert.deepEqual(parseStrictDecisionJson(Buffer.from(JSON.stringify(first))), first);
  assert.throws(() => parseStrictDecisionJson(Buffer.from('{"x":1,"x":2}')));
  const drifted = passingInput();
  drifted.canonicalIntegrity.receipt.rawSha256 = digest("f");
  assert.equal(evaluatePromotionRequiredCheckSemanticRescope(drifted).code, "CANONICAL_BYTE_DRIFT");
});

test("12. final workflow enforcement accepts only canonical semantic non-live proof", async () => {
  const { canEnforcePromotionRequiredCheckSuccess, evaluatePromotionRequiredCheckSemanticRescope } = await subject();
  const input = passingInput();
  assert.equal(canEnforcePromotionRequiredCheckSuccess(evaluatePromotionRequiredCheckSemanticRescope(input), input), true);
  assert.equal(canEnforcePromotionRequiredCheckSuccess(evaluatePromotionRequiredCheckSemanticRescope(input)), false);
  assert.equal(canEnforcePromotionRequiredCheckSuccess({ result: "pass", code: "historical_pilot_intact_semantic_runtime_safe", liveAllowed: true }, input), false);
});

test("13. graph drift is artifacted and routed to A23/A25 review", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope } = await subject();
  const result = evaluatePromotionRequiredCheckSemanticRescope(passingInput());
  assert.equal(result.graph.digest, digest("c"));
  assert.deepEqual(result.reviewQueue, ["A23", "A25"]);
});

test("14. required workflow has neither paths filters nor a workflow_dispatch trigger or skipped required job", async () => {
  const { assertRequiredWorkflowShape } = await subject();
  assert.doesNotThrow(() => assertRequiredWorkflowShape({ on: { pull_request: {}, push: { branches: ["main"] } }, jobs: { "promotion-shadow-gate": { name: "promotion-shadow-gate" } } }));
  for (const workflow of [
    { on: { pull_request: { paths: ["scripts/**"] } }, jobs: { "promotion-shadow-gate": { name: "promotion-shadow-gate" } } },
    { on: { pull_request: {}, workflow_dispatch: {} }, jobs: { "promotion-shadow-gate": { name: "promotion-shadow-gate" } } },
    { on: { pull_request: {} }, jobs: { "promotion-shadow-gate": { name: "promotion-shadow-gate", if: "false" } } }
  ]) assert.throws(() => assertRequiredWorkflowShape(workflow));
});

test("15. package, lockfile, workflow, checker, manifest, receipt, candidate, evidence, registry, and approval changes force full validation", async () => {
  const { isPromotionControlledPath } = await subject();
  for (const filePath of [
    "package.json", "package-lock.json", ".github/workflows/promotion-shadow.yml", "scripts/promotion-check.mjs",
    "coordination/integration/promotion-manifest.v2.json", "coordination/integration/promotion-receipt.v2.json",
    "coordination/content-qa/candidate/package.v2.json", "coordination/integration/evidence-index.v2.json",
    "coordination/integration/registry.v2.json", "coordination/integration/approval.v2.json"
  ]) assert.equal(isPromotionControlledPath(filePath, passingInput().canonicalIntegrity), true, filePath);
});

test("16. push-main before/after uses the same NUL proof and a controlled path forces full validation even without graph drift", async () => {
  const { evaluatePromotionRequiredCheckSemanticRescope } = await subject();
  const input = passingInput({
    github: {
      eventName: "push", ref: "refs/heads/main", before: sha("a"), after: sha("b"), checkoutHead: sha("b"),
      eventBytes: JSON.stringify({ before: sha("a"), after: sha("b"), ref: "refs/heads/main" }),
      diff: {
        complete: true, shallow: false, base: sha("a"), head: sha("b"), ancestor: true,
        command: "git diff --name-only -z <base> <head> --", rawNul: "package-lock.json\0"
      }
    },
    graph: { digest: digest("c"), targetDrift: false }
  });
  const result = evaluatePromotionRequiredCheckSemanticRescope(input);
  assert.equal(result.result, "blocked");
  assert.equal(result.code, "PROMOTION_CONTROLLED_FULL_VALIDATION_REQUIRED");
  assert.equal(result.binding.eventName, "push");
});

test("17. authoritative GitHub PR and push evidence is collected from exact checkout Git bytes", async () => {
  const { collectGithubDiffEvidence } = await subject();
  const fixture = await createGitDiffFixture();
  try {
    const prPayload = Buffer.from(JSON.stringify({
      number: 220,
      pull_request: { base: { sha: fixture.base }, head: { sha: fixture.head } },
      ignored: { safely: "ignored" }
    }));
    const pullRequest = await collectGithubDiffEvidence({ repoRoot: fixture.root, eventName: "pull_request", eventBytes: prPayload });
    assert.equal(pullRequest.eventName, "pull_request");
    assert.equal(pullRequest.base, fixture.base);
    assert.equal(pullRequest.head, fixture.head);
    assert.equal(pullRequest.checkoutHead, fixture.head);
    assert.deepEqual(pullRequest.paths, ["base.txt", "newline/a\nb.txt", "quotes/'item'.txt", "space/a file.txt", "unicode/數學.txt"]);
    assert.ok(Buffer.isBuffer(pullRequest.diffBytes));

    const push = await collectGithubDiffEvidence({
      repoRoot: fixture.root,
      eventName: "push",
      eventBytes: Buffer.from(JSON.stringify({ before: fixture.base, after: fixture.head, ref: "refs/heads/main", ignored: true }))
    });
    assert.equal(push.eventName, "push");
    assert.equal(push.head, fixture.head);
    assert.deepEqual(push.paths, pullRequest.paths);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("18. collector fails closed for checkout mismatch, shallow/non-ancestor evidence, or unsafe NUL paths", async () => {
  const { collectGithubDiffEvidence } = await subject();
  const fixture = await createGitDiffFixture();
  const eventBytes = Buffer.from(JSON.stringify({ number: 220, pull_request: { base: { sha: fixture.base }, head: { sha: fixture.head } } }));
  const failureRunner = async ({ args }) => {
    const text = args.join(" ");
    if (text === "rev-parse HEAD") return Buffer.from(`${fixture.base}\n`);
    if (text === "rev-parse --is-shallow-repository") return Buffer.from("false\n");
    return Buffer.from("");
  };
  try {
    await assert.rejects(
      collectGithubDiffEvidence({ repoRoot: fixture.root, eventName: "pull_request", eventBytes, _gitRunner: failureRunner }),
      /GITHUB_HEAD_BINDING_INVALID/u
    );
    for (const rawNul of ["duplicate.txt\0duplicate.txt\0", "../escape\0", "a\\b\0"]) {
      const runner = async ({ args }) => {
        const text = args.join(" ");
        if (text === "rev-parse HEAD") return Buffer.from(`${fixture.head}\n`);
        if (text === "rev-parse --is-shallow-repository") return Buffer.from("false\n");
        if (text.startsWith("cat-file")) return Buffer.alloc(0);
        if (text.startsWith("merge-base")) return Buffer.alloc(0);
        if (text.startsWith("diff ") || text.startsWith("diff-tree ")) return Buffer.from(rawNul);
        throw new Error(`unexpected git argv: ${text}`);
      };
      await assert.rejects(
        collectGithubDiffEvidence({ repoRoot: fixture.root, eventName: "pull_request", eventBytes, _gitRunner: runner }),
        /GITHUB_DIFF_PATHS_INVALID|PROMOTION_PATH_INVALID/u
      );
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("19. collector assigns stable failures to shallow, missing-commit, non-ancestor, inconsistent, and invalid-UTF8 evidence", async () => {
  const { collectGithubDiffEvidence } = await subject();
  const base = sha("a");
  const head = sha("b");
  const eventBytes = Buffer.from(JSON.stringify({
    number: 220,
    pull_request: { base: { sha: base }, head: { sha: head } }
  }));
  const responseRunner = ({
    shallow = "false\n",
    missingCommit = false,
    nonAncestor = false,
    diffBytes = Buffer.from("safe/path.ts\0"),
    treeBytes = diffBytes
  } = {}) => async ({ args }) => {
    const command = args.join(" ");
    if (command === "rev-parse HEAD") return Buffer.from(`${head}\n`);
    if (command === "rev-parse --is-shallow-repository") return Buffer.from(shallow);
    if (command.startsWith("cat-file")) {
      if (missingCommit) throw new Error("simulated missing commit");
      return Buffer.alloc(0);
    }
    if (command.startsWith("merge-base")) {
      if (nonAncestor) throw new Error("simulated non-ancestor");
      return Buffer.alloc(0);
    }
    if (command.startsWith("diff ")) return diffBytes;
    if (command.startsWith("diff-tree ")) return treeBytes;
    throw new Error(`unexpected git command: ${command}`);
  };

  await assert.rejects(
    collectGithubDiffEvidence({
      repoRoot,
      eventName: "pull_request",
      eventBytes,
      _gitRunner: responseRunner({ shallow: "true\n" })
    }),
    /GITHUB_DIFF_TRUNCATED/u
  );
  await assert.rejects(
    collectGithubDiffEvidence({
      repoRoot,
      eventName: "pull_request",
      eventBytes,
      _gitRunner: responseRunner({ missingCommit: true })
    }),
    /GITHUB_DIFF_COMMIT_UNAVAILABLE/u
  );
  await assert.rejects(
    collectGithubDiffEvidence({
      repoRoot,
      eventName: "pull_request",
      eventBytes,
      _gitRunner: responseRunner({ nonAncestor: true })
    }),
    /GITHUB_DIFF_ANCESTRY_INVALID/u
  );
  await assert.rejects(
    collectGithubDiffEvidence({
      repoRoot,
      eventName: "pull_request",
      eventBytes,
      _gitRunner: responseRunner({ treeBytes: Buffer.from("different/path.ts\0") })
    }),
    /GITHUB_DIFF_INCONSISTENT/u
  );
  await assert.rejects(
    collectGithubDiffEvidence({
      repoRoot,
      eventName: "pull_request",
      eventBytes,
      _gitRunner: responseRunner({ diffBytes: Buffer.from([0xff, 0x00]) })
    }),
    /GITHUB_DIFF_PATHS_INVALID/u
  );
});

test("20. authoritative JSON must be a strict regular tracked file whose bytes equal HEAD", async () => {
  const { readTrackedStrictJsonAuthority } = await subject();
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "promotion-semantic-authority-"));
  try {
    git(["init", "--quiet", "--initial-branch=main"], fixtureRoot);
    const original = '{"schemaVersion":"authority-fixture.v1","binding":{"path":"data/value.json"}}\n';
    await writeFile(path.join(fixtureRoot, "authority.json"), original);
    git(["add", "--", "authority.json"], fixtureRoot);
    git(["-c", "user.name=Promotion Test", "-c", "user.email=promotion@example.invalid", "commit", "--quiet", "-m", "authority"], fixtureRoot);

    const loaded = await readTrackedStrictJsonAuthority({ repoRoot: fixtureRoot, filePath: "authority.json" });
    assert.equal(loaded.value.schemaVersion, "authority-fixture.v1");
    assert.equal(loaded.rawSha256, bytesDigest(original));
    assert.equal(loaded.mode, "100644");

    await writeFile(path.join(fixtureRoot, "authority.json"), '{"schemaVersion":"drifted"}\n');
    await assert.rejects(
      readTrackedStrictJsonAuthority({ repoRoot: fixtureRoot, filePath: "authority.json" }),
      /PROMOTION_AUTHORITY_HEAD_DRIFT/u
    );

    await writeFile(path.join(fixtureRoot, "authority.json"), '{"schemaVersion":"duplicate","schemaVersion":"duplicate"}\n');
    git(["add", "--", "authority.json"], fixtureRoot);
    git(["-c", "user.name=Promotion Test", "-c", "user.email=promotion@example.invalid", "commit", "--quiet", "-m", "duplicate"], fixtureRoot);
    await assert.rejects(
      readTrackedStrictJsonAuthority({ repoRoot: fixtureRoot, filePath: "authority.json" }),
      (error) => error?.code === "PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY"
    );

    await writeFile(path.join(fixtureRoot, "target.json"), '{"schemaVersion":"target"}\n');
    await symlink("target.json", path.join(fixtureRoot, "linked.json"));
    git(["add", "--", "target.json", "linked.json"], fixtureRoot);
    git(["-c", "user.name=Promotion Test", "-c", "user.email=promotion@example.invalid", "commit", "--quiet", "-m", "symlink"], fixtureRoot);
    await assert.rejects(
      readTrackedStrictJsonAuthority({ repoRoot: fixtureRoot, filePath: "linked.json" }),
      (error) => new Set(["AUTHORITATIVE_PATH_UNSAFE", "PROMOTION_AUTHORITY_INVALID"]).has(error?.code)
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

function semanticNativeFixture({ head = sha("b"), clean = true, semanticFailure = null } = {}) {
  const expectedRuntimePolicy = { edgeCount: 10, edgeDigest: digest("1") };
  const observedRuntimePolicy = { edgeCount: 11, edgeDigest: digest("2") };
  const manifest = {
    targetBaselineCommit: sha("a"),
    liveReachability: {
      compatibilityManifestPath: "coordination/integration/compatibility.json",
      compatibilityManifestRawSha256: digest("3"),
      expectedRuntimePolicy
    }
  };
  const baselineError = Object.assign(new Error("baseline drift"), {
    code: "V2_TARGET_BASELINE_DRIFT",
    outcome: "blocked",
    details: {
      changedPathCount: 34,
      changedPathsDigest: "5fc6fcc9d6c13c4ebee4858ae91877e9a1e31f27322df56f6954d0f4bb2cc5d8",
      allowedTestOnlyPathCount: 4,
      allowedTestOnlyPathsDigest: "fbca4125ea52c447a1961319d6b3207da9d4a4f4e2d713a96aa9326bf700a604"
    }
  });
  const calls = [];
  const native = {
    loadV2Manifest: async () => ({ manifest, loaded: { rawSha256: digest("4") } }),
    collectV2GitWorktreeProof: async () => ({ clean, headCommit: head, statusDigest: digest("5") }),
    loadV2Candidate: async () => ({ candidateDigest: digest("6"), records: [] }),
    collectV2ProvenanceProof: async () => ({ schemaVersion: "provenance" }),
    collectV2BaselineProof: async () => { throw baselineError; },
    collectV2CheckerReleaseProof: async () => ({ bundleDigest: digest("7") }),
    loadV2Evidence: async () => ({ evidenceByRole: new Map(), proof: { bindingsDigest: digest("8") } }),
    validateV2ContentSemantics: () => ({ schemaVersion: "content" }),
    collectV2ExternalSideEffectProof: async () => ({
      digest: digest("9"),
      networkRequestCount: 0,
      providerCallCount: 0,
      databaseWriteCount: 0,
      deploymentCommandCount: 0,
      productionWriteCount: 0,
      liveRegistryWriteCount: 0
    }),
    readTrackedStrictJsonAuthority: async ({ filePath }) => filePath.endsWith("promotion-manifest.v2.json")
      ? { path: filePath, rawSha256: digest("4"), value: manifest }
      : { path: filePath, rawSha256: digest("3"), value: { schemaVersion: "compatibility" } },
    observeCanonicalRuntimePolicy: async () => ({ schemaVersion: "observation" }),
    projectV2RuntimePolicy: () => observedRuntimePolicy,
    collectV2RuntimeAndLegacyProof: async (_repoRoot, semanticManifest, exactHead) => {
      calls.push({ semanticManifest, exactHead });
      if (semanticFailure) throw semanticFailure;
      return {
        runtimePolicy: observedRuntimePolicy,
        canonicalAudit: { auditDigest: digest("a") },
        proof: {
          runtimePolicyDigest: digest("b"),
          resolutionCount: 18,
          approvedProjectionCount: 3,
          dereachedCount: 15,
          resolutionProofsDigest: digest("c"),
          selectedIdentityHits: 0,
          liveAllowed: false
        }
      };
    },
    fingerprint: (value) => bytesDigest(JSON.stringify(value))
  };
  return { native, manifest, expectedRuntimePolicy, observedRuntimePolicy, calls };
}

test("21. current-head semantic proof runs native safety after separating frozen graph equality", async () => {
  const { collectCurrentHeadSemanticProof } = await subject();
  const fixture = semanticNativeFixture();
  const proof = await collectCurrentHeadSemanticProof({
    repoRoot,
    manifestPath: "coordination/integration/promotion-manifest.v2.json",
    exactHead: sha("b"),
    _native: fixture.native
  });
  assert.equal(proof.result, "pass");
  assert.equal(proof.exactHead, sha("b"));
  assert.equal(proof.liveAllowed, false);
  assert.equal(proof.integrationAllowed, false);
  assert.equal(proof.previewAllowed, false);
  assert.equal(proof.deployAllowed, false);
  assert.equal(proof.baseline.targetDrift, true);
  assert.equal(proof.baseline.runtimeChangedPathCount, 34);
  assert.equal(proof.graph.drift, true);
  assert.equal(proof.graph.expected.edgeCount, 10);
  assert.equal(proof.graph.observed.edgeCount, 11);
  assert.equal(proof.semantic.selectedIdentityHits, 0);
  assert.deepEqual(fixture.manifest.liveReachability.expectedRuntimePolicy, fixture.expectedRuntimePolicy);
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].exactHead, sha("b"));
  assert.deepEqual(fixture.calls[0].semanticManifest.liveReachability.expectedRuntimePolicy, fixture.observedRuntimePolicy);
});

test("22. graph drift never masks current-head semantic failure", async () => {
  const { collectCurrentHeadSemanticProof } = await subject();
  const semanticFailure = Object.assign(new Error("candidate reachable"), {
    code: "V2_SELECTED_CANDIDATE_LIVE_REACHABLE",
    outcome: "fail"
  });
  const fixture = semanticNativeFixture({ semanticFailure });
  await assert.rejects(
    collectCurrentHeadSemanticProof({
      repoRoot,
      manifestPath: "coordination/integration/promotion-manifest.v2.json",
      exactHead: sha("b"),
      _native: fixture.native
    }),
    (error) => error?.code === "V2_SELECTED_CANDIDATE_LIVE_REACHABLE"
  );
});

test("23. current-head semantic proof rejects dirty or wrong-head execution", async () => {
  const { collectCurrentHeadSemanticProof } = await subject();
  for (const options of [{ clean: false }, { head: sha("c") }]) {
    const fixture = semanticNativeFixture(options);
    await assert.rejects(
      collectCurrentHeadSemanticProof({
        repoRoot,
        manifestPath: "coordination/integration/promotion-manifest.v2.json",
        exactHead: sha("b"),
        _native: fixture.native
      }),
      /SEMANTIC_WORKTREE_(?:DIRTY|HEAD_MISMATCH)/u
    );
  }
});

async function createAuthorityGraphFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "promotion-semantic-authority-graph-"));
  git(["init", "--quiet", "--initial-branch=main"], root);
  const documents = new Map([
    ["coordination/content-qa/active-candidate/candidate.json", '{"records":[{"path":"coordination/content-qa/active-candidate/artifact.json"},{"path":"coordination/content-qa/active-candidate/large.json"}]}\n'],
    ["coordination/content-qa/active-candidate/artifact.json", '{"kind":"candidate-artifact"}\n'],
    ["coordination/content-qa/active-candidate/large.json", `${JSON.stringify({ padding: "x".repeat(5 * 1024 * 1024) })}\n`],
    ["coordination/integration/evidence-index.json", '{"entries":[{"evidencePath":"coordination/integration/evidence/a11.json"}]}\n'],
    ["coordination/integration/evidence/a11.json", '{"result":"pass"}\n'],
    ["coordination/integration/compatibility.json", '{"schemaVersion":"compatibility"}\n'],
    ["coordination/integration/legacy-candidate.json", '{"kind":"legacy"}\n'],
    ["data/live-projection.json", '{"kind":"projection"}\n'],
    ["coordination/integration/checker-schema.json", '{"type":"object"}\n'],
    ["coordination/integration/approval.md", "approved non-live only\n"],
    ["scripts/checker.mjs", "export const checker = true;\n"]
  ]);
  const registry = {
    resolutions: [{
      candidate: {
        path: "coordination/integration/legacy-candidate.json",
        rawSha256: bytesDigest(documents.get("coordination/integration/legacy-candidate.json"))
      },
      liveProjection: {
        path: "data/live-projection.json",
        rawSha256: bytesDigest(documents.get("data/live-projection.json"))
      },
      approvalReferences: [{
        path: "coordination/integration/approval.md",
        rawSha256: bytesDigest(documents.get("coordination/integration/approval.md"))
      }]
    }]
  };
  documents.set("coordination/integration/registry.json", `${JSON.stringify(registry)}\n`);
  const ledger = {
    entries: [{
      version: "checker-v1",
      bundlePaths: ["scripts/checker.mjs", "coordination/integration/checker-schema.json"]
    }]
  };
  documents.set("coordination/integration/checker-ledger.json", `${JSON.stringify(ledger)}\n`);
  const manifestPath = "coordination/integration/manifest.json";
  const receiptPath = "coordination/integration/receipt.json";
  const manifest = {
    schemaVersion: "promotion-manifest.v2",
    checkerVersion: "checker-v1",
    candidatePackage: {
      path: "coordination/content-qa/active-candidate/candidate.json",
      rawSha256: bytesDigest(documents.get("coordination/content-qa/active-candidate/candidate.json"))
    },
    candidateArtifacts: [
      {
        path: "coordination/content-qa/active-candidate/artifact.json",
        rawFileSha256: bytesDigest(documents.get("coordination/content-qa/active-candidate/artifact.json"))
      },
      {
        path: "coordination/content-qa/active-candidate/large.json",
        rawFileSha256: bytesDigest(documents.get("coordination/content-qa/active-candidate/large.json"))
      }
    ],
    checkerRelease: {
      ledgerPath: "coordination/integration/checker-ledger.json",
      ledgerRawSha256: bytesDigest(documents.get("coordination/integration/checker-ledger.json")),
      version: "checker-v1"
    },
    evidenceIndex: {
      path: "coordination/integration/evidence-index.json",
      rawSha256: bytesDigest(documents.get("coordination/integration/evidence-index.json"))
    },
    evidenceBindings: [{
      evidencePath: "coordination/integration/evidence/a11.json",
      rawSha256: bytesDigest(documents.get("coordination/integration/evidence/a11.json"))
    }],
    legacyResolution: {
      registryPath: "coordination/integration/registry.json",
      rawSha256: bytesDigest(documents.get("coordination/integration/registry.json"))
    },
    liveReachability: {
      compatibilityManifestPath: "coordination/integration/compatibility.json",
      compatibilityManifestRawSha256: bytesDigest(documents.get("coordination/integration/compatibility.json"))
    }
  };
  documents.set(manifestPath, `${JSON.stringify(manifest)}\n`);
  const receipt = {
    manifest: { path: manifestPath },
    candidateSourceProof: { paths: [manifest.candidatePackage.path, manifest.candidateArtifacts[0].path] },
    evidenceProof: { bindings: [{ evidencePath: manifest.evidenceBindings[0].evidencePath }] },
    checkerReleaseProof: { sourceBindings: [{ path: "scripts/checker.mjs" }] },
    runtimeAndLegacyProof: {
      resolutionProofs: [{
        candidatePath: registry.resolutions[0].candidate.path,
        liveProjection: { path: registry.resolutions[0].liveProjection.path }
      }]
    }
  };
  documents.set(receiptPath, `${JSON.stringify(receipt)}\n`);
  for (const [filePath, bytes] of documents) {
    await mkdir(path.dirname(path.join(root, filePath)), { recursive: true });
    await writeFile(path.join(root, filePath), bytes);
  }
  git(["add", "--", ...documents.keys()], root);
  git(["-c", "user.name=Promotion Test", "-c", "user.email=promotion@example.invalid", "commit", "--quiet", "-m", "authority graph"], root);
  return { root, manifestPath, receiptPath, manifest, documents };
}

test("24. tracked authority graph deterministically unions manifest, receipt, checker, evidence, registry, candidate, and approval paths", async () => {
  const { collectTrackedPromotionAuthorities } = await subject();
  const fixture = await createAuthorityGraphFixture();
  try {
    const first = await collectTrackedPromotionAuthorities({
      repoRoot: fixture.root,
      manifestPath: fixture.manifestPath,
      canonicalReceiptPath: fixture.receiptPath
    });
    const second = await collectTrackedPromotionAuthorities({
      repoRoot: fixture.root,
      manifestPath: fixture.manifestPath,
      canonicalReceiptPath: fixture.receiptPath
    });
    assert.deepEqual(first, second);
    assert.equal(first.candidateRoot, "coordination/content-qa/active-candidate");
    for (const filePath of [
      fixture.manifestPath,
      fixture.receiptPath,
      "coordination/integration/checker-ledger.json",
      "scripts/checker.mjs",
      "coordination/integration/checker-schema.json",
      "coordination/integration/evidence-index.json",
      "coordination/integration/evidence/a11.json",
      "coordination/integration/registry.json",
      "coordination/content-qa/active-candidate/candidate.json",
      "coordination/content-qa/active-candidate/artifact.json",
      "coordination/content-qa/active-candidate/large.json",
      "coordination/integration/legacy-candidate.json",
      "data/live-projection.json",
      "coordination/integration/approval.md"
    ]) assert.ok(first.paths.includes(filePath), filePath);
    assert.match(first.pathsDigest, /^[a-f0-9]{64}$/u);

    await writeFile(path.join(fixture.root, "coordination/integration/evidence/a11.json"), '{"result":"drift"}\n');
    await assert.rejects(
      collectTrackedPromotionAuthorities({
        repoRoot: fixture.root,
        manifestPath: fixture.manifestPath,
        canonicalReceiptPath: fixture.receiptPath
      }),
      /PROMOTION_AUTHORITY_HEAD_DRIFT/u
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
