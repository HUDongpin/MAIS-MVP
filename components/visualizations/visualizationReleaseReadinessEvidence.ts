import type {
  VisualizationBrowserRegressionEvidenceMatrix,
  VisualizationBrowserEvidenceStatus
} from "./visualizationBrowserRegressionEvidence";
import type {
  MathSceneTeachingSignoffGateStatus,
  MathSceneTeachingSignoffMatrix
} from "./three/manim/mathSceneTeachingSignoffMatrix";

export const VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT =
  "A06/A11/A22/A18 Visualization Lab release-readiness evidence: split browser packages and pruned staging are green, but broad regression, dirty-root release, and final teaching signoff remain open" as const;

export type VisualizationReleaseReadinessBlocker =
  | "a11-broad-visualization-value-suite-red"
  | "a18-final-teaching-signoff-open"
  | "a22-release-preflight-disk-blocked"
  | "a22-dirty-root-release-blocked";

export type VisualizationReleaseReadinessStatus = "not-release-ready" | "release-ready";

export type VisualizationReleaseReadinessInput = {
  browserEvidence: VisualizationBrowserRegressionEvidenceMatrix;
  teachingSignoff: MathSceneTeachingSignoffMatrix;
};

export type VisualizationReleaseReadinessEvidence = {
  a11BroadGateStatus: VisualizationBrowserRegressionEvidenceMatrix["broadGateStatus"];
  a11RequiredRootDataAttributes: VisualizationBrowserRegressionEvidenceMatrix["requiredRootDataAttributes"];
  a11RunFromBeatCheckpointInvalidationDataAttributes: VisualizationBrowserRegressionEvidenceMatrix["requiredRunFromBeatCheckpointInvalidationDataAttributes"];
  a11SplitRegressionStatus: "incomplete" | "passed";
  a18TeachingGateStatus: MathSceneTeachingSignoffGateStatus;
  a22ReleasePreflightStatus: "blocked-disk-space";
  a22PrunedStagingBuildStatus: "passed";
  a22RootDeployStatus: "blocked-dirty-root";
  blockers: VisualizationReleaseReadinessBlocker[];
  productionDeployAllowed: boolean;
  releaseGateStatus: VisualizationReleaseReadinessStatus;
  releasePath: "clean-worktree-or-reviewed-pruned-staging-slice";
  requiredFollowUpActions: string[];
  sourceContract: typeof VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT;
  splitPackageStatusCounts: Record<VisualizationBrowserEvidenceStatus, number>;
  summary: string;
};

function splitPackageStatusCounts(
  browserEvidence: VisualizationBrowserRegressionEvidenceMatrix
): Record<VisualizationBrowserEvidenceStatus, number> {
  const counts: Record<VisualizationBrowserEvidenceStatus, number> = {
    "not-run": 0,
    passed: 0
  };

  for (const entry of browserEvidence.hkGradePackageEvidence) {
    counts[entry.status] += 1;
  }

  return counts;
}

function releaseBlockers({
  browserEvidence,
  teachingSignoff
}: VisualizationReleaseReadinessInput): VisualizationReleaseReadinessBlocker[] {
  const blockers: VisualizationReleaseReadinessBlocker[] = [];

  if (browserEvidence.broadGateStatus === "red-needs-a11-a22-follow-up") {
    blockers.push("a11-broad-visualization-value-suite-red");
  }

  if (teachingSignoff.gateStatus === "a18-final-signoff-required") {
    blockers.push("a18-final-teaching-signoff-open");
  }

  blockers.push("a22-release-preflight-disk-blocked");
  blockers.push("a22-dirty-root-release-blocked");
  return blockers;
}

export function buildVisualizationReleaseReadinessEvidence(
  input: VisualizationReleaseReadinessInput
): VisualizationReleaseReadinessEvidence {
  const blockers = releaseBlockers(input);
  const requiredFollowUpActions = [
    ...input.browserEvidence.remainingA11Actions,
    ...input.browserEvidence.remainingA22Actions,
    "complete-a18-final-scene-signoff",
    "run-a22-generated-artifact-cleanup-after-preserving-evidence"
  ];
  const releaseGateStatus = blockers.length === 0 ? "release-ready" : "not-release-ready";

  return {
    a11BroadGateStatus: input.browserEvidence.broadGateStatus,
    a11RequiredRootDataAttributes: input.browserEvidence.requiredRootDataAttributes,
    a11RunFromBeatCheckpointInvalidationDataAttributes: input.browserEvidence.requiredRunFromBeatCheckpointInvalidationDataAttributes,
    a11SplitRegressionStatus: input.browserEvidence.hkGradeSplitStatus,
    a18TeachingGateStatus: input.teachingSignoff.gateStatus,
    a22ReleasePreflightStatus: "blocked-disk-space",
    a22PrunedStagingBuildStatus: "passed",
    a22RootDeployStatus: "blocked-dirty-root",
    blockers,
    productionDeployAllowed: releaseGateStatus === "release-ready",
    releaseGateStatus,
    releasePath: "clean-worktree-or-reviewed-pruned-staging-slice",
    requiredFollowUpActions,
    sourceContract: VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT,
    splitPackageStatusCounts: splitPackageStatusCounts(input.browserEvidence),
    summary: [
      "visualizationReleaseReadiness",
      `status=${releaseGateStatus}`,
      `a11Split=${input.browserEvidence.hkGradeSplitStatus}`,
      `a11Broad=${input.browserEvidence.broadGateStatus}`,
      `a18=${input.teachingSignoff.gateStatus}`,
      "a22Preflight=blocked-disk-space",
      "a22Pruned=passed",
      "a22Root=blocked-dirty-root",
      `blockers=${blockers.join(",") || "none"}`
    ].join(":")
  };
}

export function visualizationReleaseReadinessDataAttributes(evidence: VisualizationReleaseReadinessEvidence) {
  return {
    "data-viz-release-readiness-a11-broad-status": evidence.a11BroadGateStatus,
    "data-viz-release-readiness-a11-required-root-attribute-count": String(evidence.a11RequiredRootDataAttributes.length),
    "data-viz-release-readiness-a11-run-from-beat-checkpoint-invalidation-attributes":
      evidence.a11RunFromBeatCheckpointInvalidationDataAttributes.join(","),
    "data-viz-release-readiness-a11-split-status": evidence.a11SplitRegressionStatus,
    "data-viz-release-readiness-a18-status": evidence.a18TeachingGateStatus,
    "data-viz-release-readiness-a22-preflight": evidence.a22ReleasePreflightStatus,
    "data-viz-release-readiness-a22-pruned-staging": evidence.a22PrunedStagingBuildStatus,
    "data-viz-release-readiness-a22-root": evidence.a22RootDeployStatus,
    "data-viz-release-readiness-blockers": evidence.blockers.join(",") || "none",
    "data-viz-release-readiness-production-deploy-allowed": evidence.productionDeployAllowed ? "true" : "false",
    "data-viz-release-readiness-source-contract": evidence.sourceContract,
    "data-viz-release-readiness-status": evidence.releaseGateStatus,
    "data-viz-release-readiness-summary": evidence.summary
  } as const;
}
