import { expect, test, type Page } from "@playwright/test";

type DemoLocale = "en" | "zh-CN" | "zh-HK";
type DemoScene = "geometry" | "analytic";

const CASES: readonly {
  readonly locale: DemoLocale;
  readonly title: string;
  readonly geometry: string;
  readonly analytic: string;
  readonly reset: string;
  readonly play: string;
  readonly pause: string;
  readonly timelineAriaLabel: string;
  readonly formulaRegionAriaLabel: string;
  readonly formulaAriaLabel: string;
}[] = [
  {
    locale: "en",
    title: "MAIS TypeScript math kernel",
    geometry: "Solid geometry",
    analytic: "Analytic geometry",
    reset: "Reset",
    play: "Play",
    pause: "Pause",
    timelineAriaLabel: "MAIS Manim timeline",
    formulaRegionAriaLabel: "Scrollable MAIS Manim formula",
    formulaAriaLabel: "MAIS Manim formula",
  },
  {
    locale: "zh-CN",
    title: "MAIS TypeScript 数学内核",
    geometry: "立体几何",
    analytic: "解析几何",
    reset: "重置",
    play: "播放",
    pause: "暂停",
    timelineAriaLabel: "MAIS Manim 时间轴",
    formulaRegionAriaLabel: "可滚动 MAIS Manim 公式",
    formulaAriaLabel: "MAIS Manim 公式",
  },
  {
    locale: "zh-HK",
    title: "MAIS TypeScript 數學內核",
    geometry: "立體幾何",
    analytic: "解析幾何",
    reset: "重設",
    play: "播放",
    pause: "暫停",
    timelineAriaLabel: "MAIS Manim 時間軸",
    formulaRegionAriaLabel: "可捲動 MAIS Manim 公式",
    formulaAriaLabel: "MAIS Manim 公式",
  },
];

interface RuntimeIssues {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  readonly requestFailures: string[];
  readonly serverErrors: string[];
}

function collectRuntimeIssues(page: Page): RuntimeIssues {
  const issues: RuntimeIssues = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    serverErrors: [],
  };
  page.on("console", (message) => {
    if (message.type() === "error") issues.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => issues.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    issues.requestFailures.push(
      `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown failure"}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      issues.serverErrors.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });
  return issues;
}

function expectNoRuntimeIssues(issues: RuntimeIssues) {
  expect.soft(issues.consoleErrors, "browser console errors").toEqual([]);
  expect.soft(issues.pageErrors, "uncaught page errors").toEqual([]);
  expect.soft(issues.requestFailures, "failed browser requests").toEqual([]);
  expect.soft(issues.serverErrors, "HTTP 5xx responses").toEqual([]);
}

async function expectNoDocumentOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    bodyClient: document.body.clientWidth,
    bodyScroll: document.body.scrollWidth,
    documentClient: document.documentElement.clientWidth,
    documentScroll: document.documentElement.scrollWidth,
  }));
  expect(widths.documentScroll).toBeLessThanOrEqual(widths.documentClient + 1);
  expect(widths.bodyScroll).toBeLessThanOrEqual(widths.bodyClient + 1);
}

async function expectHealthyMathScene(
  page: Page,
  scene: DemoScene,
  copy: (typeof CASES)[number],
) {
  const locale = copy.locale;
  const sceneId = `math-kernel-${scene}-${locale}`;
  const surface = page.locator(
    '[data-viz-surface][data-viz-renderer="three-r3f"][data-viz-runtime="mais-manim"]',
  ).first();
  await expect(surface).toBeVisible({ timeout: 60_000 });
  await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true", { timeout: 60_000 });
  await expect(surface).toHaveAttribute("data-viz-three-webgl-status", "ready");
  await expect(surface).toHaveAttribute("data-viz-scene-id", sceneId);
  await expect(surface).toHaveAttribute("data-viz-manim-frame-audit-scene-id", sceneId);
  await expect(surface).toHaveAttribute(
    "data-viz-runtime-render-state-finite-point-count",
    /^[1-9]\d*$/,
  );
  await expect(surface).toHaveAttribute("data-viz-manim-scene-export-ready", "true");
  await expect(surface).toHaveAttribute("data-viz-manim-formula-safe-area-status", "safe");
  await expect(surface).toHaveAttribute("data-viz-manim-formula-collision-count", "0");

  const expectedMark = scene === "geometry"
    ? "geometry-vector-A1C"
    : "analytic-segment-focal-chord";
  await expect(surface.locator(`[data-viz-manim-mark="${expectedMark}"]`)).toHaveCount(1);
  await expect(surface.locator("[data-viz-manim-formula-overlay] .katex").first()).toBeAttached();
  await expect(surface.locator(".katex-error")).toHaveCount(0);
  await expect(page.locator("[data-math-kernel-demo]")).toHaveAttribute("lang", locale);
  const playback = surface.locator("[data-viz-manim-playback-toggle]");
  await expect(playback).toHaveText(copy.play);
  await expect(surface.locator("[data-viz-manim-timeline-scrubber]")).toHaveAttribute(
    "aria-label",
    copy.timelineAriaLabel,
  );
  await expect(surface.locator("[data-viz-manim-formula-overlay]")).toHaveAttribute(
    "aria-label",
    copy.formulaRegionAriaLabel,
  );
  await expect(surface.locator(`[aria-label="${copy.formulaAriaLabel}"]`).first()).toBeAttached();

  const canvas = surface.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await expect.poll(
    () => canvas.evaluate((element) => typeof (
      element as HTMLCanvasElement & { readonly [key: symbol]: unknown }
    )[Symbol.for("mais.math.webgl-boundary.snapshot.v1")] === "function"),
    { timeout: 15_000 },
  ).toBe(true);
  const boundarySnapshot = await canvas.evaluate((element) => {
    type Snapshot = {
      readonly canvas: {
        readonly backingHeight: number;
        readonly backingWidth: number;
        readonly cssHeight: number;
        readonly cssWidth: number;
      };
      readonly contentRootFound: boolean;
      readonly issueCount: number;
      readonly renderableCount: number;
      readonly status: "fail" | "pass";
      readonly supportedRenderableCount: number;
      readonly unsupportedRenderableCount: number;
    };
    const symbol = Symbol.for("mais.math.webgl-boundary.snapshot.v1");
    const hook = (
      element as HTMLCanvasElement & { readonly [key: symbol]: (() => Snapshot) | undefined }
    )[symbol];
    if (typeof hook !== "function") throw new Error("WebGL boundary snapshot hook is unavailable.");
    return hook();
  });
  expect(boundarySnapshot.contentRootFound).toBe(true);
  expect(boundarySnapshot.status).toBe("pass");
  expect(boundarySnapshot.issueCount).toBe(0);
  expect(boundarySnapshot.renderableCount).toBeGreaterThan(0);
  expect(boundarySnapshot.supportedRenderableCount).toBeGreaterThan(0);
  expect(boundarySnapshot.unsupportedRenderableCount).toBe(0);
  expect(boundarySnapshot.canvas.cssWidth).toBeGreaterThan(0);
  expect(boundarySnapshot.canvas.cssHeight).toBeGreaterThan(0);
  expect(boundarySnapshot.canvas.backingWidth).toBeGreaterThan(0);
  expect(boundarySnapshot.canvas.backingHeight).toBeGreaterThan(0);
  const paint = await canvas.evaluate(async (element) => {
    const source = element as HTMLCanvasElement;
    const dataUrl = source.toDataURL("image/png");
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const audit = document.createElement("canvas");
    audit.width = source.width;
    audit.height = source.height;
    const context = audit.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("A 2D canvas context is unavailable for the paint audit.");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, audit.width, audit.height).data;
    let nonBackgroundSamples = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      const distance =
        Math.abs(pixels[index] - 2) +
        Math.abs(pixels[index + 1] - 6) +
        Math.abs(pixels[index + 2] - 23);
      if (pixels[index + 3] > 0 && distance > 18) nonBackgroundSamples += 1;
    }
    return {
      dataUrlLength: dataUrl.length,
      nonBackgroundSamples,
    };
  });
  expect(paint.dataUrlLength, "R3F canvas should expose a painted framebuffer").toBeGreaterThan(2_000);
  expect(
    paint.nonBackgroundSamples,
    "the initial learner frame must visibly paint math objects, not only the background",
  ).toBeGreaterThan(20);

  const exportedScene = JSON.parse(
    (await surface.locator("script[data-viz-manim-scene-export-json]").textContent()) ?? "null",
  ) as {
    readonly sceneId?: string;
    readonly objects?: readonly unknown[];
    readonly parameters?: readonly { readonly id?: string; readonly role?: string; readonly value?: number }[];
  } | null;
  expect(exportedScene?.sceneId).toBe(sceneId);
  expect(exportedScene?.objects?.length ?? 0).toBeGreaterThan(0);
  expect(exportedScene?.parameters?.some((parameter) => parameter.role === "control")).toBe(true);
  expect(exportedScene?.parameters?.some((parameter) => parameter.role === "derived")).toBe(true);

  await playback.click();
  await expect(playback).toHaveText(copy.pause);
  await playback.click();
  await expect(playback).toHaveText(copy.play);
}

function demoPath(locale: DemoLocale, scene: DemoScene) {
  return `/visualization-lab/math-kernel-demo?locale=${encodeURIComponent(locale)}&scene=${scene}`;
}

test.describe("MAIS TypeScript math-kernel runtime", () => {
  test.describe.configure({ mode: "serial" });

  for (const copy of CASES) {
    test(`${copy.locale} renders the geometry DTO in the real R3F and KaTeX runtime`, async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const issues = collectRuntimeIssues(page);
      const response = await page.goto(demoPath(copy.locale, "geometry"), {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBe(200);

      const root = page.locator("[data-math-kernel-demo]");
      const scene = page.locator('[data-math-kernel-demo-scene="geometry"]');
      await expect(root).toHaveAttribute("data-math-kernel-demo-locale", copy.locale);
      await expect(page.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: copy.geometry, exact: true })).toBeVisible();
      await expect(scene).toHaveAttribute("data-math-kernel-scene-id", `math-kernel-geometry-${copy.locale}`);
      await expect(scene).toHaveAttribute("data-math-kernel-render-source", "exact");
      await expectHealthyMathScene(page, "geometry", copy);

      const visibleText = await root.innerText();
      expect(visibleText).not.toContain("visualization.mathKernel");
      expect(visibleText).not.toContain("\\sqrt");
      expect(visibleText).not.toContain("\\frac");
      await expectNoDocumentOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`math-kernel-geometry-${copy.locale}.png`),
        fullPage: true,
      });
      expectNoRuntimeIssues(issues);
    });

    test(`${copy.locale} keeps numeric drag and exact commit synchronized`, async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const issues = collectRuntimeIssues(page);
      let exactRequestCount = 0;
      page.on("request", (request) => {
        if (
          request.method() === "POST" &&
          new URL(request.url()).pathname === "/api/math-kernel-demo/analytic-exact"
        ) {
          exactRequestCount += 1;
        }
      });

      const response = await page.goto(demoPath(copy.locale, "analytic"), {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBe(200);

      const root = page.locator("[data-math-kernel-demo]");
      const scene = page.locator('[data-math-kernel-demo-scene="analytic"]');
      const slider = page.locator("[data-math-kernel-inverse-slope]");
      const exactCard = page.locator("[data-math-kernel-exact-status]");
      const chord = page.locator("[data-math-kernel-numeric-chord]");
      await expect(root).toHaveAttribute("data-math-kernel-demo-locale", copy.locale);
      await expect(page.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: copy.analytic, exact: true })).toBeVisible();
      await expect(scene).toHaveAttribute("data-math-kernel-scene-id", `math-kernel-analytic-${copy.locale}`);
      await expect(scene).toHaveAttribute("data-math-kernel-render-source", "exact");
      await expect(exactCard).toHaveAttribute("data-math-kernel-exact-status", "ready");
      await expect(chord).toHaveText("3.00000000");
      await expectHealthyMathScene(page, "analytic", copy);

      const initialPoints = await scene.getAttribute("data-math-kernel-render-points");
      const initialMathJson = await exactCard.getAttribute("data-math-kernel-exact-math-json");
      expect(initialPoints).toBeTruthy();
      expect(initialMathJson).toBe("9");

      await slider.evaluate((element) => {
        const input = element as HTMLInputElement;
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        if (!nativeSetter) throw new Error("The native range value setter is unavailable.");
        nativeSetter.call(input, "4");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(slider).toHaveValue("4");
      await expect(scene).toHaveAttribute("data-math-kernel-render-source", "numeric");
      await expect(scene).not.toHaveAttribute("data-math-kernel-render-points", initialPoints ?? "");
      await expect(exactCard).toHaveAttribute("data-math-kernel-exact-status", "stale");
      await expect(chord).toHaveText("3.42857143");
      expect(exactRequestCount, "continuous input must not call the exact API").toBe(0);

      const exactResponsePromise = page.waitForResponse((candidate) =>
        candidate.request().method() === "POST" &&
        new URL(candidate.url()).pathname === "/api/math-kernel-demo/analytic-exact",
      );
      await slider.dispatchEvent("pointerup", { pointerType: "mouse" });
      const exactResponse = await exactResponsePromise;
      expect(exactResponse.status()).toBe(200);
      const exactBody = await exactResponse.json() as {
        readonly ok: boolean;
        readonly slopeQuarter: number;
        readonly value: {
          readonly kind: string;
          readonly points: readonly (readonly { readonly approx: number | null }[])[];
          readonly chordLengthSquared: {
            readonly mathJson: unknown;
            readonly approx: number | null;
          };
        };
      };
      expect(exactBody.ok).toBe(true);
      expect(exactBody.slopeQuarter).toBe(4);
      expect(exactBody.value.kind).toBe("secant");
      await expect(exactCard).toHaveAttribute("data-math-kernel-exact-status", "ready");
      await expect(scene).toHaveAttribute("data-math-kernel-render-source", "exact");

      const expectedPoints = exactBody.value.points.map((point) =>
        point.map((coordinate) => coordinate.approx),
      );
      const renderedPoints = JSON.parse(
        (await scene.getAttribute("data-math-kernel-render-points")) ?? "null",
      ) as unknown;
      expect(renderedPoints, "the rendered endpoints must come from the returned exact DTO").toEqual(expectedPoints);
      await expect(exactCard).toHaveAttribute(
        "data-math-kernel-exact-math-json",
        JSON.stringify(exactBody.value.chordLengthSquared.mathJson),
      );
      await expect(exactCard.locator(".katex").first()).toBeVisible();
      const exactCardText = (await exactCard.innerText()).replace(/\s+/g, "");
      expect(exactCardText).toContain("576");
      expect(exactCardText).toContain("49");
      expect(Number(await chord.innerText())).toBeCloseTo(
        Math.sqrt(exactBody.value.chordLengthSquared.approx ?? Number.NaN),
        8,
      );
      const expectedSceneSamples = exactBody.value.points.map((point) => [
        point[0]?.approx,
        point[1]?.approx,
        0,
      ]);
      const exportedSceneScript = page.locator(
        '[data-viz-surface] script[data-viz-manim-scene-export-json]',
      ).first();
      await expect.poll(async () => {
        const exported = JSON.parse((await exportedSceneScript.textContent()) ?? "null") as {
          readonly objects?: readonly {
            readonly id?: string;
            readonly samples?: readonly (readonly (number | null)[])[];
          }[];
          readonly parameters?: readonly {
            readonly id?: string;
            readonly value?: number;
          }[];
        } | null;
        return {
          samples: exported?.objects?.find(
            (object) => object.id === "analytic-segment-focal-chord",
          )?.samples ?? null,
          inverseSlope: exported?.parameters?.find(
            (parameter) => parameter.id === "inverse-slope",
          )?.value ?? null,
          chordLengthSquared: exported?.parameters?.find(
            (parameter) => parameter.id === "chord-length-squared",
          )?.value ?? null,
        };
      }).toEqual({
        samples: expectedSceneSamples,
        inverseSlope: 1,
        chordLengthSquared: exactBody.value.chordLengthSquared.approx,
      });
      expect(exactRequestCount, "pointer release must issue exactly one exact request").toBe(1);

      await page.getByRole("button", { name: copy.reset, exact: true }).click();
      await expect(slider).toHaveValue("0");
      await expect(chord).toHaveText("3.00000000");
      await expect(exactCard).toHaveAttribute("data-math-kernel-exact-status", "ready");
      await expect(exactCard).toHaveAttribute("data-math-kernel-exact-math-json", initialMathJson ?? "9");
      await expect(scene).toHaveAttribute("data-math-kernel-render-source", "exact");
      await expect(scene).toHaveAttribute("data-math-kernel-render-points", initialPoints ?? "");
      expect(exactRequestCount, "reset must restore the cached exact DTO without another CAS request").toBe(1);

      if (copy.locale === "en") {
        const keyboardResponsePromise = page.waitForResponse((candidate) =>
          candidate.request().method() === "POST" &&
          new URL(candidate.url()).pathname === "/api/math-kernel-demo/analytic-exact",
        );
        await slider.focus();
        await slider.press("ArrowRight");
        const keyboardResponse = await keyboardResponsePromise;
        expect(keyboardResponse.status()).toBe(200);
        await expect(exactCard).toHaveAttribute("data-math-kernel-exact-status", "ready");
        await expect(scene).toHaveAttribute("data-math-kernel-render-source", "exact");
        expect(exactRequestCount, "one keyboard commit must issue one additional exact request").toBe(2);
      }

      const visibleText = await root.innerText();
      expect(visibleText).not.toContain("visualization.mathKernel");
      expect(visibleText).not.toContain("\\sqrt");
      expect(visibleText).not.toContain("\\frac");
      await expectNoDocumentOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`math-kernel-analytic-${copy.locale}.png`),
        fullPage: true,
      });
      expectNoRuntimeIssues(issues);
    });
  }
});
