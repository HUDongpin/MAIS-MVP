import textbookPackJson from "./generated-content/us-ar-math-textbooks-v1/textbook-pack.json";
import { usArkansasQuestions } from "./usArkansasQuestions";
import type { Difficulty, GradeId, LocalizedText } from "@/types";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";

type ArkansasMiddleSchoolGradeId = Extract<GradeId, "P6" | "S1" | "S2">;

type ArkansasTextbookChapter = {
  id: string;
  grade: ArkansasMiddleSchoolGradeId;
  usGradeLabel: string;
  chapterNumber: number;
  chapterTitle: string;
  standardIds: string[];
  domainTags: string[];
  conceptIds: string[];
  studentText: {
    learningGoals: string[];
    conceptExplanation: string;
    workedExamples: Array<{
      title: string;
      prompt: string;
      solution: string;
      check: string;
    }>;
    misconceptionClinic: string[];
    atlasStyleTasks: Array<{
      prompt: string;
      answer: string;
      explanation: string;
    }>;
    exitTicket: string;
  };
};

type ArkansasTextbookBook = {
  grade: GradeId;
  chapters: ArkansasTextbookChapter[];
};

type ArkansasTextbookPack = {
  books: ArkansasTextbookBook[];
};

const textbookPack = textbookPackJson as ArkansasTextbookPack;
const middleSchoolGrades = new Set<GradeId>(["P6", "S1", "S2"]);
const practiceDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Low", 2],
  ["Medium", 3],
  ["High", 3]
];

function localized(en: string): LocalizedText {
  return { en, zh: en, zhHans: en };
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function gradeNumber(chapter: ArkansasTextbookChapter) {
  const match = chapter.usGradeLabel.match(/\d+/);
  if (!match) throw new Error(`Missing Arkansas grade number for ${chapter.id}`);
  return match[0].padStart(2, "0");
}

function topicIdForChapter(chapter: ArkansasTextbookChapter) {
  return `us-ar-math-g${gradeNumber(chapter)}-chapter-${String(chapter.chapterNumber).padStart(2, "0")}-${slug(chapter.chapterTitle)}`;
}

function questionsForTopic(topicId: string) {
  return usArkansasQuestions.filter((question) => question.topicId === topicId);
}

function questionSort(left: (typeof usArkansasQuestions)[number], right: (typeof usArkansasQuestions)[number]) {
  return (
    practiceDifficultyQuotas.findIndex(([difficulty]) => difficulty === left.difficulty) -
      practiceDifficultyQuotas.findIndex(([difficulty]) => difficulty === right.difficulty) ||
    left.id.localeCompare(right.id, "en", { numeric: true })
  );
}

function selectPracticeQuestionIds(topicId: string) {
  const topicQuestions = questionsForTopic(topicId).sort(questionSort);
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

function workedExampleContent(chapter: ArkansasTextbookChapter) {
  return chapter.studentText.workedExamples
    .map((example, index) => {
      const label = example.title || `Worked example ${index + 1}`;
      return `${label}: ${example.prompt} Solution: ${example.solution} Check: ${example.check}.`;
    })
    .join(" ");
}

function checklistItems(chapter: ArkansasTextbookChapter): LocalizedText[] {
  return [
    ...chapter.studentText.learningGoals,
    "Check units, signs, labels, and whether the answer fits the situation."
  ]
    .slice(0, 4)
    .map(localized);
}

function extensionItems(chapter: ArkansasTextbookChapter): LocalizedText[] {
  const atlasTask = chapter.studentText.atlasStyleTasks[0];
  return [
    ...(chapter.studentText.misconceptionClinic.length
      ? chapter.studentText.misconceptionClinic.slice(0, 2)
      : ["Name a likely error and how to catch it."]),
    atlasTask ? `Original Arkansas-style task: ${atlasTask.prompt}` : chapter.studentText.exitTicket,
    chapter.studentText.exitTicket
  ].map(localized);
}

function toProductionLessonSeed(chapter: ArkansasTextbookChapter): ProductionLessonSeed {
  const topicId = topicIdForChapter(chapter);
  const blocks: ProductionLessonBlock[] = [
    {
      idSuffix: "concept",
      type: "concept",
      title: localized("Concept"),
      content: localized(chapter.studentText.conceptExplanation)
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: localized("Worked example"),
      content: localized(workedExampleContent(chapter))
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: localized("Reasoning checklist"),
      items: checklistItems(chapter)
    },
    {
      idSuffix: "extension",
      type: "extension",
      title: localized("Extension"),
      items: extensionItems(chapter)
    }
  ];

  return {
    topicId,
    productionReady: true,
    title: localized(`Arkansas ${chapter.usGradeLabel}: ${chapter.chapterTitle}`),
    description: localized(
      `${chapter.usGradeLabel} Arkansas pathway for ${chapter.chapterTitle}, aligned to ${chapter.standardIds.join(", ")} with MAIS-authored safe-card content.`
    ),
    estimatedMinutes: 32 + chapter.chapterNumber * 4,
    practiceQuestionIds: selectPracticeQuestionIds(topicId),
    blocks
  };
}

export const usArkansasMiddleSchoolChapters: ArkansasTextbookChapter[] = textbookPack.books
  .filter((book) => middleSchoolGrades.has(book.grade))
  .flatMap((book) => book.chapters);

export const usArkansasMiddleSchoolLessonSeeds: ProductionLessonSeed[] =
  usArkansasMiddleSchoolChapters.map(toProductionLessonSeed);
