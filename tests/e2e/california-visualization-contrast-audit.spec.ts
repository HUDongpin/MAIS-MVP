import { expect, test } from "@playwright/test";
import { collectCaliforniaVisualizationContrastFindings } from "./california-visualization-contrast-audit";

test.describe("California Visualization contrast audit microfixtures", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Contrast paint microfixtures run once in Chromium.");
  });

  test("audits below-fold text without treating an unavailable viewport hit stack as occlusion", async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html>
        <body style="margin:0;background:#fff">
          <main id="workspace" style="background:#fff;color:#000">
            <div style="height:1400px" aria-hidden="true"></div>
            <footer style="background:#fff;color:#000">Below-fold learner footer</footer>
          </main>
        </body>
      </html>`);

    const result = await collectCaliforniaVisualizationContrastFindings(
      page.locator("#workspace"),
      { benchId: "microfixture", state: "below-fold", viewport: "desktop" },
      {
        auditCanvases: false,
        essentialMarkSelector: "[data-no-essential-mark]",
        settledProof: { domSvg: "settled", evidence: "static microfixture" }
      }
    );

    const footerEvidence = result.evidence.find((item) => item.label === "Below-fold learner footer");
    expect(footerEvidence).toBeDefined();
    expect(footerEvidence?.ratio).toBeCloseTo(21, 2);
    expect(footerEvidence?.reasons).not.toContain(
      "footer is absent from the hit-test stack at all visible paint samples"
    );
    expect(result.findings.filter((item) => item.label === "Below-fold learner footer")).toEqual([]);
  });

  test("audits pointer-transparent overlay text through a temporary paint-neutral hit target", async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            .pointer-hint {
              position: absolute;
              left: 20px;
              top: 20px;
              background: #fff;
              color: #000;
              pointer-events: none;
            }
          </style>
        </head>
        <body style="margin:0;background:#fff">
          <main id="workspace" style="position:relative;width:400px;height:200px;background:#fff;color:#000">
            <span class="pointer-hint">
              Pointer-transparent learner hint
            </span>
          </main>
        </body>
      </html>`);

    const hint = page.locator("span");
    const authoredStyle = await hint.getAttribute("style");
    const result = await collectCaliforniaVisualizationContrastFindings(
      page.locator("#workspace"),
      { benchId: "microfixture", state: "pointer-transparent", viewport: "desktop" },
      {
        auditCanvases: false,
        essentialMarkSelector: "[data-no-essential-mark]",
        settledProof: { domSvg: "settled", evidence: "static microfixture" }
      }
    );

    const hintEvidence = result.evidence.find((item) => item.label === "Pointer-transparent learner hint");
    expect(hintEvidence).toBeDefined();
    expect(hintEvidence?.ratio).toBeCloseTo(21, 2);
    expect(hintEvidence?.reasons).not.toContain(
      "span is absent from the hit-test stack at all visible paint samples"
    );
    expect(result.findings.filter((item) => item.label === "Pointer-transparent learner hint")).toEqual([]);
    await expect(hint).toHaveCSS("pointer-events", "none");
    expect(await hint.getAttribute("style")).toBe(authoredStyle);
  });

  test("still rejects a painted occluder above pointer-transparent overlay text", async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html>
        <body style="margin:0;background:#fff">
          <main id="workspace" style="position:relative;width:400px;height:200px;background:#fff;color:#000">
            <span style="position:absolute;left:20px;top:20px;background:#fff;color:#000;pointer-events:none">
              Covered learner hint
            </span>
            <div aria-hidden="true" style="position:absolute;z-index:2;left:20px;top:20px;width:170px;height:24px;background:#c81e4f"></div>
          </main>
        </body>
      </html>`);

    const hint = page.locator("span");
    const authoredStyle = await hint.getAttribute("style");
    const result = await collectCaliforniaVisualizationContrastFindings(
      page.locator("#workspace"),
      { benchId: "microfixture", state: "pointer-transparent-covered", viewport: "desktop" },
      {
        auditCanvases: false,
        essentialMarkSelector: "[data-no-essential-mark]",
        settledProof: { domSvg: "settled", evidence: "static microfixture" }
      }
    );

    const hintFinding = result.findings.find((item) => item.label === "Covered learner hint");
    expect(hintFinding).toBeDefined();
    expect(hintFinding?.detail).toContain("div is a final painted occluder above span");
    await expect(hint).toHaveCSS("pointer-events", "none");
    expect(await hint.getAttribute("style")).toBe(authoredStyle);
  });

  test("does not call a broad transparent link an occluder when its text is outside the sample", async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html>
        <body style="margin:0;background:#fff">
          <main id="workspace" style="position:relative;width:420px;height:160px;background:#fff;color:#000">
            <h1 style="position:absolute;z-index:1;left:20px;top:20px;width:300px;margin:0;font:24px/30px monospace">
              Learner title
            </h1>
            <a href="#far-edge" style="position:absolute;z-index:2;left:20px;top:20px;width:360px;height:30px;
              display:flex;justify-content:flex-end;align-items:center;background:transparent;color:#000;
              font:16px/20px monospace;text-decoration:none">
              Far edge link
            </a>
          </main>
        </body>
      </html>`);

    const result = await collectCaliforniaVisualizationContrastFindings(
      page.locator("#workspace"),
      { benchId: "microfixture", state: "transparent-link-away-from-sample", viewport: "desktop" },
      {
        auditCanvases: false,
        essentialMarkSelector: "[data-no-essential-mark]",
        settledProof: { domSvg: "settled", evidence: "static microfixture" }
      }
    );

    const titleEvidence = result.evidence.find((item) => item.label === "Learner title");
    expect(titleEvidence).toBeDefined();
    expect(titleEvidence?.reasons).not.toContain("a is a final painted occluder above h1");
    expect(result.findings.filter((item) => item.label === "Learner title")).toEqual([]);
  });

  test("still rejects transparent-link text that actually covers the sampled title text", async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html>
        <body style="margin:0;background:#fff">
          <main id="workspace" style="position:relative;width:420px;height:160px;background:#fff;color:#000">
            <h1 style="position:absolute;z-index:1;left:20px;top:20px;width:300px;margin:0;font:24px/30px monospace">
              Covered title
            </h1>
            <a href="#cover" style="position:absolute;z-index:2;left:20px;top:20px;width:300px;height:30px;
              background:transparent;color:#000;font:24px/30px monospace;text-decoration:none">
              Covering link
            </a>
          </main>
        </body>
      </html>`);

    const result = await collectCaliforniaVisualizationContrastFindings(
      page.locator("#workspace"),
      { benchId: "microfixture", state: "transparent-link-on-sample", viewport: "desktop" },
      {
        auditCanvases: false,
        essentialMarkSelector: "[data-no-essential-mark]",
        settledProof: { domSvg: "settled", evidence: "static microfixture" }
      }
    );

    const titleFinding = result.findings.find((item) => item.label === "Covered title");
    expect(titleFinding).toBeDefined();
    expect(titleFinding?.detail).toContain("a is a final painted occluder above h1");
  });

  test("accepts an opaque own backdrop above a painted non-ancestor sibling", async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html>
        <body style="margin:0;background:#fff">
          <main id="workspace" style="position:relative;width:400px;height:200px;background:#fff;color:#000">
            <canvas aria-hidden="true" width="400" height="200"
              style="position:absolute;inset:0;width:400px;height:200px"></canvas>
            <span style="position:absolute;left:20px;top:20px;background:#fff;color:#000;pointer-events:none">
              Opaque learner hint
            </span>
          </main>
        </body>
      </html>`);

    const result = await collectCaliforniaVisualizationContrastFindings(
      page.locator("#workspace"),
      { benchId: "microfixture", state: "opaque-own-backdrop", viewport: "desktop" },
      {
        auditCanvases: false,
        essentialMarkSelector: "[data-no-essential-mark]",
        settledProof: { domSvg: "settled", evidence: "static microfixture" }
      }
    );

    const hintEvidence = result.evidence.find((item) => item.label === "Opaque learner hint");
    expect(hintEvidence).toBeDefined();
    expect(hintEvidence?.ratio).toBeCloseTo(21, 2);
    expect(hintEvidence?.reasons).not.toContain(
      "canvas is a non-ancestor painted backdrop beneath span"
    );
    expect(result.findings.filter((item) => item.label === "Opaque learner hint")).toEqual([]);
  });

  test("still rejects lower painted siblings beneath a translucent own backdrop", async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html>
        <body style="margin:0;background:#fff">
          <main id="workspace" style="position:relative;width:400px;height:200px;background:#fff;color:#000">
            <canvas aria-hidden="true" width="400" height="200"
              style="position:absolute;inset:0;width:400px;height:200px"></canvas>
            <span style="position:absolute;left:20px;top:20px;background:rgba(255,255,255,.8);color:#000;pointer-events:none">
              Translucent learner hint
            </span>
          </main>
        </body>
      </html>`);

    const result = await collectCaliforniaVisualizationContrastFindings(
      page.locator("#workspace"),
      { benchId: "microfixture", state: "translucent-own-backdrop", viewport: "desktop" },
      {
        auditCanvases: false,
        essentialMarkSelector: "[data-no-essential-mark]",
        settledProof: { domSvg: "settled", evidence: "static microfixture" }
      }
    );

    const hintFinding = result.findings.find((item) => item.label === "Translucent learner hint");
    expect(hintFinding).toBeDefined();
    expect(hintFinding?.detail).toContain(
      "canvas is a non-ancestor painted backdrop beneath span"
    );
  });
});
