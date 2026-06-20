import type {
  Difficulty,
  Language,
  LocalizedText,
  TeacherAssessmentQuestionAnalytics,
  TeacherReviewLessonBoardColumn,
  TeacherReviewLessonIndividualGroup,
  TeacherReviewLessonItem,
  TeacherReviewLessonItemCategory,
  TeacherReviewLessonMisconceptionTag,
  TeacherReviewLessonPlan,
  TeacherReviewLessonPracticeQuestion,
  TeacherReviewLessonSlide,
  TeacherReviewLessonSourceSnapshot
} from "@/types";

export const teacherReviewLessonMisconceptionTags: TeacherReviewLessonMisconceptionTag[] = [
  "conceptual-understanding",
  "calculation-symbol",
  "reading-modeling",
  "solution-steps",
  "graph-table-reading",
  "unit-format",
  "strategy-choice"
];

export type TeacherReviewLessonClassificationInput = {
  totalResponses: number;
  correctRate: number | null;
  wrongCount: number;
  totalStudents: number;
  commonWrongAnswerCount: number;
};

export type TeacherReviewLessonAnalyticsInput = TeacherAssessmentQuestionAnalytics & {
  wrongStudentIds: string[];
  wrongStudentNames: string[];
  commonWrongAnswerCount: number;
};

export type TeacherReviewLessonPracticeBankInput = {
  questionId: string;
  prompt: LocalizedText;
  answer: string;
  explanation?: LocalizedText;
  topicId?: string;
  difficulty?: Difficulty;
};

export type BuildTeacherReviewLessonDraftInput = {
  id: string;
  teacherId: string;
  classId: string;
  className: string;
  assessmentId: string;
  assessmentTitle: LocalizedText;
  assessmentUpdatedAt: string;
  language: Language;
  durationMinutes: number;
  now: string;
  submittedCount: number;
  totalStudents: number;
  analytics: TeacherReviewLessonAnalyticsInput[];
  practiceBank: TeacherReviewLessonPracticeBankInput[];
};

function localized(en: string, zh: string): LocalizedText {
  return { en, zh, zhHans: zh };
}

function zh(value: LocalizedText | undefined, fallback = "") {
  return value?.zhHans ?? value?.zh ?? value?.en ?? fallback;
}

function text(value: LocalizedText | undefined, language: Language, fallback = "") {
  if (!value) return fallback;
  if (language === "zh-Hans") return value.zhHans ?? value.zh ?? value.en;
  if (language === "zh") return value.zh ?? value.zhHans ?? value.en;
  return value.en;
}

function percentThreshold(part: number, whole: number, ratio: number) {
  return whole > 0 && part >= Math.ceil(whole * ratio);
}

export function classifyTeacherReviewLessonItem(input: TeacherReviewLessonClassificationInput): TeacherReviewLessonItemCategory {
  const effectiveResponses = Math.max(0, input.totalResponses);
  const classSize = Math.max(input.totalStudents, effectiveResponses);
  const hasEnoughResponses = effectiveResponses >= 3;
  const sameWrongThreshold = Math.max(3, Math.ceil(effectiveResponses * 0.2));
  const isMustTeach =
    hasEnoughResponses &&
    (
      (input.correctRate !== null && input.correctRate <= 55) ||
      percentThreshold(input.wrongCount, classSize || effectiveResponses, 0.35) ||
      input.commonWrongAnswerCount >= sameWrongThreshold
    );

  if (isMustTeach) return "must-teach";
  if ((input.correctRate !== null && input.correctRate < 85) || input.wrongCount >= 2) return "quick-review";
  return "individual-support";
}

function categoryReason(category: TeacherReviewLessonItemCategory, input: TeacherReviewLessonClassificationInput): LocalizedText {
  const correctRate = input.correctRate === null ? "--" : `${input.correctRate}%`;
  if (category === "must-teach") {
    return localized(
      `Whole-class reteach: ${input.wrongCount} students missed it, correct rate ${correctRate}, common wrong answer count ${input.commonWrongAnswerCount}.`,
      `全班必讲：${input.wrongCount} 人出错，正确率 ${correctRate}，同一错答 ${input.commonWrongAnswerCount} 人。`
    );
  }
  if (category === "quick-review") {
    return localized(
      `Quick review: not a whole-class blocker, but correct rate is ${correctRate} or at least two students missed it.`,
      `可略讲：未达到全班必讲阈值，但正确率为 ${correctRate} 或至少 2 人出错。`
    );
  }
  return localized(
    `Individual support: few students missed it, so keep it out of student-facing slides and handle in a teacher support list.`,
    `个别辅导：少数学生出错，不进入学生讲评 PPT，进入教师辅导清单。`
  );
}

function misconceptionTagsFor(item: TeacherReviewLessonAnalyticsInput): TeacherReviewLessonMisconceptionTag[] {
  const haystack = [
    item.prompt.en,
    item.prompt.zh,
    item.prompt.zhHans,
    item.topicTitle?.en,
    item.topicTitle?.zh,
    item.commonWrongAnswer ?? ""
  ].filter(Boolean).join(" ").toLowerCase();
  const tags = new Set<TeacherReviewLessonMisconceptionTag>();

  if (/graph|diagram|table|chart|圖|图|表/.test(haystack)) tags.add("graph-table-reading");
  if (/unit|cm|kg|m2|m\^2|degree|°|單位|单位/.test(haystack)) tags.add("unit-format");
  if (/model|word problem|context|建模|题意|題意|应用/.test(haystack)) tags.add("reading-modeling");
  if (/step|prove|show|explain|過程|过程|证明|證明/.test(haystack)) tags.add("solution-steps");
  if (/[+\-*/=]|\\frac|fraction|小数|分数|符号|符號/.test(haystack)) tags.add("calculation-symbol");
  if (/method|strategy|choose|compare|策略|方法|选择|選擇/.test(haystack)) tags.add("strategy-choice");
  if (!tags.size) tags.add("conceptual-understanding");

  return Array.from(tags).slice(0, 3);
}

function teachingScriptFor(item: TeacherReviewLessonAnalyticsInput, category: TeacherReviewLessonItemCategory): LocalizedText {
  const topicEn = item.topicTitle?.en ?? "this concept";
  const topicZh = zh(item.topicTitle, "本题知识点");
  const correctRate = item.correctRate === null ? "--" : `${item.correctRate}%`;
  if (category === "individual-support") {
    return localized(
      `Use this after class with the listed students. Ask them to restate the known information, compare their answer with ${item.correctAnswer ?? "the answer key"}, and repair one written step.`,
      `课后对名单学生使用。请学生先复述已知条件，再把自己的答案与${item.correctAnswer ?? "标准答案"}比较，最后补写一个关键步骤。`
    );
  }
  return localized(
    `Start from the common wrong answer, name the likely misconception, then rebuild the standard method for ${topicEn}. Keep the class check short: correct rate ${correctRate}, correct answer ${item.correctAnswer ?? "see answer key"}.`,
    `从常见错答切入，点明可能错因，再重建${topicZh}的规范方法。课堂检测保持简短：正确率 ${correctRate}，标准答案 ${item.correctAnswer ?? "见答案"}。`
  );
}

function buildItems(input: BuildTeacherReviewLessonDraftInput): TeacherReviewLessonItem[] {
  return input.analytics
    .map((item, index) => {
      const wrongCount = Math.max(0, item.totalResponses - item.correctCount);
      const classificationInput = {
        totalResponses: item.totalResponses,
        correctRate: item.correctRate,
        wrongCount,
        totalStudents: input.totalStudents,
        commonWrongAnswerCount: item.commonWrongAnswerCount
      };
      const category = classifyTeacherReviewLessonItem(classificationInput);
      return {
        id: `review-item-${item.questionId}`,
        questionId: item.questionId,
        prompt: item.prompt,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
        sectionId: item.sectionId,
        sectionTitle: item.sectionTitle,
        topicId: item.topicId,
        topicTitle: item.topicTitle,
        maxPoints: item.maxPoints,
        correctRate: item.correctRate,
        correctCount: item.correctCount,
        totalResponses: item.totalResponses,
        wrongCount,
        wrongStudentIds: item.wrongStudentIds,
        wrongStudentNames: item.wrongStudentNames,
        commonWrongAnswer: item.commonWrongAnswer,
        commonWrongAnswerCount: item.commonWrongAnswerCount,
        category,
        categoryReason: categoryReason(category, classificationInput),
        misconceptionTags: misconceptionTagsFor(item),
        teachingScript: teachingScriptFor(item, category),
        teacherNotes: localized("", ""),
        order: index
      };
    })
    .sort((a, b) => {
      const categoryRank: Record<TeacherReviewLessonItemCategory, number> = {
        "must-teach": 0,
        "quick-review": 1,
        "individual-support": 2
      };
      return categoryRank[a.category] - categoryRank[b.category] ||
        (a.correctRate ?? 101) - (b.correctRate ?? 101) ||
        b.wrongCount - a.wrongCount ||
        a.order - b.order;
    })
    .map((item, order) => ({ ...item, order }));
}

function categoryItems(items: TeacherReviewLessonItem[], category: TeacherReviewLessonItemCategory) {
  return items.filter((item) => item.category === category);
}

function buildTimeline(durationMinutes: number, mustTeachCount: number): TeacherReviewLessonPlan["timeline"] {
  const duration = Math.max(20, Math.min(90, durationMinutes));
  const mustTeachMinutes = Math.max(12, Math.min(duration - 18, mustTeachCount * 6 || 12));
  const quickMinutes = Math.max(5, Math.min(10, duration - mustTeachMinutes - 18));
  const remediationMinutes = Math.max(5, duration - mustTeachMinutes - quickMinutes - 8);
  return [
    { id: "timeline-entry", label: localized("Entry diagnosis and lesson goals", "导入诊断与本节目标"), minutes: 5 },
    { id: "timeline-must", label: localized("Must-teach worked review", "必讲题规范讲评"), minutes: mustTeachMinutes },
    { id: "timeline-quick", label: localized("Quick-review questions", "可略讲题快速订正"), minutes: quickMinutes },
    { id: "timeline-variation", label: localized("Same-type variation check", "同类变式检测"), minutes: remediationMinutes },
    { id: "timeline-exit", label: localized("Exit ticket and remediation handoff", "离堂反馈与补救布置"), minutes: 3 }
  ];
}

function buildSlides(items: TeacherReviewLessonItem[], input: BuildTeacherReviewLessonDraftInput): TeacherReviewLessonSlide[] {
  const mustTeach = categoryItems(items, "must-teach");
  const quickReview = categoryItems(items, "quick-review");
  const individual = categoryItems(items, "individual-support");
  const slides: TeacherReviewLessonSlide[] = [
    {
      id: "slide-goals",
      title: localized("Review goals", "讲评目标"),
      bullets: [
        localized(`Use ${input.submittedCount} submitted papers to focus the review.`, `基于 ${input.submittedCount} 份提交作答聚焦讲评。`),
        localized(`Must-teach: ${mustTeach.length}; quick review: ${quickReview.length}; individual support: ${individual.length}.`, `必讲题 ${mustTeach.length} 道；可略讲 ${quickReview.length} 道；个别辅导 ${individual.length} 道。`)
      ],
      relatedItemIds: [],
      speakerNotes: localized("Student names are excluded from slides by default.", "默认不在课件中展示学生姓名。"),
      order: 0
    },
    {
      id: "slide-error-map",
      title: localized("Error pattern map", "错因地图"),
      bullets: teacherReviewLessonMisconceptionTags.slice(0, 7).map((tag) => localized(tag.replace(/-/g, " "), tagLabel(tag).zh)),
      relatedItemIds: [],
      speakerNotes: localized("Use this slide to name error categories before reteaching methods.", "先命名错因类型，再进入方法重建。"),
      order: 1
    }
  ];

  mustTeach.slice(0, 6).forEach((item) => {
    slides.push({
      id: `slide-${item.id}`,
      title: localized(`Must-teach question: ${item.correctRate ?? "--"}%`, `必讲题：正确率 ${item.correctRate ?? "--"}%`),
      bullets: [
        localized(`Common wrong answer: ${item.commonWrongAnswer ?? "not enough data"}`, `常见错答：${item.commonWrongAnswer ?? "暂无足够数据"}`),
        item.categoryReason,
        item.teachingScript
      ],
      relatedItemIds: [item.id],
      speakerNotes: item.explanation ?? item.teachingScript,
      order: slides.length
    });
  });

  if (quickReview.length) {
    slides.push({
      id: "slide-quick-review",
      title: localized("Quick-review queue", "可略讲题队列"),
      bullets: quickReview.slice(0, 6).map((item) => localized(
        `${item.correctRate ?? "--"}% correct: ${text(item.prompt, "en").slice(0, 80)}`,
        `${item.correctRate ?? "--"}% 正确：${text(item.prompt, "zh-Hans").slice(0, 80)}`
      )),
      relatedItemIds: quickReview.slice(0, 6).map((item) => item.id),
      speakerNotes: localized("Use one representative solution and one fast correction check.", "每题用一个代表性解法和一次快速订正检测。"),
      order: slides.length
    });
  }

  slides.push({
    id: "slide-remediation",
    title: localized("After-class remediation", "课后补救"),
    bullets: [
      localized("Assign only reviewed variation/remediation questions.", "只布置教师确认后的变式与补救题。"),
      localized("Use the individual support list privately; do not project student names.", "个别辅导名单仅教师私下使用，不投屏展示学生姓名。")
    ],
    relatedItemIds: [],
    speakerNotes: localized("Generated or drafted questions remain needs-teacher-review until confirmed.", "生成或草拟题在确认前保持待教师审核状态。"),
    order: slides.length
  });

  return slides.map((slide, order) => ({ ...slide, order }));
}

function tagLabel(tag: TeacherReviewLessonMisconceptionTag): LocalizedText {
  const labels: Record<TeacherReviewLessonMisconceptionTag, LocalizedText> = {
    "conceptual-understanding": localized("Conceptual understanding", "概念理解"),
    "calculation-symbol": localized("Calculation and symbols", "计算符号"),
    "reading-modeling": localized("Reading and modeling", "审题建模"),
    "solution-steps": localized("Solution steps", "步骤表达"),
    "graph-table-reading": localized("Graph/table reading", "图表读取"),
    "unit-format": localized("Unit and format", "单位格式"),
    "strategy-choice": localized("Strategy choice", "策略选择")
  };
  return labels[tag];
}

function buildBoardColumns(items: TeacherReviewLessonItem[]): TeacherReviewLessonBoardColumn[] {
  const mustTeach = categoryItems(items, "must-teach").slice(0, 4);
  const quickReview = categoryItems(items, "quick-review").slice(0, 4);
  return [
    {
      id: "board-goals",
      title: localized("Goals and error stats", "本节目标 / 错因统计"),
      blocks: [
        localized("1. Name the error category before correcting the method.", "1. 先命名错因，再订正方法。"),
        localized(`2. Focus on ${mustTeach.length} must-teach questions.`, `2. 聚焦 ${mustTeach.length} 道必讲题。`),
        localized(`3. Keep individual support private after class.`, "3. 个别辅导课后私下完成。")
      ],
      order: 0
    },
    {
      id: "board-worked",
      title: localized("Must-teach worked process", "必讲题规范过程"),
      blocks: mustTeach.length
        ? mustTeach.map((item, index) => localized(
            `${index + 1}. ${text(item.prompt, "en").slice(0, 90)} -> correct answer ${item.correctAnswer ?? "answer key"}`,
            `${index + 1}. ${text(item.prompt, "zh-Hans").slice(0, 90)} -> 标准答案 ${item.correctAnswer ?? "见答案"}`
          ))
        : [localized("No must-teach questions under current thresholds.", "当前阈值下暂无必讲题。")],
      order: 1
    },
    {
      id: "board-variation",
      title: localized("Variation and remediation", "变式与课后补救"),
      blocks: [
        ...quickReview.map((item, index) => localized(
          `Quick ${index + 1}: ${item.correctRate ?? "--"}% correct, use one-line repair.`,
          `可略讲 ${index + 1}：正确率 ${item.correctRate ?? "--"}%，用一句话订正。`
        )),
        localized("Exit: one same-type question and one reflection note.", "离堂：一道同类题加一句错因反思。")
      ],
      order: 2
    }
  ];
}

function candidateForItem(item: TeacherReviewLessonItem, bank: TeacherReviewLessonPracticeBankInput[], usedIds: Set<string>) {
  const sameTopic = bank.find((candidate) =>
    candidate.questionId !== item.questionId &&
    !usedIds.has(candidate.questionId) &&
    (!item.topicId || candidate.topicId === item.topicId)
  );
  const fallback = bank.find((candidate) => candidate.questionId !== item.questionId && !usedIds.has(candidate.questionId));
  const selected = sameTopic ?? fallback;
  if (selected) usedIds.add(selected.questionId);
  return selected;
}

function draftPracticeQuestion(
  kind: "variation" | "remediation",
  item: TeacherReviewLessonItem,
  bank: TeacherReviewLessonPracticeBankInput[],
  usedIds: Set<string>
): TeacherReviewLessonPracticeQuestion {
  const candidate = candidateForItem(item, bank, usedIds);
  if (candidate) {
    return {
      id: `${kind}-${candidate.questionId}`,
      source: "question-bank",
      prompt: candidate.prompt,
      answer: candidate.answer,
      explanation: candidate.explanation,
      topicId: candidate.topicId,
      difficulty: candidate.difficulty,
      relatedItemId: item.id,
      validationStatus: "validated"
    };
  }
  return {
    id: `${kind}-${item.id}`,
    source: "manual",
    prompt: localized(
      `Create a same-type ${kind} question for: ${text(item.prompt, "en").slice(0, 120)}`,
      `请围绕本题设计一道同类${kind === "variation" ? "变式" : "补救"}题：${text(item.prompt, "zh-Hans").slice(0, 120)}`
    ),
    answer: item.correctAnswer ?? "",
    explanation: item.explanation,
    topicId: item.topicId,
    relatedItemId: item.id,
    validationStatus: "needs-teacher-review"
  };
}

function buildPractice(items: TeacherReviewLessonItem[], bank: TeacherReviewLessonPracticeBankInput[]) {
  const focusItems = items.filter((item) => item.category !== "individual-support");
  const usedVariationIds = new Set<string>();
  const usedRemediationIds = new Set<string>();
  return {
    variations: focusItems.slice(0, 6).map((item) => draftPracticeQuestion("variation", item, bank, usedVariationIds)),
    remediation: focusItems.slice(0, 8).map((item) => draftPracticeQuestion("remediation", item, bank, usedRemediationIds))
  };
}

function buildIndividualGroups(items: TeacherReviewLessonItem[]): TeacherReviewLessonIndividualGroup[] {
  return categoryItems(items, "individual-support")
    .filter((item) => item.wrongStudentIds.length)
    .slice(0, 12)
    .map((item, index) => ({
      id: `individual-group-${index + 1}`,
      label: localized(`Individual support ${index + 1}`, `个别辅导 ${index + 1}`),
      itemIds: [item.id],
      studentIds: item.wrongStudentIds,
      studentNames: item.wrongStudentNames,
      guidance: localized(
        `Private support on one missed question. Ask for a corrected solution and one misconception note.`,
        `围绕一道错题做私下辅导：要求学生交一份订正过程和一句错因记录。`
      )
    }));
}

export function buildTeacherReviewLessonDraft(input: BuildTeacherReviewLessonDraftInput): TeacherReviewLessonPlan {
  const items = buildItems(input);
  const mustTeach = categoryItems(items, "must-teach");
  const practice = buildPractice(items, input.practiceBank);
  const sourceSnapshot: TeacherReviewLessonSourceSnapshot = {
    assessmentId: input.assessmentId,
    assessmentTitle: input.assessmentTitle,
    assessmentUpdatedAt: input.assessmentUpdatedAt,
    classId: input.classId,
    className: input.className,
    submittedCount: input.submittedCount,
    totalStudents: input.totalStudents,
    questionCount: input.analytics.length,
    generatedAt: input.now
  };

  return {
    id: input.id,
    teacherId: input.teacherId,
    classId: input.classId,
    className: input.className,
    assessmentId: input.assessmentId,
    title: localized(
      `Review lesson: ${input.assessmentTitle.en}`,
      `讲评课：${zh(input.assessmentTitle, input.assessmentTitle.en)}`
    ),
    language: input.language,
    durationMinutes: Math.max(20, Math.min(90, input.durationMinutes)),
    status: "generated",
    source: "assessment",
    sourceSnapshot,
    sourceSnapshotStale: false,
    objectives: [
      localized("Prioritize the questions that block whole-class progress.", "优先讲清影响全班推进的题目。"),
      localized("Name common misconception patterns and repair the standard method.", "归类常见错因，并重建规范方法。"),
      localized("Use same-type variation and remediation questions only after teacher review.", "变式与补救题经教师确认后再布置。")
    ],
    timeline: buildTimeline(input.durationMinutes, mustTeach.length),
    items,
    slides: buildSlides(items, input),
    boardColumns: buildBoardColumns(items),
    variationQuestions: practice.variations,
    remediationQuestions: practice.remediation,
    individualGroups: buildIndividualGroups(items),
    generationNotes: localized(
      "Deterministic draft generated from assessment statistics. AI enrichment was not used; generated/manual practice drafts need teacher review.",
      "已基于测验统计生成确定性草稿。本版本未调用 AI 润色；生成/草拟练习需教师审核。"
    ),
    createdAt: input.now,
    updatedAt: input.now,
    generatedAt: input.now,
    reviewedAt: null
  };
}

export function renderTeacherReviewLessonMarkdown(plan: TeacherReviewLessonPlan, language: Language = plan.language) {
  const lines: string[] = [];
  const line = (value = "") => lines.push(value);
  const local = (value: LocalizedText) => text(value, language);

  line(`# ${local(plan.title)}`);
  line();
  line(`- Class: ${plan.className}`);
  line(`- Source assessment: ${local(plan.sourceSnapshot.assessmentTitle)}`);
  line(`- Submitted: ${plan.sourceSnapshot.submittedCount}/${plan.sourceSnapshot.totalStudents}`);
  line(`- Generated: ${plan.generatedAt}`);
  line();
  line("## Objectives");
  plan.objectives.forEach((objective) => line(`- ${local(objective)}`));
  line();
  line("## Timeline");
  plan.timeline.forEach((entry) => line(`- ${entry.minutes} min: ${local(entry.label)}`));
  line();
  line("## Question Classification");
  (["must-teach", "quick-review", "individual-support"] as TeacherReviewLessonItemCategory[]).forEach((category) => {
    line(`### ${category}`);
    categoryItems(plan.items, category).forEach((item, index) => {
      line(`${index + 1}. ${local(item.prompt)}`);
      line(`   - Correct rate: ${item.correctRate ?? "--"}%; wrong: ${item.wrongCount}/${item.totalResponses}`);
      line(`   - Reason: ${local(item.categoryReason)}`);
      line(`   - Script: ${local(item.teachingScript)}`);
    });
    line();
  });
  line("## Blackboard");
  plan.boardColumns.forEach((column) => {
    line(`### ${local(column.title)}`);
    column.blocks.forEach((block) => line(`- ${local(block)}`));
  });
  line();
  line("## Remediation Questions");
  plan.remediationQuestions.forEach((question, index) => {
    line(`${index + 1}. ${local(question.prompt)}`);
    line(`   - Answer: ${question.answer || "TBD"}`);
    line(`   - Status: ${question.validationStatus}`);
  });

  return lines.join("\n");
}
