import assert from "node:assert/strict";
import test from "node:test";
import { configuredSemanticPrimaryFamilies } from "./ConfiguredSemanticPrimaryMarks";
import { configuredSemanticSecondaryFamilies } from "./ConfiguredSemanticSecondaryMarks";
import {
  CONFIGURED_VISUALIZATION_COMPOSITE_STRANDS_SOURCE,
  configuredVisualizationCompositeLabIds,
  configuredVisualizationCompositeStrandPlans,
  resolveConfiguredVisualizationCompositeStrands
} from "./configuredVisualizationCompositeStrands";

const frozenCompositeIds = [
  "pep-primary-p1-upper-shapes-position-time",
  "pep-primary-p2-upper-length-angles-observation",
  "pep-primary-p2-lower-place-value-measurement-data",
  "pep-primary-p3-upper-operations-fractions",
  "pep-primary-p3-upper-measurement-time-geometry",
  "pep-primary-p4-upper-large-numbers-multiplication",
  "pep-primary-p5-lower-volume-data",
  "pep-junior-s1-upper-geometric-figures",
  "pep-junior-s1-lower-lines-coordinates",
  "pep-junior-s2-lower-roots-pythagorean-quadrilaterals",
  "pep-junior-s3-upper-quadratics-circle-probability",
  "pep-junior-s3-lower-inverse-similarity-trigonometry",
  "pep-high-s6-probability-statistics-synthesis",
  "pep-high-s6-exam-practice",
  "bnu-junior-s3-lower-statistics-probability",
  "bnu-primary-p1-lower-math-play-review",
  "bnu-primary-p3-upper-math-play-review",
  "bnu-primary-p3-lower-math-play-review",
  "bnu-primary-p4-upper-math-play-review",
  "bnu-primary-p5-upper-review-activity",
  "bnu-primary-p5-lower-review-activity",
  "bnu-primary-p6-upper-review-activity",
  "bnu-primary-p6-lower-final-review",
  "bnu-high-s4-数学建模活动-一",
  "bnu-high-s4-预备知识",
  "bnu-high-s6-高三数列与导数综合复习",
  "hjb-primary-p1-upper-school-math-habits",
  "hjb-primary-p1-lower-review",
  "hjb-primary-p3-upper-review-place-value-operations",
  "hjb-primary-p3-upper-time-measurement",
  "hjb-primary-p3-lower-math-square-review",
  "hjb-primary-p4-upper-large-numbers-measurement",
  "hjb-primary-p4-upper-review-integration",
  "hjb-primary-p4-lower-review-operation-properties",
  "hjb-primary-p6-lower-probability-statistics",
  "hjb-high-s6-概率统计综合",
  "hjb-high-s6-数列与计数综合"
] as const;

test("strand plans are pinned to the final frozen 335-lab semantic audit", () => {
  assert.equal(
    CONFIGURED_VISUALIZATION_COMPOSITE_STRANDS_SOURCE.frozenAuditSha256,
    "eabf3d1cc09bebc4cf81fe040152c92def6e031b106def1b82088e223554a3ea"
  );
  assert.equal(CONFIGURED_VISUALIZATION_COMPOSITE_STRANDS_SOURCE.compositeSplitCount, 32);
  assert.equal(CONFIGURED_VISUALIZATION_COMPOSITE_STRANDS_SOURCE.catalogScopeCount, 5);
});

test("the exact frozen 37 IDs have plans with no missing or extra entry", () => {
  assert.equal(new Set(configuredVisualizationCompositeLabIds).size, 37);
  assert.deepEqual([...configuredVisualizationCompositeLabIds], [...frozenCompositeIds]);
  assert.deepEqual(Object.keys(configuredVisualizationCompositeStrandPlans), [...frozenCompositeIds]);
});

test("every plan has one to four concrete, non-recursive, implemented child families", () => {
  const supportedFamilies = new Set<string>([
    ...configuredSemanticPrimaryFamilies,
    ...configuredSemanticSecondaryFamilies.filter((family) => family !== "composite-split" && family !== "catalog-scope")
  ]);
  for (const labId of configuredVisualizationCompositeLabIds) {
    const strands = configuredVisualizationCompositeStrandPlans[labId];
    assert.ok(strands.length >= 1 && strands.length <= 4, `${labId} must expose 1-4 strands`);
    const identities = new Set<string>();
    for (const child of strands) {
      assert.ok(supportedFamilies.has(child.family), `${labId}: unsupported ${child.family}`);
      assert.notEqual(child.family, "composite-split");
      assert.notEqual(child.family, "catalog-scope");
      assert.ok(child.variant.trim().length > 0, `${labId}: child variant is required`);
      assert.ok(child.label.en.trim().length > 0, `${labId}: en label is required`);
      assert.ok(child.label.zh.trim().length > 0, `${labId}: zh label is required`);
      assert.ok(child.label.zhHans.trim().length > 0, `${labId}: zhHans label is required`);
      const identity = `${child.family}\u0000${child.variant}`;
      assert.ok(!identities.has(identity), `${labId}: duplicate child ${identity}`);
      identities.add(identity);
    }
  }
});

test("quadratic, circle, rotation, and probability are separately reachable in the PEP S3 composite", () => {
  assert.deepEqual(
    configuredVisualizationCompositeStrandPlans["pep-junior-s3-upper-quadratics-circle-probability"].map(({ family }) => family),
    ["quadratic-features", "circle-sector", "plane-transform", "seeded-probability-experiment"]
  );
});

test("ambiguous split-topic-strands labs use exact grade-appropriate plans", () => {
  const expectedFamilies = {
    "pep-primary-p1-upper-shapes-position-time": ["shape-classifier", "solid-projection", "coordinate-position", "clock-time"],
    "pep-primary-p3-upper-operations-fractions": ["multi-place-value", "equal-groups-array", "fraction-equivalence"],
    "pep-primary-p4-upper-large-numbers-multiplication": ["large-whole-number-line", "multi-place-value", "equal-groups-array", "measurement-estimation"],
    "bnu-primary-p3-upper-math-play-review": ["expression-equivalence", "equal-groups-array", "area-perimeter", "calendar-model"],
    "bnu-primary-p3-lower-math-play-review": ["division-remainder-array", "plane-transform", "area-perimeter", "fraction-equivalence"],
    "bnu-primary-p5-lower-review-activity": ["factor-array", "polygon-area", "fraction-operations", "volume-layers"],
    "bnu-primary-p6-upper-review-activity": ["fraction-operations", "coordinate-position", "circle-sector", "percent-model"],
    "hjb-primary-p3-upper-review-place-value-operations": ["multi-place-value", "expression-equivalence", "equal-groups-array"],
    "hjb-primary-p3-upper-time-measurement": ["clock-time", "calendar-model"],
    "hjb-primary-p4-upper-large-numbers-measurement": ["large-whole-number-line", "area-perimeter", "mass-unit-conversion", "measurement-model"],
    "hjb-primary-p4-upper-review-integration": ["large-whole-number-line", "expression-equivalence", "angle-measure", "fraction-equivalence"]
  } as const;
  for (const [labId, families] of Object.entries(expectedFamilies)) {
    assert.deepEqual(
      configuredVisualizationCompositeStrandPlans[labId as keyof typeof configuredVisualizationCompositeStrandPlans].map(({ family }) => family),
      [...families],
      labId
    );
  }
});

test("strategy-or-split labs use exact lab-specific senior-secondary strands", () => {
  assert.deepEqual(
    configuredVisualizationCompositeStrandPlans["pep-high-s6-exam-practice"].map(({ family }) => family),
    ["derivative-synthesis", "analytic-line-circle", "statistics-distribution", "advanced-strategy"]
  );
  assert.deepEqual(
    configuredVisualizationCompositeStrandPlans["bnu-high-s4-数学建模活动-一"].map(({ family }) => family),
    ["linear-function", "statistics-distribution", "geometric-modeling"]
  );
});

test("catalog-scope review plans are narrow, mathematical, and age-appropriate", () => {
  const catalogScopeIds = [
    "bnu-primary-p1-lower-math-play-review",
    "bnu-primary-p6-lower-final-review",
    "bnu-high-s4-预备知识",
    "hjb-primary-p1-upper-school-math-habits",
    "hjb-primary-p4-lower-review-operation-properties"
  ] as const;
  for (const labId of catalogScopeIds) {
    const strands = configuredVisualizationCompositeStrandPlans[labId];
    assert.ok(strands.length <= 4);
    assert.ok(strands.every(({ label }) => !/all|complete|entire|全面|全部/iu.test(`${label.en} ${label.zh} ${label.zhHans}`)));
  }
  const habits = configuredVisualizationCompositeStrandPlans["hjb-primary-p1-upper-school-math-habits"];
  assert.equal(habits.length, 1);
  assert.equal(habits[0].family, "small-whole-number-line");
  assert.match(habits[0].label.en, /Count.*check/u);
  assert.match(habits[0].label.zhHans, /数一数.*检查/u);
});

test("resolver returns the ordered frozen plan and null outside the 37-lab scope", () => {
  for (const labId of configuredVisualizationCompositeLabIds) {
    assert.equal(
      resolveConfiguredVisualizationCompositeStrands({ labId }),
      configuredVisualizationCompositeStrandPlans[labId]
    );
  }
  assert.equal(resolveConfiguredVisualizationCompositeStrands({ labId: "not-a-composite-lab" }), null);
});
