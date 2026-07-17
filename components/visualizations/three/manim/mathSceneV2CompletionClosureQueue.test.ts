import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMathSceneV2CompletionClosureQueue,
  mathSceneV2CompletionClosureQueueDataAttributes,
  MATH_SCENE_V2_COMPLETION_CLOSURE_QUEUE_SOURCE_CONTRACT
} from "./mathSceneV2CompletionClosureQueue";
import {
  MATH_SCENE_V2_CROSS_AGENT_HANDOFF_SOURCE_CONTRACT,
  type MathSceneV2CrossAgentHandoff
} from "./mathSceneV2CrossAgentHandoff";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";

const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  [
    "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
    "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
    "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
    "data-viz-manim-run-from-beat-checkpoint-restore-action",
    "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore"
  ].join(",");
const a11RequiredRootDataAttributeCount = 5;

function crossAgentHandoffFixture(): MathSceneV2CrossAgentHandoff {
  return {
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
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneReviewPackages.ts",
    reviewSliceIds: "manim-review-slice-01",
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
        evidenceSummary: "a06-review-package-split=ready",
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
          hkGradePackageCount: 12,
          hkGradePassedCount: 12,
          requiredRootDataAttributeCount: a11RequiredRootDataAttributeCount,
          runFromBeatCheckpointInvalidationDataAttributeCount: a11RequiredRootDataAttributeCount
        },
        evidenceSummary: "a11-browser-visual-interaction-regression=owner-action-required",
        id: "a11-browser-visual-interaction-regression",
        ownerAgentIds: ["A11"],
        requiredActions: [
          "adopt-hk-grade-split-packages",
          "update-projection-views-expected-list",
          "keep-non-hk-tracks-out-of-hk-demo-sweep"
        ],
        status: "owner-action-required",
        supportingAgentIds: ["A06", "A22"]
      },
      {
        blockingItems: ["a22-release-preflight-disk-blocked", "a22-dirty-root-release-blocked"],
        evidenceCounts: {
          a11ReleaseSliceRequiredRootDataAttributeCount: a11RequiredRootDataAttributeCount,
          forbiddenReleaseSliceFileCount: 0,
          releaseSliceFileCount: 387,
          releaseSliceReady: 1
        },
        evidenceSummary: "a22-clean-release-gate=release-blocked",
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
          renderedRouteCount: 12,
          sceneCount: 12
        },
        evidenceSummary: "a18-a06-teaching-quality-confirmation=final-signoff-required",
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
    summary: "mathSceneV2CrossAgentHandoff:status=needs-owner-action:open=3",
    workstreamCount: 4
  };
}

function closureQueueFixture() {
  return buildMathSceneV2CompletionClosureQueue(crossAgentHandoffFixture());
}

test("MAIS Manim v2 completion closure queue expands open workstreams into owner actions", () => {
  const queue = closureQueueFixture();

  assert.equal(queue.sourceContract, MATH_SCENE_V2_COMPLETION_CLOSURE_QUEUE_SOURCE_CONTRACT);
  assert.equal(queue.status, "owner-action-required");
  assert.equal(queue.openWorkstreamCount, 3);
  assert.equal(queue.actionCount, 11);
  assert.equal(queue.externalOwnerActionCount, 11);
  assert.equal(queue.a06CloseableActionCount, 0);
  assert.equal(queue.canMarkThreadGoalComplete, false);
  assert.deepEqual(queue.workstreams.map((workstream) => workstream.workstreamId), [
    "a11-browser-visual-interaction-regression",
    "a22-clean-release-gate",
    "a18-a06-teaching-quality-confirmation"
  ]);
  assert.deepEqual(queue.workstreams.map((workstream) => workstream.actionCount), [3, 3, 5]);
});

test("MAIS Manim v2 completion closure queue preserves owners, blockers, and evidence sources", () => {
  const queue = closureQueueFixture();
  const rowsByActionId = Object.fromEntries(queue.actions.map((action) => [action.actionId, action]));

  assert.equal(
    rowsByActionId["a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages"].ownerAgentIds.join("+"),
    "A11"
  );
  assert.ok(
    rowsByActionId["a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages"].evidenceSourceIds.includes(
      "visualizationBrowserRegressionEvidence"
    )
  );
  assert.equal(
    rowsByActionId["a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages"].evidenceSummary,
    "a11-browser-visual-interaction-regression=owner-action-required"
  );
  assert.ok(
    rowsByActionId["a11-browser-visual-interaction-regression:update-projection-views-expected-list"].blockingItems.includes(
      "a11-broad-visualization-value-suite-red"
    )
  );

  assert.equal(rowsByActionId["a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice"].ownerAgentIds.join("+"), "A22");
  assert.ok(
    rowsByActionId["a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice"].evidenceSourceIds.includes(
      "mathSceneV2ReleaseSliceManifest"
    )
  );
  assert.ok(
    rowsByActionId["a22-clean-release-gate:run-a22-generated-artifact-cleanup-after-preserving-evidence"].blockingItems.includes(
      "a22-release-preflight-disk-blocked"
    )
  );

  assert.equal(
    rowsByActionId["a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions"].ownerAgentIds.join("+"),
    "A18+A06"
  );
  assert.ok(
    rowsByActionId["a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions"].evidenceSourceIds.includes(
      "mathSceneTeachingFinalDecisionLedger"
    )
  );
  assert.equal(
    rowsByActionId["a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions"].canA06CloseWithoutOwnerAction,
    false
  );
});

test("MAIS Manim v2 completion closure queue carries source-architecture blocker reasons", () => {
  const handoff = crossAgentHandoffFixture();
  handoff.sourceArchitectureBlockerReasonManifest = "reviewSliceStatus,missingReviewSliceFiles";
  handoff.sourceArchitectureBlockerReasons = ["reviewSliceStatus", "missingReviewSliceFiles"];

  const queue = buildMathSceneV2CompletionClosureQueue(handoff);
  const attributes = mathSceneV2CompletionClosureQueueDataAttributes(queue);

  assert.deepEqual(
    (queue as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    ["reviewSliceStatus", "missingReviewSliceFiles"]
  );
  assert.equal(
    (queue as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    "reviewSliceStatus,missingReviewSliceFiles"
  );
  assert.match(queue.summary, /sourceBlockers=reviewSliceStatus,missingReviewSliceFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-source-architecture-blocker-reasons"],
    "reviewSliceStatus,missingReviewSliceFiles"
  );
});

test("MAIS Manim v2 completion closure queue serializes stable data attributes", () => {
  const queue = closureQueueFixture();
  const attributes = mathSceneV2CompletionClosureQueueDataAttributes(queue);
  const evidenceSummaryByWorkstreamId = Object.fromEntries(
    queue.workstreams.map((workstream) => [workstream.workstreamId, workstream.evidenceSummary])
  );
  const expectedOwnerActionManifest = queue.actions
    .map((action) => `${action.actionId}=owners:${action.ownerAgentIds.join("+")};status:${action.status};workstream:${action.workstreamStatus}`)
    .join("|");
  const expectedOwnerActionEvidenceSourceManifest = queue.actions
    .map((action) => `${action.actionId}=sources:${action.evidenceSourceIds.join("+") || "none"}`)
    .join("|");
  const expectedOwnerActionBlockerManifest = queue.actions
    .map((action) => `${action.actionId}=blockers:${action.blockingItems.join("+") || "none"}`)
    .join("|");
  const expectedOwnerActionSupportManifest = queue.actions
    .map((action) => `${action.actionId}=support:${action.supportingAgentIds.join("+") || "none"}`)
    .join("|");
  const expectedOwnerActionLabelManifest = queue.actions
    .map((action) => `${action.actionId}=label:${action.action}`)
    .join("|");
  const expectedOwnerActionEvidenceCountManifest = queue.actions
    .map((action) => {
      const evidenceCounts = Object.entries(action.evidenceCounts)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${key}=${value}`)
        .join("+");
      return `${action.actionId}=counts:${evidenceCounts || "none"}`;
    })
    .join("|");
  const expectedOwnerActionEvidenceSummaryManifest = queue.actions
    .map((action) => `${action.actionId}=summary:${evidenceSummaryByWorkstreamId[action.workstreamId]}`)
    .join("|");

  assert.equal(classifyManimReviewPackage("mathSceneV2CompletionClosureQueue.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-source-contract"],
    MATH_SCENE_V2_COMPLETION_CLOSURE_QUEUE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-completion-closure-status"], "owner-action-required");
  assert.equal(attributes["data-viz-manim-v2-completion-closure-action-count"], "11");
  assert.equal(attributes["data-viz-manim-v2-completion-closure-open-workstream-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-completion-closure-a06-closeable-action-count"], "0");
  assert.equal(attributes["data-viz-manim-v2-completion-closure-can-complete"], "false");
  assert.equal((queue as { reviewSliceCount?: number }).reviewSliceCount, 20);
  assert.equal((queue as { reviewSliceIds?: string }).reviewSliceIds, "manim-review-slice-01");
  assert.equal(
    (queue as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    "manim-review-slice-01=mathSceneReviewPackages.ts"
  );
  assert.equal(
    (queue as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review"
  );
  assert.equal(attributes["data-viz-manim-v2-completion-closure-review-slice-count"], "20");
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-review-slice-ids"],
    "manim-review-slice-01"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-review-slice-file-manifest"],
    "manim-review-slice-01=mathSceneReviewPackages.ts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-review-slice-consumer-gate-evidence-id-manifest"],
    "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review"
  );
  assert.equal(attributes["data-viz-manim-v2-completion-closure-review-slices"], "20@24");
  assert.equal(
    (queue as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (queue as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-a11-required-root-attribute-count"],
    String(a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-a11-run-from-beat-checkpoint-invalidation-attributes"],
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(queue.ownerActionManifest, expectedOwnerActionManifest);
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-owner-action-manifest"],
    expectedOwnerActionManifest
  );
  assert.equal(queue.ownerActionEvidenceSourceManifest, expectedOwnerActionEvidenceSourceManifest);
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-owner-action-evidence-source-manifest"],
    expectedOwnerActionEvidenceSourceManifest
  );
  assert.equal(queue.ownerActionBlockerManifest, expectedOwnerActionBlockerManifest);
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-owner-action-blocker-manifest"],
    expectedOwnerActionBlockerManifest
  );
  assert.equal(queue.ownerActionSupportManifest, expectedOwnerActionSupportManifest);
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-owner-action-support-manifest"],
    expectedOwnerActionSupportManifest
  );
  assert.equal(queue.ownerActionLabelManifest, expectedOwnerActionLabelManifest);
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-owner-action-label-manifest"],
    expectedOwnerActionLabelManifest
  );
  assert.equal(queue.ownerActionEvidenceCountManifest, expectedOwnerActionEvidenceCountManifest);
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-owner-action-evidence-count-manifest"],
    expectedOwnerActionEvidenceCountManifest
  );
  assert.equal(queue.ownerActionEvidenceSummaryManifest, expectedOwnerActionEvidenceSummaryManifest);
  assert.equal(
    attributes["data-viz-manim-v2-completion-closure-owner-action-evidence-summary-manifest"],
    expectedOwnerActionEvidenceSummaryManifest
  );
  assert.match(attributes["data-viz-manim-v2-completion-closure-summary"], /a11-browser-visual-interaction-regression=3/);
  assert.match(attributes["data-viz-manim-v2-completion-closure-summary"], /a22-clean-release-gate=3/);
  assert.match(attributes["data-viz-manim-v2-completion-closure-summary"], /a18-a06-teaching-quality-confirmation=5/);
});
