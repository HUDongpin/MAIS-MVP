import {
  HK_PASS_THROUGH_LAB_IDS,
  type HKPassThroughLabId
} from "../../components/visualizations/hk/hkVisualizationLabRegistry";
import { HK_VISUALIZATION_LESSON_CONTRACTS } from "../../components/visualizations/hk/hkVisualizationLessonContracts";
import { visualizationLabByLabId } from "../../data/visualizationLabs";

export const HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_FAMILIES = Object.freeze([
  "equal-groups-object-total",
  "fraction-equivalence-inclusive-unit",
  "displayed-distribution-summary",
  "selected-function-curve",
  "tangent-local-gradient"
] as const);

export type HKVisualizationPassThroughMathOracleFamily =
  (typeof HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_FAMILIES)[number];

export type HKVisualizationPassThroughMathOracleStateValue =
  | boolean
  | number
  | string
  | readonly boolean[]
  | readonly number[]
  | readonly string[];

export type HKVisualizationPassThroughMathOracleResetState = Readonly<
  Record<string, HKVisualizationPassThroughMathOracleStateValue>
>;

export type HKVisualizationPassThroughMathOracleSelector = Readonly<{
  selector: string;
}>;

export type HKVisualizationPassThroughMathOracleModeSelector = Readonly<{
  modeId: string;
  selector: string;
}>;

export type HKVisualizationPassThroughMathOracleControlSelector = Readonly<{
  controlId: string;
  selector: string;
}>;

export type HKVisualizationPassThroughMathOracleNamedMark = Readonly<{
  name: string;
  selector: string;
  visibleInModes: readonly string[];
}>;

export type HKVisualizationPassThroughVisibleMathMarkContract = Readonly<{
  cardinality:
    | "equivalent-partitions"
    | "exactly-one"
    | "exactly-three"
    | "fixed-x-ticks"
    | "fixed-y-ticks"
    | "state-total"
    | "whole-partitions";
  name: string;
  requiredAttributes: readonly string[];
  selector: string;
}>;

export type HKVisualizationPassThroughVisibleMathMarkObservation = Readonly<{
  attributes: Readonly<Record<string, string | null>>;
  tagName: string;
  text: string;
}>;

export type HKVisualizationPassThroughRawRendererStateContract = Readonly<{
  attribute: "data-viz-math-state" | "data-viz-state-json";
  broadOwnerSelector: string;
  expectedFamily: string;
  expectedKind: string;
  identitySelector: string;
  selector: string;
}>;

export type HKVisualizationPassThroughRawRendererStateObservation = Readonly<{
  attribute: "data-viz-math-state" | "data-viz-state-json";
  selectorEvidence: Readonly<{
    count: number;
    learnerVisibleCount: number;
  }>;
  serializedState: string | null;
}>;

export type HKVisualizationPassThroughRawRendererStateIssue = Readonly<{
  code:
    | "raw-identity"
    | "raw-json"
    | "raw-selector"
    | "raw-state-mismatch";
  message: string;
}>;

export type HKVisualizationPassThroughVisibleMathObservation = Readonly<{
  formulaText?: string;
  labId: string;
  marks: Readonly<
    Record<string, readonly HKVisualizationPassThroughVisibleMathMarkObservation[]>
  >;
  rawRendererState: HKVisualizationPassThroughRawRendererStateObservation;
  state: Readonly<Record<string, unknown>>;
}>;

export type HKVisualizationPassThroughVisibleMathIssue = Readonly<{
  code:
    | "visible-attribute"
    | "visible-formula"
    | "visible-geometry"
    | "visible-mark-count"
    | "visible-raw-mismatch"
    | "visible-state-mismatch";
  message: string;
}>;

export type HKVisualizationPassThroughMathOracleCompatibilityAlias = Readonly<{
  aliasKey: string;
  canonicalKeys: readonly string[];
  precedence: "formal-fields";
}>;

export type HKVisualizationPassThroughMathOracleDynamicControlDomain = Readonly<{
  atomicProjection: true;
  controlId: string;
  controllerControlId: string;
  inclusiveMaximum: true;
  maximumStateKey: string;
  minimum: number;
  noStaleValueResurrection: true;
  stateKey: string;
}>;

export type HKVisualizationPassThroughFixedViewportPlan = Readonly<{
  id: string;
  viewport: Readonly<{
    xMaximum: number;
    xMinimum: number;
    yMaximum: number;
    yMinimum: number;
  }>;
  xTicks: readonly number[];
  yTicks: readonly number[];
}>;

export type HKVisualizationPassThroughMathOracleContract = Readonly<{
  labId: string;
  topicId: string;
  moduleId: "configured-visualization-lab";
  kind: "pass-through";
  catalogVariant: string;
  templateId: string;
  modelId: string;
  sharedModelGroup: string | null;
  invariant: Readonly<{
    family: string;
    statement: string;
  }>;
  rootSelector: string;
  modelSelector: string;
  stateSelector: string;
  formulaSelector: string;
  reset: Readonly<{
    selector: string;
    modeId: string | null;
    state: HKVisualizationPassThroughMathOracleResetState;
  }>;
  modeSelectors: readonly HKVisualizationPassThroughMathOracleModeSelector[];
  controlSelectors: readonly HKVisualizationPassThroughMathOracleControlSelector[];
  lessonStateKeys: readonly string[];
  requiredStateKeys: readonly string[];
  allowedStateKeys: readonly string[];
  compatibilityAliases: readonly HKVisualizationPassThroughMathOracleCompatibilityAlias[];
  dynamicControlDomains: readonly HKVisualizationPassThroughMathOracleDynamicControlDomain[];
  fixedViewport: HKVisualizationPassThroughFixedViewportPlan | null;
  namedVisibleMarks: readonly HKVisualizationPassThroughMathOracleNamedMark[];
  rawRendererState: HKVisualizationPassThroughRawRendererStateContract;
  visibleMathMarks: readonly HKVisualizationPassThroughVisibleMathMarkContract[];
  topicEvidenceSelectors: readonly string[];
  forbiddenClaims: readonly string[];
}>;

type NamedMarkSpec = Readonly<{
  name: string;
  visibleInModes?: readonly string[];
}>;

type VisibleMathMarkSpec = Readonly<{
  cardinality?: HKVisualizationPassThroughVisibleMathMarkContract["cardinality"];
  name: string;
  requiredAttributes: readonly string[];
}>;

type CompatibilityAliasSpec = Readonly<{
  aliasKey: string;
  canonicalKeys: readonly string[];
}>;

type DynamicControlDomainSpec = HKVisualizationPassThroughMathOracleDynamicControlDomain;

type ContractSpec = Readonly<{
  labId: HKPassThroughLabId;
  templateId: string;
  modelId: string;
  sharedModelGroup?: string;
  invariantFamily: HKVisualizationPassThroughMathOracleFamily;
  invariantStatement: string;
  modeIds: readonly string[];
  controlIds: readonly string[];
  lessonStateKeys: readonly string[];
  requiredStateKeys: readonly string[];
  allowedStateKeys: readonly string[];
  compatibilityAliases?: readonly CompatibilityAliasSpec[];
  dynamicControlDomains?: readonly DynamicControlDomainSpec[];
  fixedViewport?: HKVisualizationPassThroughFixedViewportPlan;
  resetState: HKVisualizationPassThroughMathOracleResetState;
  namedMarks: readonly NamedMarkSpec[];
  visibleMathMarks: readonly VisibleMathMarkSpec[];
  forbiddenClaims: readonly string[];
  formulaSurface: "primary" | "secondary";
}>;

const rootFor = (labId: string) => `[data-viz-active-lab-id="${labId}"]`;

const modeSelectorFor = (rootSelector: string, modeId: string) => (
  `${rootSelector} [data-viz-mode-button][data-viz-mode-id="${modeId}"]`
);

const controlSelectorFor = (rootSelector: string, controlId: string) => (
  `${rootSelector} [data-viz-parameter="${controlId}"]`
);

const resetSelectorFor = (rootSelector: string, labId: string) => (
  `${rootSelector} [data-viz-reset-model][data-viz-reset-module-id="configured-visualization-lab"][data-viz-reset-topic-id="${labId}"]`
);

const modelSelectorFor = (rootSelector: string, labId: string, templateId: string) => (
  `${rootSelector} [data-viz-configured-model="${templateId}"][data-viz-configured-topic="${labId}"]`
);

const formulaSelectorFor = (
  rootSelector: string,
  labId: string,
  formulaSurface: ContractSpec["formulaSurface"]
) => formulaSurface === "primary"
  ? `${rootSelector} [data-viz-name="configured semantic primary marks"][data-viz-semantic-variant="${labId}"][data-viz-formula]`
  : `${rootSelector} [data-viz-name="configured semantic secondary model"][data-viz-semantic-variant="${labId}"] [data-viz-name="semantic formula"][data-viz-visible-formula]`;

const fractionDynamicDomain = Object.freeze({
  atomicProjection: true,
  controlId: "comparison",
  controllerControlId: "value",
  inclusiveMaximum: true,
  maximumStateKey: "denominator",
  minimum: 0,
  noStaleValueResurrection: true,
  stateKey: "numerator"
} as const satisfies DynamicControlDomainSpec);

const tangentReset = Object.freeze({
  curvature: 0.5,
  probeX: -0.8,
  slope: -0.4
});

const DISTRIBUTION_FIXED_VIEWPORT = Object.freeze({
  id: "hk-distribution-summary-fixed-v1",
  viewport: Object.freeze({ xMaximum: 22, xMinimum: -12, yMaximum: 1.1, yMinimum: 0 }),
  xTicks: Object.freeze([-10, 0, 10, 20]),
  yTicks: Object.freeze([0, 0.5, 1])
} as const satisfies HKVisualizationPassThroughFixedViewportPlan);

const ADVANCED_FIXED_VIEWPORT = Object.freeze({
  id: "hk-selected-quadratic-fixed-v1",
  viewport: Object.freeze({ xMaximum: 3, xMinimum: -2.4, yMaximum: 21, yMinimum: -6 }),
  xTicks: Object.freeze([-2, 0, 2]),
  yTicks: Object.freeze([-5, 0, 5, 10, 15, 20])
} as const satisfies HKVisualizationPassThroughFixedViewportPlan);

const CONTRACT_SPECS = Object.freeze([
  {
    labId: "p2-multiplication-foundations",
    templateId: "array-area",
    modelId: "equal-groups-array",
    invariantFamily: "equal-groups-object-total",
    invariantStatement: "For every visible state, rows × columns = the countable object total.",
    modeIds: [],
    controlIds: ["value", "comparison"],
    lessonStateKeys: ["rows", "columns", "total"],
    requiredStateKeys: ["rows", "columns", "total"],
    allowedStateKeys: ["rows", "columns", "total"],
    resetState: { rows: 4, columns: 5, total: 20 },
    namedMarks: [
      { name: "array outline" },
      { name: "array item" },
      { name: "equal groups total" }
    ],
    visibleMathMarks: [
      { name: "configured semantic primary marks", requiredAttributes: ["data-viz-formula"] },
      { name: "array outline", requiredAttributes: ["data-viz-rows", "data-viz-columns", "data-viz-object-total", "x", "y", "width", "height"] },
      { cardinality: "state-total", name: "array item", requiredAttributes: ["data-viz-row", "data-viz-column", "cx", "cy", "r"] },
      { name: "equal groups total", requiredAttributes: ["data-viz-total", "x", "y"] }
    ],
    forbiddenClaims: ["formal area, square units, or repeated addition", "division with remainder"],
    formulaSurface: "primary"
  },
  {
    labId: "p3-fractions-intro",
    templateId: "fraction-bar",
    modelId: "fraction-equivalence",
    invariantFamily: "fraction-equivalence-inclusive-unit",
    invariantStatement: "For raw 0 ≤ n ≤ d, n/d ≡ 2n/2d, including 0/d and d/d = 1.",
    modeIds: ["fraction", "equivalent", "compare"],
    controlIds: ["value", "comparison"],
    lessonStateKeys: ["denominator", "numerator", "equivalentNumerator", "equivalentDenominator"],
    requiredStateKeys: ["denominator", "numerator", "equivalentNumerator", "equivalentDenominator"],
    allowedStateKeys: ["denominator", "numerator", "equivalentNumerator", "equivalentDenominator", "value"],
    compatibilityAliases: [{
      aliasKey: "value",
      canonicalKeys: ["numerator", "denominator"]
    }],
    dynamicControlDomains: [fractionDynamicDomain],
    resetState: {
      denominator: 6,
      numerator: 4,
      equivalentNumerator: 8,
      equivalentDenominator: 12
    },
    namedMarks: [
      { name: "whole bar" },
      { name: "equivalent bar" },
      { name: "whole bar fill" },
      { name: "equivalent bar fill" },
      { name: "semantic formula" }
    ],
    visibleMathMarks: [
      { name: "configured semantic primary marks", requiredAttributes: ["data-viz-formula"] },
      { name: "whole bar", requiredAttributes: ["data-viz-numerator", "data-viz-denominator", "data-viz-value", "data-viz-partition-count"] },
      { name: "equivalent bar", requiredAttributes: ["data-viz-numerator", "data-viz-denominator", "data-viz-value", "data-viz-partition-count"] },
      { name: "whole bar background", requiredAttributes: ["data-viz-bar-width", "data-viz-partition-count", "x", "y", "width", "height"] },
      { name: "equivalent bar background", requiredAttributes: ["data-viz-bar-width", "data-viz-partition-count", "x", "y", "width", "height"] },
      { cardinality: "whole-partitions", name: "whole bar partition", requiredAttributes: ["data-viz-partition-index", "data-viz-partition-count", "x1", "x2", "y1", "y2"] },
      { cardinality: "equivalent-partitions", name: "equivalent bar partition", requiredAttributes: ["data-viz-partition-index", "data-viz-partition-count", "x1", "x2", "y1", "y2"] },
      { name: "whole bar fill", requiredAttributes: ["data-viz-numerator", "data-viz-denominator", "data-viz-value", "data-viz-bar-width", "data-viz-partition-count", "x", "y", "width", "height"] },
      { name: "equivalent bar fill", requiredAttributes: ["data-viz-numerator", "data-viz-denominator", "data-viz-value", "data-viz-bar-width", "data-viz-partition-count", "x", "y", "width", "height"] }
    ],
    forbiddenClaims: ["unlike-denominator operations"],
    formulaSurface: "primary"
  },
  {
    labId: "statistics-s1",
    templateId: "statistics-distribution",
    modelId: "statistics-distribution",
    sharedModelGroup: "hk-displayed-distribution-summary",
    invariantFamily: "displayed-distribution-summary",
    invariantStatement: "The displayed curve, mean marker, and spread band use the same mean and spread.",
    modeIds: [],
    controlIds: ["value", "comparison"],
    lessonStateKeys: ["mean", "spread"],
    requiredStateKeys: ["mean", "spread"],
    allowedStateKeys: ["mean", "spread"],
    fixedViewport: DISTRIBUTION_FIXED_VIEWPORT,
    resetState: { mean: 5, spread: 2 },
    namedMarks: [
      { name: "distribution summary curve" },
      { name: "distribution mean" },
      { name: "distribution spread band" },
      { name: "distribution left spread marker" },
      { name: "distribution right spread marker" },
      { name: "distribution summary readout" },
      { name: "semantic formula" },
      { name: "semantic invariant check" },
      { name: "semantic fixed viewport" },
      { name: "semantic x tick" },
      { name: "semantic y tick" }
    ],
    visibleMathMarks: [
      { name: "semantic formula", requiredAttributes: ["data-viz-visible-formula", "data-viz-visible-locale"] },
      { name: "semantic invariant check", requiredAttributes: ["data-viz-visible-check", "data-viz-visible-locale"] },
      { name: "semantic fixed viewport", requiredAttributes: ["data-viz-viewport-id", "data-viz-domain-x-min", "data-viz-domain-x-max", "data-viz-domain-y-min", "data-viz-domain-y-max", "data-viz-x-ticks", "data-viz-y-ticks", "x", "y", "width", "height"] },
      { cardinality: "fixed-x-ticks", name: "semantic x tick", requiredAttributes: ["data-viz-tick-axis", "data-viz-tick-value", "x1", "x2", "y1", "y2"] },
      { cardinality: "fixed-y-ticks", name: "semantic y tick", requiredAttributes: ["data-viz-tick-axis", "data-viz-tick-value", "x1", "x2", "y1", "y2"] },
      { name: "distribution summary curve", requiredAttributes: ["data-viz-mean", "data-viz-spread", "data-viz-sample-count", "data-viz-left-spread-x", "data-viz-left-spread-y", "data-viz-right-spread-x", "data-viz-right-spread-y", "d"] },
      { name: "distribution mean", requiredAttributes: ["data-viz-mean", "data-viz-series-index", "x1", "x2", "y1", "y2"] },
      { name: "distribution spread band", requiredAttributes: ["data-viz-mean", "data-viz-spread", "data-viz-left-value", "data-viz-right-value", "data-viz-left-x", "data-viz-right-x", "x", "y", "width", "height"] },
      { name: "distribution left spread marker", requiredAttributes: ["data-viz-series-index", "data-viz-x-value", "data-viz-density", "data-viz-series-y", "data-viz-mapped-x", "data-viz-mapped-y", "cx", "cy", "r"] },
      { name: "distribution right spread marker", requiredAttributes: ["data-viz-series-index", "data-viz-x-value", "data-viz-density", "data-viz-series-y", "data-viz-mapped-x", "data-viz-mapped-y", "cx", "cy", "r"] },
      { name: "distribution summary readout", requiredAttributes: ["data-viz-mean", "data-viz-spread", "data-viz-visible-locale", "data-viz-visible-readout", "data-viz-token-mean", "data-viz-token-spread", "x", "y"] }
    ],
    forbiddenClaims: ["an observed-value z-score"],
    formulaSurface: "secondary"
  },
  {
    labId: "data-handling",
    templateId: "statistics-distribution",
    modelId: "statistics-distribution",
    sharedModelGroup: "hk-displayed-distribution-summary",
    invariantFamily: "displayed-distribution-summary",
    invariantStatement: "The displayed curve, mean marker, and spread band use the same mean and spread.",
    modeIds: [],
    controlIds: ["value", "comparison"],
    lessonStateKeys: ["mean", "spread"],
    requiredStateKeys: ["mean", "spread"],
    allowedStateKeys: ["mean", "spread"],
    fixedViewport: DISTRIBUTION_FIXED_VIEWPORT,
    resetState: { mean: 5, spread: 2 },
    namedMarks: [
      { name: "distribution summary curve" },
      { name: "distribution mean" },
      { name: "distribution spread band" },
      { name: "distribution left spread marker" },
      { name: "distribution right spread marker" },
      { name: "distribution summary readout" },
      { name: "semantic formula" },
      { name: "semantic invariant check" },
      { name: "semantic fixed viewport" },
      { name: "semantic x tick" },
      { name: "semantic y tick" }
    ],
    visibleMathMarks: [
      { name: "semantic formula", requiredAttributes: ["data-viz-visible-formula", "data-viz-visible-locale"] },
      { name: "semantic invariant check", requiredAttributes: ["data-viz-visible-check", "data-viz-visible-locale"] },
      { name: "semantic fixed viewport", requiredAttributes: ["data-viz-viewport-id", "data-viz-domain-x-min", "data-viz-domain-x-max", "data-viz-domain-y-min", "data-viz-domain-y-max", "data-viz-x-ticks", "data-viz-y-ticks", "x", "y", "width", "height"] },
      { cardinality: "fixed-x-ticks", name: "semantic x tick", requiredAttributes: ["data-viz-tick-axis", "data-viz-tick-value", "x1", "x2", "y1", "y2"] },
      { cardinality: "fixed-y-ticks", name: "semantic y tick", requiredAttributes: ["data-viz-tick-axis", "data-viz-tick-value", "x1", "x2", "y1", "y2"] },
      { name: "distribution summary curve", requiredAttributes: ["data-viz-mean", "data-viz-spread", "data-viz-sample-count", "data-viz-left-spread-x", "data-viz-left-spread-y", "data-viz-right-spread-x", "data-viz-right-spread-y", "d"] },
      { name: "distribution mean", requiredAttributes: ["data-viz-mean", "data-viz-series-index", "x1", "x2", "y1", "y2"] },
      { name: "distribution spread band", requiredAttributes: ["data-viz-mean", "data-viz-spread", "data-viz-left-value", "data-viz-right-value", "data-viz-left-x", "data-viz-right-x", "x", "y", "width", "height"] },
      { name: "distribution left spread marker", requiredAttributes: ["data-viz-series-index", "data-viz-x-value", "data-viz-density", "data-viz-series-y", "data-viz-mapped-x", "data-viz-mapped-y", "cx", "cy", "r"] },
      { name: "distribution right spread marker", requiredAttributes: ["data-viz-series-index", "data-viz-x-value", "data-viz-density", "data-viz-series-y", "data-viz-mapped-x", "data-viz-mapped-y", "cx", "cy", "r"] },
      { name: "distribution summary readout", requiredAttributes: ["data-viz-mean", "data-viz-spread", "data-viz-visible-locale", "data-viz-visible-readout", "data-viz-token-mean", "data-viz-token-spread", "x", "y"] }
    ],
    forbiddenClaims: ["raw-data operations not visible in the model"],
    formulaSurface: "secondary"
  },
  {
    labId: "advanced-functions",
    templateId: "function-family",
    modelId: "function-properties",
    invariantFamily: "selected-function-curve",
    invariantStatement: "The one selected curve, its formula, scale, and vertical shift describe the same function.",
    modeIds: [],
    controlIds: ["value", "comparison"],
    lessonStateKeys: ["family", "scale", "verticalShift"],
    requiredStateKeys: ["family", "scale", "verticalShift"],
    allowedStateKeys: ["family", "scale", "verticalShift"],
    fixedViewport: ADVANCED_FIXED_VIEWPORT,
    resetState: {
      family: "quadratic",
      scale: 5 / 6,
      verticalShift: 0
    },
    namedMarks: [
      { name: "advanced primary curve" },
      { name: "advanced curve sample" },
      { name: "advanced function readout" },
      { name: "semantic formula" },
      { name: "semantic invariant check" },
      { name: "semantic fixed viewport" },
      { name: "semantic x tick" },
      { name: "semantic y tick" }
    ],
    visibleMathMarks: [
      { name: "semantic formula", requiredAttributes: ["data-viz-visible-formula", "data-viz-visible-locale"] },
      { name: "semantic invariant check", requiredAttributes: ["data-viz-visible-check", "data-viz-visible-locale"] },
      { name: "semantic fixed viewport", requiredAttributes: ["data-viz-viewport-id", "data-viz-domain-x-min", "data-viz-domain-x-max", "data-viz-domain-y-min", "data-viz-domain-y-max", "data-viz-x-ticks", "data-viz-y-ticks", "x", "y", "width", "height"] },
      { cardinality: "fixed-x-ticks", name: "semantic x tick", requiredAttributes: ["data-viz-tick-axis", "data-viz-tick-value", "x1", "x2", "y1", "y2"] },
      { cardinality: "fixed-y-ticks", name: "semantic y tick", requiredAttributes: ["data-viz-tick-axis", "data-viz-tick-value", "x1", "x2", "y1", "y2"] },
      { name: "advanced primary curve", requiredAttributes: ["data-viz-function-family", "data-viz-scale-parameter", "data-viz-vertical-shift", "data-viz-formula", "data-viz-sample-count", "data-viz-domain-min", "data-viz-domain-max", "data-viz-sample-start-x", "data-viz-sample-start-y", "data-viz-sample-middle-x", "data-viz-sample-middle-y", "data-viz-sample-end-x", "data-viz-sample-end-y", "d"] },
      { cardinality: "exactly-three", name: "advanced curve sample", requiredAttributes: ["data-viz-sample-index", "data-viz-x", "data-viz-y", "data-viz-mapped-x", "data-viz-mapped-y", "cx", "cy", "r"] },
      { name: "advanced function readout", requiredAttributes: ["data-viz-primary-family", "data-viz-selected-curve-only", "data-viz-scale-parameter", "data-viz-vertical-shift", "data-viz-formula", "data-viz-visible-locale", "data-viz-visible-readout", "data-viz-token-a", "data-viz-token-k", "x", "y"] }
    ],
    forbiddenClaims: ["a controlled cross-family comparison", "a wave family or synchronized parameters across different families"],
    formulaSurface: "secondary"
  },
  {
    labId: "differentiation-intro",
    templateId: "calculus-rate-area",
    modelId: "derivative-rate-area",
    invariantFamily: "tangent-local-gradient",
    invariantStatement: "The tangent at the selected point has the same slope as the displayed local gradient of the plotted curve.",
    modeIds: [],
    controlIds: ["value", "comparison"],
    lessonStateKeys: ["curvature", "probeX", "slope"],
    requiredStateKeys: ["curvature", "probeX", "slope"],
    allowedStateKeys: ["curvature", "probeX", "slope"],
    resetState: tangentReset,
    namedMarks: [
      { name: "calculus probe point" },
      { name: "calculus curve" },
      { name: "tangent line" },
      { name: "calculus mode readout" },
      { name: "semantic formula" },
      { name: "semantic invariant check" }
    ],
    visibleMathMarks: [
      { name: "semantic formula", requiredAttributes: ["data-viz-visible-formula", "data-viz-visible-locale"] },
      { name: "semantic invariant check", requiredAttributes: ["data-viz-visible-check", "data-viz-visible-locale"] },
      { name: "calculus curve", requiredAttributes: ["data-viz-curvature", "data-viz-vertical-shift", "data-viz-domain-min", "data-viz-domain-max", "data-viz-sample-count", "data-viz-probe-mapped-x", "data-viz-probe-mapped-y", "d"] },
      { name: "calculus probe point", requiredAttributes: ["data-viz-x0", "data-viz-y0", "data-viz-tangent-slope", "data-viz-mapped-x", "data-viz-mapped-y", "cx", "cy", "r"] },
      { name: "tangent line", requiredAttributes: ["data-viz-slope", "data-viz-anchor-x", "data-viz-anchor-y", "data-viz-rendered-start-x", "data-viz-rendered-start-y", "data-viz-rendered-end-x", "data-viz-rendered-end-y", "d"] },
      { name: "calculus mode readout", requiredAttributes: ["data-viz-active-mode", "data-viz-curvature", "data-viz-x0", "data-viz-y0", "data-viz-tangent-slope", "data-viz-formula", "data-viz-visible-locale", "data-viz-visible-readout", "data-viz-token-a", "data-viz-token-x0", "data-viz-token-slope", "x", "y"] }
    ],
    forbiddenClaims: ["a secant-to-tangent mode or accumulated area", "a derivative value unrelated to the plotted curve"],
    formulaSurface: "secondary"
  },
  {
    labId: "calculus",
    templateId: "calculus-rate-area",
    modelId: "derivative-rate-area",
    invariantFamily: "tangent-local-gradient",
    invariantStatement: "The tangent at the selected point has the same slope as the displayed local gradient of the plotted curve.",
    modeIds: [],
    controlIds: ["value", "comparison"],
    lessonStateKeys: ["curvature", "probeX", "slope"],
    requiredStateKeys: ["curvature", "probeX", "slope"],
    allowedStateKeys: ["curvature", "probeX", "slope"],
    resetState: tangentReset,
    namedMarks: [
      { name: "calculus probe point" },
      { name: "calculus curve" },
      { name: "tangent line" },
      { name: "calculus mode readout" },
      { name: "semantic formula" },
      { name: "semantic invariant check" }
    ],
    visibleMathMarks: [
      { name: "semantic formula", requiredAttributes: ["data-viz-visible-formula", "data-viz-visible-locale"] },
      { name: "semantic invariant check", requiredAttributes: ["data-viz-visible-check", "data-viz-visible-locale"] },
      { name: "calculus curve", requiredAttributes: ["data-viz-curvature", "data-viz-vertical-shift", "data-viz-domain-min", "data-viz-domain-max", "data-viz-sample-count", "data-viz-probe-mapped-x", "data-viz-probe-mapped-y", "d"] },
      { name: "calculus probe point", requiredAttributes: ["data-viz-x0", "data-viz-y0", "data-viz-tangent-slope", "data-viz-mapped-x", "data-viz-mapped-y", "cx", "cy", "r"] },
      { name: "tangent line", requiredAttributes: ["data-viz-slope", "data-viz-anchor-x", "data-viz-anchor-y", "data-viz-rendered-start-x", "data-viz-rendered-start-y", "data-viz-rendered-end-x", "data-viz-rendered-end-y", "d"] },
      { name: "calculus mode readout", requiredAttributes: ["data-viz-active-mode", "data-viz-curvature", "data-viz-x0", "data-viz-y0", "data-viz-tangent-slope", "data-viz-formula", "data-viz-visible-locale", "data-viz-visible-readout", "data-viz-token-a", "data-viz-token-x0", "data-viz-token-slope", "x", "y"] }
    ],
    forbiddenClaims: ["a secant mode or accumulated area", "a gradient value unrelated to the plotted curve"],
    formulaSurface: "secondary"
  }
] as const satisfies readonly ContractSpec[]);

const SPEC_BY_ID = new Map<string, ContractSpec>(
  CONTRACT_SPECS.map((spec) => [spec.labId, spec])
);

function freezeStrings(values: readonly string[]) {
  return Object.freeze([...values]);
}

const rawRendererKindByInvariant: Readonly<
  Record<HKVisualizationPassThroughMathOracleFamily, string>
> = Object.freeze({
  "displayed-distribution-summary": "distribution",
  "equal-groups-object-total": "array",
  "fraction-equivalence-inclusive-unit": "fraction",
  "selected-function-curve": "advanced-functions",
  "tangent-local-gradient": "calculus"
});

function buildContract(spec: ContractSpec): HKVisualizationPassThroughMathOracleContract {
  const rootSelector = rootFor(spec.labId);
  const allModes = freezeStrings(spec.modeIds);
  const modeSelectors = Object.freeze(spec.modeIds.map((modeId) => Object.freeze({
    modeId,
    selector: modeSelectorFor(rootSelector, modeId)
  })));
  const controlSelectors = Object.freeze(spec.controlIds.map((controlId) => Object.freeze({
    controlId,
    selector: controlSelectorFor(rootSelector, controlId)
  })));
  const namedVisibleMarks = Object.freeze(spec.namedMarks.map((mark) => Object.freeze({
    name: mark.name,
    selector: `${rootSelector} [data-viz-name="${mark.name}"]`,
    visibleInModes: freezeStrings(mark.visibleInModes ?? allModes)
  })));
  const compatibilityAliases = Object.freeze((spec.compatibilityAliases ?? []).map((alias) => Object.freeze({
    aliasKey: alias.aliasKey,
    canonicalKeys: freezeStrings(alias.canonicalKeys),
    precedence: "formal-fields" as const
  })));
  const dynamicControlDomains = Object.freeze([...(spec.dynamicControlDomains ?? [])]);
  const modelSelector = modelSelectorFor(rootSelector, spec.labId, spec.templateId);
  const rawAttribute = spec.formulaSurface === "primary"
    ? "data-viz-state-json" as const
    : "data-viz-math-state" as const;
  const rawRendererName = spec.formulaSurface === "primary"
    ? "configured semantic primary marks"
    : "configured semantic secondary model";
  const broadOwnerSelector = `${rootSelector} [data-viz-name="configured semantic primary marks"][data-viz-state-json], ${rootSelector} [data-viz-name="configured semantic secondary model"][data-viz-math-state]`;
  const identitySelector = `${rootSelector} [data-viz-name="${rawRendererName}"][data-viz-semantic-family="${spec.modelId}"][data-viz-semantic-variant="${spec.labId}"][${rawAttribute}]`;

  return Object.freeze({
    labId: spec.labId,
    topicId: spec.labId,
    moduleId: "configured-visualization-lab",
    kind: "pass-through",
    catalogVariant: spec.labId,
    templateId: spec.templateId,
    modelId: spec.modelId,
    sharedModelGroup: spec.sharedModelGroup ?? null,
    invariant: Object.freeze({
      family: spec.invariantFamily,
      statement: spec.invariantStatement
    }),
    rootSelector,
    modelSelector,
    stateSelector: `${rootSelector} [data-viz-configured-state]`,
    formulaSelector: formulaSelectorFor(rootSelector, spec.labId, spec.formulaSurface),
    reset: Object.freeze({
      selector: resetSelectorFor(rootSelector, spec.labId),
      modeId: spec.modeIds[0] ?? null,
      state: Object.freeze({ ...spec.resetState })
    }),
    modeSelectors,
    controlSelectors,
    lessonStateKeys: freezeStrings(spec.lessonStateKeys),
    requiredStateKeys: freezeStrings(spec.requiredStateKeys),
    allowedStateKeys: freezeStrings(spec.allowedStateKeys),
    compatibilityAliases,
    dynamicControlDomains,
    fixedViewport: spec.fixedViewport
      ? Object.freeze({
          id: spec.fixedViewport.id,
          viewport: Object.freeze({ ...spec.fixedViewport.viewport }),
          xTicks: Object.freeze([...spec.fixedViewport.xTicks]),
          yTicks: Object.freeze([...spec.fixedViewport.yTicks])
        })
      : null,
    namedVisibleMarks,
    rawRendererState: Object.freeze({
      attribute: rawAttribute,
      broadOwnerSelector,
      expectedFamily: spec.modelId,
      expectedKind: rawRendererKindByInvariant[spec.invariantFamily],
      identitySelector,
      selector: broadOwnerSelector
    }),
    visibleMathMarks: Object.freeze(spec.visibleMathMarks.map((mark) => Object.freeze({
      cardinality: mark.cardinality ?? "exactly-one",
      name: mark.name,
      requiredAttributes: freezeStrings(mark.requiredAttributes),
      selector: `${rootSelector} [data-viz-name="${mark.name}"]`
    }))),
    topicEvidenceSelectors: Object.freeze([modelSelector]),
    forbiddenClaims: freezeStrings(spec.forbiddenClaims)
  });
}

function rawRendererObject(
  observation: HKVisualizationPassThroughRawRendererStateObservation
) {
  if (!observation.serializedState?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(observation.serializedState);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function nestedRawRecord(
  raw: Readonly<Record<string, unknown>> | null,
  key: string
) {
  const value = raw?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finiteRecordNumber(
  record: Readonly<Record<string, unknown>> | null,
  key: string
) {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function finitePublicNumber(
  state: Readonly<Record<string, unknown>>,
  key: string
) {
  const value = state[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function closeRawNumber(left: number | null, right: number | null) {
  return left !== null
    && right !== null
    && Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}

function fixedPassThroughNumber(value: number, digits = 2) {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function expectedPassThroughFormula(
  contract: HKVisualizationPassThroughMathOracleContract,
  state: Readonly<Record<string, unknown>>
) {
  const number = (key: string) => finitePublicNumber(state, key);
  if (contract.invariant.family === "equal-groups-object-total") {
    const rows = number("rows");
    const columns = number("columns");
    const total = number("total");
    return rows === null || columns === null || total === null
      ? null
      : `${fixedPassThroughNumber(rows)} × ${fixedPassThroughNumber(columns)} = ${fixedPassThroughNumber(total)}`;
  }
  if (contract.invariant.family === "fraction-equivalence-inclusive-unit") {
    const numerator = number("numerator");
    const denominator = number("denominator");
    const equivalentNumerator = number("equivalentNumerator");
    const equivalentDenominator = number("equivalentDenominator");
    return numerator === null || denominator === null
      || equivalentNumerator === null || equivalentDenominator === null
      ? null
      : `${fixedPassThroughNumber(numerator)}/${fixedPassThroughNumber(denominator)} = ${fixedPassThroughNumber(equivalentNumerator)}/${fixedPassThroughNumber(equivalentDenominator)}`;
  }
  if (contract.invariant.family === "displayed-distribution-summary") {
    const mean = number("mean");
    const spread = number("spread");
    return mean === null || spread === null
      ? null
      : `center μ=${fixedPassThroughNumber(mean)} · spread=${fixedPassThroughNumber(spread)}`;
  }
  if (contract.invariant.family === "selected-function-curve") {
    const scale = number("scale");
    const verticalShift = number("verticalShift");
    return scale === null || verticalShift === null
      ? null
      : `y=${fixedPassThroughNumber(scale)}x² ${verticalShift >= 0 ? "+" : "−"} ${fixedPassThroughNumber(Math.abs(verticalShift))}`;
  }
  const curvature = number("curvature");
  return curvature === null
    ? null
    : `f(x)=0.5·a·x²+0.35, a=${fixedPassThroughNumber(curvature)} · f′(x)=a·x`;
}

export type HKVisualizationPassThroughVisibleLocale = "en" | "zh" | "zh-Hans";

export type HKVisualizationPassThroughVisibleNumericText = Readonly<{
  check: string;
  formula: string;
  readout: string;
}>;

/**
 * Dependency-free expected learner text. This is deliberately an explicit
 * oracle projection and does not import the React renderer or reuse its output.
 */
export function expectedHkVisualizationPassThroughVisibleNumericText(
  contract: HKVisualizationPassThroughMathOracleContract,
  state: Readonly<Record<string, unknown>>,
  locale: HKVisualizationPassThroughVisibleLocale
): HKVisualizationPassThroughVisibleNumericText | null {
  const number = (key: string) => finitePublicNumber(state, key);
  if (contract.invariant.family === "displayed-distribution-summary") {
    const mean = number("mean");
    const spread = number("spread");
    if (mean === null || spread === null || spread <= 0) return null;
    const mu = fixedPassThroughNumber(mean);
    const sigma = fixedPassThroughNumber(spread);
    if (locale === "zh") return Object.freeze({
      check: `關於 μ=${mu} 對稱 · 高度(μ−離散程度)=高度(μ+離散程度)`,
      formula: `中心 μ=${mu} · 離散程度=${sigma}`,
      readout: `平均數=${mu} · 離散程度=${sigma} · 對稱分佈`
    });
    if (locale === "zh-Hans") return Object.freeze({
      check: `关于 μ=${mu} 对称 · 高度(μ−离散程度)=高度(μ+离散程度)`,
      formula: `中心 μ=${mu} · 离散程度=${sigma}`,
      readout: `平均数=${mu} · 离散程度=${sigma} · 对称分布`
    });
    return Object.freeze({
      check: `symmetric about μ=${mu} · height(μ−spread)=height(μ+spread)`,
      formula: `center μ=${mu} · spread=${sigma}`,
      readout: `mean=${mu} · spread=${sigma} · symmetric distribution`
    });
  }
  if (contract.invariant.family === "selected-function-curve") {
    const scale = number("scale");
    const verticalShift = number("verticalShift");
    if (state.family !== "quadratic" || scale === null || scale <= 0 || verticalShift === null) {
      return null;
    }
    const coefficient = fixedPassThroughNumber(scale);
    const shift = fixedPassThroughNumber(verticalShift);
    const formula = expectedPassThroughFormula(contract, state);
    if (!formula) return null;
    if (locale === "zh") return Object.freeze({
      check: `已選二次函數 · a=${coefficient} · k=${shift}`,
      formula,
      readout: `二次函數 · a=${coefficient} · k=${shift}`
    });
    if (locale === "zh-Hans") return Object.freeze({
      check: `已选二次函数 · a=${coefficient} · k=${shift}`,
      formula,
      readout: `二次函数 · a=${coefficient} · k=${shift}`
    });
    return Object.freeze({
      check: `selected quadratic · a=${coefficient} · k=${shift}`,
      formula,
      readout: `quadratic · a=${coefficient} · k=${shift}`
    });
  }
  if (contract.invariant.family === "tangent-local-gradient") {
    const curvature = number("curvature");
    const probeX = number("probeX");
    const slope = number("slope");
    const formula = expectedPassThroughFormula(contract, state);
    if (curvature === null || probeX === null || slope === null || !formula) return null;
    const xToken = fixedPassThroughNumber(probeX).replace(/^-/, "−");
    const slopeToken = fixedPassThroughNumber(slope).replace(/^-/, "−");
    const slopeLabel = locale === "en" ? "tangent slope" : locale === "zh" ? "切線斜率" : "切线斜率";
    const readout = `x₀=${xToken} · ${slopeLabel}=${slopeToken}`;
    return Object.freeze({ check: readout, formula, readout });
  }
  return null;
}

type RawSeriesPoint = Readonly<{ x: number; y: number }>;

function rawSeries(raw: Readonly<Record<string, unknown>> | null) {
  const candidate = raw?.series;
  if (!Array.isArray(candidate)) return null;
  const parsed: RawSeriesPoint[] = [];
  for (const point of candidate) {
    if (!point || typeof point !== "object" || Array.isArray(point)) return null;
    const x = finiteRecordNumber(point as Record<string, unknown>, "x");
    const y = finiteRecordNumber(point as Record<string, unknown>, "y");
    if (x === null || y === null) return null;
    parsed.push({ x, y });
  }
  return parsed;
}

function expectedPassThroughSeries(
  contract: HKVisualizationPassThroughMathOracleContract,
  state: Readonly<Record<string, unknown>>
): RawSeriesPoint[] | null {
  if (contract.invariant.family === "displayed-distribution-summary") {
    const mean = finitePublicNumber(state, "mean");
    const spread = finitePublicNumber(state, "spread");
    if (mean === null || spread === null) return null;
    return Array.from({ length: 25 }, (_, index) => {
      const standardized = -3 + index * 0.25;
      return {
        x: mean + standardized * spread,
        y: Math.exp(-0.5 * standardized ** 2)
      };
    });
  }
  if (contract.invariant.family === "selected-function-curve") {
    const scale = finitePublicNumber(state, "scale");
    const verticalShift = finitePublicNumber(state, "verticalShift");
    if (state.family !== "quadratic" || scale === null || verticalShift === null) return null;
    return Array.from({ length: 33 }, (_, index) => {
      const x = -2.4 + index * (5.4 / 32);
      return { x, y: scale * x ** 2 + verticalShift };
    });
  }
  if (contract.invariant.family === "tangent-local-gradient") {
    const curvature = finitePublicNumber(state, "curvature");
    const probeX = finitePublicNumber(state, "probeX");
    if (curvature === null || probeX === null) return null;
    const evaluate = (x: number) => 0.5 * curvature * x ** 2 + 0.35;
    const series = Array.from({ length: 33 }, (_, index) => {
      const x = -4 + index * 0.25;
      return { x, y: evaluate(x) };
    });
    if (!series.some(({ x }) => Math.abs(x - probeX) < 1e-9)) {
      series.push({ x: probeX, y: evaluate(probeX) });
      series.sort((left, right) => left.x - right.x);
    }
    return series;
  }
  return null;
}

function sameOrderedRawSeries(
  actual: readonly RawSeriesPoint[] | null,
  expected: readonly RawSeriesPoint[] | null
) {
  return actual !== null
    && expected !== null
    && actual.length === expected.length
    && actual.every((point, index) => (
      closeRawNumber(point.x, expected[index]?.x ?? null)
      && closeRawNumber(point.y, expected[index]?.y ?? null)
    ));
}

function rawNamedPoints(raw: Readonly<Record<string, unknown>> | null) {
  const points = nestedRawRecord(raw, "points");
  if (!points) return [];
  const parsed: RawSeriesPoint[] = [];
  for (const point of Object.values(points)) {
    if (!point || typeof point !== "object" || Array.isArray(point)) continue;
    const x = finiteRecordNumber(point as Record<string, unknown>, "x");
    const y = finiteRecordNumber(point as Record<string, unknown>, "y");
    if (x !== null && y !== null) parsed.push({ x, y });
  }
  return parsed;
}

function mappedRawSeries(
  contract: HKVisualizationPassThroughMathOracleContract,
  raw: Readonly<Record<string, unknown>> | null
) {
  const series = rawSeries(raw);
  if (!series?.length) return null;
  const viewport = contract.fixedViewport?.viewport ?? (() => {
    const bounds = [...rawNamedPoints(raw), ...series, { x: 0, y: 0 }];
    const xMinimum = Math.min(...bounds.map(({ x }) => x));
    const xMaximum = Math.max(...bounds.map(({ x }) => x));
    const yMinimum = Math.min(...bounds.map(({ y }) => y));
    const yMaximum = Math.max(...bounds.map(({ y }) => y));
    const xSpan = Math.max(1, xMaximum - xMinimum);
    const ySpan = Math.max(1, yMaximum - yMinimum);
    return {
      xMaximum: xMaximum + xSpan * 0.12,
      xMinimum: xMinimum - xSpan * 0.12,
      yMaximum: yMaximum + ySpan * 0.16,
      yMinimum: yMinimum - ySpan * 0.16
    };
  })();
  return series.map((point) => ({
    x: 92 + ((point.x - viewport.xMinimum) / (viewport.xMaximum - viewport.xMinimum)) * 456,
    y: 264 - ((point.y - viewport.yMinimum) / (viewport.yMaximum - viewport.yMinimum)) * 148
  }));
}

export function auditHkVisualizationPassThroughRawRendererState(
  contract: HKVisualizationPassThroughMathOracleContract,
  publicState: Readonly<Record<string, unknown>>,
  observation: HKVisualizationPassThroughRawRendererStateObservation
): HKVisualizationPassThroughRawRendererStateIssue[] {
  const issues: HKVisualizationPassThroughRawRendererStateIssue[] = [];
  const issue = (
    code: HKVisualizationPassThroughRawRendererStateIssue["code"],
    message: string
  ) => issues.push({ code, message });
  if (
    observation.attribute !== contract.rawRendererState.attribute
    || observation.selectorEvidence.count !== 1
    || observation.selectorEvidence.learnerVisibleCount !== 1
  ) {
    issue(
      "raw-selector",
      `${contract.labId} must expose exactly one learner-visible ${contract.rawRendererState.attribute} semantic root.`
    );
  }
  const raw = rawRendererObject(observation);
  if (!raw) {
    issue("raw-json", `${contract.labId} raw renderer state must be one non-array JSON object.`);
    return issues;
  }
  if (
    raw.family !== contract.rawRendererState.expectedFamily
    || raw.kind !== contract.rawRendererState.expectedKind
    || raw.variant !== contract.labId
  ) {
    issue(
      "raw-identity",
      `${contract.labId} raw renderer family/kind/variant identity drifted.`
    );
  }

  const metrics = nestedRawRecord(raw, "metrics");
  const mismatch = (message: string) => issue("raw-state-mismatch", `${contract.labId} ${message}`);
  const expectedFormula = expectedPassThroughFormula(contract, publicState);
  if (typeof raw.formula !== "string" || raw.formula !== expectedFormula) {
    mismatch("raw formula disagrees with the projected public mathematics.");
  }
  if (contract.invariant.family === "equal-groups-object-total") {
    const rows = finiteRecordNumber(raw, "rows");
    const columns = finiteRecordNumber(raw, "columns");
    const product = finiteRecordNumber(raw, "product");
    if (
      !closeRawNumber(rows, finitePublicNumber(publicState, "rows"))
      || !closeRawNumber(columns, finitePublicNumber(publicState, "columns"))
      || !closeRawNumber(product, finitePublicNumber(publicState, "total"))
      || !closeRawNumber(product, rows !== null && columns !== null ? rows * columns : null)
    ) mismatch("raw rows, columns, or product disagree with the projected object total.");
  } else if (contract.invariant.family === "fraction-equivalence-inclusive-unit") {
    const numerator = finiteRecordNumber(raw, "numerator");
    const denominator = finiteRecordNumber(raw, "denominator");
    const resultNumerator = finiteRecordNumber(raw, "resultNumerator");
    const resultDenominator = finiteRecordNumber(raw, "resultDenominator");
    if (
      !closeRawNumber(numerator, finitePublicNumber(publicState, "numerator"))
      || !closeRawNumber(denominator, finitePublicNumber(publicState, "denominator"))
      || !closeRawNumber(resultNumerator, finitePublicNumber(publicState, "equivalentNumerator"))
      || !closeRawNumber(resultDenominator, finitePublicNumber(publicState, "equivalentDenominator"))
      || !closeRawNumber(resultNumerator, numerator !== null ? numerator * 2 : null)
      || !closeRawNumber(resultDenominator, denominator !== null ? denominator * 2 : null)
    ) mismatch("raw fraction/result fields disagree with the projected exact equivalent fraction.");
  } else if (contract.invariant.family === "displayed-distribution-summary") {
    if (
      !metrics
      || !closeRawNumber(finiteRecordNumber(metrics, "mean"), finitePublicNumber(publicState, "mean"))
      || !closeRawNumber(finiteRecordNumber(metrics, "spread"), finitePublicNumber(publicState, "spread"))
      || !sameOrderedRawSeries(rawSeries(raw), expectedPassThroughSeries(contract, publicState))
    ) mismatch("raw distribution metrics disagree with projected mean/spread.");
  } else if (contract.invariant.family === "selected-function-curve") {
    const scale = finiteRecordNumber(metrics, "scaleParameter");
    if (
      !metrics
      || metrics.primaryFamily !== publicState.family
      || scale === null
      || scale <= 0
      || !closeRawNumber(scale, finitePublicNumber(publicState, "scale"))
      || !closeRawNumber(finiteRecordNumber(metrics, "verticalShift"), finitePublicNumber(publicState, "verticalShift"))
      || !sameOrderedRawSeries(rawSeries(raw), expectedPassThroughSeries(contract, publicState))
    ) mismatch("raw selected family/scale/shift disagree with the projected function state.");
  } else if (contract.invariant.family === "tangent-local-gradient") {
    const curvature = finiteRecordNumber(metrics, "curvature");
    const probeX = finiteRecordNumber(metrics, "probeX");
    const tangentSlope = finiteRecordNumber(metrics, "tangentSlope");
    const functionValue = finiteRecordNumber(metrics, "functionValue");
    if (
      !metrics
      || !closeRawNumber(curvature, finitePublicNumber(publicState, "curvature"))
      || !closeRawNumber(probeX, finitePublicNumber(publicState, "probeX"))
      || !closeRawNumber(tangentSlope, finitePublicNumber(publicState, "slope"))
      || !closeRawNumber(tangentSlope, curvature !== null && probeX !== null ? curvature * probeX : null)
      || !closeRawNumber(functionValue, curvature !== null && probeX !== null ? 0.5 * curvature * probeX ** 2 + 0.35 : null)
      || !sameOrderedRawSeries(rawSeries(raw), expectedPassThroughSeries(contract, publicState))
    ) mismatch("raw curvature/probe/function/tangent metrics disagree with the projected tangent state.");
  }
  return issues;
}

export function auditHkVisualizationPassThroughVisibleMathObservation(
  contract: HKVisualizationPassThroughMathOracleContract,
  observation: HKVisualizationPassThroughVisibleMathObservation
): HKVisualizationPassThroughVisibleMathIssue[] {
  const issues: HKVisualizationPassThroughVisibleMathIssue[] = [];
  const issue = (
    code: HKVisualizationPassThroughVisibleMathIssue["code"],
    message: string
  ) => issues.push({ code, message });
  const read = (
    mark: HKVisualizationPassThroughVisibleMathMarkObservation | undefined,
    attribute: string
  ) => mark?.attributes[attribute] ?? null;
  const number = (
    mark: HKVisualizationPassThroughVisibleMathMarkObservation | undefined,
    attribute: string
  ) => {
    const value = read(mark, attribute);
    if (value === null || !value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const stateNumber = (key: string) => {
    const value = observation.state[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  const close = (left: number | null, right: number | null, tolerance = 1e-8) => (
    left !== null
    && right !== null
    && Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right))
  );
  const exactly = (
    left: string | number | boolean | null | undefined,
    right: string | number | boolean | null | undefined
  ) => String(left) === String(right);
  const fixed = (value: number, digits = 2) => {
    const rounded = Number(value.toFixed(digits));
    return Object.is(rounded, -0) ? "0" : String(rounded);
  };
  const pathPoints = (mark: HKVisualizationPassThroughVisibleMathMarkObservation | undefined) => {
    const d = read(mark, "d");
    if (!d) return [];
    return Array.from(d.matchAll(/[ML]\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s+(-?(?:\d+(?:\.\d*)?|\.\d+))/gu), (match) => ({
      x: Number(match[1]),
      y: Number(match[2])
    })).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  };
  const raw = rawRendererObject(observation.rawRendererState);
  const rawMetrics = nestedRawRecord(raw, "metrics");
  const pathMatchesRawSeries = (
    mark: HKVisualizationPassThroughVisibleMathMarkObservation | undefined
  ) => {
    const path = pathPoints(mark);
    const mapped = mappedRawSeries(contract, raw);
    const series = rawSeries(raw);
    if (!mapped || !series || path.length !== mapped.length || series.length !== mapped.length) {
      return false;
    }
    if (!close(number(mark, "data-viz-sample-count"), series.length)) return false;
    return path.every((point, index) => {
      const expected = mapped[index];
      return expected !== undefined
        && Math.abs(point.x - expected.x) <= 0.051
        && Math.abs(point.y - expected.y) <= 0.051;
    });
  };
  const rawIssues = auditHkVisualizationPassThroughRawRendererState(
    contract,
    observation.state,
    observation.rawRendererState
  );
  if (rawIssues.length > 0) {
    issue(
      "visible-raw-mismatch",
      `${contract.labId} visible geometry cannot be accepted because raw renderer state failed: ${rawIssues.map(({ code }) => code).join(", ")}.`
    );
  }

  if (observation.labId !== contract.labId) {
    issue("visible-state-mismatch", `${contract.labId} received visible evidence for ${observation.labId}.`);
  }

  for (const markContract of contract.visibleMathMarks) {
    const marks = observation.marks[markContract.name] ?? [];
    const expectedCount = markContract.cardinality === "exactly-three"
      ? 3
      : markContract.cardinality === "fixed-x-ticks"
        ? contract.fixedViewport?.xTicks.length ?? Number.NaN
        : markContract.cardinality === "fixed-y-ticks"
          ? contract.fixedViewport?.yTicks.length ?? Number.NaN
      : markContract.cardinality === "state-total"
        ? stateNumber("total")
        : markContract.cardinality === "whole-partitions"
          ? Math.max(0, (stateNumber("denominator") ?? Number.NaN) - 1)
          : markContract.cardinality === "equivalent-partitions"
            ? Math.max(0, (stateNumber("equivalentDenominator") ?? Number.NaN) - 1)
            : 1;
    if (expectedCount === null || marks.length !== expectedCount) {
      issue(
        "visible-mark-count",
        `${contract.labId} ${markContract.name} expected ${expectedCount ?? "finite state total"} marks; observed ${marks.length}.`
      );
    }
    for (const [index, visibleMark] of marks.entries()) {
      for (const attribute of markContract.requiredAttributes) {
        const value = visibleMark.attributes[attribute];
        if (value === null || value === undefined || !value.trim()) {
          issue(
            "visible-attribute",
            `${contract.labId} ${markContract.name}[${index}] lacks ${attribute}.`
          );
        }
      }
    }
  }

  const expectedFormula = expectedPassThroughFormula(contract, observation.state);
  const formulaMarkName = contract.rawRendererState.attribute === "data-viz-state-json"
    ? "configured semantic primary marks"
    : "semantic formula";
  const formulaAttribute = contract.rawRendererState.attribute === "data-viz-state-json"
    ? "data-viz-formula"
    : "data-viz-visible-formula";
  const visibleFormulaMark = observation.marks[formulaMarkName]?.[0];
  const visibleFormulaAttribute = read(visibleFormulaMark, formulaAttribute);
  const visibleFormulaText = visibleFormulaMark?.text.replace(/\s+/gu, " ").trim() ?? "";
  const normalizedFormulaText = observation.formulaText?.replace(/\s+/gu, " ").trim() ?? "";
  const visibleLocaleValue = read(visibleFormulaMark, "data-viz-visible-locale");
  const visibleLocale: HKVisualizationPassThroughVisibleLocale | null =
    visibleLocaleValue === "en" || visibleLocaleValue === "zh" || visibleLocaleValue === "zh-Hans"
      ? visibleLocaleValue
      : contract.rawRendererState.attribute === "data-viz-state-json"
        ? "en"
        : null;
  const expectedVisibleText = visibleLocale
    ? expectedHkVisualizationPassThroughVisibleNumericText(contract, observation.state, visibleLocale)
    : null;
  const expectedVisibleFormula = expectedVisibleText?.formula ?? expectedFormula;
  if (
    expectedFormula === null
    || expectedVisibleFormula === null
    || visibleFormulaAttribute !== expectedVisibleFormula
    || !visibleFormulaText.includes(expectedVisibleFormula)
    || !normalizedFormulaText.includes(expectedVisibleFormula)
    || raw?.formula !== expectedFormula
  ) {
    issue(
      "visible-formula",
      `${contract.labId} public state, raw JSON, formula attribute, and learner-visible formula text must encode the same exact mathematics.`
    );
  }

  if (expectedVisibleText) {
    const checkMark = observation.marks["semantic invariant check"]?.[0];
    const readoutName = contract.invariant.family === "displayed-distribution-summary"
      ? "distribution summary readout"
      : contract.invariant.family === "selected-function-curve"
        ? "advanced function readout"
        : "calculus mode readout";
    const readoutMark = observation.marks[readoutName]?.[0];
    const expectedTokens = contract.invariant.family === "displayed-distribution-summary"
      ? {
          "data-viz-token-mean": fixedPassThroughNumber(stateNumber("mean") ?? Number.NaN),
          "data-viz-token-spread": fixedPassThroughNumber(stateNumber("spread") ?? Number.NaN)
        }
      : contract.invariant.family === "selected-function-curve"
        ? {
            "data-viz-token-a": fixedPassThroughNumber(stateNumber("scale") ?? Number.NaN),
            "data-viz-token-k": fixedPassThroughNumber(stateNumber("verticalShift") ?? Number.NaN)
          }
        : {
            "data-viz-token-a": fixedPassThroughNumber(stateNumber("curvature") ?? Number.NaN),
            "data-viz-token-slope": fixedPassThroughNumber(stateNumber("slope") ?? Number.NaN).replace(/^-/, "−"),
            "data-viz-token-x0": fixedPassThroughNumber(stateNumber("probeX") ?? Number.NaN).replace(/^-/, "−")
          };
    if (
      !checkMark
      || !readoutMark
      || read(checkMark, "data-viz-visible-locale") !== visibleLocale
      || read(readoutMark, "data-viz-visible-locale") !== visibleLocale
      || read(checkMark, "data-viz-visible-check") !== expectedVisibleText.check
      || read(readoutMark, "data-viz-visible-readout") !== expectedVisibleText.readout
      || !checkMark.text.replace(/\s+/gu, " ").includes(expectedVisibleText.check)
      || !readoutMark.text.replace(/\s+/gu, " ").includes(expectedVisibleText.readout)
      || Object.entries(expectedTokens).some(([attribute, expected]) => (
        expected === "NaN" || read(readoutMark, attribute) !== expected
      ))
    ) {
      issue(
        "visible-state-mismatch",
        `${contract.labId} localized formula, check, readout, and exact numeric tokens must agree with the public state.`
      );
    }
  } else if (contract.rawRendererState.attribute === "data-viz-math-state") {
    issue("visible-state-mismatch", `${contract.labId} secondary visible locale/text projection is missing or invalid.`);
  }

  if (contract.fixedViewport) {
    const plan = contract.fixedViewport;
    const viewportMark = observation.marks["semantic fixed viewport"]?.[0];
    const xTicks = observation.marks["semantic x tick"] ?? [];
    const yTicks = observation.marks["semantic y tick"] ?? [];
    const mappedX = (value: number) => 92
      + ((value - plan.viewport.xMinimum) / (plan.viewport.xMaximum - plan.viewport.xMinimum)) * 456;
    const mappedY = (value: number) => 264
      - ((value - plan.viewport.yMinimum) / (plan.viewport.yMaximum - plan.viewport.yMinimum)) * 148;
    if (
      read(viewportMark, "data-viz-viewport-id") !== plan.id
      || !close(number(viewportMark, "data-viz-domain-x-min"), plan.viewport.xMinimum)
      || !close(number(viewportMark, "data-viz-domain-x-max"), plan.viewport.xMaximum)
      || !close(number(viewportMark, "data-viz-domain-y-min"), plan.viewport.yMinimum)
      || !close(number(viewportMark, "data-viz-domain-y-max"), plan.viewport.yMaximum)
      || read(viewportMark, "data-viz-x-ticks") !== plan.xTicks.join(",")
      || read(viewportMark, "data-viz-y-ticks") !== plan.yTicks.join(",")
      || !close(number(viewportMark, "x"), 92)
      || !close(number(viewportMark, "y"), 116)
      || !close(number(viewportMark, "width"), 456)
      || !close(number(viewportMark, "height"), 148)
    ) {
      issue("visible-geometry", `${contract.labId} fixed viewport bounds or painted frame disagree with the independent topic plan.`);
    }
    for (const [index, tickMark] of xTicks.entries()) {
      const tick = plan.xTicks[index] ?? Number.NaN;
      if (
        read(tickMark, "data-viz-tick-axis") !== "x"
        || !close(number(tickMark, "data-viz-tick-value"), tick)
        || !close(number(tickMark, "x1"), mappedX(tick))
        || !close(number(tickMark, "x2"), mappedX(tick))
        || !close(number(tickMark, "y1"), 116)
        || !close(number(tickMark, "y2"), 264)
      ) issue("visible-geometry", `${contract.labId} fixed x tick ${index} is not painted at its declared logical value.`);
    }
    for (const [index, tickMark] of yTicks.entries()) {
      const tick = plan.yTicks[index] ?? Number.NaN;
      if (
        read(tickMark, "data-viz-tick-axis") !== "y"
        || !close(number(tickMark, "data-viz-tick-value"), tick)
        || !close(number(tickMark, "x1"), 92)
        || !close(number(tickMark, "x2"), 548)
        || !close(number(tickMark, "y1"), mappedY(tick))
        || !close(number(tickMark, "y2"), mappedY(tick))
      ) issue("visible-geometry", `${contract.labId} fixed y tick ${index} is not painted at its declared logical value.`);
    }
  }

  if (contract.invariant.family === "equal-groups-object-total") {
    const rows = stateNumber("rows");
    const columns = stateNumber("columns");
    const total = stateNumber("total");
    const outline = observation.marks["array outline"]?.[0];
    const totalMark = observation.marks["equal groups total"]?.[0];
    const items = observation.marks["array item"] ?? [];
    if (
      !close(number(outline, "data-viz-rows"), rows)
      || !close(number(outline, "data-viz-columns"), columns)
      || !close(number(outline, "data-viz-object-total"), total)
      || !close(number(totalMark, "data-viz-total"), total)
    ) {
      issue("visible-state-mismatch", `${contract.labId} array outline/total attributes disagree with public rows, columns, or total.`);
    }
    if (
      !close(number(outline, "data-viz-rows"), finiteRecordNumber(raw, "rows"))
      || !close(number(outline, "data-viz-columns"), finiteRecordNumber(raw, "columns"))
      || !close(number(outline, "data-viz-object-total"), finiteRecordNumber(raw, "product"))
      || !close(number(totalMark, "data-viz-total"), finiteRecordNumber(raw, "product"))
    ) {
      issue("visible-raw-mismatch", `${contract.labId} visible array disagrees with raw rows, columns, or product.`);
    }
    if (rows !== null && columns !== null && total !== null) {
      const cells = new Set<string>();
      const positions = new Set<string>();
      const rowY = new Map<number, number>();
      const columnX = new Map<number, number>();
      const outlineX = number(outline, "x");
      const outlineY = number(outline, "y");
      const outlineWidth = number(outline, "width");
      const outlineHeight = number(outline, "height");
      if (
        outlineX === null || outlineY === null || outlineWidth === null || outlineHeight === null
        || outlineWidth <= 0 || outlineHeight <= 0
      ) {
        issue("visible-geometry", `${contract.labId} array outline must have positive finite geometry.`);
      }
      for (const item of items) {
        const row = number(item, "data-viz-row");
        const column = number(item, "data-viz-column");
        const cx = number(item, "cx");
        const cy = number(item, "cy");
        const radius = number(item, "r");
        if (
          row === null || column === null || !Number.isInteger(row) || !Number.isInteger(column)
          || row < 1 || row > rows || column < 1 || column > columns
        ) {
          issue("visible-geometry", `${contract.labId} array item lies outside the public row/column domain.`);
          continue;
        }
        cells.add(`${row}:${column}`);
        if (
          cx === null || cy === null || radius === null || radius <= 0
          || outlineX === null || outlineY === null || outlineWidth === null || outlineHeight === null
          || cx - radius < outlineX || cx + radius > outlineX + outlineWidth
          || cy - radius < outlineY || cy + radius > outlineY + outlineHeight
        ) {
          issue("visible-geometry", `${contract.labId} array item has invalid or out-of-outline circle geometry.`);
        } else {
          positions.add(`${cx}:${cy}`);
          const knownY = rowY.get(row);
          const knownX = columnX.get(column);
          if ((knownY !== undefined && !close(knownY, cy)) || (knownX !== undefined && !close(knownX, cx))) {
            issue("visible-geometry", `${contract.labId} array rows/columns do not form aligned circle coordinates.`);
          }
          rowY.set(row, cy);
          columnX.set(column, cx);
        }
      }
      const positiveSpacing = (values: number[]) => values.every((value, index) => (
        Number.isFinite(value) && (index === 0 || value > values[index - 1])
      ));
      const orderedX = Array.from({ length: columns }, (_, index) => columnX.get(index + 1) ?? Number.NaN);
      const orderedY = Array.from({ length: rows }, (_, index) => rowY.get(index + 1) ?? Number.NaN);
      if (
        items.length !== total || cells.size !== total
        || columnX.size !== columns || rowY.size !== rows
        || !positiveSpacing(orderedX) || !positiveSpacing(orderedY)
      ) {
        issue("visible-mark-count", `${contract.labId} rendered ${items.length}/${cells.size} items for public total ${total}.`);
      }
      if (positions.size !== total) {
        issue("visible-geometry", `${contract.labId} array item circles do not occupy ${total} unique SVG coordinates.`);
      }
    }
  }

  if (contract.invariant.family === "fraction-equivalence-inclusive-unit") {
    const pairs = [
      ["whole bar", "whole bar background", "whole bar fill", "numerator", "denominator"],
      ["equivalent bar", "equivalent bar background", "equivalent bar fill", "equivalentNumerator", "equivalentDenominator"]
    ] as const;
    for (const [barName, backgroundName, fillName, numeratorKey, denominatorKey] of pairs) {
      const bar = observation.marks[barName]?.[0];
      const background = observation.marks[backgroundName]?.[0];
      const fill = observation.marks[fillName]?.[0];
      const numerator = stateNumber(numeratorKey);
      const denominator = stateNumber(denominatorKey);
      const expectedValue = numerator !== null && denominator !== null && denominator !== 0
        ? numerator / denominator
        : null;
      if (
        !close(number(bar, "data-viz-numerator"), numerator)
        || !close(number(bar, "data-viz-denominator"), denominator)
        || !close(number(bar, "data-viz-value"), expectedValue)
        || !close(number(fill, "data-viz-numerator"), numerator)
        || !close(number(fill, "data-viz-denominator"), denominator)
        || !close(number(fill, "data-viz-value"), expectedValue)
        || !close(number(bar, "data-viz-partition-count"), denominator)
        || !close(number(fill, "data-viz-partition-count"), denominator)
      ) {
        issue("visible-state-mismatch", `${contract.labId} ${barName} attributes disagree with the public fraction state.`);
      }
      const rawNumeratorKey = numeratorKey === "numerator" ? "numerator" : "resultNumerator";
      const rawDenominatorKey = denominatorKey === "denominator" ? "denominator" : "resultDenominator";
      if (
        !close(number(bar, "data-viz-numerator"), finiteRecordNumber(raw, rawNumeratorKey))
        || !close(number(bar, "data-viz-denominator"), finiteRecordNumber(raw, rawDenominatorKey))
        || !close(number(fill, "data-viz-numerator"), finiteRecordNumber(raw, rawNumeratorKey))
        || !close(number(fill, "data-viz-denominator"), finiteRecordNumber(raw, rawDenominatorKey))
      ) {
        issue("visible-raw-mismatch", `${contract.labId} ${barName} geometry disagrees with raw fraction/result fields.`);
      }
      const fullWidth = number(fill, "data-viz-bar-width");
      const renderedWidth = number(fill, "width");
      const partitions = observation.marks[`${barName} partition`] ?? [];
      const backgroundX = number(background, "x");
      const backgroundY = number(background, "y");
      const backgroundWidth = number(background, "width");
      const backgroundHeight = number(background, "height");
      const partitionIndexes = new Set<number>();
      for (const partition of partitions) {
        const index = number(partition, "data-viz-partition-index");
        const partitionCount = number(partition, "data-viz-partition-count");
        const x1 = number(partition, "x1");
        const x2 = number(partition, "x2");
        const y1 = number(partition, "y1");
        const y2 = number(partition, "y2");
        if (
          index === null || denominator === null || backgroundX === null || backgroundY === null
          || backgroundWidth === null || backgroundHeight === null
          || !Number.isInteger(index) || index < 1 || index >= denominator
          || !close(partitionCount, denominator)
          || !close(x1, x2)
          || !close(x1, backgroundX + backgroundWidth * index / denominator)
          || !close(y1, backgroundY)
          || !close(y2, backgroundY + backgroundHeight)
        ) {
          issue("visible-geometry", `${contract.labId} ${barName} partition does not divide its visible bar exactly.`);
        }
        if (index !== null) partitionIndexes.add(index);
      }
      if (
        expectedValue === null || fullWidth === null
        || !close(number(background, "data-viz-bar-width"), fullWidth)
        || !close(number(background, "data-viz-partition-count"), denominator)
        || !close(number(background, "width"), fullWidth)
        || !close(number(fill, "x"), number(background, "x"))
        || !close(number(fill, "y"), number(background, "y"))
        || !close(number(fill, "height"), number(background, "height"))
        || !close(renderedWidth, fullWidth * expectedValue)
        || (denominator !== null && partitionIndexes.size !== Math.max(0, denominator - 1))
      ) {
        issue("visible-geometry", `${contract.labId} ${fillName} width does not encode its fraction value.`);
      }
    }
  }

  if (contract.invariant.family === "displayed-distribution-summary") {
    const mean = stateNumber("mean");
    const spread = stateNumber("spread");
    const curve = observation.marks["distribution summary curve"]?.[0];
    const meanMark = observation.marks["distribution mean"]?.[0];
    const band = observation.marks["distribution spread band"]?.[0];
    const left = observation.marks["distribution left spread marker"]?.[0];
    const right = observation.marks["distribution right spread marker"]?.[0];
    const readout = observation.marks["distribution summary readout"]?.[0];
    const expectedDensity = Math.exp(-0.5);
    const curvePoints = pathPoints(curve);
    if (
      mean === null || spread === null
      || !close(number(curve, "data-viz-mean"), mean)
      || !close(number(curve, "data-viz-spread"), spread)
      || !close(number(meanMark, "data-viz-mean"), mean)
      || !close(number(band, "data-viz-mean"), mean)
      || !close(number(band, "data-viz-spread"), spread)
      || !close(number(band, "data-viz-left-value"), mean - spread)
      || !close(number(band, "data-viz-right-value"), mean + spread)
      || !close(number(left, "data-viz-x-value"), mean - spread)
      || !close(number(right, "data-viz-x-value"), mean + spread)
      || !close(number(left, "data-viz-density"), expectedDensity)
      || !close(number(right, "data-viz-density"), expectedDensity)
      || !close(number(left, "data-viz-density"), number(left, "data-viz-series-y"))
      || !close(number(right, "data-viz-density"), number(right, "data-viz-series-y"))
      || !close(number(left, "data-viz-mapped-x"), number(left, "cx"))
      || !close(number(left, "data-viz-mapped-y"), number(left, "cy"))
      || !close(number(right, "data-viz-mapped-x"), number(right, "cx"))
      || !close(number(right, "data-viz-mapped-y"), number(right, "cy"))
      || !close(number(readout, "data-viz-mean"), mean)
      || !close(number(readout, "data-viz-spread"), spread)
    ) {
      issue("visible-state-mismatch", `${contract.labId} curve, mean, spread band, markers, or readout disagree with public mean/spread.`);
    }
    if (
      !close(number(curve, "data-viz-mean"), finiteRecordNumber(rawMetrics, "mean"))
      || !close(number(curve, "data-viz-spread"), finiteRecordNumber(rawMetrics, "spread"))
      || !close(number(band, "data-viz-mean"), finiteRecordNumber(rawMetrics, "mean"))
      || !close(number(band, "data-viz-spread"), finiteRecordNumber(rawMetrics, "spread"))
      || !close(number(readout, "data-viz-mean"), finiteRecordNumber(rawMetrics, "mean"))
      || !close(number(readout, "data-viz-spread"), finiteRecordNumber(rawMetrics, "spread"))
    ) {
      issue("visible-raw-mismatch", `${contract.labId} visible distribution disagrees with raw mean/spread metrics.`);
    }
    if (
      !close(number(meanMark, "x1"), number(meanMark, "x2"))
      || !close(
        number(meanMark, "x1"),
        number(band, "data-viz-left-x") !== null && number(band, "data-viz-right-x") !== null
          ? ((number(band, "data-viz-left-x") ?? 0) + (number(band, "data-viz-right-x") ?? 0)) / 2
          : null
      )
      || !close(number(curve, "data-viz-left-spread-x"), number(left, "cx"))
      || !close(number(curve, "data-viz-left-spread-y"), number(left, "cy"))
      || !close(number(curve, "data-viz-right-spread-x"), number(right, "cx"))
      || !close(number(curve, "data-viz-right-spread-y"), number(right, "cy"))
      || !close(number(band, "data-viz-left-x"), number(band, "x"))
      || !close(number(band, "data-viz-right-x"), (number(band, "x") ?? 0) + (number(band, "width") ?? 0))
      || !close(number(left, "cx"), number(band, "data-viz-left-x"))
      || !close(number(right, "cx"), number(band, "data-viz-right-x"))
      || !close(number(left, "cy"), number(right, "cy"))
      || !curvePoints.some((point) => close(point.x, number(curve, "data-viz-left-spread-x"), 1e-3) && close(point.y, number(curve, "data-viz-left-spread-y"), 1e-3))
      || !curvePoints.some((point) => close(point.x, number(curve, "data-viz-right-spread-x"), 1e-3) && close(point.y, number(curve, "data-viz-right-spread-y"), 1e-3))
      || !pathMatchesRawSeries(curve)
      || number(band, "width") === null
      || (number(band, "width") ?? 0) <= 0
    ) {
      issue("visible-geometry", `${contract.labId} spread geometry is not a positive symmetric visible band around a vertical mean.`);
    }
  }

  if (contract.invariant.family === "selected-function-curve") {
    const family = typeof observation.state.family === "string" ? observation.state.family : null;
    const scale = stateNumber("scale");
    const verticalShift = stateNumber("verticalShift");
    const curve = observation.marks["advanced primary curve"]?.[0];
    const readout = observation.marks["advanced function readout"]?.[0];
    const samples = observation.marks["advanced curve sample"] ?? [];
    const curvePoints = pathPoints(curve);
    const expectedMapped = [
      [number(curve, "data-viz-sample-start-x"), number(curve, "data-viz-sample-start-y")],
      [number(curve, "data-viz-sample-middle-x"), number(curve, "data-viz-sample-middle-y")],
      [number(curve, "data-viz-sample-end-x"), number(curve, "data-viz-sample-end-y")]
    ] as const;
    const expectedFormula = scale !== null && verticalShift !== null
      ? `${fixed(scale)}x² ${verticalShift >= 0 ? "+" : "−"} ${fixed(Math.abs(verticalShift))}`
      : null;
    if (
      scale === null
      || scale <= 0
      || !exactly(read(curve, "data-viz-function-family"), family)
      || !close(number(curve, "data-viz-scale-parameter"), scale)
      || !close(number(curve, "data-viz-vertical-shift"), verticalShift)
      || !exactly(read(readout, "data-viz-primary-family"), family)
      || !close(number(readout, "data-viz-scale-parameter"), scale)
      || !close(number(readout, "data-viz-vertical-shift"), verticalShift)
      || !exactly(read(curve, "data-viz-formula"), expectedFormula)
      || !exactly(read(readout, "data-viz-formula"), expectedFormula)
      || read(readout, "data-viz-selected-curve-only") !== "true"
    ) {
      issue("visible-state-mismatch", `${contract.labId} curve/readout parameters disagree with public family, scale, or shift.`);
    }
    if (
      !exactly(read(curve, "data-viz-function-family"), rawMetrics?.primaryFamily as string | undefined)
      || !close(number(curve, "data-viz-scale-parameter"), finiteRecordNumber(rawMetrics, "scaleParameter"))
      || !close(number(curve, "data-viz-vertical-shift"), finiteRecordNumber(rawMetrics, "verticalShift"))
      || !close(number(readout, "data-viz-scale-parameter"), finiteRecordNumber(rawMetrics, "scaleParameter"))
      || !close(number(readout, "data-viz-vertical-shift"), finiteRecordNumber(rawMetrics, "verticalShift"))
    ) {
      issue("visible-raw-mismatch", `${contract.labId} visible selected curve disagrees with raw family/scale/shift metrics.`);
    }
    for (const [samplePosition, sample] of samples.entries()) {
      const x = number(sample, "data-viz-x");
      const y = number(sample, "data-viz-y");
      const expected = family === "quadratic" && x !== null && scale !== null && verticalShift !== null
        ? scale * x ** 2 + verticalShift
        : null;
      if (!close(y, expected)) {
        issue("visible-geometry", `${contract.labId} selected curve sample is not generated by its public formula.`);
      }
      if (
        !close(number(sample, "data-viz-mapped-x"), number(sample, "cx"))
        || !close(number(sample, "data-viz-mapped-y"), number(sample, "cy"))
        || !close(number(sample, "cx"), expectedMapped[samplePosition]?.[0] ?? null)
        || !close(number(sample, "cy"), expectedMapped[samplePosition]?.[1] ?? null)
      ) {
        issue("visible-geometry", `${contract.labId} selected curve sample metadata does not match its rendered SVG point.`);
      }
    }
    for (const [x, y] of expectedMapped) {
      if (!curvePoints.some((point) => close(point.x, x, 1e-3) && close(point.y, y, 1e-3))) {
        issue("visible-geometry", `${contract.labId} SVG curve path omits a declared deterministic curve sample.`);
      }
    }
    if (!pathMatchesRawSeries(curve)) {
      issue("visible-geometry", `${contract.labId} SVG curve path must encode every raw selected-function sample in exact order.`);
    }
  }

  if (contract.invariant.family === "tangent-local-gradient") {
    const curvature = stateNumber("curvature");
    const probeX = stateNumber("probeX");
    const slope = stateNumber("slope");
    const curve = observation.marks["calculus curve"]?.[0];
    const probe = observation.marks["calculus probe point"]?.[0];
    const tangent = observation.marks["tangent line"]?.[0];
    const readout = observation.marks["calculus mode readout"]?.[0];
    const tangentPoints = pathPoints(tangent);
    const curvePoints = pathPoints(curve);
    const verticalShift = number(curve, "data-viz-vertical-shift");
    const expectedY = curvature !== null && probeX !== null && verticalShift !== null
      ? 0.5 * curvature * probeX ** 2 + verticalShift
      : null;
    const expectedFormula = curvature !== null
      ? `f(x)=0.5·a·x²+0.35, a=${fixed(curvature)} · f′(x)=a·x`
      : null;
    const tangentScreenSlopeMatchesLogicalSlope = (() => {
      const start = tangentPoints[0];
      const end = tangentPoints[1];
      const firstCurvePoint = curvePoints[0];
      const lastCurvePoint = curvePoints[curvePoints.length - 1];
      const domainMin = number(curve, "data-viz-domain-min");
      const domainMax = number(curve, "data-viz-domain-max");
      const probeMappedY = number(probe, "cy");
      if (
        !start || !end || !firstCurvePoint || !lastCurvePoint
        || domainMin === null || domainMax === null || curvature === null
        || slope === null || expectedY === null || probeMappedY === null
        || Math.abs(end.x - start.x) <= 1e-9
        || Math.abs(domainMax - domainMin) <= 1e-9
      ) return false;
      const renderedSlope = (end.y - start.y) / (end.x - start.x);
      if (Math.abs(slope) <= 1e-10) return Math.abs(renderedSlope) <= 1e-3;
      const firstLogicalY = 0.5 * curvature * domainMin ** 2 + (verticalShift ?? 0);
      if (Math.abs(firstLogicalY - expectedY) <= 1e-9) return false;
      const xScale = (lastCurvePoint.x - firstCurvePoint.x) / (domainMax - domainMin);
      const yScale = (firstCurvePoint.y - probeMappedY) / (firstLogicalY - expectedY);
      if (Math.abs(xScale) <= 1e-9) return false;
      return close(renderedSlope, slope * yScale / xScale, 0.02);
    })();
    if (
      !close(number(curve, "data-viz-curvature"), curvature)
      || !close(number(probe, "data-viz-x0"), probeX)
      || !close(number(probe, "data-viz-tangent-slope"), slope)
      || !close(number(tangent, "data-viz-slope"), slope)
      || !close(number(tangent, "data-viz-anchor-x"), probeX)
      || !close(number(readout, "data-viz-curvature"), curvature)
      || !close(number(readout, "data-viz-x0"), probeX)
      || !close(number(readout, "data-viz-y0"), expectedY)
      || !close(number(readout, "data-viz-tangent-slope"), slope)
      || !exactly(read(readout, "data-viz-formula"), expectedFormula)
      || read(readout, "data-viz-active-mode") !== "tangent"
    ) {
      issue("visible-state-mismatch", `${contract.labId} curve/probe/tangent/readout disagree with public tangent state.`);
    }
    if (
      !close(number(curve, "data-viz-curvature"), finiteRecordNumber(rawMetrics, "curvature"))
      || !close(number(probe, "data-viz-x0"), finiteRecordNumber(rawMetrics, "probeX"))
      || !close(number(probe, "data-viz-y0"), finiteRecordNumber(rawMetrics, "functionValue"))
      || !close(number(probe, "data-viz-tangent-slope"), finiteRecordNumber(rawMetrics, "tangentSlope"))
      || !close(number(tangent, "data-viz-slope"), finiteRecordNumber(rawMetrics, "tangentSlope"))
      || !close(number(tangent, "data-viz-anchor-y"), finiteRecordNumber(rawMetrics, "functionValue"))
      || !close(number(readout, "data-viz-y0"), finiteRecordNumber(rawMetrics, "functionValue"))
      || !close(number(readout, "data-viz-tangent-slope"), finiteRecordNumber(rawMetrics, "tangentSlope"))
    ) {
      issue("visible-raw-mismatch", `${contract.labId} visible curve/probe/tangent/readout disagree with raw tangent metrics.`);
    }
    if (
      !close(number(probe, "data-viz-y0"), expectedY)
      || !close(number(tangent, "data-viz-anchor-y"), expectedY)
      || !close(slope, curvature !== null && probeX !== null ? curvature * probeX : null)
      || !close(number(probe, "data-viz-mapped-x"), number(probe, "cx"))
      || !close(number(probe, "data-viz-mapped-y"), number(probe, "cy"))
      || !close(number(curve, "data-viz-probe-mapped-x"), number(probe, "cx"))
      || !close(number(curve, "data-viz-probe-mapped-y"), number(probe, "cy"))
      || !curvePoints.some((point) => close(point.x, number(curve, "data-viz-probe-mapped-x"), 1e-3) && close(point.y, number(curve, "data-viz-probe-mapped-y"), 1e-3))
      || !pathMatchesRawSeries(curve)
      || tangentPoints.length !== 2
      || !close(tangentPoints[0]?.x ?? null, number(tangent, "data-viz-rendered-start-x"), 1e-3)
      || !close(tangentPoints[0]?.y ?? null, number(tangent, "data-viz-rendered-start-y"), 1e-3)
      || !close(tangentPoints[1]?.x ?? null, number(tangent, "data-viz-rendered-end-x"), 1e-3)
      || !close(tangentPoints[1]?.y ?? null, number(tangent, "data-viz-rendered-end-y"), 1e-3)
      || !tangentScreenSlopeMatchesLogicalSlope
      || tangentPoints.length !== 2
      || (() => {
        const start = tangentPoints[0];
        const end = tangentPoints[1];
        const probeXRendered = number(probe, "cx");
        const probeYRendered = number(probe, "cy");
        if (!start || !end || probeXRendered === null || probeYRendered === null) return true;
        const cross = (end.x - start.x) * (probeYRendered - start.y)
          - (end.y - start.y) * (probeXRendered - start.x);
        // Production SVG paths are intentionally serialized to one decimal
        // place; allow only that renderer quantization, not visible detachment.
        return Math.abs(cross) > 0.1 * Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
      })()
    ) {
      issue("visible-geometry", `${contract.labId} tangent anchor or slope is not generated by its plotted quadratic.`);
    }
  }

  return issues;
}

export type HKVisualizationPassThroughCrossStatePaintedGeometryIssue = Readonly<{
  code: "cross-state-observation-invalid" | "cross-state-painted-geometry" | "cross-state-state-mismatch";
  message: string;
}>;

/**
 * Independent two-state evidence. A renderer that updates its JSON/readout but
 * leaves the old SVG path painted must fail this oracle.
 */
export function auditHkVisualizationPassThroughCrossStatePaintedGeometry(
  contract: HKVisualizationPassThroughMathOracleContract,
  before: HKVisualizationPassThroughVisibleMathObservation,
  after: HKVisualizationPassThroughVisibleMathObservation
): HKVisualizationPassThroughCrossStatePaintedGeometryIssue[] {
  const issues: HKVisualizationPassThroughCrossStatePaintedGeometryIssue[] = [];
  const issue = (
    code: HKVisualizationPassThroughCrossStatePaintedGeometryIssue["code"],
    message: string
  ) => issues.push({ code, message });
  if (
    auditHkVisualizationPassThroughVisibleMathObservation(contract, before).length > 0
    || auditHkVisualizationPassThroughVisibleMathObservation(contract, after).length > 0
  ) {
    issue("cross-state-observation-invalid", `${contract.labId} cross-state inputs must each pass the single-state visible oracle.`);
  }
  const attribute = (
    observation: HKVisualizationPassThroughVisibleMathObservation,
    name: string,
    key: string,
    index = 0
  ) => observation.marks[name]?.[index]?.attributes[key] ?? null;
  const stateNumber = (
    observation: HKVisualizationPassThroughVisibleMathObservation,
    key: string
  ) => {
    const value = observation.state[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  const sameViewport = !contract.fixedViewport || [
    "data-viz-viewport-id",
    "data-viz-domain-x-min",
    "data-viz-domain-x-max",
    "data-viz-domain-y-min",
    "data-viz-domain-y-max",
    "data-viz-x-ticks",
    "data-viz-y-ticks",
    "x",
    "y",
    "width",
    "height"
  ].every((key) => (
    attribute(before, "semantic fixed viewport", key)
      === attribute(after, "semantic fixed viewport", key)
  ));
  if (!sameViewport) {
    issue("cross-state-painted-geometry", `${contract.labId} changed the viewport instead of visibly moving geometry in one fixed frame.`);
  }

  if (contract.invariant.family === "displayed-distribution-summary") {
    const beforeMean = stateNumber(before, "mean");
    const afterMean = stateNumber(after, "mean");
    const beforeSpread = stateNumber(before, "spread");
    const afterSpread = stateNumber(after, "spread");
    const meanChanged = beforeMean !== null && afterMean !== null && beforeMean !== afterMean;
    const spreadChanged = beforeSpread !== null && afterSpread !== null && beforeSpread !== afterSpread;
    if (!meanChanged && !spreadChanged) {
      issue("cross-state-state-mismatch", `${contract.labId} cross-state distribution evidence did not change mean or spread.`);
      return issues;
    }
    if (
      attribute(before, "distribution summary curve", "d")
        === attribute(after, "distribution summary curve", "d")
    ) {
      issue("cross-state-painted-geometry", `${contract.labId} distribution parameters changed but its painted curve path did not.`);
    }
    if (meanChanged && (
      attribute(before, "distribution mean", "x1") === attribute(after, "distribution mean", "x1")
      || attribute(before, "distribution spread band", "x") === attribute(after, "distribution spread band", "x")
    )) {
      issue("cross-state-painted-geometry", `${contract.labId} mean changed but the painted mean/band position did not move.`);
    }
    if (spreadChanged && (
      attribute(before, "distribution spread band", "width") === attribute(after, "distribution spread band", "width")
      || attribute(before, "distribution left spread marker", "cx") === attribute(after, "distribution left spread marker", "cx")
      || attribute(before, "distribution right spread marker", "cx") === attribute(after, "distribution right spread marker", "cx")
    )) {
      issue("cross-state-painted-geometry", `${contract.labId} spread changed but its painted band/endpoints did not widen or narrow.`);
    }
  } else if (contract.invariant.family === "selected-function-curve") {
    const beforeScale = stateNumber(before, "scale");
    const afterScale = stateNumber(after, "scale");
    const beforeShift = stateNumber(before, "verticalShift");
    const afterShift = stateNumber(after, "verticalShift");
    if (
      beforeScale === null || afterScale === null || beforeScale <= 0 || afterScale <= 0
      || beforeShift === null || afterShift === null
      || (beforeScale === afterScale && beforeShift === afterShift)
    ) {
      issue("cross-state-state-mismatch", `${contract.labId} cross-state quadratic evidence requires two distinct positive-a states.`);
      return issues;
    }
    const sameCurve = attribute(before, "advanced primary curve", "d")
      === attribute(after, "advanced primary curve", "d");
    const everySampleUnmoved = [0, 1, 2].every((index) => (
      attribute(before, "advanced curve sample", "cy", index)
        === attribute(after, "advanced curve sample", "cy", index)
    ));
    if (sameCurve || everySampleUnmoved) {
      issue("cross-state-painted-geometry", `${contract.labId} positive a/shift changed but its painted curve samples did not move.`);
    }
  } else {
    issue("cross-state-state-mismatch", `${contract.labId} has no fixed-frame cross-state oracle contract.`);
  }
  return issues;
}

/**
 * Static schema for the seven shared configured renderers used by HK lessons.
 *
 * This registry is planning evidence only: it does not execute a browser or a
 * mathematical oracle and therefore makes no runtime PASS claim.
 */
export const HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS:
readonly HKVisualizationPassThroughMathOracleContract[] = Object.freeze(
  CONTRACT_SPECS.map(buildContract)
);

export type HKVisualizationPassThroughMathOracleValidationCode =
  | "catalog-model-drift"
  | "duplicate-topic"
  | "empty-selector"
  | "extra-topic"
  | "generic-mark-only-evidence"
  | "lesson-contract-drift"
  | "missing-topic"
  | "missing-topic-specific-evidence"
  | "phantom-state-key"
  | "raw-renderer-state-contract"
  | "reset-state-key-drift"
  | "shared-model-topic-mix"
  | "unknown-invariant-family";

export type HKVisualizationPassThroughMathOracleValidationIssue = Readonly<{
  code: HKVisualizationPassThroughMathOracleValidationCode;
  labId: string;
  message: string;
}>;

const EXPECTED_TOPIC_SET = new Set<string>(HK_PASS_THROUGH_LAB_IDS);
const INVARIANT_FAMILY_SET = new Set<string>(
  HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_FAMILIES
);

function sameOrderedStrings(left: readonly string[], right: readonly string[]) {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function hasDuplicates(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

function expectedFormulaSelector(spec: ContractSpec, rootSelector: string) {
  return formulaSelectorFor(rootSelector, spec.labId, spec.formulaSurface);
}

export function validateHKVisualizationPassThroughMathOracleContracts(
  contracts: readonly HKVisualizationPassThroughMathOracleContract[]
): HKVisualizationPassThroughMathOracleValidationIssue[] {
  const issues: HKVisualizationPassThroughMathOracleValidationIssue[] = [];
  const counts = new Map<string, number>();
  const issue = (
    code: HKVisualizationPassThroughMathOracleValidationCode,
    labId: string,
    message: string
  ) => issues.push({ code, labId, message });

  for (const contract of contracts) {
    counts.set(contract.labId, (counts.get(contract.labId) ?? 0) + 1);
    const spec = SPEC_BY_ID.get(contract.labId);
    if (!EXPECTED_TOPIC_SET.has(contract.labId) || !spec) {
      issue("extra-topic", contract.labId, "Topic is not in the exact seven-ID HK pass-through registry.");
      continue;
    }

    if (!INVARIANT_FAMILY_SET.has(contract.invariant.family)) {
      issue(
        "unknown-invariant-family",
        contract.labId,
        `Unknown pass-through invariant family: ${contract.invariant.family}.`
      );
    }

    const lesson = HK_VISUALIZATION_LESSON_CONTRACTS[spec.labId];
    const productionLab = visualizationLabByLabId.get(spec.labId);
    const modeIds = contract.modeSelectors.map(({ modeId }) => modeId);
    const modeSelectors = contract.modeSelectors.map(({ selector }) => selector);
    const controlIds = contract.controlSelectors.map(({ controlId }) => controlId);
    const controlSelectors = contract.controlSelectors.map(({ selector }) => selector);
    if (
      lesson.kind !== "pass-through"
      || contract.kind !== lesson.kind
      || contract.moduleId !== lesson.moduleId
      || contract.topicId !== lesson.topicId
      || !sameOrderedStrings(contract.lessonStateKeys, lesson.stateKeys)
      || !sameOrderedStrings(modeIds, lesson.modeIds)
      || !sameOrderedStrings(modeSelectors, lesson.selectors.modes)
      || !sameOrderedStrings(controlIds, lesson.controlIds)
      || !sameOrderedStrings(controlSelectors, lesson.selectors.controls)
      || contract.rootSelector !== lesson.selectors.workspace
      || contract.stateSelector !== lesson.selectors.state
      || contract.reset.selector !== lesson.selectors.reset
      || !sameOrderedStrings(contract.forbiddenClaims, lesson.lessonCopy.mustNotPromise)
    ) {
      issue(
        "lesson-contract-drift",
        contract.labId,
        "Oracle modes, controls, state, selectors, identity, or forbidden claims drifted from the production lesson contract."
      );
    }

    if (
      !productionLab
      || contract.templateId !== productionLab.templateId
      || contract.catalogVariant !== productionLab.templateConfig.variant
      || contract.templateId !== spec.templateId
      || contract.modelId !== spec.modelId
    ) {
      issue(
        "catalog-model-drift",
        contract.labId,
        "Configured template, variant, or semantic model drifted from the frozen catalog mapping."
      );
    }

    const expectedRoot = rootFor(contract.labId);
    const expectedModel = modelSelectorFor(
      expectedRoot,
      contract.labId,
      spec.templateId
    );
    const exactTopicToken = `data-viz-configured-topic="${contract.labId}"`;
    const expectedRawAttribute = spec.formulaSurface === "primary"
      ? "data-viz-state-json"
      : "data-viz-math-state";
    const expectedRawName = spec.formulaSurface === "primary"
      ? "configured semantic primary marks"
      : "configured semantic secondary model";
    const expectedRawBroadOwnerSelector = `${expectedRoot} [data-viz-name="configured semantic primary marks"][data-viz-state-json], ${expectedRoot} [data-viz-name="configured semantic secondary model"][data-viz-math-state]`;
    const expectedRawIdentitySelector = `${expectedRoot} [data-viz-name="${expectedRawName}"][data-viz-semantic-family="${spec.modelId}"][data-viz-semantic-variant="${spec.labId}"][${expectedRawAttribute}]`;
    const selectors = [
      contract.rootSelector,
      contract.modelSelector,
      contract.stateSelector,
      contract.formulaSelector,
      contract.reset.selector,
      contract.rawRendererState.broadOwnerSelector,
      contract.rawRendererState.identitySelector,
      contract.rawRendererState.selector,
      ...modeSelectors,
      ...controlSelectors,
      ...contract.namedVisibleMarks.map(({ selector }) => selector),
      ...contract.topicEvidenceSelectors
    ];
    if (selectors.some((selector) => selector.trim().length === 0)) {
      issue("empty-selector", contract.labId, "Every pass-through selector must be nonempty.");
    }
    if (
      contract.topicId !== contract.labId
      || contract.rootSelector !== expectedRoot
      || contract.modelSelector !== expectedModel
      || !contract.modelSelector.includes(exactTopicToken)
    ) {
      issue(
        "shared-model-topic-mix",
        contract.labId,
        "Configured model identity is not isolated to the exact labId/topicId pair."
      );
    }

    if (
      contract.rawRendererState.attribute !== expectedRawAttribute
      || contract.rawRendererState.expectedFamily !== spec.modelId
      || contract.rawRendererState.expectedKind !== rawRendererKindByInvariant[spec.invariantFamily]
      || contract.rawRendererState.broadOwnerSelector !== expectedRawBroadOwnerSelector
      || contract.rawRendererState.identitySelector !== expectedRawIdentitySelector
      || contract.rawRendererState.selector !== expectedRawBroadOwnerSelector
    ) {
      issue(
        "raw-renderer-state-contract",
        contract.labId,
        "Raw renderer state must use one exact topic/family/kind-scoped semantic owner and canonical JSON attribute."
      );
    }
    if (
      contract.stateSelector !== `${expectedRoot} [data-viz-configured-state]`
      || contract.formulaSelector !== expectedFormulaSelector(spec, expectedRoot)
      || contract.reset.selector !== resetSelectorFor(expectedRoot, contract.labId)
    ) {
      issue(
        "lesson-contract-drift",
        contract.labId,
        "State, formula, or reset selector drifted from the exact topic root."
      );
    }

    if (
      contract.topicEvidenceSelectors.length === 0
      || contract.topicEvidenceSelectors.some((selector) => (
        !selector.startsWith(expectedRoot) || !selector.includes(exactTopicToken)
      ))
    ) {
      issue(
        "missing-topic-specific-evidence",
        contract.labId,
        "Shared configured evidence must carry the exact topic identity, not only a shared template/model name."
      );
    }

    if (
      contract.namedVisibleMarks.length === 0
      || contract.namedVisibleMarks.some(({ name, selector }) => (
        name.trim().length === 0
        || !selector.startsWith(expectedRoot)
        || !selector.includes(`[data-viz-name="${name}"]`)
      ))
    ) {
      issue(
        "generic-mark-only-evidence",
        contract.labId,
        "Visible mathematical evidence must use nonempty, root-scoped data-viz-name selectors."
      );
    }

    if (
      contract.visibleMathMarks.length === 0
      || contract.visibleMathMarks.some(({ name, requiredAttributes, selector }) => (
        name.trim().length === 0
        || !selector.startsWith(expectedRoot)
        || !selector.includes(`[data-viz-name="${name}"]`)
        || requiredAttributes.length === 0
        || hasDuplicates(requiredAttributes)
        || requiredAttributes.some((attribute) => attribute.trim().length === 0)
      ))
      || hasDuplicates(contract.visibleMathMarks.map(({ name }) => name))
    ) {
      issue(
        "generic-mark-only-evidence",
        contract.labId,
        "Visible-math evidence must use unique root-scoped marks with nonempty unique numeric/geometry attributes."
      );
    }

    const allowedModeSet = new Set(modeIds);
    if (contract.namedVisibleMarks.some(({ visibleInModes }) => (
      modeIds.length === 0
        ? visibleInModes.length !== 0
        : visibleInModes.length === 0
          || visibleInModes.some((modeId) => !allowedModeSet.has(modeId))
    ))) {
      issue(
        "generic-mark-only-evidence",
        contract.labId,
        "Every named mark must identify at least one declared visible mode."
      );
    }

    if (
      !sameOrderedStrings(contract.requiredStateKeys, spec.requiredStateKeys)
      || !sameOrderedStrings(contract.allowedStateKeys, spec.allowedStateKeys)
      || hasDuplicates(contract.requiredStateKeys)
      || hasDuplicates(contract.allowedStateKeys)
      || contract.requiredStateKeys.some((key) => !contract.allowedStateKeys.includes(key))
    ) {
      issue(
        "phantom-state-key",
        contract.labId,
        "Required/allowed mathematical state keys drifted or admitted an unreviewed phantom key."
      );
    }
    if (!sameOrderedStrings(Object.keys(contract.reset.state), contract.requiredStateKeys)) {
      issue(
        "reset-state-key-drift",
        contract.labId,
        "Reset state must contain every required mathematical state key in canonical order, with no extras."
      );
    }

    for (const alias of contract.compatibilityAliases) {
      if (
        alias.precedence !== "formal-fields"
        || !contract.allowedStateKeys.includes(alias.aliasKey)
        || alias.canonicalKeys.length === 0
        || alias.canonicalKeys.some((key) => !contract.requiredStateKeys.includes(key))
      ) {
        issue(
          "phantom-state-key",
          contract.labId,
          `Compatibility alias ${alias.aliasKey} does not defer to reviewed formal state fields.`
        );
      }
    }

    for (const domain of contract.dynamicControlDomains) {
      if (
        !controlIds.includes(domain.controlId)
        || !controlIds.includes(domain.controllerControlId)
        || !contract.requiredStateKeys.includes(domain.stateKey)
        || !contract.requiredStateKeys.includes(domain.maximumStateKey)
        || domain.minimum !== 0
        || domain.inclusiveMaximum !== true
        || domain.atomicProjection !== true
        || domain.noStaleValueResurrection !== true
      ) {
        issue(
          "phantom-state-key",
          contract.labId,
          "Dynamic state-domain metadata is not tied to reviewed controls and formal mathematical fields."
        );
      }
    }
  }

  for (const [labId, count] of counts) {
    if (count > 1) {
      issue("duplicate-topic", labId, `Pass-through topic appears ${count} times.`);
    }
  }
  for (const labId of HK_PASS_THROUGH_LAB_IDS) {
    if (!counts.has(labId)) {
      issue("missing-topic", labId, "Pass-through topic has no math-oracle contract.");
    }
  }

  return issues;
}

const canonicalIssues = validateHKVisualizationPassThroughMathOracleContracts(
  HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS
);
if (canonicalIssues.length > 0) {
  throw new Error(
    `Invalid HK pass-through math-oracle registry: ${canonicalIssues
      .map(({ code, labId }) => `${labId}:${code}`)
      .join(", ")}`
  );
}
