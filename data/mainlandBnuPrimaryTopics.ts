import v1QuestionPackJson from "./generated-content/mainland-bnu-primary-generated-bank-v1-1500/question-pack.json";
import v2QuestionPackJson from "./generated-content/mainland-bnu-primary-generated-bank-v2-1500/question-pack.json";
import { mainlandBnuPrimaryRagCards } from "./rag/mainlandBnuPrimary";
import { toTraditionalHjbText } from "./hjbQuestionLocalization";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type { CurriculumProfile, Difficulty, DifficultyRecord, MainlandBnuPrimaryGradeId, MainlandPepSemester, Topic } from "@/types";

export type BnuPrimaryBatch = "bnu-primary-v1" | "bnu-primary-v2";

type GeneratedBnuPrimaryQuestion = {
  batch: BnuPrimaryBatch;
  grade: MainlandBnuPrimaryGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
  difficulty: DifficultyRecord;
  evidenceCardIds: string[];
};

type GeneratedBnuPrimaryQuestionPack = {
  questions: GeneratedBnuPrimaryQuestion[];
};

export type MainlandBnuPrimaryTopicMetadata = {
  id: string;
  grade: MainlandBnuPrimaryGradeId;
  semester: MainlandPepSemester;
  titleZhHans: string;
  volume: string;
  conceptIds: string[];
  evidenceCardIds: string[];
  questionCount: number;
  batchCounts: Record<BnuPrimaryBatch, number>;
};

const v1QuestionPack = v1QuestionPackJson as GeneratedBnuPrimaryQuestionPack;
const v2QuestionPack = v2QuestionPackJson as GeneratedBnuPrimaryQuestionPack;
const questionPackQuestions = [...v1QuestionPack.questions, ...v2QuestionPack.questions];
const mainlandBnuPrimaryProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" } satisfies CurriculumProfile;
const minutesByDifficulty: Record<Difficulty, number> = {
  Low: 22,
  Medium: 28,
  High: 36
};
const difficultyPriority: Difficulty[] = ["High", "Medium", "Low"];
const ragCardById = new Map(mainlandBnuPrimaryRagCards.map((card) => [card.id, card]));

const unitTitleEnByZhHans: Record<string, string> = {
  "生活中的数": "Numbers in Everyday Life",
  "比较": "Comparing Quantities and Attributes",
  "加与减（一）": "Addition and Subtraction (I)",
  "分类": "Classification and Sorting",
  "位置与顺序": "Position and Order",
  "认识图形": "Recognizing Shapes",
  "加与减（二）": "Addition and Subtraction (II)",
  "认识钟表": "Reading Clocks",
  "一年级上册整理与复习": "Grade 1 Volume 1 Review",
  "观察物体": "Observing Objects",
  "有趣的图形": "Exploring Shapes",
  "加与减（三）": "Addition and Subtraction (III)",
  "数学好玩与整理复习": "Mathematical Activities and Review",
  "加与减": "Addition and Subtraction",
  "购物": "Shopping",
  "数一数与乘法": "Counting and Multiplication",
  "图形的变化": "Shape Transformations",
  "2-5的乘法口诀": "Multiplication Facts 2 to 5",
  "测量": "Measurement",
  "分一分与除法": "Sharing and Division",
  "6-9的乘法口诀": "Multiplication Facts 6 to 9",
  "除法与整理复习": "Division and Review",
  "除法": "Division",
  "方向与位置": "Direction and Position",
  "生活中的大数": "Large Numbers in Everyday Life",
  "时、分、秒": "Hours, Minutes, and Seconds",
  "调查与记录及整理复习": "Survey, Recording, and Review",
  "混合运算": "Mixed Operations",
  "乘与除": "Multiplication and Division",
  "周长": "Perimeter",
  "乘法": "Multiplication",
  "年、月、日": "Year, Month, and Day",
  "认识小数": "Introduction to Decimals",
  "数学好玩及整理复习": "Math Activities and Review",
  "图形的运动": "Geometric Motion",
  "千克、克、吨": "Kilograms, Grams, and Tonnes",
  "面积": "Area",
  "认识分数": "Introduction to Fractions",
  "数据的整理和表示": "Data Organization and Representation",
  "认识更大的数": "Larger Numbers",
  "线与角": "Lines and Angles",
  "运算律": "Operation Laws",
  "生活中的负数": "Negative Numbers in Everyday Life",
  "可能性": "Probability",
  "小数的意义和加减法": "Decimal Meaning, Addition, and Subtraction",
  "认识三角形和四边形": "Triangles and Quadrilaterals",
  "小数乘法": "Decimal Multiplication",
  "认识方程": "Introduction to Equations",
  "数据的表示和分析": "Data Representation and Analysis",
  "小数除法": "Decimal Division",
  "轴对称和平移": "Line Symmetry and Translation",
  "倍数与因数": "Multiples and Factors",
  "多边形的面积": "Area of Polygons",
  "分数的意义": "Meaning of Fractions",
  "组合图形的面积": "Area of Composite Shapes",
  "数学好玩与总复习": "Math Activities and General Review",
  "分数加减法": "Fraction Addition and Subtraction",
  "长方体（一）": "Cuboids (I)",
  "分数乘法": "Fraction Multiplication",
  "长方体（二）": "Cuboids (II)",
  "分数除法": "Fraction Division",
  "确定位置": "Locating Positions",
  "用方程解决问题": "Solving Problems with Equations",
  "圆": "Circles",
  "分数混合运算": "Mixed Fraction Operations",
  "百分数": "Percentages",
  "数据处理": "Data Handling",
  "比的认识": "Understanding Ratios",
  "百分数的应用": "Applications of Percentages",
  "圆柱与圆锥": "Cylinders and Cones",
  "比例": "Proportion",
  "正比例与反比例": "Direct and Inverse Proportion",
  "数学好玩": "Mathematical Activities",
  "整理与总复习": "Consolidation and General Review"
};

const volumeTitleEnByZhHans: Record<string, string> = {
  "一年级上册": "Grade 1 Volume 1",
  "一年级下册": "Grade 1 Volume 2",
  "二年级上册": "Grade 2 Volume 1",
  "二年级下册": "Grade 2 Volume 2",
  "三年级上册": "Grade 3 Volume 1",
  "三年级下册": "Grade 3 Volume 2",
  "四年级上册": "Grade 4 Volume 1",
  "四年级下册": "Grade 4 Volume 2",
  "五年级上册": "Grade 5 Volume 1",
  "五年级下册": "Grade 5 Volume 2",
  "六年级上册": "Grade 6 Volume 1",
  "六年级下册": "Grade 6 Volume 2"
};

export function formatBnuPrimaryUnitTitleEn(titleZhHans: string) {
  return unitTitleEnByZhHans[titleZhHans] ?? titleZhHans;
}

export function formatBnuPrimaryVolumeTitleEn(volumeZhHans: string) {
  return volumeTitleEnByZhHans[volumeZhHans] ?? volumeZhHans;
}

function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

function dominantDifficulty(questions: GeneratedBnuPrimaryQuestion[]) {
  const counts = new Map<Difficulty, number>();
  questions.forEach((question) => {
    const difficulty = mapDifficultyToActive(question.difficulty);
    counts.set(difficulty, (counts.get(difficulty) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || difficultyPriority.indexOf(a[0]) - difficultyPriority.indexOf(b[0]))[0]?.[0] ?? "Medium";
}

function topEvidenceCardId(questions: GeneratedBnuPrimaryQuestion[]) {
  const counts = new Map<string, number>();
  questions.forEach((question) => question.evidenceCardIds.forEach((cardId) => counts.set(cardId, (counts.get(cardId) ?? 0) + 1)));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

const questionsByTopicId = questionPackQuestions.reduce((map, question) => {
  const bucket = map.get(question.topicId) ?? [];
  bucket.push(question);
  map.set(question.topicId, bucket);
  return map;
}, new Map<string, GeneratedBnuPrimaryQuestion[]>());

export const mainlandBnuPrimaryTopicMetadata: Record<string, MainlandBnuPrimaryTopicMetadata> = Object.fromEntries(
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
      questionCount: topicQuestions.length,
      batchCounts: {
        "bnu-primary-v1": topicQuestions.filter((question) => question.batch === "bnu-primary-v1").length,
        "bnu-primary-v2": topicQuestions.filter((question) => question.batch === "bnu-primary-v2").length
      }
    }];
  })
);

export const mainlandBnuPrimaryTopics: Topic[] = Array.from(questionsByTopicId.entries()).map(([topicId, topicQuestions]) => {
  const metadata = mainlandBnuPrimaryTopicMetadata[topicId];
  const evidenceCardId = topEvidenceCardId(topicQuestions);
  const ragCard = evidenceCardId ? ragCardById.get(evidenceCardId) : undefined;
  const difficulty = dominantDifficulty(topicQuestions);
  const titleEn = formatBnuPrimaryUnitTitleEn(metadata.titleZhHans);
  const descriptionZhHans = `本单元围绕《${metadata.titleZhHans}》学习核心概念和方法，并通过表示、例题、推理和练习巩固理解。`;

  return {
    id: topicId,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandBnuPrimaryProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_BNU",
    canonicalTopicId: topicId,
    grade: metadata.grade,
    title: { en: `BNU Primary: ${titleEn}`, zh: toTraditionalHjbText(metadata.titleZhHans), zhHans: metadata.titleZhHans },
    description: {
      en: ragCard?.safeSummary ?? `Beijing Normal University Press primary unit for ${titleEn}.`,
      zh: toTraditionalHjbText(descriptionZhHans),
      zhHans: descriptionZhHans
    },
    status: "not-started",
    difficulty,
    minutes: minutesByDifficulty[difficulty],
    mastery: 0
  };
});
