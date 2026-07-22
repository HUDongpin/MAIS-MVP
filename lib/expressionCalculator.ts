import { type CalculatorAngleMode } from "@/lib/calculatorEngine";

// Casio/TI-style expression evaluator: tokenize a full expression string, then
// evaluate it with a recursive-descent parser that honours operator precedence,
// parentheses, functions, postfix operators (², !, %), constants (π, e), unary
// minus, and implicit multiplication (2π, 2(3), )( ). Powers are right-associative
// and bind tighter than unary minus (−2² = −4, 2^−2 = 0.25). Pure and dependency-
// free so the arithmetic is unit-tested; the UI only builds/edits the string.

type FunctionName = "sin" | "cos" | "tan" | "asin" | "acos" | "atan" | "ln" | "log" | "sqrt";

type Token =
  | { type: "num"; value: number }
  | { type: "const"; value: "pi" | "e" }
  | { type: "op"; value: "+" | "-" | "×" | "÷" | "^" | "nCr" | "nPr" | "⁄" | "⁀" }
  | { type: "func"; name: FunctionName }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "postfix"; value: "square" | "factorial" | "percent" };

// Longest-match first so "sin⁻¹" wins over "sin".
const functionMatchers: Array<[string, FunctionName]> = [
  ["sin⁻¹", "asin"],
  ["cos⁻¹", "acos"],
  ["tan⁻¹", "atan"],
  ["sin", "sin"],
  ["cos", "cos"],
  ["tan", "tan"],
  ["ln", "ln"],
  ["log", "log"],
  ["√", "sqrt"]
];

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (char === " ") {
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let raw = "";
      let dotSeen = false;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        if (input[i] === ".") {
          if (dotSeen) throw new Error("Malformed number");
          dotSeen = true;
        }
        raw += input[i];
        i += 1;
      }
      const value = Number.parseFloat(raw);
      if (!Number.isFinite(value)) throw new Error("Malformed number");
      tokens.push({ type: "num", value });
      continue;
    }

    if (input.startsWith("nCr", i)) {
      tokens.push({ type: "op", value: "nCr" });
      i += 3;
      continue;
    }
    if (input.startsWith("nPr", i)) {
      tokens.push({ type: "op", value: "nPr" });
      i += 3;
      continue;
    }

    const matched = functionMatchers.find(([display]) => input.startsWith(display, i));
    if (matched) {
      tokens.push({ type: "func", name: matched[1] });
      i += matched[0].length;
      continue;
    }

    switch (char) {
      case "π":
        tokens.push({ type: "const", value: "pi" });
        break;
      case "e":
        tokens.push({ type: "const", value: "e" });
        break;
      case "+":
        tokens.push({ type: "op", value: "+" });
        break;
      case "-":
      case "−":
        tokens.push({ type: "op", value: "-" });
        break;
      case "×":
      case "*":
        tokens.push({ type: "op", value: "×" });
        break;
      case "÷":
      case "/":
        tokens.push({ type: "op", value: "÷" });
        break;
      case "^":
        tokens.push({ type: "op", value: "^" });
        break;
      case "⁄":
        tokens.push({ type: "op", value: "⁄" });
        break;
      case "⁀":
        tokens.push({ type: "op", value: "⁀" });
        break;
      case "(":
        tokens.push({ type: "lparen" });
        break;
      case ")":
        tokens.push({ type: "rparen" });
        break;
      case "²":
        tokens.push({ type: "postfix", value: "square" });
        break;
      case "!":
        tokens.push({ type: "postfix", value: "factorial" });
        break;
      case "%":
        tokens.push({ type: "postfix", value: "percent" });
        break;
      default:
        throw new Error(`Unexpected character: ${char}`);
    }
    i += 1;
  }

  return tokens;
}

// Insert an explicit × wherever two tokens sit adjacent as "value end" then
// "value start" (2π, 2(3), )(, 3!2), so the parser needs no implicit-multiply rule.
function withImplicitMultiplication(tokens: Token[]): Token[] {
  const isValueEnd = (t: Token) => t.type === "num" || t.type === "const" || t.type === "rparen" || t.type === "postfix";
  const isValueStart = (t: Token) => t.type === "num" || t.type === "const" || t.type === "func" || t.type === "lparen";

  const result: Token[] = [];
  tokens.forEach((token, index) => {
    if (index > 0 && isValueEnd(tokens[index - 1]) && isValueStart(token)) {
      result.push({ type: "op", value: "×" });
    }
    result.push(token);
  });
  return result;
}

function factorial(x: number): number {
  if (!Number.isInteger(x) || x < 0 || x > 170) throw new Error("Invalid factorial");
  let result = 1;
  for (let n = 2; n <= x; n += 1) result *= n;
  return result;
}

// n P r = n! / (n − r)!, computed as a rising product to avoid huge factorials.
function permutations(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) throw new Error("Invalid nPr");
  let result = 1;
  for (let i = 0; i < r; i += 1) result *= n - i;
  return result;
}

// n C r = n! / (r!(n − r)!), computed via a product (rounding away float noise).
function combinations(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) throw new Error("Invalid nCr");
  const k = Math.min(r, n - r);
  let result = 1;
  for (let i = 0; i < k; i += 1) result = (result * (n - i)) / (i + 1);
  return Math.round(result);
}

function applyFunction(name: FunctionName, x: number, angleMode: CalculatorAngleMode): number {
  const toRadians = (value: number) => (angleMode === "deg" ? (value * Math.PI) / 180 : value);
  const fromRadians = (value: number) => (angleMode === "deg" ? (value * 180) / Math.PI : value);

  switch (name) {
    case "sin":
      return Math.sin(toRadians(x));
    case "cos":
      return Math.cos(toRadians(x));
    case "tan":
      return Math.tan(toRadians(x));
    case "asin":
      if (x < -1 || x > 1) throw new Error("Domain error");
      return fromRadians(Math.asin(x));
    case "acos":
      if (x < -1 || x > 1) throw new Error("Domain error");
      return fromRadians(Math.acos(x));
    case "atan":
      return fromRadians(Math.atan(x));
    case "ln":
      if (x <= 0) throw new Error("Domain error");
      return Math.log(x);
    case "log":
      if (x <= 0) throw new Error("Domain error");
      return Math.log10(x);
    case "sqrt":
      if (x < 0) throw new Error("Domain error");
      return Math.sqrt(x);
  }
}

function parseTokens(tokens: Token[], angleMode: CalculatorAngleMode): number {
  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token => tokens[pos++];
  const expect = (type: Token["type"]) => {
    const token = consume();
    if (!token || token.type !== type) throw new Error(`Expected ${type}`);
  };

  // expr := term (('+' | '-') term)*
  function parseAdditive(): number {
    let value = parseTerm();
    for (;;) {
      const token = peek();
      if (token?.type === "op" && (token.value === "+" || token.value === "-")) {
        consume();
        const rhs = parseTerm();
        value = token.value === "+" ? value + rhs : value - rhs;
      } else {
        return value;
      }
    }
  }

  // term := comb (('×' | '÷') comb)*
  function parseTerm(): number {
    let value = parseCombinatorial();
    for (;;) {
      const token = peek();
      if (token?.type === "op" && (token.value === "×" || token.value === "÷")) {
        consume();
        const rhs = parseCombinatorial();
        if (token.value === "÷" && rhs === 0) throw new Error("Divide by zero");
        value = token.value === "×" ? value * rhs : value / rhs;
      } else {
        return value;
      }
    }
  }

  // comb := unary (('nCr' | 'nPr') unary)*
  function parseCombinatorial(): number {
    let value = parseUnary();
    for (;;) {
      const token = peek();
      if (token?.type === "op" && (token.value === "nCr" || token.value === "nPr")) {
        consume();
        const rhs = parseUnary();
        value = token.value === "nCr" ? combinations(value, rhs) : permutations(value, rhs);
      } else {
        return value;
      }
    }
  }

  // unary := '-' unary | power
  function parseUnary(): number {
    const token = peek();
    if (token?.type === "op" && token.value === "-") {
      consume();
      return -parseUnary();
    }
    return parsePower();
  }

  // power := mixed ('^' unary)?   (right-associative; exponent may be unary)
  function parsePower(): number {
    const base = parseMixed();
    const token = peek();
    if (token?.type === "op" && token.value === "^") {
      consume();
      return Math.pow(base, parseUnary());
    }
    return base;
  }

  // mixed := frac ('⁀' frac)?   (whole ⁀ fraction → whole + fraction, e.g. 2⁀1⁄3)
  function parseMixed(): number {
    const whole = parseFraction();
    const token = peek();
    if (token?.type === "op" && token.value === "⁀") {
      consume();
      return whole + parseFraction();
    }
    return whole;
  }

  // frac := postfix ('⁄' postfix)*   (tight-binding division, e.g. 1⁄2)
  function parseFraction(): number {
    let value = parsePostfix();
    for (;;) {
      const token = peek();
      if (token?.type === "op" && token.value === "⁄") {
        consume();
        const denominator = parsePostfix();
        if (denominator === 0) throw new Error("Divide by zero");
        value /= denominator;
      } else {
        return value;
      }
    }
  }

  // postfix := primary ('²' | '!' | '%')*
  function parsePostfix(): number {
    let value = parsePrimary();
    for (;;) {
      const token = peek();
      if (token?.type === "postfix") {
        consume();
        if (token.value === "square") value = value * value;
        else if (token.value === "percent") value /= 100;
        else value = factorial(value);
      } else {
        return value;
      }
    }
  }

  // primary := number | const | '(' expr ')' | func '(' expr ')'
  function parsePrimary(): number {
    const token = peek();
    if (!token) throw new Error("Unexpected end of expression");
    if (token.type === "num") {
      consume();
      return token.value;
    }
    if (token.type === "const") {
      consume();
      return token.value === "pi" ? Math.PI : Math.E;
    }
    if (token.type === "lparen") {
      consume();
      const value = parseAdditive();
      expect("rparen");
      return value;
    }
    if (token.type === "func") {
      consume();
      expect("lparen");
      const argument = parseAdditive();
      expect("rparen");
      return applyFunction(token.name, argument, angleMode);
    }
    throw new Error("Unexpected token");
  }

  const result = parseAdditive();
  if (pos !== tokens.length) throw new Error("Unexpected trailing tokens");
  return result;
}

// Evaluate a full expression string. Returns null for any tokenization, parse, or
// math (domain / divide-by-zero / overflow) error so callers show a single
// "Error" state.
export function evaluateExpression(input: string, angleMode: CalculatorAngleMode): number | null {
  try {
    const tokens = withImplicitMultiplication(tokenize(input));
    if (tokens.length === 0) return null;
    const result = parseTokens(tokens, angleMode);
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
