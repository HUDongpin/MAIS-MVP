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
  // Narrow screens stack or use two columns; wider screens retain the
  // template-specific two/three-column layout.
  assert.match(
    source,
    /modeOptions\.length === 1[\s\S]*"grid-cols-1"[\s\S]*modeOptions\.length === 4[\s\S]*"grid-cols-1 min-\[360px\]:grid-cols-2"[\s\S]*"grid-cols-1 min-\[360px\]:grid-cols-2 min-\[768px\]:grid-cols-3"/
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
  assert.match(statisticsDistribution, /const meanX = rawMeanX/);
  assert.match(statisticsDistribution, /data-viz-raw-x=\{formatNumber\(rawMeanX, 1\)\}/);
  assert.match(statisticsDistribution, /data-viz-x=\{formatNumber\(meanX, 1\)\}/);
  assert.match(statisticsDistribution, /y=\{statisticsFrame\.summaryY\}/);
  assert.match(statisticsDistribution, /\{statisticsSummaryLabels\.mean\}[\s\S]*\{statisticsSummaryLabels\.spread\}/);
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
  assert.match(source, /import type \{[^}]*\bReactNode\b[^}]*\} from "react";/);
  assert.match(source, /type ConfiguredVisualizationLabProps = \{[\s\S]*controlFooterAction\?: ReactNode;[\s\S]*lab\?: FeaturedLabDefinition \| null;/);
  assert.match(source, /function ConfiguredVisualizationLabSurface\(\{ controlFooterAction, lab = null, labId, topicId \}: ConfiguredVisualizationLabProps\)/);
  assert.match(source, /export function ConfiguredVisualizationLabDirect\(props: ConfiguredVisualizationLabProps\)/);
  assert.match(source, /export function ConfiguredVisualizationLab\(\{ controlFooterAction, lab: providedLab = null, labId, topicId \}: ConfiguredVisualizationLabProps\)/);
  assert.match(source, /<div className="flex min-w-0 flex-col gap-4">[\s\S]*data-viz-reset-model[\s\S]*data-viz-lesson-action-slot/);
  assert.match(source, /data-viz-lesson-action-slot className="mt-auto pt-4"/);
});

test("configured visualization range sliders respond to input and change events", () => {
  assert.match(source, /function Slider\(/);
  assert.match(source, /aria-valuetext=\{displayValue\}/);
  assert.match(source, /onInput=\{\(event\) => onValue\(Number\(event\.currentTarget\.value\)\)\}/);
  assert.match(source, /onChange=\{\(event\) => onValue\(Number\(event\.currentTarget\.value\)\)\}/);
});

test("configured visualization controls reflow without clipping at narrow widths", () => {
  assert.match(source, /data-viz-mode-grid/);
  assert.match(source, /grid-cols-1 min-\[360px\]:grid-cols-2/);
  assert.match(source, /data-viz-mode-button[\s\S]{0,900}min-h-11 min-w-0 break-words/);

  assert.match(source, /data-viz-slider-heading/);
  assert.match(source, /data-viz-slider-label/);
  assert.match(source, /min-w-0 flex-1 break-words \[overflow-wrap:anywhere\]/);
  assert.match(source, /data-viz-slider-value/);
  assert.match(source, /shrink-0 tabular-nums/);
  assert.match(source, /type="range"[\s\S]{0,900}className="mt-2 h-11 w-full/);

  assert.match(source, /data-viz-coordinate-input-grid/);
  assert.match(source, /grid grid-cols-1 gap-2 min-\[360px\]:grid-cols-2/);
  assert.match(source, /type="number"[\s\S]{0,340}min-h-11/);
});

test("configured visualization title badge contains long Mainland formulas and remains auditable", () => {
  assert.match(source, /const titleBadgeMaxWidth = 456/);
  assert.match(source, /const titleBadgeHorizontalPadding = 40/);
  assert.match(source, /const titleBadgeEstimatedSafetyFactor = 1\.25/);
  assert.match(source, /textWidth \* titleBadgeEstimatedSafetyFactor \+ titleBadgeHorizontalPadding/);
  assert.match(source, /useLayoutEffect\(\(\) => \{/);
  assert.match(source, /getComputedTextLength\(\)/);
  assert.match(source, /getBBox\(\)\.width/);
  assert.match(source, /data-viz-title-badge-measurement/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /visibility="hidden"/);
  assert.doesNotMatch(source, /removeAttribute\("textLength"\)|removeAttribute\("lengthAdjust"\)/);
  assert.match(source, /measuredTitleBadgeTextWidth/);
  assert.match(source, /textLength=\{titleBadgeTextLength\}/);
  assert.match(source, /lengthAdjust=\{titleBadgeTextLength \? "spacingAndGlyphs" : undefined\}/);
  assert.doesNotMatch(source, /clamp\(textWidth \+ 40, 76, 340\)/);
  assert.match(source, /data-viz-title-badge/);
  assert.match(source, /data-viz-title-badge-label/);
  assert.doesNotMatch(source, /<g data-viz-overlap-ok>[\s\S]{0,260}titleBadgeLabel/);
});

test("configured 3D explicitly owns the learner presentation and localized loading copy", () => {
  assert.match(source, /function ThreeDLabRuntimeLoading\(\)/);
  assert.match(source, /en: "Loading 3D model\.\.\."[\s\S]{0,120}zh: "正在載入 3D 模型\.\.\."[\s\S]{0,120}zhHans: "正在加载 3D 模型\.\.\."/);
  assert.match(source, /loading: \(\) => <ThreeDLabRuntimeLoading \/>/);
  assert.match(source, /const threeDLoadingLabel = t\(/);
  assert.match(source, /<ThreeDLabCanvas[\s\S]{0,500}presentation="learner"/);
  assert.doesNotMatch(source, />\s*Loading 3D model\.\.\.\s*</);
});

test("configured SVG keeps educational text readable through a keyboard-accessible mobile pan surface", () => {
  assert.match(source, /data-viz-mobile-pan-hint/);
  assert.match(source, /data-viz-pan-hint/);
  assert.match(source, /const mobilePanHintId = useId\(\)/);
  assert.match(source, /const \[hasHorizontalOverflow, setHasHorizontalOverflow\] = useState\(false\)/);
  assert.match(source, /new ResizeObserver\(updateHorizontalOverflow\)/);
  assert.match(source, /aria-describedby=\{hasHorizontalOverflow \? mobilePanHintId : undefined\}/);
  assert.match(source, /hidden=\{!hasHorizontalOverflow\}/);
  assert.match(source, /aria-hidden="true">←<\/span>/);
  assert.doesNotMatch(source, /data-viz-mobile-pan-hint[\s\S]{0,260}sm:hidden/);
  assert.match(source, /data-viz-scroll-surface/);
  assert.match(source, /tabIndex=\{0\}/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /overscroll-x-contain/);
  assert.match(source, /min-w-\[640px\]/);
  assert.match(source, /data-viz-opaque-backdrop="surface"/);
  assert.match(source, /style=\{\{ backgroundColor: vizTheme\.svgBackground \}\}/);
  assert.match(source, /en: "Swipe or use arrow keys to explore the full model"/);
  assert.match(source, /zhHans: "左右滑动或使用方向键查看完整模型"/);
});

test("HK P3 fraction formula uses the opaque CSS surface without intersecting SVG backdrop painters", () => {
  assert.match(
    source,
    /semanticModel\?\.semanticFamily === "fraction-equivalence"[\s\S]*semanticModel\.variant === "p3-fractions-intro"/
  );
  assert.match(
    source,
    /data-viz-svg-backdrop-source=\{usesCssOnlySvgBackdrop \? "css" : "svg-paint"\}/
  );
  assert.match(
    source,
    /!usesCssOnlySvgBackdrop \? \(\s*<rect width=\{width\} height=\{height\} fill=\{vizTheme\.svgBackground\} \/>/
  );
  assert.match(
    source,
    /!usesCssOnlySvgBackdrop \? \(\s*<rect x=\{panel\.x\} y=\{panel\.y\} width=\{panel\.width\} height=\{panel\.height\}/
  );
  assert.match(
    source,
    /!usesCssOnlySvgBackdrop \? \(\s*<rect data-viz-title-badge-background/
  );
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

test("Mainland composite and former catalog-scope labs render exact child strands", () => {
  assert.match(source, /resolveConfiguredVisualizationCompositeStrands/);
  assert.match(source, /const semanticCompositeStrands = useMemo\(/);
  assert.match(source, /const activeSemanticStrand = semanticCompositeStrands\?\.\[/);
  assert.match(source, /renderSemanticFamily\(activeSemanticStrand\.family, activeSemanticStrand\.variant\)/);
  assert.match(source, /data-viz-semantic-kind="composite"/);
  assert.match(source, /data-viz-composite-plan-size=\{semanticCompositeStrands\?\.length\}/);
  assert.match(source, /data-viz-math-state=\{JSON\.stringify\(/);
  assert.match(source, /data-viz-strand-grid/);
  assert.match(source, /data-viz-strand-button/);
  assert.match(source, /data-viz-strand-active=\{String\(semanticStrandIndex === index\)\}/);
  assert.match(source, /setSemanticStrandIndex\(index\);[\s\S]{0,260}applySemanticControlContract\(/);
  assert.match(source, /getConfiguredVisualizationSemanticControlContract\(strand\.family, strand\.variant\)/);
  assert.match(source, /applySemanticControlContract\(initialSemanticControlContract\);[\s\S]{0,360}setSemanticStrandIndex\(0\)/);
});

test("active family and composite child use one exact learner-control contract", () => {
  assert.match(source, /getConfiguredVisualizationSemanticControlContract/);
  assert.match(source, /const activeSemanticFamily = activeSemanticStrand\?\.family \?\? semanticModel\?\.semanticFamily/);
  assert.match(source, /getConfiguredVisualizationSemanticControlContract\(activeSemanticFamily, activeSemanticVariant, mode\)/);
  assert.match(source, /const activeSemanticMode = activeSemanticControlContract\?\.modes\.find/);
  assert.match(source, /const semanticModeLabel = activeSemanticMode \? text\(activeSemanticMode\.label\) : undefined/);
  assert.match(source, /const initialSemanticMode = initialSemanticControlContract\?\.modes\[0\]\?\.value \?\? 0/);
  assert.match(source, /const \[mode, setMode\] = useState\(initialSemanticMode\)/);
  assert.match(source, /setMode\(initialSemanticMode\)/);
  assert.match(source, /modeOptions\.length > 1/);
  assert.match(source, /data-viz-mode-id=\{option\.id\}/);
  assert.match(source, /data-viz-mode-value=\{option\.value\}/);
  assert.match(source, /activeSemanticControlContract\?\.sliders \?\? \[\]\)\.map/);
  assert.match(source, /data-viz-semantic-slider-input=\{control\.id\}/);
  assert.match(source, /data-viz-semantic-slider-role=\{control\.role\}/);
  assert.match(source, /supportsConfiguredSemanticSecondaryDisplayProjection\(activeSemanticFamily\)/);
  assert.match(source, /formatConfiguredSemanticSecondaryDisplayValue\(/);
  assert.match(source, /setSemanticSliderValue\([\s\S]{0,180}snapConfiguredControlValue/);
  assert.doesNotMatch(source, /configuredSemanticPrimaryControlRequirements/);
  assert.doesNotMatch(source, /configuredSemanticSecondaryRequiredModeCount/);
});

test("configured labs expose stable language-independent model, state, parameter, mode, and reset selectors", () => {
  assert.match(source, /const configuredVisualizationModuleId = "configured-visualization-lab"/);
  assert.match(source, /const configuredModuleId = configuredVisualizationModuleId/);
  assert.match(source, /const configuredTopicId = lab\?\.labId \?\? labId \?\? topicId \?\? lab\?\.topicId \?\? "configured-visualization"/);
  assert.match(source, /data-viz-configured-module=\{configuredModuleId\}/);
  assert.match(source, /data-viz-configured-topic=\{configuredTopicId\}/);
  assert.match(source, /data-viz-configured-model=\{templateId\}/);
  assert.match(source, /data-viz-configured-model=\{templateId\}[\s\S]{0,220}data-viz-range-domain-id=\{activeSemanticControlContract\?\.stateDomain\.id\}/);
  assert.match(source, /data-viz-semantic-family=\{semanticModel\?\.semanticFamily\}/);
  assert.match(source, /data-viz-surface-model=\{templateId\}/);
  assert.match(source, /data-viz-surface-state=\{JSON\.stringify\(configuredMachineState\)\}/);
  assert.match(source, /deriveConfiguredVisualizationMachineState\([\s\S]*mode: modelMode/);
  assert.match(source, /data-viz-configured-state=\{JSON\.stringify\(configuredMachineState\)\}/);
  assert.match(source, /data-viz-mode=\{visibleMode\}/);
  assert.match(source, /data-viz-renderer-mode=\{modelMode\}/);
  assert.match(source, /data-viz-mode=\{mode\}/);
  assert.match(source, /data-viz-mode=\{option\.value\}/);
  assert.match(source, /\sparameter=\{control\.id\}/);
  assert.match(source, /<input[\s\S]{0,420}data-viz-parameter=\{parameter\}/);
  assert.match(source, /data-viz-parameter="value"/);
  assert.match(source, /data-viz-parameter="comparison"/);
  assert.match(source, /data-viz-reset-module-id=\{configuredModuleId\}/);
  assert.match(source, /data-viz-reset-topic-id=\{configuredTopicId\}/);
  assert.equal(
    [...source.matchAll(/data-viz-configured-model=/g)].length,
    1,
    "one configured lab must expose exactly one machine-model owner"
  );
  assert.equal(
    [...source.matchAll(/data-viz-configured-state=/g)].length,
    1,
    "one configured lab must expose exactly one serialized-state owner"
  );
  assert.equal(
    [...source.matchAll(/data-viz-reset-module-id=/g)].length,
    1,
    "the actionable reset control must be the sole reset module-identity owner"
  );
  assert.equal(
    [...source.matchAll(/data-viz-reset-topic-id=/g)].length,
    1,
    "the actionable reset control must be the sole reset topic-identity owner"
  );
});

test("Hong Kong pass-through labs use the shared semantic model and expose exact derived reset state", () => {
  assert.match(
    source,
    /!isMainlandVisualizationLab\(lab\) && lab\.curriculumTrack !== "HK"/
  );
  assert.match(source, /function deriveConfiguredVisualizationMachineState/);
  assert.match(source, /data-viz-configured-state=\{JSON\.stringify\(configuredMachineState\)\}/);
  assert.match(source, /variant === "p2-multiplication-foundations"[\s\S]*area: primaryState\.product/);
  assert.match(
    source,
    /variant === "p3-fractions-intro"[\s\S]*controllerValue: value[\s\S]*eqDen: primaryState\.resultDenominator[\s\S]*eqNum: primaryState\.resultNumerator[\s\S]*equivalentDenominator: primaryState\.resultDenominator[\s\S]*equivalentNumerator: primaryState\.resultNumerator[\s\S]*value: primaryState\.numerator \/ primaryState\.denominator/
  );
  assert.match(source, /variant === "advanced-functions"[\s\S]*family: metrics\.primaryFamily[\s\S]*scale: metrics\.scaleParameter/);
  assert.match(source, /variant === "calculus"[\s\S]*approximateArea: metrics\.midpointApproximation[\s\S]*exactArea: metrics\.exactIntegral/);
});

test("versioned dynamic domains project live bounds and values for every affected semantic control", () => {
  assert.match(source, /projectConfiguredVisualizationSemanticControlState\(/);
  assert.match(source, /activeSemanticProjection\.bounds\[control\.id\]/);
  assert.match(source, /activeSemanticProjection\.values\.value/);
  assert.match(source, /activeSemanticProjection\.values\.comparison/);
  assert.match(source, /data-viz-range-domain-id=\{activeSemanticControlContract\?\.stateDomain\.id\}/);
  assert.match(source, /data-viz-range-domain-version=\{activeSemanticControlContract\?\.stateDomain\.version\}/);
  assert.match(source, /data-viz-range-domain-affected-controls/);
  assert.match(source, /data-viz-range-domain-controller-inputs/);
  assert.match(source, /disabled=\{control\.disabled\}/);
  assert.match(source, /stateDomain\.id === "fraction-bar-numerator-v1"[\s\S]*input === "value"/);
  assert.match(source, /setComparison\(\(current\) => snapConfiguredControlValue\(current, 0, denominator, 1\)\)/);
  assert.match(source, /data-viz-range-affects=\{rangeAffects\}/);
  assert.match(source, /rangeProjection=\{isHongKongFractionController \? "clamp-max" : undefined\}/);
  assert.match(source, /rangeProjectionReason=\{isHongKongFractionController \? "numerator-cannot-exceed-denominator" : undefined\}/);
});

test("direct semantic labs never reuse a potentially unrelated legacy template formula badge", () => {
  assert.match(
    source,
    /const titleBadgeLabel = activeSemanticStrand[\s\S]*semanticModeLabel[\s\S]*semanticModel && lab[\s\S]*text\(lab\.category\)[\s\S]*usesPrimaryBarChartBadge[\s\S]*text\(formula\)/
  );
});

test("semantic SVG text never sits on the decorative template grid", () => {
  assert.match(
    source,
    /\{!semanticModel \? \([\s\S]{0,500}Array\.from\(\{ length: 8 \}[\s\S]{0,500}Array\.from\(\{ length: 5 \}/
  );
});
