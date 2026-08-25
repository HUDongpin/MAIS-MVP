import v2QuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v2/question-pack.json";
import { mainlandHjbHighRagCards } from "./rag/mainlandHjbHigh";
import { mapDifficultyToActive } from "@/lib/difficulty";
import {
  formatHjbHighChapterTitleEn,
  formatHjbHighVolumeTitleEn,
  translateHjbHighDisplayTextEn
} from "@/lib/hjbHighDisplayText";
import type { CurriculumProfile, Difficulty, DifficultyRecord, GradeId, Topic } from "@/types";

export {
  formatHjbHighChapterTitleEn,
  formatHjbHighVolumeTitleEn,
  translateHjbHighDisplayTextEn
} from "@/lib/hjbHighDisplayText";

type GeneratedHjbQuestion = {
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  topicId: string;
  topicTitleZhHans: string;
  volume: string;
  chapter: string;
  conceptIds: string[];
  difficulty: DifficultyRecord;
  evidenceCardIds: string[];
};

type GeneratedHjbQuestionPack = {
  questions: GeneratedHjbQuestion[];
};

export type MainlandHjbHighTopicMetadata = {
  id: string;
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  titleZhHans: string;
  volume: string;
  chapter: string;
  conceptIds: string[];
  evidenceCardIds: string[];
  questionCount: number;
};

const candidateQuestionPacks = [v2QuestionPackJson as GeneratedHjbQuestionPack];
const candidateQuestions = candidateQuestionPacks.flatMap((pack) => pack.questions);
const mainlandHjbHighProfile = { region: "MAINLAND", publisher: "MAINLAND_HJB" } satisfies CurriculumProfile;
const minutesByDifficulty: Record<Difficulty, number> = {
  Low: 38,
  Medium: 44,
  High: 55
};
const difficultyPriority: Difficulty[] = ["High", "Medium", "Low"];
const ragCardById = new Map(mainlandHjbHighRagCards.map((card) => [card.id, card]));
function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

function dominantDifficulty(questions: GeneratedHjbQuestion[]) {
  const counts = new Map<Difficulty, number>();
  questions.forEach((question) => {
    const difficulty = mapDifficultyToActive(question.difficulty);
    counts.set(difficulty, (counts.get(difficulty) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || difficultyPriority.indexOf(a[0]) - difficultyPriority.indexOf(b[0]))[0]?.[0] ?? "Medium";
}

function topEvidenceCardId(questions: GeneratedHjbQuestion[]) {
  const counts = new Map<string, number>();
  questions.forEach((question) => question.evidenceCardIds.forEach((cardId) => counts.set(cardId, (counts.get(cardId) ?? 0) + 1)));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

const questionsByTopicId = candidateQuestions.reduce((map, question) => {
  const bucket = map.get(question.topicId) ?? [];
  bucket.push(question);
  map.set(question.topicId, bucket);
  return map;
}, new Map<string, GeneratedHjbQuestion[]>());

export const mainlandHjbHighTopicMetadata: Record<string, MainlandHjbHighTopicMetadata> = Object.fromEntries(
  Array.from(questionsByTopicId.entries()).map(([topicId, topicQuestions]) => {
    const firstQuestion = topicQuestions[0];
    return [topicId, {
      id: topicId,
      grade: firstQuestion.grade,
      titleZhHans: firstQuestion.topicTitleZhHans,
      volume: firstQuestion.volume,
      chapter: firstQuestion.chapter,
      conceptIds: uniqueValues(topicQuestions.flatMap((question) => question.conceptIds)),
      evidenceCardIds: uniqueValues(topicQuestions.flatMap((question) => question.evidenceCardIds)),
      questionCount: topicQuestions.length
    }];
  })
);

export const mainlandHjbHighTopics: Topic[] = Array.from(questionsByTopicId.entries())
  .sort((a, b) => a[1][0].grade.localeCompare(b[1][0].grade) || a[0].localeCompare(b[0], "zh-Hans"))
  .map(([topicId, topicQuestions]) => {
    const metadata = mainlandHjbHighTopicMetadata[topicId];
    const evidenceCardId = topEvidenceCardId(topicQuestions);
    const ragCard = evidenceCardId ? ragCardById.get(evidenceCardId) : undefined;
    const difficulty = dominantDifficulty(topicQuestions);
    const conceptList = metadata.conceptIds.slice(0, 4).join("、");
    const titleEn = formatHjbHighChapterTitleEn(ragCard?.chapter ?? metadata.titleZhHans);

    return {
      id: topicId,
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: mainlandHjbHighProfile,
      region: "MAINLAND",
      publisher: "MAINLAND_HJB",
      canonicalTopicId: topicId,
      grade: metadata.grade,
      title: { en: titleEn, zh: metadata.titleZhHans, zhHans: metadata.titleZhHans },
      description: {
        en: ragCard?.safeSummary ?? `Shanghai Education Press review-pending unit for ${titleEn}.`,
        zh: `沪教版${metadata.volume}《${metadata.chapter}》候选单元，需完成整包审核后方可进入学生内容。`,
        zhHans: `沪教版${metadata.volume}《${metadata.chapter}》候选单元，需完成整包审核后方可进入学生内容。`
      },
      status: "not-started",
      difficulty,
      minutes: minutesByDifficulty[difficulty],
      mastery: 0
    };
  });
