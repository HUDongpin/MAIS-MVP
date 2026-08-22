export type WorkedShortDivisionMode = "hcf-only" | "lcm-only" | "hcf-and-lcm";

export type WorkedResponseExpectedOutputs = {
  hcf?: number;
  lcm?: number;
};

export type WorkedShortDivisionExtraPart = {
  kind: "unordered-integer-set";
  label: "common-factors" | "three-digit-common-multiples";
  expected: readonly number[];
  requireComplete?: boolean;
  rejectExtras?: boolean;
};

export type WorkedShortDivisionContract = {
  kind: "worked-short-division";
  params: {
    inputs: readonly number[];
    mode: WorkedShortDivisionMode;
    expectedOutputs: WorkedResponseExpectedOutputs;
    requirePrimeDivisors?: boolean;
    validateEveryLadderTransition?: boolean;
    carryNondivisibleValuesUnchanged?: boolean;
    hcfRule?: string | null;
    lcmRule?: string | null;
    terminalCondition?: "pairwise-coprime" | "overall-coprime" | "overall-gcd-one" | "all-ones";
    allowValidDivisorOrder?: "any";
    requireExplicitProductAndFinalValue?: boolean;
    rejectBareResult?: boolean;
    extraPart?: WorkedShortDivisionExtraPart | null;
  };
};

export type WorkedPrimeFactorizationContract = {
  kind: "worked-prime-factorization";
  params: {
    inputs: readonly number[];
    expectedPrimeFactorizations?: Readonly<Record<string, string>>;
    expectedOutputs: WorkedResponseExpectedOutputs;
    requireEveryInputFactorization?: boolean;
    requirePrimeBasesOnly?: boolean;
    allowFactorOrder?: "any";
    allowRepeatedOrExponentForm?: boolean;
    requireHcfMinExponentSelection?: boolean;
    requireLcmMaxExponentSelection?: boolean;
    allowLabelledFinalValueAfterCompleteDecompositions?: boolean;
    requireExplicitFactorProductAndFinalValue?: boolean;
    rejectBareResult?: boolean;
  };
};

export type WorkedPerimeterContract = {
  kind: "worked-perimeter";
  params: {
    shape: "square" | "rectangle";
    inputs: Readonly<Record<string, number>>;
    expectedValue: number;
    expectedUnit: "cm" | "m";
    acceptedFormulaAsts: readonly string[];
    requireFormula?: boolean;
    requireSubstitutionOfAllInputs?: boolean;
    requireCorrectEvaluation?: boolean;
    requireUnit?: boolean;
    rejectBareResult?: boolean;
  };
};

export type HongKongEaseWorkedResponseContract =
  | WorkedShortDivisionContract
  | WorkedPrimeFactorizationContract
  | WorkedPerimeterContract;

export type HongKongEaseWorkedResponseContractKind = HongKongEaseWorkedResponseContract["kind"];

const workedContractKinds = new Set<HongKongEaseWorkedResponseContractKind>([
  "worked-short-division",
  "worked-prime-factorization",
  "worked-perimeter"
]);

export function isHongKongEaseWorkedResponseContractKind(
  value: unknown
): value is HongKongEaseWorkedResponseContractKind {
  return typeof value === "string" && workedContractKinds.has(value as HongKongEaseWorkedResponseContractKind);
}

type PrimeSignature = Map<number, number>;

type ArithmeticNode =
  | { kind: "number"; value: number }
  | { kind: "add"; children: ArithmeticNode[] }
  | { kind: "multiply"; children: ArithmeticNode[] }
  | { kind: "subtract"; left: ArithmeticNode; right: ArithmeticNode }
  | { kind: "divide"; left: ArithmeticNode; right: ArithmeticNode };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeSuperscriptExponents(value: string) {
  const superscriptDigits: Record<string, string> = {
    "⁰": "0",
    "¹": "1",
    "²": "2",
    "³": "3",
    "⁴": "4",
    "⁵": "5",
    "⁶": "6",
    "⁷": "7",
    "⁸": "8",
    "⁹": "9"
  };

  return value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (digits) =>
    `^${Array.from(digits, (digit) => superscriptDigits[digit] ?? digit).join("")}`
  );
}

function normalizeWorkedMath(value: string) {
  return normalizeSuperscriptExponents(value)
    .normalize("NFKC")
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\[()]/g, "")
    .replace(/\\(?:times|cdot)/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\^\{\s*([+-]?\d+)\s*\}/g, "^$1")
    .replace(/[−–—]/g, "-")
    .replace(/⇒|⟶|⟹|->/g, "→")
    .replace(/；/g, ";")
    .replace(/：/g, ":")
    .trim();
}

function compactWorkedMath(value: string) {
  return normalizeWorkedMath(value).replace(/\s+/g, "");
}

function isPrime(value: number) {
  if (!Number.isSafeInteger(value) || value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
    if (value % divisor === 0) return false;
  }
  return true;
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a;
}

function leastCommonMultiple(left: number, right: number) {
  return Math.abs((left / greatestCommonDivisor(left, right)) * right);
}

function primeSignatureForInteger(value: number): PrimeSignature | null {
  if (!Number.isSafeInteger(value) || value < 1) return null;
  const signature: PrimeSignature = new Map();
  let remaining = value;
  for (let divisor = 2; divisor * divisor <= remaining; divisor += 1) {
    while (remaining % divisor === 0) {
      signature.set(divisor, (signature.get(divisor) ?? 0) + 1);
      remaining /= divisor;
    }
  }
  if (remaining > 1) signature.set(remaining, (signature.get(remaining) ?? 0) + 1);
  return signature;
}

function parsePrimeProduct(value: string): PrimeSignature | null {
  const compact = compactWorkedMath(value)
    .replace(/^\((.*)\)$/, "$1")
    .replace(/[·*]/g, "×");
  if (!compact) return null;
  if (compact === "1") return new Map();

  const signature: PrimeSignature = new Map();
  const factors = compact.split("×");
  if (!factors.length || factors.some((factor) => !factor)) return null;

  for (const factor of factors) {
    const match = factor.match(/^(\d+)(?:\^([1-9]\d*))?$/);
    if (!match) return null;
    const base = Number(match[1]);
    const exponent = Number(match[2] ?? 1);
    if (!isPrime(base) || !Number.isSafeInteger(exponent) || exponent < 1) return null;
    signature.set(base, (signature.get(base) ?? 0) + exponent);
  }

  return signature;
}

function primeSignatureValue(signature: PrimeSignature) {
  let value = 1;
  for (const [base, exponent] of signature) value *= base ** exponent;
  return Number.isSafeInteger(value) ? value : null;
}

function primeSignaturesEqual(left: PrimeSignature | null, right: PrimeSignature | null) {
  if (!left || !right || left.size !== right.size) return false;
  for (const [base, exponent] of left) {
    if (right.get(base) !== exponent) return false;
  }
  return true;
}

function combineSignatures(signatures: readonly PrimeSignature[], mode: "minimum" | "maximum") {
  const result: PrimeSignature = new Map();
  const bases = new Set(signatures.flatMap((signature) => [...signature.keys()]));
  for (const base of bases) {
    const exponents = signatures.map((signature) => signature.get(base) ?? 0);
    const exponent = mode === "minimum" ? Math.min(...exponents) : Math.max(...exponents);
    if (exponent > 0) result.set(base, exponent);
  }
  return result;
}

function signaturesForFactors(factors: readonly number[]) {
  const result: PrimeSignature = new Map();
  for (const factor of factors) {
    const signature = primeSignatureForInteger(factor);
    if (!signature) return null;
    for (const [base, exponent] of signature) {
      result.set(base, (result.get(base) ?? 0) + exponent);
    }
  }
  return result;
}

function parseLabelledPrimeResult(
  parts: readonly string[],
  label: "hcf" | "lcm",
  expectedSignature: PrimeSignature,
  expectedValue: number,
  allowLabelledFinalValueOnly = false
) {
  const partPrefix = "(?:\\([a-d]\\))?";
  const labelPattern = label === "hcf"
    ? new RegExp(`^${partPrefix}h\\.?c\\.?f\\.?=(.+)$`, "i")
    : new RegExp(`^${partPrefix}l\\.?c\\.?m\\.?=(.+)$`, "i");
  const matchingParts = parts
    .map((part) => compactWorkedMath(part))
    .filter((part) => labelPattern.test(part));
  if (matchingParts.length !== 1) return false;

  const match = matchingParts[0].match(labelPattern);
  if (!match) return false;
  const resultSegments = match[1].split("=").filter(Boolean);
  if (!resultSegments.length || resultSegments.length > 2) return false;

  const factorExpression = resultSegments[0];
  if (
    allowLabelledFinalValueOnly &&
    resultSegments.length === 1 &&
    /^\d+$/.test(factorExpression) &&
    Number(factorExpression) === expectedValue
  ) return true;
  const factorSignature = parsePrimeProduct(factorExpression);
  if (!primeSignaturesEqual(factorSignature, expectedSignature)) return false;

  const hasExplicitFinalValue = resultSegments.length === 2 || (
    /^\d+$/.test(factorExpression) && Number(factorExpression) === expectedValue
  );
  if (!hasExplicitFinalValue) return false;
  if (resultSegments.length === 2 && !/^\d+$/.test(resultSegments[1])) return false;

  const finalValue = resultSegments.length === 2
    ? Number(resultSegments[1])
    : primeSignatureValue(factorSignature!);
  return Number.isSafeInteger(finalValue) && finalValue === expectedValue;
}

function arraysEqual(left: readonly number[], right: readonly number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasPairwiseCoprimeValues(values: readonly number[]) {
  return values.every((value, index) =>
    values.slice(index + 1).every((other) => greatestCommonDivisor(value, other) === 1)
  );
}

function hasOverallGcdOne(values: readonly number[]) {
  return values.length > 0 && values.reduce(greatestCommonDivisor) === 1;
}

function parseShortDivisionLadder(value: string, expectedInputs: readonly number[]) {
  let compact = compactWorkedMath(value)
    .replace(/^(?:短除|shortdivision):/i, "");
  const initial = compact.match(/^(\d+(?:,\d+)+)(.*)$/);
  if (!initial) return null;

  let current = initial[1].split(",").map(Number);
  if (!arraysEqual(current, expectedInputs)) return null;
  compact = initial[2];

  const steps: Array<{
    divisor: number;
    before: number[];
    after: number[];
    dividesEveryValue: boolean;
  }> = [];

  while (compact) {
    const step = compact.match(/^÷(\d+)→(\d+(?:,\d+)+)(.*)$/);
    if (!step) return null;
    const divisor = Number(step[1]);
    const after = step[2].split(",").map(Number);
    if (!isPrime(divisor) || after.length !== current.length) return null;

    const divisibility = current.map((number) => number % divisor === 0);
    if (!divisibility.some(Boolean)) return null;
    const expectedAfter = current.map((number, index) =>
      divisibility[index] ? number / divisor : number
    );
    if (!arraysEqual(after, expectedAfter)) return null;

    steps.push({
      divisor,
      before: current,
      after,
      dividesEveryValue: divisibility.every(Boolean)
    });
    current = after;
    compact = step[3];
  }

  return steps.length ? { finalValues: current, steps } : null;
}

function normalizeSetLabel(value: string) {
  return normalizeWorkedMath(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^\([a-d]\)/, "")
    .replace(/^共同因數=/, "common-factors=")
    .replace(/^所有公因數=/, "common-factors=")
    .replace(/^commonfactors=/, "common-factors=")
    .replace(/^三位(?:數)?公倍數=/, "three-digit-common-multiples=")
    .replace(/^所有三位(?:數)?公倍數=/, "three-digit-common-multiples=")
    .replace(/^three-digitcommonmultiples=/, "three-digit-common-multiples=");
}

function matchesExtraSetPart(parts: readonly string[], extraPart: WorkedShortDivisionExtraPart) {
  const prefix = `${extraPart.label}=`;
  const candidates = parts
    .map(normalizeSetLabel)
    .filter((part) => part.startsWith(prefix));
  if (candidates.length !== 1) return false;
  const rawValues = candidates[0].slice(prefix.length).split(/[,、]/).filter(Boolean);
  if (!rawValues.length || rawValues.some((value) => !/^\d+$/.test(value))) return false;
  const values = rawValues.map(Number);
  if (new Set(values).size !== values.length) return false;
  const actual = [...values].sort((left, right) => left - right);
  const expected = [...extraPart.expected].sort((left, right) => left - right);
  return arraysEqual(actual, expected);
}

function matchesWorkedShortDivision(contract: WorkedShortDivisionContract, selectedAnswer: string) {
  const { params } = contract;
  if (
    !Array.isArray(params.inputs) ||
    params.inputs.length < 2 ||
    params.inputs.some((value) => !Number.isSafeInteger(value) || value < 1) ||
    !isRecord(params.expectedOutputs) ||
    (params.mode !== "hcf-only" && params.mode !== "lcm-only" && params.mode !== "hcf-and-lcm") ||
    (params.terminalCondition !== undefined &&
      params.terminalCondition !== "pairwise-coprime" &&
      params.terminalCondition !== "overall-coprime" &&
      params.terminalCondition !== "overall-gcd-one" &&
      params.terminalCondition !== "all-ones")
  ) return false;

  const expectsHcf = params.mode !== "lcm-only";
  const expectsLcm = params.mode !== "hcf-only";
  if (expectsHcf !== (params.expectedOutputs.hcf !== undefined)) return false;
  if (expectsLcm !== (params.expectedOutputs.lcm !== undefined)) return false;

  const parts = normalizeWorkedMath(selectedAnswer)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return false;

  const ladder = parseShortDivisionLadder(parts[0], params.inputs);
  if (!ladder) return false;
  if (params.mode === "hcf-only" && ladder.steps.some((step) => !step.dividesEveryValue)) return false;

  const requiredTerminal = params.terminalCondition ?? (params.mode === "hcf-only" ? "overall-coprime" : "all-ones");
  if (requiredTerminal === "all-ones" && !ladder.finalValues.every((value) => value === 1)) return false;
  if (requiredTerminal === "pairwise-coprime" && !hasPairwiseCoprimeValues(ladder.finalValues)) return false;
  if (
    (requiredTerminal === "overall-coprime" || requiredTerminal === "overall-gcd-one") &&
    !hasOverallGcdOne(ladder.finalValues)
  ) return false;

  const allDivisors = ladder.steps.map((step) => step.divisor);
  const commonDivisors = ladder.steps
    .filter((step) => step.dividesEveryValue)
    .map((step) => step.divisor);
  const computedHcf = commonDivisors.reduce((product, divisor) => product * divisor, 1);
  const computedLcm = allDivisors.reduce((product, divisor) => product * divisor, 1);

  const inputHcf = params.inputs.reduce(greatestCommonDivisor);
  const inputLcm = params.inputs.reduce(leastCommonMultiple);
  if (params.mode !== "lcm-only" && computedHcf !== inputHcf) return false;
  if (params.mode !== "hcf-only" && computedLcm !== inputLcm) return false;

  if (params.mode !== "lcm-only") {
    if (params.expectedOutputs.hcf !== inputHcf) return false;
    const signature = signaturesForFactors(commonDivisors);
    if (!signature || !parseLabelledPrimeResult(parts.slice(1), "hcf", signature, inputHcf)) return false;
  }

  if (params.mode !== "hcf-only") {
    if (params.expectedOutputs.lcm !== inputLcm) return false;
    const signature = signaturesForFactors(allDivisors);
    if (!signature || !parseLabelledPrimeResult(parts.slice(1), "lcm", signature, inputLcm)) return false;
  }

  if (params.extraPart && !matchesExtraSetPart(parts.slice(1), params.extraPart)) return false;

  return parts.slice(1).every((part) => {
    const compact = compactWorkedMath(part);
    if (/^(?:\([a-d]\))?h\.?c\.?f\.?=/i.test(compact)) return expectsHcf;
    if (/^(?:\([a-d]\))?l\.?c\.?m\.?=/i.test(compact)) return expectsLcm;

    const normalizedSet = normalizeSetLabel(part);
    if (normalizedSet.startsWith("common-factors=")) {
      return params.extraPart?.label === "common-factors";
    }
    if (normalizedSet.startsWith("three-digit-common-multiples=")) {
      return params.extraPart?.label === "three-digit-common-multiples";
    }
    return false;
  });
}

function matchesWorkedPrimeFactorization(
  contract: WorkedPrimeFactorizationContract,
  selectedAnswer: string
) {
  const { params } = contract;
  if (
    !Array.isArray(params.inputs) ||
    params.inputs.length < 2 ||
    params.inputs.some((value) => !Number.isSafeInteger(value) || value < 2) ||
    !isRecord(params.expectedOutputs)
  ) return false;

  const parts = normalizeWorkedMath(selectedAnswer)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < params.inputs.length + 1) return false;

  const inputSignatures: PrimeSignature[] = [];
  const consumedParts = new Set<number>();
  for (const input of params.inputs) {
    const expressionPattern = new RegExp(`^${input}=(.+)$`);
    const matches = parts
      .map((part, index) => ({ index, match: compactWorkedMath(part).match(expressionPattern) }))
      .filter((candidate) => candidate.match);
    if (matches.length !== 1) return false;
    consumedParts.add(matches[0].index);

    const signature = parsePrimeProduct(matches[0].match![1]);
    const expected = primeSignatureForInteger(input);
    if (!primeSignaturesEqual(signature, expected)) return false;

    const configuredExpression = params.expectedPrimeFactorizations?.[String(input)];
    if (configuredExpression && !primeSignaturesEqual(signature, parsePrimeProduct(configuredExpression))) return false;
    inputSignatures.push(signature!);
  }

  const expectedHcf = params.inputs.reduce(greatestCommonDivisor);
  const expectedLcm = params.inputs.reduce(leastCommonMultiple);
  const hcfSignature = combineSignatures(inputSignatures, "minimum");
  const lcmSignature = combineSignatures(inputSignatures, "maximum");

  const expectsHcf = params.expectedOutputs.hcf !== undefined;
  const expectsLcm = params.expectedOutputs.lcm !== undefined;
  if (!expectsHcf && !expectsLcm) return false;

  if (expectsHcf) {
    if (params.expectedOutputs.hcf !== expectedHcf) return false;
    if (!parseLabelledPrimeResult(
      parts,
      "hcf",
      hcfSignature,
      expectedHcf,
      params.allowLabelledFinalValueAfterCompleteDecompositions === true &&
        params.requireExplicitFactorProductAndFinalValue === false
    )) return false;
  }

  if (expectsLcm) {
    if (params.expectedOutputs.lcm !== expectedLcm) return false;
    if (!parseLabelledPrimeResult(
      parts,
      "lcm",
      lcmSignature,
      expectedLcm,
      params.allowLabelledFinalValueAfterCompleteDecompositions === true &&
        params.requireExplicitFactorProductAndFinalValue === false
    )) return false;
  }

  for (let index = 0; index < parts.length; index += 1) {
    if (consumedParts.has(index)) continue;
    const compact = compactWorkedMath(parts[index]);
    if (expectsHcf && /^(?:\([a-d]\))?h\.?c\.?f\.?=/i.test(compact)) continue;
    if (expectsLcm && /^(?:\([a-d]\))?l\.?c\.?m\.?=/i.test(compact)) continue;
    return false;
  }
  return true;
}

class ArithmeticParser {
  private index = 0;

  constructor(private readonly input: string) {}

  parse() {
    const result = this.parseExpression();
    return result && this.index === this.input.length ? result : null;
  }

  private peek() {
    return this.input[this.index] ?? "";
  }

  private consume() {
    return this.input[this.index++] ?? "";
  }

  private parseExpression(): ArithmeticNode | null {
    let node = this.parseTerm();
    if (!node) return null;
    while (this.peek() === "+" || this.peek() === "-") {
      const operator = this.consume();
      const right = this.parseTerm();
      if (!right) return null;
      if (operator === "+") {
        node = { kind: "add", children: [node, right] };
      } else {
        node = { kind: "subtract", left: node, right };
      }
    }
    return node;
  }

  private parseTerm(): ArithmeticNode | null {
    let node = this.parseFactor();
    if (!node) return null;
    while (this.peek() === "*" || this.peek() === "/") {
      const operator = this.consume();
      const right = this.parseFactor();
      if (!right) return null;
      if (operator === "*") {
        node = { kind: "multiply", children: [node, right] };
      } else {
        node = { kind: "divide", left: node, right };
      }
    }
    return node;
  }

  private parseFactor(): ArithmeticNode | null {
    if (this.peek() === "+") {
      this.consume();
      return this.parseFactor();
    }
    if (this.peek() === "-") {
      this.consume();
      const right = this.parseFactor();
      return right
        ? { kind: "subtract", left: { kind: "number", value: 0 }, right }
        : null;
    }
    if (this.peek() === "(") {
      this.consume();
      const inside = this.parseExpression();
      if (!inside || this.peek() !== ")") return null;
      this.consume();
      return inside;
    }

    const start = this.index;
    while (/\d|\./.test(this.peek())) this.consume();
    if (start === this.index) return null;
    const value = Number(this.input.slice(start, this.index));
    return Number.isFinite(value) ? { kind: "number", value } : null;
  }
}

function parseArithmetic(value: string) {
  const compact = compactWorkedMath(value)
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/");
  if (!/^[\d.+\-*/()]+$/.test(compact)) return null;
  return new ArithmeticParser(compact).parse();
}

function arithmeticValue(node: ArithmeticNode): number | null {
  switch (node.kind) {
    case "number":
      return node.value;
    case "add": {
      const values = node.children.map(arithmeticValue);
      return values.some((value) => value === null)
        ? null
        : (values as number[]).reduce((sum, value) => sum + value, 0);
    }
    case "multiply": {
      const values = node.children.map(arithmeticValue);
      return values.some((value) => value === null)
        ? null
        : (values as number[]).reduce((product, value) => product * value, 1);
    }
    case "subtract": {
      const left = arithmeticValue(node.left);
      const right = arithmeticValue(node.right);
      return left === null || right === null ? null : left - right;
    }
    case "divide": {
      const left = arithmeticValue(node.left);
      const right = arithmeticValue(node.right);
      return left === null || right === null || right === 0 ? null : left / right;
    }
  }
}

function canonicalArithmetic(node: ArithmeticNode): string {
  if (node.kind === "number") return `n:${node.value}`;
  if (node.kind === "subtract") {
    return `sub(${canonicalArithmetic(node.left)},${canonicalArithmetic(node.right)})`;
  }
  if (node.kind === "divide") {
    return `div(${canonicalArithmetic(node.left)},${canonicalArithmetic(node.right)})`;
  }

  const kind = node.kind === "add" ? "add" : "mul";
  const flattened: ArithmeticNode[] = [];
  const collect = (candidate: ArithmeticNode) => {
    if (candidate.kind === node.kind) candidate.children.forEach(collect);
    else flattened.push(candidate);
  };
  node.children.forEach(collect);
  return `${kind}(${flattened.map(canonicalArithmetic).sort().join(",")})`;
}

function substituteFormulaInputs(formula: string, inputs: Readonly<Record<string, number>>) {
  let result = formula;
  for (const [name, value] of Object.entries(inputs).sort(([left], [right]) => right.length - left.length)) {
    result = result.replace(new RegExp(`\\b${name}\\b`, "g"), String(value));
  }
  return result;
}

function normalizeLengthUnit(value: string) {
  return normalizeWorkedMath(value)
    .toLowerCase()
    .replace(/厘米/g, "cm")
    .replace(/米/g, "m")
    .replace(/\s+/g, "");
}

function matchesWorkedPerimeter(contract: WorkedPerimeterContract, selectedAnswer: string) {
  const { params } = contract;
  if (
    (params.shape !== "square" && params.shape !== "rectangle") ||
    !isRecord(params.inputs) ||
    !Object.values(params.inputs).every((value) => typeof value === "number" && Number.isFinite(value)) ||
    !Number.isFinite(params.expectedValue) ||
    (params.expectedUnit !== "cm" && params.expectedUnit !== "m") ||
    !Array.isArray(params.acceptedFormulaAsts) ||
    !params.acceptedFormulaAsts.length
  ) return false;

  const normalized = normalizeLengthUnit(selectedAnswer)
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/");
  const equalityParts = normalized.split("=");
  if (equalityParts.some((part) => !part)) return false;
  if (equalityParts.length < 2) return false;

  const firstPart = equalityParts[0].toLowerCase();
  const expressionParts = firstPart === "p" || firstPart === "perimeter"
    ? equalityParts.slice(1, -1)
    : equalityParts.slice(0, -1);
  if (!expressionParts.length) return false;

  const finalMatch = equalityParts.at(-1)!.match(/^(-?\d+(?:\.\d+)?)(cm|m)$/);
  if (!finalMatch) return false;
  if (Number(finalMatch[1]) !== params.expectedValue || finalMatch[2] !== params.expectedUnit) return false;

  const allowedCanonical = new Set<string>();
  for (const formula of params.acceptedFormulaAsts) {
    const parsed = parseArithmetic(substituteFormulaInputs(formula, params.inputs));
    if (!parsed || arithmeticValue(parsed) !== params.expectedValue) return false;
    allowedCanonical.add(canonicalArithmetic(parsed));
  }

  for (const expression of expressionParts) {
    const parsed = parseArithmetic(expression);
    if (!parsed || arithmeticValue(parsed) !== params.expectedValue) return false;
    if (!allowedCanonical.has(canonicalArithmetic(parsed))) return false;
  }
  return true;
}

export function matchesHongKongEaseWorkedResponseContract(
  contract: unknown,
  selectedAnswer: string
) {
  if (!isRecord(contract) || !isHongKongEaseWorkedResponseContractKind(contract.kind)) return false;
  if (!isRecord(contract.params) || typeof selectedAnswer !== "string" || !selectedAnswer.trim()) return false;

  try {
    switch (contract.kind) {
      case "worked-short-division":
        return matchesWorkedShortDivision(contract as unknown as WorkedShortDivisionContract, selectedAnswer);
      case "worked-prime-factorization":
        return matchesWorkedPrimeFactorization(contract as unknown as WorkedPrimeFactorizationContract, selectedAnswer);
      case "worked-perimeter":
        return matchesWorkedPerimeter(contract as unknown as WorkedPerimeterContract, selectedAnswer);
    }
  } catch {
    return false;
  }

  return false;
}
