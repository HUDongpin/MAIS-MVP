import assert from "node:assert/strict";
import test from "node:test";
import {
  HK_PASS_THROUGH_LAB_IDS,
  type HKPassThroughLabId
} from "../../components/visualizations/hk/hkVisualizationLabRegistry";
import { HK_VISUALIZATION_LESSON_CONTRACTS } from "../../components/visualizations/hk/hkVisualizationLessonContracts";
import { visualizationLabByLabId } from "../../data/visualizationLabs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfiguredSemanticPrimaryMarks } from "../../components/visualizations/ConfiguredSemanticPrimaryMarks";
import {
  ConfiguredSemanticSecondaryMarks,
  buildConfiguredSemanticSecondaryMathState,
  type ConfiguredSemanticSecondaryMathInput
} from "../../components/visualizations/ConfiguredSemanticSecondaryMarks";
import { visualizationThemeForTheme } from "../../components/visualizations/visualizationTheme";
import {
  configuredVisualizationPassThroughResetPlans,
  getConfiguredVisualizationSemanticControlContract,
  getConfiguredVisualizationSemanticResetPlan
} from "../../components/visualizations/configuredVisualizationSemanticControls";
import * as passThroughOracleModule from "./hk-visualization-pass-through-math-oracle-contract";
import {
  HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS,
  validateHKVisualizationPassThroughMathOracleContracts,
  type HKVisualizationPassThroughMathOracleContract,
  type HKVisualizationPassThroughMathOracleValidationCode
} from "./hk-visualization-pass-through-math-oracle-contract";

test("the pass-through registry exposes a separate visible-math observation auditor", () => {
  const module = passThroughOracleModule as unknown as Record<string, unknown>;
  assert.equal(
    typeof module.auditHkVisualizationPassThroughVisibleMathObservation,
    "function",
    "Visible SVG/readout evidence must be audited independently from the projected public state."
  );
  for (const contract of HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS) {
    assert.ok(
      Array.isArray((contract as unknown as Record<string, unknown>).visibleMathMarks),
      `${contract.labId} must declare exact visible numeric/geometry marks.`
    );
    assert.ok(
      ((contract as unknown as Record<string, unknown>).visibleMathMarks as unknown[]).length > 0,
      `${contract.labId} visible math mark contract must not be empty.`
    );
  }
});

test("the pass-through registry exposes an exact raw renderer-state layer separate from public and visible evidence", () => {
  const module = passThroughOracleModule as unknown as Record<string, unknown>;
  assert.equal(
    typeof module.auditHkVisualizationPassThroughRawRendererState,
    "function",
    "Raw semantic renderer JSON must have an independent fail-closed auditor."
  );
  for (const contract of HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS) {
    const rawContract = (contract as unknown as Record<string, unknown>).rawRendererState;
    assert.ok(rawContract && typeof rawContract === "object", `${contract.labId} raw state contract`);
  }
});

test("visible-math contract metadata fails closed when geometry evidence is empty or ambiguous", () => {
  assertRejected(
    replaceContract("p2-multiplication-foundations", (contract) => ({
      ...contract,
      visibleMathMarks: []
    })),
    "generic-mark-only-evidence"
  );
  assertRejected(
    replaceContract("advanced-functions", (contract) => ({
      ...contract,
      visibleMathMarks: contract.visibleMathMarks.map((visibleMark, index) => (
        index === 0
          ? { ...visibleMark, requiredAttributes: ["d", "d"] }
          : visibleMark
      ))
    })),
    "generic-mark-only-evidence"
  );
});

test("raw renderer-state auditor rejects missing, malformed, duplicate, hidden, and misidentified owners", () => {
  const contract = contractFor("p2-multiplication-foundations");
  const state = { columns: 3, rows: 2, total: 6 };
  const validRaw = canonicalRawState(contract.labId, state);
  assert.ok(rawIssueCodes(contract, state, {
    attribute: contract.rawRendererState.attribute,
    selectorEvidence: { count: 0, learnerVisibleCount: 0 },
    serializedState: null
  }).has("raw-selector"));
  assert.ok(rawIssueCodes(contract, state, rawObservation(contract, "{not-json")).has("raw-json"));
  assert.ok(rawIssueCodes(
    contract,
    state,
    rawObservation(contract, validRaw, { count: 2, learnerVisibleCount: 2 })
  ).has("raw-selector"));
  assert.ok(rawIssueCodes(
    contract,
    state,
    rawObservation(contract, validRaw, { count: 1, learnerVisibleCount: 0 })
  ).has("raw-selector"));
  assert.ok(rawIssueCodes(contract, state, rawObservation(contract, {
    ...validRaw,
    family: "fraction-equivalence"
  })).has("raw-identity"));
});

test("raw renderer-state auditor rejects private canonical values that disagree with projected public state", () => {
  const cases = [
    ["p2-multiplication-foundations", { columns: 3, rows: 2, total: 6 }, (raw: any) => ({ ...raw, product: 5 })],
    ["p3-fractions-intro", { denominator: 6, equivalentDenominator: 12, equivalentNumerator: 8, numerator: 4 }, (raw: any) => ({ ...raw, resultNumerator: 7 })],
    ["statistics-s1", { mean: 5, spread: 2 }, (raw: any) => ({ ...raw, metrics: { ...raw.metrics, mean: 4 } })],
    ["data-handling", { mean: 5, spread: 2 }, (raw: any) => ({ ...raw, metrics: { ...raw.metrics, spread: 3 } })],
    ["advanced-functions", { family: "quadratic", scale: 1, verticalShift: 0 }, (raw: any) => ({ ...raw, metrics: { ...raw.metrics, scaleParameter: 2 } })],
    ["differentiation-intro", { curvature: 0.5, probeX: -0.8, slope: -0.4 }, (raw: any) => ({ ...raw, metrics: { ...raw.metrics, functionValue: 99 } })],
    ["calculus", { curvature: 0.5, probeX: -0.8, slope: -0.4 }, (raw: any) => ({ ...raw, metrics: { ...raw.metrics, tangentSlope: 99 } })]
  ] as const;
  for (const [labId, state, mutate] of cases) {
    const contract = contractFor(labId);
    const raw = mutate(canonicalRawState(labId, { ...state }));
    assert.ok(
      rawIssueCodes(contract, { ...state }, rawObservation(contract, raw)).has("raw-state-mismatch"),
      labId
    );
  }
});

test("contract validator rejects an exact raw identity selector that is not topic scoped", () => {
  const contracts = replaceContract("statistics-s1", (contract) => ({
    ...contract,
    rawRendererState: {
      ...contract.rawRendererState,
      identitySelector: "[data-viz-math-state]"
    }
  }));
  assert.ok(issueCodes(contracts).has("raw-renderer-state-contract" as HKVisualizationPassThroughMathOracleValidationCode));
});

test("raw renderer contracts count every topic raw owner before selecting the exact identity", () => {
  for (const contract of HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS) {
    const rawContract = contract.rawRendererState as unknown as Record<string, unknown>;
    assert.equal(typeof rawContract.broadOwnerSelector, "string", contract.labId);
    assert.equal(typeof rawContract.identitySelector, "string", contract.labId);
    assert.equal(
      rawContract.selector,
      rawContract.broadOwnerSelector,
      `${contract.labId} browser owner counting must use the broad selector.`,
    );
    assert.notEqual(
      rawContract.broadOwnerSelector,
      rawContract.identitySelector,
      `${contract.labId} broad ownership and exact identity must not collapse to one selector.`,
    );
    assert.match(String(rawContract.broadOwnerSelector), /data-viz-math-state.*data-viz-state-json|data-viz-state-json.*data-viz-math-state/u);
    assert.match(String(rawContract.broadOwnerSelector), /data-viz-name="configured semantic primary marks"/u);
    assert.match(String(rawContract.broadOwnerSelector), /data-viz-name="configured semantic secondary model"/u);
    assert.match(String(rawContract.identitySelector), new RegExp(`data-viz-semantic-variant="${contract.labId}"`));
  }

  const contract = contractFor("statistics-s1");
  const state = { mean: 5, spread: 2 };
  assert.ok(
    rawIssueCodes(
      contract,
      state,
      rawObservation(contract, canonicalRawState(contract.labId, state), {
        count: 2,
        learnerVisibleCount: 2,
      }),
    ).has("raw-selector"),
    "One valid identity plus one learner-visible wrong raw owner must fail the broad ownership count.",
  );
});

function issueCodes(contracts: readonly HKVisualizationPassThroughMathOracleContract[]) {
  return new Set(
    validateHKVisualizationPassThroughMathOracleContracts(contracts).map(({ code }) => code)
  );
}

function replaceContract(
  labId: string,
  update: (
    contract: HKVisualizationPassThroughMathOracleContract
  ) => HKVisualizationPassThroughMathOracleContract
) {
  return HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS.map((contract) => (
    contract.labId === labId ? update(contract) : contract
  ));
}

function assertRejected(
  contracts: readonly HKVisualizationPassThroughMathOracleContract[],
  code: HKVisualizationPassThroughMathOracleValidationCode
) {
  assert.ok(issueCodes(contracts).has(code), `Expected fail-closed issue ${code}.`);
}

function contractFor(labId: string) {
  const contract = HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS.find(
    (candidate) => candidate.labId === labId
  );
  assert.ok(contract, `Missing pass-through oracle contract for ${labId}.`);
  return contract;
}

type VisibleObservation = Parameters<
  typeof passThroughOracleModule.auditHkVisualizationPassThroughVisibleMathObservation
>[1];
type RawObservation = Parameters<
  typeof passThroughOracleModule.auditHkVisualizationPassThroughRawRendererState
>[2];

function rawObservation(
  contract: HKVisualizationPassThroughMathOracleContract,
  rawState: unknown,
  selectorEvidence = { count: 1, learnerVisibleCount: 1 }
): RawObservation {
  return {
    attribute: contract.rawRendererState.attribute,
    selectorEvidence,
    serializedState: typeof rawState === "string" ? rawState : JSON.stringify(rawState)
  };
}

function canonicalRawState(labId: string, state: Record<string, unknown>) {
  if (labId === "p2-multiplication-foundations") return {
    columns: state.columns,
    family: "equal-groups-array",
    formula: `${state.rows} × ${state.columns} = ${state.total}`,
    kind: "array",
    product: state.total,
    rows: state.rows,
    scale: 1,
    variant: labId
  };
  if (labId === "p3-fractions-intro") return {
    denominator: state.denominator,
    displayMode: "compare",
    family: "fraction-equivalence",
    formula: `${state.numerator}/${state.denominator} = ${state.equivalentNumerator}/${state.equivalentDenominator}`,
    kind: "fraction",
    multiplier: 2,
    numerator: state.numerator,
    resultDenominator: state.equivalentDenominator,
    resultNumerator: state.equivalentNumerator,
    variant: labId
  };
  if (labId === "statistics-s1" || labId === "data-handling") return {
    family: "statistics-distribution",
    formula: expectedFormulaForState(labId, state),
    kind: "distribution",
    metrics: { mean: state.mean, spread: state.spread },
    points: {},
    series: [],
    variant: labId
  };
  if (labId === "advanced-functions") return {
    family: "function-properties",
    formula: expectedFormulaForState(labId, state),
    kind: "advanced-functions",
    metrics: {
      primaryFamily: state.family,
      scaleParameter: state.scale,
      verticalShift: state.verticalShift
    },
    points: {},
    series: [],
    variant: labId
  };
  const curvature = Number(state.curvature);
  const probeX = Number(state.probeX);
  return {
    family: "derivative-rate-area",
    formula: expectedFormulaForState(labId, state),
    kind: "calculus",
    metrics: {
      curvature,
      functionValue: 0.5 * curvature * probeX ** 2 + 0.35,
      probeX,
      tangentSlope: state.slope
    },
    points: {},
    series: [],
    variant: labId
  };
}

function expectedFormulaForState(labId: string, state: Record<string, unknown>) {
  const compact = (value: unknown) => {
    const numeric = Number(value);
    const rounded = Number(numeric.toFixed(2));
    return String(Object.is(rounded, -0) ? 0 : rounded);
  };
  if (labId === "p2-multiplication-foundations") {
    return `${state.rows} × ${state.columns} = ${state.total}`;
  }
  if (labId === "p3-fractions-intro") {
    return `${state.numerator}/${state.denominator} = ${state.equivalentNumerator}/${state.equivalentDenominator}`;
  }
  if (labId === "statistics-s1" || labId === "data-handling") {
    return `center μ=${compact(state.mean)} · spread=${compact(state.spread)}`;
  }
  if (labId === "advanced-functions") {
    const shift = Number(state.verticalShift);
    return `y=${compact(state.scale)}x² ${shift >= 0 ? "+" : "−"} ${compact(Math.abs(shift))}`;
  }
  return `f(x)=0.5·a·x²+0.35, a=${compact(state.curvature)} · f′(x)=a·x`;
}

function visibleObservation(
  labId: string,
  state: Record<string, unknown>,
  marks: VisibleObservation["marks"]
): VisibleObservation {
  const contract = contractFor(labId);
  return {
    formulaText: expectedFormulaForState(labId, state),
    labId,
    marks,
    rawRendererState: rawObservation(contract, canonicalRawState(labId, state)),
    state
  } as VisibleObservation;
}

function mark(
  attributes: Record<string, string | null>,
  tagName = "path",
  text = ""
) {
  return { attributes, tagName, text };
}

function visibleIssueCodes(
  contract: HKVisualizationPassThroughMathOracleContract,
  observation: VisibleObservation
) {
  return new Set(
    passThroughOracleModule.auditHkVisualizationPassThroughVisibleMathObservation(
      contract,
      observation
    ).map(({ code }) => code)
  );
}

function rawIssueCodes(
  contract: HKVisualizationPassThroughMathOracleContract,
  state: Record<string, unknown>,
  observation: RawObservation
) {
  return new Set(
    passThroughOracleModule.auditHkVisualizationPassThroughRawRendererState(
      contract,
      state,
      observation
    ).map(({ code }) => code)
  );
}

function attributesFromTag(tag: string) {
  return Object.fromEntries(
    Array.from(tag.matchAll(/\s([^\s=]+)="([^"]*)"/gu), (match) => [match[1], match[2]])
  );
}

function decodeHtmlAttribute(value: string | undefined) {
  return value
    ?.replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">") ?? null;
}

function tagsForName(markup: string, name: string) {
  return Array.from(markup.matchAll(/<[^/][^>]*data-viz-name="([^"]+)"[^>]*>/gu))
    .filter((match) => match[1] === name)
    .map((match) => match[0]);
}

function textForName(markup: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(
    `<([a-z][a-z0-9:-]*)[^>]*data-viz-name="${escaped}"[^>]*>([\\s\\S]*?)<\\/\\1>`,
    "giu"
  );
  return Array.from(markup.matchAll(pattern), (match) => (
    decodeHtmlAttribute(match[2]?.replace(/<[^>]+>/gu, "")) ?? ""
  ));
}

function observeMarkup(
  contract: HKVisualizationPassThroughMathOracleContract,
  state: Record<string, unknown>,
  markup: string
): VisibleObservation {
  const rawOwnerName = contract.rawRendererState.attribute === "data-viz-state-json"
    ? "configured semantic primary marks"
    : "configured semantic secondary model";
  const rawOwners = tagsForName(markup, rawOwnerName);
  const rawAttributes = rawOwners[0] ? attributesFromTag(rawOwners[0]) : {};
  const serializedState = decodeHtmlAttribute(rawAttributes[contract.rawRendererState.attribute]);
  const parsedRawState = serializedState ? JSON.parse(serializedState) as Record<string, unknown> : null;
  const secondaryFormulaTag = tagsForName(markup, "semantic formula")[0];
  const secondaryFormula = secondaryFormulaTag
    ? decodeHtmlAttribute(attributesFromTag(secondaryFormulaTag)["data-viz-visible-formula"])
    : null;
  const formulaMarkName = contract.rawRendererState.attribute === "data-viz-state-json"
    ? "configured semantic primary marks"
    : "semantic formula";
  const visibleFormula = secondaryFormula ?? String(parsedRawState?.formula ?? "");
  return {
    formulaText: visibleFormula,
    labId: contract.labId,
    marks: Object.fromEntries(contract.visibleMathMarks.map(({ name }) => [
      name,
      tagsForName(markup, name).map((tag, index) => ({
        attributes: attributesFromTag(tag),
        tagName: tag.match(/^<([^\s>]+)/u)?.[1] ?? "",
        text: contract.rawRendererState.attribute === "data-viz-state-json" && name === formulaMarkName
          ? visibleFormula
          : textForName(markup, name)[index] ?? ""
      }))
    ])),
    rawRendererState: {
      attribute: contract.rawRendererState.attribute,
      selectorEvidence: {
        count: rawOwners.length,
        learnerVisibleCount: rawOwners.length
      },
      serializedState
    },
    state
  } as VisibleObservation;
}

const visibleTheme = visualizationThemeForTheme("light");

function renderPrimaryPassThrough(
  family: "equal-groups-array" | "fraction-equivalence",
  variant: "p2-multiplication-foundations" | "p3-fractions-intro",
  value: number,
  comparison: number,
  mode = 0
) {
  return renderToStaticMarkup(createElement("svg", { viewBox: "0 0 640 360" }, createElement(
    ConfiguredSemanticPrimaryMarks,
    { accent: "#06b6d4", comparison, family, mode, value, variant, vizTheme: visibleTheme }
  )));
}

function renderSecondaryPassThrough(input: ConfiguredSemanticSecondaryMathInput) {
  return renderToStaticMarkup(createElement("svg", { viewBox: "0 0 640 360" }, createElement(
    ConfiguredSemanticSecondaryMarks,
    { ...input, accent: "#06b6d4", vizTheme: visibleTheme }
  )));
}

function representativePassThroughObservations() {
  const observations: Array<{
    contract: HKVisualizationPassThroughMathOracleContract;
    observation: VisibleObservation;
  }> = [];
  const p2 = contractFor("p2-multiplication-foundations");
  observations.push({
    contract: p2,
    observation: observeMarkup(
      p2,
      { columns: 5, rows: 4, total: 20 },
      renderPrimaryPassThrough("equal-groups-array", p2.labId as "p2-multiplication-foundations", 4, 5),
    ),
  });
  const p3 = contractFor("p3-fractions-intro");
  observations.push({
    contract: p3,
    observation: observeMarkup(
      p3,
      { denominator: 6, equivalentDenominator: 12, equivalentNumerator: 8, numerator: 4 },
      renderPrimaryPassThrough("fraction-equivalence", p3.labId as "p3-fractions-intro", 5, 4, 2),
    ),
  });
  for (const labId of ["statistics-s1", "data-handling"] as const) {
    const contract = contractFor(labId);
    observations.push({
      contract,
      observation: observeMarkup(
        contract,
        { mean: 5, spread: 2 },
        renderSecondaryPassThrough({
          comparison: 2,
          family: "statistics-distribution",
          mode: 0,
          value: 5,
          variant: labId,
        }),
      ),
    });
  }
  const advanced = contractFor("advanced-functions");
  observations.push({
    contract: advanced,
    observation: observeMarkup(
      advanced,
      { family: "quadratic", scale: 5 / 6, verticalShift: 0 },
      renderSecondaryPassThrough({
        comparison: 5,
        family: "function-properties",
        mode: 0,
        value: 5,
        variant: advanced.labId,
      }),
    ),
  });
  for (const labId of ["differentiation-intro", "calculus"] as const) {
    const input = {
      comparison: 4,
      family: "derivative-rate-area",
      mode: 0,
      value: 5,
      variant: labId,
    } as const;
    const internal = buildConfiguredSemanticSecondaryMathState(input);
    const curvature = Number(internal.metrics.curvature);
    const probeX = Number(internal.metrics.probeX);
    const contract = contractFor(labId);
    observations.push({
      contract,
      observation: observeMarkup(
        contract,
        { curvature, probeX, slope: curvature * probeX },
        renderSecondaryPassThrough(input),
      ),
    });
  }
  return observations;
}

test("visible-math auditor rejects an array whose public total is right but rendered grid is incomplete", () => {
  const contract = contractFor("p2-multiplication-foundations");
  const observation = visibleObservation(contract.labId, { columns: 3, rows: 2, total: 6 }, {
    "array outline": [mark({
      "data-viz-columns": "3", "data-viz-object-total": "6", "data-viz-rows": "2",
      height: "62", width: "87", x: "100", y: "130"
    }, "rect")],
    "array item": [
      mark({ "data-viz-column": "1", "data-viz-row": "1", cx: "1", cy: "1", r: "4" }, "circle"),
      mark({ "data-viz-column": "2", "data-viz-row": "1", cx: "2", cy: "1", r: "4" }, "circle"),
      mark({ "data-viz-column": "3", "data-viz-row": "1", cx: "3", cy: "1", r: "4" }, "circle"),
      mark({ "data-viz-column": "1", "data-viz-row": "2", cx: "1", cy: "2", r: "4" }, "circle"),
      mark({ "data-viz-column": "2", "data-viz-row": "2", cx: "2", cy: "2", r: "4" }, "circle")
    ],
    "equal groups total": [mark({ "data-viz-total": "6", x: "360", y: "176" }, "text", "Total: 6")]
  });
  assert.ok(visibleIssueCodes(contract, observation).has("visible-geometry"));
});

test("visible-math auditor rejects geometry that agrees with public state but not raw renderer state", () => {
  const contract = contractFor("p2-multiplication-foundations");
  const state = { columns: 3, rows: 2, total: 6 };
  const markup = renderPrimaryPassThrough(
    "equal-groups-array",
    "p2-multiplication-foundations",
    2,
    3
  );
  const observation = observeMarkup(contract, state, markup);
  const raw = JSON.parse(observation.rawRendererState.serializedState ?? "null") as Record<string, unknown>;
  const mismatch = {
    ...observation,
    rawRendererState: rawObservation(contract, { ...raw, product: 5 })
  };
  assert.ok(visibleIssueCodes(contract, mismatch).has("visible-raw-mismatch"));
});

test("visible-math auditor rejects a complete array whose circles are stacked at one SVG coordinate", () => {
  const contract = contractFor("p2-multiplication-foundations");
  const items = Array.from({ length: 6 }, (_, index) => mark({
    "data-viz-column": String(index % 3 + 1),
    "data-viz-row": String(Math.floor(index / 3) + 1),
    cx: "120",
    cy: "150",
    r: "4"
  }, "circle"));
  const observation = visibleObservation(contract.labId, { columns: 3, rows: 2, total: 6 }, {
    "array outline": [mark({ "data-viz-columns": "3", "data-viz-object-total": "6", "data-viz-rows": "2", height: "80", width: "120", x: "100", y: "120" }, "rect")],
    "array item": items,
    "equal groups total": [mark({ "data-viz-total": "6", x: "360", y: "176" }, "text", "Total: 6")]
  });
  assert.ok(visibleIssueCodes(contract, observation).has("visible-geometry"));
});

test("visible-math auditor rejects fraction bars with correct labels but wrong fill widths", () => {
  const contract = contractFor("p3-fractions-intro");
  const common = { "data-viz-denominator": "6", "data-viz-numerator": "4", "data-viz-partition-count": "6", "data-viz-value": String(4 / 6) };
  const equivalent = { "data-viz-denominator": "12", "data-viz-numerator": "8", "data-viz-partition-count": "12", "data-viz-value": String(8 / 12) };
  const observation = visibleObservation(contract.labId, {
    denominator: 6, equivalentDenominator: 12, equivalentNumerator: 8, numerator: 4
  }, {
    "whole bar": [mark(common, "g")],
    "equivalent bar": [mark(equivalent, "g")],
    "whole bar background": [mark({ "data-viz-bar-width": "456", "data-viz-partition-count": "6", height: "42", width: "456", x: "92", y: "132" }, "rect")],
    "equivalent bar background": [mark({ "data-viz-bar-width": "456", "data-viz-partition-count": "12", height: "42", width: "456", x: "92", y: "218" }, "rect")],
    "whole bar fill": [mark({ ...common, "data-viz-bar-width": "456", height: "42", width: "456", x: "92", y: "132" }, "rect")],
    "equivalent bar fill": [mark({ ...equivalent, "data-viz-bar-width": "456", height: "42", width: "1", x: "92", y: "218" }, "rect")]
  });
  assert.ok(visibleIssueCodes(contract, observation).has("visible-geometry"));
});

test("visible-math auditor rejects a correctly sized fraction fill offset from its visible bar", () => {
  const contract = contractFor("p3-fractions-intro");
  const base = { "data-viz-denominator": "2", "data-viz-numerator": "1", "data-viz-partition-count": "2", "data-viz-value": "0.5" };
  const equivalent = { "data-viz-denominator": "4", "data-viz-numerator": "2", "data-viz-partition-count": "4", "data-viz-value": "0.5" };
  const observation = visibleObservation(contract.labId, { denominator: 2, equivalentDenominator: 4, equivalentNumerator: 2, numerator: 1 }, {
    "whole bar": [mark(base, "g")],
    "equivalent bar": [mark(equivalent, "g")],
    "whole bar background": [mark({ "data-viz-bar-width": "456", "data-viz-partition-count": "2", height: "42", width: "456", x: "92", y: "132" }, "rect")],
    "equivalent bar background": [mark({ "data-viz-bar-width": "456", "data-viz-partition-count": "4", height: "42", width: "456", x: "92", y: "218" }, "rect")],
    "whole bar fill": [mark({ ...base, "data-viz-bar-width": "456", height: "42", width: "228", x: "999", y: "132" }, "rect")],
    "equivalent bar fill": [mark({ ...equivalent, "data-viz-bar-width": "456", height: "42", width: "228", x: "92", y: "218" }, "rect")]
  });
  assert.ok(visibleIssueCodes(contract, observation).has("visible-geometry"));
});

test("visible-math auditor rejects numeric markers whose declared coordinates are absent from the SVG path", () => {
  const contract = contractFor("advanced-functions");
  const observation = visibleObservation(contract.labId, { family: "quadratic", scale: 1, verticalShift: 0 }, {
    "advanced primary curve": [mark({
      "data-viz-domain-max": "2", "data-viz-domain-min": "-2", "data-viz-formula": "x²",
      "data-viz-function-family": "quadratic", "data-viz-sample-count": "25", "data-viz-scale-parameter": "1",
      "data-viz-sample-start-x": "1", "data-viz-sample-start-y": "1", "data-viz-sample-middle-x": "2", "data-viz-sample-middle-y": "2", "data-viz-sample-end-x": "3", "data-viz-sample-end-y": "3",
      "data-viz-vertical-shift": "0", d: "M 50 50 L 60 60 L 70 70"
    })],
    "advanced curve sample": [
      mark({ "data-viz-mapped-x": "1", "data-viz-mapped-y": "1", "data-viz-sample-index": "0", "data-viz-x": "-2", "data-viz-y": "4", cx: "1", cy: "1", r: "4" }, "circle"),
      mark({ "data-viz-mapped-x": "2", "data-viz-mapped-y": "2", "data-viz-sample-index": "12", "data-viz-x": "0", "data-viz-y": "0", cx: "2", cy: "2", r: "4" }, "circle"),
      mark({ "data-viz-mapped-x": "3", "data-viz-mapped-y": "3", "data-viz-sample-index": "24", "data-viz-x": "2", "data-viz-y": "4", cx: "3", cy: "3", r: "4" }, "circle")
    ],
    "advanced function readout": [mark({ "data-viz-primary-family": "quadratic", "data-viz-scale-parameter": "1", "data-viz-selected-curve-only": "true", "data-viz-vertical-shift": "0", x: "320", y: "108" }, "text")]
  });
  assert.ok(visibleIssueCodes(contract, observation).has("visible-geometry"));
});

test("visible-math auditor rejects a spread band whose endpoints are not mean minus and plus spread", () => {
  const contract = contractFor("statistics-s1");
  const observation = visibleObservation(contract.labId, { mean: 5, spread: 2 }, {
    "distribution summary curve": [mark({ "data-viz-left-spread-x": "200", "data-viz-left-spread-y": "160", "data-viz-mean": "5", "data-viz-right-spread-x": "300", "data-viz-right-spread-y": "160", "data-viz-sample-count": "25", "data-viz-spread": "2", d: "M 200 160 L 300 160" })],
    "distribution mean": [mark({ "data-viz-mean": "5", "data-viz-series-index": "12", x1: "300", x2: "300", y1: "200", y2: "100" }, "line")],
    "distribution spread band": [mark({ "data-viz-left-value": "4", "data-viz-left-x": "200", "data-viz-mean": "5", "data-viz-right-value": "8", "data-viz-right-x": "300", "data-viz-spread": "2", height: "10", width: "100", x: "200", y: "250" }, "rect")],
    "distribution left spread marker": [mark({ "data-viz-density": String(Math.exp(-0.5)), "data-viz-mapped-x": "200", "data-viz-mapped-y": "160", "data-viz-series-index": "8", "data-viz-series-y": String(Math.exp(-0.5)), "data-viz-x-value": "3", cx: "200", cy: "160", r: "6" }, "circle")],
    "distribution right spread marker": [mark({ "data-viz-density": String(Math.exp(-0.5)), "data-viz-mapped-x": "300", "data-viz-mapped-y": "160", "data-viz-series-index": "16", "data-viz-series-y": String(Math.exp(-0.5)), "data-viz-x-value": "7", cx: "300", cy: "160", r: "6" }, "circle")],
    "distribution summary readout": [mark({ "data-viz-mean": "5", "data-viz-spread": "2", x: "320", y: "108" }, "text", "mean=5 spread=2")]
  });
  assert.ok(visibleIssueCodes(contract, observation).has("visible-state-mismatch"));
});

test("visible-math auditor rejects wrong selected-curve samples despite correct scale and shift labels", () => {
  const contract = contractFor("advanced-functions");
  const observation = visibleObservation(contract.labId, { family: "quadratic", scale: 2, verticalShift: 1 }, {
    "advanced primary curve": [mark({
      "data-viz-domain-max": "2", "data-viz-domain-min": "-2", "data-viz-formula": "2x² + 1",
      "data-viz-sample-end-x": "3", "data-viz-sample-end-y": "3", "data-viz-sample-middle-x": "2", "data-viz-sample-middle-y": "2", "data-viz-sample-start-x": "1", "data-viz-sample-start-y": "1",
      "data-viz-function-family": "quadratic", "data-viz-sample-count": "25", "data-viz-scale-parameter": "2",
      "data-viz-vertical-shift": "1", d: "M 1 1 L 2 2 L 3 3"
    })],
    "advanced curve sample": [
      mark({ "data-viz-mapped-x": "1", "data-viz-mapped-y": "1", "data-viz-sample-index": "0", "data-viz-x": "-2", "data-viz-y": "9", cx: "1", cy: "1", r: "4" }, "circle"),
      mark({ "data-viz-mapped-x": "2", "data-viz-mapped-y": "2", "data-viz-sample-index": "12", "data-viz-x": "0", "data-viz-y": "99", cx: "2", cy: "2", r: "4" }, "circle"),
      mark({ "data-viz-mapped-x": "3", "data-viz-mapped-y": "3", "data-viz-sample-index": "24", "data-viz-x": "2", "data-viz-y": "9", cx: "3", cy: "3", r: "4" }, "circle")
    ],
    "advanced function readout": [mark({
      "data-viz-primary-family": "quadratic", "data-viz-scale-parameter": "2", "data-viz-selected-curve-only": "true",
      "data-viz-vertical-shift": "1", x: "320", y: "108"
    }, "text", "quadratic a=2 k=1")]
  });
  assert.ok(visibleIssueCodes(contract, observation).has("visible-geometry"));
});

test("visible-math auditor rejects tangent geometry whose anchor and slope disagree with the plotted function", () => {
  const contract = contractFor("calculus");
  const observation = visibleObservation(contract.labId, { curvature: 0.5, probeX: -0.8, slope: -0.4 }, {
    "calculus curve": [mark({ "data-viz-curvature": "0.5", "data-viz-domain-max": "4", "data-viz-domain-min": "-4", "data-viz-sample-count": "33", "data-viz-vertical-shift": "0.35", d: "M 1 1 L 2 2" })],
    "calculus probe point": [mark({ "data-viz-mapped-x": "1", "data-viz-mapped-y": "1", "data-viz-tangent-slope": "-0.4", "data-viz-x0": "-0.8", "data-viz-y0": "99", cx: "1", cy: "1", r: "7" }, "circle")],
    "tangent line": [mark({ "data-viz-anchor-x": "-0.8", "data-viz-anchor-y": "99", "data-viz-rendered-end-x": "2", "data-viz-rendered-end-y": "2", "data-viz-rendered-start-x": "1", "data-viz-rendered-start-y": "1", "data-viz-slope": "-0.4", d: "M 1 1 L 2 2" })],
    "calculus mode readout": [mark({ "data-viz-active-mode": "tangent", "data-viz-curvature": "0.5", "data-viz-x0": "-0.8", x: "320", y: "108" }, "text", "slope=-0.4")]
  });
  assert.ok(visibleIssueCodes(contract, observation).has("visible-geometry"));
});

test("visible-math auditor rejects distribution markers and tangent endpoints detached from their actual path d", () => {
  const statistics = contractFor("statistics-s1");
  const statisticsInput = { comparison: 2, family: "statistics-distribution", mode: 0, value: 5, variant: "statistics-s1" } as const;
  const statisticsObservation = observeMarkup(
    statistics,
    { mean: 5, spread: 2 },
    renderSecondaryPassThrough(statisticsInput)
  );
  const distributionCurve = statisticsObservation.marks["distribution summary curve"][0];
  assert.ok(distributionCurve);
  const wrongDistribution = {
    ...statisticsObservation,
    marks: {
      ...statisticsObservation.marks,
      "distribution summary curve": [{
        ...distributionCurve,
        attributes: { ...distributionCurve.attributes, d: "M 1 1 L 2 2" }
      }]
    }
  };
  assert.ok(visibleIssueCodes(statistics, wrongDistribution).has("visible-geometry"));

  const calculus = contractFor("calculus");
  const calculusInput = { comparison: 4, family: "derivative-rate-area", mode: 0, value: 5, variant: "calculus" } as const;
  const calculusObservation = observeMarkup(
    calculus,
    { curvature: 0.5, probeX: -0.8, slope: -0.4 },
    renderSecondaryPassThrough(calculusInput)
  );
  const tangent = calculusObservation.marks["tangent line"][0];
  const calculusCurve = calculusObservation.marks["calculus curve"][0];
  assert.ok(tangent && calculusCurve);
  const wrongTangent = {
    ...calculusObservation,
    marks: {
      ...calculusObservation.marks,
      "tangent line": [{
        ...tangent,
        attributes: { ...tangent.attributes, d: "M 1 1 L 2 2" }
      }]
    }
  };
  assert.ok(visibleIssueCodes(calculus, wrongTangent).has("visible-geometry"));
  const wrongCalculusCurve = {
    ...calculusObservation,
    marks: {
      ...calculusObservation.marks,
      "calculus curve": [{
        ...calculusCurve,
        attributes: { ...calculusCurve.attributes, d: "M 1 1 L 2 2" }
      }]
    }
  };
  assert.ok(visibleIssueCodes(calculus, wrongCalculusCurve).has("visible-geometry"));
});

test("visible-math auditor rejects an actual tangent path with the wrong rendered slope", () => {
  const contract = contractFor("calculus");
  const input = { comparison: 4, family: "derivative-rate-area", mode: 0, value: 5, variant: "calculus" } as const;
  const observation = observeMarkup(
    contract,
    { curvature: 0.5, probeX: -0.8, slope: -0.4 },
    renderSecondaryPassThrough(input)
  );
  const tangent = observation.marks["tangent line"][0];
  const probe = observation.marks["calculus probe point"][0];
  assert.ok(tangent && probe);
  const probeY = probe.attributes.cy;
  assert.ok(probeY);
  const wrong = {
    ...observation,
    marks: {
      ...observation.marks,
      "tangent line": [{
        ...tangent,
        attributes: {
          ...tangent.attributes,
          "data-viz-rendered-start-x": "92",
          "data-viz-rendered-start-y": probeY,
          "data-viz-rendered-end-x": "548",
          "data-viz-rendered-end-y": probeY,
          d: `M 92 ${probeY} L 548 ${probeY}`
        }
      }]
    }
  };
  assert.ok(visibleIssueCodes(contract, wrong).has("visible-geometry"));
});

test("all seven visible formulas bind exact public math to raw JSON and the learner-visible formula surface", () => {
  for (const { contract, observation } of representativePassThroughObservations()) {
    const expectedFormula = expectedFormulaForState(contract.labId, observation.state);
    assert.match(String((observation as VisibleObservation & { formulaText?: string }).formulaText), new RegExp(expectedFormula.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    const wrongText = {
      ...observation,
      formulaText: "1 + 1 = 3",
    } as VisibleObservation;
    assert.ok(
      visibleIssueCodes(contract, wrongText).has("visible-formula"),
      `${contract.labId} must reject a wrong nonblank visible formula.`,
    );

    const raw = JSON.parse(observation.rawRendererState.serializedState ?? "null") as Record<string, unknown>;
    assert.ok(
      rawIssueCodes(
        contract,
        observation.state as Record<string, unknown>,
        rawObservation(contract, { ...raw, formula: "1 + 1 = 3" }),
      ).has("raw-state-mismatch"),
      `${contract.labId} raw formula must bind the same exact public mathematics.`,
    );

    const formulaMarkName = contract.rawRendererState.attribute === "data-viz-state-json"
      ? "configured semantic primary marks"
      : "semantic formula";
    const formulaMark = observation.marks[formulaMarkName]?.[0];
    assert.ok(formulaMark, `${contract.labId} must expose a formula-bearing visible mark.`);
    const formulaAttribute = contract.rawRendererState.attribute === "data-viz-state-json"
      ? "data-viz-formula"
      : "data-viz-visible-formula";
    const wrongMark = {
      ...observation,
      marks: {
        ...observation.marks,
        [formulaMarkName]: [{
          ...formulaMark,
          attributes: { ...formulaMark.attributes, [formulaAttribute]: "1 + 1 = 3" },
        }],
      },
    };
    assert.ok(
      visibleIssueCodes(contract, wrongMark).has("visible-formula"),
      `${contract.labId} must reject formula attribute drift on the visible formula surface.`,
    );

    const wrongVisibleText = {
      ...observation,
      marks: {
        ...observation.marks,
        [formulaMarkName]: [{ ...formulaMark, text: "1 + 1 = 3" }],
      },
    };
    assert.ok(
      visibleIssueCodes(contract, wrongVisibleText).has("visible-formula"),
      `${contract.labId} must reject wrong learner-painted formula text even when its hidden attribute remains correct.`,
    );
  }
});

test("distribution, selected-function, and tangent paths bind every raw sample in exact order", () => {
  const curved = representativePassThroughObservations().filter(({ contract }) =>
    ["statistics-s1", "data-handling", "advanced-functions", "differentiation-intro", "calculus"].includes(contract.labId),
  );
  for (const { contract, observation } of curved) {
    const curveName = contract.invariant.family === "displayed-distribution-summary"
      ? "distribution summary curve"
      : contract.invariant.family === "selected-function-curve"
        ? "advanced primary curve"
        : "calculus curve";
    const curve = observation.marks[curveName]?.[0];
    assert.ok(curve, `${contract.labId} ${curveName}`);
    const originalPath = curve.attributes.d ?? "";
    const extraPoint = {
      ...observation,
      marks: {
        ...observation.marks,
        [curveName]: [{
          ...curve,
          attributes: { ...curve.attributes, d: `${originalPath} L 1 1` },
        }],
      },
    };
    assert.ok(
      visibleIssueCodes(contract, extraPoint).has("visible-geometry"),
      `${contract.labId} must reject an extra path point.`,
    );

    const pathCommands = originalPath.match(
      /[ML]\s*-?(?:\d+(?:\.\d*)?|\.\d+)\s+-?(?:\d+(?:\.\d*)?|\.\d+)/gu,
    ) ?? [];
    assert.ok(pathCommands.length >= 25, `${contract.labId} full path commands`);
    const middleIndex = Math.floor(pathCommands.length / 2);
    const wrongMiddleCommands = [...pathCommands];
    wrongMiddleCommands[middleIndex] = "L 1 1";
    const wrongMiddle = {
      ...observation,
      marks: {
        ...observation.marks,
        [curveName]: [{
          ...curve,
          attributes: { ...curve.attributes, d: wrongMiddleCommands.join(" ") },
        }],
      },
    };
    assert.ok(
      visibleIssueCodes(contract, wrongMiddle).has("visible-geometry"),
      `${contract.labId} must reject a wrong middle path point.`,
    );

    const wrongOrderCommands = [...pathCommands];
    [wrongOrderCommands[middleIndex], wrongOrderCommands[middleIndex + 1]] = [
      wrongOrderCommands[middleIndex + 1],
      wrongOrderCommands[middleIndex],
    ];
    const wrongOrder = {
      ...observation,
      marks: {
        ...observation.marks,
        [curveName]: [{
          ...curve,
          attributes: { ...curve.attributes, d: wrongOrderCommands.join(" ") },
        }],
      },
    };
    assert.ok(
      visibleIssueCodes(contract, wrongOrder).has("visible-geometry"),
      `${contract.labId} must reject reordered path points.`,
    );

    const raw = JSON.parse(observation.rawRendererState.serializedState ?? "null") as Record<string, unknown>;
    const series = structuredClone(raw.series) as Array<{ x: number; y: number }>;
    assert.ok(series.length >= 25, `${contract.labId} must expose the full private series.`);
    series[Math.floor(series.length / 2)].y += 1;
    const wrongRawSeries = {
      ...observation,
      rawRendererState: rawObservation(contract, { ...raw, series }),
    };
    assert.ok(
      visibleIssueCodes(contract, wrongRawSeries).has("visible-raw-mismatch"),
      `${contract.labId} must reject a private series that no longer matches its exact formula.`,
    );
  }
});

test("distribution mean line is the exact mapped midpoint of the visible mu-minus/plus-spread band", () => {
  const { contract, observation } = representativePassThroughObservations().find(
    ({ contract: candidate }) => candidate.labId === "statistics-s1",
  )!;
  const mean = observation.marks["distribution mean"]?.[0];
  assert.ok(mean);
  const wrongMean = {
    ...observation,
    marks: {
      ...observation.marks,
      "distribution mean": [{
        ...mean,
        attributes: { ...mean.attributes, x1: "123", x2: "123" },
      }],
    },
  };
  assert.ok(visibleIssueCodes(contract, wrongMean).has("visible-geometry"));
});

test("advanced-functions renders a complete 33-point selected quadratic path", () => {
  const { observation } = representativePassThroughObservations().find(
    ({ contract }) => contract.labId === "advanced-functions",
  )!;
  const curve = observation.marks["advanced primary curve"]?.[0];
  assert.ok(curve);
  assert.equal(curve.attributes["data-viz-sample-count"], "33");
  assert.equal(
    Array.from((curve.attributes.d ?? "").matchAll(/[ML]\s*-?(?:\d+(?:\.\d*)?|\.\d+)\s+-?(?:\d+(?:\.\d*)?|\.\d+)/gu)).length,
    33,
  );
});

test("all seven pass-through topics pass visible-math audit against real SSR marks at control boundaries", () => {
  const p2 = contractFor("p2-multiplication-foundations");
  for (const [rows, columns] of [[1, 1], [4, 5], [10, 10]] as const) {
    const state = { columns, rows, total: rows * columns };
    const markup = renderPrimaryPassThrough(
      "equal-groups-array",
      "p2-multiplication-foundations",
      rows,
      columns
    );
    assert.deepEqual(
      passThroughOracleModule.auditHkVisualizationPassThroughVisibleMathObservation(
        p2,
        observeMarkup(p2, state, markup)
      ),
      [],
      `P2 ${rows}x${columns}`
    );
  }

  const fractions = contractFor("p3-fractions-intro");
  for (const mode of [0, 1, 2]) {
    for (const [numerator, denominator] of [[0, 2], [4, 6], [10, 10]] as const) {
      const state = {
        denominator,
        equivalentDenominator: denominator * 2,
        equivalentNumerator: numerator * 2,
        numerator
      };
      const markup = renderPrimaryPassThrough(
        "fraction-equivalence",
        "p3-fractions-intro",
        denominator - 1,
        numerator,
        mode
      );
      assert.deepEqual(
        passThroughOracleModule.auditHkVisualizationPassThroughVisibleMathObservation(
          fractions,
          observeMarkup(fractions, state, markup)
        ),
        [],
        `P3 mode=${mode} ${numerator}/${denominator}`
      );
    }
  }

  for (const labId of ["statistics-s1", "data-handling"] as const) {
    const contract = contractFor(labId);
    for (const [mean, spread] of [[0, 1], [5, 2], [10, 4]] as const) {
      const input = { comparison: spread, family: "statistics-distribution", mode: 0, value: mean, variant: labId } as const;
      const markup = renderSecondaryPassThrough(input);
      assert.deepEqual(
        passThroughOracleModule.auditHkVisualizationPassThroughVisibleMathObservation(
          contract,
          observeMarkup(contract, { mean, spread }, markup)
        ),
        [],
        `${labId} mean=${mean} spread=${spread}`
      );
    }
  }

  const advanced = contractFor("advanced-functions");
  for (const [value, comparison] of [[1, 0], [5, 5], [10, 10]] as const) {
    const input = { comparison, family: "function-properties", mode: 99, value, variant: "advanced-functions" } as const;
    const markup = renderSecondaryPassThrough(input);
    assert.deepEqual(
      passThroughOracleModule.auditHkVisualizationPassThroughVisibleMathObservation(
        advanced,
        observeMarkup(advanced, {
          family: "quadratic",
          scale: value / 6,
          verticalShift: comparison - 5
        }, markup)
      ),
      [],
      `advanced a=${value / 6} k=${comparison - 5}`
    );
  }

  for (const labId of ["differentiation-intro", "calculus"] as const) {
    const contract = contractFor(labId);
    for (const [value, comparison] of [[0, 1], [5, 4], [10, 9]] as const) {
      const input = { comparison, family: "derivative-rate-area", mode: 99, value, variant: labId } as const;
      const internal = buildConfiguredSemanticSecondaryMathState(input);
      const markup = renderSecondaryPassThrough(input);
      const curvature = Number(internal.metrics.curvature);
      const probeX = Number(internal.metrics.probeX);
      assert.deepEqual(
        passThroughOracleModule.auditHkVisualizationPassThroughVisibleMathObservation(
          contract,
          observeMarkup(contract, { curvature, probeX, slope: curvature * probeX }, markup)
        ),
        [],
        `${labId} a=${curvature} x0=${probeX}`
      );
    }
  }
});

test("P3 fraction endpoint oracle rejects wrong zero, unit, and ten-tenths visible geometry", () => {
  const contract = contractFor("p3-fractions-intro");
  for (const [numerator, denominator] of [[0, 2], [6, 6], [10, 10]] as const) {
    const state = {
      denominator,
      equivalentDenominator: denominator * 2,
      equivalentNumerator: numerator * 2,
      numerator
    };
    const markup = renderPrimaryPassThrough(
      "fraction-equivalence",
      "p3-fractions-intro",
      denominator - 1,
      numerator,
      2
    );
    const valid = observeMarkup(contract, state, markup);
    assert.deepEqual(
      passThroughOracleModule.auditHkVisualizationPassThroughVisibleMathObservation(
        contract,
        valid
      ),
      [],
      `${numerator}/${denominator} valid endpoint`
    );
    const fillName = numerator === 0 ? "whole bar fill" : "equivalent bar fill";
    const fill = valid.marks[fillName]?.[0];
    assert.ok(fill, `Missing ${fillName}.`);
    const corruptedWidth = numerator === 0 ? "1" : "0";
    const wrongGeometry: VisibleObservation = {
      ...valid,
      marks: {
        ...valid.marks,
        [fillName]: [{
          ...fill,
          attributes: { ...fill.attributes, width: corruptedWidth }
        }]
      }
    };
    assert.ok(
      visibleIssueCodes(contract, wrongGeometry).has("visible-geometry"),
      `${numerator}/${denominator} must reject ${fillName} width=${corruptedWidth}.`
    );
  }
});

test("the pass-through oracle registry covers exactly the seven production HK pass-through topics", () => {
  assert.equal(HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS.length, 7);
  assert.equal(
    new Set(HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS.map(({ labId }) => labId)).size,
    7
  );
  assert.deepEqual(
    HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS.map(({ labId }) => labId),
    [...HK_PASS_THROUGH_LAB_IDS]
  );
  assert.deepEqual(
    validateHKVisualizationPassThroughMathOracleContracts(
      HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS
    ),
    []
  );
});

test("every oracle reconciles its production lesson contract and configured catalog model", () => {
  for (const contract of HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS) {
    const lesson = HK_VISUALIZATION_LESSON_CONTRACTS[
      contract.labId as HKPassThroughLabId
    ];
    const lab = visualizationLabByLabId.get(contract.labId);
    assert.ok(lab);
    assert.equal(lesson.kind, "pass-through");
    assert.equal(contract.kind, lesson.kind);
    assert.equal(contract.moduleId, lesson.moduleId);
    assert.equal(contract.topicId, lesson.topicId);
    assert.equal(contract.templateId, lab.templateId);
    assert.equal(contract.catalogVariant, lab.templateConfig.variant);
    assert.deepEqual(contract.lessonStateKeys, lesson.stateKeys);
    assert.deepEqual(contract.modeSelectors.map(({ modeId }) => modeId), lesson.modeIds);
    assert.deepEqual(contract.modeSelectors.map(({ selector }) => selector), lesson.selectors.modes);
    assert.deepEqual(contract.controlSelectors.map(({ controlId }) => controlId), lesson.controlIds);
    assert.deepEqual(contract.controlSelectors.map(({ selector }) => selector), lesson.selectors.controls);
    assert.equal(contract.rootSelector, lesson.selectors.workspace);
    assert.equal(contract.stateSelector, lesson.selectors.state);
    assert.equal(contract.reset.selector, lesson.selectors.reset);
    assert.deepEqual(contract.forbiddenClaims, lesson.lessonCopy.mustNotPromise);
  }
});

test("every oracle freezes topic-scoped model/state/formula/reset and named visible evidence", () => {
  for (const contract of HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS) {
    assert.match(contract.rootSelector, new RegExp(`data-viz-active-lab-id="${contract.labId}"`));
    assert.ok(contract.modelSelector.startsWith(contract.rootSelector));
    assert.ok(contract.stateSelector.startsWith(contract.rootSelector));
    assert.ok(contract.formulaSelector.startsWith(contract.rootSelector));
    assert.ok(contract.reset.selector.startsWith(contract.rootSelector));
    assert.equal(contract.reset.modeId, contract.modeSelectors[0]?.modeId ?? null);
    assert.deepEqual(Object.keys(contract.reset.state), contract.requiredStateKeys);
    assert.ok(contract.requiredStateKeys.every((key) => contract.allowedStateKeys.includes(key)));
    assert.ok(contract.namedVisibleMarks.length > 0);
    assert.ok(contract.namedVisibleMarks.every(({ name, selector }) => (
      name.trim().length > 0
      && selector.startsWith(contract.rootSelector)
      && selector.includes(`[data-viz-name="${name}"]`)
    )));
    assert.ok(contract.topicEvidenceSelectors.length > 0);
    assert.ok(contract.topicEvidenceSelectors.every((selector) => (
      selector.startsWith(contract.rootSelector)
      && selector.includes(`data-viz-configured-topic="${contract.labId}"`)
    )));
  }
});

test("P2 multiplication freezes rows times columns as an object total without area or repeated-addition evidence", () => {
  const contract = contractFor("p2-multiplication-foundations");
  assert.equal(contract.templateId, "array-area");
  assert.equal(contract.modelId, "equal-groups-array");
  assert.equal(contract.invariant.family, "equal-groups-object-total");
  assert.match(contract.invariant.statement, /rows.*columns.*object total/i);
  assert.deepEqual(contract.modeSelectors, []);
  assert.deepEqual(contract.requiredStateKeys, ["rows", "columns", "total"]);
  assert.deepEqual(contract.reset.state, { rows: 4, columns: 5, total: 20 });
  assert.deepEqual(
    contract.namedVisibleMarks.map(({ name }) => name),
    ["array outline", "array item", "equal groups total"]
  );
  assert.ok(contract.forbiddenClaims.some((claim) => /formal area.*repeated addition/i.test(claim)));
});

test("P3 fractions freezes the inclusive raw numerator domain and exact times-two rename", () => {
  const contract = contractFor("p3-fractions-intro");
  assert.equal(contract.templateId, "fraction-bar");
  assert.equal(contract.modelId, "fraction-equivalence");
  assert.equal(contract.invariant.family, "fraction-equivalence-inclusive-unit");
  assert.match(contract.invariant.statement, /0 ≤ n ≤ d/);
  assert.match(contract.invariant.statement, /2n\/2d/);
  assert.deepEqual(contract.dynamicControlDomains, [{
    atomicProjection: true,
    controlId: "comparison",
    controllerControlId: "value",
    inclusiveMaximum: true,
    maximumStateKey: "denominator",
    minimum: 0,
    noStaleValueResurrection: true,
    stateKey: "numerator"
  }]);
  assert.deepEqual(contract.requiredStateKeys, [
    "denominator",
    "numerator",
    "equivalentNumerator",
    "equivalentDenominator"
  ]);
  assert.deepEqual(contract.allowedStateKeys, [
    "denominator",
    "numerator",
    "equivalentNumerator",
    "equivalentDenominator",
    "value"
  ]);
  assert.deepEqual(contract.compatibilityAliases, [{
    aliasKey: "value",
    canonicalKeys: ["numerator", "denominator"],
    precedence: "formal-fields"
  }]);
  assert.deepEqual(
    contract.modeSelectors,
    ["fraction", "equivalent", "compare"].map((modeId) => ({
      modeId,
      selector: `${contract.rootSelector} [data-viz-mode-button][data-viz-mode-id="${modeId}"]`
    }))
  );
  assert.deepEqual(
    contract.namedVisibleMarks.find(({ name }) => name === "equivalent bar")?.visibleInModes,
    ["fraction", "equivalent", "compare"],
    "The production reference bar remains visible in fraction mode and must be audited there."
  );
  assert.deepEqual(contract.reset.state, {
    denominator: 6,
    numerator: 4,
    equivalentNumerator: 8,
    equivalentDenominator: 12
  });
});

test("the two distribution topics share a model without sharing topic identity or claiming hidden operations", () => {
  const statistics = contractFor("statistics-s1");
  const handling = contractFor("data-handling");
  assert.equal(statistics.templateId, "statistics-distribution");
  assert.equal(handling.templateId, statistics.templateId);
  assert.equal(statistics.modelId, "statistics-distribution");
  assert.equal(handling.modelId, statistics.modelId);
  assert.equal(statistics.sharedModelGroup, "hk-displayed-distribution-summary");
  assert.equal(handling.sharedModelGroup, statistics.sharedModelGroup);
  assert.notEqual(statistics.topicId, handling.topicId);
  assert.notEqual(statistics.rootSelector, handling.rootSelector);
  assert.notEqual(statistics.modelSelector, handling.modelSelector);
  assert.deepEqual(statistics.requiredStateKeys, ["mean", "spread"]);
  assert.deepEqual(handling.requiredStateKeys, ["mean", "spread"]);
  assert.deepEqual(statistics.modeSelectors, []);
  assert.deepEqual(handling.modeSelectors, []);
  assert.equal(statistics.reset.modeId, null);
  assert.equal(handling.reset.modeId, null);
  assert.ok(statistics.forbiddenClaims.some((claim) => /z-score/i.test(claim)));
  assert.ok(handling.forbiddenClaims.some((claim) => /raw-data operations/i.test(claim)));
  assert.ok(!statistics.allowedStateKeys.includes("observed"));
  assert.ok(!statistics.allowedStateKeys.includes("zScore"));
  assert.ok(!handling.allowedStateKeys.includes("rawData"));
});

test("advanced functions freezes one selected curve with its own scale and vertical shift", () => {
  const contract = contractFor("advanced-functions");
  assert.equal(contract.templateId, "function-family");
  assert.equal(contract.modelId, "function-properties");
  assert.equal(contract.invariant.family, "selected-function-curve");
  assert.deepEqual(contract.modeSelectors, []);
  assert.deepEqual(contract.requiredStateKeys, ["family", "scale", "verticalShift"]);
  assert.deepEqual(contract.reset.state, {
    family: "quadratic",
    scale: 5 / 6,
    verticalShift: 0
  });
  assert.ok(contract.namedVisibleMarks.some(({ name }) => name === "advanced primary curve"));
  assert.ok(!contract.namedVisibleMarks.some(({ name }) => name === "advanced comparison curve"));
  assert.match(contract.invariant.statement, /one selected curve.*scale.*vertical shift/i);
  assert.ok(contract.forbiddenClaims.some((claim) => /wave family/i.test(claim)));
});

test("differentiation and calculus freeze only the audited tangent and local-gradient evidence", () => {
  const differentiation = contractFor("differentiation-intro");
  const calculus = contractFor("calculus");
  assert.equal(differentiation.templateId, "calculus-rate-area");
  assert.equal(calculus.templateId, differentiation.templateId);
  assert.equal(differentiation.modelId, "derivative-rate-area");
  assert.equal(calculus.modelId, differentiation.modelId);
  assert.equal(differentiation.invariant.family, "tangent-local-gradient");
  assert.equal(calculus.invariant.family, "tangent-local-gradient");
  for (const contract of [differentiation, calculus]) {
    assert.deepEqual(contract.modeSelectors, []);
    assert.equal(contract.reset.modeId, null);
    assert.deepEqual(contract.requiredStateKeys, ["curvature", "probeX", "slope"]);
    assert.deepEqual(contract.reset.state, { curvature: 0.5, probeX: -0.8, slope: -0.4 });
    assert.ok(contract.namedVisibleMarks.some(({ name }) => name === "tangent line"));
    assert.ok(!contract.namedVisibleMarks.some(({ name }) => /secant|area strip|bound/i.test(name)));
    assert.ok(contract.forbiddenClaims.some((claim) => /secant.*accumulated area/i.test(claim)));
  }
});

test("validator rejects a missing pass-through topic", () => {
  assertRejected(
    HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS.slice(1),
    "missing-topic"
  );
});

test("validator rejects a duplicate pass-through topic", () => {
  assertRejected(
    [
      ...HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS,
      HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS[0]
    ],
    "duplicate-topic"
  );
});

test("validator rejects an extra topic id", () => {
  const [first, ...rest] = HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS;
  assertRejected(
    [{ ...first, labId: "outside-hk-pass-through-registry" }, ...rest],
    "extra-topic"
  );
});

test("validator rejects production lesson-contract drift", () => {
  assertRejected(
    replaceContract("advanced-functions", (contract) => ({
      ...contract,
      modeSelectors: [{
        modeId: "unproven-comparison",
        selector: `${contract.rootSelector} [data-viz-mode-button][data-viz-mode-id="unproven-comparison"]`
      }]
    })),
    "lesson-contract-drift"
  );
});

test("validator rejects a phantom mathematical state key", () => {
  assertRejected(
    replaceContract("statistics-s1", (contract) => ({
      ...contract,
      allowedStateKeys: [...contract.allowedStateKeys, "zScore"]
    })),
    "phantom-state-key"
  );
});

test("validator rejects generic marks without named mathematical evidence", () => {
  assertRejected(
    replaceContract("p2-multiplication-foundations", (contract) => ({
      ...contract,
      namedVisibleMarks: [{
        name: "",
        selector: `${contract.rootSelector} [data-viz-mark]`,
        visibleInModes: contract.modeSelectors.map(({ modeId }) => modeId)
      }]
    })),
    "generic-mark-only-evidence"
  );
});

test("validator rejects mixed topic identity inside a shared configured model", () => {
  const statistics = contractFor("statistics-s1");
  assertRejected(
    replaceContract("data-handling", (contract) => ({
      ...contract,
      topicId: statistics.topicId,
      modelSelector: statistics.modelSelector
    })),
    "shared-model-topic-mix"
  );
});

test("validator rejects a topic with no exact topic-specific evidence selector", () => {
  assertRejected(
    replaceContract("calculus", (contract) => ({
      ...contract,
      topicEvidenceSelectors: []
    })),
    "missing-topic-specific-evidence"
  );
});

test("oracle reset math is generated by the same explicit per-topic control reset plans", () => {
  const familyByTopic = {
    "p2-multiplication-foundations": "equal-groups-array",
    "p3-fractions-intro": "fraction-equivalence",
    "statistics-s1": "statistics-distribution",
    "data-handling": "statistics-distribution",
    "advanced-functions": "function-properties",
    "differentiation-intro": "derivative-rate-area",
    calculus: "derivative-rate-area"
  } as const;
  for (const contract of HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS) {
    const semanticContract = getConfiguredVisualizationSemanticControlContract(
      familyByTopic[contract.labId as keyof typeof familyByTopic],
      contract.labId
    );
    const reset = getConfiguredVisualizationSemanticResetPlan(semanticContract, contract.labId);
    assert.deepEqual(reset, configuredVisualizationPassThroughResetPlans[
      contract.labId as keyof typeof configuredVisualizationPassThroughResetPlans
    ]);
    const state = contract.labId === "p2-multiplication-foundations"
      ? { columns: reset.comparison, rows: reset.value, total: reset.value * reset.comparison }
      : contract.labId === "p3-fractions-intro"
        ? {
            denominator: reset.value + 1,
            equivalentDenominator: (reset.value + 1) * 2,
            equivalentNumerator: reset.comparison * 2,
            numerator: reset.comparison
          }
        : contract.labId === "statistics-s1" || contract.labId === "data-handling"
          ? { mean: reset.value, spread: reset.comparison }
          : contract.labId === "advanced-functions"
            ? { family: "quadratic", scale: reset.value / 6, verticalShift: reset.comparison - 5 }
            : {
                curvature: reset.value / 10,
                probeX: (reset.comparison - 5) / 1.25,
                slope: (reset.value / 10) * ((reset.comparison - 5) / 1.25)
              };
    assert.deepEqual(state, contract.reset.state, contract.labId);
  }
});

test("distribution and advanced oracle contracts freeze viewport bounds and ticks independently of renderer output", () => {
  const expected = {
    "statistics-s1": {
      id: "hk-distribution-summary-fixed-v1",
      viewport: { xMaximum: 22, xMinimum: -12, yMaximum: 1.1, yMinimum: 0 },
      xTicks: [-10, 0, 10, 20],
      yTicks: [0, 0.5, 1]
    },
    "data-handling": {
      id: "hk-distribution-summary-fixed-v1",
      viewport: { xMaximum: 22, xMinimum: -12, yMaximum: 1.1, yMinimum: 0 },
      xTicks: [-10, 0, 10, 20],
      yTicks: [0, 0.5, 1]
    },
    "advanced-functions": {
      id: "hk-selected-quadratic-fixed-v1",
      viewport: { xMaximum: 3, xMinimum: -2.4, yMaximum: 21, yMinimum: -6 },
      xTicks: [-2, 0, 2],
      yTicks: [-5, 0, 5, 10, 15, 20]
    }
  } as const;
  for (const [labId, plan] of Object.entries(expected)) {
    const contract = contractFor(labId) as HKVisualizationPassThroughMathOracleContract & {
      fixedViewport?: unknown;
    };
    assert.deepEqual(contract.fixedViewport, plan, labId);
    assert.ok(contract.visibleMathMarks.some(({ name }) => name === "semantic fixed viewport"));
    assert.ok(contract.visibleMathMarks.some(({ name }) => name === "semantic x tick"));
    assert.ok(contract.visibleMathMarks.some(({ name }) => name === "semantic y tick"));
  }
});

test("pure cross-state oracle rejects unchanged painted geometry after mean, spread, or a changes", () => {
  const audit = (passThroughOracleModule as unknown as Record<string, unknown>)[
    "auditHkVisualizationPassThroughCrossStatePaintedGeometry"
  ];
  assert.equal(typeof audit, "function");
  const auditPair = audit as (
    contract: HKVisualizationPassThroughMathOracleContract,
    before: VisibleObservation,
    after: VisibleObservation
  ) => readonly { code: string }[];
  const pairs = [
    {
      afterInput: { comparison: 4, family: "statistics-distribution", mode: 0, value: 0, variant: "statistics-s1" } as const,
      afterState: { mean: 0, spread: 4 },
      beforeInput: { comparison: 1, family: "statistics-distribution", mode: 0, value: 0, variant: "statistics-s1" } as const,
      beforeState: { mean: 0, spread: 1 },
      labId: "statistics-s1"
    },
    {
      afterInput: { comparison: 4, family: "statistics-distribution", mode: 0, value: 0, variant: "data-handling" } as const,
      afterState: { mean: 0, spread: 4 },
      beforeInput: { comparison: 1, family: "statistics-distribution", mode: 0, value: 0, variant: "data-handling" } as const,
      beforeState: { mean: 0, spread: 1 },
      labId: "data-handling"
    },
    {
      afterInput: { comparison: 5, family: "function-properties", mode: 0, value: 10, variant: "advanced-functions" } as const,
      afterState: { family: "quadratic", scale: 10 / 6, verticalShift: 0 },
      beforeInput: { comparison: 5, family: "function-properties", mode: 0, value: 1, variant: "advanced-functions" } as const,
      beforeState: { family: "quadratic", scale: 1 / 6, verticalShift: 0 },
      labId: "advanced-functions"
    }
  ] as const;
  for (const pair of pairs) {
    const contract = contractFor(pair.labId);
    const before = observeMarkup(
      contract,
      pair.beforeState,
      renderSecondaryPassThrough(pair.beforeInput)
    );
    const after = observeMarkup(
      contract,
      pair.afterState,
      renderSecondaryPassThrough(pair.afterInput)
    );
    assert.deepEqual(auditPair(contract, before, after), [], pair.labId);
    const curveName = pair.labId === "advanced-functions"
      ? "advanced primary curve"
      : "distribution summary curve";
    const corrupted: VisibleObservation = {
      ...after,
      marks: {
        ...after.marks,
        [curveName]: before.marks[curveName]
      }
    };
    assert.ok(
      auditPair(contract, before, corrupted).some(({ code }) => code === "cross-state-painted-geometry"),
      pair.labId
    );
  }
});

test("pure visible-token oracle rejects English, Traditional Chinese, and Simplified Chinese corruption", () => {
  const expected = (passThroughOracleModule as unknown as Record<string, unknown>)[
    "expectedHkVisualizationPassThroughVisibleNumericText"
  ];
  assert.equal(typeof expected, "function");
  const expectedText = expected as (
    contract: HKVisualizationPassThroughMathOracleContract,
    state: Readonly<Record<string, unknown>>,
    locale: "en" | "zh" | "zh-Hans"
  ) => { check: string; formula: string; readout: string } | null;
  const contract = contractFor("statistics-s1");
  const state = { mean: 5, spread: 2 };
  assert.deepEqual(expectedText(contract, state, "en"), {
    check: "symmetric about μ=5 · height(μ−spread)=height(μ+spread)",
    formula: "center μ=5 · spread=2",
    readout: "mean=5 · spread=2 · symmetric distribution"
  });
  assert.deepEqual(expectedText(contract, state, "zh"), {
    check: "關於 μ=5 對稱 · 高度(μ−離散程度)=高度(μ+離散程度)",
    formula: "中心 μ=5 · 離散程度=2",
    readout: "平均數=5 · 離散程度=2 · 對稱分佈"
  });
  assert.deepEqual(expectedText(contract, state, "zh-Hans"), {
    check: "关于 μ=5 对称 · 高度(μ−离散程度)=高度(μ+离散程度)",
    formula: "中心 μ=5 · 离散程度=2",
    readout: "平均数=5 · 离散程度=2 · 对称分布"
  });

  const advanced = contractFor("advanced-functions");
  const advancedState = { family: "quadratic", scale: 5 / 6, verticalShift: 0 };
  const calculus = contractFor("calculus");
  const calculusState = { curvature: 0.5, probeX: -0.8, slope: -0.4 };
  const localized = {
    en: {
      advancedCheck: "selected quadratic · a=0.83 · k=0",
      advancedReadout: "quadratic · a=0.83 · k=0",
      calculus: "x₀=−0.8 · tangent slope=−0.4"
    },
    zh: {
      advancedCheck: "已選二次函數 · a=0.83 · k=0",
      advancedReadout: "二次函數 · a=0.83 · k=0",
      calculus: "x₀=−0.8 · 切線斜率=−0.4"
    },
    "zh-Hans": {
      advancedCheck: "已选二次函数 · a=0.83 · k=0",
      advancedReadout: "二次函数 · a=0.83 · k=0",
      calculus: "x₀=−0.8 · 切线斜率=−0.4"
    }
  } as const;
  for (const locale of ["en", "zh", "zh-Hans"] as const) {
    assert.deepEqual(expectedText(advanced, advancedState, locale), {
      check: localized[locale].advancedCheck,
      formula: "y=0.83x² + 0",
      readout: localized[locale].advancedReadout
    });
    assert.deepEqual(expectedText(calculus, calculusState, locale), {
      check: localized[locale].calculus,
      formula: "f(x)=0.5·a·x²+0.35, a=0.5 · f′(x)=a·x",
      readout: localized[locale].calculus
    });
  }

  for (const locale of ["en", "zh", "zh-Hans"] as const) {
    const markup = renderToStaticMarkup(createElement("svg", { viewBox: "0 0 640 360" }, createElement(
      ConfiguredSemanticSecondaryMarks,
      {
        accent: "#06b6d4",
        comparison: 2,
        family: "statistics-distribution",
        mode: 0,
        strings: {
          checkLabel: locale === "en" ? "Check" : locale === "zh" ? "驗證" : "验证",
          formulaLabel: locale === "en" ? "Formula" : "公式",
          locale
        },
        value: 5,
        variant: "statistics-s1",
        vizTheme: visibleTheme
      }
    )));
    const valid = observeMarkup(contract, state, markup);
    assert.deepEqual(
      passThroughOracleModule.auditHkVisualizationPassThroughVisibleMathObservation(contract, valid),
      [],
      locale
    );
    const readout = valid.marks["distribution summary readout"]?.[0];
    assert.ok(readout);
    const corrupted: VisibleObservation = {
      ...valid,
      marks: {
        ...valid.marks,
        "distribution summary readout": [{
          ...readout,
          attributes: {
            ...readout.attributes,
            "data-viz-visible-readout": "mean=999",
            "data-viz-token-mean": "999"
          },
          text: "mean=999"
        }]
      }
    };
    assert.ok(
      visibleIssueCodes(contract, corrupted).has("visible-state-mismatch"),
      `corrupt ${locale} readout must fail closed`
    );
  }
});
