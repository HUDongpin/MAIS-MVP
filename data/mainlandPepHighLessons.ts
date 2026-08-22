import lessonPackJson from "./generated-content/mainland-pep-high-lessons-v1/lessons.json";
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

const practiceQuestionIdsByTopicId: Record<string, string[]> = {
  "pep-high-s4-complex-numbers": [
    "pep-high-s4-mc-007",
    "pep-high-s4-fi-017",
    "pep-high-s4-sa-007",
    "pep-high-s4-mc-027",
    "pep-high-s4-fi-027"
  ],
  "pep-high-s4-exp-log": [
    "pep-high-s4-mc-044",
    "pep-high-s4-mc-004",
    "pep-high-s4-fi-014",
    "pep-high-s4-sa-014",
    "pep-high-s4-mc-024"
  ],
  "pep-high-s4-function-properties": [
    "pep-high-s4-mc-043",
    "pep-high-s4-mc-003",
    "pep-high-s4-mc-013",
    "pep-high-s4-sa-003",
    "pep-high-s4-sa-013"
  ],
  "pep-high-s4-plane-vectors": [
    "pep-high-s4-mc-046",
    "pep-high-s4-mc-006",
    "pep-high-s4-fi-016",
    "pep-high-s4-sa-006",
    "pep-high-s4-sa-016"
  ],
  "pep-high-s4-probability": [
    "pep-high-s4-mc-050",
    "pep-high-s4-mc-010",
    "pep-high-s4-fi-020",
    "pep-high-s4-sa-010",
    "pep-high-s4-mc-030"
  ],
  "pep-high-s4-quadratic-inequalities": [
    "pep-high-s4-mc-042",
    "pep-high-s4-fi-042",
    "pep-high-s4-mc-002",
    "pep-high-s4-fi-002",
    "pep-high-s4-sa-002"
  ],
  "pep-high-s4-sets-logic": [
    "pep-high-s4-mc-041",
    "pep-high-s4-mc-001",
    "pep-high-s4-fi-001",
    "pep-high-s4-sa-001",
    "pep-high-s4-mc-011"
  ],
  "pep-high-s4-solid-geometry-intro": [
    "pep-high-s4-mc-048",
    "pep-high-s4-mc-008",
    "pep-high-s4-fi-008",
    "pep-high-s4-sa-008",
    "pep-high-s4-mc-018"
  ],
  "pep-high-s4-trigonometry": [
    "pep-high-s4-mc-005",
    "pep-high-s4-fi-005",
    "pep-high-s4-sa-025",
    "pep-high-s4-sa-035",
    "pep-high-s4-sa-045"
  ],
  "pep-high-s5-conics": [
    "pep-high-s5-mc-003",
    "pep-high-s5-fi-003",
    "pep-high-s5-sa-003",
    "pep-high-s5-mc-008",
    "pep-high-s5-fi-008"
  ],
  "pep-high-s5-space-vectors": [
    "pep-high-s5-mc-041",
    "pep-high-s5-mc-001",
    "pep-high-s5-fi-006",
    "pep-high-s5-sa-001",
    "pep-high-s5-sa-006"
  ],
  "pep-high-s5-lines-circles": [
    "pep-high-s5-mc-042",
    "pep-high-s5-mc-002",
    "pep-high-s5-mc-007",
    "pep-high-s5-fi-002",
    "pep-high-s5-sa-002"
  ],
  "pep-high-s5-sequences": [
    "pep-high-s5-mc-044",
    "pep-high-s5-mc-004",
    "pep-high-s5-fi-009",
    "pep-high-s5-sa-004",
    "pep-high-s5-sa-009"
  ],
  "pep-high-s5-derivatives": [
    "pep-high-s5-mc-045",
    "pep-high-s5-mc-005",
    "pep-high-s5-fi-010",
    "pep-high-s5-sa-005",
    "pep-high-s5-sa-010"
  ],
  "pep-high-s6-random-variables": [
    "pep-high-s6-mc-037",
    "pep-high-s6-mc-002",
    "pep-high-s6-fi-009",
    "pep-high-s6-sa-002",
    "pep-high-s6-sa-009"
  ],
  "pep-high-s6-bivariate-data": [
    "pep-high-s6-mc-038",
    "pep-high-s6-mc-003",
    "pep-high-s6-fi-010",
    "pep-high-s6-fi-017",
    "pep-high-s6-sa-003"
  ],
  "pep-high-s6-derivative-synthesis": [
    "pep-high-s6-mc-039",
    "pep-high-s6-mc-004",
    "pep-high-s6-fi-011",
    "pep-high-s6-sa-004",
    "pep-high-s6-sa-011"
  ],
  "pep-high-s6-analytic-geometry-synthesis": [
    "pep-high-s6-mc-040",
    "pep-high-s6-mc-005",
    "pep-high-s6-fi-012",
    "pep-high-s6-fi-019",
    "pep-high-s6-sa-005"
  ],
  "pep-high-s6-probability-statistics-synthesis": [
    "pep-high-s6-mc-041",
    "pep-high-s6-mc-006",
    "pep-high-s6-mc-013",
    "pep-high-s6-sa-006",
    "pep-high-s6-sa-013"
  ],
  "pep-high-s6-exam-practice": [
    "pep-high-s6-mc-042",
    "pep-high-s6-mc-007",
    "pep-high-s6-fi-014",
    "pep-high-s6-sa-007",
    "pep-high-s6-sa-014"
  ]
};

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
  const practiceQuestionIds = practiceQuestionIdsByTopicId[lesson.metadata.topicId];
  return {
    topicId: lesson.metadata.topicId,
    productionReady: true,
    title: { en: en.title, zh: zh.title },
    description: { en: en.hook, zh: zh.hook },
    estimatedMinutes: lesson.metadata.estimatedMinutes,
    ...(practiceQuestionIds ? { practiceQuestionIds } : {}),
    blocks: productionBlocks(lesson)
  };
}

export const mainlandPepHighLessonSeeds: ProductionLessonSeed[] = lessonPack.lessons
  .filter(approvedForProduction)
  .map(toProductionLessonSeed);
