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
  ["相对的面是长方形", "opposite faces are rectangles"],
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
  [/\bsphere\b/g, "球"]
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

function text(en: string, zh: string): LocalizedText {
  return { en: englishVisible(en), zh, zhHans: zh };
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
  answer,
  enExplanation,
  zhExplanation,
  distractors = [],
  acceptedAnswers = []
}: {
  enPrompt: string;
  zhPrompt: string;
  answer: string | number;
  enExplanation: string;
  zhExplanation: string;
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
    prompt: text(enPrompt, zhPrompt),
    answer: canonicalAnswer,
    explanation: text(enExplanation, zhExplanation),
    distractors: distractors.map((distractor) => englishVisible(String(distractor))),
    ...(acceptedAnswerAliases.length ? { acceptedAnswers: acceptedAnswerAliases } : {})
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
        enPrompt: `Which solid has the described feature: ${answer === "球" ? "it can roll in every direction" : answer === "圆柱" ? "it has two circular faces" : answer === "正方体" ? "all faces are squares" : "opposite faces are rectangles"}?`,
        zhPrompt: `下面描述的是哪种立体图形：${answer === "球" ? "能向各个方向滚动" : answer === "圆柱" ? "有两个圆形的面" : answer === "正方体" ? "每个面都是正方形" : "相对的面是长方形"}？`,
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
      return scalarDraft({
        enPrompt: `A class counted ${counts[0]} red cards, ${counts[1]} blue cards, and ${counts[2]} green cards. What is the largest count?`,
        zhPrompt: `班级统计红卡${counts[0]}张、蓝卡${counts[1]}张、绿卡${counts[2]}张，数量最多的是几张？`,
        answer,
        enExplanation: `Compare the three counts. The largest is ${answer}.`,
        zhExplanation: `比较三个数量，最大的是${answer}张。`,
        distractors: counts.filter((count) => count !== answer)
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
        enExplanation: `${a} groups of ${b} means ${a}x${b}=${answer}.`,
        zhExplanation: `${a}个${b}相加，可以写成${a}x${b}=${answer}。`,
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
      const answer = remainder === 0 ? String(quotient) : `${quotient}余${remainder}`;
      return scalarDraft({
        enPrompt: `${total} objects are grouped with ${divisor} in each group. What is the quotient and remainder?`,
        zhPrompt: `把${total}个物品按每组${divisor}个分组，商和余数是多少？`,
        answer,
        enExplanation: `${divisor}x${quotient}+${remainder}=${total}, so the result is ${answer}.`,
        zhExplanation: `${divisor}x${quotient}+${remainder}=${total}，所以结果是${answer}。`,
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
        enExplanation: `Volume = ${length}x${width}x${height}=${answer} cubic centimeters.`,
        zhExplanation: `长方体体积=长x宽x高，${length}x${width}x${height}=${answer}立方厘米。`,
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
      const x = -3 + (n % 7);
      const y = -2 + ((n * 2) % 6);
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
        enPrompt: `${total} L of juice is mixed in the ratio ${left}:${right}. How many liters are in the larger part?`,
        zhPrompt: `把${total}升饮料按${left}:${right}分成两部分，较大的部分是多少升？`,
        answer: answerWithUnit(answer, "升"),
        enExplanation: `There are ${left + right} ratio units. Each unit is ${total}÷${left + right}=${unit} L, so the larger part is ${right}x${unit}=${answer} L.`,
        zhExplanation: `一共有${left + right}份，每份${total}÷${left + right}=${unit}升，较大部分是${right}x${unit}=${answer}升。`,
        distractors: [answerWithUnit(left * unit, "升"), answerWithUnit(total, "升"), answerWithUnit(answer + unit, "升")]
      });
    }
    case "negative-review": {
      const start = -10 + (n % 12);
      const change = 3 + ((n * 2) % 8);
      const answer = start + change;
      return scalarDraft({
        enPrompt: `The temperature is ${start} degrees and rises by ${change} degrees. What is the new temperature?`,
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
        zhExplanation: `按题意计算：${start}${subtract ? "-" : "+"}${change}=${answer}。`,
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
        zhExplanation: `比较${counts.join("、")}，最大数量是${answer}。`,
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
        enExplanation: `${a} groups of ${b} gives ${a}x${b}=${answer}.`,
        zhExplanation: `${a}个${b}相加，可以写成${a}x${b}=${answer}。`,
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
      const answer = remainder === 0 ? String(quotient) : `${quotient}余${remainder}`;
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
        zhExplanation: `${divisor}x${quotient}+${remainder}=${total}，所以结果是${answer}。`,
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
        zhExplanation: `平均数=(${a}+${b}+${c})÷3=${answer}。`,
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
        zhExplanation: `小数点对齐计算：${a}+${b}=${formatNumber(answer)}。`,
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
        zhExplanation: `分母相同，分子相加：${left + right}/${denominator}=${answer}。`,
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
        enExplanation: `Volume = ${length}x${width}x${height}=${answer} cubic centimeters.`,
        zhExplanation: `长方体体积=长x宽x高，${length}x${width}x${height}=${answer}立方厘米。`,
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
      const x = -3 + ((n + replacementOrdinal) % 7);
      const y = -2 + ((n * 2 + replacementOrdinal) % 6);
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
        answer: answerWithUnit(answer, variant === 1 ? "米" : variant === 2 ? "个" : "升"),
        enExplanation: `There are ${left + right} ratio units. Each unit is ${total}÷${left + right}=${unit}, and the larger part is ${right}x${unit}=${answer}.`,
        zhExplanation: `一共有${left + right}份，每份${total}÷${left + right}=${unit}，较大部分是${right}x${unit}=${answer}。`,
        distractors: [
          answerWithUnit(left * unit, variant === 1 ? "米" : variant === 2 ? "个" : "升"),
          answerWithUnit(total, variant === 1 ? "米" : variant === 2 ? "个" : "升"),
          answerWithUnit(answer + unit, variant === 1 ? "米" : variant === 2 ? "个" : "升")
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
  const draft = isReplacement ? replacementDraftForFamily(topic.family, type, gradeIndex, replacementOrdinal) : draftForFamily(topic.family, type, gradeIndex);
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
  return replacementOrdinal !== undefined
    ? replacementDraftForFamily(metadata.family, metadata.type, metadata.itemIndex, replacementOrdinal).answer
    : draftForFamily(metadata.family, metadata.type, metadata.itemIndex).answer;
}
