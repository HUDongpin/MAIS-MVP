import {
  type FloridaMiddleSchoolGradeId,
  type GeneratedFloridaMiddleSchoolChapter,
  type GeneratedFloridaMiddleSchoolPracticeSet,
  type GeneratedFloridaMiddleSchoolProblem,
  usFloridaMiddleSchoolChapters,
  usFloridaMiddleSchoolTopicById
} from "./usFloridaMiddleSchoolTopics";
import type { CurriculumProfile, Difficulty, Question, QuestionType } from "@/types";

type FloridaPracticeQuestionKind = "guided" | "independent" | "fast";
type GeneratedDifficultyBand = GeneratedFloridaMiddleSchoolProblem["difficulty"];

export type FloridaMiddleSchoolQuestionGenerationMetadata = {
  batch: "us-fl-ms-v1";
  grade: FloridaMiddleSchoolGradeId;
  topicId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  kind: FloridaPracticeQuestionKind;
  standardIds: string[];
  safeCardIds: string[];
  sourceIds: string[];
  difficulty: Difficulty;
  independentAnswer: string;
  independentSolution: string;
  mathFactExpression: string;
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  manualQaStatus: "pending-s18-final-curriculum-review";
};

const floridaProfile = { region: "US", publisher: "US_FL_MATH" } satisfies CurriculumProfile;

const difficultyByBand: Record<GeneratedDifficultyBand, Difficulty> = {
  foundation: "Low",
  core: "Medium",
  assessment: "High",
  challenge: "High"
};

function localized(en: string) {
  return { en, zh: en, zhHans: en };
}

function uniqueNonEmpty(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function kindForPracticeSet(practiceSet: GeneratedFloridaMiddleSchoolPracticeSet): FloridaPracticeQuestionKind | null {
  if (practiceSet.type === "guided") return "guided";
  if (practiceSet.type === "independent") return "independent";
  if (practiceSet.type === "fast-style-original") return "fast";
  return null;
}

function typeForKind(kind: FloridaPracticeQuestionKind): QuestionType {
  return kind === "fast" ? "short-answer" : "fill-in";
}

function questionId(chapter: GeneratedFloridaMiddleSchoolChapter, kind: FloridaPracticeQuestionKind, indexInKind: number) {
  return `us-fl-ms-v1-${chapter.grade.toLowerCase()}-ch${String(chapter.chapterNumber).padStart(2, "0")}-${kind}-${String(indexInKind + 1).padStart(2, "0")}`;
}

function acceptedAnswersFor(problem: GeneratedFloridaMiddleSchoolProblem) {
  return uniqueNonEmpty([problem.answer, problem.displayAnswer, ...problem.acceptedAnswers]);
}

function toQuestion({
  chapter,
  problem,
  kind,
  indexInKind
}: {
  chapter: GeneratedFloridaMiddleSchoolChapter;
  problem: GeneratedFloridaMiddleSchoolProblem;
  kind: FloridaPracticeQuestionKind;
  indexInKind: number;
}): Question {
  const topic = usFloridaMiddleSchoolTopicById.get(chapter.topicId);
  if (!topic) throw new Error(`Missing Florida middle-school topic for ${chapter.topicId}`);

  return {
    id: questionId(chapter, kind, indexInKind),
    curriculumTrack: "US_FL_MATH",
    curriculumProfile: floridaProfile,
    region: "US",
    publisher: "US_FL_MATH",
    canonicalTopicId: chapter.canonicalTopicId,
    grade: chapter.grade,
    topicId: chapter.topicId,
    topic: topic.title,
    difficulty: difficultyByBand[problem.difficulty],
    type: typeForKind(kind),
    prompt: localized(`${topic.title.en}: ${problem.prompt}`),
    answer: problem.answer,
    acceptedAnswers: acceptedAnswersFor(problem),
    explanation: localized(problem.explanation)
  };
}

function toMetadata({
  chapter,
  problem,
  kind,
  indexInKind
}: {
  chapter: GeneratedFloridaMiddleSchoolChapter;
  problem: GeneratedFloridaMiddleSchoolProblem;
  kind: FloridaPracticeQuestionKind;
  indexInKind: number;
}): [string, FloridaMiddleSchoolQuestionGenerationMetadata] {
  const id = questionId(chapter, kind, indexInKind);
  return [
    id,
    {
      batch: "us-fl-ms-v1",
      grade: chapter.grade,
      topicId: chapter.topicId,
      chapterId: chapter.id,
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.chapterTitle,
      kind,
      standardIds: chapter.standardIds,
      safeCardIds: chapter.safeCardIds,
      sourceIds: chapter.sourceIds,
      difficulty: difficultyByBand[problem.difficulty],
      independentAnswer: problem.answer,
      independentSolution: problem.explanation,
      mathFactExpression: problem.mathFact.expression,
      sourceDistanceStatus: "passed-auto-source-scan",
      mathQaStatus: "pass",
      manualQaStatus: "pending-s18-final-curriculum-review"
    }
  ];
}

const practiceQuestionSeeds = usFloridaMiddleSchoolChapters.flatMap((chapter) =>
  chapter.practiceSets.flatMap((practiceSet) => {
    const kind = kindForPracticeSet(practiceSet);
    if (!kind) return [];
    return practiceSet.problems.map((problem, indexInKind) => ({ chapter, problem, kind, indexInKind }));
  })
);

export const expectedUnitedStatesFloridaMiddleSchoolQuestionCount = 75;
export const usFloridaMiddleSchoolQuestions: Question[] = practiceQuestionSeeds.map(toQuestion);

export const usFloridaMiddleSchoolQuestionGenerationMetadata: Record<string, FloridaMiddleSchoolQuestionGenerationMetadata> =
  Object.fromEntries(practiceQuestionSeeds.map(toMetadata));

export function independentUnitedStatesFloridaMiddleSchoolAnswer(question: Question) {
  return usFloridaMiddleSchoolQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}
