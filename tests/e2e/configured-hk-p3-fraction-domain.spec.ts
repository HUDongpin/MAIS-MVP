import { expect, test, type Locator } from "@playwright/test";

import {
  buildVisualizationLabHref,
  visualizationLabSectionSelector,
} from "../../components/visualizations/visualizationDiagnostics";
import { getVisualizationLabByLabId } from "../../data/visualizationLabs";
import {
  closeLearnerStartSetupIfVisible,
  collectPageErrors,
  expectNoPageErrors,
} from "./helpers";
import {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
} from "./hk-visualization-collision-scanner";
import { scanHkVisualizationTextContrast } from "./hk-visualization-text-contrast-scanner";

const labId = "p3-fractions-intro";
const lab = getVisualizationLabByLabId(labId);

if (!lab || lab.curriculumTrack !== "HK" || lab.templateId !== "fraction-bar") {
  throw new TypeError(
    `${labId}: exact HK fraction-bar catalog contract is missing.`,
  );
}

async function settle(locator: Locator) {
  await locator.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function setRangeValue(range: Locator, value: number) {
  await range.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    );
    descriptor?.set?.call(input, String(nextValue));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function exactFractionState(section: Locator) {
  const model = section.locator("[data-viz-configured-model]");
  const stateOwner = section.locator("[data-viz-configured-state]");
  await expect(model, "configured model owner must be unique").toHaveCount(1);
  await expect(model).toHaveAttribute(
    "data-viz-configured-model",
    "fraction-bar",
  );
  await expect(stateOwner, "configured state owner must be unique").toHaveCount(
    1,
  );
  const serialized = await stateOwner.getAttribute("data-viz-configured-state");
  if (!serialized)
    throw new TypeError("configured fraction host has no serialized state");
  return JSON.parse(serialized) as {
    denominator: number;
    eqDen: number;
    eqNum: number;
    mode: number;
    numerator: number;
    resultDenominator: number;
    resultNumerator: number;
    topic: string;
    value: number;
  };
}

async function expectFractionMarks(
  section: Locator,
  expected: readonly [number, number, number, number],
) {
  const [numerator, denominator, equivalentNumerator, equivalentDenominator] =
    expected;
  const whole = section.locator('[data-viz-mark][data-viz-name="whole bar"]');
  const equivalent = section.locator(
    '[data-viz-mark][data-viz-name="equivalent bar"]',
  );
  await expect(whole, "whole fraction mark must be unique").toHaveCount(1);
  await expect(
    equivalent,
    "equivalent fraction mark must be unique",
  ).toHaveCount(1);
  await expect(whole).toHaveAttribute("data-viz-numerator", String(numerator));
  await expect(whole).toHaveAttribute(
    "data-viz-denominator",
    String(denominator),
  );
  await expect(equivalent).toHaveAttribute(
    "data-viz-numerator",
    String(equivalentNumerator),
  );
  await expect(equivalent).toHaveAttribute(
    "data-viz-denominator",
    String(equivalentDenominator),
  );
}

async function auditFractionVisualState(section: Locator, phase: string) {
  const collision = await scanHkVisualizationCollisions(section, phase);
  expect(
    collision.truncated,
    `${phase}: collision evidence must not truncate`,
  ).toBe(false);
  expect(collision.issues, `${phase}: collision scan must be empty`).toEqual(
    [],
  );
  expect(
    collision.overlapExemptions.filter(
      ({ risk }) => risk !== "explicit-narrow-pair",
    ),
    `${phase}: every visible overlap exemption must be a narrow reasoned pair`,
  ).toEqual([]);

  const contrast = await section.evaluate(scanHkVisualizationTextContrast, {
    authoringSelector:
      "[data-viz-authoring-only], [data-viz-manim-authoring-dock]",
  });
  expect(
    contrast.checkedTextCount,
    `${phase}: contrast scan must inspect visible text`,
  ).toBeGreaterThan(0);
  expect(
    contrast.worst,
    `${phase}: contrast scan must produce numeric evidence`,
  ).not.toBeNull();
  expect(contrast.issues, `${phase}: contrast scan must be empty`).toEqual([]);
}

test("HK P3 fraction domain keeps raw controls, derived bars, modes, and reset exact", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const pageErrors = collectPageErrors(page);
  await installHkVisualizationEffectiveVisibilityInspector(page);
  await page.goto(buildVisualizationLabHref(lab), {
    waitUntil: "domcontentloaded",
  });
  await closeLearnerStartSetupIfVisible(page);

  const activeRoots = page.locator(
    `[data-viz-active-lab-id=${JSON.stringify(labId)}]`,
  );
  await expect(activeRoots).toHaveCount(1);
  await expect(activeRoots).toBeVisible();

  const section = page.locator(visualizationLabSectionSelector(lab));
  await expect(section).toBeVisible({ timeout: 30_000 });
  const domain = section.locator(
    '[data-viz-semantic-control-family="fraction-equivalence"][data-viz-semantic-control-variant="p3-fractions-intro"]',
  );
  await expect(domain).toHaveCount(1);
  await expect(domain).toHaveAttribute(
    "data-viz-range-domain-id",
    "fraction-bar-numerator-v1",
  );
  await expect(domain).toHaveAttribute("data-viz-range-domain-version", "1");
  await expect(domain).toHaveAttribute(
    "data-viz-range-domain-kind",
    "projected",
  );
  await expect(domain).toHaveAttribute(
    "data-viz-range-domain-controller-inputs",
    "value",
  );
  await expect(domain).toHaveAttribute(
    "data-viz-range-domain-affected-controls",
    "comparison",
  );

  const denominatorMinusOne = domain.locator(
    'input[type="range"][data-viz-parameter="value"]',
  );
  const numerator = domain.locator(
    'input[type="range"][data-viz-parameter="comparison"]',
  );
  await expect(denominatorMinusOne).toHaveCount(1);
  await expect(numerator).toHaveCount(1);
  await expect(denominatorMinusOne).toHaveAttribute("min", "1");
  await expect(denominatorMinusOne).toHaveAttribute("max", "9");
  await expect(denominatorMinusOne).toHaveAttribute("step", "1");
  await expect(denominatorMinusOne).toHaveAttribute(
    "data-viz-range-affects",
    "comparison",
  );
  await expect(denominatorMinusOne).toHaveAttribute(
    "data-viz-range-projection",
    "clamp-max",
  );
  await expect(denominatorMinusOne).toHaveAttribute(
    "data-viz-range-projection-reason",
    "numerator-cannot-exceed-denominator",
  );
  await expect(numerator).toHaveAttribute("min", "0");
  await expect(numerator).toHaveAttribute("step", "1");

  const boundaries = [
    { rawDenominator: 1, rawNumerator: 0, semantic: [0, 2, 0, 4] },
    { rawDenominator: 1, rawNumerator: 1, semantic: [1, 2, 2, 4] },
    { rawDenominator: 1, rawNumerator: 2, semantic: [2, 2, 4, 4] },
    { rawDenominator: 5, rawNumerator: 0, semantic: [0, 6, 0, 12] },
    { rawDenominator: 5, rawNumerator: 3, semantic: [3, 6, 6, 12] },
    { rawDenominator: 5, rawNumerator: 6, semantic: [6, 6, 12, 12] },
    { rawDenominator: 9, rawNumerator: 0, semantic: [0, 10, 0, 20] },
    { rawDenominator: 9, rawNumerator: 5, semantic: [5, 10, 10, 20] },
    { rawDenominator: 9, rawNumerator: 10, semantic: [10, 10, 20, 20] },
  ] as const;

  for (const mode of [0, 1, 2]) {
    const modeButton = section.locator(
      `[data-viz-mode-button][data-viz-mode="${mode}"]`,
    );
    await expect(modeButton).toBeVisible();
    await modeButton.click();
    await expect(denominatorMinusOne).toBeEnabled();
    await expect(numerator).toBeEnabled();

    for (const boundary of boundaries) {
      await setRangeValue(denominatorMinusOne, boundary.rawDenominator);
      await settle(section);
      await expect(numerator).toHaveAttribute(
        "max",
        String(boundary.rawDenominator + 1),
      );
      await setRangeValue(numerator, boundary.rawNumerator);
      await settle(section);
      await expect(denominatorMinusOne).toHaveValue(
        String(boundary.rawDenominator),
      );
      await expect(numerator).toHaveValue(String(boundary.rawNumerator));
      const state = await exactFractionState(section);
      expect([
        state.numerator,
        state.denominator,
        state.resultNumerator,
        state.resultDenominator,
      ]).toEqual(boundary.semantic);
      expect(state.eqNum).toBe(boundary.semantic[2]);
      expect(state.eqDen).toBe(boundary.semantic[3]);
      expect(state.mode).toBe(mode);
      expect(state.topic).toBe(labId);
      expect(
        Object.values(state).some(
          (value) => typeof value === "number" && !Number.isFinite(value),
        ),
      ).toBe(false);
      await expectFractionMarks(section, boundary.semantic);
      const fractionModeState = section.locator(
        `[data-viz-fraction-display-mode=${JSON.stringify(["fraction", "equivalent", "compare"][mode])}]`,
      );
      await expect(fractionModeState).toHaveCount(1);
      await expect(fractionModeState).toBeVisible();
      await auditFractionVisualState(
        section,
        `mode-${mode}-d${boundary.rawDenominator + 1}-n${boundary.rawNumerator}`,
      );
    }
  }

  // A numerator hidden by a smaller denominator is removed from React state,
  // not merely painted as a clamp that can resurrect later.
  await setRangeValue(denominatorMinusOne, 8);
  await setRangeValue(numerator, 9);
  await settle(section);
  await setRangeValue(denominatorMinusOne, 1);
  await settle(section);
  await expect(numerator).toHaveValue("2");
  await setRangeValue(denominatorMinusOne, 9);
  await settle(section);
  await expect(numerator).toHaveValue("2");

  const reset = section.locator(
    '[data-viz-reset-module-id="configured-visualization-lab"][data-viz-reset-topic-id="p3-fractions-intro"]',
  );
  await expect(reset).toHaveCount(1);
  await reset.click();
  await settle(section);
  await expect(denominatorMinusOne).toHaveValue("5");
  await expect(numerator).toHaveValue("4");
  await expect(numerator).toHaveAttribute("max", "6");
  const resetState = await exactFractionState(section);
  expect([
    resetState.numerator,
    resetState.denominator,
    resetState.resultNumerator,
    resetState.resultDenominator,
    resetState.mode,
  ]).toEqual([4, 6, 8, 12, 0]);
  await expectFractionMarks(section, [4, 6, 8, 12]);
  await auditFractionVisualState(section, "reset");
  expectNoPageErrors(pageErrors);
});
