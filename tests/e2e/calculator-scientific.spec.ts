import { expect, type Locator, type Page } from "@playwright/test";
import { calculatorDisplay, calculatorTest as test, openCalculator, selectCalculatorMode } from "./calculator-test-helpers";

type ScientificButtonContract = {
  label: string;
  name: string;
};

const SCIENTIFIC_BUTTON_CONTRACT: readonly ScientificButtonContract[] = [
  { label: "sin", name: "Sine" },
  { label: "cos", name: "Cosine" },
  { label: "tan", name: "Tangent" },
  { label: "sin⁻¹", name: "Inverse sine" },
  { label: "cos⁻¹", name: "Inverse cosine" },
  { label: "tan⁻¹", name: "Inverse tangent" },
  { label: "ln", name: "Natural log" },
  { label: "log", name: "Log base 10" },
  { label: "eˣ", name: "e to the power x" },
  { label: "√", name: "Square root" },
  { label: "x²", name: "Square" },
  { label: "xʸ", name: "Power" },
  { label: "n!", name: "Factorial" },
  { label: "nPr", name: "Permutations" },
  { label: "nCr", name: "Combinations" },
  { label: "a/b", name: "Fraction" },
  { label: "a b/c", name: "Mixed number" },
  { label: "%", name: "Percent" },
  { label: "π", name: "Pi" },
  { label: "e", name: "Euler's number" },
  { label: "MC", name: "Memory clear" },
  { label: "MR", name: "Memory recall" },
  { label: "M−", name: "Memory subtract" },
  { label: "M+", name: "Memory add" },
  { label: "S⇔D", name: "Toggle fraction or decimal" },
  { label: "AC", name: "Clear" },
  { label: "⌫", name: "Backspace" },
  { label: "(", name: "Open parenthesis" },
  { label: ")", name: "Close parenthesis" },
  { label: "7", name: "Seven" },
  { label: "8", name: "Eight" },
  { label: "9", name: "Nine" },
  { label: "÷", name: "Divide" },
  { label: "4", name: "Four" },
  { label: "5", name: "Five" },
  { label: "6", name: "Six" },
  { label: "×", name: "Multiply" },
  { label: "1", name: "One" },
  { label: "2", name: "Two" },
  { label: "3", name: "Three" },
  { label: "−", name: "Subtract" },
  { label: "0", name: "Zero" },
  { label: ".", name: "Decimal point" },
  { label: "+", name: "Add" },
  { label: "=", name: "Equals" }
] as const;

const DIGIT_NAMES: Readonly<Record<string, string>> = {
  "0": "Zero",
  "1": "One",
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine"
};

async function openScientificCalculator(page: Page) {
  const dialog = await openCalculator(page);
  await selectCalculatorMode(dialog, "Sci");
  const display = calculatorDisplay(dialog);
  await expect(display).toBeVisible();

  // The display sits inside a relative wrapper, whose parent is the keyboard-
  // enabled ScientificCalculatorBody. Scoping here excludes mode and angle keys.
  const panel = display.locator("xpath=../..");
  await expect(panel.locator("button")).toHaveCount(SCIENTIFIC_BUTTON_CONTRACT.length);
  return { dialog, display, panel };
}

function button(panel: Locator, name: string) {
  return panel.getByRole("button", { name, exact: true });
}

async function press(panel: Locator, ...names: string[]) {
  for (const name of names) await button(panel, name).click();
}

async function pressDigits(panel: Locator, digits: string) {
  for (const digit of digits) {
    const name = DIGIT_NAMES[digit];
    if (!name) throw new Error(`No calculator button mapping for ${digit}`);
    await button(panel, name).click();
  }
}

async function clear(panel: Locator, display: Locator) {
  await button(panel, "Clear").click();
  await expect(display).toHaveText("0");
}

async function expectStackedFraction(
  display: Locator,
  numerator: string,
  denominator: string,
  whole?: string
) {
  const fractionResult = display.locator(":scope > span");
  await expect(fractionResult).toHaveCount(1);
  await expect(fractionResult).toHaveAttribute(
    "aria-label",
    whole === undefined ? `${numerator} over ${denominator}` : `${whole} and ${numerator} over ${denominator}`
  );

  const directParts = fractionResult.locator(":scope > span");
  await expect(directParts).toHaveCount(whole === undefined ? 1 : 2);
  if (whole !== undefined) await expect(directParts.first()).toHaveText(whole);

  const stacked = directParts.last();
  const stackedParts = stacked.locator(":scope > span");
  await expect(stackedParts).toHaveCount(3);
  await expect(stackedParts.nth(0)).toHaveText(numerator);
  await expect(stackedParts.nth(1)).toHaveText("");
  await expect(stackedParts.nth(2)).toHaveText(denominator);
}

test.describe("scientific calculator 45-button matrix", () => {
  test.describe.configure({ timeout: 90_000 });

  test("button inventory matches the complete 45-key contract in both directions", async ({ page }) => {
    const { dialog, panel } = await openScientificCalculator(page);
    const actual = await panel.locator("button").evaluateAll((buttons) =>
      buttons.map((item) => {
        const style = window.getComputedStyle(item);
        const bounds = item.getBoundingClientRect();
        return {
          label: item.textContent?.trim() ?? "",
          name: item.getAttribute("aria-label") ?? "",
          enabled: !(item as HTMLButtonElement).disabled,
          visible: style.display !== "none" && style.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0
        };
      })
    );

    expect(SCIENTIFIC_BUTTON_CONTRACT).toHaveLength(45);
    expect(actual).toEqual(
      SCIENTIFIC_BUTTON_CONTRACT.map((entry) => ({ ...entry, enabled: true, visible: true }))
    );
    expect(new Set(actual.map(({ name }) => name)).size).toBe(45);

    for (let index = 0; index < SCIENTIFIC_BUTTON_CONTRACT.length; index += 1) {
      const control = panel.locator("button").nth(index);
      await control.focus();
      await expect(control, `Scientific key ${SCIENTIFIC_BUTTON_CONTRACT[index].name} must accept focus`).toBeFocused();
    }

    let angleToggle = dialog.getByRole("button", { name: "Angle mode degrees; switch to radians", exact: true });
    await expect(angleToggle).toHaveCount(1);
    await expect(angleToggle).toHaveText("DEG");
    await expect(angleToggle).toHaveAttribute("aria-pressed", "false");
    await angleToggle.click();
    angleToggle = dialog.getByRole("button", { name: "Angle mode radians; switch to degrees", exact: true });
    await expect(angleToggle).toHaveText("RAD");
    await expect(angleToggle).toHaveAttribute("aria-pressed", "true");
    await angleToggle.click();
    angleToggle = dialog.getByRole("button", { name: "Angle mode degrees; switch to radians", exact: true });
    await expect(angleToggle).toHaveText("DEG");
  });

  test("all digits, decimal, backspace, and AC edit the expression predictably", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);

    await pressDigits(panel, "1234567890");
    await press(panel, "Decimal point");
    await pressDigits(panel, "5");
    await expect(display).toHaveText("1234567890.5");

    await press(panel, "Backspace");
    await expect(display).toHaveText("1234567890.");
    await pressDigits(panel, "4");
    await expect(display).toHaveText("1234567890.4");

    await clear(panel, display);
    await press(panel, "Decimal point");
    await pressDigits(panel, "25");
    await expect(display).toHaveText(".25");
    await press(panel, "Equals");
    await expectStackedFraction(display, "1", "4");
  });

  test("four operations and parentheses use scientific precedence", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);

    // (2 + 3) × 4 − 6 ÷ 2 = 17. Every arithmetic and parenthesis key
    // participates in one observable expression/result chain.
    await press(
      panel,
      "Open parenthesis",
      "Two",
      "Add",
      "Three",
      "Close parenthesis",
      "Multiply",
      "Four",
      "Subtract",
      "Six",
      "Divide",
      "Two"
    );
    await expect(display).toHaveText("(2+3)×4−6÷2");
    await press(panel, "Equals");
    await expect(display).toHaveText("17");
  });

  test("DEG trig and inverse trig keys return standard exact angles", async ({ page }) => {
    const { dialog, display, panel } = await openScientificCalculator(page);
    await expect(dialog.getByRole("button", { name: "Angle mode degrees; switch to radians", exact: true })).toHaveText("DEG");

    const cases = [
      { fn: "Sine", argument: "90", expected: "1" },
      { fn: "Cosine", argument: "0", expected: "1" },
      { fn: "Tangent", argument: "45", expected: "1" },
      { fn: "Inverse sine", argument: "1", expected: "90" },
      { fn: "Inverse cosine", argument: "0", expected: "90" },
      { fn: "Inverse tangent", argument: "1", expected: "45" }
    ] as const;

    for (const entry of cases) {
      await clear(panel, display);
      await press(panel, entry.fn);
      await pressDigits(panel, entry.argument);
      await press(panel, "Close parenthesis", "Equals");
      await expect(display).toHaveText(entry.expected);
    }
  });

  test("RAD trig and inverse trig keys use radians after the real mode toggle", async ({ page }) => {
    const { dialog, display, panel } = await openScientificCalculator(page);
    const angleToggle = dialog.getByRole("button", { name: "Angle mode degrees; switch to radians", exact: true });
    await angleToggle.click();
    await expect(dialog.getByRole("button", { name: "Angle mode radians; switch to degrees", exact: true })).toHaveText("RAD");

    const cases = [
      { fn: "Sine", inputs: ["Pi", "Divide", "Two"], expected: "1" },
      { fn: "Cosine", inputs: ["Pi"], expected: "-1" },
      { fn: "Tangent", inputs: ["Zero"], expected: "0" },
      { fn: "Inverse sine", inputs: ["One"], expected: "1.57079632679" },
      { fn: "Inverse cosine", inputs: ["Zero"], expected: "1.57079632679" },
      { fn: "Inverse tangent", inputs: ["One"], expected: "0.785398163397" }
    ] as const;

    for (const entry of cases) {
      await clear(panel, display);
      await press(panel, entry.fn, ...entry.inputs, "Close parenthesis", "Equals");
      await expect(display).toHaveText(entry.expected);
    }
  });

  test("logs, exponential, root, square, power, factorial, nPr, and nCr calculate", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);
    const cases = [
      { keys: ["Natural log", "Euler's number", "Close parenthesis", "Equals"], expected: "1" },
      { keys: ["Log base 10", "One", "Zero", "Zero", "Zero", "Close parenthesis", "Equals"], expected: "3" },
      { keys: ["e to the power x", "One", "Close parenthesis", "Equals"], expected: "2.71828182846" },
      { keys: ["Square root", "Eight", "One", "Close parenthesis", "Equals"], expected: "9" },
      { keys: ["One", "Two", "Square", "Equals"], expected: "144" },
      { keys: ["Two", "Power", "One", "Zero", "Equals"], expected: "1024" },
      { keys: ["Six", "Factorial", "Equals"], expected: "720" },
      { keys: ["Six", "Permutations", "Two", "Equals"], expected: "30" },
      { keys: ["Six", "Combinations", "Two", "Equals"], expected: "15" }
    ] as const;

    for (const entry of cases) {
      await clear(panel, display);
      await press(panel, ...entry.keys);
      await expect(display).toHaveText(entry.expected);
    }
  });

  test("fraction, mixed number, percent, pi, and S⇔D preserve exact and decimal forms", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);

    await press(panel, "One", "Fraction", "Three", "Equals");
    await expectStackedFraction(display, "1", "3");
    await press(panel, "Toggle fraction or decimal");
    await expect(display).toHaveText("0.333333333333");
    await press(panel, "Toggle fraction or decimal");
    await expectStackedFraction(display, "1", "3");

    await clear(panel, display);
    await press(panel, "Two", "Mixed number", "One", "Fraction", "Three", "Equals");
    await expectStackedFraction(display, "7", "3");
    await press(panel, "Toggle fraction or decimal");
    await expectStackedFraction(display, "1", "3", "2");
    await press(panel, "Toggle fraction or decimal");
    await expect(display).toHaveText("2.33333333333");
    await press(panel, "Toggle fraction or decimal");
    await expectStackedFraction(display, "7", "3");

    await clear(panel, display);
    await press(panel, "Two", "Zero", "Zero", "Multiply", "One", "Zero", "Percent", "Equals");
    await expect(display).toHaveText("20");

    await clear(panel, display);
    await press(panel, "Two", "Multiply", "Pi", "Equals");
    await expect(display).toHaveText("6.28318530718");
  });

  test("MC, MR, M−, and M+ expose durable and clearable memory state", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);
    const memoryIndicator = panel.getByText("M", { exact: true });

    await expect(memoryIndicator).toHaveCount(0);
    await press(panel, "Eight", "Memory add");
    await expect(display).toHaveText("8");
    await expect(memoryIndicator).toBeVisible();

    await clear(panel, display);
    await press(panel, "Memory recall");
    await expect(display).toHaveText("8");

    await clear(panel, display);
    await press(panel, "Three", "Memory subtract");
    await expect(display).toHaveText("3");
    await clear(panel, display);
    await press(panel, "Memory recall");
    await expect(display).toHaveText("5");

    await press(panel, "Memory clear");
    await expect(display).toHaveText("5");
    await expect(memoryIndicator).toHaveCount(0);
    await clear(panel, display);
    await press(panel, "Memory recall");
    await expect(display).toHaveText("0");
  });

  test("memory treats an empty display as zero and survives mode switches and close/reopen", async ({ page }) => {
    let { dialog, display, panel } = await openScientificCalculator(page);

    await press(panel, "Memory add");
    await expect(display, "M+ on the initial zero display must not enter Error").toHaveText("0");
    await press(panel, "Memory subtract");
    await expect(display, "M− on the initial zero display must not enter Error").toHaveText("0");

    await press(panel, "Eight", "Memory add");
    await selectCalculatorMode(dialog, "Basic");
    await selectCalculatorMode(dialog, "Sci");
    display = calculatorDisplay(dialog);
    panel = display.locator("xpath=../..");
    await press(panel, "Clear", "Memory recall");
    await expect(display, "memory must survive Sci → Basic → Sci").toHaveText("8");

    await page.getByRole("button", { name: "Close calculator", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Open calculator", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Calculator", exact: true });
    await expect(dialog).toBeVisible();
    await selectCalculatorMode(dialog, "Sci");
    display = calculatorDisplay(dialog);
    panel = display.locator("xpath=../..");
    await press(panel, "Clear", "Memory recall");
    await expect(display, "memory must survive close → reopen").toHaveText("8");
  });

  test("MR replaces the current numeric entry instead of concatenating digits", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);

    await press(panel, "Five", "Memory add", "Clear");
    await press(panel, "Two", "Add", "Three", "Memory recall");
    await expect(display).toHaveText("2+5");
    await press(panel, "Equals");
    await expect(display).toHaveText("7");

    await clear(panel, display);
    await press(panel, "Two", "Add", "Open parenthesis", "Three", "Close parenthesis", "Memory recall");
    await expect(display, "MR must replace a complete parenthesized operand without breaking syntax").toHaveText("2+5");
    await press(panel, "Equals");
    await expect(display).toHaveText("7");

    await clear(panel, display);
    await press(panel, "Two", "Add", "Sine", "Three", "Zero", "Close parenthesis", "Memory recall");
    await expect(display, "MR must replace a complete function operand without breaking syntax").toHaveText("2+5");
    await press(panel, "Equals");
    await expect(display).toHaveText("7");
  });

  test("Equals on the initial visible zero is a safe no-op", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);
    await press(panel, "Equals");
    await expect(display).toHaveText("0");
  });

  test("scientific notation, one-third precision, and e-token boundaries survive result chains", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);

    await press(panel, "One", "Zero", "Power", "Two", "One", "Equals");
    await expect(display).toHaveText("1e+21");
    await press(panel, "Divide", "One", "Zero", "Equals");
    await expect(display).toHaveText("100000000000000000000");
    await press(panel, "Multiply", "One", "Zero", "Equals");
    await expect(display).toHaveText("1e+21");

    await clear(panel, display);
    await press(panel, "One", "Fraction", "Three", "Equals");
    await expectStackedFraction(display, "1", "3");
    await press(panel, "Multiply", "Three", "Equals");
    await expect(display).toHaveText("1");

    // Three discrete value keys must remain 2 × e × 2, never the numeric
    // scientific-notation token 2e2 (= 200).
    await clear(panel, display);
    await press(panel, "Two", "Euler's number", "Two", "Equals");
    await expect(display).toHaveText("10.8731273138");
  });

  test("domain and syntax errors recover through value, backspace, and AC", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);

    await press(panel, "Five", "Divide", "Zero", "Equals");
    await expect(display).toHaveText("Error");
    await press(panel, "Seven");
    await expect(display).toHaveText("7");

    await press(panel, "Add", "Equals");
    await expect(display).toHaveText("Error");
    await press(panel, "Backspace");
    await expect(display).toHaveText("7");
    await press(panel, "Equals");
    await expect(display).toHaveText("7");

    await press(panel, "Square root", "Subtract", "Four", "Close parenthesis", "Equals");
    await expect(display).toHaveText("Error");
    await clear(panel, display);
    await press(panel, "Nine", "Equals");
    await expect(display).toHaveText("9");

    await clear(panel, display);
    await press(panel, "Tangent", "Nine", "Zero", "Close parenthesis", "Equals");
    await expect(display, "tan(90°) is undefined and must not expose a huge finite approximation").toHaveText("Error");
  });

  test("physical keyboard maps supported keys and evaluates only when the panel owns focus", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);

    await panel.focus();
    await page.keyboard.type("(12.5+7.5)*2/4");
    await expect(display).toHaveText("(12.5+7.5)×2÷4");
    await page.keyboard.press("Enter");
    await expect(display).toHaveText("10");

    await panel.focus();
    await page.keyboard.press("Escape");
    await expect(display).toHaveText("0");
    await page.keyboard.type("2^3");
    await page.keyboard.press("=");
    await expect(display).toHaveText("8");

    await panel.focus();
    await page.keyboard.press("Escape");
    await page.keyboard.type("50%");
    await page.keyboard.press("Enter");
    await expectStackedFraction(display, "1", "2");

    await panel.focus();
    await page.keyboard.press("Escape");
    await page.keyboard.type("6!");
    await page.keyboard.press("Backspace");
    await expect(display).toHaveText("6");
    await page.keyboard.type("!");
    await page.keyboard.press("Enter");
    await expect(display).toHaveText("720");
  });

  test("Enter and Space activate a focused button once without also firing global equals", async ({ page }) => {
    const { display, panel } = await openScientificCalculator(page);

    await press(panel, "One", "Add");
    const two = button(panel, "Two");
    await two.focus();
    await page.keyboard.press("Enter");
    await expect(display).toHaveText("1+2");

    const three = button(panel, "Three");
    await three.focus();
    await page.keyboard.press("Space");
    await expect(display).toHaveText("1+23");

    const equals = button(panel, "Equals");
    await equals.focus();
    await page.keyboard.press("Space");
    await expect(display).toHaveText("24");
  });
});
