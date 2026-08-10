import assert from "node:assert/strict";
import test from "node:test";
import { usCaliforniaQuestions } from "../data/usCaliforniaQuestions";
import {
  usCaliforniaPracticeFigureSpecs,
  type UsCaliforniaPracticeFigureSpec
} from "../data/usCaliforniaPracticeFigures";
import { auditPracticeFigureSpec, buildPracticeFigureAuditReport } from "./practiceFigureAudit";
import { questionDiagramAltText, tenFrameRenderedCounts } from "./questionFigure";
import type { Question, TenFrameQuestionDiagram } from "../types";

const questionById = new Map(usCaliforniaQuestions.map((question) => [question.id, question]));

function specFor(idSuffix: string): UsCaliforniaPracticeFigureSpec {
  const spec = usCaliforniaPracticeFigureSpecs.find((candidate) => candidate.questionId.endsWith(idSuffix));
  assert.ok(spec, `Expected a figure spec ending in ${idSuffix}`);
  return spec;
}

function questionFor(spec: UsCaliforniaPracticeFigureSpec): Question {
  const question = questionById.get(spec.questionId);
  assert.ok(question, `Expected ${spec.questionId} in the live California bank`);
  return question;
}

function codesFor(spec: UsCaliforniaPracticeFigureSpec, question: Question) {
  return auditPracticeFigureSpec(spec, question).map((issue) => issue.code);
}

function withDiagram(
  spec: UsCaliforniaPracticeFigureSpec,
  diagram: TenFrameQuestionDiagram
): UsCaliforniaPracticeFigureSpec {
  return { ...spec, diagram };
}

test("every shipped California practice figure passes the conceptual-correctness audit", () => {
  const report = buildPracticeFigureAuditReport();

  assert.equal(report.checked, 10);
  assert.equal(
    report.failed,
    0,
    report.rows
      .filter((row) => row.issues.length)
      .map((row) => `${row.questionId}: ${row.issues.map((issue) => `${issue.code} (${issue.detail})`).join("; ")}`)
      .join("\n")
  );
});

test("shipped figures reach the questions the Practice Arena actually serves", () => {
  usCaliforniaPracticeFigureSpecs.forEach((spec) => {
    const question = questionFor(spec);
    assert.equal(question.diagram?.kind, "ten-frame", `${spec.questionId} should carry its ten frame`);
    assert.equal(question.diagram, spec.diagram);
  });

  // This audit's reach is deliberately narrow: it owns the opt-in ten-frame
  // specs. Other deterministic diagram kinds have their own validation gates.
  const tenFrameQuestions = usCaliforniaQuestions.filter((question) => question.diagram?.kind === "ten-frame");
  assert.equal(tenFrameQuestions.length, usCaliforniaPracticeFigureSpecs.length);
});

test("a figure drawing one counter too many is rejected", () => {
  const spec = specFor("us-ca-math-p1-1-h1-picture-join-stories-to-10-q01");
  const question = questionFor(spec);
  assert.equal(question.answer, "6");

  const wrongCount = withDiagram(spec, {
    kind: "ten-frame",
    groups: [
      { count: 5, tone: "red" },
      { count: 2, tone: "blue" }
    ]
  });

  const codes = codesFor(wrongCount, question);
  assert.ok(codes.includes("stem-count-mismatch"), `expected stem-count-mismatch, got ${codes.join(", ")}`);
  assert.ok(codes.includes("answer-mismatch"), `expected answer-mismatch, got ${codes.join(", ")}`);
});

test("a figure whose total is right but whose parts are wrong is still rejected", () => {
  // 3 + 3 = 6 is the right answer drawn from the wrong story: the stem says 5
  // red and 1 blue. Reconciling against the answer alone would let this pass.
  const spec = specFor("us-ca-math-p1-1-h1-picture-join-stories-to-10-q01");
  const question = questionFor(spec);

  const wrongParts = withDiagram(spec, {
    kind: "ten-frame",
    groups: [
      { count: 3, tone: "red" },
      { count: 3, tone: "blue" }
    ]
  });

  const codes = codesFor(wrongParts, question);
  assert.deepEqual(tenFrameRenderedCounts(wrongParts.diagram).total, 6);
  assert.ok(codes.includes("stem-count-mismatch"), `expected stem-count-mismatch, got ${codes.join(", ")}`);
  assert.ok(!codes.includes("answer-mismatch"));
});

test("a figure that swaps the colours the stem names is rejected", () => {
  const spec = specFor("us-ca-math-k-k-oa-compose-decompose-q02");
  const question = questionFor(spec);

  const swapped = withDiagram(spec, {
    kind: "ten-frame",
    groups: [
      { count: 2, tone: "blue" },
      { count: 3, tone: "red" }
    ]
  });

  assert.ok(codesFor(swapped, question).includes("stem-colour-mismatch"));
});

test("a figure that cannot be drawn is rejected before it renders", () => {
  const spec = specFor("us-ca-math-k-k-nbt-teen-numbers-q01");
  const question = questionFor(spec);

  const overflowing = withDiagram(spec, {
    kind: "ten-frame",
    layout: "separate-frames",
    groups: [
      { count: 10, tone: "orange" },
      { count: 13, tone: "blue" }
    ]
  });

  assert.ok(codesFor(overflowing, question).includes("spec-invalid"));
});

test("a legend label that states the answer is rejected", () => {
  const spec = specFor("us-ca-math-k-k-oa-compose-decompose-q04");
  const question = questionFor(spec);
  assert.equal(question.answer, "9");

  const leaking = withDiagram(spec, {
    kind: "ten-frame",
    groups: [
      { count: 4, tone: "red" },
      { count: 5, tone: "blue", label: { en: "9 in all", zh: "合共 9 個", zhHans: "合共 9 个" } }
    ]
  });

  assert.ok(codesFor(leaking, question).includes("answer-leak"));
});

test("a ten frame attached outside K-2 is rejected", () => {
  const spec = specFor("us-ca-math-k-k-oa-compose-decompose-q02");
  const question = questionFor(spec);

  const outOfBand = { ...spec, standardIds: ["5.NF.B.4"] };
  assert.ok(codesFor(outOfBand, question).includes("archetype-out-of-band"));
});

test("ten-frame alt text names the parts a learner can see and never the total", () => {
  const spec = specFor("us-ca-math-p1-1-h1-picture-join-stories-to-10-q01");
  const question = questionFor(spec);
  const alt = questionDiagramAltText(spec.diagram);

  assert.equal(alt.en, "Ten frame with 5 red counters and 1 blue counter.");
  assert.ok(!alt.en.includes(question.answer), "alt text must not hand over the answer");
  assert.ok(alt.zh.includes("紅色") && alt.zh.includes("藍色"));
  assert.ok(alt.zhHans?.includes("红色") && alt.zhHans.includes("蓝色"));
});

test("double ten-frame alt text distinguishes the two frames", () => {
  const spec = specFor("us-ca-math-k-k-nbt-teen-numbers-q01");
  const alt = questionDiagramAltText(spec.diagram);

  assert.equal(
    alt.en,
    "Double ten frame with 10 orange counters in the first frame and 3 blue counters in the second frame."
  );
});
