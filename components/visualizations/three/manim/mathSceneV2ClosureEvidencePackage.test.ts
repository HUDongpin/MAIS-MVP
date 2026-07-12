import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMathSceneV2ClosureEvidencePackage,
  mathSceneV2ClosureEvidencePackageDataAttributes,
  MATH_SCENE_V2_CLOSURE_EVIDENCE_PACKAGE_SOURCE_CONTRACT
} from "./mathSceneV2ClosureEvidencePackage";
import {
  type MathSceneV2ObjectiveCompletionAudit,
  MATH_SCENE_V2_OBJECTIVE_COMPLETION_AUDIT_SOURCE_CONTRACT
} from "./mathSceneV2ObjectiveCompletionAudit";
import {
  type MathSceneV2OwnerEvidenceActionRequest,
  type MathSceneV2OwnerEvidenceRequestPacket,
  MATH_SCENE_V2_OWNER_EVIDENCE_REQUEST_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2OwnerEvidenceRequestPacket";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";

type OwnerActionRequestFixture = Pick<
  MathSceneV2OwnerEvidenceActionRequest,
  "action" | "actionId" | "blockingItems" | "missingEvidenceIds" | "supportingAgentIds" | "workstreamId"
>;

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
const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  "data-viz-manim-run-from-beat-checkpoint-invalidated-keys,data-viz-manim-run-from-beat-checkpoint-invalidates-count,data-viz-manim-run-from-beat-checkpoint-invalidation-summary,data-viz-manim-run-from-beat-checkpoint-restore-action,data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore";
const a11RequiredRootDataAttributeCount = 5;

const objectiveAuditFixture: MathSceneV2ObjectiveCompletionAudit = {
  a06SourceBlockedConfirmationCount: 0,
  a06SourceConfirmedDecisionCount: 60,
  a06SourceConfirmationMismatchReasons: [],
  a06SourceConfirmationStatus: "a06-source-confirmed-a18-pending",
  a06SourceConfirmationSummary:
    "a06TeachingSourceConfirmationLedger:status=a06-source-confirmed-a18-pending:confirmed=60/60:pendingA18=60",
  a06SourcePendingA18DecisionCount: 60,
  a11RequiredRootDataAttributeCount,
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
  canMarkThreadGoalComplete: false,
  finalOwnerClosureCanComplete: true,
  finalOwnerClosureOwnerGateA06SourceStatusManifest: "not-attached",
  finalOwnerClosurePacketStatus: "not-attached",
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames: [],
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest: "not-attached",
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds: "not-attached",
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest: "not-attached",
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest: "not-attached",
  finalOwnerClosureSubmissionBridgeVerifiedClosureStatus: "not-attached",
  incompleteRequirementCount: 3,
  missingOwnerEvidenceCount: 22,
  missingOwnerEvidenceSummary: "A11=6;A22=6;A18+A06=10",
  ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
  ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
  provenRequirementCount: 1,
  remainingOwnerAgentIds: ["A11", "A18", "A22"],
  requirementCount: 4,
  requirements: [
    {
      blockingItems: [],
      evidenceCounts: {
        fileCount: 387,
        reviewPackageCount: 8,
        unclassifiedFileCount: 0
      },
      evidenceSummary: "packages=8;files=387;unclassified=0",
      evidenceVerdict: "current-evidence-proves-requirement",
      id: "a06-review-package-split",
      objectiveText: "A06 splits the Manim v2 runtime into reviewable source packages.",
      ownerAgentIds: ["A06"],
      requiredActions: [],
      status: "proven",
      supportingAgentIds: []
    },
    {
      blockingItems: ["a11-broad-visualization-value-suite-red"],
      evidenceCounts: {
        broadGateRed: 1,
        hkGradePackageCount: 14,
        hkGradeSplitPassed: 1,
        missingHkPackageCount: 0
      },
      evidenceSummary: "hkSplit=passed;broad=red-needs-a11-a22-follow-up;missing=0",
      evidenceVerdict: "missing-owner-evidence",
      id: "a11-browser-visual-interaction-regression",
      objectiveText:
        "A11 completes browser visual and interaction regression for Visualization Lab / Manim v2.",
      ownerAgentIds: ["A06", "A11"],
      requiredActions: [
        "adopt-hk-grade-split-packages",
        "keep-non-hk-tracks-out-of-hk-demo-sweep",
        "update-projection-views-expected-list"
      ],
      status: "owner-action-required",
      supportingAgentIds: ["A22"]
    },
    {
      blockingItems: ["a18-final-teaching-signoff-open"],
      evidenceCounts: {
        pendingA18Count: 12,
        readyProofPointCount: 108,
        sceneCount: 12
      },
      evidenceSummary:
        "status=pending-a18-final-review;scenes=12;pendingA18=12;proofPoints=108/108",
      evidenceVerdict: "pending-a18-final-decisions",
      id: "a18-a06-teaching-quality-confirmation",
      objectiveText: "A18/A06 confirm concrete mathematical scene teaching quality.",
      ownerAgentIds: ["A06", "A18"],
      requiredActions: [
        "complete-a18-final-criterion-decisions",
        "complete-a18-final-scene-signoff",
        "inspect-rendered-scene-targets",
        "open-rendered-review-routes",
        "record-approve-or-revision-decision"
      ],
      status: "owner-action-required",
      supportingAgentIds: ["A06"]
    },
    {
      blockingItems: ["a22-release-preflight-disk-blocked"],
      evidenceCounts: {
        blockerCount: 2,
        productionDeployAllowed: 0,
        prunedStagingPassed: 1
      },
      evidenceSummary:
        "status=release-blocked;preflight=disk-blocked;root=dirty-root-blocked;pruned=passed",
      evidenceVerdict: "owner-gate-blocked",
      id: "a22-clean-release-gate",
      objectiveText: "A22 completes clean-worktree or reviewed-slice build and release gates.",
      ownerAgentIds: ["A22"],
      requiredActions: [
        "investigate-isolated-next-chunk-serving-after-broad-timeout",
        "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
        "run-a22-generated-artifact-cleanup-after-preserving-evidence"
      ],
      status: "blocked-owner-action",
      supportingAgentIds: ["A11"]
    }
  ],
  reviewSliceConsumerGateEvidenceIdManifest:
    "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
  reviewSliceCount: 20,
  reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2ClosureEvidencePackage.ts|mathSceneV2CompletionRerunPlan.ts",
  reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
  reviewSliceSummary: "20@24",
  sourceArchitectureBlockerReasonManifest: "none",
  sourceArchitectureBlockerReasons: [],
  sourceContract: MATH_SCENE_V2_OBJECTIVE_COMPLETION_AUDIT_SOURCE_CONTRACT,
  status: "not-complete",
  summary:
    "mathSceneV2ObjectiveCompletionAudit:status=not-complete:proven=1/4:missingEvidence=22:missingOwners=A11=6;A22=6;A18+A06=10:remainingOwners=A11,A18,A22"
};

function ownerActionRequest({
  action,
  actionId,
  blockingItems,
  missingEvidenceIds,
  supportingAgentIds,
  workstreamId
}: OwnerActionRequestFixture): MathSceneV2OwnerEvidenceActionRequest {
  return {
    acceptanceCriteria: [`${action} acceptance evidence is recorded before closure.`],
    action,
    actionId,
    blockingItems,
    evidenceRecordTemplates: missingEvidenceIds.map((evidenceId) => ({
      actionId,
      evidenceId,
      ownerAgentIds:
        workstreamId === "a18-a06-teaching-quality-confirmation" ? ["A06", "A18"] : [actionId.startsWith("a22") ? "A22" : "A06", "A11"],
      status: "accepted"
    })),
    missingEvidenceIds,
    prerequisiteEvidenceSourceIds: ["mathSceneV2CrossAgentHandoff"],
    sourceOwnerAgentIds:
      workstreamId === "a18-a06-teaching-quality-confirmation" ? ["A06", "A18"] : actionId.startsWith("a22") ? ["A22"] : ["A06", "A11"],
    supportingAgentIds,
    workstreamId
  };
}

const ownerEvidenceRequestPacketFixture: MathSceneV2OwnerEvidenceRequestPacket = {
  a06SourceBlockedConfirmationCount: 0,
  a06SourceConfirmationCanCompleteA18Gate: false,
  a06SourceConfirmationMismatchReasons: [],
  a06SourceConfirmationSourceContract:
    "A06 teaching source confirmation ledger: confirms source evidence for every concrete MAIS Manim criterion while keeping A18 final decisions pending",
  a06SourceConfirmationStatus: "a06-source-confirmed-a18-pending",
  a06SourceConfirmationSummary:
    "a06TeachingSourceConfirmationLedger:status=a06-source-confirmed-a18-pending:confirmed=60/60:pendingA18=60",
  a06SourceConfirmedDecisionCount: 60,
  a06SourcePendingA18DecisionCount: 60,
  a11RequiredRootDataAttributeCount,
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
  actionRequestCount: 11,
  duplicateEvidenceIds: [],
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
  missingEvidenceCount: 22,
  ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
  ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
  ownerAgentIds: ["A11", "A18", "A22"],
  ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
  ownerPacketCount: 3,
  ownerPackets: [
    {
      actionRequestCount: 3,
      actionRequests: [
        ownerActionRequest({
          action: "adopt-hk-grade-split-packages",
          actionId: "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages",
          blockingItems: ["a11-broad-visualization-value-suite-red"],
          missingEvidenceIds: [
            "visualizationBrowserRegressionEvidence",
            "a11-hk-grade-split-package-rerun"
          ],
          supportingAgentIds: ["A06", "A22"],
          workstreamId: "a11-browser-visual-interaction-regression"
        }),
        ownerActionRequest({
          action: "keep-non-hk-tracks-out-of-hk-demo-sweep",
          actionId: "a11-browser-visual-interaction-regression:keep-non-hk-tracks-out-of-hk-demo-sweep",
          blockingItems: ["a11-broad-visualization-value-suite-red"],
          missingEvidenceIds: [
            "a11-hk-demo-sweep-scope-evidence",
            "visualizationBrowserRegressionPackages"
          ],
          supportingAgentIds: ["A06", "A22"],
          workstreamId: "a11-browser-visual-interaction-regression"
        }),
        ownerActionRequest({
          action: "update-projection-views-expected-list",
          actionId: "a11-browser-visual-interaction-regression:update-projection-views-expected-list",
          blockingItems: ["a11-broad-visualization-value-suite-red"],
          missingEvidenceIds: [
            "a11-projection-views-contract-update",
            "a11-premium-route-rerun"
          ],
          supportingAgentIds: ["A06", "A22"],
          workstreamId: "a11-browser-visual-interaction-regression"
        })
      ],
      missingEvidenceCount: 6,
      ownerAgentId: "A11",
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureFutureInvocationScope: "not-attached",
      sourceArchitectureHandoffStatus: "not-attached",
      submissionRecordTemplateCount: 0,
      submissionRecordTemplates: [],
      supportingAgentIds: ["A06", "A22"]
    },
    {
      actionRequestCount: 5,
      actionRequests: [
        ownerActionRequest({
          action: "complete-a18-final-criterion-decisions",
          actionId: "a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions",
          blockingItems: ["a18-final-teaching-signoff-open"],
          missingEvidenceIds: [
            "mathSceneTeachingFinalDecisionLedger",
            "a18-final-criterion-decision-record"
          ],
          supportingAgentIds: ["A06"],
          workstreamId: "a18-a06-teaching-quality-confirmation"
        }),
        ownerActionRequest({
          action: "complete-a18-final-scene-signoff",
          actionId: "a18-a06-teaching-quality-confirmation:complete-a18-final-scene-signoff",
          blockingItems: ["a18-final-teaching-signoff-open"],
          missingEvidenceIds: [
            "mathSceneTeachingSignoffMatrix",
            "a18-final-scene-signoff-record"
          ],
          supportingAgentIds: ["A06"],
          workstreamId: "a18-a06-teaching-quality-confirmation"
        }),
        ownerActionRequest({
          action: "inspect-rendered-scene-targets",
          actionId: "a18-a06-teaching-quality-confirmation:inspect-rendered-scene-targets",
          blockingItems: ["a18-final-teaching-signoff-open"],
          missingEvidenceIds: [
            "mathSceneTeachingInspectionTargets",
            "a18-rendered-scene-target-review"
          ],
          supportingAgentIds: ["A06"],
          workstreamId: "a18-a06-teaching-quality-confirmation"
        }),
        ownerActionRequest({
          action: "open-rendered-review-routes",
          actionId: "a18-a06-teaching-quality-confirmation:open-rendered-review-routes",
          blockingItems: ["a18-final-teaching-signoff-open"],
          missingEvidenceIds: [
            "mathSceneTeachingRenderedReviewRoutes",
            "a18-rendered-route-inspection-notes"
          ],
          supportingAgentIds: ["A06"],
          workstreamId: "a18-a06-teaching-quality-confirmation"
        }),
        ownerActionRequest({
          action: "record-approve-or-revision-decision",
          actionId: "a18-a06-teaching-quality-confirmation:record-approve-or-revision-decision",
          blockingItems: ["a18-final-teaching-signoff-open"],
          missingEvidenceIds: [
            "mathSceneTeachingFinalReviewPacket",
            "a18-final-approve-or-revision-decisions"
          ],
          supportingAgentIds: ["A06"],
          workstreamId: "a18-a06-teaching-quality-confirmation"
        })
      ],
      missingEvidenceCount: 10,
      ownerAgentId: "A18",
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureFutureInvocationScope: "not-attached",
      sourceArchitectureHandoffStatus: "not-attached",
      submissionRecordTemplateCount: 0,
      submissionRecordTemplates: [],
      supportingAgentIds: ["A06"]
    },
    {
      actionRequestCount: 3,
      actionRequests: [
        ownerActionRequest({
          action: "investigate-isolated-next-chunk-serving-after-broad-timeout",
          actionId: "a22-clean-release-gate:investigate-isolated-next-chunk-serving-after-broad-timeout",
          blockingItems: ["a22-release-preflight-disk-blocked"],
          missingEvidenceIds: [
            "a22-isolated-next-chunk-serving-report",
            "a11-broad-suite-rerun-evidence"
          ],
          supportingAgentIds: ["A11"],
          workstreamId: "a22-clean-release-gate"
        }),
        ownerActionRequest({
          action: "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
          actionId: "a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice",
          blockingItems: ["a22-release-preflight-disk-blocked"],
          missingEvidenceIds: [
            "mathSceneV2ReleaseSliceManifest",
            "a22-clean-worktree-or-pruned-staging-build-report"
          ],
          supportingAgentIds: ["A11"],
          workstreamId: "a22-clean-release-gate"
        }),
        ownerActionRequest({
          action: "run-a22-generated-artifact-cleanup-after-preserving-evidence",
          actionId: "a22-clean-release-gate:run-a22-generated-artifact-cleanup-after-preserving-evidence",
          blockingItems: ["a22-release-preflight-disk-blocked"],
          missingEvidenceIds: [
            "a22-generated-artifact-cleanup-report",
            "a22-release-preflight-rerun"
          ],
          supportingAgentIds: ["A11"],
          workstreamId: "a22-clean-release-gate"
        })
      ],
      missingEvidenceCount: 6,
      ownerAgentId: "A22",
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureFutureInvocationScope: "not-attached",
      sourceArchitectureHandoffStatus: "not-attached",
      submissionRecordTemplateCount: 0,
      submissionRecordTemplates: [],
      supportingAgentIds: ["A11"]
    }
  ],
  reviewSliceConsumerGateEvidenceIdManifest:
    "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
  reviewSliceCount: 20,
  reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2ClosureEvidencePackage.ts|mathSceneV2CompletionRerunPlan.ts",
  reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
  reviewSliceSummary: "20@24",
  sourceArchitectureBulkCourseGenerationAllowed: false,
  sourceArchitectureBlockerReasonManifest: "none",
  sourceArchitectureBlockerReasons: [],
  sourceArchitectureFutureInvocationScope: "not-attached",
  sourceArchitectureHandoffStatus: "not-attached",
  sourceArchitectureOpenOwnerGateIds: [],
  sourceArchitectureRequiredOwnerGateIds: [],
  sourceArchitectureSourceContract: "not-attached",
  sourceArchitectureSummary: "not-attached",
  sourceContract: MATH_SCENE_V2_OWNER_EVIDENCE_REQUEST_PACKET_SOURCE_CONTRACT,
  status: "pending-owner-evidence",
  submissionRecordTemplateCount: 0,
  submissionRecordTemplates: [],
  summary:
    "mathSceneV2OwnerEvidenceRequestPacket:status=pending-owner-evidence:owners=A11,A18,A22:actions=11:missingEvidence=22:invalidEvidence=0:duplicateEvidence=none"
};

function closurePackageFixture(
  options: { duplicateFirstRequiredEvidence?: boolean; ownerEvidenceCovered?: boolean } = {}
) {
  const ownerEvidenceRequestPacket: MathSceneV2OwnerEvidenceRequestPacket = options.duplicateFirstRequiredEvidence
    ? {
        ...ownerEvidenceRequestPacketFixture,
        duplicateEvidenceIds: ["visualizationBrowserRegressionEvidence"],
        invalidEvidenceRecordCount: 2,
        invalidOwnerAgentIds: ["A11"],
        status: "blocked-invalid-owner-evidence",
        summary:
          "mathSceneV2OwnerEvidenceRequestPacket:status=blocked-invalid-owner-evidence:owners=A11,A18,A22:actions=11:missingEvidence=22:invalidEvidence=2:duplicateEvidence=visualizationBrowserRegressionEvidence"
      }
    : options.ownerEvidenceCovered
      ? {
          ...ownerEvidenceRequestPacketFixture,
          actionRequestCount: 0,
          missingEvidenceCount: 0,
          ownerAgentIds: [],
          ownerPacketCount: 0,
          ownerPackets: [],
          status: "owner-evidence-covered",
          summary:
            "mathSceneV2OwnerEvidenceRequestPacket:status=owner-evidence-covered:owners=none:actions=0:missingEvidence=0:invalidEvidence=0:duplicateEvidence=none"
        }
      : ownerEvidenceRequestPacketFixture;

  return buildMathSceneV2ClosureEvidencePackage({
    objectiveAudit: objectiveAuditFixture,
    ownerEvidenceRequestPacket
  });
}

test("MAIS Manim v2 closure evidence package maps unfinished objective rows to owner packets", () => {
  const closurePackage = closurePackageFixture();
  const ownerRowsById = Object.fromEntries(closurePackage.ownerRows.map((row) => [row.ownerAgentId, row]));

  assert.equal(closurePackage.sourceContract, MATH_SCENE_V2_CLOSURE_EVIDENCE_PACKAGE_SOURCE_CONTRACT);
  assert.equal(closurePackage.status, "owner-closure-required");
  assert.equal(closurePackage.requirementCount, 4);
  assert.equal(closurePackage.provenRequirementCount, 1);
  assert.equal(closurePackage.incompleteRequirementCount, 3);
  assert.equal(closurePackage.ownerRowCount, 3);
  assert.equal(closurePackage.actionRequestCount, 11);
  assert.equal(closurePackage.missingEvidenceCount, 22);
  assert.equal(closurePackage.canMarkThreadGoalComplete, false);
  assert.deepEqual(closurePackage.remainingOwnerAgentIds, ["A11", "A18", "A22"]);

  assert.deepEqual(ownerRowsById.A11.requirementIds, ["a11-browser-visual-interaction-regression"]);
  assert.equal(ownerRowsById.A11.actionRequestCount, 3);
  assert.equal(ownerRowsById.A11.missingEvidenceCount, 6);
  assert.deepEqual(ownerRowsById.A11.evidenceVerdicts, ["missing-owner-evidence"]);
  assert.ok(ownerRowsById.A11.requiredActions.includes("update-projection-views-expected-list"));

  assert.deepEqual(ownerRowsById.A18.requirementIds, ["a18-a06-teaching-quality-confirmation"]);
  assert.equal(ownerRowsById.A18.actionRequestCount, 5);
  assert.equal(ownerRowsById.A18.missingEvidenceCount, 10);
  assert.deepEqual(ownerRowsById.A18.evidenceVerdicts, ["pending-a18-final-decisions"]);
  assert.ok(ownerRowsById.A18.supportingAgentIds.includes("A06"));

  assert.deepEqual(ownerRowsById.A22.requirementIds, ["a22-clean-release-gate"]);
  assert.equal(ownerRowsById.A22.actionRequestCount, 3);
  assert.equal(ownerRowsById.A22.missingEvidenceCount, 6);
  assert.deepEqual(ownerRowsById.A22.evidenceVerdicts, ["owner-gate-blocked"]);
  assert.ok(ownerRowsById.A22.blockingItems.includes("a22-release-preflight-disk-blocked"));
});

test("MAIS Manim v2 closure evidence package keeps owner gate rows after evidence is covered", () => {
  const closurePackage = closurePackageFixture({ ownerEvidenceCovered: true });
  const ownerRowsById = Object.fromEntries(closurePackage.ownerRows.map((row) => [row.ownerAgentId, row]));

  assert.equal(closurePackage.status, "owner-closure-required");
  assert.equal(closurePackage.requirementCount, 4);
  assert.equal(closurePackage.provenRequirementCount, 1);
  assert.equal(closurePackage.incompleteRequirementCount, 3);
  assert.equal(closurePackage.ownerRowCount, 3);
  assert.equal(closurePackage.actionRequestCount, 0);
  assert.equal(closurePackage.missingEvidenceCount, 0);
  assert.equal(closurePackage.canMarkThreadGoalComplete, false);
  assert.deepEqual(closurePackage.remainingOwnerAgentIds, ["A11", "A18", "A22"]);

  assert.deepEqual(ownerRowsById.A11.requirementIds, ["a11-browser-visual-interaction-regression"]);
  assert.equal(ownerRowsById.A11.actionRequestCount, 0);
  assert.equal(ownerRowsById.A11.missingEvidenceCount, 0);
  assert.deepEqual(ownerRowsById.A11.evidenceVerdicts, ["missing-owner-evidence"]);
  assert.ok(ownerRowsById.A11.requiredActions.includes("adopt-hk-grade-split-packages"));

  assert.deepEqual(ownerRowsById.A18.requirementIds, ["a18-a06-teaching-quality-confirmation"]);
  assert.equal(ownerRowsById.A18.actionRequestCount, 0);
  assert.equal(ownerRowsById.A18.missingEvidenceCount, 0);
  assert.deepEqual(ownerRowsById.A18.evidenceVerdicts, ["pending-a18-final-decisions"]);
  assert.ok(ownerRowsById.A18.supportingAgentIds.includes("A06"));

  assert.deepEqual(ownerRowsById.A22.requirementIds, ["a22-clean-release-gate"]);
  assert.equal(ownerRowsById.A22.actionRequestCount, 0);
  assert.equal(ownerRowsById.A22.missingEvidenceCount, 0);
  assert.deepEqual(ownerRowsById.A22.evidenceVerdicts, ["owner-gate-blocked"]);
  assert.ok(ownerRowsById.A22.blockingItems.includes("a22-release-preflight-disk-blocked"));
});

test("MAIS Manim v2 closure evidence package surfaces invalid owner evidence before owner closure", () => {
  const closurePackage = closurePackageFixture({ duplicateFirstRequiredEvidence: true });
  const attributes = mathSceneV2ClosureEvidencePackageDataAttributes(closurePackage);
  const duplicateEvidenceIds = closurePackage.duplicateEvidenceIds ?? [];
  const duplicateEvidenceId = duplicateEvidenceIds[0];

  assert.equal(closurePackage.status, "blocked-invalid-owner-evidence");
  assert.equal(closurePackage.invalidEvidenceRecordCount, 2);
  assert.equal(duplicateEvidenceIds.length, 1);
  assert.ok(duplicateEvidenceId);
  assert.deepEqual(closurePackage.invalidOwnerAgentIds, ["A11"]);
  assert.equal(attributes["data-viz-manim-v2-closure-package-status"], "blocked-invalid-owner-evidence");
  assert.equal(attributes["data-viz-manim-v2-closure-package-invalid-record-count"], "2");
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-duplicate-evidence-ids"],
    duplicateEvidenceId
  );
  assert.equal(attributes["data-viz-manim-v2-closure-package-invalid-owners"], "A11");
  assert.match(closurePackage.summary, /invalidEvidence=2/);
});

test("MAIS Manim v2 closure evidence package serializes stable handoff attributes", () => {
  const closurePackage = closurePackageFixture();
  const attributes = mathSceneV2ClosureEvidencePackageDataAttributes(closurePackage);

  assert.equal(classifyManimReviewPackage("mathSceneV2ClosureEvidencePackage.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-source-contract"],
    MATH_SCENE_V2_CLOSURE_EVIDENCE_PACKAGE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-closure-package-status"], "owner-closure-required");
  assert.equal(attributes["data-viz-manim-v2-closure-package-proven"], "1/4");
  assert.equal(attributes["data-viz-manim-v2-closure-package-owner-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-closure-package-action-count"], "11");
  assert.equal(attributes["data-viz-manim-v2-closure-package-missing-evidence-count"], "22");
  assert.equal(
    (closurePackage as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    ownerEvidenceRequestPacketFixture.ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-owner-action-evidence-count-manifest"],
    ownerEvidenceRequestPacketFixture.ownerActionEvidenceCountManifest
  );
  assert.equal(
    (closurePackage as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    ownerEvidenceRequestPacketFixture.ownerEvidenceRequirementManifest
  );
  assert.equal(
    (closurePackage as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequestPacketFixture.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-owner-evidence-requirement-manifest"],
    ownerEvidenceRequestPacketFixture.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-owner-acceptance-criteria-manifest"],
    ownerEvidenceRequestPacketFixture.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (closurePackage as { reviewSliceCount?: number }).reviewSliceCount,
    ownerEvidenceRequestPacketFixture.reviewSliceCount
  );
  assert.equal(
    (closurePackage as { reviewSliceIds?: string }).reviewSliceIds,
    ownerEvidenceRequestPacketFixture.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-review-slice-count"],
    String(ownerEvidenceRequestPacketFixture.reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-review-slice-ids"],
    ownerEvidenceRequestPacketFixture.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-review-slice-file-manifest"],
    ownerEvidenceRequestPacketFixture.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-review-slice-consumer-gate-evidence-id-manifest"],
    ownerEvidenceRequestPacketFixture.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.match(closurePackage.summary, /reviewSlices=20@24/);
  assert.equal(attributes["data-viz-manim-v2-closure-package-remaining-owners"], "A11,A18,A22");
  assert.equal(attributes["data-viz-manim-v2-closure-package-can-complete"], "false");
});

test("MAIS Manim v2 closure evidence package carries submission-bridge verified-closure gate manifests", () => {
  const closurePackage = closurePackageFixture();
  const attributes = mathSceneV2ClosureEvidencePackageDataAttributes(closurePackage);

  assert.deepEqual(
    (closurePackage as { finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames?: string[] })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames,
    [...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames]
  );
  assert.equal(
    (closurePackage as { finalObjectiveSubmissionBridgeVerifiedClosureGateIds?: string })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds
  );
  assert.equal(
    (closurePackage as { finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest?: string })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-closure-package-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-closure-package-final-objective-submission-bridge-verified-closure-status"
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureStatus
  );
  assert.match(closurePackage.summary, /submissionBridgeVerifiedClosure=complete/);
});

test("MAIS Manim v2 closure evidence package carries owner-evidence source-architecture constraints", () => {
  const ownerEvidenceRequestPacket: MathSceneV2OwnerEvidenceRequestPacket = {
    ...ownerEvidenceRequestPacketFixture,
    ownerPackets: ownerEvidenceRequestPacketFixture.ownerPackets.map((ownerPacket) => ({
      ...ownerPacket,
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open"
    })),
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
      "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false:futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice"
  };
  const closurePackage = buildMathSceneV2ClosureEvidencePackage({
    objectiveAudit: objectiveAuditFixture,
    ownerEvidenceRequestPacket
  });
  const attributes = mathSceneV2ClosureEvidencePackageDataAttributes(closurePackage);

  assert.equal(closurePackage.sourceArchitectureHandoffStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(closurePackage.sourceArchitectureBulkCourseGenerationAllowed, false);
  assert.equal(
    closurePackage.sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(closurePackage.sourceArchitectureSourceContract, MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT);
  assert.deepEqual(closurePackage.sourceArchitectureOpenOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.ok(closurePackage.ownerRows.every((row) => row.sourceArchitectureBulkCourseGenerationAllowed === false));
  assert.ok(
    closurePackage.ownerRows.every(
      (row) =>
        row.sourceArchitectureFutureInvocationScope ===
        "one-topic-one-concept-cluster-or-one-review-slice"
    )
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-source-architecture-open-owner-gates"],
    "a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
  );
  assert.equal(
    attributes["data-viz-manim-v2-closure-package-source-architecture-owner-scope-manifest"],
    "A11=one-topic-one-concept-cluster-or-one-review-slice;A18=one-topic-one-concept-cluster-or-one-review-slice;A22=one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.match(closurePackage.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
});
