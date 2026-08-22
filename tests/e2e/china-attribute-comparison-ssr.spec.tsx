import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { visualizationThemeForTheme } from "../../components/visualizations/visualizationTheme";
import {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions
} from "./hk-visualization-collision-scanner";
import { scanHkVisualizationTextContrast } from "./hk-visualization-text-contrast-scanner";

type AttributeComparisonState = {
  comparison: number;
  mode: number;
  theme: "dark" | "light";
  value: number;
};

const states = (["light", "dark"] as const).flatMap((theme) =>
  [0, 1, 2, 3].flatMap((mode) =>
    [0, 5, 10].flatMap((value) =>
      [0, 5, 10].map((comparison) => ({ comparison, mode, theme, value }))
    )
  )
);

function stateId(state: AttributeComparisonState) {
  return `${state.theme}/mode-${state.mode}/A-${state.value}/B-${state.comparison}`;
}

function renderStatesWithStandardReactJsx() {
  const script = `
    import React from "react";
    globalThis.React = React;
    import { renderToStaticMarkup } from "react-dom/server";
    import { ConfiguredSemanticPrimaryMarks } from "./components/visualizations/ConfiguredSemanticPrimaryMarks.tsx";
    import { visualizationThemeForTheme } from "./components/visualizations/visualizationTheme.ts";
    const states = ${JSON.stringify(states)};
    const stateId = (state) => \`${"${state.theme}"}/mode-${"${state.mode}"}/A-${"${state.value}"}/B-${"${state.comparison}"}\`;
    const markup = Object.fromEntries(states.map((state) => {
      const vizTheme = visualizationThemeForTheme(state.theme);
      const svg = React.createElement(
        "svg",
        {
          "data-viz-surface": "true",
          height: 360,
          viewBox: "0 0 640 360",
          width: 640,
          xmlns: "http://www.w3.org/2000/svg"
        },
        React.createElement("rect", { fill: vizTheme.svgBackground, height: 360, width: 640, x: 0, y: 0 }),
        React.createElement(ConfiguredSemanticPrimaryMarks, {
          accent: "#0284c7",
          comparison: state.comparison,
          family: "attribute-comparison",
          mode: state.mode,
          value: state.value,
          variant: "quantity-length-height-mass",
          vizTheme
        })
      );
      return [stateId(state), renderToStaticMarkup(svg)];
    }));
    process.stdout.write(JSON.stringify(markup));
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

const markupByStateId = renderStatesWithStandardReactJsx();

test("BNU P1 attribute comparison clears collision and fail-closed contrast in all 72 canonical states", async ({ page }) => {
  expect(states).toHaveLength(72);
  expect(new Set(states.map(stateId)).size).toBe(72);
  await installHkVisualizationEffectiveVisibilityInspector(page);
  await page.goto("data:text/html,<html><body></body></html>");

  for (const state of states) {
    const id = stateId(state);
    const background = visualizationThemeForTheme(state.theme).svgBackground;
    await test.step(id, async () => {
      await page.setContent(
        `<!doctype html><html><body style="margin:0;background:${background}">${markupByStateId[id]}</body></html>`
      );
      const surface = page.locator('[data-viz-surface="true"]');
      await expect(surface).toHaveCount(1);

      const collision = await scanHkVisualizationCollisions(surface, id);
      expect(collision.truncated, JSON.stringify(collision.issues.slice(0, 20), null, 2)).toBe(false);
      expect(collision.issues, JSON.stringify(collision.issues.slice(0, 30), null, 2)).toEqual([]);

      const contrast = await surface.evaluate(scanHkVisualizationTextContrast, {
        authoringSelector: "[data-viz-authoring-only]"
      });
      expect(contrast.checkedTextCount, id).toBeGreaterThan(0);
      expect(contrast.issues, JSON.stringify(contrast.issues.slice(0, 30), null, 2)).toEqual([]);
    });
  }
});
