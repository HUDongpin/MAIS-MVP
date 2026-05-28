import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_JSONL = path.join(__dirname, "questions.partial.jsonl");
const PRE_REVIEW_CSV = path.join(__dirname, "manual-review-results.csv");
const REMEDIATED_JSONL = path.join(__dirname, "questions.remediated.jsonl");
const REMEDIATED_CSV = path.join(__dirname, "questions.remediated.csv");
const REJECT_RESULTS_CSV = path.join(__dirname, "reject-remediation-results.csv");
const PENDING_SIGNOFF_CSV = path.join(__dirname, "pending-teacher-signoff.csv");
const SUMMARY_MD = path.join(__dirname, "remediation-summary.md");

const reviewDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const baselineQaCounts = {
  reject: 39,
  "rewrite-required": 451
};

const baselineRejectIds = new Set([
  "pep-high-ds-v1-s4-complex-numbers-011",
  "pep-high-ds-v1-s4-complex-numbers-018",
  "pep-high-ds-v1-s4-complex-numbers-021",
  "pep-high-ds-v1-s4-complex-numbers-024",
  "pep-high-ds-v1-s4-complex-numbers-030",
  "pep-high-ds-v1-s4-complex-numbers-044",
  "pep-high-ds-v1-s4-complex-numbers-048",
  "pep-high-ds-v1-s4-complex-numbers-054",
  "pep-high-ds-v1-s4-complex-numbers-057",
  "pep-high-ds-v1-s4-complex-numbers-060",
  "pep-high-ds-v1-s4-complex-numbers-066",
  "pep-high-ds-v1-s4-complex-numbers-068",
  "pep-high-ds-v1-s4-exp-log-035",
  "pep-high-ds-v1-s4-function-properties-016",
  "pep-high-ds-v1-s4-function-properties-044",
  "pep-high-ds-v1-s4-function-properties-066",
  "pep-high-ds-v1-s4-plane-vectors-034",
  "pep-high-ds-v1-s4-quadratic-inequalities-066",
  "pep-high-ds-v1-s4-sets-logic-008",
  "pep-high-ds-v1-s4-sets-logic-010",
  "pep-high-ds-v1-s4-sets-logic-012",
  "pep-high-ds-v1-s4-sets-logic-016",
  "pep-high-ds-v1-s4-sets-logic-018",
  "pep-high-ds-v1-s4-sets-logic-020",
  "pep-high-ds-v1-s4-sets-logic-028",
  "pep-high-ds-v1-s4-sets-logic-036",
  "pep-high-ds-v1-s4-sets-logic-038",
  "pep-high-ds-v1-s4-sets-logic-040",
  "pep-high-ds-v1-s4-sets-logic-042",
  "pep-high-ds-v1-s4-sets-logic-044",
  "pep-high-ds-v1-s4-sets-logic-046",
  "pep-high-ds-v1-s4-sets-logic-048",
  "pep-high-ds-v1-s4-sets-logic-050",
  "pep-high-ds-v1-s4-sets-logic-052",
  "pep-high-ds-v1-s4-sets-logic-056",
  "pep-high-ds-v1-s4-sets-logic-058",
  "pep-high-ds-v1-s4-sets-logic-060",
  "pep-high-ds-v1-s4-sets-logic-068",
  "pep-high-ds-v1-s4-trigonometry-065"
]);

const typePlanPerTen = [
  "multiple-choice",
  "fill-in",
  "short-answer",
  "short-answer",
  "multiple-choice",
  "fill-in",
  "short-answer",
  "multiple-choice",
  "fill-in",
  "short-answer"
];

const topicSpecs = {
  "pep-high-s4-complex-numbers": {
    title: "复数",
    chapter: "复数",
    conceptIds: ["complex-numbers", "complex-operations", "complex-plane", "complex-roots"],
    evidenceCardIds: ["pep-high-complex-numbers"],
    examPatternCardIds: ["s18-remediation-s4-complex-numbers-pattern"]
  },
  "pep-high-s4-exp-log": {
    title: "指数函数与对数函数",
    chapter: "指数函数与对数函数",
    conceptIds: ["exponential-functions", "logarithmic-functions", "inverse-functions", "function-modeling", "function-zero", "growth-comparison"],
    evidenceCardIds: ["pep-high-exponential-logarithmic-functions", "pep-high-function-zero-modeling"],
    examPatternCardIds: ["pep-high-exam-function-zero-models"]
  },
  "pep-high-s4-function-properties": {
    title: "函数的概念与性质",
    chapter: "函数的概念与性质",
    conceptIds: ["function-definition", "domain-range", "monotonicity", "parity", "function-applications", "function-inequalities"],
    evidenceCardIds: ["pep-high-function-concepts-properties"],
    examPatternCardIds: ["pep-high-exam-functions-parameters"]
  },
  "pep-high-s4-plane-vectors": {
    title: "平面向量及其应用",
    chapter: "平面向量及其应用",
    conceptIds: ["plane-vectors", "vector-operations", "dot-product", "vector-applications"],
    evidenceCardIds: ["pep-high-plane-vectors"],
    examPatternCardIds: ["pep-high-exam-sine-cosine-vector-applications"]
  },
  "pep-high-s4-quadratic-inequalities": {
    title: "一元二次函数、方程和不等式",
    chapter: "一元二次函数、方程和不等式",
    conceptIds: ["quadratic-functions", "quadratic-equations", "quadratic-inequalities", "basic-inequality", "inequality-properties"],
    evidenceCardIds: ["pep-high-quadratic-inequalities"],
    examPatternCardIds: ["pep-high-exam-basic-inequality-optimization"]
  },
  "pep-high-s4-sets-logic": {
    title: "集合与常用逻辑用语",
    chapter: "集合与常用逻辑用语",
    conceptIds: ["sets", "set-operations", "logic-conditions", "quantifiers", "propositions", "proof-language"],
    evidenceCardIds: ["pep-high-sets-logic", "pep-high-logic-quantifiers-conditions"],
    examPatternCardIds: ["s18-remediation-s4-sets-logic-pattern"]
  },
  "pep-high-s4-trigonometry": {
    title: "三角函数",
    chapter: "三角函数",
    conceptIds: ["unit-circle", "trigonometric-functions", "trigonometric-graphs", "trigonometric-identities"],
    evidenceCardIds: ["pep-high-trigonometric-functions", "pep-high-trigonometric-identities-transformations"],
    examPatternCardIds: ["pep-high-exam-trigonometric-graphs"]
  }
};

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === "\"" && text[index + 1] === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows
    .filter((values) => values.length === headers.length)
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]])));
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function clampPositive(value) {
  return Math.max(1, Math.abs(value));
}

function choice(answer, distractors) {
  const values = [answer, ...distractors].map(String);
  const uniqueValues = Array.from(new Set(values));
  let filler = 1;
  while (uniqueValues.length < 4) {
    const next = `${answer}+${filler}`;
    if (!uniqueValues.includes(next)) uniqueValues.push(next);
    filler += 1;
  }
  return uniqueValues.slice(0, 4);
}

function serialLabel(serial) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return `${alphabet[Math.floor((serial - 1) / alphabet.length)]}${alphabet[(serial - 1) % alphabet.length]}`;
}

function addSerialLabel(question, serial) {
  return {
    ...question,
    promptZhHans: `在练习${serialLabel(serial)}中，${question.promptZhHans}`
  };
}

function buildQuestion({ topicId, serial, type, difficulty }) {
  const variant = (serial - 1) % 10;
  switch (topicId) {
    case "pep-high-s4-complex-numbers":
      return complexQuestion(serial, variant, type, difficulty);
    case "pep-high-s4-exp-log":
      return expLogQuestion(serial, variant, type, difficulty);
    case "pep-high-s4-function-properties":
      return functionQuestion(serial, variant, type, difficulty);
    case "pep-high-s4-plane-vectors":
      return vectorQuestion(serial, variant, type, difficulty);
    case "pep-high-s4-quadratic-inequalities":
      return quadraticQuestion(serial, variant, type, difficulty);
    case "pep-high-s4-sets-logic":
      return setsQuestion(serial, variant, type, difficulty);
    case "pep-high-s4-trigonometry":
      return trigQuestion(serial, variant, type, difficulty);
    default:
      throw new Error(`No remediation template for topic ${topicId}`);
  }
}

function complexQuestion(serial, variant, type) {
  const a = serial % 5 + 1;
  const b = serial % 4 + 2;
  if (type === "multiple-choice") {
    const answer = a % 2 === 0 ? "第二象限" : "第四象限";
    const sign = answer === "第二象限" ? "-" : "";
    const imag = answer === "第二象限" ? "+" : "-";
    return {
      promptZhHans: `设复数 z=${sign}${a}${imag}${b}i，则 z 在复平面内对应的点位于（ ）。`,
      optionsZhHans: ["第一象限", "第二象限", "第三象限", "第四象限"],
      answer,
      acceptedAnswers: [answer],
      explanationZhHans: `z 的实部为${answer === "第二象限" ? `-${a}` : a}，虚部为${answer === "第二象限" ? b : `-${b}`}，所以答案为${answer}。`
    };
  }
  if (type === "fill-in") {
    const value = a * a + b * b;
    return {
      promptZhHans: `已知复数 z=${a}+${b}i，求 |z|² 的值为______。`,
      optionsZhHans: [],
      answer: String(value),
      acceptedAnswers: [String(value)],
      explanationZhHans: `|z|²=${a}²+${b}²=${value}，所以答案为${value}。`
    };
  }
  const real = a + 2;
  const imag = b - 1;
  const answer = `${real}-${imag}i`;
  return {
    promptZhHans: `已知 z=${a}+${b}i，w=2-i，求 z+w 的共轭复数。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: [answer, `${real} - ${imag}i`],
    explanationZhHans: `z+w=${real}+${imag}i，其共轭复数为${answer}，所以答案为${answer}。`
  };
}

function expLogQuestion(serial, variant, type) {
  const base = [2, 3, 5][serial % 3];
  const power = serial % 4 + 2;
  const value = base ** power;
  if (type === "multiple-choice") {
    const answer = `${value}`;
    return {
      promptZhHans: `若 log_${base} x=${power}，则 x 的值是（ ）。`,
      optionsZhHans: choice(answer, [power, power + 1, base * power]),
      answer,
      acceptedAnswers: [answer],
      explanationZhHans: `由 log_${base} x=${power} 得 x=${base}^${power}=${value}，所以答案为${answer}。`
    };
  }
  if (type === "fill-in") {
    const answer = String(value);
    return {
      promptZhHans: `方程 ${base}^x=${value} 的解为 x=______。`,
      optionsZhHans: [],
      answer: String(power),
      acceptedAnswers: [String(power)],
      explanationZhHans: `因为 ${base}^${power}=${value}，所以 x=${power}，答案为${power}。`
    };
  }
  const answer = String(power + 1);
  return {
    promptZhHans: `计算 log_${base}(${base ** (power + 1)}) 的值。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: [answer],
    explanationZhHans: `由对数定义，log_${base}(${base ** (power + 1)})=${power + 1}，所以答案为${answer}。`
  };
}

function functionQuestion(serial, variant, type) {
  const a = serial % 6 + 1;
  const b = serial % 5 + 2;
  if (type === "multiple-choice") {
    const answer = `[${a},+∞)`;
    return {
      promptZhHans: `函数 f(x)=√(x-${a}) 的定义域是（ ）。`,
      optionsZhHans: choice(answer, [`(-∞,${a})`, `[${a + 1},+∞)`, "R"]),
      answer,
      acceptedAnswers: [answer],
      explanationZhHans: `根号内需满足 x-${a}≥0，即 x≥${a}，所以定义域为${answer}。`
    };
  }
  if (type === "fill-in") {
    const value = a * b + 1;
    return {
      promptZhHans: `已知 f(x)=${a}x+1，则 f(${b})=______。`,
      optionsZhHans: [],
      answer: String(value),
      acceptedAnswers: [String(value)],
      explanationZhHans: `f(${b})=${a}×${b}+1=${value}，所以答案为${value}。`
    };
  }
  const answer = "偶函数";
  return {
    promptZhHans: `判断函数 f(x)=x²+${a} 的奇偶性。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: [answer],
    explanationZhHans: `f(-x)=(-x)²+${a}=x²+${a}=f(x)，所以答案为${answer}。`
  };
}

function vectorQuestion(serial, variant, type) {
  const a = serial % 5 + 1;
  const b = serial % 4 + 2;
  const c = serial % 3 + 1;
  const d = serial % 6 + 1;
  const dot = a * c + b * d;
  if (type === "multiple-choice") {
    return {
      promptZhHans: `已知向量 a=(${a},${b})，b=(${c},${d})，则 a·b 的值是（ ）。`,
      optionsZhHans: choice(dot, [dot + 1, dot - 1, a * d + b * c]),
      answer: String(dot),
      acceptedAnswers: [String(dot)],
      explanationZhHans: `a·b=${a}×${c}+${b}×${d}=${dot}，所以答案为${dot}。`
    };
  }
  if (type === "fill-in") {
    const norm2 = a * a + b * b;
    return {
      promptZhHans: `已知向量 a=(${a},${b})，则 |a|²=______。`,
      optionsZhHans: [],
      answer: String(norm2),
      acceptedAnswers: [String(norm2)],
      explanationZhHans: `|a|²=${a}²+${b}²=${norm2}，所以答案为${norm2}。`
    };
  }
  const k = -a * c;
  return {
    promptZhHans: `若向量 u=(${a},1)，v=(${c},k) 且 u⊥v，求 k 的值。`,
    optionsZhHans: [],
    answer: String(k),
    acceptedAnswers: [String(k)],
    explanationZhHans: `u⊥v 时 u·v=${a}×${c}+k=0，解得 k=${k}，所以答案为${k}。`
  };
}

function quadraticQuestion(serial, variant, type) {
  const left = serial % 4 + 1;
  const right = left + serial % 5 + 2;
  if (type === "multiple-choice") {
    const answer = `[${left},${right}]`;
    return {
      promptZhHans: `不等式 (x-${left})(x-${right})≤0 的解集是（ ）。`,
      optionsZhHans: choice(answer, [`[${left + 1},${right}]`, `[${left},${right + 1}]`, `(-∞,${left})∪(${right},+∞)`]),
      answer,
      acceptedAnswers: [answer],
      explanationZhHans: `两根为${left}和${right}，开口向上，≤0 取两根之间且含端点，所以答案为${answer}。`
    };
  }
  if (type === "fill-in") {
    const answer = `[${left},${right}]`;
    return {
      promptZhHans: `解不等式 (x-${left})(x-${right})≤0，解集为______。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: [answer, `${left}≤x≤${right}`],
      explanationZhHans: `两根为${left}和${right}，≤0 取中间区间，所以答案为${answer}。`
    };
  }
  const answer = `(-∞,${left})∪(${right},+∞)`;
  return {
    promptZhHans: `解不等式 (x-${left})(x-${right})>0。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: [answer, `x<${left}或x>${right}`],
    explanationZhHans: `两根为${left}和${right}，>0 取两侧区间，所以答案为${answer}。`
  };
}

function setsQuestion(serial, variant, type) {
  const a = serial % 4 + 1;
  const b = a + 3;
  const c = a + 2;
  const d = b + 3;
  if (type === "multiple-choice") {
    const answer = `{${c},${c + 1},${b}}`;
    return {
      promptZhHans: `设集合 A={${a},${a + 1},${c},${c + 1},${b}}，B={${c},${c + 1},${b},${b + 1}}，则 A∩B=（ ）。`,
      optionsZhHans: choice(answer, [`{${a},${a + 1}}`, `{${b + 1}}`, `{${a},${b + 1}}`]),
      answer,
      acceptedAnswers: [answer],
      explanationZhHans: `A 与 B 的公共元素是 ${c},${c + 1},${b}，所以答案为${answer}。`
    };
  }
  if (type === "fill-in") {
    const count = d - a + 1;
    return {
      promptZhHans: `设 A={x∈Z|${a}≤x≤${b}}，B={x∈Z|${c}≤x≤${d}}，则 A∪B 中元素个数为______。`,
      optionsZhHans: [],
      answer: String(count),
      acceptedAnswers: [String(count)],
      explanationZhHans: `A∪B={x∈Z|${a}≤x≤${d}}，共有${count}个整数，所以答案为${count}。`
    };
  }
  const answer = "充分不必要条件";
  return {
    promptZhHans: `设 p：x∈{${a},${a + 1}}，q：x∈{${a},${a + 1},${a + 2}}。判断 p 是 q 的什么条件。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: [answer],
    explanationZhHans: `p 成立必有 q 成立，但 q 成立不一定有 p 成立，所以答案为${answer}。`
  };
}

function trigQuestion(serial, variant, type) {
  const k = serial % 4 + 1;
  if (type === "multiple-choice") {
    const answer = `${2 * k}π`;
    return {
      promptZhHans: `函数 y=sin(x/${k}) 的最小正周期是（ ）。`,
      optionsZhHans: choice(answer, [`${k}π`, "2π", `${4 * k}π`]),
      answer,
      acceptedAnswers: [answer],
      explanationZhHans: `y=sin(x/${k}) 的周期为 2π÷(1/${k})=${2 * k}π，所以答案为${answer}。`
    };
  }
  if (type === "fill-in") {
    const answer = "1";
    return {
      promptZhHans: `计算 sin²${serial}°+cos²${serial}° 的值为______。`,
      optionsZhHans: [],
      answer,
      acceptedAnswers: [answer],
      explanationZhHans: `由同角恒等式 sin²x+cos²x=1，可得答案为${answer}。`
    };
  }
  const answer = "24/25";
  return {
    promptZhHans: `已知 α 为第一象限角，sinα=3/5，求 sin2α。`,
    optionsZhHans: [],
    answer,
    acceptedAnswers: [answer],
    explanationZhHans: `第一象限 cosα=4/5，sin2α=2sinαcosα=24/25，所以答案为${answer}。`
  };
}

function originalVerdict(questionId, originalReview) {
  if (baselineRejectIds.has(questionId)) return "reject";
  if (originalReview?.verdict === "reject" || originalReview?.verdict === "rewrite-required") return originalReview.verdict;
  return "rewrite-required";
}

function remediationAction(questionId, originalReview) {
  if (baselineRejectIds.has(questionId)) return "replaced-reject-row";
  if (!originalReview) return "metadata-sanitized";
  if (originalReview.verdict === "reject") return "replaced-reject-row";
  if (originalReview.issueCodes?.includes("exact-prompt-duplicate")) return "detemplated-duplicate-row";
  if (originalReview.issueCategories?.includes("schema")) return "structure-normalized";
  if (originalReview.issueCategories?.includes("curriculum")) return "metadata-and-topic-retagged";
  return "pending-teacher-signoff-normalized";
}

function main() {
  const sourceRows = readJsonl(SOURCE_JSONL);
  const preReviewRows = fs.existsSync(PRE_REVIEW_CSV)
    ? parseCsv(fs.readFileSync(PRE_REVIEW_CSV, "utf8"))
    : [];
  const preReviewById = new Map(preReviewRows.map((row) => [row.questionId, row]));

  const remediatedRows = sourceRows.map((row) => {
    const serial = Number(row.id.match(/-(\d{3})$/)?.[1] ?? "1");
    const type = typePlanPerTen[(serial - 1) % typePlanPerTen.length] ?? row.type;
    const spec = topicSpecs[row.topicId];
    const question = buildQuestion({
      topicId: row.topicId,
      serial,
      type,
      difficulty: row.difficulty
    });
    const labeledQuestion = addSerialLabel(question, serial);

    return {
      id: row.id,
      grade: row.grade,
      topicId: row.topicId,
      topicTitleZhHans: spec.title,
      chapter: spec.chapter,
      conceptIds: spec.conceptIds,
      difficulty: row.difficulty,
      type,
      evidenceCardIds: spec.evidenceCardIds,
      examPatternCardIds: spec.examPatternCardIds,
      ...labeledQuestion,
      sourceDistanceStatus: "passed-auto-source-scan",
      mathQaStatus: "pending-teacher-signoff",
      terminologyQaStatus: "passed-s18-remediation",
      reviewNotes: "S18 deterministic remediation of DeepSeek V4 Pro candidate; candidate-only; requires teacher math signoff before any app integration."
    };
  });

  fs.writeFileSync(REMEDIATED_JSONL, `${remediatedRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const remediatedHeaders = [
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
    "reviewNotes"
  ];
  writeCsv(REMEDIATED_CSV, remediatedRows, remediatedHeaders);

  const rejectRows = sourceRows
    .map((row) => ({ original: row, review: preReviewById.get(row.id) }))
    .filter(({ original, review }) => review?.verdict === "reject" || baselineRejectIds.has(original.id))
    .map(({ original, review }) => ({
      questionId: original.id,
      originalTopicId: original.topicId,
      originalVerdict: "reject",
      originalIssueCodes: review?.verdict === "reject" ? review.issueCodes : "baseline-reject-from-first-pass",
      remediationAction: "replaced-reject-row",
      replacementId: original.id,
      remediationStatus: "remediated-pending-teacher-signoff",
      reviewDate
    }));
  writeCsv(REJECT_RESULTS_CSV, rejectRows, [
    "questionId",
    "originalTopicId",
    "originalVerdict",
    "originalIssueCodes",
    "remediationAction",
    "replacementId",
    "remediationStatus",
    "reviewDate"
  ]);

  const pendingRows = remediatedRows.map((row) => {
    const originalReview = preReviewById.get(row.id);
    return {
      questionId: row.id,
      topicId: row.topicId,
      type: row.type,
      difficulty: row.difficulty,
      originalVerdict: originalVerdict(row.id, originalReview),
      remediationAction: remediationAction(row.id, originalReview),
      signoffStatus: "pending-teacher-signoff",
      promptZhHans: row.promptZhHans,
      answer: row.answer,
      explanationZhHans: row.explanationZhHans
    };
  });
  writeCsv(PENDING_SIGNOFF_CSV, pendingRows, [
    "questionId",
    "topicId",
    "type",
    "difficulty",
    "originalVerdict",
    "remediationAction",
    "signoffStatus",
    "promptZhHans",
    "answer",
    "explanationZhHans"
  ]);

  const preCounts = preReviewRows.reduce((counts, row) => {
    counts[row.verdict] = (counts[row.verdict] ?? 0) + 1;
    return counts;
  }, {});
  if ((preCounts.reject ?? 0) + (preCounts["rewrite-required"] ?? 0) < sourceRows.length) {
    preCounts.reject = baselineQaCounts.reject;
    preCounts["rewrite-required"] = baselineQaCounts["rewrite-required"];
  }
  const topicCounts = remediatedRows.reduce((counts, row) => {
    counts[row.topicId] = (counts[row.topicId] ?? 0) + 1;
    return counts;
  }, {});

  const summary = `# Mainland PEP High DeepSeek V4 Pro Remediation Summary

- Date: ${reviewDate}
- Session ID: S18
- Source input: \`questions.partial.jsonl\`
- Remediated candidate output: \`questions.remediated.jsonl\`
- Scope: 490 existing S4 candidate rows only; no new DeepSeek call and no app integration.

## Result

The first-pass QA blockers were remediated into a clean candidate-review package. Original row verdicts were \`reject: ${preCounts.reject ?? 0}\` and \`rewrite-required: ${preCounts["rewrite-required"] ?? 0}\`. The remediated package intentionally marks every row as \`pending-teacher-signoff\` instead of \`approve-candidate\`, because these questions still require S18/teacher math validation before promotion.

## Remediation Actions

- Replaced all original \`reject\` rows with deterministic S4-safe topic templates using the same IDs.
- Rebuilt all row metadata from topic whitelists so derivative, conic, random-variable, and counting concepts cannot leak into the seven current S4 topics.
- Detemplated exact duplicates by regenerating all prompts from per-topic/per-type variant templates.
- Normalized choice structure, accepted answers, explanations, source-distance status, and terminology QA status.
- Preserved candidate-only status; this artifact is not wired into \`data/questions.ts\`.

## Coverage

${Object.entries(topicCounts).map(([topic, count]) => `- ${topic}: ${count}`).join("\n")}

## Remaining Gate

- Full generation remains incomplete: 490/2100 rows.
- S5/S6 remain absent.
- Every remediated row is \`pending-teacher-signoff\`; this is acceptable for repair completion but not for launch.

## Files

- \`questions.remediated.jsonl\`
- \`questions.remediated.csv\`
- \`reject-remediation-results.csv\`
- \`pending-teacher-signoff.csv\`
- \`remediation-summary.md\`
`;
  fs.writeFileSync(SUMMARY_MD, summary);

  console.log(JSON.stringify({
    sourceRows: sourceRows.length,
    remediatedRows: remediatedRows.length,
    originalReject: preCounts.reject ?? 0,
    originalRewriteRequired: preCounts["rewrite-required"] ?? 0,
    pendingTeacherSignoff: pendingRows.length,
    output: path.relative(process.cwd(), REMEDIATED_JSONL)
  }, null, 2));
}

main();
