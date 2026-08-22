import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { activeHongKongQuestionIdByHistoricalId, questions } from "../data/questions";
import { mainlandPepJuniorDroppedGraphQuestionIds } from "../data/mainlandPepJuniorQuestions";
import { questionFigureSemanticElements } from "../components/practice/questionFigureSemantics";
import { deriveGraphAnswer, isExpectedAnswerRepresented } from "./questionBankSolvability";
import {
  buildBarChartLayout,
  buildCoordinateGridLayout,
  buildNumberLineLayout,
  buildPlaneFigureLayout,
  buildSolidFigureLayout,
  buildTenFrameLayout,
  buildQuestionDiagramSemanticSummary,
  normalizeQuestionDiagram,
  numberLinePointValue,
  planeFigureAngleDegrees,
  planeFigureSegmentLength,
  questionDiagramAltText,
  solidFigureCuboidVolume,
  solidFigureUnitText,
  tenFrameEmptySpots,
  tenFrameRenderedCounts,
  validateQuestionDiagram
} from "./questionFigure";
import type { FigureTextResolver } from "./questionFigure";
import type { PlaneFigureQuestionDiagram, Question } from "@/types";

const englishText: FigureTextResolver = (value) => (typeof value === "string" ? value : value.en);

const validCoordinateGridPayload = {
  kind: "coordinate-grid",
  xRange: [0, 6],
  yRange: [0, 8],
  xAxisLabel: { en: "Time (s)", zh: "時間（秒）" },
  yAxisLabel: { en: "Distance (m)", zh: "距離（米）" },
  xTickInterval: 2,
  yTickInterval: 2,
  points: [
    { id: "point-a", label: "A", x: 1, y: 2 },
    { id: "point-b", label: "B", x: 5, y: 6 }
  ],
  lines: [
    {
      id: "line-ab",
      label: { en: "Journey AB", zh: "路程 AB" },
      points: [{ x: 1, y: 2 }, { x: 5, y: 6 }]
    }
  ]
} as const;

const validBarChartPayload = {
  kind: "bar-chart",
  mode: "grouped",
  title: { en: "Books read", zh: "閱讀書籍" },
  xAxisLabel: { en: "Class", zh: "班別" },
  yAxisLabel: { en: "Books", zh: "書籍數量" },
  yRange: [0, 10],
  tickInterval: 2,
  series: [
    { id: "girls", label: { en: "Girls", zh: "女生" } },
    { id: "boys", label: { en: "Boys", zh: "男生" } }
  ],
  categories: [
    { id: "class-a", label: { en: "Class A", zh: "甲班" }, values: { girls: 8, boys: 6 } },
    { id: "class-b", label: { en: "Class B", zh: "乙班" }, values: { girls: 7, boys: 9 } }
  ]
} as const;

function questionById(id: string): Question {
  const activeId = activeHongKongQuestionIdByHistoricalId.get(id) ?? id;
  const question = questions.find((candidate) => candidate.id === activeId);
  assert.ok(question, `Expected active question ${activeId} for ${id} to exist in the bank`);
  return question;
}

const straightLineAngleDiagram: PlaneFigureQuestionDiagram = {
  kind: "plane-figure",
  points: [
    { id: "A", x: -4, y: 0, label: "A" },
    { id: "O", x: 0, y: 0, label: "O" },
    { id: "B", x: 4, y: 0, label: "B" },
    { id: "C", x: 2.25, y: 2.681, label: "C" }
  ],
  segments: [
    { from: "A", to: "B" },
    { from: "O", to: "C" }
  ],
  angleMarks: [
    { vertexId: "O", fromId: "A", toId: "C", label: { en: "130°", zh: "130°" } },
    { vertexId: "O", fromId: "C", toId: "B", arcs: 2, label: { en: "x", zh: "x" } }
  ]
};

test("normalizeQuestionDiagram accepts every diagram kind and rebuilds clean objects", () => {
  const planeFigure = normalizeQuestionDiagram(straightLineAngleDiagram);
  assert.equal(planeFigure?.kind, "plane-figure");

  const numberLine = normalizeQuestionDiagram({
    kind: "number-line",
    range: [3, 4],
    tickInterval: 0.1,
    points: [{ value: 3.7, label: "P" }]
  });
  assert.equal(numberLine?.kind, "number-line");

  const solid = normalizeQuestionDiagram({
    kind: "solid-figure",
    shape: "cuboid",
    width: 4,
    depth: 3,
    height: 2,
    labels: { width: { en: "4 cm", zh: "4 厘米" } }
  });
  assert.equal(solid?.kind, "solid-figure");
  if (solid?.kind === "solid-figure") {
    assert.equal(solid.labels?.width?.zhHans, "4 厘米");
  }

  const grid = normalizeQuestionDiagram({
    kind: "coordinate-grid",
    xRange: [0, 5],
    yRange: [0, 5],
    xAxisLabel: { en: "x", zh: "x 軸" },
    yAxisLabel: { en: "y", zh: "y 軸" },
    points: [{ id: "point-a", label: "A", x: 1, y: 1 }],
    lines: [{ id: "line-ab", label: { en: "AB", zh: "AB" }, points: [{ x: 1, y: 1 }, { x: 4, y: 4 }] }]
  });
  assert.equal(grid?.kind, "coordinate-grid");

  const tenFrame = normalizeQuestionDiagram({
    kind: "ten-frame",
    groups: [
      { count: 5, tone: "red" },
      { count: 1, tone: "blue" }
    ]
  });
  assert.equal(tenFrame?.kind, "ten-frame");
});

test("coordinate-grid normalization enforces bounded bilingual semantic data", () => {
  const normalized = normalizeQuestionDiagram(validCoordinateGridPayload);
  assert.ok(normalized && normalized.kind === "coordinate-grid");
  assert.deepEqual(normalized.xAxisLabel, { en: "Time (s)", zh: "時間（秒）", zhHans: "時間（秒）" });
  assert.equal(normalized.lines?.[0].label.zh, "路程 AB");

  const invalidPayloads: unknown[] = [
    { ...validCoordinateGridPayload, xAxisLabel: undefined },
    { ...validCoordinateGridPayload, yAxisLabel: { en: "Distance" } },
    { ...validCoordinateGridPayload, xRange: [2, 2] },
    { ...validCoordinateGridPayload, yRange: [0, Number.NaN] },
    { ...validCoordinateGridPayload, xTickInterval: 0 },
    { ...validCoordinateGridPayload, yTickInterval: Number.POSITIVE_INFINITY },
    { ...validCoordinateGridPayload, xTickInterval: 7 },
    { ...validCoordinateGridPayload, points: [{ label: "P", x: 1, y: 2 }] },
    { ...validCoordinateGridPayload, points: [{ id: "not-finite", label: "P", x: Number.NaN, y: 2 }] },
    { ...validCoordinateGridPayload, points: [{ id: "outside", label: "P", x: 7, y: 2 }] },
    {
      ...validCoordinateGridPayload,
      lines: [{ id: "outside-line", label: { en: "Outside", zh: "界外" }, points: [{ x: 0, y: 0 }, { x: 7, y: 2 }] }]
    },
    {
      ...validCoordinateGridPayload,
      points: [{ id: "same", label: "A", x: 1, y: 1 }, { id: "same", label: "B", x: 2, y: 2 }]
    },
    {
      ...validCoordinateGridPayload,
      points: [{ id: "one", label: "A", x: 1, y: 1 }, { id: "two", label: "A", x: 2, y: 2 }]
    },
    {
      ...validCoordinateGridPayload,
      lines: [
        { id: "same", label: { en: "First", zh: "第一" }, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
        { id: "same", label: { en: "Second", zh: "第二" }, points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }
      ]
    },
    {
      ...validCoordinateGridPayload,
      lines: [
        { id: "first", label: { en: "Same", zh: "相同" }, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
        { id: "second", label: { en: "Same", zh: "相同" }, points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }
      ]
    },
    {
      ...validCoordinateGridPayload,
      lines: [{ id: "unlabelled", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }]
    },
    {
      ...validCoordinateGridPayload,
      lines: [{ id: "not-bilingual", label: { en: "English only" }, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }]
    },
    {
      ...validCoordinateGridPayload,
      lines: [{ label: { en: "No ID", zh: "沒有 ID" }, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }]
    },
    {
      ...validCoordinateGridPayload,
      lines: [{ id: "not-finite", label: { en: "Not finite", zh: "非有限數" }, points: [{ x: 0, y: 0 }, { x: Number.POSITIVE_INFINITY, y: 1 }] }]
    },
    {
      ...validCoordinateGridPayload,
      lines: [{ id: "short", label: { en: "Short", zh: "太短" }, points: [{ x: 0, y: 0 }] }]
    }
  ];

  invalidPayloads.forEach((payload, index) => {
    assert.equal(normalizeQuestionDiagram(payload), undefined, `invalid coordinate payload ${index} was accepted`);
  });
});

test("bar-chart normalization enforces series/category cardinality and exact values", () => {
  const normalized = normalizeQuestionDiagram(validBarChartPayload);
  assert.ok(normalized && normalized.kind === "bar-chart");
  assert.equal(normalized.categories[1].values.boys, 9);
  const single = normalizeQuestionDiagram({
    ...validBarChartPayload,
    mode: "single",
    series: [validBarChartPayload.series[0]],
    categories: validBarChartPayload.categories.map((category) => ({
      ...category,
      values: { girls: category.values.girls }
    }))
  });
  assert.ok(single && single.kind === "bar-chart" && single.mode === "single");

  const invalidPayloads: unknown[] = [
    { ...validBarChartPayload, mode: "stacked" },
    { ...validBarChartPayload, title: { en: "Books read" } },
    { ...validBarChartPayload, xAxisLabel: { en: "Class" } },
    { ...validBarChartPayload, yAxisLabel: { zh: "書籍數量" } },
    { ...validBarChartPayload, yRange: [1, 10] },
    { ...validBarChartPayload, yRange: [0, 0] },
    { ...validBarChartPayload, yRange: [0, Number.POSITIVE_INFINITY] },
    { ...validBarChartPayload, tickInterval: 0 },
    { ...validBarChartPayload, tickInterval: Number.POSITIVE_INFINITY },
    { ...validBarChartPayload, tickInterval: 11 },
    { ...validBarChartPayload, series: [] },
    { ...validBarChartPayload, mode: "single", series: validBarChartPayload.series },
    { ...validBarChartPayload, mode: "grouped", series: [validBarChartPayload.series[0]] },
    { ...validBarChartPayload, categories: [] },
    {
      ...validBarChartPayload,
      series: [validBarChartPayload.series[0], { id: "girls", label: { en: "Other", zh: "其他" } }]
    },
    {
      ...validBarChartPayload,
      series: [validBarChartPayload.series[0], { label: { en: "No ID", zh: "沒有 ID" } }]
    },
    {
      ...validBarChartPayload,
      series: [validBarChartPayload.series[0], { id: "not-bilingual", label: { en: "English only" } }]
    },
    {
      ...validBarChartPayload,
      series: [validBarChartPayload.series[0], { id: "other", label: { en: "Girls", zh: "女生" } }]
    },
    {
      ...validBarChartPayload,
      categories: [validBarChartPayload.categories[0], { ...validBarChartPayload.categories[1], id: "class-a" }]
    },
    {
      ...validBarChartPayload,
      categories: [{ label: { en: "No ID", zh: "沒有 ID" }, values: { girls: 8, boys: 6 } }]
    },
    {
      ...validBarChartPayload,
      categories: [{ id: "not-bilingual", label: { en: "English only" }, values: { girls: 8, boys: 6 } }]
    },
    {
      ...validBarChartPayload,
      categories: [validBarChartPayload.categories[0], { ...validBarChartPayload.categories[1], label: { en: "Class A", zh: "甲班" } }]
    },
    {
      ...validBarChartPayload,
      categories: [{ ...validBarChartPayload.categories[0], values: { girls: 8 } }]
    },
    {
      ...validBarChartPayload,
      categories: [{ ...validBarChartPayload.categories[0], values: { girls: 8, boys: 6, teachers: 1 } }]
    },
    {
      ...validBarChartPayload,
      categories: [{ ...validBarChartPayload.categories[0], values: { girls: -1, boys: 6 } }]
    },
    {
      ...validBarChartPayload,
      categories: [{ ...validBarChartPayload.categories[0], values: { girls: Number.NaN, boys: 6 } }]
    },
    {
      ...validBarChartPayload,
      categories: [{ ...validBarChartPayload.categories[0], values: { girls: 11, boys: 6 } }]
    }
  ];

  invalidPayloads.forEach((payload, index) => {
    assert.equal(normalizeQuestionDiagram(payload), undefined, `invalid bar-chart payload ${index} was accepted`);
  });
});

test("coordinate-grid and bar-chart layouts honor deterministic tick and bar geometry", () => {
  const coordinate = normalizeQuestionDiagram(validCoordinateGridPayload);
  assert.ok(coordinate && coordinate.kind === "coordinate-grid");
  const coordinateLayout = buildCoordinateGridLayout(coordinate);
  assert.deepEqual(coordinateLayout.xTicks, [0, 2, 4, 6]);
  assert.deepEqual(coordinateLayout.yTicks, [0, 2, 4, 6, 8]);
  assert.equal(coordinateLayout.renderedLines[0].lineKey, "line-ab");

  const barChart = normalizeQuestionDiagram(validBarChartPayload);
  assert.ok(barChart && barChart.kind === "bar-chart");
  const first = buildBarChartLayout(barChart, englishText);
  const second = buildBarChartLayout(barChart, englishText);
  assert.deepEqual(first, second);
  assert.deepEqual(first.yTicks.map((tick) => tick.value), [0, 2, 4, 6, 8, 10]);
  assert.equal(first.bars.length, 4);
  assert.equal(new Set(first.bars.map((bar) => bar.fill)).size, 2);
  assert.ok(first.bars.every((bar) => bar.x >= first.plot.left && bar.x + bar.width <= first.plot.left + first.plot.width));
  assert.ok(first.bars.every((bar) => bar.y >= first.plot.top && bar.y + bar.height === first.plot.top + first.plot.height));
  assert.deepEqual(first.legend.map((entry) => entry.text), ["Girls", "Boys"]);
});

test("semantic summaries expose complete localized coordinate and bar-chart tables", () => {
  const coordinate = normalizeQuestionDiagram(validCoordinateGridPayload);
  assert.ok(coordinate && coordinate.kind === "coordinate-grid");
  const coordinateEn = buildQuestionDiagramSemanticSummary(coordinate, "en");
  const coordinateZh = buildQuestionDiagramSemanticSummary(coordinate, "zh");
  assert.ok(coordinateEn.caption.includes("Coordinate grid"));
  assert.ok(coordinateZh.caption.includes("座標網格"));
  assert.deepEqual(coordinateEn.table?.headers, ["Element", "Label", "Values"]);
  assert.deepEqual(coordinateZh.table?.headers, ["元素", "標籤", "數值"]);
  assert.deepEqual(coordinateEn.table?.rows.map((row) => row.key), ["axis-x", "axis-y", "point-point-a", "point-point-b", "line-line-ab"]);
  assert.ok(coordinateEn.table?.rows[0].cells[2].includes("0 to 6"));
  assert.ok(coordinateEn.table?.rows[0].cells[2].includes("tick interval 2"));
  assert.ok(coordinateEn.table?.rows[0].cells[2].includes("ticks 0, 2, 4, 6"));
  assert.ok(coordinateZh.table?.rows[1].cells[2].includes("刻度 0、2、4、6、8"));
  assert.equal(coordinateEn.table?.rows[2].cells[2], "(1, 2)");
  assert.equal(coordinateEn.table?.rows[4].cells[2], "(1, 2) → (5, 6)");
  assert.equal(coordinateZh.table?.rows[4].cells[1], "路程 AB");

  const barChart = normalizeQuestionDiagram(validBarChartPayload);
  assert.ok(barChart && barChart.kind === "bar-chart");
  const barEn = buildQuestionDiagramSemanticSummary(barChart, "en");
  const barZh = buildQuestionDiagramSemanticSummary(barChart, "zh");
  assert.equal(barEn.caption, "Books read. Bar chart with 2 categories.");
  assert.deepEqual(barEn.table?.headers, ["Class", "Girls", "Boys"]);
  assert.deepEqual(barZh.table?.headers, ["班別", "女生", "男生"]);
  assert.deepEqual(barEn.table?.rows.map((row) => row.cells), [["Class A", "8", "6"], ["Class B", "7", "9"]]);
  assert.deepEqual(barZh.table?.rows.map((row) => row.cells), [["甲班", "8", "6"], ["乙班", "7", "9"]]);
});

test("QuestionFigure structurally delegates its semantic descendants to the shared renderer", () => {
  const componentPath = "components/practice/QuestionFigure.tsx";
  const sourceFile = ts.createSourceFile(
    componentPath,
    readFileSync(componentPath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const semanticImport = sourceFile.statements.find(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier)
      && statement.moduleSpecifier.text === "./questionFigureSemantics"
  );
  assert.ok(semanticImport, "QuestionFigure must import the shared semantic renderer");
  assert.ok(
    semanticImport.importClause?.namedBindings
      && ts.isNamedImports(semanticImport.importClause.namedBindings)
      && semanticImport.importClause.namedBindings.elements.some(
        (element) => element.name.text === "questionFigureSemanticElements"
      ),
    "QuestionFigure must import questionFigureSemanticElements by name"
  );

  const questionFigure = sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === "QuestionFigure"
  );
  assert.ok(questionFigure?.body, "QuestionFigure function body is missing");
  const returnStatement = questionFigure.body.statements.find(ts.isReturnStatement);
  assert.ok(returnStatement?.expression, "QuestionFigure must return its rendered figure");
  let returnedExpression = returnStatement.expression;
  while (ts.isParenthesizedExpression(returnedExpression)) {
    returnedExpression = returnedExpression.expression;
  }
  assert.ok(ts.isJsxElement(returnedExpression));
  assert.equal(returnedExpression.openingElement.tagName.getText(sourceFile), "figure");
  assert.equal(returnedExpression.closingElement.tagName.getText(sourceFile), "figure");

  const semanticsDeclaration = questionFigure.body.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "semantics");
  assert.ok(semanticsDeclaration?.initializer && ts.isCallExpression(semanticsDeclaration.initializer));
  assert.equal(semanticsDeclaration.initializer.expression.getText(sourceFile), "buildQuestionDiagramSemanticSummary");
  assert.deepEqual(
    semanticsDeclaration.initializer.arguments.map((argument) => argument.getText(sourceFile)),
    ["diagram", "language"]
  );

  const semanticCalls: ts.CallExpression[] = [];
  const collectSemanticCalls = (node: ts.Node) => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "questionFigureSemanticElements"
    ) {
      semanticCalls.push(node);
    }
    ts.forEachChild(node, collectSemanticCalls);
  };
  collectSemanticCalls(returnedExpression);
  assert.equal(semanticCalls.length, 1, "the rendered figure must delegate semantics exactly once");
  assert.deepEqual(semanticCalls[0].arguments.map((argument) => argument.getText(sourceFile)), ["semantics"]);
  assert.ok(ts.isJsxExpression(semanticCalls[0].parent), "semantic descendants must be rendered inside JSX");
});

test("the shared semantic renderer emits one visible figcaption and an optional sr-only table", () => {
  const coordinate = normalizeQuestionDiagram(validCoordinateGridPayload);
  assert.ok(coordinate?.kind === "coordinate-grid");
  const coordinateSemantics = buildQuestionDiagramSemanticSummary(coordinate, "en");
  const coordinateMarkup = renderToStaticMarkup(
    createElement("figure", null, questionFigureSemanticElements(coordinateSemantics))
  );
  assert.equal((coordinateMarkup.match(/<figcaption\b/g) ?? []).length, 1);
  assert.ok(coordinateMarkup.includes(`<figcaption class="mt-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">${coordinateSemantics.caption}</figcaption>`));
  assert.equal((coordinateMarkup.match(/<table\b/g) ?? []).length, 1);
  assert.ok(coordinateMarkup.includes('<table class="sr-only">'));
  assert.ok(coordinateMarkup.includes(`<caption>${coordinateSemantics.table?.caption}</caption>`));
  for (const header of coordinateSemantics.table?.headers ?? []) {
    assert.ok(coordinateMarkup.includes(`<th scope="col">${header}</th>`), `missing semantic header ${header}`);
  }

  const numberLine = normalizeQuestionDiagram({
    kind: "number-line",
    range: [0, 5],
    tickInterval: 1,
    points: [{ value: 2, label: "Q" }]
  });
  assert.ok(numberLine?.kind === "number-line");
  const numberLineSemantics = buildQuestionDiagramSemanticSummary(numberLine, "en");
  assert.equal(numberLineSemantics.table, undefined);
  const numberLineMarkup = renderToStaticMarkup(
    createElement("figure", null, questionFigureSemanticElements(numberLineSemantics))
  );
  assert.equal((numberLineMarkup.match(/<figcaption\b/g) ?? []).length, 1);
  assert.ok(numberLineMarkup.includes(`>${numberLineSemantics.caption}</figcaption>`));
  assert.equal(numberLineMarkup.includes("<table"), false);
  assert.equal(numberLineMarkup.includes("sr-only"), false);
});

test("normalizeQuestionDiagram rejects malformed payloads fail-closed", () => {
  assert.equal(normalizeQuestionDiagram(null), undefined);
  assert.equal(normalizeQuestionDiagram("plane-figure"), undefined);
  assert.equal(normalizeQuestionDiagram({ kind: "mystery-figure" }), undefined);

  const withUnknownKey = { ...straightLineAngleDiagram, decoration: "sparkles" };
  assert.equal(normalizeQuestionDiagram(withUnknownKey), undefined);

  const withNaN = {
    kind: "plane-figure",
    points: [{ id: "A", x: Number.NaN, y: 0 }]
  };
  assert.equal(normalizeQuestionDiagram(withNaN), undefined);

  const withMissingReference = {
    kind: "plane-figure",
    points: [{ id: "A", x: 0, y: 0 }],
    segments: [{ from: "A", to: "Z" }]
  };
  assert.equal(normalizeQuestionDiagram(withMissingReference), undefined);

  const withReversedRange = { kind: "number-line", range: [4, 3] };
  assert.equal(normalizeQuestionDiagram(withReversedRange), undefined);

  const withPointOutsideRange = {
    kind: "number-line",
    range: [0, 5],
    points: [{ value: 9 }]
  };
  assert.equal(normalizeQuestionDiagram(withPointOutsideRange), undefined);

  const withMissingDimension = { kind: "solid-figure", shape: "cuboid", width: 4, depth: 3 };
  assert.equal(normalizeQuestionDiagram(withMissingDimension), undefined);

  const withTooManyTicks = { kind: "number-line", range: [0, 100], tickInterval: 0.5 };
  assert.equal(normalizeQuestionDiagram(withTooManyTicks), undefined);

  const withUnknownTone = { kind: "ten-frame", groups: [{ count: 3, tone: "chartreuse" }] };
  assert.equal(normalizeQuestionDiagram(withUnknownTone), undefined);

  const withFractionalCount = { kind: "ten-frame", groups: [{ count: 2.5, tone: "red" }] };
  assert.equal(normalizeQuestionDiagram(withFractionalCount), undefined);

  const withNoCounters = { kind: "ten-frame", groups: [{ count: 0, tone: "red" }] };
  assert.equal(normalizeQuestionDiagram(withNoCounters), undefined);

  const withOverflowingFrames = {
    kind: "ten-frame",
    layout: "separate-frames",
    groups: [
      { count: 10, tone: "orange" },
      { count: 11, tone: "blue" }
    ]
  };
  assert.equal(normalizeQuestionDiagram(withOverflowingFrames), undefined);

  const withTooManyFrames = { kind: "ten-frame", frames: 3, groups: [{ count: 4, tone: "red" }] };
  assert.equal(normalizeQuestionDiagram(withTooManyFrames), undefined);
});

test("ten-frame layout places every counter in a countable spot", () => {
  const composeWithinTen = normalizeQuestionDiagram({
    kind: "ten-frame",
    groups: [
      { count: 5, tone: "red" },
      { count: 1, tone: "blue" }
    ]
  });
  assert.equal(composeWithinTen?.kind, "ten-frame");
  if (composeWithinTen?.kind !== "ten-frame") return;

  const layout = buildTenFrameLayout(composeWithinTen, englishText);
  assert.deepEqual(layout.issues, []);
  assert.equal(layout.frames.length, 1);
  assert.equal(layout.frames[0].cells.length, 10);
  assert.equal(layout.frames[0].cells.filter((cell) => cell.tone === "red").length, 5);
  assert.equal(layout.frames[0].cells.filter((cell) => cell.tone === "blue").length, 1);
  assert.equal(layout.frames[0].cells.filter((cell) => cell.tone === null).length, 4);
  // Counters fill left-to-right, top row first — the order a child counts in.
  assert.deepEqual(
    layout.frames[0].cells.slice(0, 6).map((cell) => cell.tone),
    ["red", "red", "red", "red", "red", "blue"]
  );
  assert.equal(tenFrameEmptySpots(composeWithinTen), 4);

  const teenNumber = normalizeQuestionDiagram({
    kind: "ten-frame",
    layout: "separate-frames",
    groups: [
      { count: 10, tone: "orange" },
      { count: 3, tone: "blue" }
    ]
  });
  assert.equal(teenNumber?.kind, "ten-frame");
  if (teenNumber?.kind !== "ten-frame") return;

  const teenLayout = buildTenFrameLayout(teenNumber, englishText);
  assert.deepEqual(teenLayout.issues, []);
  assert.equal(teenLayout.frames.length, 2);
  assert.equal(teenLayout.frames[0].cells.filter((cell) => cell.tone === "orange").length, 10);
  assert.equal(teenLayout.frames[1].cells.filter((cell) => cell.tone === "blue").length, 3);
  // "Ten and three more" only reads that way if the second frame starts fresh.
  assert.equal(teenLayout.frames[1].cells[0].tone, "blue");
  assert.deepEqual(tenFrameRenderedCounts(teenNumber).perGroup, [10, 3]);

  // Each frame is its own box in its own coordinate space, so the renderer can
  // wrap the second frame under the first on a phone instead of shrinking both.
  assert.deepEqual(teenLayout.frames[0].viewBox, teenLayout.frames[1].viewBox);
  assert.deepEqual(teenLayout.frames[0].frame, teenLayout.frames[1].frame);
  assert.equal(teenLayout.frames[0].cells[0].cx, teenLayout.frames[1].cells[0].cx);
  assert.equal(teenLayout.frames[0].cells[0].cy, teenLayout.frames[1].cells[0].cy);
  const teenFrameBox = teenLayout.frames[0].frame;
  teenLayout.frames.forEach((frame) => {
    frame.cells.forEach((cell) => {
      assert.ok(cell.cx - cell.r >= teenFrameBox.x, `${cell.key} spills past the frame's left edge`);
      assert.ok(cell.cx + cell.r <= teenFrameBox.x + teenFrameBox.width, `${cell.key} spills past the right edge`);
      assert.ok(cell.cy - cell.r >= teenFrameBox.y, `${cell.key} spills past the frame's top edge`);
      assert.ok(cell.cy + cell.r <= teenFrameBox.y + teenFrameBox.height, `${cell.key} spills past the bottom edge`);
    });
  });

  const elevenInARow = normalizeQuestionDiagram({
    kind: "ten-frame",
    frames: 2,
    groups: [{ count: 11, tone: "blue" }]
  });
  assert.equal(elevenInARow?.kind, "ten-frame");
  if (elevenInARow?.kind !== "ten-frame") return;

  const elevenLayout = buildTenFrameLayout(elevenInARow, englishText);
  assert.deepEqual(elevenLayout.issues, []);
  assert.equal(elevenLayout.frames[0].cells.filter((cell) => cell.tone).length, 10);
  assert.equal(elevenLayout.frames[1].cells.filter((cell) => cell.tone).length, 1);
});

test("validateQuestionDiagram flags geometric inconsistencies", () => {
  const wrongRightAngle = normalizeQuestionDiagram({
    kind: "plane-figure",
    points: [
      { id: "A", x: 4, y: 0, label: "A" },
      { id: "B", x: 0, y: 0, label: "B" },
      { id: "C", x: 4, y: 4, label: "C" }
    ],
    segments: [
      { from: "B", to: "A" },
      { from: "B", to: "C" }
    ],
    angleMarks: [{ vertexId: "B", fromId: "A", toId: "C", rightAngle: true }]
  });
  assert.ok(wrongRightAngle);
  const rightAngleIssues = validateQuestionDiagram(wrongRightAngle);
  assert.ok(
    rightAngleIssues.some((issue) => issue.includes("right-angle")),
    `Expected a right-angle inconsistency issue, got: ${rightAngleIssues.join(" | ")}`
  );

  const offCircleRadius = normalizeQuestionDiagram({
    kind: "plane-figure",
    points: [
      { id: "O", x: 0, y: 0, label: "O" },
      { id: "P", x: 3, y: 0, label: "P" }
    ],
    circles: [{ centerId: "O", radius: 2, radiusToId: "P" }]
  });
  assert.ok(offCircleRadius);
  const circleIssues = validateQuestionDiagram(offCircleRadius);
  assert.ok(
    circleIssues.some((issue) => issue.includes("not on the circle")),
    `Expected an off-circle radius issue, got: ${circleIssues.join(" | ")}`
  );

  const collinearAngle = normalizeQuestionDiagram({
    kind: "plane-figure",
    points: [
      { id: "A", x: -2, y: 0 },
      { id: "O", x: 0, y: 0 },
      { id: "B", x: 3, y: 0 }
    ],
    segments: [{ from: "A", to: "B" }],
    angleMarks: [{ vertexId: "O", fromId: "A", toId: "B" }]
  });
  assert.ok(collinearAngle);
  const collinearIssues = validateQuestionDiagram(collinearAngle);
  assert.ok(
    collinearIssues.some((issue) => issue.includes("collinear")),
    `Expected a collinear-ray issue, got: ${collinearIssues.join(" | ")}`
  );
});

test("plane-figure layout renders every mark with collision-free labels", () => {
  const layout = buildPlaneFigureLayout(straightLineAngleDiagram, englishText);
  assert.deepEqual(layout.issues, []);
  assert.equal(layout.markers.length, 4);
  assert.equal(layout.segments.length, 2);
  assert.equal(layout.anglePaths.length, 3);
  assert.equal(layout.labels.length, 6);
  assert.ok(layout.labels.every((label) => label.clean));
});

test("number-line layout labels integer ticks when decimal ticks would crowd", () => {
  const diagram = normalizeQuestionDiagram({
    kind: "number-line",
    range: [3, 4],
    tickInterval: 0.1,
    points: [{ value: 3.7, label: "P" }]
  });
  assert.ok(diagram && diagram.kind === "number-line");
  const layout = buildNumberLineLayout(diagram, englishText);
  assert.deepEqual(layout.issues, []);
  assert.equal(layout.ticks.length, 11);
  assert.deepEqual(
    layout.ticks.filter((tick) => tick.labelText !== null).map((tick) => tick.labelText),
    ["3", "4"]
  );
  assert.equal(layout.points.length, 1);
  const xs = layout.ticks.map((tick) => tick.x);
  const sorted = [...xs].sort((a, b) => a - b);
  assert.deepEqual(xs, sorted);
});

test("cuboid layout draws 12 edges with exactly 3 hidden dashed edges", () => {
  const diagram = normalizeQuestionDiagram({
    kind: "solid-figure",
    shape: "cuboid",
    width: 4,
    depth: 3,
    height: 2,
    labels: {
      width: { en: "4 cm", zh: "4 厘米" },
      depth: { en: "3 cm", zh: "3 厘米" },
      height: { en: "2 cm", zh: "2 厘米" }
    }
  });
  assert.ok(diagram && diagram.kind === "solid-figure");
  const layout = buildSolidFigureLayout(diagram, englishText);
  assert.deepEqual(layout.issues, []);
  assert.equal(layout.strokes.length, 12);
  assert.equal(layout.strokes.filter((stroke) => stroke.dashed).length, 3);
  assert.equal(layout.labels.length, 3);
  assert.ok(layout.labels.every((label) => label.clean));
});

test("cylinder, cone, and sphere layouts stay inside the viewBox with clean labels", () => {
  const shapes = [
    { kind: "solid-figure", shape: "cylinder", radius: 3, height: 5, labels: { radius: { en: "3 cm", zh: "3 厘米" }, height: { en: "5 cm", zh: "5 厘米" } } },
    { kind: "solid-figure", shape: "cone", radius: 3, height: 4, labels: { radius: { en: "3 cm", zh: "3 厘米" }, height: { en: "4 cm", zh: "4 厘米" } } },
    { kind: "solid-figure", shape: "sphere", radius: 5, labels: { radius: { en: "5 cm", zh: "5 厘米" } } }
  ];

  for (const raw of shapes) {
    const diagram = normalizeQuestionDiagram(raw);
    assert.ok(diagram && diagram.kind === "solid-figure", `normalize failed for ${raw.shape}`);
    const layout = buildSolidFigureLayout(diagram, englishText);
    assert.deepEqual(layout.issues, [], `issues for ${raw.shape}: ${layout.issues.join(" | ")}`);
    const allX = [
      ...layout.strokes.flatMap((stroke) => [stroke.x1, stroke.x2]),
      ...layout.labels.map((label) => label.x)
    ];
    const allY = [
      ...layout.strokes.flatMap((stroke) => [stroke.y1, stroke.y2]),
      ...layout.labels.map((label) => label.y)
    ];
    assert.ok(allX.every((x) => x >= 0 && x <= layout.viewBox.width), `${raw.shape} stroke/label x out of viewBox`);
    assert.ok(allY.every((y) => y >= 0 && y <= layout.viewBox.height), `${raw.shape} stroke/label y out of viewBox`);
  }
});

test("derived facts recompute the showcase answers from checked-in diagram data", () => {
  const angleQuestion = questionById("graph-p4-angles-straight-line");
  assert.equal(angleQuestion.diagram?.kind, "plane-figure");
  if (angleQuestion.diagram?.kind === "plane-figure") {
    const marked = planeFigureAngleDegrees(angleQuestion.diagram, "O", "A", "C");
    assert.ok(marked !== null && Math.abs(marked - 130) < 0.5, `marked angle drifted: ${marked}`);
    const derived = planeFigureAngleDegrees(angleQuestion.diagram, "O", "C", "B");
    assert.ok(derived !== null && Math.round(derived) === 50);
    const span = planeFigureSegmentLength(angleQuestion.diagram, "A", "B");
    assert.equal(span, 8);
  }
  assert.equal(deriveGraphAnswer(angleQuestion), "50°");
  assert.ok(isExpectedAnswerRepresented(angleQuestion, "50°"));

  const numberLineQuestion = questionById("graph-p4-decimals-number-line");
  assert.equal(numberLineQuestion.diagram?.kind, "number-line");
  if (numberLineQuestion.diagram?.kind === "number-line") {
    assert.equal(numberLinePointValue(numberLineQuestion.diagram, "P"), 3.7);
  }
  assert.equal(deriveGraphAnswer(numberLineQuestion), "3.7");
  assert.ok(isExpectedAnswerRepresented(numberLineQuestion, "3.7"));

  const volumeQuestion = questionById("graph-p5-volume-cube");
  assert.equal(volumeQuestion.diagram?.kind, "solid-figure");
  if (volumeQuestion.diagram?.kind === "solid-figure") {
    assert.equal(solidFigureCuboidVolume(volumeQuestion.diagram), 27);
    assert.equal(solidFigureUnitText(volumeQuestion.diagram), "cm");
  }
  assert.equal(deriveGraphAnswer(volumeQuestion), "27 cm^3");
  assert.ok(isExpectedAnswerRepresented(volumeQuestion, "27 cm^3"));
});

test("every checked-in question diagram conforms to the spec and passes figure QA", () => {
  const diagramQuestions = questions.filter((question) => question.diagram);
  assert.ok(diagramQuestions.length >= 17, `Expected at least 17 diagram questions, found ${diagramQuestions.length}`);

  const failures = diagramQuestions.flatMap((question) => {
    const normalized = normalizeQuestionDiagram(question.diagram);
    if (!normalized) return [`${question.id}: diagram does not conform to the figure spec`];
    return validateQuestionDiagram(normalized).map((issue) => `${question.id}: ${issue}`);
  });

  assert.deepEqual(failures, []);
});

test("coordinate-grid layout keeps legacy grid geometry stable", () => {
  const gradientQuestion = questionById("graph-coordinate-geometry-gradient");
  assert.equal(gradientQuestion.diagram?.kind, "coordinate-grid");
  if (gradientQuestion.diagram?.kind !== "coordinate-grid") return;

  const layout = buildCoordinateGridLayout(gradientQuestion.diagram);
  assert.equal(layout.viewBox.width, 280);
  assert.equal(layout.viewBox.height, 210);
  assert.equal(layout.plot.left, 36);
  assert.equal(layout.xTicks[0], gradientQuestion.diagram.xRange[0]);
  assert.ok(layout.labeledPoints.every((point) => point.placement.clean));
  assert.equal(layout.xFor(gradientQuestion.diagram.xRange[0]), layout.plot.left);
  assert.equal(layout.yFor(gradientQuestion.diagram.yRange[0]), layout.plot.top + layout.plot.height);
});

test("alt text is derived bilingually from the diagram spec", () => {
  const alt = questionDiagramAltText(straightLineAngleDiagram);
  assert.ok(alt.en.includes("A, O, B, C"));
  assert.ok(alt.en.includes("130°"));
  assert.ok(alt.zh.includes("平面圖形"));
  assert.ok((alt.zhHans ?? "").includes("平面图形"));

  const volumeQuestion = questionById("graph-p5-volume-cube");
  assert.ok(volumeQuestion.diagram);
  const solidAlt = questionDiagramAltText(volumeQuestion.diagram);
  assert.ok(solidAlt.en.startsWith("Cube"));
  assert.ok(solidAlt.en.includes("3 cm"));
  assert.ok((solidAlt.zhHans ?? "").includes("正方体"));
});

test("generated banks fail closed: no graph question ships without a valid diagram", () => {
  assert.deepEqual(mainlandPepJuniorDroppedGraphQuestionIds, []);

  const bankGraphQuestions = questions.filter((question) => question.type === "graph");
  const graphWithoutDiagram = bankGraphQuestions.filter((question) => !question.diagram).map((question) => question.id);
  assert.deepEqual(graphWithoutDiagram, []);
});
