import { execFile } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import * as frozenCore from "../promotion-gate-lib.mjs";

export const AUDIT_SCHEMA_VERSION = "promotion-terminal-current-head-audit.v1";
export const AUDIT_POLICY_SCHEMA_VERSION = "promotion-terminal-current-head-audit-policy.v1";
export const AUDIT_RELEASE_LEDGER_SCHEMA_VERSION = "promotion-terminal-audit-releases.v1";
export const AUDIT_RELEASE_VERSION = "promotion-terminal-current-head-audit-v1";
export const DEFAULT_POLICY_PATH =
  "coordination/integration/current-head-audit/policies/us-ca-math-rag-v2-g6-ratios-v1-attempt-001.v1.json";
export const AUDIT_RELEASE_LEDGER_PATH =
  "coordination/integration/current-head-audit/promotion-terminal-audit-releases.v1.json";

export const AUDIT_CHECK_IDS = Object.freeze([
  "terminal-attempt-binding",
  "audit-checker-release",
  "candidate-integrity",
  "evidence-currentness",
  "selected-live-reachability",
  "legacy-ratchet",
  "no-repository-mutation"
]);

const AUDIT_BUNDLE_PATHS = Object.freeze([
  "coordination/integration/current-head-audit/promotion-terminal-audit-lib.mjs",
  "coordination/integration/current-head-audit/promotion-terminal-audit.mjs",
  "coordination/integration/current-head-audit/schemas/promotion-terminal-current-head-audit.v1.schema.json",
  "coordination/integration/current-head-audit/schemas/promotion-terminal-current-head-audit-policy.v1.schema.json",
  "coordination/integration/current-head-audit/promotion-terminal-audit.test.mjs"
]);

const FROZEN_CORE_BUNDLE_PATHS = Object.freeze([
  "coordination/integration/promotion-gate-lib.mjs",
  "coordination/integration/promotion-gate.mjs",
  "coordination/integration/schemas/promotion-manifest.v1.schema.json",
  "coordination/integration/schemas/promotion-receipt.v1.schema.json",
  "coordination/integration/promotion-gate.test.mjs",
  "package.json",
  "package-lock.json"
]);

const FROZEN_CORE_RAW_SHA256 = Object.freeze({
  "coordination/integration/promotion-gate-lib.mjs": "f968d45359bdd74819ef1dff0a461e441e53f52dfa7854173b7bfe7292c16f2b",
  "coordination/integration/promotion-gate.mjs": "1b2cae8c547bd708c670db8043d41df2f9d80550a993490fba8735095b841f80",
  "coordination/integration/schemas/promotion-manifest.v1.schema.json": "dadb3200073721c97ce83a8d3c5d65b2ad68195593db0a565ae6370e2429da2a",
  "coordination/integration/schemas/promotion-receipt.v1.schema.json": "6ca67060b9af2f1e069cdd554794a290227d8125ee8ddd5915cc8ff788a2cfbd",
  "coordination/integration/promotion-gate.test.mjs": "6b68f6e219acc13ff2a5599f2f871d9d63d978fb8b3b2191ebd56d656c86888d",
  "package.json": "38b73b183d06aa87670533a396386b469144c7799b70234cc9b2b0940138a46f",
  "package-lock.json": "d2ce8b4862d6cb0789ed5075f450dac6c342ff7dc493f592bd6d824729daf18b"
});

const FROZEN_CORE_BUNDLE_DIGEST = "517f670a46ce82be60b11ee1b179f63e274517ca5f431d95be58805fa96ededf";

const PILOT_ROOT = "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v1";

const FIXED_TERMINAL_ARTIFACTS = Object.freeze({
  manifest: Object.freeze({
    path: `${PILOT_ROOT}/promotion-manifest.v1.json`,
    rawSha256: "7bcb27d6b9604a1dd4c41f75fba18718b03a7d97046f44923790aa7f207943bc"
  }),
  evidenceIndex: Object.freeze({
    path: `${PILOT_ROOT}/inputs/evidence-index.v1.json`,
    rawSha256: "257384dc22fa6d46c2a9220c9de12c8fb164412bf2bec673685fde1277760297"
  }),
  canonicalReceipt: Object.freeze({
    path: `${PILOT_ROOT}/shadow-receipt.v1.json`,
    rawSha256: "04c83d2b44fd0ec1daf588b7b28509c6a193eee539d99be09a5dc7420ee8e668"
  }),
  independentReceipt: Object.freeze({
    path: `${PILOT_ROOT}/a11-independent-shadow-receipt.v1.json`,
    rawSha256: "0ef983a268e9d0f89620c499ddde885475a6b9b2c7c5d739b735b5ca0a87ecf7"
  }),
  a18Authority: Object.freeze({
    path: `${PILOT_ROOT}/authorities/a18-repair-required.v1.json`,
    rawSha256: "d37e72c5dd8d9892519ed504d76603b03a449e2fc182bf3611889fafffb0ca18"
  }),
  a23Authority: Object.freeze({
    path: `${PILOT_ROOT}/authorities/a23-repair-required.v1.json`,
    rawSha256: "146e885ff840ca8260bfffdb31dac9d620f0622bf30f9c5b54409530d75f6e10"
  }),
  disposition: Object.freeze({
    path: `${PILOT_ROOT}/attempt-disposition.v1.json`,
    rawSha256: "a9de500e46aca1b9c9d6be100838d39e35d90e3b3cc57b0d8764a9f1dded9fc1"
  }),
  registry: Object.freeze({
    path: `${PILOT_ROOT}/lifecycle-registry.v1.json`,
    rawSha256: "3e13c8afa90a77a5ce8328bf75bd06f6f3e8a76aed20d0f023ebd1aa0fda698f"
  }),
  a11Postrun: Object.freeze({
    path: `${PILOT_ROOT}/postrun/a11-independent-replay.v1.json`,
    rawSha256: "6b1c3e9bf20179ac18e93d42a8bd93fdd88d30d133dd71ff4e1e804f889adc18"
  }),
  a22Postrun: Object.freeze({
    path: `${PILOT_ROOT}/postrun/a22-shadow-isolation.v1.json`,
    rawSha256: "370eec6b1a65029ea53b26784f65fac871cf88d99a3d81d4bf67f34a8faae5f3"
  })
});

export const FIXED_ATTEMPT = Object.freeze({
  gateId: "promotion-gate-shadow-v1",
  pilotUnitId: "us-ca-math-rag-v2-g6-ratios-v1",
  attemptId: "attempt-001",
  candidateDigest: "35c1d947840453fde081f80f32f1e0f47d080fdb6d2da2007f566084ebd780c7",
  sourceCommit: "b6c7c347a49a813e454e707dd3c16399dcf29909",
  targetBaselineCommit: "b6c7c347a49a813e454e707dd3c16399dcf29909",
  checkerVersion: "promotion-gate-shadow-v1",
  checkerBundleDigest: FROZEN_CORE_BUNDLE_DIGEST,
  evidenceIndexEntriesDigest: "11df85c78036d8cb009781d41c968e7d8b0edd8f9409a292f24b5071a427085b",
  canonicalRawReceiptDigest: "6599be3bb414e1737d631aaaa5a46ddc253ca4c26c605f3b842dceda2ae5aa92",
  independentRawReceiptDigest: "b230ee81e1cd37ddcb1c5dca773cff7fa9f0de5d90c30fc8aaea79f14498990a",
  semanticReceiptDigest: "e7be6e6db1031794b6522bedd7cc87496b2efa8832abf81ed43d58cf6a4f3316",
  dispositionDigest: "203911b6f84852090e4a66681bc56c1c547a221260abd4adfb4ba97f2c763688",
  registryDigest: "b0e1a03ae3e08419226e8e2fe7426f14ac3c62dd4502b0a8c767b004af5f4e16",
  terminalArtifacts: FIXED_TERMINAL_ARTIFACTS
});

const REPORT_PROOF_FIELD_BY_CHECK = Object.freeze({
  "terminal-attempt-binding": "terminalBindings",
  "audit-checker-release": "auditReleaseProof",
  "candidate-integrity": "candidateProof",
  "evidence-currentness": "evidenceProof",
  "selected-live-reachability": "liveProof",
  "legacy-ratchet": "legacyProof",
  "no-repository-mutation": "worktreeProof"
});

const TERMINAL_ARTIFACT_KEYS = Object.freeze(Object.keys(FIXED_TERMINAL_ARTIFACTS));
const RECEIPT_FIELDS = Object.freeze([
  "schemaVersion", "mode", "result", "exitReason", "manifest", "binding", "runMetadata",
  "worktreeProof", "checkerReleaseProof", "candidateProvenanceProof", "targetBaselineProof",
  "sourceSnapshots", "candidateSourceProof", "candidateInventoryProof", "evidenceIndexProof",
  "mappingCompatibility", "shadowOutput", "rollbackProof", "reachability", "legacyRatchetProof",
  "forbiddenDiff", "externalSideEffects", "noLiveAuthorizations", "lifecycleRecommendation",
  "liveBlockers", "unmetConditions", "nextOwner", "trustBoundary", "checkResults", "semanticReceiptDigest",
  "rawReceiptDigest"
]);

const REGISTERED_GIT_EXECUTABLE = "/usr/bin/git";
const REGISTERED_GIT_ENVIRONMENT = Object.freeze({
  PATH: "/usr/bin:/bin",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_OPTIONAL_LOCKS: "0",
  LC_ALL: "C"
});

const RELEASE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

export class PromotionTerminalAuditError extends Error {
  constructor(code, message, details = {}, outcome = "fail") {
    super(message);
    this.name = "PromotionTerminalAuditError";
    this.code = code;
    this.details = details;
    this.outcome = outcome;
  }
}

function assertExactKeys(value, expected, label, code = "AUDIT_CONTRACT_INVALID") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new PromotionTerminalAuditError(code, `${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (frozenCore.stableJson(actual) !== frozenCore.stableJson(wanted)) {
    throw new PromotionTerminalAuditError(code, `${label} has an unexpected field set.`, {
      actualFieldCount: actual.length,
      expectedFieldCount: wanted.length
    });
  }
}

function assertHex(value, length, label, code = "AUDIT_CONTRACT_INVALID") {
  const pattern = length === 40 ? /^[a-f0-9]{40}$/u : /^[a-f0-9]{64}$/u;
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new PromotionTerminalAuditError(code, `${label} must be lowercase ${length}-hex.`);
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function policyDigestPayload(policy) {
  const payload = cloneJson(policy);
  delete payload.policyDigest;
  return payload;
}

function attachPolicyDigest(policyWithoutDigest) {
  const payload = cloneJson(policyWithoutDigest);
  delete payload.policyDigest;
  return { ...payload, policyDigest: frozenCore.fingerprint(payload) };
}

export function createPolicyFixtureForTest({ releaseCommit, ledgerRawSha256, bundleDigest }) {
  return attachPolicyDigest({
    schemaVersion: AUDIT_POLICY_SCHEMA_VERSION,
    policyId: "us-ca-math-rag-v2-g6-ratios-v1-attempt-001-terminal-current-head-audit-v1",
    gateId: FIXED_ATTEMPT.gateId,
    pilotUnitId: FIXED_ATTEMPT.pilotUnitId,
    attemptId: FIXED_ATTEMPT.attemptId,
    candidateDigest: FIXED_ATTEMPT.candidateDigest,
    sourceCommit: FIXED_ATTEMPT.sourceCommit,
    targetBaselineCommit: FIXED_ATTEMPT.targetBaselineCommit,
    checkerVersion: FIXED_ATTEMPT.checkerVersion,
    terminalArtifacts: cloneJson(FIXED_TERMINAL_ARTIFACTS),
    auditRelease: {
      version: AUDIT_RELEASE_VERSION,
      releaseCommit,
      ledger: {
        path: AUDIT_RELEASE_LEDGER_PATH,
        rawSha256: ledgerRawSha256
      },
      bundleAlgorithm: "sha256-stable-json-path-raw-v1",
      bundleDigest,
      frozenCoreBundleDigest: FROZEN_CORE_BUNDLE_DIGEST
    },
    authorizations: {
      auditAllowed: true,
      shadowRetryAllowed: false,
      integrationAllowed: false,
      liveAllowed: false,
      previewAllowed: false,
      deployAllowed: false
    },
    liveAllowed: false,
    maturityClaim: "not-shadow-mature"
  });
}

export function validateAuditPolicy(policy) {
  assertExactKeys(policy, [
    "schemaVersion", "policyId", "gateId", "pilotUnitId", "attemptId", "candidateDigest",
    "sourceCommit", "targetBaselineCommit", "checkerVersion", "terminalArtifacts",
    "auditRelease", "authorizations", "liveAllowed", "maturityClaim", "policyDigest"
  ], "terminal current-HEAD audit policy", "AUDIT_POLICY_INVALID");
  if (
    policy.schemaVersion !== AUDIT_POLICY_SCHEMA_VERSION ||
    policy.policyId !== "us-ca-math-rag-v2-g6-ratios-v1-attempt-001-terminal-current-head-audit-v1" ||
    policy.gateId !== FIXED_ATTEMPT.gateId ||
    policy.pilotUnitId !== FIXED_ATTEMPT.pilotUnitId ||
    policy.attemptId !== FIXED_ATTEMPT.attemptId ||
    policy.candidateDigest !== FIXED_ATTEMPT.candidateDigest ||
    policy.sourceCommit !== FIXED_ATTEMPT.sourceCommit ||
    policy.targetBaselineCommit !== FIXED_ATTEMPT.targetBaselineCommit ||
    policy.checkerVersion !== FIXED_ATTEMPT.checkerVersion
  ) {
    throw new PromotionTerminalAuditError(
      "AUDIT_POLICY_ATTEMPT_REMAP",
      "Audit policy cannot remap the compiled immutable attempt allowlist."
    );
  }
  assertExactKeys(
    policy.terminalArtifacts,
    TERMINAL_ARTIFACT_KEYS,
    "terminalArtifacts",
    "AUDIT_POLICY_INVALID"
  );
  for (const key of TERMINAL_ARTIFACT_KEYS) {
    assertExactKeys(policy.terminalArtifacts[key], ["path", "rawSha256"], `terminalArtifacts.${key}`, "AUDIT_POLICY_INVALID");
    if (frozenCore.stableJson(policy.terminalArtifacts[key]) !== frozenCore.stableJson(FIXED_TERMINAL_ARTIFACTS[key])) {
      throw new PromotionTerminalAuditError(
        "AUDIT_POLICY_ATTEMPT_REMAP",
        "Audit policy cannot remap an immutable attempt artifact.",
        { artifact: key }
      );
    }
  }
  assertExactKeys(policy.auditRelease, [
    "version", "releaseCommit", "ledger", "bundleAlgorithm", "bundleDigest", "frozenCoreBundleDigest"
  ], "auditRelease", "AUDIT_POLICY_INVALID");
  assertExactKeys(policy.auditRelease.ledger, ["path", "rawSha256"], "auditRelease.ledger", "AUDIT_POLICY_INVALID");
  assertHex(policy.auditRelease.releaseCommit, 40, "auditRelease.releaseCommit", "AUDIT_POLICY_INVALID");
  assertHex(policy.auditRelease.ledger.rawSha256, 64, "auditRelease.ledger.rawSha256", "AUDIT_POLICY_INVALID");
  assertHex(policy.auditRelease.bundleDigest, 64, "auditRelease.bundleDigest", "AUDIT_POLICY_INVALID");
  if (
    policy.auditRelease.version !== AUDIT_RELEASE_VERSION ||
    policy.auditRelease.ledger.path !== AUDIT_RELEASE_LEDGER_PATH ||
    policy.auditRelease.bundleAlgorithm !== "sha256-stable-json-path-raw-v1" ||
    policy.auditRelease.frozenCoreBundleDigest !== FROZEN_CORE_BUNDLE_DIGEST
  ) {
    throw new PromotionTerminalAuditError(
      "AUDIT_POLICY_RELEASE_REMAP",
      "Audit policy does not bind the fixed terminal audit release contract.",
      {},
      "blocked"
    );
  }
  assertExactKeys(policy.authorizations, [
    "auditAllowed", "shadowRetryAllowed", "integrationAllowed", "liveAllowed",
    "previewAllowed", "deployAllowed"
  ], "authorizations", "AUDIT_POLICY_INVALID");
  if (
    policy.authorizations.auditAllowed !== true ||
    policy.authorizations.shadowRetryAllowed !== false ||
    policy.authorizations.integrationAllowed !== false ||
    policy.authorizations.liveAllowed !== false ||
    policy.authorizations.previewAllowed !== false ||
    policy.authorizations.deployAllowed !== false ||
    policy.liveAllowed !== false ||
    policy.maturityClaim !== "not-shadow-mature"
  ) {
    throw new PromotionTerminalAuditError(
      "AUDIT_POLICY_AUTHORIZATION_INVALID",
      "Terminal audit policy must remain read-only, non-live, and non-promotional."
    );
  }
  assertHex(policy.policyDigest, 64, "policyDigest", "AUDIT_POLICY_INVALID");
  if (policy.policyDigest !== frozenCore.fingerprint(policyDigestPayload(policy))) {
    throw new PromotionTerminalAuditError("AUDIT_POLICY_DIGEST_MISMATCH", "Audit policy self-digest is stale.");
  }
  return policy;
}

function auditDigestPayloads(reportWithoutDigests) {
  const rawPayload = cloneJson(reportWithoutDigests);
  const semanticPayload = cloneJson(reportWithoutDigests);
  delete semanticPayload.runMetadata;
  return { rawPayload, semanticPayload };
}

export function attachAuditDigests(reportWithoutDigests) {
  if (
    reportWithoutDigests === null ||
    typeof reportWithoutDigests !== "object" ||
    Array.isArray(reportWithoutDigests) ||
    Object.hasOwn(reportWithoutDigests, "rawAuditDigest") ||
    Object.hasOwn(reportWithoutDigests, "semanticAuditDigest")
  ) {
    throw new PromotionTerminalAuditError(
      "AUDIT_REPORT_INVALID",
      "Audit digests can only be attached once to a plain report payload."
    );
  }
  const base = cloneJson(reportWithoutDigests);
  const { rawPayload, semanticPayload } = auditDigestPayloads(base);
  return {
    ...base,
    semanticAuditDigest: frozenCore.fingerprint(semanticPayload),
    rawAuditDigest: frozenCore.fingerprint(rawPayload)
  };
}

const AUDIT_REPORT_FIELDS = Object.freeze([
  "schemaVersion", "auditVersion", "gateId", "pilotUnitId", "attemptId", "candidateDigest",
  "sourceCommit", "targetBaselineCommit", "policy", "targetHead", "expectedHead", "result",
  "exitReason", "checks", "terminalBindings", "auditReleaseProof", "candidateProof",
  "evidenceProof", "liveProof", "legacyProof", "worktreeProof", "liveAllowed", "maturityClaim",
  "terminalAttemptState", "runMetadata", "semanticAuditDigest", "rawAuditDigest"
]);

export function validateAuditReport(report) {
  assertExactKeys(report, AUDIT_REPORT_FIELDS, "terminal current-HEAD audit report", "AUDIT_REPORT_INVALID");
  if (
    report.schemaVersion !== AUDIT_SCHEMA_VERSION ||
    report.auditVersion !== AUDIT_RELEASE_VERSION ||
    report.gateId !== FIXED_ATTEMPT.gateId ||
    report.pilotUnitId !== FIXED_ATTEMPT.pilotUnitId ||
    report.attemptId !== FIXED_ATTEMPT.attemptId ||
    report.candidateDigest !== FIXED_ATTEMPT.candidateDigest ||
    report.sourceCommit !== FIXED_ATTEMPT.sourceCommit ||
    report.targetBaselineCommit !== FIXED_ATTEMPT.targetBaselineCommit ||
    report.liveAllowed !== false ||
    report.maturityClaim !== "not-shadow-mature" ||
    report.terminalAttemptState !== "repair_required" ||
    !["pass", "fail", "blocked", "internal"].includes(report.result)
  ) {
    throw new PromotionTerminalAuditError("AUDIT_REPORT_INVALID", "Audit report fixed bindings or result are invalid.");
  }
  assertExactKeys(report.policy, ["path", "rawSha256", "policyDigest"], "audit report policy", "AUDIT_REPORT_INVALID");
  frozenCore.assertSafeRepoRelativePath(report.policy.path);
  for (const [field, value] of [
    ["candidateDigest", report.candidateDigest],
    ["policy.rawSha256", report.policy.rawSha256],
    ["policy.policyDigest", report.policy.policyDigest],
    ["semanticAuditDigest", report.semanticAuditDigest],
    ["rawAuditDigest", report.rawAuditDigest]
  ]) assertHex(value, 64, field, "AUDIT_REPORT_INVALID");
  for (const [field, value] of [
    ["targetHead", report.targetHead],
    ["expectedHead", report.expectedHead],
    ["sourceCommit", report.sourceCommit],
    ["targetBaselineCommit", report.targetBaselineCommit]
  ]) assertHex(value, 40, field, "AUDIT_REPORT_INVALID");
  if (
    !Array.isArray(report.checks) ||
    report.checks.length !== AUDIT_CHECK_IDS.length ||
    frozenCore.stableJson(report.checks.map(({ checkId }) => checkId)) !== frozenCore.stableJson(AUDIT_CHECK_IDS)
  ) {
    throw new PromotionTerminalAuditError("AUDIT_REPORT_INVALID", "Audit report check ordering is invalid.");
  }
  for (const check of report.checks) {
    assertExactKeys(
      check,
      ["checkId", "result", "code", "message", "details", "evidenceDigest"],
      `audit check ${check?.checkId ?? "unknown"}`,
      "AUDIT_REPORT_INVALID"
    );
    if (
      !["pass", "fail", "blocked", "internal"].includes(check.result) ||
      typeof check.code !== "string" || check.code.length === 0 ||
      typeof check.message !== "string" || check.message.length === 0 ||
      check.details === null || typeof check.details !== "object" || Array.isArray(check.details)
    ) {
      throw new PromotionTerminalAuditError("AUDIT_REPORT_INVALID", "Audit check record is malformed.");
    }
    const expectedCheck = checkRecord(check.checkId, check.result, check.code, check.message, check.details);
    if (check.evidenceDigest !== expectedCheck.evidenceDigest) {
      throw new PromotionTerminalAuditError("AUDIT_REPORT_DIGEST_MISMATCH", "Audit check digest is stale.");
    }
  }
  const selectedExit = chooseExitReason(report.checks);
  if (
    (selectedExit === null && (report.result !== "pass" || report.exitReason !== null)) ||
    (selectedExit !== null && (
      report.result !== report.checks.find(({ checkId }) => checkId === selectedExit.checkId)?.result ||
      frozenCore.stableJson(report.exitReason) !== frozenCore.stableJson(selectedExit)
    ))
  ) {
    throw new PromotionTerminalAuditError("AUDIT_REPORT_INVALID", "Audit report result and exit reason disagree with checks.");
  }
  const withoutDigests = cloneJson(report);
  delete withoutDigests.semanticAuditDigest;
  delete withoutDigests.rawAuditDigest;
  const expected = attachAuditDigests(withoutDigests);
  if (
    expected.semanticAuditDigest !== report.semanticAuditDigest ||
    expected.rawAuditDigest !== report.rawAuditDigest
  ) {
    throw new PromotionTerminalAuditError("AUDIT_REPORT_DIGEST_MISMATCH", "Audit report digest is stale.");
  }
  return report;
}

function normalizeAuditError(error) {
  if (error instanceof PromotionTerminalAuditError) return error;
  if (error instanceof frozenCore.PromotionGateError) {
    return new PromotionTerminalAuditError(
      error.code,
      error.message,
      error.details ?? {},
      error.outcome === "blocked" ? "blocked" : "fail"
    );
  }
  return new PromotionTerminalAuditError(
    "AUDIT_INTERNAL_ERROR",
    "Terminal current-HEAD audit encountered an internal error.",
    {},
    "internal"
  );
}

function checkRecord(checkId, result, code, message, details) {
  const payload = { checkId, result, code, message, details: cloneJson(details ?? {}) };
  return { ...payload, evidenceDigest: frozenCore.fingerprint(payload) };
}

function chooseExitReason(checks) {
  for (const result of ["internal", "fail", "blocked"]) {
    const selected = checks.find((check) => check.result === result);
    if (selected) {
      return {
        checkId: selected.checkId,
        code: selected.code,
        message: selected.message,
        details: cloneJson(selected.details)
      };
    }
  }
  return null;
}

export async function runOrderedAuditForTest({
  targetHead,
  expectedHead,
  policyRawSha256,
  policySelfDigest,
  policyPath = DEFAULT_POLICY_PATH,
  runMetadata,
  operations
}) {
  const checks = [];
  const proofs = Object.fromEntries(Object.values(REPORT_PROOF_FIELD_BY_CHECK).map((field) => [field, null]));
  for (const checkId of AUDIT_CHECK_IDS) {
    try {
      const proof = await operations[checkId]();
      proofs[REPORT_PROOF_FIELD_BY_CHECK[checkId]] = cloneJson(proof);
      checks.push(checkRecord(checkId, "pass", "PASS", `${checkId} passed.`, proof));
    } catch (caught) {
      const error = normalizeAuditError(caught);
      const result = ["fail", "blocked", "internal"].includes(error.outcome) ? error.outcome : "internal";
      proofs[REPORT_PROOF_FIELD_BY_CHECK[checkId]] = cloneJson(error.details ?? {});
      checks.push(checkRecord(checkId, result, error.code, error.message, error.details));
    }
  }
  const exitReason = chooseExitReason(checks);
  const result = exitReason === null
    ? "pass"
    : checks.find(({ checkId }) => checkId === exitReason.checkId).result;
  return validateAuditReport(attachAuditDigests({
    schemaVersion: AUDIT_SCHEMA_VERSION,
    auditVersion: AUDIT_RELEASE_VERSION,
    gateId: FIXED_ATTEMPT.gateId,
    pilotUnitId: FIXED_ATTEMPT.pilotUnitId,
    attemptId: FIXED_ATTEMPT.attemptId,
    candidateDigest: FIXED_ATTEMPT.candidateDigest,
    sourceCommit: FIXED_ATTEMPT.sourceCommit,
    targetBaselineCommit: FIXED_ATTEMPT.targetBaselineCommit,
    policy: {
      path: policyPath,
      rawSha256: policyRawSha256,
      policyDigest: policySelfDigest
    },
    targetHead,
    expectedHead,
    result,
    exitReason,
    checks,
    ...proofs,
    liveAllowed: false,
    maturityClaim: "not-shadow-mature",
    terminalAttemptState: "repair_required",
    runMetadata: cloneJson(runMetadata)
  }));
}

function runRegisteredGitProbe(cwd, args) {
  return new Promise((resolve, reject) => {
    execFile(REGISTERED_GIT_EXECUTABLE, args, {
      cwd,
      env: REGISTERED_GIT_ENVIRONMENT,
      encoding: null,
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true
    }, (error, stdout) => {
      if (error) reject(error);
      else resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout ?? ""));
    });
  });
}

function singleGitLine(bytes, label) {
  const source = frozenCore.decodeCanonicalUtf8(bytes, "AUDIT_GIT_PROOF_INVALID", label);
  if (!source.endsWith("\n") || source.includes("\0") || source.slice(0, -1).includes("\n")) {
    throw new PromotionTerminalAuditError(
      "AUDIT_GIT_PROOF_INVALID",
      `${label} returned ambiguous output.`,
      {},
      "blocked"
    );
  }
  return source.slice(0, -1);
}

function parseNulList(bytes, label) {
  if (bytes.length === 0) return [];
  if (bytes.at(-1) !== 0) {
    throw new PromotionTerminalAuditError(
      "AUDIT_GIT_PROOF_INVALID",
      `${label} returned ambiguous NUL framing.`,
      {},
      "blocked"
    );
  }
  return frozenCore.decodeCanonicalUtf8(bytes.subarray(0, -1), "AUDIT_GIT_PROOF_INVALID", label).split("\0");
}

export async function collectIndexSafetyProof(repoRoot) {
  const entries = parseNulList(
    await runRegisteredGitProbe(repoRoot, ["ls-files", "-v", "-z", "--"]),
    "git ls-files flags"
  );
  const paths = [];
  const folded = new Set();
  const unsafeFlags = [];
  for (const entry of entries) {
    if (!/^[A-Za-z?] /u.test(entry)) {
      throw new PromotionTerminalAuditError(
        "AUDIT_GIT_PROOF_INVALID",
        "Git index flag output has an unknown record shape.",
        {},
        "blocked"
      );
    }
    const tag = entry[0];
    const trackedPath = entry.slice(2);
    frozenCore.assertSafeRepoRelativePath(trackedPath);
    if (tag === "S" || tag === tag.toLocaleLowerCase("en-US")) {
      unsafeFlags.push({ tag, pathDigest: frozenCore.fingerprint(trackedPath) });
    }
    const foldedPath = trackedPath.toLocaleLowerCase("en-US");
    if (folded.has(foldedPath)) {
      throw new PromotionTerminalAuditError(
        "PATH_CASE_COLLISION",
        "Tracked repository paths contain a case collision."
      );
    }
    folded.add(foldedPath);
    paths.push(trackedPath);
  }
  if (unsafeFlags.length > 0) {
    throw new PromotionTerminalAuditError(
      "INDEX_HIDDEN_PATH",
      "skip-worktree or assume-unchanged hides one or more tracked paths.",
      { unsafeFlagCount: unsafeFlags.length, unsafeFlagsDigest: frozenCore.fingerprint(unsafeFlags) },
      "blocked"
    );
  }
  return {
    trackedPathCount: paths.length,
    trackedPathsDigest: frozenCore.fingerprint(paths),
    unsafeFlagCount: 0,
    caseCollisionCount: 0
  };
}

async function loadBoundJson(repoRoot, binding, label) {
  const loaded = await frozenCore.readAuthoritativeFile(repoRoot, binding.path);
  if (loaded.rawSha256 !== binding.rawSha256) {
    throw new PromotionTerminalAuditError(
      "TERMINAL_BINDING_DRIFT",
      `${label} bytes differ from the compiled immutable attempt binding.`,
      { artifact: label }
    );
  }
  const value = frozenCore.parseCanonicalJsonBytes(
    loaded.bytes,
    "TERMINAL_JSON_INVALID",
    label
  );
  return { ...loaded, value };
}

function validateReceiptDigestPair(receipt, rawBytes, expectedRawDigest, label) {
  assertExactKeys(receipt, RECEIPT_FIELDS, label, "TERMINAL_RECEIPT_INVALID");
  const withoutDigests = cloneJson(receipt);
  delete withoutDigests.semanticReceiptDigest;
  delete withoutDigests.rawReceiptDigest;
  const reattached = frozenCore.attachReceiptDigests(withoutDigests);
  if (
    receipt.schemaVersion !== "promotion-receipt.v1" ||
    receipt.mode !== "shadow" ||
    receipt.result !== "fail" ||
    receipt.exitReason?.checkId !== "legacy-ratchet" ||
    receipt.exitReason?.code !== "LEGACY_NEW_CONFLICT" ||
    receipt.binding?.gateId !== FIXED_ATTEMPT.gateId ||
    receipt.binding?.pilotUnitId !== FIXED_ATTEMPT.pilotUnitId ||
    receipt.binding?.attemptId !== FIXED_ATTEMPT.attemptId ||
    receipt.binding?.candidateDigest !== FIXED_ATTEMPT.candidateDigest ||
    receipt.binding?.sourceCommit !== FIXED_ATTEMPT.sourceCommit ||
    receipt.binding?.targetBaselineCommit !== FIXED_ATTEMPT.targetBaselineCommit ||
    receipt.binding?.checkerVersion !== FIXED_ATTEMPT.checkerVersion ||
    receipt.binding?.checkerRelease?.bundleDigest !== FIXED_ATTEMPT.checkerBundleDigest ||
    receipt.rawReceiptDigest !== expectedRawDigest ||
    receipt.semanticReceiptDigest !== FIXED_ATTEMPT.semanticReceiptDigest ||
    reattached.rawReceiptDigest !== receipt.rawReceiptDigest ||
    reattached.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    receipt.noLiveAuthorizations?.integration !== false ||
    receipt.noLiveAuthorizations?.live !== false ||
    receipt.noLiveAuthorizations?.preview !== false ||
    receipt.noLiveAuthorizations?.deploy !== false ||
    receipt.lifecycleRecommendation?.currentState !== "shadow_ready" ||
    receipt.lifecycleRecommendation?.suggestedTransition !== null ||
    frozenCore.sha256(rawBytes) !== (label === "canonical Receipt"
      ? FIXED_TERMINAL_ARTIFACTS.canonicalReceipt.rawSha256
      : FIXED_TERMINAL_ARTIFACTS.independentReceipt.rawSha256)
  ) {
    throw new PromotionTerminalAuditError(
      "TERMINAL_RECEIPT_INVALID",
      `${label} does not bind the exact failed Shadow attempt.`
    );
  }
  return receipt;
}

function validatePostrunEvidence(a11, a22, canonicalReceipt, independentReceipt) {
  const common = {
    pilotUnitId: FIXED_ATTEMPT.pilotUnitId,
    attemptId: FIXED_ATTEMPT.attemptId,
    candidateDigest: FIXED_ATTEMPT.candidateDigest,
    sourceCommit: FIXED_ATTEMPT.sourceCommit,
    targetBaselineCommit: FIXED_ATTEMPT.targetBaselineCommit,
    checkerVersion: FIXED_ATTEMPT.checkerVersion,
    canonicalRunId: canonicalReceipt.runMetadata.runId,
    independentRunId: independentReceipt.runMetadata.runId,
    canonicalRawReceiptDigest: FIXED_ATTEMPT.canonicalRawReceiptDigest,
    independentRawReceiptDigest: FIXED_ATTEMPT.independentRawReceiptDigest,
    semanticReceiptDigest: FIXED_ATTEMPT.semanticReceiptDigest
  };
  assertExactKeys(a11, [
    "schemaVersion", "role", "result", ...Object.keys(common), "distinctRunIds",
    "semanticMatch", "independentReplayCompleted"
  ], "A11 postrun evidence", "TERMINAL_POSTRUN_INVALID");
  assertExactKeys(a22, [
    "schemaVersion", "role", "result", ...Object.keys(common), "shadowExecuted",
    "rollbackRehearsed", "replayCompleted", "noDeployment", "noProductionWrite"
  ], "A22 postrun evidence", "TERMINAL_POSTRUN_INVALID");
  const a11Expected = {
    schemaVersion: "promotion-a11-postrun.v1",
    role: "A11",
    result: "pass",
    ...common,
    distinctRunIds: true,
    semanticMatch: true,
    independentReplayCompleted: true
  };
  const a22Expected = {
    schemaVersion: "promotion-a22-postrun.v1",
    role: "A22",
    result: "pass",
    ...common,
    shadowExecuted: true,
    rollbackRehearsed: true,
    replayCompleted: true,
    noDeployment: true,
    noProductionWrite: true
  };
  if (
    frozenCore.stableJson(a11) !== frozenCore.stableJson(a11Expected) ||
    frozenCore.stableJson(a22) !== frozenCore.stableJson(a22Expected) ||
    canonicalReceipt.runMetadata.runId === independentReceipt.runMetadata.runId
  ) {
    throw new PromotionTerminalAuditError(
      "TERMINAL_POSTRUN_INVALID",
      "A11/A22 postrun records do not independently bind the failed Receipt pair."
    );
  }
}

async function validateTerminalBinding(
  repoRoot,
  policy,
  preWorktree,
  preIndexSafety,
  { verifyTracked = true } = {}
) {
  const trackedInputPaths = [
    DEFAULT_POLICY_PATH,
    ...TERMINAL_ARTIFACT_KEYS.map((key) => policy.terminalArtifacts[key].path)
  ];
  const trackedInputProof = verifyTracked
    ? await frozenCore.collectTrackedInputProof(repoRoot, trackedInputPaths)
    : null;
  const manifestLoaded = await loadBoundJson(repoRoot, policy.terminalArtifacts.manifest, "manifest");
  const { manifest, manifestDigest } = await frozenCore.loadPromotionManifest(
    repoRoot,
    policy.terminalArtifacts.manifest.path
  );
  if (manifestDigest !== manifestLoaded.rawSha256) {
    throw new PromotionTerminalAuditError("TERMINAL_BINDING_DRIFT", "Manifest loaders disagree on bytes.");
  }
  const evidenceIndexLoaded = await loadBoundJson(repoRoot, policy.terminalArtifacts.evidenceIndex, "evidence index");
  frozenCore.validatePromotionEvidenceIndex(evidenceIndexLoaded.value, manifest);
  if (evidenceIndexLoaded.value.entriesDigest !== FIXED_ATTEMPT.evidenceIndexEntriesDigest) {
    throw new PromotionTerminalAuditError("TERMINAL_BINDING_DRIFT", "Evidence index entries digest changed.");
  }
  const canonicalLoaded = await loadBoundJson(repoRoot, policy.terminalArtifacts.canonicalReceipt, "canonical Receipt");
  const independentLoaded = await loadBoundJson(repoRoot, policy.terminalArtifacts.independentReceipt, "independent Receipt");
  const canonicalReceipt = validateReceiptDigestPair(
    canonicalLoaded.value,
    canonicalLoaded.bytes,
    FIXED_ATTEMPT.canonicalRawReceiptDigest,
    "canonical Receipt"
  );
  const independentReceipt = validateReceiptDigestPair(
    independentLoaded.value,
    independentLoaded.bytes,
    FIXED_ATTEMPT.independentRawReceiptDigest,
    "independent Receipt"
  );
  if (canonicalReceipt.semanticReceiptDigest !== independentReceipt.semanticReceiptDigest) {
    throw new PromotionTerminalAuditError("TERMINAL_RECEIPT_INVALID", "Independent Receipt semantic digest differs.");
  }
  const [a18Loaded, a23Loaded, dispositionLoaded, registryLoaded, a11Loaded, a22Loaded] = await Promise.all([
    loadBoundJson(repoRoot, policy.terminalArtifacts.a18Authority, "A18 disposition authority"),
    loadBoundJson(repoRoot, policy.terminalArtifacts.a23Authority, "A23 disposition authority"),
    loadBoundJson(repoRoot, policy.terminalArtifacts.disposition, "attempt disposition"),
    loadBoundJson(repoRoot, policy.terminalArtifacts.registry, "lifecycle registry"),
    loadBoundJson(repoRoot, policy.terminalArtifacts.a11Postrun, "A11 postrun evidence"),
    loadBoundJson(repoRoot, policy.terminalArtifacts.a22Postrun, "A22 postrun evidence")
  ]);
  const a18Bound = { rawBytes: a18Loaded.bytes, value: a18Loaded.value };
  const a23Bound = { rawBytes: a23Loaded.bytes, value: a23Loaded.value };
  frozenCore.validatePromotionDisposition(dispositionLoaded.value, {
    manifest,
    receipt: canonicalReceipt,
    receiptRawBytes: canonicalLoaded.bytes,
    a18Authority: a18Bound,
    a23Authority: a23Bound
  });
  if (dispositionLoaded.value.dispositionDigest !== FIXED_ATTEMPT.dispositionDigest) {
    throw new PromotionTerminalAuditError("TERMINAL_BINDING_DRIFT", "Disposition digest changed.");
  }
  frozenCore.validatePromotionLifecycleRegistry(registryLoaded.value, {
    manifest,
    evidenceIndex: evidenceIndexLoaded.value,
    manifestPath: policy.terminalArtifacts.manifest.path,
    manifestRawSha256: policy.terminalArtifacts.manifest.rawSha256,
    disposition: dispositionLoaded.value,
    dispositionPath: policy.terminalArtifacts.disposition.path,
    receipt: canonicalReceipt,
    receiptRawBytes: canonicalLoaded.bytes,
    a18Authority: a18Bound,
    a23Authority: a23Bound
  });
  if (
    registryLoaded.value.registryDigest !== FIXED_ATTEMPT.registryDigest ||
    registryLoaded.value.pilotUnitStatus !== "repair_required" ||
    registryLoaded.value.liveAllowed !== false ||
    registryLoaded.value.maturityClaim !== "not-shadow-mature"
  ) {
    throw new PromotionTerminalAuditError(
      "TERMINAL_BINDING_DRIFT",
      "Lifecycle registry no longer records the immutable repair_required state."
    );
  }
  validatePostrunEvidence(a11Loaded.value, a22Loaded.value, canonicalReceipt, independentReceipt);
  return {
    manifest,
    evidenceIndex: evidenceIndexLoaded.value,
    canonicalReceipt,
    independentReceipt,
    proof: {
      terminalState: "repair_required",
      gateResult: "fail",
      reasonCode: "LEGACY_NEW_CONFLICT",
      manifestRawSha256: manifestLoaded.rawSha256,
      evidenceIndexRawSha256: evidenceIndexLoaded.rawSha256,
      canonicalReceiptRawSha256: canonicalLoaded.rawSha256,
      independentReceiptRawSha256: independentLoaded.rawSha256,
      canonicalRawReceiptDigest: canonicalReceipt.rawReceiptDigest,
      independentRawReceiptDigest: independentReceipt.rawReceiptDigest,
      semanticReceiptDigest: canonicalReceipt.semanticReceiptDigest,
      dispositionDigest: dispositionLoaded.value.dispositionDigest,
      registryDigest: registryLoaded.value.registryDigest,
      a11PostrunRawSha256: a11Loaded.rawSha256,
      a22PostrunRawSha256: a22Loaded.rawSha256,
      trackedPathCount: preIndexSafety.trackedPathCount,
      trackedInputCount: trackedInputProof?.trackedInputCount ?? null,
      trackedInputAggregateDigest: trackedInputProof?.trackedInputAggregateDigest ?? null,
      liveAllowed: false,
      newAttemptRequired: true
    }
  };
}

export async function validateCompiledTerminalArtifactsForTest(repoRoot) {
  const indexSafety = await collectIndexSafetyProof(repoRoot);
  const policy = createPolicyFixtureForTest({
    releaseCommit: "a".repeat(40),
    ledgerRawSha256: "a".repeat(64),
    bundleDigest: "b".repeat(64)
  });
  const terminal = await validateTerminalBinding(
    repoRoot,
    policy,
    { clean: true },
    indexSafety,
    { verifyTracked: false }
  );
  return terminal.proof;
}

function validateReleaseLedger(ledger) {
  assertExactKeys(ledger, ["schemaVersion", "entries"], "terminal audit release ledger", "AUDIT_RELEASE_LEDGER_INVALID");
  if (
    ledger.schemaVersion !== AUDIT_RELEASE_LEDGER_SCHEMA_VERSION ||
    !Array.isArray(ledger.entries) ||
    ledger.entries.length !== 1
  ) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_LEDGER_INVALID",
      "Terminal audit release ledger must contain exactly one v1 entry.",
      {},
      "blocked"
    );
  }
  const entry = ledger.entries[0];
  assertExactKeys(entry, [
    "version", "bundleAlgorithm", "auditBundlePaths", "auditBundleFiles", "auditBundleDigest",
    "frozenCoreBundlePaths", "frozenCoreBundleFiles", "frozenCoreBundleDigest"
  ], "terminal audit release entry", "AUDIT_RELEASE_LEDGER_INVALID");
  if (
    entry.version !== AUDIT_RELEASE_VERSION ||
    entry.bundleAlgorithm !== "sha256-stable-json-path-raw-v1" ||
    frozenCore.stableJson(entry.auditBundlePaths) !== frozenCore.stableJson(AUDIT_BUNDLE_PATHS) ||
    frozenCore.stableJson(entry.frozenCoreBundlePaths) !== frozenCore.stableJson(FROZEN_CORE_BUNDLE_PATHS) ||
    !Array.isArray(entry.auditBundleFiles) ||
    !Array.isArray(entry.frozenCoreBundleFiles) ||
    entry.auditBundleFiles.length !== AUDIT_BUNDLE_PATHS.length ||
    entry.frozenCoreBundleFiles.length !== FROZEN_CORE_BUNDLE_PATHS.length
  ) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_LEDGER_INVALID",
      "Terminal audit release entry does not bind the exact v1 path sets.",
      {},
      "blocked"
    );
  }
  for (const binding of [...entry.auditBundleFiles, ...entry.frozenCoreBundleFiles]) {
    assertExactKeys(binding, ["path", "rawSha256"], "release bundle binding", "AUDIT_RELEASE_LEDGER_INVALID");
    frozenCore.assertSafeRepoRelativePath(binding.path);
    assertHex(binding.rawSha256, 64, "release bundle rawSha256", "AUDIT_RELEASE_LEDGER_INVALID");
  }
  if (
    frozenCore.stableJson(entry.auditBundleFiles.map(({ path: filePath }) => filePath)) !== frozenCore.stableJson(AUDIT_BUNDLE_PATHS) ||
    frozenCore.stableJson(entry.frozenCoreBundleFiles.map(({ path: filePath }) => filePath)) !== frozenCore.stableJson(FROZEN_CORE_BUNDLE_PATHS) ||
    frozenCore.fingerprint(entry.auditBundleFiles) !== entry.auditBundleDigest ||
    frozenCore.fingerprint(entry.frozenCoreBundleFiles) !== entry.frozenCoreBundleDigest ||
    entry.frozenCoreBundleDigest !== FROZEN_CORE_BUNDLE_DIGEST ||
    frozenCore.stableJson(Object.fromEntries(entry.frozenCoreBundleFiles.map(({ path: filePath, rawSha256 }) => [filePath, rawSha256]))) !== frozenCore.stableJson(FROZEN_CORE_RAW_SHA256)
  ) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_BUNDLE_MISMATCH",
      "Terminal audit release bundle digests are inconsistent.",
      {},
      "blocked"
    );
  }
  return entry;
}

async function readOwnFrozenFile(relativePath) {
  frozenCore.assertSafeRepoRelativePath(relativePath);
  const candidate = path.join(RELEASE_ROOT, relativePath);
  let current = RELEASE_ROOT;
  for (const segment of relativePath.split("/")) {
    current = path.join(current, segment);
    const entry = await lstat(current);
    if (entry.isSymbolicLink()) {
      throw new PromotionTerminalAuditError(
        "AUDIT_RELEASE_ROOT_UNSAFE",
        "Terminal audit release bundle cannot contain symlinks.",
        {},
        "blocked"
      );
    }
  }
  const canonicalRoot = await realpath(RELEASE_ROOT);
  const canonicalFile = await realpath(candidate);
  const relative = path.relative(canonicalRoot, canonicalFile);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_ROOT_UNSAFE",
      "Terminal audit release bundle escaped its release root.",
      {},
      "blocked"
    );
  }
  return readFile(canonicalFile);
}

async function validateAuditRelease(targetRoot, targetHead, policy) {
  const release = policy.auditRelease;
  const releaseState = await frozenCore.collectGitWorktreeState(RELEASE_ROOT);
  if (!releaseState.clean || releaseState.headCommit !== release.releaseCommit) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_WORKTREE_MISMATCH",
      "The audit CLI must run from its exact clean frozen release worktree.",
      {
        expectedReleaseCommit: release.releaseCommit,
        actualReleaseCommit: releaseState.headCommit,
        clean: releaseState.clean
      },
      "blocked"
    );
  }
  const releaseIndexProof = await collectIndexSafetyProof(RELEASE_ROOT);
  try {
    await runRegisteredGitProbe(targetRoot, ["cat-file", "-e", `${release.releaseCommit}^{commit}`]);
    await runRegisteredGitProbe(targetRoot, ["merge-base", "--is-ancestor", release.releaseCommit, targetHead]);
  } catch {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_NOT_ANCESTOR",
      "Terminal audit release commit is missing or not an ancestor of target HEAD.",
      {},
      "blocked"
    );
  }
  const currentLedger = await frozenCore.readAuthoritativeFile(targetRoot, release.ledger.path);
  if (currentLedger.rawSha256 !== release.ledger.rawSha256) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_REMAPPED",
      "Current terminal audit ledger differs from the policy binding.",
      {},
      "blocked"
    );
  }
  let releaseLedgerBytes;
  try {
    releaseLedgerBytes = await runRegisteredGitProbe(
      targetRoot,
      ["show", "--no-textconv", `${release.releaseCommit}:${release.ledger.path}`]
    );
  } catch {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_LEDGER_MISSING",
      "Terminal audit ledger is absent from the release commit.",
      {},
      "blocked"
    );
  }
  if (frozenCore.sha256(releaseLedgerBytes) !== currentLedger.rawSha256) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_REMAPPED",
      "Terminal audit ledger differs between release and target HEAD.",
      {},
      "blocked"
    );
  }
  const ledger = frozenCore.parseCanonicalJsonBytes(
    currentLedger.bytes,
    "AUDIT_RELEASE_LEDGER_INVALID",
    "Terminal audit release ledger"
  );
  const entry = validateReleaseLedger(ledger);
  if (
    entry.auditBundleDigest !== release.bundleDigest ||
    entry.frozenCoreBundleDigest !== release.frozenCoreBundleDigest
  ) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_REMAPPED",
      "Policy audit release digests differ from the ledger.",
      {},
      "blocked"
    );
  }
  const { releaseParentCommit } = await collectLedgerOnlyReleaseProof(
    targetRoot,
    release.releaseCommit,
    AUDIT_RELEASE_LEDGER_PATH
  );
  const ownBundleBytes = new Map();
  for (const binding of [...entry.auditBundleFiles, ...entry.frozenCoreBundleFiles]) {
    const [ownBytes, releaseBytes, parentBytes] = await Promise.all([
      readOwnFrozenFile(binding.path),
      runRegisteredGitProbe(targetRoot, ["show", "--no-textconv", `${release.releaseCommit}:${binding.path}`]),
      runRegisteredGitProbe(targetRoot, ["show", "--no-textconv", `${releaseParentCommit}:${binding.path}`])
    ]);
    if (
      frozenCore.sha256(ownBytes) !== binding.rawSha256 ||
      frozenCore.sha256(releaseBytes) !== binding.rawSha256 ||
      frozenCore.sha256(parentBytes) !== binding.rawSha256
    ) {
      throw new PromotionTerminalAuditError(
        "AUDIT_RELEASE_BUNDLE_MISMATCH",
        "Running audit bundle differs from the ledger-only release bytes.",
        { pathDigest: frozenCore.fingerprint(binding.path) },
        "blocked"
      );
    }
    ownBundleBytes.set(binding.path, ownBytes);
  }
  const capabilityProof = auditCapabilitySources({
    librarySource: frozenCore.decodeCanonicalUtf8(
      ownBundleBytes.get(AUDIT_BUNDLE_PATHS[0]),
      "AUDIT_CAPABILITY_SOURCE_INVALID",
      "Terminal audit library"
    ),
    cliSource: frozenCore.decodeCanonicalUtf8(
      ownBundleBytes.get(AUDIT_BUNDLE_PATHS[1]),
      "AUDIT_CAPABILITY_SOURCE_INVALID",
      "Terminal audit CLI"
    )
  });
  if (capabilityProof.result !== "pass") {
    throw new PromotionTerminalAuditError(
      "AUDIT_CAPABILITY_FORBIDDEN",
      "Frozen terminal audit release contains an unregistered capability.",
      {
        violationCount: capabilityProof.violations.length,
        violationsDigest: capabilityProof.violationsDigest
      },
      "blocked"
    );
  }
  return {
    version: entry.version,
    releaseCommit: release.releaseCommit,
    releaseParentCommit,
    releaseWorktreeHead: releaseState.headCommit,
    releaseWorktreeClean: releaseState.clean,
    ledgerRawSha256: currentLedger.rawSha256,
    auditBundleDigest: entry.auditBundleDigest,
    frozenCoreBundleDigest: entry.frozenCoreBundleDigest,
    auditBundleFileCount: entry.auditBundleFiles.length,
    frozenCoreBundleFileCount: entry.frozenCoreBundleFiles.length,
    releaseTrackedPathCount: releaseIndexProof.trackedPathCount,
    capabilityProof: {
      result: capabilityProof.result,
      execFileImportCount: capabilityProof.execFileImportCount,
      execFileCallCount: capabilityProof.execFileCallCount,
      violationCount: capabilityProof.violations.length,
      violationsDigest: capabilityProof.violationsDigest
    },
    importBoundary: "frozen-release-core-only",
    targetCodeExecuted: false
  };
}

export async function collectLedgerOnlyReleaseProof(repoRoot, releaseCommit, ledgerPath = AUDIT_RELEASE_LEDGER_PATH) {
  assertHex(releaseCommit, 40, "releaseCommit", "AUDIT_RELEASE_GENESIS_INVALID");
  if (ledgerPath !== AUDIT_RELEASE_LEDGER_PATH) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_GENESIS_INVALID",
      "Terminal audit release ledger path cannot be remapped.",
      {},
      "blocked"
    );
  }
  const parentLine = singleGitLine(
    await runRegisteredGitProbe(repoRoot, ["rev-list", "--parents", "-n", "1", releaseCommit]),
    "terminal audit release parents"
  );
  const parentParts = parentLine.split(" ");
  if (parentParts.length !== 2 || parentParts[0] !== releaseCommit) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_GENESIS_INVALID",
      "Terminal audit release must be a single-parent commit.",
      {},
      "blocked"
    );
  }
  const releaseParentCommit = parentParts[1];
  const changedPaths = parseNulList(
    await runRegisteredGitProbe(repoRoot, [
      "diff-tree", "--no-commit-id", "--name-only", "-r", "-z", releaseCommit, "--"
    ]),
    "terminal audit release changed paths"
  );
  if (frozenCore.stableJson(changedPaths) !== frozenCore.stableJson([ledgerPath])) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_GENESIS_INVALID",
      "Terminal audit release commit must add only its release ledger.",
      { changedPathCount: changedPaths.length },
      "blocked"
    );
  }
  try {
    await runRegisteredGitProbe(repoRoot, ["show", "--no-textconv", `${releaseParentCommit}:${ledgerPath}`]);
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_GENESIS_INVALID",
      "Terminal audit ledger already existed in the release parent.",
      {},
      "blocked"
    );
  } catch (error) {
    if (error instanceof PromotionTerminalAuditError) throw error;
  }
  return { releaseCommit, releaseParentCommit, ledgerPath, changedPaths };
}

function projectLiveProof(reachability) {
  const excluded = reachability.excludedNonRuntimeMatches ?? [];
  return {
    policy: reachability.policy,
    selectedCandidateReachable: reachability.selectedCandidateReachable,
    matchCount: reachability.matches.length,
    matchesDigest: frozenCore.fingerprint(reachability.matches),
    unresolvedDynamicImportCount: reachability.unresolvedDynamicImports.length,
    unresolvedDynamicImportsDigest: frozenCore.fingerprint(reachability.unresolvedDynamicImports),
    excludedNonRuntimeMatchCount: excluded.length,
    excludedNonRuntimeMatchesDigest: frozenCore.fingerprint(excluded),
    coveredFileCount: reachability.rawObservation.coveredFileCount,
    coveredFilesDigest: reachability.rawObservation.coveredFilesDigest,
    coveredFilesAggregateDigest: reachability.rawObservation.coveredFilesAggregateDigest,
    runtimeGraphDigest: reachability.registryProof.runtimeGraphDigest,
    loaderPolicyDigest: reachability.registryProof.loaderPolicyDigest,
    registryRawSha256: reachability.registryProof.rawSha256
  };
}

function dependentError(checkId) {
  return new PromotionTerminalAuditError(
    "AUDIT_DEPENDENCY_BLOCKED",
    `${checkId} could not run because an earlier required proof is unavailable.`,
    { dependencyCheckId: checkId },
    "blocked"
  );
}

async function loadPolicyAndBootstrap(targetRoot, expectedHead, policyPath) {
  if (!path.isAbsolute(targetRoot) || targetRoot.includes("\0")) {
    throw new PromotionTerminalAuditError(
      "TARGET_ROOT_INVALID",
      "--target-root must be an absolute repository root.",
      {},
      "blocked"
    );
  }
  assertHex(expectedHead, 40, "--expected-head", "TARGET_HEAD_INVALID");
  if (policyPath !== DEFAULT_POLICY_PATH) {
    throw new PromotionTerminalAuditError(
      "AUDIT_POLICY_PATH_UNREGISTERED",
      "Only the registered terminal current-HEAD policy path is accepted.",
      {},
      "blocked"
    );
  }
  const canonicalTargetRoot = await realpath(targetRoot);
  const canonicalReleaseRoot = await realpath(RELEASE_ROOT);
  if (canonicalTargetRoot === canonicalReleaseRoot) {
    throw new PromotionTerminalAuditError(
      "AUDIT_RELEASE_TARGET_NOT_ISOLATED",
      "Frozen audit release and audited target must be distinct worktrees.",
      {},
      "blocked"
    );
  }
  const preWorktree = await frozenCore.collectGitWorktreeState(canonicalTargetRoot);
  if (preWorktree.headCommit !== expectedHead) {
    throw new PromotionTerminalAuditError(
      "TARGET_HEAD_MISMATCH",
      "Target worktree HEAD differs from --expected-head.",
      { expectedHead, actualHead: preWorktree.headCommit },
      "blocked"
    );
  }
  const preIndexSafety = await collectIndexSafetyProof(canonicalTargetRoot);
  const policyLoaded = await frozenCore.readAuthoritativeFile(canonicalTargetRoot, policyPath);
  const policy = frozenCore.parseCanonicalJsonBytes(
    policyLoaded.bytes,
    "AUDIT_POLICY_JSON_INVALID",
    "Terminal current-HEAD audit policy"
  );
  validateAuditPolicy(policy);
  return {
    targetRoot: canonicalTargetRoot,
    targetHead: preWorktree.headCommit,
    preWorktree,
    preIndexSafety,
    policy,
    policyRawSha256: policyLoaded.rawSha256
  };
}

export async function auditPromotionTerminalCurrentHead({
  policyPath,
  targetRoot,
  expectedHead,
  auditId = "terminal-current-head-audit",
  evaluatedAt = new Date().toISOString(),
  ciJobId = process.env.GITHUB_RUN_ID ?? null
}) {
  let bootstrap;
  try {
    bootstrap = await loadPolicyAndBootstrap(targetRoot, expectedHead, policyPath);
  } catch (caught) {
    const error = normalizeAuditError(caught);
    const operations = passThroughBootstrapFailure(error);
    return runOrderedAuditForTest({
      targetHead: /^[a-f0-9]{40}$/u.test(expectedHead ?? "") ? expectedHead : "0".repeat(40),
      expectedHead: /^[a-f0-9]{40}$/u.test(expectedHead ?? "") ? expectedHead : "0".repeat(40),
      policyRawSha256: "0".repeat(64),
      policySelfDigest: "0".repeat(64),
      policyPath: typeof policyPath === "string" ? policyPath : DEFAULT_POLICY_PATH,
      runMetadata: { auditId, evaluatedAt, ciJobId },
      operations
    });
  }
  const context = {
    ...bootstrap,
    terminal: null,
    candidate: null,
    evidence: null,
    reachability: null
  };
  const operations = {
    "terminal-attempt-binding": async () => {
      if (!context.preWorktree.clean) {
        throw new PromotionTerminalAuditError(
          "WORKTREE_DIRTY",
          "Target current-HEAD audit requires a clean worktree.",
          { statusEntryCount: context.preWorktree.statusEntryCount },
          "blocked"
        );
      }
      context.terminal = await validateTerminalBinding(
        context.targetRoot,
        context.policy,
        context.preWorktree,
        context.preIndexSafety
      );
      return context.terminal.proof;
    },
    "audit-checker-release": async () => {
      if (!context.terminal) throw dependentError("terminal-attempt-binding");
      return validateAuditRelease(context.targetRoot, context.targetHead, context.policy);
    },
    "candidate-integrity": async () => {
      if (!context.terminal) throw dependentError("terminal-attempt-binding");
      const loaded = await frozenCore.loadCandidateRecords(context.targetRoot, context.terminal.manifest);
      context.candidate = loaded;
      return {
        candidateDigest: context.terminal.manifest.candidateDigest,
        sourceDigests: loaded.sourceDigests,
        inventoryProof: loaded.inventoryProof,
        selectedRecordCount: Object.keys(loaded.records).length
      };
    },
    "evidence-currentness": async () => {
      if (!context.candidate) throw dependentError("candidate-integrity");
      const loaded = await frozenCore.loadEvidenceRecords(
        context.targetRoot,
        context.terminal.manifest,
        context.targetHead
      );
      frozenCore.validateEvidenceCandidateSemantics(
        context.terminal.manifest,
        context.candidate.records,
        loaded.byRole
      );
      const priorReviewProof = await frozenCore.validatePriorS18ReviewDrift(
        context.targetRoot,
        context.candidate.records,
        loaded.byRole
      );
      const dtos = frozenCore.buildShadowDtos(context.candidate.records, loaded.byRole);
      context.evidence = loaded;
      return {
        ownerCount: Object.keys(loaded.byRole).length,
        ownerRolesDigest: frozenCore.fingerprint(Object.keys(loaded.byRole)),
        trustBoundary: loaded.trustBoundary,
        evidenceIndexProof: loaded.indexProof,
        priorReviewProof,
        compatibilityDigest: frozenCore.fingerprint(dtos),
        shadowDtoKinds: Object.keys(dtos),
        sourceDigests: loaded.sourceDigests
      };
    },
    "selected-live-reachability": async () => {
      if (!context.candidate) throw dependentError("candidate-integrity");
      context.reachability = await frozenCore.scanLiveReachability(
        context.targetRoot,
        context.terminal.manifest
      );
      return projectLiveProof(context.reachability);
    },
    "legacy-ratchet": async () => {
      if (!context.reachability) throw dependentError("selected-live-reachability");
      const ratchetLoaded = await frozenCore.readAuthoritativeFile(
        context.targetRoot,
        context.terminal.manifest.legacyRatchet
      );
      const ratchet = frozenCore.parseCanonicalJsonBytes(
        ratchetLoaded.bytes,
        "LEGACY_RATCHET_JSON_INVALID",
        "Legacy drift ratchet"
      );
      await frozenCore.validateLegacyAuthorizationReviews(
        context.targetRoot,
        context.terminal.manifest,
        ratchet.entries
      );
      const frozenProjection = ratchet.entries.map((entry) => frozenCore.projectLegacyObservedEntry(entry));
      frozenCore.validateLegacyRatchet(ratchet, { now: evaluatedAt, observedEntries: frozenProjection });
      const observedEntries = await frozenCore.observeLegacyRatchetEntries(
        context.targetRoot,
        context.terminal.manifest,
        ratchet,
        { runtimeReachability: context.reachability }
      );
      const validation = frozenCore.validateLegacyRatchet(ratchet, { now: evaluatedAt, observedEntries });
      return {
        ratchetRawSha256: ratchetLoaded.rawSha256,
        knownConflictCount: ratchet.entries.length,
        observedConflictCount: observedEntries.length,
        newConflictCount: 0,
        opaqueConflictCount: 0,
        observedEntriesDigest: frozenCore.fingerprint(observedEntries),
        discoveryProof: observedEntries.discoveryProof,
        validation
      };
    },
    "no-repository-mutation": async () => {
      const postWorktree = await frozenCore.collectGitWorktreeState(context.targetRoot);
      const postIndexSafety = await collectIndexSafetyProof(context.targetRoot);
      if (
        context.preWorktree.headCommit !== postWorktree.headCommit ||
        context.preWorktree.statusSha256 !== postWorktree.statusSha256 ||
        frozenCore.stableJson(context.preIndexSafety) !== frozenCore.stableJson(postIndexSafety)
      ) {
        throw new PromotionTerminalAuditError(
          "REPOSITORY_MUTATION",
          "Target repository HEAD, status, index flags, or case inventory changed during audit.",
          {
            preHead: context.preWorktree.headCommit,
            postHead: postWorktree.headCommit,
            preStatusSha256: context.preWorktree.statusSha256,
            postStatusSha256: postWorktree.statusSha256
          }
        );
      }
      let postCandidateDigest = null;
      let candidateStable = null;
      if (context.candidate && context.terminal) {
        const postCandidate = await frozenCore.loadCandidateRecords(context.targetRoot, context.terminal.manifest);
        postCandidateDigest = context.terminal.manifest.candidateDigest;
        candidateStable = frozenCore.stableJson(postCandidate.sourceDigests) === frozenCore.stableJson(context.candidate.sourceDigests) &&
          frozenCore.stableJson(postCandidate.inventoryProof) === frozenCore.stableJson(context.candidate.inventoryProof);
        if (!candidateStable) {
          throw new PromotionTerminalAuditError(
            "REPOSITORY_MUTATION",
            "Candidate bytes changed during terminal current-HEAD audit."
          );
        }
      }
      return {
        preHead: context.preWorktree.headCommit,
        postHead: postWorktree.headCommit,
        preClean: context.preWorktree.clean,
        postClean: postWorktree.clean,
        preStatusSha256: context.preWorktree.statusSha256,
        postStatusSha256: postWorktree.statusSha256,
        indexSafetyDigest: frozenCore.fingerprint(postIndexSafety),
        candidateDigest: postCandidateDigest,
        candidateStable,
        repositoryWriteCount: 0
      };
    }
  };
  return runOrderedAuditForTest({
    targetHead: context.targetHead,
    expectedHead,
    policyRawSha256: context.policyRawSha256,
    policySelfDigest: context.policy.policyDigest,
    policyPath,
    runMetadata: { auditId, evaluatedAt, ciJobId },
    operations
  });
}

export async function createAuditFailureReport({
  code,
  message,
  outcome = "internal",
  details = {},
  policyPath = DEFAULT_POLICY_PATH,
  expectedHead = "0".repeat(40),
  auditId = "terminal-current-head-audit-error",
  evaluatedAt = new Date().toISOString(),
  ciJobId = process.env.GITHUB_RUN_ID ?? null
}) {
  const normalizedHead = /^[a-f0-9]{40}$/u.test(expectedHead) ? expectedHead : "0".repeat(40);
  const failure = new PromotionTerminalAuditError(code, message, details, outcome);
  return runOrderedAuditForTest({
    targetHead: normalizedHead,
    expectedHead: normalizedHead,
    policyRawSha256: "0".repeat(64),
    policySelfDigest: "0".repeat(64),
    policyPath: typeof policyPath === "string" && policyPath.length > 0 ? policyPath : DEFAULT_POLICY_PATH,
    runMetadata: { auditId, evaluatedAt, ciJobId },
    operations: passThroughBootstrapFailure(failure)
  });
}

function passThroughBootstrapFailure(error) {
  return Object.fromEntries(AUDIT_CHECK_IDS.map((checkId, index) => [
    checkId,
    async () => {
      if (index === 0) throw error;
      throw dependentError(AUDIT_CHECK_IDS[0]);
    }
  ]));
}

function normalizeModuleSpecifier(value) {
  return value.startsWith("node:") ? value.slice(5) : value;
}

export function auditCapabilitySources({ librarySource, cliSource }) {
  const sources = [
    { path: "promotion-terminal-audit-lib.mjs", source: librarySource, kind: "library" },
    { path: "promotion-terminal-audit.mjs", source: cliSource, kind: "cli" }
  ];
  const violations = [];
  let execFileImportCount = 0;
  let execFileCallCount = 0;
  const allowedImports = {
    library: new Set([
      "node:child_process", "node:fs/promises", "node:path", "node:url", "typescript",
      "../promotion-gate-lib.mjs"
    ]),
    cli: new Set(["./promotion-terminal-audit-lib.mjs"])
  };
  for (const { path: sourcePath, source, kind } of sources) {
    const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    if (sourceFile.parseDiagnostics.length > 0) {
      violations.push({ sourcePath, kind: "source-parse" });
    }
    const visit = (node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        if (!allowedImports[kind].has(specifier)) {
          violations.push({ sourcePath, kind: "unregistered-import", specifierDigest: frozenCore.fingerprint(specifier) });
        }
        if (normalizeModuleSpecifier(specifier) === "child_process") {
          const named = node.importClause?.namedBindings;
          const exact = kind === "library" && ts.isNamedImports(named) &&
            named.elements.length === 1 && named.elements[0].name.text === "execFile";
          if (exact) execFileImportCount += 1;
          else violations.push({ sourcePath, kind: "child-process-import" });
        }
        if (normalizeModuleSpecifier(specifier) === "fs/promises") {
          const named = node.importClause?.namedBindings;
          const names = ts.isNamedImports(named) ? named.elements.map((entry) => entry.name.text) : [];
          if (names.some((name) => !["lstat", "readFile", "realpath"].includes(name))) {
            violations.push({ sourcePath, kind: "filesystem-write-import" });
          }
        }
      }
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        if (expression.kind === ts.SyntaxKind.ImportKeyword) {
          violations.push({ sourcePath, kind: "dynamic-import" });
        }
        if (ts.isIdentifier(expression)) {
          if (["fetch", "eval", "exec", "spawn", "fork", "writeFile", "appendFile", "rm", "mkdir", "rmdir"].includes(expression.text)) {
            violations.push({ sourcePath, kind: `forbidden-call-${expression.text}` });
          }
          if (expression.text === "execFile") {
            execFileCallCount += 1;
            const first = node.arguments[0];
            if (!first || !ts.isIdentifier(first) || first.text !== "REGISTERED_GIT_EXECUTABLE") {
              violations.push({ sourcePath, kind: "unregistered-process-execution" });
            }
          }
          if (expression.text === "require") {
            violations.push({ sourcePath, kind: "commonjs-load" });
          }
        }
        if (ts.isPropertyAccessExpression(expression)) {
          const member = expression.name.text.toLocaleLowerCase("en-US");
          const root = ts.isIdentifier(expression.expression)
            ? expression.expression.text.toLocaleLowerCase("en-US")
            : null;
          if (["provider", "database", "vercel"].includes(root)) {
            violations.push({ sourcePath, kind: `forbidden-capability-${root}` });
          }
          if (["deploy", "provider", "database", "query", "connect", "request"].includes(member)) {
            violations.push({ sourcePath, kind: `forbidden-capability-${member}` });
          }
          if ([
            "runshadowpilot", "verifypromotionreceipt", "rehearseshadowoutputs",
            "writeexclusiveshadowoutput"
          ].includes(member)) {
            violations.push({ sourcePath, kind: `forbidden-promotion-execution-${member}` });
          }
        }
      }
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ["Function", "WebSocket", "EventSource", "XMLHttpRequest"].includes(node.expression.text)
      ) {
        violations.push({ sourcePath, kind: `forbidden-constructor-${node.expression.text}` });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  if (execFileImportCount !== 1) violations.push({ sourcePath: "bundle", kind: "execFile-import-count" });
  if (execFileCallCount !== 1) violations.push({ sourcePath: "bundle", kind: "execFile-call-count" });
  return {
    result: violations.length === 0 ? "pass" : "fail",
    execFileImportCount,
    execFileCallCount,
    violations,
    violationsDigest: frozenCore.fingerprint(violations)
  };
}

export const AUDIT_RELEASE_CONTRACT = Object.freeze({
  releaseRoot: RELEASE_ROOT,
  auditBundlePaths: AUDIT_BUNDLE_PATHS,
  frozenCoreBundlePaths: FROZEN_CORE_BUNDLE_PATHS,
  frozenCoreRawSha256: FROZEN_CORE_RAW_SHA256,
  frozenCoreBundleDigest: FROZEN_CORE_BUNDLE_DIGEST
});
