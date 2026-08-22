import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import {
  hkPrimaryAveragesGraphProjection,
  hkPrimaryAveragesSeriesProjection,
  hkPrimaryBudgetBalance
} from "./hk/HKPrimaryVisualizationLab";
import { HK_PRIMARY_DEDICATED_LAB_IDS } from "./hk/hkVisualizationLabRegistry";
import { HK_VISUALIZATION_MATH_ORACLE_CONTRACTS } from "../../tests/e2e/hk-visualization-math-oracle-contract";

const sourcePath = "components/visualizations/hk/HKPrimaryVisualizationLab.tsx";
const source = fs.readFileSync(sourcePath, "utf8");
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const expectedModels = {
  "p1-counting-number-bonds": "CountingNumberBondsModel",
  "p1-addition-subtraction": "AdditionSubtractionModel",
  "p1-shapes-patterns": "ShapesPatternsModel",
  "p1-measurement-time": "MeasurementTimeModel",
  "p2-place-value": "PlaceValueModel",
  "p2-money-time": "MoneyTimeModel",
  "p2-length-data": "LengthDataModel",
  "p3-multiplication-division": "MultiplicationDivisionModel",
  "p3-measurement": "MeasurementUnitsModel",
  "p3-geometry-patterns": "GeometryPatternsModel",
  "p4-large-numbers": "FactorsMultiplesModel",
  "p4-decimals": "DecimalsModel",
  "p4-angles": "QuadrilateralCompositionModel",
  "p4-perimeter-area": "PerimeterAreaModel",
  "p5-fractions-operations": "FractionOperationsModel",
  "p5-volume": "VolumeModel",
  "p5-rates": "RatesModel",
  "p5-charts-averages": "CompositeChartsModel",
  "p6-percentages": "PercentagesModel",
  "p6-ratio-proportion": "AveragesLineGraphsModel",
  "p6-speed": "SpeedModel",
  "p6-pre-secondary-problem-solving": "ProblemSolvingModel"
} as const;

const expectedIds = Object.keys(expectedModels).sort();

function renderPrimaryInitialStatesWithStandardReactJsx() {
  const labIds = JSON.stringify(HK_PRIMARY_DEDICATED_LAB_IDS);
  const script = `
    import React from "react";
    globalThis.React = React;
    import { renderToStaticMarkup } from "react-dom/server";
    import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
    import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
    import { AppProviders } from "./components/providers/AppProviders.tsx";
    import { HKPrimaryVisualizationLab } from "./components/visualizations/hk/HKPrimaryVisualizationLab.tsx";

    const router = {
      back() {},
      forward() {},
      prefetch() { return Promise.resolve(); },
      push() {},
      refresh() {},
      replace() {}
    };
    const htmlByLab = Object.fromEntries(${labIds}.map((labId) => {
      const tree = React.createElement(
        AppRouterContext.Provider,
        { value: router },
        React.createElement(
          PathnameContext.Provider,
          { value: "/visualization-lab" },
          React.createElement(
            AppProviders,
            null,
            React.createElement(HKPrimaryVisualizationLab, { lab: { labId } })
          )
        )
      );
      return [labId, renderToStaticMarkup(tree)];
    }));
    process.stdout.write(JSON.stringify(htmlByLab));
  `;
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", script],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
      maxBuffer: 16 * 1024 * 1024
    }
  );

  assert.equal(
    result.status,
    0,
    `Standard React SSR child failed (${result.status ?? "signal"}):\n${result.stderr}`
  );
  return JSON.parse(result.stdout) as Record<string, string>;
}

function decodedHtmlAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  assert.ok(match, `Missing ${name} on ${tag.slice(0, 160)}.`);
  return match[1]
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function sliceBetween(startMarker: string, endMarker: string) {
  const start = code.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);

  const end = code.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing source marker after ${startMarker}: ${endMarker}`);
  return code.slice(start, end);
}

function functionBlock(functionName: string) {
  const signature = new RegExp(`(?:export\\s+)?function\\s+${functionName}\\s*\\(`, "m");
  const match = signature.exec(code);
  assert.ok(match, `Missing ${functionName}`);

  const start = match.index;
  const nextFunction = /\n(?:export\s+)?function\s+[A-Za-z0-9_]+\s*\(/g;
  nextFunction.lastIndex = start + match[0].length;
  const next = nextFunction.exec(code);
  return code.slice(start, next?.index ?? code.length);
}

function topLevelLabKeys(block: string) {
  return Array.from(
    block.matchAll(/^\s*"(p[1-6]-[^"]+)"\s*:\s*(?:\{|[A-Z][A-Za-z0-9_]*)/gm),
    (match) => match[1]
  );
}

function numericConstant(block: string, name: string) {
  const match = block.match(new RegExp(`const\\s+${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)\\s*;`));
  assert.ok(match, `Missing numeric constant ${name}`);
  return Number(match[1]);
}

test("primary dedicated registry contains exactly 22 unique Hong Kong P1-P6 ids", () => {
  const ids = [...HK_PRIMARY_DEDICATED_LAB_IDS];

  assert.equal(ids.length, 22);
  assert.equal(new Set(ids).size, 22, "Dedicated ids must not contain duplicates.");
  assert.deepEqual([...ids].sort(), expectedIds);
  assert.match(code, /from\s+"\.\/hkVisualizationLabRegistry"/);
});

test("all 22 SSR initial public states exactly equal the ordered math-oracle reset states", () => {
  const htmlByLab = renderPrimaryInitialStatesWithStandardReactJsx();
  const primaryOracleContracts = HK_VISUALIZATION_MATH_ORACLE_CONTRACTS.filter(
    ({ surface }) => surface === "primary-dedicated-v1"
  );
  assert.deepEqual(
    primaryOracleContracts.map(({ labId }) => labId),
    [...HK_PRIMARY_DEDICATED_LAB_IDS],
    "The independent oracle and production primary registry must cover the same ordered 22 labs."
  );

  for (const contract of primaryOracleContracts) {
    const markup = htmlByLab[contract.labId];
    assert.ok(markup, `Missing SSR markup for ${contract.labId}.`);
    const rootTag = markup.match(
      new RegExp(`<div(?=[^>]*data-hk-viz-model="primary-dedicated-v1")(?=[^>]*data-hk-viz-topic="${contract.labId}")[^>]*>`)
    )?.[0];
    assert.ok(rootTag, `Missing pre-effect primary root for ${contract.labId}.`);
    const publicState = JSON.parse(
      decodedHtmlAttribute(rootTag, "data-hk-viz-state")
    ) as Record<string, unknown>;
    assert.deepEqual(
      Object.keys(publicState),
      contract.state.canonicalKeys,
      `${contract.labId} initial public-state key order must equal its independent oracle reset key order.`
    );
    assert.deepEqual(
      publicState,
      contract.state.reset,
      `${contract.labId} SSR initial public state must equal its independent oracle reset before child effects.`
    );
  }
});

test("mathematical contracts and executable dispatcher cover the same 22 ids", () => {
  const contracts = sliceBetween(
    "export const HK_PRIMARY_VISUALIZATION_CONTRACTS = {",
    "} as const satisfies Record<HKPrimaryDedicatedLabId, HKPrimaryVisualizationContract>;"
  );
  const dispatcher = sliceBetween(
    "const HK_PRIMARY_DEDICATED_MODELS = {",
    "} as const satisfies Record<HKPrimaryDedicatedLabId, ComponentType<DedicatedModelProps>>;"
  );

  assert.deepEqual(topLevelLabKeys(contracts).sort(), expectedIds);
  assert.deepEqual(topLevelLabKeys(dispatcher).sort(), expectedIds);
  assert.match(code, /const\s+DedicatedModel\s*=\s*HK_PRIMARY_DEDICATED_MODELS\[lab\.labId\]/);
  assert.match(code, /<DedicatedModel\s+controlFooterAction=\{controlFooterAction\}\s*\/>/);

  for (const [labId, componentName] of Object.entries(expectedModels)) {
    assert.match(dispatcher, new RegExp(`"${labId}"\\s*:\\s*${componentName}`));
    const model = functionBlock(componentName);
    assert.match(model, new RegExp(`labId="${labId}"`));
    assert.match(model, /summary=/, `${labId} must expose a live summary through ModelShell.`);
    assert.match(model, /<ResetButton\b/, `${labId} must expose its model reset.`);
  }
});

test("SVG frame keeps a focusable 640px learner surface inside local horizontal overflow", () => {
  const frame = functionBlock("SvgFrame");

  assert.match(frame, /data-viz-pan-hint/);
  assert.match(frame, /data-viz-scroll-container/);
  assert.match(frame, /aria-describedby=\{panHintId\}/);
  assert.match(frame, /tabIndex=\{0\}/);
  assert.match(frame, /className="[^"]*overflow-x-auto[^"]*"/);
  assert.doesNotMatch(
    frame,
    /\bsm:hidden\b/,
    "The pan hint must remain visible whenever this fixed-width SVG can overflow its local scrollport.",
  );
  assert.match(frame, /viewBox=\{`0 0 640 \$\{height\}`\}/);
  assert.match(frame, /className="[^"]*min-w-\[640px\][^"]*"/);
});

test("long primary formulas expose a focusable local scroller and localized pan hint", () => {
  const shell = functionBlock("ModelShell");

  assert.match(shell, /const\s+formulaPanHintId\s*=\s*useId\(\)/);
  assert.match(shell, /data-viz-formula-pan-hint/);
  assert.match(shell, /data-viz-formula-scroll-container/);
  assert.match(shell, /aria-describedby=\{formulaPanHintId\}/);
  assert.match(shell, /tabIndex=\{0\}/);
});

test("dependent primary mode groups declare their owning group explicitly", () => {
  const buttons = sliceBetween("function ModeButtons", "function ResetButton");
  const lengthData = functionBlock("LengthDataModel");
  const geometry = functionBlock("GeometryPatternsModel");

  assert.match(buttons, /dependsOnGroupId\?:\s*string/);
  assert.match(buttons, /data-viz-mode-depends-on=\{dependsOnGroupId\}/);
  assert.match(lengthData, /groupId="tool"[\s\S]*?dependsOnGroupId="target"/);
  assert.match(geometry, /groupId="shape-example"[\s\S]*?dependsOnGroupId="shape-family"/);
});

test("intentional primary mark-label overlaps use exact conditional two-member owners", () => {
  const counting = functionBlock("CountingNumberBondsModel");
  const measurement = functionBlock("MeasurementTimeModel");
  const placeValue = functionBlock("PlaceValueModel");
  const money = functionBlock("MoneyTimeModel");
  const lengthData = functionBlock("LengthDataModel");
  const multiplication = functionBlock("MultiplicationDivisionModel");
  const measurementUnits = functionBlock("MeasurementUnitsModel");
  const geometry = functionBlock("GeometryPatternsModel");
  const factors = functionBlock("FactorsMultiplesModel");
  const angles = functionBlock("QuadrilateralCompositionModel");
  const rates = functionBlock("RatesModel");
  const percentages = functionBlock("PercentagesModel");
  const averages = functionBlock("AveragesLineGraphsModel");
  const problem = functionBlock("ProblemSolvingModel");
  const ownerIds = Array.from(code.matchAll(/data-viz-overlap-ok=/g));
  const reasons = Array.from(code.matchAll(/data-viz-overlap-reason=/g));
  const markMembers = Array.from(code.matchAll(/data-viz-overlap-member="mark"/g));
  const labelMembers = Array.from(code.matchAll(/data-viz-overlap-member="label"/g));

  assert.equal(ownerIds.length, 39, "Only the 39 audited primary mark-label owner templates may declare overlap exemptions.");
  assert.equal(reasons.length, 39, "Every overlap owner needs one non-empty reason.");
  assert.equal(markMembers.length, 39, "Every overlap owner template needs exactly one explicit mark member.");
  assert.equal(labelMembers.length, 39, "Every overlap owner template needs exactly one explicit label member.");
  assert.match(counting, /data-viz-overlap-ok="label-inside-own-whole-node"/);
  assert.match(counting, /data-viz-overlap-ok="label-inside-own-known-part-node"/);
  assert.match(counting, /data-viz-overlap-ok="label-inside-own-missing-part-node"/);
  assert.match(measurement, /data-viz-overlap-ok="label-inside-own-length-bar"/);
  assert.match(measurement, /data-viz-overlap-ok="label-inside-own-reference-bar"/);
  assert.match(counting, /data-viz-overlap-reason="The total label is intentionally centered inside its own whole node\."/);
  assert.match(counting, /data-viz-overlap-reason="The known-part label is intentionally centered inside its own part node\."/);
  assert.match(counting, /data-viz-overlap-reason="The missing-part label is intentionally centered inside its own part node\."/);
  assert.match(measurement, /data-viz-overlap-reason="The length label is intentionally centered inside its own measured-length bar\."/);
  assert.match(measurement, /data-viz-overlap-reason="The reference label is intentionally centered inside its own comparison bar\."/);
  assert.match(placeValue, /data-viz-overlap-ok="label-inside-own-thousand-cube"/);
  assert.ok(placeValue.includes('data-viz-overlap-ok={`label-inside-own-${column.key}-column`}'));
  assert.ok(placeValue.includes('data-viz-overlap-ok={`label-inside-own-${column.key}-digit-node`}'));
  assert.match(money, /data-viz-overlap-ok="label-inside-own-hk-dollar-note"/);
  assert.match(money, /data-viz-overlap-ok=\{priceSegmentWidth\s*>=\s*72\s*\?\s*"label-inside-own-price-segment"\s*:\s*undefined\}/);
  assert.match(money, /data-viz-overlap-ok=\{changeSegmentWidth\s*>=\s*82\s*\?\s*"label-inside-own-change-segment"\s*:\s*undefined\}/);
  assert.doesNotMatch(money, /<rect data-viz-mark data-viz-name="payment-bar"/);
  assert.match(lengthData, /data-viz-overlap-ok="label-inside-own-tool-status-card"/);
  assert.match(multiplication, /data-viz-overlap-ok="label-inside-own-total-tray"/);
  assert.match(measurementUnits, /data-viz-overlap-ok="label-inside-own-small-unit-node"/);
  assert.match(measurementUnits, /data-viz-overlap-ok="label-inside-own-large-unit-node"/);
  assert.match(geometry, /data-viz-overlap-ok="label-inside-own-shape-property-card"/);
  assert.match(factors, /data-viz-overlap-ok=\{`label-inside-own-factor-pair-\$\{left\}-\$\{right\}`\}/);
  assert.match(factors, /data-viz-overlap-ok="label-inside-own-number-classification-card"/);
  assert.match(factors, /data-viz-overlap-ok="label-inside-own-remainder-test-card"/);
  assert.match(factors, /data-viz-overlap-ok=\{`label-inside-own-\$\{row\.id\}-factor-\$\{factor\}`\}/);
  for (const family of ["parallelogram", "rectangle", "rhombus", "square"]) {
    assert.match(angles, new RegExp(`data-viz-overlap-ok="label-inside-own-${family}-family-node"`));
  }
  assert.match(rates, /data-viz-overlap-ok="label-inside-own-unit-price-card"/);
  assert.match(percentages, /data-viz-overlap-ok="label-inside-own-fraction-value-node"/);
  assert.match(percentages, /data-viz-overlap-ok="label-inside-own-decimal-value-node"/);
  assert.match(percentages, /data-viz-overlap-ok="label-inside-own-percent-value-card"/);
  assert.match(percentages, /data-viz-overlap-ok="label-inside-own-base-value-card"/);
  assert.match(percentages, /data-viz-overlap-ok="label-inside-own-change-value-card"/);
  assert.match(percentages, /data-viz-overlap-ok="label-inside-own-given-change-formula-card"/);
  assert.match(averages, /data-viz-overlap-ok="label-inside-own-fair-share-mean-card"/);
  assert.match(problem, /data-viz-overlap-ok=\{itemWidth\s*>\s*80\s*\?\s*"label-inside-own-item-segment"\s*:\s*undefined\}/);
  assert.match(problem, /data-viz-overlap-ok=\{extraWidth\s*>\s*66\s*\?\s*"label-inside-own-extra-segment"\s*:\s*undefined\}/);
  assert.match(problem, /data-viz-overlap-ok=\{remainderWidth\s*>\s*34\s*\?\s*"label-inside-own-remainder-segment"\s*:\s*undefined\}/);
  assert.match(problem, /data-viz-overlap-ok=\{`label-inside-own-strategy-node-\$\{index \+ 1\}`\}/);
  assert.match(problem, /data-viz-overlap-ok=\{`label-inside-own-calculation-card-\$\{index \+ 1\}`\}/);
  assert.match(problem, /data-viz-overlap-ok="label-inside-own-check-left-card"/);
  assert.match(problem, /data-viz-overlap-ok="label-inside-own-check-right-card"/);
  assert.doesNotMatch(problem, /<rect data-viz-mark data-viz-name="comparison-scale"/);
});

test("all 22 primary live formulas resolve LocalizedText and never reuse English prose in Chinese output", () => {
  const shell = functionBlock("ModelShell");
  const formulaAssignments = Array.from(
    code.matchAll(/\n\s+formula=\{([\s\S]*?)\}\n\s+summary=/g),
    (match) => match[1]
  );

  assert.equal(formulaAssignments.length, 22, "Every primary dedicated model must provide one localized formula.");
  assert.match(code, /type\s+ModelShellProps\s*=\s*\{[\s\S]*?formula:\s*LocalizedText;/);
  assert.match(code, /const\s+mathematicalFormula\s*=\s*\(value:\s*string\):\s*LocalizedText\s*=>\s*\(\{\s*en:\s*value,\s*zh:\s*value,\s*zhHans:\s*value\s*\}\)/);
  assert.match(shell, /\{t\(formula\)\}/);

  for (const construction of formulaAssignments) {
    assert.match(
      construction,
      /\b(?:localized|mathematicalFormula)\s*\(/,
      `Formula bypasses the localized formula constructors: ${construction.slice(0, 180)}`
    );
    if (/\b(?:unit|units|tiles|each|items|distance|remaining|overspend|opening)\b/i.test(construction)) {
      assert.match(construction, /\blocalized\s*\(/, `Formula prose must use localized(...): ${construction.slice(0, 180)}`);
      assert.match(construction, /[\u3400-\u9fff]/, `Localized formula prose must contain Chinese output: ${construction.slice(0, 180)}`);
    }
  }

  assert.match(code, /`\$\{length\}\s*×\s*1 unit = \$\{length\} units`[\s\S]*?`\$\{length\}\s*×\s*1 個單位 = \$\{length\} 個單位`[\s\S]*?`\$\{length\}\s*×\s*1 个单位 = \$\{length\} 个单位`/);
  assert.match(code, /`\$\{definition\.label\.en\}: \$\{sideCount\} sides · \$\{vertexCount\} vertices`[\s\S]*?`\$\{definition\.label\.zh\}：\$\{sideCount\} 條邊 · \$\{vertexCount\} 個頂點`[\s\S]*?`\$\{definition\.label\.zhHans \?\? definition\.label\.zh\}：\$\{sideCount\} 条边 · \$\{vertexCount\} 个顶点`/);
  assert.match(code, /`V = \$\{length\} × \$\{width\} × \$\{height\} = \$\{volume\} cubic units`[\s\S]*?`V = \$\{length\} × \$\{width\} × \$\{height\} = \$\{volume\} 個立方單位`[\s\S]*?`V = \$\{length\} × \$\{width\} × \$\{height\} = \$\{volume\} 个立方单位`/);
  assert.match(code, /`distance = \$\{speed\} km\/h × \$\{time\} h = \$\{distance\} km`[\s\S]*?`距離 = \$\{speed\} km\/h × \$\{time\} h = \$\{distance\} km`[\s\S]*?`路程 = \$\{speed\} km\/h × \$\{time\} h = \$\{distance\} km`/);
  assert.match(code, /`remaining = [^`]+`[\s\S]*?`餘款 = [^`]+`[\s\S]*?`余款 = [^`]+`/);
  assert.match(code, /`overspend = [^`]+`[\s\S]*?`超支 = [^`]+`[\s\S]*?`超支 = [^`]+`/);
});

test("primary base-ten learner copy follows the 十進制 and 數位 glossary", () => {
  assert.match(code, /"十進制積木和百、十、個數位表"/);
  assert.match(code, /"十进制积木和百、十、个数位表"/);
  assert.doesNotMatch(code, /十進位積木|十进位积木|百十個位值表|百十个位值表/);
});

test("P1 zero-step number-line state is stationary and has no directed jump branch", () => {
  const model = functionBlock("AdditionSubtractionModel");
  const conditional = model.slice(model.indexOf("{step > 0 ? ("));

  assert.match(model, /const\s+step\s*=\s*clamp\(rawStep,\s*0,\s*maximumStep\)/);
  assert.match(model, /controlId="start"[\s\S]*?min=\{0\}[\s\S]*?max=\{20\}/);
  assert.ok(conditional.indexOf('data-viz-name="directed-jump"') >= 0);
  assert.ok(conditional.indexOf('data-viz-name="jump-arrowhead"') >= 0);
  assert.ok(conditional.indexOf(") : (") > conditional.indexOf('data-viz-name="jump-arrowhead"'));
  assert.ok(conditional.indexOf('data-viz-name="stationary-point"') > conditional.indexOf(") : ("));
});

test("P1 number-bond endpoints include every non-negative whole through 20", () => {
  const model = functionBlock("CountingNumberBondsModel");

  assert.match(model, /controlId="total"[\s\S]*?min=\{0\}[\s\S]*?max=\{20\}/);
  assert.match(model, /controlId="knownPart"[\s\S]*?min=\{0\}[\s\S]*?max=\{total\}/);
});

test("P2 1000 state visibly regroups ten hundreds into one thousand", () => {
  const model = functionBlock("PlaceValueModel");

  assert.match(model, /const\s+isThousand\s*=\s*number\s*===\s*1000/);
  assert.match(model, /isThousand\s*\?\s*"10 × 100 = 1000"/);
  assert.match(model, /data-viz-name="thousand-regrouping"/);
  assert.match(model, /data-viz-name="regroup-hundreds"\s+data-viz-count="10"/);
  assert.match(model, /Array\.from\(\{\s*length:\s*10\s*\}/);
  assert.match(model, /data-viz-name="regroup-arrow"/);
  assert.match(model, /data-viz-name="thousand-cube"\s+data-viz-value="1000"/);
});

test("P2 length-data models metres and a strict one-icon-per-object pictogram, never a bar chart", () => {
  const model = functionBlock("LengthDataModel");

  assert.match(code, /type\s+LengthDataMode\s*=\s*"metres"\s*\|\s*"pictogram"/);
  assert.match(code, /type\s+MetreTool\s*=\s*"metre-ruler"\s*\|\s*"tape-measure"\s*\|\s*"trundle-wheel"/);
  assert.match(model, /data-viz-name="metre-measurement"/);
  assert.match(model, /data-viz-name="metre-reference"\s+data-viz-metres="1"\s+data-viz-centimetres="100"/);
  assert.match(model, /data-viz-name="estimate-line"/);
  assert.match(model, /data-viz-name="measured-line"/);
  assert.match(model, /data-viz-name="measuring-tool-choice"[\s\S]*?data-viz-expected-tool=\{definition\.expectedTool\}[\s\S]*?data-viz-suitable=\{String\(toolIsSuitable\)\}/);
  assert.match(model, /1 m = 100 cm/);
  assert.match(model, /data-viz-name="pictogram"/);
  assert.match(model, /data-viz-name="pictogram-category"[\s\S]*?data-viz-total=\{item\.count\}[\s\S]*?data-viz-one-icon-value="1"/);
  assert.match(model, /data-viz-name="pictogram-icon"\s+data-viz-icon-value="1"\s+data-viz-unit="object"/);
  assert.match(model, /data-viz-name="pictogram-key"\s+data-viz-one-icon-value="1"\s+data-viz-unit="object"/);
  assert.match(model, /1 icon = 1 object/);
  assert.match(model, /1 個圖示 = 1 件物件/);
  assert.match(model, /1 个图示 = 1 件物品/);
  for (const groupId of ["model", "target", "tool"]) assert.match(model, new RegExp(`groupId="${groupId}"`));
  assert.doesNotMatch(model, /bar-chart|bar-height|data-viz-name="data-bar"|icon\s*=\s*[2-9]|decimal metres|percentage/i);
});

test("P3 multiplication is a real rectangular array and division is a distinct equal-sharing view", () => {
  const model = functionBlock("MultiplicationDivisionModel");
  const contract = sliceBetween(
    '  "p3-multiplication-division": {',
    '  "p3-measurement": {'
  );
  const cellWidth = numericConstant(model, "arrayCellWidth");
  const cellHeight = numericConstant(model, "arrayCellHeight");

  assert.match(model, /const\s+arrayWidth\s*=\s*itemsPerGroup\s*\*\s*arrayCellWidth/);
  assert.match(model, /const\s+arrayHeight\s*=\s*groups\s*\*\s*arrayCellHeight/);
  assert.match(model, /mode\s*===\s*"multiply"\s*\?\s*\([\s\S]*?data-viz-name="multiplication-array"/);
  assert.match(model, /data-viz-rows=\{groups\}/);
  assert.match(model, /data-viz-columns=\{itemsPerGroup\}/);
  assert.match(model, /data-viz-name="multiplication-array-row"/);
  assert.match(model, /data-viz-name="multiplication-array-cell"/);
  assert.match(model, /data-viz-name="array-counter"/);
  assert.match(model, /\)\s*:\s*\([\s\S]*?data-viz-name="equal-sharing-groups"/);
  assert.match(model, /data-viz-name="equal-share-group"/);
  assert.match(model, /data-viz-name="shared-counter"/);
  assert.match(model, /"Array multiplication"[\s\S]*?"陣列乘法"[\s\S]*?"阵列乘法"/);
  assert.match(model, /"Equal sharing"[\s\S]*?"平均分"/);
  assert.doesNotMatch(model, /data-viz-name="equal-group"[\s\S]*?data-viz-name="array-counter"/);
  for (const objectId of ["multiplication-array", "array-counter", "equal-sharing-groups", "shared-counter", "total-tray"]) {
    assert.match(contract, new RegExp(`"${objectId}"`), `The total formula binding must name ${objectId}.`);
    assert.match(model, new RegExp(`data-viz-name="${objectId}"`), `The ${objectId} formula-bound mark must exist.`);
  }

  for (const groups of [2, 4, 8]) {
    for (const itemsPerGroup of [1, 3, 6]) {
      assert.equal(groups * itemsPerGroup, Array.from({ length: groups * itemsPerGroup }).length);
    }
  }

  const maxArrayWidth = 6 * cellWidth;
  const maxArrayHeight = 8 * cellHeight;
  const maxArrayLeft = 320 - maxArrayWidth / 2 - 12;
  const maxArrayRight = 320 + maxArrayWidth / 2 + 12;
  const maxArrayTop = 48 - 12;
  const maxArrayBottom = 48 + maxArrayHeight + 12;
  assert.ok(maxArrayLeft >= 20 && maxArrayRight <= 620, "The 8×6 array must fit the 640px canvas horizontally.");
  assert.ok(maxArrayTop >= 20 && maxArrayBottom < 294, "The 8×6 array frame must not collide with the total tray.");
});

test("P3 geometry renders concrete quadrilateral and triangle properties without angle, symmetry, or algebra routes", () => {
  const model = functionBlock("GeometryPatternsModel");

  assert.match(code, /type\s+P3ShapeFamily\s*=\s*"quadrilateral"\s*\|\s*"triangle"/);
  for (const shapeType of ["rectangle", "square", "parallelogram", "trapezium", "triangle-different", "triangle-two-equal", "triangle-three-equal"]) {
    assert.match(code, new RegExp(`(?:"${shapeType}"|${shapeType}):\\s*\\{`), `Missing concrete P3 shape ${shapeType}.`);
  }
  assert.match(model, /state=\{\{\s*shapeFamily,\s*shapeType\s*\}\}/);
  assert.match(model, /data-viz-name="shape-outline"/);
  assert.match(model, /data-viz-name="shape-side"/);
  assert.match(model, /data-viz-name="equal-side-marker"/);
  assert.match(model, /data-viz-name="parallel-side-marker"/);
  assert.match(model, /Array\.from\(\{\s*length:\s*equalGroup\s*\+\s*1\s*\}/);
  assert.match(model, /Array\.from\(\{\s*length:\s*parallelGroup\s*\+\s*1\s*\}/);
  assert.match(model, /data-viz-marker-count=\{equalGroup\s*\+\s*1\}/);
  assert.match(model, /data-viz-marker-count=\{parallelGroup\s*\+\s*1\}/);
  assert.match(model, /const\s+equalMarker\s*=\s*pointOnSegment\(point,\s*next,\s*0\.42\)/);
  assert.match(model, /const\s+parallelMarker\s*=\s*pointOnSegment\(point,\s*next,\s*0\.64\)/);
  assert.match(model, /parallelGroup\s*>=\s*0\s*\?\s*\(/);
  assert.match(model, /data-viz-name="shape-vertex"/);
  assert.match(model, /data-viz-name="shape-property-counts"/);
  assert.match(model, /data-viz-side-count=\{sideCount\}/);
  assert.match(model, /data-viz-vertex-count=\{vertexCount\}/);
  assert.match(model, /groupId="shape-family"/);
  assert.match(model, /groupId="shape-example"/);
  assert.doesNotMatch(model, /tileCount|2\s*\*\s*stage\s*\+\s*1|growing-pattern|pattern-tile|symmetry|corner-comparison|square-corner-reference|degree/i);
});

test("P4 factors model keeps complete pairs, zero-remainder tests, HCF, and least-positive LCM synchronized", () => {
  const model = functionBlock("FactorsMultiplesModel");

  assert.match(code, /function\s+positiveFactors\(value:\s*number\)[\s\S]*?value\s*%\s*candidate\s*===\s*0/);
  assert.match(code, /function\s+completeFactorPairs\(value:\s*number\)[\s\S]*?Math\.floor\(Math\.sqrt\(value\)\)[\s\S]*?value\s*\/\s*candidate/);
  assert.match(model, /const\s+remainder\s*=\s*firstNumber\s*%\s*safeDivisor/);
  assert.match(model, /const\s+commonFactors\s*=\s*firstFactors\.filter\(\(factor\)\s*=>\s*secondNumber\s*%\s*factor\s*===\s*0\)/);
  assert.match(model, /const\s+hcf\s*=\s*gcd\(firstNumber,\s*secondNumber\)/);
  assert.match(model, /const\s+lcm\s*=\s*\(firstNumber\s*\*\s*secondNumber\)\s*\/\s*hcf/);
  assert.match(model, /firstNumber\s*===\s*1\s*\?\s*"neither"/);
  for (const mark of ["factor-pair", "remainder-test", "common-factor", "hcf-marker", "common-multiple", "lcm-marker"]) {
    assert.match(model, new RegExp(`data-viz-name=(?:"${mark}"|\\{common \\? "${mark}")`), `Missing P4 mark ${mark}.`);
  }
  assert.doesNotMatch(model, /comparisonNumber|roundingPlace|large-number-comparison|nearest\s+(?:10|100|1000)/i);
});

test("P4 quadrilateral model keeps inclusions one-way and covers all three approved compositions", () => {
  const model = functionBlock("QuadrilateralCompositionModel");

  assert.match(model, /square\s+⊆\s+rectangle;\s+square\s+⊆\s+rhombus/);
  assert.doesNotMatch(model, /square\s+⊂\s+rectangle\s+∩\s+rhombus/);
  for (const [from, to] of [["rectangle", "parallelogram"], ["rhombus", "parallelogram"], ["square", "rectangle"], ["square", "rhombus"]]) {
    assert.match(model, new RegExp(`data-viz-from="${from}"\\s+data-viz-to="${to}"`));
  }
  assert.match(model, /rectangle-diagonal[\s\S]*?2 congruent right triangles/);
  assert.match(model, /square-diagonal[\s\S]*?2 congruent isosceles right triangles/);
  assert.match(model, /"trapeziums-rectangle"/);
  assert.match(model, /2 congruent right trapeziums → 1 rectangle/);
  assert.match(model, /data-viz-piece-count="2"\s+data-viz-congruent="true"/);
  assert.match(model, /const\s+equalMarker\s*=\s*pointOnSegment\(point,\s*next,\s*0\.42\)/);
  assert.match(model, /const\s+parallelMarker\s*=\s*pointOnSegment\(point,\s*next,\s*0\.64\)/);
  assert.match(model, /data-viz-name="equal-side-mark"[\s\S]*?data-viz-group-pattern=\{`\$\{equalGroup\}-ticks`\}[\s\S]*?cx=\{equalMarker\.x\s*\+/);
  assert.match(model, /data-viz-name="parallel-side-mark"[\s\S]*?x=\{markerX\s*-\s*5\}[\s\S]*?y=\{parallelMarker\.y\s*-\s*5\}/);
  assert.match(model, /data-viz-name="parallel-side-mark"[\s\S]*?stroke=\{theme\.axisStrong\}/);
  assert.match(model, /data-viz-group-pattern=\{`\$\{parallelGroup\}-diamonds`\}/);
  assert.match(model, /const\s+rightAngleCount\s*=\s*definition\.rightAngleCorners\.length/);
  assert.match(model, /state=\{\{\s*mode,\s*familyShape,\s*composition,\s*rightAngleCount\s*\}\}/);
  assert.match(model, /data-viz-name="right-angle-marks"[\s\S]*?data-viz-right-angle-count=\{rightAngleCount\}/);
  assert.match(model, /data-viz-name="right-angle-mark"[\s\S]*?data-viz-angle-kind="right"[\s\S]*?data-viz-corner=\{cornerIndex\s*\+\s*1\}/);
  assert.match(code, /tokenId:\s*"family-inclusion"[\s\S]*?objectIds:\s*\["quadrilateral-outline",\s*"equal-side-mark",\s*"parallel-side-mark",\s*"right-angle-mark",\s*"family-inclusion-map"\]/);
  assert.match(code, /parallelogram:[\s\S]*?rightAngleCorners:\s*\[\]/);
  assert.match(code, /rectangle:[\s\S]*?rightAngleCorners:\s*\[0,\s*1,\s*2,\s*3\]/);
  assert.match(code, /rhombus:[\s\S]*?rightAngleCorners:\s*\[\]/);
  assert.match(code, /square:[\s\S]*?rightAngleCorners:\s*\[0,\s*1,\s*2,\s*3\]/);
  assert.doesNotMatch(model, /angleClass|comparison-ray|fixed-square-corner|smaller than a right|larger than a right|\bdegrees?\b|°/i);
});

test("P5 fraction operations expose LCD-renamed source partitions and signed results", () => {
  const model = functionBlock("FractionOperationsModel");

  assert.match(model, /const\s+commonDenominator\s*=\s*termCount\s*===\s*"three"\s*\?\s*lcm\(commonTwo,\s*thirdDenominator\)\s*:\s*commonTwo/);
  assert.match(model, /commonNumerator:\s*firstCommon/);
  assert.match(model, /commonNumerator:\s*secondCommon/);
  assert.match(model, /commonNumerator:\s*thirdCommon/);
  assert.match(model, /const\s+commonPieceWidth\s*=\s*360\s*\/\s*commonDenominator/);
  assert.match(model, /Array\.from\(\{\s*length:\s*commonDenominator\s*\}/);
  assert.match(model, /data-viz-common-numerator=\{fraction\.commonNumerator\}/);
  assert.match(model, /data-viz-name="common-partition-part"/);
  assert.match(model, /const\s+resultNumerator\s*=\s*firstCommon\s*\+\s*sign\s*\*\s*secondCommon\s*\+\s*sign\s*\*\s*thirdCommon/);
  assert.match(model, /data-viz-name="signed-result-line"/);
  assert.match(model, /resultValue\s*>=\s*0\s*\?\s*semantic\.result\s*:\s*semantic\.attention/);
});

test("P5 volume uses a bounded isometric parallelogram and cube lattice", () => {
  const model = functionBlock("VolumeModel");
  const unitCube = functionBlock("UnitCube");
  const originX = numericConstant(model, "cubeOriginX");
  const originY = numericConstant(model, "cubeOriginY");
  const stepX = numericConstant(model, "cubeStepX");
  const stepY = numericConstant(model, "cubeStepY");
  const layerRise = numericConstant(model, "cubeLayerRise");
  const footprintOffset = Number(model.match(/const\s+footprintTopY\s*=\s*cubeOriginY\s*-\s*(\d+)/)?.[1]);
  const cubeSize = Number(unitCube.match(/size\s*=\s*(\d+)/)?.[1]);

  assert.ok(Number.isFinite(footprintOffset), "Missing footprint top offset.");
  assert.ok(Number.isFinite(cubeSize), "Missing UnitCube size.");
  assert.match(model, /cubeOriginX\s*\+\s*length\s*\*\s*cubeStepX/);
  assert.match(model, /cubeOriginX\s*\+\s*\(length\s*-\s*width\)\s*\*\s*cubeStepX/);
  assert.match(model, /footprintTopY\s*\+\s*\(length\s*\+\s*width\)\s*\*\s*cubeStepY/);
  assert.match(model, /cubeOriginX\s*-\s*width\s*\*\s*cubeStepX/);
  assert.match(model, /\(a\.row\s*\+\s*a\.column\)\s*-\s*\(b\.row\s*\+\s*b\.column\)/);

  const length = 5;
  const width = 4;
  const height = 4;
  const topY = originY - footprintOffset;
  const points = [
    { x: originX, y: topY },
    { x: originX + length * stepX, y: topY + length * stepY },
    { x: originX + (length - width) * stepX, y: topY + (length + width) * stepY },
    { x: originX - width * stepX, y: topY + width * stepY }
  ];
  const vector = (from: typeof points[number], to: typeof points[number]) => ({ x: to.x - from.x, y: to.y - from.y });

  assert.deepEqual(vector(points[0], points[1]), vector(points[3], points[2]));
  assert.deepEqual(vector(points[0], points[3]), vector(points[1], points[2]));
  for (const point of points) {
    assert.ok(point.x >= 20 && point.x <= 620, `Footprint x ${point.x} escapes the learner panel.`);
    assert.ok(point.y >= 20 && point.y <= 340, `Footprint y ${point.y} escapes the learner panel.`);
  }

  const cubeBounds = {
    left: originX - (width - 1) * stepX - cubeSize,
    right: originX + (length - 1) * stepX + cubeSize,
    top: originY - (height - 1) * layerRise - cubeSize * 1.08,
    bottom: originY + (length + width - 2) * stepY
  };
  assert.ok(cubeBounds.left >= 20 && cubeBounds.right <= 620);
  assert.ok(cubeBounds.top >= 20 && cubeBounds.bottom <= 340);
});

test("P5 rate displays preserve exact quotients before decimal approximations", () => {
  const helper = functionBlock("quotientDisplay");
  const model = functionBlock("RatesModel");

  assert.match(helper, /const\s+divisor\s*=\s*gcd\(numerator,\s*denominator\)/);
  assert.match(helper, /while\s*\(terminatingDenominator\s*%\s*2\s*===\s*0\)/);
  assert.match(helper, /while\s*\(terminatingDenominator\s*%\s*5\s*===\s*0\)/);
  assert.match(helper, /terminatingDenominator\s*===\s*1\s*\?\s*"="\s*:\s*"≈"/);
  assert.match(model, /unitPriceDisplay\s*=\s*quotientDisplay\(totalPrice,\s*itemCount,\s*"HK\$"\)/);
  assert.match(model, /targetPriceDisplay\s*=\s*quotientDisplay\(totalPrice\s*\*\s*targetCount,\s*itemCount,\s*"HK\$"\)/);
  assert.match(model, /data-viz-name="one-item-price"[\s\S]*?quotientDisplay\(totalPrice,\s*itemCount,\s*"HK\$"\)/);
  assert.doesNotMatch(model, /quotientDisplay\(totalPrice,\s*itemCount,\s*"\$"\)/);
  assert.match(model, /\$\{targetCount\}\s+items\s*=\s*\$\{targetPriceDisplay\}/);
  assert.doesNotMatch(model, /targetCount\} × HK\$\$\{formatDecimal\(unitPrice\)\} =/);
});

test("P5 composite chart has an equality state and a localized two-series legend", () => {
  const model = functionBlock("CompositeChartsModel");

  assert.match(model, /const\s+comparisonCopy\s*=\s*difference\s*===\s*0/);
  assert.match(model, /localized\("the two series are equal",\s*"兩組相同",\s*"两组相同"\)/);
  assert.match(model, /data-viz-name="series-legend"/);
  assert.match(model, /localized\("Series 1",\s*"第一組",\s*"第一组"\)/);
  assert.match(model, /localized\("Series 2",\s*"第二組",\s*"第二组"\)/);
  assert.match(model, /difference\s*===\s*0\s*\?\s*\([\s\S]*data-viz-name="equality-marker"/);
});

test("P6 averages model preserves one dataset across fair sharing, table, points, adjacent segments, and means", () => {
  const model = functionBlock("AveragesLineGraphsModel");
  const seriesProjection = functionBlock("hkPrimaryAveragesSeriesProjection");
  const graphProjection = functionBlock("hkPrimaryAveragesGraphProjection");

  assert.match(seriesProjection, /const\s+seriesB\s*=\s*seriesA\.map\(\(value\)\s*=>\s*value\s*\+\s*seriesBShift\)/);
  assert.match(seriesProjection, /const\s+totalA\s*=\s*seriesA\.reduce/);
  assert.match(seriesProjection, /const\s+meanA\s*=\s*totalA\s*\/\s*seriesA\.length/);
  assert.match(graphProjection, /hkPrimaryAveragesSeriesProjection\(values,\s*seriesBShift\)/);
  assert.match(graphProjection, /segmentsA:\s*segmentsFor\(pointsA\)/);
  assert.match(graphProjection, /segmentsB:\s*segmentsFor\(pointsB\)/);
  assert.match(model, /hkPrimaryAveragesGraphProjection\([\s\S]*?\[value1,\s*value2,\s*value3,\s*value4\][\s\S]*?seriesBShift/);
  assert.match(model, /data-viz-name="mean-fair-share"[\s\S]*?data-viz-total=\{totalA\}[\s\S]*?data-viz-count="4"/);
  assert.match(model, /data-viz-name="broken-line-graph"[\s\S]*?data-viz-extrapolation="none"/);
  assert.match(model, /data-viz-series-coincident=\{seriesCount\s*===\s*2\s*\?\s*String\(seriesCoincident\)\s*:\s*undefined\}/);
  assert.match(model, /data-viz-y-min="0"\s+data-viz-y-max="14"\s+data-viz-y-interval="2"/);
  assert.match(model, /segmentsA\.map[\s\S]*?data-viz-name="adjacent-line-segment"[\s\S]*?data-viz-series="A"[\s\S]*?data-viz-from-value=\{segment\.fromValue\}/);
  assert.match(model, /segmentsB\.map[\s\S]*?data-viz-name="adjacent-line-segment"[\s\S]*?data-viz-series="B"[\s\S]*?data-viz-to-value=\{segment\.toValue\}/);
  assert.match(model, /data-viz-name="series-point"[\s\S]*?data-viz-value=\{point\.value\}/);
  assert.match(model, /data-viz-name="data-table-row"[\s\S]*?data-viz-series-a=\{row\.seriesA\}/);
  assert.match(model, /data-viz-name="series-mean-readout"/);
  assert.match(model, /data-viz-series-means-equal=\{seriesCount\s*===\s*2\s*\?\s*String\(seriesMeansEqual\)\s*:\s*undefined\}/);
  assert.match(model, /controlId="seriesBShift"[\s\S]*?min=\{0\}[\s\S]*?max=\{2\}/);
  assert.match(model, /localized\("Series B offset",\s*"數列 B 偏移量",\s*"数列 B 偏移量"\)/);
  assert.doesNotMatch(model, /Series B positive offset|數列 B 正偏移量|数列 B 正偏移量/);
  assert.match(model, /const\s+graphTopY\s*=\s*HK_PRIMARY_AVERAGES_GRAPH_TOP_Y/);
  assert.match(model, /y2=\{graphTopY\}/);
  assert.match(model, /const\s+fairShareBaselineY\s*=\s*304/);
  assert.match(model, /const\s+fairShareUnitSpacing\s*=\s*18/);
  assert.match(model, /cy=\{fairShareY\(item\s*\+\s*1\)\}/);
  assert.match(model, /y1=\{fairShareY\(meanA\)\}\s+y2=\{fairShareY\(meanA\)\}/);
  const graphTopY = 34;
  const graphBottomY = 276;
  const graphY = (value: number) => graphBottomY - (value / 14) * (graphBottomY - graphTopY);
  const fairShareY = (value: number) => 304 - value * 18;
  assert.equal(graphY(14), graphTopY, "The y-axis must reach its declared 14°C maximum.");
  assert.ok(graphY(14) - 8 - 1.5 >= 18, "A maximum point and its stroke must stay inside the 18px panel boundary.");
  assert.ok(fairShareY(12) >= 76, "Twelve fair-share units must stay inside the stack body and below the mean badge.");
  assert.equal(fairShareY(0), 304, "A zero fair share belongs on the stack baseline.");
  assert.doesNotMatch(model, /seriesA\.map\(\(value\)\s*=>\s*clamp\(/);
  assert.doesNotMatch(model, /firstTerm|secondTerm|scaleFactor|ratio-bars|one-unit-row|scaled-ratio-row/i);
  assert.doesNotMatch(model, /fill=\{semantic\.(?:main|change|attention)\}\s+fontSize="(?:12|13|14|15|16)"/);
});

test("P6 series B zero offset preserves coincident values and equal means", () => {
  const projection = hkPrimaryAveragesGraphProjection([4, 8, 6, 10], 0);
  assert.deepEqual(projection.seriesA, [4, 8, 6, 10]);
  assert.deepEqual(projection.seriesB, projection.seriesA);
  assert.equal(projection.meanA, 7);
  assert.equal(projection.meanB, projection.meanA);
  assert.equal(projection.seriesCoincident, true);
  assert.equal(projection.seriesMeansEqual, true);
  assert.deepEqual(projection.pointsB, projection.pointsA);
  assert.deepEqual(projection.segmentsB, projection.segmentsA);
  assert.deepEqual(
    projection.tableRows.map(({ seriesA, seriesB }) => [seriesA, seriesB]),
    [[4, 4], [8, 8], [6, 6], [10, 10]]
  );
});

test("P6 positive series B shift moves every table value, point, segment, and mean by the exact graph scale", () => {
  const projection = hkPrimaryAveragesGraphProjection([4, 8, 6, 10], 2);
  const expectedYOffset = -(2 / 14) * (276 - 34);

  assert.deepEqual(projection.seriesB, [6, 10, 8, 12]);
  assert.equal(projection.meanB, projection.meanA + 2);
  assert.equal(projection.seriesCoincident, false);
  assert.equal(projection.seriesMeansEqual, false);
  projection.pointsA.forEach((pointA, index) => {
    const pointB = projection.pointsB[index];
    assert.equal(pointB.hour, pointA.hour);
    assert.equal(pointB.value, pointA.value + 2);
    assert.equal(pointB.x, pointA.x);
    assert.ok(Math.abs((pointB.y - pointA.y) - expectedYOffset) <= 1e-12);
  });
  projection.segmentsA.forEach((segmentA, index) => {
    const segmentB = projection.segmentsB[index];
    assert.equal(segmentB.fromHour, segmentA.fromHour);
    assert.equal(segmentB.toHour, segmentA.toHour);
    assert.equal(segmentB.fromValue, segmentA.fromValue + 2);
    assert.equal(segmentB.toValue, segmentA.toValue + 2);
    assert.equal(segmentB.x1, segmentA.x1);
    assert.equal(segmentB.x2, segmentA.x2);
    assert.ok(Math.abs((segmentB.y1 - segmentA.y1) - expectedYOffset) <= 1e-12);
    assert.ok(Math.abs((segmentB.y2 - segmentA.y2) - expectedYOffset) <= 1e-12);
  });
  assert.ok(Math.abs((projection.meanLineB.y - projection.meanLineA.y) - expectedYOffset) <= 1e-12);
  assert.ok(projection.pointsB.some((point, index) => point.y !== projection.pointsA[index].y));
  assert.ok(projection.segmentsB.some((segment, index) => segment.y1 !== projection.segmentsA[index].y1));
});

test("P5 composite-chart serialized state contains every learner-edited category", () => {
  const model = functionBlock("CompositeChartsModel");
  const contract = sliceBetween(
    '"p5-charts-averages": {',
    '"p6-percentages": {',
  );

  assert.match(model, /state=\{\{\s*selectedCategory,\s*firstSeries,\s*secondSeries\s*\}\}/);
  assert.doesNotMatch(model, /state=\{\{\s*selectedCategory,\s*firstSeriesValue:/);
  assert.match(
    contract,
    /stateKeys:\s*\["selectedCategory",\s*"firstSeries",\s*"secondSeries"\]/,
  );
  assert.doesNotMatch(
    contract,
    /stateKeys:[^\n]*firstSeriesValue|stateKeys:[^\n]*secondSeriesValue/,
  );
});

test("P6 given-percent change keeps zero and narrow segment values in separate fixed readouts", () => {
  const model = functionBlock("PercentagesModel");

  assert.match(model, /data-viz-name="zero-base-marker"/);
  assert.match(model, /data-viz-name="zero-change-marker"/);
  assert.match(model, /data-viz-name="zero-base-marker"[\s\S]*?cy="128"[\s\S]*?stroke=\{theme\.axisStrong\}/);
  assert.match(model, /data-viz-name="zero-change-marker"[\s\S]*?data-viz-marker-shape="diamond"[\s\S]*?stroke=\{theme\.axisStrong\}/);
  assert.match(model, /data-viz-name="given-change-values"/);
  assert.match(model, /data-viz-name="base-value-readout"[\s\S]*?x="205"[\s\S]*?y="205"/);
  assert.match(model, /data-viz-name="change-value-readout"[\s\S]*?x="455"[\s\S]*?y="205"/);
  assert.match(model, /data-viz-name="final-value-readout"[\s\S]*?x="320"[\s\S]*?y="278"/);
  assert.doesNotMatch(model, /<text\s+x=\{124\s*\+\s*baseWidth\s*\/\s*2\}\s+y="142"/);
  assert.doesNotMatch(model, /<text\s+x=\{124\s*\+\s*(?:baseWidth|finalWidth)\s*\+\s*changeWidth\s*\/\s*2\}\s+y="142"/);
});

test("P6 speed binds distance, graph rise, and journey point to d = speed times time", () => {
  const model = functionBlock("SpeedModel");

  assert.match(model, /const\s+distance\s*=\s*speed\s*\*\s*time/);
  assert.match(model, /distance\s*=\s*\$\{speed\}\s*km\/h\s*×\s*\$\{time\}\s*h\s*=\s*\$\{distance\}\s*km/);
  assert.match(model, /data-viz-name="gradient-triangle"\s+data-viz-run=\{time\}\s+data-viz-rise=\{distance\}/);
  assert.match(model, /data-viz-name="journey-point"\s+data-viz-time=\{time\}\s+data-viz-distance=\{distance\}/);
});

test("P6 budget model uses non-negative remaining, positive overspend, and the correct identities", () => {
  const model = functionBlock("ProblemSolvingModel");
  const balance = functionBlock("hkPrimaryBudgetBalance");

  assert.match(balance, /const\s+totalSpending\s*=\s*itemCost\s*\+\s*extraCost/);
  assert.match(balance, /const\s+remaining\s*=\s*budget\s*-\s*totalSpending/);
  assert.match(balance, /const\s+withinBudget\s*=\s*remaining\s*>=\s*0/);
  assert.match(balance, /const\s+overspend\s*=\s*Math\.max\(0,\s*-remaining\)/);
  assert.match(model, /hkPrimaryBudgetBalance\(\{[\s\S]*?budget,[\s\S]*?count,[\s\S]*?unitPrice,[\s\S]*?extraCost[\s\S]*?\}\)/);
  assert.match(model, /const\s+budgetWidth\s*=\s*\(barWidth\s*\*\s*budget\)\s*\/\s*absoluteTotal/);
  assert.match(model, /data-viz-name="budget-marker"/);
  assert.match(model, /data-viz-name="bar-over-budget"\s+data-viz-overspend=\{overspend\}/);
  assert.match(model, /overspend\s*=\s*\(?\$\{count\}\s*×\s*\$\{unitPrice\}\)?[\s\S]*\$\{extraCost\}[\s\S]*\$\{budget\}[\s\S]*\$\{overspend\}/);
  assert.match(model, /data-viz-left=\{withinBudget\s*\?\s*totalSpending\s*\+\s*remaining\s*:\s*budget\s*\+\s*overspend\}/);
  assert.match(model, /data-viz-right=\{withinBudget\s*\?\s*budget\s*:\s*totalSpending\}/);
  assert.doesNotMatch(model, /itemCost\s*\+\s*extraCost\s*\+\s*remaining/);
});

test("P6 budget balance keeps exact-budget zero in the remaining branch and overspend strictly positive", () => {
  assert.deepEqual(hkPrimaryBudgetBalance({ budget: 50, count: 5, unitPrice: 10, extraCost: 0 }), {
    itemCost: 50,
    totalSpending: 50,
    remaining: 0,
    withinBudget: true,
    overspend: 0
  });
  assert.deepEqual(hkPrimaryBudgetBalance({ budget: 60, count: 5, unitPrice: 10, extraCost: 0 }), {
    itemCost: 50,
    totalSpending: 50,
    remaining: 10,
    withinBudget: true,
    overspend: 0
  });
  assert.deepEqual(hkPrimaryBudgetBalance({ budget: 40, count: 5, unitPrice: 10, extraCost: 0 }), {
    itemCost: 50,
    totalSpending: 50,
    remaining: -10,
    withinBudget: false,
    overspend: 10
  });
});

test("P6 budget surfaces expose stable state-bound visible geometry for represent, solve, and check", () => {
  const model = functionBlock("ProblemSolvingModel");

  assert.match(model, /data-viz-name="bar-model"[\s\S]*?data-viz-total-spending=\{totalSpending\}[\s\S]*?data-viz-within-budget=\{String\(withinBudget\)\}[\s\S]*?data-viz-overspend=\{overspend\}/);
  assert.match(model, /data-viz-name="comparison-scale"/);
  assert.match(model, /data-viz-name="bar-items-segment"/);
  assert.match(model, /data-viz-name="bar-extra-segment"/);
  assert.match(model, /data-viz-name="bar-remainder"[\s\S]*?data-viz-remaining=\{remaining\}[\s\S]*?data-viz-name="bar-remainder-segment"/);
  assert.match(model, /data-viz-name=\{index\s*===\s*5\s*\?\s*"calculation-result"\s*:\s*"calculation-step"\}[\s\S]*?data-viz-result-kind=\{index\s*===\s*5\s*\?\s*\(withinBudget\s*\?\s*"remaining"\s*:\s*"overspend"\)\s*:\s*undefined\}[\s\S]*?data-viz-result-value=\{index\s*===\s*5\s*\?\s*\(withinBudget\s*\?\s*remaining\s*:\s*overspend\)\s*:\s*undefined\}/);
  assert.match(model, /data-viz-name="check-balance"[\s\S]*?data-viz-total-spending=\{totalSpending\}[\s\S]*?data-viz-remaining=\{remaining\}[\s\S]*?data-viz-overspend=\{overspend\}/);
  assert.match(model, /data-viz-name="check-left-card"/);
  assert.match(model, /data-viz-name="check-right-card"/);
});

test("primary model version, reset, live summary, surface, and mark selectors remain machine-readable", () => {
  assert.match(code, /data-hk-viz-model="primary-dedicated-v1"/);
  assert.match(code, /data-hk-viz-topic=\{lab\.labId\}/);
  assert.match(code, /data-hk-viz-state=\{JSON\.stringify\(currentState\)\}/);
  assert.match(code, /HKPrimaryStateReporterContext\.Provider\s+value=\{reportState\}/);
  assert.match(code, /data-hk-viz-contract=\{lab\.labId\}/);
  assert.match(code, /data-hk-viz-state-keys=\{JSON\.stringify\(HK_PRIMARY_VISUALIZATION_CONTRACTS\[lab\.labId\]\.stateKeys\)\}/);
  assert.match(code, /data-viz-active-lab=\{lab\.labId\}/);
  assert.match(code, /data-viz-reset-model/);
  assert.match(code, /data-viz-reset-module-id="configured-visualization-lab"/);
  assert.match(code, /data-viz-reset-topic-id=\{topicId\s*\?\?\s*undefined\}/);
  assert.match(code, /<HKPrimaryLabIdContext\.Provider\s+value=\{lab\.labId\}>/);
  assert.match(code, /data-viz-state-summary/);
  assert.match(code, /data-viz-surface/);
  assert.match(code, /data-viz-mark/);
});

test("every primary control exposes a stable language-independent parameter or mode selector", () => {
  const rangeControl = functionBlock("RangeControl");
  const modeButtons = sliceBetween("function ModeButtons<T extends string>(", "function ResetButton(");
  const usages = Array.from(code.matchAll(/<RangeControl\b[\s\S]*?\/>/g), (match) => match[0]);

  assert.equal(usages.length, 51, "The final 22 primary models must expose exactly 51 declared range-control instances.");
  for (const usage of usages) {
    assert.match(usage, /\bcontrolId="[A-Za-z][A-Za-z0-9]*"/, `Missing stable controlId on ${usage.slice(0, 120)}.`);
  }
  assert.match(rangeControl, /data-viz-parameter=\{controlId\}/);
  assert.match(rangeControl, /data-viz-control="range"/);
  assert.match(rangeControl, /className="[^"]*focus-ring[^"]*min-h-11[^"]*"/);
  assert.match(modeButtons, /data-viz-mode=\{option\.value\}/);
  assert.match(modeButtons, /data-viz-mode-active=\{String\(active\)\}/);
  assert.match(modeButtons, /aria-pressed=\{active\}/);
  assert.match(modeButtons, /className=\{`focus-ring min-h-11/);
  assert.match(functionBlock("ResetButton"), /className="focus-ring min-h-11/);
});

test("P1-P4 learner models contain no degree symbol or numerical-degree UI contract", () => {
  const primaryOneToFour = Object.entries(expectedModels)
    .filter(([labId]) => /^p[1-4]-/.test(labId))
    .map(([, componentName]) => functionBlock(componentName))
    .join("\n");

  assert.doesNotMatch(primaryOneToFour, /°/);
  assert.doesNotMatch(primaryOneToFour, /\bdegrees?\b/i);
  assert.doesNotMatch(primaryOneToFour, /data-viz-angle-degrees/);
});
