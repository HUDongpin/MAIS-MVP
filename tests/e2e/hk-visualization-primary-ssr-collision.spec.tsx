import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { HK_PRIMARY_DEDICATED_LAB_IDS } from "../../components/visualizations/hk/hkVisualizationLabRegistry";
import {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions
} from "./hk-visualization-collision-scanner";

function renderPrimaryLabsWithStandardReactJsx() {
  const labIds = JSON.stringify(HK_PRIMARY_DEDICATED_LAB_IDS);
  const script = `
    import React from "react";
    globalThis.React = React;
    import { renderToStaticMarkup } from "react-dom/server";
    import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
    import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
    import { AppProviders } from "./components/providers/AppProviders.tsx";
    import { HKPrimaryVisualizationLab } from "./components/visualizations/hk/HKPrimaryVisualizationLab.tsx";

    const router = {
      back() {},
      forward() {},
      prefetch() { return Promise.resolve(); },
      push() {},
      refresh() {},
      replace() {}
    };
    const htmlByLab = Object.fromEntries(${labIds}.map((labId) => {
      const tree = React.createElement(
        AppRouterContext.Provider,
        { value: router },
        React.createElement(
          PathnameContext.Provider,
          { value: "/visualization-lab" },
          React.createElement(
            AppProviders,
            null,
            React.createElement(HKPrimaryVisualizationLab, { lab: { labId } })
          )
        )
      );
      return [labId, renderToStaticMarkup(tree)];
    }));
    process.stdout.write(JSON.stringify(htmlByLab));
  `;
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test" },
    maxBuffer: 16 * 1024 * 1024
  });

  if (result.status !== 0) {
    throw new Error(`Standard React SSR child failed (${result.status ?? "signal"}):\n${result.stderr}`);
  }
  return JSON.parse(result.stdout) as Record<string, string>;
}

const primaryHtmlByLab = renderPrimaryLabsWithStandardReactJsx();

test.describe("HK primary dedicated SVG default-state collision diagnostics", () => {
  test.beforeEach(async ({ page }) => {
    await installHkVisualizationEffectiveVisibilityInspector(page);
    await page.goto("data:text/html,<html><body></body></html>");
  });

  for (const labId of HK_PRIMARY_DEDICATED_LAB_IDS) {
    test(`${labId} has no unowned default-state SVG label collision`, async ({ page }) => {
      const markup = primaryHtmlByLab[labId];
      expect(markup, `Missing SSR markup for ${labId}.`).toBeTruthy();
      expect(markup).not.toContain("__pw_type");
      await page.setContent(`<!doctype html><html><body><main id="root">${markup}</main></body></html>`);
      const surface = page.locator('[data-viz-surface="true"], [data-viz-surface]').first();
      await expect(surface).toHaveCount(1);
      await surface.evaluate((element) => {
        element.setAttribute("width", "640");
        element.setAttribute("height", "360");
      });

      const snapshot = await scanHkVisualizationCollisions(surface);
      expect(snapshot.truncated, JSON.stringify(snapshot.issues.slice(0, 20), null, 2)).toBe(false);
      for (const exemption of snapshot.overlapExemptions) {
        expect(exemption.risk, JSON.stringify(exemption, null, 2)).toBe("explicit-narrow-pair");
        expect(exemption.reason?.trim(), JSON.stringify(exemption, null, 2)).toBeTruthy();
      }
      const ownerContracts = await surface.locator("[data-viz-overlap-ok]").evaluateAll((owners) => owners.map((owner) => ({
        id: owner.getAttribute("data-viz-overlap-ok"),
        members: Array.from(owner.children).map((child) => child.getAttribute("data-viz-overlap-member")),
        reason: owner.getAttribute("data-viz-overlap-reason")
      })));
      for (const owner of ownerContracts) {
        expect(owner.reason?.trim(), JSON.stringify(owner, null, 2)).toBeTruthy();
        expect(owner.members.slice().sort(), JSON.stringify(owner, null, 2)).toEqual(["label", "mark"]);
      }
      expect(snapshot.issues, JSON.stringify(snapshot.issues.slice(0, 30), null, 2)).toEqual([]);
    });
  }
});
