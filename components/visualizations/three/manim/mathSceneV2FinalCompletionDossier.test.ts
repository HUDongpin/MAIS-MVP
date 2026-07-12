import assert from "node:assert/strict";
import test from "node:test";
import type {
  MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipeline,
  MathSceneV2FinalObjectiveVerifiedClosurePipeline
} from "./mathSceneV2FinalObjectiveVerifiedClosurePipeline";
import {
  buildMathSceneV2FinalCompletionDossier,
  mathSceneV2FinalCompletionDossierDataAttributes,
  MATH_SCENE_V2_FINAL_COMPLETION_DOSSIER_SOURCE_CONTRACT
} from "./mathSceneV2FinalCompletionDossier";
import type { MathSceneV2FinalClosureAuditReviewSliceMismatchReason } from "./mathSceneV2FinalClosureAudit";
import { MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT } from "./mathSceneTeachingA06SourceConfirmationLedger";
import type { MathSceneV2OwnerGateHandoffBundle } from "./mathSceneV2OwnerGateHandoffBundle";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";

const finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames = [
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
] as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest =
  "owner-gate-rerun-submission-bridge=1/1;final-objective-audit-request=1/1;final-objective-audit-record=1/1;final-objective-proof-ledger=4/4;verified-closure=4/4;final-closure-audit=1/1";

const finalObjectiveSubmissionBridgeVerifiedClosureGateIds =
  "owner-gate-rerun-submission-bridge,final-objective-audit-request,final-objective-audit-record,final-objective-proof-ledger,verified-closure,final-closure-audit";

const finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest =
  "owner-gate-rerun-submission-bridge=A11+A18+A22;final-objective-audit-request=A06;final-objective-audit-record=A06+A11+A18+A22;final-objective-proof-ledger=A06+A11+A18+A22;verified-closure=A06+A11+A18+A22;final-closure-audit=A06+A11+A18+A22";

const finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest =
  "owner-gate-rerun-submission-bridge=owner-gate-rerun-submissions-covered;final-objective-audit-request=pending-final-objective-audit-record;final-objective-audit-record=final-objective-audit-record-accepted;final-objective-proof-ledger=final-objective-proofs-covered;verified-closure=complete;final-closure-audit=complete";
const a06SourceConfirmationSummary =
  "a06TeachingSourceConfirmationLedger:status=a06-source-confirmed-a18-pending:confirmed=60/60:pendingA18=60:function-graph-core=5/5-a06-confirmed";

function pipelineFixture(
  overrides: Partial<MathSceneV2FinalObjectiveVerifiedClosurePipeline> = {}
): MathSceneV2FinalObjectiveVerifiedClosurePipeline {
  return {
    acceptedFinalAuditEvidenceId: undefined,
    acceptedFinalAuditRecordCount: 0,
    acceptedTranscriptCount: 0,
    a11RequiredRootDataAttributeCount: 5,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      [
        "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
        "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
        "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
        "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore",
        "data-viz-manim-run-from-beat-checkpoint-restore-action"
      ].join(","),
    blockedFinalAuditRecordCount: 0,
    blockedTranscriptCount: 0,
    canMarkThreadGoalComplete: false,
    commandEvidenceRecordCount: 0,
    commandEvidenceStatus: "pending-owner-command-evidence",
    finalClosureStatus: "pending-owner-gate-reruns",
    finalObjectiveAuditRecordIntakeStatus: "blocked-final-objective-audit-not-requested",
    finalObjectiveProofCoveredCount: 0,
    finalObjectiveProofLedgerStatus: "blocked-final-objective-proof-request",
    finalObjectiveProofPendingCount: 3,
    finalObjectiveProofRemainingOwnerAgentIds: ["A11", "A18", "A22"],
    finalObjectiveProofRequirementCount: 4,
    finalObjectiveSourceProofReadyCount: 1,
    finalObjectiveAuditRequestStatus: "blocked-owner-gate-reruns",
    invalidFinalAuditRecordCount: 0,
    invalidTranscriptCount: 0,
    missingFinalAuditRecordCount: 0,
    missingOwnerEvidenceSummary: "A11=6;A22=6;A18+A06=10",
    missingTranscriptCount: 23,
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    ownerGateRerunAcceptedSubmittedRecordManifest: "not-attached",
    ownerGateRerunInvalidSubmittedRecordManifest: "not-attached",
    ownerGateRerunMissingTemplateManifest: "not-attached",
    provenRequirementCount: 1,
    readyForFinalClosureAudit: false,
    readyForFinalObjectiveAuditRecord: false,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    requiredFinalAuditRecordCount: 1,
    requiredTranscriptCount: 23,
    requirementCount: 4,
    reviewSliceConsumerGateEvidenceIdManifest:
      "A11=a11-browser-visual-interaction-regression;A18=a18-a06-teaching-quality-confirmation;A22=a22-clean-release-gate",
    reviewSliceCount: 20,
    reviewSliceFileManifest:
      "manim-review-slice-01=mathSceneRuntimeState.ts;manim-review-slice-20=mathSceneV2FinalCompletionDossier.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-20",
    reviewSliceMismatchReasons: [],
    reviewSliceSummary: "20 review slices; consumers=A11+A18+A22",
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureBlockerReasonManifest: "none",
    sourceArchitectureBlockerReasons: [],
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    sourceArchitectureOpenOwnerGateIds: [],
    sourceArchitectureRequiredOwnerGateIds: [],
    sourceArchitectureSourceContract: "not-attached",
    sourceArchitectureSummary: "not-attached",
    sourceContract: "MAIS Manim v2 final objective verified closure pipeline: validates final objective audit records through request and record intake before verified closure",
    status: "pending-command-transcripts",
    summary: "mathSceneV2FinalObjectiveVerifiedClosurePipeline:status=pending-command-transcripts",
    transcriptStatus: "pending-command-transcripts",
    verifiedClosureStatus: "pending-command-evidence",
    ...overrides
  };
}

function submissionBridgeVerifiedClosurePipelineFixture(
  overrides: Partial<MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipeline> = {}
): MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipeline {
  return {
    acceptedFinalAuditEvidenceId: "accepted-final-objective-audit-after-owner-gate-submissions",
    acceptedFinalAuditRecordCount: 1,
    acceptedSubmittedRecordManifest:
      "A11:a11-browser-visual-interaction-regression:submit-a11-browser-evidence:a11-browser-final:owners=A11|status=accepted;A18:a18-a06-teaching-quality-confirmation:submit-a18-teaching-evidence:a18-teaching-final:owners=A18|status=accepted;A22:a22-clean-release-gate:submit-a22-release-evidence:a22-release-final:owners=A22|status=accepted",
    a11RequiredRootDataAttributeCount: 5,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      [
        "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
        "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
        "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
        "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore",
        "data-viz-manim-run-from-beat-checkpoint-restore-action"
      ].join(","),
    blockedFinalAuditRecordCount: 0,
    canMarkThreadGoalComplete: true,
    finalClosureStatus: "complete",
    finalObjectiveAuditRecordIntakeStatus: "final-objective-audit-record-accepted",
    finalObjectiveAuditRequestStatus: "pending-final-objective-audit-record",
    finalObjectiveProofCoveredCount: 4,
    finalObjectiveProofLedgerStatus: "final-objective-proofs-covered",
    finalObjectiveProofPendingCount: 0,
    finalObjectiveProofRemainingOwnerAgentIds: [],
    finalObjectiveProofRequirementCount: 4,
    finalObjectiveSourceProofReadyCount: 1,
    invalidFinalAuditRecordCount: 0,
    invalidSubmittedRecordManifest: "none",
    missingFinalAuditRecordCount: 0,
    missingTemplateManifest: "none",
    ownerActionEvidenceCountManifest: "A11=1;A18=1;A22=1",
    ownerAcceptanceCriteriaManifest:
      "A11=browser-visual-interaction-regression-accepted;A18=teaching-quality-accepted;A22=clean-release-gate-accepted",
    ownerEvidenceRequirementManifest:
      "A11=a11-browser-visual-interaction-regression;A18=a18-a06-teaching-quality-confirmation;A22=a22-clean-release-gate",
    ownerGateRerunSource: "owner-gate-rerun-submission-bridge",
    ownerGateRerunSourceStatus: "owner-gate-rerun-submissions-covered",
    ownerGateRerunSubmissionBridgeStatus: "owner-gate-rerun-submissions-covered",
    provenRequirementCount: 4,
    readyForFinalClosureAudit: true,
    readyForFinalObjectiveAuditRecord: true,
    remainingOwnerAgentIds: [],
    requiredFinalAuditRecordCount: 1,
    requirementCount: 4,
    reviewSliceConsumerGateEvidenceIdManifest:
      "A11=a11-browser-visual-interaction-regression;A18=a18-a06-teaching-quality-confirmation;A22=a22-clean-release-gate",
    reviewSliceCount: 20,
    reviewSliceFileManifest:
      "manim-review-slice-01=mathSceneRuntimeState.ts;manim-review-slice-20=mathSceneV2FinalCompletionDossier.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-20",
    reviewSliceMismatchReasons: [],
    reviewSliceSummary: "20 review slices; consumers=A11+A18+A22",
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureBlockerReasonManifest: "duplicateReviewSliceFiles,unclassifiedManimFiles",
    sourceArchitectureBlockerReasons: ["duplicateReviewSliceFiles", "unclassifiedManimFiles"],
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    sourceArchitectureOpenOwnerGateIds: [],
    sourceArchitectureRequiredOwnerGateIds: [],
    sourceArchitectureSourceContract: "not-attached",
    sourceArchitectureSummary: "not-attached",
    sourceContract:
      "MAIS Manim v2 final objective verified closure pipeline: validates final objective audit records through request and record intake before verified closure",
    status: "complete",
    summary:
      "mathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipeline:status=complete:ownerGateSubmissionBridge=owner-gate-rerun-submissions-covered",
    ...overrides
  };
}

function ownerGateHandoffBundleFixture(
  overrides: Partial<MathSceneV2OwnerGateHandoffBundle> = {}
): MathSceneV2OwnerGateHandoffBundle {
  return {
    a06SourceBlockedConfirmationCount: 0,
    a06SourceConfirmationCanCompleteA18Gate: false,
    a06SourceConfirmationMismatchReasons: [],
    a06SourceConfirmationSourceContract: MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT,
    a06SourceConfirmationStatus: "a06-source-confirmed-a18-pending",
    a06SourceConfirmationSummary: a06SourceConfirmationSummary,
    a06SourceConfirmedDecisionCount: 60,
    a06SourcePendingA18DecisionCount: 60,
    blockerReasons: [],
    canMarkThreadGoalComplete: false,
    commandRowCount: 2,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames:
      [...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus: "complete",
    manualReviewRowCount: 1,
    ownerAgentIds: ["A11", "A18", "A22"],
    ownerRowCount: 3,
    ownerRows: [
      {
        a06SourceBlockedConfirmationCount: 0,
        a06SourceConfirmationCanCompleteA18Gate: false,
        a06SourceConfirmationMismatchReasons: [],
        a06SourceConfirmationSourceContract: "not-applicable",
        a06SourceConfirmationStatus: "not-applicable",
        a06SourceConfirmationSummary: "not-applicable",
        a06SourceConfirmedDecisionCount: 0,
        a06SourcePendingA18DecisionCount: 0,
        commandEvidenceIds: ["a11-values-rerun"],
        commandRowCount: 1,
        manualReviewEvidenceIds: [],
        manualReviewRowCount: 0,
        nextAction: "submit-browser-regression-transcripts-and-proof",
        ownerAgentId: "A11",
        requiredProofCount: 1,
        requiredProofDetails: [
          {
            finalAuditEvidenceId: "pending",
            requiredActionSummary: "Submit accepted browser regression evidence.",
            requiredProofEvidenceId: "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence",
            sourceRequirementStatus: "owner-action-required"
          }
        ],
        requiredProofEvidenceIds: ["a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence"],
        requiredTranscriptFields: ["command", "evidenceId", "exitCode", "kind", "ownerAgentId", "reportPath", "rowEvidenceId", "runId"],
        routeReviewTranscriptRequestCount: 0,
        sourceArchitectureBulkCourseGenerationAllowed: false,
        sourceArchitectureFutureInvocationScope: "not-attached",
        sourceArchitectureHandoffStatus: "not-attached",
        status: "pending-owner-evidence",
        transcriptRequestCount: 1,
        transcriptRowEvidenceIds: ["a11-values-rerun"],
        transcriptTemplateEvidenceIds: ["pending-A11-a11-values-rerun-transcript"]
      },
      {
        a06SourceBlockedConfirmationCount: 0,
        a06SourceConfirmationCanCompleteA18Gate: false,
        a06SourceConfirmationMismatchReasons: [],
        a06SourceConfirmationSourceContract: MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT,
        a06SourceConfirmationStatus: "a06-source-confirmed-a18-pending",
        a06SourceConfirmationSummary: a06SourceConfirmationSummary,
        a06SourceConfirmedDecisionCount: 60,
        a06SourcePendingA18DecisionCount: 60,
        commandEvidenceIds: [],
        commandRowCount: 0,
        manualReviewEvidenceIds: ["a18-function-graph-route-review"],
        manualReviewRowCount: 1,
        nextAction: "submit-rendered-teaching-review-decisions-and-proof",
        ownerAgentId: "A18",
        requiredProofCount: 1,
        requiredProofDetails: [
          {
            finalAuditEvidenceId: "pending",
            requiredActionSummary: "Submit accepted A18 final criterion decisions.",
            requiredProofEvidenceId: "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions",
            sourceRequirementStatus: "owner-action-required"
          }
        ],
        requiredProofEvidenceIds: ["a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions"],
        requiredTranscriptFields: ["evidenceId", "href", "kind", "ownerAgentId", "reviewDecision", "rowEvidenceId", "sectionSelector"],
        routeReviewTranscriptRequestCount: 1,
        sourceArchitectureBulkCourseGenerationAllowed: false,
        sourceArchitectureFutureInvocationScope: "not-attached",
        sourceArchitectureHandoffStatus: "not-attached",
        status: "pending-owner-evidence",
        transcriptRequestCount: 1,
        transcriptRowEvidenceIds: ["a18-function-graph-route-review"],
        transcriptTemplateEvidenceIds: ["pending-A18-a18-function-graph-route-review-transcript"]
      },
      {
        a06SourceBlockedConfirmationCount: 0,
        a06SourceConfirmationCanCompleteA18Gate: false,
        a06SourceConfirmationMismatchReasons: [],
        a06SourceConfirmationSourceContract: "not-applicable",
        a06SourceConfirmationStatus: "not-applicable",
        a06SourceConfirmationSummary: "not-applicable",
        a06SourceConfirmedDecisionCount: 0,
        a06SourcePendingA18DecisionCount: 0,
        commandEvidenceIds: ["a22-release-preflight-rerun"],
        commandRowCount: 1,
        manualReviewEvidenceIds: [],
        manualReviewRowCount: 0,
        nextAction: "submit-clean-release-command-transcripts-and-proof",
        ownerAgentId: "A22",
        requiredProofCount: 1,
        requiredProofDetails: [
          {
            finalAuditEvidenceId: "pending",
            requiredActionSummary: "Submit accepted clean release gate evidence.",
            requiredProofEvidenceId: "a22-clean-release-gate:final-owner-proof:owner-gate-blocked",
            sourceRequirementStatus: "blocked-owner-action"
          }
        ],
        requiredProofEvidenceIds: ["a22-clean-release-gate:final-owner-proof:owner-gate-blocked"],
        requiredTranscriptFields: ["command", "evidenceId", "exitCode", "kind", "ownerAgentId", "reportPath", "rowEvidenceId", "runId"],
        routeReviewTranscriptRequestCount: 0,
        sourceArchitectureBulkCourseGenerationAllowed: false,
        sourceArchitectureFutureInvocationScope: "not-attached",
        sourceArchitectureHandoffStatus: "not-attached",
        status: "pending-owner-evidence",
        transcriptRequestCount: 1,
        transcriptRowEvidenceIds: ["a22-release-preflight-rerun"],
        transcriptTemplateEvidenceIds: ["pending-A22-a22-release-preflight-rerun-transcript"]
      }
    ],
    requiredOwnerProofCount: 3,
    reviewSliceConsumerGateEvidenceIdManifest:
      "A11=a11-browser-visual-interaction-regression;A18=a18-a06-teaching-quality-confirmation;A22=a22-clean-release-gate",
    reviewSliceCount: 20,
    reviewSliceFileManifest:
      "manim-review-slice-01=mathSceneRuntimeState.ts;manim-review-slice-20=mathSceneV2FinalCompletionDossier.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-20",
    reviewSliceSummary: "20 review slices; consumers=A11+A18+A22",
    routeReviewRowCount: 1,
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    sourceArchitectureOpenOwnerGateIds: [],
    sourceArchitectureRequiredOwnerGateIds: [],
    sourceArchitectureSourceContract: "not-attached",
    sourceArchitectureSummary: "not-attached",
    sourceContract:
      "MAIS Manim v2 owner gate handoff bundle: per-owner A11/A18/A22 command, transcript, and final-proof rows without accepting evidence",
    status: "pending-owner-evidence-bundle",
    summary:
      "mathSceneV2OwnerGateHandoffBundle:status=pending-owner-evidence-bundle:owners=A11,A18,A22:commands=2:routeReviews=1:transcripts=3:proofs=3",
    transcriptRequestCount: 3,
    ...overrides
  };
}

test("MAIS Manim v2 final completion dossier keeps command transcripts as the first open gate", () => {
  const dossier = buildMathSceneV2FinalCompletionDossier(pipelineFixture());

  assert.equal(dossier.sourceContract, MATH_SCENE_V2_FINAL_COMPLETION_DOSSIER_SOURCE_CONTRACT);
  assert.equal(dossier.status, "pending-command-transcripts");
  assert.equal(dossier.openStageCount, 1);
  assert.equal(dossier.blockedStageCount, 0);
  assert.equal(dossier.completeStageCount, 0);
  assert.equal(dossier.finalObjectiveProofCoveredCount, 0);
  assert.equal(dossier.finalObjectiveProofPendingCount, 3);
  assert.equal(dossier.finalObjectiveProofLedgerStatus, "blocked-final-objective-proof-request");
  assert.equal((dossier as { reviewSliceCount?: number }).reviewSliceCount, 20);
  assert.equal(
    (dossier as { reviewSliceIds?: string }).reviewSliceIds,
    "manim-review-slice-01,manim-review-slice-20"
  );
  assert.equal(
    (dossier as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    "manim-review-slice-01=mathSceneRuntimeState.ts;manim-review-slice-20=mathSceneV2FinalCompletionDossier.ts"
  );
  assert.equal(
    (dossier as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    "A11=a11-browser-visual-interaction-regression;A18=a18-a06-teaching-quality-confirmation;A22=a22-clean-release-gate"
  );
  assert.match(dossier.summary, /reviewSlices=20 review slices; consumers=A11\+A18\+A22/);
  assert.equal(dossier.missingOwnerEvidenceSummary, "A11=6;A22=6;A18+A06=10");
  assert.equal(
    (dossier as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    "fixture-owner-acceptance-criteria"
  );
  assert.equal(
    (dossier as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    "fixture-owner-evidence-requirements"
  );
  assert.equal(
    (dossier as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    5
  );
  assert.equal(
    (dossier as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    [
      "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
      "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
      "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
      "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore",
      "data-viz-manim-run-from-beat-checkpoint-restore-action"
    ].join(",")
  );
  assert.equal(dossier.canMarkThreadGoalComplete, false);
  assert.equal(dossier.stageRows[0]?.stageId, "command-transcripts");
  assert.equal(dossier.stageRows[0]?.status, "pending");
  assert.equal(dossier.stageRows.find((row) => row.stageId === "final-objective-proof-ledger")?.status, "pending");
  assert.deepEqual(dossier.remainingOwnerAgentIds, ["A11", "A18", "A22"]);
});

test("MAIS Manim v2 final completion dossier carries source-architecture blocker reasons", () => {
  const blockerReasons: MathSceneV2FinalObjectiveVerifiedClosurePipeline["sourceArchitectureBlockerReasons"] = [
    "reviewSliceStatus",
    "missingReviewSliceFiles"
  ];
  const dossier = buildMathSceneV2FinalCompletionDossier(
    pipelineFixture({
      sourceArchitectureBlockerReasonManifest: blockerReasons.join(","),
      sourceArchitectureBlockerReasons: blockerReasons
    })
  );
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.deepEqual(
    (dossier as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    blockerReasons
  );
  assert.equal(
    (dossier as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    "reviewSliceStatus,missingReviewSliceFiles"
  );
  assert.match(dossier.summary, /sourceBlockers=reviewSliceStatus,missingReviewSliceFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-source-architecture-blocker-reasons"],
    "reviewSliceStatus,missingReviewSliceFiles"
  );
});

test("MAIS Manim v2 final completion dossier carries source-architecture handoff constraints from verified closure", () => {
  const sourceArchitectureSummary =
    "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false:futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice";
  const dossier = buildMathSceneV2FinalCompletionDossier(
    submissionBridgeVerifiedClosurePipelineFixture({
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
      sourceArchitectureOpenOwnerGateIds: ["A11", "A18", "A22"],
      sourceArchitectureRequiredOwnerGateIds: ["A11", "A18", "A22"],
      sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
      sourceArchitectureSummary
    })
  );
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.equal(
    (dossier as { sourceArchitectureHandoffStatus?: string }).sourceArchitectureHandoffStatus,
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    (dossier as { sourceArchitectureBulkCourseGenerationAllowed?: boolean }).sourceArchitectureBulkCourseGenerationAllowed,
    false
  );
  assert.equal(
    (dossier as { sourceArchitectureFutureInvocationScope?: string }).sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.deepEqual(
    (dossier as { sourceArchitectureOpenOwnerGateIds?: string[] }).sourceArchitectureOpenOwnerGateIds,
    ["A11", "A18", "A22"]
  );
  assert.deepEqual(
    (dossier as { sourceArchitectureRequiredOwnerGateIds?: string[] }).sourceArchitectureRequiredOwnerGateIds,
    ["A11", "A18", "A22"]
  );
  assert.equal(
    (dossier as { sourceArchitectureSourceContract?: string }).sourceArchitectureSourceContract,
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-source-architecture-open-owner-gates"],
    "A11,A18,A22"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-source-architecture-required-owner-gates"],
    "A11,A18,A22"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-source-architecture-source-contract"],
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-source-architecture-summary"],
    sourceArchitectureSummary
  );
  assert.match(dossier.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
  assert.match(dossier.summary, /sourceArchitectureScope=one-topic-one-concept-cluster-or-one-review-slice/);
});

test("MAIS Manim v2 final completion dossier carries A06 source confirmations from final closure", () => {
  const mismatchReasons = [
    "a06-confirmation-count=55/60",
    "missing-source-decision-keys=function-graph-core::interaction-timing"
  ];
  const dossier = buildMathSceneV2FinalCompletionDossier({
    ...pipelineFixture(),
    a06SourceBlockedConfirmationCount: 0,
    a06SourceConfirmedDecisionCount: 55,
    a06SourceConfirmationMismatchReasons: mismatchReasons,
    a06SourceConfirmationStatus: "a06-source-confirmed-a18-pending",
    a06SourceConfirmationSummary,
    a06SourcePendingA18DecisionCount: 60
  });
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.equal(
    (dossier as { a06SourceConfirmationStatus?: string }).a06SourceConfirmationStatus,
    "a06-source-confirmed-a18-pending"
  );
  assert.equal((dossier as { a06SourceConfirmedDecisionCount?: number }).a06SourceConfirmedDecisionCount, 55);
  assert.equal((dossier as { a06SourceBlockedConfirmationCount?: number }).a06SourceBlockedConfirmationCount, 0);
  assert.deepEqual(
    (dossier as { a06SourceConfirmationMismatchReasons?: string[] }).a06SourceConfirmationMismatchReasons,
    mismatchReasons
  );
  assert.equal((dossier as { a06SourcePendingA18DecisionCount?: number }).a06SourcePendingA18DecisionCount, 60);
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a06-source-confirmation-status"],
    "a06-source-confirmed-a18-pending"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a06-source-confirmed-count"],
    "55"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a06-source-blocked-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a06-source-mismatch-reasons"],
    mismatchReasons.join("|")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a06-source-pending-a18-count"],
    "60"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a06-source-confirmation-summary"],
    a06SourceConfirmationSummary
  );
  assert.match(dossier.summary, /a06Source=a06-source-confirmed-a18-pending/);
  assert.match(dossier.summary, /a06SourceConfirmed=55/);
  assert.match(dossier.summary, /a06SourceMismatch=a06-confirmation-count=55\/60\|missing-source-decision-keys=function-graph-core::interaction-timing/);
  assert.match(dossier.summary, /a06SourcePendingA18=60/);
  assert.equal(dossier.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final completion dossier blocks stale final objective A11 root attributes before owner handoff", () => {
  const dossier = buildMathSceneV2FinalCompletionDossier({
    ownerGateHandoffBundle: ownerGateHandoffBundleFixture(),
    pipeline: pipelineFixture({
      a11RequiredRootDataAttributeCount: 0,
      a11RunFromBeatCheckpointInvalidationDataAttributeManifest: "none"
    })
  });
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.equal(dossier.status, "blocked-final-objective-a11-root-attribute-mismatch");
  assert.deepEqual(
    (dossier as { a11RootAttributeMismatchReasons?: string[] }).a11RootAttributeMismatchReasons,
    [
      "a11RequiredRootDataAttributeCount",
      "a11RunFromBeatCheckpointInvalidationDataAttributeManifest"
    ]
  );
  assert.equal(dossier.openStageCount, 0);
  assert.equal(dossier.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a11-root-attribute-mismatch-reasons"],
    "a11RequiredRootDataAttributeCount,a11RunFromBeatCheckpointInvalidationDataAttributeManifest"
  );
  assert.match(
    dossier.summary,
    /a11RootAttributeMismatches=a11RequiredRootDataAttributeCount,a11RunFromBeatCheckpointInvalidationDataAttributeManifest/
  );
});

test("MAIS Manim v2 final completion dossier preserves early no-inference A11 root attributes before owner handoff", () => {
  const dossier = buildMathSceneV2FinalCompletionDossier(
    pipelineFixture({
      a11RequiredRootDataAttributeCount: 0,
      a11RunFromBeatCheckpointInvalidationDataAttributeManifest: "none"
    })
  );
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.equal(dossier.status, "pending-command-transcripts");
  assert.equal(dossier.openStageCount, 1);
  assert.deepEqual(
    (dossier as { a11RootAttributeMismatchReasons?: string[] }).a11RootAttributeMismatchReasons,
    [
      "a11RequiredRootDataAttributeCount",
      "a11RunFromBeatCheckpointInvalidationDataAttributeManifest"
    ]
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a11-root-attribute-mismatch-reasons"],
    "a11RequiredRootDataAttributeCount,a11RunFromBeatCheckpointInvalidationDataAttributeManifest"
  );
  assert.match(
    dossier.summary,
    /a11RootAttributeMismatches=a11RequiredRootDataAttributeCount,a11RunFromBeatCheckpointInvalidationDataAttributeManifest/
  );
});

test("MAIS Manim v2 final completion dossier marks final record intake pending or blocked", () => {
  const pendingFinalRecord = buildMathSceneV2FinalCompletionDossier(
    pipelineFixture({
      acceptedTranscriptCount: 23,
      commandEvidenceRecordCount: 23,
      commandEvidenceStatus: "owner-command-evidence-covered",
      finalClosureStatus: "ready-for-final-objective-audit",
      finalObjectiveAuditRecordIntakeStatus: "pending-final-objective-audit-record",
      finalObjectiveProofCoveredCount: 0,
      finalObjectiveProofLedgerStatus: "pending-final-objective-proof-record",
      finalObjectiveProofPendingCount: 3,
      finalObjectiveProofRemainingOwnerAgentIds: ["A11", "A18", "A22"],
      finalObjectiveSourceProofReadyCount: 1,
      finalObjectiveAuditRequestStatus: "pending-final-objective-audit-record",
      missingFinalAuditRecordCount: 1,
      missingTranscriptCount: 0,
      readyForFinalObjectiveAuditRecord: true,
      status: "pending-final-objective-audit-record",
      transcriptStatus: "command-transcripts-covered",
      verifiedClosureStatus: "ready-for-final-objective-audit"
    })
  );
  const blockedFinalRecord = buildMathSceneV2FinalCompletionDossier(
    pipelineFixture({
      acceptedTranscriptCount: 23,
      commandEvidenceRecordCount: 23,
      commandEvidenceStatus: "owner-command-evidence-covered",
      finalClosureStatus: "ready-for-final-objective-audit",
      finalObjectiveAuditRecordIntakeStatus: "blocked-invalid-final-objective-audit-record",
      finalObjectiveProofLedgerStatus: "blocked-invalid-final-objective-proof-record",
      finalObjectiveAuditRequestStatus: "pending-final-objective-audit-record",
      invalidFinalAuditRecordCount: 1,
      missingTranscriptCount: 0,
      readyForFinalObjectiveAuditRecord: true,
      status: "blocked-invalid-final-objective-audit-record",
      transcriptStatus: "command-transcripts-covered",
      verifiedClosureStatus: "ready-for-final-objective-audit"
    })
  );

  assert.equal(pendingFinalRecord.status, "pending-final-objective-audit-record");
  assert.equal(pendingFinalRecord.openStageCount, 1);
  assert.equal(pendingFinalRecord.stageRows.find((row) => row.stageId === "final-objective-audit-record")?.status, "pending");

  assert.equal(blockedFinalRecord.status, "blocked-final-objective-audit-record");
  assert.equal(blockedFinalRecord.blockedStageCount, 2);
  assert.equal(blockedFinalRecord.stageRows.find((row) => row.stageId === "final-objective-audit-record")?.status, "blocked");
  assert.equal(blockedFinalRecord.stageRows.find((row) => row.stageId === "final-objective-proof-ledger")?.status, "blocked");
});

test("MAIS Manim v2 final completion dossier blocks stale review-slice provenance at verified closure", () => {
  const expectedMismatchReasons = [
    "reviewSliceConsumerGateEvidenceIdManifest",
    "reviewSliceCount",
    "reviewSliceFileManifest",
    "reviewSliceIds",
    "reviewSliceSummary"
  ] satisfies MathSceneV2FinalClosureAuditReviewSliceMismatchReason[];
  const dossier = buildMathSceneV2FinalCompletionDossier(
    pipelineFixture({
      acceptedFinalAuditEvidenceId: "accepted-final-objective-audit",
      acceptedFinalAuditRecordCount: 1,
      acceptedTranscriptCount: 23,
      canMarkThreadGoalComplete: false,
      commandEvidenceRecordCount: 23,
      commandEvidenceStatus: "owner-command-evidence-covered",
      finalClosureStatus: "blocked-review-slice-provenance-mismatch",
      finalObjectiveAuditRecordIntakeStatus: "final-objective-audit-record-accepted",
      finalObjectiveProofCoveredCount: 4,
      finalObjectiveProofLedgerStatus: "final-objective-proofs-covered",
      finalObjectiveProofPendingCount: 0,
      finalObjectiveProofRemainingOwnerAgentIds: [],
      finalObjectiveSourceProofReadyCount: 0,
      finalObjectiveAuditRequestStatus: "pending-final-objective-audit-record",
      missingFinalAuditRecordCount: 0,
      missingOwnerEvidenceSummary: "none",
      missingTranscriptCount: 0,
      provenRequirementCount: 4,
      readyForFinalClosureAudit: false,
      readyForFinalObjectiveAuditRecord: true,
      remainingOwnerAgentIds: [],
      reviewSliceMismatchReasons: expectedMismatchReasons,
      status: "blocked-review-slice-provenance-mismatch",
      transcriptStatus: "command-transcripts-covered",
      verifiedClosureStatus: "blocked-review-slice-provenance-mismatch"
    })
  );
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.equal(dossier.status, "blocked-final-objective-review-slice-provenance-mismatch");
  assert.deepEqual(dossier.reviewSliceMismatchReasons, expectedMismatchReasons);
  assert.equal(dossier.blockedStageCount, 1);
  assert.equal(dossier.openStageCount, 0);
  assert.equal(dossier.canMarkThreadGoalComplete, false);
  assert.equal(
    dossier.stageRows.find((row) => row.stageId === "verified-closure")?.status,
    "blocked"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-review-slice-mismatch-reasons"],
    expectedMismatchReasons.join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-status"],
    "blocked-final-objective-review-slice-provenance-mismatch"
  );
  assert.match(
    dossier.summary,
    /reviewSliceMismatches=reviewSliceConsumerGateEvidenceIdManifest,reviewSliceCount,reviewSliceFileManifest,reviewSliceIds,reviewSliceSummary/
  );
});

test("MAIS Manim v2 final completion dossier blocks duplicate final proof IDs", () => {
  const dossier = buildMathSceneV2FinalCompletionDossier(
    pipelineFixture({
      acceptedFinalAuditEvidenceId: "accepted-final-objective-audit",
      acceptedFinalAuditRecordCount: 1,
      acceptedTranscriptCount: 23,
      canMarkThreadGoalComplete: false,
      commandEvidenceRecordCount: 23,
      commandEvidenceStatus: "owner-command-evidence-covered",
      finalClosureStatus: "complete",
      finalObjectiveAuditRecordIntakeStatus: "final-objective-audit-record-accepted",
      finalObjectiveProofCoveredCount: 0,
      finalObjectiveProofLedgerStatus: "blocked-duplicate-final-objective-proof-ids",
      finalObjectiveProofPendingCount: 3,
      finalObjectiveProofRemainingOwnerAgentIds: ["A11", "A18", "A22"],
      finalObjectiveSourceProofReadyCount: 1,
      finalObjectiveAuditRequestStatus: "pending-final-objective-audit-record",
      missingFinalAuditRecordCount: 0,
      missingOwnerEvidenceSummary: "none",
      missingTranscriptCount: 0,
      provenRequirementCount: 4,
      readyForFinalClosureAudit: false,
      readyForFinalObjectiveAuditRecord: true,
      remainingOwnerAgentIds: ["A11", "A18", "A22"],
      status: "complete",
      transcriptStatus: "command-transcripts-covered",
      verifiedClosureStatus: "complete"
    })
  );
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.equal(dossier.status, "blocked-final-objective-proof-ledger");
  assert.equal(dossier.blockedStageCount, 1);
  assert.equal(dossier.completeStageCount, 5);
  assert.equal(dossier.openStageCount, 0);
  assert.equal(dossier.canMarkThreadGoalComplete, false);
  assert.equal(
    dossier.stageRows.find((row) => row.stageId === "final-objective-proof-ledger")?.status,
    "blocked"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-status"],
    "blocked-final-objective-proof-ledger"
  );
});

test("MAIS Manim v2 final completion dossier exposes a complete synthetic path without hiding remaining real gates", () => {
  const dossier = buildMathSceneV2FinalCompletionDossier(
    pipelineFixture({
      acceptedFinalAuditEvidenceId: "accepted-final-objective-audit",
      acceptedFinalAuditRecordCount: 1,
      acceptedTranscriptCount: 23,
      canMarkThreadGoalComplete: true,
      commandEvidenceRecordCount: 23,
      commandEvidenceStatus: "owner-command-evidence-covered",
      finalClosureStatus: "complete",
      finalObjectiveAuditRecordIntakeStatus: "final-objective-audit-record-accepted",
      finalObjectiveProofCoveredCount: 4,
      finalObjectiveProofLedgerStatus: "final-objective-proofs-covered",
      finalObjectiveProofPendingCount: 0,
      finalObjectiveProofRemainingOwnerAgentIds: [],
      finalObjectiveSourceProofReadyCount: 0,
      finalObjectiveAuditRequestStatus: "pending-final-objective-audit-record",
      missingFinalAuditRecordCount: 0,
      missingOwnerEvidenceSummary: "none",
      missingTranscriptCount: 0,
      provenRequirementCount: 4,
      readyForFinalClosureAudit: true,
      readyForFinalObjectiveAuditRecord: true,
      remainingOwnerAgentIds: [],
      status: "complete",
      transcriptStatus: "command-transcripts-covered",
      verifiedClosureStatus: "complete"
    })
  );

  assert.equal(dossier.status, "complete");
  assert.equal(dossier.completeStageCount, 6);
  assert.equal(dossier.openStageCount, 0);
  assert.equal(dossier.blockedStageCount, 0);
  assert.equal(dossier.finalObjectiveProofCoveredCount, 4);
  assert.equal(dossier.finalObjectiveProofPendingCount, 0);
  assert.equal(dossier.stageRows.find((row) => row.stageId === "final-objective-proof-ledger")?.status, "complete");
  assert.equal(dossier.acceptedFinalAuditEvidenceId, "accepted-final-objective-audit");
  assert.equal(dossier.missingOwnerEvidenceSummary, "none");
  assert.equal(dossier.canMarkThreadGoalComplete, true);
});

test("MAIS Manim v2 final completion dossier blocks complete claims while current owner-gate blockers remain open", () => {
  const dossier = buildMathSceneV2FinalCompletionDossier(
    pipelineFixture({
      acceptedFinalAuditEvidenceId: "accepted-final-objective-audit",
      acceptedFinalAuditRecordCount: 1,
      acceptedTranscriptCount: 23,
      canMarkThreadGoalComplete: true,
      commandEvidenceRecordCount: 23,
      commandEvidenceStatus: "owner-command-evidence-covered",
      currentBlockerManifest: "A11:open-owner-action:projection-views-expected-list",
      currentBlockerMissingReportArtifactCount: 0,
      currentBlockerOpenA11ActionIds: ["projection-views-expected-list"],
      currentBlockerOpenOwnerActionCount: 1,
      currentBlockerReadyForFinalObjectiveAuditInput: false,
      currentBlockerRemainingOwnerAgentIds: ["A11"],
      currentBlockerSnapshotStatus: "blocked-open-owner-actions",
      currentBlockerSummary:
        "mathSceneV2OwnerGateCurrentBlockerSnapshot:status=blocked-open-owner-actions:missingReports=0:openOwnerActions=1:openA11Actions=projection-views-expected-list:readyForFinalObjectiveAuditInput=false",
      finalClosureStatus: "complete",
      finalObjectiveAuditRecordIntakeStatus: "final-objective-audit-record-accepted",
      finalObjectiveProofCoveredCount: 4,
      finalObjectiveProofLedgerStatus: "final-objective-proofs-covered",
      finalObjectiveProofPendingCount: 0,
      finalObjectiveProofRemainingOwnerAgentIds: [],
      finalObjectiveSourceProofReadyCount: 0,
      finalObjectiveAuditRequestStatus: "pending-final-objective-audit-record",
      missingFinalAuditRecordCount: 0,
      missingOwnerEvidenceSummary: "none",
      missingTranscriptCount: 0,
      provenRequirementCount: 4,
      readyForFinalClosureAudit: true,
      readyForFinalObjectiveAuditRecord: true,
      remainingOwnerAgentIds: [],
      status: "complete",
      transcriptStatus: "command-transcripts-covered",
      verifiedClosureStatus: "complete"
    })
  );
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.equal(dossier.status, "blocked-current-owner-gate-blockers");
  assert.equal(dossier.canMarkThreadGoalComplete, false);
  assert.equal(dossier.currentBlockerSnapshotStatus, "blocked-open-owner-actions");
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-status"],
    "blocked-current-owner-gate-blockers"
  );
  assert.equal(attributes["data-viz-manim-v2-final-completion-dossier-can-complete"], "false");
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-current-blocker-ready-for-final-audit-input"],
    "false"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-completion-dossier-summary"],
    /currentBlockers=blocked-open-owner-actions/
  );
});

test("MAIS Manim v2 final completion dossier can surface the owner gate handoff bundle as an owner-facing stage", () => {
  const dossier = buildMathSceneV2FinalCompletionDossier({
    ownerGateHandoffBundle: ownerGateHandoffBundleFixture(),
    pipeline: pipelineFixture()
  });
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);
  const ownerHandoffStage = dossier.stageRows.find((row) => row.stageId === "owner-gate-handoff-bundle");

  assert.ok(ownerHandoffStage);
  assert.equal(dossier.stageCount, 7);
  assert.equal(dossier.ownerGateHandoffBundleStatus, "pending-owner-evidence-bundle");
  assert.equal(dossier.ownerGateHandoffOwnerRowCount, 3);
  assert.equal(
    dossier.ownerGateHandoffTranscriptTemplateManifest,
    "A11=pending-A11-a11-values-rerun-transcript;A18=pending-A18-a18-function-graph-route-review-transcript;A22=pending-A22-a22-release-preflight-rerun-transcript"
  );
  assert.equal(
    dossier.ownerGateHandoffProofSourceStatusManifest,
    "A11=a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence:sourceStatus=owner-action-required;A18=a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions:sourceStatus=owner-action-required;A22=a22-clean-release-gate:final-owner-proof:owner-gate-blocked:sourceStatus=blocked-owner-action"
  );
  assert.equal(
    (dossier as { ownerGateHandoffA06SourceStatusManifest?: string }).ownerGateHandoffA06SourceStatusManifest,
    "A11=not-applicable;A18=a06-source-confirmed-a18-pending;A22=not-applicable"
  );
  assert.equal(
    dossier.ownerGateHandoffProofActionManifest,
    "A11=a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence:actions=Submit accepted browser regression evidence.;A18=a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions:actions=Submit accepted A18 final criterion decisions.;A22=a22-clean-release-gate:final-owner-proof:owner-gate-blocked:actions=Submit accepted clean release gate evidence."
  );
  assert.equal(
    dossier.ownerGateHandoffProofFinalAuditEvidenceManifest,
    "A11=a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence:finalAuditEvidence=pending;A18=a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions:finalAuditEvidence=pending;A22=a22-clean-release-gate:final-owner-proof:owner-gate-blocked:finalAuditEvidence=pending"
  );
  assert.equal(ownerHandoffStage.status, "pending");
  assert.deepEqual(ownerHandoffStage.ownerAgentIds, ["A11", "A18", "A22"]);
  assert.match(ownerHandoffStage.evidenceSummary, /owners=3/);
  assert.match(ownerHandoffStage.evidenceSummary, /commands=2/);
  assert.match(ownerHandoffStage.evidenceSummary, /routeReviews=1/);
  assert.match(ownerHandoffStage.evidenceSummary, /transcripts=3/);
  assert.match(ownerHandoffStage.evidenceSummary, /templates=3/);
  assert.match(ownerHandoffStage.evidenceSummary, /proofs=3/);
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-status"],
    "pending-owner-evidence-bundle"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-owner-count"],
    "3"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-transcript-template-manifest"],
    "A11=pending-A11-a11-values-rerun-transcript;A18=pending-A18-a18-function-graph-route-review-transcript;A22=pending-A22-a22-release-preflight-rerun-transcript"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-proof-source-status-manifest"],
    dossier.ownerGateHandoffProofSourceStatusManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-a06-source-status-manifest"],
    "A11=not-applicable;A18=a06-source-confirmed-a18-pending;A22=not-applicable"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-proof-action-manifest"],
    dossier.ownerGateHandoffProofActionManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-proof-final-audit-evidence-manifest"],
    dossier.ownerGateHandoffProofFinalAuditEvidenceManifest
  );
  assert.match(
    attributes["data-viz-manim-v2-final-completion-dossier-stage-ids"],
    /owner-gate-handoff-bundle/
  );
  assert.equal(dossier.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final completion dossier exposes owner gate rerun submission bridge provenance", () => {
  const acceptedSubmittedRecordManifest =
    "A11:a11-browser-visual-interaction-regression:submit-a11-browser-evidence:a11-browser-final:owners=A11|status=accepted";
  const dossier = buildMathSceneV2FinalCompletionDossier({
    ownerGateHandoffBundle: ownerGateHandoffBundleFixture({
      status: "owner-evidence-covered-bundle"
    }),
    pipeline: {
      ...pipelineFixture({
        acceptedFinalAuditEvidenceId: "accepted-final-objective-audit",
        acceptedFinalAuditRecordCount: 1,
        canMarkThreadGoalComplete: true,
        finalClosureStatus: "complete",
        finalObjectiveAuditRecordIntakeStatus: "final-objective-audit-record-accepted",
        finalObjectiveAuditRequestStatus: "pending-final-objective-audit-record",
        finalObjectiveProofCoveredCount: 4,
        finalObjectiveProofLedgerStatus: "final-objective-proofs-covered",
        finalObjectiveProofPendingCount: 0,
        finalObjectiveProofRemainingOwnerAgentIds: [],
        finalObjectiveSourceProofReadyCount: 0,
        missingOwnerEvidenceSummary: "none",
        provenRequirementCount: 4,
        readyForFinalClosureAudit: true,
        readyForFinalObjectiveAuditRecord: true,
        remainingOwnerAgentIds: [],
        status: "complete",
        verifiedClosureStatus: "complete"
      }),
      ownerGateRerunSource: "owner-gate-rerun-submission-bridge",
      ownerGateRerunSourceStatus: "owner-gate-rerun-submissions-covered",
      ownerGateRerunSubmissionBridgeStatus: "owner-gate-rerun-submissions-covered",
      acceptedSubmittedRecordManifest,
      invalidSubmittedRecordManifest: "none",
      missingTemplateManifest: "none"
    }
  });
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);
  const submissionBridgeStage = dossier.stageRows.find(
    (row) => String(row.stageId) === "owner-gate-rerun-submission-bridge"
  );

  assert.ok(submissionBridgeStage);
  assert.equal(submissionBridgeStage.status, "complete");
  assert.deepEqual(submissionBridgeStage.ownerAgentIds, ["A11", "A18", "A22"]);
  assert.match(submissionBridgeStage.evidenceSummary, /status=owner-gate-rerun-submissions-covered/);
  assert.match(submissionBridgeStage.evidenceSummary, /source=owner-gate-rerun-submission-bridge/);
  assert.match(
    submissionBridgeStage.evidenceSummary,
    /reviewSlices=20 review slices; consumers=A11\+A18\+A22/
  );
  assert.equal(dossier.ownerGateRerunAcceptedSubmittedRecordManifest, acceptedSubmittedRecordManifest);
  assert.equal(dossier.ownerGateRerunMissingTemplateManifest, "none");
  assert.equal(dossier.ownerGateRerunInvalidSubmittedRecordManifest, "none");
  assert.match(
    submissionBridgeStage.evidenceSummary,
    /acceptedSubmittedRows=A11:a11-browser-visual-interaction-regression:submit-a11-browser-evidence:a11-browser-final/
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-submission-bridge-status"],
    "owner-gate-rerun-submissions-covered"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-source"],
    "owner-gate-rerun-submission-bridge"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-accepted-submitted-record-manifest"],
    acceptedSubmittedRecordManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-missing-template-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-invalid-submitted-record-manifest"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-completion-dossier-stage-ids"],
    /owner-gate-rerun-submission-bridge/
  );
  assert.match(
    attributes["data-viz-manim-v2-final-completion-dossier-summary"],
    /ownerGateRerunSubmissions=owner-gate-rerun-submissions-covered/
  );
});

test("MAIS Manim v2 final completion dossier consumes submission-bridge verified closure without command transcript fields", () => {
  const dossier = buildMathSceneV2FinalCompletionDossier(
    submissionBridgeVerifiedClosurePipelineFixture()
  );
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.equal(dossier.status, "complete");
  assert.equal(dossier.completeStageCount, dossier.stageCount);
  assert.equal(dossier.blockedStageCount, 0);
  assert.equal(dossier.openStageCount, 0);
  assert.equal(dossier.canMarkThreadGoalComplete, true);
  assert.equal(dossier.missingOwnerEvidenceSummary, "none");
  assert.equal(
    dossier.stageRows.some((row) => row.stageId === "command-transcripts"),
    false
  );
  assert.equal(
    dossier.stageRows.some((row) => row.stageId === "command-evidence"),
    false
  );
  assert.equal(
    dossier.stageRows.find((row) => row.stageId === "owner-gate-rerun-submission-bridge")?.status,
    "complete"
  );
  assert.equal(
    dossier.ownerGateRerunAcceptedSubmittedRecordManifest,
    submissionBridgeVerifiedClosurePipelineFixture().acceptedSubmittedRecordManifest
  );
  assert.deepEqual(
    dossier.sourceArchitectureBlockerReasons,
    ["duplicateReviewSliceFiles", "unclassifiedManimFiles"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-stage-ids"],
    "owner-gate-rerun-submission-bridge,final-objective-audit-request,final-objective-audit-record,final-objective-proof-ledger,verified-closure"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-stage-status-manifest"],
    "owner-gate-rerun-submission-bridge=complete;final-objective-audit-request=complete;final-objective-audit-record=complete;final-objective-proof-ledger=complete;verified-closure=complete"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-source-architecture-blocker-reasons"],
    "duplicateReviewSliceFiles,unclassifiedManimFiles"
  );
});

test("MAIS Manim v2 final completion dossier carries submission-bridge verified-closure gate manifests", () => {
  const dossier = buildMathSceneV2FinalCompletionDossier(
    submissionBridgeVerifiedClosurePipelineFixture()
  );
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.deepEqual(
    (dossier as { finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames?: string[] })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames,
    [...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames]
  );
  assert.equal(
    (dossier as { finalObjectiveSubmissionBridgeVerifiedClosureGateIds?: string })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds
  );
  assert.equal(
    (dossier as { finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest?: string })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-completion-dossier-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-completion-dossier-final-objective-submission-bridge-verified-closure-gate-owner-manifest"
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-completion-dossier-final-objective-submission-bridge-verified-closure-status"
    ],
    "complete"
  );
  assert.match(dossier.summary, /submissionBridgeVerifiedClosure=complete/);
});

test("MAIS Manim v2 final completion dossier serializes stable review attributes", () => {
  const dossier = buildMathSceneV2FinalCompletionDossier(pipelineFixture());
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.equal(classifyManimReviewPackage("mathSceneV2FinalCompletionDossier.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-source-contract"],
    MATH_SCENE_V2_FINAL_COMPLETION_DOSSIER_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-final-completion-dossier-status"], "pending-command-transcripts");
  assert.equal(attributes["data-viz-manim-v2-final-completion-dossier-stages"], "0/6");
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-stage-ids"],
    dossier.stageRows.map((row) => row.stageId).join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-stage-owner-manifest"],
    dossier.stageRows.map((row) => `${row.stageId}=${row.ownerAgentIds.join("+")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-stage-status-manifest"],
    dossier.stageRows.map((row) => `${row.stageId}=${row.status}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-proof-ledger-status"],
    "blocked-final-objective-proof-request"
  );
  assert.equal(attributes["data-viz-manim-v2-final-completion-dossier-proofs"], "0/4");
  assert.equal(attributes["data-viz-manim-v2-final-completion-dossier-proof-source-ready"], "1");
  assert.equal(attributes["data-viz-manim-v2-final-completion-dossier-proof-pending"], "3");
  assert.equal(attributes["data-viz-manim-v2-final-completion-dossier-review-slice-count"], "20");
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-review-slice-ids"],
    "manim-review-slice-01,manim-review-slice-20"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-review-slice-file-manifest"],
    "manim-review-slice-01=mathSceneRuntimeState.ts;manim-review-slice-20=mathSceneV2FinalCompletionDossier.ts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-review-slice-consumer-gate-evidence-id-manifest"],
    "A11=a11-browser-visual-interaction-regression;A18=a18-a06-teaching-quality-confirmation;A22=a22-clean-release-gate"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-review-slices"],
    "20 review slices; consumers=A11+A18+A22"
  );
  assert.equal(attributes["data-viz-manim-v2-final-completion-dossier-open"], "1");
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-missing-owner-evidence"],
    "A11=6;A22=6;A18+A06=10"
  );
  assert.equal(dossier.ownerActionEvidenceCountManifest, "fixture-owner-action-evidence-counts");
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-action-evidence-count-manifest"],
    "fixture-owner-action-evidence-counts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-acceptance-criteria-manifest"],
    "fixture-owner-acceptance-criteria"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-owner-evidence-requirement-manifest"],
    "fixture-owner-evidence-requirements"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a11-required-root-attribute-count"],
    "5"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a11-run-from-beat-checkpoint-invalidation-attributes"],
    [
      "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
      "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
      "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
      "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore",
      "data-viz-manim-run-from-beat-checkpoint-restore-action"
    ].join(",")
  );
  assert.deepEqual(
    (dossier as { a11RootAttributeMismatchReasons?: string[] }).a11RootAttributeMismatchReasons,
    []
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-a11-root-attribute-mismatch-reasons"],
    "none"
  );
  assert.equal(attributes["data-viz-manim-v2-final-completion-dossier-can-complete"], "false");
  assert.match(
    attributes["data-viz-manim-v2-final-completion-dossier-summary"],
    /missingOwnerEvidence=A11=6;A22=6;A18\+A06=10/
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-completion-dossier-summary"].includes(
      "ownerAcceptanceCriteria=fixture-owner-acceptance-criteria"
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-completion-dossier-summary"].includes(
      "ownerEvidenceRequirements=fixture-owner-evidence-requirements"
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-completion-dossier-summary"].includes(
      "a11RootAttributes=5"
    )
  );
});

test("MAIS Manim v2 final completion dossier preserves current owner-gate blocker provenance", () => {
  const currentBlockerSummary =
    "mathSceneV2OwnerGateCurrentBlockerSnapshot:status=blocked-missing-owner-report-artifacts:missingReports=3:openOwnerActions=1:openA11Actions=projection-views-expected-list:readyForFinalObjectiveAuditInput=false";
  const dossier = buildMathSceneV2FinalCompletionDossier(
    pipelineFixture({
      currentBlockerManifest:
        "A11:missing-owner-report-artifact:submit-owner-report-artifact;A11:open-owner-action:projection-views-expected-list",
      currentBlockerMissingReportArtifactCount: 3,
      currentBlockerOpenA11ActionIds: ["projection-views-expected-list"],
      currentBlockerOpenOwnerActionCount: 1,
      currentBlockerReadyForFinalObjectiveAuditInput: false,
      currentBlockerRemainingOwnerAgentIds: ["A11", "A18", "A22"],
      currentBlockerSnapshotStatus: "blocked-missing-owner-report-artifacts",
      currentBlockerSummary
    })
  );
  const attributes = mathSceneV2FinalCompletionDossierDataAttributes(dossier);

  assert.equal(
    (dossier as { currentBlockerSnapshotStatus?: string }).currentBlockerSnapshotStatus,
    "blocked-missing-owner-report-artifacts"
  );
  assert.deepEqual(
    (dossier as { currentBlockerOpenA11ActionIds?: string[] }).currentBlockerOpenA11ActionIds,
    ["projection-views-expected-list"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-current-blocker-status"],
    "blocked-missing-owner-report-artifacts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-current-blocker-open-a11-actions"],
    "projection-views-expected-list"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-current-blocker-remaining-owners"],
    "A11,A18,A22"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-completion-dossier-current-blocker-summary"],
    currentBlockerSummary
  );
  assert.match(
    attributes["data-viz-manim-v2-final-completion-dossier-summary"],
    /currentBlockers=blocked-missing-owner-report-artifacts/
  );
});
