import { expect, type Locator } from "@playwright/test";
import { calculatorDisplay, calculatorTest as test, openCalculator, selectCalculatorMode } from "./calculator-test-helpers";

async function press(dialog: Locator, ...names: string[]) {
  for (const name of names) {
    await dialog.getByRole("button", { name, exact: true }).click();
  }
}

function statisticValue(dialog: Locator, label: string) {
  return dialog.getByText(label, { exact: true }).locator("..").locator("span").last();
}

test.describe("statistics calculator button matrix", () => {
  test("Stat exposes the complete keypad and every digit enters in order", async ({ page }) => {
    const dialog = await openCalculator(page);
    await selectCalculatorMode(dialog, "Stat");

    const names = await dialog.getByRole("button").evaluateAll((buttons) => buttons.map((button) =>
      button.getAttribute("aria-label") || (button.textContent ?? "").trim()
    ));
    expect(names).toEqual([
      "Basic", "Sci", "Stat", "1-Var", "2-Var",
      "Seven", "Eight", "Nine", "Delete last data point",
      "Four", "Five", "Six", "Plus minus",
      "One", "Two", "Three", "Backspace",
      "Zero", "Decimal point", "Clear all", "Add data point"
    ]);

    const controls = dialog.getByRole("button");
    for (let index = 0; index < await controls.count(); index += 1) {
      const control = controls.nth(index);
      await control.focus();
      await expect(control, `Statistics/shell control ${index + 1} must accept focus`).toBeFocused();
    }

    await dialog.getByRole("button", { name: "2-Var", exact: true }).click();
    await dialog.getByRole("button", { name: "1-Var", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "1-Var", exact: true })).toHaveAttribute("aria-pressed", "true");

    await press(dialog, "Nine", "Eight", "Seven", "Six", "Five", "Four", "Three", "Two", "One", "Zero");
    await expect(calculatorDisplay(dialog)).toHaveText("9876543210");
  });

  test("1-Var DATA, decimal, sign, backspace, DEL and AC update statistics", async ({ page }) => {
    const dialog = await openCalculator(page);
    await selectCalculatorMode(dialog, "Stat");

    await press(dialog, "One", "Decimal point", "Five", "Add data point");
    await press(dialog, "Two", "Plus minus", "Add data point");
    await press(dialog, "Three", "Zero", "Backspace", "Add data point");

    await expect(statisticValue(dialog, "n")).toHaveText("3");
    await expect(statisticValue(dialog, "Σx")).toHaveText("2.5");
    await expect(statisticValue(dialog, "mean x̄")).toHaveText("0.833333333333");
    await expect(statisticValue(dialog, "min–max")).toHaveText("-2–3");

    await dialog.getByRole("button", { name: "1-Var", exact: true }).click();
    await expect(statisticValue(dialog, "n"), "reselecting active 1-Var must preserve its data").toHaveText("3");

    await press(dialog, "Delete last data point");
    await expect(statisticValue(dialog, "n")).toHaveText("2");
    await press(dialog, "Clear all");
    await expect(statisticValue(dialog, "n")).toHaveText("0");
  });

  test("1-Var standard vector reports n, sum, mean, population SD, sample SD, min and max", async ({ page }) => {
    const dialog = await openCalculator(page);
    await selectCalculatorMode(dialog, "Stat");

    for (const value of ["2", "4", "4", "4", "5", "5", "7", "9"]) {
      await press(dialog, ({ "2": "Two", "4": "Four", "5": "Five", "7": "Seven", "9": "Nine" } as const)[value as "2" | "4" | "5" | "7" | "9"], "Add data point");
    }

    await expect(statisticValue(dialog, "n")).toHaveText("8");
    await expect(statisticValue(dialog, "Σx")).toHaveText("40");
    await expect(statisticValue(dialog, "mean x̄")).toHaveText("5");
    await expect(statisticValue(dialog, "σₙ")).toHaveText("2");
    await expect(statisticValue(dialog, "σₙ₋₁")).toHaveText("2.1380899353");
    await expect(statisticValue(dialog, "min–max")).toHaveText("2–9");
  });

  test("2-Var DATA produces a perfect y=1+2x regression", async ({ page }) => {
    const dialog = await openCalculator(page);
    await selectCalculatorMode(dialog, "Stat");
    await dialog.getByRole("button", { name: "2-Var", exact: true }).click();

    await press(dialog, "One", "Add data point", "Three", "Add data point");
    await press(dialog, "Two", "Add data point", "Five", "Add data point");
    await press(dialog, "Three", "Add data point", "Seven", "Add data point");

    await expect(statisticValue(dialog, "n")).toHaveText("3");
    await expect(statisticValue(dialog, "r")).toHaveText("1");
    await expect(statisticValue(dialog, "x̄")).toHaveText("2");
    await expect(statisticValue(dialog, "ȳ")).toHaveText("5");
    await expect(statisticValue(dialog, "a (intercept)")).toHaveText("1");
    await expect(statisticValue(dialog, "b (slope)")).toHaveText("2");

    await dialog.getByRole("button", { name: "2-Var", exact: true }).click();
    await expect(statisticValue(dialog, "n"), "reselecting active 2-Var must preserve its data").toHaveText("3");
  });

  test("2-Var DEL discards an unfinished point before deleting committed data", async ({ page }) => {
    const dialog = await openCalculator(page);
    await selectCalculatorMode(dialog, "Stat");
    await dialog.getByRole("button", { name: "2-Var", exact: true }).click();

    await press(dialog, "One", "Add data point", "Three", "Add data point");
    await press(dialog, "Two", "Add data point", "Nine");
    await press(dialog, "Delete last data point");

    await expect(statisticValue(dialog, "n")).toHaveText("1");
    await expect(calculatorDisplay(dialog)).toHaveText("x: 0");

    await press(dialog, "Delete last data point");
    await expect(statisticValue(dialog, "n")).toHaveText("0");
  });

  test("Stat buttons keep native Enter and Space activation", async ({ page }) => {
    const dialog = await openCalculator(page);
    await selectCalculatorMode(dialog, "Stat");

    const one = dialog.getByRole("button", { name: "One", exact: true });
    await one.focus();
    await page.keyboard.press("Enter");
    const two = dialog.getByRole("button", { name: "Two", exact: true });
    await two.focus();
    await page.keyboard.press("Space");
    await expect(calculatorDisplay(dialog)).toHaveText("12");
  });
});
