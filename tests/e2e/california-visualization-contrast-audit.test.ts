import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { chromium, type Browser, type Page } from "@playwright/test";
import {
  collectCaliforniaCanvasTextFindings,
  installCaliforniaCanvasTextAudit
} from "./california-canvas-text-audit";
import {
  CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
  CALIFORNIA_LARGE_TEXT_CONTRAST,
  CALIFORNIA_NON_TEXT_CONTRAST,
  CALIFORNIA_NORMAL_TEXT_CONTRAST,
  californiaContrastPasses,
  californiaContrastRatio,
  californiaTextContrastThreshold,
  collectCaliforniaVisualizationContrastFindings,
  compositeCaliforniaRgba,
  summarizeCaliforniaHardenedTextContrastScan,
  type CaliforniaContrastAuditResult
} from "./california-visualization-contrast-audit";

const context = {
  benchId: "contrast-canary",
  state: "default",
  viewport: "desktop" as const
};

async function audit(page: Page, selector: string): Promise<CaliforniaContrastAuditResult> {
  const root = page.locator(selector);
  await root.scrollIntoViewIfNeeded();
  return collectCaliforniaVisualizationContrastFindings(root, context, {
    settledProof: { domSvg: "settled", evidence: "Static synthetic fixture loaded and scrolled into view" }
  });
}

function findingsOf(result: CaliforniaContrastAuditResult, kind: string) {
  return result.findings.filter((finding) => finding.kind === kind);
}

test("California hardened text scanner source bytes equal the frozen Package E identity", () => {
  const scannerPath = path.join(process.cwd(), "tests/e2e/hk-visualization-text-contrast-scanner.ts");
  const actualSha256 = createHash("sha256").update(readFileSync(scannerPath)).digest("hex");
  assert.equal(
    actualSha256,
    CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
    "durable evidence must not advertise the frozen algorithm SHA for different scanner bytes"
  );
});

test("California contrast arithmetic uses WCAG luminance, exact boundaries, and alpha compositing", () => {
  assert.equal(californiaContrastPasses(4.49, 4.5), false, "4.49 must fail the 4.5 text threshold");
  assert.equal(californiaContrastPasses(4.5, 4.5), true, "4.50 must pass the 4.5 text threshold");
  assert.equal(californiaContrastPasses(2.9999, 3), false, "non-text contrast below 3.0 must fail");
  assert.equal(californiaContrastPasses(3, 3), true, "non-text contrast at 3.0 must pass");
  assert.equal(californiaTextContrastThreshold(17, 900), CALIFORNIA_NORMAL_TEXT_CONTRAST);
  assert.equal(californiaTextContrastThreshold(18.66, 700), CALIFORNIA_LARGE_TEXT_CONTRAST);
  assert.equal(californiaTextContrastThreshold(24, 400), CALIFORNIA_LARGE_TEXT_CONTRAST);

  const white = { alpha: 1, blue: 255, green: 255, red: 255 };
  const halfBlack = { alpha: 0.5, blue: 0, green: 0, red: 0 };
  const composited = compositeCaliforniaRgba(halfBlack, white);
  assert.ok(Math.abs(composited.red - 127.5) < 1e-9);
  assert.ok(Math.abs(composited.green - 127.5) < 1e-9);
  assert.ok(Math.abs(composited.blue - 127.5) < 1e-9);
  assert.ok(
    Math.abs(californiaContrastRatio(composited, white) - 3.976653024912438) < 1e-10,
    "alpha contrast must be measured after source-over compositing"
  );
});

test("California hardened contrast findings bind duplicate targets to the worst normalized evidence", () => {
  const target = 'span "Repeated learner value"';
  const largeTextFailure = {
    background: "rgb(255, 255, 255)",
    backgroundLuminance: 1,
    contrastRatio: 2.95,
    effectiveOpacity: 1,
    foreground: "rgb(150, 150, 150)",
    requiredRatio: 3,
    target
  };
  const normalTextFailure = {
    background: "rgb(255, 255, 255)",
    backgroundLuminance: 1,
    contrastRatio: 3.69,
    effectiveOpacity: 1,
    foreground: "rgb(118, 118, 118)",
    requiredRatio: 4.5,
    target
  };
  const laterPassingDuplicate = {
    background: "rgb(255, 255, 255)",
    backgroundLuminance: 1,
    contrastRatio: 14.42,
    effectiveOpacity: 1,
    foreground: "rgb(40, 40, 40)",
    requiredRatio: 4.5,
    target
  };

  const summary = summarizeCaliforniaHardenedTextContrastScan({
    checkedTextCount: 3,
    evidence: [largeTextFailure, normalTextFailure, laterPassingDuplicate],
    issues: [{
      code: "insufficient-contrast",
      message: `${target}: contrast 3.69:1 is below 4.5:1.`,
      target
    }],
    worst: normalTextFailure
  }, context);

  assert.equal(summary.findings.length, 1);
  assert.deepEqual(
    {
      kind: summary.findings[0]?.kind,
      label: summary.findings[0]?.label,
      ratio: summary.findings[0]?.ratio,
      severity: summary.findings[0]?.severity,
      threshold: summary.findings[0]?.threshold
    },
    {
      kind: "contrast-below-threshold",
      label: target,
      ratio: 3.69,
      severity: "hard",
      threshold: 4.5
    },
    "the last passing duplicate must not replace the worst relative contrast failure"
  );
});

test("California Visualization contrast audit synthetic browser canaries", { timeout: 30_000 }, async (t) => {
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim() || "chrome",
      headless: true
    });
  } catch (error) {
    assert.fail(`A local Chromium/Chrome browser is required for the contrast canary: ${String(error)}`);
  }
  t.after(async () => browser?.close());

  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { height: 900, width: 1_100 } });
  await installCaliforniaCanvasTextAudit(page);
  await page.goto("data:text/html,<meta charset=utf-8><title>contrast-audit-canary</title>");
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; background: #fff; font-family: Arial, sans-serif; }
          body { padding: 12px; }
          section { display: block; width: 420px; min-height: 60px; margin: 8px; padding: 12px; }
          svg, canvas { display: block; width: 320px; height: 90px; }
        </style>
      </head>
      <body>
        <section id="html-boundary" style="background:#fff;font-size:16px;font-weight:400">
          <span style="color:#777">HTML 4.48 fails</span>
          <span style="color:#767676">HTML 4.54 passes</span>
        </section>
        <section id="alpha" style="background:#fff;font-size:16px">
          <span style="color:rgba(0,0,0,.5)">Alpha text</span>
        </section>
        <section id="textarea-value" style="background:#fff">
          <textarea style="color:#777;background:#fff;font:16px Arial">Textarea value fails</textarea>
        </section>
        <section id="placeholder-paint" style="background:#fff">
          <style>#placeholder-paint input::placeholder{color:#777;opacity:1}</style>
          <input value="" placeholder="Placeholder fails" style="color:#000;background:#fff;font:16px Arial">
        </section>
        <section id="ancestor" style="background:#000;font-size:16px">
          <div><span style="color:#fff">Inherited ancestor background</span></div>
        </section>
        <section id="svg-fill" style="background:#fff">
          <svg viewBox="0 0 320 90" style="background:#fff">
            <text x="12" y="42" fill="#777" font-size="16">SVG fill fails</text>
          </svg>
        </section>
        <section id="svg-stroke" style="background:#000">
          <svg viewBox="0 0 320 90" style="background:#000">
            <text x="12" y="42" fill="#fff" font-size="24">SVG solid fill passes</text>
          </svg>
        </section>
        <section id="essential-mark" style="background:#fff">
          <svg viewBox="0 0 320 90" style="background:#fff">
            <line data-viz-essential data-viz-name="low contrast axis" x1="20" x2="300" y1="45" y2="45"
              stroke="#aaa" stroke-width="6" stroke-linecap="round" />
          </svg>
        </section>
        <section id="gradient-background" style="background-image:linear-gradient(90deg,#fff,#000)">
          <span style="color:#111">Unsupported gradient background</span>
        </section>
        <section id="svg-gradient-paint" style="background:#fff">
          <svg viewBox="0 0 320 90" style="background:#fff">
            <defs><linearGradient id="paint"><stop stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>
            <text x="12" y="42" fill="url(#paint)" font-size="16">Unsupported SVG paint server</text>
          </svg>
        </section>
        <section id="dom-scaled" style="background:#fff;transform:scale(.5);transform-origin:top left;font-size:24px">
          <span style="color:#777">DOM rendered twelve pixels</span>
        </section>
        <section id="dom-zoom-transform" style="background:#fff;zoom:.5;transform:scale(.5);transform-origin:top left;font-size:30px">
          <span style="color:#777">DOM zoom transform rendered small</span>
        </section>
        <section id="svg-scaled" style="background:#fff">
          <svg viewBox="0 0 320 90" style="width:160px;height:45px;background:#fff">
            <text x="12" y="42" fill="#777" font-size="24">SVG viewBox rendered twelve pixels</text>
          </svg>
        </section>
        <section id="svg-sibling-backdrop" style="background:#fff">
          <svg viewBox="0 0 320 90" style="background:#fff">
            <rect x="0" y="0" width="320" height="90" fill="#000"/>
            <text x="12" y="42" fill="#fff" font-size="16">Sibling backdrop</text>
          </svg>
        </section>
        <section id="svg-later-occluder" style="background:#fff">
          <svg viewBox="0 0 320 90" style="background:#fff">
            <text x="12" y="42" fill="#000" font-size="16">Covered SVG text</text>
            <rect x="0" y="0" width="320" height="90" fill="#fff"/>
          </svg>
        </section>
        <section id="svg-fill-stroke" style="background:#fff">
          <svg viewBox="0 0 320 90" style="background:#fff">
            <text x="12" y="42" fill="#fff" stroke="#000" stroke-width="4" font-size="24">Stroke destination</text>
          </svg>
        </section>
        <section id="html-essential-text" style="background:#fff">
          <div data-viz-essential data-viz-name="essential legend" style="background:#aaa;color:#000;padding:8px">Essential legend text</div>
        </section>
        <section id="html-essential-border" style="background:#fff">
          <div data-viz-essential data-viz-name="border-only mark" style="width:100px;height:30px;border:3px solid #aaa"></div>
        </section>
        <section id="webkit-fill" style="background:#fff;font-size:16px">
          <span style="color:#000;-webkit-text-fill-color:#777">WebKit fill controls paint</span>
        </section>
        <section id="webkit-transparent" style="background:#fff;font-size:16px">
          <span style="color:#000;-webkit-text-fill-color:transparent">Transparent WebKit fill</span>
        </section>
        <section id="webkit-gradient" style="background:#fff;font-size:16px">
          <span style="color:#000;background:linear-gradient(90deg,#000,#fff);background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent">Gradient WebKit fill</span>
        </section>
        <section id="pseudo-paint" style="background:#fff;font-size:16px;position:relative">
          <style>#pseudo-paint::before{content:'generated';position:absolute;inset:0;background:#fff;color:#000}</style>
          <span style="color:#000">Pseudo covered text</span>
        </section>
        <section id="pseudo-after-paint" style="background:#fff;font-size:16px;position:relative">
          <style>#pseudo-after-paint::after{content:'';position:absolute;inset:0;background:#fff}</style>
          <span style="color:#000">Pseudo after paint</span>
        </section>
        <section id="pseudo-none" style="background:#fff;font-size:16px;position:relative">
          <style>#pseudo-none::before{content:none;position:absolute;inset:0;background:#000;box-shadow:inset 0 0 0 40px #000}</style>
          <span style="color:#000">Non-generated pseudo declarations do not paint</span>
        </section>
        <section id="inset-shadow" style="background:#fff;box-shadow:inset 0 0 0 30px #fff;font-size:16px">
          <span style="color:#000">Inset shadow destination</span>
        </section>
        <section id="outer-shadow" style="background:#fff;box-shadow:0 18px 24px rgba(0,0,0,.8);font-size:16px">
          <span style="color:#000">Outer shadow does not paint the interior</span>
        </section>
        <section id="css-mask" style="background:#fff;mask-image:linear-gradient(#000,#fff);font-size:16px">
          <span style="color:#000">Masked text</span>
        </section>
        <section id="css-filter" style="background:#fff;filter:blur(.2px);font-size:16px">
          <span style="color:#000">Filtered text</span>
        </section>
        <section id="css-blend" style="background:#fff;mix-blend-mode:multiply;font-size:16px">
          <span style="color:#000">Blended text</span>
        </section>
        <section id="css-clip" style="background:#fff;clip-path:inset(0);font-size:16px">
          <span style="color:#000">Clipped text</span>
        </section>
        <section id="css-text-stroke" style="background:#fff;font-size:16px">
          <span style="color:#000;-webkit-text-stroke:1px #fff">Stroked HTML text</span>
        </section>
        <section id="canvas-painted"><canvas width="320" height="90"></canvas></section>
        <section id="canvas-gradient"><canvas width="320" height="90"></canvas></section>
        <section id="canvas-scaled"><canvas width="320" height="90" style="width:160px;height:45px"></canvas></section>
        <section id="canvas-draw-transform"><canvas width="320" height="90"></canvas></section>
        <section id="canvas-covered"><canvas width="320" height="90"></canvas></section>
        <section id="canvas-essential"><canvas data-viz-essential width="320" height="90"></canvas></section>
        <section id="canvas-no-provider"><canvas width="320" height="90"></canvas></section>
        <section id="canvas-webgl"><canvas width="320" height="90"></canvas></section>
      </body>
    </html>
  `);

  await page.evaluate(() => {
    const painted = document.querySelector<HTMLCanvasElement>("#canvas-painted canvas");
    const paintedContext = painted?.getContext("2d");
    if (!painted || !paintedContext) throw new Error("painted Canvas fixture missing");
    paintedContext.fillStyle = "#000";
    paintedContext.fillRect(0, 0, painted.width, painted.height);
    paintedContext.fillStyle = "#fff";
    paintedContext.font = "16px Arial";
    paintedContext.fillText("Canvas painted background", 12, 42);

    const gradientCanvas = document.querySelector<HTMLCanvasElement>("#canvas-gradient canvas");
    const gradientContext = gradientCanvas?.getContext("2d");
    if (!gradientCanvas || !gradientContext) throw new Error("gradient Canvas fixture missing");
    gradientContext.fillStyle = "#fff";
    gradientContext.fillRect(0, 0, gradientCanvas.width, gradientCanvas.height);
    const gradient = gradientContext.createLinearGradient(0, 0, 200, 0);
    gradient.addColorStop(0, "#000");
    gradient.addColorStop(1, "#fff");
    gradientContext.fillStyle = gradient;
    gradientContext.font = "16px Arial";
    gradientContext.fillText("Unsupported Canvas paint server", 12, 42);

    const scaledCanvas = document.querySelector<HTMLCanvasElement>("#canvas-scaled canvas");
    const scaledContext = scaledCanvas?.getContext("2d");
    if (!scaledCanvas || !scaledContext) throw new Error("scaled Canvas fixture missing");
    scaledContext.fillStyle = "#fff";
    scaledContext.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
    scaledContext.fillStyle = "#777";
    scaledContext.font = "24px Arial";
    scaledContext.fillText("Canvas CSS/backing scale", 12, 42);

    const transformedCanvas = document.querySelector<HTMLCanvasElement>("#canvas-draw-transform canvas");
    const transformedContext = transformedCanvas?.getContext("2d");
    if (!transformedCanvas || !transformedContext) throw new Error("transformed Canvas fixture missing");
    transformedContext.fillStyle = "#fff";
    transformedContext.fillRect(0, 0, transformedCanvas.width, transformedCanvas.height);
    transformedContext.scale(.5, .5);
    transformedContext.fillStyle = "#777";
    transformedContext.font = "24px Arial";
    transformedContext.fillText("Canvas draw scale", 12, 42);

    const coveredCanvas = document.querySelector<HTMLCanvasElement>("#canvas-covered canvas");
    const coveredContext = coveredCanvas?.getContext("2d");
    if (!coveredCanvas || !coveredContext) throw new Error("covered Canvas fixture missing");
    coveredContext.fillStyle = "#000";
    coveredContext.fillRect(0, 0, coveredCanvas.width, coveredCanvas.height);
    coveredContext.fillStyle = "#fff";
    coveredContext.font = "16px Arial";
    coveredContext.fillText("Terminally hidden Canvas text", 12, 42);
    coveredContext.fillStyle = "#000";
    coveredContext.fillRect(0, 0, coveredCanvas.width, coveredCanvas.height);

    const essentialCanvas = document.querySelector<HTMLCanvasElement>("#canvas-essential canvas");
    const essentialContext = essentialCanvas?.getContext("2d");
    if (!essentialCanvas || !essentialContext) throw new Error("essential Canvas fixture missing");
    essentialContext.fillStyle = "#fff";
    essentialContext.fillRect(0, 0, essentialCanvas.width, essentialCanvas.height);
    essentialContext.strokeStyle = "#aaa";
    essentialContext.beginPath();
    essentialContext.moveTo(10, 45);
    essentialContext.lineTo(310, 45);
    essentialContext.stroke();

    const noProviderCanvas = document.querySelector<HTMLCanvasElement>("#canvas-no-provider canvas");
    const noProviderContext = noProviderCanvas?.getContext("2d");
    if (!noProviderCanvas || !noProviderContext) throw new Error("no-provider Canvas fixture missing");
    noProviderContext.fillStyle = "#aaa";
    noProviderContext.fillRect(0, 0, noProviderCanvas.width, noProviderCanvas.height);

    document.querySelector<HTMLCanvasElement>("#canvas-webgl canvas")?.getContext("webgl");
  });

  const htmlBoundary = await audit(page, "#html-boundary");
  assert.equal(htmlBoundary.candidateLabelCount, 2);
  assert.equal(htmlBoundary.auditedLabelCount, 2);
  assert.ok(findingsOf(htmlBoundary, "contrast-below-threshold").length >= 1);
  assert.equal(htmlBoundary.hardenedText.completed, true);
  assert.equal(htmlBoundary.hardenedText.candidateTextCount, 2);
  assert.equal(htmlBoundary.hardenedText.auditedTextCount, 2);
  assert.ok(htmlBoundary.hardenedText.findingCount >= 1);
  assert.match(htmlBoundary.hardenedText.evidenceSha256, /^[a-f0-9]{64}$/);
  assert.equal(htmlBoundary.worstLabel, "HTML 4.48 fails");
  assert.equal(htmlBoundary.worstKind, "html-text");
  assert.ok(htmlBoundary.minRatio !== null && htmlBoundary.minRatio < 4.5);

  const alpha = await audit(page, "#alpha");
  assert.equal(alpha.auditedLabelCount, 1);
  assert.ok(alpha.minRatio !== null && Math.abs(alpha.minRatio - 3.976653024912438) < 1e-9);
  assert.ok(findingsOf(alpha, "contrast-below-threshold").length >= 1);

  const textareaValue = await audit(page, "#textarea-value");
  assert.equal(textareaValue.auditedLabelCount, 1, "textarea values are painted controls, not DOM text nodes");
  assert.ok(
    textareaValue.findings.some((finding) => finding.kind === "contrast-below-threshold"),
    "low-contrast textarea value text must not disappear from the audit"
  );

  const placeholderPaint = await audit(page, "#placeholder-paint");
  assert.equal(placeholderPaint.auditedLabelCount, 1);
  assert.ok(
    placeholderPaint.findings.some((finding) => finding.kind === "contrast-below-threshold"),
    "placeholder pseudo-element paint must override the input's ordinary value color"
  );

  const ancestor = await audit(page, "#ancestor");
  assert.equal(ancestor.findings.length, 0, "transparent descendants must inherit the solid ancestor background");
  assert.equal(ancestor.auditedLabelCount, 1);
  assert.equal(ancestor.minRatio, 21);

  const svgFill = await audit(page, "#svg-fill");
  assert.ok(
    svgFill.findings.some((finding) =>
      finding.kind === "contrast-below-threshold" && finding.evidenceKind === "svg-text-fill"
    ),
    "SVG fill must be numerically audited"
  );

  const svgStroke = await audit(page, "#svg-stroke");
  assert.equal(
    svgStroke.findings.length,
    0,
    `solid SVG text fill must remain auditable: ${JSON.stringify(svgStroke.findings)}`
  );
  assert.equal(svgStroke.worstKind, "svg-text-fill");
  assert.equal(svgStroke.minRatio, 21);

  const essentialMark = await audit(page, "#essential-mark");
  assert.ok(
    essentialMark.findings.some((finding) =>
      finding.kind === "contrast-below-threshold" &&
      finding.evidenceKind === "svg-essential-stroke" &&
      finding.threshold === CALIFORNIA_NON_TEXT_CONTRAST
    ),
    `essential non-text axes/marks must use the 3.0 threshold: ${JSON.stringify(essentialMark)}`
  );

  const gradientBackground = await audit(page, "#gradient-background");
  assert.ok(
    gradientBackground.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.detail.includes("background image/gradient")
    ),
    "an unresolved gradient background must hard fail"
  );

  const svgGradientPaint = await audit(page, "#svg-gradient-paint");
  assert.ok(
    svgGradientPaint.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.detail.includes("paint server")
    ),
    "an SVG gradient/pattern paint server must hard fail"
  );

  const missingSettledProof = await collectCaliforniaVisualizationContrastFindings(
    page.locator("#html-boundary"),
    context
  );
  assert.ok(
    missingSettledProof.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.label === "DOM/SVG settled proof"
    ),
    "the public audit API must fail closed without caller-owned DOM/SVG settled proof"
  );

  for (const [selector, label] of [
    ["#dom-scaled", "ancestor CSS transform"],
    ["#dom-zoom-transform", "combined CSS zoom and transform"],
    ["#svg-scaled", "SVG viewBox/CTM"],
    ["#canvas-scaled", "Canvas CSS/backing scale"],
    ["#canvas-draw-transform", "Canvas draw transform"]
  ] as const) {
    const result = await audit(page, selector);
    assert.ok(
      result.findings.some((finding) =>
        finding.kind === "contrast-below-threshold" && finding.threshold === CALIFORNIA_NORMAL_TEXT_CONTRAST
      ),
      `${label} must classify text from final rendered size, not authoring-space font size: ${JSON.stringify(result)}`
    );
    assert.ok(
      result.evidence.some((item) =>
        item.effectiveFontSizePx !== null && item.effectiveFontSizePx < 18.66
      ),
      `${label} must retain final effective font size evidence`
    );
  }

  const siblingBackdrop = await audit(page, "#svg-sibling-backdrop");
  assert.ok(
    siblingBackdrop.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.detail.includes("non-ancestor painted backdrop")
    ),
    "an SVG label over a sibling backdrop must not be flattened as an ancestor CSS background"
  );

  const laterOccluder = await audit(page, "#svg-later-occluder");
  assert.ok(
    laterOccluder.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.detail.includes("final painted occluder")
    ),
    "a later SVG paint that covers text must hard fail terminal visibility"
  );

  const svgFillStroke = await audit(page, "#svg-fill-stroke");
  assert.ok(
    svgFillStroke.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.detail.includes("terminal destination paint")
    ),
    "SVG stroke must use its own terminal destination; fill/stroke overlap cannot reuse the outer backdrop"
  );

  const htmlEssentialText = await audit(page, "#html-essential-text");
  assert.ok(
    htmlEssentialText.evidence.some((item) => item.kind === "html-essential-fill"),
    "essential geometry must remain audited when the marked element also contains text"
  );
  assert.ok(
    htmlEssentialText.findings.some((finding) =>
      finding.kind === "contrast-below-threshold" && finding.evidenceKind === "html-essential-fill"
    ),
    "low-contrast essential geometry with text must fail the non-text threshold"
  );

  const htmlEssentialBorder = await audit(page, "#html-essential-border");
  assert.ok(
    htmlEssentialBorder.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.detail.includes("border/outline geometry")
    ),
    "border/outline-only essential marks require executable edge evidence"
  );

  const webkitFill = await audit(page, "#webkit-fill");
  assert.ok(
    webkitFill.findings.some((finding) => finding.kind === "contrast-below-threshold"),
    "-webkit-text-fill-color must override CSS color in the effective foreground calculation"
  );
  for (const [selector, phrase] of [
    ["#webkit-transparent", "-webkit-text-fill-color is transparent"],
    ["#webkit-gradient", "background-clip:text"],
    ["#pseudo-paint", "generated content"],
    ["#pseudo-after-paint", "generated content"],
    ["#inset-shadow", "inset box-shadow"],
    ["#css-mask", "mask image"],
    ["#css-filter", "uses filter"],
    ["#css-blend", "mix-blend-mode"],
    ["#css-clip", "uses clip-path"],
    ["#css-text-stroke", "-webkit-text-stroke-width"]
  ] as const) {
    const result = await audit(page, selector);
    assert.ok(
      result.findings.some((finding) =>
        finding.kind === "contrast-unsupported" && finding.detail.includes(phrase)
      ),
      `${selector} must hard fail unresolved CSS terminal paint: ${JSON.stringify(result)}`
    );
  }

  const outerShadow = await audit(page, "#outer-shadow");
  assert.deepEqual(
    outerShadow.findings,
    [],
    "an ordinary outer box-shadow must not invalidate interior text when it supplies or occludes no sampled pixel"
  );

  const pseudoNone = await audit(page, "#pseudo-none");
  assert.deepEqual(
    pseudoNone.findings,
    [],
    "content:none must not turn dormant pseudo declarations into generated paint"
  );

  const coveredCanvas = await audit(page, "#canvas-covered");
  assert.ok(
    coveredCanvas.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.evidenceKind === "canvas-text-fill" &&
      finding.detail.includes("dirty region intersects the terminal glyph mask") &&
      finding.detail.includes("fully hidden or indistinguishable")
    ),
    `Canvas text covered by a later raster paint must fail closed on terminal visibility: ${JSON.stringify(coveredCanvas)}`
  );
  assert.ok(
    coveredCanvas.evidence.some((item) =>
      item.kind === "canvas-text-fill" && item.ratio === null &&
      item.reasons.some((reason) => reason.includes("dirty region intersects the terminal glyph mask")) &&
      item.reasons.some((reason) => reason.includes("fully hidden or indistinguishable"))
    ),
    "a fully overwritten Canvas glyph may remain as recorder evidence, but it must have no passing ratio"
  );

  const essentialCanvas = await audit(page, "#canvas-essential");
  assert.ok(
    essentialCanvas.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.detail.includes("actual-paint/destination non-text")
    ),
    "essential 2D Canvas geometry must have executable actual-paint/destination evidence"
  );
  assert.ok(
    essentialCanvas.evidence.some((item) =>
      item.kind === "canvas-surface" && item.contextKind === "canvas-2d" &&
      item.essential === true && item.hasExecutableContrastProvider === false
    ),
    "the visible 2D Canvas modality outcome must be retained as evidence"
  );

  const noProviderCanvas = await audit(page, "#canvas-no-provider");
  assert.ok(
    noProviderCanvas.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.detail.includes("neither recorded text")
    ),
    "a visible 2D Canvas without any executable contrast provider must fail closed"
  );

  const webglCanvas = await audit(page, "#canvas-webgl");
  assert.ok(
    webglCanvas.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.detail.includes("WebGL visualization")
    ),
    "every visible WebGL Canvas must use an explicit provider or hard-fail as unsupported"
  );
  assert.ok(
    webglCanvas.evidence.some((item) =>
      item.kind === "canvas-surface" && ["canvas-webgl", "canvas-webgl2"].includes(item.contextKind) &&
      item.hasExecutableContrastProvider === false
    ),
    "the visible WebGL modality outcome must be retained as evidence"
  );

  const canvasPainted = await audit(page, "#canvas-painted");
  assert.deepEqual(
    canvasPainted.findings.filter((finding) => finding.evidenceKind.startsWith("canvas")),
    [],
    "Canvas text must use its real painted pre-text destination"
  );
  assert.equal(canvasPainted.auditedLabelCount, 1);
  assert.equal(canvasPainted.worstKind, "canvas-text-fill");
  assert.equal(canvasPainted.minRatio, 21);
  const paintedEvidence = canvasPainted.evidence.find((item) => item.kind === "canvas-text-fill");
  assert.ok(paintedEvidence, "Canvas contrast must expose concrete evidence");
  assert.deepEqual(
    {
      background: paintedEvidence.background,
      contextKind: paintedEvidence.contextKind,
      effectiveFontSizePx: paintedEvidence.effectiveFontSizePx,
      foreground: paintedEvidence.foreground,
      hasCoordinates: paintedEvidence.sampleX !== null && paintedEvidence.sampleY !== null,
      hasSamples: paintedEvidence.sampleCount > 0
    },
    {
      background: { alpha: 1, blue: 0, green: 0, red: 0 },
      contextKind: "canvas-2d",
      effectiveFontSizePx: 16,
      foreground: { alpha: 1, blue: 255, green: 255, red: 255 },
      hasCoordinates: true,
      hasSamples: true
    },
    "evidence must retain foreground/background, coordinates, effective size, modality, and sample count"
  );
  const collisionEvidence = await collectCaliforniaCanvasTextFindings(
    page.locator("#canvas-painted"),
    context,
    { pollMs: 20, quietMs: 60, timeoutMs: 1_000 }
  );
  assert.equal(collisionEvidence.textLayerCount, 1, "contrast capture must preserve the collision recorder layer");
  assert.deepEqual(collisionEvidence.findings, [], "contrast capture must not alter collision findings");

  const canvasGradient = await audit(page, "#canvas-gradient");
  assert.ok(
    canvasGradient.findings.some((finding) =>
      finding.kind === "contrast-unsupported" && finding.detail.includes("paint server")
    ),
    "a Canvas gradient/pattern paint server must hard fail"
  );
});
