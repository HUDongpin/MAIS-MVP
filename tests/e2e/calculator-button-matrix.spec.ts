import { expect } from "@playwright/test";
import { calculatorDisplay, calculatorTest as test, openCalculator, selectCalculatorMode } from "./calculator-test-helpers";

test.describe("calculator button matrix", () => {
  test("basic keypad enters a decimal and completes an addition", async ({ page }) => {
    const dialog = await openCalculator(page);
    await selectCalculatorMode(dialog, "Basic");

    await dialog.getByRole("button", { name: "One", exact: true }).click();
    await dialog.getByRole("button", { name: "Two", exact: true }).click();
    await dialog.getByRole("button", { name: "Decimal point", exact: true }).click();
    await dialog.getByRole("button", { name: "Three", exact: true }).click();
    await expect(calculatorDisplay(dialog)).toHaveText("12.3");

    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await dialog.getByRole("button", { name: "Seven", exact: true }).click();
    await dialog.getByRole("button", { name: "Equals", exact: true }).click();
    await expect(calculatorDisplay(dialog)).toHaveText("19.3");
  });

  test("scientific results in exponent notation continue without confusing the e button", async ({ page }) => {
    const dialog = await openCalculator(page);
    await selectCalculatorMode(dialog, "Sci");

    await dialog.getByRole("button", { name: "Clear", exact: true }).click();
    await dialog.getByRole("button", { name: "One", exact: true }).click();
    await dialog.getByRole("button", { name: "Zero", exact: true }).click();
    await dialog.getByRole("button", { name: "Power", exact: true }).click();
    await dialog.getByRole("button", { name: "Two", exact: true }).click();
    await dialog.getByRole("button", { name: "One", exact: true }).click();
    await dialog.getByRole("button", { name: "Equals", exact: true }).click();
    await expect(calculatorDisplay(dialog)).toHaveText("1e+21");

    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await dialog.getByRole("button", { name: "One", exact: true }).click();
    await dialog.getByRole("button", { name: "Equals", exact: true }).click();
    await expect(calculatorDisplay(dialog)).toHaveText("1e+21");

    await dialog.getByRole("button", { name: "Clear", exact: true }).click();
    await dialog.getByRole("button", { name: "Two", exact: true }).click();
    await dialog.getByRole("button", { name: "Euler's number", exact: true }).click();
    await dialog.getByRole("button", { name: "Two", exact: true }).click();
    await dialog.getByRole("button", { name: "Equals", exact: true }).click();
    await expect(calculatorDisplay(dialog)).toHaveText("10.8731273138");
  });

  test("scientific chained operations retain guard digits beyond the rounded display", async ({ page }) => {
    const dialog = await openCalculator(page);
    await selectCalculatorMode(dialog, "Sci");

    await dialog.getByRole("button", { name: "Clear", exact: true }).click();
    await dialog.getByRole("button", { name: "One", exact: true }).click();
    await dialog.getByRole("button", { name: "Divide", exact: true }).click();
    await dialog.getByRole("button", { name: "Three", exact: true }).click();
    await dialog.getByRole("button", { name: "Equals", exact: true }).click();
    await dialog.getByRole("button", { name: "Multiply", exact: true }).click();
    await dialog.getByRole("button", { name: "Three", exact: true }).click();
    await dialog.getByRole("button", { name: "Equals", exact: true }).click();

    await expect(calculatorDisplay(dialog)).toHaveText("1");
  });

  test("basic chained operations retain guard digits beyond the rounded display", async ({ page }) => {
    const dialog = await openCalculator(page);
    await selectCalculatorMode(dialog, "Basic");
    const display = calculatorDisplay(dialog);

    for (const name of ["One", "Divide", "Three", "Equals"] as const) {
      await dialog.getByRole("button", { name, exact: true }).click();
    }
    await expect(display).toHaveText("0.333333333333");
    for (const name of ["Multiply", "Three", "Equals"] as const) {
      await dialog.getByRole("button", { name, exact: true }).click();
    }
    await expect(display).toHaveText("1");

    // The product intentionally formats magnitudes below 1e-12 as visible zero.
    // No later button may reveal or operate on an invisible nonzero remainder.
    await dialog.getByRole("button", { name: "Clear", exact: true }).click();
    await dialog.getByRole("button", { name: "One", exact: true }).click();
    await dialog.getByRole("button", { name: "Divide", exact: true }).click();
    await dialog.getByRole("button", { name: "One", exact: true }).click();
    for (let index = 0; index < 11; index += 1) {
      await dialog.getByRole("button", { name: "Zero", exact: true }).click();
    }
    for (const name of ["Equals", "Divide", "One", "Zero", "Zero", "Equals"] as const) {
      await dialog.getByRole("button", { name, exact: true }).click();
    }
    await expect(display).toHaveText("0");
    await dialog.getByRole("button", { name: "Square root", exact: true }).click();
    await expect(display).toHaveText("0");
  });
});
