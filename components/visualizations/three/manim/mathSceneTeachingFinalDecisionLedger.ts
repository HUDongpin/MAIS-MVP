import type {
  MathSceneTeachingFinalReviewDecisionStep,
  MathSceneTeachingFinalReviewPacket,
  MathSceneTeachingFinalReviewRow
} from "./mathSceneTeachingFinalReviewPacket";

export const MATH_SCENE_TEACHING_FINAL_DECISION_LEDGER_SOURCE_CONTRACT =
  "A18/A06 final teaching decision ledger: every rendered MAIS Manim review case is expanded into pending A18 criterion decisions without closing final signoff" as const;

export const MATH_SCENE_TEACHING_FINAL_DECISION_CRITERIA = [
  "curriculum-fit",
  "mathematical-accuracy",
  "cognitive-load",
  "language-and-labels",
  "interaction-timing"
] as const;

export type MathSceneTeachingFinalDecisionCriterion =
  (typeof MATH_SCENE_TEACHING_FINAL_DECISION_CRITERIA)[number];

export type MathSceneTeachingFinalDecisionStatus =
  | "a18-approved"
  | "a18-revisions-required"
  | "blocked-missing-route-or-evidence"
  | "pending-a18-review";

export type MathSceneTeachingFinalDecisionLedgerStatus =
  | "a18-final-approved"
  | "a18-revisions-required"
  | "blocked-missing-route-or-evidence"
  | "pending-a18-final-decisions";

export type MathSceneTeachingFinalDecisionRowStatus =
  | "a18-final-approved"
  | "a18-revisions-required"
  | "blocked-missing-route-or-evidence"
  | "pending-a18-final-decisions";

export type MathSceneTeachingFinalDecision = {
  blockedReasons: string[];
  caseId: MathSceneTeachingFinalReviewRow["caseId"];
  criterion: MathSceneTeachingFinalDecisionCriterion;
  familyId: MathSceneTeachingFinalReviewRow["familyId"];
  href: MathSceneTeachingFinalReviewRow["href"];
  labId: MathSceneTeachingFinalReviewRow["labId"];
  proofPointIds: MathSceneTeachingFinalReviewRow["proofPointIds"];
  reviewStep: MathSceneTeachingFinalReviewDecisionStep;
  sceneId: MathSceneTeachingFinalReviewRow["sceneId"];
  sectionSelector: MathSceneTeachingFinalReviewRow["sectionSelector"];
  sourceEvidenceAttributes: MathSceneTeachingFinalReviewRow["sourceEvidenceAttributes"];
  status: MathSceneTeachingFinalDecisionStatus;
};

export type MathSceneTeachingFinalDecisionLedgerRow = Pick<
  MathSceneTeachingFinalReviewRow,
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
  blockedReasons: string[];
  decisions: MathSceneTeachingFinalDecision[];
  pendingDecisionCount: number;
  rowStatus: MathSceneTeachingFinalDecisionRowStatus;
  sourceContract: typeof MATH_SCENE_TEACHING_FINAL_DECISION_LEDGER_SOURCE_CONTRACT;
  summary: string;
};

export type MathSceneTeachingFinalDecisionLedger = {
  approvedDecisionCount: number;
  blockedCaseCount: number;
  blockedDecisionCount: number;
  canMarkA18GateComplete: boolean;
  caseCount: number;
  criterionCount: number;
  decisionCount: number;
  pendingDecisionCount: number;
  readyCaseCount: number;
  requiredCriteria: readonly MathSceneTeachingFinalDecisionCriterion[];
  revisionDecisionCount: number;
  rows: MathSceneTeachingFinalDecisionLedgerRow[];
  sourceContract: typeof MATH_SCENE_TEACHING_FINAL_DECISION_LEDGER_SOURCE_CONTRACT;
  status: MathSceneTeachingFinalDecisionLedgerStatus;
  summary: string;
};

function reviewStepForCriterion(
  criterion: MathSceneTeachingFinalDecisionCriterion
): MathSceneTeachingFinalReviewDecisionStep {
  return `confirm-${criterion}` as MathSceneTeachingFinalReviewDecisionStep;
}

function decisionStatusForRow(row: MathSceneTeachingFinalReviewRow): MathSceneTeachingFinalDecisionStatus {
  return row.rowStatus === "ready-for-a18-final-rendered-review"
    ? "pending-a18-review"
    : "blocked-missing-route-or-evidence";
}

function rowStatusForDecisions(
  decisions: readonly MathSceneTeachingFinalDecision[]
): MathSceneTeachingFinalDecisionRowStatus {
  if (decisions.some((decision) => decision.status === "blocked-missing-route-or-evidence")) {
    return "blocked-missing-route-or-evidence";
  }

  if (decisions.some((decision) => decision.status === "a18-revisions-required")) {
    return "a18-revisions-required";
  }

  if (decisions.every((decision) => decision.status === "a18-approved")) {
    return "a18-final-approved";
  }

  return "pending-a18-final-decisions";
}

function finalDecisionForCriterion(
  row: MathSceneTeachingFinalReviewRow,
  criterion: MathSceneTeachingFinalDecisionCriterion
): MathSceneTeachingFinalDecision {
  return {
    blockedReasons: row.blockedReasons,
    caseId: row.caseId,
    criterion,
    familyId: row.familyId,
    href: row.href,
    labId: row.labId,
    proofPointIds: row.proofPointIds,
    reviewStep: reviewStepForCriterion(criterion),
    sceneId: row.sceneId,
    sectionSelector: row.sectionSelector,
    sourceEvidenceAttributes: row.sourceEvidenceAttributes,
    status: decisionStatusForRow(row)
  };
}

function ledgerRow(row: MathSceneTeachingFinalReviewRow): MathSceneTeachingFinalDecisionLedgerRow {
  const decisions = MATH_SCENE_TEACHING_FINAL_DECISION_CRITERIA.map((criterion) =>
    finalDecisionForCriterion(row, criterion)
  );
  const rowStatus = rowStatusForDecisions(decisions);
  const pendingDecisionCount = decisions.filter((decision) => decision.status === "pending-a18-review").length;

  return {
    blockedReasons: row.blockedReasons,
    caseId: row.caseId,
    decisions,
    familyId: row.familyId,
    href: row.href,
    labId: row.labId,
    learningObjective: row.learningObjective,
    pendingDecisionCount,
    proofPointIds: row.proofPointIds,
    reviewerPrompt: row.reviewerPrompt,
    rowStatus,
    sceneId: row.sceneId,
    sectionSelector: row.sectionSelector,
    sourceContract: MATH_SCENE_TEACHING_FINAL_DECISION_LEDGER_SOURCE_CONTRACT,
    sourceEvidenceAttributes: row.sourceEvidenceAttributes,
    summary: `${row.caseId}=${pendingDecisionCount}/${decisions.length}-pending`,
    targetBand: row.targetBand
  };
}

function ledgerStatus(
  blockedDecisionCount: number,
  pendingDecisionCount: number,
  revisionDecisionCount: number
): MathSceneTeachingFinalDecisionLedgerStatus {
  if (blockedDecisionCount > 0) return "blocked-missing-route-or-evidence";
  if (revisionDecisionCount > 0) return "a18-revisions-required";
  if (pendingDecisionCount > 0) return "pending-a18-final-decisions";
  return "a18-final-approved";
}

export function buildMathSceneTeachingFinalDecisionLedger(
  packet: MathSceneTeachingFinalReviewPacket
): MathSceneTeachingFinalDecisionLedger {
  const rows = packet.rows.map(ledgerRow);
  const decisions = rows.flatMap((row) => row.decisions);
  const approvedDecisionCount = decisions.filter((decision) => decision.status === "a18-approved").length;
  const blockedDecisionCount = decisions.filter((decision) => decision.status === "blocked-missing-route-or-evidence").length;
  const pendingDecisionCount = decisions.filter((decision) => decision.status === "pending-a18-review").length;
  const revisionDecisionCount = decisions.filter((decision) => decision.status === "a18-revisions-required").length;
  const status = ledgerStatus(blockedDecisionCount, pendingDecisionCount, revisionDecisionCount);
  const canMarkA18GateComplete =
    status === "a18-final-approved" &&
    decisions.length > 0 &&
    approvedDecisionCount === decisions.length;

  return {
    approvedDecisionCount,
    blockedCaseCount: rows.filter((row) => row.rowStatus === "blocked-missing-route-or-evidence").length,
    blockedDecisionCount,
    canMarkA18GateComplete,
    caseCount: rows.length,
    criterionCount: MATH_SCENE_TEACHING_FINAL_DECISION_CRITERIA.length,
    decisionCount: decisions.length,
    pendingDecisionCount,
    readyCaseCount: rows.filter((row) => row.rowStatus === "pending-a18-final-decisions").length,
    requiredCriteria: MATH_SCENE_TEACHING_FINAL_DECISION_CRITERIA,
    revisionDecisionCount,
    rows,
    sourceContract: MATH_SCENE_TEACHING_FINAL_DECISION_LEDGER_SOURCE_CONTRACT,
    status,
    summary: [
      "a18TeachingFinalDecisionLedger",
      `status=${status}`,
      `decisions=${pendingDecisionCount}/${decisions.length}-pending`,
      rows.map((row) => row.summary).join(";")
    ].join(":")
  };
}

export function mathSceneTeachingFinalDecisionLedgerDataAttributes(
  ledger: MathSceneTeachingFinalDecisionLedger
) {
  return {
    "data-viz-manim-teaching-final-decision-approved-count": String(ledger.approvedDecisionCount),
    "data-viz-manim-teaching-final-decision-blocked-count": String(ledger.blockedDecisionCount),
    "data-viz-manim-teaching-final-decision-can-complete": String(ledger.canMarkA18GateComplete),
    "data-viz-manim-teaching-final-decision-case-count": String(ledger.caseCount),
    "data-viz-manim-teaching-final-decision-criterion-count": String(ledger.criterionCount),
    "data-viz-manim-teaching-final-decision-decision-count": String(ledger.decisionCount),
    "data-viz-manim-teaching-final-decision-pending-count": String(ledger.pendingDecisionCount),
    "data-viz-manim-teaching-final-decision-record-template-manifest": ledger.rows
      .flatMap((row) =>
        row.decisions.map(
          (decision) =>
            `${decision.caseId}:${decision.criterion}=reviewer:A18|status:${decision.status}|revisionNote:`
        )
      )
      .join(";"),
    "data-viz-manim-teaching-final-decision-revision-count": String(ledger.revisionDecisionCount),
    "data-viz-manim-teaching-final-decision-review-step-manifest": ledger.rows
      .flatMap((row) =>
        row.decisions.map((decision) => `${decision.caseId}:${decision.criterion}=${decision.reviewStep}|${decision.status}`)
      )
      .join(";"),
    "data-viz-manim-teaching-final-decision-source-contract": ledger.sourceContract,
    "data-viz-manim-teaching-final-decision-status": ledger.status,
    "data-viz-manim-teaching-final-decision-summary": ledger.rows
      .map((row) => row.summary)
      .join(";")
  } as const;
}
