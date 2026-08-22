import assert from "node:assert/strict";
import test from "node:test";
import { chromium, type Browser, type Page } from "@playwright/test";
import {
  collectCaliforniaCanvasTextFindings,
  installCaliforniaCanvasTextAudit,
  type CaliforniaCanvasTextAuditPageApi,
  type CaliforniaCanvasTextAuditResult
} from "./california-canvas-text-audit";

const context = {
  benchId: "synthetic-canary",
  state: "default",
  viewport: "desktop" as const
};

async function audit(page: Page, selector: string, timeoutMs = 1_000): Promise<CaliforniaCanvasTextAuditResult> {
  await page.locator(selector).scrollIntoViewIfNeeded();
  return collectCaliforniaCanvasTextFindings(page.locator(selector), context, {
    pollMs: 20,
    quietMs: 60,
    timeoutMs
  });
}

function kinds(result: CaliforniaCanvasTextAuditResult) {
  return result.findings.map((finding) => finding.kind);
}

async function contrastInputsFor(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  return page.evaluate((targetSelector) => {
    const auditWindow = window as Window & { __californiaCanvasTextAudit?: CaliforniaCanvasTextAuditPageApi };
    const root = document.querySelector(targetSelector) as HTMLElement | null;
    const api = auditWindow.__californiaCanvasTextAudit;
    if (!root || !api) throw new Error(`Canvas contrast fixture missing: ${targetSelector}`);
    return api.contrastInputs(root).map((input) => ({
      text: input.text,
      unsupportedReasons: input.unsupportedReasons,
      visibleChangedSampleCount: input.visibleChangedSampleCount
    }));
  }, selector);
}

test("California Canvas text audit synthetic canaries", { timeout: 30_000 }, async (t) => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required for the Canvas text audit canary: ${String(error)}`);
  }
  t.after(async () => browser?.close());

  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { height: 900, width: 1000 } });
  await installCaliforniaCanvasTextAudit(page);
  await page.goto("data:text/html,<meta charset=utf-8><title>canvas-audit-canary</title>");
  await page.addScriptTag({
    content: `
    document.body.style.margin = "0";
    document.body.innerHTML = \`
      <section id="safe"></section>
      <section id="boundary"></section>
      <section id="overlap"></section>
      <section id="layer"></section>
      <section id="duplicate-fill"></section>
      <section id="letter-spacing"></section>
      <section id="letter-spacing-overlap"></section>
      <section id="styled-safe"></section>
      <section id="stacked-canvases" style="position:relative;width:240px;height:100px"></section>
      <section id="rotated"></section>
      <section id="max-width"></section>
      <section id="alpha-zero"></section>
      <section id="semitransparent"></section>
      <section id="destination-out"></section>
      <section id="destination-out-zero"></section>
      <section id="clipped-boundary"></section>
      <section id="clipped-overlap"></section>
      <section id="transformed-clip"></section>
      <section id="unsupported-clip"></section>
      <section id="unsupported-path2d"></section>
      <section id="same-size-resize"></section>
      <section id="attribute-resize"></section>
      <section id="context-reset"></section>
      <section id="clipped-clear"></section>
      <section id="rotated-clear"></section>
      <section id="infinite-clear"></section>
      <section id="oversized-mask"></section>
      <section id="unbound-canvas"></section>
      <section id="context-registry"></section>
      <section id="raster-revision"></section>
      <section id="post-text-non-overlap"></section>
      <section id="post-text-overlap"></section>
      <section id="post-text-path-non-overlap"></section>
      <section id="post-text-path-overlap"></section>
      <section id="post-text-transformed-non-overlap"></section>
      <section id="post-text-unknown-path"></section>
      <section id="post-text-unknown-transform"></section>
      <section id="post-text-unknown-composite"></section>
      <section id="post-text-unknown-image"></section>
      <section id="partial-clear"></section>
      <section id="record-limit"></section>
      <section id="aggregate-mask-limit"></section>
      <section id="semantic-visibility" style="position:relative;width:240px;height:110px"></section>
      <section id="unsupported-transform"></section>
      <section id="draw-image-text"></section>
      <section id="dom-control" style="position:relative;width:240px;height:110px"></section>
      <section id="dom-text" style="position:relative;width:240px;height:110px"></section>
      <section id="never-settled"></section>
    \`;

    const makeCanvas = (selector, width, height) => {
      const root = document.querySelector(selector);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.style.cssText = \`display:block;width:\${width}px;height:\${height}px\`;
      root.append(canvas);
      const drawing = canvas.getContext("2d");
      drawing.clearRect(0, 0, width, height);
      drawing.fillStyle = "#111827";
      drawing.strokeStyle = "#111827";
      return { canvas, drawing, root };
    };

    const safeOne = makeCanvas("#safe", 320, 100);
    safeOne.drawing.font = "20px sans-serif";
    safeOne.drawing.fillText("SAFE ONE", 12, 32);
    const safeTwo = makeCanvas("#safe", 320, 100);
    safeTwo.drawing.font = "20px sans-serif";
    safeTwo.drawing.fillText("SAFE TWO", 170, 72);

    const boundary = makeCanvas("#boundary", 160, 80);
    boundary.drawing.font = "24px sans-serif";
    boundary.drawing.fillText("OUTSIDE", 145, 44);

    const overlap = makeCanvas("#overlap", 220, 90);
    overlap.drawing.font = "30px sans-serif";
    overlap.drawing.fillText("MMMM", 20, 50);
    overlap.drawing.fillText("WWWW", 20, 50);

    const layer = makeCanvas("#layer", 220, 90);
    layer.drawing.font = "30px sans-serif";
    layer.drawing.lineWidth = 3;
    layer.drawing.strokeText("LAYER", 20, 52);
    layer.drawing.fillText("LAYER", 20, 52);

    const duplicateFill = makeCanvas("#duplicate-fill", 220, 90);
    duplicateFill.drawing.font = "30px sans-serif";
    duplicateFill.drawing.fillText("DUPLICATE", 20, 52);
    duplicateFill.drawing.fillText("DUPLICATE", 20, 52);

    const letterSpacing = makeCanvas("#letter-spacing", 150, 75);
    letterSpacing.drawing.font = "20px sans-serif";
    letterSpacing.drawing.letterSpacing = "12px";
    letterSpacing.drawing.fillText("IIII", 100, 42);

    const letterSpacingOverlap = makeCanvas("#letter-spacing-overlap", 230, 90);
    letterSpacingOverlap.drawing.font = "20px sans-serif";
    letterSpacingOverlap.drawing.letterSpacing = "15px";
    letterSpacingOverlap.drawing.fillText("IIII", 20, 52);
    letterSpacingOverlap.drawing.letterSpacing = "0px";
    letterSpacingOverlap.drawing.fillText("MMMM", 65, 52);

    const styledSafe = makeCanvas("#styled-safe", 300, 100);
    styledSafe.drawing.font = "22px sans-serif";
    styledSafe.drawing.letterSpacing = "2px";
    styledSafe.drawing.wordSpacing = "3px";
    styledSafe.drawing.fontKerning = "none";
    styledSafe.drawing.fontStretch = "condensed";
    styledSafe.drawing.fontVariantCaps = "small-caps";
    styledSafe.drawing.textRendering = "geometricPrecision";
    styledSafe.drawing.lang = "en";
    styledSafe.drawing.filter = "blur(0.25px)";
    styledSafe.drawing.shadowBlur = 1;
    styledSafe.drawing.shadowColor = "rgba(15, 23, 42, 0.35)";
    styledSafe.drawing.shadowOffsetX = 1;
    styledSafe.drawing.shadowOffsetY = 1;
    styledSafe.drawing.lineJoin = "round";
    styledSafe.drawing.miterLimit = 4;
    styledSafe.drawing.strokeText("Styled text", 20, 55);

    const stackedOne = makeCanvas("#stacked-canvases", 240, 100);
    stackedOne.canvas.style.position = "absolute";
    stackedOne.canvas.style.inset = "0";
    stackedOne.drawing.font = "28px sans-serif";
    stackedOne.drawing.fillText("STACKED", 20, 55);
    const stackedTwo = makeCanvas("#stacked-canvases", 240, 100);
    stackedTwo.canvas.style.position = "absolute";
    stackedTwo.canvas.style.inset = "0";
    stackedTwo.drawing.font = "28px sans-serif";
    stackedTwo.drawing.fillText("CROSSED", 20, 55);

    const rotated = makeCanvas("#rotated", 240, 130);
    rotated.drawing.save();
    rotated.drawing.translate(120, 65);
    rotated.drawing.rotate(-Math.PI / 6);
    rotated.drawing.font = "24px sans-serif";
    rotated.drawing.textAlign = "center";
    rotated.drawing.textBaseline = "middle";
    rotated.drawing.fillText("ROTATED", 0, 0);
    rotated.drawing.restore();

    const maxWidth = makeCanvas("#max-width", 90, 70);
    maxWidth.drawing.font = "30px sans-serif";
    maxWidth.drawing.fillText("THIS IS WIDE", 5, 42, 70);

    const alphaZero = makeCanvas("#alpha-zero", 220, 90);
    alphaZero.drawing.font = "28px sans-serif";
    alphaZero.drawing.globalAlpha = 0;
    alphaZero.drawing.fillText("INVISIBLE FILL", 10, 40);
    alphaZero.drawing.globalAlpha = 1;
    alphaZero.drawing.strokeStyle = "rgba(17, 24, 39, 0)";
    alphaZero.drawing.strokeText("INVISIBLE STROKE", 10, 72);

    const semitransparent = makeCanvas("#semitransparent", 160, 80);
    semitransparent.drawing.font = "24px sans-serif";
    semitransparent.drawing.globalAlpha = 0.25;
    semitransparent.drawing.fillStyle = "rgba(17, 24, 39, 0.25)";
    semitransparent.drawing.fillText("FAINT OUTSIDE", 145, 44);

    const destinationOut = makeCanvas("#destination-out", 220, 90);
    destinationOut.drawing.fillRect(0, 0, 220, 90);
    destinationOut.drawing.font = "28px sans-serif";
    destinationOut.drawing.globalCompositeOperation = "destination-out";
    destinationOut.drawing.fillText("KNOCKOUT", 10, 50);

    const destinationOutZero = makeCanvas("#destination-out-zero", 220, 90);
    destinationOutZero.drawing.fillRect(0, 0, 220, 90);
    destinationOutZero.drawing.font = "28px sans-serif";
    destinationOutZero.drawing.globalAlpha = 0;
    destinationOutZero.drawing.globalCompositeOperation = "destination-out";
    destinationOutZero.drawing.fillText("NO EFFECT", 10, 50);

    const clippedBoundary = makeCanvas("#clipped-boundary", 160, 80);
    clippedBoundary.drawing.font = "24px sans-serif";
    clippedBoundary.drawing.beginPath();
    clippedBoundary.drawing.rect(0, 0, 158, 80);
    clippedBoundary.drawing.clip();
    clippedBoundary.drawing.fillText("CLIPPED OUTSIDE", 145, 44);

    const clippedOverlap = makeCanvas("#clipped-overlap", 220, 90);
    clippedOverlap.drawing.font = "30px sans-serif";
    clippedOverlap.drawing.beginPath();
    clippedOverlap.drawing.rect(0, 0, 220, 90);
    clippedOverlap.drawing.clip("evenodd");
    clippedOverlap.drawing.fillText("MMMM", 20, 50);
    clippedOverlap.drawing.fillText("WWWW", 20, 50);

    const transformedClip = makeCanvas("#transformed-clip", 220, 100);
    transformedClip.drawing.save();
    transformedClip.drawing.translate(35, 10);
    transformedClip.drawing.beginPath();
    transformedClip.drawing.rect(0, 0, 150, 75);
    transformedClip.drawing.clip();
    transformedClip.drawing.font = "24px sans-serif";
    transformedClip.drawing.fillText("TRANSFORMED", 5, 42);
    transformedClip.drawing.restore();

    const unsupportedClip = makeCanvas("#unsupported-clip", 220, 100);
    unsupportedClip.drawing.beginPath();
    unsupportedClip.drawing.arc(100, 50, 45, 0, Math.PI * 2);
    unsupportedClip.drawing.clip();
    unsupportedClip.drawing.font = "24px sans-serif";
    unsupportedClip.drawing.fillText("CIRCLE CLIP", 25, 58);

    const unsupportedPath2d = makeCanvas("#unsupported-path2d", 220, 100);
    const path = new Path2D();
    path.rect(0, 0, 180, 90);
    unsupportedPath2d.drawing.clip(path, "nonzero");
    unsupportedPath2d.drawing.font = "24px sans-serif";
    unsupportedPath2d.drawing.fillText("PATH2D CLIP", 15, 58);

    const sameSizeResize = makeCanvas("#same-size-resize", 160, 80);
    sameSizeResize.drawing.font = "24px sans-serif";
    sameSizeResize.drawing.fillText("STALE OUTSIDE", 145, 44);
    sameSizeResize.canvas.width = 160;
    sameSizeResize.drawing.font = "20px sans-serif";
    sameSizeResize.drawing.fillText("FRESH", 10, 35);

    const attributeResize = makeCanvas("#attribute-resize", 160, 80);
    attributeResize.drawing.font = "24px sans-serif";
    attributeResize.drawing.fillText("STALE ATTRIBUTE", 145, 44);
    attributeResize.canvas.setAttribute("width", "160");
    attributeResize.drawing.font = "20px sans-serif";
    attributeResize.drawing.fillText("FRESH", 10, 35);

    const contextReset = makeCanvas("#context-reset", 160, 80);
    contextReset.drawing.font = "24px sans-serif";
    contextReset.drawing.fillText("STALE RESET", 145, 44);
    contextReset.drawing.reset?.();
    contextReset.drawing.font = "20px sans-serif";
    contextReset.drawing.fillText("FRESH", 10, 35);

    const clippedClear = makeCanvas("#clipped-clear", 160, 80);
    clippedClear.drawing.font = "24px sans-serif";
    clippedClear.drawing.fillText("REMAINS OUTSIDE", 145, 44);
    clippedClear.drawing.beginPath();
    clippedClear.drawing.rect(0, 0, 80, 80);
    clippedClear.drawing.clip();
    clippedClear.drawing.clearRect(0, 0, 160, 80);

    const rotatedClear = makeCanvas("#rotated-clear", 160, 80);
    rotatedClear.drawing.font = "24px sans-serif";
    rotatedClear.drawing.fillText("ROTATED CLEAR MUST NOT DROP", 145, 44);
    rotatedClear.drawing.save();
    rotatedClear.drawing.translate(80, 40);
    rotatedClear.drawing.rotate(Math.PI / 4);
    rotatedClear.drawing.clearRect(-85, -35, 170, 70);
    rotatedClear.drawing.restore();

    const infiniteClear = makeCanvas("#infinite-clear", 160, 80);
    infiniteClear.drawing.font = "24px sans-serif";
    infiniteClear.drawing.fillText("INFINITY MUST NOT DROP", 145, 44);
    infiniteClear.drawing.clearRect(-Infinity, -Infinity, Infinity, Infinity);

    const oversizedMask = makeCanvas("#oversized-mask", 160, 80);
    oversizedMask.drawing.setTransform(5000, 0, 0, 5000, 0, 0);
    oversizedMask.drawing.font = "20px sans-serif";
    oversizedMask.drawing.fillText("HUGE", 0, 1);

    const unboundCanvas = document.createElement("canvas");
    unboundCanvas.width = 160;
    unboundCanvas.height = 80;
    unboundCanvas.style.cssText = "display:block;width:160px;height:80px";
    let unboundGetContextCalls = 0;
    const unboundNativeGetContext = unboundCanvas.getContext.bind(unboundCanvas);
    unboundCanvas.getContext = (...args) => {
      unboundGetContextCalls += 1;
      return unboundNativeGetContext(...args);
    };
    document.querySelector("#unbound-canvas").append(unboundCanvas);
    window.__unboundCanvasGetContextCalls = () => unboundGetContextCalls;

    const registryRoot = document.querySelector("#context-registry");
    const registryUnknown = document.createElement("canvas");
    registryUnknown.width = 80;
    registryUnknown.height = 40;
    registryUnknown.style.cssText = "display:block;width:80px;height:40px";
    registryUnknown.dataset.registryCanvas = "unknown";
    registryRoot.append(registryUnknown);
    const registryTwoD = document.createElement("canvas");
    registryTwoD.width = 80;
    registryTwoD.height = 40;
    registryTwoD.style.cssText = "display:block;width:80px;height:40px";
    registryTwoD.dataset.registryCanvas = "2d";
    registryRoot.append(registryTwoD);
    registryTwoD.getContext("2d");
    const registryWebgl = document.createElement("canvas");
    registryWebgl.width = 80;
    registryWebgl.height = 40;
    registryWebgl.style.cssText = "display:block;width:80px;height:40px";
    registryWebgl.dataset.registryCanvas = "webgl";
    registryRoot.append(registryWebgl);
    const acquiredWebgl = registryWebgl.getContext("webgl2") ?? registryWebgl.getContext("webgl");
    window.__expectedRegistryWebglKind = acquiredWebgl
      ? typeof WebGL2RenderingContext !== "undefined" && acquiredWebgl instanceof WebGL2RenderingContext
        ? "webgl2"
        : "webgl"
      : "unknown";

    const rasterRevision = makeCanvas("#raster-revision", 180, 90);
    window.__rasterRevisionContext = rasterRevision.drawing;

    const postTextNonOverlap = makeCanvas("#post-text-non-overlap", 500, 120);
    postTextNonOverlap.drawing.fillStyle = "#ffffff";
    postTextNonOverlap.drawing.fillRect(0, 0, 500, 120);
    postTextNonOverlap.drawing.fillStyle = "#111827";
    postTextNonOverlap.drawing.font = "32px sans-serif";
    postTextNonOverlap.drawing.fillText("NON OVERLAP", 20, 62);
    postTextNonOverlap.drawing.fillStyle = "#dc2626";
    postTextNonOverlap.drawing.fillRect(430, 88, 40, 20);

    const postTextOverlap = makeCanvas("#post-text-overlap", 500, 120);
    postTextOverlap.drawing.fillStyle = "#ffffff";
    postTextOverlap.drawing.fillRect(0, 0, 500, 120);
    postTextOverlap.drawing.fillStyle = "#111827";
    postTextOverlap.drawing.font = "32px sans-serif";
    postTextOverlap.drawing.fillText("COVERED GLYPH", 20, 62);
    postTextOverlap.drawing.fillStyle = "#ffffff";
    postTextOverlap.drawing.fillRect(12, 20, 280, 60);

    const postTextPathNonOverlap = makeCanvas("#post-text-path-non-overlap", 500, 120);
    postTextPathNonOverlap.drawing.fillStyle = "#ffffff";
    postTextPathNonOverlap.drawing.fillRect(0, 0, 500, 120);
    postTextPathNonOverlap.drawing.fillStyle = "#111827";
    postTextPathNonOverlap.drawing.font = "32px sans-serif";
    postTextPathNonOverlap.drawing.fillText("PATH SAFE", 20, 62);
    postTextPathNonOverlap.drawing.beginPath();
    postTextPathNonOverlap.drawing.moveTo(446, 86);
    postTextPathNonOverlap.drawing.arcTo(478, 86, 478, 112, 8);
    postTextPathNonOverlap.drawing.arcTo(478, 112, 438, 112, 8);
    postTextPathNonOverlap.drawing.arcTo(438, 112, 438, 86, 8);
    postTextPathNonOverlap.drawing.arcTo(438, 86, 478, 86, 8);
    postTextPathNonOverlap.drawing.closePath();
    postTextPathNonOverlap.drawing.fill();

    const postTextPathOverlap = makeCanvas("#post-text-path-overlap", 500, 120);
    postTextPathOverlap.drawing.fillStyle = "#ffffff";
    postTextPathOverlap.drawing.fillRect(0, 0, 500, 120);
    postTextPathOverlap.drawing.fillStyle = "#111827";
    postTextPathOverlap.drawing.font = "32px sans-serif";
    postTextPathOverlap.drawing.fillText("ARC COVER", 20, 62);
    postTextPathOverlap.drawing.fillStyle = "#ffffff";
    postTextPathOverlap.drawing.beginPath();
    postTextPathOverlap.drawing.arc(100, 48, 70, 0, Math.PI * 2);
    postTextPathOverlap.drawing.fill();

    const postTextTransformedNonOverlap = makeCanvas("#post-text-transformed-non-overlap", 500, 120);
    postTextTransformedNonOverlap.drawing.fillStyle = "#ffffff";
    postTextTransformedNonOverlap.drawing.fillRect(0, 0, 500, 120);
    postTextTransformedNonOverlap.drawing.fillStyle = "#111827";
    postTextTransformedNonOverlap.drawing.font = "32px sans-serif";
    postTextTransformedNonOverlap.drawing.fillText("AFFINE SAFE", 20, 62);
    postTextTransformedNonOverlap.drawing.save();
    postTextTransformedNonOverlap.drawing.translate(450, 90);
    postTextTransformedNonOverlap.drawing.rotate(0.25);
    postTextTransformedNonOverlap.drawing.fillRect(0, 0, 24, 16);
    postTextTransformedNonOverlap.drawing.restore();

    const postTextUnknownPath = makeCanvas("#post-text-unknown-path", 500, 120);
    postTextUnknownPath.drawing.fillStyle = "#ffffff";
    postTextUnknownPath.drawing.fillRect(0, 0, 500, 120);
    postTextUnknownPath.drawing.fillStyle = "#111827";
    postTextUnknownPath.drawing.font = "32px sans-serif";
    postTextUnknownPath.drawing.fillText("PATH2D", 20, 62);
    const opaquePath = new Path2D();
    opaquePath.rect(450, 92, 20, 16);
    postTextUnknownPath.drawing.fill(opaquePath);

    const postTextUnknownTransform = makeCanvas("#post-text-unknown-transform", 500, 120);
    postTextUnknownTransform.drawing.fillStyle = "#ffffff";
    postTextUnknownTransform.drawing.fillRect(0, 0, 500, 120);
    postTextUnknownTransform.drawing.fillStyle = "#111827";
    postTextUnknownTransform.drawing.font = "32px sans-serif";
    postTextUnknownTransform.drawing.fillText("MATRIX", 20, 62);
    const nativeMatrixReader = postTextUnknownTransform.drawing.getTransform.bind(postTextUnknownTransform.drawing);
    postTextUnknownTransform.drawing.getTransform = () => ({
      a: Number.NaN, b: 0, c: 0, d: 1, e: 0, f: 0
    });
    postTextUnknownTransform.drawing.fillRect(450, 92, 20, 16);
    postTextUnknownTransform.drawing.getTransform = nativeMatrixReader;

    const postTextUnknownComposite = makeCanvas("#post-text-unknown-composite", 500, 120);
    postTextUnknownComposite.drawing.fillStyle = "#ffffff";
    postTextUnknownComposite.drawing.fillRect(0, 0, 500, 120);
    postTextUnknownComposite.drawing.fillStyle = "#111827";
    postTextUnknownComposite.drawing.font = "32px sans-serif";
    postTextUnknownComposite.drawing.fillText("COMPOSITE", 20, 62);
    postTextUnknownComposite.drawing.globalCompositeOperation = "copy";
    postTextUnknownComposite.drawing.fillRect(450, 92, 20, 16);
    postTextUnknownComposite.drawing.globalCompositeOperation = "source-over";

    const postTextUnknownImage = makeCanvas("#post-text-unknown-image", 500, 120);
    postTextUnknownImage.drawing.fillStyle = "#ffffff";
    postTextUnknownImage.drawing.fillRect(0, 0, 500, 120);
    postTextUnknownImage.drawing.fillStyle = "#111827";
    postTextUnknownImage.drawing.font = "32px sans-serif";
    postTextUnknownImage.drawing.fillText("IMAGE", 20, 62);
    const opaqueImageSource = document.createElement("canvas");
    opaqueImageSource.width = 10;
    opaqueImageSource.height = 10;
    postTextUnknownImage.drawing.drawImage(opaqueImageSource, 450, 92);

    const partialClear = makeCanvas("#partial-clear", 180, 90);
    partialClear.drawing.font = "20px sans-serif";
    for (let index = 0; index < 320; index += 1) {
      partialClear.drawing.fillText("PARTIAL", 10, 40);
      partialClear.drawing.clearRect(0, 0, 24, 24);
    }

    const recordLimit = makeCanvas("#record-limit", 240, 100);
    recordLimit.drawing.font = "16px sans-serif";
    for (let index = 0; index < 300; index += 1) {
      recordLimit.drawing.fillText("LIMIT", 10, 35);
    }

    const aggregateMaskLimit = makeCanvas("#aggregate-mask-limit", 900, 500);
    aggregateMaskLimit.drawing.font = "64px sans-serif";
    for (let index = 0; index < 80; index += 1) {
      aggregateMaskLimit.drawing.fillText("MMMM", 250, 260);
    }

    const semanticVisibility = makeCanvas("#semantic-visibility", 240, 100);
    semanticVisibility.drawing.font = "28px sans-serif";
    semanticVisibility.drawing.fillText("VISIBLE", 20, 55);
    const semanticOverlay = document.createElement("div");
    semanticOverlay.inert = true;
    semanticOverlay.setAttribute("aria-hidden", "true");
    semanticOverlay.textContent = "VISIBLE";
    semanticOverlay.style.cssText = "position:absolute;left:18px;top:28px;font:28px sans-serif;color:#111";
    semanticVisibility.root.append(semanticOverlay);

    const unsupportedTransform = makeCanvas("#unsupported-transform", 240, 100);
    unsupportedTransform.canvas.style.transform = "rotate(2deg)";
    unsupportedTransform.drawing.font = "24px sans-serif";
    unsupportedTransform.drawing.fillText("ROTATED CSS", 20, 55);

    const drawImageSource = makeCanvas("#draw-image-text", 240, 100);
    drawImageSource.drawing.font = "24px sans-serif";
    drawImageSource.drawing.fillText("SOURCE TEXT", 20, 55);
    const drawImageDestination = makeCanvas("#draw-image-text", 240, 100);
    drawImageDestination.drawing.drawImage(drawImageSource.canvas, 0, 0);

    const dom = makeCanvas("#dom-control", 240, 100);
    dom.drawing.font = "28px sans-serif";
    dom.drawing.beginPath();
    dom.drawing.rect(0, 0, 240, 100);
    dom.drawing.clip();
    dom.drawing.fillText("CONTROL", 20, 55);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Overlay action";
    button.style.cssText = "position:absolute;left:15px;top:25px;width:145px;height:42px;opacity:1";
    dom.root.append(button);

    const domText = makeCanvas("#dom-text", 240, 100);
    domText.drawing.font = "28px sans-serif";
    domText.drawing.fillText("DOM TEXT", 20, 55);
    const overlayText = document.createElement("div");
    overlayText.textContent = "Visible overlay";
    overlayText.style.cssText = "position:absolute;left:18px;top:28px;font:24px sans-serif;color:#111;width:170px;height:40px";
    domText.root.append(overlayText);

    const moving = makeCanvas("#never-settled", 180, 70);
    moving.drawing.font = "20px sans-serif";
    let tick = 0;
    const timer = window.setInterval(() => {
      moving.drawing.clearRect(0, 0, 180, 70);
      moving.drawing.fillText(\`tick \${tick}\`, 10, 35);
      tick += 1;
    }, 10);
    window.__stopCanvasCanary = () => clearInterval(timer);
    `
  });

  const safe = await audit(page, "#safe");
  assert.equal(safe.canvasCount, 2, "all visible canvases below the root must be collected");
  assert.deepEqual(safe.findings, [], "separated safe text should pass");

  const boundary = await audit(page, "#boundary");
  assert.ok(kinds(boundary).includes("canvas-text-outside-buffer"), "out-of-buffer glyphs must fail");

  const overlap = await audit(page, "#overlap");
  assert.ok(kinds(overlap).includes("canvas-text-raster-overlap"), "different glyph layers must collide");

  const layer = await audit(page, "#layer");
  assert.equal(layer.textLayerCount, 1, "strokeText + fillText at the same anchor must merge into one layer");
  assert.ok(!kinds(layer).includes("canvas-text-raster-overlap"), "stroke + fill must not collide with itself");

  const duplicateFill = await audit(page, "#duplicate-fill");
  assert.equal(duplicateFill.textLayerCount, 2, "two adjacent fillText calls must remain distinct layers");
  assert.ok(
    kinds(duplicateFill).includes("canvas-text-raster-overlap"),
    "duplicate fill/fill text must not be hidden by decorative-layer merging"
  );

  const letterSpacing = await audit(page, "#letter-spacing");
  assert.ok(
    kinds(letterSpacing).includes("canvas-text-outside-buffer"),
    "letterSpacing must shape the replay mask and expose the real overflow"
  );

  const letterSpacingOverlap = await audit(page, "#letter-spacing-overlap");
  assert.ok(
    kinds(letterSpacingOverlap).includes("canvas-text-raster-overlap"),
    "letterSpacing must shape collision masks, not only boundary masks"
  );

  const styledSafe = await audit(page, "#styled-safe");
  assert.deepEqual(
    styledSafe.findings,
    [],
    "supported shaping, filter, shadow, and stroke state must replay without a false failure"
  );

  const stackedCanvases = await audit(page, "#stacked-canvases");
  assert.ok(
    stackedCanvases.findings.some((finding) =>
      finding.kind === "canvas-text-raster-overlap" && finding.otherCanvasId !== undefined
    ),
    "text on stacked canvases must collide in common viewport coordinates"
  );

  const rotated = await audit(page, "#rotated");
  assert.deepEqual(rotated.findings, [], "rotated text inside the backing buffer should pass");

  const maxWidth = await audit(page, "#max-width");
  assert.deepEqual(maxWidth.findings, [], "fillText maxWidth must be honored by the raster mask");

  const alphaZero = await audit(page, "#alpha-zero");
  assert.equal(alphaZero.textLayerCount, 0, "zero effective fill/stroke alpha must not create a text layer");
  assert.deepEqual(alphaZero.findings, [], "zero-alpha text must not create a fake collision finding");

  const semitransparent = await audit(page, "#semitransparent");
  assert.equal(semitransparent.textLayerCount, 1, "non-zero semitransparent text must remain auditable");
  assert.ok(
    kinds(semitransparent).includes("canvas-text-outside-buffer"),
    "low effective alpha must not hide out-of-buffer glyphs"
  );

  const destinationOut = await audit(page, "#destination-out");
  assert.deepEqual(
    kinds(destinationOut),
    ["canvas-audit-unsupported-composite"],
    "non-zero destination-dependent compositing must fail explicitly instead of fake-green replay"
  );

  const destinationOutZero = await audit(page, "#destination-out-zero");
  assert.equal(destinationOutZero.textLayerCount, 0, "zero-alpha destination-out has no effective source layer");
  assert.deepEqual(destinationOutZero.findings, [], "zero-alpha destination-out is provably inert");

  const clippedBoundary = await audit(page, "#clipped-boundary");
  assert.equal(clippedBoundary.clippedTextLayerCount, 1, "rect-clipped visible text must be replayed");
  assert.ok(
    !kinds(clippedBoundary).includes("canvas-text-outside-buffer"),
    "rect clipping must remove glyph pixels beyond the backing buffer before boundary analysis"
  );

  const clippedOverlap = await audit(page, "#clipped-overlap");
  assert.ok(
    kinds(clippedOverlap).includes("canvas-text-raster-overlap"),
    "rect-clipped text must still participate in text-overlap analysis"
  );

  const transformedClip = await audit(page, "#transformed-clip");
  assert.equal(transformedClip.clippedTextLayerCount, 1, "transformed rectangle clips must remain auditable");
  assert.deepEqual(transformedClip.findings, [], "transformed in-buffer clipped text should pass");

  const unsupportedClip = await audit(page, "#unsupported-clip");
  assert.deepEqual(
    kinds(unsupportedClip),
    ["canvas-audit-unsupported-clip"],
    "non-rectangular current-path clipping must fail explicitly"
  );

  const unsupportedPath2d = await audit(page, "#unsupported-path2d");
  assert.deepEqual(
    kinds(unsupportedPath2d),
    ["canvas-audit-unsupported-clip"],
    "opaque Path2D clipping must fail explicitly"
  );

  const sameSizeResize = await audit(page, "#same-size-resize");
  assert.deepEqual(
    sameSizeResize.findings,
    [],
    "assigning a same-value canvas dimension must discard recorder state from the reset backing buffer"
  );
  assert.equal(sameSizeResize.textLayerCount, 1, "only post-resize text may remain in recorder state");

  const attributeResize = await audit(page, "#attribute-resize");
  assert.deepEqual(attributeResize.findings, [], "setAttribute(width) must reset stale recorder state");
  assert.equal(attributeResize.textLayerCount, 1, "only post-attribute-resize text may remain");

  const contextReset = await audit(page, "#context-reset");
  assert.deepEqual(contextReset.findings, [], "context.reset() must reset stale recorder state");
  assert.equal(contextReset.textLayerCount, 1, "only post-context.reset text may remain");

  const clippedClear = await audit(page, "#clipped-clear");
  assert.ok(
    clippedClear.findings.some((finding) =>
      finding.kind === "canvas-audit-unsupported-state" && finding.detail.includes("partial or clipped clearRect")
    ),
    "a full-size clearRect under a smaller active clip must fail closed"
  );

  const rotatedClear = await audit(page, "#rotated-clear");
  assert.ok(
    rotatedClear.findings.some((finding) =>
      finding.kind === "canvas-audit-unsupported-state" && finding.detail.includes("partial or clipped clearRect")
    ),
    "an indeterminate rotated clear must fail closed"
  );

  const infiniteClear = await audit(page, "#infinite-clear");
  assert.ok(
    infiniteClear.findings.some((finding) =>
      finding.kind === "canvas-audit-unsupported-state" && finding.detail.includes("partial or clipped clearRect")
    ),
    "non-finite clearRect arguments must fail closed"
  );

  const oversizedMask = await audit(page, "#oversized-mask");
  assert.deepEqual(
    kinds(oversizedMask),
    ["canvas-audit-mask-too-large"],
    "oversized masks must fail closed before scratch-canvas allocation"
  );

  const registry = await page.evaluate(() => {
    const auditWindow = window as Window & {
      __californiaCanvasTextAudit?: CaliforniaCanvasTextAuditPageApi;
      __expectedRegistryWebglKind?: string;
    };
    const api = auditWindow.__californiaCanvasTextAudit;
    if (!api) throw new Error("Canvas audit API must be installed");
    const contextKind = (selector: string) => api.contextKindFor(
      document.querySelector(selector) as HTMLCanvasElement
    );
    return {
      expectedWebgl: auditWindow.__expectedRegistryWebglKind,
      twoD: contextKind('[data-registry-canvas="2d"]'),
      unknown: contextKind('[data-registry-canvas="unknown"]'),
      version: api.version,
      webgl: contextKind('[data-registry-canvas="webgl"]')
    };
  });
  assert.deepEqual(registry, {
    expectedWebgl: registry.expectedWebgl,
    twoD: "2d",
    unknown: "unknown",
    version: 4,
    webgl: registry.expectedWebgl
  }, "contextKindFor must report only application-acquired context kinds without mutation");

  await page.locator("#raster-revision").scrollIntoViewIfNeeded();
  const rasterRevisions = await page.evaluate(() => {
    const auditWindow = window as Window & {
      __californiaCanvasTextAudit?: CaliforniaCanvasTextAuditPageApi;
      __rasterRevisionContext?: CanvasRenderingContext2D;
    };
    const root = document.querySelector("#raster-revision") as HTMLElement | null;
    const api = auditWindow.__californiaCanvasTextAudit;
    const drawing = auditWindow.__rasterRevisionContext;
    if (!root || !api || !drawing) throw new Error("raster revision fixture must be installed");
    const signatures = [api.signature(root).signature];
    drawing.beginPath();
    drawing.rect(2, 2, 20, 20);
    drawing.fill();
    signatures.push(api.signature(root).signature);
    drawing.stroke();
    signatures.push(api.signature(root).signature);
    drawing.fillRect(30, 2, 12, 12);
    signatures.push(api.signature(root).signature);
    drawing.strokeRect(48, 2, 12, 12);
    signatures.push(api.signature(root).signature);
    drawing.putImageData(new ImageData(1, 1), 70, 2);
    signatures.push(api.signature(root).signature);
    const source = document.createElement("canvas");
    source.width = 2;
    source.height = 2;
    source.getContext("2d");
    drawing.drawImage(source, 80, 2);
    signatures.push(api.signature(root).signature);
    return signatures;
  });
  assert.equal(
    new Set(rasterRevisions).size,
    rasterRevisions.length,
    "every supported raster mutation must advance the stability signature"
  );

  const nonOverlappingTerminalInputs = await contrastInputsFor(page, "#post-text-non-overlap");
  assert.equal(nonOverlappingTerminalInputs.length, 1, "non-overlap fixture must retain one text record");
  assert.ok(
    nonOverlappingTerminalInputs[0].visibleChangedSampleCount > 0,
    "non-overlapping later paint must retain measured terminal glyph pixels"
  );
  assert.ok(
    !nonOverlappingTerminalInputs[0].unsupportedReasons.some((reason) =>
      reason.includes("non-text Canvas raster mutation")
    ),
    `non-overlapping later paint must retain executable text evidence: ${JSON.stringify(nonOverlappingTerminalInputs)}`
  );

  const overlappingTerminalInputs = await contrastInputsFor(page, "#post-text-overlap");
  assert.equal(overlappingTerminalInputs.length, 1, "overlap fixture must retain one text record");
  assert.ok(
    overlappingTerminalInputs[0].unsupportedReasons.some((reason) =>
      reason.includes("intersects the terminal glyph")
    ),
    `later paint covering a glyph must remain hard red with an intersection receipt: ${JSON.stringify(overlappingTerminalInputs)}`
  );

  const nonOverlappingPathInputs = await contrastInputsFor(page, "#post-text-path-non-overlap");
  assert.equal(nonOverlappingPathInputs.length, 1, "known path fixture must retain one text record");
  assert.ok(
    !nonOverlappingPathInputs[0].unsupportedReasons.some((reason) => reason.includes("Post-text")),
    `a conservatively bounded, disjoint current path must retain text evidence: ${JSON.stringify(nonOverlappingPathInputs)}`
  );

  const overlappingPathInputs = await contrastInputsFor(page, "#post-text-path-overlap");
  assert.ok(
    overlappingPathInputs[0].unsupportedReasons.some((reason) =>
      reason.includes("fill(current path)") && reason.includes("intersects the terminal glyph")
    ),
    `a current path covering a glyph must retain a hard-red intersection receipt: ${JSON.stringify(overlappingPathInputs)}`
  );

  const transformedNonOverlapInputs = await contrastInputsFor(page, "#post-text-transformed-non-overlap");
  assert.ok(
    !transformedNonOverlapInputs[0].unsupportedReasons.some((reason) => reason.includes("Post-text")),
    `a finite affine dirty region disjoint from the glyph must remain executable: ${JSON.stringify(transformedNonOverlapInputs)}`
  );

  for (const [selector, receipt] of [
    ["#post-text-unknown-path", "fill(Path2D)"],
    ["#post-text-unknown-transform", "non-finite transform"],
    ["#post-text-unknown-composite", "composite operation copy"],
    ["#post-text-unknown-image", "drawImage(...)"]
  ] as const) {
    const inputs = await contrastInputsFor(page, selector);
    assert.equal(inputs.length, 1, `${selector} must retain one text record`);
    assert.ok(
      inputs[0].unsupportedReasons.some((reason) =>
        reason.includes("Post-text") && reason.includes(receipt) && reason.includes("indeterminate")
      ),
      `${selector} must fail closed with an explicit dirty-region receipt: ${JSON.stringify(inputs)}`
    );
  }

  const partialClear = await audit(page, "#partial-clear");
  assert.ok(
    partialClear.findings.some((finding) =>
      finding.kind === "canvas-audit-unsupported-state" && finding.detail.includes("partial or clipped clearRect")
    ),
    "partial clears after recorded text must fail closed instead of accumulating stale records"
  );
  assert.equal(partialClear.textLayerCount, 0, "partial-clear loops must discard indeterminate stale text records");

  const recordLimit = await audit(page, "#record-limit");
  assert.ok(
    recordLimit.findings.some((finding) =>
      finding.kind === "canvas-audit-mask-too-large" && finding.detail.includes("text recorder exceeded")
    ),
    "per-Canvas text record limits must fail closed before replay"
  );

  const aggregateMaskLimit = await audit(page, "#aggregate-mask-limit");
  assert.ok(
    aggregateMaskLimit.findings.some((finding) =>
      finding.kind === "canvas-audit-mask-too-large" && finding.detail.includes("aggregate glyph pixels")
    ),
    "aggregate text-mask pixels must be capped per Canvas"
  );

  const semanticVisibility = await audit(page, "#semantic-visibility");
  assert.ok(
    kinds(semanticVisibility).includes("canvas-text-dom-text-overlap"),
    "visually painted inert/aria-hidden DOM text must remain in collision analysis"
  );

  const unsupportedTransform = await audit(page, "#unsupported-transform");
  assert.ok(
    unsupportedTransform.findings.some((finding) =>
      finding.kind === "canvas-audit-unsupported-state" && finding.detail.includes("non-axis-aligned CSS transform")
    ),
    "rotated/skewed Canvas viewport mappings must fail closed"
  );

  const drawImageText = await audit(page, "#draw-image-text");
  assert.ok(
    drawImageText.findings.some((finding) =>
      finding.kind === "canvas-audit-unsupported-state" && finding.detail.includes("drawImage(Canvas")
    ),
    "drawImage of a Canvas containing recorded text must fail closed when propagation is unsupported"
  );

  const unboundKind = await page.evaluate(() => {
    const auditWindow = window as Window & { __californiaCanvasTextAudit?: CaliforniaCanvasTextAuditPageApi };
    const canvas = document.querySelector("#unbound-canvas canvas") as HTMLCanvasElement | null;
    if (!auditWindow.__californiaCanvasTextAudit || !canvas) throw new Error("unbound Canvas fixture missing");
    return auditWindow.__californiaCanvasTextAudit.contextKindFor(canvas);
  });
  assert.equal(unboundKind, "unknown", "contextKindFor must not acquire a context from an unbound Canvas");
  const unboundContrastInputCount = await page.evaluate(() => {
    const auditWindow = window as Window & { __californiaCanvasTextAudit?: CaliforniaCanvasTextAuditPageApi };
    const root = document.querySelector("#unbound-canvas") as HTMLElement | null;
    if (!auditWindow.__californiaCanvasTextAudit || !root) throw new Error("unbound Canvas fixture missing");
    return auditWindow.__californiaCanvasTextAudit.contrastInputs(root).length;
  });
  assert.equal(
    unboundContrastInputCount,
    0,
    "contrastInputs must not acquire or synthesize a 2D context for an unbound/WebGL-capable Canvas"
  );
  const unboundCanvas = await audit(page, "#unbound-canvas");
  assert.deepEqual(kinds(unboundCanvas), ["canvas-audit-missing"], "unbound canvas must fail closed");
  assert.equal(
    await page.evaluate("window.__unboundCanvasGetContextCalls()"),
    0,
    "signature/analyze must not acquire a 2D context from an unbound canvas"
  );

  const domControl = await audit(page, "#dom-control");
  assert.ok(
    kinds(domControl).includes("canvas-text-dom-control-overlap"),
    "rect-clipped glyphs under DOM controls must fail"
  );

  const domText = await audit(page, "#dom-text");
  assert.ok(
    kinds(domText).includes("canvas-text-dom-text-overlap"),
    "Canvas glyphs under ordinary visible DOM text must fail"
  );

  const neverSettled = await audit(page, "#never-settled", 180);
  assert.deepEqual(kinds(neverSettled), ["canvas-audit-never-settled"], "continuous redraw must not be reported as stable");
  await page.evaluate("window.__stopCanvasCanary?.()");
});

test("California Canvas recorder keeps draw hooks bounded and preserves animation pixels", { timeout: 30_000 }, async (t) => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required for the Canvas performance canary: ${String(error)}`);
  }
  t.after(async () => browser?.close());

  const plain = await browser.newPage({ viewport: { height: 720, width: 1_000 } });
  const instrumented = await browser.newPage({ viewport: { height: 720, width: 1_000 } });
  await installCaliforniaCanvasTextAudit(instrumented);
  for (const page of [plain, instrumented]) {
    await page.goto("data:text/html,<meta charset=utf-8><canvas width=900 height=520></canvas>");
    await page.evaluate("globalThis.__name = globalThis.__name || function(value) { return value; };");
  }

  const benchmark = async (page: Page) => page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const drawing = canvas?.getContext("2d");
    if (!canvas || !drawing) throw new Error("benchmark Canvas missing");
    drawing.fillStyle = "#fff";
    drawing.fillRect(0, 0, canvas.width, canvas.height);
    drawing.fillStyle = "#111";
    drawing.font = "14px Arial";
    drawing.fillText("warm", 2, 14);
    const started = performance.now();
    for (let row = 0; row < 30; row += 1) {
      drawing.clearRect(0, 0, canvas.width, canvas.height);
      drawing.fillStyle = "#fff";
      drawing.fillRect(0, 0, canvas.width, canvas.height);
      drawing.fillStyle = "#111";
      for (let column = 0; column < 100; column += 1) {
        drawing.fillText(String((row * 100 + column) % 10), 2 + column * 8, 30 + (column % 20) * 18);
      }
    }
    return performance.now() - started;
  });

  const plainMs = await benchmark(plain);
  const instrumentedMs = await benchmark(instrumented);
  assert.ok(
    instrumentedMs <= plainMs * 40 + 150,
    `bounded pre-paint rectangles must avoid replaying glyph masks in the draw hook ` +
      `(plain=${plainMs.toFixed(1)}ms, instrumented=${instrumentedMs.toFixed(1)}ms)`
  );
  t.diagnostic(
    `Canvas 3,000-label draw-hook benchmark: plain=${plainMs.toFixed(1)}ms, ` +
      `instrumented=${instrumentedMs.toFixed(1)}ms, gate<=${(plainMs * 40 + 150).toFixed(1)}ms`
  );

  const animate = async (page: Page) => page.evaluate(async () => {
    const canvas = document.querySelector("canvas");
    const drawing = canvas?.getContext("2d");
    if (!canvas || !drawing) throw new Error("animation Canvas missing");
    await new Promise<void>((resolve) => {
      let frame = 0;
      const paint = () => {
        frame += 1;
        drawing.clearRect(0, 0, canvas.width, canvas.height);
        drawing.fillStyle = `rgb(${frame * 10},20,30)`;
        drawing.fillRect(0, 0, canvas.width, canvas.height);
        drawing.fillStyle = "#fff";
        drawing.font = "20px Arial";
        drawing.fillText(`frame ${frame}`, 20 + frame, 50);
        if (frame === 8) resolve();
        else requestAnimationFrame(paint);
      };
      requestAnimationFrame(paint);
    });
    return Array.from(drawing.getImageData(0, 0, 220, 90).data);
  });
  const [plainPixels, instrumentedPixels] = await Promise.all([animate(plain), animate(instrumented)]);
  assert.equal(instrumentedPixels.length, plainPixels.length);
  const rasterDelta = instrumentedPixels.reduce((summary, value, index) => {
    const delta = Math.abs(value - plainPixels[index]);
    return {
      changedChannels: summary.changedChannels + (delta > 0 ? 1 : 0),
      maximumChannelDelta: Math.max(summary.maximumChannelDelta, delta)
    };
  }, { changedChannels: 0, maximumChannelDelta: 0 });
  assert.ok(
    rasterDelta.maximumChannelDelta <= 1,
    `the recorder animation must remain raster-equivalent within one anti-aliasing channel level: ` +
      JSON.stringify(rasterDelta)
  );
  t.diagnostic(
    `Canvas animation equivalence: ${rasterDelta.changedChannels}/${plainPixels.length} channels differ, ` +
      `maximum delta=${rasterDelta.maximumChannelDelta}`
  );
});
