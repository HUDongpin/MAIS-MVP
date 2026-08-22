import type {
  VisualizationBrowserRegressionCommandEnv,
  VisualizationBrowserRegressionPackage,
  VisualizationBrowserRegressionPlan
} from "./visualizationBrowserRegressionPackages";

export const VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT =
  "A06/A11 Visualization Lab browser regression evidence: all HK demo-safe grade packages P1-S6 passed when split by grade and explicit lab ids" as const;

export const VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION =
  "smoke-check-run-from-beat-checkpoint-invalidation-root-attributes" as const;

export type VisualizationBrowserEvidenceStatus = "not-run" | "passed";

export type VisualizationBrowserRegressionRecordedRun = {
  duration: string;
  packageId: string;
  port: number;
  runId: string;
  status: Exclude<VisualizationBrowserEvidenceStatus, "not-run">;
};

export type VisualizationBrowserRegressionEvidenceEntry = {
  command: string;
  commandEnv: VisualizationBrowserRegressionCommandEnv;
  duration: string;
  grade: string;
  labIds: string[];
  packageId: string;
  port: number | null;
  runId: string;
  status: VisualizationBrowserEvidenceStatus;
};

export type VisualizationBrowserRegressionEvidenceMatrix = {
  a11HandoffSummary: string;
  broadGateStatus: "red-needs-a11-a22-follow-up";
  hkGradePackageEvidence: VisualizationBrowserRegressionEvidenceEntry[];
  hkGradeSplitStatus: "incomplete" | "passed";
  missingHkPackageIds: string[];
  remainingA11Actions: string[];
  remainingA22Actions: string[];
  requiredRootDataAttributes: VisualizationBrowserRegressionPlan["requiredRootDataAttributes"];
  requiredRunFromBeatCheckpointInvalidationDataAttributes: VisualizationBrowserRegressionPlan["requiredRunFromBeatCheckpointInvalidationDataAttributes"];
  sourceContract: typeof VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT;
};

export const recordedHkGradePackageBrowserEvidence: VisualizationBrowserRegressionRecordedRun[] = [
  { duration: "1.2m", packageId: "hk-demo-P1-part-1", port: 3178, runId: "manim-v2-a11-20260628ai", status: "passed" },
  { duration: "1.2m", packageId: "hk-demo-P2-part-1", port: 3179, runId: "manim-v2-a11-20260628aj", status: "passed" },
  { duration: "1.6m", packageId: "hk-demo-P3-part-1", port: 3180, runId: "manim-v2-a11-20260628ak", status: "passed" },
  { duration: "2.1m", packageId: "hk-demo-P4-part-1", port: 3186, runId: "manim-v2-a11-20260628aq", status: "passed" },
  { duration: "1.1m", packageId: "hk-demo-P5-part-1", port: 3181, runId: "manim-v2-a11-20260628al", status: "passed" },
  { duration: "1.7m", packageId: "hk-demo-P6-part-1", port: 3182, runId: "manim-v2-a11-20260628am", status: "passed" },
  { duration: "1.9m", packageId: "hk-demo-S1-part-1", port: 3183, runId: "manim-v2-a11-20260628an", status: "passed" },
  { duration: "1.3m", packageId: "hk-demo-S2-part-1", port: 3184, runId: "manim-v2-a11-20260628ao", status: "passed" },
  { duration: "2.5m", packageId: "hk-demo-S3-part-1", port: 3185, runId: "manim-v2-a11-20260628ap", status: "passed" },
  { duration: "1.7m", packageId: "hk-demo-S4-part-1", port: 3173, runId: "manim-v2-a11-20260628ad", status: "passed" },
  { duration: "3.6m", packageId: "hk-demo-S5-part-1", port: 3175, runId: "manim-v2-a11-20260628af", status: "passed" },
  { duration: "2.2m", packageId: "hk-demo-S6-part-1", port: 3177, runId: "manim-v2-a11-20260628ah", status: "passed" }
];

function selectedCatalogCommand(
  regressionPackage: VisualizationBrowserRegressionPackage,
  recordedRun: VisualizationBrowserRegressionRecordedRun | undefined
) {
  const runId = recordedRun?.runId ?? "not-run";
  const port = recordedRun?.port ?? "not-run";

  return [
    `VISUALIZATION_SWEEP_GRADES=${regressionPackage.commandEnv.VISUALIZATION_SWEEP_GRADES ?? regressionPackage.grade}`,
    `VISUALIZATION_SWEEP_TRACKS=${regressionPackage.commandEnv.VISUALIZATION_SWEEP_TRACKS ?? "HK"}`,
    `VISUALIZATION_SWEEP_LABS=${regressionPackage.commandEnv.VISUALIZATION_SWEEP_LABS ?? regressionPackage.labIds.join(",")}`,
    `PLAYWRIGHT_RUN_ID=${runId}`,
    `PLAYWRIGHT_PORT=${port}`,
    "node scripts/reject-direct-browser-entry.mjs visualization-values.spec.ts"
  ].join(" ");
}

function evidenceEntry(
  regressionPackage: VisualizationBrowserRegressionPackage,
  recordedRun: VisualizationBrowserRegressionRecordedRun | undefined
): VisualizationBrowserRegressionEvidenceEntry {
  return {
    command: selectedCatalogCommand(regressionPackage, recordedRun),
    commandEnv: regressionPackage.commandEnv,
    duration: recordedRun?.duration ?? "not-run",
    grade: regressionPackage.grade,
    labIds: regressionPackage.labIds,
    packageId: regressionPackage.id,
    port: recordedRun?.port ?? null,
    runId: recordedRun?.runId ?? "not-run",
    status: recordedRun?.status ?? "not-run"
  };
}

export function buildVisualizationBrowserRegressionEvidenceMatrix(
  plan: VisualizationBrowserRegressionPlan,
  recordedRuns: VisualizationBrowserRegressionRecordedRun[] = recordedHkGradePackageBrowserEvidence
): VisualizationBrowserRegressionEvidenceMatrix {
  const recordedByPackageId = new Map(recordedRuns.map((recordedRun) => [recordedRun.packageId, recordedRun]));
  const hkGradePackageEvidence = plan.hkDemoSafePackages.map((regressionPackage) =>
    evidenceEntry(regressionPackage, recordedByPackageId.get(regressionPackage.id))
  );
  const missingHkPackageIds = hkGradePackageEvidence
    .filter((entry) => entry.status !== "passed")
    .map((entry) => entry.packageId);
  const hkGradeSplitStatus = missingHkPackageIds.length === 0 ? "passed" : "incomplete";

  return {
    a11HandoffSummary:
      hkGradeSplitStatus === "passed"
        ? "P1-S6 HK demo-safe catalog packages pass when split by grade and explicit VISUALIZATION_SWEEP_LABS."
        : "HK demo-safe catalog packages still have missing browser evidence.",
    broadGateStatus: "red-needs-a11-a22-follow-up",
    hkGradePackageEvidence,
    hkGradeSplitStatus,
    missingHkPackageIds,
    remainingA11Actions: [
      "adopt-hk-grade-split-packages",
      "update-projection-views-expected-list",
      VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION,
      "keep-non-hk-tracks-out-of-hk-demo-sweep"
    ],
    remainingA22Actions: [
      "investigate-isolated-next-chunk-serving-after-broad-timeout",
      "release-from-clean-worktree-or-reviewed-pruned-staging-slice"
    ],
    requiredRootDataAttributes: plan.requiredRootDataAttributes,
    requiredRunFromBeatCheckpointInvalidationDataAttributes: plan.requiredRunFromBeatCheckpointInvalidationDataAttributes,
    sourceContract: VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT
  };
}
