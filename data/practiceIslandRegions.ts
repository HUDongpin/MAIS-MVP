import type { LocalizedText } from "@/types";

export type PracticeIslandDomainRegionId = "number-forest" | "algebra-peaks" | "geometry-garden";

export type PracticeIslandRegionId =
  | PracticeIslandDomainRegionId
  | "question-cavern"
  | "challenge-shore"
  | "masters-keep";

export type PracticeIslandRegionKind = "domain" | "adaptive" | "challenge" | "review";

export type PracticeIslandRegion = {
  id: PracticeIslandRegionId;
  kind: PracticeIslandRegionKind;
  label: LocalizedText;
  subtitle: LocalizedText;
  pinClassName: string;
  pinWideOnly?: boolean;
};

export const practiceIslandMaxStarsPerRegion = 3;
export const mastersKeepUnlockStarTotal = 12;

export const practiceIslandRegions: PracticeIslandRegion[] = [
  {
    id: "algebra-peaks",
    kind: "domain",
    label: { en: "Algebra Peaks", zh: "代數山峰", zhHans: "代数山峰" },
    subtitle: { en: "Operations and equations", zh: "運算與方程", zhHans: "运算与方程" },
    pinClassName: "left-[25%] top-[21%]"
  },
  {
    id: "geometry-garden",
    kind: "domain",
    label: { en: "Geometry Garden", zh: "幾何花園", zhHans: "几何花园" },
    subtitle: { en: "Shapes, measures and data", zh: "圖形、量度與數據", zhHans: "图形、测量与数据" },
    pinClassName: "left-[68%] top-[21%]"
  },
  {
    id: "number-forest",
    kind: "domain",
    label: { en: "Number Forest", zh: "數字森林", zhHans: "数字森林" },
    subtitle: { en: "Counting and place value", zh: "數與位值", zhHans: "数与位值" },
    pinClassName: "left-[18%] top-[55%]"
  },
  {
    id: "question-cavern",
    kind: "adaptive",
    label: { en: "Question Cavern", zh: "問題洞穴", zhHans: "问题洞穴" },
    subtitle: { en: "AI-picked mission", zh: "AI 精選任務", zhHans: "AI 精选任务" },
    pinClassName: "left-[50%] top-[53%]"
  },
  {
    id: "masters-keep",
    kind: "review",
    label: { en: "Master's Keep", zh: "大師城堡", zhHans: "大师城堡" },
    subtitle: { en: "Mastery review", zh: "大師重溫", zhHans: "大师复习" },
    pinClassName: "left-[78%] top-[57%]"
  },
  {
    id: "challenge-shore",
    kind: "challenge",
    label: { en: "Challenge Shore", zh: "挑戰海岸", zhHans: "挑战海岸" },
    subtitle: { en: "Mixed challenge", zh: "混合挑戰", zhHans: "混合挑战" },
    pinClassName: "left-[58%] top-[78%]",
    pinWideOnly: true
  }
];

export const practiceIslandStarTotalMax = practiceIslandRegions.length * practiceIslandMaxStarsPerRegion;

const geometryTopicIdCodes = new Set(["g", "md", "sp", "srt", "gmd", "gpe", "co"]);
const algebraTopicIdCodes = new Set(["oa", "ee", "rp", "f", "if", "bf", "le", "sse", "apr", "ced", "rei"]);
const numberTopicIdCodes = new Set(["cc", "nbt", "nf", "ns", "rn", "q"]);

const geometryKeywords = [
  "geometr",
  "shape",
  "angle",
  "triangle",
  "circle",
  "polygon",
  "area",
  "perimeter",
  "volume",
  "measure",
  "symmetr",
  "coordinate",
  "transformation",
  "statistic",
  "probabilit",
  "data",
  "vector",
  "solid",
  "space",
  "trigonometr",
  "幾何",
  "几何",
  "圖形",
  "图形",
  "三角",
  "圓",
  "圆",
  "面積",
  "面积",
  "周界",
  "周长",
  "體積",
  "体积",
  "對稱",
  "对称",
  "座標",
  "坐标",
  "統計",
  "统计",
  "概率",
  "機率",
  "机率",
  "向量",
  "立體",
  "立体",
  "空間",
  "空间",
  "數據",
  "数据",
  "量度"
];

const algebraKeywords = [
  "algebra",
  "equation",
  "inequalit",
  "expression",
  "operation",
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "multipl",
  "divid",
  "ratio",
  "proportion",
  "percent",
  "function",
  "pattern",
  "sequence",
  "polynomial",
  "factor",
  "exponent",
  "logarithm",
  "derivative",
  "calculus",
  "代數",
  "代数",
  "方程",
  "不等式",
  "函數",
  "函数",
  "運算",
  "运算",
  "比例",
  "百分",
  "數列",
  "数列",
  "多項式",
  "多项式",
  "因式",
  "指數",
  "指数",
  "對數",
  "对数",
  "冪",
  "幂",
  "集合",
  "邏輯",
  "逻辑",
  "複數",
  "复数",
  "導數",
  "导数",
  "微積分",
  "微积分",
  "計數",
  "计数"
];

function topicIdTokens(topicId: string) {
  return new Set(topicId.toLowerCase().split(/[^a-z0-9一-鿿]+/u).filter(Boolean));
}

function hasAnyToken(tokens: Set<string>, codes: Set<string>) {
  for (const code of codes) {
    if (tokens.has(code)) return true;
  }
  return false;
}

export function classifyPracticeIslandTopic(topic: {
  topicId: string;
  topic?: LocalizedText;
}): PracticeIslandDomainRegionId {
  const tokens = topicIdTokens(topic.topicId);
  if (hasAnyToken(tokens, geometryTopicIdCodes)) return "geometry-garden";
  if (hasAnyToken(tokens, algebraTopicIdCodes)) return "algebra-peaks";
  if (hasAnyToken(tokens, numberTopicIdCodes)) return "number-forest";

  const haystack = [topic.topicId, topic.topic?.en, topic.topic?.zh, topic.topic?.zhHans]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (geometryKeywords.some((keyword) => haystack.includes(keyword))) return "geometry-garden";
  if (algebraKeywords.some((keyword) => haystack.includes(keyword))) return "algebra-peaks";
  return "number-forest";
}
