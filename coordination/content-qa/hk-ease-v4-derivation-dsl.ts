import { createHash } from "node:crypto";

export const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const bigintAbs = (value: bigint): bigint => (value < BigInt("0") ? -value : value);

const bigintGcd = (left: bigint, right: bigint): bigint => {
  let a = bigintAbs(left);
  let b = bigintAbs(right);
  while (b !== BigInt("0")) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
};

export type RationalJson = {
  numerator: string;
  denominator: string;
};

export class ExactRational {
  readonly numerator: bigint;
  readonly denominator: bigint;

  constructor(numerator: bigint | number | string, denominator: bigint | number | string = BigInt("1")) {
    let n = BigInt(numerator);
    let d = BigInt(denominator);
    if (d === BigInt("0")) throw new Error("V4_STEP_EXECUTION_INVALID:zero-denominator");
    if (d < BigInt("0")) {
      n = -n;
      d = -d;
    }
    const divisor = bigintGcd(n, d) || BigInt("1");
    this.numerator = n / divisor;
    this.denominator = d / divisor;
  }

  static fromDecimal(value: string): ExactRational {
    const normalized = value.trim();
    if (/^[+-]?\d+$/.test(normalized)) return new ExactRational(normalized);
    const match = normalized.match(/^([+-]?)(\d*)\.(\d+)$/);
    if (!match) throw new Error(`V4_STEP_EXECUTION_INVALID:invalid-decimal:${value}`);
    const sign = match[1] === "-" ? -BigInt("1") : BigInt("1");
    const whole = match[2] || "0";
    const fractional = match[3];
    const denominator = BigInt("10") ** BigInt(fractional.length);
    return new ExactRational(sign * BigInt(`${whole}${fractional}`), denominator);
  }

  static fromJson(value: RationalJson): ExactRational {
    return new ExactRational(value.numerator, value.denominator);
  }

  add(other: ExactRational): ExactRational {
    return new ExactRational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  subtract(other: ExactRational): ExactRational {
    return new ExactRational(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  multiply(other: ExactRational): ExactRational {
    return new ExactRational(
      this.numerator * other.numerator,
      this.denominator * other.denominator
    );
  }

  divide(other: ExactRational): ExactRational {
    if (other.numerator === BigInt("0")) {
      throw new Error("V4_STEP_EXECUTION_INVALID:division-by-zero");
    }
    return new ExactRational(
      this.numerator * other.denominator,
      this.denominator * other.numerator
    );
  }

  pow(exponent: bigint): ExactRational {
    if (exponent === BigInt("0")) return new ExactRational(BigInt("1"));
    if (exponent < BigInt("0")) {
      return new ExactRational(
        this.denominator ** bigintAbs(exponent),
        this.numerator ** bigintAbs(exponent)
      );
    }
    return new ExactRational(this.numerator ** exponent, this.denominator ** exponent);
  }

  compare(other: ExactRational): -1 | 0 | 1 {
    const difference = this.numerator * other.denominator - other.numerator * this.denominator;
    return difference < BigInt("0") ? -1 : difference > BigInt("0") ? 1 : 0;
  }

  floor(): bigint {
    if (this.numerator >= BigInt("0")) return this.numerator / this.denominator;
    return -((-this.numerator + this.denominator - BigInt("1")) / this.denominator);
  }

  toJson(): RationalJson {
    return {
      numerator: this.numerator.toString(),
      denominator: this.denominator.toString()
    };
  }

  toImproperString(): string {
    return this.denominator === BigInt("1")
      ? this.numerator.toString()
      : `${this.numerator}/${this.denominator}`;
  }

  toMixedString(): string {
    if (this.denominator === BigInt("1")) return this.numerator.toString();
    const sign = this.numerator < BigInt("0") ? "-" : "";
    const absoluteNumerator = bigintAbs(this.numerator);
    const whole = absoluteNumerator / this.denominator;
    const remainder = absoluteNumerator % this.denominator;
    if (whole === BigInt("0")) return `${sign}${remainder}/${this.denominator}`;
    return remainder === BigInt("0")
      ? `${sign}${whole}`
      : `${sign}${whole} ${remainder}/${this.denominator}`;
  }

  toFiniteDecimalString(): string | null {
    let reducedDenominator = this.denominator;
    while (reducedDenominator % BigInt("2") === BigInt("0")) reducedDenominator /= BigInt("2");
    while (reducedDenominator % BigInt("5") === BigInt("0")) reducedDenominator /= BigInt("5");
    if (reducedDenominator !== BigInt("1")) return null;
    const sign = this.numerator < BigInt("0") ? "-" : "";
    let numerator = bigintAbs(this.numerator);
    const integer = numerator / this.denominator;
    numerator %= this.denominator;
    if (numerator === BigInt("0")) return `${sign}${integer}`;
    let digits = "";
    while (numerator !== BigInt("0")) {
      numerator *= BigInt("10");
      digits += (numerator / this.denominator).toString();
      numerator %= this.denominator;
    }
    return `${sign}${integer}.${digits}`;
  }
}

export type ExpressionAst =
  | { kind: "literal"; literal: string; value: RationalJson }
  | { kind: "unary"; operator: "-"; operand: ExpressionAst }
  | {
      kind: "binary";
      operator: "+" | "-" | "*" | "/" | "^";
      left: ExpressionAst;
      right: ExpressionAst;
    };

type Token =
  | { kind: "number"; value: string }
  | { kind: "rational"; numerator: string; denominator: string; literal: string }
  | { kind: "operator"; value: "+" | "-" | "*" | "/" | "^" }
  | { kind: "left" }
  | { kind: "right" };

const superscriptMap: Record<string, string> = {
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

const replaceLatexFractions = (source: string): string => {
  let value = source;
  const fractionPattern = /\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g;
  while (fractionPattern.test(value)) {
    value = value.replace(fractionPattern, "(($1)/($2))");
  }
  return value;
};

export const normalizeExactExpression = (source: string): string => {
  let value = replaceLatexFractions(source)
    .replace(/\\\(|\\\)|\$/g, "")
    .replace(/\\left|\\right|\\bigl?|\\bigr?/g, "")
    .replace(/\\[{}]/g, (token) => (token === "\\}" ? ")" : "("))
    .replace(/\\([{}\[\]])/g, "$1")
    .replace(/\\times|\\cdot|×|·/g, "*")
    .replace(/\\div|÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/[{}\[\]]/g, (token) => (token === "}" || token === "]" ? ")" : "("))
    .replace(/\\,/g, " ")
    .replace(/\?/g, "")
    .trim();
  value = value.replace(/(\d+)\s*\(\((\d+)\)\s*\/\s*\((\d+)\)\)/g, "(($1)+(($2)/($3)))");
  value = value.replace(/(\d+)\s+((?:\(\()?\d+\s*\/\s*\d+(?:\)\))?)/g, (match, whole, fraction) => {
    if (!String(fraction).includes("/")) return match;
    return `((${whole})+(${fraction}))`;
  });
  value = value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (digits) =>
    `^${[...digits].map((digit) => superscriptMap[digit]).join("")}`
  );
  value = value.replace(/\s+/g, " ").trim();
  return value;
};

const tokenizeExpression = (source: string): Token[] => {
  const normalized = normalizeExactExpression(source);
  const tokens: Token[] = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    const rest = normalized.slice(cursor);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) {
      cursor += whitespace[0].length;
      continue;
    }
    // In school-mathematics prompts, a compact numeric fraction is one lexical
    // quantity.  Treating both slashes in `22/7 ÷ 33/28` as left-associative
    // division changes the problem to `((22/7)/33)/28`.  Tokenizing each
    // numeric fraction atomically preserves the printed grouping while still
    // leaving `/` as an operator when either side is a compound expression.
    // Do not steal the integer prefix of a decimal divisor.  For example,
    // `3/0.25` is division by the decimal 0.25, not the invalid atomic
    // fraction `3/0` followed by `.25`.
    const rational = rest.match(/^(\d+)\s*\/\s*(\d+)(?![\d.])/);
    if (rational) {
      tokens.push({
        kind: "rational",
        numerator: rational[1],
        denominator: rational[2],
        literal: rational[0]
      });
      cursor += rational[0].length;
      continue;
    }
    const number = rest.match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
    if (number) {
      tokens.push({ kind: "number", value: number[0] });
      cursor += number[0].length;
      continue;
    }
    const token = normalized[cursor];
    if (token === "(") tokens.push({ kind: "left" });
    else if (token === ")") tokens.push({ kind: "right" });
    else if (["+", "-", "*", "/", "^"].includes(token)) {
      tokens.push({ kind: "operator", value: token as "+" | "-" | "*" | "/" | "^" });
    } else {
      throw new Error(`V4_STEP_EXECUTION_INVALID:unsupported-expression-token:${token}:${source}`);
    }
    cursor += 1;
  }
  return tokens;
};

class ExpressionParser {
  private cursor = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): ExpressionAst {
    const result = this.parseAdditive();
    if (this.cursor !== this.tokens.length) {
      throw new Error("V4_STEP_EXECUTION_INVALID:trailing-expression-token");
    }
    return result;
  }

  private peek(): Token | undefined {
    return this.tokens[this.cursor];
  }

  private consume(): Token {
    const token = this.tokens[this.cursor];
    if (!token) throw new Error("V4_STEP_EXECUTION_INVALID:unexpected-expression-end");
    this.cursor += 1;
    return token;
  }

  private parseAdditive(): ExpressionAst {
    let left = this.parseMultiplicative();
    let next = this.peek();
    while (next?.kind === "operator" && ["+", "-"].includes(next.value)) {
      const operator = (this.consume() as Extract<Token, { kind: "operator" }>).value as "+" | "-";
      left = { kind: "binary", operator, left, right: this.parseMultiplicative() };
      next = this.peek();
    }
    return left;
  }

  private parseMultiplicative(): ExpressionAst {
    let left = this.parsePower();
    let next = this.peek();
    while (next?.kind === "operator" && ["*", "/"].includes(next.value)) {
      const operator = (this.consume() as Extract<Token, { kind: "operator" }>).value as "*" | "/";
      left = { kind: "binary", operator, left, right: this.parsePower() };
      next = this.peek();
    }
    return left;
  }

  private parsePower(): ExpressionAst {
    let left = this.parseUnary();
    const next = this.peek();
    if (next?.kind === "operator" && next.value === "^") {
      this.consume();
      left = { kind: "binary", operator: "^", left, right: this.parsePower() };
    }
    return left;
  }

  private parseUnary(): ExpressionAst {
    const next = this.peek();
    if (next?.kind === "operator" && next.value === "-") {
      this.consume();
      return { kind: "unary", operator: "-", operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionAst {
    const token = this.consume();
    if (token.kind === "number") {
      return {
        kind: "literal",
        literal: token.value,
        value: ExactRational.fromDecimal(token.value).toJson()
      };
    }
    if (token.kind === "rational") {
      return {
        kind: "literal",
        literal: token.literal,
        value: new ExactRational(token.numerator, token.denominator).toJson()
      };
    }
    if (token.kind === "left") {
      const expression = this.parseAdditive();
      if (this.consume().kind !== "right") {
        throw new Error("V4_STEP_EXECUTION_INVALID:unclosed-parenthesis");
      }
      return expression;
    }
    throw new Error("V4_STEP_EXECUTION_INVALID:expected-expression-primary");
  }
}

export const parseExactExpression = (source: string): ExpressionAst =>
  new ExpressionParser(tokenizeExpression(source)).parse();

export type ExpressionEvaluationTrace = {
  stepId: string;
  operator: "literal" | "negate" | "+" | "-" | "*" | "/" | "^";
  inputValues: RationalJson[];
  outputValue: RationalJson;
};

export const evaluateExpressionAst = (
  ast: ExpressionAst
): { value: ExactRational; trace: ExpressionEvaluationTrace[] } => {
  let nextStep = 1;
  const trace: ExpressionEvaluationTrace[] = [];
  const visit = (node: ExpressionAst): ExactRational => {
    if (node.kind === "literal") {
      const value = ExactRational.fromJson(node.value);
      trace.push({
        stepId: `e${nextStep++}`,
        operator: "literal",
        inputValues: [],
        outputValue: value.toJson()
      });
      return value;
    }
    if (node.kind === "unary") {
      const operand = visit(node.operand);
      const output = new ExactRational(-operand.numerator, operand.denominator);
      trace.push({
        stepId: `e${nextStep++}`,
        operator: "negate",
        inputValues: [operand.toJson()],
        outputValue: output.toJson()
      });
      return output;
    }
    const left = visit(node.left);
    const right = visit(node.right);
    let output: ExactRational;
    switch (node.operator) {
      case "+":
        output = left.add(right);
        break;
      case "-":
        output = left.subtract(right);
        break;
      case "*":
        output = left.multiply(right);
        break;
      case "/":
        output = left.divide(right);
        break;
      case "^": {
        if (right.denominator !== BigInt("1")) {
          throw new Error("V4_STEP_EXECUTION_INVALID:non-integer-exponent");
        }
        output = left.pow(right.numerator);
        break;
      }
    }
    trace.push({
      stepId: `e${nextStep++}`,
      operator: node.operator,
      inputValues: [left.toJson(), right.toJson()],
      outputValue: output.toJson()
    });
    return output;
  };
  const value = visit(ast);
  return { value, trace };
};

export const evaluateExactExpression = (
  source: string
): { ast: ExpressionAst; value: ExactRational; trace: ExpressionEvaluationTrace[] } => {
  const ast = parseExactExpression(source);
  const { value, trace } = evaluateExpressionAst(ast);
  return { ast, value, trace };
};

export const integerGcd = (...values: bigint[]): bigint => {
  if (values.length === 0) throw new Error("V4_STEP_EXECUTION_INVALID:gcd-empty");
  return values.reduce((result, value) => bigintGcd(result, value));
};

export const integerLcm = (...values: bigint[]): bigint => {
  if (values.length === 0) throw new Error("V4_STEP_EXECUTION_INVALID:lcm-empty");
  return values.reduce((result, value) => {
    if (result === BigInt("0") || value === BigInt("0")) return BigInt("0");
    return bigintAbs((result / bigintGcd(result, value)) * value);
  });
};

export const positiveFactors = (value: bigint): bigint[] => {
  const target = bigintAbs(value);
  if (target === BigInt("0")) throw new Error("V4_STEP_EXECUTION_INVALID:factors-zero");
  const small: bigint[] = [];
  const large: bigint[] = [];
  for (let divisor = BigInt("1"); divisor * divisor <= target; divisor += BigInt("1")) {
    if (target % divisor !== BigInt("0")) continue;
    small.push(divisor);
    if (divisor * divisor !== target) large.push(target / divisor);
  }
  return [...small, ...large.reverse()];
};

export const isPrime = (value: bigint): boolean => {
  if (value < BigInt("2")) return false;
  if (value === BigInt("2")) return true;
  if (value % BigInt("2") === BigInt("0")) return false;
  for (let divisor = BigInt("3"); divisor * divisor <= value; divisor += BigInt("2")) {
    if (value % divisor === BigInt("0")) return false;
  }
  return true;
};

export const primeFactorization = (value: bigint): Array<{ prime: string; exponent: number }> => {
  let target = bigintAbs(value);
  if (target < BigInt("1")) throw new Error("V4_STEP_EXECUTION_INVALID:factorization-nonpositive");
  const factors: Array<{ prime: string; exponent: number }> = [];
  let divisor = BigInt("2");
  while (divisor * divisor <= target) {
    let exponent = 0;
    while (target % divisor === BigInt("0")) {
      target /= divisor;
      exponent += 1;
    }
    if (exponent > 0) factors.push({ prime: divisor.toString(), exponent });
    divisor = divisor === BigInt("2") ? BigInt("3") : divisor + BigInt("2");
  }
  if (target > BigInt("1")) factors.push({ prime: target.toString(), exponent: 1 });
  return factors;
};

export const renderPrimeFactorization = (
  factors: Array<{ prime: string; exponent: number }>
): string =>
  factors
    .map(({ prime, exponent }) => (exponent === 1 ? prime : `${prime}^${exponent}`))
    .join(" × ");

export const locateExactText = (
  source: string,
  exact: string,
  occurrence = 0
): { exact: string; occurrence: number; start: number; end: number } => {
  let cursor = -1;
  for (let index = 0; index <= occurrence; index += 1) {
    cursor = source.indexOf(exact, cursor + 1);
    if (cursor < 0) {
      throw new Error(`V4_FACT_LOCATOR_INVALID:${exact}:occurrence-${occurrence}`);
    }
  }
  return { exact, occurrence, start: cursor, end: cursor + exact.length };
};
