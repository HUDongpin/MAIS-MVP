import { PROTOCOL_VERSION, SOURCE_BASELINE } from "./calibration-design.mjs";
import { validateA18HumanEvidenceOwnerWaiver } from "./a18-owner-waiver.mjs";

const REQUIRED_GATES = Object.freeze({
  A18: "approved-for-F3-intake",
  A11: "approved-for-F3-intake",
  A22: "approved-for-F3-intake",
  A25: "approved-for-intake"
});

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const EXACT_START_INSTRUCTION = "批准 F3 正式 48-run";

function blocker(code, detail) {
  return { code, detail };
}

function validSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function validateGateReceipt(owner, receipt, { sourceBaseline, candidateSetSha256 }) {
  if (!receipt || typeof receipt !== "object") return false;
  return receipt.owner === owner
    && receipt.protocolVersion === PROTOCOL_VERSION
    && receipt.sourceBaseline === sourceBaseline
    && receipt.sourceBaseline === SOURCE_BASELINE
    && receipt.candidateSetSha256 === candidateSetSha256
    && receipt.verdict === REQUIRED_GATES[owner]
    && receipt.independent === true
    && validSha256(receipt.evidenceSha256)
    && validSha256(receipt.receiptSha256);
}

function validateBudget(
  budget,
  {
    sourceBaseline,
    candidateSetSha256,
    gateReceipts,
    a18HumanEvidenceOwnerWaiver,
    a18WaiverAccepted
  }
) {
  if (!budget || budget.ownerSigned !== true || !validSha256(budget.signatureSha256)) return false;
  const positiveCaps = [budget.currencyCap, budget.providerCallCap, budget.tokenCap, budget.wallClockMinutesCap, budget.humanMinutesCap];
  const reviewedReceiptsMatch = Object.keys(REQUIRED_GATES).every(
    (owner) => budget.reviewedReceiptSha256?.[owner] === gateReceipts[owner]?.receiptSha256
  );
  const reviewedA18WaiverMatches = !a18WaiverAccepted
    || budget.reviewedA18HumanEvidenceWaiverSha256 === a18HumanEvidenceOwnerWaiver?.waiverSha256;
  return budget.protocolVersion === PROTOCOL_VERSION
    && budget.sourceBaseline === sourceBaseline
    && budget.sourceBaseline === SOURCE_BASELINE
    && budget.candidateSetSha256 === candidateSetSha256
    && reviewedReceiptsMatch
    && reviewedA18WaiverMatches
    && positiveCaps.every((value) => Number.isFinite(value) && value > 0)
    && Number.isFinite(budget.browserMinutesCap)
    && budget.browserMinutesCap === 0;
}

function validateSeparateStartAuthorization(authorization, { sourceBaseline, candidateSetSha256, ownerBudget }) {
  if (!authorization || typeof authorization !== "object") return false;
  return authorization.exactInstruction === EXACT_START_INSTRUCTION
    && authorization.protocolVersion === PROTOCOL_VERSION
    && authorization.sourceBaseline === sourceBaseline
    && authorization.sourceBaseline === SOURCE_BASELINE
    && authorization.candidateSetSha256 === candidateSetSha256
    && authorization.ownerBudgetSignatureSha256 === ownerBudget?.signatureSha256
    && validSha256(authorization.signatureSha256);
}

export function buildFormalPreflightDecision({
  sourceBaseline,
  candidateSetSha256,
  gateReceipts = {},
  a18HumanEvidenceOwnerWaiver,
  ownerBudget,
  ownerStartAuthorization
}) {
  const blockers = [];
  const gateAcceptance = {};
  if (sourceBaseline !== SOURCE_BASELINE) blockers.push(blocker("source-baseline", "The source baseline is not the frozen F2-R baseline."));
  if (!validSha256(candidateSetSha256)) blockers.push(blocker("candidate-set-commitment", "A valid candidate-set SHA-256 commitment is required."));
  for (const owner of Object.keys(REQUIRED_GATES)) {
    const standardReceiptAccepted = validateGateReceipt(
      owner,
      gateReceipts[owner],
      { sourceBaseline, candidateSetSha256 }
    );
    const ownerWaiverAccepted = owner === "A18"
      && !standardReceiptAccepted
      && validateA18HumanEvidenceOwnerWaiver(
        a18HumanEvidenceOwnerWaiver,
        {
          sourceBaseline,
          candidateSetSha256,
          a18Receipt: gateReceipts.A18
        }
      );
    if (standardReceiptAccepted) {
      gateAcceptance[owner] = "independent-approved-receipt";
    } else if (ownerWaiverAccepted) {
      gateAcceptance[owner] = "independent-machine-ready-receipt-plus-owner-human-evidence-waiver";
    } else {
      gateAcceptance[owner] = "not-accepted";
      const detail = owner === "A18"
        ? "A18 must provide either an independent approved intake receipt or an independent machine-ready receipt paired with a valid owner human-evidence waiver bound to the exact protocol, source baseline, candidate set, evidence, and receipt hash."
        : `${owner} must provide an independent receipt bound to the exact protocol, source baseline, candidate set, evidence, and intake verdict.`;
      blockers.push(blocker(`${owner}-receipt`, detail));
    }
  }
  const a18WaiverAccepted = gateAcceptance.A18 === "independent-machine-ready-receipt-plus-owner-human-evidence-waiver";
  if (!validateBudget(ownerBudget, {
    sourceBaseline,
    candidateSetSha256,
    gateReceipts,
    a18HumanEvidenceOwnerWaiver,
    a18WaiverAccepted
  })) blockers.push(blocker("owner-budget", "The owner must review the exact four receipt hashes and any accepted A18 waiver hash, bind the budget to this candidate set, sign every positive resource cap, and keep browser minutes at zero."));
  if (!validateSeparateStartAuthorization(ownerStartAuthorization, { sourceBaseline, candidateSetSha256, ownerBudget })) {
    blockers.push(blocker("separate-F3-start-authorization", `A separate owner instruction exactly matching “${EXACT_START_INSTRUCTION}” and bound to this protocol/candidate set is absent.`));
  }
  const eligibleForOwnerF3Decision = blockers.length === 0;
  blockers.push(blocker("F3-execution-entrypoint-intentionally-absent", "F2-R contains validation contracts only; it has no formal package executor, provider adapter, or 48-run loop."));
  return {
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline,
    candidateSetSha256,
    gateAcceptance,
    a18HumanEvidenceRequirement: a18WaiverAccepted
      ? "waived-for-this-feasibility-calibration-intake"
      : "standard-independent-human-evidence-path",
    a18HumanEvidenceOwnerWaiverSha256: a18WaiverAccepted
      ? a18HumanEvidenceOwnerWaiver.waiverSha256
      : null,
    eligibleForOwnerF3Decision,
    formalExecutionAuthorized: false,
    executionEntrypointPresent: false,
    liveProviderAuthorized: false,
    productionAuthorized: false,
    blockers,
    interpretation: `This preflight can make an envelope eligible for a later owner decision; it can never start F3 in protocol version ${PROTOCOL_VERSION}.`
  };
}

export function validateFormalResultEnvelope({ envelope, frozen }) {
  const findings = [];
  const push = (code, detail) => findings.push({ code, detail });
  if (!envelope || typeof envelope !== "object") return [blocker("envelope-shape", "Formal result envelope is not an object.")];
  if (envelope.sourceBaseline !== frozen.sourceBaseline || envelope.sourceBaseline !== SOURCE_BASELINE) push("source-baseline", "Source baseline drifted.");
  if (envelope.candidateSetSha256 !== frozen.candidateSetSha256) push("candidate-set-drift", "Candidate-set commitment drifted.");
  if (envelope.denominatorSha256 !== frozen.denominatorSha256) push("denominator-drift", "The frozen denominator commitment drifted.");
  const text = JSON.stringify(envelope);
  for (const forbidden of ["goldLedger", "randomizationSeed", "latentDefect", "goldAnswer"]) {
    if (text.includes(forbidden)) push("gold-access", `Formal result contains forbidden gold field ${forbidden}.`);
  }

  const requiredIds = [...frozen.requiredSurfaceIds].sort();
  const surfaceResults = Array.isArray(envelope.surfaceResults) ? envelope.surfaceResults : [];
  const observedIds = surfaceResults.map((row) => row.surfaceId).sort();
  if (
    observedIds.length !== requiredIds.length
    || new Set(observedIds).size !== requiredIds.length
    || JSON.stringify(observedIds) !== JSON.stringify(requiredIds)
  ) push("surface-topology", "Required surfaces are missing, duplicated, or changed.");

  const allowedDispositions = new Set(["finding", "clean-with-evidence", "unjudgeable", "not-inspected"]);
  if (surfaceResults.some((row) => !allowedDispositions.has(row.disposition))) push("surface-disposition", "A surface disposition is invalid.");
  const findingsRows = Array.isArray(envelope.findings) ? envelope.findings : [];
  if (findingsRows.some((row) => !requiredIds.includes(row.surfaceId))) push("finding-topology", "A finding names a surface outside the frozen denominator.");
  const openHighSeverity = findingsRows.filter((row) => (row.severity === "P0" || row.severity === "P1") && row.status !== "closed");
  if (envelope.completionClaim === true && openHighSeverity.length > 0) push("open-P0-P1-completion", "Completion cannot be claimed with open P0/P1 findings.");
  if (envelope.completionClaim === true && surfaceResults.some((row) => row.disposition === "unjudgeable" || row.disposition === "not-inspected")) push("incomplete-surface-completion", "Completion cannot be claimed with unjudgeable or not-inspected surfaces.");
  return findings;
}
