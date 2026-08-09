import { expect, test as base, type Locator, type Page } from "@playwright/test";
import { authenticateAsDemoStudent } from "./helpers";

export const calculatorTest = base.extend<{ calculatorRuntimeAudit: void }>({
  calculatorRuntimeAudit: [async ({ page }, use) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const onConsole = (message: { type(): string; text(): string }) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    };
    const onPageError = (error: Error) => pageErrors.push(error.message);

    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    await use();
    page.off("console", onConsole);
    page.off("pageerror", onPageError);

    expect(pageErrors, "unexpected uncaught browser page errors").toEqual([]);
    expect(consoleErrors, "unexpected browser console errors").toEqual([]);
  }, { auto: true }]
});

export async function loginCalculatorStudent(page: Page) {
  // This matrix tests calculator behavior, not the login endpoint. Install the
  // same signed demo-student session cookie used by the shared E2E helpers so
  // authentication remains deterministic even while unrelated API routes build.
  await authenticateAsDemoStudent(page);

  await page.route("**/api/student/accommodations", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        accommodations: {
          extendedTime: "none",
          readAloud: false,
          maxAnswerChoices: 0,
          calculatorPolicy: "allowed",
          notes: "Calculator button matrix"
        }
      })
    });
  });
}

export async function openCalculator(page: Page) {
  await loginCalculatorStudent(page);
  // The assessment mounts CalculatorLauncher independently of the Practice
  // Arena's mission-start state, making the button contract deterministic.
  await page.goto("/student/assessments/assessment-s3-algebra-quiz", { waitUntil: "domcontentloaded" });

  const launcher = page.getByRole("button", { name: "Open calculator" });
  await expect(launcher).toBeVisible({ timeout: 30_000 });
  await launcher.click();

  const dialog = page.getByRole("dialog", { name: "Calculator" });
  await expect(dialog).toBeVisible();
  return dialog;
}

export function calculatorDisplay(dialog: Locator) {
  return dialog.getByTestId("calculator-display");
}

export async function selectCalculatorMode(dialog: Locator, mode: "Basic" | "Sci" | "Stat") {
  await dialog.getByRole("button", { name: mode, exact: true }).click();
}
