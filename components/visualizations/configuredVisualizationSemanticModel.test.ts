import assert from "node:assert/strict";
import test from "node:test";
import {
  visualizationLabCatalog,
  visualizationTemplateIds,
  type FeaturedLabDefinition
} from "../../data/visualizationLabs";
import {
  CONFIGURED_VISUALIZATION_SEMANTIC_MODEL_SOURCE,
  configuredVisualizationSemanticTemplateRepairMatrix,
  resolveConfiguredVisualizationSemanticModel
} from "./configuredVisualizationSemanticModel";
import { resolveConfiguredVisualizationCompositeStrands } from "./configuredVisualizationCompositeStrands";
import {
  configuredVisualizationSemanticControlContracts,
  configuredVisualizationSemanticControlFamilies,
  getConfiguredVisualizationSemanticControlContract
} from "./configuredVisualizationSemanticControls";
import { buildLargeWholeNumberLineState } from "./ConfiguredSemanticPrimaryMarks";

const mainlandTracks = new Set([
  "MAINLAND_PEP_PRIMARY",
  "MAINLAND_PEP_JUNIOR",
  "MAINLAND_PEP_HIGH",
  "MAINLAND_HJB",
  "MAINLAND_BNU"
]);

const mainlandLabs = visualizationLabCatalog.filter((lab) => mainlandTracks.has(lab.curriculumTrack));

function requireLab(labId: string): FeaturedLabDefinition {
  const lab = visualizationLabCatalog.find((entry) => entry.labId === labId);
  assert.ok(lab, `missing catalog lab ${labId}`);
  return lab;
}

function countBy(values: readonly string[]) {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((candidate) => candidate === value).length])
  );
}

const frozenFamilyCounts = {
  "advanced-strategy": 1,
  "algebra-tiles-polynomial": 11,
  "analytic-line-circle": 4,
  "angle-measure": 5,
  "area-perimeter": 6,
  "attribute-comparison": 1,
  "bivariate-regression": 2,
  "calendar-model": 1,
  "catalog-scope": 5,
  "categorical-data": 3,
  "circle-sector": 6,
  "clock-time": 4,
  combinatorics: 3,
  "complex-plane": 3,
  "composite-split": 32,
  "conic-sections": 4,
  "coordinate-position": 8,
  "decimal-number-line": 2,
  "decimal-place-value": 2,
  "decimal-product-area": 4,
  "derivative-rate-area": 2,
  "derivative-synthesis": 2,
  "division-remainder-array": 12,
  "equal-groups-array": 10,
  "exponential-logarithmic": 5,
  "expression-equivalence": 2,
  "factor-array": 3,
  "fraction-equivalence": 5,
  "fraction-operations": 7,
  "function-properties": 5,
  "geometric-modeling": 1,
  "inequality-solver": 3,
  "large-whole-number-line": 13,
  "line-angle-geometry": 4,
  "line-chart": 1,
  "linear-function": 3,
  "linear-system": 2,
  "mass-unit-conversion": 1,
  "measurement-estimation": 1,
  "measurement-model": 3,
  "money-model": 3,
  "multi-place-value": 5,
  "optimization-derivative": 1,
  "percent-model": 3,
  "plane-transform": 6,
  "polygon-area": 4,
  "primary-bar-chart": 9,
  "proportional-function": 1,
  "quadratic-features": 4,
  "quadratic-inequality": 2,
  "quadrilateral-geometry": 4,
  "random-variable-distribution": 1,
  "ratio-proportion": 5,
  "raw-data-summary": 4,
  "reciprocal-function": 2,
  "reflection-symmetry": 1,
  "right-triangle": 2,
  "seeded-probability-experiment": 9,
  "sequence-model": 4,
  "set-logic": 2,
  "shape-classifier": 2,
  "signed-real-number-line": 8,
  "small-whole-number-line": 8,
  "solid-projection": 11,
  "space-vector-plane": 8,
  "statistics-distribution": 5,
  "symbolic-equation": 6,
  "triangle-geometry": 7,
  "triangle-trigonometry": 2,
  "trigonometric-identity": 1,
  "trigonometric-synthesis": 1,
  "unit-circle-wave": 4,
  "vector-operations": 4,
  "volume-layers": 4
};

const frozenMappingIssueLabIds = [
  "pep-primary-p1-upper-shapes-position-time",
  "pep-primary-p2-upper-length-angles-observation",
  "pep-primary-p2-lower-place-value-measurement-data",
  "pep-primary-p3-upper-operations-fractions",
  "pep-primary-p3-upper-measurement-time-geometry",
  "pep-primary-p5-lower-volume-data",
  "pep-junior-s1-upper-geometric-figures",
  "pep-junior-s1-lower-lines-coordinates",
  "pep-junior-s3-upper-quadratics-circle-probability",
  "pep-junior-s3-lower-inverse-similarity-trigonometry",
  "pep-high-s4-sets-logic",
  "pep-high-s5-lines-circles",
  "pep-high-s6-counting",
  "pep-high-s6-exam-practice",
  "bnu-junior-s1-lower-axis-symmetry",
  "bnu-junior-s2-lower-factorization",
  "bnu-junior-s3-lower-right-triangle-trigonometry",
  "bnu-primary-p1-upper-solid-shapes",
  "bnu-primary-p1-lower-observe-objects",
  "bnu-primary-p2-upper-multiplication-facts-2-to-5",
  "bnu-primary-p3-upper-mixed-operations",
  "bnu-primary-p3-upper-observe-objects",
  "bnu-primary-p4-upper-math-play-review",
  "bnu-primary-p4-lower-observe-objects",
  "bnu-primary-p5-upper-review-activity",
  "bnu-primary-p5-lower-cuboid-introduction",
  "bnu-primary-p5-lower-cuboid-volume",
  "bnu-primary-p5-lower-review-activity",
  "bnu-primary-p6-upper-observe-objects",
  "bnu-primary-p6-upper-review-activity",
  "bnu-primary-p6-lower-final-review",
  "bnu-high-s4-数学建模活动-二",
  "bnu-high-s4-数学建模活动-一",
  "bnu-high-s4-预备知识",
  "bnu-high-s5-计数原理",
  "bnu-high-s5-直线与圆",
  "bnu-high-s6-高三数列与导数综合复习",
  "hjb-primary-p1-upper-school-math-habits",
  "hjb-primary-p1-upper-solids-introduction",
  "hjb-primary-p4-upper-large-numbers-measurement",
  "hjb-primary-p4-upper-review-integration",
  "hjb-primary-p4-lower-review-operation-properties",
  "hjb-primary-p5-lower-cuboid-cube",
  "hjb-primary-p6-lower-cuboid",
  "hjb-junior-s3-upper-acute-trigonometry",
  "hjb-high-s4-集合与逻辑",
  "hjb-high-s5-平面直角坐标系中的直线",
  "hjb-high-s6-计数原理",
  "hjb-high-s6-解析几何直线综合复习",
  "hjb-high-s6-数列与计数综合"
] as const;

test("semantic repair matrix covers all 18 configured templates and identifies the frozen A18 source", () => {
  assert.equal(
    CONFIGURED_VISUALIZATION_SEMANTIC_MODEL_SOURCE.frozenAuditSha256,
    "eabf3d1cc09bebc4cf81fe040152c92def6e031b106def1b82088e223554a3ea"
  );
  assert.equal(CONFIGURED_VISUALIZATION_SEMANTIC_MODEL_SOURCE.implementedSemanticFamilyCount, 74);
  assert.equal(CONFIGURED_VISUALIZATION_SEMANTIC_MODEL_SOURCE.exactExternalPlanLabCount, 37);
  assert.deepEqual(
    Object.keys(configuredVisualizationSemanticTemplateRepairMatrix).sort(),
    [...visualizationTemplateIds].sort()
  );
  assert.equal(Object.keys(configuredVisualizationSemanticTemplateRepairMatrix).length, 18);

  for (const templateId of visualizationTemplateIds) {
    const profile = configuredVisualizationSemanticTemplateRepairMatrix[templateId];
    assert.ok(profile.defaultFamily.length > 0, `${templateId} missing default semantic family`);
    assert.ok(profile.defaultVariant.length > 0, `${templateId} missing default semantic variant`);
    assert.ok(mainlandLabs.some((lab) => lab.templateId === templateId), `${templateId} lacks a Mainland contract sample`);
  }
});

test("resolver gives all 335 Mainland labs the canonical 74-family executable control contracts", () => {
  assert.equal(mainlandLabs.length, 335);
  assert.equal(new Set(mainlandLabs.map((lab) => lab.labId)).size, 335);

  const models = mainlandLabs.map((lab) => resolveConfiguredVisualizationSemanticModel(lab));
  assert.deepEqual(countBy(models.map((model) => model.semanticFamily)), frozenFamilyCounts);
  assert.deepEqual(
    [...new Set(models.map((model) => model.semanticFamily))].sort(),
    [...configuredVisualizationSemanticControlFamilies].sort()
  );
  assert.equal(new Set(models.map((model) => model.semanticFamily)).size, 74);
  assert.deepEqual(
    countBy(models.map((model) => model.recommendedRenderer.implementationStatus)),
    {
      "implemented-direct": 298,
      "implemented-via-external-plan": 37
    }
  );

  const familyContracts = Object.values(configuredVisualizationSemanticControlContracts);
  assert.deepEqual(countBy(familyContracts.map((contract) => String(contract.sliders.length))), {
    "0": 2,
    "2": 71,
    "3": 1
  });
  assert.deepEqual(countBy(familyContracts.map((contract) => String(contract.modes.length))), {
    "0": 48,
    "2": 14,
    "3": 7,
    "4": 4,
    "5": 1
  });

  for (const [index, model] of models.entries()) {
    const lab = mainlandLabs[index];
    const canonical = getConfiguredVisualizationSemanticControlContract(
      model.semanticFamily,
      model.variant,
      0
    );
    const strands = resolveConfiguredVisualizationCompositeStrands(lab);

    assert.equal(model.currentTemplateId, lab.templateId, lab.labId);
    assert.equal(model.source, CONFIGURED_VISUALIZATION_SEMANTIC_MODEL_SOURCE, lab.labId);
    assert.ok(model.semanticFamily.length > 0, lab.labId);
    assert.ok(model.variant.length > 0, lab.labId);
    assert.ok(model.summary.includes(model.semanticFamily), lab.labId);
    assert.ok(model.summary.includes(model.invariants[0].statement), lab.labId);
    assert.equal(model.contractId, `${model.semanticFamily}:${model.variant}`, lab.labId);
    assert.ok(model.recommendedRenderer.templateId.length > 0, lab.labId);
    assert.equal(model.recommendedRenderer.familyId, model.semanticFamily, lab.labId);
    assert.ok(canonical, `${lab.labId}: missing canonical controls`);
    assert.ok(model.controls, `${lab.labId}: model omitted canonical controls`);
    assert.deepEqual(model.controls, canonical, `${lab.labId}: controls diverged from canonical registry`);
    assert.equal(model.controls.family, model.semanticFamily, lab.labId);
    assert.ok(model.controls.sliders.length >= 0 && model.controls.sliders.length <= 3, lab.labId);
    assert.ok(model.controls.modes.length >= 0 && model.controls.modes.length <= 5, lab.labId);

    const hasExternalPlan = Boolean(model.controls.externalPlan);
    assert.equal(Boolean(strands), hasExternalPlan, `${lab.labId}: exact external-plan coverage`);
    assert.equal(
      model.recommendedRenderer.implementationStatus,
      hasExternalPlan ? "implemented-via-external-plan" : "implemented-direct",
      lab.labId
    );

    assert.equal(
      new Set(model.controls.sliders.map((slider) => slider.id)).size,
      model.controls.sliders.length,
      lab.labId
    );
    assert.equal(
      new Set(model.controls.sliders.map((slider) => slider.role)).size,
      model.controls.sliders.length,
      lab.labId
    );
    assert.ok(model.controls.sliders.every((slider) => slider.label.en && slider.label.zh && slider.label.zhHans), lab.labId);
    assert.ok(model.controls.sliders.every((slider) => Number.isFinite(slider.initial)), lab.labId);
    assert.ok(model.controls.sliders.every((slider) => slider.min <= slider.initial && slider.initial <= slider.max), lab.labId);
    assert.ok(model.controls.sliders.every((slider) => slider.step > 0), lab.labId);
    assert.equal(
      new Set(model.controls.modes.map((mode) => mode.id)).size,
      model.controls.modes.length,
      lab.labId
    );
    assert.ok(model.controls.modes.every((mode) => mode.label.en && mode.label.zh && mode.label.zhHans), lab.labId);

    assert.equal(model.invariants.length, 2, lab.labId);
    assert.ok(model.invariants.every((invariant) => invariant.statement.length > 0), lab.labId);
    assert.ok(model.invariants.every((invariant) => invariant.observableSources.includes("display:formula")), lab.labId);
    assert.ok(model.invariants.every((invariant) => invariant.observableSources.includes("mark:geometry-or-data")), lab.labId);
    for (const slider of model.controls.sliders) {
      assert.ok(
        model.invariants.every((invariant) =>
          invariant.observableSources.includes(`slider:${slider.id}:${slider.role}`)
        ),
        `${lab.labId}/${slider.role}: missing slider evidence source`
      );
    }
    for (const mode of model.controls.modes) {
      assert.ok(
        model.invariants.every((invariant) => invariant.observableSources.includes(`mode:${mode.id}`)),
        `${lab.labId}/${mode.id}: missing mode evidence source`
      );
    }
    if (model.controls.externalPlan) {
      assert.ok(
        model.invariants.every((invariant) =>
          invariant.observableSources.includes(`external-plan:${model.controls?.externalPlan?.kind}`)
        ),
        `${lab.labId}: missing external-plan evidence source`
      );
      assert.ok(
        model.invariants.every((invariant) => invariant.observableSources.includes("control:active-strand")),
        `${lab.labId}: missing active-strand evidence source`
      );
    }

    assert.equal("archetype" in model.controls, false, `${lab.labId}: obsolete archetype leaked`);
    assert.ok(
      model.controls.sliders.every((slider) => !("semanticRole" in slider) && !("observableEffect" in slider)),
      `${lab.labId}: obsolete fabricated slider metadata leaked`
    );
    assert.ok(
      model.controls.modes.every((mode) => !("semanticRole" in mode) && !("observableEffect" in mode)),
      `${lab.labId}: obsolete fabricated mode metadata leaked`
    );

    assert.deepEqual(resolveConfiguredVisualizationSemanticModel(lab), model, `${lab.labId} is not deterministic`);
  }
});

test("all 50 frozen A18 mapping issues leave the erroneous current renderer", () => {
  assert.equal(frozenMappingIssueLabIds.length, 50);
  assert.equal(new Set(frozenMappingIssueLabIds).size, 50);

  for (const labId of frozenMappingIssueLabIds) {
    const lab = requireLab(labId);
    const model = resolveConfiguredVisualizationSemanticModel(lab);

    assert.notEqual(
      model.recommendedRenderer.templateId,
      lab.templateId,
      `${labId} still recommends its frozen erroneous template ${lab.templateId}`
    );
    assert.ok(
      model.recommendedRenderer.workKind === "remap-required" ||
        model.recommendedRenderer.workKind === "split-required",
      `${labId} lacks an explicit remap/split disposition`
    );
  }
});

test("key model gaps resolve to the intended family, controls, and observable invariant", () => {
  const attributeComparison = resolveConfiguredVisualizationSemanticModel(requireLab("bnu-primary-p1-upper-comparison"));
  assert.equal(attributeComparison.semanticFamily, "attribute-comparison");
  assert.equal(attributeComparison.variant, "quantity-length-height-mass");
  assert.deepEqual(attributeComparison.controls?.sliders.map((slider) => slider.role), ["attribute-a", "attribute-b"]);
  assert.deepEqual(attributeComparison.controls?.modes.map((mode) => mode.id), ["quantity", "length", "height", "mass"]);
  assert.match(attributeComparison.invariants[0].statement, /more, fewer, or equal/u);
  const attributeComparisonLab = requireLab("bnu-primary-p1-upper-comparison");
  assert.deepEqual(attributeComparisonLab.templateConfig.formula, {
    en: "A ? B; difference = |A - B|",
    zh: "A ? B；相差 = |A - B|",
    zhHans: "A ? B；相差 = |A - B|"
  });
  assert.match(attributeComparisonLab.description.en, /more, fewer, equal, longer, shorter, taller, or heavier/u);
  assert.match(attributeComparisonLab.templateConfig.focus.zhHans ?? "", /数量、长度、高度与质量/u);

  const placeValue = resolveConfiguredVisualizationSemanticModel(requireLab("bnu-primary-p2-lower-large-numbers"));
  assert.equal(placeValue.semanticFamily, "multi-place-value");
  assert.equal(placeValue.variant, "ones-to-ten-thousands");
  assert.match(placeValue.invariants[0].statement, /10\^place/u);

  const cuboid = resolveConfiguredVisualizationSemanticModel(requireLab("bnu-primary-p5-lower-cuboid-volume"));
  assert.equal(cuboid.semanticFamily, "volume-layers");
  assert.equal(cuboid.recommendedRenderer.templateId, "volume-layers");
  assert.ok(cuboid.controls);
  assert.deepEqual(cuboid.controls.sliders.map((slider) => slider.id), ["value", "comparison", "height"]);
  assert.deepEqual(cuboid.controls.sliders.map((slider) => slider.role), ["length", "width", "height"]);
  assert.match(cuboid.invariants[0].statement, /length \* width \* height/u);

  const mixedVolume = resolveConfiguredVisualizationSemanticModel(requireLab("pep-primary-p5-lower-volume-data"));
  assert.equal(mixedVolume.semanticFamily, "composite-split");
  assert.equal(mixedVolume.variant, "volume-and-statistics");
  assert.equal(mixedVolume.recommendedRenderer.templateId, "composite-capstone");
  assert.equal(mixedVolume.controls?.externalPlan?.kind, "dynamic-strands");
  assert.equal(mixedVolume.recommendedRenderer.implementationStatus, "implemented-via-external-plan");

  const primaryArea = resolveConfiguredVisualizationSemanticModel(requireLab("bnu-primary-p3-lower-area"));
  assert.equal(primaryArea.semanticFamily, "area-perimeter");
  assert.equal(primaryArea.variant, "rectangle-boundary-and-cover");
  assert.deepEqual(primaryArea.controls?.sliders.map((slider) => slider.role), ["width", "height"]);
  assert.match(primaryArea.invariants[0].statement, /Area and perimeter.*same displayed dimensions/u);
  assert.match(primaryArea.invariants[1].statement, /covered square units/u);

  const triangle = resolveConfiguredVisualizationSemanticModel(requireLab("bnu-junior-s1-lower-triangles"));
  assert.equal(triangle.semanticFamily, "triangle-geometry");
  assert.equal(triangle.recommendedRenderer.templateId, "triangle-geometry");
  assert.match(triangle.invariants[0].statement, /180 degrees/u);

  const functions = resolveConfiguredVisualizationSemanticModel(requireLab("bnu-high-s4-函数"));
  assert.equal(functions.semanticFamily, "function-properties");
  assert.equal(functions.variant, "function-representations");
  assert.match(functions.invariants[0].statement, /Domain and range/u);

  const statistics = resolveConfiguredVisualizationSemanticModel(requireLab("bnu-high-s4-统计"));
  assert.equal(statistics.semanticFamily, "statistics-distribution");
  assert.match(statistics.invariants[1].statement, /z = \(x - mean\) \/ spread/u);

  const lineCircle = resolveConfiguredVisualizationSemanticModel(requireLab("pep-high-s5-lines-circles"));
  assert.equal(lineCircle.semanticFamily, "analytic-line-circle");
  assert.equal(lineCircle.recommendedRenderer.templateId, "analytic-geometry");
  assert.match(lineCircle.invariants[1].statement, /equation residual/u);
});

test("specialized Mainland fraction-operation topics expose only their promised operations", () => {
  const expected = {
    "bnu-primary-p5-lower-fraction-add-sub": {
      modes: ["add", "subtract"],
      variant: "fraction-add-subtract"
    },
    "bnu-primary-p5-lower-fraction-division": {
      modes: ["divide"],
      variant: "fraction-divide"
    },
    "bnu-primary-p5-lower-fraction-multiplication": {
      modes: ["multiply"],
      variant: "fraction-multiply"
    },
    "hjb-primary-p5-lower-fractions-equivalence-operations": {
      modes: ["add", "subtract"],
      variant: "fraction-add-subtract"
    }
  } as const;

  for (const [labId, contract] of Object.entries(expected)) {
    const model = resolveConfiguredVisualizationSemanticModel(requireLab(labId));
    assert.equal(model.semanticFamily, "fraction-operations", `${labId}: family`);
    assert.equal(model.variant, contract.variant, `${labId}: exact topic variant`);
    assert.deepEqual(
      model.controls?.modes.map(({ id }) => id),
      [...contract.modes],
      `${labId}: no unrelated operation mode`
    );
    assert.match(model.invariants[0].statement, /nonzero denominator|denominator.*nonzero/iu, labId);
    assert.match(model.invariants[1].statement, /exact rational/iu, labId);
  }
});

test("three-digit addition labs and large-number review expose their promised numeric domains", () => {
  for (const labId of [
    "bnu-primary-p2-lower-three-digit-add-sub",
    "bnu-primary-p3-upper-three-digit-add-sub",
    "hjb-primary-p2-lower-two-three-digit-add-sub"
  ]) {
    const model = resolveConfiguredVisualizationSemanticModel(requireLab(labId));
    assert.deepEqual(
      [model.semanticFamily, model.variant],
      ["large-whole-number-line", "whole-number-0-to-1000"],
      labId
    );
    const state = buildLargeWholeNumberLineState({
      comparison: 2,
      mode: 0,
      value: 3,
      variant: model.variant
    });
    assert.equal(state.domainMax, 1000, labId);
    assert.equal(state.formula, "300 + 200 = 500", labId);
  }

  const largeReview = resolveConfiguredVisualizationCompositeStrands(
    requireLab("pep-primary-p4-upper-large-numbers-multiplication")
  )?.[0];
  assert.ok(largeReview);
  assert.equal(largeReview.family, "large-whole-number-line");
  assert.equal(largeReview.variant, "whole-number-0-to-10000");
  const reviewState = buildLargeWholeNumberLineState({
    comparison: 2,
    mode: 0,
    value: 3,
    variant: largeReview.variant
  });
  assert.equal(reviewState.domainMax, 10_000);
  assert.equal(reviewState.formula, "3000 + 2000 = 5000");
});

test("HJB P6 linear-equation topic cannot be stolen by the inequality token in its id", () => {
  const model = resolveConfiguredVisualizationSemanticModel(
    requireLab("hjb-primary-p6-lower-linear-equations-inequalities")
  );
  assert.equal(model.semanticFamily, "symbolic-equation");
  assert.equal(model.variant, "unknown-and-balance");
});

test("exact solid curriculum ids resolve to classification, cylinder-cone, or surface-volume models", () => {
  const expected = {
    "bnu-primary-p1-upper-solid-shapes": ["solid-projection", "common-solids-classification"],
    "hjb-primary-p1-upper-solids-introduction": ["solid-projection", "common-solids-classification"],
    "bnu-primary-p6-lower-cylinders-cones": ["solid-projection", "cylinder-cone-volume"],
    "hjb-primary-p6-lower-cylinder-cone": ["solid-projection", "cylinder-cone-volume"],
    "hjb-high-s5-简单几何体": ["solid-projection", "surface-volume-solids"]
  } as const;

  for (const [labId, [family, variant]] of Object.entries(expected)) {
    const model = resolveConfiguredVisualizationSemanticModel(requireLab(labId));
    assert.equal(model.semanticFamily, family, `${labId}: family`);
    assert.equal(model.variant, variant, `${labId}: variant`);
    assert.notEqual(model.semanticFamily, "advanced-strategy", `${labId}: stale strategy model`);
    assert.notEqual(model.semanticFamily, "volume-layers", `${labId}: stale cuboid layer model`);
    assert.deepEqual(
      model.controls,
      getConfiguredVisualizationSemanticControlContract(family, variant),
      `${labId}: exact controls`
    );
  }
});

test("specialized position, similarity, and quadrilateral ids resolve to their promised geometry models", () => {
  const relativePosition = {
    "bnu-primary-p1-upper-position-order": "relative-position-grid",
    "bnu-primary-p2-lower-direction-position": "direction-distance-route",
    "bnu-primary-p4-upper-direction-position": "direction-distance-route",
    "bnu-primary-p5-lower-position": "direction-distance-route",
    "hjb-primary-p2-upper-school-position-direction": "direction-distance-route"
  } as const;

  for (const [labId, variant] of Object.entries(relativePosition)) {
    const model = resolveConfiguredVisualizationSemanticModel(requireLab(labId));
    assert.equal(model.semanticFamily, "coordinate-position", `${labId}: family`);
    assert.equal(model.variant, variant, `${labId}: relative-position variant`);
    assert.notDeepEqual(
      model.controls?.sliders.map(({ role }) => role),
      ["x-coordinate", "y-coordinate"],
      `${labId}: not a generic single-point coordinate contract`
    );
    assert.match(model.invariants[0].statement, /reference.*target/u, `${labId}: relative-position invariant`);
    assert.match(
      model.invariants[1].statement,
      variant === "direction-distance-route" ? /route distance/iu : /horizontal.*vertical/iu,
      `${labId}: variant-specific position invariant`
    );
  }

  for (const labId of [
    "bnu-junior-s3-upper-similar-figures",
    "hjb-junior-s3-upper-similar-triangles"
  ]) {
    const model = resolveConfiguredVisualizationSemanticModel(requireLab(labId));
    assert.deepEqual(
      [model.semanticFamily, model.variant],
      ["triangle-geometry", "similar-triangle-ratios"],
      labId
    );
    assert.deepEqual(model.controls?.sliders.map(({ role }) => role), ["scale-factor", "source-side"]);
    assert.match(model.invariants[0].statement, /single scale factor/iu, labId);
    assert.match(model.invariants[1].statement, /corresponding angles/iu, labId);
  }

  const quadrilaterals = {
    "bnu-primary-p4-lower-triangles-quadrilaterals": "triangle-quadrilateral-classification",
    "bnu-junior-s2-lower-parallelograms": "parallelogram-properties",
    "bnu-junior-s3-upper-special-parallelograms": "special-parallelogram-classification",
    "hjb-junior-s2-lower-quadrilaterals": "property-classification",
    "p4-angles": "quadrilateral-families-composition"
  } as const;

  for (const [labId, variant] of Object.entries(quadrilaterals)) {
    const model = resolveConfiguredVisualizationSemanticModel(requireLab(labId));
    assert.equal(model.semanticFamily, "quadrilateral-geometry", `${labId}: family`);
    assert.equal(model.variant, variant, `${labId}: quadrilateral variant`);
    assert.ok((model.controls?.modes.length ?? 0) >= 3, `${labId}: family/classification modes`);
    assert.notEqual(model.recommendedRenderer.familyId, "angle-measure", `${labId}: no generic angle rays`);
    assert.notEqual(model.recommendedRenderer.familyId, "line-angle-geometry", `${labId}: no generic transversal`);
    if (variant === "quadrilateral-families-composition") {
      assert.match(model.invariants[1].statement, /area.*two triangle/u, `${labId}: composition invariant`);
    }
  }
});

test("intersecting and parallel-line topics expose derived parallel, perpendicular, and intersection modes", () => {
  for (const labId of [
    "bnu-junior-s1-lower-intersecting-parallel-lines",
    "hjb-junior-s1-lower-intersecting-parallel-lines",
    "hjb-primary-p4-lower-vertical-parallel-lines"
  ]) {
    const model = resolveConfiguredVisualizationSemanticModel(requireLab(labId));
    assert.deepEqual([model.semanticFamily, model.variant], ["line-angle-geometry", "parallel-transversal"], labId);
    assert.deepEqual(
      model.controls?.modes.map(({ id }) => id),
      ["parallel-transversal", "perpendicular", "intersecting"],
      `${labId}: exact relation modes`
    );
    assert.match(model.invariants[0].statement, /cross product.*dot product/iu, `${labId}: vector-derived relation invariant`);
    assert.match(model.invariants[1].statement, /rendered segment.*intersection/iu, `${labId}: rendered-intersection invariant`);
  }
});

test("Hong Kong pass-through topics retain exact topic-scoped semantic variants", () => {
  const expected = {
    "advanced-functions": ["function-properties", "advanced-functions"],
    calculus: ["derivative-rate-area", "calculus"],
    "data-handling": ["statistics-distribution", "data-handling"],
    "differentiation-intro": ["derivative-rate-area", "differentiation-intro"],
    "p2-multiplication-foundations": ["equal-groups-array", "p2-multiplication-foundations"],
    "p3-fractions-intro": ["fraction-equivalence", "p3-fractions-intro"],
    "statistics-s1": ["statistics-distribution", "statistics-s1"]
  } as const;

  for (const [labId, [family, variant]] of Object.entries(expected)) {
    const model = resolveConfiguredVisualizationSemanticModel(requireLab(labId));
    assert.equal(model.semanticFamily, family, `${labId}: family`);
    assert.equal(model.variant, variant, `${labId}: topic-scoped variant`);
    assert.equal(model.contractId, `${family}:${variant}`, `${labId}: contract id`);
    assert.deepEqual(
      model.controls,
      getConfiguredVisualizationSemanticControlContract(family, variant),
      `${labId}: canonical topic controls`
    );
    assert.equal(model.recommendedRenderer.implementationStatus, "implemented-direct", labId);
  }
});

test("a split recommendation without an exact strand plan is not reported as implemented", () => {
  const source = requireLab("pep-high-s6-exam-practice");
  const unplanned = {
    ...source,
    labId: "synthetic-high-exam-practice-no-plan",
    topicId: "synthetic-high-exam-practice-no-plan",
    templateConfig: {
      ...source.templateConfig,
      variant: "synthetic-high-exam-practice-no-plan"
    }
  } satisfies FeaturedLabDefinition;

  const model = resolveConfiguredVisualizationSemanticModel(unplanned);
  assert.equal(model.semanticFamily, "composite-split");
  assert.equal(model.controls?.externalPlan?.kind, "dynamic-strands");
  assert.equal(resolveConfiguredVisualizationCompositeStrands(unplanned), null);
  assert.equal(model.recommendedRenderer.implementationStatus, "external-plan-required");
});

test("resolver is reusable outside China and does not map speed to a multiplication array", () => {
  const base = requireLab("bnu-primary-p3-lower-area");
  const speedLab = {
    ...base,
    labId: "hk-primary-p6-speed-distance-time",
    topicId: "hk-primary-p6-speed-distance-time",
    curriculumTrack: "HK",
    templateId: "array-area",
    templateConfig: {
      ...base.templateConfig,
      variant: "distance-time-speed"
    }
  } satisfies FeaturedLabDefinition;

  const model = resolveConfiguredVisualizationSemanticModel(speedLab);
  assert.equal(model.semanticFamily, "distance-time-rate");
  assert.equal(model.variant, "linked-distance-time-slope");
  assert.equal(model.recommendedRenderer.templateId, "distance-time-graph");
  assert.equal(model.recommendedRenderer.workKind, "remap-required");
  assert.equal(model.recommendedRenderer.implementationStatus, "contract-only-unverified");
  assert.equal(model.controls, null);
  assert.ok(model.invariants[0].observableSources.includes("controls:contract-only-unverified"));
  assert.match(model.invariants[1].statement, /change in distance divided by change in time/u);
});
