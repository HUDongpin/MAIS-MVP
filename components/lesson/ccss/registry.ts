import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { CcssTextbookLessonId } from "@/data/ccssTextbookRegistry";
import type { CcssLessonHostProps } from "@/components/lesson/ccss/CcssLessonAdapter";

/**
 * GENERATED FILE — do not hand-edit. Regenerate with:
 *   node scripts/generate-ccss-registry.mjs
 *
 * Code-split routes for the 270 ported CCSS textbook lesson bodies. Each
 * lesson loads on its own chunk (with the shared adapter), so the lesson-page
 * shell bundle never carries lesson bodies the student didn't open — the same
 * pattern as `SignatureLabRoutes` in VisualizationLabPage.
 *
 * `satisfies Record<CcssTextbookLessonId, …>` keeps this map compile-time
 * exhaustive against the metadata registry.
 */
export const ccssLessonRoutes = {
  "counting-ten-frame": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/counting-ten-frame")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "count-to-100": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/count-to-100")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-groups": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-groups")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "number-bonds": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/number-bonds")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "teen-numbers": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/teen-numbers")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-length": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-length")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "sort-and-count": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/sort-and-count")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "flat-shapes": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/flat-shapes")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compose-shapes": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compose-shapes")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "position-words": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/position-words")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "make-ten-to-add": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/make-ten-to-add")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "add-subtract-stories": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/add-subtract-stories")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "count-on-count-back": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/count-on-count-back")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "missing-addend": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/missing-addend")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "equal-sign-balance": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/equal-sign-balance")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "count-to-120": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/count-to-120")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "tens-and-ones": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/tens-and-ones")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-two-digit": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-two-digit")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "add-within-100": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/add-within-100")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "order-and-measure": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/order-and-measure")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "telling-time": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/telling-time")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "picture-graph": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/picture-graph")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "shape-attributes": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/shape-attributes")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compose-2d": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compose-2d")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "partition-shapes": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/partition-shapes")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "word-problems-100": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/word-problems-100")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "fluent-within-20": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/fluent-within-20")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "odd-even": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/odd-even")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "arrays-repeated-addition": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/arrays-repeated-addition")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "place-value-blocks": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/place-value-blocks")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "skip-counting": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/skip-counting")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-three-digit": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-three-digit")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "add-subtract-regroup": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/add-subtract-regroup")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "add-four-numbers": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/add-four-numbers")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "add-subtract-1000": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/add-subtract-1000")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "mental-10-100": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/mental-10-100")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "measure-with-ruler": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/measure-with-ruler")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "estimate-compare-length": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/estimate-compare-length")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "length-number-line": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/length-number-line")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "time-five-minutes": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/time-five-minutes")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "money": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/money")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "line-plot": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/line-plot")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "bar-graph": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/bar-graph")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "shapes-by-attributes": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/shapes-by-attributes")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "rows-and-columns": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/rows-and-columns")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "equal-shares": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/equal-shares")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "division-meaning": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/division-meaning")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiply-divide-words": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiply-divide-words")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiplication-properties": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiplication-properties")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiplication-fluency": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiplication-fluency")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "two-step-problems": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/two-step-problems")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "arithmetic-patterns": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/arithmetic-patterns")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "rounding": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/rounding")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "add-subtract-algorithm": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/add-subtract-algorithm")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiply-by-tens": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiply-by-tens")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-fractions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-fractions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "time-to-minute": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/time-to-minute")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "volume-mass": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/volume-mass")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "scaled-graphs": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/scaled-graphs")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "measure-line-plot": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/measure-line-plot")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "area-count": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/area-count")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "perimeter": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/perimeter")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "quadrilaterals": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/quadrilaterals")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "partition-equal-areas": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/partition-equal-areas")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "fractions-number-line": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/fractions-number-line")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "area-model": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/area-model")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiplicative-comparison": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiplicative-comparison")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multistep-problems": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multistep-problems")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "factors-multiples": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/factors-multiples")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "growing-patterns": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/growing-patterns")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "place-value-relationship": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/place-value-relationship")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "read-compare-multidigit": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/read-compare-multidigit")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "rounding-multidigit": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/rounding-multidigit")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "add-subtract-bignum": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/add-subtract-bignum")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiply-multidigit": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiply-multidigit")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "long-division": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/long-division")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-fractions-4": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-fractions-4")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "add-subtract-fractions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/add-subtract-fractions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiply-fraction-whole": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiply-fraction-whole")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "fractions-10-100": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/fractions-10-100")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "decimals-fractions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/decimals-fractions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-decimals": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-decimals")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "measurement-conversion": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/measurement-conversion")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "area-perimeter-formulas": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/area-perimeter-formulas")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "line-plot-fractions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/line-plot-fractions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "angles-fraction-circle": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/angles-fraction-circle")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "protractor": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/protractor")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "add-angles": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/add-angles")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "lines-angles": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/lines-angles")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "classify-triangles": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/classify-triangles")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "symmetry": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/symmetry")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "equivalent-fractions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/equivalent-fractions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "order-of-operations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/order-of-operations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "write-expressions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/write-expressions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "two-patterns-graph": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/two-patterns-graph")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "decimal-place-value": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/decimal-place-value")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "powers-of-ten": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/powers-of-ten")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "read-compare-decimals-thousandths": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/read-compare-decimals-thousandths")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "round-decimals": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/round-decimals")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiply-whole-numbers": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiply-whole-numbers")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "divide-two-digit": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/divide-two-digit")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "decimal-operations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/decimal-operations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "add-fractions-unlike": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/add-fractions-unlike")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "fraction-as-division": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/fraction-as-division")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiply-mixed-numbers": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiply-mixed-numbers")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "divide-unit-fractions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/divide-unit-fractions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "metric-conversion": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/metric-conversion")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "line-plot-operations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/line-plot-operations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "shape-hierarchy": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/shape-hierarchy")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "volume-unit-cubes": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/volume-unit-cubes")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "coordinate-plane": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/coordinate-plane")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiply-fractions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiply-fractions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "ratio-double-number-line": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/ratio-double-number-line")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "unit-rate": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/unit-rate")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "percents": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/percents")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "divide-fractions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/divide-fractions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "divide-multidigit": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/divide-multidigit")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "decimal-arithmetic": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/decimal-arithmetic")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "gcf-lcm": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/gcf-lcm")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "negative-numbers": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/negative-numbers")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "absolute-value": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/absolute-value")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "exponents": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/exponents")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "variables-expressions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/variables-expressions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "equivalent-expressions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/equivalent-expressions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "solve-one-step-equations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/solve-one-step-equations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "inequalities": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/inequalities")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "dependent-independent": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/dependent-independent")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "area-triangles": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/area-triangles")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "volume-fractional": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/volume-fractional")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "polygons-coordinate": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/polygons-coordinate")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "surface-area-nets": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/surface-area-nets")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "statistical-questions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/statistical-questions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "mean-median": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/mean-median")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "data-displays": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/data-displays")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "four-quadrant-plane": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/four-quadrant-plane")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "integer-arrows": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/integer-arrows")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "complex-unit-rates": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/complex-unit-rates")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "proportional-relationships": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/proportional-relationships")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "percent-problems": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/percent-problems")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiply-divide-integers": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiply-divide-integers")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "rational-operations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/rational-operations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "linear-expressions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/linear-expressions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multistep-rational": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multistep-rational")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "two-step-equations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/two-step-equations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "scale-drawings": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/scale-drawings")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "construct-triangles": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/construct-triangles")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "cross-sections": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/cross-sections")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "angle-relationships": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/angle-relationships")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "area-volume-surface": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/area-volume-surface")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "sampling": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/sampling")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-populations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-populations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "probability-basics": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/probability-basics")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "probability-models": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/probability-models")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compound-events": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compound-events")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "circle-pi": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/circle-pi")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "slope-explorer": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/slope-explorer")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "rational-irrational": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/rational-irrational")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "approximate-irrationals": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/approximate-irrationals")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "integer-exponents": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/integer-exponents")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "roots": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/roots")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "scientific-notation": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/scientific-notation")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "slope-unit-rate": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/slope-unit-rate")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "linear-equations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/linear-equations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "systems-of-equations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/systems-of-equations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "functions-intro": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/functions-intro")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "construct-linear-function": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/construct-linear-function")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "graph-stories": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/graph-stories")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "transformations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/transformations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "congruence": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/congruence")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "similarity": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/similarity")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "triangle-angles": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/triangle-angles")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "pythagorean-theorem": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/pythagorean-theorem")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "distance-formula": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/distance-formula")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "volume-3d": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/volume-3d")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "scatter-plots": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/scatter-plots")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "line-of-best-fit": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/line-of-best-fit")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "two-way-tables": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/two-way-tables")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "rational-exponents": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/rational-exponents")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "real-number-closure": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/real-number-closure")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "units-quantities": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/units-quantities")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "complex-numbers": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/complex-numbers")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "complex-conjugates": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/complex-conjugates")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "complex-plane": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/complex-plane")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "complex-solutions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/complex-solutions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "vectors": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/vectors")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "vector-operations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/vector-operations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "matrices": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/matrices")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "matrix-algebra": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/matrix-algebra")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "matrix-transformations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/matrix-transformations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "interpret-expressions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/interpret-expressions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "rewrite-expressions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/rewrite-expressions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "geometric-series": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/geometric-series")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "polynomial-operations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/polynomial-operations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "remainder-theorem": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/remainder-theorem")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "polynomial-identities": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/polynomial-identities")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "rational-expressions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/rational-expressions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "create-equations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/create-equations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "constraints-formulas": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/constraints-formulas")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "solve-equations-steps": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/solve-equations-steps")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "rational-radical-equations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/rational-radical-equations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "solve-quadratics": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/solve-quadratics")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "systems-elimination": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/systems-elimination")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "linear-quadratic-systems": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/linear-quadratic-systems")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "matrix-equations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/matrix-equations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "graphs-and-solutions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/graphs-and-solutions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "graph-inequalities": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/graph-inequalities")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "function-notation": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/function-notation")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "interpret-function-graphs": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/interpret-function-graphs")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-functions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-functions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "build-functions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/build-functions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "inverse-functions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/inverse-functions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "construct-linear-exponential": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/construct-linear-exponential")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "logarithms": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/logarithms")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "special-angle-values": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/special-angle-values")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "trig-symmetry": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/trig-symmetry")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "periodic-models": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/periodic-models")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "inverse-trig": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/inverse-trig")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "trig-identities": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/trig-identities")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "precise-definitions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/precise-definitions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "transformations-as-functions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/transformations-as-functions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "figure-symmetry": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/figure-symmetry")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "congruence-criteria": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/congruence-criteria")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "prove-angle-theorems": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/prove-angle-theorems")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "prove-triangle-theorems": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/prove-triangle-theorems")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "prove-parallelogram-theorems": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/prove-parallelogram-theorems")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "constructions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/constructions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "dilations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/dilations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "similarity-transformations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/similarity-transformations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "similarity-proofs": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/similarity-proofs")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "trig-ratios": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/trig-ratios")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "solve-right-triangles": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/solve-right-triangles")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "triangle-area-sine": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/triangle-area-sine")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "laws-sines-cosines": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/laws-sines-cosines")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "circle-angles": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/circle-angles")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "circle-constructions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/circle-constructions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "arc-length-sector": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/arc-length-sector")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "equation-of-circle": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/equation-of-circle")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "conic-sections": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/conic-sections")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "coordinate-proofs": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/coordinate-proofs")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "partition-segment": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/partition-segment")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "coordinate-perimeter-area": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/coordinate-perimeter-area")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "volume-arguments": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/volume-arguments")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "volume-formulas": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/volume-formulas")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "solids-cross-sections": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/solids-cross-sections")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "geometric-modeling": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/geometric-modeling")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "statistical-displays": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/statistical-displays")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-distributions": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-distributions")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "normal-distribution": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/normal-distribution")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "two-way-frequencies": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/two-way-frequencies")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "fit-function-residuals": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/fit-function-residuals")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "linear-model-interpretation": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/linear-model-interpretation")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "correlation": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/correlation")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "sampling-inference": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/sampling-inference")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "study-design": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/study-design")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "estimate-population": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/estimate-population")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "compare-treatments": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/compare-treatments")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "evaluate-reports": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/evaluate-reports")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "set-operations-events": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/set-operations-events")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "independence": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/independence")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "conditional-probability": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/conditional-probability")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "two-way-probability": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/two-way-probability")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "addition-rule": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/addition-rule")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "multiplication-rule": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/multiplication-rule")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "permutations-combinations": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/permutations-combinations")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "random-variables": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/random-variables")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "expected-value": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/expected-value")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "decisions-probability": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/decisions-probability")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "quadratic-vertex-form": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/quadratic-vertex-form")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "exponential-vs-linear": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/exponential-vs-linear")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  ),
  "unit-circle": dynamic<CcssLessonHostProps>(() =>
    Promise.all([
      import("@/components/lesson/ccss/CcssLessonAdapter"),
      import("@/components/lesson/ccss/lessons/unit-circle")
    ]).then(([adapter, lesson]) => adapter.createCcssLesson(lesson.default))
  )
} satisfies Record<CcssTextbookLessonId, ComponentType<CcssLessonHostProps>>;

export function getCcssLessonComponent(slug: string): ComponentType<CcssLessonHostProps> | null {
  return slug in ccssLessonRoutes ? ccssLessonRoutes[slug as CcssTextbookLessonId] : null;
}
