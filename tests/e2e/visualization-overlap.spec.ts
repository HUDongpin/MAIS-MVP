import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import {
  buildVisualizationLabHref,
  selectPremiumThreeDSceneVariantSmokeLabs,
  visualizationLabSectionSelector
} from "../../components/visualizations/visualizationDiagnostics";
import { isLivePremiumThreeDLab } from "../../components/visualizations/three/premiumThreeDLiveContract";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import { collectPageErrors, expectNoPageErrors, uniqueSuffix } from "./helpers";
import type { FeaturedLabDefinition } from "../../data/visualizationLabs";

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
  canvasSurfaceCount: number;
};

type FailureRecord = {
  language: "en" | "zh" | "zh-Hans";
  topicId: string;
  title: string;
  state: string;
  sliderValues: string;
  issues: OverlapIssue[];
};

// VIZ_OVERLAP_SAMPLE=N audits every Nth lab (smoke runs); default sweeps all labs.
const overlapSampleStride = Math.max(1, Number(process.env.VIZ_OVERLAP_SAMPLE ?? "1") || 1);
const allVisualizationLabs = visualizationLabCatalog.filter((_, index) => index % overlapSampleStride === 0);

const expectedLabIds = new Set(allVisualizationLabs.map((lab) => lab.labId));
const htmlLangByLanguage = { en: /^en/, zh: /^zh-Hant/, "zh-Hans": /^zh-Hans/ } as const;
const maxAttachedFailures = 4;

async function dismissGuestGate(page: Page) {
  const guestButton = page.getByRole("button", { name: /continue as guest|以訪客身份繼續|以访客身份继续/i });
  if (await guestButton.isVisible().catch(() => false)) {
    await guestButton.click();
    await expect(guestButton).toBeHidden();
  }
}

async function switchLanguage(page: Page, optionPattern: RegExp, expectedLang: string) {
  await page.goto("/visualization-lab");
  await dismissGuestGate(page);
  // The dropdown's click handler hydrates late, so the first trusted click can
  // land before the menu is interactive; retry open-until-visible.
  const option = page.getByRole("menuitemradio", { name: optionPattern }).first();
  await expect(async () => {
    // The selector button's accessible name localizes with the active UI
    // language (Language selector / 語言選擇 / 语言选择).
    await page.getByRole("button", { name: /language selector|語言選擇|语言选择/i }).click();
    await expect(option).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 30_000 });
  // The header language menu renders options as menuitemradio buttons
  // (e.g. aria-label "Use Traditional Chinese").
  await option.click();
  await expect(page.locator("html")).toHaveAttribute("lang", expectedLang);
}

test.describe("Visualization Lab overlap detection", () => {
  test("detects text labels overlapping graph marks after slider changes", async ({ page }, testInfo) => {
    test.slow();
    // The guest catalog spans every track (689 labs x 3 languages) via direct
    // per-lab navigation at roughly 25-35s per visit. Within this 60-minute
    // budget use VIZ_OVERLAP_SAMPLE >= 18; full-catalog sweeps should shard
    // (per language or track) across nightly jobs.
    test.setTimeout(3_600_000);
    const pageErrors = collectPageErrors(page);
    const failures: FailureRecord[] = [];
    const visitedLabIds = new Set<string>();
    const rangeControlledLabIds = new Set<string>();
    const exercisedRangeLabIds = new Set<string>();
    let attachedFailures = 0;

    // Guests see the full multi-track catalog; logged-in students are scoped
    // to their own curriculum, which would hide most labs from the audit.
    // The guest sign-in gate re-opens periodically while browsing, so a
    // locator handler dismisses it whenever it would block an interaction.
    const guestGateButton = page.getByRole("button", { name: /continue as guest|以訪客身份繼續|以访客身份继续/i });
    await page.addLocatorHandler(guestGateButton, async (button) => {
      await button.click();
    });
    await page.goto("/visualization-lab");
    await disableMotion(page);
    await dismissGuestGate(page);
    await expect(page.getByRole("heading", { name: /Visualization Lab/i }).first()).toBeVisible();

    await auditLanguage("en");

    await switchLanguage(page, /Use Traditional Chinese|使用繁體中文|使用繁体中文/, "zh-Hant-HK");
    await auditLanguage("zh");

    await switchLanguage(page, /Use Simplified Chinese|使用簡體中文|使用简体中文/, "zh-Hans-CN");
    await auditLanguage("zh-Hans");

    expect(visitedLabIds).toEqual(expectedLabIds);
    expect(rangeControlledLabIds).toEqual(exercisedRangeLabIds);
    expectNoPageErrors(pageErrors);

    if (failures.length > 0) {
      throw new Error(formatFailureSummary(failures, testInfo.project.name));
    }

    async function auditLanguage(language: "en" | "zh" | "zh-Hans") {
      for (const lab of allVisualizationLabs) {
        // Direct navigation covers both lab routes (standard directory panel
        // and premium Three.js topic pages) without brittle tile scrolling.
        // domcontentloaded keeps heavy Three.js chunk downloads off the
        // critical path; the surface-visibility wait below gates readiness.
        await page.goto(buildVisualizationLabHref(lab), { waitUntil: "domcontentloaded" });
        await disableMotion(page);
        await dismissGuestGate(page);

        // The stored language preference re-applies shortly after hydration;
        // gate on it so every scan sees localized strings.
        await expect(page.locator("html")).toHaveAttribute("lang", htmlLangByLanguage[language]);

        const labRoot = page.locator("main").first();
        await expect(
          labRoot.locator("[data-viz-surface]").first(),
          `${lab.topicId} should render a visualization surface in ${language}`
        ).toBeVisible({ timeout: 15_000 });
        visitedLabIds.add(lab.labId);

        const sliders = await collectSliderInfo(labRoot);
        const sliderStates = buildSliderStates(sliders);
        if (sliders.length > 0) rangeControlledLabIds.add(lab.labId);

        for (const state of sliderStates) {
          await applySliderState(labRoot, sliders, state);
          if (sliders.length > 0) exercisedRangeLabIds.add(lab.labId);
          await recordIssues(labRoot, lab, language, state.name);
        }

        // Every mode button must hold the no-collision contract too.
        const modeButtons = labRoot.locator("[data-viz-mode-button]");
        const modeCount = await modeButtons.count();
        for (let modeIndex = 1; modeIndex < modeCount; modeIndex += 1) {
          await modeButtons.nth(modeIndex).click();
          await page.waitForTimeout(30);
          await recordIssues(labRoot, lab, language, `mode=${modeIndex}`);
        }
      }

      async function recordIssues(
        labSection: Locator,
        lab: (typeof allVisualizationLabs)[number],
        recordLanguage: "en" | "zh" | "zh-Hans",
        stateName: string
      ) {
        const result = await detectVisualizationOverlaps(labSection);
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

        if (result.coverage.length === 0 && result.canvasSurfaceCount === 0) {
          issues.unshift({
            surface: "missing data-viz-surface",
            label: "coverage",
            mark: "missing checked visualization surface",
            labelRect: { x: 0, y: 0, width: 0, height: 0 },
            markRect: { x: 0, y: 0, width: 0, height: 0 },
            intersection: { x: 0, y: 0, width: 0, height: 0 }
          });
        }

        if (issues.length === 0) return;

        const sliderValues = await collectCurrentSliderValues(labSection);
        failures.push({
          language: recordLanguage,
          topicId: lab.topicId,
          title: lab.title.en,
          state: stateName,
          sliderValues,
          issues
        });

        if (attachedFailures < maxAttachedFailures) {
          attachedFailures += 1;
          await attachLabScreenshot(testInfo, labSection, `${recordLanguage}-${lab.topicId}-${attachedFailures}`);
        }
      }
    }
  });

  test("learner-live premium Three.js labs stay visible on mobile", async ({ browser }, testInfo) => {
    test.setTimeout(120_000);
    const liveVariantTargets = selectPremiumThreeDSceneVariantSmokeLabs(visualizationLabCatalog);
    const californiaTargets = selectPremiumThreeDSceneVariantSmokeLabs(
      visualizationLabCatalog.filter((lab) => lab.publisher === "US_CA_MATH")
    );
    const californiaVariants = new Set(californiaTargets.map((target) => target.sceneVariant));
    const targetLabs = [
      ...californiaTargets,
      ...liveVariantTargets.filter((target) => !californiaVariants.has(target.sceneVariant))
    ].slice(0, 3);

    expect(californiaTargets.length, "California should expose learner-live premium 3D labs").toBeGreaterThan(0);
    expect(targetLabs.length, "mobile premium smoke should cover three distinct live variants").toBe(3);

    for (const target of targetLabs) {
      // Each premium lab gets a fresh browser context: sequential WebGL
      // canvases in one page exhaust headless GL contexts, which unmounts the
      // r3f surface mid-assertion and flakes the attribute checks.
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const pageErrors = collectPageErrors(page);

      const lab = target.lab;
      expect(isLivePremiumThreeDLab(lab), `${lab.labId} should remain learner-live`).toBe(true);
      await registerVisualizationStudentForLab(page, testInfo, lab);
      await page.goto(buildVisualizationLabHref(lab));
      await disableMotion(page);

      const section = page.locator(visualizationLabSectionSelector(lab));
      await expect(section).toBeVisible();
      const surface = section.locator('[data-viz-surface][data-viz-renderer="three-r3f"]');
      await expect(surface).toBeVisible({ timeout: 20_000 });
      await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true");
      await expect(surface).toHaveAttribute("data-viz-family-id", target.familyId);
      await expect(surface).toHaveAttribute("data-viz-scene-variant", target.sceneVariant);
      const box = await surface.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(250);
      expect(box?.height ?? 0).toBeGreaterThan(130);

      expectNoPageErrors(pageErrors);
      await context.close();
    }
  });

  test("MAIS Manim function graph surface stays visible on mobile", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const lab = visualizationLabCatalog.find(
      (candidate) => candidate.labId === "us-ca-math-s4-chapter-04" && isLivePremiumThreeDLab(candidate)
    );

    expect(lab, "a learner-live function graph lab should exist").toBeTruthy();

    await page.setViewportSize({ width: 390, height: 844 });
    await registerVisualizationStudentForLab(page, testInfo, lab!);
    await page.goto(buildVisualizationLabHref(lab!), { waitUntil: "domcontentloaded" });
    await disableMotion(page);

    const section = page.locator(visualizationLabSectionSelector(lab!));
    await expect(section).toBeVisible();
    const surface = section.locator('[data-viz-surface][data-viz-renderer="three-r3f"]');
    await expect(surface).toBeVisible({ timeout: 20_000 });
    await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true");
    await expect(surface).toHaveAttribute("data-viz-runtime", "mais-manim");
    await expect(surface).toHaveAttribute("data-viz-scene-id", "mais-manim-function-graph");
    await expect(surface.locator("[data-viz-manim-formula-overlay]")).toBeVisible();

    const surfaceBox = await surface.boundingBox();
    const overlayBox = await surface.locator("[data-viz-manim-formula-overlay]").boundingBox();
    expect(surfaceBox?.width ?? 0).toBeGreaterThan(250);
    expect(surfaceBox?.height ?? 0).toBeGreaterThan(130);
    expect(overlayBox?.width ?? 0).toBeGreaterThan(40);
    expect(overlayBox?.height ?? 0).toBeGreaterThan(20);
    expect((overlayBox?.x ?? 0) + (overlayBox?.width ?? 0)).toBeLessThanOrEqual((surfaceBox?.x ?? 0) + (surfaceBox?.width ?? 0) + 1);
    expect((overlayBox?.y ?? 0) + (overlayBox?.height ?? 0)).toBeLessThanOrEqual((surfaceBox?.y ?? 0) + (surfaceBox?.height ?? 0) + 1);

    expectNoPageErrors(pageErrors);
  });
});

async function registerVisualizationStudentForLab(page: Page, testInfo: TestInfo, lab: FeaturedLabDefinition) {
  const suffix = `${uniqueSuffix(testInfo)}-${lab.labId}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase().slice(0, 48);
  const username = `visualization-mobile-${suffix}@example.test`;
  const isUnitedStates = lab.curriculumTrack === "US";
  const unitedStatesPublisher = isUnitedStates ? (lab.publisher ?? "US_CA_MATH") : null;
  const isMainland = lab.curriculumTrack.startsWith("MAINLAND") || lab.publisher?.startsWith("MAINLAND");
  const response = await page.request.post("/api/auth/register", {
    data: {
      role: "student",
      name: `Visualization Mobile ${suffix}`,
      username,
      email: username,
      password: "start12345",
      grade: lab.grade,
      curriculumTrack: unitedStatesPublisher ?? (isMainland ? "MAINLAND_PEP_HIGH" : "HK"),
      curriculumProfile: unitedStatesPublisher
        ? { region: "US", publisher: unitedStatesPublisher }
        : isMainland
          ? { region: "MAINLAND", publisher: lab.publisher ?? "MAINLAND_PEP" }
          : { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      language: "en",
      theme: "dark"
    }
  });

  expect(response.status(), `register visualization student for ${lab.labId}`).toBe(200);
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
    // WebGL canvas surfaces (data-viz-renderer) carry no SVG text/marks; the
    // 2D SVG surface is the collision-checkable model, so canvases are skipped.
    const allSurfaces = Array.from(root.querySelectorAll<HTMLElement | SVGElement>("[data-viz-surface]"));
    const surfaces = allSurfaces.filter((surface) => !surface.hasAttribute("data-viz-renderer") && !surface.closest('[aria-hidden="true"]'));
    const canvasSurfaceCount = allSurfaces.length - surfaces.length;
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

    return { issues, coverage, canvasSurfaceCount };
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
