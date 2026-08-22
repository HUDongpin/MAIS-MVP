import lessonPackJson from "./generated-content/mainland-pep-primary-lessons-v1/lessons.json";
import { chinaLessonTraditionalTranslation } from "./chinaLessonTraditionalTranslations";
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

const practiceQuestionIdsByTopicId: Record<string, string[]> = {
  "pep-primary-p1-lower-within-100-add-sub": [
    "pep-primary-p1-l-fi-101",
    "pep-primary-p1-l-fi-102",
    "pep-primary-p1-l-fi-103",
    "pep-primary-p1-l-fi-104",
    "pep-primary-p1-l-fi-105"
  ],
  "pep-primary-p1-lower-money-data-review": [
    "pep-primary-p1-l-fi-151",
    "pep-primary-p1-l-fi-152",
    "pep-primary-p1-l-fi-153",
    "pep-primary-p1-l-fi-155",
    "pep-primary-p1-l-sa-191"
  ],
  "pep-primary-p1-upper-number-sense": [
    "pep-primary-p1-u-mc-001",
    "pep-primary-p1-u-mc-002",
    "pep-primary-p1-u-mc-003",
    "pep-primary-p1-u-mc-005",
    "pep-primary-p1-u-mc-006"
  ],
  "pep-primary-p1-upper-shapes-position-time": [
    "pep-primary-p1-u-mc-051",
    "pep-primary-p1-u-mc-052",
    "pep-primary-p1-u-mc-053",
    "pep-primary-p1-u-mc-054",
    "pep-primary-p1-u-fi-091"
  ],
  "pep-primary-p2-lower-division-remainder": [
    "pep-primary-p2-l-fi-101",
    "pep-primary-p2-l-fi-102",
    "pep-primary-p2-l-fi-103",
    "pep-primary-p2-l-fi-104",
    "pep-primary-p2-l-fi-105"
  ],
  "pep-primary-p2-lower-place-value-measurement-data": [
    "pep-primary-p2-l-fi-151",
    "pep-primary-p2-l-fi-152",
    "pep-primary-p2-l-fi-153",
    "pep-primary-p2-l-fi-154",
    "pep-primary-p2-l-fi-155"
  ],
  "pep-primary-p2-upper-length-angles-observation": [
    "pep-primary-p2-u-mc-051",
    "pep-primary-p2-u-mc-052",
    "pep-primary-p2-u-mc-053",
    "pep-primary-p2-u-mc-054",
    "pep-primary-p2-u-fi-091"
  ],
  "pep-primary-p2-upper-multiplication-arrays": [
    "pep-primary-p2-u-mc-001",
    "pep-primary-p2-u-mc-002",
    "pep-primary-p2-u-mc-003",
    "pep-primary-p2-u-mc-004",
    "pep-primary-p2-u-mc-005"
  ],
  "pep-primary-p3-lower-area-decimals": [
    "pep-primary-p3-l-fi-101",
    "pep-primary-p3-l-fi-102",
    "pep-primary-p3-l-fi-103",
    "pep-primary-p3-l-fi-104",
    "pep-primary-p3-l-fi-105"
  ],
  "pep-primary-p3-lower-statistics-review": [
    "pep-primary-p3-l-sa-151",
    "pep-primary-p3-l-sa-152",
    "pep-primary-p3-l-sa-153",
    "pep-primary-p3-l-sa-154",
    "pep-primary-p3-l-sa-155"
  ],
  "pep-primary-p3-upper-measurement-time-geometry": [
    "pep-primary-p3-u-mc-051",
    "pep-primary-p3-u-mc-052",
    "pep-primary-p3-u-mc-053",
    "pep-primary-p3-u-mc-054",
    "pep-primary-p3-u-fi-076"
  ],
  "pep-primary-p3-upper-operations-fractions": [
    "pep-primary-p3-u-mc-001",
    "pep-primary-p3-u-mc-002",
    "pep-primary-p3-u-mc-003",
    "pep-primary-p3-u-mc-004",
    "pep-primary-p3-u-mc-005"
  ],
  "pep-primary-p4-lower-decimals-average": [
    "pep-primary-p4-l-fi-101",
    "pep-primary-p4-l-fi-102",
    "pep-primary-p4-l-fi-103",
    "pep-primary-p4-l-fi-104",
    "pep-primary-p4-l-fi-105"
  ],
  "pep-primary-p4-lower-perimeter-area-lines": [
    "pep-primary-p4-l-sa-151",
    "pep-primary-p4-l-sa-152",
    "pep-primary-p4-l-sa-153",
    "pep-primary-p4-l-sa-154",
    "pep-primary-p4-l-sa-155"
  ],
  "pep-primary-p4-upper-angles-geometry": [
    "pep-primary-p4-u-mc-051",
    "pep-primary-p4-u-mc-052",
    "pep-primary-p4-u-mc-053",
    "pep-primary-p4-u-mc-054",
    "pep-primary-p4-u-fi-076"
  ],
  "pep-primary-p4-upper-large-numbers-multiplication": [
    "pep-primary-p4-u-mc-001",
    "pep-primary-p4-u-mc-002",
    "pep-primary-p4-u-mc-003",
    "pep-primary-p4-u-mc-004",
    "pep-primary-p4-u-mc-005"
  ],
  "pep-primary-p5-lower-factors-fractions": [
    "pep-primary-p5-l-fi-101",
    "pep-primary-p5-l-fi-102",
    "pep-primary-p5-l-fi-103",
    "pep-primary-p5-l-fi-104",
    "pep-primary-p5-l-fi-105"
  ],
  "pep-primary-p5-lower-volume-data": [
    "pep-primary-p5-l-sa-151",
    "pep-primary-p5-l-sa-152",
    "pep-primary-p5-l-sa-153",
    "pep-primary-p5-l-sa-154",
    "pep-primary-p5-l-sa-177"
  ],
  "pep-primary-p5-upper-polygon-area": [
    "pep-primary-p5-u-mc-051",
    "pep-primary-p5-u-mc-052",
    "pep-primary-p5-u-mc-053",
    "pep-primary-p5-u-mc-054",
    "pep-primary-p5-u-fi-061"
  ],
  "pep-primary-p5-upper-decimals-equations": [
    "pep-primary-p5-u-mc-001",
    "pep-primary-p5-u-mc-002",
    "pep-primary-p5-u-mc-003",
    "pep-primary-p5-u-mc-004",
    "pep-primary-p5-u-mc-005"
  ],
  "pep-primary-p6-lower-negative-review": [
    "pep-primary-p6-l-sa-151",
    "pep-primary-p6-l-sa-152",
    "pep-primary-p6-l-sa-153",
    "pep-primary-p6-l-sa-154",
    "pep-primary-p6-l-sa-155"
  ],
  "pep-primary-p6-upper-coordinate-data": [
    "pep-primary-p6-u-mc-051",
    "pep-primary-p6-u-mc-053",
    "pep-primary-p6-u-mc-054",
    "pep-primary-p6-u-mc-055",
    "pep-primary-p6-u-fi-061"
  ],
  "pep-primary-p6-upper-percent-fractions": [
    "pep-primary-p6-u-mc-001",
    "pep-primary-p6-u-mc-002",
    "pep-primary-p6-u-mc-003",
    "pep-primary-p6-u-mc-004",
    "pep-primary-p6-u-mc-005"
  ],
  "pep-primary-p6-lower-ratio-proportion-scale": [
    "pep-primary-p6-l-fi-101",
    "pep-primary-p6-l-fi-102",
    "pep-primary-p6-l-fi-103",
    "pep-primary-p6-l-fi-104",
    "pep-primary-p6-l-fi-105"
  ]
};

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

const decimalAverageTopicId = "pep-primary-p4-lower-decimals-average";
const decimalAverageCheckRepair = {
  en: "Because 2.75 lies between 2.7 and 2.8, the sum lies between 6.3 and 6.4. Since 6.35 is in that range, the result is reasonable.",
  zhHans: "2.75在2.7和2.8之间，所以和应在6.3和6.4之间；6.35符合这个范围，结果合理。",
  zh: "2.75在2.7和2.8之間，所以和應在6.3和6.4之間；6.35符合這個範圍，結果合理。"
} as const;

function reviewedWorkedExampleCheck(
  lesson: GeneratedLesson,
  exampleIndex: number,
  language: "en" | "zhHans"
) {
  if (lesson.metadata.topicId === decimalAverageTopicId && exampleIndex === 0) {
    return decimalAverageCheckRepair[language];
  }
  return lesson.studentLesson[language].workedExamples[exampleIndex].check;
}

function workedExampleContent(lesson: GeneratedLesson) {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  const zhExamples = zh.workedExamples
    .map((example, index) => `${example.title}：${example.prompt} 答案：${example.solution} 检查：${reviewedWorkedExampleCheck(lesson, index, "zhHans")}`)
    .join("\n\n");
  const enExamples = en.workedExamples
    .map((example, index) => `${example.title}: ${example.prompt} Answer: ${example.solution} Check: ${reviewedWorkedExampleCheck(lesson, index, "en")}`)
    .join("\n\n");
  const zhCheckpoints = zh.checkpoints
    .map((checkpoint, index) => `小练习 ${index + 1}：${checkpoint.prompt} 答案：${checkpoint.answer}。${checkpoint.explanation}`)
    .join("\n");
  const enCheckpoints = en.checkpoints
    .map((checkpoint, index) => `Checkpoint ${index + 1}: ${checkpoint.prompt} Answer: ${checkpoint.answer}. ${checkpoint.explanation}`)
    .join("\n");

  const zhHansContent = `${zhExamples}\n\n${zhCheckpoints}`;
  const zhContent = lesson.metadata.topicId === decimalAverageTopicId
    ? chinaLessonTraditionalTranslation(zhHansContent) ?? zhHansContent
    : zhHansContent;

  return {
    en: `${enExamples}\n\n${enCheckpoints}`,
    zh: zhContent,
    zhHans: zhHansContent
  };
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
    localized(`Helpful reminder: ${en.misconceptionClinic[0]}`, `提示：${zh.misconceptionClinic[0]}`),
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
        `${en.hook} ${en.prerequisiteWarmUp} ${en.conceptExplanation}`,
        `${zh.hook} ${zh.prerequisiteWarmUp} ${zh.conceptExplanation}`
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
  const practiceQuestionIds = practiceQuestionIdsByTopicId[lesson.metadata.topicId];

  return {
    topicId: lesson.metadata.topicId,
    productionReady: true,
    title: localized(
      en.title.replace(/: Explain the Method Clearly$/, ""),
      zh.title.replace(/：把方法讲清楚$/, "")
    ),
    description: localized(en.hook, zh.hook),
    estimatedMinutes: lesson.metadata.estimatedMinutes,
    ...(practiceQuestionIds ? { practiceQuestionIds } : {}),
    blocks: productionBlocks(lesson)
  };
}

export const mainlandPepPrimaryLessonSeeds: ProductionLessonSeed[] = lessonPack.lessons
  .filter(approvedForProduction)
  .map(toProductionLessonSeed);
