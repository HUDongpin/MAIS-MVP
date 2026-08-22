import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helperSource = readFileSync("tests/e2e/california-visualization-qa-helpers.ts", "utf8");
const teenNumbersSource = readFileSync("components/visualizations/signature/TeenNumbersLab.jsx", "utf8");

test("signature model response includes stable learner feedback", () => {
  assert.match(helperSource, /const semanticSelector = \[[\s\S]{0,180}"\.feedback"/);
  assert.match(helperSource, /"\[data-viz-surface\] \[role=img\]\[aria-label\]"/);
  assert.match(helperSource, /"\[data-viz-surface\] canvas\[aria-label\]"/);
  assert.match(helperSource, /"aria-label",\s+"data-viz-math-state"/);
  assert.match(teenNumbersSource, /data-viz-result role="status"/);
  assert.match(teenNumbersSource, /Said aloud: \{lastSpoken\}/);
});

test("signature reset captures intrinsic Canvas pixels instead of page raster phase", () => {
  const rawStateStart = helperSource.indexOf("async function rawSignatureBenchState");
  const rawStateEnd = helperSource.indexOf("export async function captureSignatureBenchDefaultState", rawStateStart);
  const rawStateSource = helperSource.slice(rawStateStart, rawStateEnd);
  assert.match(rawStateSource, /drawingCanvas\.toBlob/);
  assert.match(rawStateSource, /blob\.arrayBuffer\(\)/);
  assert.doesNotMatch(rawStateSource, /canvas\.screenshot/);
});

test("signature state stability keeps three samples after intrinsic PNG encoding", () => {
  const captureStart = helperSource.indexOf("export async function captureSignatureBenchDefaultState");
  const captureEnd = helperSource.indexOf("function modelChangeFingerprints", captureStart);
  const captureSource = helperSource.slice(captureStart, captureEnd);
  assert.match(captureSource, /Math\.min\(stepTimeout\(timeout\), 4_000\)/);
  assert.match(captureSource, /stableSemanticFrames >= 3 && identicalSurfaceFrames >= 3/);
  assert.match(captureSource, /controlVariants=\$\{controlVariants\.size\}/);
});
