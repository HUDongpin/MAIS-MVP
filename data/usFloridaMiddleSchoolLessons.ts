import {
  type GeneratedFloridaMiddleSchoolChapter,
  usFloridaMiddleSchoolChapters
} from "./usFloridaMiddleSchoolTopics";
import { usFloridaMiddleSchoolQuestions } from "./usFloridaMiddleSchoolQuestions";
import type { LocalizedText } from "@/types";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";

function localized(en: string): LocalizedText {
  return { en, zh: en, zhHans: en };
}

function questionIdsForTopic(topicId: string) {
  return usFloridaMiddleSchoolQuestions
    .filter((question) => question.topicId === topicId)
    .map((question) => question.id);
}

function workedExampleContent(chapter: GeneratedFloridaMiddleSchoolChapter) {
  return chapter.studentText.workedExamples
    .map((example, index) => {
      const label = `Example ${index + 1}`;
      return `${label}: ${example.prompt} Solution: ${example.solution} Check: ${example.check}.`;
    })
    .join(" ");
}

function checklistItems(chapter: GeneratedFloridaMiddleSchoolChapter): LocalizedText[] {
  return [
    ...chapter.studentText.learningGoals,
    "Check units, signs, labels, and whether the answer fits the situation."
  ]
    .slice(0, 4)
    .map(localized);
}

function extensionItems(chapter: GeneratedFloridaMiddleSchoolChapter): LocalizedText[] {
  const fastTask = chapter.studentText.fastStyleTasks[0];
  return [
    ...(chapter.studentText.misconceptionClinic.length
      ? chapter.studentText.misconceptionClinic.slice(0, 2)
      : ["Name a likely error and how to catch it."]),
    fastTask ? `Original FAST-style task: ${fastTask.prompt}` : chapter.studentText.exitTicket,
    chapter.studentText.exitTicket
  ].map(localized);
}

function toProductionLessonSeed(chapter: GeneratedFloridaMiddleSchoolChapter): ProductionLessonSeed {
  const practiceQuestionIds = questionIdsForTopic(chapter.topicId);
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
    topicId: chapter.topicId,
    productionReady: true,
    title: localized(`Florida ${chapter.usGradeLabel}: ${chapter.chapterTitle}`),
    description: localized(chapter.chapterSummary),
    estimatedMinutes: 32 + chapter.chapterNumber * 4,
    practiceQuestionIds,
    blocks
  };
}

export const usFloridaMiddleSchoolLessonSeeds: ProductionLessonSeed[] =
  usFloridaMiddleSchoolChapters.map(toProductionLessonSeed);
