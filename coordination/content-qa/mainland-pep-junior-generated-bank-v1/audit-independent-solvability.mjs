import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputJsonl = path.join(__dirname, "questions.jsonl");

const outputFiles = {
  json: path.join(__dirname, "independent-solvability-audit.json"),
  csv: path.join(__dirname, "independent-solvability-audit.csv"),
  md: path.join(__dirname, "independent-solvability-audit.md"),
  queue: path.join(__dirname, "independent-review-queue.csv")
};

const expectedTotal = 900;
const requiredFields = [
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
];

const statusPriority = {
  pass: 0,
  "solver-gap": 1,
  "content-error": 2,
  "ambiguous-mc": 3,
  "answer-mismatch": 4
};

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return {
          id: `__parse_error_${index + 1}`,
          parseError: String(error),
          rawLine: line
        };
      }
    });
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = typeof keyFn === "function" ? keyFn(row) : row[keyFn];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function gcd(first, second) {
  let a = Math.abs(first);
  let b = Math.abs(second);
  while (b) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function formatFraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const normalizedNumerator = (numerator / divisor) * sign;
  const normalizedDenominator = Math.abs(denominator / divisor);
  return normalizedDenominator === 1 ? String(normalizedNumerator) : `${normalizedNumerator}/${normalizedDenominator}`;
}

function formatSignedTerm(value) {
  return value >= 0 ? `+${value}` : String(value);
}

function formatLinearExpression(coefficient, constant) {
  const variablePart = coefficient === 1 ? "x" : `${coefficient}x`;
  if (constant === 0) return variablePart;
  return constant > 0 ? `${variablePart}+${constant}` : `${variablePart}${constant}`;
}

function formatAngle(value) {
  return `${formatNumber(value)}°`;
}

function baseNormalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/平方厘米/g, "cm^2")
    .replace(/立方厘米/g, "cm^3")
    .replace(/厘米/g, "cm")
    .replace(/米/g, "m")
    .replace(/摄氏度/g, "℃")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/×|·/g, "*")
    .replace(/÷/g, "/")
    .replace(/＞/g, ">")
    .replace(/＜/g, "<")
    .replace(/＝/g, "=")
    .replace(/≠/g, "!=")
    .replace(/不等于/g, "!=")
    .replace(/[，、；;]/g, ",")
    .replace(/或/g, ",")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[。！？?!："“”'‘’\s]/g, "")
    .replace(/°|度/g, "");
}

function factorVariant(normalized) {
  const match = normalized.match(/^\(x([+-]\d+)\)\(x([+-]\d+)\)$/);
  if (!match) return null;
  const terms = [Number(match[1]), Number(match[2])].sort((left, right) => left - right);
  return `factor:x${formatSignedTerm(terms[0])}:x${formatSignedTerm(terms[1])}`;
}

function factorOrderVariants(normalized) {
  const match = normalized.match(/^\(x([+-]\d+)\)\(x([+-]\d+)\)$/);
  if (!match) return [];
  const first = Number(match[1]);
  const second = Number(match[2]);
  return [
    `(x${formatSignedTerm(first)})(x${formatSignedTerm(second)})`,
    `(x${formatSignedTerm(second)})(x${formatSignedTerm(first)})`
  ];
}

function quadrantVariant(normalized) {
  const compact = normalized.replace(/[(),]/g, "");
  if (/^(第)?(i|1|一)象限$/.test(compact)) return "quadrant1";
  if (/^(第)?(ii|2|二)象限$/.test(compact)) return "quadrant2";
  if (/^(第)?(iii|3|三)象限$/.test(compact)) return "quadrant3";
  if (/^(第)?(iv|4|四)象限$/.test(compact)) return "quadrant4";
  return null;
}

function answerVariants(value) {
  const variants = new Set();
  const normalized = baseNormalize(value);
  if (!normalized) return variants;

  variants.add(normalized);
  variants.add(normalized.replace(/[()]/g, ""));

  const withoutUnit = normalized.replace(/(cm\^2|cm\^3|cm|m|℃)$/i, "");
  if (withoutUnit !== normalized) variants.add(withoutUnit);

  const factor = factorVariant(normalized);
  if (factor) {
    variants.add(factor);
    for (const orderedVariant of factorOrderVariants(normalized)) variants.add(orderedVariant);
  }

  const quadrant = quadrantVariant(normalized);
  if (quadrant) variants.add(quadrant);

  if (normalized === "边边边") variants.add("sss");
  if (normalized === "sss") variants.add("sss");

  return variants;
}

function answersMatch(left, right) {
  const leftVariants = answerVariants(left);
  const rightVariants = answerVariants(right);
  for (const variant of leftVariants) {
    if (rightVariants.has(variant)) return true;
  }
  return false;
}

function regexEscape(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedTextContainsVariant(normalizedText, variant) {
  if (!variant) return false;
  if (variant.length >= 2) return normalizedText.includes(variant);
  return new RegExp(`(^|[^0-9a-z])${regexEscape(variant)}($|[^0-9a-z])`, "i").test(normalizedText);
}

function answerComponents(answer) {
  const raw = String(answer ?? "");
  if (!/[或]|[，,].*(x≠|x!=)|且/.test(raw)) return [];
  return raw
    .replace(/且/g, "，")
    .split(/或|，|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function answerInText(answer, text) {
  const normalizedText = baseNormalize(text);
  for (const variant of answerVariants(answer)) {
    if (normalizedTextContainsVariant(normalizedText, variant)) return true;
  }

  const components = answerComponents(answer);
  return (
    components.length > 1 &&
    components.every((component) => {
      const variants = answerVariants(component);
      return Array.from(variants).some((variant) => normalizedTextContainsVariant(normalizedText, variant));
    })
  );
}

function uniqueNormalized(values) {
  return new Set(values.map((value) => baseNormalize(value)));
}

function parseFirst(prompt, regex, build) {
  const match = prompt.match(regex);
  if (!match) {
    return {
      answer: null,
      solverNotes: [`Prompt did not match solver pattern ${regex}.`],
      contentIssues: []
    };
  }
  return build(match);
}

function tryParseFirst(prompt, regex, build) {
  return prompt.match(regex) ? parseFirst(prompt, regex, build) : null;
}

function contentIssue(answer, message) {
  return { answer, solverNotes: [], contentIssues: [message] };
}

function ok(answer) {
  return { answer, solverNotes: [], contentIssues: [] };
}

function quadrantFor(x, y) {
  if (x > 0 && y > 0) return "第一象限";
  if (x < 0 && y > 0) return "第二象限";
  if (x < 0 && y < 0) return "第三象限";
  if (x > 0 && y < 0) return "第四象限";
  return null;
}

function simplifySquareRoot(value) {
  for (let factor = Math.floor(Math.sqrt(value)); factor >= 1; factor -= 1) {
    const square = factor * factor;
    if (value % square === 0) {
      const rest = value / square;
      if (rest === 1) return String(factor);
      return factor === 1 ? `√${rest}` : `${factor}√${rest}`;
    }
  }
  return `√${value}`;
}

function solveFactorization(sum, product) {
  for (let first = 1; first <= Math.abs(product); first += 1) {
    if (product % first !== 0) continue;
    const second = product / first;
    if (first + second === sum) return [first, second];
  }
  return null;
}

function solveRationalNumbers(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /清晨气温为(-?\d+)℃，中午上升(\d+)℃，傍晚又下降(\d+)℃。/, (match) =>
      ok(String(Number(match[1]) + Number(match[2]) - Number(match[3])))
    );
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /点A表示(-?\d+)，点B表示(-?\d+)。A、B两点之间的距离/, (match) =>
      ok(String(Math.abs(Number(match[2]) - Number(match[1]))))
    );
  }
  return parseFirst(prompt, /计算并说明符号：(-?\d+)\+(\d+)-(\d+)。/, (match) =>
    ok(String(Number(match[1]) + Number(match[2]) - Number(match[3])))
  );
}

function solveExpressionsLinearEquations(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /化简：\((\d+)x\+(\d+)\)\+\((\d+)x-(\d+)\)。/, (match) => {
      const coefficient = Number(match[1]) + Number(match[3]);
      const constant = Number(match[2]) - Number(match[4]);
      return ok(formatLinearExpression(coefficient, constant));
    });
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /解方程：(\d+)x\+(\d+)=(\d+)。x=____。/, (match) => {
      const answer = (Number(match[3]) - Number(match[2])) / Number(match[1]);
      return ok(formatNumber(answer));
    });
  }
  return parseFirst(prompt, /每本练习本x元，买(\d+)本后又花(\d+)元买笔，共用(\d+)元。写出求x的方程。/, (match) =>
    ok(`${match[1]}x+${match[2]}=${match[3]}`)
  );
}

function solveGeometricFigures(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /两个角组成平角，其中一个角是(\d+)°，另一个角是多少？/, (match) =>
      ok(formatAngle(180 - Number(match[1])))
    );
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /线段AB长(\d+)厘米，点C是AB的中点。AC=____。/, (match) =>
      ok(`${formatNumber(Number(match[1]) / 2)}厘米`)
    );
  }
  return parseFirst(prompt, /两个角互余，其中一个角是(\d+)°。求另一个角的度数，并写出理由。/, (match) =>
    ok(formatAngle(90 - Number(match[1])))
  );
}

function solveLinesCoordinates(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /点P\((-?\d+),(-?\d+)\)先向右平移(\d+)个单位，再向下平移(\d+)个单位，所得点的坐标是？/, (match) =>
      ok(`(${Number(match[1]) + Number(match[3])},${Number(match[2]) - Number(match[4])})`)
    );
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /一组同位角中一个角为(\d+)°，另一个同位角为____。/, (match) => ok(formatAngle(Number(match[1]))));
  }
  return parseFirst(prompt, /点Q\((-?\d+),(-?\d+)\)位于哪个象限？/, (match) => {
    const quadrant = quadrantFor(Number(match[1]), Number(match[2]));
    return quadrant ? ok(quadrant) : contentIssue("", "Point lies on an axis, so quadrant is undefined.");
  });
}

function solveSystemsInequalitiesData(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /解不等式：2x-(\d+) > (\d+)。/, (match) => {
      const boundary = (Number(match[1]) + Number(match[2])) / 2;
      return ok(`x>${formatNumber(boundary)}`);
    });
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /方程组x\+y=(-?\d+)，x-y=(-?\d+)的解是____。/, (match) => {
      const sum = Number(match[1]);
      const diff = Number(match[2]);
      return ok(`(${formatNumber((sum + diff) / 2)},${formatNumber((sum - diff) / 2)})`);
    });
  }
  return parseFirst(prompt, /数据分别是([\d、-]+)。求这三次数据的平均数。/, (match) => {
    const values = match[1].split("、").map(Number);
    const average = values.reduce((total, value) => total + value, 0) / values.length;
    return ok(formatNumber(average));
  });
}

function solveTrianglesCongruence(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /三角形的两个内角分别为(\d+)°和(\d+)°，第三个内角是多少？/, (match) => {
      const answer = 180 - Number(match[1]) - Number(match[2]);
      return answer > 0 ? ok(formatAngle(answer)) : contentIssue(formatAngle(answer), "Triangle angle sum leaves a non-positive third angle.");
    });
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /等腰三角形的顶角为(\d+)°，每个底角为____。/, (match) => {
      const vertex = Number(match[1]);
      const answer = (180 - vertex) / 2;
      return answer > 0 ? ok(formatAngle(answer)) : contentIssue(formatAngle(answer), "Isosceles triangle vertex angle is not below 180 degrees.");
    });
  }
  return parseFirst(prompt, /AB=DE=(\d+)厘米，BC=EF=(\d+)厘米，AC=DF=(\d+)厘米。可用哪一种判定说明两个三角形全等？/, (match) => {
    const sides = [Number(match[1]), Number(match[2]), Number(match[3])].sort((left, right) => left - right);
    if (sides[0] + sides[1] <= sides[2]) {
      return contentIssue("SSS", `Side lengths ${sides.join(", ")} do not form a valid triangle.`);
    }
    return ok("SSS");
  });
}

function solvePolynomialsFractions(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /因式分解：x²\+(\d+)x\+(\d+)。/, (match) => {
      const factors = solveFactorization(Number(match[1]), Number(match[2]));
      return factors ? ok(`(x+${factors[0]})(x+${factors[1]})`) : contentIssue("", "Could not factor quadratic over positive integers.");
    });
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /计算：(\d+)x·(\d+)x=____。/, (match) => ok(`${Number(match[1]) * Number(match[2])}x²`));
  }
  return parseFirst(prompt, /化简分式\((\d+)x\+(\d+)\)\/\(x\+(\d+)\)，并注明x不能等于什么。/, (match) => {
    const coefficient = Number(match[1]);
    const constant = Number(match[2]);
    const denominatorConstant = Number(match[3]);
    if (coefficient * denominatorConstant !== constant) {
      return contentIssue(`${coefficient}，x≠-${denominatorConstant}`, "Numerator is not a clean multiple of the denominator.");
    }
    return ok(`${coefficient}，x≠-${denominatorConstant}`);
  });
}

function solveRootsPythagoreanQuadrilaterals(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /化简：√(\d+)。/, (match) => ok(simplifySquareRoot(Number(match[1]))));
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /直角三角形两条直角边分别为(\d+)厘米和(\d+)厘米，斜边长____。/, (match) => {
      const hypotenuse = Math.sqrt(Number(match[1]) ** 2 + Number(match[2]) ** 2);
      return ok(`${formatNumber(hypotenuse)}厘米`);
    });
  }
  return tryParseFirst(
    prompt,
    /平行四边形ABCD中，AB=(\d+)厘米。若CD与AB是对边，CD长多少？/,
    (match) => ok(`${match[1]}厘米`)
  ) ?? tryParseFirst(
    prompt,
    /平行四边形ABCD中，AB=(\d+)厘米，BC=(\d+)厘米。它的周长是多少？/,
    (match) => ok(`${2 * (Number(match[1]) + Number(match[2]))}厘米`)
  ) ?? tryParseFirst(
    prompt,
    /平行四边形ABCD的周长为(\d+)厘米，AB=(\d+)厘米。BC长多少？/,
    (match) => ok(`${Number(match[1]) / 2 - Number(match[2])}厘米`)
  ) ?? tryParseFirst(
    prompt,
    /平行四边形ABCD中，∠A=(\d+)°。与它相邻的∠B是多少？/,
    (match) => ok(formatAngle(180 - Number(match[1])))
  ) ?? tryParseFirst(
    prompt,
    /平行四边形ABCD的对角线AC、BD交于点O，AC=(\d+)厘米。AO长多少？/,
    (match) => ok(`${Number(match[1]) / 2}厘米`)
  ) ?? parseFirst(prompt, /$a/, () => ok(""));
}

function solveLinearFunctionsData(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /一次函数y=(\d+)x([+-]?\d+)，当x=(-?\d+)时，y的值是多少？/, (match) => {
      const coefficient = Number(match[1]);
      const constant = Number(match[2]);
      const x = Number(match[3]);
      const answer = String(coefficient * x + constant);
      if (!/[+-]/.test(match[2])) {
        return contentIssue(answer, "Linear function constant is written without an explicit + or - sign.");
      }
      return ok(answer);
    });
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /一次函数图象经过点\((-?\d+),(-?\d+)\)和\((-?\d+),(-?\d+)\)，它的斜率是____。/, (match) => {
      const slope = (Number(match[4]) - Number(match[2])) / (Number(match[3]) - Number(match[1]));
      return ok(formatNumber(slope));
    });
  }
  return tryParseFirst(prompt, /一组数据按从小到大排列为([\d、-]+)。求这组数据的中位数。/, (match) => {
    const values = match[1].split("、").map(Number);
    const middleLeft = values[values.length / 2 - 1];
    const middleRight = values[values.length / 2];
    return ok(formatNumber((middleLeft + middleRight) / 2));
  }) ?? tryParseFirst(prompt, /四次测验成绩分别为([\d、-]+)分。求这组数据的平均数。/, (match) => {
    const values = match[1].split("、").map(Number);
    return ok(formatNumber(values.reduce((total, value) => total + value, 0) / values.length));
  }) ?? tryParseFirst(prompt, /一组数据为([\d、-]+)。求这组数据的极差。/, (match) => {
    const values = match[1].split("、").map(Number);
    return ok(formatNumber(Math.max(...values) - Math.min(...values)));
  }) ?? tryParseFirst(prompt, /一组数据为([\d、-]+)。求这组数据的众数。/, (match) => {
    const counts = new Map();
    for (const value of match[1].split("、").map(Number)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const [mode] = Array.from(counts.entries()).sort((left, right) => right[1] - left[1] || left[0] - right[0])[0];
    return ok(formatNumber(mode));
  }) ?? tryParseFirst(prompt, /四个数据的平均数是(-?\d+(?:\.\d+)?)，其中三个数据为([\d、-]+)。第四个数据是多少？/, (match) => {
    const mean = Number(match[1]);
    const knownValues = match[2].split("、").map(Number);
    const missing = mean * 4 - knownValues.reduce((total, value) => total + value, 0);
    return ok(formatNumber(missing));
  }) ?? parseFirst(prompt, /$a/, () => ok(""));
}

function solveQuadraticsCircleProbability(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /解方程：\(x-(\d+)\)\(x-(\d+)\)=0。/, (match) => ok(`x=${match[1]}或x=${match[2]}`));
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /二次函数y=\((x[+-]\d+)\)²\+\d+的对称轴是____。/, (match) => {
      const inside = match[1];
      const term = Number(inside.slice(1));
      return ok(`x=${formatNumber(-term)}`);
    });
  }
  return parseFirst(prompt, /袋中有(\d+)个红球和(\d+)个蓝球，随机摸出1个球。摸到红球的概率是多少？/, (match) => {
    const red = Number(match[1]);
    const blue = Number(match[2]);
    return ok(formatFraction(red, red + blue));
  });
}

function solveInverseSimilarityTrigonometry(row) {
  const prompt = row.promptZhHans;
  if (row.type === "multiple-choice") {
    return parseFirst(prompt, /反比例函数y=k\/x经过点\((-?\d+),(-?\d+)\)，k的值是多少？/, (match) =>
      ok(String(Number(match[1]) * Number(match[2])))
    );
  }
  if (row.type === "fill-in") {
    return parseFirst(prompt, /两个相似三角形的相似比为(\d+):1，小三角形一条对应边长(\d+)厘米，大三角形对应边长____。/, (match) =>
      ok(`${Number(match[1]) * Number(match[2])}厘米`)
    );
  }
  return tryParseFirst(prompt, /测得旗杆顶端的仰角为45°，测量点到旗杆底部的水平距离为(\d+)米。若忽略测量高度，旗杆高(?:约)?多少？/, (match) =>
    ok(`${match[1]}米`)
  ) ?? tryParseFirst(prompt, /测得塔顶的仰角为30°，测量点到塔底的水平距离为(\d+)米。若忽略测量高度，塔高可表示为多少？/, (match) =>
    ok(`${formatNumber(Number(match[1]) / 3)}√3米`)
  ) ?? tryParseFirst(prompt, /测得树顶的仰角为60°，测量点到树底的水平距离为(\d+)米。若忽略测量高度，树高可表示为多少？/, (match) =>
    ok(`${match[1]}√3米`)
  ) ?? tryParseFirst(prompt, /反比例函数y=k\/x中，k=(-?\d+)。当x=(-?\d+)时，y是多少？/, (match) =>
    ok(formatNumber(Number(match[1]) / Number(match[2])))
  ) ?? parseFirst(prompt, /$a/, () => ok(""));
}

const solvers = {
  "pep-junior-s1-upper-rational-numbers": solveRationalNumbers,
  "pep-junior-s1-upper-expressions-linear-equations": solveExpressionsLinearEquations,
  "pep-junior-s1-upper-geometric-figures": solveGeometricFigures,
  "pep-junior-s1-lower-lines-coordinates": solveLinesCoordinates,
  "pep-junior-s1-lower-equations-inequalities-data": solveSystemsInequalitiesData,
  "pep-junior-s2-upper-triangles-congruence": solveTrianglesCongruence,
  "pep-junior-s2-upper-polynomials-fractions": solvePolynomialsFractions,
  "pep-junior-s2-lower-roots-pythagorean-quadrilaterals": solveRootsPythagoreanQuadrilaterals,
  "pep-junior-s2-lower-linear-functions-data": solveLinearFunctionsData,
  "pep-junior-s3-upper-quadratics-circle-probability": solveQuadraticsCircleProbability,
  "pep-junior-s3-lower-inverse-similarity-trigonometry": solveInverseSimilarityTrigonometry
};

function solve(row) {
  const solver = solvers[row.knowledgePointId];
  if (!solver) {
    return {
      answer: null,
      solverNotes: [`No independent solver registered for ${row.knowledgePointId}.`],
      contentIssues: []
    };
  }
  return solver(row);
}

function acceptedAnswers(row) {
  return Array.from(new Set([row.answer, ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : [])].filter(Boolean)));
}

function chooseStatus(statuses) {
  return statuses.reduce((current, next) => (statusPriority[next] > statusPriority[current] ? next : current), "pass");
}

function severityFor(status) {
  if (status === "pass") return "none";
  if (status === "solver-gap") return "P2";
  return "P1";
}

function auditRow(row) {
  const statuses = ["pass"];
  const notes = [];

  if (row.parseError) {
    statuses.push("content-error");
    notes.push(`parse-error:${row.parseError}`);
  }

  for (const field of requiredFields) {
    if (!(field in row)) {
      statuses.push("content-error");
      notes.push(`missing-field:${field}`);
    }
  }

  if (!String(row.promptZhHans ?? "").trim()) {
    statuses.push("content-error");
    notes.push("empty-prompt");
  }
  if (!String(row.answer ?? "").trim()) {
    statuses.push("content-error");
    notes.push("empty-answer");
  }
  if (!String(row.explanationZhHans ?? "").trim()) {
    statuses.push("content-error");
    notes.push("empty-explanation");
  }
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.some((answer) => answersMatch(answer, row.answer))) {
    statuses.push("content-error");
    notes.push("accepted-answers-missing-canonical");
  }

  const solver = solve(row);
  const computedAnswer = solver.answer ?? "";

  if (!solver.answer) {
    statuses.push("solver-gap");
    notes.push(...(solver.solverNotes ?? ["Could not compute an independent answer."]));
  }

  for (const issue of solver.contentIssues ?? []) {
    statuses.push("content-error");
    notes.push(issue);
  }

  if (solver.answer && !acceptedAnswers(row).some((answer) => answersMatch(answer, solver.answer))) {
    statuses.push("answer-mismatch");
    notes.push(`Computed answer "${solver.answer}" does not match stored answer or accepted aliases.`);
  }

  if (/并注明x不能等于什么/.test(String(row.promptZhHans ?? "")) && solver.answer && !answersMatch(row.answer, solver.answer)) {
    statuses.push("content-error");
    notes.push(`Canonical answer "${row.answer}" omits required domain restriction from computed answer "${solver.answer}".`);
  }

  if (solver.answer && !answerInText(solver.answer, row.explanationZhHans)) {
    statuses.push("content-error");
    notes.push(`Explanation does not visibly reach computed answer "${solver.answer}".`);
  }

  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    const uniqueOptions = uniqueNormalized(options);
    if (options.length !== 4) {
      statuses.push("content-error");
      notes.push(`Multiple-choice question has ${options.length} options instead of 4.`);
    }
    if (uniqueOptions.size !== options.length) {
      statuses.push("ambiguous-mc");
      notes.push("Multiple-choice options are not unique after normalization.");
    }
    if (solver.answer) {
      const correctOptionCount = options.filter((option) => answersMatch(option, solver.answer)).length;
      if (correctOptionCount !== 1) {
        statuses.push("ambiguous-mc");
        notes.push(`Expected exactly one option matching computed answer; found ${correctOptionCount}.`);
      }
    }
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length > 0) {
    statuses.push("content-error");
    notes.push("Non-multiple-choice row has options.");
  }

  const status = chooseStatus(statuses);
  return {
    questionId: row.id,
    grade: row.grade ?? "",
    semester: row.semester ?? "",
    knowledgePointId: row.knowledgePointId ?? "",
    type: row.type ?? "",
    storedAnswer: row.answer ?? "",
    acceptedAnswers: acceptedAnswers(row),
    computedAnswer,
    status,
    severity: severityFor(status),
    notes: notes.length ? notes : ["OK"]
  };
}

function markdownTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replace(/\|/g, "\\|");
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => escapeCell(row[header])).join(" | ")} |`)
  ].join("\n");
}

function buildMarkdown(report) {
  const statusRows = Object.entries(report.summary.statusCounts).map(([status, count]) => ({ status, count }));
  const typeRows = Object.entries(report.summary.typeCounts).map(([type, count]) => ({ type, count }));
  const failingRows = report.failingRows.slice(0, 40).map((row) => ({
    questionId: row.questionId,
    type: row.type,
    status: row.status,
    computedAnswer: row.computedAnswer,
    storedAnswer: row.storedAnswer,
    notes: row.notes.join("; ")
  }));

  return `# S18 Mainland PEP Junior 900-Question Independent Solvability Audit

- Date: ${report.reportDate}
- Session ID: S18
- Scope: Candidate-only Mainland PEP junior 900-question bank
- Total rows read: ${report.summary.totalQuestions}
- Rows attempted: ${report.summary.attemptedRows}
- Pass rows: ${report.summary.passRows}
- Failing rows: ${report.summary.failingRows}
- Duplicate IDs: ${report.summary.duplicateIdCount}
- Duplicate exact prompts: ${report.summary.duplicateExactPromptCount}
- Release recommendation: ${report.summary.releaseRecommendation}

## Status Counts

${markdownTable(["status", "count"], statusRows)}

## Type Counts

${markdownTable(["type", "count"], typeRows)}

## Inventory Issues

${report.inventoryIssues.length ? report.inventoryIssues.map((issue) => `- ${issue}`).join("\n") : "- None"}

## Failing Row Preview

${failingRows.length ? markdownTable(["questionId", "type", "status", "computedAnswer", "storedAnswer", "notes"], failingRows) : "- None"}

## Assumptions

${report.assumptions.map((assumption) => `- ${assumption}`).join("\n")}
`;
}

function buildReport(rows) {
  const auditRows = rows.map(auditRow);
  const failingRows = auditRows.filter((row) => row.status !== "pass");
  const ids = rows.map((row) => row.id);
  const duplicateIdCount = ids.length - new Set(ids).size;
  const promptKeys = rows.map((row) => `${row.grade}:${row.type}:${baseNormalize(row.promptZhHans)}`);
  const duplicateExactPromptCount = promptKeys.length - new Set(promptKeys).size;
  const inventoryIssues = [
    ...(rows.length === expectedTotal ? [] : [`expected ${expectedTotal} rows, found ${rows.length}`]),
    ...(duplicateIdCount === 0 ? [] : [`duplicate id count ${duplicateIdCount}`]),
    ...(duplicateExactPromptCount === 0 ? [] : [`duplicate exact prompt count ${duplicateExactPromptCount}`])
  ];
  const releaseRecommendation =
    failingRows.length === 0 && inventoryIssues.length === 0
      ? "Strict independent solvability gate passed; keep candidate-only until human review and owner approval."
      : "Do not promote; resolve independent solvability findings before public release.";

  return {
    reportDate: "2026-05-23",
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions: rows.length,
      expectedQuestions: expectedTotal,
      candidateOnly: true,
      attemptedRows: auditRows.length,
      passRows: auditRows.length - failingRows.length,
      failingRows: failingRows.length,
      duplicateIdCount,
      duplicateExactPromptCount,
      statusCounts: countBy(auditRows, "status"),
      gradeCounts: countBy(rows, "grade"),
      typeCounts: countBy(rows, "type"),
      releaseRecommendation
    },
    inventoryIssues,
    rows: auditRows,
    failingRows,
    assumptions: [
      "This audit validates candidate JSONL rows only and does not promote the 900-question bank into public practice.",
      "Each row is independently parsed from its prompt family and recomputed without reading the row's stored answer.",
      "Multiple-choice rows must have exactly one option matching the recomputed answer.",
      "Rows with parser gaps, impossible mathematical conditions, answer mismatches, ambiguous choices, or unsupported explanations are failing rows."
    ]
  };
}

function main() {
  const rows = readJsonl(inputJsonl);
  const report = buildReport(rows);

  fs.writeFileSync(outputFiles.json, `${JSON.stringify(report, null, 2)}\n`);
  writeCsv(
    outputFiles.csv,
    report.rows.map((row) => ({
      ...row,
      acceptedAnswers: row.acceptedAnswers.join(" | "),
      notes: row.notes.join("; ")
    })),
    [
      "questionId",
      "grade",
      "semester",
      "knowledgePointId",
      "type",
      "storedAnswer",
      "acceptedAnswers",
      "computedAnswer",
      "status",
      "severity",
      "notes"
    ]
  );
  writeCsv(
    outputFiles.queue,
    report.failingRows.map((row) => ({
      ...row,
      acceptedAnswers: row.acceptedAnswers.join(" | "),
      notes: row.notes.join("; ")
    })),
    [
      "questionId",
      "grade",
      "semester",
      "knowledgePointId",
      "type",
      "storedAnswer",
      "acceptedAnswers",
      "computedAnswer",
      "status",
      "severity",
      "notes"
    ]
  );
  fs.writeFileSync(outputFiles.md, buildMarkdown(report));

  console.log(
    JSON.stringify(
      {
        totalQuestions: report.summary.totalQuestions,
        attemptedRows: report.summary.attemptedRows,
        passRows: report.summary.passRows,
        failingRows: report.summary.failingRows,
        duplicateIdCount: report.summary.duplicateIdCount,
        duplicateExactPromptCount: report.summary.duplicateExactPromptCount,
        statusCounts: report.summary.statusCounts,
        releaseRecommendation: report.summary.releaseRecommendation
      },
      null,
      2
    )
  );

  if (report.failingRows.length > 0 || report.inventoryIssues.length > 0) {
    process.exitCode = 1;
  }
}

main();
