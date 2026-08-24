import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) => readFileSync(file, "utf8");

test("Manim control groups wrap instead of expanding a clipped 3D surface", () => {
  const canvas = source("components/visualizations/three/ThreeDLabCanvas.tsx");
  for (const selector of [
    "data-viz-manim-parameter-panel-control",
    "data-viz-manim-checkpoint-control",
    "data-viz-manim-history-control",
    "data-viz-manim-authoring-control"
  ]) {
    assert.match(
      canvas,
      new RegExp(`${selector} className="flex min-w-0 flex-wrap items-center gap-1"`, "u"),
      `${selector} must wrap within a narrow visualization card`
    );
  }
});

test("long visualization formulas remain keyboard-accessible instead of being clipped", () => {
  const canvas = source("components/visualizations/three/ThreeDLabCanvas.tsx");
  const overlay = source("components/visualizations/three/manim/MathFormulaOverlay.tsx");
  const card = source("components/visualizations/VisualizationCard.tsx");

  for (const [name, value] of [["3D formula", canvas], ["card formula", card]] as const) {
    assert.match(value, /aria-label="Scrollable [^"]+ formula"/u, `${name} needs an accessible scroll-region name`);
  }
  assert.match(overlay, /aria-label=\{runtimeCopy\.regionAriaLabel\}/u);
  assert.match(overlay, /regionAriaLabel: "Scrollable [^"]+ formula"/u);

  for (const [name, value] of [["3D formula", canvas], ["Manim formula", overlay], ["card formula", card]] as const) {
    assert.match(value, /role="region"/u, `${name} needs region semantics`);
    assert.match(value, /tabIndex=\{0\}/u, `${name} must be keyboard focusable`);
    assert.match(value, /overflow-(?:x-)?auto/u, `${name} must preserve the full long formula`);
    assert.match(value, /overscroll-(?:x-)?contain/u, `${name} must contain horizontal panning`);
  }

  assert.match(canvas, /max-w-\[calc\(100%-1\.5rem\)\]/u);
  assert.match(overlay, /pointer-events-auto[^"]*overflow-(?:x-)?auto/u);
});

test("statistics tick labels sit outside the plotted marks", () => {
  const configured = source("components/visualizations/ConfiguredVisualizationLab.tsx");

  assert.match(
    configured,
    /key=\{`stats-x-\$\{tick\}`\}[\s\S]*?<text x=\{mapFrameX\(tick\)\} y=\{frame\.bottom \+ 16\}/u
  );
  assert.match(
    configured,
    /key=\{`stats-y-\$\{tick\}`\}[\s\S]*?<text x=\{frame\.left - 10\} y=\{mapFrameY\(tick\) \+ 4\} textAnchor="end"/u
  );
  assert.match(
    configured,
    /<text x=\{frame\.right \+ 8\} y=\{frame\.bottom \+ 16\}[^>]*>x<\/text>/u
  );
});

test("clock, money, and data marks keep separate vertical lanes at maximum values", () => {
  const configured = source("components/visualizations/ConfiguredVisualizationLab.tsx");
  const trayBottom = 76 + 90;
  const dataTop = 260 - 76;
  const secondCoinRowBottom = 98 + 26 + 10;
  const moneyLabelTop = 154 - 14;

  assert.ok(dataTop - trayBottom >= 18, "maximum data bars must clear the money tray");
  assert.ok(moneyLabelTop - secondCoinRowBottom >= 6, "the value label must clear a full second coin row");
  assert.match(configured, /const clockMoneyDataLayout = \{[\s\S]*?dataMaxHeight: 76[\s\S]*?moneyLabelY: 154/u);
  assert.match(configured, /return clamp\(18 \+ base \* 4 \+ index \* 2, 22, clockMoneyDataLayout\.dataMaxHeight\)/u);
  assert.match(configured, /data-viz-name="money value label"[\s\S]*?y=\{clockMoneyDataLayout\.moneyLabelY\}/u);
  assert.match(configured, /y=\{clockMoneyDataLayout\.dataBaselineY - bar\}/u);
  assert.doesNotMatch(configured, /<text x="302" y="138"[^>]*>value =/u);
});

test("coordinate transformation annotations avoid plot marks and reserve exterior tick lanes", () => {
  const configured = source("components/visualizations/ConfiguredVisualizationLab.tsx");

  assert.match(configured, /function coordinateTransformLabelPositions\([\s\S]*?sourcePoints: Array<\{ x: number; y: number \}>[\s\S]*?reflectionLineX: number \| null/u);
  assert.match(configured, /const geometrySegments = \[\.\.\.triangleSegments\(sourcePoints\), \.\.\.triangleSegments\(points\)\]/u);
  assert.match(configured, /const guideSegments = \[/u);
  assert.match(configured, /reflectionLineX === null/u);
  assert.match(configured, /pointInsideTriangle\(candidate, sourcePoints\) \|\| pointInsideTriangle\(candidate, points\)/u);
  assert.match(configured, /coordinateTransformFrame\.left \+ 8,[\s\S]*?coordinateTransformFrame\.right - 8/u);
  assert.match(configured, /coordinateTransformLabelPositions\([\s\S]*?state\.transformedSvg,[\s\S]*?state\.sourceSvg,[\s\S]*?mode === 1 \? state\.origin\.x \+ state\.reflectionLineX \* state\.scale\.x : null/u);
  assert.match(configured, /data-viz-name="transformed vertex label"[\s\S]*?textAnchor="middle"/u);
  assert.match(configured, /key=\{`transform-x-\$\{tick\}`\}[\s\S]*?y=\{coordinateTransformFrame\.bottom \+ 18\}/u);
  assert.match(configured, /key=\{`transform-y-\$\{tick\}`\}[\s\S]*?x=\{coordinateTransformFrame\.left - 10\}[\s\S]*?textAnchor="end"/u);
  assert.match(configured, /data-viz-name="coordinate transform summary"[\s\S]*?y=\{coordinateTransformFrame\.summaryY\}/u);
  assert.doesNotMatch(
    configured,
    /<text x="82" y="292" fill=\{vizTheme\.labelText\} className="text-xs font-black">\s*\{mode === 0\s*\? `T\(/u
  );
});

test("trigonometric tick labels and axis names live outside the sine-wave plot", () => {
  const configured = source("components/visualizations/ConfiguredVisualizationLab.tsx");
  const plottedWaveRight = 562;
  const rightTickLabelX = 570 + 10;
  const largestWaveY = 184 + 58;
  const xTickLabelY = 272 + 16;

  assert.ok(rightTickLabelX - plottedWaveRight >= 18, "y tick labels must clear the plotted wave horizontally");
  assert.ok(xTickLabelY - largestWaveY >= 46, "x tick labels must clear a maximum-amplitude wave vertically");
  assert.match(configured, /key=\{`trig-x-\$\{tick\.label\}`\}[\s\S]*?y=\{frame\.bottom \+ 16\}/u);
  assert.match(configured, /key=\{`trig-y-\$\{tick\}`\}[\s\S]*?x=\{frame\.gridRight \+ 10\} y=\{y \+ 4\} textAnchor="start"/u);
  assert.match(configured, /<text x=\{frame\.gridRight \+ 10\} y=\{frame\.bottom \+ 16\}[^>]*>x<\/text>/u);
  assert.match(configured, /<text x=\{frame\.gridRight \+ 10\} y=\{frame\.top - 10\}[^>]*>y<\/text>/u);
  assert.doesNotMatch(configured, /<text x=\{frame\.gridLeft \+ 10\} y=\{y - 5\}/u);
});

test("signature Canvas explanations use compact finite text inside phone bitmaps", () => {
  const counting = source("components/visualizations/signature/CountingLab.jsx");
  const comparing = source("components/visualizations/signature/ComparingLab.jsx");

  assert.match(counting, /const compactZeroMessage = W < 300/u);
  assert.match(counting, /ctx\.fillText\('0 — zero', W \/ 2, H \* 0\.45 - 9\)/u);
  assert.match(counting, /ctx\.fillText\('Nothing to count\.', W \/ 2, H \* 0\.45 \+ 9\)/u);

  assert.match(comparing, /if \(W < 260\) \{/u);
  assert.match(comparing, /g\.fillText\('same length', W \/ 2, equalityY - 7\)/u);
  assert.match(comparing, /g\.fillText\(`\$\{A\} = \$\{B\}`, W \/ 2, equalityY \+ 7\)/u);
});
