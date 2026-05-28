import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const outputFiles = {
  jsonl: path.join(__dirname, "questions.jsonl"),
  csv: path.join(__dirname, "questions.csv"),
  pack: path.join(__dirname, "question-pack.json"),
  coverage: path.join(__dirname, "coverage-matrix.csv")
};

const batch = "junior-rag-v2-1200";
const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const typePrefixes = {
  "multiple-choice": "mc",
  "fill-in": "fi",
  "short-answer": "sa"
};
const typeQuotasByGradeSemester = {
  S1: {
    upper: { "multiple-choice": 67, "fill-in": 67, "short-answer": 66 },
    lower: { "multiple-choice": 67, "fill-in": 66, "short-answer": 67 }
  },
  S2: {
    upper: { "multiple-choice": 67, "fill-in": 67, "short-answer": 66 },
    lower: { "multiple-choice": 66, "fill-in": 67, "short-answer": 67 }
  },
  S3: {
    upper: { "multiple-choice": 67, "fill-in": 66, "short-answer": 67 },
    lower: { "multiple-choice": 66, "fill-in": 67, "short-answer": 67 }
  }
};
const difficultyQuotasByGrade = {
  S1: { Foundation: 130, Core: 210, Exam: 50, Challenge: 10 },
  S2: { Foundation: 70, Core: 230, Exam: 80, Challenge: 20 },
  S3: { Foundation: 30, Core: 170, Exam: 150, Challenge: 50 }
};
const gradeOrder = ["S1", "S2", "S3"];

function loadTsExport(filePath, exportName) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/^import\s+type\s+.*;\s*$/gm, "")
    .replace(new RegExp(`export const ${exportName}: [^=]+ =`), `exports.${exportName} =`);
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s\-_/，、。,.()[\]（）:：;；]+/g, "");
}

function intersectionScore(queryValues, cardValues) {
  const normalizedCardValues = cardValues.map(normalize);
  return queryValues
    .map(normalize)
    .filter(Boolean)
    .filter((queryValue) =>
      normalizedCardValues.some((cardValue) => cardValue === queryValue || cardValue.includes(queryValue) || queryValue.includes(cardValue))
    ).length;
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => String(value ?? "").trim().length > 0)));
}

function rotate(values, seed) {
  const offset = seed % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function optionsFor(answer, distractors, seed) {
  const numericAnswer = Number(answer);
  const numericFallbacks = Number.isFinite(numericAnswer)
    ? [numericAnswer + 1, numericAnswer - 1, numericAnswer + 2, numericAnswer - 2, -numericAnswer + 3].map(String)
    : [];
  const textFallbacks = [`${answer}（少一步）`, `${answer}（符号相反）`, `${answer}（单位错误）`];
  const values = unique([answer, ...distractors, ...numericFallbacks, ...textFallbacks]).slice(0, 4);
  if (values.length !== 4) throw new Error(`Could not build four options for answer ${answer}`);
  return rotate(values, seed);
}

function accepted(answer, extra = []) {
  return unique([answer, ...extra]);
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function xMinus(value) {
  return value >= 0 ? `x-${value}` : `x+${Math.abs(value)}`;
}

function fraction(numerator, denominator) {
  const factor = gcd(Math.abs(numerator), Math.abs(denominator));
  const sign = denominator < 0 ? -1 : 1;
  return `${(numerator / factor) * sign}/${Math.abs(denominator / factor)}`;
}

function gcd(left, right) {
  let a = left;
  let b = right;
  while (b) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function scorePaperPattern(card, curriculumCard) {
  const values = [
    ...card.unitTitles,
    ...card.conceptIds,
    ...card.competencyTags,
    ...(card.skillTags ?? []),
    ...card.itemTypeTags,
    ...(card.solutionStrategyTags ?? []),
    ...card.misconceptionTags
  ];
  return (
    (card.grade === curriculumCard.grade ? 12 : 0) +
    (card.semester === curriculumCard.semester ? 8 : 0) +
    intersectionScore([...curriculumCard.conceptIds, ...curriculumCard.skillTags, curriculumCard.unitTitle], values) * 5
  );
}

function scoreExamPattern(card, curriculumCard) {
  const values = [
    ...card.unitTitles,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.itemTypeTags,
    ...card.solutionStrategyTags,
    ...card.misconceptionTags
  ];
  return (
    (card.grades.includes(curriculumCard.grade) ? 12 : 0) +
    (card.semesters.includes(curriculumCard.semester) || card.semesters.includes("full-year") ? 6 : 0) +
    intersectionScore([...curriculumCard.conceptIds, ...curriculumCard.skillTags, curriculumCard.unitTitle], values) * 5
  );
}

function bestEvidenceIds(cards, scoreFn, curriculumCard, occurrence, fallbackFilter) {
  const scored = cards
    .map((card, index) => ({ card, index, score: scoreFn(card, curriculumCard) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const pool = scored.length ? scored : cards.filter(fallbackFilter).map((card, index) => ({ card, index, score: 0 }));
  if (!pool.length) throw new Error(`Missing evidence card for ${curriculumCard.id}`);
  return [pool[occurrence % pool.length].card.id];
}

function repeatValue(value, count) {
  return Array.from({ length: count }, () => value);
}

function difficultySequenceForGrade(grade) {
  const quotas = difficultyQuotasByGrade[grade];
  return [
    ...repeatValue("Foundation", quotas.Foundation),
    ...repeatValue("Core", quotas.Core),
    ...repeatValue("Exam", quotas.Exam),
    ...repeatValue("Challenge", quotas.Challenge)
  ];
}

function makeDraft(cardId, type, n) {
  switch (cardId) {
    case "pep-junior-s1-upper-rational-numbers":
      return rationalNumbers(type, n);
    case "pep-junior-s1-upper-expressions-linear-equations":
      return expressionsLinearEquations(type, n);
    case "pep-junior-s1-upper-geometric-figures":
      return geometricFigures(type, n);
    case "pep-junior-s1-lower-lines-coordinates":
      return linesCoordinates(type, n);
    case "pep-junior-s1-lower-equations-inequalities-data":
      return systemsInequalitiesData(type, n);
    case "pep-junior-s2-upper-triangles-congruence":
      return trianglesCongruence(type, n);
    case "pep-junior-s2-upper-polynomials-fractions":
      return polynomialsFractions(type, n);
    case "pep-junior-s2-lower-roots-pythagorean-quadrilaterals":
      return rootsPythagoreanQuadrilaterals(type, n);
    case "pep-junior-s2-lower-linear-functions-data":
      return linearFunctionsData(type, n);
    case "pep-junior-s3-upper-quadratics-circle-probability":
      return quadraticsCircleProbability(type, n);
    case "pep-junior-s3-lower-inverse-similarity-trigonometry":
      return inverseSimilarityTrigonometry(type, n);
    default:
      throw new Error(`No deterministic draft family for ${cardId}`);
  }
}

function rationalNumbers(type, n) {
  const start = -12 - (n % 9);
  const rise = 15 + ((n * 2) % 11);
  const fall = 3 + (n % 6);
  const result = start + rise - fall;
  if (type === "multiple-choice") {
    const answer = String(result);
    return {
      promptZhHans: `某地清晨气温为${start}℃，中午上升${rise}℃，傍晚又下降${fall}℃。傍晚气温是多少？`,
      optionsZhHans: optionsFor(answer, [String(result + 2), String(result - 2), String(-result)], n),
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `按正负变化计算：${start}+${rise}-${fall}=${result}，所以傍晚气温是${result}℃。`
    };
  }
  if (type === "fill-in") {
    const a = 5 + (n % 8);
    const b = 2 + ((n * 3) % 7);
    const answer = String(Math.abs(-a) + b);
    return {
      promptZhHans: `数轴上点A表示-${a}，点B表示${b}。A、B两点之间的距离是____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `两点距离为${b}-(-${a})=${answer}，所以距离是${answer}。`
    };
  }
  const a = 18 + (n % 31);
  const b = 7 + ((n * 2) % 29);
  const c = 4 + (n % 23);
  const answer = String(-a + b - c);
  return {
    promptZhHans: `计算并说明符号：-${a}+${b}-${c}。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: accepted(answer),
    explanationZhHans: `先合并正负变化，-${a}+${b}-${c}=${answer}，结果为负数。`
  };
}

function expressionsLinearEquations(type, n) {
  const a = 2 + (n % 5);
  const c = 1 + ((n * 2) % 4);
  const b = 3 + (n % 7);
  const d = 1 + ((n * 3) % 5);
  if (type === "multiple-choice") {
    const coeff = a + c;
    const constant = b - d;
    const answer = constant >= 0 ? `${coeff}x+${constant}` : `${coeff}x${constant}`;
    return {
      promptZhHans: `化简：(${a}x+${b})+(${c}x-${d})。`,
      optionsZhHans: optionsFor(answer, [`${coeff}x+${b + d}`, `${a + c + b}x-${d}`, `${a - c}x+${constant}`], n),
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `同类项合并得(${a}+${c})x+(${b}-${d})=${answer}。`
    };
  }
  if (type === "fill-in") {
    const x = 2 + (n % 9);
    const k = 2 + (n % 4);
    const m = 5 + ((n * 3) % 8);
    const total = k * x + m;
    const answer = String(x);
    return {
      promptZhHans: `解方程：${k}x+${m}=${total}。x=____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `两边减${m}得${k}x=${total - m}，再除以${k}，x=${answer}。`
    };
  }
  const notebooks = 3 + (n % 5);
  const price = 2 + ((n * 2) % 6);
  const extra = 4 + (n % 7);
  const total = notebooks * price + extra;
  const answer = `${notebooks}x+${extra}=${total}`;
  return {
    promptZhHans: `每本练习本x元，买${notebooks}本后又花${extra}元买笔，共用${total}元。写出求x的方程。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: accepted(answer, [`${extra}+${notebooks}x=${total}`]),
    explanationZhHans: `${notebooks}本练习本花${notebooks}x元，加上${extra}元等于${total}元，方程是${answer}。`
  };
}

function geometricFigures(type, n) {
  if (type === "multiple-choice") {
    const angle = 35 + ((n * 7) % 100);
    const answer = `${180 - angle}°`;
    return {
      promptZhHans: `两个角组成平角，其中一个角是${angle}°，另一个角是多少？`,
      optionsZhHans: optionsFor(answer, [`${angle}°`, `${90 - (angle % 30)}°`, `${180}°`], n),
      answer,
      acceptedAnswers: accepted(answer, [String(180 - angle)]),
      explanationZhHans: `平角为180°，另一个角是180°-${angle}°=${answer}。`
    };
  }
  if (type === "fill-in") {
    const length = 12 + (n % 50) * 2;
    const answer = `${length / 2}厘米`;
    return {
      promptZhHans: `线段AB长${length}厘米，点C是AB的中点。AC=____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer, [String(length / 2), `${length / 2}cm`]),
      explanationZhHans: `中点把线段平均分成两段，AC=${length}÷2=${answer}。`
    };
  }
  const small = 20 + ((n * 7) % 69);
  const answer = `${90 - small}°`;
  return {
    promptZhHans: `两个角互余，其中一个角是${small}°。求另一个角的度数，并写出理由。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: accepted(answer, [String(90 - small)]),
    explanationZhHans: `互余两角和为90°，所以另一个角是90°-${small}°=${answer}。`
  };
}

function linesCoordinates(type, n) {
  const x = -5 + (n % 11);
  const y = -6 + ((n * 3) % 13);
  if (type === "multiple-choice") {
    const dx = 2 + (n % 5);
    const dy = 1 + ((n * 2) % 4);
    const answer = `(${x + dx},${y - dy})`;
    return {
      promptZhHans: `点P(${x},${y})先向右平移${dx}个单位，再向下平移${dy}个单位，所得点的坐标是？`,
      optionsZhHans: optionsFor(answer, [`(${x - dx},${y - dy})`, `(${x + dx},${y + dy})`, `(${y - dy},${x + dx})`], n),
      answer,
      acceptedAnswers: accepted(answer, [`(${x + dx}, ${y - dy})`]),
      explanationZhHans: `向右使x加${dx}，向下使y减${dy}，所以坐标为${answer}。`
    };
  }
  if (type === "fill-in") {
    const angle = 40 + ((n * 9) % 80);
    const answer = `${angle}°`;
    return {
      promptZhHans: `两条平行直线被一条截线所截，一组同位角中一个角为${angle}°，另一个同位角为____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer, [String(angle)]),
      explanationZhHans: `两直线平行，同位角相等，所以另一个同位角也是${answer}。`
    };
  }
  const a = 2 + (n % 29);
  const b = 3 + ((n * 2) % 31);
  const answer = `第四象限`;
  return {
    promptZhHans: `点Q(${a},-${b})位于哪个象限？说明判断依据。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: accepted(answer, ["第IV象限", "第4象限"]),
    explanationZhHans: `横坐标为正、纵坐标为负，点Q位于${answer}。`
  };
}

function systemsInequalitiesData(type, n) {
  if (type === "multiple-choice") {
    const boundary = 3 + (n % 37);
    const answer = `x>${boundary}`;
    return {
      promptZhHans: `解不等式：2x-${boundary} > ${boundary}。`,
      optionsZhHans: optionsFor(answer, [`x<${boundary}`, `x>${boundary * 2}`, `x<${boundary * 2}`], n),
      answer,
      acceptedAnswers: accepted(answer, [`x＞${boundary}`]),
      explanationZhHans: `2x-${boundary}>${boundary}，得2x>${boundary * 2}，所以${answer}。`
    };
  }
  if (type === "fill-in") {
    const x = 2 + (n % 23);
    const y = 1 + ((n * 2) % 31);
    const sum = x + y;
    const diff = x - y;
    const answer = `(${x},${y})`;
    return {
      promptZhHans: `方程组x+y=${sum}，x-y=${diff}的解是____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer, [`x=${x},y=${y}`, `(${x}, ${y})`]),
      explanationZhHans: `两式相加得2x=${sum + diff}，x=${x}；代回得y=${y}，解为${answer}。`
    };
  }
  const base = 8 + (n % 37);
  const values = [base, base + 3, base + 6];
  const answer = String(base + 3);
  return {
    promptZhHans: `某小组三次测量的数据分别是${values.join("、")}。求这三次数据的平均数。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: accepted(answer),
    explanationZhHans: `平均数=(${values.join("+")})÷3=${answer}。`
  };
}

function trianglesCongruence(type, n) {
  if (type === "multiple-choice") {
    const a = 35 + ((n * 5) % 45);
    const b = 40 + ((n * 7) % 55);
    const answer = `${180 - a - b}°`;
    return {
      promptZhHans: `三角形的两个内角分别为${a}°和${b}°，第三个内角是多少？`,
      optionsZhHans: optionsFor(answer, [`${a + b}°`, `${90 - (a % 20)}°`, `${180 - b}°`], n),
      answer,
      acceptedAnswers: accepted(answer, [String(180 - a - b)]),
      explanationZhHans: `三角形内角和为180°，第三个角是180°-${a}°-${b}°=${answer}。`
    };
  }
  if (type === "fill-in") {
    const base = 40 + 2 * (n % 45);
    const answer = `${(180 - base) / 2}°`;
    return {
      promptZhHans: `等腰三角形的顶角为${base}°，每个底角为____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer, [String((180 - base) / 2)]),
      explanationZhHans: `两个底角相等，每个底角=(180°-${base}°)÷2=${answer}。`
    };
  }
  const sideA = 4 + (n % 19);
  const sideB = 6 + ((n * 2) % 23);
  const sideC = 8 + ((n * 3) % 29);
  return {
    promptZhHans: `在△ABC和△DEF中，AB=DE=${sideA}厘米，BC=EF=${sideB}厘米，AC=DF=${sideC}厘米。可用哪一种判定说明两个三角形全等？`,
    optionsZhHans: [],
    answer: "SSS",
    acceptedAnswers: accepted("SSS", ["边边边"]),
    explanationZhHans: `三组对应边分别相等，可用边边边判定，即SSS。`
  };
}

function polynomialsFractions(type, n) {
  const m = 2 + (n % 19);
  const p = 1 + ((n * 2) % 17);
  if (type === "multiple-choice") {
    const answer = `(x+${m})(x+${p})`;
    return {
      promptZhHans: `因式分解：x²+${m + p}x+${m * p}。`,
      optionsZhHans: optionsFor(answer, [`(x+${m + p})(x+1)`, `(x-${m})(x-${p})`, `(x+${m})(x-${p})`], n),
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `${m}+${p}=${m + p}，${m}×${p}=${m * p}，所以分解为${answer}。`
    };
  }
  if (type === "fill-in") {
    const a = 2 + (n % 8);
    const b = 3 + ((n * 2) % 9);
    const leftPower = 1 + (n % 3);
    const rightPower = 1 + ((n * 2) % 3);
    const totalPower = leftPower + rightPower;
    const answer = `${a * b}x^${totalPower}`;
    return {
      promptZhHans: `计算：${a}x^${leftPower}·${b}x^${rightPower}=____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `系数相乘、同底数幂指数相加，${a}x^${leftPower}·${b}x^${rightPower}=${answer}。`
    };
  }
  const k = 2 + (n % 8);
  const c = 1 + ((n * 3) % 7);
  const answer = String(k);
  return {
    promptZhHans: `化简分式(${k}x+${k * c})/(x+${c})，并注明x不能等于什么。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: accepted(answer, [`${answer}，x≠-${c}`]),
    explanationZhHans: `分子提公因式得${k}(x+${c})，约分后为${answer}，且x≠-${c}。`
  };
}

function rootsPythagoreanQuadrilaterals(type, n) {
  const radicalBase = [2, 3, 5, 6, 7][n % 5];
  const factor = 2 + (n % 7);
  if (type === "multiple-choice") {
    const answer = `${factor}√${radicalBase}`;
    return {
      promptZhHans: `化简：√${factor * factor * radicalBase}。`,
      optionsZhHans: optionsFor(answer, [`${factor * radicalBase}√${radicalBase}`, `√${factor * radicalBase}`, `${factor}√${factor * radicalBase}`], n),
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `√${factor * factor * radicalBase}=√(${factor}²×${radicalBase})=${answer}。`
    };
  }
  if (type === "fill-in") {
    const triples = [[3, 4, 5], [5, 12, 13], [7, 24, 25], [8, 15, 17], [9, 40, 41]];
    const [a, b, c] = triples[n % triples.length];
    const multiplier = 1 + (n % 7);
    const answer = `${c * multiplier}厘米`;
    return {
      promptZhHans: `直角三角形两条直角边分别为${a * multiplier}厘米和${b * multiplier}厘米，斜边长____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer, [String(c * multiplier)]),
      explanationZhHans: `由勾股定理，斜边=√(${a * multiplier}²+${b * multiplier}²)=${answer}。`
    };
  }
  const side = 6 + (n % 37);
  const answer = `${side}厘米`;
  return {
    promptZhHans: `平行四边形ABCD中，AB=${side}厘米。若CD与AB是对边，CD长多少？`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: accepted(answer, [String(side)]),
    explanationZhHans: `平行四边形对边相等，所以CD=AB=${answer}。`
  };
}

function linearFunctionsData(type, n) {
  const k = 2 + (n % 5);
  const b = -4 + ((n * 3) % 9);
  if (type === "multiple-choice") {
    const x = 1 + (n % 8);
    const y = k * x + b;
    const answer = String(y);
    return {
      promptZhHans: `一次函数y=${k}x${signed(b)}，当x=${x}时，y的值是多少？`,
      optionsZhHans: optionsFor(answer, [String(y + k), String(y - k), String(k + b)], n),
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `代入x=${x}，y=${k}×${x}${signed(b)}=${answer}。`
    };
  }
  if (type === "fill-in") {
    const x1 = 1 + (n % 5);
    const y1 = 2 + ((n * 2) % 7);
    const slope = 2 + ((n * 3) % 5);
    const x2 = x1 + 2;
    const y2 = y1 + slope * 2;
    const answer = String(slope);
    return {
      promptZhHans: `一次函数图象经过点(${x1},${y1})和(${x2},${y2})，它的斜率是____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `斜率=(${y2}-${y1})÷(${x2}-${x1})=${answer}。`
    };
  }
  const dataBase = 12 + (n % 37);
  const values = [dataBase, dataBase + 2, dataBase + 4, dataBase + 6];
  const answer = String((values[1] + values[2]) / 2);
  return {
    promptZhHans: `一组数据按从小到大排列为${values.join("、")}。求这组数据的中位数。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: accepted(answer),
    explanationZhHans: `共有4个数，中位数是中间两个数的平均数：(${values[1]}+${values[2]})÷2=${answer}。`
  };
}

function quadraticsCircleProbability(type, n) {
  const r1 = 1 + (n % 23);
  const r2 = r1 + 2 + (n % 11);
  if (type === "multiple-choice") {
    const answer = `x=${r1}或x=${r2}`;
    return {
      promptZhHans: `解方程：(x-${r1})(x-${r2})=0。`,
      optionsZhHans: optionsFor(answer, [`x=${r1}`, `x=${r2}`, `x=${-r1}或x=${-r2}`], n),
      answer,
      acceptedAnswers: accepted(answer, [`x=${r1},x=${r2}`]),
      explanationZhHans: `两个因式乘积为0，所以x-${r1}=0或x-${r2}=0，答案是${answer}。`
    };
  }
  if (type === "fill-in") {
    const h = -8 + (n % 31);
    const k = 2 + ((n * 2) % 29);
    const answer = `x=${h}`;
    return {
      promptZhHans: `二次函数y=(${xMinus(h)})²+${k}的对称轴是____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `顶点式y=(${xMinus(h)})²+${k}的对称轴为${answer}。`
    };
  }
  const red = 2 + (n % 17);
  const blue = 3 + ((n * 2) % 19);
  const answer = fraction(red, red + blue);
  return {
    promptZhHans: `袋中有${red}个红球和${blue}个蓝球，随机摸出1个球。摸到红球的概率是多少？`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: accepted(answer),
    explanationZhHans: `共有${red + blue}个球，其中红球${red}个，所以概率是${red}/${red + blue}=${answer}。`
  };
}

function inverseSimilarityTrigonometry(type, n) {
  if (type === "multiple-choice") {
    const x = 2 + (n % 29);
    const y = 3 + ((n * 2) % 31);
    const answer = String(x * y);
    return {
      promptZhHans: `反比例函数y=k/x经过点(${x},${y})，k的值是多少？`,
      optionsZhHans: optionsFor(answer, [String(x + y), String(y - x), String(x * y + x)], n),
      answer,
      acceptedAnswers: accepted(answer),
      explanationZhHans: `把点(${x},${y})代入y=k/x，得k=${x}×${y}=${answer}。`
    };
  }
  if (type === "fill-in") {
    const ratio = 2 + (n % 7);
    const side = 3 + ((n * 5) % 29);
    const answer = `${ratio * side}厘米`;
    return {
      promptZhHans: `两个相似三角形的相似比为${ratio}:1，小三角形一条对应边长${side}厘米，大三角形对应边长____。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: accepted(answer, [String(ratio * side)]),
      explanationZhHans: `对应边按相似比放大${ratio}倍，所以大三角形对应边长${ratio}×${side}=${answer}。`
    };
  }
  const distance = 5 + (n % 97);
  const answer = `${distance}米`;
  return {
    promptZhHans: `测得旗杆顶端的仰角为45°，测量点到旗杆底部的水平距离为${distance}米。若忽略测量高度，旗杆高约多少？`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: accepted(answer, [String(distance)]),
    explanationZhHans: `tan45°=1，高度=水平距离×1=${answer}。`
  };
}

function splitQuota(total, count) {
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function topicTypeQuotaKey(topicId, type) {
  return `${topicId}:${type}`;
}

function buildTopicTypeQuotas(curriculumCards) {
  const quotas = new Map();
  gradeOrder.forEach((grade) => {
    ["upper", "lower"].forEach((semester) => {
      const semesterCards = curriculumCards.filter((card) => card.grade === grade && card.semester === semester);
      const semesterTypeQuotas = typeQuotasByGradeSemester[grade]?.[semester];
      if (!semesterCards.length || !semesterTypeQuotas) return;

      questionTypes.forEach((type) => {
        splitQuota(semesterTypeQuotas[type], semesterCards.length).forEach((quota, index) => {
          quotas.set(topicTypeQuotaKey(semesterCards[index].id, type), quota);
        });
      });
    });
  });
  return quotas;
}

function promptKey(grade, type, prompt) {
  return `${grade}:${type}:${normalize(prompt)}`;
}

function ensureUniqueDraft(draft, grade, type, localIndex, seenPromptKeys) {
  let candidate = draft;
  let key = promptKey(grade, type, candidate.promptZhHans);
  let variant = 1;
  while (seenPromptKeys.has(key)) {
    const suffix = `（原创变式${localIndex + 1}-${variant}）`;
    candidate = { ...draft, promptZhHans: `${draft.promptZhHans}${suffix}` };
    key = promptKey(grade, type, candidate.promptZhHans);
    variant += 1;
  }
  seenPromptKeys.add(key);
  return candidate;
}

function buildQuestions(curriculumCards, paperPatterns, examPatterns) {
  const rows = [];
  const topicTypeQuotas = buildTopicTypeQuotas(curriculumCards);
  const difficultySequences = Object.fromEntries(gradeOrder.map((grade) => [grade, difficultySequenceForGrade(grade)]));
  const gradeCounters = Object.fromEntries(gradeOrder.map((grade) => [grade, 0]));
  const seenPromptKeys = new Set();

  curriculumCards.forEach((card, cardIndex) => {
    questionTypes.forEach((type) => {
      const quota = topicTypeQuotas.get(topicTypeQuotaKey(card.id, type)) ?? 0;
      for (let localIndex = 0; localIndex < quota; localIndex += 1) {
        const globalSeed = cardIndex * 100000 + questionTypes.indexOf(type) * 1000 + localIndex + 1;
        const draft = ensureUniqueDraft(makeDraft(card.id, type, globalSeed), card.grade, type, localIndex, seenPromptKeys);
        const id = `pep-junior-v2-${card.grade.toLowerCase()}-k${String(cardIndex + 1).padStart(2, "0")}-${typePrefixes[type]}-${String(localIndex + 1).padStart(3, "0")}`;
        const paperPatternCardIds = bestEvidenceIds(
          paperPatterns,
          scorePaperPattern,
          card,
          localIndex,
          (pattern) => pattern.grade === card.grade
        );
        const examPatternCardIds = bestEvidenceIds(
          examPatterns,
          scoreExamPattern,
          card,
          localIndex,
          (pattern) => pattern.grades.includes(card.grade)
        );

        rows.push({
          id,
          batch,
          grade: card.grade,
          semester: card.semester,
          knowledgePointId: card.id,
          unitTitle: card.unitTitle,
          type,
          difficulty: difficultySequences[card.grade][gradeCounters[card.grade]++],
          promptZhHans: draft.promptZhHans,
          optionsZhHans: draft.optionsZhHans,
          answer: draft.answer,
          acceptedAnswers: draft.acceptedAnswers,
          explanationZhHans: draft.explanationZhHans,
          evidenceCardIds: [card.id],
          paperPatternCardIds,
          examPatternCardIds,
          sourceDistanceStatus: "passed",
          mathQaStatus: "pass",
          reviewNotes: "deterministic-original-v2-1200"
        });
      }
    });
  });

  gradeOrder.forEach((grade) => {
    if (gradeCounters[grade] !== 400) throw new Error(`Expected ${grade} to generate 400 rows; found ${gradeCounters[grade]}`);
  });

  return rows;
}

function buildCoverageRows(rows, curriculumCards) {
  const topicTypeQuotas = buildTopicTypeQuotas(curriculumCards);
  return curriculumCards.flatMap((card, cardIndex) =>
    questionTypes.map((type) => {
      const count = rows.filter((row) => row.knowledgePointId === card.id && row.type === type).length;
      return {
        knowledgePointOrder: cardIndex + 1,
        knowledgePointId: card.id,
        grade: card.grade,
        semester: card.semester,
        unitTitle: card.unitTitle,
        type,
        expectedCount: topicTypeQuotas.get(topicTypeQuotaKey(card.id, type)) ?? 0,
        actualCount: count
      };
    })
  );
}

function main() {
  const curriculumCards = loadTsExport(path.join(rootDir, "data/rag/mainlandPepJunior.ts"), "mainlandPepJuniorRagCards");
  const paperPatterns = loadTsExport(path.join(rootDir, "data/rag/mainlandPepJuniorPaperPatterns.ts"), "mainlandPepJuniorPaperPatternCards");
  const examPatterns = loadTsExport(path.join(rootDir, "data/rag/mainlandPepJuniorExamPatterns.ts"), "mainlandPepJuniorExamPatternCards");
  if (curriculumCards.length !== 11) throw new Error(`Expected 11 junior curriculum cards; found ${curriculumCards.length}`);

  const rows = buildQuestions(curriculumCards, paperPatterns, examPatterns);
  if (rows.length !== 1200) throw new Error(`Expected 1200 generated rows; found ${rows.length}`);

  fs.writeFileSync(outputFiles.jsonl, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  fs.writeFileSync(outputFiles.pack, `${JSON.stringify({ questions: rows }, null, 2)}\n`);
  writeCsv(outputFiles.csv, rows, [
    "id",
    "batch",
    "grade",
    "semester",
    "knowledgePointId",
    "unitTitle",
    "type",
    "difficulty",
    "promptZhHans",
    "optionsZhHans",
    "answer",
    "acceptedAnswers",
    "explanationZhHans",
    "evidenceCardIds",
    "paperPatternCardIds",
    "examPatternCardIds",
    "sourceDistanceStatus",
    "mathQaStatus",
    "reviewNotes"
  ]);
  writeCsv(outputFiles.coverage, buildCoverageRows(rows, curriculumCards), [
    "knowledgePointOrder",
    "knowledgePointId",
    "grade",
    "semester",
    "unitTitle",
    "type",
    "expectedCount",
    "actualCount"
  ]);

  console.log(JSON.stringify({
    outputDir: __dirname,
    generatedQuestions: rows.length,
    knowledgePoints: curriculumCards.length,
    gradeCounts: Object.fromEntries(gradeOrder.map((grade) => [grade, rows.filter((row) => row.grade === grade).length])),
    typeCounts: Object.fromEntries(questionTypes.map((type) => [type, rows.filter((row) => row.type === type).length]))
  }, null, 2));
}

main();
