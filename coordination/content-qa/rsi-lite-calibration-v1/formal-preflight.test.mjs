import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

import {
  buildFormalPreflightDecision,
  validateFormalResultEnvelope
} from "./formal-preflight.mjs";
import { buildA18HumanEvidenceOwnerWaiver } from "./a18-owner-waiver.mjs";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("./formal-preflight-cli.mjs", import.meta.url));

function candidateInputs() {
  const sourceBaseline = "b6c7c347a49a813e454e707dd3c16399dcf29909";
  const candidateSetSha256 = "a".repeat(64);
  return {
    sourceBaseline,
    candidateSetSha256,
    gateReceipts: {
      A18: { owner: "A18", protocolVersion: "1.1.1-f2-r", sourceBaseline, candidateSetSha256, verdict: "approved-for-F3-intake", independent: true, evidenceSha256: "7".repeat(64), receiptSha256: "1".repeat(64) },
      A11: { owner: "A11", protocolVersion: "1.1.1-f2-r", sourceBaseline, candidateSetSha256, verdict: "approved-for-F3-intake", independent: true, evidenceSha256: "8".repeat(64), receiptSha256: "2".repeat(64) },
      A22: { owner: "A22", protocolVersion: "1.1.1-f2-r", sourceBaseline, candidateSetSha256, verdict: "approved-for-F3-intake", independent: true, evidenceSha256: "9".repeat(64), receiptSha256: "3".repeat(64) },
      A25: { owner: "A25", protocolVersion: "1.1.1-f2-r", sourceBaseline, candidateSetSha256, verdict: "approved-for-intake", independent: true, evidenceSha256: "b".repeat(64), receiptSha256: "4".repeat(64) }
    },
    ownerBudget: {
      ownerSigned: true,
      protocolVersion: "1.1.1-f2-r",
      sourceBaseline,
      candidateSetSha256,
      currencyCap: 100,
      providerCallCap: 48,
      tokenCap: 1_000_000,
      wallClockMinutesCap: 240,
      browserMinutesCap: 0,
      humanMinutesCap: 600,
      reviewedReceiptSha256: {
        A18: "1".repeat(64),
        A11: "2".repeat(64),
        A22: "3".repeat(64),
        A25: "4".repeat(64)
      },
      signatureSha256: "5".repeat(64)
    },
    ownerStartAuthorization: {
      exactInstruction: "批准 F3 正式 48-run",
      protocolVersion: "1.1.1-f2-r",
      sourceBaseline,
      candidateSetSha256: "a".repeat(64),
      ownerBudgetSignatureSha256: "5".repeat(64),
      signatureSha256: "6".repeat(64),
      testFixtureOnly: true
    }
  };
}

function ownerWaiverInputs() {
  const inputs = candidateInputs();
  const waiver = buildA18HumanEvidenceOwnerWaiver();
  inputs.candidateSetSha256 = waiver.candidateSetSha256;
  for (const receipt of Object.values(inputs.gateReceipts)) {
    receipt.candidateSetSha256 = waiver.candidateSetSha256;
  }
  inputs.gateReceipts.A18 = {
    owner: "A18",
    protocolId: "MAIS-RSI-LITE-CAL-V1",
    protocolVersion: "1.1.1-f2-r",
    sourceBaseline: inputs.sourceBaseline,
    candidateSetSha256: waiver.candidateSetSha256,
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
  inputs.a18HumanEvidenceOwnerWaiver = waiver;
  inputs.ownerBudget.candidateSetSha256 = waiver.candidateSetSha256;
  inputs.ownerBudget.reviewedReceiptSha256.A18 = inputs.gateReceipts.A18.receiptSha256;
  inputs.ownerBudget.reviewedA18HumanEvidenceWaiverSha256 = waiver.waiverSha256;
  inputs.ownerStartAuthorization.candidateSetSha256 = waiver.candidateSetSha256;
  return inputs;
}

test("preflight enumerates absent independent receipts, budget, and separate start authorization", () => {
  const decision = buildFormalPreflightDecision({
    sourceBaseline: "b6c7c347a49a813e454e707dd3c16399dcf29909",
    candidateSetSha256: "a".repeat(64),
    gateReceipts: {},
    ownerBudget: null,
    ownerStartAuthorization: null
  });

  assert.equal(decision.formalExecutionAuthorized, false);
  assert.equal(decision.eligibleForOwnerF3Decision, false);
  for (const code of ["A18-receipt", "A11-receipt", "A22-receipt", "A25-receipt", "owner-budget", "separate-F3-start-authorization"]) {
    assert.ok(decision.blockers.some((row) => row.code === code), code);
  }
});

test("preflight rejects a valid-looking receipt, budget, or start instruction bound to another candidate", () => {
  const inputs = candidateInputs();
  inputs.gateReceipts.A18.candidateSetSha256 = "c".repeat(64);
  inputs.ownerBudget.candidateSetSha256 = "d".repeat(64);
  inputs.ownerStartAuthorization.ownerBudgetSignatureSha256 = "e".repeat(64);

  const decision = buildFormalPreflightDecision(inputs);
  for (const code of ["A18-receipt", "owner-budget", "separate-F3-start-authorization"]) {
    assert.ok(decision.blockers.some((row) => row.code === code), code);
  }
  assert.equal(decision.eligibleForOwnerF3Decision, false);
});

test("even a synthetically complete envelope can only become review-eligible in F2-R, never executable", () => {
  const decision = buildFormalPreflightDecision(candidateInputs());

  assert.equal(decision.eligibleForOwnerF3Decision, true);
  assert.equal(decision.formalExecutionAuthorized, false);
  assert.equal(decision.executionEntrypointPresent, false);
  assert.ok(decision.blockers.some((row) => row.code === "F3-execution-entrypoint-intentionally-absent"));
});

test("owner waiver removes human-owned artifacts as an A18 hard gate without authorizing F3", () => {
  const decision = buildFormalPreflightDecision(ownerWaiverInputs());

  assert.equal(decision.gateAcceptance.A18, "independent-machine-ready-receipt-plus-owner-human-evidence-waiver");
  assert.equal(decision.a18HumanEvidenceRequirement, "waived-for-this-feasibility-calibration-intake");
  assert.match(decision.a18HumanEvidenceOwnerWaiverSha256, /^[a-f0-9]{64}$/);
  assert.equal(decision.blockers.some((row) => row.code === "A18-receipt"), false);
  assert.equal(decision.eligibleForOwnerF3Decision, true);
  assert.equal(decision.formalExecutionAuthorized, false);
  assert.equal(decision.executionEntrypointPresent, false);
  assert.ok(decision.blockers.some((row) => row.code === "F3-execution-entrypoint-intentionally-absent"));
});

test("A18 owner waiver fails closed if the budget omits the waiver hash or the machine receipt has open P1", () => {
  const missingBudgetBinding = ownerWaiverInputs();
  delete missingBudgetBinding.ownerBudget.reviewedA18HumanEvidenceWaiverSha256;
  const missingBudgetDecision = buildFormalPreflightDecision(missingBudgetBinding);
  assert.ok(missingBudgetDecision.blockers.some((row) => row.code === "owner-budget"));

  const openP1 = ownerWaiverInputs();
  openP1.gateReceipts.A18.verificationSummary.naturalConstructionP1Rows = 1;
  const openP1Decision = buildFormalPreflightDecision(openP1);
  assert.ok(openP1Decision.blockers.some((row) => row.code === "A18-receipt"));
  assert.equal(openP1Decision.gateAcceptance.A18, "not-accepted");
});

test("formal-result contract rejects denominator drift, missing surfaces, and completion with open P0 or P1", () => {
  const frozen = {
    sourceBaseline: "b6c7c347a49a813e454e707dd3c16399dcf29909",
    candidateSetSha256: "a".repeat(64),
    denominatorSha256: "b".repeat(64),
    requiredSurfaceIds: ["q1", "q2", "lesson1"]
  };
  const invalid = {
    sourceBaseline: frozen.sourceBaseline,
    candidateSetSha256: frozen.candidateSetSha256,
    denominatorSha256: "c".repeat(64),
    surfaceResults: [
      { surfaceId: "q1", disposition: "clean-with-evidence" },
      { surfaceId: "q2", disposition: "finding" }
    ],
    findings: [{ findingId: "f1", surfaceId: "q2", severity: "P1", status: "open" }],
    completionClaim: true
  };

  const findings = validateFormalResultEnvelope({ envelope: invalid, frozen });
  for (const code of ["denominator-drift", "surface-topology", "open-P0-P1-completion"]) {
    assert.ok(findings.some((row) => row.code === code), code);
  }
});

test("formal preflight CLI has no formal, provider, production, or deploy path in F2-R", async () => {
  for (const flag of ["--execute", "--formal-run", "--live-provider", "--production", "--deploy"]) {
    await assert.rejects(
      execFileAsync(process.execPath, [cliPath, flag]),
      (error) => {
        assert.equal(error.code, 2);
        assert.match(error.stderr, /not authorized.*no formal execution entrypoint/i);
        return true;
      }
    );
  }
});
