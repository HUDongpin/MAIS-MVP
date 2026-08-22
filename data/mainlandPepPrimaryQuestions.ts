import { mainlandPepPrimaryTopics, mainlandPepPrimaryTopicMetadata } from "./mainlandPepPrimaryTopics";
import { mainlandPepPrimaryExamPatternCards } from "./rag/mainlandPepPrimaryExamPatterns";
import { mainlandPepPrimaryRagCards } from "./rag/mainlandPepPrimary";
import type {
  Difficulty,
  GradeId,
  LocalizedText,
  MainlandPepSemester,
  Question,
  QuestionType
} from "@/types";
import type {
  MainlandPepPrimaryQuestionFamily,
  MainlandPepPrimarySemester
} from "./mainlandPepPrimaryTopics";

const mainlandPepProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_PEP" as const };
const primaryGrades = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;
const typePrefixes: Record<PrimaryQuestionType, string> = {
  "multiple-choice": "mc",
  "fill-in": "fi",
  "short-answer": "sa"
};

type PrimaryGrade = (typeof primaryGrades)[number];
type PrimaryQuestionType = Exclude<QuestionType, "graph">;
type PrimaryQuestionBatch = "primary-rag-v1";
type SourceDistanceStatus = "passed" | "needs-review";

type Draft = {
  prompt: LocalizedText;
  answer: string;
  explanation: LocalizedText;
  distractors: string[];
  acceptedAnswers?: string[];
};

type TopicSpec = {
  id: string;
  grade: PrimaryGrade;
  semester: MainlandPepPrimarySemester;
  family: MainlandPepPrimaryQuestionFamily;
  title: LocalizedText;
};

export type MainlandPepPrimaryQuestionGenerationMetadata = {
  batch: PrimaryQuestionBatch;
  grade: PrimaryGrade;
  semester: MainlandPepPrimarySemester;
  type: PrimaryQuestionType;
  topicId: string;
  family: MainlandPepPrimaryQuestionFamily;
  itemIndex: number;
  evidenceCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: SourceDistanceStatus;
};

const topicSpecs: TopicSpec[] = mainlandPepPrimaryTopics.map((topic) => {
  const metadata = mainlandPepPrimaryTopicMetadata[topic.id];
  if (!metadata) throw new Error(`Missing Mainland PEP primary metadata for topic ${topic.id}`);
  if (!primaryGrades.includes(topic.grade as PrimaryGrade)) {
    throw new Error(`Mainland PEP primary topic ${topic.id} has non-primary grade ${topic.grade}`);
  }

  return {
    id: topic.id,
    grade: topic.grade as PrimaryGrade,
    semester: metadata.semester,
    family: metadata.family,
    title: topic.title
  };
});

const topicById = new Map(mainlandPepPrimaryTopics.map((topic) => [topic.id, topic]));

const cjkPattern = /[\u3400-\u9fff]/u;
const visibleEnglishReplacements: Array<[string, string]> = [
  ["小林", "Lin"],
  ["小雅", "Ya"],
  ["明明", "Ming"],
  ["乐乐", "Lele"],
  ["小辰", "Chen"],
  ["婷婷", "Ting"],
  ["浩浩", "Hao"],
  ["安安", "An"],
  ["小雨", "Yu"],
  ["晨晨", "Cheng"],
  ["佳佳", "Jia"],
  ["文文", "Wen"],
  ["数学角", "the math corner"],
  ["阅读区", "the reading area"],
  ["科学桌", "the science table"],
  ["美术柜", "the art cabinet"],
  ["运动场", "the sports field"],
  ["图书角", "the book corner"],
  ["种植区", "the planting area"],
  ["手工桌", "the craft table"],
  ["贴纸", "stickers"],
  ["彩笔", "colored pens"],
  ["卡片", "cards"],
  ["积木", "blocks"],
  ["练习本", "notebooks"],
  ["奖章", "badges"],
  ["花盆", "flowerpots"],
  ["书签", "bookmarks"],
  ["纸条", "paper slips"],
  ["模型", "models"],
  ["从各个方向都能滚动", "it can roll in every direction"],
  ["上下两个面都是圆形", "it has two circular faces"],
  ["每个面都是正方形", "all faces are squares"],
  ["相对的面形状相同，多数面是长方形", "opposite faces match, and most faces are rectangles"],
  ["能向各个方向滚动", "it can roll in every direction"],
  ["有两个圆形的面", "it has two circular faces"],
  ["每个面都是正方形", "all faces are squares"],
  ["有六个面，而且不是每个面都是正方形", "it has six faces, and not every face is a square"],
  ["长方体", "cuboid"],
  ["正方体", "cube"],
  ["圆柱", "cylinder"],
  ["球", "sphere"],
  ["摄氏度", "degrees Celsius"]
];

const visibleChineseReplacements: Array<[RegExp, string]> = [
  [/\bcuboid\b/g, "长方体"],
  [/\bcube\b/g, "正方体"],
  [/\bcylinder\b/g, "圆柱"],
  [/\bsphere\b/g, "球"],
  [/\bacute angle\b/gi, "锐角"],
  [/\bright angle\b/gi, "直角"],
  [/\bobtuse angle\b/gi, "钝角"],
  [/\bstraight angle\b/gi, "平角"],
  [/\bfull angle\b/gi, "周角"]
];

function applyLiteralReplacements(value: string, replacements: Array<[string, string]>) {
  return replacements.reduce((current, [from, to]) => current.replaceAll(from, to), value);
}

function englishVisible(value: string) {
  return applyLiteralReplacements(value, visibleEnglishReplacements)
    .replace(/(-?\d+(?:\.\d+)?)立方厘米/g, "$1 cm^3")
    .replace(/(-?\d+(?:\.\d+)?)平方厘米/g, "$1 cm^2")
    .replace(/(-?\d+(?:\.\d+)?)厘米/g, "$1 cm")
    .replace(/(-?\d+(?:\.\d+)?)分钟/g, "$1 min")
    .replace(/(-?\d+(?:\.\d+)?)升/g, "$1 L")
    .replace(/(-?\d+(?:\.\d+)?)米/g, "$1 m")
    .replace(/(-?\d+(?:\.\d+)?)个/g, "$1 items")
    .replace(/(-?\d+)余(\d+)/g, "$1 R $2");
}

function chineseVisible(value: string) {
  if (cjkPattern.test(value)) return value;
  return visibleChineseReplacements
    .reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value)
    .replace(/(-?\d+(?:\.\d+)?)\s*cm\^3/gi, "$1立方厘米")
    .replace(/(-?\d+(?:\.\d+)?)\s*cm\^2/gi, "$1平方厘米")
    .replace(/(-?\d+(?:\.\d+)?)\s*cm\b/gi, "$1厘米")
    .replace(/(-?\d+(?:\.\d+)?)\s*min\b/gi, "$1分钟")
    .replace(/(-?\d+(?:\.\d+)?)\s*L\b/g, "$1升")
    .replace(/(-?\d+(?:\.\d+)?)\s*m\b/gi, "$1米")
    .replace(/(-?\d+(?:\.\d+)?)\s*items\b/gi, "$1个")
    .replace(/(-?\d+)\s*R\s*(\d+)/g, "$1余$2");
}

function localized(value: string): LocalizedText {
  const en = englishVisible(value);
  const zh = chineseVisible(value);
  return { en, zh, zhHans: zh };
}

function text(en: string, zhHans: string, zhTraditional = zhHans): LocalizedText {
  return { en: englishVisible(en), zh: zhTraditional, zhHans };
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function fraction(numerator: number, denominator: number) {
  const factor = gcd(numerator, denominator);
  return `${numerator / factor}/${denominator / factor}`;
}

function oneDecimal(value: number) {
  return Number(value.toFixed(1));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function optionsFor(answer: string, distractors: string[], seed: number): LocalizedText[] {
  const numeric = Number(answer);
  const fallback = Number.isFinite(numeric)
    ? [numeric + 1, numeric - 1, numeric + 2, Math.max(0, numeric - 2)].map(formatNumber)
    : [`${answer}1`, `${answer}2`, "Cannot be determined", "None of these"];
  const values = unique([answer, ...distractors, ...fallback]).slice(0, 4);
  const rotated = [...values.slice(seed % values.length), ...values.slice(0, seed % values.length)];
  return rotated.map(localized);
}

function hiddenAcceptedAliases(originalAnswer: string, canonicalAnswer: string) {
  const aliases: string[] = [];
  if (originalAnswer !== canonicalAnswer) aliases.push(originalAnswer);

  const unitMatch = canonicalAnswer.match(/^(-?\d+(?:\.\d+)?)\s*(cm\^2|cm\^3|cm|min|L|m|items)$/i);
  if (unitMatch) aliases.push(unitMatch[1]);

  const remainderMatch = canonicalAnswer.match(/^(-?\d+)\s*R\s*(\d+)$/);
  if (remainderMatch) {
    aliases.push(`${remainderMatch[1]}余${remainderMatch[2]}`);
    aliases.push(`${remainderMatch[1]} remainder ${remainderMatch[2]}`);
  }

  return unique(aliases);
}

function answerWithUnit(value: number, unit: string) {
  return `${formatNumber(value)}${unit}`;
}

function coordinateDistractors(x: number, y: number) {
  const answer = `(${x}, ${y})`;
  return unique([
    `(${y}, ${x})`,
    `(${x}, ${y + 1})`,
    `(${x + 1}, ${y})`,
    `(${x - 1}, ${y})`,
    `(${x}, ${y - 1})`
  ].filter((candidate) => candidate !== answer)).slice(0, 3);
}

function scalarDraft({
  enPrompt,
  zhPrompt,
  zhTraditionalPrompt,
  answer,
  enExplanation,
  zhExplanation,
  zhTraditionalExplanation,
  distractors = [],
  acceptedAnswers = []
}: {
  enPrompt: string;
  zhPrompt: string;
  zhTraditionalPrompt?: string;
  answer: string | number;
  enExplanation: string;
  zhExplanation: string;
  zhTraditionalExplanation?: string;
  distractors?: Array<string | number>;
  acceptedAnswers?: string[];
}): Draft {
  const answerText = String(answer);
  const canonicalAnswer = englishVisible(answerText);
  const acceptedAnswerAliases = unique([
    ...acceptedAnswers,
    ...hiddenAcceptedAliases(answerText, canonicalAnswer)
  ]).filter((candidate) => candidate !== canonicalAnswer);

  return {
    prompt: text(enPrompt, zhPrompt, zhTraditionalPrompt),
    answer: canonicalAnswer,
    explanation: text(enExplanation, zhExplanation, zhTraditionalExplanation),
    distractors: distractors.map((distractor) => englishVisible(String(distractor))),
    ...(acceptedAnswerAliases.length ? { acceptedAnswers: acceptedAnswerAliases } : {})
  };
}

type PrimaryManualContentQaOverride = Partial<Draft>;

const mainlandPepPrimaryManualContentQaOverrides: Record<string, PrimaryManualContentQaOverride> = {
  "pep-primary-p2-l-fi-112": {
    acceptedAnswers: [
      "商3余1",
      "商是3，余数是1",
      "quotient 3, remainder 1",
      "3余1",
      "3 remainder 1",
      "3组，剩1个",
      "3组，还剩1个",
      "3組，剩1個",
      "3組，還剩1個",
      "3 groups, 1 left"
    ]
  },
  "pep-primary-p2-l-fi-115": {
    acceptedAnswers: [
      "商5余3",
      "商是5，余数是3",
      "quotient 5, remainder 3",
      "5袋，余3个",
      "5袋，还剩3个",
      "5袋剩3个",
      "5袋，餘3個",
      "5袋，還剩3個",
      "5袋剩3個",
      "5余3",
      "5 remainder 3",
      "5 bags, 3 left"
    ]
  },
  "pep-primary-p2-l-fi-124": {
    acceptedAnswers: [
      "商8余1",
      "商是8，余数是1",
      "quotient 8, remainder 1",
      "8袋，余1个",
      "8袋，还剩1个",
      "8袋剩1个",
      "8袋，餘1個",
      "8袋，還剩1個",
      "8袋剩1個",
      "8余1",
      "8 remainder 1",
      "8 bags, 1 left"
    ]
  },
  "pep-primary-p2-l-fi-128": {
    acceptedAnswers: [
      "商6余0",
      "商是6，余数是0",
      "quotient 6, remainder 0",
      "6袋，余0个",
      "6袋，还剩0个",
      "6袋剩0个",
      "可以装6袋，还剩0个",
      "6袋，餘0個",
      "6袋，還剩0個",
      "6袋剩0個",
      "可以裝6袋，還剩0個",
      "6余0",
      "6 remainder 0",
      "6 bags, 0 left"
    ]
  },
  "pep-primary-p3-u-mc-072": {
    distractors: ["14 min", "20 min", "10 min"]
  },
  "pep-primary-p4-u-mc-060": {
    distractors: ["94°", "85°", "105°"]
  },
  "pep-primary-p4-u-mc-061": {
    distractors: ["100°", "80°", "70°"]
  },
  "pep-primary-p4-u-mc-062": {
    distractors: ["95°", "75°", "105°"]
  },
  "pep-primary-p1-l-sa-200": {
    acceptedAnswers: ["6人", "6名", "6 students"],
    explanation: text(
      "Compare 4, 6, and 5. The largest group has 6 students.",
      "比较4人、6人和5人，最大的是6人，所以人数最多的一组有6人。",
      "比較4人、6人和5人，最大的是6人，所以人數最多的一組有6人。"
    )
  },
  "pep-primary-p4-l-fi-117": {
    acceptedAnswers: ["3.2升", "3.2 L", "3.2 litres", "3.2 liters"],
    explanation: text(
      "Line up the decimal points: 1.1+2.1=3.2, so the total is 3.2 L.",
      "小数点对齐计算：1.1+2.1=3.2，所以合计3.2升。",
      "小數點對齊計算：1.1+2.1=3.2，所以合計3.2升。"
    )
  },
  "pep-primary-p5-l-sa-131": {
    acceptedAnswers: ["5/8页", "5/8 page", "5/8 of a page"],
    explanation: text(
      "The denominators are the same, so add the numerators: 3/8+2/8=5/8. Lele completed 5/8 of a page in total.",
      "分母相同，分子相加：3/8+2/8=5/8，所以一共完成了5/8页。",
      "分母相同，分子相加：3/8+2/8=5/8，所以一共完成了5/8頁。"
    )
  },
  "pep-primary-p1-u-mc-052": scalarDraft({
    enPrompt:
      "Which solid has six flat faces that are rectangles or squares, with opposite faces the same shape and size, and at least one face that is not a square?",
    zhPrompt: "哪种立体图形有六个平平的面，每个面都是长方形或正方形，相对的面形状和大小相同，并且至少有一个面不是正方形？",
    answer: "长方体",
    enExplanation:
      "These are the lesson's defining features of a cuboid, and the non-square face rules out a cube, whose faces are all squares.",
    zhExplanation: "这些特征符合本课中长方体的定义；至少有一个面不是正方形，也排除了六个面全是正方形的正方体。",
    distractors: ["正方体", "圆柱", "球"]
  }),
  "pep-primary-p1-u-fi-091": scalarDraft({
    enPrompt:
      "A block has six flat faces that are rectangles or squares. Opposite faces have the same shape and size, and at least one face is not a square. Which solid is the block?",
    zhPrompt: "一个积木有六个平平的面，每个面都是长方形或正方形，相对的面形状和大小相同，并且至少有一个面不是正方形。这个积木是哪种立体图形？",
    answer: "长方体",
    enExplanation:
      "These are the lesson's defining features of a cuboid, and the non-square face rules out a cube, whose faces are all squares.",
    zhExplanation: "这些特征符合本课中长方体的定义；至少有一个面不是正方形，也排除了六个面全是正方形的正方体。"
  }),
  "pep-primary-p1-l-fi-152": scalarDraft({
    enPrompt: "Ya has one 5-yuan note and three 1-yuan coins. How many yuan does she have altogether?",
    zhPrompt: "小雅有一张5元纸币和三枚1元硬币，一共有多少元？",
    answer: 8,
    acceptedAnswers: ["8元", "8 yuan"],
    enExplanation: "Add the value of the note and the three coins: 5+1+1+1=8, so Ya has 8 yuan.",
    zhExplanation: "把纸币和三枚硬币的钱数相加：5+1+1+1=8，所以一共有8元。"
  }),
  "pep-primary-p1-l-fi-153": scalarDraft({
    enPrompt: "A cartoon starts at 9:00 and ends at 9:30. How many minutes does it last?",
    zhPrompt: "动画片9:00开始，9:30结束，播放了多少分钟？",
    answer: answerWithUnit(30, "分钟"),
    enExplanation: "From 9:00 to 9:30, 30 minutes pass, so the cartoon lasts 30 minutes.",
    zhExplanation: "从9:00到9:30经过30分钟，所以动画片播放了30分钟。"
  }),
  "pep-primary-p1-u-mc-002": scalarDraft({
    enPrompt: "Which number is greater, 12 or 17?",
    zhPrompt: "在12和17中，哪个数大？",
    answer: 17,
    enExplanation: "17 has 1 ten and 7 ones, while 12 has 1 ten and 2 ones. Since 7 ones is more than 2 ones, 17 is greater.",
    zhExplanation: "17有1个十和7个一，12有1个十和2个一；7个一比2个一多，所以17大。",
    distractors: [12, 15, 19]
  }),
  "pep-primary-p1-u-mc-003": scalarDraft({
    enPrompt: "Count in order: 8, 9, ____, 11. Which number belongs in the blank?",
    zhPrompt: "按顺序数数：8，9，____，11。空格里应填几？",
    answer: 10,
    enExplanation: "The numbers increase by 1 each time: 8, 9, 10, 11. The missing number is 10.",
    zhExplanation: "这些数每次增加1：8，9，10，11，所以空格里应填10。",
    distractors: [8, 9, 12]
  }),
  "pep-primary-p2-l-fi-152": scalarDraft({
    enPrompt: "2 kilograms equals how many grams?",
    zhPrompt: "2千克等于多少克？",
    answer: 2000,
    acceptedAnswers: ["2000克", "2000 g", "2,000"],
    enExplanation: "1 kilogram equals 1000 grams, so 2 kilograms equals 2×1000=2000 grams.",
    zhExplanation: "1千克=1000克，所以2千克=2×1000=2000克。",
    zhTraditionalExplanation: "1千克=1000克，所以2千克=2×1000=2000克。"
  }),
  "pep-primary-p2-l-fi-153": scalarDraft({
    enPrompt: "A table records 26 bottles collected on Monday and 34 on Tuesday. How many more bottles were collected on Tuesday?",
    zhPrompt: "统计表记录周一收集了26个瓶子，周二收集了34个。周二比周一多收集多少个？",
    answer: 8,
    acceptedAnswers: ["8个", "8个瓶子", "8 bottles"],
    enExplanation: "Subtract Monday's count from Tuesday's count: 34-26=8, so Tuesday has 8 more bottles.",
    zhExplanation: "用周二的数量减去周一的数量：34-26=8，所以周二多收集8个。"
  }),
  "pep-primary-p2-u-mc-052": scalarDraft({
    enPrompt: "How many right angles does a rectangle have?",
    zhPrompt: "一个长方形有几个直角？",
    answer: 4,
    enExplanation: "Each of the four corners of a rectangle is a right angle, so a rectangle has 4 right angles.",
    zhExplanation: "长方形的四个角都是直角，所以一个长方形有4个直角。",
    distractors: [2, 3, 5]
  }),
  "pep-primary-p2-u-mc-053": scalarDraft({
    enPrompt: "Three identical cubes are placed side by side in one horizontal row. How many squares are visible from the front?",
    zhPrompt: "用3个相同的小正方体横着摆成一排。从正面看，能看到几个正方形？",
    answer: 3,
    enExplanation: "From the front, each cube shows one square face. 3 cubes in a row show 3 squares.",
    zhExplanation: "从正面看，每个小正方体露出一个正方形面，3个小正方体一共能看到3个正方形。",
    distractors: [1, 2, 4]
  }),
  "pep-primary-p3-u-mc-002": scalarDraft({
    enPrompt: "Calculate 376+248.",
    zhPrompt: "计算376+248。",
    answer: 624,
    enExplanation: "Add by place value: 6+8=14, write 4 and carry 1; 7+4+1=12, write 2 and carry 1; 3+2+1=6. Therefore, 376+248=624.",
    zhExplanation: "按数位相加：6+8=14，写4进1；7+4+1=12，写2进1；3+2+1=6，所以376+248=624。",
    distractors: [514, 614, 634]
  }),
  "pep-primary-p3-u-mc-003": scalarDraft({
    enPrompt: "There are 7 boxes with 8 pencils in each box. How many pencils are there altogether?",
    zhPrompt: "有7盒铅笔，每盒8支。一共有多少支铅笔？",
    answer: 56,
    enExplanation: "7 equal groups of 8 give 7×8=56, so there are 56 pencils altogether.",
    zhExplanation: "7盒，每盒8支，列式7×8=56，所以一共有56支铅笔。",
    zhTraditionalExplanation: "7盒，每盒8支，列式7×8=56，所以一共有56支鉛筆。",
    distractors: [15, 48, 64]
  }),
  "pep-primary-p5-l-sa-152": scalarDraft({
    enPrompt: "A cube has side length 5 cm. What is its volume?",
    zhPrompt: "一个正方体的棱长是5厘米，它的体积是多少？",
    answer: answerWithUnit(125, "立方厘米"),
    enExplanation: "Cube volume = side × side × side, so 5×5×5=125 cubic centimeters.",
    zhExplanation: "正方体体积=棱长×棱长×棱长，5×5×5=125立方厘米。",
    distractors: [
      answerWithUnit(25, "立方厘米"),
      answerWithUnit(75, "立方厘米"),
      answerWithUnit(150, "立方厘米")
    ]
  }),
  "pep-primary-p5-l-sa-153": scalarDraft({
    enPrompt: "A record shows 12 mL collected on Monday and 18 mL on Tuesday. How many more milliliters were collected on Tuesday?",
    zhPrompt: "记录表显示周一收集了12毫升，周二收集了18毫升。周二比周一多收集多少毫升？",
    answer: 6,
    acceptedAnswers: ["6毫升", "6 mL"],
    enExplanation: "Compare the two data values: 18-12=6, so Tuesday's amount is 6 mL greater.",
    zhExplanation: "比较两个数据：18-12=6，所以周二比周一多收集6毫升。"
  }),
  "pep-primary-p5-u-mc-051": {
    explanation: text(
      "Triangle area = base × height / 2 = 7×10÷2=35 square centimeters.",
      "三角形面积=底×高÷2，7×10÷2=35平方厘米。",
      "三角形面積=底×高÷2，7×10÷2=35平方厘米。"
    )
  },
  "pep-primary-p5-u-mc-052": scalarDraft({
    enPrompt: "A parallelogram has base 9 cm and height 6 cm. What is its area?",
    zhPrompt: "一个平行四边形的底是9厘米，高是6厘米。它的面积是多少？",
    answer: answerWithUnit(54, "平方厘米"),
    enExplanation: "Parallelogram area = base × height, so 9×6=54 square centimeters.",
    zhExplanation: "平行四边形面积=底×高，9×6=54平方厘米。",
    zhTraditionalExplanation: "平行四邊形面積=底×高，9×6=54平方厘米。",
    distractors: [
      answerWithUnit(27, "平方厘米"),
      answerWithUnit(30, "平方厘米"),
      answerWithUnit(108, "平方厘米")
    ]
  }),
  "pep-primary-p5-u-mc-053": scalarDraft({
    enPrompt: "A trapezoid has parallel sides 8 cm and 12 cm and height 5 cm. What is its area?",
    zhPrompt: "一个梯形的上底是8厘米，下底是12厘米，高是5厘米。它的面积是多少？",
    answer: answerWithUnit(50, "平方厘米"),
    enExplanation: "Trapezoid area = (sum of parallel sides) × height / 2, so (8+12)×5÷2=50 square centimeters.",
    zhExplanation: "梯形面积=（上底+下底）×高÷2，所以（8+12）×5÷2=50平方厘米。",
    zhTraditionalExplanation: "梯形面積=（上底+下底）×高÷2，所以（8+12）×5÷2=50平方厘米。",
    distractors: [
      answerWithUnit(40, "平方厘米"),
      answerWithUnit(60, "平方厘米"),
      answerWithUnit(100, "平方厘米")
    ]
  }),
  "pep-primary-p5-u-mc-054": {
    explanation: text(
      "Triangle area = base × height / 2 = 10×8÷2=40 square centimeters.",
      "三角形面积=底×高÷2，10×8÷2=40平方厘米。",
      "三角形面積=底×高÷2，10×8÷2=40平方厘米。"
    )
  },
  "pep-primary-p5-u-fi-061": {
    explanation: text(
      "Triangle area = base × height / 2 = 6×9÷2=27 square centimeters.",
      "三角形面积=底×高÷2，6×9÷2=27平方厘米。",
      "三角形面積=底×高÷2，6×9÷2=27平方厘米。"
    )
  },
  "pep-primary-p4-u-mc-051": scalarDraft({
    enPrompt: "A straight angle is split into two angles. One angle is 138°. What is the other angle?",
    zhPrompt: "一个平角被分成两个角，其中一个角是138°，另一个角是多少度？",
    zhTraditionalPrompt: "一個平角被分成兩個角，其中一個角是138°，另一個角是多少度？",
    answer: "42°",
    acceptedAnswers: ["42", "42 degrees", "42度"],
    enExplanation: "A straight angle is 180°, so the other angle is 180°-138°=42°.",
    zhExplanation: "平角是180°，所以另一个角是180°-138°=42°。",
    zhTraditionalExplanation: "平角是180°，所以另一個角是180°-138°=42°。",
    distractors: ["52°", "32°", "138°"]
  }),
  "pep-primary-p6-l-sa-152": scalarDraft({
    enPrompt: "Which temperature is lower, -3°C or -7°C?",
    zhPrompt: "-3°C和-7°C相比，哪个温度更低？",
    answer: "-7°C",
    acceptedAnswers: ["-7", "-7 °C", "零下7摄氏度", "-7 degrees Celsius"],
    enExplanation: "On a number line, -7 lies to the left of -3, so -7°C is the lower temperature.",
    zhExplanation: "在数轴上，-7在-3的左边，所以-7°C表示的温度更低。",
    distractors: ["-3°C", "3°C", "7°C"]
  }),
  "pep-primary-p6-l-sa-153": scalarDraft({
    enPrompt: "A review set has 80 questions, and 25% are geometry questions. How many geometry questions are there?",
    zhPrompt: "一套复习题有80道，其中25%是几何题。几何题有多少道？",
    answer: 20,
    acceptedAnswers: ["20道", "20道题", "20道几何题", "20 questions"],
    enExplanation: "25%=25/100=1/4, and 80÷4=20, so there are 20 geometry questions.",
    zhExplanation: "25%=25/100=1/4，80÷4=20，所以有20道几何题。"
  }),
  "pep-primary-p6-u-mc-055": scalarDraft({
    enPrompt: "On a seating grid, point P is at column 2, row 1. It moves 3 columns right and 4 rows back. What is its new ordered pair?",
    zhPrompt: "在座位方格图中，点P位于第2列第1行。它向右移动3列，再向后移动4行。新位置的数对是多少？",
    zhTraditionalPrompt: "在座位方格圖中，點P位於第2列第1行。它向右移動3列，再向後移動4行。新位置的數對是多少？",
    answer: "(5, 5)",
    enExplanation: "Add 3 to the column and 4 to the row: (2+3,1+4)=(5,5).",
    zhExplanation: "列数加3，行数加4：（2+3，1+4）=（5，5）。",
    distractors: ["(5, 4)", "(4, 5)", "(3, 5)"]
  }),
  "pep-primary-p6-u-mc-053": scalarDraft({
    enPrompt: "A pie chart shows that 25% of 120 students walk to school. How many students walk to school?",
    zhPrompt: "扇形统计图显示，120名学生中有25%步行上学。步行上学的有多少人？",
    answer: 30,
    enExplanation: "25%=1/4, and 120÷4=30, so 30 students walk to school.",
    zhExplanation: "25%=1/4，120÷4=30，所以有30人步行上学。",
    distractors: [25, 40, 90]
  }),
  "pep-primary-p1-u-mc-001": scalarDraft({
    enPrompt: "Lin has 14 colored pencils and gives away 11. How many colored pencils remain?",
    zhPrompt: "小林有14支彩笔，送给同学11支，还剩多少支？",
    answer: 3,
    enExplanation: "Subtract the number given away: 14-11=3.",
    zhExplanation: "用原有数量减去送出的数量：14-11=3，所以还剩3支。",
    distractors: [2, 4, 11]
  }),
  "pep-primary-p1-l-fi-101": scalarDraft({
    enPrompt: "There are 36 storybooks on one shelf and 24 on another. How many storybooks are there altogether?",
    zhPrompt: "一个书架上有36本故事书，另一个书架上有24本。一共有多少本故事书？",
    answer: 60,
    acceptedAnswers: ["60本", "60本书", "60 books"],
    enExplanation: "Add the two groups: 36+24=60.",
    zhExplanation: "把两部分相加：36+24=60，所以一共有60本。"
  }),
  "pep-primary-p1-l-fi-102": scalarDraft({
    enPrompt: "A box has 72 counters. After 15 are removed, how many remain?",
    zhPrompt: "盒子里有72个小圆片，取出15个后，还剩多少个？",
    answer: 57,
    acceptedAnswers: ["57个", "57个小圆片", "57 counters"],
    enExplanation: "Subtract the removed counters: 72-15=57.",
    zhExplanation: "用原有数量减去取出的数量：72-15=57。"
  }),
  "pep-primary-p1-l-fi-103": scalarDraft({
    enPrompt: "The class collects 48 cards in the morning and 27 in the afternoon. How many cards are collected altogether?",
    zhPrompt: "班级上午收集了48张卡片，下午收集了27张。一共收集了多少张？",
    answer: 75,
    acceptedAnswers: ["75张", "75张卡片", "75 cards"],
    enExplanation: "Add the morning and afternoon counts: 48+27=75.",
    zhExplanation: "把上午和下午的数量相加：48+27=75。"
  }),
  "pep-primary-p1-l-fi-104": scalarDraft({
    enPrompt: "There are 58 balloons. Seven burst. How many balloons remain?",
    zhPrompt: "原来有58个气球，破了7个，还剩多少个？",
    answer: 51,
    acceptedAnswers: ["51个", "51个气球", "51 balloons"],
    enExplanation: "Subtract the seven balloons: 58-7=51.",
    zhExplanation: "用58减去7：58-7=51。"
  }),
  "pep-primary-p1-l-fi-105": scalarDraft({
    enPrompt: "A reading corner has 64 books and receives 12 more. How many books does it have now?",
    zhPrompt: "阅读角原来有64本书，又增加12本。现在有多少本书？",
    answer: 76,
    acceptedAnswers: ["76本", "76本书", "76 books"],
    enExplanation: "Add the new books: 64+12=76.",
    zhExplanation: "用原有数量加上新增加的数量：64+12=76。"
  }),
  "pep-primary-p1-l-fi-151": {
    acceptedAnswers: ["7张", "7 cards"]
  },
  "pep-primary-p1-l-fi-155": {
    acceptedAnswers: ["9张", "9 cards"]
  },
  "pep-primary-p1-l-sa-191": scalarDraft({
    enPrompt: "An records three groups of blocks: Group A has 4, Group B has 11, and Group C has 7. How many blocks are in the largest group?",
    zhPrompt: "安安记录了三类积木：甲类4个、乙类11个、丙类7个。数量最多的一类有多少个？",
    answer: 11,
    acceptedAnswers: ["11个", "11 blocks"],
    enExplanation: "Compare 4, 11, and 7. The largest count is 11, so the largest group has 11 blocks.",
    zhExplanation: "比较4、11和7，最大的数量是11，所以数量最多的一类有11个积木。"
  }),
  "pep-primary-p2-l-fi-101": scalarDraft({
    enPrompt: "Make groups of 6 from 24 counters. How many groups can be made?",
    zhPrompt: "把24个小圆片每6个分成一组，可以分成几组？",
    answer: 4,
    acceptedAnswers: ["4组", "4 groups"],
    enExplanation: "24÷6=4, so there are 4 groups.",
    zhExplanation: "24÷6=4，所以可以分成4组。"
  }),
  "pep-primary-p2-l-fi-102": scalarDraft({
    enPrompt: "Put 36 colored pencils into boxes with 4 pencils in each box. How many boxes are needed?",
    zhPrompt: "把36支彩笔装盒，每盒4支，需要几个盒子？",
    answer: 9,
    acceptedAnswers: ["9个", "9个盒子", "9 boxes"],
    enExplanation: "36÷4=9, so 9 boxes are needed.",
    zhExplanation: "36÷4=9，所以需要9个盒子。"
  }),
  "pep-primary-p2-l-fi-103": scalarDraft({
    enPrompt: "Put 47 cards into groups of 7. What are the quotient and remainder?",
    zhPrompt: "把47张卡片按每组7张分组，商和余数是多少？",
    answer: "6余5",
    acceptedAnswers: [
      "6余5",
      "商6余5",
      "商是6，余数是5",
      "6 remainder 5",
      "quotient 6 remainder 5",
      "quotient 6, remainder 5"
    ],
    enExplanation: "47=7×6+5, so the quotient is 6 and the remainder is 5.",
    zhExplanation: "47=7×6+5，所以商是6，余数是5。",
    zhTraditionalExplanation: "47=7×6+5，所以商是6，余數是5。"
  }),
  "pep-primary-p2-l-fi-104": scalarDraft({
    enPrompt: "Share 56 stickers equally among 7 students. How many stickers does each student get?",
    zhPrompt: "把56张贴纸平均分给7名同学，每名同学分到多少张？",
    answer: 8,
    acceptedAnswers: ["8张", "8张贴纸", "8 stickers"],
    enExplanation: "56÷7=8, so each student gets 8 stickers.",
    zhExplanation: "56÷7=8，所以每名同学分到8张。"
  }),
  "pep-primary-p2-l-fi-105": scalarDraft({
    enPrompt: "Put 7 balls into pairs. How many pairs can be made, and how many balls remain?",
    zhPrompt: "把7个球每2个分成一组，可以分成几组，还剩几个？",
    answer: "3余1",
    acceptedAnswers: [
      "3组，剩1个",
      "3组，还剩1个",
      "3組，剩1個",
      "3組，還剩1個",
      "3 groups, 1 left",
      "3 pairs, 1 ball remaining"
    ],
    enExplanation: "7=2×3+1, so there are 3 groups with 1 ball remaining.",
    zhExplanation: "7=2×3+1，所以可以分成3组，还剩1个。",
    zhTraditionalExplanation: "7=2×3+1，所以可以分成3組，還剩1個。"
  }),
  "pep-primary-p3-u-mc-051": scalarDraft({
    enPrompt: "3 meters equals how many centimeters?",
    zhPrompt: "3米等于多少厘米？",
    answer: answerWithUnit(300, "厘米"),
    enExplanation: "1 meter equals 100 centimeters, so 3 meters equals 3×100=300 centimeters.",
    zhExplanation: "1米=100厘米，所以3米=3×100=300厘米。",
    zhTraditionalExplanation: "1米=100厘米，所以3米=3×100=300厘米。",
    distractors: [answerWithUnit(30, "厘米"), answerWithUnit(103, "厘米"), answerWithUnit(3000, "厘米")]
  }),
  "pep-primary-p3-u-mc-052": scalarDraft({
    enPrompt: "What type of angle is each corner of a square sheet of paper?",
    zhPrompt: "一张正方形纸的每个角都是什么角？",
    answer: "right angle",
    enExplanation: "Each corner of a square is a right angle.",
    zhExplanation: "正方形的四个角都是直角。",
    distractors: ["acute angle", "obtuse angle", "straight angle"]
  }),
  "pep-primary-p3-u-mc-053": scalarDraft({
    enPrompt: "How many days are in a leap year?",
    zhPrompt: "闰年全年有多少天？",
    answer: 366,
    enExplanation: "A leap year has 29 days in February, so it has 366 days in all.",
    zhExplanation: "闰年的2月有29天，全年一共有366天。",
    distractors: [365, 364, 360]
  }),
  "pep-primary-p3-u-mc-054": scalarDraft({
    enPrompt: "A lesson starts at 10:35 and ends at 11:20. How many minutes does it last?",
    zhPrompt: "一节课10:35开始，11:20结束，持续了多少分钟？",
    answer: answerWithUnit(45, "分钟"),
    enExplanation: "Twenty-five minutes elapse from 10:35 to 11:00, and another 20 minutes elapse from 11:00 to 11:20. Altogether, 25 + 20 = 45 minutes.",
    zhExplanation: "10:35到11:00经过25分钟，11:00到11:20经过20分钟，一共25+20=45分钟。",
    distractors: [answerWithUnit(35, "分钟"), answerWithUnit(55, "分钟"), answerWithUnit(85, "分钟")]
  }),
  "pep-primary-p3-u-fi-076": scalarDraft({
    enPrompt: "A ribbon is 2 m 35 cm long. How many centimeters long is it?",
    zhPrompt: "一条彩带长2米35厘米，合多少厘米？",
    answer: answerWithUnit(235, "厘米"),
    enExplanation: "2 meters equals 200 centimeters, and 200+35=235 centimeters.",
    zhExplanation: "2米=200厘米，200+35=235厘米。"
  }),
  "pep-primary-p3-l-fi-101": scalarDraft({
    enPrompt: "A rectangle is 8 cm long and 6 cm wide. What is its area?",
    zhPrompt: "一个长方形长8厘米、宽6厘米，面积是多少？",
    answer: answerWithUnit(48, "平方厘米"),
    enExplanation: "Rectangle area = length × width, so 8×6=48 square centimeters.",
    zhExplanation: "长方形面积=长×宽，8×6=48平方厘米。",
    zhTraditionalExplanation: "長方形面積=長×寬，8×6=48平方厘米。"
  }),
  "pep-primary-p3-l-fi-102": scalarDraft({
    enPrompt: "Calculate 2.6+1.7.",
    zhPrompt: "计算：2.6+1.7=？",
    answer: "4.3",
    enExplanation: "Line up the decimal points: 2.6+1.7=4.3.",
    zhExplanation: "把小数点对齐计算：2.6+1.7=4.3。"
  }),
  "pep-primary-p3-l-fi-103": scalarDraft({
    enPrompt: "Which number is greater, 3.08 or 3.8?",
    zhPrompt: "3.08和3.8相比，哪个数大？",
    answer: "3.8",
    acceptedAnswers: ["3.8大", "3.8較大", "3.8较大", "3.8 is greater"],
    enExplanation: "Write 3.8 as 3.80. Since 3.80>3.08, 3.8 is greater.",
    zhExplanation: "把3.8写成3.80，3.80>3.08，所以3.8大。"
  }),
  "pep-primary-p3-l-fi-104": scalarDraft({
    enPrompt: "Calculate 7.5-2.8.",
    zhPrompt: "计算：7.5-2.8=？",
    answer: "4.7",
    enExplanation: "Line up the decimal points: 7.5-2.8=4.7.",
    zhExplanation: "把小数点对齐计算：7.5-2.8=4.7。"
  }),
  "pep-primary-p3-l-fi-105": scalarDraft({
    enPrompt: "A square has side length 9 cm. What is its area?",
    zhPrompt: "一个正方形的边长是9厘米，面积是多少？",
    answer: answerWithUnit(81, "平方厘米"),
    enExplanation: "Square area = side × side, so 9×9=81 square centimeters.",
    zhExplanation: "正方形面积=边长×边长，9×9=81平方厘米。",
    zhTraditionalExplanation: "正方形面積=邊長×邊長，9×9=81平方厘米。"
  }),
  "pep-primary-p3-l-sa-151": scalarDraft({
    enPrompt: "A table shows 12 students chose basketball and 8 chose football. How many more chose basketball?",
    zhPrompt: "统计表显示12名同学选择篮球，8名同学选择足球。选择篮球的比选择足球的多多少人？",
    answer: 4,
    acceptedAnswers: ["4人", "4名", "4 students"],
    enExplanation: "Compare the two categories: 12-8=4.",
    zhExplanation: "比较两个项目：12-8=4，所以多4人。"
  }),
  "pep-primary-p3-l-sa-152": scalarDraft({
    enPrompt: "A table shows 7 red books, 9 blue books, and 6 green books. How many books are recorded altogether?",
    zhPrompt: "统计表记录红色书7本、蓝色书9本、绿色书6本。一共记录了多少本？",
    answer: 22,
    acceptedAnswers: ["22本", "22本书", "22 books"],
    enExplanation: "Add all three categories: 7+9+6=22.",
    zhExplanation: "把三个项目相加：7+9+6=22。"
  }),
  "pep-primary-p3-l-sa-153": scalarDraft({
    enPrompt: "A survey records 15 votes for apples, 11 for pears, and 9 for oranges. What is the smallest count?",
    zhPrompt: "调查记录苹果15票、梨11票、橙子9票。最少的票数是多少？",
    answer: 9,
    acceptedAnswers: ["9票", "9 votes"],
    enExplanation: "Compare 15, 11, and 9. The smallest count is 9.",
    zhExplanation: "比较15、11和9，最小的票数是9。"
  }),
  "pep-primary-p3-l-sa-154": scalarDraft({
    enPrompt: "A chart shows 15 sunny days and 11 cloudy days. How many more sunny days were recorded?",
    zhPrompt: "统计图记录15个晴天和11个阴天。晴天比阴天多多少天？",
    answer: 4,
    acceptedAnswers: ["4天", "4 days"],
    enExplanation: "15-11=4, so there were 4 more sunny days.",
    zhExplanation: "15-11=4，所以晴天比阴天多4天。"
  }),
  "pep-primary-p3-l-sa-155": scalarDraft({
    enPrompt: "A class table records 14 students in Group 1, 13 in Group 2, and 12 in Group 3. How many students are recorded?",
    zhPrompt: "班级统计表记录第一组14人、第二组13人、第三组12人。一共记录了多少人？",
    answer: 39,
    acceptedAnswers: ["39人", "39名", "39 students"],
    enExplanation: "Add the group counts: 14+13+12=39.",
    zhExplanation: "把各组人数相加：14+13+12=39。"
  }),
  "pep-primary-p4-u-mc-001": scalarDraft({
    enPrompt: "A school orders 24 boxes of exercise books, with 128 books in each box. How many exercise books are ordered altogether?",
    zhPrompt: "学校订购了24箱练习本，每箱128本。一共订购了多少本练习本？",
    answer: 3072,
    enExplanation: "Use partial products: 128×24=128×20+128×4=2560+512=3072.",
    zhExplanation: "把24分成20和4：128×24=128×20+128×4=2560+512=3072。",
    distractors: [2560, 512, 3052]
  }),
  "pep-primary-p4-u-mc-002": scalarDraft({
    enPrompt: "An auditorium has 15 rows with 236 seats in each row. How many seats are there altogether?",
    zhPrompt: "礼堂有15排座位，每排236个。一共有多少个座位？",
    answer: 3540,
    enExplanation: "Use the distributive property: 236×15=236×10+236×5=2360+1180=3540.",
    zhExplanation: "把15分成10和5：236×15=236×10+236×5=2360+1180=3540。",
    distractors: [1180, 2360, 3500]
  }),
  "pep-primary-p4-u-mc-003": scalarDraft({
    enPrompt: "A factory packs 405 pencils in each carton. How many pencils are in 32 cartons?",
    zhPrompt: "工厂每箱装405支铅笔，32箱一共有多少支铅笔？",
    answer: 12960,
    enExplanation: "The zero in 405 keeps its place value: 405×32=405×30+405×2=12150+810=12960.",
    zhExplanation: "注意405中0的占位作用：405×32=405×30+405×2=12150+810=12960。",
    distractors: [1296, 12150, 13365]
  }),
  "pep-primary-p4-u-mc-004": scalarDraft({
    enPrompt: "Which numeral represents four million five thousand six?",
    zhPrompt: "四百万五千零六写作哪个数？",
    answer: "4,005,006",
    enExplanation: "Four million is 4,000,000, five thousand is 5,000, and six is 6; together they form 4,005,006.",
    zhExplanation: "四百万是4,000,000，五千是5,000，再加6，写作4,005,006。",
    distractors: ["4,050,006", "4,005,060", "4,500,006"]
  }),
  "pep-primary-p4-u-mc-005": scalarDraft({
    enPrompt: "Round 7,856,432 to the nearest ten thousand.",
    zhPrompt: "把7,856,432四舍五入到万位，近似数是多少？",
    answer: "7,860,000",
    enExplanation: "The thousands digit is 6, so round the ten-thousands digit up from 5 to 6: 7,856,432≈7,860,000.",
    zhExplanation: "千位上的数字是6，应向万位进1，所以7,856,432≈7,860,000。",
    distractors: ["7,850,000", "7,856,000", "7,900,000"]
  }),
  "pep-primary-p4-u-mc-052": scalarDraft({
    enPrompt: "How many degrees are in a full turn?",
    zhPrompt: "一周角是多少度？",
    answer: "360°",
    enExplanation: "One full turn is a full angle of 360 degrees.",
    zhExplanation: "转一整周形成周角，周角是360°。",
    distractors: ["90°", "180°", "270°"]
  }),
  "pep-primary-p4-u-mc-053": scalarDraft({
    enPrompt: "Which type of angle measures 135°?",
    zhPrompt: "135°的角是什么角？",
    answer: "obtuse angle",
    enExplanation: "135° is greater than 90° and less than 180°, so it is an obtuse angle.",
    zhExplanation: "135°大于90°且小于180°，所以是钝角。",
    distractors: ["acute angle", "right angle", "straight angle"]
  }),
  "pep-primary-p4-u-mc-054": scalarDraft({
    enPrompt: "Perpendicular lines meet to form what angle measure?",
    zhPrompt: "两条直线互相垂直时，相交形成的角是多少度？",
    answer: "90°",
    enExplanation: "Perpendicular lines meet at right angles, and a right angle measures 90 degrees.",
    zhExplanation: "互相垂直的两条直线相交成直角，直角是90°。",
    distractors: ["45°", "120°", "180°"]
  }),
  "pep-primary-p4-u-fi-076": scalarDraft({
    enPrompt: "Three right angles together measure how many degrees?",
    zhPrompt: "3个直角合起来是多少度？",
    answer: "270°",
    acceptedAnswers: ["270度"],
    enExplanation: "Each right angle is 90°, so 3×90°=270°.",
    zhExplanation: "每个直角是90°，3×90°=270°。",
    zhTraditionalExplanation: "每個直角是90°，3×90°=270°。"
  }),
  "pep-primary-p4-l-fi-101": {
    acceptedAnswers: ["4.2米", "4.2 m"]
  },
  "pep-primary-p4-l-fi-102": scalarDraft({
    enPrompt: "Calculate 5.8-2.6.",
    zhPrompt: "计算：5.8-2.6=？",
    answer: "3.2",
    enExplanation: "Line up the decimal points: 5.8-2.6=3.2.",
    zhExplanation: "把小数点对齐计算：5.8-2.6=3.2。"
  }),
  "pep-primary-p4-l-fi-103": scalarDraft({
    enPrompt: "Find the average of 6, 8, and 10.",
    zhPrompt: "求6、8、10这三个数的平均数。",
    answer: 8,
    enExplanation: "(6+8+10)÷3=24÷3=8.",
    zhExplanation: "(6+8+10)÷3=24÷3=8。"
  }),
  "pep-primary-p4-l-fi-104": scalarDraft({
    enPrompt: "Calculate the difference 2.50-2.5.",
    zhPrompt: "计算2.50-2.5的差。",
    answer: 0,
    enExplanation: "A zero at the end of a decimal does not change its value, so 2.50=2.5 and the difference is 0.",
    zhExplanation: "小数末尾添0不改变大小，2.50=2.5，所以差是0。"
  }),
  "pep-primary-p4-l-fi-105": scalarDraft({
    enPrompt: "Calculate 10-3.75.",
    zhPrompt: "计算：10-3.75=？",
    answer: "6.25",
    enExplanation: "Write 10 as 10.00 and subtract: 10.00-3.75=6.25.",
    zhExplanation: "把10写成10.00，再计算：10.00-3.75=6.25。"
  }),
  "pep-primary-p4-l-sa-151": scalarDraft({
    enPrompt: "Lele puts a border around a rectangle 9 cm long and 7 cm wide. How long is the border?",
    zhPrompt: "乐乐给长9厘米、宽7厘米的长方形卡片贴边框，边框长多少厘米？",
    answer: answerWithUnit(32, "厘米"),
    enExplanation: "Rectangle perimeter = (length + width) × 2, so (9+7)×2=32 cm.",
    zhExplanation: "长方形周长=（长+宽）×2，（9+7）×2=32厘米。"
  }),
  "pep-primary-p4-l-sa-152": scalarDraft({
    enPrompt: "A rectangle is 11 cm long and 3 cm wide. What is its area?",
    zhPrompt: "一个长方形长11厘米、宽3厘米，面积是多少？",
    answer: answerWithUnit(33, "平方厘米"),
    enExplanation: "Rectangle area = length × width, so 11×3=33 square centimeters.",
    zhExplanation: "长方形面积=长×宽，11×3=33平方厘米。"
  }),
  "pep-primary-p4-l-sa-153": scalarDraft({
    enPrompt: "A square has side length 6 cm. What is its area?",
    zhPrompt: "一个正方形的边长是6厘米，面积是多少？",
    answer: answerWithUnit(36, "平方厘米"),
    enExplanation: "Square area = side × side, so 6×6=36 square centimeters.",
    zhExplanation: "正方形面积=边长×边长，6×6=36平方厘米。"
  }),
  "pep-primary-p4-l-sa-154": scalarDraft({
    enPrompt: "Two lines are perpendicular. What is the measure of each angle where they meet?",
    zhPrompt: "两条直线互相垂直，它们相交形成的每个角是多少度？",
    answer: "90°",
    acceptedAnswers: ["90度"],
    enExplanation: "Perpendicular lines form four right angles, each measuring 90 degrees.",
    zhExplanation: "两条互相垂直的直线相交形成4个直角，每个都是90°。"
  }),
  "pep-primary-p4-l-sa-155": scalarDraft({
    enPrompt: "The vertices of rectangle ABCD are named consecutively around the rectangle. Which side is parallel to AB?",
    zhPrompt: "长方形ABCD的四个顶点按顺序命名，哪条边与AB平行？",
    answer: "CD",
    acceptedAnswers: ["DC"],
    enExplanation: "Opposite sides of a rectangle are parallel, so AB is parallel to CD.",
    zhExplanation: "长方形的对边互相平行，所以AB与CD平行。"
  }),
  "pep-primary-p5-u-mc-002": scalarDraft({
    enPrompt: "Calculate 2.4 × 3.",
    zhPrompt: "计算：2.4×3=？",
    zhTraditionalPrompt: "計算：2.4×3=？",
    answer: "7.2",
    enExplanation: "24×3=72, and 2.4 has one decimal place, so 2.4×3=7.2.",
    zhExplanation: "先算24×3=72，再点一位小数，所以2.4×3=7.2。",
    zhTraditionalExplanation: "先算24×3=72，再點一位小數，所以2.4×3=7.2。",
    distractors: ["0.72", "5.4", "72"]
  }),
  "pep-primary-p5-u-mc-003": scalarDraft({
    enPrompt: "Calculate 8.4÷4.",
    zhPrompt: "计算：8.4÷4=？",
    answer: "2.1",
    enExplanation: "84 tenths divided by 4 is 21 tenths, so 8.4÷4=2.1.",
    zhExplanation: "84个十分之一除以4等于21个十分之一，所以8.4÷4=2.1。",
    distractors: ["0.21", "2", "21"]
  }),
  "pep-primary-p5-l-fi-101": scalarDraft({
    enPrompt: "List all positive factors of 18 from least to greatest.",
    zhPrompt: "按从小到大的顺序写出18的所有正因数。",
    answer: "1, 2, 3, 6, 9, 18",
    acceptedAnswers: ["1、2、3、6、9、18", "1 2 3 6 9 18"],
    enExplanation: "The factor pairs are 1×18, 2×9, and 3×6, so the positive factors are 1, 2, 3, 6, 9, and 18.",
    zhExplanation: "因数可以成对找：1×18、2×9、3×6，所以正因数是1、2、3、6、9、18。",
    zhTraditionalExplanation: "因數可以成對找：1×18、2×9、3×6，所以正因數是1、2、3、6、9、18。"
  }),
  "pep-primary-p5-l-fi-102": scalarDraft({
    enPrompt: "What is the greatest common factor of 18 and 24?",
    zhPrompt: "18和24的最大公因数是多少？",
    answer: 6,
    enExplanation: "The common factors are 1, 2, 3, and 6; the greatest is 6.",
    zhExplanation: "18和24的公因数有1、2、3、6，其中最大的是6。"
  }),
  "pep-primary-p5-l-fi-103": scalarDraft({
    enPrompt: "What is the least common multiple of 6 and 8?",
    zhPrompt: "6和8的最小公倍数是多少？",
    answer: 24,
    enExplanation: "24 is the first positive number that is a multiple of both 6 and 8.",
    zhExplanation: "24是6和8的公倍数中最小的正数，所以最小公倍数是24。"
  }),
  "pep-primary-p5-l-fi-104": scalarDraft({
    enPrompt: "Calculate 5/6-1/4.",
    zhPrompt: "计算：5/6-1/4=？",
    answer: "7/12",
    enExplanation: "Use denominator 12: 5/6=10/12 and 1/4=3/12, so 10/12-3/12=7/12.",
    zhExplanation: "通分得5/6=10/12，1/4=3/12，所以10/12-3/12=7/12。"
  }),
  "pep-primary-p5-l-fi-105": scalarDraft({
    enPrompt: "Calculate 1/9+1/9.",
    zhPrompt: "计算：1/9+1/9=？",
    answer: "2/9",
    enExplanation: "The denominators are the same, so add the numerators: 1/9+1/9=2/9.",
    zhExplanation: "分母相同，分母不变、分子相加：1/9+1/9=2/9。"
  }),
  "pep-primary-p6-u-mc-001": scalarDraft({
    enPrompt: "Write 3/5 as a percentage.",
    zhPrompt: "把3/5化成百分数。",
    answer: "60%",
    enExplanation: "3÷5=0.6, and 0.6=60%.",
    zhExplanation: "3÷5=0.6，0.6=60%。",
    distractors: ["3%", "30%", "80%"]
  }),
  "pep-primary-p6-u-mc-002": scalarDraft({
    enPrompt: "Write 0.35 as a percentage.",
    zhPrompt: "把0.35化成百分数。",
    answer: "35%",
    enExplanation: "Multiply the decimal by 100%, so 0.35=35%.",
    zhExplanation: "把小数乘100%，0.35=35%。",
    distractors: ["0.35%", "3.5%", "350%"]
  }),
  "pep-primary-p6-u-mc-003": scalarDraft({
    enPrompt: "What is 25% of 80?",
    zhPrompt: "80的25%是多少？",
    answer: 20,
    enExplanation: "25%=1/4, and 80÷4=20.",
    zhExplanation: "25%=1/4，80÷4=20。",
    distractors: [4, 25, 60]
  }),
  "pep-primary-p6-u-mc-004": scalarDraft({
    enPrompt: "A 120-yuan book is sold at a 20% discount. How many yuan does the customer pay?",
    zhPrompt: "一本书原价120元，按八折出售。顾客应付多少元？",
    answer: 96,
    acceptedAnswers: ["96元", "96 yuan"],
    enExplanation: "A 20% discount means paying 80% of the price: 120×80%=96.",
    zhExplanation: "八折表示按原价的80%付款，120×80%=96，所以应付96元。",
    zhTraditionalExplanation: "八折表示按原價的80%付款，120×80%=96，所以應付96元。",
    distractors: [24, 100, 108]
  }),
  "pep-primary-p6-u-mc-005": scalarDraft({
    enPrompt: "A survey has 200 responses, and 45% choose option A. How many responses choose option A?",
    zhPrompt: "一项调查有200份答卷，其中45%选择A项。选择A项的有多少份？",
    answer: 90,
    enExplanation: "200×45%=90.",
    zhExplanation: "200×45%=90，所以有90份。",
    zhTraditionalExplanation: "200×45%=90，所以有90份。",
    distractors: [45, 80, 110]
  }),
  "pep-primary-p6-u-mc-051": scalarDraft({
    enPrompt: "A seat is in column 2, row 3. What ordered pair represents the seat?",
    zhPrompt: "一个座位在第2列第3行，用数对怎样表示？",
    answer: "(2, 3)",
    enExplanation: "Write the column first and the row second, so the ordered pair is (2,3).",
    zhExplanation: "数对先写列、再写行，所以是（2，3）。",
    distractors: ["(3, 2)", "(2, 2)", "(3, 3)"]
  }),
  "pep-primary-p6-u-mc-054": scalarDraft({
    enPrompt: "A marker is in column 4, row 2. What ordered pair represents its position?",
    zhPrompt: "一个标记在第4列第2行，用数对怎样表示？",
    answer: "(4, 2)",
    enExplanation: "Write the column first and the row second, so the ordered pair is (4,2).",
    zhExplanation: "数对先写列、再写行，所以是（4，2）。",
    distractors: ["(2, 4)", "(4, 1)", "(3, 2)"]
  }),
  "pep-primary-p6-u-fi-061": scalarDraft({
    enPrompt: "A point is in column 2, row 5. Write its ordered pair.",
    zhPrompt: "一个点在第2列第5行，写出它的数对。",
    answer: "(2, 5)",
    acceptedAnswers: ["(2,5)", "(2，5)", "（2，5）"],
    enExplanation: "Write the column first and the row second: (2,5).",
    zhExplanation: "数对先写列、再写行，所以是（2，5）。"
  }),
  "pep-primary-p6-l-fi-102": scalarDraft({
    enPrompt: "A map uses a scale of 1:1000. A road measures 3 cm on the map. What is its actual length in meters?",
    zhPrompt: "一幅地图的比例尺是1:1000，一条道路在图上长3厘米。实际长多少米？",
    answer: answerWithUnit(30, "米"),
    enExplanation: "3×1000=3000 cm, and 3000 cm=30 m.",
    zhExplanation: "3×1000=3000厘米，3000厘米=30米。"
  }),
  "pep-primary-p6-l-fi-103": scalarDraft({
    enPrompt: "Five notebooks cost 20 yuan at the same unit price. How many yuan do eight notebooks cost?",
    zhPrompt: "5本同样的练习本共20元。按同样的单价，8本需要多少元？",
    answer: 32,
    acceptedAnswers: ["32元", "32 yuan"],
    enExplanation: "One notebook costs 20÷5=4 yuan, so eight cost 8×4=32 yuan.",
    zhExplanation: "每本20÷5=4元，8本需要8×4=32元。"
  }),
  "pep-primary-p6-l-fi-104": scalarDraft({
    enPrompt: "Food is enough for 6 people for 8 days. At the same daily amount per person, how many days will it last for 12 people?",
    zhPrompt: "一批食物够6人吃8天。每人每天的用量相同，如果有12人，可以吃多少天？",
    answer: 4,
    acceptedAnswers: ["4天", "4 days"],
    enExplanation: "The total is 6×8=48 person-days. For 12 people, 48÷12=4 days.",
    zhExplanation: "总量是6×8=48人天，12人可以吃48÷12=4天。"
  }),
  "pep-primary-p6-l-fi-105": scalarDraft({
    enPrompt: "The ratio 2:3 is equivalent to 8:____. What number belongs in the blank?",
    zhPrompt: "比2:3与8:____相等，空格里应填多少？",
    answer: 12,
    enExplanation: "The first term is multiplied by 4, so multiply the second term by 4: 3×4=12.",
    zhExplanation: "前项乘4，后项也要乘4：3×4=12。"
  })
};

function applyPrimaryManualContentQaOverride(id: string, draft: Draft): Draft {
  const override = mainlandPepPrimaryManualContentQaOverrides[id];
  if (!override) return draft;

  const answerChanged = override.answer !== undefined && override.answer !== draft.answer;
  return {
    ...draft,
    ...override,
    ...(answerChanged && override.acceptedAnswers === undefined ? { acceptedAnswers: undefined } : {})
  };
}

const replacementNames = ["小林", "小雅", "明明", "乐乐", "小辰", "婷婷", "浩浩", "安安", "小雨", "晨晨", "佳佳", "文文"];
const replacementPlaces = ["数学角", "阅读区", "科学桌", "美术柜", "运动场", "图书角", "种植区", "手工桌"];
const replacementObjects = ["贴纸", "彩笔", "卡片", "积木", "练习本", "奖章", "花盆", "书签", "纸条", "模型"];

function replacementContext(seed: number) {
  return {
    name: replacementNames[seed % replacementNames.length],
    place: replacementPlaces[(seed * 3) % replacementPlaces.length],
    object: replacementObjects[(seed * 7) % replacementObjects.length]
  };
}

function draftForFamily(family: MainlandPepPrimaryQuestionFamily, type: PrimaryQuestionType, index: number): Draft {
  const n = index + 1;

  switch (family) {
    case "number-sense": {
      const total = 8 + (n % 12);
      const part = 1 + ((n * 3) % (total - 1));
      const answer = total - part;
      return scalarDraft({
        enPrompt: `A number bond has total ${total} and one part ${part}. What is the other part?`,
        zhPrompt: `一个数的组成中，总数是${total}，其中一部分是${part}，另一部分是多少？`,
        answer,
        enExplanation: `${total}-${part}=${answer}.`,
        zhExplanation: `用总数减去已知部分：${total}-${part}=${answer}。`,
        distractors: [answer + 1, Math.max(0, answer - 1), part]
      });
    }
    case "geometry-position": {
      const shapes = ["长方体", "正方体", "圆柱", "球"];
      const answer = shapes[n % shapes.length];
      return scalarDraft({
        enPrompt: `Which solid has the described feature: ${answer === "球" ? "it can roll in every direction" : answer === "圆柱" ? "it has two circular faces" : answer === "正方体" ? "all faces are squares" : "it has six faces, and not every face is a square"}?`,
        zhPrompt: `下面描述的是哪种立体图形：${answer === "球" ? "能向各个方向滚动" : answer === "圆柱" ? "有两个圆形的面" : answer === "正方体" ? "每个面都是正方形" : "有六个面，而且不是每个面都是正方形"}？`,
        answer,
        enExplanation: `The described feature matches ${answer}.`,
        zhExplanation: `这个特征对应${answer}。`,
        distractors: shapes.filter((shape) => shape !== answer)
      });
    }
    case "addition-subtraction": {
      const start = 30 + ((n * 7) % 50);
      const change = 4 + ((n * 5) % 18);
      const subtract = n % 2 === 0;
      const answer = subtract ? start - change : start + change;
      return scalarDraft({
        enPrompt: `${start} ${subtract ? "minus" : "plus"} ${change} equals what?`,
        zhPrompt: `计算：${start}${subtract ? "-" : "+"}${change}=？`,
        answer,
        enExplanation: `Compute directly: ${start}${subtract ? "-" : "+"}${change}=${answer}.`,
        zhExplanation: `按位计算可得：${start}${subtract ? "-" : "+"}${change}=${answer}。`,
        distractors: [answer + 10, answer - 10, start]
      });
    }
    case "time-data": {
      const counts = [3 + (n % 5), 5 + ((n * 2) % 6), 4 + ((n * 3) % 5)];
      const answer = Math.max(...counts);
      const maximumCategoryCount = counts.filter((count) => count === answer).length;
      return scalarDraft({
        enPrompt: `A class counted ${counts[0]} red cards, ${counts[1]} blue cards, and ${counts[2]} green cards. What is the largest of these three counts?`,
        zhPrompt: `班级统计红卡${counts[0]}张、蓝卡${counts[1]}张、绿卡${counts[2]}张。三个数量中，最大的数量是多少张？`,
        answer,
        enExplanation: maximumCategoryCount > 1
          ? `Compare the three counts. ${maximumCategoryCount} categories tie for the greatest count, and that count is ${answer}.`
          : `Compare the three counts. The greatest count is ${answer}.`,
        zhExplanation: maximumCategoryCount > 1
          ? `比较三个数量，有${maximumCategoryCount}个类别并列最多，最大的数量是${answer}张。`
          : `比较三个数量，最大的数量是${answer}张。`,
        distractors: counts.filter((count) => count !== answer),
        acceptedAnswers: [`${answer}张`, `${answer} cards`]
      });
    }
    case "multiplication": {
      const a = 2 + (n % 8);
      const b = 2 + ((n * 3) % 8);
      const answer = a * b;
      return scalarDraft({
        enPrompt: `There are ${a} equal groups with ${b} items in each group. How many items are there?`,
        zhPrompt: `有${a}组，每组${b}个，一共有多少个？`,
        answer,
        enExplanation: `${a} groups of ${b} means ${a}×${b}=${answer}.`,
        zhExplanation: `${a}个${b}相加，可以写成${a}×${b}=${answer}。`,
        distractors: [a + b, answer + a, answer - b]
      });
    }
    case "measurement-geometry": {
      const cm = 20 + ((n * 4) % 70);
      const extra = 5 + (n % 12);
      const answer = cm + extra;
      return scalarDraft({
        enPrompt: `A ribbon is ${cm} cm long. Another ribbon is ${extra} cm longer. How long is the second ribbon?`,
        zhPrompt: `一根彩带长${cm}厘米，另一根比它长${extra}厘米。另一根长多少厘米？`,
        answer: answerWithUnit(answer, "厘米"),
        enExplanation: `${cm}+${extra}=${answer}, so the second ribbon is ${answer} cm.`,
        zhExplanation: `${cm}+${extra}=${answer}，所以另一根长${answer}厘米。`,
        distractors: [answerWithUnit(answer - extra, "厘米"), answerWithUnit(answer + 1, "厘米"), answerWithUnit(Math.max(0, cm - extra), "厘米")]
      });
    }
    case "division-remainder": {
      const divisor = 2 + (n % 7);
      const quotient = 3 + ((n * 2) % 7);
      const remainder = n % divisor;
      const total = divisor * quotient + remainder;
      const answer = `${quotient}余${remainder}`;
      return scalarDraft({
        enPrompt: `${total} objects are grouped with ${divisor} in each group. What is the quotient and remainder?`,
        zhPrompt: `把${total}个物品按每组${divisor}个分组，商和余数是多少？`,
        answer,
        enExplanation: `${divisor}x${quotient}+${remainder}=${total}, so the result is ${answer}.`,
        zhExplanation: `${divisor}x${quotient}+${remainder}=${total}，所以商是${quotient}，余数是${remainder}。`,
        acceptedAnswers: [
          `${quotient} R ${remainder}`,
          `商${quotient}余${remainder}`,
          `商是${quotient}，余数是${remainder}`,
          `quotient ${quotient}, remainder ${remainder}`
        ],
        distractors: [`${quotient + 1}余${remainder}`, `${quotient}余${(remainder + 1) % divisor}`, String(quotient)]
      });
    }
    case "place-value-measurement": {
      const thousands = 1 + (n % 8);
      const hundreds = (n * 3) % 10;
      const tens = (n * 5) % 10;
      const ones = (n * 7) % 10;
      const number = thousands * 1000 + hundreds * 100 + tens * 10 + ones;
      const answer = hundreds;
      return scalarDraft({
        enPrompt: `In the number ${number}, what digit is in the hundreds place?`,
        zhPrompt: `在数${number}中，百位上的数字是几？`,
        answer,
        enExplanation: `${number} has ${thousands} thousands, ${hundreds} hundreds, ${tens} tens, and ${ones} ones.`,
        zhExplanation: `${number}中有${thousands}个千、${hundreds}个百、${tens}个十和${ones}个一。`,
        distractors: [thousands, tens, ones]
      });
    }
    case "operations-fractions": {
      const denominator = 4 + (n % 5);
      const numerator = 1 + (n % (denominator - 1));
      const answer = `${numerator}/${denominator}`;
      return scalarDraft({
        enPrompt: `A whole is divided into ${denominator} equal parts. ${numerator} parts are shaded. What fraction is shaded?`,
        zhPrompt: `把一个整体平均分成${denominator}份，其中涂色${numerator}份。涂色部分占几分之几？`,
        answer,
        enExplanation: `The denominator names ${denominator} equal parts and the numerator names ${numerator} shaded parts.`,
        zhExplanation: `平均分成${denominator}份作分母，涂色${numerator}份作分子，所以是${answer}。`,
        distractors: [`${denominator}/${numerator}`, `${numerator + 1}/${denominator}`, `${numerator}/${denominator + 1}`]
      });
    }
    case "measurement-time-geometry": {
      const start = 8 + (n % 5);
      const elapsed = 15 + ((n * 5) % 40);
      const answer = elapsed;
      return scalarDraft({
        enPrompt: `A reading activity starts at ${start}:00 and lasts ${elapsed} minutes. How many minutes does it last?`,
        zhPrompt: `阅读活动从${start}:00开始，持续${elapsed}分钟。活动持续了多少分钟？`,
        answer: answerWithUnit(answer, "分钟"),
        enExplanation: `The duration is directly given as ${elapsed} minutes.`,
        zhExplanation: `题目给出的持续时间就是${elapsed}分钟。`,
        distractors: [answerWithUnit(elapsed + 5, "分钟"), answerWithUnit(Math.max(0, elapsed - 5), "分钟"), answerWithUnit(start, "分钟")]
      });
    }
    case "area-decimals": {
      const length = 3 + (n % 9);
      const width = 2 + ((n * 2) % 6);
      const answer = length * width;
      return scalarDraft({
        enPrompt: `A rectangle is ${length} cm long and ${width} cm wide. What is its area?`,
        zhPrompt: `一个长方形长${length}厘米、宽${width}厘米，面积是多少？`,
        answer: answerWithUnit(answer, "平方厘米"),
        enExplanation: `Area = length x width = ${length}x${width}=${answer} square centimeters.`,
        zhExplanation: `长方形面积=长x宽，${length}x${width}=${answer}平方厘米。`,
        distractors: [answerWithUnit(2 * (length + width), "平方厘米"), answerWithUnit(answer + length, "平方厘米"), answerWithUnit(answer - width, "平方厘米")]
      });
    }
    case "statistics-review": {
      const a = 4 + (n % 8);
      const b = a + 2;
      const c = a + 4;
      const answer = a + 2;
      return scalarDraft({
        enPrompt: `Find the average of ${a}, ${b}, and ${c}.`,
        zhPrompt: `求${a}、${b}、${c}这三个数的平均数。`,
        answer,
        enExplanation: `(${a}+${b}+${c})/3=${answer}.`,
        zhExplanation: `平均数=(${a}+${b}+${c})÷3=${answer}。`,
        distractors: [a, c, answer + 1]
      });
    }
    case "large-numbers-multiplication": {
      const factor = 12 + (n % 18);
      const multiplier = 20 + ((n * 3) % 30);
      const answer = factor * multiplier;
      return scalarDraft({
        enPrompt: `Calculate ${factor} x ${multiplier}.`,
        zhPrompt: `计算：${factor}x${multiplier}=？`,
        answer,
        enExplanation: `${factor}x${multiplier}=${answer}.`,
        zhExplanation: `按乘法计算可得${factor}x${multiplier}=${answer}。`,
        distractors: [answer + factor, answer - factor, factor + multiplier]
      });
    }
    case "angles-geometry": {
      const angle = 25 + ((n * 5) % 120);
      const answer = 180 - angle;
      return scalarDraft({
        enPrompt: `Two angles form a straight angle. One angle is ${angle} degrees. What is the other angle?`,
        zhPrompt: `两个角组成一个平角，其中一个角是${angle}°，另一个角是多少度？`,
        answer: `${answer}°`,
        enExplanation: `Angles on a straight line add to 180 degrees, so 180-${angle}=${answer}.`,
        zhExplanation: `平角是180°，所以另一个角是180°-${angle}°=${answer}°。`,
        distractors: [`${angle}°`, `${answer + 10}°`, `${Math.max(0, answer - 10)}°`]
      });
    }
    case "decimals-average": {
      const a = oneDecimal(1 + (n % 9) / 10);
      const b = oneDecimal(2 + ((n * 2) % 9) / 10);
      const answer = oneDecimal(a + b);
      return scalarDraft({
        enPrompt: `Calculate ${a}+${b}.`,
        zhPrompt: `计算：${a}+${b}=？`,
        answer: formatNumber(answer),
        enExplanation: `Line up decimal places: ${a}+${b}=${formatNumber(answer)}.`,
        zhExplanation: `小数点对齐计算：${a}+${b}=${formatNumber(answer)}。`,
        distractors: [formatNumber(oneDecimal(answer + 0.1)), formatNumber(oneDecimal(answer - 0.1)), formatNumber(a + b + 1)]
      });
    }
    case "perimeter-area-lines": {
      const length = 5 + (n % 9);
      const width = 3 + ((n * 2) % 7);
      const answer = 2 * (length + width);
      return scalarDraft({
        enPrompt: `A rectangle is ${length} cm long and ${width} cm wide. What is its perimeter?`,
        zhPrompt: `一个长方形长${length}厘米、宽${width}厘米，周长是多少？`,
        answer: answerWithUnit(answer, "厘米"),
        enExplanation: `Perimeter = (${length}+${width})x2=${answer} cm.`,
        zhExplanation: `长方形周长=（长+宽）x2=(${length}+${width})x2=${answer}厘米。`,
        distractors: [answerWithUnit(length * width, "厘米"), answerWithUnit(answer / 2, "厘米"), answerWithUnit(answer + 2, "厘米")]
      });
    }
    case "decimals-equations": {
      const a = 2 + (n % 5);
      const x = 3 + ((n * 2) % 8);
      const b = 4 + ((n * 3) % 9);
      const total = a * x + b;
      return scalarDraft({
        enPrompt: `Solve ${a}x+${b}=${total}. What is x?`,
        zhPrompt: `解方程：${a}x+${b}=${total}。x是多少？`,
        answer: x,
        enExplanation: `${total}-${b}=${a * x}, and ${a * x}/${a}=${x}.`,
        zhExplanation: `先算${total}-${b}=${a * x}，再算${a * x}÷${a}=${x}。`,
        distractors: [x + 1, Math.max(0, x - 1), total - b]
      });
    }
    case "polygon-area": {
      const base = 6 + (n % 10);
      const height = 4 + ((n * 2) % 8);
      const answer = (base * height) / 2;
      return scalarDraft({
        enPrompt: `A triangle has base ${base} cm and height ${height} cm. What is its area?`,
        zhPrompt: `一个三角形的底是${base}厘米，高是${height}厘米，面积是多少？`,
        answer: answerWithUnit(answer, "平方厘米"),
        enExplanation: `Triangle area = base x height / 2 = ${base}x${height}÷2=${answer} square centimeters.`,
        zhExplanation: `三角形面积=底x高÷2，${base}x${height}÷2=${answer}平方厘米。`,
        distractors: [answerWithUnit(base * height, "平方厘米"), answerWithUnit(answer + base, "平方厘米"), answerWithUnit(answer - 1, "平方厘米")]
      });
    }
    case "factors-fractions": {
      const denominator = 6 + (n % 6);
      const left = 1 + (n % 3);
      const right = 1 + ((n * 2) % 3);
      const answer = fraction(left + right, denominator);
      return scalarDraft({
        enPrompt: `Calculate ${left}/${denominator}+${right}/${denominator}.`,
        zhPrompt: `计算：${left}/${denominator}+${right}/${denominator}=？`,
        answer,
        enExplanation: `The denominators are the same, so add numerators: ${left + right}/${denominator}=${answer}.`,
        zhExplanation: `分母相同，分子相加：${left + right}/${denominator}=${answer}。`,
        distractors: [`${left + right}/${denominator * 2}`, `${left}/${denominator}`, `${right}/${denominator}`]
      });
    }
    case "volume-data": {
      const length = 3 + (n % 6);
      const width = 2 + ((n * 2) % 5);
      const height = 2 + ((n * 3) % 4);
      const answer = length * width * height;
      return scalarDraft({
        enPrompt: `A cuboid is ${length} cm long, ${width} cm wide, and ${height} cm high. What is its volume?`,
        zhPrompt: `一个长方体长${length}厘米、宽${width}厘米、高${height}厘米，体积是多少？`,
        answer: answerWithUnit(answer, "立方厘米"),
        enExplanation: `Volume = ${length}×${width}×${height}=${answer} cubic centimeters.`,
        zhExplanation: `长方体体积=长×宽×高，${length}×${width}×${height}=${answer}立方厘米。`,
        distractors: [answerWithUnit(length * width, "立方厘米"), answerWithUnit(answer + height, "立方厘米"), answerWithUnit(2 * (length + width + height), "立方厘米")]
      });
    }
    case "percent-fractions": {
      const whole = 80 + ((n * 10) % 120);
      const percent = [10, 20, 25, 50][n % 4];
      const answer = (whole * percent) / 100;
      return scalarDraft({
        enPrompt: `What is ${percent}% of ${whole}?`,
        zhPrompt: `${whole}的${percent}%是多少？`,
        answer,
        enExplanation: `${percent}% means ${percent}/100, so ${whole}x${percent}/100=${answer}.`,
        zhExplanation: `${percent}%表示${percent}/100，所以${whole}x${percent}/100=${answer}。`,
        distractors: [answer + 5, Math.max(0, answer - 5), whole - answer]
      });
    }
    case "coordinate-data": {
      const x = 1 + (n % 8);
      const y = 1 + ((n * 2) % 6);
      const answer = `(${x}, ${y})`;
      return scalarDraft({
        enPrompt: `Point A moves to x=${x} and y=${y}. Write its ordered pair.`,
        zhPrompt: `点A的横坐标是${x}，纵坐标是${y}，请写出它的数对。`,
        answer,
        enExplanation: `An ordered pair is written as (x, y), so A is ${answer}.`,
        zhExplanation: `数对按（横坐标，纵坐标）书写，所以A是${answer}。`,
        distractors: coordinateDistractors(x, y)
      });
    }
    case "ratio-proportion": {
      const unit = 2 + (n % 5);
      const left = 2;
      const right = 3;
      const total = (left + right) * unit;
      const answer = right * unit;
      return scalarDraft({
        enPrompt: `${total} L of juice is divided in the ratio ${left}:${right}. How many liters are in the larger part?`,
        zhPrompt: `把${total}升饮料按${left}:${right}分成两部分，较大的部分是多少升？`,
        answer: answerWithUnit(answer, "升"),
        enExplanation: `There are ${left + right} ratio units. Each unit is ${total}÷${left + right}=${unit} L, so the larger part is ${right}×${unit}=${answer} L.`,
        zhExplanation: `一共有${left + right}份，每份${total}÷${left + right}=${unit}升，较大部分是${right}×${unit}=${answer}升。`,
        distractors: [answerWithUnit(left * unit, "升"), answerWithUnit(total, "升"), answerWithUnit(answer + unit, "升")]
      });
    }
    case "negative-review": {
      const start = -10 + (n % 12);
      const change = 3 + ((n * 2) % 8);
      const answer = start + change;
      return scalarDraft({
        enPrompt: `The temperature is ${start}°C and rises by ${change}°C. What is the new temperature?`,
        zhPrompt: `气温是${start}°C，升高${change}°C后是多少摄氏度？`,
        answer: `${answer}°C`,
        enExplanation: `${start}+${change}=${answer}, so the new temperature is ${answer} degrees Celsius.`,
        zhExplanation: `${start}+${change}=${answer}，所以新的气温是${answer}°C。`,
        distractors: [`${start - change}°C`, `${Math.abs(answer)}°C`, `${answer + 1}°C`],
        acceptedAnswers: [`${answer}`, `${answer} °C`, `${answer}摄氏度`, `${answer}度`, `${answer} degrees Celsius`]
      });
    }
    default:
      return scalarDraft({
        enPrompt: `${type} review item ${n}. What is ${n}+1?`,
        zhPrompt: `复习题${n}：${n}+1=？`,
        answer: n + 1,
        enExplanation: `${n}+1=${n + 1}.`,
        zhExplanation: `${n}+1=${n + 1}。`,
        distractors: [n, n + 2, n + 3]
      });
  }
}

function replacementDraftForFamily(
  family: MainlandPepPrimaryQuestionFamily,
  type: PrimaryQuestionType,
  index: number,
  replacementOrdinal: number
): Draft {
  const n = index + 1;
  const variant = replacementOrdinal % 3;
  const context = replacementContext(replacementOrdinal);

  switch (family) {
    case "number-sense": {
      const total = 9 + ((n * 2 + replacementOrdinal) % 11);
      const part = 1 + ((n + replacementOrdinal * 3) % (total - 1));
      const answer = total - part;
      const zhPrompts = [
        `${context.name}有${total}枚${context.object}，已经用掉${part}枚，还剩多少枚？`,
        `${context.place}准备了${total}张数卡，先发给同学${part}张，还剩几张？`,
        `一个盒子里有${total}个小圆片，取出${part}个后，盒子里还有多少个？`
      ];
      const enPrompts = [
        `${context.name} has ${total} tokens and uses ${part}. How many are left?`,
        `${total} number cards are prepared and ${part} are handed out. How many remain?`,
        `A box has ${total} counters. ${part} are taken out. How many counters remain?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `Subtract the used part from the total: ${total}-${part}=${answer}.`,
        zhExplanation: `用总数减去取走的部分：${total}-${part}=${answer}。`,
        distractors: [answer + 1, Math.max(0, answer - 1), part]
      });
    }
    case "geometry-position": {
      const shapes = ["长方体", "正方体", "圆柱", "球"];
      const answer = shapes[(n + replacementOrdinal) % shapes.length];
      const feature =
        answer === "球"
          ? "从各个方向都能滚动"
          : answer === "圆柱"
            ? "上下两个面都是圆形"
            : answer === "正方体"
              ? "每个面都是正方形"
              : "相对的面形状相同，多数面是长方形";
      const zhPrompts = [
        `${context.name}摸到一个立体图形，它${feature}。这个图形最可能是什么？`,
        `${context.place}摆着一个模型，特点是：${feature}。请选择它的名称。`,
        `观察一个积木：${feature}。这个积木属于哪种立体图形？`
      ];
      const enPrompts = [
        `${context.name} feels a solid with this feature: ${feature}. Which solid is it?`,
        `A model has this feature: ${feature}. Choose its name.`,
        `A block has this feature: ${feature}. Which solid is it?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `The feature matches ${answer}.`,
        zhExplanation: `这个特征对应${answer}。`,
        distractors: shapes.filter((shape) => shape !== answer)
      });
    }
    case "addition-subtraction": {
      const start = 32 + ((n * 5 + replacementOrdinal) % 48);
      const change = 5 + ((n * 4 + replacementOrdinal) % 17);
      const subtract = (n + replacementOrdinal) % 2 === 0;
      const answer = subtract ? start - change : start + change;
      const zhPrompts = [
        `${context.name}原来有${start}张${context.object}，${subtract ? "送出" : "又得到"}${change}张，现在有多少张？`,
        `${context.place}记录了${start}个作品，后来${subtract ? "撤下" : "新增"}${change}个，现在记录多少个？`,
        `一袋材料先有${start}个，活动中${subtract ? "用掉" : "补充"}${change}个，活动后有多少个？`
      ];
      const enPrompts = [
        `${context.name} starts with ${start} items and ${subtract ? "gives away" : "gets"} ${change}. How many now?`,
        `${start} works are recorded, then ${change} are ${subtract ? "removed" : "added"}. How many are recorded now?`,
        `A bag has ${start} materials and ${change} are ${subtract ? "used" : "added"}. How many are there after the activity?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `Compute ${start}${subtract ? "-" : "+"}${change}=${answer}.`,
        zhExplanation: `按题意计算：${start}${subtract ? "-" : "+"}${change}=${answer}${variant === 0 ? "张" : "个"}。`,
        acceptedAnswers: variant === 0
          ? [`${answer}张`, `${answer} items`]
          : [`${answer}个`, `${answer} items`],
        distractors: [answer + 10, answer - 10, start]
      });
    }
    case "time-data": {
      const counts = [4 + ((n + replacementOrdinal) % 5), 6 + ((n * 2 + replacementOrdinal) % 6), 5 + ((n * 3 + replacementOrdinal) % 5)];
      const answer = Math.max(...counts);
      const zhPrompts = [
        `${context.place}统计红色${counts[0]}个、蓝色${counts[1]}个、绿色${counts[2]}个，最多的是几个？`,
        `${context.name}整理三类${context.object}：甲类${counts[0]}个、乙类${counts[1]}个、丙类${counts[2]}个。最大数量是多少？`,
        `活动表上写着三组人数分别是${counts[0]}人、${counts[1]}人、${counts[2]}人，哪一个数量最大？`
      ];
      const enPrompts = [
        `${counts[0]} red, ${counts[1]} blue, and ${counts[2]} green items are counted. What is the largest count?`,
        `${context.name} sorts three groups with ${counts[0]}, ${counts[1]}, and ${counts[2]} items. What is the greatest number?`,
        `Three activity groups have ${counts[0]}, ${counts[1]}, and ${counts[2]} students. What is the largest number?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `Compare ${counts.join(", ")}. The largest count is ${answer}.`,
        zhExplanation: `比较${counts.join("、")}，最大数量是${answer}${variant === 2 ? "人" : "个"}。`,
        acceptedAnswers: variant === 2
          ? [`${answer}人`, `${answer} students`]
          : [`${answer}个`, `${answer} items`],
        distractors: counts.filter((count) => count !== answer)
      });
    }
    case "multiplication": {
      const a = 2 + ((n + replacementOrdinal) % 8);
      const b = 2 + ((n * 3 + replacementOrdinal) % 8);
      const answer = a * b;
      const zhPrompts = [
        `${context.name}摆了${a}行${context.object}，每行${b}个，一共有多少个？`,
        `${context.place}有${a}个托盘，每个托盘放${b}个模型，一共放了多少个模型？`,
        `手工课分成${a}组，每组做${b}个作品，一共做多少个作品？`
      ];
      const enPrompts = [
        `${context.name} arranges ${a} rows with ${b} items in each row. How many items are there?`,
        `${a} trays each hold ${b} models. How many models are there altogether?`,
        `${a} groups each make ${b} works. How many works are made altogether?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `${a} groups of ${b} gives ${a}×${b}=${answer}.`,
        zhExplanation: `${a}个${b}相加，可以写成${a}×${b}=${answer}。`,
        distractors: [a + b, answer + a, Math.max(0, answer - b)]
      });
    }
    case "measurement-geometry": {
      const cm = 22 + ((n * 4 + replacementOrdinal) % 65);
      const extra = 6 + ((n + replacementOrdinal) % 12);
      const answer = cm + extra;
      const zhPrompts = [
        `${context.name}量到一条纸带长${cm}厘米，另一条比它长${extra}厘米。另一条长多少厘米？`,
        `${context.place}有一根绳子长${cm}厘米，新绳子比它长${extra}厘米，新绳子长多少厘米？`,
        `手工桌上的蓝条长${cm}厘米，红条比蓝条长${extra}厘米。红条长多少厘米？`
      ];
      const enPrompts = [
        `One paper strip is ${cm} cm long. Another is ${extra} cm longer. How long is the other strip?`,
        `A rope is ${cm} cm long, and a new rope is ${extra} cm longer. How long is the new rope?`,
        `A blue strip is ${cm} cm long. A red strip is ${extra} cm longer. How long is the red strip?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: answerWithUnit(answer, "厘米"),
        enExplanation: `${cm}+${extra}=${answer}, so the length is ${answer} cm.`,
        zhExplanation: `比${cm}厘米长${extra}厘米，列式${cm}+${extra}=${answer}，所以长${answer}厘米。`,
        distractors: [answerWithUnit(cm, "厘米"), answerWithUnit(answer + 1, "厘米"), answerWithUnit(Math.max(0, cm - extra), "厘米")]
      });
    }
    case "division-remainder": {
      const divisor = 2 + ((n + replacementOrdinal) % 7);
      const quotient = 3 + ((n * 2 + replacementOrdinal) % 7);
      const remainder = (n + replacementOrdinal) % divisor;
      const total = divisor * quotient + remainder;
      const answer = `${quotient}余${remainder}`;
      const zhPrompts = [
        `${context.name}把${total}张${context.object}按每${divisor}张一份整理，商和余数是多少？`,
        `${context.place}有${total}个材料，每${divisor}个装一袋，可以装几袋，还剩几个？`,
        `把${total}个模型平均按每组${divisor}个分组，结果怎样表示？`
      ];
      const enPrompts = [
        `${total} cards are sorted with ${divisor} cards in each set. What is the quotient and remainder?`,
        `${total} materials are packed with ${divisor} in each bag. How many bags and how many left?`,
        `${total} models are grouped with ${divisor} in each group. Write the result.`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `${divisor}x${quotient}+${remainder}=${total}, so the result is ${answer}.`,
        zhExplanation: `${divisor}x${quotient}+${remainder}=${total}，所以商是${quotient}，余数是${remainder}。`,
        acceptedAnswers: [
          `${quotient} R ${remainder}`,
          `商${quotient}余${remainder}`,
          `商是${quotient}，余数是${remainder}`,
          `quotient ${quotient}, remainder ${remainder}`,
          ...(variant === 1 ? [`${quotient}袋，余${remainder}个`, `${quotient}袋，还剩${remainder}个`] : [])
        ],
        distractors: [`${quotient + 1}余${remainder}`, `${quotient}余${(remainder + 1) % divisor}`, String(quotient)]
      });
    }
    case "place-value-measurement": {
      const thousands = 1 + ((n + replacementOrdinal) % 8);
      const hundreds = (n * 3 + replacementOrdinal) % 10;
      const tens = (n * 5 + replacementOrdinal) % 10;
      const ones = (n * 7 + replacementOrdinal) % 10;
      const number = thousands * 1000 + hundreds * 100 + tens * 10 + ones;
      const answer = hundreds;
      const zhPrompts = [
        `${context.name}读到数${number}，这个数百位上的数字是几？`,
        `统计表中有一个数${number}，请写出它百位上的数字。`,
        `${context.place}的编号是${number}，编号中百位数字是多少？`
      ];
      const enPrompts = [
        `${context.name} reads the number ${number}. What digit is in the hundreds place?`,
        `A table shows the number ${number}. Write the hundreds digit.`,
        `The code is ${number}. What is its hundreds digit?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `${number} has ${hundreds} hundreds, so the hundreds digit is ${answer}.`,
        zhExplanation: `${number}中有${hundreds}个百，所以百位上的数字是${answer}。`,
        distractors: [thousands, tens, ones]
      });
    }
    case "operations-fractions": {
      const denominator = 4 + ((n + replacementOrdinal) % 5);
      const numerator = 1 + ((n + replacementOrdinal * 2) % (denominator - 1));
      const answer = `${numerator}/${denominator}`;
      const zhPrompts = [
        `${context.name}把一张纸平均分成${denominator}份，涂色${numerator}份。涂色部分占几分之几？`,
        `一个图形平均分为${denominator}份，其中${numerator}份做了标记。标记部分用分数怎样表示？`,
        `${context.place}展示的圆被平均分成${denominator}份，阴影有${numerator}份。阴影占整体的几分之几？`
      ];
      const enPrompts = [
        `A paper is split into ${denominator} equal parts and ${numerator} parts are shaded. What fraction is shaded?`,
        `A shape has ${denominator} equal parts and ${numerator} marked parts. Write the fraction for the marked part.`,
        `A circle has ${denominator} equal parts and ${numerator} shaded parts. What fraction is shaded?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `${numerator} of ${denominator} equal parts are shaded, so the fraction is ${answer}.`,
        zhExplanation: `平均分成${denominator}份，其中${numerator}份涂色，所以是${answer}。`,
        distractors: [`${denominator}/${numerator}`, `${numerator + 1}/${denominator}`, `${numerator}/${denominator + 1}`]
      });
    }
    case "measurement-time-geometry": {
      const start = 8 + ((n + replacementOrdinal) % 5);
      const elapsed = 15 + ((n * 5 + replacementOrdinal) % 40);
      const answer = elapsed;
      const zhPrompts = [
        `${context.name}从${start}:00开始练习口算，练习了${elapsed}分钟。练习时间是多少分钟？`,
        `${context.place}的小活动在${start}:00开始，持续${elapsed}分钟。活动持续了多久？`,
        `阅读时间从${start}:00开始，记录表写着持续${elapsed}分钟。持续时间是多少？`
      ];
      const enPrompts = [
        `${context.name} starts practice at ${start}:00 and practices for ${elapsed} minutes. How long is the practice?`,
        `An activity starts at ${start}:00 and lasts ${elapsed} minutes. How long does it last?`,
        `Reading starts at ${start}:00 and lasts ${elapsed} minutes. What is the duration?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: answerWithUnit(answer, "分钟"),
        enExplanation: `The duration is given as ${elapsed} minutes.`,
        zhExplanation: `题目直接给出持续${elapsed}分钟，所以答案是${elapsed}分钟。`,
        distractors: [answerWithUnit(elapsed + 5, "分钟"), answerWithUnit(Math.max(0, elapsed - 5), "分钟"), answerWithUnit(start, "分钟")]
      });
    }
    case "area-decimals": {
      const length = 3 + ((n + replacementOrdinal) % 9);
      const width = 2 + ((n * 2 + replacementOrdinal) % 6);
      const answer = length * width;
      const zhPrompts = [
        `${context.name}画了一个长方形，长${length}厘米、宽${width}厘米。面积是多少？`,
        `${context.place}有一张长方形标签，长${length}厘米、宽${width}厘米。标签面积是多少？`,
        `一块长方形纸板长${length}厘米、宽${width}厘米，它的面积是多少平方厘米？`
      ];
      const enPrompts = [
        `${context.name} draws a rectangle ${length} cm long and ${width} cm wide. What is its area?`,
        `A rectangular label is ${length} cm long and ${width} cm wide. What is its area?`,
        `A rectangular card is ${length} cm by ${width} cm. What is its area?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: answerWithUnit(answer, "平方厘米"),
        enExplanation: `Area = length x width = ${length}x${width}=${answer} square centimeters.`,
        zhExplanation: `长方形面积=长x宽，${length}x${width}=${answer}平方厘米。`,
        distractors: [answerWithUnit(2 * (length + width), "平方厘米"), answerWithUnit(answer + length, "平方厘米"), answerWithUnit(Math.max(0, answer - width), "平方厘米")]
      });
    }
    case "statistics-review": {
      const a = 5 + ((n + replacementOrdinal) % 8);
      const b = a + 2;
      const c = a + 4;
      const answer = a + 2;
      const zhPrompts = [
        `${context.name}三次跳绳成绩是${a}下、${b}下、${c}下，平均每次多少下？`,
        `${context.name}在${context.place}整理三盒彩笔，分别有${a}支、${b}支、${c}支，平均每盒有多少支？`,
        `${context.place}记录了三组数据：${a}、${b}、${c}。这三个数的平均数是多少？`
      ];
      const enPrompts = [
        `${context.name} jumps ${a}, ${b}, and ${c} times. What is the average?`,
        `${context.name} sorts three boxes with ${a}, ${b}, and ${c} pens. What is the average number of pens per box?`,
        `Find the average of ${a}, ${b}, and ${c}.`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `(${a}+${b}+${c})/3=${answer}.`,
        zhExplanation: `平均数=(${a}+${b}+${c})÷3=${answer}${variant === 0 ? "下" : variant === 1 ? "支" : ""}。`,
        acceptedAnswers: variant === 0
          ? [`${answer}下`, `${answer} times`]
          : variant === 1
            ? [`${answer}支`, `${answer} pens`]
            : [],
        distractors: [a, c, answer + 1]
      });
    }
    case "large-numbers-multiplication": {
      const factor = 13 + ((n + replacementOrdinal) % 18);
      const multiplier = 21 + ((n * 3 + replacementOrdinal) % 30);
      const answer = factor * multiplier;
      const zhPrompts = [
        `${context.place}每箱有${factor}本练习本，准备${multiplier}箱，一共有多少本？`,
        `${context.name}统计每排${factor}个座位，共${multiplier}排，一共有多少个座位？`,
        `仓库每包有${factor}张卡片，${multiplier}包共有多少张卡片？`
      ];
      const enPrompts = [
        `Each box has ${factor} notebooks. There are ${multiplier} boxes. How many notebooks are there?`,
        `There are ${factor} seats in each row and ${multiplier} rows. How many seats are there?`,
        `Each pack has ${factor} cards. How many cards are in ${multiplier} packs?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `${factor}x${multiplier}=${answer}.`,
        zhExplanation: `列式为${factor}x${multiplier}=${answer}。`,
        distractors: [answer + factor, answer - factor, factor + multiplier]
      });
    }
    case "angles-geometry": {
      const angle = 30 + ((n * 5 + replacementOrdinal) % 110);
      const answer = 180 - angle;
      const zhPrompts = [
        `${context.name}画了两个组成平角的角，其中一个是${angle}°，另一个是多少度？`,
        `一条直线上的两个相邻角和为180°，已知一个角是${angle}°，另一个角是多少？`,
        `${context.place}的角度卡显示一个角为${angle}°，它的邻补角是多少度？`
      ];
      const enPrompts = [
        `${context.name} draws two angles forming a straight angle. One is ${angle} degrees. What is the other?`,
        `Two adjacent angles on a straight line add to 180 degrees. One is ${angle} degrees. What is the other?`,
        `An angle is ${angle} degrees. What is its supplementary angle?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: `${answer}°`,
        enExplanation: `Angles on a straight line add to 180 degrees, so 180-${angle}=${answer}.`,
        zhExplanation: `平角是180°，所以另一个角是180°-${angle}°=${answer}°。`,
        distractors: [`${angle}°`, `${answer + 10}°`, `${Math.max(0, answer - 10)}°`]
      });
    }
    case "decimals-average": {
      const a = oneDecimal(1 + ((n + replacementOrdinal) % 9) / 10);
      const b = oneDecimal(2 + ((n * 2 + replacementOrdinal) % 9) / 10);
      const answer = oneDecimal(a + b);
      const zhPrompts = [
        `${context.name}量到两段彩带分别长${a}米和${b}米，一共长多少米？`,
        `${context.place}记录两次用水量为${a}升和${b}升，合计多少升？`,
        `两盒彩泥质量分别是${a}千克和${b}千克，总质量是多少千克？`
      ];
      const enPrompts = [
        `Two ribbons are ${a} m and ${b} m long. How long are they altogether?`,
        `Two water amounts are ${a} L and ${b} L. What is the total?`,
        `Two boxes weigh ${a} kg and ${b} kg. What is their total weight?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: formatNumber(answer),
        enExplanation: `Line up decimal places: ${a}+${b}=${formatNumber(answer)}.`,
        zhExplanation: `小数点对齐计算：${a}+${b}=${formatNumber(answer)}${variant === 0 ? "米" : variant === 1 ? "升" : "千克"}。`,
        acceptedAnswers: variant === 0
          ? [`${formatNumber(answer)}米`, `${formatNumber(answer)} m`]
          : variant === 1
            ? [`${formatNumber(answer)}升`, `${formatNumber(answer)} L`]
            : [`${formatNumber(answer)}千克`, `${formatNumber(answer)} kg`],
        distractors: [formatNumber(oneDecimal(answer + 0.1)), formatNumber(oneDecimal(answer - 0.1)), formatNumber(oneDecimal(answer + 1))]
      });
    }
    case "perimeter-area-lines": {
      const length = 5 + ((n + replacementOrdinal) % 9);
      const width = 3 + ((n * 2 + replacementOrdinal) % 7);
      const answer = 2 * (length + width);
      const zhPrompts = [
        `${context.name}给长${length}厘米、宽${width}厘米的长方形卡片贴边框，边框长多少厘米？`,
        `${context.place}有一块长方形展示板，长${length}厘米、宽${width}厘米，周长是多少？`,
        `一张长方形纸长${length}厘米、宽${width}厘米，沿边走一圈是多少厘米？`
      ];
      const enPrompts = [
        `${context.name} puts a border around a rectangle ${length} cm long and ${width} cm wide. How long is the border?`,
        `A rectangular board is ${length} cm by ${width} cm. What is its perimeter?`,
        `A rectangular paper is ${length} cm long and ${width} cm wide. What is the distance around it?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: answerWithUnit(answer, "厘米"),
        enExplanation: `Perimeter = (${length}+${width})x2=${answer} cm.`,
        zhExplanation: `长方形周长=（长+宽）x2=(${length}+${width})x2=${answer}厘米。`,
        distractors: [answerWithUnit(length * width, "厘米"), answerWithUnit(answer / 2, "厘米"), answerWithUnit(answer + 2, "厘米")]
      });
    }
    case "decimals-equations": {
      const a = 2 + ((n + replacementOrdinal) % 5);
      const x = 3 + ((n * 2 + replacementOrdinal) % 8);
      const b = 4 + ((n * 3 + replacementOrdinal) % 9);
      const total = a * x + b;
      const zhPrompts = [
        `${context.name}买了${a}本同价练习本，又买了${b}元的书签，共用${total}元。每本练习本多少元？`,
        `一个数乘${a}再加${b}等于${total}，这个数是多少？`,
        `${context.place}的等量关系是${a}x+${b}=${total}，求x的值。`
      ];
      const enPrompts = [
        `${context.name} buys ${a} notebooks at the same price and a ${b}-yuan bookmark for ${total} yuan. What is one notebook's price?`,
        `A number multiplied by ${a} and then increased by ${b} equals ${total}. What is the number?`,
        `Solve the equation ${a}x+${b}=${total}. What is x?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: x,
        enExplanation: `${total}-${b}=${a * x}, and ${a * x}/${a}=${x}.`,
        zhExplanation: `先算${total}-${b}=${a * x}，再算${a * x}÷${a}=${x}。`,
        distractors: [x + 1, Math.max(0, x - 1), total - b]
      });
    }
    case "polygon-area": {
      const base = 6 + ((n + replacementOrdinal) % 10);
      const height = 4 + ((n * 2 + replacementOrdinal) % 8);
      const answer = (base * height) / 2;
      const zhPrompts = [
        `${context.name}剪出一个三角形，底是${base}厘米，高是${height}厘米，面积是多少？`,
        `${context.place}展示的三角形标着底${base}厘米、高${height}厘米。它的面积是多少？`,
        `一块三角形纸板的底为${base}厘米，高为${height}厘米，面积是多少平方厘米？`
      ];
      const enPrompts = [
        `${context.name} cuts out a triangle with base ${base} cm and height ${height} cm. What is its area?`,
        `A triangle has base ${base} cm and height ${height} cm. What is its area?`,
        `A triangular card has base ${base} cm and height ${height} cm. What is its area?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: answerWithUnit(answer, "平方厘米"),
        enExplanation: `Triangle area = base x height / 2 = ${base}x${height}÷2=${formatNumber(answer)} square centimeters.`,
        zhExplanation: `三角形面积=底x高÷2，${base}x${height}÷2=${formatNumber(answer)}平方厘米。`,
        distractors: [answerWithUnit(base * height, "平方厘米"), answerWithUnit(answer + base, "平方厘米"), answerWithUnit(Math.max(0, answer - 1), "平方厘米")]
      });
    }
    case "factors-fractions": {
      const denominator = 6 + ((n + replacementOrdinal) % 6);
      const left = 1 + ((n + replacementOrdinal) % 3);
      const right = 1 + ((n * 2 + replacementOrdinal) % 3);
      const answer = fraction(left + right, denominator);
      const zhPrompts = [
        `${context.name}先完成${left}/${denominator}页练习，又完成${right}/${denominator}页，一共完成几分之几页？`,
        `两段同样长的纸带分别占全长的${left}/${denominator}和${right}/${denominator}，合起来是多少？`,
        `${context.place}的记录显示两次用料为${left}/${denominator}包和${right}/${denominator}包，一共用了多少包？`
      ];
      const enPrompts = [
        `${context.name} finishes ${left}/${denominator} of a page and then ${right}/${denominator} of a page. What is the total?`,
        `Two parts are ${left}/${denominator} and ${right}/${denominator} of a whole strip. What is their sum?`,
        `Two material amounts are ${left}/${denominator} and ${right}/${denominator} of a pack. What is the total?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `The denominators are the same, so add numerators: ${left + right}/${denominator}=${answer}.`,
        zhExplanation: `分母相同，分子相加：${left + right}/${denominator}=${answer}${variant === 0 ? "页" : variant === 2 ? "包" : ""}。`,
        acceptedAnswers: variant === 0
          ? [`${answer}页`, `${answer} page`, `${answer} of a page`]
          : variant === 2
            ? [`${answer}包`, `${answer} pack`]
            : [],
        distractors: [`${left + right}/${denominator * 2}`, `${left}/${denominator}`, `${right}/${denominator}`]
      });
    }
    case "volume-data": {
      const length = 3 + ((n + replacementOrdinal) % 6);
      const width = 2 + ((n * 2 + replacementOrdinal) % 5);
      const height = 2 + ((n * 3 + replacementOrdinal) % 4);
      const answer = length * width * height;
      const zhPrompts = [
        `${context.name}搭了一个长方体，长${length}厘米、宽${width}厘米、高${height}厘米，体积是多少？`,
        `${context.place}有个长方体盒子，长${length}厘米、宽${width}厘米、高${height}厘米。它的体积是多少？`,
        `一块长方体积木的长、宽、高分别是${length}厘米、${width}厘米、${height}厘米，体积是多少立方厘米？`
      ];
      const enPrompts = [
        `${context.name} builds a cuboid ${length} cm long, ${width} cm wide, and ${height} cm high. What is its volume?`,
        `A cuboid box is ${length} cm by ${width} cm by ${height} cm. What is its volume?`,
        `A cuboid block has length ${length} cm, width ${width} cm, and height ${height} cm. What is its volume?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: answerWithUnit(answer, "立方厘米"),
        enExplanation: `Volume = ${length}×${width}×${height}=${answer} cubic centimeters.`,
        zhExplanation: `长方体体积=长×宽×高，${length}×${width}×${height}=${answer}立方厘米。`,
        distractors: [answerWithUnit(length * width, "立方厘米"), answerWithUnit(answer + height, "立方厘米"), answerWithUnit(2 * (length + width + height), "立方厘米")]
      });
    }
    case "percent-fractions": {
      const whole = 80 + (((n + replacementOrdinal) * 10) % 120);
      const percent = [10, 20, 25, 50][(n + replacementOrdinal) % 4];
      const answer = (whole * percent) / 100;
      const zhPrompts = [
        `${context.name}有${whole}张练习卡，完成了${percent}%。完成了多少张？`,
        `${context.place}准备${whole}个材料，其中${percent}%已经分类。已经分类多少个？`,
        `一份调查共有${whole}人参加，${percent}%选择了A项。选择A项的有多少人？`
      ];
      const enPrompts = [
        `${context.name} has ${whole} practice cards and finishes ${percent}%. How many cards are finished?`,
        `${whole} materials are prepared and ${percent}% are sorted. How many are sorted?`,
        `${whole} people join a survey and ${percent}% choose option A. How many people choose A?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `${percent}% means ${percent}/100, so ${whole}x${percent}/100=${answer}.`,
        zhExplanation: `${percent}%表示${percent}/100，所以${whole}x${percent}/100=${answer}。`,
        distractors: [answer + 5, Math.max(0, answer - 5), whole - answer]
      });
    }
    case "coordinate-data": {
      const x = 1 + ((n + replacementOrdinal) % 8);
      const y = 1 + ((n * 2 + replacementOrdinal) % 6);
      const answer = `(${x}, ${y})`;
      const zhPrompts = [
        `${context.name}在方格图上标出点A，横坐标是${x}，纵坐标是${y}。点A的数对是多少？`,
        `机器人从原点移动到横坐标${x}、纵坐标${y}的位置，请写出它的位置数对。`,
        `${context.place}的坐标卡写着x=${x}、y=${y}，对应的数对是什么？`
      ];
      const enPrompts = [
        `${context.name} marks point A with x-coordinate ${x} and y-coordinate ${y}. What is A's ordered pair?`,
        `A robot moves to x=${x} and y=${y}. Write its ordered pair.`,
        `A coordinate card says x=${x} and y=${y}. What is the ordered pair?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer,
        enExplanation: `An ordered pair is written as (x, y), so the point is ${answer}.`,
        zhExplanation: `数对按（横坐标，纵坐标）书写，所以是${answer}。`,
        distractors: coordinateDistractors(x, y)
      });
    }
    case "ratio-proportion": {
      const unit = 2 + ((n + replacementOrdinal) % 5);
      const left = 2;
      const right = 3;
      const total = (left + right) * unit;
      const answer = right * unit;
      const answerUnit = variant === 1 ? "米" : variant === 2 ? "个" : "升";
      const englishUnit = variant === 1 ? "m" : variant === 2 ? "items" : "L";
      const zhPrompts = [
        `${context.name}把${total}升饮料按${left}:${right}分成两份，较大的那份是多少升？`,
        `${context.place}有${total}米彩带，按${left}:${right}剪成两段，较长的一段是多少米？`,
        `${context.name}把${total}个${context.object}按${left}:${right}分给两组，人数多的一组分到多少个？`
      ];
      const enPrompts = [
        `${context.name} splits ${total} L of juice in the ratio ${left}:${right}. How many liters are in the larger part?`,
        `${total} m of ribbon is cut in the ratio ${left}:${right}. How long is the longer part?`,
        `${context.name} divides ${total} items in the ratio ${left}:${right}. How many does the larger group get?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: answerWithUnit(answer, answerUnit),
        enExplanation: `There are ${left + right} ratio units. Each unit is ${total}÷${left + right}=${unit} ${englishUnit}, and the larger part is ${right}×${unit}=${answer} ${englishUnit}.`,
        zhExplanation: `一共有${left + right}份，每份${total}÷${left + right}=${unit}${answerUnit}，较大部分是${right}×${unit}=${answer}${answerUnit}。`,
        distractors: [
          answerWithUnit(left * unit, answerUnit),
          answerWithUnit(total, answerUnit),
          answerWithUnit(answer + unit, answerUnit)
        ]
      });
    }
    case "negative-review": {
      const start = -10 + ((n + replacementOrdinal) % 12);
      const change = 3 + ((n * 2 + replacementOrdinal) % 8);
      const answer = start + change;
      const zhPrompts = [
        `${context.name}记录早晨气温是${start}°C，中午升高${change}°C。中午气温是多少摄氏度？`,
        `实验箱温度为${start}°C，调高${change}°C后，新的温度是多少？`,
        `${context.place}的温度计显示${start}°C，后来上升${change}°C。现在是多少摄氏度？`
      ];
      const enPrompts = [
        `${context.name} records ${start}°C in the morning. It rises by ${change}°C at noon. What is the noon temperature?`,
        `A box is at ${start}°C and is raised by ${change}°C. What is the new temperature?`,
        `A thermometer shows ${start}°C and then rises by ${change}°C. What is the temperature now?`
      ];
      return scalarDraft({
        enPrompt: enPrompts[variant],
        zhPrompt: zhPrompts[variant],
        answer: `${answer}°C`,
        enExplanation: `${start}+${change}=${answer}, so the new temperature is ${answer}°C.`,
        zhExplanation: `${start}+${change}=${answer}，所以新的气温是${answer}°C。`,
        distractors: [`${start - change}°C`, `${Math.abs(answer)}°C`, `${answer + 1}°C`],
        acceptedAnswers: [`${answer}`, `${answer} °C`, `${answer}摄氏度`, `${answer}度`, `${answer} degrees Celsius`]
      });
    }
    default:
      return scalarDraft({
        enPrompt: `Original ${type} practice: ${n}+1=?`,
        zhPrompt: `原创${type}练习：${n}+1=？`,
        answer: n + 1,
        enExplanation: `${n}+1=${n + 1}.`,
        zhExplanation: `${n}+1=${n + 1}。`,
        distractors: [n, n + 2, n + 3]
      });
  }
}

function expandPlan<T>(entries: Array<[T, number]>) {
  return entries.flatMap(([value, count]) => Array.from({ length: count }, () => value));
}

function typePlanForGrade(grade: PrimaryGrade): PrimaryQuestionType[] {
  if (grade === "P1" || grade === "P2") {
    return expandPlan<PrimaryQuestionType>([
      ["multiple-choice", 90],
      ["fill-in", 80],
      ["short-answer", 30]
    ]);
  }
  if (grade === "P3" || grade === "P4") {
    return expandPlan<PrimaryQuestionType>([
      ["multiple-choice", 75],
      ["fill-in", 75],
      ["short-answer", 50]
    ]);
  }
  return expandPlan<PrimaryQuestionType>([
    ["multiple-choice", 60],
    ["fill-in", 70],
    ["short-answer", 70]
  ]);
}

function difficultyPlanForGrade(grade: PrimaryGrade): Difficulty[] {
  if (grade === "P1" || grade === "P2") {
    return expandPlan<Difficulty>([
      ["Low", 120],
      ["Medium", 70],
      ["High", 10]
    ]);
  }
  if (grade === "P3" || grade === "P4") {
    return expandPlan<Difficulty>([
      ["Low", 80],
      ["Medium", 95],
      ["High", 25]
    ]);
  }
  return expandPlan<Difficulty>([
    ["Low", 60],
    ["Medium", 100],
    ["High", 40]
  ]);
}

function evidenceCardIdsFor(grade: GradeId, semester: MainlandPepSemester) {
  const exact = mainlandPepPrimaryRagCards.filter((card) => card.grade === grade && card.semester === semester);
  const fallback = mainlandPepPrimaryRagCards.filter((card) => card.grade === grade);
  return (exact.length ? exact : fallback).slice(0, 2).map((card) => card.id);
}

function examPatternCardIdsFor(grade: GradeId, semester: MainlandPepPrimarySemester, offset: number) {
  const cards = mainlandPepPrimaryExamPatternCards.filter((card) => card.grade === grade && card.semester === semester);
  if (!cards.length) return [];
  return [cards[offset % cards.length].id];
}

const metadataEntries: Array<[string, MainlandPepPrimaryQuestionGenerationMetadata]> = [];

function questionFor({
  topic,
  type,
  difficulty,
  gradeIndex
}: {
  topic: TopicSpec;
  type: PrimaryQuestionType;
  difficulty: Difficulty;
  gradeIndex: number;
}): Question {
  const topicRecord = topicById.get(topic.id);
  if (!topicRecord) throw new Error(`Missing Mainland PEP primary topic ${topic.id}`);
  const semesterPrefix = topic.semester === "upper" ? "u" : "l";
  const id = `pep-primary-${topic.grade.toLowerCase()}-${semesterPrefix}-${typePrefixes[type]}-${String(gradeIndex + 1).padStart(3, "0")}`;
  const replacementOrdinal = mainlandPepPrimaryManualReviewReplacementQuestionOrdinalById.get(id);
  const isReplacement = replacementOrdinal !== undefined;
  const generatedDraft = isReplacement
    ? replacementDraftForFamily(topic.family, type, gradeIndex, replacementOrdinal)
    : draftForFamily(topic.family, type, gradeIndex);
  const draft = applyPrimaryManualContentQaOverride(id, generatedDraft);
  const prompt = draft.prompt;
  const evidenceCardIds = evidenceCardIdsFor(topic.grade, topic.semester);
  const examPatternCardIds = examPatternCardIdsFor(topic.grade, topic.semester, gradeIndex);

  metadataEntries.push([
    id,
    {
      batch: "primary-rag-v1",
      grade: topic.grade,
      semester: topic.semester,
      type,
      topicId: topic.id,
      family: topic.family,
      itemIndex: gradeIndex,
      evidenceCardIds,
      examPatternCardIds,
      sourceDistanceStatus: "passed"
    }
  ]);

  return {
    id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandPepProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_PEP",
    canonicalTopicId: topic.id,
    grade: topic.grade,
    topicId: topic.id,
    topic: topicRecord.title,
    difficulty,
    type,
    prompt,
    ...(type === "multiple-choice" ? { options: optionsFor(draft.answer, draft.distractors, gradeIndex) } : {}),
    answer: draft.answer,
    ...(draft.acceptedAnswers?.length ? { acceptedAnswers: draft.acceptedAnswers } : {}),
    explanation: draft.explanation
  };
}

function questionsForGrade(grade: PrimaryGrade) {
  const topics = topicSpecs.filter((topic) => topic.grade === grade);
  const typePlan = typePlanForGrade(grade);
  const difficultyPlan = difficultyPlanForGrade(grade);
  if (topics.length !== 4) throw new Error(`Expected 4 Mainland PEP primary topics for ${grade}; found ${topics.length}`);
  if (typePlan.length !== 200 || difficultyPlan.length !== 200) throw new Error(`Invalid quota plan for ${grade}`);

  return topics.flatMap((topic, topicIndex) =>
    Array.from({ length: 50 }, (_, localIndex) => {
      const gradeIndex = topicIndex * 50 + localIndex;
      return questionFor({
        topic,
        type: typePlan[gradeIndex],
        difficulty: difficultyPlan[gradeIndex],
        gradeIndex
      });
    })
  );
}

export const mainlandPepPrimaryManualReviewReplacementQuestionIds = [
  "pep-primary-p1-u-mc-051",
  "pep-primary-p1-u-mc-055",
  "pep-primary-p1-u-mc-059",
  "pep-primary-p1-u-mc-001",
  "pep-primary-p1-u-mc-031",
  "pep-primary-p1-u-fi-091",
  "pep-primary-p1-u-fi-095",
  "pep-primary-p1-u-fi-099",
  "pep-primary-p1-u-fi-094",
  "pep-primary-p1-l-fi-101",
  "pep-primary-p1-l-fi-102",
  "pep-primary-p1-l-fi-103",
  "pep-primary-p1-l-fi-124",
  "pep-primary-p1-l-fi-147",
  "pep-primary-p1-l-fi-170",
  "pep-primary-p1-l-sa-171",
  "pep-primary-p1-l-sa-172",
  "pep-primary-p1-l-sa-173",
  "pep-primary-p1-l-sa-181",
  "pep-primary-p1-l-sa-191",
  "pep-primary-p1-l-sa-200",
  "pep-primary-p2-u-mc-001",
  "pep-primary-p2-u-mc-002",
  "pep-primary-p2-u-mc-003",
  "pep-primary-p2-u-mc-031",
  "pep-primary-p2-u-mc-061",
  "pep-primary-p2-u-mc-090",
  "pep-primary-p2-u-fi-091",
  "pep-primary-p2-u-fi-092",
  "pep-primary-p2-u-fi-093",
  "pep-primary-p2-u-fi-094",
  "pep-primary-p2-u-fi-097",
  "pep-primary-p2-u-fi-100",
  "pep-primary-p2-l-fi-102",
  "pep-primary-p2-l-fi-104",
  "pep-primary-p2-l-fi-112",
  "pep-primary-p2-l-fi-101",
  "pep-primary-p2-l-fi-124",
  "pep-primary-p2-l-fi-147",
  "pep-primary-p2-l-sa-171",
  "pep-primary-p2-l-sa-172",
  "pep-primary-p2-l-sa-173",
  "pep-primary-p2-l-sa-181",
  "pep-primary-p2-l-sa-191",
  "pep-primary-p2-l-sa-200",
  "pep-primary-p3-u-mc-051",
  "pep-primary-p3-u-mc-052",
  "pep-primary-p3-u-mc-053",
  "pep-primary-p3-u-mc-001",
  "pep-primary-p3-u-mc-026",
  "pep-primary-p3-u-mc-075",
  "pep-primary-p3-u-fi-076",
  "pep-primary-p3-u-fi-077",
  "pep-primary-p3-u-fi-078",
  "pep-primary-p3-u-fi-084",
  "pep-primary-p3-u-fi-092",
  "pep-primary-p3-u-fi-100",
  "pep-primary-p3-l-fi-101",
  "pep-primary-p3-l-fi-102",
  "pep-primary-p3-l-fi-103",
  "pep-primary-p3-l-fi-117",
  "pep-primary-p3-l-fi-134",
  "pep-primary-p3-l-fi-150",
  "pep-primary-p3-l-sa-152",
  "pep-primary-p3-l-sa-153",
  "pep-primary-p3-l-sa-154",
  "pep-primary-p3-l-sa-151",
  "pep-primary-p3-l-sa-167",
  "pep-primary-p3-l-sa-184",
  "pep-primary-p4-u-mc-001",
  "pep-primary-p4-u-mc-002",
  "pep-primary-p4-u-mc-003",
  "pep-primary-p4-u-mc-026",
  "pep-primary-p4-u-mc-051",
  "pep-primary-p4-u-mc-075",
  "pep-primary-p4-u-fi-076",
  "pep-primary-p4-u-fi-077",
  "pep-primary-p4-u-fi-078",
  "pep-primary-p4-u-fi-084",
  "pep-primary-p4-u-fi-092",
  "pep-primary-p4-u-fi-100",
  "pep-primary-p4-l-fi-108",
  "pep-primary-p4-l-fi-117",
  "pep-primary-p4-l-fi-126",
  "pep-primary-p4-l-fi-101",
  "pep-primary-p4-l-fi-134",
  "pep-primary-p4-l-fi-150",
  "pep-primary-p4-l-sa-151",
  "pep-primary-p4-l-sa-152",
  "pep-primary-p4-l-sa-153",
  "pep-primary-p4-l-sa-167",
  "pep-primary-p4-l-sa-184",
  "pep-primary-p4-l-sa-200",
  "pep-primary-p5-u-mc-016",
  "pep-primary-p5-u-mc-036",
  "pep-primary-p5-u-mc-040",
  "pep-primary-p5-u-mc-001",
  "pep-primary-p5-u-mc-021",
  "pep-primary-p5-u-mc-041",
  "pep-primary-p5-u-fi-061",
  "pep-primary-p5-u-fi-062",
  "pep-primary-p5-u-fi-063",
  "pep-primary-p5-u-fi-074",
  "pep-primary-p5-u-fi-087",
  "pep-primary-p5-u-fi-100",
  "pep-primary-p5-l-fi-101",
  "pep-primary-p5-l-fi-102",
  "pep-primary-p5-l-fi-103",
  "pep-primary-p5-l-fi-111",
  "pep-primary-p5-l-fi-121",
  "pep-primary-p5-l-fi-130",
  "pep-primary-p5-l-sa-131",
  "pep-primary-p5-l-sa-132",
  "pep-primary-p5-l-sa-133",
  "pep-primary-p5-l-sa-154",
  "pep-primary-p5-l-sa-177",
  "pep-primary-p5-l-sa-200",
  "pep-primary-p6-u-mc-002",
  "pep-primary-p6-u-mc-003",
  "pep-primary-p6-u-mc-004",
  "pep-primary-p6-u-mc-001",
  "pep-primary-p6-u-mc-021",
  "pep-primary-p6-u-mc-041",
  "pep-primary-p6-l-fi-101",
  "pep-primary-p6-l-fi-102",
  "pep-primary-p6-l-fi-103",
  "pep-primary-p6-l-fi-111",
  "pep-primary-p6-l-fi-121",
  "pep-primary-p6-l-fi-130",
  "pep-primary-p6-l-sa-131",
  "pep-primary-p1-l-fi-104",
  "pep-primary-p1-l-fi-105",
  "pep-primary-p1-l-fi-106",
  "pep-primary-p1-l-fi-107",
  "pep-primary-p1-l-fi-108",
  "pep-primary-p1-l-fi-109",
  "pep-primary-p2-l-fi-115",
  "pep-primary-p2-l-fi-120",
  "pep-primary-p2-l-fi-126",
  "pep-primary-p2-l-fi-128",
  "pep-primary-p2-l-fi-140",
  "pep-primary-p2-l-fi-141",
  "pep-primary-p3-l-sa-155",
  "pep-primary-p3-l-sa-160",
  "pep-primary-p3-l-sa-161",
  "pep-primary-p3-l-sa-162",
  "pep-primary-p3-l-sa-163",
  "pep-primary-p3-l-sa-168",
  "pep-primary-p4-l-fi-135",
  "pep-primary-p4-l-fi-144",
  "pep-primary-p4-l-fi-102",
  "pep-primary-p4-l-fi-103",
  "pep-primary-p4-l-fi-104",
  "pep-primary-p4-l-fi-105",
  "pep-primary-p5-u-mc-002",
  "pep-primary-p5-u-mc-003",
  "pep-primary-p5-u-mc-004",
  "pep-primary-p5-u-mc-005",
  "pep-primary-p5-u-mc-006",
  "pep-primary-p5-u-mc-007",
  "pep-primary-p6-u-mc-005",
  "pep-primary-p6-u-mc-006",
  "pep-primary-p6-u-mc-007",
  "pep-primary-p6-u-mc-008",
  "pep-primary-p6-u-mc-009",
  "pep-primary-p6-u-mc-010"
] as const;

const mainlandPepPrimaryManualReviewReplacementQuestionOrdinalById = new Map<string, number>(
  mainlandPepPrimaryManualReviewReplacementQuestionIds.map((questionId, index) => [questionId, index])
);

const generatedMainlandPepPrimaryRagV1Questions = primaryGrades.flatMap(questionsForGrade);

export const mainlandPepPrimaryRagV1Questions: Question[] = generatedMainlandPepPrimaryRagV1Questions;

export const mainlandPepPrimaryQuestionGenerationMetadata: Record<string, MainlandPepPrimaryQuestionGenerationMetadata> =
  Object.fromEntries(metadataEntries);

export function independentMainlandPepPrimaryAnswer(question: Pick<Question, "id">) {
  const metadata = mainlandPepPrimaryQuestionGenerationMetadata[question.id];
  if (!metadata) return null;
  const replacementOrdinal = mainlandPepPrimaryManualReviewReplacementQuestionOrdinalById.get(question.id);
  const generatedDraft = replacementOrdinal !== undefined
    ? replacementDraftForFamily(metadata.family, metadata.type, metadata.itemIndex, replacementOrdinal).answer
    : draftForFamily(metadata.family, metadata.type, metadata.itemIndex).answer;
  return mainlandPepPrimaryManualContentQaOverrides[question.id]?.answer ?? generatedDraft;
}
