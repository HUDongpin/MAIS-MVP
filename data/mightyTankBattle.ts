import type { MightyTankBattleShell } from "@/lib/mightyTankBattle";
import type { LocalizedText } from "@/types";

export type MightyTankBattleQuestionOption = {
  id: string;
  label: string;
  correct: boolean;
};

export type MightyTankBattleQuestion = {
  id: string;
  family: "arithmetic" | "fractions" | "geometry" | "algebra";
  prompt: LocalizedText;
  options: MightyTankBattleQuestionOption[];
  explanation: LocalizedText;
};

export type MightyTankBattleLevel = {
  id: string;
  order: number;
  title: LocalizedText;
  subtitle: LocalizedText;
  objective: LocalizedText;
  focus: LocalizedText;
  timeLimitSeconds: number;
  playerBaseHp: number;
  enemyBaseHp: number;
  enemyKills: number;
  baseDamage: number;
  requiredKills: number;
  rewardPreview: {
    coins: number;
    xp: number;
  };
};

export type MightyTankBattlePowerUp = {
  id: "repair" | "piercing" | "boost" | "stealth";
  label: LocalizedText;
  description: LocalizedText;
  shell?: MightyTankBattleShell;
  charges: number;
  accent: string;
  mark: string;
};

export const mightyTankBattleLevels: MightyTankBattleLevel[] = [
  {
    id: "steel-harbor",
    order: 1,
    title: { en: "Steel Harbor", zh: "鋼鐵海港", zhHans: "钢铁海港" },
    subtitle: {
      en: "A clean first duel with short lanes, visible coins, and forgiving base HP.",
      zh: "短路線、清楚金幣、基地血量較寬鬆的第一場對戰。",
      zhHans: "短路线、清楚金币、基地血量较宽松的第一场对战。"
    },
    objective: {
      en: "Destroy the enemy base or lead by kills before 120 seconds.",
      zh: "120 秒內拆掉敵方基地，或以擊殺數領先。",
      zhHans: "120 秒内拆掉敌方基地，或以击杀数领先。"
    },
    focus: { en: "Arithmetic battle facts", zh: "四則運算戰術題", zhHans: "四则运算战术题" },
    timeLimitSeconds: 120,
    playerBaseHp: 1000,
    enemyBaseHp: 1000,
    enemyKills: 1,
    baseDamage: 120,
    requiredKills: 3,
    rewardPreview: { coins: 660, xp: 95 }
  },
  {
    id: "fraction-frontline",
    order: 2,
    title: { en: "Fraction Frontline", zh: "分數前線", zhHans: "分数前线" },
    subtitle: {
      en: "Walls tighten the firing lines while fractions and geometry enter the rotation.",
      zh: "掩體壓縮射擊線，分數與幾何題加入輪換。",
      zhHans: "掩体压缩射击线，分数与几何题加入轮换。"
    },
    objective: {
      en: "Use power-ups to break the base before the enemy wins the kill race.",
      zh: "善用道具，在敵方擊殺追上前攻破基地。",
      zhHans: "善用道具，在敌方击杀追上前攻破基地。"
    },
    focus: { en: "Fractions and area", zh: "分數與面積", zhHans: "分数与面积" },
    timeLimitSeconds: 120,
    playerBaseHp: 900,
    enemyBaseHp: 1150,
    enemyKills: 2,
    baseDamage: 115,
    requiredKills: 4,
    rewardPreview: { coins: 760, xp: 110 }
  }
];

export const mightyTankBattlePowerUps: MightyTankBattlePowerUp[] = [
  {
    id: "repair",
    label: { en: "Repair", zh: "回血", zhHans: "回血" },
    description: {
      en: "Restore your base armor.",
      zh: "恢復我方基地裝甲。",
      zhHans: "恢复我方基地装甲。"
    },
    charges: 2,
    accent: "from-emerald-300 via-teal-400 to-cyan-500",
    mark: "+"
  },
  {
    id: "piercing",
    label: { en: "Piercing Shell", zh: "穿甲彈", zhHans: "穿甲弹" },
    description: {
      en: "The next correct shot hits harder.",
      zh: "下一發答對後造成更高傷害。",
      zhHans: "下一发答对后造成更高伤害。"
    },
    shell: "piercing",
    charges: 3,
    accent: "from-amber-300 via-orange-400 to-red-500",
    mark: "P"
  },
  {
    id: "boost",
    label: { en: "Boost", zh: "加速", zhHans: "加速" },
    description: {
      en: "Move faster for a short window.",
      zh: "短時間提高移動速度。",
      zhHans: "短时间提高移动速度。"
    },
    charges: 2,
    accent: "from-sky-300 via-cyan-400 to-blue-500",
    mark: ">>"
  },
  {
    id: "stealth",
    label: { en: "Stealth", zh: "隱形", zhHans: "隐形" },
    description: {
      en: "Reduce enemy pressure briefly.",
      zh: "短時間降低敵方火力壓力。",
      zhHans: "短时间降低敌方火力压力。"
    },
    charges: 1,
    accent: "from-violet-300 via-fuchsia-400 to-pink-500",
    mark: "S"
  }
];

export const mightyTankBattleQuestions: MightyTankBattleQuestion[] = [
  {
    id: "arithmetic-01",
    family: "arithmetic",
    prompt: { en: "7 x 6 - 18 = ?", zh: "7 x 6 - 18 = ?", zhHans: "7 x 6 - 18 = ?" },
    options: [
      { id: "a", label: "24", correct: true },
      { id: "b", label: "30", correct: false },
      { id: "c", label: "36", correct: false },
      { id: "d", label: "42", correct: false }
    ],
    explanation: { en: "7 x 6 = 42, and 42 - 18 = 24.", zh: "7 x 6 = 42，42 - 18 = 24。", zhHans: "7 x 6 = 42，42 - 18 = 24。" }
  },
  {
    id: "arithmetic-02",
    family: "arithmetic",
    prompt: { en: "A shell does 45 damage twice. What is the total?", zh: "炮彈每次造成 45 傷害，兩次共多少？", zhHans: "炮弹每次造成 45 伤害，两次共多少？" },
    options: [
      { id: "a", label: "80", correct: false },
      { id: "b", label: "90", correct: true },
      { id: "c", label: "95", correct: false }
    ],
    explanation: { en: "45 + 45 = 90.", zh: "45 + 45 = 90。", zhHans: "45 + 45 = 90。" }
  },
  {
    id: "fractions-01",
    family: "fractions",
    prompt: { en: "Which value equals 3/4?", zh: "哪個數值等於 3/4？", zhHans: "哪个数值等于 3/4？" },
    options: [
      { id: "a", label: "0.25", correct: false },
      { id: "b", label: "0.5", correct: false },
      { id: "c", label: "0.75", correct: true }
    ],
    explanation: { en: "3 divided by 4 is 0.75.", zh: "3 除以 4 是 0.75。", zhHans: "3 除以 4 是 0.75。" }
  },
  {
    id: "geometry-01",
    family: "geometry",
    prompt: { en: "A 6 by 8 shield plate has area:", zh: "6 乘 8 的護甲板面積是：", zhHans: "6 乘 8 的护甲板面积是：" },
    options: [
      { id: "a", label: "14", correct: false },
      { id: "b", label: "28", correct: false },
      { id: "c", label: "48", correct: true }
    ],
    explanation: { en: "Rectangle area is length x width, so 6 x 8 = 48.", zh: "長方形面積 = 長 x 寬，所以 6 x 8 = 48。", zhHans: "长方形面积 = 长 x 宽，所以 6 x 8 = 48。" }
  },
  {
    id: "algebra-01",
    family: "algebra",
    prompt: { en: "If x + 9 = 31, what is x?", zh: "如果 x + 9 = 31，x 是多少？", zhHans: "如果 x + 9 = 31，x 是多少？" },
    options: [
      { id: "a", label: "20", correct: false },
      { id: "b", label: "22", correct: true },
      { id: "c", label: "40", correct: false }
    ],
    explanation: { en: "Subtract 9 from both sides: x = 22.", zh: "兩邊同減 9，x = 22。", zhHans: "两边同减 9，x = 22。" }
  }
];
