import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildDrawBorderThenFillFrame,
  buildVMobjectStyle,
  interpolateVMobjectStyle,
  summarizeVMobjectStyle
} from "./mathVMobjectStyle";
import { buildCurveObject } from "./mathCurveObject";

test("normalizes VMobject stroke and fill style data with safe opacity and width bounds", () => {
  const style = buildVMobjectStyle({
    fillOpacity: 1.6,
    fillRole: "area",
    jointAngleDegrees: Number.NaN,
    strokeOpacity: -0.25,
    strokeRole: "function",
    strokeWidth: -4
  });

  assert.deepEqual(style, {
    antiAliasWidth: 1,
    baseNormal: [0, 0, 1],
    fillOpacity: 1,
    fillRole: "area",
    jointAngleDegrees: 0,
    strokeZoomBehavior: "screen-space",
    strokeOpacity: 0,
    strokeRole: "function",
    strokeWidth: 0
  });
});

test("normalizes VMobject source-level base normal and stroke zoom behavior", () => {
  const style = buildVMobjectStyle({
    antiAliasWidth: 2.25,
    baseNormal: [0, 0, 2],
    fillOpacity: 0.35,
    jointAngleDegrees: 37,
    strokeZoomBehavior: "world-space",
    strokeWidth: 4
  });

  assert.deepEqual(style.baseNormal, [0, 0, 1]);
  assert.equal(style.strokeZoomBehavior, "world-space");
  assert.equal(style.antiAliasWidth, 2.25);
  assert.equal(style.jointAngleDegrees, 37);
});

test("interpolates VMobject stroke and fill style while preserving semantic roles until final alpha", () => {
  const source = buildVMobjectStyle({
    fillOpacity: 0,
    fillRole: "reference",
    strokeOpacity: 0.2,
    strokeRole: "reference",
    strokeWidth: 1
  });
  const target = buildVMobjectStyle({
    fillOpacity: 0.6,
    fillRole: "area",
    strokeOpacity: 1,
    strokeRole: "function",
    strokeWidth: 5
  });
  const halfway = interpolateVMobjectStyle(source, target, 0.5);
  const final = interpolateVMobjectStyle(source, target, 1);

  assert.equal(halfway.strokeRole, "reference");
  assert.equal(halfway.fillRole, "reference");
  assert.equal(halfway.strokeWidth, 3);
  assert.equal(Number(halfway.strokeOpacity.toFixed(3)), 0.6);
  assert.equal(halfway.fillOpacity, 0.3);
  assert.deepEqual(halfway.baseNormal, [0, 0, 1]);
  assert.equal(halfway.strokeZoomBehavior, "screen-space");
  assert.equal(final.strokeRole, "function");
  assert.equal(final.fillRole, "area");
  assert.equal(final.strokeZoomBehavior, "screen-space");
});

test("models DrawBorderThenFill as a deterministic two-phase VMobject creation frame", () => {
  const style = buildVMobjectStyle({
    fillOpacity: 0.4,
    fillRole: "area",
    strokeOpacity: 1,
    strokeRole: "function",
    strokeWidth: 6
  });
  const border = buildDrawBorderThenFillFrame(style, 0.25);
  const fill = buildDrawBorderThenFillFrame(style, 0.75);

  assert.equal(border.phase, "draw-border");
  assert.equal(border.drawRange[0], 0);
  assert.equal(border.drawRange[1], 0.5);
  assert.equal(border.style.fillOpacity, 0);
  assert.equal(border.style.strokeWidth, 6);

  assert.equal(fill.phase, "fill");
  assert.deepEqual(fill.drawRange, [0, 1]);
  assert.equal(fill.style.strokeOpacity, 1);
  assert.equal(Number(fill.style.fillOpacity.toFixed(3)), 0.2);
});

test("summarizes VMobject style for QA evidence and reduced visual ambiguity", () => {
  const summary = summarizeVMobjectStyle(buildVMobjectStyle({
    antiAliasWidth: 1.5,
    fillOpacity: 0.2,
    fillRole: "area",
    strokeOpacity: 0.85,
    strokeRole: "function",
    strokeWidth: 4
  }));

  assert.equal(summary, "stroke=function:4.00@0.85;fill=area@0.20;aa=1.50");
});

test("CurveObject carries default VMobject style metadata without changing arc-length behavior", () => {
  const curve = buildCurveObject({
    colorRole: "function",
    conceptId: "curve",
    id: "curve",
    samples: [[0, 0, 0], [2, 0, 0]]
  });

  assert.equal(curve.totalLength, 2);
  assert.equal(curve.style.strokeRole, "function");
  assert.equal(curve.style.strokeWidth, 5);
  assert.equal(curve.style.fillOpacity, 0);
});

test("VMobject style stays pure and curve object imports it as source metadata", () => {
  const styleSource = fs.readFileSync("components/visualizations/three/manim/mathVMobjectStyle.ts", "utf8");
  const curveSource = fs.readFileSync("components/visualizations/three/manim/mathCurveObject.ts", "utf8");

  assert.doesNotMatch(styleSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(curveSource, /buildVMobjectStyle/);
});
