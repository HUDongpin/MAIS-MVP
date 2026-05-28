import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import { collectPageErrors, expectNoPageErrors, loginAsDemoStudent } from "./helpers";

type SliderInfo = {
  index: number;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
};

type SliderState = {
  name: string;
  values: Array<{ index: number; value: number }>;
};

type VizRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type OverlapIssue = {
  surface: string;
  label: string;
  mark: string;
  labelRect: VizRect;
  markRect: VizRect;
  intersection: VizRect;
};

type SurfaceCoverage = {
  surface: string;
  labels: number;
  marks: number;
};

type DetectionResult = {
  issues: OverlapIssue[];
  coverage: SurfaceCoverage[];
};

type FailureRecord = {
  language: "en" | "zh" | "zh-Hans";
  topicId: string;
  title: string;
  state: string;
  sliderValues: string;
  issues: OverlapIssue[];
};

const allVisualizationLabs = visualizationLabCatalog.map((lab) => ({
  grade: lab.grade,
  labId: lab.labId,
  title: lab.title.en,
  topicId: lab.topicId,
  moduleId: lab.moduleId
}));

const expectedLabIds = new Set(allVisualizationLabs.map((lab) => lab.labId));
const maxAttachedFailures = 4;

test.describe("Visualization Lab overlap detection", () => {
  test("detects text labels overlapping graph marks after slider changes", async ({ page }, testInfo) => {
    test.slow();
    test.setTimeout(240_000);
    const pageErrors = collectPageErrors(page);
    const failures: FailureRecord[] = [];
    const visitedLabIds = new Set<string>();
    const rangeControlledLabIds = new Set<string>();
    const exercisedRangeLabIds = new Set<string>();
    let attachedFailures = 0;

    await loginAsDemoStudent(page);
    await page.goto("/visualization-lab");
    await disableMotion(page);
    await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible();
    await ensureAllGradesVisible(page);

    await auditLanguage("en");

    await page.getByRole("button", { name: "使用繁體中文" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-HK");
    await ensureAllGradesVisible(page);
    await auditLanguage("zh");

    await page.getByRole("button", { name: "使用簡體中文" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans-CN");
    await ensureAllGradesVisible(page);
    await auditLanguage("zh-Hans");

    expect(visitedLabIds).toEqual(expectedLabIds);
    expect(rangeControlledLabIds).toEqual(exercisedRangeLabIds);
    expectNoPageErrors(pageErrors);

    if (failures.length > 0) {
      throw new Error(formatFailureSummary(failures, testInfo.project.name));
    }

    async function auditLanguage(language: "en" | "zh" | "zh-Hans") {
      for (const lab of allVisualizationLabs) {
        const labCard = page.locator(`#lab-example-${lab.labId}`);
        await expect(labCard, `${lab.topicId} should render in ${language}`).toBeVisible();
        await labCard.scrollIntoViewIfNeeded();
        visitedLabIds.add(lab.labId);
        await openLabIfNeeded(labCard);

        const sliders = await collectSliderInfo(labCard);
        const sliderStates = buildSliderStates(sliders);
        if (sliders.length > 0) rangeControlledLabIds.add(lab.labId);

        for (const state of sliderStates) {
          await applySliderState(labCard, sliders, state);
          if (sliders.length > 0) exercisedRangeLabIds.add(lab.labId);

          const result = await detectVisualizationOverlaps(labCard);
          const coverageProblems = result.coverage
            .filter((surface) => surface.marks === 0)
            .map((surface) => ({
              surface: surface.surface,
              label: "coverage",
              mark: "missing data-viz-mark",
              labelRect: { x: 0, y: 0, width: 0, height: 0 },
              markRect: { x: 0, y: 0, width: 0, height: 0 },
              intersection: { x: 0, y: 0, width: 0, height: 0 }
            }));
          const issues = [...coverageProblems, ...result.issues];

          if (result.coverage.length === 0) {
            issues.unshift({
              surface: "missing data-viz-surface",
              label: "coverage",
              mark: "missing checked visualization surface",
              labelRect: { x: 0, y: 0, width: 0, height: 0 },
              markRect: { x: 0, y: 0, width: 0, height: 0 },
              intersection: { x: 0, y: 0, width: 0, height: 0 }
            });
          }

          if (issues.length === 0) continue;

          const sliderValues = await collectCurrentSliderValues(labCard);
          failures.push({
            language,
            topicId: lab.topicId,
            title: lab.title,
            state: state.name,
            sliderValues,
            issues
          });

          if (attachedFailures < maxAttachedFailures) {
            attachedFailures += 1;
            await attachLabScreenshot(testInfo, labCard, `${language}-${lab.topicId}-${attachedFailures}`);
          }
        }
      }
    }
  });
});

async function ensureAllGradesVisible(page: Page) {
  const lastLab = allVisualizationLabs[allVisualizationLabs.length - 1];
  const lastLabCard = page.locator(`#lab-example-${lastLab.labId}`);
  if (await lastLabCard.isVisible().catch(() => false)) return;

  await page.getByRole("button", { name: /Explore all labs|Explore other grades|探索全部實驗|探索全部实验|探索其他年級/i }).click();
  await expect(lastLabCard).toBeVisible();
}

async function openLabIfNeeded(card: Locator) {
  if ((await card.locator("[data-viz-surface]").count()) > 0) return;

  const openButton = card.getByRole("button", { name: /Open lab|開啟實驗|开启实验/i });
  if (await openButton.isVisible().catch(() => false)) {
    await openButton.click();
  }
  await expect(card.locator("[data-viz-surface]").first()).toBeVisible();
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

async function collectSliderInfo(card: Locator): Promise<SliderInfo[]> {
  const ranges = card.locator('input[type="range"]');
  const count = await ranges.count();
  const infos: SliderInfo[] = [];

  for (let index = 0; index < count; index += 1) {
    const range = ranges.nth(index);
    infos.push(await range.evaluate((element, rangeIndex) => {
      const input = element as HTMLInputElement;
      const label = input.closest("label");
      const step = input.step && input.step !== "any" ? Number(input.step) : 1;
      const min = input.min ? Number(input.min) : 0;
      const max = input.max ? Number(input.max) : 100;
      return {
        index: rangeIndex,
        label: (input.getAttribute("aria-label") ?? label?.innerText ?? `range ${rangeIndex + 1}`).replace(/\s+/g, " ").trim(),
        min,
        max,
        step: Number.isFinite(step) && step > 0 ? step : 1,
        value: Number(input.value)
      };
    }, index));
  }

  return infos;
}

function buildSliderStates(sliders: SliderInfo[]): SliderState[] {
  const states = new Map<string, SliderState>();
  const addState = (state: SliderState) => {
    const key = JSON.stringify(state.values.map((entry) => [entry.index, entry.value]).sort((a, b) => a[0] - b[0]));
    if (!states.has(key)) states.set(key, state);
  };

  addState({ name: "default", values: [] });

  sliders.forEach((slider) => {
    sliderValuesFor(slider).forEach((value) => {
      addState({
        name: `${shortLabel(slider.label)}=${formatSliderValue(value)}`,
        values: [{ index: slider.index, value }]
      });
    });
  });

  for (let first = 0; first < sliders.length; first += 1) {
    for (let second = first + 1; second < sliders.length; second += 1) {
      [sliders[first].min, sliders[first].max].forEach((firstValue) => {
        [sliders[second].min, sliders[second].max].forEach((secondValue) => {
          addState({
            name: `${shortLabel(sliders[first].label)}=${formatSliderValue(firstValue)} ${shortLabel(sliders[second].label)}=${formatSliderValue(secondValue)}`,
            values: [
              { index: sliders[first].index, value: normalizeSliderValue(sliders[first], firstValue) },
              { index: sliders[second].index, value: normalizeSliderValue(sliders[second], secondValue) }
            ]
          });
        });
      });
    }
  }

  const exhaustiveOptions = sliders.map((slider) => discreteValuesFor(slider));
  const exhaustiveCount = exhaustiveOptions.reduce((count, options) => count * options.length, 1);
  if (sliders.length > 0 && exhaustiveCount <= 12) {
    buildCartesianStates(exhaustiveOptions).forEach((values) => {
      addState({
        name: `exhaustive ${values.map((value, index) => `${shortLabel(sliders[index].label)}=${formatSliderValue(value)}`).join(" ")}`,
        values: values.map((value, index) => ({ index: sliders[index].index, value }))
      });
    });
  }

  return Array.from(states.values());
}

function sliderValuesFor(slider: SliderInfo) {
  return uniqueNumbers([
    slider.min,
    slider.max,
    midpointFor(slider)
  ].map((value) => normalizeSliderValue(slider, value)));
}

function discreteValuesFor(slider: SliderInfo) {
  const stepCount = Math.round((slider.max - slider.min) / slider.step);
  if (Number.isFinite(stepCount) && stepCount >= 0 && stepCount <= 5) {
    return uniqueNumbers(Array.from({ length: stepCount + 1 }, (_, stepIndex) => normalizeSliderValue(slider, slider.min + stepIndex * slider.step)));
  }

  return uniqueNumbers([
    slider.min,
    midpointFor(slider),
    slider.max
  ].map((value) => normalizeSliderValue(slider, value)));
}

function buildCartesianStates(options: number[][]) {
  return options.reduce<number[][]>(
    (states, values) => states.flatMap((state) => values.map((value) => [...state, value])),
    [[]]
  );
}

function midpointFor(slider: SliderInfo) {
  return normalizeSliderValue(slider, slider.min + (slider.max - slider.min) / 2);
}

function normalizeSliderValue(slider: SliderInfo, value: number) {
  const stepped = slider.min + Math.round((value - slider.min) / slider.step) * slider.step;
  return Number(Math.min(slider.max, Math.max(slider.min, stepped)).toFixed(decimalPlaces(slider.step)));
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter(Number.isFinite).map((value) => Number(value.toFixed(4)))));
}

function decimalPlaces(value: number) {
  const [, decimals = ""] = String(value).split(".");
  return Math.min(4, decimals.length);
}

async function applySliderState(card: Locator, sliders: SliderInfo[], state: SliderState) {
  const ranges = card.locator('input[type="range"]');

  for (const slider of sliders) {
    await setRangeValue(ranges.nth(slider.index), slider.value);
  }

  for (const entry of state.values) {
    await setRangeValue(ranges.nth(entry.index), entry.value);
  }

  await card.page().waitForTimeout(40);
}

async function setRangeValue(range: Locator, value: number) {
  await range.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
    descriptor?.set?.call(input, String(nextValue));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function collectCurrentSliderValues(card: Locator) {
  return await card.locator('input[type="range"]').evaluateAll((elements) =>
    elements.map((element, index) => {
      const input = element as HTMLInputElement;
      const label = input.closest("label");
      const text = (input.getAttribute("aria-label") ?? label?.innerText ?? `range ${index + 1}`).replace(/\s+/g, " ").trim();
      return `${text}: ${input.value}`;
    }).join("; ")
  );
}

async function detectVisualizationOverlaps(card: Locator): Promise<DetectionResult> {
  return await card.evaluate((root) => {
    const tolerance = 4;
    const surfaces = Array.from(root.querySelectorAll<HTMLElement | SVGElement>("[data-viz-surface]"));
    const issues: OverlapIssue[] = [];
    const coverage: SurfaceCoverage[] = [];

    function rectFor(element: Element): VizRect {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x * 10) / 10,
        y: Math.round(rect.y * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10
      };
    }

    function visible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") !== 0;
    }

    function surfaceName(surface: Element, index: number) {
      return surface.getAttribute("aria-label") ?? surface.getAttribute("data-viz-surface") ?? `surface ${index + 1}`;
    }

    function textFor(element: Element) {
      return (element.textContent ?? element.getAttribute("aria-label") ?? element.tagName.toLowerCase()).replace(/\s+/g, " ").trim().slice(0, 90);
    }

    function markName(element: Element, index: number) {
      const name = element.getAttribute("data-viz-name") ?? element.getAttribute("aria-label") ?? element.tagName.toLowerCase();
      return `${name}#${index + 1}`;
    }

    surfaces.forEach((surface, surfaceIndex) => {
      const labels = Array.from(new Set([
        ...Array.from(surface.querySelectorAll("text")),
        ...Array.from(surface.querySelectorAll("[data-viz-label]"))
      ]))
        .filter((element) => !element.closest("[data-viz-overlap-ok]"))
        .filter(visible);
      const marks = Array.from(surface.querySelectorAll("[data-viz-mark]"))
        .filter((element) => !element.closest("[data-viz-overlap-ok]"))
        .filter(visible);

      const name = surfaceName(surface, surfaceIndex);
      coverage.push({ surface: name, labels: labels.length, marks: marks.length });

      labels.forEach((label) => {
        const labelRect = label.getBoundingClientRect();
        marks.forEach((mark, markIndex) => {
          if (mark.contains(label) || label.contains(mark)) return;

          const markRect = mark.getBoundingClientRect();
          const left = Math.max(labelRect.left, markRect.left);
          const right = Math.min(labelRect.right, markRect.right);
          const top = Math.max(labelRect.top, markRect.top);
          const bottom = Math.min(labelRect.bottom, markRect.bottom);
          const width = right - left;
          const height = bottom - top;
          if (width <= tolerance || height <= tolerance) return;

          issues.push({
            surface: name,
            label: textFor(label),
            mark: markName(mark, markIndex),
            labelRect: rectFor(label),
            markRect: rectFor(mark),
            intersection: {
              x: Math.round(left * 10) / 10,
              y: Math.round(top * 10) / 10,
              width: Math.round(width * 10) / 10,
              height: Math.round(height * 10) / 10
            }
          });
        });
      });
    });

    return { issues, coverage };
  });
}

async function attachLabScreenshot(testInfo: TestInfo, card: Locator, name: string) {
  await testInfo.attach(`visualization-overlap-${sanitizeAttachmentName(name)}.png`, {
    body: await card.screenshot(),
    contentType: "image/png"
  });
}

function formatFailureSummary(failures: FailureRecord[], projectName: string) {
  const lines = failures.slice(0, 24).map((failure, index) => {
    const issueSummary = failure.issues.slice(0, 5).map((issue) =>
      `${issue.label} vs ${issue.mark} on ${issue.surface} at ${JSON.stringify(issue.intersection)}`
    ).join(" | ");
    return `${index + 1}. [${projectName}/${failure.language}] ${failure.topicId} (${failure.title}) state="${failure.state}" sliders="${failure.sliderValues || "none"}": ${issueSummary}`;
  });
  const remaining = failures.length > lines.length ? `\n...and ${failures.length - lines.length} more failing states.` : "";
  return `Visualization text/graph overlap detector found ${failures.length} failing state(s):\n${lines.join("\n")}${remaining}`;
}

function shortLabel(label: string) {
  return label.replace(/\s+/g, " ").trim().slice(0, 28);
}

function formatSliderValue(value: number) {
  return Number(value.toFixed(4)).toString();
}

function sanitizeAttachmentName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
