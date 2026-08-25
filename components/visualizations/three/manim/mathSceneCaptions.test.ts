import assert from "node:assert/strict";
import test from "node:test";
import { activeMathSceneCaption, MATH_SCENE_CAPTION_SOURCE_CONTRACT } from "./mathSceneCaptions";
import { buildTrigUnitWaveMathSceneSpec } from "./mathSceneRegistry";

function trigScene() {
  return buildTrigUnitWaveMathSceneSpec({
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
}

test("selects one staged bilingual caption without increasing simultaneous cognitive load", () => {
  const scene = trigScene();
  const samples = [0.8, 2.8, 6.2, 11.1].map((elapsedSeconds) =>
    activeMathSceneCaption(scene, { elapsedSeconds, viewportWidth: 800 })
  );

  assert.equal(MATH_SCENE_CAPTION_SOURCE_CONTRACT.includes("one caption"), true);
  assert.deepEqual(samples.map((caption) => caption?.id), [
    "caption-unit-circle",
    "caption-height",
    "caption-projection",
    "caption-period"
  ]);
  samples.forEach((caption) => {
    assert.ok(caption?.text.includes(" / "), `${caption?.id} should be bilingual on desktop`);
    assert.ok((caption?.progress ?? -1) >= 0 && (caption?.progress ?? 2) <= 1);
  });
});

test("uses compact Chinese-first captions on mobile and hides captions outside their time windows", () => {
  const scene = trigScene();
  const mobile = [0.8, 2.8, 6.2, 11.1].map((elapsedSeconds) =>
    activeMathSceneCaption(scene, { elapsedSeconds, viewportWidth: 390 })
  );

  assert.deepEqual(mobile.map((caption) => caption?.text), [
    "先看单位圆",
    "P 的高度 = sin t",
    "同高投影 → 正弦波",
    "2π = 一个周期"
  ]);
  assert.equal(activeMathSceneCaption(scene, { elapsedSeconds: -1, viewportWidth: 800 }), null);
  assert.equal(activeMathSceneCaption(scene, { elapsedSeconds: 20, viewportWidth: 800 }), null);
});

test("authors caption windows in order without overlap or silent gaps during the teaching sequence", () => {
  const captions = trigScene().captions ?? [];

  assert.equal(captions.length, 4);
  captions.forEach((caption, index) => {
    assert.ok(caption.startSeconds >= 0);
    assert.ok(caption.endSeconds > caption.startSeconds);
    assert.ok(caption.mobileText);
    if (index > 0) assert.equal(caption.startSeconds, captions[index - 1].endSeconds);
  });
  assert.equal(captions[0]?.startSeconds, 0.6);
  assert.equal(captions.at(-1)?.endSeconds, 11.8);
});
