import { expect, test, type Locator, type Page } from "@playwright/test";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import { collectPageErrors, expectNoPageErrors, loginAsDemoStudent } from "./helpers";

test.describe("Visualization Lab local value sweep", () => {
  test("opens every catalog lab and validates visible surfaces at control extremes", async ({ page }) => {
    test.slow();
    test.setTimeout(300_000);
    const pageErrors = collectPageErrors(page);

    await loginAsDemoStudent(page);
    await page.goto("/visualization-lab");
    await disableMotion(page);
    await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible();
    await ensureAllLabsVisible(page);
    await expect(page.locator('[id^="lab-example-"]')).toHaveCount(visualizationLabCatalog.length);

    for (const lab of visualizationLabCatalog) {
      const card = page.locator(`#lab-example-${lab.labId}`);
      await expect(card, `${lab.labId} should be listed`).toBeVisible();
      await card.scrollIntoViewIfNeeded();
      await openLabIfNeeded(card);
      await expectHealthyVisualization(card, lab.labId);
      await sweepRangeExtremes(card);
      await expectHealthyVisualization(card, lab.labId);
    }

    expectNoPageErrors(pageErrors);
  });
});

async function ensureAllLabsVisible(page: Page) {
  const lastLab = visualizationLabCatalog[visualizationLabCatalog.length - 1];
  const lastCard = page.locator(`#lab-example-${lastLab.labId}`);
  if (await lastCard.isVisible().catch(() => false)) return;

  await page.getByRole("button", { name: /Explore all labs|Explore other grades|探索全部實驗|探索全部实验|探索其他年級/i }).click();
  await expect(lastCard).toBeVisible();
}

async function disableMotion(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `
  });
}

async function openLabIfNeeded(card: Locator) {
  if ((await card.locator("[data-viz-surface]").count()) > 0) return;
  await card.getByRole("button", { name: /Open lab|開啟實驗|开启实验/i }).click();
  await expect(card.locator("[data-viz-surface]").first()).toBeVisible();
}

async function sweepRangeExtremes(card: Locator) {
  const ranges = card.locator('input[type="range"]');
  const count = await ranges.count();

  for (let index = 0; index < count; index += 1) {
    const range = ranges.nth(index);
    const [min, max] = await range.evaluate((input) => {
      const element = input as HTMLInputElement;
      return [element.min || "0", element.max || "100"];
    });

    await setRangeValue(range, min);
    await setRangeValue(range, max);
  }
}

async function setRangeValue(range: Locator, value: string) {
  await range.evaluate((input, nextValue) => {
    const element = input as HTMLInputElement;
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
    descriptor?.set?.call(element, nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function expectHealthyVisualization(card: Locator, labId: string) {
  const problems = await card.evaluate((root) => {
    const issues: string[] = [];
    const invalidPattern = /\b(?:NaN|-?Infinity)\b/;
    const text = (root.textContent ?? "").replace(/\s+/g, " ");
    if (invalidPattern.test(text)) issues.push("Rendered text contains NaN or Infinity.");

    const surfaces = Array.from(root.querySelectorAll<HTMLElement | SVGElement>("[data-viz-surface]"));
    if (surfaces.length === 0) issues.push("No visualization surface rendered.");

    surfaces.forEach((surface, surfaceIndex) => {
      const rect = surface.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) issues.push(`Surface ${surfaceIndex + 1} is too small.`);
      const marks = Array.from(surface.querySelectorAll("[data-viz-mark]"));
      if (marks.length === 0) issues.push(`Surface ${surfaceIndex + 1} has no visual marks.`);
      const invalidAttributeElement = Array.from(surface.querySelectorAll("*")).find((element) =>
        Array.from(element.attributes).some((attribute) => invalidPattern.test(attribute.value))
      );
      if (invalidAttributeElement) issues.push(`Surface ${surfaceIndex + 1} contains invalid SVG attributes.`);
    });

    return issues;
  });

  expect(problems, `${labId} visualization health`).toEqual([]);
}
