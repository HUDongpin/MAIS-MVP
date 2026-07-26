import type { TenFrameQuestionDiagram } from "@/types";

/**
 * Phase 1 proof-of-concept: deterministic figures for California K-1 practice
 * questions.
 *
 * The Practice Arena has always been able to render a figure — `QuestionFigure`
 * has drawn coordinate grids, plane figures, number lines and solids for a long
 * time — but no question in any bank carried a `diagram`, so no practice
 * question has ever shown one. These are the first, and they are authored the
 * only way a maths manipulative can be trusted at scale: a structured spec that
 * a deterministic renderer turns into SVG. Nothing here is generated as pixels,
 * so "8 orange and 5 blue" is 8 orange and 5 blue by construction, not by luck.
 *
 * Every spec is checked by `lib/practiceFigureAudit.ts` before it can ship: the
 * counters have to reconcile with the numbers in the question stem, the counter
 * colours with the colours the stem names, and the total with the accepted
 * answer. Adding a spec here without the arithmetic lining up fails the gate.
 */

const idPrefix = "us-ca-k5-knowledge-point-practice-v1-";

/**
 * What the figure encodes relative to the question's answer. Today there is one
 * contract; new archetypes (bar model, base-ten blocks, array) will add their
 * own, and each one gets a matching reconciliation rule in the audit.
 */
export type PracticeFigureRepresents = "total-of-counters";

export type UsCaliforniaPracticeFigureSpec = {
  questionId: string;
  archetype: "ten-frame";
  represents: PracticeFigureRepresents;
  standardIds: string[];
  diagram: TenFrameQuestionDiagram;
};

export const usCaliforniaPracticeFigureSpecVersion = "us-ca-practice-figures-v1";

export const usCaliforniaPracticeFigureSpecs: UsCaliforniaPracticeFigureSpec[] = [
  // --- Kindergarten: count a collection (K.CC) -------------------------------
  // One group, one frame. The figure is the collection the stem talks about;
  // the child still has to count it.
  {
    questionId: `${idPrefix}us-ca-math-k-k-cc-count-sequence-q01`,
    archetype: "ten-frame",
    represents: "total-of-counters",
    standardIds: ["K.CC.A.3", "K.CC.B.4", "K.CC.B.5"],
    diagram: { kind: "ten-frame", groups: [{ count: 10, tone: "blue" }] }
  },
  {
    // 11 spills into a second frame — the "ten and one more" picture that makes
    // teen numbers legible.
    questionId: `${idPrefix}us-ca-math-k-k-cc-count-sequence-q09`,
    archetype: "ten-frame",
    represents: "total-of-counters",
    standardIds: ["K.CC.A.3", "K.CC.B.5"],
    diagram: { kind: "ten-frame", frames: 2, groups: [{ count: 11, tone: "blue" }] }
  },

  // --- Kindergarten: compose and decompose within 10 (K.OA) ------------------
  // Two colours in one frame: the two parts are visible at once, and so is the
  // whole they make.
  {
    questionId: `${idPrefix}us-ca-math-k-k-oa-compose-decompose-q02`,
    archetype: "ten-frame",
    represents: "total-of-counters",
    standardIds: ["K.OA.A.1", "K.OA.A.3"],
    diagram: {
      kind: "ten-frame",
      groups: [
        { count: 2, tone: "red" },
        { count: 3, tone: "blue" }
      ]
    }
  },
  {
    questionId: `${idPrefix}us-ca-math-k-k-oa-compose-decompose-q04`,
    archetype: "ten-frame",
    represents: "total-of-counters",
    standardIds: ["K.OA.A.1", "K.OA.A.3"],
    diagram: {
      kind: "ten-frame",
      groups: [
        { count: 4, tone: "red" },
        { count: 5, tone: "blue" }
      ]
    }
  },
  {
    questionId: `${idPrefix}us-ca-math-k-k-oa-compose-decompose-q10`,
    archetype: "ten-frame",
    represents: "total-of-counters",
    standardIds: ["K.OA.A.1", "K.OA.A.3"],
    diagram: {
      kind: "ten-frame",
      groups: [
        { count: 5, tone: "red" },
        { count: 1, tone: "blue" }
      ]
    }
  },

  // --- Kindergarten: teen numbers as ten and some more (K.NBT) ---------------
  // These stems say "a ten-frame shows..." and then show nothing. Separate
  // frames are the point: a full ten in the first frame, the extra ones in the
  // second, which is what makes 13 read as "ten and three".
  {
    questionId: `${idPrefix}us-ca-math-k-k-nbt-teen-numbers-q01`,
    archetype: "ten-frame",
    represents: "total-of-counters",
    standardIds: ["K.NBT.A.1"],
    diagram: {
      kind: "ten-frame",
      layout: "separate-frames",
      groups: [
        { count: 10, tone: "orange" },
        { count: 3, tone: "blue" }
      ]
    }
  },
  {
    questionId: `${idPrefix}us-ca-math-k-k-nbt-teen-numbers-q05`,
    archetype: "ten-frame",
    represents: "total-of-counters",
    standardIds: ["K.NBT.A.1"],
    diagram: {
      kind: "ten-frame",
      layout: "separate-frames",
      groups: [
        { count: 10, tone: "orange" },
        { count: 7, tone: "blue" }
      ]
    }
  },

  // --- Grade 1: join stories to ten (1.OA) -----------------------------------
  {
    questionId: `${idPrefix}us-ca-math-p1-1-h1-picture-join-stories-to-10-q01`,
    archetype: "ten-frame",
    represents: "total-of-counters",
    standardIds: ["1.OA.A.1", "1.OA.C.5", "1.OA.C.6"],
    diagram: {
      kind: "ten-frame",
      groups: [
        { count: 5, tone: "red" },
        { count: 1, tone: "blue" }
      ]
    }
  },
  {
    questionId: `${idPrefix}us-ca-math-p1-1-h1-picture-join-stories-to-10-q02`,
    archetype: "ten-frame",
    represents: "total-of-counters",
    standardIds: ["1.OA.A.1", "1.OA.C.6"],
    diagram: {
      kind: "ten-frame",
      groups: [
        { count: 6, tone: "red" },
        { count: 3, tone: "blue" }
      ]
    }
  },
  {
    questionId: `${idPrefix}us-ca-math-p1-1-h2-picture-story-addition-equations-q01`,
    archetype: "ten-frame",
    represents: "total-of-counters",
    standardIds: ["1.OA.A.1", "1.OA.D.7"],
    diagram: {
      kind: "ten-frame",
      groups: [
        { count: 2, tone: "red" },
        { count: 5, tone: "blue" }
      ]
    }
  }
];

export const usCaliforniaPracticeFigureByQuestionId = new Map(
  usCaliforniaPracticeFigureSpecs.map((spec) => [spec.questionId, spec])
);

export function usCaliforniaPracticeFigureFor(questionId: string) {
  return usCaliforniaPracticeFigureByQuestionId.get(questionId)?.diagram;
}
