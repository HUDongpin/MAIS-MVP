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
