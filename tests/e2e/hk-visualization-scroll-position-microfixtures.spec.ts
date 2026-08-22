import { expect, test } from "@playwright/test";
import {
  exerciseHkVisualizationScrollPositionMicrofixture,
  installHkVisualizationEffectiveVisibilityInspector,
} from "./hk-visualization-machine-acceptance-helpers";

test.describe("HK visualization nested horizontal-scroll observations", () => {
  test.beforeEach(async ({ page }) => {
    await installHkVisualizationEffectiveVisibilityInspector(page);
    await page.goto("data:text/html,<html><body></body></html>");
  });

  test("audits formula-only and SVG scrollports at all-start then each mid/end and restores every observation", async ({
    page,
  }) => {
    await page.setContent(`
      <main
        id="workspace"
        style="box-sizing:border-box;width:360px;padding:12px;background:#fff;color:#111;font:16px/1.5 Arial,sans-serif"
      >
        <p id="learner-state">Current state: two educational scrollports</p>

        <section>
          <p id="formula-pan" data-viz-pan-hint>Swipe horizontally to inspect the formula.</p>
          <div
            data-viz-formula-scroll
            tabindex="0"
            aria-describedby="formula-pan"
            style="box-sizing:border-box;width:180px;overflow-x:auto;border:1px solid #111"
          >
            <span
              data-viz-formula="identity"
              style="display:block;width:520px;padding:8px;white-space:nowrap;background:#fff;color:#111"
            >(a + b)² ≡ a² + 2ab + b²</span>
          </div>
        </section>

        <section>
          <p id="surface-pan" data-viz-pan-hint>Swipe horizontally to pan the diagram.</p>
          <div
            data-viz-scroll-container
            tabindex="0"
            aria-describedby="surface-pan"
            style="box-sizing:border-box;width:180px;overflow-x:auto;border:1px solid #111"
          >
            <svg data-viz-surface width="520" height="120" style="display:block;background:#fff">
              <rect data-viz-mark x="18" y="56" width="72" height="34" fill="#0050a4" />
              <text data-viz-label x="18" y="34" fill="#111" font-size="18">Exact area</text>
            </svg>
          </div>
        </section>

        <button
          data-viz-reset-model
          aria-label="Reset model"
          style="display:block;width:120px;height:44px;margin-top:12px;background:#fff;color:#111;border:2px solid #111"
        >Reset model</button>
      </main>
    `);
    const workspace = page.locator("#workspace");

    const result =
      await exerciseHkVisualizationScrollPositionMicrofixture(workspace);

    expect(result.failures).toEqual([]);
    expect(result.scrollObservationSets).toHaveLength(1);
    const receipt = result.scrollObservationSets[0];
    expect(receipt.phase).toBe("scroll-position-microfixture");
    expect(receipt.observationSet.containerCount).toBe(2);
    expect(
      receipt.observationSet.containers.map(
        ({ contentKind }) => contentKind,
      ),
    ).toEqual(["formula", "surface"]);
    expect(receipt.observationSet.observationCount).toBe(5);
    expect(
      receipt.observationSet.observations.map(
        ({ position, targetContainerKey }) => [position, targetContainerKey],
      ),
    ).toEqual([
      ["all-start", null],
      ["mid", receipt.observationSet.containers[0].containerKey],
      ["end", receipt.observationSet.containers[0].containerKey],
      ["mid", receipt.observationSet.containers[1].containerKey],
      ["end", receipt.observationSet.containers[1].containerKey],
    ]);
    for (const observation of receipt.observationSet.observations) {
      expect(Object.keys(observation.audits).sort()).toEqual([
        "collision",
        "contrast",
        "controlVisibility",
        "hitTarget",
        "layout",
        "target44",
      ]);
      expect(
        Object.values(observation.positiveEvidenceCounts).every(
          (count) => count > 0,
        ),
      ).toBe(true);
      expect(
        observation.positions.every(
          ({ restoreReachedScrollLeft, restoreSucceeded }) =>
            restoreSucceeded && Math.abs(restoreReachedScrollLeft) <= 2,
        ),
      ).toBe(true);
    }
    await expect
      .poll(() =>
        workspace
          .locator(
            "[data-viz-formula-scroll], [data-viz-scroll-container]",
          )
          .evaluateAll((elements) =>
            elements.map((element) => (element as HTMLElement).scrollLeft),
          ),
      )
      .toEqual([0, 0]);
    expect(result.layout).toHaveLength(5);
    expect(result.collisions).toHaveLength(5);
  });

  test("uses exactly one all-start observation when no educational container actually overflows", async ({
    page,
  }) => {
    await page.setContent(`
      <main id="workspace" style="width:360px;background:#fff;color:#111;font:16px Arial,sans-serif">
        <p data-viz-formula="sum">4 + 6 = 10</p>
        <svg data-viz-surface width="240" height="90" style="display:block;background:#fff">
          <rect data-viz-mark x="16" y="48" width="60" height="24" fill="#0050a4" />
          <text data-viz-label x="16" y="28" fill="#111" font-size="18">Ten blocks</text>
        </svg>
        <button aria-label="Reset model" style="width:120px;height:44px;background:#fff;color:#111;border:2px solid #111">Reset</button>
      </main>
    `);

    const result = await exerciseHkVisualizationScrollPositionMicrofixture(
      page.locator("#workspace"),
    );

    expect(result.failures).toEqual([]);
    expect(result.scrollObservationSets).toHaveLength(1);
    expect(result.scrollObservationSets[0].observationSet).toMatchObject({
      containerCount: 0,
      observationCount: 1,
    });
    expect(
      result.scrollObservationSets[0].observationSet.observations.map(
        ({ observationId }) => observationId,
      ),
    ).toEqual(["all-start"]);
  });
});
