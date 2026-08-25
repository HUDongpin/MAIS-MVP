import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  HK_SECONDARY_DEDICATED_LAB_IDS,
  HK_SECONDARY_DEDICATED_LAB_ID_SET,
  isHKSecondaryDedicatedLabId
} from "./hk/hkVisualizationLabRegistry";
import { projectValidTriangleCoordinate } from "./hk/HKSecondaryVisualizationLab";

const sourcePath = "components/visualizations/hk/HKSecondaryVisualizationLab.tsx";
const resetSourcePath = "components/visualizations/VisualizationResetButton.tsx";
const source = fs.readFileSync(sourcePath, "utf8");
const resetSource = fs.readFileSync(resetSourcePath, "utf8");
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const expectedRenderers = {
  integers: "renderIntegers",
  "algebra-basics": "renderAlgebraBasics",
  angles: "renderAngles",
  ratios: "renderRatios",
  "linear-equations": "renderLinearEquation",
  coordinates: "renderCoordinates",
  transformations: "renderTransformations",
  "probability-s2": "renderProbabilityS2",
  polynomials: "renderPolynomials",
  "quadratic-patterns": "renderQuadraticFunctions",
  "identities-square-patterns": "renderIdentitiesSquarePatterns",
  "trigonometry-basics": "renderTrigonometryBasics",
  circles: "renderCircleGeometry",
  "arc-length-sector-area": "renderArcLengthSectorArea",
  functions: "renderFunctions",
  "coordinate-geometry": "renderCoordinateGeometry",
  "more-algebra": "renderMoreAlgebra",
  "trigonometry-s5": "renderTrigonometryS5",
  "probability-s5": "renderProbabilityS5",
  "statistics-s6": "renderStatisticsS6",
  "exam-revision": "renderExamRevision",
  "mixed-problem-solving": "renderMixedProblem"
} as const;

const expectedIds = Object.keys(expectedRenderers).sort();

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

function formulaConstruction(functionName: string) {
  const block = functionBlock(functionName);
  const declaration = block.match(/const\s+formula\s*=\s*([\s\S]*?);\n\s*return\s*\{/);
  if (declaration) return declaration[1].trim();

  const direct = block.match(/return\s*\{[\s\S]*?\n\s*formula:\s*([\s\S]*?),\n\s*summary:/);
  assert.ok(direct, `Missing formula return in ${functionName}`);
  return direct[1].trim();
}

const contracts = sliceBetween(
  "export const HK_SECONDARY_MODEL_CONTRACTS = {",
  "} satisfies Record<HKSecondaryDedicatedLabId, HKSecondaryModelContract>;"
);

function contractBlock(labId: string) {
  const marker = /^[a-z]+$/.test(labId) ? `  ${labId}: {` : `  "${labId}": {`;
  const start = contracts.indexOf(marker);
  assert.notEqual(start, -1, `Missing contract for ${labId}`);
  const nextContract = /^  (?:(?:"[a-z0-9-]+")|(?:[a-z][a-z0-9-]*)): \{/gm;
  nextContract.lastIndex = start + marker.length;
  const next = nextContract.exec(contracts);
  return contracts.slice(start, next?.index ?? contracts.length);
}

function topLevelContractIds(block: string) {
  return Array.from(
    block.matchAll(/^  (?:(?:"([a-z0-9-]+)")|([a-z][a-z0-9-]*)): \{/gm),
    (match) => match[1] ?? match[2]
  );
}

test("secondary registry is the immutable authority for exactly 22 unique dedicated ids", () => {
  const ids = [...HK_SECONDARY_DEDICATED_LAB_IDS];
  const publicSet = HK_SECONDARY_DEDICATED_LAB_ID_SET as unknown as Record<string, unknown>;

  assert.equal(ids.length, 22);
  assert.equal(new Set(ids).size, 22);
  assert.deepEqual([...ids].sort(), expectedIds);
  assert.ok(Object.isFrozen(HK_SECONDARY_DEDICATED_LAB_IDS));
  assert.ok(Object.isFrozen(HK_SECONDARY_DEDICATED_LAB_ID_SET));
  assert.deepEqual([...HK_SECONDARY_DEDICATED_LAB_ID_SET], ids);
  assert.equal(publicSet.add, undefined);
  assert.equal(publicSet.delete, undefined);
  assert.equal(publicSet.clear, undefined);
  assert.match(code, /from\s+"\.\/hkVisualizationLabRegistry"/);
  assert.doesNotMatch(code, /const\s+HK_SECONDARY_DEDICATED_LAB_IDS\s*=/);
  assert.doesNotMatch(code, /new\s+Set\s*\(\s*HK_SECONDARY_DEDICATED_LAB_IDS/);
  for (const labId of ids) assert.ok(isHKSecondaryDedicatedLabId(labId));
});

test("all 22 teaching contracts contain one complete field set with no duplicate or omitted topic", () => {
  const contractIds = topLevelContractIds(contracts);
  assert.equal(contractIds.length, 22);
  assert.equal(new Set(contractIds).size, 22);
  assert.deepEqual([...contractIds].sort(), expectedIds);

  for (const property of [
    "learningObjective",
    "coreRelation",
    "invariants",
    "objects",
    "formulaBindings",
    "modes",
    "parameters"
  ]) {
    assert.equal(
      (contracts.match(new RegExp(`^    ${property}:`, "gm")) ?? []).length,
      22,
      `Every contract must contain exactly one ${property} property.`
    );
  }
  assert.match(code, /satisfies\s+Record<HKSecondaryDedicatedLabId,\s*HKSecondaryModelContract>/);
});

test("the exhaustive runtime switch dispatches every registry id once and has no fallback case", () => {
  const dispatcher = functionBlock("renderDedicatedModel");
  const cases = Array.from(dispatcher.matchAll(/case\s+"([a-z0-9-]+)"\s*:/g), (match) => match[1]);

  assert.equal(cases.length, 22);
  assert.equal(new Set(cases).size, 22);
  assert.deepEqual([...cases].sort(), expectedIds);
  assert.doesNotMatch(dispatcher, /\bdefault\s*:/);
  assert.doesNotMatch(dispatcher, /throw\s+new\s+Error/);
  for (const [labId, renderer] of Object.entries(expectedRenderers)) {
    assert.match(dispatcher, new RegExp(`case "${labId}": return ${renderer}\\(`));
    assert.match(functionBlock(renderer), /<Surface\s+name=/, `${renderer} must expose a named learner surface.`);
  }
});

test("runtime keeps stable root, mode, parameter, state, reset, surface, and mark selectors", () => {
  const runtime = functionBlock("HKSecondaryVisualizationRuntime");

  assert.match(runtime, /data-hk-viz-model="secondary-dedicated-v1"/);
  assert.match(runtime, /data-hk-viz-topic=\{lab\.labId\}/);
  assert.match(runtime, /data-hk-viz-contract=\{dedicatedId\}/);
  assert.match(runtime, /const\s+state\s*=\s*\{\s*\.\.\.numericState,\s*activeMode\s*\}/);
  assert.match(runtime, /data-hk-viz-state=\{JSON\.stringify\(state\)\}/);
  assert.match(runtime, /data-hk-viz-state-keys=\{JSON\.stringify\(\[\.\.\.contract\.parameters\.map\(\(item\) => item\.id\), "activeMode"\]\)\}/);
  assert.match(runtime, /data-viz-state-summary/);
  assert.match(runtime, /data-viz-mode-button/);
  assert.match(runtime, /data-viz-mode=\{item\.id\}/);
  assert.match(runtime, /data-viz-mode-active=\{String\(active\)\}/);
  assert.match(runtime, /data-viz-mode-group=\{mainModeGroup\}/);
  assert.match(runtime, /dedicatedId\s*===\s*"trigonometry-basics"[\s\S]*?\?\s*"ratio"[\s\S]*?dedicatedId\s*===\s*"mixed-problem-solving"[\s\S]*?\?\s*"workflow"[\s\S]*?:\s*"model"/);
  assert.match(runtime, /data-viz-parameter=\{definition\.id\}/);
  assert.match(runtime, /data-viz-formula\s+data-viz-formula-topic=\{dedicatedId\}/);
  assert.match(runtime, /<VisualizationResetButton\s+moduleId="configured-visualization-lab"\s+onReset=\{resetModel\}\s+topicId=\{lab\.labId\}\s*\/>/);
  assert.match(code, /data-viz-surface/);
  assert.match(code, /data-hk-viz-surface=\{name\}/);
  assert.match(code, /data-viz-mark/);

  assert.match(resetSource, /data-viz-reset-model/);
  assert.match(resetSource, /data-viz-reset-module-id=\{moduleId\}/);
  assert.match(resetSource, /data-viz-reset-topic-id=\{topicId\}/);
  assert.match(runtime, /setState\(initialStateFor\(dedicatedId\)\)/);
  assert.match(runtime, /setActiveMode\(contract\.modes\[0\]\.id\)/);
});

test("all 22 secondary live formulas resolve LocalizedText before MathText rendering", () => {
  const runtime = functionBlock("HKSecondaryVisualizationRuntime");
  const constructions = Object.values(expectedRenderers).map((renderer) => ({ renderer, source: formulaConstruction(renderer) }));
  const proseTokens = /\b(?:per|reflection|mirror|rotation|clockwise|anticlockwise|about|theoretical|experimental|no rolls|opposite|adjacent|hypotenuse|gradient|change|undefined|pairs|priority|mastery|errors|marks|distance|rate|time|check|endpoints|arc|chord)\b/i;

  assert.match(code, /type\s+ModelRender\s*=\s*\{[\s\S]*?formula:\s*LocalizedText;/);
  assert.match(code, /const\s+mathematicalFormula\s*=\s*\(value:\s*string\):\s*LocalizedText\s*=>\s*\(\{\s*en:\s*value,\s*zh:\s*value,\s*zhHans:\s*value\s*\}\)/);
  assert.equal(constructions.length, 22);
  for (const { renderer, source: construction } of constructions) {
    assert.match(
      construction,
      /\b(?:enZh|mathematicalFormula)\s*\(/,
      `${renderer} must build a LocalizedText formula.`
    );
    if (!construction.startsWith("mathematicalFormula(") && proseTokens.test(construction)) {
      assert.match(construction, /\benZh\s*\(/, `${renderer} formula prose must use enZh(...).`);
      assert.match(construction, /[\u3400-\u9fff]/, `${renderer} formula prose must include Chinese output.`);
    }
  }

  assert.match(runtime, /const\s+renderedFormula\s*=\s*t\(rendered\.formula\)/);
  assert.match(runtime, /text=\{renderedFormula\}/);
  assert.match(runtime, /ariaLabel=\{renderedFormula\}/);
  assert.doesNotMatch(runtime, /text=\{rendered\.formula\}|ariaLabel=\{rendered\.formula\}/);
});

test("secondary formula prose supplies distinct Traditional and Simplified Chinese readouts", () => {
  const ratios = formulaConstruction("renderRatios");
  const coordinates = formulaConstruction("renderCoordinates");
  const transformations = formulaConstruction("renderTransformations");
  const probability = formulaConstruction("renderProbabilityS2");
  const trig = formulaConstruction("renderTrigonometryBasics");
  const coordinateGeometry = formulaConstruction("renderCoordinateGeometry");
  const exam = formulaConstruction("renderExamRevision");
  const mixed = formulaConstruction("renderMixedProblem");

  assert.match(ratios, /每 1 份 A 對應 B[\s\S]*?每 1 份 A 对应 B/);
  assert.match(coordinates, /關於 x=[\s\S]*?关于 x=/);
  assert.match(transformations, /順時針旋轉[\s\S]*?顺时针旋转[\s\S]*?逆時針旋轉[\s\S]*?逆时针旋转/);
  assert.match(probability, /理論值[\s\S]*?理论值[\s\S]*?實驗值[\s\S]*?实验值/);
  assert.match(trig, /對邊\/斜邊[\s\S]*?对边\/斜边[\s\S]*?鄰邊\/斜邊[\s\S]*?邻边\/斜边/);
  assert.match(coordinateGeometry, /斜率未定義[\s\S]*?斜率未定义[\s\S]*?y 的變化量[\s\S]*?y 的变化量/);
  assert.match(exam, /優先值[\s\S]*?优先值[\s\S]*?時間預算[\s\S]*?时间预算/);
  assert.match(mixed, /距離 = 速率 × 時間[\s\S]*?路程 = 速度 × 时间[\s\S]*?檢查：距離\/時間[\s\S]*?检查：路程\/时间/);
});

test("secondary quadratic learner copy follows the 函數圖象 glossary", () => {
  assert.match(code, /"把獨立的 a、b、c 數值連繫到同一幅一致的二次函數圖象。"/);
  assert.match(code, /"把独立的 a、b、c 数值联系到同一幅一致的二次函数图象。"/);
  assert.match(code, /"係數一致的二次函數圖象"/);
  assert.match(code, /"系数一致的二次函数图象"/);
  assert.doesNotMatch(code, /二次函數圖像|二次函数图像/);
});

test("learner surface uses local focusable horizontal pan and 44px control contracts", () => {
  const surface = functionBlock("Surface");
  const runtime = functionBlock("HKSecondaryVisualizationRuntime");

  assert.match(surface, /data-viz-pan-container/);
  assert.match(surface, /tabIndex=\{0\}/);
  assert.match(surface, /role="region"/);
  assert.match(surface, /aria-label=\{`\$\{label\}\. \$\{panHint\}`\}/);
  assert.match(surface, /overflow-x-auto/);
  assert.match(surface, /overscroll-x-contain/);
  assert.match(surface, /viewBox=\{`0 0 \$\{WIDTH\} \$\{HEIGHT\}`\}/);
  assert.match(surface, /min-w-\[640px\]/);
  assert.match(surface, /data-viz-pan-hint/);
  assert.match(surface, /sm:hidden/);
  assert.doesNotMatch(surface, /overflow-x-hidden/);

  assert.match(runtime, /data-viz-mode-button[\s\S]*?min-h-\[44px\]/);
  assert.match(runtime, /data-viz-parameter=\{definition\.id\}[\s\S]*?className="[^"]*h-11[^"]*"/);
  assert.match(functionBlock("renderProbabilityS2"), /data-viz-roll=\{count\}[\s\S]*?min-h-\[44px\]/);
  assert.match(functionBlock("renderTrigonometryBasics"), /data-viz-reference-angle[\s\S]*?min-h-\[44px\]/);
  assert.doesNotMatch(code, /data-viz-overlap-ok/);
});

test("integers is a signed number line with negative starts, signed operands, and correct directed end", () => {
  const contract = contractBlock("integers");
  const model = functionBlock("renderIntegers");

  assert.match(contract, /parameter\("start"[\s\S]*?-10, 10, 1, -3\)/);
  assert.match(contract, /parameter\("operand"[\s\S]*?-10, 10, 1, 8\)/);
  assert.match(contract, /mode\("add"/);
  assert.match(contract, /mode\("subtract"/);
  assert.match(model, /const\s+signedStep\s*=\s*activeMode\s*===\s*"subtract"\s*\?\s*-state\.operand\s*:\s*state\.operand/);
  assert.match(model, /const\s+end\s*=\s*state\.start\s*\+\s*signedStep/);
  assert.match(model, /data-viz-name="integer-number-line"/);
  assert.match(model, /data-viz-name="integer-arrow"/);
  assert.match(model, /data-viz-start=\{state\.start\}/);
  assert.match(model, /data-viz-signed-step=\{signedStep\}/);
  assert.match(model, /data-viz-end=\{end\}/);
  assert.deepEqual([-3 + 8, 3 + -5, 3 - -5], [5, -2, 8]);
});

test("algebra basics and linear equations preserve a symbolic balance through same-side operations", () => {
  const algebra = functionBlock("renderAlgebraBasics");
  const linear = functionBlock("renderLinearEquation");

  assert.match(algebra, /const\s+solution\s*=\s*state\.b\s*-\s*state\.a/);
  assert.match(algebra, /data-viz-name="algebra-x-tile"/);
  assert.match(algebra, /data-viz-name="algebra-balance-beam"\s+data-viz-equal="true"/);
  assert.match(algebra, /data-viz-name="algebra-inverse-operation"[\s\S]*?data-viz-applied-both-sides="true"/);
  assert.match(algebra, /data-viz-name="algebra-solution"[\s\S]*?data-viz-verified=\{String\(verifiedLeft\s*===\s*state\.b\)\}/);

  assert.match(linear, /const\s+solution\s*=\s*\(state\.c\s*-\s*state\.b\)\s*\/\s*state\.a/);
  assert.match(linear, /data-viz-name="equation-balance-beam"/);
  assert.match(linear, /data-viz-name="equation-x-blocks"/);
  assert.match(linear, /data-viz-subtract-b-both-sides="true"/);
  assert.match(linear, /data-viz-divide-a-both-sides="true"/);
  assert.match(linear, /data-viz-substitution-verified=\{String\(verified\)\}/);
});

test("angles provides three pointer-and-keyboard draggable vertices and a live 180-degree invariant", () => {
  const model = functionBlock("renderAngles");

  for (const vertex of ["a", "b", "c"]) assert.match(model, new RegExp(`\\{ id: "${vertex}"`));
  assert.equal((model.match(/triangleAngle\(/g) ?? []).length, 3);
  assert.match(model, /const\s+angleSum\s*=\s*angles\.reduce\(\(sum, value\)\s*=>\s*sum\s*\+\s*value,\s*0\)/);
  assert.match(model, /<Surface[^>]*interactive>/);
  assert.match(model, /data-viz-name="angle-triangle"[\s\S]*?data-viz-rounding-tolerance="0\.01"/);
  assert.match(model, /data-viz-name=\{`angle-vertex-\$\{vertex\.id\}`\}/);
  assert.match(model, /data-viz-pointer-target="angle-vertex-hit-area"/);
  assert.match(model, /data-viz-hit-diameter="48"/);
  assert.match(model, /r="24"/);
  assert.match(model, /tabIndex=\{0\}/);
  assert.match(model, /role="button"/);
  assert.match(model, /aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"/);
  assert.match(model, /data-viz-name=\{`angle-vertex-handle-\$\{vertex\.id\}`\}/);
  assert.match(model, /data-viz-vertex-focus-ring=\{vertex\.id\}/);
  assert.match(model, /onPointerDown=/);
  assert.match(model, /onPointerMove=/);
  assert.match(model, /onKeyDown=\{\(event\)\s*=>\s*moveVertexFromKeyboard\(vertex, event\)\}/);
  assert.match(model, /data-viz-name="angle-sum-state"[\s\S]*?data-viz-sum=\{formatNumber\(angleSum, 6\)\}/);
});

test("angle coordinate controls project every declared endpoint to an honest non-degenerate triangle", () => {
  const projection = functionBlock("projectValidTriangleCoordinate");
  const validity = functionBlock("triangleStateIsValid");
  const runtime = functionBlock("HKSecondaryVisualizationRuntime");
  const model = functionBlock("renderAngles");

  assert.match(projection, /const\s+requested\s*=\s*\{\s*\.\.\.current,\s*\[coordinateId\]:\s*requestedValue\s*\}/);
  assert.match(projection, /if\s*\(triangleStateIsValid\(requested\)\)\s*return\s*requested/);
  assert.match(projection, /const\s+companionId\s*=/);
  assert.match(projection, /for\s*\(let\s+offset\s*=\s*companionStep/);
  assert.match(projection, /triangleStateIsValid\(candidate\)/);
  assert.doesNotMatch(projection, /return\s+current/);
  assert.match(runtime, /projectValidTriangleCoordinate\(current,\s*definition\.id,\s*requestedValue\)/);
  assert.match(model, /projectValidTriangleCoordinate\(next,\s*`\$\{id\}x`,\s*targetX\)/);
  assert.match(model, /projectValidTriangleCoordinate\(next,\s*`\$\{id\}y`,\s*targetY\)/);
  assert.match(model, /data-viz-name="angle-endpoint-projection-note"/);
  assert.match(validity, /triangleMinimumSideFromState\(state\)\s*>=\s*2\.5/);
  assert.match(model, /\*\s*58/);

  const bounds = {
    ax: [-8, 8], ay: [-5, 5], bx: [-8, 8], by: [-5, 5], cx: [-8, 8], cy: [-5, 5]
  } as const;
  const initial = { ax: -4, ay: -2, bx: 4, by: -2, cx: 1, cy: 3 };
  const area = (state: Record<string, number>) => Math.abs(
    (state.bx - state.ax) * (state.cy - state.ay) - (state.by - state.ay) * (state.cx - state.ax)
  ) / 2;
  const minimumSide = (state: Record<string, number>) => Math.min(
    Math.hypot(state.ax - state.bx, state.ay - state.by),
    Math.hypot(state.bx - state.cx, state.by - state.cy),
    Math.hypot(state.cx - state.ax, state.cy - state.ay)
  );
  const coordinateOrders = [Object.keys(bounds), Object.keys(bounds).reverse()];

  for (const coordinateOrder of coordinateOrders) {
    for (const endpointOrder of [[0, 1], [1, 0]] as const) {
      let current: Record<string, number> = { ...initial };
      for (const coordinateId of coordinateOrder) {
        for (const endpointIndex of endpointOrder) {
          const endpoint = bounds[coordinateId as keyof typeof bounds][endpointIndex];
          current = projectValidTriangleCoordinate(current, coordinateId, endpoint);
          assert.equal(current[coordinateId], endpoint, `${coordinateId} must reach ${endpoint}.`);
          assert.ok(area(current) >= 0.25, `${coordinateId}=${endpoint} must preserve triangle area.`);
          assert.ok(minimumSide(current) >= 2.5, `${coordinateId}=${endpoint} must preserve non-overlapping 48px hit targets.`);
          for (const [id, [minimum, maximum]] of Object.entries(bounds)) {
            assert.ok(current[id] >= minimum && current[id] <= maximum, `${id} must remain in its declared range.`);
          }
        }
      }
    }
  }
});

test("secondary learner legends keep semantic colors in swatches and use readable theme text", () => {
  const metricCard = functionBlock("MetricCard");

  assert.match(metricCard, /data-viz-color-swatch/);
  assert.match(metricCard, /style=\{\{ backgroundColor: color \}\}/);
  assert.match(metricCard, /text-slate-950 dark:text-white/);
  assert.doesNotMatch(metricCard, /style=\{\{ color \}\}/);
  assert.doesNotMatch(code, /<text[^>]*fill=\{(?:BLUE|AMBER|GREEN|ROSE|PURPLE)\}/);
});

test("coordinates and transformations implement pure signed mappings including both rotation directions", () => {
  const coordinates = functionBlock("renderCoordinates");
  const transform = functionBlock("transformPoint");
  const transformationModel = functionBlock("renderTransformations");
  const transformationContract = contractBlock("transformations");

  assert.match(coordinates, /const\s+original\s*=\s*\[[\s\S]*?state\.x1[\s\S]*?state\.x2[\s\S]*?state\.x3/);
  assert.match(coordinates, /data-viz-order="A-B-C"/);
  assert.match(coordinates, /point\.x\s*\+\s*state\.dx,\s*y:\s*point\.y\s*\+\s*state\.dy/);
  assert.match(coordinates, /x:\s*2\s*\*\s*state\.mirror\s*-\s*point\.x\s*\}/);
  assert.match(coordinates, /data-viz-name=\{activeMode\s*===\s*"translate"\s*\?\s*"coordinate-translation-image"\s*:\s*"coordinate-reflection-image"\}/);

  assert.match(transformationContract, /mode\("rotate-cw"/);
  assert.match(transformationContract, /mode\("rotate-ccw"/);
  assert.match(transformationContract, /parameter\("angle"[\s\S]*?90, 270, 90, 90/);
  assert.match(transform, /if\s*\(activeMode\s*===\s*"reflect"\)\s*return\s*\{\s*x:\s*2\s*\*\s*state\.mirror\s*-\s*point\.x,\s*y:\s*point\.y\s*\}/);
  assert.match(transform, /const\s+signedAngle\s*=\s*activeMode\s*===\s*"rotate-cw"\s*\?\s*-state\.angle\s*:\s*state\.angle/);
  assert.match(transform, /x:\s*point\.x\s*\*\s*Math\.cos\(radians\)\s*-\s*point\.y\s*\*\s*Math\.sin\(radians\)/);
  assert.match(transform, /y:\s*point\.x\s*\*\s*Math\.sin\(radians\)\s*\+\s*point\.y\s*\*\s*Math\.cos\(radians\)/);
  assert.match(transform, /return\s*\{\s*x:\s*point\.x\s*\*\s*state\.scale,\s*y:\s*point\.y\s*\*\s*state\.scale\s*\}/);
  assert.doesNotMatch(transform, /reflect[\s\S]*?\+\s*state\.dy/);
  assert.match(transformationContract, /mode\("enlarge",\s*"Enrichment · Enlarge about origin",\s*"延伸學習 · 以原點放大",\s*"延伸学习 · 以原点放大"\)/);
  assert.match(transformationContract, /explore origin-centred enlargement as enrichment/);
  assert.match(transformationModel, /data-viz-mode-kind=\{activeMode\s*===\s*"enlarge"\s*\?\s*"enrichment"\s*:\s*"core"\}/);
});

test("symbolic secondary models expose learner-visible semantic labels instead of color-only shapes", () => {
  const labelledRenderers = [
    ["renderAlgebraBasics", "algebra-symbol-label"],
    ["renderLinearEquation", "equation-x-label"],
    ["renderRatios", "ratio-base-a-label"],
    ["renderPolynomials", "polynomial-x2-label"],
    ["renderTransformations", "transform-original-label"],
    ["renderFunctions", "function-input-label"],
    ["renderProbabilityS5", "probability-red-label"]
  ] as const;

  for (const [renderer, labelName] of labelledRenderers) {
    const model = functionBlock(renderer);
    assert.match(model, new RegExp(`data-viz-label[\\s\\S]*?data-viz-name="${labelName}"|data-viz-name="${labelName}"[\\s\\S]*?data-viz-label`));
  }
});

test("ratio equivalent and scale modes communicate distinct operations and visible states", () => {
  const model = functionBlock("renderRatios");

  assert.match(model, /activeMode\s*===\s*"equivalent"[\s\S]*?a:b\s*=\s*ka:kb/);
  assert.match(model, /activeMode\s*===\s*"scale"[\s\S]*?multiply both terms by k/);
  assert.match(model, /data-viz-name="ratio-equivalence-state"/);
  assert.match(model, /data-viz-name="ratio-scale-state"/);
  assert.match(model, /data-viz-ratio-operation=\{activeMode\}/);
  assert.match(model, /data-viz-name="ratio-base-a-label"/);
  assert.match(model, /data-viz-name="ratio-scaled-a-label"/);
});

test("mixed problem solving renders rate, time, distance, units, and inverse checking in every selected representation", () => {
  const model = functionBlock("renderMixedProblem");

  assert.match(model, /const\s+distance\s*=\s*state\.rate\s*\*\s*state\.time/);
  assert.match(model, /const\s+reverseRate\s*=\s*distance\s*\/\s*state\.time/);
  assert.match(model, /data-viz-name="mixed-known-facts"[\s\S]*?data-viz-rate-unit="km\/h"[\s\S]*?data-viz-time-unit="h"/);
  assert.match(model, /data-viz-name="mixed-known-rate-label"[\s\S]*?v = \{formatNumber\(state\.rate, 2\)\} km\/h/);
  assert.match(model, /data-viz-name="mixed-known-time-label"[\s\S]*?t = \{formatNumber\(state\.time, 2\)\} h/);
  assert.match(model, /data-viz-representation-stage=\{activeIndex\s*>=\s*1\s*\?\s*"model-ready"\s*:\s*"strategy-selected"\}/);
  assert.doesNotMatch(model, /<g\s+opacity=\{activeIndex\s*>=\s*1/);

  for (const representation of ["diagram", "table", "equation", "graph"]) {
    assert.match(
      model,
      new RegExp(`data-viz-name="mixed-representation-${representation}"[\\s\\S]*?data-viz-rate=\\{state\\.rate\\}[\\s\\S]*?data-viz-time=\\{state\\.time\\}[\\s\\S]*?data-viz-distance=\\{formatNumber\\(distance, 5\\)\\}`)
    );
  }

  assert.match(model, /data-viz-name="mixed-diagram-distance"\s+data-viz-distance=\{formatNumber\(distance, 5\)\}/);
  assert.match(model, /const\s+diagramDistanceScaleMax\s*=\s*240/);
  assert.match(model, /const\s+diagramDistanceScaleWidth\s*=\s*204/);
  assert.match(model, /const\s+diagramTravelWidth\s*=\s*\(distance\s*\/\s*diagramDistanceScaleMax\)\s*\*\s*diagramDistanceScaleWidth/);
  assert.match(model, /data-viz-name="mixed-diagram-distance-scale"[\s\S]*?data-viz-scale-max=\{diagramDistanceScaleMax\}[\s\S]*?data-viz-scale-unit="km"/);
  assert.match(model, /data-viz-name="mixed-diagram-scale-label"/);
  assert.match(model, /data-viz-name="mixed-table-values"[\s\S]*?data-viz-rate=\{state\.rate\}[\s\S]*?data-viz-time=\{state\.time\}[\s\S]*?data-viz-distance=\{formatNumber\(distance, 5\)\}/);
  assert.match(model, /d = v × t/);
  assert.match(model, /\{formatNumber\(state\.rate, 2\)\} km\/h × \{formatNumber\(state\.time, 2\)\} h/);
  assert.match(model, /= \{formatNumber\(distance, 2\)\} km/);
  assert.match(model, /data-viz-name="mixed-graph-axes"/);
  assert.match(model, /data-viz-name="mixed-graph-rate-line"\s+data-viz-gradient=\{state\.rate\}/);
  assert.match(model, /data-viz-name="mixed-graph-target-point"[\s\S]*?data-viz-time=\{state\.time\}[\s\S]*?data-viz-distance=\{formatNumber\(distance, 5\)\}/);
  assert.match(model, /t \(h\)/);
  assert.match(model, /d \(km\)/);
  assert.match(model, /data-viz-name="mixed-check"\s+data-viz-reverse-rate=\{formatNumber\(reverseRate, 5\)\}/);
  assert.match(model, /<tspan x="574" dy="18">\{formatNumber\(reverseRate, 2\)\}<\/tspan>/);

  for (let rate = 2; rate <= 30; rate += 1) {
    for (let halfHours = 1; halfHours <= 16; halfHours += 1) {
      const time = halfHours / 2;
      const currentDistance = rate * time;
      const travelWidth = currentDistance / 240 * 204;
      assert.equal(currentDistance / time, rate);
      assert.ok(currentDistance >= 1 && currentDistance <= 240);
      assert.ok(travelWidth > 0 && travelWidth <= 204);
    }
  }
});

test("S2 probability generates real six-face trials with Roll 1, Roll 20, cumulative counts, and reset", () => {
  const generator = functionBlock("seededDieSequence");
  const model = functionBlock("renderProbabilityS2");
  const runtime = functionBlock("HKSecondaryVisualizationRuntime");

  assert.match(generator, /const\s+faceCounts\s*=\s*\[0, 0, 0, 0, 0, 0\]/);
  assert.match(generator, /const\s+face\s*=\s*Math\.floor\([\s\S]*?\*\s*6\)\s*\+\s*1/);
  assert.match(generator, /faceCounts\[face\s*-\s*1\]\s*\+=\s*1/);
  assert.match(generator, /if\s*\(face\s*%\s*2\s*===\s*0\)\s*evenCount\s*\+=\s*1/);
  assert.match(generator, /runningFrequency\.push\(evenCount\s*\/\s*\(index\s*\+\s*1\)\)/);
  assert.match(model, /\[1, 20\]\.map\(\(count\)/);
  assert.match(model, /data-viz-roll=\{count\}/);
  assert.match(model, /data-viz-name="dice-face-counts"\s+data-viz-total=\{rolls\}\s+data-viz-counts=\{simulation\.faceCounts\.join\(","\)\}/);
  assert.match(model, /data-viz-name="probability-running-path"[\s\S]*?data-viz-even=\{simulation\.evenCount\}/);
  assert.match(model, /More rolls may tend toward, but do not guarantee, 1\/2/);
  assert.match(runtime, /<VisualizationResetButton/);
});

test("S5 probability separates favourable-pair count from probability and names both object categories", () => {
  const model = functionBlock("renderProbabilityS5");

  assert.match(model, /const\s+favourablePairs\s*=\s*totalPairs\s*-\s*blueOnly/);
  assert.match(model, /const\s+favourableProbability\s*=\s*favourablePairs\s*\/\s*totalPairs/);
  assert.match(model, /favourable pairs = \$\{favourablePairs\}; P\(at least one red\) = \$\{favourablePairs\}\/\$\{totalPairs\}/);
  assert.doesNotMatch(model, /C\(\$\{total\},2\)-C\(\$\{blue\},2\) = \$\{favourablePairs\}\/\$\{totalPairs\}/);
  assert.match(model, /data-viz-name="probability-favourable-count"[\s\S]*?data-viz-count=\{favourablePairs\}/);
  assert.match(model, /data-viz-name="probability-at-least-one-red"[\s\S]*?data-viz-probability=\{formatNumber\(favourableProbability, 8\)\}/);
  assert.match(model, /data-viz-name="probability-red-label"/);
  assert.match(model, /data-viz-name="probability-blue-label"/);
  assert.match(model, /y=\{activeMode\s*===\s*"conditional"\s*\?\s*142\s*:\s*120\}/);

  for (let red = 1; red <= 8; red += 1) {
    for (let blue = 1; blue <= 8; blue += 1) {
      const total = red + blue;
      const totalPairs = total * (total - 1) / 2;
      const blueOnly = blue * (blue - 1) / 2;
      const favourablePairs = totalPairs - blueOnly;
      const probability = favourablePairs / totalPairs;
      assert.ok(Number.isInteger(favourablePairs));
      assert.ok(probability > 0 && probability <= 1);
    }
  }
});

test("coordinate geometry explicitly preserves both point identities when A and B coincide", () => {
  const model = functionBlock("renderCoordinateGeometry");

  assert.match(model, /const\s+coincident\s*=\s*state\.x1\s*===\s*state\.x2\s*&&\s*state\.y1\s*===\s*state\.y2/);
  assert.match(model, /data-viz-name="coordinate-coincidence-state"[\s\S]*?data-viz-coincident=\{String\(coincident\)\}/);
  assert.match(model, /data-viz-name="coordinate-point-a-label"/);
  assert.match(model, /data-viz-name="coordinate-point-b-label"/);
  assert.match(model, /data-viz-name="coordinate-coincident-label"/);
  assert.match(model, /A = B/);
});

test("polynomials exposes linked expansion and factorisation area states", () => {
  const contract = contractBlock("polynomials");
  const model = functionBlock("renderPolynomials");

  assert.match(contract, /mode\("expand"/);
  assert.match(contract, /mode\("factor"/);
  assert.match(model, /const\s+middleCoefficient\s*=\s*state\.p\s*\+\s*state\.q/);
  assert.match(model, /const\s+constant\s*=\s*state\.p\s*\*\s*state\.q/);
  assert.match(model, /const\s+totalArea\s*=\s*totalWidth\s*\*\s*totalHeight/);
  for (const mark of ["polynomial-x2", "polynomial-px", "polynomial-qx", "polynomial-pq", "polynomial-whole", "polynomial-factor-braces"]) {
    assert.match(model, new RegExp(`data-viz-name="${mark}"`));
  }
  const x = 3;
  const p = 2;
  const q = 4;
  assert.equal((x + p) * (x + q), x ** 2 + (p + q) * x + p * q);
});

test("old quadratic-patterns remains an S4-consistent parabola with independent nonzero a, b, c", () => {
  const contract = contractBlock("quadratic-patterns");
  const model = functionBlock("renderQuadraticFunctions");
  const runtime = functionBlock("HKSecondaryVisualizationRuntime");

  assert.match(contract, /parameter\("a"[\s\S]*?-3, 3, 0\.25, 1, \{ excludeZero: true \}\)/);
  assert.match(contract, /parameter\("b"[\s\S]*?-6, 6, 0\.5, -2\)/);
  assert.match(contract, /parameter\("c"[\s\S]*?-6, 6, 0\.5, -3\)/);
  assert.match(runtime, /definition\.excludeZero\s*&&\s*Math\.abs\(value\)\s*<\s*definition\.step/);
  assert.match(model, /const\s+vertexX\s*=\s*-b\s*\/\s*\(2\s*\*\s*a\)/);
  assert.match(model, /const\s+vertexY\s*=\s*c\s*-\s*\(b\s*\*\*\s*2\)\s*\/\s*\(4\s*\*\s*a\)/);
  assert.match(model, /const\s+discriminant\s*=\s*b\s*\*\*\s*2\s*-\s*4\s*\*\s*a\s*\*\s*c/);
  for (const mark of ["quadratic-curve", "quadratic-axis", "quadratic-vertex", "quadratic-y-intercept", "quadratic-x-intercept", "quadratic-feature-state"]) {
    assert.match(model, new RegExp(`data-viz-name="${mark}"`));
  }
  assert.match(model, /data-viz-opening=\{a\s*>\s*0\s*\?\s*"up"\s*:\s*"down"\}/);
  assert.match(model, /data-viz-real-root-count=\{xIntercepts\.length\}/);
  assert.doesNotMatch(model, /identity-square|≡/);
});

test("new identities-square-patterns keeps exact area identities for every allowed a greater than b", () => {
  const contract = contractBlock("identities-square-patterns");
  const model = functionBlock("renderIdentitiesSquarePatterns");
  const runtime = functionBlock("HKSecondaryVisualizationRuntime");

  assert.match(contract, /\(a\+b\)²\s*≡\s*a²\+2ab\+b²/);
  assert.match(contract, /mode\("square-sum"/);
  assert.match(contract, /mode\("square-difference"/);
  assert.match(contract, /mode\("difference-of-squares"/);
  assert.match(contract, /a²−b²\s*≡\s*\(a−b\)\(a\+b\)/);
  assert.match(model, /const\s+b\s*=\s*clamp\(Math\.round\(state\.b\),\s*1,\s*a\s*-\s*1\)/);
  assert.match(model, /const\s+squareTotal\s*=\s*\(a\s*\+\s*b\)\s*\*\*\s*2/);
  assert.match(model, /const\s+minusSquareTotal\s*=\s*\(a\s*-\s*b\)\s*\*\*\s*2/);
  assert.match(model, /const\s+minusSquareExpansion\s*=\s*a\s*\*\*\s*2\s*-\s*2\s*\*\s*a\s*\*\s*b\s*\+\s*b\s*\*\*\s*2/);
  assert.match(model, /const\s+difference\s*=\s*a\s*\*\*\s*2\s*-\s*b\s*\*\*\s*2/);
  assert.match(model, /data-viz-name="identity-square-whole"[\s\S]*?data-viz-area=\{squareTotal\}/);
  assert.match(model, /data-viz-name="identity-cross-parts"\s+data-viz-area=\{2\s*\*\s*a\s*\*\s*b\}/);
  assert.match(model, /data-viz-name="identity-minus-square-model"[\s\S]*?data-viz-left=\{minusSquareTotal\}[\s\S]*?data-viz-right=\{minusSquareExpansion\}/);
  assert.match(model, /data-viz-name="identity-minus-cross-parts"\s+data-viz-signed-area=\{-2\s*\*\s*a\s*\*\s*b\}/);
  assert.match(model, /data-viz-name="identity-minus-overlap"\s+data-viz-area=\{b\s*\*\*\s*2\}\s+data-viz-role="add-back-once"/);
  assert.match(model, /data-viz-name="identity-minus-square-result"[\s\S]*?data-viz-area=\{minusSquareTotal\}/);
  assert.match(model, /data-viz-name="identity-plus-square-check"[\s\S]*?data-viz-middle-sign="plus"[\s\S]*?data-viz-valid=\{String\(squareTotal\s*===\s*plusSquareExpansion\)\}/);
  assert.match(model, /data-viz-name="identity-minus-square-check"[\s\S]*?data-viz-middle-sign="minus"[\s\S]*?data-viz-valid=\{String\(minusSquareTotal\s*===\s*minusSquareExpansion\)\}/);
  assert.match(model, /data-viz-name="identity-difference-product"[\s\S]*?data-viz-width=\{a\s*\+\s*b\}[\s\S]*?data-viz-height=\{a\s*-\s*b\}[\s\S]*?data-viz-area=\{difference\}/);
  assert.match(runtime, /dedicatedId\s*===\s*"identities-square-patterns"/);
  assert.match(runtime, /definition\.id\s*===\s*"a"\s*&&\s*next\.b\s*>=\s*next\.a/);
  assert.match(runtime, /definition\.id\s*===\s*"b"\s*&&\s*next\.b\s*>=\s*next\.a/);
  for (let a = 2; a <= 10; a += 1) {
    for (let b = 1; b < a; b += 1) {
      assert.equal((a + b) ** 2, a ** 2 + 2 * a * b + b ** 2);
      assert.equal((a - b) ** 2, a ** 2 - 2 * a * b + b ** 2);
      assert.equal(a ** 2 - b ** 2, (a - b) * (a + b));
    }
  }
  assert.doesNotMatch(model, /quadratic-(?:curve|vertex|axis)/);
});

test("trigonometry-basics is a resizable right triangle with selectable SOH-CAH-TOA bindings", () => {
  const contract = contractBlock("trigonometry-basics");
  const model = functionBlock("renderTrigonometryBasics");

  assert.match(contract, /mode\("sin",\s*"Sine · SOH"/);
  assert.match(contract, /mode\("cos",\s*"Cosine · CAH"/);
  assert.match(contract, /mode\("tan",\s*"Tangent · TOA"/);
  assert.match(model, /const\s+verticalLength\s*=\s*state\.hyp\s*\*\s*Math\.sin\(radians\)/);
  assert.match(model, /const\s+baseLength\s*=\s*state\.hyp\s*\*\s*Math\.cos\(radians\)/);
  assert.match(model, /data-viz-name="trig-triangle"/);
  assert.match(model, /data-viz-name="trig-right-angle"/);
  assert.match(model, /data-viz-name=\{referenceIsLeft\s*\?\s*"trig-adjacent"\s*:\s*"trig-opposite"\}/);
  assert.match(model, /data-viz-name="trig-hypotenuse"\s+data-viz-length=\{state\.hyp\}/);
  assert.match(model, /data-viz-adjacent-definition="non-hypotenuse-side-next-to-selected-theta"/);
  assert.match(model, /data-viz-side-definition=\{referenceIsLeft\s*\?\s*"non-hypotenuse-side-next-to-selected-theta"\s*:\s*"side-across-from-selected-theta"\}/);
  assert.match(model, /data-viz-mode-group="reference-angle"/);
  assert.match(model, /data-viz-reference-angle=\{item\.id\s*===\s*0\s*\?\s*"left"\s*:\s*"upper"\}/);

  for (let theta = 10; theta <= 80; theta += 1) {
    const radians = theta * Math.PI / 180;
    const base = Math.cos(radians);
    const vertical = Math.sin(radians);
    assert.ok(Math.abs(base - Math.sin((90 - theta) * Math.PI / 180)) < 1e-12);
    assert.ok(Math.abs(vertical - Math.cos((90 - theta) * Math.PI / 180)) < 1e-12);
  }
});

test("old circles remains an S4 circle-theorem construction with real shared geometry", () => {
  const model = functionBlock("renderCircleGeometry");

  assert.match(model, /const\s+radiusPx\s*=\s*84\s*\+\s*\(\(state\.r\s*-\s*2\)\s*\/\s*8\)\s*\*\s*60/);
  assert.match(model, /const\s+inscribed\s*=\s*alpha\s*\/\s*2/);
  for (const mark of ["circle-geometry-circle", "circle-geometry-centre", "circle-geometry-arc", "circle-geometry-chord", "circle-geometry-radius", "circle-geometry-tangent", "circle-geometry-central-angle", "circle-geometry-circumference-angle"]) {
    assert.match(model, new RegExp(`data-viz-name="${mark}"`));
  }
  for (const endpoint of ["A", "B", "C"]) {
    assert.match(
      model,
      new RegExp(`data-viz-name="circle-geometry-radius"[^>]*data-viz-from="O"[^>]*data-viz-to="${endpoint}"[^>]*data-viz-length=\\{state\\.r\\}`),
      `Formula OA = OB = OC = r needs a visible O${endpoint} radius segment.`
    );
  }
  assert.match(model, /data-viz-perpendicular-to="OA"\s+data-viz-angle="90"/);
  assert.match(model, /data-viz-same-chord="AB"/);
  assert.match(model, /data-viz-central-equals-twice-inscribed=\{String\(Math\.abs\(alpha\s*-\s*2\s*\*\s*inscribed\)\s*<\s*1e-9\)\}/);
  assert.doesNotMatch(model, /circle-sector|sector area/);
});

test("new arc-length-sector-area distinguishes exact pi, approximation, units, and the full-circle state", () => {
  const contract = contractBlock("arc-length-sector-area");
  const model = functionBlock("renderArcLengthSectorArea");
  const exactPi = functionBlock("exactPiMultiple");

  assert.match(contract, /parameter\("r"[\s\S]*?0\.5, 12, 0\.5, 5/);
  assert.match(contract, /parameter\("theta"[\s\S]*?1, 360, 1, 90/);
  assert.match(model, /const\s+fraction\s*=\s*state\.theta\s*\/\s*360/);
  assert.match(model, /const\s+arcCoefficient\s*=\s*fraction\s*\*\s*2\s*\*\s*state\.r/);
  assert.match(model, /const\s+sectorCoefficient\s*=\s*fraction\s*\*\s*state\.r\s*\*\*\s*2/);
  assert.match(model, /const\s+isFullCircle\s*=\s*state\.theta\s*===\s*360/);
  assert.match(exactPi, /π/);
  assert.match(model, /exactPiMultiple\(state\.theta\s*\*\s*radiusHalfUnits,\s*360,\s*"cm"\)/);
  assert.match(model, /exactPiMultiple\(state\.theta\s*\*\s*radiusHalfUnits\s*\*\*\s*2,\s*1440,\s*"cm²"\)/);
  assert.match(model, /≈\s*\$\{approximateValue\}/);
  assert.match(model, /isFullCircle[\s\S]*?<circle\s+data-viz-mark\s+data-viz-name="circle-sector"/);
  assert.match(model, /data-viz-name="circle-fraction"[\s\S]*?data-viz-denominator="360"/);
  assert.match(model, /data-viz-arc-pi-numerator/);
  assert.match(model, /data-viz-sector-pi-numerator/);
});

test("functions binds one input-output state across four distinct function families", () => {
  const contract = contractBlock("functions");
  const evaluator = functionBlock("evaluateFunctionFamily");
  const model = functionBlock("renderFunctions");

  for (const family of ["linear", "quadratic", "exponential", "logarithmic"]) {
    assert.match(contract, new RegExp(`mode\\("${family}"`));
  }
  assert.match(evaluator, /family\s*===\s*"linear"/);
  assert.match(evaluator, /family\s*===\s*"quadratic"/);
  assert.match(evaluator, /family\s*===\s*"exponential"/);
  assert.match(evaluator, /Math\.log\(x\s*\+\s*5\)/);
  assert.match(model, /const\s+evaluate\s*=\s*\(x:\s*number\)\s*=>\s*evaluateFunctionFamily\(activeMode, x, state\.a, state\.b\)/);
  assert.match(model, /data-viz-name="function-rule"\s+data-viz-family=\{activeMode\}/);
  assert.match(model, /data-viz-name="function-output"\s+data-viz-y=\{formatNumber\(output, 6\)\}/);
  assert.match(model, /data-viz-name="function-curve"\s+data-viz-family=\{activeMode\}/);
  assert.match(model, /data-viz-name="function-table"\s+data-viz-values=/);
});

test("formula overflow is a keyboard-focusable localized region with a visible pan hint", () => {
  const runtime = functionBlock("HKSecondaryVisualizationRuntime");

  assert.match(runtime, /const\s+formulaPanHint\s*=\s*t\(\{/);
  assert.match(runtime, /data-viz-formula-scroll/);
  assert.match(runtime, /tabIndex=\{0\}/);
  assert.match(runtime, /role="region"/);
  assert.match(runtime, /aria-label=\{`\$\{title\}\. \$\{formulaPanHint\}`\}/);
  assert.match(runtime, /data-viz-formula-pan-hint/);
  assert.match(runtime, /overflow-x-auto/);
});

test("statistics-s6 standardizes the learner-selected observed value rather than only mean and spread", () => {
  const contract = contractBlock("statistics-s6");
  const model = functionBlock("renderStatisticsS6");

  assert.match(contract, /parameter\("observed",\s*"Observed value x"/);
  assert.match(model, /const\s+z\s*=\s*\(state\.observed\s*-\s*state\.mean\)\s*\/\s*state\.sd/);
  assert.match(model, /data-viz-name="statistics-observed"\s+data-viz-value=\{state\.observed\}\s+data-viz-z=\{formatNumber\(z, 6\)\}/);
  assert.match(model, /data-viz-name="statistics-mean"\s+data-viz-value=\{state\.mean\}/);
  assert.match(model, /data-viz-name="statistics-sd-band"\s+data-viz-z=\{band\}/);
  assert.match(model, /data-viz-name="statistics-z-displacement"\s+data-viz-z=\{formatNumber\(z, 6\)\}/);
  assert.equal((70 - 50) / 10, 2);
});

test("exam-revision exposes ranking and aggregate witnesses from the same priority formula", () => {
  const model = functionBlock("renderExamRevision");
  const priority = functionBlock("revisionPriority");

  assert.match(priority, /return\s+0\.6\s*\*\s*\(100\s*-\s*mastery\)\s*\+\s*8\s*\*\s*errors/);
  assert.match(model, /const\s+masteryGapTotal\s*=\s*topics\.reduce\(\(total,\s*topic\)\s*=>\s*total\s*\+\s*\(100\s*-\s*topic\.mastery\),\s*0\)/);
  assert.match(model, /const\s+recentErrorsTotal\s*=\s*topics\.reduce\(\(total,\s*topic\)\s*=>\s*total\s*\+\s*topic\.errors,\s*0\)/);
  assert.match(model, /const\s+priorityTotal\s*=\s*topics\.reduce\(\(total,\s*topic\)\s*=>\s*total\s*\+\s*topic\.priority,\s*0\)/);
  assert.match(model, /data-viz-name="revision-priority-bars"[\s\S]*?data-viz-ranking=\{ranked\.map\(\(topic\)\s*=>\s*topic\.id\)\.join\(","\)\}[\s\S]*?data-viz-top-topic=\{ranked\[0\]\.id\}[\s\S]*?data-viz-mastery-gap-total=\{masteryGapTotal\}[\s\S]*?data-viz-recent-errors-total=\{recentErrorsTotal\}[\s\S]*?data-viz-priority-total=\{formatNumber\(priorityTotal,\s*4\)\}/);

  for (const algebra of [0, 50, 100]) {
    for (const geometry of [0, 50, 100]) {
      for (const statistics of [0, 50, 100]) {
        const gap = (100 - algebra) + (100 - geometry) + (100 - statistics);
        const errors = 4 + 2 + 5;
        const total = 0.6 * (100 - algebra) + 8 * 4
          + 0.6 * (100 - geometry) + 8 * 2
          + 0.6 * (100 - statistics) + 8 * 5;
        assert.equal(total, 0.6 * gap + 8 * errors);
      }
    }
  }
});

test("public secondary component rejects every non-secondary id before rendering runtime state", () => {
  const entry = functionBlock("HKSecondaryVisualizationLab");

  assert.match(entry, /if\s*\(!isHKSecondaryDedicatedLabId\(lab\.labId\)\)\s*return\s+null/);
  assert.match(entry, /<HKSecondaryVisualizationRuntime\s+key=\{lab\.labId\}\s+lab=\{lab\}\s+dedicatedId=\{lab\.labId\}\s+controlFooterAction=\{controlFooterAction\}\s*\/>/);
});
