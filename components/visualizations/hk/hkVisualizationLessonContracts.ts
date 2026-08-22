import type {
  HKPassThroughLabId,
  HKPrimaryDedicatedLabId,
  HKSecondaryDedicatedLabId,
  HKVisualizationLabId
} from "./hkVisualizationLabRegistry";

export type HKVisualizationLessonGrade =
  | "P1" | "P2" | "P3" | "P4" | "P5" | "P6"
  | "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export type HKVisualizationRangeDomainId =
  | "number-bond-v1"
  | "bounded-step-v1"
  | "payment-at-least-price-v1"
  | "divisor-within-number-v1"
  | "proper-fractions-v1"
  | "visible-layers-v1"
  | "triangle-validity-v1"
  | "nonzero-quadratic-a-v1"
  | "identity-positive-a-gt-b-v1"
  | "fraction-bar-numerator-v1";

export type HKVisualizationLessonContract = Readonly<{
  labId: HKVisualizationLabId;
  moduleId: "configured-visualization-lab";
  topicId: HKVisualizationLabId;
  grade: HKVisualizationLessonGrade;
  kind: "primary-dedicated" | "secondary-dedicated" | "pass-through";
  rangeDomainId: HKVisualizationRangeDomainId | null;
  modeIds: readonly string[];
  parameterIds: readonly string[];
  controlIds: readonly string[];
  stateKeys: readonly string[];
  selectors: Readonly<{
    workspace: string;
    model: string;
    modes: readonly string[];
    controls: readonly string[];
    state: string;
    stateSummary: string;
    reset: string;
    surface: string;
    marks: string;
  }>;
  lessonCopy: Readonly<{
    mustPromise: string;
    mustNotPromise: readonly string[];
  }>;
}>;

type ContractSpec = {
  grade: HKVisualizationLessonGrade;
  modeIds?: readonly string[];
  parameterIds?: readonly string[];
  controlIds?: readonly string[];
  controlSelectorOverrides?: Readonly<Record<string, string>>;
  stateKeys: readonly string[];
  rangeDomainId?: HKVisualizationRangeDomainId;
  mustPromise: string;
  mustNotPromise?: readonly string[];
};

function freezeStrings(values: readonly string[] = []) {
  return Object.freeze([...values]);
}

function selectorFor(root: string, selector: string) {
  return `${root} ${selector}`;
}

function dedicatedContract(
  labId: HKPrimaryDedicatedLabId | HKSecondaryDedicatedLabId,
  kind: "primary-dedicated" | "secondary-dedicated",
  spec: ContractSpec
): HKVisualizationLessonContract {
  const modelVersion = kind === "primary-dedicated" ? "primary-dedicated-v1" : "secondary-dedicated-v1";
  const root = `[data-hk-viz-model="${modelVersion}"][data-hk-viz-topic="${labId}"]`;
  const modeIds = freezeStrings(spec.modeIds);
  const parameterIds = freezeStrings(spec.parameterIds);
  const controlIds = freezeStrings(spec.controlIds ?? parameterIds);
  const stateKeys = freezeStrings(spec.stateKeys);
  const modes = freezeStrings(modeIds.map((modeId) => selectorFor(root, `[data-viz-mode-button][data-viz-mode="${modeId}"]`)));
  const controls = freezeStrings(controlIds.map((controlId) => selectorFor(
    root,
    spec.controlSelectorOverrides?.[controlId] ?? `[data-viz-parameter="${controlId}"]`
  )));
  const stateSummary = kind === "primary-dedicated"
    ? selectorFor(root, `[data-hk-viz-summary="${labId}"][data-viz-state-summary]`)
    : selectorFor(root, "[data-viz-state-summary]");
  const state = `${root}[data-hk-viz-state]`;

  return Object.freeze({
    labId,
    moduleId: "configured-visualization-lab",
    topicId: labId,
    grade: spec.grade,
    kind,
    rangeDomainId: spec.rangeDomainId ?? null,
    modeIds,
    parameterIds,
    controlIds,
    stateKeys,
    selectors: Object.freeze({
      workspace: `[data-viz-active-lab-id="${labId}"]`,
      model: root,
      modes,
      controls,
      state,
      stateSummary,
      reset: selectorFor(root, `[data-viz-reset-model][data-viz-reset-module-id="configured-visualization-lab"][data-viz-reset-topic-id="${labId}"]`),
      surface: selectorFor(root, "[data-viz-surface]"),
      marks: selectorFor(root, "[data-viz-mark]")
    }),
    lessonCopy: Object.freeze({
      mustPromise: spec.mustPromise,
      mustNotPromise: freezeStrings(spec.mustNotPromise)
    })
  });
}

function primary(labId: HKPrimaryDedicatedLabId, spec: ContractSpec) {
  return dedicatedContract(labId, "primary-dedicated", spec);
}

function secondary(labId: HKSecondaryDedicatedLabId, spec: ContractSpec) {
  return dedicatedContract(labId, "secondary-dedicated", {
    ...spec,
    stateKeys: [...spec.stateKeys, "activeMode"]
  });
}

function passThrough(labId: HKPassThroughLabId, spec: ContractSpec): HKVisualizationLessonContract {
  const root = `[data-viz-active-lab-id="${labId}"]`;
  const modeIds = freezeStrings(spec.modeIds);
  const parameterIds = freezeStrings(spec.parameterIds);
  const controlIds = freezeStrings(spec.controlIds ?? parameterIds);
  const stateKeys = freezeStrings(spec.stateKeys);
  const modes = freezeStrings(modeIds.map((modeId) => selectorFor(root, `[data-viz-mode-button][data-viz-mode-id="${modeId}"]`)));
  const controls = freezeStrings(controlIds.map((controlId) => selectorFor(
    root,
    spec.controlSelectorOverrides?.[controlId] ?? `[data-viz-parameter="${controlId}"]`
  )));

  return Object.freeze({
    labId,
    moduleId: "configured-visualization-lab",
    topicId: labId,
    grade: spec.grade,
    kind: "pass-through",
    rangeDomainId: spec.rangeDomainId ?? null,
    modeIds,
    parameterIds,
    controlIds,
    stateKeys,
    selectors: Object.freeze({
      workspace: root,
      model: selectorFor(root, "[data-viz-configured-model]"),
      modes,
      controls,
      state: selectorFor(root, "[data-viz-configured-state]"),
      stateSummary: selectorFor(root, "[data-viz-configured-state]"),
      reset: selectorFor(root, `[data-viz-reset-model][data-viz-reset-module-id="configured-visualization-lab"][data-viz-reset-topic-id="${labId}"]`),
      surface: `${selectorFor(root, "[data-viz-surface]")}, ${selectorFor(root, "[data-viz-three-canvas]")}`,
      marks: `${selectorFor(root, "[data-viz-mark]")}, ${selectorFor(root, "[data-viz-three-scene]")}`
    }),
    lessonCopy: Object.freeze({
      mustPromise: spec.mustPromise,
      mustNotPromise: freezeStrings(spec.mustNotPromise)
    })
  });
}

/**
 * A18/A05 handoff boundary for all 51 Hong Kong lesson-to-lab routes.
 *
 * Dedicated selectors already exist in the HK components. Pass-through
 * selectors are an explicit integration contract for ConfiguredVisualizationLab;
 * the shared-file owner must expose them before the 51/51 gate can pass.
 */
export const HK_VISUALIZATION_LESSON_CONTRACTS = Object.freeze({
  "p1-counting-number-bonds": primary("p1-counting-number-bonds", {
    grade: "P1", parameterIds: ["total", "knownPart"], stateKeys: ["total", "knownPart"], rangeDomainId: "number-bond-v1",
    mustPromise: "Compose and decompose a non-negative whole within 20; the known and missing parts always sum to the whole.",
    mustNotPromise: ["signed arithmetic", "place value above 20"]
  }),
  "p1-addition-subtraction": primary("p1-addition-subtraction", {
    grade: "P1", modeIds: ["add", "subtract"], parameterIds: ["start", "step"], stateKeys: ["operation", "start", "step"], rangeDomainId: "bounded-step-v1",
    mustPromise: "Show addition as forward and subtraction as backward movement on one 0-to-20 number line, including a stationary zero step.",
    mustNotPromise: ["negative integers"]
  }),
  "p1-shapes-patterns": primary("p1-shapes-patterns", {
    grade: "P1", modeIds: ["AB", "ABC", "AAB"], parameterIds: ["revealedTerms"], stateKeys: ["patternRule", "revealedTerms"],
    mustPromise: "Identify the shortest repeating shape unit and use it to predict the next term.",
    mustNotPromise: ["numerical angle measurement"]
  }),
  "p1-measurement-time": primary("p1-measurement-time", {
    grade: "P1", modeIds: ["measure", "time", "whole", "half"], parameterIds: ["length", "hour"], stateKeys: ["mode", "length", "hour", "halfHour"],
    mustPromise: "Count equal length units and read whole-hour or half-hour analogue-clock states.",
    mustNotPromise: ["quarter-hour time", "formal unit conversion"]
  }),
  "p2-place-value": primary("p2-place-value", {
    grade: "P2", parameterIds: ["number"], stateKeys: ["number"],
    mustPromise: "Build 0 to 1000 with hundreds, tens, ones, and the visible ten-hundreds-to-one-thousand regrouping state.",
    mustNotPromise: ["tens-and-ones only"]
  }),
  "p2-money-time": primary("p2-money-time", {
    grade: "P2", modeIds: ["money", "time", "whole", "half"], parameterIds: ["price", "payment", "hour"], stateKeys: ["mode", "price", "payment", "hour", "halfHour"], rangeDomainId: "payment-at-least-price-v1",
    mustPromise: "Model Hong Kong payment and non-negative change, plus whole- and half-hour analogue time.",
    mustNotPromise: ["foreign currency", "payment below price"]
  }),
  "p2-length-data": primary("p2-length-data", {
    grade: "P2",
    modeIds: ["metres", "pictogram", "desk", "classroom-width", "playground-path", "metre-ruler", "tape-measure", "trundle-wheel"],
    parameterIds: ["estimateCm", "measuredCm", "pictogramBlueCount"],
    stateKeys: ["displayMode", "target", "tool", "estimateCm", "measuredCm", "measuredMetres", "measuredRemainderCm", "pictogramBlueCount"],
    mustPromise: "Use 1 m = 100 cm to estimate then measure and compare suitable lengths with a metre ruler, measuring tape, or trundle wheel, and read a pictogram with an explicit key where exactly one icon represents one object.",
    mustNotPromise: ["bar charts or bar-height reading", "a pictogram icon multiplier other than one", "decimal metres or formal simple-to-compound conversion"]
  }),
  "p3-multiplication-division": primary("p3-multiplication-division", {
    grade: "P3", modeIds: ["multiply", "share"], parameterIds: ["groups", "itemsPerGroup"], stateKeys: ["mode", "groups", "itemsPerGroup"],
    mustPromise: "Keep the same total while switching between equal groups, an array, multiplication, and equal sharing.",
    mustNotPromise: ["an unrelated 3D area-only model"]
  }),
  "p3-measurement": primary("p3-measurement", {
    grade: "P3",
    modeIds: ["measurement", "bar-chart", "length", "mass", "capacity", "small", "large", "A", "B", "C", "D"],
    parameterIds: ["baseValue"],
    stateKeys: ["model", "quantityType", "baseValue", "unit", "selectedCategory"],
    mustPromise: "Preserve one physical quantity while converting exactly between appropriate metric units, and separately read categorical bar heights from one zero-based shared numerical scale.",
    mustNotPromise: ["mixing incompatible measurement dimensions", "mean or trend inference from the P3 bar chart", "a pictogram substituted for the bar chart"]
  }),
  "p3-geometry-patterns": primary("p3-geometry-patterns", {
    grade: "P3",
    modeIds: ["quadrilateral", "triangle", "rectangle", "square", "parallelogram", "trapezium", "triangle-different", "triangle-two-equal", "triangle-three-equal"],
    stateKeys: ["shapeFamily", "shapeType"],
    mustPromise: "Recognise concrete quadrilaterals and triangles from their visible side and vertex counts and from property marks that belong to the selected shape.",
    mustNotPromise: ["a growing pattern or general term", "line symmetry as the core model", "angle comparison or classification as the core model"]
  }),
  "p4-large-numbers": primary("p4-large-numbers", {
    grade: "P4",
    modeIds: ["factor-pairs", "common-hcf-lcm"],
    parameterIds: ["firstNumber", "secondNumber", "candidateDivisor"],
    stateKeys: ["mode", "firstNumber", "secondNumber", "candidateDivisor"],
    rangeDomainId: "divisor-within-number-v1",
    mustPromise: "For positive integers, generate complete factor pairs and positive multiples, test a factor by zero remainder, intersect two lists, and identify HCF as the greatest common factor and LCM as the least positive common multiple; classify 1 as neither prime nor composite.",
    mustNotPromise: ["large-number place-value comparison or rounding", "the HCF × LCM relation as required P4 content", "prime factorisation or algebraic divisibility proofs"]
  }),
  "p4-decimals": primary("p4-decimals", {
    grade: "P4", parameterIds: ["decimalValue"], stateKeys: ["decimalValue"],
    mustPromise: "Locate values from 0.00 to 2.00 at hundredth precision and connect position to ones, tenths, and hundredths.",
    mustNotPromise: ["integer-only placement"]
  }),
  "p4-angles": primary("p4-angles", {
    grade: "P4",
    modeIds: ["families", "composition", "parallelogram", "rectangle", "rhombus", "square", "rectangle-diagonal", "square-diagonal", "trapeziums-rectangle"],
    stateKeys: ["mode", "familyShape", "composition", "rightAngleCount"],
    mustPromise: "Use visible equal-side, parallel-side, and right-angle marks to support only forward quadrilateral-family inclusions—every square is a rectangle and rhombus, and rectangles, rhombuses, and squares are parallelograms—then show a rectangle or square split by a diagonal and two congruent right trapeziums forming a rectangle.",
    mustNotPromise: ["the converse of a quadrilateral-family inclusion", "numerical degree measurement or angle classification as the core model", "the superseded fixed square-corner comparison"]
  }),
  "p4-perimeter-area": primary("p4-perimeter-area", {
    grade: "P4", modeIds: ["both", "perimeter", "area"], parameterIds: ["length", "width"], stateKeys: ["length", "width", "focus"],
    mustPromise: "Distinguish rectangle boundary length from covered square units while using the same length and width.",
    mustNotPromise: ["volume"]
  }),
  "p5-fractions-operations": primary("p5-fractions-operations", {
    grade: "P5", modeIds: ["add", "subtract", "two", "three"], parameterIds: ["firstNumerator", "firstDenominator", "secondNumerator", "secondDenominator", "thirdNumerator", "thirdDenominator"], stateKeys: ["operation", "termCount", "firstFraction", "secondFraction", "thirdFraction"], rangeDomainId: "proper-fractions-v1",
    mustPromise: "Add or subtract two or three proper fractions with unlike denominators by visibly renaming them over the least common denominator, then simplify.",
    mustNotPromise: ["same-denominator-only arithmetic", "equivalence-only exploration"]
  }),
  "p5-volume": primary("p5-volume", {
    grade: "P5", parameterIds: ["length", "width", "height", "visibleLayers"], stateKeys: ["length", "width", "height", "visibleLayers"], rangeDomainId: "visible-layers-v1",
    mustPromise: "Build a bounded cuboid from unit-cube layers and preserve V = length × width × height.",
    mustNotPromise: ["a 2D array-area substitute"]
  }),
  "p5-rates": primary("p5-rates", {
    grade: "P5", parameterIds: ["totalPrice", "itemCount", "targetCount"], stateKeys: ["totalPrice", "itemCount", "targetCount"],
    mustPromise: "Use equal-item and unitary-price reasoning; retain an exact fraction and label a decimal approximation when non-terminating.",
    mustNotPromise: ["formal speed or journey graphs"]
  }),
  "p5-charts-averages": primary("p5-charts-averages", {
    grade: "P5", modeIds: ["A", "B", "C", "D"], parameterIds: ["firstSeriesValue", "secondSeriesValue"], stateKeys: ["selectedCategory", "firstSeries", "secondSeries"],
    mustPromise: "Read and compare two series category-by-category on one composite bar chart and one shared scale.",
    mustNotPromise: ["mean as the core P5 model", "repeated-trial inference"]
  }),
  "p6-percentages": primary("p6-percentages", {
    grade: "P6",
    modeIds: ["equivalence", "given-change", "increase", "decrease"],
    parameterIds: ["percent", "baseAmount"],
    stateKeys: ["mode", "percent", "baseAmount", "direction"],
    mustPromise: "Keep p%, p/100, the decimal, and p shaded cells of a 100-cell grid synchronized, and use a given base and given percentage to calculate one increase or decrease as change = base × p/100 and final = base ± change.",
    mustNotPromise: ["changing the equivalence whole away from 100 cells", "recovering an unknown original amount", "computing a percentage increase from old and new values", "successive or compound percentage change"]
  }),
  "p6-ratio-proportion": primary("p6-ratio-proportion", {
    grade: "P6",
    modeIds: ["mean-fair-share", "broken-line", "1", "2"],
    parameterIds: ["value1", "value2", "value3", "value4", "seriesBShift"],
    stateKeys: ["mode", "value1", "value2", "value3", "value4", "seriesCount", "seriesBShift"],
    mustPromise: "Use mean = total ÷ count as fair sharing and keep one or two ordered continuous-time data series synchronized across the table, complete axes and units, adjacent broken-line segments, plotted points, and mean readouts.",
    mustNotPromise: ["ratio notation or direct/inverse proportion", "joining unordered categories or extrapolating beyond recorded times", "an inaccurate 3D fraction-slice promise"]
  }),
  "p6-speed": primary("p6-speed", {
    grade: "P6", parameterIds: ["speed", "time"], stateKeys: ["speed", "time"],
    mustPromise: "Synchronize speed, time, distance, a straight distance-time journey line through the origin, and its gradient.",
    mustNotPromise: ["a multiplication array in place of the journey graph"]
  }),
  "p6-pre-secondary-problem-solving": primary("p6-pre-secondary-problem-solving", {
    grade: "P6", modeIds: ["represent", "plan", "solve", "check"], parameterIds: ["budget", "count", "unitPrice", "extraCost"], stateKeys: ["workflowStep", "budget", "count", "unitPrice", "extraCost"],
    mustPromise: "Carry one budget problem through represent, plan, solve, and inverse-check states, with non-negative remaining or positive overspend.",
    mustNotPromise: ["an unrelated fraction-bar activity"]
  }),

  integers: secondary("integers", {
    grade: "S1", modeIds: ["add", "subtract"], parameterIds: ["start", "operand"], stateKeys: ["start", "operand"],
    mustPromise: "Use a signed number line with negative starts and operands; verify cases such as −3+8, 3+(−5), and 3−(−5).",
    mustNotPromise: ["a coordinate-plane substitute"]
  }),
  "algebra-basics": secondary("algebra-basics", {
    grade: "S1", modeIds: ["equation", "inverse", "check"], parameterIds: ["a", "b"], stateKeys: ["a", "b"],
    mustPromise: "Use a symbolic x+a=b balance, apply the same inverse operation to both sides, isolate x, and verify by substitution.",
    mustNotPromise: ["a numeric-only scale"]
  }),
  angles: secondary("angles", {
    grade: "S1", modeIds: ["triangle", "straight", "point"], parameterIds: ["ax", "ay", "bx", "by", "cx", "cy"],
    controlIds: ["ax", "ay", "bx", "by", "cx", "cy", "vertex-a", "vertex-b", "vertex-c"],
    controlSelectorOverrides: {
      "vertex-a": "[data-viz-name=\"angle-vertex-a\"][role=\"button\"]",
      "vertex-b": "[data-viz-name=\"angle-vertex-b\"][role=\"button\"]",
      "vertex-c": "[data-viz-name=\"angle-vertex-c\"][role=\"button\"]"
    },
    stateKeys: ["ax", "ay", "bx", "by", "cx", "cy"],
    rangeDomainId: "triangle-validity-v1",
    mustPromise: "Let learners move all three triangle vertices and keep the three live interior angles summing to 180 degrees within displayed rounding tolerance.",
    mustNotPromise: ["three independent rays as a triangle model"]
  }),
  ratios: secondary("ratios", {
    grade: "S1", modeIds: ["equivalent", "scale", "unit"], parameterIds: ["a", "b", "k"], stateKeys: ["a", "b", "k"],
    mustPromise: "Keep a part-to-part ratio invariant while scaling both parts together and deriving the one-unit value.",
    mustNotPromise: ["scaling only one ratio term"]
  }),
  "linear-equations": secondary("linear-equations", {
    grade: "S2", modeIds: ["equation", "subtract", "divide", "check"], parameterIds: ["a", "b", "c"], stateKeys: ["a", "b", "c"],
    mustPromise: "Solve ax+b=c by equal operations on both sides, isolate x, and verify the original equation.",
    mustNotPromise: ["an unbalanced one-sided manipulation"]
  }),
  coordinates: secondary("coordinates", {
    grade: "S2", modeIds: ["plot", "connect", "translate", "reflect"], parameterIds: ["x1", "y1", "x2", "y2", "x3", "y3", "dx", "dy", "mirror"], stateKeys: ["x1", "y1", "x2", "y2", "x3", "y3", "dx", "dy", "mirror"],
    mustPromise: "Plot, label, and connect at least three signed points, then show pure translation and pure reflection including axis, origin, and coincidence states.",
    mustNotPromise: ["reflection compounded with an unrelated vertical shift"]
  }),
  transformations: secondary("transformations", {
    grade: "S2", modeIds: ["translate", "reflect", "rotate-cw", "rotate-ccw", "enlarge"], parameterIds: ["dx", "dy", "mirror", "angle", "scale"], stateKeys: ["dx", "dy", "mirror", "angle", "scale"],
    mustPromise: "Provide pure translation, x=k reflection, clockwise and anticlockwise 90/180/270-degree origin rotations; label enlargement as enrichment.",
    mustNotPromise: ["compound transforms described as pure", "reflection with dy", "off-origin dilation"]
  }),
  "probability-s2": secondary("probability-s2", {
    grade: "S2", modeIds: ["compare", "counts"], parameterIds: ["seed", "rolls"],
    controlIds: ["roll-1", "roll-20"],
    controlSelectorOverrides: { "roll-1": "[data-viz-roll=\"1\"]", "roll-20": "[data-viz-roll=\"20\"]" },
    stateKeys: ["seed", "rolls"],
    mustPromise: "Roll a real seeded six-sided die by 1 or 20 trials, retain cumulative counts for all faces beyond 20, compare theoretical and experimental P(even), and reset explicitly.",
    mustNotPromise: ["guaranteed convergence", "only a single binary outcome"]
  }),
  polynomials: secondary("polynomials", {
    grade: "S3", modeIds: ["expand", "factor"], parameterIds: ["x", "p", "q"], stateKeys: ["x", "p", "q"],
    mustPromise: "Bind (x+p)(x+q) to four exact area pieces and switch between expansion and factorisation.",
    mustNotPromise: ["a generic function-family graph"]
  }),
  "identities-square-patterns": secondary("identities-square-patterns", {
    grade: "S3", modeIds: ["square-sum", "square-difference", "difference-of-squares"], parameterIds: ["a", "b"], stateKeys: ["a", "b"], rangeDomainId: "identity-positive-a-gt-b-v1",
    mustPromise: "Use exact signed-area pieces and the identity sign to distinguish (a+b)² ≡ a²+2ab+b² from (a−b)² ≡ a²−2ab+b², and to prove a²−b² ≡ (a−b)(a+b), for every allowed a>b.",
    mustNotPromise: ["parabola, vertex, roots, axis, or opening", "an equals sign true only for one selected case"]
  }),
  "trigonometry-basics": secondary("trigonometry-basics", {
    grade: "S3", modeIds: ["sin", "cos", "tan"], parameterIds: ["theta", "hyp", "reference"],
    controlIds: ["theta", "hyp", "reference-left", "reference-upper"],
    controlSelectorOverrides: {
      "reference-left": "button[data-viz-reference-angle=\"left\"]",
      "reference-upper": "button[data-viz-reference-angle=\"upper\"]"
    },
    stateKeys: ["theta", "hyp", "reference"],
    mustPromise: "Use one resizable labelled right triangle, selectable acute reference angle, live opposite/adjacent/hypotenuse labels, and SOH-CAH-TOA.",
    mustNotPromise: ["unit-circle or wave as the core model"]
  }),
  "arc-length-sector-area": secondary("arc-length-sector-area", {
    grade: "S3", modeIds: ["arc", "sector"], parameterIds: ["r", "theta"], stateKeys: ["r", "theta"],
    mustPromise: "Keep a real sector, θ/360, arc length, and sector area synchronized for r>0 and 0<θ≤360, distinguishing exact π, approximations, length units, square units, and the full-circle state.",
    mustNotPromise: ["tangent or circumference-angle theorems as the core model"]
  }),
  "quadratic-patterns": secondary("quadratic-patterns", {
    grade: "S4", modeIds: ["graph", "features"], parameterIds: ["a", "b", "c"], stateKeys: ["a", "b", "c"], rangeDomainId: "nonzero-quadratic-a-v1",
    mustPromise: "Preserve Quadratic Functions semantics with independent a,b,c, a≠0, correct opening, vertex, axis, y-intercept, discriminant, and visible real roots.",
    mustNotPromise: ["S3 square-identity content under this legacy ID"]
  }),
  circles: secondary("circles", {
    grade: "S4", modeIds: ["radius", "chord", "tangent", "theorem"], parameterIds: ["r", "theta"], stateKeys: ["r", "theta"],
    mustPromise: "Preserve Circle Geometry semantics with a real circle, centre, radius, chord and matching arc, tangent perpendicular to its contact radius, and the same-arc central-angle invariant.",
    mustNotPromise: ["S3 sector-area content under this legacy ID"]
  }),
  functions: secondary("functions", {
    grade: "S4", modeIds: ["linear", "quadratic", "exponential", "logarithmic"], parameterIds: ["a", "b", "input"], stateKeys: ["a", "b", "input"],
    mustPromise: "Use one selected function rule to drive the input-output machine, value table, highlighted point, and graph across four families.",
    mustNotPromise: ["quadratic-only controls"]
  }),
  "coordinate-geometry": secondary("coordinate-geometry", {
    grade: "S4", modeIds: ["gradient", "distance", "midpoint"], parameterIds: ["x1", "y1", "x2", "y2"], stateKeys: ["x1", "y1", "x2", "y2"],
    mustPromise: "Derive gradient, distance, and midpoint from the same two signed points, including the vertical-line undefined-gradient state.",
    mustNotPromise: ["different endpoint pairs across representations"]
  }),
  "more-algebra": secondary("more-algebra", {
    grade: "S4", modeIds: ["indices", "identity", "rational"], parameterIds: ["x", "m", "n", "k"], stateKeys: ["x", "m", "n", "k"],
    mustPromise: "Show exact index laws, signed identity tiles, and rational cancellation while retaining the excluded value x=k.",
    mustNotPromise: ["cancellation without its domain restriction"]
  }),
  "trigonometry-s5": secondary("trigonometry-s5", {
    grade: "S5", modeIds: ["sin", "cos"], parameterIds: ["amplitude", "period", "phase"], stateKeys: ["amplitude", "period", "phase"],
    mustPromise: "Treat amplitude, period, and signed phase shift as independent transformations of a sine or cosine graph.",
    mustNotPromise: ["a fixed unit-circle-only display"]
  }),
  "probability-s5": secondary("probability-s5", {
    grade: "S5", modeIds: ["counting", "conditional"], parameterIds: ["red", "blue"], stateKeys: ["red", "blue"],
    mustPromise: "Count unordered two-object outcomes and update without-replacement conditional branches before calculating probability.",
    mustNotPromise: ["replacement when the model states without replacement"]
  }),
  "statistics-s6": secondary("statistics-s6", {
    grade: "S6", modeIds: ["distribution", "standardize"], parameterIds: ["mean", "sd", "observed"], stateKeys: ["mean", "sd", "observed"],
    mustPromise: "Standardize the displayed observed value with z=(x−mean)/sd and locate it, including an explicit off-scale state.",
    mustNotPromise: ["changing only mean and spread without an observed x"]
  }),
  "exam-revision": secondary("exam-revision", {
    grade: "S6", modeIds: ["priority", "timing"], parameterIds: ["algebra", "geometry", "statistics", "marks", "pace"], stateKeys: ["algebra", "geometry", "statistics", "marks", "pace"],
    mustPromise: "Make revision priority and time budgeting explainable from mastery gaps, recent errors, marks, and pace.",
    mustNotPromise: ["an unexplained opaque score"]
  }),
  "mixed-problem-solving": secondary("mixed-problem-solving", {
    grade: "S6", modeIds: ["strategy", "model", "check"], parameterIds: ["rate", "time", "representation"],
    controlIds: ["rate", "time", "representation-diagram", "representation-table", "representation-equation", "representation-graph"],
    controlSelectorOverrides: {
      "representation-diagram": "button[data-viz-representation=\"diagram\"]",
      "representation-table": "button[data-viz-representation=\"table\"]",
      "representation-equation": "button[data-viz-representation=\"equation\"]",
      "representation-graph": "button[data-viz-representation=\"graph\"]"
    },
    stateKeys: ["rate", "time", "representation"],
    mustPromise: "Use every known fact through strategy, selected representation, calculation, unit check, and inverse verification.",
    mustNotPromise: ["a generic function-family graph", "an inaccurate premium 3D promise"]
  }),

  "p2-multiplication-foundations": passThrough("p2-multiplication-foundations", {
    grade: "P2", modeIds: [], parameterIds: ["value", "comparison"], stateKeys: ["rows", "columns", "total"],
    mustPromise: "Represent multiplication foundations as countable equal rows and columns of objects whose object total is rows × columns.",
    mustNotPromise: ["formal area, square units, or repeated addition", "division with remainder"]
  }),
  "p3-fractions-intro": passThrough("p3-fractions-intro", {
    grade: "P3", modeIds: ["fraction", "equivalent", "compare"], parameterIds: ["value", "comparison"], stateKeys: ["denominator", "numerator", "equivalentNumerator", "equivalentDenominator"], rangeDomainId: "fraction-bar-numerator-v1",
    mustPromise: "Show a fraction of one whole with equal partitions and an exactly equivalent renamed fraction.",
    mustNotPromise: ["unlike-denominator operations"]
  }),
  "statistics-s1": passThrough("statistics-s1", {
    grade: "S1", modeIds: [], parameterIds: ["value", "comparison"], stateKeys: ["mean", "spread"],
    mustPromise: "Explore how the displayed centre and spread change one distribution while preserving the shown summary values.",
    mustNotPromise: ["an observed-value z-score"]
  }),
  "data-handling": passThrough("data-handling", {
    grade: "S4", modeIds: [], parameterIds: ["value", "comparison"], stateKeys: ["mean", "spread"],
    mustPromise: "Connect the displayed distribution shape to its centre and spread.",
    mustNotPromise: ["raw-data operations not visible in the model"]
  }),
  "advanced-functions": passThrough("advanced-functions", {
    grade: "S5", modeIds: [], parameterIds: ["value", "comparison"], stateKeys: ["family", "scale", "verticalShift"],
    mustPromise: "Show the selected function curve with its matching formula, scale, and vertical shift.",
    mustNotPromise: ["a controlled cross-family comparison", "a wave family or synchronized parameters across different families"]
  }),
  "differentiation-intro": passThrough("differentiation-intro", {
    grade: "S5", modeIds: [], parameterIds: ["value", "comparison"], stateKeys: ["curvature", "probeX", "slope"],
    mustPromise: "At the selected point, connect the tangent and local gradient to the plotted curve.",
    mustNotPromise: ["a secant-to-tangent mode or accumulated area", "a derivative value unrelated to the plotted curve"]
  }),
  calculus: passThrough("calculus", {
    grade: "S6", modeIds: [], parameterIds: ["value", "comparison"], stateKeys: ["curvature", "probeX", "slope"],
    mustPromise: "At the selected point, connect the tangent and local gradient to the plotted curve.",
    mustNotPromise: ["a secant mode or accumulated area", "a gradient value unrelated to the plotted curve"]
  })
} satisfies Record<HKVisualizationLabId, HKVisualizationLessonContract>);

export function hkVisualizationLessonContract(labId: string): HKVisualizationLessonContract | null {
  return Object.prototype.hasOwnProperty.call(HK_VISUALIZATION_LESSON_CONTRACTS, labId)
    ? HK_VISUALIZATION_LESSON_CONTRACTS[labId as HKVisualizationLabId]
    : null;
}
