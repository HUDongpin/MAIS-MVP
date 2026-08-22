import { createHash } from "node:crypto";

// Product-free shared authority for the painted-geometry pair release chain.

export const HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION =
  "hk-viz-pass-through-painted-geometry-pair-oracle.v2";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const FRAME = Object.freeze({ height: 148, width: 456, x: 92, y: 116 });

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLANS =
  deepFreeze({
    "statistics-s1": {
      afterState: {
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
      },
      beforeState: {
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
      },
      family: "distribution",
      grade: "S1",
      labId: "statistics-s1",
      viewport: {
        domain: { xMax: 22, xMin: -12, yMax: 1.1, yMin: 0 },
        id: "hk-distribution-summary-fixed-v1",
        xTicks: [-10, 0, 10, 20],
        yTicks: [0, 0.5, 1],
      },
    },
    "data-handling": {
      afterState: {
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
      },
      beforeState: {
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
      },
      family: "distribution",
      grade: "S4",
      labId: "data-handling",
      viewport: {
        domain: { xMax: 22, xMin: -12, yMax: 1.1, yMin: 0 },
        id: "hk-distribution-summary-fixed-v1",
        xTicks: [-10, 0, 10, 20],
        yTicks: [0, 0.5, 1],
      },
    },
    "advanced-functions": {
      afterState: {
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
      beforeState: {
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
      family: "quadratic",
      grade: "S5",
      labId: "advanced-functions",
      viewport: {
        domain: { xMax: 3, xMin: -2.4, yMax: 21, yMin: -6 },
        id: "hk-selected-quadratic-fixed-v1",
        xTicks: [-2, 0, 2],
        yTicks: [-5, 0, 5, 10, 15, 20],
      },
    },
  });

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export const HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLAN_HASH =
  createHash("sha256")
    .update(canonicalJson({
      plans: HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLANS,
      version: HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_VERSION,
    }))
    .digest("hex");

function plainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, keys) {
  return plainObject(value) && canonicalJson(Object.keys(value).sort()) ===
    canonicalJson([...keys].sort());
}

function exactOrderedKeys(value, keys) {
  return plainObject(value) &&
    JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function exactValue(actual, expected) {
  return typeof expected === "number"
    ? typeof actual === "number" && Object.is(actual, expected)
    : actual === expected;
}

function exactRecord(actual, expected) {
  return exactKeys(actual, Object.keys(expected)) &&
    Object.entries(expected).every(([key, value]) =>
      exactValue(actual[key], value));
}

function exactOrderedRecord(actual, expected) {
  return exactOrderedKeys(actual, Object.keys(expected)) &&
    Object.entries(expected).every(([key, value]) =>
      exactValue(actual[key], value));
}

function exactPoint(actual, expected) {
  return exactOrderedKeys(actual, ["x", "y"]) &&
    exactValue(actual.x, expected.x) && exactValue(actual.y, expected.y);
}

function exactStringArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function close(left, right, epsilon = 1e-8) {
  return finite(left) && finite(right) && Math.abs(left - right) <= epsilon;
}

function fixed(value, digits = 2) {
  const rounded = Number(value.toFixed(digits));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function stringAttribute(mark, key) {
  const value = mark?.attributes?.[key];
  return typeof value === "string" ? value : null;
}

function numberAttribute(mark, key) {
  const value = stringAttribute(mark, key);
  if (
    value === null ||
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(value)
  ) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function markAt(marks, name, index = 0) {
  const candidates = marks?.[name];
  return Array.isArray(candidates) ? candidates[index] ?? null : null;
}

function normalizeText(value) {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";
}

function mapPoint(point, viewport) {
  return {
    x: FRAME.x + ((point.x - viewport.domain.xMin) /
      (viewport.domain.xMax - viewport.domain.xMin)) * FRAME.width,
    y: FRAME.y + FRAME.height - ((point.y - viewport.domain.yMin) /
      (viewport.domain.yMax - viewport.domain.yMin)) * FRAME.height,
  };
}

function inFrame(point) {
  return finite(point.x) && finite(point.y) &&
    point.x >= FRAME.x - 1e-8 && point.x <= FRAME.x + FRAME.width + 1e-8 &&
    point.y >= FRAME.y - 1e-8 && point.y <= FRAME.y + FRAME.height + 1e-8;
}

function parsePath(path) {
  if (typeof path !== "string" || path.length > 32_768) return null;
  const expression = /([ML])\s+(-?(?:\d+\.?\d*|\.\d+))\s+(-?(?:\d+\.?\d*|\.\d+))/gu;
  const points = [];
  let cursor = 0;
  for (const match of path.matchAll(expression)) {
    if (match.index !== cursor && path.slice(cursor, match.index).trim()) return null;
    if ((points.length === 0 ? "M" : "L") !== match[1]) return null;
    const point = { x: Number(match[2]), y: Number(match[3]) };
    if (!finite(point.x) || !finite(point.y)) return null;
    points.push(point);
    cursor = (match.index ?? 0) + match[0].length;
  }
  return points.length > 0 && !path.slice(cursor).trim() ? points : null;
}

function expectedLocalizedText(family, state, locale) {
  if (family === "distribution") {
    const mean = fixed(state.mean);
    const spread = fixed(state.spread);
    if (locale === "zh") return {
      check: `關於 μ=${mean} 對稱 · 高度(μ−離散程度)=高度(μ+離散程度)`,
      checkLabel: "驗證",
      formula: `中心 μ=${mean} · 離散程度=${spread}`,
      formulaLabel: "公式",
      readout: `平均數=${mean} · 離散程度=${spread} · 對稱分佈`,
      tokens: { "data-viz-token-mean": mean, "data-viz-token-spread": spread },
    };
    if (locale === "zh-Hans") return {
      check: `关于 μ=${mean} 对称 · 高度(μ−离散程度)=高度(μ+离散程度)`,
      checkLabel: "验证",
      formula: `中心 μ=${mean} · 离散程度=${spread}`,
      formulaLabel: "公式",
      readout: `平均数=${mean} · 离散程度=${spread} · 对称分布`,
      tokens: { "data-viz-token-mean": mean, "data-viz-token-spread": spread },
    };
    return {
      check: `symmetric about μ=${mean} · height(μ−spread)=height(μ+spread)`,
      checkLabel: "Check",
      formula: `center μ=${mean} · spread=${spread}`,
      formulaLabel: "Formula",
      readout: `mean=${mean} · spread=${spread} · symmetric distribution`,
      tokens: { "data-viz-token-mean": mean, "data-viz-token-spread": spread },
    };
  }
  const coefficient = fixed(state.scale);
  const shift = fixed(state.verticalShift);
  const formula = `y=${coefficient}x² ${state.verticalShift >= 0 ? "+" : "−"} ${fixed(Math.abs(state.verticalShift))}`;
  if (locale === "zh") return {
    check: `已選二次函數 · a=${coefficient} · k=${shift}`,
    checkLabel: "驗證",
    formula,
    formulaLabel: "公式",
    readout: `二次函數 · a=${coefficient} · k=${shift}`,
    tokens: { "data-viz-token-a": coefficient, "data-viz-token-k": shift },
  };
  if (locale === "zh-Hans") return {
    check: `已选二次函数 · a=${coefficient} · k=${shift}`,
    checkLabel: "验证",
    formula,
    formulaLabel: "公式",
    readout: `二次函数 · a=${coefficient} · k=${shift}`,
    tokens: { "data-viz-token-a": coefficient, "data-viz-token-k": shift },
  };
  return {
    check: `selected quadratic · a=${coefficient} · k=${shift}`,
    checkLabel: "Check",
    formula,
    formulaLabel: "Formula",
    readout: `quadratic · a=${coefficient} · k=${shift}`,
    tokens: { "data-viz-token-a": coefficient, "data-viz-token-k": shift },
  };
}

function stateMatches(actual, expected) {
  return exactRecord(actual, expected);
}

function validateMarkShape(mark) {
  return exactKeys(mark, ["attributes", "tagName", "text"]) &&
    plainObject(mark.attributes) && typeof mark.tagName === "string" &&
    typeof mark.text === "string" &&
    Object.values(mark.attributes).every((value) => typeof value === "string");
}

function validateEndpointSchema(endpoint) {
  if (!exactKeys(endpoint, ["observation", "observationIndex"]) ||
      !Number.isSafeInteger(endpoint.observationIndex) ||
      endpoint.observationIndex < 0) return false;
  const observation = endpoint.observation;
  if (!exactKeys(observation, [
    "observationHash",
    "phase",
    "publicState",
    "publicStateHash",
    "rawRendererState",
    "rawRendererStateHash",
    "visibleGeometry",
    "visibleGeometryHash",
  ]) || typeof observation.phase !== "string" ||
      !HASH_PATTERN.test(observation.observationHash) ||
      !HASH_PATTERN.test(observation.publicStateHash) ||
      !HASH_PATTERN.test(observation.rawRendererStateHash) ||
      !HASH_PATTERN.test(observation.visibleGeometryHash)) return false;
  if (!exactKeys(observation.publicState, ["selectorEvidence", "state"]) ||
      !plainObject(observation.publicState.state) ||
      !exactKeys(observation.publicState.selectorEvidence,
        ["count", "learnerVisibleCount"]) ||
      observation.publicState.selectorEvidence.count !== 1 ||
      observation.publicState.selectorEvidence.learnerVisibleCount !== 1) {
    return false;
  }
  const raw = observation.rawRendererState;
  if (!exactKeys(raw, ["attribute", "selectorEvidence", "serializedState"]) ||
      raw.attribute !== "data-viz-math-state" ||
      typeof raw.serializedState !== "string" ||
      !exactKeys(raw.selectorEvidence, ["count", "learnerVisibleCount"]) ||
      raw.selectorEvidence.count !== 1 ||
      raw.selectorEvidence.learnerVisibleCount !== 1) {
    return false;
  }
  const visible = observation.visibleGeometry;
  if (!exactKeys(visible,
    ["formulaText", "visibleMathMarks", "visibleNamedMarks"]) ||
      typeof visible.formulaText !== "string" ||
      !plainObject(visible.visibleMathMarks) ||
      !Array.isArray(visible.visibleNamedMarks) ||
      !visible.visibleNamedMarks.every((value) => typeof value === "string")) {
    return false;
  }
  return Object.values(visible.visibleMathMarks).every((marks) =>
    Array.isArray(marks) && marks.every(validateMarkShape));
}

function parseRawState(endpoint) {
  try {
    const serializedState =
      endpoint.observation.rawRendererState.serializedState;
    const parsed = JSON.parse(serializedState);
    return plainObject(parsed) && JSON.stringify(parsed) === serializedState
      ? parsed
      : null;
  } catch {
    return null;
  }
}

const COMMON_VISIBLE_MARK_SPECS = Object.freeze([
  Object.freeze({
    attributes: ["data-viz-visible-formula", "data-viz-visible-locale"],
    count: 1,
    name: "semantic formula",
    tagName: "text",
  }),
  Object.freeze({
    attributes: ["data-viz-visible-check", "data-viz-visible-locale"],
    count: 1,
    name: "semantic invariant check",
    tagName: "text",
  }),
  Object.freeze({
    attributes: [
      "data-viz-viewport-id", "data-viz-domain-x-min",
      "data-viz-domain-x-max", "data-viz-domain-y-min",
      "data-viz-domain-y-max", "data-viz-x-ticks", "data-viz-y-ticks",
      "x", "y", "width", "height",
    ],
    count: 1,
    name: "semantic fixed viewport",
    tagName: "rect",
  }),
  Object.freeze({
    attributes: [
      "data-viz-tick-axis", "data-viz-tick-value", "x1", "x2", "y1", "y2",
    ],
    count: "x-ticks",
    name: "semantic x tick",
    tagName: "line",
  }),
  Object.freeze({
    attributes: [
      "data-viz-tick-axis", "data-viz-tick-value", "x1", "x2", "y1", "y2",
    ],
    count: "y-ticks",
    name: "semantic y tick",
    tagName: "line",
  }),
]);

const DISTRIBUTION_VISIBLE_MARK_SPECS = Object.freeze([
  Object.freeze({
    attributes: [
      "data-viz-mean", "data-viz-spread", "data-viz-sample-count",
      "data-viz-left-spread-x", "data-viz-left-spread-y",
      "data-viz-right-spread-x", "data-viz-right-spread-y", "d",
    ],
    count: 1,
    name: "distribution summary curve",
    tagName: "path",
  }),
  Object.freeze({
    attributes: [
      "data-viz-mean", "data-viz-series-index", "x1", "x2", "y1", "y2",
    ],
    count: 1,
    name: "distribution mean",
    tagName: "line",
  }),
  Object.freeze({
    attributes: [
      "data-viz-mean", "data-viz-spread", "data-viz-left-value",
      "data-viz-right-value", "data-viz-left-x", "data-viz-right-x",
      "x", "y", "width", "height",
    ],
    count: 1,
    name: "distribution spread band",
    tagName: "rect",
  }),
  ...["distribution left spread marker", "distribution right spread marker"]
    .map((name) => Object.freeze({
      attributes: [
        "data-viz-series-index", "data-viz-x-value", "data-viz-density",
        "data-viz-series-y", "data-viz-mapped-x", "data-viz-mapped-y",
        "cx", "cy", "r",
      ],
      count: 1,
      name,
      tagName: "circle",
    })),
  Object.freeze({
    attributes: [
      "data-viz-mean", "data-viz-spread", "data-viz-visible-locale",
      "data-viz-visible-readout", "data-viz-token-mean",
      "data-viz-token-spread", "x", "y",
    ],
    count: 1,
    name: "distribution summary readout",
    tagName: "text",
  }),
]);

const QUADRATIC_VISIBLE_MARK_SPECS = Object.freeze([
  Object.freeze({
    attributes: [
      "data-viz-function-family", "data-viz-scale-parameter",
      "data-viz-vertical-shift", "data-viz-formula", "data-viz-sample-count",
      "data-viz-domain-min", "data-viz-domain-max", "data-viz-sample-start-x",
      "data-viz-sample-start-y", "data-viz-sample-middle-x",
      "data-viz-sample-middle-y", "data-viz-sample-end-x",
      "data-viz-sample-end-y", "d",
    ],
    count: 1,
    name: "advanced primary curve",
    tagName: "path",
  }),
  Object.freeze({
    attributes: [
      "data-viz-sample-index", "data-viz-x", "data-viz-y",
      "data-viz-mapped-x", "data-viz-mapped-y", "cx", "cy", "r",
    ],
    count: 3,
    name: "advanced curve sample",
    tagName: "circle",
  }),
  Object.freeze({
    attributes: [
      "data-viz-primary-family", "data-viz-selected-curve-only",
      "data-viz-scale-parameter", "data-viz-vertical-shift", "data-viz-formula",
      "data-viz-visible-locale", "data-viz-visible-readout", "data-viz-token-a",
      "data-viz-token-k", "x", "y",
    ],
    count: 1,
    name: "advanced function readout",
    tagName: "text",
  }),
]);

function expectedVisibleNamedMarks(plan) {
  const names = [
    "configured semantic secondary model",
    "semantic model body",
    "semantic fixed viewport",
    ...plan.viewport.xTicks.map(() => "semantic x tick"),
    ...plan.viewport.yTicks.map(() => "semantic y tick"),
    "semantic x axis",
    "semantic y axis",
  ];
  names.push(...(plan.family === "distribution"
    ? [
        "distribution spread band",
        "distribution summary curve",
        "distribution left spread marker",
        "distribution right spread marker",
        "distribution mean",
        "distribution summary readout",
      ]
    : [
        "advanced primary curve",
        "advanced curve sample",
        "advanced curve sample",
        "advanced curve sample",
        "advanced function readout",
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

function validateVisibleTopology(endpoint, plan, state, locale) {
  const visible = endpoint.observation.visibleGeometry;
  const marks = visible.visibleMathMarks;
  const expectedText = expectedLocalizedText(plan.family, state, locale);
  const specs = [
    ...COMMON_VISIBLE_MARK_SPECS,
    ...(plan.family === "distribution"
      ? DISTRIBUTION_VISIBLE_MARK_SPECS
      : QUADRATIC_VISIBLE_MARK_SPECS),
  ];
  if (!exactStringArray(Object.keys(marks), specs.map(({ name }) => name)) ||
      !exactStringArray(
        visible.visibleNamedMarks,
        expectedVisibleNamedMarks(plan),
      ) ||
      visible.formulaText !==
        `${expectedText.formula} ${expectedText.formulaLabel}: ${expectedText.formula}`) {
    return false;
  }
  return specs.every((spec) => {
    const group = marks[spec.name];
    const expectedCount = spec.count === "x-ticks"
      ? plan.viewport.xTicks.length
      : spec.count === "y-ticks" ? plan.viewport.yTicks.length : spec.count;
    if (!Array.isArray(group) || group.length !== expectedCount) return false;
    return group.every((mark) => {
      if (!validateMarkShape(mark) || mark.tagName !== spec.tagName ||
          !exactKeys(mark.attributes, spec.attributes)) return false;
      if (spec.name === "semantic formula") {
        return mark.text ===
          `${expectedText.formulaLabel}: ${expectedText.formula}`;
      }
      if (spec.name === "semantic invariant check") {
        return mark.text === `${expectedText.checkLabel}: ${expectedText.check}`;
      }
      if (spec.name === "distribution summary readout" ||
          spec.name === "advanced function readout") {
        return mark.text === expectedText.readout;
      }
      return mark.text === "";
    });
  });
}

function validateViewport(marks, viewport) {
  const viewportMark = markAt(marks, "semantic fixed viewport");
  if (!viewportMark ||
      stringAttribute(viewportMark, "data-viz-viewport-id") !== viewport.id ||
      !close(numberAttribute(viewportMark, "data-viz-domain-x-min"), viewport.domain.xMin) ||
      !close(numberAttribute(viewportMark, "data-viz-domain-x-max"), viewport.domain.xMax) ||
      !close(numberAttribute(viewportMark, "data-viz-domain-y-min"), viewport.domain.yMin) ||
      !close(numberAttribute(viewportMark, "data-viz-domain-y-max"), viewport.domain.yMax) ||
      stringAttribute(viewportMark, "data-viz-x-ticks") !== viewport.xTicks.join(",") ||
      stringAttribute(viewportMark, "data-viz-y-ticks") !== viewport.yTicks.join(",") ||
      !close(numberAttribute(viewportMark, "x"), FRAME.x) ||
      !close(numberAttribute(viewportMark, "y"), FRAME.y) ||
      !close(numberAttribute(viewportMark, "width"), FRAME.width) ||
      !close(numberAttribute(viewportMark, "height"), FRAME.height)) return false;
  const xTicks = marks["semantic x tick"];
  const yTicks = marks["semantic y tick"];
  if (!Array.isArray(xTicks) || xTicks.length !== viewport.xTicks.length ||
      !Array.isArray(yTicks) || yTicks.length !== viewport.yTicks.length) {
    return false;
  }
  for (const [index, tick] of xTicks.entries()) {
    const value = viewport.xTicks[index];
    const mapped = mapPoint({ x: value, y: 0 }, viewport);
    if (stringAttribute(tick, "data-viz-tick-axis") !== "x" ||
        !close(numberAttribute(tick, "data-viz-tick-value"), value) ||
        !close(numberAttribute(tick, "x1"), mapped.x) ||
        !close(numberAttribute(tick, "x2"), mapped.x) ||
        !close(numberAttribute(tick, "y1"), FRAME.y) ||
        !close(numberAttribute(tick, "y2"), FRAME.y + FRAME.height)) return false;
  }
  for (const [index, tick] of yTicks.entries()) {
    const value = viewport.yTicks[index];
    const mapped = mapPoint({ x: 0, y: value }, viewport);
    if (stringAttribute(tick, "data-viz-tick-axis") !== "y" ||
        !close(numberAttribute(tick, "data-viz-tick-value"), value) ||
        !close(numberAttribute(tick, "x1"), FRAME.x) ||
        !close(numberAttribute(tick, "x2"), FRAME.x + FRAME.width) ||
        !close(numberAttribute(tick, "y1"), mapped.y) ||
        !close(numberAttribute(tick, "y2"), mapped.y)) return false;
  }
  return true;
}

function validateLocalizedText(marks, formulaText, family, state, locale) {
  const expected = expectedLocalizedText(family, state, locale);
  const formula = markAt(marks, "semantic formula");
  const check = markAt(marks, "semantic invariant check");
  const readout = markAt(
    marks,
    family === "distribution"
      ? "distribution summary readout"
      : "advanced function readout",
  );
  return Boolean(formula && check && readout &&
    stringAttribute(formula, "data-viz-visible-locale") === locale &&
    stringAttribute(check, "data-viz-visible-locale") === locale &&
    stringAttribute(readout, "data-viz-visible-locale") === locale &&
    stringAttribute(formula, "data-viz-visible-formula") === expected.formula &&
    stringAttribute(check, "data-viz-visible-check") === expected.check &&
    stringAttribute(readout, "data-viz-visible-readout") === expected.readout &&
    formula.text === `${expected.formulaLabel}: ${expected.formula}` &&
    check.text === `${expected.checkLabel}: ${expected.check}` &&
    readout.text === expected.readout &&
    formulaText ===
      `${expected.formula} ${expected.formulaLabel}: ${expected.formula}` &&
    Object.entries(expected.tokens).every(([key, value]) =>
      stringAttribute(readout, key) === value));
}

function validateSeries(raw, expectedSeries) {
  return Array.isArray(raw.series) && raw.series.length === expectedSeries.length &&
    raw.series.every((point, index) => exactOrderedKeys(point, ["x", "y"]) &&
      exactValue(point.x, expectedSeries[index].x) &&
      exactValue(point.y, expectedSeries[index].y));
}

function validatePath(mark, expectedSeries, viewport) {
  const points = parsePath(stringAttribute(mark, "d"));
  if (!points || points.length !== expectedSeries.length) return false;
  return points.every((point, index) => {
    const expected = mapPoint(expectedSeries[index], viewport);
    return inFrame(point) && close(point.x, expected.x, 0.051) &&
      close(point.y, expected.y, 0.051);
  });
}

function validateDistributionEndpoint(endpoint, plan, state, locale) {
  const observation = endpoint.observation;
  const marks = observation.visibleGeometry.visibleMathMarks;
  const raw = parseRawState(endpoint);
  const rawCheck =
    `symmetric about μ=${fixed(state.mean)} · height(μ−spread)=height(μ+spread)`;
  if (!raw || !exactOrderedKeys(raw, [
    "family", "labels", "points", "series", "variant", "check", "formula",
    "kind", "metrics",
  ]) || raw.check !== rawCheck || raw.family !== "statistics-distribution" ||
      raw.kind !== "distribution" || raw.variant !== plan.labId ||
      raw.formula !== `center μ=${fixed(state.mean)} · spread=${fixed(state.spread)}` ||
      !Array.isArray(raw.labels) || raw.labels.length !== 0 ||
      !exactOrderedRecord(raw.metrics, {
        mean: state.mean,
        spread: state.spread,
        standardDeviation: state.spread,
        summaryOnly: true,
        symmetryResidual: 0,
        variance: state.spread ** 2,
      }) || !exactOrderedKeys(raw.points, ["center", "leftSpread", "rightSpread"]) ||
      !exactPoint(raw.points.center, { x: state.mean, y: 1 }) ||
      !exactPoint(raw.points.leftSpread, {
        x: state.mean - state.spread,
        y: Math.exp(-0.5),
      }) || !exactPoint(raw.points.rightSpread, {
        x: state.mean + state.spread,
        y: Math.exp(-0.5),
      })) return false;
  const expectedSeries = Array.from({ length: 25 }, (_, index) => {
    const standardized = -3 + index * 0.25;
    return {
      x: state.mean + standardized * state.spread,
      y: Math.exp(-0.5 * standardized ** 2),
    };
  });
  if (!validateSeries(raw, expectedSeries) ||
      !validateVisibleTopology(endpoint, plan, state, locale) ||
      !validateViewport(marks, plan.viewport) ||
      !validateLocalizedText(marks, observation.visibleGeometry.formulaText,
        plan.family, state, locale)) return false;
  const curve = markAt(marks, "distribution summary curve");
  const mean = markAt(marks, "distribution mean");
  const band = markAt(marks, "distribution spread band");
  const left = markAt(marks, "distribution left spread marker");
  const right = markAt(marks, "distribution right spread marker");
  const readout = markAt(marks, "distribution summary readout");
  if (!curve || !mean || !band || !left || !right || !readout ||
      !validatePath(curve, expectedSeries, plan.viewport)) return false;
  const leftPoint = mapPoint(expectedSeries[8], plan.viewport);
  const rightPoint = mapPoint(expectedSeries[16], plan.viewport);
  const centerPoint = mapPoint(expectedSeries[12], plan.viewport);
  const numericalChecks = [
    [numberAttribute(curve, "data-viz-mean"), state.mean],
    [numberAttribute(curve, "data-viz-spread"), state.spread],
    [numberAttribute(curve, "data-viz-sample-count"), 25],
    [numberAttribute(curve, "data-viz-left-spread-x"), leftPoint.x],
    [numberAttribute(curve, "data-viz-left-spread-y"), leftPoint.y],
    [numberAttribute(curve, "data-viz-right-spread-x"), rightPoint.x],
    [numberAttribute(curve, "data-viz-right-spread-y"), rightPoint.y],
    [numberAttribute(mean, "data-viz-mean"), state.mean],
    [numberAttribute(mean, "data-viz-series-index"), 12],
    [numberAttribute(mean, "x1"), centerPoint.x],
    [numberAttribute(mean, "x2"), centerPoint.x],
    [numberAttribute(mean, "y1"), FRAME.y + FRAME.height],
    [numberAttribute(mean, "y2"), centerPoint.y],
    [numberAttribute(band, "data-viz-mean"), state.mean],
    [numberAttribute(band, "data-viz-spread"), state.spread],
    [numberAttribute(band, "data-viz-left-value"), state.mean - state.spread],
    [numberAttribute(band, "data-viz-right-value"), state.mean + state.spread],
    [numberAttribute(band, "data-viz-left-x"), leftPoint.x],
    [numberAttribute(band, "data-viz-right-x"), rightPoint.x],
    [numberAttribute(band, "x"), leftPoint.x],
    [numberAttribute(band, "y"), FRAME.y + FRAME.height - 13],
    [numberAttribute(band, "width"), rightPoint.x - leftPoint.x],
    [numberAttribute(band, "height"), 10],
    [numberAttribute(left, "data-viz-series-index"), 8],
    [numberAttribute(left, "data-viz-x-value"), state.mean - state.spread],
    [numberAttribute(left, "data-viz-density"), Math.exp(-0.5)],
    [numberAttribute(left, "data-viz-series-y"), Math.exp(-0.5)],
    [numberAttribute(left, "data-viz-mapped-x"), leftPoint.x],
    [numberAttribute(left, "data-viz-mapped-y"), leftPoint.y],
    [numberAttribute(left, "cx"), leftPoint.x],
    [numberAttribute(left, "cy"), leftPoint.y],
    [numberAttribute(left, "r"), 6],
    [numberAttribute(right, "data-viz-series-index"), 16],
    [numberAttribute(right, "data-viz-x-value"), state.mean + state.spread],
    [numberAttribute(right, "data-viz-density"), Math.exp(-0.5)],
    [numberAttribute(right, "data-viz-series-y"), Math.exp(-0.5)],
    [numberAttribute(right, "data-viz-mapped-x"), rightPoint.x],
    [numberAttribute(right, "data-viz-mapped-y"), rightPoint.y],
    [numberAttribute(right, "cx"), rightPoint.x],
    [numberAttribute(right, "cy"), rightPoint.y],
    [numberAttribute(right, "r"), 6],
    [numberAttribute(readout, "data-viz-mean"), state.mean],
    [numberAttribute(readout, "data-viz-spread"), state.spread],
  ];
  return numericalChecks.every(([actual, expected]) => close(actual, expected)) &&
    [leftPoint, rightPoint, centerPoint].every(inFrame);
}

function validateQuadraticEndpoint(endpoint, plan, state, locale) {
  const observation = endpoint.observation;
  const marks = observation.visibleGeometry.visibleMathMarks;
  const raw = parseRawState(endpoint);
  const formula = `${fixed(state.scale)}x² ${state.verticalShift >= 0 ? "+" : "−"} ${fixed(Math.abs(state.verticalShift))}`;
  if (!raw || !exactOrderedKeys(raw, [
    "family", "labels", "points", "series", "variant", "check", "formula",
    "kind", "metrics",
  ]) || raw.check !==
      `selected quadratic · a=${fixed(state.scale)} · k=${fixed(state.verticalShift)}` ||
      raw.family !== "function-properties" || raw.kind !== "advanced-functions" ||
      raw.variant !== plan.labId || raw.formula !== `y=${formula}` ||
      !Array.isArray(raw.labels) || raw.labels.length !== 0 ||
      !exactOrderedKeys(raw.points, []) || !exactOrderedRecord(raw.metrics, {
        activeMode: 0,
        primaryFamily: "quadratic",
        primaryFormula: formula,
        scaleParameter: state.scale,
        selectedCurveOnly: true,
        verticalShift: state.verticalShift,
      })) return false;
  const expectedSeries = Array.from({ length: 33 }, (_, index) => {
    const x = -2.4 + index * (5.4 / 32);
    return { x, y: state.scale * x ** 2 + state.verticalShift };
  });
  if (!validateSeries(raw, expectedSeries) ||
      !validateVisibleTopology(endpoint, plan, state, locale) ||
      !validateViewport(marks, plan.viewport) ||
      !validateLocalizedText(marks, observation.visibleGeometry.formulaText,
        plan.family, state, locale)) return false;
  const curve = markAt(marks, "advanced primary curve");
  const readout = markAt(marks, "advanced function readout");
  const samples = marks["advanced curve sample"];
  if (!curve || !readout || !Array.isArray(samples) || samples.length !== 3 ||
      !validatePath(curve, expectedSeries, plan.viewport) ||
      stringAttribute(curve, "data-viz-function-family") !== "quadratic" ||
      stringAttribute(curve, "data-viz-formula") !== formula ||
      stringAttribute(readout, "data-viz-primary-family") !== "quadratic" ||
      stringAttribute(readout, "data-viz-selected-curve-only") !== "true" ||
      stringAttribute(readout, "data-viz-formula") !== formula ||
      !close(numberAttribute(curve, "data-viz-scale-parameter"), state.scale) ||
      !close(numberAttribute(curve, "data-viz-vertical-shift"), state.verticalShift) ||
      !close(numberAttribute(curve, "data-viz-sample-count"), 33) ||
      !close(numberAttribute(curve, "data-viz-domain-min"), -2.4) ||
      !close(numberAttribute(curve, "data-viz-domain-max"), 3) ||
      !close(numberAttribute(readout, "data-viz-scale-parameter"), state.scale) ||
      !close(numberAttribute(readout, "data-viz-vertical-shift"), state.verticalShift)) {
    return false;
  }
  const sampleIndexes = [0, 16, 32];
  return samples.every((sample, position) => {
    const index = sampleIndexes[position];
    const logical = expectedSeries[index];
    const mapped = mapPoint(logical, plan.viewport);
    return inFrame(mapped) &&
      close(numberAttribute(sample, "data-viz-sample-index"), index) &&
      close(numberAttribute(sample, "data-viz-x"), logical.x) &&
      close(numberAttribute(sample, "data-viz-y"), logical.y) &&
      close(numberAttribute(sample, "data-viz-mapped-x"), mapped.x) &&
      close(numberAttribute(sample, "data-viz-mapped-y"), mapped.y) &&
      close(numberAttribute(sample, "cx"), mapped.x) &&
      close(numberAttribute(sample, "cy"), mapped.y) &&
      close(numberAttribute(sample, "r"), 4) &&
      close(numberAttribute(curve,
        position === 0 ? "data-viz-sample-start-x" :
          position === 1 ? "data-viz-sample-middle-x" :
            "data-viz-sample-end-x"), mapped.x) &&
      close(numberAttribute(curve,
        position === 0 ? "data-viz-sample-start-y" :
          position === 1 ? "data-viz-sample-middle-y" :
            "data-viz-sample-end-y"), mapped.y);
  });
}

function endpointGeometryChanged(input, plan) {
  const beforeMarks = input.beforeEndpoint.observation.visibleGeometry.visibleMathMarks;
  const afterMarks = input.afterEndpoint.observation.visibleGeometry.visibleMathMarks;
  if (plan.family === "distribution") {
    return stringAttribute(markAt(beforeMarks, "distribution summary curve"), "d") !==
        stringAttribute(markAt(afterMarks, "distribution summary curve"), "d") &&
      !close(numberAttribute(markAt(beforeMarks, "distribution spread band"), "width"),
        numberAttribute(markAt(afterMarks, "distribution spread band"), "width")) &&
      !close(numberAttribute(markAt(beforeMarks, "distribution left spread marker"), "cx"),
        numberAttribute(markAt(afterMarks, "distribution left spread marker"), "cx")) &&
      !close(numberAttribute(markAt(beforeMarks, "distribution right spread marker"), "cx"),
        numberAttribute(markAt(afterMarks, "distribution right spread marker"), "cx"));
  }
  const beforeSamples = beforeMarks["advanced curve sample"];
  const afterSamples = afterMarks["advanced curve sample"];
  return stringAttribute(markAt(beforeMarks, "advanced primary curve"), "d") !==
      stringAttribute(markAt(afterMarks, "advanced primary curve"), "d") &&
    Array.isArray(beforeSamples) && Array.isArray(afterSamples) &&
    beforeSamples.length === 3 && afterSamples.length === 3 &&
    afterSamples.some((sample, index) =>
      !close(numberAttribute(sample, "cy"),
        numberAttribute(beforeSamples[index], "cy")));
}

/**
 * Full canonical endpoint evidence already passed the independent single-state
 * public/raw/visible oracle. This product-free release oracle re-derives the
 * exact two-state mathematics, including centerline coordinates in the fixed
 * SVG frame. It deliberately makes no compositor/stroke-clipping claim.
 *
 * @typedef {Readonly<{
 *   observationHash: string,
 *   phase: string,
 *   publicState: Readonly<{selectorEvidence: Readonly<{count: number, learnerVisibleCount: number}>, state: Readonly<Record<string, unknown>>}>,
 *   publicStateHash: string,
 *   rawRendererState: Readonly<{attribute: "data-viz-math-state", selectorEvidence: Readonly<{count: number, learnerVisibleCount: number}>, serializedState: string}>,
 *   rawRendererStateHash: string,
 *   visibleGeometry: Readonly<{formulaText: string, visibleMathMarks: Readonly<Record<string, readonly Readonly<{attributes: Readonly<Record<string, string>>, tagName: string, text: string}>[]>>, visibleNamedMarks: readonly string[]}>,
 *   visibleGeometryHash: string,
 * }>} CrossStateOracleObservation
 * @typedef {Readonly<{observation: CrossStateOracleObservation, observationIndex: number}>} CrossStateOracleEndpoint
 * @typedef {Readonly<{
 *   afterEndpoint: CrossStateOracleEndpoint,
 *   beforeEndpoint: CrossStateOracleEndpoint,
 *   cellId: string,
 *   labId: string,
 *   locale: "en" | "zh" | "zh-Hans",
 *   theme: "light" | "dark",
 *   viewportId: "desktop" | "tablet" | "mobile",
 * }>} CrossStateOracleInput
 * @typedef {Readonly<{code: "cross-state-geometry" | "cross-state-identity" | "cross-state-math" | "cross-state-schema", message: string}>} CrossStateOracleIssue
 *
 * @param {CrossStateOracleInput | unknown} input
 * @returns {readonly CrossStateOracleIssue[]}
 */
export function auditHkVisualizationPassThroughCrossStatePaintedGeometryPair(
  input,
) {
  /** @type {CrossStateOracleIssue[]} */
  const issues = [];
  const issue = (code, message) => issues.push(Object.freeze({ code, message }));
  if (!exactKeys(input, [
    "afterEndpoint", "beforeEndpoint", "cellId", "labId", "locale", "theme",
    "viewportId",
  ]) || !validateEndpointSchema(input.beforeEndpoint) ||
      !validateEndpointSchema(input.afterEndpoint)) {
    issue("cross-state-schema", "Cross-state evidence must use the exact plain endpoint schema.");
    return Object.freeze(issues);
  }
  const plan = HK_VISUALIZATION_PASS_THROUGH_CROSS_STATE_ORACLE_PLANS[input.labId];
  const segments = typeof input.cellId === "string" ? input.cellId.split("/") : [];
  if (!plan || segments.length !== 5 || segments.some((segment) => !segment) ||
      segments[0] !== plan?.grade || segments[1] !== input.labId ||
      segments[2] !== input.viewportId || segments[3] !== input.locale ||
      segments[4] !== input.theme ||
      !["desktop", "tablet", "mobile"].includes(input.viewportId) ||
      !["en", "zh", "zh-Hans"].includes(input.locale) ||
      !["light", "dark"].includes(input.theme)) {
    issue("cross-state-identity", "Cross-state cell, lab, viewport, locale, or theme identity drifted.");
    return Object.freeze(issues);
  }
  const before = input.beforeEndpoint;
  const after = input.afterEndpoint;
  if (before.observationIndex >= after.observationIndex ||
      !before.observation.phase.startsWith("range-state:") ||
      !after.observation.phase.startsWith("range-state:") ||
      before.observation.phase === after.observation.phase) {
    issue("cross-state-identity", "Cross-state endpoints must be two ordered range-state phases.");
  }
  if (!stateMatches(before.observation.publicState.state, plan.beforeState) ||
      !stateMatches(after.observation.publicState.state, plan.afterState)) {
    issue("cross-state-math", "Cross-state public endpoints do not match the independent exact state plan.");
    return Object.freeze(issues);
  }
  const beforeValid = plan.family === "distribution"
    ? validateDistributionEndpoint(before, plan, plan.beforeState, input.locale)
    : validateQuadraticEndpoint(before, plan, plan.beforeState, input.locale);
  const afterValid = plan.family === "distribution"
    ? validateDistributionEndpoint(after, plan, plan.afterState, input.locale)
    : validateQuadraticEndpoint(after, plan, plan.afterState, input.locale);
  if (!beforeValid || !afterValid) {
    issue("cross-state-math", "Cross-state raw metrics, localized text, fixed viewport, or painted centerline failed independent recomputation.");
  }
  if (!endpointGeometryChanged(input, plan)) {
    issue("cross-state-geometry", "Cross-state painted geometry did not change in the one fixed numeric frame.");
  }
  return Object.freeze(issues);
}
