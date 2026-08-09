import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFormulaOverlayCollisionDiagnostics,
  FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT,
  formulaOverlayCollisionDataAttributes,
  serializeFormulaOverlayCollisionDiagnostics
} from "./mathFormulaCollision";
import type { ProjectedLabelAnchor } from "./mathProjectedLabels";

const projectedLabel = {
  anchorName: "center",
  ariaLabel: "curve label",
  colorRole: "function",
  conceptId: "function-rule",
  depth: 4,
  id: "label:curve",
  ndc: [0, 0, 0.25],
  objectId: "curve",
  placement: "projected-3d-anchor",
  screen: [80, 80],
  text: "function-rule",
  visible: true,
  world: [0, 0, 0]
} satisfies ProjectedLabelAnchor;

test("moves the mobile formula overlay to a safe corner when its preferred corner collides", () => {
  const diagnostics = buildFormulaOverlayCollisionDiagnostics({
    formulaId: "formula",
    projectedLabels: [projectedLabel],
    tokenCount: 4,
    viewport: { height: 320, width: 320 }
  });
  const attributes = formulaOverlayCollisionDataAttributes(diagnostics);

  assert.equal(diagnostics.mobileViewport, true);
  assert.equal(diagnostics.collisionCount, 0);
  assert.equal(diagnostics.collisionLabelIds, "none");
  assert.equal(diagnostics.placement, "top-right");
  assert.equal(diagnostics.safeAreaStatus, "safe");
  assert.equal(
    diagnostics.sourceContract,
    "Formula overlay collision: fixed-in-frame formula panel is checked against projected mobject labels for safe browser placement"
  );
  assert.match(diagnostics.summary, /formula=formula/);
  assert.match(diagnostics.summary, /placement=top-right/);
  assert.match(diagnostics.summary, /collisions=none/);
  assert.equal(attributes["data-viz-manim-formula-collision-count"], "0");
  assert.equal(attributes["data-viz-manim-formula-collision-label-ids"], "none");
  assert.equal(attributes["data-viz-manim-formula-mobile-viewport"], "true");
  assert.equal(attributes["data-viz-manim-formula-placement"], "top-right");
  assert.equal(attributes["data-viz-manim-formula-safe-area-status"], "safe");
  assert.equal(attributes["data-viz-manim-formula-safe-area-summary"], diagnostics.summary);
  assert.equal(attributes["data-viz-manim-formula-collision-source-contract"], FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT);
});

test("uses the final clamped label rectangle when an off-canvas anchor is relocated inward", () => {
  const diagnostics = buildFormulaOverlayCollisionDiagnostics({
    formulaId: "formula",
    projectedLabels: [{ ...projectedLabel, id: "label:edge", screen: [0, 0] }],
    tokenCount: 1,
    viewport: { height: 180, width: 320 }
  });

  assert.equal(diagnostics.placement, "top-right");
  assert.equal(diagnostics.collisionCount, 0);
  assert.equal(diagnostics.safeAreaStatus, "safe");
});

test("uses a real text-sized label box to free the lower mobile formula lane", () => {
  const diagnostics = buildFormulaOverlayCollisionDiagnostics({
    formulaId: "family-formula",
    projectedLabels: [{
      ...projectedLabel,
      id: "label:comparison-family-curve",
      screen: [0, 0],
      text: "comparison g(x)"
    }],
    tokenCount: 3,
    viewport: { height: 127, width: 226 }
  });

  assert.equal(diagnostics.placement, "bottom-left");
  assert.equal(diagnostics.collisionCount, 0);
  assert.equal(diagnostics.safeAreaStatus, "safe");
});

test("reports safe formula placement when projected labels stay outside the panel", () => {
  const diagnostics = buildFormulaOverlayCollisionDiagnostics({
    formulaId: "formula",
    projectedLabels: [{ ...projectedLabel, id: "label:point", screen: [280, 220] }],
    tokenCount: 2,
    viewport: { height: 450, width: 800 }
  });

  assert.equal(diagnostics.mobileViewport, false);
  assert.equal(diagnostics.collisionCount, 0);
  assert.equal(diagnostics.collisionLabelIds, "none");
  assert.equal(diagnostics.placement, "top-left");
  assert.equal(diagnostics.safeAreaStatus, "safe");
});

test("serializes formula collision diagnostics as deterministic script-safe browser QA JSON", () => {
  const diagnostics = buildFormulaOverlayCollisionDiagnostics({
    formulaId: "formula<script>",
    projectedLabels: [{ ...projectedLabel, id: "label<script>:curve" }],
    tokenCount: 4,
    viewport: { height: 320, width: 320 }
  });
  const json = serializeFormulaOverlayCollisionDiagnostics(diagnostics);
  const parsed = JSON.parse(json) as typeof diagnostics;

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.formulaId, "formula<script>");
  assert.equal(parsed.collisionCount, 0);
  assert.equal(parsed.collisionLabelIds, "none");
  assert.equal(parsed.placement, "top-right");
  assert.equal(parsed.safeAreaStatus, "safe");
  assert.deepEqual(parsed.formulaBox, diagnostics.formulaBox);
  assert.equal(parsed.summary, diagnostics.summary);
  assert.equal(parsed.sourceContract, FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT);
});

test("fails closed when projected labels occupy every formula corner", () => {
  const diagnostics = buildFormulaOverlayCollisionDiagnostics({
    formulaId: "formula",
    projectedLabels: [
      { ...projectedLabel, id: "label:top-left", screen: [40, 40] },
      { ...projectedLabel, id: "label:top-right", screen: [280, 40] },
      { ...projectedLabel, id: "label:bottom-left", screen: [40, 280] },
      { ...projectedLabel, id: "label:bottom-right", screen: [280, 280] }
    ],
    tokenCount: 2,
    viewport: { height: 320, width: 320 }
  });

  assert.equal(diagnostics.placement, "top-left");
  assert.equal(diagnostics.collisionCount, 1);
  assert.equal(diagnostics.collisionLabelIds, "label:top-left");
  assert.equal(diagnostics.safeAreaStatus, "collision");
});
