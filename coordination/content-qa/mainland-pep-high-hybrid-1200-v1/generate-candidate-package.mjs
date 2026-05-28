import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const nodeRequire = createRequire(import.meta.url);

const grades = ["S4", "S5", "S6"];
const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const typePrefixes = {
  "multiple-choice": "mc",
  "fill-in": "fi",
  "short-answer": "sa"
};

const topicCountsById = {
  "pep-high-s4-sets-logic": 40,
  "pep-high-s4-quadratic-inequalities": 40,
  "pep-high-s4-function-properties": 40,
  "pep-high-s4-exp-log": 40,
  "pep-high-s4-trigonometry": 40,
  "pep-high-s4-plane-vectors": 40,
  "pep-high-s4-complex-numbers": 40,
  "pep-high-s4-solid-geometry-intro": 40,
  "pep-high-s4-statistics": 40,
  "pep-high-s4-probability": 40,
  "pep-high-s5-space-vectors": 80,
  "pep-high-s5-lines-circles": 80,
  "pep-high-s5-conics": 80,
  "pep-high-s5-sequences": 80,
  "pep-high-s5-derivatives": 80,
  "pep-high-s6-counting": 57,
  "pep-high-s6-random-variables": 57,
  "pep-high-s6-bivariate-data": 57,
  "pep-high-s6-derivative-synthesis": 57,
  "pep-high-s6-analytic-geometry-synthesis": 57,
  "pep-high-s6-probability-statistics-synthesis": 57,
  "pep-high-s6-exam-practice": 58
};

const difficultyQuotas = {
  S4: { Foundation: 80, Core: 180, Challenge: 100, Exam: 40 },
  S5: { Foundation: 60, Core: 160, Challenge: 120, Exam: 60 },
  S6: { Foundation: 40, Core: 120, Challenge: 140, Exam: 100 }
};

const typeQuotas = {
  S4: { "multiple-choice": 120, "fill-in": 120, "short-answer": 160 },
  S5: { "multiple-choice": 120, "fill-in": 120, "short-answer": 160 },
  S6: { "multiple-choice": 120, "fill-in": 120, "short-answer": 160 }
};

const topicFamilyById = {
  "pep-high-s4-sets-logic": "sets",
  "pep-high-s4-quadratic-inequalities": "quadratic",
  "pep-high-s4-function-properties": "functions",
  "pep-high-s4-exp-log": "exp-log",
  "pep-high-s4-trigonometry": "trigonometry",
  "pep-high-s4-plane-vectors": "plane-vectors",
  "pep-high-s4-complex-numbers": "complex",
  "pep-high-s4-solid-geometry-intro": "solid-geometry",
  "pep-high-s4-statistics": "statistics",
  "pep-high-s4-probability": "probability",
  "pep-high-s5-space-vectors": "space-vectors",
  "pep-high-s5-lines-circles": "lines-circles",
  "pep-high-s5-conics": "conics",
  "pep-high-s5-sequences": "sequences",
  "pep-high-s5-derivatives": "derivatives",
  "pep-high-s6-counting": "counting",
  "pep-high-s6-random-variables": "random-variables",
  "pep-high-s6-bivariate-data": "bivariate-data",
  "pep-high-s6-derivative-synthesis": "derivative-synthesis",
  "pep-high-s6-analytic-geometry-synthesis": "analytic-geometry-synthesis",
  "pep-high-s6-probability-statistics-synthesis": "probability-statistics-synthesis",
  "pep-high-s6-exam-practice": "exam-practice"
};

const scenes = [
  "单元诊断",
  "课堂练习",
  "错题订正",
  "分层作业",
  "专题复习",
  "小测反馈",
  "模型迁移",
  "思维训练"
];

const forbiddenQuestionTextPattern =
  /OCR|PDF|DOCX|docx|截图|扫描|页码|第\s*\d+\s*页|教材原题|课本原题|试卷原题|高考真题|官方解析|答案原句|原文|源文件|来源文件|source locator|as shown|shown in the figure|如图|见图|上图|下图|图中/i;
const traditionalChineseRiskPattern = /這|個|與|對|應|題|學|練|臺|裏|為|後|數|線|圓|證|體|關|聯|復|雜|選|項|難|點|錯|雙|歸|簡|標|準|範|圍|餘|變|參/;

function loadTsModule(filePath, cache = new Map()) {
  const resolvedPath = filePath.endsWith(".ts") ? filePath : `${filePath}.ts`;
  if (cache.has(resolvedPath)) return cache.get(resolvedPath).exports;

  const source = fs.readFileSync(resolvedPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: resolvedPath
  }).outputText;

  const module = { exports: {} };
  cache.set(resolvedPath, module);

  function localRequire(specifier) {
    if (specifier.startsWith("@/types")) return {};
    if (specifier.startsWith("@/")) {
      return loadTsModule(path.join(rootDir, `${specifier.slice(2)}.ts`), cache);
    }
    if (specifier.startsWith(".")) {
      return loadTsModule(path.resolve(path.dirname(resolvedPath), specifier), cache);
    }
    return nodeRequire(specifier);
  }

  const wrapped = `(function (exports, require, module, __filename, __dirname) {\n${compiled}\n})`;
  const fn = vm.runInNewContext(wrapped, { console, URL, Intl, setTimeout, clearTimeout }, { filename: resolvedPath });
  fn(module.exports, localRequire, module, resolvedPath, path.dirname(resolvedPath));
  return module.exports;
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => value !== undefined && value !== null && value !== "")));
}

function countBy(items, getter) {
  return items.reduce((counts, item) => {
    const key = getter(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function balancedSequence(counts) {
  const remaining = new Map(Object.entries(counts));
  const result = [];
  while (Array.from(remaining.values()).some((count) => count > 0)) {
    const next = Array.from(remaining.entries())
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    for (const [key, count] of next) {
      result.push(key);
      remaining.set(key, count - 1);
    }
  }
  return result;
}

function topicTypeCounts(topicId) {
  const total = topicCountsById[topicId];
  if (total === 40) return { "multiple-choice": 12, "fill-in": 12, "short-answer": 16 };
  if (total === 80) return { "multiple-choice": 24, "fill-in": 24, "short-answer": 32 };
  if (total === 58) return { "multiple-choice": 18, "fill-in": 18, "short-answer": 22 };
  return { "multiple-choice": 17, "fill-in": 17, "short-answer": 23 };
}

function slugForTopic(topicId) {
  return topicId.replace(/^pep-high-/, "").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function gcd(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function fraction(numerator, denominator) {
  if (denominator < 0) return fraction(-numerator, -denominator);
  const divisor = gcd(numerator, denominator);
  const n = numerator / divisor;
  const d = denominator / divisor;
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

function formatNumber(value) {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(3)));
}

function signed(value) {
  return value >= 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

function factorTerm(root) {
  if (root === 0) return "x";
  return root > 0 ? `x-${root}` : `x+${Math.abs(root)}`;
}

function paren(value) {
  return value < 0 ? `(${value})` : String(value);
}

function subExpr(left, right) {
  return `${left}-${right < 0 ? `(${right})` : right}`;
}

function addExpr(left, right) {
  return `${left}${right >= 0 ? `+${right}` : right}`;
}

function mulExpr(left, right) {
  return `${paren(left)}×${paren(right)}`;
}

function sceneFor(target) {
  return scenes[(target.topicSerial + target.gradeIndex) % scenes.length];
}

function intro(target) {
  return `${sceneFor(target)}第${target.topicSerial}组：`;
}

function rotate(values, amount) {
  const offset = amount % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function makeOptions(correct, distractors, seed) {
  const options = unique([correct, ...distractors.map(String)]);
  let pad = 1;
  while (options.length < 4) {
    options.push(`${correct}${pad}`);
    pad += 1;
  }
  return rotate(options.slice(0, 4), seed);
}

function asQuestion(target, draft) {
  const answer = String(draft.answer).trim();
  const acceptedAnswers = unique([answer, ...(draft.acceptedAnswers ?? [])].map((value) => String(value).trim()));
  const optionsZhHans =
    target.type === "multiple-choice"
      ? makeOptions(answer, draft.distractors ?? [], target.topicSerial + target.gradeIndex)
      : [];
  return {
    id: target.id,
    grade: target.grade,
    topicId: target.topicId,
    topicTitleZhHans: target.topicTitleZhHans,
    chapter: target.chapter,
    conceptIds: target.conceptIds,
    difficulty: target.difficulty,
    type: target.type,
    promptZhHans: draft.prompt,
    optionsZhHans,
    answer,
    acceptedAnswers,
    explanationZhHans: draft.explanation,
    evidenceCardIds: target.evidenceCardIds,
    examPatternCardIds: target.examPatternCardIds,
    sourceDistanceStatus: "passed-safe-rag-rule-fallback",
    mathQaStatus: "passed-deterministic-generator",
    terminologyQaStatus: "passed-auto-zh-hans-scan",
    hybridMode: "rule-fallback-after-bl-auth-missing",
    generatorFamily: target.family,
    generatorVariant: draft.variant,
    reviewNotes:
      "Candidate generated from MAIS safe RAG metadata and deterministic rules; bl/DashScope generation unavailable locally; S18 manual review required before promotion."
  };
}

function chooseEvidence(topic, ragCards, patternCards) {
  const exactRagCards = ragCards.filter((card) => card.chapter === topic.title.zh);
  const conceptSeed = unique(exactRagCards.flatMap((card) => card.conceptIds));
  const conceptRagCards = ragCards.filter((card) => card.conceptIds.some((conceptId) => conceptSeed.includes(conceptId)));
  const curriculumCards = unique([...exactRagCards, ...conceptRagCards].map((card) => card.id))
    .map((id) => ragCards.find((card) => card.id === id))
    .filter(Boolean)
    .slice(0, 2);

  const exactPatternCards = patternCards.filter((card) => card.chapter === topic.title.zh);
  const conceptPatternCards = patternCards.filter((card) => card.conceptIds.some((conceptId) => conceptSeed.includes(conceptId)));
  const examPatternCards = unique([...exactPatternCards, ...conceptPatternCards].map((card) => card.id))
    .map((id) => patternCards.find((card) => card.id === id))
    .filter(Boolean)
    .slice(0, 2);

  const safeCurriculumCards = curriculumCards.length ? curriculumCards : ragCards.slice(0, 1);
  return {
    chapter: safeCurriculumCards[0]?.chapter ?? topic.title.zh,
    conceptIds: unique(safeCurriculumCards.flatMap((card) => card.conceptIds)).slice(0, 8),
    evidenceCardIds: safeCurriculumCards.map((card) => card.id),
    examPatternCardIds: examPatternCards.map((card) => card.id)
  };
}

function buildPlan(topics, ragCards, patternCards) {
  const rows = [];
  for (const grade of grades) {
    const gradeTopics = topics.filter((topic) => topic.grade === grade);
    const difficultyPlan = balancedSequence(difficultyQuotas[grade]);
    let difficultyIndex = 0;
    let gradeIndex = 0;

    for (const topic of gradeTopics) {
      const targetCount = topicCountsById[topic.id];
      if (!targetCount) continue;
      const evidence = chooseEvidence(topic, ragCards, patternCards);
      const typePlan = balancedSequence(topicTypeCounts(topic.id));
      for (let index = 0; index < targetCount; index += 1) {
        const type = typePlan[index];
        const topicSerial = index + 1;
        gradeIndex += 1;
        rows.push({
          id: `pep-high-hybrid-v1-${grade.toLowerCase()}-${slugForTopic(topic.id)}-${typePrefixes[type]}-${String(topicSerial).padStart(3, "0")}`,
          grade,
          topicId: topic.id,
          topicTitleZhHans: topic.title.zh,
          chapter: evidence.chapter,
          conceptIds: evidence.conceptIds,
          evidenceCardIds: evidence.evidenceCardIds,
          examPatternCardIds: evidence.examPatternCardIds,
          difficulty: difficultyPlan[difficultyIndex++],
          type,
          family: topicFamilyById[topic.id],
          topicSerial,
          gradeIndex
        });
      }
    }
  }
  return rows;
}

const generators = {
  sets(target) {
    const n = target.topicSerial;
    const a = (n % 7) + 1;
    const width = 4 + (n % 4);
    const b = a + width;
    const c = a + 1 + (n % 2);
    const d = b + 1 + (n % 3);
    const intersectionCount = b - c + 1;
    const unionCount = d - a + 1;
    const difference = Array.from({ length: c - a }, (_, index) => a + index);
    if (target.type === "multiple-choice") {
      return {
        variant: "integer-set-intersection",
        prompt: `${intro(target)}设A={x∈Z | ${a}≤x≤${b}}，B={x∈Z | ${c}≤x≤${d}}，则A∩B中元素个数为多少？`,
        answer: String(intersectionCount),
        distractors: [intersectionCount - 1, intersectionCount + 1, unionCount],
        explanation: `交集为${c}到${b}的整数，共${intersectionCount}个。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "integer-set-union",
        prompt: `${intro(target)}设A={x∈Z | ${a}≤x≤${b}}，B={x∈Z | ${c}≤x≤${d}}，则A∪B中元素个数为______。`,
        answer: String(unionCount),
        explanation: `两个区间相交，合并后为${a}到${d}的整数，共${unionCount}个。`
      };
    }
    return {
      variant: "integer-set-difference",
      prompt: `${intro(target)}设A={x∈Z | ${a}≤x≤${b}}，B={x∈Z | ${c}≤x≤${d}}，写出A\\B。`,
      answer: `{${difference.join(",")}}`,
      acceptedAnswers: [`{${difference.join("，")}}`],
      explanation: `A中不属于B的整数是从${a}到${c - 1}，所以A\\B={${difference.join(",")}}。`
    };
  },

  quadratic(target) {
    const n = target.topicSerial;
    const leftRoot = (n % 9) - 4;
    const halfGap = (n % 4) + 1;
    const rightRoot = leftRoot + 2 * halfGap;
    const axis = leftRoot + halfGap;
    const minValue = -halfGap * halfGap;
    const expression = `(${factorTerm(leftRoot)})(${factorTerm(rightRoot)})`;
    if (target.type === "multiple-choice") {
      const answer = `[${leftRoot}, ${rightRoot}]`;
      return {
        variant: "quadratic-inequality-interval",
        prompt: `${intro(target)}不等式${expression}≤0的解集是（ ）。`,
        answer,
        distractors: [`(-∞,${leftRoot}]∪[${rightRoot},+∞)`, `(${leftRoot}, ${rightRoot})`, `[${rightRoot}, ${leftRoot}]`],
        explanation: `二次项系数为正，乘积不大于0时x在两根之间，含端点。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "quadratic-axis",
        prompt: `${intro(target)}二次函数y=${expression}的对称轴为x=______。`,
        answer: String(axis),
        explanation: `两根为${leftRoot}和${rightRoot}，对称轴是两根平均数${axis}。`
      };
    }
    return {
      variant: "quadratic-minimum",
      prompt: `${intro(target)}求函数y=${expression}在实数范围内的最小值。`,
      answer: String(minValue),
      explanation: `对称轴x=${axis}，代入得最小值(${subExpr(axis, leftRoot)})(${subExpr(axis, rightRoot)})=${minValue}。`
    };
  },

  functions(target) {
    const n = target.topicSerial;
    const a = (n % 5) + 2;
    const b = (n % 7) - 3;
    const x = (n % 6) + 1;
    const value = a * x + b;
    const c = (n % 8) - 2;
    if (target.type === "multiple-choice") {
      return {
        variant: "linear-function-value",
        prompt: `${intro(target)}已知f(x)=${a}x${signed(b)}，则f(${x})=（ ）。`,
        answer: String(value),
        distractors: [value + a, value - a, value + b + 1],
        explanation: `代入x=${x}，得${a}×${x}${signed(b)}=${value}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "sqrt-domain",
        prompt: `${intro(target)}函数f(x)=√(x${signed(-c)})的定义域为______。`,
        answer: `[${c}, +∞)`,
        acceptedAnswers: [`x≥${c}`],
        explanation: `根号内需x${signed(-c)}≥0，所以x≥${c}。`
      };
    }
    const slope = n % 2 === 0 ? a : -a;
    const monotonicity = slope > 0 ? "在R上单调递增" : "在R上单调递减";
    return {
      variant: "linear-monotonicity",
      prompt: `${intro(target)}判断函数g(x)=${slope}x${signed(b)}在R上的单调性，并说明理由。`,
      answer: monotonicity,
      explanation: `一次函数斜率为${slope}，${slope > 0 ? "大于0，所以单调递增" : "小于0，所以单调递减"}。`
    };
  },

  "exp-log"(target) {
    const n = target.topicSerial;
    const base = [2, 3, 5][n % 3];
    const p = (n % 4) + 1;
    const q = (n % 3) + 2;
    const sum = p + q;
    if (target.type === "multiple-choice") {
      return {
        variant: "log-power",
        prompt: `${intro(target)}计算log_${base}(${base}^${p})的值。`,
        answer: String(p),
        distractors: [p + 1, p - 1, base * p],
        explanation: `log_${base}(${base}^${p})=${p}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "exponential-equation",
        prompt: `${intro(target)}若${base}^x=${base ** q}，则x=______。`,
        answer: String(q),
        explanation: `${base ** q}=${base}^${q}，同底指数相等，所以x=${q}。`
      };
    }
    return {
      variant: "log-sum",
      prompt: `${intro(target)}化简并求值：log_${base}(${base ** p})+log_${base}(${base ** q})。`,
      answer: String(sum),
      explanation: `两项分别为${p}和${q}，相加得${sum}。`
    };
  },

  trigonometry(target) {
    const n = target.topicSerial;
    const amplitude = (n % 5) + 1;
    const k = [1, 2, 3, 4][n % 4];
    const periodMap = { 1: "2π", 2: "π", 3: "2π/3", 4: "π/2" };
    const shift = (n % 4) - 1;
    if (target.type === "multiple-choice") {
      return {
        variant: "sine-period",
        prompt: `${intro(target)}函数y=${amplitude}sin(${k}x)的最小正周期为（ ）。`,
        answer: periodMap[k],
        distractors: ["π", "2π", "π/2", "2π/3"].filter((value) => value !== periodMap[k]),
        explanation: `sin(${k}x)的周期为2π/${k}，即${periodMap[k]}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "sine-amplitude",
        prompt: `${intro(target)}函数y=${amplitude}sin x${signed(shift)}的最大值为______。`,
        answer: String(amplitude + shift),
        explanation: `sin x最大为1，所以最大值为${amplitude}${signed(shift)}=${amplitude + shift}。`
      };
    }
    return {
      variant: "cosine-special-value",
      prompt: `${intro(target)}若α=60°，求${amplitude}cosα${signed(shift)}的值。`,
      answer: fraction(amplitude + 2 * shift, 2),
      explanation: `cos60°=1/2，所以${amplitude}cos60°${signed(shift)}=${fraction(amplitude, 2)}${signed(shift)}=${fraction(amplitude + 2 * shift, 2)}。`
    };
  },

  "plane-vectors"(target) {
    const n = target.topicSerial;
    const ax = (n % 6) - 2;
    const ay = (n % 5) + 1;
    const bx = (n % 4) + 1;
    const by = (n % 7) - 3;
    const dot = ax * bx + ay * by;
    const lengthSquared = ax * ax + ay * ay;
    if (target.type === "multiple-choice") {
      return {
        variant: "dot-product",
        prompt: `${intro(target)}已知向量a=(${ax},${ay})，b=(${bx},${by})，则a·b=（ ）。`,
        answer: String(dot),
        distractors: [dot + 1, ax * by + ay * bx, lengthSquared],
        explanation: `a·b=${mulExpr(ax, bx)}+${mulExpr(ay, by)}=${dot}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "vector-length-squared",
        prompt: `${intro(target)}向量a=(${ax},${ay})，则|a|^2=______。`,
        answer: String(lengthSquared),
        explanation: `|a|^2=${ax}^2+${ay}^2=${lengthSquared}。`
      };
    }
    return {
      variant: "vector-sum",
      prompt: `${intro(target)}已知a=(${ax},${ay})，b=(${bx},${by})，求a+b的坐标。`,
      answer: `(${ax + bx},${ay + by})`,
      acceptedAnswers: [`(${ax + bx}, ${ay + by})`],
      explanation: `对应坐标相加，a+b=(${addExpr(ax, bx)},${addExpr(ay, by)})=(${ax + bx},${ay + by})。`
    };
  },

  complex(target) {
    const n = target.topicSerial;
    const a = (n % 5) - 2;
    const b = (n % 4) + 1;
    const c = (n % 6) - 3;
    const d = (n % 3) + 1;
    const real = a + c;
    const imaginary = b - d;
    const modulusSquared = a * a + b * b;
    if (target.type === "multiple-choice") {
      return {
        variant: "complex-addition",
        prompt: `${intro(target)}设z1=${a}${signed(b)}i，z2=${c}${signed(-d)}i，则z1+z2=（ ）。`,
        answer: `${real}${signed(imaginary)}i`,
        distractors: [`${a - c}${signed(b + d)}i`, `${real}${signed(-imaginary)}i`, `${a * c}${signed(b * d)}i`],
        explanation: `实部相加得${real}，虚部相加得${imaginary}，所以为${real}${signed(imaginary)}i。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "complex-modulus-squared",
        prompt: `${intro(target)}复数z=${a}${signed(b)}i，则|z|^2=______。`,
        answer: String(modulusSquared),
        explanation: `|z|^2=${a}^2+${b}^2=${modulusSquared}。`
      };
    }
    const productReal = a * c - b * d;
    const productImaginary = a * d + b * c;
    return {
      variant: "complex-product",
      prompt: `${intro(target)}计算(${a}${signed(b)}i)(${c}${signed(d)}i)。`,
      answer: `${productReal}${signed(productImaginary)}i`,
      explanation: `按复数乘法展开，实部为${mulExpr(a, c)}-${mulExpr(b, d)}=${productReal}，虚部为${mulExpr(a, d)}+${mulExpr(b, c)}=${productImaginary}。`
    };
  },

  "solid-geometry"(target) {
    const n = target.topicSerial;
    const length = (n % 5) + 3;
    const width = (n % 4) + 2;
    const height = (n % 6) + 2;
    const volume = length * width * height;
    const diagonalSquared = length * length + width * width + height * height;
    const surface = 2 * (length * width + length * height + width * height);
    if (target.type === "multiple-choice") {
      return {
        variant: "cuboid-volume",
        prompt: `${intro(target)}长方体长、宽、高分别为${length}、${width}、${height}，体积为（ ）。`,
        answer: String(volume),
        distractors: [surface, diagonalSquared, volume + length],
        explanation: `长方体体积为${length}×${width}×${height}=${volume}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "cuboid-diagonal-squared",
        prompt: `${intro(target)}长方体长、宽、高分别为${length}、${width}、${height}，体对角线长度的平方为______。`,
        answer: String(diagonalSquared),
        explanation: `体对角线平方为${length}^2+${width}^2+${height}^2=${diagonalSquared}。`
      };
    }
    return {
      variant: "cuboid-surface-area",
      prompt: `${intro(target)}求长方体长${length}、宽${width}、高${height}的表面积。`,
      answer: String(surface),
      explanation: `表面积为2(${length}×${width}+${length}×${height}+${width}×${height})=${surface}。`
    };
  },

  statistics(target) {
    const n = target.topicSerial;
    const base = (n % 8) + 4;
    const d = (n % 4) + 1;
    const values = [base - d, base, base + d];
    const mean = base;
    const targetMean = base + 2;
    const needed = 4 * targetMean - values.reduce((sum, value) => sum + value, 0);
    if (target.type === "multiple-choice") {
      return {
        variant: "three-number-mean",
        prompt: `${intro(target)}数据${values.join("，")}的平均数是（ ）。`,
        answer: String(mean),
        distractors: [mean - 1, mean + 1, 3 * mean],
        explanation: `三数之和为${3 * mean}，平均数为${mean}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "three-number-range",
        prompt: `${intro(target)}数据${values.join("，")}的极差为______。`,
        answer: String(2 * d),
        explanation: `最大值${base + d}减最小值${base - d}，极差为${2 * d}。`
      };
    }
    return {
      variant: "mean-completion",
      prompt: `${intro(target)}数据${values.join("，")}再加入一个数后，四个数平均数为${targetMean}，求加入的数。`,
      answer: String(needed),
      explanation: `四个数总和应为${4 * targetMean}，前三个数和为${3 * mean}，所求数为${needed}。`
    };
  },

  probability(target) {
    const n = target.topicSerial;
    const red = (n % 5) + 2;
    const blue = (n % 4) + 3;
    const total = red + blue;
    const pRed = fraction(red, total);
    const pBlue = fraction(blue, total);
    const noReplacement = fraction(red * blue, total * (total - 1));
    if (target.type === "multiple-choice") {
      return {
        variant: "single-draw-red",
        prompt: `${intro(target)}袋中有${red}个红球和${blue}个蓝球，随机取1个，取到红球的概率为（ ）。`,
        answer: pRed,
        distractors: [pBlue, fraction(red, blue), fraction(blue, total + 1)],
        explanation: `共有${total}个球，其中红球${red}个，概率为${pRed}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "single-draw-blue",
        prompt: `${intro(target)}袋中有${red}个红球和${blue}个蓝球，随机取1个，取到蓝球的概率为______。`,
        answer: pBlue,
        explanation: `共有${total}个球，其中蓝球${blue}个，概率为${pBlue}。`
      };
    }
    return {
      variant: "two-draw-red-then-blue",
      prompt: `${intro(target)}袋中有${red}个红球和${blue}个蓝球，不放回连续取2个，先红后蓝的概率是多少？`,
      answer: noReplacement,
      explanation: `先红概率${red}/${total}，再蓝概率${blue}/${total - 1}，相乘得${noReplacement}。`
    };
  },

  "space-vectors"(target) {
    const n = target.topicSerial;
    const ax = (n % 5) - 2;
    const ay = (n % 6) - 1;
    const az = (n % 4) + 1;
    const bx = (n % 3) + 1;
    const by = (n % 5) - 2;
    const bz = (n % 6) - 3;
    const dot = ax * bx + ay * by + az * bz;
    const distanceSquared = ax * ax + ay * ay + az * az;
    if (target.type === "multiple-choice") {
      return {
        variant: "space-vector-dot",
        prompt: `${intro(target)}空间向量a=(${ax},${ay},${az})，b=(${bx},${by},${bz})，则a·b=（ ）。`,
        answer: String(dot),
        distractors: [dot + 2, distanceSquared, ax + ay + az + bx + by + bz],
        explanation: `数量积为${mulExpr(ax, bx)}+${mulExpr(ay, by)}+${mulExpr(az, bz)}=${dot}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "space-vector-length-squared",
        prompt: `${intro(target)}空间向量a=(${ax},${ay},${az})，则|a|^2=______。`,
        answer: String(distanceSquared),
        explanation: `|a|^2=${ax}^2+${ay}^2+${az}^2=${distanceSquared}。`
      };
    }
    return {
      variant: "space-vector-sum",
      prompt: `${intro(target)}求向量(${ax},${ay},${az})与(${bx},${by},${bz})的和向量坐标。`,
      answer: `(${ax + bx},${ay + by},${az + bz})`,
      acceptedAnswers: [`(${ax + bx}, ${ay + by}, ${az + bz})`],
      explanation: `三维坐标分别相加，得到(${ax + bx},${ay + by},${az + bz})。`
    };
  },

  "lines-circles"(target) {
    const n = target.topicSerial;
    const x1 = n % 5;
    const y1 = (n % 7) - 3;
    const dx = (n % 4) + 1;
    const slope = (n % 5) - 2 || 3;
    const x2 = x1 + dx;
    const y2 = y1 + slope * dx;
    const radius = (n % 6) + 2;
    const centerX = (n % 5) - 2;
    const centerY = (n % 4) + 1;
    if (target.type === "multiple-choice") {
      return {
        variant: "line-slope",
        prompt: `${intro(target)}直线经过P(${x1},${y1})与Q(${x2},${y2})，斜率为（ ）。`,
        answer: String(slope),
        distractors: [slope + 1, -slope, fraction(y2 - y1, x1 - x2)],
        explanation: `斜率k=(${subExpr(y2, y1)})/(${subExpr(x2, x1)})=${slope}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "circle-radius",
        prompt: `${intro(target)}圆(x${signed(-centerX)})^2+(y${signed(-centerY)})^2=${radius * radius}的半径为______。`,
        answer: String(radius),
        explanation: `标准方程右端为r^2=${radius * radius}，所以r=${radius}。`
      };
    }
    const value = Math.abs(centerX + centerY - radius);
    return {
      variant: "point-line-distance-numerator",
      prompt: `${intro(target)}点C(${centerX},${centerY})到直线x+y-${radius}=0的距离为d，求d√2的值。`,
      answer: String(value),
      explanation: `距离d=|${centerX}+${centerY}-${radius}|/√2，所以d√2=${value}。`
    };
  },

  conics(target) {
    const n = target.topicSerial;
    const b = (n % 5) + 2;
    const c = (n % 4) + 1;
    const aSquared = b * b + c * c;
    const p = (n % 6) + 1;
    if (target.type === "multiple-choice") {
      return {
        variant: "ellipse-c-squared",
        prompt: `${intro(target)}椭圆x^2/${aSquared}+y^2/${b * b}=1(a>b>0)的c^2为（ ）。`,
        answer: String(c * c),
        distractors: [aSquared + b * b, aSquared, b * b],
        explanation: `椭圆中c^2=a^2-b^2=${aSquared}-${b * b}=${c * c}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "parabola-p",
        prompt: `${intro(target)}抛物线y^2=${2 * p}x可写成y^2=2px，则p=______。`,
        answer: String(p),
        explanation: `比较y^2=${2 * p}x与y^2=2px，得p=${p}。`
      };
    }
    return {
      variant: "ellipse-focal-distance",
      prompt: `${intro(target)}椭圆x^2/${aSquared}+y^2/${b * b}=1的焦距2c是多少？`,
      answer: String(2 * c),
      explanation: `c^2=${aSquared}-${b * b}=${c * c}，所以c=${c}，焦距2c=${2 * c}。`
    };
  },

  sequences(target) {
    const n = target.topicSerial;
    const first = (n % 6) + 1;
    const diff = (n % 5) + 1;
    const index = (n % 8) + 4;
    const nth = first + (index - 1) * diff;
    const sum = (index * (first + nth)) / 2;
    if (target.type === "multiple-choice") {
      return {
        variant: "arithmetic-nth-term",
        prompt: `${intro(target)}等差数列首项a1=${first}，公差d=${diff}，则a${index}=（ ）。`,
        answer: String(nth),
        distractors: [nth + diff, nth - diff, first * index],
        explanation: `a${index}=a1+(${index}-1)d=${first}+${index - 1}×${diff}=${nth}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "arithmetic-sum",
        prompt: `${intro(target)}等差数列首项${first}、第${index}项${nth}，则前${index}项和为______。`,
        answer: String(sum),
        explanation: `S${index}=${index}(${first}+${nth})/2=${sum}。`
      };
    }
    return {
      variant: "geometric-third-term",
      prompt: `${intro(target)}等比数列首项为${first}，公比为${diff + 1}，求第3项。`,
      answer: String(first * (diff + 1) ** 2),
      explanation: `第3项为a1q^2=${first}×${diff + 1}^2=${first * (diff + 1) ** 2}。`
    };
  },

  derivatives(target) {
    const n = target.topicSerial;
    const a = (n % 4) + 1;
    const b = (n % 7) - 3;
    const x0 = (n % 5) - 2;
    const slope = 2 * a * x0 + b;
    const vertexX = fraction(-b, 2 * a);
    if (target.type === "multiple-choice") {
      return {
        variant: "quadratic-derivative-value",
        prompt: `${intro(target)}函数f(x)=${a}x^2${signed(b)}x+1，则f'(${x0})=（ ）。`,
        answer: String(slope),
        distractors: [slope + 1, 2 * a + b, a * x0 * x0 + b * x0 + 1],
        explanation: `f'(x)=${2 * a}x${signed(b)}，代入x=${x0}得${slope}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "quadratic-extreme-point",
        prompt: `${intro(target)}函数f(x)=${a}x^2${signed(b)}x+1的极值点横坐标为______。`,
        answer: vertexX,
        explanation: `令f'(x)=${2 * a}x${signed(b)}=0，得x=${vertexX}。`
      };
    }
    return {
      variant: "tangent-slope",
      prompt: `${intro(target)}曲线y=${a}x^2${signed(b)}x+1在x=${x0}处的切线斜率是多少？`,
      answer: String(slope),
      explanation: `切线斜率等于导数值，f'(${x0})=${2 * a}×${x0}${signed(b)}=${slope}。`
    };
  },

  counting(target) {
    const n = target.topicSerial;
    const total = (n % 5) + 6;
    const chooseCount = (n % 3) + 2;
    const combination = binomial(total, chooseCount);
    const arrangement = factorial(chooseCount);
    if (target.type === "multiple-choice") {
      return {
        variant: "combination-count",
        prompt: `${intro(target)}从${total}名同学中选${chooseCount}名参加展示，共有多少种选法？`,
        answer: String(combination),
        distractors: [combination * arrangement, combination + total, total * chooseCount],
        explanation: `只选人不排序，方法数为C(${total},${chooseCount})=${combination}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "permutation-from-small-set",
        prompt: `${intro(target)}${chooseCount}个不同元素排成一列，共有______种排法。`,
        answer: String(arrangement),
        explanation: `${chooseCount}个不同元素全排列共有${chooseCount}!=${arrangement}种。`
      };
    }
    const binomialIndex = (n % 4) + 1;
    return {
      variant: "binomial-coefficient",
      prompt: `${intro(target)}展开式(1+x)^${total}中x^${binomialIndex}项的系数是多少？`,
      answer: String(binomial(total, binomialIndex)),
      explanation: `二项式系数为C(${total},${binomialIndex})=${binomial(total, binomialIndex)}。`
    };
  },

  "random-variables"(target) {
    const n = target.topicSerial;
    const trials = (n % 5) + 4;
    const numerator = (n % 3) + 1;
    const denominator = 4;
    const expectation = fraction(trials * numerator, denominator);
    const variance = fraction(trials * numerator * (denominator - numerator), denominator * denominator);
    if (target.type === "multiple-choice") {
      return {
        variant: "binomial-expectation",
        prompt: `${intro(target)}随机变量X~B(${trials}, ${numerator}/${denominator})，则E(X)=（ ）。`,
        answer: expectation,
        distractors: [variance, String(trials), fraction(numerator, denominator)],
        explanation: `二项分布期望为np=${trials}×${numerator}/${denominator}=${expectation}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "binomial-variance",
        prompt: `${intro(target)}随机变量X~B(${trials}, ${numerator}/${denominator})，则D(X)=______。`,
        answer: variance,
        explanation: `方差为np(1-p)=${trials}×${numerator}/${denominator}×${denominator - numerator}/${denominator}=${variance}。`
      };
    }
    const xValue = (n % 6) + 2;
    const p = fraction(numerator, denominator);
    return {
      variant: "two-point-expectation",
      prompt: `${intro(target)}随机变量Y取${xValue}的概率为${p}，取0的概率为1-${p}，求E(Y)。`,
      answer: fraction(xValue * numerator, denominator),
      explanation: `E(Y)=${xValue}×${p}+0×(1-${p})=${fraction(xValue * numerator, denominator)}。`
    };
  },

  "bivariate-data"(target) {
    const n = target.topicSerial;
    const slope = (n % 4) + 1;
    const intercept = (n % 7) - 3;
    const x = (n % 6) + 2;
    const predicted = slope * x + intercept;
    const observed = predicted + ((n % 3) - 1);
    const residual = observed - predicted;
    if (target.type === "multiple-choice") {
      return {
        variant: "linear-regression-prediction",
        prompt: `${intro(target)}回归直线为ŷ=${slope}x${signed(intercept)}，当x=${x}时，预测值ŷ为（ ）。`,
        answer: String(predicted),
        distractors: [predicted + slope, predicted - slope, intercept],
        explanation: `代入x=${x}，ŷ=${slope}×${x}${signed(intercept)}=${predicted}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "regression-residual",
        prompt: `${intro(target)}回归预测值为${predicted}，实际观测值为${observed}，残差实际值-预测值为______。`,
        answer: String(residual),
        explanation: `残差=${observed}-${predicted}=${residual}。`
      };
    }
    const meanX = x + 1;
    const meanY = slope * meanX + intercept;
    return {
      variant: "regression-through-means",
      prompt: `${intro(target)}回归直线ŷ=${slope}x${signed(intercept)}经过样本中心( x̄, ȳ )。若x̄=${meanX}，求ȳ。`,
      answer: String(meanY),
      explanation: `样本中心在回归直线上，ȳ=${slope}×${meanX}${signed(intercept)}=${meanY}。`
    };
  },

  "derivative-synthesis"(target) {
    const n = target.topicSerial;
    const p = (n % 5) + 1;
    const x0 = (n % 4) + 1;
    const slope = 3 * x0 * x0 - 3 * p;
    if (target.type === "multiple-choice") {
      const rootAnswer = p === 1 ? "x=±1" : `x=±√${p}`;
      return {
        variant: "cubic-critical-points",
        prompt: `${intro(target)}函数f(x)=x^3-${3 * p}x的导函数零点为（ ）。`,
        answer: rootAnswer,
        distractors: [`x=±${p}`, `x=${p}`, "无零点"],
        explanation: `f'(x)=3x^2-${3 * p}=3(x^2-${p})，零点为x=±√${p}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "cubic-derivative-value",
        prompt: `${intro(target)}函数f(x)=x^3-${3 * p}x，则f'(${x0})=______。`,
        answer: String(slope),
        explanation: `f'(x)=3x^2-${3 * p}，代入x=${x0}得${slope}。`
      };
    }
    return {
      variant: "cubic-tangent-slope",
      prompt: `${intro(target)}曲线y=x^3-${3 * p}x在x=${x0}处的切线斜率是多少？`,
      answer: String(slope),
      explanation: `切线斜率为导数值，3×${x0}^2-${3 * p}=${slope}。`
    };
  },

  "analytic-geometry-synthesis"(target) {
    const n = target.topicSerial;
    const centerX = (n % 5) - 2;
    const centerY = (n % 6) - 2;
    const radius = (n % 4) + 2;
    const tangentLineValue = centerX + radius;
    const distanceNumerator = Math.abs(centerX - tangentLineValue);
    if (target.type === "multiple-choice") {
      return {
        variant: "circle-tangent-line",
        prompt: `${intro(target)}圆心为(${centerX},${centerY})、半径为${radius}的圆，与直线x=m相切且切线在圆心右侧，则m=（ ）。`,
        answer: String(tangentLineValue),
        distractors: [centerX - radius, centerY + radius, radius],
        explanation: `右侧竖直切线到圆心的水平距离为半径，m=${centerX}+${radius}=${tangentLineValue}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "center-to-vertical-line-distance",
        prompt: `${intro(target)}点(${centerX},${centerY})到直线x=${tangentLineValue}的距离为______。`,
        answer: String(distanceNumerator),
        explanation: `到竖直线x=${tangentLineValue}的距离为|${centerX}-${tangentLineValue}|=${distanceNumerator}。`
      };
    }
    return {
      variant: "circle-standard-equation",
      prompt: `${intro(target)}写出圆心(${centerX},${centerY})、半径${radius}的圆的标准方程。`,
      answer: `(x${signed(-centerX)})^2+(y${signed(-centerY)})^2=${radius * radius}`,
      explanation: `圆的标准方程为(x-a)^2+(y-b)^2=r^2，代入得答案。`
    };
  },

  "probability-statistics-synthesis"(target) {
    const n = target.topicSerial;
    const trials = (n % 4) + 3;
    const success = 1;
    const numerator = (n % 2) + 1;
    const denominator = 3;
    const probability = fraction(binomial(trials, success) * numerator * (denominator - numerator) ** (trials - success), denominator ** trials);
    const expected = fraction(trials * numerator, denominator);
    const repeatedTrials = trials * denominator * 10;
    const expectedOccurrences = trials * numerator * 10;
    if (target.type === "multiple-choice") {
      return {
        variant: "binomial-one-success",
        prompt: `${intro(target)}X~B(${trials}, ${numerator}/${denominator})，则P(X=1)=（ ）。`,
        answer: probability,
        distractors: [expected, fraction(numerator, denominator), fraction(trials, denominator ** trials)],
        explanation: `P(X=1)=C(${trials},1)(${numerator}/${denominator})(${denominator - numerator}/${denominator})^${trials - 1}=${probability}。`
      };
    }
    if (target.type === "fill-in") {
      return {
        variant: "binomial-expected-value",
        prompt: `${intro(target)}X~B(${trials}, ${numerator}/${denominator})，则E(X)=______。`,
        answer: expected,
        explanation: `二项分布期望为np=${trials}×${numerator}/${denominator}=${expected}。`
      };
    }
    return {
      variant: "frequency-interpretation",
      prompt: `${intro(target)}若某事件在${repeatedTrials}次独立重复试验中期望发生${expectedOccurrences}次，估计单次发生概率。`,
      answer: fraction(numerator, denominator),
      explanation: `期望次数=试验次数×概率，所以概率为${expectedOccurrences}/${repeatedTrials}=${fraction(numerator, denominator)}。`
    };
  },

  "exam-practice"(target) {
    const n = target.topicSerial;
    const mode = n % 4;
    if (mode === 0) return generators.derivatives({ ...target, family: "derivatives" });
    if (mode === 1) return generators.conics({ ...target, family: "conics" });
    if (mode === 2) return generators.sequences({ ...target, family: "sequences" });
    return generators.probability({ ...target, family: "probability" });
  }
};

function factorial(value) {
  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) result *= factor;
  return result;
}

function binomial(total, selected) {
  if (selected < 0 || selected > total) return 0;
  const k = Math.min(selected, total - selected);
  let numerator = 1;
  let denominator = 1;
  for (let index = 1; index <= k; index += 1) {
    numerator *= total - k + index;
    denominator *= index;
  }
  return numerator / denominator;
}

function generateQuestions(plan) {
  return plan.map((target) => {
    const generator = generators[target.family];
    if (!generator) throw new Error(`Missing generator for ${target.family}`);
    return asQuestion(target, generator(target));
  });
}

function questionText(question) {
  return [
    question.promptZhHans,
    ...(question.optionsZhHans ?? []),
    question.answer,
    ...(question.acceptedAnswers ?? []),
    question.explanationZhHans
  ].join("\n");
}

function auditQuestions(questions, plan, topics) {
  const issues = [];
  const byId = countBy(questions, (question) => question.id);
  const duplicateIds = Object.entries(byId).filter(([, count]) => count > 1).map(([id]) => id);
  const byPrompt = countBy(questions, (question) => question.promptZhHans.replace(/\s+/g, " ").trim());
  const duplicatePrompts = Object.entries(byPrompt).filter(([, count]) => count > 1).map(([prompt]) => prompt);
  if (questions.length !== 1200) issues.push(`total questions ${questions.length} != 1200`);
  if (plan.length !== 1200) issues.push(`target matrix ${plan.length} != 1200`);
  if (duplicateIds.length) issues.push(`duplicate ids: ${duplicateIds.slice(0, 5).join(", ")}`);
  if (duplicatePrompts.length) issues.push(`duplicate prompts: ${duplicatePrompts.slice(0, 3).join(" | ")}`);

  for (const grade of grades) {
    const gradeQuestions = questions.filter((question) => question.grade === grade);
    if (gradeQuestions.length !== 400) issues.push(`${grade} count ${gradeQuestions.length} != 400`);
    for (const [type, expected] of Object.entries(typeQuotas[grade])) {
      const actual = gradeQuestions.filter((question) => question.type === type).length;
      if (actual !== expected) issues.push(`${grade} ${type} count ${actual} != ${expected}`);
    }
    for (const [difficulty, expected] of Object.entries(difficultyQuotas[grade])) {
      const actual = gradeQuestions.filter((question) => question.difficulty === difficulty).length;
      if (actual !== expected) issues.push(`${grade} ${difficulty} count ${actual} != ${expected}`);
    }
  }

  for (const topic of topics.filter((topic) => grades.includes(topic.grade))) {
    const expected = topicCountsById[topic.id];
    const actual = questions.filter((question) => question.topicId === topic.id).length;
    if (actual !== expected) issues.push(`${topic.id} count ${actual} != ${expected}`);
  }

  for (const question of questions) {
    const text = questionText(question);
    if (!question.promptZhHans.trim()) issues.push(`${question.id} missing prompt`);
    if (!question.answer.trim()) issues.push(`${question.id} missing answer`);
    if (!question.explanationZhHans.trim()) issues.push(`${question.id} missing explanation`);
    if (/NaN|undefined|\+\-|\-\-/.test(text)) issues.push(`${question.id} generated invalid placeholder or sign pattern`);
    if (!question.acceptedAnswers.includes(question.answer)) issues.push(`${question.id} acceptedAnswers missing answer`);
    if (!question.evidenceCardIds.length) issues.push(`${question.id} missing evidence cards`);
    if (forbiddenQuestionTextPattern.test(text)) issues.push(`${question.id} source-distance forbidden wording`);
    if (traditionalChineseRiskPattern.test(text)) issues.push(`${question.id} possible Traditional Chinese character`);
    if (question.type === "multiple-choice") {
      if (question.optionsZhHans.length !== 4) issues.push(`${question.id} multiple-choice options length ${question.optionsZhHans.length}`);
      if (new Set(question.optionsZhHans).size !== question.optionsZhHans.length) issues.push(`${question.id} duplicate options`);
      if (question.optionsZhHans.filter((option) => option === question.answer).length !== 1) {
        issues.push(`${question.id} answer must match exactly one option`);
      }
    } else if (question.optionsZhHans.length) {
      issues.push(`${question.id} ${question.type} should not have options`);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    duplicateIds,
    duplicatePrompts,
    summary: {
      totalQuestions: questions.length,
      totalTargets: plan.length,
      gradeCounts: countBy(questions, (question) => question.grade),
      gradeTypeCounts: countBy(questions, (question) => `${question.grade}-${question.type}`),
      gradeDifficultyCounts: countBy(questions, (question) => `${question.grade}-${question.difficulty}`),
      topicCounts: countBy(questions, (question) => question.topicId),
      duplicateIdCount: duplicateIds.length,
      duplicatePromptCount: duplicatePrompts.length
    }
  };
}

function manualReviewQueue(questions, audit) {
  const selected = new Map();
  for (const topicId of Object.keys(topicCountsById)) {
    const topicRows = questions.filter((question) => question.topicId === topicId);
    const typeBalanced = [];
    for (const type of questionTypes) {
      typeBalanced.push(...topicRows.filter((question) => question.type === type).slice(0, 4));
    }
    for (const row of typeBalanced.slice(0, 10)) selected.set(row.id, { ...row, reviewReason: "topic-balanced-s18-sample" });
  }
  for (const issue of audit.issues) {
    const id = issue.match(/^(pep-high-hybrid-v1-[^ ]+)/)?.[1];
    if (!id) continue;
    const question = questions.find((row) => row.id === id);
    if (question) selected.set(id, { ...question, reviewReason: "auto-qa-flag" });
  }
  return Array.from(selected.values()).sort((left, right) => left.grade.localeCompare(right.grade) || left.topicId.localeCompare(right.topicId) || left.id.localeCompare(right.id));
}

function coverageRows(questions, topics) {
  const rows = [];
  for (const topic of topics.filter((item) => grades.includes(item.grade))) {
    const topicQuestions = questions.filter((question) => question.topicId === topic.id);
    rows.push({
      grade: topic.grade,
      topicId: topic.id,
      topicTitleZhHans: topic.title.zh,
      expectedTotal: topicCountsById[topic.id],
      actualTotal: topicQuestions.length,
      multipleChoice: topicQuestions.filter((question) => question.type === "multiple-choice").length,
      fillIn: topicQuestions.filter((question) => question.type === "fill-in").length,
      shortAnswer: topicQuestions.filter((question) => question.type === "short-answer").length,
      Foundation: topicQuestions.filter((question) => question.difficulty === "Foundation").length,
      Core: topicQuestions.filter((question) => question.difficulty === "Core").length,
      Challenge: topicQuestions.filter((question) => question.difficulty === "Challenge").length,
      Exam: topicQuestions.filter((question) => question.difficulty === "Exam").length
    });
  }
  return rows;
}

function csvEscape(value) {
  if (Array.isArray(value)) return csvEscape(value.join(" | "));
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function markdownSummary({ audit, queue, coverage, startedAt, finishedAt }) {
  const status = audit.passed ? "auto-qa-passed-human-review-required" : "auto-qa-blocked";
  return [
    "# Mainland PEP High Hybrid 1200 Candidate QA Summary",
    "",
    "- Date: 2026-05-23",
    "- Session ID: S18",
    "- Scope: Review-only Mainland PEP high-school S4-S6 candidate pack",
    "- Candidate package: `mainland-pep-high-hybrid-1200-v1`",
    "- Hybrid mode: `bl`/DashScope attempted first, no API key found; deterministic rule fallback generated all rows.",
    "- Source-safety boundary: used committed MAIS safe RAG and exam-pattern metadata only; no textbook body text, exam stem, official solution wording, OCR, image, source locator, page number, or secret was read or stored.",
    "- Official curriculum reference for human reviewers: https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517519489596282.pdf",
    "",
    "## Executive Summary",
    "",
    `- QA status: ${status}`,
    `- Total questions: ${audit.summary.totalQuestions} / 1200`,
    `- Duplicate IDs: ${audit.summary.duplicateIdCount}`,
    `- Duplicate exact prompts: ${audit.summary.duplicatePromptCount}`,
    `- Manual review queue rows: ${queue.length}`,
    `- Started at: ${startedAt}`,
    `- Finished at: ${finishedAt}`,
    "",
    "## Grade And Type Counts",
    "",
    "| Grade | Total | Multiple choice | Fill-in | Short answer |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...grades.map((grade) => {
      const total = audit.summary.gradeCounts[grade] ?? 0;
      return `| ${grade} | ${total} | ${audit.summary.gradeTypeCounts[`${grade}-multiple-choice`] ?? 0} | ${audit.summary.gradeTypeCounts[`${grade}-fill-in`] ?? 0} | ${audit.summary.gradeTypeCounts[`${grade}-short-answer`] ?? 0} |`;
    }),
    "",
    "## Grade And Difficulty Counts",
    "",
    "| Grade | Foundation | Core | Challenge | Exam |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...grades.map((grade) => `| ${grade} | ${audit.summary.gradeDifficultyCounts[`${grade}-Foundation`] ?? 0} | ${audit.summary.gradeDifficultyCounts[`${grade}-Core`] ?? 0} | ${audit.summary.gradeDifficultyCounts[`${grade}-Challenge`] ?? 0} | ${audit.summary.gradeDifficultyCounts[`${grade}-Exam`] ?? 0} |`),
    "",
    "## Topic Coverage",
    "",
    "| Grade | Topic | Expected | Actual | MC | FI | SA |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...coverage.map((row) => `| ${row.grade} | ${row.topicId} | ${row.expectedTotal} | ${row.actualTotal} | ${row.multipleChoice} | ${row.fillIn} | ${row.shortAnswer} |`),
    "",
    "## Auto-QA Issues",
    "",
    audit.issues.length ? audit.issues.map((issue) => `- ${issue}`).join("\n") : "- None.",
    "",
    "## Human Review Gate",
    "",
    "- S18 must manually solve/review at least 10 questions per topic, plus every auto-flagged row.",
    "- Candidate rows must not be promoted into `data/mainlandPepHighQuestions.ts` until manual review passes and owner explicitly approves production integration.",
    "- S04/S08 coordination is required before any formal question-bank integration.",
    ""
  ].join("\n");
}

function promotabilityDecision(audit, queue) {
  return [
    "# Promotability Decision: Mainland PEP High Hybrid 1200 V1",
    "",
    `- Decision: ${audit.passed ? "blocked-human-review-required" : "blocked-auto-qa"}`,
    "- Public integration: not authorized in this task",
    `- Auto-QA passed: ${audit.passed}`,
    `- Total questions: ${audit.summary.totalQuestions} / 1200`,
    `- Duplicate IDs: ${audit.summary.duplicateIdCount}`,
    `- Duplicate exact prompts: ${audit.summary.duplicatePromptCount}`,
    `- Manual review queue rows: ${queue.length}`,
    "",
    "## Rationale",
    "",
    audit.passed
      ? "The candidate package meets deterministic inventory, structure, answer-key, Simplified Chinese, source-distance, and exact-duplicate gates. It remains blocked from promotion because S18 manual topic sampling has not been completed."
      : "The candidate package has automatic QA issues that must be fixed before manual review or production promotion.",
    "",
    "## Next Safe Step",
    "",
    "- Complete S18 manual review using `manual-review-queue.csv`.",
    "- If manual review passes, request explicit owner approval for a separate production integration task.",
    ""
  ].join("\n");
}

function writePackage({ questions, plan, audit, queue, coverage, metadata }) {
  const columns = [
    "id",
    "grade",
    "topicId",
    "topicTitleZhHans",
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
    "hybridMode",
    "generatorFamily",
    "generatorVariant",
    "reviewNotes"
  ];
  const jsonl = questions.map((question) => JSON.stringify(question)).join("\n");
  fs.writeFileSync(path.join(__dirname, "questions.candidate.jsonl"), `${jsonl}\n`, "utf8");
  writeCsv(path.join(__dirname, "questions.candidate.csv"), questions, columns);
  writeCsv(path.join(__dirname, "manual-review-queue.csv"), queue, ["reviewReason", ...columns]);
  writeCsv(path.join(__dirname, "coverage-matrix.csv"), coverage, [
    "grade",
    "topicId",
    "topicTitleZhHans",
    "expectedTotal",
    "actualTotal",
    "multipleChoice",
    "fillIn",
    "shortAnswer",
    "Foundation",
    "Core",
    "Challenge",
    "Exam"
  ]);
  fs.writeFileSync(path.join(__dirname, "generation-metadata.json"), `${JSON.stringify({ ...metadata, audit: audit.summary, targetCount: plan.length }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(__dirname, "qa-summary.md"), markdownSummary({ audit, queue, coverage, startedAt: metadata.startedAt, finishedAt: metadata.finishedAt }), "utf8");
  fs.writeFileSync(path.join(__dirname, "promotability-decision.md"), promotabilityDecision(audit, queue), "utf8");
}

function main() {
  const startedAt = new Date().toISOString();
  const moduleCache = new Map();
  const topics = loadTsModule(path.join(rootDir, "data/mainlandPepHighTopics.ts"), moduleCache).mainlandPepHighTopics;
  const ragCards = loadTsModule(path.join(rootDir, "data/rag/mainlandPepHigh.ts"), moduleCache).mainlandPepHighRagCards;
  const patternCards = loadTsModule(path.join(rootDir, "data/rag/mainlandPepHighExamPatterns.ts"), moduleCache).mainlandPepHighExamPatternCards;
  const plan = buildPlan(topics, ragCards, patternCards);

  if (process.argv.includes("--dry-run")) {
    const dryRun = {
      targetCount: plan.length,
      gradeCounts: countBy(plan, (target) => target.grade),
      gradeTypeCounts: countBy(plan, (target) => `${target.grade}-${target.type}`),
      gradeDifficultyCounts: countBy(plan, (target) => `${target.grade}-${target.difficulty}`),
      topicCounts: countBy(plan, (target) => target.topicId)
    };
    console.log(JSON.stringify(dryRun, null, 2));
    return;
  }

  const questions = generateQuestions(plan);
  const audit = auditQuestions(questions, plan, topics);
  const queue = manualReviewQueue(questions, audit);
  const coverage = coverageRows(questions, topics);
  const finishedAt = new Date().toISOString();
  const metadata = {
    generatedAt: finishedAt,
    startedAt,
    finishedAt,
    sessionId: "S18",
    packageId: "mainland-pep-high-hybrid-1200-v1",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    stage: "senior-secondary",
    grades,
    requestedQuestionCount: 1200,
    outputTarget: "candidate-package",
    generationMode: "hybrid-requested-rule-fallback-produced",
    aiProviderAttempt: {
      provider: "bl/DashScope",
      status: "unavailable-no-api-key",
      secretHygiene: "No key, request transcript, source locator, OCR text, or protected source text stored."
    },
    sourceSafety: {
      committedInputsOnly: [
        "data/mainlandPepHighTopics.ts",
        "data/rag/mainlandPepHigh.ts",
        "data/rag/mainlandPepHighExamPatterns.ts"
      ],
      officialReferenceForHumanReview: "https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517519489596282.pdf",
      prohibitedMaterialNotUsed: true
    },
    quotas: {
      typeQuotas,
      difficultyQuotas,
      topicCountsById
    }
  };

  writePackage({ questions, plan, audit, queue, coverage, metadata });
  console.log(JSON.stringify({ status: audit.passed ? "auto-qa-passed-human-review-required" : "auto-qa-blocked", questions: questions.length, issues: audit.issues.length, manualReviewQueue: queue.length }, null, 2));
  if (!audit.passed) process.exitCode = 1;
}

main();
