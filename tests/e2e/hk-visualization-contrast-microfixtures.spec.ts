import { expect, test, type Page } from "@playwright/test";
import {
  scanHkVisualizationTextContrast,
  type HkVisualizationContrastScanResult
} from "./hk-visualization-text-contrast-scanner";

const authoringSelector = "[data-viz-manim-authoring-dock]";

async function scanFixture(page: Page, body: string) {
  await page.setContent(`<!doctype html>
    <html>
      <body style="margin:0;background:#fff">
        <main id="workspace">${body}</main>
      </body>
    </html>`);
  return await page.locator("#workspace").evaluate(
    scanHkVisualizationTextContrast,
    { authoringSelector }
  );
}

function issueCodes(scan: HkVisualizationContrastScanResult) {
  return scan.issues.map((issue) => issue.code);
}

test.describe("HK Visualization contrast scanner hard negatives", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Contrast paint microfixtures run once in Chromium.");
  });

  test("fails closed for ancestor opacity instead of independently alpha-blending group text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="background:#000;padding:8px">
        <div style="opacity:.5;background:#606060;color:#fff">Opacity false pass</div>
      </div>`);

    expect(issueCodes(scan)).toContain("unsupported-opacity-stacking-context");
  });

  test("fails closed for CSS background images and positioned overlapping backgrounds", async ({ page }) => {
    const gradient = await scanFixture(page, `
      <div style="background-image:linear-gradient(#000,#000);color:#000">Gradient false pass</div>`);
    expect(issueCodes(gradient)).toContain("unsupported-background-image");

    const positioned = await scanFixture(page, `
      <div style="position:relative;width:240px;height:36px;background:#fff;color:#000">
        <div style="position:absolute;inset:0;background:#000"></div>
        <span style="position:relative">Positioned false pass</span>
      </div>`);
    expect(issueCodes(positioned)).toContain("ambiguous-positioned-overlap");
  });

  test("normalizes modern CSS colors before calculating contrast", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="--learner-text:oklch(100% 0 0);background:#fff;color:var(--learner-text)">
        White oklch text on white
      </div>`);

    expect(issueCodes(scan)).toContain("insufficient-contrast");
    expect(scan.evidence[0]?.contrastRatio).toBeCloseTo(1, 2);
  });

  test("checks the actual tspan paint instead of inheriting the parent text paint", async ({ page }) => {
    const scan = await scanFixture(page, `
      <svg width="300" height="80" viewBox="0 0 300 80">
        <rect width="300" height="80" fill="#fff" />
        <text x="10" y="45" fill="#000"><tspan fill="#fff">White tspan on white</tspan></text>
      </svg>`);

    expect(issueCodes(scan)).toContain("insufficient-contrast");
    expect(scan.evidence.some((item) => item.target.includes("tspan"))).toBe(true);
  });

  test("never treats SVG paint servers or stroke-only backgrounds as transparent", async ({ page }) => {
    const gradient = await scanFixture(page, `
      <svg width="300" height="80" viewBox="0 0 300 80">
        <defs><linearGradient id="g"><stop stop-color="#000" /></linearGradient></defs>
        <rect width="300" height="80" fill="url(#g)" />
        <text x="10" y="45" fill="#000">Black on gradient</text>
      </svg>`);
    expect(issueCodes(gradient)).toContain("unsupported-svg-paint-server");

    const stroke = await scanFixture(page, `
      <svg width="300" height="80" viewBox="0 0 300 80">
        <rect width="300" height="80" fill="#fff" />
        <line x1="0" x2="300" y1="40" y2="40" stroke="#000" stroke-width="46" />
        <text x="10" y="45" fill="#000">Black on thick line</text>
      </svg>`);
    expect(issueCodes(stroke)).toContain("unsupported-svg-stroke-background");
  });

  test("fails closed for filter mask and mix-blend compositing", async ({ page }) => {
    for (const [style, expectedCode] of [
      ["filter:opacity(.05)", "unsupported-filter"],
      ["mask-image:linear-gradient(#000,#000)", "unsupported-mask"],
      ["mix-blend-mode:difference", "unsupported-mix-blend-mode"]
    ] as const) {
      const scan = await scanFixture(page, `<div style="background:#fff;color:#000;${style}">Ambiguous paint</div>`);
      expect(issueCodes(scan), style).toContain(expectedCode);
    }
  });

  test("uses the small-text threshold when an SVG transform shrinks large declared text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <svg width="300" height="90" viewBox="0 0 300 90">
        <rect width="300" height="90" fill="#fff" />
        <text x="10" y="70" fill="#888" font-size="24" transform="scale(.5)">Scaled small text</text>
      </svg>`);

    expect(issueCodes(scan)).toContain("insufficient-contrast");
    expect(scan.evidence[0]?.requiredRatio).toBe(4.5);
  });

  test("rejects a label whose glyph region crosses different SVG backgrounds", async ({ page }) => {
    const scan = await scanFixture(page, `
      <svg width="320" height="80" viewBox="0 0 320 80">
        <rect width="160" height="80" fill="#000" />
        <rect x="160" width="160" height="80" fill="#fff" />
        <text x="115" y="45" fill="#000" font-size="20">MIXED BACKGROUND</text>
      </svg>`);

    expect(issueCodes(scan)).toContain("ambiguous-mixed-svg-background");
  });

  test("detects positioned paint even when pointer hit-testing is disabled", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="position:relative;width:260px;height:40px;background:#fff;color:#000">
        <div style="position:absolute;inset:0;background:#000;pointer-events:none"></div>
        <span style="position:relative">Pointer-transparent black overlay</span>
      </div>`);

    expect(issueCodes(scan)).toContain("ambiguous-positioned-overlap");
  });

  test("scans direct SVG text nodes alongside their child tspans", async ({ page }) => {
    const scan = await scanFixture(page, `
      <svg width="320" height="100" viewBox="0 0 320 100">
        <rect width="320" height="100" fill="#fff" />
        <text x="10" y="35" fill="#fff">BAD DIRECT<tspan x="10" y="75" fill="#000">GOOD TSPAN</tspan></text>
      </svg>`);

    expect(issueCodes(scan)).toContain("insufficient-contrast");
    expect(scan.evidence.some((item) => item.target.includes("BAD DIRECT"))).toBe(true);
  });

  test("uses the small-text threshold when an ancestor SVG group shrinks text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <svg width="320" height="100" viewBox="0 0 320 100">
        <rect width="320" height="100" fill="#fff" />
        <g transform="scale(.5)"><text x="10" y="70" fill="#888" font-size="24">Ancestor scaled</text></g>
      </svg>`);

    expect(issueCodes(scan)).toContain("insufficient-contrast");
    expect(scan.evidence[0]?.requiredRatio).toBe(4.5);
  });

  test("fails closed when a narrow SVG painter intersects between sample points", async ({ page }) => {
    const scan = await scanFixture(page, `
      <svg width="360" height="90" viewBox="0 0 360 90">
        <rect width="360" height="90" fill="#fff" />
        <rect x="83" y="18" width="3" height="52" fill="#000" pointer-events="none" />
        <text x="10" y="55" fill="#000" font-size="22">LONG LABEL ACROSS STRIPE</text>
      </svg>`);

    expect(issueCodes(scan)).toContain("ambiguous-svg-paint-coverage");
  });

  test("fails closed when a later SVG painter occludes text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <svg width="320" height="90" viewBox="0 0 320 90">
        <rect width="320" height="90" fill="#fff" />
        <text x="10" y="55" fill="#000" font-size="22">Covered label</text>
        <rect x="0" y="20" width="220" height="50" fill="#000" />
      </svg>`);

    expect(issueCodes(scan)).toContain("ambiguous-svg-occlusion");
  });

  test("still scans low-contrast visually rendered aria-hidden and inert text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="background:#fff;color:#fff" aria-hidden="true">Aria hidden but visible</div>
      <div style="background:#fff;color:#fff" inert>Inert but visible</div>`);

    expect(issueCodes(scan).filter((code) => code === "insufficient-contrast")).toHaveLength(2);
  });

  test("keeps simple solid-color RGB and fill-opacity cases executable", async ({ page }) => {
    const solid = await scanFixture(page, `<div style="background:#fff;color:#000">Solid passing text</div>`);
    expect(solid.issues).toEqual([]);
    expect(solid.evidence[0]?.contrastRatio).toBeCloseTo(21, 2);

    const translucentSvgText = await scanFixture(page, `
      <svg width="300" height="80" viewBox="0 0 300 80">
        <rect width="300" height="80" fill="#fff" />
        <text x="10" y="45" fill="#000" fill-opacity=".2">Low opacity fill</text>
      </svg>`);
    expect(issueCodes(translucentSvgText)).toContain("insufficient-contrast");
  });

  test("uses the rendered webkit text fill instead of falsely certifying the color property", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="background:#fff;color:#000;-webkit-text-fill-color:#fff">White rendered fill on white</div>`);

    expect(issueCodes(scan)).toContain("insufficient-contrast");
    expect(scan.evidence[0]?.contrastRatio).toBeCloseTo(1, 2);
  });

  test("fails closed for pseudo-element paint beneath ordinary text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <style>
        #pseudo-bg { position:relative;background:#fff;color:#000;isolation:isolate; }
        #pseudo-bg::before { content:"";position:absolute;inset:0;background:#000;z-index:-1; }
      </style>
      <div id="pseudo-bg">Black text on a generated black layer</div>`);

    expect(issueCodes(scan)).toContain("unsupported-pseudo-element-paint");
  });

  test("fails closed when a CSS transform moves text outside its declared ancestor background", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="width:140px;height:34px;background:#fff;color:#000">
        <span style="display:inline-block;transform:translateX(180px);white-space:nowrap">Moved onto the black page</span>
      </div>
      <style>body { background:#000 !important; }</style>`);

    expect(issueCodes(scan)).toContain("unsupported-transform-background");
  });

  test("uses effective screen size when an SVG viewBox scales declared large text down", async ({ page }) => {
    const scan = await scanFixture(page, `
      <svg width="160" height="50" viewBox="0 0 320 100">
        <rect width="320" height="100" fill="#fff" />
        <text x="10" y="55" fill="#777" font-size="24">Actually twelve pixels</text>
      </svg>`);

    expect(issueCodes(scan)).toContain("insufficient-contrast");
    expect(scan.evidence[0]?.requiredRatio).toBe(4.5);
  });

  test("does not treat the fill of a thick stroked SVG shape as the background under text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <svg width="320" height="90" viewBox="0 0 320 90">
        <rect x="0" y="0" width="320" height="90" fill="#fff" stroke="#000" stroke-width="44" />
        <text x="8" y="22" fill="#000" font-size="20">Black on black border</text>
      </svg>`);

    expect(issueCodes(scan)).toContain("unsupported-svg-stroke-background");
  });

  test("fails closed for an inset box shadow painted beneath text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="background:#fff;color:#000;box-shadow:inset 0 0 0 100px #000;padding:8px">Black on inset black</div>`);

    expect(issueCodes(scan)).toContain("unsupported-inset-box-shadow");
  });

  test("fails closed instead of omitting generated pseudo-element text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <style>#generated::after { content:"Generated white on white";color:#fff;background:#fff; }</style>
      <div id="generated" style="background:#fff;color:#000">Ordinary black base</div>`);

    expect(issueCodes(scan)).toContain("unsupported-generated-content");
  });

  test("uses the small-text threshold when CSS zoom shrinks declared large text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="background:#fff;color:#777;font-size:24px;zoom:.5">Zoomed to twelve pixels</div>`);

    expect(issueCodes(scan)).toContain("insufficient-contrast");
    expect(scan.evidence[0]?.requiredRatio).toBe(4.5);
  });

  test("fails closed for individual CSS translate that moves text outside its ancestor backdrop", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="width:120px;height:36px;background:#fff;color:#000">
        <span style="display:inline-block;translate:180px 0;white-space:nowrap">Translated onto the black page</span>
      </div>
      <style>body { background:#000 !important; }</style>`);

    expect(issueCodes(scan)).toContain("unsupported-transform-background");
  });

  test("fails closed for relative positioning that moves text outside its ancestor backdrop", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="width:120px;height:36px;background:#fff;color:#000">
        <span style="position:relative;left:180px;white-space:nowrap">Relatively positioned on black</span>
      </div>
      <style>body { background:#000 !important; }</style>`);

    expect(issueCodes(scan)).toContain("unsupported-transform-background");
  });

  test("fails closed for backdrop filters that change the sampled background", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="background:#fff;color:#000;backdrop-filter:invert(1)">Backdrop-filter paint</div>`);

    expect(issueCodes(scan)).toContain("unsupported-backdrop-filter");
  });

  test("does not reject a transformed text owner whose own opaque solid background moves with it", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="display:inline-block;transform:translateX(10px);background:#fff;color:#000;padding:8px">
        Safe black text and its own white backdrop
      </div>`);

    expect(scan.issues).toEqual([]);
    expect(scan.evidence[0]?.contrastRatio).toBeCloseTo(21, 2);
  });

  test("fails closed for backdrop-filter paint on an otherwise empty pseudo-element", async ({ page }) => {
    const scan = await scanFixture(page, `
      <style>
        #pseudo-filter::before {
          content:"";
          position:absolute;
          inset:0;
          backdrop-filter:invert(1);
        }
      </style>
      <div id="pseudo-filter" style="position:relative;background:#fff;color:#000;padding:8px">
        Black text over a pseudo-element filtered backdrop
      </div>`);

    expect(issueCodes(scan)).toContain("unsupported-backdrop-filter");
  });

  test("fails closed when margin layout moves text outside its nearest painted backdrop", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="width:120px;height:36px;background:#fff;color:#000">
        <span style="display:inline-block;margin-left:180px;white-space:nowrap">Margin-positioned on black</span>
      </div>
      <style>body { background:#000 !important; }</style>`);

    expect(issueCodes(scan)).toContain("unsupported-transform-background");
  });

  test("fails closed when first-line paint overrides the candidate text color", async ({ page }) => {
    const scan = await scanFixture(page, `
      <style>#first-line::first-line { color:#fff; }</style>
      <p id="first-line" style="width:220px;background:#fff;color:#000">White first-line text on white, followed by enough text to wrap.</p>`);

    expect(issueCodes(scan)).toContain("unsupported-pseudo-element-paint");
  });

  test("fails closed for overlapping static grid paint beneath learner text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <div style="display:grid;width:240px">
        <div style="grid-area:1/1;background:#000;min-height:44px"></div>
        <div style="grid-area:1/1;z-index:1;color:#000;padding:10px">Black text over black grid paint</div>
      </div>`);

    expect(issueCodes(scan)).toContain("ambiguous-positioned-overlap");
  });

  test("fails closed for rendered SVG use clones that contain otherwise unscanned text", async ({ page }) => {
    const scan = await scanFixture(page, `
      <svg width="320" height="80" viewBox="0 0 320 80">
        <defs><text id="cloned-label" x="16" y="42" fill="#fff" font-size="18">Cloned white text</text></defs>
        <rect width="320" height="80" fill="#fff" />
        <use href="#cloned-label" />
      </svg>
      <div style="background:#fff;color:#000">Passing HTML base</div>`);

    expect(issueCodes(scan)).toContain("unsupported-svg-use-text");
  });
});
