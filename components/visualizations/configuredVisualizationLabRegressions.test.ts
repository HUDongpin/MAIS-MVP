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
  assert.match(source, /\(templateId === "number-line" && mode === 0 && !usesGradeOneSetControls\)/);
  // Single-mode labs keep grid-cols-1; four-mode labs (function-graph
  // exponential model) use grid-cols-2; the default stays grid-cols-3.
  assert.match(
    source,
    /controlCopy\.modeLabels\.length === 1 \? "grid-cols-1" : controlCopy\.modeLabels\.length === 4 \? "grid-cols-2" : "grid-cols-3"/
  );
  assert.match(source, /modeLabels: usesGradeOneSetControls[\s\S]*en: "Set"/);
  assert.match(source, /valueLabel: usesGradeOneSetControls[\s\S]*en: "Start"/);
  assert.match(source, /comparisonLabel: usesGradeOneSetControls[\s\S]*en: "Step"/);
});

test("probability lab reports both decimal and percent notation", () => {
  const branch = templateBranch("probability-simulation");

  assert.match(branch, /const probabilityPercent = formatNumber\(state\.probability \* 100, 0\)/);
  assert.match(branch, /\$\{probabilityDecimal\} \$\{percentRelation\} \$\{probabilityPercent\}%/);
});

test("probability lab never joins a rounded decimal to an exact value with an equals sign", () => {
  // 1/3, 1/7 and 1/9 are all reachable on the success/failure sliders, so the
  // relation symbol has to be derived, never hard-coded to "=".
  assert.match(source, /const decimalRelation = roundedRelation\(state\.probability, probabilityDecimal\)/);
  assert.match(source, /const percentRelation = roundedRelation\(state\.probability \* 100, probabilityPercent\)/);
  assert.doesNotMatch(source, /formatNumber\(state\.probability, 2\)\} = \$\{probabilityPercent\}%/);
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

  assert.match(source, /import type \{ ComponentType, ReactNode \} from "react";/);
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
  assert.match(source, /origin:\s*\{ x: 174, y: 242 \}/);
  assert.match(source, /scale:\s*8/);
  assert.match(source, /summaryY:\s*panel\.y \+ panel\.height \+ 18/);
  assert.doesNotMatch(branch, /opacity="0\.16"/);
  assert.match(branch, /opacity=\{mode === 0 \? "0\.38" : "0\.14"\}/);
  assert.match(branch, /data-viz-name="leg a square area label"/);
  assert.match(branch, /data-viz-name="leg b square area label"/);
  assert.match(branch, /data-viz-name="hypotenuse square area label"/);
  assert.match(branch, /x="326" y="132"[\s\S]*?a=\{state\.legA\}; a²=\{state\.legASquared\}/);
  assert.match(branch, /x="326" y="164"[\s\S]*?b=\{state\.legB\}; b²=\{state\.legBSquared\}/);
  assert.match(branch, /x="326" y="196"[\s\S]*?c=\{formatNumber\(state\.hypotenuse, 2\)\}; c²=\{state\.hypotenuseSquared\}/);
  assert.doesNotMatch(branch, /<text x="82" y="292"[\s\S]*state\.legASquared/);

  const maxLeg = 9;
  const scale = 8;
  const originY = 242;
  const topOfHypotenuseSquare = originY - maxLeg * scale * 2;
  const bottomOfLegSquare = originY + maxLeg * scale;
  assert.ok(topOfHypotenuseSquare > 92, "maximum hypotenuse square must clear the title and legend band");
  assert.ok(bottomOfLegSquare < 326, "maximum leg square must stay inside the configured panel");
});

test("configured functions use raw mathematical coordinates and an SVG plot clip instead of false boundary plateaus", () => {
  assert.match(source, /const rawY = configuredFunctionFrame\.origin\.y - yValue \* configuredFunctionFrame\.yScale/);
  assert.match(source, /y:\s*rawY/);
  assert.doesNotMatch(source, /const visibleY = clamp\(/);
  assert.match(source, /configured-function-plot-clip/);
  assert.match(source, /clipPath=\{`url\(#\$\{functionPlotClipId\}\)`\}/);
  assert.match(source, /<text x="64" y=\{y - 4\} textAnchor="end"/);
  assert.match(source, /<text x=\{origin\.x \+ 14\} y="52"/);
});

test("configured coordinate transformations project off-grid points to an explicit bounded edge indicator", () => {
  const branch = templateBranchAroundMarker("coordinate-transform", 'data-viz-name="user point"');

  assert.match(source, /clampPointToDiagramBounds\(sourceSvg, coordinateTransformFrame, 9\)/);
  assert.match(source, /clampPointToDiagramBounds\(targetSvg, coordinateTransformFrame, 9\)/);
  assert.match(source, /diagramOverflowIndicator\(sourceSvg, sourceVisible\.point\)/);
  assert.match(source, /diagramOverflowIndicator\(targetSvg, targetVisible\.point\)/);
  assert.match(branch, /data-viz-name="off-grid source point indicator"/);
  assert.match(branch, /data-viz-overflow-direction=\{sourceIndicator\.direction\}/);
  assert.match(branch, /\{`S\$\{sourceIndicator\.symbol\}`\}/);
  assert.match(branch, /Source point[\s\S]*continues beyond the visible grid/);
  assert.match(branch, /data-viz-clipped=\{String\(targetVisible\.clipped\)\}/);
  assert.match(branch, /data-viz-name="off-grid transformed point indicator"/);
  assert.match(branch, /data-viz-overflow-direction=\{targetIndicator\.direction\}/);
  assert.match(branch, /\{`T\$\{targetIndicator\.symbol\}`\}/);
  assert.match(branch, /Transformed point[\s\S]*continues beyond the visible grid/);
  assert.doesNotMatch(branch, /cx=\{targetSvg\.x\}/);
  assert.doesNotMatch(branch, /cy=\{targetSvg\.y\}/);
  assert.doesNotMatch(branch, /targetVisible\.point\.x > state\.origin\.x \? "→" : "←"/);
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

test("calculus tick and axis labels occupy gutters outside the plotted marks", () => {
  const frameBranch = templateBranchAroundMarker("calculus-rate-area", "const xTicks = [-4, -2, 0, 2, 4]");

  assert.match(frameBranch, /y=\{frame\.bottom \+ 18\} textAnchor="middle"/);
  assert.match(frameBranch, /x=\{frame\.left - 10\} y=\{mapFrameY\(tick\) \+ 4\} textAnchor="end"/);
  assert.match(frameBranch, /x=\{frame\.right \+ 18\} y=\{frame\.bottom \+ 18\}/);
  assert.match(frameBranch, /x=\{frame\.left - 30\} y=\{frame\.top \+ 8\} textAnchor="end"/);
  assert.doesNotMatch(frameBranch, /y=\{frame\.bottom - 8\}/);
  assert.doesNotMatch(frameBranch, /x=\{frame\.left \+ 10\} y=\{mapFrameY\(tick\) - 4\}/);

  const frame = { bottom: 286, left: 88, right: 552, top: 74 };
  const xTickLabelTop = frame.bottom + 18 - 12;
  const xAxisLabelRight = frame.right + 18 + 10;
  const yTickLabelRight = frame.left - 10;
  const yAxisLabelLeft = frame.left - 30 - 10;
  assert.ok(xTickLabelTop > frame.bottom, "x tick labels must clear curve and area-strip paint");
  assert.ok(xAxisLabelRight < 606, "x axis label must remain inside the panel");
  assert.ok(yTickLabelRight < frame.left, "y tick labels must clear curve and tangent paint");
  assert.ok(yAxisLabelLeft > 34, "y axis label must remain inside the panel");
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
  assert.match(source, /import type \{ ComponentType, ReactNode \} from "react";/);
  assert.match(source, /type ConfiguredVisualizationLabProps = \{[\s\S]*controlFooterAction\?: ReactNode;[\s\S]*lab\?: FeaturedLabDefinition \| null;/);
  assert.match(source, /threeDPresentation\?: ThreeDPresentation;/);
  assert.match(
    source,
    /function ConfiguredVisualizationLabSurface\(\{[\s\S]*threeDPresentation = "learner",[\s\S]*\}: ConfiguredVisualizationLabProps\)/
  );
  assert.match(source, /export function ConfiguredVisualizationLabDirect\(props: ConfiguredVisualizationLabProps\)/);
  assert.match(source, /<ConfiguredVisualizationLabSurface \{\.\.\.props\} threeDPresentation="learner" \/>/);
  assert.match(source, /<ThreeDLabCanvas[\s\S]*presentation=\{threeDPresentation\}/);
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
  assert.match(branch, /const transformedLabelPositions = coordinateTransformLabelPositions\([\s\S]*?state\.transformedSvg,[\s\S]*?state\.sourceSvg,[\s\S]*?mode === 1 \? state\.origin\.x \+ state\.reflectionLineX \* state\.scale\.x : null/);
  assert.match(branch, /data-viz-name="transformed vertex label"/);
  assert.match(branch, /data-viz-label-x=\{formatNumber\(labelPosition\.x, 2\)\}/);
  assert.match(branch, /textAnchor="middle"/);
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

test("early-primary shape names use a collision-free lane below every reachable polygon", () => {
  const branchStart = source.indexOf('if (templateId === "angle-geometry" && gradeBand === "early-primary")');
  assert.notEqual(branchStart, -1, "Missing early-primary angle-geometry branch");
  const branchEnd = source.indexOf('if (templateId === "angle-geometry")', branchStart + 1);
  assert.notEqual(branchEnd, -1, "Missing general angle-geometry branch after early-primary branch");
  const branch = source.slice(branchStart, branchEnd);

  assert.match(branch, /const shapeNameY = center\.y \+ size \+ 24 \+ \(mode === 2 \? 4 : 0\);/);
  assert.match(
    branch,
    /data-viz-name="shape name label"[\s\S]*?data-viz-size=\{size\}[\s\S]*?y=\{shapeNameY\}/
  );

  const centerY = 196;
  const panelBottom = 326;
  const summaryY = 344;
  for (let comparison = 0; comparison <= 10; comparison += 1) {
    const size = 48 + comparison * 5;
    for (let mode = 0; mode <= 2; mode += 1) {
      const cornerPaintRadius = (mode === 2 ? 11 : 7) + 1.5;
      const labelBaselineY = centerY + size + 24 + (mode === 2 ? 4 : 0);
      const conservativeLabelTop = labelBaselineY - 14;
      const conservativeLabelBottom = labelBaselineY + 4;

      assert.ok(
        conservativeLabelTop > centerY + size + cornerPaintRadius,
        `size ${size}, mode ${mode}: label must clear corner paint`
      );
      assert.ok(
        conservativeLabelBottom <= panelBottom,
        `size ${size}, mode ${mode}: label must remain inside the panel`
      );
      assert.ok(
        conservativeLabelBottom < summaryY,
        `size ${size}, mode ${mode}: label must remain above the summary`
      );
    }
  }
});
