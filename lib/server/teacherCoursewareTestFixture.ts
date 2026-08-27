import type { TeacherLessonKit } from "@/types";

export function coursewareFixture(overrides: Partial<TeacherLessonKit> = {}): TeacherLessonKit {
  return {
    id: "lesson-kit-courseware-test",
    teacherId: "teacher-courseware-test",
    classId: "class-courseware-test",
    className: "S1 Mathematics",
    grade: "S1",
    curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
    publisher: "MAINLAND_PEP",
    topicId: "linear-equations",
    topicTitle: { en: "Linear equations", zh: "一元一次方程", zhHans: "一元一次方程" },
    lessonSlug: "linear-equations-intro",
    lessonTitle: { en: "Solving linear equations", zh: "解一元一次方程", zhHans: "解一元一次方程" },
    chapterTitle: { en: "Equations", zh: "方程", zhHans: "方程" },
    lessonPeriod: 1,
    lessonType: "new-lesson",
    durationMinutes: 45,
    status: "reviewed",
    source: "deterministic",
    reviewStatus: "approved",
    generationNotes: { en: "Deterministic fixture.", zh: "确定性测试数据。", zhHans: "确定性测试数据。" },
    sections: [
      {
        id: "section-objectives",
        kind: "objectives",
        title: { en: "Objectives", zh: "目标", zhHans: "目标" },
        content: { en: "Solve and verify.", zh: "求解并检验。", zhHans: "求解并检验。" },
        items: [
          { en: "Solve a one-step linear equation.", zh: "解一步一元一次方程。", zhHans: "解一步一元一次方程。" },
          { en: "Verify a solution by substitution.", zh: "用代入法检验解。", zhHans: "用代入法检验解。" }
        ],
        estimatedMinutes: 3,
        order: 0
      },
      {
        id: "section-key-points",
        kind: "key-points",
        title: { en: "Key idea", zh: "核心概念", zhHans: "核心概念" },
        content: { en: "Apply the same operation to both sides.", zh: "等式两边同时进行相同运算。", zhHans: "等式两边同时进行相同运算。" },
        items: [{ en: "Keep the equation balanced.", zh: "保持等式平衡。", zhHans: "保持等式平衡。" }],
        estimatedMinutes: 12,
        order: 1
      },
      {
        id: "section-practice",
        kind: "class-practice",
        title: { en: "Guided practice", zh: "课堂练习", zhHans: "课堂练习" },
        content: { en: "Explain each inverse operation.", zh: "说明每一步逆运算。", zhHans: "说明每一步逆运算。" },
        items: [{ en: "Solve x + 3 = 8.", zh: "解 x + 3 = 8。", zhHans: "解 x + 3 = 8。" }],
        questions: [{
          questionId: "question-linear-1",
          prompt: { en: "Solve x + 3 = 8.", zh: "解 x + 3 = 8。", zhHans: "解 x + 3 = 8。" },
          answer: "x = 5",
          explanation: { en: "Subtract 3 from both sides.", zh: "等式两边同时减 3。", zhHans: "等式两边同时减 3。" },
          difficulty: "Low",
          source: "question-bank",
          validationStatus: "validated"
        }],
        estimatedMinutes: 20,
        order: 2
      }
    ],
    publishedResourceIds: [],
    createdAt: "2026-08-27T08:00:00.000Z",
    updatedAt: "2026-08-27T08:30:00.000Z",
    generatedAt: "2026-08-27T08:10:00.000Z",
    reviewedAt: "2026-08-27T08:30:00.000Z",
    publishedAt: null,
    ...overrides
  };
}
