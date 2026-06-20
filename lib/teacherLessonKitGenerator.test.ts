import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeterministicTeacherLessonKitSections,
  buildTeacherLessonKitLLMPrompt,
  hasProtectedTextRisk,
  parseTeacherLessonKitSectionsFromLLM,
  type TeacherLessonKitGenerationContext
} from "@/lib/teacherLessonKitGenerator";

const baseContext: TeacherLessonKitGenerationContext = {
  grade: "S1",
  gradeLabel: "七年级",
  publisher: "MAINLAND_PEP",
  publisherLabel: { en: "PEP Mathematics", zh: "人教版数学", zhHans: "人教版数学" },
  topicId: "linear-equations",
  topicTitle: { en: "Linear equations", zh: "一元一次方程", zhHans: "一元一次方程" },
  lessonTitle: { en: "Solving linear equations", zh: "解一元一次方程", zhHans: "解一元一次方程" },
  lessonPeriod: 1,
  lessonType: "new-lesson",
  durationMinutes: 45,
  lessonBlockSummaries: [
    { en: "Balance both sides of an equation.", zh: "方程两边保持平衡。", zhHans: "方程两边保持平衡。" }
  ],
  practiceQuestions: [
    {
      id: "q1",
      prompt: { en: "Solve x + 3 = 8.", zh: "解方程 x + 3 = 8。", zhHans: "解方程 x + 3 = 8。" },
      answer: "x = 5",
      explanation: { en: "Subtract 3 from both sides.", zh: "两边同时减 3。", zhHans: "两边同时减 3。" },
      difficulty: "Medium"
    },
    {
      id: "q2",
      prompt: { en: "Solve 2x = 10.", zh: "解方程 2x = 10。", zhHans: "解方程 2x = 10。" },
      answer: "x = 5",
      explanation: { en: "Divide both sides by 2.", zh: "两边同时除以 2。", zhHans: "两边同时除以 2。" },
      difficulty: "Medium"
    }
  ]
};

test("builds a complete deterministic lesson-kit schema from validated questions", () => {
  const sections = buildDeterministicTeacherLessonKitSections(baseContext);
  const kinds = new Set(sections.map((section) => section.kind));
  assert.equal(sections.length, 10);
  assert.equal(kinds.has("lesson-plan"), true);
  assert.equal(kinds.has("learning-guide"), true);
  assert.equal(kinds.has("slides"), true);
  assert.equal(kinds.has("worked-examples"), true);
  assert.equal(
    sections.some((section) => section.questions?.some((question) => question.source === "question-bank" && question.validationStatus === "validated")),
    true
  );
});

test("rejects obvious protected textbook-copying risk terms", () => {
  assert.equal(hasProtectedTextRisk("请照抄教材第 12 页原文"), true);
  assert.equal(parseTeacherLessonKitSectionsFromLLM("{\"sections\":[{\"kind\":\"lesson-plan\",\"content\":\"教材第 12 页原文\"}]}"), null);
});

test("parses structured LLM JSON only when enough valid sections are present", () => {
  const parsed = parseTeacherLessonKitSectionsFromLLM(JSON.stringify({
    sections: ["objectives", "key-points", "lesson-plan", "learning-guide", "slides", "worked-examples"].map((kind, index) => ({
      id: `s${index}`,
      kind,
      title: { en: kind, zh: kind },
      content: { en: `content ${index}`, zh: `内容 ${index}` },
      items: [],
      questions: []
    }))
  }));
  assert.equal(parsed?.length, 6);
  assert.equal(parseTeacherLessonKitSectionsFromLLM("{not json"), null);
});

test("LLM prompt carries PEP/BNU publisher filters and bans copied source text", () => {
  const bnuPrompt = buildTeacherLessonKitLLMPrompt({
    ...baseContext,
    publisher: "MAINLAND_BNU",
    publisherLabel: { en: "BNUP Mathematics", zh: "北师大版数学", zhHans: "北师大版数学" }
  });
  assert.match(bnuPrompt, /MAINLAND_BNU/);
  assert.match(bnuPrompt, /北师大版数学/);
  assert.match(bnuPrompt, /禁止复制教材/);
});
