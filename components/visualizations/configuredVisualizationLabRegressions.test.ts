import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("components/visualizations/ConfiguredVisualizationLab.tsx", "utf8");

function layoutNumber(key: string) {
  const match = source.match(new RegExp(`${key}:\\s*(\\d+)`));
  assert.ok(match, `Missing arrayAreaLayout.${key}`);
  return Number(match[1]);
}

function templateBranch(templateId: string) {
  const start = source.indexOf(`if (templateId === "${templateId}")`);
  assert.notEqual(start, -1, `Missing ${templateId} branch`);

  const next = source.indexOf("if (templateId ===", start + 1);
  return source.slice(start, next === -1 ? undefined : next);
}

function templateBranchAroundMarker(templateId: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing ${marker}`);

  const start = source.lastIndexOf(`if (templateId === "${templateId}")`, markerIndex);
  assert.notEqual(start, -1, `Missing ${templateId} branch before ${marker}`);

  const next = source.indexOf("if (templateId ===", markerIndex);
  return source.slice(start, next === -1 ? undefined : next);
}

test("measurement ruler exposes visible numeric centimeter labels", () => {
  assert.match(source, /data-viz-name="ruler unit label"/);
  assert.match(source, /\{index\} cm/);
  assert.match(source, /data-viz-cm-value=\{index\}/);
});

test("number-line lab labels every integer unit from 0 to 18", () => {
  const branch = templateBranch("number-line");

  assert.match(source, /const numberLineTickValues = Array\.from\(\{ length: 19 \}, \(_, index\) => index\)/);
  assert.match(source, /tickValues: numberLineTickValues/);
  assert.match(branch, /state\.tickValues\.map\(\(tick\) =>/);
  assert.match(branch, /data-viz-tick-value=\{formatNumber\(tick, 0\)\}/);
  assert.doesNotMatch(source, /tickValues:\s*\[0,\s*3,\s*6,\s*9,\s*12,\s*15,\s*18\]/);
});

test("grade 1 add-subtract number-line lab uses Set, Start, and Step controls", () => {
  assert.match(source, /const gradeOneAddSubtractLabId = "us-ca-math-p1-1-oa-add-subtract"/);
  // Accept either the plain `mode` or the grade-band `cappedMode` fallback.
  assert.match(source, /const modelMode = usesGradeOneSetControls \? 1 : (?:mode|cappedMode)/);
  assert.match(source, /const comparisonDisabled = !semanticModel && templateId === "number-line" && mode === 0 && !usesGradeOneSetControls/);
  // Single-mode labs keep grid-cols-1; four-mode labs (function-graph
  // exponential model) use two responsive columns; the default reaches three
  // columns only at tablet width so 44px learner controls never become narrow.
  assert.match(
    source,
    /modeOptions\.length === 1[\s\S]{0,80}"grid-cols-1"[\s\S]{0,100}modeOptions\.length === 4[\s\S]{0,120}"grid-cols-1 min-\[360px\]:grid-cols-2"[\s\S]{0,160}"grid-cols-1 min-\[360px\]:grid-cols-2 min-\[768px\]:grid-cols-3"/
  );
  assert.match(source, /modeLabels: usesGradeOneSetControls[\s\S]*en: "Set"/);
  assert.match(source, /valueLabel: usesGradeOneSetControls[\s\S]*en: "Start"/);
  assert.match(source, /comparisonLabel: usesGradeOneSetControls[\s\S]*en: "Step"/);
});

test("probability lab reports both decimal and percent notation", () => {
  const branch = templateBranch("probability-simulation");

  assert.match(branch, /const probabilityPercent = formatNumber\(state\.probability \* 100, 0\)/);
  assert.match(branch, /formatNumber\(state\.probability, 2\)} = \$\{probabilityPercent\}%/);
});

test("array-area layout keeps cells below the title badge clearance zone", () => {
  const originY = layoutNumber("originY");
  const outlinePadding = layoutNumber("outlinePadding");
  const titleClearanceY = layoutNumber("titleClearanceY");

  assert.ok(originY > titleClearanceY, "array cells must start below title clearance");
  assert.ok(originY - outlinePadding > titleClearanceY, "array outline must also clear the title badge");
  assert.match(source, /const arrayAreaLayout\s*=/);
  assert.match(source, /data-viz-title-clearance-y=\{arrayAreaLayout\.titleClearanceY\}/);
  assert.match(source, /y=\{arrayAreaLayout\.originY \+ Math\.floor\(index \/ state\.columns\) \* arrayAreaLayout\.rowGap\}/);
  assert.doesNotMatch(source, /y=\{76 \+ Math\.floor\(index \/ state\.columns\) \* 28\}/);
});

test("configured visualization mode buttons produce distinct visible model states", () => {
  const arrayArea = templateBranch("array-area");
  assert.match(arrayArea, /mode === 0[\s\S]*data-viz-name="array row guide"/);
  assert.match(arrayArea, /mode === 1[\s\S]*data-viz-name="array column guide"/);
  assert.match(arrayArea, /mode === 2[\s\S]*data-viz-name="array area highlight"/);

  const clockMoneyData = templateBranch("clock-money-data");
  assert.match(clockMoneyData, /clockOpacity = mode === 0/);
  assert.match(clockMoneyData, /moneyOpacity = mode === 1/);
  assert.match(clockMoneyData, /dataOpacity = mode === 2/);
  assert.match(clockMoneyData, /data-viz-name="money coin"/);

  const measurementScale = templateBranch("measurement-scale");
  assert.match(measurementScale, /mode === 1[\s\S]*B = \$\{state\.objectBUnits\} cm/);
  assert.match(measurementScale, /mode === 2[\s\S]*diff = \$\{state\.difference\} cm/);
  assert.match(measurementScale, /data-viz-name="measurement mode guide"/);

  const statisticsDistribution = templateBranchAroundMarker("statistics-distribution", 'data-viz-name="spread band"');
  assert.match(statisticsDistribution, /data-viz-name="spread band"/);
  assert.match(statisticsDistribution, /opacity=\{mode === 1 \? "0\.26" : "0\.08"\}/);
  assert.match(statisticsDistribution, /strokeWidth=\{mode === 2 \? "9" : "7"\}/);
  assert.match(statisticsDistribution, /strokeWidth=\{mode === 0 \? "8" : "5"\}/);

  for (const branch of [arrayArea, clockMoneyData, measurementScale, statisticsDistribution]) {
    assert.match(branch, /data-viz-active-mode=\{mode\}/);
  }
});

test("clock-money-data value uses fractional hours instead of raw minute steps", () => {
  assert.match(source, /const moneyTotal = Math\.round\(\(hour \* 10 \+ \(minute \/ 60\) \* 10\) \* 100\) \/ 100/);
  assert.doesNotMatch(source, /moneyTotal:\s*hour \* 10 \+ minuteStep/);
});

test("3D labs show the 2D configured surface while the heavy runtime loads", () => {
  assert.match(source, /data-viz-three-progressive-surface/);
  assert.match(source, /data-viz-three-progressive-fallback/);
  assert.match(source, /const threeDUsableSurfaceReady = showThreeDCanvas/);
  assert.match(source, /data-viz-three-ready=\{threeDUsableSurfaceReady \? "true" : "false"\}/);
  assert.match(source, /data-viz-three-canvas-ready=\{threeDCanvasReady \? "true" : "false"\}/);
  assert.match(source, /onCanvasReady=\{\(\) => setThreeDCanvasReady\(true\)\}/);
  assert.match(source, /className=\{threeDCanvasReady \? "min-w-0" : "pointer-events-none absolute inset-0 min-w-0 opacity-0"\}/);
});

test("fraction bar shaded overlays are clipped to rounded bar outlines", () => {
  const branch = templateBranch("fraction-bar");

  assert.match(source, /import type \{ ComponentType, ReactNode, SyntheticEvent \} from "react";/);
  assert.match(source, /useId/);
  assert.match(branch, /const fractionBarClipId =/);
  assert.match(branch, /const equivalentFractionBarClipId =/);
  assert.match(branch, /<clipPath id=\{fractionBarClipId\}>[\s\S]*rx="18"[\s\S]*<\/clipPath>/);
  assert.match(branch, /<clipPath id=\{equivalentFractionBarClipId\}>[\s\S]*rx="14"[\s\S]*<\/clipPath>/);
  assert.match(branch, /clipPath=\{`url\(#\$\{fractionBarClipId\}\)`\}/);
  assert.match(branch, /clipPath=\{`url\(#\$\{equivalentFractionBarClipId\}\)`\}/);
});

test("right-triangle lab fits max geometry, emphasizes squares, and labels square values", () => {
  const branch = templateBranch("right-triangle-pythagorean");

  assert.match(source, /const rightTriangleLayout\s*=/);
  assert.match(source, /scale:\s*10/);
  assert.match(source, /summaryY:\s*panel\.y \+ panel\.height \+ 18/);
  assert.doesNotMatch(branch, /opacity="0\.16"/);
  assert.match(branch, /opacity=\{mode === 0 \? "0\.38" : "0\.14"\}/);
  assert.match(branch, /data-viz-name="leg a square area label"/);
  assert.match(branch, /data-viz-name="leg b square area label"/);
  assert.match(branch, /data-viz-name="hypotenuse square area label"/);
  assert.match(branch, /a\^2 = \{state\.legASquared\}/);
  assert.match(branch, /b\^2 = \{state\.legBSquared\}/);
  assert.match(branch, /c\^2 = \{state\.hypotenuseSquared\}/);
  assert.doesNotMatch(branch, /<text x="82" y="292"[\s\S]*state\.legASquared/);
});

test("angle geometry keeps extreme rays inside the panel and combines equal-angle labels", () => {
  const branch = templateBranch("angle-geometry");

  assert.match(source, /const angleGeometryLayout\s*=/);
  assert.match(source, /rayRadius:\s*136/);
  assert.doesNotMatch(branch, /pointOnRay\(angleA, 186\)/);
  assert.doesNotMatch(branch, /data-viz-radius="186"/);
  assert.match(branch, /const equalAngleComparison = state\.difference === 0 && mode === 2/);
  assert.match(branch, /data-viz-name="combined equal angle label"/);
  assert.match(branch, /A&amp;B|A&B/);
});

test("array and statistics summaries avoid graph collisions at reported slider extremes", () => {
  const arrayArea = templateBranch("array-area");
  const statisticsDistribution = templateBranchAroundMarker("statistics-distribution", 'data-viz-name="spread band"');

  assert.match(arrayArea, /const arraySummaryX = gridLeft \+ highlightWidth \/ 2/);
  assert.match(arrayArea, /y=\{arrayAreaLayout\.summaryY\}/);
  assert.match(arrayArea, /textAnchor="middle"/);
  assert.doesNotMatch(arrayArea, /<text x="82" y="292"[\s\S]*state\.columns/);

  assert.match(statisticsDistribution, /const rawMeanX = xForValue\(state\.mean\)/);
  assert.match(statisticsDistribution, /const meanX = clamp\(rawMeanX, frame\.left \+ 14, frame\.right - 14\)/);
  assert.match(statisticsDistribution, /data-viz-raw-x=\{formatNumber\(rawMeanX, 1\)\}/);
  assert.match(statisticsDistribution, /y=\{statisticsFrame\.summaryY\}/);
  assert.doesNotMatch(statisticsDistribution, /<text x="82" y="292"[\s\S]*state\.mean/);
});

test("mode buttons use distinct active colors for visual emphasis", () => {
  assert.match(source, /const modeButtonActiveClassNames\s*=/);
  assert.match(source, /bg-cyan-400 text-slate-950/);
  assert.match(source, /bg-fuchsia-400 text-slate-950/);
  assert.match(source, /bg-amber-300 text-slate-950/);
  assert.match(source, /modeButtonActiveClassNames\[index % modeButtonActiveClassNames\.length\]/);
  assert.doesNotMatch(source, /mode === index\s*\?\s*"bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500\/20"/);
});

test("configured visualization renderer omits introductory metadata panels from lab and lesson embeds", () => {
  assert.doesNotMatch(source, /text\(lab\.templateConfig\.focus\)/);
  assert.doesNotMatch(source, /controlCopy\.comparisonNote/);
  assert.doesNotMatch(source, /data-viz-readme-note/);
  assert.doesNotMatch(source, /data-viz-safeguard-status/);
  assert.doesNotMatch(source, /data-viz-california-domain/);
  assert.doesNotMatch(source, /Read me first/);
});

test("configured visualization lab exposes a footer action slot for lesson embeds", () => {
  assert.match(source, /import type \{ ComponentType, ReactNode, SyntheticEvent \} from "react";/);
  assert.match(source, /type ConfiguredVisualizationLabProps = \{[\s\S]*controlFooterAction\?: ReactNode;[\s\S]*lab\?: FeaturedLabDefinition \| null;/);
  assert.match(source, /function ConfiguredVisualizationLabSurface\(\{ controlFooterAction, lab = null, labId, topicId \}: ConfiguredVisualizationLabProps\)/);
  assert.match(source, /export function ConfiguredVisualizationLabDirect\(props: ConfiguredVisualizationLabProps\)/);
  assert.match(source, /export function ConfiguredVisualizationLab\(\{ controlFooterAction, lab: providedLab = null, labId, topicId \}: ConfiguredVisualizationLabProps\)/);
  assert.match(source, /<div className="flex min-w-0 flex-col gap-4">[\s\S]*data-viz-reset-model[\s\S]*data-viz-lesson-action-slot/);
  assert.match(source, /data-viz-lesson-action-slot className="mt-auto pt-4"/);
});

test("configured visualization range sliders respond to input and change events", () => {
  assert.match(source, /function Slider\(/);
  assert.match(source, /onInput=\{\(event\) => onValue\(Number\(event\.currentTarget\.value\)\)\}/);
  assert.match(source, /onChange=\{\(event\) => onValue\(Number\(event\.currentTarget\.value\)\)\}/);
});

test("configured Three.js canvas readiness is stable across slider value changes", () => {
  assert.match(
    source,
    /const threeDCanvasRuntimeKey = `\$\{threeDRenderPlan\.state\.familyId\}:\$\{threeDRenderPlan\.state\.templateId\}:\$\{threeDRenderPlan\.runtime\}`;/
  );
  assert.match(source, /setThreeDCanvasReady\(false\);[\s\S]{0,80}\}, \[threeDCanvasRuntimeKey\]\);/);
  assert.doesNotMatch(source, /threeDRenderPlanKey[\s\S]{0,180}primaryValue/);
});

test("coordinate-transform vertex labels use collision-aware positions", () => {
  const branch = templateBranchAroundMarker("coordinate-transform", 'data-viz-name="transformed triangle"');

  assert.match(source, /function coordinateTransformLabelPositions/);
  assert.match(branch, /const transformedLabelPositions = coordinateTransformLabelPositions\(state\.transformedSvg\)/);
  assert.match(branch, /data-viz-name="transformed vertex label"/);
  assert.match(branch, /data-viz-label-x=\{formatNumber\(labelPosition\.x, 2\)\}/);
  assert.doesNotMatch(branch, /x=\{point\.x \+ 8\} y=\{point\.y - 8\}/);
});

test("angle-geometry labels use collision-aware positions at equal high values", () => {
  const branch = templateBranchAroundMarker("angle-geometry", 'data-viz-name="angle a ray"');

  assert.match(source, /function angleGeometryLabelPositions/);
  assert.match(source, /const labelDistance = Math\.hypot\(labelA\.x - labelB\.x, labelA\.y - labelB\.y\)/);
  assert.match(branch, /const angleLabels = angleGeometryLabelPositions\(rayA, rayB\)/);
  assert.match(branch, /data-viz-name="angle a label"/);
  assert.match(branch, /data-viz-name="angle b label"/);
  assert.match(branch, /data-viz-label-x=\{formatNumber\(angleLabels\.labelA\.x, 2\)\}/);
  assert.doesNotMatch(branch, /x=\{rayA\.x \+ 8\} y=\{rayA\.y - 8\}/);
  assert.doesNotMatch(branch, /x=\{rayB\.x \+ 8\} y=\{rayB\.y - 8\}/);
});
