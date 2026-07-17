import type { MathSceneV2CompletionAcceptanceChecklist } from "./mathSceneV2CompletionAcceptanceChecklist";
import {
  buildMathSceneV2CompletionEvidenceIntake,
  type MathSceneV2CompletionEvidenceIntake,
  type MathSceneV2CompletionEvidenceRecord
} from "./mathSceneV2CompletionEvidenceIntake";
import type {
  MathSceneV2CompletionRerunPlan,
  MathSceneV2CompletionRerunStep
} from "./mathSceneV2CompletionRerunPlan";
import type {
  MathSceneV2OwnerEvidenceRequestPacket,
  MathSceneV2OwnerEvidenceSubmissionRecordTemplate
} from "./mathSceneV2OwnerEvidenceRequestPacket";
import {
  buildMathSceneV2OwnerGateRerunIntake,
  type MathSceneV2OwnerGateRerunIntake,
  type MathSceneV2OwnerGateRerunRecord
} from "./mathSceneV2OwnerGateRerunIntake";

export const MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_INTAKE_SOURCE_CONTRACT =
  "MAIS Manim v2 owner evidence submission intake: validates submitted A11/A18/A22 owner evidence rows against request packet templates without accepting gates" as const;

export const MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_COMPLETION_BRIDGE_SOURCE_CONTRACT =
  "MAIS Manim v2 owner evidence submission completion bridge: feeds validated owner submissions into completion evidence intake without marking the thread goal complete" as const;

export const MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_OWNER_GATE_RERUN_RECORD_TEMPLATE_PLAN_ALIGNMENT_SOURCE_CONTRACT =
  "MAIS Manim v2 owner evidence submission owner-gate rerun record-template plan alignment: validates generated owner-gate templates against the canonical rerun plan without accepting rerun evidence" as const;

export const MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_OWNER_GATE_RERUN_RECORD_SUBMISSION_BRIDGE_SOURCE_CONTRACT =
  "MAIS Manim v2 owner evidence submission owner-gate rerun record submission bridge: gates real A11/A18/A22 owner-gate rerun submissions behind template-plan alignment without treating templates as accepted evidence" as const;

export type MathSceneV2OwnerEvidenceSubmissionIntakeStatus =
  | "blocked-invalid-owner-submissions"
  | "owner-submissions-covered"
  | "pending-owner-submissions";

export type MathSceneV2OwnerEvidenceSubmittedRecord =
  MathSceneV2CompletionEvidenceRecord & {
    submitterAgentId: string;
  };

export type MathSceneV2OwnerEvidenceSubmissionIntake = {
  acceptedSubmittedRecordCount: number;
  acceptedSubmittedRecordManifest: string;
  completionEvidenceRecords: MathSceneV2CompletionEvidenceRecord[];
  duplicateSubmittedEvidenceIds: string[];
  invalidSubmittedRecordCount: number;
  invalidSubmittedRecordManifest: string;
  invalidSubmittedRecords: MathSceneV2OwnerEvidenceSubmittedRecord[];
  missingTemplateCount: number;
  missingTemplateEvidenceIds: string[];
  missingTemplateManifest: string;
  readyForCompletionEvidenceIntake: boolean;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2OwnerEvidenceRequestPacket["sourceArchitectureBlockerReasons"];
  sourceContract: typeof MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_INTAKE_SOURCE_CONTRACT;
  status: MathSceneV2OwnerEvidenceSubmissionIntakeStatus;
  submittedRecordCount: number;
  summary: string;
  templateCount: number;
};

export type MathSceneV2OwnerEvidenceSubmissionCompletionBridgeStatus =
  | "blocked-invalid-owner-submissions"
  | "owner-evidence-covered"
  | "pending-owner-submissions";

export type MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRequestStatus =
  | "blocked-invalid-owner-submissions"
  | "pending-owner-submissions"
  | "ready-for-owner-gate-rerun";

export type MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRequestRow = {
  acceptedEvidenceCount: number;
  actionIds: string[];
  missingTemplateEvidenceIds: string[];
  ownerAgentId: string;
  requiredEvidenceCount: number;
  rerunTargetIds: MathSceneV2OwnerEvidenceSubmissionRecordTemplate["workstreamId"][];
  status: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRequestStatus;
  summary: string;
  supportingAgentIds: string[];
};

export type MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplate = {
  evidenceId: string;
  ownerAgentId: string;
  rerunTarget: MathSceneV2OwnerEvidenceSubmissionRecordTemplate["workstreamId"];
  status: "accepted";
  stepId: string;
};

export type MathSceneV2OwnerEvidenceSubmissionCompletionBridgeInput = {
  acceptanceChecklist: MathSceneV2CompletionAcceptanceChecklist;
  ownerEvidenceRequestPacket: MathSceneV2OwnerEvidenceRequestPacket;
  submittedRecords: readonly MathSceneV2OwnerEvidenceSubmittedRecord[];
};

export type MathSceneV2OwnerEvidenceSubmissionCompletionBridge = {
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  blockedOwnerGateRerunRequestCount: number;
  completionEvidenceIntake: MathSceneV2CompletionEvidenceIntake;
  invalidSubmittedRecordCount: number;
  missingTemplateCount: number;
  ownerGateRerunRecordTemplateCount: number;
  ownerGateRerunRecordTemplates: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplate[];
  ownerGateRerunRequestOwnerIds: string[];
  ownerGateRerunRequestRowCount: number;
  ownerGateRerunRequestRows: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRequestRow[];
  readyOwnerGateRerunRequestCount: number;
  readyForOwnerGateRerun: boolean;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2OwnerEvidenceSubmissionIntake["sourceArchitectureBlockerReasons"];
  sourceContract: typeof MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_COMPLETION_BRIDGE_SOURCE_CONTRACT;
  status: MathSceneV2OwnerEvidenceSubmissionCompletionBridgeStatus;
  submissionIntake: MathSceneV2OwnerEvidenceSubmissionIntake;
  submittedRecordCount: number;
  summary: string;
};

export type MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignmentStatus =
  | "aligned-owner-gate-rerun-record-templates"
  | "blocked-owner-gate-rerun-record-template-plan-mismatch"
  | "pending-owner-gate-rerun-record-templates";

export type MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment = {
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  alignedRecordTemplateCount: number;
  alignedRecordTemplateStepIds: string[];
  canSubmitOwnerGateRerunRecords: boolean;
  mismatchedRecordTemplateCount: number;
  mismatchedRecordTemplateRows: string[];
  ownerAgentIds: string[];
  ownerGateRerunStepCount: number;
  recordTemplateCount: number;
  recordTemplates: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplate[];
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2OwnerEvidenceSubmissionCompletionBridge["sourceArchitectureBlockerReasons"];
  sourceContract: typeof MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_OWNER_GATE_RERUN_RECORD_TEMPLATE_PLAN_ALIGNMENT_SOURCE_CONTRACT;
  status: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignmentStatus;
  summary: string;
};

export type MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeStatus =
  | "blocked-owner-gate-rerun-record-template-plan-alignment"
  | "blocked-owner-gate-rerun-submissions"
  | "owner-gate-rerun-submissions-covered"
  | "pending-owner-gate-rerun-record-templates"
  | "pending-owner-gate-rerun-submissions";

export type MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge = {
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  acceptedSubmittedRecordManifest: string;
  canRequestFinalObjectiveAudit: boolean;
  consumedOwnerGateRerunRecordCount: number;
  invalidSubmittedRecordManifest: string;
  missingTemplateManifest: string;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerGateRerunIntake: MathSceneV2OwnerGateRerunIntake;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment["sourceArchitectureBlockerReasons"];
  sourceContract: typeof MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_OWNER_GATE_RERUN_RECORD_SUBMISSION_BRIDGE_SOURCE_CONTRACT;
  status: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeStatus;
  submittedOwnerGateRerunRecordCount: number;
  summary: string;
  templateAlignment: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment;
};

function uniqueSorted<TValue extends string>(values: readonly TValue[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sameOwners(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((ownerId, index) => ownerId === right[index]);
}

function templateKey(record: Pick<MathSceneV2CompletionEvidenceRecord, "actionId" | "evidenceId">) {
  return `${record.actionId}:${record.evidenceId}`;
}

function padStep(index: number) {
  return String(index).padStart(2, "0");
}

function ownerGateRerunRequestManifest(
  rows: readonly MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRequestRow[]
) {
  return rows.map((row) => [
    `${row.ownerAgentId}:${row.status}`,
    `target=${row.rerunTargetIds.join("+") || "none"}|evidence=${row.acceptedEvidenceCount}/${row.requiredEvidenceCount}`
  ].join(":")).join(";") || "none";
}

function ownerGateRerunRecordTemplateManifest(
  templates: readonly MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplate[]
) {
  return templates.map((template) => [
    template.ownerAgentId,
    template.stepId,
    template.evidenceId,
    template.rerunTarget,
    template.status
  ].join(":")).join(";") || "none";
}

function ownerGateRerunRecordTemplatePlanAlignmentManifest(
  templates: readonly MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplate[],
  mismatchedRows: readonly string[]
) {
  const mismatchedStepIds = new Set(
    mismatchedRows.map((row) => row.split(":").slice(0, 2).join(":"))
  );

  return templates.map((template) => [
    template.ownerAgentId,
    template.stepId,
    template.evidenceId,
    mismatchedStepIds.has(`${template.ownerAgentId}:${template.stepId}`) ? "mismatch" : "aligned"
  ].join(":")).join(";") || "none";
}

function ownerGateStepsFromPlan(rerunPlan: MathSceneV2CompletionRerunPlan) {
  return rerunPlan.steps.filter((step) => step.kind === "owner-gate-rerun");
}

function planStepOwnerAgentId(step: MathSceneV2CompletionRerunStep) {
  return step.ownerAgentIds[0] ?? "unknown";
}

function planTemplateKey(step: MathSceneV2CompletionRerunStep) {
  return `${planStepOwnerAgentId(step)}:${step.stepId}`;
}

function recordTemplateKey(template: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplate) {
  return `${template.ownerAgentId}:${template.stepId}`;
}

function expectedRecordTemplateForStep(step: MathSceneV2CompletionRerunStep) {
  const ownerAgentId = planStepOwnerAgentId(step);
  if (step.rerunTarget === "mathSceneV2ObjectiveCompletionAudit") return undefined;

  return {
    evidenceId: `accepted-${ownerAgentId}-gate-rerun`,
    ownerAgentId,
    rerunTarget: step.rerunTarget,
    status: "accepted" as const,
    stepId: step.stepId
  };
}

function templatePlanMismatchRows(
  steps: readonly MathSceneV2CompletionRerunStep[],
  templates: readonly MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplate[]
) {
  const expectedByKey = new Map(
    steps.flatMap((step) => {
      const expectedTemplate = expectedRecordTemplateForStep(step);
      return expectedTemplate ? [[planTemplateKey(step), expectedTemplate] as const] : [];
    })
  );
  const templateKeys = new Set(templates.map(recordTemplateKey));
  const mismatches: string[] = [];

  for (const template of templates) {
    const expectedTemplate = expectedByKey.get(recordTemplateKey(template));
    const rowPrefix = `${template.ownerAgentId}:${template.stepId}`;

    if (!expectedTemplate) {
      mismatches.push(`${rowPrefix}:planStep=missing`);
      continue;
    }

    if (template.evidenceId !== expectedTemplate.evidenceId) {
      mismatches.push(`${rowPrefix}:evidenceId=${template.evidenceId}->${expectedTemplate.evidenceId}`);
    }
    if (template.rerunTarget !== expectedTemplate.rerunTarget) {
      mismatches.push(`${rowPrefix}:rerunTarget=${template.rerunTarget}->${expectedTemplate.rerunTarget}`);
    }
    if (template.status !== expectedTemplate.status) {
      mismatches.push(`${rowPrefix}:status=${template.status}->${expectedTemplate.status}`);
    }
  }

  for (const [expectedKey] of expectedByKey) {
    if (!templateKeys.has(expectedKey)) mismatches.push(`${expectedKey}:recordTemplate=missing`);
  }

  return uniqueSorted(mismatches);
}

function duplicateSubmittedEvidenceIds(records: readonly MathSceneV2OwnerEvidenceSubmittedRecord[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const record of records) {
    if (record.evidenceId.length === 0) continue;
    if (seen.has(record.evidenceId)) duplicates.add(record.evidenceId);
    seen.add(record.evidenceId);
  }

  return uniqueSorted([...duplicates]);
}

function matchesTemplate(
  record: MathSceneV2OwnerEvidenceSubmittedRecord,
  template: MathSceneV2OwnerEvidenceSubmissionRecordTemplate | undefined
) {
  return Boolean(
    template &&
      record.submitterAgentId === template.submitterAgentId &&
      record.status === template.status &&
      sameOwners(record.ownerAgentIds, template.ownerAgentIds)
  );
}

function submittedRecordManifest(records: readonly MathSceneV2OwnerEvidenceSubmittedRecord[]) {
  return records.map((record) => [
    record.submitterAgentId,
    record.actionId,
    record.evidenceId,
    `owners=${record.ownerAgentIds.join("+") || "none"}|status=${record.status}`
  ].join(":")).join(";") || "none";
}

function templateSubmissionManifest(
  templates: readonly MathSceneV2OwnerEvidenceSubmissionRecordTemplate[]
) {
  return templates.map((template) => [
    template.submitterAgentId,
    template.actionId,
    template.evidenceId,
    `workstream=${template.workstreamId}|owners=${template.ownerAgentIds.join("+") || "none"}|status=${template.status}`
  ].join(":")).join(";") || "none";
}

export function buildMathSceneV2OwnerEvidenceSubmissionIntake(
  packet: MathSceneV2OwnerEvidenceRequestPacket,
  submittedRecords: readonly MathSceneV2OwnerEvidenceSubmittedRecord[]
): MathSceneV2OwnerEvidenceSubmissionIntake {
  const templatesByKey = new Map(
    packet.submissionRecordTemplates.map((template) => [templateKey(template), template])
  );
  const duplicateIds = duplicateSubmittedEvidenceIds(submittedRecords);
  const duplicateIdSet = new Set(duplicateIds);
  const validSubmittedRecords = submittedRecords.filter((record) => {
    if (duplicateIdSet.has(record.evidenceId)) return false;
    return matchesTemplate(record, templatesByKey.get(templateKey(record)));
  });
  const validTemplateKeys = new Set(validSubmittedRecords.map((record) => templateKey(record)));
  const missingTemplates = packet.submissionRecordTemplates.filter(
    (template) => !validTemplateKeys.has(templateKey(template))
  );
  const invalidSubmittedRecords = submittedRecords.filter((record) => {
    if (duplicateIdSet.has(record.evidenceId)) return true;
    return !matchesTemplate(record, templatesByKey.get(templateKey(record)));
  });
  const completionEvidenceRecords = validSubmittedRecords.map((record) => ({
    actionId: record.actionId,
    evidenceId: record.evidenceId,
    ownerAgentIds: record.ownerAgentIds,
    status: record.status
  }));
  const status =
    invalidSubmittedRecords.length > 0
      ? "blocked-invalid-owner-submissions"
      : missingTemplates.length === 0
      ? "owner-submissions-covered"
      : "pending-owner-submissions";
  const readyForCompletionEvidenceIntake =
    packet.submissionRecordTemplateCount > 0 && status === "owner-submissions-covered";
  const missingTemplateEvidenceIds = missingTemplates.map((template) => template.evidenceId);
  const acceptedSubmittedRecordManifest = submittedRecordManifest(validSubmittedRecords);
  const invalidSubmittedRecordManifest = submittedRecordManifest(invalidSubmittedRecords);
  const missingTemplateManifest = templateSubmissionManifest(missingTemplates);

  return {
    acceptedSubmittedRecordCount: validSubmittedRecords.length,
    acceptedSubmittedRecordManifest,
    completionEvidenceRecords,
    duplicateSubmittedEvidenceIds: duplicateIds,
    invalidSubmittedRecordCount: invalidSubmittedRecords.length,
    invalidSubmittedRecordManifest,
    invalidSubmittedRecords,
    missingTemplateCount: missingTemplates.length,
    missingTemplateEvidenceIds,
    missingTemplateManifest,
    readyForCompletionEvidenceIntake,
    reviewSliceConsumerGateEvidenceIdManifest: packet.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: packet.reviewSliceCount,
    reviewSliceFileManifest: packet.reviewSliceFileManifest,
    reviewSliceIds: packet.reviewSliceIds,
    reviewSliceSummary: packet.reviewSliceSummary,
    sourceArchitectureBlockerReasonManifest: packet.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...packet.sourceArchitectureBlockerReasons],
    sourceContract: MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_INTAKE_SOURCE_CONTRACT,
    status,
    submittedRecordCount: submittedRecords.length,
    summary: [
      "mathSceneV2OwnerEvidenceSubmissionIntake",
      `status=${status}`,
      `submitted=${validSubmittedRecords.length}/${packet.submissionRecordTemplateCount}`,
      `missing=${missingTemplates.length}`,
      `invalid=${invalidSubmittedRecords.length}`,
      `duplicateEvidence=${duplicateIds.join(",") || "none"}`,
      `reviewSlices=${packet.reviewSliceSummary}`,
      `sourceBlockers=${packet.sourceArchitectureBlockerReasonManifest}`,
      `ready=${readyForCompletionEvidenceIntake ? "true" : "false"}`
    ].join(":"),
    templateCount: packet.submissionRecordTemplateCount
  };
}

export function mathSceneV2OwnerEvidenceSubmissionIntakeDataAttributes(
  intake: MathSceneV2OwnerEvidenceSubmissionIntake
) {
  return {
    "data-viz-manim-v2-owner-evidence-submission-intake-accepted-count": String(intake.acceptedSubmittedRecordCount),
    "data-viz-manim-v2-owner-evidence-submission-intake-accepted-submitted-record-manifest": intake.acceptedSubmittedRecordManifest,
    "data-viz-manim-v2-owner-evidence-submission-intake-duplicate-evidence-ids": intake.duplicateSubmittedEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-submission-intake-invalid-count": String(intake.invalidSubmittedRecordCount),
    "data-viz-manim-v2-owner-evidence-submission-intake-invalid-submitted-record-manifest": intake.invalidSubmittedRecordManifest,
    "data-viz-manim-v2-owner-evidence-submission-intake-missing-count": String(intake.missingTemplateCount),
    "data-viz-manim-v2-owner-evidence-submission-intake-missing-template-evidence-ids": intake.missingTemplateEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-submission-intake-missing-template-manifest": intake.missingTemplateManifest,
    "data-viz-manim-v2-owner-evidence-submission-intake-ready": intake.readyForCompletionEvidenceIntake ? "true" : "false",
    "data-viz-manim-v2-owner-evidence-submission-intake-review-slice-consumer-gate-evidence-id-manifest":
      intake.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-owner-evidence-submission-intake-review-slice-count": String(intake.reviewSliceCount),
    "data-viz-manim-v2-owner-evidence-submission-intake-review-slice-file-manifest":
      intake.reviewSliceFileManifest,
    "data-viz-manim-v2-owner-evidence-submission-intake-review-slice-ids": intake.reviewSliceIds,
    "data-viz-manim-v2-owner-evidence-submission-intake-review-slices": intake.reviewSliceSummary,
    "data-viz-manim-v2-owner-evidence-submission-intake-source-architecture-blocker-reasons":
      intake.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-owner-evidence-submission-intake-source-contract": intake.sourceContract,
    "data-viz-manim-v2-owner-evidence-submission-intake-status": intake.status,
    "data-viz-manim-v2-owner-evidence-submission-intake-submitted-count": String(intake.submittedRecordCount),
    "data-viz-manim-v2-owner-evidence-submission-intake-summary": intake.summary,
    "data-viz-manim-v2-owner-evidence-submission-intake-template-count": String(intake.templateCount)
  } as const;
}

function ownerGateRerunRequestRows(
  packet: MathSceneV2OwnerEvidenceRequestPacket,
  intake: MathSceneV2OwnerEvidenceSubmissionIntake
): MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRequestRow[] {
  const acceptedTemplateKeys = new Set(
    intake.completionEvidenceRecords.map((record) => templateKey(record))
  );
  const isBlockedByInvalidSubmission = intake.status === "blocked-invalid-owner-submissions";

  return packet.ownerPackets.map((ownerPacket) => {
    const missingTemplates = ownerPacket.submissionRecordTemplates.filter(
      (template) => !acceptedTemplateKeys.has(templateKey(template))
    );
    const status = isBlockedByInvalidSubmission
      ? "blocked-invalid-owner-submissions"
      : missingTemplates.length === 0
      ? "ready-for-owner-gate-rerun"
      : "pending-owner-submissions";
    const rerunTargetIds = uniqueSorted(
      ownerPacket.submissionRecordTemplates.map((template) => template.workstreamId)
    );
    const actionIds = uniqueSorted(
      ownerPacket.submissionRecordTemplates.map((template) => template.actionId)
    );
    const acceptedEvidenceCount = ownerPacket.submissionRecordTemplateCount - missingTemplates.length;
    const missingTemplateEvidenceIds = missingTemplates.map((template) => template.evidenceId);

    return {
      acceptedEvidenceCount,
      actionIds,
      missingTemplateEvidenceIds,
      ownerAgentId: ownerPacket.ownerAgentId,
      requiredEvidenceCount: ownerPacket.submissionRecordTemplateCount,
      rerunTargetIds,
      status,
      summary: [
        ownerPacket.ownerAgentId,
        `status=${status}`,
        `target=${rerunTargetIds.join(",") || "none"}`,
        `evidence=${acceptedEvidenceCount}/${ownerPacket.submissionRecordTemplateCount}`,
        `missing=${missingTemplateEvidenceIds.join(",") || "none"}`
      ].join(":"),
      supportingAgentIds: ownerPacket.supportingAgentIds
    };
  });
}

function ownerGateRerunRecordTemplates(
  rows: readonly MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRequestRow[],
  readyForOwnerGateRerun: boolean
): MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplate[] {
  if (!readyForOwnerGateRerun) return [];

  return rows
    .filter((row) => row.status === "ready-for-owner-gate-rerun")
    .flatMap((row, index) => {
      const rerunTarget = row.rerunTargetIds[0];
      if (!rerunTarget) return [];

      const stepId = `${padStep(index + 1)}-owner-gate-${row.ownerAgentId}`;

      return [{
        evidenceId: `accepted-${row.ownerAgentId}-gate-rerun`,
        ownerAgentId: row.ownerAgentId,
        rerunTarget,
        status: "accepted",
        stepId
      }];
    });
}

export function buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
  acceptanceChecklist,
  ownerEvidenceRequestPacket,
  submittedRecords
}: MathSceneV2OwnerEvidenceSubmissionCompletionBridgeInput): MathSceneV2OwnerEvidenceSubmissionCompletionBridge {
  const submissionIntake = buildMathSceneV2OwnerEvidenceSubmissionIntake(
    ownerEvidenceRequestPacket,
    submittedRecords
  );
  const completionEvidenceIntake = buildMathSceneV2CompletionEvidenceIntake(
    acceptanceChecklist,
    submissionIntake.completionEvidenceRecords
  );
  const readyForOwnerGateRerun =
    submissionIntake.readyForCompletionEvidenceIntake &&
    completionEvidenceIntake.readyForGoalGateRerun;
  const status =
    submissionIntake.status === "blocked-invalid-owner-submissions"
      ? "blocked-invalid-owner-submissions"
      : readyForOwnerGateRerun
      ? "owner-evidence-covered"
      : "pending-owner-submissions";
  const ownerGateRows = ownerGateRerunRequestRows(ownerEvidenceRequestPacket, submissionIntake);
  const readyOwnerGateRerunRequestCount = ownerGateRows.filter(
    (row) => row.status === "ready-for-owner-gate-rerun"
  ).length;
  const blockedOwnerGateRerunRequestCount = ownerGateRows.length - readyOwnerGateRerunRequestCount;
  const ownerGateRecordTemplates = ownerGateRerunRecordTemplates(ownerGateRows, readyForOwnerGateRerun);

  return {
    a11RequiredRootDataAttributeCount: ownerEvidenceRequestPacket.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      ownerEvidenceRequestPacket.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    blockedOwnerGateRerunRequestCount,
    completionEvidenceIntake,
    invalidSubmittedRecordCount: submissionIntake.invalidSubmittedRecordCount,
    missingTemplateCount: submissionIntake.missingTemplateCount,
    ownerGateRerunRecordTemplateCount: ownerGateRecordTemplates.length,
    ownerGateRerunRecordTemplates: ownerGateRecordTemplates,
    ownerGateRerunRequestOwnerIds: ownerGateRows.map((row) => row.ownerAgentId),
    ownerGateRerunRequestRowCount: ownerGateRows.length,
    ownerGateRerunRequestRows: ownerGateRows,
    readyOwnerGateRerunRequestCount,
    readyForOwnerGateRerun,
    reviewSliceConsumerGateEvidenceIdManifest: submissionIntake.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: submissionIntake.reviewSliceCount,
    reviewSliceFileManifest: submissionIntake.reviewSliceFileManifest,
    reviewSliceIds: submissionIntake.reviewSliceIds,
    reviewSliceSummary: submissionIntake.reviewSliceSummary,
    sourceArchitectureBlockerReasonManifest: submissionIntake.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...submissionIntake.sourceArchitectureBlockerReasons],
    sourceContract: MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_COMPLETION_BRIDGE_SOURCE_CONTRACT,
    status,
    submissionIntake,
    submittedRecordCount: submittedRecords.length,
    summary: [
      "mathSceneV2OwnerEvidenceSubmissionCompletionBridge",
      `status=${status}`,
      `submissionStatus=${submissionIntake.status}`,
      `completionStatus=${completionEvidenceIntake.status}`,
      `submitted=${submissionIntake.acceptedSubmittedRecordCount}/${submissionIntake.templateCount}`,
      `missingTemplates=${submissionIntake.missingTemplateCount}`,
      `invalidSubmissions=${submissionIntake.invalidSubmittedRecordCount}`,
      `ownerGateRerunRequests=${readyOwnerGateRerunRequestCount}/${ownerGateRows.length}`,
      `ownerGateRerunRecordTemplates=${ownerGateRecordTemplates.length}`,
      `readyForOwnerGateRerun=${readyForOwnerGateRerun ? "true" : "false"}`,
      `canComplete=${completionEvidenceIntake.canMarkThreadGoalComplete ? "true" : "false"}`,
      `reviewSlices=${submissionIntake.reviewSliceSummary}`,
      `sourceBlockers=${submissionIntake.sourceArchitectureBlockerReasonManifest}`,
      `a11RootAttributes=${ownerEvidenceRequestPacket.a11RequiredRootDataAttributeCount}`
    ].join(":")
  };
}

export function mathSceneV2OwnerEvidenceSubmissionCompletionBridgeDataAttributes(
  bridge: MathSceneV2OwnerEvidenceSubmissionCompletionBridge
) {
  return {
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-a11-required-root-attribute-count":
      String(bridge.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-a11-run-from-beat-checkpoint-invalidation-attributes":
      bridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-accepted-submitted-record-manifest": bridge.submissionIntake.acceptedSubmittedRecordManifest,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-can-complete": bridge.completionEvidenceIntake.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-completion-status": bridge.completionEvidenceIntake.status,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-invalid-submitted-record-manifest": bridge.submissionIntake.invalidSubmittedRecordManifest,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-invalid-count": String(bridge.invalidSubmittedRecordCount),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-missing-template-count": String(bridge.missingTemplateCount),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-missing-template-manifest": bridge.submissionIntake.missingTemplateManifest,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-record-template-count": String(bridge.ownerGateRerunRecordTemplateCount),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-record-template-manifest": ownerGateRerunRecordTemplateManifest(bridge.ownerGateRerunRecordTemplates),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-blocked-count": String(bridge.blockedOwnerGateRerunRequestCount),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-owner-ids": bridge.ownerGateRerunRequestOwnerIds.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-ready-count": String(bridge.readyOwnerGateRerunRequestCount),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-request-count": String(bridge.ownerGateRerunRequestRowCount),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-owner-gate-rerun-request-manifest": ownerGateRerunRequestManifest(bridge.ownerGateRerunRequestRows),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-ready-for-owner-gate-rerun": bridge.readyForOwnerGateRerun ? "true" : "false",
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-review-slice-consumer-gate-evidence-id-manifest":
      bridge.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-review-slice-count":
      String(bridge.reviewSliceCount),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-review-slice-file-manifest":
      bridge.reviewSliceFileManifest,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-review-slice-ids":
      bridge.reviewSliceIds,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-review-slices":
      bridge.reviewSliceSummary,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-source-architecture-blocker-reasons":
      bridge.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-source-contract": bridge.sourceContract,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-status": bridge.status,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-submission-status": bridge.submissionIntake.status,
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-submitted-count": String(bridge.submittedRecordCount),
    "data-viz-manim-v2-owner-evidence-submission-completion-bridge-summary": bridge.summary
  } as const;
}

export function buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment({
  bridge,
  rerunPlan
}: {
  bridge: MathSceneV2OwnerEvidenceSubmissionCompletionBridge;
  rerunPlan: MathSceneV2CompletionRerunPlan;
}): MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment {
  const ownerGateSteps = ownerGateStepsFromPlan(rerunPlan);
  const recordTemplates = bridge.ownerGateRerunRecordTemplates;
  const mismatchedRecordTemplateRows =
    bridge.readyForOwnerGateRerun && recordTemplates.length > 0
      ? templatePlanMismatchRows(ownerGateSteps, recordTemplates)
      : [];
  const mismatchedRecordTemplateStepIds = new Set(
    mismatchedRecordTemplateRows.map((row) => row.split(":").slice(0, 2).join(":"))
  );
  const alignedRecordTemplateStepIds = recordTemplates
    .filter((template) => !mismatchedRecordTemplateStepIds.has(recordTemplateKey(template)))
    .map((template) => template.stepId);
  const status: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignmentStatus =
    !bridge.readyForOwnerGateRerun || recordTemplates.length === 0
      ? "pending-owner-gate-rerun-record-templates"
      : mismatchedRecordTemplateRows.length > 0
      ? "blocked-owner-gate-rerun-record-template-plan-mismatch"
      : "aligned-owner-gate-rerun-record-templates";
  const canSubmitOwnerGateRerunRecords =
    status === "aligned-owner-gate-rerun-record-templates" &&
    recordTemplates.length === ownerGateSteps.length &&
    ownerGateSteps.length > 0;

  return {
    a11RequiredRootDataAttributeCount: bridge.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      bridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    alignedRecordTemplateCount: alignedRecordTemplateStepIds.length,
    alignedRecordTemplateStepIds,
    canSubmitOwnerGateRerunRecords,
    mismatchedRecordTemplateCount: mismatchedRecordTemplateRows.length,
    mismatchedRecordTemplateRows,
    ownerAgentIds: ownerGateSteps.map(planStepOwnerAgentId),
    ownerGateRerunStepCount: ownerGateSteps.length,
    recordTemplateCount: recordTemplates.length,
    recordTemplates,
    reviewSliceConsumerGateEvidenceIdManifest: bridge.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: bridge.reviewSliceCount,
    reviewSliceFileManifest: bridge.reviewSliceFileManifest,
    reviewSliceIds: bridge.reviewSliceIds,
    reviewSliceSummary: bridge.reviewSliceSummary,
    sourceArchitectureBlockerReasonManifest: bridge.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...bridge.sourceArchitectureBlockerReasons],
    sourceContract: MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_OWNER_GATE_RERUN_RECORD_TEMPLATE_PLAN_ALIGNMENT_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment",
      `status=${status}`,
      `templates=${recordTemplates.length}/${ownerGateSteps.length}`,
      `aligned=${alignedRecordTemplateStepIds.length}`,
      `mismatches=${mismatchedRecordTemplateRows.join(",") || "none"}`,
      `canSubmit=${canSubmitOwnerGateRerunRecords ? "true" : "false"}`,
      `a11RootAttributes=${bridge.a11RequiredRootDataAttributeCount}`,
      `reviewSlices=${bridge.reviewSliceSummary}`,
      `sourceBlockers=${bridge.sourceArchitectureBlockerReasonManifest}`
    ].join(":")
  };
}

export function mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignmentDataAttributes(
  alignment: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment
) {
  return {
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-a11-required-root-attribute-count":
      String(alignment.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-a11-run-from-beat-checkpoint-invalidation-attributes":
      alignment.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-aligned-count": String(alignment.alignedRecordTemplateCount),
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-aligned-step-ids": alignment.alignedRecordTemplateStepIds.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-can-submit": alignment.canSubmitOwnerGateRerunRecords ? "true" : "false",
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-manifest": ownerGateRerunRecordTemplatePlanAlignmentManifest(
      alignment.recordTemplates,
      alignment.mismatchedRecordTemplateRows
    ),
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-mismatch-count": String(alignment.mismatchedRecordTemplateCount),
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-mismatch-rows": alignment.mismatchedRecordTemplateRows.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-owner-gate-step-count": String(alignment.ownerGateRerunStepCount),
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-owners": alignment.ownerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-review-slice-consumer-gate-evidence-id-manifest":
      alignment.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-review-slice-count":
      String(alignment.reviewSliceCount),
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-review-slice-file-manifest":
      alignment.reviewSliceFileManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-review-slice-ids":
      alignment.reviewSliceIds,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-review-slices":
      alignment.reviewSliceSummary,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-source-architecture-blocker-reasons":
      alignment.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-source-contract": alignment.sourceContract,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-status": alignment.status,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-summary": alignment.summary,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-template-plan-alignment-template-count": String(alignment.recordTemplateCount)
  } as const;
}

function ownerGateRerunRecordSubmissionBridgeStatus(
  templateAlignment: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment,
  ownerGateRerunIntake: MathSceneV2OwnerGateRerunIntake
): MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeStatus {
  if (templateAlignment.status === "pending-owner-gate-rerun-record-templates") {
    return "pending-owner-gate-rerun-record-templates";
  }

  if (!templateAlignment.canSubmitOwnerGateRerunRecords) {
    return "blocked-owner-gate-rerun-record-template-plan-alignment";
  }

  if (ownerGateRerunIntake.status === "blocked-owner-gate-rerun") {
    return "blocked-owner-gate-rerun-submissions";
  }

  if (ownerGateRerunIntake.status === "owner-gate-reruns-covered") {
    return "owner-gate-rerun-submissions-covered";
  }

  return "pending-owner-gate-rerun-submissions";
}

export function buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge({
  rerunPlan,
  submissionBridge,
  submittedOwnerGateRerunRecords
}: {
  rerunPlan: MathSceneV2CompletionRerunPlan;
  submissionBridge: MathSceneV2OwnerEvidenceSubmissionCompletionBridge;
  submittedOwnerGateRerunRecords: readonly MathSceneV2OwnerGateRerunRecord[];
}): MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge {
  const templateAlignment =
    buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordTemplatePlanAlignment({
      bridge: submissionBridge,
      rerunPlan
    });
  const consumedOwnerGateRerunRecords = templateAlignment.canSubmitOwnerGateRerunRecords
    ? submittedOwnerGateRerunRecords
    : [];
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(
    rerunPlan,
    consumedOwnerGateRerunRecords
  );
  const status = ownerGateRerunRecordSubmissionBridgeStatus(
    templateAlignment,
    ownerGateRerunIntake
  );
  const canRequestFinalObjectiveAudit =
    status === "owner-gate-rerun-submissions-covered" &&
    ownerGateRerunIntake.readyForFinalAudit;

  return {
    a11RequiredRootDataAttributeCount: templateAlignment.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      templateAlignment.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    acceptedSubmittedRecordManifest: submissionBridge.submissionIntake.acceptedSubmittedRecordManifest,
    canRequestFinalObjectiveAudit,
    consumedOwnerGateRerunRecordCount: consumedOwnerGateRerunRecords.length,
    invalidSubmittedRecordManifest: submissionBridge.submissionIntake.invalidSubmittedRecordManifest,
    missingTemplateManifest: submissionBridge.submissionIntake.missingTemplateManifest,
    ownerActionEvidenceCountManifest: rerunPlan.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: rerunPlan.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: rerunPlan.ownerEvidenceRequirementManifest,
    ownerGateRerunIntake,
    reviewSliceConsumerGateEvidenceIdManifest: templateAlignment.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: templateAlignment.reviewSliceCount,
    reviewSliceFileManifest: templateAlignment.reviewSliceFileManifest,
    reviewSliceIds: templateAlignment.reviewSliceIds,
    reviewSliceSummary: templateAlignment.reviewSliceSummary,
    sourceArchitectureBlockerReasonManifest: templateAlignment.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...templateAlignment.sourceArchitectureBlockerReasons],
    sourceContract: MATH_SCENE_V2_OWNER_EVIDENCE_SUBMISSION_OWNER_GATE_RERUN_RECORD_SUBMISSION_BRIDGE_SOURCE_CONTRACT,
    status,
    submittedOwnerGateRerunRecordCount: submittedOwnerGateRerunRecords.length,
    summary: [
      "mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge",
      `status=${status}`,
      `templateAlignment=${templateAlignment.status}`,
      `a11RootAttributes=${templateAlignment.a11RequiredRootDataAttributeCount}`,
      `submitted=${submittedOwnerGateRerunRecords.length}`,
      `consumed=${consumedOwnerGateRerunRecords.length}`,
      `ownerActionEvidenceCounts=${rerunPlan.ownerActionEvidenceCountManifest}`,
      `ownerAcceptanceCriteria=${rerunPlan.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${rerunPlan.ownerEvidenceRequirementManifest}`,
      `ownerGateIntake=${ownerGateRerunIntake.status}`,
      `readyForFinalAudit=${ownerGateRerunIntake.readyForFinalAudit ? "true" : "false"}`,
      `canRequestFinalAudit=${canRequestFinalObjectiveAudit ? "true" : "false"}`,
      `reviewSlices=${templateAlignment.reviewSliceSummary}`,
      `sourceBlockers=${templateAlignment.sourceArchitectureBlockerReasonManifest}`
    ].join(":"),
    templateAlignment
  };
}

export function mathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeDataAttributes(
  bridge: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge
) {
  return {
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-a11-required-root-attribute-count":
      String(bridge.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-a11-run-from-beat-checkpoint-invalidation-attributes":
      bridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-accepted-submitted-record-manifest": bridge.acceptedSubmittedRecordManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-can-request-final-audit": bridge.canRequestFinalObjectiveAudit ? "true" : "false",
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-consumed-count": String(bridge.consumedOwnerGateRerunRecordCount),
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-invalid-submitted-record-manifest": bridge.invalidSubmittedRecordManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-missing-template-manifest": bridge.missingTemplateManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-owner-action-evidence-count-manifest":
      bridge.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-owner-acceptance-criteria-manifest":
      bridge.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-owner-evidence-requirement-manifest":
      bridge.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-owner-gate-intake-status": bridge.ownerGateRerunIntake.status,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-owner-gate-ready-for-final-audit": bridge.ownerGateRerunIntake.readyForFinalAudit ? "true" : "false",
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-review-slice-consumer-gate-evidence-id-manifest":
      bridge.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-review-slice-count":
      String(bridge.reviewSliceCount),
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-review-slice-file-manifest":
      bridge.reviewSliceFileManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-review-slice-ids":
      bridge.reviewSliceIds,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-review-slices":
      bridge.reviewSliceSummary,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-source-architecture-blocker-reasons":
      bridge.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-source-contract": bridge.sourceContract,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-status": bridge.status,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-submitted-count": String(bridge.submittedOwnerGateRerunRecordCount),
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-summary": bridge.summary,
    "data-viz-manim-v2-owner-evidence-submission-owner-gate-rerun-record-submission-bridge-template-alignment-status": bridge.templateAlignment.status
  } as const;
}
