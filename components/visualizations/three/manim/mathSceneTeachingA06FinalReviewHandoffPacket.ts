import type {
  MathSceneTeachingA06SourceConfirmationLedger,
  MathSceneTeachingA06SourceConfirmationRow
} from "./mathSceneTeachingA06SourceConfirmationLedger";
import type {
  MathSceneTeachingFinalDecisionCriterion
} from "./mathSceneTeachingFinalDecisionLedger";
import type {
  MathSceneTeachingFinalReviewPacket,
  MathSceneTeachingFinalReviewRow
} from "./mathSceneTeachingFinalReviewPacket";

export const MATH_SCENE_TEACHING_A06_FINAL_REVIEW_HANDOFF_PACKET_SOURCE_CONTRACT =
  "A06 final teaching review handoff packet: source-confirmed concrete MAIS Manim scenes and criterion rows prepared for A18 final rendered teaching decisions without replacing A18 signoff" as const;

export type MathSceneTeachingA06FinalReviewHandoffStatus =
  | "a06-final-review-handoff-ready-a18-pending"
  | "blocked-a06-source-confirmation-incomplete"
  | "blocked-final-review-packet-incomplete";

export type MathSceneTeachingA06FinalReviewHandoffBlocker =
  | "a06-source-confirmations-incomplete"
  | "final-review-packet-not-ready";

export type MathSceneTeachingA06FinalReviewHandoffInput = {
  a18CanonicalReportPath: string;
  checkedAtHkt: string;
  finalReviewPacket: MathSceneTeachingFinalReviewPacket;
  sourceConfirmationLedger: MathSceneTeachingA06SourceConfirmationLedger;
};

export type MathSceneTeachingA06FinalReviewHandoffRow = Pick<
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
  a06ConfirmedCriterionCount: number;
  blockedCriterionCount: number;
  criteriaStatusManifest: string;
  criterionDecisionCount: number;
  pendingA18CriterionCount: number;
  readyProofPointCount: number;
  status: MathSceneTeachingA06SourceConfirmationRow["rowStatus"];
  summary: string;
  totalProofPointCount: number;
};

export type MathSceneTeachingA06FinalReviewHandoffPacket = {
  a06ConfirmedDecisionCount: number;
  a18CanonicalReportPath: string;
  a18ReviewerAgentId: "A18";
  blockedConfirmationCount: number;
  blockers: MathSceneTeachingA06FinalReviewHandoffBlocker[];
  canMarkA18GateComplete: boolean;
  caseCount: number;
  caseStatusManifest: string;
  checkedAtHkt: string;
  criteriaStatusManifest: string;
  criterionCount: number;
  decisionCount: number;
  ownerAgentIds: readonly ["A06", "A18"];
  pendingA18DecisionCount: number;
  readyCaseCount: number;
  readyProofPointCount: number;
  requiredA18DecisionCriteria: readonly MathSceneTeachingFinalDecisionCriterion[];
  rows: MathSceneTeachingA06FinalReviewHandoffRow[];
  sourceContract: typeof MATH_SCENE_TEACHING_A06_FINAL_REVIEW_HANDOFF_PACKET_SOURCE_CONTRACT;
  status: MathSceneTeachingA06FinalReviewHandoffStatus;
  summary: string;
  totalProofPointCount: number;
};

function finalReviewRowByCaseId(packet: MathSceneTeachingFinalReviewPacket) {
  return new Map(packet.rows.map((row) => [row.caseId, row]));
}

function criteriaStatusManifest(row: MathSceneTeachingA06SourceConfirmationRow) {
  return row.confirmations
    .map((confirmation) =>
      `${confirmation.criterion}=${confirmation.a06SourceStatus}|${confirmation.a18DecisionStatus}`
    )
    .join(";");
}

function handoffRow(
  sourceRow: MathSceneTeachingA06SourceConfirmationRow,
  finalReviewRow: MathSceneTeachingFinalReviewRow | undefined
): MathSceneTeachingA06FinalReviewHandoffRow {
  const criterionDecisionCount = sourceRow.confirmations.length;
  const pendingA18CriterionCount = sourceRow.confirmations.filter(
    (confirmation) => confirmation.a18DecisionStatus === "pending-a18-review"
  ).length;
  const readyProofPointCount = finalReviewRow?.readyProofPointCount ?? sourceRow.proofPointIds.length;
  const totalProofPointCount = finalReviewRow?.totalProofPointCount ?? sourceRow.proofPointIds.length;

  return {
    a06ConfirmedCriterionCount: sourceRow.a06ConfirmedDecisionCount,
    blockedCriterionCount: sourceRow.blockedConfirmationCount,
    caseId: sourceRow.caseId,
    criteriaStatusManifest: criteriaStatusManifest(sourceRow),
    criterionDecisionCount,
    familyId: sourceRow.familyId,
    href: sourceRow.href,
    labId: sourceRow.labId,
    learningObjective: sourceRow.learningObjective,
    pendingA18CriterionCount,
    proofPointIds: sourceRow.proofPointIds,
    readyProofPointCount,
    reviewerPrompt: sourceRow.reviewerPrompt,
    sceneId: sourceRow.sceneId,
    sectionSelector: sourceRow.sectionSelector,
    sourceEvidenceAttributes: sourceRow.sourceEvidenceAttributes,
    status: sourceRow.rowStatus,
    summary: [
      `${sourceRow.caseId}=${sourceRow.rowStatus}`,
      `a06=${sourceRow.a06ConfirmedDecisionCount}/${criterionDecisionCount}`,
      `pendingA18=${pendingA18CriterionCount}`,
      `proofPoints=${readyProofPointCount}/${totalProofPointCount}`
    ].join(":"),
    targetBand: sourceRow.targetBand,
    totalProofPointCount
  };
}

function packetStatus(
  finalReviewPacket: MathSceneTeachingFinalReviewPacket,
  sourceConfirmationLedger: MathSceneTeachingA06SourceConfirmationLedger
): MathSceneTeachingA06FinalReviewHandoffStatus {
  if (finalReviewPacket.status !== "ready-for-a18-final-rendered-review") {
    return "blocked-final-review-packet-incomplete";
  }

  if (sourceConfirmationLedger.status !== "a06-source-confirmed-a18-pending") {
    return "blocked-a06-source-confirmation-incomplete";
  }

  return "a06-final-review-handoff-ready-a18-pending";
}

function blockersForStatus(
  status: MathSceneTeachingA06FinalReviewHandoffStatus
): MathSceneTeachingA06FinalReviewHandoffBlocker[] {
  if (status === "blocked-final-review-packet-incomplete") return ["final-review-packet-not-ready"];
  if (status === "blocked-a06-source-confirmation-incomplete") return ["a06-source-confirmations-incomplete"];
  return [];
}

function caseStatusManifest(rows: readonly MathSceneTeachingA06FinalReviewHandoffRow[]) {
  return rows.map((row) => `${row.caseId}=${row.status}`).join(";") || "none";
}

function packetCriteriaStatusManifest(rows: readonly MathSceneTeachingA06FinalReviewHandoffRow[]) {
  return rows.map((row) => `${row.caseId}=${row.criteriaStatusManifest}`).join(";") || "none";
}

export function buildMathSceneTeachingA06FinalReviewHandoffPacket(
  input: MathSceneTeachingA06FinalReviewHandoffInput
): MathSceneTeachingA06FinalReviewHandoffPacket {
  const finalRowsByCaseId = finalReviewRowByCaseId(input.finalReviewPacket);
  const rows = input.sourceConfirmationLedger.rows.map((row) => handoffRow(row, finalRowsByCaseId.get(row.caseId)));
  const status = packetStatus(input.finalReviewPacket, input.sourceConfirmationLedger);
  const blockers = blockersForStatus(status);
  const readyCaseCount = rows.filter((row) => row.status === "a06-source-confirmed-a18-pending").length;
  const readyProofPointCount = rows.reduce((sum, row) => sum + row.readyProofPointCount, 0);
  const totalProofPointCount = rows.reduce((sum, row) => sum + row.totalProofPointCount, 0);
  const caseStatuses = caseStatusManifest(rows);
  const criteriaStatuses = packetCriteriaStatusManifest(rows);

  return {
    a06ConfirmedDecisionCount: input.sourceConfirmationLedger.a06ConfirmedDecisionCount,
    a18CanonicalReportPath: input.a18CanonicalReportPath,
    a18ReviewerAgentId: "A18",
    blockedConfirmationCount: input.sourceConfirmationLedger.blockedConfirmationCount,
    blockers,
    canMarkA18GateComplete: false,
    caseCount: rows.length,
    caseStatusManifest: caseStatuses,
    checkedAtHkt: input.checkedAtHkt,
    criteriaStatusManifest: criteriaStatuses,
    criterionCount: input.sourceConfirmationLedger.criterionCount,
    decisionCount: input.sourceConfirmationLedger.confirmationCount,
    ownerAgentIds: ["A06", "A18"],
    pendingA18DecisionCount: input.sourceConfirmationLedger.pendingA18DecisionCount,
    readyCaseCount,
    readyProofPointCount,
    requiredA18DecisionCriteria: input.sourceConfirmationLedger.requiredCriteria,
    rows,
    sourceContract: MATH_SCENE_TEACHING_A06_FINAL_REVIEW_HANDOFF_PACKET_SOURCE_CONTRACT,
    status,
    summary: [
      "a06TeachingFinalReviewHandoffPacket",
      `status=${status}`,
      `cases=${readyCaseCount}/${rows.length}`,
      `decisions=${input.sourceConfirmationLedger.a06ConfirmedDecisionCount}/${input.sourceConfirmationLedger.confirmationCount}-a06-confirmed`,
      `pendingA18=${input.sourceConfirmationLedger.pendingA18DecisionCount}`,
      `proofPoints=${readyProofPointCount}/${totalProofPointCount}`,
      `a18Report=${input.a18CanonicalReportPath}`,
      `blockers=${blockers.join(",") || "none"}`
    ].join(":"),
    totalProofPointCount
  };
}

export function mathSceneTeachingA06FinalReviewHandoffPacketDataAttributes(
  packet: MathSceneTeachingA06FinalReviewHandoffPacket
) {
  const prefix = "data-viz-manim-teaching-a06-final-review-handoff";

  return {
    [`${prefix}-a18-report-path`]: packet.a18CanonicalReportPath,
    [`${prefix}-blocked-confirmation-count`]: String(packet.blockedConfirmationCount),
    [`${prefix}-blockers`]: packet.blockers.join(",") || "none",
    [`${prefix}-can-complete`]: String(packet.canMarkA18GateComplete),
    [`${prefix}-case-count`]: String(packet.caseCount),
    [`${prefix}-case-status-manifest`]: packet.caseStatusManifest,
    [`${prefix}-checked-at-hkt`]: packet.checkedAtHkt,
    [`${prefix}-criteria-status-manifest`]: packet.criteriaStatusManifest,
    [`${prefix}-criterion-count`]: String(packet.criterionCount),
    [`${prefix}-decision-count`]: String(packet.decisionCount),
    [`${prefix}-owner-agents`]: packet.ownerAgentIds.join(","),
    [`${prefix}-pending-a18-count`]: String(packet.pendingA18DecisionCount),
    [`${prefix}-ready-case-count`]: String(packet.readyCaseCount),
    [`${prefix}-ready-proof-point-count`]: String(packet.readyProofPointCount),
    [`${prefix}-required-a18-criteria`]: packet.requiredA18DecisionCriteria.join(","),
    [`${prefix}-source-contract`]: packet.sourceContract,
    [`${prefix}-status`]: packet.status,
    [`${prefix}-summary`]: packet.summary,
    [`${prefix}-total-proof-point-count`]: String(packet.totalProofPointCount)
  } as const;
}
