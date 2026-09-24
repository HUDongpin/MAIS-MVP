#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { strictJsonParse } from "./strict-json.mjs";
import {
  CANDIDATE_ID_RE,
  CODE_RE,
  DEVIATION_CODES,
  DISPOSITIONS,
  EMPTY_SHA256,
  EVIDENCE_CLASSES,
  EVIDENCE_ID_RE,
  HASH_RE,
  NEXT_ALLOWED_ACTIONS,
  PROTOCOL_ID_RE,
  STATUS_VALUES,
  VERSION_RE,
  collectLiveRuntimeEvidence,
  inspectUnsafeContent,
  isSafeTimestamp,
  resolveMachineQaTransition,
  validateClaimCeilingObject,
  validateIndependentReviewObject,
  validateMachineQaPacket,
  validateProofBoundaryObject,
  validateRedactionObject,
} from "./machine-qa-contract.mjs";

const EXIT_VALID = 0;
const EXIT_BLOCKED = 2;
const EXIT_INTERNAL = 3;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const SELF_HASH_FIELDS = new Set(["selfHash", "selfHashSha256"]);
const RECEIPT_TYPES = new Set([
  "machine-qa-final",
  "machine-qa-scoring",
  "machine-qa-repeatability",
  "machine-qa-evidence",
]);
const BOUNDARY_VALUES = new Set([
  "machine-evidence-only",
  "no-content-decision",
  "a18-decision-required",
]);
const PACKAGE_ID_RE = /^package-[a-f0-9]{16}$/;
const HASH_FIELDS = ["candidateSha256", "candidateSetSha256"];
const TIMESTAMP_FIELDS = ["issuedAt", "createdAt", "completedAt"];
const COUNT_FIELDS = [
  "packageCount",
  "questionCount",
  "lessonCount",
  "successfulProviderCalls",
  "providerAttempts",
  "failedOrLostProviderAttempts",
  "deviationCount",
];
const GENERIC_RECEIPT_FIELDS = new Set([
  "receiptType",
  "protocolId",
  "protocolVersion",
  "evidenceId",
  "candidateId",
  "candidateVersion",
  "packageId",
  ...HASH_FIELDS,
  ...TIMESTAMP_FIELDS,
  ...COUNT_FIELDS,
  "evidenceClass",
  "status",
  "machineDisposition",
  "contentDecisionBoundary",
  "nextAllowedAction",
  "prohibitedActionsObserved",
  "claimCeiling",
  "redaction",
  "proofBoundaries",
  "independentReviewState",
  "deviationCodes",
  "selfHash",
  "selfHashSha256",
  "selfHashField",
]);
const GENERIC_REQUIRED_FIELDS = [
  "receiptType",
  "protocolId",
  "protocolVersion",
  "evidenceClass",
  "status",
  "candidateId",
  "candidateVersion",
  "candidateSha256",
  "machineDisposition",
  "contentDecisionBoundary",
  "prohibitedActionsObserved",
  "claimCeiling",
  "nextAllowedAction",
  "redaction",
  "proofBoundaries",
  "independentReviewState",
  "deviationCodes",
];

function printHelp() {
  process.stdout.write(`Usage: node scripts/safe-receipt-summary.mjs RECEIPT.json

Create an offline, read-only, semantically validated, strict-allowlist summary.
Unsafe or invalid fields and input-controlled IDs are never emitted. A supplied selfHash or
selfHashSha256 proves only canonicalized JSON-value integrity and cannot
override disposition, claim-ceiling, identity, proof, review, or redaction
failures.
Trust-anchor status and receipt-identity hashes report only a verified external
comparison record. They do not authenticate an issuer or authorize a provider call.
Consistent generic blocked/invalid receipts remain blocked summaries and exit 2;
the same evidence-class/status/disposition/proof/review/action resolver is used
for generic and full packets. Synthetic calibration has calibration-only next
actions and can never route to A18. Contradictory states are rejected without a
semantic summary.

Exit codes:
  0  semantic validation and supplied self-hash (if any) passed
  2  malformed, unsafe, semantically invalid, or self-hash-invalid receipt
  3  internal tool or filesystem failure
`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  const result = Object.create(null);
  for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
  return result;
}

function computeSelfHash(receipt, field) {
  const copy = Object.create(null);
  for (const [key, value] of Object.entries(receipt)) {
    if (key !== field) copy[key] = value;
  }
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(copy)), "utf8")
    .digest("hex");
}

function selectSelfHash(receipt) {
  if (receipt.selfHashField !== undefined) {
    if (typeof receipt.selfHashField !== "string" || !SELF_HASH_FIELDS.has(receipt.selfHashField)) {
      return { error: "SELF_HASH_FIELD_UNSUPPORTED" };
    }
    if (!Object.hasOwn(receipt, receipt.selfHashField)) return { error: "SELF_HASH_VALUE_MISSING" };
  }
  const present = [...SELF_HASH_FIELDS].filter((field) => Object.hasOwn(receipt, field));
  if (present.length > 1) return { error: "MULTIPLE_SELF_HASH_FIELDS" };
  const selected = receipt.selfHashField ?? present[0];
  return selected ? { field: selected } : {};
}

function safePacketCopy(receipt) {
  const copy = Object.create(null);
  for (const [key, value] of Object.entries(receipt)) {
    if (!SELF_HASH_FIELDS.has(key) && key !== "selfHashField") copy[key] = value;
  }
  return copy;
}

function add(issues, code) {
  issues.add(code);
}

function validateGenericReceipt(receipt, nowMs, issues) {
  const safe = Object.create(null);
  safe.summaryVersion = 2;

  if (Object.keys(receipt).some((field) => !GENERIC_RECEIPT_FIELDS.has(field))) {
    add(issues, "GENERIC_UNKNOWN_PROPERTY");
  }
  if (GENERIC_REQUIRED_FIELDS.some((field) => !Object.hasOwn(receipt, field))) {
    add(issues, "GENERIC_REQUIRED_FIELD_MISSING");
  }

  if (receipt.receiptType !== undefined) {
    if (!RECEIPT_TYPES.has(receipt.receiptType)) add(issues, "INVALID_RECEIPT_TYPE");
    else safe.receiptType = receipt.receiptType;
  }
  for (const [field, pattern] of [
    ["protocolId", PROTOCOL_ID_RE],
    ["protocolVersion", VERSION_RE],
    ["evidenceId", EVIDENCE_ID_RE],
    ["candidateId", CANDIDATE_ID_RE],
    ["candidateVersion", VERSION_RE],
    ["packageId", PACKAGE_ID_RE],
  ]) {
    const value = receipt[field];
    if (value !== undefined && (typeof value !== "string" || !pattern.test(value))) {
      add(issues, `INVALID_${field.replace(/([A-Z])/g, "_$1").toUpperCase()}`);
    }
  }
  for (const field of HASH_FIELDS) {
    const value = receipt[field];
    if (value === undefined) continue;
    if (!HASH_RE.test(value) || value === EMPTY_SHA256) add(issues, "INVALID_HASH_FIELD");
    else safe[field] = value;
  }
  for (const field of TIMESTAMP_FIELDS) {
    const value = receipt[field];
    if (value === undefined) continue;
    if (!isSafeTimestamp(value, nowMs)) add(issues, "INVALID_OR_FUTURE_TIMESTAMP");
    else safe[field] = value;
  }
  for (const field of COUNT_FIELDS) {
    const value = receipt[field];
    if (value === undefined) continue;
    if (!Number.isSafeInteger(value) || value < 0) add(issues, "INVALID_COUNT_FIELD");
    else safe[field] = value;
  }

  if (receipt.evidenceClass !== undefined) {
    if (!EVIDENCE_CLASSES.has(receipt.evidenceClass)) add(issues, "INVALID_EVIDENCE_CLASS");
    else safe.evidenceClass = receipt.evidenceClass;
  }
  if (receipt.status !== undefined) {
    if (!STATUS_VALUES.has(receipt.status)) add(issues, "INVALID_STATUS");
    else safe.status = receipt.status;
  }
  if (receipt.machineDisposition !== undefined) {
    if (!DISPOSITIONS.has(receipt.machineDisposition)) add(issues, "INVALID_MACHINE_DISPOSITION");
    else safe.machineDisposition = receipt.machineDisposition;
  }
  if (receipt.contentDecisionBoundary !== undefined) {
    if (!BOUNDARY_VALUES.has(receipt.contentDecisionBoundary)) add(issues, "INVALID_CONTENT_DECISION_BOUNDARY");
    else safe.contentDecisionBoundary = receipt.contentDecisionBoundary;
  }
  if (receipt.nextAllowedAction !== undefined) {
    if (!NEXT_ALLOWED_ACTIONS.has(receipt.nextAllowedAction)) add(issues, "INVALID_NEXT_ALLOWED_ACTION");
    else safe.nextAllowedAction = receipt.nextAllowedAction;
  }
  if (receipt.prohibitedActionsObserved !== undefined) {
    if (receipt.prohibitedActionsObserved !== false) add(issues, "PROHIBITED_ACTION_OBSERVED");
    else safe.prohibitedActionsObserved = false;
  }

  if (receipt.claimCeiling !== undefined) {
    const claimIssues = validateClaimCeilingObject(receipt.claimCeiling);
    if (claimIssues.length > 0) add(issues, "INVALID_CLAIM_CEILING");
    else safe.claimCeiling = receipt.claimCeiling;
  }
  if (receipt.redaction !== undefined) {
    const redactionIssues = validateRedactionObject(receipt.redaction);
    if (redactionIssues.length > 0) add(issues, "INVALID_REDACTION_DECLARATION");
    else safe.redaction = receipt.redaction;
  }
  if (receipt.proofBoundaries !== undefined) {
    const proofIssues = validateProofBoundaryObject(receipt.proofBoundaries);
    if (proofIssues.length > 0) add(issues, "INVALID_PROOF_BOUNDARIES");
    else safe.proofBoundaries = receipt.proofBoundaries;
  }
  const candidateSha256 = safe.candidateSha256;
  if (receipt.independentReviewState !== undefined) {
    const reviewIssues = validateIndependentReviewObject(
      receipt.independentReviewState,
      candidateSha256,
    );
    if (reviewIssues.length > 0) add(issues, "INVALID_INDEPENDENT_REVIEW_STATE");
    else safe.independentReviewState = receipt.independentReviewState;
  }
  if (receipt.deviationCodes !== undefined) {
    if (
      !Array.isArray(receipt.deviationCodes) ||
      receipt.deviationCodes.some((code) =>
        typeof code !== "string" || !CODE_RE.test(code) || !DEVIATION_CODES.has(code)
      ) ||
      new Set(receipt.deviationCodes).size !== receipt.deviationCodes.length
    ) {
      add(issues, "INVALID_DEVIATION_CODES");
    } else {
      safe.deviationCount = receipt.deviationCodes.length;
    }
  }

  if (
    Number.isSafeInteger(receipt.successfulProviderCalls) &&
    Number.isSafeInteger(receipt.providerAttempts) &&
    receipt.successfulProviderCalls > receipt.providerAttempts
  ) {
    add(issues, "CALL_COUNT_INCONSISTENT");
  }
  if (
    Number.isSafeInteger(receipt.failedOrLostProviderAttempts) &&
    Number.isSafeInteger(receipt.providerAttempts) &&
    receipt.failedOrLostProviderAttempts > receipt.providerAttempts
  ) {
    add(issues, "CALL_COUNT_INCONSISTENT");
  }

  const transition = resolveMachineQaTransition({
    evidenceClass: receipt.evidenceClass,
    status: receipt.status,
    machineDisposition: receipt.machineDisposition,
    nextAllowedAction: receipt.nextAllowedAction,
    receiptProofStatus: receipt.proofBoundaries?.receipt?.status,
    independentReviewStatus: receipt.independentReviewState?.status,
  });
  if (!transition.valid) {
    add(issues, "STATE_TRANSITION_INVALID");
    add(issues, "GENERIC_STATE_INCONSISTENT");
  }
  return { safe, transition };
}

function buildPacketSummary(packet) {
  const liveTrust = packet.authorization?.authorizationTrustAnchor;
  const priorTrust = packet.remediation?.priorReceiptBindings?.priorTrustAnchor;
  return {
    summaryVersion: 2,
    evidenceClass: packet.evidenceClass,
    status: packet.status,
    candidateSha256: packet.identity.candidateSha256,
    machineDisposition: packet.machineDisposition,
    independentReviewState: packet.independentReviewState,
    proofBoundaries: packet.proofBoundaries,
    claimCeiling: packet.claimCeiling,
    nextAllowedAction: packet.nextAllowedAction,
    redaction: packet.redaction,
    trustAnchors: {
      liveAuthorization: liveTrust
        ? { status: liveTrust.status, receiptIdentitySha256: liveTrust.receiptIdentitySha256 }
        : null,
      priorEvidence: priorTrust
        ? { status: priorTrust.status, receiptIdentitySha256: priorTrust.receiptIdentitySha256 }
        : null,
    },
  };
}

function emit(result, summary, issueCodes, selfHash) {
  process.stdout.write(`${JSON.stringify({
    tool: "safe-receipt-summary",
    result,
    issueCodes: [...new Set(issueCodes)].sort(),
    selfHash,
    summary,
  })}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    printHelp();
    return EXIT_VALID;
  }
  if (args.length !== 1 || args[0].startsWith("-")) {
    emit("blocked", { summaryVersion: 2 }, ["USAGE_INVALID"], { supplied: false, valid: null });
    return EXIT_BLOCKED;
  }

  let source;
  try {
    source = await readFile(args[0]);
  } catch {
    emit("internal-error", { summaryVersion: 2 }, ["INPUT_READ_FAILED"], { supplied: false, valid: null });
    return EXIT_INTERNAL;
  }
  if (Buffer.byteLength(source, "utf8") > MAX_INPUT_BYTES) {
    emit("blocked", { summaryVersion: 2 }, ["INPUT_TOO_LARGE"], { supplied: false, valid: null });
    return EXIT_BLOCKED;
  }

  let receipt;
  try {
    receipt = strictJsonParse(source);
  } catch (error) {
    emit("blocked", { summaryVersion: 2 }, [error?.code === "JSON_DUPLICATE_KEY" ? error.code : "JSON_MALFORMED"], { supplied: false, valid: null });
    return EXIT_BLOCKED;
  }
  if (!isObject(receipt)) {
    emit("blocked", { summaryVersion: 2 }, ["RECEIPT_NOT_OBJECT"], { supplied: false, valid: null });
    return EXIT_BLOCKED;
  }

  const issues = new Set();
  const unsafe = inspectUnsafeContent(receipt);
  for (const code of unsafe.codes) add(issues, code);

  const packetCandidate = receipt.schemaVersion === "1.0" && receipt.skill === "mais-rsi-machine-qa-workflow";
  let safeSummary;
  let genericTerminalCode = null;
  if (packetCandidate) {
    const packet = safePacketCopy(receipt);
    const runtimeEvidence = await collectLiveRuntimeEvidence(args[0], packet);
    const packetIssues = validateMachineQaPacket(packet, { runtimeEvidence });
    if (packetIssues.length > 0) add(issues, "PACKET_SEMANTICS_INVALID");
    safeSummary = packetIssues.length === 0 ? buildPacketSummary(packet) : { summaryVersion: 2 };
  } else {
    const generic = validateGenericReceipt(receipt, Date.now(), issues);
    safeSummary = generic.safe;
    if (generic.transition.valid && generic.transition.exitCode === EXIT_BLOCKED) {
      genericTerminalCode = `GENERIC_STATUS_${receipt.status.toUpperCase()}`;
    }
  }

  const selected = selectSelfHash(receipt);
  let selfHash = { supplied: false, valid: null };
  if (selected.error) {
    add(issues, selected.error);
    selfHash = { supplied: true, valid: false };
  } else if (selected.field) {
    const supplied = receipt[selected.field];
    const valid = HASH_RE.test(supplied ?? "") && computeSelfHash(receipt, selected.field) === supplied;
    selfHash = { supplied: true, field: selected.field, valid };
    if (!valid) add(issues, "SELF_HASH_INVALID");
  }

  if (issues.size > 0) {
    const blockedSummary = { summaryVersion: 2 };
    if (unsafe.protectedFieldCount > 0) blockedSummary.redactedFieldCount = unsafe.protectedFieldCount;
    emit("blocked", blockedSummary, [...issues], selfHash);
    return EXIT_BLOCKED;
  }
  if (genericTerminalCode !== null) {
    emit("blocked", safeSummary, [genericTerminalCode], selfHash);
    return EXIT_BLOCKED;
  }
  emit("valid", safeSummary, [], selfHash);
  return EXIT_VALID;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch(() => {
    emit("internal-error", { summaryVersion: 2 }, ["UNEXPECTED_INTERNAL_FAILURE"], { supplied: false, valid: null });
    process.exitCode = EXIT_INTERNAL;
  });
