import questionPackJson from "./generated-content/mainland-bnu-junior-generated-bank-v1-1500/approved-question-pack.json";
import { mainlandBnuJuniorRagCards } from "./rag/mainlandBnuJunior";
import type {
  CurriculumProfile,
  Difficulty,
  MainlandBnuJuniorDifficultyBand,
  MainlandBnuJuniorGradeId,
  MainlandPepSemester,
  Topic
} from "@/types";

type GeneratedBnuJuniorQuestion = {
  grade: MainlandBnuJuniorGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
  difficulty: Difficulty;
  evidenceCardIds: string[];
};

type GeneratedBnuJuniorQuestionPack = {
  questions: GeneratedBnuJuniorQuestion[];
};

export type MainlandBnuJuniorTopicMetadata = {
  id: string;
  grade: MainlandBnuJuniorGradeId;
  semester: MainlandPepSemester;
  titleZhHans: string;
  volume: string;
  conceptIds: string[];
  evidenceCardIds: string[];
  questionCount: number;
};

const questionPack = questionPackJson as GeneratedBnuJuniorQuestionPack;
const mainlandBnuJuniorProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" } satisfies CurriculumProfile;
const ragCardById = new Map(mainlandBnuJuniorRagCards.map((card) => [card.id, card]));
const minutesByDifficulty: Record<Difficulty, number> = { Foundation: 40, Core: 45, Challenge: 52, Exam: 55 };
const difficultyPriority: Difficulty[] = ["Exam", "Challenge", "Core", "Foundation"];

const unitTitleEnByZhHans: Record<string, string> = {
  "丰富的图形世界": "Rich World of Figures",
  "有理数及其运算": "Rational Numbers and Operations",
  "整式及其加减": "Algebraic Expressions and Addition/Subtraction",
  "基本平面图形": "Basic Plane Figures",
  "一元一次方程": "Linear Equations in One Variable",
  "数据的收集与整理": "Data Collection and Organization",
  "整式的乘除": "Polynomial Multiplication and Division",
  "相交线与平行线": "Intersecting and Parallel Lines",
  "三角形": "Triangles",
  "变量之间的关系": "Relationships Between Variables",
  "生活中的轴对称": "Axis Symmetry in Life",
  "概率初步": "Introductory Probability",
  "勾股定理": "Pythagorean Theorem",
  "实数": "Real Numbers",
  "位置与坐标": "Position and Coordinates",
  "一次函数": "Linear Functions",
  "二元一次方程组": "Systems of Linear Equations in Two Variables",
  "数据的分析": "Data Analysis",
  "平行线的证明": "Proofs with Parallel Lines",
  "三角形的证明及其应用": "Triangle Proof and Applications",
  "不等式与不等式组": "Inequalities and Systems of Inequalities",
  "图形的平移与旋转": "Translation and Rotation",
  "因式分解": "Factorization",
  "分式与分式方程": "Algebraic Fractions and Fractional Equations",
  "平行四边形": "Parallelograms",
  "特殊平行四边形": "Special Parallelograms",
  "一元二次方程": "Quadratic Equations in One Variable",
  "概率的进一步认识": "Further Probability",
  "图形的相似": "Similar Figures",
  "投影与视图": "Projection and Views",
  "反比例函数": "Inverse Proportional Functions",
  "直角三角形的边角关系": "Right Triangle Trigonometry",
  "二次函数": "Quadratic Functions",
  "圆": "Circles",
  "统计与概率": "Statistics and Probability"
};

function difficultyFromBand(band: MainlandBnuJuniorDifficultyBand): Difficulty {
  if (band === "foundation") return "Foundation";
  if (band === "challenge") return "Challenge";
  if (band === "exam") return "Exam";
  return "Core";
}

function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

function dominantDifficulty(questions: GeneratedBnuJuniorQuestion[], fallback?: MainlandBnuJuniorDifficultyBand) {
  const counts = new Map<Difficulty, number>();
  questions.forEach((question) => counts.set(question.difficulty, (counts.get(question.difficulty) ?? 0) + 1));
  return Array.from(counts.entries()).sort((left, right) => {
    return right[1] - left[1] || difficultyPriority.indexOf(left[0]) - difficultyPriority.indexOf(right[0]);
  })[0]?.[0] ?? (fallback ? difficultyFromBand(fallback) : "Core");
}

export function formatBnuJuniorUnitTitleEn(titleZhHans: string) {
  return unitTitleEnByZhHans[titleZhHans] ?? titleZhHans;
}

const questionsByTopicId = questionPack.questions.reduce((map, question) => {
  const bucket = map.get(question.topicId) ?? [];
  bucket.push(question);
  map.set(question.topicId, bucket);
  return map;
}, new Map<string, GeneratedBnuJuniorQuestion[]>());

export const mainlandBnuJuniorTopicMetadata: Record<string, MainlandBnuJuniorTopicMetadata> = Object.fromEntries(
  Array.from(questionsByTopicId.entries()).map(([topicId, topicQuestions]) => {
    const firstQuestion = topicQuestions[0];
    return [topicId, {
      id: topicId,
      grade: firstQuestion.grade,
      semester: firstQuestion.semester,
      titleZhHans: firstQuestion.unitTitle,
      volume: firstQuestion.volume,
      conceptIds: uniqueValues(topicQuestions.flatMap((question) => question.conceptIds)),
      evidenceCardIds: uniqueValues(topicQuestions.flatMap((question) => question.evidenceCardIds)),
      questionCount: topicQuestions.length
    }];
  })
);

export const mainlandBnuJuniorTopics: Topic[] = Array.from(questionsByTopicId.entries()).map(([topicId, topicQuestions]) => {
  const metadata = mainlandBnuJuniorTopicMetadata[topicId];
  const ragCard = ragCardById.get(topicId);
  const difficulty = dominantDifficulty(topicQuestions, ragCard?.difficultyBand);
  const conceptList = metadata.conceptIds.slice(0, 4).join("、");
  const titleEn = formatBnuJuniorUnitTitleEn(metadata.titleZhHans);

  return {
    id: topicId,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandBnuJuniorProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_BNU",
    canonicalTopicId: topicId,
    grade: metadata.grade,
    title: { en: `BNU Junior: ${titleEn}`, zh: metadata.titleZhHans, zhHans: metadata.titleZhHans },
    description: {
      en: ragCard?.safeSummary ?? `Beijing Normal University Press junior-secondary unit for ${titleEn}.`,
      zh: `北师大版${metadata.volume}《${metadata.titleZhHans}》初中单元，围绕${conceptList}开展原创概念讲解、练习与错因诊断。`,
      zhHans: `北师大版${metadata.volume}《${metadata.titleZhHans}》初中单元，围绕${conceptList}开展原创概念讲解、练习与错因诊断。`
    },
    status: "not-started",
    difficulty,
    minutes: minutesByDifficulty[difficulty],
    mastery: 0
  };
});
