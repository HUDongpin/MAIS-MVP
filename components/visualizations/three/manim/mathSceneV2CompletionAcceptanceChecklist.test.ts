import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMathSceneV2CompletionAcceptanceChecklist,
  mathSceneV2CompletionAcceptanceChecklistDataAttributes,
  MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT
} from "./mathSceneV2CompletionAcceptanceChecklist";
import {
  MATH_SCENE_V2_COMPLETION_CLOSURE_QUEUE_SOURCE_CONTRACT,
  type MathSceneV2CompletionClosureAction,
  type MathSceneV2CompletionClosureQueue,
  type MathSceneV2CompletionClosureWorkstream
} from "./mathSceneV2CompletionClosureQueue";
import type { MathSceneV2CrossAgentHandoffRowStatus } from "./mathSceneV2CrossAgentHandoff";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";

const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  "data-viz-manim-run-from-beat-checkpoint-invalidated-keys,data-viz-manim-run-from-beat-checkpoint-invalidates-count,data-viz-manim-run-from-beat-checkpoint-invalidation-summary,data-viz-manim-run-from-beat-checkpoint-restore-action,data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore";
const a11RequiredRootDataAttributeCount = 5;

type ClosureWorkstreamFixture = {
  actions: readonly string[];
  blockingItems: readonly string[];
  evidenceCounts: Record<string, number>;
  evidenceSourceIds: readonly string[];
  evidenceSummary: string;
  ownerAgentIds: readonly string[];
  status: MathSceneV2CrossAgentHandoffRowStatus;
  supportingAgentIds: readonly string[];
  workstreamId: MathSceneV2GoalGateId;
};

function closureActionFixture(
  workstream: ClosureWorkstreamFixture,
  action: string
): MathSceneV2CompletionClosureAction {
  return {
    action,
    actionId: `${workstream.workstreamId}:${action}`,
    blockingItems: [...workstream.blockingItems],
    canA06CloseWithoutOwnerAction: false,
    evidenceCounts: workstream.evidenceCounts,
    evidenceSourceIds: [...workstream.evidenceSourceIds],
    evidenceSummary: workstream.evidenceSummary,
    ownerAgentIds: workstream.ownerAgentIds,
    status: "open-owner-action",
    supportingAgentIds: workstream.supportingAgentIds,
    workstreamId: workstream.workstreamId,
    workstreamStatus: workstream.status
  };
}

function closureWorkstreamFixture(workstream: ClosureWorkstreamFixture): MathSceneV2CompletionClosureWorkstream {
  const actions = workstream.actions.map((action) => closureActionFixture(workstream, action));

  return {
    actionCount: actions.length,
    actions,
    blockingItemCount: workstream.blockingItems.length,
    evidenceSummary: workstream.evidenceSummary,
    ownerAgentIds: workstream.ownerAgentIds,
    status: workstream.status,
    supportingAgentIds: workstream.supportingAgentIds,
    workstreamId: workstream.workstreamId
  };
}

function ownerActionManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=owners:${action.ownerAgentIds.join("+")};status:${action.status};workstream:${action.workstreamStatus}`)
    .join("|") || "none";
}

function ownerActionEvidenceSourceManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=sources:${action.evidenceSourceIds.join("+") || "none"}`)
    .join("|") || "none";
}

function ownerActionEvidenceCountManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => {
      const evidenceCounts = Object.entries(action.evidenceCounts)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${key}=${value}`)
        .join("+");
      return `${action.actionId}=counts:${evidenceCounts || "none"}`;
    })
    .join("|") || "none";
}

function ownerActionEvidenceSummaryManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=summary:${action.evidenceSummary}`)
    .join("|") || "none";
}

function ownerActionBlockerManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=blockers:${action.blockingItems.join("+") || "none"}`)
    .join("|") || "none";
}

function ownerActionSupportManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=support:${action.supportingAgentIds.join("+") || "none"}`)
    .join("|") || "none";
}

function ownerActionLabelManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=label:${action.action}`)
    .join("|") || "none";
}

function closureQueueFixture(): MathSceneV2CompletionClosureQueue {
  const workstreams = [
    closureWorkstreamFixture({
      actions: [
        "adopt-hk-grade-split-packages",
        "update-projection-views-expected-list",
        "keep-non-hk-tracks-out-of-hk-demo-sweep"
      ],
      blockingItems: ["a11-browser-regression-evidence-missing"],
      evidenceCounts: {
        broadGateRed: 1,
        hkGradePackageCount: 6,
        hkGradePassedCount: 0
      },
      evidenceSourceIds: [
        "visualizationBrowserRegressionEvidence",
        "visualizationBrowserRegressionPackages",
        "mathSceneV2CrossAgentHandoff"
      ],
      evidenceSummary: "a11-browser-regression=pending",
      ownerAgentIds: ["A11"],
      status: "owner-action-required",
      supportingAgentIds: ["A06", "A22"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    closureWorkstreamFixture({
      actions: [
        "investigate-isolated-next-chunk-serving-after-broad-timeout",
        "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
        "run-a22-generated-artifact-cleanup-after-preserving-evidence"
      ],
      blockingItems: ["a22-clean-release-evidence-missing"],
      evidenceCounts: {
        releaseReady: 0,
        releaseSliceForbiddenFileCount: 0,
        releaseSliceFileCount: 387
      },
      evidenceSourceIds: [
        "visualizationReleaseReadinessEvidence",
        "mathSceneV2ReleaseSliceManifest",
        "mathSceneV2CrossAgentHandoff"
      ],
      evidenceSummary: "a22-clean-release=pending",
      ownerAgentIds: ["A22"],
      status: "release-blocked",
      supportingAgentIds: ["A06", "A11"],
      workstreamId: "a22-clean-release-gate"
    }),
    closureWorkstreamFixture({
      actions: [
        "open-rendered-review-routes",
        "inspect-rendered-scene-targets",
        "complete-a18-final-criterion-decisions",
        "complete-a18-final-scene-signoff",
        "record-approve-or-revision-decision"
      ],
      blockingItems: ["a18-final-teaching-signoff-missing"],
      evidenceCounts: {
        finalDecisionCount: 60,
        pendingDecisionCount: 60,
        renderedRouteCount: 12
      },
      evidenceSourceIds: [
        "mathSceneTeachingRenderedReviewRoutes",
        "mathSceneTeachingFinalReviewPacket",
        "mathSceneTeachingFinalDecisionLedger",
        "mathSceneTeachingReviewDossier",
        "mathSceneV2CrossAgentHandoff"
      ],
      evidenceSummary: "a18-teaching-quality=pending",
      ownerAgentIds: ["A18", "A06"],
      status: "final-signoff-required",
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    })
  ];
  const actions = workstreams.flatMap((workstream) => workstream.actions);

  return {
    a06CloseableActionCount: 0,
    a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    actionCount: actions.length,
    actions,
    canMarkThreadGoalComplete: false,
    externalOwnerActionCount: actions.length,
    ownerActionBlockerManifest: ownerActionBlockerManifest(actions),
    ownerActionEvidenceCountManifest: ownerActionEvidenceCountManifest(actions),
    ownerActionEvidenceSourceManifest: ownerActionEvidenceSourceManifest(actions),
    ownerActionEvidenceSummaryManifest: ownerActionEvidenceSummaryManifest(actions),
    ownerActionLabelManifest: ownerActionLabelManifest(actions),
    ownerActionManifest: ownerActionManifest(actions),
    ownerActionSupportManifest: ownerActionSupportManifest(actions),
    openWorkstreamCount: workstreams.length,
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 20,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2CompletionAcceptanceChecklist.ts",
    reviewSliceIds: "manim-review-slice-01",
    reviewSliceSummary: "20@24",
    sourceArchitectureBlockerReasonManifest: "none",
    sourceArchitectureBlockerReasons: [],
    sourceContract: MATH_SCENE_V2_COMPLETION_CLOSURE_QUEUE_SOURCE_CONTRACT,
    status: "owner-action-required",
    summary: "mathSceneV2CompletionClosureQueue:status=owner-action-required:actions=11:a06Closeable=0:externalOwner=11:a11-browser-visual-interaction-regression=3;a22-clean-release-gate=3;a18-a06-teaching-quality-confirmation=5",
    workstreams
  };
}

function acceptanceChecklistFixture() {
  return buildMathSceneV2CompletionAcceptanceChecklist(closureQueueFixture());
}

test("MAIS Manim v2 acceptance checklist gives every closure action explicit evidence requirements", () => {
  const checklist = acceptanceChecklistFixture();

  assert.equal(checklist.sourceContract, MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT);
  assert.equal(checklist.status, "pending-owner-evidence");
  assert.equal(checklist.actionCount, 11);
  assert.equal(checklist.pendingOwnerEvidenceCount, 11);
  assert.equal(checklist.acceptedOwnerEvidenceCount, 0);
  assert.equal(checklist.canMarkThreadGoalComplete, false);
  assert.equal(checklist.workstreamCount, 3);
  assert.deepEqual(checklist.workstreams.map((workstream) => workstream.actionCount), [3, 3, 5]);
  assert.ok(checklist.actions.every((action) => action.acceptanceCriteria.length > 0));
  assert.ok(checklist.actions.every((action) => action.verificationEvidenceIds.length > 0));
  assert.ok(checklist.actions.every((action) => action.prerequisiteEvidenceSourceIds.length > 0));
  assert.ok(checklist.actions.every((action) => action.ownerEvidenceStatus === "pending-owner-evidence"));
});

test("MAIS Manim v2 acceptance checklist names concrete A11, A22, and A18 evidence", () => {
  const checklist = acceptanceChecklistFixture();
  const rowsByActionId = Object.fromEntries(checklist.actions.map((action) => [action.actionId, action]));

  assert.match(
    rowsByActionId["a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages"].acceptanceCriteria.join(" "),
    /P1-S6 HK demo-safe/
  );
  assert.ok(
    rowsByActionId["a11-browser-visual-interaction-regression:update-projection-views-expected-list"].acceptanceCriteria.some(
      (criterion) => criterion.includes("projection-views")
    )
  );
  assert.ok(
    rowsByActionId["a11-browser-visual-interaction-regression:keep-non-hk-tracks-out-of-hk-demo-sweep"].verificationEvidenceIds.includes(
      "a11-hk-demo-sweep-scope-evidence"
    )
  );

  assert.match(
    rowsByActionId["a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice"].acceptanceCriteria.join(" "),
    /clean worktree or reviewed pruned-staging/
  );
  assert.ok(
    rowsByActionId["a22-clean-release-gate:run-a22-generated-artifact-cleanup-after-preserving-evidence"].verificationEvidenceIds.includes(
      "a22-generated-artifact-cleanup-report"
    )
  );

  assert.match(
    rowsByActionId["a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions"].acceptanceCriteria.join(" "),
    /60 criterion decisions/
  );
  assert.ok(
    rowsByActionId["a18-a06-teaching-quality-confirmation:record-approve-or-revision-decision"].verificationEvidenceIds.includes(
      "a18-final-approve-or-revision-decisions"
    )
  );
});

test("MAIS Manim v2 acceptance checklist serializes stable data attributes", () => {
  const checklist = acceptanceChecklistFixture();
  const attributes = mathSceneV2CompletionAcceptanceChecklistDataAttributes(checklist);
  const expectedOwnerActionEvidenceCountManifest = closureQueueFixture().ownerActionEvidenceCountManifest;

  assert.equal(classifyManimReviewPackage("mathSceneV2CompletionAcceptanceChecklist.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-completion-acceptance-source-contract"],
    MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-completion-acceptance-status"], "pending-owner-evidence");
  assert.equal(attributes["data-viz-manim-v2-completion-acceptance-action-count"], "11");
  assert.equal(attributes["data-viz-manim-v2-completion-acceptance-pending-count"], "11");
  assert.equal(attributes["data-viz-manim-v2-completion-acceptance-accepted-count"], "0");
  assert.equal(attributes["data-viz-manim-v2-completion-acceptance-can-complete"], "false");
  assert.equal(
    (checklist as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    expectedOwnerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-acceptance-owner-action-evidence-count-manifest"],
    expectedOwnerActionEvidenceCountManifest
  );
  assert.equal(
    (checklist as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (checklist as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-acceptance-a11-required-root-attribute-count"],
    String(a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-acceptance-a11-run-from-beat-checkpoint-invalidation-attributes"],
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.match(attributes["data-viz-manim-v2-completion-acceptance-summary"], /a11-browser-visual-interaction-regression=3/);
  assert.match(attributes["data-viz-manim-v2-completion-acceptance-summary"], /a22-clean-release-gate=3/);
  assert.match(attributes["data-viz-manim-v2-completion-acceptance-summary"], /a18-a06-teaching-quality-confirmation=5/);
});

test("MAIS Manim v2 acceptance checklist exposes owner evidence requirement manifests", () => {
  const checklist = acceptanceChecklistFixture();
  const attributes = mathSceneV2CompletionAcceptanceChecklistDataAttributes(checklist);

  const expectedRequirementManifest = [
    "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages=owners:A11;verification:visualizationBrowserRegressionEvidence+a11-hk-grade-split-package-rerun;prerequisites:visualizationBrowserRegressionEvidence+visualizationBrowserRegressionPackages+mathSceneV2CrossAgentHandoff",
    "a11-browser-visual-interaction-regression:update-projection-views-expected-list=owners:A11;verification:a11-projection-views-contract-update+a11-premium-route-rerun;prerequisites:visualizationBrowserRegressionEvidence+visualizationBrowserRegressionPackages+mathSceneV2CrossAgentHandoff",
    "a11-browser-visual-interaction-regression:keep-non-hk-tracks-out-of-hk-demo-sweep=owners:A11;verification:a11-hk-demo-sweep-scope-evidence+visualizationBrowserRegressionPackages;prerequisites:visualizationBrowserRegressionEvidence+visualizationBrowserRegressionPackages+mathSceneV2CrossAgentHandoff",
    "a22-clean-release-gate:investigate-isolated-next-chunk-serving-after-broad-timeout=owners:A22;verification:a22-isolated-next-chunk-serving-report+a11-broad-suite-rerun-evidence;prerequisites:visualizationReleaseReadinessEvidence+mathSceneV2ReleaseSliceManifest+mathSceneV2CrossAgentHandoff",
    "a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice=owners:A22;verification:mathSceneV2ReleaseSliceManifest+a22-clean-worktree-or-pruned-staging-build-report;prerequisites:visualizationReleaseReadinessEvidence+mathSceneV2ReleaseSliceManifest+mathSceneV2CrossAgentHandoff",
    "a22-clean-release-gate:run-a22-generated-artifact-cleanup-after-preserving-evidence=owners:A22;verification:a22-generated-artifact-cleanup-report+a22-release-preflight-rerun;prerequisites:visualizationReleaseReadinessEvidence+mathSceneV2ReleaseSliceManifest+mathSceneV2CrossAgentHandoff",
    "a18-a06-teaching-quality-confirmation:open-rendered-review-routes=owners:A18+A06;verification:mathSceneTeachingRenderedReviewRoutes+a18-rendered-route-inspection-notes;prerequisites:mathSceneTeachingRenderedReviewRoutes+mathSceneTeachingFinalReviewPacket+mathSceneTeachingFinalDecisionLedger+mathSceneTeachingReviewDossier+mathSceneV2CrossAgentHandoff",
    "a18-a06-teaching-quality-confirmation:inspect-rendered-scene-targets=owners:A18+A06;verification:mathSceneTeachingInspectionTargets+a18-rendered-scene-target-review;prerequisites:mathSceneTeachingRenderedReviewRoutes+mathSceneTeachingFinalReviewPacket+mathSceneTeachingFinalDecisionLedger+mathSceneTeachingReviewDossier+mathSceneV2CrossAgentHandoff",
    "a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions=owners:A18+A06;verification:mathSceneTeachingFinalDecisionLedger+a18-final-criterion-decision-record;prerequisites:mathSceneTeachingRenderedReviewRoutes+mathSceneTeachingFinalReviewPacket+mathSceneTeachingFinalDecisionLedger+mathSceneTeachingReviewDossier+mathSceneV2CrossAgentHandoff",
    "a18-a06-teaching-quality-confirmation:complete-a18-final-scene-signoff=owners:A18+A06;verification:mathSceneTeachingSignoffMatrix+a18-final-scene-signoff-record;prerequisites:mathSceneTeachingRenderedReviewRoutes+mathSceneTeachingFinalReviewPacket+mathSceneTeachingFinalDecisionLedger+mathSceneTeachingReviewDossier+mathSceneV2CrossAgentHandoff",
    "a18-a06-teaching-quality-confirmation:record-approve-or-revision-decision=owners:A18+A06;verification:mathSceneTeachingFinalReviewPacket+a18-final-approve-or-revision-decisions;prerequisites:mathSceneTeachingRenderedReviewRoutes+mathSceneTeachingFinalReviewPacket+mathSceneTeachingFinalDecisionLedger+mathSceneTeachingReviewDossier+mathSceneV2CrossAgentHandoff"
  ].join("|");

  assert.equal(
    (checklist as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    expectedRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-acceptance-owner-evidence-requirement-manifest"],
    expectedRequirementManifest
  );
  assert.match(
    (checklist as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest ?? "",
    /adopt-hk-grade-split-packages=criteria:A11 adopts the P1-S6 HK demo-safe split package plan/
  );
  assert.match(
    attributes["data-viz-manim-v2-completion-acceptance-owner-criteria-manifest"] ?? "",
    /complete-a18-final-criterion-decisions=criteria:A18 completes all 60 criterion decisions/
  );
});

test("MAIS Manim v2 acceptance checklist carries closure queue source-architecture blocker reasons", () => {
  const queue = closureQueueFixture();
  queue.sourceArchitectureBlockerReasonManifest = "reviewSliceStatus,forbiddenReleaseIncludes";
  queue.sourceArchitectureBlockerReasons = ["reviewSliceStatus", "forbiddenReleaseIncludes"];

  const checklist = buildMathSceneV2CompletionAcceptanceChecklist(queue);
  const attributes = mathSceneV2CompletionAcceptanceChecklistDataAttributes(checklist);

  assert.deepEqual(
    (checklist as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    ["reviewSliceStatus", "forbiddenReleaseIncludes"]
  );
  assert.equal(
    (checklist as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    "reviewSliceStatus,forbiddenReleaseIncludes"
  );
  assert.match((checklist as { summary?: string }).summary ?? "", /sourceBlockers=reviewSliceStatus,forbiddenReleaseIncludes/);
  assert.equal(
    attributes["data-viz-manim-v2-completion-acceptance-source-architecture-blocker-reasons"],
    "reviewSliceStatus,forbiddenReleaseIncludes"
  );
});

test("MAIS Manim v2 acceptance checklist carries closure queue review-slice provenance", () => {
  const queue = closureQueueFixture();
  const checklist = buildMathSceneV2CompletionAcceptanceChecklist(queue);
  const attributes = mathSceneV2CompletionAcceptanceChecklistDataAttributes(checklist);

  assert.equal((checklist as { reviewSliceCount?: number }).reviewSliceCount, queue.reviewSliceCount);
  assert.equal((checklist as { reviewSliceIds?: string }).reviewSliceIds, queue.reviewSliceIds);
  assert.equal((checklist as { reviewSliceFileManifest?: string }).reviewSliceFileManifest, queue.reviewSliceFileManifest);
  assert.equal(
    (checklist as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    queue.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal((checklist as { reviewSliceSummary?: string }).reviewSliceSummary, queue.reviewSliceSummary);
  assert.match((checklist as { summary?: string }).summary ?? "", /reviewSlices=20@24/);

  assert.equal(attributes["data-viz-manim-v2-completion-acceptance-review-slice-count"], "20");
  assert.equal(attributes["data-viz-manim-v2-completion-acceptance-review-slice-ids"], queue.reviewSliceIds);
  assert.equal(
    attributes["data-viz-manim-v2-completion-acceptance-review-slice-file-manifest"],
    queue.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-acceptance-review-slice-consumer-gate-evidence-id-manifest"],
    queue.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(attributes["data-viz-manim-v2-completion-acceptance-review-slices"], "20@24");
});
