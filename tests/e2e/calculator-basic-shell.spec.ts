import { expect, type Locator, type Page } from "@playwright/test";
import {
  calculatorDisplay,
  calculatorTest as test,
  loginCalculatorStudent,
  openCalculator,
  selectCalculatorMode
} from "./calculator-test-helpers";

const BASIC_KEYS = [
  { label: "AC", name: "Clear" },
  { label: "±", name: "Plus minus" },
  { label: "%", name: "Percent" },
  { label: "÷", name: "Divide" },
  { label: "7", name: "Seven" },
  { label: "8", name: "Eight" },
  { label: "9", name: "Nine" },
  { label: "×", name: "Multiply" },
  { label: "4", name: "Four" },
  { label: "5", name: "Five" },
  { label: "6", name: "Six" },
  { label: "−", name: "Subtract" },
  { label: "1", name: "One" },
  { label: "2", name: "Two" },
  { label: "3", name: "Three" },
  { label: "+", name: "Add" },
  { label: "√", name: "Square root" },
  { label: "0", name: "Zero" },
  { label: ".", name: "Decimal point" },
  { label: "=", name: "Equals" }
] as const;

const DIGIT_KEYS = [
  { digit: "0", name: "Zero" },
  { digit: "1", name: "One" },
  { digit: "2", name: "Two" },
  { digit: "3", name: "Three" },
  { digit: "4", name: "Four" },
  { digit: "5", name: "Five" },
  { digit: "6", name: "Six" },
  { digit: "7", name: "Seven" },
  { digit: "8", name: "Eight" },
  { digit: "9", name: "Nine" }
] as const;

function basicKey(dialog: Locator, name: string) {
  return dialog.getByRole("button", { name, exact: true });
}

async function openBasicCalculator(page: Page) {
  const dialog = await openCalculator(page);
  await selectCalculatorMode(dialog, "Basic");
  await expect(dialog.getByRole("button", { name: "Basic", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(calculatorDisplay(dialog)).toHaveText("0");
  return dialog;
}

async function clickKeys(dialog: Locator, names: readonly string[]) {
  for (const name of names) await basicKey(dialog, name).click();
}

test.describe("calculator Basic mode and launcher shell", () => {
  test("Open, Close, and Basic controls expose the complete 20-key contract", async ({ page }) => {
    await loginCalculatorStudent(page);
    await page.goto("/student/assessments/assessment-s3-algebra-quiz", { waitUntil: "domcontentloaded" });

    const openButton = page.getByRole("button", { name: "Open calculator", exact: true });
    await expect(openButton).toBeVisible({ timeout: 30_000 });
    await expect(openButton).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("dialog", { name: "Calculator" })).toHaveCount(0);

    // Enter and Space are deliberately used on native buttons in this shell
    // journey so keyboard-only learners get the browser's standard semantics.
    await openButton.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Calculator" });
    await expect(dialog).toBeVisible();

    const closeButton = page.getByRole("button", { name: "Close calculator", exact: true });
    await expect(closeButton).toHaveAttribute("aria-expanded", "true");
    await selectCalculatorMode(dialog, "Basic");
    await expect(dialog.getByRole("button", { name: "Basic", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("button", { name: "Sci", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.getByRole("button", { name: "Stat", exact: true })).toHaveAttribute("aria-pressed", "false");

    const keypadButtons = dialog.locator(".grid.grid-cols-4").getByRole("button");
    const actualKeys = await keypadButtons.evaluateAll((buttons) =>
      buttons.map((button) => ({
        label: button.textContent?.trim() ?? "",
        name: button.getAttribute("aria-label") ?? ""
      }))
    );
    const expectedKeys = BASIC_KEYS.map((key) => ({ ...key }));
    const identity = (key: { label: string; name: string }) => `${key.label}\u0000${key.name}`;
    const expectedIdentities = new Set(expectedKeys.map(identity));
    const actualIdentities = new Set(actualKeys.map(identity));

    // Check both directions explicitly: every expected key exists and every
    // rendered keypad key belongs to the standard 20-key inventory.
    expect(expectedKeys.filter((key) => !actualIdentities.has(identity(key))), "missing Basic keys").toEqual([]);
    expect(actualKeys.filter((key) => !expectedIdentities.has(identity(key))), "unexpected Basic keys").toEqual([]);
    expect(actualKeys, "Basic key labels, accessible names, order, or duplicates drifted").toEqual(expectedKeys);
    await expect(keypadButtons).toHaveCount(20);

    for (let index = 0; index < BASIC_KEYS.length; index += 1) {
      const control = keypadButtons.nth(index);
      await control.focus();
      await expect(control, `Basic key ${BASIC_KEYS[index].name} must accept focus`).toBeFocused();
    }

    await closeButton.press("Space");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open calculator", exact: true })).toHaveAttribute("aria-expanded", "false");

    await page.getByRole("button", { name: "Open calculator", exact: true }).click();
    const reopened = page.getByRole("dialog", { name: "Calculator" });
    await expect(reopened).toBeVisible();
    await selectCalculatorMode(reopened, "Basic");
    await expect(calculatorDisplay(reopened)).toHaveText("0");
  });

  test("each digit key from 0 through 9 enters the intended digit", async ({ page }) => {
    const dialog = await openBasicCalculator(page);
    const display = calculatorDisplay(dialog);

    for (const key of DIGIT_KEYS) {
      await basicKey(dialog, "Clear").click();
      if (key.digit === "0") {
        // A lone zero is indistinguishable from the initial display. Appending
        // it to one proves the Zero button really dispatched its digit action.
        await basicKey(dialog, "One").click();
        await basicKey(dialog, key.name).click();
        await expect(display, `${key.name} did not append 0`).toHaveText("10");
      } else {
        await basicKey(dialog, key.name).click();
        await expect(display, `${key.name} entered the wrong digit`).toHaveText(key.digit);
      }
    }
  });

  test("Add, Subtract, Multiply, and Divide each complete the expected arithmetic", async ({ page }) => {
    const dialog = await openBasicCalculator(page);
    const display = calculatorDisplay(dialog);
    const cases = [
      { keys: ["Eight", "Add", "Seven", "Equals"], expected: "15" },
      { keys: ["Nine", "Subtract", "Four", "Equals"], expected: "5" },
      { keys: ["Six", "Multiply", "Three", "Equals"], expected: "18" },
      { keys: ["Eight", "Divide", "Two", "Equals"], expected: "4" }
    ] as const;

    for (const operation of cases) {
      await basicKey(dialog, "Clear").click();
      await clickKeys(dialog, operation.keys);
      await expect(display, `${operation.keys.join(" -> ")} produced the wrong result`).toHaveText(operation.expected);
    }
  });

  test("Plus minus, Square root, Decimal point, and Clear obey their unary and reset contracts", async ({ page }) => {
    const dialog = await openBasicCalculator(page);
    const display = calculatorDisplay(dialog);

    await clickKeys(dialog, ["Eight", "Plus minus"]);
    await expect(display).toHaveText("-8");
    await basicKey(dialog, "Plus minus").click();
    await expect(display).toHaveText("8");

    await basicKey(dialog, "Clear").click();
    await clickKeys(dialog, ["Eight", "One", "Square root"]);
    await expect(display).toHaveText("9");

    await basicKey(dialog, "Clear").click();
    await clickKeys(dialog, ["Decimal point", "Five"]);
    await expect(display).toHaveText("0.5");
    await clickKeys(dialog, ["Decimal point", "Two"]);
    await expect(display, "a second decimal point must be ignored").toHaveText("0.52");

    await clickKeys(dialog, ["Add", "Nine"]);
    await basicKey(dialog, "Clear").click();
    await expect(display).toHaveText("0");
    await clickKeys(dialog, ["Four", "Equals"]);
    await expect(display, "AC must also discard a pending operator and accumulator").toHaveText("4");
  });

  test("Percent follows Apple/Microsoft contextual arithmetic", async ({ page }) => {
    const dialog = await openBasicCalculator(page);
    const display = calculatorDisplay(dialog);

    const cases = [
      { keys: ["One", "Zero", "Zero", "Add", "One", "Five", "Percent", "Equals"], expected: "115" },
      { keys: ["One", "Zero", "Zero", "Subtract", "One", "Five", "Percent", "Equals"], expected: "85" },
      { keys: ["Two", "Zero", "Zero", "Multiply", "One", "Zero", "Percent", "Equals"], expected: "20" },
      { keys: ["Two", "Zero", "Zero", "Divide", "One", "Zero", "Percent", "Equals"], expected: "2000" },
      { keys: ["Five", "Zero", "Percent"], expected: "0.5" }
    ] as const;

    for (const entry of cases) {
      await basicKey(dialog, "Clear").click();
      await clickKeys(dialog, entry.keys);
      await expect(display).toHaveText(entry.expected);
    }
  });

  test("division by zero enters Error and AC restores a usable calculator", async ({ page }) => {
    const dialog = await openBasicCalculator(page);
    const display = calculatorDisplay(dialog);

    await clickKeys(dialog, ["Nine", "Divide", "Zero", "Equals"]);
    await expect(display).toHaveText("Error");
    await basicKey(dialog, "Seven").click();
    await expect(display, "non-clear input must not mutate the error state").toHaveText("Error");

    await basicKey(dialog, "Clear").click();
    await expect(display).toHaveText("0");
    await clickKeys(dialog, ["Eight", "Divide", "Two", "Equals"]);
    await expect(display, "calculator was not usable after AC recovery").toHaveText("4");
  });

  test("after Equals a digit starts fresh while an operator continues from the result", async ({ page }) => {
    const dialog = await openBasicCalculator(page);
    const display = calculatorDisplay(dialog);

    await clickKeys(dialog, ["Four", "Add", "Five", "Equals"]);
    await expect(display).toHaveText("9");
    await basicKey(dialog, "Seven").click();
    await expect(display, "a digit after Equals should start a new calculation").toHaveText("7");

    await basicKey(dialog, "Clear").click();
    await clickKeys(dialog, ["Four", "Add", "Five", "Equals", "Add", "Three", "Equals"]);
    await expect(display, "an operator after Equals should continue from the result").toHaveText("12");
  });

  test("Equals replays the last operation, including an Apple-style percentage recipe", async ({ page }) => {
    const dialog = await openBasicCalculator(page);
    const display = calculatorDisplay(dialog);

    await clickKeys(dialog, ["One", "Multiply", "Two", "Equals", "Equals", "Equals", "Equals"]);
    await expect(display).toHaveText("16");

    await basicKey(dialog, "Clear").click();
    await clickKeys(dialog, ["One", "Zero", "Zero", "Add", "One", "Five", "Percent", "Equals"]);
    await expect(display).toHaveText("115");
    await clickKeys(dialog, ["One", "Five", "Zero", "Equals"]);
    await expect(display).toHaveText("172.5");

    await basicKey(dialog, "Clear").click();
    await clickKeys(dialog, ["Zero", "Add", "One", "Five", "Percent", "Equals"]);
    await expect(display).toHaveText("0");
    await clickKeys(dialog, ["One", "Zero", "Zero", "Equals"]);
    await expect(display, "a zero base must not erase the retained 15% recipe").toHaveText("115");

    await basicKey(dialog, "Clear").click();
    await clickKeys(dialog, ["Zero", "Subtract", "One", "Five", "Percent", "Equals"]);
    await expect(display).toHaveText("0");
    await clickKeys(dialog, ["One", "Zero", "Zero", "Equals"]);
    await expect(display, "a zero base must retain a subtract-percent recipe").toHaveText("85");
  });

  test("Basic keypad buttons retain native Enter and Space activation", async ({ page }) => {
    const dialog = await openBasicCalculator(page);
    const display = calculatorDisplay(dialog);

    await basicKey(dialog, "One").press("Enter");
    await expect(display).toHaveText("1");
    await basicKey(dialog, "Add").press("Space");
    await basicKey(dialog, "Two").press("Enter");
    await basicKey(dialog, "Equals").press("Space");
    await expect(display).toHaveText("3");
  });
});
