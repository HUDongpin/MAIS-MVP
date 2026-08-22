import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HK_SECONDARY_DEDICATED_LAB_IDS } from "../../components/visualizations/hk/hkVisualizationLabRegistry";
import {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions
} from "./hk-visualization-collision-scanner";

const workspaceUrl = (relativePath: string) => pathToFileURL(path.resolve(relativePath)).href;

let secondarySsrMatrix: Record<string, string> | null = null;

function renderSecondaryLabMatrix() {
  if (secondarySsrMatrix) return secondarySsrMatrix;
  const script = `
    import React from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
    import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
    import { AppProviders } from ${JSON.stringify(workspaceUrl("components/providers/AppProviders.tsx"))};
    import {
      HKSecondaryVisualizationLab,
      HK_SECONDARY_MODEL_CONTRACTS,
      projectValidTriangleCoordinate
    } from ${JSON.stringify(workspaceUrl("components/visualizations/hk/HKSecondaryVisualizationLab.tsx"))};
    import { HK_SECONDARY_DEDICATED_LAB_IDS } from ${JSON.stringify(workspaceUrl("components/visualizations/hk/hkVisualizationLabRegistry.ts"))};
    globalThis.React = React;
    const router = { back() {}, forward() {}, prefetch() { return Promise.resolve(); }, push() {}, refresh() {}, replace() {} };
    const originalUseState = React.useState;
    let renderOverride = null;
    React.useState = (initial) => {
      const value = typeof initial === "function" ? initial() : initial;
      if (renderOverride) {
        const valueKeys = value && typeof value === "object" && !Array.isArray(value)
          ? Object.keys(value).sort().join("|")
          : "";
        if (valueKeys === renderOverride.stateKeys) return [renderOverride.state, () => {}];
        if (value === renderOverride.initialMode) return [renderOverride.mode, () => {}];
      }
      return originalUseState(value);
    };

    const markupByCase = {};
    for (const labId of HK_SECONDARY_DEDICATED_LAB_IDS) {
      const contract = HK_SECONDARY_MODEL_CONTRACTS[labId];
      const defaultState = Object.fromEntries(contract.parameters.map((parameter) => [parameter.id, parameter.initial]));
      const endpointState = (endpoint) => {
        if (labId !== "angles") {
          return Object.fromEntries(contract.parameters.map((parameter) => [parameter.id, parameter[endpoint]]));
        }
        return contract.parameters.reduce(
          (state, parameter) => projectValidTriangleCoordinate(state, parameter.id, parameter[endpoint]),
          defaultState
        );
      };
      const variants = [
        { key: labId + ":default", mode: contract.modes[0].id, state: defaultState },
        ...contract.modes.slice(1).map((mode) => ({
          key: labId + ":mode-" + mode.id,
          mode: mode.id,
          state: defaultState
        })),
        { key: labId + ":sequential-minimums", mode: contract.modes[0].id, state: endpointState("min") },
        { key: labId + ":sequential-maximums", mode: contract.modes[0].id, state: endpointState("max") }
      ];
      const stateKeys = contract.parameters.map((parameter) => parameter.id).sort().join("|");
      for (const variant of variants) {
        renderOverride = { initialMode: contract.modes[0].id, mode: variant.mode, state: variant.state, stateKeys };
        const lab = { grade: "S", labId, title: { en: labId, zh: labId } };
        const tree = React.createElement(
          AppRouterContext.Provider,
          { value: router },
          React.createElement(
            PathnameContext.Provider,
            { value: "/visualization-lab" },
            React.createElement(AppProviders, null, React.createElement(HKSecondaryVisualizationLab, { lab }))
          )
        );
        markupByCase[variant.key] = renderToStaticMarkup(tree);
      }
    }
    renderOverride = null;
    process.stdout.write(JSON.stringify(markupByCase));
  `;
  const output = execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  secondarySsrMatrix = JSON.parse(output) as Record<string, string>;
  return secondarySsrMatrix;
}

test.describe("HK secondary dedicated SSR SVG collision diagnostics", () => {
  test.beforeEach(async ({ page }) => {
    await installHkVisualizationEffectiveVisibilityInspector(page);
    await page.goto("data:text/html,<html><body></body></html>");
  });

  for (const labId of HK_SECONDARY_DEDICATED_LAB_IDS) {
    test(`${labId} has no unowned default-state SVG label collision`, async ({ page }) => {
      const markup = renderSecondaryLabMatrix()[`${labId}:default`];
      expect(markup, `Missing SSR matrix entry for ${labId}:default`).toBeTruthy();
      await page.setContent(`<!doctype html><html><body><main id="root">${markup}</main></body></html>`);
      const surface = page.locator('[data-viz-surface="true"], [data-viz-surface]').first();
      await expect(surface).toHaveCount(1);
      await surface.evaluate((element) => {
        element.setAttribute("width", "640");
        element.setAttribute("height", "400");
      });

      const snapshot = await scanHkVisualizationCollisions(surface, `secondary-default:${labId}`);
      expect(snapshot.truncated, JSON.stringify(snapshot.issues.slice(0, 20), null, 2)).toBe(false);
      expect(
        snapshot.overlapExemptions.every((entry) => entry.risk === "explicit-narrow-pair"),
        JSON.stringify(snapshot.overlapExemptions, null, 2)
      ).toBe(true);
      expect(snapshot.issues, JSON.stringify(snapshot.issues.slice(0, 30), null, 2)).toEqual([]);
    });
  }

  test("all non-default modes and sequential endpoint states have no unowned SVG label collision", async ({ page }) => {
    test.setTimeout(180_000);
    const failures: Array<{ caseId: string; issues: unknown[]; overlapExemptions: unknown[]; truncated: boolean }> = [];
    const matrix = renderSecondaryLabMatrix();
    for (const [caseId, markup] of Object.entries(matrix).filter(([id]) => !id.endsWith(":default"))) {
      await page.setContent(`<!doctype html><html><body><main id="root">${markup}</main></body></html>`);
      const surface = page.locator('[data-viz-surface="true"], [data-viz-surface]').first();
      if (await surface.count() !== 1) {
        failures.push({ caseId, issues: [{ kind: "surface-count", count: await surface.count() }], overlapExemptions: [], truncated: false });
        continue;
      }
      await surface.evaluate((element) => {
        element.setAttribute("width", "640");
        element.setAttribute("height", "400");
      });
      const snapshot = await scanHkVisualizationCollisions(surface, `secondary-variant:${caseId}`);
      const invalidOwners = snapshot.overlapExemptions.filter((entry) => entry.risk !== "explicit-narrow-pair");
      if (snapshot.truncated || snapshot.issues.length > 0 || invalidOwners.length > 0) {
        failures.push({
          caseId,
          issues: snapshot.issues.slice(0, 30),
          overlapExemptions: invalidOwners,
          truncated: snapshot.truncated
        });
      }
    }
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });
});
