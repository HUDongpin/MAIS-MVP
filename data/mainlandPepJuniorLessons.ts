import lessonPackJson from "../coordination/content-qa/mainland-pep-junior-lessons-v1/lessons.json";
import type { LocalizedText } from "@/types";
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
  metadata: {
    topicId: string;
    estimatedMinutes: number;
  };
  studentLesson: {
    zhHans: GeneratedStudentLesson;
    en: GeneratedStudentLesson;
  };
  futureProductionMapping?: {
    productionLessonSeedReady?: boolean;
  };
};

type GeneratedLessonPack = {
  lessons: GeneratedLesson[];
};

const lessonPack = lessonPackJson as GeneratedLessonPack;

function approvedForProduction(lesson: GeneratedLesson) {
  return (
    lesson.reviewStatus === "approved" &&
    lesson.integrationStatus === "production-integrated" &&
    lesson.futureProductionMapping?.productionLessonSeedReady === true
  );
}

function localized(en: string, zhHans: string): LocalizedText {
  return { en, zh: zhHans, zhHans };
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
    .map((checkpoint, index) => `小练习 ${index + 1}：${checkpoint.prompt} 答案：${checkpoint.answer}。${checkpoint.explanation}`)
    .join("\n");
  const enCheckpoints = en.checkpoints
    .map((checkpoint, index) => `Checkpoint ${index + 1}: ${checkpoint.prompt} Answer: ${checkpoint.answer}. ${checkpoint.explanation}`)
    .join("\n");

  return {
    en: `${enExamples}\n\n${enCheckpoints}`,
    zh: `${zhExamples}\n\n${zhCheckpoints}`,
    zhHans: `${zhExamples}\n\n${zhCheckpoints}`
  };
}

function glossaryText(entries: GeneratedGlossaryEntry[]) {
  return entries.map((entry) => `${entry.term}: ${entry.definition}`).join("；");
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
    localized(`Misconception clinic: ${en.misconceptionClinic[0]}`, `诊断：${zh.misconceptionClinic[0]}`),
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
      title: localized("Worked examples and checkpoints", "例题精讲与小练习"),
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
    blocks: productionBlocks(lesson)
  };
}

export const mainlandPepJuniorLessonSeeds: ProductionLessonSeed[] = lessonPack.lessons
  .filter(approvedForProduction)
  .map(toProductionLessonSeed);
