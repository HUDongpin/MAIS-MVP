import {
  manimReviewPackageSliceDataAttributes,
  type ManimReviewPackageSliceMatrix
} from "./mathSceneReviewPackageSlices";

export const MATH_SCENE_V2_GOAL_GATE_SOURCE_CONTRACT =
  "MAIS Manim v2 goal gate: A06 review packages pass, while A11 broad regression, A22 release, and A18 final signoff still block completion" as const;

export type MathSceneV2GoalGateId =
  | "a06-review-package-split"
  | "a11-browser-visual-interaction-regression"
  | "a22-clean-release-gate"
  | "a18-a06-teaching-quality-confirmation";

export type MathSceneV2GoalGateStatus =
  | "blocked"
  | "partial-blocked"
  | "passed"
  | "pending-final-signoff";

export type MathSceneV2GoalGateRow = {
  blockingItems: string[];
  evidenceCounts: Record<string, number>;
  evidenceSummary: string;
  id: MathSceneV2GoalGateId;
  ownerAgentIds: readonly string[];
  status: MathSceneV2GoalGateStatus;
};

export type MathSceneV2GoalGateBrowserEvidence = {
  broadGateStatus: string;
  hkGradePackageEvidence: readonly unknown[];
  hkGradeSplitStatus: string;
  missingHkPackageIds: readonly string[];
};

export type MathSceneV2GoalGateReleaseReadiness = {
  a22PrunedStagingBuildStatus: string;
  a22ReleasePreflightStatus: string;
  a22RootDeployStatus: string;
  blockers: readonly string[];
  productionDeployAllowed: boolean;
  releaseGateStatus: string;
};

export type MathSceneV2GoalGateReviewPackageEvidence = {
  fileCount: number;
  unclassifiedFileNames: readonly string[];
};

export type MathSceneV2GoalGateTeachingDossier = {
  pendingA18Count: number;
  proofPointCount: number;
  readyProofPointCount: number;
  sceneCount: number;
  status: string;
};

export type MathSceneV2GoalGateInput = {
  browserEvidence: MathSceneV2GoalGateBrowserEvidence;
  releaseReadiness: MathSceneV2GoalGateReleaseReadiness;
  reviewPackages: MathSceneV2GoalGateReviewPackageEvidence[];
  reviewSlices: ManimReviewPackageSliceMatrix;
  teachingDossier: MathSceneV2GoalGateTeachingDossier;
};

export type MathSceneV2GoalGate = {
  canMarkThreadGoalComplete: boolean;
  gateCount: number;
  gates: MathSceneV2GoalGateRow[];
  goalCompletionStatus: "complete" | "not-complete";
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceContract: typeof MATH_SCENE_V2_GOAL_GATE_SOURCE_CONTRACT;
  summary: string;
};

function reviewPackageGate(
  reviewPackages: readonly MathSceneV2GoalGateReviewPackageEvidence[],
  reviewSlices: ManimReviewPackageSliceMatrix
): MathSceneV2GoalGateRow {
  const fileCount = reviewPackages.reduce((sum, reviewPackage) => sum + reviewPackage.fileCount, 0);
  const unclassifiedFileCount = reviewPackages.reduce(
    (sum, reviewPackage) => sum + reviewPackage.unclassifiedFileNames.length,
    0
  );
  const reviewSliceReady = reviewSlices.status === "ready-for-slice-review";
  const reviewSliceMissingFileCount = reviewSlices.missingFileNames.length;
  const reviewSliceDuplicateFileCount = reviewSlices.duplicateFileNames.length;
  const reviewSliceOverLimit = reviewSlices.largestSliceFileCount > reviewSlices.maxFilesPerSlice ? 1 : 0;
  const blockingItems = [
    ...(unclassifiedFileCount === 0 ? [] : ["a06-unclassified-manim-files"]),
    ...(reviewSliceReady ? [] : ["a06-review-slice-plan-not-ready"]),
    ...(reviewSliceMissingFileCount === 0 ? [] : ["a06-review-slice-files-missing"]),
    ...(reviewSliceDuplicateFileCount === 0 ? [] : ["a06-review-slice-files-duplicated"]),
    ...(reviewSliceOverLimit === 0 ? [] : ["a06-review-slice-file-count-over-limit"])
  ];

  return {
    blockingItems,
    evidenceCounts: {
      duplicateReviewSliceFileCount: reviewSliceDuplicateFileCount,
      fileCount,
      largestReviewSliceFileCount: reviewSlices.largestSliceFileCount,
      maxFilesPerReviewSlice: reviewSlices.maxFilesPerSlice,
      missingReviewSliceFileCount: reviewSliceMissingFileCount,
      reviewPackageCount: reviewPackages.length,
      reviewSliceCount: reviewSlices.sliceCount,
      unclassifiedFileCount
    },
    evidenceSummary: [
      `packages=${reviewPackages.length}`,
      `files=${fileCount}`,
      `unclassified=${unclassifiedFileCount}`,
      `reviewSlices=${reviewSlices.sliceCount}@${reviewSlices.maxFilesPerSlice}`,
      `missingReviewSliceFiles=${reviewSliceMissingFileCount}`,
      `duplicateReviewSliceFiles=${reviewSliceDuplicateFileCount}`,
      `largestReviewSlice=${reviewSlices.largestSliceFileCount}`
    ].join(";"),
    id: "a06-review-package-split",
    ownerAgentIds: ["A06"],
    status: blockingItems.length === 0 ? "passed" : "partial-blocked"
  };
}

function browserRegressionGate(browserEvidence: MathSceneV2GoalGateBrowserEvidence): MathSceneV2GoalGateRow {
  const broadGateRed = browserEvidence.broadGateStatus === "red-needs-a11-a22-follow-up" ? 1 : 0;
  const hkGradeSplitPassed = browserEvidence.hkGradeSplitStatus === "passed" ? 1 : 0;
  const blockingItems = [
    ...browserEvidence.missingHkPackageIds.map((packageId) => `missing-${packageId}`),
    ...(broadGateRed ? ["a11-broad-visualization-value-suite-red"] : [])
  ];

  return {
    blockingItems,
    evidenceCounts: {
      broadGateRed,
      hkGradePackageCount: browserEvidence.hkGradePackageEvidence.length,
      hkGradeSplitPassed,
      missingHkPackageCount: browserEvidence.missingHkPackageIds.length
    },
    evidenceSummary: [
      `hkSplit=${browserEvidence.hkGradeSplitStatus}`,
      `broad=${browserEvidence.broadGateStatus}`,
      `missing=${browserEvidence.missingHkPackageIds.length}`
    ].join(";"),
    id: "a11-browser-visual-interaction-regression",
    ownerAgentIds: ["A06", "A11"],
    status: blockingItems.length === 0 ? "passed" : "partial-blocked"
  };
}

function releaseGate(releaseReadiness: MathSceneV2GoalGateReleaseReadiness): MathSceneV2GoalGateRow {
  return {
    blockingItems: releaseReadiness.blockers.filter((blocker) => blocker.startsWith("a22-")),
    evidenceCounts: {
      blockerCount: releaseReadiness.blockers.length,
      prunedStagingPassed: releaseReadiness.a22PrunedStagingBuildStatus === "passed" ? 1 : 0,
      productionDeployAllowed: releaseReadiness.productionDeployAllowed ? 1 : 0
    },
    evidenceSummary: [
      `status=${releaseReadiness.releaseGateStatus}`,
      `preflight=${releaseReadiness.a22ReleasePreflightStatus}`,
      `root=${releaseReadiness.a22RootDeployStatus}`,
      `pruned=${releaseReadiness.a22PrunedStagingBuildStatus}`
    ].join(";"),
    id: "a22-clean-release-gate",
    ownerAgentIds: ["A22"],
    status: releaseReadiness.releaseGateStatus === "release-ready" ? "passed" : "blocked"
  };
}

function teachingGate(teachingDossier: MathSceneV2GoalGateTeachingDossier): MathSceneV2GoalGateRow {
  const pendingA18Count = teachingDossier.pendingA18Count;

  return {
    blockingItems: pendingA18Count === 0 ? [] : ["a18-final-teaching-signoff-open"],
    evidenceCounts: {
      pendingA18Count,
      readyProofPointCount: teachingDossier.readyProofPointCount,
      sceneCount: teachingDossier.sceneCount
    },
    evidenceSummary: [
      `status=${teachingDossier.status}`,
      `scenes=${teachingDossier.sceneCount}`,
      `pendingA18=${pendingA18Count}`,
      `proofPoints=${teachingDossier.readyProofPointCount}/${teachingDossier.proofPointCount}`
    ].join(";"),
    id: "a18-a06-teaching-quality-confirmation",
    ownerAgentIds: ["A06", "A18"],
    status: pendingA18Count === 0 ? "passed" : "pending-final-signoff"
  };
}

export function buildMathSceneV2GoalGate(input: MathSceneV2GoalGateInput): MathSceneV2GoalGate {
  const gates = [
    reviewPackageGate(input.reviewPackages, input.reviewSlices),
    browserRegressionGate(input.browserEvidence),
    releaseGate(input.releaseReadiness),
    teachingGate(input.teachingDossier)
  ];
  const canMarkThreadGoalComplete = gates.every((gate) => gate.status === "passed");
  const goalCompletionStatus = canMarkThreadGoalComplete ? "complete" : "not-complete";
  const reviewSliceAttributes = manimReviewPackageSliceDataAttributes(input.reviewSlices);
  const reviewSliceConsumerGateEvidenceIdManifest =
    reviewSliceAttributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"];
  const reviewSliceFileManifest = reviewSliceAttributes["data-viz-manim-review-slice-file-manifest"];
  const reviewSliceIds = reviewSliceAttributes["data-viz-manim-review-slice-ids"];
  const reviewSliceSummary = `${input.reviewSlices.sliceCount}@${input.reviewSlices.maxFilesPerSlice}`;

  return {
    canMarkThreadGoalComplete,
    gateCount: gates.length,
    gates,
    goalCompletionStatus,
    reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceFileManifest,
    reviewSliceIds,
    reviewSliceSummary,
    sourceContract: MATH_SCENE_V2_GOAL_GATE_SOURCE_CONTRACT,
    summary: [
      "mathSceneV2GoalGate",
      `status=${goalCompletionStatus}`,
      `reviewSlices=${reviewSliceSummary}`,
      gates.map((gate) => `${gate.id}=${gate.status}`).join(";")
    ].join(":")
  };
}

function ownerManifest(
  gates: readonly MathSceneV2GoalGateRow[],
  formatGate: (gate: MathSceneV2GoalGateRow) => string[]
) {
  const ownerIds = Array.from(new Set(gates.flatMap((gate) => gate.ownerAgentIds))).sort();

  return ownerIds
    .map((ownerId) => {
      const entries = gates
        .filter((gate) => gate.ownerAgentIds.includes(ownerId))
        .flatMap(formatGate);

      return `${ownerId}=${entries.join("|") || "none"}`;
    })
    .join(";");
}

export function mathSceneV2GoalGateDataAttributes(gate: MathSceneV2GoalGate) {
  return {
    "data-viz-manim-v2-goal-blockers": gate.gates.flatMap((row) => row.blockingItems).join(",") || "none",
    "data-viz-manim-v2-goal-can-complete": gate.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-goal-gate-count": String(gate.gateCount),
    "data-viz-manim-v2-goal-owner-blocker-manifest": ownerManifest(
      gate.gates,
      (row) => row.blockingItems.map((blockingItem) => `${row.id}:${blockingItem}`)
    ),
    "data-viz-manim-v2-goal-owner-status-manifest": ownerManifest(
      gate.gates,
      (row) => [`${row.id}:${row.status}`]
    ),
    "data-viz-manim-v2-goal-review-slice-consumer-gate-evidence-id-manifest":
      gate.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-goal-review-slice-file-manifest": gate.reviewSliceFileManifest,
    "data-viz-manim-v2-goal-review-slice-ids": gate.reviewSliceIds,
    "data-viz-manim-v2-goal-review-slices": gate.reviewSliceSummary,
    "data-viz-manim-v2-goal-source-contract": gate.sourceContract,
    "data-viz-manim-v2-goal-status": gate.goalCompletionStatus,
    "data-viz-manim-v2-goal-summary": gate.gates
      .map((row) => `${row.id}=${row.status}`)
      .join(";")
  } as const;
}
