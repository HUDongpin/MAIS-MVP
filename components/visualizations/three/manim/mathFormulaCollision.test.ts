import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFormulaOverlayCollisionDiagnostics,
  FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT,
  formulaOverlayCollisionDataAttributes,
  serializeFormulaOverlayCollisionDiagnostics
} from "./mathFormulaCollision";
import type { ProjectedLabelAnchor } from "./mathProjectedLabels";
import { buildProjectedLabelPlacement } from "./mathProjectedLabelPlacement";

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

test("shifts or narrows the scrollable formula panel to preserve the widest safe mobile layout", () => {
  const viewport = { height: 127, width: 226 };
  const capturedReachableStates: Array<{
    edgeInsetPx: number;
    maxWidthRatio: number;
    name: string;
    placement: "bottom-left" | "top-right";
    screen: [number, number];
    width: number;
  }> = [
    {
      edgeInsetPx: 8,
      maxWidthRatio: 0.5,
      name: "all-ranges=min;mode=default",
      placement: "bottom-left",
      screen: [78.03, 51.64],
      width: 113
    },
    {
      edgeInsetPx: 4,
      maxWidthRatio: 0.45,
      name: "all-ranges=default;mode=2",
      placement: "top-right",
      screen: [79.12, 63.73],
      width: 101.7
    },
    {
      edgeInsetPx: 8,
      maxWidthRatio: 0.5,
      name: "all-ranges=default;mode=3",
      placement: "bottom-left",
      screen: [78.09, 52.36],
      width: 113
    }
  ];
  const originalPreferred = buildFormulaOverlayCollisionDiagnostics({
    formulaId: "family-formula",
    projectedLabels: [],
    tokenCount: 3,
    viewport
  });
  assert.equal(originalPreferred.formulaBox.width, 113);
  assert.ok(Math.abs(originalPreferred.formulaBox.height - 53.34) < 1e-9);
  assert.equal(originalPreferred.formulaBox.x, 12);
  assert.equal(originalPreferred.formulaBox.y, 12);
  assert.equal(originalPreferred.placement, "top-left");
  assert.equal(originalPreferred.safeAreaStatus, "safe");
  const originalPreferredBox = originalPreferred.formulaBox;

  for (const { edgeInsetPx, maxWidthRatio, name, placement, screen, width } of capturedReachableStates) {
    const diagnostics = buildFormulaOverlayCollisionDiagnostics({
      formulaId: "family-formula",
      projectedLabels: [{
        ...projectedLabel,
        id: "label:primary-family-curve",
        screen,
        text: "active f(x)"
      }],
      tokenCount: 3,
      viewport
    });
    const labelBounds = buildProjectedLabelPlacement(screen, viewport, { text: "active f(x)" }).bounds;
    const overlapWidth = Math.min(
      diagnostics.formulaBox.x + diagnostics.formulaBox.width,
      labelBounds.right
    ) - Math.max(diagnostics.formulaBox.x, labelBounds.left);
    const overlapHeight = Math.min(
      diagnostics.formulaBox.y + diagnostics.formulaBox.height,
      labelBounds.bottom
    ) - Math.max(diagnostics.formulaBox.y, labelBounds.top);
    const originalOverlapWidth = Math.min(
      originalPreferredBox.x + originalPreferredBox.width,
      labelBounds.right
    ) - Math.max(originalPreferredBox.x, labelBounds.left);
    const originalOverlapHeight = Math.min(
      originalPreferredBox.y + originalPreferredBox.height,
      labelBounds.bottom
    ) - Math.max(originalPreferredBox.y, labelBounds.top);

    assert.ok(originalOverlapWidth > 0 && originalOverlapHeight > 0, `${name} must reproduce the Run 31 collision`);
    assert.equal(diagnostics.placement, placement);
    assert.equal(diagnostics.formulaBox.width, width);
    assert.equal(diagnostics.edgeInsetPx, edgeInsetPx);
    assert.equal(diagnostics.collisionCount, 0);
    assert.equal(diagnostics.collisionLabelIds, "none");
    assert.equal(diagnostics.safeAreaStatus, "safe");
    assert.match(diagnostics.summary, new RegExp(`edgeInset=${edgeInsetPx}\\.0`));
    assert.match(diagnostics.summary, new RegExp(`maxWidthRatio=${maxWidthRatio}`));
    assert.ok(diagnostics.formulaBox.x >= edgeInsetPx);
    assert.ok(diagnostics.formulaBox.y >= edgeInsetPx);
    assert.ok(diagnostics.formulaBox.x + diagnostics.formulaBox.width <= viewport.width - edgeInsetPx);
    assert.ok(diagnostics.formulaBox.y + diagnostics.formulaBox.height <= viewport.height - edgeInsetPx);
    assert.ok(overlapWidth <= 0 || overlapHeight <= 0, `formula must clear active f(x) in ${name}`);
  }
});

test("keeps the live moving probe and primary family labels clear in captured Run 44 and Run 51 states", () => {
  const viewport = { height: 127, width: 226 };
  const capturedStates: Array<{
    edgeInsetPx: number;
    maxWidthRatio: number;
    minimumProbeGapPx: number;
    name: string;
    placement: "bottom-right" | "top-left";
    probeScreen: [number, number];
    width: number;
  }> = [
    {
      edgeInsetPx: 12,
      maxWidthRatio: 0.3,
      minimumProbeGapPx: 0.5,
      name: "Run 44",
      placement: "top-left",
      probeScreen: [113.53, 61.87],
      width: 67.8
    },
    {
      edgeInsetPx: 4,
      maxWidthRatio: 0.35,
      minimumProbeGapPx: 2,
      name: "Run 51",
      placement: "bottom-right",
      probeScreen: [107.21, 59.54],
      width: 79.1
    }
  ];

  for (const {
    edgeInsetPx,
    maxWidthRatio,
    minimumProbeGapPx,
    name,
    placement,
    probeScreen,
    width
  } of capturedStates) {
    const labels = [
      { screen: [218, 50.87] as [number, number], text: "active f(x)" },
      { screen: probeScreen, text: "(x,f(x))" }
    ];
    const diagnostics = buildFormulaOverlayCollisionDiagnostics({
      formulaId: "family-formula",
      projectedLabels: labels.map((label, index) => ({
        ...projectedLabel,
        id: index === 0 ? "label:primary-family-curve" : "label:family-probe",
        screen: label.screen,
        text: label.text
      })),
      tokenCount: 3,
      viewport
    });

    assert.equal(diagnostics.formulaBox.width, width, `${name} should keep the widest safe final candidate`);
    assert.equal(diagnostics.edgeInsetPx, edgeInsetPx);
    assert.equal(diagnostics.placement, placement);
    assert.equal(diagnostics.collisionCount, 0);
    assert.equal(diagnostics.collisionLabelIds, "none");
    assert.equal(diagnostics.safeAreaStatus, "safe");
    assert.equal(diagnostics.overflowEdges, "none");
    assert.match(diagnostics.summary, new RegExp(`edgeInset=${edgeInsetPx}\\.0`));
    assert.match(diagnostics.summary, new RegExp(`maxWidthRatio=${maxWidthRatio}`));
    assert.ok(diagnostics.edgeInsetPx >= 4);
    assert.ok(diagnostics.formulaBox.x >= 4);
    assert.ok(diagnostics.formulaBox.y >= 4);
    assert.ok(diagnostics.formulaBox.x + diagnostics.formulaBox.width <= viewport.width - 4);
    assert.ok(diagnostics.formulaBox.y + diagnostics.formulaBox.height <= viewport.height - 4);

    for (const label of labels) {
      const bounds = buildProjectedLabelPlacement(label.screen, viewport, { text: label.text }).bounds;
      const overlapWidth = Math.min(diagnostics.formulaBox.x + diagnostics.formulaBox.width, bounds.right) -
        Math.max(diagnostics.formulaBox.x, bounds.left);
      const overlapHeight = Math.min(diagnostics.formulaBox.y + diagnostics.formulaBox.height, bounds.bottom) -
        Math.max(diagnostics.formulaBox.y, bounds.top);
      assert.ok(overlapWidth <= 0 || overlapHeight <= 0, `${name} ${label.text} must not overlap the formula panel`);
      if (label.text === "(x,f(x))") {
        const horizontalGap = Math.max(
          bounds.left - (diagnostics.formulaBox.x + diagnostics.formulaBox.width),
          diagnostics.formulaBox.x - bounds.right
        );
        const verticalGap = Math.max(
          bounds.top - (diagnostics.formulaBox.y + diagnostics.formulaBox.height),
          diagnostics.formulaBox.y - bounds.bottom
        );
        assert.ok(
          Math.max(horizontalGap, verticalGap) >= minimumProbeGapPx,
          `${name} moving probe must retain at least ${minimumProbeGapPx}px of model clearance`
        );
      }
    }
  }
});

test("keeps formula collision avoidance continuous immediately above the mobile canvas threshold", () => {
  const run31Viewport = { height: 127, width: 226 };
  const run31Screen: [number, number] = [78.03, 51.64];

  for (const width of [480, 481, 500]) {
    const viewport = { height: run31Viewport.height, width };
    const screen: [number, number] = [
      run31Screen[0] * width / run31Viewport.width,
      run31Screen[1]
    ];
    const diagnostics = buildFormulaOverlayCollisionDiagnostics({
      formulaId: "family-formula",
      projectedLabels: [{
        ...projectedLabel,
        id: "label:primary-family-curve",
        screen,
        text: "active f(x)"
      }],
      tokenCount: 3,
      viewport
    });
    const labelBounds = buildProjectedLabelPlacement(screen, viewport, { text: "active f(x)" }).bounds;
    const overlapWidth = Math.min(
      diagnostics.formulaBox.x + diagnostics.formulaBox.width,
      labelBounds.right
    ) - Math.max(diagnostics.formulaBox.x, labelBounds.left);
    const overlapHeight = Math.min(
      diagnostics.formulaBox.y + diagnostics.formulaBox.height,
      labelBounds.bottom
    ) - Math.max(diagnostics.formulaBox.y, labelBounds.top);

    assert.equal(diagnostics.collisionCount, 0, `${width}px canvas must find a collision-free width`);
    assert.equal(diagnostics.safeAreaStatus, "safe");
    assert.equal(diagnostics.overflowEdges, "none");
    assert.equal(diagnostics.formulaBox.width, width * 0.5);
    assert.match(diagnostics.summary, /maxWidthRatio=0\.5/);
    assert.ok(overlapWidth <= 0 || overlapHeight <= 0, `${width}px formula must clear active f(x)`);
  }
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
  assert.equal(parsed.edgeInsetPx, diagnostics.edgeInsetPx);
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
