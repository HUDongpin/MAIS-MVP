import assert from "node:assert/strict";
import test from "node:test";
import { buildTrigUnitWaveMathSceneSpec } from "./mathSceneRegistry";
import { buildSceneProjectedLabelAnchorsFromRuntimeState } from "./mathProjectedLabels";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { applyMathUpdaters } from "./mathUpdaterRegistry";

const scene = buildTrigUnitWaveMathSceneSpec({
  accent: "#fb7185",
  state: {
    comparison: 4,
    depthValue: 1.8,
    familyId: "three-trig-unit-wave",
    mode: 0,
    primaryValue: 5,
    secondaryValue: 4,
    stateSummary: "family=three-trig-unit-wave;template=trig-unit-wave;value=5.000;comparison=4.000;depth=1.800",
    templateId: "trig-unit-wave",
    value: 5
  }
});

test("projects persistent scene teaching labels and substitutes compact text on mobile", () => {
  const initialRuntime = buildMathSceneRuntimeState(scene, 0);
  const runtime = buildMathSceneRuntimeState(scene, 3.5);
  const initial = buildSceneProjectedLabelAnchorsFromRuntimeState(
    initialRuntime,
    { height: 450, width: 800 },
    scene.projectedLabels ?? []
  );
  const desktop = buildSceneProjectedLabelAnchorsFromRuntimeState(
    runtime,
    { height: 450, width: 800 },
    scene.projectedLabels ?? []
  );
  const mobile = buildSceneProjectedLabelAnchorsFromRuntimeState(
    runtime,
    { height: 220, width: 390 },
    scene.projectedLabels ?? []
  );
  const desktopByObjectId = Object.fromEntries(desktop.map((label) => [label.objectId, label]));
  const mobileByObjectId = Object.fromEntries(mobile.map((label) => [label.objectId, label]));

  assert.deepEqual(initial, [], "teaching labels must not overload the blank opening frame");
  assert.equal(desktopByObjectId["unit-circle"]?.text, "单位圆 / Unit circle");
  assert.equal(mobileByObjectId["unit-circle"]?.text, "单位圆");
  assert.equal(desktopByObjectId["graph-x-axis-title"]?.text, "t（弧度 / radians）");
  assert.equal(mobileByObjectId["graph-x-axis-title"]?.text, "t (rad)");
  assert.ok(desktop.every((label) => label.id.startsWith("scene-label:")));
  assert.ok(desktop.every((label) => label.ariaLabel.includes("projected label")));
  assert.ok(desktop.every((label) => label.visible), "desktop teaching labels must fit the canonical camera");
  assert.ok(mobile.every((label) => label.visible), "mobile teaching labels must fit the canonical camera");
});

test("offsets the moving wave-point label away from the 2π tick at the shared endpoint", () => {
  const finalRuntime = buildMathSceneRuntimeState(scene, 11.5);
  const labels = buildSceneProjectedLabelAnchorsFromRuntimeState(
    finalRuntime,
    { height: 450, width: 800 },
    scene.projectedLabels ?? []
  );
  const wavePoint = labels.find((label) => label.id === "scene-label:wave-point-live");
  const finalTick = labels.find((label) => label.id === "scene-label:tick-2pi");

  assert.ok(wavePoint);
  assert.ok(finalTick);
  assert.ok(
    Math.abs((wavePoint?.screen[1] ?? 0) - (finalTick?.screen[1] ?? 0)) >= 12,
    "Q(t) and 2π need separate vertical label lanes"
  );
});

test("uses separate mobile label lanes for the projection explanation, ticks, and radian-axis title", () => {
  const runtime = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 4.9));
  const labels = buildSceneProjectedLabelAnchorsFromRuntimeState(
    runtime,
    { height: 220, width: 390 },
    scene.projectedLabels ?? []
  );
  const byId = Object.fromEntries(labels.map((label) => [label.id, label]));

  assert.ok(
    Math.abs(byId["scene-label:projection-guide-intro"].screen[1] - byId["scene-label:tick-0"].screen[1]) >= 30,
    "projection explanation needs a separate lane from x-axis ticks"
  );
  assert.ok(
    Math.abs(byId["scene-label:radian-axis"].screen[1] - byId["scene-label:tick-2pi"].screen[1]) >= 20,
    "radian-axis title needs a separate lane from the 2π tick"
  );
  assert.ok(
    Math.abs(byId["scene-label:circle-point-live"].screen[1] - byId["scene-label:projection-guide-intro"].screen[1]) >= 28,
    "P(t) and the projection explanation need separate mobile label lanes"
  );
});
