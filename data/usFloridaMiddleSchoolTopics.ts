import textbookPackJson from "./generated-content/us-fl-math-middle-school-textbooks-v1/textbook-pack.json";
import type { CurriculumProfile, Difficulty, GradeId, LocalizedText, Topic } from "@/types";

export type FloridaMiddleSchoolGradeId = Extract<GradeId, "P6" | "S1" | "S2">;
type GeneratedDifficultyBand = "foundation" | "core" | "assessment" | "challenge";

export type GeneratedFloridaMiddleSchoolProblem = {
  id: string;
  role: "worked" | "guided" | "independent" | "fast";
  difficulty: GeneratedDifficultyBand;
  title: string;
  prompt: string;
  answer: string;
  displayAnswer: string;
  acceptedAnswers: string[];
  explanation: string;
  mathFact: {
    expression: string;
    expected: number;
    actual: number;
  };
};

export type GeneratedFloridaMiddleSchoolPracticeSet = {
  id: string;
  type: "worked-example" | "guided" | "independent" | "fast-style-original";
  problems: GeneratedFloridaMiddleSchoolProblem[];
};

export type GeneratedFloridaMiddleSchoolChapter = {
  id: string;
  topicId: string;
  canonicalTopicId: string;
  grade: FloridaMiddleSchoolGradeId;
  usGradeLabel: string;
  courseLabel: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterSummary: string;
  standardIds: string[];
  safeCardIds: string[];
  sourceIds: string[];
  conceptIds: string[];
  domainTags: string[];
  clusterTags: string[];
  competencyTags: string[];
  studentText: {
    chapterTitle: string;
    learningGoals: string[];
    conceptExplanation: string;
    workedExamples: Array<{
      title: string;
      prompt: string;
      solution: string;
      check: string;
    }>;
    guidedPractice: Array<{
      prompt: string;
      answer: string;
      explanation: string;
    }>;
    independentPractice: Array<{
      prompt: string;
      answer: string;
      explanation: string;
    }>;
    misconceptionClinic: string[];
    fastStyleTasks: Array<{
      prompt: string;
      answer: string;
      explanation: string;
    }>;
    glossary: string[];
    exitTicket: string;
  };
  teacherNotes: string[];
  practiceSets: GeneratedFloridaMiddleSchoolPracticeSet[];
  qa: {
    sourceSafetyStatus: string;
    mathValidationStatus: string;
    languageStatus: string;
    reviewStatus: string;
    mathFacts: GeneratedFloridaMiddleSchoolProblem["mathFact"][];
  };
};

type GeneratedFloridaMiddleSchoolBook = {
  id: string;
  grade: FloridaMiddleSchoolGradeId;
  usGradeLabel: string;
  level: "middle-school";
  courseLabel: LocalizedText;
  sequencingNote: LocalizedText;
  chapters: GeneratedFloridaMiddleSchoolChapter[];
};

type GeneratedFloridaMiddleSchoolPack = {
  packageId: "us-fl-math-middle-school-textbooks-v1";
  curriculumTrack: "US_FL_MATH";
  state: "FL";
  languageMode: "english-primary";
  books: GeneratedFloridaMiddleSchoolBook[];
};

const textbookPack = textbookPackJson as GeneratedFloridaMiddleSchoolPack;
const floridaProfile = { region: "US", publisher: "US_FL_MATH" } satisfies CurriculumProfile;

const difficultyByBand: Record<GeneratedDifficultyBand, Difficulty> = {
  foundation: "Low",
  core: "Medium",
  assessment: "High",
  challenge: "High"
};

function localized(en: string, zh = en, zhHans = zh): LocalizedText {
  return { en, zh, zhHans };
}

function difficultyForChapter(chapter: GeneratedFloridaMiddleSchoolChapter): Difficulty {
  const firstProblem = chapter.practiceSets.flatMap((set) => set.problems)[0];
  return difficultyByBand[firstProblem?.difficulty ?? "core"];
}

function topicStatus(indexInBook: number): Topic["status"] {
  return indexInBook === 0 ? "in-progress" : "not-started";
}

function topicMastery(indexInBook: number) {
  return indexInBook === 0 ? 35 : 0;
}

function topicDescription(chapter: GeneratedFloridaMiddleSchoolChapter) {
  const standards = chapter.standardIds.slice(0, 3).join(", ");
  const domains = chapter.domainTags.length ? chapter.domainTags.join(", ") : "Florida middle-school mathematics";
  return `${chapter.usGradeLabel} B.E.S.T. pathway for ${chapter.chapterTitle}, aligned to ${standards} with MAIS-authored safe-card content for ${domains}.`;
}

export const usFloridaMiddleSchoolChapters: GeneratedFloridaMiddleSchoolChapter[] =
  textbookPack.books.flatMap((book) => book.chapters);

export const usFloridaMiddleSchoolTopics: Topic[] = textbookPack.books.flatMap((book) =>
  book.chapters.map((chapter, indexInBook): Topic => {
    const status = topicStatus(indexInBook);
    return {
      id: chapter.topicId,
      curriculumTrack: "US_FL_MATH",
      curriculumProfile: floridaProfile,
      region: "US",
      publisher: "US_FL_MATH",
      canonicalTopicId: chapter.canonicalTopicId,
      grade: chapter.grade,
      title: localized(`Florida ${chapter.usGradeLabel}: ${chapter.chapterTitle}`),
      description: localized(topicDescription(chapter)),
      status,
      difficulty: difficultyForChapter(chapter),
      minutes: 30 + indexInBook * 4,
      mastery: topicMastery(indexInBook)
    };
  })
);

export const usFloridaMiddleSchoolTopicById = new Map(usFloridaMiddleSchoolTopics.map((topic) => [topic.id, topic]));
