import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneFloorPlanePlan = {
  errorMessage: string | null;
  eulerAxes: "zxz" | "zxy" | null;
  floorPlaneVersion: "mais-manim-floor-plane/v1";
  plane: string;
  raisesError: boolean;
  sourceContract: string;
  summary: string;
  valid: boolean;
};

type MathSceneFloorPlaneModule = {
  SCENE_FLOOR_PLANE_SOURCE_CONTRACT: string;
  buildSceneFloorPlanePlan: (input?: { plane?: string }) => MathSceneFloorPlanePlan;
  sceneFloorPlaneDataAttributes: (plan: MathSceneFloorPlanePlan) => Record<string, string>;
  serializeSceneFloorPlanePlan: (plan: MathSceneFloorPlanePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneFloorPlane.ts";

async function importFloorPlaneModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.set_floor_plane planner");
  return await import("./mathSceneFloorPlane") as MathSceneFloorPlaneModule;
}

test("buildSceneFloorPlanePlan maps the default xy plane to zxz Euler axes", async () => {
  const { SCENE_FLOOR_PLANE_SOURCE_CONTRACT, buildSceneFloorPlanePlan } = await importFloorPlaneModule();
  const plan = buildSceneFloorPlanePlan();

  assert.equal(plan.floorPlaneVersion, "mais-manim-floor-plane/v1");
  assert.equal(plan.plane, "xy");
  assert.equal(plan.eulerAxes, "zxz");
  assert.equal(plan.sourceContract, SCENE_FLOOR_PLANE_SOURCE_CONTRACT);
  assert.equal(plan.valid, true);
  assert.equal(plan.raisesError, false);
  assert.equal(plan.errorMessage, null);
  assert.equal(plan.summary, "floorPlane:xy:euler=zxz:valid=true");
});

test("buildSceneFloorPlanePlan maps the xz plane to zxy Euler axes", async () => {
  const { buildSceneFloorPlanePlan } = await importFloorPlaneModule();
  const plan = buildSceneFloorPlanePlan({ plane: "xz" });

  assert.equal(plan.plane, "xz");
  assert.equal(plan.eulerAxes, "zxy");
  assert.equal(plan.valid, true);
  assert.equal(plan.raisesError, false);
  assert.equal(plan.summary, "floorPlane:xz:euler=zxy:valid=true");
});

test("buildSceneFloorPlanePlan reports invalid planes without guessing a camera convention", async () => {
  const { buildSceneFloorPlanePlan } = await importFloorPlaneModule();
  const plan = buildSceneFloorPlanePlan({ plane: "yz" });

  assert.equal(plan.plane, "yz");
  assert.equal(plan.eulerAxes, null);
  assert.equal(plan.valid, false);
  assert.equal(plan.raisesError, true);
  assert.equal(plan.errorMessage, "Only `xz` and `xy` are valid floor planes");
  assert.equal(plan.summary, "floorPlane:yz:euler=none:valid=false");
});

test("sceneFloorPlaneDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_FLOOR_PLANE_SOURCE_CONTRACT,
    buildSceneFloorPlanePlan,
    sceneFloorPlaneDataAttributes
  } = await importFloorPlaneModule();
  const plan = buildSceneFloorPlanePlan({ plane: "xz" });

  assert.deepEqual(sceneFloorPlaneDataAttributes(plan), {
    "data-viz-manim-floor-plane": "xz",
    "data-viz-manim-floor-plane-error": "none",
    "data-viz-manim-floor-plane-euler-axes": "zxy",
    "data-viz-manim-floor-plane-raises-error": "false",
    "data-viz-manim-floor-plane-source-contract": SCENE_FLOOR_PLANE_SOURCE_CONTRACT,
    "data-viz-manim-floor-plane-summary": plan.summary,
    "data-viz-manim-floor-plane-valid": "true"
  });
});

test("serializeSceneFloorPlanePlan emits stable script-safe JSON", async () => {
  const {
    SCENE_FLOOR_PLANE_SOURCE_CONTRACT,
    buildSceneFloorPlanePlan,
    serializeSceneFloorPlanePlan
  } = await importFloorPlaneModule();
  const plan = buildSceneFloorPlanePlan({ plane: "xz" });
  const json = serializeSceneFloorPlanePlan(plan);

  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    errorMessage: null,
    eulerAxes: "zxy",
    floorPlaneVersion: "mais-manim-floor-plane/v1",
    plane: "xz",
    raisesError: false,
    sourceContract: SCENE_FLOOR_PLANE_SOURCE_CONTRACT,
    summary: "floorPlane:xz:euler=zxy:valid=true",
    valid: true
  });
});

test("Scene floor-plane planner stays pure and documents the source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneFloorPlane.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /serializeSceneFloorPlanePlan/);
  assert.match(source, /stableSerialize/);
  assert.match(source, /set_floor_plane/);
  assert.match(source, /set_euler_axes\("zxz"\)/);
  assert.match(source, /set_euler_axes\("zxy"\)/);
  assert.match(source, /Only `xz` and `xy` are valid floor planes/);
  assert.match(source, /SCENE_FLOOR_PLANE_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
