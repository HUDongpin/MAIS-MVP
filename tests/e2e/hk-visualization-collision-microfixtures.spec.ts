import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  hkVisualizationSurfaceEvidenceIssues,
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
  scanHkVisualizationLayout,
} from "./hk-visualization-machine-acceptance-helpers";

test.describe("HK visualization collision and layout microfixtures", () => {
  test.beforeEach(async ({ page }) => {
    await installHkVisualizationEffectiveVisibilityInspector(page);
    await page.goto("data:text/html,<html><body></body></html>");
  });

  test("returns exact zero coverage without inventing a scanner issue", async ({
    page,
  }) => {
    const root = await mount(page, "");

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(snapshot.learnerControlCount).toBe(0);
    expect(snapshot.htmlTextFragmentCount).toBe(0);
    expect(snapshot.svgTextFragmentCount).toBe(0);
    expect(snapshot.paintedMarkCount).toBe(0);
    expect(snapshot.inspectedCandidateCount).toBe(0);
    expect(snapshot.candidatePairCounts).toEqual({
      "control-control": 0,
      "dom-text-text": 0,
      "svg-label-label": 0,
      "svg-label-mark": 0,
      "text-control": 0,
      "text-occlusion": 0,
    });
    expect(snapshot.totalCandidatePairCount).toBe(0);
    expect(snapshot.issues).toEqual([]);
    expect(snapshot.overlapExemptions).toEqual([]);
    expect(snapshot.truncated).toBe(false);
    expectExactCoverageAccounting(snapshot);
  });

  test("counts an eligible non-colliding control pair independently of issues", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="display:flex;gap:24px">
        <button aria-label="First control" style="width:80px;height:44px"></button>
        <button aria-label="Second control" style="width:80px;height:44px"></button>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(snapshot.learnerControlCount).toBe(2);
    expect(snapshot.inspectedCandidateCount).toBe(2);
    expect(snapshot.candidatePairCounts["control-control"]).toBe(1);
    expect(snapshot.totalCandidatePairCount).toBe(1);
    expect(snapshot.issues).toEqual([]);
    expect(snapshot.truncated).toBe(false);
    expectExactCoverageAccounting(snapshot);
  });

  test("keeps eligible pair accounting beyond the bounded issue evidence", async ({
    page,
  }) => {
    const controls = Array.from(
      { length: 16 },
      (_, index) =>
        `<button aria-label="Control ${index}" style="position:absolute;left:20px;top:20px;width:120px;height:44px"></button>`,
    ).join("");
    const root = await mount(
      page,
      controls,
      "position:relative;width:180px;height:100px",
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(snapshot.learnerControlCount).toBe(16);
    expect(snapshot.inspectedCandidateCount).toBe(16);
    expect(snapshot.candidatePairCounts["control-control"]).toBe(120);
    expect(snapshot.totalCandidatePairCount).toBe(120);
    expect(snapshot.issues).toHaveLength(100);
    expect(
      snapshot.issues.every((issue) => issue.kind === "control-control"),
    ).toBe(true);
    expect(snapshot.truncated).toBe(true);
    expectExactCoverageAccounting(snapshot);
  });

  test("rejects HTML text that overlaps SVG text across rendering layers", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div data-viz-surface style="position:relative;width:240px;height:100px">
        <svg width="240" height="100" style="position:absolute;inset:0">
          <text x="24" y="42" font-size="20">SVG label</text>
        </svg>
        <span style="position:absolute;left:24px;top:22px;font-size:20px;line-height:24px">HTML label</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "dom-text-text"),
    ).toBe(true);
    expect(snapshot.htmlTextFragmentCount).toBe(1);
    expect(snapshot.svgTextFragmentCount).toBe(1);
    expect(snapshot.candidatePairCounts["dom-text-text"]).toBeGreaterThan(0);
    expectExactCoverageAccounting(snapshot);
  });

  test("rejects an SVG label crossing a thick horizontal line mark", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <svg data-viz-surface width="240" height="100">
        <line data-viz-mark x1="10" x2="230" y1="50" y2="50" stroke="black" stroke-width="20" />
        <text x="34" y="55" font-size="20">Axis label</text>
      </svg>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "svg-label-mark"),
    ).toBe(true);
    expect(snapshot.svgTextFragmentCount).toBe(1);
    expect(snapshot.paintedMarkCount).toBe(1);
    expect(snapshot.candidatePairCounts["svg-label-mark"]).toBeGreaterThan(0);
    expectExactCoverageAccounting(snapshot);

    await page.setContent(`
      <!doctype html>
      <html>
        <body style="margin:0">
          <svg id="root-svg-surface" data-viz-surface width="240" height="100">
            <line data-viz-mark x1="10" x2="230" y1="50" y2="50" stroke="black" stroke-width="20" />
            <text x="34" y="55" font-size="20">Root SVG label</text>
          </svg>
        </body>
      </html>
    `);
    const rootSurface = page.locator("#root-svg-surface");
    await expect(rootSurface).toBeVisible();
    const rootSnapshot = await scanHkVisualizationCollisions(rootSurface);
    expect(rootSnapshot.svgSurfaceCount).toBe(1);
    expect(rootSnapshot.paintedMarkCount).toBe(1);
    expect(rootSnapshot.svgTextFragmentCount).toBe(1);
    expect(
      rootSnapshot.issues.some(
        (issue) => issue.kind === "svg-label-mark",
      ),
    ).toBe(true);
    expectExactCoverageAccounting(rootSnapshot);
  });

  test("distinguishes painted line and polyline strokes from empty bounding-box regions", async ({
    page,
  }) => {
    const fixtures = [
      {
        collides: false,
        markup: `
          <line data-viz-mark x1="20" y1="20" x2="210" y2="180" stroke="black" stroke-width="8" />
          <text x="28" y="172" font-size="22">Line gap</text>
        `,
        name: "diagonal-line-empty-corner",
      },
      {
        collides: true,
        markup: `
          <line data-viz-mark x1="20" y1="20" x2="210" y2="180" stroke="black" stroke-width="8" />
          <text x="100" y="106" font-size="22">Line hit</text>
        `,
        name: "diagonal-line-stroke-hit",
      },
      {
        collides: false,
        markup: `
          <polyline data-viz-mark points="20,180 115,20 210,180" fill="none" stroke="black" stroke-width="8" />
          <text x="88" y="172" font-size="22">Gap</text>
        `,
        name: "polyline-empty-bottom-middle",
      },
      {
        collides: true,
        markup: `
          <polyline data-viz-mark points="20,180 115,20 210,180" fill="none" stroke="black" stroke-width="8" />
          <text x="45" y="145" font-size="22">Polyline hit</text>
        `,
        name: "polyline-stroke-hit",
      },
      {
        collides: false,
        markup: `
          <g transform="rotate(-20 20 120)">
            <line data-viz-mark x1="76" y1="90" x2="94" y2="126" stroke="black" stroke-width="8" />
            <text x="20 160" y="120" font-size="28">AB</text>
          </g>
        `,
        name: "rotated-wide-text-character-gap",
      },
      {
        collides: true,
        markup: `
          <g transform="rotate(-20 20 120)">
            <line data-viz-mark x1="22" y1="90" x2="34" y2="126" stroke="black" stroke-width="8" />
            <text x="20 160" y="120" font-size="28">AB</text>
          </g>
        `,
        name: "rotated-wide-text-character-hit",
      },
    ];

    for (const fixture of fixtures) {
      const root = await mount(
        page,
        `<svg data-viz-surface width="240" height="200">${fixture.markup}</svg>`,
        "width:240px;min-height:200px",
      );
      const snapshot = await scanHkVisualizationCollisions(root, fixture.name);
      const markIssues = snapshot.issues.filter(
        (issue) => issue.kind === "svg-label-mark",
      );
      expect(snapshot.svgSurfaceCount, fixture.name).toBe(1);
      expect(snapshot.svgTextFragmentCount, fixture.name).toBe(1);
      expect(snapshot.paintedMarkCount, fixture.name).toBe(1);
      expect(
        snapshot.candidatePairCounts["svg-label-mark"],
        fixture.name,
      ).toBe(1);
      expect(markIssues, fixture.name).toHaveLength(fixture.collides ? 1 : 0);
      expectExactCoverageAccounting(snapshot);
    }
  });

  test("distinguishes rect strokes and circle fills from their empty bounding-box regions", async ({
    page,
  }) => {
    const fixtures = [
      {
        collides: false,
        markup: `
          <rect data-viz-mark x="20" y="20" width="190" height="150" fill="none" stroke="black" stroke-width="8" />
          <text x="72" y="105" font-size="22">Rect interior</text>
        `,
        name: "fill-none-rect-interior",
      },
      {
        collides: true,
        markup: `
          <rect data-viz-mark x="20" y="20" width="190" height="150" fill="none" stroke="black" stroke-width="8" />
          <text x="14" y="70" font-size="22">Rect edge</text>
        `,
        name: "rect-stroke-hit",
      },
      {
        collides: false,
        markup: `
          <circle data-viz-mark cx="120" cy="100" r="80" fill="royalblue" />
          <text x="26" y="30" font-size="22">Gap</text>
        `,
        name: "circle-bounding-corner",
      },
      {
        collides: true,
        markup: `
          <circle data-viz-mark cx="120" cy="100" r="80" fill="royalblue" />
          <text x="92" y="106" font-size="22">Circle fill</text>
        `,
        name: "circle-fill-hit",
      },
    ];

    for (const fixture of fixtures) {
      const root = await mount(
        page,
        `<svg data-viz-surface width="240" height="200">${fixture.markup}</svg>`,
        "width:240px;min-height:200px",
      );
      const snapshot = await scanHkVisualizationCollisions(root, fixture.name);
      const markIssues = snapshot.issues.filter(
        (issue) => issue.kind === "svg-label-mark",
      );
      expect(snapshot.candidatePairCounts["svg-label-mark"], fixture.name).toBe(
        1,
      );
      expect(markIssues, fixture.name).toHaveLength(fixture.collides ? 1 : 0);
      expectExactCoverageAccounting(snapshot);
    }
  });

  test("uses transformed multi-segment path paint instead of its screen bounding box", async ({
    page,
  }) => {
    const fixtures = [
      {
        collides: false,
        label: `<text x="122" y="88" font-size="22">Path gap</text>`,
        name: "scaled-path-empty-middle",
      },
      {
        collides: true,
        label: `<text x="46" y="38" font-size="22">Path hit</text>`,
        name: "scaled-path-stroke-hit",
      },
    ];

    for (const fixture of fixtures) {
      const root = await mount(
        page,
        `
        <svg data-viz-surface width="320" height="180">
          <path
            data-viz-mark
            d="M10 20 L70 20 L70 70 M150 100 L210 100 L210 150"
            transform="translate(30 10) scale(1.2 .8)"
            fill="none"
            stroke="black"
            stroke-width="8"
          />
          ${fixture.label}
        </svg>
      `,
        "width:320px;min-height:180px",
      );
      const snapshot = await scanHkVisualizationCollisions(root, fixture.name);
      const markIssues = snapshot.issues.filter(
        (issue) => issue.kind === "svg-label-mark",
      );
      expect(snapshot.candidatePairCounts["svg-label-mark"], fixture.name).toBe(
        1,
      );
      expect(markIssues, fixture.name).toHaveLength(fixture.collides ? 1 : 0);
      expectExactCoverageAccounting(snapshot);
    }
  });

  test("keeps geometry checks compatible with clipping, root-self surfaces, and unsupported marks", async ({
    page,
  }) => {
    const clippedRoot = await mount(
      page,
      `
      <div style="position:relative;width:120px;height:100px;overflow:hidden">
        <svg data-viz-surface width="300" height="100">
          <line data-viz-mark x1="10" y1="50" x2="285" y2="50" stroke="black" stroke-width="8" />
        </svg>
      </div>
      <span style="position:absolute;left:190px;top:36px;font-size:22px;line-height:28px">Clipped line label</span>
    `,
      "position:relative;width:360px;min-height:120px",
    );
    const clippedSnapshot = await scanHkVisualizationCollisions(
      clippedRoot,
      "clipped-line",
    );
    expect(clippedSnapshot.candidatePairCounts["svg-label-mark"]).toBe(1);
    expect(
      clippedSnapshot.issues.filter(
        (issue) => issue.kind === "svg-label-mark",
      ),
    ).toEqual([]);
    expectExactCoverageAccounting(clippedSnapshot);

    await page.setContent(`
      <!doctype html>
      <html>
        <body style="margin:0">
          <svg id="root-geometry-surface" data-viz-surface width="240" height="200">
            <line data-viz-mark x1="20" y1="20" x2="210" y2="180" stroke="black" stroke-width="8" />
            <text x="28" y="172" font-size="22">Root line gap</text>
          </svg>
        </body>
      </html>
    `);
    const rootSurface = page.locator("#root-geometry-surface");
    const rootSnapshot = await scanHkVisualizationCollisions(
      rootSurface,
      "root-self-line-gap",
    );
    expect(rootSnapshot.svgSurfaceCount).toBe(1);
    expect(rootSnapshot.paintedMarkCount).toBe(1);
    expect(rootSnapshot.candidatePairCounts["svg-label-mark"]).toBe(1);
    expect(
      rootSnapshot.issues.filter(
        (issue) => issue.kind === "svg-label-mark",
      ),
    ).toEqual([]);
    expectExactCoverageAccounting(rootSnapshot);

    const unsupportedRoot = await mount(
      page,
      `
      <svg data-viz-surface width="240" height="120">
        <defs>
          <rect id="unsupported-use-shape" x="20" y="20" width="180" height="70" fill="royalblue" />
        </defs>
        <use data-viz-mark href="#unsupported-use-shape" />
        <text x="54" y="62" font-size="22">Unsupported use</text>
      </svg>
    `,
    );
    const unsupportedSnapshot = await scanHkVisualizationCollisions(
      unsupportedRoot,
      "unsupported-use-fail-closed",
    );
    expect(unsupportedSnapshot.candidatePairCounts["svg-label-mark"]).toBe(1);
    expect(
      unsupportedSnapshot.issues.filter(
        (issue) => issue.kind === "svg-label-mark",
      ),
    ).toHaveLength(1);
    expectExactCoverageAccounting(unsupportedSnapshot);
  });

  test("rejects overlapping leaf tspans inside one SVG text element", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <svg data-viz-surface width="240" height="100">
        <text x="24" y="50" font-size="22">
          <tspan x="24" y="50">First</tspan>
          <tspan x="24" y="50">Second</tspan>
        </text>
      </svg>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "svg-label-label"),
    ).toBe(true);
    expect(snapshot.svgTextFragmentCount).toBe(2);
    expect(snapshot.candidatePairCounts["svg-label-label"]).toBe(1);
    expectExactCoverageAccounting(snapshot);
  });

  test("rejects absolutely positioned descendant text over ancestor text", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="position:relative;width:220px;height:60px;font-size:20px;line-height:28px">
        Ancestor text
        <span style="position:absolute;left:0;top:0">Child text</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "dom-text-text"),
    ).toBe(true);
  });

  test("rejects overlapping sibling labels inside one button", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <button style="position:relative;width:180px;height:48px">
        <span style="position:absolute;left:12px;top:10px;font-size:18px">First</span>
        <span style="position:absolute;left:12px;top:10px;font-size:18px">Second</span>
      </button>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "dom-text-text"),
    ).toBe(true);
  });

  test("rejects a label whose associated input covers its text", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <label style="position:relative;display:block;width:180px;height:48px;font-size:18px;line-height:28px">
        Visible label
        <input aria-label="value" style="position:absolute;left:0;top:0;width:150px;height:40px" />
      </label>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(snapshot.issues.some((issue) => issue.kind === "text-control")).toBe(
      true,
    );
    expect(snapshot.learnerControlCount).toBe(1);
    expect(snapshot.htmlTextFragmentCount).toBe(1);
    expect(snapshot.candidatePairCounts["text-control"]).toBe(1);
    expectExactCoverageAccounting(snapshot);
  });

  test("does not compare a control with its own text", async ({ page }) => {
    const root = await mount(
      page,
      `
      <button style="width:180px;height:48px;font-size:18px">Own button text</button>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(snapshot.issues).toEqual([]);
  });

  test("expands a semantic SVG group mark to its painted leaf geometry", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <svg data-viz-surface width="240" height="100">
        <g data-viz-mark>
          <rect x="10" y="10" width="180" height="50" fill="royalblue" />
          <text x="18" y="42" font-size="20">Unapproved label</text>
        </g>
      </svg>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "svg-label-mark"),
    ).toBe(true);
  });

  test("rejects a tiny overflow-visible overlap owner spoof", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div
        data-viz-overlap-ok="spoof"
        data-viz-overlap-reason="x"
        style="position:relative;width:2px;height:2px;overflow:visible;font-size:20px;line-height:28px"
      >
        <span style="position:absolute;left:0;top:0;width:180px">First label</span>
        <span style="position:absolute;left:10px;top:0;width:180px">Second label</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(snapshot.overlapExemptions).toHaveLength(1);
    expect(snapshot.overlapExemptions[0]).toMatchObject({
      candidateCount: 2,
      reason: "x",
      risk: "too-broad",
    });
    expect(
      snapshot.issues.some((issue) => issue.kind === "dom-text-text"),
    ).toBe(true);
    expect(snapshot.htmlTextFragmentCount).toBe(2);
    expect(snapshot.inspectedCandidateCount).toBe(2);
    expect(snapshot.candidatePairCounts["dom-text-text"]).toBe(1);
    expect(snapshot.totalCandidatePairCount).toBe(1);
    expect(snapshot.truncated).toBe(false);
    expectExactCoverageAccounting(snapshot);
  });

  test("allows an explicitly owned label inside its own narrow mark", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <svg data-viz-surface width="240" height="100">
        <g
          data-viz-overlap-ok="label-inside-own-segment"
          data-viz-overlap-reason="The value label is intentionally centered inside its own segment."
        >
          <rect data-viz-mark data-viz-overlap-member="mark" x="20" y="20" width="120" height="50" fill="royalblue" />
          <text data-viz-overlap-member="label" x="34" y="52" font-size="18">Value</text>
        </g>
      </svg>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(snapshot.overlapExemptions).toHaveLength(1);
    expect(snapshot.overlapExemptions[0].risk).toBe("explicit-narrow-pair");
    expect(snapshot.overlapExemptions[0].pair).toEqual([
      expect.stringContaining("[mark] rect"),
      expect.stringContaining("[label] text"),
    ]);
    expect(snapshot.svgTextFragmentCount).toBe(1);
    expect(snapshot.paintedMarkCount).toBe(1);
    expect(snapshot.inspectedCandidateCount).toBe(2);
    expect(snapshot.candidatePairCounts["svg-label-mark"]).toBe(0);
    expect(snapshot.totalCandidatePairCount).toBe(0);
    expect(snapshot.issues).toEqual([]);
    expect(snapshot.truncated).toBe(false);
    expectExactCoverageAccounting(snapshot);

    const thirdPartyRoot = await mount(
      page,
      `
      <svg data-viz-surface width="240" height="100">
        <rect id="unowned-third-party-mark" data-viz-mark data-viz-name="unowned-third-party-mark" x="20" y="20" width="120" height="50" fill="orange" />
        <g
          data-viz-overlap-ok="label-inside-own-segment"
          data-viz-overlap-reason="The value label is intentionally centered inside its own segment."
        >
          <rect data-viz-mark data-viz-overlap-member="mark" x="20" y="20" width="120" height="50" fill="royalblue" />
          <text data-viz-overlap-member="label" x="34" y="52" font-size="18">Value</text>
        </g>
      </svg>
    `,
    );
    const thirdPartySnapshot =
      await scanHkVisualizationCollisions(thirdPartyRoot);
    expect(thirdPartySnapshot.overlapExemptions).toHaveLength(1);
    expect(thirdPartySnapshot.overlapExemptions[0].risk).toBe(
      "explicit-narrow-pair",
    );
    expect(
      thirdPartySnapshot.issues.filter(
        (issue) => issue.kind === "svg-label-mark",
      ),
    ).toEqual([
      expect.objectContaining({
        second: expect.stringContaining("unowned-third-party-mark"),
      }),
    ]);
    expectExactCoverageAccounting(thirdPartySnapshot);

    const scrollOwnedRoot = await mount(
      page,
      `
      <div id="narrow-owner-scrollport" style="width:180px;height:110px;overflow-x:auto">
        <svg data-viz-surface width="820" height="100" style="display:block">
          <g
            data-viz-overlap-ok="scroll-owned-label"
            data-viz-overlap-reason="The value label is intentionally centered inside its own segment."
          >
            <rect id="scroll-owned-mark" data-viz-mark data-viz-overlap-member="mark" x="430" y="20" width="120" height="50" fill="royalblue" />
            <text id="scroll-owned-label" data-viz-overlap-member="label" x="450" y="52" font-size="18">Scroll value</text>
          </g>
        </svg>
      </div>
    `,
      "width:220px;min-height:130px",
    );
    const scrollport = scrollOwnedRoot.locator("#narrow-owner-scrollport");

    const whollyClippedSnapshot = await scanHkVisualizationCollisions(
      scrollOwnedRoot,
      "explicit-owner-wholly-clipped",
    );
    expect(whollyClippedSnapshot.overlapExemptions).toHaveLength(1);
    expect(whollyClippedSnapshot.overlapExemptions[0]).toMatchObject({
      candidateCount: 2,
      pair: [],
      risk: "explicit-narrow-pair",
    });
    expect(whollyClippedSnapshot.svgTextFragmentCount).toBe(0);
    expect(whollyClippedSnapshot.paintedMarkCount).toBe(0);
    expectExactCoverageAccounting(whollyClippedSnapshot);

    await scrollport.evaluate((element) => {
      element.scrollLeft = 260;
    });
    await expect
      .poll(() => scrollport.evaluate((element) => element.scrollLeft))
      .toBe(260);
    const partlyClippedSnapshot = await scanHkVisualizationCollisions(
      scrollOwnedRoot,
      "explicit-owner-partly-clipped",
    );
    expect(partlyClippedSnapshot.overlapExemptions).toHaveLength(1);
    expect(partlyClippedSnapshot.overlapExemptions[0]).toMatchObject({
      candidateCount: 2,
      risk: "explicit-narrow-pair",
    });
    expect(partlyClippedSnapshot.overlapExemptions[0].pair).toEqual([
      expect.stringContaining("[mark] rect"),
    ]);
    expect(partlyClippedSnapshot.svgTextFragmentCount).toBe(0);
    expect(partlyClippedSnapshot.paintedMarkCount).toBe(1);
    expectExactCoverageAccounting(partlyClippedSnapshot);

    await scrollport.evaluate((element) => {
      element.scrollLeft = 400;
    });
    await expect
      .poll(() => scrollport.evaluate((element) => element.scrollLeft))
      .toBe(400);
    const revealedSnapshot = await scanHkVisualizationCollisions(
      scrollOwnedRoot,
      "explicit-owner-revealed",
    );
    expect(revealedSnapshot.overlapExemptions).toHaveLength(1);
    expect(revealedSnapshot.overlapExemptions[0]).toMatchObject({
      candidateCount: 2,
      risk: "explicit-narrow-pair",
    });
    expect(revealedSnapshot.svgTextFragmentCount).toBe(1);
    expect(revealedSnapshot.paintedMarkCount).toBe(1);
    expect(revealedSnapshot.candidatePairCounts["svg-label-mark"]).toBe(0);
    expect(revealedSnapshot.issues).toEqual([]);
    expectExactCoverageAccounting(revealedSnapshot);

    const clippedThirdCandidateRoot = await mount(
      page,
      `
      <div id="broad-owner-scrollport" style="width:180px;height:110px;overflow-x:auto">
        <svg data-viz-surface width="900" height="100" style="display:block">
          <g
            data-viz-overlap-ok="scroll-owned-label-with-third-candidate"
            data-viz-overlap-reason="The value label is intentionally centered inside its own segment."
          >
            <rect data-viz-mark data-viz-overlap-member="mark" x="430" y="20" width="120" height="50" fill="royalblue" />
            <text data-viz-overlap-member="label" x="450" y="52" font-size="18">Scroll value</text>
            <circle id="clipped-third-candidate" data-viz-mark cx="780" cy="45" r="20" fill="orange" />
          </g>
        </svg>
      </div>
    `,
      "width:220px;min-height:130px",
    );
    const broadScrollport = clippedThirdCandidateRoot.locator(
      "#broad-owner-scrollport",
    );
    await broadScrollport.evaluate((element) => {
      element.scrollLeft = 400;
    });
    await expect
      .poll(() => broadScrollport.evaluate((element) => element.scrollLeft))
      .toBe(400);
    const clippedThirdCandidateSnapshot =
      await scanHkVisualizationCollisions(
        clippedThirdCandidateRoot,
        "explicit-owner-clipped-third-candidate",
      );
    expect(clippedThirdCandidateSnapshot.overlapExemptions).toHaveLength(1);
    expect(clippedThirdCandidateSnapshot.overlapExemptions[0]).toMatchObject({
      candidateCount: 3,
      risk: "too-broad",
    });
    expect(clippedThirdCandidateSnapshot.svgTextFragmentCount).toBe(1);
    expect(clippedThirdCandidateSnapshot.paintedMarkCount).toBe(1);
    expect(
      clippedThirdCandidateSnapshot.issues.filter(
        (issue) => issue.kind === "svg-label-mark",
      ),
    ).toHaveLength(1);
    expectExactCoverageAccounting(clippedThirdCandidateSnapshot);

    const htmlTextTagRoot = await mount(
      page,
      `
      <div data-viz-surface style="width:500px;height:200px">
        <div
          data-viz-overlap-ok="html-text-tag-spoof"
          data-viz-overlap-reason="Only a real semantic label can own a narrow overlap."
          style="position:relative;width:120px;height:50px"
        >
          <div data-viz-mark data-viz-overlap-member="mark" style="position:absolute;inset:0;background:royalblue"></div>
          <text data-viz-overlap-member="label" style="position:absolute;left:16px;top:12px;font-size:18px">X</text>
        </div>
      </div>
    `,
      "width:520px;min-height:220px",
    );
    const htmlTextTagSnapshot = await scanHkVisualizationCollisions(
      htmlTextTagRoot,
      "html-text-tag-overlap-member-spoof",
    );
    expect(htmlTextTagSnapshot.overlapExemptions).toHaveLength(1);
    expect(htmlTextTagSnapshot.overlapExemptions[0]).toMatchObject({
      candidateCount: 2,
      risk: "too-broad",
    });
    expectExactCoverageAccounting(htmlTextTagSnapshot);
  });

  test("audits the workspace root when it is the horizontal scroll container", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <svg data-viz-surface width="640" height="120">
        <text x="20" y="40">Wide diagram</text>
      </svg>
    `,
      "width:180px;height:140px;overflow-x:auto",
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some(
        (issue) => issue.kind === "scroll-container-not-focusable",
      ),
    ).toBe(true);
    expect(
      snapshot.issues.some(
        (issue) => issue.kind === "scroll-container-pan-hint-missing",
      ),
    ).toBe(true);
  });

  test("rejects ordinary DOM text clipped by an overflow-hidden ancestor", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="width:40px;height:24px;overflow:hidden;white-space:nowrap">
        <span style="font-size:18px">ABCDEFGHIJKLMNO</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "clipped-element"),
    ).toBe(true);
  });

  test("rejects ordinary DOM text clipped by a CSS clip-path", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="width:220px;height:44px;clip-path:inset(0 70% 0 0);font-size:20px;line-height:32px">
        <span>CSS clip path hides most of this label</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "clipped-element"),
    ).toBe(true);
  });

  test("allows content that remains inside a CSS clip-path", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="width:220px;height:44px;clip-path:inset(0);font-size:20px;line-height:32px">
        <span>Fully visible label</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "clipped-element"),
    ).toBe(false);
  });

  test("rejects text clipped by a circular ancestor clip-path", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="position:relative;width:240px;height:70px;clip-path:circle(30px at 30px 35px);font-size:20px;line-height:32px">
        <span style="position:absolute;left:12px;top:18px;white-space:nowrap">Circle-clipped learner label</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some(
        (issue) =>
          issue.kind === "clipped-element" && issue.message.includes("circle"),
      ),
    ).toBe(true);
  });

  test("allows text wholly contained by a circular ancestor clip-path", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="position:relative;width:240px;height:90px;clip-path:circle(105px at 120px 45px);font-size:18px;line-height:28px">
        <span style="position:absolute;left:82px;top:30px;white-space:nowrap">Safe circle label</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "clipped-element"),
    ).toBe(false);
  });

  test("rejects text clipped by a polygon on its own element", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <span data-viz-label style="display:block;width:240px;height:48px;clip-path:polygon(0 0,45% 0,45% 100%,0 100%);font-size:20px;line-height:34px;white-space:nowrap">
        Polygon clips this learner label
      </span>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some(
        (issue) =>
          issue.kind === "clipped-element" && issue.message.includes("polygon"),
      ),
    ).toBe(true);
  });

  test("allows text inside a full-box polygon clip-path", async ({ page }) => {
    const root = await mount(
      page,
      `
      <span data-viz-label style="display:block;width:240px;height:48px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%);font-size:20px;line-height:34px;white-space:nowrap">
        Polygon-safe label
      </span>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "clipped-element"),
    ).toBe(false);
  });

  test("rejects learner text clipped by a clip-path on its own element", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <span data-viz-label style="display:block;width:220px;height:44px;clip-path:inset(0 70% 0 0);font-size:20px;line-height:32px">
        Self-clipped learner label
      </span>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "clipped-element"),
    ).toBe(true);
  });

  test("rejects learner text positioned wholly outside every reachable viewport", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <p>Visible fixture anchor</p>
      <span style="position:fixed;left:-600px;top:20px;font-size:18px">Unreachable learner label</span>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some(
        (issue) =>
          issue.kind === "clipped-element" &&
          issue.message.includes("reachable viewport"),
      ),
    ).toBe(true);
  });

  test("rejects off-viewport text even when its oversized parent box intersects the viewport", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <p>Visible fixture anchor</p>
      <div style="position:fixed;left:-600px;top:20px;width:900px;font-size:18px;white-space:nowrap">
        Unreachable direct text
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some(
        (issue) =>
          issue.kind === "clipped-element" &&
          issue.message.includes("reachable viewport"),
      ),
    ).toBe(true);
  });

  test("clips off-scrollport SVG collision candidates before and after horizontal scroll", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div id="scrollport" style="width:180px;overflow-x:auto" tabindex="0">
        <div style="position:relative;width:620px;height:160px">
          <svg data-viz-surface width="620" height="120" style="display:block">
            <text id="off-scroll-label" x="530" y="50" font-size="18">Scroll-end SVG label</text>
            <rect id="off-scroll-mark" data-viz-mark x="535" y="78" width="80" height="20" fill="royalblue" />
          </svg>
          <button id="off-scroll-control" aria-label="Off-scroll control" style="position:absolute;left:535px;top:112px;width:120px;height:44px"></button>
        </div>
      </div>
      <input id="adjacent-control" aria-label="Adjacent control" style="position:absolute;left:525px;top:18px;width:150px;height:44px" />
      <span id="adjacent-label" style="position:absolute;left:535px;top:76px;font-size:18px;line-height:24px">Adjacent mark label</span>
      <span id="adjacent-control-label" style="position:absolute;left:535px;top:120px;font-size:18px;line-height:24px">Adjacent control label</span>
      <p data-viz-pan-hint>Swipe horizontally to pan the diagram.</p>
    `,
      "position:relative;width:700px;min-height:210px",
    );

    const rawStartGeometry = await root.evaluate((element) => {
      const label = element.querySelector("#off-scroll-label")!.getBoundingClientRect();
      const mark = element.querySelector("#off-scroll-mark")!.getBoundingClientRect();
      const control = element.querySelector("#adjacent-control")!.getBoundingClientRect();
      const adjacentLabel = element.querySelector("#adjacent-label")!.getBoundingClientRect();
      const offScrollControl = element.querySelector("#off-scroll-control")!.getBoundingClientRect();
      const adjacentControlLabel = element.querySelector("#adjacent-control-label")!.getBoundingClientRect();
      const scrollport = element.querySelector("#scrollport")!.getBoundingClientRect();
      return {
        labelOverlapsControl:
          Math.min(label.right, control.right) - Math.max(label.left, control.left) > 4 &&
          Math.min(label.bottom, control.bottom) - Math.max(label.top, control.top) > 4,
        markOverlapsAdjacentLabel:
          Math.min(mark.right, adjacentLabel.right) - Math.max(mark.left, adjacentLabel.left) > 4 &&
          Math.min(mark.bottom, adjacentLabel.bottom) - Math.max(mark.top, adjacentLabel.top) > 4,
        controlOverlapsAdjacentLabel:
          Math.min(offScrollControl.right, adjacentControlLabel.right) - Math.max(offScrollControl.left, adjacentControlLabel.left) > 4 &&
          Math.min(offScrollControl.bottom, adjacentControlLabel.bottom) - Math.max(offScrollControl.top, adjacentControlLabel.top) > 4,
        labelOutsideScrollport: label.left >= scrollport.right,
        markOutsideScrollport: mark.left >= scrollport.right,
        controlOutsideScrollport: offScrollControl.left >= scrollport.right,
      };
    });
    expect(rawStartGeometry).toEqual({
      labelOverlapsControl: true,
      markOverlapsAdjacentLabel: true,
      controlOverlapsAdjacentLabel: true,
      labelOutsideScrollport: true,
      markOutsideScrollport: true,
      controlOutsideScrollport: true,
    });

    const beforeScroll = await scanHkVisualizationCollisions(root, "before-scroll");
    expect(beforeScroll.issues).toEqual([]);
    expect(beforeScroll.svgTextFragmentCount).toBe(0);
    expect(beforeScroll.paintedMarkCount).toBe(0);
    expect(beforeScroll.learnerControlCount).toBe(1);
    expectExactCoverageAccounting(beforeScroll);

    await root.locator("#scrollport").evaluate((element) => {
      element.scrollLeft = element.scrollWidth - element.clientWidth;
    });
    await expect
      .poll(() =>
        root.locator("#scrollport").evaluate((element) => element.scrollLeft),
      )
      .toBeGreaterThan(400);

    const afterScroll = await scanHkVisualizationCollisions(root, "after-scroll");
    expect(afterScroll.issues).toEqual([]);
    expect(afterScroll.svgTextFragmentCount).toBe(1);
    expect(afterScroll.paintedMarkCount).toBe(1);
    expect(afterScroll.learnerControlCount).toBe(2);
    expectExactCoverageAccounting(afterScroll);

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some(
        (issue) =>
          issue.kind === "clipped-element" &&
          issue.message.includes("reachable viewport"),
      ),
    ).toBe(false);

    for (const overflow of ["auto", "scroll", "hidden", "clip"]) {
      for (const axis of ["x", "y"] as const) {
        const farX = axis === "x" ? 260 : 12;
        const farY = axis === "y" ? 260 : 12;
        const overflowStyle =
          axis === "x"
            ? `overflow-x:${overflow};overflow-y:visible`
            : `overflow-x:visible;overflow-y:${overflow}`;
        const clippedRoot = await mount(
          page,
          `
          <div style="width:100px;height:100px;${overflowStyle}">
            <div style="position:relative;width:360px;height:360px">
              <svg data-viz-surface width="360" height="360" style="display:block">
                <text x="${farX}" y="${farY + 20}" font-size="18">Clipped ${axis} ${overflow}</text>
                <rect data-viz-mark x="${farX}" y="${farY + 34}" width="60" height="20" fill="royalblue" />
              </svg>
              <button aria-label="Clipped ${axis} ${overflow} control" style="position:absolute;left:${farX}px;top:${farY + 62}px;width:70px;height:32px"></button>
            </div>
          </div>
        `,
          "width:400px;min-height:400px",
        );
        const clippedSnapshot = await scanHkVisualizationCollisions(
          clippedRoot,
          `${axis}-${overflow}`,
        );
        expect(clippedSnapshot.svgTextFragmentCount).toBe(0);
        expect(clippedSnapshot.paintedMarkCount).toBe(0);
        expect(clippedSnapshot.learnerControlCount).toBe(0);
        expect(clippedSnapshot.issues).toEqual([]);
        expectExactCoverageAccounting(clippedSnapshot);
      }
    }
  });

  test("ignores deliberately inert off-viewport DOM", async ({ page }) => {
    const root = await mount(
      page,
      `
      <p>Visible fixture anchor</p>
      <div inert>
        <span style="position:fixed;left:-600px;top:20px;font-size:18px">Inactive editor label</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationLayout(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "clipped-element"),
    ).toBe(false);
  });

  test("ignores overlapping labels inside deliberately inert DOM", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div inert style="position:relative;width:220px;height:60px;font-size:20px;line-height:32px">
        <span style="position:absolute;left:16px;top:12px">Inactive first label</span>
        <span style="position:absolute;left:16px;top:12px">Inactive second label</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(snapshot.learnerControlCount).toBe(0);
    expect(snapshot.htmlTextFragmentCount).toBe(0);
    expect(snapshot.svgTextFragmentCount).toBe(0);
    expect(snapshot.paintedMarkCount).toBe(0);
    expect(snapshot.inspectedCandidateCount).toBe(0);
    expect(snapshot.totalCandidatePairCount).toBe(0);
    expect(snapshot.issues).toEqual([]);
    expectExactCoverageAccounting(snapshot);
  });

  test("rejects text covered by an opaque later-painted sibling", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="position:relative;width:220px;height:60px;font-size:20px;line-height:32px">
        <span style="position:absolute;left:16px;top:12px">Covered learner label</span>
        <span aria-hidden="true" style="position:absolute;left:12px;top:8px;width:200px;height:42px;background:rgb(15,23,42)"></span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "text-occlusion"),
    ).toBe(true);
    expect(snapshot.htmlTextFragmentCount).toBe(1);
    expect(snapshot.candidatePairCounts["text-occlusion"]).toBeGreaterThan(0);
    expectExactCoverageAccounting(snapshot);
  });

  test("allows text painted after its opaque background sibling", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="position:relative;width:220px;height:60px;font-size:20px;line-height:32px">
        <span aria-hidden="true" style="position:absolute;left:12px;top:8px;width:200px;height:42px;background:rgb(15,23,42)"></span>
        <span style="position:absolute;left:16px;top:12px;color:white">Visible learner label</span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "text-occlusion"),
    ).toBe(false);
  });

  test("allows a transparent later-painted sibling over text", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="position:relative;width:220px;height:60px;font-size:20px;line-height:32px">
        <span style="position:absolute;left:16px;top:12px">Visible learner label</span>
        <span aria-hidden="true" style="position:absolute;left:12px;top:8px;width:200px;height:42px;background:transparent"></span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "text-occlusion"),
    ).toBe(false);
  });

  for (const pseudo of ["before", "after"] as const) {
    test(`rejects text occluded by an opaque ::${pseudo} pseudo-element`, async ({
      page,
    }) => {
      const root = await mount(
        page,
        `
        <style>
          #pseudo-owner-${pseudo} { position:relative;width:240px;height:64px;font-size:20px;line-height:32px; }
          #pseudo-owner-${pseudo}::${pseudo} {
            content:"";position:absolute;left:12px;top:10px;width:190px;height:40px;
            background:rgb(15,23,42);z-index:2;
          }
          #pseudo-owner-${pseudo} > span { position:absolute;left:18px;top:14px;z-index:1; }
        </style>
        <div id="pseudo-owner-${pseudo}"><span>Pseudo-covered learner label</span></div>
      `,
      );

      const snapshot = await scanHkVisualizationCollisions(root);
      expect(
        snapshot.issues.some(
          (issue) =>
            issue.kind === "text-occlusion" &&
            issue.second.includes(`::${pseudo}`),
        ),
      ).toBe(true);
    });
  }

  test("allows an opaque pseudo-element painted behind learner text", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <style>
        #safe-pseudo-owner { position:relative;width:240px;height:64px;font-size:20px;line-height:32px; }
        #safe-pseudo-owner::after {
          content:"";position:absolute;inset:8px;background:rgb(15,23,42);z-index:0;
        }
        #safe-pseudo-owner > span { position:absolute;left:18px;top:14px;z-index:1;color:white; }
      </style>
      <div id="safe-pseudo-owner"><span>Foreground learner label</span></div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "text-occlusion"),
    ).toBe(false);
  });

  test("rejects an opaque canvas painted over learner text but allows a transparent canvas", async ({
    page,
  }) => {
    const opaqueRoot = await mount(
      page,
      `
      <div style="position:relative;width:240px;height:70px;font-size:20px;line-height:32px">
        <span style="position:absolute;left:18px;top:18px;z-index:1">Canvas-covered label</span>
        <canvas id="opaque-canvas" width="200" height="44" style="position:absolute;left:10px;top:10px;width:200px;height:44px;z-index:2"></canvas>
      </div>
    `,
    );
    await opaqueRoot.locator("#opaque-canvas").evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "rgb(15,23,42)";
      context.fillRect(0, 0, canvas.width, canvas.height);
    });
    const opaqueSnapshot = await scanHkVisualizationCollisions(opaqueRoot);
    expect(
      opaqueSnapshot.issues.some(
        (issue) =>
          issue.kind === "text-occlusion" && issue.second.includes("canvas"),
      ),
    ).toBe(true);

    const transparentRoot = await mount(
      page,
      `
      <div style="position:relative;width:240px;height:70px;font-size:20px;line-height:32px">
        <span style="position:absolute;left:18px;top:18px;z-index:1">Visible through canvas</span>
        <canvas width="200" height="44" style="position:absolute;left:10px;top:10px;width:200px;height:44px;z-index:2"></canvas>
      </div>
    `,
    );
    const transparentSnapshot =
      await scanHkVisualizationCollisions(transparentRoot);
    expect(
      transparentSnapshot.issues.some(
        (issue) => issue.kind === "text-occlusion",
      ),
    ).toBe(false);
  });

  test("fails closed for a positioned CSS background image over text and allows one behind text", async ({
    page,
  }) => {
    const coveredRoot = await mount(
      page,
      `
      <div style="position:relative;width:250px;height:70px;font-size:20px;line-height:32px">
        <span style="position:absolute;left:18px;top:18px;z-index:1">Image-covered label</span>
        <span aria-hidden="true" style="position:absolute;left:10px;top:10px;width:210px;height:44px;z-index:2;background-image:linear-gradient(#0f172a,#0f172a)"></span>
      </div>
    `,
    );
    const coveredSnapshot = await scanHkVisualizationCollisions(coveredRoot);
    expect(
      coveredSnapshot.issues.some((issue) => issue.kind === "text-occlusion"),
    ).toBe(true);

    const behindRoot = await mount(
      page,
      `
      <div style="position:relative;width:250px;height:70px;font-size:20px;line-height:32px">
        <span aria-hidden="true" style="position:absolute;left:10px;top:10px;width:210px;height:44px;z-index:0;background-image:linear-gradient(#0f172a,#0f172a)"></span>
        <span style="position:absolute;left:18px;top:18px;z-index:1;color:white">Foreground label</span>
      </div>
    `,
    );
    const behindSnapshot = await scanHkVisualizationCollisions(behindRoot);
    expect(
      behindSnapshot.issues.some((issue) => issue.kind === "text-occlusion"),
    ).toBe(false);
  });

  test("rejects a positioned video poster over text and allows it behind text", async ({
    page,
  }) => {
    const poster =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='44'%3E%3Crect width='200' height='44' fill='%230f172a'/%3E%3C/svg%3E";
    const coveredRoot = await mount(
      page,
      `
      <div style="position:relative;width:250px;height:70px;font-size:20px;line-height:32px">
        <span style="position:absolute;left:18px;top:18px;z-index:1">Video-covered label</span>
        <video aria-hidden="true" poster="${poster}" style="position:absolute;left:10px;top:10px;width:210px;height:44px;z-index:2"></video>
      </div>
    `,
    );
    const coveredSnapshot = await scanHkVisualizationCollisions(coveredRoot);
    expect(
      coveredSnapshot.issues.some(
        (issue) =>
          issue.kind === "text-occlusion" && issue.second.includes("video"),
      ),
    ).toBe(true);

    const behindRoot = await mount(
      page,
      `
      <div style="position:relative;width:250px;height:70px;font-size:20px;line-height:32px">
        <video aria-hidden="true" poster="${poster}" style="position:absolute;left:10px;top:10px;width:210px;height:44px;z-index:0"></video>
        <span style="position:absolute;left:18px;top:18px;z-index:1;color:white">Foreground video label</span>
      </div>
    `,
    );
    const behindSnapshot = await scanHkVisualizationCollisions(behindRoot);
    expect(
      behindSnapshot.issues.some((issue) => issue.kind === "text-occlusion"),
    ).toBe(false);
  });

  test("rejects a narrow opaque occluder covering only the first glyph edge", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="position:relative;width:260px;height:70px;font-size:24px;line-height:36px">
        <span style="position:absolute;left:20px;top:16px;z-index:1">EDGE SAMPLE LABEL</span>
        <span aria-hidden="true" style="position:absolute;left:18px;top:12px;width:8px;height:42px;z-index:2;background:rgb(15,23,42)"></span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "text-occlusion"),
    ).toBe(true);
  });

  test("allows a narrow opaque sibling that stops before the first glyph", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <div style="position:relative;width:260px;height:70px;font-size:24px;line-height:36px">
        <span style="position:absolute;left:28px;top:16px;z-index:1">VISIBLE EDGE LABEL</span>
        <span aria-hidden="true" style="position:absolute;left:16px;top:12px;width:8px;height:42px;z-index:2;background:rgb(15,23,42)"></span>
      </div>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(
      snapshot.issues.some((issue) => issue.kind === "text-occlusion"),
    ).toBe(false);
  });

  test("does not report normally wrapped multiline DOM text as a collision", async ({
    page,
  }) => {
    const root = await mount(
      page,
      `
      <p style="width:110px;font-size:16px;line-height:22px">
        This sentence wraps normally onto several lines.
      </p>
    `,
    );

    const snapshot = await scanHkVisualizationCollisions(root);
    expect(snapshot.issues).toEqual([]);
  });

  test("rejects canvas-only HK surfaces and accepts an actual SVG surface", async ({
    page,
  }) => {
    const canvasRoot = await mount(
      page,
      `
      <div data-viz-surface data-viz-renderer="canvas-2d" style="width:240px;height:100px">
        <canvas width="240" height="100"></canvas>
      </div>
    `,
    );
    const canvasSnapshot = await scanHkVisualizationCollisions(canvasRoot);
    expect(hkVisualizationSurfaceEvidenceIssues(canvasSnapshot)).toEqual([
      "HK_CANVAS_SURFACE_UNSUPPORTED",
      "HK_SVG_SURFACE_MISSING",
    ]);

    const svgRoot = await mount(
      page,
      `
      <svg data-viz-surface width="240" height="100">
        <rect data-viz-mark x="10" y="10" width="40" height="30" fill="royalblue" />
      </svg>
    `,
    );
    const svgSnapshot = await scanHkVisualizationCollisions(svgRoot);
    expect(hkVisualizationSurfaceEvidenceIssues(svgSnapshot)).toEqual([]);
  });
});

async function mount(
  page: Page,
  contents: string,
  rootStyle = "width:260px;min-height:120px",
) {
  await page.setContent(`
    <!doctype html>
    <html>
      <body style="margin:0">
        <main id="fixture-root" style="${rootStyle}">${contents}</main>
      </body>
    </html>
  `);
  const root = page.locator("#fixture-root");
  await expect(root).toBeVisible();
  return root as Locator;
}

function expectExactCoverageAccounting(
  snapshot: Awaited<ReturnType<typeof scanHkVisualizationCollisions>>,
) {
  expect(snapshot.inspectedCandidateCount).toBe(
    snapshot.learnerControlCount +
      snapshot.htmlTextFragmentCount +
      snapshot.svgTextFragmentCount +
      snapshot.paintedMarkCount,
  );
  expect(snapshot.totalCandidatePairCount).toBe(
    Object.values(snapshot.candidatePairCounts).reduce(
      (total, count) => total + count,
      0,
    ),
  );
}
