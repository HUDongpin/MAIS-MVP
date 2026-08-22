import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QUESTIONS_JSONL = path.join(__dirname, "questions.jsonl");
const QUESTIONS_CSV = path.join(__dirname, "questions.csv");
const FAILING_ROWS_CSV = path.join(__dirname, "quality-failing-rows.csv");
const LEDGER_JSON = path.join(__dirname, "p0-remediation-ledger.json");
const LEDGER_CSV = path.join(__dirname, "p0-remediation-ledger.csv");
const LEDGER_MD = path.join(__dirname, "p0-remediation-ledger.md");

const questionColumns = [
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

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(current);
      current = "";
    } else if (char === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else if (char !== "\r") {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers) return [];
  return dataRows
    .filter((dataRow) => dataRow.length === headers.length)
    .map((dataRow) => Object.fromEntries(headers.map((header, index) => [header, dataRow[index]])));
}

function readFailingRows() {
  if (!fs.existsSync(FAILING_ROWS_CSV)) return new Map();
  const text = fs.readFileSync(FAILING_ROWS_CSV, "utf8").trim();
  if (!text) return new Map();
  return new Map(parseCsv(text).map((row) => [row.questionId, row]));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function fix(fields) {
  return {
    ...fields,
    acceptedAnswers: unique([fields.answer, ...(fields.acceptedAnswers ?? [])])
  };
}

const remediations = new Map(Object.entries({
  "hjb-high-ds-v2-s4-004": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer-and-mc-options",
    promptZhHans: "已知 p：|x - 2| < 1，q：x < a。若 p 是 q 的充分不必要条件，则实数 a 的取值范围是（　）",
    optionsZhHans: ["a ≥ 3", "a > 3", "a ≤ 1", "a < 1"],
    answer: "a ≥ 3",
    acceptedAnswers: ["a>=3"],
    explanationZhHans: "p 表示 1<x<3。要使 p⇒q，需 (1,3)⊆(-∞,a)，所以 a≥3；当 a≥3 时，q 中仍有不属于 p 的数，故 q 不能推出 p。",
    manualIndependentAnswer: "a ≥ 3",
    manualNotes: "Corrected the endpoint. Since q is x<a, a=3 still makes every x in (1,3) satisfy q."
  }),
  "hjb-high-ds-v2-s4-009": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "add-distinctness-and-correct-answer",
    promptZhHans: "已知 a、b、1 两两不同，集合 A = {1, a, b}，B = {a, a², ab}，且 A = B，求 a²⁰²³ + b²⁰²⁴ 的值。",
    optionsZhHans: [],
    answer: "-1",
    acceptedAnswers: [],
    explanationZhHans: "集合相等意味着{1,b}={a²,ab}。若ab=1，则a²=b，进而a³=1；由于a是实数，得a=1，与两两不同矛盾。因此a²=1，且a≠1，所以a=-1。此时B={-1,1,-b}，A={1,-1,b}；集合相等给出b=0。因此(-1)^{2023}+0^{2024}=-1。",
    manualIndependentAnswer: "-1",
    manualNotes: "Added distinctness, handled the excluded ab=1 branch explicitly, and corrected the stored answer."
  }),
  "hjb-high-ds-v2-s4-026": fix({
    issueCode: "manual-ambiguous-empty-set",
    remediationStrategy: "state-nonempty-interval-condition",
    promptZhHans: "已知集合 A = { x | -2 ≤ x ≤ 5 }，B = { x | m ≤ x ≤ 2m + 1 }，且 B 为非空区间。若 B ⊆ A，求实数 m 的取值范围。",
    optionsZhHans: [],
    answer: "-1 ≤ m ≤ 2",
    acceptedAnswers: ["-1<=m<=2"],
    explanationZhHans: "B 非空需 m≤2m+1，即 m≥-1。又 B⊆A 需 m≥-2 且 2m+1≤5，即 m≤2。综合得 -1≤m≤2。",
    manualIndependentAnswer: "-1 ≤ m ≤ 2",
    manualNotes: "Added the nonempty interval condition so the answer no longer depends on an unstated convention."
  }),
  "hjb-high-ds-v2-s4-035": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "已知集合 A = {1, 2, 3, 4, 5}，B = {3, 4, 5, 6, 7}。则 (A ∩ B) ∪ (∁_U (A ∪ B)) 中元素的个数为 ______。（其中 U = A ∪ B）",
    optionsZhHans: [],
    answer: "3",
    acceptedAnswers: [],
    explanationZhHans: "因为 U=A∪B，所以 ∁_U(A∪B)=∅；又 A∩B={3,4,5}。并集仍为 {3,4,5}，元素个数为 3。",
    manualIndependentAnswer: "3",
    manualNotes: "Corrected the count under the stated universe U=A∪B."
  }),
  "hjb-high-ds-v2-s4-036": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "设 p：|x - 2| < 1，q：x² - 5x + 6 < 0。判断 p 是 q 的什么条件（充分不必要、必要不充分、充要、既不充分也不必要），并说明理由。",
    optionsZhHans: [],
    answer: "必要不充分条件",
    acceptedAnswers: ["必要不充分"],
    explanationZhHans: "p 的解集为 (1,3)，q 的解集为 (2,3)。q⇒p，但 p 不能推出 q，例如 x=1.5 满足 p 不满足 q，所以 p 是 q 的必要不充分条件。",
    manualIndependentAnswer: "必要不充分条件",
    manualNotes: "Corrected the implication direction."
  }),
  "hjb-high-ds-v2-s4-037": fix({
    issueCode: "missing-visual-reference",
    remediationStrategy: "remove-missing-visual-wording",
    promptZhHans: "已知全集 U = R，集合 A = {x | x² - 3x ≤ 0}，B = {x | x > 1}。求集合 A ∩ (∁_U B)（　）",
    optionsZhHans: ["{x | 0 ≤ x ≤ 1}", "{x | 1 < x ≤ 3}", "{x | x ≤ 0}", "{x | x > 3}"],
    answer: "{x | 0 ≤ x ≤ 1}",
    acceptedAnswers: ["{x|0≤x≤1}", "{x | 0 <= x <= 1}"],
    explanationZhHans: "A={x|0≤x≤3}，∁_U B={x|x≤1}，两者交集为 {x|0≤x≤1}。",
    manualIndependentAnswer: "{x | 0 ≤ x ≤ 1}",
    manualNotes: "Removed the unsupported shaded-region reference and made the requested set operation explicit."
  }),
  "hjb-high-ds-v2-s4-040": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer-and-mc-options",
    promptZhHans: "已知集合 A = {x | x² - (a+1)x + a ≤ 0}，B = {x | x² - 5x + 4 ≤ 0}。若“x ∈ A”是“x ∈ B”的充分不必要条件，则实数 a 的取值范围是（　）",
    optionsZhHans: ["1 ≤ a < 4", "1 ≤ a ≤ 4", "a < 1 或 a > 4", "a = 4"],
    answer: "1 ≤ a < 4",
    acceptedAnswers: ["1<=a<4"],
    explanationZhHans: "B=[1,4]。A 的端点为 1 和 a，要使 A 是 B 的真子集，需 a 在 [1,4] 内且不能使 A=B，因此 1≤a<4。",
    manualIndependentAnswer: "1 ≤ a < 4",
    manualNotes: "Excluded a=4 because that makes A and B equal rather than sufficient-not-necessary."
  }),
  "hjb-high-ds-v2-s4-052": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer-and-mc-options",
    promptZhHans: "若关于 x 的不等式 ax² + bx + c > 0 的解集为 (1, 2)，则关于 x 的不等式 cx² + bx + a < 0 的解集为（　）。",
    optionsZhHans: ["(-∞, 1/2) ∪ (1, +∞)", "(1/2, 1)", "(-∞, 1) ∪ (2, +∞)", "(1, 2)"],
    answer: "(-∞, 1/2) ∪ (1, +∞)",
    acceptedAnswers: ["(-∞,1/2)∪(1,+∞)", "x < 1/2 或 x > 1"],
    explanationZhHans: "由原解集知 a<0，且根为 1、2，所以 b=-3a，c=2a。代入得 a(2x²-3x+1)<0，因 a<0，故 (2x-1)(x-1)>0。",
    manualIndependentAnswer: "(-∞, 1/2) ∪ (1, +∞)",
    manualNotes: "Corrected the inequality reversal after dividing by the negative leading coefficient."
  }),
  "hjb-high-ds-v2-s4-068": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "若不等式 ax² + bx + 2 > 0 的解集为 (-1, 2)，则 a + b 的值为______。",
    optionsZhHans: [],
    answer: "0",
    acceptedAnswers: [],
    explanationZhHans: "由解集 (-1,2) 知 a<0 且两根为 -1、2。设 ax²+bx+2=a(x+1)(x-2)，常数项 -2a=2，得 a=-1，b=1，故 a+b=0。",
    manualIndependentAnswer: "0",
    manualNotes: "Corrected coefficient comparison from the two roots and constant term."
  }),
  "hjb-high-ds-v2-s4-080": fix({
    issueCode: "manual-unsolvable",
    remediationStrategy: "rewrite-unsolvable-prompt",
    promptZhHans: "已知关于 x 的不等式 x² - 2ax + a² - 1 ≤ 0 的解集为 [1, 3]，求实数 a 的值。",
    optionsZhHans: [],
    answer: "2",
    acceptedAnswers: [],
    explanationZhHans: "原不等式可化为 (x-a)²≤1，解集为 [a-1,a+1]。与 [1,3] 对应，得 a-1=1，a+1=3，所以 a=2。",
    manualIndependentAnswer: "2",
    manualNotes: "Rewrote the impossible interval-length condition into a unique endpoint-matching problem."
  }),
  "hjb-high-ds-v2-s4-081": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "已知关于 x 的不等式组：\n(1) x² - 5x + 6 ≤ 0\n(2) |x - 2| > 1\n求同时满足 (1) 和 (2) 的 x 的取值范围。",
    optionsZhHans: [],
    answer: "∅",
    acceptedAnswers: ["空集"],
    explanationZhHans: "(1) 的解集为 [2,3]；(2) 的解集为 (-∞,1)∪(3,+∞)。两者没有公共元素，因此解集为空集。",
    manualIndependentAnswer: "∅",
    manualNotes: "Corrected the intersection of the closed interval with the strict absolute-value solution."
  }),
  "hjb-high-ds-v2-s4-084": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "已知函数 f(x)=x²+ax+b（a,b∈R），若对于任意 x∈[0,1]，都有 |f(x)|≤1，求 a+b 的最大值。",
    optionsZhHans: [],
    answer: "0",
    acceptedAnswers: [],
    explanationZhHans: "a+b=f(1)-1。由 |f(1)|≤1 得 f(1)≤1，所以 a+b≤0。当 a=0、b=0 时，f(x)=x² 在 [0,1] 上满足条件，故最大值为 0。",
    manualIndependentAnswer: "0",
    manualNotes: "Corrected the maximum using the endpoint constraint f(1)≤1 and an attaining example."
  }),
  "hjb-high-ds-v2-s4-086": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "若关于 x 的不等式 x² - (m+1)x + m ≤ 0 的解集中恰有 3 个整数，则实数 m 的取值范围是______。",
    optionsZhHans: [],
    answer: "(-2, -1] ∪ [3, 4)",
    acceptedAnswers: ["(-2,-1]∪[3,4)"],
    explanationZhHans: "不等式为 (x-1)(x-m)≤0，解集是 1 与 m 之间的闭区间。若 m<1，需整数为 -1,0,1，得 -2<m≤-1；若 m≥1，需整数为 1,2,3，得 3≤m<4。",
    manualIndependentAnswer: "(-2, -1] ∪ [3, 4)",
    manualNotes: "Corrected endpoint inclusions for exactly three integers."
  }),
  "hjb-high-ds-v2-s4-089": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "已知关于 x 的方程 x² + (k-2)x + 4 - k = 0 有两个不相等的正实数根，则实数 k 的取值范围是______。",
    optionsZhHans: [],
    answer: "k < -2√3",
    acceptedAnswers: ["k<-2√3", "k < -2sqrt(3)"],
    explanationZhHans: "两正根需和 2-k>0、积 4-k>0，且判别式 (k-2)²-4(4-k)=k²-12>0。综合 k<2 与 k²>12，得 k<-2√3。",
    manualIndependentAnswer: "k < -2√3",
    manualNotes: "Added the discriminant condition to the positive-root requirements."
  }),
  "hjb-high-ds-v2-s4-100": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer-and-mc-options",
    promptZhHans: "若不等式 ax² + bx + c > 0 的解集为 (-2, 3)，则不等式 cx² + bx + a < 0 的解集为（　）",
    optionsZhHans: ["(-1/2, 1/3)", "(-∞, -1/2) ∪ (1/3, +∞)", "(-2, 3)", "(-∞, -2) ∪ (3, +∞)"],
    answer: "(-1/2, 1/3)",
    acceptedAnswers: [],
    explanationZhHans: "由原解集知 a<0，根为 -2、3，故 b=-a，c=-6a。代入得 a(-6x²-x+1)<0，因 a<0，等价于 6x²+x-1<0，解为 (-1/2,1/3)。",
    manualIndependentAnswer: "(-1/2, 1/3)",
    manualNotes: "Corrected the final interval after handling the negative leading coefficient."
  }),
  "hjb-high-ds-v2-s4-101": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "计算：\\(\\log_2 6 - \\log_4 9 + \\log_3 \\frac{1}{27}\\)。",
    optionsZhHans: [],
    answer: "-2",
    acceptedAnswers: [],
    explanationZhHans: "因为 log₄9=log₂3，故 log₂6-log₄9=log₂6-log₂3=log₂2=1；又 log₃(1/27)=-3，所以原式等于 -2。",
    manualIndependentAnswer: "-2",
    manualNotes: "Corrected the logarithm simplification."
  }),
  "hjb-high-ds-v2-s4-102": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "已知 \\(a = \\log_2 3\\)，\\(b = \\log_3 7\\)，用 \\(a, b\\) 表示 \\(\\log_{42} 56\\)。",
    optionsZhHans: [],
    answer: "\\frac{3 + ab}{1 + a + ab}",
    acceptedAnswers: ["(3+ab)/(1+a+ab)", "\\frac{3+ab}{1+a+ab}"],
    explanationZhHans: "设 ln3=a ln2，ln7=b ln3=ab ln2。则 ln56=3ln2+ln7=(3+ab)ln2，ln42=ln2+ln3+ln7=(1+a+ab)ln2。",
    manualIndependentAnswer: "\\frac{3 + ab}{1 + a + ab}",
    manualNotes: "Corrected ln7 to ab ln2 in the numerator."
  }),
  "hjb-high-ds-v2-s4-104": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "若 \\(\\log_2 (\\log_3 x) = \\log_3 (\\log_4 y) = \\log_4 (\\log_2 z) = 0\\)，则 \\(x+y+z\\) 的值为______。",
    optionsZhHans: [],
    answer: "9",
    acceptedAnswers: [],
    explanationZhHans: "由 log₂(log₃x)=0 得 log₃x=1，所以 x=3；同理 log₄y=1 得 y=4，log₂z=1 得 z=2。因此 x+y+z=9。",
    manualIndependentAnswer: "9",
    manualNotes: "Corrected the values of x, y, and z from the nested logarithms."
  }),
  "hjb-high-ds-v2-s4-106": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer-and-mc-options",
    promptZhHans: "设 \\(a = \\log_{0.2} 0.3\\)，\\(b = \\log_2 0.3\\)，\\(c = \\log_{0.3} 2\\)，则 \\(a, b, c\\) 的大小关系是（　）。",
    optionsZhHans: ["b < c < a", "c < b < a", "a < c < b", "b < a < c"],
    answer: "b < c < a",
    acceptedAnswers: [],
    explanationZhHans: "a=ln0.3/ln0.2>0；b=ln0.3/ln2<0；c=ln2/ln0.3<0。比较可得 b≈-1.737，c≈-0.576，a≈0.749，故 b<c<a。",
    manualIndependentAnswer: "b < c < a",
    manualNotes: "Corrected the order of the two negative logarithms."
  }),
  "hjb-high-ds-v2-s4-124": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer-and-mc-options",
    promptZhHans: "设 a = log₀.₂0.3，b = log₂0.3，c = log₀.₂3，则 a, b, c 的大小关系是（　）",
    optionsZhHans: ["b < c < a", "b < a < c", "c < b < a", "a < b < c"],
    answer: "b < c < a",
    acceptedAnswers: [],
    explanationZhHans: "a=log₀.₂0.3≈0.749，b=log₂0.3≈-1.737，c=log₀.₂3≈-0.682，所以 b<c<a。",
    manualIndependentAnswer: "b < c < a",
    manualNotes: "Corrected the order by comparing approximate values."
  }),
  "hjb-high-ds-v2-s4-152": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "rewrite-to-unique-exponential-parameter",
    promptZhHans: "若指数函数 f(x)=a^x（a>0 且 a≠1）在区间 [0,2] 上的最大值与最小值之差为 3，则 a=______。",
    optionsZhHans: [],
    answer: "2",
    acceptedAnswers: [],
    explanationZhHans: "若 a>1，最大值与最小值之差为 a²-1=3，得 a=2；若 0<a<1，差为 1-a²<1，不可能等于 3。因此 a=2。",
    manualIndependentAnswer: "2",
    manualNotes: "Rewrote the parameter condition to give a unique high-school-friendly value."
  }),
  "hjb-high-ds-v2-s4-158": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "若函数 f(x)=a^x（a>0 且 a≠1）与 g(x)=log_a x 的图像有且仅有一个公共点，则 a 的取值范围是 ______。",
    optionsZhHans: [],
    answer: "(0, 1) ∪ {e^(1/e)}",
    acceptedAnswers: ["(0,1)∪{e^(1/e)}"],
    explanationZhHans: "当 0<a<1 时两图像有唯一公共点；当 a>1 时公共点对应 x=a^x，即 a=x^(1/x)。函数 x^(1/x) 的最大值为 e^(1/e)，仅在 a=e^(1/e) 时唯一。",
    manualIndependentAnswer: "(0, 1) ∪ {e^(1/e)}",
    manualNotes: "Corrected the a>1 boundary from an interval to the tangent case."
  }),
  "hjb-high-ds-v2-s4-162": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "已知函数 f(x)=a^x（a>0 且 a≠1）在区间 [1,2] 上的最大值与最小值之差为 6，求实数 a 的值。",
    optionsZhHans: [],
    answer: "3",
    acceptedAnswers: [],
    explanationZhHans: "若 a>1，则 a²-a=6，解得 a=3 或 a=-2，取 a=3；若 0<a<1，则 a-a² 最大不超过 1/4，不可能等于 6。故 a=3。",
    manualIndependentAnswer: "3",
    manualNotes: "Removed the invalid reciprocal answer for the decreasing case."
  }),
  "hjb-high-ds-v2-s4-186": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "设函数 f(x)=a^x（a>0，a≠1）与 g(x)=log_a x 的图像交于点 P，且点 P 的横坐标在区间 (2,3) 内，求实数 a 的取值范围。",
    optionsZhHans: [],
    answer: "√2 < a ≤ e^(1/e)",
    acceptedAnswers: ["sqrt(2)<a<=e^(1/e)", "√2<a≤e^(1/e)"],
    explanationZhHans: "交点在 y=x 上时有 a^x=x，即 a=x^(1/x)。当 x∈(2,3) 时，x^(1/x) 的取值为 (√2,e^(1/e)]，故 √2<a≤e^(1/e)。",
    manualIndependentAnswer: "√2 < a ≤ e^(1/e)",
    manualNotes: "Corrected the image of x^(1/x) on the requested interval."
  }),
  "hjb-high-ds-v2-s4-201": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "已知函数 f(x)=√(x² - 4x + 3) + 1/(x - 2)。求函数 f(x) 的定义域，并用区间表示。",
    optionsZhHans: [],
    answer: "(-∞, 1] ∪ [3, +∞)",
    acceptedAnswers: ["(-∞,1]∪[3,+∞)"],
    explanationZhHans: "需 x²-4x+3≥0 且 x≠2。由 (x-1)(x-3)≥0 得 x≤1 或 x≥3，此时已自动避开 x=2，所以定义域为 (-∞,1]∪[3,+∞)。",
    manualIndependentAnswer: "(-∞, 1] ∪ [3, +∞)",
    manualNotes: "Corrected the right branch to start at 3 from the square-root condition."
  }),
  "hjb-high-ds-v2-s4-207": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "已知函数 f(x)=2x+1，g(x)=x²-2。求方程 f(g(x))=g(f(x)) 的解集。",
    optionsZhHans: [],
    answer: "{-1}",
    acceptedAnswers: ["x=-1", "-1"],
    explanationZhHans: "f(g(x))=2(x²-2)+1=2x²-3，g(f(x))=(2x+1)²-2=4x²+4x-1。相等得 2x²+4x+2=0，即 (x+1)²=0。",
    manualIndependentAnswer: "{-1}",
    manualNotes: "Corrected the double-root solution set."
  }),
  "hjb-high-ds-v2-s4-209": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer",
    promptZhHans: "若函数 f(x) = { x² + 1, x ≤ 0; -x² + 2x + 1, x > 0 }，则方程 f(x)=2 的所有实数根之和为 ______。",
    optionsZhHans: [],
    answer: "0",
    acceptedAnswers: [],
    explanationZhHans: "当 x≤0 时，x²+1=2，得 x=-1；当 x>0 时，-x²+2x+1=2，得 (x-1)²=0，所以 x=1。根之和为 0。",
    manualIndependentAnswer: "0",
    manualNotes: "Corrected the sum of both piecewise roots."
  }),
  "hjb-high-ds-v2-s4-211": fix({
    issueCode: "manual-contradictory-conditions",
    remediationStrategy: "rewrite-contradictory-prompt",
    promptZhHans: "已知函数 f(x) 的定义域为 R，且 f(x+1) 为偶函数，f(x+4)=f(x)。若 f(0)=2，f(3)=-1，则 f(6)+f(7) 的值为（　）",
    optionsZhHans: ["1", "2", "-1", "3"],
    answer: "1",
    acceptedAnswers: [],
    explanationZhHans: "f(x+4)=f(x)，所以 f(6)=f(2)，f(7)=f(3)。又 f(x+1) 为偶函数，得 f(2)=f(0)=2，因此 f(6)+f(7)=2+(-1)=1。",
    manualIndependentAnswer: "1",
    manualNotes: "Replaced contradictory parity conditions with consistent symmetry and period conditions."
  }),
  "hjb-high-ds-v2-s4-223": fix({
    issueCode: "manual-contradictory-conditions",
    remediationStrategy: "rewrite-contradictory-prompt",
    promptZhHans: "已知函数 f(x) 的定义域为 R，且 f(x+1) 为偶函数，f(x+3)=f(x)。若 f(0)=1，则 f(5) 的值为（　）",
    optionsZhHans: ["1", "0", "-1", "2"],
    answer: "1",
    acceptedAnswers: [],
    explanationZhHans: "由 f(x+3)=f(x) 得 f(5)=f(2)。又 f(x+1) 为偶函数，说明 f(1+t)=f(1-t)，取 t=1 得 f(2)=f(0)=1。",
    manualIndependentAnswer: "1",
    manualNotes: "Replaced contradictory odd/even shifted conditions with consistent symmetry and period conditions."
  }),
  "hjb-high-ds-v2-s4-262": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer-and-mc-options",
    promptZhHans: "在三角形 ABC 中，角 A、B、C 的对边分别为 a、b、c。已知 a=7，b=8，且三角形有两解，则角 A 的取值范围是（　）。",
    optionsZhHans: ["0° < A < arcsin(7/8)", "0° < A < 30°", "arcsin(7/8) < A < 90°", "90° < A < 180°"],
    answer: "0° < A < arcsin(7/8)",
    acceptedAnswers: [],
    explanationZhHans: "SSA 情形有两解需 A 为锐角且 b sin A<a<b。这里 a=7，b=8，所以 sinA<7/8，故 0°<A<arcsin(7/8)。",
    manualIndependentAnswer: "0° < A < arcsin(7/8)",
    manualNotes: "Corrected the two-solution angle bound."
  }),
  "hjb-high-ds-v2-s4-265": fix({
    issueCode: "manual-contradictory-conditions",
    remediationStrategy: "rewrite-contradictory-prompt",
    promptZhHans: "已知函数 f(x)=2sin(ωx+φ)（ω>0，0<φ<π），且 f(0)=1，f(x) 在 x=π/6 处取得最大值。则 ω 和 φ 的值可能是（　）。",
    optionsZhHans: ["ω=2，φ=π/6", "ω=1，φ=π/6", "ω=2，φ=5π/6", "ω=3，φ=π/3"],
    answer: "ω=2，φ=π/6",
    acceptedAnswers: [],
    explanationZhHans: "由 f(0)=1 得 sinφ=1/2。若 φ=π/6，且 x=π/6 处取最大值，则 2·π/6+π/6=π/2，满足条件，所以该组可能成立。",
    manualIndependentAnswer: "ω=2，φ=π/6",
    manualNotes: "Replaced the impossible minimum/value combination with a consistent maximum condition."
  }),
  "hjb-high-ds-v2-s4-268": fix({
    issueCode: "manual-answer-mismatch",
    remediationStrategy: "correct-answer-and-mc-options",
    promptZhHans: "在 △ABC 中，角 A、B、C 的对边分别为 a、b、c，且满足 a cos B = b cos A。则 △ABC 的形状是（　）。",
    optionsZhHans: ["等腰三角形", "直角三角形", "等边三角形", "等腰三角形或直角三角形"],
    answer: "等腰三角形",
    acceptedAnswers: [],
    explanationZhHans: "由正弦定理，a cosB=b cosA 可化为 sinA cosB=sinB cosA，即 sin(A-B)=0。三角形内 A=B，所以 a=b，为等腰三角形。",
    manualIndependentAnswer: "等腰三角形",
    manualNotes: "Removed the invalid right-triangle branch from the answer."
  })
}));

function validateReplacement(id, original, replacement) {
  if (!original) throw new Error(`Missing original question for ${id}`);
  if (!replacement.promptZhHans?.trim()) throw new Error(`${id}: missing prompt`);
  if (!replacement.answer?.trim()) throw new Error(`${id}: missing answer`);
  if (!replacement.explanationZhHans?.trim()) throw new Error(`${id}: missing explanation`);

  if (original.type === "multiple-choice") {
    if (!Array.isArray(replacement.optionsZhHans) || replacement.optionsZhHans.length !== 4) {
      throw new Error(`${id}: multiple-choice row must have 4 options`);
    }
    if (new Set(replacement.optionsZhHans).size !== 4) throw new Error(`${id}: duplicate multiple-choice options`);
    if (!replacement.optionsZhHans.includes(replacement.answer)) throw new Error(`${id}: answer is not one of the options`);
  } else if (Array.isArray(replacement.optionsZhHans) && replacement.optionsZhHans.length > 0) {
    throw new Error(`${id}: non-multiple-choice row must not have options`);
  }

  const text = [
    replacement.promptZhHans,
    ...(replacement.optionsZhHans ?? []),
    replacement.answer,
    ...(replacement.acceptedAnswers ?? []),
    replacement.explanationZhHans
  ].join("\n");
  const blocked = /OCR|PDF|DOCX|截图|扫描|页码|第\s*\d+\s*页|教材原题|课本原题|试卷原题|原文|源文件|来源文件|改编自|摘自|如图|见图|上图|下图|右图|左图|图中|答案不唯一|题目有误|无法确定|缺少图|没有正确答案/i;
  if (blocked.test(text)) throw new Error(`${id}: blocked source/visual/contradiction wording detected`);
}

function main() {
  const questions = readJsonl(QUESTIONS_JSONL);
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const failingRows = readFailingRows();
  const missingRemediationIds = [...failingRows.keys()].filter((id) => !remediations.has(id));
  if (missingRemediationIds.length) {
    throw new Error(`Missing remediation entries for failing rows: ${missingRemediationIds.join(", ")}`);
  }

  const ledgerRows = [];
  const updatedQuestions = questions.map((question) => {
    const remediation = remediations.get(question.id);
    if (!remediation) return question;

    validateReplacement(question.id, question, remediation);
    const failingRow = failingRows.get(question.id);
    const nextQuestion = {
      ...question,
      promptZhHans: remediation.promptZhHans,
      optionsZhHans: question.type === "multiple-choice" ? remediation.optionsZhHans : [],
      answer: remediation.answer,
      acceptedAnswers: remediation.acceptedAnswers,
      explanationZhHans: remediation.explanationZhHans,
      sourceDistanceStatus: "passed-auto-source-scan",
      mathQaStatus: "remediated-pending-final-audit",
      terminologyQaStatus: "remediated-pending-final-audit",
      reviewNotes: `S18 P0 remediation 2026-05-24: ${remediation.remediationStrategy}. Original issue ${remediation.issueCode}; rerun solvability and quality audits before app integration.`
    };

    ledgerRows.push({
      questionId: question.id,
      grade: question.grade,
      chapter: question.chapter,
      type: question.type,
      difficulty: question.difficulty,
      issueCode: failingRow?.issueCodes || remediation.issueCode,
      remediationStrategy: remediation.remediationStrategy,
      oldPromptZhHans: question.promptZhHans,
      oldAnswer: question.answer,
      oldAcceptedAnswers: question.acceptedAnswers,
      oldExplanationZhHans: question.explanationZhHans,
      oldManualNotes: failingRow?.manualNotes ?? "",
      newPromptZhHans: nextQuestion.promptZhHans,
      newAnswer: nextQuestion.answer,
      newAcceptedAnswers: nextQuestion.acceptedAnswers,
      newExplanationZhHans: nextQuestion.explanationZhHans,
      manualDecision: "approve",
      manualIndependentAnswer: remediation.manualIndependentAnswer,
      manualNotes: remediation.manualNotes,
      manualRecommendedAction: "Approve remediated row for the V2 candidate release pool after aggregate QA gates pass."
    });
    return nextQuestion;
  });

  const missingQuestionIds = [...remediations.keys()].filter((id) => !questionById.has(id));
  if (missingQuestionIds.length) throw new Error(`Remediation IDs missing from questions.jsonl: ${missingQuestionIds.join(", ")}`);
  if (ledgerRows.length !== remediations.size) {
    throw new Error(`Remediated ${ledgerRows.length} rows; expected ${remediations.size}`);
  }

  const gradeCounts = Object.fromEntries(
    ["S4", "S5", "S6"].map((grade) => [grade, updatedQuestions.filter((question) => question.grade === grade).length])
  );
  if (updatedQuestions.length !== 1500 || gradeCounts.S4 !== 500 || gradeCounts.S5 !== 500 || gradeCounts.S6 !== 500) {
    throw new Error(`Unexpected counts after remediation: total=${updatedQuestions.length}, grades=${JSON.stringify(gradeCounts)}`);
  }

  writeJsonl(QUESTIONS_JSONL, updatedQuestions);
  writeCsv(QUESTIONS_CSV, updatedQuestions, questionColumns);
  fs.writeFileSync(
    LEDGER_JSON,
    `${JSON.stringify({
      reportDate: "2026-05-24",
      packageVersion: "V2",
      physicalSourceDirectory: path.basename(__dirname),
      totalRows: updatedQuestions.length,
      remediatedRows: ledgerRows.length,
      gradeCounts,
      rows: ledgerRows
    }, null, 2)}\n`
  );
  writeCsv(LEDGER_CSV, ledgerRows, [
    "questionId",
    "grade",
    "chapter",
    "type",
    "difficulty",
    "issueCode",
    "remediationStrategy",
    "oldPromptZhHans",
    "oldAnswer",
    "oldAcceptedAnswers",
    "oldExplanationZhHans",
    "oldManualNotes",
    "newPromptZhHans",
    "newAnswer",
    "newAcceptedAnswers",
    "newExplanationZhHans",
    "manualDecision",
    "manualIndependentAnswer",
    "manualNotes",
    "manualRecommendedAction"
  ]);
  fs.writeFileSync(
    LEDGER_MD,
    `# Mainland HJB High V2 P0 Remediation Ledger

- Date: 2026-05-24
- Session ID: S18
- Scope: \`${path.basename(__dirname)}\`
- Rows remediated: ${ledgerRows.length}
- Strategy: in-place rewrite/correction; no row deletion; IDs, grade, type, difficulty, and evidence metadata preserved.

| ID | Chapter | Type | Difficulty | Issue | Strategy | New answer |
| --- | --- | --- | --- | --- | --- | --- |
${ledgerRows.map((row) => `| ${row.questionId} | ${row.chapter} | ${row.type} | ${row.difficulty} | ${row.issueCode} | ${row.remediationStrategy} | ${String(row.newAnswer).replace(/\|/g, "\\|")} |`).join("\n")}
`
  );

  console.log(`Remediated ${ledgerRows.length} P0 rows; total rows=${updatedQuestions.length}; grades=${JSON.stringify(gradeCounts)}`);
}

main();
