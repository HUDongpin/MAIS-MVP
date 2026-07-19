import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/visualizations/VisualizationCard.tsx", "utf8");

test("visualization card earns exploration through dwell plus interaction", () => {
  assert.match(source, /const engagedDwellMs = \d+;/);
  assert.match(source, /setTimeout\(\(\) => setDwellSatisfied\(true\), engagedDwellMs\)/);
  assert.match(source, /data-viz-card-body/);
  assert.match(source, /onPointerDownCapture=\{handleBodyEngagement\}/);
  assert.match(source, /onKeyDownCapture=\{handleBodyEngagement\}/);
  // The recording effect must require every gate, not just a ready runtime.
  assert.match(source, /if \(!autoExplore \|\| !dwellSatisfied \|\| !interacted\) return;/);
  assert.match(source, /data-viz-explore-gate/);
});

test("visualization card resets the engagement gate per module", () => {
  assert.match(source, /setDwellSatisfied\(false\);\s*\n\s*setInteracted\(false\);/);
  assert.match(source, /\}, \[moduleId\]\);/);
});

test("visualization card keeps the manual mark-explored button removed", () => {
  assert.doesNotMatch(source, /en: "Mark explored"/);
  assert.doesNotMatch(source, /data-viz-mark-explored-button/);
});
