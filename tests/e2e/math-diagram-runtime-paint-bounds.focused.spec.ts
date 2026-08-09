import { expect, test } from "@playwright/test";
import {
  auditMathDiagramPage,
  waitForDiagramLayoutStable
} from "./mathDiagramBoundaryAudit";

test.describe("focused mathematical surface discovery and SVG paint bounds", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Chrome is the reference paint-bounds engine");
  });

  test("audit and layout stability discover the same explicit, labelled SVG, and alt-image surfaces", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 500 });
    await page.setContent(`
      <main>
        <div data-diagram-surface="explicit-wrapper">
          <svg viewBox="0 0 100 40" width="100" height="40">
            <line x1="5" y1="20" x2="95" y2="20" stroke="black" />
          </svg>
        </div>
        <div>
          <svg aria-label="Nested labelled mathematical SVG" viewBox="0 0 100 40" width="100" height="40">
            <circle cx="50" cy="20" r="10" />
          </svg>
        </div>
        <img alt="A mathematical diagram image" width="20" height="20"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' fill='black'/%3E%3C/svg%3E" />
        <button type="button">
          <svg aria-label="button icon" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /></svg>
          <img alt="button image icon" width="20" height="20"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3C/svg%3E" />
        </button>
        <div aria-hidden="true">
          <svg aria-label="hidden icon" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /></svg>
          <img alt="hidden image icon" width="20" height="20"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3C/svg%3E" />
        </div>
      </main>
    `);

    const stability = await waitForDiagramLayoutStable(page, {
      minimumCandidateSurfaceCount: 4,
      stableSampleCount: 2,
      timeoutMs: 5_000
    });
    const audit = await auditMathDiagramPage(page);

    expect(audit.coverage.candidateDiagramSvgCount).toBe(2);
    expect(audit.coverage.candidateImageCount).toBe(1);
    expect(audit.coverage.candidateResponsiveDiagramContainerCount).toBe(1);
    expect(stability.candidateSurfaceCount).toBe(4);
  });

  test("an end marker that paints past the viewport fails while the same marker safely inset passes", async ({ page }) => {
    const render = async (endX: number) => {
      await page.setContent(`
        <main>
          <svg data-diagram-surface="marker-${endX}" aria-label="marker bounds" viewBox="0 0 100 40" width="300" height="120">
            <defs>
              <marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20"
                refX="5" refY="5" viewBox="0 0 10 10" orient="auto" overflow="visible">
                <path d="M 0 0 L 10 5 L 0 10 Z" fill="black" />
              </marker>
            </defs>
            <line id="subject" x1="10" y1="20" x2="${endX}" y2="20" stroke="black" stroke-width="1"
              marker-end="url(#arrow)" />
          </svg>
        </main>
      `);
      const browserEvidence = await page.locator("#subject").evaluate((element: SVGGraphicsElement) => {
        const bbox = element.getBBox();
        const bboxWithOptions = (element.getBBox as unknown as (options: {
          fill: boolean; stroke: boolean; markers: boolean; clipped: boolean;
        }) => SVGRect)({ fill: true, stroke: true, markers: true, clipped: false });
        const client = element.getBoundingClientRect();
        return {
          bbox: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
          bboxWithOptions: {
            x: bboxWithOptions.x,
            y: bboxWithOptions.y,
            width: bboxWithOptions.width,
            height: bboxWithOptions.height
          },
          client: { x: client.x, y: client.y, width: client.width, height: client.height }
        };
      });
      return { audit: await auditMathDiagramPage(page), browserEvidence };
    };

    const unsafe = await render(95);
    expect(
      unsafe.audit.issues,
      `Chrome marker bounds evidence: ${JSON.stringify(unsafe.browserEvidence)}`
    ).toContainEqual(expect.objectContaining({
      kind: "svg-content-outside-viewport",
      element: expect.stringContaining("line")
    }));

    const safe = await render(70);
    expect(
      safe.audit.issues,
      `Chrome marker bounds evidence: ${JSON.stringify(safe.browserEvidence)}`
    ).not.toContainEqual(expect.objectContaining({
      kind: expect.stringMatching(/^svg-(?:content-outside-viewport|audit-incomplete)$/u)
    }));
  });

  test("a Gaussian blur paint region crossing the viewport fails while the inset blur passes", async ({ page }) => {
    const render = async (centerX: number) => {
      await page.setContent(`
        <main>
          <svg data-diagram-surface="blur-${centerX}" aria-label="filter bounds" viewBox="0 0 100 40" width="300" height="120">
            <defs>
              <filter id="blur" filterUnits="objectBoundingBox" x="-300%" y="-100%" width="700%" height="300%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            <g id="subject" filter="url(#blur)">
              <circle cx="${centerX}" cy="20" r="3" fill="black" />
            </g>
          </svg>
        </main>
      `);
      return auditMathDiagramPage(page);
    };

    const unsafe = await render(94);
    expect(unsafe.issues).toContainEqual(expect.objectContaining({
      kind: expect.stringMatching(/^svg-(?:content-outside-viewport|audit-incomplete)$/u),
      element: expect.stringContaining("g")
    }));

    const safe = await render(50);
    expect(safe.issues).not.toContainEqual(expect.objectContaining({
      kind: expect.stringMatching(/^svg-(?:content-outside-viewport|audit-incomplete)$/u)
    }));
  });

  test("an SVG mask that cannot be reduced to reliable paint bounds fails closed", async ({ page }) => {
    await page.setContent(`
      <main>
        <svg data-diagram-surface="masked" aria-label="masked diagram" viewBox="0 0 100 40" width="300" height="120">
          <defs>
            <mask id="fade"><rect width="100" height="40" fill="white" /></mask>
          </defs>
          <rect x="20" y="10" width="60" height="20" fill="black" mask="url(#fade)" />
        </svg>
      </main>
    `);

    const audit = await auditMathDiagramPage(page);
    expect(audit.coverage.incompleteSvgPaintEffectCount).toBe(1);
    expect(audit.issues).toContainEqual(expect.objectContaining({
      kind: "svg-audit-incomplete",
      detail: expect.stringContaining("mask")
    }));
  });

  test("a bounded local scroller keeps a wide SVG reachable while hidden clipping still fails", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 300 });
    const render = async (scrollable: boolean) => {
      await page.setContent(`
        <main style="width:240px">
          <section class="glass-panel" style="width:240px;overflow:hidden">
            <div
              ${scrollable ? "data-viz-responsive-diagram-container role=region tabindex=0 aria-label='Scrollable graph'" : ""}
              style="width:220px;${scrollable ? "overflow-x:auto" : "overflow:hidden"}"
            >
              <svg data-viz-surface aria-label="Wide graph" viewBox="0 0 640 360" width="640" height="360">
                <line x1="20" y1="180" x2="620" y2="180" stroke="black" />
              </svg>
            </div>
          </section>
        </main>
      `);
      return auditMathDiagramPage(page);
    };

    const reachable = await render(true);
    expect(reachable.issues).not.toContainEqual(expect.objectContaining({
      kind: "masked-container-overflow"
    }));
    expect(reachable.issues).not.toContainEqual(expect.objectContaining({
      kind: "unreachable-scroll-content"
    }));

    const clipped = await render(false);
    expect(clipped.issues).toContainEqual(expect.objectContaining({
      kind: "masked-container-overflow"
    }));
  });
});
