import lessonPackJson from "../coordination/content-qa/mainland-pep-high-lessons-v1/lessons.json";
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

type GeneratedStudentLesson = {
  title: string;
  hook: string;
  objectives: string[];
  prerequisiteWarmUp: string;
  conceptExplanation: string;
  workedExamples: GeneratedWorkedExample[];
  commonPitfalls: string[];
  checkpoints: GeneratedCheckpoint[];
  examStyleStrategy: string;
  extension: string;
  exitTicket: string;
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

function workedExampleContent(lesson: GeneratedLesson) {
  return {
    en: lesson.studentLesson.en.workedExamples
      .map((example) => `${example.title}: ${example.prompt} Answer: ${example.solution} Check: ${example.check}`)
      .join("\n\n"),
    zh: lesson.studentLesson.zhHans.workedExamples
      .map((example) => `${example.title}：${example.prompt} 答案：${example.solution} 检验：${example.check}`)
      .join("\n\n")
  };
}

function checklistItems(lesson: GeneratedLesson) {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  return [
    { en: en.objectives[0], zh: zh.objectives[0] },
    { en: en.objectives[1], zh: zh.objectives[1] },
    { en: `Avoid: ${en.commonPitfalls[0]}`, zh: `避免：${zh.commonPitfalls[0]}` },
    { en: en.examStyleStrategy, zh: zh.examStyleStrategy }
  ];
}

function extensionItems(lesson: GeneratedLesson) {
  return [
    { en: lesson.studentLesson.en.extension, zh: lesson.studentLesson.zhHans.extension },
    { en: lesson.studentLesson.en.exitTicket, zh: lesson.studentLesson.zhHans.exitTicket }
  ];
}

function productionBlocks(lesson: GeneratedLesson): ProductionLessonBlock[] {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  return [
    {
      idSuffix: "concept",
      type: "concept",
      title: { en: "Core concept", zh: "核心概念" },
      content: {
        en: `${en.hook} ${en.conceptExplanation}`,
        zh: `${zh.hook} ${zh.conceptExplanation}`
      }
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: { en: "Worked examples", zh: "例题精讲" },
      content: workedExampleContent(lesson)
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: { en: "Before practice", zh: "练习前检查" },
      items: checklistItems(lesson)
    },
    {
      idSuffix: "extension",
      type: "extension",
      title: { en: "Extension", zh: "拓展思考" },
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
    title: { en: en.title, zh: zh.title },
    description: { en: en.hook, zh: zh.hook },
    estimatedMinutes: lesson.metadata.estimatedMinutes,
    blocks: productionBlocks(lesson)
  };
}

export const mainlandPepHighLessonSeeds: ProductionLessonSeed[] = lessonPack.lessons
  .filter(approvedForProduction)
  .map(toProductionLessonSeed);
