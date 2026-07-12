import assert from "node:assert/strict";
import test from "node:test";
import type { MathSceneV2FinalClosureAuditRecord } from "./mathSceneV2FinalClosureAudit";
import {
  MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_REQUEST_PACKET_SOURCE_CONTRACT,
  type MathSceneV2FinalObjectiveAuditRequestPacket
} from "./mathSceneV2FinalObjectiveAuditRequestPacket";
import {
  buildMathSceneV2FinalObjectiveAuditRecordIntake,
  mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes,
  MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_RECORD_INTAKE_SOURCE_CONTRACT
} from "./mathSceneV2FinalObjectiveAuditRecordIntake";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";

const ownerGateRerunEvidenceIds = [
  "accepted-A11-command-evidence-covered",
  "accepted-A18-command-evidence-covered",
  "accepted-A22-command-evidence-covered"
] as const;
const requirementProofEvidenceIds = [
  "a06-review-package-split:current-source:current-evidence-proves-requirement",
  "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence",
  "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions",
  "a22-clean-release-gate:final-owner-proof:owner-gate-blocked"
] as const;
const ownerGateRerunAcceptedSubmittedRecordManifest =
  "A11:accepted-A11-gate-rerun:status=accepted;A18:accepted-A18-gate-rerun:status=accepted;A22:accepted-A22-gate-rerun:status=accepted";
const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  "data-viz-manim-v2-scene-run-from-beat-current-beat-id,data-viz-manim-v2-scene-run-from-beat-checkpoint-id,data-viz-manim-v2-scene-run-from-beat-invalidated-checkpoints,data-viz-manim-v2-scene-run-from-beat-invalidation-count,data-viz-manim-v2-scene-run-from-beat-status";
const a11RequiredRootDataAttributeCount = 5;
const ownerActionEvidenceCountManifest = "fixture-owner-action-evidence-counts";
const ownerAcceptanceCriteriaManifest = "fixture-owner-acceptance-criteria";
const ownerEvidenceRequirementManifest = "fixture-owner-evidence-requirements";
const reviewSliceConsumerGateEvidenceIdManifest =
  "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review";
const reviewSliceCount = 20;
const reviewSliceFileManifest = "manim-review-slice-01=mathSceneV2FinalObjectiveAuditRequestPacket.ts";
const reviewSliceIds = "manim-review-slice-01,manim-review-slice-02";
const reviewSliceSummary = "20@24";
const sourceArchitectureBlockerReasonManifest = "none";
const sourceArchitectureBlockerReasons: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureBlockerReasons"] = [];

function requestedPacket(): MathSceneV2FinalObjectiveAuditRequestPacket {
  return {
    a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    canMarkThreadGoalComplete: false,
    currentProvenRequirementCount: 1,
    finalAuditRecordTemplate: {
      ownerGateRerunEvidenceIds: [...ownerGateRerunEvidenceIds],
      provenRequirementCount: 4,
      requirementProofEvidenceIds: [...requirementProofEvidenceIds],
      requiredStatus: "accepted",
      requirementCount: 4,
      target: "mathSceneV2ObjectiveCompletionAudit"
    },
    ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest,
    ownerGateRerunAcceptedSubmittedRecordManifest,
    ownerGateRerunSource: "owner-gate-rerun-submission-bridge",
    ownerGateRerunSourceStatus: "owner-gate-rerun-submissions-covered",
    ownerGateRerunEvidenceIds: [...ownerGateRerunEvidenceIds],
    ownerGateRerunInvalidSubmittedRecordManifest: "none",
    ownerGateRerunMissingTemplateManifest: "none",
    pendingRequirementCount: 3,
    readyForFinalObjectiveAuditRecord: true,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    requiredFinalAuditFields: [
      "evidenceId",
      "target",
      "status",
      "provenRequirementCount",
      "requirementCount",
      "ownerGateRerunEvidenceIds",
      "requirementProofEvidenceIds"
    ],
    requiredProvenRequirementCount: 4,
    reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount,
    reviewSliceFileManifest,
    reviewSliceIds,
    reviewSliceSummary,
    requirementRows: [],
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...sourceArchitectureBlockerReasons],
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    sourceArchitectureOpenOwnerGateIds: [],
    sourceArchitectureRequiredOwnerGateIds: [],
    sourceArchitectureSourceContract: "not-attached",
    sourceArchitectureSummary: "not-attached",
    sourceContract: MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_REQUEST_PACKET_SOURCE_CONTRACT,
    status: "pending-final-objective-audit-record",
    summary: "mathSceneV2FinalObjectiveAuditRequestPacket:status=pending-final-objective-audit-record"
  };
}

function blockedRequestPacket(): MathSceneV2FinalObjectiveAuditRequestPacket {
  return {
    ...requestedPacket(),
    finalAuditRecordTemplate: {
      ...requestedPacket().finalAuditRecordTemplate,
      ownerGateRerunEvidenceIds: []
    },
    ownerGateRerunEvidenceIds: [],
    ownerGateRerunSourceStatus: "blocked-owner-gate-reruns",
    readyForFinalObjectiveAuditRecord: false,
    status: "blocked-owner-gate-reruns"
  };
}

function currentBlockerRequestPacket(): MathSceneV2FinalObjectiveAuditRequestPacket {
  return {
    ...requestedPacket(),
    currentBlockerManifest:
      "A11:missing-owner-report-artifact:submit-owner-report-artifact;A11:open-owner-action:a11-browser-visual-interaction-regression:update-projection-views-expected-list;A18:missing-owner-report-artifact:submit-owner-report-artifact;A22:missing-owner-report-artifact:submit-owner-report-artifact",
    currentBlockerMissingReportArtifactCount: 3,
    currentBlockerOpenA11ActionIds: ["a11-browser-visual-interaction-regression:update-projection-views-expected-list"],
    currentBlockerOpenOwnerActionCount: 1,
    currentBlockerReadyForFinalObjectiveAuditInput: false,
    currentBlockerRemainingOwnerAgentIds: ["A11", "A18", "A22"],
    currentBlockerSnapshotStatus: "blocked-missing-owner-report-artifacts",
    currentBlockerSummary:
      "mathSceneV2OwnerGateCurrentBlockerSnapshot:status=blocked-missing-owner-report-artifacts:missingReports=3:openOwnerActions=1",
    readyForFinalObjectiveAuditRecord: false,
    status: "blocked-current-owner-gate-blockers",
    summary:
      "mathSceneV2FinalObjectiveAuditRequestPacket:status=blocked-current-owner-gate-blockers:currentBlockers=blocked-missing-owner-report-artifacts"
  };
}

function acceptedRecord(): MathSceneV2FinalClosureAuditRecord {
  return {
    evidenceId: "accepted-final-objective-audit-4-of-4",
    ownerGateRerunEvidenceIds: [...ownerGateRerunEvidenceIds],
    provenRequirementCount: 4,
    requirementProofEvidenceIds: [...requirementProofEvidenceIds],
    requirementCount: 4,
    status: "accepted",
    target: "mathSceneV2ObjectiveCompletionAudit"
  };
}

test("MAIS Manim v2 final objective audit record intake accepts only matching 4-of-4 final audit records", () => {
  const acceptedRecordRows = [
    "accepted-final-objective-audit-4-of-4:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted:proven=4:required=4"
  ];
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(requestedPacket(), [acceptedRecord()]);
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.sourceContract, MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_RECORD_INTAKE_SOURCE_CONTRACT);
  assert.equal(intake.status, "final-objective-audit-record-accepted");
  assert.equal(intake.acceptedRecordCount, 1);
  assert.deepEqual(intake.acceptedFinalAuditRecordRows, acceptedRecordRows);
  assert.equal(intake.blockedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 0);
  assert.equal(intake.missingRecordCount, 0);
  assert.equal(intake.readyForFinalClosureAudit, true);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(intake.ownerGateRerunSource, "owner-gate-rerun-submission-bridge");
  assert.equal(intake.ownerGateRerunSourceStatus, "owner-gate-rerun-submissions-covered");
  assert.equal(
    (intake as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    ownerActionEvidenceCountManifest
  );
  assert.equal(
    (intake as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (intake as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    ownerEvidenceRequirementManifest
  );
  assert.equal(
    (intake as { reviewSliceCount?: number }).reviewSliceCount,
    reviewSliceCount
  );
  assert.equal(
    (intake as { reviewSliceIds?: string }).reviewSliceIds,
    reviewSliceIds
  );
  assert.equal(
    (intake as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    reviewSliceFileManifest
  );
  assert.equal(
    (intake as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    (intake as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (intake as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(intake.ownerGateRerunAcceptedSubmittedRecordManifest, ownerGateRerunAcceptedSubmittedRecordManifest);
  assert.equal(intake.ownerGateRerunMissingTemplateManifest, "none");
  assert.equal(intake.ownerGateRerunInvalidSubmittedRecordManifest, "none");
  assert.equal(intake.acceptedFinalAuditRecord?.evidenceId, "accepted-final-objective-audit-4-of-4");
  assert.deepEqual(intake.remainingOwnerAgentIds, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-accepted-record-rows"],
    acceptedRecordRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`acceptedRecordRows=${acceptedRecordRows[0]}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /ownerGateSource=owner-gate-rerun-submission-bridge/
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-gate-source"],
    "owner-gate-rerun-submission-bridge"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-gate-source-status"],
    "owner-gate-rerun-submissions-covered"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-action-evidence-count-manifest"],
    ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-acceptance-criteria-manifest"],
    ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-evidence-requirement-manifest"],
    ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-review-slice-count"],
    String(reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-review-slice-ids"],
    reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-review-slice-file-manifest"],
    reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-a11-required-root-attribute-count"],
    String(a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-a11-run-from-beat-checkpoint-invalidation-attributes"],
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-gate-accepted-submitted-record-manifest"],
    ownerGateRerunAcceptedSubmittedRecordManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-gate-missing-template-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-gate-invalid-submitted-record-manifest"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /ownerGateAcceptedSubmittedRows=A11:accepted-A11-gate-rerun:status=accepted/
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`ownerAcceptanceCriteria=${ownerAcceptanceCriteriaManifest}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`ownerEvidenceRequirements=${ownerEvidenceRequirementManifest}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /a11RootAttributes=5/
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /reviewSlices=20@24/
  );
});

test("MAIS Manim v2 final objective audit record intake carries source-architecture blocker reasons from request packet", () => {
  const blockerReasons = ["reviewSliceStatus", "missingReviewSliceFiles"] as const;
  const requestPacket = {
    ...requestedPacket(),
    sourceArchitectureBlockerReasonManifest: blockerReasons.join(","),
    sourceArchitectureBlockerReasons: [...blockerReasons]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(requestPacket, [acceptedRecord()]);
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.deepEqual(intake.sourceArchitectureBlockerReasons, [...blockerReasons]);
  assert.equal(intake.sourceArchitectureBlockerReasonManifest, "reviewSliceStatus,missingReviewSliceFiles");
  assert.match(intake.summary, /sourceBlockers=reviewSliceStatus,missingReviewSliceFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-blocker-reasons"],
    "reviewSliceStatus,missingReviewSliceFiles"
  );
});

test("MAIS Manim v2 final objective audit record intake carries source-architecture constraints from request packet", () => {
  const requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket = {
    ...requestedPacket(),
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
    sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
    sourceArchitectureOpenOwnerGateIds: [
      "a11-browser-visual-interaction-regression",
      "a18-a06-teaching-quality-confirmation",
      "a22-clean-release-gate"
    ],
    sourceArchitectureRequiredOwnerGateIds: [
      "a11-browser-visual-interaction-regression",
      "a18-a06-teaching-quality-confirmation",
      "a22-clean-release-gate"
    ],
    sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
    sourceArchitectureSummary:
      "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGenerationAllowed=false"
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(requestPacket, [acceptedRecord()]);
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.sourceArchitectureHandoffStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(intake.sourceArchitectureBulkCourseGenerationAllowed, false);
  assert.equal(
    intake.sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(intake.sourceArchitectureSourceContract, MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT);
  assert.deepEqual(intake.sourceArchitectureOpenOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-open-owner-gates"],
    "a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
  );
  assert.match(intake.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
});

test("MAIS Manim v2 final objective audit record intake blocks duplicate accepted final audit records", () => {
  const duplicateAcceptedRecordRows = [
    "accepted-final-objective-audit-4-of-4:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted",
    "accepted-final-objective-audit-4-of-4-rerun:submittedRecordIndex=1:target=mathSceneV2ObjectiveCompletionAudit:status=accepted"
  ];
  const duplicateAcceptedRecord: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    evidenceId: "accepted-final-objective-audit-4-of-4-rerun"
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [acceptedRecord(), duplicateAcceptedRecord]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 2);
  assert.equal(intake.requiredRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.duplicateAcceptedFinalAuditRecordIds, [
    "accepted-final-objective-audit-4-of-4",
    "accepted-final-objective-audit-4-of-4-rerun"
  ]);
  assert.deepEqual(intake.duplicateAcceptedFinalAuditRecordRows, duplicateAcceptedRecordRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-accepted-record-ids"],
    "accepted-final-objective-audit-4-of-4,accepted-final-objective-audit-4-of-4-rerun"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-accepted-record-rows"],
    duplicateAcceptedRecordRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /duplicateAcceptedRecordIds=accepted-final-objective-audit-4-of-4,accepted-final-objective-audit-4-of-4-rerun/
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`duplicateAcceptedRecordRows=${duplicateAcceptedRecordRows[0]}`)
  );
});

test("MAIS Manim v2 final objective audit record intake stays pending or not requested before valid final evidence", () => {
  const pending = buildMathSceneV2FinalObjectiveAuditRecordIntake(requestedPacket(), []);
  const notRequested = buildMathSceneV2FinalObjectiveAuditRecordIntake(blockedRequestPacket(), [acceptedRecord()]);

  assert.equal(pending.status, "pending-final-objective-audit-record");
  assert.equal(pending.missingRecordCount, 1);
  assert.equal(pending.readyForFinalClosureAudit, false);
  assert.deepEqual(pending.remainingOwnerAgentIds, ["A11", "A18", "A22"]);

  assert.equal(notRequested.status, "blocked-final-objective-audit-not-requested");
  assert.equal(notRequested.acceptedRecordCount, 0);
  assert.equal(notRequested.invalidRecordCount, 0);
  assert.equal(notRequested.readyForFinalClosureAudit, false);
});

test("MAIS Manim v2 final objective audit record intake carries current owner-gate blocker request context", () => {
  const requestPacket = currentBlockerRequestPacket();
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(requestPacket, [acceptedRecord()]);
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-final-objective-audit-not-requested");
  assert.equal(intake.currentBlockerSnapshotStatus, "blocked-missing-owner-report-artifacts");
  assert.equal(intake.currentBlockerReadyForFinalObjectiveAuditInput, false);
  assert.equal(intake.currentBlockerMissingReportArtifactCount, 3);
  assert.equal(intake.currentBlockerOpenOwnerActionCount, 1);
  assert.deepEqual(intake.currentBlockerRemainingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(intake.currentBlockerOpenA11ActionIds, [
    "a11-browser-visual-interaction-regression:update-projection-views-expected-list"
  ]);
  assert.equal(intake.currentBlockerManifest, requestPacket.currentBlockerManifest);
  assert.match(intake.summary, /currentBlockers=blocked-missing-owner-report-artifacts/);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-status"],
    "blocked-missing-owner-report-artifacts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-ready"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-open-a11-actions"],
    "a11-browser-visual-interaction-regression:update-projection-views-expected-list"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-remaining-owners"],
    "A11,A18,A22"
  );
});

test("MAIS Manim v2 final objective audit record intake blocks invalid or blocked final audit records", () => {
  const invalidRecordRows = [
    "accepted-final-objective-audit-4-of-4:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted:proven=4:required=4"
  ];
  const blockedRecordRows = [
    "blocked-final-objective-audit-a18-revision:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=blocked:proven=3:required=4"
  ];
  const invalidRecord = {
    ...acceptedRecord(),
    ownerGateRerunEvidenceIds: ["accepted-A11-command-evidence-covered"]
  };
  const blockedRecord: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    evidenceId: "blocked-final-objective-audit-a18-revision",
    provenRequirementCount: 3,
    status: "blocked"
  };
  const invalidIntake = buildMathSceneV2FinalObjectiveAuditRecordIntake(requestedPacket(), [invalidRecord]);
  const invalidAttributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(invalidIntake);
  const blockedIntake = buildMathSceneV2FinalObjectiveAuditRecordIntake(requestedPacket(), [blockedRecord]);
  const blockedAttributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(blockedIntake);

  assert.equal(invalidIntake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(invalidIntake.invalidRecordCount, 1);
  assert.deepEqual(invalidIntake.invalidFinalAuditRecordRows, invalidRecordRows);
  assert.equal(invalidIntake.readyForFinalClosureAudit, false);
  assert.equal(
    invalidAttributes["data-viz-manim-v2-final-objective-audit-record-intake-invalid-record-rows"],
    invalidRecordRows.join(",")
  );
  assert.match(
    invalidAttributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`invalidRecordRows=${invalidRecordRows[0]}`)
  );

  assert.equal(blockedIntake.status, "blocked-final-objective-audit-record");
  assert.equal(blockedIntake.blockedRecordCount, 1);
  assert.equal(blockedIntake.blockedRecords[0]?.evidenceId, "blocked-final-objective-audit-a18-revision");
  assert.deepEqual(blockedIntake.blockedFinalAuditRecordRows, blockedRecordRows);
  assert.equal(blockedIntake.readyForFinalClosureAudit, false);
  assert.equal(
    blockedAttributes["data-viz-manim-v2-final-objective-audit-record-intake-blocked-record-rows"],
    blockedRecordRows.join(",")
  );
  assert.match(
    blockedAttributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`blockedRecordRows=${blockedRecordRows[0]}`)
  );
});

test("MAIS Manim v2 final objective audit record intake rejects blocked records that claim all requirements proven", () => {
  const contradictoryBlockedRecord: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    evidenceId: "blocked-final-objective-audit-contradictory-4-of-4",
    status: "blocked"
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [contradictoryBlockedRecord]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);
  const mismatch = "blocked-final-objective-audit-contradictory-4-of-4:submitted=4:required=0..3";
  const mismatchRows = [
    "blocked-final-objective-audit-contradictory-4-of-4:submittedRecordIndex=0:submitted=4:required=0..3"
  ];

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.blockedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.mismatchedFinalAuditRecordProvenRequirementCounts, [mismatch]);
  assert.deepEqual(intake.mismatchedFinalAuditRecordProvenRequirementCountRows, mismatchRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-proven-requirement-counts"],
    mismatch
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-proven-requirement-count-rows"],
    mismatchRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /mismatchedProvenRequirementCounts=blocked-final-objective-audit-contradictory-4-of-4:submitted=4:required=0\.\.3/
  );
});

test("MAIS Manim v2 final objective audit record intake rejects blocked final audit evidence ids that mimic completed proof suffixes", () => {
  const misleadingBlockedRecord: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    evidenceId: "blocked-final-objective-audit-4-of-4",
    provenRequirementCount: 3,
    status: "blocked"
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [misleadingBlockedRecord]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);
  const invalidRecordRows = [
    "blocked-final-objective-audit-4-of-4:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=blocked:proven=3:required=4"
  ];

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.blockedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.invalidFinalAuditRecordRows, invalidRecordRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-invalid-record-rows"],
    invalidRecordRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /invalidRecordRows=blocked-final-objective-audit-4-of-4:submittedRecordIndex=0/
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces duplicate submitted final record evidence ids", () => {
  const duplicateRecordId = acceptedRecord().evidenceId;
  const duplicateRecordIdRows = [
    "accepted-final-objective-audit-4-of-4:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted",
    "accepted-final-objective-audit-4-of-4:submittedRecordIndex=1:target=mathSceneV2ObjectiveCompletionAudit:status=blocked"
  ];
  const blockedRecordWithDuplicateId: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    provenRequirementCount: 3,
    status: "blocked"
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [acceptedRecord(), blockedRecordWithDuplicateId]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 1);
  assert.equal(intake.blockedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.duplicateSubmittedFinalAuditRecordEvidenceIds, [duplicateRecordId]);
  assert.deepEqual(intake.duplicateSubmittedFinalAuditRecordEvidenceIdRows, duplicateRecordIdRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-submitted-record-ids"],
    duplicateRecordId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-submitted-record-id-rows"],
    duplicateRecordIdRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`duplicateSubmittedRecordIds=${duplicateRecordId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`duplicateSubmittedRecordIdRows=${duplicateRecordIdRows[0]}`)
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces missing submitted final record evidence ids", () => {
  const missingRecordEvidenceRows = [
    "submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted"
  ];
  const recordWithMissingEvidenceId = {
    ...acceptedRecord(),
    evidenceId: ""
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceId]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.missingSubmittedFinalAuditRecordEvidenceIdRows, missingRecordEvidenceRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-submitted-record-evidence-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-submitted-record-evidence-rows"],
    missingRecordEvidenceRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /missingSubmittedRecordEvidenceCount=1/
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /missingSubmittedRecordEvidenceRows=submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted/
  );
});

test("MAIS Manim v2 final objective audit record intake treats whitespace submitted final record evidence ids as missing", () => {
  const recordWithWhitespaceEvidenceId = {
    ...acceptedRecord(),
    evidenceId: "   "
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithWhitespaceEvidenceId]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-submitted-record-evidence-count"],
    "1"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /missingSubmittedRecordEvidenceCount=1/
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of count mismatch diagnostics", () => {
  const recordWithMissingEvidenceIdAndMismatchedCounts = {
    ...acceptedRecord(),
    evidenceId: "",
    provenRequirementCount: 3,
    requirementCount: 3
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndMismatchedCounts]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.mismatchedFinalAuditRecordRequirementCounts, []);
  assert.deepEqual(intake.mismatchedFinalAuditRecordRequirementCountRows, []);
  assert.deepEqual(intake.mismatchedFinalAuditRecordProvenRequirementCounts, []);
  assert.deepEqual(intake.mismatchedFinalAuditRecordProvenRequirementCountRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-requirement-counts"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-requirement-count-rows"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-proven-requirement-counts"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-proven-requirement-count-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "mismatchedProvenRequirementCountRows=none:mismatchedProvenRequirementCounts=none:mismatchedRequirementCountRows=none:mismatchedRequirementCounts=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of unknown proof diagnostics", () => {
  const unknownProofId = "unknown-owner-proof:final-evidence";
  const recordWithMissingEvidenceIdAndUnknownProof = {
    ...acceptedRecord(),
    evidenceId: "",
    requirementProofEvidenceIds: [
      ...requirementProofEvidenceIds,
      unknownProofId
    ]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndUnknownProof]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.unknownRequirementProofEvidenceIds, []);
  assert.deepEqual(intake.unknownRequirementProofEvidenceIdRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-proof-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-proof-id-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "unknownProofIds=none:unknownProofIdRows=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of unknown owner gate diagnostics", () => {
  const unknownOwnerGateId = "accepted-unknown-owner-command-evidence-covered";
  const recordWithMissingEvidenceIdAndUnknownOwnerGate = {
    ...acceptedRecord(),
    evidenceId: "",
    ownerGateRerunEvidenceIds: [
      ...ownerGateRerunEvidenceIds,
      unknownOwnerGateId
    ]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndUnknownOwnerGate]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.unknownOwnerGateRerunEvidenceIds, []);
  assert.deepEqual(intake.unknownOwnerGateRerunEvidenceIdRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-owner-gate-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-owner-gate-id-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "unknownOwnerGateIds=none:unknownOwnerGateIdRows=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of missing proof diagnostics", () => {
  const missingProofId = requirementProofEvidenceIds[3];
  const recordWithMissingEvidenceIdAndMissingProof = {
    ...acceptedRecord(),
    evidenceId: "",
    requirementProofEvidenceIds: requirementProofEvidenceIds.filter((proofId) => proofId !== missingProofId)
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndMissingProof]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.missingRequirementProofEvidenceIds, []);
  assert.deepEqual(intake.missingRequirementProofEvidenceIdRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-proof-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-proof-id-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "missingProofIds=none:missingProofIdRows=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of missing owner gate diagnostics", () => {
  const missingOwnerGateId = ownerGateRerunEvidenceIds[2];
  const recordWithMissingEvidenceIdAndMissingOwnerGate = {
    ...acceptedRecord(),
    evidenceId: "",
    ownerGateRerunEvidenceIds: ownerGateRerunEvidenceIds.filter((evidenceId) => evidenceId !== missingOwnerGateId)
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndMissingOwnerGate]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.missingOwnerGateRerunEvidenceIds, []);
  assert.deepEqual(intake.missingOwnerGateRerunEvidenceIdRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-owner-gate-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-owner-gate-id-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "missingOwnerGateIds=none:missingOwnerGateIdRows=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of duplicate proof diagnostics", () => {
  const duplicateProofId = requirementProofEvidenceIds[0];
  const recordWithMissingEvidenceIdAndDuplicateProof = {
    ...acceptedRecord(),
    evidenceId: "",
    requirementProofEvidenceIds: [...requirementProofEvidenceIds, duplicateProofId]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndDuplicateProof]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.duplicateRequirementProofEvidenceIds, []);
  assert.deepEqual(intake.duplicateRequirementProofEvidenceIdRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-proof-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-proof-id-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "duplicateProofIds=none:duplicateProofIdRows=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of duplicate owner gate diagnostics", () => {
  const duplicateOwnerGateId = ownerGateRerunEvidenceIds[0];
  const recordWithMissingEvidenceIdAndDuplicateOwnerGate = {
    ...acceptedRecord(),
    evidenceId: "",
    ownerGateRerunEvidenceIds: [...ownerGateRerunEvidenceIds, duplicateOwnerGateId]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndDuplicateOwnerGate]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.duplicateOwnerGateRerunEvidenceIds, []);
  assert.deepEqual(intake.duplicateOwnerGateRerunEvidenceIdRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-owner-gate-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-owner-gate-id-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "duplicateOwnerGateIds=none:duplicateOwnerGateIdRows=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of non-canonical proof diagnostics", () => {
  const nonCanonicalProofId = ` ${requirementProofEvidenceIds[0]} `;
  const recordWithMissingEvidenceIdAndNonCanonicalProof = {
    ...acceptedRecord(),
    evidenceId: "",
    requirementProofEvidenceIds: [
      nonCanonicalProofId,
      ...requirementProofEvidenceIds.slice(1)
    ]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndNonCanonicalProof]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.nonCanonicalRequirementProofEvidenceIds, []);
  assert.deepEqual(intake.nonCanonicalRequirementProofEvidenceIdRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-proof-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-proof-id-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "nonCanonicalProofIds=none:nonCanonicalProofIdRows=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of non-canonical owner gate diagnostics", () => {
  const nonCanonicalOwnerGateId = ` ${ownerGateRerunEvidenceIds[0]} `;
  const recordWithMissingEvidenceIdAndNonCanonicalOwnerGate = {
    ...acceptedRecord(),
    evidenceId: "",
    ownerGateRerunEvidenceIds: [
      nonCanonicalOwnerGateId,
      ...ownerGateRerunEvidenceIds.slice(1)
    ]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndNonCanonicalOwnerGate]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.nonCanonicalOwnerGateRerunEvidenceIds, []);
  assert.deepEqual(intake.nonCanonicalOwnerGateRerunEvidenceIdRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-owner-gate-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-owner-gate-id-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "nonCanonicalOwnerGateIds=none:nonCanonicalOwnerGateIdRows=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of mismatched target diagnostics", () => {
  const mismatchedTarget = "mathSceneV2WrongObjectiveCompletionAudit";
  const recordWithMissingEvidenceIdAndMismatchedTarget: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    evidenceId: "",
    target: mismatchedTarget as MathSceneV2FinalClosureAuditRecord["target"]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndMismatchedTarget]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.mismatchedFinalAuditRecordTargets, []);
  assert.deepEqual(intake.mismatchedFinalAuditRecordTargetRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-targets"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-target-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "mismatchedTargetRows=none:mismatchedTargets=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of non-canonical target diagnostics", () => {
  const nonCanonicalTarget = " mathSceneV2ObjectiveCompletionAudit ";
  const recordWithMissingEvidenceIdAndNonCanonicalTarget: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    evidenceId: "",
    target: nonCanonicalTarget as MathSceneV2FinalClosureAuditRecord["target"]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndNonCanonicalTarget]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.nonCanonicalFinalAuditRecordTargets, []);
  assert.deepEqual(intake.nonCanonicalFinalAuditRecordTargetRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-targets"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-target-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "nonCanonicalTargetRows=none:nonCanonicalTargets=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of non-canonical status diagnostics", () => {
  const nonCanonicalStatus = " accepted ";
  const recordWithMissingEvidenceIdAndNonCanonicalStatus: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    evidenceId: "",
    status: nonCanonicalStatus as MathSceneV2FinalClosureAuditRecord["status"]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndNonCanonicalStatus]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.nonCanonicalFinalAuditRecordStatuses, []);
  assert.deepEqual(intake.nonCanonicalFinalAuditRecordStatusRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-statuses"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-status-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "nonCanonicalStatusRows=none:nonCanonicalStatuses=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing submitted evidence ids out of unsupported status diagnostics", () => {
  const unsupportedStatus = "approved-by-owner";
  const recordWithMissingEvidenceIdAndUnsupportedStatus: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    evidenceId: "",
    status: unsupportedStatus as MathSceneV2FinalClosureAuditRecord["status"]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingEvidenceIdAndUnsupportedStatus]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.missingSubmittedFinalAuditRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.unsupportedFinalAuditRecordStatuses, []);
  assert.deepEqual(intake.unsupportedFinalAuditRecordStatusRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unsupported-statuses"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unsupported-status-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "unsupportedStatusRows=none:unsupportedStatuses=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces non-canonical submitted final record evidence ids", () => {
  const nonCanonicalRecordId = " accepted-final-objective-audit-4-of-4 ";
  const nonCanonicalRecordIdRows = [
    "submitted= accepted-final-objective-audit-4-of-4 :canonical=accepted-final-objective-audit-4-of-4"
  ];
  const recordWithNonCanonicalEvidenceId = {
    ...acceptedRecord(),
    evidenceId: nonCanonicalRecordId
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithNonCanonicalEvidenceId]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.nonCanonicalSubmittedFinalAuditRecordEvidenceIds, [nonCanonicalRecordId]);
  assert.deepEqual(intake.nonCanonicalSubmittedFinalAuditRecordEvidenceIdRows, nonCanonicalRecordIdRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-submitted-record-ids"],
    nonCanonicalRecordId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-submitted-record-id-rows"],
    nonCanonicalRecordIdRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /nonCanonicalSubmittedRecordIds= accepted-final-objective-audit-4-of-4 /
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /nonCanonicalSubmittedRecordIdRows=submitted= accepted-final-objective-audit-4-of-4 :canonical=accepted-final-objective-audit-4-of-4/
  );
});

test("MAIS Manim v2 final objective audit record intake rejects status-mismatched final audit evidence ids", () => {
  const recordWithMismatchedEvidenceId = {
    ...acceptedRecord(),
    evidenceId: "owner-approved-final-audit-4-of-4"
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMismatchedEvidenceId]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.invalidFinalAuditRecordRows, [
    "owner-approved-final-audit-4-of-4:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted:proven=4:required=4"
  ]);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-invalid-record-rows"],
    "owner-approved-final-audit-4-of-4:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted:proven=4:required=4"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /invalidRecordRows=owner-approved-final-audit-4-of-4:submittedRecordIndex=0/
  );
});

test("MAIS Manim v2 final objective audit record intake rejects final audit evidence ids with empty proof suffixes", () => {
  const emptySuffixRecord = {
    ...acceptedRecord(),
    evidenceId: "accepted-final-objective-audit-"
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [emptySuffixRecord]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);
  const invalidRecordRows = [
    "accepted-final-objective-audit-:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted:proven=4:required=4"
  ];

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.invalidFinalAuditRecordRows, invalidRecordRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-invalid-record-rows"],
    invalidRecordRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /invalidRecordRows=accepted-final-objective-audit-:submittedRecordIndex=0/
  );
});

test("MAIS Manim v2 final objective audit record intake rejects accepted final audit evidence ids with mismatched proof suffixes", () => {
  const mismatchedSuffixRecord = {
    ...acceptedRecord(),
    evidenceId: "accepted-final-objective-audit-3-of-4"
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [mismatchedSuffixRecord]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);
  const invalidRecordRows = [
    "accepted-final-objective-audit-3-of-4:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted:proven=4:required=4"
  ];

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.invalidFinalAuditRecordRows, invalidRecordRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-invalid-record-rows"],
    invalidRecordRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /invalidRecordRows=accepted-final-objective-audit-3-of-4:submittedRecordIndex=0/
  );
});

test("MAIS Manim v2 final objective audit record intake rejects accepted final audit evidence ids with dangling proof suffix separators", () => {
  const danglingSuffixRecord = {
    ...acceptedRecord(),
    evidenceId: "accepted-final-objective-audit-4-of-4-"
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [danglingSuffixRecord]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);
  const invalidRecordRows = [
    "accepted-final-objective-audit-4-of-4-:submittedRecordIndex=0:target=mathSceneV2ObjectiveCompletionAudit:status=accepted:proven=4:required=4"
  ];

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.invalidFinalAuditRecordRows, invalidRecordRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-invalid-record-rows"],
    invalidRecordRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /invalidRecordRows=accepted-final-objective-audit-4-of-4-:submittedRecordIndex=0/
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces mismatched final audit record targets", () => {
  const mismatchedTarget = "mathSceneV2WrongObjectiveCompletionAudit";
  const mismatchedTargetRows = [
    `accepted-final-objective-audit-4-of-4:submitted=${mismatchedTarget}:required=mathSceneV2ObjectiveCompletionAudit`
  ];
  const recordWithMismatchedTarget: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    target: mismatchedTarget as MathSceneV2FinalClosureAuditRecord["target"]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMismatchedTarget]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.mismatchedFinalAuditRecordTargets, [mismatchedTarget]);
  assert.deepEqual(intake.mismatchedFinalAuditRecordTargetRows, mismatchedTargetRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-targets"],
    mismatchedTarget
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-target-rows"],
    mismatchedTargetRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`mismatchedTargets=${mismatchedTarget}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`mismatchedTargetRows=${mismatchedTargetRows[0]}`)
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces non-canonical final audit record targets", () => {
  const nonCanonicalTarget = " mathSceneV2ObjectiveCompletionAudit ";
  const nonCanonicalTargetRows = [
    "accepted-final-objective-audit-4-of-4:submitted= mathSceneV2ObjectiveCompletionAudit :canonical=mathSceneV2ObjectiveCompletionAudit"
  ];
  const recordWithNonCanonicalTarget: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    target: nonCanonicalTarget as MathSceneV2FinalClosureAuditRecord["target"]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithNonCanonicalTarget]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.nonCanonicalFinalAuditRecordTargets, [nonCanonicalTarget]);
  assert.deepEqual(intake.nonCanonicalFinalAuditRecordTargetRows, nonCanonicalTargetRows);
  assert.deepEqual(intake.mismatchedFinalAuditRecordTargets, []);
  assert.deepEqual(intake.mismatchedFinalAuditRecordTargetRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-targets"],
    nonCanonicalTarget
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-target-rows"],
    nonCanonicalTargetRows.join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-targets"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-target-rows"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /nonCanonicalTargets= mathSceneV2ObjectiveCompletionAudit /
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`nonCanonicalTargetRows=${nonCanonicalTargetRows[0]}`)
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "mismatchedTargetRows=none:mismatchedTargets=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces unsupported final audit record statuses", () => {
  const unsupportedStatus = "approved-by-owner";
  const unsupportedStatusRows = [
    "accepted-final-objective-audit-4-of-4:submitted=approved-by-owner:supported=accepted|blocked"
  ];
  const recordWithUnsupportedStatus: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    status: unsupportedStatus as MathSceneV2FinalClosureAuditRecord["status"]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithUnsupportedStatus]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.blockedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.unsupportedFinalAuditRecordStatuses, [unsupportedStatus]);
  assert.deepEqual(intake.unsupportedFinalAuditRecordStatusRows, unsupportedStatusRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unsupported-statuses"],
    unsupportedStatus
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unsupported-status-rows"],
    unsupportedStatusRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`unsupportedStatuses=${unsupportedStatus}`)
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      `unsupportedStatusRows=${unsupportedStatusRows[0]}`
    )
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces non-canonical final audit record statuses", () => {
  const nonCanonicalStatus = " accepted ";
  const nonCanonicalStatusRows = [
    "accepted-final-objective-audit-4-of-4:submitted= accepted :canonical=accepted"
  ];
  const recordWithNonCanonicalStatus: MathSceneV2FinalClosureAuditRecord = {
    ...acceptedRecord(),
    status: nonCanonicalStatus as MathSceneV2FinalClosureAuditRecord["status"]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithNonCanonicalStatus]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.blockedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.nonCanonicalFinalAuditRecordStatuses, [nonCanonicalStatus]);
  assert.deepEqual(intake.nonCanonicalFinalAuditRecordStatusRows, nonCanonicalStatusRows);
  assert.deepEqual(intake.unsupportedFinalAuditRecordStatuses, []);
  assert.deepEqual(intake.unsupportedFinalAuditRecordStatusRows, []);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-statuses"],
    nonCanonicalStatus
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-status-rows"],
    nonCanonicalStatusRows.join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unsupported-statuses"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unsupported-status-rows"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /nonCanonicalStatuses= accepted /
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      `nonCanonicalStatusRows=${nonCanonicalStatusRows[0]}`
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "unsupportedStatusRows=none:unsupportedStatuses=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces mismatched final audit requirement counts", () => {
  const recordWithMismatchedRequirementCount = {
    ...acceptedRecord(),
    requirementCount: 3
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMismatchedRequirementCount]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);
  const mismatch = "accepted-final-objective-audit-4-of-4:submitted=3:required=4";
  const mismatchRows = [
    "accepted-final-objective-audit-4-of-4:submittedRecordIndex=0:submitted=3:required=4"
  ];

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.mismatchedFinalAuditRecordRequirementCounts, [mismatch]);
  assert.deepEqual(intake.mismatchedFinalAuditRecordRequirementCountRows, mismatchRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-requirement-counts"],
    mismatch
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-requirement-count-rows"],
    mismatchRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /mismatchedRequirementCounts=accepted-final-objective-audit-4-of-4:submitted=3:required=4/
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`mismatchedRequirementCountRows=${mismatchRows[0]}`)
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces mismatched final audit proven requirement counts", () => {
  const recordWithMismatchedProvenRequirementCount = {
    ...acceptedRecord(),
    provenRequirementCount: 3
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMismatchedProvenRequirementCount]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);
  const mismatch = "accepted-final-objective-audit-4-of-4:submitted=3:required=4";
  const mismatchRows = [
    "accepted-final-objective-audit-4-of-4:submittedRecordIndex=0:submitted=3:required=4"
  ];

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(intake.acceptedFinalAuditRecord, undefined);
  assert.deepEqual(intake.mismatchedFinalAuditRecordProvenRequirementCounts, [mismatch]);
  assert.deepEqual(intake.mismatchedFinalAuditRecordProvenRequirementCountRows, mismatchRows);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-proven-requirement-counts"],
    mismatch
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-mismatched-proven-requirement-count-rows"],
    mismatchRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /mismatchedProvenRequirementCounts=accepted-final-objective-audit-4-of-4:submitted=3:required=4/
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`mismatchedProvenRequirementCountRows=${mismatchRows[0]}`)
  );
});

test("MAIS Manim v2 final objective audit record intake rejects bare 4-of-4 records without requirement proof ids", () => {
  const bareRecord = {
    ...acceptedRecord(),
    requirementProofEvidenceIds: []
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(requestedPacket(), [bareRecord]);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.readyForFinalClosureAudit, false);
});

test("MAIS Manim v2 final objective audit record intake surfaces unknown requirement proof ids", () => {
  const unknownProofId = "unknown-owner-proof:final-evidence";
  const unknownProofRows = [`accepted-final-objective-audit-4-of-4:${unknownProofId}`];
  const recordWithUnknownProof = {
    ...acceptedRecord(),
    requirementProofEvidenceIds: [...requirementProofEvidenceIds, unknownProofId]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithUnknownProof]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.unknownRequirementProofEvidenceIds, [unknownProofId]);
  assert.deepEqual(intake.unknownRequirementProofEvidenceIdRows, unknownProofRows);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-proof-ids"],
    unknownProofId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-proof-id-rows"],
    unknownProofRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`unknownProofIds=${unknownProofId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /unknownProofIdRows=accepted-final-objective-audit-4-of-4:unknown-owner-proof:final-evidence/
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces missing requirement proof ids", () => {
  const missingProofId = requirementProofEvidenceIds[3];
  const missingProofRows = [`accepted-final-objective-audit-4-of-4:${missingProofId}`];
  const recordWithMissingProof = {
    ...acceptedRecord(),
    requirementProofEvidenceIds: requirementProofEvidenceIds.filter((proofId) => proofId !== missingProofId)
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingProof]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.missingRequirementProofEvidenceIds, [missingProofId]);
  assert.deepEqual(intake.missingRequirementProofEvidenceIdRows, missingProofRows);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-proof-ids"],
    missingProofId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-proof-id-rows"],
    missingProofRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`missingProofIds=${missingProofId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /missingProofIdRows=accepted-final-objective-audit-4-of-4:a22-clean-release-gate:final-owner-proof:owner-gate-blocked/
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces non-canonical submitted requirement proof ids", () => {
  const nonCanonicalProofId = ` ${requirementProofEvidenceIds[0]} `;
  const nonCanonicalProofRows = [`accepted-final-objective-audit-4-of-4:${nonCanonicalProofId}`];
  const recordWithNonCanonicalProof = {
    ...acceptedRecord(),
    requirementProofEvidenceIds: [
      nonCanonicalProofId,
      ...requirementProofEvidenceIds.slice(1)
    ]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithNonCanonicalProof]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.nonCanonicalRequirementProofEvidenceIds, [nonCanonicalProofId]);
  assert.deepEqual(intake.nonCanonicalRequirementProofEvidenceIdRows, nonCanonicalProofRows);
  assert.deepEqual(intake.unknownRequirementProofEvidenceIds, []);
  assert.deepEqual(intake.unknownRequirementProofEvidenceIdRows, []);
  assert.deepEqual(intake.missingRequirementProofEvidenceIds, []);
  assert.deepEqual(intake.missingRequirementProofEvidenceIdRows, []);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-proof-ids"],
    nonCanonicalProofId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-proof-id-rows"],
    nonCanonicalProofRows.join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-proof-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-proof-id-rows"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-proof-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-proof-id-rows"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`nonCanonicalProofIds=${nonCanonicalProofId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /nonCanonicalProofIdRows=accepted-final-objective-audit-4-of-4: a06-review-package-split:current-source:current-evidence-proves-requirement /
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "missingProofIds=none:missingProofIdRows=none"
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "unknownProofIds=none:unknownProofIdRows=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake keeps missing requirement proof ids out of duplicate diagnostics", () => {
  const blankProofId = "   ";
  const recordWithBlankProofIds = {
    ...acceptedRecord(),
    requirementProofEvidenceIds: [
      blankProofId,
      blankProofId,
      ...requirementProofEvidenceIds.slice(1)
    ]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithBlankProofIds]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.duplicateRequirementProofEvidenceIds, []);
  assert.deepEqual(intake.missingRequirementProofEvidenceIds, [requirementProofEvidenceIds[0]]);
  assert.deepEqual(intake.nonCanonicalRequirementProofEvidenceIds, [blankProofId]);
  assert.deepEqual(intake.unknownRequirementProofEvidenceIds, [blankProofId]);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-proof-ids"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /duplicateProofIds=none/
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces duplicate submitted requirement proof ids", () => {
  const duplicateProofId = requirementProofEvidenceIds[0];
  const duplicateProofRows = [`accepted-final-objective-audit-4-of-4:${duplicateProofId}`];
  const recordWithDuplicateProof = {
    ...acceptedRecord(),
    requirementProofEvidenceIds: [...requirementProofEvidenceIds, duplicateProofId]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithDuplicateProof]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.duplicateRequirementProofEvidenceIds, [duplicateProofId]);
  assert.deepEqual(intake.duplicateRequirementProofEvidenceIdRows, duplicateProofRows);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-proof-ids"],
    duplicateProofId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-proof-id-rows"],
    duplicateProofRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`duplicateProofIds=${duplicateProofId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /duplicateProofIdRows=accepted-final-objective-audit-4-of-4:a06-review-package-split:current-source:current-evidence-proves-requirement/
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces duplicate submitted owner gate rerun evidence ids", () => {
  const duplicateOwnerGateId = ownerGateRerunEvidenceIds[0];
  const duplicateOwnerGateRows = [`accepted-final-objective-audit-4-of-4:${duplicateOwnerGateId}`];
  const recordWithDuplicateOwnerGate = {
    ...acceptedRecord(),
    ownerGateRerunEvidenceIds: [...ownerGateRerunEvidenceIds, duplicateOwnerGateId]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithDuplicateOwnerGate]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.duplicateOwnerGateRerunEvidenceIds, [duplicateOwnerGateId]);
  assert.deepEqual(intake.duplicateOwnerGateRerunEvidenceIdRows, duplicateOwnerGateRows);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-owner-gate-ids"],
    duplicateOwnerGateId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-duplicate-owner-gate-id-rows"],
    duplicateOwnerGateRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`duplicateOwnerGateIds=${duplicateOwnerGateId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /duplicateOwnerGateIdRows=accepted-final-objective-audit-4-of-4:accepted-A11-command-evidence-covered/
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces unknown submitted owner gate rerun evidence ids", () => {
  const unknownOwnerGateId = "accepted-unknown-owner-command-evidence-covered";
  const unknownOwnerGateRows = [`accepted-final-objective-audit-4-of-4:${unknownOwnerGateId}`];
  const recordWithUnknownOwnerGate = {
    ...acceptedRecord(),
    ownerGateRerunEvidenceIds: [...ownerGateRerunEvidenceIds, unknownOwnerGateId]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithUnknownOwnerGate]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.unknownOwnerGateRerunEvidenceIds, [unknownOwnerGateId]);
  assert.deepEqual(intake.unknownOwnerGateRerunEvidenceIdRows, unknownOwnerGateRows);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-owner-gate-ids"],
    unknownOwnerGateId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-owner-gate-id-rows"],
    unknownOwnerGateRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`unknownOwnerGateIds=${unknownOwnerGateId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /unknownOwnerGateIdRows=accepted-final-objective-audit-4-of-4:accepted-unknown-owner-command-evidence-covered/
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces non-canonical submitted owner gate rerun evidence ids", () => {
  const nonCanonicalOwnerGateId = ` ${ownerGateRerunEvidenceIds[0]} `;
  const nonCanonicalOwnerGateRows = [`accepted-final-objective-audit-4-of-4:${nonCanonicalOwnerGateId}`];
  const recordWithNonCanonicalOwnerGate = {
    ...acceptedRecord(),
    ownerGateRerunEvidenceIds: [
      nonCanonicalOwnerGateId,
      ...ownerGateRerunEvidenceIds.slice(1)
    ]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithNonCanonicalOwnerGate]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.nonCanonicalOwnerGateRerunEvidenceIds, [nonCanonicalOwnerGateId]);
  assert.deepEqual(intake.nonCanonicalOwnerGateRerunEvidenceIdRows, nonCanonicalOwnerGateRows);
  assert.deepEqual(intake.unknownOwnerGateRerunEvidenceIds, []);
  assert.deepEqual(intake.unknownOwnerGateRerunEvidenceIdRows, []);
  assert.deepEqual(intake.missingOwnerGateRerunEvidenceIds, []);
  assert.deepEqual(intake.missingOwnerGateRerunEvidenceIdRows, []);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-owner-gate-ids"],
    nonCanonicalOwnerGateId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-owner-gate-id-rows"],
    nonCanonicalOwnerGateRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`nonCanonicalOwnerGateIds=${nonCanonicalOwnerGateId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /nonCanonicalOwnerGateIdRows=accepted-final-objective-audit-4-of-4: accepted-A11-command-evidence-covered /
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-owner-gate-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-unknown-owner-gate-id-rows"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-owner-gate-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-owner-gate-id-rows"],
    "none"
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "missingOwnerGateIds=none:missingOwnerGateIdRows=none"
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"].includes(
      "unknownOwnerGateIds=none:unknownOwnerGateIdRows=none"
    )
  );
});

test("MAIS Manim v2 final objective audit record intake surfaces missing submitted owner gate rerun evidence ids", () => {
  const missingOwnerGateId = ownerGateRerunEvidenceIds[2];
  const missingOwnerGateRows = [`accepted-final-objective-audit-4-of-4:${missingOwnerGateId}`];
  const recordWithMissingOwnerGate = {
    ...acceptedRecord(),
    ownerGateRerunEvidenceIds: ownerGateRerunEvidenceIds.filter((evidenceId) => evidenceId !== missingOwnerGateId)
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    requestedPacket(),
    [recordWithMissingOwnerGate]
  );
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(intake.acceptedRecordCount, 0);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.missingOwnerGateRerunEvidenceIds, [missingOwnerGateId]);
  assert.deepEqual(intake.missingOwnerGateRerunEvidenceIdRows, missingOwnerGateRows);
  assert.equal(intake.readyForFinalClosureAudit, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-owner-gate-ids"],
    missingOwnerGateId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing-owner-gate-id-rows"],
    missingOwnerGateRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    new RegExp(`missingOwnerGateIds=${missingOwnerGateId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-summary"],
    /missingOwnerGateIdRows=accepted-final-objective-audit-4-of-4:accepted-A22-command-evidence-covered/
  );
});

test("MAIS Manim v2 final objective audit record intake serializes stable handoff attributes", () => {
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(requestedPacket(), []);
  const attributes = mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(intake);

  assert.equal(classifyManimReviewPackage("mathSceneV2FinalObjectiveAuditRecordIntake.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-source-contract"],
    MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_RECORD_INTAKE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-record-intake-status"], "pending-final-objective-audit-record");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-record-intake-accepted"], "0");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-record-intake-invalid"], "0");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-record-intake-missing"], "1");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-record-intake-ready"], "false");
  assert.equal(attributes["data-viz-manim-v2-final-objective-audit-record-intake-can-complete"], "false");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-action-evidence-count-manifest"],
    ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-acceptance-criteria-manifest"],
    ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-audit-record-intake-owner-evidence-requirement-manifest"],
    ownerEvidenceRequirementManifest
  );
});
