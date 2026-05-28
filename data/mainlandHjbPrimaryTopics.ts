import questionPackJson from "../coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json";
import { mainlandHjbPrimaryRagCards } from "./rag/mainlandHjbPrimary";
import { translateHjbTextToEnglish } from "./hjbQuestionLocalization";
import type { CurriculumProfile, Difficulty, MainlandHjbPrimaryGradeId, MainlandPepSemester, Topic } from "@/types";

type GeneratedHjbPrimaryQuestion = {
  grade: MainlandHjbPrimaryGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
  difficulty: Difficulty;
  evidenceCardIds: string[];
};

type GeneratedHjbPrimaryQuestionPack = {
  questions: GeneratedHjbPrimaryQuestion[];
};

export type MainlandHjbPrimaryTopicMetadata = {
  id: string;
  grade: MainlandHjbPrimaryGradeId;
  semester: MainlandPepSemester;
  titleZhHans: string;
  volume: string;
  conceptIds: string[];
  evidenceCardIds: string[];
  questionCount: number;
};

const questionPack = questionPackJson as GeneratedHjbPrimaryQuestionPack;
const mainlandHjbPrimaryProfile = { region: "MAINLAND", publisher: "MAINLAND_HJB" } satisfies CurriculumProfile;
const minutesByDifficulty: Record<Difficulty, number> = { Foundation: 22, Core: 28, Challenge: 34, Exam: 36 };
const difficultyPriority: Difficulty[] = ["Exam", "Challenge", "Core", "Foundation"];
const ragCardById = new Map(mainlandHjbPrimaryRagCards.map((card) => [card.id, card]));
const unitTitleEnByZhHans: Record<string, string> = {
  "我是小学生与数学学习习惯": "Becoming a Primary Student and Math Learning Habits",
  "认识立体图形": "Understanding Solid Shapes",
  "10以内数的认识": "Understanding Numbers within 10",
  "10以内数的加减法": "Addition and Subtraction within 10",
  "20以内的数与不进位不退位加减": "Numbers within 20 and Non-Regrouping Addition and Subtraction",
  "一年级上册整理与复习": "Grade 1 Volume 1 Review and Consolidation",
  "20以内数的加减法（二）": "Addition and Subtraction within 20 (II)",
  "100以内的数": "Numbers within 100",
  "100以内数的加减法（一）": "Addition and Subtraction within 100 (I)",
  "时间的初步认识": "Introductory Time",
  "长度的比较与测量": "Comparing and Measuring Length",
  "身体上的尺子与数学广场": "Body-Based Measures and Math Square",
  "一年级下册整理与复习": "Grade 1 Volume 2 Review and Consolidation",
  "100以内数的加减法（二）": "Addition and Subtraction within 100 (II)",
  "人民币与购物应用": "Renminbi and Shopping Applications",
  "校园方位与位置表达": "School Directions and Position Language",
  "表内乘法": "Multiplication Facts",
  "分类与整理": "Sorting and Organizing",
  "二年级上册数学广场与整理复习": "Grade 2 Volume 1 Math Square and Review",
  "表内除法": "Division Facts",
  "时间在哪里": "Finding Time",
  "万以内的数": "Numbers within 10,000",
  "两位数与三位数的加减法": "Addition and Subtraction of Two- and Three-Digit Numbers",
  "二年级下册数学广场与整理复习": "Grade 2 Volume 2 Math Square and Review",
  "三年级上册复习与数的运算": "Grade 3 Volume 1 Review and Number Operations",
  "乘与除": "Multiplication and Division",
  "时间与日程推理": "Time and Schedule Reasoning",
  "用一位数乘": "Multiplication by a One-Digit Number",
  "长方形与正方形": "Rectangles and Squares",
  "分数的初步认识": "Introductory Fractions",
  "三年级上册数学广场与整理复习": "Grade 3 Volume 1 Math Square and Review",
  "三年级下册复习与乘除运算": "Grade 3 Volume 2 Review and Multiplication-Division",
  "两位数乘除与问题解决": "Two-Digit Multiplication, Division, and Problem Solving",
  "小数的初步认识": "Introductory Decimals",
  "面积与周长": "Area and Perimeter",
  "数据整理与统计表达": "Data Organization and Statistical Representation",
  "三年级下册数学广场与整理复习": "Grade 3 Volume 2 Math Square and Review",
  "复习与提高": "Review and Extension",
  "数与量": "Numbers and Measurement",
  "分数的初步认识（二）": "Introductory Fractions (II)",
  "整数的四则运算": "Four Operations with Whole Numbers",
  "几何小实践": "Geometry Practice",
  "四年级上册整理与提高": "Grade 4 Volume 1 Review and Extension",
  "小数的认识与加减法": "Understanding Decimals, Addition, and Subtraction",
  "统计": "Statistics",
  "四年级下册整理与提高": "Grade 4 Volume 2 Review and Extension",
  "小数乘除法与估算": "Decimal Multiplication, Division, and Estimation",
  "用字母表示数与简易方程": "Using Letters for Numbers and Simple Equations",
  "平面图形面积": "Area of Plane Figures",
  "数据整理与平均数": "Data Organization and Averages",
  "因数、倍数与数的结构": "Factors, Multiples, and Number Structure",
  "分数意义、性质与加减": "Fraction Meaning, Properties, Addition, and Subtraction",
  "长方体、正方体与体积": "Cuboids, Cubes, and Volume",
  "统计表达与综合应用": "Statistical Representation and Integrated Applications",
  "数的整除": "Divisibility of Numbers",
  "分数": "Fractions",
  "比和比例": "Ratio and Proportion",
  "圆和扇形": "Circles and Sectors",
  "比与比例": "Ratio and Proportion",
  "圆与扇形": "Circles and Sectors",
  "可能性与统计图表": "Probability and Statistical Graphs",
  "圆柱与圆锥": "Cylinders and Cones",
  "二元一次方程组": "Systems of Linear Equations in Two Unknowns",
  "有理数": "Rational Numbers",
  "简单的代数式": "Simple Algebraic Expressions",
  "一元一次方程": "Linear Equations in One Unknown",
  "线段与角": "Line Segments and Angles",
  "长方体": "Cuboids"
};
const volumeTitleEnByZhHans: Record<string, string> = {
  "一年级上册": "Grade 1 Volume 1",
  "一年级下册": "Grade 1 Volume 2",
  "二年级上册": "Grade 2 Volume 1",
  "二年级下册": "Grade 2 Volume 2",
  "三年级上册（老课本暂用）": "Grade 3 Volume 1 (legacy temporary mapping)",
  "三年级下册": "Grade 3 Volume 2",
  "四年级上册": "Grade 4 Volume 1",
  "四年级下册": "Grade 4 Volume 2",
  "五年级上册": "Grade 5 Volume 1",
  "五年级下册": "Grade 5 Volume 2",
  "六年级下册": "Grade 6 Volume 2"
};

export function formatHjbPrimaryUnitTitleEn(titleZhHans: string) {
  return unitTitleEnByZhHans[titleZhHans] ?? translateHjbTextToEnglish(titleZhHans);
}

export function formatHjbPrimaryVolumeTitleEn(volumeZhHans: string) {
  return volumeTitleEnByZhHans[volumeZhHans] ?? translateHjbTextToEnglish(volumeZhHans);
}

function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

function dominantDifficulty(questions: GeneratedHjbPrimaryQuestion[]) {
  const counts = new Map<Difficulty, number>();
  questions.forEach((question) => counts.set(question.difficulty, (counts.get(question.difficulty) ?? 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || difficultyPriority.indexOf(a[0]) - difficultyPriority.indexOf(b[0]))[0]?.[0] ?? "Core";
}

function topEvidenceCardId(questions: GeneratedHjbPrimaryQuestion[]) {
  const counts = new Map<string, number>();
  questions.forEach((question) => question.evidenceCardIds.forEach((cardId) => counts.set(cardId, (counts.get(cardId) ?? 0) + 1)));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

const questionsByTopicId = questionPack.questions.reduce((map, question) => {
  const bucket = map.get(question.topicId) ?? [];
  bucket.push(question);
  map.set(question.topicId, bucket);
  return map;
}, new Map<string, GeneratedHjbPrimaryQuestion[]>());

export const mainlandHjbPrimaryTopicMetadata: Record<string, MainlandHjbPrimaryTopicMetadata> = Object.fromEntries(
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

export const mainlandHjbPrimaryTopics: Topic[] = Array.from(questionsByTopicId.entries()).map(([topicId, topicQuestions]) => {
  const metadata = mainlandHjbPrimaryTopicMetadata[topicId];
  const evidenceCardId = topEvidenceCardId(topicQuestions);
  const ragCard = evidenceCardId ? ragCardById.get(evidenceCardId) : undefined;
  const difficulty = dominantDifficulty(topicQuestions);
  const conceptList = metadata.conceptIds.slice(0, 4).join("、");
  const titleEn = formatHjbPrimaryUnitTitleEn(metadata.titleZhHans);

  return {
    id: topicId,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandHjbPrimaryProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_HJB",
    canonicalTopicId: topicId,
    grade: metadata.grade,
    title: { en: `HJB Primary: ${titleEn}`, zh: metadata.titleZhHans, zhHans: metadata.titleZhHans },
    description: {
      en: ragCard?.safeSummary ?? `Shanghai Education Press primary unit for ${titleEn}.`,
      zh: `沪教版${metadata.volume}《${metadata.titleZhHans}》小学单元，围绕${conceptList}开展概念、例题与练习。`,
      zhHans: `沪教版${metadata.volume}《${metadata.titleZhHans}》小学单元，围绕${conceptList}开展概念、例题与练习。`
    },
    status: "not-started",
    difficulty,
    minutes: minutesByDifficulty[difficulty],
    mastery: 0
  };
});
