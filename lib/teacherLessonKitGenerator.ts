import type {
  Difficulty,
  GradeId,
  LocalizedText,
  TeacherLessonKitSection,
  TeacherLessonKitSectionKind,
  TeacherLessonKitSectionQuestion,
  TextbookPublisher
} from "@/types";

export type TeacherLessonKitGenerationQuestion = {
  id: string;
  prompt: LocalizedText;
  answer: string;
  explanation: LocalizedText;
  difficulty: Difficulty;
};

export type TeacherLessonKitGenerationContext = {
  grade: GradeId;
  gradeLabel: string;
  publisher: TextbookPublisher;
  publisherLabel: LocalizedText;
  topicId: string;
  topicTitle: LocalizedText;
  lessonTitle: LocalizedText;
  lessonPeriod: number;
  lessonType: "new-lesson" | "review" | "practice" | "exam-prep";
  durationMinutes: number;
  lessonDescription?: LocalizedText;
  lessonBlockSummaries: LocalizedText[];
  practiceQuestions: TeacherLessonKitGenerationQuestion[];
};

const protectedTextRiskPatterns = [
  /逐字/,
  /原文/,
  /照抄/,
  /教材第?\s*\d+\s*页/,
  /课本第?\s*\d+\s*页/,
  /copyright/i,
  /版权所有/
];

const sectionOrder: TeacherLessonKitSectionKind[] = [
  "objectives",
  "key-points",
  "lesson-plan",
  "learning-guide",
  "slides",
  "worked-examples",
  "class-practice",
  "classroom-activity",
  "blackboard-design",
  "homework"
];

const sectionTitle: Record<TeacherLessonKitSectionKind, LocalizedText> = {
  "lesson-plan": { en: "Lesson plan", zh: "教案", zhHans: "教案" },
  "learning-guide": { en: "Student learning guide", zh: "導學案", zhHans: "导学案" },
  slides: { en: "Web slides", zh: "網頁課件", zhHans: "网页课件" },
  "blackboard-design": { en: "Blackboard design", zh: "板書設計", zhHans: "板书设计" },
  objectives: { en: "Teaching objectives", zh: "教學目標", zhHans: "教学目标" },
  "key-points": { en: "Key and difficult points", zh: "重難點", zhHans: "重难点" },
  "worked-examples": { en: "Worked examples", zh: "例題講解", zhHans: "例题讲解" },
  "class-practice": { en: "Class practice", zh: "課堂練習", zhHans: "课堂练习" },
  homework: { en: "Homework", zh: "課後作業", zhHans: "课后作业" },
  "classroom-activity": { en: "Classroom activity", zh: "課堂活動", zhHans: "课堂活动" }
};

function zh(value: LocalizedText) {
  return value.zhHans ?? value.zh;
}

function cleanText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().replace(/\s+/g, " ").slice(0, 4000) || fallback;
}

function localized(en: string, zhHans: string): LocalizedText {
  return { en, zh: zhHans, zhHans };
}

function shortItems(items: string[], prefixEn: string, prefixZh: string): LocalizedText[] {
  return items.filter(Boolean).slice(0, 6).map((item, index) => localized(`${prefixEn} ${index + 1}: ${item}`, `${prefixZh}${index + 1}：${item}`));
}

function questionToSectionQuestion(question: TeacherLessonKitGenerationQuestion): TeacherLessonKitSectionQuestion {
  return {
    questionId: question.id,
    prompt: question.prompt,
    answer: question.answer,
    explanation: question.explanation,
    difficulty: question.difficulty,
    source: "question-bank",
    validationStatus: "validated"
  };
}

function questionLine(question: TeacherLessonKitGenerationQuestion, index: number) {
  return localized(
    `Example ${index + 1}: ${question.prompt.en} Answer: ${question.answer}. ${question.explanation.en}`,
    `例题 ${index + 1}：${zh(question.prompt)} 答案：${question.answer}。${zh(question.explanation)}`
  );
}

function buildSection({
  kind,
  content,
  items = [],
  questions = [],
  minutes,
  teacherNotes
}: {
  kind: TeacherLessonKitSectionKind;
  content: LocalizedText;
  items?: LocalizedText[];
  questions?: TeacherLessonKitSectionQuestion[];
  minutes?: number;
  teacherNotes?: LocalizedText;
}): TeacherLessonKitSection {
  return {
    id: `section-${kind}`,
    kind,
    title: sectionTitle[kind],
    content,
    items,
    questions,
    estimatedMinutes: minutes,
    teacherNotes,
    order: sectionOrder.indexOf(kind)
  };
}

export function hasProtectedTextRisk(value: string) {
  return protectedTextRiskPatterns.some((pattern) => pattern.test(value));
}

export function buildDeterministicTeacherLessonKitSections(context: TeacherLessonKitGenerationContext): TeacherLessonKitSection[] {
  const topicZh = zh(context.topicTitle);
  const lessonZh = zh(context.lessonTitle);
  const publisherZh = zh(context.publisherLabel);
  const blockSummaries = context.lessonBlockSummaries.length
    ? context.lessonBlockSummaries
    : [localized(`Use definitions and representations for ${context.topicTitle.en}.`, `围绕${topicZh}建立概念、表示与解题步骤。`)];
  const exampleQuestions = context.practiceQuestions.slice(0, 2);
  const classPractice = context.practiceQuestions.slice(2, 6);
  const homework = context.practiceQuestions.slice(6, 10);
  const fallbackQuestion = context.practiceQuestions[0];
  const hook = localized(
    `Connect ${context.topicTitle.en} with a familiar classroom situation, then ask students to predict which representation is most efficient.`,
    `从一个贴近课堂的情境切入${topicZh}，先让学生判断哪种表示或方法最有效。`
  );
  const lessonSummary = context.lessonDescription ?? localized(
    `${context.publisherLabel.en} ${context.gradeLabel} period ${context.lessonPeriod} on ${context.topicTitle.en}.`,
    `${publisherZh}${context.gradeLabel}第${context.lessonPeriod}课时：${topicZh}。`
  );

  return [
    buildSection({
      kind: "objectives",
      content: localized(
        `Students build a usable understanding of ${context.topicTitle.en}, explain the method choice, and complete checked practice independently.`,
        `学生能够理解${topicZh}的核心含义，说清方法选择，并独立完成有校验的练习。`
      ),
      items: [
        localized(`Identify the known quantities, target, and representation for ${context.topicTitle.en}.`, `能指出${topicZh}中的已知量、目标与表示方式。`),
        localized("Explain one worked example with complete mathematical language.", "能用完整数学语言讲清一个例题。"),
        localized("Use class feedback to decide whether to continue, reteach, or extend.", "能根据课堂反馈判断继续、重讲或拓展。")
      ],
      minutes: 5
    }),
    buildSection({
      kind: "key-points",
      content: localized(
        "Keep the lesson focused on concept visibility, method selection, and common-error diagnosis.",
        `本课聚焦概念可视化、方法选择和常见错误诊断。`
      ),
      items: shortItems([
        `${topicZh}的概念边界`,
        "从题意到表达式/图形/表格的转换",
        "计算后的验算与单位/条件检查",
        "易错点：只套公式、不解释条件"
      ], "Focus", "重点"),
      minutes: 5
    }),
    buildSection({
      kind: "lesson-plan",
      content: localized(
        `Lesson flow: warm-up, concept construction, worked example, quick check, activity, exit ticket, and homework handoff. ${context.lessonTitle.en}`,
        `教学流程：导入、概念建构、例题讲解、随堂检测、课堂活动、离堂反馈与作业布置。${lessonZh}`
      ),
      items: [
        hook,
        ...blockSummaries.slice(0, 4),
        localized("Use the live check when half the class has attempted the first practice question.", "在半数学生完成第一道练习后发起即时检测。")
      ],
      minutes: Math.max(20, context.durationMinutes - 15)
    }),
    buildSection({
      kind: "learning-guide",
      content: localized(
        "Student guide: write what is known, choose a representation, solve, and check the answer against the original condition.",
        "导学案：写清已知，选择表示方式，完成求解，并回到原条件验算。"
      ),
      items: [
        localized("Before class: review prerequisite vocabulary and one simple example.", "课前：复习前置词汇和一个基础例子。"),
        localized("During class: fill in the representation table and mark any uncertain step.", "课中：完成表示表格，并标出不确定步骤。"),
        localized("After class: correct one mistake and write one method note.", "课后：订正一个错误，并写一句方法提醒。")
      ],
      questions: fallbackQuestion ? [questionToSectionQuestion(fallbackQuestion)] : [],
      minutes: 8
    }),
    buildSection({
      kind: "slides",
      content: localized(
        "Slide deck: title, learning goals, visual model, worked example, class practice, activity prompt, exit ticket.",
        "课件页：标题、学习目标、直观模型、例题、课堂练习、活动任务、离堂反馈。"
      ),
      items: [
        localized(`Slide 1: ${context.topicTitle.en}`, `第1页：${topicZh}`),
        localized("Slide 2: learning objectives and success criteria", "第2页：学习目标与成功标准"),
        localized("Slide 3: concept model with teacher annotation space", "第3页：概念模型与教师批注区"),
        localized("Slide 4: worked example and checking step", "第4页：例题与验算步骤"),
        localized("Slide 5: quick practice and live response", "第5页：随堂练习与即时反馈"),
        localized("Slide 6: student work sample comparison", "第6页：学生成果上屏比较")
      ],
      minutes: context.durationMinutes
    }),
    buildSection({
      kind: "worked-examples",
      content: localized(
        "Use validated question-bank examples first. Make the checking step explicit before students practice.",
        "优先使用已验证题库例题。学生练习前必须示范验算步骤。"
      ),
      items: exampleQuestions.length ? exampleQuestions.map(questionLine) : [localized("No validated examples available yet.", "暂无可用已验证例题。")],
      questions: exampleQuestions.map(questionToSectionQuestion),
      minutes: 12
    }),
    buildSection({
      kind: "class-practice",
      content: localized(
        "Run two to four checked questions, then use live classroom responses to decide whether to reteach.",
        "安排2至4道有答案校验的练习，并用课堂即时反馈判断是否重讲。"
      ),
      items: classPractice.map((question, index) => localized(`Practice ${index + 1}: ${question.prompt.en}`, `练习${index + 1}：${zh(question.prompt)}`)),
      questions: classPractice.map(questionToSectionQuestion),
      minutes: 10
    }),
    buildSection({
      kind: "classroom-activity",
      content: localized(
        "Pair comparison: students explain two solution paths, then the teacher selects one student work sample for the big screen.",
        "同伴比较：学生解释两种解法，教师选择一份学生成果上屏讲评。"
      ),
      items: [
        localized("Mode: quick poll plus student work sample display.", "形式：快速投票 + 学生成果上屏。"),
        localized("Teacher prompt: Which step shows the key mathematical idea?", "教师提问：哪一步最能体现关键数学思想？"),
        localized("Follow-up: mark one strong method and one common risk.", "追问：标出一个好方法和一个常见风险。")
      ],
      questions: fallbackQuestion ? [questionToSectionQuestion(fallbackQuestion)] : [],
      minutes: 8
    }),
    buildSection({
      kind: "blackboard-design",
      content: localized(
        "Board layout: left for concept and conditions, middle for worked example, right for error diagnosis and homework reminder.",
        "板书布局：左侧概念与条件，中间例题步骤，右侧错因诊断与作业提醒。"
      ),
      items: [
        localized("Left: definition, condition, and representation.", "左：定义、条件、表示方式。"),
        localized("Middle: numbered solution steps with checking.", "中：编号解题步骤与验算。"),
        localized("Right: common misconception and exit-ticket result.", "右：常见误区与离堂反馈结果。")
      ],
      minutes: 4
    }),
    buildSection({
      kind: "homework",
      content: localized(
        "Homework uses validated questions and one reflection prompt. Answers stay available for teacher review.",
        "课后作业使用已验证题目，并加入一道反思任务。答案保留给教师审核。"
      ),
      items: homework.map((question, index) => localized(`Homework ${index + 1}: ${question.prompt.en}`, `作业${index + 1}：${zh(question.prompt)}`)),
      questions: homework.map(questionToSectionQuestion),
      minutes: 5
    })
  ];
}

function localizedFromUnknown(value: unknown, fallback: LocalizedText): LocalizedText {
  if (typeof value === "string") {
    const cleaned = cleanText(value);
    return cleaned ? { en: cleaned, zh: cleaned, zhHans: cleaned } : fallback;
  }

  const record = value as Partial<LocalizedText> | null;
  const en = cleanText(record?.en, fallback.en);
  const zhValue = cleanText(record?.zhHans ?? record?.zh, fallback.zh);
  return {
    en,
    zh: zhValue,
    zhHans: zhValue
  };
}

function normalizeQuestions(value: unknown): TeacherLessonKitSectionQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((question, index): TeacherLessonKitSectionQuestion | null => {
    const record = question as Partial<TeacherLessonKitSectionQuestion> | null;
    const prompt = localizedFromUnknown(record?.prompt, localized(`Generated prompt ${index + 1}`, `生成题目${index + 1}`));
    const answer = cleanText(record?.answer, "");
    if (!prompt.en || !answer) return null;
    return {
      questionId: typeof record?.questionId === "string" && record.questionId.trim() ? record.questionId.trim().slice(0, 160) : undefined,
      prompt,
      answer,
      explanation: record?.explanation ? localizedFromUnknown(record.explanation, localized(answer, answer)) : localized(answer, answer),
      difficulty: record?.difficulty,
      source: record?.source === "question-bank" || record?.source === "manual" ? record.source : "ai-generated",
      validationStatus: record?.source === "question-bank" ? "validated" : "needs-review"
    };
  }).filter((question): question is TeacherLessonKitSectionQuestion => Boolean(question));
}

export function parseTeacherLessonKitSectionsFromLLM(reply: string): TeacherLessonKitSection[] | null {
  const trimmed = reply.trim();
  if (!trimmed || hasProtectedTextRisk(trimmed)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const sections = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { sections?: unknown } | null)?.sections)
      ? (parsed as { sections: unknown[] }).sections
      : [];

  const normalized = sections.map((section, index): TeacherLessonKitSection | null => {
    const record = section as Partial<TeacherLessonKitSection> | null;
    const kind = record?.kind && sectionOrder.includes(record.kind) ? record.kind : null;
    if (!kind) return null;
    const content = localizedFromUnknown(record?.content, localized(sectionTitle[kind].en, zh(sectionTitle[kind])));
    const title = localizedFromUnknown(record?.title, sectionTitle[kind]);
    const items = Array.isArray(record?.items)
      ? record.items.slice(0, 10).map((item) => localizedFromUnknown(item, localized("", ""))).filter((item) => item.en || item.zh)
      : [];
    return {
      id: typeof record?.id === "string" && record.id.trim() ? record.id.trim().slice(0, 120) : `section-${kind}`,
      kind,
      title,
      content,
      items,
      questions: normalizeQuestions(record?.questions),
      estimatedMinutes: typeof record?.estimatedMinutes === "number" && Number.isFinite(record.estimatedMinutes)
        ? Math.max(1, Math.min(60, Math.round(record.estimatedMinutes)))
        : undefined,
      teacherNotes: record?.teacherNotes ? localizedFromUnknown(record.teacherNotes, localized("", "")) : undefined,
      order: typeof record?.order === "number" && Number.isFinite(record.order) ? record.order : index
    };
  }).filter((section): section is TeacherLessonKitSection => Boolean(section));

  const uniqueByKind = new Map<TeacherLessonKitSectionKind, TeacherLessonKitSection>();
  normalized.forEach((section) => {
    if (!uniqueByKind.has(section.kind)) uniqueByKind.set(section.kind, section);
  });

  const ordered = sectionOrder
    .map((kind, index) => {
      const section = uniqueByKind.get(kind);
      return section ? { ...section, order: index } : null;
    })
    .filter((section): section is TeacherLessonKitSection => Boolean(section));

  return ordered.length >= 6 ? ordered : null;
}

export function buildTeacherLessonKitLLMPrompt(context: TeacherLessonKitGenerationContext) {
  const questionSummaries = context.practiceQuestions.slice(0, 8).map((question, index) => ({
    index: index + 1,
    id: question.id,
    prompt: zh(question.prompt),
    answer: question.answer,
    explanation: zh(question.explanation),
    difficulty: question.difficulty
  }));

  return [
    "你是中国内地数学教师备课助手。请生成原创、结构化、可审核的数学备课包 JSON。",
    "禁止复制教材、教辅、试卷原文；只能使用安全改写、知识点抽象和原创表达。",
    "所有新生成题必须包含 answer 和 explanation；没有确定答案的题不要输出。",
    "优先使用提供的 validatedQuestions 作为例题、课堂练习和作业。",
    "输出 JSON 对象，格式为 {\"sections\":[...]}，sections 的 kind 必须来自指定集合。",
    JSON.stringify({
      allowedKinds: sectionOrder,
      grade: context.grade,
      publisher: context.publisher,
      publisherLabel: zh(context.publisherLabel),
      topicId: context.topicId,
      topicTitle: zh(context.topicTitle),
      lessonTitle: zh(context.lessonTitle),
      lessonPeriod: context.lessonPeriod,
      lessonType: context.lessonType,
      durationMinutes: context.durationMinutes,
      lessonDescription: context.lessonDescription ? zh(context.lessonDescription) : "",
      lessonBlockSummaries: context.lessonBlockSummaries.map(zh),
      validatedQuestions: questionSummaries
    })
  ].join("\n");
}
