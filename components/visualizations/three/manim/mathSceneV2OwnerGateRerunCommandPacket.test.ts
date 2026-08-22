import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  MATH_SCENE_TEACHING_INSPECTION_REQUIRED_RENDERED_SELECTORS,
  MATH_SCENE_TEACHING_INSPECTION_SOURCE_EVIDENCE_ATTRIBUTES
} from "./mathSceneTeachingInspectionTargets";
import {
  type MathSceneTeachingRenderedReviewRoutePacket,
  MATH_SCENE_TEACHING_RENDERED_REVIEW_PROTOCOL,
  MATH_SCENE_TEACHING_RENDERED_REVIEW_ROUTE_SOURCE_CONTRACT
} from "./mathSceneTeachingRenderedReviewRoutes";
import {
  type MathSceneV2CompletionRerunPlan,
  MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT
} from "./mathSceneV2CompletionRerunPlan";
import {
  type MathSceneV2OwnerGateBrowserRegressionPlan,
  buildMathSceneV2OwnerGateRerunCommandPacket,
  mathSceneV2OwnerGateRerunCommandPacketDataAttributes,
  MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2OwnerGateRerunCommandPacket";

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

function browserPlanFixture(): MathSceneV2OwnerGateBrowserRegressionPlan {
  return {
    hkDemoSafePackages: [
      {
        commandEnv: {
          VISUALIZATION_SWEEP_GRADES: "P1",
          VISUALIZATION_SWEEP_LABS: "number-line-demo,fraction-slices-demo",
          VISUALIZATION_SWEEP_TRACKS: "HK"
        },
        id: "hk-demo-safe-P1-01"
      }
    ],
    premiumSceneVariantPackages: []
  };
}

function rerunPlanFixture(): MathSceneV2CompletionRerunPlan {
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
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 20,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2CompletionRerunPlan.ts|mathSceneV2OwnerGateRerunCommandPacket.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
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
        requiredActions: ["run-a11-browser-regression"],
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
        requiredActions: ["inspect-rendered-scene-targets", "record-approve-or-revision-decision"],
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
        blockingItems: ["a22-dirty-root-release-blocked"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A22"],
        prerequisiteStepIds: [],
        requiredActions: ["release-from-clean-worktree-or-reviewed-pruned-staging-slice"],
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
          "a22-dirty-root-release-blocked"
        ],
        kind: "final-objective-audit",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A11", "A18", "A22"],
        prerequisiteStepIds: ["01-owner-gate-A11", "02-owner-gate-A18", "03-owner-gate-A22"],
        requiredActions: [
          "run-a11-browser-regression",
          "inspect-rendered-scene-targets",
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

const renderedReviewCases = [
  ["number-line-core", "three-number-line", "primary"],
  ["fraction-slices-core", "three-fraction-slices", "primary"],
  ["angle-geometry-core", "three-angle-geometry", "middle-school"],
  ["function-graph-core", "three-function-graph", "secondary"],
  ["function-family-core", "three-function-family", "secondary"],
  ["trig-unit-wave-core", "three-trig-unit-wave", "secondary"],
  ["calculus-rate-area-core", "three-calculus-rate-area", "advanced"],
  ["conic-section-core", "three-conic-sections-deep", "advanced"],
  ["space-vectors-core", "three-space-vectors-lines-planes", "advanced"],
  ["probability-machine-core", "three-probability-machine", "secondary"],
  ["statistics-distribution-core", "three-statistics-distribution", "secondary"],
  ["statistical-inference-core", "three-statistical-inference-lab", "advanced"]
] as const;

function teachingRenderedRoutesFixture(): MathSceneTeachingRenderedReviewRoutePacket {
  const rows = renderedReviewCases.map(([caseId, familyId, targetBand]) => {
    const labId = `${caseId}-lab`;
    const sceneId = `${familyId}-scene`;

    return {
      a18SignoffStatus: "pending-a18-review" as const,
      caseId,
      familyId,
      href: `/visualization-lab?grade=demo&track=HK&lab=${labId}`,
      labId,
      learningObjective: `Review ${caseId} in the rendered Manim scene.`,
      manualReviewProtocol: MATH_SCENE_TEACHING_RENDERED_REVIEW_PROTOCOL,
      renderedSceneSelectors: MATH_SCENE_TEACHING_INSPECTION_REQUIRED_RENDERED_SELECTORS,
      routeStatus: "ready-for-a18-browser-review" as const,
      sceneId,
      sectionId: `lab-example-${labId}`,
      sectionSelector: `[id="lab-example-${labId}"]`,
      sourceEvidenceAttributes: MATH_SCENE_TEACHING_INSPECTION_SOURCE_EVIDENCE_ATTRIBUTES,
      summary: `${caseId}=${labId}:ready-for-a18-browser-review:scene=${sceneId}`,
      targetBand
    };
  });

  return {
    missingCaseIds: [],
    missingRouteCount: 0,
    pendingA18Count: rows.length,
    routableTargetCount: rows.length,
    rows,
    sourceContract: MATH_SCENE_TEACHING_RENDERED_REVIEW_ROUTE_SOURCE_CONTRACT,
    status: "ready-for-a18-browser-review",
    summary: `a18RenderedReviewRoutes:status=ready-for-a18-browser-review:routable=${rows.length}/${rows.length}`,
    targetCount: rows.length
  };
}

function commandPacketFixture() {
  return {
    browserPlan: browserPlanFixture(),
    rerunPlan: rerunPlanFixture(),
    teachingRenderedRoutes: teachingRenderedRoutesFixture()
  };
}

test("MAIS Manim v2 owner gate rerun command packet gives A11, A22, and A18 executable next steps", () => {
  const { browserPlan, rerunPlan, teachingRenderedRoutes } = commandPacketFixture();
  const packet = buildMathSceneV2OwnerGateRerunCommandPacket({
    browserPlan,
    releaseRunId: "manim-v2-a22-rerun-test",
    rerunPlan,
    teachingRenderedRoutes
  });

  assert.equal(packet.sourceContract, MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT);
  assert.equal(packet.status, "owner-rerun-commands-ready");
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.deepEqual(packet.ownerAgentIds, ["A11", "A18", "A22"]);

  const a11Packet = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A11");
  assert.ok(a11Packet);
  assert.ok(a11Packet.commandCount > browserPlan.hkDemoSafePackages.length);
  assert.equal(a11Packet.manualReviewCount, 0);
  assert.ok(a11Packet.rows.some((row) => row.command?.includes("visualization-values.spec.ts")));
  assert.ok(a11Packet.rows.some((row) => row.commandEnv?.VISUALIZATION_SWEEP_TRACKS === "HK"));

  const a22Packet = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A22");
  assert.ok(a22Packet);
  assert.equal(a22Packet.commandCount, 6);
  assert.equal(a22Packet.manualReviewCount, 0);
  assert.ok(a22Packet.rows.some((row) => row.command === "npm run release:preflight -- --json"));
  assert.ok(a22Packet.rows.some((row) => row.command?.includes("cleanup-generated-artifacts.mjs --dry-run")));
  assert.ok(a22Packet.rows.some((row) => row.command?.includes("manim-v2-a22-rerun-test")));

  const a18Packet = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A18");
  assert.ok(a18Packet);
  assert.equal(a18Packet.commandCount, 0);
  assert.equal(a18Packet.manualReviewCount, teachingRenderedRoutes.routableTargetCount);
  assert.equal(a18Packet.rows.length, 12);
  assert.ok(a18Packet.rows.every((row) => row.href?.startsWith("/")));
  assert.ok(a18Packet.rows.every((row) => row.protocol.includes("record-a18-approve-or-revision-decision")));
});

test("MAIS Manim v2 owner gate rerun command packet blocks when owner gate steps are missing", () => {
  const { browserPlan, rerunPlan, teachingRenderedRoutes } = commandPacketFixture();
  const packet = buildMathSceneV2OwnerGateRerunCommandPacket({
    browserPlan,
    rerunPlan: {
      ...rerunPlan,
      steps: rerunPlan.steps.filter((step) => step.kind !== "owner-gate-rerun")
    },
    teachingRenderedRoutes
  });

  assert.equal(packet.status, "blocked-missing-owner-gate-steps");
  assert.equal(packet.ownerPacketCount, 0);
  assert.deepEqual(packet.missingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(packet.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 owner gate rerun command packet serializes stable handoff attributes", () => {
  const { browserPlan, rerunPlan, teachingRenderedRoutes } = commandPacketFixture();
  const packet = buildMathSceneV2OwnerGateRerunCommandPacket({
    browserPlan,
    rerunPlan,
    teachingRenderedRoutes
  });
  const attributes = mathSceneV2OwnerGateRerunCommandPacketDataAttributes(packet);

  assert.equal(
    (packet as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    "fixture-owner-action-evidence-counts"
  );
  assert.equal(
    (packet as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    "fixture-owner-acceptance-criteria"
  );
  assert.equal(
    (packet as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    "fixture-owner-evidence-requirements"
  );
  assert.equal((packet as { reviewSliceCount?: number }).reviewSliceCount, 20);
  assert.equal(
    (packet as { reviewSliceIds?: string }).reviewSliceIds,
    "manim-review-slice-01,manim-review-slice-02"
  );
  assert.equal(classifyManimReviewPackage("mathSceneV2OwnerGateRerunCommandPacket.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-source-contract"],
    MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-status"], "owner-rerun-commands-ready");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-owner-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-teaching-review-count"], "12");
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-owner-action-evidence-count-manifest"],
    "fixture-owner-action-evidence-counts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-owner-acceptance-criteria-manifest"],
    "fixture-owner-acceptance-criteria"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-owner-evidence-requirement-manifest"],
    "fixture-owner-evidence-requirements"
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-review-slice-count"], "20");
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-review-slice-ids"],
    "manim-review-slice-01,manim-review-slice-02"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-review-slice-file-manifest"],
    "manim-review-slice-01=mathSceneV2CompletionRerunPlan.ts|mathSceneV2OwnerGateRerunCommandPacket.ts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-review-slice-consumer-gate-evidence-id-manifest"],
    "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review"
  );
  assert.match(packet.summary, /reviewSlices=20@24/);
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-can-complete"], "false");
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-row-ids"],
    /a11-hk-demo-safe-P1-01-visualization-values-rerun/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-row-ids"],
    /a18-function-graph-core-rendered-route-review/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-owner-row-manifest"],
    /A22=.*a22-pruned-staging-next-build/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-command-manifest"],
    /a11-visualization-overlap-rerun=node scripts\/reject-direct-browser-entry\.mjs visualization-overlap\.spec\.ts/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-command-manifest"],
    /a22-pruned-staging-next-build=cd \.tmp\/vercel-staging\/manim-v2-a22-owner-gate-rerun/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-route-manifest"],
    /a18-function-graph-core-rendered-route-review=\/visualization-lab\?grade=demo&track=HK&lab=function-graph-core-lab/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-kind-manifest"],
    /a18-function-graph-core-rendered-route-review=A18:teaching-route-review/
  );
});
