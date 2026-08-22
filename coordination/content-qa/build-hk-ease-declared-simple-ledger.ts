import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const evidenceRoot = "coordination/content-qa/authoritative/hk-ease-701-independent-oracle";
const packPath = "data/generated-content/hk-ease-practice-bank-v2/question-pack.json";
const contractPath = "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json";
const outputPath = `${evidenceRoot}/declared-simple-ledger.json`;
const runtimeOutputPath =
  "data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json";
const builderPath = "coordination/content-qa/build-hk-ease-declared-simple-ledger.ts";

const expectedSha256ByPath = {
  [packPath]: "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2",
  [contractPath]: "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4",
  [`${evidenceRoot}/initial-independent-review.json`]:
    "09ea98dbcf6cb17a89cca692ee7760b0fcfb74dd898db316c48937d7b01ff8ea",
  [`${evidenceRoot}/semantic-shard-a.json`]:
    "fa53a9255c60e71111c8b8837c33cf9cc14b539964884566fd28c2269ee24b1d",
  [`${evidenceRoot}/semantic-shard-b.json`]:
    "d291f64b2676b719053c1042183de8155e3b07acace27e7cd6ccb1eda7da1c0f",
  [`${evidenceRoot}/semantic-shard-c.json`]:
    "5fe839673194828096a1e8ed0ce36bd683f5a9347c816be4b8ddc38ef37e8261"
} as const;

type CandidateQuestion = {
  id: string;
  type: "fill-in" | "multiple-choice" | "short-answer";
  promptEn: string;
  promptZh: string;
  optionsEn: string[];
  optionsZh: string[];
  answer: string;
  acceptedAnswers: string[];
};

type SemanticRow = {
  id: string;
  observedCanonicalAnswer?: string;
  independentExpectedAnswer?: string;
  checks: Record<string, unknown>;
  multipleChoiceAdjudication?: {
    correctOptionIndexZeroBased?: number;
    correctOptionEn?: string;
    correctOptionZh?: string;
  } | null;
};

function sha256(bytes: string | Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`HK EASE declared-simple ledger: ${message}`);
}

function readBoundJson<T>(relativePath: keyof typeof expectedSha256ByPath) {
  const bytes = readFileSync(join(root, relativePath));
  invariant(sha256(bytes) === expectedSha256ByPath[relativePath], `${relativePath} SHA-256 drifted`);
  return JSON.parse(bytes.toString("utf8")) as T;
}

function correctOptionIndex(row: SemanticRow) {
  const aReview = row.checks.multipleChoiceOptions as { uniqueCorrectIndexZeroBased?: unknown } | undefined;
  const value = row.multipleChoiceAdjudication?.correctOptionIndexZeroBased ??
    aReview?.uniqueCorrectIndexZeroBased;
  invariant(Number.isInteger(value), `${row.id} lacks an independently adjudicated correct option`);
  return value as number;
}

function textNegative(answer: string) {
  const normalized = answer.normalize("NFKC").trim().toLowerCase();
  if ([">", "greater than"].includes(normalized)) return "<";
  if (["<", "less than"].includes(normalized)) return ">";
  if (["=", "equal", "兩者相等", "一樣長"].includes(normalized)) return "Not equal";
  if (["true", "正確", "是", "yes"].includes(normalized)) return "False";
  if (["false", "否", "no"].includes(normalized)) return "True";
  if (normalized.includes("northeast") || normalized.includes("東北")) return "Southwest";
  if (normalized.includes("northwest") || normalized.includes("西北")) return "Southeast";
  if (normalized.includes("southeast") || normalized.includes("東南")) return "Northwest";
  if (normalized.includes("southwest") || normalized.includes("西南")) return "Northeast";
  if (normalized === "東 (east)" || normalized === "east") return "West";
  if (normalized.includes("prime") || normalized.includes("質數")) return "composite number";
  if (normalized.includes("multiple") || normalized.includes("倍數")) return "factor";
  if (normalized === "a") return "B";
  if (normalized === "juice") return "Mineral water";
  if (normalized === "rhombus") return "Rectangle";
  return null;
}

function unitlessMathematicalAnswer(answer: string) {
  const stripped = answer
    .normalize("NFKC")
    .replace(/\\(?:left|right|dfrac|tfrac|frac)/g, "")
    .replace(/[\\(){}\s,+\-*/.=<>]/g, "");
  return /\d/.test(stripped) && !/[a-zA-Z\u3400-\u9fff]/.test(stripped);
}

const objectCountDimensionIds = [
  "hk-ease-10633",
  "hk-ease-10640",
  "hk-ease-10654",
  "hk-ease-10393",
  "hk-ease-10398",
  "hk-ease-10416",
  "hk-ease-10417",
  "hk-ease-10426",
  "hk-ease-10428",
  "hk-ease-10438",
  "hk-ease-10455",
  "hk-ease-10477",
  "hk-ease-10480",
  "hk-ease-919"
] as const;

const fractionRepresentationPolicyById = new Map<string, {
  numerator: number;
  denominator: number;
  decimal: string;
  percent: string;
  wrong: string;
}>([
  ["hk-ease-10641", { numerator: 3, denominator: 8, decimal: ".375", percent: "37.5%", wrong: "4/8" }],
  ["hk-ease-10642", { numerator: 5, denominator: 8, decimal: ".625", percent: "62.5%", wrong: "4/8" }],
  ["hk-ease-10643", { numerator: 2, denominator: 5, decimal: ".4", percent: "40%", wrong: "3/5" }],
  ["hk-ease-10652", { numerator: 7, denominator: 10, decimal: ".7", percent: "70%", wrong: "6/10" }],
  ["hk-ease-10653", { numerator: 3, denominator: 10, decimal: ".3", percent: "30%", wrong: "4/10" }]
]);

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a;
}

function decimalAnswerAsReducedFraction(answer: string) {
  const match = answer.match(/^([+-]?)(\d+)\.(\d+)$/);
  if (!match) return null;
  const denominator = 10 ** match[3].length;
  const numerator = (Number(match[2]) * denominator + Number(match[3])) *
    (match[1] === "-" ? -1 : 1);
  const divisor = greatestCommonDivisor(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

function oppositeDirection(answer: string) {
  const normalized = answer.normalize("NFKC").toLowerCase();
  if (/northeast|東北/.test(normalized)) return "Southwest";
  if (/northwest|西北/.test(normalized)) return "Southeast";
  if (/southeast|東南/.test(normalized)) return "Northwest";
  if (/southwest|西南/.test(normalized)) return "Northeast";
  if (/east|東/.test(normalized)) return "West";
  if (/west|西/.test(normalized)) return "East";
  if (/north|北/.test(normalized)) return "South";
  if (/south|南/.test(normalized)) return "North";
  return null;
}

function simpleTaxonomyKind(question: CandidateQuestion) {
  const answer = question.answer.normalize("NFKC").trim();
  if (question.type === "multiple-choice") {
    if (/^[-+]?\d+(?:\.\d+)?$/.test(answer)) return "mc-scalar";
    if (question.id === "hk-ease-10422") return "mc-equation";
    if (question.id === "hk-ease-1078") return "mc-number-pair";
    return "mc-text-or-classification";
  }
  if (question.type === "short-answer") return "structured-response";
  if (unitlessMathematicalAnswer(answer)) {
    if (/[<>]/.test(answer)) return "unitless-ordered-chain";
    if (
      (/\\frac/.test(answer) && /(?:^|\D)\d+\s*\\frac|\\\(\d+\\frac/.test(answer)) ||
      /^\d+\s+\d+\/\d+$/.test(answer)
    ) return "unitless-mixed-number";
    if (/\\frac|^[-+]?\d+\/\d+$/.test(answer)) return "unitless-fraction";
    if (/^[-+]?\d+$/.test(answer)) return "unitless-integer";
    if (/^[-+]?\d*\.\d+$/.test(answer)) return "unitless-decimal";
  }
  if (/^[<>=]$/.test(answer)) return "text-relation-symbol";
  if (["hk-ease-10569", "hk-ease-10578", "hk-ease-10604"].includes(question.id)) {
    return "text-qualitative-equality";
  }
  if (/^(?:true|false|yes|no|是|否|正確)$/i.test(answer)) return "text-boolean";
  if (/(?:north|south|east|west|東|南|西|北)/i.test(answer)) return "text-direction";
  return "text-label";
}

function normalizeReviewedSurface(value: string) {
  return value
    .normalize("NFC")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[。.]$/g, "")
    .trim();
}

const questionPack = readBoundJson<{ questions: CandidateQuestion[] }>(packPath);
const responseContracts = readBoundJson<{ entries: Array<{ baseId: string }> }>(contractPath);
const initialReview = readBoundJson<{
  questions: Array<{ id: string; independentAnswer: string }>;
}>(`${evidenceRoot}/initial-independent-review.json`);
const shards = (["a", "b", "c"] as const).flatMap((name) =>
  readBoundJson<{ rows: SemanticRow[] }>(`${evidenceRoot}/semantic-shard-${name}.json`).rows
);
const strictIds = new Set(responseContracts.entries.map((entry) => entry.baseId));
const initialById = new Map(initialReview.questions.map((row) => [row.id, row]));
const semanticById = new Map(shards.map((row) => [row.id, row]));

const entries = questionPack.questions
  .filter((question) => !strictIds.has(question.id))
  .map((question) => {
    const initial = initialById.get(question.id);
    const semantic = semanticById.get(question.id);
    invariant(initial && semantic, `${question.id} lacks independent evidence`);
    const independentlyReviewedAnswer = semantic.observedCanonicalAnswer ?? semantic.independentExpectedAnswer;
    invariant(independentlyReviewedAnswer === question.answer, `${question.id} canonical answer drifted`);

    let typedNegativeResponse: string;
    let typedNegativeKind: string;
    let independentlyWrongBasis: string;

    if (question.id === "hk-ease-10393") {
      typedNegativeResponse = "1680 cm";
      typedNegativeKind = "unit-on-unitless-object-count";
      independentlyWrongBasis =
        "The independently reviewed result is a count of apples; centimetres are a length dimension and cannot label that count.";
    } else if (question.type === "multiple-choice") {
      const correctIndex = correctOptionIndex(semantic);
      const wrongIndex = question.optionsEn.findIndex((option, index) =>
        index !== correctIndex &&
        !question.acceptedAnswers.includes(option)
      );
      invariant(wrongIndex >= 0, `${question.id} has no independently wrong rejected MC option`);
      typedNegativeResponse = question.optionsEn[wrongIndex];
      typedNegativeKind = "independently-adjudicated-wrong-option";
      independentlyWrongBasis =
        `${question.id}: independent bilingual option review uniquely identifies option ${correctIndex + 1}; ` +
        `this probe selects distinct option ${wrongIndex + 1}.`;
    } else if (question.id === "hk-ease-182") {
      typedNegativeResponse = "1, 7, 13, 91; prime";
      typedNegativeKind = "wrong-prime-composite-classification";
      independentlyWrongBasis =
        "91 has factors 1, 7, 13, and 91, so retaining that list while calling 91 prime is contradictory.";
    } else if (question.id === "hk-ease-183") {
      typedNegativeResponse = "1, 103; composite";
      typedNegativeKind = "wrong-prime-composite-classification";
      independentlyWrongBasis =
        "103 has exactly the factors 1 and 103, so retaining that list while calling 103 composite is contradictory.";
    } else {
      const semanticOpposite = textNegative(question.answer);
      typedNegativeResponse = semanticOpposite ??
        (question.answer.trim() === "0" ? "1" : "0");
      typedNegativeKind = semanticOpposite
        ? "wrong-relation-classification-or-direction"
        : /[;,<>]|\\frac|\d+\s+\d+\/\d+/.test(question.answer)
          ? "wrong-value-or-missing-required-structure"
          : "wrong-value";
      independentlyWrongBasis = semanticOpposite
        ? `${question.id}: the probe states the opposite relation, classification, or direction from the independently reviewed answer ${JSON.stringify(question.answer)}.`
        : `${question.id}: the probe value ${JSON.stringify(typedNegativeResponse)} differs from the independently reviewed unambiguous result ${JSON.stringify(question.answer)}.`;
    }

    const forbidden = new Set([
      initial.independentAnswer,
      independentlyReviewedAnswer,
      ...question.acceptedAnswers
    ]);
    if (question.type === "multiple-choice") {
      const correctIndex = correctOptionIndex(semantic);
      forbidden.add(question.optionsEn[correctIndex] ?? "");
      forbidden.add(question.optionsZh[correctIndex] ?? "");
    }
    invariant(!forbidden.has(typedNegativeResponse), `${question.id} negative is independently reviewed as correct`);
    invariant(
      !/^_*incorrect_*$/i.test(typedNegativeResponse.trim()),
      `${question.id} uses a generic sentinel instead of a mathematical or structural negative`
    );
    const adversarialProbes = [{
      input: typedNegativeResponse,
      kind: typedNegativeKind,
      independentlyWrongBasis
    }];
    if (question.type === "multiple-choice") {
      const correctIndex = correctOptionIndex(semantic);
      const correctOptionEn = question.optionsEn[correctIndex];
      const correctOptionZh = question.optionsZh[correctIndex];
      for (const [locale, options] of [["en", question.optionsEn], ["zh", question.optionsZh]] as const) {
        for (const [optionIndex, option] of options.entries()) {
          if (
            optionIndex === correctIndex ||
            question.acceptedAnswers.includes(option) ||
            adversarialProbes.some((probe) => probe.input === option)
          ) continue;
          adversarialProbes.push({
            input: option,
            kind: `independently-adjudicated-wrong-option-${locale}`,
            independentlyWrongBasis:
              `${question.id}: independent bilingual option review uniquely identifies option ${correctIndex + 1}; ` +
              `this probe selects distinct option ${optionIndex + 1}.`
          });
        }
      }
      if (/^[-+]?\d+(?:\.\d+)?$/.test(question.answer.normalize("NFKC").trim())) {
        for (const unit of ["cm", "kg"]) {
          adversarialProbes.push({
            input: `${question.answer} ${unit}`,
            kind: "numeric-choice-same-value-wrong-unit-or-dimension",
            independentlyWrongBasis:
              `${question.id}: the selected choice is an exact scalar option surface; appending ${unit} creates a different, dimensioned response that is not any reviewed option.`
          });
        }
      }
      adversarialProbes.push(
        {
          input: `The answer is ${correctOptionEn}`,
          kind: "multiple-choice-free-text-wrapper-bypass",
          independentlyWrongBasis:
            `${question.id}: the response must identify one reviewed option surface or approved index alias; a free-text sentence containing the correct option is not a choice identity.`
        },
        {
          input: `答案是 ${correctOptionZh}`,
          kind: "multiple-choice-free-text-wrapper-bypass-zh",
          independentlyWrongBasis:
            `${question.id}: the response must identify one reviewed localized option surface or approved index alias; a free-text sentence is not a choice identity.`
        }
      );
      if (question.id === "hk-ease-10422") {
        adversarialProbes.push(
          {
            input: "672",
            kind: "equation-choice-collapsed-to-rhs",
            independentlyWrongBasis:
              "The question asks which complete equation follows from the given division; the right-hand-side value 672 alone is not an equation."
          },
          {
            input: "32×21",
            kind: "equation-choice-missing-equality-and-result",
            independentlyWrongBasis:
              "The product expression omits the required equality and result, so it is not the reviewed complete equation 32×21=672."
          },
          {
            input: "31×21=672",
            kind: "equation-choice-altered-left-hand-side",
            independentlyWrongBasis:
              "The left-hand side 31×21 does not equal 672 and is not the reviewed equation implied by 672÷21=32."
          },
          {
            input: "672=32×21",
            kind: "equation-choice-reversed-unlisted-choice",
            independentlyWrongBasis:
              "Although equality is symmetric, this response is not any offered equation choice; the question requires identifying the reviewed option identity."
          },
          {
            input: "32×21≠672",
            kind: "equation-choice-false-relation",
            independentlyWrongBasis:
              "The not-equal relation is false because 32×21=672."
          }
        );
      }
    } else if (question.id === "hk-ease-182") {
      adversarialProbes.push({
        input: "1, 7, 13; composite",
        kind: "incomplete-factor-list",
        independentlyWrongBasis: "The complete positive factor list of 91 must also include 91."
      });
    } else if (question.id === "hk-ease-183") {
      adversarialProbes.push({
        input: "103; prime",
        kind: "incomplete-factor-list",
        independentlyWrongBasis: "The complete positive factor list of 103 must include both 1 and 103."
      });
    } else if (unitlessMathematicalAnswer(question.answer)) {
      const unitlessTaxonomy = simpleTaxonomyKind(question);
      if (unitlessTaxonomy !== "unitless-ordered-chain") {
        const dimensionedResponses = [
          `${question.answer} cm`,
          `${question.answer} kg`,
          `${question.answer} cm²`,
          `${question.answer} cm³`,
          `${question.answer} mL`,
          `${question.answer} km/h`,
          `${question.answer}%`,
          `${question.answer}°`,
          `HK$${question.answer}`,
          `${question.answer} ${objectCountDimensionIds.includes(question.id as never) ? "cars" : "apples"}`
        ];
        for (const response of dimensionedResponses) {
          adversarialProbes.push({
            input: response,
            kind: objectCountDimensionIds.includes(question.id as never)
              ? "object-count-wrong-entity-unit-or-dimension"
              : "same-value-wrong-unit-dimension-currency-percent-angle-or-entity",
            independentlyWrongBasis:
              objectCountDimensionIds.includes(question.id as never)
                ? `${question.id}: this is an object-count task; only the reviewed bare count or its exact English/Chinese entity labels are valid, and ${JSON.stringify(response)} changes the entity or dimension.`
                : `${question.id}: the independently reviewed answer is dimensionless for this task; ${JSON.stringify(response)} adds an unrequested unit, dimension, currency, percent, angle, or entity.`
          });
        }
      }
      const fractionPolicy = fractionRepresentationPolicyById.get(question.id);
      if (fractionPolicy) {
        for (const [input, kind, basis] of [
          [fractionPolicy.decimal, "decimal-instead-of-requested-fraction", "an equivalent decimal"],
          [fractionPolicy.percent, "percent-instead-of-requested-fraction", "an equivalent percentage"],
          [String(fractionPolicy.numerator), "bare-scalar-instead-of-requested-fraction", "a bare numerator"],
          [`${fractionPolicy.numerator}/0`, "zero-denominator-fraction", "an undefined zero-denominator fraction"],
          [fractionPolicy.wrong, "wrong-value-fraction", "a fraction with the wrong value"]
        ] as const) {
          adversarialProbes.push({
            input,
            kind,
            independentlyWrongBasis:
              `${question.id}: the prompt asks for the mathematically correct fraction; ${basis} does not satisfy both its value and required fractional representation.`
          });
        }
      }
      if (unitlessTaxonomy === "unitless-decimal") {
        const fraction = decimalAnswerAsReducedFraction(question.answer);
        if (fraction && !question.acceptedAnswers.some(
          (accepted) => normalizeReviewedSurface(accepted) === normalizeReviewedSurface(fraction)
        )) {
          adversarialProbes.push({
            input: fraction,
            kind: "fraction-instead-of-required-decimal",
            independentlyWrongBasis:
              `${question.id}: this task's reviewed response representation is decimal; the equivalent fraction ${fraction} is not a reviewed response form.`
          });
        }
      }
      if (unitlessTaxonomy === "unitless-ordered-chain") {
        const symbol = question.answer.includes(">") ? ">" : "<";
        const values = question.answer.split(symbol).map((value) => value.trim());
        invariant(values.length === 3, `${question.id} ordered-chain cardinality drifted`);
        for (const [input, kind, basis] of [
          [`${values[0]} ${symbol} ${values[1]}`, "ordered-chain-missing-value", "one required value is missing"],
          [[...values].reverse().join(` ${symbol} `), "ordered-chain-reversed-values", "the values are reversed under the original comparison symbols"],
          [`${values[0]} ${symbol} ${values[1]} ${symbol} ${values[1]}`, "ordered-chain-duplicate-value", "one value is duplicated and another omitted"],
          [question.answer.replaceAll(symbol, symbol === ">" ? "<" : ">"), "ordered-chain-reversed-symbols", "the comparison symbols are reversed"],
          [`${question.answer} cm`, "ordered-chain-unrequested-unit", "a unit is appended to a dimensionless ordering"]
        ] as const) {
          adversarialProbes.push({
            input,
            kind,
            independentlyWrongBasis: `${question.id}: ${basis}; the response must preserve all exact values, order, and symbols.`
          });
        }
      }
    }

    const taxonomyKind = simpleTaxonomyKind(question);
    if (taxonomyKind === "text-relation-symbol") {
      for (const symbol of ["<", ">", "="].filter((symbol) => symbol !== question.answer)) {
        adversarialProbes.push({
          input: symbol,
          kind: "wrong-comparison-relation",
          independentlyWrongBasis:
            `${question.id}: independent comparison establishes ${question.answer}; ${symbol} states a contradictory relation.`
        });
      }
    } else if (taxonomyKind === "text-qualitative-equality") {
      adversarialProbes.push({
        input: "Not equal",
        kind: "qualitative-equality-contradiction",
        independentlyWrongBasis: `${question.id}: the independently compared quantities are equal; 'Not equal' contradicts that result.`
      });
    } else if (taxonomyKind === "text-boolean") {
      const positive = /^(?:true|yes|是|正確)$/i.test(question.answer);
      adversarialProbes.push(
        {
          input: positive ? "No" : "Yes",
          kind: "opposite-boolean-decision",
          independentlyWrongBasis: `${question.id}: this is the opposite of the independently reviewed boolean decision.`
        },
        {
          input: "Yes and No",
          kind: "contradictory-boolean-decision",
          independentlyWrongBasis: `${question.id}: a response asserting both decisions is internally contradictory.`
        }
      );
    } else if (taxonomyKind === "text-direction") {
      const opposite = oppositeDirection(question.answer);
      invariant(opposite, `${question.id} direction has no audited opposite`);
      adversarialProbes.push(
        {
          input: opposite,
          kind: "opposite-direction",
          independentlyWrongBasis: `${question.id}: ${opposite} is opposite the independently determined direction ${question.answer}.`
        },
        {
          input: `${question.answer} and ${opposite}`,
          kind: "contradictory-directions",
          independentlyWrongBasis: `${question.id}: one displacement cannot simultaneously have the reviewed direction and its opposite.`
        }
      );
    } else if (taxonomyKind === "text-label") {
      const wrongLabel = textNegative(question.answer) ?? "unrelated label";
      adversarialProbes.push(
        {
          input: wrongLabel,
          kind: "wrong-text-classification-or-label",
          independentlyWrongBasis: `${question.id}: ${JSON.stringify(wrongLabel)} is a distinct incorrect classification or label.`
        },
        {
          input: `${question.answer} and ${wrongLabel}`,
          kind: "contradictory-text-classifications",
          independentlyWrongBasis: `${question.id}: combining the reviewed label with the incompatible label is contradictory.`
        }
      );
    }

    const uniqueAdversarialProbes = [] as typeof adversarialProbes;
    const seenAdversarialProbeInputs = new Set<string>();
    for (const probe of adversarialProbes) {
      const normalizedInput = normalizeReviewedSurface(probe.input);
      if (seenAdversarialProbeInputs.has(normalizedInput)) continue;
      seenAdversarialProbeInputs.add(normalizedInput);
      uniqueAdversarialProbes.push(probe);
    }

    return {
      baseId: question.id,
      type: question.type,
      independentCalculationAnswer: initial.independentAnswer,
      independentlyReviewedAnswer,
      typedNegativeResponse,
      typedNegativeKind,
      independentlyWrongBasis,
      taxonomyKind,
      adversarialProbes: uniqueAdversarialProbes
    };
  });

const questionTypeCounts = Object.fromEntries(
  ["fill-in", "multiple-choice", "short-answer"].map((type) => [
    type,
    entries.filter((entry) => entry.type === type).length
  ])
);
invariant(entries.length === 357, "declared-simple row count drifted");
invariant(questionTypeCounts["fill-in"] === 275, "fill-in count drifted");
invariant(questionTypeCounts["multiple-choice"] === 80, "multiple-choice count drifted");
invariant(questionTypeCounts["short-answer"] === 2, "short-answer count drifted");

const output = {
  schemaVersion: "hk-ease-declared-simple-oracle-ledger-v1",
  classification: "declared-simple-generic-grading-boundary",
  strictQuestionCount: 344,
  declaredSimpleQuestionCount: 357,
  questionTypeCounts,
  negativeContract:
    "every row has a mathematical or structural negative, an independent wrongness basis, and a production-grader rejection; generic sentinels are forbidden",
  entries
};

const ledgerBytes = `${JSON.stringify(output, null, 2)}\n`;
const ledgerSha256 = sha256(ledgerBytes);
const questionById = new Map(questionPack.questions.map((question) => [question.id, question]));
const taxonomyIdsByKind = Object.fromEntries(
  [...new Set(entries.map((entry) => entry.taxonomyKind))].sort().map((kind) => [
    kind,
    entries.filter((entry) => entry.taxonomyKind === kind).map((entry) => entry.baseId)
  ])
);
const taxonomyCounts = Object.fromEntries(
  Object.entries(taxonomyIdsByKind).map(([kind, ids]) => [kind, ids.length])
);
const expectedTaxonomyCounts = {
  "unitless-integer": 157,
  "unitless-decimal": 57,
  "unitless-fraction": 14,
  "unitless-mixed-number": 4,
  "unitless-ordered-chain": 2,
  "text-relation-symbol": 16,
  "text-qualitative-equality": 3,
  "text-boolean": 9,
  "text-direction": 8,
  "text-label": 5,
  "mc-scalar": 39,
  "mc-text-or-classification": 39,
  "mc-equation": 1,
  "mc-number-pair": 1,
  "structured-response": 2
} as const;
invariant(
  Object.keys(taxonomyCounts).length === Object.keys(expectedTaxonomyCounts).length &&
    Object.entries(expectedTaxonomyCounts).every(([kind, count]) => taxonomyCounts[kind] === count),
  `exact taxonomy drifted: ${JSON.stringify(taxonomyCounts)}`
);
const multipleChoiceEntries = entries.filter((entry) => entry.type === "multiple-choice");
const multipleChoiceEvidence = multipleChoiceEntries.map((entry) => {
  const question = questionById.get(entry.baseId)!;
  const semantic = semanticById.get(entry.baseId)!;
  const correctIndex = correctOptionIndex(semantic);
  const letter = String.fromCharCode(65 + correctIndex);
  const acceptedLetterAliases = question.acceptedAnswers.filter(
    (surface) => surface.normalize("NFKC").trim().toUpperCase().replace(/[()]/g, "") === letter
  );
  const wrongLetters = question.acceptedAnswers.filter((surface) => {
    const normalized = surface.normalize("NFKC").trim().toUpperCase().replace(/[()]/g, "");
    return /^[A-D]$/.test(normalized) && normalized !== letter;
  });
  invariant(wrongLetters.length === 0, `${entry.baseId} has a colliding wrong-index letter alias`);
  return {
    baseId: entry.baseId,
    correctIndexZeroBased: correctIndex,
    correctOptionLanguageRelation:
      question.optionsEn[correctIndex] === question.optionsZh[correctIndex]
        ? "identical"
        : "language-different",
    correctIndexLetterAlias: acceptedLetterAliases.length ? letter : null
  };
});
invariant(
  multipleChoiceEvidence.filter((entry) => entry.correctOptionLanguageRelation === "language-different").length === 38 &&
    multipleChoiceEvidence.filter((entry) => entry.correctOptionLanguageRelation === "identical").length === 42 &&
    multipleChoiceEvidence.filter((entry) => entry.correctIndexLetterAlias).length === 53 &&
    multipleChoiceEvidence.filter((entry) => !entry.correctIndexLetterAlias).length === 27,
  "multiple-choice bilingual option or letter-alias taxonomy drifted"
);
const adversarialProbeCount = entries.reduce(
  (count, entry) => count + entry.adversarialProbes.length,
  0
);
const normalizedUniqueAdversarialProbeCount = new Set(entries.flatMap((entry) =>
  entry.adversarialProbes.map((probe) => `${entry.baseId}\0${normalizeReviewedSurface(probe.input)}`)
)).size;
const simpleRuntimeManifest = {
  schemaVersion: "hk-ease-reviewed-simple-response-contracts-v1",
  builderPath,
  questionPackPath: packPath,
  strictResponseManifestPath: contractPath,
  declaredSimpleLedgerPath: outputPath,
  sourceEvidenceSha256ByPath: expectedSha256ByPath,
  candidateSha256: expectedSha256ByPath[packPath],
  declaredSimpleLedgerSha256: ledgerSha256,
  strictQuestionCount: 344,
  reviewedSimpleQuestionCount: 357,
  reviewedSurfaceCount: 776,
  adversarialProbeCount,
  normalizedUniqueAdversarialProbeCount,
  fractionPolicyPositiveProbeCount: 15,
  normalizedUniqueReviewedSurfaceCount: 744,
  questionTypeCounts,
  policyCounts: {
    "reviewed-choice-surfaces": 80,
    "reviewed-structured-surfaces": 2,
    "reviewed-unitless-math-surfaces": 234,
    "reviewed-text-surfaces": 41
  },
  taxonomy: {
    counts: taxonomyCounts,
    idsByKind: taxonomyIdsByKind,
    objectCountDimensionIds: [...objectCountDimensionIds],
    fractionDecimalRejectIds: [...fractionRepresentationPolicyById.keys()],
    fractionRepresentationPolicy: {
      ids: [...fractionRepresentationPolicyById.keys()],
      reductionPolicy: "equivalent-fractions-accepted-reduction-not-required",
      decimalPercentBareScalarZeroDenominatorWrongValueRejected: true
    },
    algebraEquationChoiceIds: ["hk-ease-10422"],
    bilingualTextEvidence: {
      languageBearingCount: 25,
      neutralSymbolCount: 16
    },
    multipleChoiceEvidence: {
      languageDifferentCorrectOptionCount: multipleChoiceEvidence.filter(
        (entry) => entry.correctOptionLanguageRelation === "language-different"
      ).length,
      identicalCorrectOptionCount: multipleChoiceEvidence.filter(
        (entry) => entry.correctOptionLanguageRelation === "identical"
      ).length,
      correctIndexLetterAliasCount: multipleChoiceEvidence.filter(
        (entry) => entry.correctIndexLetterAlias
      ).length,
      noCorrectIndexLetterAliasCount: multipleChoiceEvidence.filter(
        (entry) => !entry.correctIndexLetterAlias
      ).length,
      wrongIndexAliasCollisionCount: 0,
      rows: multipleChoiceEvidence
    }
  },
  matchingPolicy:
    "exact reviewed surfaces after NFC, NFKC, case, whitespace, and terminal-punctuation normalization; only the exact five fraction-required IDs additionally accept mathematically equivalent fractional representations; no generic numeric unit stripping",
  entries: entries.map((entry) => {
    const question = questionById.get(entry.baseId)!;
    const semantic = semanticById.get(entry.baseId)!;
    const reviewedSurfaces = [...question.acceptedAnswers];
    if (question.type === "multiple-choice") {
      const correctIndex = correctOptionIndex(semantic);
      for (const surface of [question.optionsEn[correctIndex], question.optionsZh[correctIndex]]) {
        if (surface && !reviewedSurfaces.includes(surface)) reviewedSurfaces.push(surface);
      }
    }
    return {
      baseId: entry.baseId,
      questionType: entry.type,
      taxonomyKind: entry.taxonomyKind,
      policy: entry.type === "multiple-choice"
        ? "reviewed-choice-surfaces"
        : entry.type === "short-answer"
          ? "reviewed-structured-surfaces"
          : unitlessMathematicalAnswer(question.answer)
            ? "reviewed-unitless-math-surfaces"
            : "reviewed-text-surfaces",
      reviewedSurfaces,
      reviewedSurfacesSha256: sha256(JSON.stringify(reviewedSurfaces)),
      fractionRepresentationPolicy: fractionRepresentationPolicyById.has(entry.baseId)
        ? {
          numerator: fractionRepresentationPolicyById.get(entry.baseId)!.numerator,
          denominator: fractionRepresentationPolicyById.get(entry.baseId)!.denominator,
          reductionPolicy: "equivalent-fractions-accepted-reduction-not-required" as const,
          positiveProbes: [
            `${fractionRepresentationPolicyById.get(entry.baseId)!.numerator}/${fractionRepresentationPolicyById.get(entry.baseId)!.denominator}`,
            `\\frac{${fractionRepresentationPolicyById.get(entry.baseId)!.numerator}}{${fractionRepresentationPolicyById.get(entry.baseId)!.denominator}}`,
            `${fractionRepresentationPolicyById.get(entry.baseId)!.numerator * 2}/${fractionRepresentationPolicyById.get(entry.baseId)!.denominator * 2}`
          ]
        }
        : null,
      adversarialProbes: entry.adversarialProbes,
      adversarialProbesSha256: sha256(JSON.stringify(entry.adversarialProbes))
    };
  })
};

invariant(
  simpleRuntimeManifest.entries.reduce((count, entry) => count + entry.reviewedSurfaces.length, 0) === 776,
  "reviewed surface count drifted"
);
invariant(
  new Set(simpleRuntimeManifest.entries.flatMap((entry) =>
    entry.reviewedSurfaces.map((surface) => `${entry.baseId}\0${normalizeReviewedSurface(surface)}`)
  )).size === 744,
  "normalized unique reviewed surface count drifted"
);
invariant(
  normalizedUniqueAdversarialProbeCount === adversarialProbeCount,
  "normalized adversarial probes must be unique per question"
);
invariant(
  simpleRuntimeManifest.entries.filter((entry) => entry.fractionRepresentationPolicy).length === 5 &&
    simpleRuntimeManifest.entries.reduce(
      (count, entry) => count + (entry.fractionRepresentationPolicy?.positiveProbes.length ?? 0),
      0
    ) === 15,
  "fraction-representation policy scope or positive probes drifted"
);

writeFileSync(join(root, outputPath), ledgerBytes, "utf8");
writeFileSync(
  join(root, runtimeOutputPath),
  `${JSON.stringify(simpleRuntimeManifest, null, 2)}\n`,
  "utf8"
);

process.stdout.write(`${ledgerSha256}  ${outputPath}\n`);
process.stdout.write(
  `${sha256(`${JSON.stringify(simpleRuntimeManifest, null, 2)}\n`)}  ${runtimeOutputPath} (776 raw/744 normalized-unique reviewed surfaces; 15 fraction-policy positives; ${adversarialProbeCount} unique adversarial probes)\n`
);
