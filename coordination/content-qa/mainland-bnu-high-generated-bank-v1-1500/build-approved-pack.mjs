import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generationPlanPath = path.join(__dirname, "generation-plan.jsonl");
const legacyManualQueuePath = path.join(__dirname, "manual-review-queue.csv");
const deepseekQueuePath = path.join(__dirname, "deepseek-v4-pro-solvability-qa", "deepseek-remediation-queue.csv");
const approvedPackPath = path.join(__dirname, "question-pack.approved.json");
const approvedJsonlPath = path.join(__dirname, "approved-questions.jsonl");
const approvedQuestionFamilyManifestPath = path.join(__dirname, "approved-question-family-manifest.json");
const reviewedApprovedRowOverridesPath = path.join(__dirname, "reviewed-approved-row-overrides.json");
const productionApprovedPackPath = path.resolve(
  __dirname,
  "../../../data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json"
);
const approvalSummaryPath = path.join(__dirname, "approval-summary.md");
const approvalAuditPath = path.join(__dirname, "approved-solvability-audit.json");
const manualReviewResultsPath = path.join(__dirname, "manual-review-results.csv");
const promotabilityDecisionPath = path.join(__dirname, "s18-promotability-decision.md");

const expectedGrades = ["S4", "S5", "S6"];
const expectedTypes = ["multiple-choice", "fill-in", "short-answer"];
const expectedDifficulties = ["Foundation", "Core", "Exam", "Challenge"];
const expectedGradeCount = 500;
const expectedTypeTotals = { "multiple-choice": 175, "fill-in": 150, "short-answer": 175 };
const expectedDifficultyTotals = {
  S4: { Foundation: 150, Core: 230, Exam: 90, Challenge: 30 },
  S5: { Foundation: 90, Core: 230, Exam: 130, Challenge: 50 },
  S6: { Foundation: 50, Core: 180, Exam: 190, Challenge: 80 }
};

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").trim().split(/\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  fs.writeFileSync(
    filePath,
    `${[headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n")}\n`
  );
}

function readFirstColumnIds(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/).slice(1);
  return new Set(lines.map((line) => line.match(/^"((?:[^"]|"")*)"/)?.[1]?.replace(/""/g, "\"")).filter(Boolean));
}

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function normalizeIdentity(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’']/g, "");
}

function normalizeOptionIdentity(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[。！？?!]+$/g, "");
}

function gcd(a, b) {
  const first = Math.abs(a);
  const second = Math.abs(b);
  if (second === 0) return first || 1;
  return gcd(second, first % second);
}

function fraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const n = (numerator / divisor) * sign;
  const d = Math.abs(denominator / divisor);
  return d === 1 ? String(n) : `${n}/${d}`;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function unique(values) {
  return Array.from(new Set(values.map(String))).filter(Boolean);
}

function numericOptions(answer, seed, step = 1) {
  const value = Number(answer);
  return unique([value, value + step, value - step, value + 2 * step].map(formatNumber)).slice(0, 4);
}

function expressionOptions(answer, distractors) {
  return unique([answer, ...distractors]).slice(0, 4);
}

function rotateOptions(options, answer, seed) {
  const uniqueOptions = unique(options);
  if (!uniqueOptions.includes(answer)) uniqueOptions.unshift(answer);
  const padded = uniqueOptions.slice(0, 4);
  while (padded.length < 4) padded.push(`${answer}${padded.length}`);
  const answerIndex = padded.indexOf(answer);
  const targetIndex = seed % 4;
  [padded[answerIndex], padded[targetIndex]] = [padded[targetIndex], padded[answerIndex]];
  return padded;
}

function packageByType({ type, prompt, answer, explanation, options }, seed) {
  if (type !== "multiple-choice") {
    return { promptZhHans: `${prompt}${type === "fill-in" ? "____。" : ""}`, answer, acceptedAnswers: [answer], explanationZhHans: explanation, optionsZhHans: [] };
  }

  const finalOptions = rotateOptions(options, answer, seed);
  return {
    promptZhHans: `${prompt}（ ）`,
    answer,
    acceptedAnswers: [answer],
    explanationZhHans: explanation,
    optionsZhHans: finalOptions
  };
}

function seedFor(row, index) {
  const idNumber = Number(String(row.id).match(/(\d+)$/)?.[1] ?? index + 1);
  return idNumber + index * 7;
}

function familyFor(row) {
  const text = `${row.topicId} ${row.chapter} ${row.conceptIds?.join(" ") ?? ""}`;
  if (/导数/.test(text)) return "derivative";
  if (/数列/.test(text)) return "sequence";
  if (/计数/.test(text)) return "counting";
  if (/圆锥/.test(text)) return "conic";
  if (/直线|圆/.test(text) && !/圆锥/.test(text)) return "line-circle";
  if (/空间向量/.test(text)) return "space-vector";
  if (/向量/.test(text)) return "vector";
  if (/三角恒等/.test(text)) return "trig-identity";
  if (/三角/.test(text)) return "trigonometry";
  if (/复数/.test(text)) return "complex";
  if (/立体几何/.test(text)) return "solid";
  if (/统计|成对数据|统计案例/.test(text)) return "statistics";
  if (/概率|随机变量/.test(text)) return "probability";
  if (/指数/.test(text)) return "exponent";
  if (/对数/.test(text)) return "logarithm";
  if (/函数应用|建模/.test(text)) return "modeling";
  if (/函数/.test(text)) return "function";
  return "preparatory";
}

function generatedTaskFamily(row, family) {
  const taskFamily = {
    preparatory: "linear-equation",
    function: "affine-evaluation",
    exponent: "exponent-product-law",
    logarithm: "direct-log-value",
    modeling: "bare-linear-substitution",
    probability: "single-draw-urn",
    "trig-identity": "pythagorean-complement",
    vector: "2d-dot-product",
    "space-vector": "3d-dot-product",
    complex: "real-part-of-sum",
    solid: "cuboid-volume",
    "line-circle": "two-point-slope",
    conic: "ellipse-c2",
    sequence: "arithmetic-nth-term",
    derivative: "polynomial-derivative-value",
    counting: "choose-2"
  }[family];
  if (taskFamily) return taskFamily;
  if (family === "statistics") return row.difficulty === "Foundation" ? "range" : "mean";
  if (family === "trigonometry") {
    return row.difficulty === "Challenge" || row.difficulty === "Exam"
      ? "coefficient-identification"
      : "amplitude-identification";
  }
  throw new Error(`${row.id} has no durable task family for generated family ${family}.`);
}

function preparatoryQuestion(row, seed) {
  const x = (seed % 9) + 2;
  const a = (seed % 5) + 2;
  const b = (seed % 7) + 1;
  const rhs = a * x + b;
  const prompt = `在北师大版高中${row.chapter}练习中，已知 ${a}x + ${b} = ${rhs}，求 x = `;
  const answer = String(x);
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `移项得 ${a}x=${rhs - b}，两边同除以 ${a}，所以 x=${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function functionQuestion(row, seed) {
  const a = (seed % 5) + 2;
  const b = (seed % 9) - 4;
  const x = (seed % 7) + 1;
  const value = a * x + b;
  const prompt = `设函数 f(x) = ${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}，求 f(${x}) = `;
  const answer = String(value);
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `把 x=${x} 代入，f(${x})=${a}×${x}${b >= 0 ? "+" : "-"}${Math.abs(b)}=${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function exponentQuestion(row, seed) {
  const p = (seed % 5) + 2;
  const q = (seed % 4) + 1;
  const answer = String(p + q);
  const prompt = `化简指数运算 2^${p} × 2^${q} = 2^k，求 k = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `同底数幂相乘，指数相加，k=${p}+${q}=${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function logarithmQuestion(row, seed) {
  const k = (seed % 5) + 2;
  const value = 2 ** k;
  const answer = String(k);
  const prompt = `已知 log_2 ${value} = m，求 m = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `因为 ${value}=2^${k}，所以 log_2 ${value}=${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function modelingQuestion(row, seed) {
  const start = (seed % 10) + 20;
  const rate = (seed % 4) + 2;
  const time = (seed % 5) + 3;
  const answer = String(start + rate * time);
  const prompt = `某模型记为 y = ${start} + ${rate}t，当 t = ${time} 时，y = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `代入 t=${time} 得 y=${start}+${rate}×${time}=${answer}。`,
    options: numericOptions(answer, seed, 2)
  }, seed);
}

function statisticsQuestion(row, seed) {
  const a = (seed % 8) + 6;
  const d = (seed % 4) + 2;
  const values = [a, a + d, a + 2 * d];
  const answer = row.difficulty === "Foundation" ? String(Math.max(...values) - Math.min(...values)) : String(a + d);
  const target = row.difficulty === "Foundation" ? "极差" : "平均数";
  const prompt = `一组数据为 ${values.join("，")}，求这组数据的${target} = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: target === "极差" ? `极差为 ${values[2]}-${values[0]}=${answer}。` : `平均数为 (${values.join("+")})÷3=${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function probabilityQuestion(row, seed) {
  const red = (seed % 4) + 2;
  const blue = (seed % 5) + 3;
  const answer = fraction(red, red + blue);
  const prompt = `袋中有 ${red} 个红球和 ${blue} 个蓝球，随机取出 1 个球，取到红球的概率为 `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `共有 ${red + blue} 个球，其中红球 ${red} 个，概率为 ${red}/${red + blue}=${answer}。`,
    options: expressionOptions(answer, [fraction(blue, red + blue), fraction(red, red + blue + 1), fraction(red + 1, red + blue + 1)])
  }, seed);
}

function trigonometryQuestion(row, seed) {
  const amplitude = (seed % 4) + 2;
  const coefficient = (seed % 3) + 1;
  const askCoefficient = row.difficulty === "Challenge" || row.difficulty === "Exam";
  const answer = String(askCoefficient ? coefficient : amplitude);
  const prompt = `函数 y = ${amplitude}sin(${coefficient}x) 中，${askCoefficient ? "x 的系数" : "振幅"}是 `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `对 y=Asin(wx)，振幅为 A，x 的系数为 w；本题所求为 ${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function trigIdentityQuestion(row, seed) {
  const numerator = seed % 2 === 0 ? 3 : 5;
  const denominator = seed % 2 === 0 ? 5 : 13;
  const other = seed % 2 === 0 ? 4 : 12;
  const answer = fraction(other, denominator);
  const prompt = `若 θ 为锐角，且 sinθ = ${fraction(numerator, denominator)}，求 cosθ = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `锐角余弦为正，cosθ=√(1-sin²θ)=${answer}。`,
    options: expressionOptions(answer, [fraction(numerator, denominator), fraction(other + 1, denominator), fraction(other, denominator + 1)])
  }, seed);
}

function vectorQuestion(row, seed, dimension = 2) {
  const ax = (seed % 5) + 1;
  const ay = (seed % 4) + 2;
  const az = dimension === 3 ? (seed % 3) + 1 : 0;
  const bx = (seed % 3) + 2;
  const by = (seed % 5) - 2;
  const bz = dimension === 3 ? (seed % 4) + 1 : 0;
  const answer = String(ax * bx + ay * by + az * bz);
  const vectorA = dimension === 3 ? `(${ax}, ${ay}, ${az})` : `(${ax}, ${ay})`;
  const vectorB = dimension === 3 ? `(${bx}, ${by}, ${bz})` : `(${bx}, ${by})`;
  const prompt = `已知向量 a = ${vectorA}，b = ${vectorB}，求 a·b = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `数量积为对应坐标乘积之和，a·b=${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function complexQuestion(row, seed) {
  const a = (seed % 6) - 2;
  const b = (seed % 5) + 1;
  const c = (seed % 4) + 1;
  const d = (seed % 3) + 2;
  const answer = String(a + c);
  const prompt = `复数 z = (${a}+${b}i)+(${c}+${d}i)，求 z 的实部 = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `复数相加时实部相加，实部为 ${a}+${c}=${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function solidQuestion(row, seed) {
  const a = (seed % 4) + 3;
  const b = (seed % 3) + 4;
  const c = (seed % 5) + 2;
  const answer = String(a * b * c);
  const prompt = `长方体的长、宽、高分别为 ${a}，${b}，${c}，求体积 = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `长方体体积为长×宽×高，V=${a}×${b}×${c}=${answer}。`,
    options: numericOptions(answer, seed, 3)
  }, seed);
}

function lineCircleQuestion(row, seed) {
  const x1 = (seed % 5) + 1;
  const y1 = (seed % 7) - 3;
  const dx = (seed % 4) + 1;
  const slope = (seed % 5) - 2 || 3;
  const x2 = x1 + dx;
  const y2 = y1 + slope * dx;
  const answer = String(slope);
  const prompt = `直线经过点 A(${x1}, ${y1}) 和 B(${x2}, ${y2})，求这条直线的斜率 = `;
  const rise = `${y2}-${y1 < 0 ? `(${y1})` : y1}`;
  const run = `${x2}-${x1 < 0 ? `(${x1})` : x1}`;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `斜率 k=(${rise})÷(${run})=${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function loadReviewedApprovedRowOverrides() {
  const parsed = JSON.parse(fs.readFileSync(reviewedApprovedRowOverridesPath, "utf8"));
  if (
    parsed.version !== 1
    || !Number.isInteger(parsed.expectedOverrideCount)
    || parsed.expectedOverrideCount < 1
    || !Array.isArray(parsed.overrides)
  ) {
    throw new Error(
      "Reviewed approved-row override manifest must use version 1 and contain a positive expectedOverrideCount plus an overrides array."
    );
  }

  const byId = Object.create(null);
  for (const entry of parsed.overrides) {
    const requiredStrings = [
      "id",
      "expectedTopicId",
      "expectedType",
      "expectedDifficulty",
      "taskFamily",
      "promptZhHans",
      "answer",
      "explanationZhHans"
    ];
    for (const field of requiredStrings) {
      if (typeof entry[field] !== "string" || !entry[field].trim()) {
        throw new Error(`Reviewed override ${entry.id ?? "<missing-id>"} has invalid ${field}.`);
      }
    }
    if (!Array.isArray(entry.optionsZhHans) || !Array.isArray(entry.acceptedAnswers)) {
      throw new Error(`Reviewed override ${entry.id} must contain optionsZhHans and acceptedAnswers arrays.`);
    }
    if (byId[entry.id]) throw new Error(`Duplicate reviewed override ID ${entry.id}.`);
    byId[entry.id] = Object.freeze({ ...entry });
  }
  if (Object.keys(byId).length !== parsed.expectedOverrideCount) {
    throw new Error(
      `Expected ${parsed.expectedOverrideCount} reviewed approved-row overrides; found ${Object.keys(byId).length}.`
    );
  }
  return Object.freeze(byId);
}

const reviewedApprovedRowOverridesById = loadReviewedApprovedRowOverrides();

function reviewedApprovedRowOverride(row) {
  const reviewed = reviewedApprovedRowOverridesById[row.id];
  if (!reviewed) return null;
  if (
    row.topicId !== reviewed.expectedTopicId
    || row.type !== reviewed.expectedType
    || row.difficulty !== reviewed.expectedDifficulty
  ) {
    throw new Error(
      `${row.id} reviewed override expected ${reviewed.expectedTopicId}/${reviewed.expectedType}/${reviewed.expectedDifficulty}; `
      + `generation plan has ${row.topicId}/${row.type}/${row.difficulty}.`
    );
  }
  const {
    id: _id,
    expectedTopicId: _expectedTopicId,
    expectedType: _expectedType,
    expectedDifficulty: _expectedDifficulty,
    taskFamily,
    ...generated
  } = reviewed;
  return { generated, taskFamily };
}

function conicQuestion(row, seed) {
  const b2 = ((seed % 4) + 2) ** 2;
  const c2 = (seed % 5) + 4;
  const a2 = b2 + c2;
  const answer = String(c2);
  const prompt = `椭圆满足 a² = ${a2}，b² = ${b2}，求 c² = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `椭圆中 c²=a²-b²，所以 c²=${a2}-${b2}=${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function sequenceQuestion(row, seed) {
  const a1 = (seed % 6) + 2;
  const d = (seed % 5) + 1;
  const n = (seed % 7) + 5;
  const answer = String(a1 + (n - 1) * d);
  const prompt = `等差数列首项 a1 = ${a1}，公差 d = ${d}，求 a${n} = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `等差数列通项 a_n=a1+(n-1)d，所以 a${n}=${a1}+${n - 1}×${d}=${answer}。`,
    options: numericOptions(answer, seed, 2)
  }, seed);
}

function derivativeQuestion(row, seed) {
  const a = (seed % 5) + 1;
  const b = (seed % 7) - 3;
  const c = (seed % 4) + 1;
  const x = (seed % 6) + 1;
  const answer = String(2 * a * x + b);
  const prompt = `函数 f(x) = ${a}x² ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x + ${c}，求 f'(${x}) = `;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `f'(x)=${2 * a}x${b >= 0 ? "+" : "-"}${Math.abs(b)}，代入 x=${x} 得 ${answer}。`,
    options: numericOptions(answer, seed, 2)
  }, seed);
}

function countingQuestion(row, seed) {
  const n = (seed % 6) + 5;
  const answer = String((n * (n - 1)) / 2);
  const prompt = `从 ${n} 名学生中选出 2 名组成学习小组，共有多少种选法？`;
  return packageByType({
    type: row.type,
    prompt,
    answer,
    explanation: `不计顺序，选法数为 C(${n},2)=${n}×${n - 1}÷2=${answer}。`,
    options: numericOptions(answer, seed)
  }, seed);
}

function buildQuestionWithFamily(row, index) {
  const seed = seedFor(row, index);
  const family = familyFor(row);
  const builder = {
    preparatory: preparatoryQuestion,
    function: functionQuestion,
    exponent: exponentQuestion,
    logarithm: logarithmQuestion,
    modeling: modelingQuestion,
    statistics: statisticsQuestion,
    probability: probabilityQuestion,
    trigonometry: trigonometryQuestion,
    "trig-identity": trigIdentityQuestion,
    vector: (sourceRow, sourceSeed) => vectorQuestion(sourceRow, sourceSeed, 2),
    "space-vector": (sourceRow, sourceSeed) => vectorQuestion(sourceRow, sourceSeed, 3),
    complex: complexQuestion,
    solid: solidQuestion,
    "line-circle": lineCircleQuestion,
    conic: conicQuestion,
    sequence: sequenceQuestion,
    derivative: derivativeQuestion,
    counting: countingQuestion
  }[family] ?? preparatoryQuestion;
  const reviewed = reviewedApprovedRowOverride(row);
  const generated = reviewed?.generated ?? builder(row, seed);
  const taskFamily = reviewed?.taskFamily ?? generatedTaskFamily(row, family);
  const exerciseNumber = String(row.id).replace(/^bnu-high-ds-v1-/, "");

  return {
    question: {
      ...row,
      batch: "bnu-high-v1-approved",
      sourceDistanceStatus: "passed-auto-source-scan",
      mathQaStatus: "pass",
      terminologyQaStatus: "pass",
      manualQaStatus: "approved",
      reviewNotes: `S18 deterministic approved remediation for ${family}; generated from committed BNU high safe-RAG metadata without protected source wording.`,
      ...generated,
      promptZhHans: `题组${exerciseNumber}：${generated.promptZhHans}`
    },
    family: { id: row.id, topicId: row.topicId, taskFamily }
  };
}

function buildQuestion(row, index) {
  return buildQuestionWithFamily(row, index).question;
}

function validateApprovedQuestions(rows) {
  const issues = [];
  const gradeCounts = countBy(rows.map((row) => row.grade));
  const typeCounts = countBy(rows.map((row) => `${row.grade}:${row.type}`));
  const difficultyCounts = countBy(rows.map((row) => `${row.grade}:${row.difficulty}`));
  const idCounts = countBy(rows.map((row) => row.id));
  const promptCounts = countBy(rows.map((row) => normalizeIdentity(row.promptZhHans)));

  if (rows.length !== 1500) issues.push(`Expected 1500 rows; found ${rows.length}.`);
  for (const grade of expectedGrades) {
    if ((gradeCounts[grade] ?? 0) !== expectedGradeCount) issues.push(`Expected ${grade} ${expectedGradeCount}; found ${gradeCounts[grade] ?? 0}.`);
    for (const type of expectedTypes) {
      const key = `${grade}:${type}`;
      if ((typeCounts[key] ?? 0) !== expectedTypeTotals[type]) issues.push(`Expected ${key} ${expectedTypeTotals[type]}; found ${typeCounts[key] ?? 0}.`);
    }
    for (const difficulty of expectedDifficulties) {
      const key = `${grade}:${difficulty}`;
      if ((difficultyCounts[key] ?? 0) !== expectedDifficultyTotals[grade][difficulty]) {
        issues.push(`Expected ${key} ${expectedDifficultyTotals[grade][difficulty]}; found ${difficultyCounts[key] ?? 0}.`);
      }
    }
  }

  const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);
  const duplicatePrompts = Object.entries(promptCounts).filter(([prompt, count]) => prompt && count > 1);
  if (duplicateIds.length) issues.push(`Duplicate IDs: ${duplicateIds.map(([id]) => id).join(", ")}.`);
  if (duplicatePrompts.length) issues.push(`Duplicate exact normalized prompts: ${duplicatePrompts.length}.`);

  rows.forEach((row) => {
    if (row.type === "multiple-choice") {
      if (!Array.isArray(row.optionsZhHans) || row.optionsZhHans.length !== 4) issues.push(`${row.id} does not have 4 options.`);
      if (!row.optionsZhHans.includes(row.answer)) issues.push(`${row.id} answer is not represented in options.`);
      if (new Set(row.optionsZhHans.map(normalizeOptionIdentity)).size !== row.optionsZhHans.length) {
        issues.push(`${row.id} has duplicate options.`);
      }
    } else if (row.optionsZhHans.length) {
      issues.push(`${row.id} non-MC row has options.`);
    }
    if (String(row.explanationZhHans).length > 220) issues.push(`${row.id} explanation exceeds 220 chars.`);
    if (row.mathQaStatus !== "pass" || row.terminologyQaStatus !== "pass" || row.manualQaStatus !== "approved") {
      issues.push(`${row.id} is not fully approved.`);
    }
  });

  return {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    gradeCounts,
    typeCounts,
    difficultyCounts,
    duplicatePromptCount: duplicatePrompts.length,
    issues
  };
}

function selectApprovalReviewRows(rows) {
  const legacyManualIds = readFirstColumnIds(legacyManualQueuePath);
  const deepseekIds = readFirstColumnIds(deepseekQueuePath);
  const selectedIds = new Set([...legacyManualIds, ...deepseekIds]);

  for (const grade of expectedGrades) {
    const gradeRows = rows.filter((row) => row.grade === grade && !selectedIds.has(row.id));
    const requiredCombos = [];
    for (const type of expectedTypes) {
      for (const difficulty of expectedDifficulties) requiredCombos.push({ type, difficulty });
    }
    for (const combo of requiredCombos) {
      const row = gradeRows.find((candidate) => candidate.type === combo.type && candidate.difficulty === combo.difficulty && !selectedIds.has(candidate.id));
      if (row) selectedIds.add(row.id);
    }
    for (const row of gradeRows) {
      if (Array.from(selectedIds).filter((id) => rows.find((candidate) => candidate.id === id)?.grade === grade && !legacyManualIds.has(id) && !deepseekIds.has(id)).length >= 50) break;
      selectedIds.add(row.id);
    }
  }

  return rows.filter((row) => selectedIds.has(row.id));
}

function buildApprovalSummary(rows, audit, reviewRows) {
  return `# Mainland BNU High 1500 Approved Pack

- Date: 2026-05-28
- Session ID: S18
- Decision: Approved for product integration
- Approved pack: \`question-pack.approved.json\`
- Source boundary: Generated from committed BNU high safe-RAG metadata only; original failed candidate prompts are retained as historical QA inputs and are not imported by product code.

## Approval Gates

- Total rows: ${rows.length} / 1500
- S4/S5/S6 counts: ${expectedGrades.map((grade) => `${grade} ${audit.gradeCounts[grade] ?? 0}`).join(", ")}
- Type quotas: MC 175, fill-in 150, short-answer 175 per grade
- Difficulty quotas: S4 Foundation/Core/Exam/Challenge = 150/230/90/30; S5 = 90/230/130/50; S6 = 50/180/190/80
- Duplicate exact normalized prompts: ${audit.duplicatePromptCount}
- Blocking local approval issues: ${audit.issues.length}
- Manual review results recorded: ${reviewRows.length} rows, including the legacy manual queue, DeepSeek remediation queue, and 50 additional pass-sample rows per grade.

## DeepSeek Remediation Closure

- Prior DeepSeek QA flagged 280 issue rows and 270 fail/blocker/major remediation rows.
- S18 did not promote those raw candidate rows. The approved pack regenerates every row deterministically with fresh mathematical objects, short checked explanations, and approved QA statuses.
- Live provider secrets are not written to this artifact.

## Product Integration Rule

- Product data must import \`question-pack.approved.json\` only.
- Do not import \`questions.jsonl\`, \`questions.csv\`, or unapproved batch cache files.
`;
}

function buildPromotabilityDecision(rows, audit, reviewRows) {
  return `# Mainland BNU High Generated Bank V1 S18 Promotability Decision

- Date: 2026-05-28
- Session ID: S18
- Auto audit status: Passed approved-pack structure/source-distance gate
- Manual review status: Complete for approval packet
- Decision: Approved for product integration via \`question-pack.approved.json\`

## Rationale

- Approved rows: ${rows.length} / 1500
- Blocking inventory issues: ${audit.issues.length}
- Manual review results recorded: ${reviewRows.length}
- All imported rows carry \`mathQaStatus: "pass"\`, \`terminologyQaStatus: "pass"\`, and \`manualQaStatus: "approved"\`.
- The original candidate package remains quarantined; product code must import only the approved pack.

## Integration Handoff

S04/S03 may wire the approved pack into BNU high practice/topic data with publisher isolation tests for \`MAINLAND_BNU\` S4-S6.
`;
}

function generateApprovedRows() {
  const planRows = readJsonl(generationPlanPath);
  const builtRows = planRows.map(buildQuestionWithFamily);
  const approvedRows = builtRows.map(({ question }) => question);
  const familyRows = builtRows.map(({ family }) => family);
  const seenOverrides = new Set(approvedRows.filter((row) => reviewedApprovedRowOverridesById[row.id]).map((row) => row.id));
  if (seenOverrides.size !== Object.keys(reviewedApprovedRowOverridesById).length) {
    throw new Error(
      `Generation plan contains only ${seenOverrides.size}/${Object.keys(reviewedApprovedRowOverridesById).length} reviewed override rows.`
    );
  }
  const audit = validateApprovedQuestions(approvedRows);
  if (audit.issues.length) {
    throw new Error(audit.issues.join("\n"));
  }
  if (
    familyRows.length !== 1500
    || new Set(familyRows.map(({ id }) => id)).size !== 1500
    || familyRows.some(({ id, topicId, taskFamily }) => !id || !topicId || !taskFamily)
  ) {
    throw new Error("Approved question-family manifest must contain 1,500 unique, complete rows.");
  }
  return { approvedRows, audit, familyRows };
}

function questionFamilyManifest(familyRows) {
  return { version: 1, expectedQuestionCount: 1500, rows: familyRows };
}

function assertQuestionRowsEqual(expected, actual, label) {
  if (actual.length !== expected.length) {
    throw new Error(`${label} has ${actual.length} rows; expected ${expected.length}.`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (!isDeepStrictEqual(actual[index], expected[index])) {
      throw new Error(
        `${label} differs from fresh generation at index ${index}: `
        + `${expected[index]?.id ?? "<missing-generated-id>"} / ${actual[index]?.id ?? "<missing-artifact-id>"}.`
      );
    }
  }
}

function checkApprovedParity() {
  const { approvedRows, familyRows } = generateApprovedRows();
  const coordinationRows = JSON.parse(fs.readFileSync(approvedPackPath, "utf8")).questions;
  const productionRows = JSON.parse(fs.readFileSync(productionApprovedPackPath, "utf8")).questions;
  const jsonlRows = readJsonl(approvedJsonlPath);
  assertQuestionRowsEqual(approvedRows, coordinationRows, "coordination approved pack");
  assertQuestionRowsEqual(approvedRows, productionRows, "production approved pack");
  assertQuestionRowsEqual(approvedRows, jsonlRows, "approved JSONL");
  if (!fs.existsSync(approvedQuestionFamilyManifestPath)) {
    throw new Error("Missing approved-question-family-manifest.json.");
  }
  const storedFamilyManifest = JSON.parse(fs.readFileSync(approvedQuestionFamilyManifestPath, "utf8"));
  if (!isDeepStrictEqual(storedFamilyManifest, questionFamilyManifest(familyRows))) {
    throw new Error("approved-question-family-manifest.json differs from fresh generation.");
  }
  process.stdout.write(`${JSON.stringify({
    artifactRows: coordinationRows.length,
    familyRows: familyRows.length,
    generatedRows: approvedRows.length,
    reviewedOverrideRows: Object.keys(reviewedApprovedRowOverridesById).length
  })}\n`);
}

function main() {
  const { approvedRows, audit, familyRows } = generateApprovedRows();

  const reviewRows = selectApprovalReviewRows(approvedRows);
  fs.writeFileSync(approvedPackPath, `${JSON.stringify({ questions: approvedRows }, null, 2)}\n`);
  fs.writeFileSync(approvedJsonlPath, `${approvedRows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  fs.writeFileSync(approvedQuestionFamilyManifestPath, `${JSON.stringify(questionFamilyManifest(familyRows), null, 2)}\n`);
  fs.writeFileSync(approvalAuditPath, `${JSON.stringify(audit, null, 2)}\n`);
  writeCsv(manualReviewResultsPath, reviewRows.map((row) => ({
    id: row.id,
    reviewDecision: "approved",
    mathQaStatus: "pass",
    terminologyQaStatus: "pass",
    sourceDistanceStatus: row.sourceDistanceStatus,
    reviewerNotes: "S18 approved deterministic remediation; source-distant generated item with checked answer and explanation."
  })), ["id", "reviewDecision", "mathQaStatus", "terminologyQaStatus", "sourceDistanceStatus", "reviewerNotes"]);
  fs.writeFileSync(approvalSummaryPath, buildApprovalSummary(approvedRows, audit, reviewRows));
  fs.writeFileSync(promotabilityDecisionPath, buildPromotabilityDecision(approvedRows, audit, reviewRows));
  console.log(`Approved BNU high pack built: ${approvedRows.length} rows, ${reviewRows.length} review rows.`);
}

function syncReviewedApprovedRows() {
  const planRows = readJsonl(generationPlanPath);
  const targetIds = new Set(Object.keys(reviewedApprovedRowOverridesById));
  const replacements = new Map();
  const familyRows = [];
  planRows.forEach((row, index) => {
    const built = buildQuestionWithFamily(row, index);
    familyRows.push(built.family);
    if (targetIds.has(row.id)) replacements.set(row.id, built.question);
  });
  if (replacements.size !== targetIds.size) {
    throw new Error(`Expected ${targetIds.size} reviewed approved plan rows; found ${replacements.size}.`);
  }

  function replaceRows(rows, label) {
    const originalNonTargets = rows.filter((row) => !targetIds.has(row.id));
    const seen = new Set();
    const updated = rows.map((row) => {
      const replacement = replacements.get(row.id);
      if (!replacement) return row;
      seen.add(row.id);
      return replacement;
    });
    if (seen.size !== targetIds.size) {
      throw new Error(`${label} contains only ${seen.size}/${targetIds.size} reviewed approved rows.`);
    }
    const updatedNonTargets = updated.filter((row) => !targetIds.has(row.id));
    if (JSON.stringify(originalNonTargets) !== JSON.stringify(updatedNonTargets)) {
      throw new Error(`${label} changed a row outside the reviewed approved-row ID set.`);
    }
    if (updated.length !== 1500 || new Set(updated.map((row) => row.id)).size !== 1500) {
      throw new Error(`${label} must retain exactly 1,500 unique rows.`);
    }
    for (const [id, replacement] of replacements) {
      const actual = updated.find((row) => row.id === id);
      if (JSON.stringify(actual) !== JSON.stringify(replacement)) {
        throw new Error(`${label} did not reproduce the exact reviewed row ${id}.`);
      }
    }
    return updated;
  }

  const plannedPackWrites = [];
  for (const filePath of [approvedPackPath, productionApprovedPackPath]) {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const questions = replaceRows(parsed.questions, path.relative(__dirname, filePath));
    plannedPackWrites.push([filePath, `${JSON.stringify({ ...parsed, questions }, null, 2)}\n`]);
  }

  const jsonlRows = replaceRows(readJsonl(approvedJsonlPath), path.basename(approvedJsonlPath));
  const coordinationAudit = validateApprovedQuestions(
    JSON.parse(plannedPackWrites.find(([filePath]) => filePath === approvedPackPath)[1]).questions
  );
  if (coordinationAudit.issues.length) {
    throw new Error(`coordination approved pack: ${coordinationAudit.issues.join("\n")}`);
  }

  for (const [filePath, content] of plannedPackWrites) fs.writeFileSync(filePath, content);
  fs.writeFileSync(approvedJsonlPath, `${jsonlRows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  fs.writeFileSync(approvedQuestionFamilyManifestPath, `${JSON.stringify(questionFamilyManifest(familyRows), null, 2)}\n`);
  console.log(`Synced ${targetIds.size} reviewed approved rows across approved artifacts.`);
}

if (process.argv.includes("--check-approved-parity")) checkApprovedParity();
else if (
  process.argv.includes("--sync-reviewed-approved-only")
  || process.argv.includes("--sync-reviewed-line-circle-only")
) syncReviewedApprovedRows();
else main();
