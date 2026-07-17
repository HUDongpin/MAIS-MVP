import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildCameraFrameState, type CameraFrameState } from "./mathCameraFrame";

const adapterPath = "components/visualizations/three/manim/mathCameraFrameAdapter.ts";

test("adapts a pedagogical CameraFrame into a deterministic Three.js camera target", async () => {
  assert.ok(fs.existsSync(adapterPath), "MAIS Manim camera frames need a pure Three.js adapter");

  const { cameraFrameAdapterForThree } = await import("./mathCameraFrameAdapter");
  const frame = buildCameraFrameState({
    id: "curve-detail",
    position: [1.5, 2.25, 3.5],
    target: [0.25, 0.75, -0.5],
    fov: 42
  });
  const adapted = cameraFrameAdapterForThree(frame);

  assert.equal(adapted.id, "curve-detail");
  assert.equal(adapted.fov, 42);
  assert.equal(adapted.progress, 1);
  assert.deepEqual(adapted.position, { x: 1.5, y: 2.25, z: 3.5 });
  assert.deepEqual(adapted.target, { x: 0.25, y: 0.75, z: -0.5 });
  assert.equal(adapted.smokeState, "shot=curve-detail;fov=42.00;position=1.50,2.25,3.50;target=0.25,0.75,-0.50");
});

test("camera frame adapter sanitizes invalid numeric values before R3F consumes them", async () => {
  assert.ok(fs.existsSync(adapterPath), "MAIS Manim camera frames need a pure Three.js adapter");

  const { cameraFrameAdapterForThree } = await import("./mathCameraFrameAdapter");
  const invalidFrame: CameraFrameState = {
    ...buildCameraFrameState({
      id: "invalid-shot",
      position: [0, 0, 5],
      target: [0, 0, 0],
      fov: 48
    }),
    fov: Number.NaN,
    position: [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
    target: [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]
  };
  const adapted = cameraFrameAdapterForThree(invalidFrame);

  assert.equal(adapted.id, "invalid-shot");
  assert.equal(adapted.fov, 48);
  assert.deepEqual(adapted.position, { x: 0, y: 0, z: 5 });
  assert.deepEqual(adapted.target, { x: 0, y: 0, z: 0 });
  assert.equal(adapted.smokeState, "shot=invalid-shot;fov=48.00;position=0.00,0.00,5.00;target=0.00,0.00,0.00");
});
