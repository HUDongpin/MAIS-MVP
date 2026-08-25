import { ccssTextbookLessons, type CcssTextbookLessonId } from "@/data/ccssTextbookRegistry";

/**
 * GENERATED FILE — do not hand-edit. Regenerate with:
 *   node scripts/build-ccss-lesson-assignments.mjs
 *
 * Curated mapping from a MAIS topic id to the interactive CCSS textbook
 * lessons that render as that topic's lesson core.
 *
 * Same contract as `signatureLabAssignments` (the owner's fan-out strategy):
 * a topic listed here renders its assigned lessons instead of the generated
 * concept/worked-example text blocks; a topic absent here keeps the generated
 * blocks, so coverage is explicit and revertible per line. `primary` leads and
 * anchors the topic; `related` lessons follow in document standard order.
 * Every referenced slug must be ported — the contract test enforces it.
 *
 * Join result (2026-07-19): 64 topics covered
 * (29 K–G5 textbook + 35 G6–G12 chapter topics),
 * 270/270 lessons reachable, zero orphans.
 */

export type CcssLessonAssignment = {
  /** The lesson that leads the topic's lesson core. */
  primary: CcssTextbookLessonId;
  /** Further ported lessons matching this topic's standards, rendered after the primary. */
  related?: CcssTextbookLessonId[];
  /** Why this primary was chosen. Required — the curation audit trail. */
  rationale: string;
};

export const ccssLessonAssignments: Record<string, CcssLessonAssignment> = {
  "us-ca-math-k-k-cc-count-sequence": {
    primary: "count-to-100",
    related: ["counting-ten-frame"],
    rationale:
      "CCSS join on K.CC.A.1, K.CC.A.2, K.CC.A.3: 2 ported lesson(s) share these standards — count-to-100 (K.CC.A.1, K.CC.A.2); counting-ten-frame (K.CC.A.3). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-k-k-cc-cardinality-compare": {
    primary: "counting-ten-frame",
    related: ["compare-groups"],
    rationale:
      "CCSS join on K.CC.B.4, K.CC.B.5, K.CC.C.6, K.CC.C.7: 2 ported lesson(s) share these standards — counting-ten-frame (K.CC.B.4, K.CC.B.5); compare-groups (K.CC.C.6, K.CC.C.7). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-k-k-oa-compose-decompose": {
    primary: "number-bonds",
    related: [],
    rationale:
      "CCSS join on K.OA.A.1, K.OA.A.2, K.OA.A.3, K.OA.A.4, K.OA.A.5: 1 ported lesson(s) share these standards — number-bonds (K.OA.A.1, K.OA.A.2, K.OA.A.3, K.OA.A.4, K.OA.A.5). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-k-k-nbt-teen-numbers": {
    primary: "teen-numbers",
    related: [],
    rationale:
      "CCSS join on K.NBT.A.1: 1 ported lesson(s) share these standards — teen-numbers (K.NBT.A.1). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-k-k-md-attributes-data": {
    primary: "compare-length",
    related: ["sort-and-count"],
    rationale:
      "CCSS join on K.MD.A.1, K.MD.A.2, K.MD.B.3: 2 ported lesson(s) share these standards — compare-length (K.MD.A.1, K.MD.A.2); sort-and-count (K.MD.B.3). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-k-k-g-shapes-position": {
    primary: "position-words",
    related: ["flat-shapes","compose-shapes"],
    rationale:
      "CCSS join on K.G.A.1, K.G.A.2, K.G.A.3, K.G.B.4, K.G.B.5, K.G.B.6: 3 ported lesson(s) share these standards — position-words (K.G.A.1); flat-shapes (K.G.A.2, K.G.A.3, K.G.B.4); compose-shapes (K.G.B.5, K.G.B.6). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p1-1-oa-add-subtract": {
    primary: "add-subtract-stories",
    related: ["missing-addend","count-on-count-back","make-ten-to-add","equal-sign-balance"],
    rationale:
      "CCSS join on 1.OA.A.1, 1.OA.A.2, 1.OA.B.3, 1.OA.B.4, 1.OA.C.5, 1.OA.C.6, 1.OA.D.7, 1.OA.D.8: 5 ported lesson(s) share these standards — add-subtract-stories (1.OA.A.1, 1.OA.A.2); missing-addend (1.OA.B.4); count-on-count-back (1.OA.C.5); make-ten-to-add (1.OA.C.6, 1.OA.B.3); equal-sign-balance (1.OA.D.7, 1.OA.D.8). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p1-1-nbt-place-value": {
    primary: "count-to-120",
    related: ["tens-and-ones","compare-two-digit","add-within-100"],
    rationale:
      "CCSS join on 1.NBT.A.1, 1.NBT.B.2, 1.NBT.B.3, 1.NBT.C.4, 1.NBT.C.5, 1.NBT.C.6: 4 ported lesson(s) share these standards — count-to-120 (1.NBT.A.1); tens-and-ones (1.NBT.B.2, 1.NBT.C.5); compare-two-digit (1.NBT.B.3); add-within-100 (1.NBT.C.4, 1.NBT.C.6). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p1-1-md-measure-data": {
    primary: "order-and-measure",
    related: ["telling-time","picture-graph"],
    rationale:
      "CCSS join on 1.MD.A.1, 1.MD.A.2, 1.MD.B.3, 1.MD.C.4: 3 ported lesson(s) share these standards — order-and-measure (1.MD.A.1, 1.MD.A.2); telling-time (1.MD.B.3); picture-graph (1.MD.C.4). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p1-1-g-shape-reasoning": {
    primary: "shape-attributes",
    related: ["compose-2d","partition-shapes"],
    rationale:
      "CCSS join on 1.G.A.1, 1.G.A.2, 1.G.A.3: 3 ported lesson(s) share these standards — shape-attributes (1.G.A.1); compose-2d (1.G.A.2); partition-shapes (1.G.A.3). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p2-2-oa-fluency-arrays": {
    primary: "word-problems-100",
    related: ["fluent-within-20","odd-even","arrays-repeated-addition"],
    rationale:
      "CCSS join on 2.OA.A.1, 2.OA.B.2, 2.OA.C.3, 2.OA.C.4: 4 ported lesson(s) share these standards — word-problems-100 (2.OA.A.1); fluent-within-20 (2.OA.B.2); odd-even (2.OA.C.3); arrays-repeated-addition (2.OA.C.4). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p2-2-nbt-three-digit-place-value": {
    primary: "place-value-blocks",
    related: ["skip-counting","compare-three-digit","add-subtract-regroup","add-four-numbers","add-subtract-1000","mental-10-100"],
    rationale:
      "CCSS join on 2.NBT.A.1, 2.NBT.A.2, 2.NBT.A.3, 2.NBT.A.4, 2.NBT.B.5, 2.NBT.B.6, 2.NBT.B.7, 2.NBT.B.8, 2.NBT.B.9: 7 ported lesson(s) share these standards — place-value-blocks (2.NBT.A.1, 2.NBT.A.3); skip-counting (2.NBT.A.2); compare-three-digit (2.NBT.A.4); add-subtract-regroup (2.NBT.B.5); add-four-numbers (2.NBT.B.6); add-subtract-1000 (2.NBT.B.7, 2.NBT.B.9); mental-10-100 (2.NBT.B.8). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p2-2-md-measure-data-money-time": {
    primary: "measure-with-ruler",
    related: ["estimate-compare-length","length-number-line","time-five-minutes","money","line-plot","bar-graph"],
    rationale:
      "CCSS join on 2.MD.A.1, 2.MD.A.2, 2.MD.A.3, 2.MD.A.4, 2.MD.B.5, 2.MD.B.6, 2.MD.C.7, 2.MD.C.8, 2.MD.D.9, 2.MD.D.10: 7 ported lesson(s) share these standards — measure-with-ruler (2.MD.A.1, 2.MD.A.2); estimate-compare-length (2.MD.A.3, 2.MD.A.4); length-number-line (2.MD.B.5, 2.MD.B.6); time-five-minutes (2.MD.C.7); money (2.MD.C.8); line-plot (2.MD.D.9); bar-graph (2.MD.D.10). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p2-2-g-partition-shapes": {
    primary: "shapes-by-attributes",
    related: ["rows-and-columns","equal-shares"],
    rationale:
      "CCSS join on 2.G.A.1, 2.G.A.2, 2.G.A.3: 3 ported lesson(s) share these standards — shapes-by-attributes (2.G.A.1); rows-and-columns (2.G.A.2); equal-shares (2.G.A.3). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p3-3-oa-mult-div": {
    primary: "division-meaning",
    related: ["multiply-divide-words","multiplication-properties","multiplication-fluency","two-step-problems","arithmetic-patterns","area-model"],
    rationale:
      "CCSS join on 3.OA.A.1, 3.OA.A.2, 3.OA.A.3, 3.OA.A.4, 3.OA.B.5, 3.OA.B.6, 3.OA.C.7, 3.OA.D.8, 3.OA.D.9: 7 ported lesson(s) share these standards — division-meaning (3.OA.A.2, 3.OA.B.6); multiply-divide-words (3.OA.A.3, 3.OA.A.4); multiplication-properties (3.OA.B.5); multiplication-fluency (3.OA.C.7); two-step-problems (3.OA.D.8); arithmetic-patterns (3.OA.D.9); area-model (3.OA.A.1). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p3-3-nbt-arithmetic": {
    primary: "rounding",
    related: ["add-subtract-algorithm","multiply-by-tens"],
    rationale:
      "CCSS join on 3.NBT.A.1, 3.NBT.A.2, 3.NBT.A.3: 3 ported lesson(s) share these standards — rounding (3.NBT.A.1); add-subtract-algorithm (3.NBT.A.2); multiply-by-tens (3.NBT.A.3). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p3-3-nf-fraction-meaning": {
    primary: "fractions-number-line",
    related: ["compare-fractions"],
    rationale:
      "CCSS join on 3.NF.A.1, 3.NF.A.2, 3.NF.A.3: 2 ported lesson(s) share these standards — fractions-number-line (3.NF.A.1, 3.NF.A.2); compare-fractions (3.NF.A.3). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p3-3-md-time-data-area-perimeter": {
    primary: "time-to-minute",
    related: ["volume-mass","scaled-graphs","measure-line-plot","area-count","area-model","perimeter"],
    rationale:
      "CCSS join on 3.MD.A.1, 3.MD.A.2, 3.MD.B.3, 3.MD.B.4, 3.MD.C.5, 3.MD.C.6, 3.MD.C.7, 3.MD.D.8: 7 ported lesson(s) share these standards — time-to-minute (3.MD.A.1); volume-mass (3.MD.A.2); scaled-graphs (3.MD.B.3); measure-line-plot (3.MD.B.4); area-count (3.MD.C.5, 3.MD.C.6); area-model (3.MD.C.7); perimeter (3.MD.D.8). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p3-3-g-categories": {
    primary: "quadrilaterals",
    related: ["partition-equal-areas"],
    rationale:
      "CCSS join on 3.G.A.1, 3.G.A.2: 2 ported lesson(s) share these standards — quadrilaterals (3.G.A.1); partition-equal-areas (3.G.A.2). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p4-4-oa-factors-patterns": {
    primary: "multiplicative-comparison",
    related: ["multistep-problems","factors-multiples","growing-patterns"],
    rationale:
      "CCSS join on 4.OA.A.1, 4.OA.A.2, 4.OA.A.3, 4.OA.B.4, 4.OA.C.5: 4 ported lesson(s) share these standards — multiplicative-comparison (4.OA.A.1, 4.OA.A.2); multistep-problems (4.OA.A.3); factors-multiples (4.OA.B.4); growing-patterns (4.OA.C.5). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p4-4-nbt-multi-digit": {
    primary: "place-value-relationship",
    related: ["read-compare-multidigit","rounding-multidigit","add-subtract-bignum","multiply-multidigit","long-division"],
    rationale:
      "CCSS join on 4.NBT.A.1, 4.NBT.A.2, 4.NBT.A.3, 4.NBT.B.4, 4.NBT.B.5, 4.NBT.B.6: 6 ported lesson(s) share these standards — place-value-relationship (4.NBT.A.1); read-compare-multidigit (4.NBT.A.2); rounding-multidigit (4.NBT.A.3); add-subtract-bignum (4.NBT.B.4); multiply-multidigit (4.NBT.B.5); long-division (4.NBT.B.6). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p4-4-nf-fraction-decimal": {
    primary: "equivalent-fractions",
    related: ["compare-fractions-4","add-subtract-fractions","multiply-fraction-whole","fractions-10-100","decimals-fractions","compare-decimals"],
    rationale:
      "CCSS join on 4.NF.A.1, 4.NF.A.2, 4.NF.B.3, 4.NF.B.4, 4.NF.C.5, 4.NF.C.6, 4.NF.C.7: 7 ported lesson(s) share these standards — equivalent-fractions (4.NF.A.1); compare-fractions-4 (4.NF.A.2); add-subtract-fractions (4.NF.B.3); multiply-fraction-whole (4.NF.B.4); fractions-10-100 (4.NF.C.5); decimals-fractions (4.NF.C.6); compare-decimals (4.NF.C.7). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p4-4-md-conversion-angles": {
    primary: "measurement-conversion",
    related: ["area-perimeter-formulas","line-plot-fractions","angles-fraction-circle","protractor","add-angles"],
    rationale:
      "CCSS join on 4.MD.A.1, 4.MD.A.2, 4.MD.A.3, 4.MD.B.4, 4.MD.C.5, 4.MD.C.6, 4.MD.C.7: 6 ported lesson(s) share these standards — measurement-conversion (4.MD.A.1, 4.MD.A.2); area-perimeter-formulas (4.MD.A.3); line-plot-fractions (4.MD.B.4); angles-fraction-circle (4.MD.C.5); protractor (4.MD.C.6); add-angles (4.MD.C.7). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p4-4-g-lines-shapes": {
    primary: "lines-angles",
    related: ["classify-triangles","symmetry"],
    rationale:
      "CCSS join on 4.G.A.1, 4.G.A.2, 4.G.A.3: 3 ported lesson(s) share these standards — lines-angles (4.G.A.1); classify-triangles (4.G.A.2); symmetry (4.G.A.3). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p5-5-oa-expressions-patterns": {
    primary: "order-of-operations",
    related: ["write-expressions","two-patterns-graph"],
    rationale:
      "CCSS join on 5.OA.A.1, 5.OA.A.2, 5.OA.B.3: 3 ported lesson(s) share these standards — order-of-operations (5.OA.A.1); write-expressions (5.OA.A.2); two-patterns-graph (5.OA.B.3). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p5-5-nbt-decimals": {
    primary: "decimal-place-value",
    related: ["powers-of-ten","read-compare-decimals-thousandths","round-decimals","multiply-whole-numbers","divide-two-digit","decimal-operations"],
    rationale:
      "CCSS join on 5.NBT.A.1, 5.NBT.A.2, 5.NBT.A.3, 5.NBT.A.4, 5.NBT.B.5, 5.NBT.B.6, 5.NBT.B.7: 7 ported lesson(s) share these standards — decimal-place-value (5.NBT.A.1); powers-of-ten (5.NBT.A.2); read-compare-decimals-thousandths (5.NBT.A.3); round-decimals (5.NBT.A.4); multiply-whole-numbers (5.NBT.B.5); divide-two-digit (5.NBT.B.6); decimal-operations (5.NBT.B.7). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p5-5-nf-operations": {
    primary: "add-fractions-unlike",
    related: ["fraction-as-division","multiply-fractions","multiply-mixed-numbers","divide-unit-fractions"],
    rationale:
      "CCSS join on 5.NF.A.1, 5.NF.A.2, 5.NF.B.3, 5.NF.B.4, 5.NF.B.5, 5.NF.B.6, 5.NF.B.7: 5 ported lesson(s) share these standards — add-fractions-unlike (5.NF.A.1, 5.NF.A.2); fraction-as-division (5.NF.B.3); multiply-fractions (5.NF.B.4, 5.NF.B.5); multiply-mixed-numbers (5.NF.B.6); divide-unit-fractions (5.NF.B.7). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p5-5-md-volume-data": {
    primary: "metric-conversion",
    related: ["line-plot-operations","volume-unit-cubes"],
    rationale:
      "CCSS join on 5.MD.A.1, 5.MD.B.2, 5.MD.C.3, 5.MD.C.4, 5.MD.C.5: 3 ported lesson(s) share these standards — metric-conversion (5.MD.A.1); line-plot-operations (5.MD.B.2); volume-unit-cubes (5.MD.C.3, 5.MD.C.4, 5.MD.C.5). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p5-5-g-coordinate-shapes": {
    primary: "coordinate-plane",
    related: ["shape-hierarchy"],
    rationale:
      "CCSS join on 5.G.A.1, 5.G.A.2, 5.G.B.3, 5.G.B.4: 2 ported lesson(s) share these standards — coordinate-plane (5.G.A.1, 5.G.A.2); shape-hierarchy (5.G.B.3, 5.G.B.4). Primary is first in document standard order (upstream units.ts ordering)."
  },
  "us-ca-math-p6-chapter-01": {
    primary: "ratio-double-number-line",
    related: ["unit-rate","percents"],
    rationale:
      "P6 chapter 1 \"Ratios, Rates, and Percent Reasoning\": 3 ported lesson(s) match standard prefixes [6.RP] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-p6-chapter-02": {
    primary: "divide-fractions",
    related: ["divide-multidigit","decimal-arithmetic","gcf-lcm","negative-numbers","four-quadrant-plane","absolute-value"],
    rationale:
      "P6 chapter 2 \"Rational Numbers and the Number Line\": 7 ported lesson(s) match standard prefixes [6.NS] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-p6-chapter-03": {
    primary: "exponents",
    related: ["variables-expressions","equivalent-expressions","solve-one-step-equations","inequalities","dependent-independent"],
    rationale:
      "P6 chapter 3 \"Expressions, Equations, and Variables\": 6 ported lesson(s) match standard prefixes [6.EE] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-p6-chapter-04": {
    primary: "area-triangles",
    related: ["volume-fractional","polygons-coordinate","surface-area-nets"],
    rationale:
      "P6 chapter 4 \"Geometry: Area, Surface Area, and Volume\": 4 ported lesson(s) match standard prefixes [6.G] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-p6-chapter-05": {
    primary: "statistical-questions",
    related: ["mean-median","data-displays"],
    rationale:
      "P6 chapter 5 \"Statistics and Data Distributions\": 3 ported lesson(s) match standard prefixes [6.SP] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s1-chapter-01": {
    primary: "complex-unit-rates",
    related: ["proportional-relationships","percent-problems"],
    rationale:
      "S1 chapter 1 \"Proportional Relationships\": 3 ported lesson(s) match standard prefixes [7.RP] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s1-chapter-02": {
    primary: "integer-arrows",
    related: ["multiply-divide-integers","rational-operations"],
    rationale:
      "S1 chapter 2 \"Operations with Rational Numbers\": 3 ported lesson(s) match standard prefixes [7.NS] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s1-chapter-03": {
    primary: "linear-expressions",
    related: ["multistep-rational","two-step-equations"],
    rationale:
      "S1 chapter 3 \"Linear Expressions and Equations\": 3 ported lesson(s) match standard prefixes [7.EE] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s1-chapter-04": {
    primary: "scale-drawings",
    related: ["construct-triangles","cross-sections","circle-pi","angle-relationships","area-volume-surface"],
    rationale:
      "S1 chapter 4 \"Scale, Geometry, and Measurement\": 6 ported lesson(s) match standard prefixes [7.G] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s1-chapter-05": {
    primary: "sampling",
    related: ["compare-populations","probability-basics","probability-models","compound-events"],
    rationale:
      "S1 chapter 5 \"Sampling, Probability, and Inference\": 5 ported lesson(s) match standard prefixes [7.SP] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s2-chapter-01": {
    primary: "rational-irrational",
    related: ["approximate-irrationals","linear-equations","systems-of-equations"],
    rationale:
      "S2 chapter 1 \"Linear Equations and Systems Readiness\": 4 ported lesson(s) match standard prefixes [8.EE.C, 8.NS] (title-over-tag curation: title 'Linear Equations and Systems Readiness' = 8.EE.C systems + 8.NS readiness (bank tag was off-by-one G8.NS until the 2026-08-25 fix)). Primary is first in document standard order."
  },
  "us-ca-math-s2-chapter-02": {
    primary: "slope-unit-rate",
    related: ["slope-explorer","functions-intro","construct-linear-function","graph-stories"],
    rationale:
      "S2 chapter 2 \"Functions and Rate of Change\": 5 ported lesson(s) match standard prefixes [8.F, 8.EE.B] (title-over-tag curation: title 'Functions and Rate of Change' = 8.F + 8.EE.B slope (bank tag was off-by-one G8.EE until the 2026-08-25 fix)). Primary is first in document standard order."
  },
  "us-ca-math-s2-chapter-03": {
    primary: "transformations",
    related: ["congruence","similarity","triangle-angles"],
    rationale:
      "S2 chapter 3 \"Transformations and Similarity\": 4 ported lesson(s) match standard prefixes [8.G.A] (title-over-tag curation: title 'Transformations and Similarity' = 8.G.A (bank tag was off-by-one G8.F until the 2026-08-25 fix)). Primary is first in document standard order."
  },
  "us-ca-math-s2-chapter-04": {
    primary: "integer-exponents",
    related: ["roots","scientific-notation","pythagorean-theorem","distance-formula","volume-3d"],
    rationale:
      "S2 chapter 4 \"Pythagorean Reasoning and Coordinate Geometry\": 6 ported lesson(s) match standard prefixes [8.G.B, 8.G.C, 8.EE.A] (title-over-tag curation: title 'Pythagorean Reasoning and Coordinate Geometry' = 8.G.B–C plus 8.EE.A roots/exponents readiness). Primary is first in document standard order."
  },
  "us-ca-math-s2-chapter-05": {
    primary: "scatter-plots",
    related: ["line-of-best-fit","two-way-tables"],
    rationale:
      "S2 chapter 5 \"Bivariate Data and Claims\": 3 ported lesson(s) match standard prefixes [8.SP] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s3-chapter-01": {
    primary: "rational-exponents",
    related: ["real-number-closure","create-equations","constraints-formulas"],
    rationale:
      "S3 chapter 1 \"Equations from Context\": 4 ported lesson(s) match standard prefixes [N-RN, A-CED] (title-over-tag curation: title 'Equations from Context' = A-CED, keeping the tagged N-RN number work as course readiness). Primary is first in document standard order."
  },
  "us-ca-math-s3-chapter-02": {
    primary: "function-notation",
    related: ["interpret-function-graphs","quadratic-vertex-form","compare-functions"],
    rationale:
      "S3 chapter 2 \"Function Notation and Interpretation\": 4 ported lesson(s) match standard prefixes [F-IF] (title-over-tag curation: title 'Function Notation and Interpretation' = F-IF (tag A-CED is rotated)). Primary is first in document standard order."
  },
  "us-ca-math-s3-chapter-03": {
    primary: "solve-equations-steps",
    related: ["interpret-expressions","rewrite-expressions","rational-radical-equations","solve-quadratics","systems-elimination","linear-quadratic-systems","matrix-equations","graphs-and-solutions","graph-inequalities"],
    rationale:
      "S3 chapter 3 \"Linear and Quadratic Models\": 10 ported lesson(s) match standard prefixes [A-REI, A-SSE.1, A-SSE.2, A-SSE.3] (title-over-tag curation: title 'Linear and Quadratic Models' = A-REI solving + quadratic expression structure; F-LE model-choice lessons live in S5 ch02, their natural home). Primary is first in document standard order."
  },
  "us-ca-math-s3-chapter-04": {
    primary: "equation-of-circle",
    related: ["conic-sections","coordinate-proofs","partition-segment","coordinate-perimeter-area"],
    rationale:
      "S3 chapter 4 \"Coordinate Geometry Methods\": 5 ported lesson(s) match standard prefixes [G-GPE] (title-over-tag curation: title 'Coordinate Geometry Methods' = G-GPE (tag F-IF is rotated) — same owner curation as the signature labs). Primary is first in document standard order."
  },
  "us-ca-math-s3-chapter-05": {
    primary: "statistical-displays",
    related: ["compare-distributions","normal-distribution","two-way-frequencies","fit-function-residuals","linear-model-interpretation","correlation"],
    rationale:
      "S3 chapter 5 \"Modeling with Evidence\": 7 ported lesson(s) match standard prefixes [S-ID] (title-over-tag curation: title 'Modeling with Evidence' = S-ID data modeling (tag G-GPE is rotated)). Primary is first in document standard order."
  },
  "us-ca-math-s4-chapter-01": {
    primary: "precise-definitions",
    related: ["transformations-as-functions","figure-symmetry","congruence-criteria","prove-angle-theorems","prove-triangle-theorems","prove-parallelogram-theorems","constructions"],
    rationale:
      "S4 chapter 1 \"Congruence and Proof\": 8 ported lesson(s) match standard prefixes [G-CO] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s4-chapter-02": {
    primary: "dilations",
    related: ["similarity-transformations","similarity-proofs","trig-ratios","solve-right-triangles","triangle-area-sine","laws-sines-cosines"],
    rationale:
      "S4 chapter 2 \"Similarity and Right-Triangle Reasoning\": 7 ported lesson(s) match standard prefixes [G-SRT] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s4-chapter-03": {
    primary: "circle-angles",
    related: ["circle-constructions","arc-length-sector","volume-arguments","volume-formulas","solids-cross-sections"],
    rationale:
      "S4 chapter 3 \"Circle Geometry\": 6 ported lesson(s) match standard prefixes [G-C, G-GMD] (title-over-tag curation: title 'Circle Geometry' = G-C; G-GMD solids join here as the course's measurement strand). Primary is first in document standard order."
  },
  "us-ca-math-s4-chapter-04": {
    primary: "interpret-expressions",
    related: ["rewrite-expressions","geometric-series"],
    rationale:
      "S4 chapter 4 \"Quadratic Structure\": 3 ported lesson(s) match standard prefixes [A-SSE] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s4-chapter-05": {
    primary: "set-operations-events",
    related: ["independence","conditional-probability","two-way-probability","addition-rule","multiplication-rule","permutations-combinations"],
    rationale:
      "S4 chapter 5 \"Conditional Probability\": 7 ported lesson(s) match standard prefixes [S-CP] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s5-chapter-01": {
    primary: "quadratic-vertex-form",
    related: ["build-functions","inverse-functions"],
    rationale:
      "S5 chapter 1 \"Function Transformations and Inverses\": 3 ported lesson(s) match standard prefixes [F-BF] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s5-chapter-02": {
    primary: "exponential-vs-linear",
    related: ["construct-linear-exponential","logarithms"],
    rationale:
      "S5 chapter 2 \"Exponential and Logarithmic Models\": 3 ported lesson(s) match standard prefixes [F-LE] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s5-chapter-03": {
    primary: "unit-circle",
    related: ["special-angle-values","trig-symmetry","periodic-models","inverse-trig","trig-identities"],
    rationale:
      "S5 chapter 3 \"Trigonometric Functions and Graphs\": 6 ported lesson(s) match standard prefixes [F-TF] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s5-chapter-04": {
    primary: "statistical-displays",
    related: ["compare-distributions","normal-distribution","two-way-frequencies","fit-function-residuals","linear-model-interpretation","correlation"],
    rationale:
      "S5 chapter 4 \"Data Modeling and Residuals\": 7 ported lesson(s) match standard prefixes [S-ID] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s5-chapter-05": {
    primary: "sampling-inference",
    related: ["study-design","estimate-population","compare-treatments","evaluate-reports"],
    rationale:
      "S5 chapter 5 \"Statistical Inference and Claims\": 5 ported lesson(s) match standard prefixes [S-IC] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s6-chapter-01": {
    primary: "units-quantities",
    related: [],
    rationale:
      "S6 chapter 1 \"Quantities, Units, and Precision\": 1 ported lesson(s) match standard prefixes [N-Q] (from the chapter's bank domain tag). Primary is first in document standard order."
  },
  "us-ca-math-s6-chapter-02": {
    primary: "complex-numbers",
    related: ["complex-conjugates","complex-plane","complex-solutions","polynomial-operations","remainder-theorem","polynomial-identities","rational-expressions"],
    rationale:
      "S6 chapter 2 \"Polynomial Structure and Behavior\": 8 ported lesson(s) match standard prefixes [A-APR, N-CN] (title-over-tag curation: title 'Polynomial Structure and Behavior': N-CN complex roots complete the polynomial story). Primary is first in document standard order."
  },
  "us-ca-math-s6-chapter-03": {
    primary: "random-variables",
    related: ["expected-value","decisions-probability"],
    rationale:
      "S6 chapter 3 \"Decision Statistics\": 3 ported lesson(s) match standard prefixes [S-MD] (title-over-tag curation: title 'Decision Statistics' = S-MD (tag F-IF is swapped with ch04)). Primary is first in document standard order."
  },
  "us-ca-math-s6-chapter-04": {
    primary: "function-notation",
    related: ["interpret-function-graphs","quadratic-vertex-form","compare-functions"],
    rationale:
      "S6 chapter 4 \"Function Analysis and Rates\": 4 ported lesson(s) match standard prefixes [F-IF] (title-over-tag curation: title 'Function Analysis and Rates' = F-IF (tag S-MD is swapped with ch03)). Primary is first in document standard order."
  },
  "us-ca-math-s6-chapter-05": {
    primary: "vectors",
    related: ["vector-operations","matrices","matrix-algebra","matrix-transformations","geometric-modeling"],
    rationale:
      "S6 chapter 5 \"Capstone Modeling\": 6 ported lesson(s) match standard prefixes [Modeling, G-MG, N-VM] (title-over-tag curation: title 'Capstone Modeling': G-MG geometric modeling and N-VM vector/matrix tools join the capstone). Primary is first in document standard order."
  }
};

export function hasCcssLessonAssignment(topicId: string): boolean {
  return topicId in ccssLessonAssignments;
}

export function getCcssLessonAssignment(topicId: string): CcssLessonAssignment | null {
  return ccssLessonAssignments[topicId] ?? null;
}

/** The topic's lessons in render order: primary first, then related. */
export function ccssLessonSequenceForTopic(topicId: string): CcssTextbookLessonId[] {
  const assignment = ccssLessonAssignments[topicId];
  if (!assignment) return [];
  return [assignment.primary, ...(assignment.related ?? [])];
}

/** Meta lookup for every lesson assigned to a topic, render-ordered. */
export function ccssLessonMetasForTopic(topicId: string) {
  return ccssLessonSequenceForTopic(topicId).map((slug) => ccssTextbookLessons[slug]);
}
