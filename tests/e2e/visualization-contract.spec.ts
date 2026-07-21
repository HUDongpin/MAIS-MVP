import { expect, test } from "@playwright/test";
import {
  buildVisualizationLabHref,
  visualizationControlSurfaceSelectors,
  visualizationLabSectionSelector
} from "../../components/visualizations/visualizationDiagnostics";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import { collectPageErrors, expectNoPageErrors, loginAsDemoStudentApi } from "./helpers";

/**
 * Browser half of the visualization QA gate (transfer-doc F4 / Q1, resolved to Playwright).
 *
 * The headless `test:visualizations` gate proves the source contract (probe wiring,
 * bundle boundaries) but cannot prove the contract actually renders. This spec drives a
 * few labs in a real browser and asserts the runtime-ready DOM contract that
 * VisualizationLabPage's probe (VisualizationLabPage.tsx:75) requires — the same contract
 * SignatureLabAdapter must satisfy for ported canvas benches to report "ready":
 *   - [data-viz-surface] rendered and visible,
 *   - [data-viz-mark] present inside the surface (the probe's readiness condition),
 *   - a control-surface selector present (reset/mode), and
 *   - no page errors while the lab mounts.
 *
 * Kept to a small, deterministic sample so it is a fast gate, not a full sweep
 * (`visualization-values.spec.ts` owns the exhaustive value sweep).
 */

// The demo student (student-peter) is an HK learner, and the Visualization Lab
// only renders labs in the learner's own curriculum — HK-track labs plus
// CAPSTONE premium labs (see labMatchesLearnerCurriculum in VisualizationLabPage).
// Navigating to a cross-curriculum lab (e.g. a MAINLAND_HJB bench) correctly
// falls back to the menu, so it is NOT a render bug — it is just unreachable for
// this student. Scope the deterministic spread to labs this student can actually
// open. (Covering other curricula would need a student per track — out of scope
// for this fast gate.)
const accessibleLabs = visualizationLabCatalog.filter(
  (lab) =>
    lab.curriculumTrack === "HK" ||
    (lab.curriculumTrack === "CAPSTONE" && lab.threeD?.premiumLaunch === true)
);

// A deterministic spread across the accessible labs: first, middle, last.
const sampleLabs = (() => {
  const labs = accessibleLabs;
  if (labs.length === 0) return [];
  const indices = [...new Set([0, Math.floor(labs.length / 2), labs.length - 1])];
  return indices.map((i) => labs[i]);
})();

test.describe("Visualization Lab runtime-ready DOM contract", () => {
  test.skip(sampleLabs.length === 0, "No visualization labs in the catalog.");

  for (const lab of sampleLabs) {
    test(`${lab.labId} exposes the data-viz probe + control-surface contract`, async ({ page }) => {
      test.slow();
      const pageErrors = collectPageErrors(page);

      await loginAsDemoStudentApi(page);
      await page.goto(buildVisualizationLabHref(lab), { waitUntil: "domcontentloaded" });

      // The lab page reached its "lab" panel and mounted this lab's runtime.
      // Heavy labs (e.g. Three.js geometry benches) can take well over the
      // default expect timeout to reach panel-mode "lab" on a cold CI runner —
      // this is a mount-latency gate, not a renderer bug (see the projection-views
      // panel-mode flake). Give the mount assertions generous, explicit headroom.
      const mountTimeout = 45_000;
      await expect(page.locator('[data-viz-panel-mode="lab"]')).toBeVisible({ timeout: mountTimeout });
      await expect(
        page.locator(`[data-viz-active-lab-id=${JSON.stringify(lab.labId)}]`)
      ).toBeVisible({ timeout: mountTimeout });

      const section = page.locator(visualizationLabSectionSelector(lab));
      await expect(section, `${lab.labId} lab section should be visible`).toBeVisible({ timeout: mountTimeout });
      await section.scrollIntoViewIfNeeded();

      // The probe contract: a surface with at least one mark inside it.
      const surface = section.locator("[data-viz-surface]").first();
      await expect(surface, `${lab.labId} should render [data-viz-surface]`).toBeVisible({ timeout: mountTimeout });
      await expect(
        surface.locator("[data-viz-mark]").first(),
        `${lab.labId} should render [data-viz-mark] inside its surface (probe readiness)`
      ).toBeAttached();

      // At least one documented control-surface hook is present.
      const controlSelector = visualizationControlSurfaceSelectors
        .map((name) => `[${name}]`)
        .join(", ");
      await expect(
        section.locator(controlSelector).first(),
        `${lab.labId} should expose a control-surface selector`
      ).toBeAttached();

      expectNoPageErrors(pageErrors);
    });
  }
});
