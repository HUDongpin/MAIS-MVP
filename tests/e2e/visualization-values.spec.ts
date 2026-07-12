import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { buildVisualizationLabHref, selectPremiumThreeDSceneVariantSmokeLabs, visualizationLabSectionSelector } from "../../components/visualizations/visualizationDiagnostics";
import { visualizationLabCatalog, type FeaturedLabDefinition } from "../../data/visualizationLabs";
import { collectPageErrors, expectNoPageErrors, loginAsDemoStudentApi, uniqueSuffix } from "./helpers";

const sweepMode = process.env.VISUALIZATION_SWEEP_MODE === "strict" ? "strict" : "extremes";
const sweepGrades = envSet("VISUALIZATION_SWEEP_GRADES");
const sweepTracks = envSet("VISUALIZATION_SWEEP_TRACKS");
const sweepLabIds = envSet("VISUALIZATION_SWEEP_LABS");
const maxDiscreteValuesPerControl = 500;
const selectedLabs = visualizationLabCatalog.filter((lab) =>
  (!sweepGrades.size || sweepGrades.has(lab.grade)) &&
  (!sweepTracks.size || sweepTracks.has(lab.curriculumTrack)) &&
  (!sweepLabIds.size || sweepLabIds.has(lab.labId))
);

test.describe("Visualization Lab local value sweep", () => {
  test.skip(selectedLabs.length === 0, "No visualization labs match the configured VISUALIZATION_SWEEP_* filters.");

  test("opens selected catalog labs and validates visible surfaces across configured control values", async ({ page }) => {
    test.slow();
    test.setTimeout(300_000);
    const pageErrors = collectPageErrors(page);

    await loginAsDemoStudentApi(page);
    const legacyRoute = await page.request.get("/visualization-lab", { maxRedirects: 0 });
    expect([307, 308]).toContain(legacyRoute.status());
    expect(legacyRoute.headers().location).toContain("/student/tools/visualizations");

    for (const lab of selectedLabs) {
      await page.goto(buildVisualizationLabHref(lab));
      await disableMotion(page);
      await expect(page.locator('[data-viz-panel-mode="lab"]')).toBeVisible();
      await expect(page.locator(`[data-viz-active-lab-id=${JSON.stringify(lab.labId)}]`)).toBeVisible();

      const section = page.locator(visualizationLabSectionSelector(lab));
      await expect(section, `${lab.labId} direct lab section should be visible`).toBeVisible();
      await section.scrollIntoViewIfNeeded();
      await expectHealthyVisualization(section, lab.labId);
      await sweepRangeExtremes(section);
      await expectHealthyVisualization(section, lab.labId);
    }

    expectNoPageErrors(pageErrors);
  });

  test("renders configured labs through the shared Three.js family canvas", async ({ page }) => {
    test.slow();
    test.setTimeout(120_000);
    const pageErrors = collectPageErrors(page);
    const representativeLabIds = [
      "p4-large-numbers",
      "p3-multiplication-division",
      "p6-ratio-proportion",
      "quadratic-patterns",
      "functions",
      "statistics-s1",
      "calculus"
    ];
    const representativeLabs = representativeLabIds.map((labId) => {
      const lab = visualizationLabCatalog.find((entry) => entry.labId === labId);
      expect(lab, `${labId} should exist in the visualization catalog`).toBeTruthy();
      return lab!;
    });

    await loginAsDemoStudentApi(page);
    await disableMotion(page);

    for (const lab of representativeLabs) {
      await page.goto(buildVisualizationLabHref(lab), { waitUntil: "domcontentloaded" });
      await disableMotion(page);
      const section = page.locator(visualizationLabSectionSelector(lab));
      await expect(section).toBeVisible();
      const surface = section.locator('[data-viz-surface][data-viz-renderer="three-r3f"]');
      await expect(surface).toBeVisible({ timeout: 20_000 });
      await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true");
      await expect(surface.locator("[data-viz-mark]")).toHaveCount(1);
      await expect(surface).toHaveAttribute("data-viz-family-id", /three-/);
      const canvas = surface.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 20_000 });
      const dataUrlLength = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL("image/png").length);
      expect(dataUrlLength).toBeGreaterThan(2_000);
      await page.goto("about:blank", { waitUntil: "domcontentloaded" });
    }

    expectNoPageErrors(pageErrors);
  });

  test("renders function graph labs through the MAIS Manim runtime", async ({ page }, testInfo) => {
    test.slow();
    test.setTimeout(120_000);
    const pageErrors = collectPageErrors(page);
    const lab = visualizationLabCatalog.find((entry) => entry.labId === "functions");

    expect(lab, "function graph lab should exist").toBeTruthy();

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
    await expect(surface).toHaveAttribute("data-viz-active-step", "revealCurve");
    await expect(surface).toHaveAttribute("data-viz-camera-shot", "overview");
    await expect(surface).toHaveAttribute("data-viz-formula-token-count", "2");
    await expect(surface).toHaveAttribute("data-viz-object-count", "4");
    await expect(surface).toHaveAttribute("data-viz-semantic-binding-count", "2");
    await expect(surface.locator("[data-viz-manim-formula-overlay] .katex")).toBeVisible();
    await expect(surface.locator('[data-viz-manim-mark="function-curve"]')).toHaveCount(1);
    await expect(surface.locator('[data-viz-manim-mark="moving-probe"]')).toHaveCount(1);
    await expect(surface.locator('[data-viz-manim-mark="probe-trace"]')).toHaveCount(1);

    const canvas = surface.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const dataUrlLength = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL("image/png").length);
    expect(dataUrlLength).toBeGreaterThan(2_000);

    const beforeStateSummary = await surface.getAttribute("data-viz-state-summary");
    const firstRange = section.locator('input[type="range"]').first();
    await expect(firstRange).toBeVisible();
    const control = await firstRange.evaluate((input) => {
      const element = input as HTMLInputElement;
      return {
        max: Number(element.max || 100),
        min: Number(element.min || 0),
        value: Number(element.value || 0)
      };
    });
    await setRangeValue(firstRange, String(control.value === control.max ? control.min : control.max));
    await expect.poll(() => surface.getAttribute("data-viz-state-summary")).not.toBe(beforeStateSummary);

    await surface.locator("[data-viz-three-reset-camera]").click();
    await expect(surface).toHaveAttribute("data-viz-camera-shot", "overview");

    expectNoPageErrors(pageErrors);
  });

  test("opens a premium Three.js topic-specific lab page by canonical path", async ({ page }, testInfo) => {
    test.slow();
    test.setTimeout(120_000);
    const pageErrors = collectPageErrors(page);
    const lab = visualizationLabCatalog.find((entry) => entry.labId === "pep-high-s5-conics");

    expect(lab, "premium conics lab should exist").toBeTruthy();
    await registerMainlandPepVisualizationStudent(page, testInfo, lab!.grade);
    await page.goto("/student/tools/visualizations/pep-high-s5-conics", { waitUntil: "domcontentloaded" });
    await disableMotion(page);

    const section = page.locator(visualizationLabSectionSelector(lab!));
    await expect(page.locator('[data-viz-panel-mode="lab"]')).toBeVisible();
    await expect(page.locator(`[data-viz-active-lab-id=${JSON.stringify(lab!.labId)}]`)).toBeVisible();
    await expect(section).toBeVisible();

    const surface = section.locator('[data-viz-surface][data-viz-renderer="three-r3f"]');
    await expect(surface).toBeVisible({ timeout: 20_000 });
    await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true");
    await expect(surface).toHaveAttribute("data-viz-family-id", "three-conic-sections-deep");
    await expect(surface).toHaveAttribute("data-viz-scene-variant", "conic-section-deep");

    expectNoPageErrors(pageErrors);
  });

  test("renders one canonical premium Three.js page for every live scene variant", async ({ page }, testInfo) => {
    test.slow();
    test.setTimeout(240_000);
    const pageErrors = collectPageErrors(page);
    const targets = selectPremiumThreeDSceneVariantSmokeLabs(visualizationLabCatalog);

    expect(targets.map((target) => target.sceneVariant).sort()).toEqual([
      "conic-section-deep",
      "cross-section-slicer",
      "curriculum-crosswalk",
      "distribution-machine",
      "exam-strategy-capstone",
      "fraction-slices",
      "function-ribbon",
      "geometry-axes",
      "measurement-rail",
      "optimization-landscape",
      "solid-net-fold",
      "space-vector-plane",
      "statistical-inference",
      "vector-conic-strategy"
    ]);

    for (const target of targets) {
      await registerVisualizationStudentForLab(page, testInfo, target.lab);
      await page.goto(target.href, { waitUntil: "domcontentloaded" });
      await disableMotion(page);

      const section = page.locator(visualizationLabSectionSelector(target.lab));
      await expect(page.locator('[data-viz-panel-mode="lab"]')).toBeVisible();
      await expect(page.locator(`[data-viz-active-lab-id=${JSON.stringify(target.lab.labId)}]`)).toBeVisible();
      await expect(section, `${target.sceneVariant} canonical page should render ${target.lab.labId}`).toBeVisible();

      const surface = section.locator('[data-viz-surface][data-viz-renderer="three-r3f"]');
      await expect(surface).toBeVisible({ timeout: 20_000 });
      await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true");
      await expect(surface).toHaveAttribute("data-viz-family-id", target.familyId);
      await expect(surface).toHaveAttribute("data-viz-scene-variant", target.sceneVariant);
      const canvas = surface.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 20_000 });
      const dataUrlLength = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL("image/png").length);
      expect(dataUrlLength).toBeGreaterThan(2_000);
      await page.goto("about:blank", { waitUntil: "domcontentloaded" });
    }

    expectNoPageErrors(pageErrors);
  });

  test("renders the vector-conic 3D mode with a real R3F canvas interaction contract", async ({ page }, testInfo) => {
    test.slow();
    test.setTimeout(120_000);
    const pageErrors = collectPageErrors(page);
    const lab = visualizationLabCatalog.find((entry) => entry.templateId === "vector-conic-3d/strategy-map");

    expect(lab, "A vector-conic 3D lab should exist in the catalog.").toBeTruthy();

    await registerMainlandPepVisualizationStudent(page, testInfo, lab!.grade);
    await page.goto(buildVisualizationLabHref(lab!));
    await disableMotion(page);

    const section = page.locator(visualizationLabSectionSelector(lab!));
    await expect(section).toBeVisible();
    await section.locator('[data-viz-mode-button][data-viz-mode-index="2"]').click();

    const surface = section.locator('[data-viz-surface][data-viz-renderer="three-r3f"]');
    await expect(surface).toBeVisible({ timeout: 20_000 });
    await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true");
    await expect(surface.locator('[data-viz-mark][data-viz-name="three-d-r3f-surface"]')).toHaveCount(1);
    await expect(surface.locator("[data-viz-three-formula] .katex")).toBeVisible();
    await expect(surface.locator("[data-viz-three-formula]")).not.toContainText("x^2");

    const canvas = surface.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const dataUrlLength = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL("image/png").length);
    expect(dataUrlLength).toBeGreaterThan(2_000);

    const beforeDragState = await surface.getAttribute("data-viz-camera-state");
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    await page.mouse.move((canvasBox?.x ?? 0) + (canvasBox?.width ?? 0) * 0.42, (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0) * 0.42);
    await page.mouse.down();
    await page.mouse.move((canvasBox?.x ?? 0) + (canvasBox?.width ?? 0) * 0.62, (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0) * 0.31, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => surface.getAttribute("data-viz-camera-state")).not.toBe(beforeDragState);

    await surface.locator('[data-viz-three-reset-camera]').click();
    await expect(surface).toHaveAttribute("data-viz-camera-state", "azimuth=45.00;elevation=35.00;distance=4.80");

    expectNoPageErrors(pageErrors);
  });
});

function envSet(name: string) {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

async function registerMainlandPepVisualizationStudent(page: Page, testInfo: TestInfo, grade: string) {
  const suffix = `${uniqueSuffix(testInfo)}-${Math.random().toString(36).slice(2, 8)}`;
  const username = `visualization-three-${suffix}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    data: {
      role: "student",
      name: `Visualization Three ${suffix}`,
      username,
      email: username,
      password: "start12345",
      grade,
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      language: "en",
      theme: "dark"
    }
  });

  expect(response.status(), `register Mainland PEP visualization student for ${grade}`).toBe(200);
}

async function registerVisualizationStudentForLab(page: Page, testInfo: TestInfo, lab: FeaturedLabDefinition) {
  const suffix = `${uniqueSuffix(testInfo)}-${lab.labId}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase().slice(0, 48);
  const username = `visualization-variant-${suffix}@example.test`;
  const isCalifornia = lab.publisher === "US_CA_MATH";
  const isMainland = lab.curriculumTrack.startsWith("MAINLAND") || lab.publisher?.startsWith("MAINLAND");
  const response = await page.request.post("/api/auth/register", {
    data: {
      role: "student",
      name: `Visualization Variant ${suffix}`,
      username,
      email: username,
      password: "start12345",
      grade: lab.grade,
      curriculumTrack: isCalifornia ? "US_CA_MATH" : isMainland ? lab.curriculumTrack : "HK",
      curriculumProfile: isCalifornia
        ? { region: "US", publisher: "US_CA_MATH" }
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

async function sweepRangeExtremes(card: Locator) {
  const ranges = card.locator('input[type="range"]');
  const count = await ranges.count();
  const snapshot = await collectRangeSnapshot(card);

  for (let index = 0; index < count; index += 1) {
    const range = ranges.nth(index);
    const control = await readRangeControl(range);
    const values = sweepMode === "strict" ? discreteValuesFor(control) : [control.min, control.max];

    await applyRangeSnapshot(card, snapshot);
    for (const value of values) {
      await setRangeValue(range, String(value));
    }
  }

  if (sweepMode !== "strict") return;

  for (let firstIndex = 0; firstIndex < snapshot.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < snapshot.length; secondIndex += 1) {
      for (const firstEndpoint of ["min", "max"] as const) {
        await applyRangeSnapshot(card, snapshot);
        const firstRange = ranges.nth(firstIndex);
        const firstControl = await readRangeControl(firstRange);
        await setRangeValue(firstRange, String(firstEndpoint === "min" ? firstControl.min : firstControl.max));

        const secondRange = ranges.nth(secondIndex);
        const secondControl = await readRangeControl(secondRange);
        await setRangeValue(secondRange, String(secondControl.min));
        await setRangeValue(secondRange, String(secondControl.max));
      }
    }
  }
}

async function collectRangeSnapshot(card: Locator) {
  const ranges = card.locator('input[type="range"]');
  const count = await ranges.count();
  const snapshot: Array<{ index: number; value: string }> = [];
  for (let index = 0; index < count; index += 1) {
    snapshot.push({
      index,
      value: await ranges.nth(index).evaluate((input) => (input as HTMLInputElement).value)
    });
  }
  return snapshot;
}

async function applyRangeSnapshot(card: Locator, snapshot: Array<{ index: number; value: string }>) {
  const ranges = card.locator('input[type="range"]');
  for (const control of snapshot) {
    await setRangeValue(ranges.nth(control.index), control.value);
  }
}

async function readRangeControl(range: Locator) {
  return await range.evaluate((input) => {
    const element = input as HTMLInputElement;
    const min = Number(element.min || 0);
    const max = Number(element.max || 100);
    const step = element.step && element.step !== "any" ? Number(element.step) : 1;
    return {
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 100,
      step: Number.isFinite(step) && step > 0 ? step : 1
    };
  });
}

function discreteValuesFor(control: { min: number; max: number; step: number }) {
  if (!Number.isFinite(control.min) || !Number.isFinite(control.max) || !Number.isFinite(control.step) || control.step <= 0) {
    throw new Error(`Invalid control bounds: min=${control.min}, max=${control.max}, step=${control.step}.`);
  }
  if (control.max < control.min) {
    throw new Error(`Invalid control bounds: max ${control.max} is below min ${control.min}.`);
  }

  const stepCount = Math.round((control.max - control.min) / control.step);
  if (stepCount > maxDiscreteValuesPerControl) {
    throw new Error(`Control has ${stepCount + 1} discrete values, above the local sweep cap of ${maxDiscreteValuesPerControl + 1}.`);
  }

  return Array.from({ length: stepCount + 1 }, (_, index) =>
    Number((control.min + index * control.step).toFixed(decimalPlaces(control.step)))
  );
}

function decimalPlaces(value: number) {
  const [, decimals = ""] = String(value).split(".");
  return Math.min(6, decimals.length);
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
