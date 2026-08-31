import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
