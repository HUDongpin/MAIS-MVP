import assert from "node:assert/strict";
import test from "node:test";
import { questions } from "../data/questions";
import { mainlandPepJuniorDroppedGraphQuestionIds } from "../data/mainlandPepJuniorQuestions";
import { deriveGraphAnswer, isExpectedAnswerRepresented } from "./questionBankSolvability";
import {
  buildCoordinateGridLayout,
  buildDataDisplayLayout,
  buildNumberLineLayout,
  buildPlaneFigureLayout,
  buildSolidFigureLayout,
  buildTenFrameLayout,
  dataDisplayValueText,
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
import type { DataDisplayQuestionDiagram, PlaneFigureQuestionDiagram, Question } from "@/types";

const englishText: FigureTextResolver = (value) => (typeof value === "string" ? value : value.en);

function questionById(id: string): Question {
  const question = questions.find((candidate) => candidate.id === id);
  assert.ok(question, `Expected question ${id} to exist in the bank`);
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
    points: [{ label: "A", x: 1, y: 1 }],
    lines: [{ label: "AB", points: [{ x: 1, y: 1 }, { x: 4, y: 4 }] }]
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

const ribbonLinePlot: DataDisplayQuestionDiagram = {
  kind: "data-display",
  display: "line-plot",
  title: { en: "Ribbon Lengths", zh: "絲帶長度", zhHans: "丝带长度" },
  unit: { en: "inches", zh: "英寸", zhHans: "英寸" },
  values: [1, 1.25, 1.5, 1.5, 1.75, 2],
  range: [1, 2],
  tickInterval: 0.25
};

test("normalizeQuestionDiagram accepts the three data-display forms and rejects un-drawable ones", () => {
  const pictureGraph = normalizeQuestionDiagram({
    kind: "data-display",
    display: "picture-graph",
    unit: { en: "pet", zh: "隻寵物", zhHans: "只宠物" },
    scale: 2,
    categories: [
      { label: { en: "Dogs", zh: "狗" }, value: 6 },
      { label: { en: "Cats", zh: "貓", zhHans: "猫" }, value: 4 }
    ]
  });
  assert.equal(pictureGraph?.kind, "data-display");
  if (pictureGraph?.kind === "data-display") {
    assert.equal(pictureGraph.categories?.[1].label.zhHans, "猫");
  }

  const barGraph = normalizeQuestionDiagram({
    kind: "data-display",
    display: "bar-graph",
    categories: [
      { label: { en: "Apples", zh: "蘋果" }, value: 6 },
      { label: { en: "Bananas", zh: "香蕉" }, value: 9 }
    ]
  });
  assert.equal(barGraph?.kind, "data-display");

  assert.equal(normalizeQuestionDiagram(ribbonLinePlot)?.kind, "data-display");

  const linePlotFields = { kind: "data-display", display: "line-plot", values: [1, 1.5] };
  const categoryFields = {
    kind: "data-display",
    display: "picture-graph",
    categories: [{ label: { en: "Dogs", zh: "狗" }, value: 4 }]
  };
  assert.equal(normalizeQuestionDiagram({ ...categoryFields, display: "dot-plot" }), undefined);
  assert.equal(normalizeQuestionDiagram({ ...categoryFields, values: [1, 2] }), undefined);
  assert.equal(normalizeQuestionDiagram({ ...linePlotFields, categories: categoryFields.categories }), undefined);
  // 5 pets per symbol cannot draw a 4-pet row.
  assert.equal(normalizeQuestionDiagram({ ...categoryFields, scale: 5 }), undefined);
  // 0.3 sits between the drawable quarter-grid ticks.
  assert.equal(normalizeQuestionDiagram({ ...linePlotFields, values: [1, 1.3] }), undefined);
  assert.equal(normalizeQuestionDiagram({ ...linePlotFields, values: [1, 3], range: [1, 2] }), undefined);
});

test("data-display layouts draw exactly the data the spec states", () => {
  const pictureLayout = buildDataDisplayLayout(
    {
      kind: "data-display",
      display: "picture-graph",
      unit: { en: "pet", zh: "隻寵物", zhHans: "只宠物" },
      scale: 1,
      categories: [
        { label: { en: "Dogs", zh: "狗" }, value: 6 },
        { label: { en: "Cats", zh: "貓" }, value: 4 }
      ]
    },
    englishText
  );
  assert.deepEqual(pictureLayout.pictureRows.map((row) => row.symbols.length), [6, 4]);
  assert.deepEqual(pictureLayout.pictureRows.map((row) => row.labelText), ["Dogs", "Cats"]);
  assert.equal(pictureLayout.legendText, "Each symbol = 1 pet");
  assert.deepEqual(pictureLayout.issues, []);

  const barLayout = buildDataDisplayLayout(
    {
      kind: "data-display",
      display: "bar-graph",
      unit: { en: "votes", zh: "票" },
      categories: [
        { label: { en: "Apples", zh: "蘋果" }, value: 6 },
        { label: { en: "Bananas", zh: "香蕉" }, value: 9 }
      ]
    },
    englishText
  );
  assert.equal(barLayout.bars.length, 2);
  const [appleBar, bananaBar] = barLayout.bars;
  assert.ok(Math.abs(bananaBar.height / appleBar.height - 9 / 6) < 0.000001);
  const baseline = barLayout.valueTicks.find((tick) => tick.labelText === "0");
  assert.ok(baseline && Math.abs(appleBar.y + appleBar.height - baseline.y) < 0.000001);
  assert.deepEqual(barLayout.issues, []);

  const plotLayout = buildDataDisplayLayout(ribbonLinePlot, englishText);
  assert.equal(plotLayout.marks.length, 6);
  assert.deepEqual(plotLayout.ticks.map((tick) => tick.labelText), ["1", "1¼", "1½", "1¾", "2"]);
  const halfTick = plotLayout.ticks[2];
  const stacked = plotLayout.marks.filter((mark) => Math.abs(mark.x - halfTick.x) < 0.000001);
  assert.equal(stacked.length, 2);
  assert.ok(stacked.every((mark) => plotLayout.axis && mark.y < plotLayout.axis.y));
  assert.deepEqual(plotLayout.issues, []);
});

test("dataDisplayValueText matches the option notation on the quarter grid", () => {
  assert.equal(dataDisplayValueText(1.5), "1½");
  assert.equal(dataDisplayValueText(0.25), "¼");
  assert.equal(dataDisplayValueText(1.75), "1¾");
  assert.equal(dataDisplayValueText(2), "2");
  assert.equal(dataDisplayValueText(1.3), "1.3");
});

test("data-display alt text states the plotted data bilingually without the answer", () => {
  const alt = questionDiagramAltText(ribbonLinePlot);
  assert.equal(alt.en, 'Line plot "Ribbon Lengths" with values 1, 1¼, 1½, 1½, 1¾, 2 inches.');
  assert.ok(alt.zh.includes("數據點圖"));
  assert.ok((alt.zhHans ?? "").includes("数据点图"));

  const pictureQuestion = questionById("ccss-textbook-practice-v1-picture-graph-q01");
  assert.equal(pictureQuestion.diagram?.kind, "data-display");
  assert.ok(pictureQuestion.diagram);
  const pictureAlt = questionDiagramAltText(pictureQuestion.diagram);
  assert.ok(pictureAlt.en.includes("Dogs 6"));
  assert.ok(pictureAlt.en.includes("Fish 8"));
  // The total (the stored answer) is for the learner to compute, not to read.
  assert.ok(!pictureAlt.en.includes("18"));
});

test("the K-P5 data-display practice questions ship their figures through the live bank", () => {
  const dataDisplayIds = [
    "ccss-textbook-practice-v1-picture-graph-q01",
    "ccss-textbook-practice-v1-picture-graph-q02",
    "ccss-textbook-practice-v1-bar-graph-q01",
    "ccss-textbook-practice-v1-bar-graph-q02",
    "ccss-textbook-practice-v1-measure-line-plot-q01",
    "ccss-textbook-practice-v1-measure-line-plot-q02",
    "ccss-textbook-practice-v1-line-plot-operations-q01",
    "ccss-textbook-practice-v1-line-plot-operations-q02",
    "ccss-textbook-practice-v1-line-plot-operations-q03"
  ];
  for (const id of dataDisplayIds) {
    const question = questionById(id);
    assert.equal(question.diagram?.kind, "data-display", `${id} must serve its data display`);
    const normalized = normalizeQuestionDiagram(question.diagram);
    assert.ok(normalized, `${id} diagram must conform to the figure spec`);
    assert.deepEqual(validateQuestionDiagram(normalized), [], `${id} diagram must pass figure QA`);
  }
});
