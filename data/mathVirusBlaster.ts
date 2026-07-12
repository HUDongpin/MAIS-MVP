import type { LocalizedText } from "@/types";

export type MathVirusBlasterTopic = "addition" | "multiplication" | "fractions" | "geometry" | "algebra";

export type MathVirusBlasterQuestionOption = {
  id: string;
  label: string;
  correct: boolean;
};

export type MathVirusBlasterQuestion = {
  id: string;
  topic: MathVirusBlasterTopic;
  prompt: LocalizedText;
  options: MathVirusBlasterQuestionOption[];
  explanation: LocalizedText;
};

export type MathVirusBlasterVirus = {
  id: string;
  name: LocalizedText;
  topic: MathVirusBlasterTopic;
  hp: number;
  coinValue: number;
  clearValue: number;
  x: number;
  y: number;
  size: number;
};

export type MathVirusBlasterUpgrade = {
  id: "power" | "fireRate" | "equationPower" | "shield" | "drone" | "coinBonus";
  label: LocalizedText;
  level: number;
  cost: number;
  mark: string;
  accent: string;
};

export type MathVirusBlasterLevel = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  timeLimitSeconds: number;
  totalViruses: number;
  initialDefeatedViruses: number;
  baseDamage: number;
  rewardPreview: {
    coins: number;
    xp: number;
  };
  initialState: {
    coins: number;
    combo: number;
    shield: number;
    overcharge: number;
    elapsedSeconds: number;
  };
  objectives: {
    clearViruses: number;
    combo: number;
    finishSeconds: number;
  };
  viruses: MathVirusBlasterVirus[];
  upgrades: MathVirusBlasterUpgrade[];
};

export const mathVirusBlasterDesignImagePath = "/games/math-virus-blaster/math-master-virus-blaster-design.png" as const;

export const mathVirusBlasterTopicMeta: Record<
  MathVirusBlasterTopic,
  {
    label: LocalizedText;
    mark: string;
    accent: string;
  }
> = {
  addition: {
    label: { en: "Addition", zh: "加法", zhHans: "加法" },
    mark: "+",
    accent: "from-lime-300 via-emerald-400 to-green-600"
  },
  multiplication: {
    label: { en: "Multiplication", zh: "乘法", zhHans: "乘法" },
    mark: "x",
    accent: "from-orange-300 via-amber-500 to-red-500"
  },
  fractions: {
    label: { en: "Fractions", zh: "分數", zhHans: "分数" },
    mark: "1/2",
    accent: "from-violet-300 via-purple-500 to-indigo-600"
  },
  geometry: {
    label: { en: "Geometry", zh: "幾何", zhHans: "几何" },
    mark: "Tri",
    accent: "from-sky-300 via-cyan-500 to-blue-700"
  },
  algebra: {
    label: { en: "Algebra", zh: "代數", zhHans: "代数" },
    mark: "x2",
    accent: "from-fuchsia-300 via-violet-500 to-purple-700"
  }
};

export const mathVirusBlasterLevels: MathVirusBlasterLevel[] = [
  {
    id: "algebra-lab",
    title: { en: "Level 3 - Algebra Lab", zh: "第 3 關 - 代數實驗室", zhHans: "第 3 关 - 代数实验室" },
    subtitle: {
      en: "Blast numbered virus cells by solving quick math prompts.",
      zh: "解開快速數學題，擊破帶數字的病毒細胞。",
      zhHans: "解开快速数学题，击破带数字的病毒细胞。"
    },
    timeLimitSeconds: 120,
    totalViruses: 80,
    initialDefeatedViruses: 52,
    baseDamage: 20,
    rewardPreview: { coins: 200, xp: 80 },
    initialState: {
      coins: 1250,
      combo: 18,
      shield: 3,
      overcharge: 72,
      elapsedSeconds: 32
    },
    objectives: {
      clearViruses: 64,
      combo: 30,
      finishSeconds: 120
    },
    viruses: [
      {
        id: "green-addition-48",
        name: { en: "Green Addition Virus", zh: "綠色加法病毒", zhHans: "绿色加法病毒" },
        topic: "addition",
        hp: 48,
        coinValue: 25,
        clearValue: 5,
        x: 26.5,
        y: 22.5,
        size: 11.5
      },
      {
        id: "red-multiplication-72",
        name: { en: "Red Multiplication Virus", zh: "紅色乘法病毒", zhHans: "红色乘法病毒" },
        topic: "multiplication",
        hp: 72,
        coinValue: 40,
        clearValue: 6,
        x: 41.2,
        y: 25.1,
        size: 11.5
      },
      {
        id: "blue-fractions-36",
        name: { en: "Blue Fraction Virus", zh: "藍色分數病毒", zhHans: "蓝色分数病毒" },
        topic: "fractions",
        hp: 36,
        coinValue: 24,
        clearValue: 4,
        x: 53,
        y: 27.2,
        size: 11.2
      },
      {
        id: "purple-geometry-30",
        name: { en: "Purple Geometry Virus", zh: "紫色幾何病毒", zhHans: "紫色几何病毒" },
        topic: "geometry",
        hp: 30,
        coinValue: 22,
        clearValue: 4,
        x: 64.6,
        y: 27.2,
        size: 10.5
      },
      {
        id: "purple-fractions-20",
        name: { en: "Low Fraction Virus", zh: "低血量分數病毒", zhHans: "低血量分数病毒" },
        topic: "fractions",
        hp: 20,
        coinValue: 18,
        clearValue: 3,
        x: 33.6,
        y: 48.2,
        size: 10.2
      },
      {
        id: "teal-multiplication-25",
        name: { en: "Teal Multiplication Virus", zh: "青色乘法病毒", zhHans: "青色乘法病毒" },
        topic: "multiplication",
        hp: 25,
        coinValue: 20,
        clearValue: 3,
        x: 64,
        y: 51.3,
        size: 9.5
      },
      {
        id: "gold-addition-55",
        name: { en: "Golden Addition Virus", zh: "金色加法病毒", zhHans: "金色加法病毒" },
        topic: "addition",
        hp: 55,
        coinValue: 55,
        clearValue: 7,
        x: 76.4,
        y: 45.4,
        size: 12.5
      }
    ],
    upgrades: [
      {
        id: "power",
        label: { en: "Power", zh: "火力", zhHans: "火力" },
        level: 4,
        cost: 700,
        mark: "PWR",
        accent: "from-sky-300 via-cyan-500 to-blue-700"
      },
      {
        id: "fireRate",
        label: { en: "Fire Rate", zh: "射速", zhHans: "射速" },
        level: 3,
        cost: 500,
        mark: ">>",
        accent: "from-emerald-300 via-green-500 to-teal-700"
      },
      {
        id: "equationPower",
        label: { en: "Equation Power", zh: "算式能量", zhHans: "算式能量" },
        level: 4,
        cost: 800,
        mark: "a2+b2",
        accent: "from-fuchsia-300 via-violet-500 to-purple-800"
      },
      {
        id: "shield",
        label: { en: "Shield", zh: "護盾", zhHans: "护盾" },
        level: 3,
        cost: 600,
        mark: "SH",
        accent: "from-sky-200 via-blue-500 to-indigo-700"
      },
      {
        id: "drone",
        label: { en: "Drone", zh: "無人機", zhHans: "无人机" },
        level: 2,
        cost: 400,
        mark: "◎",
        accent: "from-cyan-200 via-teal-500 to-slate-700"
      },
      {
        id: "coinBonus",
        label: { en: "Coin Bonus", zh: "金幣加成", zhHans: "金币加成" },
        level: 2,
        cost: 400,
        mark: "$",
        accent: "from-yellow-200 via-amber-400 to-orange-700"
      }
    ]
  }
];

export const mathVirusBlasterQuestions: MathVirusBlasterQuestion[] = [
  {
    id: "multiplication-8-6",
    topic: "multiplication",
    prompt: { en: "8 x 6 = ?", zh: "8 x 6 = ?", zhHans: "8 x 6 = ?" },
    options: [
      { id: "a", label: "48", correct: true },
      { id: "b", label: "46", correct: false },
      { id: "c", label: "56", correct: false }
    ],
    explanation: { en: "8 groups of 6 make 48.", zh: "8 組 6 是 48。", zhHans: "8 组 6 是 48。" }
  },
  {
    id: "addition-27-21",
    topic: "addition",
    prompt: { en: "27 + 21 = ?", zh: "27 + 21 = ?", zhHans: "27 + 21 = ?" },
    options: [
      { id: "a", label: "48", correct: true },
      { id: "b", label: "46", correct: false },
      { id: "c", label: "52", correct: false }
    ],
    explanation: { en: "27 + 20 + 1 = 48.", zh: "27 + 20 + 1 = 48。", zhHans: "27 + 20 + 1 = 48。" }
  },
  {
    id: "fractions-three-quarters",
    topic: "fractions",
    prompt: { en: "Which decimal equals 3/4?", zh: "哪個小數等於 3/4？", zhHans: "哪个小数等于 3/4？" },
    options: [
      { id: "a", label: "0.25", correct: false },
      { id: "b", label: "0.75", correct: true },
      { id: "c", label: "1.25", correct: false }
    ],
    explanation: { en: "3 divided by 4 is 0.75.", zh: "3 除以 4 是 0.75。", zhHans: "3 除以 4 是 0.75。" }
  },
  {
    id: "geometry-area",
    topic: "geometry",
    prompt: { en: "A rectangle is 5 by 6. What is its area?", zh: "長方形長 5、寬 6，面積是多少？", zhHans: "长方形长 5、宽 6，面积是多少？" },
    options: [
      { id: "a", label: "11", correct: false },
      { id: "b", label: "30", correct: true },
      { id: "c", label: "36", correct: false }
    ],
    explanation: { en: "Area is length x width, so 5 x 6 = 30.", zh: "面積 = 長 x 寬，所以 5 x 6 = 30。", zhHans: "面积 = 长 x 宽，所以 5 x 6 = 30。" }
  },
  {
    id: "algebra-solve-x",
    topic: "algebra",
    prompt: { en: "If x + 18 = 48, what is x?", zh: "如果 x + 18 = 48，x 是多少？", zhHans: "如果 x + 18 = 48，x 是多少？" },
    options: [
      { id: "a", label: "20", correct: false },
      { id: "b", label: "30", correct: true },
      { id: "c", label: "66", correct: false }
    ],
    explanation: { en: "Subtract 18 from both sides: x = 30.", zh: "兩邊同減 18，x = 30。", zhHans: "两边同减 18，x = 30。" }
  }
];
