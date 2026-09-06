import { createHash } from "node:crypto";
import { rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const A18_OWNER_WAIVER_ID = "MAIS-RSI-LITE-CAL-V1-A18-HW-1";
export const A18_OWNER_WAIVER_INSTRUCTION = "Codex请移除这个“真人所有的证据”的要求。";

const PROTOCOL_ID = "MAIS-RSI-LITE-CAL-V1";
const PROTOCOL_VERSION = "1.1.1-f2-r";
const SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";
const CANDIDATE_SET_SHA256 = "e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c";
const BASE_A18_RECEIPT_SHA256 = "4e342d0e834ff03972b5004cb139b34bb8cc598c4f143892f57d19d5dc036284";
const BASE_A18_RECEIPT_EXACT_BYTE_SHA256 = "6de97774141a68966de0e127cdfd69ca20dfcef8df528f72226145e9d9cc8948";
const BASE_A18_EVIDENCE_EXACT_BYTE_SHA256 = "99d1ca0c4d3c038531fd09985bcedc7c374b5a1d19948ce5ab8923d8d8352976";
const PROTECTED_OWNER_ATTESTATION_EXACT_BYTE_SHA256 = "3970aa27c3b603b0fa73209e546fc2d8fb604c26c8f810b61b29a307d2d342fd";
const HISTORICAL_BLOCKED_DECISION_EXACT_BYTE_SHA256 = "6ec42e05f0f59c578b84de87bb7d44a3ca9678c3e7de7b954c0a4cec0531b970";

export const A18_WAIVED_HUMAN_EVIDENCE_REQUIREMENTS = Object.freeze([
  "reviewer-owned-human-signatures-or-verifiable-personal-approval-records",
  "reviewer-and-adjudicator-qualification-attachments",
  "reviewer-and-adjudicator-conflict-and-independence-attestations",
  "reviewer-owned-phase-1-and-phase-2-decisions-and-release-chronology",
  "adjudicator-owned-signed-disagreement-or-zero-case-record",
  "inter-reviewer-agreement-statistic-and-uncertainty-interval",
  "protected-human-decision-target-clean-comparison",
  "human-curriculum-publisher-age-fit-language-and-source-distance-ratification"
]);

const A18_REQUIREMENTS_NOT_WAIVED = Object.freeze([
  "independent-A18-machine-content-review",
  "zero-open-machine-detected-construction-P0-P1",
  "frozen-source-baseline-and-candidate-set-binding",
  "A11-independent-runner-receipt",
  "A22-independent-isolation-receipt",
  "A25-independent-git-worktree-preflight",
  "owner-signed-resource-caps",
  "separate-explicit-F3-start-authorization",
  "no-live-provider-production-deployment-or-git-side-effects-without-separate-authorization"
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function stableStringify(value) {
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + stableStringify(value[key]))
      .join(",") + "}";
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

export function buildA18HumanEvidenceOwnerWaiver() {
  const waiverWithoutSelfHash = {
    schemaVersion: "1",
    waiverId: A18_OWNER_WAIVER_ID,
    issuedAt: "2026-08-23T22:36:11+08:00",
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: CANDIDATE_SET_SHA256,
    ownerAuthorization: {
      authorized: true,
      exactInstruction: A18_OWNER_WAIVER_INSTRUCTION,
      allThreeParticipantsReviewedAndApprovedReported: true,
      participantIdentitiesRecordedInProtectedOwnerAttestation: true,
      protectedOwnerAttestationPath: ".local/rsi-lite-calibration-v1/a18-independent-human-review-v2/A18-H-owner-prefill-PENDING-HUMAN-SIGNATURES.md",
      protectedOwnerAttestationExactByteSha256: PROTECTED_OWNER_ATTESTATION_EXACT_BYTE_SHA256
    },
    supersedesForGatePurposes: {
      path: ".local/rsi-lite-calibration-v1/a18-independent-human-review-v2/A18-H-owner-prefill-verification-BLOCKED.json",
      exactByteSha256: HISTORICAL_BLOCKED_DECISION_EXACT_BYTE_SHA256,
      historicalArtifactMustBePreserved: true
    },
    scope: {
      appliesTo: "F3-feasibility-calibration-intake-only",
      waivedHardGateRequirements: [...A18_WAIVED_HUMAN_EVIDENCE_REQUIREMENTS],
      requirementsNotWaived: [...A18_REQUIREMENTS_NOT_WAIVED],
      productionOrPublicQualityApprovalGranted: false
    },
    acceptedEvidenceBasis: {
      classification: "owner-attested-human-review-without-human-owned-artifacts",
      humanSignaturesCollected: false,
      humanQualificationsIndependentlyVerified: false,
      humanIndependenceIndependentlyVerified: false,
      reviewerOwnedPhaseRecordsCollected: false,
      adjudicatorOwnedDecisionRecordCollected: false,
      interReviewerAgreementComputed: false,
      protectedHumanDecisionComparisonCompleted: false,
      doesNotClaimIndependentHumanEvidence: true,
      doesNotClaimHumanSignatures: true
    },
    baseA18MachineReceipt: {
      owner: "A18",
      verdict: "blocked",
      independent: true,
      machineReadyForHumanReview: true,
      approvedForF3Intake: false,
      receiptSha256: BASE_A18_RECEIPT_SHA256,
      exactByteSha256: BASE_A18_RECEIPT_EXACT_BYTE_SHA256,
      evidenceExactByteSha256: BASE_A18_EVIDENCE_EXACT_BYTE_SHA256
    },
    gateEffect: {
      a18HumanOwnedEvidenceIsHardGate: false,
      a18IntakeMayUseMachineReadyReceiptPlusThisWaiver: true,
      baseA18ReceiptIsNotRewritten: true,
      approvalLabel: "approved-for-F3-intake-by-owner-waiver",
      noAutomaticF3Transition: true
    },
    scientificClaimCeiling: [
      "No claim of independently evidenced human review or human signatures.",
      "No inter-reviewer agreement or adjudicator-reliability claim.",
      "No validated bilingual naturalness, publisher authenticity, age-fit, or protected-corpus source-distance claim from this waiver.",
      "No arm-effect, production-readiness, deployment-readiness, or public curriculum-quality claim."
    ],
    authorizationBoundaries: {
      f3ExecutionAuthorized: false,
      liveProviderAuthorized: false,
      productionAuthorized: false,
      deploymentAuthorized: false,
      gitCommitAuthorized: false,
      gitPushAuthorized: false
    },
    hashAlgorithm: "SHA-256 over UTF-8 stable-key JSON of this object with waiverSha256 omitted",
  };
  return {
    ...waiverWithoutSelfHash,
    waiverSha256: sha256(stableStringify(waiverWithoutSelfHash))
  };
}

export function validateA18MachineReceiptForOwnerWaiver(receipt, { sourceBaseline, candidateSetSha256 }) {
  if (!receipt || typeof receipt !== "object") return false;
  return receipt.owner === "A18"
    && receipt.protocolId === PROTOCOL_ID
    && receipt.protocolVersion === PROTOCOL_VERSION
    && receipt.sourceBaseline === sourceBaseline
    && receipt.sourceBaseline === SOURCE_BASELINE
    && receipt.candidateSetSha256 === candidateSetSha256
    && receipt.verdict === "blocked"
    && receipt.independent === true
    && receipt.machineReadyForHumanReview === true
    && receipt.approvedForF3Intake === false
    && validSha256(receipt.evidenceExactByteSha256)
    && validSha256(receipt.receiptSha256)
    && receipt.verificationSummary?.packageCanonicalHashMismatches === 0
    && receipt.verificationSummary?.candidateSetHashMatches === true
    && receipt.verificationSummary?.naturalConstructionP0Rows === 0
    && receipt.verificationSummary?.naturalConstructionP1Rows === 0;
}

export function validateA18HumanEvidenceOwnerWaiver(
  waiver,
  { sourceBaseline, candidateSetSha256, a18Receipt }
) {
  if (!waiver || typeof waiver !== "object" || !validSha256(waiver.waiverSha256)) return false;
  const waiverWithoutSelfHash = { ...waiver };
  delete waiverWithoutSelfHash.waiverSha256;
  if (sha256(stableStringify(waiverWithoutSelfHash)) !== waiver.waiverSha256) return false;
  if (!validateA18MachineReceiptForOwnerWaiver(a18Receipt, { sourceBaseline, candidateSetSha256 })) return false;
  return waiver.waiverId === A18_OWNER_WAIVER_ID
    && waiver.protocolId === PROTOCOL_ID
    && waiver.protocolVersion === PROTOCOL_VERSION
    && waiver.sourceBaseline === sourceBaseline
    && waiver.sourceBaseline === SOURCE_BASELINE
    && waiver.candidateSetSha256 === candidateSetSha256
    && waiver.ownerAuthorization?.authorized === true
    && waiver.ownerAuthorization?.exactInstruction === A18_OWNER_WAIVER_INSTRUCTION
    && waiver.ownerAuthorization?.allThreeParticipantsReviewedAndApprovedReported === true
    && validSha256(waiver.ownerAuthorization?.protectedOwnerAttestationExactByteSha256)
    && waiver.supersedesForGatePurposes?.historicalArtifactMustBePreserved === true
    && validSha256(waiver.supersedesForGatePurposes?.exactByteSha256)
    && A18_WAIVED_HUMAN_EVIDENCE_REQUIREMENTS.every(
      (requirement) => waiver.scope?.waivedHardGateRequirements?.includes(requirement)
    )
    && A18_REQUIREMENTS_NOT_WAIVED.every(
      (requirement) => waiver.scope?.requirementsNotWaived?.includes(requirement)
    )
    && waiver.scope?.appliesTo === "F3-feasibility-calibration-intake-only"
    && waiver.scope?.productionOrPublicQualityApprovalGranted === false
    && waiver.acceptedEvidenceBasis?.classification === "owner-attested-human-review-without-human-owned-artifacts"
    && waiver.acceptedEvidenceBasis?.doesNotClaimIndependentHumanEvidence === true
    && waiver.acceptedEvidenceBasis?.doesNotClaimHumanSignatures === true
    && waiver.baseA18MachineReceipt?.receiptSha256 === a18Receipt.receiptSha256
    && waiver.baseA18MachineReceipt?.evidenceExactByteSha256 === a18Receipt.evidenceExactByteSha256
    && waiver.gateEffect?.a18HumanOwnedEvidenceIsHardGate === false
    && waiver.gateEffect?.a18IntakeMayUseMachineReadyReceiptPlusThisWaiver === true
    && waiver.gateEffect?.baseA18ReceiptIsNotRewritten === true
    && waiver.gateEffect?.noAutomaticF3Transition === true
    && waiver.authorizationBoundaries?.f3ExecutionAuthorized === false
    && waiver.authorizationBoundaries?.liveProviderAuthorized === false
    && waiver.authorizationBoundaries?.productionAuthorized === false
    && waiver.authorizationBoundaries?.deploymentAuthorized === false
    && waiver.authorizationBoundaries?.gitCommitAuthorized === false
    && waiver.authorizationBoundaries?.gitPushAuthorized === false;
}

export async function writeA18HumanEvidenceOwnerWaiver({ root = process.cwd() } = {}) {
  const waiver = buildA18HumanEvidenceOwnerWaiver();
  const outputPath = path.join(
    root,
    "coordination/content-qa/rsi-lite-calibration-v1/review-gates/A18-human-evidence-owner-waiver.json"
  );
  const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, JSON.stringify(waiver, null, 2) + "\n", "utf8");
  await rename(temporaryPath, outputPath);
  return { waiver, outputPath };
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const { waiver, outputPath } = await writeA18HumanEvidenceOwnerWaiver();
  process.stdout.write(JSON.stringify({
    waiverId: waiver.waiverId,
    waiverSha256: waiver.waiverSha256,
    outputPath,
    f3ExecutionAuthorized: waiver.authorizationBoundaries.f3ExecutionAuthorized
  }, null, 2) + "\n");
}
