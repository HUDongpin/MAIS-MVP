import type { Grade } from "@/types";

export const primaryGradeIds = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;
export const secondaryGradeIds = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;
export const gradeIds = [...primaryGradeIds, ...secondaryGradeIds] as const;

export const grades: Grade[] = [
  {
    id: "P1",
    name: { en: "Primary 1", zh: "小一", zhHans: "小学一年级" },
    ageRange: "6–7",
    focus: { en: "Counting, number bonds, basic addition and subtraction", zh: "數數、數的組合、基本加減" },
    color: "from-teal-300 to-cyan-500"
  },
  {
    id: "P2",
    name: { en: "Primary 2", zh: "小二", zhHans: "小学二年级" },
    ageRange: "7–8",
    focus: { en: "Place value, multiplication foundations, money, time", zh: "位值、乘法基礎、金錢、時間" },
    color: "from-lime-300 to-emerald-500"
  },
  {
    id: "P3",
    name: { en: "Primary 3", zh: "小三", zhHans: "小学三年级" },
    ageRange: "8–9",
    focus: { en: "Multiplication, division, fractions, measurement", zh: "乘法、除法、分數、度量" },
    color: "from-yellow-300 to-amber-500"
  },
  {
    id: "P4",
    name: { en: "Primary 4", zh: "小四", zhHans: "小学四年级" },
    ageRange: "9–10",
    focus: { en: "Large numbers, decimals, angles, perimeter and area", zh: "大數、小數、角、周界與面積" },
    color: "from-orange-300 to-rose-500"
  },
  {
    id: "P5",
    name: { en: "Primary 5", zh: "小五", zhHans: "小学五年级" },
    ageRange: "10–11",
    focus: { en: "Fractions, volume, rates, charts and averages", zh: "分數、體積、率、圖表與平均數" },
    color: "from-fuchsia-300 to-purple-500"
  },
  {
    id: "P6",
    name: { en: "Primary 6", zh: "小六", zhHans: "小学六年级" },
    ageRange: "11–12",
    focus: { en: "Percentages, ratio, speed, pre-secondary problem solving", zh: "百分數、比例、速率、升中解難" },
    color: "from-violet-300 to-indigo-500"
  },
  {
    id: "S1",
    name: { en: "Secondary 1", zh: "中一", zhHans: "初一" },
    ageRange: "12–13",
    focus: { en: "Number sense, algebra foundations, angles, ratios", zh: "數感、代數基礎、角、比與率" },
    color: "from-cyan-400 to-blue-500"
  },
  {
    id: "S2",
    name: { en: "Secondary 2", zh: "中二", zhHans: "初二" },
    ageRange: "13–14",
    focus: { en: "Linear equations, coordinates, transformations", zh: "一次方程、坐標、變換" },
    color: "from-sky-400 to-indigo-500"
  },
  {
    id: "S3",
    name: { en: "Secondary 3", zh: "中三", zhHans: "初三" },
    ageRange: "14–15",
    focus: { en: "Polynomials, quadratics, trigonometry, circles", zh: "多項式、二次式、三角比、圓" },
    color: "from-violet-400 to-fuchsia-500"
  },
  {
    id: "S4",
    name: { en: "Secondary 4", zh: "中四", zhHans: "高一" },
    ageRange: "15–16",
    focus: { en: "Functions, coordinate geometry, data handling", zh: "函數、坐標幾何、數據處理" },
    color: "from-emerald-400 to-cyan-500"
  },
  {
    id: "S5",
    name: { en: "Secondary 5", zh: "中五", zhHans: "高二" },
    ageRange: "16–17",
    focus: { en: "Advanced functions, trigonometry, probability", zh: "進階函數、三角學、概率" },
    color: "from-amber-300 to-orange-500"
  },
  {
    id: "S6",
    name: { en: "Secondary 6", zh: "中六", zhHans: "高三" },
    ageRange: "17–18",
    focus: { en: "Calculus, statistics, mixed exam problem solving", zh: "微積分、統計、綜合應試解難" },
    color: "from-rose-400 to-violet-500"
  }
];

export const primaryGrades = grades.filter((grade) => primaryGradeIds.includes(grade.id as (typeof primaryGradeIds)[number]));
export const secondaryGrades = grades.filter((grade) => secondaryGradeIds.includes(grade.id as (typeof secondaryGradeIds)[number]));
export const validGradeSet = new Set(gradeIds);

export function isValidGradeId(value: unknown): value is Grade["id"] {
  return typeof value === "string" && validGradeSet.has(value as (typeof gradeIds)[number]);
}
