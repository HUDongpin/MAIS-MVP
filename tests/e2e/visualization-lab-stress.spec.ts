import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { visualizationLabCatalog } from "../../data/visualizationLabs";

type LabStressResult = {
  labId: string;
  title: string;
  moduleId: string;
  templateId: string;
  status: "PASS" | "FAIL";
  issues: string[];
  rangeCount: number;
  buttonCount: number;
  clickedButtonCount: number;
  surfaceCount: number;
  markCount: number;
  elapsedMs: number;
};

const allLabs = visualizationLabCatalog.map((lab) => ({
  labId: lab.labId,
  title: lab.title.en,
  moduleId: lab.moduleId,
  templateId: lab.templateId
}));

const expandAllLabsPattern =
  /Explore all labs|Explore my curriculum|Explore other grades|探索全部實驗|探索全部实验|探索我的課程實驗|探索我的课程实验|探索其他年級/i;
const skippedButtonPattern =
  /^(Mark explored|Saving|Saved|Open lab|Close lab|開啟實驗|开启实验|收起實驗|收起实验|標記已探索|标记已探索)$/i;

test.describe("Visualization Lab stress sweep", () => {
  test("all catalog labs survive load, range extremes, mode clicks, and pointer probes", async ({ page }, testInfo) => {
    test.slow();
    test.setTimeout(900_000);

    const pageErrors = collectPageErrors(page);
    const consoleErrors = collectConsoleErrors(page);
    const requestFailures = collectRequestFailures(page);
    const results: LabStressResult[] = [];

    await page.goto("/visualization-lab", { waitUntil: "domcontentloaded" });
    await disableMotion(page);
    await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible({ timeout: 60_000 });
    await ensureAllLabsVisible(page);
    await expect(page.locator('[id^="lab-example-"]')).toHaveCount(allLabs.length, { timeout: 60_000 });

    for (const [labIndex, lab] of allLabs.entries()) {
      const startedAt = Date.now();
      const card = labCard(page, lab.labId);
      const issues: string[] = [];
      let rangeCount = 0;
      let buttonCount = 0;
      let clickedButtonCount = 0;
      let surfaceCount = 0;
      let markCount = 0;

      try {
        await card.scrollIntoViewIfNeeded({ timeout: 10_000 });
        await expect(card, `${lab.labId} should be visible`).toBeVisible({ timeout: 10_000 });
        await expect(card.locator("[data-viz-surface]").first(), `${lab.labId} should render a visualization surface`).toBeVisible({ timeout: 15_000 });

        const initialHealth = await inspectVisualizationHealth(card);
        issues.push(...initialHealth.issues);
        surfaceCount = initialHealth.surfaceCount;
        markCount = initialHealth.markCount;

        rangeCount = await sweepRangeControls(card);
        const buttonStress = await clickModelButtons(card);
        buttonCount = buttonStress.buttonCount;
        clickedButtonCount = buttonStress.clickedButtonCount;
        await pointerProbeFirstSurface(card);

        const finalHealth = await inspectVisualizationHealth(card);
        issues.push(...finalHealth.issues);
        surfaceCount = finalHealth.surfaceCount;
        markCount = finalHealth.markCount;
      } catch (error) {
        issues.push(error instanceof Error ? error.message : String(error));
      }

      results.push({
        ...lab,
        status: issues.length === 0 ? "PASS" : "FAIL",
        issues: Array.from(new Set(issues)),
        rangeCount,
        buttonCount,
        clickedButtonCount,
        surfaceCount,
        markCount,
        elapsedMs: Date.now() - startedAt
      });

      if ((labIndex + 1) % 50 === 0 || labIndex + 1 === allLabs.length) {
        console.log(`Visualization Lab stress sweep: ${labIndex + 1}/${allLabs.length} labs checked on ${testInfo.project.name}`);
      }
    }

    const failedLabs = results.filter((result) => result.status === "FAIL");
    const stressReport = {
      catalogLabCount: allLabs.length,
      renderedLabCount: await page.locator('[id^="lab-example-"]').count(),
      passedLabCount: results.length - failedLabs.length,
      failedLabCount: failedLabs.length,
      pageErrors,
      consoleErrors,
      requestFailures,
      results
    };
    await attachStressReport(testInfo, stressReport);
    writeStressReport(testInfo, stressReport);

    expect.soft(pageErrors, "page errors").toEqual([]);
    expect.soft(consoleErrors, "console errors").toEqual([]);
    expect.soft(requestFailures, "same-origin request failures").toEqual([]);
    expect.soft(failedLabs.map((failure) => ({
      labId: failure.labId,
      title: failure.title,
      issues: failure.issues
    })), "failed lab health checks").toEqual([]);
  });
});

function labCard(page: Page, labId: string) {
  return page.locator(`[id=${JSON.stringify(`lab-example-${labId}`)}]`);
}

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/.test(text)) return;
    errors.push(text);
  });
  return errors;
}

function collectRequestFailures(page: Page) {
  const failures: string[] = [];
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(page.url()).origin) return;
    failures.push(`${request.method()} ${url.pathname}: ${request.failure()?.errorText ?? "unknown failure"}`);
  });
  return failures;
}

async function ensureAllLabsVisible(page: Page) {
  const lastLab = allLabs[allLabs.length - 1];
  const lastCard = labCard(page, lastLab.labId);
  if (await lastCard.isVisible().catch(() => false)) return;

  await page.getByRole("button", { name: expandAllLabsPattern }).click();
  await expect(lastCard).toBeVisible({ timeout: 60_000 });
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

async function sweepRangeControls(card: Locator) {
  const ranges = card.locator('input[type="range"]');
  const count = await ranges.count();

  for (let index = 0; index < count; index += 1) {
    const range = ranges.nth(index);
    const values = await range.evaluate((input) => {
      const element = input as HTMLInputElement;
      const min = Number(element.min || 0);
      const max = Number(element.max || 100);
      const step = element.step && element.step !== "any" ? Number(element.step) : 1;
      const midpoint = min + (max - min) / 2;
      const normalizedMidpoint = Number.isFinite(step) && step > 0
        ? min + Math.round((midpoint - min) / step) * step
        : midpoint;
      return [min, normalizedMidpoint, max, min, max].map((value) => String(value));
    });

    for (const value of values) {
      await setRangeValue(range, value);
    }
  }

  return count;
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

async function clickModelButtons(card: Locator) {
  return await card.evaluate((root, skippedPatternSource) => {
    const skipped = new RegExp(skippedPatternSource, "i");
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
    let clickedButtonCount = 0;

    buttons.forEach((button) => {
      const style = window.getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      const label = (button.innerText ?? "").replace(/\s+/g, " ").trim();
      const clickable =
        !button.disabled &&
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") !== 0 &&
        label &&
        !skipped.test(label);

      if (!clickable) return;

      button.click();
      clickedButtonCount += 1;
    });

    return { buttonCount: buttons.length, clickedButtonCount };
  }, skippedButtonPattern.source);
}

async function pointerProbeFirstSurface(card: Locator) {
  const surface = card.locator("[data-viz-surface]").first();
  const box = await surface.boundingBox();
  if (!box) return;

  const page = card.page();
  const start = { x: box.x + box.width * 0.35, y: box.y + box.height * 0.35 };
  const end = { x: box.x + box.width * 0.65, y: box.y + box.height * 0.62 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
}

async function inspectVisualizationHealth(card: Locator) {
  return await card.evaluate((root) => {
    const issues: string[] = [];
    const invalidPattern = /\b(?:NaN|-?Infinity)\b/;
    const text = (root.textContent ?? "").replace(/\s+/g, " ");
    if (invalidPattern.test(text)) issues.push("Rendered text contains NaN or Infinity.");

    const surfaces = Array.from(root.querySelectorAll<HTMLElement | SVGElement>("[data-viz-surface]"));
    if (surfaces.length === 0) issues.push("No visualization surface rendered.");

    let markCount = 0;
    surfaces.forEach((surface, surfaceIndex) => {
      const rect = surface.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) issues.push(`Surface ${surfaceIndex + 1} is too small.`);

      const marks = Array.from(surface.querySelectorAll("[data-viz-mark]"));
      markCount += marks.length;
      if (marks.length === 0) issues.push(`Surface ${surfaceIndex + 1} has no visual marks.`);

      const invalidAttributeElement = Array.from(surface.querySelectorAll("*")).find((element) =>
        Array.from(element.attributes).some((attribute) => invalidPattern.test(attribute.value))
      );
      if (invalidAttributeElement) issues.push(`Surface ${surfaceIndex + 1} contains invalid SVG attributes.`);
    });

    return {
      issues,
      surfaceCount: surfaces.length,
      markCount
    };
  });
}

async function attachStressReport(testInfo: TestInfo, report: unknown) {
  await testInfo.attach("visualization-lab-stress-report.json", {
    body: Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8"),
    contentType: "application/json"
  });
}

function writeStressReport(testInfo: TestInfo, report: unknown) {
  const reportPath = process.env.VISUALIZATION_STRESS_REPORT_PATH ?? testInfo.outputPath("visualization-lab-stress-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}
