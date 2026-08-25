import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildConfiguredSemanticPrimaryState,
  ConfiguredSemanticPrimaryMarks,
  configuredSemanticPrimaryControlContracts,
  configuredSemanticPrimaryFamilies,
  isConfiguredSemanticPrimaryFamily
} from "./ConfiguredSemanticPrimaryMarks";
import {
  buildConfiguredSemanticSecondaryMathState,
  ConfiguredSemanticSecondaryMarks,
  configuredSemanticSecondaryFamilies,
  supportsConfiguredSemanticSecondaryFamily
} from "./ConfiguredSemanticSecondaryMarks";
import { visualizationThemeForTheme } from "./visualizationTheme";
import {
  type ConfiguredVisualizationSemanticControlContract,
  type ConfiguredVisualizationSemanticSliderInput,
  configuredVisualizationSemanticCanonicalEndpointVectors,
  configuredVisualizationSemanticCanonicalDynamicStateVectors,
  configuredVisualizationSemanticControlContracts,
  configuredVisualizationSemanticControlFamilies,
  getConfiguredVisualizationSemanticControlContract,
  projectConfiguredVisualizationSemanticControlState
} from "./configuredVisualizationSemanticControls";

function initialSemanticInput(contract: ConfiguredVisualizationSemanticControlContract) {
  const initialByRole = Object.fromEntries(
    contract.sliders.map(({ id, initial }) => [id, initial])
  ) as Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
  return {
    comparison: initialByRole.comparison ?? 0,
    height: initialByRole.height,
    mode: contract.modes[0]?.value ?? 0,
    value: initialByRole.value ?? 0,
    variant: "learner-control-contract"
  };
}

function semanticState(
  contract: ConfiguredVisualizationSemanticControlContract,
  override: Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>> & {
    mode?: number;
  } = {}
) {
  const input = { ...initialSemanticInput(contract), ...override };
  if (isConfiguredSemanticPrimaryFamily(contract.family)) {
    return buildConfiguredSemanticPrimaryState(contract.family, input);
  }
  if (supportsConfiguredSemanticSecondaryFamily(contract.family)) {
    return buildConfiguredSemanticSecondaryMathState({ family: contract.family, ...input });
  }
  throw new TypeError(`Unsupported semantic family: ${contract.family}`);
}

function observableState(value: unknown) {
  return JSON.stringify(value, (key, entry) =>
    key === "family" || key === "variant" ? undefined : entry
  );
}

const secondaryTheme = {
  axis: "#64748b",
  axisStrong: "#334155",
  grid: "#cbd5e1",
  labelFill: "#ffffff",
  labelStroke: "#0891b2",
  labelText: "#155e75",
  neutralStroke: "#475569",
  pointStroke: "#0f172a",
  softFill: "#ecfeff",
  text: "#0f172a",
  textMuted: "#475569"
} as const;

function semanticMarkup(
  contract: ConfiguredVisualizationSemanticControlContract,
  mode: number
) {
  const input = { ...initialSemanticInput(contract), mode };
  if (isConfiguredSemanticPrimaryFamily(contract.family)) {
    return renderToStaticMarkup(createElement(ConfiguredSemanticPrimaryMarks, {
      ...input,
      accent: "#06b6d4",
      family: contract.family,
      vizTheme: visualizationThemeForTheme("light")
    }));
  }
  if (supportsConfiguredSemanticSecondaryFamily(contract.family)) {
    return renderToStaticMarkup(createElement(ConfiguredSemanticSecondaryMarks, {
      accent: "#06b6d4",
      comparison: input.comparison,
      family: contract.family,
      mode,
      value: input.value,
      variant: input.variant,
      vizTheme: secondaryTheme
    }));
  }
  throw new TypeError(`Unsupported semantic family: ${contract.family}`);
}

test("learner control contracts cover the exact 74 implemented semantic families", () => {
  const implementedFamilies = [
    ...configuredSemanticPrimaryFamilies,
    ...configuredSemanticSecondaryFamilies
  ].sort();
  const contractFamilies = [...configuredVisualizationSemanticControlFamilies].sort();

  assert.equal(new Set(implementedFamilies).size, 74);
  assert.deepEqual(contractFamilies, implementedFamilies);
  assert.deepEqual(Object.keys(configuredVisualizationSemanticControlContracts).sort(), implementedFamilies);
});

test("all 32 Primary contracts exactly mirror the executable canonical inputs and modes", () => {
  for (const family of configuredSemanticPrimaryFamilies) {
    const canonical = configuredSemanticPrimaryControlContracts[family];
    const learner = configuredVisualizationSemanticControlContracts[family];

    assert.deepEqual(
      learner.sliders.map(({ id, initial, max, min, role, step }) => ({
        id,
        initial,
        max,
        min,
        role,
        step
      })),
      canonical.numericControls.map(({ id, initial, max, min, role, step }) => ({
        id,
        initial,
        max,
        min,
        role,
        step
      })),
      `${family}: canonical numeric controls`
    );
    assert.deepEqual(
      learner.modes.map(({ id }) => id),
      canonical.modes.map(({ id }) => id),
      `${family}: canonical mode ids`
    );
  }
});

test("every directly rendered family exposes a finite, localized, role-mapped slider contract", () => {
  for (const family of configuredVisualizationSemanticControlFamilies) {
    const contract = getConfiguredVisualizationSemanticControlContract(family);
    assert.ok(contract, family);
    assert.equal(contract.family, family);
    assert.ok(contract.sliders.length <= 3, `${family}: at most three sliders`);

    if (family !== "composite-split" && family !== "catalog-scope") {
      assert.ok(contract.sliders.length > 0, `${family}: at least one operative slider`);
    }

    assert.equal(
      new Set(contract.sliders.map(({ id }) => id)).size,
      contract.sliders.length,
      `${family}: unique slider ids`
    );
    assert.equal(
      new Set(contract.sliders.map(({ role }) => role)).size,
      contract.sliders.length,
      `${family}: unique state roles`
    );

    for (const slider of contract.sliders) {
      assert.match(slider.id, /^[a-z][a-z0-9-]*$/u, `${family}/${slider.id}: stable id`);
      assert.ok(slider.label.en.trim(), `${family}/${slider.id}: English label`);
      assert.ok(slider.label.zh.trim(), `${family}/${slider.id}: Traditional Chinese label`);
      assert.ok(slider.label.zhHans?.trim(), `${family}/${slider.id}: Simplified Chinese label`);
      assert.ok(Number.isFinite(slider.min), `${family}/${slider.id}: finite min`);
      assert.ok(Number.isFinite(slider.max), `${family}/${slider.id}: finite max`);
      assert.ok(Number.isFinite(slider.initial), `${family}/${slider.id}: finite initial`);
      assert.ok(Number.isFinite(slider.step), `${family}/${slider.id}: finite step`);
      assert.ok(slider.min < slider.max, `${family}/${slider.id}: increasing bounds`);
      assert.ok(slider.initial >= slider.min, `${family}/${slider.id}: initial above min`);
      assert.ok(slider.initial <= slider.max, `${family}/${slider.id}: initial below max`);
      assert.ok(slider.step > 0, `${family}/${slider.id}: positive step`);
      assert.ok(slider.step <= slider.max - slider.min, `${family}/${slider.id}: useful step`);
      assert.ok(
        Math.abs((slider.max - slider.min) / slider.step - Math.round((slider.max - slider.min) / slider.step)) < 1e-9,
        `${family}/${slider.id}: max is reachable from min by whole steps`
      );
      assert.ok(
        Math.abs((slider.initial - slider.min) / slider.step - Math.round((slider.initial - slider.min) / slider.step)) < 1e-9,
        `${family}/${slider.id}: initial is aligned to the slider step`
      );
    }
  }

  assert.equal(getConfiguredVisualizationSemanticControlContract("not-a-family"), undefined);
});

test("only six explicit versioned dynamic domains project controls; every other family is identity", () => {
  const projectedFamilies = new Map([
    ["decimal-number-line", "directed-decimal-number-line-step"],
    ["fraction-equivalence", "proper-fraction-numerator"],
    ["large-whole-number-line", "directed-large-whole-number-line-step"],
    ["percent-model", "part-within-whole"],
    ["signed-real-number-line", "directed-signed-number-line-step"],
    ["small-whole-number-line", "directed-small-whole-number-line-step"]
  ]);

  for (const contract of Object.values(configuredVisualizationSemanticControlContracts)) {
    assert.equal(contract.stateDomain.version, 1, `${contract.family}: versioned domain`);
    if (projectedFamilies.has(contract.family)) {
      assert.equal(contract.stateDomain.kind, "projected", contract.family);
      assert.equal(contract.stateDomain.id, projectedFamilies.get(contract.family), contract.family);
      assert.ok(contract.stateDomain.affectedControlIds.length > 0, contract.family);
      assert.ok(contract.stateDomain.controllerInputs.length > 0, contract.family);
      assert.notEqual(contract.stateDomain.projection, "identity", contract.family);
    } else {
      assert.deepEqual(contract.stateDomain, {
        affectedControlIds: [],
        controllerInputs: [],
        id: "independent-controls",
        kind: "independent",
        projection: "identity",
        version: 1
      }, contract.family);
    }
  }
});

test("dynamic domain projections expose exact reachable bounds and never silently clamp an undeclared control", () => {
  const project = (
    family: keyof typeof configuredVisualizationSemanticControlContracts,
    requested: Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>,
    mode = 0
  ) => projectConfiguredVisualizationSemanticControlState(
    configuredVisualizationSemanticControlContracts[family],
    requested,
    mode
  );

  const smallAtRightEdge = project("small-whole-number-line", { comparison: 10, value: 20 }, 0);
  assert.deepEqual(smallAtRightEdge.bounds.comparison, { disabled: true, max: 0, min: 0 });
  assert.equal(smallAtRightEdge.values.comparison, 0);
  assert.deepEqual(
    project("small-whole-number-line", { comparison: 10, value: 20 }, 1).bounds.comparison,
    { disabled: false, max: 10, min: 0 }
  );

  assert.deepEqual(
    project("large-whole-number-line", { comparison: 10, value: 10 }, 0).bounds.comparison,
    { disabled: true, max: 0, min: 0 }
  );
  assert.deepEqual(
    project("signed-real-number-line", { comparison: 10, value: 10 }, 0).bounds.comparison,
    { disabled: true, max: 0, min: 0 }
  );
  assert.deepEqual(
    project("decimal-number-line", { comparison: 0.5, value: 1.9 }, 0).bounds.comparison,
    { disabled: false, max: 0.1, min: 0 }
  );

  const properHalf = project("fraction-equivalence", { comparison: 2, value: 11 });
  assert.deepEqual(properHalf.bounds.value, { disabled: true, max: 1, min: 1 });
  assert.equal(properHalf.values.value, 1);
  const properTwelfths = project("fraction-equivalence", { comparison: 12, value: 11 });
  assert.deepEqual(properTwelfths.bounds.value, { disabled: false, max: 11, min: 1 });
  assert.equal(properTwelfths.values.value, 11);

  const partWithinWhole = project("percent-model", { comparison: 1, value: 100 });
  assert.equal(partWithinWhole.values.value, 1);
  assert.deepEqual(partWithinWhole.bounds.value, { disabled: false, max: 1, min: 0 });

  const independent = project("equal-groups-array", { comparison: 10, value: 1 });
  assert.equal(independent.domain.kind, "independent");
  assert.deepEqual(independent.values, { comparison: 10, value: 1 });
});

test("canonical endpoint planners order controllers first, omit impossible corners, and retain dynamic maxima", () => {
  const endpointPairs = (
    family: keyof typeof configuredVisualizationSemanticControlContracts,
    mode = 0
  ) => configuredVisualizationSemanticCanonicalEndpointVectors(
    configuredVisualizationSemanticControlContracts[family],
    mode
  ).map((values) => [values.value, values.comparison]);

  assert.deepEqual(endpointPairs("fraction-equivalence"), [
    [1, 2],
    [1, 12],
    [11, 12]
  ]);
  assert.deepEqual(endpointPairs("small-whole-number-line", 0), [
    [0, 0],
    [0, 10],
    [20, 0]
  ]);
  assert.deepEqual(endpointPairs("small-whole-number-line", 1), [
    [0, 0],
    [20, 0],
    [20, 10]
  ]);
  assert.deepEqual(endpointPairs("equal-groups-array"), [
    [1, 1],
    [1, 10],
    [10, 1],
    [10, 10]
  ]);
});

test("every visible slider spans distinct observable states without a whole-range dead zone", () => {
  for (const contract of Object.values(configuredVisualizationSemanticControlContracts)) {
    for (const slider of contract.sliders) {
      const minimum = observableState(semanticState(contract, { [slider.id]: slider.min }));
      const maximum = observableState(semanticState(contract, { [slider.id]: slider.max }));
      assert.notEqual(minimum, maximum, `${contract.family}/${slider.id}: endpoints change the model`);
    }
  }
});

test("visible modes are localized, sequential, and produce distinct mathematics", () => {
  const requiredModeCounts = {
    "advanced-strategy": 3,
    "conic-sections": 3,
    "fraction-operations": 4,
    "plane-transform": 4
  } as const;

  for (const [family, requiredCount] of Object.entries(requiredModeCounts)) {
    assert.equal(
      getConfiguredVisualizationSemanticControlContract(family)?.modes.length,
      requiredCount,
      `${family}: exact required modes`
    );
  }

  for (const contract of Object.values(configuredVisualizationSemanticControlContracts)) {
    assert.equal(
      new Set(contract.modes.map(({ id }) => id)).size,
      contract.modes.length,
      `${contract.family}: unique mode ids`
    );
    assert.deepEqual(
      contract.modes.map(({ value }) => value),
      contract.modes.map((_, index) => index),
      `${contract.family}: mode values map directly to builder indices`
    );

    for (const mode of contract.modes) {
      assert.match(mode.id, /^[a-z][a-z0-9-]*$/u, `${contract.family}/${mode.id}: stable id`);
      assert.ok(mode.label.en.trim(), `${contract.family}/${mode.id}: English label`);
      assert.ok(mode.label.zh.trim(), `${contract.family}/${mode.id}: Traditional Chinese label`);
      assert.ok(mode.label.zhHans?.trim(), `${contract.family}/${mode.id}: Simplified Chinese label`);
    }

    const modeStates = contract.modes.map(({ value }) =>
      observableState(semanticState(contract, { mode: value }))
    );
    assert.equal(
      new Set(modeStates).size,
      modeStates.length,
      `${contract.family}: no inert or duplicate visible mode`
    );

  }
});

test("fraction-operation variants retain exact builder mode values while hiding unrelated operations", () => {
  const expected = {
    "fraction-add-subtract": [["add", 0], ["subtract", 1]],
    "fraction-divide": [["divide", 3]],
    "fraction-multiply": [["multiply", 2]]
  } as const;

  for (const [variant, modes] of Object.entries(expected)) {
    const contract = getConfiguredVisualizationSemanticControlContract("fraction-operations", variant);
    assert.ok(contract, variant);
    assert.deepEqual(
      contract.modes.map(({ id, value }) => [id, value]),
      modes,
      `${variant}: exact operation ids and canonical builder values`
    );
    assert.equal(
      new Set(contract.modes.map(({ value }) => observableState(semanticState(contract, { mode: value })))).size,
      contract.modes.length,
      `${variant}: every retained mode changes visible exact arithmetic`
    );
  }
});

test("every visible mode produces distinct server-rendered marks", () => {
  for (const contract of Object.values(configuredVisualizationSemanticControlContracts)) {
    const renderedModes = contract.modes.map(({ value }) => semanticMarkup(contract, value));
    assert.equal(
      new Set(renderedModes).size,
      renderedModes.length,
      `${contract.family}: no SSR-inert visible mode`
    );
  }
});

test("composite and catalog families declare required external plans without fabricated controls", () => {
  const composite = configuredVisualizationSemanticControlContracts["composite-split"];
  const catalog = configuredVisualizationSemanticControlContracts["catalog-scope"];

  assert.deepEqual(composite.sliders, []);
  assert.deepEqual(composite.modes, []);
  assert.equal(composite.externalPlan?.kind, "dynamic-strands");
  assert.equal(composite.externalPlan?.required, true);

  assert.deepEqual(catalog.sliders, []);
  assert.deepEqual(catalog.modes, []);
  assert.equal(catalog.externalPlan?.kind, "catalog-scope");
  assert.equal(catalog.externalPlan?.required, true);

  for (const contract of Object.values(configuredVisualizationSemanticControlContracts)) {
    if (contract.family !== "composite-split" && contract.family !== "catalog-scope") {
      assert.equal(contract.externalPlan, null, `${contract.family}: directly rendered`);
    }
    if (contract.externalPlan) {
      assert.ok(contract.externalPlan.label.en.trim());
      assert.ok(contract.externalPlan.label.zh.trim());
      assert.ok(contract.externalPlan.label.zhHans?.trim());
    }
  }
});

test("solid projection exposes a mode switch only for the audited solid-nets variant", () => {
  const ordinary = getConfiguredVisualizationSemanticControlContract(
    "solid-projection",
    "linked-solid-views"
  );
  const solidNets = getConfiguredVisualizationSemanticControlContract(
    "solid-projection",
    "solid-nets-and-views"
  );

  assert.deepEqual(ordinary?.modes, []);
  assert.deepEqual(solidNets?.modes.map(({ id, value }) => ({ id, value })), [
    { id: "views", value: 0 },
    { id: "net", value: 1 }
  ]);
  assert.notEqual(solidNets, ordinary);
  const input = {
    ...initialSemanticInput(solidNets!),
    family: "solid-projection" as const,
    variant: "solid-nets-and-views"
  };
  assert.notEqual(
    observableState(buildConfiguredSemanticSecondaryMathState({ ...input, mode: 0 })),
    observableState(buildConfiguredSemanticSecondaryMathState({ ...input, mode: 1 }))
  );
});

test("exact place-value and solid variants expose topic-scoped controls rather than base-template controls", () => {
  const tensOnes = getConfiguredVisualizationSemanticControlContract(
    "multi-place-value",
    "tens-ones"
  );
  assert.deepEqual(
    tensOnes?.sliders.map(({ id, initial, max, min, role }) => ({ id, initial, max, min, role })),
    [
      { id: "value", initial: 42, max: 99, min: 0, role: "number-a" },
      { id: "comparison", initial: 37, max: 99, min: 0, role: "number-b" }
    ]
  );
  assert.equal(
    getConfiguredVisualizationSemanticControlContract(
      "multi-place-value",
      "ones-to-ten-thousands"
    )?.sliders[0].max,
    99_999
  );

  const common = getConfiguredVisualizationSemanticControlContract(
    "solid-projection",
    "common-solids-classification"
  );
  assert.deepEqual(common?.modes.map(({ id }) => id), ["cube", "cuboid", "cylinder", "cone", "sphere"]);
  assert.deepEqual(common?.sliders.map(({ role }) => role), ["solid-size", "feature-focus"]);

  const cylinderCone = getConfiguredVisualizationSemanticControlContract(
    "solid-projection",
    "cylinder-cone-volume"
  );
  assert.deepEqual(cylinderCone?.modes.map(({ id }) => id), ["cylinder", "cone"]);
  assert.deepEqual(cylinderCone?.sliders.map(({ role }) => role), ["radius", "height"]);
  assert.deepEqual(cylinderCone?.sliders.map(({ initial }) => initial), [3, 5]);

  const surfaceVolume = getConfiguredVisualizationSemanticControlContract(
    "solid-projection",
    "surface-volume-solids"
  );
  assert.deepEqual(
    surfaceVolume?.modes.map(({ id }) => id),
    ["prism", "pyramid", "cylinder", "cone", "sphere"]
  );
  for (const activeMode of [0, 1, 2, 3, 4]) {
    const active = getConfiguredVisualizationSemanticControlContract(
      "solid-projection",
      "surface-volume-solids",
      activeMode
    );
    assert.equal(active?.sliders.length, 2);
    assert.deepEqual(active?.sliders.map(({ id }) => id), ["value", "comparison"]);
    assert.equal(active?.sliders[0].role, activeMode < 2 ? "base-side" : "radius");
    assert.equal(active?.sliders[1].role, activeMode === 4 ? "cross-section-level" : "height");
  }
});

test("every exact solid mode and every visible control changes stripped SSR mathematics", () => {
  const variants = [
    "common-solids-classification",
    "cylinder-cone-volume",
    "surface-volume-solids"
  ] as const;
  const stripEvidence = (markup: string) => markup
    .replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/gu, "")
    .replace(/\sdata-viz-[\w-]+="[^"]*"/gu, "")
    .replace(/<!--\s*-->/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  const render = (
    variant: (typeof variants)[number],
    mode: number,
    values: Record<"comparison" | "value", number>
  ) => stripEvidence(renderToStaticMarkup(createElement(
    "svg",
    { viewBox: "0 0 640 360" },
    createElement(ConfiguredSemanticSecondaryMarks, {
      accent: "#06b6d4",
      ...values,
      family: "solid-projection",
      mode,
      variant,
      vizTheme: secondaryTheme
    })
  )));

  for (const variant of variants) {
    const base = getConfiguredVisualizationSemanticControlContract("solid-projection", variant);
    assert.ok(base, variant);
    const modeSignatures: string[] = [];
    for (const declaredMode of base.modes) {
      const contract = getConfiguredVisualizationSemanticControlContract(
        "solid-projection",
        variant,
        declaredMode.value
      );
      assert.ok(contract, `${variant}/${declaredMode.id}`);
      const values = Object.fromEntries(
        contract.sliders.map(({ id, initial }) => [id, initial])
      ) as Record<"comparison" | "value", number>;
      modeSignatures.push(render(variant, declaredMode.value, values));

      for (const slider of contract.sliders) {
        assert.notEqual(
          render(variant, declaredMode.value, { ...values, [slider.id]: slider.min }),
          render(variant, declaredMode.value, { ...values, [slider.id]: slider.max }),
          `${variant}/${declaredMode.id}/${slider.role}: visible endpoints`
        );
      }
    }
    assert.equal(
      new Set(modeSignatures).size,
      base.modes.length,
      `${variant}: every mode visibly differs`
    );
  }
});

test("exact relative-position, similarity, and quadrilateral variants expose topic-scoped controls", () => {
  const lineRelations = getConfiguredVisualizationSemanticControlContract(
    "line-angle-geometry",
    "parallel-transversal"
  );
  assert.deepEqual(
    lineRelations?.modes.map(({ id }) => id),
    ["parallel-transversal", "perpendicular", "intersecting"]
  );

  const relative = getConfiguredVisualizationSemanticControlContract(
    "coordinate-position",
    "relative-position-grid"
  );
  assert.deepEqual(
    relative?.sliders.map(({ initial, max, min, role }) => ({ initial, max, min, role })),
    [
      { initial: 3, max: 4, min: 0, role: "target-column" },
      { initial: 1, max: 4, min: 0, role: "target-row" }
    ]
  );

  const route = getConfiguredVisualizationSemanticControlContract(
    "coordinate-position",
    "direction-distance-route"
  );
  assert.deepEqual(
    route?.sliders.map(({ initial, max, min, role }) => ({ initial, max, min, role })),
    [
      { initial: 3, max: 4, min: -4, role: "east-west-displacement" },
      { initial: 2, max: 4, min: -4, role: "north-south-displacement" }
    ]
  );

  const similarity = getConfiguredVisualizationSemanticControlContract(
    "triangle-geometry",
    "similar-triangle-ratios"
  );
  assert.deepEqual(
    similarity?.sliders.map(({ initial, max, min, role, step }) => ({ initial, max, min, role, step })),
    [
      { initial: 2, max: 3, min: 1, role: "scale-factor", step: 0.25 },
      { initial: 4, max: 6, min: 2, role: "source-side", step: 0.5 }
    ]
  );

  const expectedModes = {
    "parallelogram-properties": ["parallelogram", "rectangle", "rhombus", "square"],
    "property-classification": ["trapezoid", "parallelogram", "rectangle", "rhombus", "square"],
    "quadrilateral-families-composition": ["parallelogram", "rectangle", "rhombus", "square", "composition"],
    "special-parallelogram-classification": ["rectangle", "rhombus", "square"],
    "triangle-quadrilateral-classification": ["triangle", "quadrilateral", "parallelogram", "rectangle"]
  } as const;
  for (const [variant, modes] of Object.entries(expectedModes)) {
    const quadrilateral = getConfiguredVisualizationSemanticControlContract(
      "quadrilateral-geometry",
      variant
    );
    assert.deepEqual(quadrilateral?.modes.map(({ id }) => id), modes, variant);
    assert.deepEqual(quadrilateral?.sliders.map(({ role }) => role), ["shape-size", "orientation"], variant);
  }
});

test("every exact geometry mode and visible control changes stripped SSR mathematics", () => {
  const variants = [
    ["coordinate-position", "relative-position-grid"],
    ["coordinate-position", "direction-distance-route"],
    ["triangle-geometry", "similar-triangle-ratios"],
    ["quadrilateral-geometry", "parallelogram-properties"],
    ["quadrilateral-geometry", "property-classification"],
    ["quadrilateral-geometry", "quadrilateral-families-composition"],
    ["quadrilateral-geometry", "special-parallelogram-classification"],
    ["quadrilateral-geometry", "triangle-quadrilateral-classification"]
  ] as const;
  const stripEvidence = (markup: string) => markup
    .replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/gu, "")
    .replace(/\sdata-viz-[\w-]+="[^"]*"/gu, "")
    .replace(/<!--\s*-->/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  for (const [family, variant] of variants) {
    const base = getConfiguredVisualizationSemanticControlContract(family, variant);
    assert.ok(base, `${family}/${variant}`);
    const modes = base.modes.length ? base.modes : [{ id: "default", value: 0 }];
    const modeSignatures: string[] = [];

    for (const declaredMode of modes) {
      const contract = getConfiguredVisualizationSemanticControlContract(family, variant, declaredMode.value);
      assert.ok(contract, `${family}/${variant}/${declaredMode.id}`);
      const values = Object.fromEntries(
        contract.sliders.map(({ id, initial }) => [id, initial])
      ) as Record<"comparison" | "value", number>;
      const render = (next: Record<"comparison" | "value", number>) => stripEvidence(
        renderToStaticMarkup(createElement(
          "svg",
          { viewBox: "0 0 640 360" },
          createElement(ConfiguredSemanticSecondaryMarks, {
            accent: "#06b6d4",
            ...next,
            family,
            mode: declaredMode.value,
            variant,
            vizTheme: secondaryTheme
          })
        ))
      );
      modeSignatures.push(render(values));

      for (const slider of contract.sliders) {
        const midpoint = slider.min + Math.round((slider.max - slider.min) / slider.step / 2) * slider.step;
        const signatures = [slider.min, midpoint, slider.max].map((candidate) =>
          render({ ...values, [slider.id]: candidate })
        );
        assert.equal(
          new Set(signatures).size,
          3,
          `${family}/${variant}/${declaredMode.id}/${slider.role}: visible min/mid/max`
        );
      }
    }

    assert.equal(new Set(modeSignatures).size, modes.length, `${family}/${variant}: visible modes`);
  }
});

test("advanced strategy delegates learner sliders to its exact active child family", () => {
  const expectedChildren = [
    "vector-operations",
    "conic-sections",
    "space-vector-plane"
  ] as const;

  expectedChildren.forEach((childFamily, activeMode) => {
    const strategy = getConfiguredVisualizationSemanticControlContract(
      "advanced-strategy",
      "advanced-strategy",
      activeMode
    );
    assert.deepEqual(
      strategy?.sliders,
      configuredVisualizationSemanticControlContracts[childFamily].sliders,
      `advanced mode ${activeMode} controls ${childFamily}`
    );
    assert.equal(strategy?.family, "advanced-strategy");
    assert.deepEqual(strategy?.modes.map(({ value }) => value), [0, 1, 2]);
  });
});

test("Hong Kong pass-through variants expose topic-accurate reset controls and modes", () => {
  const multiplication = getConfiguredVisualizationSemanticControlContract(
    "equal-groups-array",
    "p2-multiplication-foundations"
  );
  assert.deepEqual(
    multiplication?.sliders.map(({ id, initial, role }) => ({ id, initial, role })),
    [
      { id: "value", initial: 4, role: "rows" },
      { id: "comparison", initial: 5, role: "columns" }
    ]
  );

  const fractions = getConfiguredVisualizationSemanticControlContract(
    "fraction-equivalence",
    "p3-fractions-intro"
  );
  assert.deepEqual(fractions?.modes.map(({ id, value }) => ({ id, value })), [
    { id: "fraction", value: 0 },
    { id: "equivalent", value: 1 },
    { id: "compare", value: 2 }
  ]);
  assert.deepEqual(
    fractions?.sliders.map(({ id, initial, max, min, role, step }) => ({ id, initial, max, min, role, step })),
    [
      { id: "value", initial: 5, max: 9, min: 1, role: "denominator-minus-one", step: 1 },
      { id: "comparison", initial: 4, max: 10, min: 0, role: "numerator", step: 1 }
    ]
  );
  assert.deepEqual(fractions?.stateDomain, {
    affectedControlIds: ["comparison"],
    controllerInputs: ["value"],
    id: "fraction-bar-numerator-v1",
    kind: "projected",
    projection: "comparison<=value+1",
    version: 1
  });
  assert.deepEqual(
    projectConfiguredVisualizationSemanticControlState(
      fractions!,
      { comparison: 9, value: 1 },
      0
    ),
    {
      bounds: {
        comparison: { disabled: false, max: 2, min: 0 },
        value: { disabled: false, max: 9, min: 1 }
      },
      domain: fractions?.stateDomain,
      values: { comparison: 2, value: 1 }
    }
  );
  assert.deepEqual(
    configuredVisualizationSemanticCanonicalDynamicStateVectors(fractions!, 0),
    [
      { comparison: 0, value: 1 },
      { comparison: 1, value: 1 },
      { comparison: 2, value: 1 },
      { comparison: 0, value: 5 },
      { comparison: 3, value: 5 },
      { comparison: 6, value: 5 },
      { comparison: 0, value: 9 },
      { comparison: 5, value: 9 },
      { comparison: 10, value: 9 }
    ]
  );

  for (const variant of ["statistics-s1", "data-handling"]) {
    const statistics = getConfiguredVisualizationSemanticControlContract(
      "statistics-distribution",
      variant
    );
    assert.deepEqual(statistics?.modes, []);
    assert.deepEqual(
      statistics?.sliders.map(({ id, initial, max, min, role }) => ({ id, initial, max, min, role })),
      [
        { id: "value", initial: 5, max: 10, min: 0, role: "mean" },
        { id: "comparison", initial: 2, max: 4, min: 1, role: "spread" }
      ]
    );
  }

  for (const variant of ["differentiation-intro", "calculus"]) {
    const calculus = getConfiguredVisualizationSemanticControlContract(
      "derivative-rate-area",
      variant
    );
    assert.deepEqual(
      calculus?.sliders.map(({ id, initial, max, min, role }) => ({ id, initial, max, min, role })),
      [
        { id: "value", initial: 5, max: 10, min: 0, role: "curvature" },
        { id: "comparison", initial: 4, max: 9, min: 1, role: "probe-x" }
      ]
    );
    assert.deepEqual(calculus?.modes.map(({ id, value }) => ({ id, value })), [
      { id: "tangent", value: 0 },
      { id: "secant", value: 1 },
      { id: "area", value: 2 }
    ]);
  }
});
