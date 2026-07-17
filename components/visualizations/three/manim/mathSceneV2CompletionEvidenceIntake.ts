import type {
  MathSceneV2CompletionAcceptanceAction,
  MathSceneV2CompletionAcceptanceChecklist
} from "./mathSceneV2CompletionAcceptanceChecklist";

export const MATH_SCENE_V2_COMPLETION_EVIDENCE_INTAKE_SOURCE_CONTRACT =
  "MAIS Manim v2 completion evidence intake: validates submitted A11/A22/A18 owner evidence against the acceptance checklist without bypassing goal gates" as const;

export type MathSceneV2CompletionEvidenceRecordStatus =
  | "accepted"
  | "rejected";

export type MathSceneV2CompletionEvidenceIntakeStatus =
  | "blocked-invalid-owner-evidence"
  | "owner-evidence-covered"
  | "pending-owner-evidence";

export type MathSceneV2CompletionEvidenceRecord = {
  actionId: MathSceneV2CompletionAcceptanceAction["actionId"];
  evidenceId: string;
  ownerAgentIds: readonly string[];
  status: MathSceneV2CompletionEvidenceRecordStatus;
};

export type MathSceneV2CompletionEvidenceIntakeActionStatus =
  | "accepted-owner-evidence"
  | "pending-owner-evidence";

export type MathSceneV2CompletionEvidenceIntakeAction = {
  acceptedEvidenceIds: string[];
  actionId: MathSceneV2CompletionAcceptanceAction["actionId"];
  missingEvidenceIds: string[];
  requiredEvidenceIds: string[];
  status: MathSceneV2CompletionEvidenceIntakeActionStatus;
};

export type MathSceneV2CompletionEvidenceOwnerGroup = {
  acceptedEvidenceCount: number;
  missingEvidenceCount: number;
  ownerAgentIds: readonly string[];
  pendingActionCount: number;
  requiredEvidenceCount: number;
};

export type MathSceneV2CompletionEvidenceIntake = {
  acceptedActionCount: number;
  acceptedEvidenceCount: number;
  actionCount: number;
  actions: MathSceneV2CompletionEvidenceIntakeAction[];
  canMarkThreadGoalComplete: boolean;
  duplicateEvidenceIds: string[];
  invalidEvidenceRecordCount: number;
  invalidEvidenceRecords: MathSceneV2CompletionEvidenceRecord[];
  missingEvidenceActionManifest: string;
  missingEvidenceCount: number;
  missingEvidenceOwnerGroups: MathSceneV2CompletionEvidenceOwnerGroup[];
  missingEvidenceOwnerGroupSummary: string;
  pendingActionCount: number;
  readyForGoalGateRerun: boolean;
  requiredEvidenceCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2CompletionAcceptanceChecklist["sourceArchitectureBlockerReasons"];
  sourceContract: typeof MATH_SCENE_V2_COMPLETION_EVIDENCE_INTAKE_SOURCE_CONTRACT;
  status: MathSceneV2CompletionEvidenceIntakeStatus;
  summary: string;
};

function sameOwners(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((ownerId, index) => ownerId === right[index]);
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function duplicateEvidenceIds(records: readonly MathSceneV2CompletionEvidenceRecord[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const record of records) {
    if (record.evidenceId.length === 0) continue;
    if (seen.has(record.evidenceId)) duplicates.add(record.evidenceId);
    seen.add(record.evidenceId);
  }

  return uniqueSorted([...duplicates]);
}

function recordsForAction(
  action: MathSceneV2CompletionAcceptanceAction,
  records: readonly MathSceneV2CompletionEvidenceRecord[]
) {
  return records.filter(
    (record) =>
      record.actionId === action.actionId &&
      action.verificationEvidenceIds.includes(record.evidenceId) &&
      record.status === "accepted" &&
      sameOwners(record.ownerAgentIds, action.ownerAgentIds)
  );
}

function invalidRecords(
  checklist: MathSceneV2CompletionAcceptanceChecklist,
  records: readonly MathSceneV2CompletionEvidenceRecord[],
  duplicateEvidenceRecordIds: readonly string[]
) {
  const actionsById = new Map(checklist.actions.map((action) => [action.actionId, action]));
  const duplicateEvidenceIdSet = new Set(duplicateEvidenceRecordIds);

  return records.filter((record) => {
    const action = actionsById.get(record.actionId);

    if (duplicateEvidenceIdSet.has(record.evidenceId)) return true;
    if (!action) return true;
    if (!action.verificationEvidenceIds.includes(record.evidenceId)) return true;
    if (!sameOwners(record.ownerAgentIds, action.ownerAgentIds)) return true;
    return record.status !== "accepted";
  });
}

function intakeAction(
  action: MathSceneV2CompletionAcceptanceAction,
  records: readonly MathSceneV2CompletionEvidenceRecord[]
): MathSceneV2CompletionEvidenceIntakeAction {
  const acceptedEvidenceIds = [
    ...new Set(recordsForAction(action, records).map((record) => record.evidenceId))
  ].sort();
  const requiredEvidenceIds = [...action.verificationEvidenceIds].sort();
  const missingEvidenceIds = requiredEvidenceIds.filter((evidenceId) => !acceptedEvidenceIds.includes(evidenceId));
  const status = missingEvidenceIds.length === 0 ? "accepted-owner-evidence" : "pending-owner-evidence";

  return {
    acceptedEvidenceIds,
    actionId: action.actionId,
    missingEvidenceIds,
    requiredEvidenceIds,
    status
  };
}

function ownerGroupKey(ownerAgentIds: readonly string[]) {
  return ownerAgentIds.join("+");
}

function missingEvidenceOwnerGroups(
  checklistActions: readonly MathSceneV2CompletionAcceptanceAction[],
  intakeActions: readonly MathSceneV2CompletionEvidenceIntakeAction[]
) {
  const intakeActionsById = new Map(intakeActions.map((action) => [action.actionId, action]));
  const ownerGroups = new Map<string, MathSceneV2CompletionEvidenceOwnerGroup>();

  for (const checklistAction of checklistActions) {
    const intake = intakeActionsById.get(checklistAction.actionId);
    if (!intake) continue;

    const key = ownerGroupKey(checklistAction.ownerAgentIds);
    const group = ownerGroups.get(key) ?? {
      acceptedEvidenceCount: 0,
      missingEvidenceCount: 0,
      ownerAgentIds: checklistAction.ownerAgentIds,
      pendingActionCount: 0,
      requiredEvidenceCount: 0
    };

    group.acceptedEvidenceCount += intake.acceptedEvidenceIds.length;
    group.missingEvidenceCount += intake.missingEvidenceIds.length;
    group.pendingActionCount += intake.status === "pending-owner-evidence" ? 1 : 0;
    group.requiredEvidenceCount += intake.requiredEvidenceIds.length;
    ownerGroups.set(key, group);
  }

  return [...ownerGroups.values()].filter((group) => group.missingEvidenceCount > 0);
}

function missingEvidenceOwnerGroupSummary(groups: readonly MathSceneV2CompletionEvidenceOwnerGroup[]) {
  return groups.map((group) => `${ownerGroupKey(group.ownerAgentIds)}=${group.missingEvidenceCount}`).join(";") || "none";
}

function missingEvidenceActionManifest(actions: readonly MathSceneV2CompletionEvidenceIntakeAction[]) {
  return actions
    .map((action) => `${action.actionId}=missing:${action.missingEvidenceIds.join("+") || "none"}`)
    .join("|") || "none";
}

export function buildMathSceneV2CompletionEvidenceIntake(
  checklist: MathSceneV2CompletionAcceptanceChecklist,
  records: readonly MathSceneV2CompletionEvidenceRecord[]
): MathSceneV2CompletionEvidenceIntake {
  const actions = checklist.actions.map((action) => intakeAction(action, records));
  const acceptedActionCount = actions.filter((action) => action.status === "accepted-owner-evidence").length;
  const pendingActionCount = actions.length - acceptedActionCount;
  const acceptedEvidenceCount = actions.reduce((sum, action) => sum + action.acceptedEvidenceIds.length, 0);
  const requiredEvidenceCount = actions.reduce((sum, action) => sum + action.requiredEvidenceIds.length, 0);
  const missingEvidenceCount = actions.reduce((sum, action) => sum + action.missingEvidenceIds.length, 0);
  const missingActionManifest = missingEvidenceActionManifest(actions);
  const missingOwnerGroups = missingEvidenceOwnerGroups(checklist.actions, actions);
  const missingOwnerGroupSummary = missingEvidenceOwnerGroupSummary(missingOwnerGroups);
  const duplicateIds = duplicateEvidenceIds(records);
  const invalidEvidenceRecords = invalidRecords(checklist, records, duplicateIds);
  const readyForGoalGateRerun = pendingActionCount === 0 && invalidEvidenceRecords.length === 0;
  const canMarkThreadGoalComplete = checklist.canMarkThreadGoalComplete && readyForGoalGateRerun;
  const status = invalidEvidenceRecords.length > 0
    ? "blocked-invalid-owner-evidence"
    : readyForGoalGateRerun
      ? "owner-evidence-covered"
      : "pending-owner-evidence";

  return {
    acceptedActionCount,
    acceptedEvidenceCount,
    actionCount: actions.length,
    actions,
    canMarkThreadGoalComplete,
    duplicateEvidenceIds: duplicateIds,
    invalidEvidenceRecordCount: invalidEvidenceRecords.length,
    invalidEvidenceRecords,
    missingEvidenceActionManifest: missingActionManifest,
    missingEvidenceCount,
    missingEvidenceOwnerGroups: missingOwnerGroups,
    missingEvidenceOwnerGroupSummary: missingOwnerGroupSummary,
    pendingActionCount,
    readyForGoalGateRerun,
    requiredEvidenceCount,
    reviewSliceConsumerGateEvidenceIdManifest: checklist.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: checklist.reviewSliceCount,
    reviewSliceFileManifest: checklist.reviewSliceFileManifest,
    reviewSliceIds: checklist.reviewSliceIds,
    reviewSliceSummary: checklist.reviewSliceSummary,
    sourceArchitectureBlockerReasonManifest: checklist.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...checklist.sourceArchitectureBlockerReasons],
    sourceContract: MATH_SCENE_V2_COMPLETION_EVIDENCE_INTAKE_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2CompletionEvidenceIntake",
      `status=${status}`,
      `actions=${actions.length}`,
      `acceptedActions=${acceptedActionCount}`,
      `pendingActions=${pendingActionCount}`,
      `evidence=${acceptedEvidenceCount}/${requiredEvidenceCount}`,
      `missingOwnerEvidence=${missingOwnerGroupSummary}`,
      `reviewSlices=${checklist.reviewSliceSummary}`,
      `sourceBlockers=${checklist.sourceArchitectureBlockerReasonManifest}`,
      `duplicateEvidence=${duplicateIds.join(",") || "none"}`,
      `invalid=${invalidEvidenceRecords.length}`,
      `readyForRerun=${readyForGoalGateRerun ? "true" : "false"}`
    ].join(":")
  };
}

export function mathSceneV2CompletionEvidenceIntakeDataAttributes(intake: MathSceneV2CompletionEvidenceIntake) {
  return {
    "data-viz-manim-v2-completion-evidence-intake-accepted-action-count": String(intake.acceptedActionCount),
    "data-viz-manim-v2-completion-evidence-intake-action-count": String(intake.actionCount),
    "data-viz-manim-v2-completion-evidence-intake-can-complete": intake.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-completion-evidence-intake-duplicate-evidence-ids": intake.duplicateEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-completion-evidence-intake-invalid-record-count": String(intake.invalidEvidenceRecordCount),
    "data-viz-manim-v2-completion-evidence-intake-missing-evidence-action-manifest": intake.missingEvidenceActionManifest,
    "data-viz-manim-v2-completion-evidence-intake-missing-evidence-count": String(intake.missingEvidenceCount),
    "data-viz-manim-v2-completion-evidence-intake-missing-evidence-owner-groups": intake.missingEvidenceOwnerGroupSummary,
    "data-viz-manim-v2-completion-evidence-intake-ready-for-rerun": intake.readyForGoalGateRerun ? "true" : "false",
    "data-viz-manim-v2-completion-evidence-intake-review-slice-consumer-gate-evidence-id-manifest":
      intake.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-completion-evidence-intake-review-slice-count": String(intake.reviewSliceCount),
    "data-viz-manim-v2-completion-evidence-intake-review-slice-file-manifest": intake.reviewSliceFileManifest,
    "data-viz-manim-v2-completion-evidence-intake-review-slice-ids": intake.reviewSliceIds,
    "data-viz-manim-v2-completion-evidence-intake-review-slices": intake.reviewSliceSummary,
    "data-viz-manim-v2-completion-evidence-intake-source-architecture-blocker-reasons":
      intake.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-completion-evidence-intake-source-contract": intake.sourceContract,
    "data-viz-manim-v2-completion-evidence-intake-status": intake.status,
    "data-viz-manim-v2-completion-evidence-intake-summary": intake.summary
  } as const;
}
