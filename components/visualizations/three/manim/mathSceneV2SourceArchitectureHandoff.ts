import type { ManimReviewPackageHandoffMatrix } from "./mathSceneReviewPackageHandoff";
import {
  manimReviewPackageSliceDataAttributes,
  type ManimReviewPackageSliceMatrix
} from "./mathSceneReviewPackageSlices";
import {
  mathSceneV2GoalGateDataAttributes,
  type MathSceneV2GoalGate,
  type MathSceneV2GoalGateId
} from "./mathSceneV2GoalGate";

export const MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT =
  "MAIS Manim v2 source-architecture handoff: packages reusable Manim runtime slices for future bounded skill invocations without bulk course generation or owner-gate self-acceptance" as const;

export type MathSceneV2SourceArchitectureHandoffStatus =
  | "blocked-source-architecture-review"
  | "source-architecture-ready"
  | "source-architecture-ready-owner-gates-open";

export type MathSceneV2SourceArchitectureInvocationScope =
  "one-topic-one-concept-cluster-or-one-review-slice";

export type MathSceneV2SourceArchitectureAcceptanceCriterion =
  | "bounded-source-architecture-slice"
  | "no-bulk-course-generation"
  | "review-packages-ready"
  | "owner-gates-requested-not-accepted"
  | "future-invocations-require-fresh-a18-a11-a22-gates";

export type MathSceneV2SourceArchitectureHandoffInput = {
  goalGate: MathSceneV2GoalGate;
  reviewHandoff: ManimReviewPackageHandoffMatrix;
  reviewSlices: ManimReviewPackageSliceMatrix;
};

export type MathSceneV2SourceArchitectureHandoff = {
  acceptanceCriteria: readonly MathSceneV2SourceArchitectureAcceptanceCriterion[];
  bulkCourseGenerationAllowed: false;
  canMarkThreadGoalComplete: boolean;
  futureInvocationScope: MathSceneV2SourceArchitectureInvocationScope;
  goalGate: MathSceneV2GoalGate;
  goalOwnerStatusManifest: string;
  largestReviewSliceFileCount: number;
  maxFilesPerReviewSlice: number;
  openOwnerGateIds: MathSceneV2GoalGateId[];
  requiredOwnerGateIds: MathSceneV2GoalGateId[];
  reviewPackageCount: number;
  reviewPackageHandoffStatus: ManimReviewPackageHandoffMatrix["status"];
  reviewSliceCount: number;
  reviewSliceIds: string;
  reviewSliceStatus: ManimReviewPackageSliceMatrix["status"];
  reviewSliceSummary: string;
  sourceContract: typeof MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT;
  status: MathSceneV2SourceArchitectureHandoffStatus;
  summary: string;
};

const requiredOwnerGateOrder: readonly MathSceneV2GoalGateId[] = [
  "a11-browser-visual-interaction-regression",
  "a18-a06-teaching-quality-confirmation",
  "a22-clean-release-gate"
];

const acceptanceCriteria: readonly MathSceneV2SourceArchitectureAcceptanceCriterion[] = [
  "bounded-source-architecture-slice",
  "no-bulk-course-generation",
  "review-packages-ready",
  "owner-gates-requested-not-accepted",
  "future-invocations-require-fresh-a18-a11-a22-gates"
];

function requiredOwnerGates(goalGate: MathSceneV2GoalGate) {
  const presentGateIds = new Set(goalGate.gates.map((gate) => gate.id));
  return requiredOwnerGateOrder.filter((gateId) => presentGateIds.has(gateId));
}

function openOwnerGates(goalGate: MathSceneV2GoalGate) {
  const requiredGateIds = new Set(requiredOwnerGates(goalGate));
  const openGateIds = new Set(
    goalGate.gates
      .filter((gate) => requiredGateIds.has(gate.id) && gate.status !== "passed")
      .map((gate) => gate.id)
  );

  return requiredOwnerGateOrder.filter((gateId) => openGateIds.has(gateId));
}

function handoffStatus(
  reviewHandoff: ManimReviewPackageHandoffMatrix,
  reviewSlices: ManimReviewPackageSliceMatrix,
  openOwnerGateIds: readonly MathSceneV2GoalGateId[]
): MathSceneV2SourceArchitectureHandoffStatus {
  const reviewReady =
    reviewHandoff.status === "ready-for-package-review" &&
    reviewSlices.status === "ready-for-slice-review";

  if (!reviewReady) {
    return "blocked-source-architecture-review";
  }

  return openOwnerGateIds.length > 0
    ? "source-architecture-ready-owner-gates-open"
    : "source-architecture-ready";
}

export function buildMathSceneV2SourceArchitectureHandoff(
  input: MathSceneV2SourceArchitectureHandoffInput
): MathSceneV2SourceArchitectureHandoff {
  const requiredOwnerGateIds = requiredOwnerGates(input.goalGate);
  const openOwnerGateIds = openOwnerGates(input.goalGate);
  const status = handoffStatus(input.reviewHandoff, input.reviewSlices, openOwnerGateIds);
  const goalAttributes = mathSceneV2GoalGateDataAttributes(input.goalGate);
  const sliceAttributes = manimReviewPackageSliceDataAttributes(input.reviewSlices);

  return {
    acceptanceCriteria,
    bulkCourseGenerationAllowed: false,
    canMarkThreadGoalComplete: input.goalGate.canMarkThreadGoalComplete,
    futureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
    goalGate: input.goalGate,
    goalOwnerStatusManifest: goalAttributes["data-viz-manim-v2-goal-owner-status-manifest"],
    largestReviewSliceFileCount: input.reviewSlices.largestSliceFileCount,
    maxFilesPerReviewSlice: input.reviewSlices.maxFilesPerSlice,
    openOwnerGateIds,
    requiredOwnerGateIds,
    reviewPackageCount: input.reviewHandoff.packageCount,
    reviewPackageHandoffStatus: input.reviewHandoff.status,
    reviewSliceCount: input.reviewSlices.sliceCount,
    reviewSliceIds: sliceAttributes["data-viz-manim-review-slice-ids"],
    reviewSliceStatus: input.reviewSlices.status,
    reviewSliceSummary: `${input.reviewSlices.sliceCount}@${input.reviewSlices.maxFilesPerSlice}`,
    sourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2SourceArchitectureHandoff",
      `status=${status}`,
      "bulkCourseGeneration=false",
      `futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice`,
      `reviewPackages=${input.reviewHandoff.packageCount}`,
      `reviewSlices=${input.reviewSlices.sliceCount}@${input.reviewSlices.maxFilesPerSlice}`,
      `ownerGatesOpen=${openOwnerGateIds.join(",") || "none"}`
    ].join(":")
  };
}

export function mathSceneV2SourceArchitectureHandoffDataAttributes(
  handoff: MathSceneV2SourceArchitectureHandoff
) {
  const reviewHandoffAttributePrefix = "data-viz-manim-v2-source-architecture-handoff";

  return {
    [`${reviewHandoffAttributePrefix}-acceptance-criteria`]: handoff.acceptanceCriteria.join(","),
    [`${reviewHandoffAttributePrefix}-bulk-course-generation`]: String(handoff.bulkCourseGenerationAllowed),
    [`${reviewHandoffAttributePrefix}-can-complete`]: handoff.canMarkThreadGoalComplete ? "true" : "false",
    [`${reviewHandoffAttributePrefix}-future-invocation-scope`]: handoff.futureInvocationScope,
    [`${reviewHandoffAttributePrefix}-goal-owner-status-manifest`]: handoff.goalOwnerStatusManifest,
    [`${reviewHandoffAttributePrefix}-largest-review-slice-file-count`]: String(handoff.largestReviewSliceFileCount),
    [`${reviewHandoffAttributePrefix}-max-files-per-review-slice`]: String(handoff.maxFilesPerReviewSlice),
    [`${reviewHandoffAttributePrefix}-open-owner-gates`]: handoff.openOwnerGateIds.join(",") || "none",
    [`${reviewHandoffAttributePrefix}-required-owner-gates`]: handoff.requiredOwnerGateIds.join(","),
    [`${reviewHandoffAttributePrefix}-review-package-count`]: String(handoff.reviewPackageCount),
    [`${reviewHandoffAttributePrefix}-review-package-status`]: handoff.reviewPackageHandoffStatus,
    [`${reviewHandoffAttributePrefix}-review-slice-count`]: String(handoff.reviewSliceCount),
    [`${reviewHandoffAttributePrefix}-review-slice-ids`]: handoff.reviewSliceIds,
    [`${reviewHandoffAttributePrefix}-review-slice-status`]: handoff.reviewSliceStatus,
    [`${reviewHandoffAttributePrefix}-review-slice-summary`]: handoff.reviewSliceSummary,
    [`${reviewHandoffAttributePrefix}-source-contract`]: handoff.sourceContract,
    [`${reviewHandoffAttributePrefix}-status`]: handoff.status,
    [`${reviewHandoffAttributePrefix}-summary`]: handoff.summary
  } as const;
}
