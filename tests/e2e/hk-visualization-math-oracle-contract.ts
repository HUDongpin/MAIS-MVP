import {
  HK_DEDICATED_LAB_IDS,
  type HKDedicatedLabId
} from "../../components/visualizations/hk/hkVisualizationLabRegistry";

export const HK_VISUALIZATION_MATH_ORACLE_FAMILIES = Object.freeze([
  "algebraic-equivalence",
  "area-decomposition",
  "conservation-count",
  "coordinate-transform",
  "data-synchronization",
  "directed-number",
  "discrete-number-theory",
  "function-graph",
  "geometric-invariant",
  "measurement-conversion",
  "multi-step-consistency",
  "multiplicative-scaling",
  "pattern-sequence",
  "positional-decomposition",
  "probability-model"
] as const);

export type HKVisualizationMathOracleFamily =
  (typeof HK_VISUALIZATION_MATH_ORACLE_FAMILIES)[number];

export type HKVisualizationMathOracleStateValue =
  | boolean
  | number
  | string
  | readonly boolean[]
  | readonly number[]
  | readonly string[];

export type HKVisualizationMathOracleResetState = Readonly<
  Record<string, HKVisualizationMathOracleStateValue>
>;

export type HKVisualizationMathOracleModeReference = Readonly<{
  groupId: string;
  modeId: string;
}>;

export type HKVisualizationMathOracleModeGroup = Readonly<{
  groupId: string;
  modeIds: readonly string[];
  selector: string;
  modeSelectors: ReadonlyArray<Readonly<{ modeId: string; selector: string }>>;
  parentMode?: HKVisualizationMathOracleModeReference;
  dependsOnGroupId?: string;
}>;

export type HKVisualizationMathOracleConditionalControl = Readonly<{
  controlId: string;
  selector: string;
  parentMode?: HKVisualizationMathOracleModeReference;
}>;

export type HKVisualizationMathOracleDynamicControlDependency = Readonly<{
  controlId: string;
  selector: string;
  dependsOnControlId: string;
}>;

export type HKVisualizationMathOracleStateContract = Readonly<{
  canonicalKeys: readonly string[];
  selector: string;
  selectorKeys: readonly string[];
  reset: HKVisualizationMathOracleResetState;
}>;

export type HKVisualizationMathOracleContract = Readonly<{
  labId: string;
  surface: "primary-dedicated-v1" | "secondary-dedicated-v1";
  oracleFamily: string;
  rootSelector: string;
  state: HKVisualizationMathOracleStateContract;
  formulaSelector: string;
  evidenceSelectors: readonly string[];
  modeTopology: readonly HKVisualizationMathOracleModeGroup[];
  conditionalControls: readonly HKVisualizationMathOracleConditionalControl[];
  dynamicControlDependencies: readonly HKVisualizationMathOracleDynamicControlDependency[];
  resetSelector: string;
}>;

type ModeGroupSpec = Readonly<{
  groupId: string;
  modeIds: readonly string[];
  modeSelectorAttribute?: "data-viz-mode" | "data-viz-reference-angle" | "data-viz-representation";
  parentMode?: HKVisualizationMathOracleModeReference;
  dependsOnGroupId?: string;
}>;

type ConditionalControlSpec = Readonly<{
  controlId: string;
  parentMode: HKVisualizationMathOracleModeReference;
}>;

type DynamicControlDependencySpec = Readonly<{
  controlId: string;
  dependsOnControlId: string;
}>;

type ContractOptions = Readonly<{
  modeTopology?: readonly ModeGroupSpec[];
  conditionalControls?: readonly ConditionalControlSpec[];
  dynamicControlDependencies?: readonly DynamicControlDependencySpec[];
}>;

const primaryRoot = (labId: string) => (
  `[data-hk-viz-model="primary-dedicated-v1"][data-hk-viz-topic="${labId}"]`
);

const secondaryRoot = (labId: string) => (
  `[data-hk-viz-model="secondary-dedicated-v1"][data-hk-viz-topic="${labId}"]`
);

const modeGroup = (
  groupId: string,
  modeIds: readonly string[],
  options: Pick<ModeGroupSpec, "parentMode" | "dependsOnGroupId" | "modeSelectorAttribute"> = {}
): ModeGroupSpec => ({ groupId, modeIds, ...options });

const mode = (groupId: string, modeId: string): HKVisualizationMathOracleModeReference => ({
  groupId,
  modeId
});

const conditional = (
  controlId: string,
  parentMode: HKVisualizationMathOracleModeReference
): ConditionalControlSpec => ({ controlId, parentMode });

const dynamic = (
  controlId: string,
  dependsOnControlId: string
): DynamicControlDependencySpec => ({ controlId, dependsOnControlId });

function dedicatedContract(
  surface: HKVisualizationMathOracleContract["surface"],
  labId: HKDedicatedLabId,
  oracleFamily: HKVisualizationMathOracleFamily,
  canonicalKeys: readonly string[],
  reset: HKVisualizationMathOracleResetState,
  evidenceNames: readonly string[],
  options: ContractOptions = {}
): HKVisualizationMathOracleContract {
  const rootSelector = surface === "primary-dedicated-v1"
    ? primaryRoot(labId)
    : secondaryRoot(labId);
  const modeTopology = (options.modeTopology ?? []).map((group) => {
    const { modeSelectorAttribute = "data-viz-mode", ...topology } = group;
    return {
      ...topology,
      selector: `${rootSelector} [data-viz-mode-group="${group.groupId}"]`,
      modeSelectors: group.modeIds.map((modeId) => ({
        modeId,
        selector: `${rootSelector} [data-viz-mode-group="${group.groupId}"][${modeSelectorAttribute}="${modeId}"]`
      }))
    };
  });
  const conditionalControls = (options.conditionalControls ?? []).map((control) => ({
    ...control,
    selector: `${rootSelector} [data-viz-parameter="${control.controlId}"]`
  }));
  const dynamicControlDependencies = (options.dynamicControlDependencies ?? []).map((dependency) => ({
    ...dependency,
    selector: `${rootSelector} [data-viz-parameter="${dependency.controlId}"]`
  }));

  return Object.freeze({
    labId,
    surface,
    oracleFamily,
    rootSelector,
    state: Object.freeze({
      canonicalKeys: Object.freeze([...canonicalKeys]),
      selector: `${rootSelector}[data-hk-viz-state]`,
      selectorKeys: Object.freeze([...canonicalKeys]),
      reset: Object.freeze(reset)
    }),
    formulaSelector: surface === "primary-dedicated-v1"
      ? `${rootSelector} [data-hk-viz-formula="${labId}"]`
      : `${rootSelector} [data-viz-formula][data-viz-formula-topic="${labId}"]`,
    evidenceSelectors: Object.freeze(evidenceNames.map((name) => (
      `${rootSelector} [data-viz-name="${name}"]`
    ))),
    modeTopology: Object.freeze(modeTopology),
    conditionalControls: Object.freeze(conditionalControls),
    dynamicControlDependencies: Object.freeze(dynamicControlDependencies),
    resetSelector: `${rootSelector} [data-viz-reset-model][data-viz-reset-module-id="configured-visualization-lab"][data-viz-reset-topic-id="${labId}"]`
  });
}

const primary = (
  labId: HKDedicatedLabId,
  oracleFamily: HKVisualizationMathOracleFamily,
  canonicalKeys: readonly string[],
  reset: HKVisualizationMathOracleResetState,
  evidenceNames: readonly string[],
  options?: ContractOptions
) => dedicatedContract(
  "primary-dedicated-v1",
  labId,
  oracleFamily,
  canonicalKeys,
  reset,
  evidenceNames,
  options
);

const secondary = (
  labId: HKDedicatedLabId,
  oracleFamily: HKVisualizationMathOracleFamily,
  canonicalKeys: readonly string[],
  reset: HKVisualizationMathOracleResetState,
  evidenceNames: readonly string[],
  mainModeGroup: "model" | "ratio" | "workflow",
  mainModeIds: readonly string[],
  options: ContractOptions = {}
) => dedicatedContract(
  "secondary-dedicated-v1",
  labId,
  oracleFamily,
  canonicalKeys,
  reset,
  evidenceNames,
  {
    ...options,
    modeTopology: [modeGroup(mainModeGroup, mainModeIds), ...(options.modeTopology ?? [])]
  }
);

/**
 * Static oracle-planning registry for the 44 dedicated Hong Kong labs.
 *
 * This file deliberately does not execute a browser or claim that an oracle
 * passed. It freezes the state/selector/reset/topology inputs that a later
 * browser executor must observe before evaluating topic-specific mathematics.
 */
export const HK_VISUALIZATION_MATH_ORACLE_CONTRACTS: readonly HKVisualizationMathOracleContract[] = Object.freeze([
  primary(
    "p1-counting-number-bonds",
    "conservation-count",
    ["total", "knownPart"],
    { total: 12, knownPart: 7 },
    ["counter-set"],
    { dynamicControlDependencies: [dynamic("knownPart", "total")] }
  ),
  primary(
    "p1-addition-subtraction",
    "directed-number",
    ["operation", "start", "step"],
    { operation: "add", start: 6, step: 5 },
    ["number-line"],
    {
      modeTopology: [modeGroup("operation", ["add", "subtract"])],
      dynamicControlDependencies: [dynamic("step", "start")]
    }
  ),
  primary(
    "p1-shapes-patterns",
    "pattern-sequence",
    ["patternRule", "revealedTerms"],
    { patternRule: "AB", revealedTerms: 6 },
    ["shape-sequence"],
    { modeTopology: [modeGroup("pattern-rule", ["AB", "ABC", "AAB"])] }
  ),
  primary(
    "p1-measurement-time",
    "measurement-conversion",
    ["mode", "length", "hour", "halfHour"],
    { mode: "measure", length: 7, hour: 3, halfHour: false },
    ["unit-ruler"],
    {
      modeTopology: [
        modeGroup("model", ["measure", "time"]),
        modeGroup("minutes", ["whole", "half"], { parentMode: mode("model", "time") })
      ],
      conditionalControls: [
        conditional("length", mode("model", "measure")),
        conditional("hour", mode("model", "time"))
      ]
    }
  ),
  primary(
    "p2-place-value",
    "positional-decomposition",
    ["number"],
    { number: 347 },
    ["place-value-table"]
  ),
  primary(
    "p2-money-time",
    "measurement-conversion",
    ["mode", "price", "payment", "hour", "halfHour"],
    { mode: "money", price: 32, payment: 50, hour: 9, halfHour: true },
    ["payment-bar"],
    {
      modeTopology: [
        modeGroup("model", ["money", "time"]),
        modeGroup("minutes", ["whole", "half"], { parentMode: mode("model", "time") })
      ],
      conditionalControls: [
        conditional("price", mode("model", "money")),
        conditional("payment", mode("model", "money")),
        conditional("hour", mode("model", "time"))
      ],
      dynamicControlDependencies: [dynamic("payment", "price")]
    }
  ),
  primary(
    "p2-length-data",
    "measurement-conversion",
    ["displayMode", "target", "tool", "estimateCm", "measuredCm", "measuredMetres", "measuredRemainderCm", "pictogramBlueCount"],
    {
      displayMode: "metres",
      target: "desk",
      tool: "metre-ruler",
      estimateCm: 120,
      measuredCm: 110,
      measuredMetres: 1,
      measuredRemainderCm: 10,
      pictogramBlueCount: 4
    },
    ["metre-reference"],
    {
      modeTopology: [
        modeGroup("model", ["metres", "pictogram"]),
        modeGroup("target", ["desk", "classroom-width", "playground-path"], { parentMode: mode("model", "metres") }),
        modeGroup("tool", ["metre-ruler", "tape-measure", "trundle-wheel"], {
          parentMode: mode("model", "metres"),
          dependsOnGroupId: "target"
        })
      ],
      conditionalControls: [
        conditional("estimateCm", mode("model", "metres")),
        conditional("measuredCm", mode("model", "metres")),
        conditional("pictogramBlueCount", mode("model", "pictogram"))
      ]
    }
  ),
  primary(
    "p3-multiplication-division",
    "multiplicative-scaling",
    ["mode", "groups", "itemsPerGroup"],
    { mode: "multiply", groups: 4, itemsPerGroup: 3 },
    ["multiplication-array"],
    { modeTopology: [modeGroup("operation", ["multiply", "share"])] }
  ),
  primary(
    "p3-measurement",
    "measurement-conversion",
    ["model", "quantityType", "baseValue", "unit", "selectedCategory"],
    { model: "measurement", quantityType: "length", baseValue: 250, unit: "small", selectedCategory: "B" },
    ["measurement-scale"],
    {
      modeTopology: [
        modeGroup("model", ["measurement", "bar-chart"]),
        modeGroup("quantity", ["length", "mass", "capacity"], { parentMode: mode("model", "measurement") }),
        modeGroup("displayed-unit", ["small", "large"], { parentMode: mode("model", "measurement") }),
        modeGroup("bar-category", ["A", "B", "C", "D"], { parentMode: mode("model", "bar-chart") })
      ],
      conditionalControls: [conditional("baseValue", mode("model", "measurement"))]
    }
  ),
  primary(
    "p3-geometry-patterns",
    "geometric-invariant",
    ["shapeFamily", "shapeType"],
    { shapeFamily: "quadrilateral", shapeType: "rectangle" },
    ["shape-model"],
    {
      modeTopology: [
        modeGroup("shape-family", ["quadrilateral", "triangle"]),
        modeGroup(
          "shape-example",
          ["rectangle", "square", "parallelogram", "trapezium", "triangle-different", "triangle-two-equal", "triangle-three-equal"],
          { dependsOnGroupId: "shape-family" }
        )
      ]
    }
  ),
  primary(
    "p4-large-numbers",
    "discrete-number-theory",
    ["mode", "firstNumber", "secondNumber", "candidateDivisor"],
    { mode: "factor-pairs", firstNumber: 24, secondNumber: 18, candidateDivisor: 6 },
    ["factor-pair-array"],
    {
      modeTopology: [modeGroup("model", ["factor-pairs", "common-hcf-lcm"])],
      conditionalControls: [
        conditional("candidateDivisor", mode("model", "factor-pairs")),
        conditional("secondNumber", mode("model", "common-hcf-lcm"))
      ],
      dynamicControlDependencies: [dynamic("candidateDivisor", "firstNumber")]
    }
  ),
  primary(
    "p4-decimals",
    "directed-number",
    ["decimalValue"],
    { decimalValue: 1.37 },
    ["decimal-number-line"]
  ),
  primary(
    "p4-angles",
    "geometric-invariant",
    ["mode", "familyShape", "composition", "rightAngleCount"],
    { mode: "families", familyShape: "rhombus", composition: "rectangle-diagonal", rightAngleCount: 0 },
    ["quadrilateral-outline"],
    {
      modeTopology: [
        modeGroup("model", ["families", "composition"]),
        modeGroup("family-shape", ["parallelogram", "rectangle", "rhombus", "square"], { parentMode: mode("model", "families") }),
        modeGroup("composition", ["rectangle-diagonal", "square-diagonal", "trapeziums-rectangle"], { parentMode: mode("model", "composition") })
      ]
    }
  ),
  primary(
    "p4-perimeter-area",
    "geometric-invariant",
    ["length", "width", "focus"],
    { length: 7, width: 4, focus: "both" },
    ["rectangle-grid"],
    { modeTopology: [modeGroup("focus", ["both", "perimeter", "area"])] }
  ),
  primary(
    "p5-fractions-operations",
    "algebraic-equivalence",
    ["operation", "termCount", "firstFraction", "secondFraction", "thirdFraction"],
    { operation: "add", termCount: "three", firstFraction: "1/2", secondFraction: "1/3", thirdFraction: "1/4" },
    ["source-bars"],
    {
      modeTopology: [
        modeGroup("operation", ["add", "subtract"]),
        modeGroup("term-count", ["two", "three"])
      ],
      conditionalControls: [
        conditional("thirdNumerator", mode("term-count", "three")),
        conditional("thirdDenominator", mode("term-count", "three"))
      ],
      dynamicControlDependencies: [
        dynamic("firstNumerator", "firstDenominator"),
        dynamic("secondNumerator", "secondDenominator"),
        dynamic("thirdNumerator", "thirdDenominator")
      ]
    }
  ),
  primary(
    "p5-volume",
    "multiplicative-scaling",
    ["length", "width", "height", "visibleLayers"],
    { length: 4, width: 3, height: 3, visibleLayers: 2 },
    ["layer-stack"],
    { dynamicControlDependencies: [dynamic("visibleLayers", "height")] }
  ),
  primary(
    "p5-rates",
    "multiplicative-scaling",
    ["totalPrice", "itemCount", "targetCount"],
    { totalPrice: 24, itemCount: 4, targetCount: 7 },
    ["equal-price-groups"]
  ),
  primary(
    "p5-charts-averages",
    "data-synchronization",
    ["selectedCategory", "firstSeries", "secondSeries"],
    { selectedCategory: "B", firstSeries: [6, 8, 5, 9], secondSeries: [4, 7, 8, 6] },
    ["paired-data-bars"],
    { modeTopology: [modeGroup("category", ["A", "B", "C", "D"])] }
  ),
  primary(
    "p6-percentages",
    "multiplicative-scaling",
    ["mode", "percent", "baseAmount", "direction"],
    { mode: "equivalence", percent: 37, baseAmount: 200, direction: "increase" },
    ["hundred-grid"],
    {
      modeTopology: [
        modeGroup("model", ["equivalence", "given-change"]),
        modeGroup("direction", ["increase", "decrease"], { parentMode: mode("model", "given-change") })
      ],
      conditionalControls: [conditional("baseAmount", mode("model", "given-change"))]
    }
  ),
  primary(
    "p6-ratio-proportion",
    "data-synchronization",
    ["mode", "value1", "value2", "value3", "value4", "seriesCount", "seriesBShift"],
    { mode: "mean-fair-share", value1: 4, value2: 8, value3: 6, value4: 10, seriesCount: 1, seriesBShift: 2 },
    ["mean-fair-share"],
    {
      modeTopology: [
        modeGroup("model", ["mean-fair-share", "broken-line"]),
        modeGroup("series-count", ["1", "2"], { parentMode: mode("model", "broken-line") })
      ],
      conditionalControls: [conditional("seriesBShift", mode("series-count", "2"))]
    }
  ),
  primary(
    "p6-speed",
    "function-graph",
    ["speed", "time"],
    { speed: 12, time: 6 },
    ["constant-speed-line"]
  ),
  primary(
    "p6-pre-secondary-problem-solving",
    "multi-step-consistency",
    ["workflowStep", "budget", "count", "unitPrice", "extraCost"],
    { workflowStep: "represent", budget: 120, count: 3, unitPrice: 24, extraCost: 18 },
    ["bar-model"],
    { modeTopology: [modeGroup("workflow", ["represent", "plan", "solve", "check"])] }
  ),

  secondary(
    "integers",
    "directed-number",
    ["start", "operand", "activeMode"],
    { start: -3, operand: 8, activeMode: "add" },
    ["integer-number-line"],
    "model",
    ["add", "subtract"]
  ),
  secondary(
    "algebra-basics",
    "algebraic-equivalence",
    ["a", "b", "activeMode"],
    { a: 3, b: 8, activeMode: "equation" },
    ["algebra-solution"],
    "model",
    ["equation", "inverse", "check"]
  ),
  secondary(
    "angles",
    "geometric-invariant",
    ["ax", "ay", "bx", "by", "cx", "cy", "activeMode"],
    { ax: -4, ay: -2, bx: 4, by: -2, cx: 1, cy: 3, activeMode: "triangle" },
    ["angle-triangle"],
    "model",
    ["triangle", "straight", "point"],
    {
      dynamicControlDependencies: [
        dynamic("ax", "ay,bx,by,cx,cy"),
        dynamic("ay", "ax,bx,by,cx,cy"),
        dynamic("bx", "ax,ay,by,cx,cy"),
        dynamic("by", "ax,ay,bx,cx,cy"),
        dynamic("cx", "ax,ay,bx,by,cy"),
        dynamic("cy", "ax,ay,bx,by,cx")
      ]
    }
  ),
  secondary(
    "ratios",
    "multiplicative-scaling",
    ["a", "b", "k", "activeMode"],
    { a: 2, b: 3, k: 4, activeMode: "equivalent" },
    ["ratio-base"],
    "model",
    ["equivalent", "scale", "unit"]
  ),
  secondary(
    "linear-equations",
    "algebraic-equivalence",
    ["a", "b", "c", "activeMode"],
    { a: 3, b: 5, c: 20, activeMode: "equation" },
    ["equation-solution"],
    "model",
    ["equation", "subtract", "divide", "check"]
  ),
  secondary(
    "coordinates",
    "coordinate-transform",
    ["x1", "y1", "x2", "y2", "x3", "y3", "dx", "dy", "mirror", "activeMode"],
    { x1: -3, y1: -2, x2: 0, y2: 0, x3: 4, y3: 3, dx: 2, dy: 1, mirror: 0, activeMode: "plot" },
    ["coordinate-original-points"],
    "model",
    ["plot", "connect", "translate", "reflect"]
  ),
  secondary(
    "transformations",
    "coordinate-transform",
    ["dx", "dy", "mirror", "angle", "scale", "activeMode"],
    { dx: 3, dy: 2, mirror: 0, angle: 90, scale: 1.5, activeMode: "translate" },
    ["transform-original"],
    "model",
    ["translate", "reflect", "rotate-cw", "rotate-ccw", "enlarge"]
  ),
  secondary(
    "probability-s2",
    "probability-model",
    ["seed", "rolls", "activeMode"],
    { seed: 17, rolls: 0, activeMode: "compare" },
    ["probability-theory-line"],
    "model",
    ["compare", "counts"]
  ),
  secondary(
    "polynomials",
    "area-decomposition",
    ["x", "p", "q", "activeMode"],
    { x: 3, p: 2, q: 3, activeMode: "expand" },
    ["polynomial-whole"],
    "model",
    ["expand", "factor"]
  ),
  secondary(
    "quadratic-patterns",
    "function-graph",
    ["a", "b", "c", "activeMode"],
    { a: 1, b: -2, c: -3, activeMode: "graph" },
    ["quadratic-feature-state"],
    "model",
    ["graph", "features"]
  ),
  secondary(
    "identities-square-patterns",
    "area-decomposition",
    ["a", "b", "activeMode"],
    { a: 6, b: 2, activeMode: "square-sum" },
    ["identity-plus-square-check"],
    "model",
    ["square-sum", "square-difference", "difference-of-squares"],
    { dynamicControlDependencies: [dynamic("a", "b"), dynamic("b", "a")] }
  ),
  secondary(
    "trigonometry-basics",
    "geometric-invariant",
    ["theta", "hyp", "reference", "activeMode"],
    { theta: 35, hyp: 8, reference: 0, activeMode: "sin" },
    ["trig-triangle"],
    "ratio",
    ["sin", "cos", "tan"],
    {
      modeTopology: [modeGroup("reference-angle", ["left", "upper"], {
        modeSelectorAttribute: "data-viz-reference-angle"
      })]
    }
  ),
  secondary(
    "circles",
    "geometric-invariant",
    ["r", "theta", "activeMode"],
    { r: 5, theta: 100, activeMode: "radius" },
    ["circle-geometry-invariant"],
    "model",
    ["radius", "chord", "tangent", "theorem"]
  ),
  secondary(
    "arc-length-sector-area",
    "geometric-invariant",
    ["r", "theta", "activeMode"],
    { r: 5, theta: 90, activeMode: "arc" },
    ["circle-arc"],
    "model",
    ["arc", "sector"]
  ),
  secondary(
    "functions",
    "function-graph",
    ["a", "b", "input", "activeMode"],
    { a: 1, b: 0, input: 1, activeMode: "linear" },
    ["function-rule"],
    "model",
    ["linear", "quadratic", "exponential", "logarithmic"]
  ),
  secondary(
    "coordinate-geometry",
    "coordinate-transform",
    ["x1", "y1", "x2", "y2", "activeMode"],
    { x1: -3, y1: -2, x2: 4, y2: 3, activeMode: "gradient" },
    ["coordinate-coincidence-state"],
    "model",
    ["gradient", "distance", "midpoint"]
  ),
  secondary(
    "more-algebra",
    "algebraic-equivalence",
    ["x", "m", "n", "k", "activeMode"],
    { x: 3, m: 2, n: 3, k: 2, activeMode: "indices" },
    ["algebra-equality-check"],
    "model",
    ["indices", "identity", "rational"]
  ),
  secondary(
    "trigonometry-s5",
    "function-graph",
    ["amplitude", "period", "phase", "activeMode"],
    { amplitude: 2, period: 180, phase: 30, activeMode: "sin" },
    ["trig-wave"],
    "model",
    ["sin", "cos"]
  ),
  secondary(
    "probability-s5",
    "probability-model",
    ["red", "blue", "activeMode"],
    { red: 3, blue: 2, activeMode: "counting" },
    ["probability-at-least-one-red"],
    "model",
    ["counting", "conditional"]
  ),
  secondary(
    "statistics-s6",
    "data-synchronization",
    ["mean", "sd", "observed", "activeMode"],
    { mean: 50, sd: 10, observed: 70, activeMode: "distribution" },
    ["statistics-observed"],
    "model",
    ["distribution", "standardize"]
  ),
  secondary(
    "exam-revision",
    "multi-step-consistency",
    ["algebra", "geometry", "statistics", "marks", "pace", "activeMode"],
    { algebra: 55, geometry: 70, statistics: 40, marks: 4, pace: 1.5, activeMode: "priority" },
    ["revision-priority-bars"],
    "model",
    ["priority", "timing"]
  ),
  secondary(
    "mixed-problem-solving",
    "multi-step-consistency",
    ["rate", "time", "representation", "activeMode"],
    { rate: 12, time: 5, representation: 0, activeMode: "strategy" },
    ["mixed-model"],
    "workflow",
    ["strategy", "model", "check"],
    {
      modeTopology: [modeGroup("representation", ["diagram", "table", "equation", "graph"], {
        modeSelectorAttribute: "data-viz-representation"
      })]
    }
  )
]);

export type HKVisualizationMathOracleValidationCode =
  | "conditional-parent-mode-missing"
  | "conditional-parent-mode-unknown"
  | "duplicate-topic"
  | "empty-selector"
  | "extra-topic"
  | "generic-mark-only-evidence"
  | "missing-topic"
  | "mode-dependency-unknown"
  | "mode-parent-unknown"
  | "reset-state-key-drift"
  | "state-selector-key-drift"
  | "topic-selector-drift"
  | "unknown-family";

export type HKVisualizationMathOracleValidationIssue = Readonly<{
  code: HKVisualizationMathOracleValidationCode;
  labId: string;
  message: string;
}>;

const FAMILY_SET = new Set<string>(HK_VISUALIZATION_MATH_ORACLE_FAMILIES);
const EXPECTED_TOPIC_SET = new Set<string>(HK_DEDICATED_LAB_IDS);

const sameOrderedStrings = (left: readonly string[], right: readonly string[]) => (
  left.length === right.length && left.every((value, index) => value === right[index])
);

const selectorIsEmpty = (selector: string) => selector.trim().length === 0;

function expectedRoot(contract: HKVisualizationMathOracleContract) {
  return contract.surface === "primary-dedicated-v1"
    ? primaryRoot(contract.labId)
    : secondaryRoot(contract.labId);
}

function expectedFormula(contract: HKVisualizationMathOracleContract, rootSelector: string) {
  return contract.surface === "primary-dedicated-v1"
    ? `${rootSelector} [data-hk-viz-formula="${contract.labId}"]`
    : `${rootSelector} [data-viz-formula][data-viz-formula-topic="${contract.labId}"]`;
}

function expectedReset(contract: HKVisualizationMathOracleContract, rootSelector: string) {
  return `${rootSelector} [data-viz-reset-model][data-viz-reset-module-id="configured-visualization-lab"][data-viz-reset-topic-id="${contract.labId}"]`;
}

export function validateHKVisualizationMathOracleContracts(
  contracts: readonly HKVisualizationMathOracleContract[]
): HKVisualizationMathOracleValidationIssue[] {
  const issues: HKVisualizationMathOracleValidationIssue[] = [];
  const counts = new Map<string, number>();
  const issue = (
    code: HKVisualizationMathOracleValidationCode,
    labId: string,
    message: string
  ) => issues.push({ code, labId, message });

  for (const contract of contracts) {
    counts.set(contract.labId, (counts.get(contract.labId) ?? 0) + 1);
    if (!EXPECTED_TOPIC_SET.has(contract.labId)) {
      issue("extra-topic", contract.labId, "Topic is not in the exact 44-ID dedicated HK registry.");
    }
    if (!FAMILY_SET.has(contract.oracleFamily)) {
      issue("unknown-family", contract.labId, `Unknown oracle family: ${contract.oracleFamily}.`);
    }

    const rootSelector = expectedRoot(contract);
    const selectors = [
      contract.rootSelector,
      contract.state.selector,
      contract.formulaSelector,
      contract.resetSelector,
      ...contract.evidenceSelectors,
      ...contract.modeTopology.map(({ selector }) => selector),
      ...contract.modeTopology.flatMap(({ modeSelectors }) => modeSelectors.map(({ selector }) => selector)),
      ...contract.conditionalControls.map(({ selector }) => selector),
      ...contract.dynamicControlDependencies.map(({ selector }) => selector)
    ];
    if (selectors.some(selectorIsEmpty)) {
      issue("empty-selector", contract.labId, "Every root/state/formula/reset/mode/control/evidence selector must be nonempty.");
    }

    if (
      contract.rootSelector !== rootSelector
      || contract.state.selector !== `${rootSelector}[data-hk-viz-state]`
      || contract.formulaSelector !== expectedFormula(contract, rootSelector)
      || contract.resetSelector !== expectedReset(contract, rootSelector)
    ) {
      issue("topic-selector-drift", contract.labId, "Root, state, formula, or reset selector drifted from this exact topic.");
    }

    if (!sameOrderedStrings(contract.state.canonicalKeys, contract.state.selectorKeys)) {
      issue("state-selector-key-drift", contract.labId, "Canonical state keys differ from data-hk-viz-state-keys selector keys.");
    }
    if (!sameOrderedStrings(contract.state.canonicalKeys, Object.keys(contract.state.reset))) {
      issue("reset-state-key-drift", contract.labId, "Reset object keys differ from the canonical state-key order.");
    }

    if (
      contract.evidenceSelectors.length === 0
      || contract.evidenceSelectors.some((selector) => !selector.includes("[data-viz-name="))
    ) {
      issue(
        "generic-mark-only-evidence",
        contract.labId,
        "Mathematical evidence must use a topic-specific data-viz-name selector; generic [data-viz-mark] is insufficient."
      );
    }

    const groups = new Map(contract.modeTopology.map((group) => [group.groupId, group]));
    for (const group of contract.modeTopology) {
      if (group.parentMode) {
        const parent = groups.get(group.parentMode.groupId);
        if (!parent?.modeIds.includes(group.parentMode.modeId)) {
          issue("mode-parent-unknown", contract.labId, `Mode group ${group.groupId} has an unknown parent mode.`);
        }
      }
      if (group.dependsOnGroupId && !groups.has(group.dependsOnGroupId)) {
        issue("mode-dependency-unknown", contract.labId, `Mode group ${group.groupId} depends on an unknown group.`);
      }
    }

    for (const control of contract.conditionalControls) {
      if (!control.parentMode) {
        issue("conditional-parent-mode-missing", contract.labId, `Conditional control ${control.controlId} omits its parent mode.`);
        continue;
      }
      const parent = groups.get(control.parentMode.groupId);
      if (!parent?.modeIds.includes(control.parentMode.modeId)) {
        issue("conditional-parent-mode-unknown", contract.labId, `Conditional control ${control.controlId} names an unknown parent mode.`);
      }
    }
  }

  for (const [labId, count] of counts) {
    if (count > 1) issue("duplicate-topic", labId, `Topic appears ${count} times.`);
  }
  for (const labId of HK_DEDICATED_LAB_IDS) {
    if (!counts.has(labId)) issue("missing-topic", labId, "Dedicated topic has no math-oracle contract.");
  }

  return issues;
}

const canonicalIssues = validateHKVisualizationMathOracleContracts(
  HK_VISUALIZATION_MATH_ORACLE_CONTRACTS
);
if (canonicalIssues.length > 0) {
  throw new Error(
    `Invalid HK visualization math-oracle registry: ${canonicalIssues.map(({ code, labId }) => `${labId}:${code}`).join(", ")}`
  );
}
