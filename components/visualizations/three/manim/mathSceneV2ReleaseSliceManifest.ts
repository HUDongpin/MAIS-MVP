import type {
  VisualizationReleaseReadinessBlocker,
  VisualizationReleaseReadinessEvidence
} from "../../visualizationReleaseReadinessEvidence";
import type { ManimReviewPackageEvidence } from "./mathSceneReviewPackages";
import {
  manimReviewPackageSliceDataAttributes,
  type ManimReviewPackageSliceMatrix
} from "./mathSceneReviewPackageSlices";
import type { MathSceneV2SourceArchitectureHandoff } from "./mathSceneV2SourceArchitectureHandoff";

export const MATH_SCENE_V2_RELEASE_SLICE_MANIFEST_SOURCE_CONTRACT =
  "MAIS Manim v2 release slice manifest: A06-owned Manim source files prepared for A22 clean-worktree or reviewed pruned-staging release intake" as const;

export const MATH_SCENE_V2_RELEASE_SLICE_EXCLUDED_PATH_PATTERNS = [
  "node_modules/**",
  ".next/**",
  ".tmp/**",
  ".env*",
  "tests/e2e/**",
  "coordination/content-qa/**",
  "data/generated-content/**",
  "public/question-illustrations/**"
] as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeKeys = [
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
] as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageAttribute =
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest" as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateIdsAttribute =
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids" as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerAttribute =
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest" as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateStatusAttribute =
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest" as const;

const finalObjectiveSubmissionBridgeVerifiedClosureStatusAttribute =
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status" as const;

export type MathSceneV2ReleaseSliceExcludedPathPattern =
  (typeof MATH_SCENE_V2_RELEASE_SLICE_EXCLUDED_PATH_PATTERNS)[number];

export type MathSceneV2ReleaseSliceManifestStatus =
  | "blocked-pending-a06-release-slice-fix"
  | "ready-for-a22-clean-slice-review";

export type MathSceneV2ReleaseSliceA22GateStatus =
  | "blocked-by-a22-clean-release-gate"
  | "ready-for-a22-clean-release-build";

export type MathSceneV2ReleaseSliceManifestInput = {
  finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes?: Readonly<Record<string, string>>;
  releaseReadiness: VisualizationReleaseReadinessEvidence;
  reviewPackages: readonly ManimReviewPackageEvidence[];
  reviewSlices?: ManimReviewPackageSliceMatrix;
  sourceArchitectureHandoff?: MathSceneV2SourceArchitectureHandoff;
};

export type MathSceneV2ReleaseSliceManifest = {
  a11RequiredRootDataAttributes: VisualizationReleaseReadinessEvidence["a11RequiredRootDataAttributes"];
  a11RunFromBeatCheckpointInvalidationDataAttributes: VisualizationReleaseReadinessEvidence["a11RunFromBeatCheckpointInvalidationDataAttributes"];
  a22Blockers: VisualizationReleaseReadinessBlocker[];
  a22GateStatus: MathSceneV2ReleaseSliceA22GateStatus;
  excludedPathPatterns: readonly MathSceneV2ReleaseSliceExcludedPathPattern[];
  fileCount: number;
  finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames: string[];
  finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateIds: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureStatus: string;
  forbiddenIncludeCount: number;
  forbiddenIncludePaths: string[];
  includePaths: string[];
  packageCount: number;
  productionDeployAllowed: boolean;
  releasePath: VisualizationReleaseReadinessEvidence["releasePath"];
  requiredA22Actions: string[];
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceLargestFileCount: number;
  reviewSliceMaxFilesPerSlice: number;
  sourceArchitectureAcceptanceCriteria: readonly string[];
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureCanMarkThreadGoalComplete: boolean;
  sourceArchitectureFutureInvocationScope: string;
  sourceArchitectureHandoffStatus: string;
  sourceArchitectureOpenOwnerGateIds: string[];
  sourceArchitectureRequiredOwnerGateIds: string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  sourceContract: typeof MATH_SCENE_V2_RELEASE_SLICE_MANIFEST_SOURCE_CONTRACT;
  status: MathSceneV2ReleaseSliceManifestStatus;
  summary: string;
};

const manimDir = "components/visualizations/three/manim";

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function includePathsForPackages(reviewPackages: readonly ManimReviewPackageEvidence[]) {
  return uniqueSorted(
    reviewPackages.flatMap((reviewPackage) =>
      reviewPackage.fileNames.map((fileName) => `${manimDir}/${fileName}`)
    )
  );
}

function pathMatchesExcludedPattern(path: string, pattern: MathSceneV2ReleaseSliceExcludedPathPattern) {
  if (pattern.endsWith("/**")) {
    return path.startsWith(pattern.slice(0, -3));
  }

  if (pattern.endsWith("*")) {
    return path.startsWith(pattern.slice(0, -1));
  }

  return path === pattern;
}

function forbiddenIncludePaths(paths: readonly string[]) {
  return paths.filter((path) =>
    MATH_SCENE_V2_RELEASE_SLICE_EXCLUDED_PATH_PATTERNS.some((pattern) =>
      pathMatchesExcludedPattern(path, pattern)
    )
  );
}

function a22RequiredActions(releaseReadiness: VisualizationReleaseReadinessEvidence) {
  return releaseReadiness.requiredFollowUpActions.filter(
    (action) =>
      action.startsWith("investigate-") ||
      action.startsWith("release-") ||
      action.startsWith("run-a22")
  );
}

function submissionBridgeVerifiedClosureGateManifest(
  dataAttributes: Readonly<Record<string, string>> | undefined
) {
  const attributeNames = finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeKeys.filter(
    (attributeName) => typeof dataAttributes?.[attributeName] === "string"
  );

  return {
    attributeNames,
    gateCoverageManifest:
      dataAttributes?.[finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageAttribute] ?? "none",
    gateIds: dataAttributes?.[finalObjectiveSubmissionBridgeVerifiedClosureGateIdsAttribute] ?? "none",
    gateOwnerManifest:
      dataAttributes?.[finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerAttribute] ?? "none",
    gateStatusManifest:
      dataAttributes?.[finalObjectiveSubmissionBridgeVerifiedClosureGateStatusAttribute] ?? "none",
    status: dataAttributes?.[finalObjectiveSubmissionBridgeVerifiedClosureStatusAttribute] ?? "not-attached"
  };
}

function reviewSliceManifest(reviewSlices: ManimReviewPackageSliceMatrix | undefined) {
  if (!reviewSlices) {
    return {
      consumerGateEvidenceIdManifest: "not-attached",
      count: 0,
      fileManifest: "not-attached",
      ids: "not-attached",
      largestFileCount: 0,
      maxFilesPerSlice: 0
    };
  }

  const attributes = manimReviewPackageSliceDataAttributes(reviewSlices);

  return {
    consumerGateEvidenceIdManifest:
      attributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"],
    count: reviewSlices.sliceCount,
    fileManifest: attributes["data-viz-manim-review-slice-file-manifest"],
    ids: attributes["data-viz-manim-review-slice-ids"],
    largestFileCount: reviewSlices.largestSliceFileCount,
    maxFilesPerSlice: reviewSlices.maxFilesPerSlice
  };
}

function sourceArchitectureManifest(sourceArchitectureHandoff: MathSceneV2SourceArchitectureHandoff | undefined) {
  if (!sourceArchitectureHandoff) {
    return {
      acceptanceCriteria: [] as string[],
      bulkCourseGenerationAllowed: false,
      canMarkThreadGoalComplete: false,
      futureInvocationScope: "not-attached",
      handoffStatus: "not-attached",
      openOwnerGateIds: [] as string[],
      requiredOwnerGateIds: [] as string[],
      sourceContract: "not-attached",
      summary: "not-attached"
    };
  }

  return {
    acceptanceCriteria: [...sourceArchitectureHandoff.acceptanceCriteria],
    bulkCourseGenerationAllowed: sourceArchitectureHandoff.bulkCourseGenerationAllowed,
    canMarkThreadGoalComplete: sourceArchitectureHandoff.canMarkThreadGoalComplete,
    futureInvocationScope: sourceArchitectureHandoff.futureInvocationScope,
    handoffStatus: sourceArchitectureHandoff.status,
    openOwnerGateIds: [...sourceArchitectureHandoff.openOwnerGateIds],
    requiredOwnerGateIds: [...sourceArchitectureHandoff.requiredOwnerGateIds],
    sourceContract: sourceArchitectureHandoff.sourceContract,
    summary: sourceArchitectureHandoff.summary
  };
}

export function buildMathSceneV2ReleaseSliceManifest({
  finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes,
  releaseReadiness,
  reviewPackages,
  reviewSlices,
  sourceArchitectureHandoff
}: MathSceneV2ReleaseSliceManifestInput): MathSceneV2ReleaseSliceManifest {
  const includePaths = includePathsForPackages(reviewPackages);
  const forbiddenPaths = forbiddenIncludePaths(includePaths);
  const a22Blockers = releaseReadiness.blockers.filter((blocker) => blocker.startsWith("a22-"));
  const status =
    forbiddenPaths.length === 0 && includePaths.length > 0
      ? "ready-for-a22-clean-slice-review"
      : "blocked-pending-a06-release-slice-fix";
  const a22GateStatus =
    releaseReadiness.releaseGateStatus === "release-ready" && status === "ready-for-a22-clean-slice-review"
      ? "ready-for-a22-clean-release-build"
      : "blocked-by-a22-clean-release-gate";
  const submissionBridgeGateManifest = submissionBridgeVerifiedClosureGateManifest(
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes
  );
  const sliceManifest = reviewSliceManifest(reviewSlices);
  const sourceArchitecture = sourceArchitectureManifest(sourceArchitectureHandoff);

  return {
    a11RequiredRootDataAttributes: releaseReadiness.a11RequiredRootDataAttributes,
    a11RunFromBeatCheckpointInvalidationDataAttributes:
      releaseReadiness.a11RunFromBeatCheckpointInvalidationDataAttributes,
    a22Blockers,
    a22GateStatus,
    excludedPathPatterns: MATH_SCENE_V2_RELEASE_SLICE_EXCLUDED_PATH_PATTERNS,
    fileCount: includePaths.length,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames:
      submissionBridgeGateManifest.attributeNames,
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest:
      submissionBridgeGateManifest.gateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds: submissionBridgeGateManifest.gateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest:
      submissionBridgeGateManifest.gateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest:
      submissionBridgeGateManifest.gateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus: submissionBridgeGateManifest.status,
    forbiddenIncludeCount: forbiddenPaths.length,
    forbiddenIncludePaths: forbiddenPaths,
    includePaths,
    packageCount: reviewPackages.length,
    productionDeployAllowed: releaseReadiness.productionDeployAllowed && a22GateStatus === "ready-for-a22-clean-release-build",
    releasePath: releaseReadiness.releasePath,
    requiredA22Actions: a22RequiredActions(releaseReadiness),
    reviewSliceConsumerGateEvidenceIdManifest: sliceManifest.consumerGateEvidenceIdManifest,
    reviewSliceCount: sliceManifest.count,
    reviewSliceFileManifest: sliceManifest.fileManifest,
    reviewSliceIds: sliceManifest.ids,
    reviewSliceLargestFileCount: sliceManifest.largestFileCount,
    reviewSliceMaxFilesPerSlice: sliceManifest.maxFilesPerSlice,
    sourceArchitectureAcceptanceCriteria: sourceArchitecture.acceptanceCriteria,
    sourceArchitectureBulkCourseGenerationAllowed: sourceArchitecture.bulkCourseGenerationAllowed,
    sourceArchitectureCanMarkThreadGoalComplete: sourceArchitecture.canMarkThreadGoalComplete,
    sourceArchitectureFutureInvocationScope: sourceArchitecture.futureInvocationScope,
    sourceArchitectureHandoffStatus: sourceArchitecture.handoffStatus,
    sourceArchitectureOpenOwnerGateIds: sourceArchitecture.openOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds: sourceArchitecture.requiredOwnerGateIds,
    sourceArchitectureSourceContract: sourceArchitecture.sourceContract,
    sourceArchitectureSummary: sourceArchitecture.summary,
    sourceContract: MATH_SCENE_V2_RELEASE_SLICE_MANIFEST_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2ReleaseSlice",
      `status=${status}`,
      `a22=${a22GateStatus}`,
      `a11RootAttributes=${releaseReadiness.a11RequiredRootDataAttributes.length}`,
      `files=${includePaths.length}`,
      `packages=${reviewPackages.length}`,
      `forbidden=${forbiddenPaths.length}`,
      `reviewSlices=${sliceManifest.count}@${sliceManifest.maxFilesPerSlice}`,
      `submissionBridgeVerifiedClosure=${submissionBridgeGateManifest.status}`,
      `sourceArchitecture=${sourceArchitecture.handoffStatus}`,
      `sourceArchitectureScope=${sourceArchitecture.futureInvocationScope}`,
      `sourceArchitectureBulkCourseGeneration=${sourceArchitecture.bulkCourseGenerationAllowed ? "true" : "false"}`,
      `path=${releaseReadiness.releasePath}`
    ].join(":")
  };
}

export function mathSceneV2ReleaseSliceManifestDataAttributes(
  manifest: MathSceneV2ReleaseSliceManifest
) {
  return {
    "data-viz-manim-v2-release-slice-a11-required-root-attribute-count": String(
      manifest.a11RequiredRootDataAttributes.length
    ),
    "data-viz-manim-v2-release-slice-a11-run-from-beat-checkpoint-invalidation-attributes":
      manifest.a11RunFromBeatCheckpointInvalidationDataAttributes.join(","),
    "data-viz-manim-v2-release-slice-a22-gate": manifest.a22GateStatus,
    "data-viz-manim-v2-release-slice-blockers": manifest.a22Blockers.join(",") || "none",
    "data-viz-manim-v2-release-slice-file-count": String(manifest.fileCount),
    "data-viz-manim-v2-release-slice-final-objective-submission-bridge-verified-closure-gate-attribute-names":
      manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames.join(",") || "none",
    "data-viz-manim-v2-release-slice-final-objective-submission-bridge-verified-closure-gate-coverage-manifest":
      manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    "data-viz-manim-v2-release-slice-final-objective-submission-bridge-verified-closure-gate-ids":
      manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    "data-viz-manim-v2-release-slice-final-objective-submission-bridge-verified-closure-gate-owner-manifest":
      manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    "data-viz-manim-v2-release-slice-final-objective-submission-bridge-verified-closure-gate-status-manifest":
      manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    "data-viz-manim-v2-release-slice-final-objective-submission-bridge-verified-closure-status":
      manifest.finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    "data-viz-manim-v2-release-slice-forbidden-count": String(manifest.forbiddenIncludeCount),
    "data-viz-manim-v2-release-slice-package-count": String(manifest.packageCount),
    "data-viz-manim-v2-release-slice-production-deploy-allowed": String(manifest.productionDeployAllowed),
    "data-viz-manim-v2-release-slice-release-path": manifest.releasePath,
    "data-viz-manim-v2-release-slice-review-slice-consumer-gate-evidence-id-manifest":
      manifest.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-release-slice-review-slice-count": String(manifest.reviewSliceCount),
    "data-viz-manim-v2-release-slice-review-slice-file-manifest": manifest.reviewSliceFileManifest,
    "data-viz-manim-v2-release-slice-review-slice-ids": manifest.reviewSliceIds,
    "data-viz-manim-v2-release-slice-review-slice-largest-file-count":
      String(manifest.reviewSliceLargestFileCount),
    "data-viz-manim-v2-release-slice-review-slice-max-files":
      String(manifest.reviewSliceMaxFilesPerSlice),
    "data-viz-manim-v2-release-slice-source-architecture-acceptance-criteria":
      manifest.sourceArchitectureAcceptanceCriteria.join(",") || "not-attached",
    "data-viz-manim-v2-release-slice-source-architecture-bulk-course-generation":
      manifest.sourceArchitectureBulkCourseGenerationAllowed ? "true" : "false",
    "data-viz-manim-v2-release-slice-source-architecture-can-complete":
      manifest.sourceArchitectureCanMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-release-slice-source-architecture-future-invocation-scope":
      manifest.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-release-slice-source-architecture-open-owner-gates":
      manifest.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-release-slice-source-architecture-required-owner-gates":
      manifest.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-release-slice-source-architecture-source-contract":
      manifest.sourceArchitectureSourceContract,
    "data-viz-manim-v2-release-slice-source-architecture-status":
      manifest.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-release-slice-source-architecture-summary":
      manifest.sourceArchitectureSummary,
    "data-viz-manim-v2-release-slice-source-contract": manifest.sourceContract,
    "data-viz-manim-v2-release-slice-status": manifest.status,
    "data-viz-manim-v2-release-slice-summary": manifest.summary
  } as const;
}
