import assert from "node:assert/strict";
import test from "node:test";
import type { FeaturedLabDefinition } from "../../data/visualizationLabs";
import { buildVisualizationBrowserRegressionPlan } from "./visualizationBrowserRegressionPackages";
import { buildVisualizationReleaseReadinessEvidence } from "./visualizationReleaseReadinessEvidence";
import { buildMathSceneTeachingSignoffMatrix } from "./three/manim/mathSceneTeachingSignoffMatrix";
import {
  buildVisualizationBrowserRegressionEvidenceMatrix,
  recordedHkGradePackageBrowserEvidence,
  VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT,
  type VisualizationBrowserRegressionExpectedExecution
} from "./visualizationBrowserRegressionEvidence";

const baseLab = {
  analyticsSource: "visualization-lab",
  category: { en: "3D", zh: "3D", zhHans: "3D" },
  description: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
  gradeLabel: { en: "P1", zh: "P1", zhHans: "P1" },
  moduleId: "configured-visualization-lab",
  primaryForTopic: true,
  publisher: "HK",
  qaProfile: "geometry-heavy",
  templateConfig: {
    accent: "#22d3ee",
    focus: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
    formula: { en: "f(x)", zh: "f(x)", zhHans: "f(x)" },
    variant: "fixture"
  },
  templateId: "function-graph",
  title: { en: "Fixture", zh: "Fixture", zhHans: "Fixture" },
  topicId: "fixture-topic"
} as const;

function fixtureLab(labId: string, grade: string, curriculumTrack = "HK") {
  return {
    ...baseLab,
    curriculumTrack,
    grade,
    gradeLabel: { en: grade, zh: grade, zhHans: grade },
    labId,
    threeD: {
      coverageTier: "standard-3d",
      enabled: true,
      fallbackTemplateId: "function-graph",
      familyId: "three-function-graph"
    }
  } as unknown as FeaturedLabDefinition;
}

const browserEvidenceFixtureLabs = [
  fixtureLab("p1-place-value", "P1"),
  fixtureLab("p2-shapes", "P2"),
  fixtureLab("p3-fractions", "P3"),
  fixtureLab("p4-angles", "P4"),
  fixtureLab("p4-decimals", "P4"),
  fixtureLab("p4-large-numbers", "P4"),
  fixtureLab("p4-perimeter-area", "P4"),
  fixtureLab("p5-volume", "P5"),
  fixtureLab("p6-ratio", "P6"),
  fixtureLab("s1-algebra", "S1"),
  fixtureLab("s2-linear", "S2"),
  fixtureLab("s3-quadratics", "S3"),
  fixtureLab("s4-functions", "S4"),
  fixtureLab("s5-calculus", "S5"),
  fixtureLab("s6-statistics", "S6")
];

// Synthetic run metadata for matcher tests, never browser acceptance evidence.
const expectedExecution: VisualizationBrowserRegressionExpectedExecution = {
  sourceCommit: "1".repeat(40),
  runConfiguration: {
    testFile: "tests/e2e/visualization-values.spec.ts",
    project: "desktop-chrome",
    grep: "opens selected catalog labs",
    timeoutMs: 180_000,
    retries: 0,
    workers: 1,
    browserChannel: "chrome",
    sweepMode: "extremes" as const
  }
};

function boundRuns(plan: ReturnType<typeof buildVisualizationBrowserRegressionPlan>) {
  return plan.hkDemoSafePackages.map((regressionPackage, index) => ({
    duration: "1s",
    packageId: regressionPackage.id,
    port: 3400 + index,
    runId: `synthetic-binding-${index}`,
    status: "passed" as const,
    binding: {
      sourceCommit: expectedExecution.sourceCommit,
      sourceDirty: false,
      labIds: [...regressionPackage.labIds],
      commandEnv: { ...regressionPackage.commandEnv },
      runConfiguration: { ...expectedExecution.runConfiguration }
    }
  }));
}

test("historical package IDs cannot certify a different lab collection", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("never-tested-lab", "P1")]);
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, recordedHkGradePackageBrowserEvidence, expectedExecution);

  assert.equal(matrix.hkGradeSplitStatus, "incomplete");
  assert.equal(matrix.hkGradePackageEvidence[0].status, "not-run");
  assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, "unbound-record");
  assert.deepEqual(matrix.missingHkPackageIds, ["hk-demo-P1-part-1"]);
  assert.equal(matrix.hkGradePackageEvidence[0].recordedRun?.runId, "manim-v2-a11-20260628ai");
  assert.equal(matrix.hkGradePackageEvidence[0].runId, "not-run");
  assert.doesNotMatch(matrix.hkGradePackageEvidence[0].command, /20260628/);
});

for (const [name, change, reason] of [
  ["stale source commit", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.sourceCommit = "2".repeat(40); }, "source-mismatch"],
  ["dirty source", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.sourceDirty = true; }, "dirty-source"],
  ["different lab set", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.labIds = ["another-lab"]; }, "lab-set-mismatch"],
  ["missing lab", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.labIds.pop(); }, "lab-set-mismatch"],
  ["different project", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.runConfiguration.project = "mobile-chrome"; }, "configuration-mismatch"],
  ["different test selector", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.runConfiguration.grep = "another test"; }, "configuration-mismatch"],
  ["different test file", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.runConfiguration.testFile = "tests/e2e/another.spec.ts"; }, "configuration-mismatch"],
  ["different timeout", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.runConfiguration.timeoutMs = 60_000; }, "configuration-mismatch"],
  ["different retries", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.runConfiguration.retries = 1; }, "configuration-mismatch"],
  ["different workers", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.runConfiguration.workers = 2; }, "configuration-mismatch"],
  ["different browser channel", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.runConfiguration.browserChannel = "chromium"; }, "configuration-mismatch"],
  ["different sweep mode", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.runConfiguration.sweepMode = "strict"; }, "configuration-mismatch"],
  ["different environment", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.commandEnv.VISUALIZATION_SWEEP_TRACKS = "US"; }, "configuration-mismatch"],
  ["different lab selector", (run: ReturnType<typeof boundRuns>[number]) => { run.binding.commandEnv.VISUALIZATION_SWEEP_LABS = "another-lab"; }, "configuration-mismatch"]
] as const) {
  test(`browser evidence rejects ${name} under an unchanged package ID`, () => {
    const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4"), fixtureLab("p4-decimals", "P4")]);
    const runs = boundRuns(plan);
    change(runs[0]);
    const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expectedExecution);

    assert.equal(matrix.hkGradeSplitStatus, "incomplete");
    assert.equal(matrix.hkGradePackageEvidence[0].status, "not-run");
    assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, reason);
  });
}

test("matching records need an independently supplied expected execution", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, boundRuns(plan));
  assert.equal(matrix.hkGradeSplitStatus, "incomplete");
  assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, "missing-context");
});

test("duplicate package records cannot win by array order", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  const runs = boundRuns(plan);
  for (const records of [[runs[0], { ...runs[0], runId: "another-run" }], [{ ...runs[0], runId: "another-run" }, runs[0]]]) {
    const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, records, expectedExecution);
    assert.equal(matrix.hkGradeSplitStatus, "incomplete");
    assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, "duplicate-records");
  }
});

test("an empty plan cannot pass without checking any labs", () => {
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(buildVisualizationBrowserRegressionPlan([]), [], expectedExecution);
  assert.equal(matrix.hkGradeSplitStatus, "incomplete");
});

test("lab order and selector whitespace do not change the bound experiment set", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4"), fixtureLab("p4-decimals", "P4")]);
  const runs = boundRuns(plan);
  runs[0].binding.labIds.reverse();
  runs[0].binding.commandEnv.VISUALIZATION_SWEEP_LABS = " p4-decimals, p4-angles ";
  const before = JSON.stringify({ plan, runs });
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expectedExecution);
  assert.equal(matrix.hkGradeSplitStatus, "passed");
  assert.equal(JSON.stringify({ plan, runs }), before, "validation must not rewrite the evidence or plan");
});

test("a partial run collection only certifies matching packages", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p1-counting", "P1"), fixtureLab("p4-angles", "P4")]);
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, boundRuns(plan).slice(0, 1), expectedExecution);
  assert.equal(matrix.hkGradeSplitStatus, "incomplete");
  assert.deepEqual(matrix.hkGradePackageEvidence.map((entry) => entry.validationStatus), ["matched", "missing-run"]);
  assert.deepEqual(matrix.missingHkPackageIds, ["hk-demo-P4-part-1"]);
});

for (const shape of ["unfilled", "deleted-element"] as const) {
  test(`a sparse ${shape} lab list cannot certify an experiment set`, () => {
    const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
    const runs = boundRuns(plan);
    if (shape === "unfilled") runs[0].binding.labIds = new Array<string>(1);
    else delete runs[0].binding.labIds[0];

    const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expectedExecution);
    assert.equal(matrix.hkGradeSplitStatus, "incomplete");
    assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, "lab-set-mismatch");
    const readiness = buildVisualizationReleaseReadinessEvidence({ browserEvidence: matrix, teachingSignoff: buildMathSceneTeachingSignoffMatrix() });
    assert.equal(readiness.a11SplitRegressionStatus, "incomplete");
    assert.deepEqual(readiness.splitPackageStatusCounts, { "not-run": 1, passed: 0 });
  });
}

test("inherited execution configuration fields cannot bypass comparison", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  const runs = boundRuns(plan);
  const expected = {
    ...expectedExecution,
    runConfiguration: Object.create(expectedExecution.runConfiguration)
  };
  runs[0].binding.runConfiguration = Object.create({ ...expectedExecution.runConfiguration, project: "mobile-chrome" });
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expected);
  assert.equal(matrix.hkGradeSplitStatus, "incomplete");
  assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, "invalid-context");
});

test("partially inherited recorded configuration is rejected even when inherited values match", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  const runs = boundRuns(plan);
  const { project, ...ownFields } = expectedExecution.runConfiguration;
  runs[0].binding.runConfiguration = Object.assign(Object.create({ project }), ownFields);
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expectedExecution);
  assert.equal(matrix.hkGradeSplitStatus, "incomplete");
  assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, "configuration-mismatch");
});

test("validated evidence remains a snapshot when its source inputs are reused", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  const runs = boundRuns(plan);
  const expected = structuredClone(expectedExecution);
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expected);
  assert.equal(matrix.hkGradeSplitStatus, "passed");
  const validatedSnapshot = JSON.stringify(matrix);

  expected.sourceCommit = "2".repeat(40);
  expected.runConfiguration.project = "mobile-chrome";
  runs[0].binding.sourceCommit = "3".repeat(40);
  runs[0].binding.runConfiguration.project = "mobile-chrome";
  runs[0].binding.commandEnv.VISUALIZATION_SWEEP_LABS = "untested";
  runs[0].binding.labIds[0] = "untested";
  plan.hkDemoSafePackages[0].labIds[0] = "untested";
  plan.requiredRootDataAttributes.reverse();
  plan.requiredRunFromBeatCheckpointInvalidationDataAttributes.reverse();

  assert.equal(JSON.stringify(matrix), validatedSnapshot);
  assert.equal(buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expected).hkGradeSplitStatus, "incomplete");
});

test("source fields lost during snapshotting cannot contribute to a pass", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  const runs = boundRuns(plan);
  const { sourceCommit, ...ownFields } = runs[0].binding;
  runs[0].binding = Object.assign(Object.create({ sourceCommit }), ownFields);
  const inherited = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expectedExecution);
  assert.equal(inherited.hkGradeSplitStatus, "incomplete");
  assert.equal(inherited.hkGradePackageEvidence[0].validationStatus, "invalid-binding");

  const expected = structuredClone(expectedExecution);
  Object.defineProperty(expected, "sourceCommit", { enumerable: false });
  const nonEnumerable = buildVisualizationBrowserRegressionEvidenceMatrix(plan, boundRuns(plan), expected);
  assert.equal(nonEnumerable.hkGradeSplitStatus, "incomplete");
  assert.equal(nonEnumerable.hkGradePackageEvidence[0].validationStatus, "invalid-context");
});

test("the same captured source value is validated, returned and replayed", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  let reads = 0;
  const expected = {
    get sourceCommit() { return ++reads <= 2 ? expectedExecution.sourceCommit : "2".repeat(40); },
    runConfiguration: { ...expectedExecution.runConfiguration }
  };
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, boundRuns(plan), expected);
  assert.equal(matrix.hkGradeSplitStatus, "passed");
  assert.equal(reads, 1, "source is read once into the snapshot before validation");
  assert.equal(matrix.expectedExecution?.sourceCommit, expectedExecution.sourceCommit);
  const recorded = matrix.hkGradePackageEvidence[0].recordedRun;
  assert.ok(recorded);
  const replay = buildVisualizationBrowserRegressionEvidenceMatrix(plan, [recorded], matrix.expectedExecution);
  assert.equal(replay.hkGradeSplitStatus, "passed");
});

for (const shape of ["all-missing", "partly-missing"] as const) {
  test(`a sparse ${shape} package plan cannot produce an aggregate pass`, () => {
    const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
    const runs = boundRuns(plan);
    if (shape === "all-missing") delete plan.hkDemoSafePackages[0];
    else plan.hkDemoSafePackages.length += 1;
    const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expectedExecution);
    assert.equal(matrix.hkGradeSplitStatus, "incomplete");
    const readiness = buildVisualizationReleaseReadinessEvidence({ browserEvidence: matrix, teachingSignoff: buildMathSceneTeachingSignoffMatrix() });
    assert.equal(readiness.a11SplitRegressionStatus, "incomplete");
  });
}

test("plan selectors must agree with its advertised lab set", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  plan.hkDemoSafePackages[0].commandEnv.VISUALIZATION_SWEEP_LABS = "another-lab";
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, boundRuns(plan), expectedExecution);
  assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, "configuration-mismatch");
  assert.equal(matrix.hkGradeSplitStatus, "incomplete");
});

for (const shape of ["empty", "duplicate", "extra"] as const) {
  test(`an ${shape} recorded lab set cannot certify the plan`, () => {
    const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
    const runs = boundRuns(plan);
    runs[0].binding.labIds = shape === "empty" ? [] : ["p4-angles", shape === "duplicate" ? "p4-angles" : "another-lab"];
    const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expectedExecution);
    assert.equal(matrix.hkGradeSplitStatus, "incomplete");
    assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, "lab-set-mismatch");
  });
}

test("malformed imported execution metadata fails closed instead of throwing", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  for (const field of ["configuration", "runId"] as const) {
    const runs = JSON.parse(JSON.stringify(boundRuns(plan)));
    if (field === "configuration") runs[0].binding.runConfiguration = null;
    else delete runs[0].runId;
    const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expectedExecution);
    assert.equal(matrix.hkGradeSplitStatus, "incomplete");
    assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, field === "configuration" ? "configuration-mismatch" : "invalid-binding");
  }
});

test("branch names cannot stand in for immutable source commits", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  const runs = boundRuns(plan);
  const invalidExpected = { ...expectedExecution, sourceCommit: "origin/main" };
  assert.equal(buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, invalidExpected).hkGradePackageEvidence[0].validationStatus, "invalid-context");
  runs[0].binding.sourceCommit = "main";
  assert.equal(buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expectedExecution).hkGradePackageEvidence[0].validationStatus, "invalid-binding");
});

test("a failed run with otherwise matching bindings never counts as passing", () => {
  const plan = buildVisualizationBrowserRegressionPlan([fixtureLab("p4-angles", "P4")]);
  const runs = boundRuns(plan).map((run) => ({ ...run, status: "failed" as const }));
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, runs, expectedExecution);
  assert.equal(matrix.hkGradeSplitStatus, "incomplete");
  assert.equal(matrix.hkGradePackageEvidence[0].validationStatus, "unsuccessful-run");
});

test("release-readiness consumes the rejected evidence as incomplete", () => {
  const plan = buildVisualizationBrowserRegressionPlan(browserEvidenceFixtureLabs);
  const browserEvidence = buildVisualizationBrowserRegressionEvidenceMatrix(plan, recordedHkGradePackageBrowserEvidence, expectedExecution);
  const readiness = buildVisualizationReleaseReadinessEvidence({ browserEvidence, teachingSignoff: buildMathSceneTeachingSignoffMatrix() });
  assert.equal(readiness.a11SplitRegressionStatus, "incomplete");
  assert.deepEqual(readiness.splitPackageStatusCounts, { "not-run": 12, passed: 0 });
  assert.equal(readiness.productionDeployAllowed, false);
});

test("Visualization Lab browser evidence matrix passes only explicitly bound matching runs", () => {
  const plan = buildVisualizationBrowserRegressionPlan(browserEvidenceFixtureLabs, { maxLabsPerPackage: 8 });
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, boundRuns(plan), expectedExecution);

  assert.equal(matrix.sourceContract, VISUALIZATION_BROWSER_REGRESSION_EVIDENCE_CONTRACT);
  assert.equal(matrix.hkGradeSplitStatus, "passed");
  assert.deepEqual(matrix.missingHkPackageIds, []);
  assert.deepEqual(
    matrix.hkGradePackageEvidence.map((entry) => entry.grade),
    ["P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"]
  );
  assert.ok(matrix.hkGradePackageEvidence.every((entry) => entry.status === "passed"));
  assert.ok(matrix.hkGradePackageEvidence.every((entry) => entry.command.includes("VISUALIZATION_SWEEP_TRACKS=HK")));
  assert.ok(matrix.hkGradePackageEvidence.every((entry) => entry.validationStatus === "matched"));
  assert.ok(matrix.hkGradePackageEvidence.every((entry) => entry.runId.startsWith("synthetic-binding-")));
});

test("matching P4 evidence uses the recorded run and the exact expected execution", () => {
  const plan = buildVisualizationBrowserRegressionPlan(browserEvidenceFixtureLabs, { maxLabsPerPackage: 8 });
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan, boundRuns(plan), expectedExecution);
  const p4Evidence = matrix.hkGradePackageEvidence.find((entry) => entry.packageId === "hk-demo-P4-part-1");

  assert.deepEqual(matrix.expectedExecution, expectedExecution);
  assert.ok(p4Evidence);
  assert.deepEqual(p4Evidence.labIds, ["p4-angles", "p4-decimals", "p4-large-numbers", "p4-perimeter-area"]);
  assert.equal(p4Evidence.runId, "synthetic-binding-3");
  assert.equal(p4Evidence.port, 3403);
  assert.equal(p4Evidence.duration, "1s");
  assert.match(p4Evidence.command, /PLAYWRIGHT_RUN_ID=synthetic-binding-3/);
  assert.match(p4Evidence.command, /PLAYWRIGHT_PORT=3403/);
  assert.match(p4Evidence.command, /VISUALIZATION_SWEEP_LABS=p4-angles,p4-decimals,p4-large-numbers,p4-perimeter-area/);
  assert.match(p4Evidence.command, /--project=desktop-chrome/);
  assert.match(p4Evidence.command, /--timeout=180000 --retries=0 --workers=1/);
});

test("Visualization Lab browser evidence matrix keeps the broad gate red until A11/A22 consume the split contract", () => {
  const plan = buildVisualizationBrowserRegressionPlan(browserEvidenceFixtureLabs, { maxLabsPerPackage: 8 });
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan);

  assert.equal(matrix.broadGateStatus, "red-needs-a11-a22-follow-up");
  assert.equal(matrix.hkGradeSplitStatus, "incomplete");
  assert.match(matrix.a11HandoffSummary, /lack matching browser evidence/);
  assert.deepEqual(matrix.remainingA11Actions, [
    "adopt-hk-grade-split-packages",
    "update-projection-views-expected-list",
    "smoke-check-run-from-beat-checkpoint-invalidation-root-attributes",
    "keep-non-hk-tracks-out-of-hk-demo-sweep"
  ]);
  assert.deepEqual(matrix.remainingA22Actions, [
    "investigate-isolated-next-chunk-serving-after-broad-timeout",
    "release-from-clean-worktree-or-reviewed-pruned-staging-slice"
  ]);
});

test("Visualization Lab browser evidence matrix carries required A11 root smoke attributes from the plan", () => {
  const plan = buildVisualizationBrowserRegressionPlan(browserEvidenceFixtureLabs, { maxLabsPerPackage: 8 });
  const matrix = buildVisualizationBrowserRegressionEvidenceMatrix(plan);

  assert.deepEqual(matrix.requiredRootDataAttributes, plan.requiredRootDataAttributes);
  assert.deepEqual(
    matrix.requiredRunFromBeatCheckpointInvalidationDataAttributes,
    plan.requiredRunFromBeatCheckpointInvalidationDataAttributes
  );
  assert.ok(
    matrix.remainingA11Actions.includes("smoke-check-run-from-beat-checkpoint-invalidation-root-attributes")
  );
  assert.deepEqual(matrix.requiredRunFromBeatCheckpointInvalidationDataAttributes, [
    "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
    "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
    "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
    "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore",
    "data-viz-manim-run-from-beat-checkpoint-restore-action"
  ]);
});
