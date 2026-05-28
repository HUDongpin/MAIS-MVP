import { traditionalToSimplifiedMap } from "@/lib/i18n";
import type { LocalizedText, QuestionType } from "@/types";

type HjbGeneratedAnswerSource = {
  type: Exclude<QuestionType, "graph">;
  answer: string;
  acceptedAnswers?: string[];
  optionsZhHans?: string[];
};

const generatorPromptPrefixPattern =
  /^\s*(?:(?:V\d+\s*)?(?:修复|安全)?变式|二轮变式)\d{1,4}\s*[:：]\s*(?:(?:解答|填空|选择)\s*[:：]\s*)?/u;

const simplifiedToTraditionalCharMap: Record<string, string> = Object.fromEntries(
  Object.entries(traditionalToSimplifiedMap).map(([traditional, simplified]) => [simplified, traditional])
);

const forcedTraditionalPhraseRules: ReadonlyArray<[string, string]> = [
  ["沪教版", "滬教版"],
  ["数学", "數學"],
  ["题目", "題目"],
  ["题", "題"],
  ["变式", "變式"],
  ["范围", "範圍"],
  ["选择", "選擇"],
  ["函数", "函數"],
  ["图像", "圖像"],
  ["图象", "圖像"],
  ["圖象", "圖像"],
  ["答案", "答案"],
  ["检查", "檢查"],
  ["计算", "計算"],
  ["练习", "練習"],
  ["课堂", "課堂"],
  ["课程", "課程"],
  ["学生", "學生"],
  ["学习", "學習"],
  ["老师", "老師"],
  ["数量", "數量"],
  ["数据", "數據"],
  ["统计", "統計"],
  ["概率", "概率"],
  ["圆", "圓"],
  ["线", "線"],
  ["实数", "實數"],
  ["证明", "證明"],
  ["应用", "應用"],
  ["问题", "問題"],
  ["条件", "條件"],
  ["关系", "關係"],
  ["结果", "結果"],
  ["错误", "錯誤"],
  ["等式", "等式"],
  ["不等式", "不等式"]
] as const;

const englishPhraseRules: ReadonlyArray<[string, string]> = [
  ["先化简，再求值", "Simplify first, then evaluate"],
  ["按规律填数", "Fill in the number according to the pattern"],
  ["在括号里填上合适的数", "Fill in a suitable number in the parentheses"],
  ["在横线上填上合适的数", "Fill in a suitable number in the blank"],
  ["在横线上填上适当的数", "Fill in an appropriate number in the blank"],
  ["在括号里填上适当的数", "Fill in an appropriate number in the parentheses"],
  ["分母有理化", "Rationalize the denominator"],
  ["因式分解", "Factorize"],
  ["分解因式", "Factorize"],
  ["合并同类项", "Combine like terms"],
  ["解不等式组", "Solve the system of inequalities"],
  ["解不等式", "Solve the inequality"],
  ["解方程组", "Solve the system of equations"],
  ["解方程", "Solve the equation"],
  ["比较大小", "Compare the sizes"],
  ["计算", "Calculate"],
  ["化简", "Simplify"],
  ["看图填空", "Use the diagram to fill in the blank"],
  ["下列各组式子中", "Among the following groups of expressions"],
  ["下列图形中", "Among the following figures"],
  ["下面哪个做法是正确的", "Which of the following actions is correct"],
  ["下面哪个小朋友的发现最像数学发现", "Which child's observation is most like a mathematical observation"],
  ["下面说法正确的是", "Which statement below is correct"],
  ["下面哪个说法正确", "Which statement below is correct"],
  ["下面哪个算式正确", "Which calculation below is correct"],
  ["下面哪个结果正确", "Which result below is correct"],
  ["下面有一些物品", "Some objects are shown below"],
  ["数学课上", "In math class"],
  ["数学游戏", "math game"],
  ["小乐", "Xiaole"],
  ["游戏规则", "Game rule"],
  ["听口令做动作", "listen and act"],
  ["请你仔细听", "listen carefully"],
  ["请你写出", "write down"],
  ["请每个小朋友", "ask each child to"],
  ["小朋友", "child"],
  ["同桌", "desk mate"],
  ["老师", "the teacher"],
  ["小明", "Xiaoming"],
  ["小刚", "Xiaogang"],
  ["小丽", "Xiaoli"],
  ["小芳", "Xiaofang"],
  ["小军", "Xiaojun"],
  ["同学", "student"],
  ["某市出租车收费标准如下", "A city's taxi fare rule is as follows"],
  ["某出租车公司收费标准为", "A taxi company's fare rule is"],
  ["某快递公司收费标准如下", "A courier company's fee rule is as follows"],
  ["某班学生参加课外活动小组的情况如下", "A class's participation in after-school activity groups is as follows"],
  ["某校九年级", "Grade 9 of a school"],
  ["采用如下方法", "uses the following method"],
  ["身高", "height"],
  ["单位", "unit"],
  ["厘米", "cm"],
  ["米", "m"],
  ["千米", "km"],
  ["小时", "hour"],
  ["分钟", "minute"],
  ["元", "yuan"],
  ["颗", "pieces"],
  ["块", "pieces"],
  ["下", "times"],
  ["扇窗户", "windows"],
  ["窗户", "windows"],
  ["教室", "classroom"],
  ["糖果", "candies"],
  ["积木块", "building blocks"],
  ["积木", "blocks"],
  ["盒子", "box"],
  ["拿出", "take out"],
  ["数一数", "count them"],
  ["先算", "first calculate"],
  ["再算", "then calculate"],
  ["先用", "first use"],
  ["再加", "then add"],
  ["剩下的", "the remaining"],
  ["这就是", "this is"],
  ["他用的方法是", "the method he used is"],
  ["用的方法是", "the method used is"],
  ["凑十法", "make-ten method"],
  ["破十法", "break-ten method"],
  ["想加算减", "use addition to calculate subtraction"],
  ["分拆减数", "decompose the subtrahend"],
  ["分拆", "decompose"],
  ["减数", "subtrahend"],
  ["加数", "addend"],
  ["被减数", "minuend"],
  ["差", "difference"],
  ["和", "sum"],
  ["告诉", "tell"],
  ["观察", "observe"],
  ["物品", "objects"],
  ["发现", "observation"],
  ["漂亮", "beautiful"],
  ["喜欢", "like"],
  ["颜色", "color"],
  ["红色", "red"],
  ["蓝色", "blue"],
  ["黄色", "yellow"],
  ["最多", "the most"],
  ["最少", "the least"],
  ["比", "than"],
  ["多", "more"],
  ["少", "less"],
  ["一共", "in total"],
  ["第一次", "the first time"],
  ["第二次", "the second time"],
  ["拍手", "claps"],
  ["拍", "clap"],
  ["规则", "rule"],
  ["正确", "correct"],
  ["错误", "incorrect"],
  ["认真", "carefully"],
  ["完成", "complete"],
  ["任务", "task"],
  ["直接", "directly"],
  ["放回", "put back"],
  ["唱歌", "sing"],
  ["大声", "loudly"],
  ["所含字母相同", "the letters are the same"],
  ["相同字母的指数", "the exponents of the same letters"],
  ["同类项", "like terms"],
  ["单项式", "monomial"],
  ["多项式", "polynomial"],
  ["一次项", "linear term"],
  ["常数项", "constant term"],
  ["括号前是负号", "there is a minus sign before the parentheses"],
  ["括号内各项都变号", "every term inside the parentheses changes sign"],
  ["去括号", "remove the parentheses"],
  ["代入", "substitute"],
  ["原式", "the original expression"],
  ["不含", "does not contain"],
  ["则", "then"],
  ["若", "if"],
  ["其中", "where"],
  ["已知全集", "Given the universal set"],
  ["全集", "universal set"],
  ["集合", "set"],
  ["补集", "complement"],
  ["交集", "intersection"],
  ["并集", "union"],
  ["属于", "belongs to"],
  ["只属于", "belongs to only"],
  ["元素个数", "number of elements"],
  ["元素", "elements"],
  ["能被", "divisible by"],
  ["整除", "divisible"],
  ["倍数", "multiples"],
  ["不超过", "not exceeding"],
  ["共有", "there are"],
  ["共", "there are"],
  ["答案", "answer"],
  ["参考", "reference"],
  ["方法", "method"],
  ["算", "calculate"],
  ["加", "add"],
  ["减", "subtract"],
  ["乘", "multiply"],
  ["除", "divide"],
  ["时", "when"],
  ["求", "find"],
  ["设", "Let"],
  ["已知", "Given"],
  ["用列举法表示", "List the elements of"],
  ["自然数", "natural number"],
  ["正约数", "positive divisor"],
  ["取值范围", "range of values"],
  ["所有可能取值", "all possible values"],
  ["实数", "real number"],
  ["命题", "proposition"],
  ["充分不必要条件", "sufficient but not necessary condition"],
  ["推出", "imply"],
  ["不能推出", "cannot imply"],
  ["端点取不到", "endpoints are not included"],
  ["不等式", "inequality"],
  ["等式", "equation"],
  ["方程", "equation"],
  ["方程组", "system of equations"],
  ["函数", "function"],
  ["图像", "graph"],
  ["图象", "graph"],
  ["定义域", "domain"],
  ["值域", "range"],
  ["单调递增", "increasing"],
  ["单调递减", "decreasing"],
  ["最小值", "minimum value"],
  ["最大值", "maximum value"],
  ["概率", "probability"],
  ["频率", "frequency"],
  ["平均数", "mean"],
  ["方差", "variance"],
  ["中位数", "median"],
  ["众数", "mode"],
  ["样本", "sample"],
  ["数据", "data"],
  ["统计", "statistics"],
  ["圆", "circle"],
  ["半径", "radius"],
  ["直径", "diameter"],
  ["面积", "area"],
  ["周长", "perimeter"],
  ["体积", "volume"],
  ["长方形", "rectangle"],
  ["正方形", "square"],
  ["三角形", "triangle"],
  ["直角三角形", "right triangle"],
  ["等腰三角形", "isosceles triangle"],
  ["平行四边形", "parallelogram"],
  ["梯形", "trapezoid"],
  ["轴对称图形", "axisymmetric figure"],
  ["线段", "line segment"],
  ["射线", "ray"],
  ["直线", "line"],
  ["角", "angle"],
  ["度", "degrees"],
  ["坐标", "coordinate"],
  ["横坐标", "x-coordinate"],
  ["纵坐标", "y-coordinate"],
  ["横轴", "x-axis"],
  ["纵轴", "y-axis"],
  ["点", "point"],
  ["先", "first"],
  ["再", "then"],
  ["最后", "finally"],
  ["然后", "then"],
  ["所以", "so"],
  ["因此", "therefore"],
  ["因为", "because"],
  ["注意", "note that"],
  ["故", "therefore"],
  ["得", "get"],
  ["为", "is"],
  ["是", "is"],
  ["和", "and"],
  ["与", "and"],
  ["或", "or"],
  ["且", "and"],
  ["及", "and"],
  ["在", "in"],
  ["中", "in"],
  ["内", "inside"],
  ["外", "outside"],
  ["的", "of"],
  ["了", ""]
] as const;

const fallbackChineseRunTranslations: Record<string, string> = {
  "一": "one",
  "二": "two",
  "三": "three",
  "四": "four",
  "五": "five",
  "六": "six",
  "七": "seven",
  "八": "eight",
  "九": "nine",
  "十": "ten",
  "零": "zero",
  "〇": "zero",
  "班": "class",
  "名": "students",
  "组": "group",
  "第": "No.",
  "年": "year",
  "级": "grade",
  "高": "high",
  "低": "low",
  "上": "upper",
  "下": "lower",
  "左": "left",
  "右": "right",
  "前": "before",
  "后": "after",
  "里": "inside",
  "外": "outside",
  "长": "length",
  "宽": "width",
  "边": "side",
  "底": "base",
  "份": "parts",
  "个": "items",
  "只": "items",
  "本": "books",
  "辆": "vehicles",
  "人": "people",
  "天": "days",
  "月": "months",
  "周": "weeks",
  "页": "pages",
  "棵": "trees",
  "条": "items",
  "次": "times",
  "种": "kinds",
  "男": "boys",
  "女": "girls",
  "甲": "A",
  "乙": "B",
  "丙": "C",
  "丁": "D",
  "红": "red",
  "蓝": "blue",
  "黄": "yellow",
  "白": "white",
  "黑": "black",
  "绿": "green",
  "数": "number",
  "字": "letter",
  "母": "letter",
  "指": "exponent",
  "都": "all",
  "含": "contain",
  "有": "have",
  "并": "and",
  "也": "also",
  "分": "part",
  "别": "separately",
  "相": "same",
  "同": "same",
  "要": "requires",
  "项": "term",
  "选": "option",
  "其": "other",
  "他": "other",
  "不": "not",
  "完": "complete",
  "全": "all",
  "解": "solve",
  "端": "end",
  "常": "constant",
  "值": "value",
  "两": "two",
  "去": "remove",
  "经": "pass",
  "过": "through",
  "说": "say",
  "从": "from",
  "你": "you",
  "我": "I",
  "拿": "take",
  "几": "how many",
  "听": "listen",
  "清": "clearly",
  "出": "out",
  "量": "quantity",
  "这": "this",
  "样": "way",
  "才": "only then",
  "学": "learn",
  "法": "method"
  ,
  "由": "by",
  "对": "opposite",
  "定": "definition",
  "义": "meaning",
  "结": "result",
  "果": "result",
  "等": "equal",
  "回": "answer",
  "答": "answer",
  "合": "combine",
  "起": "together",
  "来": "come",
  "记": "remember",
  "住": "keep",
  "看": "see",
  "到": "to",
  "用": "use",
  "哪": "which",
  "些": "items",
  "语": "language",
  "言": "language"
};

const extraFallbackChineseRunTranslations: Record<string, string> = {
  "式": "expression",
  "变": "variant",
  "复": "repair",
  "以": "use",
  "方": "square",
  "修": "fix",
  "所": "that",
  "得": "obtain",
  "面": "surface",
  "形": "shape",
  "角": "angle",
  "空": "blank",
  "择": "choice",
  "积": "product",
  "米": "meter",
  "线": "line",
  "均": "average",
  "直": "straight",
  "少": "less",
  "填": "fill",
  "球": "sphere",
  "体": "solid",
  "成": "become",
  "位": "place",
  "差": "difference",
  "向": "toward",
  "正": "positive",
  "率": "rate",
  "据": "data",
  "已": "given",
  "计": "calculate",
  "算": "calculate",
  "加": "add",
  "轮": "round",
  "函": "function",
  "于": "at",
  "圆": "circle",
  "间": "interval",
  "部": "part",
  "取": "take",
  "条": "condition",
  "情": "situation",
  "况": "case",
  "则": "then",
  "比": "compare",
  "若": "if",
  "实": "real",
  "件": "condition",
  "列": "list",
  "期": "period",
  "因": "factor",
  "斜": "slope",
  "确": "confirm",
  "总": "total",
  "理": "reason",
  "能": "can",
  "事": "event",
  "公": "common",
  "围": "range",
  "整": "integer",
  "素": "element",
  "根": "root",
  "入": "substitute",
  "垂": "perpendicular",
  "原": "original",
  "故": "therefore",
  "步": "step",
  "标": "label",
  "坐": "coordinate",
  "顶": "vertex",
  "可": "can",
  "无": "none",
  "减": "subtract",
  "轴": "axis",
  "示": "show",
  "书": "write",
  "概": "concept",
  "乘": "multiply",
  "除": "divide",
  "就": "then",
  "代": "substitute",
  "矩": "rectangle",
  "行": "parallel",
  "距": "distance",
  "按": "according",
  "把": "put",
  "之": "of",
  "明": "clear",
  "写": "write",
  "互": "mutual",
  "即": "namely",
  "首": "first",
  "程": "equation",
  "单": "single",
  "序": "order",
  "半": "half",
  "子": "item",
  "设": "let",
  "邻": "adjacent",
  "径": "diameter",
  "内": "inside",
  "段": "segment",
  "千": "thousand",
  "关": "relation",
  "离": "distance",
  "发": "happen",
  "或": "or",
  "心": "center",
  "请": "please",
  "袋": "bag",
  "椭": "ellipse",
  "余": "remainder",
  "意": "meaning",
  "交": "intersect",
  "增": "increase",
  "应": "correspond",
  "类": "class",
  "作": "make",
  "水": "water",
  "笔": "pens",
  "倍": "times",
  "限": "limit",
  "随": "follow",
  "当": "when",
  "被": "by",
  "移": "translate",
  "切": "tangent",
  "错": "wrong",
  "接": "connect",
  "系": "relation",
  "价": "price",
  "放": "put",
  "剩": "remaining",
  "又": "again",
  "如": "as",
  "象": "image",
  "它": "it",
  "张": "sheets"
};

function applyPhraseRules(value: string, rules: ReadonlyArray<[string, string]>) {
  return [...rules]
    .sort((left, right) => right[0].length - left[0].length)
    .reduce((current, [source, replacement]) => current.split(source).join(replacement), value);
}

function applyEnglishPhraseRules(value: string) {
  return [...englishPhraseRules]
    .sort((left, right) => right[0].length - left[0].length)
    .reduce((current, [source, replacement]) => {
      const padded = /[A-Za-z]/.test(replacement) ? ` ${replacement} ` : replacement;
      return current.split(source).join(padded);
    }, value);
}

function normalizeMathGlyphs(value: string) {
  return value
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/⁵/g, "^5")
    .replace(/⁶/g, "^6")
    .replace(/⁷/g, "^7")
    .replace(/⁸/g, "^8")
    .replace(/⁹/g, "^9")
    .replace(/⁰/g, "^0")
    .replace(/ᵐ/g, "^m")
    .replace(/ⁿ/g, "^n")
    .replace(/⁺/g, "+")
    .replace(/⁻/g, "-")
    .replace(/⁼/g, "=")
    .replace(/（\s*）/g, "( )")
    .replace(/（\s*　\s*）/g, "( )")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/，/g, ", ")
    .replace(/。/g, ". ")
    .replace(/；/g, "; ")
    .replace(/：/g, ": ")
    .replace(/、/g, ", ")
    .replace(/“|”/g, "\"")
    .replace(/《|》/g, "\"")
    .replace(/　/g, " ");
}

function cleanupEnglishSpacing(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([({\[])\s+/g, "$1")
    .replace(/\s+([)}\]])/g, "$1")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*([=<>≤≥≈])\s*/g, " $1 ")
    .replace(/\s+/g, " ")
    .replace(/\bLet\s+Let\b/g, "Let")
    .replace(/\bGiven\s+Given\b/g, "Given")
    .replace(/\bthe the\b/gi, "the")
    .trim();
}

function formatInlineMath(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/([+\-*/=<>≤≥])/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function translateHjbTemplate(value: string) {
  const normalized = value.trim();

  const inequalityRightConstant = normalized.match(/^解不等式\s*([^，。]+)，求\s*x\s*的取值范围右端常数\s*([^，。]+)\s*的值。?$/);
  if (inequalityRightConstant) {
    return `Solve the inequality ${formatInlineMath(inequalityRightConstant[1])}. Find the value of the right-end constant ${formatInlineMath(inequalityRightConstant[2])} in the solution range for x.`;
  }

  const subtractBothSides = normalized.match(/^两边同时减去\s*([^，。]+)，得\s*([^，。]+)。?$/);
  if (subtractBothSides) {
    return `Subtract ${formatInlineMath(subtractBothSides[1])} from both sides to get ${formatInlineMath(subtractBothSides[2])}.`;
  }

  const setDivisibilityCount = normalized.match(/^设集合\s*A=\{1,2,3,\.\.\.,(\d+)\}，集合\s*B\s*为其中能被\s*([0-9]+)\s*整除的数。求集合\s*B\s*的元素个数。?$/);
  if (setDivisibilityCount) {
    return `Let A = {1, 2, 3, ..., ${setDivisibilityCount[1]}}. Let B be the numbers in A that are divisible by ${setDivisibilityCount[2]}. Find the number of elements in B.`;
  }

  const setExclusiveCount = normalized.match(/^设集合\s*A=\{1,2,3,\.\.\.,(\d+)\}，B\s*为\s*A\s*中能被\s*([0-9]+)\s*整除的数，C\s*为\s*A\s*中能被\s*([0-9]+)\s*整除的数。求只属于\s*B\s*和\s*C\s*中一个集合的元素个数。?$/);
  if (setExclusiveCount) {
    return `Let A = {1, 2, 3, ..., ${setExclusiveCount[1]}}. Let B be the numbers in A divisible by ${setExclusiveCount[2]}, and let C be the numbers in A divisible by ${setExclusiveCount[3]}. Find how many elements belong to exactly one of B and C.`;
  }

  const setDivisibilityExplanation = normalized.match(/^B\s*中元素为不超过\s*(\d+)\s*的\s*([0-9]+)\s*的倍数，共\s*floor\(([^)]+)\)=([^。]+)\s*个。?$/);
  if (setDivisibilityExplanation) {
    return `The elements of B are the multiples of ${setDivisibilityExplanation[2]} not exceeding ${setDivisibilityExplanation[1]}, so there are floor(${setDivisibilityExplanation[3]}) = ${setDivisibilityExplanation[4]} elements.`;
  }

  const exclusiveCountExplanation = normalized.match(/^\|B\|=floor\(([^)]+)\)=([^，]+)，\|C\|=floor\(([^)]+)\)=([^，]+)，\|B∩C\|=floor\(([^)]+)\)=([^。]+)。只属于一个集合的元素个数为\s*\|B\|\+\|C\|-2\|B∩C\|=([^。]+)。?$/);
  if (exclusiveCountExplanation) {
    return `|B| = floor(${exclusiveCountExplanation[1]}) = ${exclusiveCountExplanation[2]}, |C| = floor(${exclusiveCountExplanation[3]}) = ${exclusiveCountExplanation[4]}, and |B ∩ C| = floor(${exclusiveCountExplanation[5]}) = ${exclusiveCountExplanation[6]}. The number of elements that belong to exactly one set is |B| + |C| - 2|B ∩ C| = ${exclusiveCountExplanation[7]}.`;
  }

  const logValue = normalized.match(/^已知\s*log_([0-9]+)\(\1\^([0-9]+)\)=m，求\s*m。?$/);
  if (logValue) {
    return `Given log_${logValue[1]}(${logValue[1]}^${logValue[2]}) = m, find m.`;
  }

  const exponentialFunctionValue = normalized.match(/^函数\s*f\(x\)=([0-9]+)\^x，求\s*f\(2\)。?$/);
  if (exponentialFunctionValue) {
    return `For the function f(x) = ${exponentialFunctionValue[1]}^x, find f(2).`;
  }

  return null;
}

function translateRemainingChineseRun(run: string) {
  return Array.from(run)
    .map((char) => fallbackChineseRunTranslations[char] ?? extraFallbackChineseRunTranslations[char] ?? `term-${char.codePointAt(0)?.toString(16) ?? "unknown"}`)
    .join(" ")
    .replace(/\bterm-([a-f0-9]+)(?:\s+term-[a-f0-9]+)+\b/g, (match) => match.replace(/\s+/g, "-"));
}

export function stripHjbGeneratorPromptPrefix(value: string) {
  return value.replace(generatorPromptPrefixPattern, "").trim();
}

export function toTraditionalHjbText(value: string) {
  const cleaned = stripHjbGeneratorPromptPrefix(value);
  const converted = Array.from(cleaned)
    .map((char) => simplifiedToTraditionalCharMap[char] ?? char)
    .join("");
  return applyPhraseRules(converted, forcedTraditionalPhraseRules);
}

export function translateHjbTextToEnglish(value: string) {
  const cleaned = stripHjbGeneratorPromptPrefix(value);
  const templateTranslation = translateHjbTemplate(cleaned);
  if (templateTranslation) return cleanupEnglishSpacing(templateTranslation);

  const normalized = normalizeMathGlyphs(cleaned);
  const translated = applyEnglishPhraseRules(normalized)
    .replace(/([A-D])\.\s*/g, "$1. ")
    .replace(/______+/g, "______")
    .replace(/[\u3400-\u9fff]+/g, translateRemainingChineseRun);

  return cleanupEnglishSpacing(translated);
}

export function localizeHjbGeneratedText(value: string): LocalizedText {
  const zhHans = stripHjbGeneratorPromptPrefix(value);
  return {
    en: translateHjbTextToEnglish(zhHans),
    zh: toTraditionalHjbText(zhHans),
    zhHans
  };
}

function normalizeAlias(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(/[，。；：、]/g, "")
    .replace(/[,.。]/g, "");
}

function uniqueNonEmpty(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  });
  return result;
}

export function localizedHjbGeneratedAcceptedAnswers(question: HjbGeneratedAnswerSource) {
  const sourceAliases = uniqueNonEmpty([question.answer, ...(question.acceptedAnswers ?? [])]);
  const localizedAnswer = localizeHjbGeneratedText(question.answer);
  const localizedOptionAliases = (question.optionsZhHans ?? [])
    .filter((option) => sourceAliases.some((answer) => normalizeAlias(answer) === normalizeAlias(option)))
    .flatMap((option) => {
      const localized = localizeHjbGeneratedText(option);
      return [localized.en, localized.zh, localized.zhHans ?? ""];
    });

  return uniqueNonEmpty([
    ...sourceAliases,
    localizedAnswer.en,
    localizedAnswer.zh,
    localizedAnswer.zhHans ?? "",
    ...localizedOptionAliases
  ]);
}
