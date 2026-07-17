import assert from "node:assert/strict";
import test from "node:test";
import {
  type MathSceneTeachingFinalDecisionIntake,
  MATH_SCENE_TEACHING_FINAL_DECISION_INTAKE_SOURCE_CONTRACT
} from "./mathSceneTeachingFinalDecisionIntake";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  type MathSceneV2CompletionEvidenceIntake,
  MATH_SCENE_V2_COMPLETION_EVIDENCE_INTAKE_SOURCE_CONTRACT
} from "./mathSceneV2CompletionEvidenceIntake";
import {
  type MathSceneV2CompletionStatusSummary,
  MATH_SCENE_V2_COMPLETION_STATUS_SUMMARY_SOURCE_CONTRACT
} from "./mathSceneV2CompletionStatusSummary";
import {
  type MathSceneV2CrossAgentHandoff,
  MATH_SCENE_V2_CROSS_AGENT_HANDOFF_SOURCE_CONTRACT
} from "./mathSceneV2CrossAgentHandoff";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";
import type { MathSceneV2FinalOwnerClosurePacket } from "./mathSceneV2FinalOwnerClosurePacket";
import {
  buildMathSceneV2ObjectiveCompletionAudit,
  mathSceneV2ObjectiveCompletionAuditDataAttributes,
  MATH_SCENE_V2_OBJECTIVE_COMPLETION_AUDIT_SOURCE_CONTRACT
} from "./mathSceneV2ObjectiveCompletionAudit";

const ownerAcceptanceCriteriaManifest = "fixture-owner-acceptance-criteria";
const ownerEvidenceRequirementManifest = "fixture-owner-evidence-requirements";
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
const ownerGateHandoffA06SourceStatusManifest =
  "A11=not-applicable;A18=a06-source-confirmed-a18-pending;A22=not-applicable";
const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  [
    "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
    "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
    "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
    "data-viz-manim-run-from-beat-checkpoint-restore-action",
    "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore"
  ].join(",");
const a11RequiredRootDataAttributeCount = 5;

const completionStatusFixture: MathSceneV2CompletionStatusSummary = {
  acceptedOwnerEvidenceCount: 0,
  blockedGateIds: [
    "a11-browser-visual-interaction-regression",
    "a22-clean-release-gate",
    "a18-a06-teaching-quality-confirmation"
  ],
  canMarkThreadGoalComplete: false,
  fileCount: 387,
  forbiddenReleaseIncludeCount: 0,
  goalCompletionStatus: "not-complete",
  largestSliceFileCount: 24,
  missingOwnerEvidenceSummary: "A11=6;A22=6;A18+A06=10",
  missingSliceFileCount: 0,
  blockedGateManifest: "fixture-blocked-gate-manifest",
  ownerEvidenceStatusManifest: "fixture-owner-evidence-status-manifest",
  packageCount: 8,
  pendingOwnerEvidenceCount: 22,
  readyForGoalGateRerun: false,
  remainingOwnerAgentIds: ["A11", "A18", "A22"],
  sliceCount: 20,
  ownerAcceptanceCriteriaManifest,
  ownerEvidenceRequirementManifest,
  sourceArchitectureBlockerReasons: [],
  sourceArchitectureStatus: "ready-for-review",
  sourceContract: MATH_SCENE_V2_COMPLETION_STATUS_SUMMARY_SOURCE_CONTRACT,
  status: "source-architecture-ready-goal-blocked",
  summary:
    "mathSceneV2CompletionStatus:status=source-architecture-ready-goal-blocked:source=ready-for-review:goal=not-complete:files=387:slices=20:pendingEvidence=22:remainingOwners=A11,A18,A22",
  unclassifiedFileCount: 0
};

const crossAgentHandoffFixture: MathSceneV2CrossAgentHandoff = {
  a18DecisionLedgerSummary: "60/60-pending",
  a18RenderedRouteSummary: "12/12",
  a11RequiredRootDataAttributeCount,
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
  canMarkThreadGoalComplete: false,
  goalCompletionStatus: "not-complete",
  openWorkstreamCount: 3,
  readyWorkstreamCount: 1,
  releaseSliceSummary: "387/0-forbidden",
  reviewSliceConsumerGateEvidenceIdManifest:
    "A11=a11-browser-visual-interaction-regression,A18=a18-a06-teaching-quality-confirmation,A22=a22-clean-release-gate",
  reviewSliceFileManifest: "manim-evidence-01=mathSceneV2ObjectiveCompletionAudit.ts",
  reviewSliceIds: "manim-evidence-01",
  reviewSliceSummary: "20@24",
  rows: [
    {
      blockingItems: [],
      evidenceCounts: {
        duplicateReviewSliceFileCount: 0,
        fileCount: 387,
        largestReviewSliceFileCount: 24,
        maxFilesPerReviewSlice: 24,
        missingReviewSliceFileCount: 0,
        readyPackageCount: 8,
        reviewPackageCount: 8,
        reviewSliceCount: 20,
        unclassifiedFileCount: 0
      },
      evidenceSummary: "packages=8;files=387;unclassified=0:slices=20@24",
      id: "a06-review-package-split",
      ownerAgentIds: ["A06"],
      requiredActions: [],
      status: "ready-for-downstream-review",
      supportingAgentIds: []
    },
    {
      blockingItems: ["a11-broad-visualization-value-suite-red"],
      evidenceCounts: {
        broadGateRed: 1,
        hkGradePackageCount: 14,
        hkGradePassedCount: 14,
        missingHkPackageCount: 0,
        requiredRootDataAttributeCount: a11RequiredRootDataAttributeCount,
        runFromBeatCheckpointInvalidationDataAttributeCount: a11RequiredRootDataAttributeCount
      },
      evidenceSummary: "hkSplit=passed;broad=red-needs-a11-a22-follow-up;missing=0",
      id: "a11-browser-visual-interaction-regression",
      ownerAgentIds: ["A11"],
      requiredActions: [
        "adopt-hk-grade-split-packages",
        "keep-non-hk-tracks-out-of-hk-demo-sweep",
        "update-projection-views-expected-list"
      ],
      status: "owner-action-required",
      supportingAgentIds: ["A06", "A22"]
    },
    {
      blockingItems: ["a22-release-preflight-disk-blocked"],
      evidenceCounts: {
        a22BlockerCount: 1,
        a11ReleaseSliceRequiredRootDataAttributeCount: a11RequiredRootDataAttributeCount,
        forbiddenReleaseSliceFileCount: 0,
        productionDeployAllowed: 0,
        prunedStagingPassed: 1,
        releaseSliceFileCount: 387,
        requiredActionCount: 3
      },
      evidenceSummary:
        "status=release-blocked;preflight=disk-blocked;root=dirty-root-blocked;pruned=passed:releaseSlice=387/0-forbidden",
      id: "a22-clean-release-gate",
      ownerAgentIds: ["A22"],
      requiredActions: [
        "investigate-isolated-next-chunk-serving-after-broad-timeout",
        "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
        "run-a22-generated-artifact-cleanup-after-preserving-evidence"
      ],
      status: "release-blocked",
      supportingAgentIds: ["A06", "A11"]
    },
    {
      blockingItems: ["a18-final-teaching-signoff-open"],
      evidenceCounts: {
        canCompleteA18DecisionLedger: 0,
        finalDecisionCount: 60,
        missingRenderedRouteCount: 0,
        pendingA18Count: 12,
        pendingFinalDecisionCount: 60,
        readyProofPointCount: 108,
        readySceneCount: 12,
        renderedRouteCount: 12,
        revisionFinalDecisionCount: 0,
        sceneCount: 12
      },
      evidenceSummary:
        "status=pending-a18-final-review;scenes=12;pendingA18=12;proofPoints=108/108:routes=12/12:decisions=60/60-pending",
      id: "a18-a06-teaching-quality-confirmation",
      ownerAgentIds: ["A18", "A06"],
      requiredActions: [
        "open-rendered-review-routes",
        "inspect-rendered-scene-targets",
        "complete-a18-final-criterion-decisions",
        "complete-a18-final-scene-signoff",
        "record-approve-or-revision-decision"
      ],
      status: "final-signoff-required",
      supportingAgentIds: []
    }
  ],
  sourceArchitectureBlockerReasonManifest: "none",
  sourceArchitectureBlockerReasons: [],
  sourceArchitectureAcceptanceCriteria: [
    "source-architecture-handoff-consumes-review-slices",
    "no-bulk-course-generation",
    "a11-a18-a22-owner-gates-remain-open"
  ],
  sourceArchitectureBulkCourseGenerationAllowed: false,
  sourceArchitectureCanMarkThreadGoalComplete: false,
  sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
  sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
  sourceArchitectureOpenOwnerGateIds: [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ],
  sourceArchitectureRequiredOwnerGateIds: [
    "a06-review-package-split",
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ],
  sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
  sourceArchitectureSummary:
    "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:scope=one-topic-one-concept-cluster-or-one-review-slice:bulkCourseGeneration=false:canComplete=false:openOwnerGates=a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate",
  sourceContract: MATH_SCENE_V2_CROSS_AGENT_HANDOFF_SOURCE_CONTRACT,
  status: "needs-owner-action",
  summary:
    "mathSceneV2CrossAgentHandoff:status=needs-owner-action:goal=not-complete:reviewSlices=20@24:releaseSlice=387/0-forbidden:a18Routes=12/12:a18Decisions=60/60-pending",
  workstreamCount: 4
};

const evidenceIntakeFixture: MathSceneV2CompletionEvidenceIntake = {
  acceptedActionCount: 0,
  acceptedEvidenceCount: 0,
  actionCount: 11,
  actions: [],
  canMarkThreadGoalComplete: false,
  duplicateEvidenceIds: [],
  invalidEvidenceRecordCount: 0,
  invalidEvidenceRecords: [],
  missingEvidenceActionManifest: "fixture-missing-evidence-action-manifest",
  missingEvidenceCount: 22,
  missingEvidenceOwnerGroups: [
    {
      acceptedEvidenceCount: 0,
      missingEvidenceCount: 6,
      ownerAgentIds: ["A11"],
      pendingActionCount: 3,
      requiredEvidenceCount: 6
    },
    {
      acceptedEvidenceCount: 0,
      missingEvidenceCount: 6,
      ownerAgentIds: ["A22"],
      pendingActionCount: 3,
      requiredEvidenceCount: 6
    },
    {
      acceptedEvidenceCount: 0,
      missingEvidenceCount: 10,
      ownerAgentIds: ["A18", "A06"],
      pendingActionCount: 5,
      requiredEvidenceCount: 10
    }
  ],
  missingEvidenceOwnerGroupSummary: "A11=6;A22=6;A18+A06=10",
  pendingActionCount: 11,
  readyForGoalGateRerun: false,
  requiredEvidenceCount: 22,
  reviewSliceConsumerGateEvidenceIdManifest:
    "manim-evidence-01=A06-source-review:source-review-note:ready-for-slice-review",
  reviewSliceCount: 20,
  reviewSliceFileManifest: "manim-evidence-01=mathSceneV2ObjectiveCompletionAudit.ts",
  reviewSliceIds: "manim-evidence-01",
  reviewSliceSummary: "20@24",
  sourceArchitectureBlockerReasonManifest: "none",
  sourceArchitectureBlockerReasons: [],
  sourceContract: MATH_SCENE_V2_COMPLETION_EVIDENCE_INTAKE_SOURCE_CONTRACT,
  status: "pending-owner-evidence",
  summary:
    "mathSceneV2CompletionEvidenceIntake:status=pending-owner-evidence:actions=11:acceptedActions=0:pendingActions=11:acceptedEvidence=0/22:missingEvidence=22:missingOwners=A11=6;A22=6;A18+A06=10"
};

const teachingFinalDecisionIntakeFixture = {
  canMarkA18GateComplete: false,
  sourceContract: MATH_SCENE_TEACHING_FINAL_DECISION_INTAKE_SOURCE_CONTRACT,
  status: "pending-a18-final-decisions"
} as MathSceneTeachingFinalDecisionIntake;
const a06SourceConfirmationSummary =
  "a06TeachingSourceConfirmationLedger:status=a06-source-confirmed-a18-pending:confirmed=60/60:pendingA18=60:function-graph-core=5/5-a06-confirmed";

function auditFixture() {
  return buildMathSceneV2ObjectiveCompletionAudit({
    completionStatus: completionStatusFixture,
    crossAgentHandoff: crossAgentHandoffFixture,
    evidenceIntake: evidenceIntakeFixture,
    teachingFinalDecisionIntake: teachingFinalDecisionIntakeFixture
  });
}

function finalOwnerClosurePacketFixture(): MathSceneV2FinalOwnerClosurePacket {
  return {
    canMarkThreadGoalComplete: false,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames:
      [...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus: "complete",
    ownerGateHandoffA06SourceStatusManifest,
    status: "pending-owner-closure-submissions"
  } as MathSceneV2FinalOwnerClosurePacket;
}

function teachingFinalDecisionIntakeWithA06Source(
  overrides: Partial<MathSceneTeachingFinalDecisionIntake> = {}
): MathSceneTeachingFinalDecisionIntake {
  return {
    ...teachingFinalDecisionIntakeFixture,
    a06SourceBlockedConfirmationCount: 0,
    a06SourceConfirmedDecisionCount: 60,
    a06SourceConfirmationStatus: "a06-source-confirmed-a18-pending",
    a06SourceConfirmationSummary,
    a06SourcePendingA18DecisionCount: 60,
    ...overrides
  } as MathSceneTeachingFinalDecisionIntake;
}

test("MAIS Manim v2 objective audit proves only the A06 slice from current evidence", () => {
  const audit = auditFixture();
  const rowsById = Object.fromEntries(audit.requirements.map((row) => [row.id, row]));

  assert.equal(audit.sourceContract, MATH_SCENE_V2_OBJECTIVE_COMPLETION_AUDIT_SOURCE_CONTRACT);
  assert.equal(audit.status, "not-complete");
  assert.equal(audit.requirementCount, 4);
  assert.equal(audit.provenRequirementCount, 1);
  assert.equal(audit.incompleteRequirementCount, 3);
  assert.equal(audit.missingOwnerEvidenceCount, 22);
  assert.equal(
    (audit as { missingOwnerEvidenceSummary?: string }).missingOwnerEvidenceSummary,
    "A11=6;A22=6;A18+A06=10"
  );
  assert.equal(
    (audit as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (audit as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    ownerEvidenceRequirementManifest
  );
  assert.equal(
    (audit as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (audit as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.ok(audit.summary.includes(`ownerAcceptanceCriteria=${ownerAcceptanceCriteriaManifest}`));
  assert.ok(audit.summary.includes(`ownerEvidenceRequirements=${ownerEvidenceRequirementManifest}`));
  assert.ok(audit.summary.includes("reviewSlices=20@24"));
  assert.ok(audit.summary.includes(`a11RootAttributes=${a11RequiredRootDataAttributeCount}`));
  assert.equal((audit as { reviewSliceCount?: number }).reviewSliceCount, 20);
  assert.equal((audit as { reviewSliceIds?: string }).reviewSliceIds, crossAgentHandoffFixture.reviewSliceIds);
  assert.equal(
    (audit as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    crossAgentHandoffFixture.reviewSliceFileManifest
  );
  assert.equal(
    (audit as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    crossAgentHandoffFixture.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal((audit as { reviewSliceSummary?: string }).reviewSliceSummary, crossAgentHandoffFixture.reviewSliceSummary);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.deepEqual(audit.remainingOwnerAgentIds, ["A11", "A18", "A22"]);

  assert.equal(rowsById["a06-review-package-split"].status, "proven");
  assert.equal(rowsById["a06-review-package-split"].evidenceVerdict, "current-evidence-proves-requirement");
  assert.equal(rowsById["a06-review-package-split"].blockingItems.length, 0);
  assert.equal(rowsById["a06-review-package-split"].evidenceCounts.reviewSliceCount, 20);

  assert.equal(rowsById["a11-browser-visual-interaction-regression"].status, "owner-action-required");
  assert.equal(rowsById["a11-browser-visual-interaction-regression"].evidenceVerdict, "missing-owner-evidence");
  assert.ok(rowsById["a11-browser-visual-interaction-regression"].requiredActions.includes("adopt-hk-grade-split-packages"));
  assert.ok(rowsById["a11-browser-visual-interaction-regression"].requiredActions.includes("update-projection-views-expected-list"));

  assert.equal(rowsById["a22-clean-release-gate"].status, "blocked-owner-action");
  assert.equal(rowsById["a22-clean-release-gate"].evidenceVerdict, "owner-gate-blocked");
  assert.ok(rowsById["a22-clean-release-gate"].blockingItems.includes("a22-release-preflight-disk-blocked"));

  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].status, "owner-action-required");
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceVerdict, "pending-a18-final-decisions");
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceCounts.pendingFinalDecisionCount, 60);
  assert.ok(rowsById["a18-a06-teaching-quality-confirmation"].requiredActions.includes("complete-a18-final-criterion-decisions"));
});

test("MAIS Manim v2 objective audit consumes final owner closure verified-closure manifests without completing", () => {
  const audit = buildMathSceneV2ObjectiveCompletionAudit({
    completionStatus: completionStatusFixture,
    crossAgentHandoff: crossAgentHandoffFixture,
    evidenceIntake: evidenceIntakeFixture,
    finalOwnerClosurePacket: finalOwnerClosurePacketFixture(),
    teachingFinalDecisionIntake: teachingFinalDecisionIntakeFixture
  });
  const attributes = mathSceneV2ObjectiveCompletionAuditDataAttributes(audit);

  assert.equal(
    (audit as { finalOwnerClosurePacketStatus?: string }).finalOwnerClosurePacketStatus,
    "pending-owner-closure-submissions"
  );
  assert.equal((audit as { finalOwnerClosureCanComplete?: boolean }).finalOwnerClosureCanComplete, false);
  assert.deepEqual(
    (audit as { finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames?: string[] })
      .finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames,
    [...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames]
  );
  assert.equal(
    (audit as { finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds?: string })
      .finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds
  );
  assert.equal(
    (audit as { finalOwnerClosureSubmissionBridgeVerifiedClosureStatus?: string })
      .finalOwnerClosureSubmissionBridgeVerifiedClosureStatus,
    "complete"
  );
  assert.equal(
    (audit as { finalOwnerClosureOwnerGateA06SourceStatusManifest?: string })
      .finalOwnerClosureOwnerGateA06SourceStatusManifest,
    ownerGateHandoffA06SourceStatusManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-final-owner-closure-status"],
    "pending-owner-closure-submissions"
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-final-owner-closure-can-complete"],
    "false"
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-objective-audit-final-owner-closure-submission-bridge-verified-closure-gate-coverage-manifest"
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-objective-audit-final-owner-closure-submission-bridge-verified-closure-gate-owner-manifest"
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-objective-audit-final-owner-closure-submission-bridge-verified-closure-status"
    ],
    "complete"
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-final-owner-closure-owner-gate-a06-source-status-manifest"],
    ownerGateHandoffA06SourceStatusManifest
  );
  assert.match(audit.summary, /finalOwnerClosure=pending-owner-closure-submissions/);
  assert.match(audit.summary, /submissionBridgeVerifiedClosure=complete/);
  assert.match(
    audit.summary,
    /finalOwnerClosureOwnerGateA06SourceStatuses=A11=not-applicable;A18=a06-source-confirmed-a18-pending;A22=not-applicable/
  );
  assert.equal(audit.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 objective audit carries A06 teaching source confirmations without completing", () => {
  const audit = buildMathSceneV2ObjectiveCompletionAudit({
    completionStatus: completionStatusFixture,
    crossAgentHandoff: crossAgentHandoffFixture,
    evidenceIntake: evidenceIntakeFixture,
    teachingFinalDecisionIntake: teachingFinalDecisionIntakeWithA06Source()
  });
  const attributes = mathSceneV2ObjectiveCompletionAuditDataAttributes(audit) as Record<string, string>;

  assert.equal(
    (audit as { a06SourceConfirmationStatus?: string }).a06SourceConfirmationStatus,
    "a06-source-confirmed-a18-pending"
  );
  assert.equal((audit as { a06SourceConfirmedDecisionCount?: number }).a06SourceConfirmedDecisionCount, 60);
  assert.equal((audit as { a06SourceBlockedConfirmationCount?: number }).a06SourceBlockedConfirmationCount, 0);
  assert.equal((audit as { a06SourcePendingA18DecisionCount?: number }).a06SourcePendingA18DecisionCount, 60);
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-a06-source-confirmation-status"],
    "a06-source-confirmed-a18-pending"
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-a06-source-confirmed-count"],
    "60"
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-a06-source-blocked-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-a06-source-pending-a18-count"],
    "60"
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-a06-source-confirmation-summary"],
    a06SourceConfirmationSummary
  );
  assert.match(audit.summary, /a06Source=a06-source-confirmed-a18-pending/);
  assert.match(audit.summary, /a06SourceConfirmed=60\/60/);
  assert.equal(audit.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 objective audit blocks teaching quality when A06 source confirmations are blocked", () => {
  const audit = buildMathSceneV2ObjectiveCompletionAudit({
    completionStatus: completionStatusFixture,
    crossAgentHandoff: crossAgentHandoffFixture,
    evidenceIntake: evidenceIntakeFixture,
    teachingFinalDecisionIntake: teachingFinalDecisionIntakeWithA06Source({
      a06SourceBlockedConfirmationCount: 5,
      a06SourceConfirmationStatus: "blocked-missing-source-evidence",
      a06SourceConfirmationSummary:
        "a06TeachingSourceConfirmationLedger:status=blocked-missing-source-evidence:confirmed=55/60:pendingA18=60",
      status: "blocked-missing-a06-source-confirmation"
    } as Partial<MathSceneTeachingFinalDecisionIntake>)
  });
  const rowsById = Object.fromEntries(audit.requirements.map((row) => [row.id, row]));
  const attributes = mathSceneV2ObjectiveCompletionAuditDataAttributes(audit) as Record<string, string>;

  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].status, "blocked-owner-action");
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceVerdict, "owner-gate-blocked");
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-a06-source-confirmation-status"],
    "blocked-missing-source-evidence"
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-a06-source-blocked-count"],
    "5"
  );
  assert.equal(audit.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 objective audit blocks stale A06 source-confirmation ledgers", () => {
  const mismatchReasons = [
    "a06-confirmation-count=55/60",
    "missing-source-decision-keys=function-graph-core::interaction-timing"
  ];
  const audit = buildMathSceneV2ObjectiveCompletionAudit({
    completionStatus: completionStatusFixture,
    crossAgentHandoff: crossAgentHandoffFixture,
    evidenceIntake: evidenceIntakeFixture,
    teachingFinalDecisionIntake: teachingFinalDecisionIntakeWithA06Source({
      a06SourceConfirmationMismatchReasons: mismatchReasons,
      a06SourceConfirmedDecisionCount: 55,
      a06SourcePendingA18DecisionCount: 60,
      status: "blocked-a06-source-confirmation-ledger-mismatch"
    } as Partial<MathSceneTeachingFinalDecisionIntake>)
  });
  const rowsById = Object.fromEntries(audit.requirements.map((row) => [row.id, row]));
  const attributes = mathSceneV2ObjectiveCompletionAuditDataAttributes(audit) as Record<string, string>;

  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].status, "blocked-owner-action");
  assert.equal(rowsById["a18-a06-teaching-quality-confirmation"].evidenceVerdict, "owner-gate-blocked");
  assert.deepEqual(
    (audit as { a06SourceConfirmationMismatchReasons?: string[] }).a06SourceConfirmationMismatchReasons,
    mismatchReasons
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-a06-source-mismatch-reasons"],
    mismatchReasons.join("|")
  );
  assert.match(audit.summary, /a06SourceMismatch=a06-confirmation-count=55\/60\|missing-source-decision-keys=function-graph-core::interaction-timing/);
  assert.equal(audit.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 objective audit serializes stable completion evidence attributes", () => {
  const audit = auditFixture();
  const attributes = mathSceneV2ObjectiveCompletionAuditDataAttributes(audit);

  assert.equal(classifyManimReviewPackage("mathSceneV2ObjectiveCompletionAudit.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-source-contract"],
    MATH_SCENE_V2_OBJECTIVE_COMPLETION_AUDIT_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-objective-audit-status"], "not-complete");
  assert.equal(attributes["data-viz-manim-v2-objective-audit-proven"], "1/4");
  assert.equal(attributes["data-viz-manim-v2-objective-audit-missing-evidence-count"], "22");
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-missing-evidence-owner-groups"],
    "A11=6;A22=6;A18+A06=10"
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-owner-acceptance-criteria-manifest"],
    ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-owner-evidence-requirement-manifest"],
    ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-a11-required-root-attribute-count"],
    String(a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-a11-run-from-beat-checkpoint-invalidation-attributes"],
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-review-slice-count"],
    "20"
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-review-slice-ids"],
    crossAgentHandoffFixture.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-review-slice-file-manifest"],
    crossAgentHandoffFixture.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-review-slice-consumer-gate-evidence-id-manifest"],
    crossAgentHandoffFixture.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-review-slices"],
    crossAgentHandoffFixture.reviewSliceSummary
  );
  assert.equal(attributes["data-viz-manim-v2-objective-audit-remaining-owners"], "A11,A18,A22");
  assert.equal(attributes["data-viz-manim-v2-objective-audit-can-complete"], "false");
  assert.match(attributes["data-viz-manim-v2-objective-audit-blockers"], /a22-release-preflight-disk-blocked/);
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-requirement-status-manifest"],
    [
      "a06-review-package-split=status:proven|owners:A06|support:none",
      "a11-browser-visual-interaction-regression=status:owner-action-required|owners:A11|support:A06+A22",
      "a22-clean-release-gate=status:blocked-owner-action|owners:A22|support:A06+A11",
      "a18-a06-teaching-quality-confirmation=status:owner-action-required|owners:A18+A06|support:none"
    ].join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-requirement-verdict-manifest"],
    [
      "a06-review-package-split=verdict:current-evidence-proves-requirement",
      "a11-browser-visual-interaction-regression=verdict:missing-owner-evidence",
      "a22-clean-release-gate=verdict:owner-gate-blocked",
      "a18-a06-teaching-quality-confirmation=verdict:pending-a18-final-decisions"
    ].join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-required-action-manifest"],
    [
      "a06-review-package-split=actions:none",
      "a11-browser-visual-interaction-regression=actions:adopt-hk-grade-split-packages+keep-non-hk-tracks-out-of-hk-demo-sweep+update-projection-views-expected-list",
      "a22-clean-release-gate=actions:investigate-isolated-next-chunk-serving-after-broad-timeout+release-from-clean-worktree-or-reviewed-pruned-staging-slice+run-a22-generated-artifact-cleanup-after-preserving-evidence",
      "a18-a06-teaching-quality-confirmation=actions:open-rendered-review-routes+inspect-rendered-scene-targets+complete-a18-final-criterion-decisions+complete-a18-final-scene-signoff+record-approve-or-revision-decision"
    ].join(";")
  );
});

test("MAIS Manim v2 objective audit exposes source-architecture blocker reasons", () => {
  const blockedCompletionStatus: MathSceneV2CompletionStatusSummary = {
    ...completionStatusFixture,
    blockedGateIds: ["a06-review-package-split"],
    sourceArchitectureBlockerReasons: ["reviewSliceStatus", "missingReviewSliceFiles"],
    sourceArchitectureStatus: "blocked-pending-a06-source-fix",
    status: "source-architecture-blocked",
    summary:
      "mathSceneV2CompletionStatus:status=source-architecture-blocked:source=blocked-pending-a06-source-fix:sourceBlockers=reviewSliceStatus,missingReviewSliceFiles"
  };
  const audit = buildMathSceneV2ObjectiveCompletionAudit({
    completionStatus: blockedCompletionStatus,
    crossAgentHandoff: crossAgentHandoffFixture,
    evidenceIntake: evidenceIntakeFixture,
    teachingFinalDecisionIntake: teachingFinalDecisionIntakeFixture
  });
  const attributes = mathSceneV2ObjectiveCompletionAuditDataAttributes(audit);

  assert.deepEqual(audit.sourceArchitectureBlockerReasons, ["reviewSliceStatus", "missingReviewSliceFiles"]);
  assert.equal(audit.sourceArchitectureBlockerReasonManifest, "reviewSliceStatus,missingReviewSliceFiles");
  assert.match(audit.summary, /sourceBlockers=reviewSliceStatus,missingReviewSliceFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-objective-audit-source-architecture-blocker-reasons"],
    "reviewSliceStatus,missingReviewSliceFiles"
  );
});
