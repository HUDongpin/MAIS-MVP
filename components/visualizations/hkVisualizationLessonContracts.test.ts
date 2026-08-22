import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import {
  HK_VISUALIZATION_LESSON_CONTRACTS,
  hkVisualizationLessonContract
} from "./hk/hkVisualizationLessonContracts";
import type { HKVisualizationLessonContract } from "./hk/hkVisualizationLessonContracts";
import {
  HK_PASS_THROUGH_LAB_IDS,
  HK_PRIMARY_DEDICATED_LAB_IDS,
  HK_SECONDARY_DEDICATED_LAB_IDS,
  HK_VISUALIZATION_LAB_IDS,
  hkVisualizationLabRegistryKind
} from "./hk/hkVisualizationLabRegistry";

const primarySourcePath = "components/visualizations/hk/HKPrimaryVisualizationLab.tsx";
const secondarySourcePath = "components/visualizations/hk/HKSecondaryVisualizationLab.tsx";
const configuredSourcePath = "components/visualizations/ConfiguredVisualizationLab.tsx";
const lessonViewSourcePath = "components/lesson/LessonView.tsx";
const visualizationLabPageSourcePath = "components/visualizations/VisualizationLabPage.tsx";
const primarySource = fs.readFileSync(primarySourcePath, "utf8");
const secondarySource = fs.readFileSync(secondarySourcePath, "utf8");
const configuredSource = fs.readFileSync(configuredSourcePath, "utf8");
const lessonViewSource = fs.readFileSync(lessonViewSourcePath, "utf8");
const visualizationLabPageSource = fs.readFileSync(visualizationLabPageSourcePath, "utf8");

type ParsedModelContract = {
  grade?: string;
  modeIds: readonly string[];
  parameterIds: readonly string[];
  stateKeys: readonly string[];
};

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isTypeAssertionExpression(current)
  ) current = current.expression;
  return current;
}

function propertyName(node: ts.PropertyName): string | null {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return null;
}

function propertyValue(object: ts.ObjectLiteralExpression, name: string): ts.Expression | null {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || propertyName(property.name) !== name) continue;
    return unwrapExpression(property.initializer);
  }
  return null;
}

function stringArray(expression: ts.Expression | null, label: string): string[] {
  assert.ok(expression && ts.isArrayLiteralExpression(expression), `${label} must be an array literal.`);
  return expression.elements.map((element, index) => {
    const value = unwrapExpression(element as ts.Expression);
    assert.ok(ts.isStringLiteral(value), `${label}[${index}] must be a string literal.`);
    return value.text;
  });
}

function callFirstStringArray(expression: ts.Expression | null, callee: string, label: string): string[] {
  assert.ok(expression && ts.isArrayLiteralExpression(expression), `${label} must be an array literal.`);
  return expression.elements.map((element, index) => {
    const value = unwrapExpression(element as ts.Expression);
    assert.ok(ts.isCallExpression(value), `${label}[${index}] must be a ${callee}(...) call.`);
    assert.ok(ts.isIdentifier(value.expression) && value.expression.text === callee, `${label}[${index}] must call ${callee}.`);
    const first = value.arguments[0];
    assert.ok(first && ts.isStringLiteral(first), `${label}[${index}] must start with a string id.`);
    return first.text;
  });
}

function parseModelContracts(
  source: string,
  sourcePath: string,
  declarationName: string,
  kind: "primary" | "secondary"
): Readonly<Record<string, ParsedModelContract>> {
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findDeclaration = (node: ts.Node): ts.ObjectLiteralExpression | null => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === declarationName && node.initializer) {
      const initializer = unwrapExpression(node.initializer);
      assert.ok(ts.isObjectLiteralExpression(initializer), `${declarationName} must be an object literal.`);
      return initializer;
    }
    let found: ts.ObjectLiteralExpression | null = null;
    ts.forEachChild(node, (child) => {
      if (!found) found = findDeclaration(child);
    });
    return found;
  };
  const root = findDeclaration(sourceFile);
  assert.ok(root, `Missing ${declarationName} in ${sourcePath}.`);

  const parsed: Record<string, ParsedModelContract> = {};
  for (const property of root.properties) {
    assert.ok(ts.isPropertyAssignment(property), `${declarationName} entries must be property assignments.`);
    const labId = propertyName(property.name);
    assert.ok(labId, `${declarationName} contains a non-static lab id.`);
    const initializer = unwrapExpression(property.initializer);
    assert.ok(ts.isObjectLiteralExpression(initializer), `${declarationName}.${labId} must be an object literal.`);
    const gradeValue = propertyValue(initializer, "grade");
    const grade = gradeValue && ts.isStringLiteral(gradeValue) ? gradeValue.text : undefined;
    parsed[labId] = {
      grade,
      modeIds: kind === "secondary"
        ? callFirstStringArray(propertyValue(initializer, "modes"), "mode", `${labId}.modes`)
        : [],
      parameterIds: kind === "secondary"
        ? callFirstStringArray(propertyValue(initializer, "parameters"), "parameter", `${labId}.parameters`)
        : [],
      stateKeys: kind === "primary"
        ? stringArray(propertyValue(initializer, "stateKeys"), `${labId}.stateKeys`)
        : []
    };
  }
  return Object.freeze(parsed);
}

const primaryModelContracts = parseModelContracts(
  primarySource,
  primarySourcePath,
  "HK_PRIMARY_VISUALIZATION_CONTRACTS",
  "primary"
);
const secondaryModelContracts = parseModelContracts(
  secondarySource,
  secondarySourcePath,
  "HK_SECONDARY_MODEL_CONTRACTS",
  "secondary"
);

const contracts = Object.values(HK_VISUALIZATION_LESSON_CONTRACTS);
const sorted = (values: readonly string[]) => [...values].sort();

const expectedGradeCounts = {
  P1: 4,
  P2: 4,
  P3: 4,
  P4: 4,
  P5: 4,
  P6: 4,
  S1: 5,
  S2: 4,
  S3: 4,
  S4: 6,
  S5: 4,
  S6: 4
} as const;

function countsBy<K extends string>(values: readonly K[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function assertTopicScopedBranches(
  contract: HKVisualizationLessonContract,
  selectorName: string,
  selector: string
) {
  const branches = selector.split(",").map((branch) => branch.trim());
  for (const branch of branches) {
    assert.ok(
      branch.startsWith(contract.selectors.workspace),
      `${contract.labId} ${selectorName} branch is not topic-scoped: ${branch}`
    );
  }
}

test("lesson manifest is the exact immutable 22 + 22 + 7 registry partition with final grade counts", () => {
  const manifestIds = Object.keys(HK_VISUALIZATION_LESSON_CONTRACTS);

  assert.equal(manifestIds.length, 51);
  assert.equal(new Set(manifestIds).size, 51);
  assert.deepEqual(sorted(manifestIds), sorted(HK_VISUALIZATION_LAB_IDS));
  assert.deepEqual(countsBy(contracts.map((contract) => contract.kind)), {
    "primary-dedicated": 22,
    "secondary-dedicated": 22,
    "pass-through": 7
  });
  assert.deepEqual(countsBy(contracts.map((contract) => contract.grade)), expectedGradeCounts);

  for (const contract of contracts) {
    assert.equal(contract.kind, hkVisualizationLabRegistryKind(contract.labId));
  }
});

test("all 51 lesson contracts are deeply immutable data with duplicate-free selector inputs", () => {
  assert.ok(Object.isFrozen(HK_VISUALIZATION_LESSON_CONTRACTS));

  for (const contract of contracts) {
    assert.ok(Object.isFrozen(contract), `${contract.labId} contract must be frozen.`);
    assert.ok(Object.isFrozen(contract.modeIds), `${contract.labId} modeIds must be frozen.`);
    assert.ok(Object.isFrozen(contract.parameterIds), `${contract.labId} parameterIds must be frozen.`);
    assert.ok(Object.isFrozen(contract.controlIds), `${contract.labId} controlIds must be frozen.`);
    assert.ok(Object.isFrozen(contract.stateKeys), `${contract.labId} stateKeys must be frozen.`);
    assert.ok(Object.isFrozen(contract.selectors), `${contract.labId} selectors must be frozen.`);
    assert.ok(Object.isFrozen(contract.selectors.modes), `${contract.labId} mode selectors must be frozen.`);
    assert.ok(Object.isFrozen(contract.selectors.controls), `${contract.labId} control selectors must be frozen.`);
    assert.ok(Object.isFrozen(contract.lessonCopy), `${contract.labId} lesson copy must be frozen.`);
    assert.ok(Object.isFrozen(contract.lessonCopy.mustNotPromise), `${contract.labId} forbidden promises must be frozen.`);

    for (const [label, values] of [
      ["modeIds", contract.modeIds],
      ["parameterIds", contract.parameterIds],
      ["controlIds", contract.controlIds],
      ["stateKeys", contract.stateKeys],
      ["mode selectors", contract.selectors.modes],
      ["control selectors", contract.selectors.controls],
      ["forbidden promises", contract.lessonCopy.mustNotPromise]
    ] as const) {
      assert.equal(new Set(values).size, values.length, `${contract.labId} ${label} must not contain duplicates.`);
    }
  }

  const first = contracts[0];
  assert.throws(() => (first.modeIds as string[]).push("mutation-must-fail"), TypeError);
  assert.throws(() => {
    (first as { grade: string }).grade = "S6";
  }, TypeError);
});

test("range-domain manifest names exactly ten constrained labs and leaves every independent model null", () => {
  const expected = Object.freeze({
    "p1-counting-number-bonds": "number-bond-v1",
    "p1-addition-subtraction": "bounded-step-v1",
    "p2-money-time": "payment-at-least-price-v1",
    "p4-large-numbers": "divisor-within-number-v1",
    "p5-fractions-operations": "proper-fractions-v1",
    "p5-volume": "visible-layers-v1",
    angles: "triangle-validity-v1",
    "quadratic-patterns": "nonzero-quadratic-a-v1",
    "identities-square-patterns": "identity-positive-a-gt-b-v1",
    "p3-fractions-intro": "fraction-bar-numerator-v1"
  } as const);

  assert.deepEqual(
    Object.fromEntries(
      contracts
        .filter((contract) => contract.rangeDomainId !== null)
        .map((contract) => [contract.labId, contract.rangeDomainId])
    ),
    expected
  );
  assert.equal(contracts.filter((contract) => contract.rangeDomainId === null).length, 41);
  assert.equal(
    contracts.filter((contract) => contract.kind !== "pass-through" && contract.rangeDomainId !== null).length,
    9
  );
  assert.equal(
    contracts.filter((contract) => contract.kind === "pass-through" && contract.rangeDomainId !== null).length,
    1
  );
});

test("module and topic identity make shared-module state selectors topic-specific, including negative isolation pairs", () => {
  const uniqueSelectorFields: Array<keyof Pick<HKVisualizationLessonContract["selectors"], "workspace" | "model" | "state" | "reset">> = [
    "workspace",
    "model",
    "state",
    "reset"
  ];

  for (const contract of contracts) {
    assert.equal(contract.moduleId, "configured-visualization-lab");
    assert.equal(contract.topicId, contract.labId);
    assert.equal(hkVisualizationLessonContract(contract.labId), contract);
    assert.match(contract.selectors.workspace, new RegExp(`data-viz-active-lab-id="${contract.labId}"`));
    assert.match(contract.selectors.state, new RegExp(contract.labId));
    assert.match(contract.selectors.reset, /data-viz-reset-module-id="configured-visualization-lab"/);
    assert.match(contract.selectors.reset, new RegExp(`data-viz-reset-topic-id="${contract.labId}"`));
  }

  for (const invalidId of ["", "unknown-hk-topic", "__proto__", "constructor", "toString"]) {
    assert.equal(hkVisualizationLessonContract(invalidId), null);
  }

  for (const field of uniqueSelectorFields) {
    assert.equal(
      new Set(contracts.map((contract) => contract.selectors[field])).size,
      51,
      `Every topic must have a distinct ${field} selector even though all topics share one moduleId.`
    );
  }

  const firstTopic = HK_VISUALIZATION_LESSON_CONTRACTS["p1-counting-number-bonds"];
  const secondTopic = HK_VISUALIZATION_LESSON_CONTRACTS["p1-addition-subtraction"];
  assert.equal(firstTopic.moduleId, secondTopic.moduleId, "Negative fixture must share a moduleId.");
  assert.notEqual(firstTopic.topicId, secondTopic.topicId);
  assert.notEqual(firstTopic.selectors.state, secondTopic.selectors.state);
  assert.notEqual(firstTopic.selectors.reset, secondTopic.selectors.reset);

  const firstPassThrough = HK_VISUALIZATION_LESSON_CONTRACTS["p2-multiplication-foundations"];
  const secondPassThrough = HK_VISUALIZATION_LESSON_CONTRACTS["p3-fractions-intro"];
  assert.equal(firstPassThrough.moduleId, secondPassThrough.moduleId, "Pass-through negative fixture must share a moduleId.");
  assert.notEqual(firstPassThrough.topicId, secondPassThrough.topicId);
  assert.notEqual(firstPassThrough.selectors.state, secondPassThrough.selectors.state);
  assert.notEqual(firstPassThrough.selectors.reset, secondPassThrough.selectors.reset);
});

test("model, mode, control, state, reset, surface, and mark selectors are stable and fully topic-scoped", () => {
  for (const contract of contracts) {
    assert.equal(contract.selectors.modes.length, contract.modeIds.length);
    assert.equal(contract.selectors.controls.length, contract.controlIds.length);
    assert.ok(contract.stateKeys.length > 0, `${contract.labId} must declare at least one state key.`);

    for (const [index, selector] of contract.selectors.modes.entries()) {
      assert.ok(
        selector.startsWith(contract.kind === "pass-through" ? contract.selectors.workspace : contract.selectors.model),
        `${contract.labId} mode selector must stay inside its topic boundary.`
      );
      assert.match(selector, /\[data-viz-mode-button\]/);
      assert.match(
        selector,
        new RegExp(
          contract.kind === "pass-through"
            ? `data-viz-mode-id="${contract.modeIds[index]}"`
            : `data-viz-mode="${contract.modeIds[index]}"`
        )
      );
      if (contract.kind === "pass-through") {
        assert.doesNotMatch(
          selector,
          new RegExp(`data-viz-mode="${contract.modeIds[index]}"`),
          `${contract.labId} must bind Configured's string mode identity rather than its numeric mode value.`
        );
      }
    }
    for (const selector of contract.selectors.controls) {
      assert.ok(
        selector.startsWith(contract.kind === "pass-through" ? contract.selectors.workspace : contract.selectors.model),
        `${contract.labId} control selector must stay inside its topic boundary.`
      );
    }

    if (contract.kind === "pass-through") {
      assert.match(contract.selectors.model, /\[data-viz-configured-model\]/);
      assert.match(contract.selectors.state, /\[data-viz-configured-state\]/);
      assert.equal(contract.selectors.stateSummary, contract.selectors.state);
      assertTopicScopedBranches(contract, "surface", contract.selectors.surface);
      assertTopicScopedBranches(contract, "marks", contract.selectors.marks);
    } else {
      assert.match(contract.selectors.model, /data-hk-viz-model="(?:primary|secondary)-dedicated-v1"/);
      assert.match(contract.selectors.model, new RegExp(`data-hk-viz-topic="${contract.labId}"`));
      assert.ok(contract.selectors.state.startsWith(contract.selectors.model));
      assert.ok(contract.selectors.stateSummary.startsWith(contract.selectors.model));
      assert.ok(contract.selectors.reset.startsWith(contract.selectors.model));
      assert.ok(contract.selectors.surface.startsWith(contract.selectors.model));
      assert.ok(contract.selectors.marks.startsWith(contract.selectors.model));
    }
  }

  assert.deepEqual(HK_VISUALIZATION_LESSON_CONTRACTS["probability-s2"].controlIds, ["roll-1", "roll-20"]);
  assert.deepEqual(HK_VISUALIZATION_LESSON_CONTRACTS["probability-s2"].selectors.controls, [
    '[data-hk-viz-model="secondary-dedicated-v1"][data-hk-viz-topic="probability-s2"] [data-viz-roll="1"]',
    '[data-hk-viz-model="secondary-dedicated-v1"][data-hk-viz-topic="probability-s2"] [data-viz-roll="20"]'
  ]);
  assert.match(HK_VISUALIZATION_LESSON_CONTRACTS["trigonometry-basics"].selectors.controls[2], /button\[data-viz-reference-angle="left"\]/);
  assert.match(HK_VISUALIZATION_LESSON_CONTRACTS["trigonometry-basics"].selectors.controls[3], /button\[data-viz-reference-angle="upper"\]/);
  assert.deepEqual(HK_VISUALIZATION_LESSON_CONTRACTS.angles.controlIds.slice(-3), ["vertex-a", "vertex-b", "vertex-c"]);
  for (const vertex of ["a", "b", "c"]) {
    assert.ok(
      HK_VISUALIZATION_LESSON_CONTRACTS.angles.selectors.controls.some((selector) =>
        selector.includes(`[data-viz-name="angle-vertex-${vertex}"][role="button"]`)
      )
    );
  }
  for (const representation of ["diagram", "table", "equation", "graph"]) {
    assert.ok(
      HK_VISUALIZATION_LESSON_CONTRACTS["mixed-problem-solving"].selectors.controls.some((selector) =>
        selector.includes(`button[data-viz-representation="${representation}"]`)
      )
    );
  }
});

test("44 dedicated lesson contracts remain synchronized with their authoritative model sources", () => {
  assert.equal(HK_PRIMARY_DEDICATED_LAB_IDS.length, 22);
  assert.equal(Object.keys(primaryModelContracts).length, 22);
  for (const labId of HK_PRIMARY_DEDICATED_LAB_IDS) {
    const lessonContract = HK_VISUALIZATION_LESSON_CONTRACTS[labId];
    const modelContract = primaryModelContracts[labId];
    assert.ok(modelContract, `${labId} is missing from the primary model source.`);
    assert.equal(lessonContract.kind, "primary-dedicated");
    assert.equal(lessonContract.grade, modelContract.grade);
    assert.deepEqual(lessonContract.stateKeys, modelContract.stateKeys, `${labId} state keys drifted from the primary model contract.`);
  }
  assert.deepEqual(
    HK_VISUALIZATION_LESSON_CONTRACTS["p5-charts-averages"].stateKeys,
    ["selectedCategory", "firstSeries", "secondSeries"],
    "The composite-chart manifest must expose the complete learner-edited series arrays serialized by the live model.",
  );

  assert.equal(HK_SECONDARY_DEDICATED_LAB_IDS.length, 22);
  assert.equal(Object.keys(secondaryModelContracts).length, 22);
  for (const labId of HK_SECONDARY_DEDICATED_LAB_IDS) {
    const lessonContract = HK_VISUALIZATION_LESSON_CONTRACTS[labId];
    const modelContract = secondaryModelContracts[labId];
    assert.ok(modelContract, `${labId} is missing from the secondary model source.`);
    const modelModeIds = modelContract.modeIds;
    const modelParameterIds = modelContract.parameterIds;
    assert.equal(lessonContract.kind, "secondary-dedicated");
    assert.deepEqual(lessonContract.modeIds, modelModeIds, `${labId} mode IDs drifted from the secondary model contract.`);
    assert.deepEqual(lessonContract.parameterIds, modelParameterIds, `${labId} parameter IDs drifted from the secondary model contract.`);
    assert.deepEqual(
      lessonContract.stateKeys,
      [...modelParameterIds, "activeMode"],
      `${labId} state keys must identify the serialized secondary numeric state and active mode.`
    );
  }

  assert.match(primarySource, /data-hk-viz-model="primary-dedicated-v1"/);
  assert.match(primarySource, /data-hk-viz-topic=\{lab\.labId\}/);
  assert.match(primarySource, /data-hk-viz-state=\{JSON\.stringify\(currentState\)\}/);
  assert.match(primarySource, /data-hk-viz-state-keys=\{JSON\.stringify\(HK_PRIMARY_VISUALIZATION_CONTRACTS\[lab\.labId\]\.stateKeys\)\}/);
  assert.match(primarySource, /data-viz-mode-button/);
  assert.match(primarySource, /data-viz-mode=\{option\.value\}/);
  assert.match(primarySource, /data-viz-parameter=\{controlId\}/);
  assert.match(primarySource, /data-viz-reset-module-id="configured-visualization-lab"/);
  assert.match(primarySource, /data-viz-reset-topic-id=\{topicId\s*\?\?\s*undefined\}/);
  assert.match(primarySource, /zhHans === undefined \? \{ en, zh \} : \{ en, zh, zhHans \}/);
  assert.doesNotMatch(primarySource, /zhHans = zh/);

  assert.match(secondarySource, /data-hk-viz-model="secondary-dedicated-v1"/);
  assert.match(secondarySource, /data-hk-viz-topic=\{lab\.labId\}/);
  assert.match(secondarySource, /data-hk-viz-state=\{JSON\.stringify\(state\)\}/);
  assert.match(secondarySource, /data-hk-viz-state-keys=\{JSON\.stringify\(\[\.\.\.contract\.parameters\.map\(\(item\) => item\.id\), "activeMode"\]\)\}/);
  assert.match(secondarySource, /data-viz-mode-button/);
  assert.match(secondarySource, /data-viz-mode=\{item\.id\}/);
  assert.match(secondarySource, /data-viz-parameter=\{definition\.id\}/);
  assert.match(secondarySource, /<VisualizationResetButton moduleId="configured-visualization-lab"[\s\S]*topicId=\{lab\.labId\}/);
  assert.match(secondarySource, /zhHans === undefined \? \{ en, zh \} : \{ en, zh, zhHans \}/);
  assert.doesNotMatch(secondarySource, /zhHans = zh/);
});

test("A18 final routing keeps legacy S4 capabilities separate from the two new S3 capabilities", () => {
  const legacyQuadratic = HK_VISUALIZATION_LESSON_CONTRACTS["quadratic-patterns"];
  const legacyCircles = HK_VISUALIZATION_LESSON_CONTRACTS.circles;
  const newIdentities = HK_VISUALIZATION_LESSON_CONTRACTS["identities-square-patterns"];
  const newSector = HK_VISUALIZATION_LESSON_CONTRACTS["arc-length-sector-area"];

  assert.equal(legacyQuadratic.grade, "S4");
  assert.match(legacyQuadratic.lessonCopy.mustPromise, /Quadratic Functions.*a≠0.*vertex.*axis.*real roots/i);
  assert.ok(legacyQuadratic.lessonCopy.mustNotPromise.some((promise) => /S3 square-identity/i.test(promise)));

  assert.equal(legacyCircles.grade, "S4");
  assert.match(legacyCircles.lessonCopy.mustPromise, /Circle Geometry.*chord.*tangent.*same-arc/i);
  assert.ok(legacyCircles.lessonCopy.mustNotPromise.some((promise) => /S3 sector-area/i.test(promise)));

  assert.equal(newIdentities.grade, "S3");
  assert.deepEqual(newIdentities.modeIds, ["square-sum", "square-difference", "difference-of-squares"]);
  assert.match(newIdentities.lessonCopy.mustPromise, /\(a\+b\)²\s*≡\s*a²\+2ab\+b²/);
  assert.match(newIdentities.lessonCopy.mustPromise, /\(a−b\)²\s*≡\s*a²−2ab\+b²/);
  assert.match(newIdentities.lessonCopy.mustPromise, /a²−b²\s*≡\s*\(a−b\)\(a\+b\)/);
  assert.ok(newIdentities.lessonCopy.mustNotPromise.some((promise) => /parabola.*vertex.*roots.*axis.*opening/i.test(promise)));

  assert.equal(newSector.grade, "S3");
  assert.match(newSector.lessonCopy.mustPromise, /θ\/360.*arc length.*sector area.*exact π.*square units.*full-circle/i);
  assert.ok(newSector.lessonCopy.mustNotPromise.some((promise) => /tangent.*circumference-angle/i.test(promise)));
});

test("lesson copy constraints are non-empty, conservative, and retain all curriculum-sequencing guardrails", () => {
  for (const contract of contracts) {
    assert.ok(contract.lessonCopy.mustPromise.trim().length >= 24, `${contract.labId} needs a concrete positive lesson promise.`);
    assert.ok(contract.lessonCopy.mustNotPromise.length > 0, `${contract.labId} needs at least one conservative forbidden promise.`);
    for (const forbidden of contract.lessonCopy.mustNotPromise) {
      assert.ok(forbidden.trim().length >= 6, `${contract.labId} contains a vague forbidden promise.`);
      assert.notEqual(forbidden.trim(), contract.lessonCopy.mustPromise.trim());
    }
  }

  const forbiddenText = (labId: keyof typeof HK_VISUALIZATION_LESSON_CONTRACTS) =>
    HK_VISUALIZATION_LESSON_CONTRACTS[labId].lessonCopy.mustNotPromise.join(" | ");

  assert.match(forbiddenText("p2-length-data"), /bar charts.*icon multiplier other than one.*decimal metres or formal simple-to-compound conversion/);
  assert.match(forbiddenText("p3-geometry-patterns"), /growing pattern or general term.*line symmetry.*angle comparison or classification/);
  assert.match(forbiddenText("p3-measurement"), /mean or trend.*pictogram substituted/);
  assert.match(forbiddenText("p4-large-numbers"), /place-value comparison or rounding.*HCF × LCM.*prime factorisation/);
  assert.match(forbiddenText("p4-angles"), /converse.*degree measurement or angle classification.*fixed square-corner comparison/);
  assert.match(forbiddenText("p5-fractions-operations"), /same-denominator-only.*equivalence-only/);
  assert.match(forbiddenText("p5-rates"), /formal speed or journey graphs/);
  assert.match(forbiddenText("p5-charts-averages"), /mean as the core P5 model/);
  assert.match(forbiddenText("p6-percentages"), /unknown original amount.*percentage increase from old and new values.*successive or compound/);
  assert.match(forbiddenText("p6-ratio-proportion"), /ratio notation or direct\/inverse proportion.*unordered categories or extrapolating/);
  assert.match(forbiddenText("integers"), /coordinate-plane substitute/);
  assert.match(forbiddenText("angles"), /independent rays/);
  assert.match(forbiddenText("coordinates"), /reflection compounded/);
  assert.match(forbiddenText("transformations"), /compound transforms.*reflection with dy.*off-origin dilation/);
  assert.match(forbiddenText("probability-s2"), /guaranteed convergence/);
  assert.match(forbiddenText("polynomials"), /function-family graph/);
  assert.match(forbiddenText("functions"), /quadratic-only controls/);
  assert.match(forbiddenText("statistics-s6"), /without an observed x/);
  assert.match(forbiddenText("mixed-problem-solving"), /generic function-family graph.*inaccurate premium 3D promise/);
});

test("official P2 and P3 primary replacements expose only their approved capability sets", () => {
  const pictogram = HK_VISUALIZATION_LESSON_CONTRACTS["p2-length-data"];
  assert.deepEqual(pictogram.modeIds, ["metres", "pictogram", "desk", "classroom-width", "playground-path", "metre-ruler", "tape-measure", "trundle-wheel"]);
  assert.deepEqual(pictogram.parameterIds, ["estimateCm", "measuredCm", "pictogramBlueCount"]);
  assert.deepEqual(pictogram.stateKeys, ["displayMode", "target", "tool", "estimateCm", "measuredCm", "measuredMetres", "measuredRemainderCm", "pictogramBlueCount"]);
  assert.match(pictogram.lessonCopy.mustPromise, /1 m = 100 cm.*estimate then measure.*metre ruler.*measuring tape.*trundle wheel.*one icon represents one object/i);
  assert.doesNotMatch(`${pictogram.modeIds.join(" ")} ${pictogram.lessonCopy.mustPromise}`, /bar|mean|average|decimal/i);

  const measurement = HK_VISUALIZATION_LESSON_CONTRACTS["p3-measurement"];
  assert.deepEqual(measurement.modeIds, ["measurement", "bar-chart", "length", "mass", "capacity", "small", "large", "A", "B", "C", "D"]);
  assert.deepEqual(measurement.parameterIds, ["baseValue"]);
  assert.deepEqual(measurement.stateKeys, ["model", "quantityType", "baseValue", "unit", "selectedCategory"]);
  assert.match(measurement.lessonCopy.mustPromise, /metric units.*categorical bar heights.*zero-based shared numerical scale/i);
  assert.doesNotMatch(measurement.lessonCopy.mustPromise, /mean|average|trend|pictogram/i);

  const shapes = HK_VISUALIZATION_LESSON_CONTRACTS["p3-geometry-patterns"];
  assert.deepEqual(shapes.stateKeys, ["shapeFamily", "shapeType"]);
  assert.deepEqual(shapes.modeIds.slice(0, 2), ["quadrilateral", "triangle"]);
  assert.deepEqual(
    shapes.modeIds.slice(2),
    ["rectangle", "square", "parallelogram", "trapezium", "triangle-different", "triangle-two-equal", "triangle-three-equal"]
  );
  assert.equal(shapes.parameterIds.length, 0);
  assert.match(shapes.lessonCopy.mustPromise, /concrete quadrilaterals and triangles.*side and vertex counts.*property marks/i);
  assert.doesNotMatch(`${shapes.modeIds.join(" ")} ${shapes.lessonCopy.mustPromise}`, /stage|general term|symmetr|\bangle\b|degree|2n\+1/i);
});

test("official P4 and P6 replacements expose only the final EDB-aligned capability sets", () => {
  const factors = HK_VISUALIZATION_LESSON_CONTRACTS["p4-large-numbers"];
  assert.deepEqual(factors.modeIds, ["factor-pairs", "common-hcf-lcm"]);
  assert.deepEqual(factors.parameterIds, ["firstNumber", "secondNumber", "candidateDivisor"]);
  assert.deepEqual(factors.stateKeys, ["mode", "firstNumber", "secondNumber", "candidateDivisor"]);
  assert.match(factors.lessonCopy.mustPromise, /positive integers.*complete factor pairs.*zero remainder.*HCF.*greatest common factor.*LCM.*least positive common multiple.*1 as neither prime nor composite/i);
  assert.doesNotMatch(factors.lessonCopy.mustPromise, /round|nearest|six-digit|place value/i);

  const quadrilaterals = HK_VISUALIZATION_LESSON_CONTRACTS["p4-angles"];
  assert.deepEqual(quadrilaterals.modeIds, ["families", "composition", "parallelogram", "rectangle", "rhombus", "square", "rectangle-diagonal", "square-diagonal", "trapeziums-rectangle"]);
  assert.deepEqual(quadrilaterals.stateKeys, ["mode", "familyShape", "composition", "rightAngleCount"]);
  assert.match(quadrilaterals.lessonCopy.mustPromise, /visible equal-side, parallel-side, and right-angle marks.*every square is a rectangle and rhombus.*parallelograms.*split by a diagonal.*right trapeziums forming a rectangle/i);
  assert.doesNotMatch(quadrilaterals.lessonCopy.mustPromise, /smaller than|larger than|degrees?|180/i);

  const percentages = HK_VISUALIZATION_LESSON_CONTRACTS["p6-percentages"];
  assert.deepEqual(percentages.modeIds, ["equivalence", "given-change", "increase", "decrease"]);
  assert.deepEqual(percentages.parameterIds, ["percent", "baseAmount"]);
  assert.deepEqual(percentages.stateKeys, ["mode", "percent", "baseAmount", "direction"]);
  assert.match(percentages.lessonCopy.mustPromise, /given base and given percentage.*change = base × p\/100.*final = base ± change/i);
  assert.doesNotMatch(percentages.lessonCopy.mustPromise, /unknown original|old and new values|reverse percentage/i);

  const averages = HK_VISUALIZATION_LESSON_CONTRACTS["p6-ratio-proportion"];
  assert.deepEqual(averages.modeIds, ["mean-fair-share", "broken-line", "1", "2"]);
  assert.deepEqual(averages.parameterIds, ["value1", "value2", "value3", "value4", "seriesBShift"]);
  assert.deepEqual(averages.stateKeys, ["mode", "value1", "value2", "value3", "value4", "seriesCount", "seriesBShift"]);
  assert.match(averages.lessonCopy.mustPromise, /mean = total ÷ count.*fair sharing.*one or two ordered continuous-time data series.*table.*axes.*adjacent broken-line segments.*plotted points.*mean readouts/i);
  assert.doesNotMatch(averages.lessonCopy.mustPromise, /ratio notation|direct proportion|inverse proportion|extrapolat/i);

  const budgetProblem = HK_VISUALIZATION_LESSON_CONTRACTS["p6-pre-secondary-problem-solving"];
  assert.match(budgetProblem.lessonCopy.mustPromise, /non-negative remaining.*positive overspend/i);
  assert.doesNotMatch(budgetProblem.lessonCopy.mustPromise, /with positive remaining or positive overspend/i);
});

test("all seven pass-through contracts declare the exact Configured selector integration boundary", () => {
  assert.equal(HK_PASS_THROUGH_LAB_IDS.length, 7);
  for (const labId of HK_PASS_THROUGH_LAB_IDS) {
    const contract = HK_VISUALIZATION_LESSON_CONTRACTS[labId];
    assert.equal(contract.kind, "pass-through");
    assert.equal(contract.selectors.workspace, `[data-viz-active-lab-id="${labId}"]`);
    assert.match(contract.selectors.model, /\[data-viz-configured-model\]/);
    assert.match(contract.selectors.state, /\[data-viz-configured-state\]/);
    assert.equal(contract.controlIds.length, contract.parameterIds.length);
    assert.equal(contract.selectors.controls.length, contract.parameterIds.length);
    assert.equal(contract.selectors.modes.length, contract.modeIds.length);
    assertTopicScopedBranches(contract, "surface", contract.selectors.surface);
    assertTopicScopedBranches(contract, "marks", contract.selectors.marks);
  }
  assert.deepEqual(
    HK_VISUALIZATION_LESSON_CONTRACTS["p3-fractions-intro"].selectors.modes,
    ["fraction", "equivalent", "compare"].map(
      (modeId) =>
        `[data-viz-active-lab-id="p3-fractions-intro"] [data-viz-mode-button][data-viz-mode-id="${modeId}"]`
    )
  );
});

test("four pass-through contracts stay inside the latest lesson-safe surface and exclude unproven broad modes", () => {
  const multiplication =
    HK_VISUALIZATION_LESSON_CONTRACTS["p2-multiplication-foundations"];
  assert.deepEqual(multiplication.modeIds, []);
  assert.deepEqual(multiplication.stateKeys, ["rows", "columns", "total"]);
  assert.match(
    multiplication.lessonCopy.mustPromise,
    /rows.*columns.*object total.*rows × columns/i,
  );
  assert.match(
    multiplication.lessonCopy.mustNotPromise.join(" | "),
    /formal area.*square units.*repeated addition/i,
  );

  const advanced = HK_VISUALIZATION_LESSON_CONTRACTS["advanced-functions"];
  assert.deepEqual(advanced.modeIds, []);
  assert.deepEqual(advanced.stateKeys, ["family", "scale", "verticalShift"]);
  assert.match(
    advanced.lessonCopy.mustPromise,
    /selected function curve.*formula.*scale.*vertical shift/i,
  );
  assert.match(
    advanced.lessonCopy.mustNotPromise.join(" | "),
    /controlled cross-family comparison.*wave.*synchronized/i,
  );

  for (const labId of ["differentiation-intro", "calculus"] as const) {
    const contract = HK_VISUALIZATION_LESSON_CONTRACTS[labId];
    assert.deepEqual(contract.modeIds, []);
    assert.deepEqual(contract.stateKeys, ["curvature", "probeX", "slope"]);
    assert.match(
      contract.lessonCopy.mustPromise,
      /selected point.*tangent.*local gradient.*plotted curve/i,
    );
    assert.match(
      contract.lessonCopy.mustNotPromise.join(" | "),
      /secant.*accumulated area/i,
    );
  }
});

test("fixed HK distribution summaries do not declare phantom learner mode selectors", () => {
  for (const labId of ["statistics-s1", "data-handling"] as const) {
    const contract = HK_VISUALIZATION_LESSON_CONTRACTS[labId];
    assert.deepEqual(contract.modeIds, []);
    assert.deepEqual(contract.selectors.modes, []);
    assert.deepEqual(contract.stateKeys, ["mean", "spread"]);
  }
});

test("production hosts expose the pass-through selector, dedicated dispatcher, and topic-isolated reset contract", () => {
  const requirements: Array<readonly [label: string, pattern: RegExp]> = [
    ["configured model root (`data-viz-configured-model`)", /\bdata-viz-configured-model(?:=|\s|>)/],
    ["serialized configured state (`data-viz-configured-state`)", /\bdata-viz-configured-state(?:=|\s|>)/],
    ["semantic mode value (`data-viz-mode`)", /\bdata-viz-mode=(?:"|\{)/],
    ["semantic string mode ID (`data-viz-mode-id`)", /\bdata-viz-mode-id=(?:"|\{)/],
    ["stable parameter ID (`data-viz-parameter`)", /\bdata-viz-parameter=(?:"|\{)/],
    ["reset module identity (`data-viz-reset-module-id`)", /\bdata-viz-reset-module-id=(?:"|\{)/],
    ["reset topic identity (`data-viz-reset-topic-id`)", /\bdata-viz-reset-topic-id=(?:"|\{)/]
  ];
  const missing = requirements
    .filter(([, pattern]) => !pattern.test(configuredSource))
    .map(([label]) => label);
  const consumesHkDedicatedDispatcher =
    /(?:from\s+["'][^"']*\/hk\/HKVisualizationLab["']|import\(\s*["'][^"']*\/hk\/HKVisualizationLab["']\s*\))/.test(configuredSource)
    && /<(?:Dynamic)?HKVisualizationLab\b/.test(configuredSource)
    && /(?:isHKPrimaryDedicatedLabId|isHKSecondaryDedicatedLabId|hkVisualizationLabRegistryKind|HK_(?:PRIMARY|SECONDARY)_DEDICATED_LAB_ID_SET)/.test(configuredSource);
  if (!consumesHkDedicatedDispatcher) {
    missing.push("HK dedicated production dispatcher with explicit 44/7 routing");
  }
  if (!/\bdata-viz-active-lab-id=(?:"|\{)/.test(visualizationLabPageSource)) {
    missing.push("standalone Visualization Lab active-lab identity owner");
  }
  if (!/\bdata-viz-active-lab-id=(?:"|\{)/.test(lessonViewSource)
    && !/\bdata-viz-active-lab-id=(?:"|\{)/.test(configuredSource)) {
    missing.push("LessonView active-lab identity owner");
  }

  assert.deepEqual(
    missing,
    [],
    `Configured/LessonView integration is incomplete. Missing ${missing.join(", ")}. `
      + "This gate must remain RED until the shared ConfiguredVisualizationLab owner releases the file and A06 integrates the 51-topic selector/state-isolation contract."
  );
});
