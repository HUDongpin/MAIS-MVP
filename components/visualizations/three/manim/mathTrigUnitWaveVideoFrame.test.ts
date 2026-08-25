import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildTrigUnitWaveVideoFrameState,
  renderTrigUnitWaveSvgFrame,
  trigUnitWaveVideoCoordinates,
  trigUnitWaveVideoLabelLayout
} from "./mathTrigUnitWaveVideoFrame";

test("maps the teaching timeline to one deterministic visual phase at a time", () => {
  assert.equal(buildTrigUnitWaveVideoFrameState(0, 11.8).phase, "intro");
  assert.equal(buildTrigUnitWaveVideoFrameState(0.6, 11.8).phase, "unit-circle");
  assert.equal(buildTrigUnitWaveVideoFrameState(2.2, 11.8).phase, "height");

  const halfway = buildTrigUnitWaveVideoFrameState(7.3, 11.8);
  assert.equal(halfway.phase, "projection");
  assert.ok(Math.abs(halfway.angleRadians - Math.PI) < 1e-9);
  assert.ok(Math.abs(halfway.sweepProgress - 0.5) < 1e-9);

  const complete = buildTrigUnitWaveVideoFrameState(10.5, 11.8);
  assert.equal(complete.phase, "period");
  assert.ok(Math.abs(complete.angleRadians - Math.PI * 2) < 1e-9);
  assert.equal(complete.caption, "一圈 2π，对应一个完整周期 / One turn, one full period");
});

test("keeps P and Q on the same horizontal projection for every video frame", () => {
  for (let index = 0; index <= 178; index += 1) {
    const state = buildTrigUnitWaveVideoFrameState(index / 15, 11.8);
    const coordinates = trigUnitWaveVideoCoordinates(state.angleRadians);
    assert.ok(Math.abs(coordinates.circlePoint.y - coordinates.wavePoint.y) < 1e-9);
    assert.ok(Math.abs(coordinates.circleRadius - 93) < 1e-9);
  }
});

test("places P and the same-height annotation in separate label lanes", () => {
  for (let index = 0; index <= 180; index += 1) {
    const angle = Math.PI * 2 * index / 180;
    const layout = trigUnitWaveVideoLabelLayout(angle, 1);
    assert.ok(
      Math.abs(layout.pLabel.y - layout.sameYLabel.y) >= 55.99,
      `label lanes collapsed at sample ${index}`
    );
    assert.ok(layout.pLabel.x >= 0 && layout.pLabel.x <= 854);
    assert.ok(layout.pLabel.y >= 0 && layout.pLabel.y <= 480);
    assert.ok(layout.sameYLabel.x >= 0 && layout.sameYLabel.x <= 854);
    assert.ok(layout.sameYLabel.y >= 0 && layout.sameYLabel.y <= 480);
    assert.ok(layout.qLabel.x >= 0 && layout.qLabel.x <= 854);
    assert.ok(layout.qLabel.y >= 0 && layout.qLabel.y <= 480);
  }
});

test("keeps Q away from radian tick labels when the wave point is on the x-axis", () => {
  for (const angle of [0, Math.PI, Math.PI * 2]) {
    const coordinates = trigUnitWaveVideoCoordinates(angle);
    const layout = trigUnitWaveVideoLabelLayout(angle, 1);
    assert.ok(layout.qLabel.y < coordinates.graphOrigin.y - 20);
  }
});

test("implements the export frame without React, Three.js, or a Python Manim renderer", () => {
  const source = fs.readFileSync(
    "components/visualizations/three/manim/mathTrigUnitWaveVideoFrame.ts",
    "utf8"
  );
  assert.doesNotMatch(source, /@react-three|from "three"|from "react"|python|manimlib/i);
  assert.match(source, /drawTrigUnitWaveVideoFrame/);
  assert.match(source, /Math\.sin/);
  assert.match(source, /Math\.cos/);
  assert.match(source, /同高投影/);
  assert.match(source, /π\/2/);
});

test("serializes a complete vector frame for constant-frame-rate offline encoding", () => {
  const svg = renderTrigUnitWaveSvgFrame({ elapsedSeconds: 7.3, totalDurationSeconds: 11.8 });
  assert.match(svg, /^<svg[^>]+viewBox="0 0 854 480"/);
  assert.match(svg, /P\(t\) = \(cos t, sin t\)/);
  assert.match(svg, /单位圆 \/ Unit circle/);
  assert.match(svg, /正弦波 \/ sine wave/);
  assert.match(svg, /Same-height projection/);
  assert.match(svg, /<path[^>]+data-role="sine-trace"/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});
