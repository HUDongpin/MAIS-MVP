import assert from "node:assert/strict";
import test from "node:test";

import {
  A18_OWNER_WAIVER_ID,
  A18_OWNER_WAIVER_INSTRUCTION,
  A18_WAIVED_HUMAN_EVIDENCE_REQUIREMENTS,
  buildA18HumanEvidenceOwnerWaiver,
  validateA18HumanEvidenceOwnerWaiver,
  validateA18MachineReceiptForOwnerWaiver
} from "./a18-owner-waiver.mjs";

const SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";
const CANDIDATE_SET_SHA256 = "e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c";

function machineReadyA18Receipt() {
  return {
    owner: "A18",
    protocolId: "MAIS-RSI-LITE-CAL-V1",
    protocolVersion: "1.1.1-f2-r",
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: CANDIDATE_SET_SHA256,
    verdict: "blocked",
    independent: true,
    machineReadyForHumanReview: true,
    approvedForF3Intake: false,
    evidenceExactByteSha256: "99d1ca0c4d3c038531fd09985bcedc7c374b5a1d19948ce5ab8923d8d8352976",
    receiptSha256: "4e342d0e834ff03972b5004cb139b34bb8cc598c4f143892f57d19d5dc036284",
    verificationSummary: {
      packageCanonicalHashMismatches: 0,
      candidateSetHashMatches: true,
      naturalConstructionP0Rows: 0,
      naturalConstructionP1Rows: 0
    }
  };
}

test("owner waiver explicitly removes every human-owned evidence item from the pilot hard gate", () => {
  const waiver = buildA18HumanEvidenceOwnerWaiver();
  const receipt = machineReadyA18Receipt();

  assert.equal(waiver.waiverId, A18_OWNER_WAIVER_ID);
  assert.equal(waiver.ownerAuthorization.exactInstruction, A18_OWNER_WAIVER_INSTRUCTION);
  assert.equal(waiver.gateEffect.a18HumanOwnedEvidenceIsHardGate, false);
  assert.equal(waiver.gateEffect.a18IntakeMayUseMachineReadyReceiptPlusThisWaiver, true);
  assert.deepEqual(waiver.scope.waivedHardGateRequirements, [...A18_WAIVED_HUMAN_EVIDENCE_REQUIREMENTS]);
  assert.equal(waiver.acceptedEvidenceBasis.humanSignaturesCollected, false);
  assert.equal(waiver.acceptedEvidenceBasis.doesNotClaimIndependentHumanEvidence, true);
  assert.equal(waiver.authorizationBoundaries.f3ExecutionAuthorized, false);
  assert.equal(validateA18MachineReceiptForOwnerWaiver(receipt, {
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: CANDIDATE_SET_SHA256
  }), true);
  assert.equal(validateA18HumanEvidenceOwnerWaiver(waiver, {
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: CANDIDATE_SET_SHA256,
    a18Receipt: receipt
  }), true);
});

test("waiver is privacy-safe and does not publish the protected participant names", () => {
  const waiver = buildA18HumanEvidenceOwnerWaiver();
  const ownerAuthorizationKeys = Object.keys(waiver.ownerAuthorization);

  assert.equal(ownerAuthorizationKeys.includes("participantNames"), false);
  assert.equal(ownerAuthorizationKeys.includes("participantIds"), false);
  assert.equal(ownerAuthorizationKeys.includes("reviewerNames"), false);
  assert.equal(ownerAuthorizationKeys.includes("adjudicatorName"), false);
  assert.equal(waiver.ownerAuthorization.participantIdentitiesRecordedInProtectedOwnerAttestation, true);
  assert.match(waiver.ownerAuthorization.protectedOwnerAttestationPath, /^\.local\//);
  assert.match(waiver.ownerAuthorization.protectedOwnerAttestationExactByteSha256, /^[a-f0-9]{64}$/);
});

test("waiver fails closed on candidate drift, self-hash tampering, or a non-ready A18 receipt", () => {
  const waiver = buildA18HumanEvidenceOwnerWaiver();
  const receipt = machineReadyA18Receipt();

  assert.equal(validateA18HumanEvidenceOwnerWaiver(waiver, {
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: "a".repeat(64),
    a18Receipt: receipt
  }), false);

  const alteredWaiver = structuredClone(waiver);
  alteredWaiver.scope.productionOrPublicQualityApprovalGranted = true;
  assert.equal(validateA18HumanEvidenceOwnerWaiver(alteredWaiver, {
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: CANDIDATE_SET_SHA256,
    a18Receipt: receipt
  }), false);

  const unsafeReceipt = structuredClone(receipt);
  unsafeReceipt.verificationSummary.naturalConstructionP1Rows = 1;
  assert.equal(validateA18HumanEvidenceOwnerWaiver(waiver, {
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: CANDIDATE_SET_SHA256,
    a18Receipt: unsafeReceipt
  }), false);
});
