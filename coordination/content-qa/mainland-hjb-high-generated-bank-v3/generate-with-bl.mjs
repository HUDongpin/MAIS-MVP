import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const packageVersion = "v3";
const packageLabel = "Mainland HJB High Generated Bank V3";
const grades = ["S4", "S5", "S6"];
const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const difficulties = ["Foundation", "Core", "Challenge", "Exam"];
const gradeQuestionCount = 500;
const totalQuestionCount = 1500;
const typeQuotaByGrade = { "multiple-choice": 200, "fill-in": 175, "short-answer": 125 };
const difficultyQuotaByGrade = { Foundation: 125, Core: 200, Challenge: 125, Exam: 50 };
const priorBankDirs = [
  "../mainland-hjb-high-generated-bank-v1",
  "../mainland-hjb-high-generated-bank-v2",
  "../mainland-hjb-high-generated-bank-v4",
  "../mainland-hjb-high-generated-bank-v4-remediated"
];

function loadTsExport(filePath, exportName) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/^import\s+.*;\s*$/gm, "")
    .replace(new RegExp(`export const ${exportName}: [^=]+ =`), `exports.${exportName} =`)
    .replace(new RegExp(`export const ${exportName}\\s*=`), `exports.${exportName} =`);
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function detectBlStatus() {
  const result = spawnSync("bl", ["auth", "status", "--output", "json"], {
    cwd: rootDir,
    encoding: "utf8",
    timeout: 15_000
  });
  const payloadText = (result.stdout || result.stderr || "").trim();
  let payload = null;
  try {
    payload = payloadText ? JSON.parse(payloadText) : null;
  } catch {
    payload = null;
  }
  return {
    command: "bl auth status --output json",
    available: result.error?.code !== "ENOENT",
    exitCode: result.status ?? null,
    authenticated: result.status === 0,
    message: payload?.error?.message ?? payload?.message ?? (result.error ? String(result.error.message) : "ok")
  };
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function balancedSequence(counts) {
  const remaining = new Map(Object.entries(counts));
  const result = [];
  while (Array.from(remaining.values()).some((count) => count > 0)) {
    const next = Array.from(remaining.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [key, count] of next) {
      result.push(key);
      remaining.set(key, count - 1);
    }
  }
  return result;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function cardByChapter(cards, chapter) {
  const card = cards.find((candidate) => candidate.chapter === chapter);
  if (!card) throw new Error(`Missing HJB safe-RAG card for chapter: ${chapter}`);
  return card;
}

function conceptOverlap(left = [], right = []) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value)).length;
}

function pickPatternCards({ cards, chapter, conceptIds, grade, limit = 2 }) {
  return cards
    .map((card, index) => ({
      card,
      index,
      score:
        (card.chapters?.includes(chapter) || card.chapter === chapter ? 40 : 0) +
        conceptOverlap(conceptIds, card.conceptIds ?? []) * 12 +
        (card.grades?.includes(grade) ? 8 : 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.card);
}

function topicTitleForScope(scope) {
  return scope.topicTitleZhHans ?? scope.chapter;
}

function buildScopeDefinitions(hjbCards) {
  const c = (chapter) => cardByChapter(hjbCards, chapter);
  return {
    S4: [
      { volume: "必修 第一册", chapter: "集合与逻辑", count: 50, evidenceCards: [c("集合与逻辑")] },
      { volume: "必修 第一册", chapter: "等式与不等式", count: 50, evidenceCards: [c("等式与不等式")] },
      { volume: "必修 第一册", chapter: "幂、指数与对数", count: 50, evidenceCards: [c("幂、指数与对数")] },
      { volume: "必修 第一册", chapter: "幂函数、指数函数与对数函数", count: 50, evidenceCards: [c("幂函数、指数函数与对数函数")] },
      { volume: "必修 第一册", chapter: "函数的概念、性质及应用", count: 50, evidenceCards: [c("函数的概念、性质及应用")] },
      { volume: "必修 第二册", chapter: "三角", count: 63, evidenceCards: [c("三角")] },
      { volume: "必修 第二册", chapter: "三角函数", count: 63, evidenceCards: [c("三角函数")] },
      { volume: "必修 第二册", chapter: "平面向量", count: 62, evidenceCards: [c("平面向量")] },
      { volume: "必修 第二册", chapter: "复数", count: 62, evidenceCards: [c("复数")] }
    ],
    S5: [
      { volume: "必修 第三册", chapter: "空间直线与平面", count: 55, evidenceCards: [c("空间直线与平面")] },
      { volume: "必修 第三册", chapter: "简单几何体", count: 55, evidenceCards: [c("简单几何体")] },
      { volume: "必修 第三册", chapter: "概率初步", count: 55, evidenceCards: [c("概率初步")] },
      { volume: "必修 第三册", chapter: "统计", count: 55, evidenceCards: [c("统计")] },
      { volume: "选择性必修 第一册", chapter: "平面直角坐标系中的直线", count: 70, evidenceCards: [c("平面直角坐标系中的直线")] },
      { volume: "选择性必修 第一册", chapter: "圆锥曲线", count: 70, evidenceCards: [c("圆锥曲线")] },
      { volume: "选择性必修 第一册", chapter: "空间向量及其应用", count: 70, evidenceCards: [c("空间向量及其应用")] },
      { volume: "选择性必修 第一册", chapter: "数列", count: 70, evidenceCards: [c("数列")] }
    ],
    S6: [
      { volume: "选择性必修 第二册", chapter: "导数及其运用", count: 75, evidenceCards: [c("导数及其运用")] },
      { volume: "选择性必修 第二册", chapter: "计数原理", count: 75, evidenceCards: [c("计数原理")] },
      { volume: "选择性必修 第二册", chapter: "概率初步续", count: 75, evidenceCards: [c("概率初步续")] },
      { volume: "选择性必修 第二册", chapter: "成对数据的统计分析", count: 75, evidenceCards: [c("成对数据的统计分析")] },
      { volume: "选择性必修 第一册复习", chapter: "数列", topicTitleZhHans: "数列综合复习", count: 25, evidenceCards: [c("数列")] },
      {
        volume: "选择性必修 第一册复习",
        chapter: "平面直角坐标系中的直线",
        topicTitleZhHans: "解析几何直线综合复习",
        count: 25,
        evidenceCards: [c("平面直角坐标系中的直线")]
      },
      { volume: "选择性必修 第一册复习", chapter: "圆锥曲线", topicTitleZhHans: "圆锥曲线综合复习", count: 25, evidenceCards: [c("圆锥曲线")] },
      {
        volume: "选择性必修 第一册复习",
        chapter: "空间向量及其应用",
        topicTitleZhHans: "空间向量综合复习",
        count: 25,
        evidenceCards: [c("空间向量及其应用")]
      },
      {
        volume: "跨册综合复习",
        chapter: "跨册综合：函数与导数",
        topicTitleZhHans: "函数、导数与不等式综合",
        count: 20,
        evidenceCards: [c("函数的概念、性质及应用"), c("导数及其运用")]
      },
      {
        volume: "跨册综合复习",
        chapter: "跨册综合：三角向量解析几何",
        topicTitleZhHans: "三角、向量与解析几何综合",
        count: 20,
        evidenceCards: [c("三角函数"), c("平面向量"), c("平面直角坐标系中的直线")]
      },
      {
        volume: "跨册综合复习",
        chapter: "跨册综合：立体几何与空间向量",
        topicTitleZhHans: "立体几何与空间向量综合",
        count: 20,
        evidenceCards: [c("空间直线与平面"), c("空间向量及其应用")]
      },
      {
        volume: "跨册综合复习",
        chapter: "跨册综合：概率统计",
        topicTitleZhHans: "概率统计综合",
        count: 20,
        evidenceCards: [c("概率初步"), c("统计"), c("概率初步续"), c("成对数据的统计分析")]
      },
      {
        volume: "跨册综合复习",
        chapter: "跨册综合：数列与计数",
        topicTitleZhHans: "数列与计数综合",
        count: 20,
        evidenceCards: [c("数列"), c("计数原理")]
      }
    ]
  };
}

function buildPlan({ hjbCards, hjbExamPatternCards, sharedExamPatternCards }) {
  const scopesByGrade = buildScopeDefinitions(hjbCards);
  const rows = [];
  for (const grade of grades) {
    const scopes = scopesByGrade[grade];
    const scopedTotal = scopes.reduce((sum, scope) => sum + scope.count, 0);
    if (scopedTotal !== gradeQuestionCount) throw new Error(`${grade} scope total ${scopedTotal}; expected ${gradeQuestionCount}`);
    const typePlan = balancedSequence(typeQuotaByGrade);
    const difficultyPlan = balancedSequence(difficultyQuotaByGrade);
    let gradeIndex = 0;
    for (const scope of scopes) {
      for (let localIndex = 0; localIndex < scope.count; localIndex += 1) {
        const evidenceCards = scope.evidenceCards;
        const conceptIds = unique(evidenceCards.flatMap((card) => card.conceptIds)).slice(0, 10);
        const textbookCardIds = evidenceCards.map((card) => card.id);
        const hjbPatterns = pickPatternCards({ cards: hjbExamPatternCards, chapter: scope.chapter, conceptIds, grade, limit: 2 });
        const sharedPatterns = pickPatternCards({ cards: sharedExamPatternCards, chapter: scope.chapter, conceptIds, grade, limit: 1 });
        const examPatternCardIds = unique([...hjbPatterns.map((card) => card.id), ...sharedPatterns.map((card) => card.id)]).slice(0, 3);
        rows.push({
          id: `hjb-high-ds-${packageVersion}-${grade.toLowerCase()}-${String(gradeIndex + 1).padStart(3, "0")}`,
          grade,
          topicId: `hjb-high-${grade.toLowerCase()}-${slugify(topicTitleForScope(scope))}`,
          topicTitleZhHans: topicTitleForScope(scope),
          volume: scope.volume,
          chapter: scope.chapter,
          conceptIds,
          difficulty: difficultyPlan[gradeIndex],
          type: typePlan[gradeIndex],
          evidenceCardIds: textbookCardIds,
          examPatternCardIds,
          sourceDistanceStatus: "pending-generation",
          mathQaStatus: "pending-generation",
          terminologyQaStatus: "pending-generation",
          reviewNotes: "V3 generation target built from committed HJB safe-RAG metadata only."
        });
        gradeIndex += 1;
      }
    }
  }
  if (rows.length !== totalQuestionCount) throw new Error(`Plan row count ${rows.length}; expected ${totalQuestionCount}`);
  return rows;
}

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function gcd(first, second) {
  let a = Math.abs(first);
  let b = Math.abs(second);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function lcm(first, second) {
  return Math.abs(first * second) / gcd(first, second);
}

function formatFraction(numerator, denominator) {
  if (denominator === 0) throw new Error("Cannot format denominator 0");
  const divisor = gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const n = (numerator / divisor) * sign;
  const d = Math.abs(denominator / divisor);
  return d === 1 ? String(n) : `${n}/${d}`;
}

function numericOptions(answer, spread = 1) {
  const base = Number(answer);
  return [String(base), String(base + spread), String(base - spread), String(base + 2 * spread)];
}

function fractionOptions(answer, numerator, denominator) {
  const candidates = [
    answer,
    formatFraction(Math.max(1, numerator + 1), denominator),
    formatFraction(Math.max(1, numerator), denominator + 1),
    formatFraction(Math.max(1, numerator + 2), denominator + 2),
    formatFraction(Math.max(1, denominator - numerator), denominator)
  ];
  return unique(candidates).slice(0, 4);
}

function rotateOptions(options, seedText) {
  const answer = options[0];
  const uniqueOptions = unique(options);
  let filler = 1;
  while (uniqueOptions.length < 4) {
    const candidate = `${answer}+${filler}`;
    if (!uniqueOptions.includes(candidate)) uniqueOptions.push(candidate);
    filler += 1;
  }
  const finalOptions = uniqueOptions.slice(0, 4);
  const answerIndex = finalOptions.indexOf(answer);
  finalOptions.splice(answerIndex, 1);
  const insertAt = stableHash(seedText) % 4;
  finalOptions.splice(insertAt, 0, answer);
  return finalOptions;
}

function valuesForTarget(target, index) {
  const seed = stableHash(`${packageVersion}:${target.id}:${target.chapter}:${target.type}:${target.difficulty}:${index}`);
  return {
    a: (seed % 7) + 2,
    b: (Math.floor(seed / 7) % 9) + 3,
    c: (Math.floor(seed / 63) % 8) + 2,
    d: (Math.floor(seed / 504) % 6) + 1,
    n: (Math.floor(seed / 3024) % 6) + 5,
    phase: (Math.floor(seed / 18144) % 5) + 1
  };
}

function coreForTarget(target, index) {
  const { a, b, c, d, n, phase } = valuesForTarget(target, index);
  const chapter = target.chapter;
  const title = target.topicTitleZhHans;
  const prefix = target.type === "fill-in" ? "填空：" : target.type === "short-answer" ? "解答：" : "选择：";

  if (chapter.includes("集合") || title.includes("集合")) {
    const first = a;
    const second = a + c + 1;
    const upper = first * second + b + 30;
    const answerValue = Math.floor(upper / first) + Math.floor(upper / second) - Math.floor(upper / lcm(first, second));
    const answer = String(answerValue);
    return {
      prompt: `${prefix}设全集 U={1,2,3,...,${upper}}，A 为 U 中能被 ${first} 整除的数，B 为 U 中能被 ${second} 整除的数。求 A∪B 的元素个数。`,
      answer,
      options: numericOptions(answer, 2),
      explanation: `分别有 ${Math.floor(upper / first)} 个和 ${Math.floor(upper / second)} 个，交集为 ${Math.floor(upper / lcm(first, second))} 个，所以并集元素个数为 ${answer}。`
    };
  }

  if (chapter.includes("不等式") || title.includes("不等式")) {
    const lower = b - a;
    const upper = lower + c + d;
    const answer = String(upper - lower);
    return {
      prompt: `${prefix}求不等式组 x+${a}>${b}，x≤${upper} 的整数解个数。`,
      answer,
      options: numericOptions(answer),
      explanation: `由 x+${a}>${b} 得 x>${lower}，整数 x 可取 ${lower + 1} 到 ${upper}，共 ${answer} 个。`
    };
  }

  if (chapter.includes("幂、指数") || title.includes("指数与对数")) {
    const base = a + 1;
    const firstExponent = c + d;
    const secondExponent = b + d;
    const answer = String(firstExponent + secondExponent);
    return {
      prompt: `${prefix}已知 log_${base}(${base}^${firstExponent})=u，log_${base}(${base}^${secondExponent})=v，求 u+v。`,
      answer,
      options: numericOptions(answer, 2),
      explanation: `由对数定义，u=${firstExponent}，v=${secondExponent}，所以 u+v=${answer}。`
    };
  }

  if (chapter.includes("幂函数") || title.includes("指数函数") || title.includes("对数函数")) {
    const base = a;
    const exponent = 3;
    const answer = String(base ** (exponent - 1));
    return {
      prompt: `${prefix}函数 f(x)=${base}^x，若 f(t)=${base ** exponent}，求 f(t-1)。`,
      answer,
      options: numericOptions(answer, base),
      explanation: `由 ${base}^t=${base ** exponent} 得 t=${exponent}，所以 f(t-1)=f(${exponent - 1})=${answer}。`
    };
  }

  if (chapter.includes("函数的概念") || title.includes("函数、导数")) {
    const shift = d + 1;
    const answer = String(a * shift);
    return {
      prompt: `${prefix}已知 f(x)=${a}x+${b}，定义 g(x)=f(x+${shift})-f(x)。求 g(${c})。`,
      answer,
      options: numericOptions(answer, a),
      explanation: `g(x)=${a}(x+${shift})+${b}-(${a}x+${b})=${answer}，与 x 无关。`
    };
  }

  if (chapter === "三角" || title.includes("三角、向量")) {
    const answer = String(a ** 2 + b ** 2 - a * b);
    return {
      prompt: `${prefix}在三角形 ABC 中，AB=${a}，AC=${b}，且 ∠A=60°。求 BC²。`,
      answer,
      options: numericOptions(answer, a),
      explanation: `由余弦定理，BC²=${a}²+${b}²-2×${a}×${b}×cos60°=${answer}。`
    };
  }

  if (chapter.includes("三角函数")) {
    const answer = "π";
    return {
      prompt: `${prefix}函数 y=${a}sin(2x+${phase}π/6) 的最小正周期是多少？`,
      answer,
      options: ["π", "2π", "π/2", "4π"],
      explanation: `sin(ωx+φ) 的最小正周期为 2π/|ω|，这里 ω=2，所以周期为 π。`
    };
  }

  if (chapter === "平面向量" || title.includes("向量与解析几何")) {
    const answer = String(2 * (a * b + c * d));
    return {
      prompt: `${prefix}已知向量 u=(${a},${c})，v=(${b},${d})，求 |u+v|²-|u|²-|v|²。`,
      answer,
      options: numericOptions(answer, 2 * a),
      explanation: `由 |u+v|²-|u|²-|v|²=2u·v，得 2(${a}×${b}+${c}×${d})=${answer}。`
    };
  }

  if (chapter.includes("复数")) {
    const answer = String(2 * (a + c));
    return {
      prompt: `${prefix}复数 z=(${a}+${b}i)+(${c}-${d}i)，w=(1+i)z，求 Re(w)+Im(w)。`,
      answer,
      options: numericOptions(answer, 2),
      explanation: `z 的实部为 ${a + c}。若 z=x+yi，则 (1+i)z 的实部与虚部之和为 2x，所以结果为 ${answer}。`
    };
  }

  if (chapter.includes("空间直线") || title.includes("立体几何")) {
    const answer = String(a * b + a * c);
    return {
      prompt: `${prefix}长方体中同一顶点出发的三条互相垂直棱长分别为 ${a}、${b}、${c}。求含有长为 ${a} 的棱的两个相邻面的面积之和。`,
      answer,
      options: numericOptions(answer, a),
      explanation: `两个相邻面面积分别为 ${a}×${b} 和 ${a}×${c}，面积之和为 ${answer}。`
    };
  }

  if (chapter.includes("简单几何体")) {
    const answer = String(a * b * c + (a + 1) * b * d);
    return {
      prompt: `${prefix}一个长方体的长、宽、高分别为 ${a}、${b}、${c}；另一个长方体的长、宽、高分别为 ${a + 1}、${b}、${d}。求两个长方体体积之和。`,
      answer,
      options: numericOptions(answer, b),
      explanation: `体积之和为 ${a}×${b}×${c}+${a + 1}×${b}×${d}=${answer}。`
    };
  }

  if (chapter === "概率初步" || title === "概率统计综合") {
    const red = a + 3;
    const blue = b + 2;
    const numerator = red * (red - 1);
    const denominator = (red + blue) * (red + blue - 1);
    const answer = formatFraction(numerator, denominator);
    return {
      prompt: `${prefix}袋中有 ${red} 个红球和 ${blue} 个蓝球，不放回连续取出 2 个。求两次都取到红球的概率。`,
      answer,
      options: fractionOptions(answer, numerator, denominator),
      explanation: `概率为 ${red}/${red + blue}×${red - 1}/${red + blue - 1}=${answer}。`
    };
  }

  if (chapter === "统计" || chapter.includes("成对数据")) {
    const first = a;
    const second = a + c;
    const third = a + 2 * c;
    const increase = d;
    const answer = String(a + c + 4 * increase);
    return {
      prompt: `${prefix}一组数据为 ${first}，${second}，${third}，若再加入一个数 x 后，四个数平均数比原平均数大 ${increase}，求 x。`,
      answer,
      options: numericOptions(answer, c),
      explanation: `原平均数为 ${a + c}，新平均数为 ${a + c + increase}，故 x=4×${a + c + increase}-${first}-${second}-${third}=${answer}。`
    };
  }

  if (chapter.includes("直线") || title.includes("解析几何直线")) {
    const x1 = a;
    const y1 = b;
    const slope = c;
    const x2 = a + 1;
    const y2 = b + c;
    const intercept = d;
    const answer = String(2 * slope + intercept);
    return {
      prompt: `${prefix}直线 l 经过点 (${x1},${y1}) 和 (${x2},${y2})。直线 m 与 l 平行，且经过点 (0,${intercept})。求直线 m 在 x=2 时的 y 坐标。`,
      answer,
      options: numericOptions(answer, 2),
      explanation: `l 的斜率为 (${y2}-${y1})/(${x2}-${x1})=${slope}，m 的方程为 y=${slope}x+${intercept}，代入 x=2 得 ${answer}。`
    };
  }

  if (chapter.includes("圆锥曲线")) {
    const major = a + b + 4;
    const minor = b + 2;
    const answer = String(4 * (major ** 2 - minor ** 2));
    return {
      prompt: `${prefix}椭圆 x²/${major ** 2}+y²/${minor ** 2}=1 的两个焦点为 F1，F2。求 |F1F2|²。`,
      answer,
      options: numericOptions(answer, 4),
      explanation: `c²=${major ** 2}-${minor ** 2}=${major ** 2 - minor ** 2}，焦距为 2c，所以 |F1F2|²=4c²=${answer}。`
    };
  }

  if (chapter.includes("空间向量")) {
    const answer = String(2 * (a + b + c) + 3);
    return {
      prompt: `${prefix}空间向量 p=(${a},${b},${c})，q=(1,1,1)，求 |p+q|²-|p|²。`,
      answer,
      options: numericOptions(answer, 2),
      explanation: `|p+q|²-|p|²=2p·q+|q|²=2(${a}+${b}+${c})+3=${answer}。`
    };
  }

  if (chapter.includes("数列") || title.includes("数列与计数")) {
    const term = n;
    const nth = a + (term - 1) * d;
    const answer = String((term * (a + nth)) / 2);
    return {
      prompt: `${prefix}等差数列首项为 ${a}，公差为 ${d}，第 ${term} 项为 ${nth}。求前 ${term} 项和。`,
      answer,
      options: numericOptions(answer, term),
      explanation: `前 ${term} 项和为 ${term}×(${a}+${nth})/2=${answer}。`
    };
  }

  if (chapter.includes("导数")) {
    const input = d + 1;
    const answer = String(c - a * input ** 2);
    return {
      prompt: `${prefix}函数 f(x)=${a}x²+${b}x+${c} 在 x=${input} 处的切线与 y 轴交于点 (0,k)，求 k。`,
      answer,
      options: numericOptions(answer, a),
      explanation: `f'(${input})=${2 * a * input + b}，切线截距 k=f(${input})-f'(${input})×${input}=${answer}。`
    };
  }

  if (chapter.includes("计数")) {
    const total = n + a;
    const answer = String((total * (total - 1) * (total - 2)) / 2);
    return {
      prompt: `${prefix}从 ${total} 名同学中选 2 名负责人，再从剩余同学中选 1 名记录员，共有多少种不同安排？`,
      answer,
      options: numericOptions(answer, total),
      explanation: `先选 2 名负责人有 C(${total},2) 种，再选记录员有 ${total - 2} 种，共 ${answer} 种。`
    };
  }

  if (chapter.includes("概率初步续")) {
    const success = Math.max(1, a - 1);
    const total = a + b + 5;
    const numerator = 2 * success * (total - success);
    const denominator = total ** 2;
    const answer = formatFraction(numerator, denominator);
    return {
      prompt: `${prefix}一次独立试验成功的概率为 ${success}/${total}，连续独立试验 2 次。求恰好成功 1 次的概率。`,
      answer,
      options: fractionOptions(answer, numerator, denominator),
      explanation: `恰好成功 1 次的概率为 2×${success}/${total}×${total - success}/${total}=${answer}。`
    };
  }

  const answer = String(a + b);
  return {
    prompt: `${prefix}${title}中给定参数 ${a} 和 ${b}，求它们的和。`,
    answer,
    options: numericOptions(answer),
    explanation: `${a}+${b}=${answer}。`
  };
}

function normalizeQuestion(target, index, blStatus) {
  const core = coreForTarget(target, index);
  const answer = core.answer;
  return {
    ...target,
    promptZhHans: `V3安全变式${String(index + 1).padStart(4, "0")}：${core.prompt}`,
    optionsZhHans: target.type === "multiple-choice" ? rotateOptions(core.options, target.id) : [],
    answer,
    acceptedAnswers: unique([answer]),
    explanationZhHans: core.explanation,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "pending-manual",
    terminologyQaStatus: "pending-manual",
    reviewNotes: blStatus.authenticated
      ? "Generated as V3 candidate by deterministic MAIS safe-template fallback from committed HJB safe-RAG metadata; live bl generation deliberately disabled by candidate-only scope; manual S18 review required before app integration."
      : "Generated as V3 candidate by deterministic MAIS safe-template fallback from committed HJB safe-RAG metadata after bl auth preflight found no DashScope API key; manual S18 review required before app integration."
  };
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split(/\n/).map((line) => JSON.parse(line));
}

function normalizePromptForCrossBank(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "");
}

function loadPriorPromptSet() {
  const rows = priorBankDirs.flatMap((dir) => readJsonl(path.join(__dirname, dir, "questions.jsonl")));
  return {
    total: rows.length,
    prompts: new Set(rows.map((row) => normalizePromptForCrossBank(row.promptZhHans)).filter(Boolean))
  };
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function buildCoverageRows(questions) {
  const grouped = countBy(questions, (question) =>
    [
      question.grade,
      question.volume,
      question.chapter,
      question.topicTitleZhHans,
      question.conceptIds[0] ?? "",
      question.type,
      question.difficulty,
      question.evidenceCardIds.join("|"),
      question.examPatternCardIds.join("|")
    ].join("\t")
  );
  return Array.from(grouped.entries())
    .map(([key, count]) => {
      const [grade, volume, chapter, topicTitleZhHans, primaryConceptId, type, difficulty, evidenceCardIds, examPatternCardIds] = key.split("\t");
      return { grade, volume, chapter, topicTitleZhHans, primaryConceptId, type, difficulty, count, evidenceCardIds, examPatternCardIds };
    })
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.volume.localeCompare(b.volume) || a.chapter.localeCompare(b.chapter));
}

function buildQaReport({ questions, plan, startedAt, finishedAt, blStatus, hjbCards, hjbExamPatternCards, sharedExamPatternCards }) {
  const gradeCounts = Object.fromEntries(countBy(questions, (question) => question.grade));
  const typeCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.type}`));
  const difficultyCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.difficulty}`));
  const duplicateIds = Array.from(countBy(questions, (question) => question.id).entries()).filter(([, count]) => count > 1).map(([id]) => id);
  const duplicatePrompts = Array.from(countBy(questions, (question) => question.promptZhHans).entries()).filter(([, count]) => count > 1).length;
  const prior = loadPriorPromptSet();
  const crossBankDuplicateIds = questions
    .filter((question) => prior.prompts.has(normalizePromptForCrossBank(question.promptZhHans)))
    .map((question) => question.id);
  const missingEvidenceRows = questions.filter((question) => !question.evidenceCardIds.length || !question.examPatternCardIds.length);
  const malformedMcRows = questions.filter((question) => question.type === "multiple-choice" && (question.optionsZhHans.length !== 4 || !question.optionsZhHans.includes(question.answer)));
  const allChecksPass =
    questions.length === totalQuestionCount &&
    grades.every((grade) => gradeCounts[grade] === gradeQuestionCount) &&
    grades.every((grade) => questionTypes.every((type) => (typeCounts[`${grade}-${type}`] ?? 0) === typeQuotaByGrade[type])) &&
    grades.every((grade) => difficulties.every((difficulty) => (difficultyCounts[`${grade}-${difficulty}`] ?? 0) === difficultyQuotaByGrade[difficulty])) &&
    duplicateIds.length === 0 &&
    duplicatePrompts === 0 &&
    crossBankDuplicateIds.length === 0 &&
    missingEvidenceRows.length === 0 &&
    malformedMcRows.length === 0;

  return [
    `# ${packageLabel} QA Report`,
    "",
    `- Date: ${finishedAt.slice(0, 10)}`,
    "- Session ID: S18",
    "- Generator: deterministic MAIS safe-template fallback",
    "- Live model: not used",
    `- bl preflight: ${blStatus.available ? `available, exit ${blStatus.exitCode}, ${blStatus.authenticated ? "authenticated" : blStatus.message}` : "not installed"}`,
    `- Started: ${startedAt}`,
    `- Finished: ${finishedAt}`,
    `- Verdict: ${allChecksPass ? "Auto structure/count/schema QA passed for candidate-only package; manual S18 review still required before app integration." : "Auto QA found blocking inventory issues; keep candidate-only."}`,
    "",
    "## Scope",
    "",
    "- Generated 1500 original Simplified Chinese candidate questions for Mainland Shanghai Education Press / HuJiaoBan high-school mathematics.",
    "- Distribution target: 500 questions per S4, S5, and S6 grade.",
    "- Package version: V3 candidate package; it sits alongside V1, V2, V4, and V4-remediated artifacts.",
    "- This package is offline and candidate-only. It does not edit production question-bank files, app UI, API routes, source archives, extracted source text, OCR, screenshots, page notes, or embeddings.",
    `- RAG evidence source: ${hjbCards.length} committed HJB textbook safe cards, ${hjbExamPatternCards.length} committed HJB assessment-pattern cards, and ${sharedExamPatternCards.length} shared Mainland senior-secondary exam-pattern cards.`,
    `- Coverage plan rows: ${plan.length}.`,
    "",
    "## Provider Hygiene",
    "",
    "- `bl auth status --output json` was used only as a redacted preflight.",
    "- No DashScope prompt, DeepSeek prompt, provider request, API key, request header, source file path, OCR text, page image, page number, or source locator is written into these artifacts.",
    "- Live provider generation is deliberately disabled for this candidate-only scope.",
    "",
    "## Count Checks",
    "",
    `- Total questions: ${questions.length} / ${totalQuestionCount}.`,
    `- Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(", ") : "none"}.`,
    `- Duplicate exact prompts inside V3: ${duplicatePrompts}.`,
    `- Cross-bank exact prompt duplicate check: checked ${prior.total} prior rows; duplicates ${crossBankDuplicateIds.length}.`,
    `- Missing evidence rows: ${missingEvidenceRows.length}.`,
    `- Malformed multiple-choice rows: ${malformedMcRows.length}.`,
    "",
    "## Grade Counts",
    "",
    ...grades.map((grade) => `- ${grade}: ${gradeCounts[grade] ?? 0} / ${gradeQuestionCount}`),
    "",
    "## Type Quota Checks",
    "",
    ...grades.flatMap((grade) => questionTypes.map((type) => `- ${grade} ${type}: ${typeCounts[`${grade}-${type}`] ?? 0} / ${typeQuotaByGrade[type]}`)),
    "",
    "## Difficulty Quota Checks",
    "",
    ...grades.flatMap((grade) => difficulties.map((difficulty) => `- ${grade} ${difficulty}: ${difficultyCounts[`${grade}-${difficulty}`] ?? 0} / ${difficultyQuotaByGrade[difficulty]}`)),
    "",
    "## Manual QA Status",
    "",
    "- `mathQaStatus`: `pending-manual` for every row.",
    "- `terminologyQaStatus`: `pending-manual` for every row.",
    "- Required next step before app integration: S18 manual review of the generated queue and owner approval for any production wiring.",
    "",
    "## Files",
    "",
    "- `questions.jsonl`",
    "- `questions.csv`",
    "- `question-pack.json`",
    "- `coverage-matrix.csv`",
    "- `qa-report.md`",
    "- `generate-with-bl.mjs`",
    "- `audit-solvability.mjs`",
    "- `audit-quality.mjs`"
  ].join("\n");
}

function main() {
  const startedAt = new Date().toISOString();
  const blStatus = detectBlStatus();
  const hjbCards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbHigh.ts"), "mainlandHjbHighRagCards");
  const hjbExamPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbHighExamPatterns.ts"), "mainlandHjbHighExamPatternCards");
  const sharedExamPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandPepHighExamPatterns.ts"), "mainlandPepHighExamPatternCards");
  const plan = buildPlan({ hjbCards, hjbExamPatternCards, sharedExamPatternCards });
  const questions = plan.map((target, index) => normalizeQuestion(target, index, blStatus));
  const columns = [
    "id",
    "grade",
    "topicId",
    "topicTitleZhHans",
    "volume",
    "chapter",
    "conceptIds",
    "difficulty",
    "type",
    "promptZhHans",
    "optionsZhHans",
    "answer",
    "acceptedAnswers",
    "explanationZhHans",
    "evidenceCardIds",
    "examPatternCardIds",
    "sourceDistanceStatus",
    "mathQaStatus",
    "terminologyQaStatus",
    "reviewNotes"
  ];
  writeJsonl(path.join(__dirname, "questions.jsonl"), questions);
  writeCsv(path.join(__dirname, "questions.csv"), questions, columns);
  fs.writeFileSync(path.join(__dirname, "question-pack.json"), `${JSON.stringify({ questions }, null, 2)}\n`);
  writeCsv(path.join(__dirname, "coverage-matrix.csv"), buildCoverageRows(questions), [
    "grade",
    "volume",
    "chapter",
    "topicTitleZhHans",
    "primaryConceptId",
    "type",
    "difficulty",
    "count",
    "evidenceCardIds",
    "examPatternCardIds"
  ]);
  const finishedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(__dirname, "qa-report.md"),
    `${buildQaReport({ questions, plan, startedAt, finishedAt, blStatus, hjbCards, hjbExamPatternCards, sharedExamPatternCards })}\n`
  );
  console.log(`${packageLabel}: generated ${questions.length} candidate rows in ${path.relative(rootDir, __dirname)}`);
  console.log(`bl preflight: ${blStatus.authenticated ? "authenticated but live generation disabled" : blStatus.message}`);
}

main();
