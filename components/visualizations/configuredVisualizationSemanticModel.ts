import type { FeaturedLabDefinition, VisualizationTemplateId } from "../../data/visualizationLabs";
import { resolveConfiguredVisualizationCompositeStrands } from "./configuredVisualizationCompositeStrands";
import {
  getConfiguredVisualizationSemanticControlContract,
  type ConfiguredVisualizationSemanticControlContract
} from "./configuredVisualizationSemanticControls";

/**
 * Pure curriculum-to-renderer contract for configured Visualization Labs.
 *
 * This module deliberately does not import React, renderer state, or the China
 * catalog. It can therefore be consumed by any curriculum track. Implementation
 * status is derived from the executable semantic-family and exact strand-plan
 * registries; a recommendation without either remains explicitly unverified.
 * The frozen A18 audit used to derive the rules is identified so future audits
 * can detect contract drift without loading an external artifact at runtime.
 */
export const CONFIGURED_VISUALIZATION_SEMANTIC_MODEL_SOURCE = {
  auditScope: "335 Mainland China curriculum-owned Visualization Labs",
  exactExternalPlanLabCount: 37,
  frozenAuditSha256: "eabf3d1cc09bebc4cf81fe040152c92def6e031b106def1b82088e223554a3ea",
  implementedSemanticFamilyCount: 74,
  version: "a18-semantic-contract-v2"
} as const;

export type SemanticRendererTemplateId =
  | VisualizationTemplateId
  | "algebra-tiles"
  | "analytic-geometry"
  | "bivariate-statistics"
  | "circle-geometry"
  | "combinatorics"
  | "composite-capstone"
  | "conic-sections"
  | "distance-time-graph"
  | "expression-equivalence"
  | "inequality-solver"
  | "linear-system"
  | "optimization-modeling"
  | "sequence-model"
  | "set-logic"
  | "solid-nets-projection"
  | "space-vector-plane"
  | "triangle-geometry"
  | "triangle-trigonometry"
  | "vector-operations"
  | "volume-layers";

export type SemanticRendererWorkKind =
  | "current-template-contract"
  | "variant-required"
  | "remap-required"
  | "split-required";

export type SemanticRendererImplementationStatus =
  | "implemented-direct"
  | "implemented-via-external-plan"
  | "external-plan-required"
  | "contract-only-unverified";

export type ObservableMathInvariant = {
  id: string;
  statement: string;
  observableSources: readonly string[];
};

export type ConfiguredVisualizationSemanticModel = {
  contractId: string;
  source: typeof CONFIGURED_VISUALIZATION_SEMANTIC_MODEL_SOURCE;
  semanticFamily: string;
  variant: string;
  summary: string;
  currentTemplateId: VisualizationTemplateId;
  recommendedRenderer: {
    templateId: SemanticRendererTemplateId;
    familyId: string;
    workKind: SemanticRendererWorkKind;
    implementationStatus: SemanticRendererImplementationStatus;
  };
  /**
   * Canonical learner contract at mode 0. Runtime surfaces re-resolve the same
   * registry with their active mode for mode-aware families.
   */
  controls: ConfiguredVisualizationSemanticControlContract | null;
  invariants: readonly [ObservableMathInvariant, ObservableMathInvariant];
};

type FamilyRule = {
  family: string;
  variant: string;
  pattern: RegExp;
};

type TemplateRepairProfile = {
  defaultFamily: string;
  defaultVariant: string;
  rules: readonly FamilyRule[];
};

function semanticRule(family: string, variant: string, pattern: RegExp): FamilyRule {
  return { family, variant, pattern };
}

/**
 * The 18-row repair matrix is intentionally catalog-agnostic.  Rules match the
 * stable topic id plus localized catalog metadata; exact ids appear only where
 * a genuinely composite topic cannot be inferred as one mathematical family.
 */
export const configuredVisualizationSemanticTemplateRepairMatrix = {
  "angle-geometry": {
    defaultFamily: "angle-measure",
    defaultVariant: "shared-vertex-angle",
    rules: [
      semanticRule("composite-split", "length-angle-solid-observation", /pep-primary-p2-upper-length-angles-observation/u),
      semanticRule("composite-split", "geometry-foundations", /pep-junior-s1-upper-geometric-figures/u),
      semanticRule("composite-split", "quadratic-circle-probability", /pep-junior-s3-upper-quadratics-circle-probability/u),
      semanticRule("composite-split", "split-topic-strands", /(bnu-primary-p6-upper-review-activity|hjb-primary-p4-upper-review-integration)/u),
      semanticRule("solid-projection", "linked-solid-views", /bnu-primary-p[1346]-(lower|upper)-observe-objects/u),
      semanticRule("reflection-symmetry", "mirror-distance", /axis-symmetry/u),
      semanticRule("circle-sector", "radius-arc-sector", /(circle|circles|circle-sector)/u),
      semanticRule("quadrilateral-geometry", "quadrilateral-families-composition", /^p4-angles(?: |$)/u),
      semanticRule("quadrilateral-geometry", "triangle-quadrilateral-classification", /bnu-primary-p4-lower-triangles-quadrilaterals/u),
      semanticRule("quadrilateral-geometry", "parallelogram-properties", /bnu-junior-s2-lower-parallelograms/u),
      semanticRule("quadrilateral-geometry", "special-parallelogram-classification", /bnu-junior-s3-upper-special-parallelograms/u),
      semanticRule("quadrilateral-geometry", "property-classification", /hjb-junior-s2-lower-quadrilaterals/u),
      semanticRule("triangle-geometry", "similar-triangle-ratios", /(bnu-junior-s3-upper-similar-figures|hjb-junior-s3-upper-similar-triangles)/u),
      semanticRule("line-angle-geometry", "parallel-transversal", /(parallel|parallelogram)/u),
      semanticRule("triangle-geometry", "triangle-invariants", /(triangle|triangles|similar-figures)/u),
      semanticRule("shape-classifier", "sides-corners", /plane-shapes/u)
    ]
  },
  "array-area": {
    defaultFamily: "equal-groups-array",
    defaultVariant: "rows-columns-product",
    rules: [
      semanticRule("equal-groups-array", "p2-multiplication-foundations", /p2-multiplication-foundations/u),
      semanticRule("area-perimeter", "rectangle-boundary-and-cover", /^bnu-primary-p3-lower-area(?: |$)/u),
      semanticRule("composite-split", "volume-and-statistics", /pep-primary-p5-lower-volume-data/u),
      semanticRule("composite-split", "array-perimeter-data-review", /hjb-primary-p3-lower-math-square-review/u),
      semanticRule(
        "composite-split",
        "split-topic-strands",
        /(pep-primary-p3-upper-operations-fractions|pep-primary-p4-upper-large-numbers-multiplication|bnu-primary-p3-(upper|lower)-math-play-review|bnu-primary-p5-lower-review-activity|hjb-primary-p3-upper-review-place-value-operations|hjb-primary-p4-upper-large-numbers-measurement)/u
      ),
      semanticRule(
        "solid-projection",
        "common-solids-classification",
        /(bnu-primary-p1-upper-solid-shapes|hjb-primary-p1-upper-solids-introduction)/u
      ),
      semanticRule("volume-layers", "unit-cube-layers", /cuboid/u),
      semanticRule("decimal-product-area", "decimal-grid-product", /(area-decimals|decimal-multiplication|decimal-division|decimal-operations)/u),
      semanticRule("factor-array", "factor-pairs", /(multiples-factors|factors-multiples|divisibility)/u),
      semanticRule("polygon-area", "base-height-decompose", /(polygon-area|composite-area|plane-figure-area)/u),
      semanticRule("area-perimeter", "array-perimeter-area-check", /hjb-primary-p3-upper-math-square-review/u),
      semanticRule("area-perimeter", "rectangle-boundary-and-cover", /(perimeter|rectangle-square|area-measurement)/u),
      semanticRule("division-remainder-array", "division-check", /hjb-primary-p2-lower-math-square-review/u),
      semanticRule("division-remainder-array", "quotient-remainder", /division/u),
      semanticRule("equal-groups-array", "multiplication-check", /hjb-primary-p2-upper-math-square-review/u)
    ]
  },
  "base-ten": {
    defaultFamily: "multi-place-value",
    defaultVariant: "ones-to-ten-thousands",
    rules: [
      semanticRule("composite-split", "place-value-review", /hjb-primary-p1-lower-review/u),
      semanticRule("decimal-place-value", "ones-tenths-hundredths", /decimal/u),
      semanticRule("multi-place-value", "tens-ones", /within-100-number-sense/u)
    ]
  },
  "calculus-rate-area": {
    defaultFamily: "derivative-rate-area",
    defaultVariant: "tangent-secant-area",
    rules: [
      semanticRule("derivative-rate-area", "differentiation-intro", /differentiation-intro/u),
      semanticRule("derivative-rate-area", "calculus", /^calculus(?: |$)/u),
      semanticRule("composite-split", "sequence-and-derivative", /高三数列与导数综合复习/u),
      semanticRule("optimization-derivative", "family-aware-optimization-controls", /pep-high-s5-derivatives/u),
      semanticRule("derivative-synthesis", "function-derivative-extrema", /(derivative-synthesis|函数-导数与不等式综合)/u)
    ]
  },
  "clock-money-data": {
    defaultFamily: "clock-time",
    defaultVariant: "clock-or-elapsed-time",
    rules: [
      semanticRule("composite-split", "place-value-measurement-data", /pep-primary-p2-lower-place-value-measurement-data/u),
      semanticRule("composite-split", "measurement-time-geometry", /pep-primary-p3-upper-measurement-time-geometry/u),
      semanticRule("composite-split", "split-topic-strands", /(pep-primary-p1-upper-shapes-position-time|hjb-primary-p3-upper-time-measurement)/u),
      semanticRule("calendar-model", "calendar-elapsed-days", /calendar-time/u),
      semanticRule("categorical-data", "category-bars", /data-recording-review/u),
      semanticRule("money-model", "denomination-composition", /(money|shopping)/u)
    ]
  },
  "complex-plane": {
    defaultFamily: "complex-plane",
    defaultVariant: "cartesian-polar-conjugate-rotation",
    rules: []
  },
  "coordinate-transform": {
    defaultFamily: "coordinate-position",
    defaultVariant: "ordered-pair-position",
    rules: [
      semanticRule("composite-split", "split-lines-numbers-coordinates", /pep-junior-s1-lower-lines-coordinates/u),
      semanticRule("coordinate-position", "relative-position-grid", /bnu-primary-p1-upper-position-order/u),
      semanticRule("coordinate-position", "direction-distance-route", /(bnu-primary-p2-lower-direction-position|bnu-primary-p4-upper-direction-position|bnu-primary-p5-lower-position|hjb-primary-p2-upper-school-position-direction)/u),
      semanticRule("analytic-line-circle", "line-circle-equations", /(lines-circles|直线与圆|平面直角坐标系中的直线|解析几何直线综合复习)/u),
      semanticRule("plane-transform", "translate-reflect-rotate-dilate", /(transformations|shape-motion|symmetry-translation|geometric-motion|figure-transformations)/u)
    ]
  },
  "equation-balance": {
    defaultFamily: "symbolic-equation",
    defaultVariant: "unknown-and-balance",
    rules: [
      semanticRule("symbolic-equation", "unknown-and-balance", /hjb-primary-p6-lower-linear-equations-inequalities/u),
      semanticRule("set-logic", "membership-and-condition", /(sets-logic|集合与逻辑)/u),
      semanticRule("linear-system", "two-equation-system", /linear-systems/u),
      semanticRule("inequality-solver", "symbolic-inequality", /(inequalit|inequalities)/u),
      semanticRule("expression-equivalence", "operation-order-and-laws", /(mixed-operations|operation-laws)/u),
      semanticRule("algebra-tiles-polynomial", "symbolic-transform", /(expression|polynomial|algebraic|factorization)/u)
    ]
  },
  "fraction-bar": {
    defaultFamily: "fraction-equivalence",
    defaultVariant: "part-whole-equivalent",
    rules: [
      semanticRule("fraction-equivalence", "p3-fractions-intro", /p3-fractions-intro/u),
      semanticRule("proportional-function", "direct-and-inverse", /direct-inverse-proportion/u),
      semanticRule("percent-model", "fraction-decimal-percent", /(percent|percentage)/u),
      semanticRule("ratio-proportion", "equivalent-ratios", /((^|-)ratio($|-)|proportion)/u),
      semanticRule(
        "fraction-operations",
        "fraction-add-subtract",
        /(bnu-primary-p5-lower-fraction-add-sub|hjb-primary-p5-lower-fractions-equivalence-operations)/u
      ),
      semanticRule(
        "fraction-operations",
        "fraction-multiply",
        /bnu-primary-p5-lower-fraction-multiplication/u
      ),
      semanticRule(
        "fraction-operations",
        "fraction-divide",
        /bnu-primary-p5-lower-fraction-division/u
      ),
      semanticRule("fraction-operations", "exact-fraction-operation", /(operation|add-sub|multiplication|division|mixed|factors-fractions)/u)
    ]
  },
  "function-family": {
    defaultFamily: "function-properties",
    defaultVariant: "domain-range-behavior",
    rules: [
      semanticRule("function-properties", "advanced-functions", /^advanced-functions(?: |$)/u),
      semanticRule("composite-split", "sequence-and-counting", /hjb-high-s6-数列与计数综合/u),
      semanticRule("composite-split", "strategy-or-split", /(exam-practice|数学建模活动-一)/u),
      semanticRule("algebra-tiles-polynomial", "factor-expand", /factorization/u),
      semanticRule("sequence-model", "discrete-sequence", /(sequences|(^|-)数列($|-)|数列综合复习)/u),
      semanticRule("reciprocal-function", "xy-equals-k", /(inverse-proportion|inverse-functions)/u),
      semanticRule("linear-function", "table-line-slope", /linear-functions/u),
      semanticRule("exponential-logarithmic", "exp-log-inverse", /(exp-log|指数|对数|幂函数)/u),
      semanticRule("function-properties", "function-representations", /(variable-relationships|bnu-high-s4-函数($|应用))/u)
    ]
  },
  "function-graph": {
    defaultFamily: "quadratic-features",
    defaultVariant: "full-quadratic-features",
    rules: [
      semanticRule("catalog-scope", "split-or-omit", /预备知识/u),
      semanticRule("quadratic-inequality", "roots-and-sign-intervals", /(quadratic-inequalities|等式与不等式)/u)
    ]
  },
  "measurement-scale": {
    defaultFamily: "measurement-model",
    defaultVariant: "unit-interval-measure",
    rules: [
      semanticRule("attribute-comparison", "quantity-length-height-mass", /^bnu-primary-p1-upper-comparison(?: |$)/u),
      semanticRule("decimal-number-line", "decimal-measure", /decimal-introduction/u),
      semanticRule("mass-unit-conversion", "mass-units", /mass-units/u),
      semanticRule("measurement-estimation", "estimate-then-measure", /body-rulers-math-square/u)
    ]
  },
  "number-line": {
    defaultFamily: "small-whole-number-line",
    defaultVariant: "whole-number-jumps",
    rules: [
      semanticRule("catalog-scope", "split-or-narrow-operation-laws", /hjb-primary-p4-lower-review-operation-properties/u),
      semanticRule("catalog-scope", "split-or-omit", /(math-play-review|final-review|school-math-habits)/u),
      semanticRule("equal-groups-array", "multiplication-facts", /multiplication-facts-2-to-5/u),
      semanticRule("decimal-number-line", "tenths-hundredths", /decimal-introduction/u),
      semanticRule("signed-real-number-line", "signed-or-irrational", /(negative|rational-numbers|real-numbers|quadratic-radicals)/u),
      semanticRule("large-whole-number-line", "whole-number-0-to-20", /(upper-number-sense|within-20)/u),
      semanticRule(
        "large-whole-number-line",
        "whole-number-0-to-1000",
        /(bnu-primary-p2-lower-three-digit-add-sub|bnu-primary-p3-upper-three-digit-add-sub|hjb-primary-p2-lower-two-three-digit-add-sub)/u
      ),
      semanticRule("large-whole-number-line", "whole-number-0-to-100", /within-100/u)
    ]
  },
  "probability-simulation": {
    defaultFamily: "seeded-probability-experiment",
    defaultVariant: "seeded-trial-machine",
    rules: [
      semanticRule("composite-split", "split-probability-statistics", /(statistics-probability|probability-statistics|math-play-review|review-activity|概率统计综合)/u),
      semanticRule("combinatorics", "counting-outcomes", /(counting|计数原理)/u),
      semanticRule("random-variable-distribution", "discrete-random-variable", /random-variables/u)
    ]
  },
  "right-triangle-pythagorean": {
    defaultFamily: "right-triangle",
    defaultVariant: "pythagorean-converse-similarity",
    rules: [
      semanticRule("composite-split", "pythagorean-plus-split", /roots-pythagorean-quadrilaterals/u),
      semanticRule("composite-split", "reciprocal-similarity-trigonometry", /inverse-similarity-trigonometry/u)
    ]
  },
  "statistics-distribution": {
    defaultFamily: "statistics-distribution",
    defaultVariant: "sample-mean-spread-observed-z",
    rules: [
      semanticRule("statistics-distribution", "statistics-s1", /^statistics-s1(?: |$)/u),
      semanticRule("statistics-distribution", "data-handling", /^data-handling(?: |$)/u),
      semanticRule("composite-split", "probability-statistics-synthesis", /probability-statistics-synthesis/u),
      semanticRule("bivariate-regression", "scatter-regression-residual", /(bivariate-data|成对数据)/u),
      semanticRule("categorical-data", "classify-and-count", /classification/u),
      semanticRule("line-chart", "ordered-line-data", /line-statistics/u),
      semanticRule("raw-data-summary", "editable-observations", /(decimals-average|data-average)/u),
      semanticRule("raw-data-summary", "sample-and-summary", /(data-collection|统计案例)/u),
      semanticRule("primary-bar-chart", "countable-category-bars", /(primary-p\d-.*(data-representation|data-analysis|data-processing|data-statistics|statistics-review)|math-play-review|review-integration)/u)
    ]
  },
  "trig-unit-wave": {
    defaultFamily: "unit-circle-wave",
    defaultVariant: "unit-circle-sine-wave",
    rules: [
      semanticRule("triangle-trigonometry", "right-triangle-ratios", /(right-triangle-trigonometry|acute-trigonometry)/u),
      semanticRule("trigonometric-identity", "identity-transform", /三角恒等变换/u),
      semanticRule("trigonometric-synthesis", "measurement-vector-model", /数学建模活动-二/u)
    ]
  },
  "vector-conic-3d/strategy-map": {
    defaultFamily: "advanced-strategy",
    defaultVariant: "family-aware-controls",
    rules: [
      semanticRule("solid-projection", "surface-volume-solids", /hjb-high-s5-简单几何体/u),
      semanticRule("solid-projection", "cylinder-cone-volume", /(cylinders-cones|cylinder-cone)/u),
      semanticRule("solid-projection", "solid-nets-and-views", /(spatial-figures|projection-views)/u),
      semanticRule("conic-sections", "ellipse-parabola-hyperbola", /(conics|圆锥曲线)/u),
      semanticRule("geometric-modeling", "assumption-variable-geometry", /数学建模活动-三/u),
      semanticRule("vector-operations", "add-dot-angle", /(plane-vectors|平面向量|三角-向量)/u),
      semanticRule("space-vector-plane", "line-plane-distance-angle", /(solid-geometry|space-vectors|立体几何|空间向量|空间直线)/u)
    ]
  }
} as const satisfies Record<VisualizationTemplateId, TemplateRepairProfile>;

const semanticFamilyInvariantStatements = {
  "advanced-strategy": ["Only controls relevant to the active vector, conic, or solid family are visible.", "Formula and geometry bind to the same family-specific state."],
  "algebra-tiles-polynomial": ["Like-term combination preserves polynomial value.", "Factored form expands exactly to the displayed polynomial."],
  "analytic-line-circle": ["Every plotted line point satisfies its displayed line equation.", "Every plotted circle point has equation residual within numeric tolerance."],
  "angle-measure": ["Ray rotation and the displayed degree measure agree.", "Angle comparison uses a shared vertex and baseline."],
  "area-perimeter": ["Area and perimeter are computed from the same displayed dimensions.", "Changing one side updates boundary length and covered square units independently."],
  "attribute-comparison": ["The displayed relation states whether A is more, fewer, or equal for the selected attribute.", "The displayed difference equals |A - B| for quantity, length, height, and mass."],
  "bivariate-regression": ["Each scatter point represents one displayed ordered pair.", "Residual = observed y - predicted y and the regression line uses the same sample."],
  "calendar-model": ["Month lengths and date transitions are valid.", "Elapsed days agree with the displayed dates."],
  "catalog-scope": ["The lab title and focus name only concepts implemented by the active model.", "A broad review or non-mathematical topic is split, narrowed, or omitted rather than represented by an unrelated template."],
  "categorical-data": ["Every bar height equals its labelled category count.", "Totals and differences are computed from the displayed data."],
  "circle-sector": ["arc or sector fraction = central angle / 360.", "Circumference and area values use the displayed radius."],
  "clock-time": ["Minute-hand angle = 6 * minute and hour-hand angle = 30 * hour + 0.5 * minute.", "Elapsed-time changes preserve calendar-clock arithmetic."],
  combinatorics: ["Permutation and combination counts match nPr and nCr.", "Every counted outcome appears exactly once in the sample space."],
  "complex-plane": ["The plotted point equals z = a + bi.", "Conjugation reflects across the real axis and multiplication by i rotates by 90 degrees."],
  "composite-split": ["Each advertised strand has a distinct selectable model with its own controls.", "No badge or focus text claims a relation absent from the active renderer."],
  "conic-sections": ["Every plotted point satisfies the active ellipse, parabola, or hyperbola equation.", "Focus, directrix, and parameter labels update together."],
  "coordinate-position": ["Displayed coordinates map to the plotted point using one stable scale.", "Movement updates coordinates and geometry consistently."],
  "decimal-number-line": ["Tenths and hundredths occupy their exact rational positions.", "Zooming or changing scale never changes represented numeric value."],
  "decimal-place-value": ["Ones, tenths, and hundredths are distinct operable places.", "Regrouping preserves represented value exactly."],
  "decimal-product-area": ["Partition widths encode decimal factors exactly.", "Shaded area equals the product of the displayed factors."],
  "derivative-rate-area": ["Tangent slope equals the derivative at the displayed probe x.", "Area strips and integral bounds refer to the same displayed function."],
  "derivative-synthesis": ["Derivative, monotonicity, extrema, and inequality claims derive from one displayed function.", "Parameter changes update curve, derivative, and critical points together."],
  "distance-time-rate": ["Every plotted point uses distance and time from the same state.", "Segment slope equals change in distance divided by change in time."],
  "division-remainder-array": ["dividend = divisor * quotient + remainder.", "0 <= remainder < divisor for every state."],
  "equal-groups-array": ["cell count = rows * columns for every state.", "Rows and columns remain independently countable and the zero case is explicit."],
  "exponential-logarithmic": ["Exponential and logarithmic graphs are inverse reflections across y = x.", "Base restrictions and domain restrictions are enforced."],
  "expression-equivalence": ["Each transformation preserves expression value on valid inputs.", "Operation order is visible and evaluated correctly."],
  "factor-array": ["Every displayed factor pair multiplies to the selected whole number.", "Changing orientation preserves the product."],
  "fraction-equivalence": ["Shaded amount = numerator / denominator.", "Equivalent fractions occupy the same total length or area."],
  "fraction-operations": ["The displayed result equals exact rational arithmetic.", "Common-denominator or area steps preserve value."],
  "function-properties": ["Domain and range derive from the displayed function.", "Monotonicity, parity, zeros, and inverse claims match the graph."],
  "geometric-modeling": ["Assumptions, variables, formula, and displayed geometry share stable semantic IDs.", "Changing an assumption updates all dependent quantities."],
  "inequality-solver": ["The solution region and endpoint openness match the inequality.", "Multiplying or dividing by a negative reverses the inequality sign."],
  "large-whole-number-line": ["The viewport includes every promised endpoint, including 20, 100, 1000, or 10000 as applicable.", "Addition and subtraction jumps preserve start + signed step = end."],
  "line-angle-geometry": ["Parallel and perpendicular status is generated from line direction vectors.", "Corresponding, alternate, and vertical angle claims match the displayed construction."],
  "line-chart": ["Points are ordered on the stated x or time axis.", "Segment changes and trend statements agree with the displayed values."],
  "linear-function": ["Slope is constant and equals delta-y / delta-x.", "Table, formula, and graph share the same ordered pairs."],
  "linear-system": ["The displayed solution satisfies every equation in the system.", "Graphical intersection and algebraic solution agree."],
  "mass-unit-conversion": ["Equivalent gram, kilogram, and tonne values represent the same mass.", "Unit choice and conversion preserve magnitude."],
  "measurement-estimation": ["The estimate and measured value are separately visible.", "Error = estimate - measurement in the displayed unit."],
  "measurement-model": ["Measured length equals count of shown unit intervals.", "Changing unit rescales the numeric value while preserving physical length."],
  "money-model": ["Displayed denomination values sum exactly to the shown amount.", "Equivalent coin or note combinations preserve total value."],
  "multi-place-value": ["total = sum(digit * 10^place) for all visible places.", "Every place promised by the topic is independently operable and visibly labelled."],
  "optimization-derivative": ["The active control labels describe the optimization scene variables.", "Displayed optimum satisfies the stated derivative or gradient condition."],
  "percent-model": ["percent = part / whole * 100.", "Changing part or whole updates fraction, decimal, and percent consistently."],
  "plane-transform": ["Translation preserves displacement, reflection preserves distance to mirror line, and rotation preserves distance to center.", "The displayed transform equation reproduces every transformed vertex."],
  "polygon-area": ["Displayed polygon area is generated from its shown base, height, and decomposition.", "Rearrangement preserves area."],
  "primary-bar-chart": ["Every bar height equals its displayed count.", "Comparisons and totals use only visible data."],
  "proportional-function": ["Direct proportion keeps y/x constant.", "Inverse proportion keeps x*y constant."],
  "quadratic-features": ["Every displayed root evaluates to zero in the displayed quadratic.", "Vertex, axis, and coefficients describe the same graph."],
  "quadratic-inequality": ["Shaded sign intervals agree with the quadratic graph and roots.", "Endpoint inclusion matches strict or non-strict inequality."],
  "quadrilateral-geometry": ["Classification follows displayed side, angle, diagonal, and parallelism constraints.", "Dragging preserves the selected quadrilateral invariant."],
  "random-variable-distribution": ["Probabilities sum to one.", "Expected value and variance are computed from the displayed distribution."],
  "ratio-proportion": ["a:b equals a/b for nonzero b.", "Equivalent ratios preserve the displayed multiplicative factor."],
  "raw-data-summary": ["Mean, median, spread, and percentiles are computed from the displayed sample.", "Editing an observation recomputes every summary from the same data."],
  "reciprocal-function": ["Every plotted point satisfies x*y = k.", "Asymptotes and quadrant placement match the sign of k."],
  "reflection-symmetry": ["Every point and its image are equidistant from the symmetry axis.", "The joining segment is perpendicular to the symmetry axis."],
  "right-triangle": ["a^2 + b^2 = c^2 for the displayed right triangle.", "The converse and similarity modes use the same visible side data."],
  "seeded-probability-experiment": ["The same seed and controls reproduce the same trial sequence.", "successes + failures = trials and frequency updates only through trials."],
  "sequence-model": ["Terms are displayed at discrete integer indices.", "Every term satisfies the displayed explicit or recurrence rule."],
  "set-logic": ["Set operations match visible element membership.", "Truth, implication, and necessary or sufficient labels follow the displayed conditions."],
  "shape-classifier": ["The displayed side and corner counts equal the generated polygon.", "Classification labels follow visible geometric properties."],
  "signed-real-number-line": ["The axis contains values below zero and zero at a stable origin.", "Opposites are equidistant from zero; irrational or radical markers use numerically correct positions."],
  "small-whole-number-line": ["Every displayed point is in the promised whole-number domain.", "start + step = end is exact for every slider state."],
  "solid-projection": ["The named solid, its visible properties, and its displayed measurements describe one shared model.", "Every displayed surface-area, volume, net, or projection claim is derived from the same solid dimensions."],
  "space-vector-plane": ["Displayed points and direction or normal vectors satisfy the line or plane equation.", "Distances and angles derive from the same vectors."],
  "statistics-distribution": ["The curve, center marker, and spread band use the same mean and spread.", "For an observed x, z = (x - mean) / spread."],
  "symbolic-equation": ["Applying an operation to both sides preserves equality.", "Substituting the displayed solution satisfies the original equation."],
  "triangle-geometry": ["For every draggable triangle, A + B + C = 180 degrees.", "Congruence, similarity, or isosceles claims follow from displayed side and angle data."],
  "triangle-trigonometry": ["sin, cos, and tan are computed from the same marked acute angle and side lengths.", "Changing the triangle while preserving angle preserves the three ratios."],
  "trigonometric-identity": ["sin^2(theta) + cos^2(theta) = 1 for the displayed point.", "Both sides of each transformed identity evaluate equally."],
  "trigonometric-synthesis": ["Unit-circle, triangle-ratio, graph, identity, and sine-law objects share one angle state.", "Every displayed theorem is numerically true for the shown triangle."],
  "unit-circle-wave": ["The unit-circle ordinate equals the linked sine-wave value.", "Amplitude and phase controls update formula and geometry together."],
  "vector-operations": ["Vector addition uses component-wise sums.", "dot(u,v) = |u||v|cos(theta) for the displayed vectors."],
  "volume-layers": ["unit-cube count = length * width * height.", "Length, width, and height are independent controls and every visible layer is countable."]
} as const satisfies Record<string, readonly [string, string]>;

const semanticVariantInvariantStatements = {
  "fraction-operations:fraction-add-subtract": [
    "Every displayed operand and result keeps a nonzero denominator.",
    "Addition and subtraction use exact rational arithmetic and a reduced displayed result."
  ],
  "fraction-operations:fraction-divide": [
    "Every displayed operand and result keeps a nonzero denominator.",
    "Division uses exact rational arithmetic through the reciprocal and a reduced displayed result."
  ],
  "fraction-operations:fraction-multiply": [
    "Every displayed operand and result keeps a nonzero denominator.",
    "Multiplication uses exact rational arithmetic and a reduced displayed result."
  ],
  "line-angle-geometry:parallel-transversal": [
    "Parallel and perpendicular modes derive their status from the displayed direction-vector cross product and dot product.",
    "Every claimed angle relation uses rendered segments whose required intersection points lie on both displayed segments."
  ],
  "coordinate-position:direction-distance-route": [
    "The reference and target are both visible in one oriented map.",
    "Route distance equals the sum of the displayed east-west and north-south step counts."
  ],
  "coordinate-position:relative-position-grid": [
    "The reference and target are both visible in one shared position grid.",
    "Horizontal and vertical step counts exactly determine the displayed relative-position words."
  ],
  "quadrilateral-geometry:quadrilateral-families-composition": [
    "Every named quadrilateral family follows its displayed side, angle, and parallel-line properties.",
    "The composed area equals the sum of the two triangle areas split by the displayed diagonal."
  ],
  "triangle-geometry:similar-triangle-ratios": [
    "All three corresponding side ratios equal one single scale factor.",
    "Corresponding angles are equal in the two displayed triangles."
  ]
} as const satisfies Record<string, readonly [string, string]>;

const rendererTemplateBySemanticFamily: Partial<Record<string, SemanticRendererTemplateId>> = {
  "algebra-tiles-polynomial": "algebra-tiles",
  "analytic-line-circle": "analytic-geometry",
  "bivariate-regression": "bivariate-statistics",
  "catalog-scope": "composite-capstone",
  "circle-sector": "circle-geometry",
  combinatorics: "combinatorics",
  "composite-split": "composite-capstone",
  "conic-sections": "conic-sections",
  "distance-time-rate": "distance-time-graph",
  "expression-equivalence": "expression-equivalence",
  "inequality-solver": "inequality-solver",
  "linear-system": "linear-system",
  "optimization-derivative": "optimization-modeling",
  "proportional-function": "function-family",
  "reflection-symmetry": "coordinate-transform",
  "sequence-model": "sequence-model",
  "set-logic": "set-logic",
  "solid-projection": "solid-nets-projection",
  "space-vector-plane": "space-vector-plane",
  "triangle-geometry": "triangle-geometry",
  "triangle-trigonometry": "triangle-trigonometry",
  "trigonometric-synthesis": "composite-capstone",
  "vector-operations": "vector-operations"
};

function metadataSearchText(lab: FeaturedLabDefinition): string {
  // Stable identity fields are deliberately searched before prose. Generated
  // focus/formula copy describes the *current* broad template and can therefore
  // contain misleading tokens (for example every coordinate-transform formula
  // says "transform"). Topic ids and catalog variants carry the curriculum
  // semantics without that circular dependency.
  return [lab.labId, lab.topicId, lab.templateConfig.variant]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

function semanticClassification(lab: FeaturedLabDefinition) {
  const profile = configuredVisualizationSemanticTemplateRepairMatrix[lab.templateId];
  const text = metadataSearchText(lab);

  // Cross-track escape hatch for a common catalog error: speed/rate topics are
  // not arrays merely because multiplication is present in d = r * t.
  if (/(speed|distance-time|速度|路程.*(时间|時間))/u.test(text)) {
    return { family: "distance-time-rate", variant: "linked-distance-time-slope" };
  }

  const match = profile.rules.find((rule) => rule.pattern.test(text));

  return {
    family: match?.family ?? profile.defaultFamily,
    variant: match?.variant ?? profile.defaultVariant
  };
}

function recommendedTemplate(lab: FeaturedLabDefinition, family: string): SemanticRendererTemplateId {
  if (family === "equal-groups-array" && lab.templateId !== "array-area") return "array-area";
  if (family === "volume-layers" && lab.templateId === "array-area") return "volume-layers";
  return rendererTemplateBySemanticFamily[family] ?? lab.templateId;
}

function rendererWorkKind(
  lab: FeaturedLabDefinition,
  family: string,
  variant: string,
  target: SemanticRendererTemplateId
): SemanticRendererWorkKind {
  if (target === "composite-capstone") return "split-required";
  if (target !== lab.templateId) return "remap-required";

  const profile = configuredVisualizationSemanticTemplateRepairMatrix[lab.templateId];
  if (family !== profile.defaultFamily || variant !== profile.defaultVariant) return "variant-required";
  return "current-template-contract";
}

function rendererImplementationStatus(
  lab: FeaturedLabDefinition,
  controls: ConfiguredVisualizationSemanticControlContract | null
): SemanticRendererImplementationStatus {
  if (!controls) return "contract-only-unverified";
  if (!controls.externalPlan) return "implemented-direct";

  const strands = resolveConfiguredVisualizationCompositeStrands(lab);
  const hasImplementedPlan = Boolean(
    strands?.length &&
      strands.every((strand) => {
        const strandControls = getConfiguredVisualizationSemanticControlContract(
          strand.family,
          strand.variant
        );
        return Boolean(strandControls && !strandControls.externalPlan);
      })
  );

  return hasImplementedPlan
    ? "implemented-via-external-plan"
    : "external-plan-required";
}

function observableSourcesForControls(
  controls: ConfiguredVisualizationSemanticControlContract | null
): readonly string[] {
  const controlSources = controls
    ? [
        ...controls.sliders.map(({ id, role }) => `slider:${id}:${role}`),
        ...controls.modes.map(({ id }) => `mode:${id}`),
        ...(controls.externalPlan
          ? [
              `external-plan:${controls.externalPlan.kind}`,
              "control:active-strand"
            ]
          : [])
      ]
    : ["controls:contract-only-unverified"];

  return [...controlSources, "display:formula", "mark:geometry-or-data"];
}

export function resolveConfiguredVisualizationSemanticModel(
  lab: FeaturedLabDefinition
): ConfiguredVisualizationSemanticModel {
  const { family, variant } = semanticClassification(lab);
  const invariantStatements = (
    semanticVariantInvariantStatements as Record<string, readonly [string, string]>
  )[`${family}:${variant}`] ?? (
    semanticFamilyInvariantStatements as Record<string, readonly [string, string]>
  )[family];

  if (!invariantStatements) {
    throw new Error(`Missing observable invariant profile for semantic family: ${family}`);
  }

  const target = recommendedTemplate(lab, family);
  const controls = getConfiguredVisualizationSemanticControlContract(family, variant, 0) ?? null;
  const observableSources = observableSourcesForControls(controls);

  return {
    contractId: `${family}:${variant}`,
    source: CONFIGURED_VISUALIZATION_SEMANTIC_MODEL_SOURCE,
    semanticFamily: family,
    variant,
    summary: `${family} / ${variant}: ${invariantStatements[0]}`,
    currentTemplateId: lab.templateId,
    recommendedRenderer: {
      templateId: target,
      familyId: family,
      workKind: rendererWorkKind(lab, family, variant, target),
      implementationStatus: rendererImplementationStatus(lab, controls)
    },
    controls,
    invariants: [
      { id: `${family}:invariant-1`, statement: invariantStatements[0], observableSources },
      { id: `${family}:invariant-2`, statement: invariantStatements[1], observableSources }
    ]
  };
}
