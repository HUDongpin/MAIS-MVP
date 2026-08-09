import { expect, type Locator, type Page } from "@playwright/test";
import {
  calculatorTest as test,
  loginCalculatorStudent,
  selectCalculatorMode
} from "./calculator-test-helpers";

const NARROW_VIEWPORT = { width: 320, height: 568 };

async function expectInsideViewport(page: Page, control: Locator, label: string) {
  await control.scrollIntoViewIfNeeded();
  await control.focus();
  await expect(control, `${label} must accept keyboard focus`).toBeFocused();
  await expect(control, `${label} must remain reachable after scrolling`).toBeInViewport();

  const box = await control.boundingBox();
  expect(box, `${label} must have a rendered box`).not.toBeNull();
  expect(box!.width, `${label} must meet the 44px touch-target width`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${label} must meet the 44px touch-target height`).toBeGreaterThanOrEqual(44);
  expect(box!.x, `${label} must not overflow the left viewport edge`).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, `${label} must not overflow the right viewport edge`).toBeLessThanOrEqual(NARROW_VIEWPORT.width);
}

async function expectModeLayout(
  page: Page,
  dialog: Locator,
  mode: "Basic" | "Sci" | "Stat",
  expectedButtons: number
) {
  await selectCalculatorMode(dialog, mode);
  const box = await dialog.boundingBox();
  expect(box, `${mode} dialog must render`).not.toBeNull();
  expect(box!.x, `${mode} dialog must remain inside the left edge`).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, `${mode} dialog must remain inside the right edge`).toBeLessThanOrEqual(NARROW_VIEWPORT.width);
  const horizontal = await dialog.evaluate((element) => {
    const root = element.getBoundingClientRect();
    const overflowers = Array.from(element.querySelectorAll<HTMLElement>("*"))
      .map((child) => {
        const rect = child.getBoundingClientRect();
        return {
          tag: child.tagName,
          className: child.className,
          text: child.textContent?.trim().slice(0, 30),
          right: Math.round(rect.right),
          width: Math.round(rect.width)
        };
      })
      .filter((child) => child.right > Math.ceil(root.right))
      .slice(0, 5);
    return { clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, overflowers };
  });
  expect(
    horizontal.scrollWidth,
    `${mode} dialog must not require horizontal scrolling (${JSON.stringify(horizontal)})`
  ).toBeLessThanOrEqual(horizontal.clientWidth);

  const controls = dialog.getByRole("button");
  await expect(controls).toHaveCount(expectedButtons);
  for (let index = 0; index < expectedButtons; index += 1) {
    const control = controls.nth(index);
    const name = await control.getAttribute("aria-label") ?? (await control.textContent())?.trim() ?? `${mode} control ${index + 1}`;
    await expectInsideViewport(page, control, `${mode}: ${name}`);
  }
}

test("all calculator controls remain reachable and meet 44px targets at 320px width", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(NARROW_VIEWPORT);
  await loginCalculatorStudent(page);
  await page.goto("/student/assessments/assessment-s3-algebra-quiz", { waitUntil: "domcontentloaded" });

  const open = page.getByRole("button", { name: "Open calculator", exact: true });
  await expect(open).toBeVisible({ timeout: 30_000 });
  await expectInsideViewport(page, open, "Open calculator");
  await open.click();

  const dialog = page.getByRole("dialog", { name: "Calculator", exact: true });
  await expect(dialog).toBeVisible();

  await expectModeLayout(page, dialog, "Basic", 23); // 3 modes + 20 keys
  await expectModeLayout(page, dialog, "Sci", 49); // 3 modes + DEG/RAD + 45 keys
  await expectModeLayout(page, dialog, "Stat", 21); // 3 modes + 2 variants + 16 keys

  const close = page.getByRole("button", { name: "Close calculator", exact: true });
  await expectInsideViewport(page, close, "Close calculator");
});
