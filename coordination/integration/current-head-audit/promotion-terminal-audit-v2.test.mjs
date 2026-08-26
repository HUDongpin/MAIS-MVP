import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { promisify } from "node:util";

import {
  AUDIT_CHECK_IDS,
  FIXED_ATTEMPT,
  PromotionTerminalAuditError,
  attachAuditDigests,
  auditCapabilitySources,
  auditPromotionTerminalCurrentHead,
  collectCandidateProvenanceForAudit,
  collectIndexSafetyProof,
  collectLedgerOnlyReleaseProof,
  collectTargetBundleProof,
  createPolicyFixtureForTest,
  runOrderedAuditForTest,
  validateAuditPolicy,
  validateAuditReport,
  validateCompiledTerminalArtifactsForTest
} from "./promotion-terminal-audit-v2-lib.mjs";
import { fingerprint } from "../promotion-gate-lib.mjs";

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(new URL("../../../", import.meta.url).pathname);

const HEX_A = "a".repeat(64);
const HEX_B = "b".repeat(64);
const HEAD_A = "a".repeat(40);
const HEAD_B = "b".repeat(40);

function passOperations(overrides = {}) {
  return {
    "terminal-attempt-binding": async () => ({ terminalState: "repair_required" }),
    "audit-checker-release": async () => ({ version: "promotion-terminal-current-head-audit-v2" }),
    "candidate-integrity": async () => ({ candidateDigest: FIXED_ATTEMPT.candidateDigest }),
    "evidence-currentness": async () => ({ ownerCount: 9, compatibilityDigest: HEX_A }),
    "selected-live-reachability": async () => ({ selectedCandidateReachable: false }),
    "legacy-ratchet": async () => ({ knownConflictCount: 1, newConflictCount: 0, opaqueConflictCount: 0 }),
    "no-repository-mutation": async () => ({ headStable: true, statusStable: true, candidateStable: true }),
    ...overrides
  };
}

function auditOptions(overrides = {}) {
  return {
    targetHead: HEAD_A,
    expectedHead: HEAD_A,
    policyRawSha256: HEX_A,
    policySelfDigest: HEX_B,
    runMetadata: {
      auditId: "unit-a",
      evaluatedAt: "2026-08-25T12:00:00.000Z",
      ciJobId: null
    },
    operations: passOperations(),
    ...overrides
  };
}

async function expectOutcome(overrides, expectedResult, expectedCode, expectedCheckId) {
  const report = await runOrderedAuditForTest(auditOptions(overrides));
  assert.equal(report.result, expectedResult);
  assert.equal(report.exitReason.code, expectedCode);
  assert.equal(report.exitReason.checkId, expectedCheckId);
  assert.equal(report.liveAllowed, false);
  assert.equal(report.maturityClaim, "not-shadow-mature");
  assert.equal(report.targetHead, HEAD_A);
  assert.equal(report.policy.rawSha256, HEX_A);
  assert.equal(report.policy.policyDigest, HEX_B);
  assert.match(report.semanticAuditDigest, /^[a-f0-9]{64}$/u);
  assert.match(report.rawAuditDigest, /^[a-f0-9]{64}$/u);
  return report;
}

test("terminal audit runs the exact ordered v1 check set", async () => {
  assert.deepEqual(AUDIT_CHECK_IDS, [
    "terminal-attempt-binding",
    "audit-checker-release",
    "candidate-integrity",
    "evidence-currentness",
    "selected-live-reachability",
    "legacy-ratchet",
    "no-repository-mutation"
  ]);
  const report = await runOrderedAuditForTest(auditOptions());
  assert.equal(report.result, "pass");
  assert.deepEqual(report.checks.map(({ checkId }) => checkId), AUDIT_CHECK_IDS);
  assert.ok(report.checks.every(({ result }) => result === "pass"));
});

test("run metadata changes raw digest but not semantic digest", async () => {
  const first = await runOrderedAuditForTest(auditOptions());
  const second = await runOrderedAuditForTest(auditOptions({
    runMetadata: {
      auditId: "unit-b",
      evaluatedAt: "2026-08-25T12:00:01.000Z",
      ciJobId: "job-2"
    }
  }));
  assert.notEqual(first.rawAuditDigest, second.rawAuditDigest);
  assert.equal(first.semanticAuditDigest, second.semanticAuditDigest);
});

test("policy raw SHA and self digest are independently retained and tamper-evident", async () => {
  const report = await runOrderedAuditForTest(auditOptions());
  assert.equal(report.policy.rawSha256, HEX_A);
  assert.equal(report.policy.policyDigest, HEX_B);
  const tamperedRaw = structuredClone(report);
  tamperedRaw.policy.rawSha256 = "c".repeat(64);
  assert.throws(() => validateAuditReport(tamperedRaw), (error) => error.code === "AUDIT_REPORT_DIGEST_MISMATCH");
  const tamperedSelf = structuredClone(report);
  tamperedSelf.policy.policyDigest = "d".repeat(64);
  assert.throws(() => validateAuditReport(tamperedSelf), (error) => error.code === "AUDIT_REPORT_DIGEST_MISMATCH");
});

test("report rejects a top-level proof changed independently of its check details", async () => {
  const report = await runOrderedAuditForTest(auditOptions());
  const tampered = structuredClone(report);
  tampered.legacyProof = { knownConflictCount: 1, newConflictCount: 999 };
  delete tampered.semanticAuditDigest;
  delete tampered.rawAuditDigest;
  const reattached = attachAuditDigests(tampered);
  assert.throws(
    () => validateAuditReport(reattached),
    (error) => error.code === "AUDIT_REPORT_PROOF_MISMATCH"
  );
});

test("report rejects target HEAD that differs from the required expected HEAD", async () => {
  await assert.rejects(
    runOrderedAuditForTest(auditOptions({ expectedHead: HEAD_B })),
    (error) => error.code === "AUDIT_REPORT_HEAD_MISMATCH"
  );
});

test("target HEAD remains semantic and changes semantic digest", async () => {
  const first = await runOrderedAuditForTest(auditOptions());
  const second = await runOrderedAuditForTest(auditOptions({ targetHead: HEAD_B, expectedHead: HEAD_B }));
  assert.notEqual(first.semanticAuditDigest, second.semanticAuditDigest);
});

test("LEGACY_NEW_CONFLICT is the primary fail and preserves opaque secondary proof", async () => {
  const details = {
    knownConflictCount: 1,
    newConflictCount: 15,
    newConflictDigest: HEX_A,
    opaqueConflictCount: 1,
    opaqueConflictDigest: HEX_B,
    secondaryBlockedCondition: {
      code: "LEGACY_DISCOVERY_INCOMPLETE",
      conflictCount: 1,
      conflictDigest: HEX_B
    }
  };
  const report = await expectOutcome({
    operations: passOperations({
      "legacy-ratchet": async () => {
        throw new PromotionTerminalAuditError(
          "LEGACY_NEW_CONFLICT",
          "Observed unratcheted conflicts.",
          details,
          "fail"
        );
      }
    })
  }, "fail", "LEGACY_NEW_CONFLICT", "legacy-ratchet");
  assert.deepEqual(report.legacyProof, details);
  assert.equal(report.checks.at(-2).result, "fail");
  assert.equal(report.checks.at(-1).result, "pass");
});

test("opaque discovery without a hard conflict is blocked", async () => {
  await expectOutcome({
    operations: passOperations({
      "legacy-ratchet": async () => {
        throw new PromotionTerminalAuditError(
          "LEGACY_DISCOVERY_INCOMPLETE",
          "Opaque candidate/live surface.",
          { opaqueConflictCount: 1, opaqueConflictDigest: HEX_A },
          "blocked"
        );
      }
    })
  }, "blocked", "LEGACY_DISCOVERY_INCOMPLETE", "legacy-ratchet");
});

for (const [name, checkId, code, outcome] of [
  ["terminal drift", "terminal-attempt-binding", "TERMINAL_BINDING_DRIFT", "fail"],
  ["target HEAD mismatch", "terminal-attempt-binding", "TARGET_HEAD_MISMATCH", "blocked"],
  ["dirty target", "terminal-attempt-binding", "WORKTREE_DIRTY", "blocked"],
  ["candidate drift", "candidate-integrity", "CANDIDATE_DIGEST_MISMATCH", "fail"],
  ["selected live id reachable", "selected-live-reachability", "LIVE_CANDIDATE_REACHABLE", "fail"],
  ["unknown dynamic import blind spot", "selected-live-reachability", "UNRESOLVED_DYNAMIC_IMPORT", "blocked"],
  ["new legacy conflict", "legacy-ratchet", "LEGACY_NEW_CONFLICT", "fail"],
  ["changed legacy conflict", "legacy-ratchet", "LEGACY_CONFLICT_CHANGED", "fail"],
  ["expired legacy ratchet", "legacy-ratchet", "LEGACY_RATCHET_EXPIRED", "fail"],
  ["audit release remap", "audit-checker-release", "AUDIT_RELEASE_REMAPPED", "blocked"],
  ["symlink escape", "terminal-attempt-binding", "AUTHORITATIVE_PATH_UNSAFE", "fail"],
  ["case collision", "terminal-attempt-binding", "PATH_CASE_COLLISION", "fail"],
  ["repository mutation", "no-repository-mutation", "REPOSITORY_MUTATION", "fail"]
]) {
  test(`${name} fails closed as ${outcome}`, async () => {
    await expectOutcome({
      operations: passOperations({
        [checkId]: async () => {
          throw new PromotionTerminalAuditError(code, name, { scenario: name }, outcome);
        }
      })
    }, outcome, code, checkId);
  });
}

test("policy is exact and fixed to the immutable attempt allowlist", () => {
  const policy = createPolicyFixtureForTest({
    releaseCommit: HEAD_A,
    ledgerRawSha256: HEX_A,
    bundleDigest: HEX_B
  });
  assert.equal(validateAuditPolicy(policy), policy);
  assert.equal(policy.gateId, FIXED_ATTEMPT.gateId);
  assert.equal(policy.pilotUnitId, FIXED_ATTEMPT.pilotUnitId);
  assert.equal(policy.attemptId, FIXED_ATTEMPT.attemptId);
  assert.equal(policy.candidateDigest, FIXED_ATTEMPT.candidateDigest);
});

test("policy cannot inject commands or unknown fields", () => {
  const policy = createPolicyFixtureForTest({
    releaseCommit: HEAD_A,
    ledgerRawSha256: HEX_A,
    bundleDigest: HEX_B
  });
  assert.throws(
    () => validateAuditPolicy({ ...policy, command: "curl https://example.invalid" }),
    (error) => error.code === "AUDIT_POLICY_INVALID"
  );
});

test("policy cannot remap immutable attempt paths or digests", () => {
  const policy = createPolicyFixtureForTest({
    releaseCommit: HEAD_A,
    ledgerRawSha256: HEX_A,
    bundleDigest: HEX_B
  });
  const remapped = structuredClone(policy);
  remapped.terminalArtifacts.manifest.path = "coordination/other.json";
  assert.throws(
    () => validateAuditPolicy(remapped),
    (error) => error.code === "AUDIT_POLICY_ATTEMPT_REMAP"
  );
});

test("real immutable terminal artifacts pass compiled digest, disposition, registry, A11, and A22 binding", async () => {
  const proof = await validateCompiledTerminalArtifactsForTest(REPO_ROOT);
  assert.equal(proof.terminalState, "repair_required");
  assert.equal(proof.gateResult, "fail");
  assert.equal(proof.reasonCode, "LEGACY_NEW_CONFLICT");
  assert.equal(proof.canonicalRawReceiptDigest, FIXED_ATTEMPT.canonicalRawReceiptDigest);
  assert.equal(proof.independentRawReceiptDigest, FIXED_ATTEMPT.independentRawReceiptDigest);
  assert.equal(proof.semanticReceiptDigest, FIXED_ATTEMPT.semanticReceiptDigest);
  assert.equal(proof.dispositionDigest, FIXED_ATTEMPT.dispositionDigest);
  assert.equal(proof.registryDigest, FIXED_ATTEMPT.registryDigest);
  assert.equal(proof.liveAllowed, false);
  assert.equal(proof.newAttemptRequired, true);
});

test("ledger-only release proof accepts one exact single-parent ledger commit and rejects expansion", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "promotion-terminal-ledger-"));
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "Promotion Audit Test",
    GIT_AUTHOR_EMAIL: "promotion-audit@example.invalid",
    GIT_COMMITTER_NAME: "Promotion Audit Test",
    GIT_COMMITTER_EMAIL: "promotion-audit@example.invalid"
  };
  const git = (...args) => execFileAsync("/usr/bin/git", args, { cwd: fixtureRoot, env: gitEnv });
  try {
    await git("init", "-q");
    await writeFile(path.join(fixtureRoot, "implementation.txt"), "frozen implementation\n");
    await git("add", "implementation.txt");
    await git("commit", "-q", "-m", "implementation");
    const ledgerPath = "coordination/integration/current-head-audit/promotion-terminal-audit-releases.v2.json";
    await mkdir(path.dirname(path.join(fixtureRoot, ledgerPath)), { recursive: true });
    await writeFile(path.join(fixtureRoot, ledgerPath), "{}\n");
    await git("add", ledgerPath);
    await git("commit", "-q", "-m", "ledger only");
    const { stdout: goodHeadSource } = await git("rev-parse", "HEAD");
    const goodHead = goodHeadSource.trim();
    const proof = await collectLedgerOnlyReleaseProof(fixtureRoot, goodHead);
    assert.equal(proof.releaseCommit, goodHead);
    assert.deepEqual(proof.changedPaths, [ledgerPath]);

    await writeFile(path.join(fixtureRoot, "expanded.txt"), "not ledger-only\n");
    await git("add", "expanded.txt");
    await git("commit", "-q", "-m", "expanded release");
    const { stdout: badHeadSource } = await git("rev-parse", "HEAD");
    await assert.rejects(
      collectLedgerOnlyReleaseProof(fixtureRoot, badHeadSource.trim()),
      (error) => error.code === "AUDIT_RELEASE_GENESIS_INVALID"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("candidate provenance rejects unrelated source or baseline history and source-byte drift", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "promotion-terminal-provenance-"));
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "Promotion Audit Test",
    GIT_AUTHOR_EMAIL: "promotion-audit@example.invalid",
    GIT_COMMITTER_NAME: "Promotion Audit Test",
    GIT_COMMITTER_EMAIL: "promotion-audit@example.invalid"
  };
  const git = (...args) => execFileAsync("/usr/bin/git", args, { cwd: fixtureRoot, env: gitEnv, encoding: "utf8" });
  const candidatePath = "coordination/content-qa/us-ca-math-rag-v2-candidate/s04-question-candidate-pack.json";
  const candidateDocument = { questions: [...Array(30).fill(null), 12] };
  const candidateBytes = `${JSON.stringify(candidateDocument)}\n`;
  const rawFileSha256 = createHash("sha256").update(candidateBytes).digest("hex");
  try {
    await git("init", "-q");
    await mkdir(path.dirname(path.join(fixtureRoot, candidatePath)), { recursive: true });
    await writeFile(path.join(fixtureRoot, candidatePath), candidateBytes);
    await git("add", candidatePath);
    await git("commit", "-q", "-m", "candidate source");
    const { stdout: sourceText } = await git("rev-parse", "HEAD");
    const sourceCommit = sourceText.trim();
    await writeFile(path.join(fixtureRoot, "unrelated.txt"), "execution descendant\n");
    await git("add", "unrelated.txt");
    await git("commit", "-q", "-m", "execution descendant");
    const { stdout: executionText } = await git("rev-parse", "HEAD");
    const executionCommit = executionText.trim();
    const manifest = {
      sourceCommit,
      targetBaselineCommit: sourceCommit,
      candidateArtifacts: [{
        kind: "practice",
        id: "fixture-practice",
        path: candidatePath,
        jsonPointer: "/questions/30",
        rawFileSha256,
        recordSha256: fingerprint(12)
      }]
    };
    const valid = await collectCandidateProvenanceForAudit(fixtureRoot, manifest, executionCommit);
    assert.equal(valid.sourceAncestorOfExecution, true);
    assert.equal(valid.targetBaselineAncestorOfExecution, true);
    assert.equal(valid.equal, true);

    await writeFile(
      path.join(fixtureRoot, candidatePath),
      `${JSON.stringify({ questions: [...Array(30).fill(null), 13] })}\n`
    );
    await assert.rejects(
      collectCandidateProvenanceForAudit(fixtureRoot, manifest, executionCommit),
      (error) => error.code === "SOURCE_PROVENANCE_BLOB_MISMATCH"
    );
    await writeFile(path.join(fixtureRoot, candidatePath), candidateBytes);

    const { stdout: treeText } = await git("rev-parse", `${sourceCommit}^{tree}`);
    const { stdout: unrelatedText } = await git("commit-tree", treeText.trim(), "-m", "unrelated root");
    const unrelatedCommit = unrelatedText.trim();
    await assert.rejects(
      collectCandidateProvenanceForAudit(
        fixtureRoot,
        { ...manifest, sourceCommit: unrelatedCommit },
        executionCommit
      ),
      (error) => error.code === "SOURCE_PROVENANCE_NOT_ANCESTOR"
    );
    await assert.rejects(
      collectCandidateProvenanceForAudit(
        fixtureRoot,
        { ...manifest, targetBaselineCommit: unrelatedCommit },
        executionCommit
      ),
      (error) => error.code === "TARGET_BASELINE_NOT_ANCESTOR"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("target bundle proof rejects committed or working-byte drift after a frozen release", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "promotion-terminal-target-bundle-"));
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "Promotion Audit Test",
    GIT_AUTHOR_EMAIL: "promotion-audit@example.invalid",
    GIT_COMMITTER_NAME: "Promotion Audit Test",
    GIT_COMMITTER_EMAIL: "promotion-audit@example.invalid"
  };
  const git = (...args) => execFileAsync("/usr/bin/git", args, { cwd: fixtureRoot, env: gitEnv, encoding: "utf8" });
  const frozenPath = "coordination/integration/current-head-audit/frozen.mjs";
  const frozenBytes = "export const frozen = true;\n";
  const binding = {
    path: frozenPath,
    rawSha256: createHash("sha256").update(frozenBytes).digest("hex")
  };
  try {
    await git("init", "-q");
    await mkdir(path.dirname(path.join(fixtureRoot, frozenPath)), { recursive: true });
    await writeFile(path.join(fixtureRoot, frozenPath), frozenBytes);
    await git("add", frozenPath);
    await git("commit", "-q", "-m", "frozen bundle");
    const { stdout: frozenHeadText } = await git("rev-parse", "HEAD");
    const frozenHead = frozenHeadText.trim();
    const valid = await collectTargetBundleProof(fixtureRoot, frozenHead, [binding]);
    assert.equal(valid.targetHeadMatches, true);
    assert.equal(valid.workingTreeMatches, true);

    await writeFile(path.join(fixtureRoot, frozenPath), "export const frozen = false;\n");
    await assert.rejects(
      collectTargetBundleProof(fixtureRoot, frozenHead, [binding]),
      (error) => error.code === "AUDIT_RELEASE_BUNDLE_MISMATCH"
    );
    await git("add", frozenPath);
    await git("commit", "-q", "-m", "tamper bundle");
    const { stdout: tamperedHeadText } = await git("rev-parse", "HEAD");
    await assert.rejects(
      collectTargetBundleProof(fixtureRoot, tamperedHeadText.trim(), [binding]),
      (error) => error.code === "AUDIT_RELEASE_BUNDLE_MISMATCH"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("production bootstrap blocks mismatched HEAD and a dirty target before any audit release", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "promotion-terminal-bootstrap-"));
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "Promotion Audit Test",
    GIT_AUTHOR_EMAIL: "promotion-audit@example.invalid",
    GIT_COMMITTER_NAME: "Promotion Audit Test",
    GIT_COMMITTER_EMAIL: "promotion-audit@example.invalid"
  };
  const git = (...args) => execFileAsync("/usr/bin/git", args, { cwd: fixtureRoot, env: gitEnv, encoding: "utf8" });
  try {
    await git("init", "-q");
    const policy = createPolicyFixtureForTest({
      releaseCommit: HEAD_A,
      ledgerRawSha256: HEX_A,
      bundleDigest: HEX_B
    });
    const policyPath = "coordination/integration/current-head-audit/policies/us-ca-math-rag-v2-g6-ratios-v1-attempt-001.v2.json";
    await mkdir(path.dirname(path.join(fixtureRoot, policyPath)), { recursive: true });
    await writeFile(path.join(fixtureRoot, policyPath), `${JSON.stringify(policy)}\n`);
    await git("add", policyPath);
    await git("commit", "-q", "-m", "policy fixture");
    const { stdout: headSource } = await git("rev-parse", "HEAD");
    const head = headSource.trim();

    const mismatch = await auditPromotionTerminalCurrentHead({
      policyPath,
      targetRoot: fixtureRoot,
      expectedHead: HEAD_B,
      evaluatedAt: "2026-08-25T12:00:00.000Z"
    });
    assert.equal(mismatch.result, "blocked");
    assert.equal(mismatch.exitReason.code, "TARGET_HEAD_MISMATCH");
    assert.equal(mismatch.checks.at(-1).result, "pass");
    assert.equal(mismatch.worktreeProof.preHead, head);
    assert.equal(mismatch.worktreeProof.postHead, head);
    assert.equal(mismatch.worktreeProof.observedPersistentRepositoryMutationCount, 0);

    await writeFile(path.join(fixtureRoot, "dirty.txt"), "untracked\n");
    const dirty = await auditPromotionTerminalCurrentHead({
      policyPath,
      targetRoot: fixtureRoot,
      expectedHead: head,
      evaluatedAt: "2026-08-25T12:00:00.000Z"
    });
    assert.equal(dirty.result, "blocked");
    assert.equal(dirty.exitReason.code, "WORKTREE_DIRTY");
    assert.equal(dirty.checks.at(-1).result, "pass");
    assert.equal(dirty.worktreeProof.preClean, false);
    assert.equal(dirty.worktreeProof.postClean, false);
    assert.equal(dirty.worktreeProof.observedPersistentRepositoryMutationCount, 0);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("malformed policy bytes are blocked by the genesis binding and still receive a real post-state proof", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "promotion-terminal-malformed-policy-"));
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "Promotion Audit Test",
    GIT_AUTHOR_EMAIL: "promotion-audit@example.invalid",
    GIT_COMMITTER_NAME: "Promotion Audit Test",
    GIT_COMMITTER_EMAIL: "promotion-audit@example.invalid"
  };
  const git = (...args) => execFileAsync("/usr/bin/git", args, { cwd: fixtureRoot, env: gitEnv, encoding: "utf8" });
  try {
    await git("init", "-q");
    const policyPath = "coordination/integration/current-head-audit/policies/us-ca-math-rag-v2-g6-ratios-v1-attempt-001.v2.json";
    await mkdir(path.dirname(path.join(fixtureRoot, policyPath)), { recursive: true });
    await writeFile(path.join(fixtureRoot, policyPath), "{ malformed\n");
    await git("add", policyPath);
    await git("commit", "-q", "-m", "malformed policy fixture");
    const { stdout: headSource } = await git("rev-parse", "HEAD");
    const head = headSource.trim();
    const report = await auditPromotionTerminalCurrentHead({
      policyPath,
      targetRoot: fixtureRoot,
      expectedHead: head,
      evaluatedAt: "2026-08-25T12:00:00.000Z"
    });
    assert.equal(report.result, "blocked");
    assert.equal(report.exitReason.code, "AUDIT_POLICY_GENESIS_MISMATCH");
    assert.equal(report.checks.at(-1).result, "pass");
    assert.equal(report.worktreeProof.preHead, head);
    assert.equal(report.worktreeProof.postHead, head);
    assert.equal(report.worktreeProof.observedPersistentRepositoryMutationCount, 0);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("production bootstrap rejects a symlinked policy path", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "promotion-terminal-symlink-"));
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "Promotion Audit Test",
    GIT_AUTHOR_EMAIL: "promotion-audit@example.invalid",
    GIT_COMMITTER_NAME: "Promotion Audit Test",
    GIT_COMMITTER_EMAIL: "promotion-audit@example.invalid"
  };
  const git = (...args) => execFileAsync("/usr/bin/git", args, { cwd: fixtureRoot, env: gitEnv, encoding: "utf8" });
  try {
    await git("init", "-q");
    const policyPath = "coordination/integration/current-head-audit/policies/us-ca-math-rag-v2-g6-ratios-v1-attempt-001.v2.json";
    const realPolicyPath = path.join(fixtureRoot, "real-policy.json");
    await writeFile(realPolicyPath, "{}\n");
    await mkdir(path.dirname(path.join(fixtureRoot, policyPath)), { recursive: true });
    await symlink(realPolicyPath, path.join(fixtureRoot, policyPath));
    await git("add", "real-policy.json", policyPath);
    await git("commit", "-q", "-m", "symlink fixture");
    const { stdout: headSource } = await git("rev-parse", "HEAD");
    const report = await auditPromotionTerminalCurrentHead({
      policyPath,
      targetRoot: fixtureRoot,
      expectedHead: headSource.trim(),
      evaluatedAt: "2026-08-25T12:00:00.000Z"
    });
    assert.equal(report.result, "fail");
    assert.equal(report.exitReason.code, "AUTHORITATIVE_PATH_UNSAFE");
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("real Git index case collision is rejected", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "promotion-terminal-case-"));
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "Promotion Audit Test",
    GIT_AUTHOR_EMAIL: "promotion-audit@example.invalid",
    GIT_COMMITTER_NAME: "Promotion Audit Test",
    GIT_COMMITTER_EMAIL: "promotion-audit@example.invalid"
  };
  const git = (...args) => execFileAsync("/usr/bin/git", args, { cwd: fixtureRoot, env: gitEnv, encoding: "utf8" });
  try {
    await git("init", "-q");
    await writeFile(path.join(fixtureRoot, "blob-source.txt"), "same bytes\n");
    const { stdout: blobSource } = await git("hash-object", "-w", "blob-source.txt");
    const blob = blobSource.trim();
    await git("update-index", "--add", "--cacheinfo", `100644,${blob},Case.txt`);
    await git("update-index", "--add", "--cacheinfo", `100644,${blob},case.txt`);
    await assert.rejects(
      collectIndexSafetyProof(fixtureRoot),
      (error) => error.code === "PATH_CASE_COLLISION"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

for (const hiddenFlag of ["--assume-unchanged", "--skip-worktree"]) {
  test(`real Git index ${hiddenFlag} is blocked`, async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "promotion-terminal-hidden-index-"));
    const gitEnv = {
      ...process.env,
      GIT_AUTHOR_NAME: "Promotion Audit Test",
      GIT_AUTHOR_EMAIL: "promotion-audit@example.invalid",
      GIT_COMMITTER_NAME: "Promotion Audit Test",
      GIT_COMMITTER_EMAIL: "promotion-audit@example.invalid"
    };
    const git = (...args) => execFileAsync("/usr/bin/git", args, { cwd: fixtureRoot, env: gitEnv, encoding: "utf8" });
    try {
      await git("init", "-q");
      await writeFile(path.join(fixtureRoot, "tracked.txt"), "tracked\n");
      await git("add", "tracked.txt");
      await git("commit", "-q", "-m", "tracked fixture");
      await git("update-index", hiddenFlag, "tracked.txt");
      await assert.rejects(
        collectIndexSafetyProof(fixtureRoot),
        (error) => error.code === "INDEX_HIDDEN_PATH"
      );
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });
}

test("versioned policy and report schemas are consumed as strict public contracts", async () => {
  const [policySchema, reportSchema] = await Promise.all([
    readFile(new URL("./schemas/promotion-terminal-current-head-audit-policy.v2.schema.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("./schemas/promotion-terminal-current-head-audit.v2.schema.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  const policy = createPolicyFixtureForTest({
    releaseCommit: HEAD_A,
    ledgerRawSha256: HEX_A,
    bundleDigest: HEX_B
  });
  const report = await runOrderedAuditForTest(auditOptions());
  assert.equal(policySchema.additionalProperties, false);
  assert.equal(reportSchema.additionalProperties, false);
  assert.deepEqual([...policySchema.required].sort(), Object.keys(policy).sort());
  assert.deepEqual([...reportSchema.required].sort(), Object.keys(report).sort());
  assert.deepEqual(Object.keys(policySchema.properties).sort(), Object.keys(policy).sort());
  assert.deepEqual(Object.keys(reportSchema.properties).sort(), Object.keys(report).sort());
  assert.equal(validateAuditPolicy(policy), policy);
  assert.equal(validateAuditReport(report), report);
  const Ajv2020 = createRequire(import.meta.url)("ajv/dist/2020.js");
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
  const validatePolicySchema = ajv.compile(policySchema);
  const validateReportSchema = ajv.compile(reportSchema);
  assert.equal(validatePolicySchema(policy), true, JSON.stringify(validatePolicySchema.errors));
  assert.equal(validateReportSchema(report), true, JSON.stringify(validateReportSchema.errors));
  const policyWithNestedExpansion = structuredClone(policy);
  policyWithNestedExpansion.auditContract.command = "curl https://example.invalid";
  assert.equal(validatePolicySchema(policyWithNestedExpansion), false);
  const reportWithNestedExpansion = structuredClone(report);
  reportWithNestedExpansion.runMetadata.unexpected = true;
  assert.equal(validateReportSchema(reportWithNestedExpansion), false);
  const reportWithWrongOrder = structuredClone(report);
  reportWithWrongOrder.checks[0].checkId = "legacy-ratchet";
  assert.equal(validateReportSchema(reportWithWrongOrder), false);
});

test("audit digest attachment rejects caller supplied digest fields", () => {
  assert.throws(
    () => attachAuditDigests({ schemaVersion: "promotion-terminal-current-head-audit.v2", rawAuditDigest: HEX_A }),
    (error) => error.code === "AUDIT_REPORT_INVALID"
  );
});

test("capability scan accepts the real audit sources", async () => {
  const [librarySource, cliSource] = await Promise.all([
    readFile(new URL("./promotion-terminal-audit-v2-lib.mjs", import.meta.url), "utf8"),
    readFile(new URL("./promotion-terminal-audit-v2.mjs", import.meta.url), "utf8")
  ]);
  const proof = auditCapabilitySources({ librarySource, cliSource });
  assert.equal(proof.result, "pass");
  assert.equal(proof.violations.length, 0);
  assert.equal(proof.execFileCallCount, 1);
});

for (const [label, argv, expectedCode] of [
  ["unsupported command", ["validate"], "AUDIT_COMMAND_UNSUPPORTED"],
  ["repeated json", ["audit", "--json", "--json"], "AUDIT_ARGUMENT_INVALID"],
  ["unknown flag", ["audit", "--unknown"], "AUDIT_ARGUMENT_INVALID"],
  ["missing value", ["audit", "--policy"], "AUDIT_ARGUMENT_INVALID"],
  ["repeated flag", [
    "audit", "--policy", "one", "--policy", "two", "--target-root", "/tmp", "--expected-head", HEAD_A, "--json"
  ], "AUDIT_ARGUMENT_INVALID"]
]) {
  test(`CLI ${label} is validation-blocked with exit 2, not internal`, async () => {
    let stdout = "";
    let exitCode = 0;
    try {
      ({ stdout } = await execFileAsync(process.execPath, [
        new URL("./promotion-terminal-audit-v2.mjs", import.meta.url).pathname,
        ...argv
      ], { encoding: "utf8" }));
    } catch (error) {
      stdout = error.stdout;
      exitCode = error.code;
    }
    assert.equal(exitCode, 2);
    const report = JSON.parse(stdout);
    validateAuditReport(report);
    assert.equal(report.result, "blocked");
    assert.equal(report.exitReason.code, expectedCode);
    assert.notEqual(report.result, "internal");
  });
}

test("CLI maps a missing target repository to blocked exit 2", async () => {
  const missingRoot = path.join(tmpdir(), `promotion-terminal-missing-${process.pid}`);
  let stdout = "";
  let exitCode = 0;
  try {
    ({ stdout } = await execFileAsync(process.execPath, [
      new URL("./promotion-terminal-audit-v2.mjs", import.meta.url).pathname,
      "audit",
      "--policy",
      "coordination/integration/current-head-audit/policies/us-ca-math-rag-v2-g6-ratios-v1-attempt-001.v2.json",
      "--target-root",
      missingRoot,
      "--expected-head",
      HEAD_A,
      "--expected-release",
      HEAD_B,
      "--json"
    ], { encoding: "utf8" }));
  } catch (error) {
    stdout = error.stdout;
    exitCode = error.code;
  }
  assert.equal(exitCode, 2);
  const report = JSON.parse(stdout);
  validateAuditReport(report);
  assert.equal(report.result, "blocked");
  assert.equal(report.exitReason.code, "TARGET_REPOSITORY_UNAVAILABLE");
});

for (const [label, injected, expectedKind] of [
  ["network", "fetch('https://example.invalid')", "forbidden-call-fetch"],
  ["provider", "provider.call()", "forbidden-capability-provider"],
  ["database", "database.write()", "forbidden-capability-database"],
  ["vercel", "vercel.deploy()", "forbidden-capability-vercel"],
  ["dynamic import", "import('./target.mjs')", "dynamic-import"],
  ["eval", "eval('1 + 1')", "forbidden-call-eval"],
  ["Function", "new Function('return 1')", "forbidden-constructor-Function"],
  ["filesystem write", "writeFile('/tmp/x', 'x')", "forbidden-call-writeFile"],
  ["arbitrary shell", "exec('echo unsafe')", "forbidden-call-exec"],
  ["Shadow retry", "frozenCore.runShadowPilot('/target')", "forbidden-promotion-execution-runshadowpilot"],
  ["historical Receipt verification", "frozenCore.verifyPromotionReceipt('/target')", "forbidden-promotion-execution-verifypromotionreceipt"]
]) {
  test(`capability scan rejects ${label}`, async () => {
    const [librarySource, cliSource] = await Promise.all([
      readFile(new URL("./promotion-terminal-audit-v2-lib.mjs", import.meta.url), "utf8"),
      readFile(new URL("./promotion-terminal-audit-v2.mjs", import.meta.url), "utf8")
    ]);
    const proof = auditCapabilitySources({ librarySource: `${librarySource}\n${injected}\n`, cliSource });
    assert.equal(proof.result, "fail");
    assert.ok(proof.violations.some(({ kind }) => kind === expectedKind));
  });
}

for (const [label, injected, expectedKind] of [
  [
    "filesystem import alias",
    "import { writeFile as readFile } from 'node:fs/promises';",
    "import-alias"
  ],
  [
    "computed frozen-core promotion call",
    "frozenCore['runShadowPilot']('/target');",
    "forbidden-promotion-execution-runshadowpilot"
  ],
  [
    "globalThis network call",
    "globalThis.fetch('https://example.invalid');",
    "forbidden-global-capability-fetch"
  ],
  [
    "destructured frozen-core promotion alias",
    "const { runShadowPilot: retryShadow } = frozenCore; retryShadow('/target');",
    "forbidden-capability-alias"
  ]
]) {
  test(`capability scan rejects ${label} without name-based bypasses`, async () => {
    const [librarySource, cliSource] = await Promise.all([
      readFile(new URL("./promotion-terminal-audit-v2-lib.mjs", import.meta.url), "utf8"),
      readFile(new URL("./promotion-terminal-audit-v2.mjs", import.meta.url), "utf8")
    ]);
    const proof = auditCapabilitySources({ librarySource: `${librarySource}\n${injected}\n`, cliSource });
    assert.equal(proof.result, "fail");
    assert.ok(proof.violations.some(({ kind }) => kind === expectedKind));
  });
}

test("real current-HEAD CLI audit is opt-in and must retain the 15-new/1-opaque fail", {
  skip: process.env.PROMOTION_TERMINAL_AUDIT_REAL !== "1"
}, async () => {
  const releaseCli = process.env.PROMOTION_TERMINAL_AUDIT_RELEASE_CLI;
  const targetRoot = process.env.PROMOTION_TERMINAL_AUDIT_TARGET_ROOT;
  const expectedHead = process.env.PROMOTION_TERMINAL_AUDIT_EXPECTED_HEAD;
  const expectedRelease = process.env.PROMOTION_TERMINAL_AUDIT_EXPECTED_RELEASE;
  assert.ok(path.isAbsolute(releaseCli));
  assert.ok(path.isAbsolute(targetRoot));
  assert.match(expectedHead, /^[a-f0-9]{40}$/u);
  assert.match(expectedRelease, /^[a-f0-9]{40}$/u);
  const invoke = async (runId) => {
    let stdout = "";
    let exitCode = 0;
    try {
      ({ stdout } = await execFileAsync(process.execPath, [
        releaseCli,
        "audit",
        "--policy",
        "coordination/integration/current-head-audit/policies/us-ca-math-rag-v2-g6-ratios-v1-attempt-001.v2.json",
        "--target-root",
        targetRoot,
        "--expected-head",
        expectedHead,
        "--expected-release",
        expectedRelease,
        "--json"
      ], {
        encoding: "utf8",
        env: { ...process.env, PROMOTION_TERMINAL_AUDIT_RUN_ID: runId },
        maxBuffer: 64 * 1024 * 1024
      }));
    } catch (error) {
      stdout = error.stdout;
      exitCode = error.code;
    }
    assert.equal(exitCode, 1);
    return JSON.parse(stdout);
  };
  const report = await invoke("terminal-current-head-real-a");
  const replay = await invoke("terminal-current-head-real-b");
  validateAuditReport(report);
  validateAuditReport(replay);
  assert.equal(report.result, "fail");
  assert.equal(report.exitReason.code, "LEGACY_NEW_CONFLICT");
  assert.equal(report.exitReason.checkId, "legacy-ratchet");
  assert.equal(report.legacyProof.newConflictCount, 15);
  assert.equal(report.legacyProof.opaqueConflictCount, 1);
  assert.equal(report.legacyProof.secondaryBlockedCondition.code, "LEGACY_DISCOVERY_INCOMPLETE");
  assert.equal(report.targetHead, expectedHead);
  assert.equal(report.liveAllowed, false);
  assert.equal(report.maturityClaim, "not-shadow-mature");
  assert.notEqual(report.rawAuditDigest, replay.rawAuditDigest);
  assert.equal(report.semanticAuditDigest, replay.semanticAuditDigest);
});
