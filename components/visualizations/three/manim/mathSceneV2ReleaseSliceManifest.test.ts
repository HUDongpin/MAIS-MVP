import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION
} from "../../visualizationBrowserRegressionEvidence";
import {
  VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
} from "../../visualizationBrowserRegressionPackages";
import {
  VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT,
  type VisualizationReleaseReadinessEvidence
} from "../../visualizationReleaseReadinessEvidence";
import { buildManimReviewPackageHandoffMatrix } from "./mathSceneReviewPackageHandoff";
import { buildManimReviewPackageMatrix, classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  buildManimReviewPackageSliceMatrix,
  manimReviewPackageSliceDataAttributes
} from "./mathSceneReviewPackageSlices";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";
import { buildMathSceneV2GoalGate } from "./mathSceneV2GoalGate";
import {
  buildMathSceneV2ReleaseSliceManifest,
  mathSceneV2ReleaseSliceManifestDataAttributes,
  MATH_SCENE_V2_RELEASE_SLICE_MANIFEST_SOURCE_CONTRACT
} from "./mathSceneV2ReleaseSliceManifest";
import {
  buildMathSceneV2SourceArchitectureHandoff,
  MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
} from "./mathSceneV2SourceArchitectureHandoff";

const manimDir = "components/visualizations/three/manim";

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function releaseReadinessFixture(): VisualizationReleaseReadinessEvidence {
  const a11RunFromBeatCheckpointInvalidationDataAttributes = [
    ...VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
  ];

  return {
    a11BroadGateStatus: "red-needs-a11-a22-follow-up",
    a11RequiredRootDataAttributes: [...a11RunFromBeatCheckpointInvalidationDataAttributes].sort(),
    a11RunFromBeatCheckpointInvalidationDataAttributes,
    a11SplitRegressionStatus: "passed",
    a18TeachingGateStatus: "a18-final-signoff-required",
    a22ReleasePreflightStatus: "blocked-disk-space",
    a22PrunedStagingBuildStatus: "passed",
    a22RootDeployStatus: "blocked-dirty-root",
    blockers: [
      "a11-broad-visualization-value-suite-red",
      "a18-final-teaching-signoff-open",
      "a22-release-preflight-disk-blocked",
      "a22-dirty-root-release-blocked"
    ],
    productionDeployAllowed: false,
    releaseGateStatus: "not-release-ready",
    releasePath: "clean-worktree-or-reviewed-pruned-staging-slice",
    requiredFollowUpActions: [
      "adopt-hk-grade-split-packages",
      "update-projection-views-expected-list",
      VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION,
      "keep-non-hk-tracks-out-of-hk-demo-sweep",
      "investigate-isolated-next-chunk-serving-after-broad-timeout",
      "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
      "complete-a18-final-scene-signoff",
      "run-a22-generated-artifact-cleanup-after-preserving-evidence"
    ],
    sourceContract: VISUALIZATION_RELEASE_READINESS_EVIDENCE_CONTRACT,
    splitPackageStatusCounts: {
      "not-run": 0,
      passed: 12
    },
    summary:
      "visualizationReleaseReadiness:status=not-release-ready:a11Split=passed:a11Broad=red-needs-a11-a22-follow-up:a18=a18-final-signoff-required:a22Preflight=blocked-disk-space:a22Pruned=passed:a22Root=blocked-dirty-root"
  };
}

function releaseSliceManifestFixture(
  overrides: Partial<Parameters<typeof buildMathSceneV2ReleaseSliceManifest>[0]> = {}
) {
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());

  return buildMathSceneV2ReleaseSliceManifest({
    releaseReadiness: releaseReadinessFixture(),
    reviewPackages,
    ...overrides
  });
}

function sourceArchitectureHandoffFixture(
  reviewPackages: ReturnType<typeof buildManimReviewPackageMatrix>,
  reviewSlices: ReturnType<typeof buildManimReviewPackageSliceMatrix>
) {
  const reviewHandoff = buildManimReviewPackageHandoffMatrix(reviewPackages);
  const teachingDossier = buildMathSceneTeachingReviewDossier();
  const goalGate = buildMathSceneV2GoalGate({
    browserEvidence: {
      broadGateStatus: "pending-a11-browser-regression",
      hkGradePackageEvidence: [],
      hkGradeSplitStatus: "pending",
      missingHkPackageIds: ["hk-demo-S4-part-1"]
    },
    releaseReadiness: {
      a22PrunedStagingBuildStatus: "pending",
      a22ReleasePreflightStatus: "pending",
      a22RootDeployStatus: "blocked-dirty-root",
      blockers: ["a22-clean-worktree-build-required"],
      productionDeployAllowed: false,
      releaseGateStatus: "blocked"
    },
    reviewPackages,
    reviewSlices,
    teachingDossier
  });

  return buildMathSceneV2SourceArchitectureHandoff({
    goalGate,
    reviewHandoff,
    reviewSlices
  });
}

test("A22 release slice manifest includes only the classified Manim review files", () => {
  const manifest = releaseSliceManifestFixture();

  assert.equal(manifest.sourceContract, MATH_SCENE_V2_RELEASE_SLICE_MANIFEST_SOURCE_CONTRACT);
  assert.equal(manifest.status, "ready-for-a22-clean-slice-review");
  assert.equal(manifest.fileCount, currentManimFileNames().length);
  assert.equal(manifest.packageCount, 8);
  assert.equal(manifest.includePaths.length, manifest.fileCount);
  assert.equal(manifest.forbiddenIncludeCount, 0);
  assert.deepEqual(manifest.forbiddenIncludePaths, []);
  assert.ok(manifest.includePaths.every((includePath) => includePath.startsWith(`${manimDir}/`)));
  assert.ok(manifest.includePaths.includes(`${manimDir}/mathSceneV2ReleaseSliceManifest.ts`));
  assert.ok(manifest.includePaths.includes(`${manimDir}/mathSceneV2ReleaseSliceManifest.test.ts`));
});

test("A22 release slice manifest keeps generated, E2E, and local-output paths excluded", () => {
  const manifest = releaseSliceManifestFixture();

  assert.ok(manifest.excludedPathPatterns.includes("node_modules/**"));
  assert.ok(manifest.excludedPathPatterns.includes(".next/**"));
  assert.ok(manifest.excludedPathPatterns.includes(".tmp/**"));
  assert.ok(manifest.excludedPathPatterns.includes("tests/e2e/**"));
  assert.ok(manifest.excludedPathPatterns.includes(".env*"));
  assert.ok(manifest.excludedPathPatterns.includes("coordination/content-qa/**"));
  assert.ok(manifest.includePaths.every((includePath) => !includePath.startsWith("tests/e2e/")));
  assert.ok(manifest.includePaths.every((includePath) => !includePath.startsWith(".tmp/")));
});

test("A22 release slice manifest carries clean-release blockers without allowing deploy", () => {
  const manifest = releaseSliceManifestFixture();
  const attributes = mathSceneV2ReleaseSliceManifestDataAttributes(manifest);

  assert.equal(classifyManimReviewPackage("mathSceneV2ReleaseSliceManifest.ts"), "evidence");
  assert.equal(manifest.a22GateStatus, "blocked-by-a22-clean-release-gate");
  assert.equal(manifest.productionDeployAllowed, false);
  assert.equal(manifest.releasePath, "clean-worktree-or-reviewed-pruned-staging-slice");
  assert.ok(manifest.a22Blockers.includes("a22-release-preflight-disk-blocked"));
  assert.ok(manifest.a22Blockers.includes("a22-dirty-root-release-blocked"));
  assert.ok(manifest.requiredA22Actions.includes("release-from-clean-worktree-or-reviewed-pruned-staging-slice"));
  assert.deepEqual(
    manifest.a11RequiredRootDataAttributes,
    [...VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES].sort()
  );
  assert.deepEqual(
    manifest.a11RunFromBeatCheckpointInvalidationDataAttributes,
    VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-source-contract"],
    MATH_SCENE_V2_RELEASE_SLICE_MANIFEST_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-a11-required-root-attribute-count"],
    String(VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.length)
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-a11-run-from-beat-checkpoint-invalidation-attributes"],
    VISUALIZATION_BROWSER_REGRESSION_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTES.join(",")
  );
  assert.equal(attributes["data-viz-manim-v2-release-slice-status"], "ready-for-a22-clean-slice-review");
  assert.equal(attributes["data-viz-manim-v2-release-slice-a22-gate"], "blocked-by-a22-clean-release-gate");
  assert.equal(attributes["data-viz-manim-v2-release-slice-forbidden-count"], "0");
  assert.equal(attributes["data-viz-manim-v2-release-slice-production-deploy-allowed"], "false");
});

test("A22 release slice manifest carries final objective submission-bridge gate manifests", () => {
  const finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes = {
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest":
      "owner-gate-rerun-submission-bridge=1/1;final-objective-audit-request=1/1;final-objective-audit-record=1/1;final-objective-proof-ledger=4/4;verified-closure=4/4;final-closure-audit=1/1",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids":
      "owner-gate-rerun-submission-bridge,final-objective-audit-request,final-objective-audit-record,final-objective-proof-ledger,verified-closure,final-closure-audit",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest":
      "owner-gate-rerun-submission-bridge=A11+A18+A22;final-objective-audit-request=A06;final-objective-audit-record=A06+A11+A18+A22;final-objective-proof-ledger=A06+A11+A18+A22;verified-closure=A06+A11+A18+A22;final-closure-audit=A06+A11+A18+A22",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest":
      "owner-gate-rerun-submission-bridge=owner-gate-rerun-submissions-covered;final-objective-audit-request=pending-final-objective-audit-record;final-objective-audit-record=final-objective-audit-record-accepted;final-objective-proof-ledger=final-objective-proofs-covered;verified-closure=complete;final-closure-audit=complete",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status": "complete"
  } as const;
  const manifest = releaseSliceManifestFixture({
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes
  });
  const attributes = mathSceneV2ReleaseSliceManifestDataAttributes(manifest);

  assert.equal(
    manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids"
    ]
  );
  assert.equal(
    manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest"
    ]
  );
  assert.equal(
    manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest"
    ]
  );
  assert.equal(
    manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"
    ]
  );
  assert.deepEqual(manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames, [
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
  ]);
  assert.equal(
    attributes[
      "data-viz-manim-v2-release-slice-final-objective-submission-bridge-verified-closure-gate-status-manifest"
    ],
    manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-release-slice-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"
    ],
    manifest.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest
  );
  assert.match(
    attributes["data-viz-manim-v2-release-slice-summary"],
    /submissionBridgeVerifiedClosure=complete/
  );
});

test("A22 release slice manifest carries bounded A06 review-slice metadata for clean intake", () => {
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const reviewSliceAttributes = manimReviewPackageSliceDataAttributes(reviewSlices);
  const manifest = releaseSliceManifestFixture({ reviewPackages, reviewSlices });
  const attributes = mathSceneV2ReleaseSliceManifestDataAttributes(manifest);

  assert.equal(manifest.reviewSliceCount, reviewSlices.sliceCount);
  assert.equal(manifest.reviewSliceMaxFilesPerSlice, 24);
  assert.equal(manifest.reviewSliceLargestFileCount <= 24, true);
  assert.equal(manifest.reviewSliceIds, reviewSliceAttributes["data-viz-manim-review-slice-ids"]);
  assert.equal(
    manifest.reviewSliceFileManifest,
    reviewSliceAttributes["data-viz-manim-review-slice-file-manifest"]
  );
  assert.equal(
    manifest.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceAttributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"]
  );
  assert.match(manifest.summary, new RegExp(`reviewSlices=${reviewSlices.sliceCount}@24`));
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-review-slice-count"],
    String(reviewSlices.sliceCount)
  );
  assert.equal(attributes["data-viz-manim-v2-release-slice-review-slice-max-files"], "24");
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-review-slice-largest-file-count"],
    String(reviewSlices.largestSliceFileCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-review-slice-ids"],
    reviewSliceAttributes["data-viz-manim-review-slice-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-review-slice-file-manifest"],
    reviewSliceAttributes["data-viz-manim-review-slice-file-manifest"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceAttributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"]
  );
});

test("A22 release slice manifest carries source-architecture boundary for clean intake", () => {
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const sourceArchitectureHandoff = sourceArchitectureHandoffFixture(reviewPackages, reviewSlices);
  const manifest = releaseSliceManifestFixture({
    reviewPackages,
    reviewSlices,
    sourceArchitectureHandoff
  });
  const attributes = mathSceneV2ReleaseSliceManifestDataAttributes(manifest);

  assert.equal(manifest.sourceArchitectureHandoffStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(manifest.sourceArchitectureBulkCourseGenerationAllowed, false);
  assert.equal(
    manifest.sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    manifest.sourceArchitectureSourceContract,
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.deepEqual(manifest.sourceArchitectureOpenOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.ok(manifest.sourceArchitectureAcceptanceCriteria.includes("no-bulk-course-generation"));
  assert.equal(manifest.productionDeployAllowed, false);
  assert.match(manifest.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
  assert.match(manifest.summary, /sourceArchitectureScope=one-topic-one-concept-cluster-or-one-review-slice/);
  assert.match(manifest.summary, /sourceArchitectureBulkCourseGeneration=false/);

  assert.equal(
    attributes["data-viz-manim-v2-release-slice-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-source-architecture-open-owner-gates"],
    "a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
  );
  assert.match(
    attributes["data-viz-manim-v2-release-slice-source-architecture-acceptance-criteria"],
    /future-invocations-require-fresh-a18-a11-a22-gates/
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-source-architecture-source-contract"],
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-release-slice-source-architecture-summary"],
    sourceArchitectureHandoff.summary
  );
});
