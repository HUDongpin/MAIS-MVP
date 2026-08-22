import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  getSignatureLabAssignment
} from "../../data/signatureLabAssignments";
import {
  visualizationLabCatalog
} from "../../data/visualizationLabs";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BROWSER_LAUNCH_ARGS,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_PROJECT_CONTEXTS,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_DIRECTORY_PREFIX,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_FILE_NAME,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_SCHEMA_VERSION,
  type CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt,
  type CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan,
  type CaliforniaSignatureFinalCompositorPhase4BaselineStage,
  type CaliforniaSignatureFinalCompositorPhase4BrowserIdentity,
  type CaliforniaSignatureFinalCompositorPhase4CalibrationTarget,
  type CaliforniaSignatureFinalCompositorPhase4DecodedPixels,
  type CaliforniaSignatureFinalCompositorPhase4PhysicalSession,
  type CaliforniaSignatureFinalCompositorPhase4ProjectName,
  type CaliforniaSignatureFinalCompositorPhase4RealDriverLease,
  type CaliforniaSignatureFinalCompositorPhase4ServerIdentity,
  type CaliforniaSignatureFinalCompositorPhase4SharpIdentity
} from "./california-signature-final-compositor-phase4-real-driver-contract";
import {
  californiaSignatureFinalCompositorPhase4InternalSha256 as sha256,
  californiaSignatureFinalCompositorPhase4InternalStableJson as stableJson
} from "./california-signature-final-compositor-phase4-real-driver-internal";

export {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BROWSER_LAUNCH_ARGS,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_PROJECT_CONTEXTS,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_DIRECTORY_PREFIX,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_RECEIPT_FILE_NAME,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_SCHEMA_VERSION
} from "./california-signature-final-compositor-phase4-real-driver-contract";
export type {
  CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt,
  CaliforniaSignatureFinalCompositorPhase4RealDriverLease
} from "./california-signature-final-compositor-phase4-real-driver-contract";

const require = createRequire(import.meta.url);

type PhysicalProject = {
  context: any;
  identitySha256: string;
  page: any;
  projectName: CaliforniaSignatureFinalCompositorPhase4ProjectName;
};

function axisState(axisId: string) {
  const match = /^(desktop|mobile)-(en|zhHK|zhCN)-(light|dark)$/.exec(axisId);
  assert.ok(match, `${axisId}: California Phase4 baseline axis is unsupported`);
  return {
    language: match[2] === "zhHK" ? "zh" : match[2] === "zhCN" ? "zh-Hans" : "en",
    locale: match[2] === "zhHK" ? "zh-Hant-HK" : match[2] === "zhCN" ? "zh-Hans-CN" : "en-HK",
    projectName: `${match[1]}-chrome` as CaliforniaSignatureFinalCompositorPhase4ProjectName,
    theme: match[3]!,
    viewportClass: match[1]!
  };
}

function visitForBench(benchId: string) {
  for (const lab of visualizationLabCatalog) {
    if (lab.curriculumTrack !== "US" || lab.publisher !== "US_CA_MATH") continue;
    const assignment = getSignatureLabAssignment(lab.topicId);
    if (assignment && (assignment.primary === benchId || assignment.related?.includes(benchId as never))) {
      return lab;
    }
  }
  assert.fail(`${benchId}: California Phase4 has no source-owned California lab route`);
}

async function assertPhysicalProject(project: PhysicalProject): Promise<void> {
  const expected = CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_PROJECT_CONTEXTS[
    project.projectName
  ];
  const actual = await project.page.evaluate(() => ({
    deviceScaleFactor: devicePixelRatio,
    hasTouch: navigator.maxTouchPoints > 0,
    innerHeight,
    innerWidth,
    screenHeight: screen.height,
    screenWidth: screen.width
  }));
  assert.deepEqual(actual, {
    deviceScaleFactor: expected.deviceScaleFactor,
    hasTouch: expected.hasTouch,
    innerHeight: expected.viewport.height,
    innerWidth: expected.viewport.width,
    screenHeight: expected.screen.height,
    screenWidth: expected.screen.width
  }, `${project.projectName}: California Phase4 physical context drifted`);
  const touchOption = await project.context.browser()?.version();
  assert.ok(typeof touchOption === "string" && touchOption.length > 0,
    `${project.projectName}: California Phase4 physical browser context is detached`);
}

async function navigateProjectToBench(options: {
  axisId: string;
  baseUrl: string;
  benchId: string;
  expectedLabId?: string;
  project: PhysicalProject;
}) {
  const axis = axisState(options.axisId);
  assert.equal(axis.projectName, options.project.projectName,
    `${options.axisId}: California Phase4 axis crossed physical projects`);
  await assertPhysicalProject(options.project);
  const lab = visitForBench(options.benchId);
  if (options.expectedLabId) {
    assert.equal(lab.labId, options.expectedLabId,
      `${options.benchId}: California Phase4 authenticated lab target drifted`);
  }
  const query = new URLSearchParams({ grade: lab.grade, lab: lab.labId, track: "all" });
  const url = new URL(`/student/tools/visualizations?${query.toString()}`, options.baseUrl);
  const response = await options.project.page.goto(url.toString(), { waitUntil: "domcontentloaded" });
  assert.ok(response && response.status() >= 200 && response.status() < 400,
    `${options.benchId}: California Phase4 navigation did not reach the accepted server`);
  await options.project.page.evaluate(({ language, theme }: { language: string; theme: string }) => {
    localStorage.setItem("hk-math-language", language);
    localStorage.setItem("hk-math-theme", theme);
  }, { language: axis.language, theme: axis.theme });
  await options.project.page.reload({ waitUntil: "domcontentloaded" });
  const panelSelector = `#lab-example-${lab.labId}`;
  await options.project.page.waitForSelector(
    `${panelSelector}[data-viz-panel-mode="lab"]`, { state: "visible" });
  const switcher = options.project.page.locator(
    `${panelSelector} [data-viz-signature-switcher]`).first();
  if (await switcher.getAttribute("data-viz-active-signature-bench") !== options.benchId) {
    await switcher.locator(
      `[data-viz-signature-bench-id=${JSON.stringify(options.benchId)}]`).click();
  }
  await options.project.page.waitForFunction(
    ({ selector, benchId }: { selector: string; benchId: string }) =>
      document.querySelector(selector)?.getAttribute("data-viz-active-signature-bench") === benchId,
    { benchId: options.benchId, selector: `${panelSelector} [data-viz-signature-switcher]` });
  await options.project.page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve())));
  });
  await assertPhysicalProject(options.project);
  return { axis, lab, panelSelector, responseStatus: response.status() };
}

/**
 * Dormant reviewed adapter. It is intentionally not exported or reachable from
 * the production entry point: an A22 lifecycle publisher/authority does not
 * yet exist. Keeping the implementation here permits source review without
 * pretending a copyable .tmp receipt can authorize execution.
 */
async function launchPhysicalChrome(options: {
  acceptedReceipt: CaliforniaSignatureFinalCompositorPhase4AcceptedBuildReceipt;
  authenticatedPlan: CaliforniaSignatureFinalCompositorPhase4AuthenticatedPlan;
  browser: CaliforniaSignatureFinalCompositorPhase4BrowserIdentity;
  server: CaliforniaSignatureFinalCompositorPhase4ServerIdentity;
  sharp: CaliforniaSignatureFinalCompositorPhase4SharpIdentity;
}): Promise<CaliforniaSignatureFinalCompositorPhase4PhysicalSession> {
  assert.equal(options.acceptedReceipt.executionPlanSha256,
    options.authenticatedPlan.executionPlan.executionPlanSha256,
  "California Phase4 physical launch execution plan drifted");
  assert.equal(options.acceptedReceipt.calibrationTargetPlanSha256,
    options.authenticatedPlan.calibrationTargetPlanSha256,
  "California Phase4 physical launch target plan drifted");
  const playwright = require("playwright-core") as {
    chromium: { launch(options: Record<string, unknown>): Promise<any> };
  };
  const sharpFactory = require("sharp") as any;
  const browser = await playwright.chromium.launch({
    args: [...CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BROWSER_LAUNCH_ARGS],
    executablePath: options.browser.browserExecutablePath,
    headless: true
  });
  const physicalProjects = new Map<CaliforniaSignatureFinalCompositorPhase4ProjectName,
  PhysicalProject>();
  try {
    for (const projectName of ["desktop-chrome", "mobile-chrome"] as const) {
      const config = CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_PROJECT_CONTEXTS[projectName];
      const context = await browser.newContext({
        colorScheme: "light",
        deviceScaleFactor: config.deviceScaleFactor,
        hasTouch: config.hasTouch,
        isMobile: config.isMobile,
        locale: "en-HK",
        screen: { ...config.screen },
        storageState: options.acceptedReceipt.storageState.filePath,
        viewport: { ...config.viewport }
      });
      try {
        const page = await context.newPage();
        const identitySha256 = sha256(stableJson({
          acceptedBuildReceiptSha256: options.acceptedReceipt.acceptedBuildReceiptSha256,
          browserIdentitySha256: options.browser.browserIdentitySha256,
          config,
          projectName,
          serverProcessIdentitySha256: options.server.processIdentitySha256,
          storageStateSha256: options.acceptedReceipt.storageState.fileSha256
        }));
        physicalProjects.set(projectName, { context, identitySha256, page, projectName });
      } catch (error) {
        await context.close();
        throw error;
      }
    }
    for (const project of physicalProjects.values()) await assertPhysicalProject(project);
  } catch (error) {
    await Promise.allSettled([...physicalProjects.values()].map((row) => row.context.close()));
    await browser.close();
    throw error;
  }

  const browserContextIdentitySha256ByProject = Object.freeze({
    "desktop-chrome": physicalProjects.get("desktop-chrome")!.identitySha256,
    "mobile-chrome": physicalProjects.get("mobile-chrome")!.identitySha256
  });
  assert.notEqual(browserContextIdentitySha256ByProject["desktop-chrome"],
    browserContextIdentitySha256ByProject["mobile-chrome"],
  "California Phase4 requires distinct desktop and mobile physical contexts");
  let closed = false;
  const current = new Map<CaliforniaSignatureFinalCompositorPhase4ProjectName, {
    benchId: string;
    defaultFingerprint: string | null;
    panelSelector: string;
  }>();

  const fingerprint = async (project: PhysicalProject, panelSelector: string) =>
    project.page.locator(`${panelSelector} [data-viz-signature-lab]`).first().evaluate(
      (root: HTMLElement) => {
        const canvas = root.querySelector("canvas[data-viz-mark]") as HTMLCanvasElement | null;
        const controls = Array.from(root.querySelectorAll("button,input,select,textarea"));
        return JSON.stringify({
          canvas: canvas ? { height: canvas.height, width: canvas.width } : null,
          controls: controls.map((element) => ({
            checked: element instanceof HTMLInputElement ? element.checked : null,
            disabled: (element as HTMLButtonElement).disabled === true,
            value: (element as HTMLInputElement).value ?? null
          })),
          text: root.textContent?.replace(/\s+/g, " ").trim().slice(0, 4096) ?? null
        });
      });

  return {
    browserContextIdentitySha256ByProject,
    async captureIndependentExpectedPixels(_sample, target) {
      /*
       * A22 must replace this HOLD with a separately reviewed expected-raster
       * artifact whose identity is bound by the authority receipt. Reading the
       * same live Canvas as the current screenshot would be a self-compare.
       */
      throw new Error(
        `${target.classId}: California Phase4 independent expected compositor artifact is not installed`
      );
    },
    async captureMaximumEnvelope(sample, target) {
      assert.equal(closed, false, "California Phase4 physical browser session is closed");
      assert.equal(sample.dimensionClass.classId, target.classId,
        `${target.classId}: California Phase4 calibration class/target drifted`);
      assert.deepEqual(sample.dimensionClass.maximumDimensions, {
        backingSize: target.backingSize,
        clipSize: target.clipSize,
        cssSize: target.cssSize
      }, `${target.classId}: California Phase4 maximum envelope/target drifted`);
      const project = physicalProjects.get(target.projectName)!;
      const navigation = await navigateProjectToBench({
        axisId: target.axisId,
        baseUrl: options.server.baseUrl,
        benchId: target.benchId,
        expectedLabId: target.labId,
        project
      });
      assert.equal(navigation.panelSelector, `#lab-example-${target.labId}`,
        `${target.classId}: California Phase4 exact target panel drifted`);
      const root = project.page.locator(
        `${navigation.panelSelector} [data-viz-signature-lab]`).first();
      const canvases = root.locator("canvas[data-viz-mark]");
      assert.ok(await canvases.count() > target.canvasIndex,
        `${target.classId}: California Phase4 exact target Canvas index is absent`);
      const canvas = canvases.nth(target.canvasIndex);
      const targetEvidence = await canvas.evaluate(async (
        element: HTMLCanvasElement,
        expected: CaliforniaSignatureFinalCompositorPhase4CalibrationTarget
      ) => {
        const root = element.closest("[data-viz-signature-lab]") as HTMLElement | null;
        const runtime = (window as unknown as {
          __californiaCanvasGraphicsRuntime?: {
            collect(root: HTMLElement, request: Record<string, string>): Promise<{
              canvases: Array<{ bindingKey: string; domCanvasIndex: number }>;
            }>;
          };
        }).__californiaCanvasGraphicsRuntime;
        if (!root || !runtime) throw new Error(
          "California Phase4 exact target Canvas requires lifecycle-installed binding evidence");
        const collected = await runtime.collect(root, {
          benchId: expected.benchId,
          stateKey: `phase4-calibration-${expected.classId}`,
          surfaceKey: expected.groupKey
        });
        const binding = collected.canvases.find((row) =>
          row.bindingKey === expected.bindingKey && row.domCanvasIndex === expected.canvasIndex);
        if (!binding) throw new Error(
          "California Phase4 exact target Canvas/binding/crop was not observed");
        const rect = element.getBoundingClientRect();
        const context = element.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("California Phase4 exact target Canvas lacks a 2D context");
        return {
          backingSize: { height: element.height, width: element.width },
          bindingKey: binding.bindingKey,
          canvasIndex: binding.domCanvasIndex,
          cssSize: { height: rect.height, width: rect.width },
          deviceScaleFactor: devicePixelRatio,
          readbackByteCount: context.getImageData(
            0, 0, element.width, element.height).data.length
        };
      }, target);
      const config = CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_PROJECT_CONTEXTS[
        target.projectName
      ];
      assert.deepEqual(targetEvidence.backingSize, target.backingSize,
        `${target.classId}: California Phase4 actual backing size differs from target`);
      assert.deepEqual(targetEvidence.cssSize, target.cssSize,
        `${target.classId}: California Phase4 actual CSS/clip size differs from target`);
      assert.equal(targetEvidence.deviceScaleFactor, config.deviceScaleFactor,
        `${target.classId}: California Phase4 actual target DPR differs from project`);
      assert.equal(targetEvidence.bindingKey, target.bindingKey,
        `${target.classId}: California Phase4 actual target binding drifted`);
      assert.equal(targetEvidence.canvasIndex, target.canvasIndex,
        `${target.classId}: California Phase4 actual target Canvas index drifted`);
      assert.equal(targetEvidence.readbackByteCount,
        target.backingSize.width * target.backingSize.height * 4,
      `${target.classId}: California Phase4 exact target Canvas readback is incomplete`);
      const box = await canvas.boundingBox();
      assert.ok(box && box.width === target.clipSize.width && box.height === target.clipSize.height,
        `${target.classId}: California Phase4 exact target clip differs from envelope`);
      const screenshot = Buffer.from(await project.page.screenshot({
        animations: "disabled",
        captureBeyondViewport: false,
        clip: { height: box.height, width: box.width, x: box.x, y: box.y },
        type: "png"
      }));
      return {
        browserContextIdentitySha256: project.identitySha256,
        observedTarget: structuredClone(target),
        screenshot
      };
    },
    async close() {
      if (closed) return;
      closed = true;
      await Promise.allSettled([...physicalProjects.values()].map((row) => row.context.close()));
      await browser.close();
    },
    async compareIndependentPixels(expected, current, _sample, _target) {
      assert.deepEqual({ height: current.height, width: current.width },
        { height: expected.height, width: expected.width },
      "California Phase4 independent expected/current pixel dimensions drifted");
      assert.equal(current.pixels.length, expected.pixels.length,
        "California Phase4 independent expected/current pixel byte counts drifted");
      let mismatchPixelCount = 0;
      for (let index = 0; index < expected.pixels.length; index += 4) {
        if (expected.pixels[index] !== current.pixels[index] ||
            expected.pixels[index + 1] !== current.pixels[index + 1] ||
            expected.pixels[index + 2] !== current.pixels[index + 2] ||
            expected.pixels[index + 3] !== current.pixels[index + 3]) {
          mismatchPixelCount += 1;
        }
      }
      const expectedPixelsSha256 = sha256(expected.pixels);
      const currentPixelsSha256 = sha256(current.pixels);
      return {
        comparisonSha256: sha256(stableJson({
          currentPixelsSha256, expectedPixelsSha256, mismatchPixelCount
        })),
        currentPixelsSha256,
        expectedPixelsSha256,
        mismatchPixelCount
      };
    },
    async decodeScreenshot(screenshot, _sample, target) {
      const decoded = await sharpFactory(screenshot).ensureAlpha().raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(decoded.info.channels, 4,
        "California Phase4 exact screenshot decode did not produce RGBA pixels");
      assert.equal(decoded.info.width, target.backingSize.width,
        "California Phase4 screenshot width differs from exact target; resize is forbidden");
      assert.equal(decoded.info.height, target.backingSize.height,
        "California Phase4 screenshot height differs from exact target; resize is forbidden");
      return {
        height: decoded.info.height,
        pixels: new Uint8Array(decoded.data),
        width: decoded.info.width
      };
    },
    async runBaselineStage(sample, stage) {
      assert.equal(closed, false, "California Phase4 physical browser session is closed");
      const axis = axisState(sample.group.axisId);
      assert.equal(axis.projectName, sample.group.projectName,
        `${sample.group.groupKey}: California Phase4 baseline project/axis drifted`);
      const project = physicalProjects.get(axis.projectName)!;
      let state = current.get(axis.projectName);
      let evidence: unknown;
      if (stage === "navigation") {
        const navigation = await navigateProjectToBench({
          axisId: sample.group.axisId,
          baseUrl: options.server.baseUrl,
          benchId: sample.group.benchId,
          project
        });
        state = {
          benchId: sample.group.benchId,
          defaultFingerprint: null,
          panelSelector: navigation.panelSelector
        };
        current.set(axis.projectName, state);
        evidence = { axis, status: navigation.responseStatus, url: project.page.url() };
      } else {
        assert.ok(state && state.benchId === sample.group.benchId,
          `${sample.group.groupKey}: California Phase4 stage lacks navigation state`);
        if (stage === "hydrate") {
          const html = await project.page.locator("html").evaluate((element: HTMLElement) => ({
            dark: element.classList.contains("dark"), lang: element.lang
          }));
          assert.equal(html.lang, axis.locale,
            `${sample.group.groupKey}: California Phase4 hydrated locale drifted`);
          assert.equal(html.dark, axis.theme === "dark",
            `${sample.group.groupKey}: California Phase4 hydrated theme drifted`);
          evidence = { html, fingerprint: await fingerprint(project, state.panelSelector) };
        } else if (stage === "replay") {
          state.defaultFingerprint = await fingerprint(project, state.panelSelector);
          evidence = { benchId: state.benchId, fingerprint: state.defaultFingerprint };
        } else if (stage === "layout") {
          const box = await project.page.locator(
            `${state.panelSelector} [data-viz-signature-lab]`).first().boundingBox();
          assert.ok(box && box.height > 0 && box.width > 0,
            `${sample.group.groupKey}: California Phase4 layout lacks positive bounds`);
          evidence = { box, deviceScaleFactor: await project.page.evaluate(() => devicePixelRatio) };
        } else {
          assert.ok(state.defaultFingerprint,
            `${sample.group.groupKey}: California Phase4 Reset lacks replayed default`);
          const canvas = project.page.locator(
            `${state.panelSelector} [data-viz-signature-lab] canvas[data-viz-mark]`).first();
          const oldCanvas = await canvas.elementHandle();
          assert.ok(oldCanvas, `${sample.group.groupKey}: California Phase4 Reset lacks Canvas`);
          await project.page.locator(
            `${state.panelSelector} [data-viz-signature-lab] [data-viz-reset-model]`).first().click();
          await project.page.waitForFunction((element: Element) => !element.isConnected, oldCanvas);
          const restoredFingerprint = await fingerprint(project, state.panelSelector);
          assert.equal(restoredFingerprint, state.defaultFingerprint,
            `${sample.group.groupKey}: California Phase4 Reset did not restore default`);
          evidence = { canvasReplaced: true, restoredFingerprint };
        }
      }
      await assertPhysicalProject(project);
      return {
        browserContextIdentitySha256: project.identitySha256,
        completed: true,
        evidenceSha256: sha256(stableJson({
          acceptedBuildReceiptSha256: options.acceptedReceipt.acceptedBuildReceiptSha256,
          evidence,
          executionPlanSha256: options.acceptedReceipt.executionPlanSha256,
          groupKey: sample.group.groupKey,
          stage
        })),
        projectName: axis.projectName,
        stage
      };
    }
  };
}

/* Prevent unused-code erasure from hiding the dormant adapter during source review. */
void launchPhysicalChrome;

/**
 * Production remains a zero-argument, unconditional diagnostic HOLD. A future
 * A22 publisher must provide an uncloneable in-process authority; directory
 * scans, copied receipt bytes, environment variables, argv, and globals are
 * intentionally incapable of reaching the dormant adapter.
 */
export async function prepareCaliforniaSignatureFinalCompositorPhase4RealMeasurementDriver():
Promise<CaliforniaSignatureFinalCompositorPhase4RealDriverLease> {
  if (arguments.length !== 0) {
    throw new Error(
      "California Phase4 real measurement driver takes no caller-authored timing, environment, samples, or receipt"
    );
  }
  throw new Error(
    "California Phase4 real measurement driver HOLD: no A22 lifecycle provenance authority, fresh " +
    "accepted production BUILD_ID, accepted server, physical Chrome, or reviewed Sharp hand-off is " +
    "installed; formal execution authorization remains false"
  );
}
