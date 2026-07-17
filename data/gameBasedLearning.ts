import type { MathMatchQuestTileFamily } from "@/lib/gameBasedLearning";
import type { LocalizedText } from "@/types";

export type MathMatchQuestQuestionOption = {
  id: string;
  label: string;
  correct: boolean;
};

export type MathMatchQuestQuestion = {
  id: string;
  family: MathMatchQuestTileFamily;
  prompt: LocalizedText;
  options: MathMatchQuestQuestionOption[];
  explanation: LocalizedText;
};

export type MathMatchQuestLevel = {
  id: string;
  order: number;
  title: LocalizedText;
  subtitle: LocalizedText;
  focus: LocalizedText;
  movesLimit: number;
  targetScore: number;
  boardSeed: number;
  rewardPreview: {
    coins: number;
    xp: number;
  };
  families: MathMatchQuestTileFamily[];
};

export const mathMatchQuestFamilyMeta: Record<
  MathMatchQuestTileFamily,
  {
    label: LocalizedText;
    tileLabel: string;
    accent: string;
    glow: string;
  }
> = {
  addition: {
    label: { en: "Addition", zh: "加法", zhHans: "加法" },
    tileLabel: "+",
    accent: "from-amber-300 via-orange-400 to-rose-500",
    glow: "shadow-amber-300/40"
  },
  subtraction: {
    label: { en: "Subtraction", zh: "減法", zhHans: "减法" },
    tileLabel: "-",
    accent: "from-rose-300 via-pink-500 to-fuchsia-600",
    glow: "shadow-rose-300/40"
  },
  multiplication: {
    label: { en: "Multiplication", zh: "乘法", zhHans: "乘法" },
    tileLabel: "x",
    accent: "from-violet-300 via-indigo-500 to-blue-600",
    glow: "shadow-violet-300/40"
  },
  division: {
    label: { en: "Division", zh: "除法", zhHans: "除法" },
    tileLabel: "/",
    accent: "from-cyan-200 via-sky-500 to-blue-700",
    glow: "shadow-cyan-300/40"
  },
  fraction: {
    label: { en: "Fractions", zh: "分數", zhHans: "分数" },
    tileLabel: "1/2",
    accent: "from-emerald-200 via-teal-500 to-cyan-700",
    glow: "shadow-emerald-300/40"
  },
  geometry: {
    label: { en: "Geometry", zh: "幾何", zhHans: "几何" },
    tileLabel: "Geo",
    accent: "from-lime-200 via-green-500 to-emerald-700",
    glow: "shadow-lime-300/40"
  },
  pattern: {
    label: { en: "Patterns", zh: "規律", zhHans: "规律" },
    tileLabel: "n",
    accent: "from-yellow-200 via-lime-400 to-green-600",
    glow: "shadow-yellow-300/40"
  },
  algebra: {
    label: { en: "Algebra", zh: "代數", zhHans: "代数" },
    tileLabel: "x2",
    accent: "from-slate-200 via-purple-500 to-fuchsia-700",
    glow: "shadow-purple-300/40"
  }
};

export const mathMatchQuestLevels: MathMatchQuestLevel[] = [
  {
    id: "harbor-warmup",
    order: 1,
    title: { en: "Harbor Warm-up", zh: "海港熱身", zhHans: "海港热身" },
    subtitle: { en: "Build quick confidence with number facts.", zh: "用基礎數感打開節奏。", zhHans: "用基础数感打开节奏。" },
    focus: { en: "Addition, subtraction, multiplication", zh: "加法、減法、乘法", zhHans: "加法、减法、乘法" },
    movesLimit: 15,
    targetScore: 4500,
    boardSeed: 11,
    rewardPreview: { coins: 120, xp: 35 },
    families: ["addition", "subtraction", "multiplication", "division", "fraction"]
  },
  {
    id: "reef-rhythm",
    order: 2,
    title: { en: "Reef Rhythm", zh: "珊瑚節奏", zhHans: "珊瑚节奏" },
    subtitle: { en: "Keep combos alive while fractions enter the board.", zh: "分數加入棋盤，保持連擊節奏。", zhHans: "分数加入棋盘，保持连击节奏。" },
    focus: { en: "Fractions and mixed operations", zh: "分數與混合運算", zhHans: "分数与混合运算" },
    movesLimit: 18,
    targetScore: 6200,
    boardSeed: 23,
    rewardPreview: { coins: 160, xp: 45 },
    families: ["addition", "multiplication", "division", "fraction", "geometry", "pattern"]
  },
  {
    id: "summit-gala",
    order: 3,
    title: { en: "Summit Gala", zh: "高峰慶典", zhHans: "高峰庆典" },
    subtitle: { en: "A polished challenge with algebra tiles and tighter goals.", zh: "加入代數方塊與更高目標。", zhHans: "加入代数方块与更高目标。" },
    focus: { en: "Algebra, geometry, patterns", zh: "代數、幾何、規律", zhHans: "代数、几何、规律" },
    movesLimit: 20,
    targetScore: 7800,
    boardSeed: 37,
    rewardPreview: { coins: 220, xp: 60 },
    families: ["subtraction", "multiplication", "fraction", "geometry", "pattern", "algebra"]
  }
];

export const mathMatchQuestQuestions: MathMatchQuestQuestion[] = [
  {
    id: "addition-1",
    family: "addition",
    prompt: { en: "What is 18 + 27?", zh: "18 + 27 等於多少？", zhHans: "18 + 27 等于多少？" },
    options: [
      { id: "a", label: "35", correct: false },
      { id: "b", label: "45", correct: true },
      { id: "c", label: "46", correct: false }
    ],
    explanation: { en: "18 + 20 + 7 = 45.", zh: "18 + 20 + 7 = 45。", zhHans: "18 + 20 + 7 = 45。" }
  },
  {
    id: "addition-2",
    family: "addition",
    prompt: { en: "A combo gives 36 points, then 48 more. What is the total?", zh: "一次連消得到 36 分，再得 48 分，共多少？", zhHans: "一次连消得到 36 分，再得 48 分，共多少？" },
    options: [
      { id: "a", label: "74", correct: false },
      { id: "b", label: "84", correct: true },
      { id: "c", label: "96", correct: false }
    ],
    explanation: { en: "36 + 48 = 84.", zh: "36 + 48 = 84。", zhHans: "36 + 48 = 84。" }
  },
  {
    id: "subtraction-1",
    family: "subtraction",
    prompt: { en: "What is 92 - 37?", zh: "92 - 37 等於多少？", zhHans: "92 - 37 等于多少？" },
    options: [
      { id: "a", label: "55", correct: true },
      { id: "b", label: "65", correct: false },
      { id: "c", label: "45", correct: false }
    ],
    explanation: { en: "92 - 30 - 7 = 55.", zh: "92 - 30 - 7 = 55。", zhHans: "92 - 30 - 7 = 55。" }
  },
  {
    id: "multiplication-1",
    family: "multiplication",
    prompt: { en: "What is 7 x 8?", zh: "7 x 8 等於多少？", zhHans: "7 x 8 等于多少？" },
    options: [
      { id: "a", label: "54", correct: false },
      { id: "b", label: "56", correct: true },
      { id: "c", label: "64", correct: false }
    ],
    explanation: { en: "7 groups of 8 make 56.", zh: "7 組 8 是 56。", zhHans: "7 组 8 是 56。" }
  },
  {
    id: "division-1",
    family: "division",
    prompt: { en: "48 coins are shared equally by 6 teams. How many coins per team?", zh: "48 枚金幣平均分給 6 隊，每隊多少枚？", zhHans: "48 枚金币平均分给 6 队，每队多少枚？" },
    options: [
      { id: "a", label: "6", correct: false },
      { id: "b", label: "8", correct: true },
      { id: "c", label: "9", correct: false }
    ],
    explanation: { en: "48 / 6 = 8.", zh: "48 / 6 = 8。", zhHans: "48 / 6 = 8。" }
  },
  {
    id: "fraction-1",
    family: "fraction",
    prompt: { en: "Which fraction equals 0.75?", zh: "哪個分數等於 0.75？", zhHans: "哪个分数等于 0.75？" },
    options: [
      { id: "a", label: "1/4", correct: false },
      { id: "b", label: "3/4", correct: true },
      { id: "c", label: "4/3", correct: false }
    ],
    explanation: { en: "0.75 is three quarters.", zh: "0.75 是四分之三。", zhHans: "0.75 是四分之三。" }
  },
  {
    id: "geometry-1",
    family: "geometry",
    prompt: { en: "A rectangle is 9 cm long and 4 cm wide. What is its area?", zh: "長方形長 9 cm、寬 4 cm，面積是多少？", zhHans: "长方形长 9 cm、宽 4 cm，面积是多少？" },
    options: [
      { id: "a", label: "13 cm2", correct: false },
      { id: "b", label: "26 cm2", correct: false },
      { id: "c", label: "36 cm2", correct: true }
    ],
    explanation: { en: "Area = 9 x 4 = 36 cm2.", zh: "面積 = 9 x 4 = 36 cm2。", zhHans: "面积 = 9 x 4 = 36 cm2。" }
  },
  {
    id: "pattern-1",
    family: "pattern",
    prompt: { en: "Find the next number: 4, 9, 14, 19, ...", zh: "找出下一個數：4, 9, 14, 19, ...", zhHans: "找出下一个数：4, 9, 14, 19, ..." },
    options: [
      { id: "a", label: "22", correct: false },
      { id: "b", label: "24", correct: true },
      { id: "c", label: "29", correct: false }
    ],
    explanation: { en: "The pattern adds 5 each time.", zh: "規律是每次加 5。", zhHans: "规律是每次加 5。" }
  },
  {
    id: "algebra-1",
    family: "algebra",
    prompt: { en: "If x + 6 = 17, what is x?", zh: "如果 x + 6 = 17，x 是多少？", zhHans: "如果 x + 6 = 17，x 是多少？" },
    options: [
      { id: "a", label: "9", correct: false },
      { id: "b", label: "11", correct: true },
      { id: "c", label: "23", correct: false }
    ],
    explanation: { en: "Subtract 6 from both sides: x = 11.", zh: "兩邊同減 6，x = 11。", zhHans: "两边同减 6，x = 11。" }
  }
];
