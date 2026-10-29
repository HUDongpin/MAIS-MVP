import { ccssTextbookNarrationOverrides } from "./ccssTextbookNarrations";
import type { GradeId } from "@/types";

/**
 * GENERATED FILE — do not hand-edit. Regenerate with:
 *   node scripts/generate-ccss-registry.mjs
 *
 * Server-safe metadata for the 305 interactive CCSS textbook lessons:
 * 270 ported from the CCSS-Math-Textbook app (snapshot:
 * ccss-textbook-source-v1, 2026-07-19) and 35 MAIS-authored
 * chapter openers (snapshot: ccss-textbook-claude-v1, 2026-09-02) that
 * replaced the Codex text-only California textbooks. Mirrors the signature-lab
 * port pattern: metadata lives here and is importable anywhere; the interactive
 * bodies live in `components/lesson/ccss/lessons/` and load through the
 * code-split routes in `components/lesson/ccss/registry.ts`.
 *
 * Read-aloud narrations resolve from data/ccssTextbookNarrations.ts (hand-
 * authored overrides), then the snapshot's authored narration, then the lesson
 * summary as fallback.
 */

export type CcssTextbookLessonId =
  | "counting-ten-frame"
  | "count-to-100"
  | "compare-groups"
  | "number-bonds"
  | "teen-numbers"
  | "compare-length"
  | "sort-and-count"
  | "flat-shapes"
  | "compose-shapes"
  | "position-words"
  | "make-ten-to-add"
  | "add-subtract-stories"
  | "count-on-count-back"
  | "missing-addend"
  | "equal-sign-balance"
  | "count-to-120"
  | "tens-and-ones"
  | "compare-two-digit"
  | "add-within-100"
  | "order-and-measure"
  | "telling-time"
  | "picture-graph"
  | "shape-attributes"
  | "compose-2d"
  | "partition-shapes"
  | "word-problems-100"
  | "fluent-within-20"
  | "odd-even"
  | "arrays-repeated-addition"
  | "place-value-blocks"
  | "skip-counting"
  | "compare-three-digit"
  | "add-subtract-regroup"
  | "add-four-numbers"
  | "add-subtract-1000"
  | "mental-10-100"
  | "measure-with-ruler"
  | "estimate-compare-length"
  | "length-number-line"
  | "time-five-minutes"
  | "money"
  | "line-plot"
  | "bar-graph"
  | "shapes-by-attributes"
  | "rows-and-columns"
  | "equal-shares"
  | "division-meaning"
  | "multiply-divide-words"
  | "multiplication-properties"
  | "multiplication-fluency"
  | "two-step-problems"
  | "arithmetic-patterns"
  | "rounding"
  | "add-subtract-algorithm"
  | "multiply-by-tens"
  | "compare-fractions"
  | "time-to-minute"
  | "volume-mass"
  | "scaled-graphs"
  | "measure-line-plot"
  | "area-count"
  | "perimeter"
  | "quadrilaterals"
  | "partition-equal-areas"
  | "fractions-number-line"
  | "area-model"
  | "multiplicative-comparison"
  | "multistep-problems"
  | "factors-multiples"
  | "growing-patterns"
  | "place-value-relationship"
  | "read-compare-multidigit"
  | "rounding-multidigit"
  | "add-subtract-bignum"
  | "multiply-multidigit"
  | "long-division"
  | "compare-fractions-4"
  | "add-subtract-fractions"
  | "multiply-fraction-whole"
  | "fractions-10-100"
  | "decimals-fractions"
  | "compare-decimals"
  | "measurement-conversion"
  | "area-perimeter-formulas"
  | "line-plot-fractions"
  | "angles-fraction-circle"
  | "protractor"
  | "add-angles"
  | "lines-angles"
  | "classify-triangles"
  | "symmetry"
  | "equivalent-fractions"
  | "order-of-operations"
  | "write-expressions"
  | "two-patterns-graph"
  | "decimal-place-value"
  | "powers-of-ten"
  | "read-compare-decimals-thousandths"
  | "round-decimals"
  | "multiply-whole-numbers"
  | "divide-two-digit"
  | "decimal-operations"
  | "add-fractions-unlike"
  | "fraction-as-division"
  | "multiply-mixed-numbers"
  | "divide-unit-fractions"
  | "metric-conversion"
  | "line-plot-operations"
  | "shape-hierarchy"
  | "volume-unit-cubes"
  | "coordinate-plane"
  | "multiply-fractions"
  | "ratio-double-number-line"
  | "unit-rate"
  | "percents"
  | "divide-fractions"
  | "divide-multidigit"
  | "decimal-arithmetic"
  | "gcf-lcm"
  | "negative-numbers"
  | "absolute-value"
  | "exponents"
  | "variables-expressions"
  | "equivalent-expressions"
  | "solve-one-step-equations"
  | "inequalities"
  | "dependent-independent"
  | "area-triangles"
  | "volume-fractional"
  | "polygons-coordinate"
  | "surface-area-nets"
  | "statistical-questions"
  | "mean-median"
  | "data-displays"
  | "four-quadrant-plane"
  | "integer-arrows"
  | "complex-unit-rates"
  | "proportional-relationships"
  | "percent-problems"
  | "multiply-divide-integers"
  | "rational-operations"
  | "linear-expressions"
  | "multistep-rational"
  | "two-step-equations"
  | "scale-drawings"
  | "construct-triangles"
  | "cross-sections"
  | "angle-relationships"
  | "area-volume-surface"
  | "sampling"
  | "compare-populations"
  | "probability-basics"
  | "probability-models"
  | "compound-events"
  | "circle-pi"
  | "slope-explorer"
  | "rational-irrational"
  | "approximate-irrationals"
  | "integer-exponents"
  | "roots"
  | "scientific-notation"
  | "slope-unit-rate"
  | "linear-equations"
  | "systems-of-equations"
  | "functions-intro"
  | "construct-linear-function"
  | "graph-stories"
  | "transformations"
  | "congruence"
  | "similarity"
  | "triangle-angles"
  | "pythagorean-theorem"
  | "distance-formula"
  | "volume-3d"
  | "scatter-plots"
  | "line-of-best-fit"
  | "two-way-tables"
  | "rational-exponents"
  | "real-number-closure"
  | "units-quantities"
  | "complex-numbers"
  | "complex-conjugates"
  | "complex-plane"
  | "complex-solutions"
  | "vectors"
  | "vector-operations"
  | "matrices"
  | "matrix-algebra"
  | "matrix-transformations"
  | "interpret-expressions"
  | "rewrite-expressions"
  | "geometric-series"
  | "polynomial-operations"
  | "remainder-theorem"
  | "polynomial-identities"
  | "rational-expressions"
  | "create-equations"
  | "constraints-formulas"
  | "solve-equations-steps"
  | "rational-radical-equations"
  | "solve-quadratics"
  | "systems-elimination"
  | "linear-quadratic-systems"
  | "matrix-equations"
  | "graphs-and-solutions"
  | "graph-inequalities"
  | "function-notation"
  | "interpret-function-graphs"
  | "compare-functions"
  | "build-functions"
  | "inverse-functions"
  | "construct-linear-exponential"
  | "logarithms"
  | "special-angle-values"
  | "trig-symmetry"
  | "periodic-models"
  | "inverse-trig"
  | "trig-identities"
  | "precise-definitions"
  | "transformations-as-functions"
  | "figure-symmetry"
  | "congruence-criteria"
  | "prove-angle-theorems"
  | "prove-triangle-theorems"
  | "prove-parallelogram-theorems"
  | "constructions"
  | "dilations"
  | "similarity-transformations"
  | "similarity-proofs"
  | "trig-ratios"
  | "solve-right-triangles"
  | "triangle-area-sine"
  | "laws-sines-cosines"
  | "circle-angles"
  | "circle-constructions"
  | "arc-length-sector"
  | "equation-of-circle"
  | "conic-sections"
  | "coordinate-proofs"
  | "partition-segment"
  | "coordinate-perimeter-area"
  | "volume-arguments"
  | "volume-formulas"
  | "solids-cross-sections"
  | "geometric-modeling"
  | "statistical-displays"
  | "compare-distributions"
  | "normal-distribution"
  | "two-way-frequencies"
  | "fit-function-residuals"
  | "linear-model-interpretation"
  | "correlation"
  | "sampling-inference"
  | "study-design"
  | "estimate-population"
  | "compare-treatments"
  | "evaluate-reports"
  | "set-operations-events"
  | "independence"
  | "conditional-probability"
  | "two-way-probability"
  | "addition-rule"
  | "multiplication-rule"
  | "permutations-combinations"
  | "random-variables"
  | "expected-value"
  | "decisions-probability"
  | "quadratic-vertex-form"
  | "exponential-vs-linear"
  | "unit-circle"
  | "ca-g10-ch01-congruence-proof"
  | "ca-g10-ch02-similarity-right-triangle-reasoning"
  | "ca-g10-ch03-circle-geometry"
  | "ca-g10-ch04-quadratic-structure"
  | "ca-g10-ch05-conditional-probability"
  | "ca-g11-ch01-function-transformations-inverses"
  | "ca-g11-ch02-exponential-logarithmic-models"
  | "ca-g11-ch03-trigonometric-functions-graphs"
  | "ca-g11-ch04-data-modeling-residuals"
  | "ca-g11-ch05-statistical-inference-claims"
  | "ca-g12-ch01-quantities-units-precision"
  | "ca-g12-ch02-polynomial-structure-behavior"
  | "ca-g12-ch03-decision-statistics"
  | "ca-g12-ch04-function-analysis-rates"
  | "ca-g12-ch05-capstone-modeling"
  | "ca-g6-ch01-ratios-rates-percent-reasoning"
  | "ca-g6-ch02-rational-numbers-number-line"
  | "ca-g6-ch03-expressions-equations-variables"
  | "ca-g6-ch04-geometry-area-surface-area"
  | "ca-g6-ch05-statistics-data-distributions"
  | "ca-g7-ch01-proportional-relationships"
  | "ca-g7-ch02-operations-rational-numbers"
  | "ca-g7-ch03-linear-expressions-equations"
  | "ca-g7-ch04-scale-geometry-measurement"
  | "ca-g7-ch05-sampling-probability-inference"
  | "ca-g8-ch01-linear-equations-systems-readiness"
  | "ca-g8-ch02-functions-rate-change"
  | "ca-g8-ch03-transformations-similarity"
  | "ca-g8-ch04-pythagorean-reasoning-coordinate-geometry"
  | "ca-g8-ch05-bivariate-data-claims"
  | "ca-g9-ch01-equations-context"
  | "ca-g9-ch02-function-notation-interpretation"
  | "ca-g9-ch03-linear-quadratic-models"
  | "ca-g9-ch04-coordinate-geometry-methods"
  | "ca-g9-ch05-modeling-evidence";

export type CcssTextbookLessonMeta = {
  slug: CcssTextbookLessonId;
  /** MAIS grade id (upstream CCSS "1"–"5" map to P1–P5). */
  grade: GradeId;
  /** Canonical CCSS grade label from the source registry ("K", "1"–"8", "HS"). */
  ccssGrade: string;
  title: string;
  /** CCSS standard ids this lesson develops; first id is the primary standard. */
  standardIds: string[];
  summary: string;
  emoji: string;
  /** Where the lesson body came from: the ported upstream library, or MAIS-authored (Claude). */
  source: CcssTextbookLessonSource;
  /** For MAIS-authored chapter openers: the California chapter topic the lesson opens. */
  topicId?: string;
  /** Read-aloud script for the AI audio guide (override ?? authored narration ?? summary). */
  narration: string;
};

export type CcssTextbookLessonSource = "ccss-math-textbook" | "mais-claude";

function withNarration(
  meta: Omit<CcssTextbookLessonMeta, "narration"> & { narration?: string }
): CcssTextbookLessonMeta {
  return { ...meta, narration: ccssTextbookNarrationOverrides[meta.slug] ?? meta.narration ?? meta.summary };
}

export const ccssTextbookLessons: Record<CcssTextbookLessonId, CcssTextbookLessonMeta> = {
  "counting-ten-frame": withNarration({
    slug: "counting-ten-frame",
    grade: "K",
    ccssGrade: "K",
    title: "Counting with a Ten-Frame",
    standardIds: ["K.CC.B.4","K.CC.B.5","K.CC.A.3"],
    summary: "Tap counters into a ten-frame and watch the count grow. The last number you say tells how many there are.",
    emoji: "🔢",
    source: "ccss-math-textbook"
  }),
  "count-to-100": withNarration({
    slug: "count-to-100",
    grade: "K",
    ccssGrade: "K",
    title: "Counting to 100",
    standardIds: ["K.CC.A.1","K.CC.A.2"],
    summary: "Explore the hundred chart — count by ones and by tens, and count forward from any number.",
    emoji: "💯",
    source: "ccss-math-textbook"
  }),
  "compare-groups": withNarration({
    slug: "compare-groups",
    grade: "K",
    ccssGrade: "K",
    title: "Comparing Groups: More or Fewer",
    standardIds: ["K.CC.C.6","K.CC.C.7"],
    summary: "Match two groups one-to-one to see which is greater than, less than, or equal to the other.",
    emoji: "🆚",
    source: "ccss-math-textbook"
  }),
  "number-bonds": withNarration({
    slug: "number-bonds",
    grade: "K",
    ccssGrade: "K",
    title: "Number Bonds: Parts and Wholes",
    standardIds: ["K.OA.A.1","K.OA.A.2","K.OA.A.3","K.OA.A.4","K.OA.A.5"],
    summary: "Break a number into two parts and put it back together — the foundation of adding and subtracting.",
    emoji: "🔗",
    source: "ccss-math-textbook"
  }),
  "teen-numbers": withNarration({
    slug: "teen-numbers",
    grade: "K",
    ccssGrade: "K",
    title: "Teen Numbers: Ten and Some More",
    standardIds: ["K.NBT.A.1"],
    summary: "See why every teen number from 11 to 19 is one full ten and some extra ones.",
    emoji: "🧮",
    source: "ccss-math-textbook"
  }),
  "compare-length": withNarration({
    slug: "compare-length",
    grade: "K",
    ccssGrade: "K",
    title: "Comparing Length",
    standardIds: ["K.MD.A.1","K.MD.A.2"],
    summary: "Line two pencils up at the same start to see which is longer and which is shorter.",
    emoji: "🖍️",
    source: "ccss-math-textbook"
  }),
  "sort-and-count": withNarration({
    slug: "sort-and-count",
    grade: "K",
    ccssGrade: "K",
    title: "Sort and Count",
    standardIds: ["K.MD.B.3"],
    summary: "Sort a mixed pile into groups, count each one, and find which group has the most.",
    emoji: "🧺",
    source: "ccss-math-textbook"
  }),
  "flat-shapes": withNarration({
    slug: "flat-shapes",
    grade: "K",
    ccssGrade: "K",
    title: "Flat Shapes: Sides and Corners",
    standardIds: ["K.G.A.2","K.G.A.3","K.G.B.4"],
    summary: "Name flat shapes and count their sides and corners — a shape keeps its name however it is turned.",
    emoji: "🔷",
    source: "ccss-math-textbook"
  }),
  "compose-shapes": withNarration({
    slug: "compose-shapes",
    grade: "K",
    ccssGrade: "K",
    title: "Building Bigger Shapes",
    standardIds: ["K.G.B.5","K.G.B.6"],
    summary: "Join small shapes together to build bigger ones — two triangles make a square.",
    emoji: "🧩",
    source: "ccss-math-textbook"
  }),
  "position-words": withNarration({
    slug: "position-words",
    grade: "K",
    ccssGrade: "K",
    title: "Where Is It? Position Words",
    standardIds: ["K.G.A.1"],
    summary: "Move a ball around a box to learn the position words above, below, and beside.",
    emoji: "⬆️",
    source: "ccss-math-textbook"
  }),
  "make-ten-to-add": withNarration({
    slug: "make-ten-to-add",
    grade: "P1",
    ccssGrade: "1",
    title: "Make a Ten to Add",
    standardIds: ["1.OA.C.6","1.OA.B.3"],
    summary: "Fill a ten-frame to 10, then add the rest. Turn a tricky sum like 8 + 5 into an easy 10 + 3.",
    emoji: "🔟",
    source: "ccss-math-textbook"
  }),
  "add-subtract-stories": withNarration({
    slug: "add-subtract-stories",
    grade: "P1",
    ccssGrade: "1",
    title: "Addition & Subtraction Stories",
    standardIds: ["1.OA.A.1","1.OA.A.2"],
    summary: "Turn word-problem stories — putting together, taking away, adding three — into number sentences.",
    emoji: "📖",
    source: "ccss-math-textbook"
  }),
  "count-on-count-back": withNarration({
    slug: "count-on-count-back",
    grade: "P1",
    ccssGrade: "1",
    title: "Count On, Count Back",
    standardIds: ["1.OA.C.5"],
    summary: "Add by hopping forward on the number line, and subtract by hopping back.",
    emoji: "🦘",
    source: "ccss-math-textbook"
  }),
  "missing-addend": withNarration({
    slug: "missing-addend",
    grade: "P1",
    ccssGrade: "1",
    title: "Subtraction as a Missing Part",
    standardIds: ["1.OA.B.4"],
    summary: "See why 8 − 3 really asks “3 plus what makes 8?” — subtraction is a missing addend.",
    emoji: "❓",
    source: "ccss-math-textbook"
  }),
  "equal-sign-balance": withNarration({
    slug: "equal-sign-balance",
    grade: "P1",
    ccssGrade: "1",
    title: "The Equal Sign & Balancing",
    standardIds: ["1.OA.D.7","1.OA.D.8"],
    summary: "Use a balance scale to see that “=” means “the same as,” and find the number that balances.",
    emoji: "⚖️",
    source: "ccss-math-textbook"
  }),
  "count-to-120": withNarration({
    slug: "count-to-120",
    grade: "P1",
    ccssGrade: "1",
    title: "Counting to 120",
    standardIds: ["1.NBT.A.1"],
    summary: "Read, write, and count numbers all the way to 120, starting from anywhere.",
    emoji: "1️⃣",
    source: "ccss-math-textbook"
  }),
  "tens-and-ones": withNarration({
    slug: "tens-and-ones",
    grade: "P1",
    ccssGrade: "1",
    title: "Tens and Ones",
    standardIds: ["1.NBT.B.2","1.NBT.C.5"],
    summary: "Build two-digit numbers from ten-rods and ones, and find 10 more or 10 less in your head.",
    emoji: "🏗️",
    source: "ccss-math-textbook"
  }),
  "compare-two-digit": withNarration({
    slug: "compare-two-digit",
    grade: "P1",
    ccssGrade: "1",
    title: "Comparing Two-Digit Numbers",
    standardIds: ["1.NBT.B.3"],
    summary: "Compare numbers by looking at the tens first, then the ones, with >, =, and <.",
    emoji: "🔼",
    source: "ccss-math-textbook"
  }),
  "add-within-100": withNarration({
    slug: "add-within-100",
    grade: "P1",
    ccssGrade: "1",
    title: "Adding Within 100",
    standardIds: ["1.NBT.C.4","1.NBT.C.6"],
    summary: "Add ones and tens with place-value blocks — and bundle ten ones into a brand-new ten.",
    emoji: "➕",
    source: "ccss-math-textbook"
  }),
  "order-and-measure": withNarration({
    slug: "order-and-measure",
    grade: "P1",
    ccssGrade: "1",
    title: "Order & Measure Length",
    standardIds: ["1.MD.A.1","1.MD.A.2"],
    summary: "Measure with same-size units and put three objects in order from shortest to longest.",
    emoji: "📏",
    source: "ccss-math-textbook"
  }),
  "telling-time": withNarration({
    slug: "telling-time",
    grade: "P1",
    ccssGrade: "1",
    title: "Telling Time to the Half-Hour",
    standardIds: ["1.MD.B.3"],
    summary: "Read an analog clock at o'clock and half past, and write the time.",
    emoji: "🕐",
    source: "ccss-math-textbook"
  }),
  "picture-graph": withNarration({
    slug: "picture-graph",
    grade: "P1",
    ccssGrade: "1",
    title: "Picture Graphs",
    standardIds: ["1.MD.C.4"],
    summary: "Read a graph of three categories to find totals and how many more or fewer.",
    emoji: "📊",
    source: "ccss-math-textbook"
  }),
  "shape-attributes": withNarration({
    slug: "shape-attributes",
    grade: "P1",
    ccssGrade: "1",
    title: "What Makes a Shape",
    standardIds: ["1.G.A.1"],
    summary: "Discover the attributes that define a shape — and the ones (color, size, direction) that don't.",
    emoji: "🔺",
    source: "ccss-math-textbook"
  }),
  "compose-2d": withNarration({
    slug: "compose-2d",
    grade: "P1",
    ccssGrade: "1",
    title: "Composing New Shapes",
    standardIds: ["1.G.A.2"],
    summary: "Join shapes to build composite figures — a square and a triangle make a house.",
    emoji: "🏠",
    source: "ccss-math-textbook"
  }),
  "partition-shapes": withNarration({
    slug: "partition-shapes",
    grade: "P1",
    ccssGrade: "1",
    title: "Halves and Fourths",
    standardIds: ["1.G.A.3"],
    summary: "Cut circles and rectangles into equal shares and name them halves and fourths.",
    emoji: "🍕",
    source: "ccss-math-textbook"
  }),
  "word-problems-100": withNarration({
    slug: "word-problems-100",
    grade: "P2",
    ccssGrade: "2",
    title: "Word Problems Within 100",
    standardIds: ["2.OA.A.1"],
    summary: "Solve one- and two-step add and subtract stories using a tape diagram.",
    emoji: "📝",
    source: "ccss-math-textbook"
  }),
  "fluent-within-20": withNarration({
    slug: "fluent-within-20",
    grade: "P2",
    ccssGrade: "2",
    title: "Mental Math Within 20",
    standardIds: ["2.OA.B.2"],
    summary: "Add fast with doubles, near-doubles, and make-a-ten strategies.",
    emoji: "⚡",
    source: "ccss-math-textbook"
  }),
  "odd-even": withNarration({
    slug: "odd-even",
    grade: "P2",
    ccssGrade: "2",
    title: "Odd and Even Numbers",
    standardIds: ["2.OA.C.3"],
    summary: "Pair up objects to tell whether a number is odd or even.",
    emoji: "👥",
    source: "ccss-math-textbook"
  }),
  "arrays-repeated-addition": withNarration({
    slug: "arrays-repeated-addition",
    grade: "P2",
    ccssGrade: "2",
    title: "Arrays & Repeated Addition",
    standardIds: ["2.OA.C.4"],
    summary: "Add equal rows to find the total in a rectangular array — the start of multiplication.",
    emoji: "✖️",
    source: "ccss-math-textbook"
  }),
  "place-value-blocks": withNarration({
    slug: "place-value-blocks",
    grade: "P2",
    ccssGrade: "2",
    title: "Building Numbers with Base-Ten Blocks",
    standardIds: ["2.NBT.A.1","2.NBT.A.3"],
    summary: "Snap together hundreds, tens, and ones to build any number up to 999 and see place value come alive.",
    emoji: "🧱",
    source: "ccss-math-textbook"
  }),
  "skip-counting": withNarration({
    slug: "skip-counting",
    grade: "P2",
    ccssGrade: "2",
    title: "Skip-Counting to 1000",
    standardIds: ["2.NBT.A.2"],
    summary: "Count by 5s, 10s, and 100s and watch the place-value pattern grow.",
    emoji: "⏭️",
    source: "ccss-math-textbook"
  }),
  "compare-three-digit": withNarration({
    slug: "compare-three-digit",
    grade: "P2",
    ccssGrade: "2",
    title: "Comparing Three-Digit Numbers",
    standardIds: ["2.NBT.A.4"],
    summary: "Compare hundreds first, then tens, then ones, with >, =, and <.",
    emoji: "🥇",
    source: "ccss-math-textbook"
  }),
  "add-subtract-regroup": withNarration({
    slug: "add-subtract-regroup",
    grade: "P2",
    ccssGrade: "2",
    title: "Regrouping: Carry & Borrow",
    standardIds: ["2.NBT.B.5"],
    summary: "Add and subtract within 100 by carrying and borrowing tens.",
    emoji: "🔄",
    source: "ccss-math-textbook"
  }),
  "add-four-numbers": withNarration({
    slug: "add-four-numbers",
    grade: "P2",
    ccssGrade: "2",
    title: "Adding Four Numbers",
    standardIds: ["2.NBT.B.6"],
    summary: "Stack up to four two-digit numbers and add them by place value.",
    emoji: "4️⃣",
    source: "ccss-math-textbook"
  }),
  "add-subtract-1000": withNarration({
    slug: "add-subtract-1000",
    grade: "P2",
    ccssGrade: "2",
    title: "Add & Subtract to 1000",
    standardIds: ["2.NBT.B.7","2.NBT.B.9"],
    summary: "Use hundreds, tens, and ones to add and subtract big numbers — and see why regrouping works.",
    emoji: "🔁",
    source: "ccss-math-textbook"
  }),
  "mental-10-100": withNarration({
    slug: "mental-10-100",
    grade: "P2",
    ccssGrade: "2",
    title: "Ten More, Hundred More",
    standardIds: ["2.NBT.B.8"],
    summary: "Add or subtract 10 or 100 in your head — only one digit changes.",
    emoji: "🧠",
    source: "ccss-math-textbook"
  }),
  "measure-with-ruler": withNarration({
    slug: "measure-with-ruler",
    grade: "P2",
    ccssGrade: "2",
    title: "Measuring with a Ruler",
    standardIds: ["2.MD.A.1","2.MD.A.2"],
    summary: "Measure length from zero, and see the same object counted in two different units.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "estimate-compare-length": withNarration({
    slug: "estimate-compare-length",
    grade: "P2",
    ccssGrade: "2",
    title: "Estimate & Compare Length",
    standardIds: ["2.MD.A.3","2.MD.A.4"],
    summary: "Estimate a length, then measure and find how much longer one object is.",
    emoji: "🤔",
    source: "ccss-math-textbook"
  }),
  "length-number-line": withNarration({
    slug: "length-number-line",
    grade: "P2",
    ccssGrade: "2",
    title: "Length on a Number Line",
    standardIds: ["2.MD.B.5","2.MD.B.6"],
    summary: "Solve length problems by jumping forward and back on a number line.",
    emoji: "🧵",
    source: "ccss-math-textbook"
  }),
  "time-five-minutes": withNarration({
    slug: "time-five-minutes",
    grade: "P2",
    ccssGrade: "2",
    title: "Time to Five Minutes",
    standardIds: ["2.MD.C.7"],
    summary: "Read an analog clock to the nearest five minutes, with a.m. and p.m.",
    emoji: "🕔",
    source: "ccss-math-textbook"
  }),
  "money": withNarration({
    slug: "money",
    grade: "P2",
    ccssGrade: "2",
    title: "Dollars and Cents",
    standardIds: ["2.MD.C.8"],
    summary: "Count coins and bills and write amounts with the $ and ¢ symbols.",
    emoji: "💰",
    source: "ccss-math-textbook"
  }),
  "line-plot": withNarration({
    slug: "line-plot",
    grade: "P2",
    ccssGrade: "2",
    title: "Line Plots",
    standardIds: ["2.MD.D.9"],
    summary: "Show measurement data as stacks of X's above a number line.",
    emoji: "❎",
    source: "ccss-math-textbook"
  }),
  "bar-graph": withNarration({
    slug: "bar-graph",
    grade: "P2",
    ccssGrade: "2",
    title: "Bar Graphs",
    standardIds: ["2.MD.D.10"],
    summary: "Read a scaled bar graph to find totals and compare categories.",
    emoji: "📊",
    source: "ccss-math-textbook"
  }),
  "shapes-by-attributes": withNarration({
    slug: "shapes-by-attributes",
    grade: "P2",
    ccssGrade: "2",
    title: "Naming Shapes by Attributes",
    standardIds: ["2.G.A.1"],
    summary: "Name shapes by their number of sides and angles (and faces for solids).",
    emoji: "🔷",
    source: "ccss-math-textbook"
  }),
  "rows-and-columns": withNarration({
    slug: "rows-and-columns",
    grade: "P2",
    ccssGrade: "2",
    title: "Rows and Columns of Squares",
    standardIds: ["2.G.A.2"],
    summary: "Fill a rectangle with equal squares and count them — the start of area.",
    emoji: "🔳",
    source: "ccss-math-textbook"
  }),
  "equal-shares": withNarration({
    slug: "equal-shares",
    grade: "P2",
    ccssGrade: "2",
    title: "Halves, Thirds, and Fourths",
    standardIds: ["2.G.A.3"],
    summary: "Split shapes into equal shares — the same size, even when they look different.",
    emoji: "🥧",
    source: "ccss-math-textbook"
  }),
  "division-meaning": withNarration({
    slug: "division-meaning",
    grade: "P3",
    ccssGrade: "3",
    title: "What Division Means",
    standardIds: ["3.OA.A.2","3.OA.B.6"],
    summary: "Share objects into equal groups — and see why division is a multiplication fact in disguise.",
    emoji: "➗",
    source: "ccss-math-textbook"
  }),
  "multiply-divide-words": withNarration({
    slug: "multiply-divide-words",
    grade: "P3",
    ccssGrade: "3",
    title: "Multiply & Divide Word Problems",
    standardIds: ["3.OA.A.3","3.OA.A.4"],
    summary: "One story, three questions — find the total, the group size, or the number of groups.",
    emoji: "🧺",
    source: "ccss-math-textbook"
  }),
  "multiplication-properties": withNarration({
    slug: "multiplication-properties",
    grade: "P3",
    ccssGrade: "3",
    title: "Properties of Multiplication",
    standardIds: ["3.OA.B.5"],
    summary: "Swap the factors or break one apart — the commutative and distributive properties, shown with arrays.",
    emoji: "🔀",
    source: "ccss-math-textbook"
  }),
  "multiplication-fluency": withNarration({
    slug: "multiplication-fluency",
    grade: "P3",
    ccssGrade: "3",
    title: "The Multiplication Table",
    standardIds: ["3.OA.C.7"],
    summary: "Explore every fact from 1×1 to 10×10 and its matching division fact family.",
    emoji: "✳️",
    source: "ccss-math-textbook"
  }),
  "two-step-problems": withNarration({
    slug: "two-step-problems",
    grade: "P3",
    ccssGrade: "3",
    title: "Two-Step Problems",
    standardIds: ["3.OA.D.8"],
    summary: "Solve problems in two steps, doing multiplication before subtraction — the order of operations.",
    emoji: "🪜",
    source: "ccss-math-textbook"
  }),
  "arithmetic-patterns": withNarration({
    slug: "arithmetic-patterns",
    grade: "P3",
    ccssGrade: "3",
    title: "Number Patterns",
    standardIds: ["3.OA.D.9"],
    summary: "Light up the multiples on a hundred chart and discover the patterns — and why they happen.",
    emoji: "🔦",
    source: "ccss-math-textbook"
  }),
  "rounding": withNarration({
    slug: "rounding",
    grade: "P3",
    ccssGrade: "3",
    title: "Rounding to 10 and 100",
    standardIds: ["3.NBT.A.1"],
    summary: "Find which multiple a number is closest to on the number line, and round up at the halfway mark.",
    emoji: "🎯",
    source: "ccss-math-textbook"
  }),
  "add-subtract-algorithm": withNarration({
    slug: "add-subtract-algorithm",
    grade: "P3",
    ccssGrade: "3",
    title: "The Standard Algorithm",
    standardIds: ["3.NBT.A.2"],
    summary: "Add and subtract within 1000 column by column, carrying and borrowing across places.",
    emoji: "🧮",
    source: "ccss-math-textbook"
  }),
  "multiply-by-tens": withNarration({
    slug: "multiply-by-tens",
    grade: "P3",
    ccssGrade: "3",
    title: "Multiplying by Multiples of 10",
    standardIds: ["3.NBT.A.3"],
    summary: "Do the easy fact first, then make it ten times bigger — that's why the zero appears.",
    emoji: "🔟",
    source: "ccss-math-textbook"
  }),
  "compare-fractions": withNarration({
    slug: "compare-fractions",
    grade: "P3",
    ccssGrade: "3",
    title: "Comparing Fractions",
    standardIds: ["3.NF.A.3"],
    summary: "Line up fraction bars to spot equivalent fractions and decide which is greater.",
    emoji: "⚖️",
    source: "ccss-math-textbook"
  }),
  "time-to-minute": withNarration({
    slug: "time-to-minute",
    grade: "P3",
    ccssGrade: "3",
    title: "Time to the Minute",
    standardIds: ["3.MD.A.1"],
    summary: "Read a clock to the exact minute and find elapsed time by adding minutes.",
    emoji: "⏰",
    source: "ccss-math-textbook"
  }),
  "volume-mass": withNarration({
    slug: "volume-mass",
    grade: "P3",
    ccssGrade: "3",
    title: "Liquid Volume & Mass",
    standardIds: ["3.MD.A.2"],
    summary: "Measure liquid in liters and milliliters, and mass in grams and kilograms.",
    emoji: "⚗️",
    source: "ccss-math-textbook"
  }),
  "scaled-graphs": withNarration({
    slug: "scaled-graphs",
    grade: "P3",
    ccssGrade: "3",
    title: "Scaled Picture & Bar Graphs",
    standardIds: ["3.MD.B.3"],
    summary: "When one symbol stands for many, multiply by the scale to read the graph.",
    emoji: "📈",
    source: "ccss-math-textbook"
  }),
  "measure-line-plot": withNarration({
    slug: "measure-line-plot",
    grade: "P3",
    ccssGrade: "3",
    title: "Halves, Quarters & Line Plots",
    standardIds: ["3.MD.B.4"],
    summary: "Measure to the nearest half and quarter inch and plot the fraction lengths.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "area-count": withNarration({
    slug: "area-count",
    grade: "P3",
    ccssGrade: "3",
    title: "Area by Counting Squares",
    standardIds: ["3.MD.C.5","3.MD.C.6"],
    summary: "Cover a shape with unit squares and count them to measure its area.",
    emoji: "🟩",
    source: "ccss-math-textbook"
  }),
  "perimeter": withNarration({
    slug: "perimeter",
    grade: "P3",
    ccssGrade: "3",
    title: "Perimeter of Polygons",
    standardIds: ["3.MD.D.8"],
    summary: "Add up all the sides to find the distance around — and see how it differs from area.",
    emoji: "🔲",
    source: "ccss-math-textbook"
  }),
  "quadrilaterals": withNarration({
    slug: "quadrilaterals",
    grade: "P3",
    ccssGrade: "3",
    title: "Quadrilaterals & Categories",
    standardIds: ["3.G.A.1"],
    summary: "Sort shapes by shared attributes — every rectangle, rhombus, and square is a quadrilateral.",
    emoji: "🔷",
    source: "ccss-math-textbook"
  }),
  "partition-equal-areas": withNarration({
    slug: "partition-equal-areas",
    grade: "P3",
    ccssGrade: "3",
    title: "Equal Areas as Fractions",
    standardIds: ["3.G.A.2"],
    summary: "Split a shape into equal-area parts and name each part as a unit fraction of the whole.",
    emoji: "🍰",
    source: "ccss-math-textbook"
  }),
  "fractions-number-line": withNarration({
    slug: "fractions-number-line",
    grade: "P3",
    ccssGrade: "3",
    title: "Fractions on a Number Line",
    standardIds: ["3.NF.A.1","3.NF.A.2"],
    summary: "Split the line from 0 to 1 into equal parts and place a fraction. A fraction is a number with a home on the line.",
    emoji: "📏",
    source: "ccss-math-textbook"
  }),
  "area-model": withNarration({
    slug: "area-model",
    grade: "P3",
    ccssGrade: "3",
    title: "Area as Rows and Columns",
    standardIds: ["3.MD.C.7","3.OA.A.1"],
    summary: "Cover a rectangle with unit squares to see why area = rows × columns — and split it to reveal the distributive property.",
    emoji: "▦",
    source: "ccss-math-textbook"
  }),
  "multiplicative-comparison": withNarration({
    slug: "multiplicative-comparison",
    grade: "P4",
    ccssGrade: "4",
    title: "Times as Many",
    standardIds: ["4.OA.A.1","4.OA.A.2"],
    summary: "Read multiplication as a comparison — one bar is several times as long as another.",
    emoji: "📊",
    source: "ccss-math-textbook"
  }),
  "multistep-problems": withNarration({
    slug: "multistep-problems",
    grade: "P4",
    ccssGrade: "4",
    title: "Multistep Problems & Remainders",
    standardIds: ["4.OA.A.3"],
    summary: "Solve problems in several steps and decide what to do with the remainder.",
    emoji: "🚐",
    source: "ccss-math-textbook"
  }),
  "factors-multiples": withNarration({
    slug: "factors-multiples",
    grade: "P4",
    ccssGrade: "4",
    title: "Factors, Multiples & Primes",
    standardIds: ["4.OA.B.4"],
    summary: "Build every rectangle a number allows to find its factors — and tell prime from composite.",
    emoji: "🧩",
    source: "ccss-math-textbook"
  }),
  "growing-patterns": withNarration({
    slug: "growing-patterns",
    grade: "P4",
    ccssGrade: "4",
    title: "Patterns from a Rule",
    standardIds: ["4.OA.C.5"],
    summary: "Generate a sequence from a rule, then spot the hidden features it creates.",
    emoji: "📶",
    source: "ccss-math-textbook"
  }),
  "place-value-relationship": withNarration({
    slug: "place-value-relationship",
    grade: "P4",
    ccssGrade: "4",
    title: "Ten Times the Place",
    standardIds: ["4.NBT.A.1"],
    summary: "See why the same digit is worth ten times more each place you move it left.",
    emoji: "🔟",
    source: "ccss-math-textbook"
  }),
  "read-compare-multidigit": withNarration({
    slug: "read-compare-multidigit",
    grade: "P4",
    ccssGrade: "4",
    title: "Reading Big Numbers",
    standardIds: ["4.NBT.A.2"],
    summary: "Write multi-digit numbers in expanded form and compare them place by place.",
    emoji: "🔢",
    source: "ccss-math-textbook"
  }),
  "rounding-multidigit": withNarration({
    slug: "rounding-multidigit",
    grade: "P4",
    ccssGrade: "4",
    title: "Rounding to Any Place",
    standardIds: ["4.NBT.A.3"],
    summary: "Round multi-digit numbers to tens, hundreds, or thousands on the number line.",
    emoji: "🎯",
    source: "ccss-math-textbook"
  }),
  "add-subtract-bignum": withNarration({
    slug: "add-subtract-bignum",
    grade: "P4",
    ccssGrade: "4",
    title: "Add & Subtract Big Numbers",
    standardIds: ["4.NBT.B.4"],
    summary: "Use the standard algorithm on multi-digit numbers, and estimate to check the answer.",
    emoji: "🧮",
    source: "ccss-math-textbook"
  }),
  "multiply-multidigit": withNarration({
    slug: "multiply-multidigit",
    grade: "P4",
    ccssGrade: "4",
    title: "Multi-Digit Multiplication",
    standardIds: ["4.NBT.B.5"],
    summary: "Break both factors into tens and ones — the area model and partial products.",
    emoji: "▦",
    source: "ccss-math-textbook"
  }),
  "long-division": withNarration({
    slug: "long-division",
    grade: "P4",
    ccssGrade: "4",
    title: "Long Division",
    standardIds: ["4.NBT.B.6"],
    summary: "Divide place by place — the tens first, then the ones — and read off the remainder.",
    emoji: "➗",
    source: "ccss-math-textbook"
  }),
  "compare-fractions-4": withNarration({
    slug: "compare-fractions-4",
    grade: "P4",
    ccssGrade: "4",
    title: "Comparing Unlike Fractions",
    standardIds: ["4.NF.A.2"],
    summary: "Rewrite fractions with a common denominator so different-looking fractions can be compared.",
    emoji: "⚖️",
    source: "ccss-math-textbook"
  }),
  "add-subtract-fractions": withNarration({
    slug: "add-subtract-fractions",
    grade: "P4",
    ccssGrade: "4",
    title: "Adding & Subtracting Fractions",
    standardIds: ["4.NF.B.3"],
    summary: "Join and separate same-size pieces, and rename the result as a mixed number.",
    emoji: "➕",
    source: "ccss-math-textbook"
  }),
  "multiply-fraction-whole": withNarration({
    slug: "multiply-fraction-whole",
    grade: "P4",
    ccssGrade: "4",
    title: "Fraction × Whole Number",
    standardIds: ["4.NF.B.4"],
    summary: "Multiply a fraction by a whole number as repeated addition of unit fractions.",
    emoji: "✖️",
    source: "ccss-math-textbook"
  }),
  "fractions-10-100": withNarration({
    slug: "fractions-10-100",
    grade: "P4",
    ccssGrade: "4",
    title: "Tenths and Hundredths",
    standardIds: ["4.NF.C.5"],
    summary: "Rename tenths as hundredths so you can add fractions with denominators 10 and 100.",
    emoji: "💯",
    source: "ccss-math-textbook"
  }),
  "decimals-fractions": withNarration({
    slug: "decimals-fractions",
    grade: "P4",
    ccssGrade: "4",
    title: "Decimals Meet Fractions",
    standardIds: ["4.NF.C.6"],
    summary: "Write fractions of 10 or 100 as decimals — the tenths and hundredths places.",
    emoji: "🔴",
    source: "ccss-math-textbook"
  }),
  "compare-decimals": withNarration({
    slug: "compare-decimals",
    grade: "P4",
    ccssGrade: "4",
    title: "Comparing Decimals",
    standardIds: ["4.NF.C.7"],
    summary: "Compare decimals place by place — why 0.4 is greater than 0.37.",
    emoji: "⬇️",
    source: "ccss-math-textbook"
  }),
  "measurement-conversion": withNarration({
    slug: "measurement-conversion",
    grade: "P4",
    ccssGrade: "4",
    title: "Converting Units",
    standardIds: ["4.MD.A.1","4.MD.A.2"],
    summary: "Convert hours to minutes, feet to inches, and kilometers to meters by multiplying.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "area-perimeter-formulas": withNarration({
    slug: "area-perimeter-formulas",
    grade: "P4",
    ccssGrade: "4",
    title: "Area & Perimeter Formulas",
    standardIds: ["4.MD.A.3"],
    summary: "Apply A = l × w and P = 2(l + w) — and work backwards to find a missing side.",
    emoji: "🟩",
    source: "ccss-math-textbook"
  }),
  "line-plot-fractions": withNarration({
    slug: "line-plot-fractions",
    grade: "P4",
    ccssGrade: "4",
    title: "Fraction Line Plots",
    standardIds: ["4.MD.B.4"],
    summary: "Plot measurements in eighths, then subtract fractions to compare the data.",
    emoji: "📏",
    source: "ccss-math-textbook"
  }),
  "angles-fraction-circle": withNarration({
    slug: "angles-fraction-circle",
    grade: "P4",
    ccssGrade: "4",
    title: "Angles & the 360° Circle",
    standardIds: ["4.MD.C.5"],
    summary: "See an angle as a fraction of a full turn — a quarter turn is 90°.",
    emoji: "🥧",
    source: "ccss-math-textbook"
  }),
  "protractor": withNarration({
    slug: "protractor",
    grade: "P4",
    ccssGrade: "4",
    title: "Using a Protractor",
    standardIds: ["4.MD.C.6"],
    summary: "Measure and name angles in degrees — acute, right, and obtuse.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "add-angles": withNarration({
    slug: "add-angles",
    grade: "P4",
    ccssGrade: "4",
    title: "Adding Angles",
    standardIds: ["4.MD.C.7"],
    summary: "Adjacent angles add up — so subtract to find a missing angle.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "lines-angles": withNarration({
    slug: "lines-angles",
    grade: "P4",
    ccssGrade: "4",
    title: "Points, Lines & Rays",
    standardIds: ["4.G.A.1"],
    summary: "Meet the building blocks of geometry, including parallel and perpendicular lines.",
    emoji: "📈",
    source: "ccss-math-textbook"
  }),
  "classify-triangles": withNarration({
    slug: "classify-triangles",
    grade: "P4",
    ccssGrade: "4",
    title: "Classifying Triangles",
    standardIds: ["4.G.A.2"],
    summary: "Sort triangles by their angles — right, acute, and obtuse.",
    emoji: "🔺",
    source: "ccss-math-textbook"
  }),
  "symmetry": withNarration({
    slug: "symmetry",
    grade: "P4",
    ccssGrade: "4",
    title: "Lines of Symmetry",
    standardIds: ["4.G.A.3"],
    summary: "Find the folds that split a shape into two matching mirror-image halves.",
    emoji: "🦋",
    source: "ccss-math-textbook"
  }),
  "equivalent-fractions": withNarration({
    slug: "equivalent-fractions",
    grade: "P4",
    ccssGrade: "4",
    title: "Equivalent Fractions",
    standardIds: ["4.NF.A.1"],
    summary: "See why 1/2, 2/4, and 3/6 name the same amount — the same shaded strip, cut into more pieces.",
    emoji: "🟰",
    source: "ccss-math-textbook"
  }),
  "order-of-operations": withNarration({
    slug: "order-of-operations",
    grade: "P5",
    ccssGrade: "5",
    title: "Order of Operations",
    standardIds: ["5.OA.A.1"],
    summary: "Parentheses first, then × and ÷, then + and − — grouping changes the answer.",
    emoji: "🔣",
    source: "ccss-math-textbook"
  }),
  "write-expressions": withNarration({
    slug: "write-expressions",
    grade: "P5",
    ccssGrade: "5",
    title: "Writing Expressions",
    standardIds: ["5.OA.A.2"],
    summary: "Turn words into math expressions with parentheses — without solving them.",
    emoji: "✍️",
    source: "ccss-math-textbook"
  }),
  "two-patterns-graph": withNarration({
    slug: "two-patterns-graph",
    grade: "P5",
    ccssGrade: "5",
    title: "Two Patterns, One Graph",
    standardIds: ["5.OA.B.3"],
    summary: "Generate two patterns, pair the terms into ordered pairs, and graph them.",
    emoji: "📉",
    source: "ccss-math-textbook"
  }),
  "decimal-place-value": withNarration({
    slug: "decimal-place-value",
    grade: "P5",
    ccssGrade: "5",
    title: "Decimal Place Value",
    standardIds: ["5.NBT.A.1"],
    summary: "Each place is 10× the one on its right and 1/10 the one on its left — past the decimal point.",
    emoji: "🔢",
    source: "ccss-math-textbook"
  }),
  "powers-of-ten": withNarration({
    slug: "powers-of-ten",
    grade: "P5",
    ccssGrade: "5",
    title: "Powers of Ten",
    standardIds: ["5.NBT.A.2"],
    summary: "Multiply or divide by 10, 100, 1000 and watch the decimal point slide.",
    emoji: "🔟",
    source: "ccss-math-textbook"
  }),
  "read-compare-decimals-thousandths": withNarration({
    slug: "read-compare-decimals-thousandths",
    grade: "P5",
    ccssGrade: "5",
    title: "Decimals to Thousandths",
    standardIds: ["5.NBT.A.3"],
    summary: "Read, write, and compare decimals to the thousandths place, using expanded form.",
    emoji: "🔬",
    source: "ccss-math-textbook"
  }),
  "round-decimals": withNarration({
    slug: "round-decimals",
    grade: "P5",
    ccssGrade: "5",
    title: "Rounding Decimals",
    standardIds: ["5.NBT.A.4"],
    summary: "Round a decimal to the nearest whole, tenth, or hundredth on the number line.",
    emoji: "🎯",
    source: "ccss-math-textbook"
  }),
  "multiply-whole-numbers": withNarration({
    slug: "multiply-whole-numbers",
    grade: "P5",
    ccssGrade: "5",
    title: "The Multiplication Algorithm",
    standardIds: ["5.NBT.B.5"],
    summary: "Multiply multi-digit numbers with stacked partial products.",
    emoji: "✖️",
    source: "ccss-math-textbook"
  }),
  "divide-two-digit": withNarration({
    slug: "divide-two-digit",
    grade: "P5",
    ccssGrade: "5",
    title: "Dividing by Two Digits",
    standardIds: ["5.NBT.B.6"],
    summary: "Estimate with a friendly ten, then find the exact quotient and remainder.",
    emoji: "➗",
    source: "ccss-math-textbook"
  }),
  "decimal-operations": withNarration({
    slug: "decimal-operations",
    grade: "P5",
    ccssGrade: "5",
    title: "Decimal Arithmetic",
    standardIds: ["5.NBT.B.7"],
    summary: "Add, subtract, and multiply decimals by keeping track of the decimal point.",
    emoji: "🧮",
    source: "ccss-math-textbook"
  }),
  "add-fractions-unlike": withNarration({
    slug: "add-fractions-unlike",
    grade: "P5",
    ccssGrade: "5",
    title: "Adding Unlike Fractions",
    standardIds: ["5.NF.A.1","5.NF.A.2"],
    summary: "Find a common denominator, then add or subtract the numerators.",
    emoji: "➕",
    source: "ccss-math-textbook"
  }),
  "fraction-as-division": withNarration({
    slug: "fraction-as-division",
    grade: "P5",
    ccssGrade: "5",
    title: "A Fraction Is Division",
    standardIds: ["5.NF.B.3"],
    summary: "See why a/b means a ÷ b by sharing wholes equally among people.",
    emoji: "🍪",
    source: "ccss-math-textbook"
  }),
  "multiply-mixed-numbers": withNarration({
    slug: "multiply-mixed-numbers",
    grade: "P5",
    ccssGrade: "5",
    title: "Multiplying Mixed Numbers",
    standardIds: ["5.NF.B.6"],
    summary: "Convert mixed numbers to improper fractions to scale a recipe up.",
    emoji: "🥣",
    source: "ccss-math-textbook"
  }),
  "divide-unit-fractions": withNarration({
    slug: "divide-unit-fractions",
    grade: "P5",
    ccssGrade: "5",
    title: "Dividing with Unit Fractions",
    standardIds: ["5.NF.B.7"],
    summary: "How many halves fit in 4? What is a third of 1/2? Divide with unit fractions.",
    emoji: "🔪",
    source: "ccss-math-textbook"
  }),
  "metric-conversion": withNarration({
    slug: "metric-conversion",
    grade: "P5",
    ccssGrade: "5",
    title: "Metric Conversions",
    standardIds: ["5.MD.A.1"],
    summary: "Convert km, m, cm, and mm by multiplying or dividing by powers of 10.",
    emoji: "📏",
    source: "ccss-math-textbook"
  }),
  "line-plot-operations": withNarration({
    slug: "line-plot-operations",
    grade: "P5",
    ccssGrade: "5",
    title: "Computing from Line Plots",
    standardIds: ["5.MD.B.2"],
    summary: "Add the fraction data and redistribute it equally using fraction operations.",
    emoji: "📊",
    source: "ccss-math-textbook"
  }),
  "shape-hierarchy": withNarration({
    slug: "shape-hierarchy",
    grade: "P5",
    ccssGrade: "5",
    title: "The Shape Hierarchy",
    standardIds: ["5.G.B.3","5.G.B.4"],
    summary: "Every square is a rectangle — how 2-D shapes nest into a hierarchy of categories.",
    emoji: "🔷",
    source: "ccss-math-textbook"
  }),
  "volume-unit-cubes": withNarration({
    slug: "volume-unit-cubes",
    grade: "P5",
    ccssGrade: "5",
    title: "Volume with Unit Cubes",
    standardIds: ["5.MD.C.3","5.MD.C.4","5.MD.C.5"],
    summary: "Fill a box with unit cubes and discover why Volume = length × width × height.",
    emoji: "📦",
    source: "ccss-math-textbook"
  }),
  "coordinate-plane": withNarration({
    slug: "coordinate-plane",
    grade: "P5",
    ccssGrade: "5",
    title: "Plotting Points on the Coordinate Plane",
    standardIds: ["5.G.A.1","5.G.A.2"],
    summary: "Give every point an address (x, y): right first, then up. Discover why the order of the two numbers matters.",
    emoji: "📍",
    source: "ccss-math-textbook"
  }),
  "multiply-fractions": withNarration({
    slug: "multiply-fractions",
    grade: "P5",
    ccssGrade: "5",
    title: "Multiplying Fractions with an Area Model",
    standardIds: ["5.NF.B.4","5.NF.B.5"],
    summary: "Shade a fraction across a square and another down it — the overlap shows why a/b × c/d = ac/bd.",
    emoji: "🔲",
    source: "ccss-math-textbook"
  }),
  "ratio-double-number-line": withNarration({
    slug: "ratio-double-number-line",
    grade: "P6",
    ccssGrade: "6",
    title: "Ratios & the Double Number Line",
    standardIds: ["6.RP.A.1","6.RP.A.3"],
    summary: "Scale a recipe up and down on a double number line and see equivalent ratios stay in step.",
    emoji: "⚖️",
    source: "ccss-math-textbook"
  }),
  "unit-rate": withNarration({
    slug: "unit-rate",
    grade: "P6",
    ccssGrade: "6",
    title: "Unit Rate",
    standardIds: ["6.RP.A.2"],
    summary: "Divide a ratio down to “per one” to find the unit rate.",
    emoji: "🏷️",
    source: "ccss-math-textbook"
  }),
  "percents": withNarration({
    slug: "percents",
    grade: "P6",
    ccssGrade: "6",
    title: "Percents",
    standardIds: ["6.RP.A.3"],
    summary: "A percent is a rate per 100 — find a percent of a number.",
    emoji: "💯",
    source: "ccss-math-textbook"
  }),
  "divide-fractions": withNarration({
    slug: "divide-fractions",
    grade: "P6",
    ccssGrade: "6",
    title: "Dividing Fractions",
    standardIds: ["6.NS.A.1"],
    summary: "How many fit? Keep, change, flip — multiply by the reciprocal.",
    emoji: "➗",
    source: "ccss-math-textbook"
  }),
  "divide-multidigit": withNarration({
    slug: "divide-multidigit",
    grade: "P6",
    ccssGrade: "6",
    title: "Multi-Digit Division",
    standardIds: ["6.NS.B.2"],
    summary: "Subtract big friendly chunks of the divisor with partial quotients.",
    emoji: "🧮",
    source: "ccss-math-textbook"
  }),
  "decimal-arithmetic": withNarration({
    slug: "decimal-arithmetic",
    grade: "P6",
    ccssGrade: "6",
    title: "Decimal Operations",
    standardIds: ["6.NS.B.3"],
    summary: "Add, subtract, multiply, and divide decimals — even with a decimal divisor.",
    emoji: "🔢",
    source: "ccss-math-textbook"
  }),
  "gcf-lcm": withNarration({
    slug: "gcf-lcm",
    grade: "P6",
    ccssGrade: "6",
    title: "GCF, LCM & Factoring",
    standardIds: ["6.NS.B.4"],
    summary: "Find the greatest common factor and least common multiple, and factor a sum.",
    emoji: "🔗",
    source: "ccss-math-textbook"
  }),
  "negative-numbers": withNarration({
    slug: "negative-numbers",
    grade: "P6",
    ccssGrade: "6",
    title: "Positive & Negative Numbers",
    standardIds: ["6.NS.C.5"],
    summary: "Use signed numbers for opposite quantities like temperature and elevation.",
    emoji: "🌡️",
    source: "ccss-math-textbook"
  }),
  "absolute-value": withNarration({
    slug: "absolute-value",
    grade: "P6",
    ccssGrade: "6",
    title: "Ordering & Absolute Value",
    standardIds: ["6.NS.C.7"],
    summary: "Order rational numbers, and find their distance from zero.",
    emoji: "📏",
    source: "ccss-math-textbook"
  }),
  "exponents": withNarration({
    slug: "exponents",
    grade: "P6",
    ccssGrade: "6",
    title: "Exponents",
    standardIds: ["6.EE.A.1"],
    summary: "A shortcut for repeated multiplication — base and exponent.",
    emoji: "⏫",
    source: "ccss-math-textbook"
  }),
  "variables-expressions": withNarration({
    slug: "variables-expressions",
    grade: "P6",
    ccssGrade: "6",
    title: "Variables & Expressions",
    standardIds: ["6.EE.A.2","6.EE.B.6"],
    summary: "Write and evaluate expressions with a variable that can change.",
    emoji: "🔤",
    source: "ccss-math-textbook"
  }),
  "equivalent-expressions": withNarration({
    slug: "equivalent-expressions",
    grade: "P6",
    ccssGrade: "6",
    title: "Equivalent Expressions",
    standardIds: ["6.EE.A.3","6.EE.A.4"],
    summary: "Use the distributive property and like terms to rewrite expressions.",
    emoji: "🟰",
    source: "ccss-math-textbook"
  }),
  "solve-one-step-equations": withNarration({
    slug: "solve-one-step-equations",
    grade: "P6",
    ccssGrade: "6",
    title: "One-Step Equations",
    standardIds: ["6.EE.B.5","6.EE.B.7"],
    summary: "Find the value that makes an equation true using inverse operations.",
    emoji: "🔍",
    source: "ccss-math-textbook"
  }),
  "inequalities": withNarration({
    slug: "inequalities",
    grade: "P6",
    ccssGrade: "6",
    title: "Inequalities",
    standardIds: ["6.EE.B.8"],
    summary: "Write and graph x > c and x < c on a number line.",
    emoji: "↔️",
    source: "ccss-math-textbook"
  }),
  "dependent-independent": withNarration({
    slug: "dependent-independent",
    grade: "P6",
    ccssGrade: "6",
    title: "Dependent & Independent Variables",
    standardIds: ["6.EE.C.9"],
    summary: "Relate two changing quantities with an equation, a table, and a graph.",
    emoji: "📈",
    source: "ccss-math-textbook"
  }),
  "area-triangles": withNarration({
    slug: "area-triangles",
    grade: "P6",
    ccssGrade: "6",
    title: "Area of Triangles",
    standardIds: ["6.G.A.1"],
    summary: "Every triangle is half of a rectangle: A = ½ × base × height.",
    emoji: "🔺",
    source: "ccss-math-textbook"
  }),
  "volume-fractional": withNarration({
    slug: "volume-fractional",
    grade: "P6",
    ccssGrade: "6",
    title: "Volume with Fractional Edges",
    standardIds: ["6.G.A.2"],
    summary: "Find the volume of a prism with fractional side lengths.",
    emoji: "🧊",
    source: "ccss-math-textbook"
  }),
  "polygons-coordinate": withNarration({
    slug: "polygons-coordinate",
    grade: "P6",
    ccssGrade: "6",
    title: "Polygons on the Coordinate Plane",
    standardIds: ["6.G.A.3"],
    summary: "Find side lengths of a polygon by subtracting coordinates.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "surface-area-nets": withNarration({
    slug: "surface-area-nets",
    grade: "P6",
    ccssGrade: "6",
    title: "Surface Area with Nets",
    standardIds: ["6.G.A.4"],
    summary: "Unfold a box into its six faces and add their areas.",
    emoji: "🎁",
    source: "ccss-math-textbook"
  }),
  "statistical-questions": withNarration({
    slug: "statistical-questions",
    grade: "P6",
    ccssGrade: "6",
    title: "Statistical Questions",
    standardIds: ["6.SP.A.1","6.SP.A.2"],
    summary: "A statistical question expects varied answers — a distribution.",
    emoji: "❓",
    source: "ccss-math-textbook"
  }),
  "mean-median": withNarration({
    slug: "mean-median",
    grade: "P6",
    ccssGrade: "6",
    title: "Mean, Median & Spread",
    standardIds: ["6.SP.A.3","6.SP.B.5"],
    summary: "Measure the center and the variability of a data set.",
    emoji: "📊",
    source: "ccss-math-textbook"
  }),
  "data-displays": withNarration({
    slug: "data-displays",
    grade: "P6",
    ccssGrade: "6",
    title: "Dot Plots, Histograms & Box Plots",
    standardIds: ["6.SP.B.4"],
    summary: "Show the same data three ways and compare what each reveals.",
    emoji: "📉",
    source: "ccss-math-textbook"
  }),
  "four-quadrant-plane": withNarration({
    slug: "four-quadrant-plane",
    grade: "P6",
    ccssGrade: "6",
    title: "The Four-Quadrant Plane",
    standardIds: ["6.NS.C.6","6.NS.C.8"],
    summary: "Plot points with negative coordinates and reflect them across the axes — signs tell you the quadrant.",
    emoji: "🧭",
    source: "ccss-math-textbook"
  }),
  "integer-arrows": withNarration({
    slug: "integer-arrows",
    grade: "S1",
    ccssGrade: "7",
    title: "Adding Integers with Arrows",
    standardIds: ["7.NS.A.1"],
    summary: "Add positive and negative numbers by chaining arrows on the number line — right for positive, left for negative.",
    emoji: "➕",
    source: "ccss-math-textbook"
  }),
  "complex-unit-rates": withNarration({
    slug: "complex-unit-rates",
    grade: "S1",
    ccssGrade: "7",
    title: "Complex Unit Rates",
    standardIds: ["7.RP.A.1"],
    summary: "Compute unit rates from ratios of fractions, like ½ mile per ¼ hour.",
    emoji: "🏃",
    source: "ccss-math-textbook"
  }),
  "proportional-relationships": withNarration({
    slug: "proportional-relationships",
    grade: "S1",
    ccssGrade: "7",
    title: "Proportional Relationships",
    standardIds: ["7.RP.A.2"],
    summary: "The constant of proportionality k, and why y = kx graphs as a line through the origin.",
    emoji: "📈",
    source: "ccss-math-textbook"
  }),
  "percent-problems": withNarration({
    slug: "percent-problems",
    grade: "S1",
    ccssGrade: "7",
    title: "Percent Problems",
    standardIds: ["7.RP.A.3"],
    summary: "Solve tax, tip, and discount problems in two steps.",
    emoji: "💵",
    source: "ccss-math-textbook"
  }),
  "multiply-divide-integers": withNarration({
    slug: "multiply-divide-integers",
    grade: "S1",
    ccssGrade: "7",
    title: "Multiplying & Dividing Signed Numbers",
    standardIds: ["7.NS.A.2"],
    summary: "Same signs make positive, different signs make negative.",
    emoji: "✖️",
    source: "ccss-math-textbook"
  }),
  "rational-operations": withNarration({
    slug: "rational-operations",
    grade: "S1",
    ccssGrade: "7",
    title: "Rational Numbers in the Real World",
    standardIds: ["7.NS.A.3"],
    summary: "Track a balance as deposits and withdrawals add and subtract.",
    emoji: "💳",
    source: "ccss-math-textbook"
  }),
  "linear-expressions": withNarration({
    slug: "linear-expressions",
    grade: "S1",
    ccssGrade: "7",
    title: "Linear Expressions",
    standardIds: ["7.EE.A.1","7.EE.A.2"],
    summary: "Expand, factor, and combine like terms to rewrite expressions.",
    emoji: "🧩",
    source: "ccss-math-textbook"
  }),
  "multistep-rational": withNarration({
    slug: "multistep-rational",
    grade: "S1",
    ccssGrade: "7",
    title: "Multistep Rational Problems",
    standardIds: ["7.EE.B.3"],
    summary: "Chain operations with fractions, decimals, and percents — one step at a time.",
    emoji: "🍕",
    source: "ccss-math-textbook"
  }),
  "two-step-equations": withNarration({
    slug: "two-step-equations",
    grade: "S1",
    ccssGrade: "7",
    title: "Two-Step Equations",
    standardIds: ["7.EE.B.4"],
    summary: "Solve px + q = r by undoing the operations in reverse order.",
    emoji: "⚖️",
    source: "ccss-math-textbook"
  }),
  "scale-drawings": withNarration({
    slug: "scale-drawings",
    grade: "S1",
    ccssGrade: "7",
    title: "Scale Drawings",
    standardIds: ["7.G.A.1"],
    summary: "Convert drawing lengths to actual lengths — and see area scale by the square.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "construct-triangles": withNarration({
    slug: "construct-triangles",
    grade: "S1",
    ccssGrade: "7",
    title: "Building Triangles",
    standardIds: ["7.G.A.2"],
    summary: "The triangle inequality decides which side lengths make a triangle.",
    emoji: "🔺",
    source: "ccss-math-textbook"
  }),
  "cross-sections": withNarration({
    slug: "cross-sections",
    grade: "S1",
    ccssGrade: "7",
    title: "Cross-Sections",
    standardIds: ["7.G.A.3"],
    summary: "Slice a solid and name the 2-D shape you expose.",
    emoji: "✂️",
    source: "ccss-math-textbook"
  }),
  "angle-relationships": withNarration({
    slug: "angle-relationships",
    grade: "S1",
    ccssGrade: "7",
    title: "Angle Relationships",
    standardIds: ["7.G.B.5"],
    summary: "Use complementary, supplementary, and vertical angles to find unknowns.",
    emoji: "📏",
    source: "ccss-math-textbook"
  }),
  "area-volume-surface": withNarration({
    slug: "area-volume-surface",
    grade: "S1",
    ccssGrade: "7",
    title: "Area, Volume & Surface Area",
    standardIds: ["7.G.B.6"],
    summary: "Find the volume of a prism as base area times length.",
    emoji: "🧊",
    source: "ccss-math-textbook"
  }),
  "sampling": withNarration({
    slug: "sampling",
    grade: "S1",
    ccssGrade: "7",
    title: "Sampling & Inference",
    standardIds: ["7.SP.A.1","7.SP.A.2"],
    summary: "Use a random sample to estimate a whole population.",
    emoji: "🎲",
    source: "ccss-math-textbook"
  }),
  "compare-populations": withNarration({
    slug: "compare-populations",
    grade: "S1",
    ccssGrade: "7",
    title: "Comparing Two Populations",
    standardIds: ["7.SP.B.3","7.SP.B.4"],
    summary: "Judge the difference between two groups by overlap and spread.",
    emoji: "📊",
    source: "ccss-math-textbook"
  }),
  "probability-basics": withNarration({
    slug: "probability-basics",
    grade: "S1",
    ccssGrade: "7",
    title: "Probability 0 to 1",
    standardIds: ["7.SP.C.5","7.SP.C.6"],
    summary: "Measure likelihood, and estimate it by experiment.",
    emoji: "🪙",
    source: "ccss-math-textbook"
  }),
  "probability-models": withNarration({
    slug: "probability-models",
    grade: "S1",
    ccssGrade: "7",
    title: "Probability Models",
    standardIds: ["7.SP.C.7"],
    summary: "Assign probabilities to outcomes — uniform or not — that sum to 1.",
    emoji: "🎰",
    source: "ccss-math-textbook"
  }),
  "compound-events": withNarration({
    slug: "compound-events",
    grade: "S1",
    ccssGrade: "7",
    title: "Compound Events",
    standardIds: ["7.SP.C.8"],
    summary: "List the sample space of two dice to find a probability.",
    emoji: "🎯",
    source: "ccss-math-textbook"
  }),
  "circle-pi": withNarration({
    slug: "circle-pi",
    grade: "S1",
    ccssGrade: "7",
    title: "π, Circumference, and Area of a Circle",
    standardIds: ["7.G.B.4"],
    summary: "Resize a circle and see why circumference ÷ diameter is always π — then read off C = 2πr and A = πr².",
    emoji: "⭕",
    source: "ccss-math-textbook"
  }),
  "slope-explorer": withNarration({
    slug: "slope-explorer",
    grade: "S2",
    ccssGrade: "8",
    title: "Slope: Rise over Run",
    standardIds: ["8.EE.B.6","8.F.A.3"],
    summary: "Drag two points on a line and watch how slope = rise ÷ run stays constant no matter where you measure.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "rational-irrational": withNarration({
    slug: "rational-irrational",
    grade: "S2",
    ccssGrade: "8",
    title: "Rational vs Irrational",
    standardIds: ["8.NS.A.1"],
    summary: "Read the decimal: terminating or repeating means rational.",
    emoji: "🔢",
    source: "ccss-math-textbook"
  }),
  "approximate-irrationals": withNarration({
    slug: "approximate-irrationals",
    grade: "S2",
    ccssGrade: "8",
    title: "Approximating Irrationals",
    standardIds: ["8.NS.A.2"],
    summary: "Trap √2 between whole numbers and place it on a number line.",
    emoji: "📏",
    source: "ccss-math-textbook"
  }),
  "integer-exponents": withNarration({
    slug: "integer-exponents",
    grade: "S2",
    ccssGrade: "8",
    title: "Exponent Rules",
    standardIds: ["8.EE.A.1"],
    summary: "Add exponents to multiply, subtract to divide, multiply to raise a power.",
    emoji: "⏫",
    source: "ccss-math-textbook"
  }),
  "roots": withNarration({
    slug: "roots",
    grade: "S2",
    ccssGrade: "8",
    title: "Square & Cube Roots",
    standardIds: ["8.EE.A.2"],
    summary: "Undo powers to solve x² = p and x³ = p.",
    emoji: "🟦",
    source: "ccss-math-textbook"
  }),
  "scientific-notation": withNarration({
    slug: "scientific-notation",
    grade: "S2",
    ccssGrade: "8",
    title: "Scientific Notation",
    standardIds: ["8.EE.A.3","8.EE.A.4"],
    summary: "Write huge and tiny numbers as a coefficient times a power of 10.",
    emoji: "🔬",
    source: "ccss-math-textbook"
  }),
  "slope-unit-rate": withNarration({
    slug: "slope-unit-rate",
    grade: "S2",
    ccssGrade: "8",
    title: "Slope as Unit Rate",
    standardIds: ["8.EE.B.5"],
    summary: "A steeper line is a faster rate — compare two proportional graphs.",
    emoji: "🏃",
    source: "ccss-math-textbook"
  }),
  "linear-equations": withNarration({
    slug: "linear-equations",
    grade: "S2",
    ccssGrade: "8",
    title: "Solving Linear Equations",
    standardIds: ["8.EE.C.7"],
    summary: "One solution, no solution, or infinitely many.",
    emoji: "⚖️",
    source: "ccss-math-textbook"
  }),
  "systems-of-equations": withNarration({
    slug: "systems-of-equations",
    grade: "S2",
    ccssGrade: "8",
    title: "Systems of Equations",
    standardIds: ["8.EE.C.8"],
    summary: "Two lines meet at the point that solves both equations.",
    emoji: "🔀",
    source: "ccss-math-textbook"
  }),
  "functions-intro": withNarration({
    slug: "functions-intro",
    grade: "S2",
    ccssGrade: "8",
    title: "What Is a Function?",
    standardIds: ["8.F.A.1","8.F.A.2"],
    summary: "One output per input — and comparing functions shown different ways.",
    emoji: "⚙️",
    source: "ccss-math-textbook"
  }),
  "construct-linear-function": withNarration({
    slug: "construct-linear-function",
    grade: "S2",
    ccssGrade: "8",
    title: "Building Linear Functions",
    standardIds: ["8.F.B.4"],
    summary: "Turn a rate of change and a starting value into y = mx + b.",
    emoji: "🌱",
    source: "ccss-math-textbook"
  }),
  "graph-stories": withNarration({
    slug: "graph-stories",
    grade: "S2",
    ccssGrade: "8",
    title: "Graphs Tell Stories",
    standardIds: ["8.F.B.5"],
    summary: "Read a graph's shape — rising, falling, flat, or curved.",
    emoji: "📖",
    source: "ccss-math-textbook"
  }),
  "transformations": withNarration({
    slug: "transformations",
    grade: "S2",
    ccssGrade: "8",
    title: "Transformations",
    standardIds: ["8.G.A.1","8.G.A.3"],
    summary: "Translate, reflect, and rotate — and the coordinate rules for each.",
    emoji: "🔄",
    source: "ccss-math-textbook"
  }),
  "congruence": withNarration({
    slug: "congruence",
    grade: "S2",
    ccssGrade: "8",
    title: "Congruence",
    standardIds: ["8.G.A.2"],
    summary: "A sequence of rigid motions proves two figures are congruent.",
    emoji: "🟰",
    source: "ccss-math-textbook"
  }),
  "similarity": withNarration({
    slug: "similarity",
    grade: "S2",
    ccssGrade: "8",
    title: "Similarity & Dilation",
    standardIds: ["8.G.A.4"],
    summary: "Scale a figure by a factor — same shape, proportional sizes.",
    emoji: "🔺",
    source: "ccss-math-textbook"
  }),
  "triangle-angles": withNarration({
    slug: "triangle-angles",
    grade: "S2",
    ccssGrade: "8",
    title: "Triangle Angles",
    standardIds: ["8.G.A.5"],
    summary: "The three angles of a triangle always sum to 180°.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "pythagorean-theorem": withNarration({
    slug: "pythagorean-theorem",
    grade: "S2",
    ccssGrade: "8",
    title: "The Pythagorean Theorem",
    standardIds: ["8.G.B.6","8.G.B.7"],
    summary: "a² + b² = c², proven by the squares on the sides.",
    emoji: "🔻",
    source: "ccss-math-textbook"
  }),
  "distance-formula": withNarration({
    slug: "distance-formula",
    grade: "S2",
    ccssGrade: "8",
    title: "Distance Between Points",
    standardIds: ["8.G.B.8"],
    summary: "Use the Pythagorean theorem on a coordinate grid.",
    emoji: "📍",
    source: "ccss-math-textbook"
  }),
  "volume-3d": withNarration({
    slug: "volume-3d",
    grade: "S2",
    ccssGrade: "8",
    title: "Volume of Round Solids",
    standardIds: ["8.G.C.9"],
    summary: "Cylinders, cones, and spheres — all from π and the radius.",
    emoji: "🧊",
    source: "ccss-math-textbook"
  }),
  "scatter-plots": withNarration({
    slug: "scatter-plots",
    grade: "S2",
    ccssGrade: "8",
    title: "Scatter Plots",
    standardIds: ["8.SP.A.1"],
    summary: "Spot positive, negative, or no association in bivariate data.",
    emoji: "🔵",
    source: "ccss-math-textbook"
  }),
  "line-of-best-fit": withNarration({
    slug: "line-of-best-fit",
    grade: "S2",
    ccssGrade: "8",
    title: "Line of Best Fit",
    standardIds: ["8.SP.A.2","8.SP.A.3"],
    summary: "Fit a line to data and interpret its slope and intercept.",
    emoji: "📈",
    source: "ccss-math-textbook"
  }),
  "two-way-tables": withNarration({
    slug: "two-way-tables",
    grade: "S2",
    ccssGrade: "8",
    title: "Two-Way Tables",
    standardIds: ["8.SP.A.4"],
    summary: "Use relative frequencies to find associations in categorical data.",
    emoji: "🔲",
    source: "ccss-math-textbook"
  }),
  "rational-exponents": withNarration({
    slug: "rational-exponents",
    grade: "S3",
    ccssGrade: "HS",
    title: "Rational Exponents Are Roots",
    standardIds: ["N-RN.1","N-RN.2"],
    summary: "See why b^(1/n) must be the nth root, and rewrite any radical as a fractional exponent.",
    emoji: "√",
    source: "ccss-math-textbook"
  }),
  "real-number-closure": withNarration({
    slug: "real-number-closure",
    grade: "S3",
    ccssGrade: "HS",
    title: "Rational, Irrational, and Sums",
    standardIds: ["N-RN.3"],
    summary: "Rational + irrational is always irrational — proved by a one-line contradiction. Test the combinations.",
    emoji: "➕",
    source: "ccss-math-textbook"
  }),
  "units-quantities": withNarration({
    slug: "units-quantities",
    grade: "S3",
    ccssGrade: "HS",
    title: "Units Guide the Math",
    standardIds: ["N-Q.1","N-Q.2","N-Q.3"],
    summary: "Chain unit factors so miles and hours cancel — dimensional analysis, plus choosing sensible precision.",
    emoji: "📏",
    source: "ccss-math-textbook"
  }),
  "complex-numbers": withNarration({
    slug: "complex-numbers",
    grade: "S3",
    ccssGrade: "HS",
    title: "Complex Numbers: a + bi",
    standardIds: ["N-CN.1","N-CN.2"],
    summary: "Invent i with i² = −1, then add, subtract, and multiply complex numbers like binomials.",
    emoji: "ⅈ",
    source: "ccss-math-textbook"
  }),
  "complex-conjugates": withNarration({
    slug: "complex-conjugates",
    grade: "S3",
    ccssGrade: "HS",
    title: "Conjugates and Modulus",
    standardIds: ["N-CN.3"],
    summary: "The conjugate a − bi makes z·z̄ = a² + b² real — the key to modulus and division.",
    emoji: "🪞",
    source: "ccss-math-textbook"
  }),
  "complex-plane": withNarration({
    slug: "complex-plane",
    grade: "S3",
    ccssGrade: "HS",
    title: "The Complex Plane",
    standardIds: ["N-CN.4","N-CN.5","N-CN.6"],
    summary: "Plot a + bi as a point. Addition is a parallelogram; distance and midpoint are just coordinates.",
    emoji: "🧭",
    source: "ccss-math-textbook"
  }),
  "complex-solutions": withNarration({
    slug: "complex-solutions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Complex Roots of Quadratics",
    standardIds: ["N-CN.7","N-CN.8","N-CN.9"],
    summary: "A negative discriminant gives a conjugate pair a ± bi — and the Fundamental Theorem of Algebra.",
    emoji: "🎯",
    source: "ccss-math-textbook"
  }),
  "vectors": withNarration({
    slug: "vectors",
    grade: "S3",
    ccssGrade: "HS",
    title: "Vectors: Magnitude and Direction",
    standardIds: ["N-VM.1","N-VM.2","N-VM.3"],
    summary: "Drag an arrow's tail and tip to read off its components, length, and direction angle.",
    emoji: "➡️",
    source: "ccss-math-textbook"
  }),
  "vector-operations": withNarration({
    slug: "vector-operations",
    grade: "S3",
    ccssGrade: "HS",
    title: "Adding and Scaling Vectors",
    standardIds: ["N-VM.4","N-VM.5"],
    summary: "Add tip-to-tail, subtract by adding the opposite, and scale an arrow by a number.",
    emoji: "🧮",
    source: "ccss-math-textbook"
  }),
  "matrices": withNarration({
    slug: "matrices",
    grade: "S3",
    ccssGrade: "HS",
    title: "Matrices and Their Operations",
    standardIds: ["N-VM.6","N-VM.7","N-VM.8"],
    summary: "Scale, add, and multiply 2×2 matrices — with multiplication by the row-times-column rule.",
    emoji: "🔢",
    source: "ccss-math-textbook"
  }),
  "matrix-algebra": withNarration({
    slug: "matrix-algebra",
    grade: "S3",
    ccssGrade: "HS",
    title: "Matrix Algebra: Order Matters",
    standardIds: ["N-VM.9","N-VM.10"],
    summary: "See that AB ≠ BA, and meet the identity and zero matrices that act like 1 and 0.",
    emoji: "🟰",
    source: "ccss-math-textbook"
  }),
  "matrix-transformations": withNarration({
    slug: "matrix-transformations",
    grade: "S3",
    ccssGrade: "HS",
    title: "Matrices Transform the Plane",
    standardIds: ["N-VM.11","N-VM.12"],
    summary: "Apply a 2×2 matrix to a shape and watch it rotate, scale, reflect, or shear. Determinant = area factor.",
    emoji: "🔷",
    source: "ccss-math-textbook"
  }),
  "interpret-expressions": withNarration({
    slug: "interpret-expressions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Reading an Expression's Parts",
    standardIds: ["A-SSE.1","A-SSE.2"],
    summary: "In P(1+r)ᵗ, each piece has a meaning — and seeing structure lets you rewrite the whole.",
    emoji: "🔎",
    source: "ccss-math-textbook"
  }),
  "rewrite-expressions": withNarration({
    slug: "rewrite-expressions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Completing the Square",
    standardIds: ["A-SSE.3"],
    summary: "Turn x² + bx + c into vertex form to reveal the minimum — or factor to reveal the roots.",
    emoji: "⬛",
    source: "ccss-math-textbook"
  }),
  "geometric-series": withNarration({
    slug: "geometric-series",
    grade: "S3",
    ccssGrade: "HS",
    title: "Summing a Geometric Series",
    standardIds: ["A-SSE.4"],
    summary: "A subtraction trick collapses a + ar + ar² + … into one formula, a(rⁿ − 1)/(r − 1).",
    emoji: "➗",
    source: "ccss-math-textbook"
  }),
  "polynomial-operations": withNarration({
    slug: "polynomial-operations",
    grade: "S3",
    ccssGrade: "HS",
    title: "Polynomial Arithmetic",
    standardIds: ["A-APR.1"],
    summary: "Add, subtract, and multiply polynomials — the result is always another polynomial.",
    emoji: "🧱",
    source: "ccss-math-textbook"
  }),
  "remainder-theorem": withNarration({
    slug: "remainder-theorem",
    grade: "S3",
    ccssGrade: "HS",
    title: "The Remainder Theorem",
    standardIds: ["A-APR.2","A-APR.3"],
    summary: "p(a) is the remainder on dividing by (x − a); zeros are where the graph crosses.",
    emoji: "📉",
    source: "ccss-math-textbook"
  }),
  "polynomial-identities": withNarration({
    slug: "polynomial-identities",
    grade: "S3",
    ccssGrade: "HS",
    title: "Identities & the Binomial Theorem",
    standardIds: ["A-APR.4","A-APR.5"],
    summary: "Always-true rewrites like (a+b)² = a² + 2ab + b², with coefficients from Pascal's triangle.",
    emoji: "🔺",
    source: "ccss-math-textbook"
  }),
  "rational-expressions": withNarration({
    slug: "rational-expressions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Rational Expressions",
    standardIds: ["A-APR.6","A-APR.7"],
    summary: "Ratios of polynomials add, multiply, and divide just like number fractions — factor and cancel.",
    emoji: "🍰",
    source: "ccss-math-textbook"
  }),
  "create-equations": withNarration({
    slug: "create-equations",
    grade: "S3",
    ccssGrade: "HS",
    title: "Modeling with Equations",
    standardIds: ["A-CED.1","A-CED.2"],
    summary: "Turn a taxi-fare story into a one-variable equation to solve and a two-variable line to graph.",
    emoji: "🚕",
    source: "ccss-math-textbook"
  }),
  "constraints-formulas": withNarration({
    slug: "constraints-formulas",
    grade: "S3",
    ccssGrade: "HS",
    title: "Constraints & Rearranging Formulas",
    standardIds: ["A-CED.3","A-CED.4"],
    summary: "Isolate any variable in a formula, and represent real limits as equations, inequalities, or systems.",
    emoji: "🔧",
    source: "ccss-math-textbook"
  }),
  "solve-equations-steps": withNarration({
    slug: "solve-equations-steps",
    grade: "S3",
    ccssGrade: "HS",
    title: "Every Step Has a Reason",
    standardIds: ["A-REI.1","A-REI.3"],
    summary: "Solve a linear equation move by move, naming the property of equality that justifies each line.",
    emoji: "⚖️",
    source: "ccss-math-textbook"
  }),
  "rational-radical-equations": withNarration({
    slug: "rational-radical-equations",
    grade: "S3",
    ccssGrade: "HS",
    title: "Radical & Rational Equations",
    standardIds: ["A-REI.2"],
    summary: "Square or clear denominators to solve — then check, because those moves can add false roots.",
    emoji: "🕵️",
    source: "ccss-math-textbook"
  }),
  "solve-quadratics": withNarration({
    slug: "solve-quadratics",
    grade: "S3",
    ccssGrade: "HS",
    title: "Four Ways to Solve a Quadratic",
    standardIds: ["A-REI.4"],
    summary: "Factor, complete the square, use the formula, or graph — and let the discriminant predict the roots.",
    emoji: "🎢",
    source: "ccss-math-textbook"
  }),
  "systems-elimination": withNarration({
    slug: "systems-elimination",
    grade: "S3",
    ccssGrade: "HS",
    title: "Solving Systems by Elimination",
    standardIds: ["A-REI.5","A-REI.6"],
    summary: "Add equations to cancel a variable — legal because equal added to equal stays equal.",
    emoji: "❌",
    source: "ccss-math-textbook"
  }),
  "linear-quadratic-systems": withNarration({
    slug: "linear-quadratic-systems",
    grade: "S3",
    ccssGrade: "HS",
    title: "A Line Meets a Parabola",
    standardIds: ["A-REI.7"],
    summary: "Substitute to turn the system into one quadratic — its discriminant counts the intersections.",
    emoji: "🎯",
    source: "ccss-math-textbook"
  }),
  "matrix-equations": withNarration({
    slug: "matrix-equations",
    grade: "S3",
    ccssGrade: "HS",
    title: "Systems as Matrix Equations",
    standardIds: ["A-REI.8","A-REI.9"],
    summary: "Write Ax = b, then solve with the inverse x = A⁻¹b whenever det A ≠ 0.",
    emoji: "🔲",
    source: "ccss-math-textbook"
  }),
  "graphs-and-solutions": withNarration({
    slug: "graphs-and-solutions",
    grade: "S3",
    ccssGrade: "HS",
    title: "A Graph IS the Solution Set",
    standardIds: ["A-REI.10","A-REI.11"],
    summary: "Every point on a curve satisfies its equation; where two graphs cross, f(x) = g(x).",
    emoji: "🔗",
    source: "ccss-math-textbook"
  }),
  "graph-inequalities": withNarration({
    slug: "graph-inequalities",
    grade: "S3",
    ccssGrade: "HS",
    title: "Graphing Inequalities",
    standardIds: ["A-REI.12"],
    summary: "Shade the half-plane of solutions; overlap several to find a system's feasible region.",
    emoji: "🌗",
    source: "ccss-math-textbook"
  }),
  "function-notation": withNarration({
    slug: "function-notation",
    grade: "S3",
    ccssGrade: "HS",
    title: "Functions and Notation",
    standardIds: ["F-IF.1","F-IF.2","F-IF.3"],
    summary: "Feed x into a function machine to get f(x) — and see sequences as functions on the integers.",
    emoji: "⚙️",
    source: "ccss-math-textbook"
  }),
  "interpret-function-graphs": withNarration({
    slug: "interpret-function-graphs",
    grade: "S3",
    ccssGrade: "HS",
    title: "Reading a Graph's Story",
    standardIds: ["F-IF.4","F-IF.5","F-IF.6"],
    summary: "Find the peak, intercepts, and average rate of change of a rocket's height over time.",
    emoji: "🚀",
    source: "ccss-math-textbook"
  }),
  "compare-functions": withNarration({
    slug: "compare-functions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Comparing Functions",
    standardIds: ["F-IF.9"],
    summary: "One's a formula, one's a table — compare their rates and starting values head to head.",
    emoji: "⚖️",
    source: "ccss-math-textbook"
  }),
  "build-functions": withNarration({
    slug: "build-functions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Building Sequences",
    standardIds: ["F-BF.1","F-BF.2"],
    summary: "Write arithmetic and geometric sequences both recursively and explicitly.",
    emoji: "🧬",
    source: "ccss-math-textbook"
  }),
  "inverse-functions": withNarration({
    slug: "inverse-functions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Inverse Functions",
    standardIds: ["F-BF.4","F-BF.5"],
    summary: "f⁻¹ undoes f — a reflection across y = x. Logarithms are the inverse of exponentials.",
    emoji: "↩️",
    source: "ccss-math-textbook"
  }),
  "construct-linear-exponential": withNarration({
    slug: "construct-linear-exponential",
    grade: "S3",
    ccssGrade: "HS",
    title: "Linear vs. Exponential Models",
    standardIds: ["F-LE.2","F-LE.5"],
    summary: "Build y = mx + b and y = a·bᵗ from a description, and interpret what each parameter means.",
    emoji: "💰",
    source: "ccss-math-textbook"
  }),
  "logarithms": withNarration({
    slug: "logarithms",
    grade: "S3",
    ccssGrade: "HS",
    title: "Logarithms Solve Exponentials",
    standardIds: ["F-LE.4"],
    summary: "A log asks 'what exponent?' — the key to solving bˣ = value for the unknown power.",
    emoji: "🔓",
    source: "ccss-math-textbook"
  }),
  "special-angle-values": withNarration({
    slug: "special-angle-values",
    grade: "S3",
    ccssGrade: "HS",
    title: "Exact Trig Values",
    standardIds: ["F-TF.3"],
    summary: "Read sine, cosine, and tangent of 30°, 45°, 60° straight off the special right triangles.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "trig-symmetry": withNarration({
    slug: "trig-symmetry",
    grade: "S3",
    ccssGrade: "HS",
    title: "Symmetry & Periodicity",
    standardIds: ["F-TF.4"],
    summary: "Unit-circle symmetry gives even/odd identities and period-2π repetition of sine and cosine.",
    emoji: "🔄",
    source: "ccss-math-textbook"
  }),
  "periodic-models": withNarration({
    slug: "periodic-models",
    grade: "S3",
    ccssGrade: "HS",
    title: "Modeling Periodic Phenomena",
    standardIds: ["F-TF.5"],
    summary: "Tune amplitude, period, and midline of a sine wave to model tides, daylight, and sound.",
    emoji: "🌊",
    source: "ccss-math-textbook"
  }),
  "inverse-trig": withNarration({
    slug: "inverse-trig",
    grade: "S3",
    ccssGrade: "HS",
    title: "Inverse Trig Functions",
    standardIds: ["F-TF.6","F-TF.7"],
    summary: "Restrict sine's domain so it has an inverse — then use arcsin to solve sin x = k.",
    emoji: "🔙",
    source: "ccss-math-textbook"
  }),
  "trig-identities": withNarration({
    slug: "trig-identities",
    grade: "S3",
    ccssGrade: "HS",
    title: "The Pythagorean Identity",
    standardIds: ["F-TF.8","F-TF.9"],
    summary: "sin²θ + cos²θ = 1 from the unit circle — plus the addition formulas for combined angles.",
    emoji: "🔺",
    source: "ccss-math-textbook"
  }),
  "precise-definitions": withNarration({
    slug: "precise-definitions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Precise Geometric Definitions",
    standardIds: ["G-CO.1"],
    summary: "Pin down angle, circle, parallel, and perpendicular using only point, line, and distance.",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "transformations-as-functions": withNarration({
    slug: "transformations-as-functions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Transformations as Functions",
    standardIds: ["G-CO.2","G-CO.4","G-CO.5"],
    summary: "Each rigid motion is a coordinate rule on points — apply it to every vertex to draw the image.",
    emoji: "🔀",
    source: "ccss-math-textbook"
  }),
  "figure-symmetry": withNarration({
    slug: "figure-symmetry",
    grade: "S3",
    ccssGrade: "HS",
    title: "Symmetries of a Figure",
    standardIds: ["G-CO.3"],
    summary: "A regular n-gon maps onto itself under n reflections and n rotations. Count them.",
    emoji: "❄️",
    source: "ccss-math-textbook"
  }),
  "congruence-criteria": withNarration({
    slug: "congruence-criteria",
    grade: "S3",
    ccssGrade: "HS",
    title: "SSS, SAS, ASA Congruence",
    standardIds: ["G-CO.6","G-CO.7","G-CO.8"],
    summary: "The right three matching parts force triangle congruence — each shortcut proven from rigid motions.",
    emoji: "🔺",
    source: "ccss-math-textbook"
  }),
  "prove-angle-theorems": withNarration({
    slug: "prove-angle-theorems",
    grade: "S3",
    ccssGrade: "HS",
    title: "Proving Angle Theorems",
    standardIds: ["G-CO.9"],
    summary: "Vertical angles and parallel-line angles: one transversal angle determines all eight.",
    emoji: "∠",
    source: "ccss-math-textbook"
  }),
  "prove-triangle-theorems": withNarration({
    slug: "prove-triangle-theorems",
    grade: "S3",
    ccssGrade: "HS",
    title: "Proving Triangle Theorems",
    standardIds: ["G-CO.10"],
    summary: "The 180° angle sum, isosceles base angles, and the midsegment — each provable, not just observed.",
    emoji: "📗",
    source: "ccss-math-textbook"
  }),
  "prove-parallelogram-theorems": withNarration({
    slug: "prove-parallelogram-theorems",
    grade: "S3",
    ccssGrade: "HS",
    title: "Proving Parallelogram Theorems",
    standardIds: ["G-CO.11"],
    summary: "One diagonal splits a parallelogram into congruent triangles — the key to all its properties.",
    emoji: "▱",
    source: "ccss-math-textbook"
  }),
  "constructions": withNarration({
    slug: "constructions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Compass & Straightedge",
    standardIds: ["G-CO.12","G-CO.13"],
    summary: "Step through the perpendicular-bisector construction, and inscribe a regular hexagon in a circle.",
    emoji: "🧭",
    source: "ccss-math-textbook"
  }),
  "dilations": withNarration({
    slug: "dilations",
    grade: "S3",
    ccssGrade: "HS",
    title: "Dilations",
    standardIds: ["G-SRT.1"],
    summary: "Scale a figure from a center by factor k — lengths ×k, angles unchanged, lines stay parallel.",
    emoji: "🔎",
    source: "ccss-math-textbook"
  }),
  "similarity-transformations": withNarration({
    slug: "similarity-transformations",
    grade: "S3",
    ccssGrade: "HS",
    title: "Similarity & the AA Criterion",
    standardIds: ["G-SRT.2","G-SRT.3"],
    summary: "Similarity is a dilation plus a rigid motion — and two equal angles are enough to prove it.",
    emoji: "🔼",
    source: "ccss-math-textbook"
  }),
  "similarity-proofs": withNarration({
    slug: "similarity-proofs",
    grade: "S3",
    ccssGrade: "HS",
    title: "Proving with Similarity",
    standardIds: ["G-SRT.4","G-SRT.5"],
    summary: "A line parallel to a side splits the others proportionally — the side-splitter theorem.",
    emoji: "✂️",
    source: "ccss-math-textbook"
  }),
  "trig-ratios": withNarration({
    slug: "trig-ratios",
    grade: "S3",
    ccssGrade: "HS",
    title: "Trig Ratios from Similarity",
    standardIds: ["G-SRT.6","G-SRT.7"],
    summary: "Similar right triangles fix sin, cos, tan by angle alone — and sin θ = cos(90° − θ).",
    emoji: "📐",
    source: "ccss-math-textbook"
  }),
  "solve-right-triangles": withNarration({
    slug: "solve-right-triangles",
    grade: "S3",
    ccssGrade: "HS",
    title: "Solving Right Triangles",
    standardIds: ["G-SRT.8"],
    summary: "Use an angle of elevation and a distance to compute a building's height with tangent.",
    emoji: "🏢",
    source: "ccss-math-textbook"
  }),
  "triangle-area-sine": withNarration({
    slug: "triangle-area-sine",
    grade: "S3",
    ccssGrade: "HS",
    title: "Area = ½·ab·sin C",
    standardIds: ["G-SRT.9"],
    summary: "Two sides and the included angle give the area — because b·sin C is the height.",
    emoji: "🔻",
    source: "ccss-math-textbook"
  }),
  "laws-sines-cosines": withNarration({
    slug: "laws-sines-cosines",
    grade: "S3",
    ccssGrade: "HS",
    title: "Laws of Sines & Cosines",
    standardIds: ["G-SRT.10","G-SRT.11"],
    summary: "Solve any triangle: the Law of Cosines generalizes Pythagoras to non-right triangles.",
    emoji: "🌐",
    source: "ccss-math-textbook"
  }),
  "circle-angles": withNarration({
    slug: "circle-angles",
    grade: "S3",
    ccssGrade: "HS",
    title: "Inscribed & Central Angles",
    standardIds: ["G-C.1","G-C.2"],
    summary: "All circles are similar, and an inscribed angle is always half the central angle on its arc.",
    emoji: "⭕",
    source: "ccss-math-textbook"
  }),
  "circle-constructions": withNarration({
    slug: "circle-constructions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Incircles, Circumcircles, Tangents",
    standardIds: ["G-C.3","G-C.4"],
    summary: "Angle bisectors meet at the incenter; perpendicular bisectors at the circumcenter.",
    emoji: "🎯",
    source: "ccss-math-textbook"
  }),
  "arc-length-sector": withNarration({
    slug: "arc-length-sector",
    grade: "S3",
    ccssGrade: "HS",
    title: "Arc Length & Sector Area",
    standardIds: ["G-C.5"],
    summary: "A sector is angle/360 of the circle — the idea behind arc = rθ and radian measure.",
    emoji: "🍕",
    source: "ccss-math-textbook"
  }),
  "equation-of-circle": withNarration({
    slug: "equation-of-circle",
    grade: "S3",
    ccssGrade: "HS",
    title: "The Equation of a Circle",
    standardIds: ["G-GPE.1"],
    summary: "(x − h)² + (y − k)² = r² is just the distance formula — every point is r from the center.",
    emoji: "🔵",
    source: "ccss-math-textbook"
  }),
  "conic-sections": withNarration({
    slug: "conic-sections",
    grade: "S3",
    ccssGrade: "HS",
    title: "Parabolas, Ellipses, Hyperbolas",
    standardIds: ["G-GPE.2","G-GPE.3"],
    summary: "Each conic has a distance definition using foci and directrix — the source of its equation.",
    emoji: "🥚",
    source: "ccss-math-textbook"
  }),
  "coordinate-proofs": withNarration({
    slug: "coordinate-proofs",
    grade: "S3",
    ccssGrade: "HS",
    title: "Coordinate Proofs & Slopes",
    standardIds: ["G-GPE.4","G-GPE.5"],
    summary: "Prove geometry with algebra: parallel lines share a slope; perpendicular slopes multiply to −1.",
    emoji: "📊",
    source: "ccss-math-textbook"
  }),
  "partition-segment": withNarration({
    slug: "partition-segment",
    grade: "S3",
    ccssGrade: "HS",
    title: "Partitioning a Segment",
    standardIds: ["G-GPE.6"],
    summary: "The point dividing AB in a ratio is A + t·(B − A) — a weighted average of the endpoints.",
    emoji: "📍",
    source: "ccss-math-textbook"
  }),
  "coordinate-perimeter-area": withNarration({
    slug: "coordinate-perimeter-area",
    grade: "S3",
    ccssGrade: "HS",
    title: "Perimeter & Area by Coordinates",
    standardIds: ["G-GPE.7"],
    summary: "Compute a polygon's perimeter with the distance formula and its area with the shoelace formula.",
    emoji: "👟",
    source: "ccss-math-textbook"
  }),
  "volume-arguments": withNarration({
    slug: "volume-arguments",
    grade: "S3",
    ccssGrade: "HS",
    title: "Where Volume Formulas Come From",
    standardIds: ["G-GMD.1","G-GMD.2"],
    summary: "Slice and stack: Cavalieri's principle says equal cross-sections mean equal volume.",
    emoji: "🪙",
    source: "ccss-math-textbook"
  }),
  "volume-formulas": withNarration({
    slug: "volume-formulas",
    grade: "S3",
    ccssGrade: "HS",
    title: "Volumes of Solids",
    standardIds: ["G-GMD.3"],
    summary: "Cylinder, cone, sphere, and pyramid — and why the cone is exactly a third of its cylinder.",
    emoji: "🧊",
    source: "ccss-math-textbook"
  }),
  "solids-cross-sections": withNarration({
    slug: "solids-cross-sections",
    grade: "S3",
    ccssGrade: "HS",
    title: "Cross-Sections & Revolutions",
    standardIds: ["G-GMD.4"],
    summary: "Slice a solid to see a 2-D shape; spin a 2-D shape to sweep out a 3-D solid.",
    emoji: "🌀",
    source: "ccss-math-textbook"
  }),
  "geometric-modeling": withNarration({
    slug: "geometric-modeling",
    grade: "S3",
    ccssGrade: "HS",
    title: "Modeling with Geometry",
    standardIds: ["G-MG.1","G-MG.2","G-MG.3"],
    summary: "Model a tree trunk as a cylinder, then use density to estimate its mass. Shapes describe the world.",
    emoji: "🌲",
    source: "ccss-math-textbook"
  }),
  "statistical-displays": withNarration({
    slug: "statistical-displays",
    grade: "S3",
    ccssGrade: "HS",
    title: "Dot Plots, Histograms, Box Plots",
    standardIds: ["S-ID.1"],
    summary: "See one data set three ways, and read off its five-number summary.",
    emoji: "📊",
    source: "ccss-math-textbook"
  }),
  "compare-distributions": withNarration({
    slug: "compare-distributions",
    grade: "S3",
    ccssGrade: "HS",
    title: "Comparing Distributions",
    standardIds: ["S-ID.2","S-ID.3"],
    summary: "Compare center and spread of two classes — and watch an outlier move the mean but not the median.",
    emoji: "⚖️",
    source: "ccss-math-textbook"
  }),
  "normal-distribution": withNarration({
    slug: "normal-distribution",
    grade: "S3",
    ccssGrade: "HS",
    title: "The Normal Distribution",
    standardIds: ["S-ID.4"],
    summary: "The bell curve and the 68–95–99.7 rule for estimating population percentages.",
    emoji: "🔔",
    source: "ccss-math-textbook"
  }),
  "two-way-frequencies": withNarration({
    slug: "two-way-frequencies",
    grade: "S3",
    ccssGrade: "HS",
    title: "Two-Way Frequency Tables",
    standardIds: ["S-ID.5"],
    summary: "Toggle counts, joint, and conditional percentages to spot association between categories.",
    emoji: "🔲",
    source: "ccss-math-textbook"
  }),
  "fit-function-residuals": withNarration({
    slug: "fit-function-residuals",
    grade: "S3",
    ccssGrade: "HS",
    title: "Fitting a Line & Residuals",
    standardIds: ["S-ID.6"],
    summary: "Adjust a line to shrink the residuals — and check the residual plot for leftover patterns.",
    emoji: "📉",
    source: "ccss-math-textbook"
  }),
  "linear-model-interpretation": withNarration({
    slug: "linear-model-interpretation",
    grade: "S3",
    ccssGrade: "HS",
    title: "Interpreting Slope & Intercept",
    standardIds: ["S-ID.7"],
    summary: "In a phone-plan model, the slope is dollars per GB and the intercept is the fixed fee.",
    emoji: "📱",
    source: "ccss-math-textbook"
  }),
  "correlation": withNarration({
    slug: "correlation",
    grade: "S3",
    ccssGrade: "HS",
    title: "Correlation, Not Causation",
    standardIds: ["S-ID.8","S-ID.9"],
    summary: "The coefficient r measures linear strength from −1 to +1 — but correlation isn't cause.",
    emoji: "🔗",
    source: "ccss-math-textbook"
  }),
  "sampling-inference": withNarration({
    slug: "sampling-inference",
    grade: "S3",
    ccssGrade: "HS",
    title: "Sampling & Inference",
    standardIds: ["S-IC.1","S-IC.2"],
    summary: "Draw samples and watch their proportions scatter around the true population value.",
    emoji: "🫙",
    source: "ccss-math-textbook"
  }),
  "study-design": withNarration({
    slug: "study-design",
    grade: "S3",
    ccssGrade: "HS",
    title: "Surveys, Studies, Experiments",
    standardIds: ["S-IC.3"],
    summary: "Only a randomized experiment can establish cause — random assignment is the key.",
    emoji: "🔬",
    source: "ccss-math-textbook"
  }),
  "estimate-population": withNarration({
    slug: "estimate-population",
    grade: "S3",
    ccssGrade: "HS",
    title: "Margin of Error",
    standardIds: ["S-IC.4"],
    summary: "Estimate a population proportion with a confidence interval that tightens as n grows.",
    emoji: "🎯",
    source: "ccss-math-textbook"
  }),
  "compare-treatments": withNarration({
    slug: "compare-treatments",
    grade: "S3",
    ccssGrade: "HS",
    title: "Comparing Two Treatments",
    standardIds: ["S-IC.5"],
    summary: "Is the difference real or just chance? Compare it to what re-randomization produces.",
    emoji: "🌱",
    source: "ccss-math-textbook"
  }),
  "evaluate-reports": withNarration({
    slug: "evaluate-reports",
    grade: "S3",
    ccssGrade: "HS",
    title: "Evaluating Data Reports",
    standardIds: ["S-IC.6"],
    summary: "Ask the critical questions behind a headline statistic before you believe it.",
    emoji: "📰",
    source: "ccss-math-textbook"
  }),
  "set-operations-events": withNarration({
    slug: "set-operations-events",
    grade: "S3",
    ccssGrade: "HS",
    title: "Events as Sets",
    standardIds: ["S-CP.1"],
    summary: "Union, intersection, and complement of events, shaded on a Venn diagram.",
    emoji: "🔵",
    source: "ccss-math-textbook"
  }),
  "independence": withNarration({
    slug: "independence",
    grade: "S3",
    ccssGrade: "HS",
    title: "Independent Events",
    standardIds: ["S-CP.2","S-CP.5"],
    summary: "Test independence: is P(A and B) equal to P(A)·P(B)? If not, the events are associated.",
    emoji: "🎲",
    source: "ccss-math-textbook"
  }),
  "conditional-probability": withNarration({
    slug: "conditional-probability",
    grade: "S3",
    ccssGrade: "HS",
    title: "Conditional Probability",
    standardIds: ["S-CP.3","S-CP.6"],
    summary: "P(A | B) restricts to B's outcomes — and P(A | B) is not the same as P(B | A).",
    emoji: "🌧️",
    source: "ccss-math-textbook"
  }),
  "two-way-probability": withNarration({
    slug: "two-way-probability",
    grade: "S3",
    ccssGrade: "HS",
    title: "Probability from Two-Way Tables",
    standardIds: ["S-CP.4"],
    summary: "Read joint, marginal, and conditional probabilities straight from a two-way table.",
    emoji: "🚲",
    source: "ccss-math-textbook"
  }),
  "addition-rule": withNarration({
    slug: "addition-rule",
    grade: "S3",
    ccssGrade: "HS",
    title: "The Addition Rule",
    standardIds: ["S-CP.7"],
    summary: "P(A or B) = P(A) + P(B) − P(A and B) — subtract the double-counted overlap.",
    emoji: "➕",
    source: "ccss-math-textbook"
  }),
  "multiplication-rule": withNarration({
    slug: "multiplication-rule",
    grade: "S3",
    ccssGrade: "HS",
    title: "The Multiplication Rule",
    standardIds: ["S-CP.8"],
    summary: "P(A and B) = P(A)·P(B | A) — the second probability shifts for draws without replacement.",
    emoji: "✖️",
    source: "ccss-math-textbook"
  }),
  "permutations-combinations": withNarration({
    slug: "permutations-combinations",
    grade: "S3",
    ccssGrade: "HS",
    title: "Permutations & Combinations",
    standardIds: ["S-CP.9"],
    summary: "Order matters → nPr; order doesn't → nCr. Count the ways, then find probabilities.",
    emoji: "🔢",
    source: "ccss-math-textbook"
  }),
  "random-variables": withNarration({
    slug: "random-variables",
    grade: "S3",
    ccssGrade: "HS",
    title: "Random Variables",
    standardIds: ["S-MD.1"],
    summary: "The sum of two dice as a random variable — graph its distribution, peaking at 7.",
    emoji: "🎰",
    source: "ccss-math-textbook"
  }),
  "expected-value": withNarration({
    slug: "expected-value",
    grade: "S3",
    ccssGrade: "HS",
    title: "Expected Value",
    standardIds: ["S-MD.2","S-MD.3","S-MD.4"],
    summary: "The probability-weighted average of outcomes — the long-run mean per trial.",
    emoji: "⚖️",
    source: "ccss-math-textbook"
  }),
  "decisions-probability": withNarration({
    slug: "decisions-probability",
    grade: "S3",
    ccssGrade: "HS",
    title: "Making Decisions with Probability",
    standardIds: ["S-MD.5","S-MD.6","S-MD.7"],
    summary: "Use expected value to judge a carnival game, find a fair price, and compare strategies.",
    emoji: "🎡",
    source: "ccss-math-textbook"
  }),
  "quadratic-vertex-form": withNarration({
    slug: "quadratic-vertex-form",
    grade: "S3",
    ccssGrade: "HS",
    title: "Transforming Parabolas: Vertex Form",
    standardIds: ["F-IF.7","F-IF.8","F-BF.3"],
    summary: "Move the sliders in y = a(x − h)² + k and watch how a, h, and k stretch and shift the parabola.",
    emoji: "📈",
    source: "ccss-math-textbook"
  }),
  "exponential-vs-linear": withNarration({
    slug: "exponential-vs-linear",
    grade: "S3",
    ccssGrade: "HS",
    title: "Exponential vs. Linear Growth",
    standardIds: ["F-LE.1","F-LE.3"],
    summary: "One grows by adding, the other by multiplying. Watch the exponential start behind — then blow past the line for good.",
    emoji: "🚀",
    source: "ccss-math-textbook"
  }),
  "unit-circle": withNarration({
    slug: "unit-circle",
    grade: "S3",
    ccssGrade: "HS",
    title: "The Unit Circle",
    standardIds: ["F-TF.1","F-TF.2"],
    summary: "Sweep an angle around a circle of radius 1 and read off (cos θ, sin θ) — the foundation of trigonometry.",
    emoji: "🔵",
    source: "ccss-math-textbook"
  }),
  "ca-g10-ch01-congruence-proof": withNarration({
    slug: "ca-g10-ch01-congruence-proof",
    grade: "S3",
    ccssGrade: "HS",
    title: "Congruence and Proof",
    standardIds: ["G-CO.6","G-CO.7","G-CO.8","G-CO.2","G-CO.4","G-CO.5"],
    summary: "Pick a slide, turn, or flip and watch one coordinate rule carry all three vertices of a triangle onto a congruent image.",
    emoji: "🪞",
    source: "mais-claude",
    topicId: "us-ca-math-s4-chapter-01",
    narration: "A machinist checking a stamped bracket does not reach for a ruler first. She picks the bracket up, turns it, maybe flips it over, and sets it down on the drawing to see whether it lands exactly on the outline. This chapter turns that test into mathematics: congruent means some slide, turn, or flip carries one figure exactly onto the other. Pick a motion, watch a single coordinate rule move all three vertices at once, and see why the side lengths and the right angle come out unchanged."
  }),
  "ca-g10-ch02-similarity-right-triangle-reasoning": withNarration({
    slug: "ca-g10-ch02-similarity-right-triangle-reasoning",
    grade: "S3",
    ccssGrade: "HS",
    title: "Similarity and Right-Triangle Reasoning",
    standardIds: ["G-SRT.1","G-SRT.6","G-SRT.3","G-SRT.5","G-SRT.8","G-SRT.7","G-SRT.2","G-SRT.9"],
    summary: "Dilate a right triangle and watch its lengths grow while the angle, its sine, cosine, and tangent refuse to change.",
    emoji: "🔺",
    source: "mais-claude",
    topicId: "us-ca-math-s4-chapter-02",
    narration: "Blow a photograph up to poster size and every length multiplies by the same number, while not one angle changes. That is the whole idea behind this chapter. Because two right triangles that share an acute angle are just the same shape at different sizes, the ratio of any two matching sides depends on the angle and nothing else, and those ratios are what we call sine, cosine, and tangent. Pick a triangle, slide the scale factor, and see the side lengths move while the angle and its ratios stay exactly where they were."
  }),
  "ca-g10-ch03-circle-geometry": withNarration({
    slug: "ca-g10-ch03-circle-geometry",
    grade: "S3",
    ccssGrade: "HS",
    title: "Circle Geometry",
    standardIds: ["G-C.5","G-C.1","G-GMD.1","G-GMD.3","G-GMD.4"],
    summary: "Cut a wedge from a paper circle and roll it into a cone: arc, sector area, base radius, height and volume all move together.",
    emoji: "🍦",
    source: "mais-claude",
    topicId: "us-ca-math-s4-chapter-03",
    narration: "A party hat, a paper cup and a traffic cone all start out as a flat piece of a circle. Cut a wedge out of a paper disc, curl the two straight edges together, and the curved edge closes into a ring, because paper does not stretch. That single fact turns the arc length of the flat wedge into the base circle of the finished cone, and from there you can find its radius, its height and the volume it holds. Change the paper radius and the cut angle, and watch every one of those numbers respond at once."
  }),
  "ca-g10-ch04-quadratic-structure": withNarration({
    slug: "ca-g10-ch04-quadratic-structure",
    grade: "S3",
    ccssGrade: "HS",
    title: "Quadratic Structure",
    standardIds: ["A-SSE.1","A-SSE.2","A-SSE.3"],
    summary: "Move a parabola's two roots and watch factored, standard and vertex form rewrite themselves into the same curve.",
    emoji: "🧩",
    source: "mais-claude",
    topicId: "us-ca-math-s4-chapter-04",
    narration: "Picture a drama club deciding how big a discount to put on its tickets. Cutting the price brings more people, so the money taken in is one changing amount times another, and that product is a quadratic. The same quadratic can be dressed three ways: factored form shows where it hits zero, standard form shows its coefficients, and vertex form shows the one value the curve turns around at — for the club's takings, the most money it can bring in. Move the two roots in the figure and watch all three forms rewrite themselves into the very same curve; that one opens upward, so its vertex is the lowest point it reaches."
  }),
  "ca-g10-ch05-conditional-probability": withNarration({
    slug: "ca-g10-ch05-conditional-probability",
    grade: "S3",
    ccssGrade: "HS",
    title: "Conditional Probability",
    standardIds: ["S-CP.3","S-CP.6","S-CP.4","S-CP.7","S-CP.8","S-CP.1","S-CP.2","S-CP.5","S-CP.9"],
    summary: "Move two survey counts and watch conditioning shrink the sample space to one column, changing every probability in the table.",
    emoji: "🎺",
    source: "mais-claude",
    topicId: "us-ca-math-s4-chapter-05",
    narration: "Picture a survey of two hundred students that records two things about each one: whether they march in the band, and whether they read sheet music. Being told that a student is in the band changes the odds that the student reads music, because you throw away every student the news rules out and take the fraction of what is left. Flip the condition and the answer flips with it, since the band is the smaller group. Move the two counts and watch the outlined column, and every probability beside it, change, until one setting makes the two events exactly independent."
  }),
  "ca-g11-ch01-function-transformations-inverses": withNarration({
    slug: "ca-g11-ch01-function-transformations-inverses",
    grade: "S3",
    ccssGrade: "HS",
    title: "Function Transformations and Inverses",
    standardIds: ["F-BF.3","F-BF.4","F-BF.5","F-IF.7","F-IF.8","F-BF.1"],
    summary: "Slide, stretch and flip a parent function, then watch its inverse undo every step as a mirror image across y = x.",
    emoji: "🔁",
    source: "mais-claude",
    topicId: "us-ca-math-s5-chapter-01",
    narration: "Almost every function you meet this year is a plain parent function that has been slid sideways, stretched, flipped and lifted. Running one backwards means undoing those moves in the opposite order, which on a graph is a single mirror flip across the line y equals x. Pick a parent, move the stretch and the two shifts, and watch the inverse rebuild itself step by step. Then use a cooling cup of cocoa to read a time back out of a temperature."
  }),
  "ca-g11-ch02-exponential-logarithmic-models": withNarration({
    slug: "ca-g11-ch02-exponential-logarithmic-models",
    grade: "S3",
    ccssGrade: "HS",
    title: "Exponential and Logarithmic Models",
    standardIds: ["F-LE.1","F-LE.2","F-LE.3","F-LE.4","F-LE.5"],
    summary: "Race a pond whose weed adds the same area each week against one that grows by a percent, then use a log to find when each is covered.",
    emoji: "📈",
    source: "mais-claude",
    topicId: "us-ca-math-s5-chapter-02",
    narration: "Two ponds, one weed, two very different stories. In the first pond the patch grows by the same number of square meters every week; in the second it grows by the same percentage, so the amount it adds keeps getting bigger. Slide the controls and hunt for the week the curve takes over: with some settings it happens in the very first week, and with others it waits until long after the pond is full. Then ask the question a caretaker really asks: when is the pond covered? For the adding pond that is one division, and for the multiplying pond the unknown is stuck up in the exponent, which is exactly the job a logarithm was invented for."
  }),
  "ca-g11-ch03-trigonometric-functions-graphs": withNarration({
    slug: "ca-g11-ch03-trigonometric-functions-graphs",
    grade: "S3",
    ccssGrade: "HS",
    title: "Trigonometric Functions and Graphs",
    standardIds: ["F-TF.2","F-TF.1","F-TF.3","F-TF.4","F-TF.5","F-TF.6","F-TF.7","F-TF.8","F-TF.9"],
    summary: "Step a turning wheel around and watch the rider's height trace the sine wave beside it, point for point.",
    emoji: "🎡",
    source: "mais-claude",
    topicId: "us-ca-math-s5-chapter-03",
    narration: "Picture yourself on a wheel that turns at a steady rate. Your height is not a straight line, it is a wave that repeats every single turn. In this opener you step the wheel around and watch the rider on the left and the dot on the graph move together, with the exact values of cosine and sine printed as you go. Everything else in the chapter is one piece of that picture, looked at closely."
  }),
  "ca-g11-ch04-data-modeling-residuals": withNarration({
    slug: "ca-g11-ch04-data-modeling-residuals",
    grade: "S3",
    ccssGrade: "HS",
    title: "Data Modeling and Residuals",
    standardIds: ["S-ID.6","S-ID.1","S-ID.2","S-ID.3","S-ID.7"],
    summary: "Tilt and shift a line over eight delivery routes and watch the residual plot decide whether a straight line is the right model.",
    emoji: "📈",
    source: "mais-claude",
    topicId: "us-ca-math-s5-chapter-04",
    narration: "Every model misses. In this chapter you fit straight lines to real data, then look hard at what each line got wrong. Slide the line over a courier's eight delivery routes, watch the leftover gaps shrink, and read the pattern they make. A small total is not enough, because the shape of the residuals is what tells you whether a straight line was ever the right idea."
  }),
  "ca-g11-ch05-statistical-inference-claims": withNarration({
    slug: "ca-g11-ch05-statistical-inference-claims",
    grade: "S3",
    ccssGrade: "HS",
    title: "Statistical Inference and Claims",
    standardIds: ["S-IC.1","S-IC.4","S-IC.2","S-IC.3","S-IC.5","S-IC.6"],
    summary: "Set a survey’s size and result, then see which band each design earns — and whether it rules a marked claim out.",
    emoji: "📊",
    source: "mais-claude",
    topicId: "us-ca-math-s5-chapter-05",
    narration: "A student paper says 60 percent of students would ride a late bus, but nobody asked all twelve thousand of them. Move the sample size and the sample percent, and the bar shows every population value this survey leaves standing. Slide the marker to a claim and see whether the data rule it out. Then switch how the data were gathered: a sign-up sheet earns no band at all, and a randomized experiment is judged against the wider swing in the gap between its two groups."
  }),
  "ca-g12-ch01-quantities-units-precision": withNarration({
    slug: "ca-g12-ch01-quantities-units-precision",
    grade: "S3",
    ccssGrade: "HS",
    title: "Quantities, Units, and Precision",
    standardIds: ["N-Q.1","N-Q.2","N-Q.3"],
    summary: "Set a plot's sides and the tool that read them, and see the doubt band decide how many significant figures the answer keeps.",
    emoji: "📐",
    source: "mais-claude",
    topicId: "us-ca-math-s6-chapter-01",
    narration: "A crew writes two numbers on a clipboard, and a plot becomes turf to buy and edging to cut. Those numbers cannot do the job alone: each one carries a unit, and each one came off a tool that can only see so fine. In this chapter a quantity is three things at once, a number, a unit, and a level of precision, and all three travel through the arithmetic with it. Change the plot, switch tools, and watch the width of the doubt band decide how many significant figures your measurement actually paid for."
  }),
  "ca-g12-ch02-polynomial-structure-behavior": withNarration({
    slug: "ca-g12-ch02-polynomial-structure-behavior",
    grade: "S3",
    ccssGrade: "HS",
    title: "Polynomial Structure and Behavior",
    standardIds: ["A-APR.3","A-APR.2","A-APR.1","N-CN.9","N-CN.7","N-CN.8","N-CN.3","N-CN.4","N-CN.1"],
    summary: "Move a cubic's real zero and its complex pair, and watch the graph, the two written forms and the complex plane update together.",
    emoji: "🔗",
    source: "mais-claude",
    topicId: "us-ca-math-s6-chapter-02",
    narration: "A graph can only draw the zeros that happen to be real numbers, so a cubic that crosses the axis just once looks like it is hiding two of its three answers. Move the three dials and watch the missing pair appear on the complex plane beside the graph, as mirror images above and below the real axis — until you drop the imaginary part to zero and they settle onto the axis together. That mirroring is what keeps the multiplied-out coefficients real. And once complex numbers are allowed, every polynomial has exactly as many zeros as its degree — that is the Fundamental Theorem of Algebra."
  }),
  "ca-g12-ch03-decision-statistics": withNarration({
    slug: "ca-g12-ch03-decision-statistics",
    grade: "S3",
    ccssGrade: "HS",
    title: "Decision Statistics",
    standardIds: ["S-MD.2","S-MD.1","S-MD.3","S-MD.4","S-MD.5","S-MD.6","S-MD.7"],
    summary: "Change a prize wheel's payouts and ticket price, and watch the distribution, its expected value and the fair price move together.",
    emoji: "🎪",
    source: "mais-claude",
    topicId: "us-ca-math-s6-chapter-03",
    narration: "Picture a booth at the school fair with a spinning wheel: one big gold prize, a few small ones, and a lot of blanks. Instead of asking whether you can win, this lesson asks what a single spin does to your money on average. Change the prizes and the ticket price, and watch three things move together: the graph of every possible result, the weighted average that balances it, and the price that would make the game fair. That average is the tool the rest of the chapter uses to make decisions."
  }),
  "ca-g12-ch04-function-analysis-rates": withNarration({
    slug: "ca-g12-ch04-function-analysis-rates",
    grade: "S3",
    ccssGrade: "HS",
    title: "Function Analysis and Rates",
    standardIds: ["F-IF.6","F-IF.4","F-IF.9","F-IF.1","F-IF.2","F-IF.3","F-IF.5","F-IF.7","F-IF.8"],
    summary: "Pick a club, move the two week markers, and read the rise, run and exact average rate of change off one graph.",
    emoji: "⏱️",
    source: "mais-claude",
    topicId: "us-ca-math-s6-chapter-04",
    narration: "Three school clubs grow in three different ways: one adds the same number of members every week, one fills up and then shrinks back to where it started, and one doubles. Move the two week markers and the figure draws the line between those two counts, then tells you its slope, which is the average rate of change. Watch the strip of weekly changes underneath, because that strip is the fingerprint that says linear, quadratic or exponential, and it works even for the club that comes with no rule at all, only a table. Then work through the ball example, where the average over four seconds is zero even though the ball never stops moving."
  }),
  "ca-g12-ch05-capstone-modeling": withNarration({
    slug: "ca-g12-ch05-capstone-modeling",
    grade: "S3",
    ccssGrade: "HS",
    title: "Capstone Modeling",
    standardIds: ["N-VM.12","N-VM.11","G-MG.2","G-MG.1","G-MG.3","N-VM.1","N-VM.2","N-VM.4","N-VM.5","N-VM.3"],
    summary: "Reshape a glass canopy with a 2x2 matrix and watch the determinant set its new area, its weight, and whether the frame holds.",
    emoji: "📐",
    source: "mais-claude",
    topicId: "us-ca-math-s6-chapter-05",
    narration: "A glass canopy over a courtyard starts life as two arrows on a site plan, one along each edge of the panel. Put those two arrows in the columns of a small square of numbers and its determinant is the panel's own area; then a second matrix, the move the designer makes to the whole plan, has its own determinant, and that number is the factor every area on the plan gets multiplied by. Follow the chain and the area gives you the weight of the glass, and the weight tells the builder whether the frame can hold it. Slant the panel, double it, turn it, or mirror it, and watch every number in the chain answer."
  }),
  "ca-g6-ch01-ratios-rates-percent-reasoning": withNarration({
    slug: "ca-g6-ch01-ratios-rates-percent-reasoning",
    grade: "P6",
    ccssGrade: "6",
    title: "Ratios, Rates, and Percent Reasoning",
    standardIds: ["6.RP.A.1","6.RP.A.3","6.RP.A.2"],
    summary: "Mix juice and water, then watch one recipe show up as a table, a double number line, a unit rate, and a percent of the batch.",
    emoji: "🥤",
    source: "mais-claude",
    topicId: "us-ca-math-p6-chapter-01",
    narration: "This chapter is about ratios, the 'for every' in a recipe. In the figure you mix cups of juice and cups of sparkling water, then watch the same mix show up as a table of batches, a double number line, a unit rate, and a percent of the whole batch. Change the recipe or the number of batches and notice which numbers move together and which stay exactly the same."
  }),
  "ca-g6-ch02-rational-numbers-number-line": withNarration({
    slug: "ca-g6-ch02-rational-numbers-number-line",
    grade: "P6",
    ccssGrade: "6",
    title: "Rational Numbers and the Number Line",
    standardIds: ["6.NS.C.6","6.NS.C.7","6.NS.C.5","6.NS.C.8","6.NS.B.4","6.NS.A.1"],
    summary: "Step two rational numbers along one number line to see their names, opposites, distances from 0, order, and grid point.",
    emoji: "📍",
    source: "mais-claude",
    topicId: "us-ca-math-p6-chapter-02",
    narration: "Picture an elevator panel: two floors up is positive two, and the loading bay below the lobby is negative one point five. Every rational number works that way, sitting at exactly one spot on the number line. Move points A and B a quarter at a time and watch their names, their opposites, and their distances from zero change together. Then see the pair land on a single point where a second number line crosses the first."
  }),
  "ca-g6-ch03-expressions-equations-variables": withNarration({
    slug: "ca-g6-ch03-expressions-equations-variables",
    grade: "P6",
    ccssGrade: "6",
    title: "Expressions, Equations, and Variables",
    standardIds: ["6.EE.A.1","6.EE.A.2","6.EE.A.3","6.EE.A.4","6.EE.B.5","6.EE.B.6","6.EE.B.7","6.EE.B.8","6.EE.C.9"],
    summary: "Build a tile mural from square panels and watch one rule act as an expression, two equal forms, an equation, and a limit.",
    emoji: "🧱",
    source: "mais-claude",
    topicId: "us-ca-math-p6-chapter-03",
    narration: "An art club is building a mural out of identical square panels, but nobody has decided how big a panel should be yet. So the plan uses letters: a square of side s takes s squared blue tiles, one panel takes s squared plus g, and n panels take n times that. Move the sliders and watch the same rule counted two ways, filled into a table, and pressed against the hundred tiles in the box."
  }),
  "ca-g6-ch04-geometry-area-surface-area": withNarration({
    slug: "ca-g6-ch04-geometry-area-surface-area",
    grade: "P6",
    ccssGrade: "6",
    title: "Geometry: Area, Surface Area, and Volume",
    standardIds: ["6.G.A.1","6.G.A.4","6.G.A.2","6.G.A.3"],
    summary: "Resize a box in half-units and watch its unfolded net, its six face areas and the half-unit cubes that pack it move together.",
    emoji: "📦",
    source: "mais-claude",
    topicId: "us-ca-math-p6-chapter-04",
    narration: "Picture a cereal box on the kitchen counter. The counter space it takes, the cardboard it is made from and the cereal inside are three different measurements, and this chapter finds all three the same way: break the shape into pieces you can count. Unfold the box and its six faces become six rectangles to add up. Pack it with cubes half a unit on each side, count them, and remember that eight of those cubes make one cubic unit."
  }),
  "ca-g6-ch05-statistics-data-distributions": withNarration({
    slug: "ca-g6-ch05-statistics-data-distributions",
    grade: "P6",
    ccssGrade: "6",
    title: "Statistics and Data Distributions",
    standardIds: ["6.SP.A.2","6.SP.A.1","6.SP.A.3","6.SP.B.5","6.SP.B.4"],
    summary: "Shift a class's answers, widen the spacing between them, and reshape them; the dot plot, median, mean, and range update together.",
    emoji: "🎯",
    source: "mais-claude",
    topicId: "us-ca-math-p6-chapter-05",
    narration: "Ask a whole class how many minutes it takes them to get to school and you will not get one answer, you will get a spread of them. In this chapter you learn to see that spread as a distribution with a center, a spread, and a shape. Slide the typical answer, stretch the spacing between answers, and give the data a tail, then watch the median, the mean, and the range respond on the dot plot."
  }),
  "ca-g7-ch01-proportional-relationships": withNarration({
    slug: "ca-g7-ch01-proportional-relationships",
    grade: "S1",
    ccssGrade: "7",
    title: "Proportional Relationships",
    standardIds: ["7.RP.A.2","7.RP.A.1","7.RP.A.3"],
    summary: "Change a price tag, even one selling 3/4 of a pound, and watch the unit rate, table, graph slope, and coupon total move together.",
    emoji: "🍒",
    source: "mais-claude",
    topicId: "us-ca-math-s1-chapter-01",
    narration: "Every price tag hides a rule. If the sign says six dollars for three quarters of a pound, then one whole pound costs eight dollars, and any amount you buy follows that same rule. In this lesson you change the sign and watch the unit rate, the table, the graph, and even a coupon move together. The dollar axis never moves, so a bigger price per pound draws a steeper line, and that steepness is the constant k."
  }),
  "ca-g7-ch02-operations-rational-numbers": withNarration({
    slug: "ca-g7-ch02-operations-rational-numbers",
    grade: "S1",
    ccssGrade: "7",
    title: "Operations with Rational Numbers",
    standardIds: ["7.NS.A.1","7.NS.A.2","7.NS.A.3"],
    summary: "Pick add, subtract, multiply or divide and watch two rational numbers become one move on the number line, sign and all.",
    emoji: "🧮",
    source: "mais-claude",
    topicId: "us-ca-math-s1-chapter-02",
    narration: "This chapter opens with one number line and four buttons. Choose add, subtract, multiply or divide, then change either number and watch what the arrows do: adding slides you along the line, subtracting slides you the other way, and multiplying rescales the arrow, shrinking it when the factor is between 0 and 1 and flipping it across zero when the factor is negative. Dividing asks the opposite question, which is why it follows the same sign rule and why dividing by zero has no answer at all. Every result stays a rational number, and the sign always has a reason behind it."
  }),
  "ca-g7-ch03-linear-expressions-equations": withNarration({
    slug: "ca-g7-ch03-linear-expressions-equations",
    grade: "S1",
    ccssGrade: "7",
    title: "Linear Expressions and Equations",
    standardIds: ["7.EE.A.1","7.EE.A.2","7.EE.B.4","7.EE.B.3"],
    summary: "Build a field-trip bill as two equal bars, then rewrite it as px + q, solve it back, and test it against a budget.",
    emoji: "🧾",
    source: "mais-claude",
    topicId: "us-ca-math-s1-chapter-03",
    narration: "A club is going to the museum, and one bill has to cover everyone. The top bar shows the money the way the group pays it: a ticket block and a guide block for every member, then one parking block; the bottom bar shows the same money regrouped into the part that grows with the ticket price and the part that stays fixed. Both bars are drawn on one dollar ruler, so sliding the ticket price makes them grow together while the fixed block keeps exactly its size, and a dashed line marks where the budget runs out. Then look only at the total and let two undo moves bring the ticket price back."
  }),
  "ca-g7-ch04-scale-geometry-measurement": withNarration({
    slug: "ca-g7-ch04-scale-geometry-measurement",
    grade: "S1",
    ccssGrade: "7",
    title: "Scale, Geometry, and Measurement",
    standardIds: ["7.G.A.1","7.G.B.4","7.G.B.6"],
    summary: "Resize a park plan, its fountain, and the pool's depth, then read off real lengths, areas, circumference, and the pool's volume.",
    emoji: "🗺️",
    source: "mais-claude",
    topicId: "us-ca-math-s1-chapter-04",
    narration: "Imagine holding the plan for a new park on a single sheet of paper. Every line on it stands for real meters on the ground, so once you know the scale you can find the length of the fence, the size of the fountain, and how much water the pool holds. Depth is the one measurement a flat plan cannot draw, which is why a cross-section, the flat shape you expose by cutting straight across the pool, is drawn beside it. Change the plan and watch every measurement update."
  }),
  "ca-g7-ch05-sampling-probability-inference": withNarration({
    slug: "ca-g7-ch05-sampling-probability-inference",
    grade: "S1",
    ccssGrade: "7",
    title: "Sampling, Probability, and Inference",
    standardIds: ["7.SP.A.1","7.SP.A.2","7.SP.B.3","7.SP.B.4","7.SP.C.5","7.SP.C.6","7.SP.C.7","7.SP.C.8"],
    summary: "Set the sample size, yes count, and school size, and watch one fraction act as an estimate, a probability, and a tree of two picks.",
    emoji: "🔍",
    source: "mais-claude",
    topicId: "us-ca-math-s1-chapter-05",
    narration: "Your school wants to know if anyone would use the library on a Saturday, and there is no time to ask everyone. So you ask a small group picked at random, and one fraction does three jobs at once. It estimates the whole school, it marks a spot on the 0-to-1 probability scale, and multiplied by itself it gives the chance that two picks both say yes. Slide the controls and watch all three readings move together."
  }),
  "ca-g8-ch01-linear-equations-systems-readiness": withNarration({
    slug: "ca-g8-ch01-linear-equations-systems-readiness",
    grade: "S2",
    ccssGrade: "8",
    title: "Linear Equations and Systems Readiness",
    standardIds: ["8.EE.C.7","8.EE.C.8","8.NS.A.1","8.NS.A.2"],
    summary: "Steer two bike-rental price plans until their lines cross, then place the break-even time and the square root of 2 on a number line.",
    emoji: "🚲",
    source: "mais-claude",
    topicId: "us-ca-math-s2-chapter-01",
    narration: "Two bike shops, two price lists, and one moment when they charge exactly the same. Change the deposits and the hourly rates, and watch the two lines slide until they cross, or run parallel, or land right on top of each other. Whenever they do cross, that point is the answer to the equation, and it arrives as one whole number divided by another. That is why its decimal has to stop or repeat, unlike the square root of 2 sitting beside it on the number line."
  }),
  "ca-g8-ch02-functions-rate-change": withNarration({
    slug: "ca-g8-ch02-functions-rate-change",
    grade: "S2",
    ccssGrade: "8",
    title: "Functions and Rate of Change",
    standardIds: ["8.F.B.4","8.F.A.3","8.EE.B.5","8.EE.B.6","8.F.A.1","8.F.A.2"],
    summary: "Set a barrel's rate, start and step width, then watch one function appear as a rule, a table and a straight-line graph.",
    emoji: "🪣",
    source: "mais-claude",
    topicId: "us-ca-math-s2-chapter-02",
    narration: "A rain barrel already holds some water when the rain starts, and the downpipe adds the same amount every minute. That is a rule: name a minute, and it gives back exactly one reading. Set the rate and the starting amount here, and watch the same function show up three ways at once, as a rule, as a table, and as a straight line. Widen the step drawn on the graph and compare it with the small one beside it: both give the same rise divided by run, and that steady climb is the rate of change the whole chapter is built on."
  }),
  "ca-g8-ch03-transformations-similarity": withNarration({
    slug: "ca-g8-ch03-transformations-similarity",
    grade: "S2",
    ccssGrade: "8",
    title: "Transformations and Similarity",
    standardIds: ["8.G.A.1","8.G.A.4","8.G.A.3","8.G.A.2","8.G.A.5"],
    summary: "Compose a dilation, a flip or turn, and a slide on one triangle and see which measurements change and which never do.",
    emoji: "🪞",
    source: "mais-claude",
    topicId: "us-ca-math-s2-chapter-03",
    narration: "Slide a sticker across a locker, flip it, spin it a quarter turn, and it is still the same sticker. Pinch a photo bigger and it keeps its shape while changing its size. Here you build a sequence of those moves on one triangle and watch the numbers: the three angles never budge, and every side length changes by the same factor. When that factor is one the triangles are congruent; when it is not, they are similar."
  }),
  "ca-g8-ch04-pythagorean-reasoning-coordinate-geometry": withNarration({
    slug: "ca-g8-ch04-pythagorean-reasoning-coordinate-geometry",
    grade: "S2",
    ccssGrade: "8",
    title: "Pythagorean Reasoning and Coordinate Geometry",
    standardIds: ["8.G.B.8","8.G.B.7","8.EE.A.2"],
    summary: "Move two grid points and watch the right triangle, its legs, and the square root that lands the distance on a number line.",
    emoji: "📐",
    source: "mais-claude",
    topicId: "us-ca-math-s2-chapter-04",
    narration: "Two places on a map are usually farther apart along the streets than in a straight line. Going across and then up traces the two legs of a right triangle, and the straight line you actually want is its longest side. Square the legs, add the results, then take the square root, and the number line under the figure shows exactly where that distance lands. Slide the points around and watch a whole number turn into a root that sits between two of them."
  }),
  "ca-g8-ch05-bivariate-data-claims": withNarration({
    slug: "ca-g8-ch05-bivariate-data-claims",
    grade: "S2",
    ccssGrade: "8",
    title: "Bivariate Data and Claims",
    standardIds: ["8.SP.A.1","8.SP.A.2","8.SP.A.3","8.SP.A.4"],
    summary: "Set the hidden slope and scatter behind eight players' seasons; the scatter plot, best-fit line, prediction, and two-way table all follow.",
    emoji: "🏀",
    source: "mais-claude",
    topicId: "us-ca-math-s2-chapter-05",
    narration: "A coach claims that players who practice more make more free throws. One player cannot prove it, but a whole team's pairs of numbers can. In this chapter you plot those pairs, fit a line, read its slope as a rate, and use it to predict. Then you sort the same players into a two-way table and compare percentages, because with categories it is the percentages, not the raw counts, that reveal an association."
  }),
  "ca-g9-ch01-equations-context": withNarration({
    slug: "ca-g9-ch01-equations-context",
    grade: "S3",
    ccssGrade: "HS",
    title: "Equations from Context",
    standardIds: ["A-CED.1","A-CED.2","A-CED.3","A-CED.4"],
    summary: "Set a setup fee, a price per shirt, and a budget; the cost line, the equation, the inequality, and the rearranged formula update together.",
    emoji: "👕",
    source: "mais-claude",
    topicId: "us-ca-math-s3-chapter-01",
    narration: "Picture your club ordering custom T-shirts: the print shop charges a setup fee, then a price for every shirt. This chapter shows how one equation written from that story can be solved for a shirt count, graphed as a line, turned into an inequality when there is a budget, and rearranged to give the count from any total. Try changing the fee, the price, and the budget, and watch every part of the figure move together."
  }),
  "ca-g9-ch02-function-notation-interpretation": withNarration({
    slug: "ca-g9-ch02-function-notation-interpretation",
    grade: "S3",
    ccssGrade: "HS",
    title: "Function Notation and Interpretation",
    standardIds: ["F-IF.2","F-IF.1","F-IF.3","F-IF.4","F-IF.5","F-IF.6"],
    summary: "Read one ticket-sale rule both ways: put a day into T(d) for a count, or start from a count and solve back to the day.",
    emoji: "🎟️",
    source: "mais-claude",
    topicId: "us-ca-math-s3-chapter-02",
    narration: "A school concert goes on sale, and the box office count depends on one thing: how many days the sale has been running. One day in, one count out, which is exactly what makes it a function. Try both directions here: evaluate T of a day to get a ticket count, then start from a ticket count and solve back to find the day. Watch the presale total, the daily rate, and the moment the hall fills, and practice saying in ordinary words what each number means."
  }),
  "ca-g9-ch03-linear-quadratic-models": withNarration({
    slug: "ca-g9-ch03-linear-quadratic-models",
    grade: "S3",
    ccssGrade: "HS",
    title: "Linear and Quadratic Models",
    standardIds: ["A-REI.11","A-REI.7","A-REI.4","A-REI.10","A-SSE.3","A-SSE.1","A-REI.1","A-REI.3","A-SSE.2"],
    summary: "Throw a ball beside a rising drone; see the quadratic's vertex, the linear model, and the times when the two heights match.",
    emoji: "🚁",
    source: "mais-claude",
    topicId: "us-ca-math-s3-chapter-03",
    narration: "Picture a ball thrown straight up while a drone rises beside it at a steady speed. The drone's height is a linear model, and the ball's height, pulled down by gravity, is a quadratic model. In this chapter you will set models equal to find when things happen, rewrite a quadratic to reveal its peak, and see that where two graphs cross, their equations agree. Try changing the throw and the drone, and watch every readout update."
  }),
  "ca-g9-ch04-coordinate-geometry-methods": withNarration({
    slug: "ca-g9-ch04-coordinate-geometry-methods",
    grade: "S3",
    ccssGrade: "HS",
    title: "Coordinate Geometry Methods",
    standardIds: ["G-GPE.1","G-GPE.7","G-GPE.5","G-GPE.6","G-GPE.4"],
    summary: "Move point B and one short segment reports its slope, its length, a point that splits it, and the circle through B.",
    emoji: "📐",
    source: "mais-claude",
    topicId: "us-ca-math-s3-chapter-04",
    narration: "Two points on a grid are only four numbers, but they hold a surprising amount of geometry. Move point B and watch the slope, the length, a point part way along the segment, and a circle through B all change together. Every one of those answers comes from subtracting coordinates and squaring, with no ruler anywhere. This chapter turns that handful of formulas into proofs, conic equations, partitions, and areas."
  }),
  "ca-g9-ch05-modeling-evidence": withNarration({
    slug: "ca-g9-ch05-modeling-evidence",
    grade: "S3",
    ccssGrade: "HS",
    title: "Modeling with Evidence",
    standardIds: ["S-ID.6","S-ID.7","S-ID.8","S-ID.1","S-ID.3","S-ID.9"],
    summary: "Steer nine students' scores and watch one data set answer two questions: summarize it alone, then explain it with practice hours.",
    emoji: "🔬",
    source: "mais-claude",
    topicId: "us-ca-math-s3-chapter-05",
    narration: "Someone claims the new practice sessions are working. A claim is not evidence, so nine students each bring two numbers: hours of practice and a unit-test score. In this chapter you organize those numbers twice, first describing the scores on their own with a dot plot, a mean, a median and a range, then explaining them with a fitted line whose slope, residuals and correlation you can read. Move the controls and watch both stories change together."
  })
};

export const ccssTextbookLessonIds = Object.keys(ccssTextbookLessons) as CcssTextbookLessonId[];

export function isCcssTextbookLessonId(value: string): value is CcssTextbookLessonId {
  return value in ccssTextbookLessons;
}

export function getCcssTextbookLesson(slug: string): CcssTextbookLessonMeta | null {
  return isCcssTextbookLessonId(slug) ? ccssTextbookLessons[slug] : null;
}

/** Grade band for reading-level typography (mirrors the upstream band system). */
export function ccssReadingBandForGrade(grade: GradeId): "early" | "upper" | "middle" | "high" {
  switch (grade) {
    case "K":
    case "P1":
    case "P2":
      return "early";
    case "P3":
    case "P4":
    case "P5":
      return "upper";
    case "P6":
    case "S1":
    case "S2":
      return "middle";
    default:
      return "high";
  }
}
