import type {
  MathSceneTeachingFinalDecision,
  MathSceneTeachingFinalDecisionCriterion,
  MathSceneTeachingFinalDecisionLedger,
  MathSceneTeachingFinalDecisionLedgerRow,
  MathSceneTeachingFinalDecisionStatus
} from "./mathSceneTeachingFinalDecisionLedger";

export const MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT =
  "A06 teaching source confirmation ledger: confirms source evidence for every concrete MAIS Manim criterion while keeping A18 final decisions pending" as const;

export type MathSceneTeachingA06SourceConfirmationLedgerStatus =
  | "a06-source-confirmed-a18-pending"
  | "blocked-missing-source-evidence";

export type MathSceneTeachingA06SourceStatus =
  | "a06-source-confirmed"
  | "blocked-missing-source-evidence";

export type MathSceneTeachingA06SourceConfirmation = {
  a06EvidenceChecks: string[];
  a06SourceStatus: MathSceneTeachingA06SourceStatus;
  a18DecisionStatus: MathSceneTeachingFinalDecisionStatus;
  blockedReasons: string[];
  canReplaceA18Decision: false;
  caseId: MathSceneTeachingFinalDecision["caseId"];
  criterion: MathSceneTeachingFinalDecisionCriterion;
  familyId: MathSceneTeachingFinalDecision["familyId"];
  href: MathSceneTeachingFinalDecision["href"];
  labId: MathSceneTeachingFinalDecision["labId"];
  proofPointIds: MathSceneTeachingFinalDecision["proofPointIds"];
  sceneId: MathSceneTeachingFinalDecision["sceneId"];
  sectionSelector: MathSceneTeachingFinalDecision["sectionSelector"];
  sourceEvidenceAttributes: MathSceneTeachingFinalDecision["sourceEvidenceAttributes"];
};

export type MathSceneTeachingA06SourceConfirmationRow = Pick<
  MathSceneTeachingFinalDecisionLedgerRow,
  | "caseId"
  | "familyId"
  | "href"
  | "labId"
  | "learningObjective"
  | "proofPointIds"
  | "reviewerPrompt"
  | "sceneId"
  | "sectionSelector"
  | "sourceEvidenceAttributes"
  | "targetBand"
> & {
  a06ConfirmedDecisionCount: number;
  blockedConfirmationCount: number;
  confirmations: MathSceneTeachingA06SourceConfirmation[];
  rowStatus: MathSceneTeachingA06SourceConfirmationLedgerStatus;
  summary: string;
};

export type MathSceneTeachingA06SourceConfirmationLedger = {
  a06ConfirmedDecisionCount: number;
  blockedConfirmationCount: number;
  canMarkA18GateComplete: boolean;
  caseCount: number;
  confirmationCount: number;
  criterionCount: number;
  pendingA18DecisionCount: number;
  requiredCriteria: readonly MathSceneTeachingFinalDecisionCriterion[];
  rows: MathSceneTeachingA06SourceConfirmationRow[];
  sourceContract: typeof MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT;
  status: MathSceneTeachingA06SourceConfirmationLedgerStatus;
  summary: string;
};

function hasSourceEvidence(decision: MathSceneTeachingFinalDecision) {
  return (
    decision.proofPointIds.length > 0 &&
    Object.keys(decision.sourceEvidenceAttributes).length > 0 &&
    typeof decision.href === "string" &&
    decision.href.length > 0 &&
    typeof decision.sectionSelector === "string" &&
    decision.sectionSelector.length > 0
  );
}

function a06EvidenceChecks(decision: MathSceneTeachingFinalDecision) {
  return [
    decision.href ? "rendered-route-ready" : "missing-rendered-route",
    decision.proofPointIds.length > 0 ? "source-proof-points-ready" : "missing-proof-points",
    Object.keys(decision.sourceEvidenceAttributes).length > 0
      ? "source-evidence-attributes-present"
      : "missing-source-evidence-attributes",
    decision.sectionSelector ? "section-selector-present" : "missing-section-selector"
  ];
}

function sourceConfirmation(
  decision: MathSceneTeachingFinalDecision
): MathSceneTeachingA06SourceConfirmation {
  const a06SourceStatus = hasSourceEvidence(decision)
    ? "a06-source-confirmed"
    : "blocked-missing-source-evidence";

  return {
    a06EvidenceChecks: a06EvidenceChecks(decision),
    a06SourceStatus,
    a18DecisionStatus: decision.status,
    blockedReasons: a06SourceStatus === "a06-source-confirmed" ? [] : decision.blockedReasons,
    canReplaceA18Decision: false,
    caseId: decision.caseId,
    criterion: decision.criterion,
    familyId: decision.familyId,
    href: decision.href,
    labId: decision.labId,
    proofPointIds: decision.proofPointIds,
    sceneId: decision.sceneId,
    sectionSelector: decision.sectionSelector,
    sourceEvidenceAttributes: decision.sourceEvidenceAttributes
  };
}

function rowStatus(
  confirmations: readonly MathSceneTeachingA06SourceConfirmation[]
): MathSceneTeachingA06SourceConfirmationLedgerStatus {
  return confirmations.every((confirmation) => confirmation.a06SourceStatus === "a06-source-confirmed")
    ? "a06-source-confirmed-a18-pending"
    : "blocked-missing-source-evidence";
}

function confirmationRow(
  row: MathSceneTeachingFinalDecisionLedgerRow
): MathSceneTeachingA06SourceConfirmationRow {
  const confirmations = row.decisions.map(sourceConfirmation);
  const status = rowStatus(confirmations);
  const a06ConfirmedDecisionCount = confirmations.filter(
    (confirmation) => confirmation.a06SourceStatus === "a06-source-confirmed"
  ).length;
  const blockedConfirmationCount = confirmations.length - a06ConfirmedDecisionCount;

  return {
    a06ConfirmedDecisionCount,
    blockedConfirmationCount,
    caseId: row.caseId,
    confirmations,
    familyId: row.familyId,
    href: row.href,
    labId: row.labId,
    learningObjective: row.learningObjective,
    proofPointIds: row.proofPointIds,
    reviewerPrompt: row.reviewerPrompt,
    rowStatus: status,
    sceneId: row.sceneId,
    sectionSelector: row.sectionSelector,
    sourceEvidenceAttributes: row.sourceEvidenceAttributes,
    summary: `${row.caseId}=${a06ConfirmedDecisionCount}/${confirmations.length}-a06-confirmed`,
    targetBand: row.targetBand
  };
}

export function buildMathSceneTeachingA06SourceConfirmationLedger(
  ledger: MathSceneTeachingFinalDecisionLedger
): MathSceneTeachingA06SourceConfirmationLedger {
  const rows = ledger.rows.map(confirmationRow);
  const confirmationCount = rows.reduce((sum, row) => sum + row.confirmations.length, 0);
  const a06ConfirmedDecisionCount = rows.reduce((sum, row) => sum + row.a06ConfirmedDecisionCount, 0);
  const blockedConfirmationCount = rows.reduce((sum, row) => sum + row.blockedConfirmationCount, 0);
  const pendingA18DecisionCount = rows
    .flatMap((row) => row.confirmations)
    .filter((confirmation) => confirmation.a18DecisionStatus === "pending-a18-review").length;
  const status = blockedConfirmationCount === 0
    ? "a06-source-confirmed-a18-pending"
    : "blocked-missing-source-evidence";

  return {
    a06ConfirmedDecisionCount,
    blockedConfirmationCount,
    canMarkA18GateComplete: false,
    caseCount: rows.length,
    confirmationCount,
    criterionCount: ledger.criterionCount,
    pendingA18DecisionCount,
    requiredCriteria: ledger.requiredCriteria,
    rows,
    sourceContract: MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT,
    status,
    summary: [
      "a06TeachingSourceConfirmationLedger",
      `status=${status}`,
      `confirmed=${a06ConfirmedDecisionCount}/${confirmationCount}`,
      `pendingA18=${pendingA18DecisionCount}`,
      rows.map((row) => row.summary).join(";")
    ].join(":")
  };
}

export function mathSceneTeachingA06SourceConfirmationLedgerDataAttributes(
  ledger: MathSceneTeachingA06SourceConfirmationLedger
) {
  return {
    "data-viz-manim-teaching-a06-source-confirmation-blocked-count": String(ledger.blockedConfirmationCount),
    "data-viz-manim-teaching-a06-source-confirmation-can-complete": String(ledger.canMarkA18GateComplete),
    "data-viz-manim-teaching-a06-source-confirmation-case-count": String(ledger.caseCount),
    "data-viz-manim-teaching-a06-source-confirmation-confirmed-count": String(ledger.a06ConfirmedDecisionCount),
    "data-viz-manim-teaching-a06-source-confirmation-pending-a18-count": String(ledger.pendingA18DecisionCount),
    "data-viz-manim-teaching-a06-source-confirmation-source-contract": ledger.sourceContract,
    "data-viz-manim-teaching-a06-source-confirmation-status": ledger.status,
    "data-viz-manim-teaching-a06-source-confirmation-summary": ledger.rows
      .map((row) => row.summary)
      .join(";")
  } as const;
}
