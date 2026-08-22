import { expect, test, type Locator } from "@playwright/test";
import { buildVisualizationLabHref } from "../../components/visualizations/visualizationDiagnostics";
import { HK_VISUALIZATION_LESSON_CONTRACTS } from "../../components/visualizations/hk/hkVisualizationLessonContracts";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import {
  collectPageErrors,
  expectNoPageErrors,
  loginAsDemoStudentApi,
} from "./helpers";

const labId = "p3-fractions-intro" as const;
const contract = HK_VISUALIZATION_LESSON_CONTRACTS[labId];

type FractionState = Readonly<{
  denominator: number;
  equivalentDenominator: number;
  equivalentNumerator: number;
  numerator: number;
  value: number;
}>;

test.describe("HK P3 shared fraction-bar endpoint contract", () => {
  test("p3-fractions-intro exposes 0..d inclusive numerator endpoints and atomically clamps without stale resurrection", async ({
    page,
  }) => {
    test.slow();
    test.setTimeout(90_000);
    const pageErrors = collectPageErrors(page);
    const catalogMatches = visualizationLabCatalog.filter(
      (candidate) => candidate.labId === labId,
    );

    expect(
      catalogMatches,
      `${labId} must resolve to one production catalog lab.`,
    ).toHaveLength(1);
    const lab = catalogMatches[0];
    expect(lab).toMatchObject({
      curriculumTrack: "HK",
      labId,
      moduleId: contract.moduleId,
      templateId: "fraction-bar",
      topicId: contract.topicId,
    });
    expect(contract.rangeDomainId).toBe("fraction-bar-numerator-v1");

    await loginAsDemoStudentApi(page);
    const response = await page.goto(buildVisualizationLabHref(lab, "HK"), {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok(), `${labId} production route must return 2xx.`).toBe(
      true,
    );

    const activeRoot = page.locator(contract.selectors.workspace);
    await expect(
      activeRoot,
      "exact active-lab owner must be unique",
    ).toHaveCount(1);
    await expect(activeRoot).toBeVisible({ timeout: 45_000 });

    const model = page.locator(contract.selectors.model);
    const state = page.locator(contract.selectors.state);
    const denominatorControl = page.locator(contract.selectors.controls[0]);
    const numeratorControl = page.locator(contract.selectors.controls[1]);
    const reset = page.locator(contract.selectors.reset);

    await expect(model, "configured fraction model must be unique").toHaveCount(
      1,
    );
    await expect(model).toBeVisible({ timeout: 20_000 });
    await expect(model).toHaveAttribute(
      "data-viz-configured-model",
      "fraction-bar",
    );
    await expect(model).toHaveAttribute(
      "data-viz-range-domain-id",
      "fraction-bar-numerator-v1",
    );
    await expect(
      state,
      "serialized configured state must be unique",
    ).toHaveCount(1);
    await expect(state).toBeVisible();

    for (const [label, control] of [
      ["denominator", denominatorControl],
      ["numerator", numeratorControl],
    ] as const) {
      await expect(control, `${label} range must be unique`).toHaveCount(1);
      await expect(control).toHaveAttribute("type", "range");
      await expect(control).toBeVisible();
      await expect(control).toBeEnabled();
    }
    await expect(denominatorControl).toHaveAttribute(
      "data-viz-parameter",
      "value",
    );
    await expect(numeratorControl).toHaveAttribute(
      "data-viz-parameter",
      "comparison",
    );

    await expect(reset, "topic-scoped reset must be unique").toHaveCount(1);
    await expect(reset).toBeVisible();
    await expect(reset).toHaveAttribute(
      "data-viz-reset-module-id",
      contract.moduleId,
    );
    await expect(reset).toHaveAttribute(
      "data-viz-reset-topic-id",
      contract.topicId,
    );

    await moveRangeToEnd(denominatorControl);
    await expectFractionState(state, {
      denominator: 10,
      equivalentDenominator: 20,
      equivalentNumerator: 8,
      numerator: 4,
      value: 0.4,
    });
    await expect(numeratorControl).toHaveAttribute("min", "0");
    await expect(numeratorControl).toHaveAttribute("max", "10");

    await moveRangeToHome(numeratorControl);
    await expectFractionState(state, {
      denominator: 10,
      equivalentDenominator: 20,
      equivalentNumerator: 0,
      numerator: 0,
      value: 0,
    });
    await expectFractionMarks(model, {
      denominator: 10,
      equivalentDenominator: 20,
      equivalentNumerator: 0,
      numerator: 0,
      value: "0",
    });
    await expect(model).toContainText(/0\s*\/\s*10\s*=\s*0\s*\/\s*20/);

    await moveRangeToEnd(numeratorControl);
    await expectFractionState(state, {
      denominator: 10,
      equivalentDenominator: 20,
      equivalentNumerator: 20,
      numerator: 10,
      value: 1,
    });
    await expect(numeratorControl).toHaveValue("10");
    await expectFractionMarks(model, {
      denominator: 10,
      equivalentDenominator: 20,
      equivalentNumerator: 20,
      numerator: 10,
      value: "1",
    });
    await expect(model).toContainText(/10\s*\/\s*10\s*=\s*20\s*\/\s*20/);

    const rawDenominatorAtTen = finiteInputValue(
      await denominatorControl.inputValue(),
      "denominator control at d=10",
    );
    await setRangeValue(denominatorControl, rawDenominatorAtTen - 4);
    await expectFractionState(state, {
      denominator: 6,
      equivalentDenominator: 12,
      equivalentNumerator: 12,
      numerator: 6,
      value: 1,
    });
    await expect(numeratorControl).toHaveAttribute("max", "6");
    await expect(numeratorControl).toHaveValue("6");
    await expectFractionMarks(model, {
      denominator: 6,
      equivalentDenominator: 12,
      equivalentNumerator: 12,
      numerator: 6,
      value: "1",
    });

    await moveRangeToEnd(denominatorControl);
    await expectFractionState(state, {
      denominator: 10,
      equivalentDenominator: 20,
      equivalentNumerator: 12,
      numerator: 6,
      value: 0.6,
    });
    await expect(numeratorControl).toHaveAttribute("max", "10");
    await expect(
      numeratorControl,
      "raising d must not resurrect the stale raw numerator 10",
    ).toHaveValue("6");
    await expectFractionMarks(model, {
      denominator: 10,
      equivalentDenominator: 20,
      equivalentNumerator: 12,
      numerator: 6,
      value: "0.6",
    });

    await reset.click();
    await expectFractionState(state, {
      denominator: 6,
      equivalentDenominator: 12,
      equivalentNumerator: 8,
      numerator: 4,
      value: 4 / 6,
    });
    await expect(numeratorControl).toHaveAttribute("max", "6");
    await expect(numeratorControl).toHaveValue("4");
    await expect(model).toContainText(/4\s*\/\s*6\s*=\s*8\s*\/\s*12/);

    expectNoPageErrors(pageErrors);
  });
});

async function expectFractionState(state: Locator, expected: FractionState) {
  await expect
    .poll(() => readFractionState(state), {
      message: `Configured state must become ${JSON.stringify(expected)}.`,
      timeout: 8_000,
    })
    .toEqual(expected);
}

async function readFractionState(state: Locator): Promise<FractionState> {
  const raw = await state.getAttribute("data-viz-configured-state");
  if (!raw?.trim()) {
    throw new Error("data-viz-configured-state is missing or empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `data-viz-configured-state is not valid JSON: ${JSON.stringify(raw)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("data-viz-configured-state must serialize one object.");
  }

  const record = parsed as Record<string, unknown>;
  return Object.freeze({
    denominator: finiteStateNumber(record, "denominator"),
    equivalentDenominator: finiteStateNumber(record, "equivalentDenominator"),
    equivalentNumerator: finiteStateNumber(record, "equivalentNumerator"),
    numerator: finiteStateNumber(record, "numerator"),
    value: finiteStateNumber(record, "value"),
  });
}

function finiteStateNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `Configured fraction state ${key} must be a finite number; observed ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

function finiteInputValue(raw: string, label: string) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(
      `${label} must be finite; observed ${JSON.stringify(raw)}.`,
    );
  }
  return value;
}

async function moveRangeToEnd(control: Locator) {
  await control.focus();
  await control.press("End");
  const max = await control.getAttribute("max");
  if (max === null) throw new Error("Range control has no max attribute.");
  await expect(control).toHaveValue(max);
}

async function moveRangeToHome(control: Locator) {
  await control.focus();
  await control.press("Home");
  const min = await control.getAttribute("min");
  if (min === null) throw new Error("Range control has no min attribute.");
  await expect(control).toHaveValue(min);
}

async function setRangeValue(control: Locator, value: number) {
  await control.evaluate((element, requestedValue) => {
    if (!(element instanceof HTMLInputElement) || element.type !== "range") {
      throw new Error("Expected an HTML range input.");
    }
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    if (!setter) throw new Error("HTML range value setter is unavailable.");
    setter.call(element, String(requestedValue));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await expect(control).toHaveValue(String(value));
}

async function expectFractionMarks(
  model: Locator,
  expected: Readonly<{
    denominator: number;
    equivalentDenominator: number;
    equivalentNumerator: number;
    numerator: number;
    value: string;
  }>,
) {
  const whole = model.locator('[data-viz-mark][data-viz-name="whole bar"]');
  const equivalent = model.locator(
    '[data-viz-mark][data-viz-name="equivalent bar"]',
  );
  await expect(whole, "whole fraction mark must be unique").toHaveCount(1);
  await expect(
    equivalent,
    "equivalent fraction mark must be unique",
  ).toHaveCount(1);
  await expect(whole).toHaveAttribute(
    "data-viz-numerator",
    String(expected.numerator),
  );
  await expect(whole).toHaveAttribute(
    "data-viz-denominator",
    String(expected.denominator),
  );
  await expect(whole).toHaveAttribute("data-viz-value", expected.value);
  await expect(equivalent).toHaveAttribute(
    "data-viz-numerator",
    String(expected.equivalentNumerator),
  );
  await expect(equivalent).toHaveAttribute(
    "data-viz-denominator",
    String(expected.equivalentDenominator),
  );
}
