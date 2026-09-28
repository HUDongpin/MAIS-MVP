import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ACTIVATION_PATH, BUNDLE_DIGEST, CODE_PATHS, EXECUTION, FROZEN_RELEASE,
  MANIFEST, MANIFEST_SHA, PACK_SHA, RECEIPT_SHA, SEMANTIC_DIGEST, STORAGE,
  assertArtifactSet, assertFuturePaths, assertFutureTreeModes, assertReceiptEnvelope, markerMode, select, singleFirstAddition, stable
} from "./promotion-required-check-legacy-successor-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonical = JSON.parse(readFileSync(path.join(root, "coordination/integration/legacy-successor/attempt-009/promotion-shadow-receipt.v1.json"), "utf8"));
const sha = value => createHash("sha256").update(value).digest("hex");

function fixtures() {
  const receipt = structuredClone(canonical);
  const verification = {
    schemaVersion: "promotion-legacy-successor-verification.v1", result: "pass",
    semanticDigest: SEMANTIC_DIGEST, receiptRawSha256: RECEIPT_SHA,
    storageCommit: STORAGE, executionCommit: EXECUTION, liveAllowed: false
  };
  const fresh = structuredClone(receipt);
  fresh.run.id = "ci-123-1";
  delete fresh.selfDigest;
  fresh.selfDigest = sha(Buffer.from(stable(fresh)));
  return { receipt, verification, fresh };
}

test("the selector preserves successor routing when the exact marker is already in the base", () => {
  const empty = Buffer.alloc(0);
  const marker = Buffer.from(`100644 blob ${"a".repeat(40)}\t${ACTIVATION_PATH}\0`);
  const different = Buffer.from(`100644 blob ${"b".repeat(40)}\t${ACTIVATION_PATH}\0`);
  assert.equal(markerMode(empty, empty, empty), "v2");
  assert.equal(markerMode(Buffer.from(`A\0${ACTIVATION_PATH}\0`), empty, marker), "successor");
  assert.equal(markerMode(empty, marker, marker), "successor");
  for (const status of ["M", "D", "R", "T"]) {
    assert.throws(() => markerMode(Buffer.from(`${status}\0${ACTIVATION_PATH}\0`), marker, marker), /ACTIVATION_SELECTOR_MUTATED/u);
  }
  assert.throws(() => markerMode(Buffer.from(`A\0${ACTIVATION_PATH}\0A\0extra\0`), empty, marker), /ACTIVATION_SELECTOR_MUTATED/u);
  assert.throws(() => markerMode(empty, marker, different), /ACTIVATION_SELECTOR_MUTATED/u);
  assert.throws(() => markerMode(Buffer.from(`D\0${ACTIVATION_PATH}\0`), marker, empty), /ACTIVATION_SELECTOR_MUTATED/u);
});

test("real Git event, marker history, unchanged successor routing and re-add rejection", () => {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "promotion-activation-git-test-")));
  const env = { PATH: "/usr/bin:/bin", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", LC_ALL: "C" };
  const git = (...args) => execFileSync("/usr/bin/git", args, { cwd: root, env }).toString("utf8").trim();
  const eventPath = path.join(root, "event.json");
  const pr = (base, head) => {
    writeFileSync(eventPath, JSON.stringify({ number: 301, pull_request: { base: { sha: base }, head: { sha: head } } }));
    return select({ repoRoot: root, eventName: "pull_request", eventPath });
  };
  try {
    git("init", "-q", "--initial-branch=main");
    git("config", "user.name", "Activation Fixture");
    git("config", "user.email", "activation@example.invalid");
    writeFileSync(path.join(root, "README.md"), "base\n");
    git("add", "--", "README.md"); git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD");
    assert.equal(pr(base, base), "v2");
    const markerFile = path.join(root, ACTIVATION_PATH);
    mkdirSync(path.dirname(markerFile), { recursive: true });
    writeFileSync(markerFile, "frozen marker\n");
    git("add", "--", ACTIVATION_PATH); git("commit", "-q", "-m", "activate");
    const activation = git("rev-parse", "HEAD");
    assert.equal(pr(base, activation), "successor");
    assert.equal(singleFirstAddition(root, base), activation);
    writeFileSync(path.join(root, "README.md"), "later documentation\n");
    git("add", "--", "README.md"); git("commit", "-q", "-m", "docs");
    const docs = git("rev-parse", "HEAD");
    assert.equal(pr(activation, docs), "successor");
    writeFileSync(eventPath, JSON.stringify({ before: activation, after: docs, ref: "refs/heads/main" }));
    assert.equal(select({ repoRoot: root, eventName: "push", eventPath }), "successor");
    assert.throws(() => pr(base, activation), /ACTIVATION_HEAD_MISMATCH/u);
    unlinkSync(markerFile);
    git("add", "--", ACTIVATION_PATH); git("commit", "-q", "-m", "delete marker");
    const deleted = git("rev-parse", "HEAD");
    assert.throws(() => pr(docs, deleted), /ACTIVATION_SELECTOR_MUTATED/u);
    writeFileSync(markerFile, "frozen marker\n");
    git("add", "--", ACTIVATION_PATH); git("commit", "-q", "-m", "re-add marker");
    const readded = git("rev-parse", "HEAD");
    assert.equal(pr(docs, readded), "successor");
    assert.throws(() => singleFirstAddition(root, base), /ACTIVATION_MARKER_HISTORY/u);
    writeFileSync(markerFile, "changed marker\n");
    git("add", "--", ACTIVATION_PATH); git("commit", "-q", "-m", "mutate marker");
    const mutated = git("rev-parse", "HEAD");
    assert.throws(() => pr(readded, mutated), /ACTIVATION_SELECTOR_MUTATED/u);
    mkdirSync(path.join(root, "docs"));
    symlinkSync("../README.md", path.join(root, "docs/link.md"));
    git("add", "--", "docs/link.md"); git("commit", "-q", "-m", "symlink in safe path");
    const symlinkHead = git("rev-parse", "HEAD");
    assert.throws(() => assertFutureTreeModes(root, mutated, symlinkHead, ["docs/link.md"]), /ACTIVATION_FUTURE_MODE_INVALID/u);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test("later safe paths remain eligible while frozen promotion and source paths fail closed", () => {
  const protectedPaths = new Set([PACK_SHA, "package.json", "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json", ACTIVATION_PATH]);
  assert.deepEqual(assertFuturePaths(["docs/new-guide.md", "tests/lesson.spec.ts"], protectedPaths), ["docs/new-guide.md", "tests/lesson.spec.ts"]);
  for (const file of ["package.json", ACTIVATION_PATH, "coordination/integration/legacy-successor/contract.mjs", "scripts/promotion-fake.mjs", "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json"]) {
    assert.throws(() => assertFuturePaths([file], protectedPaths), /ACTIVATION_FUTURE_PROMOTION_DRIFT/u);
  }
  for (const file of ["app/lesson/page.tsx", "components/Answer.tsx", "lib/questionStore.ts", "public/questions.json", "scripts/other-runtime.mjs", ".github/workflows/other.yml"]) {
    assert.throws(() => assertFuturePaths([file], protectedPaths), /ACTIVATION_FUTURE_RUNTIME_OR_CODE_DRIFT/u);
  }
});

test("the frozen non-live canonical and a distinct fresh run have one semantic digest", () => {
  const { receipt, verification, fresh } = fixtures();
  assert.equal(receipt.semantics.executionCommit, EXECUTION);
  assert.equal(receipt.semantics.checkerReleaseCommit, FROZEN_RELEASE);
  assert.equal(receipt.semantics.checkerBundleDigest, BUNDLE_DIGEST);
  assert.equal(receipt.semantics.candidateDigest, PACK_SHA);
  assert.equal(receipt.semantics.manifest.path, MANIFEST);
  assert.equal(receipt.semantics.manifest.rawSha256, MANIFEST_SHA);
  assert.doesNotThrow(() => assertReceiptEnvelope(receipt, verification, fresh, fresh.run.id));
});

test("the native evidence decision rejects changed candidate, effects, duplicate identities and forged pass", () => {
  const mutations = [
    ({ receipt }) => { receipt.semantics.candidateDigest = "0".repeat(64); },
    ({ receipt }) => { receipt.semantics.externalSideEffects.network = 1; },
    ({ receipt }) => { receipt.liveAllowed = true; },
    ({ verification }) => { verification.storageCommit = EXECUTION; },
    ({ verification }) => { verification.result = "blocked"; },
    ({ fresh, receipt }) => { fresh.run.id = receipt.run.id; },
    ({ fresh }) => { fresh.semanticDigest = "0".repeat(64); },
    ({ fresh }) => { fresh.semantics.outputDigest = "0".repeat(64); }
  ];
  for (const mutate of mutations) {
    const fixture = fixtures();
    mutate(fixture);
    assert.throws(() => assertReceiptEnvelope(fixture.receipt, fixture.verification, fixture.fresh, fixture.fresh.run.id));
  }
});

test("canonical JSON rejects sparse or nonfinite values", () => {
  const sparse = []; sparse[1] = "x";
  assert.throws(() => stable(sparse), /ACTIVATION_SPARSE_JSON/u);
  assert.throws(() => stable({ bad: Number.POSITIVE_INFINITY }), /ACTIVATION_UNSAFE_JSON/u);
});

test("final gate enforces exactly six private regular evidence artifacts", () => {
  const fixture = realpathSync(mkdtempSync(path.join(os.tmpdir(), "promotion-activation-artifacts-")));
  const names = ["decision.v1.json", "fresh.json", "fresh.stderr", "native-runs.v1.json", "verification.json", "verification.stderr"];
  try {
    chmodSync(fixture, 0o700);
    for (const name of names) writeFileSync(path.join(fixture, name), "{}\n", { mode: 0o600 });
    assert.equal(assertArtifactSet(fixture), fixture);
    symlinkSync("decision.v1.json", path.join(fixture, "extra"));
    assert.throws(() => assertArtifactSet(fixture), /ACTIVATION_ARTIFACT_SET/u);
    unlinkSync(path.join(fixture, "extra"));
    chmodSync(path.join(fixture, "fresh.json"), 0o644);
    assert.throws(() => assertArtifactSet(fixture), /ACTIVATION_ARTIFACT_FILE/u);
    chmodSync(path.join(fixture, "fresh.json"), 0o600);
    unlinkSync(path.join(fixture, "fresh.json"));
    symlinkSync("decision.v1.json", path.join(fixture, "fresh.json"));
    assert.throws(() => assertArtifactSet(fixture), /ACTIVATION_ARTIFACT_FILE/u);
  } finally {
    rmSync(fixture, { recursive: true });
  }
});

test("activation code pathset is narrow and excludes frozen/native/source/public scripts", () => {
  assert.deepEqual([...CODE_PATHS].sort(), CODE_PATHS);
  assert.equal(CODE_PATHS.length, 5);
  for (const forbidden of ["package.json", "package-lock.json", "coordination/integration/legacy-successor/contract.mjs", "scripts/promotion-required-check-semantic-rescope.mjs", "data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json"]) {
    assert.ok(!CODE_PATHS.includes(forbidden));
  }
});
