import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import {
  HK_VISUALIZATION_DYNAMIC_RANGE_DEFAULT_TIMEOUT_MS,
  HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS,
  HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE,
  HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES,
  HK_VISUALIZATION_RELEASE_NON_PACKAGE_TEST_TIMEOUTS_BY_FILE,
  HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
} from "./hk-visualization-release-title-manifest.mjs";
import {
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID,
} from "./hk-visualization-dependent-transition-plan-manifest.mjs";
import {
  HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_SCHEMA,
  buildHkVisualizationGlobalProfileReceipt,
  hashHkVisualizationGlobalProfileMonitorSources,
  sampleHkVisualizationGlobalProfiles,
} from "./hk-visualization-global-profile-monitor.mjs";
import {
  hashHkVisualizationWorkloadCommand,
  HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS,
  HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS,
  HK_VISUALIZATION_WORKLOAD_CLEANUP_POST_RESERVE_MS,
  HK_VISUALIZATION_WORKLOAD_SUPERVISOR_SCHEMA,
  hashHkVisualizationWorkloadSupervisorSources,
} from "./hk-visualization-workload-supervisor.mjs";
import {
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_SCHEMA,
} from "./hk-visualization-owned-process-ledger.mjs";
import {
  HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES,
  HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS,
  HK_VISUALIZATION_PROFILE_PROCESS_PHASE_TWO_ARGS_TEMPLATE,
  HK_VISUALIZATION_PROFILE_PROCESS_PS_ENV,
  HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY,
  HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_SCHEMA,
  HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS,
} from "./hk-visualization-profile-process-sampler.mjs";
import {
  buildHkVisualizationManagedWebServerCommand,
  buildHkVisualizationStarshipPathManifest,
} from "./hk-visualization-starship-path-contract.mjs";
import { buildHkVisualizationCanonicalE2eTsconfigBytes } from "./hk-visualization-e2e-tsconfig-contract.mjs";
import { captureHkVisualizationReleaseSourceSnapshot } from "./hk-visualization-release-source-freeze.mjs";
import {
  buildHkVisualizationDependencyClosureSummaryReceipt,
  captureAndAssertHkVisualizationCanonicalDependencyClosure,
  captureHkVisualizationDependencyClosure,
  compareHkVisualizationDependencyClosures,
  serializeHkVisualizationDependencyClosureManifest,
  validateHkVisualizationDependencyClosureManifestArtifact,
  validateHkVisualizationDependencyClosureSummaryReceipt,
} from "./hk-visualization-dependency-closure.mjs";
import HkVisualizationRuntimeEvidenceReporter, {
  assertNoForeignActivePlaywrightProfiles,
  assertCleanHkVisualizationReleaseEnvironment,
  assertHkVisualizationPostflightProfileHygiene,
  buildHkVisualizationReleasePlan,
  HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
  HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
  HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
  HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_RUN_EVIDENCE_VERSION,
  HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
  HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_RUN_EVIDENCE_VERSION,
  HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
  HK_VISUALIZATION_BROWSER_P6_AVERAGES_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_P6_AVERAGES_RUN_EVIDENCE_VERSION,
  HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
  HK_VISUALIZATION_BROWSER_P6_BUDGET_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_P6_BUDGET_RUN_EVIDENCE_VERSION,
  HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
  HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
  HK_VISUALIZATION_BROWSER_SCROLL_RUN_EVIDENCE_VERSION,
  HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY,
  HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_SUM_MS,
  HK_VISUALIZATION_LESSON_PACKAGE_TIMEOUT_SUM_MS,
  HK_VISUALIZATION_NON_PACKAGE_TEST_TIMEOUT_SUM_MS,
  HK_VISUALIZATION_NON_PACKAGE_TEST_TIMEOUT_TOPOLOGY,
  HK_VISUALIZATION_OTHER_TEST_TIMEOUT_CAP_MS,
  HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT,
  HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS,
  HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS,
  HK_VISUALIZATION_RELEASE_SOURCE_RECEIPT_SCHEMA,
  HK_VISUALIZATION_RELEASE_SPECS,
  HK_VISUALIZATION_RELEASE_SETUP_TIMEOUT_MS,
  HK_VISUALIZATION_RELEASE_WORKLOAD_TIMEOUT_MS,
  HK_VISUALIZATION_RUNTIME_PROFILE_RECEIPT_VERSION,
  HK_VISUALIZATION_SUPERVISOR_CLEANUP_GRACE_MS,
  HK_VISUALIZATION_PASS_THROUGH_ORACLE_EXPECTED_CELL_COUNT,
  HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS,
  HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION,
  HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_CANONICAL_NOOP_ACTION_COUNT,
  HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_LAYER_RECEIPT_COUNT,
  HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_OBSERVATION_COUNT,
  HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_RESTORING_ACTION_COUNT,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_CELL_COUNT,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_PHASE_OBSERVATION_COUNT,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_SEQUENCE_OBSERVATION_COUNT,
  HK_VISUALIZATION_P6_AVERAGES_EXPECTED_CELL_COUNT,
  HK_VISUALIZATION_P6_AVERAGES_LAB_ID,
  HK_VISUALIZATION_P6_BUDGET_EXPECTED_CELL_COUNT,
  HK_VISUALIZATION_P6_BUDGET_LAB_ID,
  classifyGlobalProfileMonitorProcessProbe,
  executeHkVisualizationSupervisedWorkload,
  parseHkVisualizationReleaseRunnerArgs,
  readHkVisualizationProfileProcessSample,
  runHkVisualizationReleaseGate,
  terminateGlobalProfileMonitorChild,
  validateHkVisualizationBrowserScrollAnnotations,
  validateHkVisualizationBrowserDependentTransitionAnnotations,
  validateHkVisualizationBrowserPassThroughOracleAnnotations,
  validateHkVisualizationBrowserPassThroughResetAnnotations,
  validateHkVisualizationBrowserP6AveragesAnnotations,
  validateHkVisualizationBrowserP6BudgetAnnotations,
  validateHkVisualizationCanonicalDependencyClosureSummary,
  validateHkVisualizationNonPackageTestTimeoutTopology,
  validateHkVisualizationReleaseReport,
} from "./run-hk-visualization-release-gate.mjs";
import * as hkVisualizationReleaseGateModule from
  "./run-hk-visualization-release-gate.mjs";

const currentTestWorkspace = realpathSync(
  join(dirname(fileURLToPath(import.meta.url)), "../.."),
);
const testArtifactRootCandidate =
  process.env.HK_VISUALIZATION_RUNNER_TEST_ARTIFACT_ROOT ??
  join(
    hkVisualizationReleaseGateModule.HK_VISUALIZATION_RELEASE_DEFAULT_WORKSPACE,
    ".tmp",
    "hk-viz-release-runner-unit-fixtures",
  );
const { path: testArtifactRoot } =
  hkVisualizationReleaseGateModule
    .materializeHkVisualizationRunnerTestArtifactRoot(
      testArtifactRootCandidate,
    );

const HK_VISUALIZATION_SCROLL_FIXTURE_CELL_COUNT = 918;
const HK_VISUALIZATION_SCROLL_FIXTURE_BASE_PHASE_COUNT = 4;
const HK_VISUALIZATION_SCROLL_FIXTURE_P6_BUDGET_PHASE_COUNT = 10;
const HK_VISUALIZATION_SCROLL_FIXTURE_OBSERVATION_COUNT =
  HK_VISUALIZATION_SCROLL_FIXTURE_CELL_COUNT *
    HK_VISUALIZATION_SCROLL_FIXTURE_BASE_PHASE_COUNT +
  HK_VISUALIZATION_PASS_THROUGH_ORACLE_EXPECTED_CELL_COUNT +
  HK_VISUALIZATION_P6_BUDGET_EXPECTED_CELL_COUNT *
    (HK_VISUALIZATION_SCROLL_FIXTURE_P6_BUDGET_PHASE_COUNT -
      HK_VISUALIZATION_SCROLL_FIXTURE_BASE_PHASE_COUNT);

const hkVisualizationPassThroughResetFixturePlans = Object.freeze({
  "advanced-functions": Object.freeze({ comparison: 5, height: 3, mode: 0, value: 5 }),
  calculus: Object.freeze({ comparison: 4, height: 3, mode: 0, value: 5 }),
  "data-handling": Object.freeze({ comparison: 2, height: 3, mode: 0, value: 5 }),
  "differentiation-intro": Object.freeze({ comparison: 4, height: 3, mode: 0, value: 5 }),
  "p2-multiplication-foundations": Object.freeze({ comparison: 5, height: 3, mode: 0, value: 4 }),
  "p3-fractions-intro": Object.freeze({ comparison: 4, height: 3, mode: 0, value: 5 }),
  "statistics-s1": Object.freeze({ comparison: 2, height: 3, mode: 0, value: 5 }),
});
const hkVisualizationPassThroughResetFixturePerturbations = Object.freeze({
  "advanced-functions": Object.freeze({ comparison: 0, height: 3, mode: 0, value: 5 }),
  calculus: Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
  "data-handling": Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
  "differentiation-intro": Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
  "p2-multiplication-foundations": Object.freeze({ comparison: 1, height: 3, mode: 0, value: 4 }),
  "p3-fractions-intro": Object.freeze({ comparison: 0, height: 3, mode: 0, value: 5 }),
  "statistics-s1": Object.freeze({ comparison: 1, height: 3, mode: 0, value: 5 }),
});
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalFixtureJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("fixture number must be finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value))
    return `[${value.map(canonicalFixtureJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalFixtureJson(value[key])}`)
    .join(",")}}`;
}

function hashCanonicalFixture(value) {
  return sha256(canonicalFixtureJson(value));
}

function orderedFixtureJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0))
      throw new Error("ordered fixture number must be finite and not negative zero");
    return JSON.stringify(value);
  }
  if (Array.isArray(value))
    return `[${value.map(orderedFixtureJson).join(",")}]`;
  if (!value || typeof value !== "object")
    throw new Error("ordered fixture must contain JSON data only");
  return `{${Object.keys(value)
    .map((key) => `${JSON.stringify(key)}:${orderedFixtureJson(value[key])}`)
    .join(",")}}`;
}

function hashOrderedFixtureWithoutKey(value, omittedKey) {
  const payload = {};
  for (const key of Object.keys(value)) {
    if (key !== omittedKey) payload[key] = value[key];
  }
  return sha256(orderedFixtureJson(payload));
}

const paintedFixtureFrame = Object.freeze({ height: 148, width: 456, x: 92, y: 116 });
const paintedFixtureViewports = Object.freeze({
  distribution: Object.freeze({
    domain: Object.freeze({ xMax: 22, xMin: -12, yMax: 1.1, yMin: 0 }),
    id: "hk-distribution-summary-fixed-v1",
    xTicks: Object.freeze([-10, 0, 10, 20]),
    yTicks: Object.freeze([0, 0.5, 1]),
  }),
  quadratic: Object.freeze({
    domain: Object.freeze({ xMax: 3, xMin: -2.4, yMax: 21, yMin: -6 }),
    id: "hk-selected-quadratic-fixed-v1",
    xTicks: Object.freeze([-2, 0, 2]),
    yTicks: Object.freeze([-5, 0, 5, 10, 15, 20]),
  }),
});

function paintedFixtureFixed(value, digits = 2) {
  const rounded = Number(value.toFixed(digits));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function paintedFixtureMap(point, viewport) {
  return {
    x: paintedFixtureFrame.x + ((point.x - viewport.domain.xMin) /
      (viewport.domain.xMax - viewport.domain.xMin)) * paintedFixtureFrame.width,
    y: paintedFixtureFrame.y + paintedFixtureFrame.height -
      ((point.y - viewport.domain.yMin) /
        (viewport.domain.yMax - viewport.domain.yMin)) * paintedFixtureFrame.height,
  };
}

function paintedFixtureMark(attributes, text = "", tagName = "path") {
  return {
    attributes: Object.fromEntries(Object.entries(attributes).map(
      ([key, value]) => [key, String(value)],
    )),
    tagName,
    text,
  };
}

function paintedFixtureLocalized(labId, state, locale) {
  if (labId !== "advanced-functions") {
    const mean = paintedFixtureFixed(state.mean);
    const spread = paintedFixtureFixed(state.spread);
    if (locale === "zh") return {
      check: `關於 μ=${mean} 對稱 · 高度(μ−離散程度)=高度(μ+離散程度)`,
      checkLabel: "驗證",
      formula: `中心 μ=${mean} · 離散程度=${spread}`,
      formulaLabel: "公式",
      readout: `平均數=${mean} · 離散程度=${spread} · 對稱分佈`,
    };
    if (locale === "zh-Hans") return {
      check: `关于 μ=${mean} 对称 · 高度(μ−离散程度)=高度(μ+离散程度)`,
      checkLabel: "验证",
      formula: `中心 μ=${mean} · 离散程度=${spread}`,
      formulaLabel: "公式",
      readout: `平均数=${mean} · 离散程度=${spread} · 对称分布`,
    };
    return {
      check: `symmetric about μ=${mean} · height(μ−spread)=height(μ+spread)`,
      checkLabel: "Check",
      formula: `center μ=${mean} · spread=${spread}`,
      formulaLabel: "Formula",
      readout: `mean=${mean} · spread=${spread} · symmetric distribution`,
    };
  }
  const scale = paintedFixtureFixed(state.scale);
  const shift = paintedFixtureFixed(state.verticalShift);
  const formula = `y=${scale}x² + ${paintedFixtureFixed(Math.abs(state.verticalShift))}`;
  if (locale === "zh") return {
    check: `已選二次函數 · a=${scale} · k=${shift}`,
    checkLabel: "驗證",
    formula,
    formulaLabel: "公式",
    readout: `二次函數 · a=${scale} · k=${shift}`,
  };
  if (locale === "zh-Hans") return {
    check: `已选二次函数 · a=${scale} · k=${shift}`,
    checkLabel: "验证",
    formula,
    formulaLabel: "公式",
    readout: `二次函数 · a=${scale} · k=${shift}`,
  };
  return {
    check: `selected quadratic · a=${scale} · k=${shift}`,
    checkLabel: "Check",
    formula,
    formulaLabel: "Formula",
    readout: `quadratic · a=${scale} · k=${shift}`,
  };
}

function paintedFixtureVisibleNamedMarks(quadratic, viewport) {
  const names = [
    "configured semantic secondary model",
    "semantic model body",
    "semantic fixed viewport",
    ...viewport.xTicks.map(() => "semantic x tick"),
    ...viewport.yTicks.map(() => "semantic y tick"),
    "semantic x axis",
    "semantic y axis",
  ];
  names.push(...(quadratic
    ? [
        "advanced primary curve",
        "advanced curve sample",
        "advanced curve sample",
        "advanced curve sample",
        "advanced function readout",
      ]
    : [
        "distribution spread band",
        "distribution summary curve",
        "distribution left spread marker",
        "distribution right spread marker",
        "distribution mean",
        "distribution summary readout",
      ]));
  names.push(
    "semantic formula background",
    "semantic formula",
    "semantic invariant check background",
    "semantic invariant check",
    "semantic formula and check outline",
  );
  return names;
}

function paintedFixtureViewportMarks(viewport) {
  return {
    "semantic fixed viewport": [paintedFixtureMark({
      "data-viz-domain-x-max": viewport.domain.xMax,
      "data-viz-domain-x-min": viewport.domain.xMin,
      "data-viz-domain-y-max": viewport.domain.yMax,
      "data-viz-domain-y-min": viewport.domain.yMin,
      "data-viz-viewport-id": viewport.id,
      "data-viz-x-ticks": viewport.xTicks.join(","),
      "data-viz-y-ticks": viewport.yTicks.join(","),
      height: paintedFixtureFrame.height,
      width: paintedFixtureFrame.width,
      x: paintedFixtureFrame.x,
      y: paintedFixtureFrame.y,
    }, "", "rect")],
    "semantic x tick": viewport.xTicks.map((tick) => {
      const point = paintedFixtureMap({ x: tick, y: 0 }, viewport);
      return paintedFixtureMark({
        "data-viz-tick-axis": "x",
        "data-viz-tick-value": tick,
        x1: point.x,
        x2: point.x,
        y1: paintedFixtureFrame.y,
        y2: paintedFixtureFrame.y + paintedFixtureFrame.height,
      }, "", "line");
    }),
    "semantic y tick": viewport.yTicks.map((tick) => {
      const point = paintedFixtureMap({ x: 0, y: tick }, viewport);
      return paintedFixtureMark({
        "data-viz-tick-axis": "y",
        "data-viz-tick-value": tick,
        x1: paintedFixtureFrame.x,
        x2: paintedFixtureFrame.x + paintedFixtureFrame.width,
        y1: point.y,
        y2: point.y,
      }, "", "line");
    }),
  };
}

function paintedFixtureStates(labId) {
  if (labId === "advanced-functions") {
    return {
      after: {
        check: "selected quadratic · a=1.67 · k=0",
        comparison: 5,
        family: "quadratic",
        formula: "y=1.67x² + 0",
        height: 3,
        kind: "advanced-functions",
        mode: 0,
        model: "function-properties",
        scale: 5 / 3,
        selectedCurveOnly: true,
        semanticFamily: "function-properties",
        strand: null,
        topic: "advanced-functions",
        value: 10,
        variant: "advanced-functions",
        verticalShift: 0,
      },
      before: {
        check: "selected quadratic · a=0.17 · k=0",
        comparison: 5,
        family: "quadratic",
        formula: "y=0.17x² + 0",
        height: 3,
        kind: "advanced-functions",
        mode: 0,
        model: "function-properties",
        scale: 1 / 6,
        selectedCurveOnly: true,
        semanticFamily: "function-properties",
        strand: null,
        topic: "advanced-functions",
        value: 1,
        variant: "advanced-functions",
        verticalShift: 0,
      },
    };
  }
  const topic = labId;
  return {
    after: {
      check: "symmetric about μ=0 · height(μ−spread)=height(μ+spread)",
      comparison: 4,
      formula: "center μ=0 · spread=4",
      height: 3,
      kind: "distribution",
      mean: 0,
      mode: 0,
      model: "statistics-distribution",
      semanticFamily: "statistics-distribution",
      spread: 4,
      strand: null,
      topic,
      value: 0,
      variant: topic,
    },
    before: {
      check: "symmetric about μ=0 · height(μ−spread)=height(μ+spread)",
      comparison: 1,
      formula: "center μ=0 · spread=1",
      height: 3,
      kind: "distribution",
      mean: 0,
      mode: 0,
      model: "statistics-distribution",
      semanticFamily: "statistics-distribution",
      spread: 1,
      strand: null,
      topic,
      value: 0,
      variant: topic,
    },
  };
}

function paintedFixtureEndpointParts(labId, state, locale) {
  const quadratic = labId === "advanced-functions";
  const viewport = quadratic
    ? paintedFixtureViewports.quadratic
    : paintedFixtureViewports.distribution;
  const text = paintedFixtureLocalized(labId, state, locale);
  const series = quadratic
    ? Array.from({ length: 33 }, (_, index) => {
        const x = -2.4 + index * (5.4 / 32);
        return { x, y: state.scale * x ** 2 + state.verticalShift };
      })
    : Array.from({ length: 25 }, (_, index) => {
        const standardized = -3 + index * 0.25;
        return {
          x: state.mean + standardized * state.spread,
          y: Math.exp(-0.5 * standardized ** 2),
        };
      });
  const mapped = series.map((point) => paintedFixtureMap(point, viewport));
  const commonMarks = {
    ...paintedFixtureViewportMarks(viewport),
    "semantic formula": [paintedFixtureMark({
      "data-viz-visible-formula": text.formula,
      "data-viz-visible-locale": locale,
    }, `${text.formulaLabel}: ${text.formula}`, "text")],
    "semantic invariant check": [paintedFixtureMark({
      "data-viz-visible-check": text.check,
      "data-viz-visible-locale": locale,
    }, `${text.checkLabel}: ${text.check}`, "text")],
  };
  const visibleMathMarksByName = quadratic
    ? {
        ...commonMarks,
        "advanced curve sample": [0, 16, 32].map((index) =>
          paintedFixtureMark({
            "data-viz-mapped-x": mapped[index].x,
            "data-viz-mapped-y": mapped[index].y,
            "data-viz-sample-index": index,
            "data-viz-x": series[index].x,
            "data-viz-y": series[index].y,
            cx: mapped[index].x,
            cy: mapped[index].y,
            r: 4,
          }, "", "circle")),
        "advanced function readout": [paintedFixtureMark({
          "data-viz-formula": text.formula.slice(2),
          "data-viz-primary-family": "quadratic",
          "data-viz-scale-parameter": state.scale,
          "data-viz-selected-curve-only": true,
          "data-viz-token-a": paintedFixtureFixed(state.scale),
          "data-viz-token-k": paintedFixtureFixed(state.verticalShift),
          "data-viz-vertical-shift": state.verticalShift,
          "data-viz-visible-locale": locale,
          "data-viz-visible-readout": text.readout,
          x: 320,
          y: 108,
        }, text.readout, "text")],
        "advanced primary curve": [paintedFixtureMark({
          "data-viz-domain-max": series.at(-1).x,
          "data-viz-domain-min": series[0].x,
          "data-viz-formula": text.formula.slice(2),
          "data-viz-function-family": "quadratic",
          "data-viz-sample-count": 33,
          "data-viz-sample-end-x": mapped.at(-1).x,
          "data-viz-sample-end-y": mapped.at(-1).y,
          "data-viz-sample-middle-x": mapped[16].x,
          "data-viz-sample-middle-y": mapped[16].y,
          "data-viz-sample-start-x": mapped[0].x,
          "data-viz-sample-start-y": mapped[0].y,
          "data-viz-scale-parameter": state.scale,
          "data-viz-vertical-shift": state.verticalShift,
          d: mapped.map((point, index) =>
            `${index === 0 ? "M" : "L"} ${paintedFixtureFixed(point.x, 1)} ${paintedFixtureFixed(point.y, 1)}`,
          ).join(" "),
        })],
      }
    : {
        ...commonMarks,
        "distribution left spread marker": [paintedFixtureMark({
          "data-viz-density": Math.exp(-0.5),
          "data-viz-mapped-x": mapped[8].x,
          "data-viz-mapped-y": mapped[8].y,
          "data-viz-series-index": 8,
          "data-viz-series-y": series[8].y,
          "data-viz-x-value": state.mean - state.spread,
          cx: mapped[8].x,
          cy: mapped[8].y,
          r: 6,
        }, "", "circle")],
        "distribution mean": [paintedFixtureMark({
          "data-viz-mean": state.mean,
          "data-viz-series-index": 12,
          x1: mapped[12].x,
          x2: mapped[12].x,
          y1: paintedFixtureMap({ x: state.mean, y: 0 }, viewport).y,
          y2: paintedFixtureMap({ x: state.mean, y: 1 }, viewport).y,
        }, "", "line")],
        "distribution right spread marker": [paintedFixtureMark({
          "data-viz-density": Math.exp(-0.5),
          "data-viz-mapped-x": mapped[16].x,
          "data-viz-mapped-y": mapped[16].y,
          "data-viz-series-index": 16,
          "data-viz-series-y": series[16].y,
          "data-viz-x-value": state.mean + state.spread,
          cx: mapped[16].x,
          cy: mapped[16].y,
          r: 6,
        }, "", "circle")],
        "distribution spread band": [paintedFixtureMark({
          "data-viz-left-value": state.mean - state.spread,
          "data-viz-left-x": mapped[8].x,
          "data-viz-mean": state.mean,
          "data-viz-right-value": state.mean + state.spread,
          "data-viz-right-x": mapped[16].x,
          "data-viz-spread": state.spread,
          height: 10,
          width: mapped[16].x - mapped[8].x,
          x: mapped[8].x,
          y: paintedFixtureFrame.y + paintedFixtureFrame.height - 13,
        }, "", "rect")],
        "distribution summary curve": [paintedFixtureMark({
          "data-viz-left-spread-x": mapped[8].x,
          "data-viz-left-spread-y": mapped[8].y,
          "data-viz-mean": state.mean,
          "data-viz-right-spread-x": mapped[16].x,
          "data-viz-right-spread-y": mapped[16].y,
          "data-viz-sample-count": 25,
          "data-viz-spread": state.spread,
          d: mapped.map((point, index) =>
            `${index === 0 ? "M" : "L"} ${paintedFixtureFixed(point.x, 1)} ${paintedFixtureFixed(point.y, 1)}`,
          ).join(" "),
        })],
        "distribution summary readout": [paintedFixtureMark({
          "data-viz-mean": state.mean,
          "data-viz-spread": state.spread,
          "data-viz-token-mean": paintedFixtureFixed(state.mean),
          "data-viz-token-spread": paintedFixtureFixed(state.spread),
          "data-viz-visible-locale": locale,
          "data-viz-visible-readout": text.readout,
          x: 320,
          y: 108,
        }, text.readout, "text")],
      };
  const visibleMathMarkOrder = [
    "semantic formula",
    "semantic invariant check",
    "semantic fixed viewport",
    "semantic x tick",
    "semantic y tick",
    ...(quadratic
      ? ["advanced primary curve", "advanced curve sample", "advanced function readout"]
      : [
          "distribution summary curve",
          "distribution mean",
          "distribution spread band",
          "distribution left spread marker",
          "distribution right spread marker",
          "distribution summary readout",
        ]),
  ];
  const visibleMathMarks = Object.fromEntries(
    visibleMathMarkOrder.map((name) => [name, visibleMathMarksByName[name]]),
  );
  const raw = quadratic
    ? {
        family: "function-properties",
        labels: [],
        points: {},
        series,
        variant: labId,
        check: `selected quadratic · a=${paintedFixtureFixed(state.scale)} · k=${paintedFixtureFixed(state.verticalShift)}`,
        formula: text.formula,
        kind: "advanced-functions",
        metrics: {
          activeMode: 0,
          primaryFamily: "quadratic",
          primaryFormula: text.formula.slice(2),
          scaleParameter: state.scale,
          selectedCurveOnly: true,
          verticalShift: state.verticalShift,
        },
      }
    : {
        family: "statistics-distribution",
        labels: [],
        points: {
          center: { x: state.mean, y: 1 },
          leftSpread: { x: state.mean - state.spread, y: Math.exp(-0.5) },
          rightSpread: { x: state.mean + state.spread, y: Math.exp(-0.5) },
        },
        series,
        variant: labId,
        check: `symmetric about μ=${paintedFixtureFixed(state.mean)} · height(μ−spread)=height(μ+spread)`,
        formula: `center μ=${paintedFixtureFixed(state.mean)} · spread=${paintedFixtureFixed(state.spread)}`,
        kind: "distribution",
        metrics: {
          mean: state.mean,
          spread: state.spread,
          standardDeviation: state.spread,
          summaryOnly: true,
          symmetryResidual: 0,
          variance: state.spread ** 2,
        },
      };
  return {
    publicState: {
      selectorEvidence: { count: 1, learnerVisibleCount: 1 },
      state: { ...state },
    },
    rawRendererState: {
      attribute: "data-viz-math-state",
      selectorEvidence: { count: 1, learnerVisibleCount: 1 },
      serializedState: JSON.stringify(raw),
    },
    visibleGeometry: {
      formulaText: `${text.formula} ${text.formulaLabel}: ${text.formula}`,
      visibleMathMarks,
      visibleNamedMarks: paintedFixtureVisibleNamedMarks(quadratic, viewport),
    },
  };
}

function browserScrollAggregateFixture(packageTitle, packageIndex) {
  const match = packageTitle.match(
    /^hk-viz-(P[1-6]|S[1-6])-(desktop|tablet|mobile)-(zh-Hans|zh|en)-(light|dark) exercises every selected HK lab$/,
  );
  assert.ok(match, packageTitle);
  const [, grade, viewport, language, theme] = match;
  const cellCount = packageIndex < 54 ? 5 : 4;
  const fixtureLabIdsByGrade = {
    P1: ["p1-counting-number-bonds", "p1-addition-subtraction"],
    P2: ["p2-multiplication-foundations", "p2-money-time"],
    P3: ["p3-fractions-intro"],
    P4: ["p4-large-numbers"],
    P5: ["p5-fractions-operations", "p5-volume"],
    S1: ["statistics-s1"],
    S3: ["identities-square-patterns"],
    S4: ["data-handling"],
    S5: ["advanced-functions", "differentiation-intro"],
    S6: ["calculus"],
  };
  const cells = Array.from({ length: cellCount }, (_, cellIndex) => {
    const labId =
      (grade === "P6" && cellIndex === 0
        ? HK_VISUALIZATION_P6_AVERAGES_LAB_ID
        : grade === "P6" && cellIndex === 1
          ? HK_VISUALIZATION_P6_BUDGET_LAB_ID
        : fixtureLabIdsByGrade[grade]?.[cellIndex]) ??
      `fixture-lab-${packageIndex}-${cellIndex}`;
    const cellId = `${grade}/${labId}/${viewport}/${language}/${theme}`;
    const phases =
      labId === HK_VISUALIZATION_P6_AVERAGES_LAB_ID
        ? [
            `range-state:broken-line:p6-zero:${packageIndex}`,
            `range-state:broken-line:p6-positive:${packageIndex}`,
            `range-state:reset:p6-reset:${packageIndex}`,
            "reset-space",
          ]
        : labId === HK_VISUALIZATION_P6_BUDGET_LAB_ID
          ? [
              ...["represent", "solve", "check"].flatMap((modeId) =>
                ["positive-remaining", "exact-zero", "positive-overspend"].map(
                  (boundary) =>
                    `range-state:${modeId}:p6-budget-${boundary}:${packageIndex}`,
                ),
              ),
              `range-state:reset:p6-budget-reset:${packageIndex}`,
            ]
          : [
              "statistics-s1",
              "data-handling",
              "advanced-functions",
            ].includes(labId)
            ? [
                `range-state:fixture:hk-state:${packageIndex}-${cellIndex}`,
                `range-state:painted-pair:hk-state:${packageIndex}-${cellIndex}`,
                `range-state:reset:hk-state:${String(packageIndex).padStart(3, "0")}${String(cellIndex).padStart(2, "0")}`,
                "reset-space",
                "reset-space-idempotent",
              ]
          : Object.hasOwn(hkVisualizationPassThroughResetFixturePlans, labId)
            ? [
                `range-state:fixture:hk-state:${packageIndex}-${cellIndex}`,
                `control-fixture-${packageIndex}-${cellIndex}`,
                `range-state:reset:hk-state:${String(packageIndex).padStart(3, "0")}${String(cellIndex).padStart(2, "0")}`,
                "reset-space",
                "reset-space-idempotent",
              ]
          : [
            `range-state:fixture:hk-state:${packageIndex}-${cellIndex}`,
            `control-fixture-${packageIndex}-${cellIndex}`,
            `range-state:reset:hk-state:${packageIndex}-${cellIndex}-reset`,
            "reset-space",
          ];
    const scrollObservationSetCount = phases.length;
    const scrollObservationCount = phases.length;
    return {
      auditedExecutionMs:
        scrollObservationSetCount * 2_000 + scrollObservationCount * 6_000,
      cellId,
      observationSetHashes: phases.map((phase) =>
        sha256(`observation-set:${cellId}:${phase}`),
      ),
      phasePlanHash: hashCanonicalFixture({
        cellId,
        contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
        kind: "browser-scroll-phase-plan",
        phases,
      }),
      phases,
      receiptAggregateHash: sha256(`receipt-aggregate:${cellId}`),
      scheduleHashes: phases.map((phase) =>
        sha256(`schedule:${cellId}:${phase}`),
      ),
      scrollContainerCount: 0,
      scrollObservationCount,
      scrollObservationSetCount,
      scrollPositionAuditCount: scrollObservationCount * 6,
    };
  });
  const cellIds = cells.map(({ cellId }) => cellId);
  const sum = (field) =>
    cells.reduce((total, cell) => total + cell[field], 0);
  const evidenceWithoutHash = {
    auditedExecutionMs: sum("auditedExecutionMs"),
    cellCount,
    cellIds,
    cells,
    contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
    phasePlanAggregateHash: hashCanonicalFixture({
      cells: cells.map(({ cellId, phases }) => ({ cellId, phases })),
      contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
      kind: "browser-scroll-phase-plans-by-cell",
    }),
    scrollContainerCount: sum("scrollContainerCount"),
    scrollObservationAggregateHash: sha256(
      `scroll-observation-aggregate:${packageTitle}`,
    ),
    scrollObservationCount: sum("scrollObservationCount"),
    scrollObservationSetCount: sum("scrollObservationSetCount"),
    scrollPositionAuditCount: sum("scrollPositionAuditCount"),
  };
  return {
    ...evidenceWithoutHash,
    aggregateHash: hashCanonicalFixture({
      contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-scroll-zero-failure-aggregate",
    }),
  };
}

const hkVisualizationDependentTransitionFixtureTopology = Object.freeze({
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

const hkVisualizationDependentTransitionFixtureSourcePlans = Object.freeze({
  "p1-number-bond-known-part": Object.freeze({
    domainId: "number-bond-v1",
    labId: "p1-counting-number-bonds",
    modeId: "__default__",
    modePreparation: Object.freeze([]),
    planHash: "b12d3245afe5e79b3e3426419aa719e767747999cabcb0e3a1c37af701258c0c",
    projectionMatrixHash: "368807cf1624e0dc564973eac3fc51289053157cac07b884e2e284ca7444016a",
  }),
  "p1-add-step": Object.freeze({
    domainId: "bounded-step-v1",
    labId: "p1-addition-subtraction",
    modeId: "add",
    modePreparation: Object.freeze([
      Object.freeze({ groupId: "operation", modeId: "add" }),
    ]),
    planHash: "1f07174a62071dc22c85d6582cb0787dd44bae2fdd47a38bb0376a6cb5725dc3",
    projectionMatrixHash: "7d499cfc70d9b14bc421dd8ba09a243ef8189b7e52a32b7a77ac82f6d6e86f02",
  }),
  "p1-subtract-step": Object.freeze({
    domainId: "bounded-step-v1",
    labId: "p1-addition-subtraction",
    modeId: "subtract",
    modePreparation: Object.freeze([
      Object.freeze({ groupId: "operation", modeId: "subtract" }),
    ]),
    planHash: "2ea5b297fcf9fbc9c64fd4b678f4df0e7c8f1e02c11e07760bc1972fa687e773",
    projectionMatrixHash: "a03713d0de73713cfd615d28c2002bfbf8cf2e1823dff6f367cabacef95e9004",
  }),
  "p2-payment-at-least-price": Object.freeze({
    domainId: "payment-at-least-price-v1",
    labId: "p2-money-time",
    modeId: "money",
    modePreparation: Object.freeze([
      Object.freeze({ groupId: "model", modeId: "money" }),
    ]),
    planHash: "ddc4060cff1b4da5e3eb7ee7cf40f4f4bd24e34916ea557fd1c94ad235e2c98e",
    projectionMatrixHash: "17fd537f5cb8bc47ce9676f436d179ceea3d8371abd57f91ee05622b3015c065",
  }),
  "p4-divisor-within-number": Object.freeze({
    domainId: "divisor-within-number-v1",
    labId: "p4-large-numbers",
    modeId: "factor-pairs",
    modePreparation: Object.freeze([
      Object.freeze({ groupId: "model", modeId: "factor-pairs" }),
    ]),
    planHash: "9daebc0fdeeeec65e28354b257e15f7fbfa095badf89d2851cb8b9cb726749f3",
    projectionMatrixHash: "de8f2df23b43a0ab5e494537fd7564bd4dac2ba5d137ac1cfc9e2f1eab453bca",
  }),
  "p5-first-proper-fraction": Object.freeze({
    domainId: "proper-fractions-v1",
    labId: "p5-fractions-operations",
    modeId: "three",
    modePreparation: Object.freeze([
      Object.freeze({ groupId: "operation", modeId: "subtract" }),
      Object.freeze({ groupId: "term-count", modeId: "three" }),
    ]),
    planHash: "fa70f6ce7dd0a7bb14beee031d9945e8d19c87572b402508e4bc8422ce129bc8",
    projectionMatrixHash: "5f8f55841de2f31f11f0e44a51d6ecd164b7ec53498e883170e29ead753b2bbf",
  }),
  "p5-second-proper-fraction": Object.freeze({
    domainId: "proper-fractions-v1",
    labId: "p5-fractions-operations",
    modeId: "three",
    modePreparation: Object.freeze([
      Object.freeze({ groupId: "operation", modeId: "subtract" }),
      Object.freeze({ groupId: "term-count", modeId: "three" }),
    ]),
    planHash: "928a266ad54c4e3a1c660633dea9ec85c946526bb2dfc4bc54c02ff75ffc78e1",
    projectionMatrixHash: "9c7abb27bf5ea1a482af9cc09fa0d4a71a27345147f76850b0dfa3c33247f04e",
  }),
  "p5-third-proper-fraction": Object.freeze({
    domainId: "proper-fractions-v1",
    labId: "p5-fractions-operations",
    modeId: "three",
    modePreparation: Object.freeze([
      Object.freeze({ groupId: "operation", modeId: "subtract" }),
      Object.freeze({ groupId: "term-count", modeId: "three" }),
    ]),
    planHash: "be10a24e1c0eb230b20089d971a24a73200fe59e60e74e681d7d1bf962e1ab8a",
    projectionMatrixHash: "a5eacee94cc13cdd7b7de97b54fa147ccb00bf5920366d667e5247ebbdfcc6b9",
  }),
  "p5-visible-volume-layers": Object.freeze({
    domainId: "visible-layers-v1",
    labId: "p5-volume",
    modeId: "__default__",
    modePreparation: Object.freeze([]),
    planHash: "b8793eaf075866f29427ab50aaff81675481fb9c31561c822548e3d6763c6dc6",
    projectionMatrixHash: "67fe8c2620418cb0a6ae5834a272806dfe5cc5338dea7690e813c7f08d03ff11",
  }),
  "s3-identity-a-projects-b": Object.freeze({
    domainId: "identity-positive-a-gt-b-v1",
    labId: "identities-square-patterns",
    modeId: "square-sum",
    modePreparation: Object.freeze([
      Object.freeze({ groupId: "model", modeId: "square-sum" }),
    ]),
    planHash: "b9bf7afec7d74c13f4ce123d44d72e04011543aff85de9071ac08fa2e68344dd",
    projectionMatrixHash: "6f72cb7416c19e55c57e8d95c9d828ba745310c57edfa54be7b2c2437437cecd",
  }),
  "s3-identity-b-projects-a": Object.freeze({
    domainId: "identity-positive-a-gt-b-v1",
    labId: "identities-square-patterns",
    modeId: "square-sum",
    modePreparation: Object.freeze([
      Object.freeze({ groupId: "model", modeId: "square-sum" }),
    ]),
    planHash: "556659194fcd9528b4802160b1c2b49cb8a63e25e78187a30e23f6c9c8e6ab49",
    projectionMatrixHash: "503775812b79a7d1fef460717c1bdde12cadb29adc8a14a051833b58db81b3d0",
  }),
});

const hkVisualizationDependentTransitionFixtureAuthorityHashes = Object.freeze([
  { companionAuthorityHash: "567b71e5204ede3918eff58cf7ff321faaa02c28210013247611107bfd2bf0ea", sequenceId: "p1-number-bond-known-part" },
  { companionAuthorityHash: "6039635db5abf413914bf3dc53dc35748d3478972544915ecc66432a0015858d", sequenceId: "p1-add-step" },
  { companionAuthorityHash: "1a268bfcaa9bb6741dc3b80aacec81f8cdb0c79cdc9e768498d7f70e67937f47", sequenceId: "p1-subtract-step" },
  { companionAuthorityHash: "1a841abaa6c175b3c6b0c0b1d7e532b50bfe9e95f82393a26ffabf3a0de1c1d0", sequenceId: "p2-payment-at-least-price" },
  { companionAuthorityHash: "aff542794fea0c08cf107554c9f55e06ea86aaff7bb97d453c4088ed5ddac642", sequenceId: "p4-divisor-within-number" },
  { companionAuthorityHash: "ae2eee69979a04ebcea79d729a9fcfd956a82327563323d9fa4f826c2443a150", sequenceId: "p5-first-proper-fraction" },
  { companionAuthorityHash: "aff721822eeaf29ba30defb44b476f91b47308b364f02522544b68e298db1cb8", sequenceId: "p5-second-proper-fraction" },
  { companionAuthorityHash: "5f6c0b550198d27538fdd39497fc16158e36e575ce97083754cf0b7bb75ece98", sequenceId: "p5-third-proper-fraction" },
  { companionAuthorityHash: "6058002ffa8c0815c2a2cc4b1fd8b69442dcfaf69f55b76905f740a2ae1a64d2", sequenceId: "p5-visible-volume-layers" },
  { companionAuthorityHash: "75a306a214b0c62570afab6f7cd1273eca4e47de04c4366c6ab7e193c6ae6efb", sequenceId: "s3-identity-a-projects-b" },
  { companionAuthorityHash: "137aad6a9f32d45831d8180526339888b3e2b45fccbc20fb2dd86c61476b5c01", sequenceId: "s3-identity-b-projects-a" },
]);

const dependentTransitionFixtureSurface = Object.freeze({
  renderedSize: Object.freeze({ height: 360, width: 640 }),
  scrollport: Object.freeze({
    clientHeight: 360,
    clientWidth: 390,
    maxScrollLeft: 250,
    scrollHeight: 360,
    scrollWidth: 640,
  }),
  tagName: "svg",
  viewBox: Object.freeze({ height: 360, width: 640, x: 0, y: 0 }),
});

function dependentTransitionVisibleElementFixtures(authorities) {
  return authorities.map((authority, index) => ({
    attributes: structuredClone(authority.attributes),
    learnerVisible: authority.learnerVisible,
    paintedSubtree: structuredClone(authority.paintedSubtree),
    renderedGeometry: {
      height: 10,
      width: 10,
      x: 10 + index * 12,
      y: 10,
    },
    tagName: authority.tagName,
    textHash: authority.textHash,
    userGeometry: {
      height: 10,
      width: 10,
      x: 10 + index * 12,
      y: 10,
    },
  }));
}

function dependentTransitionObservationFixture({
  cellId,
  labId,
  language,
  sequenceId,
  theme,
}) {
  const sourcePlan = hkVisualizationDependentTransitionFixtureSourcePlans[sequenceId];
  assert.ok(sourcePlan, sequenceId);
  assert.equal(sourcePlan.labId, labId);
  const authoritativeSourcePlan =
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID[sequenceId];
  assert.ok(authoritativeSourcePlan, sequenceId);
  assert.equal(authoritativeSourcePlan.planHash, sourcePlan.planHash);
  assert.equal(
    authoritativeSourcePlan.projectionMatrixHash,
    sourcePlan.projectionMatrixHash,
  );
  const companionAuthority = authoritativeSourcePlan.companionAuthority;
  const projectionTopology =
    authoritativeSourcePlan.visibleMathProjectionTopologies[language][theme];
  const visibleMathProjections = projectionTopology.projectionHashes.map(
    (hash, projectionIndex) => ({
      ancestryScaleSummary:
        projectionTopology.ancestryScaleSummaries[projectionIndex],
      elementCount: projectionTopology.elementCounts[projectionIndex],
      hash,
    }),
  );
  const canonicalFingerprint = `canonical:${cellId}`;
  const canonicalVisibleBaseline = {
    baselineHash: "",
    canonicalFingerprint,
    cellId,
    language,
    planHash: sourcePlan.planHash,
    sequenceId,
    surface: dependentTransitionFixtureSurface,
    theme,
    visibleElements: dependentTransitionVisibleElementFixtures(
      companionAuthority.restoration.visibleElementAuthorities[language],
    ),
    visibleMathProjection: visibleMathProjections[0],
  };
  canonicalVisibleBaseline.baselineHash = hashOrderedFixtureWithoutKey(
    canonicalVisibleBaseline,
    "baselineHash",
  );
  const phases = ["pre", "clamp", "expand"].map((phase, phaseIndex) => ({
    controls: structuredClone(companionAuthority.phases[phaseIndex].controls),
    id: `${sequenceId}:${phase}`,
    phase,
    rawSerializedPublicState:
      companionAuthority.phases[phaseIndex].rawSerializedPublicState,
    resetCountSincePreviousPhase: phaseIndex === 0 ? 1 : 0,
    stateSignature: companionAuthority.phases[phaseIndex].stateSignature,
    surface: dependentTransitionFixtureSurface,
    visibleElements: dependentTransitionVisibleElementFixtures(
      companionAuthority.phases[phaseIndex].visibleElementAuthorities[language],
    ),
    visibleMathProjection: visibleMathProjections[phaseIndex + 1],
  }));
  const observation = {
    cellId,
    canonicalVisibleBaseline,
    domainId: sourcePlan.domainId,
    labId,
    language,
    modePreparation: sourcePlan.modePreparation.map((item) => ({ ...item })),
    modeId: sourcePlan.modeId,
    observationHash: "",
    phases,
    planHash: sourcePlan.planHash,
    postSequenceRestoration: {
      afterFingerprint: canonicalFingerprint,
      beforeFingerprint: `expanded:${cellId}:${sequenceId}`,
      canonicalFingerprint,
      controls: structuredClone(companionAuthority.restoration.controls),
      rawSerializedPublicState:
        companionAuthority.restoration.rawSerializedPublicState,
      resetClickCount: 1,
      stateSignature: companionAuthority.restoration.stateSignature,
      canonicalVisibleBaselineHash: canonicalVisibleBaseline.baselineHash,
      surface: dependentTransitionFixtureSurface,
      visibleElements: dependentTransitionVisibleElementFixtures(
        companionAuthority.restoration.visibleElementAuthorities[language],
      ),
      visibleMathProjection: visibleMathProjections[4],
    },
    schemaVersion: "hk-viz-dependent-transition-sequence.v8",
    sequenceId,
    theme,
  };
  observation.observationHash = hashOrderedFixtureWithoutKey(
    observation,
    "observationHash",
  );
  return observation;
}

function dependentTransitionObservationsForScrollCell(scrollCell) {
  const [, labId, , language, theme] = scrollCell.cellId.split("/");
  return (hkVisualizationDependentTransitionFixtureTopology[labId] ?? []).map(
    (sequenceId) =>
      dependentTransitionObservationFixture({
        cellId: scrollCell.cellId,
        labId,
        language,
        sequenceId,
        theme,
      }),
  );
}

function dependentTransitionCompactSequenceFixture(observation) {
  const phaseIds = observation.phases.map(({ phase }) => phase);
  const projections = [
    observation.canonicalVisibleBaseline.visibleMathProjection,
    ...observation.phases.map(({ visibleMathProjection }) =>
      visibleMathProjection
    ),
    observation.postSequenceRestoration.visibleMathProjection,
  ];
  const ancestryScaleSummaries = projections.map(
    ({ ancestryScaleSummary }) => ancestryScaleSummary,
  );
  const elementCounts = projections.map(({ elementCount }) => elementCount);
  const projectionHashes = projections.map(({ hash }) => hash);
  const visibleMathProjectionEvidence = {
    ancestryScaleSummaries,
    ancestryScaleSummariesHash: hashCanonicalFixture({
      contractVersion: observation.schemaVersion,
      kind: "dependent-transition-visible-math-ancestry-scale-summaries",
      sequenceId: observation.sequenceId,
      summaries: ancestryScaleSummaries,
    }),
    elementCounts,
    elementCountsHash: hashCanonicalFixture({
      contractVersion: observation.schemaVersion,
      elementCounts,
      kind: "dependent-transition-visible-math-element-counts",
      sequenceId: observation.sequenceId,
    }),
    projectionCount: projections.length,
    projectionHashes,
    projectionHashesHash: hashCanonicalFixture({
      contractVersion: observation.schemaVersion,
      hashes: projectionHashes,
      kind: "dependent-transition-visible-math-projection-hashes",
      sequenceId: observation.sequenceId,
    }),
    topologyHash: hashCanonicalFixture({
      contractVersion: observation.schemaVersion,
      kind: "dependent-transition-visible-math-projection-topology",
      projections: projections.map((projection, index) => ({
        ancestryScaleSummary: projection.ancestryScaleSummary,
        elementCount: projection.elementCount,
        hash: projection.hash,
        source: [
          "canonical-visible-baseline",
          "phase:pre",
          "phase:clamp",
          "phase:expand",
          "post-sequence-restoration",
        ][index],
      })),
      sequenceId: observation.sequenceId,
    }),
    totalElementCount: elementCounts.reduce((sum, count) => sum + count, 0),
  };
  const sourcePlan =
    hkVisualizationDependentTransitionFixtureSourcePlans[observation.sequenceId];
  const evidenceWithoutHash = {
    canonicalFingerprint:
      observation.canonicalVisibleBaseline.canonicalFingerprint,
    canonicalVisibleBaselineHash:
      observation.canonicalVisibleBaseline.baselineHash,
    cellId: observation.cellId,
    labId: observation.labId,
    language: observation.language,
    observationHash: observation.observationHash,
    phaseCount: phaseIds.length,
    phaseIds,
    phaseObservationHashes: observation.phases.map((phase) =>
      hashCanonicalFixture({
        cellId: observation.cellId,
        contractVersion:
          HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
        kind: "browser-dependent-transition-phase-observation",
        labId: observation.labId,
        language: observation.language,
        phase,
        sequenceId: observation.sequenceId,
      }),
    ),
    planHash: observation.planHash,
    postSequenceRestorationHash: hashCanonicalFixture({
      cellId: observation.cellId,
      contractVersion:
        HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
      kind: "browser-dependent-transition-restoration-observation",
      labId: observation.labId,
      language: observation.language,
      restoration: observation.postSequenceRestoration,
      sequenceId: observation.sequenceId,
    }),
    projectionMatrixHash: sourcePlan.projectionMatrixHash,
    schemaVersion: observation.schemaVersion,
    sequenceId: observation.sequenceId,
    theme: observation.theme,
    visibleMathProjectionEvidence,
  };
  return {
    ...evidenceWithoutHash,
    sequenceAggregateHash: hashCanonicalFixture({
      contractVersion:
        HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-dependent-transition-sequence",
    }),
  };
}

function browserDependentTransitionAggregateFixture(scrollAggregate) {
  const cells = scrollAggregate.cells
    .filter(({ cellId }) =>
      Object.hasOwn(
        hkVisualizationDependentTransitionFixtureTopology,
        cellId.split("/")[1],
      ),
    )
    .map((scrollCell) => {
      const [, labId, , language, theme] = scrollCell.cellId.split("/");
      const sequences = dependentTransitionObservationsForScrollCell(
        scrollCell,
      ).map(dependentTransitionCompactSequenceFixture);
      const canonicalFingerprint =
        sequences[0]?.canonicalFingerprint ?? `canonical:${scrollCell.cellId}`;
      const evidenceWithoutHash = {
        canonicalFingerprint,
        cellId: scrollCell.cellId,
        labId,
        language,
        phaseObservationCount: sequences.length * 3,
        sequenceCount: sequences.length,
        sequenceIds: sequences.map(({ sequenceId }) => sequenceId),
        sequenceObservationHashes: sequences.map(
          ({ observationHash }) => observationHash,
        ),
        sequences,
        theme,
      };
      return {
        ...evidenceWithoutHash,
        cellAggregateHash: hashCanonicalFixture({
          contractVersion:
            HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
          evidence: evidenceWithoutHash,
          kind: "browser-dependent-transition-cell",
        }),
      };
    });
  const topologyHash = hashCanonicalFixture({
    cells: cells.map(({ cellId, labId, language, sequences, theme }) => ({
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
  const evidenceWithoutHash = {
    cellCount: cells.length,
    cells,
    contractVersion:
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
    phaseObservationCount: cells.reduce(
      (total, cell) => total + cell.phaseObservationCount,
      0,
    ),
    scrollPackageAggregateHash: scrollAggregate.aggregateHash,
    sequenceObservationCount: cells.reduce(
      (total, cell) => total + cell.sequenceCount,
      0,
    ),
    topologyHash,
  };
  return {
    ...evidenceWithoutHash,
    aggregateHash: hashCanonicalFixture({
      contractVersion:
        HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-dependent-transition-package",
    }),
  };
}

function dependentTransitionPackageId(packageTitle) {
  return packageTitle.replace(/ exercises every selected HK lab$/, "");
}

function browserDependentTransitionPackageResultFixture(
  scrollAggregate,
  packageTitle,
) {
  const match = packageTitle.match(
    /^hk-viz-(P[1-6]|S[1-6])-(desktop|tablet|mobile)-(zh-Hans|zh|en)-(light|dark) exercises every selected HK lab$/,
  );
  assert.ok(match, packageTitle);
  const [, packageGrade, viewportId, packageLanguage, theme] = match;
  const viewport = {
    desktop: { height: 1100, width: 1440 },
    tablet: { height: 1024, width: 768 },
    mobile: { height: 844, width: 390 },
  }[viewportId];
  const packageId = dependentTransitionPackageId(packageTitle);
  const cells = scrollAggregate.cells.map((scrollCell) => {
    const [grade, labId, cellViewportId, language, cellTheme] =
      scrollCell.cellId.split("/");
    assert.equal(grade, packageGrade);
    assert.equal(cellViewportId, viewportId);
    assert.equal(language, packageLanguage);
    assert.equal(cellTheme, theme);
    return {
      actualFinalUrl: `http://127.0.0.1:3020/visualization-lab/${labId}`,
      cellId: scrollCell.cellId,
      collisions: [],
      contract: {
        activeLabExact: true,
        htmlLanguage: language,
        localizedText: { modelSample: "fixture", stateSample: "fixture" },
        manifest: {
          controlSelectorCount: 0,
          modeSelectorCount: 0,
          modelReady: true,
          resetReady: true,
          stateReady: true,
          stateSummaryReady: true,
        },
        panelReady: true,
        renderer: "svg",
        surfaceCount: 1,
        threeDLearner: null,
        themeClassApplied: true,
        themeEvidence: null,
        visibleMarkCount: 1,
        workspaceReady: true,
      },
      deadlineMs: 90_000,
      controls: [],
      dependentTransitionSequenceObservations:
        dependentTransitionObservationsForScrollCell(scrollCell),
      diagnostics: [],
      failures: [],
      grade,
      interactions: [],
      labId,
      language,
      layout: [],
      p6BudgetBoundaryObservations: [],
      p6AveragesLineGraphObservations: [],
      passThroughOracleObservations: [],
      passThroughResetObservations: [],
      qaProfile: "standard",
      readyMs: 0,
      route: `/visualization-lab/${labId}`,
      routeKind: "query",
      scrollObservationPhasePlan: [...scrollCell.phases],
      scrollObservationSets: [],
      stateScanLedger: {
        entries: [],
        executedStateIds: [],
        plannedStateIds: [],
      },
      status: "passed",
      templateId: "configured",
      theme,
      viewport: { id: viewportId, ...viewport },
    };
  });
  const cellIds = cells.map(({ cellId }) => cellId);
  return {
    cells,
    failures: [],
    matrix: {
      allowPartial: false,
      expectedCellCount: 918,
      expectedPackageCount: 216,
      explicitFilters: [],
      fullMatrixRequested: true,
      interactionDepth: "full",
      languages: ["zh-Hans", "zh", "en"],
      scope: "full",
      themes: ["light", "dark"],
      viewports: [
        { id: "desktop", height: 1100, width: 1440 },
        { id: "tablet", height: 1024, width: 768 },
        { id: "mobile", height: 844, width: 390 },
      ],
    },
    package: {
      duplicateCellIds: [],
      executedCellIds: cellIds,
      expectedLabIds: cells.map(({ labId }) => labId),
      grade: packageGrade,
      id: packageId,
      language: packageLanguage,
      missingCellIds: [],
      plannedCellIds: cellIds,
      theme,
      viewportId,
    },
    run: {
      baseURL: "http://127.0.0.1:3020",
      endedAt: "2026-08-19T00:00:01.000Z",
      runId: "hk-viz-dependent-companion-fixture",
      startedAt: "2026-08-19T00:00:00.000Z",
    },
    schemaVersion: "hk-viz-machine-acceptance.v3",
    status: "passed",
    summary: {
      executedCellCount: cells.length,
      failedCellCount: 0,
      missingCellCount: 0,
      passedCellCount: cells.length,
      plannedCellCount: cells.length,
    },
  };
}

function browserDependentTransitionPackageAttachmentFixture(
  scrollAggregate,
  packageTitle,
) {
  const packageResult = browserDependentTransitionPackageResultFixture(
    scrollAggregate,
    packageTitle,
  );
  return {
    body: Buffer.from(JSON.stringify(packageResult, null, 2), "utf8").toString(
      "base64",
    ),
    contentType: "application/json",
    name: `${dependentTransitionPackageId(packageTitle)}.json`,
  };
}

function parseDependentTransitionPackageAttachment(entry, packageTitle) {
  const attachment = entry.results[0].attachments.find(
    ({ name }) => name === `${dependentTransitionPackageId(packageTitle)}.json`,
  );
  assert.ok(attachment, packageTitle);
  return JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
}

function writeDependentTransitionPackageAttachment(
  entry,
  packageTitle,
  packageResult,
) {
  const attachment = entry.results[0].attachments.find(
    ({ name }) => name === `${dependentTransitionPackageId(packageTitle)}.json`,
  );
  assert.ok(attachment, packageTitle);
  attachment.body = Buffer.from(
    JSON.stringify(packageResult, null, 2),
    "utf8",
  ).toString("base64");
}

function rehashDependentTransitionObservationFixture(observation) {
  observation.canonicalVisibleBaseline.baselineHash =
    hashOrderedFixtureWithoutKey(
      observation.canonicalVisibleBaseline,
      "baselineHash",
    );
  observation.postSequenceRestoration.canonicalVisibleBaselineHash =
    observation.canonicalVisibleBaseline.baselineHash;
  observation.observationHash = hashOrderedFixtureWithoutKey(
    observation,
    "observationHash",
  );
  return observation;
}

function overwriteCompactSequenceFromObservation(sequence, observation) {
  const replacement = dependentTransitionCompactSequenceFixture(observation);
  for (const key of Object.keys(sequence)) delete sequence[key];
  Object.assign(sequence, replacement);
}

function rehashDependentTransitionAggregateFixture(aggregate) {
  for (const cell of aggregate.cells) {
    for (const sequence of cell.sequences) {
      const { sequenceAggregateHash: _oldSequenceHash, ...sequenceEvidence } =
        sequence;
      sequence.sequenceAggregateHash = hashCanonicalFixture({
        contractVersion:
          HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
        evidence: sequenceEvidence,
        kind: "browser-dependent-transition-sequence",
      });
    }
    cell.sequenceCount = cell.sequences.length;
    cell.sequenceIds = cell.sequences.map(({ sequenceId }) => sequenceId);
    cell.sequenceObservationHashes = cell.sequences.map(
      ({ observationHash }) => observationHash,
    );
    cell.phaseObservationCount = cell.sequences.reduce(
      (total, sequence) => total + sequence.phaseCount,
      0,
    );
    const { cellAggregateHash: _oldCellHash, ...cellEvidence } = cell;
    cell.cellAggregateHash = hashCanonicalFixture({
      contractVersion:
        HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
      evidence: cellEvidence,
      kind: "browser-dependent-transition-cell",
    });
  }
  aggregate.cellCount = aggregate.cells.length;
  aggregate.sequenceObservationCount = aggregate.cells.reduce(
    (total, cell) => total + cell.sequenceCount,
    0,
  );
  aggregate.phaseObservationCount = aggregate.cells.reduce(
    (total, cell) => total + cell.phaseObservationCount,
    0,
  );
  aggregate.topologyHash = hashCanonicalFixture({
    cells: aggregate.cells.map(({ cellId, labId, language, sequences, theme }) => ({
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
  const { aggregateHash: _oldAggregateHash, ...aggregateEvidence } = aggregate;
  aggregate.aggregateHash = hashCanonicalFixture({
    contractVersion:
      HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_AGGREGATE_VERSION,
    evidence: aggregateEvidence,
    kind: "browser-dependent-transition-package",
  });
}

function browserPassThroughOracleAggregateFixture(scrollAggregate) {
  const cells = scrollAggregate.cells.map((scrollCell) => {
    const labId = scrollCell.cellId.split("/")[1];
    const kind = HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS.includes(labId)
      ? "pass-through"
      : "dedicated";
    const observations =
      kind === "pass-through"
        ? scrollCell.phases.map((phase, observationIndex) => {
            const [, , , locale] = scrollCell.cellId.split("/");
            const paintedStates = [
              "statistics-s1",
              "data-handling",
              "advanced-functions",
            ].includes(labId)
              ? paintedFixtureStates(labId)
              : null;
            const paintedState = paintedStates && observationIndex === 0
              ? paintedStates.before
              : paintedStates && observationIndex === 1
                ? paintedStates.after
                : null;
            const paintedParts = paintedState
              ? paintedFixtureEndpointParts(
                  labId,
                  paintedState,
                  locale,
                )
              : null;
            const publicState = paintedParts
              ? paintedParts.publicState
              : {
              selectorEvidence: { count: 1, learnerVisibleCount: 1 },
              state: {
                ...hkVisualizationPassThroughResetFixturePlans[labId],
                labId,
                observationIndex,
                phase,
              },
            };
            const rawRendererState = paintedParts?.rawRendererState ?? {
              attribute: "data-viz-math-state",
              selectorEvidence: { count: 1, learnerVisibleCount: 1 },
              serializedState: JSON.stringify({ labId, observationIndex, phase }),
            };
            const visibleGeometry = paintedParts?.visibleGeometry ?? {
              formulaText: `formula ${labId} ${phase}`,
              visibleMathMarks: {
                fixture: [
                  {
                    attributes: { "data-viz-value": phase },
                    tagName: "line",
                    text: phase,
                  },
                ],
              },
              visibleNamedMarks: ["fixture-mark"],
            };
            const evidenceWithoutHash = {
              phase,
              publicState,
              publicStateHash: hashCanonicalFixture(publicState),
              rawRendererState,
              rawRendererStateHash: hashCanonicalFixture(rawRendererState),
              visibleGeometry,
              visibleGeometryHash: hashCanonicalFixture(visibleGeometry),
            };
            return {
              ...evidenceWithoutHash,
              observationHash: hashCanonicalFixture({
                cellId: scrollCell.cellId,
                contractVersion:
                  HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
                evidence: evidenceWithoutHash,
                kind: "browser-pass-through-oracle-observation",
                labId,
              }),
            };
          })
        : [];
    const evidenceWithoutHash = {
      cellId: scrollCell.cellId,
      kind,
      labId,
      observationCount: observations.length,
      observationHashes: observations.map(({ observationHash }) => observationHash),
      observations,
      phases: observations.map(({ phase }) => phase),
    };
    return {
      ...evidenceWithoutHash,
      cellAggregateHash: hashCanonicalFixture({
        contractVersion:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
        evidence: evidenceWithoutHash,
        kind: "browser-pass-through-oracle-cell",
      }),
    };
  });
  const evidenceWithoutHash = {
    cellCount: cells.length,
    cells,
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
    observationCount: cells.reduce(
      (total, cell) => total + cell.observationCount,
      0,
    ),
    passThroughCellCount: cells.filter(({ kind }) => kind === "pass-through")
      .length,
  };
  return {
    ...evidenceWithoutHash,
    aggregateHash: hashCanonicalFixture({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-pass-through-oracle-package",
    }),
  };
}

const paintedGeometryPairAggregateVersion =
  "hk-viz-browser-pass-through-painted-geometry-pair-aggregate-v1";
const paintedGeometryPairAnnotationType =
  "hk-viz-pass-through-painted-geometry-pair-aggregate";
const paintedGeometryPairOracleVersion =
  "hk-viz-pass-through-painted-geometry-pair-oracle.v2";
const paintedGeometryPairOraclePlanHash =
  "a59ab7bea300bb88e5e770c828bcaf94de831e485898c46e5c0d8610d96c345a";
const paintedGeometryPairLabIds = Object.freeze([
  "advanced-functions",
  "data-handling",
  "statistics-s1",
]);

function browserPassThroughPaintedGeometryPairAggregateFixture(
  scrollAggregate,
  oracleAggregate,
) {
  const cells = scrollAggregate.cells.map((scrollCell, cellIndex) => {
    const oracleCell = oracleAggregate.cells[cellIndex];
    const labId = scrollCell.cellId.split("/")[1];
    const applicable = paintedGeometryPairLabIds.includes(labId);
    let pair = null;
    if (applicable) {
      const states = paintedFixtureStates(labId);
      const exactEndpoint = (expectedState) =>
        oracleCell.observations
          .map((observation, observationIndex) => ({
            observation,
            observationIndex,
          }))
          .filter(({ observation }) =>
            observation.phase.startsWith("range-state:") &&
            canonicalFixtureJson(observation.publicState.state) ===
              canonicalFixtureJson(expectedState),
          );
      const beforeMatches = exactEndpoint(states.before);
      const afterMatches = exactEndpoint(states.after);
      assert.equal(beforeMatches.length, 1, `${scrollCell.cellId}:before`);
      assert.equal(afterMatches.length, 1, `${scrollCell.cellId}:after`);
      const [{ observation: beforeObservation, observationIndex: beforeIndex }] =
        beforeMatches;
      const [{ observation: afterObservation, observationIndex: afterIndex }] =
        afterMatches;
      assert.ok(beforeIndex < afterIndex, `${scrollCell.cellId}:chronology`);
      assert.ok(beforeObservation.phase.startsWith("range-state:"));
      assert.ok(afterObservation.phase.startsWith("range-state:"));
      const beforeRef = {
        observationHash: beforeObservation.observationHash,
        observationIndex: beforeIndex,
        phase: beforeObservation.phase,
      };
      const afterRef = {
        observationHash: afterObservation.observationHash,
        observationIndex: afterIndex,
        phase: afterObservation.phase,
      };
      const layerPairs = [
        ["public", beforeObservation.publicStateHash, afterObservation.publicStateHash],
        ["raw", beforeObservation.rawRendererStateHash, afterObservation.rawRendererStateHash],
        ["visible", beforeObservation.visibleGeometryHash, afterObservation.visibleGeometryHash],
      ].map(([layer, beforeHash, afterHash]) => {
        const evidence = { afterHash, beforeHash, layer };
        return {
          ...evidence,
          pairHash: hashCanonicalFixture({
            contractVersion: paintedGeometryPairAggregateVersion,
            evidence,
            kind: "browser-pass-through-painted-geometry-layer-pair",
          }),
        };
      });
      const evidence = {
        afterRef,
        beforeRef,
        cellId: scrollCell.cellId,
        labId,
        layerEndpointHashCount: 6,
        layerPairs,
        layerReceiptCount: 3,
        oraclePlanHash: paintedGeometryPairOraclePlanHash,
        oracleVersion: paintedGeometryPairOracleVersion,
      };
      pair = {
        ...evidence,
        pairHash: hashCanonicalFixture({
          contractVersion: paintedGeometryPairAggregateVersion,
          evidence,
          kind: "browser-pass-through-painted-geometry-pair",
        }),
      };
    }
    const evidence = {
      cellId: scrollCell.cellId,
      endpointCount: applicable ? 2 : 0,
      kind: applicable ? "applicable" : "not-applicable",
      labId,
      layerEndpointHashCount: applicable ? 6 : 0,
      layerReceiptCount: applicable ? 3 : 0,
      pair,
      pairCount: applicable ? 1 : 0,
    };
    return {
      ...evidence,
      cellAggregateHash: hashCanonicalFixture({
        contractVersion: paintedGeometryPairAggregateVersion,
        evidence,
        kind: "browser-pass-through-painted-geometry-pair-cell",
      }),
    };
  });
  const evidence = {
    cellCount: cells.length,
    cells,
    contractVersion: paintedGeometryPairAggregateVersion,
    endpointCount: cells.reduce((sum, cell) => sum + cell.endpointCount, 0),
    layerEndpointHashCount: cells.reduce(
      (sum, cell) => sum + cell.layerEndpointHashCount,
      0,
    ),
    layerReceiptCount: cells.reduce(
      (sum, cell) => sum + cell.layerReceiptCount,
      0,
    ),
    oraclePackageAggregateHash: oracleAggregate.aggregateHash,
    oraclePlanHash: paintedGeometryPairOraclePlanHash,
    oracleVersion: paintedGeometryPairOracleVersion,
    pairCount: cells.reduce((sum, cell) => sum + cell.pairCount, 0),
    scrollPackageAggregateHash: scrollAggregate.aggregateHash,
  };
  return {
    ...evidence,
    aggregateHash: hashCanonicalFixture({
      contractVersion: paintedGeometryPairAggregateVersion,
      evidence,
      kind: "browser-pass-through-painted-geometry-pair-package",
    }),
  };
}

function browserPassThroughResetAggregateFixture(scrollAggregate, oracleAggregate) {
  const cells = scrollAggregate.cells.map((scrollCell, cellIndex) => {
    const oracleCell = oracleAggregate.cells[cellIndex];
    const labId = scrollCell.cellId.split("/")[1];
    const kind = Object.hasOwn(hkVisualizationPassThroughResetFixturePlans, labId)
      ? "pass-through"
      : "dedicated";
    const expected = hkVisualizationPassThroughResetFixturePlans[labId];
    const perturbation =
      hkVisualizationPassThroughResetFixturePerturbations[labId];
    const actions = kind === "pass-through"
      ? [
          {
            activationKey: "Enter",
            actionKind: "restoring",
            beforeState: perturbation,
            phase: scrollCell.phases.at(-3),
          },
          {
            activationKey: "Space",
            actionKind: "restoring",
            beforeState: perturbation,
            phase: "reset-space",
          },
          {
            activationKey: "Space",
            actionKind: "canonical-noop",
            beforeState: expected,
            phase: "reset-space-idempotent",
          },
        ]
      : [];
    const observations = actions.map((action, actionIndex) => {
      const oracle = oracleCell.observations.find(
        ({ phase }) => phase === action.phase,
      );
      assert.ok(oracle, `${scrollCell.cellId}:${action.phase}`);
      const afterEndpoint = structuredClone(oracle);
      const beforeEndpoint = structuredClone(oracle);
      if (action.actionKind === "restoring") {
        beforeEndpoint.publicState.state = {
          ...beforeEndpoint.publicState.state,
          ...action.beforeState,
        };
        beforeEndpoint.rawRendererState.serializedState = JSON.stringify({
          beforeState: action.beforeState,
          labId,
          phase: action.phase,
        });
        beforeEndpoint.visibleGeometry.formulaText =
          `before ${labId} ${action.phase}`;
        const firstVisibleMark = Object.values(
          beforeEndpoint.visibleGeometry.visibleMathMarks,
        )[0]?.[0];
        assert.ok(firstVisibleMark, `${scrollCell.cellId}:${action.phase}:mark`);
        firstVisibleMark.text = `before ${action.phase}`;
        firstVisibleMark.attributes["data-viz-value"] =
          `before ${action.phase}`;
        beforeEndpoint.publicStateHash = hashCanonicalFixture(
          beforeEndpoint.publicState,
        );
        beforeEndpoint.rawRendererStateHash = hashCanonicalFixture(
          beforeEndpoint.rawRendererState,
        );
        beforeEndpoint.visibleGeometryHash = hashCanonicalFixture(
          beforeEndpoint.visibleGeometry,
        );
        const { observationHash: _ignored, ...beforeEndpointEvidence } =
          beforeEndpoint;
        beforeEndpoint.observationHash = hashCanonicalFixture({
          cellId: scrollCell.cellId,
          contractVersion:
            HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
          evidence: beforeEndpointEvidence,
          kind: "browser-pass-through-oracle-observation",
          labId,
        });
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
      const layerPairs = ["public", "raw", "visible"].map((layer) => {
        const pairWithoutHash = {
          afterHash: endpointHashes[layer][1],
          beforeHash: endpointHashes[layer][0],
          layer,
        };
        return {
          ...pairWithoutHash,
          pairHash: hashCanonicalFixture({
            ...pairWithoutHash,
            contractVersion:
              HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION,
            kind: "pass-through-reset-layer-pair",
          }),
        };
      });
      const canonicalFingerprint = `canonical:${labId}:${scrollCell.cellId}`;
      const evidenceWithoutHash = {
        actionIndex,
        activationKey: action.activationKey,
        actionKind: action.actionKind,
        afterEndpoint,
        afterFingerprint: canonicalFingerprint,
        afterState: expected,
        beforeEndpoint,
        beforeFingerprint: action.actionKind === "restoring"
          ? `perturbed:${labId}:${scrollCell.cellId}`
          : canonicalFingerprint,
        beforeState: action.beforeState,
        canonicalFingerprint,
        expectedState: expected,
        layerEndpointHashCount: 6,
        layerPairs,
        layerReceiptCount: 3,
        phase: action.phase,
      };
      return {
        ...evidenceWithoutHash,
        observationHash: hashCanonicalFixture({
          cellId: scrollCell.cellId,
          contractVersion:
            HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
          evidence: evidenceWithoutHash,
          kind: "browser-pass-through-reset-observation",
          resetContractVersion:
            HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION,
        }),
      };
    });
    const evidenceWithoutHash = {
      canonicalNoopActionCount: observations.filter(
        ({ actionKind }) => actionKind === "canonical-noop",
      ).length,
      cellId: scrollCell.cellId,
      kind,
      labId,
      layerEndpointHashCount: observations.length * 6,
      layerReceiptCount: observations.length * 3,
      observationCount: observations.length,
      observationHashes: observations.map(({ observationHash }) => observationHash),
      observations,
      phases: observations.map(({ phase }) => phase),
      restoringActionCount: observations.filter(
        ({ actionKind }) => actionKind === "restoring",
      ).length,
    };
    return {
      ...evidenceWithoutHash,
      cellAggregateHash: hashCanonicalFixture({
        contractVersion:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
        evidence: evidenceWithoutHash,
        kind: "browser-pass-through-reset-cell",
      }),
    };
  });
  const sum = (field) =>
    cells.reduce((total, cell) => total + cell[field], 0);
  const evidenceWithoutHash = {
    canonicalNoopActionCount: sum("canonicalNoopActionCount"),
    cellCount: cells.length,
    cells,
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
    layerEndpointHashCount: sum("layerEndpointHashCount"),
    layerReceiptCount: sum("layerReceiptCount"),
    observationCount: sum("observationCount"),
    passThroughCellCount: cells.filter(({ kind }) => kind === "pass-through")
      .length,
    restoringActionCount: sum("restoringActionCount"),
  };
  return {
    ...evidenceWithoutHash,
    aggregateHash: hashCanonicalFixture({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-pass-through-reset-package",
    }),
  };
}

const p6LearnerVisibleFixture = Object.freeze({
  ariaHiddenAncestor: false,
  hiddenAncestor: false,
  inertAncestor: false,
  visuallyVisible: true,
});

function p6AveragesObservationFixture(phase, seriesBShift) {
  const values = [4, 8, 6, 10];
  const hours = [9, 10, 11, 12];
  const point = (value, index) => ({
    hour: hours[index],
    value,
    x: 94 + index * 92,
    y: 276 - (value / 14) * 242,
  });
  const pointsA = values.map(point);
  const pointsB = values.map((value, index) =>
    point(value + seriesBShift, index),
  );
  const segments = (points) =>
    points.slice(0, -1).map((from, index) => {
      const to = points[index + 1];
      return {
        fromHour: from.hour,
        fromValue: from.value,
        toHour: to.hour,
        toValue: to.value,
        x1: from.x,
        x2: to.x,
        y1: from.y,
        y2: to.y,
      };
    });
  const meanA = 7;
  const meanB = meanA + seriesBShift;
  const equal = String(seriesBShift === 0);
  return {
    dedicatedState: {
      mode: "broken-line",
      seriesBShift,
      seriesCount: 2,
      values,
    },
    flags: { seriesCoincident: equal, seriesMeansEqual: equal },
    meanLines: {
      A: { value: meanA, y: 276 - (meanA / 14) * 242 },
      B: { value: meanB, y: 276 - (meanB / 14) * 242 },
    },
    phase,
    points: { A: pointsA, B: pointsB },
    seriesBShift,
    serializedDedicatedState: JSON.stringify({
      mode: "broken-line",
      seriesBShift,
      seriesCount: 2,
      value1: values[0],
      value2: values[1],
      value3: values[2],
      value4: values[3],
    }),
    segments: { A: segments(pointsA), B: segments(pointsB) },
    tableRows: values.map((value, index) => ({
      hour: hours[index],
      seriesA: value,
      seriesB: value + seriesBShift,
    })),
    visibility: {
      graph: p6LearnerVisibleFixture,
      meanLines: {
        A: [p6LearnerVisibleFixture],
        B: [p6LearnerVisibleFixture],
      },
      meanReadout: p6LearnerVisibleFixture,
      points: {
        A: pointsA.map(() => p6LearnerVisibleFixture),
        B: pointsB.map(() => p6LearnerVisibleFixture),
      },
      segments: {
        A: segments(pointsA).map(() => p6LearnerVisibleFixture),
        B: segments(pointsB).map(() => p6LearnerVisibleFixture),
      },
      table: p6LearnerVisibleFixture,
      tableRows: values.map(() => p6LearnerVisibleFixture),
    },
  };
}

function browserP6AveragesAggregateFixture(scrollAggregate) {
  const p6Cells = scrollAggregate.cells.filter(
    ({ cellId }) => cellId.split("/")[1] === HK_VISUALIZATION_P6_AVERAGES_LAB_ID,
  );
  const cells = p6Cells.map((scrollCell) => {
    const boundarySpecs = [
      ["zero-shift", scrollCell.phases[0], 0],
      ["ordinary-positive", scrollCell.phases[1], 1],
    ];
    const boundaries = boundarySpecs.map(([boundary, phase, shift]) => {
      const observation = p6AveragesObservationFixture(phase, shift);
      const evidenceWithoutHash = { boundary, observation, phase };
      return {
        ...evidenceWithoutHash,
        observationHash: hashCanonicalFixture({
          cellId: scrollCell.cellId,
          contractVersion:
            HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
          evidence: evidenceWithoutHash,
          kind: "browser-p6-averages-boundary-observation",
          labId: HK_VISUALIZATION_P6_AVERAGES_LAB_ID,
        }),
      };
    });
    const evidenceWithoutHash = {
      boundaries,
      boundaryCount: 2,
      cellId: scrollCell.cellId,
      labId: HK_VISUALIZATION_P6_AVERAGES_LAB_ID,
      phases: boundaries.map(({ phase }) => phase),
    };
    return {
      ...evidenceWithoutHash,
      cellAggregateHash: hashCanonicalFixture({
        contractVersion:
          HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
        evidence: evidenceWithoutHash,
        kind: "browser-p6-averages-cell",
      }),
    };
  });
  const evidenceWithoutHash = {
    boundaryObservationCount: cells.length * 2,
    cellCount: cells.length,
    cells,
    contractVersion: HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
  };
  return {
    ...evidenceWithoutHash,
    aggregateHash: hashCanonicalFixture({
      contractVersion: HK_VISUALIZATION_BROWSER_P6_AVERAGES_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-p6-averages-package",
    }),
  };
}

function p6BudgetObservationFixture(phase, workflowStep, boundary) {
  const input = boundary === "positive-remaining"
    ? { budget: 60, count: 5, unitPrice: 10, extraCost: 0 }
    : boundary === "exact-zero"
      ? { budget: 50, count: 5, unitPrice: 10, extraCost: 0 }
      : { budget: 50, count: 5, unitPrice: 10, extraCost: 10 };
  const itemCost = input.count * input.unitPrice;
  const totalSpending = itemCost + input.extraCost;
  const remaining = input.budget - totalSpending;
  const withinBudget = remaining >= 0;
  const overspend = Math.max(0, -remaining);
  const scaleTotal = Math.max(input.budget, totalSpending);
  const budgetWidth = 470 * input.budget / scaleTotal;
  const itemWidth = 470 * itemCost / scaleTotal;
  const extraWidth = 470 * input.extraCost / scaleTotal;
  const remainderWidth = withinBudget ? 470 * remaining / scaleTotal : 0;
  const overspendWidth = withinBudget ? 0 : 470 * overspend / scaleTotal;
  const dedicatedState = { workflowStep, ...input };
  const common = {
    boundary,
    dedicatedState,
    derived: { itemCost, overspend, remaining, totalSpending, withinBudget },
    phase,
    serializedDedicatedState: JSON.stringify(dedicatedState),
  };
  if (workflowStep === "represent") {
    return {
      ...common,
      surface: {
        kind: "represent",
        attributes: {
          budget: input.budget,
          extraCost: input.extraCost,
          itemCost,
          overspend,
          remaining,
          scaleTotal,
          totalSpending,
          withinBudget: String(withinBudget),
        },
        geometry: {
          comparisonScale: { height: 92, width: 470, x: 85, y: 128 },
          extra: { height: 92, width: extraWidth, x: 85 + itemWidth, y: 128 },
          item: { height: 92, width: itemWidth, x: 85, y: 128 },
          marker: { budget: input.budget, x1: 85 + budgetWidth, x2: 85 + budgetWidth, y1: 112, y2: 246 },
          overspend: withinBudget ? null : { height: 18, overspend, width: overspendWidth, x: 85 + budgetWidth, y: 226 },
          remainder: withinBudget ? { height: 92, remaining, width: remainderWidth, x: 85 + itemWidth + extraWidth, y: 128 } : null,
        },
        visibility: {
          comparisonScale: p6LearnerVisibleFixture,
          extra: extraWidth > 0 ? p6LearnerVisibleFixture : { ...p6LearnerVisibleFixture, visuallyVisible: false },
          item: p6LearnerVisibleFixture,
          marker: p6LearnerVisibleFixture,
          overspend: withinBudget ? null : p6LearnerVisibleFixture,
          remainder: withinBudget
            ? remainderWidth > 0 ? p6LearnerVisibleFixture : { ...p6LearnerVisibleFixture, visuallyVisible: false }
            : null,
          surface: p6LearnerVisibleFixture,
        },
      },
    };
  }
  if (workflowStep === "solve") {
    return {
      ...common,
      surface: {
        kind: "solve",
        result: {
          height: 68,
          kind: withinBudget ? "remaining" : "overspend",
          overspend,
          remaining,
          totalSpending,
          value: withinBudget ? remaining : overspend,
          width: 140,
          withinBudget: String(withinBudget),
          x: 466,
          y: 202,
        },
        visibility: {
          result: p6LearnerVisibleFixture,
          surface: p6LearnerVisibleFixture,
        },
      },
    };
  }
  return {
    ...common,
    surface: {
      kind: "check",
      balance: {
        left: withinBudget ? totalSpending + remaining : input.budget + overspend,
        overspend,
        remaining,
        right: withinBudget ? input.budget : totalSpending,
        status: withinBudget ? "within-budget" : "over-budget",
        totalSpending,
        withinBudget: String(withinBudget),
      },
      geometry: {
        beam: { x1: 128, x2: 512, y1: 246, y2: 246 },
        leftCard: { height: 72, width: 172, x: 106, y: 126 },
        rightCard: { height: 72, width: 172, x: 362, y: 126 },
      },
      visibility: {
        beam: p6LearnerVisibleFixture,
        leftCard: p6LearnerVisibleFixture,
        rightCard: p6LearnerVisibleFixture,
        surface: p6LearnerVisibleFixture,
      },
    },
  };
}

function browserP6BudgetAggregateFixture(scrollAggregate) {
  const p6Cells = scrollAggregate.cells.filter(
    ({ cellId }) => cellId.split("/")[1] === HK_VISUALIZATION_P6_BUDGET_LAB_ID,
  );
  const contract = ["represent", "solve", "check"].flatMap((modeId) =>
    ["positive-remaining", "exact-zero", "positive-overspend"].map(
      (boundary) => ({ boundary, modeId }),
    ),
  );
  const cells = p6Cells.map((scrollCell) => {
    const boundaries = contract.map(({ boundary, modeId }, index) => {
      const phase = scrollCell.phases[index];
      const observation = p6BudgetObservationFixture(phase, modeId, boundary);
      const evidenceWithoutHash = { boundary, modeId, observation, phase };
      return {
        ...evidenceWithoutHash,
        observationHash: hashCanonicalFixture({
          cellId: scrollCell.cellId,
          contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
          evidence: evidenceWithoutHash,
          kind: "browser-p6-budget-boundary-observation",
          labId: HK_VISUALIZATION_P6_BUDGET_LAB_ID,
        }),
      };
    });
    const evidenceWithoutHash = {
      boundaries,
      boundaryCount: 9,
      cellId: scrollCell.cellId,
      labId: HK_VISUALIZATION_P6_BUDGET_LAB_ID,
      phases: boundaries.map(({ phase }) => phase),
    };
    return {
      ...evidenceWithoutHash,
      cellAggregateHash: hashCanonicalFixture({
        contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
        evidence: evidenceWithoutHash,
        kind: "browser-p6-budget-cell",
      }),
    };
  });
  const evidenceWithoutHash = {
    boundaryObservationCount: cells.length * 9,
    cellCount: cells.length,
    cells,
    contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
  };
  return {
    ...evidenceWithoutHash,
    aggregateHash: hashCanonicalFixture({
      contractVersion: HK_VISUALIZATION_BROWSER_P6_BUDGET_AGGREGATE_VERSION,
      evidence: evidenceWithoutHash,
      kind: "browser-p6-budget-package",
    }),
  };
}

function captureThrownError(operation, expectedPattern) {
  let caught = null;
  try {
    operation();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof Error, "Expected operation to throw an Error.");
  assert.match(caught.message, expectedPattern);
  return caught;
}

function completeProfileProcessSample(profilePaths = []) {
  return Object.freeze({
    schemaVersion: HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_SCHEMA,
    policy: HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY,
    phaseOneTableSha256: sha256("runner-fixture-empty-phase-one"),
    phaseOneRowCount: 0,
    candidateIdentities: Object.freeze([]),
    targetedCandidateCount: 0,
    disappearedIdentityHashes: Object.freeze([]),
    observations: Object.freeze([]),
    nonProfileObservations: Object.freeze([]),
    profilePaths: Object.freeze([...profilePaths].sort()),
    errors: Object.freeze([]),
    status: "complete",
  });
}

function okPsResult(stdout, overrides = {}) {
  return {
    error: undefined,
    signal: null,
    status: 0,
    stderr: "",
    stdout,
    ...overrides,
  };
}

function fakeProfileProcessSpawn(profilePaths, calls = null) {
  const lstart = "Tue Aug 11 10:00:00 2026";
  const profileByPid = new Map(
    profilePaths.map((profilePath, index) => [50_500 + index, profilePath]),
  );
  return (command, args, options) => {
    calls?.push({
      command,
      args: [...args],
      options: {
        encoding: options.encoding,
        env: { ...options.env },
        maxBuffer: options.maxBuffer,
        timeout: options.timeout,
      },
    });
    if (args[0] === "-axww") {
      return okPsResult(
        [...profileByPid.keys()]
          .map((pid) => `${pid} 1 ${pid} ${lstart} SN Google Chrome`)
          .join("\n"),
      );
    }
    const pid = Number(args[2]);
    assert.ok(profileByPid.has(pid), `Unexpected targeted PID ${pid}.`);
    return okPsResult(
      `${pid} 1 ${pid} ${lstart} Google Chrome --user-data-dir=${profileByPid.get(pid)}`,
    );
  };
}

function requiredArgumentValue(args, flag) {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `Missing required argument ${flag}.`);
  assert.equal(typeof args[index + 1], "string");
  return args[index + 1];
}

function freshFixtureWorkspace(prefix) {
  return mkdtempSync(join(testArtifactRoot, prefix));
}

function prepareRunnableFixtureWorkspace(workspace) {
  const playwright = join(
    workspace,
    "node_modules",
    "@playwright",
    "test",
    "cli.js",
  );
  const playwrightPackage = join(
    workspace,
    "node_modules",
    "@playwright",
    "test",
    "package.json",
  );
  const nextCli = join(workspace, "node_modules", "next", "dist", "bin", "next");
  const nextPackage = join(workspace, "node_modules", "next", "package.json");
  const nextCleanBuild = join(workspace, "scripts", "next-clean-build.mjs");
  for (const [path, contents] of [
    [playwright, "#!/usr/bin/env node\n// fixture Playwright CLI\n"],
    [playwrightPackage, '{"version":"1.59.1"}\n'],
    [nextCli, "#!/usr/bin/env node\n// fixture Next CLI\n"],
    [nextPackage, '{"version":"15.5.23"}\n'],
    [nextCleanBuild, "// fixture clean build entrypoint\n"],
  ]) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  }
  writeFileSync(
    join(workspace, "tsconfig.json"),
    `${JSON.stringify({ exclude: ["node_modules", "private", "private/**/*"] }, null, 2)}\n`,
  );
  writeFileSync(join(workspace, "package.json"), '{"name":"hk-viz-fixture"}\n');
  writeFileSync(join(workspace, "package-lock.json"), '{"lockfileVersion":3}\n');
  writeFileSync(join(workspace, "playwright.config.ts"), "// fixture config\n");
  for (const relativePath of [
    "tests/e2e/run-hk-visualization-release-gate.mjs",
    "tests/e2e/hk-visualization-release-source-freeze.mjs",
    "tests/e2e/hk-visualization-dependency-closure.mjs",
    "tests/e2e/hk-visualization-e2e-tsconfig-contract.mjs",
    "tests/e2e/hk-visualization-starship-path-contract.mjs",
    "tests/e2e/hk-visualization-release-title-manifest.mjs",
    "tests/e2e/hk-visualization-dependent-transition-plan-manifest.mjs",
    "tests/e2e/hk-visualization-dependent-visible-math-contract.ts",
    "tests/e2e/hk-visualization-global-profile-monitor.mjs",
    "tests/e2e/hk-visualization-profile-process-sampler.mjs",
    "tests/e2e/hk-visualization-owned-process-ledger.mjs",
    "tests/e2e/hk-visualization-workload-supervisor.mjs",
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "tests/e2e/hk-visualization-browser-chunk-adapter.ts",
    "tests/e2e/hk-visualization-browser-chunk-adapter.test.ts",
    "tests/e2e/hk-visualization-state-chunk-contract.ts",
    "tests/e2e/hk-visualization-range-state-ledger.ts",
    "tests/e2e/hk-visualization-pass-through-math-oracle-contract.ts",
    "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.mjs",
    "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.test.mjs",
    "tests/e2e/run-hk-visualization-release-gate.test.mjs",
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
  ]) {
    const path = join(workspace, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      relativePath === "tests/e2e/hk-visualization-dependency-closure.mjs"
        ? readFileSync(join(process.cwd(), relativePath))
        : `// fixture ${relativePath}\n`,
    );
  }
  for (const spec of HK_VISUALIZATION_RELEASE_SPECS) {
    const specPath = join(workspace, spec);
    mkdirSync(dirname(specPath), { recursive: true });
    const frozenDeadlineSource = independentStaticDeadlineSourceRows.some(
      ({ path }) => path === spec,
    );
    writeFileSync(
      specPath,
      frozenDeadlineSource
        ? readFileSync(join(currentTestWorkspace, spec))
        : "fixture",
    );
  }
  const nextEnv = join(workspace, "next-env.d.ts");
  const canonicalNextEnv =
    '/// <reference path="./.next/types/routes.d.ts" />\n';
  writeFileSync(nextEnv, canonicalNextEnv);
  return { canonicalNextEnv, nextEnv, playwright, nextCli, nextCleanBuild };
}

function materializeFixturePlanTsconfig(plan) {
  const bytes = buildHkVisualizationCanonicalE2eTsconfigBytes({
    workspace: plan.cwd,
    nextDistDir: plan.pathManifest.nextDistDir,
  });
  writeFileSync(plan.pathManifest.nextTsconfigPath, bytes, {
    flag: "wx",
    mode: 0o600,
  });
  const metadata = lstatSync(plan.pathManifest.nextTsconfigPath, {
    bigint: true,
  });
  plan.nextTsconfigIdentity = {
    device: metadata.dev.toString(10),
    inode: metadata.ino.toString(10),
    mode: "0600",
    sha256: sha256(bytes),
    size: bytes.byteLength,
  };
  plan.nextTsconfigSha256 = plan.nextTsconfigIdentity.sha256;
  return bytes;
}

const fixtureReleaseEvidenceSeams = Object.freeze({
  captureDependencyClosure({
    expectedImplementationSourceSha256,
    fullManifestArtifactPath,
    workspace,
  }) {
    const manifest = captureHkVisualizationDependencyClosure({ workspace });
    const validationOptions = {
      canonical: false,
      expectedImplementationSourceSha256,
    };
    const fullManifestArtifactBytes =
      serializeHkVisualizationDependencyClosureManifest(
        manifest,
        validationOptions,
      );
    const fullManifestArtifact =
      validateHkVisualizationDependencyClosureManifestArtifact(
        fullManifestArtifactBytes,
        {
          ...validationOptions,
          artifactPath: fullManifestArtifactPath,
        },
      );
    const summary = buildHkVisualizationDependencyClosureSummaryReceipt(
      manifest,
      { ...validationOptions, fullManifestArtifact },
    );
    return Object.freeze({
      fullManifestArtifact,
      fullManifestArtifactBytes,
      manifest,
      summary,
    });
  },
  compareDependencyClosures: compareHkVisualizationDependencyClosures,
  validateDependencyManifestArtifact(
    artifactBytes,
    { artifactPath, expectedImplementationSourceSha256 },
  ) {
    return validateHkVisualizationDependencyClosureManifestArtifact(
      artifactBytes,
      {
        artifactPath,
        canonical: false,
        expectedImplementationSourceSha256,
      },
    );
  },
  validateDependencySummary(summary, { fullManifestArtifact } = {}) {
    const issues = validateHkVisualizationDependencyClosureSummaryReceipt(
      summary,
      {
        canonical: false,
        expectedImplementationSourceSha256:
          summary.algorithm.implementationSourceSha256,
        fullManifestArtifact,
      },
    );
    if (issues.length > 0) {
      throw new Error(`fixture dependency summary invalid: ${issues.join(",")}`);
    }
    return summary;
  },
});

function resignDependencySummary(summary) {
  const clone = structuredClone(summary);
  delete clone.summaryAggregateSha256;
  clone.summaryAggregateSha256 = sha256(JSON.stringify(clone));
  return clone;
}

function writePassingRunnerArtifacts(workspace, options) {
  const pathManifest = JSON.parse(
    readFileSync(options.env.PLAYWRIGHT_PATH_MANIFEST_FILE, "utf8"),
  );
  const report = passingReport(workspace, pathManifest);
  writeFileSync(
    options.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
    JSON.stringify(report),
  );
  writeFileSync(
    pathManifest.runtimeProfileReceiptPath,
    JSON.stringify(runtimeReceiptByReport.get(report)),
  );
  return { pathManifest, report };
}

function controlledReleaseSourceExecutionMonitor({ events = [] } = {}) {
  let eventCount = 0;
  let closed = false;
  const receipt = () => ({
    coveredPathCount: independentReleaseExecutionSourcePaths.length,
    directoryWatcherCount: 0,
    earlyCloseCount: 0,
    errorCount: 0,
    eventCount,
    fileWatcherCount: independentReleaseExecutionSourcePaths.length,
    nullFilenameEventCount: 0,
    status: eventCount === 0 ? "clean" : "violated",
    watcherCount: independentReleaseExecutionSourcePaths.length,
  });
  return {
    assertClean() {
      if (eventCount !== 0) {
        throw new Error(
          "controlled release source execution monitor observed a transient source event",
        );
      }
    },
    close() {
      closed = true;
      events.push("guard-close");
      return receipt();
    },
    drain() {
      events.push("guard-drain");
    },
    emitChange() {
      eventCount += 1;
    },
    get closed() { return closed; },
    receipt,
  };
}

function writeGreenWorkloadSupervisorEvidence({
  deadlineEpochMs,
  plan,
  supervisorPid = 424_243,
}) {
  const manifest = plan.pathManifest;
  assert.equal(Number.isSafeInteger(deadlineEpochMs), true);
  const commandHash = hashHkVisualizationWorkloadCommand(
    plan.command,
    plan.args,
  );
  const lockNonce = "runner-workload-supervisor-fixture-lock";
  const lockNonceHash = sha256(lockNonce);
  const sourceHashes = hashHkVisualizationWorkloadSupervisorSources();
  const leaderPid = supervisorPid + 1;
  const observerIdentity = {
    pid: supervisorPid,
    lstartToken: "Tue Aug 11 00:00:00 2026",
  };
  const leaderIdentity = {
    pid: leaderPid,
    ppid: supervisorPid,
    pgid: leaderPid,
    lstartToken: "Tue Aug 11 00:00:01 2026",
    state: "S",
    executableSha256: sha256("owned-playwright-leader"),
  };
  const commonEvidence = {
    schemaVersion: HK_VISUALIZATION_WORKLOAD_SUPERVISOR_SCHEMA,
    runId: manifest.runId,
    manifestHash: manifest.manifestHash,
    runnerPid: process.pid,
    supervisorPid,
    commandHash,
    deadlineEpochMs,
    lockNonceHash,
    sourceHashes,
  };
  const commonArtifactEvidence = {
    ...commonEvidence,
    nextTsconfigSha256: plan.nextTsconfigSha256,
  };
  const nextEnvSha256 = sha256("canonical-next-env-fixture");
  const cleanupStartedMonotonicNs = 100_000_000_000n;
  const cleanupDeadlineMonotonicNs =
    cleanupStartedMonotonicNs +
    BigInt(HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS) * 1_000_000n;
  const cleanupCompletedMonotonicNs =
    cleanupStartedMonotonicNs + 100_000_000n;
  const receipt = {
    ...commonEvidence,
    observerIdentity,
    leaderIdentity,
    leaderPid,
    pgid: leaderPid,
    startedAtUtc: "2026-08-11T00:00:00.000Z",
    completedAtUtc: "2026-08-11T00:00:01.000Z",
    stopReason: "workload-exit",
    workloadExitCode: 0,
    workloadSignal: null,
    processTable: {
      command: "/bin/ps",
      args: [...HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS],
      timeoutMs: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
      maxBufferBytes: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
      readsProcessEnvironment: false,
    },
    cleanupTiming: {
      clock: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK,
      outerGraceMs: HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS,
      postCleanupReserveMs:
        HK_VISUALIZATION_WORKLOAD_CLEANUP_POST_RESERVE_MS,
      maxBudgetMs: HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS,
      absoluteOuterDeadlineEpochMs:
        deadlineEpochMs + HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS,
      plannedBudgetMs: HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS,
      startedMonotonicNs: cleanupStartedMonotonicNs.toString(),
      deadlineMonotonicNs: cleanupDeadlineMonotonicNs.toString(),
      completedMonotonicNs: cleanupCompletedMonotonicNs.toString(),
      elapsedMs: 100,
      remainingMs:
        HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS - 100,
      expired: false,
      expiryPhase: null,
      sampleCount: 3,
      minimumSampleTimeoutMs: 4_900,
      maximumSampleTimeoutMs: 5_000,
    },
    boundedPollingLimitation:
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
    polling: {
      configuredPollMs: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS,
      sampleCount: 1,
      startedAtUtc: "2026-08-11T00:00:00.100Z",
      completedAtUtc: "2026-08-11T00:00:00.100Z",
      maxSampleStartGapMs: 0,
      samplesDigestSha256: sha256("runner-supervisor-polling-fixture"),
    },
    ledger: {
      schemaVersion: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_SCHEMA,
      revision: 0,
      leader: {
        pid: leaderIdentity.pid,
        ppid: leaderIdentity.ppid,
        pgid: leaderIdentity.pgid,
        lstartToken: leaderIdentity.lstartToken,
      },
      identities: [
        {
          pid: leaderIdentity.pid,
          lstartToken: leaderIdentity.lstartToken,
          firstSeenPpid: leaderIdentity.ppid,
          firstSeenPgid: leaderIdentity.pgid,
          lastPpid: leaderIdentity.ppid,
          lastPgid: leaderIdentity.pgid,
          state: leaderIdentity.state,
          executableSha256: leaderIdentity.executableSha256,
          discoveredFromPid: null,
          discoveredFromLstartToken: null,
        },
      ],
      boundedPollingLimitation:
        HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
    },
    termSentAtUtc: null,
    killSentAtUtc: null,
    observations: [
      { phase: "seed", members: [leaderIdentity] },
      { phase: "before-cleanup", members: [] },
      { phase: "final-confirmation", members: [] },
      { phase: "final", members: [] },
    ],
    signalEvidence: [],
    signalErrors: [],
    confirmedEmpty: true,
    finalConfirmationGapMs: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS,
    finalLiveEntries: [],
    finalGroupMemberPids: [],
    ownedPgids: [leaderPid],
    nextEnvBeforeSha256: nextEnvSha256,
    nextEnvAfterSha256: nextEnvSha256,
    nextEnvRestored: true,
    nextTsconfigEvidence: {
      expectedSha256: plan.nextTsconfigSha256,
      preimage: {
        device: plan.nextTsconfigIdentity.device,
        inode: plan.nextTsconfigIdentity.inode,
        mode: 0o600,
        size: plan.nextTsconfigIdentity.size,
        sha256: plan.nextTsconfigSha256,
      },
      disposition: "removed-by-workload",
      removed: true,
    },
    errors: [],
    status: "complete",
  };
  rmSync(manifest.nextTsconfigPath, { force: true });
  writeFileSync(manifest.workloadSupervisorLockPath, `${lockNonce}\n`);
  writeFileSync(manifest.workloadSupervisorPidPath, `${supervisorPid}\n`);
  writeFileSync(
    manifest.workloadSupervisorReadyPath,
    `${JSON.stringify(commonArtifactEvidence)}\n`,
  );
  writeFileSync(
    manifest.workloadSupervisorLeaderPath,
    `${JSON.stringify({
      ...commonArtifactEvidence,
      leaderPid,
      pgid: leaderPid,
      leaderIdentity,
    })}\n`,
  );
  writeFileSync(
    manifest.workloadSupervisorReceiptPath,
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  return { commandHash, receipt };
}

function buildRunnerMonitorHarness({
  events = [],
  foreignProfile = false,
  finalElapsedMs = 700,
  monitorExitError = null,
  prematureReceipt = false,
  periodicElapsedMs = 500,
  readyErrors = [],
  receiptIntervalMs = 500,
} = {}) {
  let childPid = 424_242;
  let manifest = null;
  let paths = null;

  function receiptSamples() {
    const managedProfile = join(
      manifest.browserProfileParent,
      "playwright_chromiumdev_profile-runner-fixture",
    );
    mkdirSync(managedProfile, { recursive: true });
    const foreign =
      "/var/folders/hk-viz/playwright_chromiumdev_profile-transient";
    const monitorSample = (ordinal, phase, elapsed, profilePaths) =>
      sampleHkVisualizationGlobalProfiles({
        manifest,
        ordinal,
        phase,
        monitorStartedAt: 0,
        monotonicNow: () => elapsed,
        spawn: fakeProfileProcessSpawn(profilePaths),
      });
    return [
      monitorSample(0, "first", 0, []),
      monitorSample(
        1,
        "periodic",
        periodicElapsedMs,
        foreignProfile ? [foreign] : [managedProfile],
      ),
      monitorSample(2, "final", finalElapsedMs, [managedProfile]),
    ];
  }

  function writeReceipt(
    stopReason = foreignProfile ? "validation-error" : "stop-file",
  ) {
    const receipt = buildHkVisualizationGlobalProfileReceipt({
      manifest,
      paths,
      intervalMs: receiptIntervalMs,
      monitorPid: childPid,
      startedAtUtc: "2026-08-10T00:00:00.000Z",
      completedAtUtc: "2026-08-10T00:00:00.700Z",
      stopReason,
      samples: receiptSamples(),
    });
    writeFileSync(paths.receiptPath, JSON.stringify(receipt));
  }

  return {
    events,
    spawnMonitor(command, args, options) {
      events.push("monitor-start");
      assert.equal(command, process.execPath);
      assert.match(args[0], /hk-visualization-global-profile-monitor\.mjs$/);
      manifest = JSON.parse(
        readFileSync(options.env.PLAYWRIGHT_PATH_MANIFEST_FILE, "utf8"),
      );
      assert.deepEqual(Object.keys(options.env).sort(), [
        "HOME",
        "LANG",
        "LC_ALL",
        "NODE_COMPILE_CACHE",
        "NPM_CONFIG_CACHE",
        "NPM_CONFIG_LOGS_DIR",
        "PATH",
        "PLAYWRIGHT_PATH_MANIFEST_FILE",
        "TEMP",
        "TMP",
        "TMPDIR",
        "XDG_CACHE_HOME",
        "XDG_CONFIG_HOME",
        "XDG_STATE_HOME",
        "npm_config_cache",
        "npm_config_logs_dir",
      ]);
      assert.equal(options.env.LANG, "C");
      assert.equal(options.env.LC_ALL, "C");
      assert.equal(options.cwd, manifest.workspace);
      const monitorArgumentValue = (flag) => {
        const index = args.indexOf(flag);
        assert.notEqual(index, -1, `missing monitor argument ${flag}`);
        return args[index + 1];
      };
      assert.equal(
        monitorArgumentValue("--manifest"),
        manifest.pathManifestFile,
      );
      assert.equal(
        monitorArgumentValue("--receipt"),
        manifest.globalProfileMonitorReceiptPath,
      );
      assert.equal(
        monitorArgumentValue("--ready"),
        manifest.globalProfileMonitorReadyPath,
      );
      assert.equal(
        monitorArgumentValue("--stop"),
        manifest.globalProfileMonitorStopPath,
      );
      assert.equal(
        monitorArgumentValue("--pid"),
        manifest.globalProfileMonitorPidPath,
      );
      assert.equal(monitorArgumentValue("--interval-ms"), "500");
      for (const name of [
        "HOME",
        "TMPDIR",
        "TMP",
        "TEMP",
        "NODE_COMPILE_CACHE",
        "NPM_CONFIG_CACHE",
        "npm_config_cache",
        "NPM_CONFIG_LOGS_DIR",
        "npm_config_logs_dir",
        "XDG_CACHE_HOME",
        "XDG_CONFIG_HOME",
        "XDG_STATE_HOME",
      ]) {
        assert.equal(
          options.env[name],
          manifest.globalProfileMonitorTmpDir,
          `${name} must be isolated in the exact Starship monitor temp directory`,
        );
      }
      assert.match(
        manifest.globalProfileMonitorTmpDir,
        /^\/Volumes\/Starship\//,
      );
      assert.equal(options.env.PATH, "/usr/bin:/bin:/usr/sbin:/sbin");
      assert.equal(options.stdio[0], "ignore");
      assert.equal(Number.isSafeInteger(options.stdio[1]), true);
      assert.equal(options.stdio[2], options.stdio[1]);
      paths = {
        manifestPath: manifest.pathManifestFile,
        receiptPath: manifest.globalProfileMonitorReceiptPath,
        readyPath: manifest.globalProfileMonitorReadyPath,
        stopPath: manifest.globalProfileMonitorStopPath,
        pidPath: manifest.globalProfileMonitorPidPath,
      };
      mkdirSync(manifest.globalProfileMonitorDir, { recursive: true });
      writeFileSync(paths.pidPath, `${childPid}\n`);
      writeFileSync(
        paths.readyPath,
        JSON.stringify({
          schemaVersion: HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_SCHEMA,
          runId: manifest.runId,
          manifestHash: manifest.manifestHash,
          sourceHashes: hashHkVisualizationGlobalProfileMonitorSources(),
          monitorPid: childPid,
          firstSampleOrdinal: 0,
          firstSampleElapsedMs: 0,
          firstSampleErrors: [...readyErrors],
        }),
      );
      if (prematureReceipt) writeReceipt("sigterm");
      return { pid: childPid };
    },
    writeMonitorStop(stopPath, contents, options) {
      events.push("monitor-stop");
      assert.equal(stopPath, paths.stopPath);
      writeFileSync(stopPath, contents, options);
      writeReceipt();
    },
    waitForMonitorExit(actualChildPid, options) {
      events.push("monitor-exit");
      assert.equal(actualChildPid, childPid);
      assert.equal(options.childProcess.pid, childPid);
      assert.equal(options.timeoutMs, 10_000);
      if (monitorExitError) throw monitorExitError;
    },
    waitForMonitorPath(path) {
      assert.equal(existsSync(path), true, path);
    },
  };
}

const runtimeReceiptByReport = new WeakMap();

// This is intentionally test-owned.  Do not derive it from the runner's
// required-source list or its painted-pair source table: the release evidence
// must prove that all seven independently named producer/consumer surfaces
// were frozen, not merely echo a production-owned array.
const independentPaintedGeometryPairSourcePaths = Object.freeze([
  "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.mjs",
  "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.test.mjs",
  "tests/e2e/hk-visualization-browser-chunk-adapter.ts",
  "tests/e2e/hk-visualization-browser-chunk-adapter.test.ts",
  "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
  "tests/e2e/run-hk-visualization-release-gate.mjs",
  "tests/e2e/run-hk-visualization-release-gate.test.mjs",
]);

// Test-owned ordered execution-window authority.  This is deliberately
// literal: the runner must prove every required release source, not merely
// echo its production-owned list into the receipt.
const independentReleaseExecutionSourcePaths = Object.freeze([
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
  "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
  "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
  "tests/e2e/hk-visualization-state-isolation.spec.ts",
  "tests/e2e/hk-visualization-collision-microfixtures.spec.ts",
  "tests/e2e/hk-visualization-contrast-microfixtures.spec.ts",
  "tests/e2e/hk-visualization-interaction-microfixtures.spec.ts",
  "tests/e2e/hk-visualization-dynamic-range-microfixtures.spec.ts",
  "tests/e2e/hk-visualization-p3-fraction-endpoints.spec.ts",
  "tests/e2e/hk-visualization-non-hk-order.spec.ts",
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
const independentReleaseSourceExecutionContractVersion =
  "hk-viz-release-source-execution-window-v1";
const independentReleaseSourceMonitorVersion =
  "hk-viz-release-source-fs-watch-monitor-v2";
const independentReleaseSourceMonitorPolicy = Object.freeze({
  directoryEvents: "disabled-exact-file-watch-authority",
  drain: "worker-two-turn-15ms",
  fileEvents: "exact-immutable-identity-change-and-rename",
  nullFilename: "fail-closed",
  persistent: true,
  watcherError: "fail-closed",
  watcherUnexpectedClose: "fail-closed",
});

// The six static package-front tests are outside the 216 machine and 24
// lesson formula ledgers.  Their independent literal authority reserves the
// maximum Playwright default of 120 seconds for each exact source title.
const independentStaticReleaseTimeoutRows = Object.freeze([
  Object.freeze({
    file: "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    title: "matrix manifest is complete for the requested scope",
    timeoutMs: 120_000,
  }),
  Object.freeze({
    file: "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    title: "false-pass guard helpers reject broad, untranslated, and non-transition evidence",
    timeoutMs: 120_000,
  }),
  Object.freeze({
    file: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    title: "source manifest hard-gates one exact embedded lesson for all 51 registry ids",
    timeoutMs: 120_000,
  }),
  Object.freeze({
    file: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    title: "lesson browser option resolver defaults to full and rejects partial false-passes",
    timeoutMs: 120_000,
  }),
  Object.freeze({
    file: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    title: "visibility-chain helper rejects hidden, inert, aria-hidden, and transparent ancestors",
    timeoutMs: 120_000,
  }),
  Object.freeze({
    file: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    title: "source guard keeps local visibility paths ancestor-aware and reuses the hardened machine scanners",
    timeoutMs: 120_000,
  }),
]);

// Test-owned frozen-byte authority for the only two sources that own the
// exact-six static deadline declarations.  These literals must never be
// derived from the runner's exports or a live production-owned path table.
const independentStaticDeadlineSourceRows = Object.freeze([
  Object.freeze({
    path: "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    sha256: "c2b0fb369e9c82eabdb49b9a019bd6de694368c25f57e4226341d9694f45db40",
    size: 22_298,
  }),
  Object.freeze({
    path: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    sha256: "3f97760cd3e07c5f29ad2ace65e787da2d1f30627c2ed6d1bbe0b2e63776edd0",
    size: 60_730,
  }),
]);
const independentStaticDeadlineSourceAggregateSha256 =
  "1a34cd486b5453185041792459db6a53a31e2ae472bbaf5ce636690c638aa196";

function independentStaticReleaseSources() {
  return Object.fromEntries(
    [...new Set(independentStaticReleaseTimeoutRows.map(({ file }) => file))]
      .map((file) => [file, readFileSync(file, "utf8")]),
  );
}

function runtimeEvidenceEntry(report) {
  return report.suites
    .flatMap((suite) => suite.specs)
    .find(
      (spec) =>
        spec.file === "hk-visualization-non-hk-order.spec.ts" &&
        spec.title ===
          "US Visualization Lab Next Item goes directly to practice without HK extension or checklist routing",
    )?.tests?.[0];
}

function validateReport(report, runtimeProfileReceipt = runtimeReceiptByReport.get(report)) {
  return validateHkVisualizationReleaseReport(report, {
    releaseSourceReceipt: paintedGeometryValidatedSourceReceiptFixture(),
    runtimeProfileReceipt,
  });
}

function paintedGeometryValidatedSourceReceiptFixture(
  workspaceInput = currentTestWorkspace,
) {
  const workspace = realpathSync(workspaceInput);
  const sourceSnapshot = captureHkVisualizationReleaseSourceSnapshot({
    workspace,
  });
  const entries = independentReleaseExecutionSourcePaths.map((path) => {
    const matches = sourceSnapshot.entries.filter(
      (entry) => entry.path === path && entry.type === "file",
    );
    assert.equal(
      matches.length,
      1,
      `fixture source snapshot must contain exactly one ${path}`,
    );
    const [{ mode, sha256: entrySha256, size, type }] = matches;
    return { mode, path, sha256: entrySha256, size, type };
  });
  const executionStartSourceRows = structuredClone(entries);
  const executionStartSourceAggregateSha256 = hashCanonicalFixture({
    contractVersion: independentReleaseSourceExecutionContractVersion,
    sourceRows: executionStartSourceRows,
  });
  const directoryWatcherCount = 0;
  return {
    after: structuredClone(sourceSnapshot),
    before: structuredClone(sourceSnapshot),
    releaseSourceExecution: {
      contractVersion: independentReleaseSourceExecutionContractVersion,
      executionStartSourceAggregateSha256,
      executionStartSourceRows,
      monitorReceipt: {
        coveredPathCount: independentReleaseExecutionSourcePaths.length,
        directoryWatcherCount,
        earlyCloseCount: 0,
        errorCount: 0,
        eventCount: 0,
        fileWatcherCount: independentReleaseExecutionSourcePaths.length,
        nullFilenameEventCount: 0,
        policy: structuredClone(independentReleaseSourceMonitorPolicy),
        status: "clean",
        version: independentReleaseSourceMonitorVersion,
        watcherCount: independentReleaseExecutionSourcePaths.length,
      },
    },
    requiredSourcePaths: [...independentReleaseExecutionSourcePaths],
    staticDeadlineSourceAggregateSha256:
      independentStaticDeadlineSourceAggregateSha256,
    staticDeadlineSourceRows: structuredClone(
      independentStaticDeadlineSourceRows,
    ),
  };
}

function passingReport(
  workspace = currentTestWorkspace,
  pathManifest = buildHkVisualizationStarshipPathManifest({
    runId: "hk-viz-release-fixture",
    workspace,
  }),
) {
  const runtimeEvidence = JSON.stringify({
    channel: "chrome",
    defaultBrowserType: "chromium",
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    // Playwright's resolved Desktop Chrome device serializes dimensions in
    // width/height insertion order. The validator must compare structure, not
    // JSON property order.
    screen: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36",
    viewport: { width: 1440, height: 1100 },
  });
  const webServerCommand = buildHkVisualizationManagedWebServerCommand({
    manifest: pathManifest,
  });
  const webServerCommandSha256 = createHash("sha256")
    .update(webServerCommand)
    .digest("hex");
  const plannedTests = HK_VISUALIZATION_RELEASE_SPECS.flatMap(
    (file, fileIndex) =>
      HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES[file].map(
        (title, titleIndex) => ({
          file,
          id: `hk-viz-fixture-${fileIndex}-${titleIndex}`,
          title,
        }),
      ),
  );
  const actualBrowserProfilePath = join(
    pathManifest.browserProfileParent,
    "playwright_chromiumdev_profile-fixture",
  );
  const runtimeProfileReceipt = {
    actualBrowserProfilePaths: [actualBrowserProfilePath],
    contractVersion: HK_VISUALIZATION_RUNTIME_PROFILE_RECEIPT_VERSION,
    manifestHash: pathManifest.manifestHash,
    observationErrors: [],
    plannedTestCount: plannedTests.length,
    plannedTests,
    receiptPath: pathManifest.runtimeProfileReceiptPath,
    runId: pathManifest.runId,
    sampledTestCount: plannedTests.length,
    samples: plannedTests.map((testCase, ordinal) => ({
      ...testCase,
      observationError: null,
      ordinal,
      profilePaths: [actualBrowserProfilePath],
      rawProfilePaths: [actualBrowserProfilePath],
    })),
    scope: "canonical",
    target: plannedTests.at(-1),
  };
  const report = {
    config: {
      configFile: join(workspace, "playwright.config.ts"),
      forbidOnly: true,
      fullyParallel: false,
      grep: {},
      grepInvert: null,
      maxFailures: 0,
      metadata: {
        actualWorkers: 1,
        hkVisualizationStarshipPathManifest: pathManifest,
        hkVisualizationWebServerCommandSha256: webServerCommandSha256,
      },
      projects: [
        {
          id: "desktop-chrome",
          metadata: { actualWorkers: 1 },
          name: "desktop-chrome",
          repeatEach: 1,
          retries: 0,
          testDir: join(workspace, "tests", "e2e"),
          timeout: 120_000,
          outputDir: pathManifest.outputDir,
        },
      ],
      rootDir: join(workspace, "tests", "e2e"),
      reporter: [
        [
          join(
            process.cwd(),
            "tests/e2e/run-hk-visualization-release-gate.mjs",
          ),
        ],
        ["list"],
        ["json"],
      ],
      shard: null,
      updateSnapshots: "none",
      workers: 1,
      webServer: {
        command: webServerCommand,
        reuseExistingServer: false,
        url: "http://127.0.0.1:3020",
      },
    },
    errors: [],
    stats: {
      expected: HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT,
      flaky: 0,
      skipped: 0,
      unexpected: 0,
    },
    suites: HK_VISUALIZATION_RELEASE_SPECS.map((file, fileIndex) => ({
      file: basename(file),
      specs: HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES[file].map(
        (title, titleIndex) => ({
          file: basename(file),
          id: `hk-viz-fixture-${fileIndex}-${titleIndex}`,
          tests: [
            {
              annotations: [
                ...(file ===
                  "tests/e2e/hk-visualization-machine-acceptance.spec.ts" &&
                title === "matrix manifest is complete for the requested scope"
                  ? [
                      {
                        type: "hk-viz-base-url",
                        description: "http://127.0.0.1:3020",
                      },
                    ]
                  : []),
                ...(file ===
                  "tests/e2e/hk-visualization-machine-acceptance.spec.ts" &&
                title.endsWith(" exercises every selected HK lab")
                  ? [
                      {
                        type: HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
                        description: JSON.stringify(
                          browserScrollAggregateFixture(title, titleIndex - 2),
                        ),
                      },
                      {
                        type:
                          HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_ANNOTATION_TYPE,
                        description: JSON.stringify(
                          browserDependentTransitionAggregateFixture(
                            browserScrollAggregateFixture(
                              title,
                              titleIndex - 2,
                            ),
                          ),
                        ),
                      },
                      {
                        type:
                          HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE,
                        description: JSON.stringify(
                          browserPassThroughOracleAggregateFixture(
                            browserScrollAggregateFixture(
                              title,
                              titleIndex - 2,
                            ),
                          ),
                        ),
                      },
                      {
                        type: paintedGeometryPairAnnotationType,
                        description: JSON.stringify(
                          browserPassThroughPaintedGeometryPairAggregateFixture(
                            browserScrollAggregateFixture(
                              title,
                              titleIndex - 2,
                            ),
                            browserPassThroughOracleAggregateFixture(
                              browserScrollAggregateFixture(
                                title,
                                titleIndex - 2,
                              ),
                            ),
                          ),
                        ),
                      },
                      {
                        type:
                          HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_ANNOTATION_TYPE,
                        description: JSON.stringify(
                          browserPassThroughResetAggregateFixture(
                            browserScrollAggregateFixture(
                              title,
                              titleIndex - 2,
                            ),
                            browserPassThroughOracleAggregateFixture(
                              browserScrollAggregateFixture(
                                title,
                                titleIndex - 2,
                              ),
                            ),
                          ),
                        ),
                      },
                      {
                        type: HK_VISUALIZATION_BROWSER_P6_AVERAGES_ANNOTATION_TYPE,
                        description: JSON.stringify(
                          browserP6AveragesAggregateFixture(
                            browserScrollAggregateFixture(
                              title,
                              titleIndex - 2,
                            ),
                          ),
                        ),
                      },
                      {
                        type: HK_VISUALIZATION_BROWSER_P6_BUDGET_ANNOTATION_TYPE,
                        description: JSON.stringify(
                          browserP6BudgetAggregateFixture(
                            browserScrollAggregateFixture(
                              title,
                              titleIndex - 2,
                            ),
                          ),
                        ),
                      },
                    ]
                  : []),
                ...(file ===
                  "tests/e2e/hk-visualization-non-hk-order.spec.ts" &&
                title ===
                  "US Visualization Lab Next Item goes directly to practice without HK extension or checklist routing"
                  ? [
                      {
                        type: "hk-viz-canonical-browser-device",
                        description: runtimeEvidence,
                      },
                      {
                        type: "hk-viz-starship-runtime-paths",
                        description: JSON.stringify({
                          actualBrowserProfilePaths: [actualBrowserProfilePath],
                          anchorBrowserProfilePaths: [actualBrowserProfilePath],
                          manifest: pathManifest,
                          observationErrorCount: 0,
                          plannedTestCount: plannedTests.length,
                          receiptContractVersion:
                            HK_VISUALIZATION_RUNTIME_PROFILE_RECEIPT_VERSION,
                          runtimeProfileReceiptPath:
                            pathManifest.runtimeProfileReceiptPath,
                          sampledTestCount: plannedTests.length,
                          scope: "canonical",
                          target: plannedTests.at(-1),
                        }),
                      },
                    ]
                  : []),
              ],
              expectedStatus: "passed",
              projectName: "desktop-chrome",
              timeout: 120_000,
              results: [
                {
                  attachments:
                    file ===
                        "tests/e2e/hk-visualization-machine-acceptance.spec.ts" &&
                      title.endsWith(" exercises every selected HK lab")
                      ? [
                          browserDependentTransitionPackageAttachmentFixture(
                            browserScrollAggregateFixture(
                              title,
                              titleIndex - 2,
                            ),
                            title,
                          ),
                        ]
                      : [],
                  errors: [],
                  retry: 0,
                  status: "passed",
                },
              ],
              status: "expected",
              title,
            },
          ],
          title,
        }),
      ),
      title: file,
    })),
  };
  runtimeReceiptByReport.set(report, runtimeProfileReceipt);
  return report;
}

function serializedTestsForScrollValidation(report) {
  return report.suites.flatMap((suite) =>
    suite.specs.flatMap((spec) =>
      spec.tests.map((entry) => ({
        entry,
        file: suite.file,
        id: spec.id,
        title: spec.title,
      })),
    ),
  );
}

function machineScrollAnnotations(report) {
  return report.suites
    .find((suite) => suite.file === "hk-visualization-machine-acceptance.spec.ts")
    .specs.filter((spec) =>
      spec.title.endsWith(" exercises every selected HK lab"),
    )
    .map((spec) => ({
      annotation: spec.tests[0].annotations.find(
        ({ type }) => type === HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
      ),
      entry: spec.tests[0],
      spec,
    }));
}

function machineDependentTransitionAnnotations(report) {
  return report.suites
    .find((suite) => suite.file === "hk-visualization-machine-acceptance.spec.ts")
    .specs.filter((spec) =>
      spec.title.endsWith(" exercises every selected HK lab"),
    )
    .map((spec) => ({
      annotation: spec.tests[0].annotations.find(
        ({ type }) =>
          type ===
          HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_ANNOTATION_TYPE,
      ),
      entry: spec.tests[0],
      spec,
    }));
}

function machinePassThroughOracleAnnotations(report) {
  return report.suites
    .find((suite) => suite.file === "hk-visualization-machine-acceptance.spec.ts")
    .specs.filter((spec) =>
      spec.title.endsWith(" exercises every selected HK lab"),
    )
    .map((spec) => ({
      annotation: spec.tests[0].annotations.find(
        ({ type }) =>
          type ===
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE,
      ),
      entry: spec.tests[0],
      spec,
    }));
}

function machinePassThroughPaintedGeometryPairAnnotations(report) {
  return report.suites
    .find((suite) => suite.file === "hk-visualization-machine-acceptance.spec.ts")
    .specs.filter((spec) =>
      spec.title.endsWith(" exercises every selected HK lab"),
    )
    .map((spec) => ({
      annotation: spec.tests[0].annotations.find(
        ({ type }) => type === paintedGeometryPairAnnotationType,
      ),
      entry: spec.tests[0],
      spec,
    }));
}

function machinePassThroughResetAnnotations(report) {
  return report.suites
    .find((suite) => suite.file === "hk-visualization-machine-acceptance.spec.ts")
    .specs.filter((spec) =>
      spec.title.endsWith(" exercises every selected HK lab"),
    )
    .map((spec) => ({
      annotation: spec.tests[0].annotations.find(
        ({ type }) =>
          type ===
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_ANNOTATION_TYPE,
      ),
      entry: spec.tests[0],
      spec,
    }));
}

function rehashPassThroughOracleAggregateFixture(aggregate) {
  for (const cell of aggregate.cells) {
    for (const observation of cell.observations) {
      observation.publicStateHash = hashCanonicalFixture(observation.publicState);
      observation.rawRendererStateHash = hashCanonicalFixture(
        observation.rawRendererState,
      );
      observation.visibleGeometryHash = hashCanonicalFixture(
        observation.visibleGeometry,
      );
      const { observationHash: _ignored, ...evidence } = observation;
      observation.observationHash = hashCanonicalFixture({
        cellId: cell.cellId,
        contractVersion:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
        evidence,
        kind: "browser-pass-through-oracle-observation",
        labId: cell.labId,
      });
    }
    cell.observationHashes = cell.observations.map(
      ({ observationHash }) => observationHash,
    );
    const { cellAggregateHash: _ignored, ...evidence } = cell;
    cell.cellAggregateHash = hashCanonicalFixture({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
      evidence,
      kind: "browser-pass-through-oracle-cell",
    });
  }
  const { aggregateHash: _ignored, ...evidence } = aggregate;
  aggregate.aggregateHash = hashCanonicalFixture({
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
    evidence,
    kind: "browser-pass-through-oracle-package",
  });
}

function mutateFullyRehashedPaintedGeometryEndpoint(
  report,
  { endpoint = "after", labId = "statistics-s1", mutate },
) {
  const oracleRecords = machinePassThroughOracleAnnotations(report);
  const pairRecords = machinePassThroughPaintedGeometryPairAnnotations(report);
  const recordIndex = pairRecords.findIndex(({ annotation }) => {
    const aggregate = JSON.parse(annotation.description);
    return aggregate.cells.some((cell) => cell.labId === labId && cell.pair);
  });
  assert.notEqual(recordIndex, -1, `missing fixture package for ${labId}`);
  const oracleAggregate = JSON.parse(
    oracleRecords[recordIndex].annotation.description,
  );
  const pairAggregate = JSON.parse(
    pairRecords[recordIndex].annotation.description,
  );
  const oracleCell = oracleAggregate.cells.find((cell) => cell.labId === labId);
  const pairCell = pairAggregate.cells.find((cell) => cell.labId === labId);
  assert.ok(oracleCell);
  assert.ok(pairCell?.pair);
  const reference = endpoint === "before"
    ? pairCell.pair.beforeRef
    : pairCell.pair.afterRef;
  const observation = oracleCell.observations[reference.observationIndex];
  assert.equal(observation.observationHash, reference.observationHash);
  mutate(observation);
  rehashPassThroughOracleAggregateFixture(oracleAggregate);
  const rehashedObservation =
    oracleCell.observations[reference.observationIndex];
  reference.observationHash = rehashedObservation.observationHash;
  const layerHashes = {
    public: rehashedObservation.publicStateHash,
    raw: rehashedObservation.rawRendererStateHash,
    visible: rehashedObservation.visibleGeometryHash,
  };
  for (const layerPair of pairCell.pair.layerPairs) {
    layerPair[endpoint === "before" ? "beforeHash" : "afterHash"] =
      layerHashes[layerPair.layer];
  }
  pairAggregate.oraclePackageAggregateHash = oracleAggregate.aggregateHash;
  rehashPaintedGeometryPairAggregateFixture(pairAggregate);
  oracleRecords[recordIndex].annotation.description =
    JSON.stringify(oracleAggregate);
  pairRecords[recordIndex].annotation.description = JSON.stringify(pairAggregate);
  return { oracleAggregate, pairAggregate, recordIndex };
}

function mutateFullyRehashedUnreferencedPaintedGeometryState(
  report,
  { stateKind, labId = "statistics-s1" },
) {
  const oracleRecords = machinePassThroughOracleAnnotations(report);
  const pairRecords = machinePassThroughPaintedGeometryPairAnnotations(report);
  const recordIndex = pairRecords.findIndex(({ annotation }) => {
    const aggregate = JSON.parse(annotation.description);
    return aggregate.cells.some((cell) => cell.labId === labId && cell.pair);
  });
  assert.notEqual(recordIndex, -1, `missing fixture package for ${labId}`);
  const oracleAggregate = JSON.parse(
    oracleRecords[recordIndex].annotation.description,
  );
  const pairAggregate = JSON.parse(
    pairRecords[recordIndex].annotation.description,
  );
  const oracleCell = oracleAggregate.cells.find((cell) => cell.labId === labId);
  const pairCell = pairAggregate.cells.find((cell) => cell.labId === labId);
  assert.ok(oracleCell);
  assert.ok(pairCell?.pair);
  const beforeState = oracleCell.observations[
    pairCell.pair.beforeRef.observationIndex
  ].publicState.state;
  const afterState = oracleCell.observations[
    pairCell.pair.afterRef.observationIndex
  ].publicState.state;
  const interloper = oracleCell.observations.find(({ phase }) =>
    /^range-state:reset:hk-state:\d{5}$/u.test(phase));
  assert.ok(interloper, `${oracleCell.cellId}:unreferenced-range-observation`);
  interloper.publicState.state = stateKind === "duplicate-before"
    ? structuredClone(beforeState)
    : stateKind === "duplicate-after"
      ? structuredClone(afterState)
      : stateKind === "extra-key-before"
        ? { ...structuredClone(beforeState), decoy: true }
        : { ...structuredClone(beforeState), mean: 1e-10 };
  rehashPassThroughOracleAggregateFixture(oracleAggregate);
  pairAggregate.oraclePackageAggregateHash = oracleAggregate.aggregateHash;
  rehashPaintedGeometryPairAggregateFixture(pairAggregate);
  oracleRecords[recordIndex].annotation.description =
    JSON.stringify(oracleAggregate);
  pairRecords[recordIndex].annotation.description =
    JSON.stringify(pairAggregate);
}

function mutateFullyRehashedNonPairResetRawState(report, mutateSerializedState) {
  const oracleRecords = machinePassThroughOracleAnnotations(report);
  const pairRecords = machinePassThroughPaintedGeometryPairAnnotations(report);
  const resetRecords = machinePassThroughResetAnnotations(report);
  const recordIndex = pairRecords.findIndex(({ annotation }) => {
    const aggregate = JSON.parse(annotation.description);
    return aggregate.cells.some((cell) =>
      cell.labId === "statistics-s1" && cell.pair
    );
  });
  assert.notEqual(recordIndex, -1);
  const oracleAggregate = JSON.parse(
    oracleRecords[recordIndex].annotation.description,
  );
  const pairAggregate = JSON.parse(
    pairRecords[recordIndex].annotation.description,
  );
  const resetAggregate = JSON.parse(
    resetRecords[recordIndex].annotation.description,
  );
  const oracleCell = oracleAggregate.cells.find(
    ({ labId }) => labId === "statistics-s1",
  );
  const pairCell = pairAggregate.cells.find(
    ({ labId }) => labId === "statistics-s1",
  );
  assert.ok(oracleCell);
  assert.ok(pairCell?.pair);
  const observationIndex = oracleCell.observations.findIndex(({ phase }) =>
    /^range-state:reset:hk-state:\d{5}$/u.test(phase)
  );
  assert.ok(observationIndex >= 0);
  assert.notEqual(observationIndex, pairCell.pair.beforeRef.observationIndex);
  assert.notEqual(observationIndex, pairCell.pair.afterRef.observationIndex);
  const observation = oracleCell.observations[observationIndex];
  observation.rawRendererState.serializedState = mutateSerializedState(
    observation.rawRendererState.serializedState,
  );
  rehashPassThroughOracleAggregateFixture(oracleAggregate);
  pairAggregate.oraclePackageAggregateHash = oracleAggregate.aggregateHash;
  rehashPaintedGeometryPairAggregateFixture(pairAggregate);
  rehashPassThroughResetAggregateFixture(resetAggregate, oracleAggregate);
  oracleRecords[recordIndex].annotation.description =
    JSON.stringify(oracleAggregate);
  pairRecords[recordIndex].annotation.description =
    JSON.stringify(pairAggregate);
  resetRecords[recordIndex].annotation.description =
    JSON.stringify(resetAggregate);
}

function rehashPaintedGeometryPairAggregateFixture(aggregate) {
  for (const cell of aggregate.cells) {
    if (cell.pair) {
      cell.pair.layerPairs = cell.pair.layerPairs.map((layerPair) => {
        const evidence = {
          afterHash: layerPair.afterHash,
          beforeHash: layerPair.beforeHash,
          layer: layerPair.layer,
        };
        return {
          ...evidence,
          pairHash: hashCanonicalFixture({
            contractVersion: paintedGeometryPairAggregateVersion,
            evidence,
            kind: "browser-pass-through-painted-geometry-layer-pair",
          }),
        };
      });
      const { pairHash: _ignored, ...evidence } = cell.pair;
      cell.pair.pairHash = hashCanonicalFixture({
        contractVersion: paintedGeometryPairAggregateVersion,
        evidence,
        kind: "browser-pass-through-painted-geometry-pair",
      });
    }
    const { cellAggregateHash: _ignored, ...evidence } = cell;
    cell.cellAggregateHash = hashCanonicalFixture({
      contractVersion: paintedGeometryPairAggregateVersion,
      evidence,
      kind: "browser-pass-through-painted-geometry-pair-cell",
    });
  }
  const { aggregateHash: _ignored, ...evidence } = aggregate;
  aggregate.aggregateHash = hashCanonicalFixture({
    contractVersion: paintedGeometryPairAggregateVersion,
    evidence,
    kind: "browser-pass-through-painted-geometry-pair-package",
  });
}

function rehashPassThroughResetAggregateFixture(aggregate, oracleAggregate) {
  for (const cell of aggregate.cells) {
    const oracleCell = oracleAggregate.cells.find(
      ({ cellId }) => cellId === cell.cellId,
    );
    assert.ok(oracleCell, cell.cellId);
    for (const observation of cell.observations) {
      const oracle = oracleCell.observations.find(
        ({ phase }) => phase === observation.phase,
      );
      assert.ok(oracle, `${cell.cellId}:${observation.phase}`);
      observation.afterEndpoint = structuredClone(oracle);
      if (observation.actionKind === "canonical-noop") {
        observation.beforeEndpoint = structuredClone(oracle);
      }
      const endpointHashes = {
        public: [
          observation.beforeEndpoint.publicStateHash,
          observation.afterEndpoint.publicStateHash,
        ],
        raw: [
          observation.beforeEndpoint.rawRendererStateHash,
          observation.afterEndpoint.rawRendererStateHash,
        ],
        visible: [
          observation.beforeEndpoint.visibleGeometryHash,
          observation.afterEndpoint.visibleGeometryHash,
        ],
      };
      observation.layerPairs = ["public", "raw", "visible"].map((layer) => {
        const pairWithoutHash = {
          afterHash: endpointHashes[layer][1],
          beforeHash: endpointHashes[layer][0],
          layer,
        };
        return {
          ...pairWithoutHash,
          pairHash: hashCanonicalFixture({
            ...pairWithoutHash,
            contractVersion:
              HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION,
            kind: "pass-through-reset-layer-pair",
          }),
        };
      });
      const { observationHash: _ignored, ...evidence } = observation;
      observation.observationHash = hashCanonicalFixture({
        cellId: cell.cellId,
        contractVersion:
          HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
        evidence,
        kind: "browser-pass-through-reset-observation",
        resetContractVersion:
          HK_VISUALIZATION_PASS_THROUGH_RESET_CONTRACT_VERSION,
      });
    }
    cell.observationHashes = cell.observations.map(
      ({ observationHash }) => observationHash,
    );
    const { cellAggregateHash: _ignored, ...evidence } = cell;
    cell.cellAggregateHash = hashCanonicalFixture({
      contractVersion:
        HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
      evidence,
      kind: "browser-pass-through-reset-cell",
    });
  }
  const { aggregateHash: _ignored, ...evidence } = aggregate;
  aggregate.aggregateHash = hashCanonicalFixture({
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_AGGREGATE_VERSION,
    evidence,
    kind: "browser-pass-through-reset-package",
  });
}

function rehashPassThroughResetEndpointFixture(endpoint, cell) {
  endpoint.publicStateHash = hashCanonicalFixture(endpoint.publicState);
  endpoint.rawRendererStateHash = hashCanonicalFixture(
    endpoint.rawRendererState,
  );
  endpoint.visibleGeometryHash = hashCanonicalFixture(endpoint.visibleGeometry);
  const { observationHash: _ignored, ...evidence } = endpoint;
  endpoint.observationHash = hashCanonicalFixture({
    cellId: cell.cellId,
    contractVersion:
      HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
    evidence,
    kind: "browser-pass-through-oracle-observation",
    labId: cell.labId,
  });
}

function fullyRehashedRestoringLayerEqualityReport(layer) {
  const report = passingReport();
  const resetRecords = machinePassThroughResetAnnotations(report);
  const recordIndex = resetRecords.findIndex(
    ({ annotation }) =>
      JSON.parse(annotation.description).passThroughCellCount > 0,
  );
  assert.notEqual(recordIndex, -1);
  const oracleRecord = machinePassThroughOracleAnnotations(report)[recordIndex];
  const resetRecord = resetRecords[recordIndex];
  const oracleAggregate = JSON.parse(oracleRecord.annotation.description);
  const resetAggregate = JSON.parse(resetRecord.annotation.description);
  const cell = resetAggregate.cells.find(({ kind }) => kind === "pass-through");
  assert.ok(cell);
  const observation = cell.observations.find(
    ({ actionKind }) => actionKind === "restoring",
  );
  assert.ok(observation);
  const [endpointField, endpointHashField] = layer === "raw"
    ? ["rawRendererState", "rawRendererStateHash"]
    : ["visibleGeometry", "visibleGeometryHash"];
  observation.beforeEndpoint[endpointField] = structuredClone(
    observation.afterEndpoint[endpointField],
  );
  observation.beforeEndpoint[endpointHashField] =
    observation.afterEndpoint[endpointHashField];
  rehashPassThroughResetEndpointFixture(observation.beforeEndpoint, cell);
  rehashPassThroughResetAggregateFixture(resetAggregate, oracleAggregate);
  resetRecord.annotation.description = JSON.stringify(resetAggregate);
  return report;
}

function machineP6AveragesAnnotations(report) {
  return report.suites
    .find((suite) => suite.file === "hk-visualization-machine-acceptance.spec.ts")
    .specs.filter((spec) =>
      spec.title.endsWith(" exercises every selected HK lab"),
    )
    .map((spec) => ({
      annotation: spec.tests[0].annotations.find(
        ({ type }) => type === HK_VISUALIZATION_BROWSER_P6_AVERAGES_ANNOTATION_TYPE,
      ),
      entry: spec.tests[0],
      spec,
    }));
}

function machineP6BudgetAnnotations(report) {
  return report.suites
    .find((suite) => suite.file === "hk-visualization-machine-acceptance.spec.ts")
    .specs.filter((spec) =>
      spec.title.endsWith(" exercises every selected HK lab"),
    )
    .map((spec) => ({
      annotation: spec.tests[0].annotations.find(
        ({ type }) => type === HK_VISUALIZATION_BROWSER_P6_BUDGET_ANNOTATION_TYPE,
      ),
      entry: spec.tests[0],
      spec,
    }));
}

function replaceFixtureScrollCellLab(record, cellIndex, labId) {
  const aggregate = JSON.parse(record.annotation.description);
  const cell = aggregate.cells[cellIndex];
  const segments = cell.cellId.split("/");
  segments[1] = labId;
  cell.cellId = segments.join("/");
  aggregate.cellIds[cellIndex] = cell.cellId;
  cell.phasePlanHash = hashCanonicalFixture({
    cellId: cell.cellId,
    contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
    kind: "browser-scroll-phase-plan",
    phases: cell.phases,
  });
  aggregate.phasePlanAggregateHash = hashCanonicalFixture({
    cells: aggregate.cells.map(({ cellId, phases }) => ({ cellId, phases })),
    contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
    kind: "browser-scroll-phase-plans-by-cell",
  });
  const { aggregateHash: _oldHash, ...evidenceWithoutHash } = aggregate;
  aggregate.aggregateHash = hashCanonicalFixture({
    contractVersion: HK_VISUALIZATION_BROWSER_SCROLL_AGGREGATE_VERSION,
    evidence: evidenceWithoutHash,
    kind: "browser-scroll-zero-failure-aggregate",
  });
  record.annotation.description = JSON.stringify(aggregate);
  return aggregate;
}

function refreshWebServerCommandHash(report) {
  report.config.metadata.hkVisualizationWebServerCommandSha256 = createHash(
    "sha256",
  )
    .update(report.config.webServer.command)
    .digest("hex");
}

test("canonical dependency summary fails closed on missing, drifted, version, locale, reference, and implementation evidence without raw-path diagnostics", () => {
  const artifactRoot = freshFixtureWorkspace("hk-viz-canonical-dependency-");
  try {
    const expectedImplementationSourceSha256 = sha256(
      readFileSync(
        join(
          process.cwd(),
          "tests/e2e/hk-visualization-dependency-closure.mjs",
        ),
      ),
    );
    const canonicalEvidence =
      captureAndAssertHkVisualizationCanonicalDependencyClosure({
        expectedImplementationSourceSha256,
        fullManifestArtifactPath: join(
          artifactRoot,
          "canonical-dependency-manifest.json",
        ),
        workspace: process.cwd(),
      });
    assert.doesNotThrow(() =>
      validateHkVisualizationCanonicalDependencyClosureSummary(
        canonicalEvidence.summary,
        {
          expectedImplementationSourceSha256,
          fullManifestArtifact: canonicalEvidence.fullManifestArtifact,
        },
      ),
    );
    assert.throws(
      () =>
        validateHkVisualizationCanonicalDependencyClosureSummary(
          canonicalEvidence.summary,
          { expectedImplementationSourceSha256 },
        ),
      /full-manifest-artifact-required/i,
    );

    const fixtures = [
      {
      label: "missing",
      mutate(summary) {
        delete summary.dependencySchemaVersion;
      },
      pattern: /not complete PASS evidence/i,
      },
      {
      label: "canonical-drift",
      mutate(summary) {
        summary.aggregateSha256 = "f".repeat(64);
      },
      pattern: /canonical-aggregate-drift/i,
      },
      {
      label: "next-version",
      mutate(summary) {
        summary.versions.installed = "15.5.22";
      },
      pattern: /next-version-drift/i,
      },
      {
      label: "node-version",
      mutate(summary) {
        summary.algorithm.nodeVersion = "v0.0.0";
      },
      pattern: /node-version-drift/i,
      },
      {
      label: "locale",
      mutate(summary) {
        summary.algorithm.locale = "zz-ZZ";
      },
      pattern: /locale-drift/i,
      },
      {
      label: "frozen-reference",
      mutate(summary) {
        summary.algorithm.frozenReferenceSha256 = "d".repeat(64);
      },
      pattern: /frozen-reference-drift/i,
      },
      {
      label: "implementation-source",
      mutate(summary) {
        summary.algorithm.implementationSourceSha256 = "e".repeat(64);
      },
      pattern: /implementation-source-drift/i,
      },
    ];
    for (const fixture of fixtures) {
      const drifted = structuredClone(canonicalEvidence.summary);
      fixture.mutate(drifted);
      const resigned = resignDependencySummary(drifted);
      const error = captureThrownError(
        () =>
          validateHkVisualizationCanonicalDependencyClosureSummary(resigned, {
            expectedImplementationSourceSha256,
            fullManifestArtifact: canonicalEvidence.fullManifestArtifact,
          }),
        fixture.pattern,
      );
      assert.equal(
        error.message.includes(process.cwd()),
        false,
        `${fixture.label} diagnostic exposed the raw workspace path`,
      );
      assert.equal(
        error.message.includes("playwright_chromiumdev_profile-private-target"),
        false,
        `${fixture.label} diagnostic exposed a raw browser/dependency target`,
      );
    }
  } finally {
    rmSync(artifactRoot, { force: true, recursive: true });
  }
});

test("release runner rejects every narrowing or external-target environment override", () => {
  for (const [name, value] of [
    ["HK_VIZ_ALLOW_PARTIAL", "1"],
    ["HK_VIZ_GRADES", "P1"],
    ["HK_VIZ_LESSON_FULL", "0"],
    ["PLAYWRIGHT_BASE_URL", "https://example.invalid"],
    ["PLAYWRIGHT_SKIP_WEBSERVER", "1"],
    ["PLAYWRIGHT_E2E_ROOT", ".tmp/reused"],
    ["PLAYWRIGHT_BROWSER_PROFILE_ROOT", "/Volumes/Starship/reused-profile"],
    ["PLAYWRIGHT_RUNTIME_TMPDIR", "/Volumes/Starship/reused-tmp"],
    ["PLAYWRIGHT_PATH_MANIFEST_FILE", "/Volumes/Starship/reused.json"],
    ["PLAYWRIGHT_BROWSER_CHANNEL", "chromium"],
    ["NODE_OPTIONS", "--report-directory=/tmp/node-reports"],
    ["NODE_V8_COVERAGE", "/tmp/hk-viz-node-coverage"],
    ["NODE_COMPILE_CACHE", "/var/folders/hk-viz-node-cache"],
    ["NODE_REDIRECT_WARNINGS", "/tmp/hk-viz-warnings.log"],
    ["NPM_CONFIG_CACHE", "/Users/example/Desktop/hk-viz-npm-cache"],
    ["npm_config_cache", "/tmp/hk-viz-npm-cache"],
    ["NPM_CONFIG_LOGS_DIR", "/var/folders/hk-viz-npm-logs"],
    ["npm_config_logs_dir", "/tmp/hk-viz-npm-logs"],
    ["NPM_CONFIG_TMP", "/tmp/hk-viz-npm-tmp"],
    ["npm_config_tmp", "/var/folders/hk-viz-npm-tmp"],
    ["SQLITE_TMPDIR", "/tmp/hk-viz-sqlite-tmp"],
    ["PW_TEST_SOURCE_TRANSFORM", "/tmp/transform.js"],
    ["PWTEST_WATCH", "1"],
    ["NEXT_PUBLIC_SYNTHETIC_FLAG", "must-not-cross-boundary"],
    ["HK_MATH_STORAGE_PROVIDER", "postgres"],
    ["VERCEL", "1"],
    ["VERCEL_ENV", "preview"],
    ["PWDEBUG", "1"],
  ]) {
    assert.throws(
      () => assertCleanHkVisualizationReleaseEnvironment({ [name]: value }),
      new RegExp(name),
    );
  }
  assert.doesNotThrow(() =>
    assertCleanHkVisualizationReleaseEnvironment({ CI: "1" }),
  );
});

test("release runner accepts only help or dry-run and never Playwright passthrough filters", () => {
  assert.deepEqual(parseHkVisualizationReleaseRunnerArgs([]), {
    dryRun: false,
    help: false,
  });
  assert.deepEqual(parseHkVisualizationReleaseRunnerArgs(["--dry-run"]), {
    dryRun: true,
    help: false,
  });
  assert.deepEqual(parseHkVisualizationReleaseRunnerArgs(["--help"]), {
    dryRun: false,
    help: true,
  });
  for (const argument of [
    "--grep=manifest",
    "--grep-invert=package",
    "--shard=1/2",
    "spec.ts:42",
  ]) {
    const error = captureThrownError(
      () => parseHkVisualizationReleaseRunnerArgs([argument]),
      /accepts no Playwright filters/,
    );
    assert.equal(error.message.includes(argument), false);
    assert.match(error.message, new RegExp(sha256(argument)));
  }
});

test("release preflight rejects active Playwright profiles outside Starship without confusing unrelated Chrome profiles", () => {
  assert.deepEqual(
    assertNoForeignActivePlaywrightProfiles(
      completeProfileProcessSample([
        "/Users/example/normal-chrome-profile",
        "/tmp/ena-academy-review-profile",
        "/Volumes/Starship/MAIS-other/.tmp/playwright_chromiumdev_profile-ok",
      ]),
    ),
    [
      "/Volumes/Starship/MAIS-other/.tmp/playwright_chromiumdev_profile-ok",
    ],
  );
  for (const profile of [
    "/tmp/playwright_chromiumdev_profile-bad",
    "/var/folders/example/playwright_chromiumdev_profile-bad",
    "/Users/dongpinhu/Desktop/playwright_chromiumdev_profile-bad",
    "relative/playwright_chromiumdev_profile-bad",
  ]) {
    assert.throws(
      () =>
        assertNoForeignActivePlaywrightProfiles(
          completeProfileProcessSample([profile]),
        ),
      /outside \/Volumes\/Starship/,
    );
  }
});

test("release postflight rejects this run's orphan profile while allowing an unchanged parallel Starship profile", () => {
  const ownParent =
    "/Volumes/Starship/MAIS-hk-viz-labs-wt/.tmp/hk-viz-release-fixture/browser-profiles";
  const parallelProfile =
    "/Volumes/Starship/MAIS-other/.tmp/parallel/browser-profiles/playwright_chromiumdev_profile-ok";
  assert.deepEqual(
    assertHkVisualizationPostflightProfileHygiene(
      completeProfileProcessSample([parallelProfile]),
      { browserProfileParent: ownParent },
    ),
    [parallelProfile],
  );
  assert.throws(
    () =>
      assertHkVisualizationPostflightProfileHygiene(
        completeProfileProcessSample([
          parallelProfile,
          `${ownParent}/playwright_chromiumdev_profile-orphan`,
        ]),
        { browserProfileParent: ownParent },
    ),
    /profiles from this exact run still active/,
  );
});

test("release active-profile probe delegates to the privacy-bounded two-phase sampler", () => {
  assert.deepEqual(HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS, [
    "-axww",
    "-o",
    "pid=,ppid=,pgid=,lstart=,state=,comm=",
  ]);
  const calls = [];
  const profilePath =
    "/Volumes/Starship/MAIS-fixture/.tmp/playwright_chromiumdev_profile-private";
  const sample = readHkVisualizationProfileProcessSample(
    fakeProfileProcessSpawn([profilePath], calls),
  );
  assert.equal(sample.schemaVersion, HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_SCHEMA);
  assert.deepEqual(sample.policy, HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY);
  assert.equal(sample.status, "complete");
  assert.deepEqual(sample.errors, []);
  assert.deepEqual(sample.profilePaths, [profilePath]);
  assert.equal(sample.phaseOneRowCount, 1);
  assert.equal(sample.targetedCandidateCount, 1);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], {
    command: "/bin/ps",
    args: [...HK_VISUALIZATION_PROFILE_PROCESS_PHASE_ONE_ARGS],
    options: {
      encoding: "utf8",
      env: { ...HK_VISUALIZATION_PROFILE_PROCESS_PS_ENV },
      maxBuffer: HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES,
      timeout: HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS,
    },
  });
  assert.deepEqual(calls[1], {
    command: "/bin/ps",
    args: HK_VISUALIZATION_PROFILE_PROCESS_PHASE_TWO_ARGS_TEMPLATE.map(
      (value) =>
        value === "<exact-positive-pid>" ? String(50_500) : value,
    ),
    options: {
      encoding: "utf8",
      env: { ...HK_VISUALIZATION_PROFILE_PROCESS_PS_ENV },
      maxBuffer: HK_VISUALIZATION_PROFILE_PROCESS_MAX_BUFFER_BYTES,
      timeout: HK_VISUALIZATION_PROFILE_PROCESS_TIMEOUT_MS,
    },
  });
  assert.throws(
    () =>
      assertNoForeignActivePlaywrightProfiles(
        readHkVisualizationProfileProcessSample(() =>
          okPsResult("malformed nonempty line"),
        ),
      ),
    /did not return complete, policy-bound, error-free evidence/i,
  );
});

test("global monitor exit probe accepts multi-character macOS states and rejects pid reuse", () => {
  const monitorPath =
    "/Volumes/Starship/MAIS-hk-viz-labs-wt/tests/e2e/hk-visualization-global-profile-monitor.mjs";
  const executablePath = "/usr/local/bin/node";
  for (const state of ["S", "SN", "Ss", "R+"]) {
    assert.deepEqual(
      classifyGlobalProfileMonitorProcessProbe(
        `${state} ${executablePath} ${monitorPath} --manifest fixture`,
        {
          childPid: 4242,
          expectedCommandPath: monitorPath,
          expectedExecutablePath: executablePath,
        },
      ),
      {
        commandSha256: sha256(
          `${executablePath} ${monitorPath} --manifest fixture`,
        ),
        exited: false,
        state,
      },
    );
  }
  for (const state of ["Z", "Z+"]) {
    assert.equal(
      classifyGlobalProfileMonitorProcessProbe(
        `${state} (${monitorPath})`,
        {
          childPid: 4242,
          expectedCommandPath: monitorPath,
          expectedExecutablePath: executablePath,
        },
      ).exited,
      true,
    );
  }
  assert.equal(
    classifyGlobalProfileMonitorProcessProbe("Z <defunct>", {
      childPid: 4242,
      expectedCommandPath: monitorPath,
      expectedExecutablePath: executablePath,
      verifiedDirectChildDefunct: true,
    }).exited,
    true,
  );
  for (const command of [
    `${executablePath} unrelated-task.mjs`,
    `${executablePath} unrelated-task.mjs --note ${monitorPath}`,
    `${executablePath} ${monitorPath}.bak --manifest fixture`,
  ]) {
    const error = captureThrownError(
      () =>
        classifyGlobalProfileMonitorProcessProbe(`Ss ${command}`, {
          childPid: 4242,
          expectedCommandPath: monitorPath,
          expectedExecutablePath: executablePath,
        }),
      /pid 4242 was reused by an unexpected command/,
    );
    assert.equal(error.message.includes(command), false);
    assert.match(error.message, new RegExp(sha256(command)));
  }
  for (const state of ["Z", "Z+"]) {
    assert.throws(
      () =>
        classifyGlobalProfileMonitorProcessProbe(
          `${state} (unrelated-task)`,
          {
            childPid: 4242,
            expectedCommandPath: monitorPath,
            expectedExecutablePath: executablePath,
          },
        ),
      /pid 4242 was reused by an unexpected command/,
    );
  }
  assert.throws(
    () =>
      classifyGlobalProfileMonitorProcessProbe("Z <defunct>", {
        childPid: 4242,
        expectedCommandPath: monitorPath,
        expectedExecutablePath: executablePath,
      }),
    /pid 4242 was reused by an unexpected command/,
  );
  assert.throws(
    () =>
      classifyGlobalProfileMonitorProcessProbe("not-a-ps-state-line", {
        childPid: 4242,
        expectedCommandPath: monitorPath,
      }),
    /Could not parse global profile monitor pid 4242 state/,
  );
});

test("global monitor exact-child cleanup escalates TERM to KILL and never signals a reused pid", () => {
  const childPid = 4242;
  const monitorPath = join(
    process.cwd(),
    "tests/e2e/hk-visualization-global-profile-monitor.mjs",
  );
  const monitor = {
    childPid,
    childProcess: {
      exitCode: null,
      pid: childPid,
      signalCode: null,
    },
  };
  const exactProbe = () => ({
    error: undefined,
    signal: null,
    status: 0,
    stdout: `Ss ${process.execPath} ${monitorPath} --manifest fixture\n`,
  });
  const signals = [];
  let waits = 0;
  terminateGlobalProfileMonitorChild(monitor, {
    signalMonitor(pid, signal) {
      signals.push([pid, signal]);
    },
    spawnProcessTable: exactProbe,
    waitForMonitorExit(_pid, { timeoutMs }) {
      waits += 1;
      assert.equal(timeoutMs, 2_000);
      if (waits === 1) throw new Error("term timeout");
    },
  });
  assert.deepEqual(signals, [
    [childPid, "SIGTERM"],
    [childPid, "SIGKILL"],
  ]);
  assert.equal(waits, 2);

  const reusedSignals = [];
  assert.throws(
    () =>
      terminateGlobalProfileMonitorChild(monitor, {
        signalMonitor(...args) {
          reusedSignals.push(args);
        },
        spawnProcessTable: () => ({
          error: undefined,
          signal: null,
          status: 0,
          stdout: "Ss /usr/bin/unrelated-task --note monitor\n",
        }),
      }),
    /pid 4242 was reused by an unexpected command/,
  );
  assert.deepEqual(reusedSignals, []);
});

test("release plan fixes exact specs, managed project, one worker, no retries, and strict Playwright flags", () => {
  const plan = buildHkVisualizationReleasePlan({
    cwd: "/Volumes/Starship/MAIS-hk-viz-labs-wt",
    environment: {},
    now: new Date("2026-08-09T12:34:56.000Z"),
  });
  assert.deepEqual(plan.specs, [...HK_VISUALIZATION_RELEASE_SPECS]);
  assert.equal(plan.command, process.execPath);
  assert.equal(
    plan.args[0],
    "/Volumes/Starship/MAIS-hk-viz-labs-wt/node_modules/@playwright/test/cli.js",
  );
  assert.deepEqual(
    plan.args.slice(1, 2 + HK_VISUALIZATION_RELEASE_SPECS.length),
    ["test", ...HK_VISUALIZATION_RELEASE_SPECS],
  );
  assert.ok(plan.args.includes("--project=desktop-chrome"));
  assert.ok(plan.args.includes("--workers=1"));
  assert.ok(plan.args.includes("--retries=0"));
  assert.ok(plan.args.includes("--forbid-only"));
  assert.ok(plan.args.includes("--fail-on-flaky-tests"));
  assert.ok(plan.args.includes("--max-failures=0"));
  assert.ok(plan.args.includes("--repeat-each=1"));
  assert.ok(plan.args.includes("--run-agents=none"));
  assert.ok(plan.args.includes("--update-snapshots=none"));
  assert.ok(
    plan.args.includes(
      "--reporter=./tests/e2e/run-hk-visualization-release-gate.mjs,list,json",
    ),
  );
  assert.equal(plan.childEnvironment.HK_MATH_STORAGE_PROVIDER, "sqlite");
  assert.equal(
    plan.childEnvironment.PLAYWRIGHT_BASE_URL,
    "http://127.0.0.1:3020",
  );
  assert.equal(plan.childEnvironment.PLAYWRIGHT_BROWSER_CHANNEL, "chrome");
  assert.equal(plan.childEnvironment.PLAYWRIGHT_PORT, "3020");
  assert.equal(
    plan.childEnvironment.PLAYWRIGHT_E2E_ROOT,
    plan.pathManifest.artifactRoot,
  );
  assert.equal(
    plan.childEnvironment.PLAYWRIGHT_JSON_OUTPUT_FILE,
    plan.pathManifest.jsonReport,
  );
  assert.equal(
    plan.childEnvironment.PLAYWRIGHT_BROWSER_PROFILE_ROOT,
    plan.pathManifest.browserProfileParent,
  );
  assert.equal(plan.childEnvironment.HOME, plan.pathManifest.runtimeTmpDir);
  assert.equal(plan.childEnvironment.TMPDIR, plan.pathManifest.runtimeTmpDir);
  assert.equal(
    plan.childEnvironment.NODE_COMPILE_CACHE,
    plan.pathManifest.nodeCompileCacheDir,
  );
  assert.equal(
    plan.childEnvironment.NPM_CONFIG_CACHE,
    plan.pathManifest.npmCacheDir,
  );
  assert.equal(
    plan.childEnvironment.npm_config_cache,
    plan.pathManifest.npmCacheDir,
  );
  assert.equal(
    plan.childEnvironment.NPM_CONFIG_LOGS_DIR,
    plan.pathManifest.npmLogsDir,
  );
  assert.equal(
    plan.childEnvironment.npm_config_logs_dir,
    plan.pathManifest.npmLogsDir,
  );
  assert.equal(
    plan.childEnvironment.SQLITE_TMPDIR,
    plan.pathManifest.sqliteTmpDir,
  );
  assert.equal(
    plan.childEnvironment.PLAYWRIGHT_PATH_MANIFEST_FILE,
    plan.pathManifest.pathManifestFile,
  );
});

test("release plan carries only an allowlisted non-secret base environment into supervisor and Playwright", () => {
  const plan = buildHkVisualizationReleasePlan({
    cwd: "/Volumes/Starship/MAIS-hk-viz-labs-wt",
    environment: {
      PATH: "/usr/bin:/bin",
      LANG: "en_US.UTF-8",
      OPENAI_API_KEY: "synthetic-secret-must-not-cross-boundary",
      SYNTHETIC_PRIVATE_TOKEN: "synthetic-token-must-not-cross-boundary",
    },
    now: new Date("2026-08-09T12:34:56.000Z"),
  });
  assert.equal(plan.childEnvironment.PATH, "/usr/bin:/bin:/usr/sbin:/sbin");
  assert.equal(plan.childEnvironment.LANG, "en_US.UTF-8");
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      plan.childEnvironment,
      "NEXT_PUBLIC_SYNTHETIC_FLAG",
    ),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      plan.childEnvironment,
      "OPENAI_API_KEY",
    ),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      plan.childEnvironment,
      "SYNTHETIC_PRIVATE_TOKEN",
    ),
    false,
  );
  assert.throws(
    () =>
      buildHkVisualizationReleasePlan({
        cwd: "/Volumes/Starship/MAIS-hk-viz-labs-wt",
        environment: {
          NEXT_PUBLIC_SYNTHETIC_FLAG: "must-not-cross-boundary",
        },
        now: new Date("2026-08-09T12:34:56.000Z"),
      }),
    /NEXT_PUBLIC_SYNTHETIC_FLAG/,
  );
});

test("release plan rejects any E2E worktree outside the absolute Starship root", () => {
  for (const cwd of [
    "/tmp/hk-viz-worktree",
    "/var/folders/hk-viz-worktree",
    "/Users/dongpinhu/Desktop/MAIS-MVP",
  ]) {
    assert.throws(
      () =>
        buildHkVisualizationReleasePlan({
          cwd,
          environment: {},
          now: new Date("2026-08-09T12:34:56.000Z"),
        }),
      /\/Volumes\/Starship/,
    );
  }
});

test("dry-run reports every managed runtime artifact as its actual absolute Starship path", () => {
  const result = runHkVisualizationReleaseGate({
    argv: ["--dry-run"],
    cwd: "/Volumes/Starship/MAIS-hk-viz-labs-wt",
    environment: {},
    now: new Date("2026-08-09T12:34:56.000Z"),
  });
  assert.equal(result.dryRun, true);
  assert.match(result.plan.artifactRoot, /^\/Volumes\/Starship\//);
  assert.match(result.plan.jsonReport, /^\/Volumes\/Starship\//);
  assert.equal(result.plan.command, process.execPath);
  assert.match(result.plan.args[0], /^\/Volumes\/Starship\//);
  for (const [key, value] of Object.entries(result.plan.actualPaths)) {
    assert.match(value, /^\/Volumes\/Starship\//, key);
  }
  assert.match(result.plan.pathManifestHash, /^[a-f0-9]{64}$/);
});

test("report validator accepts the exact nine-spec desktop evidence with zero skips, flakes, and failures", () => {
  const result = validateReport(passingReport());
  assert.deepEqual({
    expectedTestCount: result.expectedTestCount,
    files: result.files,
    flakyTestCount: result.flakyTestCount,
    project: result.project,
    skippedTestCount: result.skippedTestCount,
    unexpectedTestCount: result.unexpectedTestCount,
  }, {
    expectedTestCount: HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT,
    files: [...HK_VISUALIZATION_RELEASE_SPECS],
    flakyTestCount: 0,
    project: "desktop-chrome",
    skippedTestCount: 0,
    unexpectedTestCount: 0,
  });
  assert.equal(result.actualPaths.workspace, currentTestWorkspace);
  assert.equal(result.actualPaths.browserProfiles.length, 1);
  assert.match(
    result.actualPaths.browserProfiles[0],
    /\/playwright_chromiumdev_profile-fixture$/,
  );
  assert.equal(
    result.scrollObservationEvidence.contractVersion,
    HK_VISUALIZATION_BROWSER_SCROLL_RUN_EVIDENCE_VERSION,
  );
  assert.equal(result.scrollObservationEvidence.packageCount, 216);
  assert.equal(result.scrollObservationEvidence.cellCount, 918);
  assert.equal(
    result.scrollObservationEvidence.scrollObservationSetCount,
    HK_VISUALIZATION_SCROLL_FIXTURE_OBSERVATION_COUNT,
  );
  assert.equal(
    result.scrollObservationEvidence.scrollObservationCount,
    HK_VISUALIZATION_SCROLL_FIXTURE_OBSERVATION_COUNT,
  );
  assert.equal(
    result.scrollObservationEvidence.scrollPositionAuditCount,
    HK_VISUALIZATION_SCROLL_FIXTURE_OBSERVATION_COUNT * 6,
  );
  assert.match(
    result.scrollObservationEvidence.runAggregateHash,
    /^[a-f0-9]{64}$/,
  );
  assert.equal(
    result.dependentTransitionEvidence.contractVersion,
    HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
  );
  assert.equal(result.dependentTransitionEvidence.packageCount, 216);
  assert.equal(
    result.dependentTransitionEvidence.cellCount,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_CELL_COUNT,
  );
  assert.equal(
    result.dependentTransitionEvidence.sequenceObservationCount,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_SEQUENCE_OBSERVATION_COUNT,
  );
  assert.equal(
    result.dependentTransitionEvidence.phaseObservationCount,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_PHASE_OBSERVATION_COUNT,
  );
  assert.match(
    result.dependentTransitionEvidence.runAggregateHash,
    /^[a-f0-9]{64}$/,
  );
  assert.equal(
    result.passThroughOracleEvidence.contractVersion,
    HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_RUN_EVIDENCE_VERSION,
  );
  assert.equal(result.passThroughOracleEvidence.packageCount, 216);
  assert.equal(
    result.passThroughOracleEvidence.cellCount,
    HK_VISUALIZATION_PASS_THROUGH_ORACLE_EXPECTED_CELL_COUNT,
  );
  assert.deepEqual(
    result.passThroughOracleEvidence.labCellCounts,
    Object.fromEntries(
      HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS.map((labId) => [labId, 18]),
    ),
  );
  assert.match(
    result.passThroughOracleEvidence.runAggregateHash,
    /^[a-f0-9]{64}$/,
  );
  assert.equal(
    result.passThroughResetEvidence.contractVersion,
    HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_RUN_EVIDENCE_VERSION,
  );
  assert.equal(result.passThroughResetEvidence.packageCount, 216);
  assert.equal(result.passThroughResetEvidence.cellCount, 126);
  assert.equal(
    result.passThroughResetEvidence.observationCount,
    HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_OBSERVATION_COUNT,
  );
  assert.equal(
    result.passThroughResetEvidence.restoringActionCount,
    HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_RESTORING_ACTION_COUNT,
  );
  assert.equal(
    result.passThroughResetEvidence.canonicalNoopActionCount,
    HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_CANONICAL_NOOP_ACTION_COUNT,
  );
  assert.equal(
    result.passThroughResetEvidence.layerReceiptCount,
    HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_LAYER_RECEIPT_COUNT,
  );
  assert.match(
    result.passThroughResetEvidence.runAggregateHash,
    /^[a-f0-9]{64}$/,
  );
  assert.equal(
    result.p6AveragesEvidence.contractVersion,
    HK_VISUALIZATION_BROWSER_P6_AVERAGES_RUN_EVIDENCE_VERSION,
  );
  assert.equal(result.p6AveragesEvidence.packageCount, 216);
  assert.equal(
    result.p6AveragesEvidence.cellCount,
    HK_VISUALIZATION_P6_AVERAGES_EXPECTED_CELL_COUNT,
  );
  assert.equal(
    result.p6AveragesEvidence.boundaryObservationCount,
    HK_VISUALIZATION_P6_AVERAGES_EXPECTED_CELL_COUNT * 2,
  );
  assert.match(result.p6AveragesEvidence.runAggregateHash, /^[a-f0-9]{64}$/);
  assert.equal(
    result.p6BudgetEvidence.contractVersion,
    HK_VISUALIZATION_BROWSER_P6_BUDGET_RUN_EVIDENCE_VERSION,
  );
  assert.equal(result.p6BudgetEvidence.packageCount, 216);
  assert.equal(
    result.p6BudgetEvidence.cellCount,
    HK_VISUALIZATION_P6_BUDGET_EXPECTED_CELL_COUNT,
  );
  assert.equal(
    result.p6BudgetEvidence.boundaryObservationCount,
    HK_VISUALIZATION_P6_BUDGET_EXPECTED_CELL_COUNT * 9,
  );
  assert.match(result.p6BudgetEvidence.runAggregateHash, /^[a-f0-9]{64}$/);
});

test("browser scroll annotation validator binds exact 216 packages, 918 cells, every phase/set/hash/count, and one run aggregate", () => {
  const report = passingReport();
  const evidence = validateHkVisualizationBrowserScrollAnnotations(
    serializedTestsForScrollValidation(report),
  );
  assert.equal(evidence.contractVersion, HK_VISUALIZATION_BROWSER_SCROLL_RUN_EVIDENCE_VERSION);
  assert.equal(evidence.packageCount, 216);
  assert.equal(evidence.cellCount, 918);
  assert.equal(
    evidence.scrollObservationSetCount,
    HK_VISUALIZATION_SCROLL_FIXTURE_OBSERVATION_COUNT,
  );
  assert.equal(
    evidence.scrollObservationCount,
    HK_VISUALIZATION_SCROLL_FIXTURE_OBSERVATION_COUNT,
  );
  assert.equal(
    evidence.scrollPositionAuditCount,
    HK_VISUALIZATION_SCROLL_FIXTURE_OBSERVATION_COUNT * 6,
  );
  assert.equal(new Set(evidence.cellIds).size, 918);
  assert.match(evidence.runAggregateHash, /^[a-f0-9]{64}$/);
});

test("browser dependent-transition runner fixture freezes the exact11 v8 plan and projection-matrix mapping", () => {
  const fixtureRows = Object.entries(
    hkVisualizationDependentTransitionFixtureSourcePlans,
  ).map(([sequenceId, sourcePlan]) => ({
    planHash: sourcePlan.planHash,
    projectionMatrixHash: sourcePlan.projectionMatrixHash,
    sequenceId,
  }));
  assert.equal(fixtureRows.length, 11);
  assert.deepEqual(
    fixtureRows,
    Object.keys(hkVisualizationDependentTransitionFixtureSourcePlans).map(
      (sequenceId) => {
        const sourcePlan =
          HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID[
            sequenceId
          ];
        assert.equal(
          sourcePlan.schemaVersion,
          "hk-viz-dependent-transition-sequence.v8",
        );
        return {
          planHash: sourcePlan.planHash,
          projectionMatrixHash: sourcePlan.projectionMatrixHash,
          sequenceId,
        };
      },
    ),
  );
});

test("browser dependent-transition annotation validator binds exact 216 packages, 126 affected cells, 198 ordered sequences, and 594 phases", () => {
  const evidence = validateHkVisualizationBrowserDependentTransitionAnnotations(
    serializedTestsForScrollValidation(passingReport()),
  );
  assert.equal(
    evidence.contractVersion,
    HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
  );
  assert.equal(evidence.packageCount, 216);
  assert.equal(
    evidence.cellCount,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_CELL_COUNT,
  );
  assert.equal(
    evidence.sequenceObservationCount,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_SEQUENCE_OBSERVATION_COUNT,
  );
  assert.equal(
    evidence.phaseObservationCount,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_PHASE_OBSERVATION_COUNT,
  );
  assert.equal(evidence.sourcePlanMappings.length, 11);
  assert.equal(
    new Set(evidence.sourcePlanMappings.map(({ sequenceId }) => sequenceId)).size,
    11,
  );
  assert.deepEqual(
    evidence.sourcePlanMappings.map(
      ({ companionAuthorityHash, sequenceId }) => ({
        companionAuthorityHash,
        sequenceId,
      }),
    ),
    hkVisualizationDependentTransitionFixtureAuthorityHashes,
  );
  assert.ok(evidence.sourcePlanMappings.every((mapping) =>
    mapping.geometryPolicyHash ===
      "c8ed29b2f94ad94a746950893f8f539b3a895516c2862e3620dfcc46c8f891ba" &&
    mapping.geometryPolicyVersion ===
      "hk-viz-dependent-transition-geometry-policy.v1"
  ));
  assert.equal(
    evidence.sourcePlanManifestVersion,
    "hk-viz-dependent-transition-source-plans-v4",
  );
  assert.match(evidence.sourcePlanMappingHash, /^[a-f0-9]{64}$/);
  assert.equal(
    evidence.visibleMathProjectionObservationCount,
    HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_SEQUENCE_OBSERVATION_COUNT * 5,
  );
  assert.equal(new Set(evidence.cellIds).size, 126);
  assert.equal(evidence.packageSourceBindingHashes.length, 216);
  assert.equal(
    evidence.sourcePackageResultAttachmentNames.length,
    216,
  );
  assert.equal(
    new Set(evidence.sourcePackageResultAttachmentNames).size,
    216,
  );
  assert.equal(
    evidence.sourcePackageResultAttachmentSha256s.length,
    216,
  );
  assert.ok(
    evidence.sourcePackageResultAttachmentSha256s.every((hash) =>
      /^[a-f0-9]{64}$/.test(hash),
    ),
  );
  assert.match(
    evidence.sourcePackageResultAttachmentAggregateHash,
    /^[a-f0-9]{64}$/,
  );
  assert.match(evidence.topologyAggregateHash, /^[a-f0-9]{64}$/);
  assert.match(evidence.runAggregateHash, /^[a-f0-9]{64}$/);
});

test("dependent-transition source mapping rejects a fully rehashed companion-authority drift against the test-owned exact11 table", () => {
  const validateMappingReceipt =
    hkVisualizationReleaseGateModule
      .validateHkVisualizationDependentTransitionSourcePlanMappingReceipt;
  assert.equal(typeof validateMappingReceipt, "function");
  if (typeof validateMappingReceipt !== "function") return;
  const evidence = validateHkVisualizationBrowserDependentTransitionAnnotations(
    serializedTestsForScrollValidation(passingReport()),
  );
  const sourcePlanMappings = structuredClone(evidence.sourcePlanMappings);
  sourcePlanMappings[0].companionAuthorityHash = sha256(
    "fully-rehashed-foreign-companion-authority",
  );
  const forgedReceipt = {
    sourcePlanManifestVersion: evidence.sourcePlanManifestVersion,
    sourcePlanMappingHash: hashCanonicalFixture({
      contractVersion:
        HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_RUN_EVIDENCE_VERSION,
      kind: "browser-dependent-transition-source-plan-mapping",
      manifestVersion: evidence.sourcePlanManifestVersion,
      sourcePlanMappings,
    }),
    sourcePlanMappings,
  };
  assert.throws(
    () => validateMappingReceipt(forgedReceipt),
    /source mapping.*companion authority/i,
  );
});

test("browser dependent-transition annotations require bounded canonical minified UTF-8 JSON bytes before semantic validation", async (t) => {
  const validate = (report) =>
    validateHkVisualizationBrowserDependentTransitionAnnotations(
      serializedTestsForScrollValidation(report),
    );
  const cases = [
    {
      name: "description must be a string",
      mutate(report) {
        const { annotation } = machineDependentTransitionAnnotations(report)[0];
        annotation.description = JSON.parse(annotation.description);
      },
      pattern: /annotation.*description.*string/i,
    },
    {
      name: "leading whitespace is noncanonical",
      mutate(report) {
        const { annotation } = machineDependentTransitionAnnotations(report)[0];
        annotation.description = ` ${annotation.description}`;
      },
      pattern: /annotation.*canonical.*minified/i,
    },
    {
      name: "duplicate key whose final value is valid is noncanonical",
      mutate(report) {
        const { annotation } = machineDependentTransitionAnnotations(report)[0];
        const cellCount = JSON.parse(annotation.description).cellCount;
        annotation.description = annotation.description.replace(
          "{",
          `{"cellCount":${cellCount + 1},`,
        );
      },
      pattern: /annotation.*canonical.*minified/i,
    },
    {
      name: "negative zero in an otherwise valid zero-cell aggregate is noncanonical",
      mutate(report) {
        const record = machineDependentTransitionAnnotations(report).find(
          ({ annotation }) => JSON.parse(annotation.description).cellCount === 0,
        );
        assert.ok(record);
        record.annotation.description = record.annotation.description.replace(
          '"cellCount":0',
          '"cellCount":-0',
        );
      },
      pattern: /annotation.*canonical.*minified/i,
    },
    {
      name: "oversized UTF-8 annotation is rejected before parse",
      mutate(report) {
        const { annotation } = machineDependentTransitionAnnotations(report)[0];
        const cap =
          hkVisualizationReleaseGateModule
            .HK_VISUALIZATION_DEPENDENT_TRANSITION_ANNOTATION_MAX_UTF8_BYTES ??
          1_048_576;
        annotation.description = `${" ".repeat(cap + 1)}${annotation.description}`;
      },
      pattern: /annotation.*UTF-8 byte limit/i,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(report);
      assert.throws(() => validate(report), invalid.pattern);
    });
  }
});

test("browser dependent-transition annotation validator rejects missing, duplicate, reordered, foreign, cross-linked, and fully rehashed drift", async (t) => {
  const affectedRecord = (report) =>
    machineDependentTransitionAnnotations(report).find(
      ({ annotation }) => JSON.parse(annotation.description).cellCount > 0,
    );
  const cases = [
    {
      name: "missing annotation",
      mutate(report) {
        const { entry } = machineDependentTransitionAnnotations(report)[0];
        entry.annotations = entry.annotations.filter(
          ({ type }) =>
            type !==
            HK_VISUALIZATION_BROWSER_DEPENDENT_TRANSITION_ANNOTATION_TYPE,
        );
      },
      pattern: /exactly one.*annotation; observed 0/,
    },
    {
      name: "duplicate annotation",
      mutate(report) {
        const { annotation, entry } =
          machineDependentTransitionAnnotations(report)[0];
        entry.annotations.push(structuredClone(annotation));
      },
      pattern: /exactly one.*annotation; observed 2/,
    },
    {
      name: "missing sequence with full rehash",
      mutate(report) {
        const record = affectedRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].sequences.pop();
        rehashDependentTransitionAggregateFixture(aggregate);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /sequence topology is missing, duplicated, foreign, or reordered/,
    },
    {
      name: "duplicate sequence with full rehash",
      mutate(report) {
        const record = affectedRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].sequences.push(
          structuredClone(aggregate.cells[0].sequences[0]),
        );
        rehashDependentTransitionAggregateFixture(aggregate);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /sequence topology is missing, duplicated, foreign, or reordered/,
    },
    {
      name: "reordered sequences with full rehash",
      mutate(report) {
        const records = machineDependentTransitionAnnotations(report);
        const record = records.find(({ annotation }) =>
          JSON.parse(annotation.description).cells.some(
            ({ sequenceCount }) => sequenceCount > 1,
          ),
        );
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells.find(({ sequenceCount }) => sequenceCount > 1)
          .sequences.reverse();
        rehashDependentTransitionAggregateFixture(aggregate);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /sequence topology is missing, duplicated, foreign, or reordered/,
    },
    {
      name: "reordered phases with full rehash",
      mutate(report) {
        const record = affectedRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].sequences[0].phaseIds.reverse();
        rehashDependentTransitionAggregateFixture(aggregate);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /phase topology must be exact pre, clamp, expand/,
    },
    {
      name: "foreign sequence with full rehash",
      mutate(report) {
        const record = affectedRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].sequences[0].sequenceId = "foreign-sequence";
        rehashDependentTransitionAggregateFixture(aggregate);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /sequence topology is missing, duplicated, foreign, or reordered/,
    },
    {
      name: "cross-linked cell with full outer rehash",
      mutate(report) {
        const records = machineDependentTransitionAnnotations(report)
          .map((record) => ({
            ...record,
            aggregate: JSON.parse(record.annotation.description),
          }))
          .filter(({ aggregate }) => aggregate.cellCount > 0);
        let target = null;
        let sourceCell = null;
        for (const candidate of records) {
          for (const cell of candidate.aggregate.cells) {
            const source = records
              .flatMap(({ aggregate }) => aggregate.cells)
              .find(
                (other) =>
                  other.labId === cell.labId && other.cellId !== cell.cellId,
              );
            if (source) {
              target = { record: candidate, cell };
              sourceCell = source;
              break;
            }
          }
          if (target) break;
        }
        assert.ok(target && sourceCell);
        target.cell.sequences = structuredClone(sourceCell.sequences);
        rehashDependentTransitionAggregateFixture(target.record.aggregate);
        target.record.annotation.description = JSON.stringify(
          target.record.aggregate,
        );
      },
      pattern: /sequence header cross-binding drifted/,
    },
    {
      name: "scroll package cross-link",
      mutate(report) {
        const record = affectedRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.scrollPackageAggregateHash = sha256("foreign-scroll-package");
        rehashDependentTransitionAggregateFixture(aggregate);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /scroll package aggregate cross-binding drifted/,
    },
    {
      name: "package aggregate hash drift",
      mutate(report) {
        const record = affectedRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.aggregateHash = sha256("dependent-package-drift");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /dependent-transition aggregateHash drifted/,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(report);
      assert.throws(
        () =>
          validateHkVisualizationBrowserDependentTransitionAnnotations(
            serializedTestsForScrollValidation(report),
          ),
        invalid.pattern,
      );
    });
  }
});

test("browser dependent-transition validator rejects independently rehashed opaque leaves and companion provenance drift", async (t) => {
  const validate = (report) =>
    validateHkVisualizationBrowserDependentTransitionAnnotations(
      serializedTestsForScrollValidation(report),
    );
  const affectedRecord = (report) =>
    machineDependentTransitionAnnotations(report).find(
      ({ annotation }) => JSON.parse(annotation.description).cellCount > 0,
    );
  const mutateCompanionAndCompact = (report, mutateObservation) => {
    const record = affectedRecord(report);
    const aggregate = JSON.parse(record.annotation.description);
    const aggregateCell = aggregate.cells.find(
      ({ labId }) => labId === "p1-counting-number-bonds",
    );
    assert.ok(aggregateCell);
    const packageResult = parseDependentTransitionPackageAttachment(
      record.entry,
      record.spec.title,
    );
    const packageCell = packageResult.cells.find(
      ({ cellId }) => cellId === aggregateCell.cellId,
    );
    assert.ok(packageCell);
    const observation = packageCell.dependentTransitionSequenceObservations[0];
    assert.ok(observation);
    mutateObservation(observation);
    observation.observationHash = hashOrderedFixtureWithoutKey(
      observation,
      "observationHash",
    );
    overwriteCompactSequenceFromObservation(
      aggregateCell.sequences[0],
      observation,
    );
    aggregateCell.canonicalFingerprint =
      observation.canonicalVisibleBaseline.canonicalFingerprint;
    rehashDependentTransitionAggregateFixture(aggregate);
    record.annotation.description = JSON.stringify(aggregate);
    writeDependentTransitionPackageAttachment(
      record.entry,
      record.spec.title,
      packageResult,
    );
  };
  const mutateCompactAndRehash = (report, mutateSequence) => {
    const record = affectedRecord(report);
    const aggregate = JSON.parse(record.annotation.description);
    mutateSequence(aggregate.cells[0].sequences[0]);
    rehashDependentTransitionAggregateFixture(aggregate);
    record.annotation.description = JSON.stringify(aggregate);
  };
  const dummyControl = (index) => ({
    controlId: `dummy-${index}`,
    descriptor: {
      controlId: `dummy-${index}`,
      enabled: true,
      excludedValues: [],
      maximum: 10,
      minimum: 0,
      step: 1,
      visibility: "interactive",
      domainId: null,
    },
    value: index + 1,
  });
  const dummyVisibleElement = (index = 0) => ({
    attributes: [["data-viz-name", `dummy-${index}`]],
    learnerVisible: true,
    paintedSubtree: { elementCount: 1, hash: sha256(`dummy-paint-${index}`) },
    renderedGeometry: { height: 10, width: 10, x: 10 + index * 12, y: 10 },
    tagName: "g",
    textHash: sha256(`dummy-text-${index}`),
    userGeometry: { height: 10, width: 10, x: 10 + index * 12, y: 10 },
  });
  const cases = [
    {
      name: "single compact observation leaf with full outer rehash",
      mutate(report) {
        const record = affectedRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].sequences[0].observationHash = sha256(
          "forged-single-observation-leaf",
        );
        rehashDependentTransitionAggregateFixture(aggregate);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /dependent-transition.*companion/i,
    },
    {
      name: "all opaque compact leaves with full outer rehash",
      mutate(report) {
        const record = affectedRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        const cell = aggregate.cells[0];
        const sequence = cell.sequences[0];
        const canonicalFingerprint = "fully-forged-canonical-fingerprint";
        cell.canonicalFingerprint = canonicalFingerprint;
        sequence.canonicalFingerprint = canonicalFingerprint;
        sequence.canonicalVisibleBaselineHash = sha256("forged-baseline");
        sequence.observationHash = sha256("forged-observation");
        sequence.planHash = sha256("forged-plan");
        sequence.postSequenceRestorationHash = sha256("forged-restoration");
        sequence.phaseObservationHashes = [0, 1, 2].map((index) =>
          sha256(`forged-phase-${index}`),
        );
        rehashDependentTransitionAggregateFixture(aggregate);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /dependent-transition.*(?:companion|source plan)/i,
    },
    {
      name: "uniform forged plan hash across all exact 18 cells",
      mutate(report) {
        const forgedPlanHash = sha256("uniform-forged-plan-hash");
        let mutatedCellCount = 0;
        for (const record of machineDependentTransitionAnnotations(report)) {
          const aggregate = JSON.parse(record.annotation.description);
          const packageResult = parseDependentTransitionPackageAttachment(
            record.entry,
            record.spec.title,
          );
          let packageMutated = false;
          for (const aggregateCell of aggregate.cells) {
            const sequence = aggregateCell.sequences.find(
              ({ sequenceId }) =>
                sequenceId === "p1-number-bond-known-part",
            );
            if (!sequence) continue;
            const packageCell = packageResult.cells.find(
              ({ cellId }) => cellId === aggregateCell.cellId,
            );
            const observation =
              packageCell?.dependentTransitionSequenceObservations.find(
                ({ sequenceId }) =>
                  sequenceId === "p1-number-bond-known-part",
              );
            assert.ok(observation);
            observation.planHash = forgedPlanHash;
            observation.canonicalVisibleBaseline.planHash = forgedPlanHash;
            rehashDependentTransitionObservationFixture(observation);
            overwriteCompactSequenceFromObservation(sequence, observation);
            packageMutated = true;
            mutatedCellCount += 1;
          }
          if (!packageMutated) continue;
          rehashDependentTransitionAggregateFixture(aggregate);
          record.annotation.description = JSON.stringify(aggregate);
          writeDependentTransitionPackageAttachment(
            record.entry,
            record.spec.title,
            packageResult,
          );
        }
        assert.equal(mutatedCellCount, 18);
      },
      pattern: /source plan.*planHash/i,
    },
    {
      name: "companion-only canonical fingerprint drift with full source rehash",
      mutate(report) {
        const record = affectedRecord(report);
        const packageResult = parseDependentTransitionPackageAttachment(
          record.entry,
          record.spec.title,
        );
        const packageCell = packageResult.cells.find(
          ({ labId }) => labId === "p1-counting-number-bonds",
        );
        assert.ok(packageCell);
        const observation = packageCell.dependentTransitionSequenceObservations[0];
        const forgedFingerprint = "companion-only-forged-fingerprint";
        observation.canonicalVisibleBaseline.canonicalFingerprint =
          forgedFingerprint;
        observation.postSequenceRestoration.canonicalFingerprint =
          forgedFingerprint;
        observation.postSequenceRestoration.afterFingerprint = forgedFingerprint;
        rehashDependentTransitionObservationFixture(observation);
        writeDependentTransitionPackageAttachment(
          record.entry,
          record.spec.title,
          packageResult,
        );
      },
      pattern: /dependent-transition.*companion/i,
    },
    {
      name: "cross-cell companion observation exchange",
      mutate(report) {
        const records = machineDependentTransitionAnnotations(report).filter(
          ({ annotation }) =>
            JSON.parse(annotation.description).cells.some(
              ({ labId }) => labId === "p1-counting-number-bonds",
            ),
        );
        assert.ok(records.length >= 2);
        const [leftRecord, rightRecord] = records;
        const leftResult = parseDependentTransitionPackageAttachment(
          leftRecord.entry,
          leftRecord.spec.title,
        );
        const rightResult = parseDependentTransitionPackageAttachment(
          rightRecord.entry,
          rightRecord.spec.title,
        );
        const leftCell = leftResult.cells.find(
          ({ labId }) => labId === "p1-counting-number-bonds",
        );
        const rightCell = rightResult.cells.find(
          ({ labId }) => labId === "p1-counting-number-bonds",
        );
        assert.ok(leftCell && rightCell);
        [
          leftCell.dependentTransitionSequenceObservations,
          rightCell.dependentTransitionSequenceObservations,
        ] = [
          rightCell.dependentTransitionSequenceObservations,
          leftCell.dependentTransitionSequenceObservations,
        ];
        writeDependentTransitionPackageAttachment(
          leftRecord.entry,
          leftRecord.spec.title,
          leftResult,
        );
        writeDependentTransitionPackageAttachment(
          rightRecord.entry,
          rightRecord.spec.title,
          rightResult,
        );
      },
      pattern: /companion.*cellId/i,
    },
    {
      name: "fully rehashed companion language drift",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.language = observation.language === "en" ? "zh" : "en";
          observation.canonicalVisibleBaseline.language = observation.language;
        });
      },
      pattern: /sequence header cross-binding/i,
    },
    {
      name: "fully rehashed companion theme drift",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.theme = observation.theme === "dark" ? "light" : "dark";
          observation.canonicalVisibleBaseline.theme = observation.theme;
        });
      },
      pattern: /sequence header cross-binding/i,
    },
    {
      name: "fully rehashed pre reset count negative",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].resetCountSincePreviousPhase = -1;
        });
      },
      pattern: /phase.*reset count/i,
    },
    {
      name: "fully rehashed clamp reset count two",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[1].resetCountSincePreviousPhase = 2;
        });
      },
      pattern: /phase.*reset count/i,
    },
    {
      name: "fully rehashed surface tag div",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].surface.tagName = "div";
        });
      },
      pattern: /surface.*svg/i,
    },
    {
      name: "fully rehashed surface unknown field",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].surface.unexpected = true;
        });
      },
      pattern: /surface.*schema/i,
    },
    {
      name: "fully rehashed negative rendered geometry",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].surface.renderedSize.width = -1;
        });
      },
      pattern: /surface.*geometry/i,
    },
    {
      name: "fully rehashed positive rendered geometry escapes phase surface",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          const phase = observation.phases[0];
          phase.visibleElements[0].renderedGeometry.x =
            phase.surface.renderedSize.width + 1;
        });
      },
      pattern: /rendered geometry.*surface/i,
    },
    {
      name: "fully rehashed positive user geometry escapes phase viewBox",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          const phase = observation.phases[0];
          phase.visibleElements[0].userGeometry.x =
            phase.surface.viewBox.x + phase.surface.viewBox.width + 1;
        });
      },
      pattern: /user geometry.*viewBox/i,
    },
    {
      name: "fully rehashed paired baseline and restoration geometry escapes both surfaces",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          const baselineElement =
            observation.canonicalVisibleBaseline.visibleElements[0];
          const restorationElement =
            observation.postSequenceRestoration.visibleElements[0];
          for (const element of [baselineElement, restorationElement]) {
            element.renderedGeometry.x =
              observation.canonicalVisibleBaseline.surface.renderedSize.width + 1;
            element.userGeometry.x =
              observation.canonicalVisibleBaseline.surface.viewBox.x +
              observation.canonicalVisibleBaseline.surface.viewBox.width + 1;
          }
          observation.canonicalVisibleBaseline.baselineHash =
            hashOrderedFixtureWithoutKey(
              observation.canonicalVisibleBaseline,
              "baselineHash",
            );
          observation.postSequenceRestoration.canonicalVisibleBaselineHash =
            observation.canonicalVisibleBaseline.baselineHash;
        });
      },
      pattern: /rendered geometry.*surface|user geometry.*viewBox/i,
    },
    {
      name: "fully rehashed plausible scroll surface mismatch exceeds frozen tolerance",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          const surface = observation.phases[0].surface;
          surface.scrollport.scrollWidth = surface.renderedSize.width - 0.8;
          surface.scrollport.maxScrollLeft =
            surface.scrollport.scrollWidth - surface.scrollport.clientWidth;
        });
      },
      pattern: /surface.*scroll/i,
    },
    {
      name: "fully rehashed negative scroll extent",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].surface.scrollport.scrollHeight = -1;
        });
      },
      pattern: /surface.*scroll/i,
    },
    {
      name: "fully rehashed nonfinite-equivalent scroll value",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].surface.scrollport.maxScrollLeft = null;
        });
      },
      pattern: /surface.*scroll/i,
    },
    {
      name: "fully rehashed missing controls",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].controls = [];
        });
      },
      pattern: /controls.*source authority/i,
    },
    {
      name: "fully rehashed extra control",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].controls.push(dummyControl(9));
        });
      },
      pattern: /controls.*source authority/i,
    },
    {
      name: "fully rehashed reordered controls",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          if (observation.phases[0].controls.length < 2) {
            observation.phases[0].controls = [dummyControl(0), dummyControl(1)];
          }
          observation.phases[0].controls.reverse();
        });
      },
      pattern: /controls.*source authority/i,
    },
    {
      name: "fully rehashed empty public JSON",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].rawSerializedPublicState = "";
        });
      },
      pattern: /public state.*canonical/i,
    },
    {
      name: "fully rehashed whitespace public JSON",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].rawSerializedPublicState =
            ` ${observation.phases[0].rawSerializedPublicState}`;
        });
      },
      pattern: /public state.*canonical/i,
    },
    {
      name: "fully rehashed duplicate-key public JSON",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].rawSerializedPublicState =
            '{"duplicate":0,"duplicate":0}';
        });
      },
      pattern: /public state.*canonical/i,
    },
    {
      name: "fully rehashed negative-zero public JSON",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].rawSerializedPublicState = '{"negativeZero":-0}';
        });
      },
      pattern: /public state.*canonical/i,
    },
    {
      name: "fully rehashed missing visible element",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].visibleElements = [];
        });
      },
      pattern: /visible elements.*source authority/i,
    },
    {
      name: "fully rehashed extra visible element",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].visibleElements.push(dummyVisibleElement(9));
        });
      },
      pattern: /visible elements.*source authority/i,
    },
    {
      name: "fully rehashed visible nested unknown field",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          if (observation.phases[0].visibleElements.length === 0) {
            observation.phases[0].visibleElements.push(dummyVisibleElement());
          }
          observation.phases[0].visibleElements[0].paintedSubtree.unexpected = true;
        });
      },
      pattern: /visible element.*schema/i,
    },
    {
      name: "fully rehashed restoration surface drift",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.postSequenceRestoration.surface.scrollport.scrollWidth += 2;
          observation.postSequenceRestoration.surface.scrollport.maxScrollLeft += 2;
        });
      },
      pattern: /restoration.*surface.*baseline/i,
    },
    {
      name: "fully rehashed restoration visible geometry drift",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          if (observation.postSequenceRestoration.visibleElements.length === 0) {
            observation.postSequenceRestoration.visibleElements.push(
              dummyVisibleElement(),
            );
          }
          observation.postSequenceRestoration.visibleElements[0]
            .renderedGeometry.x += 2;
        });
      },
      pattern: /restoration.*visible.*baseline/i,
    },
    {
      name: "fully rehashed baseline ancestry-summary drift",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.canonicalVisibleBaseline.visibleMathProjection
            .ancestryScaleSummary.hash = sha256("forged-baseline-ancestry");
        });
      },
      pattern: /visible-math.*projection/i,
    },
    {
      name: "fully rehashed baseline projection-hash drift",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.canonicalVisibleBaseline.visibleMathProjection.hash =
            sha256("forged-baseline-projection");
        });
      },
      pattern: /visible-math.*projection/i,
    },
    {
      name: "fully rehashed phase ancestry-summary drift",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].visibleMathProjection.ancestryScaleSummary.hash =
            sha256("forged-phase-ancestry");
        });
      },
      pattern: /visible-math.*projection/i,
    },
    {
      name: "fully rehashed phase projection-hash drift",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.phases[0].visibleMathProjection.hash =
            sha256("forged-phase-projection");
        });
      },
      pattern: /visible-math.*projection/i,
    },
    {
      name: "fully rehashed restoration ancestry-summary drift",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.postSequenceRestoration.visibleMathProjection
            .ancestryScaleSummary.hash = sha256("forged-restoration-ancestry");
        });
      },
      pattern: /visible-math.*projection/i,
    },
    {
      name: "fully rehashed restoration projection-hash drift",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.postSequenceRestoration.visibleMathProjection.hash =
            sha256("forged-restoration-projection");
        });
      },
      pattern: /visible-math.*projection/i,
    },
    {
      name: "compact projection matrix drift with full outer rehash",
      mutate(report) {
        mutateCompactAndRehash(report, (sequence) => {
          sequence.projectionMatrixHash = sha256("forged-projection-matrix");
        });
      },
      pattern: /source plan.*matrix/i,
    },
    {
      name: "compact visible-math missing field with full outer rehash",
      mutate(report) {
        mutateCompactAndRehash(report, (sequence) => {
          delete sequence.visibleMathProjectionEvidence.projectionHashes;
        });
      },
      pattern: /visible-math.*schema/i,
    },
    {
      name: "compact visible-math extra field with full outer rehash",
      mutate(report) {
        mutateCompactAndRehash(report, (sequence) => {
          sequence.visibleMathProjectionEvidence.unexpected = true;
        });
      },
      pattern: /visible-math.*schema/i,
    },
    {
      name: "compact visible-math reordered projections with full outer rehash",
      mutate(report) {
        mutateCompactAndRehash(report, (sequence) => {
          sequence.visibleMathProjectionEvidence.projectionHashes.reverse();
        });
      },
      pattern: /visible-math.*projection/i,
    },
    {
      name: "compact visible-math topology hash drift with full outer rehash",
      mutate(report) {
        mutateCompactAndRehash(report, (sequence) => {
          sequence.visibleMathProjectionEvidence.topologyHash =
            sha256("forged-visible-topology");
        });
      },
      pattern: /visible-math.*(?:topology|hash|summary)/i,
    },
    {
      name: "fully rehashed restoration starts canonical",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.postSequenceRestoration.beforeFingerprint =
            observation.postSequenceRestoration.canonicalFingerprint;
        });
      },
      pattern: /restoration.*beforeFingerprint/i,
    },
    {
      name: "fully rehashed restoration ends noncanonical",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.postSequenceRestoration.afterFingerprint =
            "noncanonical-after-reset";
        });
      },
      pattern: /restoration.*afterFingerprint/i,
    },
    {
      name: "fully rehashed restoration uses two reset clicks",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.postSequenceRestoration.resetClickCount = 2;
        });
      },
      pattern: /restoration.*resetClickCount/i,
    },
    {
      name: "fully rehashed restoration cross-links another baseline hash",
      mutate(report) {
        mutateCompanionAndCompact(report, (observation) => {
          observation.postSequenceRestoration.canonicalVisibleBaselineHash =
            sha256("foreign-canonical-visible-baseline");
        });
      },
      pattern: /restoration.*canonicalVisibleBaselineHash/i,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(report);
      assert.throws(() => validate(report), invalid.pattern);
    });
  }
});

test("browser dependent-transition validator rejects malformed or ambiguous package-result attachments", async (t) => {
  const validate = (report) =>
    validateHkVisualizationBrowserDependentTransitionAnnotations(
      serializedTestsForScrollValidation(report),
    );
  const firstRecord = (report) =>
    machineDependentTransitionAnnotations(report)[0];
  const cases = [
    {
      name: "missing attachment",
      mutate(record) {
        record.entry.results[0].attachments = [];
      },
    },
    {
      name: "duplicate exact-name attachment",
      mutate(record) {
        record.entry.results[0].attachments.push(
          structuredClone(record.entry.results[0].attachments[0]),
        );
      },
    },
    {
      name: "path-only attachment",
      mutate(record) {
        const attachment = record.entry.results[0].attachments[0];
        delete attachment.body;
        attachment.path = "/Volumes/Starship/foreign/package-result.json";
      },
    },
    {
      name: "foreign attachment name",
      mutate(record) {
        record.entry.results[0].attachments[0].name = "foreign-package.json";
      },
    },
    {
      name: "noncanonical base64",
      mutate(record) {
        record.entry.results[0].attachments[0].body = "***not-base64***";
      },
    },
    {
      name: "invalid UTF-8",
      mutate(record) {
        record.entry.results[0].attachments[0].body =
          Buffer.from([0xff]).toString("base64");
      },
    },
    {
      name: "invalid JSON",
      mutate(record) {
        record.entry.results[0].attachments[0].body =
          Buffer.from("{]", "utf8").toString("base64");
      },
    },
    {
      name: "duplicate-key noncanonical JSON",
      mutate(record) {
        record.entry.results[0].attachments[0].body = Buffer.from(
          '{"cells":[],"cells":[]}',
          "utf8",
        ).toString("base64");
      },
    },
    {
      name: "oversized attachment",
      mutate(record) {
        const maximumBytes = 32 * 1024 * 1024;
        record.entry.results[0].attachments[0].body = "A".repeat(
          Math.ceil((maximumBytes + 1) / 3) * 4,
        );
      },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(firstRecord(report));
      assert.throws(() => validate(report), /dependent-transition.*attachment/i);
    });
  }
});

test("dependent-transition resource policy bounds report files, base64 envelopes, cumulative attachment bytes, and retained receipts before allocation", () => {
  const limits =
    hkVisualizationReleaseGateModule
      .HK_VISUALIZATION_DEPENDENT_TRANSITION_RESOURCE_LIMITS;
  const assertReportStat =
    hkVisualizationReleaseGateModule
      .assertHkVisualizationBoundedJsonReportFileStat;
  const validateEnvelope =
    hkVisualizationReleaseGateModule
      .validateHkVisualizationDependentTransitionAttachmentEnvelope;
  const assertTotals =
    hkVisualizationReleaseGateModule
      .assertHkVisualizationDependentTransitionAttachmentResourceTotals;
  const decodeWithinBudget =
    hkVisualizationReleaseGateModule
      .decodeHkVisualizationDependentTransitionAttachmentWithinResourceBudget;
  assert.equal(typeof limits, "object");
  assert.equal(typeof assertReportStat, "function");
  assert.equal(typeof validateEnvelope, "function");
  assert.equal(typeof assertTotals, "function");
  assert.equal(typeof decodeWithinBudget, "function");
  if (
    !limits ||
    typeof assertReportStat !== "function" ||
    typeof validateEnvelope !== "function" ||
    typeof assertTotals !== "function" ||
    typeof decodeWithinBudget !== "function"
  ) return;
  assert.deepEqual(Object.keys(limits), [
    "annotationUtf8Bytes",
    "attachmentDecodedBytes",
    "attachmentEncodedBytes",
    "cumulativeAttachmentDecodedBytes",
    "cumulativeAttachmentEncodedBytes",
    "jsonReportBytes",
    "jsonReportNonAttachmentBytes",
    "packageCount",
  ]);
  assert.equal(limits.packageCount, 216);
  assert.equal(
    limits.attachmentEncodedBytes,
    Math.ceil(limits.attachmentDecodedBytes / 3) * 4,
  );
  assert.equal(
    limits.cumulativeAttachmentDecodedBytes,
    limits.packageCount * 2 * 1024 * 1024,
  );
  assert.equal(
    limits.cumulativeAttachmentEncodedBytes,
    4 * (
      limits.packageCount +
      Math.floor(
        (limits.cumulativeAttachmentDecodedBytes - limits.packageCount) / 3,
      )
    ),
  );
  assert.equal(
    limits.jsonReportBytes,
    limits.cumulativeAttachmentEncodedBytes +
      limits.jsonReportNonAttachmentBytes,
  );
  assert.ok(limits.jsonReportBytes < 1024 * 1024 * 1024);
  assert.doesNotThrow(() => assertReportStat({
    isFile: () => true,
    size: limits.jsonReportBytes,
  }));
  assert.throws(
    () => assertReportStat({ isFile: () => false, size: 1 }),
    /regular file/i,
  );
  assert.throws(
    () => assertReportStat({
      isFile: () => true,
      size: limits.jsonReportBytes + 1,
    }),
    /report byte limit/i,
  );
  assert.deepEqual(validateEnvelope("YWJj"), {
    decodedBytes: 3,
    encodedBytes: 4,
  });
  assert.throws(() => validateEnvelope("YWJj非"), /ASCII base64/i);
  assert.throws(() => validateEnvelope("Y==="), /ASCII base64/i);
  assert.throws(
    () => validateEnvelope("A".repeat(limits.attachmentEncodedBytes + 4)),
    /encoded byte limit/i,
  );
  assert.doesNotThrow(() => assertTotals({
    attachmentCount: 216,
    decodedBytes: limits.cumulativeAttachmentDecodedBytes,
    encodedBytes: limits.cumulativeAttachmentEncodedBytes,
  }));
  assert.throws(
    () => assertTotals({
      attachmentCount: 216,
      decodedBytes: limits.cumulativeAttachmentDecodedBytes,
      encodedBytes: limits.cumulativeAttachmentEncodedBytes + 4,
    }),
    /cumulative encoded byte limit/i,
  );
  assert.throws(
    () => assertTotals({
      attachmentCount: 216,
      decodedBytes: limits.cumulativeAttachmentDecodedBytes + 1,
      encodedBytes: limits.cumulativeAttachmentEncodedBytes,
    }),
    /cumulative decoded byte limit/i,
  );
  const smallerDecodedBodyBytes = 2 * 1024 * 1024 - 1;
  const largerDecodedBodyBytes = 2 * 1024 * 1024 + 2;
  const smallerEncodedBodyBytes = Math.ceil(smallerDecodedBodyBytes / 3) * 4;
  const largerEncodedBodyBytes = Math.ceil(largerDecodedBodyBytes / 3) * 4;
  const smallerCanonicalBody =
    `${"A".repeat(smallerEncodedBodyBytes - 2)}==`;
  const largerCanonicalBody =
    `${"A".repeat(largerEncodedBodyBytes - 2)}==`;
  let exact216EnvelopeTotals = {
    attachmentCount: 0,
    decodedBytes: 0,
    encodedBytes: 0,
  };
  for (let packageIndex = 0; packageIndex < 216; packageIndex += 1) {
    const envelope = validateEnvelope(
      packageIndex < 144 ? smallerCanonicalBody : largerCanonicalBody,
    );
    exact216EnvelopeTotals = {
      attachmentCount: exact216EnvelopeTotals.attachmentCount + 1,
      decodedBytes: exact216EnvelopeTotals.decodedBytes + envelope.decodedBytes,
      encodedBytes: exact216EnvelopeTotals.encodedBytes + envelope.encodedBytes,
    };
    assert.doesNotThrow(() => assertTotals(exact216EnvelopeTotals));
  }
  assert.deepEqual(exact216EnvelopeTotals, {
    attachmentCount: 216,
    decodedBytes: limits.cumulativeAttachmentDecodedBytes,
    encodedBytes: limits.cumulativeAttachmentEncodedBytes,
  });
  const oneDecodedByteOverBody =
    `${"A".repeat(largerEncodedBodyBytes - 1)}=`;
  const oneDecodedByteOverEnvelope = validateEnvelope(oneDecodedByteOverBody);
  assert.equal(
    oneDecodedByteOverEnvelope.encodedBytes,
    largerEncodedBodyBytes,
  );
  assert.equal(
    oneDecodedByteOverEnvelope.decodedBytes,
    largerDecodedBodyBytes + 1,
  );
  const committedBeforeFinalBody = {
    attachmentCount: 215,
    decodedBytes:
      limits.cumulativeAttachmentDecodedBytes - largerDecodedBodyBytes,
    encodedBytes:
      limits.cumulativeAttachmentEncodedBytes - largerEncodedBodyBytes,
  };
  let decodeCalls = 0;
  const shouldNotDecode = () => {
    decodeCalls += 1;
    return Buffer.from("unexpected decode");
  };
  assert.throws(
    () => decodeWithinBudget(
      oneDecodedByteOverBody,
      committedBeforeFinalBody,
      shouldNotDecode,
    ),
    /cumulative decoded byte limit/i,
  );
  const oneQuartetOverBody =
    `${"A".repeat(largerEncodedBodyBytes + 4 - 2)}==`;
  assert.throws(
    () => decodeWithinBudget(
      oneQuartetOverBody,
      committedBeforeFinalBody,
      shouldNotDecode,
    ),
    /cumulative (?:decoded|encoded) byte limit/i,
  );
  assert.throws(
    () => decodeWithinBudget("YQ==", exact216EnvelopeTotals, shouldNotDecode),
    /resource totals are invalid|cumulative .* byte limit/i,
  );
  assert.equal(
    decodeCalls,
    0,
    "decoded, encoded, and 217th-package overflows must fail before decode",
  );
  assert.throws(
    () => decodeWithinBudget(
      "YWJj",
      {
        attachmentCount: 215,
        decodedBytes: limits.cumulativeAttachmentDecodedBytes,
        encodedBytes: limits.cumulativeAttachmentEncodedBytes,
      },
      shouldNotDecode,
    ),
    /cumulative decoded byte limit/i,
  );
  assert.equal(decodeCalls, 0, "prospective overflow must fail before decode");
  const prepared = decodeWithinBudget(
    "YWJj",
    { attachmentCount: 0, decodedBytes: 0, encodedBytes: 0 },
    (body) => {
      decodeCalls += 1;
      return Buffer.from(body, "base64");
    },
  );
  assert.equal(decodeCalls, 1);
  assert.deepEqual(prepared.envelope, { decodedBytes: 3, encodedBytes: 4 });
  assert.deepEqual(prepared.prospectiveTotals, {
    attachmentCount: 1,
    decodedBytes: 3,
    encodedBytes: 4,
  });

  const runnerSource = readFileSync(
    new URL("./run-hk-visualization-release-gate.mjs", import.meta.url),
    "utf8",
  );
  assert.match(
    runnerSource,
    /readHkVisualizationBoundedJsonReport\(plan\.jsonReport\)/,
  );
  assert.match(
    runnerSource,
    /sourceAttachments\.push\(sourceAttachment\.receipt\)/,
  );
  assert.doesNotMatch(
    runnerSource,
    /sourceAttachments\.push\(sourceAttachment\);/,
  );
});

test("browser pass-through oracle annotation validator binds exact 216 packages, 126 cells, every scroll phase, and three independently hashed layers", () => {
  const report = passingReport();
  const evidence = validateHkVisualizationBrowserPassThroughOracleAnnotations(
    serializedTestsForScrollValidation(report),
  );
  assert.equal(
    evidence.contractVersion,
    HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_RUN_EVIDENCE_VERSION,
  );
  assert.equal(evidence.packageCount, 216);
  assert.equal(
    evidence.cellCount,
    HK_VISUALIZATION_PASS_THROUGH_ORACLE_EXPECTED_CELL_COUNT,
  );
  assert.equal(new Set(evidence.cellIds).size, evidence.cellCount);
  assert.deepEqual(
    evidence.labCellCounts,
    Object.fromEntries(
      HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS.map((labId) => [labId, 18]),
    ),
  );
  assert.ok(evidence.observationCount > evidence.cellCount);
  assert.match(evidence.runAggregateHash, /^[a-f0-9]{64}$/);
});

test("runner uses one bounded canonical plain-object parser for scroll, source-oracle, and Reset annotations", async (t) => {
  const serialized = (report) => serializedTestsForScrollValidation(report);
  const surfaces = [
    {
      name: "scroll",
      records: machineScrollAnnotations,
      validators: [
        (report) => validateHkVisualizationBrowserPassThroughOracleAnnotations(
          serialized(report),
        ),
        (report) => validatePaintedGeometryPairReport(report),
        (report) => validateHkVisualizationBrowserPassThroughResetAnnotations(
          serialized(report),
        ),
      ],
    },
    {
      name: "source-oracle",
      records: machinePassThroughOracleAnnotations,
      validators: [
        (report) => validateHkVisualizationBrowserPassThroughOracleAnnotations(
          serialized(report),
        ),
        (report) => validatePaintedGeometryPairReport(report),
        (report) => validateHkVisualizationBrowserPassThroughResetAnnotations(
          serialized(report),
        ),
      ],
    },
    {
      name: "Reset",
      records: machinePassThroughResetAnnotations,
      validators: [
        (report) => validateHkVisualizationBrowserPassThroughResetAnnotations(
          serialized(report),
        ),
      ],
    },
  ];
  const invalidEncodings = [
    {
      name: "leading whitespace",
      mutate(record) { record.annotation.description = ` ${record.annotation.description}`; },
    },
    {
      name: "final-wins duplicate key",
      mutate(record) {
        const cellCount = JSON.parse(record.annotation.description).cellCount;
        record.annotation.description = record.annotation.description.replace(
          /^\{/u,
          `{"cellCount":${cellCount + 1},`,
        );
      },
    },
    {
      name: "negative zero",
      select(records, surfaceName) {
        return surfaceName === "scroll"
          ? records[0]
          : records.find(({ annotation }) =>
            JSON.parse(annotation.description).passThroughCellCount === 0
          );
      },
      mutate(record, surfaceName) {
        const before = record.annotation.description;
        record.annotation.description = surfaceName === "scroll"
          ? before.replace(/:0(?=[,}])/u, ":-0")
          : before.replace(
            '"passThroughCellCount":0',
            '"passThroughCellCount":-0',
          );
        assert.notEqual(record.annotation.description, before);
      },
    },
    {
      name: "non-string description",
      mutate(record) {
        record.annotation.description = JSON.parse(record.annotation.description);
      },
    },
    {
      name: "non-object root",
      mutate(record) { record.annotation.description = "[]"; },
    },
    {
      name: "over-cap UTF-8 bytes",
      mutate(record) {
        record.annotation.description =
          `${record.annotation.description}${" ".repeat(1_048_577)}`;
      },
    },
  ];
  for (const surface of surfaces) {
    for (const invalid of invalidEncodings) {
      await t.test(`${surface.name}: ${invalid.name}`, () => {
        const report = passingReport();
        const records = surface.records(report);
        const record = invalid.select?.(records, surface.name) ?? records[0];
        assert.ok(record);
        invalid.mutate(record, surface.name);
        const rejected = surface.validators.map((validate) => {
          try {
            validate(report);
            return false;
          } catch {
            return true;
          }
        });
        assert.deepEqual(
          rejected,
          surface.validators.map(() => true),
          `${surface.name}/${invalid.name}`,
        );
      });
    }
  }
});

test("native painted-geometry pair runner exposes the separate v1 authority and freezes its source chain", () => {
  assert.equal(
    hkVisualizationReleaseGateModule
      .HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
    "hk-viz-browser-pass-through-painted-geometry-pair-aggregate-v1",
  );
  assert.equal(
    hkVisualizationReleaseGateModule
      .HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_ANNOTATION_TYPE,
    "hk-viz-pass-through-painted-geometry-pair-aggregate",
  );
  assert.equal(
    hkVisualizationReleaseGateModule
      .HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_RUN_EVIDENCE_VERSION,
    "hk-viz-browser-pass-through-painted-geometry-pair-run-evidence-v1",
  );
  assert.equal(
    typeof hkVisualizationReleaseGateModule
      .validateHkVisualizationBrowserPassThroughPaintedGeometryPairAnnotations,
    "function",
  );
  for (const sourcePath of [
    "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.mjs",
    "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.test.mjs",
  ]) {
    assert.ok(HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS.includes(sourcePath));
  }
  for (const obsoleteSourcePath of [
    "tests/e2e/hk-visualization-pass-through-cross-state-oracle.mjs",
    "tests/e2e/hk-visualization-pass-through-cross-state-oracle.test.mjs",
  ]) {
    assert.equal(existsSync(obsoleteSourcePath), false, obsoleteSourcePath);
    assert.equal(
      HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS.includes(obsoleteSourcePath),
      false,
      obsoleteSourcePath,
    );
  }
  const runnerSource = readFileSync(
    "tests/e2e/run-hk-visualization-release-gate.mjs",
    "utf8",
  );
  assert.match(
    runnerSource,
    /import\s*\{[\s\S]{0,600}auditHkVisualizationPassThroughCrossStatePaintedGeometryPair[\s\S]{0,600}\}\s*from\s*"\.\/hk-visualization-pass-through-painted-geometry-pair-oracle\.mjs"/u,
  );
  assert.match(
    runnerSource,
    /function validateBrowserPassThroughPaintedGeometryPairPackageAggregate[\s\S]{0,30000}auditHkVisualizationPassThroughCrossStatePaintedGeometryPair\(/u,
  );
  assert.equal(HK_VISUALIZATION_RELEASE_WORKLOAD_TIMEOUT_MS, 175_760_000);
});

const exactPaintedPairResetChronology = Object.freeze({
  afterIndex: 1,
  beforeIndex: 0,
  label: "S1/statistics-s1/desktop/en/light",
  phases: Object.freeze([
    "range-state:fixture:hk-state:0-0",
    "range-state:painted-pair:hk-state:0-0",
    "range-state:reset:hk-state:00000",
    "reset-space",
    "reset-space-idempotent",
  ]),
});

test("native painted-geometry chronology resolves the exact Reset trio after both pair endpoints", () => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationPassThroughPaintedGeometryResetChronology;
  assert.equal(typeof validate, "function");
  assert.deepEqual(validate(exactPaintedPairResetChronology), {
    afterIndex: 1,
    beforeIndex: 0,
    enterIndex: 2,
    noopIndex: 4,
    spaceIndex: 3,
  });
});

for (const invalid of [
  {
    name: "pair occurring after Reset",
    input: {
      ...exactPaintedPairResetChronology,
      afterIndex: 4,
      beforeIndex: 3,
    },
  },
  {
    name: "missing Enter Reset phase",
    input: {
      ...exactPaintedPairResetChronology,
      phases: exactPaintedPairResetChronology.phases.slice(0, 2).concat(
        exactPaintedPairResetChronology.phases.slice(3),
      ),
    },
  },
  {
    name: "reordered Reset trio",
    input: {
      ...exactPaintedPairResetChronology,
      phases: [
        ...exactPaintedPairResetChronology.phases.slice(0, 2),
        "reset-space",
        "range-state:reset:hk-state:00000",
        "reset-space-idempotent",
      ],
    },
  },
]) {
  test(`native painted-geometry chronology rejects ${invalid.name}`, () => {
    const validate = hkVisualizationReleaseGateModule
      .validateHkVisualizationPassThroughPaintedGeometryResetChronology;
    assert.equal(typeof validate, "function");
    assert.throws(
      () => validate(invalid.input),
      /painted-geometry.*Reset|Reset.*chronology|Reset.*phase|ordered Reset/iu,
    );
  });
}

function validatePaintedGeometryPairReport(
  report,
  releaseSourceReceipt = paintedGeometryValidatedSourceReceiptFixture(),
) {
  const expectedPathManifest =
    report.config.metadata.hkVisualizationStarshipPathManifest;
  const expectedWorkspace = dirname(dirname(report.config.rootDir));
  return hkVisualizationReleaseGateModule
    .validateHkVisualizationBrowserPassThroughPaintedGeometryPairAnnotations(
      serializedTestsForScrollValidation(report),
      { expectedPathManifest, expectedWorkspace, releaseSourceReceipt },
    );
}

test("native painted-geometry pair runner accepts product-order exact endpoints and binds exact 216 packages, 918 cells, 54 pairs, 108 endpoints, 162 layers, and 324 layer endpoints", () => {
  const evidence = validatePaintedGeometryPairReport(passingReport());
  assert.equal(
    evidence.contractVersion,
    "hk-viz-browser-pass-through-painted-geometry-pair-run-evidence-v1",
  );
  assert.equal(evidence.packageCount, 216);
  assert.equal(evidence.cellCount, 918);
  assert.equal(evidence.pairCount, 54);
  assert.equal(evidence.endpointCount, 108);
  assert.equal(evidence.layerReceiptCount, 162);
  assert.equal(evidence.layerEndpointHashCount, 324);
  assert.deepEqual(evidence.labIds, paintedGeometryPairLabIds);
  assert.deepEqual(evidence.labCellCounts, {
    "advanced-functions": 18,
    "data-handling": 18,
    "statistics-s1": 18,
  });
  assert.equal(evidence.oracleVersion, paintedGeometryPairOracleVersion);
  assert.equal(evidence.oraclePlanHash, paintedGeometryPairOraclePlanHash);
  assert.match(evidence.oracleSourceSha256, /^[a-f0-9]{64}$/u);
  assert.match(evidence.oracleTestSourceSha256, /^[a-f0-9]{64}$/u);
  assert.match(evidence.runAggregateHash, /^[a-f0-9]{64}$/u);
});

test("native painted-geometry pair parser fails closed on annotation cardinality, canonical bytes, resource cap, order, and compact schema drift", async (t) => {
  const cases = [
    {
      name: "missing annotation",
      mutate(report) {
        const { annotation, entry } =
          machinePassThroughPaintedGeometryPairAnnotations(report)[0];
        entry.annotations.splice(entry.annotations.indexOf(annotation), 1);
      },
      pattern: /exactly one.*annotation; observed 0/iu,
    },
    {
      name: "duplicate annotation",
      mutate(report) {
        const { annotation, entry } =
          machinePassThroughPaintedGeometryPairAnnotations(report)[0];
        entry.annotations.push(structuredClone(annotation));
      },
      pattern: /exactly one.*annotation; observed 2/iu,
    },
    {
      name: "noncanonical pretty JSON bytes",
      mutate(report) {
        const { annotation } =
          machinePassThroughPaintedGeometryPairAnnotations(report)[0];
        annotation.description = JSON.stringify(
          JSON.parse(annotation.description),
          null,
          2,
        );
      },
      pattern: /canonical|minified/iu,
    },
    {
      name: "UTF-8 resource cap",
      mutate(report) {
        const { annotation } =
          machinePassThroughPaintedGeometryPairAnnotations(report)[0];
        annotation.description = ` ${annotation.description}${" ".repeat(1_100_000)}`;
      },
      pattern: /resource|byte|cap|large/iu,
    },
    {
      name: "reordered package annotation",
      mutate(report) {
        const records = machinePassThroughPaintedGeometryPairAnnotations(report);
        const left = records[0].annotation.description;
        records[0].annotation.description = records[1].annotation.description;
        records[1].annotation.description = left;
      },
      pattern: /order|scroll|package|cell/iu,
    },
    {
      name: "extra aggregate key",
      mutate(report) {
        const { annotation } =
          machinePassThroughPaintedGeometryPairAnnotations(report)[0];
        const aggregate = JSON.parse(annotation.description);
        aggregate.unexpected = true;
        annotation.description = JSON.stringify(aggregate);
      },
      pattern: /exact|schema|keys/iu,
    },
    {
      name: "duplicate layer",
      mutate(report) {
        const record = machinePassThroughPaintedGeometryPairAnnotations(report)
          .find(({ annotation }) =>
            JSON.parse(annotation.description).pairCount > 0);
        const aggregate = JSON.parse(record.annotation.description);
        const pair = aggregate.cells.find((cell) => cell.pair).pair;
        pair.layerPairs[1] = structuredClone(pair.layerPairs[0]);
        rehashPaintedGeometryPairAggregateFixture(aggregate);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /layer|ordered|public.*raw.*visible/iu,
    },
    {
      name: "wrong zero-applicable contract",
      mutate(report) {
        const record = machinePassThroughPaintedGeometryPairAnnotations(report)
          .find(({ annotation }) =>
            JSON.parse(annotation.description).pairCount === 0);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].kind = "applicable";
        rehashPaintedGeometryPairAggregateFixture(aggregate);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /not-applicable|zero topology|kind drift/iu,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(report);
      assert.throws(
        () => validatePaintedGeometryPairReport(report),
        invalid.pattern,
      );
    });
  }
});

test("native painted-geometry pair runner binds actual oracle source SHA receipts and run hash", () => {
  const report = passingReport();
  const receipt = paintedGeometryValidatedSourceReceiptFixture();
  const evidence = validatePaintedGeometryPairReport(report, receipt);
  const oraclePath =
    "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.mjs";
  const oracleTestPath =
    "tests/e2e/hk-visualization-pass-through-painted-geometry-pair-oracle.test.mjs";
  assert.equal(
    evidence.oracleSourceSha256,
    receipt.before.entries.find(({ path }) => path === oraclePath).sha256,
  );
  assert.equal(
    evidence.oracleTestSourceSha256,
    receipt.before.entries.find(({ path }) => path === oracleTestPath).sha256,
  );
  for (const drift of ["before", "after"]) {
    const invalid = structuredClone(receipt);
    invalid[drift].entries.find(({ path }) => path === oraclePath).sha256 =
      sha256(`source-drift-${drift}`);
    assert.throws(
      () => validatePaintedGeometryPairReport(report, invalid),
      /source|receipt|SHA|drift/iu,
    );
  }
});

test("native painted-geometry runner independently resolves one exact before and after from every range observation", async (t) => {
  for (const duplicate of ["duplicate-before", "duplicate-after"]) {
    await t.test(`fully rehashed unreferenced ${duplicate}`, () => {
      const report = passingReport();
      mutateFullyRehashedUnreferencedPaintedGeometryState(report, {
        stateKind: duplicate,
      });
      assert.doesNotThrow(() =>
        validateHkVisualizationBrowserPassThroughOracleAnnotations(
          serializedTestsForScrollValidation(report),
        ));
      assert.throws(
        () => validatePaintedGeometryPairReport(report),
        /exactly one|unique|before|after|painted-geometry/iu,
      );
    });
  }
  for (const interloper of ["extra-key-before", "epsilon-near-before"]) {
    await t.test(`fully rehashed ${interloper} does not poison exact selection`, () => {
      const report = passingReport();
      mutateFullyRehashedUnreferencedPaintedGeometryState(report, {
        stateKind: interloper,
      });
      assert.doesNotThrow(() =>
        validateHkVisualizationBrowserPassThroughOracleAnnotations(
          serializedTestsForScrollValidation(report),
        ));
      const evidence = validatePaintedGeometryPairReport(report);
      assert.equal(evidence.pairCount, 54);
    });
  }
});

test("fully rehashed referenced raw key reordering is accepted by the producer seam and rejected by pair order authority", async (t) => {
  const cases = [
    {
      name: "top-level keys",
      mutate(observation) {
        const raw = observation.rawRendererState;
        raw.serializedState = JSON.stringify(Object.fromEntries(
          Object.entries(JSON.parse(raw.serializedState)).reverse(),
        ));
      },
    },
    {
      name: "nested metrics keys",
      mutate(observation) {
        const raw = observation.rawRendererState;
        const parsed = JSON.parse(raw.serializedState);
        parsed.metrics = Object.fromEntries(
          Object.entries(parsed.metrics).reverse(),
        );
        raw.serializedState = JSON.stringify(parsed);
      },
    },
    {
      name: "distribution named-point keys",
      mutate(observation) {
        const raw = observation.rawRendererState;
        const parsed = JSON.parse(raw.serializedState);
        parsed.points = Object.fromEntries(
          Object.entries(parsed.points).reverse(),
        );
        raw.serializedState = JSON.stringify(parsed);
      },
    },
    {
      name: "distribution center point x-y keys",
      mutate(observation) {
        const raw = observation.rawRendererState;
        const parsed = JSON.parse(raw.serializedState);
        parsed.points.center = {
          y: parsed.points.center.y,
          x: parsed.points.center.x,
        };
        raw.serializedState = JSON.stringify(parsed);
      },
    },
    {
      name: "distribution series point x-y keys",
      mutate(observation) {
        const raw = observation.rawRendererState;
        const parsed = JSON.parse(raw.serializedState);
        parsed.series[0] = {
          y: parsed.series[0].y,
          x: parsed.series[0].x,
        };
        raw.serializedState = JSON.stringify(parsed);
      },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      mutateFullyRehashedPaintedGeometryEndpoint(report, {
        mutate: invalid.mutate,
      });
      const rejected = [
        () => validateHkVisualizationBrowserPassThroughOracleAnnotations(
          serializedTestsForScrollValidation(report),
        ),
        () => validatePaintedGeometryPairReport(report),
      ].map((validate) => {
        try {
          validate();
          return false;
        } catch {
          return true;
        }
      });
      assert.deepEqual(rejected, [false, true], invalid.name);
    });
  }
});

test("fully rehashed non-pair Reset raw bytes are rejected across general, pair, and Reset validators", async (t) => {
  const cases = [
    {
      name: "final-wins duplicate key",
      mutate(serializedState) {
        return serializedState.replace(/^\{/u, '{"labId":"decoy",');
      },
    },
    {
      name: "leading whitespace",
      mutate(serializedState) { return ` ${serializedState}`; },
    },
    {
      name: "negative zero",
      mutate(serializedState) {
        return serializedState.replace(/\}$/u, ',"zero":-0}');
      },
    },
    {
      name: "non-object root",
      mutate() { return "[]"; },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      mutateFullyRehashedNonPairResetRawState(report, invalid.mutate);
      const rejected = [
        () => validateHkVisualizationBrowserPassThroughOracleAnnotations(
          serializedTestsForScrollValidation(report),
        ),
        () => validatePaintedGeometryPairReport(report),
        () => validateHkVisualizationBrowserPassThroughResetAnnotations(
          serializedTestsForScrollValidation(report),
        ),
      ].map((validate) => {
        try {
          validate();
          return false;
        } catch {
          return true;
        }
      });
      assert.deepEqual(rejected, [true, true, true], invalid.name);
    });
  }
});

test("native painted-geometry pair reruns the shared oracle after every nested hash is recomputed", async (t) => {
  const semanticCases = [
    {
      name: "wrong-but-different painted curve",
      mutate(observation) {
        observation.visibleGeometry.visibleMathMarks[
          "distribution summary curve"
        ][0].attributes.d = "M 100 100 L 120 120";
      },
    },
    {
      name: "wrong endpoint state",
      mutate(observation) {
        observation.publicState.state.spread = 3;
      },
    },
    {
      name: "formula drift",
      mutate(observation) {
        observation.visibleGeometry.formulaText = "center μ=0 · spread=3";
      },
    },
    {
      name: "readout drift",
      mutate(observation) {
        observation.visibleGeometry.visibleMathMarks[
          "distribution summary readout"
        ][0].text = "wrong readout";
      },
    },
    {
      name: "token drift",
      mutate(observation) {
        observation.visibleGeometry.visibleMathMarks[
          "distribution summary readout"
        ][0].attributes["data-viz-token-spread"] = "3";
      },
    },
    {
      name: "viewport drift",
      mutate(observation) {
        observation.visibleGeometry.visibleMathMarks[
          "semantic fixed viewport"
        ][0].attributes["data-viz-viewport-id"] = "wrong-viewport";
      },
    },
    {
      name: "tick drift",
      mutate(observation) {
        observation.visibleGeometry.visibleMathMarks[
          "semantic x tick"
        ][0].attributes["data-viz-tick-value"] = "-9";
      },
    },
    {
      name: "nonfinite mapped point",
      mutate(observation) {
        observation.visibleGeometry.visibleMathMarks[
          "distribution left spread marker"
        ][0].attributes.cx = "Infinity";
      },
    },
    ...[
      ["0x5c", "hexadecimal SVG geometry literal with full rehash"],
      ["0b1011100", "binary SVG geometry literal with full rehash"],
      ["0o134", "octal SVG geometry literal with full rehash"],
      [" 92", "whitespace-padded SVG geometry literal with full rehash"],
    ].map(([value, name]) => ({
      name,
      mutate(observation) {
        observation.visibleGeometry.visibleMathMarks[
          "semantic fixed viewport"
        ][0].attributes.x = value;
      },
    })),
    {
      name: "out-of-frame mapped point",
      mutate(observation) {
        observation.visibleGeometry.visibleMathMarks[
          "distribution left spread marker"
        ][0].attributes.cx = "9999";
      },
    },
    {
      name: "public logical epsilon drift with full rehash",
      mutate(observation) {
        observation.publicState.state.mean = 1e-10;
      },
    },
    {
      name: "public state missing exact key with full rehash",
      mutate(observation) {
        delete observation.publicState.state.model;
      },
    },
    {
      name: "public state extra exact key with full rehash",
      mutate(observation) {
        observation.publicState.state.decoy = true;
      },
    },
    {
      name: "raw unknown top-level key with full rehash",
      mutate(observation) {
        const raw = JSON.parse(
          observation.rawRendererState.serializedState,
        );
        raw.decoy = true;
        observation.rawRendererState.serializedState = canonicalFixtureJson(raw);
      },
    },
    {
      generalRejects: true,
      name: "raw duplicate-key JSON with exact final value and full rehash",
      mutate(observation) {
        const raw = observation.rawRendererState;
        raw.serializedState = raw.serializedState.replace(
          /^\{/u,
          '{"check":"decoy",',
        );
      },
    },
    {
      name: "raw semantic family drift with full rehash",
      mutate(observation) {
        const raw = JSON.parse(
          observation.rawRendererState.serializedState,
        );
        raw.family = "function-properties";
        observation.rawRendererState.serializedState = JSON.stringify(raw);
      },
    },
    {
      name: "visible math group order drift with full rehash",
      mutate(observation) {
        const visible = observation.visibleGeometry;
        visible.visibleMathMarks = Object.fromEntries(
          Object.entries(visible.visibleMathMarks).reverse(),
        );
      },
    },
    {
      name: "visible named-mark decoy with full rehash",
      mutate(observation) {
        observation.visibleGeometry.visibleNamedMarks.push("decoy");
      },
    },
    {
      name: "localized formula label text decoy with full rehash",
      mutate(observation) {
        const formula = observation.visibleGeometry.visibleMathMarks[
          "semantic formula"
        ][0];
        formula.text = `decoy ${formula.text}`;
      },
    },
    {
      name: "distribution marker radius drift with full rehash",
      mutate(observation) {
        observation.visibleGeometry.visibleMathMarks[
          "distribution left spread marker"
        ][0].attributes.r = "5";
      },
    },
  ];
  for (const invalid of semanticCases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      mutateFullyRehashedPaintedGeometryEndpoint(report, {
        mutate: invalid.mutate,
      });
      const validateGeneral = () =>
        validateHkVisualizationBrowserPassThroughOracleAnnotations(
          serializedTestsForScrollValidation(report),
        );
      if (invalid.generalRejects) {
        assert.throws(validateGeneral, /rawRendererState|canonical|serialized/iu);
      } else {
        assert.doesNotThrow(validateGeneral);
      }
      assert.throws(
        () => validatePaintedGeometryPairReport(report),
        /shared oracle|painted.geometry|geometry pair|rawRendererState|canonical/iu,
      );
    });
  }
});

test("native painted-geometry pair runner rejects wrong cell identity and unchanged endpoints after full pair rehash", async (t) => {
  await t.test("wrong cell/lab/locale/theme/viewport identity", () => {
    const report = passingReport();
    const record = machinePassThroughPaintedGeometryPairAnnotations(report)
      .find(({ annotation }) => JSON.parse(annotation.description).pairCount > 0);
    const aggregate = JSON.parse(record.annotation.description);
    const cell = aggregate.cells.find((candidate) => candidate.pair);
    cell.pair.cellId = cell.pair.cellId.replace("/desktop/", "/mobile/");
    cell.pair.labId = "data-handling";
    rehashPaintedGeometryPairAggregateFixture(aggregate);
    record.annotation.description = JSON.stringify(aggregate);
    assert.throws(
      () => validatePaintedGeometryPairReport(report),
      /cell|lab|locale|theme|viewport|identity|cross/iu,
    );
  });
  await t.test("unchanged public/raw/visible endpoints", () => {
    const report = passingReport();
    const oracleRecords = machinePassThroughOracleAnnotations(report);
    const pairRecords = machinePassThroughPaintedGeometryPairAnnotations(report);
    const recordIndex = pairRecords.findIndex(({ annotation }) =>
      JSON.parse(annotation.description).pairCount > 0);
    const oracleAggregate = JSON.parse(
      oracleRecords[recordIndex].annotation.description,
    );
    const pairAggregate = JSON.parse(
      pairRecords[recordIndex].annotation.description,
    );
    const pairCell = pairAggregate.cells.find((cell) => cell.pair);
    const oracleCell = oracleAggregate.cells.find(
      (cell) => cell.cellId === pairCell.cellId,
    );
    const before = oracleCell.observations[pairCell.pair.beforeRef.observationIndex];
    oracleCell.observations[pairCell.pair.afterRef.observationIndex] =
      structuredClone(before);
    oracleCell.observations[pairCell.pair.afterRef.observationIndex].phase =
      pairCell.pair.afterRef.phase;
    rehashPassThroughOracleAggregateFixture(oracleAggregate);
    const after = oracleCell.observations[pairCell.pair.afterRef.observationIndex];
    pairCell.pair.afterRef.observationHash = after.observationHash;
    for (const layerPair of pairCell.pair.layerPairs) {
      layerPair.afterHash = layerPair.beforeHash;
    }
    pairAggregate.oraclePackageAggregateHash = oracleAggregate.aggregateHash;
    rehashPaintedGeometryPairAggregateFixture(pairAggregate);
    oracleRecords[recordIndex].annotation.description =
      JSON.stringify(oracleAggregate);
    pairRecords[recordIndex].annotation.description =
      JSON.stringify(pairAggregate);
    assert.doesNotThrow(() =>
      validateHkVisualizationBrowserPassThroughOracleAnnotations(
        serializedTestsForScrollValidation(report),
      ));
    assert.throws(
      () => validatePaintedGeometryPairReport(report),
      /unchanged|before|after|shared oracle|painted.geometry/iu,
    );
  });
});

test("browser pass-through Reset v3 validator binds exact 7 topics, 126 cells, 378 actions, 1134 pairs, and 2268 endpoints", () => {
  const evidence = validateHkVisualizationBrowserPassThroughResetAnnotations(
    serializedTestsForScrollValidation(passingReport()),
  );
  assert.equal(
    evidence.contractVersion,
    HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_RUN_EVIDENCE_VERSION,
  );
  assert.equal(evidence.packageCount, 216);
  assert.equal(evidence.cellCount, 126);
  assert.equal(new Set(evidence.cellIds).size, 126);
  assert.deepEqual(evidence.labIds, HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS);
  assert.deepEqual(
    evidence.labCellCounts,
    Object.fromEntries(
      HK_VISUALIZATION_PASS_THROUGH_ORACLE_LAB_IDS.map((labId) => [labId, 18]),
    ),
  );
  assert.equal(
    evidence.observationCount,
    HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_OBSERVATION_COUNT,
  );
  assert.equal(
    evidence.restoringActionCount,
    HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_RESTORING_ACTION_COUNT,
  );
  assert.equal(
    evidence.canonicalNoopActionCount,
    HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_CANONICAL_NOOP_ACTION_COUNT,
  );
  assert.equal(
    evidence.layerReceiptCount,
    HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_LAYER_RECEIPT_COUNT,
  );
  assert.equal(
    evidence.layerEndpointHashCount,
    hkVisualizationReleaseGateModule
      .HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_LAYER_ENDPOINT_HASH_COUNT,
  );
  assert.equal(
    evidence.layerEndpointHashCount,
    2268,
  );
  assert.match(evidence.runAggregateHash, /^[a-f0-9]{64}$/);
});

test("browser pass-through Reset v3 runner rejects fully rehashed restoring raw endpoint equality", () => {
  assert.throws(
    () => validateHkVisualizationBrowserPassThroughResetAnnotations(
      serializedTestsForScrollValidation(
        fullyRehashedRestoringLayerEqualityReport("raw"),
      ),
    ),
    /restoring raw endpoint did not change/i,
  );
});

test("browser pass-through Reset v3 runner rejects fully rehashed restoring visible endpoint equality", () => {
  assert.throws(
    () => validateHkVisualizationBrowserPassThroughResetAnnotations(
      serializedTestsForScrollValidation(
        fullyRehashedRestoringLayerEqualityReport("visible"),
      ),
    ),
    /restoring visible endpoint did not change/i,
  );
});

test("browser pass-through Reset v3 validator rejects self-consistent after endpoint drift from same-phase oracle", () => {
  const report = passingReport();
  const resetRecords = machinePassThroughResetAnnotations(report);
  const recordIndex = resetRecords.findIndex(
    ({ annotation }) =>
      JSON.parse(annotation.description).passThroughCellCount > 0,
  );
  assert.notEqual(recordIndex, -1);
  const oracleRecord = machinePassThroughOracleAnnotations(report)[recordIndex];
  const resetRecord = resetRecords[recordIndex];
  const oracleAggregate = JSON.parse(oracleRecord.annotation.description);
  const resetAggregate = JSON.parse(resetRecord.annotation.description);
  const oracleCell = oracleAggregate.cells.find(
    ({ kind }) => kind === "pass-through",
  );
  const resetCell = resetAggregate.cells.find(
    ({ kind }) => kind === "pass-through",
  );
  const resetObservation = resetCell.observations[0];
  const oracleObservation = oracleCell.observations.find(
    ({ phase }) => phase === resetObservation.phase,
  );
  oracleObservation.publicState.state.comparison += 1;
  rehashPassThroughOracleAggregateFixture(oracleAggregate);
  rehashPassThroughResetAggregateFixture(resetAggregate, oracleAggregate);
  oracleRecord.annotation.description = JSON.stringify(oracleAggregate);
  resetRecord.annotation.description = JSON.stringify(resetAggregate);
  assert.throws(
    () => validateHkVisualizationBrowserPassThroughResetAnnotations(
      serializedTestsForScrollValidation(report),
    ),
    /after endpoint.*same-phase oracle|public Reset tuple.*afterState/i,
  );
});

test("browser pass-through Reset v3 validator rejects endpoint, fingerprint, pair, order, tuple, cell, topic, and aggregate mutations", async (t) => {
  const passThroughRecord = (report) =>
    machinePassThroughResetAnnotations(report).find(
      ({ annotation }) =>
        JSON.parse(annotation.description).passThroughCellCount > 0,
    );
  const mutateRecord = (report, mutation) => {
    const record = passThroughRecord(report);
    const aggregate = JSON.parse(record.annotation.description);
    const cell = aggregate.cells.find(({ kind }) => kind === "pass-through");
    mutation({ aggregate, cell, record });
    record.annotation.description = JSON.stringify(aggregate);
  };
  const cases = [
    {
      name: "missing annotation",
      mutate(report) {
        const { entry } = machinePassThroughResetAnnotations(report)[0];
        entry.annotations = entry.annotations.filter(
          ({ type }) =>
            type !== HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_ANNOTATION_TYPE,
        );
      },
      pattern: /exactly one.*annotation; observed 0/,
    },
    {
      name: "action order",
      mutate: (report) => mutateRecord(report, ({ cell }) =>
        cell.observations.reverse()),
      pattern: /action.*order|actionIndex|identity/,
    },
    {
      name: "phase",
      mutate: (report) => mutateRecord(report, ({ cell }) =>
        (cell.observations[1].phase = "reset-space-idempotent")),
      pattern: /phase|action.*identity/,
    },
    {
      name: "tuple",
      mutate: (report) => mutateRecord(report, ({ cell }) =>
        (cell.observations[0].afterState.height = 2)),
      pattern: /tuple|afterState|expected/,
    },
    {
      name: "pair hash",
      mutate: (report) => mutateRecord(report, ({ cell }) =>
        (cell.observations[0].layerPairs[2].pairHash = sha256("wrong-pair"))),
      pattern: /pairHash|pair hash/i,
    },
    {
      name: "duplicate cell",
      mutate(report) {
        const records = machinePassThroughResetAnnotations(report).filter(
          ({ annotation }) => JSON.parse(annotation.description).passThroughCellCount > 0,
        );
        const first = JSON.parse(records[0].annotation.description);
        const second = JSON.parse(records[1].annotation.description);
        second.cells.find(({ kind }) => kind === "pass-through").cellId =
          first.cells.find(({ kind }) => kind === "pass-through").cellId;
        records[1].annotation.description = JSON.stringify(second);
      },
      pattern: /cell.*order|cellId|unique|matrix/,
    },
    {
      name: "topic",
      mutate: (report) => mutateRecord(report, ({ cell }) =>
        (cell.labId = "calculus")),
      pattern: /lab|topic|identity/,
    },
    {
      name: "aggregate",
      mutate: (report) => mutateRecord(report, ({ aggregate }) =>
        (aggregate.aggregateHash = sha256("wrong-aggregate"))),
      pattern: /aggregateHash|aggregate hash/,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(report);
      assert.throws(
        () => validateHkVisualizationBrowserPassThroughResetAnnotations(
          serializedTestsForScrollValidation(report),
        ),
        invalid.pattern,
      );
    });
  }
});

test("release report requires complete, valid pass-through Reset v3 annotations and exposes endpoint counts", async (t) => {
  await t.test("missing Reset annotation", () => {
    const report = passingReport();
    const { entry } = machinePassThroughResetAnnotations(report)[0];
    entry.annotations = entry.annotations.filter(
      ({ type }) =>
        type !== HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_ANNOTATION_TYPE,
    );
    assert.throws(
      () => validateReport(report),
      /browser-pass-through-reset-evidence=.*exactly one.*annotation; observed 0/,
    );
  });
  await t.test("corrupt Reset annotation", () => {
    const report = passingReport();
    const record = machinePassThroughResetAnnotations(report).find(
      ({ annotation }) =>
        JSON.parse(annotation.description).passThroughCellCount > 0,
    );
    const aggregate = JSON.parse(record.annotation.description);
    aggregate.aggregateHash = sha256("corrupt-reset-report-aggregate");
    record.annotation.description = JSON.stringify(aggregate);
    assert.throws(
      () => validateReport(report),
      /browser-pass-through-reset-evidence=.*Reset\.aggregateHash drifted/,
    );
  });
  const evidence = validateReport(passingReport()).passThroughResetEvidence;
  assert.equal(
    evidence.contractVersion,
    HK_VISUALIZATION_BROWSER_PASS_THROUGH_RESET_RUN_EVIDENCE_VERSION,
  );
  assert.equal(
    evidence.layerReceiptCount,
    HK_VISUALIZATION_PASS_THROUGH_RESET_EXPECTED_LAYER_RECEIPT_COUNT,
  );
  assert.equal(evidence.layerEndpointHashCount, 2268);
});

test("browser P6 averages annotation validator binds exact 216 packages, 18 P6 cells, and zero then positive visible datasets", () => {
  const evidence = validateHkVisualizationBrowserP6AveragesAnnotations(
    serializedTestsForScrollValidation(passingReport()),
  );
  assert.equal(
    evidence.contractVersion,
    HK_VISUALIZATION_BROWSER_P6_AVERAGES_RUN_EVIDENCE_VERSION,
  );
  assert.equal(evidence.packageCount, 216);
  assert.equal(evidence.cellCount, HK_VISUALIZATION_P6_AVERAGES_EXPECTED_CELL_COUNT);
  assert.equal(evidence.boundaryObservationCount, 36);
  assert.equal(new Set(evidence.cellIds).size, 18);
  assert.ok(evidence.cellIds.every((cellId) =>
    cellId.startsWith(`P6/${HK_VISUALIZATION_P6_AVERAGES_LAB_ID}/`),
  ));
  assert.match(evidence.runAggregateHash, /^[a-f0-9]{64}$/);
});

test("browser P6 budget annotation validator binds exact 216 packages, 18 P6 cells, and nine raw+parsed+visible semantic boundaries per cell", () => {
  const evidence = validateHkVisualizationBrowserP6BudgetAnnotations(
    serializedTestsForScrollValidation(passingReport()),
  );
  assert.equal(
    evidence.contractVersion,
    HK_VISUALIZATION_BROWSER_P6_BUDGET_RUN_EVIDENCE_VERSION,
  );
  assert.equal(evidence.packageCount, 216);
  assert.equal(evidence.cellCount, HK_VISUALIZATION_P6_BUDGET_EXPECTED_CELL_COUNT);
  assert.equal(evidence.boundaryObservationCount, 18 * 9);
  assert.equal(new Set(evidence.cellIds).size, 18);
  assert.ok(evidence.cellIds.every((cellId) =>
    cellId.startsWith(`P6/${HK_VISUALIZATION_P6_BUDGET_LAB_ID}/`),
  ));
  assert.match(evidence.runAggregateHash, /^[a-f0-9]{64}$/);
});

test("browser pass-through oracle annotation validator rejects missing, duplicate, phase, lab, public, raw, visible, and aggregate drift", async (t) => {
  const cases = [
    {
      name: "missing annotation",
      mutate(report) {
        const { entry } = machinePassThroughOracleAnnotations(report)[0];
        entry.annotations = entry.annotations.filter(
          ({ type }) =>
            type !==
            HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_ANNOTATION_TYPE,
        );
      },
      pattern: /exactly one.*annotation; observed 0/,
    },
    {
      name: "duplicate annotation",
      mutate(report) {
        const { annotation, entry } =
          machinePassThroughOracleAnnotations(report)[0];
        entry.annotations.push(structuredClone(annotation));
      },
      pattern: /exactly one.*annotation; observed 2/,
    },
    {
      name: "missing phase",
      mutate(report) {
        const record = machinePassThroughOracleAnnotations(report).find(
          ({ annotation }) =>
            JSON.parse(annotation.description).passThroughCellCount > 0,
        );
        const aggregate = JSON.parse(record.annotation.description);
        const cell = aggregate.cells.find(({ kind }) => kind === "pass-through");
        cell.phases.pop();
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /phase\/hash\/observation counts drifted/,
    },
    {
      name: "lab mismatch",
      mutate(report) {
        const record = machinePassThroughOracleAnnotations(report).find(
          ({ annotation }) =>
            JSON.parse(annotation.description).passThroughCellCount > 0,
        );
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells.find(({ kind }) => kind === "pass-through").labId =
          "calculus";
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /lab identity mismatched|oracle kind mismatched/,
    },
    {
      name: "public hash",
      mutate(report) {
        const record = machinePassThroughOracleAnnotations(report).find(
          ({ annotation }) =>
            JSON.parse(annotation.description).passThroughCellCount > 0,
        );
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells
          .find(({ kind }) => kind === "pass-through")
          .observations[0].publicStateHash = sha256("drift-public");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /publicStateHash drifted/,
    },
    {
      name: "raw selector",
      mutate(report) {
        const record = machinePassThroughOracleAnnotations(report).find(
          ({ annotation }) =>
            JSON.parse(annotation.description).passThroughCellCount > 0,
        );
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells
          .find(({ kind }) => kind === "pass-through")
          .observations[0].rawRendererState.selectorEvidence.count = 2;
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /exactly one learner-visible selector/,
    },
    {
      name: "visible hash",
      mutate(report) {
        const record = machinePassThroughOracleAnnotations(report).find(
          ({ annotation }) =>
            JSON.parse(annotation.description).passThroughCellCount > 0,
        );
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells
          .find(({ kind }) => kind === "pass-through")
          .observations[0].visibleGeometryHash = sha256("drift-visible");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /visibleGeometryHash drifted/,
    },
    {
      name: "empty visible named marks",
      mutate(report) {
        const record = machinePassThroughOracleAnnotations(report).find(
          ({ annotation }) =>
            JSON.parse(annotation.description).passThroughCellCount > 0,
        );
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells
          .find(({ kind }) => kind === "pass-through")
          .observations[0].visibleGeometry.visibleNamedMarks = [];
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /visibleGeometry has schema or visible evidence drift/,
    },
    {
      name: "empty visible math marks",
      mutate(report) {
        const record = machinePassThroughOracleAnnotations(report).find(
          ({ annotation }) =>
            JSON.parse(annotation.description).passThroughCellCount > 0,
        );
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells
          .find(({ kind }) => kind === "pass-through")
          .observations[0].visibleGeometry.visibleMathMarks = {};
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /visibleGeometry has schema or visible evidence drift/,
    },
    {
      name: "empty visible math mark group",
      mutate(report) {
        const record = machinePassThroughOracleAnnotations(report).find(
          ({ annotation }) =>
            JSON.parse(annotation.description).passThroughCellCount > 0,
        );
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells
          .find(({ kind }) => kind === "pass-through")
          .observations[0].visibleGeometry.visibleMathMarks.fixture = [];
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /visibleGeometry mark groups are invalid/,
    },
    {
      name: "package aggregate",
      mutate(report) {
        const record = machinePassThroughOracleAnnotations(report)[0];
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.aggregateHash = sha256("drift-package");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /oracle\.aggregateHash drifted/,
    },
    {
      name: "wrong-grade cells preserve totals but violate the exact matrix",
      mutate(report) {
        const scrollRecords = machineScrollAnnotations(report);
        const oracleRecords = machinePassThroughOracleAnnotations(report);
        const p1Index = scrollRecords.findIndex(({ spec }) =>
          spec.title.startsWith("hk-viz-P1-desktop-zh-Hans-light "),
        );
        const p2Index = scrollRecords.findIndex(({ spec }) =>
          spec.title.startsWith("hk-viz-P2-desktop-zh-Hans-light "),
        );
        assert.notEqual(p1Index, -1);
        assert.notEqual(p2Index, -1);
        const p1Scroll = replaceFixtureScrollCellLab(
          scrollRecords[p1Index],
          0,
          "p2-multiplication-foundations",
        );
        const p2Scroll = replaceFixtureScrollCellLab(
          scrollRecords[p2Index],
          0,
          "fixture-wrong-grade-replacement",
        );
        oracleRecords[p1Index].annotation.description = JSON.stringify(
          browserPassThroughOracleAggregateFixture(p1Scroll),
        );
        oracleRecords[p2Index].annotation.description = JSON.stringify(
          browserPassThroughOracleAggregateFixture(p2Scroll),
        );
      },
      pattern: /exact 7 x grade\/viewport\/language\/theme matrix/,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(report);
      assert.throws(
        () =>
          validateHkVisualizationBrowserPassThroughOracleAnnotations(
            serializedTestsForScrollValidation(report),
          ),
        invalid.pattern,
      );
    });
  }
});

test("browser P6 averages annotation validator rejects missing, duplicate, grade, boundary order, numeric, visibility, and hash drift", async (t) => {
  const p6Record = (report) =>
    machineP6AveragesAnnotations(report).find(
      ({ annotation }) => JSON.parse(annotation.description).cellCount === 1,
    );
  const cases = [
    {
      name: "missing annotation",
      mutate(report) {
        const { entry } = machineP6AveragesAnnotations(report)[0];
        entry.annotations = entry.annotations.filter(
          ({ type }) => type !== HK_VISUALIZATION_BROWSER_P6_AVERAGES_ANNOTATION_TYPE,
        );
      },
      pattern: /exactly one.*annotation; observed 0/,
    },
    {
      name: "duplicate annotation",
      mutate(report) {
        const { annotation, entry } = machineP6AveragesAnnotations(report)[0];
        entry.annotations.push(structuredClone(annotation));
      },
      pattern: /exactly one.*annotation; observed 2/,
    },
    {
      name: "wrong grade binding",
      mutate(report) {
        const record = p6Record(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].cellId = aggregate.cells[0].cellId.replace(/^P6\//, "P5/");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /schema, identity, or count drifted|differ from exact scroll cells/,
    },
    {
      name: "missing boundary",
      mutate(report) {
        const record = p6Record(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries.pop();
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /schema, identity, or count drifted/,
    },
    {
      name: "reordered boundaries",
      mutate(report) {
        const record = p6Record(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries.reverse();
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /boundaries are missing, extra, or reordered/,
    },
    {
      name: "zero shift tamper",
      mutate(report) {
        const record = p6Record(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries[0].observation.seriesBShift = 1;
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /dedicatedState must bind|boundary shift semantics/,
    },
    {
      name: "table math tamper",
      mutate(report) {
        const record = p6Record(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries[1].observation.tableRows[0].seriesB += 1;
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /table and visible point.*B=A\+shift/,
    },
    {
      name: "hidden graph evidence",
      mutate(report) {
        const record = p6Record(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries[0].observation.visibility.graph.visuallyVisible = false;
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /learner-visible evidence/,
    },
    {
      name: "boundary hash drift",
      mutate(report) {
        const record = p6Record(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries[0].observationHash = sha256("drift-p6-boundary");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /boundary observationHash drifted/,
    },
    {
      name: "package hash drift",
      mutate(report) {
        const record = p6Record(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.aggregateHash = sha256("drift-p6-package");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /P6 aggregateHash drifted/,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(report);
      assert.throws(
        () => validateHkVisualizationBrowserP6AveragesAnnotations(
          serializedTestsForScrollValidation(report),
        ),
        invalid.pattern,
      );
    });
  }
});

test("browser P6 budget annotation validator rejects missing, duplicate, grade, package extras, order, raw, arithmetic, geometry, visibility, and hash drift", async (t) => {
  const budgetRecord = (report) =>
    machineP6BudgetAnnotations(report).find(
      ({ annotation }) => JSON.parse(annotation.description).cellCount === 1,
    );
  const cases = [
    {
      name: "missing annotation",
      mutate(report) {
        const { entry } = machineP6BudgetAnnotations(report)[0];
        entry.annotations = entry.annotations.filter(
          ({ type }) => type !== HK_VISUALIZATION_BROWSER_P6_BUDGET_ANNOTATION_TYPE,
        );
      },
      pattern: /exactly one.*annotation; observed 0/,
    },
    {
      name: "duplicate annotation",
      mutate(report) {
        const { annotation, entry } = machineP6BudgetAnnotations(report)[0];
        entry.annotations.push(structuredClone(annotation));
      },
      pattern: /exactly one.*annotation; observed 2/,
    },
    {
      name: "wrong grade",
      mutate(report) {
        const record = budgetRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].cellId = aggregate.cells[0].cellId.replace(/^P6\//, "P5/");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /schema, identity, or count drifted|differ from exact scroll cells/,
    },
    {
      name: "missing boundary",
      mutate(report) {
        const record = budgetRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries.pop();
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /schema, identity, or count drifted/,
    },
    {
      name: "package extra boundary",
      mutate(report) {
        const record = budgetRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries.push(structuredClone(aggregate.cells[0].boundaries[0]));
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /schema, identity, or count drifted/,
    },
    {
      name: "reordered boundaries",
      mutate(report) {
        const record = budgetRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        [aggregate.cells[0].boundaries[0], aggregate.cells[0].boundaries[1]] = [
          aggregate.cells[0].boundaries[1],
          aggregate.cells[0].boundaries[0],
        ];
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /boundaries are missing, extra, or reordered/,
    },
    {
      name: "raw state tamper",
      mutate(report) {
        const record = budgetRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        const observation = aggregate.cells[0].boundaries[0].observation;
        observation.serializedDedicatedState = JSON.stringify({
          ...observation.dedicatedState,
          budget: 61,
        });
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /raw\/dedicated budget drifted/,
    },
    {
      name: "arithmetic tamper",
      mutate(report) {
        const record = budgetRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries[1].observation.derived.remaining = 1;
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /derived budget arithmetic drifted/,
    },
    {
      name: "geometry tamper",
      mutate(report) {
        const record = budgetRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries[0].observation.surface.geometry.marker.x1 += 5;
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /budget marker geometry drifted/,
    },
    {
      name: "visibility tamper",
      mutate(report) {
        const record = budgetRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries[3].observation.surface.visibility.result.hiddenAncestor = true;
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /invalid learner-visibility evidence/,
    },
    {
      name: "observation hash drift",
      mutate(report) {
        const record = budgetRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].boundaries[0].observationHash = sha256("drift-budget-observation");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /budget boundary observationHash drifted/,
    },
    {
      name: "package hash drift",
      mutate(report) {
        const record = budgetRecord(report);
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.aggregateHash = sha256("drift-budget-package");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /budget aggregateHash drifted/,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(report);
      assert.throws(
        () => validateHkVisualizationBrowserP6BudgetAnnotations(
          serializedTestsForScrollValidation(report),
        ),
        invalid.pattern,
      );
    });
  }
});

test("browser scroll annotation validator rejects missing/duplicate annotations and missing action/reset, unknown/reordered phase, hash, and count drift", async (t) => {
  const cases = [
    {
      name: "missing annotation",
      mutate(report) {
        const { entry } = machineScrollAnnotations(report)[0];
        entry.annotations = entry.annotations.filter(
          ({ type }) => type !== HK_VISUALIZATION_BROWSER_SCROLL_ANNOTATION_TYPE,
        );
      },
      pattern: /exactly one.*annotation; observed 0/,
    },
    {
      name: "duplicate annotation",
      mutate(report) {
        const { annotation, entry } = machineScrollAnnotations(report)[0];
        entry.annotations.push(structuredClone(annotation));
      },
      pattern: /exactly one.*annotation; observed 2/,
    },
    {
      name: "missing action phase",
      mutate(report) {
        const record = machineScrollAnnotations(report)[0];
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].phases.splice(1, 1);
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /phase\/hash arrays differ from exact set count/,
    },
    {
      name: "missing reset phase",
      mutate(report) {
        const record = machineScrollAnnotations(report)[0];
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].phases.pop();
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /phase\/hash arrays differ from exact set count/,
    },
    {
      name: "unknown phase",
      mutate(report) {
        const record = machineScrollAnnotations(report)[0];
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].phases[1] = "unknown-phase";
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /phasePlanHash drifted/,
    },
    {
      name: "reordered phase",
      mutate(report) {
        const record = machineScrollAnnotations(report)[0];
        const aggregate = JSON.parse(record.annotation.description);
        [aggregate.cells[0].phases[0], aggregate.cells[0].phases[1]] = [
          aggregate.cells[0].phases[1],
          aggregate.cells[0].phases[0],
        ];
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /phasePlanHash drifted/,
    },
    {
      name: "phase plan hash drift",
      mutate(report) {
        const record = machineScrollAnnotations(report)[0];
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].phasePlanHash = sha256("drifted-phase-plan");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /phasePlanHash drifted/,
    },
    {
      name: "package aggregate hash drift",
      mutate(report) {
        const record = machineScrollAnnotations(report)[0];
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.aggregateHash = sha256("drifted-aggregate");
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /aggregateHash drifted/,
    },
    {
      name: "observation count drift",
      mutate(report) {
        const record = machineScrollAnnotations(report)[0];
        const aggregate = JSON.parse(record.annotation.description);
        aggregate.cells[0].scrollObservationCount += 1;
        record.annotation.description = JSON.stringify(aggregate);
      },
      pattern: /six per observation|nested total|auditedExecutionMs/,
    },
    {
      name: "duplicate cell identity across packages",
      mutate(report) {
        const records = machineScrollAnnotations(report);
        const first = JSON.parse(records[0].annotation.description);
        const second = JSON.parse(records[1].annotation.description);
        second.cells[0].cellId = first.cells[0].cellId;
        second.cellIds[0] = first.cellIds[0];
        records[1].annotation.description = JSON.stringify(second);
      },
      pattern: /mismatched cell identity|unique ordered identities/,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(report);
      assert.throws(
        () =>
          validateHkVisualizationBrowserScrollAnnotations(
            serializedTestsForScrollValidation(report),
          ),
        invalid.pattern,
      );
    });
  }
});

test("runtime profile receipt covers every serialized test and is mandatory evidence", () => {
  const report = passingReport();
  const receipt = runtimeReceiptByReport.get(report);
  assert.equal(receipt.plannedTestCount, HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT);
  assert.equal(receipt.sampledTestCount, HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT);
  assert.equal(receipt.samples.length, HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT);
  assert.throws(
    () => validateHkVisualizationReleaseReport(report),
    /runtime browser-profile receipt is invalid/,
  );
  assert.doesNotThrow(() => validateReport(report, receipt));
});

test("runtime profile receipt binds the unique non-HK anchor by identity in Playwright discovery order", () => {
  const report = passingReport();
  report.suites.sort((left, right) => left.title.localeCompare(right.title));
  const receipt = structuredClone(runtimeReceiptByReport.get(report));
  const plannedTests = report.suites.flatMap((suite) =>
    suite.specs.map((spec) => ({
      file: suite.title,
      id: spec.id,
      title: spec.title,
    })),
  );
  const expectedTarget = plannedTests.find(
    (testCase) =>
      testCase.file === "tests/e2e/hk-visualization-non-hk-order.spec.ts" &&
      testCase.title ===
        "US Visualization Lab Next Item goes directly to practice without HK extension or checklist routing",
  );
  assert.ok(expectedTarget);
  assert.notEqual(expectedTarget.id, plannedTests.at(-1).id);
  const sampleById = new Map(
    receipt.samples.map((sample) => [sample.id, sample]),
  );
  receipt.plannedTests = plannedTests;
  receipt.samples = plannedTests.map((testCase, ordinal) => ({
    ...sampleById.get(testCase.id),
    ordinal,
  }));
  receipt.target = expectedTarget;
  const annotation = runtimeEvidenceEntry(report).annotations.find(
    (candidate) => candidate.type === "hk-viz-starship-runtime-paths",
  );
  const annotationEvidence = JSON.parse(annotation.description);
  annotationEvidence.target = expectedTarget;
  annotation.description = JSON.stringify(annotationEvidence);

  assert.doesNotThrow(() => validateReport(report, receipt));
});

test("runtime reporter accepts the unique non-HK anchor before Playwright's final discovered test", () => {
  const workspace = "/Volumes/Starship/MAIS-hk-viz-labs-wt";
  const pathManifest = buildHkVisualizationStarshipPathManifest({
    runId: "hk-viz-reporter-discovery-order-fixture",
    workspace,
  });
  const allTests = [...HK_VISUALIZATION_RELEASE_SPECS]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((file, fileIndex) =>
      HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES[file].map(
        (title, titleIndex) => ({
          annotations: [],
          id: `hk-viz-discovery-${fileIndex}-${titleIndex}`,
          location: { file: join(workspace, file) },
          title,
        }),
      ),
    );
  const reporter = new HkVisualizationRuntimeEvidenceReporter();
  reporter.onBegin(
    {
      metadata: { hkVisualizationStarshipPathManifest: pathManifest },
      projects: [
        {
          id: "desktop-chrome",
          name: "desktop-chrome",
          use: {
            channel: "chrome",
            defaultBrowserType: "chromium",
            deviceScaleFactor: 1,
            hasTouch: false,
            isMobile: false,
            screen: { height: 1080, width: 1920 },
            viewport: { height: 1100, width: 1440 },
          },
        },
      ],
    },
    { allTests: () => allTests },
  );

  assert.equal(reporter.scope, "canonical");
  assert.deepEqual(reporter.observationErrors, []);
  assert.equal(
    reporter.runtimeEvidenceTarget.file,
    "tests/e2e/hk-visualization-non-hk-order.spec.ts",
  );
  assert.notEqual(reporter.runtimeEvidenceTarget.id, allTests.at(-1).id);
});

test("runtime profile receipt fails closed on gaps, duplicates, observation errors, foreign profiles, union drift, or any empty sample", () => {
  for (const mutate of [
    (receipt) => {
      receipt.samples.shift();
    },
    (receipt) => {
      receipt.samples[1].id = receipt.samples[0].id;
    },
    (receipt) => {
      receipt.sampledTestCount -= 1;
    },
    (receipt) => {
      receipt.observationErrors.push("ps probe failed");
    },
    (receipt) => {
      const foreign =
        "/var/folders/hk-viz/playwright_chromiumdev_profile-early";
      receipt.samples[0].profilePaths = [foreign];
      receipt.samples[0].rawProfilePaths = [foreign];
      receipt.actualBrowserProfilePaths.push(foreign);
    },
    (receipt) => {
      receipt.actualBrowserProfilePaths = [];
    },
    (receipt) => {
      receipt.actualBrowserProfilePaths.push(
        receipt.actualBrowserProfilePaths[0].replace("fixture", "unobserved"),
      );
    },
    (receipt) => {
      receipt.samples[0].profilePaths = [];
      receipt.samples[0].rawProfilePaths = [];
    },
    (receipt) => {
      const middle = Math.floor(receipt.samples.length / 2);
      receipt.samples[middle].profilePaths = [];
      receipt.samples[middle].rawProfilePaths = [];
    },
    (receipt) => {
      receipt.samples.at(-1).profilePaths = [];
      receipt.samples.at(-1).rawProfilePaths = [];
    },
    (receipt) => {
      receipt.target = receipt.plannedTests[0];
    },
  ]) {
    const report = passingReport();
    const receipt = structuredClone(runtimeReceiptByReport.get(report));
    mutate(receipt);
    assert.throws(
      () => validateReport(report, receipt),
      /not zero-failure evidence/,
    );
  }
});

test("runtime profile receipt preserves multiple compliant browser generations across the full run", () => {
  const report = passingReport();
  const receipt = structuredClone(runtimeReceiptByReport.get(report));
  const secondProfile = join(
    report.config.metadata.hkVisualizationStarshipPathManifest
      .browserProfileParent,
    "playwright_chromiumdev_profile-restart",
  );
  receipt.samples[0].profilePaths.push(secondProfile);
  receipt.samples[0].rawProfilePaths.push(secondProfile);
  receipt.actualBrowserProfilePaths.push(secondProfile);
  receipt.actualBrowserProfilePaths.sort();
  const runtimePathAnnotation = runtimeEvidenceEntry(report).annotations.find(
    (candidate) => candidate.type === "hk-viz-starship-runtime-paths",
  );
  const annotationEvidence = JSON.parse(runtimePathAnnotation.description);
  annotationEvidence.actualBrowserProfilePaths = [
    ...receipt.actualBrowserProfilePaths,
  ];
  runtimePathAnnotation.description = JSON.stringify(annotationEvidence);

  const result = validateReport(report, receipt);
  assert.deepEqual(
    result.actualPaths.browserProfiles,
    receipt.actualBrowserProfilePaths,
  );
});

test("report validator compares canonical browser dimensions structurally rather than by property insertion order", () => {
  const report = passingReport();
  const annotation = runtimeEvidenceEntry(report).annotations.find(
    (candidate) => candidate.type === "hk-viz-canonical-browser-device",
  );
  const evidence = JSON.parse(annotation.description);
  evidence.screen = { height: 1080, width: 1920 };
  evidence.viewport = { height: 1100, width: 1440 };
  annotation.description = JSON.stringify(evidence);
  assert.doesNotThrow(() => validateReport(report));
});

test("report validator rejects executable web-server path shadowing even when canonical tokens and the recomputed command hash remain present", () => {
  for (const mutate of [
    (report) => {
      report.config.webServer.command +=
        " && env TMPDIR='/tmp/hk-viz-shadow' true";
    },
    (report) => {
      report.config.webServer.command +=
        ` && echo '${report.config.metadata.hkVisualizationStarshipPathManifest.nextDistDir}'` +
        " && env NEXT_DIST_DIR='/var/folders/hk-viz-shadow' true";
    },
    (report) => {
      report.config.webServer.command +=
        " && env NPM_CONFIG_LOGS_DIR='/Users/another-owner/Desktop/hk-viz-logs' true";
    },
  ]) {
    const report = passingReport();
    mutate(report);
    refreshWebServerCommandHash(report);
    assert.throws(
      () => validateReport(report),
      /not zero-failure evidence/,
    );
  }
});

test("report validator fails closed on manifest, managed-output, web-server, or actual browser-profile drift", () => {
  for (const mutate of [
    (report) => {
      delete report.config.metadata.hkVisualizationStarshipPathManifest;
    },
    (report) => {
      report.config.projects[0].outputDir = "/tmp/test-results";
    },
    (report) => {
      report.config.webServer.command = report.config.webServer.command.replace(
        /\/Volumes\/Starship\/[^']+\/next-dist/,
        "/tmp/next-dist",
      );
    },
    (report) => {
      const entry = runtimeEvidenceEntry(report);
      entry.annotations = entry.annotations.filter(
        (annotation) => annotation.type !== "hk-viz-starship-runtime-paths",
      );
    },
    (report) => {
      const annotation = runtimeEvidenceEntry(report).annotations.find(
        (candidate) => candidate.type === "hk-viz-starship-runtime-paths",
      );
      const evidence = JSON.parse(annotation.description);
      evidence.actualBrowserProfilePaths = [
        "/var/folders/playwright_chromiumdev_profile-foreign",
      ];
      annotation.description = JSON.stringify(evidence);
    },
    (report) => {
      const annotation = runtimeEvidenceEntry(report).annotations.find(
        (candidate) => candidate.type === "hk-viz-starship-runtime-paths",
      );
      const evidence = JSON.parse(annotation.description);
      evidence.actualBrowserProfilePaths = [];
      annotation.description = JSON.stringify(evidence);
    },
  ]) {
    const report = passingReport();
    mutate(report);
    assert.throws(
      () => validateReport(report),
      /not zero-failure evidence/,
    );
  }
});

test("report validator rejects skipped, flaky, failed, missing-spec, foreign-project, and extra-spec evidence", () => {
  for (const mutate of [
    (report) => {
      report.stats.skipped = 1;
      report.stats.expected -= 1;
      report.suites[0].specs[0].tests[0].status = "skipped";
    },
    (report) => {
      report.stats.flaky = 1;
      report.stats.expected -= 1;
      report.suites[0].specs[0].tests[0].status = "flaky";
    },
    (report) => {
      report.stats.unexpected = 1;
      report.stats.expected -= 1;
      report.suites[0].specs[0].tests[0].status = "unexpected";
    },
    (report) => {
      report.suites.pop();
      report.stats.expected -= 1;
    },
    (report) => {
      report.suites[0].specs[0].tests[0].projectName = "mobile-chrome";
    },
    (report) => {
      report.suites.push({
        file: "unrelated.spec.ts",
        specs: [
          {
            file: "unrelated.spec.ts",
            tests: [
              {
                projectName: "desktop-chrome",
                results: [{ status: "passed" }],
                status: "expected",
              },
            ],
          },
        ],
      });
      report.stats.expected += 1;
    },
    (report) => {
      report.suites[0].specs[0].tests[0].results[0].status = "failed";
    },
    (report) => {
      report.suites[0].specs[0].tests[0].results = [];
    },
    (report) => {
      report.suites[0].specs[0].tests[0].results.push({
        retry: 1,
        status: "passed",
      });
    },
    (report) => {
      report.suites[0].specs[0].tests[0].results[0].retry = 1;
    },
    (report) => {
      report.suites[0].specs.pop();
      report.stats.expected -= 1;
    },
    (report) => {
      report.config.forbidOnly = false;
    },
    (report) => {
      report.config.workers = 2;
    },
    (report) => {
      report.config.shard = { current: 1, total: 2 };
    },
    (report) => {
      report.config.projects[0].retries = 1;
    },
    (report) => {
      report.config.webServer = null;
    },
    (report) => {
      report.config.reporter = [["json"]];
    },
    (report) => {
      report.config.updateSnapshots = "missing";
    },
    (report) => {
      report.suites[0].specs[0].title =
        "replacement title with unchanged count";
    },
    (report) => {
      report.errors = null;
    },
    (report) => {
      report.suites[0].specs[0].tests[0].expectedStatus = "failed";
    },
    (report) => {
      report.suites[0].specs[0].tests[0].results[0].errors = null;
    },
    (report) => {
      report.suites[0].specs[0].tests[0].results[0].errors = [
        { message: "hidden" },
      ];
    },
    (report) => {
      report.suites[0].specs[0].tests[0].annotations[0].description =
        "https://external.example.invalid";
    },
  ]) {
    const report = passingReport();
    mutate(report);
    assert.throws(
      () => validateReport(report),
      /not zero-failure evidence/,
    );
  }
});

test("report validator rejects missing or wrong canonical Google Chrome channel evidence", () => {
  for (const mutate of [
    (report) => {
      const testEntry = runtimeEvidenceEntry(report);
      testEntry.annotations = testEntry.annotations.filter(
        (annotation) => annotation.type !== "hk-viz-canonical-browser-device",
      );
    },
    (report) => {
      const annotation = runtimeEvidenceEntry(report).annotations.find(
        (candidate) => candidate.type === "hk-viz-canonical-browser-device",
      );
      const evidence = JSON.parse(annotation.description);
      delete evidence.channel;
      annotation.description = JSON.stringify(evidence);
    },
    (report) => {
      const annotation = runtimeEvidenceEntry(report).annotations.find(
        (candidate) => candidate.type === "hk-viz-canonical-browser-device",
      );
      const evidence = JSON.parse(annotation.description);
      evidence.channel = "chromium";
      annotation.description = JSON.stringify(evidence);
    },
  ]) {
    const report = passingReport();
    mutate(report);
    assert.throws(
      () => validateReport(report),
      /canonical-browser-device/,
    );
  }
});

test("report validator rejects a missing, foreign, or reordered runtime-evidence reporter", () => {
  for (const mutate of [
    (report) => {
      report.config.reporter.shift();
    },
    (report) => {
      report.config.reporter[0] = ["/tmp/foreign-runtime-reporter.mjs"];
    },
    (report) => {
      [report.config.reporter[0], report.config.reporter[1]] = [
        report.config.reporter[1],
        report.config.reporter[0],
      ];
    },
  ]) {
    const report = passingReport();
    mutate(report);
    assert.throws(
      () => validateReport(report),
      /not zero-failure evidence/,
    );
  }
});

test("report validator rejects missing or wrong exact Desktop Chrome viewport and device evidence", () => {
  for (const mutate of [
    (evidence) => {
      delete evidence.viewport;
    },
    (evidence) => {
      evidence.viewport = { height: 900, width: 1440 };
    },
    (evidence) => {
      delete evidence.screen;
    },
    (evidence) => {
      evidence.screen = { height: 900, width: 1440 };
    },
    (evidence) => {
      evidence.deviceScaleFactor = 2;
    },
    (evidence) => {
      evidence.isMobile = true;
    },
    (evidence) => {
      evidence.hasTouch = true;
    },
    (evidence) => {
      evidence.defaultBrowserType = "firefox";
    },
    (evidence) => {
      delete evidence.userAgent;
    },
    (evidence) => {
      evidence.userAgent = "HeadlessChrome";
    },
  ]) {
    const report = passingReport();
    const annotation = runtimeEvidenceEntry(report).annotations.find(
      (candidate) => candidate.type === "hk-viz-canonical-browser-device",
    );
    const evidence = JSON.parse(annotation.description);
    mutate(evidence);
    annotation.description = JSON.stringify(evidence);
    assert.throws(
      () => validateReport(report),
      /canonical-browser-device/,
    );
  }
});

test("release title manifest cardinalities stay aligned with fixed per-file counts", () => {
  for (const file of HK_VISUALIZATION_RELEASE_SPECS) {
    const titles = HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES[file];
    assert.equal(
      titles.length,
      HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS[file],
      file,
    );
    assert.equal(
      new Set(titles).size,
      titles.length,
      `${file} contains a duplicate title`,
    );
  }
});

test("deadline/source TDD exact6 static authority covers 371 of 371 release tests and splits the setup reserve", () => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationStaticTestTimeoutTopology;
  assert.equal(typeof validate, "function");
  assert.deepEqual(
    hkVisualizationReleaseGateModule.HK_VISUALIZATION_STATIC_TEST_TIMEOUT_ROWS,
    independentStaticReleaseTimeoutRows,
  );
  assert.deepEqual(
    validate({
      rows: structuredClone(independentStaticReleaseTimeoutRows),
      sourceByFile: independentStaticReleaseSources(),
    }),
    {
      fileCount: 2,
      sourceAggregateSha256:
        independentStaticDeadlineSourceAggregateSha256,
      sourceOverrideCount: 0,
      sourceRows: independentStaticDeadlineSourceRows,
      testCount: 6,
      timeoutSumMs: 720_000,
    },
  );
  assert.equal(
    hkVisualizationReleaseGateModule.HK_VISUALIZATION_STATIC_TEST_TIMEOUT_SUM_MS,
    720_000,
  );
  assert.equal(
    hkVisualizationReleaseGateModule.HK_VISUALIZATION_RELEASE_INFRASTRUCTURE_TIMEOUT_MS,
    1_080_000,
  );
  assert.equal(
    hkVisualizationReleaseGateModule.HK_VISUALIZATION_RELEASE_TIMEOUT_COVERED_TEST_COUNT,
    371,
  );
  assert.equal(HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT, 371);
  assert.equal(HK_VISUALIZATION_RELEASE_WORKLOAD_TIMEOUT_MS, 175_760_000);
});

test("fifth review frozen-byte authority rejects opaque exact6 capability flows and one-byte drift", async (t) => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationStaticTestTimeoutTopology;
  const first = independentStaticReleaseTimeoutRows[0];
  const exactDeclaration =
    `test("${first.title}", async ({ browser }, testInfo) => {`;
  const beforeEachDeclaration =
    "test.beforeEach(async ({}, testInfo) => {";
  const insertExact = (source, statement) => source.replace(
    exactDeclaration,
    `${exactDeclaration}\n    ${statement}`,
  );
  const cases = [
    {
      name: "eval imported test",
      mutate: (source) => insertExact(source, 'eval("test.setTimeout(120000)");'),
    },
    {
      name: "eval TestInfo",
      mutate: (source) => insertExact(source, 'eval("testInfo.slow()");'),
    },
    {
      name: "arguments one exact callback",
      mutate(source) {
        return source.replace(
          exactDeclaration,
          `test("${first.title}", async function ({ browser }, testInfo) {\n    Reflect.get(arguments[1], ["set", "Timeout"].join(""));`,
        );
      },
    },
    {
      name: "arguments one beforeEach",
      mutate(source) {
        return source.replace(
          beforeEachDeclaration,
          "test.beforeEach(async function ({}, testInfo) {\n    Reflect.get(arguments[1], [\"sl\", \"ow\"].join(\"\"));",
        );
      },
    },
    {
      name: "third default carrier",
      mutate(source) {
        return source.replace(
          exactDeclaration,
          `test("${first.title}", async ({ browser }, testInfo, carrier = testInfo) => {\n    Reflect.get(carrier, ["set", "Timeout"].join(""));`,
        );
      },
    },
    {
      name: "namespace import",
      mutate(source) {
        return [
          'import * as playwrightNamespace from "@playwright/test";',
          'void Reflect.get(playwrightNamespace, ["te", "st"].join(""));',
          source,
        ].join("\n");
      },
    },
    {
      name: "dynamic import",
      mutate: (source) => insertExact(
        source,
        'void import("@playwright/test").then((playwrightNamespace) => Reflect.get(playwrightNamespace, "test"));',
      ),
    },
    {
      name: "require",
      mutate: (source) => insertExact(
        source,
        'void Reflect.get(require("@playwright/test"), ["te", "st"].join(""));',
      ),
    },
    {
      name: "Proxy carrier",
      mutate: (source) => insertExact(
        source,
        'void new Proxy(eval("testInfo"), {});',
      ),
    },
    {
      name: "Function-like carrier",
      mutate: (source) => insertExact(
        source,
        'void Function("return test")();',
      ),
    },
    {
      name: "single-byte benign source drift",
      mutate(source) {
        return source.replace("const options =", "const\toptions =");
      },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const sourceByFile = independentStaticReleaseSources();
      sourceByFile[first.file] = invalid.mutate(sourceByFile[first.file]);
      assert.throws(
        () => validate({
          rows: structuredClone(independentStaticReleaseTimeoutRows),
          sourceAuthorityRows: structuredClone(independentStaticDeadlineSourceRows),
          sourceByFile,
        }),
        /frozen|source|byte|SHA|authority|drift/iu,
      );
    });
  }
});

test("fifth review frozen-byte authority is independent exact2 ordered source evidence", async (t) => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationStaticTestTimeoutTopology;
  const cleanSources = independentStaticReleaseSources();
  const cases = [
    {
      name: "missing",
      mutate(rows) { rows.splice(0, 1); },
    },
    {
      name: "extra",
      mutate(rows) { rows.push(structuredClone(rows[0])); },
    },
    {
      name: "reordered",
      mutate(rows) { [rows[0], rows[1]] = [rows[1], rows[0]]; },
    },
    {
      name: "duplicate",
      mutate(rows) { rows[1] = structuredClone(rows[0]); },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const sourceAuthorityRows = structuredClone(
        independentStaticDeadlineSourceRows,
      );
      invalid.mutate(sourceAuthorityRows);
      assert.throws(
        () => validate({
          rows: structuredClone(independentStaticReleaseTimeoutRows),
          sourceAuthorityRows,
          sourceByFile: cleanSources,
        }),
        /frozen|source|exact|row|order|duplicate|authority|drift/iu,
      );
    });
  }
  assert.deepEqual(
    hkVisualizationReleaseGateModule
      .HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_ROWS,
    independentStaticDeadlineSourceRows,
  );
  assert.equal(
    hkVisualizationReleaseGateModule
      .HK_VISUALIZATION_STATIC_DEADLINE_SOURCE_AGGREGATE_SHA256,
    independentStaticDeadlineSourceAggregateSha256,
  );
});

test("fifth review deadline receipt cross-binds exact2 frozen bytes into hashed run evidence", () => {
  const receipt = paintedGeometryValidatedSourceReceiptFixture();
  const report = passingReport();
  const result = validateHkVisualizationReleaseReport(report, {
    releaseSourceReceipt: receipt,
    runtimeProfileReceipt: runtimeReceiptByReport.get(report),
  });
  const evidence = result.staticDeadlineSourceEvidence;
  assert.deepEqual(evidence.sourceRows, independentStaticDeadlineSourceRows);
  assert.equal(
    evidence.sourceAggregateSha256,
    independentStaticDeadlineSourceAggregateSha256,
  );
  assert.deepEqual(
    evidence.executionStartSourceRows.map(({ path }) => path),
    independentReleaseExecutionSourcePaths,
  );
  assert.equal(
    evidence.executionStartSourceAggregateSha256,
    receipt.releaseSourceExecution.executionStartSourceAggregateSha256,
  );
  assert.deepEqual(
    evidence.executionStartSourceRows.map((row) => Object.keys(row)),
    independentReleaseExecutionSourcePaths.map(() => [
      "mode",
      "path",
      "sha256",
      "size",
      "type",
    ]),
  );
  assert.equal(evidence.monitorReceipt.eventCount, 0);
  assert.equal(evidence.monitorReceipt.status, "clean");
  assert.equal(
    evidence.monitorReceipt.version,
    independentReleaseSourceMonitorVersion,
  );
  assert.deepEqual(
    evidence.monitorReceipt.policy,
    independentReleaseSourceMonitorPolicy,
  );
  assert.deepEqual(
    evidence.receiptRows.map(({ path }) => path),
    independentStaticDeadlineSourceRows.map(({ path }) => path),
  );
  for (const row of evidence.receiptRows) {
    assert.deepEqual(Object.keys(row), [
      "afterSha256",
      "beforeSha256",
      "mode",
      "path",
      "size",
      "type",
    ]);
    assert.equal(row.beforeSha256, row.afterSha256);
    assert.equal(row.type, "file");
  }
  assert.match(evidence.runAggregateHash, /^[a-f0-9]{64}$/u);
});

test("fifth review deadline receipt rejects exact2 topology and before-after rehash drift", async (t) => {
  const lessonPath = independentStaticDeadlineSourceRows[1].path;
  const cases = [
    {
      name: "missing authority row",
      mutate(receipt) { receipt.staticDeadlineSourceRows.splice(0, 1); },
    },
    {
      name: "extra authority row",
      mutate(receipt) {
        receipt.staticDeadlineSourceRows.push(
          structuredClone(receipt.staticDeadlineSourceRows[0]),
        );
      },
    },
    {
      name: "reordered authority rows",
      mutate(receipt) {
        [receipt.staticDeadlineSourceRows[0], receipt.staticDeadlineSourceRows[1]] =
          [receipt.staticDeadlineSourceRows[1], receipt.staticDeadlineSourceRows[0]];
      },
    },
    {
      name: "duplicate authority row",
      mutate(receipt) {
        receipt.staticDeadlineSourceRows[1] =
          structuredClone(receipt.staticDeadlineSourceRows[0]);
      },
    },
    {
      name: "missing before entry",
      mutate(receipt) {
        receipt.before.entries = receipt.before.entries.filter(
          ({ path }) => path !== lessonPath,
        );
      },
    },
    {
      name: "missing after entry",
      mutate(receipt) {
        receipt.after.entries = receipt.after.entries.filter(
          ({ path }) => path !== lessonPath,
        );
      },
    },
    {
      name: "duplicate before entry",
      mutate(receipt) {
        receipt.before.entries.push(structuredClone(
          receipt.before.entries.find(({ path }) => path === lessonPath),
        ));
      },
    },
    {
      name: "invalid before SHA",
      mutate(receipt) {
        receipt.before.entries.find(({ path }) => path === lessonPath).sha256 =
          "not-a-sha";
      },
    },
    {
      name: "before-only valid SHA",
      mutate(receipt) {
        receipt.before.entries.find(({ path }) => path === lessonPath).sha256 =
          "a".repeat(64);
      },
    },
    {
      name: "after-only valid SHA",
      mutate(receipt) {
        receipt.after.entries.find(({ path }) => path === lessonPath).sha256 =
          "b".repeat(64);
      },
    },
    {
      name: "fully rehashed wrong bytes",
      mutate(receipt) {
        for (const phase of ["before", "after"]) {
          const entry = receipt[phase].entries.find(
            ({ path }) => path === lessonPath,
          );
          entry.sha256 = "c".repeat(64);
        }
        receipt.staticDeadlineSourceRows[1].sha256 = "c".repeat(64);
      },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      const receipt = paintedGeometryValidatedSourceReceiptFixture();
      invalid.mutate(receipt);
      assert.throws(
        () => validateHkVisualizationReleaseReport(report, {
          releaseSourceReceipt: receipt,
          runtimeProfileReceipt: runtimeReceiptByReport.get(report),
        }),
        /deadline|frozen|source|receipt|row|order|duplicate|SHA|drift/iu,
      );
    });
  }
});

test("sixth review current45 execution receipt rejects topology, monitor, and fully rehashed live-byte drift", async (t) => {
  const cases = [
    {
      name: "missing current row",
      mutate(receipt) {
        receipt.releaseSourceExecution.executionStartSourceRows.splice(0, 1);
      },
    },
    {
      name: "extra current row",
      mutate(receipt) {
        receipt.releaseSourceExecution.executionStartSourceRows.push(
          structuredClone(
            receipt.releaseSourceExecution.executionStartSourceRows[0],
          ),
        );
      },
    },
    {
      name: "reordered current rows",
      mutate(receipt) {
        const rows = receipt.releaseSourceExecution.executionStartSourceRows;
        [rows[0], rows[1]] = [rows[1], rows[0]];
      },
    },
    {
      name: "duplicate current row",
      mutate(receipt) {
        receipt.releaseSourceExecution.executionStartSourceRows[1] =
          structuredClone(
            receipt.releaseSourceExecution.executionStartSourceRows[0],
          );
      },
    },
    {
      name: "aggregate drift",
      mutate(receipt) {
        receipt.releaseSourceExecution.executionStartSourceAggregateSha256 =
          "a".repeat(64);
      },
    },
    {
      name: "watch event",
      mutate(receipt) {
        receipt.releaseSourceExecution.monitorReceipt.eventCount = 1;
        receipt.releaseSourceExecution.monitorReceipt.status = "violated";
      },
    },
    {
      name: "watch error",
      mutate(receipt) {
        receipt.releaseSourceExecution.monitorReceipt.errorCount = 1;
        receipt.releaseSourceExecution.monitorReceipt.status = "violated";
      },
    },
    {
      name: "watch early close",
      mutate(receipt) {
        receipt.releaseSourceExecution.monitorReceipt.earlyCloseCount = 1;
        receipt.releaseSourceExecution.monitorReceipt.status = "violated";
      },
    },
    {
      name: "watch null filename",
      mutate(receipt) {
        receipt.releaseSourceExecution.monitorReceipt.nullFilenameEventCount = 1;
        receipt.releaseSourceExecution.monitorReceipt.status = "violated";
      },
    },
    {
      name: "watch policy drift",
      mutate(receipt) {
        receipt.releaseSourceExecution.monitorReceipt.policy.persistent = false;
      },
    },
    {
      name: "watch version drift",
      mutate(receipt) {
        receipt.releaseSourceExecution.monitorReceipt.version = "drift";
      },
    },
    {
      name: "fully rehashed non-exact2 wrong live bytes",
      mutate(receipt) {
        const path = "data/topics.ts";
        for (const phase of ["before", "after"]) {
          receipt[phase].entries.find((row) => row.path === path).sha256 =
            "d".repeat(64);
        }
        const rows = receipt.releaseSourceExecution.executionStartSourceRows;
        rows.find((row) => row.path === path).sha256 = "d".repeat(64);
        receipt.releaseSourceExecution.executionStartSourceAggregateSha256 =
          hashCanonicalFixture({
            contractVersion: independentReleaseSourceExecutionContractVersion,
            sourceRows: rows,
          });
      },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      const receipt = paintedGeometryValidatedSourceReceiptFixture();
      invalid.mutate(receipt);
      assert.throws(
        () => validateHkVisualizationReleaseReport(report, {
          releaseSourceReceipt: receipt,
          runtimeProfileReceipt: runtimeReceiptByReport.get(report),
        }),
        /execution|monitor|current45|source|receipt|row|aggregate|event|watch|drift/iu,
      );
    });
  }
});

test("deadline/source TDD exact6 static authority rejects missing, reordered, retitled, underbudget, and overcap rows", async (t) => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationStaticTestTimeoutTopology;
  assert.equal(typeof validate, "function");
  const sourceByFile = independentStaticReleaseSources();
  const cases = [
    {
      name: "missing",
      mutate(rows) { rows.splice(0, 1); },
    },
    {
      name: "reordered",
      mutate(rows) { [rows[0], rows[1]] = [rows[1], rows[0]]; },
    },
    {
      name: "retitled",
      mutate(rows) { rows[0].title = `${rows[0].title} drift`; },
    },
    {
      name: "underbudget",
      mutate(rows) { rows[0].timeoutMs = 119_999; },
    },
    {
      name: "overcap",
      mutate(rows) { rows[0].timeoutMs = 120_001; },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const rows = structuredClone(independentStaticReleaseTimeoutRows);
      invalid.mutate(rows);
      assert.throws(
        () => validate({ rows, sourceByFile }),
        /static|timeout|title|row|120000|120_000|cap|budget/iu,
      );
    });
  }
});

test("deadline/source TDD exact6 source authority rejects missing, reordered, retitled, overcap, and dynamically unparseable overrides", async (t) => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationStaticTestTimeoutTopology;
  assert.equal(typeof validate, "function");
  const first = independentStaticReleaseTimeoutRows[0];
  const second = independentStaticReleaseTimeoutRows[1];
  const sourceCases = [
    {
      name: "missing source title",
      mutate(source) {
        return source.replace(`  test("${first.title}"`, `  omittedTest("${first.title}"`);
      },
    },
    {
      name: "reordered source titles",
      mutate(source) {
        return source
          .replace(first.title, "__HK_VIZ_STATIC_TITLE_SWAP__")
          .replace(second.title, first.title)
          .replace("__HK_VIZ_STATIC_TITLE_SWAP__", second.title);
      },
    },
    {
      name: "retitled source test",
      mutate(source) {
        return source.replace(first.title, `${first.title} drift`);
      },
    },
    {
      name: "overcap literal override",
      mutate(source) {
        return source.replace(
          `test("${first.title}", async ({ browser }, testInfo) => {`,
          `test("${first.title}", async ({ browser }, testInfo) => {\n    test.setTimeout(120_001);`,
        );
      },
    },
    {
      name: "dynamic unparseable override",
      mutate(source) {
        return source.replace(
          `test("${first.title}", async ({ browser }, testInfo) => {`,
          `test("${first.title}", async ({ browser }, testInfo) => {\n    test.setTimeout(Math.max(1, Date.now()));`,
        );
      },
    },
  ];
  for (const invalid of sourceCases) {
    await t.test(invalid.name, () => {
      const sourceByFile = independentStaticReleaseSources();
      sourceByFile[first.file] = invalid.mutate(sourceByFile[first.file]);
      assert.throws(
        () => validate({
          rows: structuredClone(independentStaticReleaseTimeoutRows),
          sourceByFile,
        }),
        /static|source|title|order|override|literal|cap|timeout/iu,
      );
    });
  }
});

test("deadline/source TDD exact7 painted-pair receipts bind independent ordered before and after SHAs into run evidence", () => {
  for (const sourcePath of independentPaintedGeometryPairSourcePaths) {
    assert.equal(
      HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS.includes(sourcePath),
      true,
      sourcePath,
    );
  }
  const evidence = validatePaintedGeometryPairReport(passingReport());
  assert.deepEqual(
    evidence.sourceReceipts.map(({ path }) => path),
    independentPaintedGeometryPairSourcePaths,
  );
  assert.deepEqual(
    evidence.sourceReceipts.map((row) => Object.keys(row)),
    independentPaintedGeometryPairSourcePaths.map(() => [
      "afterSha256",
      "beforeSha256",
      "path",
    ]),
  );
  for (const row of evidence.sourceReceipts) {
    assert.match(row.beforeSha256, /^[a-f0-9]{64}$/u);
    assert.equal(row.afterSha256, row.beforeSha256);
    assert.equal(row.beforeSha256, sha256(readFileSync(row.path)));
  }
});

test("deadline/source TDD exact7 painted-pair receipt validator rejects missing, extra, reorder, duplicate, one-phase, invalid-SHA, and fully rehashed drift", async (t) => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationPassThroughPaintedGeometryPairSourceReceipts;
  assert.equal(typeof validate, "function");
  const clean = validatePaintedGeometryPairReport(passingReport()).sourceReceipts;
  const cases = [
    {
      name: "missing",
      mutate(rows) { rows.splice(0, 1); },
    },
    {
      name: "extra",
      mutate(rows) {
        rows.push({
          afterSha256: sha256("extra"),
          beforeSha256: sha256("extra"),
          path: "tests/e2e/unexpected-painted-pair-source.mjs",
        });
      },
    },
    {
      name: "reorder",
      mutate(rows) { [rows[0], rows[1]] = [rows[1], rows[0]]; },
    },
    {
      name: "duplicate",
      mutate(rows) { rows[1] = structuredClone(rows[0]); },
    },
    {
      name: "before-only",
      mutate(rows) { delete rows[0].afterSha256; },
    },
    {
      name: "after-only",
      mutate(rows) { delete rows[0].beforeSha256; },
    },
    {
      name: "invalid SHA",
      mutate(rows) { rows[0].afterSha256 = "not-a-sha"; },
    },
    {
      name: "fully rehashed drift",
      mutate(rows) {
        rows[0].afterSha256 = sha256("fully-rehashed-drift");
        rows[0].beforeSha256 = rows[0].afterSha256;
      },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const rows = structuredClone(clean);
      invalid.mutate(rows);
      assert.throws(
        () => validate(rows),
        /painted-geometry|source|receipt|path|order|SHA|drift|exact/iu,
      );
    });
  }

  const fullReceiptRehash = paintedGeometryValidatedSourceReceiptFixture();
  const firstPaintedPairSourcePath =
    independentPaintedGeometryPairSourcePaths[0];
  for (const phase of ["before", "after"]) {
    const sourceEntry = fullReceiptRehash[phase].entries.find(
      (entry) => entry.path === firstPaintedPairSourcePath,
    );
    assert.ok(sourceEntry, `${phase} must contain the first painted-pair source`);
    sourceEntry.sha256 = sha256("fully-rehashed-drift");
  }
  assert.throws(
    () => validatePaintedGeometryPairReport(passingReport(), fullReceiptRehash),
    /source|receipt|SHA|drift|current/iu,
  );
});

test("review repair real five-field source-freeze entries project to exact7 evidence and reject metadata drift", async (t) => {
  const receipt = paintedGeometryValidatedSourceReceiptFixture();
  const firstPaintedPairSourcePath =
    independentPaintedGeometryPairSourcePaths[0];
  for (const phase of ["before", "after"]) {
    const sourceEntry = receipt[phase].entries.find(
      (entry) => entry.path === firstPaintedPairSourcePath,
    );
    assert.ok(sourceEntry, `${phase} must contain the first painted-pair source`);
    assert.deepEqual(
      Object.keys(sourceEntry),
      ["mode", "path", "sha256", "size", "type"],
    );
  }
  const evidence = validatePaintedGeometryPairReport(passingReport(), receipt);
  assert.deepEqual(
    evidence.sourceReceipts.map(({ path }) => path),
    independentPaintedGeometryPairSourcePaths,
  );

  const cases = [
    {
      name: "mode",
      mutate(entry) { entry.mode = "8888"; },
    },
    {
      name: "negative size",
      mutate(entry) { entry.size = -1; },
    },
    {
      name: "wrong type",
      mutate(entry) { entry.type = "directory"; },
    },
    {
      name: "wrong path",
      mutate(entry) { entry.path = `${entry.path}.drift`; },
    },
    {
      name: "invalid SHA",
      mutate(entry) { entry.sha256 = "not-a-sha"; },
    },
    {
      name: "before-after metadata drift",
      mutate(entry) {
        entry.mode = entry.mode === "0644" ? "0600" : "0644";
      },
      phase: "before",
    },
  ];
  for (const invalidCase of cases) {
    await t.test(invalidCase.name, () => {
      const invalid = structuredClone(receipt);
      const phase = invalidCase.phase ?? "before";
      const sourceEntry = invalid[phase].entries.find(
        (entry) => entry.path === firstPaintedPairSourcePath,
      );
      assert.ok(sourceEntry, `${phase} must contain the first painted-pair source`);
      invalidCase.mutate(sourceEntry, invalid);
      assert.throws(
        () => validatePaintedGeometryPairReport(passingReport(), invalid),
        /source|receipt|entry|mode|size|type|path|SHA|metadata|drift/iu,
      );
    });
  }
});

test("review repair exact6 source authority rejects slow multipliers and suite timeout configuration", async (t) => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationStaticTestTimeoutTopology;
  const first = independentStaticReleaseTimeoutRows[0];
  const declaration =
    `test("${first.title}", async ({ browser }, testInfo) => {`;
  const cases = [
    {
      name: "test.slow",
      insertion: "test.slow();",
    },
    {
      name: "testInfo.slow",
      insertion: "testInfo.slow();",
    },
    {
      name: "suite literal timeout",
      prepend: '  test.describe.configure({ timeout: 120_001 });\n',
    },
    {
      name: "suite dynamic timeout",
      prepend: '  test.describe.configure({ timeout: Math.max(1, Date.now()) });\n',
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const sourceByFile = independentStaticReleaseSources();
      sourceByFile[first.file] = invalid.prepend
        ? `${invalid.prepend}${sourceByFile[first.file]}`
        : sourceByFile[first.file].replace(
            declaration,
            `${declaration}\n    ${invalid.insertion}`,
          );
      assert.throws(
        () => validate({
          rows: structuredClone(independentStaticReleaseTimeoutRows),
          sourceByFile,
        }),
        /static|slow|suite|describe|configure|timeout|multiplier/iu,
      );
    });
  }
});

test("review repair resolved Playwright project timeout is mandatory and capped at 120000", async (t) => {
  const cases = [
    {
      name: "missing",
      mutate(project) { delete project.timeout; },
    },
    {
      name: "zero",
      mutate(project) { project.timeout = 0; },
    },
    {
      name: "overcap",
      mutate(project) { project.timeout = 120_001; },
    },
    {
      name: "non-number",
      mutate(project) { project.timeout = "120000"; },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(report.config.projects[0]);
      assert.throws(
        () => validateReport(report),
        /project\.timeout|resolved.*timeout|120000|120_000/iu,
      );
    });
  }
});

test("review repair runner-test artifact root validates lexical and physical Starship authority before and after materialization", async (t) => {
  const materialize = hkVisualizationReleaseGateModule
    .materializeHkVisualizationRunnerTestArtifactRoot;
  assert.equal(typeof materialize, "function");
  for (const candidate of [
    "relative/artifact-root",
    "/Volumes/Starship",
    "/Volumes/Starship/MAIS-hk-viz-labs-wt/.tmp/runner/../escape",
  ]) {
    await t.test(`rejects ${candidate}`, () => {
      let mkdirCalls = 0;
      assert.throws(
        () => materialize(candidate, {
          makeDirectory() { mkdirCalls += 1; },
        }),
        /absolute|Starship root|lexical|normalize|\.\.|physical/iu,
      );
      assert.equal(mkdirCalls, 0, "invalid path must not cause any write");
    });
  }

  await t.test("rejects symlink intermediate before mkdir", () => {
    const fixture = freshFixtureWorkspace("hk-viz-artifact-root-alias-");
    const physical = join(fixture, "physical");
    const alias = join(fixture, "alias");
    mkdirSync(physical);
    symlinkSync(physical, alias, "dir");
    let mkdirCalls = 0;
    try {
      assert.throws(
        () => materialize(join(alias, "child"), {
          makeDirectory() { mkdirCalls += 1; },
        }),
        /symlink|alias|physical/iu,
      );
      assert.equal(mkdirCalls, 0, "symlink path must be rejected pre-write");
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });

  await t.test("captures physical post-materialization identity", () => {
    const fixture = freshFixtureWorkspace("hk-viz-artifact-root-valid-");
    const target = join(fixture, "child");
    try {
      const result = materialize(target);
      assert.equal(result.path, target);
      assert.equal(result.identity.path, target);
      assert.equal(result.identity.realpath, target);
      assert.equal(lstatSync(target).isDirectory(), true);
      assert.equal(lstatSync(target).isSymbolicLink(), false);
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });

  const runnerTestSource = readFileSync(
    join(
      "/Volumes/Starship/MAIS-hk-viz-labs-wt",
      "tests/e2e/run-hk-visualization-release-gate.test.mjs",
    ),
    "utf8",
  );
  assert.match(
    runnerTestSource,
    /materializeHkVisualizationRunnerTestArtifactRoot\([\s\S]{0,500}testArtifactRoot/iu,
  );
});

test("review repair module-root source resolution survives alternate cwd and stable reads reject symlink and oversize files", async (t) => {
  const runnerPath = join(
    "/Volumes/Starship/MAIS-hk-viz-labs-wt",
    "tests/e2e/run-hk-visualization-release-gate.mjs",
  );
  const alternateCwd = "/Volumes/Starship/MAIS-MVP";
  const help = spawnSync(process.execPath, [runnerPath, "--help"], {
    cwd: alternateCwd,
    encoding: "utf8",
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage: node tests\/e2e\/run-hk-visualization-release-gate\.mjs/);

  const imported = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `await import(${JSON.stringify(pathToFileURL(runnerPath).href)});`,
    ],
    { cwd: alternateCwd, encoding: "utf8" },
  );
  assert.equal(imported.status, 0, imported.stderr);

  const stableRead = hkVisualizationReleaseGateModule
    .readHkVisualizationBoundedStableRegularFile;
  const maxBytes = hkVisualizationReleaseGateModule
    .HK_VISUALIZATION_RELEASE_SOURCE_FILE_MAX_BYTES;
  assert.equal(typeof stableRead, "function");
  assert.equal(Number.isSafeInteger(maxBytes), true);
  assert.ok(maxBytes > 0);

  await t.test("symlink final entry", () => {
    const fixture = freshFixtureWorkspace("hk-viz-stable-read-symlink-");
    const target = join(fixture, "target.txt");
    const alias = join(fixture, "alias.txt");
    writeFileSync(target, "stable\n");
    symlinkSync(target, alias);
    try {
      assert.throws(() => stableRead(alias), /symlink|physical|no-follow/iu);
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });

  await t.test("oversize regular file", () => {
    const fixture = freshFixtureWorkspace("hk-viz-stable-read-oversize-");
    const oversized = join(fixture, "oversized.bin");
    writeFileSync(oversized, Buffer.alloc(maxBytes + 1));
    try {
      assert.throws(() => stableRead(oversized), /size|large|cap|bound/iu);
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });
});

test("second review TypeScript AST authority rejects every executable timeout API form without matching comments or strings", async (t) => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationStaticTestTimeoutTopology;
  const first = independentStaticReleaseTimeoutRows[0];
  const declaration =
    `test("${first.title}", async ({ browser }, testInfo) => {`;
  const cases = [
    {
      name: "file-level setTimeout",
      mutate(source) { return `test.setTimeout(120_000);\n${source}`; },
    },
    {
      name: "quoted configure with variable config",
      mutate(source) {
        return `const timeoutConfig = { "timeout": 120_000 };\ntest.describe["configure"](timeoutConfig);\n${source}`;
      },
    },
    {
      name: "parenthesized bracket slow",
      mutate(source) {
        return source.replace(
          declaration,
          `${declaration}\n    (test)["slow"]();`,
        );
      },
    },
    {
      name: "parenthesized testInfo setTimeout",
      mutate(source) {
        return source.replace(
          declaration,
          `${declaration}\n    (testInfo).setTimeout(120_000);`,
        );
      },
    },
    {
      name: "computed method",
      mutate(source) {
        return source.replace(
          declaration,
          `${declaration}\n    const timeoutMethod = "setTimeout";\n    test[timeoutMethod](120_000);`,
        );
      },
    },
    {
      name: "method alias",
      mutate(source) {
        return source.replace(
          declaration,
          `${declaration}\n    const timeoutApi = test.setTimeout;\n    timeoutApi(120_000);`,
        );
      },
    },
    {
      name: "object alias",
      mutate(source) {
        return source.replace(
          declaration,
          `${declaration}\n    const testAlias = test;\n    testAlias.slow();`,
        );
      },
    },
    {
      name: "destructured method",
      mutate(source) {
        return source.replace(
          declaration,
          `${declaration}\n    const { setTimeout: setTestTimeout } = test;\n    setTestTimeout(120_000);`,
        );
      },
    },
    {
      name: "destructured configure alias",
      mutate(source) {
        return `const { configure: configureDescribe } = test.describe;\nconst cfg = { timeout: 120_000 };\nconfigureDescribe(cfg);\n${source}`;
      },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const sourceByFile = independentStaticReleaseSources();
      sourceByFile[first.file] = invalid.mutate(sourceByFile[first.file]);
      assert.throws(
        () => validate({
          rows: structuredClone(independentStaticReleaseTimeoutRows),
          sourceByFile,
        }),
        /frozen|source|byte|SHA|drift|AST|executable|timeout|slow|configure|authority/iu,
      );
    });
  }

  await t.test("benign comments and strings remain AST-inert but frozen-byte rejected", () => {
    const sourceByFile = independentStaticReleaseSources();
    sourceByFile[first.file] = [
      '// test.setTimeout(999999); testInfo.slow();',
      'const timeoutWords = "test.describe.configure({ timeout: 999999 })";',
      sourceByFile[first.file],
    ].join("\n");
    assert.throws(
      () => validate({
        rows: structuredClone(independentStaticReleaseTimeoutRows),
        sourceByFile,
      }),
      /frozen|source|byte|SHA|drift/iu,
    );
  });
});

test("third review strict exact6 timeout-capability policy rejects higher-order and escaped references", async (t) => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationStaticTestTimeoutTopology;
  const first = independentStaticReleaseTimeoutRows[0];
  const declaration =
    `test("${first.title}", async ({ browser }, testInfo) => {`;
  const insert = (source, statement) => source.replace(
    declaration,
    `${declaration}\n    ${statement}`,
  );
  const cases = [
    {
      name: "call",
      mutate: (source) => insert(
        source,
        "test.setTimeout.call(test, 120_000);",
      ),
    },
    {
      name: "apply",
      mutate: (source) => insert(
        source,
        "testInfo.slow.apply(testInfo, []);",
      ),
    },
    {
      name: "bind",
      mutate: (source) => insert(
        source,
        "const boundTimeout = test.setTimeout.bind(test); boundTimeout(120_000);",
      ),
    },
    {
      name: "sequence",
      mutate: (source) => insert(
        source,
        "(0, test.setTimeout)(120_000);",
      ),
    },
    {
      name: "template-computed",
      mutate: (source) => insert(
        source,
        'test[`set${"Timeout"}`](120_000);',
      ),
    },
    {
      name: "computed destructure",
      mutate: (source) => insert(
        source,
        'const { [`set${"Timeout"}`]: computedTimeout } = test; computedTimeout(120_000);',
      ),
    },
    {
      name: "rest destructure",
      mutate: (source) => insert(
        source,
        "const { ...timeoutCarrier } = test; timeoutCarrier.slow();",
      ),
    },
    {
      name: "object boxing",
      mutate: (source) => insert(
        source,
        "const timeoutBox = { capability: test.setTimeout }; timeoutBox.capability(120_000);",
      ),
    },
    {
      name: "array boxing",
      mutate: (source) => insert(
        source,
        "const timeoutBox = [testInfo.slow]; timeoutBox[0]();",
      ),
    },
    {
      name: "returned alias",
      mutate: (source) => insert(
        source,
        "const getTimeout = () => test.setTimeout; getTimeout()(120_000);",
      ),
    },
    {
      name: "renamed TestInfo",
      mutate(source) {
        const renamedDeclaration = declaration.replace("testInfo", "info");
        return source.replace(
          declaration,
          `${renamedDeclaration}\n    info.setTimeout(120_000);`,
        );
      },
    },
    {
      name: "parameter flow",
      mutate: (source) => insert(
        source,
        "const invokeTimeout = (capability) => capability(120_000); invokeTimeout(test.setTimeout);",
      ),
    },
    {
      name: "bare property reference",
      mutate: (source) => insert(source, "void test.setTimeout;"),
    },
    {
      name: "returned helper capability",
      mutate(source) {
        return `function exact6TimeoutHelper() { return test.setTimeout; }\n${source}`;
      },
    },
    {
      name: "shadowed custom terminal",
      mutate(source) {
        return `{ const test = { slow() { return true; } }; test.slow(); }\n${source}`;
      },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const sourceByFile = independentStaticReleaseSources();
      sourceByFile[first.file] = invalid.mutate(sourceByFile[first.file]);
      assert.throws(
        () => validate({
          rows: structuredClone(independentStaticReleaseTimeoutRows),
          sourceByFile,
        }),
        /frozen|source|byte|SHA|drift|AST|capability|executable|reference|timeout|slow|configure|authority/iu,
      );
    });
  }

  await t.test("comments and strings remain AST-inert but frozen-byte rejected", () => {
    const sourceByFile = independentStaticReleaseSources();
    sourceByFile[first.file] = [
      "// const escaped = test.setTimeout.bind(test);",
      'const inertCapabilityText = "testInfo.slow.apply(testInfo, [])";',
      sourceByFile[first.file],
    ].join("\n");
    assert.throws(
      () => validate({
        rows: structuredClone(independentStaticReleaseTimeoutRows),
        sourceByFile,
      }),
      /frozen|source|byte|SHA|drift/iu,
    );
  });
});

test("third review stable reader refuses positive fake no-follow flags", async (t) => {
  const stableRead = hkVisualizationReleaseGateModule
    .readHkVisualizationBoundedStableRegularFile;
  const path = join(
    "/Volumes/Starship/MAIS-hk-viz-labs-wt",
    "tests/e2e/hk-visualization-release-title-manifest.mjs",
  );
  for (const fakeNoFollowFlag of [4, 8]) {
    await t.test(String(fakeNoFollowFlag), () => {
      assert.throws(
        () => stableRead(path, { noFollowFlag: fakeNoFollowFlag }),
        /O_NOFOLLOW|no-follow|platform|exact|flag/iu,
      );
    });
  }
});

test("fourth review structural whitelist rejects reflection, carrier escape, package alias, and lexical-shadow bypass", async (t) => {
  const validate = hkVisualizationReleaseGateModule
    .validateHkVisualizationStaticTestTimeoutTopology;
  const first = independentStaticReleaseTimeoutRows[0];
  const declaration =
    `test("${first.title}", async ({ browser }, testInfo) => {`;
  const insert = (source, statement) => source.replace(
    declaration,
    `${declaration}\n    ${statement}`,
  );
  const cases = [
    {
      name: "Reflect.get imported test",
      mutate: (source) => insert(
        source,
        'Reflect.get(test, "setTimeout")(120_000);',
      ),
    },
    {
      name: "Reflect.get TestInfo slow call",
      mutate: (source) => insert(
        source,
        'Reflect.get(testInfo, "slow").call(testInfo);',
      ),
    },
    {
      name: "Reflect.get TestInfo timeout call",
      mutate: (source) => insert(
        source,
        'Reflect.get(testInfo, "setTimeout").call(testInfo, 120_000);',
      ),
    },
    {
      name: "Reflect.get describe configure",
      mutate(source) {
        return `Reflect.get(test.describe, "configure")({ timeout: 120_000 });\n${source}`;
      },
    },
    {
      name: "property descriptor value",
      mutate: (source) => insert(
        source,
        'Object.getOwnPropertyDescriptor(test, "setTimeout")?.value.call(test, 120_000);',
      ),
    },
    {
      name: "array indexing key",
      mutate: (source) => insert(
        source,
        'Reflect.get(test, ["setTimeout"][0])(120_000);',
      ),
    },
    {
      name: "array join key",
      mutate: (source) => insert(
        source,
        'Reflect.get(test, ["set", "Timeout"].join(""))(120_000);',
      ),
    },
    {
      name: "String.raw key",
      mutate: (source) => insert(
        source,
        'Reflect.get(testInfo, String.raw`slow`).call(testInfo);',
      ),
    },
    {
      name: "whole imported test helper carrier",
      mutate: (source) => insert(
        source,
        'const acquireTimeout = (carrier) => Reflect.get(carrier, "setTimeout"); acquireTimeout(test)(120_000);',
      ),
    },
    {
      name: "whole TestInfo rest carrier",
      mutate: (source) => insert(
        source,
        'const { ...testInfoCarrier } = testInfo; Reflect.get(testInfoCarrier, "slow").call(testInfoCarrier);',
      ),
    },
    {
      name: "whole imported test spread carrier",
      mutate: (source) => insert(
        source,
        'const testCarrier = { ...test }; Reflect.get(testCarrier, "setTimeout")(120_000);',
      ),
    },
    {
      name: "stale global package test alias",
      mutate(source) {
        const importLine =
          'import { expect, test, type TestInfo } from "@playwright/test";';
        const packageDeclaration =
          '    test(`${regressionPackage.id} exercises every selected HK lab`, async ({ browser }, testInfo) => {';
        return source
          .replace(importLine, `${importLine}\nconst packageTestAlias = test;`)
          .replace(packageDeclaration, packageDeclaration.replace("test(", "packageTestAlias("));
      },
    },
    {
      name: "lexical shadow direct non-static callback bypass",
      mutate: (source) => insert(
        source,
        '{ const test = Object.assign(() => undefined, { slow() {} }); test(`custom-${Date.now()}`, async () => { test.slow(); }); }',
      ),
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const sourceByFile = independentStaticReleaseSources();
      sourceByFile[first.file] = invalid.mutate(sourceByFile[first.file]);
      assert.throws(
        () => validate({
          rows: structuredClone(independentStaticReleaseTimeoutRows),
          sourceByFile,
        }),
        /frozen|source|byte|SHA|drift|AST|structural|whitelist|imported test|TestInfo|reflection|carrier|package|alias|shadow|timeout/iu,
      );
    });
  }

  await t.test("comments and strings remain AST-inert but frozen-byte rejected", () => {
    const sourceByFile = independentStaticReleaseSources();
    sourceByFile[first.file] = [
      '// Reflect.get(test, "setTimeout")(120_000);',
      'const inertReflectionText = "Object.getOwnPropertyDescriptor(testInfo, slow)";',
      sourceByFile[first.file],
    ].join("\n");
    assert.throws(
      () => validate({
        rows: structuredClone(independentStaticReleaseTimeoutRows),
        sourceByFile,
      }),
      /frozen|source|byte|SHA|drift/iu,
    );
  });
});

test("second review every exact6 Playwright JSON test entry carries its own bounded resolved timeout", async (t) => {
  const exact6Entries = (report) => {
    const authority = new Set(
      independentStaticReleaseTimeoutRows.map(
        ({ file, title }) => `${file.split("/").at(-1)}\u0000${title}`,
      ),
    );
    return report.suites.flatMap((suite) =>
      suite.specs.flatMap((spec) =>
        authority.has(`${spec.file}\u0000${spec.title}`)
          ? spec.tests
          : [],
      ),
    );
  };
  const clean = passingReport();
  assert.equal(exact6Entries(clean).length, 6);
  assert.deepEqual(exact6Entries(clean).map(({ timeout }) => timeout), [
    120_000,
    120_000,
    120_000,
    120_000,
    120_000,
    120_000,
  ]);
  const cases = [
    {
      name: "missing",
      mutate(entry) { delete entry.timeout; },
    },
    {
      name: "string",
      mutate(entry) { entry.timeout = "120000"; },
    },
    {
      name: "zero",
      mutate(entry) { entry.timeout = 0; },
    },
    {
      name: "overcap",
      mutate(entry) { entry.timeout = 120_001; },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const report = passingReport();
      invalid.mutate(exact6Entries(report)[0]);
      assert.throws(
        () => validateReport(report),
        /exact6|test.*timeout|resolved.*timeout|120000|120_000/iu,
      );
    });
  }
});

test("second review source snapshots and pair receipts are cross-bound to the expected physical run workspace", async (t) => {
  const validateSnapshotWorkspace = hkVisualizationReleaseGateModule
    .validateHkVisualizationReleaseSourceSnapshotWorkspace;
  assert.equal(typeof validateSnapshotWorkspace, "function");
  const expectedWorkspace = "/Volumes/Starship/MAIS-hk-viz-labs-wt";
  const expectedManifest = buildHkVisualizationStarshipPathManifest({
    runId: "hk-viz-workspace-binding-fixture",
    workspace: expectedWorkspace,
  });
  const expectedIdentity = paintedGeometryValidatedSourceReceiptFixture(
    expectedWorkspace,
  ).before.workspaceIdentity;
  assert.doesNotThrow(() => validateSnapshotWorkspace(
    { workspaceIdentity: expectedIdentity },
    { expectedPathManifest: expectedManifest, expectedWorkspace },
  ));

  for (const field of ["dev", "ino", "realpath"]) {
    await t.test(`wrong ${field}`, () => {
      const identity = structuredClone(expectedIdentity);
      identity[field] = field === "realpath"
        ? "/Volumes/Starship/MAIS-MVP"
        : String(BigInt(identity[field]) + 1n);
      assert.throws(
        () => validateSnapshotWorkspace(
          { workspaceIdentity: identity },
          { expectedPathManifest: expectedManifest, expectedWorkspace },
        ),
        /workspace|identity|device|inode|realpath|drift/iu,
      );
    });
  }

  await t.test("same-device fully rehashed wrong Starship workspace", () => {
    const wrongWorkspace = freshFixtureWorkspace(
      "hk-viz-wrong-workspace-receipt-",
    );
    try {
      for (const path of independentReleaseExecutionSourcePaths) {
        const destination = join(wrongWorkspace, path);
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(
          destination,
          readFileSync(join(expectedWorkspace, path)),
        );
      }
      const wrongReceipt =
        paintedGeometryValidatedSourceReceiptFixture(wrongWorkspace);
      assert.throws(
        () => validatePaintedGeometryPairReport(
          passingReport(expectedWorkspace),
          wrongReceipt,
        ),
        /expected.*workspace|workspace.*mismatch|worktree|identity/iu,
      );
    } finally {
      rmSync(wrongWorkspace, { force: true, recursive: true });
    }
  });
});

test("second review stable reader requires no-follow, one link, and an expected-size-plus-one bounded loop", async (t) => {
  const stableRead = hkVisualizationReleaseGateModule
    .readHkVisualizationBoundedStableRegularFile;
  const runnerSource = readFileSync(
    join(
      "/Volumes/Starship/MAIS-hk-viz-labs-wt",
      "tests/e2e/run-hk-visualization-release-gate.mjs",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    runnerSource,
    /O_NOFOLLOW[^\n]*\?[^\n]*O_NOFOLLOW[^\n]*:\s*0/iu,
  );

  await t.test("unavailable O_NOFOLLOW", () => {
    const path = join(
      "/Volumes/Starship/MAIS-hk-viz-labs-wt",
      "tests/e2e/hk-visualization-release-title-manifest.mjs",
    );
    assert.throws(
      () => stableRead(path, { noFollowFlag: 0 }),
      /O_NOFOLLOW|no-follow|positive/iu,
    );
  });

  await t.test("hard link", () => {
    const fixture = freshFixtureWorkspace("hk-viz-stable-read-hardlink-");
    const source = join(fixture, "source.txt");
    const alias = join(fixture, "alias.txt");
    writeFileSync(source, "hard-link\n");
    linkSync(source, alias);
    try {
      assert.throws(() => stableRead(source), /link|nlink|one/iu);
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });

  await t.test("deterministic growth sentinel", () => {
    const fixture = freshFixtureWorkspace("hk-viz-stable-read-growth-");
    const source = join(fixture, "source.txt");
    writeFileSync(source, "1234");
    try {
      assert.throws(
        () => stableRead(source, {
          readChunk(_fd, buffer, offset, length) {
            buffer.fill(0x61, offset, offset + length);
            return length;
          },
        }),
        /grow|extra|sentinel|size|changed/iu,
      );
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });

  await t.test("deterministic short read", () => {
    const fixture = freshFixtureWorkspace("hk-viz-stable-read-short-");
    const source = join(fixture, "source.txt");
    writeFileSync(source, "1234");
    try {
      assert.throws(
        () => stableRead(source, { readChunk: () => 0 }),
        /short|size|changed|expected/iu,
      );
    } finally {
      rmSync(fixture, { force: true, recursive: true });
    }
  });
});

test("canonical workload deadline is a finite exact-count upper bound rather than an unbounded spawn", () => {
  const remainingTestCount =
    HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT -
    HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS[
      "tests/e2e/hk-visualization-machine-acceptance.spec.ts"
    ] -
    HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS[
      "tests/e2e/hk-visualization-lesson-embeddability.spec.ts"
  ];
  assert.equal(remainingTestCount, 125);
  assert.deepEqual(HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_TOPOLOGY, {
    packageCount: 216,
    packageSetupMs: 45_000,
    cellCount: 918,
    cellDeadlineMs: 105_000,
    cellOverheadMs: 5_000,
    dependentTransitionSequenceCount: 198,
    dependentTransitionSequenceDeadlineMs: 15_000,
  });
  assert.equal(HK_VISUALIZATION_MACHINE_PACKAGE_TIMEOUT_SUM_MS, 113_670_000);
  assert.equal(HK_VISUALIZATION_LESSON_PACKAGE_TIMEOUT_SUM_MS, 9_090_000);
  assert.equal(HK_VISUALIZATION_OTHER_TEST_TIMEOUT_CAP_MS, 300_000);
  assert.equal(
    HK_VISUALIZATION_OTHER_TEST_TIMEOUT_CAP_MS,
    HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
  );
  assert.deepEqual(HK_VISUALIZATION_NON_PACKAGE_TEST_TIMEOUT_TOPOLOGY, {
    fileCount: 7,
    testCount: 125,
    timeoutSumMs: 51_200_000,
  });
  assert.equal(
    HK_VISUALIZATION_NON_PACKAGE_TEST_TIMEOUT_SUM_MS,
    114 * 300_000 + 10 * 500_000 + 12_000_000,
  );
  assert.equal(
    hkVisualizationReleaseGateModule.HK_VISUALIZATION_STATIC_TEST_TIMEOUT_SUM_MS,
    720_000,
  );
  assert.equal(HK_VISUALIZATION_RELEASE_SETUP_TIMEOUT_MS, 1_080_000);
  assert.equal(
    hkVisualizationReleaseGateModule.HK_VISUALIZATION_RELEASE_INFRASTRUCTURE_TIMEOUT_MS,
    1_080_000,
  );
  assert.equal(HK_VISUALIZATION_SUPERVISOR_CLEANUP_GRACE_MS, 30_000);
  assert.equal(
    HK_VISUALIZATION_RELEASE_WORKLOAD_TIMEOUT_MS,
    113_670_000 + 9_090_000 + 51_200_000 + 720_000 + 1_080_000,
  );
  assert.equal(HK_VISUALIZATION_RELEASE_WORKLOAD_TIMEOUT_MS, 175_760_000);
  assert.ok(Number.isSafeInteger(HK_VISUALIZATION_RELEASE_WORKLOAD_TIMEOUT_MS));
});

test("canonical workload deadline is source-bound per title and never uses one blanket cap", () => {
  const runnerSource = readFileSync(
    join(process.cwd(), "tests/e2e/run-hk-visualization-release-gate.mjs"),
    "utf8",
  );
  const dynamicRangeSource = readFileSync(
    join(
      process.cwd(),
      "tests/e2e/hk-visualization-dynamic-range-microfixtures.spec.ts",
    ),
    "utf8",
  );

  assert.doesNotMatch(
    runnerSource,
    /remaining fixed test|remainingTestCount\s*\*\s*HK_VISUALIZATION_OTHER_TEST_TIMEOUT_CAP_MS/,
  );
  assert.match(
    runnerSource,
    /HK_VISUALIZATION_RELEASE_NON_PACKAGE_TEST_TIMEOUTS_BY_FILE/,
  );
  assert.match(
    dynamicRangeSource,
    /HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS/,
  );
  assert.doesNotMatch(
    dynamicRangeSource,
    /test\.describe\.configure\(\{\s*mode:\s*"serial",\s*timeout:\s*500_000\s*\}\)/,
  );
  const capCall = dynamicRangeSource.indexOf(
    "testInfo.setTimeout(\n      HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS",
  );
  const triangleWork = dynamicRangeSource.indexOf(
    "exerciseHkVisualizationDynamicRangeMicrofixtureInFreshPageChunks",
    dynamicRangeSource.indexOf(HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE),
  );
  assert.ok(capCall >= 0, "triangle must set its frozen cap explicitly");
  assert.ok(
    capCall < triangleWork,
    "triangle must set its frozen cap before preflight or browser work",
  );
  assert.match(
    dynamicRangeSource,
    /expect\(timeoutMs\)\.toBeLessThanOrEqual\(\s*HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS/,
  );

  const dynamicFile =
    "tests/e2e/hk-visualization-dynamic-range-microfixtures.spec.ts";
  const dynamicRows =
    HK_VISUALIZATION_RELEASE_NON_PACKAGE_TEST_TIMEOUTS_BY_FILE[dynamicFile];
  assert.equal(dynamicRows.length, 11);
  assert.deepEqual(
    dynamicRows.filter(
      ({ title }) => title === HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE,
    ),
    [
      {
        title: HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE,
        timeoutMs: HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TIMEOUT_CAP_MS,
      },
    ],
  );
  assert.equal(
    dynamicRows.filter(
      ({ title, timeoutMs }) =>
        title !== HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE &&
        timeoutMs === HK_VISUALIZATION_DYNAMIC_RANGE_DEFAULT_TIMEOUT_MS,
    ).length,
    10,
  );
  assert.deepEqual(
    validateHkVisualizationNonPackageTestTimeoutTopology(),
    HK_VISUALIZATION_NON_PACKAGE_TEST_TIMEOUT_TOPOLOGY,
  );

  const standardFiles = Object.keys(
    HK_VISUALIZATION_RELEASE_NON_PACKAGE_TEST_TIMEOUTS_BY_FILE,
  ).filter((file) => file !== dynamicFile);
  for (const file of standardFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    const timeoutCalls = [
      ...source.matchAll(/\b(?:test|testInfo)\.setTimeout\(\s*([0-9][0-9_]*)\s*\)/g),
    ];
    assert.equal(
      timeoutCalls.length,
      [...source.matchAll(/\b(?:test|testInfo)\.setTimeout\(/g)].length,
      `${file} must use only source-auditable literal test timeout overrides`,
    );
    for (const match of timeoutCalls) {
      const timeoutMs = Number(match[1].replaceAll("_", ""));
      assert.ok(
        timeoutMs <= HK_VISUALIZATION_RELEASE_STANDARD_TEST_TIMEOUT_CAP_MS,
        `${file} timeout ${timeoutMs} exceeds its per-title supervisor cap`,
      );
    }
  }
  const playwrightConfig = readFileSync(
    join(process.cwd(), "playwright.config.ts"),
    "utf8",
  );
  assert.match(
    playwrightConfig,
    /timeout:\s*process\.env\.CI\s*\?\s*120_000\s*:\s*60_000/,
  );
  assert.doesNotMatch(playwrightConfig, /\bglobalTimeout\s*:/);
});

test("non-package timeout topology rejects missing, reordered, retitled, and underbudget rows", () => {
  const clean = structuredClone(
    HK_VISUALIZATION_RELEASE_NON_PACKAGE_TEST_TIMEOUTS_BY_FILE,
  );
  const dynamicFile =
    "tests/e2e/hk-visualization-dynamic-range-microfixtures.spec.ts";
  const triangleIndex = clean[dynamicFile].findIndex(
    ({ title }) => title === HK_VISUALIZATION_DYNAMIC_RANGE_TRIANGLE_TITLE,
  );
  assert.ok(triangleIndex >= 0);

  const missingFile = structuredClone(clean);
  delete missingFile["tests/e2e/hk-visualization-non-hk-order.spec.ts"];
  assert.throws(
    () => validateHkVisualizationNonPackageTestTimeoutTopology(missingFile),
    /timeout files drifted/,
  );

  const reordered = structuredClone(clean);
  [reordered[dynamicFile][0], reordered[dynamicFile][1]] = [
    reordered[dynamicFile][1],
    reordered[dynamicFile][0],
  ];
  assert.throws(
    () => validateHkVisualizationNonPackageTestTimeoutTopology(reordered),
    /timeout row drifted/,
  );

  const retitled = structuredClone(clean);
  retitled[dynamicFile][0].title = `${retitled[dynamicFile][0].title} drift`;
  assert.throws(
    () => validateHkVisualizationNonPackageTestTimeoutTopology(retitled),
    /timeout row drifted/,
  );

  const underbudgetTriangle = structuredClone(clean);
  underbudgetTriangle[dynamicFile][triangleIndex].timeoutMs =
    HK_VISUALIZATION_DYNAMIC_RANGE_DEFAULT_TIMEOUT_MS;
  assert.throws(
    () =>
      validateHkVisualizationNonPackageTestTimeoutTopology(
        underbudgetTriangle,
      ),
    /dynamic-range timeout topology drifted/,
  );

  const underbudgetStandard = structuredClone(clean);
  underbudgetStandard[
    "tests/e2e/hk-visualization-state-isolation.spec.ts"
  ][0].timeoutMs = 1;
  assert.throws(
    () =>
      validateHkVisualizationNonPackageTestTimeoutTopology(
        underbudgetStandard,
      ),
    /standard timeout topology drifted/,
  );
});

test("collision release topology locks the four geometry titles and scrollport replacement", () => {
  const file =
    "tests/e2e/hk-visualization-collision-microfixtures.spec.ts";
  const titles = HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES[file];
  assert.equal(HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNTS[file], 44);
  assert.equal(HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT, 371);
  assert.deepEqual(titles.slice(5, 9), [
    "distinguishes painted line and polyline strokes from empty bounding-box regions",
    "distinguishes rect strokes and circle fills from their empty bounding-box regions",
    "uses transformed multi-segment path paint instead of its screen bounding box",
    "keeps geometry checks compatible with clipping, root-self surfaces, and unsupported marks",
  ]);
  assert.equal(
    titles[28],
    "clips off-scrollport SVG collision candidates before and after horizontal scroll",
  );
  assert.equal(
    titles.includes("allows learner text reachable at a horizontal scroll end"),
    false,
  );
});

test("all static release spec titles stay byte-for-byte aligned with release evidence", () => {
  for (const file of [
    "tests/e2e/hk-visualization-contrast-microfixtures.spec.ts",
    "tests/e2e/hk-visualization-interaction-microfixtures.spec.ts",
    "tests/e2e/hk-visualization-dynamic-range-microfixtures.spec.ts",
    "tests/e2e/hk-visualization-non-hk-order.spec.ts",
  ]) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    const sourceTitles = [...source.matchAll(/\btest\(\s*"([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(
      sourceTitles,
      HK_VISUALIZATION_RELEASE_EXPECTED_TEST_TITLES[file],
      file,
    );
  }
});

test("canonical first test explicitly boots the worker-scoped browser before per-test profile receipts", () => {
  const source = readFileSync(
    join(
      process.cwd(),
      "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    ),
    "utf8",
  );
  assert.match(
    source,
    /test\(\s*"matrix manifest is complete for the requested scope"\s*,\s*async\s*\(\s*\{\s*browser\s*\}\s*,\s*testInfo\s*\)/,
  );
  assert.match(source, /expect\(browser\)\.toBeTruthy\(\)/);
});

test("canonical release disables ffmpeg-dependent video without weakening trace or screenshot evidence", () => {
  const runnerSource = readFileSync(
    join(process.cwd(), "tests/e2e/run-hk-visualization-release-gate.mjs"),
    "utf8",
  );
  const configSource = readFileSync(
    join(process.cwd(), "playwright.config.ts"),
    "utf8",
  );

  assert.match(
    runnerSource,
    /HK_VISUALIZATION_CANONICAL_RELEASE:\s*"1"/u,
  );
  assert.match(
    configSource,
    /const\s+hkVisualizationCanonicalRelease\s*=\s*process\.env\.HK_VISUALIZATION_CANONICAL_RELEASE\s*===\s*"1"/u,
  );
  assert.match(
    configSource,
    /trace:\s*"retain-on-failure"[\s\S]{0,160}screenshot:\s*"only-on-failure"[\s\S]{0,160}video:\s*hkVisualizationCanonicalRelease\s*\?\s*"off"\s*:\s*"retain-on-failure"/u,
  );
});

test("workload supervisor launcher binds the exact Starship manifest, command, log, and cross-validated receipt", () => {
  const workspace = freshFixtureWorkspace("hk-viz-supervised-launcher-");
  try {
    prepareRunnableFixtureWorkspace(workspace);
    const plan = buildHkVisualizationReleasePlan({
      cwd: workspace,
      environment: {},
      now: new Date("2026-08-11T00:00:00.000Z"),
    });
    mkdirSync(dirname(plan.pathManifest.pathManifestFile), { recursive: true });
    writeFileSync(
      plan.pathManifest.pathManifestFile,
      `${JSON.stringify(plan.pathManifest, null, 2)}\n`,
    );
    materializeFixturePlanTsconfig(plan);
    let launchCount = 0;
    const result = executeHkVisualizationSupervisedWorkload({
      plan,
      spawnSupervisor(command, args, options) {
        launchCount += 1;
        assert.equal(command, process.execPath);
        assert.match(args[0], /hk-visualization-workload-supervisor\.mjs$/);
        assert.equal(options.cwd, workspace);
        assert.equal(options.env, plan.childEnvironment);
        assert.equal(options.killSignal, "SIGTERM");
        assert.equal(
          options.timeout,
          HK_VISUALIZATION_RELEASE_WORKLOAD_TIMEOUT_MS +
            HK_VISUALIZATION_SUPERVISOR_CLEANUP_GRACE_MS,
        );
        assert.equal(options.stdio[0], "ignore");
        assert.equal(Number.isSafeInteger(options.stdio[1]), true);
        assert.equal(options.stdio[2], options.stdio[1]);
        const afterSeparator = args.slice(args.indexOf("--") + 1);
        assert.deepEqual(afterSeparator, [plan.command, ...plan.args]);
        assert.equal(
          requiredArgumentValue(args, "--next-tsconfig-sha256"),
          plan.nextTsconfigSha256,
        );
        assert.equal(
          readFileSync(plan.pathManifest.workloadSupervisorStartPath, "utf8"),
          "start\n",
        );
        writeGreenWorkloadSupervisorEvidence({
          deadlineEpochMs: Number(
            requiredArgumentValue(args, "--deadline-epoch-ms"),
          ),
          plan,
        });
        return { status: 0, signal: null };
      },
    });
    assert.equal(launchCount, 1);
    assert.equal(result.status, 0);
    assert.equal(result.receipt.status, "complete");
    assert.equal(
      result.receiptPath,
      plan.pathManifest.workloadSupervisorReceiptPath,
    );
    assert.equal(result.logPath, plan.pathManifest.workloadSupervisorLogPath);
    assert.match(result.receiptSha256, /^[a-f0-9]{64}$/);
    assert.match(result.logSha256, /^[a-f0-9]{64}$/);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("workload supervisor launcher rejects status-zero executions with missing, corrupt, or valid RED receipt evidence", () => {
  for (const fixture of [
    {
      label: "missing",
      write() {},
      pattern: /did not preserve valid evidence|ENOENT/i,
    },
    {
      label: "corrupt",
      write(plan) {
        writeFileSync(plan.pathManifest.workloadSupervisorReceiptPath, "{truncated");
      },
      pattern: /did not preserve valid evidence|JSON/i,
    },
    {
      label: "red",
      write(plan, args) {
        const { receipt } = writeGreenWorkloadSupervisorEvidence({
          deadlineEpochMs: Number(
            requiredArgumentValue(args, "--deadline-epoch-ms"),
          ),
          plan,
        });
        writeFileSync(
          plan.pathManifest.workloadSupervisorReceiptPath,
          `${JSON.stringify({
            ...receipt,
            errors: ["owned workload remained active"],
            status: "failed",
          })}\n`,
        );
      },
      pattern: /supervised workload failed.*receiptStatus=failed/i,
    },
  ]) {
    const workspace = freshFixtureWorkspace(
      `hk-viz-supervised-launcher-${fixture.label}-`,
    );
    try {
      prepareRunnableFixtureWorkspace(workspace);
      const plan = buildHkVisualizationReleasePlan({
        cwd: workspace,
        environment: {},
        now: new Date("2026-08-11T00:00:00.000Z"),
      });
      mkdirSync(dirname(plan.pathManifest.pathManifestFile), { recursive: true });
      writeFileSync(
        plan.pathManifest.pathManifestFile,
        `${JSON.stringify(plan.pathManifest, null, 2)}\n`,
      );
      materializeFixturePlanTsconfig(plan);
      assert.throws(
        () =>
          executeHkVisualizationSupervisedWorkload({
            plan,
            spawnSupervisor(_command, args) {
              fixture.write(plan, args);
              return { status: 0, signal: null };
            },
          }),
        fixture.pattern,
        fixture.label,
      );
    } finally {
      rmSync(workspace, { force: true, recursive: true });
    }
  }
});

test("sixth review pre-run guard rejects pre-corrupted exact2 and stale current45 snapshots before spawn", async (t) => {
  await t.test("alternate-workspace exact2 is corrupted after import and before run", () => {
    const workspace = freshFixtureWorkspace("hk-viz-exact2-precorrupt-");
    const monitorHarness = buildRunnerMonitorHarness();
    let spawnCount = 0;
    try {
      prepareRunnableFixtureWorkspace(workspace);
      const machinePath = join(
        workspace,
        independentStaticDeadlineSourceRows[0].path,
      );
      writeFileSync(machinePath, `${readFileSync(machinePath, "utf8")} `);
      const error = captureThrownError(
        () => runHkVisualizationReleaseGate({
          argv: [],
          cwd: workspace,
          environment: {},
          now: new Date("2026-08-21T00:00:00.000Z"),
          sampleActiveProfiles: () => completeProfileProcessSample(),
          ...fixtureReleaseEvidenceSeams,
          ...monitorHarness,
          armReleaseSourceExecutionMonitor() {
            return controlledReleaseSourceExecutionMonitor();
          },
          spawn(_command, _args, options) {
            spawnCount += 1;
            writePassingRunnerArtifacts(workspace, options);
            return { status: 0, signal: null };
          },
        }),
        /exact2|frozen|deadline|source|byte|SHA|execution/iu,
      );
      assert.equal(error.message.includes(workspace), false);
      assert.equal(spawnCount, 0, "pre-corrupted exact2 must never spawn");
    } finally {
      rmSync(workspace, { force: true, recursive: true });
    }
  });

  await t.test("earlier required source changes after a stale capture", () => {
    const workspace = freshFixtureWorkspace("hk-viz-current45-stale-");
    const monitorHarness = buildRunnerMonitorHarness();
    let captureCount = 0;
    let spawnCount = 0;
    try {
      prepareRunnableFixtureWorkspace(workspace);
      const earlierPath = join(workspace, "data/topics.ts");
      captureThrownError(
        () => runHkVisualizationReleaseGate({
          argv: [],
          cwd: workspace,
          environment: {},
          now: new Date("2026-08-21T00:01:00.000Z"),
          sampleActiveProfiles: () => completeProfileProcessSample(),
          ...fixtureReleaseEvidenceSeams,
          ...monitorHarness,
          armReleaseSourceExecutionMonitor() {
            return controlledReleaseSourceExecutionMonitor();
          },
          captureSourceSnapshot(options) {
            const snapshot =
              captureHkVisualizationReleaseSourceSnapshot(options);
            captureCount += 1;
            if (captureCount === 1) {
              writeFileSync(
                earlierPath,
                `${readFileSync(earlierPath, "utf8")} // stale-after-read\n`,
              );
            }
            return snapshot;
          },
          spawn(_command, _args, options) {
            spawnCount += 1;
            writePassingRunnerArtifacts(workspace, options);
            return { status: 0, signal: null };
          },
        }),
        /current|source|snapshot|execution|SHA|drift|changed/iu,
      );
      assert.equal(spawnCount, 0, "stale current45 snapshot must never spawn");
    } finally {
      rmSync(workspace, { force: true, recursive: true });
    }
  });
});

test("sixth review execution guard order is arm then sourceBefore then current45 preflights then spawn", () => {
  const workspace = freshFixtureWorkspace("hk-viz-execution-order-");
  const monitorHarness = buildRunnerMonitorHarness();
  const sourceEvents = [];
  let captureCount = 0;
  try {
    prepareRunnableFixtureWorkspace(workspace);
    runHkVisualizationReleaseGate({
      argv: [],
      cwd: workspace,
      environment: {},
      now: new Date("2026-08-21T00:02:00.000Z"),
      sampleActiveProfiles: () => completeProfileProcessSample(),
      ...fixtureReleaseEvidenceSeams,
      ...monitorHarness,
      armReleaseSourceExecutionMonitor() {
        sourceEvents.push("guard-arm");
        return controlledReleaseSourceExecutionMonitor();
      },
      captureSourceSnapshot(options) {
        captureCount += 1;
        if (captureCount === 1) sourceEvents.push("source-before");
        return captureHkVisualizationReleaseSourceSnapshot(options);
      },
      validateReleaseSourceExecutionStart(snapshot, options) {
        sourceEvents.push(options.phase);
        const validate = hkVisualizationReleaseGateModule
          .validateHkVisualizationReleaseSourceExecutionStart;
        return typeof validate === "function"
          ? validate(snapshot, options)
          : null;
      },
      spawn(_command, _args, options) {
        sourceEvents.push("spawn");
        writePassingRunnerArtifacts(workspace, options);
        return { status: 0, signal: null };
      },
    });
    assert.deepEqual(sourceEvents.slice(0, 5), [
      "guard-arm",
      "source-before",
      "after-source-before",
      "immediately-before-spawn",
      "spawn",
    ]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("sixth review continuous monitor rejects transient required-source restore and atomic swap", async (t) => {
  for (const mutation of ["write-restore", "rename-swap-restore"]) {
    await t.test(mutation, () => {
      const workspace = freshFixtureWorkspace(
        `hk-viz-transient-source-${mutation}-`,
      );
      const monitorHarness = buildRunnerMonitorHarness();
      const requiredPath = join(workspace, "data/topics.ts");
      let monitorControl = null;
      let workerExecutedMutatedBytes = false;
      try {
        prepareRunnableFixtureWorkspace(workspace);
        assert.throws(
          () => runHkVisualizationReleaseGate({
            argv: [],
            cwd: workspace,
            environment: {},
            now: new Date("2026-08-21T00:03:00.000Z"),
            sampleActiveProfiles: () => completeProfileProcessSample(),
            ...fixtureReleaseEvidenceSeams,
            ...monitorHarness,
            armReleaseSourceExecutionMonitor() {
              monitorControl = controlledReleaseSourceExecutionMonitor();
              return monitorControl;
            },
            spawn(_command, _args, options) {
              writePassingRunnerArtifacts(workspace, options);
              const original = readFileSync(requiredPath);
              if (mutation === "write-restore") {
                writeFileSync(requiredPath, "// transient required source\n");
                workerExecutedMutatedBytes =
                  readFileSync(requiredPath, "utf8").includes("transient");
                monitorControl?.emitChange();
                writeFileSync(requiredPath, original);
              } else {
                const backup = `${requiredPath}.execution-window-backup`;
                renameSync(requiredPath, backup);
                writeFileSync(requiredPath, "// transient swapped source\n");
                workerExecutedMutatedBytes =
                  readFileSync(requiredPath, "utf8").includes("swapped");
                monitorControl?.emitChange();
                rmSync(requiredPath);
                renameSync(backup, requiredPath);
              }
              return { status: 0, signal: null };
            },
          }),
          /execution|monitor|transient|required source|event|changed/iu,
        );
        assert.equal(workerExecutedMutatedBytes, true);
        assert.equal(monitorControl?.closed, true, "watchers must close in finally");
      } finally {
        rmSync(workspace, { force: true, recursive: true });
      }
    });
  }
});

test("sixth review real fs.watch integration observes write restore and atomic swap restore", async (t) => {
  const arm = hkVisualizationReleaseGateModule
    .armHkVisualizationReleaseSourceExecutionMonitor;
  assert.equal(typeof arm, "function");
  for (const mutation of ["write-restore", "rename-swap-restore"]) {
    await t.test(mutation, () => {
      const workspace = freshFixtureWorkspace(
        `hk-viz-real-source-watch-${mutation}-`,
      );
      const relativePath = "watched-source.ts";
      const watchedPath = join(workspace, relativePath);
      writeFileSync(watchedPath, "// original\n");
      const monitor = arm({
        workspace,
        testOnlyRequiredSourcePaths: [relativePath],
      });
      try {
        assert.deepEqual(monitor.receipt(), {
          coveredPathCount: 1,
          directoryWatcherCount: 0,
          earlyCloseCount: 0,
          errorCount: 0,
          eventCount: 0,
          fileWatcherCount: 1,
          nullFilenameEventCount: 0,
          status: "clean",
          watcherCount: 1,
        });
        const original = readFileSync(watchedPath);
        if (mutation === "write-restore") {
          writeFileSync(watchedPath, "// transient\n");
          writeFileSync(watchedPath, original);
        } else {
          const backup = `${watchedPath}.execution-window-backup`;
          renameSync(watchedPath, backup);
          writeFileSync(watchedPath, "// transient swapped source\n");
          rmSync(watchedPath);
          renameSync(backup, watchedPath);
        }
        monitor.drain();
        assert.throws(
          () => monitor.assertClean("real-temp-watcher"),
          /execution|monitor|event|transient|source/iu,
        );
      } finally {
        monitor.close();
        rmSync(workspace, { force: true, recursive: true });
      }
    });
  }
});

test("sixth review unavailable, errored, or early-closed source watchers fail before spawn", async (t) => {
  for (const failure of ["unavailable", "error", "early-close"]) {
    await t.test(failure, () => {
      const workspace = freshFixtureWorkspace(
        `hk-viz-source-watch-${failure}-`,
      );
      const monitorHarness = buildRunnerMonitorHarness();
      let spawnCount = 0;
      try {
        prepareRunnableFixtureWorkspace(workspace);
        assert.throws(
          () => runHkVisualizationReleaseGate({
            argv: [],
            cwd: workspace,
            environment: {},
            now: new Date("2026-08-21T00:04:00.000Z"),
            sampleActiveProfiles: () => completeProfileProcessSample(),
            ...fixtureReleaseEvidenceSeams,
            ...monitorHarness,
            armReleaseSourceExecutionMonitor() {
              if (failure === "unavailable") {
                throw new Error("fs.watch unavailable");
              }
              return {
                assertClean() {
                  throw new Error(
                    failure === "error"
                      ? "source watcher error"
                      : "source watcher closed early",
                  );
                },
                close() {
                  return {
                    coveredPathCount: 45,
                    directoryWatcherCount: 0,
                    earlyCloseCount: failure === "early-close" ? 1 : 0,
                    errorCount: failure === "error" ? 1 : 0,
                    eventCount: 0,
                    fileWatcherCount: 45,
                    nullFilenameEventCount: 0,
                    status: "violated",
                    watcherCount: 45,
                  };
                },
                drain() {},
              };
            },
            spawn(_command, _args, options) {
              spawnCount += 1;
              writePassingRunnerArtifacts(workspace, options);
              return { status: 0, signal: null };
            },
          }),
          /watch|unavailable|error|closed early|execution|source/iu,
        );
        assert.equal(spawnCount, 0);
      } finally {
        rmSync(workspace, { force: true, recursive: true });
      }
    });
  }
});

test("canonical runner uses the workload supervisor path when no direct test seam is injected", () => {
  const workspace = freshFixtureWorkspace("hk-viz-canonical-supervisor-");
  const monitorHarness = buildRunnerMonitorHarness();
  let supervisedCount = 0;
  try {
    prepareRunnableFixtureWorkspace(workspace);
    const result = runHkVisualizationReleaseGate({
      argv: [],
      cwd: workspace,
      environment: {},
      now: new Date("2026-08-11T00:00:00.000Z"),
      sampleActiveProfiles: () => completeProfileProcessSample(),
      ...fixtureReleaseEvidenceSeams,
      ...monitorHarness,
          superviseWorkload({ plan }) {
            supervisedCount += 1;
        const report = passingReport(workspace, plan.pathManifest);
        writeFileSync(plan.jsonReport, JSON.stringify(report));
            writeFileSync(
              plan.pathManifest.runtimeProfileReceiptPath,
              JSON.stringify(runtimeReceiptByReport.get(report)),
            );
            rmSync(plan.pathManifest.nextTsconfigPath);
            return {
          status: 0,
          signal: null,
          receiptPath: plan.pathManifest.workloadSupervisorReceiptPath,
          receiptSha256: "a".repeat(64),
          logPath: plan.pathManifest.workloadSupervisorLogPath,
          logSha256: "b".repeat(64),
        };
      },
    });
    assert.equal(supervisedCount, 1);
    assert.equal(
      result.workloadSupervisorReceiptPath,
      result.plan.actualPaths.workloadSupervisorReceiptPath,
    );
    assert.equal(result.workloadSupervisorReceiptSha256, "a".repeat(64));
    assert.equal(result.workloadSupervisorLogSha256, "b".repeat(64));
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("runner executes only the fixed plan, validates its report, and restores generated next-env drift", () => {
  const workspace = freshFixtureWorkspace("hk-viz-release-runner-");
  let processTableReadCount = 0;
  const events = [];
  const monitorHarness = buildRunnerMonitorHarness({ events });
  try {
    const { canonicalNextEnv, nextEnv, playwright } =
      prepareRunnableFixtureWorkspace(workspace);

    const result = runHkVisualizationReleaseGate({
      argv: [],
      cwd: workspace,
      environment: {},
      now: new Date("2026-08-09T12:34:56.000Z"),
      sampleActiveProfiles: () => {
        processTableReadCount += 1;
        return completeProfileProcessSample();
      },
      ...fixtureReleaseEvidenceSeams,
      ...monitorHarness,
      spawn(command, args, options) {
        events.push("playwright");
        assert.equal(command, process.execPath);
        assert.equal(args[0], playwright);
        assert.deepEqual(
          args.slice(1, 2 + HK_VISUALIZATION_RELEASE_SPECS.length),
          ["test", ...HK_VISUALIZATION_RELEASE_SPECS],
        );
        assert.equal(options.cwd, workspace);
        assert.equal(options.env.HK_MATH_STORAGE_PROVIDER, "sqlite");
        assert.equal(options.env.PLAYWRIGHT_SKIP_WEBSERVER, undefined);
        assert.equal(options.env.PLAYWRIGHT_BASE_URL, "http://127.0.0.1:3020");
        assert.equal(options.env.PLAYWRIGHT_PORT, "3020");
        assert.deepEqual(
          readFileSync(options.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH),
          buildHkVisualizationCanonicalE2eTsconfigBytes({
            workspace,
            nextDistDir: options.env.PLAYWRIGHT_NEXT_DIST_DIR,
          }),
        );
        assert.equal(
          lstatSync(options.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH).mode & 0o777,
          0o600,
        );
        rmSync(nextEnv);
        mkdirSync(dirname(options.env.PLAYWRIGHT_JSON_OUTPUT_FILE), {
          recursive: true,
        });
        const pathManifest = JSON.parse(
          readFileSync(options.env.PLAYWRIGHT_PATH_MANIFEST_FILE, "utf8"),
        );
        const report = passingReport(workspace, pathManifest);
        writeFileSync(
          options.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
          JSON.stringify(report),
        );
        writeFileSync(
          pathManifest.runtimeProfileReceiptPath,
          JSON.stringify(runtimeReceiptByReport.get(report)),
        );
        return { status: 0, signal: null };
      },
    });

    assert.equal(result.dryRun, false);
    assert.equal(
      result.evidence.expectedTestCount,
      HK_VISUALIZATION_RELEASE_EXPECTED_TEST_COUNT,
    );
    assert.equal(readFileSync(nextEnv, "utf8"), canonicalNextEnv);
    const canonicalNextEnvSha256 = createHash("sha256")
      .update(canonicalNextEnv)
      .digest("hex");
    assert.equal(result.nextEnvPath, nextEnv);
    assert.equal(result.nextEnvBeforeSha256, canonicalNextEnvSha256);
    assert.equal(result.nextEnvAfterSha256, canonicalNextEnvSha256);
    assert.deepEqual(events, [
      "monitor-start",
      "playwright",
      "monitor-stop",
      "monitor-exit",
    ]);
    assert.equal(
      existsSync(result.plan.actualPaths.nextTsconfigPath),
      false,
      "The outer runner must remove only its exact run-specific root tsconfig after workers exit.",
    );
    assert.match(result.globalProfileMonitorReceiptSha256, /^[a-f0-9]{64}$/);
    assert.equal(
      result.globalProfileMonitorReceiptPath,
      result.plan.actualPaths.globalProfileMonitorReceiptPath,
    );
    assert.equal(
      processTableReadCount,
      2,
      "The outer runner must enforce both preflight and postflight process hygiene.",
    );
    assert.equal(
      result.releaseSourceReceiptPath,
      result.plan.actualPaths.releaseSourceReceiptPath,
    );
    const releaseSourceReceiptBytes = readFileSync(
      result.releaseSourceReceiptPath,
    );
    assert.equal(
      result.releaseSourceReceiptSha256,
      sha256(releaseSourceReceiptBytes),
    );
    assert.equal(
      lstatSync(result.releaseSourceReceiptPath).mode & 0o777,
      0o600,
    );
    assert.equal(
      lstatSync(result.plan.actualPaths.pathManifestFile).mode & 0o777,
      0o600,
    );
    const releaseSourceReceipt = JSON.parse(
      releaseSourceReceiptBytes.toString("utf8"),
    );
    assert.equal(
      releaseSourceReceipt.schemaVersion,
      HK_VISUALIZATION_RELEASE_SOURCE_RECEIPT_SCHEMA,
    );
    assert.deepEqual(
      releaseSourceReceipt.requiredSourcePaths,
      HK_VISUALIZATION_RELEASE_REQUIRED_SOURCE_PATHS,
    );
    assert.deepEqual(
      releaseSourceReceipt.requiredSourcePaths,
      independentReleaseExecutionSourcePaths,
    );
    assert.deepEqual(
      releaseSourceReceipt.releaseSourceExecution.executionStartSourceRows
        .map(({ path }) => path),
      independentReleaseExecutionSourcePaths,
    );
    assert.equal(
      releaseSourceReceipt.releaseSourceExecution.monitorReceipt.eventCount,
      0,
    );
    assert.equal(
      releaseSourceReceipt.releaseSourceExecution.monitorReceipt.status,
      "clean",
    );
    assert.deepEqual(
      releaseSourceReceipt.releaseSourceExecution.monitorReceipt.policy,
      independentReleaseSourceMonitorPolicy,
    );
    assert.deepEqual(
      releaseSourceReceipt.staticDeadlineSourceRows,
      independentStaticDeadlineSourceRows,
    );
    assert.equal(
      releaseSourceReceipt.staticDeadlineSourceAggregateSha256,
      independentStaticDeadlineSourceAggregateSha256,
    );
    assert.equal(releaseSourceReceipt.comparison.equal, true);
    assert.equal(releaseSourceReceipt.dependencyComparison.equal, true);
    for (const phase of ["before", "after"]) {
      const artifact = result.releaseDependencyFullManifestArtifacts[phase];
      assert.equal(artifact.path.startsWith(`${result.plan.artifactRoot}/`), true);
      assert.equal(lstatSync(artifact.path).mode & 0o777, 0o600);
      assert.equal(artifact.sha256, sha256(readFileSync(artifact.path)));
      assert.equal(
        artifact.sha256,
        releaseSourceReceipt[`dependency${phase[0].toUpperCase()}${phase.slice(1)}`]
          .fullManifestArtifact.sha256,
      );
    }
    assert.equal(
      JSON.stringify(releaseSourceReceipt).includes(
        result.releaseDependencyFullManifestArtifacts.before.path,
      ),
      false,
      "The summary receipt must retain a fingerprint, not the raw full-manifest path.",
    );
    assert.deepEqual(
      Object.keys(releaseSourceReceipt.managedToolchainIdentity).sort(),
      ["nextBuildScript", "nextCli", "nodeExecutable"],
    );
    const privacySafeToolchain = releaseSourceReceipt.before.toolchain;
    assert.deepEqual(
      privacySafeToolchain.map(({ name }) => name),
      ["next-clean-build", "next-cli", "node", "playwright-test-cli"],
    );
    assert.equal(
      JSON.stringify(privacySafeToolchain).includes(playwright),
      false,
      "The exact source toolchain receipt must fingerprint paths instead of retaining raw executable paths.",
    );
    assert.equal(
      releaseSourceReceipt.before.sourceAggregateSha256,
      releaseSourceReceipt.after.sourceAggregateSha256,
    );
    assert.equal(
      result.releaseSourceEvidence.sourceAggregateSha256,
      releaseSourceReceipt.before.sourceAggregateSha256,
    );
    assert.deepEqual(
      result.releaseSourceEvidence.staticDeadlineSourceEvidence.sourceRows,
      independentStaticDeadlineSourceRows,
    );
    assert.deepEqual(
      result.releaseSourceEvidence.staticDeadlineSourceEvidence
        .executionStartSourceRows.map(({ path }) => path),
      independentReleaseExecutionSourcePaths,
    );
    assert.equal(
      result.releaseSourceEvidence.staticDeadlineSourceEvidence
        .executionStartSourceAggregateSha256,
      releaseSourceReceipt.releaseSourceExecution
        .executionStartSourceAggregateSha256,
    );
    assert.equal(
      result.releaseSourceEvidence.staticDeadlineSourceEvidence
        .sourceAggregateSha256,
      independentStaticDeadlineSourceAggregateSha256,
    );
    assert.equal(
      result.evidence.staticDeadlineSourceEvidence.runAggregateHash,
      result.releaseSourceEvidence.staticDeadlineSourceEvidence
        .runAggregateHash,
    );
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("runner fails closed when release source or physical dependency bytes drift during the workload", () => {
  for (const fixture of [
    {
      label: "source",
      mutate(workspace) {
        writeFileSync(
          join(workspace, "data", "topics.ts"),
          "// source drift during release workload\n",
        );
      },
      pattern: /release source (?:changed|execution monitor)/i,
    },
    {
      label: "dependency",
      mutate(workspace) {
        writeFileSync(
          join(workspace, "node_modules", "release-drift-sentinel.txt"),
          "dependency drift during release workload\n",
        );
      },
      pattern: /dependency closure changed/i,
    },
  ]) {
    const workspace = freshFixtureWorkspace(
      `hk-viz-release-${fixture.label}-drift-`,
    );
    const monitorHarness = buildRunnerMonitorHarness();
    try {
      prepareRunnableFixtureWorkspace(workspace);
      const error = captureThrownError(
        () =>
          runHkVisualizationReleaseGate({
            argv: [],
            cwd: workspace,
            environment: {},
            now: new Date("2026-08-12T12:34:56.000Z"),
            sampleActiveProfiles: () => completeProfileProcessSample(),
            ...fixtureReleaseEvidenceSeams,
            ...monitorHarness,
            spawn(_command, _args, options) {
              writePassingRunnerArtifacts(workspace, options);
              fixture.mutate(workspace);
              return { status: 0, signal: null };
            },
          }),
        fixture.pattern,
      );
      assert.equal(
        error.message.includes(workspace),
        false,
        `${fixture.label} drift diagnostics must not expose the raw fixture root`,
      );
    } finally {
      rmSync(workspace, { force: true, recursive: true });
    }
  }
});

test("runner rejects a zero-exit child when its runtime receipt is missing, malformed, or records an observation error", () => {
  for (const fixture of [
    {
      label: "missing",
      mutate() {},
      pattern: /receipt was not written/,
    },
    {
      label: "malformed",
      mutate({ pathManifest }) {
        writeFileSync(pathManifest.runtimeProfileReceiptPath, "{truncated");
      },
      pattern: /receipt is unreadable/,
    },
    {
      label: "observation-error",
      mutate({ pathManifest, report }) {
        const receipt = structuredClone(runtimeReceiptByReport.get(report));
        receipt.observationErrors.push("process-table probe failed");
        writeFileSync(
          pathManifest.runtimeProfileReceiptPath,
          JSON.stringify(receipt),
        );
      },
      pattern: /not zero-failure evidence/,
    },
  ]) {
    const workspace = freshFixtureWorkspace(
      `hk-viz-release-receipt-${fixture.label}-`,
    );
    try {
      const { playwright } = prepareRunnableFixtureWorkspace(workspace);
      const monitorHarness = buildRunnerMonitorHarness();
      assert.throws(
        () =>
          runHkVisualizationReleaseGate({
            argv: [],
            cwd: workspace,
            environment: {},
            now: new Date("2026-08-09T12:34:56.000Z"),
            sampleActiveProfiles: () => completeProfileProcessSample(),
            ...fixtureReleaseEvidenceSeams,
            ...monitorHarness,
            spawn(command, args, options) {
              assert.equal(command, process.execPath);
              assert.equal(args[0], playwright);
              const pathManifest = JSON.parse(
                readFileSync(
                  options.env.PLAYWRIGHT_PATH_MANIFEST_FILE,
                  "utf8",
                ),
              );
              const report = passingReport(workspace, pathManifest);
              writeFileSync(
                options.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
                JSON.stringify(report),
              );
              fixture.mutate({ pathManifest, report });
              return { status: 0, signal: null };
            },
          }),
        fixture.pattern,
        fixture.label,
      );
    } finally {
      rmSync(workspace, { force: true, recursive: true });
    }
  }
});

test("runner postflight rejects a non-Starship Playwright profile that appears after the child starts", () => {
  const workspace = freshFixtureWorkspace("hk-viz-release-postflight-");
  let processTableReadCount = 0;
  const monitorHarness = buildRunnerMonitorHarness();
  try {
    prepareRunnableFixtureWorkspace(workspace);
    assert.throws(
      () =>
        runHkVisualizationReleaseGate({
          argv: [],
          cwd: workspace,
          environment: {},
          now: new Date("2026-08-09T12:34:56.000Z"),
          sampleActiveProfiles: () => {
            processTableReadCount += 1;
            return processTableReadCount === 1
              ? completeProfileProcessSample()
              : completeProfileProcessSample([
                  "/var/folders/hk-viz/playwright_chromiumdev_profile-late",
                ]);
          },
          ...fixtureReleaseEvidenceSeams,
          ...monitorHarness,
          spawn(_command, _args, options) {
            const pathManifest = JSON.parse(
              readFileSync(
                options.env.PLAYWRIGHT_PATH_MANIFEST_FILE,
                "utf8",
              ),
            );
            const report = passingReport(workspace, pathManifest);
            writeFileSync(
              options.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
              JSON.stringify(report),
            );
            writeFileSync(
              pathManifest.runtimeProfileReceiptPath,
              JSON.stringify(runtimeReceiptByReport.get(report)),
            );
            return { status: 0, signal: null };
          },
        }),
      /outside \/Volumes\/Starship/,
    );
    assert.equal(processTableReadCount, 2);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("runner rejects a transient foreign profile from the continuous global monitor even when preflight and postflight are clean", () => {
  const workspace = freshFixtureWorkspace("hk-viz-release-transient-profile-");
  const monitorHarness = buildRunnerMonitorHarness({ foreignProfile: true });
  try {
    prepareRunnableFixtureWorkspace(workspace);
    assert.throws(
      () =>
        runHkVisualizationReleaseGate({
          argv: [],
          cwd: workspace,
          environment: {},
          now: new Date("2026-08-09T12:34:56.000Z"),
          sampleActiveProfiles: () => completeProfileProcessSample(),
          ...fixtureReleaseEvidenceSeams,
          ...monitorHarness,
          spawn(_command, _args, options) {
            const pathManifest = JSON.parse(
              readFileSync(
                options.env.PLAYWRIGHT_PATH_MANIFEST_FILE,
                "utf8",
              ),
            );
            const report = passingReport(workspace, pathManifest);
            writeFileSync(
              options.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
              JSON.stringify(report),
            );
            writeFileSync(
              pathManifest.runtimeProfileReceiptPath,
              JSON.stringify(runtimeReceiptByReport.get(report)),
            );
            return { status: 0, signal: null };
          },
        }),
      /global profile monitor receipt is not fail-closed evidence|validation-error|outside \/Volumes\/Starship/i,
    );
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("runner rejects global monitor interval drift or a release-window sampling gap", () => {
  for (const fixture of [
    {
      harness: { receiptIntervalMs: 1_000 },
      label: "interval-drift",
      pattern: /cadence drifted: interval=1000ms.*required interval=500ms/i,
    },
    {
      harness: { finalElapsedMs: 1_200, periodicElapsedMs: 1_001 },
      label: "sampling-gap",
      pattern: /cadence drifted: interval=500ms, maxGap=1001ms.*maxGap<=1000ms/i,
    },
  ]) {
    const workspace = freshFixtureWorkspace(
      `hk-viz-release-monitor-${fixture.label}-`,
    );
    const monitorHarness = buildRunnerMonitorHarness(fixture.harness);
    try {
      prepareRunnableFixtureWorkspace(workspace);
      assert.throws(
        () =>
          runHkVisualizationReleaseGate({
            argv: [],
            cwd: workspace,
            environment: {},
            now: new Date("2026-08-09T12:34:56.000Z"),
            sampleActiveProfiles: () => completeProfileProcessSample(),
            ...fixtureReleaseEvidenceSeams,
            ...monitorHarness,
            spawn(_command, _args, options) {
              const pathManifest = JSON.parse(
                readFileSync(
                  options.env.PLAYWRIGHT_PATH_MANIFEST_FILE,
                  "utf8",
                ),
              );
              const report = passingReport(workspace, pathManifest);
              writeFileSync(
                options.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
                JSON.stringify(report),
              );
              writeFileSync(
                pathManifest.runtimeProfileReceiptPath,
                JSON.stringify(runtimeReceiptByReport.get(report)),
              );
              return { status: 0, signal: null };
            },
          }),
        fixture.pattern,
        fixture.label,
      );
    } finally {
      rmSync(workspace, { force: true, recursive: true });
    }
  }
});

test("runner rejects a clean monitor receipt that terminated before the runner-owned stop signal", () => {
  const workspace = freshFixtureWorkspace("hk-viz-release-premature-monitor-");
  const monitorHarness = buildRunnerMonitorHarness({
    prematureReceipt: true,
  });
  try {
    prepareRunnableFixtureWorkspace(workspace);
    assert.throws(
      () =>
        runHkVisualizationReleaseGate({
          argv: [],
          cwd: workspace,
          environment: {},
          now: new Date("2026-08-09T12:34:56.000Z"),
          sampleActiveProfiles: () => completeProfileProcessSample(),
          ...fixtureReleaseEvidenceSeams,
          ...monitorHarness,
          spawn(_command, _args, options) {
            const pathManifest = JSON.parse(
              readFileSync(
                options.env.PLAYWRIGHT_PATH_MANIFEST_FILE,
                "utf8",
              ),
            );
            const report = passingReport(workspace, pathManifest);
            writeFileSync(
              options.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
              JSON.stringify(report),
            );
            writeFileSync(
              pathManifest.runtimeProfileReceiptPath,
              JSON.stringify(runtimeReceiptByReport.get(report)),
            );
            return { status: 0, signal: null };
          },
        }),
      /ended before the runner's final stop signal|premature receipt/i,
    );
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("runner fails closed when the monitor child cannot be proven exited", () => {
  const workspace = freshFixtureWorkspace("hk-viz-release-monitor-exit-");
  const events = [];
  const monitorHarness = buildRunnerMonitorHarness({
    events,
    monitorExitError: new Error("monitor process remained active"),
  });
  try {
    prepareRunnableFixtureWorkspace(workspace);
    assert.throws(
      () =>
        runHkVisualizationReleaseGate({
          argv: [],
          cwd: workspace,
          environment: {},
          now: new Date("2026-08-09T12:34:56.000Z"),
          sampleActiveProfiles: () => completeProfileProcessSample(),
          ...fixtureReleaseEvidenceSeams,
          ...monitorHarness,
          spawn(_command, _args, options) {
            const pathManifest = JSON.parse(
              readFileSync(
                options.env.PLAYWRIGHT_PATH_MANIFEST_FILE,
                "utf8",
              ),
            );
            const report = passingReport(workspace, pathManifest);
            writeFileSync(
              options.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
              JSON.stringify(report),
            );
            writeFileSync(
              pathManifest.runtimeProfileReceiptPath,
              JSON.stringify(runtimeReceiptByReport.get(report)),
            );
            return { status: 0, signal: null };
          },
        }),
      /monitor process remained active/i,
    );
    assert.deepEqual(events, [
      "monitor-start",
      "monitor-stop",
      "monitor-exit",
    ]);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("runner requires clean monitor-ready evidence before invoking Playwright", () => {
  const workspace = freshFixtureWorkspace("hk-viz-release-monitor-ready-");
  const events = [];
  const monitorHarness = buildRunnerMonitorHarness({
    events,
    readyErrors: ["first global process-table sample failed"],
  });
  try {
    prepareRunnableFixtureWorkspace(workspace);
    assert.throws(
      () =>
        runHkVisualizationReleaseGate({
          argv: [],
          cwd: workspace,
          environment: {},
          now: new Date("2026-08-09T12:34:56.000Z"),
          sampleActiveProfiles: () => completeProfileProcessSample(),
          ...fixtureReleaseEvidenceSeams,
          ...monitorHarness,
          spawn() {
            events.push("playwright");
            throw new Error("Playwright must not run after invalid monitor-ready evidence.");
          },
        }),
      /monitor ready|firstSampleErrors|first global process-table sample failed/i,
    );
    assert.equal(events.includes("playwright"), false);
    assert.equal(events[0], "monitor-start");
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("runner removes its exact temp tsconfig after a Playwright failure without deleting an unrelated config", () => {
  const workspace = freshFixtureWorkspace("hk-viz-release-temp-config-");
  const monitorHarness = buildRunnerMonitorHarness();
  const unrelatedConfig = join(workspace, "tsconfig.playwright-unrelated.tmp.json");
  try {
    const { canonicalNextEnv, nextEnv } =
      prepareRunnableFixtureWorkspace(workspace);
    writeFileSync(unrelatedConfig, "unrelated\n");
    let exactConfig = null;
    assert.throws(
      () =>
        runHkVisualizationReleaseGate({
          argv: [],
          cwd: workspace,
          environment: {},
          now: new Date("2026-08-09T12:34:56.000Z"),
          sampleActiveProfiles: () => completeProfileProcessSample(),
          ...fixtureReleaseEvidenceSeams,
          ...monitorHarness,
          spawn(_command, _args, options) {
            exactConfig = options.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH;
            writeFileSync(exactConfig, "failed run config\n");
            writeFileSync(
              nextEnv,
              '/// <reference path="./.tmp/failed-run/types/routes.d.ts" />\n',
            );
            return { status: 1, signal: null };
          },
        }),
      /exited 1/,
    );
    assert.equal(existsSync(exactConfig), false);
    assert.equal(readFileSync(nextEnv, "utf8"), canonicalNextEnv);
    assert.equal(readFileSync(unrelatedConfig, "utf8"), "unrelated\n");
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("runner never writes through a next-env symlink introduced during the workload and restores the canonical entry atomically", () => {
  const workspace = freshFixtureWorkspace("hk-viz-release-next-env-symlink-");
  const monitorHarness = buildRunnerMonitorHarness();
  const foreignTarget = join(workspace, "foreign-next-env-target.txt");
  try {
    const { canonicalNextEnv, nextEnv } =
      prepareRunnableFixtureWorkspace(workspace);
    writeFileSync(foreignTarget, "foreign sentinel\n");
    assert.throws(
      () =>
        runHkVisualizationReleaseGate({
          argv: [],
          cwd: workspace,
          environment: {},
          now: new Date("2026-08-11T12:00:00.000Z"),
          sampleActiveProfiles: () => completeProfileProcessSample(),
          ...fixtureReleaseEvidenceSeams,
          ...monitorHarness,
          spawn() {
            rmSync(nextEnv);
            symlinkSync(foreignTarget, nextEnv);
            return { status: 1, signal: null };
          },
        }),
      /symlink entry.*safe atomic restoration completed/i,
    );
    assert.equal(readFileSync(foreignTarget, "utf8"), "foreign sentinel\n");
    assert.equal(readFileSync(nextEnv, "utf8"), canonicalNextEnv);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test("runner rejects next-env containing both canonical and stale generated route references", () => {
  const workspace = freshFixtureWorkspace("hk-viz-release-next-env-");
  try {
    prepareRunnableFixtureWorkspace(workspace);
    writeFileSync(
      join(workspace, "next-env.d.ts"),
      '/// <reference path="./.next/types/routes.d.ts" />\n' +
        '/// <reference path="./.tmp/stale/types/routes.d.ts" />\n',
    );
    assert.throws(
      () =>
        runHkVisualizationReleaseGate({
          argv: [],
          cwd: workspace,
          environment: {},
          sampleActiveProfiles: () => completeProfileProcessSample(),
          ...fixtureReleaseEvidenceSeams,
        }),
      /requires exactly one next-env\.d\.ts path reference/,
    );
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});
