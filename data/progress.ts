import type { ProgressMetric, WeeklyActivity } from "@/types";

export const progressMetrics: ProgressMetric[] = [
  {
    label: { en: "Lessons completed", zh: "已完成課節" },
    value: "42",
    detail: { en: "Across 11 topic clusters", zh: "涵蓋 11 個課題群" },
    trend: "+6 this week"
  },
  {
    label: { en: "Accuracy rate", zh: "答題準確率" },
    value: "78%",
    detail: { en: "Last 60 practice items", zh: "最近 60 題練習" },
    trend: "+4%"
  },
  {
    label: { en: "Topics mastered", zh: "已掌握課題" },
    value: "18",
    detail: { en: "Mastery above 75%", zh: "掌握度高於 75%" },
    trend: "+3"
  },
  {
    label: { en: "Visualization sessions", zh: "視覺化使用次數" },
    value: "27",
    detail: { en: "Graphs, geometry, probability", zh: "圖像、幾何、概率" },
    trend: "+9"
  }
];

export const weeklyActivity: WeeklyActivity[] = [
  { day: "Mon", minutes: 28 },
  { day: "Tue", minutes: 42 },
  { day: "Wed", minutes: 34 },
  { day: "Thu", minutes: 48 },
  { day: "Fri", minutes: 25 },
  { day: "Sat", minutes: 55 },
  { day: "Sun", minutes: 31 }
];

export const masteryAreas = [
  { label: { en: "Algebra fluency", zh: "代數熟練度" }, value: 72 },
  { label: { en: "Graph interpretation", zh: "圖像詮釋" }, value: 64 },
  { label: { en: "Geometry reasoning", zh: "幾何推理" }, value: 58 },
  { label: { en: "Probability intuition", zh: "概率直覺" }, value: 81 },
  { label: { en: "Exam-style communication", zh: "考試表達" }, value: 49 }
];
