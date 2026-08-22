import assert from "node:assert/strict";
import test from "node:test";
import {
  buildThreeDGraphScene,
  buildThreeDGraphCameraFromView,
  buildThreeDGraphPanelSamples,
  buildThreeDGraphSurfaceSamples,
  defaultThreeDGraphView,
  defaultThreeDGraphCamera,
  formatThreeDGraphSummary,
  projectThreeDGraphPoint,
  projectedThreeDGraphBounds,
  rotateThreeDGraphView
} from "./ThreeDGraphSvgGeometry";

test("projects 3D points into finite SVG coordinates with z moving upward", () => {
  const base = projectThreeDGraphPoint({ x: 0, y: 0, z: 0 }, defaultThreeDGraphCamera);
  const peak = projectThreeDGraphPoint({ x: 0, y: 0, z: 1 }, defaultThreeDGraphCamera);

  assert.equal(Number.isFinite(base.x), true);
  assert.equal(Number.isFinite(base.y), true);
  assert.equal(Number.isFinite(peak.x), true);
  assert.equal(Number.isFinite(peak.y), true);
  assert.equal(peak.x, base.x);
  assert.ok(peak.y < base.y);
});

test("builds a deterministic dome mesh with background panel columns and axis evidence", () => {
  const scene = buildThreeDGraphScene({
    meshResolution: 17,
    panelScale: 1,
    surfaceScale: 1
  });

  assert.equal(scene.meshRows.length, 17);
  assert.equal(scene.meshColumns.length, 17);
  assert.equal(scene.panelColumns.length, 25);
  assert.equal(scene.axisBoxEdges.length, 12);
  assert.ok(scene.baseGridLines.length >= 12);
  assert.ok(scene.peak.z > 0.95);
  assert.equal(scene.summary.formula, "z = h(1 - x^2 - y^2)");
  assert.equal(scene.summary.meshResolution, 17);
});

test("builds shared finite 3D surface samples for SVG and WebGL renderers", () => {
  const samples = buildThreeDGraphSurfaceSamples({
    meshResolution: 9,
    surfaceScale: 1.25
  });

  assert.equal(samples.length, 81);
  assert.deepEqual(samples[0], { x: -1, y: -1, z: 0 });
  assert.ok(samples.some((sample) => sample.x === 0 && sample.y === 0 && sample.z > 1.2));
  assert.equal(samples.every((sample) => Number.isFinite(sample.x) && Number.isFinite(sample.y) && Number.isFinite(sample.z)), true);
});

test("builds deterministic panel cuboids for the WebGL renderer", () => {
  const panels = buildThreeDGraphPanelSamples({
    panelScale: 1.1
  });

  assert.equal(panels.length, 25);
  assert.equal(panels.every((panel) => panel.corners.length === 8), true);
  assert.equal(panels.every((panel) => panel.corners.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z))), true);
  assert.ok(panels.some((panel) => panel.height > 1));
});

test("formats the graph state for Visualization Lab control copy", () => {
  const summary = formatThreeDGraphSummary({
    meshResolution: 17,
    panelScale: 0.9,
    surfaceScale: 1.25
  });

  assert.match(summary, /surface height = 1\.25/);
  assert.match(summary, /panel scale = 0\.90/);
  assert.match(summary, /17 x 17 mesh/);
});

test("rotates the projection camera around the z axis from horizontal drag", () => {
  const rotatedView = rotateThreeDGraphView(defaultThreeDGraphView, { deltaX: 120, deltaY: 0 });
  const defaultCamera = buildThreeDGraphCameraFromView(defaultThreeDGraphView);
  const rotatedCamera = buildThreeDGraphCameraFromView(rotatedView);

  assert.notEqual(rotatedCamera.xAxisX, defaultCamera.xAxisX);
  assert.notEqual(rotatedCamera.yAxisX, defaultCamera.yAxisX);
  assert.equal(rotatedCamera.zAxisX, defaultCamera.zAxisX);
  assert.equal(rotatedCamera.zAxisY, defaultCamera.zAxisY);
});

test("changes elevation gently from vertical drag and clamps the accessible view", () => {
  const lowered = rotateThreeDGraphView(defaultThreeDGraphView, { deltaX: 0, deltaY: 80 });
  const raised = rotateThreeDGraphView(defaultThreeDGraphView, { deltaX: 0, deltaY: -80 });
  const clamped = rotateThreeDGraphView(defaultThreeDGraphView, { deltaX: 0, deltaY: 2000 });

  assert.ok(lowered.elevationScale < defaultThreeDGraphView.elevationScale);
  assert.ok(raised.elevationScale > defaultThreeDGraphView.elevationScale);
  assert.equal(clamped.elevationScale, 0.55);
});

test("keeps the complete SVG fallback construction inside its 640 by 360 drawing frame at every camera extreme", () => {
  const baseCorners = [-1, 1].flatMap((x) => [-1, 1].map((y) => ({ x, y, z: 0 })));
  const surfaceSamples = buildThreeDGraphSurfaceSamples({ meshResolution: 25, surfaceScale: 1.6 });
  const panelCorners = buildThreeDGraphPanelSamples({ panelScale: 1.6 }).flatMap((panel) => panel.corners);
  const points = [...baseCorners, ...surfaceSamples, ...panelCorners];

  for (const elevationScale of [0.55, 1, 1.25]) {
    for (let azimuthDegrees = -180; azimuthDegrees <= 180; azimuthDegrees += 15) {
      const camera = buildThreeDGraphCameraFromView({ azimuthDegrees, elevationScale });
      const bounds = projectedThreeDGraphBounds(points, camera);
      assert.ok(bounds.left >= 3, `left paint margin failed at ${azimuthDegrees}/${elevationScale}: ${bounds.left}`);
      assert.ok(bounds.right <= 637, `right paint margin failed at ${azimuthDegrees}/${elevationScale}: ${bounds.right}`);
      assert.ok(bounds.top >= 3, `top paint margin failed at ${azimuthDegrees}/${elevationScale}: ${bounds.top}`);
      assert.ok(bounds.bottom <= 357, `bottom paint margin failed at ${azimuthDegrees}/${elevationScale}: ${bounds.bottom}`);
    }
  }
});
