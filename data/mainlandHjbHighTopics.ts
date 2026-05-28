import v1QuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v1/question-pack.json";
import v2QuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v2/question-pack.json";
import v3RemediatedQuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v3-remediated/question-pack.json";
import v4RemediatedQuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v4-remediated/question-pack.json";
import { mainlandHjbHighRagCards } from "./rag/mainlandHjbHigh";
import type { CurriculumProfile, Difficulty, GradeId, Topic } from "@/types";

type GeneratedHjbQuestion = {
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  topicId: string;
  topicTitleZhHans: string;
  volume: string;
  chapter: string;
  conceptIds: string[];
  difficulty: Difficulty;
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

const approvedQuestionPacks = [
  v1QuestionPackJson as GeneratedHjbQuestionPack,
  v2QuestionPackJson as GeneratedHjbQuestionPack,
  v3RemediatedQuestionPackJson as GeneratedHjbQuestionPack,
  v4RemediatedQuestionPackJson as GeneratedHjbQuestionPack
];
const approvedQuestions = approvedQuestionPacks.flatMap((pack) => pack.questions);
const mainlandHjbHighProfile = { region: "MAINLAND", publisher: "MAINLAND_HJB" } satisfies CurriculumProfile;
const minutesByDifficulty: Record<Difficulty, number> = { Foundation: 38, Core: 44, Challenge: 50, Exam: 55 };
const difficultyPriority: Difficulty[] = ["Exam", "Challenge", "Core", "Foundation"];
const ragCardById = new Map(mainlandHjbHighRagCards.map((card) => [card.id, card]));
const chapterTitleEnByZhHans: Record<string, string> = {
  "集合与逻辑": "Sets and Logic",
  "等式与不等式": "Equations and Inequalities",
  "幂、指数与对数": "Powers, Exponents, and Logarithms",
  "幂函数、指数函数与对数函数": "Power, Exponential, and Logarithmic Functions",
  "函数的概念、性质及应用": "Function Concepts, Properties, and Applications",
  "三角": "Trigonometry",
  "三角函数": "Trigonometric Functions",
  "平面向量": "Plane Vectors",
  "复数": "Complex Numbers",
  "空间直线与平面": "Lines and Planes in Space",
  "简单几何体": "Basic Solid Geometry",
  "概率初步": "Introductory Probability",
  "统计": "Statistics",
  "平面直角坐标系中的直线": "Lines in the Coordinate Plane",
  "圆锥曲线": "Conic Sections",
  "空间向量及其应用": "Spatial Vectors and Applications",
  "数列": "Sequences",
  "导数及其运用": "Derivatives and Applications",
  "计数原理": "Counting Principles",
  "概率初步续": "Further Introductory Probability",
  "成对数据的统计分析": "Statistical Analysis of Paired Data"
};
const volumeTitleEnByZhHans: Record<string, string> = {
  "必修 第一册": "Compulsory Volume 1",
  "必修 第二册": "Compulsory Volume 2",
  "必修 第三册": "Compulsory Volume 3",
  "选择性必修 第一册": "Selective Compulsory Volume 1",
  "选择性必修 第二册": "Selective Compulsory Volume 2"
};

function containsChineseText(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function formatHjbHighChapterTitleEn(chapter: string) {
  return chapterTitleEnByZhHans[chapter] ?? (containsChineseText(chapter) ? "Senior Mathematics Unit" : chapter);
}

export function formatHjbHighVolumeTitleEn(volume: string) {
  return volumeTitleEnByZhHans[volume] ?? (containsChineseText(volume) ? "HJB Senior Mathematics Volume" : volume);
}

export function translateHjbHighDisplayTextEn(value: string) {
  return [...Object.entries(volumeTitleEnByZhHans), ...Object.entries(chapterTitleEnByZhHans)].reduce(
    (text, [source, target]) => text.split(source).join(target),
    value
  );
}

function dominantDifficulty(questions: GeneratedHjbQuestion[]) {
  const counts = new Map<Difficulty, number>();
  questions.forEach((question) => counts.set(question.difficulty, (counts.get(question.difficulty) ?? 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || difficultyPriority.indexOf(a[0]) - difficultyPriority.indexOf(b[0]))[0]?.[0] ?? "Core";
}

function topEvidenceCardId(questions: GeneratedHjbQuestion[]) {
  const counts = new Map<string, number>();
  questions.forEach((question) => question.evidenceCardIds.forEach((cardId) => counts.set(cardId, (counts.get(cardId) ?? 0) + 1)));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

const questionsByTopicId = approvedQuestions.reduce((map, question) => {
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
        en: ragCard?.safeSummary ?? `Shanghai Education Press approved unit for ${titleEn}.`,
        zh: `沪教版${metadata.volume}《${metadata.chapter}》已批准题库单元，围绕${conceptList}建立概念、例题与课堂检查。`,
        zhHans: `沪教版${metadata.volume}《${metadata.chapter}》已批准题库单元，围绕${conceptList}建立概念、例题与课堂检查。`
      },
      status: "not-started",
      difficulty,
      minutes: minutesByDifficulty[difficulty],
      mastery: 0
    };
  });
