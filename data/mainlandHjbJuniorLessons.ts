import lessonPackJson from "./generated-content/mainland-hjb-junior-lessons-v1/lessons.json";
import { toTraditionalHjbText } from "./hjbQuestionLocalization";
import { mainlandHjbJuniorQuestions } from "./mainlandHjbJuniorQuestions";
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

type GeneratedLesson = {
  reviewStatus: string;
  integrationStatus: string;
  sourceDistanceStatus: string;
  metadata: {
    topicId: string;
    grade: string;
    semester: string;
    volume: string;
    unitTitle: string;
    evidenceCardIds: string[];
    estimatedMinutes: number;
  };
  studentLesson: {
    zhHans: GeneratedStudentLesson;
    en: GeneratedStudentLesson;
  };
  futureProductionMapping?: {
    productionLessonSeedReady?: boolean;
    practiceQuestionIntegration?: string;
  };
};

type GeneratedLessonPack = {
  lessons: GeneratedLesson[];
};

const lessonPack = lessonPackJson as GeneratedLessonPack;
const practiceDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Foundation", 2],
  ["Core", 3],
  ["Challenge", 2],
  ["Exam", 1]
];

function approvedForProduction(lesson: GeneratedLesson) {
  return (
    lesson.reviewStatus === "approved" &&
    lesson.integrationStatus === "production-integrated" &&
    lesson.sourceDistanceStatus === "passed-safe-rag" &&
    lesson.futureProductionMapping?.productionLessonSeedReady === true
  );
}

function localized(en: string, zhHans: string): LocalizedText {
  return { en, zh: toTraditionalHjbText(zhHans), zhHans };
}

function questionIdSort(left: Question, right: Question) {
  return left.id.localeCompare(right.id, "zh-Hans");
}

function selectPracticeQuestionIds(topicId: string) {
  const topicQuestions = mainlandHjbJuniorQuestions.filter((question) => question.topicId === topicId).sort(questionIdSort);
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
  return entries.map((entry) => `${entry.term}: ${entry.definition}`).join("；");
}

function workedExampleContent(lesson: GeneratedLesson) {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  const zhExamples = zh.workedExamples
    .map((example) => `${example.title}：${example.prompt} 答案：${example.solution} 检查：${example.check}`)
    .join("\n\n");
  const enExamples = en.workedExamples
    .map((example) => `${example.title}: ${example.prompt} Answer: ${example.solution} Check: ${example.check}`)
    .join("\n\n");
  const zhCheckpoints = zh.checkpoints
    .map((checkpoint, index) => `小检查 ${index + 1}：${checkpoint.prompt} 参考：${checkpoint.answer}。${checkpoint.explanation}`)
    .join("\n");
  const enCheckpoints = en.checkpoints
    .map((checkpoint, index) => `Checkpoint ${index + 1}: ${checkpoint.prompt} Reference: ${checkpoint.answer}. ${checkpoint.explanation}`)
    .join("\n");

  return localized(`${enExamples}\n\n${enCheckpoints}`, `${zhExamples}\n\n${zhCheckpoints}`);
}

function checklistItems(lesson: GeneratedLesson): LocalizedText[] {
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

function extensionItems(lesson: GeneratedLesson): LocalizedText[] {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  return [
    localized(en.examStyleStrategy, zh.examStyleStrategy),
    localized(en.extension, zh.extension),
    localized(en.exitTicket, zh.exitTicket)
  ];
}

function productionBlocks(lesson: GeneratedLesson): ProductionLessonBlock[] {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;

  return [
    {
      idSuffix: "concept",
      type: "concept",
      title: localized("Core concept", "核心概念"),
      content: localized(
        `${en.hook} ${en.prerequisiteWarmUp} ${en.conceptExplanation} Glossary: ${glossaryText(en.glossary)}`,
        `${zh.hook} ${zh.prerequisiteWarmUp} ${zh.conceptExplanation} 关键词：${glossaryText(zh.glossary)}`
      )
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: localized("Original worked examples and checks", "原创例题与小检查"),
      content: workedExampleContent(lesson)
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: localized("Before practice", "练习前检查"),
      items: checklistItems(lesson)
    },
    {
      idSuffix: "extension",
      type: "extension",
      title: localized("Extension and exit ticket", "拓展与出门票"),
      items: extensionItems(lesson)
    },
    {
      idSuffix: "teacher-guide",
      type: "teacher-guide",
      title: localized("Teacher guide", "教师使用建议"),
      content: localized(
        `Use the approved HJB junior checkpoint set for ${lesson.metadata.volume} to confirm readiness before assigning broader independent practice.`,
        `使用${lesson.metadata.volume}沪教版初中已批准课堂检查题确认学生准备度，再按需要布置独立练习。`
      ),
      items: [
        localized("Ask learners to name the condition before choosing a method.", "先让学生说出条件，再选择方法。"),
        localized("Use the misconception clinic before assigning independent practice.", "布置独立练习前，先用错因诊断确认理解。"),
        localized("Keep HJB junior lesson content separate from PEP and high-school HJB question pools.", "保持沪教版初中教材内容与人教版及沪教版高中题库隔离。")
      ]
    }
  ];
}

function toProductionLessonSeed(lesson: GeneratedLesson): ProductionLessonSeed {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;

  return {
    topicId: lesson.metadata.topicId,
    productionReady: true,
    title: localized(en.title, zh.title),
    description: localized(en.hook, zh.hook),
    estimatedMinutes: lesson.metadata.estimatedMinutes,
    practiceQuestionIds: selectPracticeQuestionIds(lesson.metadata.topicId),
    blocks: productionBlocks(lesson)
  };
}

export const mainlandHjbJuniorLessonSeeds: ProductionLessonSeed[] = lessonPack.lessons
  .filter(approvedForProduction)
  .map(toProductionLessonSeed);
