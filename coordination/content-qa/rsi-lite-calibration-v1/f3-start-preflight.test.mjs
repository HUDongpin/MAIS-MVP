import assert from "node:assert/strict";
import test from "node:test";

import { buildA18HumanEvidenceOwnerWaiver } from "./a18-owner-waiver.mjs";
import {
  buildF3EntrypointReceipt,
  buildOwnerBudgetAuthorization,
  buildOwnerF3StartAuthorization
} from "./f3-authorization.mjs";
import { buildF3StartPreflightDecision } from "./f3-start-preflight.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

const SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";
const CANDIDATE = "e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c";
const OWNER_SOURCE = "我全部授权。预算多少我不知道，Codex帮我估算";

function selfHashed(body) {
  return { ...body, receiptSha256: canonicalSha256(body) };
}

function a18MachineReceipt() {
  return {
    owner: "A18",
    protocolId: "MAIS-RSI-LITE-CAL-V1",
    protocolVersion: "1.1.1-f2-r",
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: CANDIDATE,
    verdict: "blocked",
    independent: true,
    machineReadyForHumanReview: true,
    approvedForF3Intake: false,
    evidenceExactByteSha256: "99d1ca0c4d3c038531fd09985bcedc7c374b5a1d19948ce5ab8923d8d8352976",
    receiptSha256: "4e342d0e834ff03972b5004cb139b34bb8cc598c4f143892f57d19d5dc036284",
    verificationSummary: { packageCanonicalHashMismatches: 0, candidateSetHashMatches: true, naturalConstructionP0Rows: 0, naturalConstructionP1Rows: 0 }
  };
}

function entrypointReceipt() {
  return buildF3EntrypointReceipt({
    codeFiles: [
      { path: "f3-execution-contract.mjs", sha256: "1".repeat(64) },
      { path: "f3-provider-adapter.mjs", sha256: "2".repeat(64) },
      { path: "f3-formal-runner.mjs", sha256: "3".repeat(64) },
      { path: "f3-campaign.mjs", sha256: "4".repeat(64) }
    ],
    rehearsal: { runs: 48, runCountsByArm: { A: 12, B: 12, C0: 12, C: 12 }, providerCalls: 144, failures: 0, receiptSha256: "5".repeat(64) },
    liveProviderSmoke: { passed: true, provider: "DeepSeek", model: "deepseek-v4-pro", httpStatus: 200, validJson: true, receiptSha256: "6".repeat(64) }
  });
}

function gateReceipt(owner, entrypoint) {
  const common = {
    owner,
    protocolId: "MAIS-RSI-LITE-CAL-V1",
    protocolVersion: "1.1.1-f2-r",
    executionAmendmentId: "MAIS-RSI-LITE-CAL-V1-F3-1",
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: CANDIDATE,
    independent: true,
    evidenceSha256: canonicalSha256(`${owner}-evidence`),
    entrypointReceiptSha256: entrypoint.receiptSha256
  };
  if (owner === "A11") return selfHashed({ ...common, verdict: "approved-for-F3-execution", rehearsalRuns: 48, rehearsalProviderCalls: 144, failures: 0 });
  if (owner === "A22") return selfHashed({ ...common, verdict: "approved-for-F3-execution", seatbeltRuntimeRehearsalPass: true, credentialEnvironmentAbsent: true, networkDenied: true, repositoryReadDenied: true });
  return selfHashed({ ...common, verdict: "approved-for-F3-execution-intake", isolatedWorktree: true, mainNotMutated: true, stagedPaths: 0, trackedUnstagedPaths: 0, commitPushPerformed: false });
}

function completeInputs() {
  const entrypoint = entrypointReceipt();
  const gateReceipts = {
    A11: gateReceipt("A11", entrypoint),
    A22: gateReceipt("A22", entrypoint),
    A25: gateReceipt("A25", entrypoint)
  };
  const a18Receipt = a18MachineReceipt();
  const waiver = buildA18HumanEvidenceOwnerWaiver();
  const budget = buildOwnerBudgetAuthorization({
    reviewedReceipts: { A18: a18Receipt, ...gateReceipts },
    a18Waiver: waiver,
    entrypointReceipt: entrypoint,
    sourceInstructionExact: OWNER_SOURCE
  });
  const start = buildOwnerF3StartAuthorization({
    ownerBudget: budget,
    entrypointReceipt: entrypoint,
    sourceInstructionExact: OWNER_SOURCE
  });
  return { entrypointReceipt: entrypoint, gateReceipts: { A18: a18Receipt, ...gateReceipts }, a18HumanEvidenceOwnerWaiver: waiver, ownerBudget: budget, ownerStartAuthorization: start };
}

test("owner-authorized estimate freezes a conservative USD 50 / 200-call / 30M-token envelope for 144 planned calls", () => {
  const inputs = completeInputs();
  assert.equal(inputs.ownerBudget.currencyCapUsd, 50);
  assert.equal(inputs.ownerBudget.providerCallCap, 200);
  assert.equal(inputs.ownerBudget.tokenCap, 30_000_000);
  assert.equal(inputs.ownerBudget.plannedProviderCalls, 144);
  assert.equal(inputs.ownerBudget.estimatedOffPeakCostUsd, 17.524236);
  assert.equal(inputs.ownerBudget.peakCostBeforeSafetyUsd, 35.048471);
  assert.equal(inputs.ownerBudget.ownerSigned, true);
  assert.match(inputs.ownerBudget.signatureSha256, /^[a-f0-9]{64}$/);
});

test("the source authorization is preserved verbatim while a separate canonical F3 start instruction is explicitly normalized and budget-bound", () => {
  const { ownerBudget, ownerStartAuthorization, entrypointReceipt } = completeInputs();
  assert.equal(ownerStartAuthorization.sourceInstructionExact, OWNER_SOURCE);
  assert.equal(ownerStartAuthorization.exactInstruction, "批准 F3 正式 48-run");
  assert.equal(ownerStartAuthorization.ownerBudgetSignatureSha256, ownerBudget.signatureSha256);
  assert.equal(ownerStartAuthorization.entrypointReceiptSha256, entrypointReceipt.receiptSha256);
  assert.equal(ownerStartAuthorization.ownerAuthorized, true);
});

test("F3 preflight authorizes only the formal live-provider campaign when every receipt, budget, start record, and entrypoint hash matches", () => {
  const decision = buildF3StartPreflightDecision(completeInputs());
  assert.equal(decision.blockers.length, 0);
  assert.equal(decision.formalExecutionAuthorized, true);
  assert.equal(decision.liveProviderAuthorized, true);
  assert.equal(decision.executionEntrypointPresent, true);
  assert.equal(decision.productionAuthorized, false);
  assert.equal(decision.deploymentAuthorized, false);
  assert.equal(decision.gitCommitAuthorized, false);
  assert.equal(decision.gitPushAuthorized, false);
});

test("F3 preflight fails closed for receipt drift, a raised budget, a noncanonical start record, or missing Seatbelt proof", () => {
  const cases = [
    (inputs) => { inputs.gateReceipts.A11.entrypointReceiptSha256 = "9".repeat(64); },
    (inputs) => { inputs.ownerBudget.currencyCapUsd = 51; },
    (inputs) => { inputs.ownerStartAuthorization.exactInstruction = "全部批准"; },
    (inputs) => { inputs.gateReceipts.A22.networkDenied = false; }
  ];
  for (const mutate of cases) {
    const inputs = completeInputs();
    mutate(inputs);
    const decision = buildF3StartPreflightDecision(inputs);
    assert.equal(decision.formalExecutionAuthorized, false);
    assert.ok(decision.blockers.length > 0);
  }
});
