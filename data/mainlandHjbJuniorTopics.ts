import { mainlandHjbJuniorRagCards } from "./rag/mainlandHjbJunior";
import type {
  CurriculumProfile,
  Difficulty,
  MainlandHjbJuniorDifficultyBand,
  MainlandHjbJuniorGradeId,
  MainlandPepSemester,
  Topic
} from "@/types";

export type MainlandHjbJuniorTopicMetadata = {
  id: string;
  grade: MainlandHjbJuniorGradeId;
  semester: Extract<MainlandPepSemester, "upper" | "lower">;
  titleZhHans: string;
  volume: string;
  conceptIds: string[];
  evidenceCardIds: string[];
};

const mainlandHjbJuniorProfile = { region: "MAINLAND", publisher: "MAINLAND_HJB" } satisfies CurriculumProfile;
const unitTitleEnByZhHans: Record<string, string> = {
  "整式的加减": "Polynomial Addition and Subtraction",
  "整式的乘除": "Polynomial Multiplication and Division",
  "因式分解": "Factorization",
  "分式": "Algebraic Fractions",
  "图形的运动": "Geometric Transformations",
  "一元一次不等式": "Linear Inequalities in One Variable",
  "相交线与平行线": "Intersecting and Parallel Lines",
  "三角形": "Triangles",
  "等腰三角形": "Isosceles Triangles",
  "实数": "Real Numbers",
  "二次根式": "Square Root Expressions",
  "一元二次方程": "Quadratic Equations in One Variable",
  "直角三角形": "Right Triangles",
  "四边形": "Quadrilaterals",
  "平面直角坐标系": "Coordinate Plane",
  "一次函数": "Linear Functions",
  "反比例函数": "Inverse Proportional Functions",
  "相似三角形": "Similar Triangles",
  "锐角的三角比": "Trigonometric Ratios of Acute Angles",
  "二次函数": "Quadratic Functions",
  "圆与正多边形": "Circles and Regular Polygons",
  "统计初步": "Introductory Statistics"
};

export function formatHjbJuniorUnitTitleEn(titleZhHans: string) {
  return unitTitleEnByZhHans[titleZhHans] ?? "Junior Mathematics Unit";
}

function difficultyFromBand(band: MainlandHjbJuniorDifficultyBand): Difficulty {
  if (band === "foundation") return "Low";
  if (band === "challenge" || band === "exam") return "High";
  return "Medium";
}

function minutesFromBand(band: MainlandHjbJuniorDifficultyBand) {
  if (band === "foundation") return 40;
  if (band === "challenge") return 52;
  if (band === "exam") return 55;
  return 45;
}

export const mainlandHjbJuniorTopicMetadata: Record<string, MainlandHjbJuniorTopicMetadata> = Object.fromEntries(
  mainlandHjbJuniorRagCards.map((card) => [
    card.id,
    {
      id: card.id,
      grade: card.grade,
      semester: card.semester,
      titleZhHans: card.unitTitle,
      volume: card.volume,
      conceptIds: card.conceptIds,
      evidenceCardIds: [card.id]
    }
  ])
);

export const mainlandHjbJuniorTopics: Topic[] = mainlandHjbJuniorRagCards.map((card) => ({
  id: card.id,
  curriculumTrack: "MAINLAND_PEP_HIGH",
  curriculumProfile: mainlandHjbJuniorProfile,
  region: "MAINLAND",
  publisher: "MAINLAND_HJB",
  canonicalTopicId: card.id,
  grade: card.grade,
  title: {
    en: `HJB Junior: ${formatHjbJuniorUnitTitleEn(card.unitTitle)}`,
    zh: card.unitTitle,
    zhHans: card.unitTitle
  },
  description: {
    en: card.safeSummary,
    zh: `沪教版${card.volume}《${card.unitTitle}》安全 RAG 单元，围绕${card.skillTags.slice(0, 4).join("、")}开展原创概念讲解、例题与错因诊断。`,
    zhHans: `沪教版${card.volume}《${card.unitTitle}》安全 RAG 单元，围绕${card.skillTags.slice(0, 4).join("、")}开展原创概念讲解、例题与错因诊断。`
  },
  status: "not-started",
  difficulty: difficultyFromBand(card.difficultyBand),
  minutes: minutesFromBand(card.difficultyBand),
  mastery: 0
}));
