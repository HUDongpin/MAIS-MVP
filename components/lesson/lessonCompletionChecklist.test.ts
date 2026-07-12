import assert from "node:assert/strict";
import test from "node:test";
import type { LessonBlock } from "@/types";
import {
  buildLessonCompletionChecklistItems,
  lessonCompletionMasteryCardText,
  lessonCompletionTierForGrade
} from "./lessonCompletionChecklist";

const deepReasoningChecklist: LessonBlock[] = [
  {
    id: "guided-practice-checklist",
    type: "checklist",
    title: { en: "Guided practice", zh: "引導練習", zhHans: "引导练习" },
    items: [
      {
        en: "Use models and words to reason about solve addition/subtraction situations, understand properties, and build fluency within 20.",
        zh: "用模型和文字推理。",
        zhHans: "用模型和文字推理。"
      },
      {
        en: "Show each step with a drawing, equation, table, or verbal check.",
        zh: "展示每一步。",
        zhHans: "展示每一步。"
      },
      {
        en: "Check whether the answer makes sense in the story.",
        zh: "檢查答案。",
        zhHans: "检查答案。"
      },
      {
        en: "Lena has 7 stickers and gets 4 more. How many stickers does Lena have now? Expected move: Name the quantities, choose a representation, solve, and check the units or labels.",
        zh: "Lena 有貼紙題。",
        zhHans: "Lena 有贴纸题。"
      }
    ]
  }
];

test("treats K through P6 as elementary and S grades as middle/high", () => {
  assert.equal(lessonCompletionTierForGrade("K"), "elementary");
  assert.equal(lessonCompletionTierForGrade("P1"), "elementary");
  assert.equal(lessonCompletionTierForGrade("P6"), "elementary");
  assert.equal(lessonCompletionTierForGrade("S1"), "middle-high");
  assert.equal(lessonCompletionTierForGrade("S6"), "middle-high");
});

test("replaces elementary deep reasoning checklist with concrete quick checks", () => {
  const items = buildLessonCompletionChecklistItems({
    grade: "P1",
    checklistBlocks: deepReasoningChecklist
  });

  assert.equal(items.length, 3);
  assert.deepEqual(items.map(({ item }) => item.en), [
    "I can draw it or use objects.",
    "I can write the number sentence.",
    "I can check that my answer fits the story."
  ]);
  assert.deepEqual(items.map(({ key }) => key), [
    "guided-practice-checklist-0",
    "guided-practice-checklist-1",
    "guided-practice-checklist-2"
  ]);
  assert.equal(items.some(({ item }) => item.en.includes("Expected move")), false);
  assert.equal(items.some(({ item }) => item.en.includes("representation")), false);
});

test("keeps quick completion checks visible for California elementary lessons", () => {
  const items = buildLessonCompletionChecklistItems({
    grade: "P1",
    checklistBlocks: deepReasoningChecklist,
    publisher: "US_CA_MATH"
  });

  assert.equal(items.length, 3);
  assert.deepEqual(items.map(({ item }) => item.en), [
    "I can draw it or use objects.",
    "I can write the number sentence.",
    "I can check that my answer fits the story."
  ]);
});

test("keeps middle and high school checklist depth unchanged", () => {
  const items = buildLessonCompletionChecklistItems({
    grade: "S1",
    checklistBlocks: deepReasoningChecklist
  });

  assert.equal(items.length, 4);
  assert.equal(items[0]?.item.en, deepReasoningChecklist[0]?.items?.[0]?.en);
  assert.equal(items[3]?.item.en.includes("Expected move"), true);
});

test("uses readiness copy for elementary instead of percentage mastery headline", () => {
  const start = lessonCompletionMasteryCardText({
    checkedCount: 0,
    grade: "P1",
    itemCount: 3,
    mastery: 0,
    status: "in-progress"
  });
  const ready = lessonCompletionMasteryCardText({
    checkedCount: 3,
    grade: "P1",
    itemCount: 3,
    mastery: 0,
    status: "in-progress"
  });

  assert.deepEqual(start, {
    eyebrow: { en: "Ready check", zh: "完成準備", zhHans: "完成准备" },
    headline: { en: "Keep going", zh: "繼續加油", zhHans: "继续加油" },
    status: { en: "0/3 quick checks", zh: "0/3 個快速檢查", zhHans: "0/3 个快速检查" }
  });
  assert.equal(ready.headline.en, "Ready to finish");
  assert.equal(start.headline.en.includes("%"), false);
});

test("keeps mastery percentage card for middle and high school lessons", () => {
  const card = lessonCompletionMasteryCardText({
    checkedCount: 1,
    grade: "S4",
    itemCount: 4,
    mastery: 25,
    status: "in-progress"
  });

  assert.deepEqual(card, {
    eyebrow: { en: "Mastery", zh: "掌握度", zhHans: "掌握度" },
    headline: { en: "Mastery: 25%", zh: "掌握度：25%", zhHans: "掌握度：25%" },
    status: { en: "In progress", zh: "進行中", zhHans: "进行中" }
  });
});
