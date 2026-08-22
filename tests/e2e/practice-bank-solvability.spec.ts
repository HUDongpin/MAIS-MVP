import { expect, test, type TestInfo } from "@playwright/test";
import path from "node:path";
import { questions } from "../../data/questions";
import { expectedHkQuestionCount, hkIndependentAnswersById } from "../../lib/questionBankSolvability";
import {
  numberLinePointValue,
  planeFigureAngleDegrees,
  solidFigureCuboidVolume,
  solidFigureUnitText
} from "../../lib/questionFigure";
import type { Question } from "../../types";

type AttemptFeedback = {
  correct: boolean;
  correctAnswer?: string;
  explanation?: unknown;
};

type PublicQuestionsResponse = {
  questions: Array<{
    id: string;
    answer?: unknown;
    acceptedAnswers?: unknown;
    explanation?: unknown;
  }>;
};

type RouteHarness = {
  attemptsPost: (request: Request) => Promise<Response>;
  questionsGet: (request: Request) => Promise<Response>;
  orphanSessionCookie: string;
  sessionCookie: string;
};

type AuditStatus = "pass" | "ambiguous" | "grader-gap" | "content-error" | "diagram-error";

type AuditRow = {
  id: string;
  grade: string;
  topicId: string;
  type: Question["type"];
  prompt: string;
  storedAnswer: string;
  independentAnswer: string;
  status: AuditStatus;
  notes: string[];
};

type AliasKind =
  | "fraction"
  | "decimal-fraction"
  | "degree"
  | "percent"
  | "unit"
  | "coordinate"
  | "currency"
  | "algebra"
  | "ratio"
  | "time";

const expectedQuestionCount = expectedHkQuestionCount;
const requiredAliasKinds: AliasKind[] = [
  "fraction",
  "decimal-fraction",
  "degree",
  "percent",
  "unit",
  "coordinate",
  "currency",
  "algebra",
  "ratio",
  "time"
];

const independentAnswerSource = `
q1	5
q2	5x
q3	IV
q4	4
q5	x = 2
q6	3/5
q7	7
q8	3
q9	1/2
q10	2x
q11	Local maximum
q12	2
q13	115°
q14	2:3
q15	7
q16	(-3, -2)
q17	2/5
q18	x^2 + 5x + 6
q19	50°
q20	x^2
q21	6
q22	5
q23	30°
q24	1.5
q25	List given facts and the target
q26	-2
q27	x coordinate changes sign
q28	1
pq-p1-counting-number-bonds-1	3
pq-p1-counting-number-bonds-2	19
pq-p1-addition-subtraction-1	5
pq-p1-addition-subtraction-2	14
pq-p1-shapes-patterns-1	triangle
pq-p1-shapes-patterns-2	circle
pq-p1-measurement-time-1	a classroom door
pq-p1-measurement-time-2	3 o'clock
pq-p2-place-value-1	8
pq-p2-place-value-2	346
pq-p2-multiplication-foundations-1	3 x 4
pq-p2-multiplication-foundations-2	10
pq-p2-money-time-1	HK$2
pq-p2-money-time-2	4:30
pq-p2-length-data-1	13 cm
pq-p2-length-data-2	10
pq-p3-multiplication-division-1	42
pq-p3-multiplication-division-2	6
pq-p3-fractions-intro-1	1/4
pq-p3-fractions-intro-2	2/4
pq-p3-measurement-1	centimetres
pq-p3-measurement-2	1000 mL
pq-p3-geometry-patterns-1	90°
pq-p3-geometry-patterns-2	15
pq-p4-large-numbers-1	12,500
pq-p4-large-numbers-2	3,700
pq-p4-decimals-1	0.6
pq-p4-decimals-2	3.7
pq-p4-angles-1	obtuse
pq-p4-angles-2	105°
pq-p4-perimeter-area-1	22 cm
pq-p4-perimeter-area-2	20 cm^2
pq-p5-fractions-operations-1	3/4
pq-p5-fractions-operations-2	3/4
pq-p5-volume-1	24 cm^3
pq-p5-volume-2	cm^3
pq-p5-rates-1	HK$5
pq-p5-rates-2	30 km/h
pq-p5-charts-averages-1	8
pq-p5-charts-averages-2	20
pq-p6-percentages-1	40
pq-p6-percentages-2	25%
pq-p6-ratio-proportion-1	18
pq-p6-ratio-proportion-2	6:8
pq-p6-speed-1	30 km/h
pq-p6-speed-2	10 km
pq-p6-pre-secondary-problem-solving-1	Underline known facts and the question
pq-p6-pre-secondary-problem-solving-2	38
graph-p6-speed-distance	6 km
graph-coordinates-read-point	(-3, 2)
graph-coordinates-quadrant	II
graph-quadratic-patterns-vertex	(1, -4)
graph-quadratic-patterns-axis	x = -2
graph-quadratic-patterns-y-intercept	(0, -4)
graph-quadratic-patterns-roots	x = 1 and x = 3
graph-quadratic-patterns-opening	downward
graph-functions-read-output	5
graph-functions-zero	2
graph-coordinate-geometry-gradient	1/2
graph-coordinate-geometry-midpoint	(1, 1)
graph-data-handling-highest-value	8
graph-p4-angles-straight-line	50°
graph-p4-decimals-number-line	3.7
graph-p5-volume-cube	27 cm^3
supp-p1-counting-number-bonds-first-step	Count on or count back from the known number
supp-p1-counting-number-bonds-key-fact	5
supp-p1-counting-number-bonds-guided-example	15
supp-p1-counting-number-bonds-common-check	Check whether the missing number is before or after the given number
supp-p1-addition-subtraction-first-step	Decide whether the story adds to or takes away
supp-p1-addition-subtraction-key-fact	11
supp-p1-addition-subtraction-guided-example	7
supp-p1-addition-subtraction-common-check	Check the story action before choosing addition or subtraction
supp-p1-shapes-patterns-first-step	Name the repeating unit or count the sides
supp-p1-shapes-patterns-key-fact	4
supp-p1-shapes-patterns-guided-example	triangle
supp-p1-shapes-patterns-common-check	Check one full repeat before choosing the next shape
supp-p1-measurement-time-first-step	Choose the attribute first: length, time, or order
supp-p1-measurement-time-key-fact	60
supp-p1-measurement-time-guided-example	5 o'clock
supp-p1-measurement-time-common-check	Check the unit or clock hand before answering
supp-p2-place-value-first-step	Read hundreds, tens, and ones in order
supp-p2-place-value-key-fact	7
supp-p2-place-value-guided-example	529
supp-p2-place-value-common-check	Check that each digit is placed in the correct place value
supp-p2-multiplication-foundations-first-step	Count equal groups before writing multiplication
supp-p2-multiplication-foundations-key-fact	4 x 6
supp-p2-multiplication-foundations-guided-example	12
supp-p2-multiplication-foundations-common-check	Check the size of each group and the number of groups
supp-p2-money-time-first-step	Identify the price, amount paid, or time interval
supp-p2-money-time-key-fact	HK$4
supp-p2-money-time-guided-example	2:45
supp-p2-money-time-common-check	Check whether the answer should be money or time
supp-p2-length-data-first-step	Read the unit or chart label before calculating
supp-p2-length-data-key-fact	13 cm
supp-p2-length-data-guided-example	13
supp-p2-length-data-common-check	Keep the length unit when the question asks for length
supp-p3-multiplication-division-first-step	Decide whether the situation has equal groups or sharing
supp-p3-multiplication-division-key-fact	32
supp-p3-multiplication-division-guided-example	6
supp-p3-multiplication-division-common-check	Check whether the question asks for total or each share
supp-p3-fractions-intro-first-step	Identify the number of equal parts first
supp-p3-fractions-intro-key-fact	1/3
supp-p3-fractions-intro-guided-example	4/6
supp-p3-fractions-intro-common-check	Check that the denominator names the equal parts
supp-p3-measurement-first-step	Choose the correct measuring unit before calculating
supp-p3-measurement-key-fact	2000 mL
supp-p3-measurement-guided-example	55 cm
supp-p3-measurement-common-check	Check whether units need converting before calculating
supp-p3-geometry-patterns-first-step	Identify the angle fact or the pattern rule
supp-p3-geometry-patterns-key-fact	180°
supp-p3-geometry-patterns-guided-example	20
supp-p3-geometry-patterns-common-check	Check whether the task is about shape, angle, or number pattern
supp-p4-large-numbers-first-step	Compare digits from the largest place value
supp-p4-large-numbers-key-fact	23,780
supp-p4-large-numbers-guided-example	5,200
supp-p4-large-numbers-common-check	Check the required place value before rounding
supp-p4-decimals-first-step	Line up decimal places before comparing or calculating
supp-p4-decimals-key-fact	0.5
supp-p4-decimals-guided-example	3.4
supp-p4-decimals-common-check	Keep the decimal point aligned in every step
supp-p4-angles-first-step	Name the angle relationship before subtracting
supp-p4-angles-key-fact	70°
supp-p4-angles-guided-example	70°
supp-p4-angles-common-check	Check whether the total should be 180 degrees or 360 degrees
supp-p4-perimeter-area-first-step	Decide whether the question asks for boundary or surface
supp-p4-perimeter-area-key-fact	24 cm
supp-p4-perimeter-area-guided-example	21 cm^2
supp-p4-perimeter-area-common-check	Use linear units for perimeter and square units for area
supp-p5-fractions-operations-first-step	Check whether denominators match before adding or simplifying
supp-p5-fractions-operations-key-fact	3/5
supp-p5-fractions-operations-guided-example	3/4
supp-p5-fractions-operations-common-check	Simplify the final fraction when possible
supp-p5-volume-first-step	Identify length, width, and height before multiplying
supp-p5-volume-key-fact	4 cm
supp-p5-volume-guided-example	30 cm^3
supp-p5-volume-common-check	Multiply length, width, and height instead of adding the edge lengths
supp-p5-rates-first-step	Divide the total amount by the number of equal units
supp-p5-rates-key-fact	HK$6
supp-p5-rates-guided-example	15 km/h
supp-p5-rates-common-check	Keep the rate unit attached to the answer
supp-p5-charts-averages-first-step	Read the data values carefully before adding
supp-p5-charts-averages-key-fact	8
supp-p5-charts-averages-guided-example	24
supp-p5-charts-averages-common-check	Check whether the question asks for a total or an average
supp-p6-percentages-first-step	Convert the percentage to a fraction or decimal first
supp-p6-percentages-key-fact	30
supp-p6-percentages-guided-example	60%
supp-p6-percentages-common-check	Check whether the question asks for a percent, decimal, or amount
supp-p6-ratio-proportion-first-step	Find the total number of ratio parts before sharing
supp-p6-ratio-proportion-key-fact	40
supp-p6-ratio-proportion-guided-example	10:14
supp-p6-ratio-proportion-common-check	Apply the same multiplier or divisor to both ratio parts
supp-p6-speed-first-step	Identify distance, time, and speed before choosing the formula
supp-p6-speed-key-fact	60 km/h
supp-p6-speed-guided-example	18 km
supp-p6-speed-common-check	Check whether to divide or multiply using the units
supp-p6-pre-secondary-problem-solving-first-step	Break the problem into facts, operations, and final target
supp-p6-pre-secondary-problem-solving-key-fact	15
supp-p6-pre-secondary-problem-solving-guided-example	26 cm
supp-p6-pre-secondary-problem-solving-common-check	Check that every step answers the final question, not just an intermediate value
supp-integers-first-step	Mark zero and the direction of movement on the number line
supp-integers-key-fact	3
supp-integers-guided-example	-11
supp-integers-common-check	Check whether the operation moves left or right before calculating
supp-algebra-basics-first-step	Identify variables and collect like terms
supp-algebra-basics-key-fact	7a
supp-algebra-basics-guided-example	7
supp-algebra-basics-common-check	Only combine terms with the same variable part
supp-angles-first-step	Name the angle fact used by the line, point, triangle, or parallel lines
supp-angles-key-fact	180°
supp-angles-guided-example	60°
supp-angles-common-check	Write the angle-sum reason before the arithmetic
supp-ratios-first-step	Add the ratio parts before sharing a total
supp-ratios-key-fact	8
supp-ratios-guided-example	15
supp-ratios-common-check	Keep the same multiplier on every part
supp-statistics-s1-first-step	Order or organize the data before choosing an average
supp-statistics-s1-key-fact	9
supp-statistics-s1-guided-example	5
supp-statistics-s1-common-check	Sort the data before finding the median
supp-linear-equations-first-step	Undo operations in reverse order while keeping both sides balanced
supp-linear-equations-key-fact	5
supp-linear-equations-guided-example	6
supp-linear-equations-common-check	Do the same operation to both sides of the equation
supp-coordinates-first-step	Read the x-coordinate first, then the y-coordinate
supp-coordinates-key-fact	-4
supp-coordinates-guided-example	II
supp-coordinates-common-check	Do not swap the x- and y-coordinates
supp-transformations-first-step	State the transformation rule before moving points
supp-transformations-key-fact	(4, 1)
supp-transformations-guided-example	(-5, -4)
supp-transformations-common-check	Label original and image points clearly
supp-probability-s2-first-step	List the sample space and count favourable outcomes
supp-probability-s2-key-fact	1/2
supp-probability-s2-guided-example	1/3
supp-probability-s2-common-check	Use favourable outcomes over total equally likely outcomes
supp-polynomials-first-step	Identify terms, coefficients, and like terms
supp-polynomials-key-fact	7x^2
supp-polynomials-guided-example	x^2 + 4x
supp-polynomials-common-check	Check factorization by expanding back
supp-quadratic-patterns-first-step	Look for second differences, vertex, or axis of symmetry
supp-quadratic-patterns-key-fact	x = -1
supp-quadratic-patterns-guided-example	(3, 2)
supp-quadratic-patterns-common-check	Use the sign carefully in vertex form
supp-trigonometry-basics-first-step	Label opposite, adjacent, and hypotenuse
supp-trigonometry-basics-key-fact	4/5
supp-trigonometry-basics-guided-example	3/4
supp-trigonometry-basics-common-check	Choose SOH, CAH, or TOA after labelling sides
supp-circles-first-step	Identify the chord, tangent, arc, or centre angle being used
supp-circles-key-fact	90°
supp-circles-guided-example	70°
supp-circles-common-check	Mark radii and equal lengths on the diagram
supp-functions-first-step	Identify the input, rule, and output
supp-functions-key-fact	8
supp-functions-guided-example	9
supp-functions-common-check	Substitute the whole input before simplifying
supp-coordinate-geometry-first-step	Choose slope, distance, midpoint, or line equation based on the target
supp-coordinate-geometry-key-fact	(4, 6)
supp-coordinate-geometry-guided-example	5
supp-coordinate-geometry-common-check	Keep x-differences and y-differences in matching order
supp-more-algebra-first-step	State restrictions and index laws before simplifying
supp-more-algebra-key-fact	a^7
supp-more-algebra-guided-example	b^4
supp-more-algebra-common-check	Check denominators are not zero
supp-data-handling-first-step	Identify data type, distribution shape, and possible bias
supp-data-handling-key-fact	mean
supp-data-handling-guided-example	15
supp-data-handling-common-check	Check whether the graph scale is misleading
supp-advanced-functions-first-step	Compare model type: polynomial, exponential, or logarithmic
supp-advanced-functions-key-fact	8
supp-advanced-functions-guided-example	-8
supp-advanced-functions-common-check	Check whether growth is additive or multiplicative
supp-trigonometry-s5-first-step	Identify amplitude, period, phase, or identity before solving
supp-trigonometry-s5-key-fact	360°
supp-trigonometry-s5-guided-example	3
supp-trigonometry-s5-common-check	Use the required interval when listing solutions
supp-probability-s5-first-step	Decide whether the events are independent, dependent, or conditional
supp-probability-s5-key-fact	6
supp-probability-s5-guided-example	1/4
supp-probability-s5-common-check	Draw a tree diagram when events happen in stages
supp-differentiation-intro-first-step	Interpret derivative as gradient or rate of change
supp-differentiation-intro-key-fact	3x^2
supp-differentiation-intro-guided-example	5
supp-differentiation-intro-common-check	Reduce the power by one after multiplying by the old power
supp-calculus-first-step	Choose derivative, integral, optimization, or area based on the task
supp-calculus-key-fact	x^2 + C
supp-calculus-guided-example	8x
supp-calculus-common-check	Include the constant of integration for indefinite integrals
supp-statistics-s6-first-step	Standardize with a z-score before using the normal curve
supp-statistics-s6-key-fact	3
supp-statistics-s6-guided-example	at the mean
supp-statistics-s6-common-check	Subtract the mean before dividing by the standard deviation
supp-exam-revision-first-step	Sort questions by marks, confidence, and time available
supp-exam-revision-key-fact	1.33
supp-exam-revision-guided-example	1.5
supp-exam-revision-common-check	Leave time for checking high-mark answers
supp-mixed-problem-solving-first-step	List known facts, unknowns, constraints, and useful representations
supp-mixed-problem-solving-key-fact	known facts and target
supp-mixed-problem-solving-guided-example	shared quantities
supp-mixed-problem-solving-common-check	Check whether the final answer is reasonable in context
`;

function independentAnswersById() {
  return new Map(
    independentAnswerSource
      .trim()
      .split("\n")
      .map((line) => {
        const tabIndex = line.indexOf("\t");
        return [line.slice(0, tabIndex), line.slice(tabIndex + 1)] as const;
      })
  );
}

function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/\\[()]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([=,+\-*/:^()])\s*/g, "$1")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*°\s*/g, "°")
    .replace(/\bhk\s*\$\s*/g, "hk$")
    .replace(/\$\s*/g, "$")
    .trim();
}

function normalizedAnswerVariants(value: string) {
  const normalized = normalizeAnswer(value);
  const variants = new Set([normalized, normalized.replace(/\s+/g, "")]);

  if (normalized.startsWith("hk$")) variants.add(normalized.replace(/^hk\$/, "$"));
  if (normalized.startsWith("$")) variants.add(normalized.replace(/^\$/, "hk$"));

  const percent = normalized.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percent) {
    variants.add(percent[1]);
    variants.add(`${percent[1]}percent`);
  }

  const degree = normalized.match(/^(-?\d+(?:\.\d+)?)°$/);
  if (degree) {
    variants.add(degree[1]);
    variants.add(`${degree[1]}degree`);
    variants.add(`${degree[1]}degrees`);
  }

  return variants;
}

function parseScalarAnswer(value: string) {
  let normalized = normalizeAnswer(value).replace(/\s+/g, "");
  normalized = normalized
    .replace(/^hk\$/, "")
    .replace(/^\$/, "")
    .replace(/(?:cm\^2|cm2|cm\^3|cm3|cm|ml|l|km\/h|kmh|km|°|%)$/i, "");

  const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
  return null;
}

function answerMatches(selectedAnswer: string, acceptedAnswer: string) {
  const selectedVariants = normalizedAnswerVariants(selectedAnswer);
  const acceptedVariants = normalizedAnswerVariants(acceptedAnswer);

  for (const variant of selectedVariants) {
    if (acceptedVariants.has(variant)) return true;
  }

  const selectedNumber = parseScalarAnswer(selectedAnswer);
  const acceptedNumber = parseScalarAnswer(acceptedAnswer);
  return selectedNumber !== null && acceptedNumber !== null && Math.abs(selectedNumber - acceptedNumber) < 0.000001;
}

function acceptedAnswersFor(question: Question) {
  return Array.from(new Set([question.answer, ...(question.acceptedAnswers ?? [])]));
}

function optionMatchesAcceptedAnswer(question: Question, option: NonNullable<Question["options"]>[number]) {
  return acceptedAnswersFor(question).some((acceptedAnswer) =>
    answerMatches(option.en, acceptedAnswer) || answerMatches(option.zh, acceptedAnswer)
  );
}

function isExpectedAnswerRepresented(question: Question, independentAnswer: string) {
  return acceptedAnswersFor(question).some((acceptedAnswer) => answerMatches(independentAnswer, acceptedAnswer));
}

function aliasKindsFor(question: Question, alias: string) {
  const kinds = new Set<AliasKind>();
  const answer = question.answer;
  const normalizedAlias = normalizeAnswer(alias);

  if (/^-?\d+\/-?\d+$/.test(answer)) {
    kinds.add("fraction");
    if (/^-?\d+(?:\.\d+)?$/.test(normalizedAlias)) kinds.add("decimal-fraction");
  }

  if (/°/.test(answer)) kinds.add("degree");
  if (/%/.test(answer)) kinds.add("percent");
  if (/^HK\$/i.test(answer)) kinds.add("currency");
  if (/^-?\d+(?:\.\d+)?\s+(?:cm\^2|cm\^3|cm|mL|L|km\/h|km)$/i.test(answer)) kinds.add("unit");
  if (/^\(-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?\)$/.test(answer)) kinds.add("coordinate");
  if (/^\d+:\d+$/.test(answer)) kinds.add("ratio");
  if (/\d{1,2}:\d{2}|o'clock/i.test(answer)) kinds.add("time");
  if (/(?:[a-z]\s*=|[a-z]\^|\d[a-z])/i.test(answer)) kinds.add("algebra");

  return kinds;
}

function gcd(first: number, second: number): number {
  const a = Math.abs(first);
  const b = Math.abs(second);
  if (b === 0) return a || 1;
  return gcd(b, a % b);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function formatFraction(numerator: number, denominator: number) {
  const divisor = gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const normalizedNumerator = (numerator / divisor) * sign;
  const normalizedDenominator = Math.abs(denominator / divisor);
  return normalizedDenominator === 1 ? String(normalizedNumerator) : `${normalizedNumerator}/${normalizedDenominator}`;
}

function formatPoint(x: number, y: number) {
  return `(${formatNumber(x)}, ${formatNumber(y)})`;
}

function coordinateGridDiagramFor(question: Question) {
  return question.diagram?.kind === "coordinate-grid" ? question.diagram : null;
}

function pointByLabel(question: Question, label: string) {
  return coordinateGridDiagramFor(question)?.points?.find((point) => point.label === label) ?? null;
}

function firstLine(question: Question) {
  return coordinateGridDiagramFor(question)?.lines?.[0] ?? null;
}

function quadrantFor(x: number, y: number) {
  if (x > 0 && y > 0) return "I";
  if (x < 0 && y > 0) return "II";
  if (x < 0 && y < 0) return "III";
  if (x > 0 && y < 0) return "IV";
  return null;
}

function deriveGraphAnswer(question: Question) {
  if (question.type !== "graph" || !question.diagram) return null;

  if (question.id === "q28" || question.id === "graph-coordinate-geometry-gradient") {
    const line = firstLine(question);
    const [start, end] = line?.points ?? [];
    if (!start || !end) return null;
    return formatFraction(end.y - start.y, end.x - start.x);
  }

  if (question.id === "graph-p6-speed-distance") {
    const point = pointByLabel(question, "D");
    return point ? `${formatNumber(point.y)} km` : null;
  }

  if (question.id === "graph-coordinates-read-point") {
    const point = pointByLabel(question, "C");
    return point ? formatPoint(point.x, point.y) : null;
  }

  if (question.id === "graph-coordinates-quadrant") {
    const point = pointByLabel(question, "P");
    return point ? quadrantFor(point.x, point.y) : null;
  }

  if (question.id === "graph-quadratic-patterns-vertex") {
    const point = pointByLabel(question, "V");
    return point ? formatPoint(point.x, point.y) : null;
  }

  if (question.id === "graph-quadratic-patterns-axis") {
    const point = pointByLabel(question, "V");
    return point ? `x = ${formatNumber(point.x)}` : null;
  }

  if (question.id === "graph-quadratic-patterns-y-intercept") {
    const point = pointByLabel(question, "Y") ?? firstLine(question)?.points.find((candidate) => candidate.x === 0) ?? null;
    return point ? formatPoint(point.x, point.y) : null;
  }

  if (question.id === "graph-quadratic-patterns-roots") {
    const roots = (firstLine(question)?.points ?? [])
      .filter((point) => point.y === 0)
      .map((point) => point.x)
      .sort((a, b) => a - b);
    return roots.length === 2 ? `x = ${formatNumber(roots[0])} and x = ${formatNumber(roots[1])}` : null;
  }

  if (question.id === "graph-quadratic-patterns-opening") {
    const vertex = pointByLabel(question, "V");
    const linePoints = firstLine(question)?.points ?? [];
    if (!vertex || linePoints.length < 3) return null;
    const otherYValues = linePoints.filter((point) => point.x !== vertex.x).map((point) => point.y);
    if (otherYValues.every((y) => y < vertex.y)) return "downward";
    if (otherYValues.every((y) => y > vertex.y)) return "upward";
    return null;
  }

  if (question.id === "graph-functions-read-output") {
    const point = pointByLabel(question, "A");
    return point ? formatNumber(point.y) : null;
  }

  if (question.id === "graph-functions-zero") {
    const point = pointByLabel(question, "Z") ?? firstLine(question)?.points.find((candidate) => candidate.y === 0) ?? null;
    return point ? formatNumber(point.x) : null;
  }

  if (question.id === "graph-coordinate-geometry-midpoint") {
    const first = pointByLabel(question, "A");
    const second = pointByLabel(question, "B");
    return first && second ? formatPoint((first.x + second.x) / 2, (first.y + second.y) / 2) : null;
  }

  if (question.id === "graph-data-handling-highest-value") {
    const values = firstLine(question)?.points.map((point) => point.y) ?? [];
    return values.length ? formatNumber(Math.max(...values)) : null;
  }

  if (question.id === "graph-p4-angles-straight-line" && question.diagram.kind === "plane-figure") {
    const angle = planeFigureAngleDegrees(question.diagram, "O", "C", "B");
    return angle === null ? null : `${Math.round(angle)}°`;
  }

  if (question.id === "graph-p4-decimals-number-line" && question.diagram.kind === "number-line") {
    const value = numberLinePointValue(question.diagram, "P");
    return value === null ? null : formatNumber(value);
  }

  if (question.id === "graph-p5-volume-cube" && question.diagram.kind === "solid-figure") {
    const volume = solidFigureCuboidVolume(question.diagram);
    if (volume === null) return null;
    const unit = solidFigureUnitText(question.diagram);
    return unit ? `${formatNumber(volume)} ${unit}^3` : formatNumber(volume);
  }

  return null;
}

function escapeMarkdownCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function auditMarkdown(rows: AuditRow[], aliasCoverage: Record<AliasKind, number>) {
  const summary = [
    "# Practice Bank Solvability Audit",
    "",
    `- Questions audited: ${rows.length}`,
    `- Passing rows: ${rows.filter((row) => row.status === "pass").length}`,
    `- Alias coverage: ${requiredAliasKinds.map((kind) => `${kind}=${aliasCoverage[kind]}`).join(", ")}`,
    "",
    "| id | grade | topicId | type | prompt.en | stored answer | independent answer | status | notes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  ];

  const table = rows.map((row) => [
    row.id,
    row.grade,
    row.topicId,
    row.type,
    row.prompt,
    row.storedAnswer,
    row.independentAnswer,
    row.status,
    row.notes.join("; ") || "OK"
  ].map(escapeMarkdownCell).join(" | "));

  return [...summary, ...table.map((line) => `| ${line} |`), ""].join("\n");
}

async function createRouteHarness(testInfo: TestInfo): Promise<RouteHarness> {
  const slug = `${Date.now()}-${testInfo.workerIndex}-${testInfo.project.name}-${Math.random().toString(36).slice(2, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  process.env.AUTH_SESSION_SECRET = process.env.AUTH_SESSION_SECRET || "practice-bank-solvability-secret";
  process.env.HK_MATH_DB_PATH = path.join(process.cwd(), ".tmp", "practice-bank-solvability", `${slug}.sqlite`);

  const attemptsRoute = require("../../app/api/attempts/route") as typeof import("../../app/api/attempts/route");
  const questionsRoute = require("../../app/api/questions/route") as typeof import("../../app/api/questions/route");
  const sessionModule = require("../../lib/session") as typeof import("../../lib/session");
  const userStoreModule = require("../../lib/server/userStore") as typeof import("../../lib/server/userStore");

  const result = await userStoreModule.createStudentUser({
    name: `Solvability ${slug}`,
    username: `solvability-${slug}@example.test`,
    email: `solvability-${slug}@example.test`,
    password: "start12345",
    grade: "S6",
    curriculumTrack: "HK",
    language: "en",
    theme: "dark"
  });

  expect(result.status).toBe("created");
  if (result.status !== "created") throw new Error(`Could not create solvability user: ${result.status}`);

  const token = await sessionModule.createSessionToken(result.session.user.id);
  const orphanToken = await sessionModule.createSessionToken(`missing-${slug}`);

  return {
    attemptsPost: attemptsRoute.POST,
    questionsGet: questionsRoute.GET,
    orphanSessionCookie: `${sessionModule.SESSION_COOKIE_NAME}=${encodeURIComponent(orphanToken)}`,
    sessionCookie: `${sessionModule.SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`
  };
}

async function submitAttempt(harness: RouteHarness, questionId: string, selectedAnswer: string) {
  const response = await harness.attemptsPost(new Request("http://127.0.0.1/api/attempts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: harness.sessionCookie
    },
    body: JSON.stringify({
      questionId,
      selectedAnswer,
      durationSeconds: 1
    })
  }));

  const responseBody = await response.json().catch(() => null) as AttemptFeedback | { error?: string } | null;
  return {
    ok: response.ok,
    status: response.status,
    body: responseBody,
    correct: response.ok && Boolean((responseBody as AttemptFeedback | null)?.correct)
  };
}

test.describe("Practice Arena item-bank solvability", () => {
  test("attempts route keeps login required but falls back to seed grading for missing production user rows", async ({}, testInfo) => {
    const harness = await createRouteHarness(testInfo);
    const requestBody = {
      questionId: "pq-p5-volume-1",
      selectedAnswer: "24",
      durationSeconds: 1
    };
    const anonymousResponse = await harness.attemptsPost(new Request("http://127.0.0.1/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    }));

    expect(anonymousResponse.status).toBe(401);

    const correctResponse = await harness.attemptsPost(new Request("http://127.0.0.1/api/attempts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: harness.orphanSessionCookie
      },
      body: JSON.stringify(requestBody)
    }));
    const correctBody = await correctResponse.json() as AttemptFeedback;

    expect(correctResponse.status).toBe(200);
    expect(correctBody.correct).toBe(true);
    expect(correctBody.correctAnswer).toBeUndefined();

    const wrongResponse = await harness.attemptsPost(new Request("http://127.0.0.1/api/attempts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: harness.orphanSessionCookie
      },
      body: JSON.stringify({
        ...requestBody,
        selectedAnswer: "25"
      })
    }));
    const wrongBody = await wrongResponse.json() as AttemptFeedback;

    expect(wrongResponse.status).toBe(200);
    expect(wrongBody.correct).toBe(false);
    expect(wrongBody.correctAnswer).toBe("24 cm^3");
  });

  test("every current Practice Arena question has an accepted defensible answer", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Full item-bank API audit only needs one browser project.");
    test.slow();
    test.setTimeout(300_000);

    const hkQuestions = questions.filter((question) => question.curriculumTrack === "HK");
    const independentAnswers = hkIndependentAnswersById();
    const questionIds = hkQuestions.map((question) => question.id);
    const uniqueQuestionIds = new Set(questionIds);

    expect(hkQuestions).toHaveLength(expectedQuestionCount);
    expect(uniqueQuestionIds.size).toBe(hkQuestions.length);
    expect(independentAnswers.size).toBe(expectedQuestionCount);
    expect([...independentAnswers.keys()].sort()).toEqual([...uniqueQuestionIds].sort());

    const harness = await createRouteHarness(testInfo);

    const publicResponse = await harness.questionsGet(new Request("http://127.0.0.1/api/questions"));
    expect(publicResponse.ok).toBeTruthy();
    const publicQuestions = await publicResponse.json() as PublicQuestionsResponse;
    expect(publicQuestions.questions.map((question) => question.id).sort()).toEqual([...uniqueQuestionIds].sort());
    expect(publicQuestions.questions.some((question) =>
      "answer" in question || "acceptedAnswers" in question || "explanation" in question
    )).toBe(false);

    const auditRows: AuditRow[] = [];
    const aliasCoverage = Object.fromEntries(requiredAliasKinds.map((kind) => [kind, 0])) as Record<AliasKind, number>;

    for (const question of hkQuestions) {
      const independentAnswer = independentAnswers.get(question.id) ?? "";
      const row: AuditRow = {
        id: question.id,
        grade: question.grade,
        topicId: question.topicId,
        type: question.type,
        prompt: question.prompt.en,
        storedAnswer: question.answer,
        independentAnswer,
        status: "pass",
        notes: []
      };

      if (!independentAnswer) {
        row.status = "content-error";
        row.notes.push("Missing independent audit answer.");
      } else if (!isExpectedAnswerRepresented(question, independentAnswer)) {
        row.status = "content-error";
        row.notes.push("Independent answer is not represented by the stored answer or accepted aliases.");
      }

      if (question.type === "graph") {
        const derivedAnswer = deriveGraphAnswer(question);
        if (!question.diagram) {
          row.status = "diagram-error";
          row.notes.push("Graph question has no diagram.");
        } else if (!derivedAnswer) {
          row.status = "diagram-error";
          row.notes.push("Could not derive answer from graph data.");
        } else if (!answerMatches(derivedAnswer, independentAnswer)) {
          row.status = "diagram-error";
          row.notes.push(`Graph-derived answer "${derivedAnswer}" does not match independent answer.`);
        }
      }

      for (const acceptedAnswer of acceptedAnswersFor(question)) {
        const result = await submitAttempt(harness, question.id, acceptedAnswer);
        if (!result.ok || !result.correct) {
          row.status = row.status === "pass" ? "grader-gap" : row.status;
          row.notes.push(`Accepted answer "${acceptedAnswer}" was rejected with status ${result.status}.`);
        }
      }

      for (const alias of question.acceptedAnswers ?? []) {
        for (const kind of aliasKindsFor(question, alias)) {
          aliasCoverage[kind] += 1;
        }
      }

      if (question.type === "multiple-choice") {
        if (!question.options?.length) {
          row.status = "content-error";
          row.notes.push("Multiple-choice question has no options.");
        } else {
          const acceptedOptions = question.options.filter((option) => optionMatchesAcceptedAnswer(question, option));

          if (acceptedOptions.length !== 1) {
            row.status = "ambiguous";
            row.notes.push(`Expected exactly one accepted option; found ${acceptedOptions.length}.`);
          }

          if (!acceptedOptions.some((option) =>
            answerMatches(option.en, independentAnswer) || answerMatches(option.zh, independentAnswer)
          )) {
            row.status = row.status === "pass" ? "content-error" : row.status;
            row.notes.push("Accepted option does not match independent answer.");
          }
        }
      }

      auditRows.push(row);
    }

    await testInfo.attach("practice-bank-solvability-audit.md", {
      body: auditMarkdown(auditRows, aliasCoverage),
      contentType: "text/markdown"
    });

    for (const kind of requiredAliasKinds) {
      expect(aliasCoverage[kind], `Expected generated accepted-answer coverage for ${kind}.`).toBeGreaterThan(0);
    }

    const failingRows = auditRows.filter((row) => row.status !== "pass");
    expect(failingRows, JSON.stringify(failingRows.slice(0, 20), null, 2)).toEqual([]);
  });
});
