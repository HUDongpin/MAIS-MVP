import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("components/visualizations/SignatureLabAdapter.tsx", "utf8");
const numberBondSource = readFileSync("components/visualizations/signature/NumberBondLab.jsx", "utf8");
const subtractionSource = readFileSync("components/visualizations/signature/SubtractionLab.jsx", "utf8");

test("signature Canvas benches expose one adapter-owned opaque paper stack", () => {
  assert.match(source, /querySelectorAll\("canvas"\)/);
  assert.match(source, /data-viz-signature-paper-layer/);
  assert.match(source, /paperLayer !== surface/);
  assert.match(source, /background-color: transparent !important/);
  assert.match(source, /background-image: none !important/);
  assert.match(source, /box-shadow: none !important/);
  assert.match(source, /style=\{\{ colorScheme: "light" \}\}/);
  assert.doesNotMatch(
    source,
    /data-viz-surface-kind="signature-canvas"[\s\S]{0,240}shadow-inner/,
    "the opaque paper surface must not inset-shadow transparent Canvas pixels"
  );
});

test("signature benches provide shared 44px controls and compositor-safe interaction states", () => {
  assert.match(source, /\[data-viz-signature-lab\] button \{\s+min-height: 46px;/);
  assert.match(source, /button:not\(:disabled\):hover[\s\S]{0,180}filter: none !important;/);
  assert.match(source, /\.choice \.mark[\s\S]{0,220}position: static !important;/);
  assert.match(source, /\.choice\.correct \.mark[\s\S]{0,100}#176248/);
});

test("signature Canvas terminal graphics keep labels last and fan outlines contrast-safe", () => {
  const queueIndex = subtractionSource.indexOf("const pendingChips = [];");
  const backingIndex = subtractionSource.indexOf("const measuredChips = pendingChips.map");
  const glyphIndex = subtractionSource.indexOf("for (const label of measuredChips)");
  assert.ok(queueIndex >= 0 && backingIndex > queueIndex && glyphIndex > backingIndex);
  assert.match(numberBondSource, /const CARM_FAN = '#F6CBD7';/);
  assert.match(numberBondSource, /const BLUE_FAN = '#C6DDF1';/);
  assert.match(
    numberBondSource,
    /const INK_SOFT = '#445565';/,
    "Number Bond secondary equations must clear 4.5:1 against the paper surface"
  );
  assert.match(numberBondSource, /ctx\.fillStyle = CARM_FAN;[\s\S]{0,180}ctx\.lineWidth = 3;/);
  assert.match(numberBondSource, /ctx\.fillStyle = BLUE_FAN;[\s\S]{0,180}ctx\.lineWidth = 3;/);
  assert.match(
    numberBondSource,
    /the cut mark[\s\S]{0,420}ctx\.strokeStyle = PAPER;[\s\S]{0,120}ctx\.lineWidth = 9;[\s\S]{0,180}ctx\.stroke\(\);[\s\S]{0,180}ctx\.strokeStyle = S\.tenStep \? GOLD : CARMINE;[\s\S]{0,120}ctx\.lineWidth = 3;[\s\S]{0,180}ctx\.stroke\(\);/,
    "the fan cut must use a paper separation halo before its essential semantic line"
  );
  const pendingFanLabelsIndex = numberBondSource.indexOf("const pendingFanLabels = [];");
  const fanGeometryIndex = numberBondSource.indexOf("the cut mark");
  const terminalFanLabelsIndex = numberBondSource.indexOf("for (const label of pendingFanLabels)");
  assert.ok(
    pendingFanLabelsIndex >= 0 &&
    fanGeometryIndex > pendingFanLabelsIndex &&
    terminalFanLabelsIndex > fanGeometryIndex,
    "Number Bond fan labels must be queued before geometry and rendered only after every fan paint"
  );
  assert.match(
    numberBondSource,
    /for \(const label of pendingFanLabels\)[\s\S]{0,520}ctx\.fillText\(label\.text, label\.x, label\.y\);/,
    "Number Bond must expose one explicit terminal label pass"
  );
});
