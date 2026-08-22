#!/usr/bin/env node

import { spawn as spawnChild, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  readSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, TextDecoder } from "node:util";
import { Worker } from "node:worker_threads";
import ts from "typescript";
import {
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_MANIFEST_VERSION,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS,
} from "./hk-visualization-dependent-transition-plan-manifest.mjs";
import {
  auditHkVisualizationPassThroughCrossStatePaintedGeometryPair,
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH,
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLANS,
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION,
} from "./hk-visualization-pass-through-painted-geometry-pair-oracle.mjs";
import {
  HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_SCHEMA,
  hashHkVisualizationGlobalProfileMonitorSources,
  validateHkVisualizationGlobalProfileReceipt,
} from "./hk-visualization-global-profile-monitor.mjs";
import {
  HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY,
  HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_SCHEMA,
  sampleHkVisualizationProfileProcesses,
} from "./hk-visualization-profile-process-sampler.mjs";
import {
  HK_VISUALIZATION_DYNAMIC_RANGE_DEFAULT_TIMEOUT_MS,
  HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS,
  HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE,
  HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES,
  HK_VISUALIZATION_RELEASE_NON_PACKAGE_TEST_TIMEOUTS_BY_FILE,
  HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
} from "./hk-visualization-release-title-manifest.mjs";
import {
  buildHkVisualizationCanonicalE2eTsconfigBytes,
  readHkVisualizationCanonicalTsconfigExcludes,
} from "./hk-visualization-e2e-tsconfig-contract.mjs";
import {
  HK_VISUALIZATION_STARSHIP_ROOT,
  assertHkVisualizationStarshipPath,
  assertHkVisualizationBrowserProfilePaths,
  buildHkVisualizationE2eTsconfig,
  buildHkVisualizationManagedWebServerCommand,
  buildHkVisualizationStarshipPathManifest,
  captureHkVisualizationManagedToolchainIdentity,
  captureHkVisualizationMaterializedArtifactRootIdentity,
  captureHkVisualizationPhysicalPathIdentity,
  validateHkVisualizationMaterializedArtifactRootIdentity,
  validateHkVisualizationStarshipPathManifest,
} from "./hk-visualization-starship-path-contract.mjs";
import {
  assertHkVisualizationReleaseSourceSnapshotUnchanged,
  captureHkVisualizationReleaseSourceSnapshot,
  compareHkVisualizationReleaseSourceSnapshots,
  validateHkVisualizationReleaseSourceSnapshot,
} from "./hk-visualization-release-source-freeze.mjs";
import {
  HK_VISUALIZATION_CANONICAL_DEPENDENCY_CLOSURE,
  HK_VISUALIZATION_DEPENDENCY_CLOSURE_FROZEN_REFERENCE_SHA256,
  HK_VISUALIZATION_DEPENDENCY_CLOSURE_ARTIFACT_SCHEMA,
  HK_VISUALIZATION_DEPENDENCY_CLOSURE_SCHEMA,
  HK_VISUALIZATION_DEPENDENCY_CLOSURE_SUMMARY_SCHEMA,
  captureAndAssertHkVisualizationCanonicalDependencyClosure,
  compareHkVisualizationDependencyClosures,
  validateHkVisualizationDependencyClosureManifestArtifact,
  validateHkVisualizationDependencyClosureSummaryReceipt,
} from "./hk-visualization-dependency-closure.mjs";
import {
  hashHkVisualizationWorkloadCommand,
  hashHkVisualizationWorkloadSupervisorSources,
  validateHkVisualizationWorkloadSupervisorReceipt,
} from "./hk-visualization-workload-supervisor.mjs";

export const HK_VISUALIZATION_EXECUTION_RUNTIME_ROOT = join(
  HK_VISUALIZATION_STARSHIP_ROOT,
  ".hk-visualization-release-runtime",
);

export function allocateHkVisualizationExecutionRoots({
  runId,
  runtimeRoot = HK_VISUALIZATION_EXECUTION_RUNTIME_ROOT,
  sourceWorkspace,
} = {}) {
  const source = assertHkVisualizationStarshipPath(
    "HK Visualization execution root source workspace",
    resolve(sourceWorkspace),
  );
  if (
    typeof runId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(runId)
  ) {
    throw new Error("HK Visualization execution roots require one safe runId.");
  }
  const normalizedRuntimeRoot = assertHkVisualizationStarshipPath(
    "HK Visualization execution runtime root",
    resolve(runtimeRoot),
  );
  if (!existsSync(normalizedRuntimeRoot)) {
    mkdirSync(normalizedRuntimeRoot, { mode: 0o700 });
  }
  const runtimeIdentity = captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization execution runtime root",
    normalizedRuntimeRoot,
  );
  const sourceIdentity = captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization execution root source workspace",
    source,
  );
  if (runtimeIdentity.device !== sourceIdentity.device) {
    throw new Error(
      "HK Visualization execution runtime root must share the source Starship device.",
    );
  }
  const safePrefix = runId.slice(0, 96);
  const executionWorkspace = mkdtempSync(
    join(normalizedRuntimeRoot, `${safePrefix}-stage-`),
  );
  const artifactWorkspace = mkdtempSync(
    join(normalizedRuntimeRoot, `${safePrefix}-artifacts-`),
  );
  for (const [label, path] of [
    ["execution workspace", executionWorkspace],
    ["artifact workspace", artifactWorkspace],
  ]) {
    const identity = captureHkVisualizationPhysicalPathIdentity(
      `HK Visualization ${label}`,
      path,
    );
    if (identity.device !== sourceIdentity.device) {
      throw new Error(`HK Visualization ${label} left the source device.`);
    }
  }
  return Object.freeze({
    artifactWorkspace,
    executionWorkspace,
    runtimeRoot: normalizedRuntimeRoot,
    sourceWorkspace: source,
  });
}

export const HK_VISUALIZATION_RELEASE_SPECS = Object.freeze([
  "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
  "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
  "tests/e2e/hk-visualization-state-isolation.spec.ts",
  "tests/e2e/hk-visualization-collision-microfixtures.spec.ts",
  "tests/e2e/hk-visualization-contrast-microfixtures.spec.ts",
  "tests/e2e/hk-visualization-interaction-microfixtures.spec.ts",
  "tests/e2e/hk-visualization-dynamic-range-microfixtures.spec.ts",
  "tests/e2e/hk-visualization-p3-fraction-endpoints.spec.ts",
  "tests/e2e/hk-visualization-non-hk-order.spec.ts",
]);

export const HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS = Object.freeze({
  "tests/e2e/hk-visualization-machine-acceptance.spec.ts": 218,
  "tests/e2e/hk-visualization-lesson-embeddability.spec.ts": 28,
  "tests/e2e/hk-visualization-state-isolation.spec.ts": 19,
  "tests/e2e/hk-visualization-collision-microfixtures.spec.ts": 44,
  "tests/e2e/hk-visualization-contrast-microfixtures.spec.ts": 32,
  "tests/e2e/hk-visualization-interaction-microfixtures.spec.ts": 16,
  "tests/e2e/hk-visualization-dynamic-range-microfixtures.spec.ts": 11,
  "tests/e2e/hk-visualization-p3-fraction-endpoints.spec.ts": 1,
  "tests/e2e/hk-visualization-non-hk-order.spec.ts": 1,
});

export const HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT = Object.values(
  HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS,
).reduce((total, count) => total + count, 0);

export const HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE =
  "hk-viz-scroll-observation-aggregate";
export const HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION =
  "hk-viz-browser-scroll-aggregate-v1";
export const HK_VISUALIZATION_BROWSER_SCROLL_RUN_EVIDENCE_VERSION =
  "hk-viz-browser-scroll-run-evidence-v1";
export const HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_ANNOTATION_TYPE =
  "hk-viz-dependent-transition-aggregate";
export const HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION =
  "hk-viz-browser-dependent-transition-aggregate-v2";
export const HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION =
  "hk-viz-browser-dependent-transition-run-evidence-v4";
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_CELL_COUNT = 126;
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_SEQUENCE_OBSERVATION_COUNT =
  198;
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_PHASE_OBSERVATION_COUNT =
  594;
const hkVisualizationMiB = 1024 * 1024;
const hkVisualizationDependentTransitionAttachmentDecodedBytes =
  8 * hkVisualizationMiB;
const hkVisualizationDependentTransitionPackageCount = 216;
const hkVisualizationDependentTransitionCumulativeDecodedBytesPerPackage =
  2 * hkVisualizationMiB;
// The canonical workload contains exactly 216 package attachments.  Each is
// independently capped at 8 MiB, while the whole report is budgeted at a
// practical 2 MiB decoded per canonical package plus 96 MiB for Playwright's
// non-attachment JSON topology.  For N positive bodies with decoded sum D,
// the exact separately encoded maximum is 4 * (N + floor((D - N) / 3));
// every Base64 ceiling is therefore enforceable before decoding.
const hkVisualizationDependentTransitionCumulativeDecodedBytes =
  hkVisualizationDependentTransitionPackageCount *
  hkVisualizationDependentTransitionCumulativeDecodedBytesPerPackage;
const hkVisualizationDependentTransitionCumulativeEncodedBytes =
  4 * (
    hkVisualizationDependentTransitionPackageCount +
    Math.floor(
      (
        hkVisualizationDependentTransitionCumulativeDecodedBytes -
        hkVisualizationDependentTransitionPackageCount
      ) / 3,
    )
  );
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS =
  Object.freeze({
    annotationUtf8Bytes: hkVisualizationMiB,
    attachmentDecodedBytes:
      hkVisualizationDependentTransitionAttachmentDecodedBytes,
    attachmentEncodedBytes: Math.ceil(
      hkVisualizationDependentTransitionAttachmentDecodedBytes / 3,
    ) * 4,
    cumulativeAttachmentDecodedBytes:
      hkVisualizationDependentTransitionCumulativeDecodedBytes,
    cumulativeAttachmentEncodedBytes:
      hkVisualizationDependentTransitionCumulativeEncodedBytes,
    jsonReportBytes:
      hkVisualizationDependentTransitionCumulativeEncodedBytes +
      96 * hkVisualizationMiB,
    jsonReportNonAttachmentBytes: 96 * hkVisualizationMiB,
    packageCount: hkVisualizationDependentTransitionPackageCount,
  });
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_ANNOTATION_MAX_UTF8_BYTES =
  HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS.annotationUtf8Bytes;
export const HK_VISUALIZATION_DEPENDENT_TRANSITION_PACKAGE_RESULT_MAX_BYTES =
  HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS.attachmentDecodedBytes;
const hkVisualizationDependentTransitionLedgerHashPayloadMaxBytes = 524_288;
const hkVisualizationMachineAcceptanceSchemaVersion =
  "hk-viz-machine-acceptance.v3";
const hkVisualizationDependentTransitionSchemaVersion =
  "hk-viz-dependent-transition-sequence.v8";
const hkVisualizationDependentTransitionPhaseIds = Object.freeze([
  "pre",
  "clamp",
  "expand",
]);
const hkVisualizationDependentTransitionProjectionSources = Object.freeze([
  "canonical-visible-baseline",
  "phase:pre",
  "phase:clamp",
  "phase:expand",
  "post-sequence-restoration",
]);
const hkVisualizationDependentTransitionSequenceIdsByLab = Object.freeze({
  "p1-counting-number-bonds": Object.freeze([
    "p1-number-bond-known-part",
  ]),
  "p1-addition-subtraction": Object.freeze([
    "p1-add-step",
    "p1-subtract-step",
  ]),
  "p2-money-time": Object.freeze(["p2-payment-at-least-price"]),
  "p4-large-numbers": Object.freeze(["p4-divisor-within-number"]),
  "p5-fractions-operations": Object.freeze([
    "p5-first-proper-fraction",
    "p5-second-proper-fraction",
    "p5-third-proper-fraction",
  ]),
  "p5-volume": Object.freeze(["p5-visible-volume-layers"]),
  "identities-square-patterns": Object.freeze([
    "s3-identity-a-projects-b",
    "s3-identity-b-projects-a",
  ]),
});
const hkVisualizationDependentTransitionGradeByLabId = Object.freeze({
  "p1-counting-number-bonds": "P1",
  "p1-addition-subtraction": "P1",
  "p2-money-time": "P2",
  "p4-large-numbers": "P4",
  "p5-fractions-operations": "P5",
  "p5-volume": "P5",
  "identities-square-patterns": "S3",
});
const hkVisualizationDependentTransitionSourceTopology = Object.fromEntries(
  Object.keys(hkVisualizationDependentTransitionSequenceIdsByLab).map(
    (labId) => [
      labId,
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS.filter(
        (plan) => plan.labId === labId,
      ).map(({ sequenceId }) => sequenceId),
    ],
  ),
);
if (
  !isDeepStrictEqual(
    hkVisualizationDependentTransitionSourceTopology,
    hkVisualizationDependentTransitionSequenceIdsByLab,
  )
) {
  throw new Error(
    "HK Visualization dependent-transition runner topology drifted from its frozen source-plan manifest.",
  );
}
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE =
  "hk-viz-pass-through-oracle-aggregate";
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION =
  "hk-viz-browser-pass-through-oracle-aggregate-v1";
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_RUN_EVIDENCE_VERSION =
  "hk-viz-browser-pass-through-oracle-run-evidence-v1";
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_ANNOTATION_TYPE =
  "hk-viz-pass-through-painted-geometry-pair-aggregate";
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION =
  "hk-viz-browser-pass-through-painted-geometry-pair-aggregate-v1";
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_RUN_EVIDENCE_VERSION =
  "hk-viz-browser-pass-through-painted-geometry-pair-run-evidence-v1";
export const HK_VISUALIZATION_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_SOURCE_PATHS =
  Object.freeze([
    "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.mjs",
    "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.test.mjs",
    "tests/e2e/hk-visualization-browser-chunk-adapter.ts",
    "tests/e2e/hk-visualization-browser-chunk-adapter.test.ts",
    "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    "tests/e2e/run-hk-visualization-release-gate.mjs",
    "tests/e2e/run-hk-visualization-release-gate.test.mjs",
  ]);
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_ANNOTATION_TYPE =
  "hk-viz-pass-through-reset-aggregate";
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION =
  "hk-viz-browser-pass-through-reset-aggregate-v3";
export const HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_RUN_EVIDENCE_VERSION =
  "hk-viz-browser-pass-through-reset-run-evidence-v3";
export const HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION =
  "hk-viz-pass-through-reset.v3";
export const HK_VISUALIZATION_BROWSER_P6_AVERAGES_ANNOTATION_TYPE =
  "hk-viz-p6-averages-boundary-aggregate";
export const HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION =
  "hk-viz-browser-p6-averages-aggregate-v1";
export const HK_VISUALIZATION_BROWSER_P6_AVERAGES_RUN_EVIDENCE_VERSION =
  "hk-viz-browser-p6-averages-run-evidence-v1";
export const HK_VISUALIZATION_P6_AVERAGES_LAB_ID = "p6-ratio-proportion";
export const HK_VISUALIZATION_P6_AVERAGES_EXPECTED_CELL_COUNT = 18;
export const HK_VISUALIZATION_BROWSER_P6_BUDGET_ANNOTATION_TYPE =
  "hk-viz-p6-budget-boundary-aggregate";
export const HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION =
  "hk-viz-browser-p6-budget-aggregate-v1";
export const HK_VISUALIZATION_BROWSER_P6_BUDGET_RUN_EVIDENCE_VERSION =
  "hk-viz-browser-p6-budget-run-evidence-v1";
export const HK_VISUALIZATION_P6_BUDGET_LAB_ID =
  "p6-pre-secondary-problem-solving";
export const HK_VISUALIZATION_P6_BUDGET_EXPECTED_CELL_COUNT = 18;
export const HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS = Object.freeze([
  "p2-multiplication-foundations",
  "p3-fractions-intro",
  "statistics-s1",
  "data-handling",
  "advanced-functions",
  "differentiation-intro",
  "calculus",
]);
export const HK_VISUALIZATION_PASS_THROUGH_ORACLE_EXPECTED_CELL_COUNT = 126;
export const HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_OBSERVATION_COUNT = 378;
export const HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_RESTORING_ACTION_COUNT = 252;
export const HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_CANONICAL_NOOP_ACTION_COUNT = 126;
export const HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_LAYER_RECEIPT_COUNT = 1134;
export const HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_LAYER_ENDPOINT_HASH_COUNT = 2268;
const hkVisualizationPassThroughOracleLabIdSet = new Set(
  HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS,
);
const hkVisualizationPassThroughOracleGradeByLabId = Object.freeze({
  "p2-multiplication-foundations": "P2",
  "p3-fractions-intro": "P3",
  "statistics-s1": "S1",
  "data-handling": "S4",
  "advanced-functions": "S5",
  "differentiation-intro": "S5",
  "calculus": "S6",
});
const hkVisualizationPassThroughResetPlans = Object.freeze({
  "advanced-functions": Object.freeze({ comparison: 5, height: 3, mode: 0, value: 5 }),
  calculus: Object.freeze({ comparison: 4, height: 3, mode: 0, value: 5 }),
  "data-handling": Object.freeze({ comparison: 2, height: 3, mode: 0, value: 5 }),
  "differentiation-intro": Object.freeze({ comparison: 4, height: 3, mode: 0, value: 5 }),
  "p2-multiplication-foundations": Object.freeze({ comparison: 5, height: 3, mode: 0, value: 4 }),
  "p3-fractions-intro": Object.freeze({ comparison: 4, height: 3, mode: 0, value: 5 }),
  "statistics-s1": Object.freeze({ comparison: 2, height: 3, mode: 0, value: 5 }),
});
const hkVisualizationPassThroughResetPerturbations = Object.freeze({
  "advanced-functions": Object.freeze({ comparison: 0, height: 3, mode: 0, value: 5 }),
  calculus: Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
  "data-handling": Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
  "differentiation-intro": Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
  "p2-multiplication-foundations": Object.freeze({ comparison: 1, height: 3, mode: 0, value: 4 }),
  "p3-fractions-intro": Object.freeze({ comparison: 0, height: 3, mode: 0, value: 5 }),
  "statistics-s1": Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
});
const hkVisualizationMatrixViewports = Object.freeze([
  "desktop",
  "tablet",
  "mobile",
]);
const hkVisualizationMatrixLanguages = Object.freeze(["zh-Hans", "zh", "en"]);
const hkVisualizationMatrixThemes = Object.freeze(["light", "dark"]);

function exactMatrixCellIdsByLabGrade(entries) {
  return Object.freeze(
    Object.entries(entries)
      .flatMap(([labId, grade]) =>
        hkVisualizationMatrixViewports.flatMap((viewport) =>
          hkVisualizationMatrixLanguages.flatMap((language) =>
            hkVisualizationMatrixThemes.map(
              (theme) => `${grade}/${labId}/${viewport}/${language}/${theme}`,
            ),
          ),
        ),
      )
      .sort(),
  );
}

const hkVisualizationExpectedPassThroughOracleCellIds =
  exactMatrixCellIdsByLabGrade(hkVisualizationPassThroughOracleGradeByLabId);
const hkVisualizationPassThroughPaintedGeometryPairGradeByLabId =
  Object.freeze({
    "advanced-functions": "S5",
    "data-handling": "S4",
    "statistics-s1": "S1",
  });
const hkVisualizationPassThroughPaintedGeometryPairLabIds = Object.freeze(
  Object.keys(hkVisualizationPassThroughPaintedGeometryPairGradeByLabId).sort(),
);
const hkVisualizationExpectedPassThroughPaintedGeometryPairCellIds =
  exactMatrixCellIdsByLabGrade(
    hkVisualizationPassThroughPaintedGeometryPairGradeByLabId,
  );
const hkVisualizationExpectedPassThroughPaintedGeometryPairCellIdSet =
  new Set(hkVisualizationExpectedPassThroughPaintedGeometryPairCellIds);
const hkVisualizationExpectedDependentTransitionCellIds =
  exactMatrixCellIdsByLabGrade(
    hkVisualizationDependentTransitionGradeByLabId,
  );
const hkVisualizationExpectedP6AveragesCellIds = exactMatrixCellIdsByLabGrade({
  [HK_VISUALIZATION_P6_AVERAGES_LAB_ID]: "P6",
});
const hkVisualizationExpectedP6BudgetCellIds = exactMatrixCellIdsByLabGrade({
  [HK_VISUALIZATION_P6_BUDGET_LAB_ID]: "P6",
});
const hkVisualizationMachineSpec =
  "tests/e2e/hk-visualization-machine-acceptance.spec.ts";
const hkVisualizationMachinePackageTitles = Object.freeze(
  HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES[
    hkVisualizationMachineSpec
  ].slice(2),
);
const hkVisualizationExpectedMachinePackageCount = 216;
const hkVisualizationExpectedMachineCellCount = 918;
const hkVisualizationScrollAuditsPerObservation = 6;
const hkVisualizationScrollMaximumContainersPerSet = 4;
const hkVisualizationScrollMaximumObservationsPerSet = 9;
const hkVisualizationScrollDiscoveryMsPerSet = 2_000;
const hkVisualizationScrollAuditsMsPerObservation = 6_000;

export const HK_VISUALIZATION_RELEASE_SOURCE_RECEIPT_SCHEMA =
  "hk-viz-release-source-receipt-v2";
export const HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS = Object.freeze([
  "package.json",
  "package-lock.json",
  "playwright.config.ts",
  "scripts/next-clean-build.mjs",
  "tests/e2e/run-hk-visualization-release-gate.mjs",
  "tests/e2e/run-hk-visualization-release-gate.test.mjs",
  "tests/e2e/hk-visualization-release-source-freeze.mjs",
  "tests/e2e/hk-visualization-dependency-closure.mjs",
  "tests/e2e/hk-visualization-e2e-tsconfig-contract.mjs",
  "tests/e2e/hk-visualization-starship-path-contract.mjs",
  "tests/e2e/hk-visualization-release-title-manifest.mjs",
  "tests/e2e/hk-visualization-global-profile-monitor.mjs",
  "tests/e2e/hk-visualization-profile-process-sampler.mjs",
  "tests/e2e/hk-visualization-owned-process-ledger.mjs",
  "tests/e2e/hk-visualization-workload-supervisor.mjs",
  "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
  "tests/e2e/hk-visualization-browser-chunk-adapter.ts",
  "tests/e2e/hk-visualization-browser-chunk-adapter.test.ts",
  "tests/e2e/hk-visualization-dependent-transition-plan-manifest.mjs",
  "tests/e2e/hk-visualization-dependent-visible-math-contract.ts",
  "tests/e2e/hk-visualization-state-chunk-contract.ts",
  "tests/e2e/hk-visualization-range-state-ledger.ts",
  "tests/e2e/hk-visualization-pass-through-math-oracle-contract.ts",
  "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.mjs",
  "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.test.mjs",
  ...HK_VISUALIZATION_RELEASE_SPECS,
  "components/lesson/LessonView.tsx",
  "components/visualizations/ConfiguredVisualizationLab.tsx",
  "components/visualizations/hk/HKVisualizationLab.tsx",
  "components/visualizations/hk/HKPrimaryVisualizationLab.tsx",
  "components/visualizations/hk/HKSecondaryVisualizationLab.tsx",
  "components/visualizations/hk/hkVisualizationLabRegistry.ts",
  "components/visualizations/hk/hkVisualizationLessonContracts.ts",
  "data/lessons.ts",
  "data/topics.ts",
  "data/visualizationLabs.ts",
  "tsconfig.json",
]);
export const HK_VISUALIZATION_RELEASE_SOURCE_EXECUTION_CONTRACT_VERSION =
  "hk-viz-release-source-execution-window-v1";
export const HK_VISUALIZATION_RELEASE_SOURCE_MONITOR_VERSION =
  "hk-viz-release-source-fs-watch-monitor-v2";
export const HK_VISUALIZATION_RELEASE_SOURCE_MONITOR_POLICY = Object.freeze({
  directoryEvents: "disabled-exact-file-watch-authority",
  drain: "worker-two-turn-15ms",
  fileEvents: "exact-immutable-identity-change-and-rename",
  nullFilename: "fail-closed",
  persistent: true,
  watcherError: "fail-closed",
  watcherUnexpectedClose: "fail-closed",
});

const fixedSafePath = "/usr/bin:/bin:/usr/sbin:/sbin";

// This is an honest upper bound, not an expected duration. It sums the exact
// current machine-package timeout ledger (216 packages / 918 cells), the exact
// lesson-package timeout ledger (24 packages / 102 cells), every remaining
// source-owned per-title timeout cap, all six static package-front titles at
// 120 seconds each, and 18 minutes for managed build/server/report
// infrastructure. Static plus infrastructure retain the prior 30-minute
// reserve. The supervisor receives the resulting absolute deadline and gets
// one additional bounded cleanup grace in the outer spawn.
export const HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY = Object.freeze({
  packageCount: hkVisualizationExpectedMachinePackageCount,
  packageSetupMs: 45_000,
  cellCount: hkVisualizationExpectedMachineCellCount,
  cellDeadlineMs: 105_000,
  cellOverheadMs: 5_000,
  dependentTransitionSequenceCount:
    HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_SEQUENCE_OBSERVATION_COUNT,
  dependentTransitionSequenceDeadlineMs: 15_000,
});
export const HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_SUM_MS =
  HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY.packageCount *
    HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY.packageSetupMs +
  HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY.cellCount *
    (HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY.cellDeadlineMs +
      HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY.cellOverheadMs) +
  HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY
    .dependentTransitionSequenceCount *
    HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY
      .dependentTransitionSequenceDeadlineMs;
export const HK_VISUALIZATION_LESSON_PACKAGE_TIMEOUT_SUM_MS = 9_090_000;
export const HK_VISUALIZATION_OTHER_TEST_TIMEOUT_CAP_MS =
  HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS;
export const HK_VISUALIZATION_RELEASE_SOURCE_FILE_MAX_BYTES = 2 * 1024 * 1024;

export const HK_VISUALIZATION_STATIC_TEST_TIMEOUT_CAP_MS = 120_000;
export const HK_VISUALIZATION_STATIC_TEST_TIMEOUT_ROWS = Object.freeze([
  Object.freeze({
    file: "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    title: "matrix manifest is complete for the requested scope",
    timeoutMs: HK_VISUALIZATION_STATIC_TEST_TIMEOUT_CAP_MS,
  }),
  Object.freeze({
    file: "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    title: "false-pass guard helpers reject broad, untranslated, and non-transition evidence",
    timeoutMs: HK_VISUALIZATION_STATIC_TEST_TIMEOUT_CAP_MS,
  }),
  Object.freeze({
    file: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    title: "source manifest hard-gates one exact embedded lesson for all 51 registry ids",
    timeoutMs: HK_VISUALIZATION_STATIC_TEST_TIMEOUT_CAP_MS,
  }),
  Object.freeze({
    file: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    title: "lesson browser option resolver defaults to full and rejects partial false-passes",
    timeoutMs: HK_VISUALIZATION_STATIC_TEST_TIMEOUT_CAP_MS,
  }),
  Object.freeze({
    file: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    title: "visibility-chain helper rejects hidden, inert, aria-hidden, and transparent ancestors",
    timeoutMs: HK_VISUALIZATION_STATIC_TEST_TIMEOUT_CAP_MS,
  }),
  Object.freeze({
    file: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    title: "source guard keeps local visibility paths ancestor-aware and reuses the hardened machine scanners",
    timeoutMs: HK_VISUALIZATION_STATIC_TEST_TIMEOUT_CAP_MS,
  }),
]);

const HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_CONTRACT_VERSION =
  "hk-viz-static-deadline-source-freeze-v1";
export const HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS = Object.freeze([
  Object.freeze({
    path: "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    sha256: "2d0d724ec9b9fa284b59e6682d19ccd1df0d30313028c32803804d597bd3c4fd",
    size: 22_298,
  }),
  Object.freeze({
    path: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    sha256: "3f97760cd3e07c5f29ad2ace65e787da2d1f30627c2ed6d1bbe0b2e63776edd0",
    size: 60_730,
  }),
]);
export const HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_AGGREGATE_SHA256 =
  "a071a165dd9b2dba23de4b922d6d418d571723ea20b5acc517c45dbb86df95e8";

function defaultHkVisualizationStaticTestSources() {
  const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  return Object.fromEntries(
    HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS.map(({ path }) => [
        path,
        readHkVisualizationBoundedStableRegularFile(join(workspace, path))
          .toString("utf8"),
      ]),
  );
}

export function validateHkVisualizationStaticDeadlineSourceFreeze({
  sourceAuthorityRows = HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS,
  sourceByFile = defaultHkVisualizationStaticTestSources(),
} = {}) {
  if (
    !isDeepStrictEqual(
      sourceAuthorityRows,
      HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS,
    )
  ) {
    throw new Error(
      "HK Visualization frozen static deadline source authority drifted from the exact two ordered rows.",
    );
  }
  const sourceAggregateSha256 = sha256Text(canonicalJson({
    contractVersion: HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_CONTRACT_VERSION,
    sourceRows: sourceAuthorityRows,
  }));
  if (
    sourceAggregateSha256 !==
      HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_AGGREGATE_SHA256
  ) {
    throw new Error(
      "HK Visualization frozen static deadline source aggregate drifted.",
    );
  }
  const expectedPaths = sourceAuthorityRows.map(({ path }) => path);
  if (!exactOrderedObjectKeys(sourceByFile, expectedPaths)) {
    throw new Error(
      "HK Visualization frozen static deadline source map drifted from the exact two ordered paths.",
    );
  }
  for (const [index, row] of sourceAuthorityRows.entries()) {
    if (
      !exactOrderedObjectKeys(row, ["path", "sha256", "size"]) ||
      row.path !== expectedPaths[index] ||
      typeof row.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/u.test(row.sha256) ||
      !Number.isSafeInteger(row.size) ||
      row.size < 1
    ) {
      throw new Error(
        `HK Visualization frozen static deadline source row ${index} has shape, path, SHA, or size drift.`,
      );
    }
    const source = sourceByFile[row.path];
    if (typeof source !== "string") {
      throw new Error(
        `HK Visualization frozen static deadline source is missing for ${row.path}.`,
      );
    }
    const bytes = Buffer.from(source, "utf8");
    if (
      bytes.byteLength !== row.size ||
      sha256Text(bytes) !== row.sha256
    ) {
      throw new Error(
        `HK Visualization frozen static deadline source bytes drifted for ${row.path}.`,
      );
    }
  }
  return Object.freeze({
    contractVersion: HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_CONTRACT_VERSION,
    sourceAggregateSha256,
    sourceRows: Object.freeze(
      sourceAuthorityRows.map((row) => Object.freeze({ ...row })),
    ),
  });
}

const hkVisualizationStaticAstStructures = Object.freeze({
  "tests/e2e/hk-visualization-machine-acceptance.spec.ts": Object.freeze({
    methodCounts: Object.freeze({
      afterAll: 1,
      beforeEach: 1,
      describe: 1,
      setTimeout: 1,
      skip: 1,
    }),
    packageLoops: Object.freeze([
      Object.freeze({ expression: "packages", initializer: "const regressionPackage" }),
    ]),
    packageTimeout:
      "test.setTimeout(Math.max(120_000, 45_000 + packageCellBudget))",
    packageTitle:
      "`${regressionPackage.id} exercises every selected HK lab`",
    skipCategories: Object.freeze(["beforeEach"]),
    suiteTitle: "HK Visualization Lab machine acceptance",
  }),
  "tests/e2e/hk-visualization-lesson-embeddability.spec.ts": Object.freeze({
    methodCounts: Object.freeze({
      afterAll: 1,
      beforeEach: 1,
      describe: 1,
      setTimeout: 1,
      skip: 2,
    }),
    packageLoops: Object.freeze([
      Object.freeze({ expression: "gradePackages", initializer: "const gradePackage" }),
      Object.freeze({
        expression: "Object.keys(lessonViewports) as LessonViewportId[]",
        initializer: "const viewportId",
      }),
    ]),
    packageTimeout:
      "test.setTimeout(Math.max(150_000, 60_000 + gradePackage.rows.length * 75_000))",
    packageTitle:
      "`${viewportId}/${gradePackage.grade} verifies every planned lesson embed`",
    skipCategories: Object.freeze(["beforeEach", "package"]),
    suiteTitle: "HK lesson Visualization Lab embeddability",
  }),
});

function hkVisualizationAstText(node, sourceFile) {
  return node?.getText(sourceFile) ?? "";
}

function hkVisualizationAstCallback(call, label) {
  const callback = call.arguments[1] ?? call.arguments[0];
  if (
    !callback ||
    (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))
  ) {
    throw new Error(
      `HK Visualization structural AST whitelist requires a direct callback for ${label}.`,
    );
  }
  return callback;
}

function hkVisualizationAstEnclosingCategory(node, callbackCategories) {
  for (let current = node.parent; current; current = current.parent) {
    if (callbackCategories.has(current)) return callbackCategories.get(current);
  }
  return null;
}

function hkVisualizationAstForOfTopology(node, sourceFile) {
  const topology = [];
  for (let current = node.parent; current; current = current.parent) {
    if (!ts.isForOfStatement(current)) continue;
    topology.push({
      expression: hkVisualizationAstText(current.expression, sourceFile),
      initializer: hkVisualizationAstText(current.initializer, sourceFile),
    });
  }
  return topology;
}

function hkVisualizationTestInfoPropertyChain(identifier) {
  const names = [];
  let outer = identifier;
  while (
    outer.parent &&
    ts.isPropertyAccessExpression(outer.parent) &&
    outer.parent.expression === outer
  ) {
    names.push(outer.parent.name.text);
    outer = outer.parent;
  }
  return { names, outer };
}

function validateHkVisualizationTestInfoParameterUses(
  callback,
  parameter,
  category,
) {
  if (!parameter) return;
  if (!ts.isIdentifier(parameter.name)) {
    throw new Error(
      `HK Visualization structural AST whitelist rejects non-identifier TestInfo parameters in ${category}.`,
    );
  }
  const parameterName = parameter.name.text;
  const references = [];
  const collect = (node) => {
    if (ts.isIdentifier(node) && node.text === parameterName) {
      references.push(node);
    }
    ts.forEachChild(node, collect);
  };
  collect(callback.body);
  for (const reference of references) {
    const { names, outer } = hkVisualizationTestInfoPropertyChain(reference);
    const path = names.join(".");
    if (
      path === "project.name" ||
      path === "project.use.baseURL"
    ) {
      continue;
    }
    if (path === "annotations.push" || path === "attach") {
      if (
        outer.parent &&
        ts.isCallExpression(outer.parent) &&
        outer.parent.expression === outer
      ) {
        continue;
      }
    }
    if (category === "package") {
      if (
        reference.parent &&
        ts.isCallExpression(reference.parent) &&
        reference.parent.expression.getText() === "resolvedBaseURL" &&
        reference.parent.arguments.includes(reference)
      ) {
        continue;
      }
      if (
        reference.parent &&
        ts.isShorthandPropertyAssignment(reference.parent) &&
        reference.parent.parent &&
        ts.isObjectLiteralExpression(reference.parent.parent) &&
        reference.parent.parent.parent &&
        ts.isCallExpression(reference.parent.parent.parent) &&
        reference.parent.parent.parent.expression.getText() ===
          "runHkVisualizationPackage"
      ) {
        continue;
      }
    }
    throw new Error(
      `HK Visualization structural AST whitelist rejects TestInfo timeout/slow reflection, computed access, pass, storage, spread, return, or unsafe chain in ${category}.`,
    );
  }
}

function validateHkVisualizationStaticAstStructure(
  source,
  file,
  exactStaticTitles,
) {
  const structure = hkVisualizationStaticAstStructures[file];
  if (!structure) {
    throw new Error(
      `HK Visualization structural AST whitelist has no exact file authority for ${file}.`,
    );
  }
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    throw new Error(
      `HK Visualization structural AST whitelist could not parse ${file}.`,
    );
  }

  const playwrightImports = sourceFile.statements.filter(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === "@playwright/test",
  );
  const importedTestNames = playwrightImports.flatMap((statement) => {
    const bindings = statement.importClause?.namedBindings;
    return bindings && ts.isNamedImports(bindings)
      ? bindings.elements.filter(
          (element) => (element.propertyName ?? element.name).text === "test",
        )
      : [];
  });
  if (
    importedTestNames.length !== 1 ||
    importedTestNames[0].name.text !== "test" ||
    importedTestNames[0].propertyName
  ) {
    throw new Error(
      `HK Visualization structural AST whitelist requires one direct imported Playwright test identifier in ${file}.`,
    );
  }

  const nodes = [];
  const directTestCalls = [];
  const testMethodCalls = [];
  const visit = (node) => {
    nodes.push(node);
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === "test") {
        directTestCalls.push(node);
      } else if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "test"
      ) {
        testMethodCalls.push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const allowedImportedTestIdentifiers = new Set([importedTestNames[0].name]);
  const callbackCategories = new Map();
  const exactCallbacks = [];
  const observedExactTitles = [];
  let packageCall = null;
  for (const call of directTestCalls) {
    const titleNode = call.arguments[0];
    const callback = call.arguments[1];
    if (!titleNode || !callback || call.arguments.length !== 2) {
      throw new Error(
        `HK Visualization structural AST whitelist rejects malformed direct test declarations in ${file}.`,
      );
    }
    if (
      ts.isStringLiteral(titleNode) &&
      exactStaticTitles.includes(titleNode.text)
    ) {
      const directCallback = hkVisualizationAstCallback(call, titleNode.text);
      callbackCategories.set(directCallback, "exact6");
      exactCallbacks.push(directCallback);
      observedExactTitles.push(titleNode.text);
      allowedImportedTestIdentifiers.add(call.expression);
      continue;
    }
    if (hkVisualizationAstText(titleNode, sourceFile) === structure.packageTitle) {
      if (packageCall) {
        throw new Error(
          `HK Visualization structural AST whitelist found duplicate package declarations in ${file}.`,
        );
      }
      const directCallback = hkVisualizationAstCallback(call, "package");
      if (
        !ts.isArrowFunction(directCallback) ||
        !directCallback.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword,
        ) ||
        directCallback.parameters.length !== 2 ||
        hkVisualizationAstText(directCallback.parameters[0].name, sourceFile) !==
          "{ browser }" ||
        !ts.isIdentifier(directCallback.parameters[1].name) ||
        directCallback.parameters[1].name.text !== "testInfo"
      ) {
        throw new Error(
          `HK Visualization structural AST whitelist rejects package callback shape drift in ${file}.`,
        );
      }
      if (
        !isDeepStrictEqual(
          hkVisualizationAstForOfTopology(call, sourceFile),
          structure.packageLoops,
        )
      ) {
        throw new Error(
          `HK Visualization structural AST whitelist rejects package loop topology drift in ${file}.`,
        );
      }
      callbackCategories.set(directCallback, "package");
      packageCall = call;
      allowedImportedTestIdentifiers.add(call.expression);
      continue;
    }
    throw new Error(
      `HK Visualization structural AST whitelist rejects unknown, retitled static, aliased, or shadowed direct test declarations in ${file}.`,
    );
  }
  if (
    !isDeepStrictEqual(observedExactTitles, exactStaticTitles) ||
    !packageCall ||
    directTestCalls.length !== exactStaticTitles.length + 1
  ) {
    throw new Error(
      `HK Visualization structural AST whitelist requires exact ordered static titles plus one direct package declaration in ${file}.`,
    );
  }

  const methodCallsByName = new Map();
  for (const call of testMethodCalls) {
    const method = call.expression.name.text;
    const calls = methodCallsByName.get(method) ?? [];
    calls.push(call);
    methodCallsByName.set(method, calls);
    allowedImportedTestIdentifiers.add(call.expression.expression);
  }
  if (
    !isDeepStrictEqual(
      Object.fromEntries(
        [...methodCallsByName.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, calls]) => [name, calls.length]),
      ),
      Object.fromEntries(
        Object.entries(structure.methodCounts).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    )
  ) {
    throw new Error(
      `HK Visualization structural AST whitelist rejects imported test timeout/slow method topology drift in ${file}.`,
    );
  }

  const describeCall = methodCallsByName.get("describe")[0];
  if (
    describeCall.arguments.length !== 2 ||
    !ts.isStringLiteral(describeCall.arguments[0]) ||
    describeCall.arguments[0].text !== structure.suiteTitle
  ) {
    throw new Error(
      `HK Visualization structural AST whitelist rejects suite declaration drift in ${file}.`,
    );
  }
  const suiteCallback = hkVisualizationAstCallback(describeCall, "suite");
  callbackCategories.set(suiteCallback, "suite");

  for (const call of directTestCalls) {
    if (
      hkVisualizationAstEnclosingCategory(call, callbackCategories) !== "suite"
    ) {
      throw new Error(
        `HK Visualization structural AST whitelist rejects direct test declaration suite topology drift in ${file}.`,
      );
    }
  }

  for (const method of ["beforeEach", "afterAll"]) {
    const hookCall = methodCallsByName.get(method)[0];
    if (hookCall.arguments.length !== 1) {
      throw new Error(
        `HK Visualization structural AST whitelist rejects ${method} hook shape drift in ${file}.`,
      );
    }
    const hookCallback = hkVisualizationAstCallback(hookCall, method);
    if (
      hkVisualizationAstEnclosingCategory(hookCall, callbackCategories) !==
        "suite"
    ) {
      throw new Error(
        `HK Visualization structural AST whitelist rejects ${method} suite topology drift in ${file}.`,
      );
    }
    callbackCategories.set(hookCallback, method);
    validateHkVisualizationTestInfoParameterUses(
      hookCallback,
      hookCallback.parameters[1],
      method,
    );
  }

  const packageCallback = packageCall.arguments[1];
  const timeoutCall = methodCallsByName.get("setTimeout")[0];
  if (
    hkVisualizationAstEnclosingCategory(timeoutCall, callbackCategories) !==
      "package" ||
    hkVisualizationAstText(timeoutCall, sourceFile) !== structure.packageTimeout
  ) {
    throw new Error(
      `HK Visualization structural AST whitelist rejects package timeout expression or location drift in ${file}.`,
    );
  }
  const skipCategories = methodCallsByName.get("skip").map((skipCall) =>
    hkVisualizationAstEnclosingCategory(skipCall, callbackCategories),
  );
  if (!isDeepStrictEqual(skipCategories, structure.skipCategories)) {
    throw new Error(
      `HK Visualization structural AST whitelist rejects test.skip location topology drift in ${file}.`,
    );
  }

  for (const callback of exactCallbacks) {
    validateHkVisualizationTestInfoParameterUses(
      callback,
      callback.parameters[1],
      "exact6",
    );
  }
  validateHkVisualizationTestInfoParameterUses(
    packageCallback,
    packageCallback.parameters[1],
    "package",
  );
  for (const node of nodes) {
    if (
      ts.isParameter(node) &&
      node.type?.getText(sourceFile) === "TestInfo" &&
      ![...callbackCategories.keys()].some((callback) =>
        callback.parameters.includes(node),
      )
    ) {
      validateHkVisualizationTestInfoParameterUses(
        node.parent,
        node,
        "typed-helper",
      );
    }
  }

  for (const node of nodes) {
    if (
      ts.isIdentifier(node) &&
      node.text === "test" &&
      !allowedImportedTestIdentifiers.has(node)
    ) {
      throw new Error(
        `HK Visualization structural AST whitelist rejects imported test suite timeout capability acquisition, alias, reflection, pass, storage, spread, return, element access, or lexical shadow in ${file}.`,
      );
    }
  }
}

function unwrapHkVisualizationTimeoutAstExpression(node) {
  let current = node;
  while (
    current &&
    (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isPartiallyEmittedExpression(current)
    )
  ) {
    current = current.expression;
  }
  return current;
}

function hkVisualizationTimeoutMemberValues(baseValues, propertyValues) {
  const resolved = new Set();
  for (const base of baseValues) {
    for (const propertyValue of propertyValues) {
      if (!propertyValue.startsWith("string:")) continue;
      const property = propertyValue.slice("string:".length);
      if (base === "test" && property === "describe") {
        resolved.add("test.describe");
      } else if (
        (base === "test" || base === "testInfo") &&
        (property === "slow" || property === "setTimeout")
      ) {
        resolved.add(`timeout-api:${base}.${property}`);
      } else if (base === "test.describe" && property === "configure") {
        resolved.add("configure-api:test.describe.configure");
      }
    }
  }
  return resolved;
}

function resolveHkVisualizationTimeoutAstValues(node, bindings) {
  const expression = unwrapHkVisualizationTimeoutAstExpression(node);
  if (!expression) return new Set();
  if (ts.isIdentifier(expression)) {
    return new Set(bindings.get(expression.text) ?? []);
  }
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return new Set([`string:${expression.text}`]);
  }
  if (ts.isComputedPropertyName(expression)) {
    return resolveHkVisualizationTimeoutAstValues(
      expression.expression,
      bindings,
    );
  }
  if (ts.isTemplateExpression(expression)) {
    let texts = new Set([expression.head.text]);
    for (const span of expression.templateSpans) {
      const expressionValues = resolveHkVisualizationTimeoutAstValues(
        span.expression,
        bindings,
      );
      const nextTexts = new Set();
      for (const text of texts) {
        for (const value of expressionValues) {
          if (value.startsWith("string:")) {
            nextTexts.add(`${text}${value.slice(7)}${span.literal.text}`);
          }
        }
      }
      texts = nextTexts;
    }
    return new Set([...texts].map((text) => `string:${text}`));
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return hkVisualizationTimeoutMemberValues(
      resolveHkVisualizationTimeoutAstValues(expression.expression, bindings),
      new Set([`string:${expression.name.text}`]),
    );
  }
  if (ts.isElementAccessExpression(expression)) {
    return hkVisualizationTimeoutMemberValues(
      resolveHkVisualizationTimeoutAstValues(expression.expression, bindings),
      resolveHkVisualizationTimeoutAstValues(
        expression.argumentExpression,
        bindings,
      ),
    );
  }
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const values = new Set();
    const leftValues = resolveHkVisualizationTimeoutAstValues(
      expression.left,
      bindings,
    );
    const rightValues = resolveHkVisualizationTimeoutAstValues(
      expression.right,
      bindings,
    );
    for (const left of leftValues) {
      for (const right of rightValues) {
        if (left.startsWith("string:") && right.startsWith("string:")) {
          values.add(`string:${left.slice(7)}${right.slice(7)}`);
        }
      }
    }
    return values;
  }
  if (ts.isConditionalExpression(expression)) {
    return new Set([
      ...resolveHkVisualizationTimeoutAstValues(expression.whenTrue, bindings),
      ...resolveHkVisualizationTimeoutAstValues(expression.whenFalse, bindings),
    ]);
  }
  return new Set();
}

function addHkVisualizationTimeoutAstBinding(bindings, name, values) {
  if (!name || values.size === 0) return false;
  const current = bindings.get(name) ?? new Set();
  const sizeBefore = current.size;
  for (const value of values) current.add(value);
  bindings.set(name, current);
  return current.size !== sizeBefore;
}

function bindHkVisualizationTimeoutAstTarget(bindings, target, values) {
  const unwrapped = unwrapHkVisualizationTimeoutAstExpression(target);
  if (!unwrapped) return false;
  if (ts.isIdentifier(unwrapped)) {
    return addHkVisualizationTimeoutAstBinding(
      bindings,
      unwrapped.text,
      values,
    );
  }
  if (ts.isObjectBindingPattern(unwrapped)) {
    let changed = false;
    for (const element of unwrapped.elements) {
      if (element.dotDotDotToken) continue;
      const propertyNode = element.propertyName ?? element.name;
      const propertyValues = ts.isIdentifier(propertyNode)
        ? new Set([`string:${propertyNode.text}`])
        : resolveHkVisualizationTimeoutAstValues(propertyNode, bindings);
      const memberValues = hkVisualizationTimeoutMemberValues(
        values,
        propertyValues,
      );
      changed =
        bindHkVisualizationTimeoutAstTarget(
          bindings,
          element.name,
          memberValues,
        ) || changed;
    }
    return changed;
  }
  if (ts.isObjectLiteralExpression(unwrapped)) {
    let changed = false;
    for (const property of unwrapped.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const propertyValues = ts.isIdentifier(property.name)
        ? new Set([`string:${property.name.text}`])
        : resolveHkVisualizationTimeoutAstValues(property.name, bindings);
      changed =
        bindHkVisualizationTimeoutAstTarget(
          bindings,
          property.initializer,
          hkVisualizationTimeoutMemberValues(values, propertyValues),
        ) || changed;
    }
    return changed;
  }
  return false;
}

function isHkVisualizationTimeoutNodeInsideNonStaticTest(
  node,
  bindings,
  exactStaticTitles,
) {
  for (let current = node.parent; current; current = current.parent) {
    if (!ts.isFunctionLike(current)) continue;
    let parent = current.parent;
    while (
      parent &&
      (
        ts.isParenthesizedExpression(parent) ||
        ts.isAsExpression(parent) ||
        ts.isSatisfiesExpression(parent)
      )
    ) {
      parent = parent.parent;
    }
    if (
      !parent ||
      !ts.isCallExpression(parent) ||
      !parent.arguments.includes(current) ||
      !resolveHkVisualizationTimeoutAstValues(
        parent.expression,
        bindings,
      ).has("test")
    ) {
      continue;
    }
    const titleNode = parent.arguments[0];
    const title =
      titleNode &&
      (ts.isStringLiteral(titleNode) ||
        ts.isNoSubstitutionTemplateLiteral(titleNode))
        ? titleNode.text
        : null;
    return !title || !exactStaticTitles.has(title);
  }
  return false;
}

function assertHkVisualizationStrictZeroTimeoutCapabilities(
  source,
  file,
  exactStaticTitles,
) {
  validateHkVisualizationStaticAstStructure(
    source,
    file,
    [...exactStaticTitles],
  );
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    throw new Error(
      `HK Visualization static timeout AST authority could not parse ${file}.`,
    );
  }
  const bindings = new Map([
    ["test", new Set(["test"])],
    ["testInfo", new Set(["testInfo"])],
  ]);
  const assignments = [];
  const calls = [];
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    if (ts.isVariableDeclaration(node) && node.initializer) {
      assignments.push({ source: node.initializer, target: node.name });
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      assignments.push({ source: node.right, target: node.left });
    }
    if (ts.isCallExpression(node)) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  for (let pass = 0; pass <= assignments.length; pass += 1) {
    let changed = false;
    for (const assignment of assignments) {
      changed =
        bindHkVisualizationTimeoutAstTarget(
          bindings,
          assignment.target,
          resolveHkVisualizationTimeoutAstValues(
            assignment.source,
            bindings,
          ),
        ) || changed;
    }
    if (!changed) break;
  }

  // Conservative exact-six policy: capability escape is itself forbidden.
  // Any statically resolvable slow/setTimeout property or element reference
  // outside a directly identified non-static package-test body is rejected,
  // including lexically shadowed custom objects. This deliberately avoids a
  // claim that incomplete lexical or higher-order reachability is accepted.
  for (const node of nodes) {
    let propertyValues = new Set();
    if (ts.isPropertyAccessExpression(node)) {
      propertyValues = new Set([`string:${node.name.text}`]);
    } else if (ts.isElementAccessExpression(node)) {
      propertyValues = resolveHkVisualizationTimeoutAstValues(
        node.argumentExpression,
        bindings,
      );
    } else if (ts.isBindingElement(node) && node.propertyName) {
      propertyValues = ts.isIdentifier(node.propertyName)
        ? new Set([`string:${node.propertyName.text}`])
        : resolveHkVisualizationTimeoutAstValues(
            node.propertyName,
            bindings,
          );
    }
    const terminalTimeoutCapability = [...propertyValues].find(
      (value) => value === "string:slow" || value === "string:setTimeout",
    );
    const resolvedValues =
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node) ||
      ts.isIdentifier(node) ||
      ts.isBindingElement(node)
        ? resolveHkVisualizationTimeoutAstValues(
            ts.isBindingElement(node) ? node.name : node,
            bindings,
          )
        : new Set();
    const resolvedCapability = [...resolvedValues].find(
      (value) =>
        value.startsWith("timeout-api:") ||
        value.startsWith("configure-api:"),
    );
    const isConfigure = resolvedCapability?.startsWith("configure-api:");
    if (
      (terminalTimeoutCapability || resolvedCapability) &&
      (
        isConfigure ||
        !isHkVisualizationTimeoutNodeInsideNonStaticTest(
          node,
          bindings,
          exactStaticTitles,
        )
      )
    ) {
      const capabilityLabel = terminalTimeoutCapability?.slice(7) ??
        resolvedCapability?.slice(resolvedCapability.indexOf(":") + 1) ??
        "unknown";
      throw new Error(
        `HK Visualization strict static timeout AST capability authority rejects ${capabilityLabel} reference in ${file}.`,
      );
    }
  }
  for (const call of calls) {
    const values = resolveHkVisualizationTimeoutAstValues(
      call.expression,
      bindings,
    );
    const forbidden = [...values].find(
      (value) =>
        value.startsWith("timeout-api:") ||
        value.startsWith("configure-api:"),
    );
    const isConfigure = forbidden?.startsWith("configure-api:");
    if (
      forbidden &&
      (
        isConfigure ||
        !isHkVisualizationTimeoutNodeInsideNonStaticTest(
          call,
          bindings,
          exactStaticTitles,
        )
      )
    ) {
      throw new Error(
        `HK Visualization static timeout AST authority rejects executable ${forbidden.replace(/^[^:]+:/u, "")} in ${file}.`,
      );
    }
  }
}

export function validateHkVisualizationStaticTestTimeoutTopology({
  rows = HK_VISUALIZATION_STATIC_TEST_TIMEOUT_ROWS,
  sourceAuthorityRows = HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS,
  sourceByFile = defaultHkVisualizationStaticTestSources(),
} = {}) {
  const sourceFreeze = validateHkVisualizationStaticDeadlineSourceFreeze({
    sourceAuthorityRows,
    sourceByFile,
  });
  if (!isDeepStrictEqual(rows, HK_VISUALIZATION_STATIC_TEST_TIMEOUT_ROWS)) {
    throw new Error(
      "HK Visualization static timeout rows drifted from the exact six-title 120000 ms authority.",
    );
  }
  const expectedFiles = [...new Set(rows.map(({ file }) => file))];
  if (
    !exactOrderedObjectKeys(sourceByFile, expectedFiles) ||
    expectedFiles.length !== 2
  ) {
    throw new Error(
      "HK Visualization static timeout source files drifted from the exact machine/lesson order.",
    );
  }

  let sourceOverrideCount = 0;
  for (const file of expectedFiles) {
    const source = sourceByFile[file];
    if (typeof source !== "string") {
      throw new Error(`HK Visualization static timeout source is missing for ${file}.`);
    }
    const expectedRows = rows.filter((row) => row.file === file);
    const expectedTitles = expectedRows.map(({ title }) => title);
    assertHkVisualizationStrictZeroTimeoutCapabilities(
      source,
      file,
      new Set(expectedTitles),
    );
    const manifestTitles = HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES[file]
      ?.slice(0, expectedRows.length);
    if (!isDeepStrictEqual(manifestTitles, expectedTitles)) {
      throw new Error(
        `HK Visualization static timeout titles drifted from the release title manifest for ${file}.`,
      );
    }
    const directTests = [
      ...source.matchAll(/^ {2}test\(\s*"([^"]+)"/gmu),
    ].map((match) => ({ index: match.index, title: match[1] }));
    if (
      !isDeepStrictEqual(
        directTests.map(({ title }) => title),
        expectedTitles,
      )
    ) {
      throw new Error(
        `HK Visualization static source titles are missing, extra, retitled, or reordered for ${file}.`,
      );
    }
  }

  return Object.freeze({
    fileCount: expectedFiles.length,
    sourceAggregateSha256: sourceFreeze.sourceAggregateSha256,
    sourceOverrideCount,
    sourceRows: sourceFreeze.sourceRows,
    testCount: rows.length,
    timeoutSumMs: rows.reduce((sum, { timeoutMs }) => sum + timeoutMs, 0),
  });
}

export const HK_VISUALIZATION_STATIC_TEST_TIMEOUT_TOPOLOGY =
  validateHkVisualizationStaticTestTimeoutTopology();
export const HK_VISUALIZATION_STATIC_TEST_TIMEOUT_SUM_MS =
  HK_VISUALIZATION_STATIC_TEST_TIMEOUT_TOPOLOGY.timeoutSumMs;

export function validateHkVisualizationNonPackageTestTimeoutTopology(
  timeoutRowsByFile =
    HK_VISUALIZATION_RELEASE_NON_PACKAGE_TEST_TIMEOUTS_BY_FILE,
) {
  const machineSpec =
    "tests/e2e/hk-visualization-machine-acceptance.spec.ts";
  const lessonSpec =
    "tests/e2e/hk-visualization-lesson-embeddability.spec.ts";
  const expectedFiles = HK_VISUALIZATION_RELEASE_SPECS.filter(
    (file) => file !== machineSpec && file !== lessonSpec,
  );
  const actualFiles = Object.keys(timeoutRowsByFile ?? {});
  if (!isDeepStrictEqual(actualFiles, expectedFiles)) {
    throw new Error(
      "HK Visualization non-package timeout files drifted from the exact release spec order.",
    );
  }

  let testCount = 0;
  let timeoutSumMs = 0;
  for (const file of expectedFiles) {
    const expectedTitles = HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES[file];
    const expectedCount = HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS[file];
    const rows = timeoutRowsByFile[file];
    if (
      !Array.isArray(expectedTitles) ||
      !Array.isArray(rows) ||
      rows.length !== expectedCount ||
      rows.length !== expectedTitles.length
    ) {
      throw new Error(
        `HK Visualization non-package timeout count drifted for ${file}.`,
      );
    }
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (
        !exactOrderedObjectKeys(row, ["title", "timeoutMs"]) ||
        row.title !== expectedTitles[index] ||
        !Number.isSafeInteger(row.timeoutMs) ||
        row.timeoutMs < 1
      ) {
        throw new Error(
          `HK Visualization non-package timeout row drifted for ${file} title ${index}.`,
        );
      }
      timeoutSumMs += row.timeoutMs;
      if (!Number.isSafeInteger(timeoutSumMs)) {
        throw new Error(
          "HK Visualization non-package timeout sum exceeds safe integer bounds.",
        );
      }
    }
    testCount += rows.length;
  }

  const dynamicFile =
    "tests/e2e/hk-visualization-dynamic-range-microfixtures.spec.ts";
  const dynamicRows = timeoutRowsByFile[dynamicFile];
  const triangleRows = dynamicRows.filter(
    ({ title }) => title === HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE,
  );
  if (
    triangleRows.length !== 1 ||
    triangleRows[0].timeoutMs !==
      HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS ||
    dynamicRows.some(
      ({ title, timeoutMs }) =>
        title !== HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE &&
        timeoutMs !== HK_VISUALIZATION_DYNAMIC_RANGE_DEFAULT_TIMEOUT_MS,
    )
  ) {
    throw new Error(
      "HK Visualization dynamic-range timeout topology drifted from its exact default and triangle caps.",
    );
  }
  for (const file of expectedFiles.filter((entry) => entry !== dynamicFile)) {
    if (
      timeoutRowsByFile[file].some(
        ({ timeoutMs }) =>
          timeoutMs !== HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
      )
    ) {
      throw new Error(
        `HK Visualization standard timeout topology drifted for ${file}.`,
      );
    }
  }

  const expectedTestCount =
    HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT -
    HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS[machineSpec] -
    HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS[lessonSpec];
  if (testCount !== expectedTestCount) {
    throw new Error(
      "HK Visualization non-package timeout topology does not cover every exact release title.",
    );
  }
  return Object.freeze({
    fileCount: expectedFiles.length,
    testCount,
    timeoutSumMs,
  });
}

export const HK_VISUALIZATION_NON_PACKAGE_TEST_TIMEOUT_TOPOLOGY =
  validateHkVisualizationNonPackageTestTimeoutTopology();
export const HK_VISUALIZATION_NON_PACKAGE_TEST_TIMEOUT_SUM_MS =
  HK_VISUALIZATION_NON_PACKAGE_TEST_TIMEOUT_TOPOLOGY.timeoutSumMs;
export const HK_VISUALIZATION_RELEASE_TIMEOUT_COVERED_TEST_COUNT =
  HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY.packageCount +
  (HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS[
    "tests/e2e/hk-visualization-lesson-embeddability.spec.ts"
  ] - 4) +
  HK_VISUALIZATION_NON_PACKAGE_TEST_TIMEOUT_TOPOLOGY.testCount +
  HK_VISUALIZATION_STATIC_TEST_TIMEOUT_TOPOLOGY.testCount;
if (
  HK_VISUALIZATION_RELEASE_TIMEOUT_COVERED_TEST_COUNT !==
    HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT
) {
  throw new Error(
    "HK Visualization deadline topology does not cover the exact 370 release titles.",
  );
}
export const HK_VISUALIZATION_RELEASE_INFRASTRUCTURE_TIMEOUT_MS = 1_080_000;
export const HK_VISUALIZATION_RELEASE_SETUP_TIMEOUT_MS =
  HK_VISUALIZATION_RELEASE_INFRASTRUCTURE_TIMEOUT_MS;
export const HK_VISUALIZATION_SUPERVISOR_CLEANUP_GRACE_MS = 30_000;
export const HK_VISUALIZATION_RELEASE_WORKLOAD_TIMEOUT_MS =
  HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_SUM_MS +
  HK_VISUALIZATION_LESSON_PACKAGE_TIMEOUT_SUM_MS +
  HK_VISUALIZATION_NON_PACKAGE_TEST_TIMEOUT_SUM_MS +
  HK_VISUALIZATION_STATIC_TEST_TIMEOUT_SUM_MS +
  HK_VISUALIZATION_RELEASE_SETUP_TIMEOUT_MS;

export const HK_VISUALIZATION_RELEASE_BLOCKED_ENV = Object.freeze([
  "HK_VIZ_ALLOW_PARTIAL",
  "HK_VIZ_FULL_MATRIX",
  "HK_VIZ_GRADES",
  "HK_VIZ_LABS",
  "HK_VIZ_LANGUAGES",
  "HK_VIZ_THEMES",
  "HK_VIZ_VIEWPORTS",
  "HK_VIZ_INTERACTION_DEPTH",
  "HK_VIZ_LESSON_FULL",
  "PLAYWRIGHT_BASE_URL",
  "PLAYWRIGHT_SKIP_WEBSERVER",
  "PLAYWRIGHT_E2E_ROOT",
  "PLAYWRIGHT_NEXT_DIST_DIR",
  "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
  "PLAYWRIGHT_OUTPUT_DIR",
  "PLAYWRIGHT_REPORT_DIR",
  "PLAYWRIGHT_JSON_OUTPUT_FILE",
  "PLAYWRIGHT_RUNTIME_TMPDIR",
  "PLAYWRIGHT_BROWSER_PROFILE_ROOT",
  "PLAYWRIGHT_SERVICE_LOG_DIR",
  "PLAYWRIGHT_SERVICE_PID_DIR",
  "PLAYWRIGHT_PATH_MANIFEST_FILE",
  "NODE_OPTIONS",
  "NODE_V8_COVERAGE",
  "NODE_COMPILE_CACHE",
  "NODE_REDIRECT_WARNINGS",
  "NPM_CONFIG_CACHE",
  "npm_config_cache",
  "NPM_CONFIG_LOGS_DIR",
  "npm_config_logs_dir",
  "NPM_CONFIG_TMP",
  "npm_config_tmp",
  "SQLITE_TMPDIR",
  "MAIS_ALLOW_EXTERNAL_ARTIFACTS",
  "HK_MATH_DB_PATH",
  "HK_MATH_STORAGE_PROVIDER",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "NEXT_DIST_DIR",
  "NEXT_TSCONFIG_PATH",
  "VERCEL",
  "VERCEL_ENV",
  "PWDEBUG",
  "MAIS_HK_VISUALIZATION_WORKLOAD_TOKEN",
]);

const canonicalProject = "desktop-chrome";
const runnerDirectory = dirname(fileURLToPath(import.meta.url));
const defaultWorkspace = resolve(runnerDirectory, "../..");
export const HK_VISUALIZATION_RELEASE_DEFAULT_WORKSPACE = defaultWorkspace;
export function materializeHkVisualizationRunnerTestArtifactRoot(
  candidate,
  { makeDirectory = mkdirSync } = {},
) {
  if (
    typeof candidate !== "string" ||
    !isAbsolute(candidate) ||
    resolve(candidate) !== candidate
  ) {
    throw new Error(
      "HK Visualization runner-test artifact root must be an absolute lexically normalized Starship path without . or .. segments.",
    );
  }
  if (typeof makeDirectory !== "function") {
    throw new Error(
      "HK Visualization runner-test artifact root requires one directory materializer.",
    );
  }
  const artifactRoot = assertHkVisualizationStarshipPath(
    "HK Visualization runner-test artifact root",
    candidate,
  );
  makeDirectory(artifactRoot, { recursive: true });
  const materializedRoot = assertHkVisualizationStarshipPath(
    "HK Visualization materialized runner-test artifact root",
    artifactRoot,
  );
  const identity = captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization materialized runner-test artifact root",
    materializedRoot,
  );
  return Object.freeze({ identity, path: materializedRoot });
}
const runtimeEvidenceAnnotation = "hk-viz-canonical-browser-device";
const runtimePathEvidenceAnnotation = "hk-viz-starship-runtime-paths";
const runtimeEvidenceFile =
  "tests/e2e/hk-visualization-non-hk-order.spec.ts";
const runtimeEvidenceTitle =
  "US Visualization Lab Next Item goes directly to practice without HK extension or checklist routing";
export const HK_VISUALIZATION_RUNTIME_PROFILE_RECEIPT_VERSION =
  "hk-viz-runtime-profile-receipt-v3";
const canonicalReporterPath = resolve(
  runnerDirectory,
  "run-hk-visualization-release-gate.mjs",
);
const globalProfileMonitorPath = resolve(
  runnerDirectory,
  "hk-visualization-global-profile-monitor.mjs",
);
const workloadSupervisorPath = resolve(
  runnerDirectory,
  "hk-visualization-workload-supervisor.mjs",
);
const globalProfileMonitorReadyTimeoutMs = 10_000;
const globalProfileMonitorReceiptTimeoutMs = 15_000;
const globalProfileMonitorExitTimeoutMs = 10_000;
const globalProfileMonitorTerminationGraceMs = 2_000;
const globalProfileMonitorPollMs = 25;
const globalProfileMonitorReleaseIntervalMs = 500;
const globalProfileMonitorReleaseMaxGapMs = 1_000;
const synchronousMonitorWaitState = new Int32Array(new SharedArrayBuffer(4));
const canonicalBrowserDeviceEvidence = Object.freeze({
  channel: "chrome",
  defaultBrowserType: "chromium",
  deviceScaleFactor: 1,
  hasTouch: false,
  isMobile: false,
  screen: Object.freeze({ height: 1080, width: 1920 }),
  viewport: Object.freeze({ height: 1100, width: 1440 }),
});

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableRegularFileStatIdentity(stat) {
  return Object.freeze({
    ctimeNs: String(stat.ctimeNs),
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: String(stat.mode),
    mtimeNs: String(stat.mtimeNs),
    nlink: String(stat.nlink),
    size: String(stat.size),
  });
}

export function readHkVisualizationBoundedStableRegularFile(
  path,
  {
    maxBytes = HK_VISUALIZATION_RELEASE_SOURCE_FILE_MAX_BYTES,
    noFollowFlag = fsConstants.O_NOFOLLOW,
    readChunk = readSync,
  } = {},
) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error(
      "HK Visualization stable source read requires one positive safe byte cap.",
    );
  }
  if (
    !Number.isSafeInteger(fsConstants.O_NOFOLLOW) ||
    fsConstants.O_NOFOLLOW < 1
  ) {
    throw new Error(
      "HK Visualization stable source read requires a positive platform O_NOFOLLOW constant.",
    );
  }
  if (noFollowFlag !== fsConstants.O_NOFOLLOW) {
    throw new Error(
      "HK Visualization stable source read requires the exact platform O_NOFOLLOW flag.",
    );
  }
  if (typeof readChunk !== "function") {
    throw new Error(
      "HK Visualization stable source read requires one bounded read function.",
    );
  }
  const physicalPath = assertHkVisualizationStarshipPath(
    "HK Visualization stable source file",
    path,
  );
  if (physicalPath !== path) {
    throw new Error(
      "HK Visualization stable source file path must already be lexically normalized.",
    );
  }
  const physicalIdentityBefore = captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization stable source file",
    physicalPath,
    { expectedType: "file" },
  );
  const beforePathStat = lstatSync(physicalPath, { bigint: true });
  if (
    !beforePathStat.isFile() ||
    beforePathStat.isSymbolicLink() ||
    beforePathStat.nlink !== 1n ||
    beforePathStat.size < 0n ||
    beforePathStat.size > BigInt(maxBytes)
  ) {
    throw new Error(
      `HK Visualization stable source file is not a bounded single-link regular file: ${physicalPath}.`,
    );
  }
  const closeOnExec =
    typeof fsConstants.O_CLOEXEC === "number" ? fsConstants.O_CLOEXEC : 0;
  const fd = openSync(
    physicalPath,
    fsConstants.O_RDONLY | noFollowFlag | closeOnExec,
  );
  try {
    const beforeFdStat = fstatSync(fd, { bigint: true });
    if (
      !beforeFdStat.isFile() ||
      beforeFdStat.nlink !== 1n ||
      !isDeepStrictEqual(
        stableRegularFileStatIdentity(beforeFdStat),
        stableRegularFileStatIdentity(beforePathStat),
      )
    ) {
      throw new Error(
        `HK Visualization stable source file identity drifted before read: ${physicalPath}.`,
      );
    }
    const expectedSize = Number(beforeFdStat.size);
    const bytesWithSentinel = Buffer.alloc(expectedSize + 1);
    let bytesRead = 0;
    while (bytesRead < bytesWithSentinel.byteLength) {
      const remaining = bytesWithSentinel.byteLength - bytesRead;
      const count = readChunk(
        fd,
        bytesWithSentinel,
        bytesRead,
        remaining,
        null,
      );
      if (!Number.isSafeInteger(count) || count < 0 || count > remaining) {
        throw new Error(
          `HK Visualization stable source read returned an invalid bounded chunk size for ${physicalPath}.`,
        );
      }
      if (count === 0) break;
      bytesRead += count;
    }
    if (bytesRead > expectedSize) {
      throw new Error(
        `HK Visualization stable source file grew or returned extra sentinel bytes during read: ${physicalPath}.`,
      );
    }
    if (bytesRead !== expectedSize) {
      throw new Error(
        `HK Visualization stable source file short-read ${bytesRead} bytes; expected ${expectedSize}: ${physicalPath}.`,
      );
    }
    const afterFdStat = fstatSync(fd, { bigint: true });
    const afterPathStat = lstatSync(physicalPath, { bigint: true });
    const identity = stableRegularFileStatIdentity(beforeFdStat);
    if (
      !isDeepStrictEqual(stableRegularFileStatIdentity(afterFdStat), identity) ||
      !isDeepStrictEqual(stableRegularFileStatIdentity(afterPathStat), identity) ||
      afterFdStat.nlink !== 1n ||
      afterPathStat.nlink !== 1n
    ) {
      throw new Error(
        `HK Visualization stable source file changed during read: ${physicalPath}.`,
      );
    }
    const physicalIdentityAfter =
      captureHkVisualizationPhysicalPathIdentity(
        "HK Visualization stable source file",
        physicalPath,
        { expectedType: "file" },
      );
    if (!isDeepStrictEqual(physicalIdentityAfter, physicalIdentityBefore)) {
      throw new Error(
        `HK Visualization stable source file physical identity drifted: ${physicalPath}.`,
      );
    }
    return bytesWithSentinel.subarray(0, expectedSize);
  } finally {
    closeSync(fd);
  }
}

export const HK_VISUALIZATION_EXECUTION_STAGE_CONTRACT_VERSION =
  "hk-viz-immutable-execution-stage-v1";
export const HK_VISUALIZATION_EXECUTION_STAGE_TIMEOUT_MS = 120_000;
export const HK_VISUALIZATION_EXECUTION_STAGE_MAX_BYTES =
  2 * 1024 * 1024 * 1024;
export const HK_VISUALIZATION_EXECUTION_STAGE_MAX_ENTRIES = 40_000;
export const HK_VISUALIZATION_EXECUTION_STAGE_POLICY = Object.freeze({
  dependencySymlinks: "manifest-bound-internal-single-hop-only",
  destinationFiles: "exclusive-new-inode-single-link",
  generatedWritableSubtrees: Object.freeze([".next"]),
  sourceReads: "bounded-o_nofollow-stable-sha256",
  stageDirectories: "read-only-except-declared-generated-subtrees",
  stageFiles: "read-only-preserve-execute-bits",
});

function executionStageMode(stat, width = 4) {
  const mask = width === 3 ? 0o777n : 0o7777n;
  return Number(stat.mode & mask)
    .toString(8)
    .padStart(width, "0");
}

function assertExecutionStageDeadline(deadlineEpochMs, phase) {
  if (Date.now() > deadlineEpochMs) {
    throw new Error(
      `HK Visualization execution stage exceeded ${HK_VISUALIZATION_EXECUTION_STAGE_TIMEOUT_MS}ms during ${phase}.`,
    );
  }
}

function assertSafeExecutionStageRelativePath(value, { allowRoot = false } = {}) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\\") ||
    isAbsolute(value) ||
    (!allowRoot && value === ".")
  ) {
    throw new Error(
      `HK Visualization execution stage path is not one canonical relative path: ${JSON.stringify(value)}.`,
    );
  }
  const normalized = resolve("/execution-stage-root", value);
  const root = "/execution-stage-root";
  if (
    normalized !== root &&
    !normalized.startsWith(`${root}${sep}`)
  ) {
    throw new Error(
      `HK Visualization execution stage path escapes its root: ${value}.`,
    );
  }
  if (!allowRoot && normalized === root) {
    throw new Error(
      `HK Visualization execution stage leaf path resolves to its root: ${value}.`,
    );
  }
  return value;
}

function assertExecutionStageSourceEntry(entry) {
  const directory = entry?.type === "directory";
  const expectedKeys = directory
    ? ["mode", "path", "sha256", "type"]
    : ["mode", "path", "sha256", "size", "type"];
  if (
    !exactOrderedObjectKeys(entry, expectedKeys) ||
    !/^[0-7]{4}$/u.test(String(entry?.mode ?? "")) ||
    !/^[a-f0-9]{64}$/u.test(String(entry?.sha256 ?? "")) ||
    !["directory", "file"].includes(entry?.type) ||
    (!directory &&
      (!Number.isSafeInteger(entry?.size) || entry.size < 0))
  ) {
    throw new Error(
      `HK Visualization execution stage source entry shape drifted at ${String(entry?.path)}.`,
    );
  }
  assertSafeExecutionStageRelativePath(entry.path, { allowRoot: directory });
}

function assertExecutionStageDependencyEntry(entry) {
  const symlink = entry?.type === "symlink";
  const expectedKeys = symlink
    ? [
        "path",
        "type",
        "mode",
        "size",
        "target",
        "resolvedRelative",
        "insideRoot",
        "broken",
        "sha256",
      ]
    : ["path", "type", "mode", "size", "sha256"];
  if (
    !exactOrderedObjectKeys(entry, expectedKeys) ||
    !/^[0-7]{3}$/u.test(String(entry?.mode ?? "")) ||
    !Number.isSafeInteger(entry?.size) ||
    entry.size < 0 ||
    !/^[a-f0-9]{64}$/u.test(String(entry?.sha256 ?? "")) ||
    !["file", "symlink"].includes(entry?.type)
  ) {
    throw new Error(
      `HK Visualization execution stage dependency entry shape drifted at ${String(entry?.path)}.`,
    );
  }
  assertSafeExecutionStageRelativePath(entry.path);
  if (
    symlink &&
    (typeof entry.target !== "string" ||
      !entry.target ||
      isAbsolute(entry.target) ||
      typeof entry.resolvedRelative !== "string" ||
      !entry.resolvedRelative ||
      entry.insideRoot !== true ||
      entry.broken !== false ||
      sha256Text(entry.target) !== entry.sha256 ||
      Buffer.byteLength(entry.target) !== entry.size)
  ) {
    throw new Error(
      `HK Visualization execution stage dependency symlink authority drifted at ${entry.path}.`,
    );
  }
}

function ensureExecutionStageDirectory({
  destination,
  expectedMode,
  source,
}) {
  const sourceStat = lstatSync(source, { bigint: true });
  if (
    sourceStat.isSymbolicLink() ||
    !sourceStat.isDirectory() ||
    executionStageMode(sourceStat) !== expectedMode
  ) {
    throw new Error(
      `HK Visualization execution stage source directory mode/type drifted: ${source}.`,
    );
  }
  if (!existsSync(destination)) {
    mkdirSync(destination, { mode: Number.parseInt(expectedMode, 8) });
  }
  const destinationStat = lstatSync(destination, { bigint: true });
  if (destinationStat.isSymbolicLink() || !destinationStat.isDirectory()) {
    throw new Error(
      `HK Visualization execution stage destination directory is not physical: ${destination}.`,
    );
  }
  chmodSync(destination, Number.parseInt(expectedMode, 8));
}

function copyExecutionStageRegularFile({ destination, entry, source }) {
  const sourceStat = lstatSync(source, { bigint: true });
  const expectedMode = entry.mode.padStart(4, "0");
  if (
    sourceStat.isSymbolicLink() ||
    !sourceStat.isFile() ||
    sourceStat.nlink !== 1n ||
    executionStageMode(sourceStat) !== expectedMode
  ) {
    throw new Error(
      `HK Visualization execution stage source is not one exact single-link regular file: ${source}.`,
    );
  }
  const bytes = readHkVisualizationBoundedStableRegularFile(source, {
    maxBytes: Math.max(1, entry.size),
  });
  if (
    bytes.byteLength !== entry.size ||
    sha256Text(bytes) !== entry.sha256
  ) {
    throw new Error(
      `HK Visualization execution stage source size/SHA drifted: ${source}.`,
    );
  }
  const closeOnExec =
    typeof fsConstants.O_CLOEXEC === "number" ? fsConstants.O_CLOEXEC : 0;
  const descriptor = openSync(
    destination,
    fsConstants.O_WRONLY |
      fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      closeOnExec,
    Number.parseInt(expectedMode, 8),
  );
  try {
    let offset = 0;
    while (offset < bytes.byteLength) {
      const count = writeSync(
        descriptor,
        bytes,
        offset,
        bytes.byteLength - offset,
        null,
      );
      if (!Number.isSafeInteger(count) || count < 1) {
        throw new Error(
          `HK Visualization execution stage destination short-write: ${destination}.`,
        );
      }
      offset += count;
    }
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  const destinationStat = lstatSync(destination, { bigint: true });
  if (
    !destinationStat.isFile() ||
    destinationStat.isSymbolicLink() ||
    destinationStat.nlink !== 1n ||
    destinationStat.dev !== sourceStat.dev ||
    destinationStat.ino === sourceStat.ino ||
    destinationStat.size !== sourceStat.size ||
    executionStageMode(destinationStat) !== expectedMode
  ) {
    throw new Error(
      `HK Visualization execution stage destination identity drifted: ${destination}.`,
    );
  }
}

function collectExecutionStageDependencyLeafPaths(root) {
  const leaves = [];
  const visit = (directory, prefix) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath, path);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        leaves.push(path);
      } else {
        throw new Error(
          `HK Visualization execution stage dependency contains a special entry: ${path}.`,
        );
      }
    }
  };
  visit(root, "");
  return leaves.sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

function validateExecutionStageDependencyCopy(
  executionWorkspace,
  dependencyRows,
  { sealed = false } = {},
) {
  const nodeModulesRoot = join(executionWorkspace, "node_modules");
  const livePaths = collectExecutionStageDependencyLeafPaths(nodeModulesRoot);
  const expectedPaths = dependencyRows.map(({ path }) => path);
  if (!isDeepStrictEqual(livePaths, expectedPaths)) {
    throw new Error(
      "HK Visualization execution stage dependency leaf topology drifted.",
    );
  }
  for (const entry of dependencyRows) {
    const absolutePath = join(nodeModulesRoot, entry.path);
    const stat = lstatSync(absolutePath, { bigint: true });
    if (entry.type === "file") {
      const bytes = readHkVisualizationBoundedStableRegularFile(absolutePath, {
        maxBytes: Math.max(1, entry.size),
      });
      if (
        executionStageMode(stat, 3) !==
          (sealed
            ? (Number.parseInt(entry.mode, 8) & 0o555)
                .toString(8)
                .padStart(3, "0")
            : entry.mode) ||
        bytes.byteLength !== entry.size ||
        sha256Text(bytes) !== entry.sha256
      ) {
        throw new Error(
          `HK Visualization execution stage dependency file drifted: ${entry.path}.`,
        );
      }
    } else if (
      !stat.isSymbolicLink() ||
      readlinkSync(absolutePath) !== entry.target
    ) {
      throw new Error(
        `HK Visualization execution stage dependency symlink drifted: ${entry.path}.`,
      );
    }
  }
}

export function materializeHkVisualizationExecutionStage({
  dependencyManifest,
  executionWorkspace,
  sourceSnapshot,
  sourceWorkspace,
  timeoutMs = HK_VISUALIZATION_EXECUTION_STAGE_TIMEOUT_MS,
  recaptureSourceSnapshot = captureHkVisualizationReleaseSourceSnapshot,
} = {}) {
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > HK_VISUALIZATION_EXECUTION_STAGE_TIMEOUT_MS
  ) {
    throw new Error(
      "HK Visualization execution stage timeout must stay within 120000ms.",
    );
  }
  const deadlineEpochMs = Date.now() + timeoutMs;
  validateHkVisualizationReleaseSourceSnapshot(sourceSnapshot);
  const physicalSourceWorkspace = assertHkVisualizationStarshipPath(
    "HK Visualization execution stage source workspace",
    resolve(sourceWorkspace),
  );
  const physicalExecutionWorkspace = assertHkVisualizationStarshipPath(
    "HK Visualization execution stage workspace",
    resolve(executionWorkspace),
  );
  const sourceIdentity = captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization execution stage source workspace",
    physicalSourceWorkspace,
  );
  const initialExecutionIdentity = captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization execution stage workspace",
    physicalExecutionWorkspace,
  );
  if (
    physicalSourceWorkspace === physicalExecutionWorkspace ||
    physicalSourceWorkspace.startsWith(`${physicalExecutionWorkspace}${sep}`) ||
    physicalExecutionWorkspace.startsWith(`${physicalSourceWorkspace}${sep}`)
  ) {
    throw new Error(
      "HK Visualization execution stage source and destination must be distinct and non-nested.",
    );
  }
  if (readdirSync(physicalExecutionWorkspace).length !== 0) {
    throw new Error(
      "HK Visualization execution stage destination must be freshly empty.",
    );
  }
  if (
    sourceSnapshot.workspaceIdentity?.dev !== sourceIdentity.device ||
    sourceSnapshot.workspaceIdentity?.ino !== sourceIdentity.inode ||
    sourceSnapshot.workspaceIdentity?.realpath !== sourceIdentity.realpath
  ) {
    throw new Error(
      "HK Visualization execution stage source snapshot workspace identity drifted.",
    );
  }
  if (
    !dependencyManifest ||
    !Array.isArray(dependencyManifest.entries) ||
    !/^[a-f0-9]{64}$/u.test(
      String(dependencyManifest.aggregateSha256 ?? ""),
    ) ||
    dependencyManifest.aggregateSha256 !==
      sha256Text(JSON.stringify(dependencyManifest.entries)) ||
    dependencyManifest.entryCount !== dependencyManifest.entries.length ||
    dependencyManifest.fileCount !==
      dependencyManifest.entries.filter(({ type }) => type === "file").length ||
    dependencyManifest.symlinkCount !==
      dependencyManifest.entries.filter(({ type }) => type === "symlink").length
  ) {
    throw new Error(
      "HK Visualization execution stage dependency manifest shape/aggregate drifted.",
    );
  }
  for (const entry of sourceSnapshot.entries) {
    assertExecutionStageSourceEntry(entry);
  }
  let priorDependencyPath = null;
  for (const entry of dependencyManifest.entries) {
    assertExecutionStageDependencyEntry(entry);
    if (priorDependencyPath !== null && priorDependencyPath >= entry.path) {
      throw new Error(
        "HK Visualization execution stage dependency rows must be exact ordered unique paths.",
      );
    }
    priorDependencyPath = entry.path;
  }
  const totalEntryCount =
    sourceSnapshot.entries.length + dependencyManifest.entries.length;
  const sourceBytes = sourceSnapshot.entries
    .filter(({ type }) => type === "file")
    .reduce((total, { size }) => total + size, 0);
  const dependencyBytes = dependencyManifest.entries
    .filter(({ type }) => type === "file")
    .reduce((total, { size }) => total + size, 0);
  const materializedBytes = sourceBytes + dependencyBytes;
  if (
    totalEntryCount > HK_VISUALIZATION_EXECUTION_STAGE_MAX_ENTRIES ||
    materializedBytes > HK_VISUALIZATION_EXECUTION_STAGE_MAX_BYTES
  ) {
    throw new Error(
      "HK Visualization execution stage exceeds its 40000-entry or 2GiB precomputed cap.",
    );
  }
  const sourceDirectories = sourceSnapshot.entries
    .filter(({ type }) => type === "directory")
    .sort((left, right) => {
      const depth = left.path.split("/").length - right.path.split("/").length;
      return depth || (left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
    });
  for (const entry of sourceDirectories) {
    assertExecutionStageDeadline(deadlineEpochMs, `source-directory:${entry.path}`);
    ensureExecutionStageDirectory({
      destination:
        entry.path === "."
          ? physicalExecutionWorkspace
          : join(physicalExecutionWorkspace, entry.path),
      expectedMode: entry.mode,
      source:
        entry.path === "."
          ? physicalSourceWorkspace
          : join(physicalSourceWorkspace, entry.path),
    });
  }
  const sourceFiles = sourceSnapshot.entries.filter(
    ({ type }) => type === "file",
  );
  for (const entry of sourceFiles) {
    assertExecutionStageDeadline(deadlineEpochMs, `source-file:${entry.path}`);
    copyExecutionStageRegularFile({
      destination: join(physicalExecutionWorkspace, entry.path),
      entry,
      source: join(physicalSourceWorkspace, entry.path),
    });
  }
  const sourceNodeModules = join(physicalSourceWorkspace, "node_modules");
  const destinationNodeModules = join(
    physicalExecutionWorkspace,
    "node_modules",
  );
  const sourceNodeModulesStat = lstatSync(sourceNodeModules, { bigint: true });
  if (
    sourceNodeModulesStat.isSymbolicLink() ||
    !sourceNodeModulesStat.isDirectory()
  ) {
    throw new Error(
      "HK Visualization execution stage dependency root is not a physical directory.",
    );
  }
  mkdirSync(destinationNodeModules, {
    mode: Number(sourceNodeModulesStat.mode & 0o7777n),
  });
  const dependencyDirectories = new Set([""]);
  for (const entry of dependencyManifest.entries) {
    let directory = dirname(entry.path);
    while (directory !== ".") {
      dependencyDirectories.add(directory);
      directory = dirname(directory);
    }
  }
  for (const directory of [...dependencyDirectories]
    .filter(Boolean)
    .sort((left, right) => {
      const depth = left.split("/").length - right.split("/").length;
      return depth || (left < right ? -1 : left > right ? 1 : 0);
    })) {
    const sourceDirectory = join(sourceNodeModules, directory);
    const destinationDirectory = join(destinationNodeModules, directory);
    const stat = lstatSync(sourceDirectory, { bigint: true });
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(
        `HK Visualization execution stage dependency directory is not physical: ${directory}.`,
      );
    }
    mkdirSync(destinationDirectory, {
      mode: Number(stat.mode & 0o7777n),
    });
  }
  for (const entry of dependencyManifest.entries) {
    assertExecutionStageDeadline(
      deadlineEpochMs,
      `dependency:${entry.path}`,
    );
    const source = join(sourceNodeModules, entry.path);
    const destination = join(destinationNodeModules, entry.path);
    if (entry.type === "file") {
      copyExecutionStageRegularFile({ destination, entry, source });
      continue;
    }
    const sourceStat = lstatSync(source, { bigint: true });
    const target = readlinkSync(source);
    const resolvedRelative = relative(
      sourceNodeModules,
      resolve(dirname(source), target),
    ).replaceAll("\\", "/");
    if (
      !sourceStat.isSymbolicLink() ||
      target !== entry.target ||
      resolvedRelative !== entry.resolvedRelative ||
      resolvedRelative.startsWith("..") ||
      isAbsolute(resolvedRelative)
    ) {
      throw new Error(
        `HK Visualization execution stage dependency symlink escapes or drifts: ${entry.path}.`,
      );
    }
    symlinkSync(target, destination);
  }
  const stagedSourceSnapshot = recaptureSourceSnapshot({
    workspace: physicalExecutionWorkspace,
  });
  validateHkVisualizationReleaseSourceSnapshot(stagedSourceSnapshot);
  if (
    stagedSourceSnapshot.sourceAggregateSha256 !==
      sourceSnapshot.sourceAggregateSha256 ||
    !isDeepStrictEqual(stagedSourceSnapshot.entries, sourceSnapshot.entries)
  ) {
    throw new Error(
      "HK Visualization execution stage source recapture differs from sourceBefore.",
    );
  }
  validateExecutionStageDependencyCopy(
    physicalExecutionWorkspace,
    dependencyManifest.entries,
  );
  mkdirSync(join(physicalExecutionWorkspace, ".next"), { mode: 0o700 });
  const regularDestinations = [
    ...sourceFiles.map(({ path }) => join(physicalExecutionWorkspace, path)),
    ...dependencyManifest.entries
      .filter(({ type }) => type === "file")
      .map(({ path }) => join(destinationNodeModules, path)),
  ];
  for (const destination of regularDestinations) {
    const stat = lstatSync(destination, { bigint: true });
    chmodSync(destination, Number(stat.mode & 0o555n));
  }
  const sealedDirectories = [
    ...sourceDirectories.map(({ path }) =>
      path === "."
        ? physicalExecutionWorkspace
        : join(physicalExecutionWorkspace, path),
    ),
    destinationNodeModules,
    ...[...dependencyDirectories]
      .filter(Boolean)
      .map((path) => join(destinationNodeModules, path)),
  ].sort((left, right) => right.length - left.length);
  for (const directory of sealedDirectories) {
    const stat = lstatSync(directory, { bigint: true });
    chmodSync(directory, Number(stat.mode & 0o555n));
  }
  assertExecutionStageDeadline(deadlineEpochMs, "sealed-revalidation");
  for (const destination of regularDestinations) {
    const stat = lstatSync(destination, { bigint: true });
    if (!stat.isFile() || stat.nlink !== 1n || (stat.mode & 0o222n) !== 0n) {
      throw new Error(
        `HK Visualization execution stage sealed file is writable or aliased: ${destination}.`,
      );
    }
  }
  for (const directory of sealedDirectories) {
    const stat = lstatSync(directory, { bigint: true });
    if (!stat.isDirectory() || (stat.mode & 0o222n) !== 0n) {
      throw new Error(
        `HK Visualization execution stage sealed directory is writable: ${directory}.`,
      );
    }
  }
  const generatedNextStat = lstatSync(
    join(physicalExecutionWorkspace, ".next"),
    { bigint: true },
  );
  if (!generatedNextStat.isDirectory() || (generatedNextStat.mode & 0o200n) === 0n) {
    throw new Error(
      "HK Visualization execution stage generated .next subtree is not writable.",
    );
  }
  const stageIdentity = captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization immutable execution stage",
    physicalExecutionWorkspace,
  );
  if (
    stageIdentity.device !== initialExecutionIdentity.device ||
    stageIdentity.inode !== initialExecutionIdentity.inode
  ) {
    throw new Error(
      "HK Visualization execution stage root identity changed during materialization.",
    );
  }
  const policyHash = sha256Text(
    canonicalJson(HK_VISUALIZATION_EXECUTION_STAGE_POLICY),
  );
  const payload = {
    contractVersion: HK_VISUALIZATION_EXECUTION_STAGE_CONTRACT_VERSION,
    dependencyAggregateSha256: dependencyManifest.aggregateSha256,
    dependencyFileCount: dependencyManifest.fileCount,
    dependencyRows: dependencyManifest.entries.map((entry) => ({ ...entry })),
    dependencySymlinkCount: dependencyManifest.symlinkCount,
    materializedBytes,
    materializedRegularFileCount:
      sourceFiles.length + dependencyManifest.fileCount,
    policy: HK_VISUALIZATION_EXECUTION_STAGE_POLICY,
    policyHash,
    sourceAggregateSha256: sourceSnapshot.sourceAggregateSha256,
    sourceFileCount: sourceFiles.length,
    sourceRows: sourceSnapshot.entries.map((entry) => ({ ...entry })),
    stageIdentity,
    status: "sealed",
  };
  return Object.freeze({
    ...payload,
    manifestHash: sha256Text(canonicalJson(payload)),
  });
}

export function validateHkVisualizationReleaseSourceSnapshotWorkspace(
  snapshot,
  { expectedPathManifest, expectedWorkspace } = {},
) {
  const workspaceInput =
    expectedWorkspace ??
    expectedPathManifest?.sourceWorkspace ??
    expectedPathManifest?.workspace;
  if (typeof workspaceInput !== "string" || !workspaceInput.trim()) {
    throw new Error(
      "HK Visualization source snapshot requires one expected run workspace.",
    );
  }
  const normalizedWorkspace = resolve(workspaceInput);
  if (
    expectedPathManifest &&
    resolve(
      String(
        expectedPathManifest.sourceWorkspace ??
          expectedPathManifest.workspace ??
          "",
      ),
    ) !== normalizedWorkspace
  ) {
    throw new Error(
      "HK Visualization source snapshot path manifest workspace mismatches the expected run workspace.",
    );
  }
  const physicalWorkspace = assertHkVisualizationStarshipPath(
    "HK Visualization expected source snapshot workspace",
    normalizedWorkspace,
  );
  if (physicalWorkspace !== normalizedWorkspace) {
    throw new Error(
      "HK Visualization expected source snapshot workspace must be physically normalized.",
    );
  }
  const expectedIdentity = captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization expected source snapshot workspace",
    physicalWorkspace,
    { expectedType: "directory" },
  );
  const actualIdentity = snapshot?.workspaceIdentity;
  if (
    !exactOrderedObjectKeys(actualIdentity, ["dev", "ino", "realpath"]) ||
    typeof actualIdentity.dev !== "string" ||
    !/^[1-9][0-9]*$/u.test(actualIdentity.dev) ||
    typeof actualIdentity.ino !== "string" ||
    !/^[1-9][0-9]*$/u.test(actualIdentity.ino) ||
    typeof actualIdentity.realpath !== "string" ||
    actualIdentity.dev !== expectedIdentity.device ||
    actualIdentity.ino !== expectedIdentity.inode ||
    actualIdentity.realpath !== expectedIdentity.realpath
  ) {
    throw new Error(
      "HK Visualization source snapshot workspace identity drifted from the expected physical run workspace.",
    );
  }
  return Object.freeze({ ...actualIdentity });
}

export function validateHkVisualizationReleaseSourceExecutionStart(
  snapshot,
  {
    expectedPathManifest,
    expectedWorkspace,
    phase = "unspecified",
  } = {},
) {
  if (
    !["after-source-before", "immediately-before-spawn", "postflight-current"]
      .includes(phase)
  ) {
    throw new Error(
      "HK Visualization release source execution validation phase is invalid.",
    );
  }
  validateHkVisualizationReleaseSourceSnapshot(snapshot);
  const workspaceIdentity =
    validateHkVisualizationReleaseSourceSnapshotWorkspace(snapshot, {
      expectedPathManifest,
      expectedWorkspace,
    });
  assertRequiredReleaseSourcePaths(snapshot);
  const workspace = assertHkVisualizationStarshipPath(
    "HK Visualization release source execution workspace",
    workspaceIdentity.realpath,
  );
  const currentBytesByPath = new Map();
  const sourceRows = HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS.map(
    (path) => {
      const matches = snapshot.entries.filter(
        (entry) => entry?.path === path,
      );
      if (
        matches.length !== 1 ||
        !exactOrderedObjectKeys(matches[0], [
          "mode",
          "path",
          "sha256",
          "size",
          "type",
        ]) ||
        !/^[0-7]{4}$/u.test(String(matches[0].mode ?? "")) ||
        matches[0].path !== path ||
        typeof matches[0].sha256 !== "string" ||
        !/^[a-f0-9]{64}$/u.test(matches[0].sha256) ||
        !Number.isSafeInteger(matches[0].size) ||
        matches[0].size < 0 ||
        matches[0].type !== "file"
      ) {
        throw new Error(
          `HK Visualization release source execution snapshot lacks one exact five-field entry for ${path}.`,
        );
      }
      const absolutePath = join(workspace, path);
      const bytes = readHkVisualizationBoundedStableRegularFile(absolutePath);
      const liveStat = lstatSync(absolutePath, { bigint: true });
      const liveMode = (Number(liveStat.mode & 0o7777n) & 0o7777)
        .toString(8)
        .padStart(4, "0");
      if (
        matches[0].size !== bytes.byteLength ||
        matches[0].sha256 !== sha256Text(bytes) ||
        matches[0].mode !== liveMode
      ) {
        throw new Error(
          `HK Visualization release source execution current mode, size, or SHA drifted from sourceBefore for ${path}.`,
        );
      }
      currentBytesByPath.set(path, bytes);
      return Object.freeze({ ...matches[0] });
    },
  );
  const staticDeadlineSourceFreeze =
    validateHkVisualizationStaticDeadlineSourceFreeze({
      sourceByFile: Object.fromEntries(
        HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS.map(({ path }) => [
          path,
          currentBytesByPath.get(path)?.toString("utf8"),
        ]),
      ),
    });
  return Object.freeze({
    contractVersion: HK_VISUALIZATION_RELEASE_SOURCE_EXECUTION_CONTRACT_VERSION,
    phase,
    sourceAggregateSha256: sha256Text(canonicalJson({
      contractVersion:
        HK_VISUALIZATION_RELEASE_SOURCE_EXECUTION_CONTRACT_VERSION,
      sourceRows,
    })),
    sourceRows: Object.freeze(sourceRows),
    staticDeadlineSourceAggregateSha256:
      staticDeadlineSourceFreeze.sourceAggregateSha256,
  });
}

const hkVisualizationSourceWatchState = Object.freeze({
  ready: 0,
  eventCount: 1,
  errorCount: 2,
  earlyCloseCount: 3,
  nullFilenameEventCount: 4,
  closing: 5,
  closed: 6,
  drainRequest: 7,
  drainAcknowledged: 8,
  watcherCount: 9,
});
const hkVisualizationSourceWatchWorker = String.raw`
  "use strict";
  const { lstatSync, watch } = require("node:fs");
  const { parentPort, workerData } = require("node:worker_threads");
  const state = new Int32Array(workerData.sharedState);
  const index = workerData.index;
  const watchers = [];
  const stableIdentity = (stat) => ({
    ctimeNs: String(stat.ctimeNs),
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: String(stat.mode),
    mtimeNs: String(stat.mtimeNs),
    nlink: String(stat.nlink),
    size: String(stat.size),
  });
  const sameIdentity = (left, right) =>
    left !== undefined &&
    Object.keys(left).every((key) => left[key] === right[key]);
  const baselineByAbsolutePath = new Map(
    workerData.watchRows.map(({ absolutePath, identity }) => [
      absolutePath,
      identity,
    ]),
  );
  const mark = (kind) => {
    Atomics.add(state, index.eventCount, 1);
    if (kind !== null) Atomics.add(state, kind, 1);
    Atomics.notify(state, index.eventCount);
  };
  const markIfImmutableSourceChanged = (absolutePath) => {
    try {
      const stat = lstatSync(absolutePath, { bigint: true });
      const actualIdentity = stableIdentity(stat);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.nlink !== 1n ||
        !sameIdentity(baselineByAbsolutePath.get(absolutePath), actualIdentity)
      ) mark(null);
    } catch {
      mark(null);
    }
  };
  const register = (watcher, callback) => {
    watchers.push(watcher);
    watcher.on("error", () => mark(index.errorCount));
    watcher.on("close", () => {
      if (Atomics.load(state, index.closing) === 0) {
        mark(index.earlyCloseCount);
      }
    });
    return callback;
  };
  process.on("uncaughtException", () => mark(index.errorCount));
  process.on("exit", () => {
    if (Atomics.load(state, index.closing) === 0) {
      mark(index.earlyCloseCount);
    }
    Atomics.store(state, index.closed, 1);
    Atomics.notify(state, index.closed);
  });
  try {
    for (const { absolutePath } of workerData.watchRows) {
      const watcher = watch(absolutePath, { persistent: true },
        (eventType, filename) => {
          if (filename === null) {
            mark(index.nullFilenameEventCount);
            return;
          }
          markIfImmutableSourceChanged(absolutePath);
        });
      register(watcher);
    }
    Atomics.store(state, index.watcherCount, watchers.length);
    Atomics.store(state, index.ready, 1);
    Atomics.notify(state, index.ready);
  } catch {
    mark(index.errorCount);
    Atomics.store(state, index.ready, -1);
    Atomics.notify(state, index.ready);
  }
  parentPort.on("message", (message) => {
    if (message?.type === "drain") {
      setImmediate(() => setImmediate(() => setTimeout(() => {
        Atomics.store(state, index.drainAcknowledged, message.sequence);
        Atomics.notify(state, index.drainAcknowledged);
      }, 15)));
      return;
    }
    if (message?.type === "close") {
      for (const watcher of watchers) watcher.close();
      Atomics.store(state, index.closed, 1);
      Atomics.notify(state, index.closed);
      parentPort.close();
    }
  });
`;

function waitForHkVisualizationSourceWatchState(
  state,
  index,
  predicate,
  label,
  timeoutMs = 5_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate(Atomics.load(state, index))) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(
        `HK Visualization release source execution monitor timed out during ${label}.`,
      );
    }
    const observed = Atomics.load(state, index);
    Atomics.wait(state, index, observed, Math.min(remaining, 100));
  }
  return Atomics.load(state, index);
}

export function armHkVisualizationReleaseSourceExecutionMonitor({
  workspace,
  testOnlyRequiredSourcePaths = null,
} = {}) {
  const physicalWorkspace = assertHkVisualizationStarshipPath(
    "HK Visualization release source execution monitor workspace",
    resolve(String(workspace ?? "")),
  );
  const requiredSourcePaths = testOnlyRequiredSourcePaths === null
    ? HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS
    : testOnlyRequiredSourcePaths;
  if (
    !Array.isArray(requiredSourcePaths) ||
    requiredSourcePaths.length < 1 ||
    new Set(requiredSourcePaths).size !== requiredSourcePaths.length ||
    requiredSourcePaths.some(
      (path) =>
        typeof path !== "string" ||
        !path ||
        isAbsolute(path) ||
        path.split(/[\\/]/u).includes("..") ||
        resolve(physicalWorkspace, path) === physicalWorkspace,
    )
  ) {
    throw new Error(
      "HK Visualization release source execution monitor paths are invalid.",
    );
  }
  if (
    testOnlyRequiredSourcePaths === null &&
    !isDeepStrictEqual(
      requiredSourcePaths,
      HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS,
    )
  ) {
    throw new Error(
      "HK Visualization release source execution monitor required paths drifted.",
    );
  }
  const absolutePaths = requiredSourcePaths.map((path) =>
    join(physicalWorkspace, path),
  );
  const watchRows = absolutePaths.map((absolutePath) => {
    readHkVisualizationBoundedStableRegularFile(absolutePath);
    const stat = lstatSync(absolutePath, { bigint: true });
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1n
    ) {
      throw new Error(
        `HK Visualization release source execution monitor baseline is not one single-link regular file: ${absolutePath}.`,
      );
    }
    return Object.freeze({
      absolutePath,
      identity: stableRegularFileStatIdentity(stat),
    });
  });
  const sharedState = new SharedArrayBuffer(
    Int32Array.BYTES_PER_ELEMENT * 10,
  );
  const state = new Int32Array(sharedState);
  const worker = new Worker(hkVisualizationSourceWatchWorker, {
    eval: true,
    workerData: {
      index: hkVisualizationSourceWatchState,
      sharedState,
      watchRows,
    },
  });
  worker.on("error", () => {
    Atomics.add(state, hkVisualizationSourceWatchState.errorCount, 1);
    Atomics.add(state, hkVisualizationSourceWatchState.eventCount, 1);
    Atomics.notify(
      state,
      hkVisualizationSourceWatchState.eventCount,
    );
  });
  let closed = false;
  const receipt = () => Object.freeze({
    coveredPathCount: watchRows.length,
    directoryWatcherCount: 0,
    earlyCloseCount: Atomics.load(
      state,
      hkVisualizationSourceWatchState.earlyCloseCount,
    ),
    errorCount: Atomics.load(
      state,
      hkVisualizationSourceWatchState.errorCount,
    ),
    eventCount: Atomics.load(
      state,
      hkVisualizationSourceWatchState.eventCount,
    ),
    fileWatcherCount: watchRows.length,
    nullFilenameEventCount: Atomics.load(
      state,
      hkVisualizationSourceWatchState.nullFilenameEventCount,
    ),
    status:
      Atomics.load(state, hkVisualizationSourceWatchState.eventCount) === 0 &&
      Atomics.load(state, hkVisualizationSourceWatchState.errorCount) === 0 &&
      Atomics.load(state, hkVisualizationSourceWatchState.earlyCloseCount) === 0 &&
      Atomics.load(state, hkVisualizationSourceWatchState.nullFilenameEventCount) === 0
        ? "clean"
        : "violated",
    watcherCount: Atomics.load(
      state,
      hkVisualizationSourceWatchState.watcherCount,
    ),
  });
  try {
    const ready = waitForHkVisualizationSourceWatchState(
      state,
      hkVisualizationSourceWatchState.ready,
      (value) => value !== 0,
      "arm",
    );
    if (ready !== 1) {
      throw new Error(
        "HK Visualization release source execution monitor could not arm fs.watch authority.",
      );
    }
    for (const { absolutePath, identity } of watchRows) {
      const currentStat = lstatSync(absolutePath, { bigint: true });
      if (
        !currentStat.isFile() ||
        currentStat.isSymbolicLink() ||
        currentStat.nlink !== 1n ||
        !isDeepStrictEqual(
          stableRegularFileStatIdentity(currentStat),
          identity,
        )
      ) {
        throw new Error(
          `HK Visualization release source execution monitor baseline drifted while arming: ${absolutePath}.`,
        );
      }
    }
  } catch (error) {
    Atomics.store(state, hkVisualizationSourceWatchState.closing, 1);
    void worker.terminate();
    throw error;
  }
  return Object.freeze({
    assertClean(phase = "unspecified") {
      const current = receipt();
      if (
        Atomics.load(state, hkVisualizationSourceWatchState.ready) !== 1 ||
        (!closed &&
          Atomics.load(state, hkVisualizationSourceWatchState.closed) !== 0) ||
        current.status !== "clean" ||
        current.watcherCount !== current.fileWatcherCount
      ) {
        throw new Error(
          `HK Visualization release source execution monitor is not clean during ${phase}.`,
        );
      }
      return current;
    },
    close() {
      if (closed) return receipt();
      Atomics.store(state, hkVisualizationSourceWatchState.closing, 1);
      worker.postMessage({ type: "close" });
      waitForHkVisualizationSourceWatchState(
        state,
        hkVisualizationSourceWatchState.closed,
        (value) => value === 1,
        "close",
      );
      closed = true;
      worker.unref();
      return receipt();
    },
    drain() {
      if (closed) {
        throw new Error(
          "HK Visualization release source execution monitor cannot drain after close.",
        );
      }
      const sequence = Atomics.add(
        state,
        hkVisualizationSourceWatchState.drainRequest,
        1,
      ) + 1;
      worker.postMessage({ sequence, type: "drain" });
      waitForHkVisualizationSourceWatchState(
        state,
        hkVisualizationSourceWatchState.drainAcknowledged,
        (value) => value >= sequence,
        "drain",
      );
      return receipt();
    },
    receipt,
  });
}

function validateHkVisualizationReleaseSourceExecutionReceipt(
  releaseSourceReceipt,
  { expectedPathManifest, expectedWorkspace } = {},
) {
  const execution = releaseSourceReceipt?.releaseSourceExecution;
  const monitor = execution?.monitorReceipt;
  const expectedCoveredPathCount =
    HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS.length;
  if (
    !exactOrderedObjectKeys(execution, [
      "contractVersion",
      "executionStartSourceAggregateSha256",
      "executionStartSourceRows",
      "monitorReceipt",
    ]) ||
    execution.contractVersion !==
      HK_VISUALIZATION_RELEASE_SOURCE_EXECUTION_CONTRACT_VERSION ||
    typeof execution.executionStartSourceAggregateSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(
      execution.executionStartSourceAggregateSha256,
    ) ||
    !Array.isArray(execution.executionStartSourceRows) ||
    !exactOrderedObjectKeys(monitor, [
      "coveredPathCount",
      "directoryWatcherCount",
      "earlyCloseCount",
      "errorCount",
      "eventCount",
      "fileWatcherCount",
      "nullFilenameEventCount",
      "policy",
      "status",
      "version",
      "watcherCount",
    ]) ||
    monitor.coveredPathCount !== expectedCoveredPathCount ||
    monitor.directoryWatcherCount !== 0 ||
    monitor.fileWatcherCount !==
      HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS.length ||
    monitor.watcherCount !== monitor.fileWatcherCount ||
    monitor.earlyCloseCount !== 0 ||
    monitor.errorCount !== 0 ||
    monitor.eventCount !== 0 ||
    monitor.nullFilenameEventCount !== 0 ||
    !isDeepStrictEqual(
      monitor.policy,
      HK_VISUALIZATION_RELEASE_SOURCE_MONITOR_POLICY,
    ) ||
    monitor.status !== "clean" ||
    monitor.version !== HK_VISUALIZATION_RELEASE_SOURCE_MONITOR_VERSION
  ) {
    throw new Error(
      "HK Visualization release source execution receipt is not exact zero-event monitor evidence.",
    );
  }
  const currentBefore = validateHkVisualizationReleaseSourceExecutionStart(
    releaseSourceReceipt.before,
    {
      expectedPathManifest,
      expectedWorkspace,
      phase: "postflight-current",
    },
  );
  const currentAfter = validateHkVisualizationReleaseSourceExecutionStart(
    releaseSourceReceipt.after,
    {
      expectedPathManifest,
      expectedWorkspace,
      phase: "postflight-current",
    },
  );
  if (
    !isDeepStrictEqual(currentBefore.sourceRows, currentAfter.sourceRows) ||
    !isDeepStrictEqual(
      execution.executionStartSourceRows,
      currentBefore.sourceRows,
    ) ||
    execution.executionStartSourceAggregateSha256 !==
      currentBefore.sourceAggregateSha256 ||
    currentBefore.sourceAggregateSha256 !==
      currentAfter.sourceAggregateSha256
  ) {
    throw new Error(
      "HK Visualization release source execution receipt current45 rows or aggregate drifted.",
    );
  }
  return Object.freeze({
    contractVersion: execution.contractVersion,
    executionStartSourceAggregateSha256:
      execution.executionStartSourceAggregateSha256,
    executionStartSourceRows: Object.freeze(
      execution.executionStartSourceRows.map((row) =>
        Object.freeze({ ...row }),
      ),
    ),
    monitorReceipt: Object.freeze(structuredClone(monitor)),
  });
}

function validateHkVisualizationExecutionStageReceipt(
  executionStage,
  { dependencySummary, expectedPathManifest, sourceSnapshot } = {},
) {
  const expectedKeys = [
    "contractVersion",
    "dependencyAggregateSha256",
    "dependencyFileCount",
    "dependencyRows",
    "dependencySymlinkCount",
    "materializedBytes",
    "materializedRegularFileCount",
    "policy",
    "policyHash",
    "sourceAggregateSha256",
    "sourceFileCount",
    "sourceRows",
    "stageIdentity",
    "status",
    "manifestHash",
  ];
  if (
    !exactOrderedObjectKeys(executionStage, expectedKeys) ||
    executionStage.contractVersion !==
      HK_VISUALIZATION_EXECUTION_STAGE_CONTRACT_VERSION ||
    executionStage.status !== "sealed" ||
    !isDeepStrictEqual(
      executionStage.policy,
      HK_VISUALIZATION_EXECUTION_STAGE_POLICY,
    ) ||
    executionStage.policyHash !==
      sha256Text(canonicalJson(HK_VISUALIZATION_EXECUTION_STAGE_POLICY)) ||
    !Array.isArray(executionStage.sourceRows) ||
    !Array.isArray(executionStage.dependencyRows) ||
    !sourceSnapshot ||
    !dependencySummary
  ) {
    throw new Error(
      "HK Visualization immutable execution-stage receipt shape or policy drifted.",
    );
  }
  for (const entry of executionStage.sourceRows) {
    assertExecutionStageSourceEntry(entry);
  }
  for (const entry of executionStage.dependencyRows) {
    assertExecutionStageDependencyEntry(entry);
  }
  const sourceFiles = executionStage.sourceRows.filter(
    ({ type }) => type === "file",
  );
  const dependencyFiles = executionStage.dependencyRows.filter(
    ({ type }) => type === "file",
  );
  const dependencySymlinks = executionStage.dependencyRows.filter(
    ({ type }) => type === "symlink",
  );
  const materializedBytes = [...sourceFiles, ...dependencyFiles].reduce(
    (total, { size }) => total + size,
    0,
  );
  if (
    !isDeepStrictEqual(executionStage.sourceRows, sourceSnapshot.entries) ||
    executionStage.sourceAggregateSha256 !==
      sourceSnapshot.sourceAggregateSha256 ||
    executionStage.sourceFileCount !== sourceFiles.length ||
    executionStage.dependencyAggregateSha256 !==
      dependencySummary.aggregateSha256 ||
    executionStage.dependencyAggregateSha256 !==
      sha256Text(JSON.stringify(executionStage.dependencyRows)) ||
    executionStage.dependencyFileCount !== dependencyFiles.length ||
    executionStage.dependencySymlinkCount !== dependencySymlinks.length ||
    executionStage.materializedRegularFileCount !==
      sourceFiles.length + dependencyFiles.length ||
    executionStage.materializedBytes !== materializedBytes
  ) {
    throw new Error(
      "HK Visualization immutable execution-stage receipt does not bind the exact source/dependency manifests.",
    );
  }
  const payload = { ...executionStage };
  delete payload.manifestHash;
  if (
    typeof executionStage.manifestHash !== "string" ||
    !/^[a-f0-9]{64}$/u.test(executionStage.manifestHash) ||
    executionStage.manifestHash !== sha256Text(canonicalJson(payload))
  ) {
    throw new Error(
      "HK Visualization immutable execution-stage receipt hash drifted.",
    );
  }
  const expectedStage =
    expectedPathManifest?.executionWorkspace ?? expectedPathManifest?.workspace;
  if (typeof expectedStage !== "string") {
    throw new Error(
      "HK Visualization immutable execution-stage receipt lacks its expected workspace.",
    );
  }
  const liveIdentity = captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization immutable execution-stage receipt workspace",
    expectedStage,
  );
  if (!isDeepStrictEqual(executionStage.stageIdentity, liveIdentity)) {
    throw new Error(
      "HK Visualization immutable execution-stage receipt identity drifted.",
    );
  }
  const liveSourceSnapshot = captureHkVisualizationReleaseSourceSnapshot({
    workspace: expectedStage,
  });
  const expectedSealedSourceRows = sourceSnapshot.entries.map((entry) => ({
    ...entry,
    mode: (Number.parseInt(entry.mode, 8) & 0o555)
      .toString(8)
      .padStart(4, "0"),
  }));
  if (!isDeepStrictEqual(liveSourceSnapshot.entries, expectedSealedSourceRows)) {
    throw new Error(
      "HK Visualization immutable execution-stage source bytes or sealed metadata drifted.",
    );
  }
  validateExecutionStageDependencyCopy(
    expectedStage,
    executionStage.dependencyRows,
    { sealed: true },
  );
  const stageStat = lstatSync(expectedStage, { bigint: true });
  const generatedStat = lstatSync(join(expectedStage, ".next"), {
    bigint: true,
  });
  if (
    !stageStat.isDirectory() ||
    (stageStat.mode & 0o222n) !== 0n ||
    !generatedStat.isDirectory() ||
    (generatedStat.mode & 0o200n) === 0n
  ) {
    throw new Error(
      "HK Visualization immutable execution-stage seal or generated subtree permissions drifted.",
    );
  }
  return Object.freeze(structuredClone(executionStage));
}

export function validateHkVisualizationStaticDeadlineSourceReceipt(
  releaseSourceReceipt,
  { expectedPathManifest, expectedWorkspace } = {},
) {
  if (
    !releaseSourceReceipt ||
    !isDeepStrictEqual(
      releaseSourceReceipt.requiredSourcePaths,
      HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS,
    ) ||
    !isDeepStrictEqual(
      releaseSourceReceipt.staticDeadlineSourceRows,
      HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS,
    ) ||
    releaseSourceReceipt.staticDeadlineSourceAggregateSha256 !==
      HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_AGGREGATE_SHA256
  ) {
    throw new Error(
      "HK Visualization frozen static deadline source receipt lacks the exact ordered source authority.",
    );
  }
  const boundWorkspace = expectedWorkspace ??
    expectedPathManifest?.sourceWorkspace ??
    expectedPathManifest?.workspace ??
    resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const beforeWorkspaceIdentity =
    validateHkVisualizationReleaseSourceSnapshotWorkspace(
      releaseSourceReceipt.before,
      { expectedPathManifest, expectedWorkspace: boundWorkspace },
    );
  const afterWorkspaceIdentity =
    validateHkVisualizationReleaseSourceSnapshotWorkspace(
      releaseSourceReceipt.after,
      { expectedPathManifest, expectedWorkspace: boundWorkspace },
    );
  if (!isDeepStrictEqual(beforeWorkspaceIdentity, afterWorkspaceIdentity)) {
    throw new Error(
      "HK Visualization frozen static deadline source receipt workspace identity drifted between phases.",
    );
  }
  const workspace = assertHkVisualizationStarshipPath(
    "HK Visualization frozen static deadline source receipt workspace",
    beforeWorkspaceIdentity.realpath,
  );
  const executionEvidence =
    validateHkVisualizationReleaseSourceExecutionReceipt(
      releaseSourceReceipt,
      { expectedPathManifest, expectedWorkspace: boundWorkspace },
    );
  const executionStageEvidence =
    validateHkVisualizationExecutionStageReceipt(
      releaseSourceReceipt.executionStage,
      {
        dependencySummary: releaseSourceReceipt.dependencyBefore,
        expectedPathManifest,
        sourceSnapshot: releaseSourceReceipt.before,
      },
    );
  const receiptRows = HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS.map(
    (authorityRow) => {
      const phaseEntry = (phase) => {
        const matches = Array.isArray(releaseSourceReceipt[phase]?.entries)
          ? releaseSourceReceipt[phase].entries.filter(
              (entry) => entry?.path === authorityRow.path,
            )
          : [];
        if (
          matches.length !== 1 ||
          !exactOrderedObjectKeys(matches[0], [
            "mode",
            "path",
            "sha256",
            "size",
            "type",
          ]) ||
          !/^[0-7]{4}$/u.test(String(matches[0].mode ?? "")) ||
          matches[0].path !== authorityRow.path ||
          matches[0].sha256 !== authorityRow.sha256 ||
          matches[0].size !== authorityRow.size ||
          matches[0].type !== "file"
        ) {
          throw new Error(
            `HK Visualization frozen static deadline source receipt lacks one exact five-field authority entry for ${authorityRow.path} in ${phase}.`,
          );
        }
        return matches[0];
      };
      const beforeEntry = phaseEntry("before");
      const afterEntry = phaseEntry("after");
      if (!isDeepStrictEqual(beforeEntry, afterEntry)) {
        throw new Error(
          `HK Visualization frozen static deadline source receipt metadata drifted for ${authorityRow.path}.`,
        );
      }
      const absolutePath = join(workspace, authorityRow.path);
      const bytes = readHkVisualizationBoundedStableRegularFile(absolutePath);
      const liveStat = lstatSync(absolutePath, { bigint: true });
      const liveMode = (Number(liveStat.mode & 0o7777n) & 0o7777)
        .toString(8)
        .padStart(4, "0");
      if (
        bytes.byteLength !== authorityRow.size ||
        sha256Text(bytes) !== authorityRow.sha256 ||
        beforeEntry.mode !== liveMode
      ) {
        throw new Error(
          `HK Visualization frozen static deadline source receipt does not bind current mode, size, and SHA bytes for ${authorityRow.path}.`,
        );
      }
      return Object.freeze({
        afterSha256: afterEntry.sha256,
        beforeSha256: beforeEntry.sha256,
        mode: beforeEntry.mode,
        path: authorityRow.path,
        size: beforeEntry.size,
        type: beforeEntry.type,
      });
    },
  );
  const evidenceWithoutHash = {
    contractVersion: HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_CONTRACT_VERSION,
    executionStartSourceAggregateSha256:
      executionEvidence.executionStartSourceAggregateSha256,
    executionStartSourceRows: executionEvidence.executionStartSourceRows,
    executionStageManifestHash: executionStageEvidence.manifestHash,
    executionStagePolicyHash: executionStageEvidence.policyHash,
    executionStageWorkspaceIdentity: executionStageEvidence.stageIdentity,
    monitorReceipt: executionEvidence.monitorReceipt,
    receiptRows: Object.freeze(receiptRows),
    sourceAggregateSha256:
      HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_AGGREGATE_SHA256,
    sourceRows: Object.freeze(
      HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS.map((row) =>
        Object.freeze({ ...row }),
      ),
    ),
  };
  return Object.freeze({
    ...evidenceWithoutHash,
    runAggregateHash: sha256Text(canonicalJson({
      evidence: evidenceWithoutHash,
      kind: "hk-viz-static-deadline-source-run-evidence",
    })),
  });
}

function safeValueFingerprint(value) {
  const text = String(value ?? "");
  return `length=${Buffer.byteLength(text, "utf8")},sha256=${sha256Text(text)}`;
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0))
      throw new Error(
        "HK Visualization receipt numbers must be finite and not negative zero.",
      );
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("HK Visualization receipts must be canonical JSON data.");
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

export function assertHkVisualizationBoundedJsonReportFileStat(stat) {
  if (!stat || typeof stat.isFile !== "function" || !stat.isFile()) {
    throw new Error("HK Visualization JSON report must be a regular file.");
  }
  if (
    !Number.isSafeInteger(stat.size) ||
    stat.size <= 0 ||
    stat.size >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS.jsonReportBytes
  ) {
    throw new Error("HK Visualization JSON report exceeded the report byte limit.");
  }
  return stat;
}

export function validateHkVisualizationDependentTransitionAttachmentEnvelope(
  body,
) {
  if (typeof body !== "string" || body.length === 0) {
    throw new Error(
      "HK Visualization dependent-transition attachment requires an ASCII base64 string.",
    );
  }
  const encodedBytes = Buffer.byteLength(body, "utf8");
  if (
    encodedBytes >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS.attachmentEncodedBytes
  ) {
    throw new Error(
      "HK Visualization dependent-transition attachment exceeded the encoded byte limit.",
    );
  }
  if (
    encodedBytes !== body.length ||
    body.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      body,
    )
  ) {
    throw new Error(
      "HK Visualization dependent-transition attachment body is not canonical ASCII base64.",
    );
  }
  const padding = body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0;
  const decodedBytes = body.length / 4 * 3 - padding;
  if (
    !Number.isSafeInteger(decodedBytes) ||
    decodedBytes <= 0 ||
    decodedBytes >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS.attachmentDecodedBytes
  ) {
    throw new Error(
      "HK Visualization dependent-transition attachment exceeded the decoded byte limit.",
    );
  }
  return { decodedBytes, encodedBytes };
}

export function assertHkVisualizationDependentTransitionAttachmentResourceTotals(
  totals,
) {
  if (
    !exactOrderedObjectKeys(totals, [
      "attachmentCount",
      "decodedBytes",
      "encodedBytes",
    ]) ||
    !Number.isSafeInteger(totals.attachmentCount) ||
    totals.attachmentCount < 0 ||
    totals.attachmentCount >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS.packageCount ||
    !Number.isSafeInteger(totals.decodedBytes) ||
    totals.decodedBytes < 0 ||
    !Number.isSafeInteger(totals.encodedBytes) ||
    totals.encodedBytes < 0
  ) {
    throw new Error(
      "HK Visualization dependent-transition attachment resource totals are invalid.",
    );
  }
  if (
    totals.decodedBytes >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS
      .cumulativeAttachmentDecodedBytes
  ) {
    throw new Error(
      "HK Visualization dependent-transition attachments exceeded the cumulative decoded byte limit.",
    );
  }
  if (
    totals.encodedBytes >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS
      .cumulativeAttachmentEncodedBytes
  ) {
    throw new Error(
      "HK Visualization dependent-transition attachments exceeded the cumulative encoded byte limit.",
    );
  }
  return totals;
}

export function decodeHkVisualizationDependentTransitionAttachmentWithinResourceBudget(
  body,
  committedTotals,
  decodeBase64 = (value) => Buffer.from(value, "base64"),
) {
  if (typeof decodeBase64 !== "function") {
    throw new Error(
      "HK Visualization dependent-transition attachment decoder seam is invalid.",
    );
  }
  assertHkVisualizationDependentTransitionAttachmentResourceTotals(
    committedTotals,
  );
  const envelope =
    validateHkVisualizationDependentTransitionAttachmentEnvelope(body);
  const prospectiveTotals = {
    attachmentCount: committedTotals.attachmentCount + 1,
    decodedBytes: committedTotals.decodedBytes + envelope.decodedBytes,
    encodedBytes: committedTotals.encodedBytes + envelope.encodedBytes,
  };
  assertHkVisualizationDependentTransitionAttachmentResourceTotals(
    prospectiveTotals,
  );
  let bytes;
  try {
    bytes = decodeBase64(body);
  } catch {
    throw new Error(
      "HK Visualization dependent-transition attachment body is not base64.",
    );
  }
  if (!Buffer.isBuffer(bytes)) {
    throw new Error(
      "HK Visualization dependent-transition attachment decoder returned invalid bytes.",
    );
  }
  return { bytes, envelope, prospectiveTotals };
}

export function readHkVisualizationBoundedJsonReport(reportPath) {
  const stat = assertHkVisualizationBoundedJsonReportFileStat(
    lstatSync(reportPath),
  );
  const bytes = readFileSync(reportPath);
  if (
    bytes.byteLength !== stat.size ||
    bytes.byteLength >
      HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS.jsonReportBytes
  ) {
    throw new Error(
      "HK Visualization JSON report changed size or exceeded the report byte limit during read.",
    );
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("HK Visualization JSON report is not exact UTF-8.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("HK Visualization JSON report is unreadable JSON.");
  }
}

function exactObjectKeys(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort())
  );
}

const hkVisualizationCanonicalAnnotationMaxUtf8Bytes = 1_048_576;

function parseHkVisualizationBoundedCanonicalAnnotationDescription(
  annotation,
  packageTitle,
  annotationType,
) {
  const description = annotation?.description;
  if (typeof description !== "string") {
    throw new Error(
      `${packageTitle} ${annotationType} annotation description must be a string.`,
    );
  }
  if (
    Buffer.byteLength(description, "utf8") >
      hkVisualizationCanonicalAnnotationMaxUtf8Bytes
  ) {
    throw new Error(
      `${packageTitle} ${annotationType} annotation exceeded the UTF-8 byte limit.`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(description);
  } catch {
    throw new Error(
      `${packageTitle} ${annotationType} annotation is unreadable JSON.`,
    );
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    Object.getPrototypeOf(parsed) !== Object.prototype ||
    JSON.stringify(parsed) !== description
  ) {
    throw new Error(
      `${packageTitle} ${annotationType} annotation must use canonical minified plain-object JSON bytes.`,
    );
  }
  return parsed;
}

function exactOrderedObjectKeys(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    isDeepStrictEqual(Object.keys(value), keys)
  );
}

function ledgerCompatibleOrderedJson(value) {
  const chunks = [];
  let payloadBytes = 0;
  const append = (chunk) => {
    payloadBytes += Buffer.byteLength(chunk, "utf8");
    if (
      payloadBytes >
      hkVisualizationDependentTransitionLedgerHashPayloadMaxBytes
    ) {
      throw new Error(
        "dependent-transition companion ledger hash payload exceeded the exact byte limit",
      );
    }
    chunks.push(chunk);
  };
  const visit = (candidate) => {
    if (candidate === null) {
      append("null");
      return;
    }
    if (typeof candidate === "string") {
      append(JSON.stringify(candidate));
      return;
    }
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate) || Object.is(candidate, -0)) {
        throw new Error(
          "dependent-transition companion ledger hash rejects non-finite numbers and negative zero",
        );
      }
      append(JSON.stringify(candidate));
      return;
    }
    if (typeof candidate === "boolean") {
      append(candidate ? "true" : "false");
      return;
    }
    if (Array.isArray(candidate)) {
      append("[");
      for (let index = 0; index < candidate.length; index += 1) {
        if (!Object.hasOwn(candidate, index)) {
          throw new Error(
            "dependent-transition companion ledger hash rejects sparse arrays",
          );
        }
        if (index > 0) append(",");
        visit(candidate[index]);
      }
      append("]");
      return;
    }
    if (
      !candidate ||
      typeof candidate !== "object" ||
      (Object.getPrototypeOf(candidate) !== Object.prototype &&
        Object.getPrototypeOf(candidate) !== null)
    ) {
      throw new Error(
        "dependent-transition companion ledger hash requires plain JSON objects",
      );
    }
    const keys = Object.keys(candidate);
    append("{");
    for (let index = 0; index < keys.length; index += 1) {
      if (index > 0) append(",");
      const key = keys[index];
      const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new Error(
          "dependent-transition companion ledger hash requires own enumerable data properties",
        );
      }
      append(JSON.stringify(key));
      append(":");
      visit(descriptor.value);
    }
    append("}");
  };
  visit(value);
  return chunks.join("");
}

function hashLedgerCompatibleObjectWithoutKey(value, omittedKey) {
  const payload = {};
  for (const key of Object.keys(value)) {
    if (key !== omittedKey) payload[key] = value[key];
  }
  return sha256Text(ledgerCompatibleOrderedJson(payload));
}

function readPackageVersion(path, label) {
  try {
    const value = JSON.parse(readFileSync(path, "utf8"))?.version;
    if (typeof value !== "string" || !/^[A-Za-z0-9._+:/@()-]{1,128}$/.test(value))
      throw new Error("version is missing or unsafe");
    return value;
  } catch (error) {
    throw new Error(
      `${label} package version is unavailable (${safeValueFingerprint(error instanceof Error ? error.message : String(error))}).`,
      { cause: error },
    );
  }
}

function buildHkVisualizationReleaseToolchainInputs(workspace) {
  return Object.freeze([
    Object.freeze({
      name: "next-clean-build",
      path: join(workspace, "scripts", "next-clean-build.mjs"),
      version: "workspace-source-v1",
    }),
    Object.freeze({
      name: "next-cli",
      path: join(workspace, "node_modules", "next", "dist", "bin", "next"),
      version: readPackageVersion(
        join(workspace, "node_modules", "next", "package.json"),
        "Next",
      ),
    }),
    Object.freeze({
      name: "node",
      path: process.execPath,
      version: process.version,
    }),
    Object.freeze({
      name: "playwright-test-cli",
      path: join(
        workspace,
        "node_modules",
        "@playwright",
        "test",
        "cli.js",
      ),
      version: readPackageVersion(
        join(
          workspace,
          "node_modules",
          "@playwright",
          "test",
          "package.json",
        ),
        "Playwright",
      ),
    }),
  ]);
}

function assertRequiredReleaseSourcePaths(snapshot) {
  const availableFiles = new Set(
    snapshot.entries
      .filter((entry) => entry?.type === "file")
      .map((entry) => entry.path),
  );
  const missing = HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS.filter(
    (path) => !availableFiles.has(path),
  );
  if (missing.length > 0) {
    throw new Error(
      `HK Visualization release source snapshot is missing ${missing.length} required source files: ${missing.join(", ")}.`,
    );
  }
}

function validPathFingerprint(value) {
  return (
    exactObjectKeys(value, ["length", "sha256"]) &&
    Number.isSafeInteger(value.length) &&
    value.length > 0 &&
    /^[a-f0-9]{64}$/.test(String(value.sha256 ?? ""))
  );
}

export function validateHkVisualizationDependencyClosureSummary(summary) {
  if (
    !exactObjectKeys(summary, [
      "algorithm",
      "aggregateSha256",
      "dependencySchemaVersion",
      "entryCount",
      "fileCount",
      "fullManifestArtifact",
      "issues",
      "nodeModulesPhysical",
      "nodeModulesRootFingerprint",
      "receiptAggregateSha256",
      "schemaVersion",
      "status",
      "summaryAggregateSha256",
      "symlinkCount",
      "versions",
      "workspaceRootFingerprint",
    ]) ||
    summary.status !== "PASS" ||
    !Array.isArray(summary.issues) ||
    summary.issues.length !== 0 ||
    summary.nodeModulesPhysical !== true ||
    !Number.isSafeInteger(summary.entryCount) ||
    summary.entryCount < 1 ||
    !Number.isSafeInteger(summary.fileCount) ||
    summary.fileCount < 1 ||
    !Number.isSafeInteger(summary.symlinkCount) ||
    summary.symlinkCount < 0 ||
    summary.fileCount + summary.symlinkCount !== summary.entryCount ||
    !exactObjectKeys(summary.fullManifestArtifact, [
      "pathFingerprint",
      "schemaVersion",
      "sha256",
      "size",
    ]) ||
    !validPathFingerprint(summary.fullManifestArtifact?.pathFingerprint) ||
    !/^[a-f0-9]{64}$/.test(
      String(summary.fullManifestArtifact?.sha256 ?? ""),
    ) ||
    summary.fullManifestArtifact?.schemaVersion !==
      HK_VISUALIZATION_DEPENDENCY_CLOSURE_ARTIFACT_SCHEMA ||
    !Number.isSafeInteger(summary.fullManifestArtifact?.size) ||
    summary.fullManifestArtifact.size < 1 ||
    !validPathFingerprint(summary.nodeModulesRootFingerprint) ||
    !validPathFingerprint(summary.workspaceRootFingerprint) ||
    !/^[a-f0-9]{64}$/.test(String(summary.aggregateSha256 ?? "")) ||
    !/^[a-f0-9]{64}$/.test(String(summary.receiptAggregateSha256 ?? "")) ||
    !/^[a-f0-9]{64}$/.test(String(summary.summaryAggregateSha256 ?? ""))
  ) {
    throw new Error(
      "HK Visualization dependency closure summary is not complete PASS evidence.",
    );
  }
  const payload = { ...summary };
  delete payload.summaryAggregateSha256;
  if (summary.summaryAggregateSha256 !== sha256Text(JSON.stringify(payload))) {
    throw new Error(
      "HK Visualization dependency closure summary aggregate drifted.",
    );
  }
  return Object.freeze(structuredClone(summary));
}

export function validateHkVisualizationCanonicalDependencyClosureSummary(
  summary,
  {
    expectedImplementationSourceSha256,
    fullManifestArtifact = null,
  } = {},
) {
  validateHkVisualizationDependencyClosureSummary(summary);
  if (
    typeof expectedImplementationSourceSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(expectedImplementationSourceSha256)
  ) {
    throw new Error(
      "HK Visualization canonical dependency closure validation requires an independently captured implementation source SHA-256.",
    );
  }
  const expected = HK_VISUALIZATION_CANONICAL_DEPENDENCY_CLOSURE;
  const expectedAlgorithm = {
    frozenReferenceSha256:
      HK_VISUALIZATION_DEPENDENCY_CLOSURE_FROZEN_REFERENCE_SHA256,
    implementationSourceSha256:
      expectedImplementationSourceSha256,
    locale: new Intl.Collator().resolvedOptions().locale,
    nodeVersion: process.version,
    referenceVerification: {
      observedSha256: null,
      pathFingerprint: null,
      status: "provenance-only",
    },
  };
  const issues = [];
  if (summary.schemaVersion !== HK_VISUALIZATION_DEPENDENCY_CLOSURE_SUMMARY_SCHEMA)
    issues.push("summary-schema-version-drift");
  if (summary.dependencySchemaVersion !== HK_VISUALIZATION_DEPENDENCY_CLOSURE_SCHEMA)
    issues.push("dependency-schema-version-drift");
  if (!isDeepStrictEqual(summary.algorithm, expectedAlgorithm)) {
    if (
      summary.algorithm?.frozenReferenceSha256 !==
      expectedAlgorithm.frozenReferenceSha256
    )
      issues.push("frozen-reference-drift");
    if (
      summary.algorithm?.implementationSourceSha256 !==
      expectedAlgorithm.implementationSourceSha256
    )
      issues.push("implementation-source-drift");
    if (summary.algorithm?.locale !== expectedAlgorithm.locale)
      issues.push("locale-drift");
    if (summary.algorithm?.nodeVersion !== expectedAlgorithm.nodeVersion)
      issues.push("node-version-drift");
    if (
      !exactObjectKeys(summary.algorithm, [
        "frozenReferenceSha256",
        "implementationSourceSha256",
        "locale",
        "nodeVersion",
        "referenceVerification",
      ])
    )
      issues.push("algorithm-key-set-drift");
  }
  if (summary.aggregateSha256 !== expected.aggregateSha256)
    issues.push("canonical-aggregate-drift");
  if (summary.entryCount !== expected.entryCount)
    issues.push("canonical-entry-count-drift");
  if (summary.fileCount !== expected.fileCount)
    issues.push("canonical-file-count-drift");
  if (summary.symlinkCount !== expected.symlinkCount)
    issues.push("canonical-symlink-count-drift");
  if (!isDeepStrictEqual(summary.versions, expected.versions))
    issues.push("next-version-drift");
  if (fullManifestArtifact === null) {
    issues.push("full-manifest-artifact-required");
  } else {
    const deepIssues =
      validateHkVisualizationDependencyClosureSummaryReceipt(summary, {
        expectedImplementationSourceSha256,
        fullManifestArtifact,
      });
    if (deepIssues.length > 0)
      issues.push(`deep-summary-invalid=[${deepIssues.join(",")}]`);
  }
  if (issues.length > 0) {
    throw new Error(
      `HK Visualization canonical dependency closure summary is invalid: ${issues.join(",")}.`,
    );
  }
  return Object.freeze(structuredClone(summary));
}

function validateReleaseSourceReceipt(
  receipt,
  { dependencyArtifacts, manifest, validateDependencySummary },
) {
  const issues = [];
  const keys = [
    "schemaVersion",
    "runId",
    "manifestHash",
    "artifactRootIdentity",
    "managedToolchainIdentity",
    "executionStage",
    "requiredSourcePaths",
    "releaseSourceExecution",
    "staticDeadlineSourceAggregateSha256",
    "staticDeadlineSourceRows",
    "before",
    "after",
    "comparison",
    "dependencyBefore",
    "dependencyAfter",
    "dependencyComparison",
    "receiptAggregateSha256",
  ];
  if (!exactObjectKeys(receipt, keys)) issues.push("key-set-drift");
  if (receipt?.schemaVersion !== HK_VISUALIZATION_RELEASE_SOURCE_RECEIPT_SCHEMA)
    issues.push("schema-version-drift");
  if (receipt?.runId !== manifest.runId) issues.push("run-id-drift");
  if (receipt?.manifestHash !== manifest.manifestHash)
    issues.push("manifest-hash-drift");
  if (
    !isDeepStrictEqual(
      receipt?.requiredSourcePaths,
      HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS,
    )
  ) {
    issues.push("required-source-paths-drift");
  }
  if (
    receipt?.staticDeadlineSourceAggregateSha256 !==
      HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_AGGREGATE_SHA256
  ) {
    issues.push("static-deadline-source-aggregate-drift");
  }
  if (
    !isDeepStrictEqual(
      receipt?.staticDeadlineSourceRows,
      HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS,
    )
  ) {
    issues.push("static-deadline-source-rows-drift");
  }
  const artifactIssues =
    validateHkVisualizationMaterializedArtifactRootIdentity(
      manifest,
      receipt?.artifactRootIdentity,
    );
  if (artifactIssues.length > 0)
    issues.push(`artifact-root-identity=[${artifactIssues.join("; ")}]`);
  try {
    const liveManagedToolchainIdentity =
      captureHkVisualizationManagedToolchainIdentity(manifest);
    if (
      !isDeepStrictEqual(
        receipt?.managedToolchainIdentity,
        liveManagedToolchainIdentity,
      )
    ) {
      issues.push("managed-toolchain-identity-drift");
    }
  } catch (error) {
    issues.push(
      `managed-toolchain-identity-invalid=${safeValueFingerprint(
        error instanceof Error ? error.message : String(error),
      )}`,
    );
  }
  try {
    validateHkVisualizationReleaseSourceSnapshot(receipt?.before);
    validateHkVisualizationReleaseSourceSnapshot(receipt?.after);
    validateHkVisualizationReleaseSourceSnapshotWorkspace(receipt.before, {
      expectedPathManifest: manifest,
      expectedWorkspace: manifest.sourceWorkspace ?? manifest.workspace,
    });
    validateHkVisualizationReleaseSourceSnapshotWorkspace(receipt.after, {
      expectedPathManifest: manifest,
      expectedWorkspace: manifest.sourceWorkspace ?? manifest.workspace,
    });
    const actualComparison = compareHkVisualizationReleaseSourceSnapshots(
      receipt.before,
      receipt.after,
    );
    if (!isDeepStrictEqual(receipt.comparison, actualComparison))
      issues.push("source-comparison-drift");
    if (!actualComparison.equal) issues.push("source-snapshot-drift");
    assertRequiredReleaseSourcePaths(receipt.before);
    assertRequiredReleaseSourcePaths(receipt.after);
    validateHkVisualizationStaticDeadlineSourceReceipt(receipt, {
      expectedPathManifest: manifest,
      expectedWorkspace: manifest.sourceWorkspace ?? manifest.workspace,
    });
  } catch (error) {
    issues.push(
      `source-snapshot-invalid=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    !receipt?.dependencyComparison ||
    !exactObjectKeys(receipt.dependencyComparison, ["equal", "issues"]) ||
    receipt.dependencyComparison.equal !== true ||
    !Array.isArray(receipt.dependencyComparison.issues) ||
    receipt.dependencyComparison.issues.length !== 0
  ) {
    issues.push("dependency-comparison-drift");
  }
  try {
    validateDependencySummary(receipt?.dependencyBefore, {
      fullManifestArtifact: dependencyArtifacts?.before,
    });
    validateDependencySummary(receipt?.dependencyAfter, {
      fullManifestArtifact: dependencyArtifacts?.after,
    });
    const summarySemantics = (summary) => {
      const clone = structuredClone(summary);
      delete clone.fullManifestArtifact;
      delete clone.summaryAggregateSha256;
      return clone;
    };
    if (
      !isDeepStrictEqual(
        summarySemantics(receipt?.dependencyBefore),
        summarySemantics(receipt?.dependencyAfter),
      )
    ) {
      issues.push("dependency-summary-semantic-drift");
    }
  } catch (error) {
    issues.push(
      `dependency-summary-invalid=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const payload = { ...receipt };
  delete payload.receiptAggregateSha256;
  if (
    typeof receipt?.receiptAggregateSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(receipt.receiptAggregateSha256) ||
    receipt.receiptAggregateSha256 !== sha256Text(canonicalJson(payload))
  ) {
    issues.push("receipt-aggregate-drift");
  }
  if (issues.length > 0) {
    throw new Error(
      `HK Visualization release source receipt is invalid: ${issues.join("; ")}.`,
    );
  }
  return Object.freeze({
    entryCount: receipt.before.entryCount,
    staticDeadlineSourceEvidence:
      validateHkVisualizationStaticDeadlineSourceReceipt(receipt, {
        expectedPathManifest: manifest,
        expectedWorkspace: manifest.sourceWorkspace ?? manifest.workspace,
      }),
    sourceAggregateSha256: receipt.before.sourceAggregateSha256,
    receiptAggregateSha256: receipt.receiptAggregateSha256,
  });
}

function fileSystemEntryExists(candidate) {
  try {
    lstatSync(candidate);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT")
      return false;
    throw error;
  }
}

function createExclusiveDurableReleaseFile(filePath, bytes, label) {
  const absolutePath = assertHkVisualizationStarshipPath(label, filePath);
  if (!Buffer.isBuffer(bytes)) {
    throw new Error(`${label} bytes must be a Buffer.`);
  }
  if (fileSystemEntryExists(absolutePath)) {
    throw new Error(`${label} refuses a pre-existing filesystem entry.`);
  }
  if (!Number.isInteger(fsConstants.O_NOFOLLOW)) {
    throw new Error(`${label} cannot be created fail-closed without O_NOFOLLOW.`);
  }
  const parent = dirname(absolutePath);
  const parentBefore = captureHkVisualizationPhysicalPathIdentity(
    `${label} parent`,
    parent,
  );
  const descriptor = openSync(
    absolutePath,
    fsConstants.O_RDWR |
      fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      fsConstants.O_NOFOLLOW,
    0o600,
  );
  let persistedIdentity;
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n) {
      throw new Error(`${label} exclusive create did not produce one regular file.`);
    }
    fchmodSync(descriptor, 0o600);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const persisted = fstatSync(descriptor, { bigint: true });
    if (
      !persisted.isFile() ||
      persisted.nlink !== 1n ||
      persisted.dev !== opened.dev ||
      persisted.ino !== opened.ino ||
      persisted.size !== BigInt(bytes.byteLength) ||
      Number(persisted.mode & 0o777n) !== 0o600
    ) {
      throw new Error(`${label} descriptor identity or persistence drifted.`);
    }
    persistedIdentity = {
      device: persisted.dev.toString(10),
      inode: persisted.ino.toString(10),
    };
  } finally {
    closeSync(descriptor);
  }
  const parentAfter = captureHkVisualizationPhysicalPathIdentity(
    `${label} parent`,
    parent,
  );
  if (!isDeepStrictEqual(parentAfter, parentBefore)) {
    throw new Error(`${label} parent physical identity changed during create.`);
  }
  const verified = readRegularFileSnapshot(absolutePath, label);
  const verifiedMetadata = lstatSync(absolutePath, { bigint: true });
  if (
    !verified.bytes.equals(bytes) ||
    verified.mode !== 0o600 ||
    verifiedMetadata.dev.toString(10) !== persistedIdentity.device ||
    verifiedMetadata.ino.toString(10) !== persistedIdentity.inode
  ) {
    throw new Error(`${label} failed its post-create byte or identity check.`);
  }
  return Object.freeze({
    device: persistedIdentity.device,
    inode: persistedIdentity.inode,
    mode: "0600",
    sha256: sha256Text(bytes),
    size: bytes.byteLength,
  });
}

function removeExactPrecreatedReleaseFile(filePath, identity, label) {
  if (!fileSystemEntryExists(filePath)) return "removed-by-workload";
  let drift = null;
  try {
    const snapshot = readRegularFileSnapshot(filePath, label);
    const metadata = lstatSync(filePath, { bigint: true });
    if (
      !identity ||
      snapshot.mode !== 0o600 ||
      metadata.dev.toString(10) !== identity.device ||
      metadata.ino.toString(10) !== identity.inode ||
      snapshot.bytes.byteLength !== identity.size ||
      sha256Text(snapshot.bytes) !== identity.sha256
    ) {
      drift = new Error(`${label} identity or bytes drifted before cleanup.`);
    }
  } catch (error) {
    drift = error;
  }
  rmSync(filePath, { force: true });
  if (fileSystemEntryExists(filePath)) {
    throw new Error(`${label} remained after exact cleanup.`);
  }
  if (drift) throw drift;
  return "removed-by-runner";
}

function readRegularFileSnapshot(candidate, label) {
  const absolutePath = assertHkVisualizationStarshipPath(label, candidate);
  const metadata = lstatSync(absolutePath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file: ${absolutePath}.`);
  }
  if (realpathSync(absolutePath) !== absolutePath) {
    throw new Error(`${label} real path drifted from ${absolutePath}.`);
  }
  if (realpathSync(dirname(absolutePath)) !== dirname(absolutePath)) {
    throw new Error(`${label} parent directory contains a symlink alias.`);
  }
  return Object.freeze({
    bytes: readFileSync(absolutePath),
    mode: metadata.mode & 0o777,
    path: absolutePath,
  });
}

function restoreRegularFileAtomically(snapshot, label) {
  const { bytes, mode, path: destination } = snapshot;
  let unsafePreimage = null;
  try {
    const current = lstatSync(destination);
    if (!current.isFile() || current.isSymbolicLink()) {
      unsafePreimage = `${label} was replaced by a non-regular or symlink entry`;
    }
  } catch (error) {
    if (!error || typeof error !== "object" || error.code !== "ENOENT") {
      throw error;
    }
  }
  if (realpathSync(dirname(destination)) !== dirname(destination)) {
    throw new Error(`${label} parent directory became a symlink alias.`);
  }
  const temporaryPath = join(
    dirname(destination),
    `.next-env.restore.${process.pid}.${Date.now()}.tmp`,
  );
  assertHkVisualizationStarshipPath(`${label} atomic temporary file`, temporaryPath);
  const descriptor = openSync(temporaryPath, "wx", 0o600);
  try {
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    chmodSync(temporaryPath, mode);
  } finally {
    closeSync(descriptor);
  }
  try {
    renameSync(temporaryPath, destination);
  } catch (error) {
    try {
      unlinkSync(temporaryPath);
    } catch {}
    throw error;
  }
  const restored = readRegularFileSnapshot(destination, label);
  if (!restored.bytes.equals(bytes)) {
    throw new Error(`${label} atomic restoration bytes drifted.`);
  }
  if (unsafePreimage) {
    throw new Error(`${unsafePreimage}; the safe atomic restoration completed.`);
  }
  return restored;
}

function shellAssignmentValues(command, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?:^|[\\s;&|])${escapedName}=(?:'([^']*)'|\"([^\"]*)\"|([^\\s;&|]+))`,
    "g",
  );
  return [...command.matchAll(pattern)].map(
    (match) => match[1] ?? match[2] ?? match[3] ?? "",
  );
}
function resolvedBrowserDeviceEvidence(project) {
  const use = project?.use;
  return {
    channel: use?.channel ?? null,
    defaultBrowserType: use?.defaultBrowserType ?? null,
    deviceScaleFactor: use?.deviceScaleFactor ?? null,
    hasTouch: use?.hasTouch ?? null,
    isMobile: use?.isMobile ?? null,
    screen: use?.screen ?? null,
    userAgent: use?.userAgent ?? null,
    viewport: use?.viewport ?? null,
  };
}

function runtimeTestIdentity(testCase, workspace) {
  const sourceFile =
    typeof testCase?.location?.file === "string"
      ? testCase.location.file
      : "";
  const absoluteFile = sourceFile
    ? resolve(workspace, sourceFile)
    : resolve(workspace, "missing-test-file");
  return Object.freeze({
    file: relative(workspace, absoluteFile).replaceAll("\\", "/"),
    id: typeof testCase?.id === "string" ? testCase.id : "",
    title: typeof testCase?.title === "string" ? testCase.title : "",
  });
}

export default class HkVisualizationRuntimeEvidenceReporter {
  onBegin(config, suite) {
    this.pathManifest = config.metadata?.hkVisualizationStarshipPathManifest;
    const pathIssues = validateHkVisualizationStarshipPathManifest(
      this.pathManifest,
    );
    if (pathIssues.length > 0) {
      throw new Error(
        `HK Visualization runtime reporter received an invalid Starship path manifest: ${pathIssues.join("; ")}.`,
      );
    }
    const project = config.projects.find(
      (candidate) =>
        candidate?.name === canonicalProject &&
        (candidate?.id === undefined || candidate.id === canonicalProject),
    );
    this.runtimeEvidenceDescription = JSON.stringify(
      resolvedBrowserDeviceEvidence(project),
    );
    const allTests = suite.allTests();
    this.plannedTests = allTests.map((testCase) =>
      runtimeTestIdentity(testCase, this.pathManifest.workspace),
    );
    this.samples = [];
    this.observationErrors = [];
    this.observedBrowserProfilePaths = new Set();
    this.sampledTestIds = new Set();
    const targetTests = allTests
      .filter(
        (testCase) =>
          testCase.title === runtimeEvidenceTitle &&
          typeof testCase.location?.file === "string" &&
          testCase.location.file
            .replaceAll("\\", "/")
            .endsWith(runtimeEvidenceFile),
      );
    if (targetTests.length > 1) {
      this.observationErrors.push(
        `runtime evidence target is ambiguous: ${targetTests.length} matches`,
      );
    }
    const targetTest = targetTests[0] ?? allTests.at(-1) ?? null;
    this.scope =
      targetTests.length === 1 &&
      allTests.length === HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT
        ? "canonical"
        : "focused";
    if (!targetTest) {
      this.observationErrors.push("runtime evidence target is missing");
      return;
    }
    this.runtimeEvidenceTargetId = targetTest.id;
    this.runtimeEvidenceTarget = runtimeTestIdentity(
      targetTest,
      this.pathManifest.workspace,
    );
    this.annotate(targetTest);
  }

  onTestEnd(testCase) {
    this.observeRuntimePaths(testCase);
    if (testCase.id === this.runtimeEvidenceTargetId) {
      this.annotate(testCase);
      this.annotateRuntimePathReceipt(testCase);
    }
  }

  onEnd() {
    let receipt;
    try {
      receipt = this.buildRuntimeProfileReceipt();
      writeFileSync(
        this.pathManifest.runtimeProfileReceiptPath,
        `${JSON.stringify(receipt, null, 2)}\n`,
        { flag: "w" },
      );
    } catch {
      return { status: "failed" };
    }
    if (receipt.observationErrors.length > 0) {
      return { status: "failed" };
    }
    return undefined;
  }

  annotate(testCase) {
    if (
      typeof this.runtimeEvidenceDescription !== "string" ||
      testCase.annotations.some(
        (annotation) => annotation?.type === runtimeEvidenceAnnotation,
      )
    ) {
      return;
    }
    testCase.annotations.push({
      description: this.runtimeEvidenceDescription,
      type: runtimeEvidenceAnnotation,
    });
  }

  observeRuntimePaths(testCase) {
    const identity = runtimeTestIdentity(
      testCase,
      this.pathManifest.workspace,
    );
    const rawProfilePaths = [];
    let validatedProfilePaths = [];
    let observationError = null;
    try {
      const activeProfiles = assertNoForeignActivePlaywrightProfiles(
        readHkVisualizationProfileProcessSample(),
      );
      rawProfilePaths.push(
        ...activeProfiles.filter((profilePath) =>
          pathIsInsideExactParent(
            profilePath,
            this.pathManifest.browserProfileParent,
          ),
        ),
      );
      if (rawProfilePaths.length > 0) {
        validatedProfilePaths = assertHkVisualizationBrowserProfilePaths(
          rawProfilePaths,
          this.pathManifest,
        );
      }
    } catch (error) {
      observationError = error instanceof Error ? error.message : String(error);
      this.observationErrors.push(
        `${identity.file}::${identity.title}: ${observationError}`,
      );
    }
    if (validatedProfilePaths.length === 0 && observationError === null) {
      observationError =
        "no managed Playwright browser profile was observable at test end";
      this.observationErrors.push(
        `${identity.file}::${identity.title}: ${observationError}`,
      );
    }
    if (!identity.id) {
      this.observationErrors.push(
        `${identity.file}::${identity.title}: missing Playwright test id`,
      );
    } else if (this.sampledTestIds.has(identity.id)) {
      this.observationErrors.push(`duplicate Playwright test id: ${identity.id}`);
    } else {
      this.sampledTestIds.add(identity.id);
    }
    for (const profilePath of validatedProfilePaths) {
      this.observedBrowserProfilePaths.add(profilePath);
    }
    this.samples.push(
      Object.freeze({
        ...identity,
        observationError,
        ordinal: this.samples.length,
        profilePaths: Object.freeze([...validatedProfilePaths]),
        rawProfilePaths: Object.freeze([...rawProfilePaths]),
      }),
    );
  }

  annotateRuntimePathReceipt(testCase) {
    if (
      testCase.annotations.some(
        (annotation) => annotation?.type === runtimePathEvidenceAnnotation,
      )
    ) {
      return;
    }
    const receipt = this.buildRuntimeProfileReceipt();
    const anchorSample = receipt.samples.find(
      (sample) => sample.id === receipt.target?.id,
    );
    testCase.annotations.push({
      description: JSON.stringify({
        actualBrowserProfilePaths: receipt.actualBrowserProfilePaths,
        anchorBrowserProfilePaths: anchorSample?.profilePaths ?? [],
        manifest: this.pathManifest,
        observationErrorCount: receipt.observationErrors.length,
        plannedTestCount: receipt.plannedTestCount,
        receiptContractVersion: receipt.contractVersion,
        runtimeProfileReceiptPath:
          this.pathManifest.runtimeProfileReceiptPath,
        sampledTestCount: receipt.sampledTestCount,
        scope: receipt.scope,
        target: receipt.target,
      }),
      type: runtimePathEvidenceAnnotation,
    });
  }

  buildRuntimeProfileReceipt() {
    const plannedTestIds = this.plannedTests.map((testCase) => testCase.id);
    const sampledTestIds = this.samples.map((sample) => sample.id);
    const receiptErrors = [...this.observationErrors];
    if (new Set(plannedTestIds).size !== plannedTestIds.length) {
      receiptErrors.push("planned Playwright test ids are not unique");
    }
    if (!isDeepStrictEqual(sampledTestIds, plannedTestIds)) {
      receiptErrors.push("sampled Playwright test ids do not match the planned order");
    }
    const actualBrowserProfilePaths = [
      ...this.observedBrowserProfilePaths,
    ].sort();
    if (actualBrowserProfilePaths.length === 0) {
      receiptErrors.push("no Playwright browser profile was observed");
    }
    const anchorSample = this.samples.find(
      (sample) => sample.id === this.runtimeEvidenceTargetId,
    );
    if (!anchorSample || anchorSample.profilePaths.length === 0) {
      receiptErrors.push("runtime evidence anchor observed no browser profile");
    }
    return Object.freeze({
      actualBrowserProfilePaths: Object.freeze(actualBrowserProfilePaths),
      contractVersion: HK_VISUALIZATION_RUNTIME_PROFILE_RECEIPT_VERSION,
      manifestHash: this.pathManifest.manifestHash,
      observationErrors: Object.freeze(receiptErrors),
      plannedTestCount: this.plannedTests.length,
      plannedTests: Object.freeze([...this.plannedTests]),
      receiptPath: this.pathManifest.runtimeProfileReceiptPath,
      runId: this.pathManifest.runId,
      sampledTestCount: this.samples.length,
      samples: Object.freeze([...this.samples]),
      scope: this.scope,
      target: this.runtimeEvidenceTarget ?? null,
    });
  }
}

export function readHkVisualizationProfileProcessSample(spawn = spawnSync) {
  return sampleHkVisualizationProfileProcesses({ spawn });
}

function profilePathsFromProcessSample(processSample) {
  if (
    !processSample ||
    typeof processSample !== "object" ||
    Array.isArray(processSample) ||
    processSample.schemaVersion !==
      HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_SCHEMA ||
    !isDeepStrictEqual(
      processSample.policy,
      HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY,
    ) ||
    processSample.status !== "complete" ||
    !Array.isArray(processSample.errors) ||
    processSample.errors.length !== 0 ||
    !Array.isArray(processSample.profilePaths) ||
    processSample.profilePaths.some((profilePath) =>
      typeof profilePath !== "string",
    ) ||
    new Set(processSample.profilePaths).size !== processSample.profilePaths.length
  ) {
    throw new Error(
      "HK Visualization active-profile sampler did not return complete, policy-bound, error-free evidence.",
    );
  }
  return Object.freeze([...processSample.profilePaths].sort());
}

function pathIsInsideExactParent(candidate, parent) {
  const candidateRelative = relative(resolve(parent), resolve(candidate));
  return (
    candidateRelative === "" ||
    (!isAbsolute(candidateRelative) &&
      candidateRelative !== ".." &&
      !candidateRelative.startsWith(`..${sep}`))
  );
}

export function assertNoForeignActivePlaywrightProfiles(processSample) {
  const profiles = profilePathsFromProcessSample(processSample).filter(
    (profile) => profile.includes("playwright_chromiumdev_profile-"),
  );
  const foreignProfiles = profiles.filter((profile) => {
    try {
      assertHkVisualizationStarshipPath("active Playwright profile", profile);
      return false;
    } catch {
      return true;
    }
  });
  if (foreignProfiles.length > 0) {
    throw new Error(
      "HK Visualization release acceptance found active Playwright browser profiles outside /Volumes/Starship: " +
        foreignProfiles.join(", ") +
        ". Stop or restart their owning E2E tasks with Starship-managed profiles before release.",
    );
  }
  return Object.freeze([...profiles]);
}

export function assertHkVisualizationPostflightProfileHygiene(
  processSample,
  { browserProfileParent } = {},
) {
  const profiles = assertNoForeignActivePlaywrightProfiles(processSample);
  const canonicalParent = assertHkVisualizationStarshipPath(
    "postflight browser profile parent",
    browserProfileParent,
  );
  const ownedProfiles = profiles.filter((profile) => {
    return pathIsInsideExactParent(profile, canonicalParent);
  });
  if (ownedProfiles.length > 0) {
    throw new Error(
      "HK Visualization release acceptance found browser profiles from this exact run still active after Playwright exited: " +
        ownedProfiles.join(", ") +
        ". The run must terminate its own browser/profile processes before it can pass.",
    );
  }
  return profiles;
}

export function assertCleanHkVisualizationReleaseEnvironment(
  environment = process.env,
) {
  const present = HK_VISUALIZATION_RELEASE_BLOCKED_ENV.filter((name) =>
    Object.prototype.hasOwnProperty.call(environment, name),
  );
  for (const name of Object.keys(environment)) {
    if (
      name.startsWith("PW_TEST_") ||
      name.startsWith("PWTEST_") ||
      name.startsWith("PLAYWRIGHT_") ||
      name.startsWith("NEXT_PUBLIC_")
    )
      present.push(name);
  }
  const uniquePresent = [...new Set(present)].sort();
  if (uniquePresent.length > 0) {
    throw new Error(
      "HK Visualization release acceptance rejects environment overrides that can narrow, redirect, reuse, or contaminate evidence: " +
        uniquePresent.join(", ") +
        ". Unset them and use the managed current-worktree runner.",
    );
  }
}

export function parseHkVisualizationReleaseRunnerArgs(argv) {
  const supported = new Set(["--dry-run", "--help"]);
  const unexpected = argv.filter((arg) => !supported.has(arg));
  if (unexpected.length > 0) {
    const fingerprints = unexpected.map(
      (value, index) => `arg[${index}](${safeValueFingerprint(value)})`,
    );
    throw new Error(
      `HK Visualization release runner accepts no Playwright filters or passthrough arguments; rejectedCount=${unexpected.length}; ${fingerprints.join(", ")}.`,
    );
  }
  if (argv.includes("--help")) return { dryRun: false, help: true };
  return { dryRun: argv.includes("--dry-run"), help: false };
}

function sanitizedHkVisualizationReleaseEnvironment(environment) {
  const safeKeys = [
    "USER",
    "LOGNAME",
    "SHELL",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "TERM",
    "TZ",
    "CI",
    "CODEX_CI",
    "NO_COLOR",
    "FORCE_COLOR",
    "MallocNanoZone",
    "__CF_USER_TEXT_ENCODING",
    "COMMAND_MODE",
    "XPC_FLAGS",
    "XPC_SERVICE_NAME",
  ];
  const safe = {};
  for (const key of safeKeys) {
    if (typeof environment[key] === "string") safe[key] = environment[key];
  }
  return { ...safe, PATH: fixedSafePath };
}

export function buildHkVisualizationReleasePlan({
  artifactWorkspace,
  cwd = defaultWorkspace,
  environment = process.env,
  now = new Date(),
  sourceWorkspace,
  toolchainWorkspace,
} = {}) {
  assertCleanHkVisualizationReleaseEnvironment(environment);
  const workspace = resolve(cwd);
  const toolchainRoot = resolve(toolchainWorkspace ?? workspace);
  const stamp = now
    .toISOString()
    .replace(/[^0-9A-Za-z]+/g, "-")
    .replace(/-+$/g, "");
  const runId = `hk-viz-release-${stamp}-${process.pid}`;
  const pathManifest = buildHkVisualizationStarshipPathManifest({
    artifactWorkspace,
    runId,
    sourceWorkspace,
    workspace,
  });
  const artifactRoot = pathManifest.artifactRoot;
  const jsonReport = pathManifest.jsonReport;
  const playwrightCli = join(
    toolchainRoot,
    "node_modules",
    "@playwright",
    "test",
    "cli.js",
  );
  const args = [
    "test",
    ...HK_VISUALIZATION_RELEASE_SPECS,
    `--project=${canonicalProject}`,
    "--workers=1",
    "--retries=0",
    "--forbid-only",
    "--fail-on-flaky-tests",
    "--max-failures=0",
    "--repeat-each=1",
    "--run-agents=none",
    "--update-snapshots=none",
    "--reporter=./tests/e2e/run-hk-visualization-release-gate.mjs,list,json",
  ];
  const childEnvironment = {
    ...sanitizedHkVisualizationReleaseEnvironment(environment),
    HOME: pathManifest.runtimeTmpDir,
    HK_MATH_STORAGE_PROVIDER: "sqlite",
    PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3020",
    PLAYWRIGHT_RUN_ID: runId,
    PLAYWRIGHT_SOURCE_WORKSPACE: pathManifest.sourceWorkspace,
    PLAYWRIGHT_ARTIFACT_WORKSPACE: pathManifest.artifactWorkspace,
    PLAYWRIGHT_BROWSER_CHANNEL: "chrome",
    PLAYWRIGHT_PORT: "3020",
    PLAYWRIGHT_E2E_ROOT: pathManifest.artifactRoot,
    PLAYWRIGHT_NEXT_DIST_DIR: pathManifest.nextDistDir,
    PLAYWRIGHT_NEXT_TSCONFIG_PATH: pathManifest.nextTsconfigPath,
    PLAYWRIGHT_OUTPUT_DIR: pathManifest.outputDir,
    PLAYWRIGHT_REPORT_DIR: pathManifest.reportDir,
    PLAYWRIGHT_JSON_OUTPUT_FILE: jsonReport,
    PLAYWRIGHT_RUNTIME_TMPDIR: pathManifest.runtimeTmpDir,
    PLAYWRIGHT_BROWSER_PROFILE_ROOT: pathManifest.browserProfileParent,
    PLAYWRIGHT_SERVICE_LOG_DIR: pathManifest.serviceLogDir,
    PLAYWRIGHT_SERVICE_PID_DIR: pathManifest.servicePidDir,
    PLAYWRIGHT_PATH_MANIFEST_FILE: pathManifest.pathManifestFile,
    HK_MATH_DB_PATH: pathManifest.databasePath,
    TMPDIR: pathManifest.runtimeTmpDir,
    TMP: pathManifest.runtimeTmpDir,
    TEMP: pathManifest.runtimeTmpDir,
    XDG_CACHE_HOME: pathManifest.xdgCacheDir,
    XDG_CONFIG_HOME: pathManifest.xdgConfigDir,
    XDG_STATE_HOME: pathManifest.xdgStateDir,
    CHROME_LOG_FILE: pathManifest.chromeLogPath,
    NODE_COMPILE_CACHE: pathManifest.nodeCompileCacheDir,
    NPM_CONFIG_CACHE: pathManifest.npmCacheDir,
    npm_config_cache: pathManifest.npmCacheDir,
    NPM_CONFIG_LOGS_DIR: pathManifest.npmLogsDir,
    npm_config_logs_dir: pathManifest.npmLogsDir,
    SQLITE_TMPDIR: pathManifest.sqliteTmpDir,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  return {
    args: [playwrightCli, ...args],
    artifactRoot,
    childEnvironment,
    command: process.execPath,
    cwd: workspace,
    jsonReport,
    pathManifest,
    project: canonicalProject,
    runId,
    sourceWorkspace: pathManifest.sourceWorkspace,
    specs: [...HK_VISUALIZATION_RELEASE_SPECS],
    sourceToolchainInputs: buildHkVisualizationReleaseToolchainInputs(
      pathManifest.sourceWorkspace,
    ),
    toolchainInputs: buildHkVisualizationReleaseToolchainInputs(toolchainRoot),
    nextTsconfigIdentity: null,
    nextTsconfigSha256: null,
  };
}

function buildHkVisualizationReleaseTsconfigBytes(plan) {
  if (plan.pathManifest.sourceWorkspace === plan.pathManifest.workspace) {
    return buildHkVisualizationCanonicalE2eTsconfigBytes({
      workspace: plan.cwd,
      nextDistDir: plan.pathManifest.nextDistDir,
    });
  }
  const config = buildHkVisualizationE2eTsconfig({
    exclude: readHkVisualizationCanonicalTsconfigExcludes({
      workspace: plan.cwd,
    }),
    nextDistDir: plan.pathManifest.nextDistDir,
    tsconfigPath: plan.pathManifest.nextTsconfigPath,
    workspace: plan.cwd,
  });
  return Buffer.from(`${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function globalProfileMonitorPaths(manifest) {
  return Object.freeze({
    manifestPath: manifest.pathManifestFile,
    pidPath: manifest.globalProfileMonitorPidPath,
    readyPath: manifest.globalProfileMonitorReadyPath,
    receiptPath: manifest.globalProfileMonitorReceiptPath,
    stopPath: manifest.globalProfileMonitorStopPath,
  });
}

function synchronousMonitorSleep(milliseconds) {
  Atomics.wait(
    synchronousMonitorWaitState,
    0,
    0,
    Math.max(1, milliseconds),
  );
}

function waitForGlobalProfileMonitorPath(
  artifactPath,
  { label, timeoutMs },
) {
  const deadline = Date.now() + timeoutMs;
  while (!fileSystemEntryExists(artifactPath)) {
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for HK Visualization global profile monitor ${label} at ${artifactPath}.`,
      );
    }
    synchronousMonitorSleep(
      Math.min(globalProfileMonitorPollMs, deadline - Date.now()),
    );
  }
}

export function classifyGlobalProfileMonitorProcessProbe(
  output,
  {
    childPid,
    expectedCommandPath = globalProfileMonitorPath,
    expectedExecutablePath = process.execPath,
    verifiedDirectChildDefunct = false,
  } = {},
) {
  const normalizedOutput = String(output ?? "").trim();
  const match = normalizedOutput.match(
    /^([A-Za-z][A-Za-z+<>]*)\s+(.+)$/s,
  );
  if (!match) {
    throw new Error(
      `Could not parse global profile monitor pid ${String(childPid)} state (${safeValueFingerprint(normalizedOutput)}).`,
    );
  }
  const [, state, command] = match;
  const exactSpawnPrefix = `${expectedExecutablePath} ${expectedCommandPath}`;
  const isExactSpawnCommand =
    command === exactSpawnPrefix || command.startsWith(`${exactSpawnPrefix} `);
  const isExactZombieCommand = command === `(${expectedCommandPath})`;
  const isVerifiedDefunctCommand =
    state[0].toUpperCase() === "Z" &&
    command === "<defunct>" &&
    verifiedDirectChildDefunct;
  if (
    !isExactSpawnCommand &&
    !isExactZombieCommand &&
    !isVerifiedDefunctCommand
  ) {
    throw new Error(
      `Global profile monitor pid ${String(childPid)} was reused by an unexpected command identity (${safeValueFingerprint(command)}).`,
    );
  }
  if (state[0].toUpperCase() === "Z") {
    return Object.freeze({
      commandSha256: sha256Text(command),
      exited: true,
      state,
    });
  }
  return Object.freeze({
    commandSha256: sha256Text(command),
    exited: false,
    state,
  });
}

function inspectGlobalProfileMonitorProcess(
  childPid,
  {
    childProcess,
    spawnProcessTable = spawnSync,
  } = {},
) {
  if (childProcess?.pid !== childPid) {
    throw new Error(
      `Global profile monitor direct-child identity is unavailable for pid ${String(childPid)}.`,
    );
  }
  const probe = spawnProcessTable(
    "/bin/ps",
    ["-p", String(childPid), "-o", "state=,command="],
    { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 5_000 },
  );
  if (probe?.error) {
    const errorCode =
      typeof probe.error === "object" &&
      probe.error !== null &&
      typeof probe.error.code === "string" &&
      /^[A-Za-z0-9_-]{1,64}$/.test(probe.error.code)
        ? probe.error.code
        : "UNKNOWN";
    throw new Error(
      `Could not verify global profile monitor pid ${childPid}: ps-error-code=${errorCode}.`,
    );
  }
  if (probe?.signal) {
    throw new Error(
      `Could not verify global profile monitor pid ${childPid}: ps terminated by ${probe.signal}.`,
    );
  }
  const output = String(probe?.stdout ?? "").trim();
  if (probe?.status === 1 && output === "") return null;
  if (probe?.status !== 0) {
    throw new Error(
      `Could not verify global profile monitor pid ${childPid}: ps exited ${String(probe?.status)}.`,
    );
  }
  return classifyGlobalProfileMonitorProcessProbe(output, {
    childPid,
    verifiedDirectChildDefunct:
      childProcess.exitCode === null && childProcess.signalCode === null,
  });
}

function waitForGlobalProfileMonitorExit(
  childPid,
  {
    childProcess,
    timeoutMs = globalProfileMonitorExitTimeoutMs,
  } = {},
) {
  if (childProcess?.pid !== childPid) {
    throw new Error(
      `Global profile monitor direct-child identity is unavailable for pid ${String(childPid)}.`,
    );
  }
  const deadline = Date.now() + timeoutMs;
  while (true) {
    if (
      Number.isInteger(childProcess.exitCode) ||
      typeof childProcess.signalCode === "string"
    ) {
      return;
    }
    const processState = inspectGlobalProfileMonitorProcess(childPid, {
      childProcess,
    });
    if (processState === null) return;
    if (processState.exited) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for global profile monitor pid ${childPid} to exit.`,
      );
    }
    synchronousMonitorSleep(
      Math.min(globalProfileMonitorPollMs, deadline - Date.now()),
    );
  }
}

export function terminateGlobalProfileMonitorChild(
  monitor,
  {
    signalMonitor = process.kill.bind(process),
    spawnProcessTable = spawnSync,
    waitForMonitorExit = waitForGlobalProfileMonitorExit,
  } = {},
) {
  if (
    !monitor ||
    !Number.isSafeInteger(monitor.childPid) ||
    monitor.childPid <= 1 ||
    monitor.childProcess?.pid !== monitor.childPid
  ) {
    throw new Error(
      "Global profile monitor cleanup requires an exact direct-child identity.",
    );
  }
  const sendExactSignal = (signal) => {
    const state = inspectGlobalProfileMonitorProcess(monitor.childPid, {
      childProcess: monitor.childProcess,
      spawnProcessTable,
    });
    if (state === null || state.exited) return false;
    try {
      signalMonitor(monitor.childPid, signal);
      return true;
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ESRCH") {
        return false;
      }
      throw error;
    }
  };
  if (!sendExactSignal("SIGTERM")) return;
  try {
    waitForMonitorExit(monitor.childPid, {
      childProcess: monitor.childProcess,
      timeoutMs: globalProfileMonitorTerminationGraceMs,
    });
    return;
  } catch (termError) {
    if (!sendExactSignal("SIGKILL")) return;
    try {
      waitForMonitorExit(monitor.childPid, {
        childProcess: monitor.childProcess,
        timeoutMs: globalProfileMonitorTerminationGraceMs,
      });
    } catch (killError) {
      throw new Error(
        `Could not terminate exact global profile monitor child ${monitor.childPid}: TERM=${termError instanceof Error ? termError.message : String(termError)}; KILL=${killError instanceof Error ? killError.message : String(killError)}.`,
        { cause: new AggregateError([termError, killError]) },
      );
    }
  }
}

function parseGlobalProfileMonitorJson(artifactPath, label) {
  try {
    return JSON.parse(readFileSync(artifactPath, "utf8"));
  } catch (error) {
    throw new Error(
      `HK Visualization global profile monitor ${label} is unreadable at ${artifactPath}: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
}

function assertGlobalProfileMonitorReadyEvidence(
  ready,
  { childPid, manifest },
) {
  const expectedKeys = [
    "schemaVersion",
    "runId",
    "manifestHash",
    "sourceHashes",
    "monitorPid",
    "firstSampleOrdinal",
    "firstSampleElapsedMs",
    "firstSampleErrors",
  ].sort();
  const actualKeys =
    ready && typeof ready === "object" && !Array.isArray(ready)
      ? Object.keys(ready).sort()
      : [];
  const issues = [];
  if (!isDeepStrictEqual(actualKeys, expectedKeys)) {
    issues.push(`keySet=${JSON.stringify(actualKeys)}`);
  }
  if (ready?.schemaVersion !== HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_SCHEMA) {
    issues.push(`schemaVersion=${String(ready?.schemaVersion)}`);
  }
  if (ready?.runId !== manifest.runId) {
    issues.push(`runId=${String(ready?.runId)}`);
  }
  if (ready?.manifestHash !== manifest.manifestHash) {
    issues.push(`manifestHash=${String(ready?.manifestHash)}`);
  }
  if (
    !isDeepStrictEqual(
      ready?.sourceHashes,
      hashHkVisualizationGlobalProfileMonitorSources(),
    )
  ) {
    issues.push("sourceHashes=drift");
  }
  if (ready?.monitorPid !== childPid) {
    issues.push(`monitorPid=${String(ready?.monitorPid)}`);
  }
  if (ready?.firstSampleOrdinal !== 0) {
    issues.push(`firstSampleOrdinal=${String(ready?.firstSampleOrdinal)}`);
  }
  if (
    typeof ready?.firstSampleElapsedMs !== "number" ||
    !Number.isFinite(ready.firstSampleElapsedMs) ||
    ready.firstSampleElapsedMs < 0
  ) {
    issues.push(
      `firstSampleElapsedMs=${String(ready?.firstSampleElapsedMs)}`,
    );
  }
  if (
    !Array.isArray(ready?.firstSampleErrors) ||
    ready.firstSampleErrors.length !== 0
  ) {
    issues.push(
      `firstSampleErrors=${JSON.stringify(ready?.firstSampleErrors)}`,
    );
  }
  if (issues.length > 0) {
    throw new Error(
      `HK Visualization global profile monitor ready evidence is invalid: ${issues.join("; ")}.`,
    );
  }
  return Object.freeze({
    firstSampleElapsedMs: ready.firstSampleElapsedMs,
    monitorPid: childPid,
  });
}

function launchGlobalProfileMonitor({
  plan,
  spawnMonitor,
}) {
  const manifest = plan.pathManifest;
  const paths = globalProfileMonitorPaths(manifest);
  mkdirSync(manifest.globalProfileMonitorDir, { recursive: true });
  mkdirSync(manifest.globalProfileMonitorTmpDir, { recursive: true });
  for (const [label, artifactPath] of [
    ["receipt", paths.receiptPath],
    ["ready", paths.readyPath],
    ["stop", paths.stopPath],
    ["pid", paths.pidPath],
    ["log", manifest.globalProfileMonitorLogPath],
  ]) {
    if (fileSystemEntryExists(artifactPath)) {
      throw new Error(
        `HK Visualization global profile monitor refuses stale ${label} artifact ${artifactPath}.`,
      );
    }
  }
  const logDescriptor = openSync(
    manifest.globalProfileMonitorLogPath,
    "wx",
    0o600,
  );
  let child;
  const lifecycle = {
    error: null,
    exitCode: null,
    signalCode: null,
  };
  try {
    child = spawnMonitor(
      process.execPath,
      [
        globalProfileMonitorPath,
        "--manifest",
        paths.manifestPath,
        "--receipt",
        paths.receiptPath,
        "--ready",
        paths.readyPath,
        "--stop",
        paths.stopPath,
        "--pid",
        paths.pidPath,
        "--interval-ms",
        String(globalProfileMonitorReleaseIntervalMs),
      ],
      {
        cwd: plan.cwd,
        env: {
          HOME: manifest.globalProfileMonitorTmpDir,
          LANG: "C",
          LC_ALL: "C",
          TMPDIR: manifest.globalProfileMonitorTmpDir,
          TMP: manifest.globalProfileMonitorTmpDir,
          TEMP: manifest.globalProfileMonitorTmpDir,
          NODE_COMPILE_CACHE: manifest.globalProfileMonitorTmpDir,
          NPM_CONFIG_CACHE: manifest.globalProfileMonitorTmpDir,
          npm_config_cache: manifest.globalProfileMonitorTmpDir,
          NPM_CONFIG_LOGS_DIR: manifest.globalProfileMonitorTmpDir,
          npm_config_logs_dir: manifest.globalProfileMonitorTmpDir,
          XDG_CACHE_HOME: manifest.globalProfileMonitorTmpDir,
          XDG_CONFIG_HOME: manifest.globalProfileMonitorTmpDir,
          XDG_STATE_HOME: manifest.globalProfileMonitorTmpDir,
          PLAYWRIGHT_PATH_MANIFEST_FILE: manifest.pathManifestFile,
          PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
        },
        stdio: ["ignore", logDescriptor, logDescriptor],
      },
    );
    if (child && typeof child.once === "function") {
      child.once("error", (error) => {
        lifecycle.error = error;
      });
      child.once("exit", (code, signal) => {
        lifecycle.exitCode = code;
        lifecycle.signalCode = signal;
      });
    }
  } finally {
    closeSync(logDescriptor);
  }
  if (!Number.isSafeInteger(child?.pid) || child.pid <= 0) {
    throw new Error(
      `HK Visualization global profile monitor did not expose a valid child pid; see ${manifest.globalProfileMonitorLogPath}.`,
    );
  }
  return Object.freeze({
    childProcess: child,
    childPid: child.pid,
    lifecycle,
    logPath: manifest.globalProfileMonitorLogPath,
    manifest,
    paths,
  });
}

function requireGlobalProfileMonitorReady({
  monitor,
  waitForMonitorPath,
}) {
  if (monitor.lifecycle?.error) {
    throw new Error(
      `HK Visualization global profile monitor launch failed: ${monitor.lifecycle.error instanceof Error ? monitor.lifecycle.error.message : String(monitor.lifecycle.error)}.`,
    );
  }
  waitForMonitorPath(monitor.paths.readyPath, {
    label: "ready evidence",
    timeoutMs: globalProfileMonitorReadyTimeoutMs,
  });
  if (monitor.lifecycle?.error) {
    throw new Error(
      `HK Visualization global profile monitor launch failed before readiness: ${monitor.lifecycle.error instanceof Error ? monitor.lifecycle.error.message : String(monitor.lifecycle.error)}.`,
    );
  }
  if (!fileSystemEntryExists(monitor.paths.pidPath)) {
    throw new Error(
      `HK Visualization global profile monitor ready evidence has no pid artifact at ${monitor.paths.pidPath}.`,
    );
  }
  const pidText = readFileSync(monitor.paths.pidPath, "utf8").trim();
  if (pidText !== String(monitor.childPid)) {
    throw new Error(
      `HK Visualization global profile monitor pid evidence drifted: expected ${monitor.childPid}, received ${JSON.stringify(pidText)}.`,
    );
  }
  const ready = parseGlobalProfileMonitorJson(
    monitor.paths.readyPath,
    "ready evidence",
  );
  return assertGlobalProfileMonitorReadyEvidence(ready, monitor);
}

function stopAndValidateGlobalProfileMonitor({
  monitor,
  terminateMonitor,
  waitForMonitorExit,
  waitForMonitorPath,
  writeMonitorStop,
}) {
  try {
    const receiptExistedBeforeRunnerStop = fileSystemEntryExists(
      monitor.paths.receiptPath,
    );
    if (!receiptExistedBeforeRunnerStop) {
      if (!fileSystemEntryExists(monitor.paths.stopPath)) {
        writeMonitorStop(monitor.paths.stopPath, "stop\n", {
          encoding: "utf8",
          flag: "wx",
          mode: 0o600,
        });
      }
      waitForMonitorPath(monitor.paths.receiptPath, {
        label: "final receipt",
        timeoutMs: globalProfileMonitorReceiptTimeoutMs,
      });
    }
    const receiptBytes = readFileSync(monitor.paths.receiptPath);
    const receipt = parseGlobalProfileMonitorJson(
      monitor.paths.receiptPath,
      "final receipt",
    );
    if (receipt?.monitorPid !== monitor.childPid) {
      throw new Error(
        `HK Visualization global profile monitor final receipt pid drifted: expected ${monitor.childPid}, received ${String(receipt?.monitorPid)}.`,
      );
    }
    waitForMonitorExit(monitor.childPid, {
      childProcess: monitor.childProcess,
      timeoutMs: globalProfileMonitorExitTimeoutMs,
    });
    const evidence = validateHkVisualizationGlobalProfileReceipt(receipt, {
      manifest: monitor.manifest,
      paths: monitor.paths,
    });
    if (receiptExistedBeforeRunnerStop) {
      throw new Error(
        `HK Visualization global profile monitor ended before the runner's final stop signal; premature receipt=${monitor.paths.receiptPath}.`,
      );
    }
    if (evidence.stopReason !== "stop-file") {
      throw new Error(
        `HK Visualization global profile monitor must end from the runner-owned stop file; received stopReason=${String(evidence.stopReason)}.`,
      );
    }
    if (
      receipt.intervalMs !== globalProfileMonitorReleaseIntervalMs ||
      evidence.maxGapMs > globalProfileMonitorReleaseMaxGapMs
    ) {
      throw new Error(
        `HK Visualization global profile monitor cadence drifted: interval=${String(receipt.intervalMs)}ms, maxGap=${String(evidence.maxGapMs)}ms; required interval=${globalProfileMonitorReleaseIntervalMs}ms and maxGap<=${globalProfileMonitorReleaseMaxGapMs}ms.`,
      );
    }
    return Object.freeze({
      evidence,
      receiptPath: monitor.paths.receiptPath,
      receiptSha256: sha256Text(receiptBytes),
    });
  } catch (error) {
    try {
      terminateMonitor(monitor, { waitForMonitorExit });
    } catch (cleanupError) {
      throw combineReleaseGateErrors(
        error,
        cleanupError,
        "global profile monitor exact-child cleanup failed",
      );
    }
    throw error;
  }
}

function combineReleaseGateErrors(primary, secondary, context) {
  if (!primary) return secondary;
  return new Error(
    `${primary instanceof Error ? primary.message : String(primary)}; ${context}: ${secondary instanceof Error ? secondary.message : String(secondary)}`,
    { cause: new AggregateError([primary, secondary]) },
  );
}

function captureReleaseSourceSnapshot(plan, captureSourceSnapshot) {
  const sourceWorkspace =
    plan.sourceWorkspace ?? plan.pathManifest.sourceWorkspace ?? plan.cwd;
  const snapshot = captureSourceSnapshot({
    toolchainInputs: plan.sourceToolchainInputs ?? plan.toolchainInputs,
    workspace: sourceWorkspace,
  });
  validateHkVisualizationReleaseSourceSnapshot(snapshot);
  validateHkVisualizationReleaseSourceSnapshotWorkspace(snapshot, {
    expectedPathManifest: plan.pathManifest,
    expectedWorkspace: sourceWorkspace,
  });
  assertRequiredReleaseSourcePaths(snapshot);
  return snapshot;
}

function requiredSourceFileSha256(snapshot, relativePath) {
  const entry = snapshot.entries.find(
    (candidate) =>
      candidate?.path === relativePath && candidate?.type === "file",
  );
  if (!entry || !/^[a-f0-9]{64}$/.test(String(entry.sha256 ?? ""))) {
    throw new Error(
      `HK Visualization release source snapshot lacks an exact SHA-256 for required path ${relativePath}.`,
    );
  }
  return entry.sha256;
}

function captureReleaseDependencyEvidence(
  plan,
  captureDependencyClosure,
  validateDependencyManifestArtifact,
  validateDependencySummary,
  {
    expectedImplementationSourceSha256,
    fullManifestArtifactPath,
  },
) {
  const evidence = captureDependencyClosure({
    expectedImplementationSourceSha256,
    fullManifestArtifactPath,
    workspace:
      plan.sourceWorkspace ?? plan.pathManifest.sourceWorkspace ?? plan.cwd,
  });
  if (
    !evidence ||
    typeof evidence !== "object" ||
    Array.isArray(evidence) ||
    !Buffer.isBuffer(evidence.fullManifestArtifactBytes) ||
    !evidence.fullManifestArtifact ||
    !evidence.manifest ||
    !evidence.summary
  ) {
    throw new Error(
      "HK Visualization dependency closure capture did not return manifest and summary evidence.",
    );
  }
  createExclusiveDurableReleaseFile(
    fullManifestArtifactPath,
    evidence.fullManifestArtifactBytes,
    "HK Visualization dependency full-manifest artifact",
  );
  const artifactBytes = readFileSync(fullManifestArtifactPath);
  if (!artifactBytes.equals(evidence.fullManifestArtifactBytes)) {
    throw new Error(
      "HK Visualization dependency full-manifest artifact bytes drifted after persistence.",
    );
  }
  const fullManifestArtifact =
    validateDependencyManifestArtifact(artifactBytes, {
      artifactPath: fullManifestArtifactPath,
      expectedImplementationSourceSha256,
    });
  if (!isDeepStrictEqual(fullManifestArtifact, evidence.fullManifestArtifact)) {
    throw new Error(
      "HK Visualization dependency full-manifest artifact identity drifted after persistence.",
    );
  }
  validateDependencySummary(evidence.summary, {
    expectedImplementationSourceSha256,
    fullManifestArtifact,
  });
  return Object.freeze({
    ...evidence,
    fullManifestArtifact,
    fullManifestArtifactPath,
    fullManifestArtifactSha256: sha256Text(artifactBytes),
  });
}

function writeAndValidateReleaseSourceReceipt({
  plan,
  artifactRootIdentity,
  managedToolchainIdentity,
  executionStage,
  releaseSourceExecution,
  sourceBefore,
  sourceAfter,
  dependencyBefore,
  dependencyAfter,
  compareDependencyClosures,
  validateDependencySummary,
}) {
  const sourceComparison =
    assertHkVisualizationReleaseSourceSnapshotUnchanged(
      sourceBefore,
      sourceAfter,
    );
  const dependencyComparison = compareDependencyClosures(
    dependencyBefore.manifest,
    dependencyAfter.manifest,
  );
  if (
    !dependencyComparison ||
    dependencyComparison.equal !== true ||
    !Array.isArray(dependencyComparison.issues) ||
    dependencyComparison.issues.length !== 0
  ) {
    throw new Error(
      `HK Visualization dependency closure changed: ${Array.isArray(dependencyComparison?.issues) ? dependencyComparison.issues.join(",") : "invalid-comparison"}.`,
    );
  }
  const payload = {
    schemaVersion: HK_VISUALIZATION_RELEASE_SOURCE_RECEIPT_SCHEMA,
    runId: plan.runId,
    manifestHash: plan.pathManifest.manifestHash,
    artifactRootIdentity,
    managedToolchainIdentity,
    executionStage,
    requiredSourcePaths: [...HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS],
    releaseSourceExecution,
    staticDeadlineSourceAggregateSha256:
      HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_AGGREGATE_SHA256,
    staticDeadlineSourceRows:
      HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS.map((row) => ({ ...row })),
    before: sourceBefore,
    after: sourceAfter,
    comparison: sourceComparison,
    dependencyBefore: dependencyBefore.summary,
    dependencyAfter: dependencyAfter.summary,
    dependencyComparison,
  };
  const receipt = {
    ...payload,
    receiptAggregateSha256: sha256Text(canonicalJson(payload)),
  };
  createExclusiveDurableReleaseFile(
    plan.pathManifest.releaseSourceReceiptPath,
    Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
    "HK Visualization release source receipt",
  );
  const receiptBytes = readFileSync(
    plan.pathManifest.releaseSourceReceiptPath,
  );
  const onDiskReceipt = JSON.parse(receiptBytes.toString("utf8"));
  const evidence = validateReleaseSourceReceipt(onDiskReceipt, {
    dependencyArtifacts: {
      before: dependencyBefore.fullManifestArtifact,
      after: dependencyAfter.fullManifestArtifact,
    },
    manifest: plan.pathManifest,
    validateDependencySummary,
  });
  return Object.freeze({
    dependencyFullManifestArtifacts: Object.freeze({
      after: Object.freeze({
        path: dependencyAfter.fullManifestArtifactPath,
        sha256: dependencyAfter.fullManifestArtifactSha256,
      }),
      before: Object.freeze({
        path: dependencyBefore.fullManifestArtifactPath,
        sha256: dependencyBefore.fullManifestArtifactSha256,
      }),
    }),
    evidence,
    receipt: onDiskReceipt,
    receiptBytes,
    receiptPath: plan.pathManifest.releaseSourceReceiptPath,
    receiptSha256: sha256Text(receiptBytes),
  });
}

export function executeHkVisualizationSupervisedWorkload({
  plan,
  spawnSupervisor = spawnSync,
} = {}) {
  if (!plan?.pathManifest) {
    throw new Error(
      "HK Visualization workload supervision requires an exact release plan.",
    );
  }
  if (!/^[a-f0-9]{64}$/.test(String(plan.nextTsconfigSha256 ?? ""))) {
    throw new Error(
      "HK Visualization workload supervision requires the exact precreated tsconfig SHA-256.",
    );
  }
  const manifestIssues = validateHkVisualizationStarshipPathManifest(
    plan.pathManifest,
  );
  if (manifestIssues.length > 0) {
    throw new Error(
      `HK Visualization workload supervision received an invalid path manifest: ${manifestIssues.join("; ")}.`,
    );
  }
  const manifest = plan.pathManifest;
  mkdirSync(manifest.workloadSupervisorDir, { recursive: true });
  mkdirSync(manifest.workloadSupervisorTmpDir, { recursive: true });
  const evidencePaths = [
    manifest.workloadSupervisorLockPath,
    manifest.workloadSupervisorLogPath,
    manifest.workloadSupervisorReceiptPath,
    manifest.workloadSupervisorReadyPath,
    manifest.workloadSupervisorStartPath,
    manifest.workloadSupervisorPidPath,
    manifest.workloadSupervisorLeaderPath,
    manifest.workloadSupervisorNextEnvSnapshotPath,
  ];
  const stalePaths = evidencePaths.filter((artifactPath) =>
    fileSystemEntryExists(artifactPath),
  );
  if (stalePaths.length > 0) {
    throw new Error(
      `HK Visualization workload supervisor refuses stale evidence: ${stalePaths.join(", ")}.`,
    );
  }
  writeFileSync(manifest.workloadSupervisorStartPath, "start\n", {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  const commandHash = hashHkVisualizationWorkloadCommand(
    plan.command,
    plan.args,
  );
  const deadlineEpochMs =
    Date.now() + HK_VISUALIZATION_RELEASE_WORKLOAD_TIMEOUT_MS;
  const sourceHashes = hashHkVisualizationWorkloadSupervisorSources();
  const supervisorArgs = [
    workloadSupervisorPath,
    "--manifest",
    manifest.pathManifestFile,
    "--receipt",
    manifest.workloadSupervisorReceiptPath,
    "--ready",
    manifest.workloadSupervisorReadyPath,
    "--start",
    manifest.workloadSupervisorStartPath,
    "--pid",
    manifest.workloadSupervisorPidPath,
    "--leader",
    manifest.workloadSupervisorLeaderPath,
    "--next-env-snapshot",
    manifest.workloadSupervisorNextEnvSnapshotPath,
    "--runner-pid",
    String(process.pid),
    "--command-hash",
    commandHash,
    "--next-tsconfig-sha256",
    plan.nextTsconfigSha256,
    "--deadline-epoch-ms",
    String(deadlineEpochMs),
    "--path-contract-source-hash",
    sourceHashes.pathContract,
    "--release-runner-source-hash",
    sourceHashes.releaseRunner,
    "--owned-process-ledger-source-hash",
    sourceHashes.ownedProcessLedger,
    "--supervisor-source-hash",
    sourceHashes.supervisor,
    "--",
    plan.command,
    ...plan.args,
  ];
  const supervisorLogDescriptor = openSync(
    manifest.workloadSupervisorLogPath,
    "wx",
    0o600,
  );
  let supervisorResult;
  try {
    supervisorResult = spawnSupervisor(process.execPath, supervisorArgs, {
      cwd: plan.cwd,
      env: plan.childEnvironment,
      killSignal: "SIGTERM",
      stdio: ["ignore", supervisorLogDescriptor, supervisorLogDescriptor],
      timeout:
        HK_VISUALIZATION_RELEASE_WORKLOAD_TIMEOUT_MS +
        HK_VISUALIZATION_SUPERVISOR_CLEANUP_GRACE_MS,
    });
  } finally {
    closeSync(supervisorLogDescriptor);
  }
  let receipt = null;
  let receiptBytes = null;
  let receiptError = null;
  try {
    receiptBytes = readFileSync(manifest.workloadSupervisorReceiptPath);
    receipt = JSON.parse(receiptBytes.toString("utf8"));
    const supervisorPid = Number(
      readFileSync(manifest.workloadSupervisorPidPath, "utf8").trim(),
    );
    const ready = JSON.parse(
      readFileSync(manifest.workloadSupervisorReadyPath, "utf8"),
    );
    const leader = fileSystemEntryExists(manifest.workloadSupervisorLeaderPath)
      ? JSON.parse(
          readFileSync(manifest.workloadSupervisorLeaderPath, "utf8"),
        )
      : null;
    const lockNonce = readFileSync(
      manifest.workloadSupervisorLockPath,
      "utf8",
    ).trim();
    validateHkVisualizationWorkloadSupervisorReceipt(receipt, {
      artifactEvidence: {
        pid: supervisorPid,
        ready,
        leader,
        lockNonceHash: sha256Text(lockNonce),
      },
      commandHash,
      expectedDeadlineEpochMs: deadlineEpochMs,
      expectedRunnerPid: process.pid,
      expectedNextTsconfigSha256: plan.nextTsconfigSha256,
      expectedSourceHashes: sourceHashes,
      manifest,
    });
    const postRunSourceHashes =
      hashHkVisualizationWorkloadSupervisorSources();
    if (!isDeepStrictEqual(postRunSourceHashes, sourceHashes)) {
      throw new Error(
        `workload supervisor source hashes changed during execution: before=${JSON.stringify(sourceHashes)}, after=${JSON.stringify(postRunSourceHashes)}`,
      );
    }
  } catch (error) {
    receiptError = error;
  }
  if (supervisorResult?.error) throw supervisorResult.error;
  if (supervisorResult?.signal) {
    throw new Error(
      `HK Visualization workload supervisor was terminated by signal ${supervisorResult.signal}.`,
    );
  }
  if (receiptError) {
    throw new Error(
      `HK Visualization workload supervisor did not preserve valid evidence at ${manifest.workloadSupervisorReceiptPath}: ${receiptError instanceof Error ? receiptError.message : String(receiptError)}.`,
      { cause: receiptError },
    );
  }
  if (supervisorResult?.status !== 0 || receipt?.status !== "complete") {
    throw new Error(
      `HK Visualization supervised workload failed: supervisorStatus=${String(supervisorResult?.status)}, receiptStatus=${String(receipt?.status)}, stopReason=${String(receipt?.stopReason)}, workloadExitCode=${String(receipt?.workloadExitCode)}, workloadSignal=${String(receipt?.workloadSignal)}.`,
    );
  }
  return Object.freeze({
    commandHash,
    deadlineEpochMs,
    receipt,
    receiptPath: manifest.workloadSupervisorReceiptPath,
    receiptSha256: sha256Text(receiptBytes),
    logPath: manifest.workloadSupervisorLogPath,
    logSha256: sha256Text(
      readFileSync(manifest.workloadSupervisorLogPath),
    ),
    status: 0,
    signal: null,
  });
}

function collectReportTests(suites, files, tests, inheritedFile = null) {
  for (const suite of suites ?? []) {
    const suiteFile =
      typeof suite.file === "string" && suite.file
        ? suite.file.replaceAll("\\", "/")
        : inheritedFile;
    if (suiteFile) files.add(suiteFile);
    for (const spec of suite.specs ?? []) {
      const specFile =
        typeof spec.file === "string" && spec.file
          ? spec.file.replaceAll("\\", "/")
          : suiteFile;
      if (specFile) files.add(specFile);
      const title = typeof spec.title === "string" ? spec.title : null;
      const id = typeof spec.id === "string" ? spec.id : null;
      for (const entry of spec.tests ?? [])
        tests.push({ entry, file: specFile, id, title });
    }
    collectReportTests(suite.suites, files, tests, suiteFile);
  }
}

function requireScrollHash(label, value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 hash.`);
  }
  return value;
}

function requireScrollNonNegativeInteger(label, value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function requireScrollNonEmptyString(label, value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function hashScrollCanonical(value) {
  return sha256Text(canonicalJson(value));
}

function validateDependentVisibleMathAncestryScaleSummary(label, raw) {
  if (
    !exactOrderedObjectKeys(raw, [
      "chainCount",
      "contractCount",
      "entryCount",
      "hash",
      "policyVersion",
      "scaleWitnessCount",
    ]) ||
    raw.policyVersion !==
      "visible-math-aggregate-ancestry-scale-summary.v1" ||
    !Number.isSafeInteger(raw.contractCount) ||
    raw.contractCount <= 0 ||
    raw.contractCount > 32 ||
    !Number.isSafeInteger(raw.chainCount) ||
    raw.chainCount < raw.contractCount ||
    !Number.isSafeInteger(raw.entryCount) ||
    raw.entryCount < raw.chainCount ||
    !Number.isSafeInteger(raw.scaleWitnessCount) ||
    raw.scaleWitnessCount !== raw.contractCount * 3
  ) {
    throw new Error(`${label} ancestry/scale summary schema or counts drifted.`);
  }
  requireScrollHash(`${label}.hash`, raw.hash);
}

function buildDependentVisibleMathProjectionEvidence({
  language,
  projections,
  sequenceId,
  sourceTopology,
  theme,
}) {
  const label =
    `dependent-transition ${sequenceId} visible-math ${language}/${theme}`;
  if (
    !Array.isArray(projections) ||
    projections.length !== 5 ||
    !sourceTopology
  ) {
    throw new Error(`${label} requires exact five source-bound projections.`);
  }
  const ancestryScaleSummaries = [];
  const elementCounts = [];
  const projectionHashes = [];
  projections.forEach((projection, projectionIndex) => {
    const projectionLabel = `${label}[${projectionIndex}]`;
    if (
      !exactOrderedObjectKeys(projection, [
        "ancestryScaleSummary",
        "elementCount",
        "hash",
      ]) ||
      !Number.isSafeInteger(projection.elementCount) ||
      projection.elementCount <= 0
    ) {
      throw new Error(`${projectionLabel} projection schema/count drifted.`);
    }
    validateDependentVisibleMathAncestryScaleSummary(
      `${projectionLabel}.ancestryScaleSummary`,
      projection.ancestryScaleSummary,
    );
    requireScrollHash(`${projectionLabel}.hash`, projection.hash);
    if (
      !isDeepStrictEqual(
        projection.ancestryScaleSummary,
        sourceTopology.ancestryScaleSummaries[projectionIndex],
      ) ||
      projection.elementCount !== sourceTopology.elementCounts[projectionIndex] ||
      projection.hash !== sourceTopology.projectionHashes[projectionIndex]
    ) {
      throw new Error(`${projectionLabel} projection differs from the exact source manifest.`);
    }
    ancestryScaleSummaries.push(projection.ancestryScaleSummary);
    elementCounts.push(projection.elementCount);
    projectionHashes.push(projection.hash);
  });
  const ancestryScaleSummariesHash = hashScrollCanonical({
    contractVersion: hkVisualizationDependentTransitionSchemaVersion,
    kind: "dependent-transition-visible-math-ancestry-scale-summaries",
    sequenceId,
    summaries: ancestryScaleSummaries,
  });
  const elementCountsHash = hashScrollCanonical({
    contractVersion: hkVisualizationDependentTransitionSchemaVersion,
    elementCounts,
    kind: "dependent-transition-visible-math-element-counts",
    sequenceId,
  });
  const projectionHashesHash = hashScrollCanonical({
    contractVersion: hkVisualizationDependentTransitionSchemaVersion,
    hashes: projectionHashes,
    kind: "dependent-transition-visible-math-projection-hashes",
    sequenceId,
  });
  const topologyHash = hashScrollCanonical({
    contractVersion: hkVisualizationDependentTransitionSchemaVersion,
    kind: "dependent-transition-visible-math-projection-topology",
    projections: projections.map((projection, projectionIndex) => ({
      ancestryScaleSummary: projection.ancestryScaleSummary,
      elementCount: projection.elementCount,
      hash: projection.hash,
      source:
        hkVisualizationDependentTransitionProjectionSources[projectionIndex],
    })),
    sequenceId,
  });
  const evidence = {
    ancestryScaleSummaries,
    ancestryScaleSummariesHash,
    elementCounts,
    elementCountsHash,
    projectionCount: projections.length,
    projectionHashes,
    projectionHashesHash,
    topologyHash,
    totalElementCount: elementCounts.reduce((sum, count) => sum + count, 0),
  };
  if (!isDeepStrictEqual(evidence, sourceTopology)) {
    throw new Error(`${label} independently recomputed topology drifted.`);
  }
  return evidence;
}

function validateDependentVisibleMathProjectionEvidence(
  raw,
  { language, sequenceId, sourceTopology, theme },
) {
  const label =
    `dependent-transition ${sequenceId} compact visible-math ${language}/${theme}`;
  if (
    !exactOrderedObjectKeys(raw, [
      "ancestryScaleSummaries",
      "ancestryScaleSummariesHash",
      "elementCounts",
      "elementCountsHash",
      "projectionCount",
      "projectionHashes",
      "projectionHashesHash",
      "topologyHash",
      "totalElementCount",
    ]) ||
    !Array.isArray(raw.ancestryScaleSummaries) ||
    !Array.isArray(raw.elementCounts) ||
    !Array.isArray(raw.projectionHashes) ||
    raw.projectionCount !== 5 ||
    raw.ancestryScaleSummaries.length !== 5 ||
    raw.elementCounts.length !== 5 ||
    raw.projectionHashes.length !== 5
  ) {
    throw new Error(`${label} evidence schema/cardinality drifted.`);
  }
  const recomputed = buildDependentVisibleMathProjectionEvidence({
    language,
    projections: raw.projectionHashes.map((hash, index) => ({
      ancestryScaleSummary: raw.ancestryScaleSummaries[index],
      elementCount: raw.elementCounts[index],
      hash,
    })),
    sequenceId,
    sourceTopology,
    theme,
  });
  if (!isDeepStrictEqual(raw, recomputed)) {
    throw new Error(`${label} evidence hash/summary drifted.`);
  }
  return recomputed;
}

function machinePackageIdentity(title) {
  const match = String(title).match(
    /^hk-viz-(P[1-6]|S[1-6])-(desktop|tablet|mobile)-(zh-Hans|zh|en)-(light|dark) exercises every selected HK lab$/,
  );
  if (!match) {
    throw new Error(`machine package title is not canonical: ${String(title)}.`);
  }
  return Object.freeze({
    grade: match[1],
    language: match[3],
    theme: match[4],
    viewport: match[2],
  });
}

function machinePackageId(packageTitle) {
  return String(packageTitle).replace(
    / exercises every selected HK lab$/,
    "",
  );
}

function parseBrowserDependentTransitionPackageResultAttachment(
  entry,
  packageTitle,
  scrollAggregate,
  committedResourceTotals,
) {
  const label = `${packageTitle} dependent-transition package-result attachment`;
  if (!Array.isArray(entry?.results) || entry.results.length !== 1) {
    throw new Error(`${label} requires exactly one test attempt.`);
  }
  const attachments = entry.results[0]?.attachments;
  if (!Array.isArray(attachments)) {
    throw new Error(`${label} list is missing.`);
  }
  const expectedName = `${machinePackageId(packageTitle)}.json`;
  const matches = attachments.filter(
    (attachment) => attachment?.name === expectedName,
  );
  if (attachments.length !== 1 || matches.length !== 1) {
    throw new Error(
      `${label} must be the unique exact-name ${expectedName}; observed total=${attachments.length}, exact=${matches.length}.`,
    );
  }
  const attachment = matches[0];
  if (
    !exactObjectKeys(attachment, ["body", "contentType", "name"]) ||
    attachment.contentType !== "application/json" ||
    typeof attachment.body !== "string" ||
    !attachment.body
  ) {
    throw new Error(
      `${label} must be one inline application/json body with no path or schema drift.`,
    );
  }
  const { bytes, envelope, prospectiveTotals } =
    decodeHkVisualizationDependentTransitionAttachmentWithinResourceBudget(
      attachment.body,
      committedResourceTotals,
    );
  if (
    bytes.length !== envelope.decodedBytes ||
    bytes.toString("base64") !== attachment.body
  ) {
    throw new Error(`${label} body is oversized or noncanonical base64.`);
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} body is not exact UTF-8.`);
  }
  let packageResult;
  try {
    packageResult = JSON.parse(text);
  } catch {
    throw new Error(`${label} body is unreadable JSON.`);
  }
  if (JSON.stringify(packageResult, null, 2) !== text) {
    throw new Error(
      `${label} body is not the canonical spec-emitted JSON byte form.`,
    );
  }
  if (
    !exactOrderedObjectKeys(packageResult, [
      "cells",
      "failures",
      "matrix",
      "package",
      "run",
      "schemaVersion",
      "status",
      "summary",
    ]) ||
    packageResult.schemaVersion !==
      hkVisualizationMachineAcceptanceSchemaVersion ||
    packageResult.status !== "passed" ||
    !Array.isArray(packageResult.failures) ||
    packageResult.failures.length !== 0 ||
    !Array.isArray(packageResult.cells)
  ) {
    throw new Error(`${label} package result header/schema is invalid.`);
  }
  const identity = machinePackageIdentity(packageTitle);
  const packageHeader = packageResult.package;
  if (
    !exactOrderedObjectKeys(packageHeader, [
      "duplicateCellIds",
      "executedCellIds",
      "expectedLabIds",
      "grade",
      "id",
      "language",
      "missingCellIds",
      "plannedCellIds",
      "theme",
      "viewportId",
    ]) ||
    packageHeader.id !== machinePackageId(packageTitle) ||
    packageHeader.grade !== identity.grade ||
    packageHeader.language !== identity.language ||
    packageHeader.theme !== identity.theme ||
    packageHeader.viewportId !== identity.viewport ||
    !isDeepStrictEqual(packageHeader.executedCellIds, scrollAggregate.cellIds) ||
    !isDeepStrictEqual(packageHeader.plannedCellIds, scrollAggregate.cellIds) ||
    !Array.isArray(packageHeader.duplicateCellIds) ||
    packageHeader.duplicateCellIds.length !== 0 ||
    !Array.isArray(packageHeader.missingCellIds) ||
    packageHeader.missingCellIds.length !== 0
  ) {
    throw new Error(`${label} package identity/cell ledger drifted.`);
  }
  if (packageResult.cells.length !== scrollAggregate.cells.length) {
    throw new Error(`${label} cell count differs from scroll evidence.`);
  }
  const cellKeys = [
    "actualFinalUrl",
    "cellId",
    "collisions",
    "contract",
    "controls",
    "deadlineMs",
    "dependentTransitionSequenceObservations",
    "diagnostics",
    "failures",
    "grade",
    "interactions",
    "labId",
    "language",
    "layout",
    "p6AveragesLineGraphObservations",
    "p6BudgetBoundaryObservations",
    "passThroughOracleObservations",
    "passThroughResetObservations",
    "qaProfile",
    "readyMs",
    "route",
    "routeKind",
    "scrollObservationPhasePlan",
    "scrollObservationSets",
    "stateScanLedger",
    "status",
    "templateId",
    "theme",
    "viewport",
  ];
  for (let cellIndex = 0; cellIndex < packageResult.cells.length; cellIndex += 1) {
    const cell = packageResult.cells[cellIndex];
    const expectedScrollCell = scrollAggregate.cells[cellIndex];
    const [grade, labId, viewport, language, theme] =
      expectedScrollCell.cellId.split("/");
    if (
      !exactObjectKeys(cell, cellKeys) ||
      cell.cellId !== expectedScrollCell.cellId ||
      cell.grade !== grade ||
      cell.labId !== labId ||
      cell.language !== language ||
      cell.theme !== theme ||
      cell.viewport?.id !== viewport ||
      cell.status !== "passed" ||
      !Array.isArray(cell.failures) ||
      cell.failures.length !== 0 ||
      !Array.isArray(cell.dependentTransitionSequenceObservations)
    ) {
      throw new Error(`${label} cell[${cellIndex}] schema/header drifted.`);
    }
  }
  return Object.freeze({
    attachmentName: expectedName,
    attachmentSha256: sha256Text(bytes),
    packageResult,
    prospectiveResourceTotals: prospectiveTotals,
    receipt: Object.freeze({
      attachmentName: expectedName,
      attachmentSha256: sha256Text(bytes),
    }),
  });
}

function requireDependentTransitionString(label, value, maximumBytes = 8_192) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    Buffer.byteLength(value, "utf8") > maximumBytes
  ) {
    throw new Error(`${label} requires a bounded nonblank string.`);
  }
  return value;
}

function requireDependentTransitionNumber(label, value) {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
    throw new Error(`${label} requires a finite number other than negative zero.`);
  }
  return value;
}

function validateDependentTransitionRect(label, value, { positiveSize = true } = {}) {
  if (!exactOrderedObjectKeys(value, ["height", "width", "x", "y"])) {
    throw new Error(`${label} geometry schema drifted.`);
  }
  for (const key of ["height", "width", "x", "y"]) {
    requireDependentTransitionNumber(`${label}.${key}`, value[key]);
  }
  if (positiveSize && (!(value.height > 0) || !(value.width > 0))) {
    throw new Error(`${label} geometry requires positive width and height.`);
  }
  return value;
}

function validateDependentTransitionSurface(label, surface, geometryPolicy) {
  if (
    !exactOrderedObjectKeys(surface, [
      "renderedSize",
      "scrollport",
      "tagName",
      "viewBox",
    ]) ||
    !exactOrderedObjectKeys(surface.renderedSize, ["height", "width"]) ||
    !exactOrderedObjectKeys(surface.scrollport, [
      "clientHeight",
      "clientWidth",
      "maxScrollLeft",
      "scrollHeight",
      "scrollWidth",
    ])
  ) {
    throw new Error(`${label} surface schema drifted.`);
  }
  if (surface.tagName !== "svg") {
    throw new Error(`${label} surface tagName must be svg.`);
  }
  for (const key of ["height", "width"]) {
    requireDependentTransitionNumber(
      `${label}.surface.renderedSize.${key}`,
      surface.renderedSize[key],
    );
  }
  for (const key of [
    "clientHeight",
    "clientWidth",
    "maxScrollLeft",
    "scrollHeight",
    "scrollWidth",
  ]) {
    requireDependentTransitionNumber(
      `${label}.surface.scrollport.${key}`,
      surface.scrollport[key],
    );
  }
  validateDependentTransitionRect(`${label}.surface.viewBox`, surface.viewBox);
  const { height, width } = surface.renderedSize;
  const pixelEpsilon = geometryPolicy.pixelEpsilon;
  const {
    clientHeight,
    clientWidth,
    maxScrollLeft,
    scrollHeight,
    scrollWidth,
  } = surface.scrollport;
  if (
    !(height > 0) ||
    !(width > 0) ||
    !(clientHeight > 0) ||
    !(clientWidth > 0) ||
    [clientHeight, clientWidth, maxScrollLeft, scrollHeight, scrollWidth]
      .some((value) => value < 0) ||
    scrollHeight + pixelEpsilon < clientHeight ||
    scrollWidth + pixelEpsilon < clientWidth ||
    Math.abs(maxScrollLeft - Math.max(0, scrollWidth - clientWidth)) >
      pixelEpsilon ||
    width > scrollWidth + pixelEpsilon ||
    height > scrollHeight + pixelEpsilon
  ) {
    throw new Error(`${label} surface geometry or scroll bounds drifted.`);
  }
  return surface;
}

function validateDependentTransitionDescriptor(label, descriptor) {
  if (
    !exactOrderedObjectKeys(descriptor, [
      "controlId",
      "enabled",
      "excludedValues",
      "maximum",
      "minimum",
      "step",
      "visibility",
      "domainId",
    ]) ||
    typeof descriptor.enabled !== "boolean" ||
    !Array.isArray(descriptor.excludedValues) ||
    (descriptor.domainId !== null && typeof descriptor.domainId !== "string")
  ) {
    throw new Error(`${label} controls descriptor schema drifted.`);
  }
  requireDependentTransitionString(`${label}.controlId`, descriptor.controlId, 256);
  requireDependentTransitionString(`${label}.visibility`, descriptor.visibility, 256);
  descriptor.excludedValues.forEach((value, index) =>
    requireDependentTransitionNumber(`${label}.excludedValues[${index}]`, value)
  );
  for (const key of ["maximum", "minimum", "step"]) {
    requireDependentTransitionNumber(`${label}.${key}`, descriptor[key]);
  }
  if (!(descriptor.step > 0) || descriptor.maximum < descriptor.minimum) {
    throw new Error(`${label} controls descriptor range drifted.`);
  }
  return descriptor;
}

function validateDependentTransitionControls(label, controls, authority) {
  if (!Array.isArray(controls)) {
    throw new Error(`${label} controls differ from source authority.`);
  }
  controls.forEach((control, index) => {
    if (!exactOrderedObjectKeys(control, ["controlId", "descriptor", "value"])) {
      throw new Error(`${label} controls schema drifted.`);
    }
    requireDependentTransitionString(`${label}.controls[${index}].controlId`, control.controlId, 256);
    validateDependentTransitionDescriptor(
      `${label}.controls[${index}].descriptor`,
      control.descriptor,
    );
    requireDependentTransitionNumber(`${label}.controls[${index}].value`, control.value);
  });
  if (!isDeepStrictEqual(controls, authority.controls)) {
    throw new Error(`${label} controls differ from source authority.`);
  }
  return controls;
}

function validateDependentTransitionPublicState(label, raw, authority) {
  if (
    typeof raw !== "string" ||
    !raw ||
    Buffer.byteLength(raw, "utf8") > 262_144
  ) {
    throw new Error(`${label} public state is not canonical bounded JSON.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} public state is not canonical JSON.`);
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    JSON.stringify(parsed) !== raw
  ) {
    throw new Error(`${label} public state is not canonical minified JSON.`);
  }
  try {
    canonicalJson(parsed);
  } catch {
    throw new Error(`${label} public state canonical number validation failed.`);
  }
  if (raw !== authority.rawSerializedPublicState) {
    throw new Error(`${label} public state differs from source authority canonical JSON.`);
  }
  return raw;
}

function validateDependentTransitionVisibleElements(
  label,
  visibleElements,
  authority,
  surface,
  geometryPolicy,
) {
  if (!Array.isArray(visibleElements) || visibleElements.length > 8) {
    throw new Error(`${label} visible elements differ from source authority.`);
  }
  const projected = visibleElements.map((element, index) => {
    const elementLabel = `${label} visible element[${index}]`;
    if (
      !exactOrderedObjectKeys(element, [
        "attributes",
        "learnerVisible",
        "paintedSubtree",
        "renderedGeometry",
        "tagName",
        "textHash",
        "userGeometry",
      ]) ||
      !Array.isArray(element.attributes) ||
      element.attributes.length > 16 ||
      typeof element.learnerVisible !== "boolean" ||
      !exactOrderedObjectKeys(element.paintedSubtree, ["elementCount", "hash"])
    ) {
      throw new Error(`${elementLabel} schema drifted.`);
    }
    let previousName = null;
    element.attributes.forEach((attribute, attributeIndex) => {
      if (
        !Array.isArray(attribute) ||
        attribute.length !== 2 ||
        typeof attribute[0] !== "string" ||
        typeof attribute[1] !== "string" ||
        Buffer.byteLength(attribute[0], "utf8") > 256 ||
        Buffer.byteLength(attribute[1], "utf8") > 256 ||
        (previousName !== null && previousName >= attribute[0])
      ) {
        throw new Error(`${elementLabel} schema attribute topology drifted.`);
      }
      previousName = attribute[0];
    });
    if (
      !Number.isSafeInteger(element.paintedSubtree.elementCount) ||
      element.paintedSubtree.elementCount < 1 ||
      element.paintedSubtree.elementCount > 320
    ) {
      throw new Error(`${elementLabel} schema painted subtree count drifted.`);
    }
    requireScrollHash(`${elementLabel}.paintedSubtree.hash`, element.paintedSubtree.hash);
    requireDependentTransitionString(`${elementLabel}.tagName`, element.tagName, 256);
    requireScrollHash(`${elementLabel}.textHash`, element.textHash);
    validateDependentTransitionRect(`${elementLabel}.renderedGeometry`, element.renderedGeometry);
    validateDependentTransitionRect(`${elementLabel}.userGeometry`, element.userGeometry);
    const contained = (inner, outer, epsilon) =>
      inner.x >= outer.x - epsilon &&
      inner.y >= outer.y - epsilon &&
      inner.x + inner.width <= outer.x + outer.width + epsilon &&
      inner.y + inner.height <= outer.y + outer.height + epsilon;
    const renderedSurface = {
      height: surface.renderedSize.height,
      width: surface.renderedSize.width,
      x: 0,
      y: 0,
    };
    const userEpsilon = Math.max(
      geometryPolicy.minimumUserEpsilon,
      geometryPolicy.pixelEpsilon * surface.viewBox.width /
        surface.renderedSize.width,
      geometryPolicy.pixelEpsilon * surface.viewBox.height /
        surface.renderedSize.height,
    );
    if (
      !contained(
        element.renderedGeometry,
        renderedSurface,
        geometryPolicy.pixelEpsilon,
      )
    ) {
      throw new Error(`${elementLabel} rendered geometry escaped its surface.`);
    }
    if (!contained(element.userGeometry, surface.viewBox, userEpsilon)) {
      throw new Error(`${elementLabel} user geometry escaped its viewBox.`);
    }
    return {
      attributes: element.attributes,
      learnerVisible: element.learnerVisible,
      paintedSubtree: element.paintedSubtree,
      tagName: element.tagName,
      textHash: element.textHash,
    };
  });
  if (!isDeepStrictEqual(projected, authority)) {
    throw new Error(`${label} visible elements differ from source authority.`);
  }
  return visibleElements;
}

function dependentTransitionCanonicalVisibleSnapshotsMatch(
  baseline,
  restoration,
  geometryPolicy,
) {
  const pixelEpsilon = geometryPolicy.pixelEpsilon;
  const userEpsilon = Math.max(
    geometryPolicy.minimumUserEpsilon,
    pixelEpsilon * baseline.surface.viewBox.width /
      baseline.surface.renderedSize.width,
    pixelEpsilon * baseline.surface.viewBox.height /
      baseline.surface.renderedSize.height,
  );
  const rectMatches = (left, right, tolerance) =>
    ["height", "width", "x", "y"].every(
      (key) => Math.abs(left[key] - right[key]) <= tolerance,
    );
  const surfaceMatches =
    baseline.surface.tagName === restoration.surface.tagName &&
    rectMatches(baseline.surface.viewBox, restoration.surface.viewBox, userEpsilon) &&
    Math.abs(
      baseline.surface.renderedSize.height -
        restoration.surface.renderedSize.height,
    ) <= pixelEpsilon &&
    Math.abs(
      baseline.surface.renderedSize.width -
        restoration.surface.renderedSize.width,
    ) <= pixelEpsilon &&
    [
      "clientHeight",
      "clientWidth",
      "maxScrollLeft",
      "scrollHeight",
      "scrollWidth",
    ].every(
      (key) => Math.abs(
        baseline.surface.scrollport[key] - restoration.surface.scrollport[key],
      ) <= pixelEpsilon,
    );
  const projectionMatches = isDeepStrictEqual(
    baseline.visibleMathProjection,
    restoration.visibleMathProjection,
  );
  const visibleElementsMatch =
    baseline.visibleElements.length === restoration.visibleElements.length &&
    baseline.visibleElements.every((left, index) => {
      const right = restoration.visibleElements[index];
      return Boolean(right) &&
        isDeepStrictEqual(left.attributes, right.attributes) &&
        left.learnerVisible === right.learnerVisible &&
        isDeepStrictEqual(left.paintedSubtree, right.paintedSubtree) &&
        left.tagName === right.tagName &&
        left.textHash === right.textHash &&
        rectMatches(left.renderedGeometry, right.renderedGeometry, pixelEpsilon) &&
        rectMatches(left.userGeometry, right.userGeometry, userEpsilon);
    });
  return { projectionMatches, surfaceMatches, visibleElementsMatch };
}

function validateDependentTransitionSourceStageAuthority(
  authority,
  { sequenceId, stageId },
) {
  const controlsHash = hashScrollCanonical({
    contractVersion: hkVisualizationDependentTransitionSchemaVersion,
    controls: authority.controls,
    kind: "dependent-transition-companion-controls",
    sequenceId,
    stageId,
  });
  const publicStateHash = hashScrollCanonical({
    contractVersion: hkVisualizationDependentTransitionSchemaVersion,
    kind: "dependent-transition-companion-public-state",
    rawSerializedPublicState: authority.rawSerializedPublicState,
    sequenceId,
    stageId,
  });
  const stateSignatureHash = hashScrollCanonical({
    contractVersion: hkVisualizationDependentTransitionSchemaVersion,
    kind: "dependent-transition-companion-state-signature",
    sequenceId,
    stageId,
    stateSignature: authority.stateSignature,
  });
  const visibleElementAuthoritiesHash = hashScrollCanonical({
    authorities: authority.visibleElementAuthorities,
    contractVersion: hkVisualizationDependentTransitionSchemaVersion,
    kind: "dependent-transition-companion-visible-elements",
    sequenceId,
    stageId,
  });
  if (
    authority.controlsHash !== controlsHash ||
    authority.publicStateHash !== publicStateHash ||
    authority.stateSignatureHash !== stateSignatureHash ||
    authority.visibleElementAuthoritiesHash !== visibleElementAuthoritiesHash
  ) {
    throw new Error(
      `dependent-transition ${sequenceId} source authority stage hash drifted.`,
    );
  }
}

function validateDependentTransitionSourceAuthority(sourcePlan) {
  const { companionAuthority: authority, sequenceId } = sourcePlan;
  if (!authority || !Array.isArray(authority.phases) || authority.phases.length !== 3) {
    throw new Error(`dependent-transition ${sequenceId} source authority schema drifted.`);
  }
  if (
    !exactOrderedObjectKeys(authority.geometryPolicy, [
      "minimumUserEpsilon",
      "pixelEpsilon",
      "policyHash",
      "version",
    ]) ||
    authority.geometryPolicy.minimumUserEpsilon !== 0.05 ||
    authority.geometryPolicy.pixelEpsilon !== 0.75 ||
    authority.geometryPolicy.version !==
      "hk-viz-dependent-transition-geometry-policy.v1" ||
    authority.geometryPolicy.policyHash !== hashScrollCanonical({
      contractVersion: hkVisualizationDependentTransitionSchemaVersion,
      kind: "dependent-transition-companion-geometry-policy",
      minimumUserEpsilon: authority.geometryPolicy.minimumUserEpsilon,
      pixelEpsilon: authority.geometryPolicy.pixelEpsilon,
      version: authority.geometryPolicy.version,
    })
  ) {
    throw new Error(`dependent-transition ${sequenceId} source geometry policy drifted.`);
  }
  authority.phases.forEach((phase, index) =>
    validateDependentTransitionSourceStageAuthority(phase, {
      sequenceId,
      stageId: `phase:${hkVisualizationDependentTransitionPhaseIds[index]}`,
    })
  );
  validateDependentTransitionSourceStageAuthority(authority.restoration, {
    sequenceId,
    stageId: "post-sequence-restoration",
  });
  if (
    authority.authorityHash !== hashScrollCanonical({
      contractVersion: hkVisualizationDependentTransitionSchemaVersion,
      geometryPolicy: authority.geometryPolicy,
      kind: "dependent-transition-companion-authority",
      phases: authority.phases,
      restoration: authority.restoration,
      sequenceId,
    })
  ) {
    throw new Error(`dependent-transition ${sequenceId} source authority hash drifted.`);
  }
  return authority;
}

function validateDependentTransitionCompanionPhase(
  phase,
  { authority, geometryPolicy, language, packageTitle, phaseId, sequenceId },
) {
  const label = `${packageTitle} dependent-transition companion ${sequenceId}:${phaseId}`;
  if (
    !exactOrderedObjectKeys(phase, [
      "controls",
      "id",
      "phase",
      "rawSerializedPublicState",
      "resetCountSincePreviousPhase",
      "stateSignature",
      "surface",
      "visibleElements",
      "visibleMathProjection",
    ]) ||
    phase.id !== `${sequenceId}:${phaseId}` ||
    phase.phase !== phaseId ||
    phase.resetCountSincePreviousPhase !==
      (phaseId === "pre" ? 1 : 0)
  ) {
    throw new Error(`${label} phase reset count or schema/header drifted.`);
  }
  validateDependentTransitionControls(label, phase.controls, authority);
  validateDependentTransitionPublicState(
    label,
    phase.rawSerializedPublicState,
    authority,
  );
  requireDependentTransitionString(`${label}.stateSignature`, phase.stateSignature);
  if (phase.stateSignature !== authority.stateSignature) {
    throw new Error(`${label} state signature differs from source authority.`);
  }
  validateDependentTransitionSurface(label, phase.surface, geometryPolicy);
  validateDependentTransitionVisibleElements(
    label,
    phase.visibleElements,
    authority.visibleElementAuthorities[language],
    phase.surface,
    geometryPolicy,
  );
}

function validateDependentTransitionCompanionSequence(
  observation,
  compactSequence,
  { cellId, labId, language, packageTitle, sequenceId, theme },
) {
  const label = `${packageTitle} dependent-transition companion ${cellId}/${sequenceId}`;
  if (
    !exactOrderedObjectKeys(observation, [
      "cellId",
      "canonicalVisibleBaseline",
      "domainId",
      "labId",
      "language",
      "modePreparation",
      "modeId",
      "observationHash",
      "phases",
      "planHash",
      "postSequenceRestoration",
      "schemaVersion",
      "sequenceId",
      "theme",
    ]) ||
    observation.cellId !== cellId ||
    observation.labId !== labId ||
    observation.language !== language ||
    observation.theme !== theme ||
    observation.sequenceId !== sequenceId ||
    observation.schemaVersion !==
      hkVisualizationDependentTransitionSchemaVersion
  ) {
    throw new Error(`${label} cellId/labId/language/sequence header drifted.`);
  }
  const sourcePlan =
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID[
      sequenceId
    ];
  if (
    !sourcePlan ||
    sourcePlan.labId !== labId ||
    observation.domainId !== sourcePlan.domainId ||
    observation.modeId !== sourcePlan.modeId ||
    !isDeepStrictEqual(
      observation.modePreparation,
      sourcePlan.modePreparation,
    ) ||
    observation.planHash !== sourcePlan.planHash
  ) {
    throw new Error(`${label} source plan planHash/header drifted.`);
  }
  const sourceAuthority =
    validateDependentTransitionSourceAuthority(sourcePlan);
  const baseline = observation.canonicalVisibleBaseline;
  if (
    !exactOrderedObjectKeys(baseline, [
      "baselineHash",
      "canonicalFingerprint",
      "cellId",
      "language",
      "planHash",
      "sequenceId",
      "surface",
      "theme",
      "visibleElements",
      "visibleMathProjection",
    ]) ||
    typeof baseline.canonicalFingerprint !== "string" ||
    !baseline.canonicalFingerprint.trim() ||
    baseline.cellId !== cellId ||
    baseline.language !== language ||
    baseline.theme !== theme ||
    baseline.planHash !== sourcePlan.planHash ||
    baseline.sequenceId !== sequenceId ||
    !baseline.surface ||
    typeof baseline.surface !== "object" ||
    !Array.isArray(baseline.visibleElements) ||
    !baseline.visibleMathProjection ||
    typeof baseline.visibleMathProjection !== "object"
  ) {
    throw new Error(`${label} canonical baseline header/schema drifted.`);
  }
  validateDependentTransitionSurface(
    `${label} canonical baseline`,
    baseline.surface,
    sourceAuthority.geometryPolicy,
  );
  validateDependentTransitionVisibleElements(
    `${label} canonical baseline`,
    baseline.visibleElements,
    sourceAuthority.restoration.visibleElementAuthorities[language],
    baseline.surface,
    sourceAuthority.geometryPolicy,
  );
  requireScrollHash(`${label}.baselineHash`, baseline.baselineHash);
  if (
    hashLedgerCompatibleObjectWithoutKey(baseline, "baselineHash") !==
    baseline.baselineHash
  ) {
    throw new Error(`${label} canonical baseline content hash drifted.`);
  }
  if (
    !Array.isArray(observation.phases) ||
    observation.phases.length !==
      hkVisualizationDependentTransitionPhaseIds.length
  ) {
    throw new Error(`${label} phase count drifted.`);
  }
  observation.phases.forEach((phase, phaseIndex) =>
    validateDependentTransitionCompanionPhase(phase, {
      authority: sourceAuthority.phases[phaseIndex],
      geometryPolicy: sourceAuthority.geometryPolicy,
      language,
      packageTitle,
      phaseId: hkVisualizationDependentTransitionPhaseIds[phaseIndex],
      sequenceId,
    }),
  );
  const restoration = observation.postSequenceRestoration;
  if (
    !exactOrderedObjectKeys(restoration, [
      "afterFingerprint",
      "beforeFingerprint",
      "canonicalFingerprint",
      "controls",
      "rawSerializedPublicState",
      "resetClickCount",
      "stateSignature",
      "canonicalVisibleBaselineHash",
      "surface",
      "visibleElements",
      "visibleMathProjection",
    ]) ||
    restoration.canonicalFingerprint !== baseline.canonicalFingerprint ||
    restoration.beforeFingerprint === baseline.canonicalFingerprint
  ) {
    throw new Error(`${label} restoration beforeFingerprint drifted.`);
  }
  if (restoration.afterFingerprint !== baseline.canonicalFingerprint) {
    throw new Error(`${label} restoration afterFingerprint drifted.`);
  }
  if (restoration.resetClickCount !== 1) {
    throw new Error(`${label} restoration resetClickCount drifted.`);
  }
  if (restoration.canonicalVisibleBaselineHash !== baseline.baselineHash) {
    throw new Error(
      `${label} restoration canonicalVisibleBaselineHash drifted.`,
    );
  }
  if (
    typeof restoration.beforeFingerprint !== "string" ||
    !restoration.beforeFingerprint.trim() ||
    typeof restoration.afterFingerprint !== "string" ||
    !restoration.afterFingerprint.trim() ||
    typeof restoration.canonicalFingerprint !== "string" ||
    !restoration.canonicalFingerprint.trim()
  ) {
    throw new Error(`${label} restoration schema drifted.`);
  }
  validateDependentTransitionControls(
    `${label} restoration`,
    restoration.controls,
    sourceAuthority.restoration,
  );
  validateDependentTransitionPublicState(
    `${label} restoration`,
    restoration.rawSerializedPublicState,
    sourceAuthority.restoration,
  );
  requireDependentTransitionString(
    `${label} restoration.stateSignature`,
    restoration.stateSignature,
  );
  if (restoration.stateSignature !== sourceAuthority.restoration.stateSignature) {
    throw new Error(`${label} restoration state signature differs from source authority.`);
  }
  validateDependentTransitionSurface(
    `${label} restoration`,
    restoration.surface,
    sourceAuthority.geometryPolicy,
  );
  validateDependentTransitionVisibleElements(
    `${label} restoration`,
    restoration.visibleElements,
    sourceAuthority.restoration.visibleElementAuthorities[language],
    restoration.surface,
    sourceAuthority.geometryPolicy,
  );
  const restorationMatches = dependentTransitionCanonicalVisibleSnapshotsMatch(
    baseline,
    restoration,
    sourceAuthority.geometryPolicy,
  );
  if (!restorationMatches.surfaceMatches) {
    throw new Error(`${label} restoration surface differs from canonical baseline.`);
  }
  if (!restorationMatches.visibleElementsMatch) {
    throw new Error(`${label} restoration visible geometry differs from canonical baseline.`);
  }
  if (!restorationMatches.projectionMatches) {
    throw new Error(`${label} restoration visible-math projection differs from baseline.`);
  }
  requireScrollHash(`${label}.observationHash`, observation.observationHash);
  if (
    hashLedgerCompatibleObjectWithoutKey(observation, "observationHash") !==
    observation.observationHash
  ) {
    throw new Error(`${label} observation content hash drifted.`);
  }
  const sourceTopology =
    sourcePlan.visibleMathProjectionTopologies?.[language]?.[theme];
  const visibleMathProjectionEvidence =
    buildDependentVisibleMathProjectionEvidence({
      language,
      projections: [
        baseline.visibleMathProjection,
        ...observation.phases.map(({ visibleMathProjection }) =>
          visibleMathProjection
        ),
        restoration.visibleMathProjection,
      ],
      sequenceId,
      sourceTopology,
      theme,
    });
  validateDependentVisibleMathProjectionEvidence(
    compactSequence.visibleMathProjectionEvidence,
    { language, sequenceId, sourceTopology, theme },
  );
  const expectedCompactSequence = {
    canonicalFingerprint: baseline.canonicalFingerprint,
    canonicalVisibleBaselineHash: baseline.baselineHash,
    cellId,
    labId,
    language,
    observationHash: observation.observationHash,
    phaseCount: observation.phases.length,
    phaseIds: observation.phases.map(({ phase }) => phase),
    phaseObservationHashes: observation.phases.map((phase) =>
      hashScrollCanonical({
        cellId,
        contractVersion:
          HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
        kind: "browser-dependent-transition-phase-observation",
        labId,
        language,
        phase,
        sequenceId,
      }),
    ),
    planHash: observation.planHash,
    postSequenceRestorationHash: hashScrollCanonical({
      cellId,
      contractVersion:
        HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
      kind: "browser-dependent-transition-restoration-observation",
      labId,
      language,
      restoration,
      sequenceId,
    }),
    projectionMatrixHash: sourcePlan.projectionMatrixHash,
    schemaVersion: observation.schemaVersion,
    sequenceId,
    theme,
    visibleMathProjectionEvidence,
  };
  const compactWithoutAggregateHash = Object.fromEntries(
    Object.entries(compactSequence).filter(
      ([key]) => key !== "sequenceAggregateHash",
    ),
  );
  if (!isDeepStrictEqual(compactWithoutAggregateHash, expectedCompactSequence)) {
    throw new Error(`${label} compact companion cross-binding drifted.`);
  }
}

function validateDependentTransitionPackageResultCompanion(
  packageResult,
  aggregate,
  packageTitle,
  scrollAggregate,
) {
  let affectedCellIndex = 0;
  for (let cellIndex = 0; cellIndex < scrollAggregate.cells.length; cellIndex += 1) {
    const scrollCell = scrollAggregate.cells[cellIndex];
    const packageCell = packageResult.cells[cellIndex];
    const [, labId, , language, theme] = scrollCell.cellId.split("/");
    const expectedSequenceIds =
      hkVisualizationDependentTransitionSequenceIdsByLab[labId] ?? [];
    const observations = packageCell.dependentTransitionSequenceObservations;
    if (
      observations.length !== expectedSequenceIds.length ||
      !isDeepStrictEqual(
        observations.map(({ sequenceId }) => sequenceId),
        expectedSequenceIds,
      )
    ) {
      throw new Error(
        `${packageTitle} dependent-transition companion observations are missing, duplicated, foreign, or reordered for ${scrollCell.cellId}.`,
      );
    }
    if (expectedSequenceIds.length === 0) continue;
    const aggregateCell = aggregate.cells[affectedCellIndex];
    if (aggregateCell?.cellId !== scrollCell.cellId) {
      throw new Error(
        `${packageTitle} dependent-transition companion affected cell order drifted.`,
      );
    }
    for (
      let sequenceIndex = 0;
      sequenceIndex < expectedSequenceIds.length;
      sequenceIndex += 1
    ) {
      validateDependentTransitionCompanionSequence(
        observations[sequenceIndex],
        aggregateCell.sequences[sequenceIndex],
        {
          cellId: scrollCell.cellId,
          labId,
          language,
          packageTitle,
          sequenceId: expectedSequenceIds[sequenceIndex],
          theme,
        },
      );
    }
    affectedCellIndex += 1;
  }
  if (affectedCellIndex !== aggregate.cells.length) {
    throw new Error(
      `${packageTitle} dependent-transition companion affected cell count drifted.`,
    );
  }
}

function validateBrowserScrollPackageAggregate(raw, packageTitle) {
  const aggregateKeys = [
    "aggregateHash",
    "auditedExecutionMs",
    "cellCount",
    "cellIds",
    "cells",
    "contractVersion",
    "phasePlanAggregateHash",
    "scrollContainerCount",
    "scrollObservationAggregateHash",
    "scrollObservationCount",
    "scrollObservationSetCount",
    "scrollPositionAuditCount",
  ];
  if (!exactObjectKeys(raw, aggregateKeys)) {
    throw new Error(
      `${packageTitle} scroll aggregate must contain exactly ${aggregateKeys.join(", ")}.`,
    );
  }
  if (
    raw.contractVersion !== HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION
  ) {
    throw new Error(
      `${packageTitle} scroll aggregate contractVersion=${String(raw.contractVersion)}.`,
    );
  }
  const identity = machinePackageIdentity(packageTitle);
  const cellCount = requireScrollNonNegativeInteger(
    `${packageTitle}.cellCount`,
    raw.cellCount,
  );
  if (cellCount < 1) {
    throw new Error(`${packageTitle} scroll aggregate contains no cells.`);
  }
  if (
    !Array.isArray(raw.cellIds) ||
    !Array.isArray(raw.cells) ||
    raw.cellIds.length !== cellCount ||
    raw.cells.length !== cellCount
  ) {
    throw new Error(
      `${packageTitle} cell arrays do not equal exact cellCount=${cellCount}.`,
    );
  }
  const duplicateCellIds = raw.cellIds.filter(
    (cellId, index) => raw.cellIds.indexOf(cellId) !== index,
  );
  if (duplicateCellIds.length > 0) {
    throw new Error(`${packageTitle} duplicated a cellId.`);
  }

  const phasePlans = [];
  let auditedExecutionMs = 0;
  let scrollContainerCount = 0;
  let scrollObservationCount = 0;
  let scrollObservationSetCount = 0;
  let scrollPositionAuditCount = 0;
  const cellKeys = [
    "auditedExecutionMs",
    "cellId",
    "observationSetHashes",
    "phasePlanHash",
    "phases",
    "receiptAggregateHash",
    "scheduleHashes",
    "scrollContainerCount",
    "scrollObservationCount",
    "scrollObservationSetCount",
    "scrollPositionAuditCount",
  ];
  for (let cellIndex = 0; cellIndex < raw.cells.length; cellIndex += 1) {
    const cell = raw.cells[cellIndex];
    if (!exactObjectKeys(cell, cellKeys)) {
      throw new Error(
        `${packageTitle} cell ${cellIndex} must contain exactly ${cellKeys.join(", ")}.`,
      );
    }
    const cellId = requireScrollNonEmptyString(
      `${packageTitle}.cells[${cellIndex}].cellId`,
      cell.cellId,
    );
    if (raw.cellIds[cellIndex] !== cellId) {
      throw new Error(
        `${packageTitle} cell IDs and summaries differ or are out of order at ${cellIndex}.`,
      );
    }
    const cellIdentity = cellId.split("/");
    if (
      cellIdentity.length !== 5 ||
      cellIdentity[0] !== identity.grade ||
      !cellIdentity[1] ||
      cellIdentity[2] !== identity.viewport ||
      cellIdentity[3] !== identity.language ||
      cellIdentity[4] !== identity.theme
    ) {
      throw new Error(
        `${packageTitle} contains mismatched cell identity ${cellId}.`,
      );
    }
    const setCount = requireScrollNonNegativeInteger(
      `${packageTitle}.${cellId}.scrollObservationSetCount`,
      cell.scrollObservationSetCount,
    );
    if (setCount < 1) {
      throw new Error(
        `${packageTitle}.${cellId} has no action/state/reset scroll observation set.`,
      );
    }
    if (
      !Array.isArray(cell.phases) ||
      !Array.isArray(cell.observationSetHashes) ||
      !Array.isArray(cell.scheduleHashes) ||
      cell.phases.length !== setCount ||
      cell.observationSetHashes.length !== setCount ||
      cell.scheduleHashes.length !== setCount
    ) {
      throw new Error(
        `${packageTitle}.${cellId} phase/hash arrays differ from exact set count ${setCount}.`,
      );
    }
    const phases = cell.phases.map((phase, phaseIndex) =>
      requireScrollNonEmptyString(
        `${packageTitle}.${cellId}.phases[${phaseIndex}]`,
        phase,
      ),
    );
    if (new Set(phases).size !== phases.length) {
      throw new Error(`${packageTitle}.${cellId} duplicated a planned phase.`);
    }
    cell.observationSetHashes.forEach((hash, index) =>
      requireScrollHash(
        `${packageTitle}.${cellId}.observationSetHashes[${index}]`,
        hash,
      ),
    );
    cell.scheduleHashes.forEach((hash, index) =>
      requireScrollHash(
        `${packageTitle}.${cellId}.scheduleHashes[${index}]`,
        hash,
      ),
    );
    requireScrollHash(
      `${packageTitle}.${cellId}.receiptAggregateHash`,
      cell.receiptAggregateHash,
    );
    const expectedPhasePlanHash = hashScrollCanonical({
      cellId,
      contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
      kind: "browser-scroll-phase-plan",
      phases,
    });
    if (cell.phasePlanHash !== expectedPhasePlanHash) {
      throw new Error(`${packageTitle}.${cellId} phasePlanHash drifted.`);
    }
    const cellContainerCount = requireScrollNonNegativeInteger(
      `${packageTitle}.${cellId}.scrollContainerCount`,
      cell.scrollContainerCount,
    );
    if (
      cellContainerCount >
      setCount * hkVisualizationScrollMaximumContainersPerSet
    ) {
      throw new Error(`${packageTitle}.${cellId} container count is unbounded.`);
    }
    const cellObservationCount = requireScrollNonNegativeInteger(
      `${packageTitle}.${cellId}.scrollObservationCount`,
      cell.scrollObservationCount,
    );
    if (
      cellObservationCount < setCount ||
      cellObservationCount >
        setCount * hkVisualizationScrollMaximumObservationsPerSet
    ) {
      throw new Error(
        `${packageTitle}.${cellId} observation count does not bind one through nine observations per set.`,
      );
    }
    const cellPositionAuditCount = requireScrollNonNegativeInteger(
      `${packageTitle}.${cellId}.scrollPositionAuditCount`,
      cell.scrollPositionAuditCount,
    );
    if (
      cellPositionAuditCount !==
      cellObservationCount * hkVisualizationScrollAuditsPerObservation
    ) {
      throw new Error(
        `${packageTitle}.${cellId} scrollPositionAuditCount is not six per observation.`,
      );
    }
    const cellAuditedExecutionMs = requireScrollNonNegativeInteger(
      `${packageTitle}.${cellId}.auditedExecutionMs`,
      cell.auditedExecutionMs,
    );
    if (
      cellAuditedExecutionMs !==
      setCount * hkVisualizationScrollDiscoveryMsPerSet +
        cellObservationCount * hkVisualizationScrollAuditsMsPerObservation
    ) {
      throw new Error(
        `${packageTitle}.${cellId} auditedExecutionMs does not derive from exact sets/observations.`,
      );
    }
    phasePlans.push({ cellId, phases });
    auditedExecutionMs += cellAuditedExecutionMs;
    scrollContainerCount += cellContainerCount;
    scrollObservationCount += cellObservationCount;
    scrollObservationSetCount += setCount;
    scrollPositionAuditCount += cellPositionAuditCount;
  }

  const expectedPhasePlanAggregateHash = hashScrollCanonical({
    cells: phasePlans,
    contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
    kind: "browser-scroll-phase-plans-by-cell",
  });
  if (raw.phasePlanAggregateHash !== expectedPhasePlanAggregateHash) {
    throw new Error(`${packageTitle} phasePlanAggregateHash drifted.`);
  }
  requireScrollHash(
    `${packageTitle}.scrollObservationAggregateHash`,
    raw.scrollObservationAggregateHash,
  );
  for (const [field, actual, expected] of [
    ["auditedExecutionMs", raw.auditedExecutionMs, auditedExecutionMs],
    ["scrollContainerCount", raw.scrollContainerCount, scrollContainerCount],
    ["scrollObservationCount", raw.scrollObservationCount, scrollObservationCount],
    ["scrollObservationSetCount", raw.scrollObservationSetCount, scrollObservationSetCount],
    ["scrollPositionAuditCount", raw.scrollPositionAuditCount, scrollPositionAuditCount],
  ]) {
    requireScrollNonNegativeInteger(`${packageTitle}.${field}`, actual);
    if (actual !== expected) {
      throw new Error(
        `${packageTitle}.${field}=${String(actual)} differs from exact nested total ${expected}.`,
      );
    }
  }
  requireScrollHash(`${packageTitle}.aggregateHash`, raw.aggregateHash);
  const evidenceWithoutHash = Object.fromEntries(
    Object.entries(raw).filter(([key]) => key !== "aggregateHash"),
  );
  const expectedAggregateHash = hashScrollCanonical({
    contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
    evidence: evidenceWithoutHash,
    kind: "browser-scroll-zero-failure-aggregate",
  });
  if (raw.aggregateHash !== expectedAggregateHash) {
    throw new Error(`${packageTitle}.aggregateHash drifted.`);
  }
  return raw;
}

export function validateHkVisualizationBrowserScrollAnnotations(
  serializedTests,
) {
  if (!Array.isArray(serializedTests)) {
    throw new Error("HK Visualization serialized tests must be an array.");
  }
  const expectedTitleSet = new Set(hkVisualizationMachinePackageTitles);
  const packageTests = serializedTests.filter(
    ({ file, title }) =>
      typeof file === "string" &&
      file.replaceAll("\\", "/").endsWith(
        "hk-visualization-machine-acceptance.spec.ts",
      ) &&
      expectedTitleSet.has(title),
  );
  if (packageTests.length !== hkVisualizationExpectedMachinePackageCount) {
    throw new Error(
      `HK Visualization scroll evidence package count ${packageTests.length} differs from exact ${hkVisualizationExpectedMachinePackageCount}.`,
    );
  }
  const actualTitles = packageTests.map(({ title }) => title);
  if (!isDeepStrictEqual(actualTitles, hkVisualizationMachinePackageTitles)) {
    throw new Error(
      "HK Visualization scroll evidence package titles are missing, duplicated, extra, or out of canonical order.",
    );
  }

  const aggregates = packageTests.map(({ entry, title }) => {
    const annotations = Array.isArray(entry?.annotations)
      ? entry.annotations.filter(
          (annotation) =>
            annotation?.type ===
            HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
        )
      : [];
    if (annotations.length !== 1) {
      throw new Error(
        `${title} must carry exactly one ${HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE} annotation; observed ${annotations.length}.`,
      );
    }
    const raw = parseHkVisualizationBoundedCanonicalAnnotationDescription(
      annotations[0],
      title,
      HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
    );
    return validateBrowserScrollPackageAggregate(raw, title);
  });

  const cellIds = aggregates.flatMap(({ cellIds: ids }) => ids);
  if (
    cellIds.length !== hkVisualizationExpectedMachineCellCount ||
    new Set(cellIds).size !== hkVisualizationExpectedMachineCellCount
  ) {
    throw new Error(
      `HK Visualization scroll evidence cells must be exact ${hkVisualizationExpectedMachineCellCount} unique ordered identities; observed total=${cellIds.length},unique=${new Set(cellIds).size}.`,
    );
  }
  const sum = (field) =>
    aggregates.reduce((total, aggregate) => total + aggregate[field], 0);
  const evidenceWithoutHash = {
    auditedExecutionMs: sum("auditedExecutionMs"),
    cellCount: cellIds.length,
    cellIds,
    contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_RUN_EVIDENCE_VERSION,
    packageAggregateHashes: aggregates.map(({ aggregateHash }) => aggregateHash),
    packageCount: aggregates.length,
    packageTitles: actualTitles,
    phasePlanAggregateHashes: aggregates.map(
      ({ phasePlanAggregateHash }) => phasePlanAggregateHash,
    ),
    scrollContainerCount: sum("scrollContainerCount"),
    scrollObservationAggregateHashes: aggregates.map(
      ({ scrollObservationAggregateHash }) => scrollObservationAggregateHash,
    ),
    scrollObservationCount: sum("scrollObservationCount"),
    scrollObservationSetCount: sum("scrollObservationSetCount"),
    scrollPositionAuditCount: sum("scrollPositionAuditCount"),
  };
  if (
    evidenceWithoutHash.scrollObservationSetCount <
      hkVisualizationExpectedMachineCellCount ||
    evidenceWithoutHash.scrollObservationCount <
      evidenceWithoutHash.scrollObservationSetCount ||
    evidenceWithoutHash.scrollPositionAuditCount !==
      evidenceWithoutHash.scrollObservationCount *
        hkVisualizationScrollAuditsPerObservation
  ) {
    throw new Error(
      "HK Visualization scroll run totals do not bind every cell/set/observation/six-audit execution.",
    );
  }
  return Object.freeze({
    ...evidenceWithoutHash,
    runAggregateHash: hashScrollCanonical({
      contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_RUN_EVIDENCE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-scroll-run-evidence",
    }),
  });
}

function validateBrowserDependentTransitionPackageAggregate(
  raw,
  packageTitle,
  scrollAggregate,
) {
  if (
    !exactObjectKeys(raw, [
      "aggregateHash",
      "cellCount",
      "cells",
      "contractVersion",
      "phaseObservationCount",
      "scrollPackageAggregateHash",
      "sequenceObservationCount",
      "topologyHash",
    ])
  ) {
    throw new Error(
      `${packageTitle} dependent-transition aggregate has schema drift.`,
    );
  }
  if (
    raw.contractVersion !==
    HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION
  ) {
    throw new Error(
      `${packageTitle} dependent-transition aggregate version drifted.`,
    );
  }
  requireScrollHash(
    `${packageTitle}.dependent.scrollPackageAggregateHash`,
    raw.scrollPackageAggregateHash,
  );
  if (raw.scrollPackageAggregateHash !== scrollAggregate.aggregateHash) {
    throw new Error(
      `${packageTitle} dependent-transition scroll package aggregate cross-binding drifted.`,
    );
  }
  if (!Array.isArray(raw.cells)) {
    throw new Error(`${packageTitle} dependent-transition cells must be an array.`);
  }
  const expectedScrollCells = scrollAggregate.cells.filter(({ cellId }) =>
    Object.hasOwn(
      hkVisualizationDependentTransitionSequenceIdsByLab,
      cellId.split("/")[1],
    ),
  );
  requireScrollNonNegativeInteger(
    `${packageTitle}.dependent.cellCount`,
    raw.cellCount,
  );
  if (
    raw.cellCount !== raw.cells.length ||
    raw.cells.length !== expectedScrollCells.length
  ) {
    throw new Error(
      `${packageTitle} dependent-transition cells differ from exact affected scroll cells.`,
    );
  }

  let phaseObservationCount = 0;
  let sequenceObservationCount = 0;
  for (let cellIndex = 0; cellIndex < raw.cells.length; cellIndex += 1) {
    const cell = raw.cells[cellIndex];
    const expectedScrollCell = expectedScrollCells[cellIndex];
    const label = `${packageTitle}.dependent.cells[${cellIndex}]`;
    if (
      !exactObjectKeys(cell, [
        "canonicalFingerprint",
        "cellAggregateHash",
        "cellId",
        "labId",
        "language",
        "phaseObservationCount",
        "sequenceCount",
        "sequenceIds",
        "sequenceObservationHashes",
        "sequences",
        "theme",
      ])
    ) {
      throw new Error(`${label} has schema drift.`);
    }
    if (cell.cellId !== expectedScrollCell?.cellId) {
      throw new Error(
        `${label} is missing, foreign, duplicated, or reordered against scroll evidence.`,
      );
    }
    const segments = String(cell.cellId).split("/");
    if (
      segments.length !== 5 ||
      segments.some((segment) => !segment.trim())
    ) {
      throw new Error(`${label}.cellId has invalid matrix shape.`);
    }
    const [grade, labId, , language, theme] = segments;
    if (
      cell.labId !== labId ||
      cell.language !== language ||
      cell.theme !== theme ||
      hkVisualizationDependentTransitionGradeByLabId[labId] !== grade ||
      !["en", "zh", "zh-Hans"].includes(language) ||
      !["dark", "light"].includes(theme)
    ) {
      throw new Error(`${label} grade/lab/language identity drifted.`);
    }
    if (
      typeof cell.canonicalFingerprint !== "string" ||
      !cell.canonicalFingerprint.trim()
    ) {
      throw new Error(`${label}.canonicalFingerprint must be nonblank.`);
    }
    if (
      !Array.isArray(cell.sequences) ||
      !Array.isArray(cell.sequenceIds) ||
      !Array.isArray(cell.sequenceObservationHashes)
    ) {
      throw new Error(`${label} sequence arrays are incomplete.`);
    }
    const expectedSequenceIds =
      hkVisualizationDependentTransitionSequenceIdsByLab[labId];
    requireScrollNonNegativeInteger(
      `${label}.sequenceCount`,
      cell.sequenceCount,
    );
    if (
      cell.sequenceCount !== cell.sequences.length ||
      !isDeepStrictEqual(cell.sequenceIds, expectedSequenceIds) ||
      !isDeepStrictEqual(
        cell.sequences.map(({ sequenceId }) => sequenceId),
        expectedSequenceIds,
      ) ||
      new Set(cell.sequenceIds).size !== cell.sequenceIds.length
    ) {
      throw new Error(
        `${label} sequence topology is missing, duplicated, foreign, or reordered.`,
      );
    }
    if (
      cell.sequenceObservationHashes.length !== cell.sequenceCount ||
      !isDeepStrictEqual(
        cell.sequenceObservationHashes,
        cell.sequences.map(({ observationHash }) => observationHash),
      )
    ) {
      throw new Error(`${label} sequence observation hash order drifted.`);
    }

    let cellPhaseObservationCount = 0;
    for (
      let sequenceIndex = 0;
      sequenceIndex < cell.sequences.length;
      sequenceIndex += 1
    ) {
      const sequence = cell.sequences[sequenceIndex];
      const sequenceLabel = `${label}.sequences[${sequenceIndex}]`;
      if (
        !exactObjectKeys(sequence, [
          "canonicalFingerprint",
          "canonicalVisibleBaselineHash",
          "cellId",
          "labId",
          "language",
          "observationHash",
          "phaseCount",
          "phaseIds",
          "phaseObservationHashes",
          "planHash",
          "postSequenceRestorationHash",
          "projectionMatrixHash",
          "schemaVersion",
          "sequenceAggregateHash",
          "sequenceId",
          "theme",
          "visibleMathProjectionEvidence",
        ])
      ) {
        throw new Error(`${sequenceLabel} has schema drift.`);
      }
      if (
        sequence.sequenceId !== expectedSequenceIds[sequenceIndex] ||
        sequence.schemaVersion !==
          hkVisualizationDependentTransitionSchemaVersion
      ) {
        throw new Error(
          `${label} sequence topology is missing, duplicated, foreign, or reordered.`,
        );
      }
      if (
        sequence.cellId !== cell.cellId ||
        sequence.labId !== cell.labId ||
        sequence.language !== cell.language ||
        sequence.theme !== cell.theme ||
        sequence.canonicalFingerprint !== cell.canonicalFingerprint
      ) {
        throw new Error(`${sequenceLabel} sequence header cross-binding drifted.`);
      }
      requireScrollNonNegativeInteger(
        `${sequenceLabel}.phaseCount`,
        sequence.phaseCount,
      );
      if (
        sequence.phaseCount !== 3 ||
        !isDeepStrictEqual(
          sequence.phaseIds,
          hkVisualizationDependentTransitionPhaseIds,
        ) ||
        !Array.isArray(sequence.phaseObservationHashes) ||
        sequence.phaseObservationHashes.length !== 3 ||
        new Set(sequence.phaseObservationHashes).size !== 3
      ) {
        throw new Error(
          `${sequenceLabel} phase topology must be exact pre, clamp, expand with three distinct hashes.`,
        );
      }
      for (const [hashLabel, hash] of [
        ["canonicalVisibleBaselineHash", sequence.canonicalVisibleBaselineHash],
        ["observationHash", sequence.observationHash],
        ["planHash", sequence.planHash],
        ["postSequenceRestorationHash", sequence.postSequenceRestorationHash],
        ["projectionMatrixHash", sequence.projectionMatrixHash],
        ["sequenceAggregateHash", sequence.sequenceAggregateHash],
        ...sequence.phaseObservationHashes.map((hash, phaseIndex) => [
          `phaseObservationHashes[${phaseIndex}]`,
          hash,
        ]),
      ]) {
        requireScrollHash(`${sequenceLabel}.${hashLabel}`, hash);
      }
      const sourcePlan =
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID[
          sequence.sequenceId
        ];
      if (
        !sourcePlan ||
        sourcePlan.labId !== cell.labId ||
        sourcePlan.schemaVersion !== sequence.schemaVersion ||
        sourcePlan.planHash !== sequence.planHash ||
        sourcePlan.projectionMatrixHash !== sequence.projectionMatrixHash
      ) {
        throw new Error(
          `${sequenceLabel} dependent-transition source plan planHash/matrix binding drifted.`,
        );
      }
      validateDependentVisibleMathProjectionEvidence(
        sequence.visibleMathProjectionEvidence,
        {
          language: cell.language,
          sequenceId: sequence.sequenceId,
          sourceTopology:
            sourcePlan.visibleMathProjectionTopologies[cell.language][cell.theme],
          theme: cell.theme,
        },
      );
      const sequenceEvidenceWithoutHash = Object.fromEntries(
        Object.entries(sequence).filter(
          ([key]) => key !== "sequenceAggregateHash",
        ),
      );
      if (
        sequence.sequenceAggregateHash !==
        hashScrollCanonical({
          contractVersion:
            HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
          evidence: sequenceEvidenceWithoutHash,
          kind: "browser-dependent-transition-sequence",
        })
      ) {
        throw new Error(`${sequenceLabel}.sequenceAggregateHash drifted.`);
      }
      cellPhaseObservationCount += sequence.phaseCount;
    }
    requireScrollNonNegativeInteger(
      `${label}.phaseObservationCount`,
      cell.phaseObservationCount,
    );
    if (cell.phaseObservationCount !== cellPhaseObservationCount) {
      throw new Error(`${label}.phaseObservationCount drifted.`);
    }
    requireScrollHash(`${label}.cellAggregateHash`, cell.cellAggregateHash);
    const cellEvidenceWithoutHash = Object.fromEntries(
      Object.entries(cell).filter(([key]) => key !== "cellAggregateHash"),
    );
    if (
      cell.cellAggregateHash !==
      hashScrollCanonical({
        contractVersion:
          HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
        evidence: cellEvidenceWithoutHash,
        kind: "browser-dependent-transition-cell",
      })
    ) {
      throw new Error(`${label}.cellAggregateHash drifted.`);
    }
    sequenceObservationCount += cell.sequenceCount;
    phaseObservationCount += cell.phaseObservationCount;
  }

  const expectedTopologyHash = hashScrollCanonical({
    cells: raw.cells.map(({ cellId, labId, language, sequences, theme }) => ({
      cellId,
      labId,
      language,
      sequences: sequences.map(({
        phaseIds,
        projectionMatrixHash,
        sequenceId,
        visibleMathProjectionEvidence,
      }) => ({
        phaseIds,
        projectionMatrixHash,
        sequenceId,
        visibleMathProjectionTopologyHash:
          visibleMathProjectionEvidence.topologyHash,
      })),
      theme,
    })),
    contractVersion:
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
    kind: "browser-dependent-transition-package-topology",
  });
  requireScrollHash(`${packageTitle}.dependent.topologyHash`, raw.topologyHash);
  if (raw.topologyHash !== expectedTopologyHash) {
    throw new Error(`${packageTitle} dependent-transition topologyHash drifted.`);
  }
  requireScrollNonNegativeInteger(
    `${packageTitle}.dependent.sequenceObservationCount`,
    raw.sequenceObservationCount,
  );
  requireScrollNonNegativeInteger(
    `${packageTitle}.dependent.phaseObservationCount`,
    raw.phaseObservationCount,
  );
  if (
    raw.sequenceObservationCount !== sequenceObservationCount ||
    raw.phaseObservationCount !== phaseObservationCount ||
    raw.phaseObservationCount !== raw.sequenceObservationCount * 3
  ) {
    throw new Error(
      `${packageTitle} dependent-transition nested observation totals drifted.`,
    );
  }
  requireScrollHash(
    `${packageTitle}.dependent.aggregateHash`,
    raw.aggregateHash,
  );
  const evidenceWithoutHash = Object.fromEntries(
    Object.entries(raw).filter(([key]) => key !== "aggregateHash"),
  );
  if (
    raw.aggregateHash !==
    hashScrollCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-dependent-transition-package",
    })
  ) {
    throw new Error(
      `${packageTitle} dependent-transition aggregateHash drifted.`,
    );
  }
  return raw;
}

function buildHkVisualizationDependentTransitionSourcePlanMappings() {
  return HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLANS.map(
    ({
      companionAuthority,
      labId,
      planHash,
      projectionMatrixHash,
      schemaVersion,
      sequenceId,
    }) => ({
      companionAuthorityHash: companionAuthority.authorityHash,
      geometryPolicyHash: companionAuthority.geometryPolicy.policyHash,
      geometryPolicyVersion: companionAuthority.geometryPolicy.version,
      labId,
      planHash,
      projectionMatrixHash,
      schemaVersion,
      sequenceId,
    }),
  );
}

export function validateHkVisualizationDependentTransitionSourcePlanMappingReceipt(
  receipt,
) {
  if (
    !exactOrderedObjectKeys(receipt, [
      "sourcePlanManifestVersion",
      "sourcePlanMappingHash",
      "sourcePlanMappings",
    ]) ||
    receipt.sourcePlanManifestVersion !==
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_MANIFEST_VERSION ||
    !Array.isArray(receipt.sourcePlanMappings) ||
    receipt.sourcePlanMappings.length !== 11
  ) {
    throw new Error(
      "HK Visualization dependent-transition source mapping receipt schema drifted.",
    );
  }
  requireScrollHash(
    "HK Visualization dependent-transition sourcePlanMappingHash",
    receipt.sourcePlanMappingHash,
  );
  const expectedMappings =
    buildHkVisualizationDependentTransitionSourcePlanMappings();
  receipt.sourcePlanMappings.forEach((mapping, index) => {
    if (
      !exactOrderedObjectKeys(mapping, [
        "companionAuthorityHash",
        "geometryPolicyHash",
        "geometryPolicyVersion",
        "labId",
        "planHash",
        "projectionMatrixHash",
        "schemaVersion",
        "sequenceId",
      ])
    ) {
      throw new Error(
        `HK Visualization dependent-transition source mapping[${index}] schema drifted.`,
      );
    }
    for (const key of [
      "companionAuthorityHash",
      "geometryPolicyHash",
      "planHash",
      "projectionMatrixHash",
    ]) {
      requireScrollHash(
        `HK Visualization dependent-transition source mapping[${index}].${key}`,
        mapping[key],
      );
    }
    for (const key of [
      "geometryPolicyVersion",
      "labId",
      "schemaVersion",
      "sequenceId",
    ]) {
      requireScrollNonEmptyString(
        `HK Visualization dependent-transition source mapping[${index}].${key}`,
        mapping[key],
      );
    }
    const expected = expectedMappings[index];
    if (mapping.companionAuthorityHash !== expected?.companionAuthorityHash) {
      throw new Error(
        `HK Visualization dependent-transition source mapping[${index}] companion authority drifted.`,
      );
    }
    if (
      mapping.geometryPolicyHash !== expected.geometryPolicyHash ||
      mapping.geometryPolicyVersion !== expected.geometryPolicyVersion
    ) {
      throw new Error(
        `HK Visualization dependent-transition source mapping[${index}] geometry policy drifted.`,
      );
    }
    if (!isDeepStrictEqual(mapping, expected)) {
      throw new Error(
        `HK Visualization dependent-transition source mapping[${index}] source tuple drifted.`,
      );
    }
  });
  const expectedMappingHash = hashScrollCanonical({
    contractVersion:
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
    kind: "browser-dependent-transition-source-plan-mapping",
    manifestVersion: receipt.sourcePlanManifestVersion,
    sourcePlanMappings: receipt.sourcePlanMappings,
  });
  if (receipt.sourcePlanMappingHash !== expectedMappingHash) {
    throw new Error(
      "HK Visualization dependent-transition source mapping hash drifted.",
    );
  }
  return receipt;
}

export function validateHkVisualizationBrowserDependentTransitionAnnotations(
  serializedTests,
) {
  if (!Array.isArray(serializedTests)) {
    throw new Error("HK Visualization serialized tests must be an array.");
  }
  const expectedTitleSet = new Set(hkVisualizationMachinePackageTitles);
  const packageTests = serializedTests.filter(
    ({ file, title }) =>
      typeof file === "string" &&
      file.replaceAll("\\", "/").endsWith(
        "hk-visualization-machine-acceptance.spec.ts",
      ) &&
      expectedTitleSet.has(title),
  );
  if (
    packageTests.length !== hkVisualizationExpectedMachinePackageCount ||
    !isDeepStrictEqual(
      packageTests.map(({ title }) => title),
      hkVisualizationMachinePackageTitles,
    )
  ) {
    throw new Error(
      "HK Visualization dependent-transition packages are missing, duplicated, extra, or out of canonical order.",
    );
  }

  const aggregates = [];
  const scrollAggregates = [];
  const sourceAttachments = [];
  const attachmentResourceTotals = {
    attachmentCount: 0,
    decodedBytes: 0,
    encodedBytes: 0,
  };
  for (const { entry, title } of packageTests) {
    const annotations = Array.isArray(entry?.annotations)
      ? entry.annotations
      : [];
    const parseExact = (type, validator) => {
      const matches = annotations.filter(
        (annotation) => annotation?.type === type,
      );
      if (matches.length !== 1) {
        throw new Error(
          `${title} must carry exactly one ${type} annotation; observed ${matches.length}.`,
        );
      }
      const description = matches[0].description;
      if (typeof description !== "string") {
        throw new Error(
          `${title} ${type} annotation description must be a string.`,
        );
      }
      if (
        Buffer.byteLength(description, "utf8") >
        HK_VISUALIZATION_DEPENDENT_TRANSITION_ANNOTATION_MAX_UTF8_BYTES
      ) {
        throw new Error(
          `${title} ${type} annotation exceeded the UTF-8 byte limit.`,
        );
      }
      let parsed;
      try {
        parsed = JSON.parse(description);
      } catch {
        throw new Error(`${title} ${type} annotation is unreadable JSON.`);
      }
      if (JSON.stringify(parsed) !== description) {
        throw new Error(
          `${title} ${type} annotation must use canonical minified JSON bytes.`,
        );
      }
      return validator(parsed);
    };
    const scrollAggregate = parseExact(
      HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
      (parsed) => validateBrowserScrollPackageAggregate(parsed, title),
    );
    scrollAggregates.push(scrollAggregate);
    const aggregate = parseExact(
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_ANNOTATION_TYPE,
      (parsed) =>
        validateBrowserDependentTransitionPackageAggregate(
          parsed,
          title,
          scrollAggregate,
        ),
    );
    const sourceAttachment =
      parseBrowserDependentTransitionPackageResultAttachment(
        entry,
        title,
        scrollAggregate,
        attachmentResourceTotals,
      );
    validateDependentTransitionPackageResultCompanion(
      sourceAttachment.packageResult,
      aggregate,
      title,
      scrollAggregate,
    );
    Object.assign(
      attachmentResourceTotals,
      sourceAttachment.prospectiveResourceTotals,
    );
    aggregates.push(aggregate);
    sourceAttachments.push(sourceAttachment.receipt);
  }

  if (
    attachmentResourceTotals.attachmentCount !==
    HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS.packageCount
  ) {
    throw new Error(
      "HK Visualization dependent-transition attachment count drifted from exact 216.",
    );
  }

  const cells = aggregates.flatMap(({ cells }) => cells);
  const actualCellIds = cells.map(({ cellId }) => cellId);
  const sortedCellIds = [...actualCellIds].sort();
  if (
    cells.length !==
      HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_CELL_COUNT ||
    new Set(actualCellIds).size !== actualCellIds.length ||
    !isDeepStrictEqual(
      sortedCellIds,
      hkVisualizationExpectedDependentTransitionCellIds,
    )
  ) {
    throw new Error(
      "HK Visualization dependent-transition cells differ from the exact unique 7 x grade/viewport/language/theme matrix.",
    );
  }
  const labCellCounts = Object.fromEntries(
    Object.keys(hkVisualizationDependentTransitionSequenceIdsByLab).map(
      (labId) => [labId, 0],
    ),
  );
  for (const cell of cells) labCellCounts[cell.labId] += 1;
  if (Object.values(labCellCounts).some((count) => count !== 18)) {
    throw new Error(
      `HK Visualization each dependent-transition lab must have exact 18 cells: ${JSON.stringify(labCellCounts)}.`,
    );
  }
  const sequenceObservationCount = aggregates.reduce(
    (total, aggregate) => total + aggregate.sequenceObservationCount,
    0,
  );
  const phaseObservationCount = aggregates.reduce(
    (total, aggregate) => total + aggregate.phaseObservationCount,
    0,
  );
  if (
    sequenceObservationCount !==
      HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_SEQUENCE_OBSERVATION_COUNT ||
    phaseObservationCount !==
      HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_PHASE_OBSERVATION_COUNT ||
    phaseObservationCount !== sequenceObservationCount * 3
  ) {
    throw new Error(
      `HK Visualization dependent-transition totals must be exact 198 sequences/594 phases; observed ${sequenceObservationCount}/${phaseObservationCount}.`,
    );
  }
  const topologyAggregateHash = hashScrollCanonical({
    contractVersion:
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
    kind: "browser-dependent-transition-run-topology",
    packages: aggregates.map(({ aggregateHash, topologyHash }, index) => ({
      aggregateHash,
      packageTitle: packageTests[index].title,
      topologyHash,
    })),
  });
  const packageSourceBindingHashes = aggregates.map(
    ({ aggregateHash }, index) =>
      hashScrollCanonical({
        aggregateHash,
        attachmentName: sourceAttachments[index].attachmentName,
        attachmentSha256: sourceAttachments[index].attachmentSha256,
        contractVersion:
          HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
        kind: "browser-dependent-transition-package-source-binding",
        packageTitle: packageTests[index].title,
        scrollPackageAggregateHash: scrollAggregates[index].aggregateHash,
      }),
  );
  const sourcePackageResultAttachmentNames = sourceAttachments.map(
    ({ attachmentName }) => attachmentName,
  );
  const sourcePackageResultAttachmentSha256s = sourceAttachments.map(
    ({ attachmentSha256 }) => attachmentSha256,
  );
  const sourcePackageResultAttachmentAggregateHash = hashScrollCanonical({
    attachments: sourceAttachments.map(
      ({ attachmentName, attachmentSha256 }, index) => ({
        attachmentName,
        attachmentSha256,
        packageTitle: packageTests[index].title,
      }),
    ),
    contractVersion:
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
    kind: "browser-dependent-transition-source-package-results",
  });
  const sourcePlanMappings =
    buildHkVisualizationDependentTransitionSourcePlanMappings();
  if (
    sourcePlanMappings.length !== 11 ||
    new Set(sourcePlanMappings.map(({ sequenceId }) => sequenceId)).size !== 11 ||
    sourcePlanMappings.some(
      ({ schemaVersion }) =>
        schemaVersion !== hkVisualizationDependentTransitionSchemaVersion,
    )
  ) {
    throw new Error(
      "HK Visualization dependent-transition exact11 v8 source-plan mapping drifted.",
    );
  }
  const sourcePlanMappingHash = hashScrollCanonical({
    contractVersion:
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
    kind: "browser-dependent-transition-source-plan-mapping",
    manifestVersion:
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_MANIFEST_VERSION,
    sourcePlanMappings,
  });
  validateHkVisualizationDependentTransitionSourcePlanMappingReceipt({
    sourcePlanManifestVersion:
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_MANIFEST_VERSION,
    sourcePlanMappingHash,
    sourcePlanMappings,
  });
  const evidenceWithoutHash = {
    attachmentResourceTotals: Object.freeze({ ...attachmentResourceTotals }),
    cellCount: cells.length,
    cellIds: actualCellIds,
    contractVersion:
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
    labCellCounts,
    packageAggregateHashes: aggregates.map(({ aggregateHash }) => aggregateHash),
    packageCount: aggregates.length,
    packageSourceBindingHashes,
    packageTitles: packageTests.map(({ title }) => title),
    phaseObservationCount,
    scrollPackageAggregateHashes: scrollAggregates.map(
      ({ aggregateHash }) => aggregateHash,
    ),
    sequenceObservationCount,
    sourcePlanManifestVersion:
      HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_MANIFEST_VERSION,
    sourcePlanMappingHash,
    sourcePlanMappings,
    sourcePackageResultAttachmentAggregateHash,
    sourcePackageResultAttachmentNames,
    sourcePackageResultAttachmentSha256s,
    resourcePolicy: HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS,
    topologyAggregateHash,
    visibleMathProjectionObservationCount: sequenceObservationCount * 5,
  };
  return Object.freeze({
    ...evidenceWithoutHash,
    runAggregateHash: hashScrollCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-dependent-transition-run-evidence",
    }),
  });
}

function exactOracleSelectorEvidence(label, raw) {
  if (!exactObjectKeys(raw, ["count", "learnerVisibleCount"])) {
    throw new Error(`${label} must contain exact selector counts.`);
  }
  for (const field of ["count", "learnerVisibleCount"]) {
    requireScrollNonNegativeInteger(`${label}.${field}`, raw[field]);
  }
  if (raw.count !== 1 || raw.learnerVisibleCount !== 1) {
    throw new Error(
      `${label} must identify exactly one learner-visible selector; observed ${String(raw.count)}/${String(raw.learnerVisibleCount)}.`,
    );
  }
  return raw;
}

function validateBrowserPassThroughOracleObservation(
  raw,
  { cellId, labId, packageTitle, phase, observationIndex },
) {
  const label = `${packageTitle}.${cellId}.oracle[${observationIndex}]`;
  const observationKeys = [
    "observationHash",
    "phase",
    "publicState",
    "publicStateHash",
    "rawRendererState",
    "rawRendererStateHash",
    "visibleGeometry",
    "visibleGeometryHash",
  ];
  if (!exactObjectKeys(raw, observationKeys)) {
    throw new Error(`${label} must contain exact three-layer evidence keys.`);
  }
  if (raw.phase !== phase) {
    throw new Error(
      `${label}.phase=${String(raw.phase)} differs from exact scroll phase ${phase}.`,
    );
  }

  if (!exactObjectKeys(raw.publicState, ["selectorEvidence", "state"])) {
    throw new Error(`${label}.publicState has schema drift.`);
  }
  exactOracleSelectorEvidence(
    `${label}.publicState.selectorEvidence`,
    raw.publicState.selectorEvidence,
  );
  if (
    !raw.publicState.state ||
    typeof raw.publicState.state !== "object" ||
    Array.isArray(raw.publicState.state) ||
    Object.keys(raw.publicState.state).length === 0
  ) {
    throw new Error(`${label}.publicState.state must be a non-empty object.`);
  }
  requireScrollHash(`${label}.publicStateHash`, raw.publicStateHash);
  if (raw.publicStateHash !== hashScrollCanonical(raw.publicState)) {
    throw new Error(`${label}.publicStateHash drifted.`);
  }

  if (
    !exactObjectKeys(raw.rawRendererState, [
      "attribute",
      "selectorEvidence",
      "serializedState",
    ])
  ) {
    throw new Error(`${label}.rawRendererState has schema drift.`);
  }
  if (
    raw.rawRendererState.attribute !== "data-viz-math-state" &&
    raw.rawRendererState.attribute !== "data-viz-state-json"
  ) {
    throw new Error(`${label}.rawRendererState.attribute is unsupported.`);
  }
  exactOracleSelectorEvidence(
    `${label}.rawRendererState.selectorEvidence`,
    raw.rawRendererState.selectorEvidence,
  );
  const serializedState = raw.rawRendererState.serializedState;
  if (typeof serializedState !== "string" || !serializedState) {
    throw new Error(
      `${label}.rawRendererState.serializedState must be canonical plain-object JSON.`,
    );
  }
  let parsedRawState;
  try {
    parsedRawState = JSON.parse(serializedState);
  } catch {
    throw new Error(`${label}.rawRendererState.serializedState is malformed.`);
  }
  if (
    !parsedRawState ||
    typeof parsedRawState !== "object" ||
    Array.isArray(parsedRawState) ||
    Object.getPrototypeOf(parsedRawState) !== Object.prototype ||
    JSON.stringify(parsedRawState) !== serializedState
  ) {
    throw new Error(
      `${label}.rawRendererState.serializedState must be canonical plain-object JSON.`,
    );
  }
  requireScrollHash(`${label}.rawRendererStateHash`, raw.rawRendererStateHash);
  if (
    raw.rawRendererStateHash !== hashScrollCanonical(raw.rawRendererState)
  ) {
    throw new Error(`${label}.rawRendererStateHash drifted.`);
  }

  if (
    !exactObjectKeys(raw.visibleGeometry, [
      "formulaText",
      "visibleMathMarks",
      "visibleNamedMarks",
    ]) ||
    typeof raw.visibleGeometry.formulaText !== "string" ||
    !raw.visibleGeometry.formulaText.trim() ||
    !Array.isArray(raw.visibleGeometry.visibleNamedMarks) ||
    raw.visibleGeometry.visibleNamedMarks.length === 0 ||
    raw.visibleGeometry.visibleNamedMarks.some(
      (mark) => typeof mark !== "string" || !mark.trim(),
    ) ||
    !raw.visibleGeometry.visibleMathMarks ||
    typeof raw.visibleGeometry.visibleMathMarks !== "object" ||
    Array.isArray(raw.visibleGeometry.visibleMathMarks) ||
    Object.keys(raw.visibleGeometry.visibleMathMarks).length === 0
  ) {
    throw new Error(`${label}.visibleGeometry has schema or visible evidence drift.`);
  }
  for (const [markName, marks] of Object.entries(
    raw.visibleGeometry.visibleMathMarks,
  )) {
    if (!markName.trim() || !Array.isArray(marks) || marks.length === 0) {
      throw new Error(`${label}.visibleGeometry mark groups are invalid.`);
    }
    for (const [markIndex, mark] of marks.entries()) {
      if (
        !exactObjectKeys(mark, ["attributes", "tagName", "text"]) ||
        typeof mark.tagName !== "string" ||
        !mark.tagName.trim() ||
        typeof mark.text !== "string" ||
        !mark.attributes ||
        typeof mark.attributes !== "object" ||
        Array.isArray(mark.attributes) ||
        Object.values(mark.attributes).some(
          (value) => value !== null && typeof value !== "string",
        )
      ) {
        throw new Error(
          `${label}.visibleGeometry.${markName}[${markIndex}] is invalid.`,
        );
      }
    }
  }
  requireScrollHash(`${label}.visibleGeometryHash`, raw.visibleGeometryHash);
  if (raw.visibleGeometryHash !== hashScrollCanonical(raw.visibleGeometry)) {
    throw new Error(`${label}.visibleGeometryHash drifted.`);
  }

  const evidenceWithoutHash = {
    phase,
    publicState: raw.publicState,
    publicStateHash: raw.publicStateHash,
    rawRendererState: raw.rawRendererState,
    rawRendererStateHash: raw.rawRendererStateHash,
    visibleGeometry: raw.visibleGeometry,
    visibleGeometryHash: raw.visibleGeometryHash,
  };
  requireScrollHash(`${label}.observationHash`, raw.observationHash);
  const expectedObservationHash = hashScrollCanonical({
    cellId,
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
    evidence: evidenceWithoutHash,
    kind: "browser-pass-through-oracle-observation",
    labId,
  });
  if (raw.observationHash !== expectedObservationHash) {
    throw new Error(`${label}.observationHash drifted.`);
  }
  return raw;
}

function validateBrowserPassThroughOraclePackageAggregate(
  raw,
  packageTitle,
  scrollAggregate,
) {
  const aggregateKeys = [
    "aggregateHash",
    "cellCount",
    "cells",
    "contractVersion",
    "observationCount",
    "passThroughCellCount",
  ];
  if (!exactObjectKeys(raw, aggregateKeys)) {
    throw new Error(
      `${packageTitle} pass-through oracle aggregate must contain exact keys.`,
    );
  }
  if (
    raw.contractVersion !==
    HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION
  ) {
    throw new Error(`${packageTitle} pass-through oracle version drifted.`);
  }
  requireScrollNonNegativeInteger(`${packageTitle}.cellCount`, raw.cellCount);
  if (
    raw.cellCount !== scrollAggregate.cellCount ||
    !Array.isArray(raw.cells) ||
    raw.cells.length !== scrollAggregate.cellCount
  ) {
    throw new Error(
      `${packageTitle} oracle cells differ from exact scroll package cells.`,
    );
  }
  let observationCount = 0;
  let passThroughCellCount = 0;
  const cellKeys = [
    "cellAggregateHash",
    "cellId",
    "kind",
    "labId",
    "observationCount",
    "observationHashes",
    "observations",
    "phases",
  ];
  for (let cellIndex = 0; cellIndex < raw.cells.length; cellIndex += 1) {
    const cell = raw.cells[cellIndex];
    const scrollCell = scrollAggregate.cells[cellIndex];
    if (!exactObjectKeys(cell, cellKeys)) {
      throw new Error(`${packageTitle} oracle cell ${cellIndex} has schema drift.`);
    }
    if (cell.cellId !== scrollCell.cellId) {
      throw new Error(
        `${packageTitle} oracle cell ${cellIndex} differs from scroll cell order.`,
      );
    }
    const segments = cell.cellId.split("/");
    if (segments.length !== 5 || cell.labId !== segments[1]) {
      throw new Error(`${packageTitle}.${cell.cellId} lab identity mismatched.`);
    }
    const expectedKind = hkVisualizationPassThroughOracleLabIdSet.has(cell.labId)
      ? "pass-through"
      : "dedicated";
    if (cell.kind !== expectedKind) {
      throw new Error(`${packageTitle}.${cell.cellId} oracle kind mismatched.`);
    }
    requireScrollNonNegativeInteger(
      `${packageTitle}.${cell.cellId}.observationCount`,
      cell.observationCount,
    );
    if (
      !Array.isArray(cell.phases) ||
      !Array.isArray(cell.observationHashes) ||
      !Array.isArray(cell.observations) ||
      cell.phases.length !== cell.observationCount ||
      cell.observationHashes.length !== cell.observationCount ||
      cell.observations.length !== cell.observationCount
    ) {
      throw new Error(
        `${packageTitle}.${cell.cellId} oracle phase/hash/observation counts drifted.`,
      );
    }
    if (expectedKind === "dedicated") {
      if (cell.observationCount !== 0) {
        throw new Error(
          `${packageTitle}.${cell.cellId} dedicated cell must have zero oracle observations.`,
        );
      }
    } else {
      passThroughCellCount += 1;
      if (!isDeepStrictEqual(cell.phases, scrollCell.phases)) {
        throw new Error(
          `${packageTitle}.${cell.cellId} oracle phases differ from independent scroll phases.`,
        );
      }
    }
    cell.observations.forEach((observation, observationIndex) => {
      validateBrowserPassThroughOracleObservation(observation, {
        cellId: cell.cellId,
        labId: cell.labId,
        observationIndex,
        packageTitle,
        phase: scrollCell.phases[observationIndex],
      });
      if (cell.observationHashes[observationIndex] !== observation.observationHash) {
        throw new Error(
          `${packageTitle}.${cell.cellId} observationHashes drifted at ${observationIndex}.`,
        );
      }
    });
    const cellEvidenceWithoutHash = {
      cellId: cell.cellId,
      kind: cell.kind,
      labId: cell.labId,
      observationCount: cell.observationCount,
      observationHashes: cell.observationHashes,
      observations: cell.observations,
      phases: cell.phases,
    };
    requireScrollHash(
      `${packageTitle}.${cell.cellId}.cellAggregateHash`,
      cell.cellAggregateHash,
    );
    if (
      cell.cellAggregateHash !==
      hashScrollCanonical({
        contractVersion:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
        evidence: cellEvidenceWithoutHash,
        kind: "browser-pass-through-oracle-cell",
      })
    ) {
      throw new Error(`${packageTitle}.${cell.cellId}.cellAggregateHash drifted.`);
    }
    observationCount += cell.observationCount;
  }
  for (const [field, expected] of [
    ["observationCount", observationCount],
    ["passThroughCellCount", passThroughCellCount],
  ]) {
    requireScrollNonNegativeInteger(`${packageTitle}.${field}`, raw[field]);
    if (raw[field] !== expected) {
      throw new Error(`${packageTitle}.${field} differs from exact nested total.`);
    }
  }
  const evidenceWithoutHash = {
    cellCount: raw.cellCount,
    cells: raw.cells,
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
    observationCount,
    passThroughCellCount,
  };
  requireScrollHash(`${packageTitle}.oracle.aggregateHash`, raw.aggregateHash);
  if (
    raw.aggregateHash !==
    hashScrollCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-pass-through-oracle-package",
    })
  ) {
    throw new Error(`${packageTitle}.oracle.aggregateHash drifted.`);
  }
  return raw;
}

export function validateHkVisualizationBrowserPassThroughOracleAnnotations(
  serializedTests,
) {
  if (!Array.isArray(serializedTests)) {
    throw new Error("HK Visualization serialized tests must be an array.");
  }
  const expectedTitleSet = new Set(hkVisualizationMachinePackageTitles);
  const packageTests = serializedTests.filter(
    ({ file, title }) =>
      typeof file === "string" &&
      file.replaceAll("\\", "/").endsWith(
        "hk-visualization-machine-acceptance.spec.ts",
      ) &&
      expectedTitleSet.has(title),
  );
  if (
    packageTests.length !== hkVisualizationExpectedMachinePackageCount ||
    !isDeepStrictEqual(
      packageTests.map(({ title }) => title),
      hkVisualizationMachinePackageTitles,
    )
  ) {
    throw new Error(
      "HK Visualization pass-through oracle packages are missing, duplicated, extra, or out of order.",
    );
  }
  const oracleAggregates = [];
  const scrollAggregates = [];
  for (const { entry, title } of packageTests) {
    const annotations = Array.isArray(entry?.annotations) ? entry.annotations : [];
    const parseExact = (type, validator) => {
      const matches = annotations.filter((annotation) => annotation?.type === type);
      if (matches.length !== 1) {
        throw new Error(
          `${title} must carry exactly one ${type} annotation; observed ${matches.length}.`,
        );
      }
      const raw = parseHkVisualizationBoundedCanonicalAnnotationDescription(
        matches[0],
        title,
        type,
      );
      return validator(raw);
    };
    const scrollAggregate = parseExact(
      HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
      (raw) => validateBrowserScrollPackageAggregate(raw, title),
    );
    scrollAggregates.push(scrollAggregate);
    oracleAggregates.push(
      parseExact(
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE,
        (raw) =>
          validateBrowserPassThroughOraclePackageAggregate(
            raw,
            title,
            scrollAggregate,
          ),
      ),
    );
  }
  const passThroughCells = oracleAggregates.flatMap(({ cells }) =>
    cells.filter(({ kind }) => kind === "pass-through"),
  );
  if (
    passThroughCells.length !==
    HK_VISUALIZATION_PASS_THROUGH_ORACLE_EXPECTED_CELL_COUNT
  ) {
    throw new Error(
      `HK Visualization pass-through oracle cells must equal exact ${HK_VISUALIZATION_PASS_THROUGH_ORACLE_EXPECTED_CELL_COUNT}; observed ${passThroughCells.length}.`,
    );
  }
  const actualPassThroughCellIds = passThroughCells
    .map(({ cellId }) => cellId)
    .sort();
  if (
    new Set(actualPassThroughCellIds).size !== actualPassThroughCellIds.length ||
    !isDeepStrictEqual(
      actualPassThroughCellIds,
      hkVisualizationExpectedPassThroughOracleCellIds,
    )
  ) {
    throw new Error(
      "HK Visualization pass-through oracle cells differ from the exact 7 x grade/viewport/language/theme matrix.",
    );
  }
  const labCellCounts = Object.fromEntries(
    HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS.map((labId) => [labId, 0]),
  );
  for (const cell of passThroughCells) labCellCounts[cell.labId] += 1;
  if (Object.values(labCellCounts).some((count) => count !== 18)) {
    throw new Error(
      `HK Visualization each pass-through lab must have exact 18 locale/theme/viewport cells: ${JSON.stringify(labCellCounts)}.`,
    );
  }
  const observationCount = oracleAggregates.reduce(
    (total, aggregate) => total + aggregate.observationCount,
    0,
  );
  const evidenceWithoutHash = {
    cellCount: passThroughCells.length,
    cellIds: passThroughCells.map(({ cellId }) => cellId),
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_RUN_EVIDENCE_VERSION,
    labCellCounts,
    labIds: [...HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS],
    observationCount,
    packageAggregateHashes: oracleAggregates.map(
      ({ aggregateHash }) => aggregateHash,
    ),
    packageCount: oracleAggregates.length,
    scrollPackageAggregateHashes: scrollAggregates.map(
      ({ aggregateHash }) => aggregateHash,
    ),
  };
  return Object.freeze({
    ...evidenceWithoutHash,
    runAggregateHash: hashScrollCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_RUN_EVIDENCE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-pass-through-oracle-run-evidence",
    }),
  });
}

const hkVisualizationPassThroughPaintedGeometryPairAnnotationMaxUtf8Bytes =
  1_048_576;
const hkVisualizationPassThroughPaintedGeometryLayerIds = Object.freeze([
  "public",
  "raw",
  "visible",
]);

function buildHkVisualizationPassThroughPaintedGeometryPairSourceReceipts(
  releaseSourceReceipt,
  { expectedPathManifest, expectedWorkspace } = {},
) {
  if (
    !releaseSourceReceipt ||
    !isDeepStrictEqual(
      releaseSourceReceipt.requiredSourcePaths,
      HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS,
    )
  ) {
    throw new Error(
      "Painted-geometry pair requires the validated release source receipt with exact required paths.",
    );
  }
  const beforeWorkspaceIdentity = releaseSourceReceipt.before?.workspaceIdentity;
  const afterWorkspaceIdentity = releaseSourceReceipt.after?.workspaceIdentity;
  const boundWorkspace = expectedWorkspace ??
    expectedPathManifest?.sourceWorkspace ??
    expectedPathManifest?.workspace ??
    resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  validateHkVisualizationReleaseSourceSnapshotWorkspace(
    releaseSourceReceipt.before,
    { expectedPathManifest, expectedWorkspace: boundWorkspace },
  );
  validateHkVisualizationReleaseSourceSnapshotWorkspace(
    releaseSourceReceipt.after,
    { expectedPathManifest, expectedWorkspace: boundWorkspace },
  );
  if (
    !exactOrderedObjectKeys(beforeWorkspaceIdentity, ["dev", "ino", "realpath"]) ||
    !isDeepStrictEqual(beforeWorkspaceIdentity, afterWorkspaceIdentity) ||
    typeof beforeWorkspaceIdentity.dev !== "string" ||
    !/^[1-9][0-9]*$/u.test(beforeWorkspaceIdentity.dev) ||
    typeof beforeWorkspaceIdentity.ino !== "string" ||
    !/^[1-9][0-9]*$/u.test(beforeWorkspaceIdentity.ino) ||
    typeof beforeWorkspaceIdentity.realpath !== "string" ||
    resolve(beforeWorkspaceIdentity.realpath) !== beforeWorkspaceIdentity.realpath
  ) {
    throw new Error(
      "Painted-geometry pair source receipt lacks one exact stable workspace identity.",
    );
  }
  const workspace = assertHkVisualizationStarshipPath(
    "Painted-geometry pair source receipt workspace",
    beforeWorkspaceIdentity.realpath,
  );
  const liveWorkspaceIdentity = captureHkVisualizationPhysicalPathIdentity(
    "Painted-geometry pair source receipt workspace",
    workspace,
  );
  if (
    liveWorkspaceIdentity.device !== beforeWorkspaceIdentity.dev ||
    liveWorkspaceIdentity.inode !== beforeWorkspaceIdentity.ino ||
    liveWorkspaceIdentity.realpath !== workspace
  ) {
    throw new Error(
      "Painted-geometry pair source receipt workspace physical identity drifted.",
    );
  }
  const rows = HK_VISUALIZATION_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_SOURCE_PATHS
    .map((path) => {
      const phaseEntry = (phase) => {
        const entries = releaseSourceReceipt[phase]?.entries;
        const matches = Array.isArray(entries)
          ? entries.filter((entry) => entry?.path === path)
          : [];
        if (
          matches.length !== 1 ||
          !exactOrderedObjectKeys(matches[0], [
            "mode",
            "path",
            "sha256",
            "size",
            "type",
          ]) ||
          !/^[0-7]{4}$/u.test(String(matches[0].mode ?? "")) ||
          matches[0].path !== path ||
          matches[0].type !== "file" ||
          !Number.isSafeInteger(matches[0].size) ||
          matches[0].size < 0 ||
          typeof matches[0].sha256 !== "string" ||
          !/^[a-f0-9]{64}$/u.test(matches[0].sha256)
        ) {
          throw new Error(
            `Painted-geometry pair source receipt lacks one exact five-field regular-file entry for ${path} in ${phase}.`,
          );
        }
        return matches[0];
      };
      const beforeEntry = phaseEntry("before");
      const afterEntry = phaseEntry("after");
      if (!isDeepStrictEqual(beforeEntry, afterEntry)) {
        throw new Error(
          `Painted-geometry pair source receipt metadata drifted for ${path}.`,
        );
      }
      const absolutePath = join(workspace, path);
      const bytes = readHkVisualizationBoundedStableRegularFile(absolutePath);
      const liveStat = lstatSync(absolutePath, { bigint: true });
      const liveMode = (Number(liveStat.mode & 0o7777n) & 0o7777)
        .toString(8)
        .padStart(4, "0");
      if (
        beforeEntry.size !== bytes.byteLength ||
        beforeEntry.mode !== liveMode ||
        beforeEntry.sha256 !== sha256Text(bytes)
      ) {
        throw new Error(
          `Painted-geometry pair source receipt does not bind current size, mode, and SHA bytes for ${path}.`,
        );
      }
      return {
        afterSha256: afterEntry.sha256,
        beforeSha256: beforeEntry.sha256,
        path,
      };
    });
  return validateHkVisualizationPassThroughPaintedGeometryPairSourceReceipts(
    rows,
    { workspace },
  );
}

export function validateHkVisualizationPassThroughPaintedGeometryPairSourceReceipts(
  rows,
  {
    workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
  } = {},
) {
  if (
    !Array.isArray(rows) ||
    rows.length !==
      HK_VISUALIZATION_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_SOURCE_PATHS.length
  ) {
    throw new Error(
      "Painted-geometry pair source receipts require the exact seven ordered rows.",
    );
  }
  const validated = rows.map((row, index) => {
    const expectedPath =
      HK_VISUALIZATION_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_SOURCE_PATHS[index];
    if (
      !exactOrderedObjectKeys(row, ["afterSha256", "beforeSha256", "path"]) ||
      row.path !== expectedPath ||
      typeof row.beforeSha256 !== "string" ||
      typeof row.afterSha256 !== "string" ||
      !/^[a-f0-9]{64}$/u.test(row.beforeSha256) ||
      !/^[a-f0-9]{64}$/u.test(row.afterSha256)
    ) {
      throw new Error(
        `Painted-geometry pair source receipt row ${index} has path, order, shape, or SHA drift.`,
      );
    }
    if (row.beforeSha256 !== row.afterSha256) {
      throw new Error(
        `Painted-geometry pair source receipt SHA drifted for ${row.path}.`,
      );
    }
    const validatedWorkspace = assertHkVisualizationStarshipPath(
      "Painted-geometry pair current source workspace",
      workspace,
    );
    const currentSha256 = sha256Text(
      readHkVisualizationBoundedStableRegularFile(
        join(validatedWorkspace, row.path),
      ),
    );
    if (row.beforeSha256 !== currentSha256) {
      throw new Error(
        `Painted-geometry pair source receipt does not bind the current bytes for ${row.path}.`,
      );
    }
    return Object.freeze({ ...row });
  });
  return Object.freeze(validated);
}

export function validateHkVisualizationPassThroughPaintedGeometryResetChronology(
  input,
) {
  if (!exactObjectKeys(input, [
    "afterIndex",
    "beforeIndex",
    "label",
    "phases",
  ]) ||
    !Number.isSafeInteger(input.beforeIndex) ||
    !Number.isSafeInteger(input.afterIndex) ||
    input.beforeIndex < 0 ||
    input.afterIndex < 0 ||
    typeof input.label !== "string" ||
    !input.label.trim() ||
    !Array.isArray(input.phases) ||
    !input.phases.every((phase) => typeof phase === "string")) {
    throw new Error(
      "Painted-geometry Reset chronology requires exact pair indexes, label, and phase list.",
    );
  }
  const indexesFor = (matches) => input.phases
    .map((phase, index) => ({ index, phase }))
    .filter(({ phase }) => matches(phase))
    .map(({ index }) => index);
  const enterIndexes = indexesFor((phase) =>
    /^range-state:reset:hk-state:\d{5}$/.test(phase));
  const spaceIndexes = indexesFor((phase) => phase === "reset-space");
  const noopIndexes = indexesFor(
    (phase) => phase === "reset-space-idempotent",
  );
  if (
    enterIndexes.length !== 1 ||
    spaceIndexes.length !== 1 ||
    noopIndexes.length !== 1
  ) {
    throw new Error(
      `Painted-geometry ${input.label} requires exactly one ordered Reset Enter/Space/no-op phase trio.`,
    );
  }
  const [enterIndex] = enterIndexes;
  const [spaceIndex] = spaceIndexes;
  const [noopIndex] = noopIndexes;
  if (!(
    input.beforeIndex < input.afterIndex &&
    input.afterIndex < enterIndex &&
    enterIndex < spaceIndex &&
    spaceIndex < noopIndex
  )) {
    throw new Error(
      `Painted-geometry ${input.label} Reset chronology must satisfy before < after < Enter < Space < no-op.`,
    );
  }
  return Object.freeze({
    afterIndex: input.afterIndex,
    beforeIndex: input.beforeIndex,
    enterIndex,
    noopIndex,
    spaceIndex,
  });
}

function passThroughPaintedGeometryPublicStateExactlyMatches(
  state,
  expected,
) {
  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state) ||
    (Object.getPrototypeOf(state) !== Object.prototype &&
      Object.getPrototypeOf(state) !== null)
  ) {
    return false;
  }
  const stateKeys = Object.keys(state).sort();
  const expectedKeys = Object.keys(expected).sort();
  return stateKeys.length === expectedKeys.length &&
    stateKeys.every((key, index) => key === expectedKeys[index]) &&
    expectedKeys.every((key) => Object.is(state[key], expected[key]));
}

function validateBrowserPassThroughPaintedGeometryPairPackageAggregate(
  raw,
  packageTitle,
  scrollAggregate,
  oracleAggregate,
) {
  if (!exactObjectKeys(raw, [
    "aggregateHash",
    "cellCount",
    "cells",
    "contractVersion",
    "endpointCount",
    "layerEndpointHashCount",
    "layerReceiptCount",
    "oraclePackageAggregateHash",
    "oraclePlanHash",
    "oracleVersion",
    "pairCount",
    "scrollPackageAggregateHash",
  ])) {
    throw new Error(
      `${packageTitle} painted-geometry pair aggregate must contain exact schema keys.`,
    );
  }
  if (
    raw.contractVersion !==
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION ||
    raw.oracleVersion !==
      HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION ||
    raw.oraclePlanHash !==
      HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH
  ) {
    throw new Error(
      `${packageTitle} painted-geometry pair contract/oracle authority drifted.`,
    );
  }
  if (
    raw.scrollPackageAggregateHash !== scrollAggregate.aggregateHash ||
    raw.oraclePackageAggregateHash !== oracleAggregate.aggregateHash
  ) {
    throw new Error(
      `${packageTitle} painted-geometry pair package cross-hash drifted.`,
    );
  }
  if (
    raw.cellCount !== scrollAggregate.cellCount ||
    !Array.isArray(raw.cells) ||
    raw.cells.length !== scrollAggregate.cells.length ||
    oracleAggregate.cells.length !== scrollAggregate.cells.length
  ) {
    throw new Error(
      `${packageTitle} painted-geometry pair cells differ from exact scroll topology.`,
    );
  }
  let endpointCount = 0;
  let layerEndpointHashCount = 0;
  let layerReceiptCount = 0;
  let pairCount = 0;
  const applicableCellIds = [];
  for (let cellIndex = 0; cellIndex < raw.cells.length; cellIndex += 1) {
    const cell = raw.cells[cellIndex];
    const scrollCell = scrollAggregate.cells[cellIndex];
    const oracleCell = oracleAggregate.cells[cellIndex];
    if (!exactObjectKeys(cell, [
      "cellAggregateHash",
      "cellId",
      "endpointCount",
      "kind",
      "labId",
      "layerEndpointHashCount",
      "layerReceiptCount",
      "pair",
      "pairCount",
    ])) {
      throw new Error(
        `${packageTitle} painted-geometry pair cell ${cellIndex} schema drifted.`,
      );
    }
    const segments = String(scrollCell.cellId).split("/");
    if (
      segments.length !== 5 ||
      cell.cellId !== scrollCell.cellId ||
      oracleCell.cellId !== scrollCell.cellId ||
      cell.labId !== segments[1] ||
      oracleCell.labId !== segments[1]
    ) {
      throw new Error(
        `${packageTitle} painted-geometry pair cell ${cellIndex} identity/cross-link drifted.`,
      );
    }
    const applicable =
      hkVisualizationExpectedPassThroughPaintedGeometryPairCellIdSet.has(
        cell.cellId,
      );
    const expectedCounts = applicable
      ? {
          endpointCount: 2,
          kind: "applicable",
          layerEndpointHashCount: 6,
          layerReceiptCount: 3,
          pairCount: 1,
        }
      : {
          endpointCount: 0,
          kind: "not-applicable",
          layerEndpointHashCount: 0,
          layerReceiptCount: 0,
          pairCount: 0,
        };
    for (const [field, expected] of Object.entries(expectedCounts)) {
      if (cell[field] !== expected) {
        throw new Error(
          `${packageTitle}.${cell.cellId} painted-geometry ${applicable ? "applicable" : "not-applicable"} ${field} kind drifted from exact zero topology.`,
        );
      }
    }
    if (!applicable && cell.pair !== null) {
      throw new Error(
        `${packageTitle}.${cell.cellId} not-applicable painted-geometry cell must retain null pair and zero topology.`,
      );
    }
    if (applicable) {
      applicableCellIds.push(cell.cellId);
      const pair = cell.pair;
      if (!exactObjectKeys(pair, [
        "afterRef",
        "beforeRef",
        "cellId",
        "labId",
        "layerEndpointHashCount",
        "layerPairs",
        "layerReceiptCount",
        "oraclePlanHash",
        "oracleVersion",
        "pairHash",
      ])) {
        throw new Error(
          `${packageTitle}.${cell.cellId} painted-geometry pair schema drifted.`,
        );
      }
      if (
        pair.cellId !== cell.cellId ||
        pair.labId !== cell.labId ||
        pair.oracleVersion !==
          HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION ||
        pair.oraclePlanHash !==
          HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH ||
        pair.layerReceiptCount !== 3 ||
        pair.layerEndpointHashCount !== 6
      ) {
        throw new Error(
          `${packageTitle}.${cell.cellId} painted-geometry pair cell/lab/oracle identity drifted.`,
        );
      }
      const resolveEndpoint = (name) => {
        const reference = pair[name];
        if (!exactObjectKeys(reference, [
          "observationHash",
          "observationIndex",
          "phase",
        ]) ||
          !Number.isSafeInteger(reference.observationIndex) ||
          reference.observationIndex < 0 ||
          typeof reference.phase !== "string" ||
          !reference.phase.startsWith("range-state:")
        ) {
          throw new Error(
            `${packageTitle}.${cell.cellId}.${name} painted-geometry endpoint reference schema/range phase drifted.`,
          );
        }
        const observation = oracleCell.observations[reference.observationIndex];
        if (
          !observation ||
          reference.observationHash !== observation.observationHash ||
          reference.phase !== observation.phase
        ) {
          throw new Error(
            `${packageTitle}.${cell.cellId}.${name} painted-geometry endpoint reference does not resolve uniquely into the full oracle.`,
          );
        }
        return Object.freeze({
          observation,
          observationIndex: reference.observationIndex,
        });
      };
      const beforeEndpoint = resolveEndpoint("beforeRef");
      const afterEndpoint = resolveEndpoint("afterRef");
      const oraclePlan =
        HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLANS[cell.labId];
      if (!oraclePlan) {
        throw new Error(
          `${packageTitle}.${cell.cellId} painted-geometry lacks one product-free public-state plan.`,
        );
      }
      const rangeObservations = oracleCell.observations
        .map((observation, observationIndex) => ({
          observation,
          observationIndex,
        }))
        .filter(({ observation }) =>
          typeof observation.phase === "string" &&
          observation.phase.startsWith("range-state:")
        );
      const beforeMatches = rangeObservations.filter(({ observation }) =>
        passThroughPaintedGeometryPublicStateExactlyMatches(
          observation.publicState?.state,
          oraclePlan.beforeState,
        )
      );
      const afterMatches = rangeObservations.filter(({ observation }) =>
        passThroughPaintedGeometryPublicStateExactlyMatches(
          observation.publicState?.state,
          oraclePlan.afterState,
        )
      );
      if (beforeMatches.length !== 1 || afterMatches.length !== 1) {
        throw new Error(
          `${packageTitle}.${cell.cellId} painted-geometry requires exactly one unique before and after range-state endpoint; observed ${beforeMatches.length}/${afterMatches.length}.`,
        );
      }
      const [uniqueBefore] = beforeMatches;
      const [uniqueAfter] = afterMatches;
      if (
        uniqueBefore.observationIndex !== pair.beforeRef.observationIndex ||
        uniqueBefore.observation.phase !== pair.beforeRef.phase ||
        uniqueBefore.observation.observationHash !==
          pair.beforeRef.observationHash ||
        uniqueAfter.observationIndex !== pair.afterRef.observationIndex ||
        uniqueAfter.observation.phase !== pair.afterRef.phase ||
        uniqueAfter.observation.observationHash !== pair.afterRef.observationHash
      ) {
        throw new Error(
          `${packageTitle}.${cell.cellId} painted-geometry unique public-state endpoints do not bind to compact references.`,
        );
      }
      if (beforeEndpoint.observationIndex >= afterEndpoint.observationIndex) {
        throw new Error(
          `${packageTitle}.${cell.cellId} painted-geometry before endpoint must chronologically precede after.`,
        );
      }
      validateHkVisualizationPassThroughPaintedGeometryResetChronology({
        afterIndex: afterEndpoint.observationIndex,
        beforeIndex: beforeEndpoint.observationIndex,
        label: `${packageTitle}.${cell.cellId}`,
        phases: scrollCell.phases,
      });
      if (
        !Array.isArray(pair.layerPairs) ||
        pair.layerPairs.length !== 3 ||
        !isDeepStrictEqual(
          pair.layerPairs.map(({ layer }) => layer),
          hkVisualizationPassThroughPaintedGeometryLayerIds,
        )
      ) {
        throw new Error(
          `${packageTitle}.${cell.cellId} painted-geometry layers must be ordered public/raw/visible exactly once.`,
        );
      }
      const endpointHashes = {
        public: [
          beforeEndpoint.observation.publicStateHash,
          afterEndpoint.observation.publicStateHash,
        ],
        raw: [
          beforeEndpoint.observation.rawRendererStateHash,
          afterEndpoint.observation.rawRendererStateHash,
        ],
        visible: [
          beforeEndpoint.observation.visibleGeometryHash,
          afterEndpoint.observation.visibleGeometryHash,
        ],
      };
      for (const layerPair of pair.layerPairs) {
        if (!exactObjectKeys(layerPair, [
          "afterHash",
          "beforeHash",
          "layer",
          "pairHash",
        ])) {
          throw new Error(
            `${packageTitle}.${cell.cellId} painted-geometry layer pair schema drifted.`,
          );
        }
        const expected = endpointHashes[layerPair.layer];
        if (
          !expected ||
          layerPair.beforeHash !== expected[0] ||
          layerPair.afterHash !== expected[1] ||
          layerPair.beforeHash === layerPair.afterHash
        ) {
          throw new Error(
            `${packageTitle}.${cell.cellId}.${layerPair.layer} painted-geometry layer endpoint changed/cross-hash drifted.`,
          );
        }
        const evidence = {
          afterHash: layerPair.afterHash,
          beforeHash: layerPair.beforeHash,
          layer: layerPair.layer,
        };
        if (
          layerPair.pairHash !== hashScrollCanonical({
            contractVersion:
              HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
            evidence,
            kind: "browser-pass-through-painted-geometry-layer-pair",
          })
        ) {
          throw new Error(
            `${packageTitle}.${cell.cellId}.${layerPair.layer} painted-geometry layer pair hash drifted.`,
          );
        }
      }
      const { pairHash, ...pairEvidence } = pair;
      requireScrollHash(`${packageTitle}.${cell.cellId}.pairHash`, pairHash);
      if (pairHash !== hashScrollCanonical({
        contractVersion:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
        evidence: pairEvidence,
        kind: "browser-pass-through-painted-geometry-pair",
      })) {
        throw new Error(
          `${packageTitle}.${cell.cellId} painted-geometry pair hash drifted.`,
        );
      }
      const issues =
        auditHkVisualizationPassThroughCrossStatePaintedGeometryPair({
          afterEndpoint,
          beforeEndpoint,
          cellId: cell.cellId,
          labId: cell.labId,
          locale: segments[3],
          theme: segments[4],
          viewportId: segments[2],
        });
      if (issues.length > 0) {
        throw new Error(
          `${packageTitle}.${cell.cellId} painted-geometry pair failed the shared oracle: ${issues.map(({ code, message }) => `${code}:${message}`).join(" | ")}.`,
        );
      }
    }
    const { cellAggregateHash, ...cellEvidence } = cell;
    requireScrollHash(
      `${packageTitle}.${cell.cellId}.paintedGeometryCellHash`,
      cellAggregateHash,
    );
    if (cellAggregateHash !== hashScrollCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
      evidence: cellEvidence,
      kind: "browser-pass-through-painted-geometry-pair-cell",
    })) {
      throw new Error(
        `${packageTitle}.${cell.cellId} painted-geometry cell aggregate hash drifted.`,
      );
    }
    endpointCount += cell.endpointCount;
    layerEndpointHashCount += cell.layerEndpointHashCount;
    layerReceiptCount += cell.layerReceiptCount;
    pairCount += cell.pairCount;
  }
  for (const [field, expected] of Object.entries({
    endpointCount,
    layerEndpointHashCount,
    layerReceiptCount,
    pairCount,
  })) {
    if (!Number.isSafeInteger(raw[field]) || raw[field] !== expected) {
      throw new Error(
        `${packageTitle} painted-geometry ${field} differs from exact nested total.`,
      );
    }
  }
  const { aggregateHash, ...aggregateEvidence } = raw;
  requireScrollHash(`${packageTitle}.paintedGeometry.aggregateHash`, aggregateHash);
  if (aggregateHash !== hashScrollCanonical({
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
    evidence: aggregateEvidence,
    kind: "browser-pass-through-painted-geometry-pair-package",
  })) {
    throw new Error(
      `${packageTitle} painted-geometry package aggregate hash drifted.`,
    );
  }
  return Object.freeze({ aggregate: raw, applicableCellIds });
}

export function validateHkVisualizationBrowserPassThroughPaintedGeometryPairAnnotations(
  serializedTests,
  { expectedPathManifest, expectedWorkspace, releaseSourceReceipt } = {},
) {
  if (!Array.isArray(serializedTests)) {
    throw new Error("HK Visualization serialized tests must be an array.");
  }
  const expectedTitleSet = new Set(hkVisualizationMachinePackageTitles);
  const packageTests = serializedTests.filter(
    ({ file, title }) =>
      typeof file === "string" &&
      file.replaceAll("\\", "/").endsWith(
        "hk-visualization-machine-acceptance.spec.ts",
      ) &&
      expectedTitleSet.has(title),
  );
  if (
    packageTests.length !== hkVisualizationExpectedMachinePackageCount ||
    !isDeepStrictEqual(
      packageTests.map(({ title }) => title),
      hkVisualizationMachinePackageTitles,
    )
  ) {
    throw new Error(
      "HK Visualization painted-geometry pair packages are missing, duplicated, extra, or out of order.",
    );
  }
  const aggregates = [];
  const applicableCellIds = [];
  let cellCount = 0;
  let endpointCount = 0;
  let layerEndpointHashCount = 0;
  let layerReceiptCount = 0;
  let pairCount = 0;
  for (const { entry, title } of packageTests) {
    const annotations = Array.isArray(entry?.annotations) ? entry.annotations : [];
    const parseExisting = (type, validator) => {
      const matches = annotations.filter((annotation) => annotation?.type === type);
      if (matches.length !== 1) {
        throw new Error(
          `${title} must carry exactly one ${type} annotation; observed ${matches.length}.`,
        );
      }
      const raw = parseHkVisualizationBoundedCanonicalAnnotationDescription(
        matches[0],
        title,
        type,
      );
      return validator(raw);
    };
    const scrollAggregate = parseExisting(
      HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
      (raw) => validateBrowserScrollPackageAggregate(raw, title),
    );
    const oracleAggregate = parseExisting(
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE,
      (raw) => validateBrowserPassThroughOraclePackageAggregate(
        raw,
        title,
        scrollAggregate,
      ),
    );
    const matches = annotations.filter(
      (annotation) =>
        annotation?.type ===
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_ANNOTATION_TYPE,
    );
    if (matches.length !== 1) {
      throw new Error(
        `${title} must carry exactly one ${HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_ANNOTATION_TYPE} annotation; observed ${matches.length}.`,
      );
    }
    const description = matches[0].description;
    if (
      typeof description !== "string" ||
      Buffer.byteLength(description, "utf8") >
        hkVisualizationPassThroughPaintedGeometryPairAnnotationMaxUtf8Bytes
    ) {
      throw new Error(
        `${title} painted-geometry pair annotation exceeded its UTF-8 resource byte cap.`,
      );
    }
    let raw;
    try {
      raw = JSON.parse(description);
    } catch {
      throw new Error(
        `${title} painted-geometry pair annotation is unreadable JSON.`,
      );
    }
    if (JSON.stringify(raw) !== description) {
      throw new Error(
        `${title} painted-geometry pair annotation must use canonical minified JSON bytes.`,
      );
    }
    const validated =
      validateBrowserPassThroughPaintedGeometryPairPackageAggregate(
        raw,
        title,
        scrollAggregate,
        oracleAggregate,
      );
    aggregates.push(validated.aggregate);
    applicableCellIds.push(...validated.applicableCellIds);
    cellCount += raw.cellCount;
    endpointCount += raw.endpointCount;
    layerEndpointHashCount += raw.layerEndpointHashCount;
    layerReceiptCount += raw.layerReceiptCount;
    pairCount += raw.pairCount;
  }
  const sortedApplicableCellIds = [...applicableCellIds].sort();
  if (
    new Set(sortedApplicableCellIds).size !== sortedApplicableCellIds.length ||
    !isDeepStrictEqual(
      sortedApplicableCellIds,
      hkVisualizationExpectedPassThroughPaintedGeometryPairCellIds,
    )
  ) {
    throw new Error(
      "HK Visualization painted-geometry pairs differ from the independent exact 3 x grade/viewport/locale/theme matrix.",
    );
  }
  for (const [field, actual, expected] of [
    ["packageCount", aggregates.length, 216],
    ["cellCount", cellCount, 918],
    ["pairCount", pairCount, 54],
    ["endpointCount", endpointCount, 108],
    ["layerReceiptCount", layerReceiptCount, 162],
    ["layerEndpointHashCount", layerEndpointHashCount, 324],
  ]) {
    if (actual !== expected) {
      throw new Error(
        `HK Visualization painted-geometry ${field} must equal exact ${expected}; observed ${actual}.`,
      );
    }
  }
  const sourceReceipts =
    buildHkVisualizationPassThroughPaintedGeometryPairSourceReceipts(
      releaseSourceReceipt,
      { expectedPathManifest, expectedWorkspace },
    );
  const oracleSourcePath = sourceReceipts[0].path;
  const oracleSourceSha256 = sourceReceipts[0].beforeSha256;
  const oracleTestSourcePath = sourceReceipts[1].path;
  const oracleTestSourceSha256 = sourceReceipts[1].beforeSha256;
  const labCellCounts = Object.fromEntries(
    hkVisualizationPassThroughPaintedGeometryPairLabIds.map((labId) => [
      labId,
      applicableCellIds.filter((cellId) => cellId.split("/")[1] === labId)
        .length,
    ]),
  );
  if (Object.values(labCellCounts).some((count) => count !== 18)) {
    throw new Error(
      `HK Visualization painted-geometry each lab must have exact 18 cells: ${JSON.stringify(labCellCounts)}.`,
    );
  }
  const evidenceWithoutHash = {
    cellCount,
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_RUN_EVIDENCE_VERSION,
    endpointCount,
    labCellCounts,
    labIds: [...hkVisualizationPassThroughPaintedGeometryPairLabIds],
    layerEndpointHashCount,
    layerReceiptCount,
    oraclePlanHash:
      HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH,
    oracleSourcePath,
    oracleSourceSha256,
    oracleTestSourcePath,
    oracleTestSourceSha256,
    oracleVersion: HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION,
    packageAggregateHashes: aggregates.map(({ aggregateHash }) => aggregateHash),
    packageCount: aggregates.length,
    pairCount,
    sourceReceipts,
  };
  return Object.freeze({
    ...evidenceWithoutHash,
    runAggregateHash: hashScrollCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_RUN_EVIDENCE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-pass-through-painted-geometry-pair-run-evidence",
    }),
  });
}

function validateBrowserPassThroughResetState(raw, label) {
  if (!exactObjectKeys(raw, ["comparison", "height", "mode", "value"])) {
    throw new Error(`${label} must contain the exact Reset tuple.`);
  }
  for (const field of ["comparison", "height", "mode", "value"]) {
    if (typeof raw[field] !== "number" || !Number.isFinite(raw[field])) {
      throw new Error(`${label}.${field} must be finite.`);
    }
  }
  return raw;
}

function validateBrowserPassThroughResetPackageAggregate(
  raw,
  packageTitle,
  scrollAggregate,
  oracleAggregate,
) {
  const aggregateKeys = [
    "aggregateHash",
    "canonicalNoopActionCount",
    "cellCount",
    "cells",
    "contractVersion",
    "layerEndpointHashCount",
    "layerReceiptCount",
    "observationCount",
    "passThroughCellCount",
    "restoringActionCount",
  ];
  if (!exactObjectKeys(raw, aggregateKeys)) {
    throw new Error(`${packageTitle} pass-through Reset aggregate schema drifted.`);
  }
  if (
    raw.contractVersion !==
    HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION
  ) {
    throw new Error(`${packageTitle} pass-through Reset contractVersion drifted.`);
  }
  requireScrollNonNegativeInteger(`${packageTitle}.Reset.cellCount`, raw.cellCount);
  if (
    raw.cellCount !== scrollAggregate.cellCount ||
    !Array.isArray(raw.cells) ||
    raw.cells.length !== scrollAggregate.cells.length ||
    oracleAggregate.cells.length !== scrollAggregate.cells.length
  ) {
    throw new Error(
      `${packageTitle} pass-through Reset cells differ from exact scroll/oracle cells.`,
    );
  }
  const cellKeys = [
    "canonicalNoopActionCount",
    "cellAggregateHash",
    "cellId",
    "kind",
    "labId",
    "layerEndpointHashCount",
    "layerReceiptCount",
    "observationCount",
    "observationHashes",
    "observations",
    "phases",
    "restoringActionCount",
  ];
  const observationKeys = [
    "actionIndex",
    "activationKey",
    "actionKind",
    "afterEndpoint",
    "afterFingerprint",
    "afterState",
    "beforeEndpoint",
    "beforeFingerprint",
    "beforeState",
    "canonicalFingerprint",
    "expectedState",
    "layerEndpointHashCount",
    "layerPairs",
    "layerReceiptCount",
    "observationHash",
    "phase",
  ];
  let canonicalNoopActionCount = 0;
  let layerEndpointHashCount = 0;
  let layerReceiptCount = 0;
  let observationCount = 0;
  let passThroughCellCount = 0;
  let restoringActionCount = 0;
  for (let cellIndex = 0; cellIndex < raw.cells.length; cellIndex += 1) {
    const cell = raw.cells[cellIndex];
    const scrollCell = scrollAggregate.cells[cellIndex];
    const oracleCell = oracleAggregate.cells[cellIndex];
    const label = `${packageTitle}.${scrollCell.cellId}.Reset`;
    if (!exactObjectKeys(cell, cellKeys)) {
      throw new Error(`${label} cell schema drifted.`);
    }
    if (
      cell.cellId !== scrollCell.cellId ||
      cell.cellId !== oracleCell.cellId ||
      cell.labId !== cell.cellId.split("/")[1] ||
      cell.labId !== oracleCell.labId
    ) {
      throw new Error(`${label} cellId/lab identity or exact cell order drifted.`);
    }
    const expectedKind = hkVisualizationPassThroughOracleLabIdSet.has(cell.labId)
      ? "pass-through"
      : "dedicated";
    if (cell.kind !== expectedKind || oracleCell.kind !== expectedKind) {
      throw new Error(`${label} pass-through Reset kind drifted.`);
    }
    const expectedState = hkVisualizationPassThroughResetPlans[cell.labId];
    const expectedActions = expectedKind === "pass-through"
      ? [
          {
            activationKey: "Enter",
            actionIndex: 0,
            actionKind: "restoring",
            phasePattern: /^range-state:reset:hk-state:\d{5}$/,
          },
          {
            activationKey: "Space",
            actionIndex: 1,
            actionKind: "restoring",
            phase: "reset-space",
          },
          {
            activationKey: "Space",
            actionIndex: 2,
            actionKind: "canonical-noop",
            phase: "reset-space-idempotent",
          },
        ]
      : [];
    if (
      !Array.isArray(cell.observations) ||
      !Array.isArray(cell.observationHashes) ||
      !Array.isArray(cell.phases) ||
      cell.observationCount !== expectedActions.length ||
      cell.observations.length !== expectedActions.length ||
      cell.observationHashes.length !== expectedActions.length ||
      cell.phases.length !== expectedActions.length
    ) {
      throw new Error(
        `${label} requires exact ${expectedActions.length} ordered Reset observations.`,
      );
    }
    if (expectedKind === "pass-through") {
      passThroughCellCount += 1;
      const expectedScrollPhases = scrollCell.phases.slice(-3);
      if (
        expectedScrollPhases.length !== 3 ||
        !isDeepStrictEqual(cell.phases, expectedScrollPhases)
      ) {
        throw new Error(`${label} Reset phases drifted from the exact final scroll phases.`);
      }
    }
    cell.observations.forEach((observation, actionIndex) => {
      const action = expectedActions[actionIndex];
      if (!exactObjectKeys(observation, observationKeys)) {
        throw new Error(`${label}.observations[${actionIndex}] schema drifted.`);
      }
      if (
        observation.actionIndex !== action.actionIndex ||
        observation.activationKey !== action.activationKey ||
        observation.actionKind !== action.actionKind ||
        cell.phases[actionIndex] !== observation.phase ||
        (action.phasePattern
          ? !action.phasePattern.test(observation.phase)
          : observation.phase !== action.phase)
      ) {
        throw new Error(`${label}.observations[${actionIndex}] action identity/order/phase drifted.`);
      }
      const afterState = validateBrowserPassThroughResetState(
        observation.afterState,
        `${label}.observations[${actionIndex}].afterState`,
      );
      const beforeState = validateBrowserPassThroughResetState(
        observation.beforeState,
        `${label}.observations[${actionIndex}].beforeState`,
      );
      const observedExpectedState = validateBrowserPassThroughResetState(
        observation.expectedState,
        `${label}.observations[${actionIndex}].expectedState`,
      );
      if (
        !isDeepStrictEqual(afterState, expectedState) ||
        !isDeepStrictEqual(observedExpectedState, expectedState)
      ) {
        throw new Error(`${label}.observations[${actionIndex}] Reset tuple drifted.`);
      }
      for (const field of [
        "afterFingerprint",
        "beforeFingerprint",
        "canonicalFingerprint",
      ]) {
        if (typeof observation[field] !== "string" || !observation[field].trim()) {
          throw new Error(
            `${label}.observations[${actionIndex}].${field} must be nonblank.`,
          );
        }
      }
      if (
        observation.afterFingerprint !== observation.canonicalFingerprint ||
        (action.actionKind === "restoring" && (
          observation.beforeFingerprint === observation.canonicalFingerprint ||
          !isDeepStrictEqual(
            beforeState,
            hkVisualizationPassThroughResetPerturbations[cell.labId],
          )
        )) ||
        (action.actionKind === "canonical-noop" &&
          (observation.beforeFingerprint !== observation.canonicalFingerprint ||
            !isDeepStrictEqual(beforeState, expectedState) ||
            !isDeepStrictEqual(beforeState, afterState)))
      ) {
        throw new Error(`${label}.observations[${actionIndex}] restoration/idempotency fingerprint or exact before tuple drifted.`);
      }
      const matchingOracle = oracleCell.observations.filter(
        ({ phase }) => phase === observation.phase,
      );
      if (matchingOracle.length !== 1) {
        throw new Error(`${label}.observations[${actionIndex}] lacks one same-phase oracle receipt.`);
      }
      const oracle = matchingOracle[0];
      const beforeEndpoint = validateBrowserPassThroughOracleObservation(
        observation.beforeEndpoint,
        {
          cellId: cell.cellId,
          labId: cell.labId,
          observationIndex: `Reset-before-${actionIndex}`,
          packageTitle,
          phase: observation.phase,
        },
      );
      const afterEndpoint = validateBrowserPassThroughOracleObservation(
        observation.afterEndpoint,
        {
          cellId: cell.cellId,
          labId: cell.labId,
          observationIndex: `Reset-after-${actionIndex}`,
          packageTitle,
          phase: observation.phase,
        },
      );
      if (!isDeepStrictEqual(afterEndpoint, oracle)) {
        throw new Error(
          `${label}.observations[${actionIndex}] after endpoint drifted from the full same-phase oracle.`,
        );
      }
      const publicResetTuple = validateBrowserPassThroughResetState(
        {
          comparison: oracle.publicState.state.comparison,
          height: oracle.publicState.state.height,
          mode: oracle.publicState.state.mode,
          value: oracle.publicState.state.value,
        },
        `${label}.observations[${actionIndex}].publicResetTuple`,
      );
      if (!isDeepStrictEqual(publicResetTuple, afterState)) {
        throw new Error(
          `${label}.observations[${actionIndex}] public Reset tuple drifted from Reset afterState.`,
        );
      }
      const beforePublicResetTuple = validateBrowserPassThroughResetState(
        {
          comparison: beforeEndpoint.publicState.state.comparison,
          height: beforeEndpoint.publicState.state.height,
          mode: beforeEndpoint.publicState.state.mode,
          value: beforeEndpoint.publicState.state.value,
        },
        `${label}.observations[${actionIndex}].beforePublicResetTuple`,
      );
      if (!isDeepStrictEqual(beforePublicResetTuple, beforeState)) {
        throw new Error(
          `${label}.observations[${actionIndex}] before endpoint public tuple drifted from Reset beforeState.`,
        );
      }
      if (
        observation.layerReceiptCount !== 3 ||
        observation.layerEndpointHashCount !== 6 ||
        !Array.isArray(observation.layerPairs) ||
        observation.layerPairs.length !== 3
      ) {
        throw new Error(`${label}.observations[${actionIndex}] requires exact three layer pairs and six endpoint hashes.`);
      }
      const endpointHashes = {
        public: [beforeEndpoint.publicStateHash, afterEndpoint.publicStateHash],
        raw: [
          beforeEndpoint.rawRendererStateHash,
          afterEndpoint.rawRendererStateHash,
        ],
        visible: [
          beforeEndpoint.visibleGeometryHash,
          afterEndpoint.visibleGeometryHash,
        ],
      };
      observation.layerPairs.forEach((pair, layerIndex) => {
        const layer = ["public", "raw", "visible"][layerIndex];
        if (
          !exactObjectKeys(pair, ["afterHash", "beforeHash", "layer", "pairHash"])
          || pair.layer !== layer
          || pair.beforeHash !== endpointHashes[layer][0]
          || pair.afterHash !== endpointHashes[layer][1]
        ) {
          throw new Error(
            `${label}.observations[${actionIndex}] layer pair order or endpoint hashes drifted.`,
          );
        }
        requireScrollHash(
          `${label}.observations[${actionIndex}].layerPairs[${layerIndex}].pairHash`,
          pair.pairHash,
        );
        if (pair.pairHash !== hashScrollCanonical({
          afterHash: pair.afterHash,
          beforeHash: pair.beforeHash,
          contractVersion: HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION,
          kind: "pass-through-reset-layer-pair",
          layer: pair.layer,
        })) {
          throw new Error(
            `${label}.observations[${actionIndex}] ${layer} pairHash drifted.`,
          );
        }
        if (
          action.actionKind === "restoring"
          && pair.beforeHash === pair.afterHash
        ) {
          throw new Error(
            `${label}.observations[${actionIndex}] restoring ${layer} endpoint did not change.`,
          );
        }
        if (
          action.actionKind === "canonical-noop"
          && pair.beforeHash !== pair.afterHash
        ) {
          throw new Error(
            `${label}.observations[${actionIndex}] canonical no-op ${layer} endpoint drifted.`,
          );
        }
      });
      const evidenceWithoutHash = {
        actionIndex,
        activationKey: observation.activationKey,
        actionKind: observation.actionKind,
        afterEndpoint: observation.afterEndpoint,
        afterFingerprint: observation.afterFingerprint,
        afterState: observation.afterState,
        beforeEndpoint: observation.beforeEndpoint,
        beforeFingerprint: observation.beforeFingerprint,
        beforeState: observation.beforeState,
        canonicalFingerprint: observation.canonicalFingerprint,
        expectedState: observation.expectedState,
        layerEndpointHashCount: 6,
        layerPairs: observation.layerPairs,
        layerReceiptCount: 3,
        phase: observation.phase,
      };
      requireScrollHash(
        `${label}.observations[${actionIndex}].observationHash`,
        observation.observationHash,
      );
      if (
        observation.observationHash !== hashScrollCanonical({
          cellId: cell.cellId,
          contractVersion:
            HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
          evidence: evidenceWithoutHash,
          kind: "browser-pass-through-reset-observation",
          resetContractVersion:
            HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION,
        })
      ) {
        throw new Error(`${label}.observations[${actionIndex}].observationHash drifted.`);
      }
      if (cell.observationHashes[actionIndex] !== observation.observationHash) {
        throw new Error(`${label}.observationHashes[${actionIndex}] drifted.`);
      }
    });
    const cellRestoringActionCount = cell.observations.filter(
      ({ actionKind }) => actionKind === "restoring",
    ).length;
    const cellCanonicalNoopActionCount = cell.observations.filter(
      ({ actionKind }) => actionKind === "canonical-noop",
    ).length;
    const cellLayerReceiptCount = cell.observations.length * 3;
    const cellLayerEndpointHashCount = cell.observations.length * 6;
    for (const [field, expected] of [
      ["canonicalNoopActionCount", cellCanonicalNoopActionCount],
      ["layerEndpointHashCount", cellLayerEndpointHashCount],
      ["layerReceiptCount", cellLayerReceiptCount],
      ["observationCount", cell.observations.length],
      ["restoringActionCount", cellRestoringActionCount],
    ]) {
      requireScrollNonNegativeInteger(`${label}.${field}`, cell[field]);
      if (cell[field] !== expected) {
        throw new Error(`${label}.${field} differs from exact nested total ${expected}.`);
      }
    }
    const cellEvidenceWithoutHash = {
      canonicalNoopActionCount: cell.canonicalNoopActionCount,
      cellId: cell.cellId,
      kind: cell.kind,
      labId: cell.labId,
      layerEndpointHashCount: cell.layerEndpointHashCount,
      layerReceiptCount: cell.layerReceiptCount,
      observationCount: cell.observationCount,
      observationHashes: cell.observationHashes,
      observations: cell.observations,
      phases: cell.phases,
      restoringActionCount: cell.restoringActionCount,
    };
    requireScrollHash(`${label}.cellAggregateHash`, cell.cellAggregateHash);
    if (
      cell.cellAggregateHash !== hashScrollCanonical({
        contractVersion:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
        evidence: cellEvidenceWithoutHash,
        kind: "browser-pass-through-reset-cell",
      })
    ) {
      throw new Error(`${label}.cellAggregateHash drifted.`);
    }
    canonicalNoopActionCount += cellCanonicalNoopActionCount;
    layerEndpointHashCount += cellLayerEndpointHashCount;
    layerReceiptCount += cellLayerReceiptCount;
    observationCount += cell.observations.length;
    restoringActionCount += cellRestoringActionCount;
  }
  for (const [field, expected] of [
    ["canonicalNoopActionCount", canonicalNoopActionCount],
    ["layerEndpointHashCount", layerEndpointHashCount],
    ["layerReceiptCount", layerReceiptCount],
    ["observationCount", observationCount],
    ["passThroughCellCount", passThroughCellCount],
    ["restoringActionCount", restoringActionCount],
  ]) {
    requireScrollNonNegativeInteger(`${packageTitle}.Reset.${field}`, raw[field]);
    if (raw[field] !== expected) {
      throw new Error(`${packageTitle}.Reset.${field} differs from exact nested total ${expected}.`);
    }
  }
  const evidenceWithoutHash = {
    canonicalNoopActionCount,
    cellCount: raw.cellCount,
    cells: raw.cells,
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
    layerEndpointHashCount,
    layerReceiptCount,
    observationCount,
    passThroughCellCount,
    restoringActionCount,
  };
  requireScrollHash(`${packageTitle}.Reset.aggregateHash`, raw.aggregateHash);
  if (
    raw.aggregateHash !== hashScrollCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-pass-through-reset-package",
    })
  ) {
    throw new Error(`${packageTitle}.Reset.aggregateHash drifted.`);
  }
  return raw;
}

export function validateHkVisualizationBrowserPassThroughResetAnnotations(
  serializedTests,
) {
  if (!Array.isArray(serializedTests)) {
    throw new Error("HK Visualization serialized tests must be an array.");
  }
  const expectedTitleSet = new Set(hkVisualizationMachinePackageTitles);
  const packageTests = serializedTests.filter(
    ({ file, title }) =>
      typeof file === "string" &&
      file.replaceAll("\\", "/").endsWith(
        "hk-visualization-machine-acceptance.spec.ts",
      ) &&
      expectedTitleSet.has(title),
  );
  if (
    packageTests.length !== hkVisualizationExpectedMachinePackageCount ||
    !isDeepStrictEqual(
      packageTests.map(({ title }) => title),
      hkVisualizationMachinePackageTitles,
    )
  ) {
    throw new Error(
      "HK Visualization pass-through Reset packages are missing, duplicated, extra, or out of order.",
    );
  }
  const resetAggregates = [];
  const oracleAggregates = [];
  const scrollAggregates = [];
  for (const { entry, title } of packageTests) {
    const annotations = Array.isArray(entry?.annotations) ? entry.annotations : [];
    const parseExact = (type, validator) => {
      const matches = annotations.filter((annotation) => annotation?.type === type);
      if (matches.length !== 1) {
        throw new Error(
          `${title} must carry exactly one ${type} annotation; observed ${matches.length}.`,
        );
      }
      const parsed = parseHkVisualizationBoundedCanonicalAnnotationDescription(
        matches[0],
        title,
        type,
      );
      return validator(parsed);
    };
    const scrollAggregate = parseExact(
      HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
      (parsed) => validateBrowserScrollPackageAggregate(parsed, title),
    );
    const oracleAggregate = parseExact(
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE,
      (parsed) =>
        validateBrowserPassThroughOraclePackageAggregate(
          parsed,
          title,
          scrollAggregate,
        ),
    );
    const resetAggregate = parseExact(
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_ANNOTATION_TYPE,
      (parsed) =>
        validateBrowserPassThroughResetPackageAggregate(
          parsed,
          title,
          scrollAggregate,
          oracleAggregate,
        ),
    );
    scrollAggregates.push(scrollAggregate);
    oracleAggregates.push(oracleAggregate);
    resetAggregates.push(resetAggregate);
  }
  const passThroughCells = resetAggregates.flatMap(({ cells }) =>
    cells.filter(({ kind }) => kind === "pass-through"),
  );
  const cellIds = passThroughCells.map(({ cellId }) => cellId).sort();
  if (
    passThroughCells.length !==
      HK_VISUALIZATION_PASS_THROUGH_ORACLE_EXPECTED_CELL_COUNT ||
    new Set(cellIds).size !== cellIds.length ||
    !isDeepStrictEqual(cellIds, hkVisualizationExpectedPassThroughOracleCellIds)
  ) {
    throw new Error(
      "HK Visualization pass-through Reset cells differ from the exact unique 7 x grade/viewport/language/theme matrix.",
    );
  }
  const labCellCounts = Object.fromEntries(
    HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS.map((labId) => [labId, 0]),
  );
  for (const cell of passThroughCells) labCellCounts[cell.labId] += 1;
  if (Object.values(labCellCounts).some((count) => count !== 18)) {
    throw new Error(
      `HK Visualization each Reset topic must have exact 18 cells: ${JSON.stringify(labCellCounts)}.`,
    );
  }
  const totals = {
    canonicalNoopActionCount: resetAggregates.reduce(
      (total, aggregate) => total + aggregate.canonicalNoopActionCount,
      0,
    ),
    layerEndpointHashCount: resetAggregates.reduce(
      (total, aggregate) => total + aggregate.layerEndpointHashCount,
      0,
    ),
    layerReceiptCount: resetAggregates.reduce(
      (total, aggregate) => total + aggregate.layerReceiptCount,
      0,
    ),
    observationCount: resetAggregates.reduce(
      (total, aggregate) => total + aggregate.observationCount,
      0,
    ),
    restoringActionCount: resetAggregates.reduce(
      (total, aggregate) => total + aggregate.restoringActionCount,
      0,
    ),
  };
  for (const [field, expected] of [
    [
      "canonicalNoopActionCount",
      HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_CANONICAL_NOOP_ACTION_COUNT,
    ],
    [
      "layerEndpointHashCount",
      HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_LAYER_ENDPOINT_HASH_COUNT,
    ],
    [
      "layerReceiptCount",
      HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_LAYER_RECEIPT_COUNT,
    ],
    [
      "observationCount",
      HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_OBSERVATION_COUNT,
    ],
    [
      "restoringActionCount",
      HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_RESTORING_ACTION_COUNT,
    ],
  ]) {
    if (totals[field] !== expected) {
      throw new Error(
        `HK Visualization pass-through Reset ${field}=${totals[field]} differs from exact ${expected}.`,
      );
    }
  }
  const evidenceWithoutHash = {
    ...totals,
    cellCount: passThroughCells.length,
    cellIds,
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_RUN_EVIDENCE_VERSION,
    labCellCounts,
    labIds: [...HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS],
    oraclePackageAggregateHashes: oracleAggregates.map(
      ({ aggregateHash }) => aggregateHash,
    ),
    packageAggregateHashes: resetAggregates.map(
      ({ aggregateHash }) => aggregateHash,
    ),
    packageCount: resetAggregates.length,
    scrollPackageAggregateHashes: scrollAggregates.map(
      ({ aggregateHash }) => aggregateHash,
    ),
  };
  return Object.freeze({
    ...evidenceWithoutHash,
    runAggregateHash: hashScrollCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_RUN_EVIDENCE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-pass-through-reset-run-evidence",
    }),
  });
}

function p6NumbersClose(left, right) {
  return (
    Number.isFinite(left) &&
    Number.isFinite(right) &&
    Math.abs(left - right) <=
      1e-9 * Math.max(1, Math.abs(left), Math.abs(right))
  );
}

function validateP6VisibilityRecord(label, raw) {
  if (
    !exactObjectKeys(raw, [
      "ariaHiddenAncestor",
      "hiddenAncestor",
      "inertAncestor",
      "visuallyVisible",
    ]) ||
    raw.visuallyVisible !== true ||
    raw.hiddenAncestor !== false ||
    raw.inertAncestor !== false ||
    raw.ariaHiddenAncestor !== false
  ) {
    throw new Error(`${label} must be exact learner-visible evidence.`);
  }
}

function validateBrowserP6AveragesObservation(raw, label, expectedPhase) {
  const observationKeys = [
    "dedicatedState",
    "flags",
    "meanLines",
    "phase",
    "points",
    "seriesBShift",
    "serializedDedicatedState",
    "segments",
    "tableRows",
    "visibility",
  ];
  if (!exactObjectKeys(raw, observationKeys)) {
    throw new Error(`${label} observation schema drifted.`);
  }
  if (raw.phase !== expectedPhase) {
    throw new Error(`${label}.phase differs from exact boundary phase.`);
  }
  const shift = raw.seriesBShift;
  if (!Number.isFinite(shift) || shift < 0 || shift > 2) {
    throw new Error(`${label}.seriesBShift must be finite in [0,2].`);
  }
  if (
    !exactObjectKeys(raw.dedicatedState, [
      "mode",
      "seriesBShift",
      "seriesCount",
      "values",
    ]) ||
    raw.dedicatedState.mode !== "broken-line" ||
    raw.dedicatedState.seriesCount !== 2 ||
    !p6NumbersClose(raw.dedicatedState.seriesBShift, shift) ||
    !Array.isArray(raw.dedicatedState.values) ||
    raw.dedicatedState.values.length !== 4 ||
    raw.dedicatedState.values.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(`${label}.dedicatedState must bind the exact visible dataset.`);
  }
  let serializedState;
  try {
    serializedState = JSON.parse(raw.serializedDedicatedState);
  } catch {
    throw new Error(`${label}.serializedDedicatedState must be readable JSON.`);
  }
  if (
    !serializedState ||
    typeof serializedState !== "object" ||
    Array.isArray(serializedState) ||
    serializedState.mode !== "broken-line" ||
    serializedState.seriesCount !== 2 ||
    !p6NumbersClose(Number(serializedState.seriesBShift), shift) ||
    raw.dedicatedState.values.some(
      (value, index) =>
        !p6NumbersClose(Number(serializedState[`value${index + 1}`]), value),
    )
  ) {
    throw new Error(`${label}.serializedDedicatedState drifted from dedicatedState.`);
  }
  if (
    !exactObjectKeys(raw.flags, ["seriesCoincident", "seriesMeansEqual"])
  ) {
    throw new Error(`${label}.flags schema drifted.`);
  }
  if (
    !Array.isArray(raw.tableRows) ||
    raw.tableRows.length !== 4 ||
    !exactObjectKeys(raw.points, ["A", "B"]) ||
    !Array.isArray(raw.points.A) ||
    !Array.isArray(raw.points.B) ||
    raw.points.A.length !== 4 ||
    raw.points.B.length !== 4 ||
    !exactObjectKeys(raw.segments, ["A", "B"]) ||
    !Array.isArray(raw.segments.A) ||
    !Array.isArray(raw.segments.B) ||
    raw.segments.A.length !== 3 ||
    raw.segments.B.length !== 3
  ) {
    throw new Error(`${label} must bind exact 4-row/4+4-point/3+3-segment evidence.`);
  }
  const hours = [9, 10, 11, 12];
  const expectedX = (index) => 94 + index * 92;
  const expectedY = (value) => 276 - (value / 14) * 242;
  for (let index = 0; index < 4; index += 1) {
    const row = raw.tableRows[index];
    const pointA = raw.points.A[index];
    const pointB = raw.points.B[index];
    if (!exactObjectKeys(row, ["hour", "seriesA", "seriesB"])) {
      throw new Error(`${label}.tableRows[${index}] schema drifted.`);
    }
    for (const [series, point] of [
      ["A", pointA],
      ["B", pointB],
    ]) {
      if (!exactObjectKeys(point, ["hour", "value", "x", "y"])) {
        throw new Error(`${label}.points.${series}[${index}] schema drifted.`);
      }
    }
    if (
      row.hour !== hours[index] ||
      pointA.hour !== hours[index] ||
      pointB.hour !== hours[index] ||
      !p6NumbersClose(row.seriesA, raw.dedicatedState.values[index]) ||
      !p6NumbersClose(row.seriesB, row.seriesA + shift) ||
      !p6NumbersClose(pointA.value, row.seriesA) ||
      !p6NumbersClose(pointB.value, row.seriesB) ||
      !p6NumbersClose(pointA.x, expectedX(index)) ||
      !p6NumbersClose(pointB.x, expectedX(index)) ||
      !p6NumbersClose(pointA.y, expectedY(pointA.value)) ||
      !p6NumbersClose(pointB.y, expectedY(pointB.value)) ||
      (shift === 0 && !p6NumbersClose(pointA.y, pointB.y)) ||
      (shift > 0 && !(pointB.y < pointA.y))
    ) {
      throw new Error(`${label} table and visible point ${index} drifted from B=A+shift.`);
    }
  }
  for (let index = 0; index < 3; index += 1) {
    const pointA0 = raw.points.A[index];
    const pointA1 = raw.points.A[index + 1];
    const pointB0 = raw.points.B[index];
    const pointB1 = raw.points.B[index + 1];
    for (const [series, segment, from, to] of [
      ["A", raw.segments.A[index], pointA0, pointA1],
      ["B", raw.segments.B[index], pointB0, pointB1],
    ]) {
      if (
        !exactObjectKeys(segment, [
          "fromHour",
          "fromValue",
          "toHour",
          "toValue",
          "x1",
          "x2",
          "y1",
          "y2",
        ]) ||
        segment.fromHour !== from.hour ||
        segment.toHour !== to.hour ||
        !p6NumbersClose(segment.fromValue, from.value) ||
        !p6NumbersClose(segment.toValue, to.value) ||
        !p6NumbersClose(segment.x1, from.x) ||
        !p6NumbersClose(segment.x2, to.x) ||
        !p6NumbersClose(segment.y1, from.y) ||
        !p6NumbersClose(segment.y2, to.y)
      ) {
        throw new Error(`${label}.segments.${series}[${index}] does not join adjacent points.`);
      }
    }
    if (
      (shift === 0 &&
        (!p6NumbersClose(raw.segments.A[index].y1, raw.segments.B[index].y1) ||
          !p6NumbersClose(raw.segments.A[index].y2, raw.segments.B[index].y2))) ||
      (shift > 0 &&
        !(raw.segments.B[index].y1 < raw.segments.A[index].y1 &&
          raw.segments.B[index].y2 < raw.segments.A[index].y2))
    ) {
      throw new Error(`${label} series segment geometry drifted for shift=${shift}.`);
    }
  }
  if (
    !exactObjectKeys(raw.meanLines, ["A", "B"]) ||
    !exactObjectKeys(raw.meanLines.A, ["value", "y"]) ||
    !exactObjectKeys(raw.meanLines.B, ["value", "y"])
  ) {
    throw new Error(`${label}.meanLines schema drifted.`);
  }
  const expectedMeanA =
    raw.tableRows.reduce((total, row) => total + row.seriesA, 0) / 4;
  const expectedMeanB = expectedMeanA + shift;
  const expectedEqual = shift === 0;
  if (
    !p6NumbersClose(raw.meanLines.A.value, expectedMeanA) ||
    !p6NumbersClose(raw.meanLines.B.value, expectedMeanB) ||
    !p6NumbersClose(raw.meanLines.A.y, expectedY(expectedMeanA)) ||
    !p6NumbersClose(raw.meanLines.B.y, expectedY(expectedMeanB)) ||
    raw.flags.seriesCoincident !== String(expectedEqual) ||
    raw.flags.seriesMeansEqual !== String(expectedEqual)
  ) {
    throw new Error(`${label} mean lines/flags drifted from the synchronized datasets.`);
  }
  if (
    !exactObjectKeys(raw.visibility, [
      "graph",
      "meanLines",
      "meanReadout",
      "points",
      "segments",
      "table",
      "tableRows",
    ]) ||
    !exactObjectKeys(raw.visibility.points, ["A", "B"]) ||
    !exactObjectKeys(raw.visibility.segments, ["A", "B"]) ||
    !exactObjectKeys(raw.visibility.meanLines, ["A", "B"]) ||
    !Array.isArray(raw.visibility.tableRows) ||
    raw.visibility.tableRows.length !== 4 ||
    !Array.isArray(raw.visibility.points.A) ||
    !Array.isArray(raw.visibility.points.B) ||
    raw.visibility.points.A.length !== 4 ||
    raw.visibility.points.B.length !== 4 ||
    !Array.isArray(raw.visibility.segments.A) ||
    !Array.isArray(raw.visibility.segments.B) ||
    raw.visibility.segments.A.length !== 3 ||
    raw.visibility.segments.B.length !== 3 ||
    !Array.isArray(raw.visibility.meanLines.A) ||
    !Array.isArray(raw.visibility.meanLines.B) ||
    raw.visibility.meanLines.A.length !== 1 ||
    raw.visibility.meanLines.B.length !== 1
  ) {
    throw new Error(`${label}.visibility must cover every table/graph mark exactly.`);
  }
  const visibilityEvidence = [
    ["graph", raw.visibility.graph],
    ["table", raw.visibility.table],
    ["meanReadout", raw.visibility.meanReadout],
    ...raw.visibility.tableRows.map((entry, index) => [`tableRows[${index}]`, entry]),
    ...raw.visibility.points.A.map((entry, index) => [`points.A[${index}]`, entry]),
    ...raw.visibility.points.B.map((entry, index) => [`points.B[${index}]`, entry]),
    ...raw.visibility.segments.A.map((entry, index) => [`segments.A[${index}]`, entry]),
    ...raw.visibility.segments.B.map((entry, index) => [`segments.B[${index}]`, entry]),
    ...raw.visibility.meanLines.A.map((entry, index) => [`meanLines.A[${index}]`, entry]),
    ...raw.visibility.meanLines.B.map((entry, index) => [`meanLines.B[${index}]`, entry]),
  ];
  for (const [visibilityLabel, evidence] of visibilityEvidence) {
    validateP6VisibilityRecord(`${label}.visibility.${visibilityLabel}`, evidence);
  }
  return raw;
}

function validateBrowserP6AveragesPackageAggregate(
  raw,
  packageTitle,
  scrollAggregate,
) {
  const aggregateKeys = [
    "aggregateHash",
    "boundaryObservationCount",
    "cellCount",
    "cells",
    "contractVersion",
  ];
  if (!exactObjectKeys(raw, aggregateKeys)) {
    throw new Error(`${packageTitle} P6 averages aggregate schema drifted.`);
  }
  if (
    raw.contractVersion !==
    HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION
  ) {
    throw new Error(`${packageTitle} P6 averages contractVersion drifted.`);
  }
  const expectedScrollCells = scrollAggregate.cells.filter(
    ({ cellId }) => cellId.split("/")[1] === HK_VISUALIZATION_P6_AVERAGES_LAB_ID,
  );
  requireScrollNonNegativeInteger(`${packageTitle}.P6.cellCount`, raw.cellCount);
  if (
    expectedScrollCells.length > 1 ||
    raw.cellCount !== expectedScrollCells.length ||
    !Array.isArray(raw.cells) ||
    raw.cells.length !== raw.cellCount
  ) {
    throw new Error(`${packageTitle} P6 cells differ from exact scroll cells.`);
  }
  if (raw.cellCount === 0) {
    if (raw.boundaryObservationCount !== 0) {
      throw new Error(`${packageTitle} non-P6 package must have zero P6 boundaries.`);
    }
  }
  for (let cellIndex = 0; cellIndex < raw.cells.length; cellIndex += 1) {
    const cell = raw.cells[cellIndex];
    const scrollCell = expectedScrollCells[cellIndex];
    const cellKeys = [
      "boundaries",
      "boundaryCount",
      "cellAggregateHash",
      "cellId",
      "labId",
      "phases",
    ];
    if (
      !exactObjectKeys(cell, cellKeys) ||
      cell.cellId !== scrollCell.cellId ||
      cell.labId !== HK_VISUALIZATION_P6_AVERAGES_LAB_ID ||
      !cell.cellId.startsWith(`P6/${HK_VISUALIZATION_P6_AVERAGES_LAB_ID}/`) ||
      cell.boundaryCount !== 2 ||
      !Array.isArray(cell.boundaries) ||
      cell.boundaries.length !== 2 ||
      !Array.isArray(cell.phases) ||
      cell.phases.length !== 2
    ) {
      throw new Error(`${packageTitle} P6 cell schema, identity, or count drifted.`);
    }
    const expectedBoundaries = ["zero-shift", "ordinary-positive"];
    const boundaryIndexes = [];
    cell.boundaries.forEach((boundary, boundaryIndex) => {
      if (
        !exactObjectKeys(boundary, [
          "boundary",
          "observation",
          "observationHash",
          "phase",
        ]) ||
        boundary.boundary !== expectedBoundaries[boundaryIndex] ||
        cell.phases[boundaryIndex] !== boundary.phase
      ) {
        throw new Error(`${packageTitle} P6 boundaries are missing, extra, or reordered.`);
      }
      const scrollPhaseIndex = scrollCell.phases.indexOf(boundary.phase);
      if (scrollPhaseIndex < 0) {
        throw new Error(`${packageTitle} P6 boundary phase is absent from scroll evidence.`);
      }
      boundaryIndexes.push(scrollPhaseIndex);
      validateBrowserP6AveragesObservation(
        boundary.observation,
        `${packageTitle}.${cell.cellId}.${boundary.boundary}`,
        boundary.phase,
      );
      if (
        (boundaryIndex === 0 && boundary.observation.seriesBShift !== 0) ||
        (boundaryIndex === 1 && !(boundary.observation.seriesBShift > 0))
      ) {
        throw new Error(`${packageTitle} P6 boundary shift semantics drifted.`);
      }
      const evidenceWithoutHash = {
        boundary: boundary.boundary,
        observation: boundary.observation,
        phase: boundary.phase,
      };
      requireScrollHash(
        `${packageTitle}.${cell.cellId}.${boundary.boundary}.observationHash`,
        boundary.observationHash,
      );
      if (
        boundary.observationHash !==
        hashScrollCanonical({
          cellId: cell.cellId,
          contractVersion:
            HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
          evidence: evidenceWithoutHash,
          kind: "browser-p6-averages-boundary-observation",
          labId: HK_VISUALIZATION_P6_AVERAGES_LAB_ID,
        })
      ) {
        throw new Error(`${packageTitle} P6 boundary observationHash drifted.`);
      }
    });
    if (boundaryIndexes[0] >= boundaryIndexes[1]) {
      throw new Error(`${packageTitle} P6 scroll phases must record zero before positive.`);
    }
    const cellEvidenceWithoutHash = {
      boundaries: cell.boundaries,
      boundaryCount: 2,
      cellId: cell.cellId,
      labId: HK_VISUALIZATION_P6_AVERAGES_LAB_ID,
      phases: cell.phases,
    };
    requireScrollHash(`${packageTitle}.${cell.cellId}.cellAggregateHash`, cell.cellAggregateHash);
    if (
      cell.cellAggregateHash !==
      hashScrollCanonical({
        contractVersion: HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
        evidence: cellEvidenceWithoutHash,
        kind: "browser-p6-averages-cell",
      })
    ) {
      throw new Error(`${packageTitle} P6 cellAggregateHash drifted.`);
    }
  }
  if (raw.boundaryObservationCount !== raw.cellCount * 2) {
    throw new Error(`${packageTitle} P6 boundaryObservationCount drifted.`);
  }
  const evidenceWithoutHash = {
    boundaryObservationCount: raw.boundaryObservationCount,
    cellCount: raw.cellCount,
    cells: raw.cells,
    contractVersion: HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
  };
  requireScrollHash(`${packageTitle}.P6.aggregateHash`, raw.aggregateHash);
  if (
    raw.aggregateHash !==
    hashScrollCanonical({
      contractVersion: HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-p6-averages-package",
    })
  ) {
    throw new Error(`${packageTitle} P6 aggregateHash drifted.`);
  }
  return raw;
}

export function validateHkVisualizationBrowserP6AveragesAnnotations(
  serializedTests,
) {
  if (!Array.isArray(serializedTests)) {
    throw new Error("HK Visualization serialized tests must be an array.");
  }
  const expectedTitleSet = new Set(hkVisualizationMachinePackageTitles);
  const packageTests = serializedTests.filter(
    ({ file, title }) =>
      typeof file === "string" &&
      file.replaceAll("\\", "/").endsWith(
        "hk-visualization-machine-acceptance.spec.ts",
      ) &&
      expectedTitleSet.has(title),
  );
  if (
    packageTests.length !== hkVisualizationExpectedMachinePackageCount ||
    !isDeepStrictEqual(
      packageTests.map(({ title }) => title),
      hkVisualizationMachinePackageTitles,
    )
  ) {
    throw new Error(
      "HK Visualization P6 averages packages are missing, duplicated, extra, or out of order.",
    );
  }
  const p6Aggregates = [];
  const scrollAggregates = [];
  for (const { entry, title } of packageTests) {
    const annotations = Array.isArray(entry?.annotations) ? entry.annotations : [];
    const parseExact = (type, validator) => {
      const matches = annotations.filter((annotation) => annotation?.type === type);
      if (matches.length !== 1) {
        throw new Error(
          `${title} must carry exactly one ${type} annotation; observed ${matches.length}.`,
        );
      }
      let raw;
      try {
        raw = JSON.parse(matches[0].description);
      } catch {
        throw new Error(`${title} ${type} annotation is unreadable JSON.`);
      }
      return validator(raw);
    };
    const scrollAggregate = parseExact(
      HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
      (raw) => validateBrowserScrollPackageAggregate(raw, title),
    );
    scrollAggregates.push(scrollAggregate);
    p6Aggregates.push(
      parseExact(
        HK_VISUALIZATION_BROWSER_P6_AVERAGES_ANNOTATION_TYPE,
        (raw) =>
          validateBrowserP6AveragesPackageAggregate(raw, title, scrollAggregate),
      ),
    );
  }
  const cells = p6Aggregates.flatMap(({ cells }) => cells);
  const actualCellIds = cells.map(({ cellId }) => cellId).sort();
  if (
    cells.length !== HK_VISUALIZATION_P6_AVERAGES_EXPECTED_CELL_COUNT ||
    new Set(actualCellIds).size !== actualCellIds.length ||
    !isDeepStrictEqual(actualCellIds, hkVisualizationExpectedP6AveragesCellIds)
  ) {
    throw new Error(
      `HK Visualization P6 averages cells must equal the exact P6 3x3x2 matrix (${HK_VISUALIZATION_P6_AVERAGES_EXPECTED_CELL_COUNT}).`,
    );
  }
  const boundaryObservationCount = p6Aggregates.reduce(
    (total, aggregate) => total + aggregate.boundaryObservationCount,
    0,
  );
  if (boundaryObservationCount !== cells.length * 2) {
    throw new Error("HK Visualization P6 boundary observation total drifted.");
  }
  const evidenceWithoutHash = {
    boundaryObservationCount,
    cellCount: cells.length,
    cellIds: cells.map(({ cellId }) => cellId),
    contractVersion:
      HK_VISUALIZATION_BROWSER_P6_AVERAGES_RUN_EVIDENCE_VERSION,
    packageAggregateHashes: p6Aggregates.map(({ aggregateHash }) => aggregateHash),
    packageCount: p6Aggregates.length,
    scrollPackageAggregateHashes: scrollAggregates.map(
      ({ aggregateHash }) => aggregateHash,
    ),
  };
  return Object.freeze({
    ...evidenceWithoutHash,
    runAggregateHash: hashScrollCanonical({
      contractVersion:
        HK_VISUALIZATION_BROWSER_P6_AVERAGES_RUN_EVIDENCE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-p6-averages-run-evidence",
    }),
  });
}

const hkVisualizationP6BudgetBoundaryContract = Object.freeze(
  ["represent", "solve", "check"].flatMap((modeId) =>
    ["positive-remaining", "exact-zero", "positive-overspend"].map(
      (boundary) => Object.freeze({ boundary, modeId }),
    ),
  ),
);

function validateP6BudgetVisibility(label, raw, requirePaint) {
  if (
    !exactObjectKeys(raw, [
      "ariaHiddenAncestor",
      "hiddenAncestor",
      "inertAncestor",
      "visuallyVisible",
    ]) ||
    typeof raw.visuallyVisible !== "boolean" ||
    raw.hiddenAncestor !== false ||
    raw.inertAncestor !== false ||
    raw.ariaHiddenAncestor !== false ||
    (requirePaint && raw.visuallyVisible !== true)
  ) {
    throw new Error(`${label} has invalid learner-visibility evidence.`);
  }
}

function validateP6BudgetRect(label, raw, expected) {
  if (!exactObjectKeys(raw, ["height", "width", "x", "y"])) {
    throw new Error(`${label} rectangle schema drifted.`);
  }
  for (const key of ["height", "width", "x", "y"]) {
    if (!p6NumbersClose(raw[key], expected[key])) {
      throw new Error(`${label}.${key} geometry drifted.`);
    }
  }
}

function validateBrowserP6BudgetObservation(raw, label, expectedPhase) {
  if (
    !exactObjectKeys(raw, [
      "boundary",
      "dedicatedState",
      "derived",
      "phase",
      "serializedDedicatedState",
      "surface",
    ]) ||
    raw.phase !== expectedPhase
  ) {
    throw new Error(`${label} schema or phase drifted.`);
  }
  if (
    !exactObjectKeys(raw.dedicatedState, [
      "budget",
      "count",
      "extraCost",
      "unitPrice",
      "workflowStep",
    ]) ||
    !["represent", "solve", "check"].includes(
      raw.dedicatedState.workflowStep,
    )
  ) {
    throw new Error(`${label}.dedicatedState schema drifted.`);
  }
  let serializedState;
  try {
    serializedState = JSON.parse(raw.serializedDedicatedState);
  } catch {
    throw new Error(`${label}.serializedDedicatedState is unreadable.`);
  }
  for (const key of ["budget", "count", "unitPrice", "extraCost"]) {
    if (
      !Number.isFinite(raw.dedicatedState[key]) ||
      !p6NumbersClose(Number(serializedState?.[key]), raw.dedicatedState[key])
    ) {
      throw new Error(`${label} raw/dedicated ${key} drifted.`);
    }
  }
  if (serializedState?.workflowStep !== raw.dedicatedState.workflowStep) {
    throw new Error(`${label} raw/dedicated workflowStep drifted.`);
  }
  const { budget, count, unitPrice, extraCost } = raw.dedicatedState;
  if (
    budget < 50 || budget > 200 ||
    count < 1 || count > 6 || !Number.isInteger(count) ||
    unitPrice < 5 || unitPrice > 40 ||
    extraCost < 0 || extraCost > 50
  ) {
    throw new Error(`${label} dedicated values left production domains.`);
  }
  const itemCost = count * unitPrice;
  const totalSpending = itemCost + extraCost;
  const remaining = budget - totalSpending;
  const withinBudget = remaining >= 0;
  const overspend = Math.max(0, -remaining);
  if (
    !exactObjectKeys(raw.derived, [
      "itemCost",
      "overspend",
      "remaining",
      "totalSpending",
      "withinBudget",
    ]) ||
    !p6NumbersClose(raw.derived.itemCost, itemCost) ||
    !p6NumbersClose(raw.derived.totalSpending, totalSpending) ||
    !p6NumbersClose(raw.derived.remaining, remaining) ||
    !p6NumbersClose(raw.derived.overspend, overspend) ||
    raw.derived.withinBudget !== withinBudget
  ) {
    throw new Error(`${label} derived budget arithmetic drifted.`);
  }
  const expectedBoundaryState = {
    "positive-remaining": { budget: 60, count: 5, unitPrice: 10, extraCost: 0 },
    "exact-zero": { budget: 50, count: 5, unitPrice: 10, extraCost: 0 },
    "positive-overspend": { budget: 50, count: 5, unitPrice: 10, extraCost: 10 },
  }[raw.boundary];
  if (
    !expectedBoundaryState ||
    Object.entries(expectedBoundaryState).some(
      ([key, value]) => !p6NumbersClose(raw.dedicatedState[key], value),
    )
  ) {
    throw new Error(`${label} boundary state drifted.`);
  }
  if (raw.surface?.kind !== raw.dedicatedState.workflowStep) {
    throw new Error(`${label} visible surface differs from workflowStep.`);
  }
  if (raw.surface.kind === "represent") {
    if (
      !exactObjectKeys(raw.surface, ["attributes", "geometry", "kind", "visibility"]) ||
      !exactObjectKeys(raw.surface.attributes, [
        "budget",
        "extraCost",
        "itemCost",
        "overspend",
        "remaining",
        "scaleTotal",
        "totalSpending",
        "withinBudget",
      ]) ||
      !exactObjectKeys(raw.surface.geometry, [
        "comparisonScale",
        "extra",
        "item",
        "marker",
        "overspend",
        "remainder",
      ]) ||
      !exactObjectKeys(raw.surface.visibility, [
        "comparisonScale",
        "extra",
        "item",
        "marker",
        "overspend",
        "remainder",
        "surface",
      ])
    ) {
      throw new Error(`${label} represent surface schema drifted.`);
    }
    const scaleTotal = Math.max(budget, totalSpending);
    const budgetWidth = 470 * budget / scaleTotal;
    const itemWidth = 470 * itemCost / scaleTotal;
    const extraWidth = 470 * extraCost / scaleTotal;
    const remainderWidth = withinBudget ? 470 * remaining / scaleTotal : 0;
    const overspendWidth = withinBudget ? 0 : 470 * overspend / scaleTotal;
    for (const [key, expected] of Object.entries({
      budget,
      extraCost,
      itemCost,
      overspend,
      remaining,
      scaleTotal,
      totalSpending,
    })) {
      if (!p6NumbersClose(raw.surface.attributes[key], expected)) {
        throw new Error(`${label} represent attribute ${key} drifted.`);
      }
    }
    if (raw.surface.attributes.withinBudget !== String(withinBudget)) {
      throw new Error(`${label} represent withinBudget drifted.`);
    }
    validateP6BudgetRect(
      `${label}.comparisonScale`,
      raw.surface.geometry.comparisonScale,
      { height: 92, width: 470, x: 85, y: 128 },
    );
    validateP6BudgetRect(`${label}.item`, raw.surface.geometry.item, {
      height: 92,
      width: itemWidth,
      x: 85,
      y: 128,
    });
    validateP6BudgetRect(`${label}.extra`, raw.surface.geometry.extra, {
      height: 92,
      width: extraWidth,
      x: 85 + itemWidth,
      y: 128,
    });
    const markerX = 85 + budgetWidth;
    if (
      !exactObjectKeys(raw.surface.geometry.marker, [
        "budget",
        "x1",
        "x2",
        "y1",
        "y2",
      ]) ||
      !p6NumbersClose(raw.surface.geometry.marker.budget, budget) ||
      !p6NumbersClose(raw.surface.geometry.marker.x1, markerX) ||
      !p6NumbersClose(raw.surface.geometry.marker.x2, markerX) ||
      !p6NumbersClose(raw.surface.geometry.marker.y1, 112) ||
      !p6NumbersClose(raw.surface.geometry.marker.y2, 246)
    ) {
      throw new Error(`${label} budget marker geometry drifted.`);
    }
    if (withinBudget) {
      if (!raw.surface.geometry.remainder || raw.surface.geometry.overspend !== null) {
        throw new Error(`${label} within-budget bar branch drifted.`);
      }
      const { remaining: observedRemaining, ...remainderRect } =
        raw.surface.geometry.remainder;
      validateP6BudgetRect(`${label}.remainder`, remainderRect, {
        height: 92,
        width: remainderWidth,
        x: 85 + itemWidth + extraWidth,
        y: 128,
      });
      if (!p6NumbersClose(observedRemaining, remaining)) {
        throw new Error(`${label} remainder value drifted.`);
      }
    } else {
      if (raw.surface.geometry.remainder !== null || !raw.surface.geometry.overspend) {
        throw new Error(`${label} overspend bar branch drifted.`);
      }
      const { overspend: observedOverspend, ...overspendRect } =
        raw.surface.geometry.overspend;
      validateP6BudgetRect(`${label}.overspend`, overspendRect, {
        height: 18,
        width: overspendWidth,
        x: markerX,
        y: 226,
      });
      if (!p6NumbersClose(observedOverspend, overspend)) {
        throw new Error(`${label} overspend value drifted.`);
      }
    }
    for (const [name, evidence, requirePaint] of [
      ["surface", raw.surface.visibility.surface, true],
      ["comparisonScale", raw.surface.visibility.comparisonScale, true],
      ["item", raw.surface.visibility.item, itemWidth > 0],
      ["extra", raw.surface.visibility.extra, extraWidth > 0],
      ["marker", raw.surface.visibility.marker, true],
    ]) {
      validateP6BudgetVisibility(`${label}.visibility.${name}`, evidence, requirePaint);
    }
    if (withinBudget) {
      if (!raw.surface.visibility.remainder || raw.surface.visibility.overspend !== null) {
        throw new Error(`${label} remainder visibility branch drifted.`);
      }
      validateP6BudgetVisibility(
        `${label}.visibility.remainder`,
        raw.surface.visibility.remainder,
        remainderWidth > 0,
      );
    } else {
      if (raw.surface.visibility.remainder !== null || !raw.surface.visibility.overspend) {
        throw new Error(`${label} overspend visibility branch drifted.`);
      }
      validateP6BudgetVisibility(
        `${label}.visibility.overspend`,
        raw.surface.visibility.overspend,
        overspendWidth > 0,
      );
    }
  } else if (raw.surface.kind === "solve") {
    if (
      !exactObjectKeys(raw.surface, ["kind", "result", "visibility"]) ||
      !exactObjectKeys(raw.surface.result, [
        "height",
        "kind",
        "overspend",
        "remaining",
        "totalSpending",
        "value",
        "width",
        "withinBudget",
        "x",
        "y",
      ]) ||
      !exactObjectKeys(raw.surface.visibility, ["result", "surface"])
    ) {
      throw new Error(`${label} solve surface schema drifted.`);
    }
    const expectedKind = withinBudget ? "remaining" : "overspend";
    const expectedValue = withinBudget ? remaining : overspend;
    const { kind, overspend: observedOverspend, remaining: observedRemaining,
      totalSpending: observedSpending, value, withinBudget: observedWithin,
      ...resultRect } = raw.surface.result;
    validateP6BudgetRect(`${label}.solve.result`, resultRect, {
      height: 68,
      width: 140,
      x: 466,
      y: 202,
    });
    if (
      kind !== expectedKind ||
      !p6NumbersClose(value, expectedValue) ||
      !p6NumbersClose(observedSpending, totalSpending) ||
      !p6NumbersClose(observedRemaining, remaining) ||
      !p6NumbersClose(observedOverspend, overspend) ||
      observedWithin !== String(withinBudget)
    ) {
      throw new Error(`${label} solve result drifted.`);
    }
    validateP6BudgetVisibility(`${label}.visibility.surface`, raw.surface.visibility.surface, true);
    validateP6BudgetVisibility(`${label}.visibility.result`, raw.surface.visibility.result, true);
  } else if (raw.surface.kind === "check") {
    if (
      !exactObjectKeys(raw.surface, ["balance", "geometry", "kind", "visibility"]) ||
      !exactObjectKeys(raw.surface.balance, [
        "left",
        "overspend",
        "remaining",
        "right",
        "status",
        "totalSpending",
        "withinBudget",
      ]) ||
      !exactObjectKeys(raw.surface.geometry, ["beam", "leftCard", "rightCard"]) ||
      !exactObjectKeys(raw.surface.visibility, ["beam", "leftCard", "rightCard", "surface"])
    ) {
      throw new Error(`${label} check surface schema drifted.`);
    }
    const expectedLeft = withinBudget ? totalSpending + remaining : budget + overspend;
    const expectedRight = withinBudget ? budget : totalSpending;
    if (
      !p6NumbersClose(raw.surface.balance.left, expectedLeft) ||
      !p6NumbersClose(raw.surface.balance.right, expectedRight) ||
      !p6NumbersClose(raw.surface.balance.totalSpending, totalSpending) ||
      !p6NumbersClose(raw.surface.balance.remaining, remaining) ||
      !p6NumbersClose(raw.surface.balance.overspend, overspend) ||
      raw.surface.balance.status !== (withinBudget ? "within-budget" : "over-budget") ||
      raw.surface.balance.withinBudget !== String(withinBudget)
    ) {
      throw new Error(`${label} check equality/status drifted.`);
    }
    if (
      !exactObjectKeys(raw.surface.geometry.beam, ["x1", "x2", "y1", "y2"]) ||
      !p6NumbersClose(raw.surface.geometry.beam.x1, 128) ||
      !p6NumbersClose(raw.surface.geometry.beam.x2, 512) ||
      !p6NumbersClose(raw.surface.geometry.beam.y1, 246) ||
      !p6NumbersClose(raw.surface.geometry.beam.y2, 246)
    ) {
      throw new Error(`${label} check beam geometry drifted.`);
    }
    validateP6BudgetRect(`${label}.leftCard`, raw.surface.geometry.leftCard, {
      height: 72,
      width: 172,
      x: 106,
      y: 126,
    });
    validateP6BudgetRect(`${label}.rightCard`, raw.surface.geometry.rightCard, {
      height: 72,
      width: 172,
      x: 362,
      y: 126,
    });
    for (const name of ["surface", "beam", "leftCard", "rightCard"]) {
      validateP6BudgetVisibility(
        `${label}.visibility.${name}`,
        raw.surface.visibility[name],
        true,
      );
    }
  } else {
    throw new Error(`${label} has an unknown workflow surface.`);
  }
  return raw;
}

function validateBrowserP6BudgetPackageAggregate(raw, packageTitle, scrollAggregate) {
  if (!exactObjectKeys(raw, [
    "aggregateHash",
    "boundaryObservationCount",
    "cellCount",
    "cells",
    "contractVersion",
  ])) {
    throw new Error(`${packageTitle} P6 budget aggregate schema drifted.`);
  }
  if (raw.contractVersion !== HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION) {
    throw new Error(`${packageTitle} P6 budget contractVersion drifted.`);
  }
  const expectedScrollCells = scrollAggregate.cells.filter(
    ({ cellId }) => cellId.split("/")[1] === HK_VISUALIZATION_P6_BUDGET_LAB_ID,
  );
  if (
    expectedScrollCells.length > 1 ||
    raw.cellCount !== expectedScrollCells.length ||
    !Array.isArray(raw.cells) ||
    raw.cells.length !== raw.cellCount
  ) {
    throw new Error(`${packageTitle} P6 budget cells differ from exact scroll cells.`);
  }
  for (let cellIndex = 0; cellIndex < raw.cells.length; cellIndex += 1) {
    const cell = raw.cells[cellIndex];
    const scrollCell = expectedScrollCells[cellIndex];
    if (
      !exactObjectKeys(cell, [
        "boundaries",
        "boundaryCount",
        "cellAggregateHash",
        "cellId",
        "labId",
        "phases",
      ]) ||
      cell.cellId !== scrollCell.cellId ||
      cell.labId !== HK_VISUALIZATION_P6_BUDGET_LAB_ID ||
      !cell.cellId.startsWith(`P6/${HK_VISUALIZATION_P6_BUDGET_LAB_ID}/`) ||
      cell.boundaryCount !== 9 ||
      !Array.isArray(cell.boundaries) || cell.boundaries.length !== 9 ||
      !Array.isArray(cell.phases) || cell.phases.length !== 9
    ) {
      throw new Error(`${packageTitle} P6 budget cell schema, identity, or count drifted.`);
    }
    const phaseIndexes = [];
    cell.boundaries.forEach((boundary, boundaryIndex) => {
      const expected = hkVisualizationP6BudgetBoundaryContract[boundaryIndex];
      if (
        !exactObjectKeys(boundary, [
          "boundary",
          "modeId",
          "observation",
          "observationHash",
          "phase",
        ]) ||
        boundary.boundary !== expected.boundary ||
        boundary.modeId !== expected.modeId ||
        cell.phases[boundaryIndex] !== boundary.phase
      ) {
        throw new Error(`${packageTitle} P6 budget boundaries are missing, extra, or reordered.`);
      }
      const phaseIndex = scrollCell.phases.indexOf(boundary.phase);
      if (phaseIndex < 0) {
        throw new Error(`${packageTitle} P6 budget boundary phase is absent from scroll evidence.`);
      }
      phaseIndexes.push(phaseIndex);
      validateBrowserP6BudgetObservation(
        boundary.observation,
        `${packageTitle}.${cell.cellId}.${boundary.modeId}.${boundary.boundary}`,
        boundary.phase,
      );
      if (
        boundary.observation.boundary !== expected.boundary ||
        boundary.observation.dedicatedState.workflowStep !== expected.modeId
      ) {
        throw new Error(`${packageTitle} P6 budget observation identity drifted.`);
      }
      const evidenceWithoutHash = {
        boundary: boundary.boundary,
        modeId: boundary.modeId,
        observation: boundary.observation,
        phase: boundary.phase,
      };
      requireScrollHash(`${packageTitle}.P6budget.observationHash`, boundary.observationHash);
      if (boundary.observationHash !== hashScrollCanonical({
        cellId: cell.cellId,
        contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
        evidence: evidenceWithoutHash,
        kind: "browser-p6-budget-boundary-observation",
        labId: HK_VISUALIZATION_P6_BUDGET_LAB_ID,
      })) {
        throw new Error(`${packageTitle} P6 budget boundary observationHash drifted.`);
      }
    });
    if (phaseIndexes.some((value, index) => index > 0 && value <= phaseIndexes[index - 1])) {
      throw new Error(`${packageTitle} P6 budget scroll phases are reordered.`);
    }
    const cellEvidenceWithoutHash = {
      boundaries: cell.boundaries,
      boundaryCount: 9,
      cellId: cell.cellId,
      labId: HK_VISUALIZATION_P6_BUDGET_LAB_ID,
      phases: cell.phases,
    };
    requireScrollHash(`${packageTitle}.P6budget.cellAggregateHash`, cell.cellAggregateHash);
    if (cell.cellAggregateHash !== hashScrollCanonical({
      contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
      evidence: cellEvidenceWithoutHash,
      kind: "browser-p6-budget-cell",
    })) {
      throw new Error(`${packageTitle} P6 budget cellAggregateHash drifted.`);
    }
  }
  if (raw.boundaryObservationCount !== raw.cellCount * 9) {
    throw new Error(`${packageTitle} P6 budget boundaryObservationCount drifted.`);
  }
  const evidenceWithoutHash = {
    boundaryObservationCount: raw.boundaryObservationCount,
    cellCount: raw.cellCount,
    cells: raw.cells,
    contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
  };
  requireScrollHash(`${packageTitle}.P6budget.aggregateHash`, raw.aggregateHash);
  if (raw.aggregateHash !== hashScrollCanonical({
    contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
    evidence: evidenceWithoutHash,
    kind: "browser-p6-budget-package",
  })) {
    throw new Error(`${packageTitle} P6 budget aggregateHash drifted.`);
  }
  return raw;
}

export function validateHkVisualizationBrowserP6BudgetAnnotations(serializedTests) {
  if (!Array.isArray(serializedTests)) {
    throw new Error("HK Visualization serialized tests must be an array.");
  }
  const expectedTitleSet = new Set(hkVisualizationMachinePackageTitles);
  const packageTests = serializedTests.filter(
    ({ file, title }) =>
      typeof file === "string" &&
      file.replaceAll("\\", "/").endsWith("hk-visualization-machine-acceptance.spec.ts") &&
      expectedTitleSet.has(title),
  );
  if (
    packageTests.length !== hkVisualizationExpectedMachinePackageCount ||
    !isDeepStrictEqual(packageTests.map(({ title }) => title), hkVisualizationMachinePackageTitles)
  ) {
    throw new Error("HK Visualization P6 budget packages are missing, duplicated, extra, or out of order.");
  }
  const budgetAggregates = [];
  const scrollAggregates = [];
  for (const { entry, title } of packageTests) {
    const annotations = Array.isArray(entry?.annotations) ? entry.annotations : [];
    const parseExact = (type, validator) => {
      const matches = annotations.filter((annotation) => annotation?.type === type);
      if (matches.length !== 1) {
        throw new Error(`${title} must carry exactly one ${type} annotation; observed ${matches.length}.`);
      }
      let raw;
      try {
        raw = JSON.parse(matches[0].description);
      } catch {
        throw new Error(`${title} ${type} annotation is unreadable JSON.`);
      }
      return validator(raw);
    };
    const scrollAggregate = parseExact(
      HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
      (raw) => validateBrowserScrollPackageAggregate(raw, title),
    );
    scrollAggregates.push(scrollAggregate);
    budgetAggregates.push(parseExact(
      HK_VISUALIZATION_BROWSER_P6_BUDGET_ANNOTATION_TYPE,
      (raw) => validateBrowserP6BudgetPackageAggregate(raw, title, scrollAggregate),
    ));
  }
  const cells = budgetAggregates.flatMap(({ cells }) => cells);
  const actualCellIds = cells.map(({ cellId }) => cellId).sort();
  if (
    cells.length !== HK_VISUALIZATION_P6_BUDGET_EXPECTED_CELL_COUNT ||
    new Set(actualCellIds).size !== actualCellIds.length ||
    !isDeepStrictEqual(actualCellIds, hkVisualizationExpectedP6BudgetCellIds)
  ) {
    throw new Error(`HK Visualization P6 budget cells must equal the exact P6 3x3x2 matrix (${HK_VISUALIZATION_P6_BUDGET_EXPECTED_CELL_COUNT}).`);
  }
  const boundaryObservationCount = budgetAggregates.reduce(
    (total, aggregate) => total + aggregate.boundaryObservationCount,
    0,
  );
  if (boundaryObservationCount !== cells.length * 9) {
    throw new Error("HK Visualization P6 budget boundary observation total drifted.");
  }
  const evidenceWithoutHash = {
    boundaryObservationCount,
    cellCount: cells.length,
    cellIds: cells.map(({ cellId }) => cellId),
    contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_RUN_EVIDENCE_VERSION,
    packageAggregateHashes: budgetAggregates.map(({ aggregateHash }) => aggregateHash),
    packageCount: budgetAggregates.length,
    scrollPackageAggregateHashes: scrollAggregates.map(({ aggregateHash }) => aggregateHash),
  };
  return Object.freeze({
    ...evidenceWithoutHash,
    runAggregateHash: hashScrollCanonical({
      contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_RUN_EVIDENCE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-p6-budget-run-evidence",
    }),
  });
}

export function validateHkVisualizationRuntimeProfileReceipt(
  receipt,
  { expectedPathManifest, expectedTests } = {},
) {
  const issues = [];
  const pathManifestIssues = validateHkVisualizationStarshipPathManifest(
    expectedPathManifest,
  );
  if (pathManifestIssues.length > 0) {
    issues.push(`pathManifest=[${pathManifestIssues.join("; ")}]`);
  }
  if (!Array.isArray(expectedTests) || expectedTests.length === 0) {
    issues.push("expectedTests must be a non-empty array");
  }
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    issues.push("receipt must be an object");
  }
  if (issues.length > 0) {
    throw new Error(
      `HK Visualization runtime browser-profile receipt is invalid: ${issues.join("; ")}.`,
    );
  }

  const canonicalExpectedTests = expectedTests.map((testCase) => ({
    file: testCase.file,
    id: testCase.id,
    title: testCase.title,
  }));
  if (
    canonicalExpectedTests.some(
      (testCase) =>
        typeof testCase.file !== "string" ||
        !testCase.file ||
        typeof testCase.id !== "string" ||
        !testCase.id ||
        typeof testCase.title !== "string" ||
        !testCase.title,
    )
  ) {
    issues.push("expected test identities are incomplete");
  }
  if (
    new Set(canonicalExpectedTests.map((testCase) => testCase.id)).size !==
    canonicalExpectedTests.length
  ) {
    issues.push("expected test ids are not unique");
  }
  if (
    receipt.contractVersion !==
    HK_VISUALIZATION_RUNTIME_PROFILE_RECEIPT_VERSION
  ) {
    issues.push(`contractVersion=${String(receipt.contractVersion)}`);
  }
  if (receipt.scope !== "canonical") {
    issues.push(`scope=${String(receipt.scope)}`);
  }
  if (receipt.runId !== expectedPathManifest.runId) {
    issues.push(`runId=${String(receipt.runId)}`);
  }
  if (receipt.manifestHash !== expectedPathManifest.manifestHash) {
    issues.push(`manifestHash=${String(receipt.manifestHash)}`);
  }
  if (receipt.receiptPath !== expectedPathManifest.runtimeProfileReceiptPath) {
    issues.push(`receiptPath=${String(receipt.receiptPath)}`);
  }
  if (receipt.plannedTestCount !== canonicalExpectedTests.length) {
    issues.push(`plannedTestCount=${String(receipt.plannedTestCount)}`);
  }
  if (receipt.sampledTestCount !== canonicalExpectedTests.length) {
    issues.push(`sampledTestCount=${String(receipt.sampledTestCount)}`);
  }
  if (!isDeepStrictEqual(receipt.plannedTests, canonicalExpectedTests)) {
    issues.push("plannedTests do not match the JSON report topology and order");
  }
  if (
    !Array.isArray(receipt.observationErrors) ||
    receipt.observationErrors.length !== 0
  ) {
    issues.push(
      `observationErrors=${JSON.stringify(receipt.observationErrors)}`,
    );
  }
  const samples = Array.isArray(receipt.samples) ? receipt.samples : [];
  if (samples.length !== canonicalExpectedTests.length) {
    issues.push(`samples.length=${samples.length}`);
  }
  const observedSampleIds = [];
  const observedProfileUnion = new Set();
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const expectedTest = canonicalExpectedTests[index];
    if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
      issues.push(`sample[${index}] is not an object`);
      continue;
    }
    observedSampleIds.push(sample.id);
    if (sample.ordinal !== index) {
      issues.push(`sample[${index}].ordinal=${String(sample.ordinal)}`);
    }
    if (
      expectedTest &&
      !isDeepStrictEqual(
        { file: sample.file, id: sample.id, title: sample.title },
        expectedTest,
      )
    ) {
      issues.push(`sample[${index}] identity drift`);
    }
    if (sample.observationError !== null) {
      issues.push(
        `sample[${index}].observationError=${String(sample.observationError)}`,
      );
    }
    if (
      !Array.isArray(sample.profilePaths) ||
      !Array.isArray(sample.rawProfilePaths) ||
      !isDeepStrictEqual(sample.rawProfilePaths, sample.profilePaths)
    ) {
      issues.push(`sample[${index}] profile schema/raw drift`);
      continue;
    }
    if (sample.profilePaths.length > 0) {
      try {
        const validated = assertHkVisualizationBrowserProfilePaths(
          sample.profilePaths,
          expectedPathManifest,
        );
        for (const profilePath of validated) {
          observedProfileUnion.add(profilePath);
        }
      } catch (error) {
        issues.push(
          `sample[${index}] profiles=${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      issues.push(`sample[${index}] has no managed browser profile`);
    }
  }
  if (new Set(observedSampleIds).size !== observedSampleIds.length) {
    issues.push("sample test ids are not unique");
  }
  const expectedTargets = canonicalExpectedTests.filter(
    (testCase) =>
      testCase.file === runtimeEvidenceFile &&
      testCase.title === runtimeEvidenceTitle,
  );
  if (expectedTargets.length !== 1) {
    issues.push(
      `canonical runtime evidence anchor count=${expectedTargets.length}`,
    );
  }
  const expectedTarget = expectedTargets[0] ?? null;
  if (!isDeepStrictEqual(receipt.target, expectedTarget)) {
    issues.push("receipt target does not match the canonical non-HK anchor");
  }
  const anchorSample = samples.find(
    (sample) => sample?.id === expectedTarget?.id,
  );
  if (
    !anchorSample ||
    !Array.isArray(anchorSample.profilePaths) ||
    anchorSample.profilePaths.length === 0
  ) {
    issues.push("canonical non-HK anchor has no browser profile sample");
  }
  const recomputedProfileUnion = [...observedProfileUnion].sort();
  let actualBrowserProfilePaths = null;
  try {
    actualBrowserProfilePaths = assertHkVisualizationBrowserProfilePaths(
      receipt.actualBrowserProfilePaths,
      expectedPathManifest,
    );
  } catch (error) {
    issues.push(
      `actualBrowserProfilePaths=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    actualBrowserProfilePaths &&
    !isDeepStrictEqual(actualBrowserProfilePaths, recomputedProfileUnion)
  ) {
    issues.push("actualBrowserProfilePaths do not equal the sample union");
  }
  if (issues.length > 0) {
    throw new Error(
      `HK Visualization runtime browser-profile receipt is invalid: ${issues.join("; ")}.`,
    );
  }
  return Object.freeze({
    actualBrowserProfilePaths: Object.freeze([...actualBrowserProfilePaths]),
    sampledTestCount: samples.length,
  });
}

export function validateHkVisualizationReleaseReport(
  report,
  {
    cwd,
    expectedPathManifest,
    releaseSourceReceipt,
    runtimeProfileReceipt,
  } = {},
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error(
      "HK Visualization Playwright JSON report is missing or not an object.",
    );
  }
  const stats = report.stats;
  if (!stats || typeof stats !== "object") {
    throw new Error(
      "HK Visualization Playwright JSON report has no stats object.",
    );
  }
  const reportErrorsSchemaValid = Array.isArray(report.errors);
  const errors = reportErrorsSchemaValid ? report.errors : [];
  const files = new Set();
  const serializedTests = [];
  collectReportTests(report.suites, files, serializedTests);
  const tests = serializedTests.map(({ entry }) => entry);
  const reportRootDir =
    typeof report.config?.rootDir === "string" && report.config.rootDir.trim()
      ? resolve(report.config.rootDir)
      : null;
  if (!reportRootDir) {
    throw new Error(
      "HK Visualization Playwright JSON report has no absolute config.rootDir for exact spec attribution.",
    );
  }
  const workspace = cwd
    ? resolve(cwd)
    : reportRootDir.endsWith(join("tests", "e2e"))
      ? resolve(reportRootDir, "../..")
      : reportRootDir;
  const configurationIssues = [];
  const receiptExpectedTests = serializedTests.map(
    ({ file, id, title }) => ({
      file:
        typeof file === "string"
          ? relative(workspace, resolve(reportRootDir, file)).replaceAll(
              "\\",
              "/",
            )
          : "",
      id: typeof id === "string" ? id : "",
      title: typeof title === "string" ? title : "",
    }),
  );
  const reportedPathManifest =
    report.config?.metadata?.hkVisualizationStarshipPathManifest;
  const reportedPathIssues = validateHkVisualizationStarshipPathManifest(
    reportedPathManifest,
  );
  if (reportedPathIssues.length > 0) {
    configurationIssues.push(
      `starship-path-manifest=[${reportedPathIssues.join("; ")}]`,
    );
  }
  if (
    expectedPathManifest &&
    !isDeepStrictEqual(reportedPathManifest, expectedPathManifest)
  ) {
    configurationIssues.push("starship-path-manifest-does-not-match-run-plan");
  }
  const pathManifest = expectedPathManifest ?? reportedPathManifest;
  const expectedConfigFile = resolve(workspace, "playwright.config.ts");
  if (
    typeof report.config.configFile !== "string" ||
    resolve(report.config.configFile) !== expectedConfigFile
  ) {
    configurationIssues.push(`configFile=${String(report.config.configFile)}`);
  }
  if (reportRootDir !== resolve(workspace, "tests/e2e")) {
    configurationIssues.push(`rootDir=${reportRootDir}`);
  }
  if (report.config.forbidOnly !== true)
    configurationIssues.push(`forbidOnly=${String(report.config.forbidOnly)}`);
  if (report.config.fullyParallel !== false) {
    configurationIssues.push(
      `fullyParallel=${String(report.config.fullyParallel)}`,
    );
  }
  if (
    !report.config.grep ||
    typeof report.config.grep !== "object" ||
    Object.keys(report.config.grep).length !== 0
  ) {
    configurationIssues.push("grep-must-serialize-empty");
  }
  if (report.config.grepInvert !== null)
    configurationIssues.push("grepInvert-must-be-null");
  if (report.config.maxFailures !== 0)
    configurationIssues.push(
      `maxFailures=${String(report.config.maxFailures)}`,
    );
  if (report.config.shard !== null)
    configurationIssues.push("shard-must-be-null");
  if (report.config.workers !== 1)
    configurationIssues.push(`workers=${String(report.config.workers)}`);
  if (report.config.metadata?.actualWorkers !== 1) {
    configurationIssues.push(
      `actualWorkers=${String(report.config.metadata?.actualWorkers)}`,
    );
  }
  if (report.config.updateSnapshots !== "none") {
    configurationIssues.push(
      `updateSnapshots=${String(report.config.updateSnapshots)}`,
    );
  }
  const reporterNames = Array.isArray(report.config.reporter)
    ? report.config.reporter.map((entry) =>
        Array.isArray(entry) ? entry[0] : null,
      )
    : [];
  if (
    reporterNames.length !== 3 ||
    typeof reporterNames[0] !== "string" ||
    resolve(reporterNames[0]) !== canonicalReporterPath ||
    reporterNames[1] !== "list" ||
    reporterNames[2] !== "json"
  ) {
    configurationIssues.push(`reporters=[${reporterNames.join(", ")}]`);
  }
  const configuredProjects = Array.isArray(report.config.projects)
    ? report.config.projects
    : [];
  const canonicalProjectConfig = configuredProjects.find(
    (project) =>
      project?.id === canonicalProject && project?.name === canonicalProject,
  );
  if (!canonicalProjectConfig) {
    configurationIssues.push("canonical-project-missing");
  } else {
    if (
      !Number.isSafeInteger(canonicalProjectConfig.timeout) ||
      canonicalProjectConfig.timeout < 1 ||
      canonicalProjectConfig.timeout >
        HK_VISUALIZATION_STATIC_TEST_TIMEOUT_CAP_MS
    ) {
      configurationIssues.push(
        `project.timeout=${String(canonicalProjectConfig.timeout)} must be a resolved positive integer <=120000`,
      );
    }
    if (canonicalProjectConfig.repeatEach !== 1) {
      configurationIssues.push(
        `project.repeatEach=${String(canonicalProjectConfig.repeatEach)}`,
      );
    }
    if (canonicalProjectConfig.retries !== 0) {
      configurationIssues.push(
        `project.retries=${String(canonicalProjectConfig.retries)}`,
      );
    }
    if (
      resolve(canonicalProjectConfig.testDir ?? "") !==
      resolve(workspace, "tests/e2e")
    ) {
      configurationIssues.push(
        `project.testDir=${String(canonicalProjectConfig.testDir)}`,
      );
    }
    if (canonicalProjectConfig.metadata?.actualWorkers !== 1) {
      configurationIssues.push(
        `project.actualWorkers=${String(canonicalProjectConfig.metadata?.actualWorkers)}`,
      );
    }
    if (
      !pathManifest ||
      canonicalProjectConfig.outputDir !== pathManifest.outputDir
    ) {
      configurationIssues.push(
        `project.outputDir=${String(canonicalProjectConfig.outputDir)}`,
      );
    }
  }
  const webServer = report.config.webServer;
  if (!webServer || typeof webServer !== "object" || Array.isArray(webServer)) {
    configurationIssues.push("managed-webServer-missing");
  } else {
    if (webServer.url !== "http://127.0.0.1:3020") {
      configurationIssues.push(`webServer.url=${String(webServer.url)}`);
    }
    if (webServer.reuseExistingServer !== false) {
      configurationIssues.push(
        `webServer.reuseExistingServer=${String(webServer.reuseExistingServer)}`,
      );
    }
    const command =
      typeof webServer.command === "string" ? webServer.command : "";
    const reportedCommandHash =
      report.config.metadata?.hkVisualizationWebServerCommandSha256;
    let expectedCommand = null;
    try {
      expectedCommand = buildHkVisualizationManagedWebServerCommand({
        manifest: pathManifest,
        port: 3020,
      });
    } catch (error) {
      configurationIssues.push(
        `webServer.canonicalCommand=${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (expectedCommand !== null && command !== expectedCommand) {
      configurationIssues.push("webServer.command-canonical-drift");
    }
    if (
      typeof reportedCommandHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(reportedCommandHash) ||
      reportedCommandHash !== sha256Text(command) ||
      (expectedCommand !== null &&
        reportedCommandHash !== sha256Text(expectedCommand))
    ) {
      configurationIssues.push(
        `webServer.commandHash=${String(reportedCommandHash)}`,
      );
    }
    let managedToolchainIdentity = null;
    try {
      managedToolchainIdentity =
        captureHkVisualizationManagedToolchainIdentity(pathManifest);
    } catch (error) {
      configurationIssues.push(
        `webServer.managedToolchain=${error instanceof Error ? error.message : String(error)}`,
      );
    }
    for (const requiredCommandToken of [
      "NEXT_DIST_DIR",
      managedToolchainIdentity?.nodeExecutable?.path,
      managedToolchainIdentity?.nextBuildScript?.path,
      managedToolchainIdentity?.nextCli?.path,
      pathManifest?.artifactRoot,
      pathManifest?.nextDistDir,
      pathManifest?.nextTsconfigPath,
      pathManifest?.databasePath,
      pathManifest?.runtimeTmpDir,
      pathManifest?.serviceLogDir,
      pathManifest?.servicePidDir,
    ].filter(Boolean)) {
      if (!command.includes(requiredCommandToken))
        configurationIssues.push(
          `webServer.command-missing=${requiredCommandToken}`,
        );
    }
    if (/(?:^|[;&|]\s*)npm(?:\s|$)/.test(command)) {
      configurationIssues.push("webServer.command-uses-path-resolved-npm");
    }
    for (const [name, expectedValue, expectedCount] of [
      ["HOME", pathManifest?.runtimeTmpDir, 2],
      ["TMPDIR", pathManifest?.runtimeTmpDir, 2],
      ["TMP", pathManifest?.runtimeTmpDir, 2],
      ["TEMP", pathManifest?.runtimeTmpDir, 2],
      ["SQLITE_TMPDIR", pathManifest?.sqliteTmpDir, 2],
      ["NODE_COMPILE_CACHE", pathManifest?.nodeCompileCacheDir, 2],
      ["NPM_CONFIG_CACHE", pathManifest?.npmCacheDir, 2],
      ["npm_config_cache", pathManifest?.npmCacheDir, 2],
      ["NPM_CONFIG_LOGS_DIR", pathManifest?.npmLogsDir, 2],
      ["npm_config_logs_dir", pathManifest?.npmLogsDir, 2],
      ["XDG_CACHE_HOME", pathManifest?.xdgCacheDir, 2],
      ["XDG_CONFIG_HOME", pathManifest?.xdgConfigDir, 2],
      ["XDG_STATE_HOME", pathManifest?.xdgStateDir, 2],
      [
        "NEXT_DIST_DIR",
        pathManifest
          ? relative(pathManifest.workspace, pathManifest.nextDistDir)
          : undefined,
        2,
      ],
      [
        "NEXT_TSCONFIG_PATH",
        pathManifest
          ? relative(pathManifest.workspace, pathManifest.nextTsconfigPath)
          : undefined,
        1,
      ],
      ["HK_MATH_DB_PATH", pathManifest?.databasePath, 1],
    ]) {
      const values = shellAssignmentValues(command, name);
      if (
        !expectedValue ||
        values.length !== expectedCount ||
        values.some((value) => value !== expectedValue)
      ) {
        configurationIssues.push(
          `webServer.${name}=${JSON.stringify(values)}`,
        );
      }
    }
    const forbiddenCommandPaths = [
      ...["/tmp/", "/var/folders/"].filter((value) =>
        command.includes(value),
      ),
      ...[
        ...command.matchAll(/\/Users\/[^/\s'\"]+\/Desktop\//g),
      ].map((match) => match[0]),
    ];
    if (forbiddenCommandPaths.length > 0) {
      configurationIssues.push(
        `webServer.forbiddenPaths=[${forbiddenCommandPaths.join(", ")}]`,
      );
    }
  }
  const expectedFilesByAbsolutePath = new Map(
    HK_VISUALIZATION_RELEASE_SPECS.map((file) => [
      resolve(workspace, file),
      file,
    ]),
  );
  const actualFilesByAbsolutePath = new Map(
    [...files].map((file) => {
      const absolutePath = resolve(reportRootDir, file);
      return [absolutePath, file];
    }),
  );
  const actualTestCountsByAbsolutePath = new Map();
  const actualTestTitlesByAbsolutePath = new Map();
  const testsWithoutFileAttribution = [];
  const testsWithoutTitle = [];
  for (const serializedTest of serializedTests) {
    if (!serializedTest.file) {
      testsWithoutFileAttribution.push(serializedTest.title ?? "missing-title");
      continue;
    }
    const absolutePath = resolve(reportRootDir, serializedTest.file);
    actualTestCountsByAbsolutePath.set(
      absolutePath,
      (actualTestCountsByAbsolutePath.get(absolutePath) ?? 0) + 1,
    );
    if (!serializedTest.title) {
      testsWithoutTitle.push(serializedTest.file);
      continue;
    }
    const titles = actualTestTitlesByAbsolutePath.get(absolutePath) ?? [];
    titles.push(serializedTest.title);
    actualTestTitlesByAbsolutePath.set(absolutePath, titles);
  }
  for (const row of HK_VISUALIZATION_STATIC_TEST_TIMEOUT_ROWS) {
    const matches = serializedTests.filter(
      (serializedTest) =>
        serializedTest.file &&
        resolve(reportRootDir, serializedTest.file) ===
          resolve(workspace, row.file) &&
        serializedTest.title === row.title,
    );
    if (matches.length !== 1) {
      configurationIssues.push(
        `exact6-test-timeout-topology=${row.file}:${row.title}:count=${matches.length}`,
      );
      continue;
    }
    const resolvedTimeout = matches[0].entry?.timeout;
    if (
      !Number.isSafeInteger(resolvedTimeout) ||
      resolvedTimeout < 1 ||
      resolvedTimeout > HK_VISUALIZATION_STATIC_TEST_TIMEOUT_CAP_MS
    ) {
      configurationIssues.push(
        `exact6-test-timeout=${row.file}:${row.title}:${String(resolvedTimeout)} must be a resolved positive integer <=120000`,
      );
    }
  }
  const baseUrlEvidenceTest = serializedTests.find(
    (serializedTest) =>
      serializedTest.file &&
      resolve(reportRootDir, serializedTest.file) ===
        resolve(
          workspace,
          "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
        ) &&
      serializedTest.title ===
        "matrix manifest is complete for the requested scope",
  );
  const baseUrlAnnotations = Array.isArray(
    baseUrlEvidenceTest?.entry?.annotations,
  )
    ? baseUrlEvidenceTest.entry.annotations.filter(
        (annotation) => annotation?.type === "hk-viz-base-url",
      )
    : [];
  if (
    baseUrlAnnotations.length !== 1 ||
    baseUrlAnnotations[0]?.description !== "http://127.0.0.1:3020"
  ) {
    configurationIssues.push(
      `actual-test-base-url=${baseUrlAnnotations.map((annotation) => String(annotation?.description)).join("|") || "missing"}`,
    );
  }
  const runtimeEvidenceTest = serializedTests.find(
    (serializedTest) =>
      serializedTest.file &&
      resolve(reportRootDir, serializedTest.file) ===
        resolve(workspace, runtimeEvidenceFile) &&
      serializedTest.title === runtimeEvidenceTitle,
  );
  const runtimeEvidenceAnnotations = Array.isArray(
    runtimeEvidenceTest?.entry?.annotations,
  )
    ? runtimeEvidenceTest.entry.annotations.filter(
        (annotation) => annotation?.type === runtimeEvidenceAnnotation,
      )
    : [];
  let runtimeEvidence = null;
  if (
    runtimeEvidenceAnnotations.length === 1 &&
    typeof runtimeEvidenceAnnotations[0]?.description === "string"
  ) {
    try {
      runtimeEvidence = JSON.parse(runtimeEvidenceAnnotations[0].description);
    } catch {
      configurationIssues.push(
        "canonical-browser-device-evidence=invalid-json",
      );
    }
  } else {
    configurationIssues.push(
      `canonical-browser-device-evidence-count=${runtimeEvidenceAnnotations.length}`,
    );
  }
  if (runtimeEvidence) {
    for (const [field, expected] of Object.entries(
      canonicalBrowserDeviceEvidence,
    )) {
      if (!isDeepStrictEqual(runtimeEvidence[field], expected)) {
        configurationIssues.push(
          `canonical-browser-device.${field}=${JSON.stringify(runtimeEvidence[field])}`,
        );
      }
    }
    if (
      typeof runtimeEvidence.userAgent !== "string" ||
      !/^Mozilla\/5\.0 \(Windows NT 10\.0; Win64; x64\).* Chrome\/\d+\.\d+\.\d+\.\d+ Safari\/\d+\.\d+$/.test(
        runtimeEvidence.userAgent,
      )
    ) {
      configurationIssues.push(
        `canonical-browser-device.userAgent=${JSON.stringify(runtimeEvidence.userAgent)}`,
      );
    }
  }
  const runtimePathAnnotations = Array.isArray(
    runtimeEvidenceTest?.entry?.annotations,
  )
    ? runtimeEvidenceTest.entry.annotations.filter(
        (annotation) => annotation?.type === runtimePathEvidenceAnnotation,
      )
    : [];
  let runtimePathEvidence = null;
  if (
    runtimePathAnnotations.length === 1 &&
    typeof runtimePathAnnotations[0]?.description === "string"
  ) {
    try {
      runtimePathEvidence = JSON.parse(runtimePathAnnotations[0].description);
    } catch {
      configurationIssues.push("starship-runtime-path-evidence=invalid-json");
    }
  } else {
    configurationIssues.push(
      `starship-runtime-path-evidence-count=${runtimePathAnnotations.length}`,
    );
  }
  let actualBrowserProfilePaths = null;
  let runtimeProfileReceiptEvidence = null;
  try {
    runtimeProfileReceiptEvidence =
      validateHkVisualizationRuntimeProfileReceipt(runtimeProfileReceipt, {
        expectedPathManifest: pathManifest,
        expectedTests: receiptExpectedTests,
      });
    actualBrowserProfilePaths =
      runtimeProfileReceiptEvidence.actualBrowserProfilePaths;
  } catch (error) {
    configurationIssues.push(
      `runtime-profile-receipt=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (runtimePathEvidence) {
    if (!isDeepStrictEqual(runtimePathEvidence.manifest, pathManifest)) {
      configurationIssues.push("starship-runtime-path-manifest-drift");
    }
    try {
      const annotationBrowserProfilePaths =
        assertHkVisualizationBrowserProfilePaths(
        runtimePathEvidence.actualBrowserProfilePaths,
        pathManifest,
      );
      if (
        actualBrowserProfilePaths &&
        !isDeepStrictEqual(
          annotationBrowserProfilePaths,
          actualBrowserProfilePaths,
        )
      ) {
        configurationIssues.push(
          "starship-runtime-path-annotation-receipt-union-drift",
        );
      }
    } catch (error) {
      configurationIssues.push(
        `starship-browser-profiles=${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const receiptTarget = runtimeProfileReceipt?.target ?? null;
    const receiptAnchorSample = Array.isArray(runtimeProfileReceipt?.samples)
      ? runtimeProfileReceipt.samples.find(
          (sample) => sample?.id === receiptTarget?.id,
        )
      : null;
    for (const [field, expected] of [
      [
        "anchorBrowserProfilePaths",
        receiptAnchorSample?.profilePaths ?? null,
      ],
      ["observationErrorCount", 0],
      ["plannedTestCount", receiptExpectedTests.length],
      [
        "receiptContractVersion",
        HK_VISUALIZATION_RUNTIME_PROFILE_RECEIPT_VERSION,
      ],
      [
        "runtimeProfileReceiptPath",
        pathManifest?.runtimeProfileReceiptPath,
      ],
      ["sampledTestCount", receiptExpectedTests.length],
      ["scope", "canonical"],
      ["target", receiptTarget],
    ]) {
      if (!isDeepStrictEqual(runtimePathEvidence[field], expected)) {
        configurationIssues.push(
          `starship-runtime-path-evidence.${field}=${JSON.stringify(runtimePathEvidence[field])}`,
        );
      }
    }
  }
  let browserScrollEvidence = null;
  try {
    browserScrollEvidence =
      validateHkVisualizationBrowserScrollAnnotations(serializedTests);
  } catch (error) {
    configurationIssues.push(
      `browser-scroll-evidence=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let browserDependentTransitionEvidence = null;
  try {
    browserDependentTransitionEvidence =
      validateHkVisualizationBrowserDependentTransitionAnnotations(
        serializedTests,
      );
  } catch (error) {
    configurationIssues.push(
      `browser-dependent-transition-evidence=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let browserPassThroughOracleEvidence = null;
  try {
    browserPassThroughOracleEvidence =
      validateHkVisualizationBrowserPassThroughOracleAnnotations(
        serializedTests,
      );
  } catch (error) {
    configurationIssues.push(
      `browser-pass-through-oracle-evidence=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let browserPassThroughPaintedGeometryPairEvidence = null;
  try {
    browserPassThroughPaintedGeometryPairEvidence =
      validateHkVisualizationBrowserPassThroughPaintedGeometryPairAnnotations(
        serializedTests,
        {
          expectedPathManifest: pathManifest,
          expectedWorkspace:
            pathManifest.sourceWorkspace ?? pathManifest.workspace,
          releaseSourceReceipt,
        },
      );
  } catch (error) {
    configurationIssues.push(
      `browser-pass-through-painted-geometry-pair-evidence=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let staticDeadlineSourceEvidence = null;
  try {
    staticDeadlineSourceEvidence =
      validateHkVisualizationStaticDeadlineSourceReceipt(
        releaseSourceReceipt,
        {
          expectedPathManifest: pathManifest,
          expectedWorkspace:
            pathManifest.sourceWorkspace ?? pathManifest.workspace,
        },
      );
  } catch (error) {
    configurationIssues.push(
      `static-deadline-source-evidence=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let browserPassThroughResetEvidence = null;
  try {
    browserPassThroughResetEvidence =
      validateHkVisualizationBrowserPassThroughResetAnnotations(
        serializedTests,
      );
  } catch (error) {
    configurationIssues.push(
      `browser-pass-through-reset-evidence=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let browserP6AveragesEvidence = null;
  try {
    browserP6AveragesEvidence =
      validateHkVisualizationBrowserP6AveragesAnnotations(serializedTests);
  } catch (error) {
    configurationIssues.push(
      `browser-p6-averages-evidence=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let browserP6BudgetEvidence = null;
  try {
    browserP6BudgetEvidence =
      validateHkVisualizationBrowserP6BudgetAnnotations(serializedTests);
  } catch (error) {
    configurationIssues.push(
      `browser-p6-budget-evidence=${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const missingFiles = HK_VISUALIZATION_RELEASE_SPECS.filter(
    (expected) => !actualFilesByAbsolutePath.has(resolve(workspace, expected)),
  );
  const unexpectedFiles = [...actualFilesByAbsolutePath.entries()]
    .filter(([absolutePath]) => !expectedFilesByAbsolutePath.has(absolutePath))
    .map(([, reportedPath]) => reportedPath);
  const nonCanonicalProjects = tests
    .filter((entry) => entry?.projectName !== canonicalProject)
    .map((entry) => String(entry?.projectName ?? "missing-project"));
  const nonExpectedOutcomes = tests
    .filter((entry) => entry?.status !== "expected")
    .map((entry) => String(entry?.status ?? "missing-status"));
  const nonPassedExpectations = tests
    .filter((entry) => entry?.expectedStatus !== "passed")
    .map((entry) => String(entry?.expectedStatus ?? "missing-expected-status"));
  const invalidAttemptCardinalities = tests
    .filter(
      (entry) => !Array.isArray(entry?.results) || entry.results.length !== 1,
    )
    .map((entry) =>
      Array.isArray(entry?.results) ? entry.results.length : "missing-results",
    );
  const nonPassedAttempts = tests.flatMap((entry) =>
    Array.isArray(entry?.results)
      ? entry.results
          .filter((attempt) => attempt?.status !== "passed")
          .map((attempt) => String(attempt?.status ?? "missing-result-status"))
      : ["missing-results"],
  );
  const invalidAttemptErrorSchemas = tests.flatMap((entry) =>
    Array.isArray(entry?.results)
      ? entry.results
          .filter((attempt) => !Array.isArray(attempt?.errors))
          .map(() => "missing-attempt-errors")
      : ["missing-results"],
  );
  const attemptsWithErrors = tests.flatMap((entry) =>
    Array.isArray(entry?.results)
      ? entry.results
          .filter(
            (attempt) =>
              Array.isArray(attempt?.errors) && attempt.errors.length > 0,
          )
          .map((attempt) => String(attempt.errors.length))
      : ["missing-results"],
  );
  const nonZeroRetries = tests.flatMap((entry) =>
    Array.isArray(entry?.results)
      ? entry.results
          .filter((attempt) => attempt?.retry !== 0)
          .map((attempt) => String(attempt?.retry ?? "missing-retry"))
      : ["missing-results"],
  );
  const issues = [];
  if (configurationIssues.length > 0) {
    issues.push(`configurationDrift=[${configurationIssues.join(", ")}]`);
  }
  if (Number(stats.expected) <= 0)
    issues.push("expected test count is not positive");
  if (Number(stats.skipped) !== 0)
    issues.push(`skipped=${String(stats.skipped)}`);
  if (Number(stats.unexpected) !== 0)
    issues.push(`unexpected=${String(stats.unexpected)}`);
  if (Number(stats.flaky) !== 0) issues.push(`flaky=${String(stats.flaky)}`);
  if (!reportErrorsSchemaValid) issues.push("globalErrorsSchema=non-array");
  if (errors.length > 0) issues.push(`globalErrors=${errors.length}`);
  if (missingFiles.length > 0)
    issues.push(`missingSpecs=[${missingFiles.join(", ")}]`);
  if (unexpectedFiles.length > 0)
    issues.push(`unexpectedSpecs=[${unexpectedFiles.join(", ")}]`);
  if (testsWithoutFileAttribution.length > 0) {
    issues.push(
      `testsWithoutFileAttribution=[${testsWithoutFileAttribution.join(", ")}]`,
    );
  }
  if (testsWithoutTitle.length > 0) {
    issues.push(`testsWithoutTitle=[${testsWithoutTitle.join(", ")}]`);
  }
  const perFileCountDrift = HK_VISUALIZATION_RELEASE_SPECS.flatMap((file) => {
    const expected = HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS[file];
    const actual =
      actualTestCountsByAbsolutePath.get(resolve(workspace, file)) ?? 0;
    return actual === expected
      ? []
      : [`${file}:expected=${expected},actual=${actual}`];
  });
  if (perFileCountDrift.length > 0)
    issues.push(`perFileTestCountDrift=[${perFileCountDrift.join("; ")}]`);
  const perFileTitleDrift = HK_VISUALIZATION_RELEASE_SPECS.flatMap((file) => {
    const expected = [
      ...HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES[file],
    ].sort();
    const actual = [
      ...(actualTestTitlesByAbsolutePath.get(resolve(workspace, file)) ?? []),
    ].sort();
    return JSON.stringify(actual) === JSON.stringify(expected)
      ? []
      : [
          `${file}:expected=${JSON.stringify(expected)},actual=${JSON.stringify(actual)}`,
        ];
  });
  if (perFileTitleDrift.length > 0)
    issues.push(`perFileTestTitleDrift=[${perFileTitleDrift.join("; ")}]`);
  const duplicateTitles = HK_VISUALIZATION_RELEASE_SPECS.flatMap((file) => {
    const titles =
      actualTestTitlesByAbsolutePath.get(resolve(workspace, file)) ?? [];
    const duplicates = [
      ...new Set(
        titles.filter((title, index) => titles.indexOf(title) !== index),
      ),
    ];
    return duplicates.map((title) => `${file}:${title}`);
  });
  if (duplicateTitles.length > 0)
    issues.push(`duplicateTestTitles=[${duplicateTitles.join("; ")}]`);
  if (tests.length !== HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT) {
    issues.push(
      `exactTestTopology=${tests.length} differs from required=${HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT}`,
    );
  }
  if (tests.length !== Number(stats.expected)) {
    issues.push(
      `serializedTests=${tests.length} differs from expected=${String(stats.expected)}`,
    );
  }
  if (nonCanonicalProjects.length > 0) {
    issues.push(
      `nonCanonicalProjects=[${[...new Set(nonCanonicalProjects)].join(", ")}]`,
    );
  }
  if (nonExpectedOutcomes.length > 0) {
    issues.push(
      `nonExpectedOutcomes=[${[...new Set(nonExpectedOutcomes)].join(", ")}]`,
    );
  }
  if (nonPassedExpectations.length > 0) {
    issues.push(
      `nonPassedExpectations=[${[...new Set(nonPassedExpectations)].join(", ")}]`,
    );
  }
  if (invalidAttemptCardinalities.length > 0) {
    issues.push(
      `invalidAttemptCardinalities=[${[...new Set(invalidAttemptCardinalities)].join(", ")}]`,
    );
  }
  if (nonPassedAttempts.length > 0) {
    issues.push(
      `nonPassedAttempts=[${[...new Set(nonPassedAttempts)].join(", ")}]`,
    );
  }
  if (invalidAttemptErrorSchemas.length > 0) {
    issues.push(
      `invalidAttemptErrorSchemas=[${[...new Set(invalidAttemptErrorSchemas)].join(", ")}]`,
    );
  }
  if (attemptsWithErrors.length > 0) {
    issues.push(
      `attemptsWithErrors=[${[...new Set(attemptsWithErrors)].join(", ")}]`,
    );
  }
  if (nonZeroRetries.length > 0) {
    issues.push(`nonZeroRetries=[${[...new Set(nonZeroRetries)].join(", ")}]`);
  }
  if (issues.length > 0) {
    throw new Error(
      `HK Visualization release report is not zero-failure evidence: ${issues.join("; ")}.`,
    );
  }
  return {
    actualPaths: {
      ...pathManifest.paths,
      browserProfiles: [...actualBrowserProfilePaths],
    },
    expectedTestCount: Number(stats.expected),
    dependentTransitionEvidence: browserDependentTransitionEvidence,
    files: [...HK_VISUALIZATION_RELEASE_SPECS],
    flakyTestCount: 0,
    project: canonicalProject,
    p6AveragesEvidence: browserP6AveragesEvidence,
    p6BudgetEvidence: browserP6BudgetEvidence,
    passThroughOracleEvidence: browserPassThroughOracleEvidence,
    passThroughPaintedGeometryPairEvidence:
      browserPassThroughPaintedGeometryPairEvidence,
    passThroughResetEvidence: browserPassThroughResetEvidence,
    scrollObservationEvidence: browserScrollEvidence,
    skippedTestCount: 0,
    staticDeadlineSourceEvidence,
    unexpectedTestCount: 0,
  };
}

export function runHkVisualizationReleaseGate({
  argv = process.argv.slice(2),
  cwd = defaultWorkspace,
  environment = process.env,
  now = new Date(),
  sampleActiveProfiles = readHkVisualizationProfileProcessSample,
  spawn = null,
  spawnMonitor = spawnChild,
  superviseWorkload = executeHkVisualizationSupervisedWorkload,
  terminateMonitor = terminateGlobalProfileMonitorChild,
  waitForMonitorExit = waitForGlobalProfileMonitorExit,
  waitForMonitorPath = waitForGlobalProfileMonitorPath,
  writeMonitorStop = writeFileSync,
  captureSourceSnapshot = captureHkVisualizationReleaseSourceSnapshot,
  armReleaseSourceExecutionMonitor =
    armHkVisualizationReleaseSourceExecutionMonitor,
  validateReleaseSourceExecutionStart =
    validateHkVisualizationReleaseSourceExecutionStart,
  captureDependencyClosure =
    captureAndAssertHkVisualizationCanonicalDependencyClosure,
  compareDependencyClosures = compareHkVisualizationDependencyClosures,
  validateDependencyManifestArtifact =
    validateHkVisualizationDependencyClosureManifestArtifact,
  validateDependencySummary = null,
  allocateExecutionRoots = allocateHkVisualizationExecutionRoots,
  materializeExecutionStage = materializeHkVisualizationExecutionStage,
} = {}) {
  const parsedArgs = parseHkVisualizationReleaseRunnerArgs(argv);
  if (parsedArgs.help) {
    return {
      help: true,
      message:
        "Usage: node tests/e2e/run-hk-visualization-release-gate.mjs [--dry-run]",
    };
  }
  const sourcePlan = buildHkVisualizationReleasePlan({ cwd, environment, now });
  if (parsedArgs.dryRun) return { dryRun: true, plan: publicPlan(sourcePlan) };
  const preflightActivePlaywrightProfiles =
    assertNoForeignActivePlaywrightProfiles(sampleActiveProfiles());
  if (!existsSync(sourcePlan.command)) {
    throw new Error(
      `Playwright executable is missing at ${sourcePlan.command}. Run npm install in the worktree first.`,
    );
  }
  for (const spec of sourcePlan.specs) {
    if (!existsSync(join(sourcePlan.cwd, spec)))
      throw new Error(`Required HK Visualization spec is missing: ${spec}.`);
  }
  const executionRoots = allocateExecutionRoots({
    runId: sourcePlan.runId,
    sourceWorkspace: sourcePlan.cwd,
  });
  let plan = buildHkVisualizationReleasePlan({
    artifactWorkspace: executionRoots.artifactWorkspace,
    cwd: executionRoots.executionWorkspace,
    environment,
    now,
    sourceWorkspace: sourcePlan.cwd,
    toolchainWorkspace: sourcePlan.cwd,
  });
  if (existsSync(plan.pathManifest.artifactRoot)) {
    throw new Error(
      `HK Visualization release gate refuses a pre-existing run root: ${plan.pathManifest.artifactRoot}.`,
    );
  }

  for (const directory of [
    plan.pathManifest.artifactRoot,
    plan.pathManifest.browserProfileParent,
    plan.pathManifest.outputDir,
    plan.pathManifest.reportDir,
    plan.pathManifest.serviceLogDir,
    plan.pathManifest.servicePidDir,
    plan.pathManifest.nodeCompileCacheDir,
    plan.pathManifest.npmCacheDir,
    plan.pathManifest.npmLogsDir,
    dirname(plan.pathManifest.nextTsconfigPath),
    plan.pathManifest.sqliteTmpDir,
    plan.pathManifest.xdgCacheDir,
    plan.pathManifest.xdgConfigDir,
    plan.pathManifest.xdgStateDir,
    plan.pathManifest.globalProfileMonitorDir,
    plan.pathManifest.globalProfileMonitorTmpDir,
    plan.pathManifest.workloadSupervisorDir,
    plan.pathManifest.workloadSupervisorTmpDir,
  ]) {
    mkdirSync(directory, { recursive: true });
  }
  const materializedManifestIssues =
    validateHkVisualizationStarshipPathManifest(plan.pathManifest);
  if (materializedManifestIssues.length > 0) {
    throw new Error(
      `HK Visualization release gate materialized an invalid Starship path manifest: ${materializedManifestIssues.join("; ")}.`,
    );
  }
  const artifactRootIdentity =
    captureHkVisualizationMaterializedArtifactRootIdentity(
      plan.pathManifest,
    );
  createExclusiveDurableReleaseFile(
    plan.pathManifest.pathManifestFile,
    Buffer.from(`${JSON.stringify(plan.pathManifest, null, 2)}\n`, "utf8"),
    "HK Visualization Starship path manifest",
  );
  let releaseSourceExecutionMonitor = null;
  let releaseSourceExecutionMonitorClosed = false;
  try {
  releaseSourceExecutionMonitor = armReleaseSourceExecutionMonitor({
    requiredSourcePaths: HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS,
    workspace: plan.sourceWorkspace,
  });
  releaseSourceExecutionMonitor.assertClean("arm");
  const releaseSourceBefore = captureReleaseSourceSnapshot(
    plan,
    captureSourceSnapshot,
  );
  const releaseSourceExecutionStart = validateReleaseSourceExecutionStart(
    releaseSourceBefore,
    {
      expectedPathManifest: plan.pathManifest,
      expectedWorkspace: plan.sourceWorkspace,
      phase: "after-source-before",
    },
  );
  releaseSourceExecutionMonitor.assertClean("after-source-before");
  const expectedDependencyImplementationSourceSha256 =
    requiredSourceFileSha256(
      releaseSourceBefore,
      "tests/e2e/hk-visualization-dependency-closure.mjs",
    );
  const dependencySummaryValidator =
    validateDependencySummary ??
    ((summary, { fullManifestArtifact } = {}) =>
      validateHkVisualizationCanonicalDependencyClosureSummary(summary, {
        expectedImplementationSourceSha256:
          expectedDependencyImplementationSourceSha256,
        fullManifestArtifact,
      }));
  const dependencyManifestPaths = Object.freeze({
    before: join(
      dirname(plan.pathManifest.releaseSourceReceiptPath),
      "dependency-closure-before.json",
    ),
    after: join(
      dirname(plan.pathManifest.releaseSourceReceiptPath),
      "dependency-closure-after.json",
    ),
  });
  const releaseDependencyBefore = captureReleaseDependencyEvidence(
    plan,
    captureDependencyClosure,
    validateDependencyManifestArtifact,
    dependencySummaryValidator,
    {
      expectedImplementationSourceSha256:
        expectedDependencyImplementationSourceSha256,
      fullManifestArtifactPath: dependencyManifestPaths.before,
    },
  );
  const executionStageReceipt = materializeExecutionStage({
    dependencyManifest: releaseDependencyBefore.manifest,
    executionWorkspace: plan.cwd,
    sourceSnapshot: releaseSourceBefore,
    sourceWorkspace: plan.sourceWorkspace,
  });
  const executionPlan = buildHkVisualizationReleasePlan({
    artifactWorkspace: plan.pathManifest.artifactWorkspace,
    cwd: plan.cwd,
    environment,
    now,
    sourceWorkspace: plan.sourceWorkspace,
  });
  if (
    executionPlan.runId !== plan.runId ||
    !isDeepStrictEqual(executionPlan.pathManifest, plan.pathManifest)
  ) {
    throw new Error(
      "HK Visualization execution plan drifted while binding the sealed stage.",
    );
  }
  plan = executionPlan;
  const managedToolchainIdentity =
    captureHkVisualizationManagedToolchainIdentity(plan.pathManifest);
  for (const spec of plan.specs) {
    if (!existsSync(join(plan.cwd, spec))) {
      throw new Error(
        `Required staged HK Visualization spec is missing: ${spec}.`,
      );
    }
  }
  const nextEnvPath = join(plan.cwd, "next-env.d.ts");
  let nextEnvSnapshot;
  try {
    nextEnvSnapshot = readRegularFileSnapshot(
      nextEnvPath,
      "HK Visualization canonical next-env.d.ts",
    );
  } catch (error) {
    throw new Error(
      `HK Visualization release gate requires a tracked regular canonical next-env.d.ts before the managed build: ${error instanceof Error ? error.message : String(error)}.`,
      { cause: error },
    );
  }
  const nextEnvBefore = nextEnvSnapshot.bytes;
  const nextEnvBeforeSha256 = sha256Text(nextEnvBefore);
  const canonicalNextEnvReference = "./.next/types/routes.d.ts";
  const nextEnvReferencePaths = [
    ...nextEnvBefore
      .toString("utf8")
      .matchAll(/^\s*\/\/\/\s*<reference\s+path=["']([^"']+)["']\s*\/?>\s*$/gm),
  ].map((match) => match[1]);
  if (
    nextEnvReferencePaths.length !== 1 ||
    nextEnvReferencePaths[0] !== canonicalNextEnvReference
  ) {
    throw new Error(
      `HK Visualization release gate requires exactly one next-env.d.ts path reference, ${canonicalNextEnvReference}; ` +
        `received [${nextEnvReferencePaths.join(", ")}].`,
    );
  }
  if (fileSystemEntryExists(plan.pathManifest.nextTsconfigPath)) {
    throw new Error(
      `HK Visualization release gate refuses a pre-existing run tsconfig entry: ${plan.pathManifest.nextTsconfigPath}.`,
    );
  }
  const nextTsconfigBytes = buildHkVisualizationReleaseTsconfigBytes(plan);
  const nextTsconfigIdentity = createExclusiveDurableReleaseFile(
    plan.pathManifest.nextTsconfigPath,
    nextTsconfigBytes,
    "HK Visualization disposable Playwright tsconfig",
  );
  plan.nextTsconfigIdentity = nextTsconfigIdentity;
  plan.nextTsconfigSha256 = nextTsconfigIdentity.sha256;
  let childResult;
  let workloadSupervisorResult = null;
  let executionError = null;
  let globalProfileMonitor = null;
  let globalProfileMonitorReady = null;
  let globalProfileMonitorResult = null;
  let postflightActivePlaywrightProfiles;
  let nextEnvAfterSha256 = null;
  let releaseSourceResult = null;
  try {
    globalProfileMonitor = launchGlobalProfileMonitor({
      plan,
      spawnMonitor,
    });
    globalProfileMonitorReady = requireGlobalProfileMonitorReady({
      monitor: globalProfileMonitor,
      waitForMonitorPath,
    });
    const releaseSourceImmediatelyBeforeSpawn =
      validateReleaseSourceExecutionStart(
        releaseSourceBefore,
        {
          expectedPathManifest: plan.pathManifest,
          expectedWorkspace: plan.sourceWorkspace,
          phase: "immediately-before-spawn",
        },
      );
    if (
      !isDeepStrictEqual(
        releaseSourceImmediatelyBeforeSpawn.sourceRows,
        releaseSourceExecutionStart.sourceRows,
      ) ||
      releaseSourceImmediatelyBeforeSpawn.sourceAggregateSha256 !==
        releaseSourceExecutionStart.sourceAggregateSha256
    ) {
      throw new Error(
        "HK Visualization release source execution current45 evidence drifted before spawn.",
      );
    }
    releaseSourceExecutionMonitor.assertClean("immediately-before-spawn");
    if (typeof spawn === "function") {
      childResult = spawn(plan.command, plan.args, {
        cwd: plan.cwd,
        env: plan.childEnvironment,
        stdio: "inherit",
      });
    } else {
      workloadSupervisorResult = superviseWorkload({ plan });
      childResult = workloadSupervisorResult;
    }
    releaseSourceExecutionMonitor.drain();
    releaseSourceExecutionMonitor.assertClean("after-spawn-drain");
    if (childResult?.error) throw childResult.error;
    if (childResult?.signal) {
      throw new Error(
        `HK Visualization Playwright release gate was terminated by signal ${childResult.signal}.`,
      );
    }
    if (childResult?.status !== 0) {
      throw new Error(
        `HK Visualization Playwright release gate exited ${String(childResult?.status)}${childResult?.signal ? ` (${childResult.signal})` : ""}.`,
      );
    }
  } catch (error) {
    executionError = error;
  } finally {
    if (globalProfileMonitor) {
      try {
        globalProfileMonitorResult = stopAndValidateGlobalProfileMonitor({
          monitor: globalProfileMonitor,
          terminateMonitor,
          waitForMonitorExit,
          waitForMonitorPath,
          writeMonitorStop,
        });
      } catch (error) {
        executionError = combineReleaseGateErrors(
          executionError,
          error,
          "global profile monitor shutdown validation failed",
        );
      }
    }
    try {
      removeExactPrecreatedReleaseFile(
        plan.pathManifest.nextTsconfigPath,
        plan.nextTsconfigIdentity,
        "HK Visualization disposable Playwright tsconfig",
      );
    } catch (error) {
      executionError = combineReleaseGateErrors(
        executionError,
        error,
        `could not remove exact run-specific tsconfig ${plan.pathManifest.nextTsconfigPath}`,
      );
    }
    try {
      const sealedNextEnv = readRegularFileSnapshot(
        nextEnvSnapshot.path,
        "HK Visualization sealed canonical next-env.d.ts",
      );
      if (
        sealedNextEnv.mode !== nextEnvSnapshot.mode ||
        !sealedNextEnv.bytes.equals(nextEnvSnapshot.bytes)
      ) {
        throw new Error(
          "HK Visualization sealed canonical next-env.d.ts drifted during execution.",
        );
      }
      nextEnvAfterSha256 = sha256Text(sealedNextEnv.bytes);
    } catch (error) {
      executionError = combineReleaseGateErrors(
        executionError,
        error,
        "could not restore canonical next-env.d.ts",
      );
    }
    try {
      postflightActivePlaywrightProfiles =
        assertHkVisualizationPostflightProfileHygiene(
          sampleActiveProfiles(),
          {
            browserProfileParent: plan.pathManifest.browserProfileParent,
          },
        );
    } catch (error) {
      executionError = combineReleaseGateErrors(
        executionError,
        error,
        "postflight process hygiene failed",
      );
    }
    try {
      const releaseSourceAfter = captureReleaseSourceSnapshot(
        plan,
        captureSourceSnapshot,
      );
      const releaseDependencyAfter = captureReleaseDependencyEvidence(
        plan,
        captureDependencyClosure,
        validateDependencyManifestArtifact,
        dependencySummaryValidator,
        {
          expectedImplementationSourceSha256:
            expectedDependencyImplementationSourceSha256,
          fullManifestArtifactPath: dependencyManifestPaths.after,
        },
      );
      const releaseSourcePostflightCurrent =
        validateReleaseSourceExecutionStart(
          releaseSourceAfter,
          {
            expectedPathManifest: plan.pathManifest,
            expectedWorkspace: plan.sourceWorkspace,
            phase: "postflight-current",
          },
        );
      if (
        !isDeepStrictEqual(
          releaseSourcePostflightCurrent.sourceRows,
          releaseSourceExecutionStart.sourceRows,
        ) ||
        releaseSourcePostflightCurrent.sourceAggregateSha256 !==
          releaseSourceExecutionStart.sourceAggregateSha256
      ) {
        throw new Error(
          "HK Visualization release source execution current45 evidence drifted during postflight.",
        );
      }
      releaseSourceExecutionMonitor.drain();
      releaseSourceExecutionMonitor.assertClean("postflight-current");
      const rawSourceMonitorReceipt =
        releaseSourceExecutionMonitor.close();
      releaseSourceExecutionMonitorClosed = true;
      const releaseSourceExecution = Object.freeze({
        contractVersion:
          HK_VISUALIZATION_RELEASE_SOURCE_EXECUTION_CONTRACT_VERSION,
        executionStartSourceAggregateSha256:
          releaseSourceExecutionStart.sourceAggregateSha256,
        executionStartSourceRows:
          releaseSourceExecutionStart.sourceRows.map((row) => ({ ...row })),
        monitorReceipt: Object.freeze({
          coveredPathCount: rawSourceMonitorReceipt.coveredPathCount,
          directoryWatcherCount:
            rawSourceMonitorReceipt.directoryWatcherCount,
          earlyCloseCount: rawSourceMonitorReceipt.earlyCloseCount,
          errorCount: rawSourceMonitorReceipt.errorCount,
          eventCount: rawSourceMonitorReceipt.eventCount,
          fileWatcherCount: rawSourceMonitorReceipt.fileWatcherCount,
          nullFilenameEventCount:
            rawSourceMonitorReceipt.nullFilenameEventCount,
          policy: HK_VISUALIZATION_RELEASE_SOURCE_MONITOR_POLICY,
          status: rawSourceMonitorReceipt.status,
          version: HK_VISUALIZATION_RELEASE_SOURCE_MONITOR_VERSION,
          watcherCount: rawSourceMonitorReceipt.watcherCount,
        }),
      });
      releaseSourceResult = writeAndValidateReleaseSourceReceipt({
        plan,
        artifactRootIdentity,
        managedToolchainIdentity,
        executionStage: executionStageReceipt,
        releaseSourceExecution,
        sourceBefore: releaseSourceBefore,
        sourceAfter: releaseSourceAfter,
        dependencyBefore: releaseDependencyBefore,
        dependencyAfter: releaseDependencyAfter,
        compareDependencyClosures,
        validateDependencySummary: dependencySummaryValidator,
      });
    } catch (error) {
      executionError = combineReleaseGateErrors(
        executionError,
        error,
        "release source/dependency postflight validation failed",
      );
    }
  }
  if (executionError) throw executionError;
  try {
    const finalNextEnv = readRegularFileSnapshot(
      nextEnvPath,
      "HK Visualization postflight next-env.d.ts",
    );
    if (!nextEnvBefore.equals(finalNextEnv.bytes)) {
      throw new Error("postflight bytes differ from the canonical snapshot");
    }
  } catch (error) {
    throw new Error(
      `HK Visualization release runner could not prove a regular canonical next-env.d.ts after the managed build: ${error instanceof Error ? error.message : String(error)}.`,
      { cause: error },
    );
  }
  if (!globalProfileMonitorResult || !globalProfileMonitorReady) {
    throw new Error(
      "HK Visualization release runner completed without mandatory continuous global profile monitor evidence.",
    );
  }
  if (!releaseSourceResult) {
    throw new Error(
      "HK Visualization release runner completed without mandatory source/dependency freeze evidence.",
    );
  }
  if (typeof spawn !== "function" && !workloadSupervisorResult) {
    throw new Error(
      "HK Visualization release runner completed without mandatory workload-supervisor evidence.",
    );
  }
  if (!existsSync(plan.jsonReport)) {
    throw new Error(
      `HK Visualization Playwright JSON report was not written: ${plan.jsonReport}.`,
    );
  }
  if (!existsSync(plan.pathManifest.pathManifestFile)) {
    throw new Error(
      `HK Visualization Starship path manifest was not preserved: ${plan.pathManifest.pathManifestFile}.`,
    );
  }
  if (!existsSync(plan.pathManifest.runtimeProfileReceiptPath)) {
    throw new Error(
      `HK Visualization runtime browser-profile receipt was not written: ${plan.pathManifest.runtimeProfileReceiptPath}.`,
    );
  }
  let onDiskPathManifest;
  try {
    onDiskPathManifest = JSON.parse(
      readFileSync(plan.pathManifest.pathManifestFile, "utf8"),
    );
  } catch (error) {
    throw new Error(
      `HK Visualization Starship path manifest is unreadable: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
  if (!isDeepStrictEqual(onDiskPathManifest, plan.pathManifest)) {
    throw new Error(
      `HK Visualization Starship path manifest drifted at ${plan.pathManifest.pathManifestFile}.`,
    );
  }
  let runtimeProfileReceipt;
  let runtimeProfileReceiptBytes;
  try {
    runtimeProfileReceiptBytes = readFileSync(
      plan.pathManifest.runtimeProfileReceiptPath,
    );
    runtimeProfileReceipt = JSON.parse(
      runtimeProfileReceiptBytes.toString("utf8"),
    );
  } catch (error) {
    throw new Error(
      `HK Visualization runtime browser-profile receipt is unreadable: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
  const report = readHkVisualizationBoundedJsonReport(plan.jsonReport);
  return {
    dryRun: false,
    evidence: validateHkVisualizationReleaseReport(report, {
      cwd: plan.cwd,
      expectedPathManifest: plan.pathManifest,
      releaseSourceReceipt: releaseSourceResult.receipt,
      runtimeProfileReceipt,
    }),
    globalProfileMonitorEvidence: globalProfileMonitorResult.evidence,
    globalProfileMonitorReady,
    globalProfileMonitorReceiptPath:
      globalProfileMonitorResult.receiptPath,
    globalProfileMonitorReceiptSha256:
      globalProfileMonitorResult.receiptSha256,
    nextEnvAfterSha256,
    nextEnvBeforeSha256,
    nextEnvPath,
    plan: publicPlan(plan),
    postflightActivePlaywrightProfiles,
    preflightActivePlaywrightProfiles,
    reportPath: plan.jsonReport,
    releaseSourceEvidence: releaseSourceResult.evidence,
    releaseDependencyFullManifestArtifacts:
      releaseSourceResult.dependencyFullManifestArtifacts,
    releaseSourceReceiptPath: releaseSourceResult.receiptPath,
    releaseSourceReceiptSha256: releaseSourceResult.receiptSha256,
    runtimeProfileReceiptPath:
      plan.pathManifest.runtimeProfileReceiptPath,
    runtimeProfileReceiptSha256: sha256Text(runtimeProfileReceiptBytes),
    workloadSupervisorReceiptPath:
      workloadSupervisorResult?.receiptPath ?? null,
    workloadSupervisorReceiptSha256:
      workloadSupervisorResult?.receiptSha256 ?? null,
    workloadSupervisorLogPath:
      workloadSupervisorResult?.logPath ?? null,
    workloadSupervisorLogSha256:
      workloadSupervisorResult?.logSha256 ?? null,
  };
  } finally {
    if (
      releaseSourceExecutionMonitor &&
      !releaseSourceExecutionMonitorClosed
    ) {
      releaseSourceExecutionMonitor.close();
      releaseSourceExecutionMonitorClosed = true;
    }
  }
}

function publicPlan(plan) {
  return {
    args: [...plan.args],
    actualPaths: {
      ...plan.pathManifest.paths,
    },
    artifactRoot: plan.artifactRoot,
    command: plan.command,
    cwd: plan.cwd,
    jsonReport: plan.jsonReport,
    pathManifestHash: plan.pathManifest.manifestHash,
    project: plan.project,
    runId: plan.runId,
    specs: [...plan.specs],
  };
}

function isDirectInvocation() {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectInvocation()) {
  try {
    const result = runHkVisualizationReleaseGate();
    if (result.help) {
      process.stdout.write(`${result.message}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
