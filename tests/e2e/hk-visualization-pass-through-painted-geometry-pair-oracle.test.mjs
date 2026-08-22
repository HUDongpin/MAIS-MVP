import assert from "node:assert/strict";
import test from "node:test";

import {
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH,
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLANS,
  HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION,
  auditHkVisualizationPassThroughCrossStatePaintedGeometryPair,
} from "./hk-visualization-pass-through-painted-geometry-pair-oracle.mjs";

const HASH = "0".repeat(64);
const frame = Object.freeze({ height: 148, width: 456, x: 92, y: 116 });
const viewports = Object.freeze({
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

const exactPublicStatesByLab = Object.freeze({
  "statistics-s1": Object.freeze({
    after: Object.freeze({
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
      topic: "statistics-s1",
      value: 0,
      variant: "statistics-s1",
    }),
    before: Object.freeze({
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
      topic: "statistics-s1",
      value: 0,
      variant: "statistics-s1",
    }),
  }),
  "data-handling": Object.freeze({
    after: Object.freeze({
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
      topic: "data-handling",
      value: 0,
      variant: "data-handling",
    }),
    before: Object.freeze({
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
      topic: "data-handling",
      value: 0,
      variant: "data-handling",
    }),
  }),
  "advanced-functions": Object.freeze({
    after: Object.freeze({
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
    }),
    before: Object.freeze({
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
    }),
  }),
});

function fixed(value, digits = 2) {
  const rounded = Number(value.toFixed(digits));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function mapPoint(point, viewport) {
  return {
    x: frame.x + ((point.x - viewport.domain.xMin) /
      (viewport.domain.xMax - viewport.domain.xMin)) * frame.width,
    y: frame.y + frame.height - ((point.y - viewport.domain.yMin) /
      (viewport.domain.yMax - viewport.domain.yMin)) * frame.height,
  };
}

function mark(attributes, text = "", tagName = "path") {
  return { attributes: Object.fromEntries(Object.entries(attributes).map(
    ([key, value]) => [key, String(value)],
  )), tagName, text };
}

function localized(labId, state, locale) {
  if (labId === "statistics-s1" || labId === "data-handling") {
    const mean = fixed(state.mean);
    const spread = fixed(state.spread);
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
  const coefficient = fixed(state.scale);
  const shift = fixed(state.verticalShift);
  const formula = `y=${coefficient}x² + ${fixed(Math.abs(state.verticalShift))}`;
  if (locale === "zh") return {
    check: `已選二次函數 · a=${coefficient} · k=${shift}`,
    checkLabel: "驗證",
    formula,
    formulaLabel: "公式",
    readout: `二次函數 · a=${coefficient} · k=${shift}`,
  };
  if (locale === "zh-Hans") return {
    check: `已选二次函数 · a=${coefficient} · k=${shift}`,
    checkLabel: "验证",
    formula,
    formulaLabel: "公式",
    readout: `二次函数 · a=${coefficient} · k=${shift}`,
  };
  return {
    check: `selected quadratic · a=${coefficient} · k=${shift}`,
    checkLabel: "Check",
    formula,
    formulaLabel: "Formula",
    readout: `quadratic · a=${coefficient} · k=${shift}`,
  };
}

function visibleNamedMarkOccurrences(family, viewport) {
  const names = [
    "configured semantic secondary model",
    "semantic model body",
    "semantic fixed viewport",
    ...viewport.xTicks.map(() => "semantic x tick"),
    ...viewport.yTicks.map(() => "semantic y tick"),
    "semantic x axis",
    "semantic y axis",
  ];
  if (family === "distribution") {
    names.push(
      "distribution spread band",
      "distribution summary curve",
      "distribution left spread marker",
      "distribution right spread marker",
      "distribution mean",
      "distribution summary readout",
    );
  } else {
    names.push(
      "advanced primary curve",
      "advanced curve sample",
      "advanced curve sample",
      "advanced curve sample",
      "advanced function readout",
    );
  }
  names.push(
    "semantic formula background",
    "semantic formula",
    "semantic invariant check background",
    "semantic invariant check",
    "semantic formula and check outline",
  );
  return names;
}

function viewportMarks(viewport) {
  const viewportMark = mark({
    "data-viz-domain-x-max": viewport.domain.xMax,
    "data-viz-domain-x-min": viewport.domain.xMin,
    "data-viz-domain-y-max": viewport.domain.yMax,
    "data-viz-domain-y-min": viewport.domain.yMin,
    "data-viz-viewport-id": viewport.id,
    "data-viz-x-ticks": viewport.xTicks.join(","),
    "data-viz-y-ticks": viewport.yTicks.join(","),
    height: frame.height,
    width: frame.width,
    x: frame.x,
    y: frame.y,
  }, "", "rect");
  const xTicks = viewport.xTicks.map((tick) => {
    const point = mapPoint({ x: tick, y: 0 }, viewport);
    return mark({
      "data-viz-tick-axis": "x",
      "data-viz-tick-value": tick,
      x1: point.x,
      x2: point.x,
      y1: frame.y,
      y2: frame.y + frame.height,
    }, "", "line");
  });
  const yTicks = viewport.yTicks.map((tick) => {
    const point = mapPoint({ x: 0, y: tick }, viewport);
    return mark({
      "data-viz-tick-axis": "y",
      "data-viz-tick-value": tick,
      x1: frame.x,
      x2: frame.x + frame.width,
      y1: point.y,
      y2: point.y,
    }, "", "line");
  });
  return {
    "semantic fixed viewport": [viewportMark],
    "semantic x tick": xTicks,
    "semantic y tick": yTicks,
  };
}

function distributionObservation(labId, state, locale, phase) {
  const viewport = viewports.distribution;
  const series = Array.from({ length: 25 }, (_, index) => {
    const standardized = -3 + index * 0.25;
    return {
      x: state.mean + standardized * state.spread,
      y: Math.exp(-0.5 * standardized ** 2),
    };
  });
  const mapped = series.map((point) => mapPoint(point, viewport));
  const left = mapped[8];
  const right = mapped[16];
  const center = mapped[12];
  const text = localized(labId, state, locale);
  const raw = {
    family: "statistics-distribution",
    labels: [],
    points: {
      center: { x: state.mean, y: 1 },
      leftSpread: { x: state.mean - state.spread, y: Math.exp(-0.5) },
      rightSpread: { x: state.mean + state.spread, y: Math.exp(-0.5) },
    },
    series,
    variant: labId,
    check: `symmetric about μ=${fixed(state.mean)} · height(μ−spread)=height(μ+spread)`,
    formula: `center μ=${fixed(state.mean)} · spread=${fixed(state.spread)}`,
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
  const fixedViewportMarks = viewportMarks(viewport);
  const visibleMathMarks = {
    "semantic formula": [mark({
      "data-viz-visible-formula": text.formula,
      "data-viz-visible-locale": locale,
    }, `${text.formulaLabel}: ${text.formula}`, "text")],
    "semantic invariant check": [mark({
      "data-viz-visible-check": text.check,
      "data-viz-visible-locale": locale,
    }, `${text.checkLabel}: ${text.check}`, "text")],
    "semantic fixed viewport": fixedViewportMarks["semantic fixed viewport"],
    "semantic x tick": fixedViewportMarks["semantic x tick"],
    "semantic y tick": fixedViewportMarks["semantic y tick"],
    "distribution summary curve": [mark({
      "data-viz-left-spread-x": left.x,
      "data-viz-left-spread-y": left.y,
      "data-viz-mean": state.mean,
      "data-viz-right-spread-x": right.x,
      "data-viz-right-spread-y": right.y,
      "data-viz-sample-count": 25,
      "data-viz-spread": state.spread,
      d: mapped.map((point, index) =>
        `${index === 0 ? "M" : "L"} ${fixed(point.x, 1)} ${fixed(point.y, 1)}`,
      ).join(" "),
    })],
    "distribution mean": [mark({
      "data-viz-mean": state.mean,
      "data-viz-series-index": 12,
      x1: center.x,
      x2: center.x,
      y1: mapPoint({ x: state.mean, y: 0 }, viewport).y,
      y2: mapPoint({ x: state.mean, y: 1 }, viewport).y,
    }, "", "line")],
    "distribution spread band": [mark({
      "data-viz-left-value": state.mean - state.spread,
      "data-viz-left-x": left.x,
      "data-viz-mean": state.mean,
      "data-viz-right-value": state.mean + state.spread,
      "data-viz-right-x": right.x,
      "data-viz-spread": state.spread,
      height: 10,
      width: right.x - left.x,
      x: left.x,
      y: frame.y + frame.height - 13,
    }, "", "rect")],
    "distribution left spread marker": [mark({
      "data-viz-density": Math.exp(-0.5),
      "data-viz-mapped-x": left.x,
      "data-viz-mapped-y": left.y,
      "data-viz-series-index": 8,
      "data-viz-series-y": series[8].y,
      "data-viz-x-value": state.mean - state.spread,
      cx: left.x,
      cy: left.y,
      r: 6,
    }, "", "circle")],
    "distribution right spread marker": [mark({
      "data-viz-density": Math.exp(-0.5),
      "data-viz-mapped-x": right.x,
      "data-viz-mapped-y": right.y,
      "data-viz-series-index": 16,
      "data-viz-series-y": series[16].y,
      "data-viz-x-value": state.mean + state.spread,
      cx: right.x,
      cy: right.y,
      r: 6,
    }, "", "circle")],
    "distribution summary readout": [mark({
      "data-viz-mean": state.mean,
      "data-viz-spread": state.spread,
      "data-viz-token-mean": fixed(state.mean),
      "data-viz-token-spread": fixed(state.spread),
      "data-viz-visible-locale": locale,
      "data-viz-visible-readout": text.readout,
      x: 320,
      y: 108,
    }, text.readout, "text")],
  };
  return canonicalObservation(
    labId,
    phase,
    state,
    raw,
    `${text.formula} ${text.formulaLabel}: ${text.formula}`,
    visibleMathMarks,
    visibleNamedMarkOccurrences("distribution", viewport),
  );
}

function quadraticObservation(state, locale, phase) {
  const labId = "advanced-functions";
  const viewport = viewports.quadratic;
  const series = Array.from({ length: 33 }, (_, index) => {
    const x = -2.4 + index * (5.4 / 32);
    return { x, y: state.scale * x ** 2 + state.verticalShift };
  });
  const mapped = series.map((point) => mapPoint(point, viewport));
  const sampleIndexes = [0, 16, 32];
  const text = localized(labId, state, locale);
  const raw = {
    family: "function-properties",
    labels: [],
    points: {},
    series,
    variant: labId,
    check: `selected quadratic · a=${fixed(state.scale)} · k=${fixed(state.verticalShift)}`,
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
  };
  const fixedViewportMarks = viewportMarks(viewport);
  const visibleMathMarks = {
    "semantic formula": [mark({
      "data-viz-visible-formula": text.formula,
      "data-viz-visible-locale": locale,
    }, `${text.formulaLabel}: ${text.formula}`, "text")],
    "semantic invariant check": [mark({
      "data-viz-visible-check": text.check,
      "data-viz-visible-locale": locale,
    }, `${text.checkLabel}: ${text.check}`, "text")],
    "semantic fixed viewport": fixedViewportMarks["semantic fixed viewport"],
    "semantic x tick": fixedViewportMarks["semantic x tick"],
    "semantic y tick": fixedViewportMarks["semantic y tick"],
    "advanced primary curve": [mark({
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
        `${index === 0 ? "M" : "L"} ${fixed(point.x, 1)} ${fixed(point.y, 1)}`,
      ).join(" "),
    })],
    "advanced curve sample": sampleIndexes.map((index) => mark({
      "data-viz-mapped-x": mapped[index].x,
      "data-viz-mapped-y": mapped[index].y,
      "data-viz-sample-index": index,
      "data-viz-x": series[index].x,
      "data-viz-y": series[index].y,
      cx: mapped[index].x,
      cy: mapped[index].y,
      r: 4,
    }, "", "circle")),
    "advanced function readout": [mark({
      "data-viz-formula": text.formula.slice(2),
      "data-viz-primary-family": "quadratic",
      "data-viz-scale-parameter": state.scale,
      "data-viz-selected-curve-only": true,
      "data-viz-token-a": fixed(state.scale),
      "data-viz-token-k": fixed(state.verticalShift),
      "data-viz-vertical-shift": state.verticalShift,
      "data-viz-visible-locale": locale,
      "data-viz-visible-readout": text.readout,
      x: 320,
      y: 108,
    }, text.readout, "text")],
  };
  return canonicalObservation(
    labId,
    phase,
    state,
    raw,
    `${text.formula} ${text.formulaLabel}: ${text.formula}`,
    visibleMathMarks,
    visibleNamedMarkOccurrences("quadratic", viewport),
  );
}

function canonicalObservation(
  labId,
  phase,
  state,
  raw,
  formulaText,
  visibleMathMarks,
  visibleNamedMarks,
) {
  return {
    observationHash: HASH,
    phase,
    publicState: {
      selectorEvidence: { count: 1, learnerVisibleCount: 1 },
      state: { ...state },
    },
    publicStateHash: HASH,
    rawRendererState: {
      attribute: "data-viz-math-state",
      selectorEvidence: { count: 1, learnerVisibleCount: 1 },
      serializedState: JSON.stringify(raw),
    },
    rawRendererStateHash: HASH,
    visibleGeometry: {
      formulaText,
      visibleMathMarks,
      visibleNamedMarks,
    },
    visibleGeometryHash: HASH,
  };
}

function pairFor(labId, locale = "en") {
  const distribution = labId !== "advanced-functions";
  const beforeState = structuredClone(exactPublicStatesByLab[labId].before);
  const afterState = structuredClone(exactPublicStatesByLab[labId].after);
  const beforePhase = "range-state:default:hk-state:00001";
  const afterPhase = "range-state:default:hk-state:00002";
  const beforeObservation = distribution
    ? distributionObservation(labId, beforeState, locale, beforePhase)
    : quadraticObservation(beforeState, locale, beforePhase);
  const afterObservation = distribution
    ? distributionObservation(labId, afterState, locale, afterPhase)
    : quadraticObservation(afterState, locale, afterPhase);
  const grade = labId === "statistics-s1" ? "S1"
    : labId === "data-handling" ? "S4" : "S5";
  return {
    afterEndpoint: { observation: afterObservation, observationIndex: 2 },
    beforeEndpoint: { observation: beforeObservation, observationIndex: 1 },
    cellId: `${grade}/${labId}/desktop/${locale}/light`,
    labId,
    locale,
    theme: "light",
    viewportId: "desktop",
  };
}

function assertRejected(
  label,
  mutate,
  labId = "statistics-s1",
  expectedCode,
) {
  const pair = structuredClone(pairFor(labId));
  mutate(pair);
  const issues =
    auditHkVisualizationPassThroughCrossStatePaintedGeometryPair(pair);
  assert.notDeepEqual(issues, [], label);
  if (expectedCode) {
    assert.ok(
      issues.some(({ code }) => code === expectedCode),
      `${label} must emit ${expectedCode}`,
    );
  }
}

function mutateRaw(pair, mutate, endpoint = "afterEndpoint") {
  const observation = pair[endpoint].observation;
  const raw = JSON.parse(observation.rawRendererState.serializedState);
  mutate(raw);
  observation.rawRendererState.serializedState = JSON.stringify(raw);
}

test("cross-state painted-geometry oracle exposes the independent v2 authority", () => {
  assert.equal(
    HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION,
    "hk-viz-pass-through-painted-geometry-pair-oracle.v2",
  );
  assert.equal(
    typeof auditHkVisualizationPassThroughCrossStatePaintedGeometryPair,
    "function",
  );
  assert.match(
    HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH,
    /^[a-f0-9]{64}$/,
  );
  assert.deepEqual(
    Object.keys(HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLANS),
    ["statistics-s1", "data-handling", "advanced-functions"],
  );
});

test("v2 authority preserves the exact full public projections required by Reset v3", () => {
  for (const labId of [
    "statistics-s1",
    "data-handling",
    "advanced-functions",
  ]) {
    const plan = HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLANS[labId];
    assert.deepEqual(plan.beforeState, exactPublicStatesByLab[labId].before);
    assert.deepEqual(plan.afterState, exactPublicStatesByLab[labId].after);
    for (const endpoint of [plan.beforeState, plan.afterState]) {
      assert.deepEqual(
        Object.fromEntries(["comparison", "height", "mode", "value"].map(
          (key) => [key, endpoint[key]],
        )),
        {
          comparison: endpoint.comparison,
          height: endpoint.height,
          mode: endpoint.mode,
          value: endpoint.value,
        },
        `${labId} exposes the exact Reset v3 tuple`,
      );
    }
    assert.deepEqual(
      auditHkVisualizationPassThroughCrossStatePaintedGeometryPair(pairFor(labId)),
      [],
      `${labId} full public projection`,
    );
    assertRejected(
      `${labId} missing public envelope key`,
      (pair) => { delete pair.beforeEndpoint.observation.publicState.state.model; },
      labId,
    );
    assertRejected(
      `${labId} extra public envelope key`,
      (pair) => { pair.afterEndpoint.observation.publicState.state.decoy = true; },
      labId,
    );
  }
});

test("all three exact painted families emit exact product-order JSON.stringify raw bytes", () => {
  for (const labId of [
    "statistics-s1",
    "data-handling",
    "advanced-functions",
  ]) {
    for (const endpoint of ["beforeEndpoint", "afterEndpoint"]) {
      const serializedState = pairFor(labId)[endpoint].observation
        .rawRendererState.serializedState;
      const parsed = JSON.parse(serializedState);
      assert.equal(
        JSON.stringify(parsed),
        serializedState,
        `${labId}/${endpoint}`,
      );
      assert.deepEqual(Object.keys(parsed), [
        "family", "labels", "points", "series", "variant", "check",
        "formula", "kind", "metrics",
      ]);
      assert.deepEqual(
        Object.keys(parsed.metrics),
        labId === "advanced-functions"
          ? [
              "activeMode", "primaryFamily", "primaryFormula",
              "scaleParameter", "selectedCurveOnly", "verticalShift",
            ]
          : [
              "mean", "spread", "standardDeviation", "summaryOnly",
              "symmetryResidual", "variance",
            ],
      );
    }
  }
});

const exactAuthorityCases = [
  {
    name: "public state rejects an unknown key",
    mutate(pair) { pair.afterEndpoint.observation.publicState.state.decoy = 1; },
  },
  {
    name: "public logical state rejects epsilon drift",
    mutate(pair) { pair.afterEndpoint.observation.publicState.state.mean = 1e-10; },
  },
  {
    name: "public selector evidence requires exact counts",
    mutate(pair) {
      pair.afterEndpoint.observation.publicState.selectorEvidence.count = 2;
    },
  },
  {
    name: "raw state rejects an unknown top-level key",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.decoy = true; }); },
  },
  {
    name: "raw state rejects duplicate-key JSON bytes even when the final value is exact",
    mutate(pair) {
      const raw = pair.afterEndpoint.observation.rawRendererState;
      raw.serializedState = raw.serializedState.replace(
        /^\{/u,
        '{"check":"decoy",',
      );
    },
  },
  {
    name: "raw state rejects semantically exact JSON with leading whitespace",
    mutate(pair) {
      const raw = pair.afterEndpoint.observation.rawRendererState;
      raw.serializedState = ` ${raw.serializedState}`;
    },
  },
  {
    name: "raw state rejects semantically exact reordered top-level keys",
    mutate(pair) {
      const raw = pair.afterEndpoint.observation.rawRendererState;
      raw.serializedState = JSON.stringify(Object.fromEntries(
        Object.entries(JSON.parse(raw.serializedState)).reverse(),
      ));
    },
  },
  {
    name: "raw state rejects semantically exact reordered nested keys",
    mutate(pair) {
      const raw = pair.afterEndpoint.observation.rawRendererState;
      const parsed = JSON.parse(raw.serializedState);
      parsed.metrics = Object.fromEntries(Object.entries(parsed.metrics).reverse());
      raw.serializedState = JSON.stringify(parsed);
    },
  },
  {
    expectedCode: "cross-state-math",
    name: "raw distribution points reject reversed named-point order",
    mutate(pair) {
      mutateRaw(pair, (raw) => {
        raw.points = Object.fromEntries(Object.entries(raw.points).reverse());
      });
    },
  },
  {
    expectedCode: "cross-state-math",
    name: "raw distribution center rejects y-before-x key order",
    mutate(pair) {
      mutateRaw(pair, (raw) => {
        raw.points.center = {
          y: raw.points.center.y,
          x: raw.points.center.x,
        };
      });
    },
  },
  {
    expectedCode: "cross-state-math",
    name: "raw distribution series point rejects y-before-x key order",
    mutate(pair) {
      mutateRaw(pair, (raw) => {
        raw.series[0] = {
          y: raw.series[0].y,
          x: raw.series[0].x,
        };
      });
    },
  },
  {
    name: "raw state rejects a missing top-level key",
    mutate(pair) { mutateRaw(pair, (raw) => { delete raw.family; }); },
  },
  {
    name: "raw distribution family is exact",
    mutate(pair) {
      mutateRaw(pair, (raw) => { raw.family = "function-properties"; });
    },
  },
  {
    name: "raw distribution check is exact",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.check = `${raw.check} decoy`; }); },
  },
  {
    name: "raw distribution labels are exact empty array",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.labels.push("decoy"); }); },
  },
  {
    name: "raw distribution points require exact keys",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.points.decoy = { x: 0, y: 0 }; }); },
  },
  {
    name: "raw distribution center point is exact",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.points.center.y = 0.5; }); },
  },
  {
    name: "raw distribution left point is exact",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.points.leftSpread.x += 1; }); },
  },
  {
    name: "raw distribution right point is exact",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.points.rightSpread.y = 0.5; }); },
  },
  {
    name: "raw distribution metric rejects epsilon drift",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.metrics.mean = 1e-10; }); },
  },
  {
    name: "raw distribution series rejects epsilon drift",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.series[12].x = 1e-10; }); },
  },
  {
    labId: "advanced-functions",
    name: "raw advanced family is exact function-properties",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.family = "advanced-functions"; }); },
  },
  {
    labId: "advanced-functions",
    name: "raw advanced check is exact",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.check = `${raw.check} decoy`; }); },
  },
  {
    labId: "advanced-functions",
    name: "raw advanced labels are exact empty array",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.labels = ["decoy"]; }); },
  },
  {
    labId: "advanced-functions",
    name: "raw advanced points are exact empty object",
    mutate(pair) { mutateRaw(pair, (raw) => { raw.points.origin = { x: 0, y: 0 }; }); },
  },
  {
    name: "visible math group order is exact",
    mutate(pair) {
      const visible = pair.afterEndpoint.observation.visibleGeometry;
      visible.visibleMathMarks = Object.fromEntries(
        Object.entries(visible.visibleMathMarks).reverse(),
      );
    },
  },
  {
    name: "visible math groups reject a decoy group",
    mutate(pair) {
      pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks.decoy = [
        mark({}, "", "path"),
      ];
    },
  },
  {
    name: "visible math group cardinality is exact",
    mutate(pair) {
      const marks = pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks;
      marks["semantic formula"].push(structuredClone(marks["semantic formula"][0]));
    },
  },
  {
    name: "visible mark attribute keys are exact",
    mutate(pair) {
      pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
        "semantic formula"
      ][0].attributes.decoy = "true";
    },
  },
  {
    name: "visible mark requires its exact SVG tag",
    mutate(pair) {
      pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
        "distribution summary curve"
      ][0].tagName = "div";
    },
  },
  {
    name: "visible named-mark occurrence order is exact",
    mutate(pair) {
      pair.afterEndpoint.observation.visibleGeometry.visibleNamedMarks.reverse();
    },
  },
  {
    name: "visible named-mark occurrences reject a duplicate",
    mutate(pair) {
      const visible = pair.afterEndpoint.observation.visibleGeometry;
      visible.visibleNamedMarks.push(visible.visibleNamedMarks[0]);
    },
  },
  {
    name: "visible named-mark occurrences reject a decoy",
    mutate(pair) {
      pair.afterEndpoint.observation.visibleGeometry.visibleNamedMarks.push("decoy");
    },
  },
  {
    name: "visible formula text requires exact localized label and value",
    mutate(pair) {
      const formula = pair.afterEndpoint.observation.visibleGeometry
        .visibleMathMarks["semantic formula"][0];
      formula.text = `decoy ${formula.text}`;
    },
  },
  {
    name: "visible check text requires exact localized label and value",
    mutate(pair) {
      const check = pair.afterEndpoint.observation.visibleGeometry
        .visibleMathMarks["semantic invariant check"][0];
      check.text = `${check.text} decoy`;
    },
  },
  {
    name: "visible readout text is exact",
    mutate(pair) {
      const readout = pair.afterEndpoint.observation.visibleGeometry
        .visibleMathMarks["distribution summary readout"][0];
      readout.text = `decoy ${readout.text}`;
    },
  },
  {
    name: "helper formulaText concatenation is exact",
    mutate(pair) {
      const visible = pair.afterEndpoint.observation.visibleGeometry;
      visible.formulaText = `${visible.formulaText} decoy`;
    },
  },
  ...[
    ["x1", "distribution mean x1 is exact"],
    ["x2", "distribution mean x2 is exact"],
    ["y1", "distribution mean y1 is exact"],
    ["y2", "distribution mean y2 is exact"],
    ["data-viz-series-index", "distribution mean index is exact"],
  ].map(([attribute, name]) => ({
    name,
    mutate(pair) {
      pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
        "distribution mean"
      ][0].attributes[attribute] = "999";
    },
  })),
  ...[
    ["x", "distribution band x is exact"],
    ["y", "distribution band y is exact"],
    ["width", "distribution band width is exact"],
    ["height", "distribution band height is exact"],
  ].map(([attribute, name]) => ({
    name,
    mutate(pair) {
      pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
        "distribution spread band"
      ][0].attributes[attribute] = "999";
    },
  })),
  {
    name: "distribution marker radius is exact",
    mutate(pair) {
      pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
        "distribution left spread marker"
      ][0].attributes.r = "5";
    },
  },
  ...[
    ["0x5c", "SVG geometry rejects hexadecimal literals"],
    ["0b1011100", "SVG geometry rejects binary literals"],
    ["0o134", "SVG geometry rejects octal literals"],
    [" 92", "SVG geometry rejects leading whitespace"],
    ["92 ", "SVG geometry rejects trailing whitespace"],
    ["", "SVG geometry rejects blank values"],
    ["Infinity", "SVG geometry rejects Infinity"],
    ["NaN", "SVG geometry rejects NaN"],
  ].map(([value, name]) => ({
    name,
    mutate(pair) {
      pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
        "semantic fixed viewport"
      ][0].attributes.x = value;
    },
  })),
  {
    labId: "advanced-functions",
    name: "advanced sample radius is exact",
    mutate(pair) {
      pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
        "advanced curve sample"
      ][0].attributes.r = "5";
    },
  },
];

for (const authorityCase of exactAuthorityCases) {
  test(`v2 exact authority: ${authorityCase.name}`, () => {
    assertRejected(
      authorityCase.name,
      authorityCase.mutate,
      authorityCase.labId ?? "statistics-s1",
      authorityCase.expectedCode,
    );
  });
}

test("cross-state oracle accepts exact3 fixed-frame pairs in every locale", () => {
  for (const labId of [
    "statistics-s1",
    "data-handling",
    "advanced-functions",
  ]) {
    for (const locale of ["en", "zh", "zh-Hans"]) {
      assert.deepEqual(
        auditHkVisualizationPassThroughCrossStatePaintedGeometryPair(
          pairFor(labId, locale),
        ),
        [],
        `${labId}/${locale}`,
      );
    }
  }
});

test("cross-state oracle fails closed on identity, chronology, state, and exact schema drift", () => {
  assertRejected("missing key", (pair) => { delete pair.theme; });
  assertRejected("extra key", (pair) => { pair.extra = true; });
  assertRejected("wrong cell", (pair) => { pair.cellId = pair.cellId.replace(/^S1\//u, "S4/"); });
  assertRejected("wrong lab", (pair) => { pair.labId = "data-handling"; });
  assertRejected("wrong locale", (pair) => { pair.locale = "fr"; });
  assertRejected("wrong theme", (pair) => { pair.theme = "sepia"; });
  assertRejected("wrong viewport", (pair) => { pair.viewportId = "wide"; });
  assertRejected("same index", (pair) => { pair.afterEndpoint.observationIndex = 1; });
  assertRejected("reversed index", (pair) => { pair.afterEndpoint.observationIndex = 0; });
  assertRejected("non range before", (pair) => {
    pair.beforeEndpoint.observation.phase = "initial";
  });
  assertRejected("phase wrapper drift", (pair) => {
    pair.beforeEndpoint.phase = pair.beforeEndpoint.observation.phase;
  });
  assertRejected("wrong before state", (pair) => {
    pair.beforeEndpoint.observation.publicState.state.spread = 2;
  });
  assertRejected("wrong after state", (pair) => {
    pair.afterEndpoint.observation.publicState.state.spread = 3;
  });
  assertRejected("malformed raw", (pair) => {
    pair.afterEndpoint.observation.rawRendererState.serializedState = "{";
  });
});

test("cross-state oracle rejects locale text, raw math, viewport, and coordinate corruption", () => {
  assertRejected("formula", (pair) => {
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "semantic formula"
    ][0].attributes["data-viz-visible-formula"] = "wrong";
  });
  assertRejected("check", (pair) => {
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "semantic invariant check"
    ][0].attributes["data-viz-visible-check"] = "wrong";
  });
  assertRejected("readout", (pair) => {
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "distribution summary readout"
    ][0].attributes["data-viz-visible-readout"] = "wrong";
  });
  assertRejected("token", (pair) => {
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "distribution summary readout"
    ][0].attributes["data-viz-token-spread"] = "3";
  });
  assertRejected("viewport id", (pair) => {
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "semantic fixed viewport"
    ][0].attributes["data-viz-viewport-id"] = "dynamic";
  });
  assertRejected("ticks", (pair) => {
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "semantic x tick"
    ].reverse();
  });
  assertRejected("nonfinite", (pair) => {
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "distribution left spread marker"
    ][0].attributes.cx = "NaN";
  });
  assertRejected("out of frame", (pair) => {
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "distribution left spread marker"
    ][0].attributes.cx = "1000";
  });
  assertRejected("raw metrics", (pair) => {
    const endpoint = pair.afterEndpoint.observation;
    const raw = JSON.parse(endpoint.rawRendererState.serializedState);
    raw.metrics.spread = 3;
    endpoint.rawRendererState.serializedState = JSON.stringify(raw);
  });
  assertRejected("raw series", (pair) => {
    const endpoint = pair.afterEndpoint.observation;
    const raw = JSON.parse(endpoint.rawRendererState.serializedState);
    raw.series[12].y = 0.25;
    endpoint.rawRendererState.serializedState = JSON.stringify(raw);
  });
});

test("cross-state oracle rejects unchanged and wrong-but-different painted math", () => {
  assertRejected("unchanged distribution", (pair) => {
    const beforeCurve = pair.beforeEndpoint.observation.visibleGeometry
      .visibleMathMarks["distribution summary curve"][0];
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "distribution summary curve"
    ][0] = structuredClone(beforeCurve);
  });
  assertRejected("wrong different distribution", (pair) => {
    const curve = pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "distribution summary curve"
    ][0];
    curve.attributes.d = curve.attributes.d.replace(/^M\s+\S+\s+\S+/u, "M 100 100");
  });
  assertRejected("unchanged quadratic", (pair) => {
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "advanced primary curve"
    ][0] = structuredClone(pair.beforeEndpoint.observation.visibleGeometry
      .visibleMathMarks["advanced primary curve"][0]);
  }, "advanced-functions");
  assertRejected("wrong different quadratic", (pair) => {
    const curve = pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "advanced primary curve"
    ][0];
    curve.attributes.d = curve.attributes.d.replace(/ L /, " L 400 200 L ");
  }, "advanced-functions");
  assertRejected("unchanged quadratic samples", (pair) => {
    pair.afterEndpoint.observation.visibleGeometry.visibleMathMarks[
      "advanced curve sample"
    ] = structuredClone(pair.beforeEndpoint.observation.visibleGeometry
      .visibleMathMarks["advanced curve sample"]);
  }, "advanced-functions");
});
