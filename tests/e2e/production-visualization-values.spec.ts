import { expect, test, type Locator, type Page, type Request, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type ControlInfo = {
  index: number;
  type: "range" | "number";
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
};

type LabInfo = {
  id: string;
  title: string;
};

type RuntimeIssue = {
  kind: "bad-response" | "request-failed" | "page-error" | "console-error";
  message: string;
};

type FailureRecord = {
  labId: string;
  title: string;
  state: string;
  action: string;
  details: string[];
  controls: string;
};

type LabSummary = {
  id: string;
  title: string;
  controls: Set<string>;
  buttons: string[];
  statesTested: number;
  failures: number;
};

type RunReport = {
  projectName: string;
  startedAt: string;
  endedAt: string;
  target: string;
  homeVisualizationCount: number | null;
  labPageAdvertisedCount: number | null;
  discoveredCount: number;
  expectedMinimumCount: number;
  statesTested: number;
  controlsTested: number;
  buttonsTested: number;
  labSummaries: LabSummary[];
  warnings: string[];
  runtimeIssues: RuntimeIssue[];
  failures: FailureRecord[];
  fatalError: string | null;
};

const productionOrigin = "https://www.mais.hk";
const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? "";
const productionTargetEnabled = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1" && originFor(configuredBaseURL) === productionOrigin;
const expectedMinimumLabCount = 100;
const controlSelector = 'input[type="range"], input[type="number"]';
const maxDiscreteValuesPerControl = 500;
const maxFailureScreenshots = 6;
const reportDate = process.env.PRODUCTION_VISUALIZATION_REPORT_DATE ?? hongKongDate();
const reportPath = path.join(process.cwd(), "coordination", "reports", `${reportDate}-production-visualization-lab-values.md`);

test.describe("Production Visualization Lab value sweep", () => {
  test.skip(!productionTargetEnabled, "Set PLAYWRIGHT_BASE_URL=https://www.mais.hk and PLAYWRIGHT_SKIP_WEBSERVER=1 to run the production value sweep.");
  test.setTimeout(900_000);

  test("every deployed visualization lab handles extreme and per-control values", async ({ page }, testInfo) => {
    initializeReportForProject(testInfo.project.name);
    const startedAt = new Date().toISOString();
    const diagnostics = collectProductionDiagnostics(page);
    const failures: FailureRecord[] = [];
    const warnings: string[] = [];
    const labSummaries: LabSummary[] = [];
    let screenshotCount = 0;
    let homeVisualizationCount: number | null = null;
    let labPageAdvertisedCount: number | null = null;
    let discoveredCount = 0;
    let statesTested = 0;
    let buttonsTested = 0;
    let fatalError: Error | null = null;

    try {
      homeVisualizationCount = await readHomeVisualizationCount(page, warnings);

      await page.goto("/visualization-lab", { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
      await disableMotion(page);
      await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible({ timeout: 60_000 });
      await ensureAllGradesVisible(page);

      const bodyText = await page.locator("body").innerText();
      labPageAdvertisedCount = extractLabPageAdvertisedCount(bodyText);
      const labs = await collectLabInventory(page);
      discoveredCount = labs.length;

      if (discoveredCount < expectedMinimumLabCount) {
        failures.push({
          labId: "inventory",
          title: "Visualization Lab inventory",
          state: "page inventory",
          action: "collect labs",
          details: [`Expected at least ${expectedMinimumLabCount} production labs, but discovered ${discoveredCount}.`],
          controls: ""
        });
      }

      if (homeVisualizationCount !== null && homeVisualizationCount !== discoveredCount) {
        warnings.push(`Home page visualization count is ${homeVisualizationCount}, while the visualization page rendered ${discoveredCount} lab sections.`);
      }
      if (labPageAdvertisedCount !== null && labPageAdvertisedCount !== discoveredCount) {
        warnings.push(`Visualization page advertised ${labPageAdvertisedCount} labs, while ${discoveredCount} lab sections were discovered.`);
      }

      for (const lab of labs) {
        const card = labCard(page, lab.id);
        await card.scrollIntoViewIfNeeded();
        await expect(card, `${lab.id} should be visible`).toBeVisible({ timeout: 10_000 });
        const summary: LabSummary = {
          id: lab.id,
          title: lab.title,
          controls: new Set<string>(),
          buttons: [],
          statesTested: 0,
          failures: 0
        };
        labSummaries.push(summary);
        await openLabIfNeeded(card);

        summary.statesTested += await checkHealth({
          card,
          lab,
          state: "default",
          action: "initial render",
          failures,
          testInfo,
          screenshotCountRef: () => screenshotCount,
          incrementScreenshotCount: () => {
            screenshotCount += 1;
          }
        });

        summary.statesTested += await sweepCurrentControls({
          page,
          card,
          lab,
          summary,
          state: "default",
          failures,
          testInfo,
          screenshotCountRef: () => screenshotCount,
          incrementScreenshotCount: () => {
            screenshotCount += 1;
          }
        });

        const buttons = await collectActionButtons(card);
        for (const button of buttons) {
          const buttonLocator = card.locator("button").nth(button.index);
          if (!(await buttonLocator.isVisible().catch(() => false)) || !(await buttonLocator.isEnabled().catch(() => false))) continue;

          await buttonLocator.scrollIntoViewIfNeeded();
          await buttonLocator.click({ timeout: 10_000 });
          await page.waitForTimeout(35);
          summary.buttons.push(button.label);
          buttonsTested += 1;

          const buttonState = `button:${button.label}`;
          summary.statesTested += await checkHealth({
            card,
            lab,
            state: buttonState,
            action: "click button",
            failures,
            testInfo,
            screenshotCountRef: () => screenshotCount,
            incrementScreenshotCount: () => {
              screenshotCount += 1;
            }
          });
          summary.statesTested += await sweepCurrentControls({
            page,
            card,
            lab,
            summary,
            state: buttonState,
            failures,
            testInfo,
            screenshotCountRef: () => screenshotCount,
            incrementScreenshotCount: () => {
              screenshotCount += 1;
            }
          });
        }

        summary.failures = failures.filter((failure) => failure.labId === lab.id).length;
        statesTested += summary.statesTested;
      }
    } catch (error) {
      fatalError = error instanceof Error ? error : new Error(String(error));
    }

    const runtimeIssues = diagnostics.issues();
    const report: RunReport = {
      projectName: testInfo.project.name,
      startedAt,
      endedAt: new Date().toISOString(),
      target: productionOrigin,
      homeVisualizationCount,
      labPageAdvertisedCount,
      discoveredCount,
      expectedMinimumCount: expectedMinimumLabCount,
      statesTested,
      controlsTested: labSummaries.reduce((sum, lab) => sum + lab.controls.size, 0),
      buttonsTested,
      labSummaries,
      warnings,
      runtimeIssues,
      failures,
      fatalError: fatalError?.message ?? null
    };

    writeProjectReport(report);
    await testInfo.attach("production-visualization-lab-values-report.md", {
      path: reportPath,
      contentType: "text/markdown"
    });

    if (fatalError) throw fatalError;
    const failureTotal = failures.length + runtimeIssues.length;
    if (failureTotal > 0) {
      throw new Error(formatFailureSummary(failures, runtimeIssues, testInfo.project.name));
    }
  });
});

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

async function ensureAllGradesVisible(page: Page) {
  const exploreAllGrades = page.getByRole("button", { name: /Explore all labs|Explore other grades|探索全部實驗|探索全部实验|探索其他年級/i });
  if (await exploreAllGrades.isVisible().catch(() => false)) {
    await exploreAllGrades.click();
    await page.waitForTimeout(350);
  }

  await page.waitForFunction(
    (minimumCount) => document.querySelectorAll('[id^="lab-example-"]').length >= minimumCount,
    expectedMinimumLabCount,
    { timeout: 12_000 }
  ).catch(() => undefined);
}

async function collectLabInventory(page: Page): Promise<LabInfo[]> {
  return await page.locator('[id^="lab-example-"]').evaluateAll((sections) =>
    sections.map((section) => {
      const headings = Array.from(section.querySelectorAll("h2, h3"))
        .map((heading) => (heading.textContent ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      const id = section.id.replace(/^lab-example-/, "");
      const title = headings.find((heading) => !heading.includes("·")) ?? headings[0] ?? id;
      return { id, title };
    })
  );
}

async function readHomeVisualizationCount(page: Page, warnings: string[]) {
  try {
    const response = await page.request.get(productionOrigin);
    const html = await response.text();
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    return extractHomeVisualizationCount(text);
  } catch (error) {
    warnings.push(`Unable to read home page visualization count: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function extractHomeVisualizationCount(text: string) {
  const match = text.match(/(\d+)\s+Visualization\s+labs/i);
  return match ? Number(match[1]) : null;
}

function extractLabPageAdvertisedCount(text: string) {
  const match = text.match(/P1-S6\s*·\s*(\d+)\s*labs/i);
  return match ? Number(match[1]) : null;
}

function labCard(page: Page, labId: string) {
  return page.locator(`[id="lab-example-${labId}"]`);
}

async function collectActionButtons(card: Locator) {
  const buttons = card.locator("button");
  const count = await buttons.count();
  const actions: Array<{ index: number; label: string }> = [];

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible().catch(() => false))) continue;
    if (!(await button.isEnabled().catch(() => false))) continue;

    const label = (await button.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (!label || isMutatingProductionButton(label)) continue;
    actions.push({ index, label });
  }

  return actions;
}

function isMutatingProductionButton(label: string) {
  return /^(Mark explored|標記已探索|標示已探索|已探索|Saving|Saved|Open lab|Close lab|開啟實驗|开启实验|收起實驗|收起实验)$/i.test(label);
}

async function openLabIfNeeded(card: Locator) {
  if ((await card.locator("[data-viz-surface]").count()) > 0) return;

  const openButton = card.getByRole("button", { name: /Open lab|開啟實驗|开启实验/i });
  if (await openButton.isVisible().catch(() => false)) {
    await openButton.click({ timeout: 10_000 });
  }
  await expect(card.locator("[data-viz-surface]").first()).toBeVisible({ timeout: 10_000 });
}

async function sweepCurrentControls({
  page,
  card,
  lab,
  summary,
  state,
  failures,
  testInfo,
  screenshotCountRef,
  incrementScreenshotCount
}: {
  page: Page;
  card: Locator;
  lab: LabInfo;
  summary: LabSummary;
  state: string;
  failures: FailureRecord[];
  testInfo: TestInfo;
  screenshotCountRef: () => number;
  incrementScreenshotCount: () => void;
}) {
  let statesTested = 0;
  const baseline = await collectControls(card);
  baseline.forEach((control) => summary.controls.add(controlLabel(control)));

  for (const control of baseline) {
    let values: number[];
    try {
      values = discreteValuesFor(control);
    } catch (error) {
      await recordFailure({
        card,
        lab,
        state,
        action: `build values for ${control.label}`,
        details: [error instanceof Error ? error.message : String(error)],
        failures,
        testInfo,
        screenshotCountRef,
        incrementScreenshotCount
      });
      continue;
    }

    await applyControlSnapshot(card, baseline);
    for (const value of values) {
      const applied = await setControlByIndex(card, control.index, value);
      await commitControlMutationIfNeeded(card);
      statesTested += await checkHealth({
        card,
        lab,
        state,
        action: `${control.label}=${formatValue(applied.value)}`,
        failures,
        testInfo,
        screenshotCountRef,
        incrementScreenshotCount
      });
    }
  }

  for (let firstIndex = 0; firstIndex < baseline.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < baseline.length; secondIndex += 1) {
      const first = baseline[firstIndex];
      const second = baseline[secondIndex];

      for (const firstEndpoint of ["min", "max"] as const) {
        await applyControlSnapshot(card, baseline);
        const firstControl = await getControlByIndex(card, first.index);
        if (!firstControl) continue;
        const firstValue = firstEndpoint === "min" ? firstControl.min : firstControl.max;
        const appliedFirst = await setControlByIndex(card, first.index, firstValue);
        await commitControlMutationIfNeeded(card);
        await page.waitForTimeout(0);

        const refreshedSecond = await getControlByIndex(card, second.index);
        if (!refreshedSecond) continue;

        for (const secondEndpoint of ["min", "max"] as const) {
          const secondValue = secondEndpoint === "min" ? refreshedSecond.min : refreshedSecond.max;
          const appliedSecond = await setControlByIndex(card, second.index, secondValue);
          await commitControlMutationIfNeeded(card);
          statesTested += await checkHealth({
            card,
            lab,
            state,
            action: `${first.label}=${formatValue(appliedFirst.value)} and ${second.label}=${formatValue(appliedSecond.value)}`,
            failures,
            testInfo,
            screenshotCountRef,
            incrementScreenshotCount
          });
        }
      }
    }
  }

  return statesTested;
}

async function collectControls(card: Locator): Promise<ControlInfo[]> {
  return await card.evaluate((root) => {
    function readInputInfo(input: HTMLInputElement, index: number): ControlInfo | null {
      const rect = input.getBoundingClientRect();
      const style = window.getComputedStyle(input);
      if (rect.width <= 1 || rect.height <= 1 || style.display === "none" || style.visibility === "hidden") return null;
      const type = input.type === "number" ? "number" : "range";
      const rawStep = input.step && input.step !== "any" ? Number(input.step) : 1;
      const rawMin = input.min === "" ? 0 : Number(input.min);
      const rawMax = input.max === "" ? 100 : Number(input.max);
      const label = input.closest("label")?.textContent?.replace(/\s+/g, " ").trim() || input.getAttribute("aria-label") || `${type} ${index + 1}`;
      return {
        index,
        type,
        label,
        min: Number.isFinite(rawMin) ? rawMin : 0,
        max: Number.isFinite(rawMax) ? rawMax : 100,
        step: Number.isFinite(rawStep) && rawStep > 0 ? rawStep : 1,
        value: Number(input.value)
      };
    }

    return Array.from(root.querySelectorAll<HTMLInputElement>('input[type="range"], input[type="number"]'))
      .map((input, index) => readInputInfo(input, index))
      .filter((info): info is ControlInfo => info !== null);
  });
}

async function getControlByIndex(card: Locator, index: number) {
  return await card.evaluate((root, controlIndex) => {
    function readInputInfo(input: HTMLInputElement, inputIndex: number): ControlInfo | null {
      const rect = input.getBoundingClientRect();
      const style = window.getComputedStyle(input);
      if (rect.width <= 1 || rect.height <= 1 || style.display === "none" || style.visibility === "hidden") return null;
      const type = input.type === "number" ? "number" : "range";
      const rawStep = input.step && input.step !== "any" ? Number(input.step) : 1;
      const rawMin = input.min === "" ? 0 : Number(input.min);
      const rawMax = input.max === "" ? 100 : Number(input.max);
      const label = input.closest("label")?.textContent?.replace(/\s+/g, " ").trim() || input.getAttribute("aria-label") || `${type} ${inputIndex + 1}`;
      return {
        index: inputIndex,
        type,
        label,
        min: Number.isFinite(rawMin) ? rawMin : 0,
        max: Number.isFinite(rawMax) ? rawMax : 100,
        step: Number.isFinite(rawStep) && rawStep > 0 ? rawStep : 1,
        value: Number(input.value)
      };
    }

    const input = root.querySelectorAll<HTMLInputElement>('input[type="range"], input[type="number"]')[controlIndex];
    return input ? readInputInfo(input, controlIndex) : null;
  }, index);
}

async function applyControlSnapshot(card: Locator, snapshot: ControlInfo[]) {
  for (const control of snapshot) {
    if (!(await getControlByIndex(card, control.index))) continue;
    await setControlByIndex(card, control.index, control.value);
  }
}

async function setControlByIndex(card: Locator, index: number, desiredValue: number) {
  return await card.evaluate((root, payload) => {
    function readInputInfo(input: HTMLInputElement, inputIndex: number): ControlInfo | null {
      const rect = input.getBoundingClientRect();
      const style = window.getComputedStyle(input);
      if (rect.width <= 1 || rect.height <= 1 || style.display === "none" || style.visibility === "hidden") return null;
      const type = input.type === "number" ? "number" : "range";
      const rawStep = input.step && input.step !== "any" ? Number(input.step) : 1;
      const rawMin = input.min === "" ? 0 : Number(input.min);
      const rawMax = input.max === "" ? 100 : Number(input.max);
      const label = input.closest("label")?.textContent?.replace(/\s+/g, " ").trim() || input.getAttribute("aria-label") || `${type} ${inputIndex + 1}`;
      return {
        index: inputIndex,
        type,
        label,
        min: Number.isFinite(rawMin) ? rawMin : 0,
        max: Number.isFinite(rawMax) ? rawMax : 100,
        step: Number.isFinite(rawStep) && rawStep > 0 ? rawStep : 1,
        value: Number(input.value)
      };
    }

    function decimalPlacesForStep(step: number) {
      const [, decimals = ""] = String(step).split(".");
      return Math.min(6, decimals.length);
    }

    function normalizeBrowserValue(control: ControlInfo, value: number) {
      const stepped = control.min + Math.round((value - control.min) / control.step) * control.step;
      const clamped = Math.min(control.max, Math.max(control.min, stepped));
      return Number(clamped.toFixed(decimalPlacesForStep(control.step)));
    }

    const inputs = root.querySelectorAll<HTMLInputElement>('input[type="range"], input[type="number"]');
    const input = inputs[payload.index];
    const control = input ? readInputInfo(input, payload.index) : null;
    if (!control) throw new Error(`Control index ${payload.index} is not available.`);
    const value = normalizeBrowserValue(control, payload.desiredValue);
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
    descriptor?.set?.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return { ...control, value };
  }, { index, desiredValue });
}

async function commitControlMutationIfNeeded(card: Locator) {
  const addPoint = card.getByRole("button", { name: /^Add point$|^加入點$/i });
  if (await addPoint.isVisible().catch(() => false)) {
    await addPoint.click({ timeout: 5000 });
  }
}

function discreteValuesFor(control: ControlInfo) {
  if (!Number.isFinite(control.min) || !Number.isFinite(control.max) || !Number.isFinite(control.step) || control.step <= 0) {
    throw new Error(`Invalid bounds for ${control.label}: min=${control.min}, max=${control.max}, step=${control.step}.`);
  }
  if (control.max < control.min) {
    throw new Error(`Invalid bounds for ${control.label}: max is below min.`);
  }

  const stepCount = Math.round((control.max - control.min) / control.step);
  if (stepCount > maxDiscreteValuesPerControl) {
    throw new Error(`${control.label} has ${stepCount + 1} discrete values, above the production sweep cap of ${maxDiscreteValuesPerControl + 1}.`);
  }

  return uniqueNumbers(
    Array.from({ length: stepCount + 1 }, (_, stepIndex) => normalizeValue(control, control.min + stepIndex * control.step))
  );
}

function normalizeValue(control: ControlInfo, value: number) {
  const stepped = control.min + Math.round((value - control.min) / control.step) * control.step;
  const clamped = Math.min(control.max, Math.max(control.min, stepped));
  return Number(clamped.toFixed(decimalPlaces(control.step)));
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter(Number.isFinite).map((value) => Number(value.toFixed(6)))));
}

function decimalPlaces(value: number) {
  const [, decimals = ""] = String(value).split(".");
  return Math.min(6, decimals.length);
}

async function checkHealth({
  card,
  lab,
  state,
  action,
  failures,
  testInfo,
  screenshotCountRef,
  incrementScreenshotCount
}: {
  card: Locator;
  lab: LabInfo;
  state: string;
  action: string;
  failures: FailureRecord[];
  testInfo: TestInfo;
  screenshotCountRef: () => number;
  incrementScreenshotCount: () => void;
}) {
  let details: string[] = [];

  try {
    details = await collectHealthProblems(card);
  } catch (error) {
    details = [`Unable to inspect lab health: ${error instanceof Error ? error.message : String(error)}`];
  }

  if (details.length > 0) {
    await recordFailure({
      card,
      lab,
      state,
      action,
      details,
      failures,
      testInfo,
      screenshotCountRef,
      incrementScreenshotCount
    });
  }

  return 1;
}

async function collectHealthProblems(card: Locator): Promise<string[]> {
  return await card.evaluate((root) => {
    const problems: string[] = [];
    const surfaces = Array.from(root.querySelectorAll<HTMLElement | SVGElement>("[data-viz-surface]"));
    const invalidPattern = /\b(?:NaN|-?Infinity)\b/;
    const rootText = (root.textContent ?? "").replace(/\s+/g, " ");

    if (invalidPattern.test(rootText)) {
      problems.push("Rendered text contains NaN/Infinity.");
    }

    if (surfaces.length === 0) {
      problems.push("No [data-viz-surface] was rendered.");
    }

    surfaces.forEach((surface, surfaceIndex) => {
      const rect = surface.getBoundingClientRect();
      const surfaceName = surface.getAttribute("aria-label") ?? `surface ${surfaceIndex + 1}`;
      if (rect.width < 20 || rect.height < 20) {
        problems.push(`${surfaceName} has a near-zero rendered size (${Math.round(rect.width)}x${Math.round(rect.height)}).`);
      }

      const invalidAttributeElement = Array.from(surface.querySelectorAll("*")).find((element) =>
        Array.from(element.attributes).some((attribute) => invalidPattern.test(attribute.value))
      );
      if (invalidAttributeElement) {
        problems.push(`${surfaceName} contains NaN/Infinity in SVG/DOM attributes.`);
      }

      const marks = Array.from(surface.querySelectorAll("[data-viz-mark]"));
      if (marks.length === 0) {
        problems.push(`${surfaceName} has no [data-viz-mark] elements.`);
      }

      const visibleMarks = marks.filter((mark) => {
        const markRect = mark.getBoundingClientRect();
        const style = window.getComputedStyle(mark);
        return Math.max(markRect.width, markRect.height) > 1 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity || "1") !== 0;
      });
      if (marks.length > 0 && visibleMarks.length === 0) {
        problems.push(`${surfaceName} rendered marks, but none had visible geometry.`);
      }
    });

    Array.from(root.querySelectorAll<HTMLInputElement>('input[type="range"], input[type="number"]')).forEach((input, index) => {
      const value = Number(input.value);
      const min = input.min === "" ? Number.NEGATIVE_INFINITY : Number(input.min);
      const max = input.max === "" ? Number.POSITIVE_INFINITY : Number(input.max);
      const label = input.closest("label")?.textContent?.replace(/\s+/g, " ").trim() || input.getAttribute("aria-label") || `input ${index + 1}`;
      if (!Number.isFinite(value)) {
        problems.push(`${label} has a non-finite input value.`);
      }
      if (Number.isFinite(min) && value < min - 1e-6) {
        problems.push(`${label} value ${value} is below min ${min}.`);
      }
      if (Number.isFinite(max) && value > max + 1e-6) {
        problems.push(`${label} value ${value} is above max ${max}.`);
      }
    });

    return problems;
  });
}

async function recordFailure({
  card,
  lab,
  state,
  action,
  details,
  failures,
  testInfo,
  screenshotCountRef,
  incrementScreenshotCount
}: {
  card: Locator;
  lab: LabInfo;
  state: string;
  action: string;
  details: string[];
  failures: FailureRecord[];
  testInfo: TestInfo;
  screenshotCountRef: () => number;
  incrementScreenshotCount: () => void;
}) {
  failures.push({
    labId: lab.id,
    title: lab.title,
    state,
    action,
    details,
    controls: await collectCurrentControlValues(card)
  });

  if (screenshotCountRef() < maxFailureScreenshots) {
    incrementScreenshotCount();
    await testInfo.attach(`production-viz-${sanitizeAttachmentName(`${lab.id}-${state}-${action}`)}.png`, {
      body: await card.screenshot(),
      contentType: "image/png"
    });
  }
}

async function collectCurrentControlValues(card: Locator) {
  return await card.locator(controlSelector).evaluateAll((elements) =>
    elements.map((element, index) => {
      const input = element as HTMLInputElement;
      const label = input.closest("label")?.textContent?.replace(/\s+/g, " ").trim() || input.getAttribute("aria-label") || `input ${index + 1}`;
      return `${label}: ${input.value}`;
    }).join("; ")
  ).catch(() => "");
}

function collectProductionDiagnostics(page: Page) {
  const issues: RuntimeIssue[] = [];

  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    if (isExpectedMe401(url, status)) return;
    issues.push({ kind: "bad-response", message: `${status} ${response.request().method()} ${url}` });
  });

  page.on("requestfailed", (request) => {
    const failureText = request.failure()?.errorText ?? "unknown failure";
    if (isExpectedAbortedPrefetch(request, failureText)) return;
    issues.push({ kind: "request-failed", message: `${request.method()} ${request.url()} ${failureText}` });
  });

  page.on("pageerror", (error) => {
    issues.push({ kind: "page-error", message: error.message });
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (isExpectedConsoleNoise(text)) return;
    issues.push({ kind: "console-error", message: text });
  });

  return {
    issues: () => issues
  };
}

function isExpectedMe401(url: string, status: number) {
  return status === 401 && safePathname(url) === "/api/me";
}

function isExpectedAbortedPrefetch(request: Request, failureText: string) {
  if (!/ERR_ABORTED/i.test(failureText)) return false;
  const url = request.url();
  return url.includes("_rsc=") || request.resourceType() === "fetch" || request.resourceType() === "document";
}

function isExpectedConsoleNoise(text: string) {
  return /Failed to load resource: the server responded with a status of 401/i.test(text) ||
    /Failed to load resource: net::ERR_ABORTED/i.test(text);
}

function safePathname(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

function initializeReportForProject(projectName: string) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  if (projectName !== "desktop-chrome" && fs.existsSync(reportPath)) return;

  fs.writeFileSync(
    reportPath,
    [
      "# Production Visualization Lab Value Sweep",
      "",
      `- Date: ${reportDate}`,
      `- Target: ${productionOrigin}/visualization-lab`,
      "- Scope: Production-only read-only QA sweep for Visualization Lab controls.",
      "- Definition of every value: every runtime discrete value per visible control, plus pairwise min/max combinations with dependent bounds re-queried.",
      "- Mutation guard: skips `Mark explored` so production visualization-session progress is not written.",
      ""
    ].join("\n")
  );
}

function writeProjectReport(report: RunReport) {
  const status = report.fatalError || report.failures.length > 0 || report.runtimeIssues.length > 0 ? "Failed" : "Passed";
  const countRows = [
    ["Home page visualization metric", nullableCount(report.homeVisualizationCount)],
    ["Visualization page advertised count", nullableCount(report.labPageAdvertisedCount)],
    ["Discovered lab sections", String(report.discoveredCount)],
    ["Minimum expected lab sections", String(report.expectedMinimumCount)]
  ];

  const lines = [
    `## ${report.projectName}`,
    "",
    `- Status: ${status}`,
    `- Started: ${report.startedAt}`,
    `- Ended: ${report.endedAt}`,
    `- States checked: ${report.statesTested}`,
    `- Distinct controls found: ${report.controlsTested}`,
    `- Non-mutating buttons exercised: ${report.buttonsTested}`,
    "",
    "### Count Verification",
    "",
    markdownTable(["Source", "Count"], countRows),
    "",
    "### Lab Coverage",
    "",
    markdownTable(
      ["Lab", "Controls", "Buttons", "States", "Failures"],
      report.labSummaries.map((lab) => [
        `${lab.title} (${lab.id})`,
        Array.from(lab.controls).join("<br>") || "None",
        uniqueStrings(lab.buttons).join("<br>") || "None",
        String(lab.statesTested),
        String(lab.failures)
      ])
    ),
    "",
    "### Warnings",
    "",
    report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- None",
    "",
    "### Runtime Issues",
    "",
    report.runtimeIssues.length ? report.runtimeIssues.map((issue) => `- ${issue.kind}: ${issue.message}`).join("\n") : "- None",
    "",
    "### Functional Failures",
    "",
    report.failures.length ? report.failures.slice(0, 60).map((failure, index) =>
      `${index + 1}. ${failure.title} (${failure.labId}), ${failure.state}, ${failure.action}: ${failure.details.join(" | ")}${failure.controls ? `; controls: ${failure.controls}` : ""}`
    ).join("\n") : "- None",
    report.failures.length > 60 ? `\n- ${report.failures.length - 60} additional failures omitted from this summary; inspect Playwright trace/screenshots for details.` : "",
    "",
    "### Fatal Error",
    "",
    report.fatalError ? `- ${report.fatalError}` : "- None",
    ""
  ];

  fs.appendFileSync(reportPath, `\n${lines.join("\n")}`);
}

function markdownTable(headers: string[], rows: string[][]) {
  return [
    `| ${headers.map(escapeMarkdownCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`)
  ].join("\n");
}

function escapeMarkdownCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function nullableCount(value: number | null) {
  return value === null ? "Not found" : String(value);
}

function controlLabel(control: ControlInfo) {
  return `${control.type}:${control.label} [${formatValue(control.min)}..${formatValue(control.max)} step ${formatValue(control.step)}]`;
}

function formatFailureSummary(failures: FailureRecord[], runtimeIssues: RuntimeIssue[], projectName: string) {
  const failureLines = failures.slice(0, 12).map((failure, index) =>
    `${index + 1}. ${failure.labId} ${failure.state} ${failure.action}: ${failure.details.join(" | ")}`
  );
  const runtimeLines = runtimeIssues.slice(0, 12).map((issue, index) =>
    `${index + 1}. ${issue.kind}: ${issue.message}`
  );
  return [
    `Production visualization value sweep failed for ${projectName}.`,
    failures.length ? `Functional failures (${failures.length}):\n${failureLines.join("\n")}` : "Functional failures: 0",
    runtimeIssues.length ? `Runtime issues (${runtimeIssues.length}):\n${runtimeLines.join("\n")}` : "Runtime issues: 0",
    `Report: ${reportPath}`
  ].join("\n\n");
}

function formatValue(value: number) {
  if (!Number.isFinite(value)) return String(value);
  return Number(value.toFixed(6)).toString();
}

function nearlyEqual(first: number, second: number) {
  return Math.abs(first - second) < 1e-6;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function sanitizeAttachmentName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

function originFor(rawUrl: string) {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

function hongKongDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}
