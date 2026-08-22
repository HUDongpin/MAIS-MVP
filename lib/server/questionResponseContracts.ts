export type GenericEquivalenceResponseContract = {
  kind: "generic-equivalence";
};

export type FixedDenominatorFractionResponseContract = {
  kind: "fixed-denominator-fraction";
  denominator: number;
};

export type ExactFractionResponseContract = {
  kind: "exact-fraction";
};

export type SimplestFractionResponseContract = {
  kind: "simplest-fraction";
};

export type PercentageResponseContract = {
  kind: "percentage";
  requirePercentSign: true;
};

export type QuantityResponseContract = {
  kind: "quantity";
  target: string;
  unitPolicy: "exact" | "convertible";
  allowBareNumber?: true;
};

export type ExactPiQuantityResponseContract = {
  kind: "exact-pi-quantity";
  target: string;
};

export type AlgebraicExponentResponseContract = {
  kind: "algebraic-exponent";
};

export type PolynomialEquivalenceResponseContract = {
  kind: "polynomial-equivalence";
};

export type FactorProductEquivalenceResponseContract = {
  kind: "factor-product-equivalence";
};

export type ClockTimeResponseContract = {
  kind: "clock-time";
  hour: number;
  minute: number;
};

export type MixedMetresCentimetresResponseContract = {
  kind: "mixed-metres-centimetres";
  metres: number;
  centimetres: number;
};

export type AngleDegreesResponseContract = {
  kind: "angle-degrees";
  degrees: number;
};

export type AxisEquationResponseContract = {
  kind: "axis-equation";
  variable: "x" | "y";
  value: number;
};

export type FixedDecimalQuantityResponseContract = {
  kind: "fixed-decimal-quantity";
  decimalPlaces: number;
  target: string;
  unit: "minutes-per-mark";
};

export type UnorderedFamilyPairResponseContract = {
  kind: "unordered-family-pair";
  families: ["rectangle", "rhombus"];
};

export type HcfLcmPairResponseContract = {
  kind: "hcf-lcm-pair";
  hcf: number;
  lcm: number;
};

export type UnorderedRootsResponseContract = {
  kind: "unordered-roots";
  variable: "x";
  values: number[];
};

export type YAxisReflectionDescriptionResponseContract = {
  kind: "y-axis-reflection-description";
};

export type OpenLowerDomainResponseContract = {
  kind: "open-lower-domain";
  variable: "x";
  lowerBound: number;
};

export type OrderedPairResponseContract = {
  kind: "ordered-pair";
  x: number;
  y: number;
};

export type QuestionResponseContract =
  | GenericEquivalenceResponseContract
  | FixedDenominatorFractionResponseContract
  | ExactFractionResponseContract
  | SimplestFractionResponseContract
  | PercentageResponseContract
  | QuantityResponseContract
  | ExactPiQuantityResponseContract
  | AlgebraicExponentResponseContract
  | PolynomialEquivalenceResponseContract
  | FactorProductEquivalenceResponseContract
  | ClockTimeResponseContract
  | MixedMetresCentimetresResponseContract
  | AngleDegreesResponseContract
  | AxisEquationResponseContract
  | FixedDecimalQuantityResponseContract
  | UnorderedFamilyPairResponseContract
  | HcfLcmPairResponseContract
  | UnorderedRootsResponseContract
  | YAxisReflectionDescriptionResponseContract
  | OpenLowerDomainResponseContract
  | OrderedPairResponseContract;

const genericEquivalenceContract: GenericEquivalenceResponseContract = {
  kind: "generic-equivalence"
};

const registeredQuestionResponseContracts = new Map<string, QuestionResponseContract>([
  // Representation-specific fractions.
  ["pq-p3-fractions-intro-2-v2", { kind: "fixed-denominator-fraction", denominator: 4 }],
  ["supp-p3-fractions-intro-guided-example-v2", { kind: "fixed-denominator-fraction", denominator: 6 }],
  ["supp-p3-fractions-intro-key-fact-v2", { kind: "exact-fraction" }],
  ["supp-probability-s2-guided-example-v2", { kind: "exact-fraction" }],
  ["pq-p5-fractions-operations-2-v2", { kind: "simplest-fraction" }],
  ["supp-p5-fractions-operations-key-fact-v2", { kind: "simplest-fraction" }],
  ["supp-p5-fractions-operations-guided-example-v2", { kind: "simplest-fraction" }],

  // Clock notation is part of the requested answer, so a bare hour is not enough.
  ["pq-p1-measurement-time-2-v2", { kind: "clock-time", hour: 3, minute: 0 }],
  ["supp-p1-measurement-time-key-fact-v2", { kind: "clock-time", hour: 3, minute: 30 }],
  ["supp-p1-measurement-time-guided-example-v2", { kind: "clock-time", hour: 5, minute: 0 }],
  ["pq-p2-money-time-2", { kind: "clock-time", hour: 4, minute: 30 }],
  ["supp-p2-money-time-guided-example-v2", { kind: "clock-time", hour: 3, minute: 0 }],

  // Quantities whose dimension and displayed unit carry mathematical meaning.
  ["supp-p2-money-time-key-fact-v2", { kind: "quantity", target: "HK$4", unitPolicy: "exact" }],
  ["pq-p2-length-data-1-v2", { kind: "quantity", target: "100 cm", unitPolicy: "exact", allowBareNumber: true }],
  ["supp-p2-length-data-key-fact-v2", { kind: "quantity", target: "2 m", unitPolicy: "exact" }],
  ["supp-p2-length-data-guided-example-v2", { kind: "mixed-metres-centimetres", metres: 1, centimetres: 10 }],
  ["pq-p3-measurement-2-v2", { kind: "quantity", target: "900 mL", unitPolicy: "exact" }],
  ["supp-p3-measurement-key-fact-v2", { kind: "quantity", target: "2000 mL", unitPolicy: "exact" }],
  ["supp-p3-measurement-guided-example-v2", { kind: "quantity", target: "55 cm", unitPolicy: "exact" }],
  ["pq-p4-perimeter-area-1-v2", { kind: "quantity", target: "22 cm", unitPolicy: "exact" }],
  ["supp-p4-perimeter-area-key-fact-v2", { kind: "quantity", target: "24 cm", unitPolicy: "exact" }],
  ["supp-p4-perimeter-area-guided-example-v2", { kind: "quantity", target: "18 cm^2", unitPolicy: "exact" }],
  ["pq-p5-volume-1-v2", { kind: "quantity", target: "24 cm^3", unitPolicy: "exact" }],
  ["graph-p5-volume-cube-v2", { kind: "quantity", target: "27 cm^3", unitPolicy: "exact" }],
  ["supp-p5-volume-key-fact-v2", { kind: "quantity", target: "4 cm", unitPolicy: "exact" }],
  ["pq-p5-rates-1-v2", { kind: "quantity", target: "HK$5", unitPolicy: "exact" }],
  ["pq-p5-rates-2-v2", { kind: "quantity", target: "HK$7", unitPolicy: "exact" }],
  ["supp-p5-rates-key-fact-v2", { kind: "quantity", target: "HK$6", unitPolicy: "exact" }],
  ["supp-p5-rates-guided-example-v2", { kind: "quantity", target: "HK$6", unitPolicy: "exact" }],
  ["pq-p6-percentages-2-v2", { kind: "quantity", target: "HK$60", unitPolicy: "exact" }],
  ["pq-p6-ratio-proportion-2-v2", { kind: "quantity", target: "24 °C", unitPolicy: "exact" }],
  ["pq-p6-speed-1-v2", { kind: "quantity", target: "30 km/h", unitPolicy: "exact" }],
  ["graph-p6-speed-distance-v2", { kind: "quantity", target: "6 km", unitPolicy: "exact" }],
  ["supp-p6-speed-key-fact-v2", { kind: "quantity", target: "60 km/h", unitPolicy: "exact" }],
  ["supp-mixed-problem-solving-key-fact-v2", { kind: "quantity", target: "24 km/h", unitPolicy: "exact" }],
  ["supp-mixed-problem-solving-guided-example-v2", { kind: "quantity", target: "30 km", unitPolicy: "exact" }],

  // Exact symbolic geometry.
  ["hk-s3-arc-length-sector-area-1", { kind: "exact-pi-quantity", target: "4π cm" }],
  ["supp-arc-length-sector-area-key-fact", { kind: "exact-pi-quantity", target: "4π cm" }],
  ["supp-arc-length-sector-area-guided-example", { kind: "exact-pi-quantity", target: "12π cm^2" }],

  // Expanded algebra may be reordered, but exponent syntax may not be collapsed to x2.
  ["q18", { kind: "algebraic-exponent" }],
  ["supp-polynomials-key-fact-v2", { kind: "algebraic-exponent" }],
  ["supp-polynomials-guided-example", { kind: "algebraic-exponent" }],
  ["hk-s3-identities-square-patterns-1", { kind: "algebraic-exponent" }],
  ["q20-v2", { kind: "algebraic-exponent" }],
  ["supp-differentiation-intro-key-fact-v2", { kind: "algebraic-exponent" }],
  ["supp-more-algebra-key-fact-v2", { kind: "polynomial-equivalence" }],
  ["supp-more-algebra-guided-example-v2", { kind: "polynomial-equivalence" }],
  ["supp-identities-square-patterns-key-fact", { kind: "polynomial-equivalence" }],
  ["supp-identities-square-patterns-guided-example", { kind: "factor-product-equivalence" }],

  // Angle units, exact equations, and precision requirements.
  ["graph-s1-angles-straight-line", { kind: "angle-degrees", degrees: 50 }],
  ["supp-angles-key-fact-v2", { kind: "angle-degrees", degrees: 180 }],
  ["supp-angles-guided-example-v2", { kind: "angle-degrees", degrees: 60 }],
  ["supp-circles-key-fact-v2", { kind: "angle-degrees", degrees: 90 }],
  ["supp-circles-guided-example-v2", { kind: "angle-degrees", degrees: 70 }],
  ["q23-v2", { kind: "angle-degrees", degrees: 30 }],
  ["supp-trigonometry-s5-key-fact-v2", { kind: "angle-degrees", degrees: 360 }],
  ["graph-quadratic-patterns-axis-v2", { kind: "axis-equation", variable: "x", value: -2 }],
  ["q24-v2", { kind: "fixed-decimal-quantity", decimalPlaces: 2, target: "1.50 minutes per mark", unit: "minutes-per-mark" }],
  ["supp-exam-revision-key-fact-v2", { kind: "fixed-decimal-quantity", decimalPlaces: 2, target: "1.33 minutes per mark", unit: "minutes-per-mark" }],
  ["supp-exam-revision-guided-example-v2", { kind: "fixed-decimal-quantity", decimalPlaces: 2, target: "1.50 minutes per mark", unit: "minutes-per-mark" }],

  // Semantically equivalent word orders and standard mathematical notation.
  ["supp-p4-angles-key-fact-v2", { kind: "unordered-family-pair", families: ["rectangle", "rhombus"] }],
  ["supp-p4-large-numbers-guided-example-v2", { kind: "hcf-lcm-pair", hcf: 6, lcm: 36 }],
  ["graph-quadratic-patterns-roots-v2", { kind: "unordered-roots", variable: "x", values: [1, 3] }],
  ["q27", { kind: "y-axis-reflection-description" }],
  ["supp-advanced-functions-guided-example-v2", { kind: "open-lower-domain", variable: "x", lowerBound: -2 }],
  ["graph-quadratic-patterns-y-intercept-v2", { kind: "ordered-pair", x: 0, y: -4 }]
]);

export {
  isRetiredHongKongQuestionId as isRetiredQuestionId,
  retiredHongKongQuestionIds as retiredQuestionIds
} from "@/lib/hongKongQuestionRetirement";

export function questionResponseContractFor(questionId?: string | null): QuestionResponseContract {
  if (!questionId) return genericEquivalenceContract;
  return registeredQuestionResponseContracts.get(questionId) ?? genericEquivalenceContract;
}

export function hasStrictQuestionResponseContract(questionId?: string | null) {
  return questionResponseContractFor(questionId).kind !== "generic-equivalence";
}

export function strictQuestionResponseContractEntries() {
  return [...registeredQuestionResponseContracts.entries()] as Array<readonly [string, QuestionResponseContract]>;
}

type FractionParts = {
  numerator: number;
  denominator: number;
};

function fractionParts(value: string): FractionParts | null {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .trim();
  const latexMatch = normalized.match(/^\\(?:dfrac|tfrac|frac)\s*\{\s*([+-]?\d+)\s*\}\s*\{\s*([+-]?\d+)\s*\}$/);
  const match = latexMatch ?? normalized.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (!match) return null;
  const denominator = Number(match[2]);
  if (denominator <= 0) return null;
  return { numerator: Number(match[1]), denominator };
}

function fractionsAreEquivalent(left: FractionParts, right: FractionParts) {
  return left.numerator * right.denominator === right.numerator * left.denominator;
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a;
}

const superscriptDigits: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9"
};

function normalizeSuperscriptExponents(value: string) {
  return value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (digits) =>
    `^${Array.from(digits, (digit) => superscriptDigits[digit] ?? digit).join("")}`
  );
}

function normalizeAlgebraicExponentSyntax(value: string) {
  return normalizeSuperscriptExponents(value)
    .normalize("NFKC")
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\(?:cdot|times)/g, "*")
    .replace(/\^\{\s*([+-]?\d+)\s*\}/g, "^$1")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function containsImplicitExponentDigits(value: string) {
  return /[a-z]\d/i.test(value.replace(/\^[+-]?\d+/g, ""));
}

function polynomialSignature(value: string) {
  const normalized = normalizeAlgebraicExponentSyntax(value);
  if (!normalized || /[=><\/(){}]/.test(normalized) || /\^[+-]?0/.test(normalized)) return null;
  const terms = normalized.match(/[+-]?[^+-]+/g);
  if (!terms || terms.join("") !== normalized) return null;

  const coefficients = new Map<string, number>();
  for (const rawTerm of terms) {
    const sign = rawTerm.startsWith("-") ? -1 : 1;
    const unsigned = rawTerm.replace(/^[+-]/, "");
    const coefficientMatch = unsigned.match(/^(\d+(?:\.\d+)?)(?:\*)?/);
    const coefficient = coefficientMatch ? Number(coefficientMatch[1]) : 1;
    const factorsText = unsigned.slice(coefficientMatch?.[0].length ?? 0);
    if (!factorsText) {
      if (!coefficientMatch) return null;
      coefficients.set("#", (coefficients.get("#") ?? 0) + sign * coefficient);
      continue;
    }

    const compactFactors = factorsText.replace(/\*/g, "");
    const factorMatches = [...compactFactors.matchAll(/([a-z])(?:\^(\d+))?/g)];
    if (!factorMatches.length || factorMatches.map((match) => match[0]).join("") !== compactFactors) return null;
    const powers = new Map<string, number>();
    for (const match of factorMatches) {
      powers.set(match[1], (powers.get(match[1]) ?? 0) + Number(match[2] ?? 1));
    }
    const key = [...powers.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([variable, exponent]) => `${variable}^${exponent}`)
      .join("*");
    coefficients.set(key, (coefficients.get(key) ?? 0) + sign * coefficient);
  }

  return [...coefficients.entries()]
    .filter(([, coefficient]) => Math.abs(coefficient) > 0.000001)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, coefficient]) => `${key}:${coefficient}`)
    .join("|");
}

type QuantityParts = {
  scalarText: string;
  dimension: "length" | "area" | "volume" | "capacity" | "speed" | "money" | "temperature";
  unit: string;
  baseFactor: number;
};

const quantityUnits: Record<string, Omit<QuantityParts, "scalarText">> = {
  cm: { dimension: "length", unit: "cm", baseFactor: 0.01 },
  m: { dimension: "length", unit: "m", baseFactor: 1 },
  km: { dimension: "length", unit: "km", baseFactor: 1000 },
  "cm^2": { dimension: "area", unit: "cm^2", baseFactor: 0.0001 },
  "m^2": { dimension: "area", unit: "m^2", baseFactor: 1 },
  "km^2": { dimension: "area", unit: "km^2", baseFactor: 1_000_000 },
  "cm^3": { dimension: "volume", unit: "cm^3", baseFactor: 0.000001 },
  "m^3": { dimension: "volume", unit: "m^3", baseFactor: 1 },
  "km^3": { dimension: "volume", unit: "km^3", baseFactor: 1_000_000_000 },
  ml: { dimension: "capacity", unit: "ml", baseFactor: 0.001 },
  l: { dimension: "capacity", unit: "l", baseFactor: 1 },
  "km/h": { dimension: "speed", unit: "km/h", baseFactor: 1000 / 3600 },
  "m/s": { dimension: "speed", unit: "m/s", baseFactor: 1 },
  "°c": { dimension: "temperature", unit: "°c", baseFactor: 1 }
};

function normalizeQuantityText(value: string) {
  return normalizeSuperscriptExponents(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\\[()]/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/\^\{\s*([23])\s*\}/g, "^$1")
    .replace(/\bkmh\b/g, "km/h")
    .replace(/平方\s*公里/g, " km^2 ")
    .replace(/平方\s*米/g, " m^2 ")
    .replace(/平方\s*厘米/g, " cm^2 ")
    .replace(/立方\s*公里/g, " km^3 ")
    .replace(/立方\s*米/g, " m^3 ")
    .replace(/立方\s*厘米/g, " cm^3 ")
    .replace(/公里\s*(?:每|\/|／)\s*小時/g, " km/h ")
    .replace(/毫升/g, " ml ")
    .replace(/公升|升/g, " l ")
    .replace(/公里/g, " km ")
    .replace(/厘米/g, " cm ")
    .replace(/米/g, " m ")
    .replace(/\s+/g, " ")
    .trim();
}

function quantityParts(value: string): QuantityParts | null {
  let normalized = normalizeQuantityText(value);
  const chineseTemperature = normalized.match(/^攝氏\s*(.+?)\s*度$/);
  if (chineseTemperature) normalized = `${chineseTemperature[1]} °c`;
  const wordTemperature = normalized.match(/^(.+?)\s*degrees?\s+celsius$/);
  if (wordTemperature) normalized = `${wordTemperature[1]} °c`;
  const bareChineseTemperature = normalized.match(/^(.+?)\s*度$/);
  if (bareChineseTemperature) normalized = `${bareChineseTemperature[1]} °c`;

  const chineseMoneyMatch = normalized.match(/^(?:港幣\s*)?(.+?)\s*元$/);
  if (chineseMoneyMatch) {
    return { scalarText: chineseMoneyMatch[1].trim(), dimension: "money", unit: "hk$", baseFactor: 1 };
  }
  const moneyMatch = normalized.match(/^(?:hk)?\$\s*(.+)$/);
  if (moneyMatch) {
    return { scalarText: moneyMatch[1].trim(), dimension: "money", unit: "hk$", baseFactor: 1 };
  }

  const match = normalized.match(/^(.+?)\s*(km\/h|m\/s|cm\^?[23]|m\^?[23]|km\^?[23]|ml|l|°c|cm|m|km)$/);
  if (!match) return null;
  const unit = match[2].replace(/^(cm|m|km)([23])$/, "$1^$2");
  const definition = quantityUnits[unit];
  if (!definition) return null;
  return { scalarText: match[1].trim(), ...definition };
}

function exactPiCoefficient(value: string) {
  const normalized = normalizeQuantityText(value)
    .replace(/\\pi|π|\bpi\b/g, "pi")
    .replace(/[×*\s]/g, "");
  const match = normalized.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+)?)pi$/);
  if (!match) return null;
  if (!match[1] || match[1] === "+") return 1;
  if (match[1] === "-") return -1;
  const coefficient = Number(match[1]);
  return Number.isFinite(coefficient) ? coefficient : null;
}

const clockNumberWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
};

function clockTimeParts(value: string) {
  const normalized = value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  const colon = normalized.match(/^(\d{1,2})\s*:\s*(\d{2})$/);
  if (colon) return { hour: Number(colon[1]), minute: Number(colon[2]) };
  const wholeHour = normalized.match(/^(\d{1,2})\s*(?:o\s*['’]?\s*clock|時正|時|點正|点正)$/);
  if (wholeHour) return { hour: Number(wholeHour[1]), minute: 0 };
  const wordHour = normalized.match(/^([a-z]+)\s+o\s*['’]?\s*clock$/);
  if (wordHour && clockNumberWords[wordHour[1]]) return { hour: clockNumberWords[wordHour[1]], minute: 0 };
  const halfPast = normalized.match(/^half\s+past\s+(\d{1,2}|[a-z]+)$/);
  if (halfPast) {
    const hour = Number(halfPast[1]) || clockNumberWords[halfPast[1]];
    if (hour) return { hour, minute: 30 };
  }
  const chineseHalfPast = normalized.match(/^(\d{1,2})\s*(?:時|點|点)半$/);
  return chineseHalfPast ? { hour: Number(chineseHalfPast[1]), minute: 30 } : null;
}

function mixedMetresCentimetresParts(value: string) {
  const normalized = value.normalize("NFKC").toLowerCase().replace(/厘米/g, " cm ").replace(/米/g, " m ");
  const match = normalized.match(/^\s*(\d+)\s*m\s*(\d+)\s*cm\s*$/);
  return match ? { metres: Number(match[1]), centimetres: Number(match[2]) } : null;
}

function angleDegrees(value: string) {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  const match = normalized.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:°|degrees?|度)$/);
  return match ? Number(match[1]) : null;
}

function axisEquationValue(value: string, variable: "x" | "y") {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\\[()]/g, "")
    .replace(/等於|equals?/g, "=")
    .replace(/\s+/g, "");
  const match = normalized.match(new RegExp(`^${variable}=([+-]?\\d+(?:\\.\\d+)?)$`));
  return match ? Number(match[1]) : null;
}

function fixedDecimalMinutesPerMark(value: string, decimalPlaces: number) {
  const normalized = value.normalize("NFKC").trim().toLowerCase().replace(/／/g, "/");
  const match = normalized.match(/^([+-]?\d+\.(\d+))\s*(?:minutes?\s*per\s*mark|min(?:utes)?\s*\/\s*mark|min\s+per\s+mark|分鐘\s*\/\s*分)$/);
  if (!match || match[2].length !== decimalPlaces) return null;
  return Number(match[1]);
}

function familyPairMatches(value: string) {
  const normalized = value.normalize("NFKC").toLowerCase();
  const families = new Set<string>();
  if (/rectangle|長方形/.test(normalized)) families.add("rectangle");
  if (/rhombus|菱形/.test(normalized)) families.add("rhombus");
  if (/square|正方形/.test(normalized)) families.add("square");
  if (/parallelogram|平行四邊形/.test(normalized)) families.add("parallelogram");
  return families.size === 2 && families.has("rectangle") && families.has("rhombus");
}

function hcfLcmParts(value: string) {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/h\.\s*c\.\s*f\./g, "hcf")
    .replace(/l\.\s*c\.\s*m\./g, "lcm")
    .replace(/最大公因數\s*(?:是|=)?\s*/g, "hcf=")
    .replace(/最小公倍數\s*(?:是|=)?\s*/g, "lcm=")
    .replace(/\s+/g, "");
  const hcf = normalized.match(/hcf=?(\d+)/);
  const lcm = normalized.match(/lcm=?(\d+)/);
  return hcf && lcm ? { hcf: Number(hcf[1]), lcm: Number(lcm[1]) } : null;
}

function unorderedNumericValues(value: string) {
  const normalized = value.normalize("NFKC").toLowerCase();
  const numbers = [...normalized.matchAll(/(?<![a-z\d.])[+-]?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  return [...new Set(numbers)].sort((left, right) => left - right);
}

function yAxisReflectionDescriptionMatches(value: string) {
  const normalized = value.normalize("NFKC").toLowerCase().replace(/[，。,.\-]/g, " ").replace(/\s+/g, " ");
  const contradicts = /y\s*(?:coordinate)?\s*changes?\s*sign|y\s*坐標\s*(?:變號|改變符號)|y坐標(?:變號|改變符號)/.test(normalized);
  if (contradicts) return false;
  const english = /(?:x\s*(?:coordinate)?\s*changes?\s*sign|sign\s+of\s+(?:the\s+)?x(?:\s*coordinate)?\s+changes?)/.test(normalized);
  const chinese = /x\s*坐標\s*(?:變號|改變符號)|x坐標(?:變號|改變符號)|x\s*坐標的符號改變|x坐標的符號改變/.test(normalized);
  return english || chinese;
}

function openLowerDomainMatches(value: string, variable: "x", lowerBound: number) {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\\infty|∞|infinity/g, "inf")
    .replace(/大於/g, ">")
    .replace(/\s+/g, "")
    .replace(/^domain:?/, "");
  if (normalized === `${variable}>${lowerBound}`) return true;
  const interval = normalized.replace(new RegExp(`^${variable}(?:∈|\\in)`), "");
  return interval === `(${lowerBound},inf)`;
}

function factorProductSignature(value: string) {
  const normalized = normalizeAlgebraicExponentSyntax(value).replace(/\)\*\(/g, ")(");
  const match = normalized.match(/^\(([^()]+)\)\(([^()]+)\)$/);
  if (!match) return null;
  const factors = [polynomialSignature(match[1]), polynomialSignature(match[2])];
  if (factors.some((factor) => factor === null)) return null;
  return (factors as string[]).sort().join("||");
}

function orderedPairParts(value: string) {
  const normalized = value
    .normalize("NFKC")
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\[()]/g, "")
    .trim();
  const match = normalized.match(/^\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)$/);
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
}

export function responseMatchesQuestionContract(input: {
  contract: QuestionResponseContract;
  selectedAnswer: string;
  acceptedAnswers: string[];
  genericMatches: (selectedAnswer: string, acceptedAnswer: string) => boolean;
  parseScalar: (value: string) => number | null;
}) {
  const { contract, selectedAnswer, acceptedAnswers, genericMatches, parseScalar } = input;
  const matchesAccepted = (selected = selectedAnswer) =>
    acceptedAnswers.some((acceptedAnswer) => genericMatches(selected, acceptedAnswer));

  switch (contract.kind) {
    case "generic-equivalence":
      return matchesAccepted();
    case "fixed-denominator-fraction": {
      const selectedFraction = fractionParts(selectedAnswer);
      return Boolean(selectedFraction && selectedFraction.denominator === contract.denominator && acceptedAnswers.some((acceptedAnswer) => {
        const acceptedFraction = fractionParts(acceptedAnswer);
        return Boolean(acceptedFraction && fractionsAreEquivalent(selectedFraction, acceptedFraction));
      }));
    }
    case "exact-fraction": {
      const selectedFraction = fractionParts(selectedAnswer);
      if (!selectedFraction) return false;
      return acceptedAnswers.some((acceptedAnswer) => {
        const acceptedFraction = fractionParts(acceptedAnswer);
        return Boolean(acceptedFraction && fractionsAreEquivalent(selectedFraction, acceptedFraction));
      });
    }
    case "simplest-fraction": {
      const selectedFraction = fractionParts(selectedAnswer);
      return Boolean(selectedFraction && greatestCommonDivisor(selectedFraction.numerator, selectedFraction.denominator) === 1 && acceptedAnswers.some((acceptedAnswer) => {
        const acceptedFraction = fractionParts(acceptedAnswer);
        return Boolean(acceptedFraction && fractionsAreEquivalent(selectedFraction, acceptedFraction));
      }));
    }
    case "percentage":
      return /%\s*$/.test(selectedAnswer.normalize("NFKC").trim()) && matchesAccepted();
    case "quantity": {
      const targetQuantity = quantityParts(contract.target);
      if (!targetQuantity) return false;
      let selectedQuantity = quantityParts(selectedAnswer);
      if (!selectedQuantity && contract.allowBareNumber) {
        const bareScalar = parseScalar(selectedAnswer);
        if (bareScalar === null) return false;
        selectedQuantity = { ...targetQuantity, scalarText: String(bareScalar) };
      }
      if (!selectedQuantity || selectedQuantity.dimension !== targetQuantity.dimension) return false;
      const selectedScalar = parseScalar(selectedQuantity.scalarText);
      const targetScalar = parseScalar(targetQuantity.scalarText);
      if (selectedScalar === null || targetScalar === null) return false;
      if (contract.unitPolicy === "exact") {
        return selectedQuantity.unit === targetQuantity.unit && Math.abs(selectedScalar - targetScalar) < 0.000001;
      }
      return Math.abs(selectedScalar * selectedQuantity.baseFactor - targetScalar * targetQuantity.baseFactor) < 0.000001;
    }
    case "exact-pi-quantity": {
      const selectedQuantity = quantityParts(selectedAnswer);
      const targetQuantity = quantityParts(contract.target);
      if (!selectedQuantity || !targetQuantity || selectedQuantity.dimension !== targetQuantity.dimension || selectedQuantity.unit !== targetQuantity.unit) return false;
      const selectedCoefficient = exactPiCoefficient(selectedQuantity.scalarText);
      const targetCoefficient = exactPiCoefficient(targetQuantity.scalarText);
      return selectedCoefficient !== null && targetCoefficient !== null && Math.abs(selectedCoefficient - targetCoefficient) < 0.000001;
    }
    case "algebraic-exponent": {
      const selected = normalizeAlgebraicExponentSyntax(selectedAnswer);
      if (containsImplicitExponentDigits(selected)) return false;
      const selectedSignature = polynomialSignature(selectedAnswer);
      return acceptedAnswers.some((acceptedAnswer) => {
        const acceptedSignature = polynomialSignature(acceptedAnswer);
        return selectedSignature && acceptedSignature
          ? selectedSignature === acceptedSignature
          : genericMatches(selected, normalizeAlgebraicExponentSyntax(acceptedAnswer));
      });
    }
    case "polynomial-equivalence": {
      const selectedSignature = polynomialSignature(selectedAnswer);
      return Boolean(selectedSignature && acceptedAnswers.some((acceptedAnswer) =>
        polynomialSignature(acceptedAnswer) === selectedSignature
      ));
    }
    case "factor-product-equivalence": {
      const selectedSignature = factorProductSignature(selectedAnswer);
      return Boolean(selectedSignature && acceptedAnswers.some((acceptedAnswer) =>
        factorProductSignature(acceptedAnswer) === selectedSignature
      ));
    }
    case "clock-time": {
      const selected = clockTimeParts(selectedAnswer);
      return Boolean(selected && selected.hour === contract.hour && selected.minute === contract.minute);
    }
    case "mixed-metres-centimetres": {
      const selected = mixedMetresCentimetresParts(selectedAnswer);
      return Boolean(selected && selected.metres === contract.metres && selected.centimetres === contract.centimetres);
    }
    case "angle-degrees":
      return angleDegrees(selectedAnswer) === contract.degrees;
    case "axis-equation":
      return axisEquationValue(selectedAnswer, contract.variable) === contract.value;
    case "fixed-decimal-quantity": {
      const selected = fixedDecimalMinutesPerMark(selectedAnswer, contract.decimalPlaces);
      const target = fixedDecimalMinutesPerMark(contract.target, contract.decimalPlaces);
      return selected !== null && target !== null && Math.abs(selected - target) < 0.000001;
    }
    case "unordered-family-pair":
      return familyPairMatches(selectedAnswer);
    case "hcf-lcm-pair": {
      const selected = hcfLcmParts(selectedAnswer);
      return Boolean(selected && selected.hcf === contract.hcf && selected.lcm === contract.lcm);
    }
    case "unordered-roots": {
      const selected = unorderedNumericValues(selectedAnswer);
      const expected = [...contract.values].sort((left, right) => left - right);
      return selected.length === expected.length && selected.every((value, index) => value === expected[index]);
    }
    case "y-axis-reflection-description":
      return yAxisReflectionDescriptionMatches(selectedAnswer);
    case "open-lower-domain":
      return openLowerDomainMatches(selectedAnswer, contract.variable, contract.lowerBound);
    case "ordered-pair": {
      const selected = orderedPairParts(selectedAnswer);
      return Boolean(selected && selected.x === contract.x && selected.y === contract.y);
    }
  }
}
