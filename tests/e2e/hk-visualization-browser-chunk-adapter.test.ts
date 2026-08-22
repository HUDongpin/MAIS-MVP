import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as browserAdapter from "./hk-visualization-browser-chunk-adapter";
import {
  aggregateHkVisualizationBrowserDependentTransitionReceipts,
  aggregateHkVisualizationBrowserChunkReceipts,
  aggregateHkVisualizationBrowserP6AveragesReceipts,
  aggregateHkVisualizationBrowserP6BudgetReceipts,
  aggregateHkVisualizationBrowserPassThroughOracleReceipts,
  aggregateHkVisualizationBrowserPassThroughResetReceipts,
  aggregateHkVisualizationBrowserScrollObservationReceipts,
  buildHkVisualizationBrowserScrollCellPlan,
  canonicalHkVisualizationBrowserRuntimePaths,
  type HkVisualizationBrowserChunkReceipt,
  type HkVisualizationBrowserScrollObservationReceipt,
} from "./hk-visualization-browser-chunk-adapter";
import {
  buildHkVisualizationDependentTransitionSequencePlans,
  buildHkVisualizationPassThroughResetActionPlan,
  hashHkVisualizationPassThroughResetLayerPair,
  hashHkVisualizationDependentTransitionCanonicalVisibleBaseline,
  hashHkVisualizationDependentTransitionSequenceObservation,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_LIVE_DESCRIPTORS,
  HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS,
  HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS,
  type HkVisualizationDependentTransitionLanguage,
  type HkVisualizationDependentTransitionSequenceId,
  type HkVisualizationDependentTransitionSequenceObservation,
} from "./hk-visualization-range-state-ledger";
import {
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID,
} from "./hk-visualization-dependent-transition-plan-manifest.mjs";
import {
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH,
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION,
} from "./hk-visualization-pass-through-painted-geometry-pair-oracle.mjs";
import {
  buildConfiguredSemanticPrimaryState,
} from "../../components/visualizations/ConfiguredSemanticPrimaryMarks";
import {
  buildConfiguredSemanticSecondaryMathState,
  type ConfiguredSemanticSecondaryFamily,
} from "../../components/visualizations/ConfiguredSemanticSecondaryMarks";
import {
  buildHkVisualizationScrollObservationSet,
  HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
  buildHkVisualizationStateCellPlan,
  hashHkVisualizationAuditEvidence,
  hashHkVisualizationDescriptor,
  HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS,
  sha256HkVisualizationCanonical,
  type HkVisualizationMandatoryAuditReceipt,
  type HkVisualizationScrollObservation,
  type HkVisualizationScrollPositionAuditId,
  type HkVisualizationStateCellPlan,
} from "./hk-visualization-state-chunk-contract";

const learnerVisible = Object.freeze({
  ariaHiddenAncestor: false,
  hiddenAncestor: false,
  inertAncestor: false,
  visuallyVisible: true,
});

function p6AveragesObservation(phase: string, seriesBShift: number) {
  const seriesA = [4, 8, 6, 10];
  const hours = [9, 10, 11, 12];
  const point = (value: number, index: number) => ({
    hour: hours[index],
    value,
    x: 94 + index * 92,
    y: 276 - (value / 14) * 242,
  });
  const pointsA = seriesA.map(point);
  const pointsB = seriesA.map((value, index) => point(value + seriesBShift, index));
  const segments = (points: typeof pointsA) =>
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
      mode: "broken-line" as const,
      seriesBShift,
      seriesCount: 2 as const,
      values: seriesA as [number, number, number, number],
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
      value1: seriesA[0],
      value2: seriesA[1],
      value3: seriesA[2],
      value4: seriesA[3],
    }),
    segments: { A: segments(pointsA), B: segments(pointsB) },
    tableRows: seriesA.map((value, index) => ({
      hour: hours[index],
      seriesA: value,
      seriesB: value + seriesBShift,
    })),
    visibility: {
      graph: learnerVisible,
      meanLines: { A: [learnerVisible], B: [learnerVisible] },
      meanReadout: learnerVisible,
      points: {
        A: pointsA.map(() => learnerVisible),
        B: pointsB.map(() => learnerVisible),
      },
      segments: {
        A: segments(pointsA).map(() => learnerVisible),
        B: segments(pointsB).map(() => learnerVisible),
      },
      table: learnerVisible,
      tableRows: seriesA.map(() => learnerVisible),
    },
  };
}

function p6BudgetObservation(
  phase: string,
  workflowStep: "represent" | "solve" | "check",
  boundary: "positive-remaining" | "exact-zero" | "positive-overspend",
) {
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
  } as const;
  if (workflowStep === "represent") {
    return {
      ...common,
      surface: {
        kind: "represent" as const,
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
          comparisonScale: learnerVisible,
          extra: extraWidth > 0 ? learnerVisible : { ...learnerVisible, visuallyVisible: false },
          item: learnerVisible,
          marker: learnerVisible,
          overspend: withinBudget ? null : learnerVisible,
          remainder: withinBudget
            ? remainderWidth > 0 ? learnerVisible : { ...learnerVisible, visuallyVisible: false }
            : null,
          surface: learnerVisible,
        },
      },
    };
  }
  if (workflowStep === "solve") {
    return {
      ...common,
      surface: {
        kind: "solve" as const,
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
        visibility: { result: learnerVisible, surface: learnerVisible },
      },
    };
  }
  return {
    ...common,
    surface: {
      kind: "check" as const,
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
        beam: learnerVisible,
        leftCard: learnerVisible,
        rightCard: learnerVisible,
        surface: learnerVisible,
      },
    },
  };
}

function passThroughOracleObservation(
  labId: string,
  phase: string,
  seed = phase,
  stateOverride?: Readonly<Record<string, unknown>>,
) {
  return {
    activeModeIds: [],
    formulaText: `formula ${seed}`,
    labId,
    modelIdentity: {
      moduleId: "configured-visualization-lab",
      templateId: "fixture-template",
      topicId: labId,
    },
    modeSelectorEvidence: {},
    phase,
    rawRendererState: {
      attribute: "data-viz-math-state" as const,
      selectorEvidence: { count: 1, learnerVisibleCount: 1 },
      serializedState: JSON.stringify({ kind: "fixture", seed }),
    },
    selectorEvidence: {
      formula: { count: 1, learnerVisibleCount: 1 },
      model: { count: 1, learnerVisibleCount: 1 },
      reset: { count: 1, learnerVisibleCount: 1 },
      root: { count: 1, learnerVisibleCount: 1 },
      state: { count: 1, learnerVisibleCount: 1 },
    },
    state: stateOverride ?? { model: "fixture", topic: labId, value: seed },
    visibleEvidenceText: `visible ${seed}`,
    visibleMathMarks: {
      fixture: [
        {
          attributes: { "data-viz-value": seed },
          tagName: "line",
          text: seed,
        },
      ],
    },
    visibleNamedMarks: ["fixture-mark"],
  };
}

const paintedFrame = Object.freeze({ height: 148, width: 456, x: 92, y: 116 });
const paintedViewport = Object.freeze({
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

function paintedFixed(value: number, digits = 2) {
  const rounded = Number(value.toFixed(digits));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function paintedMap(
  point: Readonly<{ x: number; y: number }>,
  viewport: (typeof paintedViewport)[keyof typeof paintedViewport],
) {
  return {
    x: paintedFrame.x + ((point.x - viewport.domain.xMin) /
      (viewport.domain.xMax - viewport.domain.xMin)) * paintedFrame.width,
    y: paintedFrame.y + paintedFrame.height -
      ((point.y - viewport.domain.yMin) /
        (viewport.domain.yMax - viewport.domain.yMin)) * paintedFrame.height,
  };
}

function paintedMark(
  attributes: Readonly<Record<string, string | number | boolean>>,
  text = "",
  tagName = "path",
) {
  return {
    attributes: Object.fromEntries(Object.entries(attributes).map(
      ([key, value]) => [key, String(value)],
    )),
    tagName,
    text,
  };
}

function paintedLocalized(
  labId: string,
  state: Readonly<Record<string, any>>,
  locale: "en" | "zh" | "zh-Hans",
) {
  if (labId !== "advanced-functions") {
    const mean = paintedFixed(state.mean);
    const spread = paintedFixed(state.spread);
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
  const scale = paintedFixed(state.scale);
  const shift = paintedFixed(state.verticalShift);
  const formula = `y=${scale}x² + ${paintedFixed(Math.abs(state.verticalShift))}`;
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

function paintedVisibleNamedMarks(
  quadratic: boolean,
  viewport: (typeof paintedViewport)[keyof typeof paintedViewport],
) {
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

function paintedViewportMarks(
  viewport: (typeof paintedViewport)[keyof typeof paintedViewport],
) {
  return {
    "semantic fixed viewport": [paintedMark({
      "data-viz-domain-x-max": viewport.domain.xMax,
      "data-viz-domain-x-min": viewport.domain.xMin,
      "data-viz-domain-y-max": viewport.domain.yMax,
      "data-viz-domain-y-min": viewport.domain.yMin,
      "data-viz-viewport-id": viewport.id,
      "data-viz-x-ticks": viewport.xTicks.join(","),
      "data-viz-y-ticks": viewport.yTicks.join(","),
      height: paintedFrame.height,
      width: paintedFrame.width,
      x: paintedFrame.x,
      y: paintedFrame.y,
    }, "", "rect")],
    "semantic x tick": viewport.xTicks.map((tick) => {
      const mapped = paintedMap({ x: tick, y: 0 }, viewport);
      return paintedMark({
        "data-viz-tick-axis": "x",
        "data-viz-tick-value": tick,
        x1: mapped.x,
        x2: mapped.x,
        y1: paintedFrame.y,
        y2: paintedFrame.y + paintedFrame.height,
      }, "", "line");
    }),
    "semantic y tick": viewport.yTicks.map((tick) => {
      const mapped = paintedMap({ x: 0, y: tick }, viewport);
      return paintedMark({
        "data-viz-tick-axis": "y",
        "data-viz-tick-value": tick,
        x1: paintedFrame.x,
        x2: paintedFrame.x + paintedFrame.width,
        y1: mapped.y,
        y2: mapped.y,
      }, "", "line");
    }),
  };
}

function paintedOracleObservation(
  labId: "statistics-s1" | "data-handling" | "advanced-functions",
  state: Readonly<Record<string, any>>,
  locale: "en" | "zh" | "zh-Hans",
  phase: string,
) {
  const quadratic = labId === "advanced-functions";
  const viewport = quadratic ? paintedViewport.quadratic : paintedViewport.distribution;
  const text = paintedLocalized(labId, state, locale);
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
  const mapped = series.map((point) => paintedMap(point, viewport));
  const commonMarks = {
    ...paintedViewportMarks(viewport),
    "semantic formula": [paintedMark({
      "data-viz-visible-formula": text.formula,
      "data-viz-visible-locale": locale,
    }, `${text.formulaLabel}: ${text.formula}`, "text")],
    "semantic invariant check": [paintedMark({
      "data-viz-visible-check": text.check,
      "data-viz-visible-locale": locale,
    }, `${text.checkLabel}: ${text.check}`, "text")],
  };
  const visibleMathMarksByName = quadratic
    ? {
        ...commonMarks,
        "advanced curve sample": [0, 16, 32].map((index) =>
          paintedMark({
            "data-viz-mapped-x": mapped[index].x,
            "data-viz-mapped-y": mapped[index].y,
            "data-viz-sample-index": index,
            "data-viz-x": series[index].x,
            "data-viz-y": series[index].y,
            cx: mapped[index].x,
            cy: mapped[index].y,
            r: 4,
          }, "", "circle")),
        "advanced function readout": [paintedMark({
          "data-viz-formula": text.formula.slice(2),
          "data-viz-primary-family": "quadratic",
          "data-viz-scale-parameter": state.scale,
          "data-viz-selected-curve-only": true,
          "data-viz-token-a": paintedFixed(state.scale),
          "data-viz-token-k": paintedFixed(state.verticalShift),
          "data-viz-vertical-shift": state.verticalShift,
          "data-viz-visible-locale": locale,
          "data-viz-visible-readout": text.readout,
          x: 320,
          y: 108,
        }, text.readout, "text")],
        "advanced primary curve": [paintedMark({
          "data-viz-domain-max": series.at(-1)!.x,
          "data-viz-domain-min": series[0].x,
          "data-viz-formula": text.formula.slice(2),
          "data-viz-function-family": "quadratic",
          "data-viz-sample-count": 33,
          "data-viz-sample-end-x": mapped.at(-1)!.x,
          "data-viz-sample-end-y": mapped.at(-1)!.y,
          "data-viz-sample-middle-x": mapped[16].x,
          "data-viz-sample-middle-y": mapped[16].y,
          "data-viz-sample-start-x": mapped[0].x,
          "data-viz-sample-start-y": mapped[0].y,
          "data-viz-scale-parameter": state.scale,
          "data-viz-vertical-shift": state.verticalShift,
          d: mapped.map((point, index) =>
            `${index === 0 ? "M" : "L"} ${paintedFixed(point.x, 1)} ${paintedFixed(point.y, 1)}`,
          ).join(" "),
        })],
      }
    : {
        ...commonMarks,
        "distribution left spread marker": [paintedMark({
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
        "distribution mean": [paintedMark({
          "data-viz-mean": state.mean,
          "data-viz-series-index": 12,
          x1: mapped[12].x,
          x2: mapped[12].x,
          y1: paintedMap({ x: state.mean, y: 0 }, viewport).y,
          y2: paintedMap({ x: state.mean, y: 1 }, viewport).y,
        }, "", "line")],
        "distribution right spread marker": [paintedMark({
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
        "distribution spread band": [paintedMark({
          "data-viz-left-value": state.mean - state.spread,
          "data-viz-left-x": mapped[8].x,
          "data-viz-mean": state.mean,
          "data-viz-right-value": state.mean + state.spread,
          "data-viz-right-x": mapped[16].x,
          "data-viz-spread": state.spread,
          height: 10,
          width: mapped[16].x - mapped[8].x,
          x: mapped[8].x,
          y: paintedFrame.y + paintedFrame.height - 13,
        }, "", "rect")],
        "distribution summary curve": [paintedMark({
          "data-viz-left-spread-x": mapped[8].x,
          "data-viz-left-spread-y": mapped[8].y,
          "data-viz-mean": state.mean,
          "data-viz-right-spread-x": mapped[16].x,
          "data-viz-right-spread-y": mapped[16].y,
          "data-viz-sample-count": 25,
          "data-viz-spread": state.spread,
          d: mapped.map((point, index) =>
            `${index === 0 ? "M" : "L"} ${paintedFixed(point.x, 1)} ${paintedFixed(point.y, 1)}`,
          ).join(" "),
        })],
        "distribution summary readout": [paintedMark({
          "data-viz-mean": state.mean,
          "data-viz-spread": state.spread,
          "data-viz-token-mean": paintedFixed(state.mean),
          "data-viz-token-spread": paintedFixed(state.spread),
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
  const visibleMathMarkEntries = Object.entries(visibleMathMarksByName);
  const visibleMathMarks = Object.fromEntries(
    visibleMathMarkOrder.map((name) => {
      const entry = visibleMathMarkEntries.find(([markName]) => markName === name);
      assert.ok(entry, `missing painted fixture mark group ${name}`);
      return entry;
    }),
  );
  const raw = quadratic
    ? {
        family: "function-properties",
        labels: [],
        points: {},
        series,
        variant: labId,
        check: `selected quadratic · a=${paintedFixed(state.scale)} · k=${paintedFixed(state.verticalShift)}`,
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
        check: `symmetric about μ=${paintedFixed(state.mean)} · height(μ−spread)=height(μ+spread)`,
        formula: `center μ=${paintedFixed(state.mean)} · spread=${paintedFixed(state.spread)}`,
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
    activeModeIds: [],
    formulaText: `${text.formula} ${text.formulaLabel}: ${text.formula}`,
    labId,
    modelIdentity: {
      moduleId: "configured-visualization-lab",
      templateId: quadratic ? "function-family" : "statistics-distribution",
      topicId: labId,
    },
    modeSelectorEvidence: {},
    phase,
    rawRendererState: {
      attribute: "data-viz-math-state" as const,
      selectorEvidence: { count: 1, learnerVisibleCount: 1 },
      serializedState: JSON.stringify(raw),
    },
    selectorEvidence: {
      formula: { count: 1, learnerVisibleCount: 1 },
      model: { count: 1, learnerVisibleCount: 1 },
      reset: { count: 1, learnerVisibleCount: 1 },
      root: { count: 1, learnerVisibleCount: 1 },
      state: { count: 1, learnerVisibleCount: 1 },
    },
    state: { ...state },
    visibleEvidenceText: `${text.formula} | ${text.check} | ${text.readout}`,
    visibleMathMarks,
    visibleNamedMarks: paintedVisibleNamedMarks(quadratic, viewport),
  };
}

function paintedStates(labId: string) {
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
      topic: labId,
      value: 0,
      variant: labId,
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
      topic: labId,
      value: 0,
      variant: labId,
    },
  };
}

function passThroughResetObservation(
  labId: keyof typeof HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS,
  cellId: string,
  phase: string,
  activationKey: "Enter" | "Space",
  actionKind: "restoring" | "canonical-noop",
) {
  const expectedState = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[labId];
  const beforeState = actionKind === "restoring"
    ? HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS[labId].beforeState
    : expectedState;
  const afterOracleObservation = passThroughOracleObservation(
    labId,
    phase,
    phase,
    { ...expectedState, model: "fixture", topic: labId },
  );
  const beforeOracleObservation = actionKind === "restoring"
    ? passThroughOracleObservation(
        labId,
        phase,
        `before:${phase}`,
        { ...beforeState, model: "fixture", topic: labId },
      )
    : structuredClone(afterOracleObservation);
  const endpointReceipt =
    browserAdapter.buildHkVisualizationBrowserPassThroughResetEndpointReceipt({
      afterOracleObservation,
      beforeOracleObservation,
      cellId,
      labId,
      phase,
    });
  const canonicalFingerprint = `canonical:${labId}`;
  return {
    activationKey,
    actionKind,
    afterEndpoint: endpointReceipt.afterEndpoint,
    afterFingerprint: canonicalFingerprint,
    afterState: { ...expectedState },
    beforeEndpoint: endpointReceipt.beforeEndpoint,
    beforeFingerprint: actionKind === "restoring"
      ? `perturbed:${labId}`
      : canonicalFingerprint,
    beforeState: { ...beforeState },
    canonicalFingerprint,
    expectedState: { ...expectedState },
    labId,
    layerEndpointHashCount: endpointReceipt.layerEndpointHashCount,
    layerPairs: endpointReceipt.layerPairs,
    layerReceiptCount: endpointReceipt.layerReceiptCount,
    phase,
  };
}

function passedAudit(
  auditId: HkVisualizationScrollPositionAuditId,
  seed: string,
): HkVisualizationMandatoryAuditReceipt {
  const evidence = { auditId, seed };
  return Object.freeze({
    auditId,
    evidence,
    evidenceHash: hashHkVisualizationAuditEvidence(auditId, evidence),
    failure: null,
    issues: Object.freeze([]),
    retryCount: 0,
    status: "passed",
  });
}

function passedAudits(seed: string) {
  return Object.freeze(
    Object.fromEntries(
      HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS.map((auditId) => [
        auditId,
        passedAudit(auditId, seed),
      ]),
    ),
  ) as HkVisualizationScrollObservation["audits"];
}

function positiveCounts() {
  return Object.freeze({
    collisionCandidates: 1,
    contrastText: 1,
    controlVisibilityCandidates: 1,
    hitTargetCandidates: 1,
    layoutCandidates: 1,
    target44Candidates: 1,
  });
}

function noOverflowScrollReceipt(
  phase: string,
  seed = phase,
): HkVisualizationBrowserScrollObservationReceipt {
  return Object.freeze({
    observationSet: buildHkVisualizationScrollObservationSet({
      containers: [],
      observations: [
        {
          audits: passedAudits(`${seed}:all-start`),
          observationId: "all-start",
          position: "all-start",
          positions: [],
          positiveEvidenceCounts: positiveCounts(),
          targetContainerKey: null,
        },
      ],
    }),
    phase,
  });
}

function formulaOverflowScrollReceipt(
  phase: string,
  seed = phase,
): HkVisualizationBrowserScrollObservationReceipt {
  const container = Object.freeze({
    clientWidth: 240,
    containerKey: "formula:0",
    contentKind: "formula" as const,
    maximumScrollLeft: 240,
    scrollWidth: 480,
  });
  const observation = (
    observationId: string,
    position: HkVisualizationScrollObservation["position"],
    requestedScrollLeft: number,
    targetContainerKey: string | null,
  ): HkVisualizationScrollObservation => ({
    audits: passedAudits(`${seed}:${observationId}`),
    observationId,
    position,
    positions: [
      {
        containerKey: container.containerKey,
        maximumScrollLeft: container.maximumScrollLeft,
        reachedScrollLeft: requestedScrollLeft,
        requestedScrollLeft,
        restoreReachedScrollLeft: 0,
        restoreSucceeded: true,
      },
    ],
    positiveEvidenceCounts: positiveCounts(),
    targetContainerKey,
  });
  return Object.freeze({
    observationSet: buildHkVisualizationScrollObservationSet({
      containers: [container],
      observations: [
        observation("all-start", "all-start", 0, null),
        observation("formula:0:mid", "mid", 120, "formula:0"),
        observation("formula:0:end", "end", 240, "formula:0"),
      ],
    }),
    phase,
  });
}

function exact95Plan(): HkVisualizationStateCellPlan {
  return buildHkVisualizationStateCellPlan({
    cellId: "triangle:dynamic-browser-microfixture",
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: [],
    resetExpectedDescriptorHash: hashHkVisualizationDescriptor({ x: 0 }),
    resetExpectedSignature: "x=0",
    states: Array.from({ length: 95 }, (_, index) => ({
      actionSignature: `set:x=${index}`,
      descriptorHash: hashHkVisualizationDescriptor({ index, x: index }),
      domainId: "triangle-validity-v1",
      expectedSignature: `x=${index}`,
      id: `hk-state:${String(index).padStart(5, "0")}`,
      modeContext: [],
      modeId: "triangle",
      orderedControlIds: ["x"],
      reasons: [`endpoint-combination:${index}`],
      rehydrationActions: [
        {
          actionId: "range:x",
          actionKind: "set-range-value" as const,
          controlId: "x",
          expectedValue: index,
          projectedAbsence: null,
          requestedValue: index,
          selector: '[data-viz-parameter="x"]',
          targetPolicy: "required-interactive" as const,
        },
      ],
      requestedSignature: `x=${index}`,
      startingSignature: "x=0",
    })),
  });
}

function passingReceipts(
  plan: HkVisualizationStateCellPlan,
): HkVisualizationBrowserChunkReceipt[] {
  return plan.chunks.map((chunk, chunkIndex) => ({
    budgetTotalMs: chunk.budget.totalMs,
    cellExecutionHash: plan.cellExecutionHash,
    chunkId: chunk.chunkId,
    end: chunk.end,
    pageInstanceId: `fresh-page-${chunkIndex}`,
    planHash: plan.planHash,
    recomputedCellExecutionHash: plan.cellExecutionHash,
    recomputedPlanHash: plan.planHash,
    start: chunk.start,
    stateReceipts: plan.states.slice(chunk.start, chunk.end).map((state) => ({
      expectedSignature: state.expectedSignature,
      observedSignature: state.expectedSignature,
      phase: `range-state:${state.modeId}:${state.id}`,
      scrollObservationSet: noOverflowScrollReceipt(
        `range-state:${state.modeId}:${state.id}`,
      ).observationSet,
      startingObservedSignature: state.startingSignature,
      startingSignature: state.startingSignature,
      stateId: state.id,
      stateIndex: state.index,
    })),
  }));
}

function clone<T>(value: T): any {
  return structuredClone(value);
}

const dependentTransitionSurface = Object.freeze({
  renderedSize: Object.freeze({ height: 360, width: 640 }),
  scrollport: Object.freeze({
    clientHeight: 360,
    clientWidth: 390,
    maxScrollLeft: 250,
    scrollHeight: 360,
    scrollWidth: 640,
  }),
  tagName: "svg" as const,
  viewBox: Object.freeze({ height: 360, width: 640, x: 0, y: 0 }),
});

function dependentTransitionObservationFixture(args: Readonly<{
  canonicalFingerprint: string;
  cellId: string;
  labId: string;
  language: HkVisualizationDependentTransitionLanguage;
  sequenceId: HkVisualizationDependentTransitionSequenceId;
}>): HkVisualizationDependentTransitionSequenceObservation {
  const sourcePlan =
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SOURCE_PLAN_BY_SEQUENCE_ID[
      args.sequenceId
    ];
  const plan = buildHkVisualizationDependentTransitionSequencePlans({
    descriptors:
      HK_VISUALIZATION_DEPENDENT_TRANSITION_EXPECTED_LIVE_DESCRIPTORS[
        args.sequenceId
      ],
    domainId: sourcePlan.domainId,
    labId: sourcePlan.labId,
    modeId: sourcePlan.modeId,
  }).find(({ sequenceId }) => sequenceId === args.sequenceId);
  assert.ok(plan, args.sequenceId);
  const theme = args.cellId.endsWith("/dark") ? "dark" as const : "light" as const;
  const projection = (
    contract: (typeof plan.phases)[number]["visibleMathProjectionContract"],
  ) => ({
    ancestryScaleSummary:
      contract.expectedAncestryScaleSummaries[args.language][theme],
    elementCount: contract.elementCount,
    hash: contract.expectedHashes[args.language][theme],
  });
  const restorationContract =
    plan.postSequenceRestoration.visibleMathProjectionContract;
  const unhashedBaseline = {
    baselineHash: "",
    canonicalFingerprint: args.canonicalFingerprint,
    cellId: args.cellId,
    language: args.language,
    planHash: plan.planHash,
    sequenceId: args.sequenceId,
    surface: dependentTransitionSurface,
    theme,
    visibleElements: [],
    visibleMathProjection: projection(restorationContract),
  };
  const canonicalVisibleBaseline = {
    ...unhashedBaseline,
    baselineHash:
      hashHkVisualizationDependentTransitionCanonicalVisibleBaseline(
        unhashedBaseline,
      ),
  };
  const phases = plan.phases.map(
    ({ phase, visibleMathProjectionContract }, phaseIndex) => ({
      controls: [],
      id: `${args.sequenceId}:${phase}`,
      phase,
      rawSerializedPublicState: "{}",
      resetCountSincePreviousPhase: phaseIndex === 0 ? 1 : 0,
      stateSignature: `${args.sequenceId}:${phase}:state`,
      surface: dependentTransitionSurface,
      visibleElements: [],
      visibleMathProjection: projection(visibleMathProjectionContract),
    }),
  );
  const unhashed = {
    cellId: args.cellId,
    canonicalVisibleBaseline,
    domainId: plan.domainId,
    labId: args.labId,
    language: args.language,
    modePreparation: plan.modePreparation,
    modeId: plan.modeId,
    observationHash: "",
    phases,
    planHash: plan.planHash,
    postSequenceRestoration: {
      afterFingerprint: args.canonicalFingerprint,
      beforeFingerprint: `expanded:${args.sequenceId}`,
      canonicalFingerprint: args.canonicalFingerprint,
      controls: [],
      rawSerializedPublicState: "{}",
      resetClickCount: 1,
      stateSignature: `${args.sequenceId}:restored`,
      canonicalVisibleBaselineHash: canonicalVisibleBaseline.baselineHash,
      surface: dependentTransitionSurface,
      visibleElements: [],
      visibleMathProjection: projection(restorationContract),
    },
    schemaVersion: "hk-viz-dependent-transition-sequence.v8" as const,
    sequenceId: args.sequenceId,
    theme,
  } satisfies HkVisualizationDependentTransitionSequenceObservation;
  return {
    ...unhashed,
    observationHash:
      hashHkVisualizationDependentTransitionSequenceObservation(unhashed),
  };
}

function rehashDependentTransitionObservationFixture(
  raw: HkVisualizationDependentTransitionSequenceObservation,
) {
  const baselineWithoutHash = {
    ...raw.canonicalVisibleBaseline,
    baselineHash: "",
  };
  const canonicalVisibleBaseline = {
    ...baselineWithoutHash,
    baselineHash:
      hashHkVisualizationDependentTransitionCanonicalVisibleBaseline(
        baselineWithoutHash,
      ),
  };
  const unhashed = {
    ...raw,
    canonicalVisibleBaseline,
    observationHash: "",
    postSequenceRestoration: {
      ...raw.postSequenceRestoration,
      canonicalVisibleBaselineHash: canonicalVisibleBaseline.baselineHash,
    },
  };
  return {
    ...unhashed,
    observationHash:
      hashHkVisualizationDependentTransitionSequenceObservation(unhashed),
  };
}

function dependentTransitionAggregateFixture() {
  const affectedCellId =
    "P1/p1-addition-subtraction/desktop/en/light";
  const dedicatedCellId = "P1/p1-place-value/desktop/en/light";
  const cells = [
    { cellId: affectedCellId, phases: ["initial-state", "reset-space"] },
    { cellId: dedicatedCellId, phases: ["initial-state", "reset-space"] },
  ];
  const scrollAggregate =
    aggregateHkVisualizationBrowserScrollObservationReceipts(
      cells,
      cells.map(({ cellId, phases }) => ({
        cellId,
        scrollObservationPhasePlan: phases,
        scrollObservationSets: phases.map((phase) =>
          noOverflowScrollReceipt(phase),
        ),
      })),
    );
  const canonicalFingerprint = `canonical:${affectedCellId}`;
  const rawCells = [
    {
      cellId: affectedCellId,
      dependentTransitionSequenceObservations: [
        dependentTransitionObservationFixture({
          canonicalFingerprint,
          cellId: affectedCellId,
          labId: "p1-addition-subtraction",
          language: "en",
          sequenceId: "p1-add-step",
        }),
        dependentTransitionObservationFixture({
          canonicalFingerprint,
          cellId: affectedCellId,
          labId: "p1-addition-subtraction",
          language: "en",
          sequenceId: "p1-subtract-step",
        }),
      ],
      labId: "p1-addition-subtraction",
      language: "en" as const,
    },
    {
      cellId: dedicatedCellId,
      dependentTransitionSequenceObservations: [],
      labId: "p1-place-value",
      language: "en" as const,
    },
  ];
  return { affectedCellId, rawCells, scrollAggregate };
}

test("dependent-transition outer aggregate binds exact affected cells, ordered sequences, three phases, and nested hashes", () => {
  const { affectedCellId, rawCells, scrollAggregate } =
    dependentTransitionAggregateFixture();
  const aggregate =
    aggregateHkVisualizationBrowserDependentTransitionReceipts(
      scrollAggregate,
      rawCells,
    );
  assert.equal(aggregate.cellCount, 1);
  assert.equal(aggregate.sequenceObservationCount, 2);
  assert.equal(aggregate.phaseObservationCount, 6);
  assert.equal(
    aggregate.contractVersion,
    "hk-viz-browser-dependent-transition-aggregate-v2",
  );
  assert.equal(aggregate.scrollPackageAggregateHash, scrollAggregate.aggregateHash);
  assert.deepEqual(aggregate.cells.map(({ cellId }) => cellId), [affectedCellId]);
  assert.deepEqual(aggregate.cells[0].sequenceIds, [
    "p1-add-step",
    "p1-subtract-step",
  ]);
  assert.deepEqual(
    aggregate.cells[0].sequences.map(({ phaseIds }) => phaseIds),
    [
      ["pre", "clamp", "expand"],
      ["pre", "clamp", "expand"],
    ],
  );
  assert.equal(aggregate.cells[0].theme, "light");
  assert.ok(
    aggregate.cells[0].sequences.every((sequence) =>
      sequence.theme === "light" &&
      sequence.schemaVersion === "hk-viz-dependent-transition-sequence.v8" &&
      sequence.visibleMathProjectionEvidence.projectionCount === 5 &&
      sequence.visibleMathProjectionEvidence.ancestryScaleSummaries.length === 5 &&
      sequence.visibleMathProjectionEvidence.elementCounts.length === 5 &&
      sequence.visibleMathProjectionEvidence.projectionHashes.length === 5 &&
      /^[a-f0-9]{64}$/.test(sequence.projectionMatrixHash)
    ),
  );
  assert.equal(aggregate.cells[0].phaseObservationCount, 6);
  assert.match(aggregate.topologyHash, /^[a-f0-9]{64}$/);
  assert.match(aggregate.cells[0].cellAggregateHash, /^[a-f0-9]{64}$/);
  assert.ok(
    aggregate.cells[0].sequences.every(
      ({ phaseObservationHashes, sequenceAggregateHash }) =>
        phaseObservationHashes.length === 3 &&
        phaseObservationHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash)) &&
        /^[a-f0-9]{64}$/.test(sequenceAggregateHash),
    ),
  );
  assert.match(aggregate.aggregateHash, /^[a-f0-9]{64}$/);
  assert.ok(Object.isFrozen(aggregate));
  assert.ok(Object.isFrozen(aggregate.cells));
});

test("dependent-transition outer aggregate rejects missing, duplicate, reordered, foreign, cross-linked, and rehashed drift", async (t) => {
  const cases = [
    {
      name: "missing sequence",
      mutate(rawCells: any[]) {
        rawCells[0].dependentTransitionSequenceObservations.pop();
      },
      pattern: /exact 2 ordered dependent-transition observations/,
    },
    {
      name: "duplicate sequence",
      mutate(rawCells: any[]) {
        rawCells[0].dependentTransitionSequenceObservations.push(
          clone(rawCells[0].dependentTransitionSequenceObservations[0]),
        );
      },
      pattern: /exact 2 ordered dependent-transition observations/,
    },
    {
      name: "reordered sequences",
      mutate(rawCells: any[]) {
        rawCells[0].dependentTransitionSequenceObservations.reverse();
      },
      pattern: /sequence IDs are missing, duplicated, foreign, or reordered/,
    },
    {
      name: "foreign observation on unaffected cell",
      mutate(rawCells: any[]) {
        rawCells[1].dependentTransitionSequenceObservations.push(
          clone(rawCells[0].dependentTransitionSequenceObservations[0]),
        );
      },
      pattern: /requires exact 0 ordered dependent-transition observations/,
    },
    {
      name: "fully rehashed cross-linked cell",
      mutate(rawCells: any[]) {
        const observation = clone(
          rawCells[0].dependentTransitionSequenceObservations[0],
        );
        observation.cellId = rawCells[1].cellId;
        observation.canonicalVisibleBaseline.cellId = rawCells[1].cellId;
        rawCells[0].dependentTransitionSequenceObservations[0] =
          rehashDependentTransitionObservationFixture(observation);
      },
      pattern: /cellId differs from exact receipt cell/,
    },
    {
      name: "fully rehashed cross-linked language",
      mutate(rawCells: any[]) {
        const observation = clone(
          rawCells[0].dependentTransitionSequenceObservations[0],
        );
        observation.language = "zh";
        observation.canonicalVisibleBaseline.language = "zh";
        rawCells[0].dependentTransitionSequenceObservations[0] =
          rehashDependentTransitionObservationFixture(observation);
      },
      pattern: /language differs from exact receipt language/,
    },
    {
      name: "reordered phases with observation rehash",
      mutate(rawCells: any[]) {
        const observation = clone(
          rawCells[0].dependentTransitionSequenceObservations[0],
        );
        observation.phases.reverse();
        rawCells[0].dependentTransitionSequenceObservations[0] =
          rehashDependentTransitionObservationFixture(observation);
      },
      pattern: /phase IDs are not exact pre, clamp, expand order/,
    },
    {
      name: "wrong first-class theme with observation rehash",
      mutate(rawCells: any[]) {
        const observation = clone(
          rawCells[0].dependentTransitionSequenceObservations[0],
        );
        observation.theme = "dark";
        observation.canonicalVisibleBaseline.theme = "dark";
        rawCells[0].dependentTransitionSequenceObservations[0] =
          rehashDependentTransitionObservationFixture(observation);
      },
      pattern: /theme differs from exact receipt cell/,
    },
    {
      name: "source-plan hash drift with observation rehash",
      mutate(rawCells: any[]) {
        const observation = clone(
          rawCells[0].dependentTransitionSequenceObservations[0],
        );
        observation.planHash = "0".repeat(64);
        observation.canonicalVisibleBaseline.planHash = observation.planHash;
        rawCells[0].dependentTransitionSequenceObservations[0] =
          rehashDependentTransitionObservationFixture(observation);
      },
      pattern: /source-plan hash drifted/,
    },
    {
      name: "phase ancestry summary drift with observation rehash",
      mutate(rawCells: any[]) {
        const observation = clone(
          rawCells[0].dependentTransitionSequenceObservations[0],
        );
        observation.phases[0].visibleMathProjection.ancestryScaleSummary.hash =
          "0".repeat(64);
        rawCells[0].dependentTransitionSequenceObservations[0] =
          rehashDependentTransitionObservationFixture(observation);
      },
      pattern: /visible-math.*topology drifted/i,
    },
    {
      name: "canonical baseline projection hash drift with observation rehash",
      mutate(rawCells: any[]) {
        const observation = clone(
          rawCells[0].dependentTransitionSequenceObservations[0],
        );
        observation.canonicalVisibleBaseline.visibleMathProjection.hash =
          "0".repeat(64);
        rawCells[0].dependentTransitionSequenceObservations[0] =
          rehashDependentTransitionObservationFixture(observation);
      },
      pattern: /visible-math.*topology drifted/i,
    },
    {
      name: "restoration ancestry summary drift with observation rehash",
      mutate(rawCells: any[]) {
        const observation = clone(
          rawCells[0].dependentTransitionSequenceObservations[0],
        );
        observation.postSequenceRestoration.visibleMathProjection
          .ancestryScaleSummary.hash = "0".repeat(64);
        rawCells[0].dependentTransitionSequenceObservations[0] =
          rehashDependentTransitionObservationFixture(observation);
      },
      pattern: /visible-math.*topology drifted/i,
    },
    {
      name: "observation content hash drift",
      mutate(rawCells: any[]) {
        rawCells[0].dependentTransitionSequenceObservations[0].observationHash =
          sha256HkVisualizationCanonical("drift-observation");
      },
      pattern: /observation content hash does not verify/,
    },
    {
      name: "canonical baseline content hash drift",
      mutate(rawCells: any[]) {
        const observation =
          rawCells[0].dependentTransitionSequenceObservations[0];
        observation.canonicalVisibleBaseline.baselineHash =
          sha256HkVisualizationCanonical("drift-baseline");
        observation.postSequenceRestoration.canonicalVisibleBaselineHash =
          observation.canonicalVisibleBaseline.baselineHash;
        observation.observationHash =
          hashHkVisualizationDependentTransitionSequenceObservation({
            ...observation,
            observationHash: "",
          });
      },
      pattern: /canonical visible baseline content hash does not verify/,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const { rawCells, scrollAggregate } =
        dependentTransitionAggregateFixture();
      invalid.mutate(rawCells);
      assert.throws(
        () =>
          aggregateHkVisualizationBrowserDependentTransitionReceipts(
            scrollAggregate,
            rawCells,
          ),
        invalid.pattern,
      );
    });
  }
});

test("one exact 95-state v3 plan aggregates three ordered fresh-page chunks and every nested scroll receipt", () => {
  const plan = exact95Plan();
  assert.deepEqual(
    plan.chunks.map(({ end, start }) => ({ end, start })),
    [
      { end: 32, start: 0 },
      { end: 64, start: 32 },
      { end: 95, start: 64 },
    ],
  );
  assert.ok(
    plan.chunks.every(
      (chunk) =>
        chunk.budget.stateCount === chunk.end - chunk.start &&
        chunk.budget.totalMs > 0,
    ),
  );

  const aggregate = aggregateHkVisualizationBrowserChunkReceipts(
    plan,
    passingReceipts(plan),
  );
  assert.equal(aggregate.chunkCount, 3);
  assert.equal(aggregate.freshPageCount, 3);
  assert.equal(aggregate.stateCount, 95);
  assert.equal(aggregate.planHash, plan.planHash);
  assert.equal(aggregate.cellExecutionHash, plan.cellExecutionHash);
  assert.equal(aggregate.scrollObservationSetCount, 95);
  assert.equal(aggregate.scrollObservationCount, 95);
  assert.equal(aggregate.scrollContainerCount, 0);
  assert.equal(aggregate.scrollPositionAuditCount, 95 * 6);
  assert.match(aggregate.scrollObservationAggregateHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(aggregate.executedStateIds, aggregate.plannedStateIds);
  assert.deepEqual(
    aggregate.executedStateIds,
    plan.states.map(({ id }) => id),
  );
  assert.ok(Object.isFrozen(aggregate));
});

test("browser-chunk aggregation rejects order, range, page, identity, budget, and state drift", async (t) => {
  const plan = exact95Plan();
  const cases: readonly {
    name: string;
    mutate: (receipts: any[]) => void;
    pattern: RegExp;
  }[] = [
    {
      name: "chunk order",
      mutate: (receipts) =>
        ([receipts[0], receipts[1]] = [receipts[1], receipts[0]]),
      pattern: /chunk.*order|chunkId/,
    },
    {
      name: "range gap",
      mutate: (receipts) => (receipts[1].start = 33),
      pattern: /exact.*range|start|gap/,
    },
    {
      name: "range overlap",
      mutate: (receipts) => (receipts[1].start = 31),
      pattern: /exact.*range|start|overlap/,
    },
    {
      name: "reused page",
      mutate: (receipts) =>
        (receipts[1].pageInstanceId = receipts[0].pageInstanceId),
      pattern: /fresh page|pageInstanceId|duplicated/,
    },
    {
      name: "recomputed plan hash",
      mutate: (receipts) =>
        (receipts[1].recomputedPlanHash = sha256HkVisualizationCanonical({
          drift: "plan",
        })),
      pattern: /recomputed plan hash/,
    },
    {
      name: "recomputed execution hash",
      mutate: (receipts) =>
        (receipts[1].recomputedCellExecutionHash =
          sha256HkVisualizationCanonical({ drift: "execution" })),
      pattern: /recomputed cell execution hash/,
    },
    {
      name: "chunk budget",
      mutate: (receipts) => (receipts[1].budgetTotalMs += 1),
      pattern: /budget/,
    },
    {
      name: "missing state",
      mutate: (receipts) => receipts[1].stateReceipts.pop(),
      pattern: /missing.*state|state receipt count/,
    },
    {
      name: "duplicate or reordered state",
      mutate: (receipts) =>
        (receipts[1].stateReceipts[1] = receipts[1].stateReceipts[0]),
      pattern: /stateId|state.*order|duplicated/,
    },
    {
      name: "observed signature",
      mutate: (receipts) =>
        (receipts[1].stateReceipts[0].observedSignature = "x=drift"),
      pattern: /observed signature/,
    },
    {
      name: "starting signature",
      mutate: (receipts) =>
        (receipts[1].stateReceipts[0].startingObservedSignature = "x=drift"),
      pattern: /starting.*signature/,
    },
    {
      name: "missing nested scroll observation set",
      mutate: (receipts) =>
        delete receipts[1].stateReceipts[0].scrollObservationSet,
      pattern: /scroll|containers must be an array|absent/,
    },
    {
      name: "wrong nested scroll phase",
      mutate: (receipts) =>
        (receipts[1].stateReceipts[0].phase = "range-state:wrong"),
      pattern: /wrong scroll observation phase/,
    },
    {
      name: "nested observation-set hash drift",
      mutate: (receipts) =>
        (receipts[1].stateReceipts[0].scrollObservationSet.observationSetHash =
          sha256HkVisualizationCanonical({ drift: "observation-set" })),
      pattern: /count, order, schedule, or hash drift/,
    },
    {
      name: "nested observation schedule order drift",
      mutate: (receipts) => {
        const phase = receipts[1].stateReceipts[0].phase;
        receipts[1].stateReceipts[0].scrollObservationSet = clone(
          formulaOverflowScrollReceipt(phase).observationSet,
        );
        const observations =
          receipts[1].stateReceipts[0].scrollObservationSet.observations;
        [observations[1], observations[2]] = [
          observations[2],
          observations[1],
        ];
      },
      pattern: /ordered.*schedule|violates exact ordered/,
    },
  ];

  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const receipts = clone(passingReceipts(plan));
      invalid.mutate(receipts);
      assert.throws(
        () => aggregateHkVisualizationBrowserChunkReceipts(plan, receipts),
        invalid.pattern,
      );
    });
  }
});

test("canonical package scroll aggregate binds formula-only overflow, ordered phases, counts, and hashes", () => {
  const expectedCells = [
    { cellId: "cell-a", phases: ["initial-state", "formula-state"] },
    { cellId: "cell-b", phases: ["reset-enter"] },
  ];
  const cells = [
    {
      cellId: "cell-a",
      scrollObservationPhasePlan: ["initial-state", "formula-state"],
      scrollObservationSets: [
        noOverflowScrollReceipt("initial-state"),
        formulaOverflowScrollReceipt("formula-state"),
      ],
    },
    {
      cellId: "cell-b",
      scrollObservationPhasePlan: ["reset-enter"],
      scrollObservationSets: [noOverflowScrollReceipt("reset-enter")],
    },
  ];
  const aggregate = aggregateHkVisualizationBrowserScrollObservationReceipts(
    expectedCells,
    cells,
  );
  assert.equal(aggregate.cellCount, 2);
  assert.deepEqual(
    aggregate.cellIds,
    expectedCells.map(({ cellId }) => cellId),
  );
  assert.equal(aggregate.scrollObservationSetCount, 3);
  assert.equal(aggregate.scrollContainerCount, 1);
  assert.equal(aggregate.scrollObservationCount, 5);
  assert.equal(aggregate.scrollPositionAuditCount, 30);
  assert.match(aggregate.scrollObservationAggregateHash, /^[a-f0-9]{64}$/);
  assert.match(aggregate.phasePlanAggregateHash, /^[a-f0-9]{64}$/);
  assert.match(aggregate.aggregateHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(aggregate.cells[0].phases, [
    "initial-state",
    "formula-state",
  ]);
  assert.equal(aggregate.cells[0].scrollObservationSetCount, 2);
  assert.equal(aggregate.cells[0].scrollObservationCount, 4);
  assert.ok(Object.isFrozen(aggregate));
  assert.ok(Object.isFrozen(aggregate.cells));
});

test("pass-through oracle aggregate binds public, raw renderer, and visible geometry layers to the exact scroll phase plan", () => {
  const expectedCells = [
    {
      cellId: "P2/p2-multiplication-foundations/desktop/en/light",
      phases: ["range-state:base", "reset-space"],
    },
    {
      cellId: "P2/p2-place-value/desktop/en/light",
      phases: ["range-state:base", "reset-space"],
    },
  ];
  const scrollAggregate = aggregateHkVisualizationBrowserScrollObservationReceipts(
    expectedCells,
    expectedCells.map(({ cellId, phases }) => ({
      cellId,
      scrollObservationPhasePlan: phases,
      scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)),
    })),
  );
  const aggregate = aggregateHkVisualizationBrowserPassThroughOracleReceipts(
    scrollAggregate,
    [
      {
        cellId: expectedCells[0].cellId,
        labId: "p2-multiplication-foundations",
        passThroughOracleObservations: expectedCells[0].phases.map((phase) =>
          passThroughOracleObservation("p2-multiplication-foundations", phase),
        ),
      },
      {
        cellId: expectedCells[1].cellId,
        labId: "p2-place-value",
        passThroughOracleObservations: [],
      },
    ],
  );
  assert.equal(aggregate.cellCount, 2);
  assert.equal(aggregate.passThroughCellCount, 1);
  assert.equal(aggregate.observationCount, 2);
  assert.equal(aggregate.cells[0].kind, "pass-through");
  assert.deepEqual(aggregate.cells[0].phases, expectedCells[0].phases);
  assert.equal(aggregate.cells[1].kind, "dedicated");
  assert.deepEqual(aggregate.cells[1].observations, []);
  for (const observation of aggregate.cells[0].observations) {
    assert.match(observation.publicStateHash, /^[a-f0-9]{64}$/);
    assert.match(observation.rawRendererStateHash, /^[a-f0-9]{64}$/);
    assert.match(observation.visibleGeometryHash, /^[a-f0-9]{64}$/);
    assert.match(observation.observationHash, /^[a-f0-9]{64}$/);
    assert.equal(observation.rawRendererState.selectorEvidence.count, 1);
    assert.equal(
      observation.rawRendererState.selectorEvidence.learnerVisibleCount,
      1,
    );
    assert.ok(observation.rawRendererState.serializedState.trim());
  }
  assert.match(aggregate.aggregateHash, /^[a-f0-9]{64}$/);
});

test("pass-through oracle accepts exact JSON.stringify bytes from all seven exported product state builders", () => {
  const productPlans = [
    {
      attribute: "data-viz-state-json" as const,
      family: "equal-groups-array",
      labId: "p2-multiplication-foundations",
      primary: true,
    },
    {
      attribute: "data-viz-state-json" as const,
      family: "fraction-equivalence",
      labId: "p3-fractions-intro",
      primary: true,
    },
    {
      attribute: "data-viz-math-state" as const,
      family: "statistics-distribution",
      labId: "statistics-s1",
      primary: false,
    },
    {
      attribute: "data-viz-math-state" as const,
      family: "statistics-distribution",
      labId: "data-handling",
      primary: false,
    },
    {
      attribute: "data-viz-math-state" as const,
      family: "function-properties",
      labId: "advanced-functions",
      primary: false,
    },
    {
      attribute: "data-viz-math-state" as const,
      family: "derivative-rate-area",
      labId: "differentiation-intro",
      primary: false,
    },
    {
      attribute: "data-viz-math-state" as const,
      family: "derivative-rate-area",
      labId: "calculus",
      primary: false,
    },
  ];
  const expectedCells = productPlans.map(({ labId }, index) => ({
    cellId: `product/${labId}/desktop/en/light`,
    phases: [`range-state:product:${String(index).padStart(5, "0")}`],
  }));
  const scrollAggregate = aggregateHkVisualizationBrowserScrollObservationReceipts(
    expectedCells,
    expectedCells.map(({ cellId, phases }) => ({
      cellId,
      scrollObservationPhasePlan: phases,
      scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)),
    })),
  );
  const oracleCells = productPlans.map((plan, index) => {
    const controls = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[
      plan.labId as keyof typeof HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS
    ];
    const state = plan.primary
      ? buildConfiguredSemanticPrimaryState(plan.family, {
          ...controls,
          variant: plan.labId,
        })
      : buildConfiguredSemanticSecondaryMathState({
          comparison: controls.comparison,
          family: plan.family as ConfiguredSemanticSecondaryFamily,
          mode: controls.mode,
          value: controls.value,
          variant: plan.labId,
        });
    assert.ok(state, `${plan.labId} exported product builder state`);
    const baseObservation = passThroughOracleObservation(
      plan.labId,
      expectedCells[index].phases[0],
    );
    const observation = {
      ...baseObservation,
      rawRendererState: {
        ...baseObservation.rawRendererState,
        attribute: plan.attribute,
        serializedState: JSON.stringify(state),
      },
    };
    assert.equal(
      JSON.stringify(JSON.parse(observation.rawRendererState.serializedState)),
      observation.rawRendererState.serializedState,
      `${plan.labId} product bytes must be the exact JSON.stringify boundary`,
    );
    return {
      cellId: expectedCells[index].cellId,
      labId: plan.labId,
      passThroughOracleObservations: [observation],
    };
  });
  const aggregate = aggregateHkVisualizationBrowserPassThroughOracleReceipts(
    scrollAggregate,
    oracleCells,
  );
  assert.equal(aggregate.passThroughCellCount, 7);
  assert.equal(aggregate.observationCount, 7);
});

test("cross-state painted-geometry adapter exposes a separate v1 aggregate authority", () => {
  assert.equal(
    (browserAdapter as any)
      .HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_AGGREGATE_VERSION,
    "hk-viz-browser-pass-through-painted-geometry-pair-aggregate-v1",
  );
  assert.equal(
    (browserAdapter as any)
      .HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_ANNOTATION_TYPE,
    "hk-viz-pass-through-painted-geometry-pair-aggregate",
  );
  assert.equal(
    typeof (browserAdapter as any)
      .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts,
    "function",
  );
});

function paintedPackageFixture(
  cells: readonly Readonly<{ cellId: string; labId: string }>[],
  options: Readonly<{
    duplicateBefore?: boolean;
    reverseApplicable?: boolean;
    corruptAfterCurve?: boolean;
    epsilonBeforeInterloper?: boolean;
    extraKeyBeforeInterloper?: boolean;
    missingReset?: boolean;
    pairAfterReset?: boolean;
    reorderReset?: boolean;
  }> = {},
) {
  const plans = cells.map(({ cellId, labId }) => {
    const applicable = [
      "statistics-s1",
      "data-handling",
      "advanced-functions",
    ].includes(labId);
    const beforePhase = "range-state:default:hk-state:00001";
    const duplicatePhase = "range-state:default:hk-state:00002";
    const afterPhase = options.duplicateBefore
      ? "range-state:default:hk-state:00003"
      : "range-state:default:hk-state:00002";
    const enterResetPhase = "range-state:reset:hk-state:00003";
    const exactStates = applicable ? paintedStates(labId) : null;
    const pairEntries = applicable && exactStates
      ? [
          {
            phase: beforePhase,
            role: "before",
            state: exactStates.before,
          },
          ...(options.duplicateBefore
            ? [{ phase: duplicatePhase, role: "before", state: exactStates.before }]
            : []),
          ...(options.extraKeyBeforeInterloper
            ? [{
                phase: "range-state:interloper-extra:hk-state:00004",
                role: "interloper",
                state: { ...exactStates.before, decoy: true },
              }]
            : []),
          ...(options.epsilonBeforeInterloper
            ? [{
                phase: "range-state:interloper-epsilon:hk-state:00005",
                role: "interloper",
                state: { ...exactStates.before, mean: 1e-10 },
              }]
            : []),
          { phase: afterPhase, role: "after", state: exactStates.after },
        ]
      : [];
    if (options.reverseApplicable) pairEntries.reverse();
    const resetState = applicable
      ? HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[
          labId as keyof typeof HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS
        ]
      : null;
    const resetEntries = applicable && resetState
      ? [
          { phase: enterResetPhase, role: "reset", state: resetState },
          { phase: "reset-space", role: "reset", state: resetState },
          { phase: "reset-space-idempotent", role: "reset", state: resetState },
        ]
      : [];
    if (options.missingReset) resetEntries.splice(0, 1);
    if (options.reorderReset) [resetEntries[0], resetEntries[1]] =
      [resetEntries[1], resetEntries[0]];
    const entries = applicable
      ? options.pairAfterReset
        ? [...resetEntries, ...pairEntries]
        : [...pairEntries, ...resetEntries]
      : [{
          phase: "range-state:default:hk-state:00000",
          role: "dedicated",
          state: null,
        }];
    const phases = entries.map(({ phase }) => phase);
    return {
      applicable,
      afterPhase,
      beforePhase,
      cellId,
      entries,
      labId,
      phases,
    };
  });
  const scrollAggregate = aggregateHkVisualizationBrowserScrollObservationReceipts(
    plans.map(({ cellId, phases }) => ({ cellId, phases })),
    plans.map(({ cellId, phases }) => ({
      cellId,
      scrollObservationPhasePlan: phases,
      scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)),
    })),
  );
  const oracleAggregate = aggregateHkVisualizationBrowserPassThroughOracleReceipts(
    scrollAggregate,
    plans.map((plan) => {
      if (!plan.applicable) return {
        cellId: plan.cellId,
        labId: plan.labId,
        passThroughOracleObservations: [],
      };
      const segments = plan.cellId.split("/");
      const locale = segments[3] as "en" | "zh" | "zh-Hans";
      const ordered = plan.entries.map(({ phase, role, state }) => {
        if (role === "reset") {
          return passThroughOracleObservation(
            plan.labId,
            phase,
            phase,
            state ?? undefined,
          );
        }
        assert.ok(state, `${plan.cellId}:${phase}:state`);
        return paintedOracleObservation(
          plan.labId as "statistics-s1" | "data-handling" | "advanced-functions",
          state,
          locale,
          phase,
        );
      });
      if (options.corruptAfterCurve) {
        const afterIndex = plan.entries.findIndex(({ role }) => role === "after");
        const observation = ordered[afterIndex];
        assert.ok(observation, `${plan.cellId}:after-observation`);
        const curveName = plan.labId === "advanced-functions"
          ? "advanced primary curve"
          : "distribution summary curve";
        const curve = Object.entries(observation.visibleMathMarks).find(
          ([markName]) => markName === curveName,
        )?.[1][0];
        assert.ok(curve, curveName);
        curve.attributes.d = curve.attributes.d.replace(
            /^M\s+\S+\s+\S+/u,
            "M 100 100",
          );
      }
      return {
        cellId: plan.cellId,
        labId: plan.labId,
        passThroughOracleObservations: ordered,
      };
    }),
  );
  return { oracleAggregate, scrollAggregate };
}

function rehashPaintedSourceOracleAggregateFixture(aggregate: any) {
  const contractVersion = (browserAdapter as any)
    .HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION;
  for (const cell of aggregate.cells) {
    for (const observation of cell.observations) {
      observation.publicStateHash = sha256HkVisualizationCanonical(
        observation.publicState,
      );
      observation.rawRendererStateHash = sha256HkVisualizationCanonical(
        observation.rawRendererState,
      );
      observation.visibleGeometryHash = sha256HkVisualizationCanonical(
        observation.visibleGeometry,
      );
      const { observationHash: _ignoredObservationHash, ...observationEvidence } =
        observation;
      observation.observationHash = sha256HkVisualizationCanonical({
        cellId: cell.cellId,
        contractVersion,
        evidence: observationEvidence,
        kind: "browser-pass-through-oracle-observation",
        labId: cell.labId,
      });
    }
    cell.observationHashes = cell.observations.map(
      ({ observationHash }: { observationHash: string }) => observationHash,
    );
    const { cellAggregateHash: _ignored, ...cellEvidence } = cell;
    cell.cellAggregateHash = sha256HkVisualizationCanonical({
      contractVersion,
      evidence: cellEvidence,
      kind: "browser-pass-through-oracle-cell",
    });
  }
  const { aggregateHash: _ignored, ...aggregateEvidence } = aggregate;
  aggregate.aggregateHash = sha256HkVisualizationCanonical({
    contractVersion,
    evidence: aggregateEvidence,
    kind: "browser-pass-through-oracle-package",
  });
}

test("painted-geometry pair aggregate resolves two unique range phases and emits three ordered layer pairs", () => {
  const cellId = "S1/statistics-s1/desktop/en/light";
  const { oracleAggregate, scrollAggregate } = paintedPackageFixture([
    { cellId, labId: "statistics-s1" },
  ]);
  const aggregate = (browserAdapter as any)
    .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
      scrollAggregate,
      oracleAggregate,
    );
  assert.equal(aggregate.contractVersion,
    "hk-viz-browser-pass-through-painted-geometry-pair-aggregate-v1");
  assert.equal(aggregate.oracleVersion,
    HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION);
  assert.equal(aggregate.oraclePlanHash,
    HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH);
  assert.equal(aggregate.cellCount, 1);
  assert.equal(aggregate.pairCount, 1);
  assert.equal(aggregate.endpointCount, 2);
  assert.equal(aggregate.layerReceiptCount, 3);
  assert.equal(aggregate.layerEndpointHashCount, 6);
  assert.equal(aggregate.scrollPackageAggregateHash, scrollAggregate.aggregateHash);
  assert.equal(aggregate.oraclePackageAggregateHash, oracleAggregate.aggregateHash);
  const cell = aggregate.cells[0];
  assert.equal(cell.kind, "applicable");
  assert.equal(cell.pairCount, 1);
  assert.equal(cell.pair.beforeRef.observationIndex, 0);
  assert.equal(cell.pair.afterRef.observationIndex, 1);
  assert.deepEqual(
    cell.pair.layerPairs.map(({ layer }: { layer: string }) => layer),
    ["public", "raw", "visible"],
  );
  for (const pair of cell.pair.layerPairs) {
    assert.notEqual(pair.beforeHash, pair.afterHash);
    assert.match(pair.pairHash, /^[a-f0-9]{64}$/u);
  }
  assert.match(cell.pair.pairHash, /^[a-f0-9]{64}$/u);
  assert.match(cell.cellAggregateHash, /^[a-f0-9]{64}$/u);
  assert.match(aggregate.aggregateHash, /^[a-f0-9]{64}$/u);
});

test("painted-geometry pair aggregate retains an exact zero receipt for non-applicable cells", () => {
  const cellId = "P1/p1-place-value/desktop/en/light";
  const { oracleAggregate, scrollAggregate } = paintedPackageFixture([
    { cellId, labId: "p1-place-value" },
  ]);
  const aggregate = (browserAdapter as any)
    .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
      scrollAggregate,
      oracleAggregate,
    );
  assert.equal(aggregate.cellCount, 1);
  assert.equal(aggregate.pairCount, 0);
  assert.equal(aggregate.endpointCount, 0);
  assert.equal(aggregate.layerReceiptCount, 0);
  assert.equal(aggregate.layerEndpointHashCount, 0);
  assert.deepEqual(aggregate.cells[0].pair, null);
  assert.equal(aggregate.cells[0].kind, "not-applicable");
});

test("painted-geometry pair adapter locks 216 scroll packages, 918 cells, and exact54 applicable pairs", () => {
  const exactCells = [
    ["statistics-s1", "S1"],
    ["data-handling", "S4"],
    ["advanced-functions", "S5"],
  ].flatMap(([labId, grade]) =>
    ["desktop", "tablet", "mobile"].flatMap((viewport) =>
      ["zh-Hans", "zh", "en"].flatMap((locale) =>
        ["light", "dark"].map((theme) => ({
          cellId: `${grade}/${labId}/${viewport}/${locale}/${theme}`,
          labId,
        })),
      ),
    ),
  );
  assert.equal(exactCells.length, 54);
  const dedicatedCells = Array.from({ length: 864 }, (_, index) => ({
    cellId: `P1/dedicated-${String(index).padStart(4, "0")}/desktop/en/light`,
    labId: `dedicated-${String(index).padStart(4, "0")}`,
  }));
  const packages = Array.from({ length: 216 }, (_, packageIndex) => {
    const dedicatedStart = packageIndex < 54
      ? packageIndex * 4
      : 216 + (packageIndex - 54) * 4;
    return [
      ...(packageIndex < 54 ? [exactCells[packageIndex]] : []),
      ...dedicatedCells.slice(dedicatedStart, dedicatedStart + 4),
    ];
  });
  assert.equal(packages.flat().length, 918);
  const totals = packages.reduce((sum, cells) => {
    const { oracleAggregate, scrollAggregate } = paintedPackageFixture(cells);
    const aggregate = (browserAdapter as any)
      .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
        scrollAggregate,
        oracleAggregate,
      );
    return {
      cells: sum.cells + aggregate.cellCount,
      endpoints: sum.endpoints + aggregate.endpointCount,
      layerEndpoints: sum.layerEndpoints + aggregate.layerEndpointHashCount,
      layerPairs: sum.layerPairs + aggregate.layerReceiptCount,
      pairs: sum.pairs + aggregate.pairCount,
      zeroPackages: sum.zeroPackages + Number(aggregate.pairCount === 0),
    };
  }, { cells: 0, endpoints: 0, layerEndpoints: 0, layerPairs: 0, pairs: 0, zeroPackages: 0 });
  assert.deepEqual(totals, {
    cells: 918,
    endpoints: 108,
    layerEndpoints: 324,
    layerPairs: 162,
    pairs: 54,
    zeroPackages: 162,
  });
});

test("painted-geometry pair aggregate rejects uniqueness, chronology, cross-hash, identity, and shared-oracle drift", async (t) => {
  const cell = {
    cellId: "S1/statistics-s1/desktop/en/light",
    labId: "statistics-s1",
  };
  await t.test("duplicate exact before endpoint", () => {
    const { oracleAggregate, scrollAggregate } = paintedPackageFixture([cell], {
      duplicateBefore: true,
    });
    assert.throws(() => (browserAdapter as any)
      .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
        scrollAggregate,
        oracleAggregate,
      ), /exactly one|unique|before/i);
  });
  await t.test("reversed chronology", () => {
    const { oracleAggregate, scrollAggregate } = paintedPackageFixture([cell], {
      reverseApplicable: true,
    });
    assert.throws(() => (browserAdapter as any)
      .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
        scrollAggregate,
        oracleAggregate,
      ), /chronolog|before.*after|ordered/i);
  });
  await t.test("fully canonical wrong-but-different curve", () => {
    const { oracleAggregate, scrollAggregate } = paintedPackageFixture([cell], {
      corruptAfterCurve: true,
    });
    assert.throws(() => (browserAdapter as any)
      .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
        scrollAggregate,
        oracleAggregate,
      ), /failed.*oracle|centerline failed/i);
  });
  await t.test("oracle aggregate hash drift", () => {
    const { oracleAggregate, scrollAggregate } = paintedPackageFixture([cell]);
    const corrupted = {
      ...structuredClone(oracleAggregate),
      aggregateHash: "f".repeat(64),
    };
    assert.throws(() => (browserAdapter as any)
      .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
        scrollAggregate,
        corrupted,
      ), /oracle.*hash|aggregate.*hash/i);
  });
  await t.test("oracle cell cross-link", () => {
    const second = {
      cellId: "S4/data-handling/desktop/en/light",
      labId: "data-handling",
    };
    const { oracleAggregate, scrollAggregate } = paintedPackageFixture([cell, second]);
    const [firstCell, secondCell, ...remainingCells] = oracleAggregate.cells;
    assert.ok(firstCell);
    assert.ok(secondCell);
    const corrupted = {
      ...structuredClone(oracleAggregate),
      cells: [secondCell, firstCell, ...remainingCells],
    };
    assert.throws(() => (browserAdapter as any)
      .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
        scrollAggregate,
        corrupted,
      ), /cell|order|cross/i);
  });
});

test("painted-geometry pair selector ignores non-exact range interlopers beside one exact endpoint", async (t) => {
  const cell = {
    cellId: "S1/statistics-s1/desktop/en/light",
    labId: "statistics-s1",
  };
  for (const invalid of [
    {
      name: "extra-key before-state interloper",
      options: { extraKeyBeforeInterloper: true },
    },
    {
      name: "epsilon-near before-state interloper",
      options: { epsilonBeforeInterloper: true },
    },
  ]) {
    await t.test(invalid.name, () => {
      const { oracleAggregate, scrollAggregate } = paintedPackageFixture(
        [cell],
        invalid.options,
      );
      const aggregate = (browserAdapter as any)
        .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
          scrollAggregate,
          oracleAggregate,
        );
      assert.equal(aggregate.pairCount, 1);
      assert.equal(aggregate.cells[0].pair.beforeRef.observationIndex, 0);
    });
  }
});

test("painted-geometry pair adapter requires the exact ordered Reset trio after both endpoints", async (t) => {
  const cell = {
    cellId: "S1/statistics-s1/desktop/en/light",
    labId: "statistics-s1",
  };
  for (const invalid of [
    {
      name: "pair occurs after Reset",
      options: { pairAfterReset: true },
    },
    {
      name: "Enter Reset phase is missing",
      options: { missingReset: true },
    },
    {
      name: "Reset trio is reordered",
      options: { reorderReset: true },
    },
  ]) {
    await t.test(invalid.name, () => {
      const { oracleAggregate, scrollAggregate } = paintedPackageFixture(
        [cell],
        invalid.options,
      );
      assert.throws(
        () => (browserAdapter as any)
          .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
            scrollAggregate,
            oracleAggregate,
          ),
        /painted-geometry.*Reset|Reset.*chronology|Reset.*phase|ordered Reset/iu,
      );
    });
  }
});

test("painted-geometry adapter rejects fully rehashed source-oracle topology and receipt drift", async (t) => {
  const cell = {
    cellId: "S1/statistics-s1/desktop/en/light",
    labId: "statistics-s1",
  };
  const cases = [
    {
      name: "contractVersion",
      mutate(aggregate: any) { aggregate.contractVersion = "forged-v1"; },
    },
    {
      name: "cellCount",
      mutate(aggregate: any) { aggregate.cellCount += 1; },
    },
    {
      name: "per-cell observationCount",
      mutate(aggregate: any) { aggregate.cells[0].observationCount += 1; },
    },
    {
      name: "per-cell phases",
      mutate(aggregate: any) {
        aggregate.cells[0].phases[0] = "range-state:forged:hk-state:99999";
      },
    },
    {
      name: "per-cell observationHashes",
      mutate() {},
      afterRehash(aggregate: any) {
        aggregate.cells[0].observationHashes[0] = "f".repeat(64);
      },
    },
    {
      name: "aggregate observationCount",
      mutate(aggregate: any) { aggregate.observationCount += 1; },
    },
    {
      name: "aggregate passThroughCellCount",
      mutate(aggregate: any) { aggregate.passThroughCellCount += 1; },
    },
    {
      name: "source kind coordinated away from scroll authority",
      mutate(aggregate: any) {
        aggregate.cells[0].kind = "dedicated";
        aggregate.passThroughCellCount -= 1;
      },
    },
    {
      name: "source phase coordinated internally but not with scroll authority",
      mutate(aggregate: any) {
        const forged = "range-state:forged:hk-state:99999";
        aggregate.cells[0].phases[0] = forged;
        aggregate.cells[0].observations[0].phase = forged;
      },
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const { oracleAggregate, scrollAggregate } = paintedPackageFixture([cell]);
      const corrupted = structuredClone(oracleAggregate);
      invalid.mutate(corrupted);
      rehashPaintedSourceOracleAggregateFixture(corrupted);
      invalid.afterRehash?.(corrupted);
      assert.throws(
        () => (browserAdapter as any)
          .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
            scrollAggregate,
            corrupted,
          ),
        /source oracle|contractVersion|cellCount|observationCount|phases|observationHashes|passThroughCellCount|kind|scroll authority|cross-linked/iu,
      );
    });
  }
});

test("pass-through oracle aggregate rejects missing, extra, reordered, mismatched, and invalid layer evidence", async (t) => {
  const cellId = "P2/p2-multiplication-foundations/desktop/en/light";
  const phases = ["range-state:base", "reset-space"];
  const scrollAggregate = aggregateHkVisualizationBrowserScrollObservationReceipts(
    [{ cellId, phases }],
    [
      {
        cellId,
        scrollObservationPhasePlan: phases,
        scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)),
      },
    ],
  );
  const passing = () => [
    {
      cellId,
      labId: "p2-multiplication-foundations",
      passThroughOracleObservations: phases.map((phase) =>
        passThroughOracleObservation("p2-multiplication-foundations", phase),
      ),
    },
  ];
  const cases = [
    {
      name: "missing phase",
      mutate: (cells: any[]) => cells[0].passThroughOracleObservations.pop(),
      pattern: /observation count|phase/,
    },
    {
      name: "reordered phase",
      mutate: (cells: any[]) =>
        ([cells[0].passThroughOracleObservations[0], cells[0].passThroughOracleObservations[1]] = [
          cells[0].passThroughOracleObservations[1],
          cells[0].passThroughOracleObservations[0],
        ]),
      pattern: /phase|order/,
    },
    {
      name: "lab mismatch",
      mutate: (cells: any[]) =>
        (cells[0].passThroughOracleObservations[0].labId = "calculus"),
      pattern: /labId|mismatch/,
    },
    {
      name: "blank raw state",
      mutate: (cells: any[]) =>
        (cells[0].passThroughOracleObservations[0].rawRendererState.serializedState = " "),
      pattern: /raw renderer|serialized/i,
    },
    {
      name: "duplicate-key raw state",
      mutate: (cells: any[]) => {
        const raw = cells[0].passThroughOracleObservations[0].rawRendererState;
        raw.serializedState = raw.serializedState.replace(
          /^\{/u,
          '{"kind":"decoy",',
        );
      },
      pattern: /raw renderer|serialized|canonical/i,
    },
    {
      name: "whitespace-padded raw state",
      mutate: (cells: any[]) =>
        (cells[0].passThroughOracleObservations[0].rawRendererState.serializedState =
          ` ${cells[0].passThroughOracleObservations[0].rawRendererState.serializedState}`),
      pattern: /raw renderer|serialized|canonical/i,
    },
    {
      name: "negative-zero raw state",
      mutate: (cells: any[]) => {
        const raw = cells[0].passThroughOracleObservations[0].rawRendererState;
        raw.serializedState = raw.serializedState.replace(/\}$/u, ',"zero":-0}');
      },
      pattern: /raw renderer|serialized|canonical/i,
    },
    {
      name: "non-object raw state",
      mutate: (cells: any[]) =>
        (cells[0].passThroughOracleObservations[0].rawRendererState.serializedState =
          "[]"),
      pattern: /raw renderer|serialized|object|canonical/i,
    },
    {
      name: "raw selector count",
      mutate: (cells: any[]) =>
        (cells[0].passThroughOracleObservations[0].rawRendererState.selectorEvidence.count = 2),
      pattern: /raw renderer|selector/i,
    },
    {
      name: "empty visible named marks",
      mutate: (cells: any[]) =>
        (cells[0].passThroughOracleObservations[0].visibleNamedMarks = []),
      pattern: /visibleNamedMarks.*visible evidence/i,
    },
    {
      name: "empty visible math mark groups",
      mutate: (cells: any[]) =>
        (cells[0].passThroughOracleObservations[0].visibleMathMarks = {}),
      pattern: /visibleMathMarks.*at least one group/i,
    },
    {
      name: "empty visible math mark group",
      mutate: (cells: any[]) =>
        (cells[0].passThroughOracleObservations[0].visibleMathMarks.fixture = []),
      pattern: /visibleMathMarks\.fixture.*non-empty/i,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const cells = clone(passing());
      invalid.mutate(cells);
      assert.throws(
        () =>
          aggregateHkVisualizationBrowserPassThroughOracleReceipts(
            scrollAggregate,
            cells,
          ),
        invalid.pattern,
      );
    });
  }

  const dedicatedCellId = "P2/p2-place-value/desktop/en/light";
  const dedicatedScroll = aggregateHkVisualizationBrowserScrollObservationReceipts(
    [{ cellId: dedicatedCellId, phases: ["range-state:base"] }],
    [
      {
        cellId: dedicatedCellId,
        scrollObservationPhasePlan: ["range-state:base"],
        scrollObservationSets: [noOverflowScrollReceipt("range-state:base")],
      },
    ],
  );
  assert.throws(
    () =>
      aggregateHkVisualizationBrowserPassThroughOracleReceipts(
        dedicatedScroll,
        [
          {
            cellId: dedicatedCellId,
            labId: "p2-place-value",
            passThroughOracleObservations: [
              passThroughOracleObservation(
                "p2-multiplication-foundations",
                "range-state:base",
              ),
            ],
          },
        ],
      ),
    /dedicated.*zero|must not carry/i,
  );
});

test("pass-through Reset v3 builds three ordered public/raw/visible before-after layer pairs", () => {
  const builder = (browserAdapter as any)
    .buildHkVisualizationBrowserPassThroughResetEndpointReceipt;
  assert.equal(typeof builder, "function");
  const labId = "p2-multiplication-foundations";
  const phase = "range-state:reset:hk-state:00000";
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[labId];
  const beforeState =
    HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS[labId].beforeState;
  const receipt = builder({
    afterOracleObservation: passThroughOracleObservation(
      labId,
      phase,
      "canonical-after",
      { ...expected, model: "fixture", topic: labId },
    ),
    beforeOracleObservation: passThroughOracleObservation(
      labId,
      phase,
      "deliberate-before",
      { ...beforeState, model: "fixture", topic: labId },
    ),
    cellId: `P2/${labId}/desktop/en/light`,
    labId,
    phase,
  });
  assert.equal(receipt.layerReceiptCount, 3);
  assert.equal(receipt.layerEndpointHashCount, 6);
  assert.deepEqual(
    receipt.layerPairs.map(({ layer }: { layer: string }) => layer),
    ["public", "raw", "visible"],
  );
  assert.match(receipt.beforeEndpoint.observationHash, /^[a-f0-9]{64}$/);
  assert.match(receipt.afterEndpoint.observationHash, /^[a-f0-9]{64}$/);
  for (const pair of receipt.layerPairs) {
    assert.notEqual(pair.beforeHash, pair.afterHash);
    assert.match(pair.pairHash, /^[a-f0-9]{64}$/);
  }
});

test("pass-through Reset v3 endpoint receipt rejects missing, swapped, duplicate, endpoint-hash, and pair-hash drift", () => {
  const builder = (browserAdapter as any)
    .buildHkVisualizationBrowserPassThroughResetEndpointReceipt;
  const validator = (browserAdapter as any)
    .validateHkVisualizationBrowserPassThroughResetEndpointReceipt;
  assert.equal(typeof builder, "function");
  assert.equal(typeof validator, "function");
  const labId = "p2-multiplication-foundations";
  const cellId = `P2/${labId}/desktop/en/light`;
  const phase = "range-state:reset:hk-state:00000";
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[labId];
  const receipt = builder({
    afterOracleObservation: passThroughOracleObservation(
      labId,
      phase,
      "canonical-after",
      { ...expected, model: "fixture", topic: labId },
    ),
    beforeOracleObservation: passThroughOracleObservation(
      labId,
      phase,
      "deliberate-before",
      {
        ...HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS[labId].beforeState,
        model: "fixture",
        topic: labId,
      },
    ),
    cellId,
    labId,
    phase,
  });
  assert.doesNotThrow(() => validator({ cellId, labId, phase, receipt }));
  const clone = () => structuredClone(receipt);
  const invalidReceipts = [
    (() => {
      const value = clone();
      value.layerPairs.pop();
      return value;
    })(),
    (() => {
      const value = clone();
      [value.layerPairs[0], value.layerPairs[1]] = [
        value.layerPairs[1],
        value.layerPairs[0],
      ];
      return value;
    })(),
    (() => {
      const value = clone();
      value.layerPairs[1] = { ...value.layerPairs[0] };
      return value;
    })(),
    (() => {
      const value = clone();
      value.beforeEndpoint.publicStateHash = "0".repeat(64);
      return value;
    })(),
    (() => {
      const value = clone();
      value.layerPairs[2].pairHash = "f".repeat(64);
      return value;
    })(),
  ];
  for (const invalid of invalidReceipts) {
    assert.throws(
      () => validator({ cellId, labId, phase, receipt: invalid }),
      /endpoint|layer|pair|hash|ordered|exact/i,
    );
  }
});

test("pass-through Reset v3 endpoint raw state requires one canonical plain-object encoding after full rehash", async (t) => {
  const builder = (browserAdapter as any)
    .buildHkVisualizationBrowserPassThroughResetEndpointReceipt;
  const validator = (browserAdapter as any)
    .validateHkVisualizationBrowserPassThroughResetEndpointReceipt;
  const labId = "p2-multiplication-foundations";
  const cellId = `P2/${labId}/desktop/en/light`;
  const phase = "range-state:reset:hk-state:00000";
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[labId];
  const createReceipt = () => structuredClone(builder({
    afterOracleObservation: passThroughOracleObservation(
      labId,
      phase,
      "canonical-after",
      { ...expected, model: "fixture", topic: labId },
    ),
    beforeOracleObservation: passThroughOracleObservation(
      labId,
      phase,
      "deliberate-before",
      {
        ...HK_VISUALIZATION_PASS_THROUGH_RESET_PERTURBATIONS[labId].beforeState,
        model: "fixture",
        topic: labId,
      },
    ),
    cellId,
    labId,
    phase,
  }));
  const fullyRehashBeforeEndpoint = (receipt: any) => {
    const endpoint = receipt.beforeEndpoint;
    endpoint.rawRendererStateHash = sha256HkVisualizationCanonical(
      endpoint.rawRendererState,
    );
    const { observationHash: _ignored, ...endpointEvidence } = endpoint;
    endpoint.observationHash = sha256HkVisualizationCanonical({
      cellId,
      contractVersion: (browserAdapter as any)
        .HK_VISUALIZATION_BROWSER_PASS_THROUGH_ORACLE_AGGREGATE_VERSION,
      evidence: endpointEvidence,
      kind: "browser-pass-through-oracle-observation",
      labId,
    });
    const rawPair = receipt.layerPairs.find(({ layer }: { layer: string }) =>
      layer === "raw"
    );
    assert.ok(rawPair);
    rawPair.beforeHash = endpoint.rawRendererStateHash;
    rawPair.pairHash = hashHkVisualizationPassThroughResetLayerPair(rawPair);
  };
  const cases = [
    {
      name: "duplicate-key",
      mutate(serializedState: string) {
        return serializedState.replace(/^\{/u, '{"kind":"decoy",');
      },
    },
    {
      name: "leading whitespace",
      mutate(serializedState: string) { return ` ${serializedState}`; },
    },
    {
      name: "negative zero",
      mutate(serializedState: string) {
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
      const receipt = createReceipt();
      receipt.beforeEndpoint.rawRendererState.serializedState = invalid.mutate(
        receipt.beforeEndpoint.rawRendererState.serializedState,
      );
      fullyRehashBeforeEndpoint(receipt);
      assert.throws(
        () => validator({ cellId, labId, phase, receipt }),
        /rawRendererState|serialized|canonical|plain object/iu,
      );
    });
  }
});

test("pass-through Reset v3 aggregate binds full before/after endpoints and ordered pairs to same-phase oracle layers", () => {
  const labId = "p2-multiplication-foundations";
  const cellId = `P2/${labId}/desktop/en/light`;
  const actions = buildHkVisualizationPassThroughResetActionPlan(labId);
  const phases = actions.map(({ actionIndex, phase }) =>
    actionIndex === 0 ? "range-state:reset:hk-state:00000" : phase,
  );
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[labId];
  const scrollAggregate = aggregateHkVisualizationBrowserScrollObservationReceipts(
    [{ cellId, phases }],
    [{
      cellId,
      scrollObservationPhasePlan: phases,
      scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)),
    }],
  );
  const oracleAggregate = aggregateHkVisualizationBrowserPassThroughOracleReceipts(
    scrollAggregate,
    [{
      cellId,
      labId,
      passThroughOracleObservations: phases.map((phase) =>
        passThroughOracleObservation(labId, phase, phase, {
          ...expected,
          model: "fixture",
          topic: labId,
        }),
      ),
    }],
  );
  const aggregate = aggregateHkVisualizationBrowserPassThroughResetReceipts(
    scrollAggregate,
    oracleAggregate,
    [{
      cellId,
      labId,
      passThroughResetObservations: [
        passThroughResetObservation(
          labId,
          cellId,
          "range-state:reset:hk-state:00000",
          "Enter",
          "restoring",
        ),
        passThroughResetObservation(
          labId,
          cellId,
          "reset-space",
          "Space",
          "restoring",
        ),
        passThroughResetObservation(
          labId,
          cellId,
          "reset-space-idempotent",
          "Space",
          "canonical-noop",
        ),
      ],
    }],
  );
  assert.equal(aggregate.cellCount, 1);
  assert.equal(aggregate.passThroughCellCount, 1);
  assert.equal(aggregate.observationCount, 3);
  assert.equal(aggregate.restoringActionCount, 2);
  assert.equal(aggregate.canonicalNoopActionCount, 1);
  assert.equal(aggregate.layerReceiptCount, 9);
  assert.equal(aggregate.layerEndpointHashCount, 18);
  assert.equal(aggregate.cells[0].observationCount, 3);
  assert.equal(aggregate.cells[0].layerReceiptCount, 9);
  assert.equal(aggregate.cells[0].layerEndpointHashCount, 18);
  assert.deepEqual(aggregate.cells[0].phases, phases);
  for (const observation of aggregate.cells[0].observations) {
    assert.equal(observation.layerReceiptCount, 3);
    assert.equal(observation.layerEndpointHashCount, 6);
    assert.deepEqual(
      observation.layerPairs.map(({ layer }) => layer),
      ["public", "raw", "visible"],
    );
    const samePhaseOracle = oracleAggregate.cells[0].observations.find(
      ({ phase }) => phase === observation.phase,
    );
    assert.deepEqual(observation.afterEndpoint, samePhaseOracle);
    assert.equal(observation.afterFingerprint, observation.canonicalFingerprint);
    if (observation.actionKind === "restoring") {
      assert.notEqual(
        observation.beforeFingerprint,
        observation.canonicalFingerprint,
      );
    } else {
      assert.equal(
        observation.beforeFingerprint,
        observation.canonicalFingerprint,
      );
      for (const pair of observation.layerPairs) {
        assert.equal(pair.beforeHash, pair.afterHash);
      }
    }
    assert.match(observation.observationHash, /^[a-f0-9]{64}$/);
  }
  assert.match(aggregate.aggregateHash, /^[a-f0-9]{64}$/);
});

test("pass-through Reset v3 aggregate fails closed on endpoint, fingerprint, tuple, pair, and phase drift", async (t) => {
  const labId = "p2-multiplication-foundations";
  const cellId = `P2/${labId}/desktop/en/light`;
  const actions = buildHkVisualizationPassThroughResetActionPlan(labId);
  const phases = actions.map(({ actionIndex, phase }) =>
    actionIndex === 0 ? "range-state:reset:hk-state:00000" : phase,
  );
  const expected = HK_VISUALIZATION_PASS_THROUGH_RESET_PLANS[labId];
  const scrollAggregate = aggregateHkVisualizationBrowserScrollObservationReceipts(
    [{ cellId, phases }],
    [{
      cellId,
      scrollObservationPhasePlan: phases,
      scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)),
    }],
  );
  const oracleCells = () => [{
    cellId,
    labId,
    passThroughOracleObservations: phases.map((phase) =>
      passThroughOracleObservation(labId, phase, phase, {
        ...expected,
        model: "fixture",
        topic: labId,
      }),
    ),
  }];
  const resetCells = () => [{
    cellId,
    labId,
    passThroughResetObservations: [
      passThroughResetObservation(
        labId,
        cellId,
        "range-state:reset:hk-state:00000",
        "Enter",
        "restoring",
      ),
      passThroughResetObservation(
        labId,
        cellId,
        "reset-space",
        "Space",
        "restoring",
      ),
      passThroughResetObservation(
        labId,
        cellId,
        "reset-space-idempotent",
        "Space",
        "canonical-noop",
      ),
    ],
  }];
  const cases = [
    {
      name: "missing action",
      mutateReset: (cells: any[]) => cells[0].passThroughResetObservations.pop(),
      mutateOracle: (_cells: any[]) => undefined,
      pattern: /exact 3 ordered Reset observations/,
    },
    {
      name: "wrong exact before tuple",
      mutateReset: (cells: any[]) =>
        (cells[0].passThroughResetObservations[0].beforeState.comparison = 2),
      mutateOracle: (_cells: any[]) => undefined,
      pattern: /before-state|before tuple|perturb/i,
    },
    {
      name: "restoring fingerprint starts canonical",
      mutateReset: (cells: any[]) =>
        (cells[0].passThroughResetObservations[0].beforeFingerprint =
          cells[0].passThroughResetObservations[0].canonicalFingerprint),
      mutateOracle: (_cells: any[]) => undefined,
      pattern: /restoring.*fingerprint|noncanonical/i,
    },
    {
      name: "missing before endpoint",
      mutateReset: (cells: any[]) =>
        delete cells[0].passThroughResetObservations[0].beforeEndpoint,
      mutateOracle: (_cells: any[]) => undefined,
      pattern: /beforeEndpoint|exact/i,
    },
    {
      name: "swapped before and after endpoints",
      mutateReset: (cells: any[]) => {
        const observation = cells[0].passThroughResetObservations[0];
        [observation.beforeEndpoint, observation.afterEndpoint] = [
          observation.afterEndpoint,
          observation.beforeEndpoint,
        ];
      },
      mutateOracle: (_cells: any[]) => undefined,
      pattern: /endpoint|after.*oracle|hash|pair/i,
    },
    {
      name: "missing pair",
      mutateReset: (cells: any[]) =>
        cells[0].passThroughResetObservations[0].layerPairs.pop(),
      mutateOracle: (_cells: any[]) => undefined,
      pattern: /pair|layer|exact/i,
    },
    {
      name: "no-op visible layer drift",
      mutateReset: (cells: any[]) => {
        const phase = "reset-space-idempotent";
        const after = passThroughOracleObservation(labId, phase, phase, {
          ...expected,
          model: "fixture",
          topic: labId,
        });
        const drifted = browserAdapter
          .buildHkVisualizationBrowserPassThroughResetEndpointReceipt({
            afterOracleObservation: after,
            beforeOracleObservation: passThroughOracleObservation(
              labId,
              phase,
              `drifted-before:${phase}`,
              { ...expected, model: "fixture", topic: labId },
            ),
            cellId,
            labId,
            phase,
          });
        Object.assign(cells[0].passThroughResetObservations[2], drifted);
      },
      mutateOracle: (_cells: any[]) => undefined,
      pattern: /canonical no-op.*layer|before.*after|no-op/i,
    },
    {
      name: "missing same-phase oracle",
      mutateReset: (_cells: any[]) => undefined,
      mutateOracle: (cells: any[]) =>
        (cells[0].passThroughOracleObservations[2].phase = "wrong-phase"),
      pattern: /phase|ordered phase/,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const reset = clone(resetCells());
      const oracle = clone(oracleCells());
      invalid.mutateReset(reset);
      invalid.mutateOracle(oracle);
      assert.throws(
        () => {
          const oracleAggregate = aggregateHkVisualizationBrowserPassThroughOracleReceipts(
            scrollAggregate,
            oracle,
          );
          aggregateHkVisualizationBrowserPassThroughResetReceipts(
            scrollAggregate,
            oracleAggregate,
            reset,
          );
        },
        invalid.pattern,
      );
    });
  }
});

test("P6 averages aggregate binds exact zero then positive state-ledger boundaries to visible table and graph evidence", () => {
  const cellId = "P6/p6-ratio-proportion/desktop/en/light";
  const zeroPhase = "range-state:broken-line:p6-zero";
  const positivePhase = "range-state:broken-line:p6-positive";
  const phases = [zeroPhase, positivePhase, "range-state:reset:p6-reset"];
  const scrollAggregate = aggregateHkVisualizationBrowserScrollObservationReceipts(
    [{ cellId, phases }],
    [{
      cellId,
      scrollObservationPhasePlan: phases,
      scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)),
    }],
  );
  const aggregate = aggregateHkVisualizationBrowserP6AveragesReceipts(
    scrollAggregate,
    [{
      cellId,
      labId: "p6-ratio-proportion",
      p6AveragesLineGraphObservations: [
        p6AveragesObservation(zeroPhase, 0),
        p6AveragesObservation(positivePhase, 1),
      ],
      stateScanLedger: {
        entries: [
          { id: "p6-zero", phase: zeroPhase, reasons: ["semantic-boundary:p6-series-shift-zero"] },
          { id: "p6-positive", phase: positivePhase, reasons: ["semantic-boundary:p6-series-shift-positive"] },
          { id: "p6-reset", phase: "range-state:reset:p6-reset", reasons: ["reset"] },
        ],
        executedStateIds: ["p6-zero", "p6-positive", "p6-reset"],
        plannedStateIds: ["p6-zero", "p6-positive", "p6-reset"],
      },
    }],
  );
  assert.equal(aggregate.cellCount, 1);
  assert.equal(aggregate.boundaryObservationCount, 2);
  assert.deepEqual(aggregate.cells[0].phases, [zeroPhase, positivePhase]);
  assert.deepEqual(
    aggregate.cells[0].boundaries.map(({ boundary }) => boundary),
    ["zero-shift", "ordinary-positive"],
  );
  assert.equal(aggregate.cells[0].boundaries[0].observation.flags.seriesCoincident, "true");
  assert.equal(aggregate.cells[0].boundaries[1].observation.flags.seriesCoincident, "false");
  assert.match(aggregate.cells[0].cellAggregateHash, /^[a-f0-9]{64}$/);
  assert.match(aggregate.aggregateHash, /^[a-f0-9]{64}$/);
});

test("P6 averages aggregate rejects grade, plan, phase, order, numeric, visibility, and duplicate drift", async (t) => {
  const cellId = "P6/p6-ratio-proportion/desktop/en/light";
  const zeroPhase = "range-state:broken-line:p6-zero";
  const positivePhase = "range-state:broken-line:p6-positive";
  const phases = [zeroPhase, positivePhase, "range-state:reset:p6-reset"];
  const scrollAggregate = aggregateHkVisualizationBrowserScrollObservationReceipts(
    [{ cellId, phases }],
    [{
      cellId,
      scrollObservationPhasePlan: phases,
      scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)),
    }],
  );
  const passing = () => [{
    cellId,
    labId: "p6-ratio-proportion",
    p6AveragesLineGraphObservations: [
      p6AveragesObservation(zeroPhase, 0),
      p6AveragesObservation(positivePhase, 1),
    ],
    stateScanLedger: {
      entries: [
        { id: "p6-zero", phase: zeroPhase, reasons: ["semantic-boundary:p6-series-shift-zero"] },
        { id: "p6-positive", phase: positivePhase, reasons: ["semantic-boundary:p6-series-shift-positive"] },
        { id: "p6-reset", phase: "range-state:reset:p6-reset", reasons: ["reset"] },
      ],
      executedStateIds: ["p6-zero", "p6-positive", "p6-reset"],
      plannedStateIds: ["p6-zero", "p6-positive", "p6-reset"],
    },
  }];
  const cases: Array<{
    name: string;
    mutate: (cells: any[]) => void;
    pattern: RegExp;
  }> = [
    {
      name: "missing zero boundary",
      mutate: (cells) => cells[0].stateScanLedger.entries[0].reasons = ["minimum"],
      pattern: /exactly one zero-shift/,
    },
    {
      name: "duplicate positive reason",
      mutate: (cells) => cells[0].stateScanLedger.entries[0].reasons.push("semantic-boundary:p6-series-shift-positive"),
      pattern: /exactly one zero-shift.*ordinary-positive/,
    },
    {
      name: "planned state gap",
      mutate: (cells) => cells[0].stateScanLedger.executedStateIds.pop(),
      pattern: /missing, duplicate, extra, or out of order/,
    },
    {
      name: "reordered observations",
      mutate: (cells) => cells[0].p6AveragesLineGraphObservations.reverse(),
      pattern: /zero before ordinary positive/,
    },
    {
      name: "zero state uses positive shift",
      mutate: (cells) => cells[0].p6AveragesLineGraphObservations[0] = p6AveragesObservation(zeroPhase, 1),
      pattern: /zero-shift boundary.*seriesBShift=0/,
    },
    {
      name: "table and graph drift",
      mutate: (cells) => cells[0].p6AveragesLineGraphObservations[1].tableRows[0].seriesB += 1,
      pattern: /numeric\/geometry oracle.*B=A\+shift/,
    },
    {
      name: "hidden point evidence",
      mutate: (cells) => cells[0].p6AveragesLineGraphObservations[0].visibility.points.A[0].visuallyVisible = false,
      pattern: /numeric\/geometry oracle.*learner-visible/,
    },
    {
      name: "duplicate observation phase",
      mutate: (cells) => cells[0].p6AveragesLineGraphObservations.push(p6AveragesObservation(zeroPhase, 0)),
      pattern: /observation phases must be duplicate-free/,
    },
    {
      name: "unknown observation phase",
      mutate: (cells) => cells[0].p6AveragesLineGraphObservations.push(p6AveragesObservation("unknown-phase", 2)),
      pattern: /unknown scroll phase/,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const cells = clone(passing());
      invalid.mutate(cells);
      assert.throws(
        () => aggregateHkVisualizationBrowserP6AveragesReceipts(scrollAggregate, cells),
        invalid.pattern,
      );
    });
  }

  const wrongGradeCellId = "P5/p6-ratio-proportion/desktop/en/light";
  const wrongGradeScroll = aggregateHkVisualizationBrowserScrollObservationReceipts(
    [{ cellId: wrongGradeCellId, phases }],
    [{
      cellId: wrongGradeCellId,
      scrollObservationPhasePlan: phases,
      scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)),
    }],
  );
  const wrongGradeCells = clone(passing());
  wrongGradeCells[0].cellId = wrongGradeCellId;
  await t.test("wrong grade binding", () => {
    assert.throws(
      () => aggregateHkVisualizationBrowserP6AveragesReceipts(wrongGradeScroll, wrongGradeCells),
      /exact P6 grade\/lab cell/,
    );
  });
});

test("P6 budget aggregate binds nine ordered represent, solve, and check boundaries", () => {
  const cellId = "P6/p6-pre-secondary-problem-solving/desktop/en/light";
  const contract = (["represent", "solve", "check"] as const).flatMap((modeId) =>
    (["positive-remaining", "exact-zero", "positive-overspend"] as const).map(
      (boundary) => ({
        boundary,
        id: `${modeId}-${boundary}`,
        modeId,
        phase: `range-state:${modeId}:${boundary}`,
        reason: `semantic-boundary:p6-budget-${boundary}`,
      }),
    ),
  );
  const phases = [...contract.map(({ phase }) => phase), "range-state:reset"];
  const scroll = aggregateHkVisualizationBrowserScrollObservationReceipts(
    [{ cellId, phases }],
    [{ cellId, scrollObservationPhasePlan: phases, scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)) }],
  );
  const aggregate = aggregateHkVisualizationBrowserP6BudgetReceipts(scroll, [{
    cellId,
    labId: "p6-pre-secondary-problem-solving",
    p6BudgetBoundaryObservations: contract.map(({ boundary, modeId, phase }) =>
      p6BudgetObservation(phase, modeId, boundary),
    ),
    stateScanLedger: {
      entries: [
        ...contract.map(({ id, modeId, phase, reason }) => ({
          id,
          modeId,
          phase,
          reasons: [reason],
        })),
        { id: "reset", modeId: "reset", phase: "range-state:reset", reasons: ["reset"] },
      ],
      executedStateIds: [...contract.map(({ id }) => id), "reset"],
      plannedStateIds: [...contract.map(({ id }) => id), "reset"],
    },
  }]);
  assert.equal(aggregate.cellCount, 1);
  assert.equal(aggregate.boundaryObservationCount, 9);
  assert.deepEqual(
    aggregate.cells[0].boundaries.map(({ modeId, boundary }) => `${modeId}:${boundary}`),
    contract.map(({ modeId, boundary }) => `${modeId}:${boundary}`),
  );
  assert.match(aggregate.cells[0].cellAggregateHash, /^[a-f0-9]{64}$/);
  assert.match(aggregate.aggregateHash, /^[a-f0-9]{64}$/);
});

test("P6 budget aggregate rejects missing, reordered, duplicate, wrong-grade, arithmetic, geometry, visibility, and hash-source drift", async (t) => {
  const cellId = "P6/p6-pre-secondary-problem-solving/desktop/en/light";
  const contract = (["represent", "solve", "check"] as const).flatMap((modeId) =>
    (["positive-remaining", "exact-zero", "positive-overspend"] as const).map(
      (boundary) => ({
        boundary,
        id: `${modeId}-${boundary}`,
        modeId,
        phase: `range-state:${modeId}:${boundary}`,
        reason: `semantic-boundary:p6-budget-${boundary}`,
      }),
    ),
  );
  const phases = [...contract.map(({ phase }) => phase), "range-state:reset"];
  const scroll = aggregateHkVisualizationBrowserScrollObservationReceipts(
    [{ cellId, phases }],
    [{ cellId, scrollObservationPhasePlan: phases, scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)) }],
  );
  const passing = () => [{
    cellId,
    labId: "p6-pre-secondary-problem-solving",
    p6BudgetBoundaryObservations: contract.map(({ boundary, modeId, phase }) =>
      p6BudgetObservation(phase, modeId, boundary),
    ),
    stateScanLedger: {
      entries: [
        ...contract.map(({ id, modeId, phase, reason }) => ({ id, modeId, phase, reasons: [reason] })),
        { id: "reset", modeId: "reset", phase: "range-state:reset", reasons: ["reset"] },
      ],
      executedStateIds: [...contract.map(({ id }) => id), "reset"],
      plannedStateIds: [...contract.map(({ id }) => id), "reset"],
    },
  }];
  const cases = [
    {
      name: "missing semantic boundary",
      mutate: (cells: any[]) => cells[0].stateScanLedger.entries[0].reasons = ["minimum"],
      pattern: /exactly nine/,
    },
    {
      name: "reordered semantic boundary",
      mutate: (cells: any[]) => cells[0].stateScanLedger.entries[0].modeId = "solve",
      pattern: /must be represent:positive-remaining/,
    },
    {
      name: "duplicate observation phase",
      mutate: (cells: any[]) => cells[0].p6BudgetBoundaryObservations.push(
        p6BudgetObservation(contract[0].phase, "represent", "positive-remaining"),
      ),
      pattern: /exact nine ordered semantic boundary phases/,
    },
    {
      name: "extra known nonsemantic phase",
      mutate: (cells: any[]) => cells[0].p6BudgetBoundaryObservations.push(
        p6BudgetObservation("range-state:reset", "represent", "positive-remaining"),
      ),
      pattern: /exact nine ordered semantic boundary phases/,
    },
    {
      name: "missing observation",
      mutate: (cells: any[]) => cells[0].p6BudgetBoundaryObservations.pop(),
      pattern: /exact nine ordered semantic boundary phases/,
    },
    {
      name: "reordered observations",
      mutate: (cells: any[]) => {
        [cells[0].p6BudgetBoundaryObservations[0], cells[0].p6BudgetBoundaryObservations[1]] = [
          cells[0].p6BudgetBoundaryObservations[1],
          cells[0].p6BudgetBoundaryObservations[0],
        ];
      },
      pattern: /exact nine ordered semantic boundary phases/,
    },
    {
      name: "arithmetic drift",
      mutate: (cells: any[]) => cells[0].p6BudgetBoundaryObservations[1].derived.remaining = 1,
      pattern: /arithmetic\/geometry oracle.*remaining/,
    },
    {
      name: "geometry drift",
      mutate: (cells: any[]) => cells[0].p6BudgetBoundaryObservations[0].surface.geometry.marker.x1 += 5,
      pattern: /arithmetic\/geometry oracle.*marker/,
    },
    {
      name: "visibility drift",
      mutate: (cells: any[]) => cells[0].p6BudgetBoundaryObservations[3].surface.visibility.result.hiddenAncestor = true,
      pattern: /arithmetic\/geometry oracle.*hidden/,
    },
    {
      name: "raw state drift",
      mutate: (cells: any[]) => cells[0].p6BudgetBoundaryObservations[0].serializedDedicatedState = JSON.stringify({
        ...cells[0].p6BudgetBoundaryObservations[0].dedicatedState,
        budget: 61,
      }),
      pattern: /arithmetic\/geometry oracle.*serialized/,
    },
  ];
  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const cells = clone(passing());
      invalid.mutate(cells);
      assert.throws(() => aggregateHkVisualizationBrowserP6BudgetReceipts(scroll, cells), invalid.pattern);
    });
  }
  const wrongCellId = "P5/p6-pre-secondary-problem-solving/desktop/en/light";
  const wrongScroll = aggregateHkVisualizationBrowserScrollObservationReceipts(
    [{ cellId: wrongCellId, phases }],
    [{ cellId: wrongCellId, scrollObservationPhasePlan: phases, scrollObservationSets: phases.map((phase) => noOverflowScrollReceipt(phase)) }],
  );
  const wrongCells = clone(passing());
  wrongCells[0].cellId = wrongCellId;
  await t.test("wrong grade", () => {
    assert.throws(
      () => aggregateHkVisualizationBrowserP6BudgetReceipts(wrongScroll, wrongCells),
      /exact P6 grade\/lab cell/,
    );
  });
});

test("canonical package scroll aggregate rejects a missing planned action or reset phase", () => {
  assert.throws(
    () =>
      aggregateHkVisualizationBrowserScrollObservationReceipts(
        [
          {
            cellId: "cell-a",
            phases: [
              "range-state:base",
              "manifest-control-roll",
              "reset-enter",
            ],
          },
        ],
        [
          {
            cellId: "cell-a",
            scrollObservationPhasePlan: ["range-state:base"],
            scrollObservationSets: [
              noOverflowScrollReceipt("range-state:base"),
            ],
          },
        ],
      ),
    /planned phase count|runtime audit-entry phase plan|missing.*action|missing.*reset/,
  );
});

test("independent state and interaction ledgers derive range, action, Enter reset, and Space reset phases without reading actual receipts", () => {
  const plan = buildHkVisualizationBrowserScrollCellPlan({
    cellId: "P3/fractions/desktop/en/light",
    interactions: [
      { action: "keyboard-mode-bars", status: "passed" },
      { action: "range-state:hk-state:00000", status: "passed" },
      { action: "keyboard-roll", status: "passed" },
      { action: "keyboard-reset-Enter", status: "passed" },
      { action: "keyboard-reset-Space", status: "passed" },
      { action: "keyboard-reset-Space-idempotent", status: "passed" },
    ],
    stateScanLedger: {
      entries: [
        {
          id: "hk-state:00000",
          modeId: "bars",
          phase: "range-state:bars:hk-state:00000",
        },
        {
          id: "hk-state:00001",
          modeId: "reset",
          phase: "range-state:reset:hk-state:00001",
        },
      ],
      executedStateIds: ["hk-state:00000", "hk-state:00001"],
      plannedStateIds: ["hk-state:00000", "hk-state:00001"],
    },
  });
  assert.deepEqual(plan, {
    cellId: "P3/fractions/desktop/en/light",
    phases: [
      "range-state:bars:hk-state:00000",
      "control-roll",
      "range-state:reset:hk-state:00001",
      "reset-space",
      "reset-space-idempotent",
    ],
  });
});

test("independent phase planning rejects ledger gaps, missing reset, duplicate state execution, failed actions, and unknown action policy", () => {
  const passing = () => ({
    cellId: "P3/fractions/desktop/en/light",
    interactions: [
      { action: "range-state:hk-state:00000", status: "passed" },
      { action: "keyboard-reset-Enter", status: "passed" },
      { action: "keyboard-reset-Space", status: "passed" },
      { action: "keyboard-reset-Space-idempotent", status: "passed" },
    ],
    stateScanLedger: {
      entries: [
        {
          id: "hk-state:00000",
          modeId: "bars",
          phase: "range-state:bars:hk-state:00000",
        },
        {
          id: "hk-state:00001",
          modeId: "reset",
          phase: "range-state:reset:hk-state:00001",
        },
      ],
      executedStateIds: ["hk-state:00000", "hk-state:00001"],
      plannedStateIds: ["hk-state:00000", "hk-state:00001"],
    },
  });
  const cases: Array<[string, (input: any) => void, RegExp]> = [
    [
      "ledger gap",
      (input) => input.stateScanLedger.executedStateIds.pop(),
      /state ledger is missing/,
    ],
    [
      "missing reset interaction",
      (input) => input.interactions.splice(1, 1),
      /missing independently planned state\/reset interactions/,
    ],
    [
      "duplicate state execution",
      (input) => input.interactions.splice(1, 0, clone(input.interactions[0])),
      /duplicated state/,
    ],
    [
      "failed action",
      (input) => (input.interactions[0].status = "failed"),
      /did not pass/,
    ],
    [
      "unknown action",
      (input) => input.interactions.splice(1, 0, { action: "future-action", status: "passed" }),
      /unknown.*phase policy/,
    ],
  ];
  for (const [, mutate, pattern] of cases) {
    const input = clone(passing());
    mutate(input);
    assert.throws(
      () => buildHkVisualizationBrowserScrollCellPlan(input),
      pattern,
    );
  }
});

test("source contract keeps every canonical action family and both Reset activations independently planned before its scroll audit", () => {
  const source = readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "utf8",
  );
  for (const required of [
    /action:\s*`range-state:\$\{planned\.id\}`[\s\S]{0,1600}auditInteractiveState\(workspace, result, deadline, planned\.phase\)/,
    /action:\s*`keyboard-\$\{controlId\}`[\s\S]{0,1800}auditInteractiveState\([\s\S]{0,300}`control-\$\{controlId\}`/,
    /action:\s*`\$\{controlId\}-\$\{key\}`[\s\S]{0,1800}auditInteractiveState\([\s\S]{0,300}`\$\{controlId\}-\$\{key\.toLowerCase\(\)\}`/,
    /action:\s*"3d-play-pause"[\s\S]{0,2200}auditInteractiveState\(workspace, result, deadline, "3d-playback"\)/,
    /action:\s*"3d-timeline-keyboard"[\s\S]{0,1800}auditInteractiveState\([\s\S]{0,250}"3d-timeline-home"/,
    /action:\s*"3d-reset-camera"[\s\S]{0,1200}auditInteractiveState\(workspace, result, deadline, "3d-reset-camera"\)/,
    /action:\s*"fill-and-add-point"[\s\S]{0,2200}auditInteractiveState\([\s\S]{0,250}"coordinate-add-point"/,
    /buildHkVisualizationPassThroughResetActionPlan\(result\.labId\)[\s\S]{0,14000}actionKind === "canonical-noop"[\s\S]{0,14000}auditInteractiveState\(/,
    /keyboard-reset-\$\{activationKey\}-idempotent[\s\S]{0,14000}auditHkVisualizationPassThroughResetObservation/,
  ]) {
    assert.match(source, required);
  }
  assert.match(
    source,
    /exerciseFullInteractions\([\s\S]{0,1600}exerciseDeclaredControl\([\s\S]{0,1000}exerciseThreeDLearnerInteractions\([\s\S]{0,600}exerciseCoordinatePoint\([\s\S]{0,700}exerciseReset\(/,
  );
});

test("machine spec emits exactly one canonical painted-geometry pair annotation inside every package", () => {
  const source = readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    "utf8",
  );
  assert.equal(
    source.match(/const passThroughPaintedGeometryPairEvidence\s*=/gu)?.length,
    1,
  );
  assert.equal(
    source.match(/type:\s*HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_ANNOTATION_TYPE/gu)?.length,
    1,
  );
  assert.match(
    source,
    /const passThroughOracleEvidence\s*=[\s\S]{0,1800}const passThroughPaintedGeometryPairEvidence\s*=\s*aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts\(\s*scrollObservationEvidence,\s*passThroughOracleEvidence,?\s*\)[\s\S]{0,700}type:\s*HK_VISUALIZATION_BROWSER_PASS_THROUGH_PAINTED_GEOMETRY_PAIR_ANNOTATION_TYPE,[\s\S]{0,220}description:\s*JSON\.stringify\(passThroughPaintedGeometryPairEvidence\)/u,
  );
  assert.doesNotMatch(
    source,
    /JSON\.stringify\(passThroughPaintedGeometryPairEvidence\s*,/u,
  );
  assert.match(
    source,
    /test\.setTimeout\(Math\.max\(120_000, 45_000 \+ packageCellBudget\)\)/u,
  );

  const cellId = "S1/statistics-s1/desktop/en/light";
  const { oracleAggregate, scrollAggregate } = paintedPackageFixture([
    { cellId, labId: "statistics-s1" },
  ]);
  const aggregate = (browserAdapter as any)
    .aggregateHkVisualizationBrowserPassThroughPaintedGeometryPairReceipts(
      scrollAggregate,
      oracleAggregate,
    );
  const description = JSON.stringify(aggregate);
  assert.doesNotMatch(description, /[\r\n]/u);
  assert.deepEqual(JSON.parse(description), aggregate);
});

test("pass-through Reset v3 source restores, perturbs exact comparison, audits both endpoints, and rejects universal 5/4/0", () => {
  const source = readFileSync(
    "tests/e2e/hk-visualization-machine-acceptance-helpers.ts",
    "utf8",
  );
  const resetSource = source.slice(
    source.indexOf("async function exerciseReset("),
    source.indexOf("function samePassThroughResetState("),
  );
  assert.match(resetSource, /planHkVisualizationPassThroughResetPrecondition/);
  assert.match(resetSource, /auditHkVisualizationPassThroughResetPrecondition/);
  assert.match(
    resetSource,
    /ensureNonCanonicalResetState[\s\S]*?beforeOracleObservation[\s\S]*?assertHkVisualizationPassThroughResetOracleEndpoint[\s\S]*?reset\.press\(activationKey[\s\S]*?afterOracleObservation[\s\S]*?assertHkVisualizationPassThroughResetOracleEndpoint/,
  );
  assert.match(
    resetSource,
    /const exactSlider = dynamicDescendantLocator\([\s\S]*?perturbation\.selector[\s\S]*?exactSlider\.count\(\)\) !== 1[\s\S]*?perturbation\.targetValue/,
  );
  const exactSliderSlice = resetSource.slice(
    resetSource.indexOf("const exactSlider"),
    resetSource.indexOf("const genericSliders"),
  );
  assert.doesNotMatch(exactSliderSlice, /\.first\(\)/);
  for (const universalLiteral of [
    /toHaveAttribute\("data-viz-reset-value",\s*"5"/,
    /toHaveAttribute\("data-viz-reset-comparison",\s*"4"/,
    /toHaveAttribute\("data-viz-reset-mode",\s*"0"/,
    /state\.value\s*!==\s*"5"/,
    /state\.comparison\s*!==\s*"4"/,
    /state\.mode\s*!==\s*"0"/,
  ]) {
    assert.doesNotMatch(resetSource, universalLiteral);
  }
});

test("canonical package scroll aggregate rejects missing, extra, duplicate, order, schedule, count, and nested hash drift", async (t) => {
  const expectedCells = [
    { cellId: "cell-a", phases: ["initial-state", "formula-state"] },
    { cellId: "cell-b", phases: ["reset-enter"] },
  ];
  const passingCells = () => [
    {
      cellId: "cell-a",
      scrollObservationPhasePlan: ["initial-state", "formula-state"],
      scrollObservationSets: [
        noOverflowScrollReceipt("initial-state"),
        formulaOverflowScrollReceipt("formula-state"),
      ],
    },
    {
      cellId: "cell-b",
      scrollObservationPhasePlan: ["reset-enter"],
      scrollObservationSets: [noOverflowScrollReceipt("reset-enter")],
    },
  ];
  const cases: readonly {
    name: string;
    mutate: (cells: any[]) => void;
    pattern: RegExp;
  }[] = [
    {
      name: "missing cell",
      mutate: (cells) => cells.pop(),
      pattern: /cell receipt count/,
    },
    {
      name: "extra cell",
      mutate: (cells) => cells.push(clone(cells[1])),
      pattern: /cell receipt count/,
    },
    {
      name: "cell order",
      mutate: (cells) => ([cells[0], cells[1]] = [cells[1], cells[0]]),
      pattern: /cellId or is out of order/,
    },
    {
      name: "duplicate phase",
      mutate: (cells) =>
        (cells[0].scrollObservationSets[1].phase =
          cells[0].scrollObservationSets[0].phase),
      pattern: /duplicated phase/,
    },
    {
      name: "missing action phase",
      mutate: (cells) => cells[0].scrollObservationSets.pop(),
      pattern: /planned phase count|action or reset phase is missing/,
    },
    {
      name: "missing reset phase",
      mutate: (cells) => cells[1].scrollObservationSets.pop(),
      pattern: /planned phase count|action or reset phase is missing/,
    },
    {
      name: "extra unknown phase",
      mutate: (cells) =>
        cells[0].scrollObservationSets.push(
          clone(noOverflowScrollReceipt("unknown-phase")),
        ),
      pattern: /planned phase count|extra/,
    },
    {
      name: "receipt phase order",
      mutate: (cells) =>
        ([
          cells[0].scrollObservationSets[0],
          cells[0].scrollObservationSets[1],
        ] = [
          cells[0].scrollObservationSets[1],
          cells[0].scrollObservationSets[0],
        ]),
      pattern: /exact planned phase|out of order/,
    },
    {
      name: "missing observation set",
      mutate: (cells) => delete cells[0].scrollObservationSets[0].observationSet,
      pattern: /scroll|containers must be an array/,
    },
    {
      name: "runtime audit-entry phase plan drift",
      mutate: (cells) => cells[0].scrollObservationPhasePlan.pop(),
      pattern: /runtime audit-entry phase plan differs/,
    },
    {
      name: "extra receipt key",
      mutate: (cells) => (cells[0].scrollObservationSets[0].extra = true),
      pattern: /contain exactly/,
    },
    {
      name: "observation order",
      mutate: (cells) => {
        const observations =
          cells[0].scrollObservationSets[1].observationSet.observations;
        [observations[1], observations[2]] = [
          observations[2],
          observations[1],
        ];
      },
      pattern: /ordered.*schedule|violates exact ordered/,
    },
    {
      name: "observation count",
      mutate: (cells) =>
        (cells[0].scrollObservationSets[1].observationSet.observationCount = 2),
      pattern: /count, order, schedule, or hash drift/,
    },
    {
      name: "schedule hash",
      mutate: (cells) =>
        (cells[0].scrollObservationSets[1].observationSet.scheduleHash =
          sha256HkVisualizationCanonical({ drift: "schedule" })),
      pattern: /count, order, schedule, or hash drift/,
    },
    {
      name: "observation-set hash",
      mutate: (cells) =>
        (cells[0].scrollObservationSets[1].observationSet.observationSetHash =
          sha256HkVisualizationCanonical({ drift: "set" })),
      pattern: /count, order, schedule, or hash drift/,
    },
    {
      name: "positive candidate count",
      mutate: (cells) =>
        (cells[0].scrollObservationSets[1].observationSet.observations[1]
          .positiveEvidenceCounts.contrastText = 0),
      pattern: /positive safe integer/,
    },
  ];

  for (const invalid of cases) {
    await t.test(invalid.name, () => {
      const cells = clone(passingCells());
      invalid.mutate(cells);
      assert.throws(
        () =>
          aggregateHkVisualizationBrowserScrollObservationReceipts(
            expectedCells,
            cells,
          ),
        invalid.pattern,
      );
    });
  }
});

test("browser chunk runtime paths require distinct absolute Starship descendants", () => {
  const paths = canonicalHkVisualizationBrowserRuntimePaths({
    artifactRoot: "/Volumes/Starship/.tmp/hk-viz",
    browserProfileRoot:
      "/Volumes/Starship/.tmp/hk-viz/runtime/chrome-profile",
  });
  assert.deepEqual(paths, {
    artifactRoot: "/Volumes/Starship/.tmp/hk-viz",
    browserProfileRoot:
      "/Volumes/Starship/.tmp/hk-viz/runtime/chrome-profile",
  });
  assert.ok(Object.isFrozen(paths));

  for (const invalid of [
    {
      artifactRoot: ".tmp/artifacts",
      browserProfileRoot: "/Volumes/Starship/.tmp/profile",
    },
    {
      artifactRoot: "/tmp/artifacts",
      browserProfileRoot: "/Volumes/Starship/.tmp/profile",
    },
    {
      artifactRoot: "/Volumes/Starship",
      browserProfileRoot: "/Volumes/Starship/.tmp/profile",
    },
    {
      artifactRoot: "/Volumes/Starship/../escape",
      browserProfileRoot: "/Volumes/Starship/.tmp/profile",
    },
    {
      artifactRoot: "/Volumes/Starship/.tmp/shared",
      browserProfileRoot: "/Volumes/Starship/.tmp/shared",
    },
    {
      artifactRoot: "/Volumes/Starship/.tmp/artifacts",
      browserProfileRoot: "/Volumes/Starship/.tmp/profile-sibling",
    },
  ]) {
    assert.throws(
      () => canonicalHkVisualizationBrowserRuntimePaths(invalid),
      /absolute|Starship descendant|distinct|inside artifactRoot/,
    );
  }
});
