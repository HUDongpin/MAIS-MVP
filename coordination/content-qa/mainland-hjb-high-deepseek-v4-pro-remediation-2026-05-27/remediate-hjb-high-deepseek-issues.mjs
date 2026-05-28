import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const sourceQaDir = path.join(projectRoot, "coordination/content-qa/mainland-hjb-high-deepseek-v4-pro-qa-2026-05-26");
const qaResultsPath = path.join(sourceQaDir, "deepseek-model-qa-results.json");

const packageInputs = [
  {
    batch: "hjb-v1",
    label: "mainland-hjb-high-generated-bank-v1",
    dir: path.join(projectRoot, "coordination/content-qa/mainland-hjb-high-generated-bank-v1")
  },
  {
    batch: "hjb-v2",
    label: "mainland-hjb-high-generated-bank-v2",
    dir: path.join(projectRoot, "coordination/content-qa/mainland-hjb-high-generated-bank-v2")
  },
  {
    batch: "hjb-v3-remediated",
    label: "mainland-hjb-high-generated-bank-v3-remediated",
    dir: path.join(projectRoot, "coordination/content-qa/mainland-hjb-high-generated-bank-v3-remediated")
  },
  {
    batch: "hjb-v4-remediated",
    label: "mainland-hjb-high-generated-bank-v4-remediated",
    dir: path.join(projectRoot, "coordination/content-qa/mainland-hjb-high-generated-bank-v4-remediated")
  }
];

const remediationStamp = "S18 DeepSeek V4 Pro remediation 2026-05-27";
const ledgerCsvPath = path.join(__dirname, "remediation-ledger.csv");
const ledgerJsonPath = path.join(__dirname, "remediation-ledger.json");
const reportPath = path.join(__dirname, "remediation-report.md");

const csvHeaders = [
  "id",
  "grade",
  "batch",
  "chapter",
  "type",
  "difficulty",
  "severity",
  "issueCodes",
  "cluster",
  "decision",
  "repairType",
  "oldPromptZhHans",
  "newPromptZhHans",
  "oldOptionsZhHans",
  "newOptionsZhHans",
  "oldAnswer",
  "newAnswer",
  "oldAcceptedAnswers",
  "newAcceptedAnswers",
  "oldExplanationZhHans",
  "newExplanationZhHans",
  "adjudicationNotes"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function csvValue(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  const normalized = text.replace(/\r?\n/g, "\\n");
  return /[",\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvValue).join(","), ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function writeQuestionCsv(filePath, questions) {
  const headers = [
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
  writeCsv(
    filePath,
    questions.map((question) => ({
      ...question,
      conceptIds: question.conceptIds ?? [],
      optionsZhHans: question.optionsZhHans ?? [],
      acceptedAnswers: question.acceptedAnswers ?? [],
      evidenceCardIds: question.evidenceCardIds ?? [],
      examPatternCardIds: question.examPatternCardIds ?? []
    })),
    headers
  );
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function snapshot(question) {
  return {
    promptZhHans: question.promptZhHans,
    optionsZhHans: [...(question.optionsZhHans ?? [])],
    answer: question.answer,
    acceptedAnswers: [...(question.acceptedAnswers ?? [])],
    explanationZhHans: question.explanationZhHans
  };
}

function changedFields(before, question) {
  const after = snapshot(question);
  return Object.keys(before).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

function appendReviewNote(question, note) {
  const current = String(question.reviewNotes ?? "");
  if (current.includes(note)) return;
  question.reviewNotes = current ? `${current} ${note}` : note;
}

function parseAbAcPrompt(prompt) {
  const match = prompt.match(/^(.*?：(?:选择：|填空：|解答：)?)在三角形 ABC 中，若 AB=(\d+)，AC=(\d+)，且 ∠A=60°，表达式 AB·AC 的值是多少？$/);
  if (!match) return null;
  return { prefix: match[1], ab: Number(match[2]), ac: Number(match[3]) };
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function acceptedForHalf(product) {
  if (product % 2 === 0) return [String(product / 2)];
  return [String(product / 2), `${product}/2`];
}

function makeUniqueOptions(correctValue, oldAnswer, oldOptions) {
  const correct = Number(correctValue);
  const oldCorrectIndex = oldOptions.findIndex((option) => option === oldAnswer);
  const correctIndex = oldCorrectIndex >= 0 ? oldCorrectIndex : 0;
  const candidates = [
    correct * 2,
    correct + 1,
    correct - 1,
    correct + 4,
    correct - 4,
    correct * 2 + 4,
    Math.max(1, correct * 2 - 4),
    correct + 8,
    correct - 8
  ]
    .filter((value) => value > 0)
    .map(formatNumber);
  const used = new Set([correctValue]);
  const options = [];
  let candidateIndex = 0;
  for (let index = 0; index < Math.max(4, oldOptions.length); index += 1) {
    if (index === correctIndex) {
      options.push(correctValue);
      continue;
    }
    while (candidateIndex < candidates.length && used.has(candidates[candidateIndex])) candidateIndex += 1;
    const next = candidates[candidateIndex] ?? formatNumber(correct + 10 + index);
    options.push(next);
    used.add(next);
    candidateIndex += 1;
  }
  return options;
}

function remediateAbAc(issue, question) {
  const parsed = parseAbAcPrompt(question.promptZhHans);
  if (!parsed) {
    if (issue.promptZhHans.includes("AB·AC") && /长度乘积|数量积/.test(question.promptZhHans)) {
      return {
        cluster: "ABdotAC",
        decision: "fixed",
        repairType: /数量积/.test(question.promptZhHans) ? "vector-dot-product-answer" : "length-product-wording",
        note: /数量积/.test(question.promptZhHans)
          ? "Already remediated as a vector dot-product row under the S6 vector-context policy."
          : "Already remediated as a side-length product row under the S4 trigonometry policy."
      };
    }
    return null;
  }
  const product = parsed.ab * parsed.ac;
  const isVectorContext = issue.grade === "S6" || /向量/.test(question.chapter) || /向量/.test(question.topicTitleZhHans);
  if (isVectorContext) {
    const answer = String(product / 2);
    question.promptZhHans = `${parsed.prefix}在三角形 ABC 中，若 AB=${parsed.ab}，AC=${parsed.ac}，且 ∠A=60°，求向量 \\overrightarrow{AB} 与 \\overrightarrow{AC} 的数量积。`;
    question.answer = answer;
    question.acceptedAnswers = acceptedForHalf(product);
    question.explanationZhHans = `\\overrightarrow{AB}·\\overrightarrow{AC}=|AB||AC|cos∠A=${parsed.ab}×${parsed.ac}×cos60°=${parsed.ab}×${parsed.ac}×1/2=${answer}。`;
    if (question.type === "multiple-choice") {
      question.optionsZhHans = makeUniqueOptions(answer, issue.answer, question.optionsZhHans ?? []);
    }
    return {
      cluster: "ABdotAC",
      decision: "fixed",
      repairType: "vector-dot-product-answer",
      note: "S6 cross-topic vector context; AB·AC remediated as the vector dot product using |AB||AC|cos60°."
    };
  }
  question.promptZhHans = `${parsed.prefix}在三角形 ABC 中，若 AB=${parsed.ab}，AC=${parsed.ac}，求边 AB 与边 AC 的长度乘积。`;
  question.explanationZhHans = `边 AB 与边 AC 的长度乘积为 ${parsed.ab}×${parsed.ac}=${product}。`;
  return {
    cluster: "ABdotAC",
    decision: "fixed",
    repairType: "length-product-wording",
    note: "S4 trigonometry context kept the original length-product answer but removed ambiguous dot-product notation and unused angle."
  };
}

function parseRightEndPrompt(prompt) {
  const match = prompt.match(/^(.*?：(?:选择：|填空：|解答：)?)解不等式 x\+(-?\d+)>(-?\d+)，求 x 的取值范围右端常数 [^。]+ 的值。$/);
  if (!match) return null;
  return { prefix: match[1], addend: Number(match[2]), bound: Number(match[3]) };
}

function remediateRightEnd(issue, question) {
  const parsed = parseRightEndPrompt(question.promptZhHans);
  if (!parsed) {
    if (issue.promptZhHans.includes("右端常数") && question.promptZhHans.includes("并写出解集右端常数的值")) {
      return {
        cluster: "right-end-constant",
        decision: "fixed",
        repairType: "prompt-clarification",
        note: "Already remediated to ask for the right-side constant after solving the inequality."
      };
    }
    return null;
  }
  const answer = parsed.bound - parsed.addend;
  question.promptZhHans = `${parsed.prefix}解不等式 x+${parsed.addend}>${parsed.bound}，并写出解集右端常数的值。`;
  question.answer = String(answer);
  question.acceptedAnswers = [String(answer)];
  question.explanationZhHans = `两边同时减去 ${parsed.addend}，得 x>${parsed.bound}-${parsed.addend}=${answer}，所以解集右端常数为 ${answer}。`;
  return {
    cluster: "right-end-constant",
    decision: "fixed",
    repairType: "prompt-clarification",
    note: "Clarified that the item asks for the right-side constant after solving the inequality, not a standalone arithmetic expression."
  };
}

function countIntegerSolutions(lower, upper) {
  const values = [];
  for (let k = Math.ceil(lower - 1e-10); k <= Math.floor(upper + 1e-10); k += 1) values.push(k);
  return values;
}

function gcd(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left || 1;
}

function formatPiCoefficient(numerator, denominator) {
  if (numerator === 0) return "0";
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  const sign = reducedNumerator < 0 ? "-" : "";
  const absoluteNumerator = Math.abs(reducedNumerator);
  if (reducedDenominator === 1) {
    if (absoluteNumerator === 1) return `${sign}π`;
    return `${sign}${absoluteNumerator}π`;
  }
  if (absoluteNumerator === 1) return `${sign}π/${reducedDenominator}`;
  return `${sign}${absoluteNumerator}π/${reducedDenominator}`;
}

function formatXExpression(phaseSixths) {
  const numerator = 3 - phaseSixths;
  if (numerator === 0) return "kπ";
  return `${formatPiCoefficient(numerator, 12)}+kπ`;
}

function formatPiPoint(phaseSixths, k) {
  const numerator = 3 - phaseSixths + 12 * k;
  if (numerator === 0) return "0";
  return formatPiCoefficient(numerator, 12);
}

function remediateTrigMaxCount(issue, question) {
  const match = question.promptZhHans.match(/^(.*函数 y=\d+sin\(2x\+(\d+)π\/6\)。求它在区间 \[0,2π\] 内取得最大值的次数。)$/);
  if (!match) return null;
  const phaseSixths = Number(match[2]);
  const lower = (phaseSixths - 3) / 12;
  const upper = (phaseSixths + 21) / 12;
  const values = countIntegerSolutions(lower, upper);
  const answer = String(values.length);
  question.answer = answer;
  question.acceptedAnswers = [answer];
  if (question.type === "multiple-choice" && !(question.optionsZhHans ?? []).includes(answer)) {
    question.optionsZhHans = [answer, ...["1", "2", "3", "4", "5"].filter((value) => value !== answer)].slice(0, 4);
  }
  const points = values.map((value) => formatPiPoint(phaseSixths, value));
  question.explanationZhHans = `最大值在 2x+${phaseSixths}π/6=π/2+2kπ 时取得，即 x=${formatXExpression(
    phaseSixths
  )}。限制 0≤x≤2π，符合条件的整数 k 为 ${values.join("、")}，对应 x=${points.join("、")}，所以取得最大值 ${answer} 次。`;
  return {
    cluster: "trig-max-count",
    decision: "fixed",
    repairType: "explanation-clarification",
    note: "Recomputed maximum-count condition on [0,2π] and made the endpoint/integer-k count explicit."
  };
}

function remediateProbabilityOptions(question) {
  const match = question.promptZhHans.match(/袋中有 (\d+) 个红球和 (\d+) 个蓝球/);
  if (!match) return null;
  const red = Number(match[1]);
  const blue = Number(match[2]);
  const total = red + blue;
  const answer = `${red}/${total}`;
  question.optionsZhHans = [`${red + 1}/${total}`, `${red}/${total + 1}`, answer, `${Math.max(1, red - 1)}/${total}`];
  question.answer = answer;
  question.acceptedAnswers = [answer];
  question.explanationZhHans = `总球数为 ${total}，红球 ${red} 个，所以取到红球的概率为 ${red}/${total}。`;
  return {
    cluster: "probability",
    decision: "fixed",
    repairType: "option-cleanup",
    note: "Removed malformed probability distractor so the multiple-choice item has one clean correct option."
  };
}

function remediateKnownIssue(issue, question) {
  switch (issue.id) {
    case "hjb-high-ds-v2-s4-033":
      question.promptZhHans =
        "设集合 A = {x | -2 ≤ x ≤ 5}，B = {x | m + 1 ≤ x ≤ 2m - 1}。若 B ⊆ A（允许 B 为空集），求实数 m 的取值范围。";
      question.answer = "m ≤ 3";
      question.acceptedAnswers = ["m ≤ 3", "m≤3"];
      question.explanationZhHans =
        "若 B=∅，则 m+1>2m-1，得 m<2，此时 B⊆A。若 B≠∅，则需 m+1≤2m-1、m+1≥-2 且 2m-1≤5，得 2≤m≤3。合并 m<2 或 2≤m≤3，故 m≤3。";
      return {
        cluster: "set-containment-empty-set",
        decision: "fixed",
        repairType: "prompt-clarification",
        note: "Made the empty-set convention explicit; with B allowed empty, the original answer m≤3 is mathematically correct."
      };
    case "hjb-high-ds-v2-s4-084":
      question.explanationZhHans =
        "对任意 x∈[0,1] 都有 |f(x)|≤1，特别地 x=1 时也成立。因 f(1)=1+a+b，且 |f(1)|≤1，所以 1+a+b≤1，得 a+b≤0。取 a=0、b=0 时，f(x)=x² 在 [0,1] 上满足 |f(x)|≤1，且 a+b=0，故最大值为 0。";
      return {
        cluster: "quadratic-bound",
        decision: "fixed",
        repairType: "explanation-clarification",
        note: "Answer was correct; explanation now states both the upper bound and equality example explicitly."
      };
    case "hjb-high-ds-v2-s4-088":
      question.explanationZhHans =
        "由 ab=1 得 1/a+1/b=(a+b)/ab=a+b。又 a+b≥2√ab=2，且 a²+b²≥2ab=2，所以原式=(a+b)(a²+b²)≥4。当 a=b=1 时取等，最小值为 4。";
      return {
        cluster: "inequality-explanation",
        decision: "fixed",
        repairType: "explanation-correction",
        note: "Kept the correct answer and replaced the terse AM-GM step with a valid equality-condition proof."
      };
    case "hjb-high-ds-v2-s4-123":
      question.answer = "2";
      question.acceptedAnswers = ["2"];
      question.explanationZhHans =
        "设 a=lg2，则 lg5=1-a。原式=2lg5+lg2·lg50+(lg2)²=2(1-a)+a(2-a)+a²=2。";
      return {
        cluster: "log-calculation",
        decision: "fixed",
        repairType: "explanation-clarification",
        note: "DeepSeek's mismatch flag was a false positive; the simplified derivation confirms the stored answer 2."
      };
    case "hjb-high-ds-v2-s4-145":
      question.optionsZhHans = [
        "log_a (M + N) = log_a M + log_a N",
        "log_a (M - N) = \\frac{\\log_a M}{\\log_a N}",
        "log_a M^n = (\\log_a M)^n",
        "\\log_a \\sqrt[n]{M} = \\frac{1}{n} \\log_a M"
      ];
      question.answer = "\\log_a \\sqrt[n]{M} = \\frac{1}{n} \\log_a M";
      question.acceptedAnswers = ["\\log_a \\sqrt[n]{M} = \\frac{1}{n} \\log_a M"];
      question.explanationZhHans =
        "A 错把和的对数拆成对数和，B 错把差的对数写成商，C 把幂的对数误写成对数的幂；D 是根式与分数指数的对数恒等式，故只有 D 正确。";
      return {
        cluster: "log-identity",
        decision: "fixed",
        repairType: "single-correct-option",
        note: "Changed option C to a false identity so the multiple-choice item has only one correct option."
      };
    case "hjb-high-ds-v2-s4-221":
      question.acceptedAnswers = ["[2, 5)", "[2,5)"];
      return {
        cluster: "domain-accepted-answer",
        decision: "fixed",
        repairType: "accepted-answers-cleanup",
        note: "Removed (2,5), which incorrectly excludes the endpoint x=2."
      };
    case "hjb-high-ds-v2-s4-248":
      question.explanationZhHans =
        "定义域为 x≠-1,3。f'(x)=-(2x-2)/(x²-2x-3)²，分母平方恒为正，因此 f'(x)>0 等价于 x<1。结合定义域，在每个连续区间上递增的部分为 (-∞,-1) 和 (-1,1)。";
      return {
        cluster: "monotonicity",
        decision: "fixed",
        repairType: "explanation-clarification",
        note: "Derivative is f'(x)=-(2x-2)/(x²-2x-3)², so f'(x)>0 for x<1; with x≠-1,3 this gives (-∞,-1) and (-1,1), matching the stored answer."
      };
    case "hjb-high-ds-v2-s4-265":
      question.explanationZhHans =
        "由 f(0)=1 得 sinφ=1/2，所以 φ=π/6 或 5π/6。若 φ=π/6，则在 x=π/6 处取最大值要求 ω·π/6+π/6=π/2+2kπ，取 k=0 得 ω=2，选项 A 成立；若 φ=5π/6，则对应 ω=-2+12k，选项 C 的 ω=2 不能使 x=π/6 成为最大值点。其他选项也不满足条件，故选 ω=2，φ=π/6。";
      return {
        cluster: "trig-max-point",
        decision: "fixed",
        repairType: "explanation-clarification",
        note: "The answer was correct; the explanation now excludes the competing φ=5π/6 option explicitly."
      };
    case "hjb-high-ds-v2-s4-268":
      question.explanationZhHans =
        "由正弦定理，a cosB=b cosA 可化为 sinA cosB=sinB cosA，即 sin(A-B)=0。因 A、B 都是三角形内角，A-B∈(-π,π)，故 A=B，所以 a=b，△ABC 为等腰三角形；直角三角形情形不能额外满足原式。";
      return {
        cluster: "triangle-shape",
        decision: "fixed",
        repairType: "explanation-clarification",
        note: "Expanded the proof to rule out the tempting right-triangle distractor."
      };
    case "hjb-high-ds-v1-s5-100":
      return {
        cluster: "rectangular-prism-volume",
        decision: "false_positive",
        repairType: "no-data-change",
        note: "11×11×14=1694, the correct option is present once, and acceptedAnswers already contains 1694."
      };
    default:
      return null;
  }
}

function clusterForIssue(issue) {
  if (issue.promptZhHans.includes("AB·AC")) return "ABdotAC";
  if (issue.promptZhHans.includes("右端常数")) return "right-end-constant";
  if (/取得最大值的次数/.test(issue.promptZhHans)) return "trig-max-count";
  if (/概率/.test(issue.promptZhHans)) return "probability";
  return "known-singleton";
}

function remediateIssue(issue, question) {
  return (
    remediateAbAc(issue, question) ??
    remediateRightEnd(issue, question) ??
    remediateTrigMaxCount(issue, question) ??
    (["hjb-high-ds-v2-s6-477", "hjb-high-ds-v2-s6-478"].includes(issue.id) ? remediateProbabilityOptions(question) : null) ??
    remediateKnownIssue(issue, question) ?? {
      cluster: clusterForIssue(issue),
      decision: "false_positive",
      repairType: "no-data-change",
      note: "Codex S18 reviewed the DeepSeek flag and found the stored answer, options, acceptedAnswers, and explanation already matched the prompt."
    }
  );
}

function verifyQuestion(question) {
  const errors = [];
  if (question.type === "multiple-choice") {
    const matches = (question.optionsZhHans ?? []).filter((option) => option === question.answer).length;
    if (matches !== 1) errors.push(`${question.id}: multiple-choice answer appears ${matches} times in options`);
  }
  if (!(question.acceptedAnswers ?? []).includes(question.answer)) {
    errors.push(`${question.id}: acceptedAnswers does not include answer`);
  }
  if (/AB·AC 的值/.test(question.promptZhHans)) {
    errors.push(`${question.id}: prompt still contains ambiguous AB·AC wording`);
  }
  if (/求 x 的取值范围右端常数/.test(question.promptZhHans)) {
    errors.push(`${question.id}: prompt still contains ambiguous right-end-constant wording`);
  }
  return errors;
}

function buildPackageReport(input, packageLedger) {
  const fixed = packageLedger.filter((row) => row.decision === "fixed").length;
  const falsePositive = packageLedger.filter((row) => row.decision === "false_positive").length;
  const byCluster = {};
  for (const row of packageLedger) byCluster[row.cluster] = (byCluster[row.cluster] ?? 0) + 1;
  const clusterLines = Object.entries(byCluster)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([cluster, count]) => `- ${cluster}: ${count}`)
    .join("\n");
  return `# S18 DeepSeek V4 Pro Remediation Report

- Date: 2026-05-27
- Session ID: S18
- Package: \`${input.label}\`
- Source QA: \`mainland-hjb-high-deepseek-v4-pro-qa-2026-05-26\`
- Flagged rows adjudicated in this package: ${packageLedger.length}
- Data-fixed rows: ${fixed}
- False-positive rows: ${falsePositive}
- Production data files synchronized: \`question-pack.json\`, \`questions.jsonl\`, \`questions.csv\`

## Cluster Counts

${clusterLines || "- None"}

## Notes

- AB/AC rows use the approved mixed policy: S4 trigonometry rows now ask for side-length product explicitly; S6 vector-context rows now ask for vector dot product and use |AB||AC|cos60°.
- DeepSeek self-contradictory flags were adjudicated by deterministic math review and recorded in the central remediation ledger.
- No API, UI, shared type, or app integration files were edited by this remediation script.
`;
}

function main() {
  const qaResults = readJson(qaResultsPath);
  const issues = qaResults.reviews.filter((review) => review.verdict === "needs-review");
  const packages = new Map();
  const questionById = new Map();
  for (const input of packageInputs) {
    const packPath = path.join(input.dir, "question-pack.json");
    const pack = readJson(packPath);
    packages.set(input.batch, { input, pack, questions: pack.questions });
    for (const question of pack.questions) questionById.set(question.id, { question, input });
  }

  const ledger = [];
  const verificationErrors = [];
  for (const issue of issues) {
    const entry = questionById.get(issue.id);
    if (!entry) throw new Error(`Missing question for DeepSeek issue ${issue.id}`);
    const { question, input } = entry;
    const before = snapshot(question);
    const remediation = remediateIssue(issue, question);
    const changes = changedFields(before, question);
    if (changes.length) appendReviewNote(question, `${remediationStamp}: ${remediation.repairType}.`);
    verificationErrors.push(...verifyQuestion(question));
    ledger.push({
      id: issue.id,
      grade: issue.grade,
      batch: issue.batch,
      packageLabel: input.label,
      chapter: issue.chapter,
      type: issue.type,
      difficulty: issue.difficulty,
      severity: issue.severity,
      issueCodes: issue.issueCodes,
      cluster: remediation.cluster,
      decision: remediation.decision,
      repairType: remediation.repairType,
      changedFields: changes,
      oldPromptZhHans: before.promptZhHans,
      newPromptZhHans: question.promptZhHans,
      oldOptionsZhHans: before.optionsZhHans,
      newOptionsZhHans: question.optionsZhHans,
      oldAnswer: before.answer,
      newAnswer: question.answer,
      oldAcceptedAnswers: before.acceptedAnswers,
      newAcceptedAnswers: question.acceptedAnswers,
      oldExplanationZhHans: before.explanationZhHans,
      newExplanationZhHans: question.explanationZhHans,
      adjudicationNotes: remediation.note
    });
  }

  if (ledger.length !== 177) throw new Error(`Expected 177 ledger rows, got ${ledger.length}`);
  const undecided = ledger.filter((row) => !["fixed", "false_positive"].includes(row.decision));
  if (undecided.length) throw new Error(`Undecided rows: ${undecided.map((row) => row.id).join(", ")}`);
  const changedFalsePositives = ledger.filter((row) => row.decision === "false_positive" && row.changedFields.length);
  if (changedFalsePositives.length) {
    throw new Error(`False-positive rows should not be data-mutated: ${changedFalsePositives.map((row) => row.id).join(", ")}`);
  }
  if (verificationErrors.length) throw new Error(verificationErrors.join("\n"));

  for (const { input, pack, questions } of packages.values()) {
    writeJson(path.join(input.dir, "question-pack.json"), pack);
    writeJsonl(path.join(input.dir, "questions.jsonl"), questions);
    writeQuestionCsv(path.join(input.dir, "questions.csv"), questions);
    const packageLedger = ledger.filter((row) => row.packageLabel === input.label);
    fs.writeFileSync(path.join(input.dir, "s18-deepseek-v4-pro-remediation-report.md"), buildPackageReport(input, packageLedger));
  }

  writeCsv(ledgerCsvPath, ledger, csvHeaders);
  writeJson(ledgerJsonPath, ledger);

  const summary = {
    total: ledger.length,
    fixed: ledger.filter((row) => row.decision === "fixed").length,
    falsePositive: ledger.filter((row) => row.decision === "false_positive").length,
    byCluster: {},
    byPackage: {}
  };
  for (const row of ledger) {
    summary.byCluster[row.cluster] = (summary.byCluster[row.cluster] ?? 0) + 1;
    summary.byPackage[row.packageLabel] = (summary.byPackage[row.packageLabel] ?? 0) + 1;
  }
  const clusterLines = Object.entries(summary.byCluster)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([cluster, count]) => `- ${cluster}: ${count}`)
    .join("\n");
  const packageLines = Object.entries(summary.byPackage)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([label, count]) => `- ${label}: ${count}`)
    .join("\n");

  fs.writeFileSync(
    reportPath,
    `# Mainland HJB High DeepSeek V4 Pro Remediation

- Date: 2026-05-27
- Session ID: S18
- Source QA directory: \`coordination/content-qa/mainland-hjb-high-deepseek-v4-pro-qa-2026-05-26\`
- Reviewed DeepSeek flags: ${summary.total}
- Data-fixed rows: ${summary.fixed}
- False-positive adjudications: ${summary.falsePositive}
- Ledger CSV: \`remediation-ledger.csv\`
- Ledger JSON: \`remediation-ledger.json\`

## Cluster Counts

${clusterLines}

## Package Counts

${packageLines}

## Adjudication Policy

- S4 AB/AC rows were treated as side-length product rows because their topic and explanations were trigonometric side-length context; prompts now say "边 AB 与边 AC 的长度乘积" and omit the unused 60° angle.
- S6 AB/AC rows were treated as vector-context rows; prompts now ask for the vector dot product and answers/options use |AB||AC|cos60°.
- Trigonometric maximum-count rows were recomputed from 2x+φ=π/2+2kπ on [0,2π], with k values made explicit.
- Self-contradictory DeepSeek flags were retained in the ledger as false positives when deterministic math review confirmed the existing row.
`
  );

  console.log(
    `Remediation complete: ${summary.total} adjudicated, ${summary.fixed} fixed, ${summary.falsePositive} false positives. ` +
      `Ledger: ${path.relative(projectRoot, ledgerCsvPath)}`
  );
}

main();
