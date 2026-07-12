import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildVisualizationBrowserRegressionEvidenceMatrix } from "../../visualizationBrowserRegressionEvidence";
import { buildVisualizationBrowserRegressionPlan } from "../../visualizationBrowserRegressionPackages";
import { buildVisualizationReleaseReadinessEvidence } from "../../visualizationReleaseReadinessEvidence";
import { buildManimReviewPackageHandoffMatrix } from "./mathSceneReviewPackageHandoff";
import { buildManimReviewPackageMatrix, classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { buildManimReviewPackageSliceMatrix } from "./mathSceneReviewPackageSlices";
import type { MathSceneV2FinalClosureAuditRecord } from "./mathSceneV2FinalClosureAudit";
import type { MathSceneV2ObjectiveCompletionAudit } from "./mathSceneV2ObjectiveCompletionAudit";
import { buildMathSceneTeachingFinalDecisionIntake } from "./mathSceneTeachingFinalDecisionIntake";
import { buildMathSceneTeachingFinalDecisionLedger } from "./mathSceneTeachingFinalDecisionLedger";
import { buildMathSceneTeachingFinalReviewPacket } from "./mathSceneTeachingFinalReviewPacket";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";
import { buildMathSceneTeachingRenderedReviewRoutes } from "./mathSceneTeachingRenderedReviewRoutes";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";
import { buildMathSceneTeachingSignoffMatrix } from "./mathSceneTeachingSignoffMatrix";
import {
  browserRegressionLabs,
  renderedReviewLabs
} from "./mathSceneV2CatalogDecoupledFixtures";
import { buildMathSceneV2ClosureEvidencePackage } from "./mathSceneV2ClosureEvidencePackage";
import { buildMathSceneV2CompletionAcceptanceChecklist } from "./mathSceneV2CompletionAcceptanceChecklist";
import { buildMathSceneV2CompletionClosureQueue } from "./mathSceneV2CompletionClosureQueue";
import { buildMathSceneV2CompletionEvidenceIntake } from "./mathSceneV2CompletionEvidenceIntake";
import {
  buildMathSceneV2CompletionRerunPlan,
  MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT,
  type MathSceneV2CompletionRerunPlan
} from "./mathSceneV2CompletionRerunPlan";
import { buildMathSceneV2CompletionStatusSummary } from "./mathSceneV2CompletionStatusSummary";
import { buildMathSceneV2CrossAgentHandoff } from "./mathSceneV2CrossAgentHandoff";
import { buildMathSceneV2GoalGate } from "./mathSceneV2GoalGate";
import { buildMathSceneV2ObjectiveCompletionAudit } from "./mathSceneV2ObjectiveCompletionAudit";
import {
  buildMathSceneV2OwnerGateRerunCommandPacket,
  type MathSceneV2OwnerGateRerunCommandPacket
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import type { MathSceneV2OwnerGateCurrentBlockerSnapshot } from "./mathSceneV2OwnerGateCurrentBlockerSnapshot";
import type { MathSceneV2OwnerGateRerunCommandTranscriptRecord } from "./mathSceneV2OwnerGateRerunCommandTranscriptIntake";
import { buildMathSceneV2OwnerEvidenceRequestPacket } from "./mathSceneV2OwnerEvidenceRequestPacket";
import { buildMathSceneV2ReleaseSliceManifest } from "./mathSceneV2ReleaseSliceManifest";
import {
  buildMathSceneV2FinalObjectiveVerifiedClosurePipeline,
  buildMathSceneV2FinalObjectiveVerifiedClosurePipelineFromOwnerGateRerunSubmissionBridge,
  mathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipelineDataAttributes,
  mathSceneV2FinalObjectiveVerifiedClosurePipelineDataAttributes,
  MATH_SCENE_V2_FINAL_OBJECTIVE_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT
} from "./mathSceneV2FinalObjectiveVerifiedClosurePipeline";
import {
  buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge,
  buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge
} from "./mathSceneV2OwnerEvidenceSubmissionIntake";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";

const manimDir = "components/visualizations/three/manim";
const requirementProofEvidenceIds = [
  "a06-review-package-split:current-source:current-evidence-proves-requirement",
  "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence",
  "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions",
  "a22-clean-release-gate:final-owner-proof:owner-gate-blocked"
] as const;
const finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames = [
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
] as const;
const finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest =
  "a06-review-package-split=covered;a11-browser-visual-interaction-regression=pending-owner-evidence;a18-a06-teaching-quality-confirmation=pending-owner-evidence;a22-clean-release-gate=pending-owner-evidence";
const finalObjectiveSubmissionBridgeVerifiedClosureGateIds =
  "a06-review-package-split,a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate";
const finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest =
  "a06-review-package-split=A06;a11-browser-visual-interaction-regression=A11+A06;a18-a06-teaching-quality-confirmation=A18+A06;a22-clean-release-gate=A22";
const finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest =
  "a06-review-package-split=accepted-source-evidence;a11-browser-visual-interaction-regression=missing-owner-evidence;a18-a06-teaching-quality-confirmation=pending-a18-final-decisions;a22-clean-release-gate=blocked-owner-action";
const finalObjectiveSubmissionBridgeVerifiedClosureStatus = "complete";
const currentBlockerOpenA11ActionId =
  "a11-browser-visual-interaction-regression:update-projection-views-expected-list";
const currentBlockerManifest =
  "A11:missing-owner-report-artifact:submit-owner-report-artifact;A18:missing-owner-report-artifact:submit-owner-report-artifact;A22:missing-owner-report-artifact:submit-owner-report-artifact;A11:open-owner-action:update-projection-views-expected-list";

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function acceptedRecordsForEveryRequiredEvidence(
  checklist: ReturnType<typeof buildMathSceneV2CompletionAcceptanceChecklist>
) {
  return checklist.actions.flatMap((action) =>
    action.verificationEvidenceIds.map((evidenceId) => ({
      actionId: action.actionId,
      evidenceId,
      ownerAgentIds: action.ownerAgentIds,
      status: "accepted" as const
    }))
  );
}

function closureFixture() {
  const browserPlan = buildVisualizationBrowserRegressionPlan(browserRegressionLabs as never, { maxLabsPerPackage: 8 });
  const browserEvidence = buildVisualizationBrowserRegressionEvidenceMatrix(browserPlan);
  const teachingSignoff = buildMathSceneTeachingSignoffMatrix();
  const releaseReadiness = buildVisualizationReleaseReadinessEvidence({
    browserEvidence,
    teachingSignoff
  });
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const teachingDossier = buildMathSceneTeachingReviewDossier();
  const teachingRenderedRoutes = buildMathSceneTeachingRenderedReviewRoutes(
    buildMathSceneTeachingInspectionTargetQueue(),
    renderedReviewLabs
  );
  const teachingFinalDecisionLedger = buildMathSceneTeachingFinalDecisionLedger(
    buildMathSceneTeachingFinalReviewPacket({
      dossier: teachingDossier,
      renderedRoutes: teachingRenderedRoutes
    })
  );
  const goalGate = buildMathSceneV2GoalGate({
    browserEvidence,
    releaseReadiness,
    reviewPackages,
    reviewSlices,
    teachingDossier
  });
  const releaseSliceManifest = buildMathSceneV2ReleaseSliceManifest({
    releaseReadiness,
    reviewPackages
  });
  const crossAgentHandoff = buildMathSceneV2CrossAgentHandoff({
    browserEvidence,
    goalGate,
    releaseReadiness,
    releaseSliceManifest,
    reviewHandoff: buildManimReviewPackageHandoffMatrix(reviewPackages),
    reviewSlices,
    teachingDossier,
    teachingFinalDecisionLedger,
    teachingRenderedRoutes
  });
  const acceptanceChecklist = buildMathSceneV2CompletionAcceptanceChecklist(
    buildMathSceneV2CompletionClosureQueue(crossAgentHandoff)
  );
  const evidenceIntake = buildMathSceneV2CompletionEvidenceIntake(
    acceptanceChecklist,
    acceptedRecordsForEveryRequiredEvidence(acceptanceChecklist)
  );
  const completionStatus = buildMathSceneV2CompletionStatusSummary({
    acceptanceChecklist,
    evidenceIntake,
    goalGate,
    releaseSliceManifest,
    reviewPackages,
    reviewSlices
  });
  const objectiveAudit = buildMathSceneV2ObjectiveCompletionAudit({
    completionStatus,
    crossAgentHandoff,
    evidenceIntake,
    teachingFinalDecisionIntake: buildMathSceneTeachingFinalDecisionIntake(teachingFinalDecisionLedger, [])
  });
  const ownerEvidenceRequestPacket = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist,
    evidenceIntake,
    reviewSlices
  });
  const rerunPlan = buildMathSceneV2CompletionRerunPlan(
    buildMathSceneV2ClosureEvidencePackage({
      objectiveAudit,
      ownerEvidenceRequestPacket
    })
  );
  const commandPacket = buildMathSceneV2OwnerGateRerunCommandPacket({
    browserPlan,
    releaseRunId: "manim-v2-final-objective-verified-closure-test",
    rerunPlan,
    teachingRenderedRoutes
  });

  return {
    acceptanceChecklist,
    commandPacket,
    objectiveAudit,
    ownerEvidenceRequestPacket,
    reviewSlices,
    rerunPlan
  };
}

function passingTranscripts(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket
): MathSceneV2OwnerGateRerunCommandTranscriptRecord[] {
  return commandPacket.ownerPackets.flatMap((ownerPacket) =>
    ownerPacket.rows.map((row) =>
      row.kind === "teaching-route-review"
        ? {
            evidenceId: `transcript-${row.ownerAgentId}-${row.evidenceId}`,
            href: row.href,
            kind: row.kind,
            ownerAgentId: row.ownerAgentId,
            reviewDecision: "approved" as const,
            rowEvidenceId: row.evidenceId,
            sectionSelector: row.sectionSelector
          }
        : {
            command: row.command,
            evidenceId: `transcript-${row.ownerAgentId}-${row.evidenceId}`,
            exitCode: 0,
            kind: row.kind,
            ownerAgentId: row.ownerAgentId,
            reportPath: `reports/${row.ownerAgentId}/${row.evidenceId}.txt`,
            rowEvidenceId: row.evidenceId,
            runId: `run-${row.ownerAgentId}-${row.evidenceId}`
          }
    )
  );
}

function acceptedFinalAuditRecord(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket
): MathSceneV2FinalClosureAuditRecord {
  return {
    evidenceId: "accepted-final-objective-audit-4-of-4-after-record-intake",
    ownerGateRerunEvidenceIds: commandPacket.ownerPackets.map(
      (ownerPacket) => `accepted-${ownerPacket.ownerAgentId}-command-evidence-covered`
    ),
    provenRequirementCount: 4,
    requirementProofEvidenceIds: [...requirementProofEvidenceIds],
    requirementCount: 4,
    status: "accepted",
    target: "mathSceneV2ObjectiveCompletionAudit"
  };
}

function currentBlockerSnapshotFixture(): MathSceneV2OwnerGateCurrentBlockerSnapshot {
  return {
    blockerManifest: currentBlockerManifest,
    blockers: [
      {
        blockerId: "A11:a11-browser-visual-interaction-regression:missing-owner-report-artifact",
        blockerType: "missing-owner-report-artifact",
        canonicalReportPath: "coordination/reports/2026-07-03-A11-manim-v2-browser-visual-interaction-regression.md",
        evidenceIds: ["a11-browser-visual-interaction-regression:canonical-report-artifact"],
        gateId: "a11-browser-visual-interaction-regression",
        ownerAgentId: "A11",
        requiredActionId: "submit-owner-report-artifact",
        summary: "A11 missing canonical browser report"
      }
    ],
    canMarkThreadGoalComplete: false,
    checkedAtHkt: "2026-07-03 22:38 HKT",
    missingReportArtifactCount: 3,
    openA11ActionIds: [currentBlockerOpenA11ActionId],
    openOwnerActionCount: 1,
    openOwnerActionManifest: currentBlockerOpenA11ActionId,
    readyForFinalObjectiveAuditInput: false,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    resolvedA06FindingCount: 1,
    sourceContract:
      "MAIS Manim v2 owner gate current blocker snapshot: combines canonical owner report gaps, intake status, and current A06-observed browser follow-ups without accepting owner gates",
    status: "blocked-missing-owner-report-artifacts",
    summary:
      "mathSceneV2OwnerGateCurrentBlockerSnapshot:status=blocked-missing-owner-report-artifacts:missingReports=3:openOwnerActions=1"
  };
}

function duplicateProofObjectiveAudit(
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit
): MathSceneV2ObjectiveCompletionAudit {
  return {
    ...objectiveAudit,
    requirements: objectiveAudit.requirements.map((requirement) => requirement.id === "a22-clean-release-gate"
      ? {
          ...requirement,
          evidenceVerdict: "missing-owner-evidence",
          id: "a11-browser-visual-interaction-regression",
          ownerAgentIds: ["A22"],
          supportingAgentIds: ["A06", "A22"]
        }
      : requirement
    )
  };
}

function sourceBlockedObjectiveAudit(
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit
): MathSceneV2ObjectiveCompletionAudit {
  const blockerReasons: MathSceneV2ObjectiveCompletionAudit["sourceArchitectureBlockerReasons"] = [
    "reviewSliceStatus",
    "missingReviewSliceFiles"
  ];

  return {
    ...objectiveAudit,
    sourceArchitectureBlockerReasonManifest: blockerReasons.join(","),
    sourceArchitectureBlockerReasons: [...blockerReasons]
  };
}

function acceptedFinalAuditRecordWithDuplicateProofId(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket
): MathSceneV2FinalClosureAuditRecord {
  return {
    ...acceptedFinalAuditRecord(commandPacket),
    requirementProofEvidenceIds: [
      requirementProofEvidenceIds[0],
      requirementProofEvidenceIds[1],
      requirementProofEvidenceIds[1],
      requirementProofEvidenceIds[2]
    ]
  };
}

type ReviewSliceProvenance = Pick<
  MathSceneV2ObjectiveCompletionAudit,
  | "reviewSliceConsumerGateEvidenceIdManifest"
  | "reviewSliceCount"
  | "reviewSliceFileManifest"
  | "reviewSliceIds"
  | "reviewSliceSummary"
>;

function coveredOwnerEvidenceRerunPlanFixture(
  reviewSliceProvenance: ReviewSliceProvenance
): MathSceneV2CompletionRerunPlan {
  return {
    canMarkThreadGoalComplete: false,
    duplicateEvidenceIds: [],
    finalAuditStepCount: 1,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames: [
      ...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    invalidEvidenceRecordCount: 0,
    invalidOwnerAgentIds: [],
    missingEvidenceCount: 0,
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    reviewSliceConsumerGateEvidenceIdManifest: reviewSliceProvenance.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: reviewSliceProvenance.reviewSliceCount,
    reviewSliceFileManifest: reviewSliceProvenance.reviewSliceFileManifest,
    reviewSliceIds: reviewSliceProvenance.reviewSliceIds,
    reviewSliceSummary: reviewSliceProvenance.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    sourceArchitectureOpenOwnerGateIds: [],
    sourceArchitectureRequiredOwnerGateIds: [],
    sourceArchitectureSourceContract: "not-attached",
    sourceArchitectureSummary: "not-attached",
    ownerEvidenceStepCount: 0,
    ownerGateRerunStepCount: 3,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    sourceContract: MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT,
    status: "owner-gate-reruns-required",
    stepCount: 4,
    steps: [
      {
        actionRequestCount: 0,
        blockingItems: ["a11-broad-visualization-value-suite-red"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A11"],
        prerequisiteStepIds: [],
        requiredActions: [
          "adopt-hk-grade-split-packages",
          "keep-non-hk-tracks-out-of-hk-demo-sweep",
          "update-projection-views-expected-list"
        ],
        requirementIds: ["a11-browser-visual-interaction-regression"],
        rerunTarget: "a11-browser-visual-interaction-regression",
        status: "ready-for-owner-gate-rerun",
        stepId: "01-owner-gate-A11",
        stepIndex: 1,
        summary:
          "01-owner-gate-A11:owner=A11:target=a11-browser-visual-interaction-regression:status=ready-for-owner-gate-rerun",
        supportingAgentIds: ["A06", "A22"]
      },
      {
        actionRequestCount: 0,
        blockingItems: ["a18-final-teaching-signoff-open"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A18"],
        prerequisiteStepIds: [],
        requiredActions: [
          "complete-a18-final-criterion-decisions",
          "complete-a18-final-scene-signoff",
          "inspect-rendered-scene-targets",
          "open-rendered-review-routes",
          "record-approve-or-revision-decision"
        ],
        requirementIds: ["a18-a06-teaching-quality-confirmation"],
        rerunTarget: "a18-a06-teaching-quality-confirmation",
        status: "ready-for-owner-gate-rerun",
        stepId: "02-owner-gate-A18",
        stepIndex: 2,
        summary:
          "02-owner-gate-A18:owner=A18:target=a18-a06-teaching-quality-confirmation:status=ready-for-owner-gate-rerun",
        supportingAgentIds: ["A06"]
      },
      {
        actionRequestCount: 0,
        blockingItems: ["a22-dirty-root-release-blocked", "a22-release-preflight-disk-blocked"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A22"],
        prerequisiteStepIds: [],
        requiredActions: [
          "investigate-isolated-next-chunk-serving-after-broad-timeout",
          "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
          "run-a22-generated-artifact-cleanup-after-preserving-evidence"
        ],
        requirementIds: ["a22-clean-release-gate"],
        rerunTarget: "a22-clean-release-gate",
        status: "ready-for-owner-gate-rerun",
        stepId: "03-owner-gate-A22",
        stepIndex: 3,
        summary:
          "03-owner-gate-A22:owner=A22:target=a22-clean-release-gate:status=ready-for-owner-gate-rerun",
        supportingAgentIds: ["A06", "A11"]
      },
      {
        actionRequestCount: 0,
        blockingItems: [
          "a11-broad-visualization-value-suite-red",
          "a18-final-teaching-signoff-open",
          "a22-dirty-root-release-blocked",
          "a22-release-preflight-disk-blocked"
        ],
        kind: "final-objective-audit",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A11", "A18", "A22"],
        prerequisiteStepIds: [
          "01-owner-gate-A11",
          "02-owner-gate-A18",
          "03-owner-gate-A22"
        ],
        requiredActions: [
          "adopt-hk-grade-split-packages",
          "complete-a18-final-criterion-decisions",
          "release-from-clean-worktree-or-reviewed-pruned-staging-slice"
        ],
        requirementIds: [
          "a11-browser-visual-interaction-regression",
          "a18-a06-teaching-quality-confirmation",
          "a22-clean-release-gate"
        ],
        rerunTarget: "mathSceneV2ObjectiveCompletionAudit",
        status: "blocked-by-owner-gate-reruns",
        stepId: "04-final-objective-audit",
        stepIndex: 4,
        summary:
          "04-final-objective-audit:status=blocked-by-owner-gate-reruns:owners=A11,A18,A22:proven=1/4",
        supportingAgentIds: ["A06", "A11", "A22"]
      }
    ],
    summary:
      "mathSceneV2CompletionRerunPlan:status=owner-gate-reruns-required:steps=4:owners=A11,A18,A22:missingEvidence=0:invalidEvidence=0:duplicateEvidence=none"
  };
}

function ownerGateRerunSubmissionBridgeFixture({
  includeSubmittedOwnerGateReruns = true
}: {
  includeSubmittedOwnerGateReruns?: boolean;
} = {}) {
  const {
    acceptanceChecklist,
    objectiveAudit,
    reviewSlices
  } = closureFixture();
  const pendingOwnerEvidenceRequestPacket = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist,
    evidenceIntake: buildMathSceneV2CompletionEvidenceIntake(acceptanceChecklist, []),
    reviewSlices
  });
  const rerunPlan = coveredOwnerEvidenceRerunPlanFixture(objectiveAudit);
  const submittedOwnerEvidenceRecords = pendingOwnerEvidenceRequestPacket.submissionRecordTemplates.map((template) => ({
    ...template,
    status: "accepted" as const
  }));
  const submissionBridge = buildMathSceneV2OwnerEvidenceSubmissionCompletionBridge({
    acceptanceChecklist,
    ownerEvidenceRequestPacket: pendingOwnerEvidenceRequestPacket,
    submittedRecords: submittedOwnerEvidenceRecords
  });
  const submittedOwnerGateRerunRecords = includeSubmittedOwnerGateReruns
    ? submissionBridge.ownerGateRerunRecordTemplates
    : [];
  const ownerGateRerunSubmissionBridge =
    buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge({
      rerunPlan,
      submissionBridge,
      submittedOwnerGateRerunRecords
    });

  return {
    objectiveAudit,
    ownerGateRerunSubmissionBridge
  };
}

function acceptedFinalAuditRecordFromOwnerGateRerunSubmissionBridge(
  ownerGateRerunSubmissionBridge: ReturnType<
    typeof buildMathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge
  >
): MathSceneV2FinalClosureAuditRecord {
  return {
    evidenceId: "accepted-final-objective-audit-4-of-4-after-owner-gate-submissions",
    ownerGateRerunEvidenceIds: ownerGateRerunSubmissionBridge.ownerGateRerunIntake.rows.flatMap((row) =>
      row.acceptedEvidenceId ? [row.acceptedEvidenceId] : []
    ),
    provenRequirementCount: 4,
    requirementProofEvidenceIds: [...requirementProofEvidenceIds],
    requirementCount: 4,
    status: "accepted",
    target: "mathSceneV2ObjectiveCompletionAudit"
  };
}

test("MAIS Manim v2 final objective verified closure pipeline waits for command transcripts before requesting final audit", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = closureFixture();
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: [],
    finalAuditRecords: [acceptedFinalAuditRecord(commandPacket)],
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.sourceContract, MATH_SCENE_V2_FINAL_OBJECTIVE_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT);
  assert.equal(pipeline.status, "pending-command-transcripts");
  assert.equal(pipeline.transcriptStatus, "pending-command-transcripts");
  assert.equal(pipeline.finalObjectiveAuditRequestStatus, "blocked-owner-gate-reruns");
  assert.equal(pipeline.finalObjectiveAuditRecordIntakeStatus, "blocked-final-objective-audit-not-requested");
  assert.equal(pipeline.finalObjectiveProofLedgerStatus, "blocked-final-objective-proof-request");
  assert.equal(pipeline.finalObjectiveProofCoveredCount, 0);
  assert.equal(pipeline.finalObjectiveSourceProofReadyCount, 1);
  assert.equal(pipeline.finalObjectiveProofPendingCount, 3);
  assert.equal(pipeline.readyForFinalObjectiveAuditRecord, false);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final objective verified closure pipeline requests but does not infer final audit records", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = closureFixture();
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket),
    finalAuditRecords: [],
    objectiveAudit,
    rerunPlan
  });
  const attributes = mathSceneV2FinalObjectiveVerifiedClosurePipelineDataAttributes(pipeline);

  assert.equal(pipeline.status, "pending-final-objective-audit-record");
  assert.equal(pipeline.transcriptStatus, "command-transcripts-covered");
  assert.equal(pipeline.commandEvidenceStatus, "owner-command-evidence-covered");
  assert.equal(pipeline.ownerActionEvidenceCountManifest, commandPacket.ownerActionEvidenceCountManifest);
  assert.equal(
    (pipeline as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    commandPacket.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (pipeline as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    commandPacket.ownerEvidenceRequirementManifest
  );
  assert.equal(
    (pipeline as { reviewSliceCount?: number }).reviewSliceCount,
    commandPacket.reviewSliceCount
  );
  assert.equal(
    (pipeline as { reviewSliceIds?: string }).reviewSliceIds,
    commandPacket.reviewSliceIds
  );
  assert.equal(
    (pipeline as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    0
  );
  assert.equal(
    (pipeline as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "none"
  );
  assert.match(pipeline.summary, /a11RootAttributes=0/);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-owner-action-evidence-count-manifest"],
    commandPacket.ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-owner-acceptance-criteria-manifest"],
    commandPacket.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-owner-evidence-requirement-manifest"],
    commandPacket.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-review-slice-count"],
    String(commandPacket.reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-review-slice-ids"],
    commandPacket.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-review-slice-file-manifest"],
    commandPacket.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-review-slice-consumer-gate-evidence-id-manifest"],
    commandPacket.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.match(pipeline.summary, new RegExp(`reviewSlices=${commandPacket.reviewSliceSummary}`));
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-a11-required-root-attribute-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-a11-run-from-beat-checkpoint-invalidation-attributes"],
    "none"
  );
  assert.equal(pipeline.finalObjectiveAuditRequestStatus, "pending-final-objective-audit-record");
  assert.equal(pipeline.finalObjectiveAuditRecordIntakeStatus, "pending-final-objective-audit-record");
  assert.equal(pipeline.finalObjectiveProofLedgerStatus, "pending-final-objective-proof-record");
  assert.equal(pipeline.finalObjectiveProofCoveredCount, 0);
  assert.equal(pipeline.finalObjectiveSourceProofReadyCount, 1);
  assert.equal(pipeline.finalObjectiveProofPendingCount, 3);
  assert.deepEqual(pipeline.finalObjectiveProofRemainingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(pipeline.missingFinalAuditRecordCount, 1);
  assert.equal(pipeline.readyForFinalObjectiveAuditRecord, true);
  assert.equal(pipeline.readyForFinalClosureAudit, false);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final objective verified closure pipeline carries current owner-gate blocker provenance", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = closureFixture();
  const currentBlockerSnapshot = currentBlockerSnapshotFixture();
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket),
    currentBlockerSnapshot,
    finalAuditRecords: [],
    objectiveAudit,
    rerunPlan
  });
  const attributes = mathSceneV2FinalObjectiveVerifiedClosurePipelineDataAttributes(pipeline);

  assert.equal(pipeline.status, "blocked-final-objective-audit-not-requested");
  assert.equal(pipeline.finalObjectiveAuditRequestStatus, "blocked-current-owner-gate-blockers");
  assert.equal(pipeline.finalObjectiveAuditRecordIntakeStatus, "blocked-final-objective-audit-not-requested");
  assert.equal(pipeline.finalObjectiveProofLedgerStatus, "blocked-final-objective-proof-request");
  assert.equal(
    (pipeline as { currentBlockerSnapshotStatus?: string }).currentBlockerSnapshotStatus,
    "blocked-missing-owner-report-artifacts"
  );
  assert.equal(
    (pipeline as { currentBlockerReadyForFinalObjectiveAuditInput?: boolean }).currentBlockerReadyForFinalObjectiveAuditInput,
    false
  );
  assert.equal(
    (pipeline as { currentBlockerMissingReportArtifactCount?: number }).currentBlockerMissingReportArtifactCount,
    3
  );
  assert.equal(
    (pipeline as { currentBlockerOpenOwnerActionCount?: number }).currentBlockerOpenOwnerActionCount,
    1
  );
  assert.deepEqual(
    (pipeline as { currentBlockerOpenA11ActionIds?: string[] }).currentBlockerOpenA11ActionIds,
    [currentBlockerOpenA11ActionId]
  );
  assert.deepEqual(
    (pipeline as { currentBlockerRemainingOwnerAgentIds?: string[] }).currentBlockerRemainingOwnerAgentIds,
    ["A11", "A18", "A22"]
  );
  assert.equal(
    (pipeline as { currentBlockerManifest?: string }).currentBlockerManifest,
    currentBlockerManifest
  );
  assert.match(pipeline.summary, /currentBlockers=blocked-missing-owner-report-artifacts/);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-current-blocker-status"],
    "blocked-missing-owner-report-artifacts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-current-blocker-ready"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-current-blocker-missing-report-count"],
    "3"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-current-blocker-open-action-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-current-blocker-open-a11-actions"],
    currentBlockerOpenA11ActionId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-current-blocker-remaining-owners"],
    "A11,A18,A22"
  );
});

test("MAIS Manim v2 final objective verified closure pipeline carries source-architecture blocker reasons", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = closureFixture();
  const blockedObjectiveAudit = sourceBlockedObjectiveAudit(objectiveAudit);
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket),
    finalAuditRecords: [],
    objectiveAudit: blockedObjectiveAudit,
    rerunPlan
  });
  const attributes = mathSceneV2FinalObjectiveVerifiedClosurePipelineDataAttributes(pipeline);

  assert.deepEqual(
    (pipeline as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    blockedObjectiveAudit.sourceArchitectureBlockerReasons
  );
  assert.equal(
    (pipeline as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    "reviewSliceStatus,missingReviewSliceFiles"
  );
  assert.match(pipeline.summary, /sourceBlockers=reviewSliceStatus,missingReviewSliceFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-source-architecture-blocker-reasons"],
    "reviewSliceStatus,missingReviewSliceFiles"
  );
});

test("MAIS Manim v2 final objective verified closure pipeline rejects invalid final audit records before closure", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = closureFixture();
  const invalidRecord = {
    ...acceptedFinalAuditRecord(commandPacket),
    ownerGateRerunEvidenceIds: ["accepted-A11-command-evidence-covered"]
  };
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket),
    finalAuditRecords: [invalidRecord],
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.status, "blocked-invalid-final-objective-audit-record");
  assert.equal(pipeline.finalObjectiveAuditRequestStatus, "pending-final-objective-audit-record");
  assert.equal(pipeline.finalObjectiveAuditRecordIntakeStatus, "blocked-invalid-final-objective-audit-record");
  assert.equal(pipeline.invalidFinalAuditRecordCount, 1);
  assert.equal(pipeline.verifiedClosureStatus, "ready-for-final-objective-audit");
  assert.equal(pipeline.finalClosureStatus, "ready-for-final-objective-audit");
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final objective verified closure pipeline blocks duplicate final proof IDs", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = closureFixture();
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket),
    finalAuditRecords: [acceptedFinalAuditRecordWithDuplicateProofId(commandPacket)],
    objectiveAudit: duplicateProofObjectiveAudit(objectiveAudit),
    rerunPlan
  });
  const attributes = mathSceneV2FinalObjectiveVerifiedClosurePipelineDataAttributes(pipeline);

  assert.equal(pipeline.status, "blocked-final-objective-proof-ledger");
  assert.equal(pipeline.finalObjectiveAuditRecordIntakeStatus, "final-objective-audit-record-accepted");
  assert.equal(pipeline.finalObjectiveProofLedgerStatus, "blocked-duplicate-final-objective-proof-ids");
  assert.equal(pipeline.finalObjectiveProofCoveredCount, 0);
  assert.equal(pipeline.finalObjectiveProofPendingCount, 3);
  assert.equal(pipeline.verifiedClosureStatus, "complete");
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
  assert.match(pipeline.summary, /canComplete=false/);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-status"],
    "blocked-final-objective-proof-ledger"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-can-complete"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-proof-ledger-status"],
    "blocked-duplicate-final-objective-proof-ids"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-verified-closure-summary"],
    /canComplete=false/
  );
});

test("MAIS Manim v2 final objective verified closure pipeline completes only through accepted final audit record intake", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = closureFixture();
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket),
    finalAuditRecords: [acceptedFinalAuditRecord(commandPacket)],
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.status, "complete");
  assert.equal(pipeline.finalObjectiveAuditRecordIntakeStatus, "final-objective-audit-record-accepted");
  assert.equal(pipeline.finalObjectiveProofLedgerStatus, "final-objective-proofs-covered");
  assert.equal(pipeline.finalObjectiveProofCoveredCount, 4);
  assert.equal(pipeline.finalObjectiveSourceProofReadyCount, 0);
  assert.equal(pipeline.finalObjectiveProofPendingCount, 0);
  assert.equal(pipeline.verifiedClosureStatus, "complete");
  assert.equal(pipeline.finalClosureStatus, "complete");
  assert.equal(pipeline.acceptedFinalAuditEvidenceId, "accepted-final-objective-audit-4-of-4-after-record-intake");
  assert.equal(pipeline.provenRequirementCount, 4);
  assert.deepEqual(pipeline.remainingOwnerAgentIds, []);
  assert.equal(pipeline.canMarkThreadGoalComplete, true);
});

test("MAIS Manim v2 final objective verified closure pipeline propagates review-slice provenance mismatch blockers", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = closureFixture();
  const staleRerunPlan = {
    ...rerunPlan,
    reviewSliceConsumerGateEvidenceIdManifest: "manim-review-slice-01=stale-final-objective-pipeline",
    reviewSliceCount: objectiveAudit.reviewSliceCount - 1,
    reviewSliceFileManifest: "manim-review-slice-01=stale-final-objective-pipeline.ts",
    reviewSliceIds: "manim-review-slice-01",
    reviewSliceSummary: `${objectiveAudit.reviewSliceCount - 1}@24`
  };
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket),
    finalAuditRecords: [acceptedFinalAuditRecord(commandPacket)],
    objectiveAudit,
    rerunPlan: staleRerunPlan
  });
  const attributes = mathSceneV2FinalObjectiveVerifiedClosurePipelineDataAttributes(pipeline);
  const expectedMismatchReasons = [
    "reviewSliceConsumerGateEvidenceIdManifest",
    "reviewSliceCount",
    "reviewSliceFileManifest",
    "reviewSliceIds",
    "reviewSliceSummary"
  ];

  assert.equal(pipeline.finalObjectiveAuditRecordIntakeStatus, "final-objective-audit-record-accepted");
  assert.equal(pipeline.finalObjectiveProofLedgerStatus, "final-objective-proofs-covered");
  assert.equal(pipeline.verifiedClosureStatus, "blocked-review-slice-provenance-mismatch");
  assert.equal(pipeline.finalClosureStatus, "blocked-review-slice-provenance-mismatch");
  assert.equal(pipeline.status, "blocked-review-slice-provenance-mismatch");
  assert.deepEqual(pipeline.reviewSliceMismatchReasons, expectedMismatchReasons);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-status"],
    "blocked-review-slice-provenance-mismatch"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-final-status"],
    "blocked-review-slice-provenance-mismatch"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-review-slice-mismatch-reasons"],
    expectedMismatchReasons.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-verified-closure-summary"],
    /reviewSliceMismatches=reviewSliceConsumerGateEvidenceIdManifest,reviewSliceCount,reviewSliceFileManifest,reviewSliceIds,reviewSliceSummary/
  );
});

test("MAIS Manim v2 final objective verified closure pipeline serializes stable final gate attributes", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = closureFixture();
  const objectiveAuditWithOwnerGroups = {
    ...objectiveAudit,
    missingOwnerEvidenceSummary: "A11=6;A22=6;A18+A06=10"
  };
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: [],
    finalAuditRecords: [],
    objectiveAudit: objectiveAuditWithOwnerGroups,
    rerunPlan
  });
  const attributes = mathSceneV2FinalObjectiveVerifiedClosurePipelineDataAttributes(pipeline);

  assert.equal(classifyManimReviewPackage("mathSceneV2FinalObjectiveVerifiedClosurePipeline.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-source-contract"],
    MATH_SCENE_V2_FINAL_OBJECTIVE_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-final-objective-verified-closure-status"], "pending-command-transcripts");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-record-status"],
    "blocked-final-objective-audit-not-requested"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-proof-ledger-status"],
    "blocked-final-objective-proof-request"
  );
  assert.equal(attributes["data-viz-manim-v2-final-objective-verified-closure-proofs"], "0/4");
  assert.equal(attributes["data-viz-manim-v2-final-objective-verified-closure-can-complete"], "false");
  assert.equal(
    pipeline.missingOwnerEvidenceSummary,
    "A11=6;A22=6;A18+A06=10"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-missing-owner-evidence"],
    "A11=6;A22=6;A18+A06=10"
  );
  assert.equal(pipeline.ownerGateRerunAcceptedSubmittedRecordManifest, "none");
  assert.equal(pipeline.ownerGateRerunMissingTemplateManifest, "none");
  assert.equal(pipeline.ownerGateRerunInvalidSubmittedRecordManifest, "none");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-owner-gate-accepted-submitted-record-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-owner-gate-missing-template-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-owner-gate-invalid-submitted-record-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-owner-acceptance-criteria-manifest"],
    commandPacket.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-owner-evidence-requirement-manifest"],
    commandPacket.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-gate-ids"],
    [
      "command-transcripts",
      "command-evidence",
      "final-objective-audit-request",
      "final-objective-audit-record",
      "final-objective-proof-ledger",
      "verified-closure",
      "final-closure-audit"
    ].join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-gate-status-manifest"],
    [
      `command-transcripts=${pipeline.transcriptStatus}`,
      `command-evidence=${pipeline.commandEvidenceStatus}`,
      `final-objective-audit-request=${pipeline.finalObjectiveAuditRequestStatus}`,
      `final-objective-audit-record=${pipeline.finalObjectiveAuditRecordIntakeStatus}`,
      `final-objective-proof-ledger=${pipeline.finalObjectiveProofLedgerStatus}`,
      `verified-closure=${pipeline.verifiedClosureStatus}`,
      `final-closure-audit=${pipeline.finalClosureStatus}`
    ].join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-gate-owner-manifest"],
    [
      "command-transcripts=A11+A18+A22",
      "command-evidence=A11+A18+A22",
      "final-objective-audit-request=A06",
      "final-objective-audit-record=A06+A11+A18+A22",
      "final-objective-proof-ledger=A06+A11+A18+A22",
      "verified-closure=A06+A11+A18+A22",
      "final-closure-audit=A06+A11+A18+A22"
    ].join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-verified-closure-gate-coverage-manifest"],
    [
      `command-transcripts=${pipeline.acceptedTranscriptCount}/${pipeline.requiredTranscriptCount}`,
      `command-evidence=${pipeline.commandEvidenceRecordCount}/${pipeline.requiredTranscriptCount}`,
      `final-objective-audit-request=${pipeline.readyForFinalObjectiveAuditRecord ? 1 : 0}/1`,
      `final-objective-audit-record=${pipeline.acceptedFinalAuditRecordCount}/${pipeline.requiredFinalAuditRecordCount}`,
      `final-objective-proof-ledger=${pipeline.finalObjectiveProofCoveredCount}/${pipeline.finalObjectiveProofRequirementCount}`,
      `verified-closure=${pipeline.provenRequirementCount}/${pipeline.requirementCount}`,
      `final-closure-audit=${pipeline.readyForFinalClosureAudit ? 1 : 0}/1`
    ].join(";")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-verified-closure-summary"],
    /missingOwnerEvidence=A11=6;A22=6;A18\+A06=10/
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-verified-closure-summary"],
    /ownerGateAcceptedSubmittedRows=none/
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-verified-closure-summary"].includes(
      `ownerAcceptanceCriteria=${commandPacket.ownerAcceptanceCriteriaManifest}`
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-verified-closure-summary"].includes(
      `ownerEvidenceRequirements=${commandPacket.ownerEvidenceRequirementManifest}`
    )
  );
});

test("MAIS Manim v2 final objective verified closure pipeline completes through real owner gate rerun submissions", () => {
  const { objectiveAudit, ownerGateRerunSubmissionBridge } = ownerGateRerunSubmissionBridgeFixture();
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureBulkCourseGenerationAllowed = false;
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureFutureInvocationScope =
    "one-topic-one-concept-cluster-or-one-review-slice";
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureHandoffStatus =
    "source-architecture-ready-owner-gates-open";
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureOpenOwnerGateIds = [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ];
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureRequiredOwnerGateIds = [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ];
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureSourceContract =
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT;
  ownerGateRerunSubmissionBridge.ownerGateRerunIntake.sourceArchitectureSummary =
    "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGenerationAllowed=false";
  const blockedObjectiveAudit = sourceBlockedObjectiveAudit(objectiveAudit);
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipelineFromOwnerGateRerunSubmissionBridge({
    finalAuditRecords: [
      acceptedFinalAuditRecordFromOwnerGateRerunSubmissionBridge(ownerGateRerunSubmissionBridge)
    ],
    objectiveAudit: blockedObjectiveAudit,
    ownerGateRerunSubmissionBridge
  });
  const attributes = mathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipelineDataAttributes(pipeline);

  assert.equal(ownerGateRerunSubmissionBridge.status, "owner-gate-rerun-submissions-covered");
  assert.equal(pipeline.status, "complete");
  assert.equal(pipeline.ownerGateRerunSubmissionBridgeStatus, "owner-gate-rerun-submissions-covered");
  assert.equal(
    pipeline.acceptedSubmittedRecordManifest,
    ownerGateRerunSubmissionBridge.acceptedSubmittedRecordManifest
  );
  assert.equal(pipeline.missingTemplateManifest, "none");
  assert.equal(pipeline.invalidSubmittedRecordManifest, "none");
  assert.equal(pipeline.ownerGateRerunSource, "owner-gate-rerun-submission-bridge");
  assert.equal(pipeline.ownerGateRerunSourceStatus, "owner-gate-rerun-submissions-covered");
  assert.equal(
    pipeline.ownerActionEvidenceCountManifest,
    ownerGateRerunSubmissionBridge.ownerActionEvidenceCountManifest
  );
  assert.equal(
    (pipeline as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    ownerGateRerunSubmissionBridge.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (pipeline as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    ownerGateRerunSubmissionBridge.ownerEvidenceRequirementManifest
  );
  assert.equal(
    (pipeline as { reviewSliceCount?: number }).reviewSliceCount,
    ownerGateRerunSubmissionBridge.reviewSliceCount
  );
  assert.equal(
    (pipeline as { reviewSliceIds?: string }).reviewSliceIds,
    ownerGateRerunSubmissionBridge.reviewSliceIds
  );
  assert.equal(
    (pipeline as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    ownerGateRerunSubmissionBridge.a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (pipeline as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    ownerGateRerunSubmissionBridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    (pipeline as { sourceArchitectureHandoffStatus?: string }).sourceArchitectureHandoffStatus,
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    (pipeline as { sourceArchitectureBulkCourseGenerationAllowed?: boolean }).sourceArchitectureBulkCourseGenerationAllowed,
    false
  );
  assert.equal(
    (pipeline as { sourceArchitectureFutureInvocationScope?: string }).sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    (pipeline as { sourceArchitectureSourceContract?: string }).sourceArchitectureSourceContract,
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.deepEqual(
    (pipeline as { sourceArchitectureOpenOwnerGateIds?: string[] }).sourceArchitectureOpenOwnerGateIds,
    [
      "a11-browser-visual-interaction-regression",
      "a18-a06-teaching-quality-confirmation",
      "a22-clean-release-gate"
    ]
  );
  assert.match(pipeline.summary, /a11RootAttributes=5/);
  assert.equal(pipeline.finalObjectiveAuditRequestStatus, "pending-final-objective-audit-record");
  assert.equal(pipeline.finalObjectiveAuditRecordIntakeStatus, "final-objective-audit-record-accepted");
  assert.equal(pipeline.finalObjectiveProofLedgerStatus, "final-objective-proofs-covered");
  assert.equal(pipeline.finalClosureStatus, "complete");
  assert.equal(
    pipeline.acceptedFinalAuditEvidenceId,
    "accepted-final-objective-audit-4-of-4-after-owner-gate-submissions"
  );
  assert.deepEqual(pipeline.remainingOwnerAgentIds, []);
  assert.equal(pipeline.canMarkThreadGoalComplete, true);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-gate-source"],
    "owner-gate-rerun-submission-bridge"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-gate-source-status"],
    "owner-gate-rerun-submissions-covered"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-accepted-submitted-record-manifest"],
    ownerGateRerunSubmissionBridge.acceptedSubmittedRecordManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-action-evidence-count-manifest"],
    ownerGateRerunSubmissionBridge.ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-acceptance-criteria-manifest"],
    ownerGateRerunSubmissionBridge.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-evidence-requirement-manifest"],
    ownerGateRerunSubmissionBridge.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-review-slice-count"],
    String(ownerGateRerunSubmissionBridge.reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-review-slice-ids"],
    ownerGateRerunSubmissionBridge.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-review-slice-file-manifest"],
    ownerGateRerunSubmissionBridge.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-review-slice-consumer-gate-evidence-id-manifest"],
    ownerGateRerunSubmissionBridge.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-a11-required-root-attribute-count"],
    String(ownerGateRerunSubmissionBridge.a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-a11-run-from-beat-checkpoint-invalidation-attributes"],
    ownerGateRerunSubmissionBridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-open-owner-gates"],
    "a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids"],
    [
      "owner-gate-rerun-submission-bridge",
      "final-objective-audit-request",
      "final-objective-audit-record",
      "final-objective-proof-ledger",
      "verified-closure",
      "final-closure-audit"
    ].join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest"],
    [
      `owner-gate-rerun-submission-bridge=${pipeline.ownerGateRerunSubmissionBridgeStatus}`,
      `final-objective-audit-request=${pipeline.finalObjectiveAuditRequestStatus}`,
      `final-objective-audit-record=${pipeline.finalObjectiveAuditRecordIntakeStatus}`,
      `final-objective-proof-ledger=${pipeline.finalObjectiveProofLedgerStatus}`,
      `verified-closure=${pipeline.finalClosureStatus}`,
      `final-closure-audit=${pipeline.finalClosureStatus}`
    ].join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest"],
    [
      "owner-gate-rerun-submission-bridge=A11+A18+A22",
      "final-objective-audit-request=A06",
      "final-objective-audit-record=A06+A11+A18+A22",
      "final-objective-proof-ledger=A06+A11+A18+A22",
      "verified-closure=A06+A11+A18+A22",
      "final-closure-audit=A06+A11+A18+A22"
    ].join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"],
    [
      "owner-gate-rerun-submission-bridge=1/1",
      `final-objective-audit-request=${pipeline.readyForFinalObjectiveAuditRecord ? 1 : 0}/1`,
      `final-objective-audit-record=${pipeline.acceptedFinalAuditRecordCount}/${pipeline.requiredFinalAuditRecordCount}`,
      `final-objective-proof-ledger=${pipeline.finalObjectiveProofCoveredCount}/${pipeline.finalObjectiveProofRequirementCount}`,
      `verified-closure=${pipeline.provenRequirementCount}/${pipeline.requirementCount}`,
      `final-closure-audit=${pipeline.readyForFinalClosureAudit ? 1 : 0}/1`
    ].join(";")
  );
  assert.deepEqual(
    (pipeline as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    blockedObjectiveAudit.sourceArchitectureBlockerReasons
  );
  assert.equal(
    (pipeline as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    blockedObjectiveAudit.sourceArchitectureBlockerReasonManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-blocker-reasons"
    ],
    blockedObjectiveAudit.sourceArchitectureBlockerReasonManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-missing-template-manifest"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-invalid-submitted-record-manifest"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-summary"],
    /ownerGateSource=owner-gate-rerun-submission-bridge/
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-summary"].includes(
      `ownerActionEvidenceCounts=${ownerGateRerunSubmissionBridge.ownerActionEvidenceCountManifest}`
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-summary"].includes(
      `ownerAcceptanceCriteria=${ownerGateRerunSubmissionBridge.ownerAcceptanceCriteriaManifest}`
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-summary"].includes(
      `ownerEvidenceRequirements=${ownerGateRerunSubmissionBridge.ownerEvidenceRequirementManifest}`
    )
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-summary"],
    new RegExp(`reviewSlices=${ownerGateRerunSubmissionBridge.reviewSliceSummary}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-summary"],
    /sourceArchitecture=source-architecture-ready-owner-gates-open/
  );
});

test("MAIS Manim v2 final objective verified closure submission bridge carries current owner-gate blocker provenance", () => {
  const { objectiveAudit, ownerGateRerunSubmissionBridge } = ownerGateRerunSubmissionBridgeFixture();
  const currentBlockerSnapshot = currentBlockerSnapshotFixture();
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipelineFromOwnerGateRerunSubmissionBridge({
    currentBlockerSnapshot,
    finalAuditRecords: [
      acceptedFinalAuditRecordFromOwnerGateRerunSubmissionBridge(ownerGateRerunSubmissionBridge)
    ],
    objectiveAudit,
    ownerGateRerunSubmissionBridge
  });
  const attributes = mathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipelineDataAttributes(pipeline);

  assert.equal(pipeline.status, "blocked-final-objective-audit-not-requested");
  assert.equal(pipeline.finalObjectiveAuditRequestStatus, "blocked-current-owner-gate-blockers");
  assert.equal(pipeline.finalObjectiveAuditRecordIntakeStatus, "blocked-final-objective-audit-not-requested");
  assert.equal(pipeline.finalObjectiveProofLedgerStatus, "blocked-final-objective-proof-request");
  assert.equal(
    (pipeline as { currentBlockerSnapshotStatus?: string }).currentBlockerSnapshotStatus,
    "blocked-missing-owner-report-artifacts"
  );
  assert.equal(
    (pipeline as { currentBlockerReadyForFinalObjectiveAuditInput?: boolean }).currentBlockerReadyForFinalObjectiveAuditInput,
    false
  );
  assert.equal(
    (pipeline as { currentBlockerMissingReportArtifactCount?: number }).currentBlockerMissingReportArtifactCount,
    3
  );
  assert.equal(
    (pipeline as { currentBlockerOpenOwnerActionCount?: number }).currentBlockerOpenOwnerActionCount,
    1
  );
  assert.deepEqual(
    (pipeline as { currentBlockerOpenA11ActionIds?: string[] }).currentBlockerOpenA11ActionIds,
    [currentBlockerOpenA11ActionId]
  );
  assert.deepEqual(
    (pipeline as { currentBlockerRemainingOwnerAgentIds?: string[] }).currentBlockerRemainingOwnerAgentIds,
    ["A11", "A18", "A22"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-current-blocker-status"],
    "blocked-missing-owner-report-artifacts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-current-blocker-open-a11-actions"],
    currentBlockerOpenA11ActionId
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-summary"],
    /currentBlockers=blocked-missing-owner-report-artifacts/
  );
});

test("MAIS Manim v2 final objective verified closure pipeline waits for real owner gate rerun submissions", () => {
  const { objectiveAudit, ownerGateRerunSubmissionBridge } = ownerGateRerunSubmissionBridgeFixture({
    includeSubmittedOwnerGateReruns: false
  });
  const pipeline = buildMathSceneV2FinalObjectiveVerifiedClosurePipelineFromOwnerGateRerunSubmissionBridge({
    finalAuditRecords: [
      acceptedFinalAuditRecordFromOwnerGateRerunSubmissionBridge(ownerGateRerunSubmissionBridge)
    ],
    objectiveAudit,
    ownerGateRerunSubmissionBridge
  });
  const attributes = mathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipelineDataAttributes(pipeline);

  assert.equal(ownerGateRerunSubmissionBridge.status, "pending-owner-gate-rerun-submissions");
  assert.equal(pipeline.status, "pending-owner-gate-rerun-submissions");
  assert.equal(pipeline.ownerGateRerunSubmissionBridgeStatus, "pending-owner-gate-rerun-submissions");
  assert.equal(pipeline.ownerGateRerunSourceStatus, "pending-owner-gate-rerun-submissions");
  assert.equal(pipeline.finalObjectiveAuditRequestStatus, "blocked-owner-gate-reruns");
  assert.equal(pipeline.finalObjectiveAuditRecordIntakeStatus, "blocked-final-objective-audit-not-requested");
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-submission-bridge-verified-closure-can-complete"],
    "false"
  );
});
