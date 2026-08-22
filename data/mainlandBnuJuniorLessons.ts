import lessonPackJson from "./generated-content/mainland-bnu-junior-lessons-v1/lessons.json";
import { toSafeMainlandSimplifiedText, toTraditionalHjbText } from "./hjbQuestionLocalization";
import { mainlandBnuJuniorQuestions } from "./mainlandBnuJuniorQuestions";
import type { Difficulty, LocalizedText, Question } from "@/types";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";

type GeneratedCheckpoint = {
  id: string;
  prompt: string;
  answer: string;
  explanation: string;
};

type GeneratedWorkedExample = {
  title: string;
  prompt: string;
  solution: string;
  check: string;
};

type GeneratedGlossaryEntry = {
  term: string;
  definition: string;
};

type GeneratedStudentLesson = {
  title: string;
  hook: string;
  objectives: string[];
  prerequisiteWarmUp: string;
  conceptExplanation: string;
  workedExamples: GeneratedWorkedExample[];
  commonPitfalls: string[];
  misconceptionClinic: string[];
  strategyChecklist: string[];
  checkpoints: GeneratedCheckpoint[];
  examStyleStrategy: string;
  extension: string;
  exitTicket: string;
  glossary: GeneratedGlossaryEntry[];
};

type GeneratedBnuJuniorLesson = {
  id: string;
  sourceSafetyStatus: string;
  sourceDistanceStatus: string;
  metadata: {
    topicId: string;
    grade: string;
    semester: string;
    volume: string;
    unitTitle: string;
    titleZhHans: string;
    titleEn: string;
    estimatedMinutes: number;
    evidenceCardIds: string[];
    assessmentPatternCardIds: string[];
    zhongkaoPatternCardIds: string[];
  };
  studentLesson: {
    zhHans: GeneratedStudentLesson;
    en: GeneratedStudentLesson;
  };
};

type GeneratedBnuJuniorLessonPack = {
  integrationGate?: {
    decision?: string;
  };
  lessons: GeneratedBnuJuniorLesson[];
};

const lessonPack = lessonPackJson as GeneratedBnuJuniorLessonPack;
const practiceDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Low", 2],
  ["Medium", 3],
  ["High", 3]
];

function lessonOrder(lesson: GeneratedBnuJuniorLesson) {
  const match = lesson.id.match(/-lesson-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function approvedForProduction(lesson: GeneratedBnuJuniorLesson) {
  return (
    lessonPack.integrationGate?.decision === "approved-for-production-integration" &&
    lesson.sourceSafetyStatus === "safe-rag-only" &&
    lesson.sourceDistanceStatus === "passed-auto-source-scan"
  );
}

function localized(en: string, zhHans: string): LocalizedText {
  const simplified = toSafeMainlandSimplifiedText(zhHans);
  return { en, zh: toTraditionalHjbText(simplified), zhHans: simplified };
}

function withoutTerminalPunctuation(value: string) {
  return value.trim().replace(/[。！？.!?]+$/u, "");
}

function withoutInternalAuthoringLabel(value: string, language: "en" | "zhHans") {
  if (language === "en") {
    return value
      .replace(/^This lesson uses (?:original )?MAIS contexts to study /u, "Explore ")
      .replace(/\bThis S\d+ (?:upper|lower) opening\b/gu, "This unit")
      .replace(/\bThis S\d+ (?:upper|lower) (?:algebra|proof|geometry) unit\b/gu, "This unit")
      .replace(/\bS\d+ (?:upper|lower)(?: geometry)?\b/gu, "This unit");
  }
  return value.replace(/^本课使用 MAIS 自主设计情境学习/u, "从数学情境学习");
}

function volumeTitleEn(volume: string) {
  const match = volume.match(/^([七八九])年级([上下])册$/u);
  if (!match) return "the current volume";
  const gradeByCharacter: Record<string, number> = { 七: 7, 八: 8, 九: 9 };
  return `Grade ${gradeByCharacter[match[1]]} Volume ${match[2] === "上" ? 1 : 2}`;
}

function questionIdSort(left: Question, right: Question) {
  return left.id.localeCompare(right.id, "zh-Hans");
}

function selectPracticeQuestionIds(topicId: string) {
  const topicQuestions = mainlandBnuJuniorQuestions.filter((question) => question.topicId === topicId).sort(questionIdSort);
  const picked = new Set<string>();

  practiceDifficultyQuotas.forEach(([difficulty, quota]) => {
    topicQuestions
      .filter((question) => question.difficulty === difficulty)
      .slice(0, quota)
      .forEach((question) => picked.add(question.id));
  });
  topicQuestions.forEach((question) => {
    if (picked.size < 8) picked.add(question.id);
  });

  return Array.from(picked).slice(0, 8);
}

function glossaryText(entries: GeneratedGlossaryEntry[]) {
  return entries.map((entry) => `${entry.term}: ${entry.definition}`).join("; ");
}

function workedExampleContent(lesson: GeneratedBnuJuniorLesson) {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  const zhExamples = zh.workedExamples
    .map((example) => `${withoutTerminalPunctuation(example.title)}：${withoutTerminalPunctuation(example.prompt)}。答案：${withoutTerminalPunctuation(example.solution)}。检查：${withoutTerminalPunctuation(example.check)}。`)
    .join("\n\n");
  const enExamples = en.workedExamples
    .map((example) => `${withoutTerminalPunctuation(example.title)}: ${withoutTerminalPunctuation(example.prompt)}. Answer: ${withoutTerminalPunctuation(example.solution)}. Check: ${withoutTerminalPunctuation(example.check)}.`)
    .join("\n\n");
  const zhCheckpoints = zh.checkpoints
    .map((checkpoint, index) => `小检查 ${index + 1}：${withoutTerminalPunctuation(checkpoint.prompt)}。参考：${withoutTerminalPunctuation(checkpoint.answer)}。${withoutTerminalPunctuation(checkpoint.explanation)}。`)
    .join("\n");
  const enCheckpoints = en.checkpoints
    .map((checkpoint, index) => `Checkpoint ${index + 1}: ${withoutTerminalPunctuation(checkpoint.prompt)}. Reference: ${withoutTerminalPunctuation(checkpoint.answer)}. ${withoutTerminalPunctuation(checkpoint.explanation)}.`)
    .join("\n");

  return localized(`${enExamples}\n\n${enCheckpoints}`, `${zhExamples}\n\n${zhCheckpoints}`);
}

function checklistItems(lesson: GeneratedBnuJuniorLesson): LocalizedText[] {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  return [
    localized(en.objectives[0], zh.objectives[0]),
    localized(en.objectives[1], zh.objectives[1]),
    localized(en.objectives[2], zh.objectives[2]),
    localized(`Strategy: ${en.strategyChecklist[1]}`, `策略：${zh.strategyChecklist[1]}`),
    localized(`Avoid: ${en.commonPitfalls[0]}`, `避免：${zh.commonPitfalls[0]}`)
  ];
}

function extensionItems(lesson: GeneratedBnuJuniorLesson): LocalizedText[] {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  return [
    localized(en.examStyleStrategy, zh.examStyleStrategy),
    localized(en.extension, zh.extension),
    localized(en.exitTicket, zh.exitTicket)
  ];
}

function lessonBlocks(lesson: GeneratedBnuJuniorLesson, index: number): ProductionLessonBlock[] {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  const lessonNumber = index + 1;

  return [
    {
      idSuffix: `lesson-${lessonNumber}-concept`,
      type: "concept",
      title: localized(`Lesson ${lessonNumber}: ${en.title}`, `第${lessonNumber}课：${zh.title}`),
      content: localized(
        `${withoutInternalAuthoringLabel(en.hook, "en")} ${en.prerequisiteWarmUp} ${withoutInternalAuthoringLabel(en.conceptExplanation, "en")} Glossary: ${glossaryText(en.glossary)}`,
        `${withoutInternalAuthoringLabel(zh.hook, "zhHans")} ${zh.prerequisiteWarmUp} ${zh.conceptExplanation} 关键词：${glossaryText(zh.glossary)}`
      )
    },
    {
      idSuffix: `lesson-${lessonNumber}-worked-example`,
      type: "worked-example",
      title: localized(`Lesson ${lessonNumber}: original examples and checks`, `第${lessonNumber}课：原创例题与小检查`),
      content: workedExampleContent(lesson)
    },
    {
      idSuffix: `lesson-${lessonNumber}-checklist`,
      type: "checklist",
      title: localized(`Lesson ${lessonNumber}: before practice`, `第${lessonNumber}课：练习前检查`),
      items: checklistItems(lesson)
    },
    {
      idSuffix: `lesson-${lessonNumber}-extension`,
      type: "extension",
      title: localized(`Lesson ${lessonNumber}: extension and exit ticket`, `第${lessonNumber}课：拓展与出门票`),
      items: extensionItems(lesson)
    }
  ];
}

function teacherGuideBlock(lessons: GeneratedBnuJuniorLesson[]): ProductionLessonBlock {
  const firstLesson = lessons[0];
  return {
    idSuffix: "teacher-guide",
    type: "teacher-guide",
    title: localized("Teacher guide", "教师使用建议"),
    content: localized(
      `Use the checkpoint for ${volumeTitleEn(firstLesson.metadata.volume)} to identify whether learners are ready for more independent practice.`,
      `先用本课检查题了解学生的掌握情况，再按需要安排独立练习。`
    ),
    items: [
      localized("Ask learners to name the condition before choosing a method.", "先让学生说出条件，再选择方法。"),
      localized("Use the misconception clinic before assigning independent practice.", "布置独立练习前，先用错因诊断确认理解。"),
      localized("Choose follow-up questions that match the same unit, grade, and learning goal.", "后续练习应与本单元、年级和学习目标一致。")
    ]
  };
}

function productionBlocks(lessons: GeneratedBnuJuniorLesson[]): ProductionLessonBlock[] {
  const firstLesson = lessons[0];
  return [
    ...lessonBlocks(firstLesson, 0),
    teacherGuideBlock(lessons)
  ];
}

function unitTitleEn(lesson: GeneratedBnuJuniorLesson) {
  return lesson.metadata.titleEn.replace(/:\s*.*$/, "");
}

function toProductionLessonSeed(lessons: GeneratedBnuJuniorLesson[]): ProductionLessonSeed {
  const sortedLessons = [...lessons].sort((left, right) => lessonOrder(left) - lessonOrder(right) || left.id.localeCompare(right.id, "zh-Hans"));
  const firstLesson = sortedLessons[0];

  return {
    topicId: firstLesson.metadata.topicId,
    productionReady: true,
    title: localized(`BNU Junior: ${unitTitleEn(firstLesson)}`, `北师大版初中：${firstLesson.metadata.unitTitle}`),
    description: localized(
      `Build ${unitTitleEn(firstLesson)} by connecting definitions and conditions with worked examples, explicit reasoning, and a final check.`,
      `围绕《${firstLesson.metadata.unitTitle}》连接定义、条件、例题和推理步骤，并在完成后检查结论。`
    ),
    estimatedMinutes: firstLesson.metadata.estimatedMinutes,
    practiceQuestionIds: selectPracticeQuestionIds(firstLesson.metadata.topicId),
    blocks: productionBlocks(sortedLessons)
  };
}

const approvedLessons = lessonPack.lessons.filter(approvedForProduction);
const lessonsByTopicId = approvedLessons.reduce((map, lesson) => {
  const bucket = map.get(lesson.metadata.topicId) ?? [];
  bucket.push(lesson);
  map.set(lesson.metadata.topicId, bucket);
  return map;
}, new Map<string, GeneratedBnuJuniorLesson[]>());

export const mainlandBnuJuniorSourceLessonCount = approvedLessons.length;
export const mainlandBnuJuniorLessonSeeds: ProductionLessonSeed[] = Array.from(lessonsByTopicId.values())
  .map(toProductionLessonSeed);
