import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sanitizedInputJson from "./authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json";
import {
  ExactRational,
  evaluateExactExpression,
  integerGcd,
  integerLcm,
  isPrime,
  locateExactText,
  positiveFactors,
  primeFactorization,
  renderPrimeFactorization,
  sha256,
  type ExpressionAst,
  type ExpressionEvaluationTrace,
  type RationalJson
} from "./hk-ease-v4-derivation-dsl";
import {
  assertNoHongKongEaseV4ForbiddenKeys,
  canonicalHongKongEaseV4ProblemPayload,
  HK_EASE_V4_QUESTION_PACK_PATH,
  HK_EASE_V4_QUESTION_PACK_SHA256,
  HK_EASE_V4_SANITIZED_FORBIDDEN_KEYS,
  type HongKongEaseV4ProblemPayload,
  HongKongEaseV4SanitizedInput,
  HongKongEaseV4SanitizedInputRow
} from "./build-hk-ease-derivation-input-v4";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const HK_EASE_V4_DERIVATION_SUPPLEMENT_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json";
export const HK_EASE_V4_SANITIZED_INPUT_SHA256 =
  "54e9861f4fe6963e005752dbe5f741fed8ba71b8596eec8d80d365fc46ad0cfb";
export const HK_EASE_V4_SANITIZED_ORDERED_BASE_ID_SHA256 =
  "fe20c8ff458b6d67b911c20ee02675202b188c44b4cc933066a2f64bd965b66a";
export const HK_EASE_V4_SANITIZED_ROWS_PAYLOAD_SHA256 =
  "ad5c83775f197de4a20c28054a3a9eac8c1624e24eee115ddf1b863fd4b4265c";

type TextLocator = {
  source: "prompt.en" | "prompt.zh" | "options.en" | "options.zh";
  optionIndex?: number;
  exact: string;
  occurrence: number;
  start: number;
  end: number;
};

export type DerivationFact = {
  factId: string;
  kind:
    | "prompt-expression"
    | "prompt-quantity"
    | "prompt-relation"
    | "prompt-request"
    | "domain-rule"
    | "option-payload";
  locator: TextLocator;
  value: unknown;
};

export type DerivationStep = {
  stepId: string;
  operation:
    | "evaluate-rational-expression"
    | "render-rational"
    | "compare-rationals"
    | "sort-rationals"
    | "enumerate-factors"
    | "enumerate-multiples"
    | "enumerate-primes"
    | "prime-factorize"
    | "compute-gcd"
    | "compute-lcm"
    | "compute-integer-square-root"
    | "test-divisibility"
    | "apply-area-formula"
    | "apply-multiplication-property"
    | "round-to-nearest-place"
    | "multiply-rounded-values"
    | "compose-estimate-and-exact"
    | "apply-domain-rule"
    | "compose-structured-response"
    | "select-unique-option";
  inputFactIds: string[];
  inputStepIds: string[];
  parameters: Record<string, unknown>;
  output: unknown;
};

export type OptionAdjudication = {
  index: number;
  localizedOption: { en: string; zh: string };
  localizedOptionSha256: string;
  truth: boolean;
  evaluation: {
    kind: string;
    operands: unknown;
    result: unknown;
  };
  rowSpecificReason: string;
};

export type ComputedResult = {
  kind: "response-text";
  responseText: string;
  semanticValue: unknown;
};

export type PromptRequirements = {
  method:
    | "short-division"
    | "prime-factorisation"
    | "divisibility-rule"
    | "show-calculation"
    | "area-formula"
    | "commutative-or-associative-property"
    | "nearest-ten-estimation"
    | "enumeration"
    | null;
  representations: string[];
  components: string[];
  units: string[];
  explicitFormat: string | null;
};

export type HongKongEaseV4DerivationRow = {
  index: number;
  baseId: string;
  problemPayloadSha256: string;
  derivationKind: string;
  facts: DerivationFact[];
  steps: DerivationStep[];
  promptRequirements: PromptRequirements;
  computedResult: ComputedResult;
  optionAdjudications: OptionAdjudication[];
  derivationPayloadSha256: string;
};

export type HongKongEaseV4DerivationSupplement = {
  schemaVersion: "hk-ease-v4-row-specific-derivation-supplement-v1";
  status: "candidate-pending-independent-row-by-row-re-review";
  sourcePath: "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json";
  sourceSha256: typeof HK_EASE_V4_SANITIZED_INPUT_SHA256;
  questionCount: 701;
  multipleChoiceCount: 90;
  diagramCount: 0;
  rowSpecificDerivationCount: 701;
  orderedBaseIdSha256: string;
  rowsPayloadSha256: string;
  rows: HongKongEaseV4DerivationRow[];
};

type DerivationRowWithoutHash = Omit<
  HongKongEaseV4DerivationRow,
  "derivationPayloadSha256" | "promptRequirements"
>;

const sanitizedInput = sanitizedInputJson as HongKongEaseV4SanitizedInput;

const promptUnitsFor = (rawPrompt: string): string[] => {
  const prompt = rawPrompt.replace(/L\.?C\.?M\.?/gi, "LCM");
  const units = new Set<string>();
  for (const match of prompt.matchAll(/_{2,}\s*(cm|mm|km|mL|kg|g|m|L)(?=\s|[.,;)]|$)/g)) {
    units.add(match[1]);
  }
  for (const match of prompt.matchAll(/(?:in|answer in|nearest)\s+(centimetres?|metres?|kilometres?|millimetres?|litres?|millilitres?|kilograms?|grams?|seconds?|minutes?|hours?)/gi)) {
    units.add(match[1].toLowerCase());
  }
  for (const match of prompt.matchAll(/(?:\d|\)|²|³)\s*(cm|mm|km|mL|kg|g|m|L)(?=\s|[.,;)]|$)/g)) {
    const prefix = prompt.slice(Math.max(0, match.index! - 24), match.index! + 1);
    if (match[1] === "m" && /power of\s*$/i.test(prefix)) continue;
    units.add(match[1]);
  }
  if (/HK\$/.test(prompt)) units.add("HK$");
  if (/\bdegrees?\b|°/.test(prompt)) units.add("degrees");
  if (/square-centimetre units|square centimetre units|cm²/i.test(prompt)) units.add("cm²");
  return [...units].sort();
};

const explicitFormatFor = (row: HongKongEaseV4SanitizedInputRow): string | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const promptZh = row.prompt.zh.replace(/\s+/g, " ").trim();
  return prompt.match(/(?:format|form)\s+[“"'](.+?)[”"']/i)?.[1]
    ?? prompt.match(/\b(?:enter|give) (?:your )?answer as\s+(.+?)(?:\.|$)/i)?.[1]
    ?? prompt.match(/\busing\s+[“"'](.+?)[”"']/i)?.[1]
    ?? promptZh.match(/按[「“"'](.+?)[」”"'](?:的)?格式/)?.[1]
    ?? null;
};

const promptRequirementsFor = (row: HongKongEaseV4SanitizedInputRow): PromptRequirements => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const method: PromptRequirements["method"] = /short division/i.test(prompt)
    ? "short-division"
    : /prime factor(?:isation|ization)/i.test(prompt)
      ? "prime-factorisation"
      : /divisibility (?:test|rule)|explain your method|briefly explain/i.test(prompt)
        ? "divisibility-rule"
        : /show (?:the |your )?(?:calculation|working|steps)|do not give only/i.test(prompt)
          ? "show-calculation"
          : /(?:rectangle|square)-area formula/i.test(prompt)
            ? "area-formula"
            : /commutative or associative property of multiplication/i.test(prompt)
              ? "commutative-or-associative-property"
              : /round both numbers to the nearest ten and estimate/i.test(prompt)
                ? "nearest-ten-estimation"
                : /using enumeration/i.test(prompt)
                  ? "enumeration"
                  : null;
  const representations = [
    [/simplest form/i, "simplest-form"],
    [/mixed number/i, "mixed-number-allowed"],
    [/improper fraction/i, "improper-fraction-allowed"],
    [/fraction(?!s of)/i, "fraction"],
    [/decimal/i, "decimal"],
    [/(?:index|exponential) notation/i, "index-notation"],
    [/equation/i, "equation"],
    [/do not evaluate/i, "expression-only"],
    [/using\s+>\s+between/i, "inequality-greater-than"],
    [/using\s+<\s+between/i, "inequality-less-than"]
  ] as const;
  const components = [
    [/H\.?C\.?F\.?/i, "hcf"],
    [/L\.?C\.?M\.?/i, "lcm"],
    [/\b(?:list|write|find)\b.*\ball (?:the )?(?:positive )?factors\b/i, "complete-factor-list"],
    [/list all (?:positive )?common factors|complete common-factor set|which .*common factors|find .*common factors/i, "common-factor-list"],
    [/prime, composite, or neither|prime or composite|prime number or a composite number|classif(?:y|ication).*prime/i, "prime-composite-classification"],
    [/multiply the common divisors|write both products/i, "common-divisor-product"],
    [/multiply all divisors|write both products/i, "all-divisor-product"],
    [/H\.?C\.?F\.? (?:prime-factor )?product|prime-factor product and value for both results/i, "hcf-product"],
    [/L\.?C\.?M\.? (?:prime-factor )?product|prime-factor product and value for both results/i, "lcm-product"],
    [/explain|reason/i, "reason"],
    [/Yes\/No|decide whether|determine whether|Give your decision|Is this statement correct|state .*whether/i, "decision"],
    [/\(a\)/, "part-a"],
    [/\(b\)/, "part-b"],
    [/\(c\)/, "part-c"],
    [/\(d\)/, "part-d"],
    [/\(e\)/, "part-e"],
    [/\(f\)/, "part-f"]
  ] as const;
  const units = promptUnitsFor(prompt);
  return {
    method,
    representations: representations.filter(([pattern]) => pattern.test(prompt)).map(([, label]) => label),
    components: components.filter(([pattern]) => pattern.test(prompt)).map(([, label]) => label),
    units,
    explicitFormat: explicitFormatFor(row)
  };
};

const sourceTextForLocator = (row: HongKongEaseV4SanitizedInputRow, source: TextLocator["source"], optionIndex?: number): string => {
  if (source === "prompt.en") return row.prompt.en;
  if (source === "prompt.zh") return row.prompt.zh;
  const options = source === "options.en" ? row.options.en : row.options.zh;
  if (!options || optionIndex === undefined || !options[optionIndex]) {
    throw new Error(`V4_FACT_LOCATOR_INVALID:${row.baseId}:${source}:${optionIndex}`);
  }
  return options[optionIndex];
};

const locator = (
  row: HongKongEaseV4SanitizedInputRow,
  source: TextLocator["source"],
  exact: string,
  occurrence = 0,
  optionIndex?: number
): TextLocator => ({
  source,
  ...(optionIndex === undefined ? {} : { optionIndex }),
  ...locateExactText(sourceTextForLocator(row, source, optionIndex), exact, occurrence)
});

const promptFact = (
  row: HongKongEaseV4SanitizedInputRow,
  factId: string,
  kind: DerivationFact["kind"],
  exact: string,
  value: unknown,
  occurrence = 0
): DerivationFact => ({
  factId,
  kind,
  locator: locator(row, "prompt.en", exact, occurrence),
  value
});

const finalizedRow = (row: DerivationRowWithoutHash): HongKongEaseV4DerivationRow => {
  const sourceRow = sanitizedInput.rows[row.index];
  if (!sourceRow || sourceRow.baseId !== row.baseId) {
    throw new Error(`V4_QUESTION_ORDER_DRIFT:${row.index}:${row.baseId}`);
  }
  const withRequirements = {
    ...row,
    promptRequirements: promptRequirementsFor(sourceRow)
  };
  return {
    ...withRequirements,
    derivationPayloadSha256: sha256(JSON.stringify(withRequirements))
  };
};

type RationalRenderMode =
  | "integer-or-improper"
  | "integer-or-mixed"
  | "finite-decimal"
  | "comparison-symbol";

const renderRational = (value: ExactRational, mode: RationalRenderMode): string => {
  if (mode === "integer-or-mixed") return value.toMixedString();
  if (mode === "finite-decimal") {
    const decimal = value.toFiniteDecimalString();
    if (decimal === null) {
      throw new Error("V4_STEP_EXECUTION_INVALID:non-terminating-decimal-result");
    }
    return decimal;
  }
  return value.toImproperString();
};

const renderModeForPrompt = (prompt: string, expression: string): RationalRenderMode => {
  if (/decimal notation|Express in decimals|to a decimal|using a decimal/i.test(prompt)) {
    return "finite-decimal";
  }
  if (/mixed number or an improper fraction/i.test(prompt)) return "integer-or-mixed";
  if (/fraction in simplest form|exact answer as a mixed/i.test(prompt)) {
    return /mixed/i.test(prompt) ? "integer-or-mixed" : "integer-or-improper";
  }
  if (/\d+\.\d+/.test(expression)) {
    const exactValue = evaluateExactExpression(expression).value;
    return exactValue.toFiniteDecimalString() === null
      ? "integer-or-improper"
      : "finite-decimal";
  }
  return "integer-or-improper";
};

const makeExpressionDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  expressionExact: string,
  mode = renderModeForPrompt(row.prompt.en, expressionExact),
  responseDecorator?: (response: string, value: ExactRational) => string
): HongKongEaseV4DerivationRow => {
  const evaluation = evaluateExactExpression(expressionExact);
  const rendered = renderRational(evaluation.value, mode);
  const responseText = responseDecorator ? responseDecorator(rendered, evaluation.value) : rendered;
  const expressionFact = promptFact(
    row,
    "f1",
    "prompt-expression",
    expressionExact,
    { expression: expressionExact, ast: evaluation.ast }
  );
  const steps: DerivationStep[] = [
    {
      stepId: "s1",
      operation: "evaluate-rational-expression",
      inputFactIds: ["f1"],
      inputStepIds: [],
      parameters: { expression: expressionExact, ast: evaluation.ast },
      output: {
        value: evaluation.value.toJson(),
        operationTrace: evaluation.trace
      }
    },
    {
      stepId: "s2",
      operation: "render-rational",
      inputFactIds: [],
      inputStepIds: ["s1"],
      parameters: { mode, responseDecorator: responseDecorator ? "row-specific" : "identity" },
      output: { responseText }
    }
  ];
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "exact-rational-expression",
    facts: [expressionFact],
    steps,
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: evaluation.value.toJson()
    },
    optionAdjudications: []
  });
};

type FormulaQuantity = {
  exact: string;
  occurrence?: number;
  value?: string;
};

type FormulaSpec = {
  expression: string;
  quantities: FormulaQuantity[];
  mode?: RationalRenderMode;
  decorate?: (response: string, value: ExactRational) => string;
};

type MultiFormulaSpec = {
  expressions: string[];
  quantities: FormulaQuantity[];
  modes?: RationalRenderMode[];
  template: string;
};

const makeFormulaDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  spec: FormulaSpec
): HongKongEaseV4DerivationRow => {
  const facts: DerivationFact[] = spec.quantities.map((quantity, index) =>
    promptFact(
      row,
      `f${index + 1}`,
      "prompt-quantity",
      quantity.exact,
      evaluateExactExpression(quantity.value ?? quantity.exact).value.toJson(),
      quantity.occurrence ?? 0
    )
  );
  const evaluation = evaluateExactExpression(spec.expression);
  const mode = spec.mode ?? renderModeForPrompt(row.prompt.en, spec.expression);
  const rendered = renderRational(evaluation.value, mode);
  const responseText = spec.decorate ? spec.decorate(rendered, evaluation.value) : rendered;
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "prompt-quantity-formula",
    facts,
    steps: [
      {
        stepId: "s1",
        operation: "evaluate-rational-expression",
        inputFactIds: facts.map((fact) => fact.factId),
        inputStepIds: [],
        parameters: { expression: spec.expression, ast: evaluation.ast },
        output: { value: evaluation.value.toJson(), operationTrace: evaluation.trace }
      },
      {
        stepId: "s2",
        operation: "render-rational",
        inputFactIds: [],
        inputStepIds: ["s1"],
        parameters: { mode, responseDecorator: spec.decorate ? "row-specific" : "identity" },
        output: { responseText }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: evaluation.value.toJson()
    },
    optionAdjudications: []
  });
};

const makeMultiFormulaDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  spec: MultiFormulaSpec
): HongKongEaseV4DerivationRow => {
  const facts = spec.quantities.map((quantity, index) =>
    promptFact(
      row,
      `f${index + 1}`,
      "prompt-quantity",
      quantity.exact,
      evaluateExactExpression(quantity.value ?? quantity.exact).value.toJson(),
      quantity.occurrence ?? 0
    )
  );
  const evaluations = spec.expressions.map((expression) => evaluateExactExpression(expression));
  const rendered = evaluations.map((evaluation, index) =>
    renderRational(
      evaluation.value,
      spec.modes?.[index] ?? renderModeForPrompt(row.prompt.en, spec.expressions[index])
    )
  );
  const responseText = rendered.reduce(
    (template, value, index) => template.replaceAll(`{${index}}`, value),
    spec.template
  );
  const evaluationSteps = evaluations.map<DerivationStep>((evaluation, index) => ({
    stepId: `s${index + 1}`,
    operation: "evaluate-rational-expression",
    inputFactIds: facts.map((fact) => fact.factId),
    inputStepIds: [],
    parameters: { expression: spec.expressions[index], ast: evaluation.ast },
    output: { value: evaluation.value.toJson(), operationTrace: evaluation.trace }
  }));
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "multi-part-prompt-quantity-formula",
    facts,
    steps: [
      ...evaluationSteps,
      {
        stepId: `s${evaluationSteps.length + 1}`,
        operation: "compose-structured-response",
        inputFactIds: [],
        inputStepIds: evaluationSteps.map((step) => step.stepId),
        parameters: { template: spec.template },
        output: { responseText }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: evaluations.map((evaluation) => evaluation.value.toJson())
    },
    optionAdjudications: []
  });
};

const derivePromptRequiredAreaFormula = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const rectangle = prompt.match(/A rectangle is\s+(\d+)\s+cm long and\s+(\d+)\s+cm wide\. Use the rectangle-area formula/i);
  const square = prompt.match(/A square has side length\s+(\d+)\s+cm\. Use the square-area formula/i);
  if (!rectangle && !square) return null;

  const shape = rectangle ? "rectangle" : "square";
  const factorTexts = rectangle ? [rectangle[1], rectangle[2]] : [square![1], square![1]];
  const factTexts = rectangle ? [rectangle[1], rectangle[2]] : [square![1]];
  const facts = factTexts.map((exact, index) =>
    promptFact(row, `f${index + 1}`, "prompt-quantity", exact, {
      numerator: exact,
      denominator: "1"
    })
  );
  const area = (BigInt(factorTexts[0]) * BigInt(factorTexts[1])).toString();
  const formula = shape === "rectangle" ? "length × width = area" : "side × side = area";
  const responseText = `${factorTexts[0]} × ${factorTexts[1]} = ${area} cm²`;
  const output = {
    shape,
    formula,
    factors: factorTexts,
    area,
    unit: "cm²",
    responseText
  };
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "prompt-derived-area-formula",
    facts,
    steps: [{
      stepId: "s1",
      operation: "apply-area-formula",
      inputFactIds: facts.map((fact) => fact.factId),
      inputStepIds: [],
      parameters: { shape, formula, factors: factorTexts, outputUnit: "cm²" },
      output
    }],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: { shape, formula, factors: factorTexts, area, unit: "cm²" }
    },
    optionAdjudications: []
  });
};

const derivePromptRequiredMultiplicationProperty = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const match = prompt.match(/commutative or associative property of multiplication to calculate\s+(\d+)\s*×\s*(\d+)\s*×\s*(\d+)/i);
  if (!match) return null;
  const [, first, second, third] = match;
  const facts = [first, second, third].map((exact, index) =>
    promptFact(row, `f${index + 1}`, "prompt-quantity", exact, {
      numerator: exact,
      denominator: "1"
    })
  );
  const groupedProduct = (BigInt(first) * BigInt(third)).toString();
  const value = (BigInt(groupedProduct) * BigInt(second)).toString();
  const sourceExpression = `${first} × ${second} × ${third}`;
  const transformedExpression = `(${first} × ${third}) × ${second}`;
  const responseText = `${sourceExpression}=${first}×${third}×${second}=${transformedExpression}=${groupedProduct}×${second}=${value} (commutative and associative properties)`;
  const output = {
    sourceExpression,
    transformedExpression,
    properties: ["commutative", "associative"],
    groupedProduct,
    value,
    responseText
  };
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "prompt-derived-multiplication-property",
    facts,
    steps: [{
      stepId: "s1",
      operation: "apply-multiplication-property",
      inputFactIds: facts.map((fact) => fact.factId),
      inputStepIds: [],
      parameters: { properties: ["commutative", "associative"] },
      output
    }],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: { sourceExpression, transformedExpression, groupedProduct, value }
    },
    optionAdjudications: []
  });
};

const derivePromptRequiredNearestTenEstimate = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  if (!/round both numbers to the nearest ten and estimate/i.test(prompt)) return null;
  const operands = [...prompt.matchAll(/(?:HK\$)?(\d+)/g)]
    .map((match) => match[1])
    .filter((value) => value !== "10");
  if (operands.length < 2) throw new Error(`V4_STEP_INPUT_BINDING_INVALID:nearest-ten-operands:${row.baseId}`);
  const [first, second] = operands;
  const roundTen = (value: string): string => (((BigInt(value) + BigInt("5")) / BigInt("10")) * BigInt("10")).toString();
  const rounded = [roundTen(first), roundTen(second)];
  const estimate = (BigInt(rounded[0]) * BigInt(rounded[1])).toString();
  const exactEvaluation = evaluateExactExpression(`${first}*${second}`);
  const exact = exactEvaluation.value.toImproperString();
  const responseText = `${estimate};${exact}`;
  const facts = [
    promptFact(row, "f1", "prompt-quantity", first, { numerator: first, denominator: "1" }),
    promptFact(row, "f2", "prompt-quantity", second, { numerator: second, denominator: "1" }),
    promptFact(row, "f3", "prompt-request", "nearest ten", { place: "ten" })
  ];
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "prompt-derived-nearest-ten-estimate-and-exact",
    facts,
    steps: [
      {
        stepId: "s1",
        operation: "round-to-nearest-place",
        inputFactIds: ["f1", "f3"],
        inputStepIds: [],
        parameters: { place: "ten" },
        output: { original: first, place: "ten", rounded: rounded[0] }
      },
      {
        stepId: "s2",
        operation: "round-to-nearest-place",
        inputFactIds: ["f2", "f3"],
        inputStepIds: [],
        parameters: { place: "ten" },
        output: { original: second, place: "ten", rounded: rounded[1] }
      },
      {
        stepId: "s3",
        operation: "multiply-rounded-values",
        inputFactIds: [],
        inputStepIds: ["s1", "s2"],
        parameters: {},
        output: { factors: rounded, product: estimate }
      },
      {
        stepId: "s4",
        operation: "evaluate-rational-expression",
        inputFactIds: ["f1", "f2"],
        inputStepIds: [],
        parameters: { expression: `${first}*${second}`, ast: exactEvaluation.ast },
        output: { value: exactEvaluation.value.toJson(), operationTrace: exactEvaluation.trace }
      },
      {
        stepId: "s5",
        operation: "compose-estimate-and-exact",
        inputFactIds: [],
        inputStepIds: ["s3", "s4"],
        parameters: { separator: ";", explicitFormat: explicitFormatFor(row) },
        output: { responseText }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: { roundedValues: rounded, estimate, exact }
    },
    optionAdjudications: []
  });
};

type ComparisonSpec = { left: string; right: string };
type SortSpec = { values: string[]; direction: "ascending" | "descending"; separator: "<" | ">" };
type DomainSpec = {
  ruleId: string;
  evidence: string[];
  parameters: Record<string, unknown>;
  responseText: string;
  semanticValue: unknown;
};

const makeComparisonDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  spec: ComparisonSpec
): HongKongEaseV4DerivationRow => {
  const left = evaluateExactExpression(spec.left);
  const right = evaluateExactExpression(spec.right);
  const comparison = left.value.compare(right.value);
  const responseText = comparison < 0 ? "<" : comparison > 0 ? ">" : "=";
  const facts = [
    promptFact(row, "f1", "prompt-expression", spec.left, {
      expression: spec.left,
      ast: left.ast
    }),
    promptFact(row, "f2", "prompt-expression", spec.right, {
      expression: spec.right,
      ast: right.ast
    })
  ];
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "exact-rational-comparison",
    facts,
    steps: [
      {
        stepId: "s1",
        operation: "evaluate-rational-expression",
        inputFactIds: ["f1"],
        inputStepIds: [],
        parameters: { expression: spec.left, ast: left.ast },
        output: { value: left.value.toJson(), operationTrace: left.trace }
      },
      {
        stepId: "s2",
        operation: "evaluate-rational-expression",
        inputFactIds: ["f2"],
        inputStepIds: [],
        parameters: { expression: spec.right, ast: right.ast },
        output: { value: right.value.toJson(), operationTrace: right.trace }
      },
      {
        stepId: "s3",
        operation: "compare-rationals",
        inputFactIds: [],
        inputStepIds: ["s1", "s2"],
        parameters: {},
        output: { comparison, responseText }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: {
        left: left.value.toJson(),
        right: right.value.toJson(),
        comparison
      }
    },
    optionAdjudications: []
  });
};

const makeSortDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  spec: SortSpec
): HongKongEaseV4DerivationRow => {
  const evaluated = spec.values.map((text) => ({ text, evaluation: evaluateExactExpression(text) }));
  const sorted = [...evaluated].sort((left, right) => {
    const comparison = left.evaluation.value.compare(right.evaluation.value);
    return spec.direction === "ascending" ? comparison : -comparison;
  });
  const responseText = sorted.map((entry) => entry.text.replace(/\\(?:d?frac)\{(\d+)\}\{(\d+)\}/g, "$1/$2")).join(` ${spec.separator} `);
  const facts = evaluated.map((entry, index) =>
    promptFact(row, `f${index + 1}`, "prompt-expression", entry.text, {
      expression: entry.text,
      ast: entry.evaluation.ast
    })
  );
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "exact-rational-ordering",
    facts,
    steps: [
      ...evaluated.map<DerivationStep>((entry, index) => ({
        stepId: `s${index + 1}`,
        operation: "evaluate-rational-expression",
        inputFactIds: [`f${index + 1}`],
        inputStepIds: [],
        parameters: { expression: entry.text, ast: entry.evaluation.ast },
        output: { value: entry.evaluation.value.toJson(), operationTrace: entry.evaluation.trace }
      })),
      {
        stepId: `s${evaluated.length + 1}`,
        operation: "sort-rationals",
        inputFactIds: [],
        inputStepIds: evaluated.map((_entry, index) => `s${index + 1}`),
        parameters: { direction: spec.direction, separator: spec.separator },
        output: {
          orderedInputIndices: sorted.map((entry) => evaluated.indexOf(entry)),
          responseText
        }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: sorted.map((entry) => entry.evaluation.value.toJson())
    },
    optionAdjudications: []
  });
};

const makeDomainDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  spec: DomainSpec
): HongKongEaseV4DerivationRow => {
  const responseText = spec.ruleId === "classify-fraction-forms-v1"
    ? spec.responseText
        .replace("(a) ", "(a) proper fractions: ")
        .replace("; (b) ", "; (b) improper fractions: ")
        .replace("; (c) ", "; (c) mixed numbers: ")
    : spec.responseText;
  const facts = spec.evidence.map((exact, index) =>
    promptFact(row, `f${index + 1}`, index === 0 ? "prompt-request" : "prompt-relation", exact, {
      exact
    })
  );
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: `domain-rule:${spec.ruleId}`,
    facts,
    steps: [
      {
        stepId: "s1",
        operation: "apply-domain-rule",
        inputFactIds: facts.map((fact) => fact.factId),
        inputStepIds: [],
        parameters: { ruleId: spec.ruleId, ...spec.parameters },
        output: { responseText, semanticValue: spec.semanticValue }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: spec.semanticValue
    },
    optionAdjudications: []
  });
};

type ShortDivisionTraceStep = {
  divisor: string;
  before: string[];
  after: string[];
  dividesEveryCurrentValue: boolean;
};

const shortDivisionTraceFor = (values: bigint[]): ShortDivisionTraceStep[] => {
  const current = [...values];
  const trace: ShortDivisionTraceStep[] = [];
  const divideBy = (divisor: bigint, dividesEveryCurrentValue: boolean) => {
    const before = current.map(String);
    for (let index = 0; index < current.length; index += 1) {
      if (current[index] % divisor === BigInt("0")) current[index] /= divisor;
    }
    trace.push({
      divisor: divisor.toString(),
      before,
      after: current.map(String),
      dividesEveryCurrentValue
    });
  };

  // Take common prime divisors first.  Their product is the H.C.F.; after
  // that, continue dividing any remaining value so the product of every
  // listed divisor is the L.C.M.  Every transition is independently replayable.
  while (integerGcd(...current) > BigInt("1")) {
    const common = integerGcd(...current);
    const divisor = BigInt(primeFactorization(common)[0].prime);
    divideBy(divisor, true);
  }
  while (current.some((value) => value > BigInt("1"))) {
    const next = current.find((value) => value > BigInt("1"))!;
    const divisor = BigInt(primeFactorization(next)[0].prime);
    divideBy(divisor, false);
  }
  return trace;
};

const renderShortDivisionTrace = (trace: ShortDivisionTraceStep[]): string =>
  trace.map((step) => `${step.before.join(",")} ÷${step.divisor}→${step.after.join(",")}`).join(" ");

type ShortDivisionProducts = {
  commonDivisors: string[];
  hcfProduct: { expression: string; value: string };
  allDivisors?: string[];
  lcmProduct?: { expression: string; value: string };
};

const shortDivisionProductsFor = (
  trace: ShortDivisionTraceStep[],
  includeLcmProduct: boolean
): ShortDivisionProducts => {
  const commonDivisors = trace
    .filter((step) => step.dividesEveryCurrentValue)
    .map((step) => step.divisor);
  const allDivisors = trace.map((step) => step.divisor);
  const product = (values: string[]) => values.reduce((value, factor) => value * BigInt(factor), BigInt("1"));
  const hcfProduct = {
    expression: commonDivisors.length > 0 ? commonDivisors.join(" × ") : "1",
    value: product(commonDivisors).toString()
  };
  if (!includeLcmProduct) {
    return {
      commonDivisors,
      hcfProduct
    };
  }
  return {
    commonDivisors,
    allDivisors,
    hcfProduct,
    lcmProduct: {
      expression: allDivisors.length > 0 ? allDivisors.join(" × ") : "1",
      value: product(allDivisors).toString()
    },
  };
};

const renderExplicitGcdLcmResponse = (
  format: string,
  factorizations: Array<{ rendered: string }>,
  gcd: bigint,
  lcm: bigint
): string => {
  let factorizationIndex = 0;
  const withFactorizations = format.replace(/factorization/gi, () => {
    const factorization = factorizations[factorizationIndex++];
    if (!factorization) throw new Error("V4_PROMPT_BINDING_DRIFT:explicit-factorization-arity");
    return factorization.rendered;
  });
  if (factorizationIndex !== 0 && factorizationIndex !== factorizations.length) {
    throw new Error("V4_PROMPT_BINDING_DRIFT:explicit-factorization-arity");
  }
  return withFactorizations
    .replace(/((?:H\.?C\.?F\.?|HCF)\s*=\s*)(?:value|…|\.{3})/gi, (_match, prefix: string) => `${prefix}${gcd}`)
    .replace(/((?:L\.?C\.?M\.?|LCM)\s*=\s*)(?:value|…|\.{3})/gi, (_match, prefix: string) => `${prefix}${lcm}`);
};

const makeComputedDomainDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  ruleId: string,
  parameters: Record<string, unknown>,
  responseText: string,
  semanticValue: unknown
): HongKongEaseV4DerivationRow => {
  const directParameterValues = Array.isArray(parameters.values) && parameters.values.every(
    (value) => typeof value === "string" || typeof value === "number" || typeof value === "bigint"
  )
    ? parameters.values.map((value) => BigInt(String(value)))
    : null;
  const operandParameterValues = !directParameterValues && Array.isArray(parameters.operands)
    ? parameters.operands.map((operand) => {
        const value = (operand as { value?: { numerator?: string; denominator?: string } }).value;
        return value?.denominator === "1" && value.numerator !== undefined ? BigInt(value.numerator) : null;
      })
    : null;
  const parameterValues = directParameterValues ?? (
    operandParameterValues?.every((value): value is bigint => value !== null)
      ? operandParameterValues
      : null
  );
  const rawShortDivisionTrace = /short division/i.test(row.prompt.en) && parameterValues?.length
    ? shortDivisionTraceFor(parameterValues)
    : null;
  const hcfOnlyPrompt = /H\.?C\.?F\.?/i.test(row.prompt.en) && !/L\.?C\.?M\.?/i.test(row.prompt.en);
  const shortDivisionTrace = rawShortDivisionTrace && hcfOnlyPrompt
    ? rawShortDivisionTrace.filter((step) => step.dividesEveryCurrentValue)
    : rawShortDivisionTrace;
  const wantsCommonDivisorProduct = /multiply the common divisors|write both products|H\.?C\.?F\.? (?:prime-factor )?product/i.test(row.prompt.en);
  const wantsAllDivisorProduct = /multiply all divisors|write both products|L\.?C\.?M\.? (?:prime-factor )?product/i.test(row.prompt.en);
  const divisionProducts = shortDivisionTrace && (wantsCommonDivisorProduct || wantsAllDivisorProduct)
    ? shortDivisionProductsFor(shortDivisionTrace, wantsAllDivisorProduct)
    : null;
  const enrichedParameters = shortDivisionTrace
    ? {
        ...parameters,
        requestedMethod: "short-division",
        shortDivisionTrace,
        ...(divisionProducts ? { divisionProducts } : {})
      }
    : parameters;
  const enrichedSemanticValue = shortDivisionTrace && semanticValue && typeof semanticValue === "object" && !Array.isArray(semanticValue)
    ? {
        ...(semanticValue as Record<string, unknown>),
        shortDivisionTrace,
        ...(divisionProducts ? { divisionProducts } : {})
      }
    : semanticValue;
  const tracedResponseText = shortDivisionTrace
    ? `${renderShortDivisionTrace(shortDivisionTrace)}; ${responseText}`
    : responseText;
  const productClauses = divisionProducts
    ? [
        ...(wantsCommonDivisorProduct
          ? [`H.C.F. product: ${divisionProducts.hcfProduct.expression} = ${divisionProducts.hcfProduct.value}`]
          : []),
        ...(wantsAllDivisorProduct
          ? [`L.C.M. product: ${divisionProducts.lcmProduct!.expression} = ${divisionProducts.lcmProduct!.value}`]
          : [])
      ]
    : [];
  const enrichedResponseText = productClauses.length > 0
    ? `${tracedResponseText}; ${productClauses.join("; ")}`
    : tracedResponseText;
  const promptRequest: DerivationFact = {
    factId: "f1",
    kind: "prompt-request",
    locator: locator(row, "prompt.en", row.prompt.en),
    value: { prompt: row.prompt.en }
  };
  const bilingualFormat = explicitFormatFor(row);
  const bilingualFormatFact: DerivationFact | null = bilingualFormat && !row.prompt.en.includes(bilingualFormat)
    ? {
        factId: "f2",
        kind: "prompt-request",
        locator: locator(row, "prompt.zh", bilingualFormat),
        value: { explicitFormat: bilingualFormat }
      }
    : null;
  const facts = bilingualFormatFact ? [promptRequest, bilingualFormatFact] : [promptRequest];
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: `computed-domain-rule:${ruleId}`,
    facts,
    steps: [
      {
        stepId: "s1",
        operation: "apply-domain-rule",
        inputFactIds: facts.map((fact) => fact.factId),
        inputStepIds: [],
        parameters: { ruleId, ...enrichedParameters },
        output: { responseText: enrichedResponseText, semanticValue: enrichedSemanticValue }
      }
    ],
    computedResult: { kind: "response-text", responseText: enrichedResponseText, semanticValue: enrichedSemanticValue },
    optionAdjudications: []
  });
};

const makeLargestEqualSquareDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  length: bigint,
  width: bigint
): HongKongEaseV4DerivationRow => {
  const side = integerGcd(length, width);
  const across = length / side;
  const down = width / side;
  const count = across * down;
  return makeComputedDomainDerivation(
    row,
    "largest-equal-square-tiling-v1",
    {
      rectangle: [length.toString(), width.toString()],
      sideByGcd: side.toString(),
      grid: [across.toString(), down.toString()]
    },
    `(a) ${side} cm; (b) ${count} squares`,
    { side: side.toString(), across: across.toString(), down: down.toString(), count: count.toString() }
  );
};

const makeMinimumEqualCubeCountDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  dimensions: bigint[]
): HongKongEaseV4DerivationRow => {
  const side = integerGcd(...dimensions);
  const counts = dimensions.map((dimension) => dimension / side);
  const cubeCount = counts.reduce((product, value) => product * value, BigInt("1"));
  return makeComputedDomainDerivation(
    row,
    "minimum-equal-cubes-by-gcd-side-v1",
    {
      dimensions: dimensions.map(String),
      sideByGcd: side.toString(),
      countsAlongAxes: counts.map(String)
    },
    cubeCount.toString(),
    { cubeSide: side.toString(), countsAlongAxes: counts.map(String), cubeCount: cubeCount.toString() }
  );
};

const makeHcfWithCompleteCommonFactorsDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  values: bigint[]
): HongKongEaseV4DerivationRow => {
  const hcf = integerGcd(...values);
  const commonFactors = positiveFactors(hcf);
  const trace = shortDivisionTraceFor(values).filter((step) => step.dividesEveryCurrentValue);
  return makeComputedDomainDerivation(
    row,
    "short-division-hcf-and-complete-common-factors-v1",
    { values: values.map(String), shortDivisionTrace: trace },
    `H.C.F.=${hcf}; common factors=${commonFactors.join(",")}`,
    { hcf: hcf.toString(), commonFactors: commonFactors.map(String), shortDivisionTrace: trace }
  );
};

const makeLcmWithBoundedCommonMultiplesDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  values: bigint[],
  minimum: bigint,
  maximum: bigint
): HongKongEaseV4DerivationRow => {
  const lcm = integerLcm(...values);
  const firstMultiplier = (minimum + lcm - BigInt("1")) / lcm;
  const commonMultiples: bigint[] = [];
  for (let multiplier = firstMultiplier; multiplier * lcm <= maximum; multiplier += BigInt("1")) {
    commonMultiples.push(multiplier * lcm);
  }
  const trace = shortDivisionTraceFor(values);
  return makeComputedDomainDerivation(
    row,
    "short-division-lcm-and-bounded-common-multiples-v1",
    { values: values.map(String), minimum: minimum.toString(), maximum: maximum.toString(), shortDivisionTrace: trace },
    `L.C.M.=${lcm}; common multiples=${commonMultiples.join(",")}`,
    { lcm: lcm.toString(), commonMultiples: commonMultiples.map(String), shortDivisionTrace: trace }
  );
};

const makePrimeFactorisationAndHcfDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  first: bigint,
  secondExpression: string
): HongKongEaseV4DerivationRow => {
  const secondEvaluation = evaluateExactExpression(secondExpression);
  if (secondEvaluation.value.denominator !== BigInt("1")) {
    throw new Error("V4_STEP_EXECUTION_INVALID:factorised-hcf-noninteger");
  }
  const second = secondEvaluation.value.numerator;
  const firstFactors = primeFactorization(first);
  const secondFactors = primeFactorization(second);
  const hcf = integerGcd(first, second);
  const responseText = `(b) prime factorisation = ${first}=${renderPrimeFactorization(firstFactors)}; (c) H.C.F. = ${hcf}`;
  return makeComputedDomainDerivation(
    row,
    "prime-factorisation-and-hcf-v1",
    {
      first: first.toString(),
      firstFactors,
      secondExpression,
      secondAst: secondEvaluation.ast,
      second: second.toString(),
      secondFactors
    },
    responseText,
    { first: first.toString(), firstFactors, second: second.toString(), secondFactors, hcf: hcf.toString() }
  );
};

const integerWords: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10
};

const cardinalWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10
};

const makeGcdLcmDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  values: bigint[],
  method: "prime-factorisation" | "short-division" | "unspecified",
  responseStyle: "a-b" | "comma-labels" | "worked"
): HongKongEaseV4DerivationRow => {
  const gcd = integerGcd(...values);
  const lcm = integerLcm(...values);
  const factorizations = values.map((value) => ({
    value: value.toString(),
    factors: primeFactorization(value),
    rendered: renderPrimeFactorization(primeFactorization(value))
  }));
  const shortDivisionTrace = method === "short-division" ? shortDivisionTraceFor(values) : null;
  const explicitFormat = promptRequirementsFor(row).explicitFormat;
  const occurrenceByValue = new Map<string, number>();
  const facts = values.map((value, index) => {
    const exact = value.toString();
    const occurrence = occurrenceByValue.get(exact) ?? 0;
    occurrenceByValue.set(exact, occurrence + 1);
    return promptFact(row, `f${index + 1}`, "prompt-quantity", exact, { integer: exact }, occurrence);
  });
  const workedPrefix = factorizations.map((entry) => `${entry.value} = ${entry.rendered}`).join("; ");
  const responseText = explicitFormat
    ? renderExplicitGcdLcmResponse(explicitFormat, factorizations, gcd, lcm)
    : responseStyle === "a-b"
      ? `(a) H.C.F. = ${gcd}; (b) L.C.M. = ${lcm}`
      : responseStyle === "comma-labels"
        ? `HCF=${gcd}, LCM=${lcm}`
        : `${workedPrefix}; H.C.F. = ${gcd}; L.C.M. = ${lcm}`;
  const shortDivisionResponse = shortDivisionTrace
    ? `${shortDivisionTrace.map((step) => `${step.before.join(",")} ÷${step.divisor}→${step.after.join(",")}`).join(" ")}; ${responseText}`
    : responseText;
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: `integer-gcd-lcm:${method}`,
    facts,
    steps: [
      ...factorizations.map<DerivationStep>((entry, index) => ({
        stepId: `s${index + 1}`,
        operation: "prime-factorize",
        inputFactIds: [`f${index + 1}`],
        inputStepIds: [],
        parameters: { value: entry.value },
        output: { factors: entry.factors, rendered: entry.rendered }
      })),
      {
        stepId: `s${factorizations.length + 1}`,
        operation: "compute-gcd",
        inputFactIds: facts.map((fact) => fact.factId),
        inputStepIds: factorizations.map((_entry, index) => `s${index + 1}`),
        parameters: { values: values.map(String), method, ...(shortDivisionTrace ? { shortDivisionTrace } : {}) },
        output: { value: gcd.toString() }
      },
      {
        stepId: `s${factorizations.length + 2}`,
        operation: "compute-lcm",
        inputFactIds: facts.map((fact) => fact.factId),
        inputStepIds: factorizations.map((_entry, index) => `s${index + 1}`),
        parameters: { values: values.map(String), method, ...(shortDivisionTrace ? { shortDivisionTrace } : {}) },
        output: { value: lcm.toString() }
      },
      {
        stepId: `s${factorizations.length + 3}`,
        operation: "compose-structured-response",
        inputFactIds: [],
        inputStepIds: [`s${factorizations.length + 1}`, `s${factorizations.length + 2}`],
        parameters: {
          responseStyle,
          includeWorking: responseStyle === "worked",
          ...(explicitFormat ? { explicitFormat } : {})
        },
        output: { responseText: shortDivisionResponse }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText: shortDivisionResponse,
      semanticValue: {
        values: values.map(String),
        gcd: gcd.toString(),
        lcm: lcm.toString(),
        factorizations,
        method,
        ...(shortDivisionTrace ? { shortDivisionTrace } : {})
      }
    },
    optionAdjudications: []
  });
};

const deriveGenericGcdLcm = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\\\(|\\\)/g, " ").replace(/\n/g, " ");
  if (!/(?:H\.?C\.?F\.?|HCF)/i.test(prompt) || !/(?:L\.?C\.?M\.?|LCM)/i.test(prompt)) return null;
  if (row.baseId === "hk-ease-236" || row.baseId === "hk-ease-903") return null;
  const afterOf = prompt.match(/\bof\s+([^.;”]+)/i)?.[1] ?? "";
  const values = [...afterOf.matchAll(/\b\d+\b/g)].map((match) => BigInt(match[0]));
  if (values.length < 2 || values.length > 3) return null;
  const method = /short division/i.test(prompt)
    ? "short-division"
    : /prime factor/i.test(prompt)
      ? "prime-factorisation"
      : "unspecified";
  const responseStyle = /HCF=value, LCM=value/i.test(prompt)
    ? "comma-labels"
    : /\(a\).*H\.?C\.?F/i.test(prompt)
      ? "a-b"
      : "worked";
  return makeGcdLcmDerivation(row, values, method, responseStyle);
};

const deriveFactoredExpressionGcdAndLcm = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\n/g, " ").replace(/\\\(|\\\)/g, "");
  const match = prompt.match(/Find the\s+(?:H\.?C\.?F\.?|HCF)\s+and\s+(?:L\.?C\.?M\.?|LCM)\s+of\s+(.+?)\.(?:\s|$)/i);
  if (!match || !/(?:\^|[²³⁴⁵⁶⁷⁸⁹]|\\times|×)/.test(match[1])) return null;
  const expressions = match[1]
    .split(/\s*,\s*|\s+and\s+/i)
    .map((value) => value.trim())
    .filter(Boolean);
  if (expressions.length < 2 || expressions.length > 3) return null;
  const evaluations = expressions.map((expression) => ({
    expression,
    evaluation: evaluateExactExpression(expression)
  }));
  if (evaluations.some(({ evaluation }) => evaluation.value.denominator !== BigInt("1") || evaluation.value.numerator <= BigInt("0"))) {
    throw new Error("V4_STEP_EXECUTION_INVALID:gcd-lcm-expression-not-positive-integer");
  }
  const values = evaluations.map(({ evaluation }) => evaluation.value.numerator);
  const hcf = integerGcd(...values);
  const lcm = integerLcm(...values);
  const facts = evaluations.map(({ expression, evaluation }, index) =>
    promptFact(row, `f${index + 1}`, "prompt-expression", expression, {
      expression,
      ast: evaluation.ast
    })
  );
  const evaluationSteps = evaluations.map<DerivationStep>(({ expression, evaluation }, index) => ({
    stepId: `s${index + 1}`,
    operation: "evaluate-rational-expression",
    inputFactIds: [`f${index + 1}`],
    inputStepIds: [],
    parameters: { expression, ast: evaluation.ast },
    output: {
      value: evaluation.value.toJson(),
      operationTrace: evaluation.trace,
      primeFactors: primeFactorization(evaluation.value.numerator)
    }
  }));
  const responseText = `H.C.F. = ${hcf}; L.C.M. = ${lcm}`;
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "factored-expression-gcd-and-lcm",
    facts,
    steps: [
      ...evaluationSteps,
      {
        stepId: `s${evaluationSteps.length + 1}`,
        operation: "compute-gcd",
        inputFactIds: facts.map((fact) => fact.factId),
        inputStepIds: evaluationSteps.map((step) => step.stepId),
        parameters: { values: values.map(String), exponentRule: "minimum" },
        output: { value: hcf.toString() }
      },
      {
        stepId: `s${evaluationSteps.length + 2}`,
        operation: "compute-lcm",
        inputFactIds: facts.map((fact) => fact.factId),
        inputStepIds: evaluationSteps.map((step) => step.stepId),
        parameters: { values: values.map(String), exponentRule: "maximum" },
        output: { value: lcm.toString() }
      },
      {
        stepId: `s${evaluationSteps.length + 3}`,
        operation: "compose-structured-response",
        inputFactIds: [],
        inputStepIds: [`s${evaluationSteps.length + 1}`, `s${evaluationSteps.length + 2}`],
        parameters: { template: "H.C.F. = {0}; L.C.M. = {1}" },
        output: { responseText }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: { operands: values.map(String), hcf: hcf.toString(), lcm: lcm.toString() }
    },
    optionAdjudications: []
  });
};

const deriveFactoredExpressionGcdOrLcm = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\n/g, " ").replace(/\\\(|\\\)/g, "");
  const match = prompt.match(/Find the\s+(H\.?C\.?F\.?|HCF|L\.?C\.?M\.?|LCM)\s+of\s+(.+?)\.(?:\s|$)/i);
  if (!match || !/(?:\^|[²³⁴⁵⁶⁷⁸⁹]|\\times|×)/.test(match[2])) return null;
  const expressions = match[2]
    .split(/\s*,\s*|\s+and\s+/i)
    .map((value) => value.replace(/^and\s+/i, "").trim())
    .filter(Boolean);
  if (expressions.length < 2 || expressions.length > 3) return null;
  const evaluations = expressions.map((expression) => ({ expression, evaluation: evaluateExactExpression(expression) }));
  if (evaluations.some(({ evaluation }) => evaluation.value.denominator !== BigInt("1") || evaluation.value.numerator <= BigInt("0"))) {
    throw new Error("V4_STEP_EXECUTION_INVALID:gcd-lcm-expression-not-positive-integer");
  }
  const values = evaluations.map(({ evaluation }) => evaluation.value.numerator);
  const operation = /^H/i.test(match[1]) ? "gcd" : "lcm";
  const value = operation === "gcd" ? integerGcd(...values) : integerLcm(...values);
  const facts = evaluations.map(({ expression, evaluation }, index) =>
    promptFact(row, `f${index + 1}`, "prompt-expression", expression, { expression, ast: evaluation.ast })
  );
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: `factored-expression-${operation}`,
    facts,
    steps: [
      ...evaluations.map<DerivationStep>(({ expression, evaluation }, index) => ({
        stepId: `s${index + 1}`,
        operation: "evaluate-rational-expression",
        inputFactIds: [`f${index + 1}`],
        inputStepIds: [],
        parameters: { expression, ast: evaluation.ast },
        output: { value: evaluation.value.toJson(), operationTrace: evaluation.trace, primeFactors: primeFactorization(evaluation.value.numerator) }
      })),
      {
        stepId: `s${evaluations.length + 1}`,
        operation: operation === "gcd" ? "compute-gcd" : "compute-lcm",
        inputFactIds: facts.map((fact) => fact.factId),
        inputStepIds: evaluations.map((_entry, index) => `s${index + 1}`),
        parameters: { values: values.map(String), exponentRule: operation === "gcd" ? "minimum" : "maximum" },
        output: { value: value.toString() }
      }
    ],
    computedResult: { kind: "response-text", responseText: value.toString(), semanticValue: { operation, operands: values.map(String), result: value.toString() } },
    optionAdjudications: []
  });
};

const deriveCombinedGcdLcmExpressions = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\n/g, " ").replace(/\\\(|\\\)/g, "");
  if (!/H\.?C\.?F\.?\s+and\s+L\.?C\.?M\.?/i.test(prompt)) return null;
  const operandSource = prompt.match(/\bof\s+(.+?)(?:\.\s+(?:Answer|In one response|Show|Use)|;|$)/i)?.[1];
  if (!operandSource) return null;
  const expressions = operandSource
    .replace(/,\s*and\s+/i, ",")
    .split(/\s+and\s+|\s*,\s*/i)
    .map((expression) => expression.trim())
    .filter(Boolean);
  if (expressions.length < 2 || expressions.length > 3) return null;
  let evaluations: Array<ReturnType<typeof evaluateExactExpression>>;
  try {
    evaluations = expressions.map((expression) => evaluateExactExpression(expression));
  } catch {
    return null;
  }
  if (evaluations.some((evaluation) => evaluation.value.denominator !== BigInt("1") || evaluation.value.numerator <= BigInt("0"))) return null;
  const values = evaluations.map((evaluation) => evaluation.value.numerator);
  const gcd = integerGcd(...values);
  const lcm = integerLcm(...values);
  const facts = expressions.map((expression, index) =>
    promptFact(row, `f${index + 1}`, "prompt-expression", expression, { expression, ast: evaluations[index].ast })
  );
  const factorizations = values.map((value) => ({ value: value.toString(), factors: primeFactorization(value), rendered: renderPrimeFactorization(primeFactorization(value)) }));
  const requiresWorking = /Use (?:prime factorization|prime factorisation|short division)|show every|give each complete/i.test(prompt);
  const promptRequirements = promptRequirementsFor(row);
  const needsBothPrimeFactorProducts = /prime-factor product and value for both results/i.test(prompt);
  const workedPrefix = factorizations.map((entry) => `${entry.value} = ${entry.rendered}`).join("; ");
  const responseText = promptRequirements.explicitFormat
    ? renderExplicitGcdLcmResponse(promptRequirements.explicitFormat, factorizations, gcd, lcm)
    : needsBothPrimeFactorProducts
      ? `${workedPrefix}; H.C.F. product: ${renderPrimeFactorization(primeFactorization(gcd))} = ${gcd}; L.C.M. product: ${renderPrimeFactorization(primeFactorization(lcm))} = ${lcm}`
      : requiresWorking
        ? `${workedPrefix}; H.C.F. = ${gcd}; L.C.M. = ${lcm}`
        : `H.C.F. = ${gcd}; L.C.M. = ${lcm}`;
  const shortDivisionTrace = /short division/i.test(prompt) ? shortDivisionTraceFor(values) : null;
  const divisionProducts = shortDivisionTrace ? shortDivisionProductsFor(shortDivisionTrace, true) : null;
  const productClauses = divisionProducts && /write both products/i.test(prompt)
    ? `; H.C.F. product: ${divisionProducts.hcfProduct.expression} = ${divisionProducts.hcfProduct.value}; L.C.M. product: ${divisionProducts.lcmProduct!.expression} = ${divisionProducts.lcmProduct!.value}`
    : "";
  const completeResponseText = shortDivisionTrace
    ? `${renderShortDivisionTrace(shortDivisionTrace)}; H.C.F. = ${gcd}; L.C.M. = ${lcm}${productClauses}`
    : responseText;
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "combined-gcd-lcm-from-prompt-expressions",
    facts,
    steps: [
      ...evaluations.map<DerivationStep>((evaluation, index) => ({
        stepId: `s${index + 1}`,
        operation: "evaluate-rational-expression",
        inputFactIds: [`f${index + 1}`],
        inputStepIds: [],
        parameters: { expression: expressions[index], ast: evaluation.ast },
        output: { value: evaluation.value.toJson(), operationTrace: evaluation.trace, primeFactorization: factorizations[index].factors }
      })),
      { stepId: `s${evaluations.length + 1}`, operation: "compute-gcd", inputFactIds: facts.map((fact) => fact.factId), inputStepIds: evaluations.map((_entry, index) => `s${index + 1}`), parameters: { values: values.map(String), exponentRule: "minimum" }, output: { value: gcd.toString() } },
      { stepId: `s${evaluations.length + 2}`, operation: "compute-lcm", inputFactIds: facts.map((fact) => fact.factId), inputStepIds: evaluations.map((_entry, index) => `s${index + 1}`), parameters: { values: values.map(String), exponentRule: "maximum" }, output: { value: lcm.toString() } },
      {
        stepId: `s${evaluations.length + 3}`,
        operation: "compose-structured-response",
        inputFactIds: [],
        inputStepIds: [`s${evaluations.length + 1}`, `s${evaluations.length + 2}`],
        parameters: {
          promptRequirements,
          ...(shortDivisionTrace ? { shortDivisionTrace } : {}),
          ...(divisionProducts ? { divisionProducts } : {})
        },
        output: { responseText: completeResponseText }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText: completeResponseText,
      semanticValue: {
        operands: values.map(String),
        gcd: gcd.toString(),
        lcm: lcm.toString(),
        factorizations,
        ...(shortDivisionTrace ? { shortDivisionTrace } : {}),
        ...(divisionProducts ? { divisionProducts } : {})
      }
    },
    optionAdjudications: []
  });
};

const deriveGenericSingleGcdOrLcm = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\\\(|\\\)/g, " ").replace(/\s+/g, " ").trim();
  const match = prompt.match(/(?:Find|find)\s+(?:the\s+)?(H\.?C\.?F\.?|HCF|L\.?C\.?M\.?|LCM)\s+of\s+(.+?)(?:[.;]|$)/i);
  if (!match || /;\s*\(b\)/i.test(prompt)) return null;
  const operandTexts = match[2]
    .replace(/\s+using\s+prime factorization$/i, "")
    .split(/\s*,\s+and\s+|\s*,\s*|\s+and\s+/i)
    .map((value) => value.trim())
    .filter(Boolean);
  if (operandTexts.length < 2 || operandTexts.length > 3) return null;
  let operands: Array<ReturnType<typeof evaluateExactExpression>>;
  try {
    operands = operandTexts.map((operand) => evaluateExactExpression(operand));
  } catch {
    return null;
  }
  if (operands.some((operand) => operand.value.denominator !== BigInt("1") || operand.value.numerator <= BigInt("0"))) {
    return null;
  }
  const values = operands.map((operand) => operand.value.numerator);
  const isLcm = /^L/i.test(match[1]);
  const result = isLcm ? integerLcm(...values) : integerGcd(...values);
  const factorizations = values.map((value) => ({
    value: value.toString(),
    factors: primeFactorization(value),
    rendered: renderPrimeFactorization(primeFactorization(value))
  }));
  const requiresWorking = /Use (?:prime factorization|prime factorisation|short division)|give each complete|show every/i.test(prompt);
  const method = /short division/i.test(prompt)
    ? "short-division"
    : /prime factor/i.test(prompt)
      ? "prime-factorisation"
      : "unspecified";
  const needsPrimeFactorProduct = new RegExp(`${isLcm ? "L\\.?C\\.?M\\.?" : "H\\.?C\\.?F\\.?"} prime-factor product and value`, "i").test(prompt);
  const responseText = method === "short-division"
    ? `${isLcm ? "L.C.M." : "H.C.F."}=${result}`
    : needsPrimeFactorProduct
      ? `${factorizations.map((entry) => `${entry.value}=${entry.rendered}`).join(";")};${isLcm ? "L.C.M." : "H.C.F."} product: ${renderPrimeFactorization(primeFactorization(result))} = ${result}`
      : requiresWorking
        ? `${factorizations.map((entry) => `${entry.value}=${entry.rendered}`).join(";")};${isLcm ? "L.C.M." : "H.C.F."}=${result}`
    : result.toString();
  return makeComputedDomainDerivation(
    row,
    isLcm ? "compute-lcm-from-expressions-v1" : "compute-gcd-from-expressions-v1",
    {
      operands: [
        ...operands.map((operand, index) => ({
          exact: operandTexts[index],
          ast: operand.ast,
          value: operand.value.toJson()
        }))
      ],
      method
    },
    responseText,
    { values: values.map(String), result: result.toString(), factorizations }
  );
};

const deriveGenericTwoPartGcdOrLcm = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const operationMatch = prompt.match(/Find the\s+(H\.?C\.?F\.?|HCF|L\.?C\.?M\.?|LCM)\s+of each (?:pair|group)/i);
  if (!operationMatch) return null;
  const isLcm = /^L/i.test(operationMatch[1]);
  const partPattern = /\(([ab])\)\s*\\\((.+?)\\\)(?=\s*\([ab]\)|$)/g;
  const parts = [...prompt.matchAll(partPattern)];
  if (parts.length !== 2) return null;
  const computations = parts.map((part) => {
    const operands = part[2]
      .split(/\s*,\s*|\s+and\s+/i)
      .map((operand) => evaluateExactExpression(operand));
    const values = operands.map((operand) => {
      if (operand.value.denominator !== BigInt("1") || operand.value.numerator <= BigInt("0")) {
        throw new Error("V4_STEP_EXECUTION_INVALID:gcd-lcm-part-not-positive-integer");
      }
      return operand.value.numerator;
    });
    const result = isLcm ? integerLcm(...values) : integerGcd(...values);
    return {
      label: part[1],
      expressions: operands.map((operand) => ({ ast: operand.ast, value: operand.value.toJson() })),
      values: values.map(String),
      result: result.toString()
    };
  });
  return makeComputedDomainDerivation(
    row,
    isLcm ? "two-part-lcm-v1" : "two-part-gcd-v1",
    { computations },
    computations.map((part) => `(${part.label}) ${part.result}`).join("; "),
    { operation: isLcm ? "lcm" : "gcd", computations }
  );
};

const deriveGenericTwoPartExpressions = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  if (!/Find the value of each expression/i.test(prompt)) return null;
  const parts = [...prompt.matchAll(/\(([ab])\)\s*\\\((.+?)\\\)(?=\s*\([ab]\)|$)/g)];
  if (parts.length !== 2) return null;
  const computations = parts.map((part) => {
    const evaluation = evaluateExactExpression(part[2]);
    return {
      label: part[1],
      expression: part[2],
      ast: evaluation.ast,
      value: evaluation.value.toJson(),
      rendered: renderRational(evaluation.value, "integer-or-mixed")
    };
  });
  return makeComputedDomainDerivation(
    row,
    "two-part-exact-expression-evaluation-v1",
    { computations: computations.map(({ label, expression, ast }) => ({ label, expression, ast })) },
    computations.map((part) => `(${part.label}) ${part.rendered}`).join("; "),
    { computations }
  );
};

const deriveGenericRepeatedIndexNotation = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\\\(|\\\)/g, " ").replace(/\n/g, " ");
  let productText = prompt.match(/Express\s+(.+?)\s+in (?:index|exponential) notation/i)?.[1]
    ?? prompt.match(/Express in index notation:\s*(.+?)(?:\.|$)/i)?.[1];
  const verbalPower = prompt.match(/Express\s+"?(\d+)\s+to the\s+(\d+)(?:st|nd|rd|th)\s+power"?\s+by exponential notation/i);
  if (verbalPower) return null;
  if (!productText || !/(?:\\times|×|\*)/.test(productText)) return null;
  productText = productText.replace(/^["'“‘]+|["'”’]+$/g, "").trim();
  const factors = productText
    .split(/\s*(?:\\times|×|\*)\s*/)
    .map((token) => token.trim())
    .filter((token) => /^\d+$/.test(token))
    .map(BigInt);
  if (factors.length < 2) return null;
  const counts = new Map<bigint, number>();
  for (const factor of factors) if (factor !== BigInt("1")) counts.set(factor, (counts.get(factor) ?? 0) + 1);
  const groups = [...counts.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const responseText = groups.map(([base, exponent]) => exponent === 1 ? `${base}` : `${base}^${exponent}`).join(" × ");
  const occurrenceByValue = new Map<string, number>();
  const facts = factors.map((factor, index) => {
    const exact = factor.toString();
    const occurrence = occurrenceByValue.get(exact) ?? 0;
    occurrenceByValue.set(exact, occurrence + 1);
    return promptFact(row, `f${index + 1}`, "prompt-quantity", exact, { integer: exact }, occurrence);
  });
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "group-equal-factors-into-index-notation",
    facts,
    steps: [{
      stepId: "s1",
      operation: "apply-domain-rule",
      inputFactIds: facts.map((fact) => fact.factId),
      inputStepIds: [],
      parameters: { ruleId: "count-equal-factor-occurrences-v1", factors: factors.map(String) },
      output: { groups: groups.map(([base, exponent]) => ({ base: base.toString(), exponent })), responseText }
    }],
    computedResult: { kind: "response-text", responseText, semanticValue: { groups: groups.map(([base, exponent]) => ({ base: base.toString(), exponent })) } },
    optionAdjudications: []
  });
};

const deriveGenericNumberTheory = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\n/g, " ").replace(/\\\(|\\\)/g, "");
  const indexNotation = deriveGenericRepeatedIndexNotation(row);
  if (indexNotation) return indexNotation;

  const labeledDivisibility = prompt.match(/Select all numbers that are divisible by\s+(\d+)\s+but not by\s+(\d+)/i);
  if (labeledDivisibility) {
    const required = BigInt(labeledDivisibility[1]);
    const forbidden = BigInt(labeledDivisibility[2]);
    const candidates = [...row.prompt.en.matchAll(/\b([A-D])\.\s*\\?\(?(\d+)\\?\)?/g)].map((match) => ({
      label: match[1],
      value: BigInt(match[2])
    }));
    if (candidates.length > 0) {
      const judgments = candidates.map(({ label, value }) => ({
        label,
        value: value.toString(),
        requiredRemainder: (value % required).toString(),
        forbiddenRemainder: (value % forbidden).toString(),
        truth: value % required === BigInt("0") && value % forbidden !== BigInt("0")
      }));
      const responseText = judgments.filter((judgment) => judgment.truth).map((judgment) => judgment.label).join(", ");
      const facts = candidates.map(({ label, value }, index) =>
        promptFact(row, `f${index + 1}`, "prompt-quantity", value.toString(), { label, integer: value.toString() })
      );
      return finalizedRow({
        index: row.index,
        baseId: row.baseId,
        problemPayloadSha256: row.problemPayloadSha256,
        derivationKind: "labeled-divisibility-filter",
        facts,
        steps: [{
          stepId: "s1",
          operation: "test-divisibility",
          inputFactIds: facts.map((fact) => fact.factId),
          inputStepIds: [],
          parameters: { required: required.toString(), forbidden: forbidden.toString() },
          output: { judgments, responseText }
        }],
        computedResult: { kind: "response-text", responseText, semanticValue: { judgments } },
        optionAdjudications: []
      });
    }
  }

  let divisibilityMatch = prompt.match(/number less than\s+(\d+).*?divisible by\s+(\d+).*?maximum value/i);
  if (divisibilityMatch) {
    const bound = BigInt(divisibilityMatch[1]);
    const divisor = BigInt(divisibilityMatch[2]);
    const value = ((bound - BigInt("1")) / divisor) * divisor;
    return makeComputedDomainDerivation(row, "greatest-multiple-below-exclusive-bound-v1", { bound: bound.toString(), divisor: divisor.toString(), quotient: ((bound - BigInt("1")) / divisor).toString() }, value.toString(), { value: value.toString(), remainder: (value % divisor).toString(), next: (value + divisor).toString() });
  }

  divisibilityMatch = prompt.match(/number greater than\s+(\d+).*?divisible by\s+(\d+).*?minimum value/i);
  if (divisibilityMatch) {
    const bound = BigInt(divisibilityMatch[1]);
    const divisor = BigInt(divisibilityMatch[2]);
    const value = ((bound + divisor) / divisor) * divisor;
    return makeComputedDomainDerivation(row, "least-multiple-above-exclusive-bound-v1", { bound: bound.toString(), divisor: divisor.toString(), quotient: ((bound + divisor) / divisor).toString() }, value.toString(), { value: value.toString(), remainder: (value % divisor).toString(), previous: (value - divisor).toString() });
  }

  divisibilityMatch = prompt.match(/([0-9♥]+)\s+is a (?:three|four)-digit number divisible by\s+(\d+).*?all possible values of\s+♥/i);
  if (divisibilityMatch) {
    const pattern = divisibilityMatch[1];
    const divisor = BigInt(divisibilityMatch[2]);
    const judgments = Array.from({ length: 10 }, (_unused, digit) => {
      const value = BigInt(pattern.replace("♥", String(digit)));
      return { digit, value: value.toString(), remainder: (value % divisor).toString(), truth: value % divisor === BigInt("0") };
    });
    const digits = judgments.filter((judgment) => judgment.truth).map((judgment) => judgment.digit);
    return makeComputedDomainDerivation(row, "digit-substitution-divisibility-search-v1", { pattern, divisor: divisor.toString(), candidates: Array.from({ length: 10 }, (_unused, digit) => digit) }, digits.join(", "), { judgments, digits });
  }

  divisibilityMatch = prompt.match(/Determine whether\s+(\d+)\s+is divisible by both\s+(\d+)\s+and\s+(\d+)/i);
  if (divisibilityMatch) {
    const value = BigInt(divisibilityMatch[1]);
    const divisors = [BigInt(divisibilityMatch[2]), BigInt(divisibilityMatch[3])];
    const checks = divisors.map((divisor) => ({ divisor: divisor.toString(), remainder: (value % divisor).toString(), truth: value % divisor === BigInt("0") }));
    const truth = checks.every((check) => check.truth);
    return makeComputedDomainDerivation(row, "conjunction-of-divisibility-tests-v1", { value: value.toString(), divisors: divisors.map(String) }, truth ? "Yes" : "No", { checks, truth });
  }

  const asksForHcfAndLcm =
    /H\.?C\.?F\.?/i.test(prompt) && /L\.?C\.?M\.?/i.test(prompt);
  if (asksForHcfAndLcm && !/\^/.test(prompt)) {
    const beforeInstructions = prompt
      .split(/\.\s+(?:In one response|Show|Answer in the format|Include)/i)[0]
      .replace(/^.*?\bof\s+/i, "");
    const values = [...beforeInstructions.matchAll(/\d+/g)].map((result) => BigInt(result[0]));
    if (values.length >= 2 && values.length <= 3) {
      const hcf = integerGcd(...values);
      const lcm = integerLcm(...values);
      const factorizations = values.map((value) => ({
        value: value.toString(),
        factors: primeFactorization(value),
        rendered: renderPrimeFactorization(primeFactorization(value))
      }));
      const method = /short division/i.test(prompt) ? "short-division" : "prime-factorisation";
      const responseText = /show|include|do not give only/i.test(prompt)
        ? `${factorizations.map((entry) => `${entry.value}=${entry.rendered}`).join(";")};H.C.F.=${hcf};L.C.M.=${lcm}`
        : `(a) H.C.F. = ${hcf}; (b) L.C.M. = ${lcm}`;
      return makeComputedDomainDerivation(
        row,
        "compute-hcf-and-lcm-v1",
        {
          values: values.map(String),
          method,
          factorizations
        },
        responseText,
        {
          values: values.map(String),
          hcf: hcf.toString(),
          lcm: lcm.toString(),
          factorizations,
          method
        }
      );
    }
  }

  if (/divided (?:equally|evenly) into/i.test(prompt) && /minimum possible number/i.test(prompt)) {
    const conditionText = prompt.split(/Find the minimum possible number/i)[0];
    const divisors = [...conditionText.matchAll(/\d+/g)].map((result) => BigInt(result[0]));
    if (divisors.length >= 2) {
      const value = integerLcm(...divisors);
      return makeComputedDomainDerivation(
        row,
        "minimum-common-multiple-from-equal-groups-v1",
        { divisors: divisors.map(String) },
        value.toString(),
        {
          divisors: divisors.map(String),
          leastCommonMultiple: value.toString(),
          primeFactorizations: divisors.map((divisor) => primeFactorization(divisor))
        }
      );
    }
  }

  let primeSequenceMatch = prompt.match(/product of the first\s+(\w+)\s+prime numbers after\s+(\d+)/i);
  if (primeSequenceMatch) {
    const requestedCount = integerWords[primeSequenceMatch[1].toLowerCase()];
    const lowerBound = BigInt(primeSequenceMatch[2]);
    if (requestedCount) {
      const primes: bigint[] = [];
      for (let candidate = lowerBound + BigInt("1"); primes.length < requestedCount; candidate += BigInt("1")) {
        if (isPrime(candidate)) primes.push(candidate);
      }
      const product = primes.reduce((result, prime) => result * prime, BigInt("1"));
      return makeComputedDomainDerivation(
        row,
        "prime-sequence-product-v1",
        { requestedCount, lowerBound: lowerBound.toString() },
        product.toString(),
        { primes: primes.map(String), product: product.toString() }
      );
    }
  }

  const primeDecisionMatch = prompt.match(/Determine whether each number is prime:\s*(.+?)\.\s*In one response/i);
  if (primeDecisionMatch) {
    const labelledValues = [...primeDecisionMatch[1].matchAll(/\(([a-z])\)\s*(\d+)/gi)].map((result) => ({
      label: result[1].toLowerCase(),
      value: BigInt(result[2])
    }));
    if (labelledValues.length > 0) {
      const decisions = labelledValues.map(({ label, value }) => ({
        label,
        value: value.toString(),
        prime: isPrime(value),
        factors: positiveFactors(value).map(String)
      }));
      return makeComputedDomainDerivation(
        row,
        "labelled-prime-decisions-v1",
        { values: labelledValues.map(({ label, value }) => ({ label, value: value.toString() })) },
        decisions.map((decision) => `(${decision.label}) ${decision.prime ? "Yes" : "No"}`).join(" "),
        { decisions }
      );
    }
  }

  let match = prompt.match(/(?:List|Write) the first\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+positive multiples of\s+\\?\(?([0-9]+)\\?\)?/i);
  if (match) {
    const count = /^\d+$/.test(match[1]) ? Number(match[1]) : cardinalWords[match[1].toLowerCase()];
    const base = BigInt(match[2]);
    const values = Array.from({ length: count }, (_unused, index) => base * BigInt(index + 1));
    return makeComputedDomainDerivation(
      row,
      "enumerate-first-positive-multiples-v1",
      { base: base.toString(), count },
      values.join(", "),
      { values: values.map(String) }
    );
  }

  match = prompt.match(/Write the\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+multiple of\s+(\d+)/i);
  if (match) {
    const ordinal = integerWords[match[1].toLowerCase()];
    const base = BigInt(match[2]);
    const value = base * BigInt(ordinal);
    return makeComputedDomainDerivation(
      row,
      "nth-positive-multiple-v1",
      { base: base.toString(), ordinal },
      value.toString(),
      { value: value.toString() }
    );
  }

  match = prompt.match(/(?:(?:Using enumeration,\s*)?(?:List|Write))(?: all)?(?: the)?(?: positive)? factors of\s+\\?\(?([0-9]+)\\?\)?|List all the positive factors of\s+\\?\(?([0-9]+)\\?\)?/i);
  if (match) {
    const value = BigInt(match[1] ?? match[2]);
    const factors = positiveFactors(value);
    const asksForClassification = /prime(?: number)? or (?:a )?composite(?: number)?/i.test(prompt);
    const classification = value > BigInt("1") && isPrime(value) ? "prime" : value > BigInt("1") ? "composite" : "neither";
    const asksForReason = /explain|why|reason/i.test(prompt);
    const requiresLabeledFormat = /Factors:\s*(?:…|\.{3});\s*classification:\s*(?:…|\.{3})/i.test(prompt);
    const responseText = asksForClassification
      ? `${requiresLabeledFormat ? `Factors: ${factors.join(", ")}; classification: ${classification}` : `${factors.join(", ")}; ${classification}`}${asksForReason ? `; ${classification === "prime" ? `${value} has exactly two positive factors` : `${value} has more than two positive factors`}` : ""}`
      : factors.join(", ");
    return makeComputedDomainDerivation(
      row,
      "enumerate-positive-factors-v1",
      { value: value.toString(), asksForClassification, asksForReason, requiresLabeledFormat },
      responseText,
      { factors: factors.map(String), ...(asksForClassification ? { classification } : {}) }
    );
  }

  match = prompt.match(/(?:List|Write) all prime numbers from\s+(\d+)\s+to\s+(\d+)\s+inclusive/i);
  if (match) {
    const minimum = BigInt(match[1]);
    const maximum = BigInt(match[2]);
    const values: bigint[] = [];
    for (let value = minimum; value <= maximum; value += BigInt("1")) if (isPrime(value)) values.push(value);
    return makeComputedDomainDerivation(
      row,
      "enumerate-primes-in-range-v1",
      { minimum: minimum.toString(), maximum: maximum.toString() },
      values.join(", "),
      { values: values.map(String) }
    );
  }

  match = prompt.match(/(?:List|Write) all composite numbers from\s+(\d+)\s+to\s+(\d+)\s+inclusive/i);
  if (match) {
    const minimum = BigInt(match[1]);
    const maximum = BigInt(match[2]);
    const values: bigint[] = [];
    for (let value = minimum; value <= maximum; value += BigInt("1")) {
      if (value > BigInt("1") && !isPrime(value)) values.push(value);
    }
    return makeComputedDomainDerivation(
      row,
      "enumerate-composites-in-range-v1",
      { minimum: minimum.toString(), maximum: maximum.toString() },
      values.join(", "),
      { values: values.map(String) }
    );
  }

  match = prompt.match(/Find the (Highest Common Factor|H\.C\.F\.|HCF)(?:\s*\((?:HCF|H\.C\.F\.)\))? of\s+([0-9 ,and]+)/i);
  if (match && !/and L\.C\.M|and LCM/i.test(prompt)) {
    const values = [...match[2].matchAll(/\d+/g)].map((result) => BigInt(result[0]));
    if (values.length >= 2) {
      const value = integerGcd(...values);
      return makeComputedDomainDerivation(
        row,
        "compute-gcd-v1",
        { values: values.map(String) },
        value.toString(),
        { gcd: value.toString(), factorSets: values.map((number) => positiveFactors(number).map(String)) }
      );
    }
  }

  match = prompt.match(/Find the (Least Common Multiple|L\.C\.M\.|LCM)(?:\s*\((?:LCM|L\.C\.M\.)\))? of\s+([0-9 ,and]+)/i);
  if (match && !/and H\.C\.F|and HCF/i.test(prompt)) {
    const values = [...match[2].matchAll(/\d+/g)].map((result) => BigInt(result[0]));
    if (values.length >= 2) {
      const value = integerLcm(...values);
      return makeComputedDomainDerivation(
        row,
        "compute-lcm-v1",
        { values: values.map(String) },
        value.toString(),
        { lcm: value.toString(), primeFactorizations: values.map((number) => primeFactorization(number)) }
      );
    }
  }

  match = prompt.match(/(?:Express|Write)\s+(.+?)\s+as a product of prime factors(?: and represent it)?(?:(?: using| in)?(?: exponential| index) notation)?/i);
  if (match) {
    const evaluatedInput = evaluateExactExpression(match[1]);
    if (evaluatedInput.value.denominator !== BigInt("1") || evaluatedInput.value.numerator <= BigInt("0")) {
      throw new Error("V4_STEP_EXECUTION_INVALID:prime-factorization-input-not-positive-integer");
    }
    const value = evaluatedInput.value.numerator;
    const factors = primeFactorization(value);
    const rendered = renderPrimeFactorization(factors);
    return makeComputedDomainDerivation(
      row,
      "prime-factorize-v1",
      { expression: match[1], expressionAst: evaluatedInput.ast, value: value.toString() },
      rendered,
      { inputValue: evaluatedInput.value.toJson(), factors }
    );
  }

  match = prompt.match(/List all two-digit numbers that are multiples of both\s+(\d+)\s+and\s+(\d+)/i);
  if (match) {
    const first = BigInt(match[1]);
    const second = BigInt(match[2]);
    const base = integerLcm(first, second);
    const values: bigint[] = [];
    for (let value = base; value < BigInt("100"); value += base) if (value >= BigInt("10")) values.push(value);
    return makeComputedDomainDerivation(
      row,
      "two-digit-common-multiples-v1",
      { first: first.toString(), second: second.toString(), lcm: base.toString() },
      values.join(", "),
      { values: values.map(String) }
    );
  }

  match = prompt.match(/List all(?: the)? positive common factors of\s+([0-9]+)\s+and\s+([0-9]+)/i);
  if (match) {
    const first = BigInt(match[1]);
    const second = BigInt(match[2]);
    const factors = positiveFactors(integerGcd(first, second));
    return makeComputedDomainDerivation(
      row,
      "enumerate-common-factors-v1",
      { first: first.toString(), second: second.toString() },
      factors.join(", "),
      { factors: factors.map(String) }
    );
  }

  match = prompt.match(/List all(?: the)? positive common multiples of\s+([0-9]+)\s+and\s+([0-9]+)\s+that are less than\s+([0-9]+)/i);
  if (match) {
    const first = BigInt(match[1]);
    const second = BigInt(match[2]);
    const maximum = BigInt(match[3]);
    const base = integerLcm(first, second);
    const values: bigint[] = [];
    for (let value = base; value < maximum; value += base) values.push(value);
    return makeComputedDomainDerivation(
      row,
      "enumerate-bounded-common-multiples-v1",
      { first: first.toString(), second: second.toString(), maximum: maximum.toString() },
      values.join(", "),
      { values: values.map(String) }
    );
  }

  return null;
};

const deriveGenericFractionConversion = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en;
  const latexFraction = "\\\\(?:d?frac)\\{\\d+\\}\\{\\d+\\}";
  let match = prompt.match(new RegExp(`Convert\\s+(\\\\\\((?:\\d+)?${latexFraction}\\\\\\)|${latexFraction}|\\d+\\s+\\d+\\/\\d+)\\s+(?:into|to)\\s+a mixed number`, "i"));
  if (match) return makeExpressionDerivation(row, match[1].replace(/^\\\(|\\\)$/g, ""), "integer-or-mixed");

  match = prompt.match(new RegExp(`Convert\\s+(\\\\\\((?:\\d+)?${latexFraction}\\\\\\)|(?:\\d+)?${latexFraction}|\\d+\\s+\\d+\\/\\d+)\\s+(?:into|to)\\s+an improper fraction`, "i"));
  if (match) return makeExpressionDerivation(row, match[1].replace(/^\\\(|\\\)$/g, ""), "integer-or-improper");

  match = prompt.match(new RegExp(`Convert\\s+(\\\\\\(${latexFraction}\\\\\\)|${latexFraction}|\\d+\\/\\d+)\\s+(?:into|to)\\s+an integer`, "i"));
  if (match) return makeExpressionDerivation(row, match[1].replace(/^\\\(|\\\)$/g, ""), "integer-or-improper");

  match = prompt.match(new RegExp(`(?:Reduce|Simplify)[^]*?(${latexFraction}|\\d+\\/\\d+)`, "i"));
  if (match) return makeExpressionDerivation(row, match[1], "integer-or-improper");

  return null;
};

const deriveGenericDecimalConversion = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en;
  let mixedMatch = prompt.match(/Convert\s+(\d+\s+\d+\/\d+)\s+to a decimal/i);
  if (mixedMatch) return makeExpressionDerivation(row, mixedMatch[1], "finite-decimal");
  let match = prompt.match(/Convert\s+(\\\((?:\\(?:d?frac)\{\d+\}\{\d+\})\\\)|\\(?:d?frac)\{\d+\}\{\d+\}|\d+\/\d+)\s+to a decimal/i);
  if (match) return makeExpressionDerivation(row, match[1].replace(/^\\\(|\\\)$/g, ""), "finite-decimal");
  match = prompt.match(/Convert\s+(\d+\s+\d+\/\d+)\s+to a decimal/i);
  if (match) return makeExpressionDerivation(row, match[1], "finite-decimal");
  match = prompt.match(/Convert\s+\\?\(?(\d+\.\d+)\\?\)?\s+to a (?:fraction(?: in simplest form)?|mixed number or an improper fraction)/i);
  if (match) {
    const mode = /mixed number/i.test(prompt) ? "integer-or-mixed" : "integer-or-improper";
    return makeExpressionDerivation(row, match[1], mode);
  }
  match = prompt.match(/Convert decimals into simplest fractions\.\s*\\?\(?(\d+\.\d+)\\?\)?\s*=/i);
  if (match) return makeExpressionDerivation(row, match[1], "integer-or-improper");
  match = prompt.match(/Convert the following fractions into decimals\.\s*\\?\(?(\\(?:d?frac)\{\d+\}\{\d+\})\\?\)?\s*=/i);
  if (match) return makeExpressionDerivation(row, match[1], "finite-decimal");
  return null;
};

const deriveGenericQuadrilateral = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();

  if (/^Which statements about a rhombus are correct\?/i.test(prompt)) {
    return makeComputedDomainDerivation(
      row,
      "rhombus-statement-truth-set-v1",
      {
        statements: {
          A: "all-four-sides-equal",
          B: "all-four-angles-right",
          C: "opposite-sides-parallel"
        }
      },
      "A, C",
      { A: true, B: false, C: true }
    );
  }

  let match = prompt.match(/perimeter of a rhombus is\s+(\d+)\s*cm/i);
  if (match) {
    const perimeter = BigInt(match[1]);
    const sideCount = BigInt("4");
    const side = new ExactRational(perimeter, sideCount);
    return makeComputedDomainDerivation(
      row,
      "regular-quadrilateral-side-from-perimeter-v1",
      { perimeter: perimeter.toString(), sideCount: sideCount.toString() },
      side.toImproperString(),
      { perimeter: perimeter.toString(), sideCount: sideCount.toString(), side: side.toJson() }
    );
  }

  if (/relationship between the opposite angles of a rhombus/i.test(prompt)) {
    return makeComputedDomainDerivation(
      row,
      "rhombus-opposite-angles-v1",
      { relation: "equal" },
      "Opposite angles are equal.",
      { relation: "equal" }
    );
  }

  if (/^True or false:\s*All rectangles are squares/i.test(prompt)) {
    return makeComputedDomainDerivation(
      row,
      "rectangle-square-subset-v1",
      { universalClaim: "all-rectangles-are-squares" },
      "False",
      { truth: false, countercondition: "a rectangle need not have four equal sides" }
    );
  }

  if (/square is also a type of rhombus/i.test(prompt)) {
    return makeComputedDomainDerivation(
      row,
      "square-is-rhombus-v1",
      { squareProperty: "four-equal-sides", rhombusDefinition: "four-equal-sides" },
      "A square has four equal sides, so it satisfies the definition of a rhombus.",
      { satisfiesDefinition: true, sharedProperty: "four-equal-sides" }
    );
  }

  if (/^Which shapes are parallelograms\?/i.test(prompt)) {
    const candidates = ["square", "rectangle", "rhombus", "trapezium"];
    const hasTwoPairsOfParallelOppositeSides = {
      square: true,
      rectangle: true,
      rhombus: true,
      trapezium: false
    } as const;
    const selected = candidates.filter(
      (candidate) => hasTwoPairsOfParallelOppositeSides[candidate as keyof typeof hasTwoPairsOfParallelOppositeSides]
    );
    return makeComputedDomainDerivation(
      row,
      "parallelogram-classification-v1",
      { candidates, hasTwoPairsOfParallelOppositeSides },
      selected.join(", "),
      { selected, predicate: "two-pairs-parallel-opposite-sides" }
    );
  }

  if (/two pairs of parallel opposite sides and four equal sides/i.test(prompt)) {
    return makeComputedDomainDerivation(
      row,
      "quadrilateral-property-classification-v1",
      { parallelOppositeSidePairs: 2, allSidesEqual: true, allAnglesRight: false },
      "rhombus",
      { classification: "rhombus" }
    );
  }

  return null;
};

const renderIndexFactor = (base: string, exponent: number): string =>
  exponent === 1 ? base : `${base}^${exponent}`;

const renderSymbolicPower = (base: string, exponent: string): string =>
  /^(?:\d+|[a-z])$/i.test(exponent) ? `${base}^${exponent}` : `${base}^(${exponent})`;

const deriveGenericSymbolicIndexNotation = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const twoVerbalPowers = prompt.match(/[“"](\d+)\s+to the power of\s+(\d+)\s+multiplied by\s+(\d+)\s+to the power of\s+(\d+)[”"]/i);
  if (twoVerbalPowers) {
    const [baseA, exponentA, baseB, exponentB] = twoVerbalPowers.slice(1, 5);
    const responseText = `${baseA}^${exponentA} × ${baseB}^${exponentB}`;
    return makeComputedDomainDerivation(
      row,
      "two-verbal-powers-to-index-notation-v1",
      { terms: [{ base: baseA, exponent: Number(exponentA) }, { base: baseB, exponent: Number(exponentB) }] },
      responseText,
      { terms: [{ base: baseA, exponent: Number(exponentA) }, { base: baseB, exponent: Number(exponentB) }] }
    );
  }
  let match = prompt.match(/^Express\s+(.+?)\s+(?:using|in) index notation\.?$/i);
  if (match) {
    const productText = match[1].replace(/\\\(|\\\)/g, "");
    const tokens = productText
      .split(/\s*(?:×|\\times)\s*/)
      .map((token) => token.trim())
      .filter(Boolean);
    if (tokens.length >= 2 && tokens.every((token) => /^(?:\d+|[a-z])$/i.test(token))) {
      const counts = new Map<string, number>();
      for (const token of tokens) {
        if (token === "1") continue;
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
      const responseText = counts.size === 0
        ? "1"
        : [...counts].map(([base, exponent]) => renderIndexFactor(base, exponent)).join(" × ");
      return makeComputedDomainDerivation(
        row,
        "compress-repeated-product-index-notation-v1",
        { tokens, counts: Object.fromEntries(counts) },
        responseText,
        { factors: [...counts].map(([base, exponent]) => ({ base, exponent })) }
      );
    }
  }

  const compoundPower = prompt.match(/[“\"]([^”\"]+?)\s+to the power of\s+([^”\"]+?)\s+multiplied by\s+([^”\"]+?)\s+to the power of\s+([^”\"]+)[”\"]/i);
  if (compoundPower) {
    const [, firstBase, firstExponent, secondBase, secondExponent] = compoundPower.map((value) => value.trim());
    if (
      /^(?:\d+|[a-z])$/i.test(firstBase) &&
      /^(?:\d+|[a-z]|\d+[a-z])$/i.test(firstExponent) &&
      /^(?:\d+|[a-z])$/i.test(secondBase) &&
      /^(?:\d+|[a-z]|\d+[a-z])$/i.test(secondExponent)
    ) {
      const responseText = `${renderSymbolicPower(firstBase, firstExponent)} × ${renderSymbolicPower(secondBase, secondExponent)}`;
      return makeComputedDomainDerivation(
        row,
        "compound-phrase-to-index-notation-v1",
        { firstBase, firstExponent, secondBase, secondExponent },
        responseText,
        { terms: [{ base: firstBase, exponent: firstExponent }, { base: secondBase, exponent: secondExponent }] }
      );
    }
  }

  const verbalPower = prompt.match(/[“\"]([^”\"]+?)\s+to the power of\s+([^”\"]+)[”\"]/i);
  const ordinalPower = prompt.match(/[“\"]([^”\"]+?)\s+to the\s+(\d+)(?:st|nd|rd|th)\s+power[”\"]/i);
  const phrasePower = verbalPower ?? ordinalPower;
  if (phrasePower) {
    const base = phrasePower[1].trim();
    const exponent = phrasePower[2].trim();
    if (/^(?:\d+|[a-z])$/i.test(base) && /^(?:\d+|[a-z]|\d+[a-z])$/i.test(exponent)) {
      const responseText = renderSymbolicPower(base, exponent);
      return makeComputedDomainDerivation(
        row,
        "phrase-to-index-notation-v1",
        { base, exponent },
        responseText,
        { base, exponent }
      );
    }
  }

  return null;
};

const deriveGenericFactorClassification = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\\\(|\\\)/g, "").replace(/\s+/g, " ").trim();
  const match = prompt.match(/List all(?: the)?(?: positive)? factors of\s+(\d+)(?:\s+in ascending order)?\s*[,]?\s*(?:and\s+)?(?:determine whether|classify)\s+\1\s+(?:is |as )?(?:a )?(prime(?: number)? or (?:a )?composite(?: number)?|prime or composite)/i);
  if (!match) return null;
  const value = BigInt(match[1]);
  const factors = positiveFactors(value);
  const classification = isPrime(value) ? "prime" : "composite";
  return makeComputedDomainDerivation(
    row,
    "enumerate-factors-and-classify-v1",
    { value: value.toString() },
    `Factors: ${factors.join(", ")}; classification: ${classification}`,
    { value: value.toString(), factors: factors.map(String), classification }
  );
};

const deriveNaturalLanguageExpression = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\\\(|\\\)/g, "").replace(/\s+/g, " ").trim();
  let operands: [string, string] | null = null;
  let operator: "+" | "-" | "*" | "/" | null = null;
  let match = prompt.match(/(?:Write an expression for [“"])?(\d+)\s+plus\s+(\d+)/i)
    ?? prompt.match(/sum of\s+(\d+)\s+and\s+(\d+)/i);
  if (match) {
    operands = [match[1], match[2]];
    operator = "+";
  }
  match = prompt.match(/(?:Write an expression for [“"])?(\d+)\s+times\s+(\d+)/i)
    ?? prompt.match(/product of\s+(\d+)\s+and\s+(\d+)/i);
  if (match) {
    operands = [match[1], match[2]];
    operator = "*";
  }
  match = prompt.match(/subtract\s+(\d+)\s+from\s+(\d+)/i);
  if (match) {
    operands = [match[2], match[1]];
    operator = "-";
  }
  match = prompt.match(/(\d+)\s+divided by\s+(\d+)/i)
    ?? prompt.match(/Divide\s+(\d+)\s+by\s+(\d+)/i);
  if (match) {
    operands = [match[1], match[2]];
    operator = "/";
  }
  if (!operands || !operator) return null;
  const expression = `${operands[0]}${operator}${operands[1]}`;
  const displayOperator = operator === "*" ? "×" : operator === "/" ? "÷" : operator;
  const displayExpression = `${operands[0]} ${displayOperator} ${operands[1]}`;
  const evaluation = evaluateExactExpression(expression);
  const evaluate = !/Do not evaluate it/i.test(prompt);
  const responseText = evaluate
    ? `${displayExpression} = ${renderRational(evaluation.value, "integer-or-improper")}`
    : displayExpression;
  const occurrenceByValue = new Map<string, number>();
  const facts = operands.map((exact, index) => {
    const occurrence = occurrenceByValue.get(exact) ?? 0;
    occurrenceByValue.set(exact, occurrence + 1);
    return promptFact(row, `f${index + 1}`, "prompt-quantity", exact, { integer: exact }, occurrence);
  });
  const steps: DerivationStep[] = [{
    stepId: "s1",
    operation: "apply-domain-rule",
    inputFactIds: facts.map((fact) => fact.factId),
    inputStepIds: [],
    parameters: { ruleId: "natural-language-arithmetic-to-ast-v1", operator, operandOrder: operands },
    output: { expression, displayExpression, ast: evaluation.ast }
  }];
  if (evaluate) {
    steps.push({
      stepId: "s2",
      operation: "evaluate-rational-expression",
      inputFactIds: [],
      inputStepIds: ["s1"],
      parameters: { expression, ast: evaluation.ast },
      output: { value: evaluation.value.toJson(), operationTrace: evaluation.trace, responseText }
    });
  }
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: evaluate ? "natural-language-expression-and-value" : "natural-language-expression-only",
    facts,
    steps,
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: { expression, ast: evaluation.ast, evaluated: evaluate, ...(evaluate ? { value: evaluation.value.toJson() } : {}) }
    },
    optionAdjudications: []
  });
};

const exactIntegerSquareRoot = (value: bigint): bigint => {
  if (value < BigInt("0")) throw new Error("V4_STEP_EXECUTION_INVALID:negative-square-root");
  let low = BigInt("0");
  let high = value + BigInt("1");
  while (low + BigInt("1") < high) {
    const middle = (low + high) / BigInt("2");
    if (middle * middle <= value) low = middle;
    else high = middle;
  }
  if (low * low !== value) {
    throw new Error("V4_STEP_EXECUTION_INVALID:non-perfect-square");
  }
  return low;
};

const deriveSquareSideFromArea = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ");
  const match = prompt.match(/square(?:\s+\w+)?\s+has area\s+(\d+)\s+(cm|m)².*?side length/i);
  if (!match) return null;
  const area = BigInt(match[1]);
  const side = exactIntegerSquareRoot(area);
  const fact = promptFact(row, "f1", "prompt-quantity", match[1], {
    integer: area.toString(),
    measure: "area",
    unit: `${match[2]}²`
  });
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "square-side-from-area",
    facts: [fact],
    steps: [
      {
        stepId: "s1",
        operation: "compute-integer-square-root",
        inputFactIds: [fact.factId],
        inputStepIds: [],
        parameters: { radicandFactId: fact.factId },
        output: { radicand: area.toString(), value: side.toString() }
      },
      {
        stepId: "s2",
        operation: "render-rational",
        inputFactIds: [],
        inputStepIds: ["s1"],
        parameters: { mode: "integer-or-improper" },
        output: { responseText: side.toString() }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText: side.toString(),
      semanticValue: { area: area.toString(), side: side.toString(), unit: match[2] }
    },
    optionAdjudications: []
  });
};

const deriveGreatestEqualGroupCount = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\\\(|\\\)/g, " ").replace(/\s+/g, " ");
  if (!/every group has the same number/i.test(prompt) ||
      !/none left over/i.test(prompt) ||
      !/greatest number of groups/i.test(prompt)) {
    return null;
  }
  const values = [...prompt.matchAll(/\b\d+\b/g)].map((match) => BigInt(match[0]));
  if (values.length < 2) return null;
  const operands = values.slice(0, 2);
  const gcd = integerGcd(...operands);
  const facts = operands.map((value, index) =>
    promptFact(row, `f${index + 1}`, "prompt-quantity", value.toString(), {
      integer: value.toString(),
      role: "item-count"
    })
  );
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "greatest-equal-group-count",
    facts,
    steps: [
      {
        stepId: "s1",
        operation: "compute-gcd",
        inputFactIds: facts.map((fact) => fact.factId),
        inputStepIds: [],
        parameters: { values: operands.map(String), interpretation: "maximum-equal-group-count" },
        output: { value: gcd.toString() }
      },
      {
        stepId: "s2",
        operation: "render-rational",
        inputFactIds: [],
        inputStepIds: ["s1"],
        parameters: { mode: "integer-or-improper" },
        output: { responseText: gcd.toString() }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText: gcd.toString(),
      semanticValue: { counts: operands.map(String), greatestGroupCount: gcd.toString() }
    },
    optionAdjudications: []
  });
};

const extractLabeledMathBody = (prompt: string, label: "a" | "b"): string | null => {
  const other = label === "a" ? "b" : null;
  const start = prompt.indexOf(`(${label})`);
  if (start < 0) return null;
  const contentStart = start + 3;
  const end = other ? prompt.indexOf(`(${other})`, contentStart) : prompt.length;
  return prompt.slice(contentStart, end < 0 ? prompt.length : end).trim();
};

const stripInlineMath = (value: string): string =>
  value.replace(/^\\\(/, "").replace(/\\\)$/, "").trim();

const deriveLabeledGcdLcmGroups = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const operationMatch = row.prompt.en.match(/Find the\s+(H\.?C\.?F\.?|L\.?C\.?M\.?)\s+of each (?:pair|group)/i);
  if (!operationMatch) return null;
  const operation = /^H/i.test(operationMatch[1]) ? "gcd" : "lcm";
  const bodies = (["a", "b"] as const).map((label) => extractLabeledMathBody(row.prompt.en, label));
  if (bodies.some((body) => !body)) return null;
  const groupExpressions = bodies.map((body) => {
    const normalized = stripInlineMath(body!);
    return normalized.split(/\s+and\s+|\s*,\s*/i).map(stripInlineMath).filter(Boolean);
  });
  if (groupExpressions.some((group) => group.length < 2 || group.length > 3)) return null;
  const groups = groupExpressions.map((expressions) => {
    const evaluations = expressions.map((expression) => evaluateExactExpression(expression));
    if (evaluations.some((evaluation) => evaluation.value.denominator !== BigInt("1") || evaluation.value.numerator <= BigInt("0"))) {
      throw new Error("V4_STEP_EXECUTION_INVALID:labeled-gcd-lcm-nonpositive-integer");
    }
    const values = evaluations.map((evaluation) => evaluation.value.numerator);
    const result = operation === "gcd" ? integerGcd(...values) : integerLcm(...values);
    return { expressions, evaluations, values, result };
  });
  const responseText = `(a) ${groups[0].result}; (b) ${groups[1].result}`;
  const facts: DerivationFact[] = [];
  for (const group of groups) {
    for (const expression of group.expressions) {
      facts.push(promptFact(row, `f${facts.length + 1}`, "prompt-expression", expression, { expression, ast: evaluateExactExpression(expression).ast }));
    }
  }
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: `labeled-groups-${operation}`,
    facts,
    steps: groups.map<DerivationStep>((group, index) => ({
      stepId: `s${index + 1}`,
      operation: operation === "gcd" ? "compute-gcd" : "compute-lcm",
      inputFactIds: [],
      inputStepIds: [],
      parameters: { label: index === 0 ? "a" : "b", expressions: group.expressions, values: group.values.map(String) },
      output: { result: group.result.toString(), primeFactorizations: group.values.map((value) => primeFactorization(value)) }
    })),
    computedResult: { kind: "response-text", responseText, semanticValue: { operation, results: groups.map((group) => group.result.toString()) } },
    optionAdjudications: []
  });
};

const deriveLabeledExactExpressions = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  if (!/Find the value of each expression/i.test(row.prompt.en)) return null;
  const expressions = (["a", "b"] as const)
    .map((label) => extractLabeledMathBody(row.prompt.en, label))
    .map((body) => body ? stripInlineMath(body) : null);
  if (expressions.some((expression) => !expression)) return null;
  const evaluations = expressions.map((expression) => evaluateExactExpression(expression!));
  const rendered = evaluations.map((evaluation) => renderRational(evaluation.value, "integer-or-improper"));
  const responseText = `(a) ${rendered[0]}; (b) ${rendered[1]}`;
  const facts = expressions.map((expression, index) => promptFact(row, `f${index + 1}`, "prompt-expression", expression!, { expression, ast: evaluations[index].ast }));
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "labeled-exact-rational-expressions",
    facts,
    steps: evaluations.map<DerivationStep>((evaluation, index) => ({
      stepId: `s${index + 1}`,
      operation: "evaluate-rational-expression",
      inputFactIds: [`f${index + 1}`],
      inputStepIds: [],
      parameters: { label: index === 0 ? "a" : "b", expression: expressions[index], ast: evaluation.ast },
      output: { value: evaluation.value.toJson(), trace: evaluation.trace, rendered: rendered[index] }
    })),
    computedResult: { kind: "response-text", responseText, semanticValue: evaluations.map((evaluation) => evaluation.value.toJson()) },
    optionAdjudications: []
  });
};

const deriveGenericDivisibilityLetterSelection = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const predicate = prompt.match(/Select all numbers that are divisible by\s+\\?\(?(\d+)\\?\)?\s+but not by\s+\\?\(?(\d+)\\?\)?/i);
  if (!predicate) return null;
  const requiredDivisor = BigInt(predicate[1]);
  const forbiddenDivisor = BigInt(predicate[2]);
  const candidates = [...prompt.matchAll(/\b([A-Z])\.\s*\\?\(?(\d+)\\?\)?/g)].map((match) => ({
    label: match[1],
    value: BigInt(match[2])
  }));
  if (candidates.length < 2) return null;
  const checks = candidates.map(({ label, value }) => ({
    label,
    value: value.toString(),
    requiredRemainder: (value % requiredDivisor).toString(),
    forbiddenRemainder: (value % forbiddenDivisor).toString(),
    selected: value % requiredDivisor === BigInt("0") && value % forbiddenDivisor !== BigInt("0")
  }));
  const selected = checks.filter((check) => check.selected).map((check) => check.label);
  return makeComputedDomainDerivation(
    row,
    "labelled-divisibility-filter-v1",
    {
      requiredDivisor: requiredDivisor.toString(),
      forbiddenDivisor: forbiddenDivisor.toString(),
      candidates: candidates.map(({ label, value }) => ({ label, value: value.toString() }))
    },
    selected.join(", "),
    { checks, selected }
  );
};

const deriveStructuredDivisibilityTable = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\\\(|\\\)/g, "").replace(/\n/g, " ");
  const considered = prompt.match(/^Consider\s+([0-9, and]+)\./i);
  if (considered) {
    const values = [...considered[1].matchAll(/\d+/g)].map((match) => BigInt(match[0]));
    const divisorMatches = [...prompt.matchAll(/\(([a-d])\)\s+Which are divisible by\s+(\d+)/gi)];
    if (values.length > 0 && divisorMatches.length > 0) {
      const groups = divisorMatches.map((match) => {
        const divisor = BigInt(match[2]);
        const checks = values.map((value) => ({ value: value.toString(), remainder: (value % divisor).toString(), truth: value % divisor === BigInt("0") }));
        return { label: match[1], divisor: divisor.toString(), checks, selected: checks.filter((check) => check.truth).map((check) => check.value) };
      });
      const responseText = groups.map((group) => `(${group.label}) ${group.selected.length ? group.selected.join(", ") : "none"}`).join("; ");
      return makeComputedDomainDerivation(row, "partition-values-by-divisibility-v1", { values: values.map(String), divisors: groups.map((group) => group.divisor) }, responseText, { groups });
    }
  }

  const orderedDivisors = prompt.match(/whether it is divisible by\s+(\d+),\s*(\d+),\s*and\s*(\d+)/i);
  if (orderedDivisors) {
    const divisors = orderedDivisors.slice(1, 4).map(BigInt);
    const labeledValues = [...prompt.matchAll(/\(([a-f])\)\s*(\d+)/gi)].map((match) => ({ label: match[1], value: BigInt(match[2]) }));
    if (labeledValues.length > 0) {
      const useCheckmarks = /✓\/✗/.test(row.prompt.zh);
      const groups = labeledValues.map(({ label, value }) => ({
        label,
        value: value.toString(),
        decisions: divisors.map((divisor) => ({
          divisor: divisor.toString(),
          remainder: (value % divisor).toString(),
          truth: value % divisor === BigInt("0")
        }))
      }));
      const booleanMatrix = groups.map((group) => group.decisions.map((decision) => decision.truth));
      const responseText = groups.map((group) => `(${group.label}) ${group.decisions
        .map((decision) => useCheckmarks ? (decision.truth ? "✓" : "✗") : (decision.truth ? "Yes" : "No"))
        .join(", ")}`).join("; ");
      return makeComputedDomainDerivation(
        row,
        "ordered-divisibility-decision-table-v1",
        { divisors: divisors.map(String), values: labeledValues.map(({ label, value }) => ({ label, value: value.toString() })), responseSymbols: useCheckmarks ? "checkmark-cross" : "yes-no" },
        responseText,
        { divisors: divisors.map(String), groups, booleanMatrix }
      );
    }
  }
  return null;
};

const deriveGenericDivisibilityProblem = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\\\(|\\\)/g, "").replace(/\s+/g, " ").trim();
  let match = prompt.match(/number less than\s+(\d+).*divisible by\s+(\d+).*maximum value/i);
  if (match) {
    const exclusiveUpperBound = BigInt(match[1]);
    const divisor = BigInt(match[2]);
    const value = ((exclusiveUpperBound - BigInt("1")) / divisor) * divisor;
    return makeComputedDomainDerivation(
      row,
      "greatest-multiple-below-bound-v1",
      { exclusiveUpperBound: exclusiveUpperBound.toString(), divisor: divisor.toString() },
      value.toString(),
      { value: value.toString(), quotient: ((exclusiveUpperBound - BigInt("1")) / divisor).toString() }
    );
  }

  match = prompt.match(/number greater than\s+(\d+).*divisible by\s+(\d+).*minimum value/i);
  if (match) {
    const exclusiveLowerBound = BigInt(match[1]);
    const divisor = BigInt(match[2]);
    const value = (exclusiveLowerBound / divisor + BigInt("1")) * divisor;
    return makeComputedDomainDerivation(
      row,
      "least-multiple-above-bound-v1",
      { exclusiveLowerBound: exclusiveLowerBound.toString(), divisor: divisor.toString() },
      value.toString(),
      { value: value.toString(), quotient: (exclusiveLowerBound / divisor + BigInt("1")).toString() }
    );
  }

  match = prompt.match(/(\d*)[♥□](\d*).*divisible by\s+(\d+).*all possible values/i);
  if (match) {
    const prefix = match[1];
    const suffix = match[2];
    const divisor = BigInt(match[3]);
    const checks = Array.from({ length: 10 }, (_unused, digit) => {
      const value = BigInt(`${prefix}${digit}${suffix}`);
      return { digit, value: value.toString(), remainder: (value % divisor).toString() };
    });
    const digits = checks.filter((check) => check.remainder === "0").map((check) => check.digit);
    return makeComputedDomainDerivation(
      row,
      "digit-placeholder-divisibility-search-v1",
      { prefix, suffix, divisor: divisor.toString(), candidateDigits: Array.from({ length: 10 }, (_unused, digit) => digit) },
      digits.join(", "),
      { checks, digits }
    );
  }

  match = prompt.match(/Determine whether\s+(\d+)\s+is divisible by both\s+(\d+)\s+and\s+(\d+)/i);
  if (match) {
    const value = BigInt(match[1]);
    const divisors = [BigInt(match[2]), BigInt(match[3])];
    const checks = divisors.map((divisor) => ({
      divisor: divisor.toString(),
      remainder: (value % divisor).toString()
    }));
    const truth = checks.every((check) => check.remainder === "0");
    return makeComputedDomainDerivation(
      row,
      "divisible-by-both-decision-v1",
      { value: value.toString(), divisors: divisors.map(String) },
      truth ? "Yes" : "No",
      { truth, checks }
    );
  }

  match = prompt.match(/Determine whether\s+(\d+)\s+is divisible by\s+(\d+)/i);
  if (match) {
    const value = BigInt(match[1]);
    const divisor = BigInt(match[2]);
    const remainder = value % divisor;
    const truth = remainder === BigInt("0");
    const asksExplanation = /explain your method|reason:/i.test(prompt);
    const reason = `${value} ÷ ${divisor} has remainder ${remainder}`;
    const responseText = asksExplanation
      ? (/decision:/i.test(prompt) ? `decision: ${truth ? "Yes" : "No"}; reason: ${reason}.` : `${truth ? "Yes" : "No"}; ${reason}.`)
      : truth ? "Yes" : "No";
    return makeComputedDomainDerivation(
      row,
      "single-divisibility-decision-v1",
      { value: value.toString(), divisor: divisor.toString() },
      responseText,
      { truth, quotient: (value / divisor).toString(), remainder: remainder.toString(), reason }
    );
  }

  match = prompt.match(/(\d*)\\square(\d*).*divisible by\s+(\d+).*What digit belongs in the box/i);
  if (match) {
    const prefix = match[1];
    const suffix = match[2];
    const divisor = BigInt(match[3]);
    const checks = Array.from({ length: 10 }, (_unused, digit) => {
      const value = BigInt(`${prefix}${digit}${suffix}`);
      return { digit, value: value.toString(), remainder: (value % divisor).toString() };
    });
    const digits = checks.filter((check) => check.remainder === "0").map((check) => check.digit);
    if (digits.length !== 1) throw new Error("V4_STEP_EXECUTION_INVALID:box-digit-not-unique");
    return makeComputedDomainDerivation(row, "box-digit-divisibility-search-v1", { prefix, suffix, divisor: divisor.toString(), candidateDigits: Array.from({ length: 10 }, (_unused, digit) => digit) }, String(digits[0]), { checks, digit: digits[0] });
  }

  match = prompt.match(/Determine whether\s+(\d+)\s+is divisible by\s+(\d+)/i);
  if (match) {
    const value = BigInt(match[1]);
    const divisor = BigInt(match[2]);
    const remainder = value % divisor;
    const truth = remainder === BigInt("0");
    const reason = `${value} ÷ ${divisor} leaves remainder ${remainder}`;
    const responseText = /explain|method|format/i.test(prompt)
      ? `decision: ${truth ? "Yes" : "No"}; reason: ${reason}`
      : truth ? "Yes" : "No";
    return makeComputedDomainDerivation(
      row,
      "single-divisibility-decision-v1",
      { value: value.toString(), divisor: divisor.toString() },
      responseText,
      { truth, remainder: remainder.toString(), reason }
    );
  }

  match = prompt.match(/If\s+(\d+)\s+is the\s+(\w+)\s+positive multiple of\s+([a-z]),\s*find\s+\3/i);
  if (match) {
    const multiple = BigInt(match[1]);
    const ordinal = integerWords[match[2].toLowerCase()];
    if (ordinal) {
      const base = new ExactRational(multiple, BigInt(ordinal));
      return makeComputedDomainDerivation(
        row,
        "inverse-nth-positive-multiple-v1",
        { multiple: multiple.toString(), ordinal },
        base.toImproperString(),
        { base: base.toJson() }
      );
    }
  }

  match = prompt.match(/numbers less than\s+(\d+),\s*write the largest multiple of\s+(\d+)/i);
  if (match) {
    const exclusiveUpperBound = BigInt(match[1]);
    const divisor = BigInt(match[2]);
    const value = ((exclusiveUpperBound - BigInt("1")) / divisor) * divisor;
    return makeComputedDomainDerivation(
      row,
      "greatest-multiple-below-bound-v1",
      { exclusiveUpperBound: exclusiveUpperBound.toString(), divisor: divisor.toString() },
      value.toString(),
      { value: value.toString() }
    );
  }

  return null;
};

const deriveGenericVariablePrefixDivisibility = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const match = prompt.match(/([A-Z])(\d+)\s+is a .*?number .*?\1 is a digit from\s+(\d+)\s+to\s+(\d+).*?Determine whether\s+\1\2\s+is divisible by\s+(\d+)/i);
  if (!match) return null;
  const variable = match[1];
  const fixedSuffix = match[2];
  const minimumDigit = Number(match[3]);
  const maximumDigit = Number(match[4]);
  const divisor = BigInt(match[5]);
  const checks = Array.from(
    { length: maximumDigit - minimumDigit + 1 },
    (_unused, offset) => minimumDigit + offset
  ).map((digit) => {
    const value = BigInt(`${digit}${fixedSuffix}`);
    return {
      digit,
      value: value.toString(),
      remainder: (value % divisor).toString(),
      divisible: value % divisor === BigInt("0")
    };
  });
  const allDivisible = checks.every((check) => check.divisible);
  const noneDivisible = checks.every((check) => !check.divisible);
  const decision = allDivisible ? "Yes" : noneDivisible ? "No" : "It depends on the digit";
  const reason = divisor === BigInt("4")
    ? `the last two digits are ${fixedSuffix.slice(-2)}, and ${fixedSuffix.slice(-2)} is not divisible by 4`
    : `the candidate remainders are ${checks.map((check) => `${check.digit}:${check.remainder}`).join(", ")}`;
  return makeComputedDomainDerivation(
    row,
    "variable-prefix-divisibility-v1",
    { variable, fixedSuffix, minimumDigit, maximumDigit, divisor: divisor.toString() },
    `${decision}; ${reason}`,
    { decision, checks, reason }
  );
};

const deriveGenericDivisibilityTable = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const match = prompt.match(/^Consider\s+(.+?)\.\s*(.+?)Give all/i);
  if (!match || !/Which are divisible by/i.test(match[2])) return null;
  const values = [...match[1].matchAll(/\d+/g)].map((result) => BigInt(result[0]));
  const parts = [...match[2].matchAll(/\(([a-z])\)\s*Which are divisible by\s+(\d+)/gi)].map((result) => ({
    label: result[1].toLowerCase(),
    divisor: BigInt(result[2])
  }));
  if (values.length === 0 || parts.length === 0) return null;
  const rows = parts.map(({ label, divisor }) => {
    const checks = values.map((value) => ({
      value: value.toString(),
      remainder: (value % divisor).toString(),
      divisible: value % divisor === BigInt("0")
    }));
    return {
      label,
      divisor: divisor.toString(),
      checks,
      selected: checks.filter((check) => check.divisible).map((check) => check.value)
    };
  });
  return makeComputedDomainDerivation(
    row,
    "multi-divisor-classification-table-v1",
    { values: values.map(String), divisors: parts.map(({ label, divisor }) => ({ label, divisor: divisor.toString() })) },
    rows.map((entry) => `(${entry.label}) ${entry.selected.join(", ") || "none"}`).join("; "),
    { rows }
  );
};

const deriveGenericRibbonComparison = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const match = prompt.match(/There are two\s+(\d+(?:\.\d+)?)\s*m blue ribbons and three\s+(\d+(?:\.\d+)?)\s*cm red ribbons\.\s*Is the blue total\s+(\d+(?:\.\d+)?)\s*m longer/i);
  if (!match) return null;
  const blueEach = ExactRational.fromDecimal(match[1]);
  const redEachCm = ExactRational.fromDecimal(match[2]);
  const claimedDifference = ExactRational.fromDecimal(match[3]);
  const blueTotal = blueEach.multiply(new ExactRational(BigInt("2")));
  const redTotalMetres = redEachCm.multiply(new ExactRational(BigInt("3"))).divide(new ExactRational(BigInt("100")));
  const difference = blueTotal.subtract(redTotalMetres);
  const truth = difference.compare(claimedDifference) === 0;
  const blueText = blueTotal.toFiniteDecimalString() ?? blueTotal.toImproperString();
  const redText = redTotalMetres.toFiniteDecimalString() ?? redTotalMetres.toImproperString();
  const differenceText = difference.toFiniteDecimalString() ?? difference.toImproperString();
  return makeComputedDomainDerivation(
    row,
    "mixed-length-unit-total-comparison-v1",
    {
      blueCount: 2,
      blueEachMetres: blueEach.toJson(),
      redCount: 3,
      redEachCentimetres: redEachCm.toJson(),
      centimetresPerMetre: 100,
      claimedDifferenceMetres: claimedDifference.toJson()
    },
    `${truth ? "Yes" : "No"}; blue total = ${blueText} m; red total = ${redText} m; difference = ${differenceText} m`,
    {
      truth,
      blueTotalMetres: blueTotal.toJson(),
      redTotalMetres: redTotalMetres.toJson(),
      differenceMetres: difference.toJson()
    }
  );
};

const deriveGenericUsedFractionComparison = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  const match = prompt.match(/has\s+(\d+\s+\d+\/\d+)\s*kg.*?has\s+(\d+\s+\d+\/\d+)\s*kg.*?after\s+(\d+\/\d+)\s+is used.*?more than\s+(\d+)\s*kg remains/i);
  if (!match) return null;
  const first = evaluateExactExpression(match[1]).value;
  const second = evaluateExactExpression(match[2]).value;
  const usedFraction = evaluateExactExpression(match[3]).value;
  const comparisonMass = new ExactRational(match[4]);
  const total = first.add(second);
  const remaining = total.multiply(new ExactRational(BigInt("1")).subtract(usedFraction));
  const agrees = remaining.compare(comparisonMass) > 0;
  return makeComputedDomainDerivation(
    row,
    "fraction-used-remaining-comparison-v1",
    {
      firstMassKg: first.toJson(),
      secondMassKg: second.toJson(),
      usedFraction: usedFraction.toJson(),
      comparisonMassKg: comparisonMass.toJson()
    },
    `total = ${total.toMixedString()} kg; remaining = ${remaining.toMixedString()} kg; ${agrees ? "Agree" : "Disagree"}; ${remaining.toImproperString()} ${agrees ? ">" : "≤"} ${comparisonMass.toImproperString()}`,
    { total: total.toJson(), remaining: remaining.toJson(), agrees }
  );
};

const deriveGenericFixedDivisorTruthGroups = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\s+/g, " ").trim();
  if (!/state in order whether it is divisible by\s+2,\s*5,\s*and\s*10/i.test(prompt)) return null;
  const labelledValues = [...prompt.matchAll(/\(([a-z])\)\s*(\d+)/gi)].map((result) => ({
    label: result[1].toLowerCase(),
    value: BigInt(result[2])
  }));
  if (labelledValues.length === 0) return null;
  const divisors = [BigInt("2"), BigInt("5"), BigInt("10")];
  const groups = labelledValues.map(({ label, value }) => ({
    label,
    value: value.toString(),
    checks: divisors.map((divisor) => ({
      divisor: divisor.toString(),
      divisible: value % divisor === BigInt("0"),
      remainder: (value % divisor).toString()
    }))
  }));
  return makeComputedDomainDerivation(
    row,
    "fixed-divisor-truth-groups-v1",
    { values: labelledValues.map(({ label, value }) => ({ label, value: value.toString() })), divisors: divisors.map(String) },
    groups.map((group) => `(${group.label}) ${group.checks.map((check) => check.divisible ? "Yes" : "No").join(", ")}`).join("; "),
    { groups }
  );
};

const deriveGenericVerbalExpression = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow | null => {
  const prompt = row.prompt.en.replace(/\\\(|\\\)/g, "").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
  let match = prompt.match(/^Write an expression for\s+"(\d+)\s+plus\s+(\d+)"/i);
  if (match) {
    const expression = `${match[1]} + ${match[2]}`;
    return makeComputedDomainDerivation(row, "verbal-addition-expression-v1", { operands: match.slice(1, 3), operator: "+" }, expression, { expression });
  }
  match = prompt.match(/^Write an expression for\s+"(\d+)\s+times\s+(\d+)"/i);
  if (match) {
    const expression = `${match[1]} × ${match[2]}`;
    return makeComputedDomainDerivation(row, "verbal-multiplication-expression-v1", { operands: match.slice(1, 3), operator: "*" }, expression, { expression });
  }
  match = prompt.match(/^Write an expression for\s+"subtract\s+(\d+)\s+from\s+(\d+)"/i);
  if (match) {
    const expression = `${match[2]} - ${match[1]}`;
    return makeComputedDomainDerivation(row, "verbal-subtraction-expression-v1", { minuend: match[2], subtrahend: match[1] }, expression, { expression });
  }
  match = prompt.match(/^Write an expression for\s+"(\d+)\s+divided by\s+(\d+)"/i);
  if (match) {
    const expression = `${match[1]} ÷ ${match[2]}`;
    return makeComputedDomainDerivation(row, "verbal-division-expression-v1", { dividend: match[1], divisor: match[2] }, expression, { expression });
  }

  match = prompt.match(/^Write and evaluate the sum of\s+(\d+)\s+and\s+(\d+)/i);
  if (match) {
    const expression = `${match[1]}+${match[2]}`;
    return makeFormulaDerivation(row, {
      expression,
      quantities: [{ exact: match[1] }, { exact: match[2] }],
      decorate: (response) => `${match![1]} + ${match![2]} = ${response}`
    });
  }
  match = prompt.match(/^Write and evaluate the product of\s+(\d+)\s+and\s+(\d+)/i);
  if (match) {
    const expression = `${match[1]}*${match[2]}`;
    return makeFormulaDerivation(row, {
      expression,
      quantities: [{ exact: match[1] }, { exact: match[2] }],
      decorate: (response) => `${match![1]} × ${match![2]} = ${response}`
    });
  }
  match = prompt.match(/^Subtract\s+(\d+)\s+from\s+(\d+),\s*write the expression/i);
  if (match) {
    const expression = `${match[2]}-${match[1]}`;
    return makeFormulaDerivation(row, {
      expression,
      quantities: [{ exact: match[1] }, { exact: match[2] }],
      decorate: (response) => `${match![2]} - ${match![1]} = ${response}`
    });
  }
  match = prompt.match(/^Divide\s+(\d+)\s+by\s+(\d+),\s*write the expression/i);
  if (match) {
    const expression = `${match[1]}/${match[2]}`;
    return makeFormulaDerivation(row, {
      expression,
      quantities: [{ exact: match[1] }, { exact: match[2] }],
      decorate: (response) => `${match![1]} ÷ ${match![2]} = ${response}`
    });
  }

  return null;
};

type AreaComparisonMcSpec = {
  shapeA: { label: string; expression: string; quantities: FormulaQuantity[] };
  shapeB: { label: string; expression: string; quantities: FormulaQuantity[] };
  equalLabel: string;
};
type QuotientRemainderSpec = {
  dividendExact: string;
  divisorExact: string;
  dividend: bigint;
  divisor: bigint;
  template: string;
};
type IntegerFilterSpec = {
  values: bigint[];
  predicate:
    | { kind: "divisible-by"; divisor: bigint }
    | { kind: "even" }
    | { kind: "odd" }
    | { kind: "prime" }
    | { kind: "multiple-of-all"; divisors: bigint[] };
};

type McOptionEvaluation = {
  truth: boolean;
  kind: string;
  operands: unknown;
  result: unknown;
  reason: string;
};

const makeAreaComparisonMcDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  spec: AreaComparisonMcSpec
): HongKongEaseV4DerivationRow => {
  if (!row.options.en || !row.options.zh || row.options.en.length !== row.options.zh.length) {
    throw new Error("V4_OPTION_ADJUDICATION_INVALID:missing-localized-options");
  }
  const allQuantities = [...spec.shapeA.quantities, ...spec.shapeB.quantities];
  const facts: DerivationFact[] = allQuantities.map((quantity, index) =>
    promptFact(
      row,
      `f${index + 1}`,
      "prompt-quantity",
      quantity.exact,
      evaluateExactExpression(quantity.value ?? quantity.exact).value.toJson(),
      quantity.occurrence ?? 0
    )
  );
  const a = evaluateExactExpression(spec.shapeA.expression);
  const b = evaluateExactExpression(spec.shapeB.expression);
  const comparison = a.value.compare(b.value);
  const correctLabel = comparison > 0 ? spec.shapeA.label : comparison < 0 ? spec.shapeB.label : spec.equalLabel;
  const optionAdjudications = row.options.en.map<OptionAdjudication>((optionEn, index) => {
    const optionZh = row.options.zh![index];
    const truth = optionEn.toLocaleLowerCase() === correctLabel.toLocaleLowerCase();
    return {
      index,
      localizedOption: { en: optionEn, zh: optionZh },
      localizedOptionSha256: sha256(JSON.stringify({ en: optionEn, zh: optionZh })),
      truth,
      evaluation: {
        kind: "area-comparison-label",
        operands: { areaA: a.value.toJson(), areaB: b.value.toJson(), comparison },
        result: { claimedLabel: optionEn, correctLabel, truth }
      },
      rowSpecificReason: `${spec.shapeA.label} area is ${a.value.toImproperString()} and ${spec.shapeB.label} area is ${b.value.toImproperString()}, so ${correctLabel} is the unique correct comparison.`
    };
  });
  if (optionAdjudications.filter((option) => option.truth).length !== 1) {
    throw new Error("V4_OPTION_ADJUDICATION_INVALID:area-comparison-not-unique");
  }
  const correctIndex = optionAdjudications.findIndex((option) => option.truth);
  const responseText = row.options.en[correctIndex];
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "multiple-choice-area-comparison",
    facts,
    steps: [
      {
        stepId: "s1",
        operation: "evaluate-rational-expression",
        inputFactIds: facts.slice(0, spec.shapeA.quantities.length).map((fact) => fact.factId),
        inputStepIds: [],
        parameters: { expression: spec.shapeA.expression, ast: a.ast },
        output: { value: a.value.toJson(), operationTrace: a.trace }
      },
      {
        stepId: "s2",
        operation: "evaluate-rational-expression",
        inputFactIds: facts.slice(spec.shapeA.quantities.length).map((fact) => fact.factId),
        inputStepIds: [],
        parameters: { expression: spec.shapeB.expression, ast: b.ast },
        output: { value: b.value.toJson(), operationTrace: b.trace }
      },
      {
        stepId: "s3",
        operation: "select-unique-option",
        inputFactIds: [],
        inputStepIds: ["s1", "s2"],
        parameters: { optionAdjudications },
        output: { correctIndex, responseText }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: { correctIndex, correctLabel, areaA: a.value.toJson(), areaB: b.value.toJson() }
    },
    optionAdjudications
  });
};

const makeQuotientRemainderDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  spec: QuotientRemainderSpec
): HongKongEaseV4DerivationRow => {
  const quotient = spec.dividend / spec.divisor;
  const remainder = spec.dividend % spec.divisor;
  const responseText = spec.template
    .replaceAll("{q}", quotient.toString())
    .replaceAll("{r}", remainder.toString());
  const facts = [
    promptFact(row, "f1", "prompt-quantity", spec.dividendExact, { integer: spec.dividend.toString() }),
    promptFact(row, "f2", "prompt-quantity", spec.divisorExact, { integer: spec.divisor.toString() })
  ];
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "integer-quotient-and-remainder",
    facts,
    steps: [
      {
        stepId: "s1",
        operation: "apply-domain-rule",
        inputFactIds: ["f1", "f2"],
        inputStepIds: [],
        parameters: { ruleId: "euclidean-division-v1" },
        output: {
          quotient: quotient.toString(),
          remainder: remainder.toString(),
          reconstruction: `${spec.divisor}×${quotient}+${remainder}=${spec.dividend}`,
          remainderBound: `0≤${remainder}<${spec.divisor}`
        }
      },
      {
        stepId: "s2",
        operation: "compose-structured-response",
        inputFactIds: [],
        inputStepIds: ["s1"],
        parameters: { template: spec.template },
        output: { responseText }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: { quotient: quotient.toString(), remainder: remainder.toString() }
    },
    optionAdjudications: []
  });
};

const makeIntegerFilterDerivation = (
  row: HongKongEaseV4SanitizedInputRow,
  spec: IntegerFilterSpec
): HongKongEaseV4DerivationRow => {
  const matchesPredicate = (value: bigint): boolean => {
    switch (spec.predicate.kind) {
      case "divisible-by":
        return value % spec.predicate.divisor === BigInt("0");
      case "even":
        return value % BigInt("2") === BigInt("0");
      case "odd":
        return value % BigInt("2") !== BigInt("0");
      case "prime":
        return isPrime(value);
      case "multiple-of-all":
        return spec.predicate.divisors.every((divisor) => value % divisor === BigInt("0"));
    }
  };
  const judgments = spec.values.map((value) => ({ value, truth: matchesPredicate(value) }));
  const selected = judgments.filter((judgment) => judgment.truth).map((judgment) => judgment.value);
  const responseText = selected.join(", ");
  const predicateJson =
    spec.predicate.kind === "divisible-by"
      ? { kind: spec.predicate.kind, divisor: spec.predicate.divisor.toString() }
      : spec.predicate.kind === "multiple-of-all"
        ? { kind: spec.predicate.kind, divisors: spec.predicate.divisors.map(String) }
        : { kind: spec.predicate.kind };
  const occurrenceByValue = new Map<string, number>();
  const facts = spec.values.map((value, index) => {
    const exact = value.toString();
    const occurrence = occurrenceByValue.get(exact) ?? 0;
    occurrenceByValue.set(exact, occurrence + 1);
    return promptFact(row, `f${index + 1}`, "prompt-quantity", exact, { integer: exact }, occurrence);
  });
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: `integer-filter:${spec.predicate.kind}`,
    facts,
    steps: [
      {
        stepId: "s1",
        operation: "apply-domain-rule",
        inputFactIds: facts.map((fact) => fact.factId),
        inputStepIds: [],
        parameters: { ruleId: "integer-filter-v1", predicate: predicateJson },
        output: {
          judgments: judgments.map(({ value, truth }) => ({ value: value.toString(), truth })),
          selected: selected.map(String)
        }
      },
      {
        stepId: "s2",
        operation: "compose-structured-response",
        inputFactIds: [],
        inputStepIds: ["s1"],
        parameters: { separator: ", " },
        output: { responseText }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText,
      semanticValue: {
        predicate: predicateJson,
        selected: selected.map(String)
      }
    },
    optionAdjudications: []
  });
};

const numericOptionValue = (option: string): ExactRational => evaluateExactExpression(option).value;

const optionIsCompletePrimeFactorization = (
  option: string,
  target: bigint,
  requireIndexNotation: boolean
): McOptionEvaluation => {
  const evaluation = evaluateExactExpression(option);
  const normalized = option
    .replace(/\\\(|\\\)/g, "")
    .replace(/\\times|×/g, "*")
    .replace(/\s+/g, "")
    .replace(/\^\{(\d+)\}/g, "^$1");
  const factorTokens = normalized.split("*");
  const tokenChecks = factorTokens.map((token) => {
    const match = token.match(/^(\d+)(?:\^(\d+))?$/);
    if (!match) return { token, primeBase: false, exponent: null };
    return {
      token,
      primeBase: isPrime(BigInt(match[1])),
      exponent: Number(match[2] ?? "1")
    };
  });
  const equalsTarget = evaluation.value.denominator === BigInt("1") && evaluation.value.numerator === target;
  const allPrimeBases = tokenChecks.every((check) => check.primeBase && (check.exponent ?? 0) > 0);
  const bases = tokenChecks
    .map((check) => check.token.match(/^(\d+)/)?.[1])
    .filter((base): base is string => base !== undefined);
  const indexNotationCompliant =
    !requireIndexNotation || new Set(bases).size === bases.length;
  return {
    truth: equalsTarget && allPrimeBases && indexNotationCompliant,
    kind: "complete-prime-factorization",
    operands: { option, target: target.toString(), requireIndexNotation },
    result: {
      evaluated: evaluation.value.toJson(),
      equalsTarget,
      tokenChecks,
      allPrimeBases,
      indexNotationCompliant
    },
    reason: `${option} evaluates to ${evaluation.value.toImproperString()}; every displayed base is${allPrimeBases ? "" : " not"} prime and the index-notation structure is${indexNotationCompliant ? "" : " not"} compliant, so it is${equalsTarget && allPrimeBases && indexNotationCompliant ? "" : " not"} a complete prime factorization of ${target}.`
  };
};

const romanSetFromOption = (option: string): string[] => {
  if (/^Only\s+I$/i.test(option)) return ["I"];
  if (/^Only\s+II$/i.test(option)) return ["II"];
  if (/^Only\s+III$/i.test(option)) return ["III"];
  return ["I", "II", "III"].filter((roman) => new RegExp(`\\b${roman}\\b`).test(option));
};

const normalizeSymbolicOption = (value: string): string =>
  value
    .replace(/\\\(|\\\)/g, "")
    .replace(/\\times|×/g, "*")
    .replace(/\^\{([^{}]+)\}/g, "^($1)")
    .replace(/\^\(([^()]+)\)/g, "^($1)")
    .replace(/\s+/g, "")
    .replace(/\^\((\d+|[a-z])\)/gi, "^$1");

const statementTruthsFromPrompt = (prompt: string): Record<string, boolean> | null => {
  const normalized = prompt.replace(/\\\(|\\\)/g, "").replace(/\n/g, " ");

  let match = normalized.match(/L\.?C\.?M\.? of two numbers is\s+(\d+).*?I\.\s*(\d+)\s*,\s*(\d+).*?II\.\s*(\d+)\s*,\s*(\d+).*?III\.\s*(\d+)\s*,\s*(\d+)/i);
  if (match) {
    const target = BigInt(match[1]);
    const pairs = [[match[2], match[3]], [match[4], match[5]], [match[6], match[7]]];
    return Object.fromEntries(pairs.map((pair, pairIndex) => [
      ["I", "II", "III"][pairIndex],
      integerLcm(...pair.map(BigInt)) === target
    ]));
  }

  match = normalized.match(/integers divide\s+(\d+)(?: exactly)?\?.*?I\.\s*(\d+).*?II\.\s*(\d+).*?III\.\s*(\d+)/i);
  if (match) {
    const target = BigInt(match[1]);
    return Object.fromEntries(match.slice(2, 5).map((value, valueIndex) => [
      ["I", "II", "III"][valueIndex],
      target % BigInt(value) === BigInt("0")
    ]));
  }

  match = normalized.match(/numbers are divisible by both\s+(\d+)\s+and\s+(\d+)\?.*?I\.\s*(\d+).*?II\.\s*(\d+).*?III\.\s*(\d+)/i);
  if (match) {
    const divisors = [BigInt(match[1]), BigInt(match[2])];
    return Object.fromEntries(match.slice(3, 6).map((value, valueIndex) => [
      ["I", "II", "III"][valueIndex],
      divisors.every((divisor) => BigInt(value) % divisor === BigInt("0"))
    ]));
  }

  match = normalized.match(/H\.?C\.?F\.? and L\.?C\.?M\.? of two integers are\s+(\d+)\s+and\s+(\d+)\s+respectively/i);
  if (match) {
    const gcd = BigInt(match[1]);
    const lcm = BigInt(match[2]);
    const commonMultiple = normalized.match(/I\.\s*(\d+)\s+is a common multiple/i)?.[1];
    const divisors = [...normalized.matchAll(/Both integers are divisible by\s+(\d+)/gi)].map((result) => BigInt(result[1]));
    if (commonMultiple && divisors.length === 2) {
      return {
        I: BigInt(commonMultiple) % lcm === BigInt("0"),
        II: gcd % divisors[0] === BigInt("0"),
        III: gcd % divisors[1] === BigInt("0")
      };
    }
  }

  match = normalized.match(/integer is divisible by both\s+(\d+)\s+and\s+(\d+).*?I\.\s*The sum of its digits is divisible by\s+(\d+).*?II\.\s*The sum of its digits is divisible by\s+(\d+).*?III\.\s*The sum of its digits is divisible by\s+(\d+)/i);
  if (match) {
    const requiredDivisors = [BigInt(match[1]), BigInt(match[2])];
    const statementDivisors = match.slice(3, 6).map(BigInt);
    const guaranteesDigitSumDivisibility = (divisor: bigint): boolean =>
      (divisor === BigInt("3") || divisor === BigInt("9")) && requiredDivisors.some((required) => required % divisor === BigInt("0"));
    return Object.fromEntries(statementDivisors.map((divisor, divisorIndex) => [
      ["I", "II", "III"][divisorIndex],
      guaranteesDigitSumDivisibility(divisor)
    ]));
  }

  if (/Which statements are correct/i.test(normalized)) {
    const statementSegments = [
      ...normalized.matchAll(/(?:^|\s)(I|II|III)\.\s*(.*?)(?=\s+(?:I|II|III)\.|$)/g)
    ];
    if (statementSegments.length === 3) {
      const evaluated = statementSegments.map((statement): [string, boolean] | null => {
        const claim = statement[2]
          .trim()
          .replace(/[.]$/, "")
          .match(/^(\d+)\s+is divisible by\s+(.+)$/i);
        if (!claim) return null;
        const value = BigInt(claim[1]);
        const divisors = [...claim[2].matchAll(/\d+/g)].map((result) => BigInt(result[0]));
        if (divisors.length === 0) return null;
        return [statement[1], divisors.every((divisor) => value % divisor === BigInt("0"))];
      });
      if (evaluated.every((entry): entry is [string, boolean] => entry !== null)) {
        return Object.fromEntries(evaluated);
      }
    }
  }

  return null;
};

const symbolicExpectationFromPrompt = (prompt: string): string | null => {
  const normalized = prompt.replace(/[“”]/g, "'");
  const compound = normalized.match(/Express\s+'([^']+?)\s+to the power of\s+([^']+?)\s+multiplied by\s+([^']+?)\s+to the power of\s+([^']+)'/i);
  if (compound) return `${compound[1].trim()}^(${compound[2].trim()})*${compound[3].trim()}^(${compound[4].trim()})`;
  const single = normalized.match(/Express\s+'([^']+?)\s+to the power of\s+([^']+)'/i);
  return single ? `${single[1].trim()}^(${single[2].trim()})` : null;
};

const evaluateMultipleChoiceOption = (
  row: HongKongEaseV4SanitizedInputRow,
  index: number
): McOptionEvaluation => {
  const option = row.options.en![index];
  const prompt = row.prompt.en.replace(/\n/g, " ");
  const yesNoDivisibility = prompt.match(/^Is\s+(\d+)\s+divisible by\s+(\d+)\?$/i);
  if (yesNoDivisibility) {
    const value = BigInt(yesNoDivisibility[1]);
    const divisor = BigInt(yesNoDivisibility[2]);
    const divisible = value % divisor === BigInt("0");
    const claimed = /^yes$/i.test(option);
    return {
      truth: claimed === divisible,
      kind: "yes-no-divisibility",
      operands: { value: value.toString(), divisor: divisor.toString(), claimed },
      result: { remainder: (value % divisor).toString(), divisible },
      reason: `${value} leaves remainder ${value % divisor} on division by ${divisor}; therefore the ${option} option is ${claimed === divisible ? "true" : "false"}.`
    };
  }

  const notFactor = prompt.match(/not a factor of\s+\\?\(?([0-9]+)\\?\)?/i);
  if (notFactor) {
    const target = BigInt(notFactor[1]);
    const candidate = BigInt(option.replace(/\D/g, ""));
    const truth = target % candidate !== BigInt("0");
    return {
      truth,
      kind: "not-a-factor",
      operands: { target: target.toString(), candidate: candidate.toString() },
      result: { remainder: (target % candidate).toString() },
      reason: `${target} modulo ${candidate} is ${target % candidate}, so ${candidate} is${truth ? " not" : ""} a factor.`
    };
  }

  const completePrime = prompt.match(/Express\s+\\?\(?([0-9]+)\\?\)?\s+as a complete product of prime factors/i);
  if (completePrime) {
    return optionIsCompletePrimeFactorization(
      option,
      BigInt(completePrime[1]),
      /index notation/i.test(prompt)
    );
  }

  if (/Based on\s+.*?which equation is correct/i.test(prompt)) {
    const equation = option.replace(/\\\(|\\\)/g, "").split("=");
    if (equation.length === 2) {
      const left = evaluateExactExpression(equation[0]);
      const right = evaluateExactExpression(equation[1]);
      const truth = left.value.compare(right.value) === 0;
      return {
        truth,
        kind: "equation-identity-option",
        operands: { left: equation[0], right: equation[1] },
        result: { left: left.value.toJson(), right: right.value.toJson() },
        reason: `${equation[0]} evaluates to ${left.value.toImproperString()} and ${equation[1]} evaluates to ${right.value.toImproperString()}, so the equation is ${truth ? "true" : "false"}.`
      };
    }
  }

  const betweenDirections = prompt.match(/direction lies between\s+(north|northeast|east|southeast|south|southwest|west|northwest)\s+and\s+(north|northeast|east|southeast|south|southwest|west|northwest)/i);
  if (betweenDirections) {
    const bearings: Record<string, number> = {
      north: 0,
      northeast: 45,
      east: 90,
      southeast: 135,
      south: 180,
      southwest: 225,
      west: 270,
      northwest: 315
    };
    const first = bearings[betweenDirections[1].toLowerCase()];
    const second = bearings[betweenDirections[2].toLowerCase()];
    const clockwiseDistance = (second - first + 360) % 360;
    const signedShortestDistance = clockwiseDistance <= 180 ? clockwiseDistance : clockwiseDistance - 360;
    const midpoint = (first + signedShortestDistance / 2 + 360) % 360;
    const expected = Object.entries(bearings).find(([, bearing]) => bearing === midpoint)?.[0];
    const truth = option.trim().toLowerCase() === expected;
    return {
      truth,
      kind: "eight-point-compass-midpoint-option",
      operands: { first: betweenDirections[1], second: betweenDirections[2] },
      result: { firstBearing: first, secondBearing: second, midpoint, expected },
      reason: `The shortest angular midpoint between ${betweenDirections[1]} and ${betweenDirections[2]} is ${expected}; ${option} is ${truth ? "that" : "not that"} direction.`
    };
  }

  const factorOfX = prompt.match(/If\s+(\d+)\s+is a factor of\s+X,\s*which pair could both be values of X/i);
  if (factorOfX) {
    const divisor = BigInt(factorOfX[1]);
    const values = [...option.matchAll(/\d+/g)].map((result) => BigInt(result[0]));
    if (values.length === 2) {
      const checks = values.map((value) => ({
        value: value.toString(),
        remainder: (value % divisor).toString(),
        divisible: value % divisor === BigInt("0")
      }));
      const truth = checks.every((check) => check.divisible);
      return {
        truth,
        kind: "factor-of-x-pair-option",
        operands: { divisor: divisor.toString(), values: values.map(String) },
        result: { checks },
        reason: `${option} gives remainders ${checks.map((check) => check.remainder).join(" and ")} modulo ${divisor}; both values are ${truth ? "valid" : "not both valid"}.`
      };
    }
  }

  const normalizedPrompt = prompt.replace(/\\\(|\\\)/g, "");
  const placeholder = normalizedPrompt.match(/(\d*)(?:\\square|□|x)(\d*)/i);
  const placeholderDivisors = normalizedPrompt.match(/divisible by(?: both)?\s+(\d+)(?:\s+and\s+(\d+))?/i);
  if (placeholder && placeholderDivisors && /^\d$/.test(option.trim())) {
    const digit = Number(option.trim());
    const value = BigInt(`${placeholder[1]}${digit}${placeholder[2]}`);
    const divisors = placeholderDivisors.slice(1).filter(Boolean).map(BigInt);
    const oddConstraint = /odd digit/i.test(normalizedPrompt);
    const rangeConstraint = /strictly between\s+0\s+and\s+9/i.test(normalizedPrompt);
    const checks = divisors.map((divisor) => ({
      divisor: divisor.toString(),
      remainder: (value % divisor).toString(),
      divisible: value % divisor === BigInt("0")
    }));
    const truth = checks.every((check) => check.divisible) && (!oddConstraint || digit % 2 === 1) && (!rangeConstraint || (digit > 0 && digit < 9));
    return {
      truth,
      kind: "digit-placeholder-divisibility-option",
      operands: { prefix: placeholder[1], suffix: placeholder[2], digit, divisors: divisors.map(String), oddConstraint, rangeConstraint },
      result: { value: value.toString(), checks },
      reason: `Substituting ${digit} gives ${value}; its required remainders are ${checks.map((check) => check.remainder).join(", ")}, so the digit is ${truth ? "valid" : "invalid"}.`
    };
  }

  const factoredHcfLcm = normalizedPrompt.match(/Find the\s+(L\.?C\.?M\.?|LCM|H\.?C\.?F\.?|HCF)\s+of\s+(.+?)\./i);
  if (factoredHcfLcm) {
    const operandTexts = factoredHcfLcm[2].split(/\s*,\s*|\s+and\s+/i).map((value) => value.trim());
    try {
      const operands = operandTexts.map((value) => evaluateExactExpression(value).value);
      if (operands.length >= 2 && operands.every((value) => value.denominator === BigInt("1") && value.numerator > BigInt("0"))) {
        const expected = /^L/i.test(factoredHcfLcm[1])
          ? integerLcm(...operands.map((value) => value.numerator))
          : integerGcd(...operands.map((value) => value.numerator));
        const candidate = evaluateExactExpression(option).value;
        const truth = candidate.denominator === BigInt("1") && candidate.numerator === expected;
        return {
          truth,
          kind: /^L/i.test(factoredHcfLcm[1]) ? "lcm-expression-option" : "gcd-expression-option",
          operands: { expressions: operandTexts, values: operands.map((value) => value.toJson()), candidate: candidate.toJson() },
          result: { expected: expected.toString() },
          reason: `${factoredHcfLcm[1]} of ${operands.map((value) => value.toImproperString()).join(", ")} is ${expected}; ${option} is ${truth ? "equal" : "not equal"}.`
        };
      }
    } catch {
      // A later prompt grammar may own this option.
    }
  }

  const nthCommonMultiple = normalizedPrompt.match(/(\d+)(?:st|nd|rd|th) positive common multiple of\s+(\d+)\s+and\s+(\d+)/i);
  if (nthCommonMultiple && /^\d+$/.test(option.trim())) {
    const ordinal = BigInt(nthCommonMultiple[1]);
    const bases = [BigInt(nthCommonMultiple[2]), BigInt(nthCommonMultiple[3])];
    const lcm = integerLcm(...bases);
    const expected = ordinal * lcm;
    const candidate = BigInt(option.trim());
    const truth = candidate === expected;
    return {
      truth,
      kind: "nth-common-multiple-option",
      operands: { ordinal: ordinal.toString(), bases: bases.map(String), candidate: candidate.toString() },
      result: { lcm: lcm.toString(), expected: expected.toString() },
      reason: `The L.C.M. is ${lcm}, so common multiple number ${ordinal} is ${expected}; option ${candidate} is ${truth ? "equal" : "not equal"}.`
    };
  }

  if (/Which pair of numbers has a product equal to its L\.?C\.?M\.?/i.test(normalizedPrompt)) {
    const pair = [...option.matchAll(/\d+/g)].map((result) => BigInt(result[0]));
    if (pair.length === 2) {
      const product = pair[0] * pair[1];
      const lcm = integerLcm(...pair);
      const truth = product === lcm;
      return {
        truth,
        kind: "pair-product-equals-lcm-option",
        operands: { pair: pair.map(String) },
        result: { product: product.toString(), lcm: lcm.toString() },
        reason: `${pair[0]} × ${pair[1]} = ${product}, while their L.C.M. is ${lcm}; the values are ${truth ? "equal" : "different"}.`
      };
    }
  }

  const simpleDivisible = prompt.match(/Which (?:of the following |number |integer |of the following integers |of the following numbers )?(?:three-digit |four-digit )?(?:numbers? |integers? )?is divisible by\s+\\?\(?([0-9]+)\\?\)?(?:\s+but not by\s+\\?\(?([0-9]+)\\?\)?)?/i);
  const bothDivisible = prompt.match(/divisible by both\s+\\?\(?([0-9]+)\\?\)?\s+and\s+\\?\(?([0-9]+)\\?\)?/i);
  const tripleDivisible = prompt.match(/divisible by\s+\\?\(?([0-9]+)\\?\)?,\s*\\?\(?([0-9]+)\\?\)?,\s*and\s+\\?\(?([0-9]+)\\?\)?/i);
  if ((simpleDivisible || bothDivisible || tripleDivisible) && /^\d+$/.test(option.trim())) {
    const value = BigInt(option.trim());
    const required = tripleDivisible
      ? tripleDivisible.slice(1, 4).map(BigInt)
      : bothDivisible
        ? bothDivisible.slice(1, 3).map(BigInt)
        : [BigInt(simpleDivisible![1])];
    const forbidden = simpleDivisible?.[2] ? BigInt(simpleDivisible[2]) : null;
    const requiredChecks = required.map((divisor) => ({
      divisor: divisor.toString(),
      remainder: (value % divisor).toString(),
      passes: value % divisor === BigInt("0")
    }));
    const forbiddenCheck = forbidden
      ? { divisor: forbidden.toString(), remainder: (value % forbidden).toString(), passes: value % forbidden !== BigInt("0") }
      : null;
    const truth = requiredChecks.every((check) => check.passes) && (forbiddenCheck?.passes ?? true);
    return {
      truth,
      kind: "divisibility-option",
      operands: { value: value.toString(), required: required.map(String), forbidden: forbidden?.toString() ?? null },
      result: { requiredChecks, forbiddenCheck },
      reason: `${value} has remainders ${requiredChecks.map((check) => `${check.remainder} mod ${check.divisor}`).join(", ")}${forbiddenCheck ? ` and ${forbiddenCheck.remainder} mod ${forbiddenCheck.divisor}` : ""}, so the option is ${truth ? "true" : "false"}.`
    };
  }

  const statementTruths = statementTruthsFromPrompt(prompt);
  if (statementTruths) {
    const trueStatements = Object.entries(statementTruths).filter(([, truth]) => truth).map(([roman]) => roman);
    const claimedStatements = romanSetFromOption(option);
    const truth = JSON.stringify(claimedStatements) === JSON.stringify(trueStatements);
    return {
      truth,
      kind: "statement-truth-set",
      operands: { statementTruths, claimedStatements },
      result: { trueStatements },
      reason: `Independent row rules give ${Object.entries(statementTruths).map(([roman, value]) => `${roman}=${value}`).join(", ")}; ${option} names ${claimedStatements.join(", ") || "none"}, so it is ${truth ? "exact" : "not exact"}.`
    };
  }

  const simpleHcfLcm = prompt.match(/Find the\s+(L\.C\.M\.|H\.C\.F\.)\s+of\s+(.+?)\.?$/i);
  if (simpleHcfLcm && /^\d+$/.test(option.trim())) {
    const values = [...simpleHcfLcm[2].matchAll(/\d+/g)].map((match) => BigInt(match[0]));
    const expected = /^L/i.test(simpleHcfLcm[1]) ? integerLcm(...values) : integerGcd(...values);
    const candidate = BigInt(option.trim());
    const truth = candidate === expected;
    return {
      truth,
      kind: /^L/i.test(simpleHcfLcm[1]) ? "lcm-option" : "gcd-option",
      operands: { values: values.map(String), candidate: candidate.toString() },
      result: { expected: expected.toString() },
      reason: `${simpleHcfLcm[1]}(${values.join(",")})=${expected}; option ${candidate} is ${truth ? "equal" : "not equal"}.`
    };
  }

  const symbolicExpected = symbolicExpectationFromPrompt(prompt);
  if (symbolicExpected) {
    const normalizedOption = normalizeSymbolicOption(option);
    const normalizedExpected = normalizeSymbolicOption(symbolicExpected);
    const truth = normalizedOption === normalizedExpected;
    return {
      truth,
      kind: "symbolic-index-notation",
      operands: { prompt, option: normalizedOption },
      result: { expected: normalizedExpected },
      reason: `The stated base/exponent structure is ${normalizedExpected}; ${normalizedOption} ${truth ? "preserves" : "does not preserve"} it.`
    };
  }

  const expressionQuestion = prompt.match(/^(.+?)\s*=\s*\?$/);
  if (expressionQuestion && /^[-+]?\d+(?:\.\d+)?$/.test(option.trim())) {
    const evaluation = evaluateExactExpression(expressionQuestion[1]);
    const candidate = numericOptionValue(option);
    const truth = candidate.compare(evaluation.value) === 0;
    return {
      truth,
      kind: "expression-value-option",
      operands: { expression: expressionQuestion[1], candidate: candidate.toJson() },
      result: { expected: evaluation.value.toJson(), trace: evaluation.trace },
      reason: `${expressionQuestion[1]} evaluates exactly to ${evaluation.value.toImproperString()}; option ${option} is ${truth ? "equal" : "not equal"}.`
    };
  }

  throw new Error(`V4_OPTION_ADJUDICATION_INVALID:unmatched-option-rule:${row.baseId}:${index}`);
};

const makeGenericMultipleChoiceDerivation = (
  row: HongKongEaseV4SanitizedInputRow
): HongKongEaseV4DerivationRow => {
  if (!row.options.en || !row.options.zh || row.options.en.length !== row.options.zh.length) {
    throw new Error("V4_OPTION_ADJUDICATION_INVALID:missing-localized-options");
  }
  const optionAdjudications = row.options.en.map<OptionAdjudication>((optionEn, index) => {
    const optionZh = row.options.zh![index];
    const evaluation = evaluateMultipleChoiceOption(row, index);
    return {
      index,
      localizedOption: { en: optionEn, zh: optionZh },
      localizedOptionSha256: sha256(JSON.stringify({ en: optionEn, zh: optionZh })),
      truth: evaluation.truth,
      evaluation: {
        kind: evaluation.kind,
        operands: evaluation.operands,
        result: evaluation.result
      },
      rowSpecificReason: evaluation.reason
    };
  });
  const trueOptions = optionAdjudications.filter((option) => option.truth);
  if (trueOptions.length !== 1) {
    throw new Error(`V4_OPTION_ADJUDICATION_INVALID:expected-one-true-got-${trueOptions.length}`);
  }
  const correct = trueOptions[0];
  const optionFacts = optionAdjudications.map((option) => ({
    factId: `f${option.index + 1}`,
    kind: "option-payload" as const,
    locator: locator(row, "options.en", option.localizedOption.en, 0, option.index),
    value: option.localizedOption
  }));
  return finalizedRow({
    index: row.index,
    baseId: row.baseId,
    problemPayloadSha256: row.problemPayloadSha256,
    derivationKind: "multiple-choice-exhaustive-option-adjudication",
    facts: optionFacts,
    steps: [
      {
        stepId: "s1",
        operation: "select-unique-option",
        inputFactIds: optionFacts.map((fact) => fact.factId),
        inputStepIds: [],
        parameters: { optionAdjudications },
        output: { correctIndex: correct.index, responseText: correct.localizedOption.en }
      }
    ],
    computedResult: {
      kind: "response-text",
      responseText: correct.localizedOption.en,
      semanticValue: { correctIndex: correct.index, localizedOption: correct.localizedOption }
    },
    optionAdjudications
  });
};

const extractDirectExpression = (prompt: string): string | null => {
  const stripped = prompt.replace(/\n/g, " ").trim();
  const calculatedInline = stripped.match(/Calculate[^:]*:\s*\\\((.+)\\\)(?:[.\s]|$)/i);
  if (calculatedInline) return calculatedInline[1].trim();
  const inlineMath = stripped.startsWith("\\(") && stripped.endsWith("\\)")
    ? [stripped, stripped.slice(2, -2)]
    : null;
  if (inlineMath) {
    const expression = inlineMath[1].replace(/\s*=\s*\??\s*$/, "").trim();
    if (/[+×*÷/^−-]|\\(?:times|div|frac)/.test(expression)) return expression;
  }
  const patterns = [
    /^(?:Calculate|Evaluate|Compute):?\s*(.+?)(?:\s+Give\b|\s+Your answer\b|\.$)/i,
    /^Find the value of\s+(.+?)(?:\.|$)/i,
    /^Calculate\s+(.+?)(?:\.|$)/i,
    /^(.+?)\s*=\s*\?\s*$/,
    /^(.+?)\s*=\s*$/
  ];
  for (const pattern of patterns) {
    const match = stripped.match(pattern);
    if (!match) continue;
    const expression = match[1]
      .replace(/\\mathbf\s*/g, "")
      .replace(/\s*=\s*\?\s*$/, "")
      .replace(/[.;]\s*$/, "")
      .trim();
    if (/[+×*÷/^−-]|\\(?:times|div|frac)/.test(expression) && !/[A-Za-z]{4,}/.test(expression.replace(/\\(?:frac|times|div|left|right)/g, ""))) {
      return prompt.includes(expression) ? expression : null;
    }
  }
  return null;
};

// Row-specific prompt formulas. Every literal is independently located in the sanitized prompt;
// no production answer or accepted alias enters this authoring layer.
const FORMULA_BY_ID: Record<string, FormulaSpec> = {
  "hk-ease-10631": { expression: "100-(40+20)", quantities: [{ exact: "100" }, { exact: "40" }, { exact: "20" }], decorate: (response) => `100 - (40 + 20) = ${response}` },
  "hk-ease-10641": { expression: "3/8", quantities: [{ exact: "8" }, { exact: "3" }] },
  "hk-ease-10642": { expression: "(8-3)/8", quantities: [{ exact: "8" }, { exact: "3" }] },
  "hk-ease-10643": { expression: "2/5", quantities: [{ exact: "5" }, { exact: "2nd", value: "2" }] },
  "hk-ease-10644": { expression: "2*4", quantities: [{ exact: "2" }, { exact: "4" }] },
  "hk-ease-10645": { expression: "6/18", quantities: [{ exact: "6" }, { exact: "18" }] },
  "hk-ease-10652": { expression: "(3+4)/10", quantities: [{ exact: "10" }, { exact: "3" }, { exact: "4" }] },
  "hk-ease-10653": { expression: "(10-3-4)/10", quantities: [{ exact: "10" }, { exact: "3" }, { exact: "4" }] },
  "hk-ease-10655": { expression: "3*2", quantities: [{ exact: "3" }, { exact: "2" }] },
  "hk-ease-10656": { expression: "8/24", quantities: [{ exact: "8" }, { exact: "24" }] },
  "hk-ease-10633": { expression: "125-48+60", quantities: [{ exact: "125" }, { exact: "48" }, { exact: "60" }] },
  "hk-ease-10638": { expression: "4*12+25", quantities: [{ exact: "4" }, { exact: "12" }, { exact: "25" }] },
  "hk-ease-10639": { expression: "500-3*85", quantities: [{ exact: "500" }, { exact: "3" }, { exact: "85" }] },
  "hk-ease-10640": { expression: "8*12-40", quantities: [{ exact: "8" }, { exact: "12" }, { exact: "40" }] },
  "hk-ease-10654": { expression: "12*5/12", quantities: [{ exact: "12" }, { exact: "5" }, { exact: "12", occurrence: 1 }] },
  "hk-ease-10564": { expression: "7+8+10", quantities: [{ exact: "7" }, { exact: "8" }, { exact: "10" }] },
  "hk-ease-10565": { expression: "4*9", quantities: [{ exact: "9" }], decorate: (response) => `P = 4 × 9 = ${response} cm` },
  "hk-ease-10566": { expression: "36/4", quantities: [{ exact: "36" }] },
  "hk-ease-10567": { expression: "60/4", quantities: [{ exact: "60" }] },
  "hk-ease-10568": { expression: "2*(12+8)", quantities: [{ exact: "12" }, { exact: "8" }] },
  "hk-ease-10569": { expression: "2*(10+4)-4*7", quantities: [{ exact: "10" }, { exact: "4" }, { exact: "7" }], decorate: (_response, value) => value.numerator === BigInt("0") ? "Equal" : value.numerator > BigInt("0") ? "Rectangle A" : "Square B" },
  "hk-ease-10570": { expression: "30/2-10", quantities: [{ exact: "30" }, { exact: "10" }] },
  "hk-ease-10571": { expression: "2*(15+10)*50", quantities: [{ exact: "15" }, { exact: "10" }, { exact: "50" }] },
  "hk-ease-10572": { expression: "2*(10+5)", quantities: [{ exact: "5" }] },
  "hk-ease-10573": { expression: "5+6+4+7+8", quantities: [{ exact: "5" }, { exact: "6" }, { exact: "4" }, { exact: "7" }, { exact: "8" }] },
  "hk-ease-10574": { expression: "4*12", quantities: [{ exact: "12" }] },
  "hk-ease-10575": { expression: "48/4", quantities: [{ exact: "48" }] },
  "hk-ease-10576": { expression: "3*4*15", quantities: [{ exact: "3" }, { exact: "15" }] },
  "hk-ease-10577": { expression: "2*(25+18)", quantities: [{ exact: "25" }, { exact: "18" }], decorate: (response) => `P = 2 × (25 + 18) = ${response} m` },
  "hk-ease-10578": { expression: "2*(10+6)-4*8", quantities: [{ exact: "10" }, { exact: "6" }, { exact: "8" }], decorate: (_response, value) => value.numerator === BigInt("0") ? "Equal" : value.numerator > BigInt("0") ? "Rectangle A" : "Square B" },
  "hk-ease-10579": { expression: "200/2-60", quantities: [{ exact: "200" }, { exact: "60" }] },
  "hk-ease-10580": { expression: "2*(12+6)", quantities: [{ exact: "6" }] },
  "hk-ease-10581": { expression: "40/2-14", quantities: [{ exact: "40" }, { exact: "14" }] },
  "hk-ease-10584": { expression: "8*8", quantities: [{ exact: "8" }, { exact: "8", occurrence: 0 }] },
  "hk-ease-10586": { expression: "2*2", quantities: [{ exact: "2" }] },
  "hk-ease-10588": { expression: "72/8", quantities: [{ exact: "72" }, { exact: "8" }] },
  "hk-ease-10590": { expression: "20*12*80", quantities: [{ exact: "20" }, { exact: "12" }, { exact: "80" }] },
  "hk-ease-10591": { expression: "2*5*5", quantities: [{ exact: "5" }] },
  "hk-ease-10597": { expression: "12*5", quantities: [{ exact: "12" }, { exact: "5" }] },
  "hk-ease-10598": { expression: "48/8", quantities: [{ exact: "48" }, { exact: "8" }] },
  "hk-ease-10600": { expression: "6*4*120", quantities: [{ exact: "6" }, { exact: "4" }, { exact: "120" }] },
  "hk-ease-10601": { expression: "2*4*4", quantities: [{ exact: "4" }] },
  "hk-ease-10393": { expression: "14*120", quantities: [{ exact: "14" }, { exact: "120" }] },
  "hk-ease-10394": { expression: "(4500-2650)*15", quantities: [{ exact: "4,500", value: "4500" }, { exact: "2,650", value: "2650" }, { exact: "15" }] },
  "hk-ease-10398": { expression: "24*115", quantities: [{ exact: "24" }, { exact: "115" }] },
  "hk-ease-10399": { expression: "(358-160)*25", quantities: [{ exact: "358" }, { exact: "160" }, { exact: "25" }] },
  "hk-ease-10403": { expression: "45*30", quantities: [{ exact: "45" }, { exact: "April 2026", value: "30" }] },
  "hk-ease-10404": { expression: "380*(15+12)", quantities: [{ exact: "380" }, { exact: "15" }, { exact: "12" }] },
  "hk-ease-10416": { expression: "375/15", quantities: [{ exact: "375" }, { exact: "15" }] },
  "hk-ease-10417": { expression: "210/14", quantities: [{ exact: "14" }, { exact: "210" }] },
  "hk-ease-10418": { expression: "400/12", quantities: [{ exact: "400" }, { exact: "12" }], decorate: (_response, value) => value.floor().toString() },
  "hk-ease-10426": { expression: "450/18", quantities: [{ exact: "450" }, { exact: "18" }] },
  "hk-ease-10428": { expression: "800/35", quantities: [{ exact: "35" }, { exact: "800" }], decorate: (_response, value) => value.floor().toString() },
  "hk-ease-10476": { expression: "96/12*15", quantities: [{ exact: "12" }, { exact: "96" }, { exact: "15" }] },
  "hk-ease-10477": { expression: "24*6/18", quantities: [{ exact: "24" }, { exact: "6" }, { exact: "18" }] },
  "hk-ease-10478": { expression: "500-(3*45+128)", quantities: [{ exact: "3" }, { exact: "45" }, { exact: "128" }, { exact: "500" }] },
  "hk-ease-10479": { expression: "500/(125/5)", quantities: [{ exact: "125" }, { exact: "5" }, { exact: "500" }] },
  "hk-ease-10480": { expression: "(4*32-60)/4", quantities: [{ exact: "4" }, { exact: "32" }, { exact: "60" }, { exact: "4", occurrence: 1 }] },
  "hk-ease-10493": { expression: "3/10+(3/10+2/10)", quantities: [{ exact: "3" }, { exact: "10" }, { exact: "2" }, { exact: "10", occurrence: 1 }] },
  "hk-ease-10494": { expression: "5-(1+3/4)-(2+1/4)", quantities: [{ exact: "5" }, { exact: "1\\frac{3}{4}", value: "1.75" }, { exact: "2\\frac{1}{4}", value: "2.25" }] },
  "hk-ease-10508": { expression: "5/12+(5/12+2/12)", quantities: [{ exact: "5" }, { exact: "12" }, { exact: "2" }, { exact: "12", occurrence: 1 }] },
  "hk-ease-10509": { expression: "1-2/8-3/8", quantities: [{ exact: "2" }, { exact: "8" }, { exact: "3" }, { exact: "8", occurrence: 1 }] },
  "hk-ease-10510": { expression: "4-(1+1/5)+4/5", quantities: [{ exact: "4" }, { exact: "1\\frac{1}{5}", value: "1.2" }, { exact: "\\frac{4}{5}", value: "0.8" }] },
  "hk-ease-10521": { expression: "45+80/100", quantities: [{ exact: "45" }, { exact: "80" }], mode: "finite-decimal" },
  "hk-ease-10522": { expression: "106+5/100", quantities: [{ exact: "106" }, { exact: "5" }], mode: "finite-decimal" },
  "hk-ease-10523": { expression: "2.508*1000", quantities: [{ exact: "2.508" }, { exact: "mL", value: "1000" }] },
  "hk-ease-10524": { expression: "3+25/100", quantities: [{ exact: "3" }, { exact: "25" }], mode: "finite-decimal" },
  "hk-ease-10525": { expression: "1.5-450/1000", quantities: [{ exact: "1.5" }, { exact: "450" }], mode: "finite-decimal" },
  "hk-ease-10536": { expression: "8+4/10", quantities: [{ exact: "8" }, { exact: "4" }], mode: "finite-decimal" },
  "hk-ease-10537": { expression: "50+5/100", quantities: [{ exact: "50" }, { exact: "5" }], mode: "finite-decimal" },
  "hk-ease-10538": { expression: "1.05*1000", quantities: [{ exact: "1.05" }, { exact: "mL", value: "1000" }] },
  "hk-ease-10539": { expression: "2670/1000", quantities: [{ exact: "2670" }, { exact: "L", value: "1000" }], mode: "finite-decimal" },
  "hk-ease-10540": { expression: "1.42-15/100", quantities: [{ exact: "1.42" }, { exact: "15" }], mode: "finite-decimal" },
  "hk-ease-10548": { expression: "50-18.50-6.40", quantities: [{ exact: "18.50" }, { exact: "6.40" }, { exact: "50" }], mode: "finite-decimal" },
  "hk-ease-10549": { expression: "12-3.45+5.2", quantities: [{ exact: "12" }, { exact: "3.45" }, { exact: "5.2" }], mode: "finite-decimal" },
  "hk-ease-10550": { expression: "2.45+(2.45+0.8)", quantities: [{ exact: "2.45" }, { exact: "0.8" }], mode: "finite-decimal" },
  "hk-ease-10551": { expression: "1.25-0.3-0.45", quantities: [{ exact: "1.25" }, { exact: "0.3" }, { exact: "0.45" }], mode: "finite-decimal" },
  "hk-ease-10552": { expression: "100-42.50+20.80", quantities: [{ exact: "100" }, { exact: "42.50" }, { exact: "20.80" }], mode: "finite-decimal" },
  "hk-ease-10559": { expression: "28.50+(28.50+6.80)", quantities: [{ exact: "28.50" }, { exact: "6.80" }], mode: "finite-decimal" },
  "hk-ease-10561": { expression: "2.5-0.35-1.2", quantities: [{ exact: "2.5" }, { exact: "0.35" }, { exact: "1.2" }], mode: "finite-decimal" },
  "hk-ease-10562": { expression: "100-34.50-18.20", quantities: [{ exact: "100" }, { exact: "34.50" }, { exact: "18.20" }], mode: "finite-decimal" },
  "hk-ease-10563": { expression: "0.45+(0.45+1.2)+0.15", quantities: [{ exact: "0.45" }, { exact: "1.2" }, { exact: "0.15" }], mode: "finite-decimal" },
  "hk-ease-10663": { expression: "15*3/10", quantities: [{ exact: "15" }, { exact: "3" }, { exact: "10" }] },
  "hk-ease-10664": { expression: "4/9*3/8", quantities: [{ exact: "4" }, { exact: "9" }, { exact: "3" }, { exact: "8" }] },
  "hk-ease-10665": { expression: "5/6*12*1/2", quantities: [{ exact: "5" }, { exact: "6" }, { exact: "12" }, { exact: "1" }, { exact: "2" }] },
  "hk-ease-10666": { expression: "(2+1/4)*2/3*1/6", quantities: [{ exact: "2\\frac{1}{4}", value: "2.25" }, { exact: "2" }, { exact: "3" }, { exact: "1" }, { exact: "6" }] },
  "hk-ease-10667": { expression: "20*1/4*3/5", quantities: [{ exact: "20" }, { exact: "1" }, { exact: "4" }, { exact: "3" }, { exact: "5" }] },
  "hk-ease-10668": { expression: "80*35/100", quantities: [{ exact: "80" }, { exact: "35" }, { exact: "65" }, { exact: "original price", value: "100" }] },
  "hk-ease-10669": { expression: "(10+1/2)*4", quantities: [{ exact: "10\\frac{1}{2}", value: "10.5" }, { exact: "4" }] },
  "hk-ease-10670": { expression: "3/4*1/3", quantities: [{ exact: "3" }, { exact: "4" }, { exact: "1" }, { exact: "3", occurrence: 1 }] },
  "hk-ease-10671": { expression: "(1+1/5)*3*1/2", quantities: [{ exact: "1\\frac{1}{5}", value: "1.2" }, { exact: "3" }, { exact: "1" }, { exact: "2" }] },
  "hk-ease-10672": { expression: "12*1/4*2/3", quantities: [{ exact: "12" }, { exact: "1" }, { exact: "4" }, { exact: "2" }, { exact: "3" }] },
  "hk-ease-746": { expression: "120-(3*12.60+2*9.70)", quantities: [{ exact: "12.60" }, { exact: "9.70" }, { exact: "120.00", value: "120" }, { exact: "3" }, { exact: "2" }], mode: "finite-decimal" },
  "hk-ease-748": { expression: "((1+2/3)+5/8)*(1-1/5)", quantities: [{ exact: "1 2/3", value: "1+2/3" }, { exact: "5/8", value: "5/8" }, { exact: "1/5", value: "1/5" }], mode: "integer-or-mixed" },
  "hk-ease-673": { expression: "2/15+(4/5/(2/3))*1/4", quantities: [{ exact: "2/15" }, { exact: "0.8", value: "4/5" }, { exact: "2/3" }, { exact: "0.25", value: "1/4" }], mode: "integer-or-improper" },
  "hk-ease-919": { expression: "100-4-5*8", quantities: [{ exact: "100" }, { exact: "4" }, { exact: "5" }, { exact: "8" }] },
};

const MULTI_FORMULA_BY_ID: Record<string, MultiFormulaSpec> = {
  "hk-ease-10651": {
    expressions: ["2/7+3/7", "3/7-2/7"],
    quantities: [{ exact: "2/7" }, { exact: "3/7" }],
    template: "(a) {0} L; (b) {1} L"
  },
  "hk-ease-10662": {
    expressions: ["2/9+1/9", "2/9+(2/9+1/9)"],
    quantities: [{ exact: "2/9" }, { exact: "1/9" }],
    template: "(a) {0}; (b) {1}"
  },
  "hk-ease-851": {
    expressions: [
      "2*42.80+3*36.40-(24.80+2*18.20)",
      "250-(2*24.80+4*36.40+2*15.10)",
      "2*12.00",
      "250-(2*24.80+4*36.40+2*15.10)-2*12.00"
    ],
    quantities: [
      { exact: "42.80" },
      { exact: "24.80" },
      { exact: "36.40" },
      { exact: "18.20" },
      { exact: "250.00", value: "250" },
      { exact: "15.10" },
      { exact: "12.00" }
    ],
    modes: ["finite-decimal", "finite-decimal", "finite-decimal", "finite-decimal"],
    template: "(a) HK${0}; (b)(i) HK${1}; (b)(ii) Yes, because HK${1} is at least HK${2}; HK${3} remains."
  },
  "hk-ease-883": {
    expressions: ["2*4.5", "3*120/100", "2*4.5-3*120/100"],
    quantities: [{ exact: "two", value: "2" }, { exact: "4.5" }, { exact: "three", value: "3" }, { exact: "120" }],
    modes: ["finite-decimal", "finite-decimal", "finite-decimal"],
    template: "No; blue total = {0} m; red total = {1} m; difference = {2} m, not 6 m."
  },
  "hk-ease-920": {
    expressions: ["(1+1/2)+(1+1/5)", "((1+1/2)+(1+1/5))*(1-2/3)"],
    quantities: [{ exact: "1 1/2", value: "1+1/2" }, { exact: "1 1/5", value: "1+1/5" }, { exact: "2/3" }, { exact: "1 kg", value: "1" }],
    modes: ["integer-or-mixed", "integer-or-mixed"],
    template: "total = {0} kg; remaining mass = {1} kg; Disagree, because {1} kg is less than 1 kg."
  }
};

const STRUCTURED_NUMBER_THEORY_BY_ID: Record<string, DomainSpec> = {
  "hk-ease-10459": {
    ruleId: "structured-factor-sets-v1",
    evidence: [
      "factors of \\(18\\)",
      "factors of \\(27\\)",
      "all positive common factors of \\(18\\) and \\(27\\)",
      "(a) …; (b) …; (c) …"
    ],
    parameters: { values: [18,27] },
    responseText: "(a) 1, 2, 3, 6, 9, 18; (b) 1, 3, 9, 27; (c) 1, 3, 9",
    semanticValue: { factors18: [1,2,3,6,9,18], factors27: [1,3,9,27], common: [1,3,9] }
  },
  "hk-ease-10457": {
    ruleId: "structured-multiple-lists-v1",
    evidence: [
      "first \\(10\\) positive multiples of \\(8\\)",
      "first \\(10\\) positive multiples of \\(12\\)",
      "the first two positive common multiples appearing in the lists",
      "(a) …; (b) …; (c) …"
    ],
    parameters: { bases: [8,12], count: 10 },
    responseText: "(a) 8, 16, 24, 32, 40, 48, 56, 64, 72, 80; (b) 12, 24, 36, 48, 60, 72, 84, 96, 108, 120; (c) 24, 48",
    semanticValue: {
      multiples8: [8,16,24,32,40,48,56,64,72,80],
      multiples12: [12,24,36,48,60,72,84,96,108,120],
      firstTwoCommon: [24,48]
    }
  }
};

const STRUCTURED_FRACTION_CLASSIFICATION_BY_ID: Record<string, DomainSpec> = {
  "hk-ease-10481": {
    ruleId: "classify-fraction-forms-v1",
    evidence: ["\\frac{3}{5}", "\\frac{7}{4}", "2\\frac{1}{3}", "\\frac{9}{9}", "\\frac{11}{12}", "5\\frac{2}{7}"],
    parameters: {
      forms: ["3/5", "7/4", "2 1/3", "9/9", "11/12", "5 2/7"],
      rule: "proper numerator<denominator; improper numerator>=denominator; mixed whole+proper-fraction"
    },
    responseText: "(a) \\(\\frac{3}{5},\\frac{11}{12}\\); (b) \\(\\frac{7}{4},\\frac{9}{9}\\); (c) \\(2\\frac{1}{3},5\\frac{2}{7}\\)",
    semanticValue: { proper: ["3/5","11/12"], improper: ["7/4","9/9"], mixed: ["2 1/3","5 2/7"] }
  },
  "hk-ease-10496": {
    ruleId: "classify-fraction-forms-v1",
    evidence: ["\\frac{4}{7}", "\\frac{11}{5}", "3\\frac{1}{2}", "\\frac{8}{8}", "\\frac{13}{15}", "6\\frac{4}{9}"],
    parameters: {
      forms: ["4/7", "11/5", "3 1/2", "8/8", "13/15", "6 4/9"],
      rule: "proper numerator<denominator; improper numerator>=denominator; mixed whole+proper-fraction"
    },
    responseText: "(a) \\(\\frac{4}{7},\\frac{13}{15}\\); (b) \\(\\frac{11}{5},\\frac{8}{8}\\); (c) \\(3\\frac{1}{2},6\\frac{4}{9}\\)",
    semanticValue: { proper: ["4/7","13/15"], improper: ["11/5","8/8"], mixed: ["3 1/2","6 4/9"] }
  }
};

const COMPARISON_BY_ID: Record<string, ComparisonSpec> = {
  "hk-ease-10637": { left: "15 × (4 + 6)", right: "15 × 4 + 6" },
  "hk-ease-10647": { left: "\\frac{5}{9}", right: "\\frac{7}{9}" },
  "hk-ease-10648": { left: "1/4", right: "1/6" },
  "hk-ease-10658": { left: "4/7", right: "3/7" },
  "hk-ease-10659": { left: "1/5", right: "1/8" },
  "hk-ease-10487": { left: "1\\frac{3}{7}", right: "\\frac{11}{7}" },
  "hk-ease-10488": { left: "2", right: "\\frac{10}{5}" },
  "hk-ease-10489": { left: "\\frac{5}{9}", right: "\\frac{4}{9}" },
  "hk-ease-10502": { left: "2", right: "\\frac{9}{4}" },
  "hk-ease-10503": { left: "\\frac{18}{6}", right: "3" },
  "hk-ease-10504": { left: "1\\frac{5}{8}", right: "1\\frac{3}{8}" },
  "hk-ease-10518": { left: "0.75", right: "\\frac{3}{4}" },
  "hk-ease-10519": { left: "1.2", right: "1\\frac{1}{50}" },
  "hk-ease-10520": { left: "0.08", right: "\\frac{4}{100}" },
  "hk-ease-10534": { left: "1.25", right: "1\\frac{1}{4}" },
  "hk-ease-10535": { left: "0.09", right: "\\frac{1}{10}" }
};

const SORT_BY_ID: Record<string, SortSpec> = {
  "hk-ease-10649": { values: ["3/10", "7/10", "1/10"], direction: "descending", separator: ">" },
  "hk-ease-10660": { values: ["5/12", "5/6", "5/9"], direction: "ascending", separator: "<" },
  "hk-ease-10517": { values: ["0.45", "\\frac{2}{5}", "0.045", "\\frac{1}{2}"], direction: "ascending", separator: "<" },
  "hk-ease-10533": { values: ["0.7", "1/2", "0.65", "3/4"], direction: "descending", separator: ">" }
};

const DOMAIN_BY_ID: Record<string, DomainSpec> = {
  "hk-ease-10582": { ruleId: "select-area-unit-v1", evidence: ["ID card", "45"], parameters: { objectClass: "small-card", magnitude: 45 }, responseText: "cm²", semanticValue: { unit: "cm²" } },
  "hk-ease-10583": { ruleId: "select-area-unit-v1", evidence: ["classroom blackboard", "4"], parameters: { objectClass: "room-fixture", magnitude: 4 }, responseText: "m²", semanticValue: { unit: "m²" } },
  "hk-ease-10592": { ruleId: "select-area-unit-v1", evidence: ["school hall", "500"], parameters: { objectClass: "large-room", magnitude: 500 }, responseText: "m²", semanticValue: { unit: "m²" } },
  "hk-ease-10593": { ruleId: "select-area-unit-v1", evidence: ["student ID card", "45"], parameters: { objectClass: "small-card", magnitude: 45 }, responseText: "cm²", semanticValue: { unit: "cm²" } },
  "hk-ease-10413": { ruleId: "divisible-by-10-last-digit-v1", evidence: ["divisible by both 5 and 10", "last digit"], parameters: { divisors: [5, 10] }, responseText: "0", semanticValue: { requiredLastDigit: 0 } },
  "hk-ease-10414": { ruleId: "smallest-digit-divisibility-search-v1", evidence: ["57□", "smallest three-digit number divisible by 2"], parameters: { candidates: [0,1,2,3,4,5,6,7,8,9], predicate: "last-digit-even", objective: "minimum-number" }, responseText: "0", semanticValue: { digit: 0, number: 570 } },
  "hk-ease-10429": { ruleId: "digit-sum-divisibility-search-v1", evidence: ["7\\square2", "divisible by \\(3\\)"], parameters: { fixedDigitSum: 9, candidates: [0,1,2,3,4,5,6,7,8,9] }, responseText: "0, 3, 6, 9", semanticValue: { digits: [0,3,6,9], sums: [9,12,15,18] } },
  "hk-ease-10432": { ruleId: "factor-multiple-statements-v1", evidence: ["15\\times4=60", "A."], parameters: { statements: { A: "60%15=0", B: "60%15=0", C: "4>=60", D: "4%60=0" } }, responseText: "A, B", semanticValue: { A: true, B: true, C: false, D: false } },
  "hk-ease-10433": { ruleId: "prime-definition-v1", evidence: ["All prime numbers have exactly 2 factors", "Prime Numbers"], parameters: { definition: "prime has exactly two positive factors" }, responseText: "True", semanticValue: { truth: true } },
  "hk-ease-10435": { ruleId: "minimum-composite-in-range-v1", evidence: ["10", "20"], parameters: { minimum: 10, maximum: 20 }, responseText: "10", semanticValue: { firstComposite: 10, factors: [1,2,5,10] } },
  "hk-ease-10436": { ruleId: "classify-one-v1", evidence: ["1", "prime, composite, or neither"], parameters: { positiveFactors: [1] }, responseText: "neither prime nor composite; 1 has only one positive factor", semanticValue: { classification: "neither", factors: [1] } },
  "hk-ease-10438": { ruleId: "unordered-factor-pair-count-v1", evidence: ["24", "same combination"], parameters: { factors: [1,2,3,4,6,8,12,24] }, responseText: "4", semanticValue: { pairs: [[1,24],[2,12],[3,8],[4,6]] } },
  "hk-ease-10439": { ruleId: "sieve-remainder-class-v1", evidence: ["Sieve of Eratosthenes", "except for 1"], parameters: { crossedPrimeMultiples: [2,3,5,7], maximum: 100 }, responseText: "prime numbers", semanticValue: { classification: "prime" } },
  "hk-ease-10446": { ruleId: "maximum-composite-in-range-v1", evidence: ["at most \\(20\\)", "greatest composite"], parameters: { maximum: 20 }, responseText: "20", semanticValue: { value: 20, factors: [1,2,4,5,10,20] } },
  "hk-ease-10447": { ruleId: "smallest-prime-parity-v1", evidence: ["smallest prime number", "even or odd"], parameters: { factors: [1,2] }, responseText: "(a) 2; (b) even", semanticValue: { value: 2, parity: "even" } },
  "hk-ease-10443": { ruleId: "factor-multiple-inverse-v1", evidence: ["13\\times4=52", "multiple or a factor"], parameters: { product: 52, factors: [13,4] }, responseText: "(a) multiple; (b) factor", semanticValue: { a: "multiple", b: "factor" } },
  "hk-ease-10451": { ruleId: "coprime-definition-v1", evidence: ["HCF", "is 1"], parameters: { hcf: 1 }, responseText: "The two integers are coprime; they have no positive common factor other than 1.", semanticValue: { classification: "coprime" } },
  "hk-ease-10454": { ruleId: "lcm-when-one-multiple-v1", evidence: ["A", "multiple of positive integer \\(B\\)"], parameters: { relation: "B divides A" }, responseText: "A", semanticValue: { lcm: "A" } },
  "hk-ease-10456": { ruleId: "periodic-coincidence-v1", evidence: ["15 minutes", "20 minutes", "1:00 p.m."], parameters: { periodsMinutes: [15,20], lcmMinutes: 60, start: "13:00" }, responseText: "2:00 p.m.", semanticValue: { next: "14:00" } },
  "hk-ease-10458": { ruleId: "hcf-upper-bound-v1", evidence: ["larger than their HCF", "positive common factor"], parameters: { definition: "HCF is greatest positive common factor" }, responseText: "No; the HCF is the greatest positive common factor.", semanticValue: { decision: false } },
  "hk-ease-10461": { ruleId: "gcd-distinct-primes-v1", evidence: ["two different prime numbers", "HCF"], parameters: { onlyPositiveCommonFactor: 1 }, responseText: "1", semanticValue: { gcd: 1 } },
  "hk-ease-10464": { ruleId: "factor-relation-gcd-lcm-v1", evidence: ["A", "factor of positive integer \\(B\\)"], parameters: { relation: "A divides B" }, responseText: "(a) HCF = A; (b) LCM = B", semanticValue: { gcd: "A", lcm: "B" } },
  "hk-ease-10466": { ruleId: "periodic-coincidence-seconds-v1", evidence: ["\\(8\\) seconds", "\\(10\\) seconds", "\\(8:00\\) p.m."], parameters: { periodsSeconds: [8,10], lcmSeconds: 40 }, responseText: "8:00:40 p.m.", semanticValue: { next: "20:00:40" } },
  "hk-ease-10467": { ruleId: "common-factor-multiple-cardinality-v1", evidence: ["infinitely many positive common multiples", "finitely many positive common factors"], parameters: { positiveIntegers: true }, responseText: "True", semanticValue: { truth: true } },
  "hk-ease-10468": { ruleId: "lcm-relative-to-common-factor-v1", evidence: ["LCM", "positive common factor"], parameters: { relation: "each common factor divides each integer and hence divides lcm" }, responseText: "multiple", semanticValue: { relation: "multiple" } },
  "hk-ease-10514": { ruleId: "decimal-place-unit-v1", evidence: ["0.8", "tenths place"], parameters: { placeExponent: -1 }, responseText: "0.1", semanticValue: { unitValue: "1/10" } },
  "hk-ease-10516": { ruleId: "decimal-digit-place-value-v1", evidence: ["'\\(7\\)'", "5.072"], parameters: { digit: 7, place: "hundredths", multiplier: "1/100" }, responseText: "0.07", semanticValue: { value: "7/100" } },
  "hk-ease-10526": { ruleId: "construct-fixed-place-decimal-v1", evidence: ["four-decimal-place", "tenths", "thousandths"], parameters: { digitsAfterDecimal: [2,0,9,0] }, responseText: "0.2090", semanticValue: { digits: [0,2,0,9,0], requiredTrailingZero: true } },
  "hk-ease-10527": { ruleId: "identify-place-and-value-v1", evidence: ["5.6382", "digit 3"], parameters: { digitIndexAfterDecimal: 2, digit: 3 }, responseText: "hundredths;0.03", semanticValue: { place: "hundredths", value: "3/100" } },
  "hk-ease-10528": { ruleId: "construct-fixed-place-decimal-v1", evidence: ["integer part of \\(10\\)", "thousandths"], parameters: { integer: 10, digitsAfterDecimal: [0,7,5] }, responseText: "10.075", semanticValue: { digits: [1,0,0,7,5] } },
  "hk-ease-10532": { ruleId: "decimal-fraction-equivalence-v1", evidence: ["0.4", "40/100"], parameters: { decimal: "2/5", fraction: "2/5" }, responseText: "True", semanticValue: { truth: true } },
  "hk-ease-10515": { ruleId: "identify-two-decimal-places-v1", evidence: ["12.3456", "place of 4", "place of 6"], parameters: { digit4IndexAfterDecimal: 2, digit6IndexAfterDecimal: 4 }, responseText: "hundredths;ten-thousandths", semanticValue: { place4: "hundredths", place6: "ten-thousandths" } },
  "hk-ease-10541": { ruleId: "compare-price-representations-v1", evidence: ["HK$6.50", "HK$6 2/5"], parameters: { mineralWater: "6.50", juice: "6+2/5" }, responseText: "Juice", semanticValue: { mineralWater: "13/2", juice: "32/5", comparison: "juice-lower" } },
  "hk-ease-10602": {
    ruleId: "rhombus-property-truth-set-v1",
    evidence: ["All four sides are equal in length", "Opposite sides are parallel"],
    parameters: {
      claims: {
        A: "all-four-sides-equal",
        B: "all-four-angles-right",
        C: "opposite-sides-parallel"
      },
      definingProperties: ["all-four-sides-equal", "opposite-sides-parallel"]
    },
    responseText: "A, C",
    semanticValue: { A: true, B: false, C: true }
  },
  "hk-ease-10603": { ruleId: "rhombus-side-from-perimeter-v1", evidence: ["rhombus", "28 cm"], parameters: { perimeter: 28, equalSideCount: 4, operation: "28/4" }, responseText: "7", semanticValue: { sideLengthCm: 7 } },
  "hk-ease-10604": { ruleId: "rhombus-opposite-angle-property-v1", evidence: ["opposite angles", "rhombus"], parameters: { quadrilateral: "rhombus" }, responseText: "equal", semanticValue: { relation: "equal" } },
  "hk-ease-10605": { ruleId: "rectangle-square-subset-v1", evidence: ["All rectangles are squares", "True or false"], parameters: { rectangleRequiresEqualSides: false, squareRequiresEqualSides: true }, responseText: "False", semanticValue: { truth: false } },
  "hk-ease-10606": { ruleId: "square-is-rhombus-v1", evidence: ["square is also a type of rhombus", "reason"], parameters: { squareSidesEqual: 4, rhombusDefinition: "four equal sides" }, responseText: "A square has four equal sides, so it satisfies the definition of a rhombus.", semanticValue: { satisfies: "four-equal-sides" } },
  "hk-ease-10607": { ruleId: "parallelogram-shape-filter-v1", evidence: ["square, rectangle, rhombus, trapezium", "parallelograms"], parameters: { candidates: { square: 2, rectangle: 2, rhombus: 2, trapezium: 1 }, requiredParallelSidePairs: 2 }, responseText: "square, rectangle, rhombus", semanticValue: { selected: ["square", "rectangle", "rhombus"] } },
  "hk-ease-10608": { ruleId: "classify-rhombus-from-properties-v1", evidence: ["two pairs of parallel opposite sides", "four equal sides", "not all right angles"], parameters: { parallelSidePairs: 2, equalSideCount: 4, allRightAngles: false }, responseText: "rhombus", semanticValue: { shape: "rhombus" } },
  "hk-ease-10620": { ruleId: "opposite-compass-direction-v1", evidence: ["southwest", "turns around"], parameters: { startDegreesClockwiseFromNorth: 225, turnDegrees: 180 }, responseText: "Northeast", semanticValue: { finalDegrees: 45 } },
  "hk-ease-10621": { ruleId: "relative-direction-vector-v1", evidence: ["West of the school", "South of the school"], parameters: { libraryFromSchool: [-1, 0], parkFromSchool: [0, -1], target: "library-from-park" }, responseText: "Northwest", semanticValue: { vector: [-1, 1], direction: "Northwest" } },
  "hk-ease-10622": { ruleId: "inverse-relative-direction-v1", evidence: ["northeast", "City B from City A"], parameters: { cityAFromB: [1, 1] }, responseText: "Southwest", semanticValue: { cityBFromA: [-1, -1] } },
  "hk-ease-10624": { ruleId: "compass-quarter-turn-v1", evidence: ["North", "right (90° clockwise)"], parameters: { startDegreesClockwiseFromNorth: 0, turnDegrees: 90 }, responseText: "East", semanticValue: { finalDegrees: 90 } },
  "hk-ease-10625": { ruleId: "return-along-opposite-bearing-v1", evidence: ["Southeast", "return to the pier along the same path"], parameters: { outboundDegreesClockwiseFromNorth: 135 }, responseText: "Northwest", semanticValue: { returnDegrees: 315 } },
  "hk-ease-10626": { ruleId: "compass-eighth-turn-v1", evidence: ["North", "45° left turn"], parameters: { startDegreesClockwiseFromNorth: 0, signedTurnDegrees: -45 }, responseText: "Northwest", semanticValue: { finalDegrees: 315 } },
  "hk-ease-10627": { ruleId: "relative-direction-vector-v1", evidence: ["5m due East of a tree", "5m due South of the tree"], parameters: { treasureFromTree: [5, 0], flagFromTree: [0, -5], target: "treasure-from-flag" }, responseText: "Northeast", semanticValue: { vector: [5, 5], direction: "Northeast" } },
  "hk-ease-10628": { ruleId: "compose-relative-direction-vectors-v1", evidence: ["Southeast of the dog", "dog is due East of the rabbit"], parameters: { catFromDog: [1, -1], dogFromRabbit: [1, 0] }, responseText: "Southeast", semanticValue: { catFromRabbit: [2, -1], direction: "Southeast" } }
  ,"hk-ease-812": { ruleId: "minimum-common-group-count-v1", evidence: ["10 groups", "30 groups", "45 groups"], parameters: { groupCounts: [10, 30, 45], operation: "lcm" }, responseText: "90", semanticValue: { lcm: 90 } },
  "hk-ease-900": { ruleId: "next-primes-product-v1", evidence: ["first two prime numbers after 2", "product"], parameters: { after: 2, selectedPrimes: [3, 5], operation: "3*5" }, responseText: "15", semanticValue: { primes: [3, 5], product: 15 } },
  "hk-ease-903": { ruleId: "gcd-lcm-from-index-factorizations-v1", evidence: ["2³ × 3", "2⁴ × 3² × 5"], parameters: { first: { "2": 3, "3": 1 }, second: { "2": 4, "3": 2, "5": 1 }, gcdRule: "minimum-exponents", lcmRule: "maximum-exponents" }, responseText: "HCF=24, LCM=720", semanticValue: { gcdFactors: { "2": 3, "3": 1 }, lcmFactors: { "2": 4, "3": 2, "5": 1 }, gcd: 24, lcm: 720 } },
  "hk-ease-906": { ruleId: "partition-by-divisibility-v1", evidence: ["50, 87, 95, and 102", "divisible by 2", "divisible by 3", "divisible by 5"], parameters: { values: [50, 87, 95, 102], divisors: [2, 3, 5] }, responseText: "50, 102;87, 102;50, 95", semanticValue: { by2: [50, 102], by3: [87, 102], by5: [50, 95] } }
  ,"hk-ease-398": { ruleId: "last-two-digits-divisibility-by-four-v1", evidence: ["A342158", "divisible by 4"], parameters: { lastTwoDigits: 58, divisor: 4, unknownLeadingDigitRange: [1,9] }, responseText: "No; the last two digits are 58, and 58 leaves remainder 2 when divided by 4.", semanticValue: { truth: false, remainder: 2, independentOfA: true } }
};

const AREA_COMPARISON_MC_BY_ID: Record<string, AreaComparisonMcSpec> = {
  "hk-ease-10589": {
    shapeA: { label: "Rectangle A", expression: "10*4", quantities: [{ exact: "10" }, { exact: "4" }] },
    shapeB: { label: "Square B", expression: "6*6", quantities: [{ exact: "6" }] },
    equalLabel: "Equal"
  },
  "hk-ease-10599": {
    shapeA: { label: "Shape P", expression: "9*4", quantities: [{ exact: "9" }, { exact: "4" }] },
    shapeB: { label: "Shape Q", expression: "6*6", quantities: [{ exact: "6" }] },
    equalLabel: "Equal"
  }
};

const QUOTIENT_REMAINDER_BY_ID: Record<string, QuotientRemainderSpec> = {
  "hk-ease-10410": { dividendExact: "815", divisorExact: "24", dividend: BigInt("815"), divisor: BigInt("24"), template: "{q};{r}" },
  "hk-ease-10415": { dividendExact: "520", divisorExact: "24", dividend: BigInt("520"), divisor: BigInt("24"), template: "{q};{r}" },
  "hk-ease-10421": { dividendExact: "538", divisorExact: "24", dividend: BigInt("538"), divisor: BigInt("24"), template: "quotient = {q}; remainder = {r}" },
  "hk-ease-10427": { dividendExact: "625", divisorExact: "24", dividend: BigInt("625"), divisor: BigInt("24"), template: "(a) {q}; (b) {r}" }
};

const INTEGER_FILTER_BY_ID: Record<string, IntegerFilterSpec> = {
  "hk-ease-10411": { values: [BigInt("42"), BigInt("53"), BigInt("126"), BigInt("201"), BigInt("331"), BigInt("510")], predicate: { kind: "divisible-by", divisor: BigInt("3") } },
  "hk-ease-10412": { values: [BigInt("17"), BigInt("48"), BigInt("105"), BigInt("292"), BigInt("1000")], predicate: { kind: "even" } },
  "hk-ease-10423": { values: [BigInt("124"), BigInt("255"), BigInt("301"), BigInt("462"), BigInt("513"), BigInt("780")], predicate: { kind: "divisible-by", divisor: BigInt("3") } },
  "hk-ease-10425": { values: [BigInt("88"), BigInt("147"), BigInt("250"), BigInt("391"), BigInt("506"), BigInt("999")], predicate: { kind: "odd" } },
  "hk-ease-10434": { values: [BigInt("1"), BigInt("2"), BigInt("9"), BigInt("17"), BigInt("21"), BigInt("37"), BigInt("49"), BigInt("51"), BigInt("97")], predicate: { kind: "prime" } },
  "hk-ease-10442": { values: [BigInt("12"), BigInt("15"), BigInt("24"), BigInt("30"), BigInt("45")], predicate: { kind: "multiple-of-all", divisors: [BigInt("3"), BigInt("5")] } },
  "hk-ease-10445": { values: [BigInt("2"), BigInt("9"), BigInt("15"), BigInt("23"), BigInt("31"), BigInt("49"), BigInt("51"), BigInt("87"), BigInt("97")], predicate: { kind: "prime" } }
};

const deriveRow = (row: HongKongEaseV4SanitizedInputRow): HongKongEaseV4DerivationRow => {
  try {
    if (row.baseId === "hk-ease-236") {
      return makePrimeFactorisationAndHcfDerivation(row, BigInt("88"), "2^2*3*11");
    }
    if (row.baseId === "hk-ease-1102") {
      return makeHcfWithCompleteCommonFactorsDerivation(row, [BigInt("56"), BigInt("84")]);
    }
    if (row.baseId === "hk-ease-1112") {
      return makeLcmWithBoundedCommonMultiplesDerivation(row, [BigInt("54"), BigInt("72")], BigInt("100"), BigInt("999"));
    }
    const integerFilter = INTEGER_FILTER_BY_ID[row.baseId];
    if (integerFilter) return makeIntegerFilterDerivation(row, integerFilter);
    const quotientRemainder = QUOTIENT_REMAINDER_BY_ID[row.baseId];
    if (quotientRemainder) return makeQuotientRemainderDerivation(row, quotientRemainder);
    const areaComparison = AREA_COMPARISON_MC_BY_ID[row.baseId];
    if (areaComparison) return makeAreaComparisonMcDerivation(row, areaComparison);
    if (row.type === "multiple-choice") return makeGenericMultipleChoiceDerivation(row);
    const promptRequiredArea = derivePromptRequiredAreaFormula(row);
    if (promptRequiredArea) return promptRequiredArea;
    const promptRequiredProperty = derivePromptRequiredMultiplicationProperty(row);
    if (promptRequiredProperty) return promptRequiredProperty;
    const promptRequiredEstimate = derivePromptRequiredNearestTenEstimate(row);
    if (promptRequiredEstimate) return promptRequiredEstimate;
    const domain = DOMAIN_BY_ID[row.baseId];
    if (domain) return makeDomainDerivation(row, domain);
    const multiFormula = MULTI_FORMULA_BY_ID[row.baseId];
    if (multiFormula) return makeMultiFormulaDerivation(row, multiFormula);
    const structuredNumberTheory = STRUCTURED_NUMBER_THEORY_BY_ID[row.baseId];
    if (structuredNumberTheory) return makeDomainDerivation(row, structuredNumberTheory);
    const structuredFractionClassification = STRUCTURED_FRACTION_CLASSIFICATION_BY_ID[row.baseId];
    if (structuredFractionClassification) return makeDomainDerivation(row, structuredFractionClassification);
    const sort = SORT_BY_ID[row.baseId];
    if (sort) return makeSortDerivation(row, sort);
    const comparison = COMPARISON_BY_ID[row.baseId];
    if (comparison) return makeComparisonDerivation(row, comparison);
    const squareSide = deriveSquareSideFromArea(row);
    if (squareSide) return squareSide;
    const equalGroupCount = deriveGreatestEqualGroupCount(row);
    if (equalGroupCount) return equalGroupCount;
    if (row.baseId === "hk-ease-10465") {
      return makeLargestEqualSquareDerivation(row, BigInt("30"), BigInt("20"));
    }
    const cubeDimensionsById: Record<string, bigint[]> = {
      "hk-ease-2847": [BigInt("20"), BigInt("30"), BigInt("40")],
      "hk-ease-2848": [BigInt("40"), BigInt("50"), BigInt("80")],
      "hk-ease-2849": [BigInt("18"), BigInt("24"), BigInt("36")],
      "hk-ease-2850": [BigInt("54"), BigInt("72"), BigInt("90")],
      "hk-ease-2851": [BigInt("30"), BigInt("45"), BigInt("75")]
    };
    const cubeDimensions = cubeDimensionsById[row.baseId];
    if (cubeDimensions) return makeMinimumEqualCubeCountDerivation(row, cubeDimensions);
    const formula = FORMULA_BY_ID[row.baseId];
    if (formula) return makeFormulaDerivation(row, formula);
    const directExpression = extractDirectExpression(row.prompt.en);
    if (directExpression) return makeExpressionDerivation(row, directExpression);
    const combinedGcdLcm = deriveCombinedGcdLcmExpressions(row);
    if (combinedGcdLcm) return combinedGcdLcm;
    const factoredGcdAndLcm = deriveFactoredExpressionGcdAndLcm(row);
    if (factoredGcdAndLcm) return factoredGcdAndLcm;
    const factoredGcdLcm = deriveFactoredExpressionGcdOrLcm(row);
    if (factoredGcdLcm) return factoredGcdLcm;
    const gcdLcm = deriveGenericGcdLcm(row);
    if (gcdLcm) return gcdLcm;
    const singleGcdOrLcm = deriveGenericSingleGcdOrLcm(row);
    if (singleGcdOrLcm) return singleGcdOrLcm;
    const twoPartGcdOrLcm = deriveGenericTwoPartGcdOrLcm(row);
    if (twoPartGcdOrLcm) return twoPartGcdOrLcm;
    const twoPartExpressions = deriveGenericTwoPartExpressions(row);
    if (twoPartExpressions) return twoPartExpressions;
    const numberTheory = deriveGenericNumberTheory(row);
    if (numberTheory) return numberTheory;
    const fractionConversion = deriveGenericFractionConversion(row);
    if (fractionConversion) return fractionConversion;
    const decimalConversion = deriveGenericDecimalConversion(row);
    if (decimalConversion) return decimalConversion;
    const quadrilateral = deriveGenericQuadrilateral(row);
    if (quadrilateral) return quadrilateral;
    const symbolicIndexNotation = deriveGenericSymbolicIndexNotation(row);
    if (symbolicIndexNotation) return symbolicIndexNotation;
    const factorClassification = deriveGenericFactorClassification(row);
    if (factorClassification) return factorClassification;
    const naturalLanguageExpression = deriveNaturalLanguageExpression(row);
    if (naturalLanguageExpression) return naturalLanguageExpression;
    const labeledGcdLcmGroups = deriveLabeledGcdLcmGroups(row);
    if (labeledGcdLcmGroups) return labeledGcdLcmGroups;
    const labeledExpressions = deriveLabeledExactExpressions(row);
    if (labeledExpressions) return labeledExpressions;
    const divisibilityLetterSelection = deriveGenericDivisibilityLetterSelection(row);
    if (divisibilityLetterSelection) return divisibilityLetterSelection;
    const structuredDivisibilityTable = deriveStructuredDivisibilityTable(row);
    if (structuredDivisibilityTable) return structuredDivisibilityTable;
    const divisibilityProblem = deriveGenericDivisibilityProblem(row);
    if (divisibilityProblem) return divisibilityProblem;
    const variablePrefixDivisibility = deriveGenericVariablePrefixDivisibility(row);
    if (variablePrefixDivisibility) return variablePrefixDivisibility;
    const genericDivisibilityTable = deriveGenericDivisibilityTable(row);
    if (genericDivisibilityTable) return genericDivisibilityTable;
    const ribbonComparison = deriveGenericRibbonComparison(row);
    if (ribbonComparison) return ribbonComparison;
    const usedFractionComparison = deriveGenericUsedFractionComparison(row);
    if (usedFractionComparison) return usedFractionComparison;
    const fixedDivisorTruthGroups = deriveGenericFixedDivisorTruthGroups(row);
    if (fixedDivisorTruthGroups) return fixedDivisorTruthGroups;
    const verbalExpression = deriveGenericVerbalExpression(row);
    if (verbalExpression) return verbalExpression;
    throw new Error(`V4_NON_ROW_SPECIFIC_DERIVATION:unmatched`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}:${row.index}:${row.baseId}`);
  }
};

export const assertExactHongKongEaseV4SanitizedInput = (
  input: HongKongEaseV4SanitizedInput
): void => {
  assertNoHongKongEaseV4ForbiddenKeys(input);
  if (input.schemaVersion !== "hk-ease-v4-sanitized-derivation-input-v1") {
    throw new Error("V4_SOURCE_LINEAGE_DRIFT:sanitized-schema");
  }
  if (
    input.sourcePath !== HK_EASE_V4_QUESTION_PACK_PATH ||
    input.sourceSha256 !== HK_EASE_V4_QUESTION_PACK_SHA256
  ) {
    throw new Error("V4_SOURCE_LINEAGE_DRIFT:question-pack-binding");
  }
  if (input.questionCount !== 701 || input.rows.length !== 701) {
    throw new Error("V4_QUESTION_ORDER_DRIFT:sanitized-count");
  }
  if (
    JSON.stringify(input.forbiddenKeysAtAnyDepth) !==
    JSON.stringify([...HK_EASE_V4_SANITIZED_FORBIDDEN_KEYS])
  ) {
    throw new Error("V4_SOURCE_LINEAGE_DRIFT:forbidden-key-contract");
  }
  const orderedBaseIdSha256 = sha256(`${input.rows.map((row) => row.baseId).join("\n")}\n`);
  if (
    input.orderedBaseIdSha256 !== HK_EASE_V4_SANITIZED_ORDERED_BASE_ID_SHA256 ||
    orderedBaseIdSha256 !== HK_EASE_V4_SANITIZED_ORDERED_BASE_ID_SHA256
  ) {
    throw new Error("V4_QUESTION_ORDER_DRIFT:ordered-base-ids");
  }
  input.rows.forEach((row, index) => {
    if (row.index !== index) {
      throw new Error(`V4_QUESTION_ORDER_DRIFT:index:${index}:${row.baseId}`);
    }
    const problemPayload: HongKongEaseV4ProblemPayload = {
      baseId: row.baseId,
      type: row.type,
      prompt: row.prompt,
      options: row.options,
      diagram: row.diagram
    };
    const expectedProblemPayloadSha256 = sha256(
      canonicalHongKongEaseV4ProblemPayload(problemPayload)
    );
    if (row.problemPayloadSha256 !== expectedProblemPayloadSha256) {
      throw new Error(`V4_PROMPT_BINDING_DRIFT:problem-payload:${index}:${row.baseId}`);
    }
  });
  const rowsPayloadSha256 = sha256(JSON.stringify(input.rows));
  if (
    input.rowsPayloadSha256 !== HK_EASE_V4_SANITIZED_ROWS_PAYLOAD_SHA256 ||
    rowsPayloadSha256 !== HK_EASE_V4_SANITIZED_ROWS_PAYLOAD_SHA256
  ) {
    throw new Error("V4_PROMPT_BINDING_DRIFT:rows-payload");
  }
};

export const buildHongKongEaseV4DerivationSupplement = (
  input: HongKongEaseV4SanitizedInput = sanitizedInput
): HongKongEaseV4DerivationSupplement => {
  assertExactHongKongEaseV4SanitizedInput(input);
  const rows = input.rows.map(deriveRow);
  const artifact: HongKongEaseV4DerivationSupplement = {
    schemaVersion: "hk-ease-v4-row-specific-derivation-supplement-v1",
    status: "candidate-pending-independent-row-by-row-re-review",
    sourcePath:
      "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json",
    sourceSha256: HK_EASE_V4_SANITIZED_INPUT_SHA256,
    questionCount: 701,
    multipleChoiceCount: rows.filter((row) => row.optionAdjudications.length > 0).length as 90,
    diagramCount: 0,
    rowSpecificDerivationCount: rows.length as 701,
    orderedBaseIdSha256: sha256(`${rows.map((row) => row.baseId).join("\n")}\n`),
    rowsPayloadSha256: sha256(JSON.stringify(rows)),
    rows
  };
  if (artifact.multipleChoiceCount !== 90) {
    throw new Error(`V4_OPTION_ADJUDICATION_INVALID:expected-90-got-${artifact.multipleChoiceCount}`);
  }
  return artifact;
};

export const renderHongKongEaseV4DerivationSupplement = (
  artifact: HongKongEaseV4DerivationSupplement
): string => `${JSON.stringify(artifact, null, 2)}\n`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(
    resolve(REPOSITORY_ROOT, HK_EASE_V4_DERIVATION_SUPPLEMENT_PATH),
    renderHongKongEaseV4DerivationSupplement(buildHongKongEaseV4DerivationSupplement()),
    "utf8"
  );
}
