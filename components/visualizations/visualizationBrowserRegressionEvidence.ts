import type {
  VisualizationBrowserRegressionCommandEnv,
  VisualizationBrowserRegressionPackage,
  VisualizationBrowserRegressionPlan
} from "./visualizationBrowserRegressionPackages";

export const VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT =
  "A06/A11 Visualization Lab browser regression evidence: passed records must match the expected source commit, exact lab set, and execution configuration" as const;

export const VISUALIZATION_BROWSER_REGRESSION_ROOT_ATTRIBUTE_A11_ACTION =
  "smoke-check-run-from-beat-checkpoint-invalidation-root-attributes" as const;

export type VisualizationBrowserEvidenceStatus = "not-run" | "passed";

export type VisualizationBrowserRegressionRunConfiguration = {
  testFile: string;
  project: string;
  grep: string;
  timeoutMs: number;
  retries: number;
  workers: number;
  browserChannel: string;
  sweepMode: "extremes" | "strict";
};

/** Supplied by the consumer for the source/configuration it intends to verify. */
export type VisualizationBrowserRegressionExpectedExecution = {
  sourceCommit: string;
  runConfiguration: VisualizationBrowserRegressionRunConfiguration;
};

/** Captured from the run, not reconstructed from a later regression plan. */
export type VisualizationBrowserRegressionRunBinding = VisualizationBrowserRegressionExpectedExecution & {
  sourceDirty: boolean;
  labIds: string[];
  commandEnv: VisualizationBrowserRegressionCommandEnv;
};

export type VisualizationBrowserEvidenceValidationStatus =
  | "matched"
  | "missing-context"
  | "invalid-context"
  | "missing-run"
  | "duplicate-records"
  | "unsuccessful-run"
  | "unbound-record"
  | "invalid-binding"
  | "dirty-source"
  | "source-mismatch"
  | "lab-set-mismatch"
  | "configuration-mismatch";

export type VisualizationBrowserRegressionRecordedRun = {
  duration: string;
  packageId: string;
  port: number;
  runId: string;
  status: "passed" | "failed";
  // Optional only so historical, unbound records remain inspectable. They do not pass.
  binding?: VisualizationBrowserRegressionRunBinding;
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
  validationStatus: VisualizationBrowserEvidenceValidationStatus;
  recordedRun?: VisualizationBrowserRegressionRecordedRun;
};

export type VisualizationBrowserRegressionEvidenceMatrix = {
  a11HandoffSummary: string;
  expectedExecution?: VisualizationBrowserRegressionExpectedExecution;
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

function isCommit(value: string) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

const runConfigurationFields: (keyof VisualizationBrowserRegressionRunConfiguration)[] = [
  "testFile", "project", "grep", "timeoutMs", "retries", "workers", "browserChannel", "sweepMode"
];

function validConfiguration(config: VisualizationBrowserRegressionRunConfiguration | undefined) {
  return config != null
    && typeof config === "object" && !Array.isArray(config)
    // Bind the same serialized fields that comparison and the retained snapshot see.
    && runConfigurationFields.every((key) => Object.prototype.propertyIsEnumerable.call(config, key))
    && [config.testFile, config.project, config.grep, config.browserChannel].every(
      (value) => typeof value === "string" && value.trim().length > 0
    )
    && Number.isInteger(config.timeoutMs) && config.timeoutMs > 0
    && Number.isInteger(config.retries) && config.retries >= 0
    && Number.isInteger(config.workers) && config.workers > 0
    && (config.sweepMode === "extremes" || config.sweepMode === "strict");
}

function sameSet(left: string[], right: string[]) {
  const valid = (values: string[]) => Array.isArray(values)
    && values.length > 0
    && Array.from(values).every((value) => typeof value === "string" && value.length > 0 && value === value.trim())
    && new Set(values).size === values.length;
  return valid(left) && valid(right)
    && left.length === right.length
    && left.every((value) => right.includes(value));
}

function commandEnvFor(regressionPackage: VisualizationBrowserRegressionPackage): VisualizationBrowserRegressionCommandEnv {
  return {
    VISUALIZATION_SWEEP_GRADES: regressionPackage.commandEnv.VISUALIZATION_SWEEP_GRADES ?? regressionPackage.grade,
    VISUALIZATION_SWEEP_TRACKS: regressionPackage.commandEnv.VISUALIZATION_SWEEP_TRACKS ?? "HK",
    VISUALIZATION_SWEEP_LABS: regressionPackage.commandEnv.VISUALIZATION_SWEEP_LABS ?? regressionPackage.labIds.join(",")
  };
}

function sameCommandEnv(left: VisualizationBrowserRegressionCommandEnv | undefined, right: VisualizationBrowserRegressionCommandEnv) {
  if (!left || Object.keys(left).length !== Object.keys(right).length) return false;
  return Object.entries(right).every(([key, value]) => {
    const actual = left[key as keyof VisualizationBrowserRegressionCommandEnv];
    return typeof actual === "string" && typeof value === "string"
      && sameSet(actual.split(",").map((item) => item.trim()), value.split(",").map((item) => item.trim()));
  });
}

function validationStatus(
  regressionPackage: VisualizationBrowserRegressionPackage,
  runs: VisualizationBrowserRegressionRecordedRun[],
  expected: VisualizationBrowserRegressionExpectedExecution | undefined
): VisualizationBrowserEvidenceValidationStatus {
  if (!expected) return "missing-context";
  if (!isCommit(expected.sourceCommit) || !validConfiguration(expected.runConfiguration)) return "invalid-context";
  if (runs.length === 0) return "missing-run";
  if (runs.length !== 1) return "duplicate-records";
  const run = runs[0];
  if (run.status !== "passed") return "unsuccessful-run";
  const binding = run.binding;
  if (!binding) return "unbound-record";
  if (!isCommit(binding.sourceCommit) || typeof run.runId !== "string" || !run.runId.trim()
    || !Number.isInteger(run.port) || run.port < 1 || run.port > 65535) {
    return "invalid-binding";
  }
  if (binding.sourceDirty !== false) return "dirty-source";
  if (binding.sourceCommit.toLowerCase() !== expected.sourceCommit.toLowerCase()) return "source-mismatch";
  if (!sameSet(binding.labIds, regressionPackage.labIds)) return "lab-set-mismatch";

  const commandEnv = commandEnvFor(regressionPackage);
  const selectorsMatchPackage = sameCommandEnv(commandEnv, {
    VISUALIZATION_SWEEP_GRADES: regressionPackage.grade,
    VISUALIZATION_SWEEP_TRACKS: regressionPackage.curriculumTracks.join(","),
    VISUALIZATION_SWEEP_LABS: regressionPackage.labIds.join(",")
  });
  const config = binding.runConfiguration;
  const expectedConfig = expected.runConfiguration;
  if (!selectorsMatchPackage || !sameCommandEnv(binding.commandEnv, commandEnv)
    || !validConfiguration(config)
    || Object.keys(config).length !== Object.keys(expectedConfig).length
    || !Object.entries(expectedConfig).every(([key, value]) => config[key as keyof typeof config] === value)) {
    return "configuration-mismatch";
  }
  return "matched";
}

function shellArgument(value: string | number) {
  const text = String(value);
  return /^[a-zA-Z0-9_./,:=+-]+$/.test(text) ? text : `'${text.replaceAll("'", "'\\''")}'`;
}

function selectedCatalogCommand(
  regressionPackage: VisualizationBrowserRegressionPackage,
  recordedRun: VisualizationBrowserRegressionRecordedRun | undefined,
  expected: VisualizationBrowserRegressionExpectedExecution | undefined
) {
  if (!expected || !isCommit(expected.sourceCommit) || !validConfiguration(expected.runConfiguration)) return "";
  const config = expected.runConfiguration;

  return [
    ...Object.entries(commandEnvFor(regressionPackage)).map(([key, value]) => `${key}=${shellArgument(value)}`),
    `VISUALIZATION_SWEEP_MODE=${shellArgument(config.sweepMode)}`,
    `PLAYWRIGHT_BROWSER_CHANNEL=${shellArgument(config.browserChannel)}`,
    ...(recordedRun ? [`PLAYWRIGHT_RUN_ID=${shellArgument(recordedRun.runId)}`, `PLAYWRIGHT_PORT=${recordedRun.port}`] : []),
    `npx playwright test ${shellArgument(config.testFile)}`,
    `--project=${shellArgument(config.project)}`,
    `--grep ${shellArgument(config.grep)}`,
    `--reporter=line --timeout=${config.timeoutMs} --retries=${config.retries} --workers=${config.workers}`
  ].join(" ");
}

function evidenceEntry(
  regressionPackage: VisualizationBrowserRegressionPackage,
  runs: VisualizationBrowserRegressionRecordedRun[],
  expected: VisualizationBrowserRegressionExpectedExecution | undefined
): VisualizationBrowserRegressionEvidenceEntry {
  const result = validationStatus(regressionPackage, runs, expected);
  const matchedRun = result === "matched" ? runs[0] : undefined;
  return {
    // An unmatched record never lends its run ID/port to a new plan's command.
    command: selectedCatalogCommand(regressionPackage, matchedRun, expected),
    commandEnv: commandEnvFor(regressionPackage),
    duration: matchedRun?.duration ?? "not-run",
    grade: regressionPackage.grade,
    labIds: [...regressionPackage.labIds],
    packageId: regressionPackage.id,
    port: matchedRun?.port ?? null,
    runId: matchedRun?.runId ?? "not-run",
    status: matchedRun ? "passed" : "not-run",
    validationStatus: result,
    recordedRun: runs.length === 1 ? runs[0] : undefined
  };
}

export function buildVisualizationBrowserRegressionEvidenceMatrix(
  plan: VisualizationBrowserRegressionPlan,
  recordedRuns: VisualizationBrowserRegressionRecordedRun[] = recordedHkGradePackageBrowserEvidence,
  expectedExecution?: VisualizationBrowserRegressionExpectedExecution
): VisualizationBrowserRegressionEvidenceMatrix {
  // Validate exactly the data we retain. Copying after validation could drop an
  // inherited/non-enumerable binding or read a changing accessor a second time.
  const snapshot = structuredClone({ plan, recordedRuns, expectedExecution });
  const requestedPackages = snapshot.plan.hkDemoSafePackages;
  const hkGradePackageEvidence = requestedPackages.filter((regressionPackage) => regressionPackage != null).map((regressionPackage) =>
    evidenceEntry(regressionPackage, snapshot.recordedRuns.filter((run) => run.packageId === regressionPackage.id), snapshot.expectedExecution)
  );
  const missingHkPackageIds = hkGradePackageEvidence
    .filter((entry) => entry.status !== "passed")
    .map((entry) => entry.packageId);
  const hkGradeSplitStatus = hkGradePackageEvidence.length > 0
    && hkGradePackageEvidence.length === requestedPackages.length
    && missingHkPackageIds.length === 0 ? "passed" : "incomplete";

  return {
    expectedExecution: snapshot.expectedExecution,
    a11HandoffSummary:
      hkGradeSplitStatus === "passed"
        ? "HK demo-safe catalog packages have passing evidence bound to the expected source, lab set, and execution configuration."
        : "HK demo-safe catalog packages lack matching browser evidence; inspect each validationStatus before rerunning.",
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
    requiredRootDataAttributes: [...snapshot.plan.requiredRootDataAttributes],
    requiredRunFromBeatCheckpointInvalidationDataAttributes: [...snapshot.plan.requiredRunFromBeatCheckpointInvalidationDataAttributes],
    sourceContract: VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT
  };
}
