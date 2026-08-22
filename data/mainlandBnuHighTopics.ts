import approvedQuestionPackJson from "./generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json";
import { mainlandBnuHighRagCards } from "./rag/mainlandBnuHigh";
import { toTraditionalHjbText } from "./hjbQuestionLocalization";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type { CurriculumProfile, Difficulty, DifficultyRecord, GradeId, MainlandPepSemester, Topic } from "@/types";

type GeneratedBnuHighQuestion = {
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  semester: MainlandPepSemester;
  topicId: string;
  topicTitleZhHans: string;
  volume: string;
  chapter: string;
  conceptIds: string[];
  difficulty: DifficultyRecord;
  evidenceCardIds: string[];
};

type GeneratedBnuHighQuestionPack = {
  questions: GeneratedBnuHighQuestion[];
};

export type MainlandBnuHighTopicMetadata = {
  id: string;
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  semester: MainlandPepSemester;
  titleZhHans: string;
  volume: string;
  chapter: string;
  conceptIds: string[];
  evidenceCardIds: string[];
  questionCount: number;
};

const approvedQuestionPack = approvedQuestionPackJson as GeneratedBnuHighQuestionPack;
const approvedQuestions = approvedQuestionPack.questions;
const mainlandBnuHighProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" } satisfies CurriculumProfile;
const minutesByDifficulty: Record<Difficulty, number> = {
  Low: 38,
  Medium: 44,
  High: 56
};
const difficultyPriority: Difficulty[] = ["High", "Medium", "Low"];
const ragCardById = new Map(mainlandBnuHighRagCards.map((card) => [card.id, card]));

const chapterTitleEnByZhHans: Record<string, string> = {
  "预备知识": "Preparatory Knowledge",
  "函数": "Functions",
  "指数运算与指数函数": "Exponential Operations and Functions",
  "对数运算与对数函数": "Logarithmic Operations and Functions",
  "函数应用": "Function Applications",
  "统计": "Statistics",
  "概率": "Probability",
  "数学建模活动（一）": "Mathematical Modeling Activity I",
  "三角函数": "Trigonometric Functions",
  "平面向量及其应用": "Plane Vectors and Applications",
  "数学建模活动（二）": "Mathematical Modeling Activity II",
  "三角恒等变换": "Trigonometric Identity Transformations",
  "复数": "Complex Numbers",
  "立体几何初步": "Introductory Solid Geometry",
  "直线与圆": "Lines and Circles",
  "圆锥曲线": "Conic Sections",
  "空间向量与立体几何": "Space Vectors and Solid Geometry",
  "数学建模活动（三）": "Mathematical Modeling Activity III",
  "计数原理": "Counting Principles",
  "统计案例": "Statistical Case Studies",
  "数列": "Sequences",
  "导数及其应用": "Derivatives and Applications",
  "高三数列与导数综合复习": "Grade 12 Sequence and Derivative Review"
};

function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

function dominantDifficulty(questions: GeneratedBnuHighQuestion[]) {
  const counts = new Map<Difficulty, number>();
  questions.forEach((question) => {
    const difficulty = mapDifficultyToActive(question.difficulty);
    counts.set(difficulty, (counts.get(difficulty) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || difficultyPriority.indexOf(a[0]) - difficultyPriority.indexOf(b[0]))[0]?.[0] ?? "Medium";
}

function topEvidenceCardId(questions: GeneratedBnuHighQuestion[]) {
  const counts = new Map<string, number>();
  questions.forEach((question) => question.evidenceCardIds.forEach((cardId) => counts.set(cardId, (counts.get(cardId) ?? 0) + 1)));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

const questionsByTopicId = approvedQuestions.reduce((map, question) => {
  const bucket = map.get(question.topicId) ?? [];
  bucket.push(question);
  map.set(question.topicId, bucket);
  return map;
}, new Map<string, GeneratedBnuHighQuestion[]>());

export const mainlandBnuHighTopicMetadata: Record<string, MainlandBnuHighTopicMetadata> = Object.fromEntries(
  Array.from(questionsByTopicId.entries()).map(([topicId, topicQuestions]) => {
    const firstQuestion = topicQuestions[0];
    return [topicId, {
      id: topicId,
      grade: firstQuestion.grade,
      semester: firstQuestion.semester,
      titleZhHans: firstQuestion.topicTitleZhHans,
      volume: firstQuestion.volume,
      chapter: firstQuestion.chapter,
      conceptIds: uniqueValues(topicQuestions.flatMap((question) => question.conceptIds)),
      evidenceCardIds: uniqueValues(topicQuestions.flatMap((question) => question.evidenceCardIds)),
      questionCount: topicQuestions.length
    }];
  })
);

export const mainlandBnuHighTopics: Topic[] = Array.from(questionsByTopicId.entries())
  .sort((left, right) => left[1][0].grade.localeCompare(right[1][0].grade) || left[0].localeCompare(right[0], "zh-Hans"))
  .map(([topicId, topicQuestions]) => {
    const metadata = mainlandBnuHighTopicMetadata[topicId];
    const evidenceCardId = topEvidenceCardId(topicQuestions);
    const ragCard = evidenceCardId ? ragCardById.get(evidenceCardId) : undefined;
    const difficulty = dominantDifficulty(topicQuestions);
    const titleEn = chapterTitleEnByZhHans[metadata.titleZhHans] ?? "BNUP Senior Mathematics Unit";
    const descriptionZhHans = `本单元围绕《${metadata.chapter}》梳理核心概念、表示方法和推理步骤，并通过例题与练习检验理解。`;

    return {
      id: topicId,
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: mainlandBnuHighProfile,
      region: "MAINLAND",
      publisher: "MAINLAND_BNU",
      canonicalTopicId: topicId,
      grade: metadata.grade,
      title: { en: titleEn, zh: toTraditionalHjbText(metadata.titleZhHans), zhHans: metadata.titleZhHans },
      description: {
        en: ragCard?.safeSummary ?? `Beijing Normal University Press senior-secondary unit for ${titleEn}.`,
        zh: toTraditionalHjbText(descriptionZhHans),
        zhHans: descriptionZhHans
      },
      status: "not-started",
      difficulty,
      minutes: minutesByDifficulty[difficulty],
      mastery: 0
    };
  });
