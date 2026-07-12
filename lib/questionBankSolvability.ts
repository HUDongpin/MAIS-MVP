import { questions } from "../data/questions";
import {
  expectedHongKongEasePracticeQuestionCount,
  hongKongEasePracticeQuestionGenerationMetadata,
  independentHongKongEasePracticeAnswer
} from "../data/hongKongEasePracticeQuestions";
import {
  independentMainlandBnuHighAnswer,
  mainlandBnuHighQuestionGenerationMetadata
} from "../data/mainlandBnuHighQuestions";
import {
  independentMainlandBnuJuniorAnswer,
  mainlandBnuJuniorQuestionGenerationMetadata
} from "../data/mainlandBnuJuniorQuestions";
import {
  independentMainlandBnuPrimaryAnswer,
  mainlandBnuPrimaryQuestionGenerationMetadata
} from "../data/mainlandBnuPrimaryQuestions";
import {
  mainlandPepHighQuestionGenerationMetadata,
  mainlandPepHighRagV4QuestionGenerationMetadata,
  mainlandPepHighRagV4Questions
} from "../data/mainlandPepHighQuestions";
import {
  independentMainlandHjbHighAnswer,
  mainlandHjbHighQuestionGenerationMetadata
} from "../data/mainlandHjbHighQuestions";
import {
  independentMainlandHjbJuniorAnswer,
  mainlandHjbJuniorQuestionGenerationMetadata
} from "../data/mainlandHjbJuniorQuestions";
import {
  independentMainlandHjbPrimaryAnswer,
  mainlandHjbPrimaryQuestionGenerationMetadata
} from "../data/mainlandHjbPrimaryQuestions";
import {
  independentMainlandPepPrimaryAnswer,
  mainlandPepPrimaryQuestionGenerationMetadata
} from "../data/mainlandPepPrimaryQuestions";
import {
  independentMainlandPepJuniorAnswer,
  mainlandPepJuniorQuestionGenerationMetadata
} from "../data/mainlandPepJuniorQuestions";
import {
  expectedUnitedStatesArkansasG6G12QuestionCount,
  expectedUnitedStatesArkansasK5QuestionCount,
  expectedUnitedStatesArkansasQuestionCount,
  independentUnitedStatesArkansasAnswer,
  usArkansasQuestionGenerationMetadata
} from "../data/usArkansasQuestions";
import {
  expectedUnitedStatesCaliforniaG6G12QuestionCount,
  expectedUnitedStatesCaliforniaK5QuestionCount,
  expectedUnitedStatesCaliforniaQuestionCount,
  independentUnitedStatesCaliforniaAnswer,
  usCaliforniaQuestionGenerationMetadata
} from "../data/usCaliforniaQuestions";
import {
  expectedUnitedStatesFloridaMiddleSchoolQuestionCount,
  independentUnitedStatesFloridaMiddleSchoolAnswer,
  usFloridaMiddleSchoolQuestionGenerationMetadata
} from "../data/usFloridaMiddleSchoolQuestions";
import {
  answerMatches as gradingAnswerMatches,
  normalizeAnswer as normalizeGradingAnswer,
  parseScalarAnswer,
  questionAnswerMatches
} from "./server/answerGrading";
import {
  normalizeQuestionDiagram,
  numberLinePointValue,
  planeFigureAngleDegrees,
  solidFigureCuboidVolume,
  solidFigureUnitText,
  validateQuestionDiagram
} from "./questionFigure";
import type { CurriculumTrack, Question, QuestionType } from "../types";

export {
  expectedUnitedStatesArkansasG6G12QuestionCount,
  expectedUnitedStatesArkansasK5QuestionCount,
  expectedUnitedStatesArkansasQuestionCount
} from "../data/usArkansasQuestions";
export {
  expectedUnitedStatesCaliforniaG6G12QuestionCount,
  expectedUnitedStatesCaliforniaK5QuestionCount,
  expectedUnitedStatesCaliforniaQuestionCount
} from "../data/usCaliforniaQuestions";
export { expectedUnitedStatesFloridaMiddleSchoolQuestionCount } from "../data/usFloridaMiddleSchoolQuestions";

export type QuestionAuditStatus =
  | "pass"
  | "content-error"
  | "solver-gap"
  | "answer-mismatch"
  | "ambiguous-mc"
  | "grader-gap";

export type QuestionAuditSeverity = "none" | "P1" | "P2";

export type FullQuestionBankAuditRow = {
  questionId: string;
  curriculumTrack: CurriculumTrack;
  batch: string;
  grade: string;
  topicId: string;
  type: QuestionType;
  storedAnswer: string;
  independentAnswer: string;
  status: QuestionAuditStatus;
  severity: QuestionAuditSeverity;
  notes: string[];
};

export type FullQuestionBankAuditReport = {
  reportDate: string;
  generatedAt: string;
  summary: {
    totalQuestions: number;
    hkQuestions: number;
    mainlandPepPrimaryQuestions: number;
    mainlandPepJuniorQuestions: number;
    mainlandPepHighQuestions: number;
    mainlandBnuPrimaryQuestions: number;
    mainlandBnuJuniorQuestions: number;
    mainlandBnuHighQuestions: number;
    mainlandHjbJuniorQuestions: number;
    mainlandHjbPrimaryQuestions: number;
    mainlandHjbHighQuestions: number;
    unitedStatesCaliforniaQuestions: number;
    unitedStatesNorthCarolinaQuestions: number;
    unitedStatesArkansasQuestions: number;
    unitedStatesFloridaMiddleSchoolQuestions: number;
    passRows: number;
    failingRows: number;
    statusCounts: Record<QuestionAuditStatus, number>;
    trackCounts: Record<string, number>;
    batchCounts: Record<string, number>;
    releaseRecommendation: string;
  };
  rows: FullQuestionBankAuditRow[];
  failingRows: FullQuestionBankAuditRow[];
  assumptions: string[];
};

export type QaCheckStatus = "pass" | "fail" | "not-checkable";
export type MainlandPepQuestionQaStatus = "pass" | "review-required";
export type MainlandPepQaSeverity = "none" | "P0" | "P1" | "P2";

export type MainlandPepFullQuestionBankQaRow = {
  questionId: string;
  grade: string;
  batch: string;
  type: QuestionType;
  topicId: string;
  topic: Question["topic"];
  storedAnswer: string;
  acceptedAnswers: string[];
  independentAnswer: string;
  solvableStatus: QaCheckStatus;
  answerMatchStatus: QaCheckStatus;
  qaStatus: MainlandPepQuestionQaStatus;
  severity: MainlandPepQaSeverity;
  sourceStatus: QuestionAuditStatus;
  notes: string[];
  recommendedAction: string;
};

export type MainlandPepFullQuestionBankQaReport = {
  reportDate: string;
  generatedAt: string;
  summary: {
    totalQuestions: number;
    expectedQuestions: number;
    primaryQuestions: number;
    juniorQuestions: number;
    highQuestions: number;
    passRows: number;
    reviewRows: number;
    p0Rows: number;
    p1Rows: number;
    p2Rows: number;
    duplicateIdCount: number;
    inventoryIssueCount: number;
    manualReviewQueueRows: number;
    sourceStatusCounts: Record<QuestionAuditStatus, number>;
    solvableStatusCounts: Record<string, number>;
    answerMatchStatusCounts: Record<string, number>;
    qaStatusCounts: Record<string, number>;
    gradeCounts: Record<string, number>;
    batchCounts: Record<string, number>;
    typeCounts: Record<string, number>;
    releaseRecommendation: string;
  };
  rows: MainlandPepFullQuestionBankQaRow[];
  reviewRows: MainlandPepFullQuestionBankQaRow[];
  manualReviewQueueRows: MainlandPepFullQuestionBankQaRow[];
  inventoryIssues: string[];
  assumptions: string[];
};

export type MainlandHighRagV4PublicSolvabilityAuditReport = {
  reportDate: string;
  generatedAt: string;
  summary: {
    totalQuestions: number;
    expectedQuestions: number;
    publicIntegrated: boolean;
    publicRagV4Questions: number;
    publicMainlandPepHighQuestions: number;
    gradeCounts: Record<string, number>;
    passRows: number;
    failingRows: number;
    duplicateIdCount: number;
    duplicateExactPromptCount: number;
    statusCounts: Record<QuestionAuditStatus, number>;
    batchCounts: Record<string, number>;
    releaseRecommendation: string;
  };
  rows: FullQuestionBankAuditRow[];
  failingRows: FullQuestionBankAuditRow[];
  inventoryIssues: string[];
  assumptions: string[];
};

export type AliasKind =
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

// 288 = 285 legacy questions + 3 figure-based graph questions added with the
// question-figure spec rollout (plane-figure, number-line, solid-figure).
export const expectedHkBaseQuestionCount = 288;
export { expectedHongKongEasePracticeQuestionCount };
export const expectedHkQuestionCount = expectedHkBaseQuestionCount + expectedHongKongEasePracticeQuestionCount;
export const expectedMainlandPepPrimaryQuestionCount = 1200;
export const expectedMainlandPepJuniorQuestionCount = 1200;
export const expectedMainlandPepHighQuestionCount = 4800;
export const expectedMainlandHjbJuniorQuestionCount = 1500;
export const expectedMainlandHjbPrimaryQuestionCount = 1500;
export const expectedMainlandHjbHighQuestionCount = 1500;
export const expectedMainlandBnuPrimaryQuestionCount = 3000;
export const expectedMainlandBnuJuniorQuestionCount = 1500;
export const expectedMainlandBnuHighQuestionCount = 1500;
export const expectedUnitedStatesNorthCarolinaQuestionCount = 0;
export const expectedMainlandPepFullQuestionBankCount =
  expectedMainlandPepPrimaryQuestionCount +
  expectedMainlandPepJuniorQuestionCount +
  expectedMainlandPepHighQuestionCount;
export const expectedFullQuestionBankCount =
  expectedHkQuestionCount +
  expectedMainlandPepFullQuestionBankCount +
  expectedMainlandBnuPrimaryQuestionCount +
  expectedMainlandBnuJuniorQuestionCount +
  expectedMainlandBnuHighQuestionCount +
  expectedMainlandHjbJuniorQuestionCount +
  expectedMainlandHjbPrimaryQuestionCount +
  expectedMainlandHjbHighQuestionCount +
  expectedUnitedStatesCaliforniaQuestionCount +
  expectedUnitedStatesNorthCarolinaQuestionCount +
  expectedUnitedStatesArkansasQuestionCount +
  expectedUnitedStatesFloridaMiddleSchoolQuestionCount;

export const requiredAliasKinds: AliasKind[] = [
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

const hkIndependentAnswerSource = `
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

export function hkIndependentAnswersById() {
  const answers = new Map(
    hkIndependentAnswerSource
      .trim()
      .split("\n")
      .map((line) => {
        const tabIndex = line.indexOf("\t");
        return [line.slice(0, tabIndex), line.slice(tabIndex + 1)] as const;
      })
  );

  Object.values(hongKongEasePracticeQuestionGenerationMetadata).forEach((metadata) => {
    answers.set(`hk-ease-${metadata.sourceId}`, metadata.independentAnswer);
  });

  return answers;
}

export function normalizeAnswer(value: string) {
  return normalizeGradingAnswer(value);
}

export function answerMatches(selectedAnswer: string, acceptedAnswer: string) {
  return gradingAnswerMatches(selectedAnswer, acceptedAnswer);
}

export function acceptedAnswersFor(question: Question) {
  return Array.from(new Set([question.answer, ...(question.acceptedAnswers ?? [])]));
}

export function optionMatchesAcceptedAnswer(question: Question, option: NonNullable<Question["options"]>[number]) {
  return acceptedAnswersFor(question).some((acceptedAnswer) =>
    answerMatches(acceptedAnswer, option.en) || answerMatches(acceptedAnswer, option.zh)
  );
}

export function isExpectedAnswerRepresented(question: Question, independentAnswer: string) {
  return acceptedAnswersFor(question).some((acceptedAnswer) => answerMatches(independentAnswer, acceptedAnswer));
}

export function aliasKindsFor(question: Question, alias: string) {
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
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
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

export function deriveGraphAnswer(question: Question) {
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

type SolverResult = {
  answer: string | null;
  notes?: string[];
};

const topicFamily: Record<string, string> = {
  "pep-high-s4-sets-logic": "sets",
  "pep-high-s4-quadratic-inequalities": "quadratic",
  "pep-high-s4-function-properties": "functions",
  "pep-high-s4-exp-log": "exp-log",
  "pep-high-s4-trigonometry": "trigonometry",
  "pep-high-s4-plane-vectors": "vectors",
  "pep-high-s4-complex-numbers": "complex",
  "pep-high-s4-solid-geometry-intro": "solid-geometry",
  "pep-high-s4-statistics": "statistics",
  "pep-high-s4-probability": "probability",
  "pep-high-s5-space-vectors": "vectors",
  "pep-high-s5-lines-circles": "lines-circles",
  "pep-high-s5-conics": "conics",
  "pep-high-s5-sequences": "sequences",
  "pep-high-s5-derivatives": "derivatives",
  "pep-high-s6-counting": "counting",
  "pep-high-s6-random-variables": "random-variables",
  "pep-high-s6-bivariate-data": "bivariate-data",
  "pep-high-s6-derivative-synthesis": "derivatives",
  "pep-high-s6-analytic-geometry-synthesis": "conics",
  "pep-high-s6-probability-statistics-synthesis": "probability",
  "pep-high-s6-exam-practice": "exam-synthesis"
};

function textForSolving(question: Question) {
  return question.prompt.en.replace(/\\\(|\\\)/g, "").replace(/\s+/g, " ").trim();
}

function independentUnitedStatesLiveAnswer(question: Question): SolverResult {
  const text = textForSolving(question);

  const sumMatch = /What is ([0-9]+) \+ ([0-9]+)\?/.exec(text);
  if (sumMatch) return { answer: String(Number(sumMatch[1]) + Number(sumMatch[2])) };

  const equalRowsMatch = /arranges ([0-9]+) equal rows with 6 counters in each row/.exec(text);
  if (equalRowsMatch) return { answer: String(Number(equalRowsMatch[1]) * 6) };

  const equivalentFractionMatch = /equivalent to ([0-9]+)\/([0-9]+)\?/.exec(text);
  if (equivalentFractionMatch) {
    return { answer: formatFraction(Number(equivalentFractionMatch[1]), Number(equivalentFractionMatch[2])) };
  }

  const percentMatch = /What is ([0-9]+)% of ([0-9]+)\?/.exec(text);
  if (percentMatch) return { answer: formatNumber((Number(percentMatch[1]) / 100) * Number(percentMatch[2])) };

  const linearEquationMatch = /Solve 2x \+ ([0-9]+) = ([0-9]+)\./.exec(text);
  if (linearEquationMatch) return { answer: formatNumber((Number(linearEquationMatch[2]) - Number(linearEquationMatch[1])) / 2) };

  const linearFunctionMatch = /If f\(x\) = ([0-9]+)x - 1, what is f\(4\) \?/.exec(text);
  if (linearFunctionMatch) return { answer: formatNumber(Number(linearFunctionMatch[1]) * 4 - 1) };

  const rectangleAreaMatch = /A rectangle is ([0-9]+) cm by ([0-9]+) cm\. What is its area/.exec(text);
  if (rectangleAreaMatch) return { answer: `${Number(rectangleAreaMatch[1]) * Number(rectangleAreaMatch[2])} cm^2` };

  const rectanglePerimeterMatch = /same rectangle is ([0-9]+) cm by ([0-9]+) cm\. What is its perimeter\?/.exec(text);
  if (rectanglePerimeterMatch) {
    return { answer: `${2 * (Number(rectanglePerimeterMatch[1]) + Number(rectanglePerimeterMatch[2]))} cm` };
  }

  const meanMatch = /Find the mean of ([0-9]+), ([0-9]+), and ([0-9]+)\./.exec(text);
  if (meanMatch) {
    const values = meanMatch.slice(1).map(Number);
    return { answer: formatNumber(values.reduce((total, value) => total + value, 0) / values.length) };
  }

  if (/six-sided die is rolled once/.test(text) && /probability of an even number/.test(text)) {
    return { answer: "1/2" };
  }

  if (/Point A is at \(2,-3\)|Point A is at \(2, -3\)/.test(text) && /quadrant/.test(text)) {
    return { answer: "IV" };
  }

  const slopeMatch = /slope through \(1,2\) and \(3,([0-9]+)\)|slope through \(1, 2\) and \(3, ([0-9]+)\)/.exec(text);
  if (slopeMatch) {
    const y2 = Number(slopeMatch[1] ?? slopeMatch[2]);
    return { answer: formatNumber((y2 - 2) / 2) };
  }

  const derivativeMatch = /Differentiate ([0-9]+)x\^2 with respect to x\./.exec(text);
  if (derivativeMatch) return { answer: `${Number(derivativeMatch[1]) * 2}x` };

  if (/model doubles every hour/.test(text) && /starts at 5/.test(text) && /after 3 hours/.test(text)) {
    return { answer: "40" };
  }

  return { answer: null, notes: [`No US live solver matched prompt ${question.id}.`] };
}

function numberFrom(value: string | undefined) {
  return value === undefined ? null : Number(value);
}

function parseSignedNumber(value: string) {
  return Number(value.replace(/^\+/, ""));
}

function arithmeticSet(limit: number, divisor: number) {
  return Array.from({ length: limit }, (_, index) => index + 1).filter((value) => value % divisor === 0);
}

function solveSets(question: Question, text: string): SolverResult {
  const limit = numberFrom(/U=\\\{1,2,\\ldots,([0-9]+)\\\}/.exec(text)?.[1]);
  const multiples = [...text.matchAll(/multiples of ([0-9]+)/g)].map((match) => Number(match[1]));
  if (!limit || multiples.length < 2) return { answer: null, notes: ["Could not parse finite universe or set divisors."] };

  const setA = arithmeticSet(limit, multiples[0]);
  const setB = arithmeticSet(limit, multiples[1]);
  const intersection = setA.filter((value) => setB.includes(value));
  const union = Array.from(new Set([...setA, ...setB]));

  if (/\|A\\cup B\|/.test(text)) return { answer: String(union.length) };
  if (/outside/.test(text)) return { answer: String(limit - union.length) };
  if (/\|A\\cap B\|/.test(text)) return { answer: String(intersection.length) };
  return { answer: null, notes: ["Could not identify requested set operation."] };
}

function solveQuadratic(question: Question, text: string): SolverResult {
  const match = /(?:f\(x\)|y)=\(x([+-][0-9]+(?:\.[0-9]+)?)\)\^2([+-][0-9]+(?:\.[0-9]+)?)/.exec(text);
  if (!match) return { answer: null, notes: ["Could not parse vertex-form quadratic."] };
  const h = -parseSignedNumber(match[1]);
  const k = parseSignedNumber(match[2]);

  const functionValueMatch = /f\((-?[0-9]+(?:\.[0-9]+)?)\)/.exec(text);
  if (/minimum value/.test(text)) return { answer: formatNumber(k) };
  if (functionValueMatch) {
    const x = Number(functionValueMatch[1]);
    return { answer: formatNumber((x - h) ** 2 + k) };
  }
  if (/axis of symmetry/.test(text)) return { answer: formatNumber(h) };
  return { answer: null, notes: ["Could not identify quadratic target."] };
}

function solveFunctions(question: Question, text: string): SolverResult {
  const rule = /f\(x\)=(-?[0-9]+(?:\.[0-9]+)?)x([+-][0-9]+(?:\.[0-9]+)?)/.exec(text);
  if (!rule) return { answer: null, notes: ["Could not parse linear function rule."] };
  const a = Number(rule[1]);
  const b = parseSignedNumber(rule[2]);

  const valueMatch = /Find f\((-?[0-9]+(?:\.[0-9]+)?)\)/.exec(text);
  if (valueMatch) return { answer: formatNumber(a * Number(valueMatch[1]) + b) };

  const solveMatch = /Solve f\(x\)=(-?[0-9]+(?:\.[0-9]+)?)/.exec(text);
  if (solveMatch) return { answer: formatNumber((Number(solveMatch[1]) - b) / a) };

  return { answer: null, notes: ["Could not identify linear-function target."] };
}

function solveExpLog(question: Question, text: string): SolverResult {
  const match = /(?:(\d+)\\log_|\\log_)([0-9])([0-9]+)/.exec(text);
  if (!match) return { answer: null, notes: ["Could not parse logarithm expression."] };
  const coefficient = match[1] ? Number(match[1]) : 1;
  const base = Number(match[2]);
  const argument = Number(match[3]);
  const exponent = Math.log(argument) / Math.log(base);
  const answer = /Simplify/.test(text) ? coefficient * exponent : exponent;
  return { answer: formatNumber(answer) };
}

function solveTrigonometry(question: Question, text: string): SolverResult {
  const sinusoid = /y=([0-9]+(?:\.[0-9]+)?)\\sin\s*([0-9]+(?:\.[0-9]+)?)x/.exec(text);
  if (sinusoid) {
    if (/amplitude/.test(text)) return { answer: formatNumber(Number(sinusoid[1])) };
    if (/coefficient of x/.test(text)) return { answer: formatNumber(Number(sinusoid[2])) };
  }

  const angle = /\\(sin|cos|tan)(30|45|60)\^\\circ/.exec(text);
  if (!angle) return { answer: null, notes: ["Could not parse trigonometric target."] };
  const key = `${angle[1]}-${angle[2]}`;
  const values: Record<string, string> = {
    "sin-30": "1/2",
    "cos-60": "1/2",
    "tan-45": "1"
  };
  return values[key] ? { answer: values[key] } : { answer: null, notes: [`Unsupported standard angle ${key}.`] };
}

function parseVector(text: string, label: "a" | "b") {
  const match = new RegExp(`\\\\vec ${label}=\\((-?[0-9]+),(-?[0-9]+)(?:,(-?[0-9]+))?\\)`).exec(text);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

function solveVectors(question: Question, text: string): SolverResult {
  const vectorA = parseVector(text, "a");
  if (!vectorA) return { answer: null, notes: ["Could not parse vector a."] };
  if (/\|\\vec a\|\^2/.test(text)) {
    return { answer: formatNumber(vectorA.reduce((sum, value) => sum + value ** 2, 0)) };
  }

  const vectorB = parseVector(text, "b");
  if (!vectorB) return { answer: null, notes: ["Could not parse vector b."] };
  return { answer: formatNumber(vectorA.reduce((sum, value, index) => sum + value * vectorB[index], 0)) };
}

function solveComplex(question: Question, text: string): SolverResult {
  const match = /\((-?[0-9]+(?:\.[0-9]+)?)([+-][0-9]+(?:\.[0-9]+)?)i\)\+\((-?[0-9]+(?:\.[0-9]+)?)([+-][0-9]+(?:\.[0-9]+)?)i\)/.exec(text);
  if (!match) return { answer: null, notes: ["Could not parse complex-number sum."] };
  const real = Number(match[1]) + Number(match[3]);
  const imaginary = parseSignedNumber(match[2]) + parseSignedNumber(match[4]);

  if (/\|z\|\^2/.test(text)) return { answer: formatNumber(real ** 2 + imaginary ** 2) };
  if (/imaginary coefficient/.test(text)) return { answer: formatNumber(imaginary) };
  if (/real part/.test(text)) return { answer: formatNumber(real) };
  return { answer: null, notes: ["Could not identify complex-number target."] };
}

function solveSolidGeometry(question: Question, text: string): SolverResult {
  const match = /side lengths ([0-9]+), ([0-9]+), ([0-9]+)/.exec(text);
  if (!match) return { answer: null, notes: ["Could not parse cuboid side lengths."] };
  const [a, b, c] = match.slice(1).map(Number);
  if (/surface area/.test(text)) return { answer: String(2 * (a * b + b * c + a * c)) };
  if (/volume/.test(text)) return { answer: String(a * b * c) };
  if (/space diagonal/.test(text)) return { answer: String(a ** 2 + b ** 2 + c ** 2) };
  return { answer: null, notes: ["Could not identify solid-geometry target."] };
}

function solveStatistics(question: Question, text: string): SolverResult {
  const match = /data ([0-9]+), ([0-9]+), ([0-9]+)/.exec(text);
  if (!match) return { answer: null, notes: ["Could not parse data values."] };
  const values = match.slice(1).map(Number);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (/mean/.test(text)) return { answer: formatNumber(mean) };
  if (/range/.test(text)) return { answer: formatNumber(Math.max(...values) - Math.min(...values)) };
  if (/three times the variance/.test(text)) {
    return { answer: formatNumber(values.reduce((sum, value) => sum + (value - mean) ** 2, 0)) };
  }
  return { answer: null, notes: ["Could not identify statistics target."] };
}

function solveProbability(question: Question, text: string): SolverResult {
  const bag = /bag has ([0-9]+) red balls and ([0-9]+) blue balls/.exec(text);
  if (!bag) return { answer: null, notes: ["Could not parse probability setup."] };
  const red = Number(bag[1]);
  const blue = Number(bag[2]);
  const total = red + blue;
  if (/Two balls are drawn/.test(text)) return { answer: String(total * (total - 1)) };
  return { answer: formatFraction(red, total) };
}

function solveLinesCircles(question: Question, text: string): SolverResult {
  const slope = /through \((-?[0-9]+),(-?[0-9]+)\) and \((-?[0-9]+),(-?[0-9]+)\)/.exec(text);
  if (slope) {
    const [, x1, y1, x2, y2] = slope.map(Number);
    return { answer: formatNumber((y2 - y1) / (x2 - x1)) };
  }

  const circle = /\(x-(-?[0-9]+)\)\^2\+\(y-(-?[0-9]+)\)\^2=([0-9]+)/.exec(text);
  if (!circle) return { answer: null, notes: ["Could not parse line or circle prompt."] };
  const radiusSquared = Number(circle[3]);
  if (/r\^2/.test(text)) return { answer: String(radiusSquared) };
  if (/radius/.test(text)) return { answer: formatNumber(Math.sqrt(radiusSquared)) };
  return { answer: null, notes: ["Could not identify circle target."] };
}

function solveConics(question: Question, text: string): SolverResult {
  const parabola = /y\^2=([0-9]+(?:\.[0-9]+)?)x/.exec(text);
  if (parabola && /y\^2=2px/.test(text)) return { answer: formatNumber(Number(parabola[1]) / 2) };

  const ellipse = /\\frac\{x\^2\}\{([0-9]+)\}\+\\frac\{y\^2\}\{([0-9]+)\}=1/.exec(text);
  if (!ellipse) return { answer: null, notes: ["Could not parse conic prompt."] };
  const xDenominator = Number(ellipse[1]);
  const yDenominator = Number(ellipse[2]);
  if (/c\^2/.test(text)) return { answer: String(xDenominator - yDenominator) };
  if (/major-axis length/.test(text)) return { answer: formatNumber(2 * Math.sqrt(Math.max(xDenominator, yDenominator))) };
  return { answer: null, notes: ["Could not identify conic target."] };
}

function solveSequences(question: Question, text: string): SolverResult {
  const first = numberFrom(/a_1=([0-9]+(?:\.[0-9]+)?)/.exec(text)?.[1]);
  const diff = numberFrom(/d=([0-9]+(?:\.[0-9]+)?)/.exec(text)?.[1]);
  if (first === null || diff === null) return { answer: null, notes: ["Could not parse sequence parameters."] };

  const sumMatch = /Find S_([0-9]+)/.exec(text);
  if (sumMatch) {
    const term = Number(sumMatch[1]);
    const nth = first + (term - 1) * diff;
    return { answer: formatNumber((term * (first + nth)) / 2) };
  }

  const termMatch = /Find a_([0-9]+)/.exec(text);
  if (termMatch) {
    const term = Number(termMatch[1]);
    return { answer: formatNumber(first + (term - 1) * diff) };
  }

  return { answer: null, notes: ["Could not identify sequence target."] };
}

function solveDerivatives(question: Question, text: string): SolverResult {
  const quadratic = /f\(x\)=(-?[0-9]+(?:\.[0-9]+)?)x\^2([+-][0-9]+(?:\.[0-9]+)?)x[+-][0-9]+/.exec(text);
  if (quadratic) {
    const a = Number(quadratic[1]);
    const b = parseSignedNumber(quadratic[2]);
    const stationary = /f'\(x\)=0/.test(text);
    if (stationary) return { answer: formatNumber(-b / (2 * a)) };
    const valueMatch = /f'\((-?[0-9]+(?:\.[0-9]+)?)\)/.exec(text);
    if (valueMatch) return { answer: formatNumber(2 * a * Number(valueMatch[1]) + b) };
  }

  const cubic = /f\(x\)=([0-9]+(?:\.[0-9]+)?)x\^3/.exec(text);
  const valueMatch = /f'\((-?[0-9]+(?:\.[0-9]+)?)\)/.exec(text);
  if (cubic && valueMatch) {
    return { answer: formatNumber(3 * Number(cubic[1]) * Number(valueMatch[1]) ** 2) };
  }

  return { answer: null, notes: ["Could not parse derivative prompt."] };
}

function solveCounting(question: Question, text: string): SolverResult {
  const total = numberFrom(/From ([0-9]+) different items/.exec(text)?.[1]);
  if (!total) return { answer: null, notes: ["Could not parse counting setup."] };
  if (/ordered selections/.test(text)) return { answer: String(total * (total - 1)) };
  return { answer: String((total * (total - 1)) / 2) };
}

function solveRandomVariables(question: Question, text: string): SolverResult {
  const match = /B\(([0-9]+), ([0-9]+)\/([0-9]+)\)/.exec(text);
  if (!match) return { answer: null, notes: ["Could not parse binomial distribution."] };
  const trials = Number(match[1]);
  const p = Number(match[2]) / Number(match[3]);
  if (/variance/.test(text)) return { answer: formatNumber(trials * p * (1 - p)) };
  if (/expectation/.test(text)) return { answer: formatNumber(trials * p) };
  return { answer: null, notes: ["Could not identify random-variable target."] };
}

function solveBivariateData(question: Question, text: string): SolverResult {
  const regression = /\\hat y=([0-9]+(?:\.[0-9]+)?)x([+-][0-9]+(?:\.[0-9]+)?)/.exec(text);
  const xMatch = /x=([0-9]+(?:\.[0-9]+)?)/.exec(text);
  if (!regression || !xMatch) return { answer: null, notes: ["Could not parse regression model."] };
  const predicted = Number(regression[1]) * Number(xMatch[1]) + parseSignedNumber(regression[2]);
  const observedMatch = /observed value is (-?[0-9]+(?:\.[0-9]+)?)/.exec(text);
  if (/residual/.test(text) && observedMatch) return { answer: formatNumber(Number(observedMatch[1]) - predicted) };
  return { answer: formatNumber(predicted) };
}

function solveExamSynthesis(question: Question, text: string): SolverResult {
  const derivative = solveDerivatives(question, text);
  if (derivative.answer !== null) return derivative;
  const probability = /favorable event has ([0-9]+) outcomes from ([0-9]+) equally likely outcomes/.exec(text);
  if (probability) return { answer: formatFraction(Number(probability[1]), Number(probability[2])) };
  return { answer: null, notes: ["Could not parse exam-synthesis prompt."] };
}

function mainlandIndependentAnswer(question: Question): SolverResult {
  const family = topicFamily[question.topicId];
  const text = textForSolving(question);

  switch (family) {
    case "sets":
      return solveSets(question, text);
    case "quadratic":
      return solveQuadratic(question, text);
    case "functions":
      return solveFunctions(question, text);
    case "exp-log":
      return solveExpLog(question, text);
    case "trigonometry":
      return solveTrigonometry(question, text);
    case "vectors":
      return solveVectors(question, text);
    case "complex":
      return solveComplex(question, text);
    case "solid-geometry":
      return solveSolidGeometry(question, text);
    case "statistics":
      return solveStatistics(question, text);
    case "probability":
      return solveProbability(question, text);
    case "lines-circles":
      return solveLinesCircles(question, text);
    case "conics":
      return solveConics(question, text);
    case "sequences":
      return solveSequences(question, text);
    case "derivatives":
      return solveDerivatives(question, text);
    case "counting":
      return solveCounting(question, text);
    case "random-variables":
      return solveRandomVariables(question, text);
    case "bivariate-data":
      return solveBivariateData(question, text);
    case "exam-synthesis":
      return solveExamSynthesis(question, text);
    default:
      return { answer: null, notes: [`No Mainland solver registered for topic ${question.topicId}.`] };
  }
}

function independentAnswerFor(question: Question, hkAnswers: Map<string, string>): SolverResult {
  if (question.curriculumTrack === "HK") {
    if (hongKongEasePracticeQuestionGenerationMetadata[question.id]) {
      return { answer: independentHongKongEasePracticeAnswer(question) };
    }
    if (question.type === "graph") {
      const derivedGraphAnswer = deriveGraphAnswer(question);
      if (derivedGraphAnswer) return { answer: derivedGraphAnswer };
    }
    return { answer: hkAnswers.get(question.id) ?? null, notes: hkAnswers.has(question.id) ? [] : ["Missing HK independent answer."] };
  }

  if (mainlandPepPrimaryQuestionGenerationMetadata[question.id]) {
    return { answer: independentMainlandPepPrimaryAnswer(question) };
  }

  if (mainlandPepJuniorQuestionGenerationMetadata[question.id]) {
    return { answer: independentMainlandPepJuniorAnswer(question) };
  }

  if (mainlandBnuPrimaryQuestionGenerationMetadata[question.id]) {
    return { answer: independentMainlandBnuPrimaryAnswer(question) };
  }

  if (mainlandBnuJuniorQuestionGenerationMetadata[question.id]) {
    return { answer: independentMainlandBnuJuniorAnswer(question) };
  }

  if (mainlandBnuHighQuestionGenerationMetadata[question.id]) {
    return { answer: independentMainlandBnuHighAnswer(question) };
  }

  if (mainlandHjbJuniorQuestionGenerationMetadata[question.id]) {
    return { answer: independentMainlandHjbJuniorAnswer(question) };
  }

  if (mainlandHjbPrimaryQuestionGenerationMetadata[question.id]) {
    return { answer: independentMainlandHjbPrimaryAnswer(question) };
  }

  if (mainlandHjbHighQuestionGenerationMetadata[question.id]) {
    return { answer: independentMainlandHjbHighAnswer(question) };
  }

  if (usArkansasQuestionGenerationMetadata[question.id]) {
    return { answer: independentUnitedStatesArkansasAnswer(question) };
  }

  if (usCaliforniaQuestionGenerationMetadata[question.id]) {
    return { answer: independentUnitedStatesCaliforniaAnswer(question) };
  }

  if (usFloridaMiddleSchoolQuestionGenerationMetadata[question.id]) {
    return { answer: independentUnitedStatesFloridaMiddleSchoolAnswer(question) };
  }

  if (question.curriculumTrack === "US_NC_MATH") {
    return independentUnitedStatesLiveAnswer(question);
  }

  if (question.curriculumTrack === "US_CA_MATH") {
    return { answer: null, notes: ["California question is not from the selected Math Practice Beta metadata."] };
  }

  if (question.curriculumTrack === "MAINLAND_PEP_HIGH") return mainlandIndependentAnswer(question);
  return { answer: null, notes: [`Unsupported curriculum track ${question.curriculumTrack}.`] };
}

function batchFor(question: Question) {
  if (hongKongEasePracticeQuestionGenerationMetadata[question.id]) {
    return hongKongEasePracticeQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (question.curriculumTrack === "HK") return "hk";
  if (mainlandPepPrimaryQuestionGenerationMetadata[question.id]) {
    return mainlandPepPrimaryQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (mainlandPepHighRagV4QuestionGenerationMetadata[question.id]) {
    return mainlandPepHighRagV4QuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (mainlandPepJuniorQuestionGenerationMetadata[question.id]) {
    return mainlandPepJuniorQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (mainlandBnuPrimaryQuestionGenerationMetadata[question.id]) {
    return mainlandBnuPrimaryQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (mainlandBnuJuniorQuestionGenerationMetadata[question.id]) {
    return mainlandBnuJuniorQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (mainlandBnuHighQuestionGenerationMetadata[question.id]) {
    return mainlandBnuHighQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (mainlandHjbJuniorQuestionGenerationMetadata[question.id]) {
    return mainlandHjbJuniorQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (mainlandHjbPrimaryQuestionGenerationMetadata[question.id]) {
    return mainlandHjbPrimaryQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (mainlandHjbHighQuestionGenerationMetadata[question.id]) {
    return mainlandHjbHighQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (usArkansasQuestionGenerationMetadata[question.id]) {
    return usArkansasQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (usCaliforniaQuestionGenerationMetadata[question.id]) {
    return usCaliforniaQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (usFloridaMiddleSchoolQuestionGenerationMetadata[question.id]) {
    return usFloridaMiddleSchoolQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
  }
  if (question.curriculumTrack === "US_CA_MATH") return "us-ca-live-v1";
  if (question.curriculumTrack === "US_NC_MATH") return "us-nc-live-v1";
  if (question.curriculumTrack === "US_AR_MATH") return "us-ar-k-g5-v1";
  if (question.curriculumTrack === "US_FL_MATH") return "us-fl-ms-v1";
  return mainlandPepHighQuestionGenerationMetadata[question.id]?.batch ?? "unknown";
}

function severityFor(status: QuestionAuditStatus): QuestionAuditSeverity {
  if (status === "pass") return "none";
  if (status === "solver-gap") return "P2";
  return "P1";
}

function higherPriorityStatus(current: QuestionAuditStatus, next: QuestionAuditStatus) {
  const order: QuestionAuditStatus[] = ["pass", "solver-gap", "content-error", "grader-gap", "ambiguous-mc", "answer-mismatch"];
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

function gradingPayload(question: Question) {
  return {
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null
  };
}

function wrongAnswerFor(question: Question, expectedAnswer: string) {
  const scalar = parseScalarAnswer(expectedAnswer);
  if (scalar !== null) {
    const candidates = [scalar + 1, scalar - 1, scalar + 10, scalar - 10, 999999].map(formatNumber);
    return candidates.find((candidate) => !isExpectedAnswerRepresented(question, candidate)) ?? "999999";
  }
  if (/^\(-?[0-9]+(?:\.[0-9]+)?,\s*-?[0-9]+(?:\.[0-9]+)?\)$/.test(expectedAnswer)) return "(999,999)";
  if (/^[IV]+$/.test(expectedAnswer)) return "not-a-quadrant";
  return "__definitely_wrong_answer__";
}

function hasCoreFields(question: Question) {
  return Boolean(
    question.id &&
      question.curriculumTrack &&
      question.grade &&
      question.topicId &&
      question.type &&
      question.prompt.en.trim() &&
      question.prompt.zh.trim() &&
      question.answer.trim() &&
      question.explanation.en.trim() &&
      question.explanation.zh.trim()
  );
}

function normalizedTextAnswer(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/\\\(|\\\)/g, "");
}

function explanationIncludesStoredAnswer(question: Question) {
  const answer = normalizedTextAnswer(question.answer);
  const explanation = normalizedTextAnswer(`${question.explanation.en} ${question.explanation.zh}`);
  return Boolean(answer && explanation.includes(answer));
}

function auditQuestion(
  question: Question,
  hkAnswers: Map<string, string>,
  options: { batchOverride?: string; requireExplanationAnswerReach?: boolean } = {}
): FullQuestionBankAuditRow {
  const notes: string[] = [];
  let status: QuestionAuditStatus = "pass";
  const mark = (nextStatus: QuestionAuditStatus, note: string) => {
    status = higherPriorityStatus(status, nextStatus);
    notes.push(note);
  };

  if (!hasCoreFields(question)) mark("content-error", "Question is missing a required prompt/answer/explanation/topic/grade/type field.");

  if (question.diagram) {
    const normalizedDiagram = normalizeQuestionDiagram(question.diagram);
    if (!normalizedDiagram) {
      mark("content-error", "Diagram payload does not conform to the question figure spec.");
    } else {
      const diagramIssues = validateQuestionDiagram(normalizedDiagram);
      if (diagramIssues.length) {
        mark("content-error", `Diagram failed deterministic figure QA: ${diagramIssues.join("; ")}.`);
      }
    }
  }

  const solver = independentAnswerFor(question, hkAnswers);
  const independentAnswer = solver.answer ?? "";
  if (!solver.answer) mark("solver-gap", [...(solver.notes ?? ["Could not compute an independent answer."])].join(" "));

  if (solver.answer && !isExpectedAnswerRepresented(question, solver.answer)) {
    mark("answer-mismatch", `Independent answer "${solver.answer}" does not match stored answer or accepted aliases.`);
  }

  for (const acceptedAnswer of acceptedAnswersFor(question)) {
    if (!questionAnswerMatches(gradingPayload(question), acceptedAnswer)) {
      mark("grader-gap", `Accepted answer "${acceptedAnswer}" was rejected by MAIS answer grading.`);
    }
  }

  if (solver.answer) {
    const wrongAnswer = wrongAnswerFor(question, solver.answer);
    if (questionAnswerMatches(gradingPayload(question), wrongAnswer)) {
      mark("grader-gap", `Deliberately wrong answer "${wrongAnswer}" was accepted by MAIS answer grading.`);
    }
  }

  if (question.type === "multiple-choice") {
    const options = question.options ?? [];
    const uniqueOptions = new Set(options.map((option) => normalizeAnswer(option.en)));
    if (options.length !== 4) mark("content-error", `Multiple-choice question has ${options.length} options instead of 4.`);
    if (uniqueOptions.size !== options.length) mark("ambiguous-mc", "Multiple-choice options are not unique.");

    if (solver.answer) {
      const solverAnswer = solver.answer;
      const acceptedOptionCount = options.filter((option) =>
        [option.en, option.zh, option.zhHans ?? ""].some((optionText) => answerMatches(solverAnswer, optionText))
      ).length;
      if (acceptedOptionCount !== 1) {
        mark("ambiguous-mc", `Expected exactly one option matching independent answer; found ${acceptedOptionCount}.`);
      }
    }
  } else if (options.requireExplanationAnswerReach && !explanationIncludesStoredAnswer(question)) {
    mark("content-error", "Non-choice explanation does not visibly reach the stored answer.");
  }

  return {
    questionId: question.id,
    curriculumTrack: question.curriculumTrack,
    batch: options.batchOverride ?? batchFor(question),
    grade: question.grade,
    topicId: question.topicId,
    type: question.type,
    storedAnswer: question.answer,
    independentAnswer,
    status,
    severity: severityFor(status),
    notes: notes.length ? notes : ["OK"]
  };
}

function countBy<T extends string>(values: T[]) {
  const counts: Record<string, number> = {};
  values.forEach((value) => {
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return counts;
}

function blankStatusCounts() {
  const statuses: QuestionAuditStatus[] = ["pass", "content-error", "solver-gap", "answer-mismatch", "ambiguous-mc", "grader-gap"];
  return Object.fromEntries(statuses.map((status) => [status, 0])) as Record<QuestionAuditStatus, number>;
}

export function buildFullQuestionBankSolvabilityAudit(reportDate = new Date().toISOString().slice(0, 10)): FullQuestionBankAuditReport {
  const hkAnswers = hkIndependentAnswersById();
  const rows = questions.map((question) => auditQuestion(question, hkAnswers));
  const failingRows = rows.filter((row) => row.status !== "pass");
  const statusCounts = blankStatusCounts();
  rows.forEach((row) => {
    statusCounts[row.status] += 1;
  });

  const hkQuestions = questions.filter((question) => question.curriculumTrack === "HK").length;
  const mainlandPepPrimaryQuestions = questions.filter((question) => Boolean(mainlandPepPrimaryQuestionGenerationMetadata[question.id])).length;
  const mainlandPepJuniorQuestions = questions.filter((question) => Boolean(mainlandPepJuniorQuestionGenerationMetadata[question.id])).length;
  const mainlandPepHighQuestions = questions.filter((question) => Boolean(mainlandPepHighQuestionGenerationMetadata[question.id])).length;
  const mainlandBnuPrimaryQuestions = questions.filter((question) => Boolean(mainlandBnuPrimaryQuestionGenerationMetadata[question.id])).length;
  const mainlandBnuJuniorQuestions = questions.filter((question) => Boolean(mainlandBnuJuniorQuestionGenerationMetadata[question.id])).length;
  const mainlandBnuHighQuestions = questions.filter((question) => Boolean(mainlandBnuHighQuestionGenerationMetadata[question.id])).length;
  const mainlandHjbJuniorQuestions = questions.filter((question) => Boolean(mainlandHjbJuniorQuestionGenerationMetadata[question.id])).length;
  const mainlandHjbPrimaryQuestions = questions.filter((question) => Boolean(mainlandHjbPrimaryQuestionGenerationMetadata[question.id])).length;
  const mainlandHjbHighQuestions = questions.filter((question) => Boolean(mainlandHjbHighQuestionGenerationMetadata[question.id])).length;
  const unitedStatesCaliforniaQuestions = questions.filter((question) => question.curriculumTrack === "US_CA_MATH").length;
  const unitedStatesNorthCarolinaQuestions = questions.filter((question) => question.curriculumTrack === "US_NC_MATH").length;
  const unitedStatesArkansasQuestions = questions.filter((question) => Boolean(usArkansasQuestionGenerationMetadata[question.id])).length;
  const unitedStatesFloridaMiddleSchoolQuestions = questions.filter((question) => Boolean(usFloridaMiddleSchoolQuestionGenerationMetadata[question.id])).length;

  return {
    reportDate,
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions: questions.length,
      hkQuestions,
      mainlandPepPrimaryQuestions,
      mainlandPepJuniorQuestions,
      mainlandPepHighQuestions,
      mainlandBnuPrimaryQuestions,
      mainlandBnuJuniorQuestions,
      mainlandBnuHighQuestions,
      mainlandHjbJuniorQuestions,
      mainlandHjbPrimaryQuestions,
      mainlandHjbHighQuestions,
      unitedStatesCaliforniaQuestions,
      unitedStatesNorthCarolinaQuestions,
      unitedStatesArkansasQuestions,
      unitedStatesFloridaMiddleSchoolQuestions,
      passRows: rows.length - failingRows.length,
      failingRows: failingRows.length,
      statusCounts,
      trackCounts: countBy(questions.map((question) => question.curriculumTrack)),
      batchCounts: countBy(rows.map((row) => row.batch)),
      releaseRecommendation: failingRows.length
        ? "Red: answer-key release gate is blocked until failing rows are reviewed or fixed."
        : "Green: all current questions are deterministically solvable and answer-key matched."
    },
    rows,
    failingRows,
    assumptions: [
      "Solvable means the answer is derivable from checked-in prompt, options, and diagram data without external sources.",
      "Answer-key match means the independent answer matches answer or acceptedAnswers under MAIS answer normalization.",
      "Mainland PEP primary questions are checked by deterministic family audit rules derived from question metadata, not by reading stored answers.",
      "Mainland PEP junior questions are checked against the S18-reviewed deterministic v2 1200-question generation metadata.",
      "Mainland PEP high-school questions are checked by prompt-derived solver rules, not by reusing the original generator draft values.",
      "Mainland BNU primary V1 approved questions are included from the S18 public-integration question pack with production metadata.",
      "Mainland BNU high V1 approved questions are included from the S18 approved remediated pack with production metadata.",
      "Mainland HJB junior V2 1500 questions are included from the S18-approved post-repair production question pack.",
      "Mainland HJB primary V1 questions are included from the S18 DeepSeek-v4-pro-remediated QA-green production question pack.",
      "Mainland HJB high-school V2 questions are included as the stable default production bank; V1, V3-remediated, and V4-remediated remain explicit non-default exports.",
      "US California Math Practice Beta live questions include the owner-selected S18-approved G6-G12 v2 package and the 492-question K-G5 knowledge-point practice package; old K-G5 v3 DeepSeek questions remain deliberately downlisted. This audit uses package independentAnswer fields for answer-key matching.",
      "US North Carolina practice questions remain candidate-only pending S18/S15 promotion, so this live full-bank audit expects zero US_NC_MATH rows.",
      "US Arkansas K-G12 questions are included from S18 accepted DeepSeek-v4-pro packages copied to generated-content; this audit uses the package independentAnswer field for answer-key matching.",
      "US Florida Grade 6-8 live questions are included from the S21 generated textbook package copied to generated-content; this audit uses deterministic package answers for answer-key matching while S18 final curriculum acceptance remains separate.",
      "Hong Kong EASE Practice V1 questions are included only when the raw EASE row is materialized, text-only, cached S18 QA green, answer-key matched, and not image dependent.",
      "No live LLM provider, OCR provider, textbook corpus, or exam-paper source text is used by this audit."
    ]
  };
}

function duplicateOverflowCount(values: string[]) {
  const counts = countBy(values);
  return Object.values(counts).reduce((total, count) => total + Math.max(0, count - 1), 0);
}

function mainlandPepScopeFor(question: Question) {
  if (mainlandPepPrimaryQuestionGenerationMetadata[question.id]) return "primary";
  if (mainlandPepJuniorQuestionGenerationMetadata[question.id]) return "junior";
  if (mainlandPepHighQuestionGenerationMetadata[question.id]) return "high";
  return null;
}

function mainlandPepQuestionsForQa() {
  return questions.filter((question) => mainlandPepScopeFor(question));
}

function mainlandPepQaSeverityFor(status: QuestionAuditStatus): MainlandPepQaSeverity {
  if (status === "pass") return "none";
  if (status === "answer-mismatch" || status === "ambiguous-mc") return "P0";
  if (status === "content-error" || status === "grader-gap") return "P1";
  return "P2";
}

function recommendedActionFor(status: QuestionAuditStatus) {
  switch (status) {
    case "pass":
      return "No blocking action; include in grade/batch/type pass-sample review before external quality claims.";
    case "answer-mismatch":
      return "P0 block release; fix the stored answer, accepted aliases, or prompt under an S18/S04 source-data assignment, then rerun full QA.";
    case "ambiguous-mc":
      return "P0 block release; rewrite options so exactly one unique option matches the independent answer, then rerun full QA.";
    case "content-error":
      return "P1 block release; repair missing fields, invalid option structure, or explanation reach, then rerun full QA.";
    case "grader-gap":
      return "P1 block release; repair accepted-answer aliases or grading normalization, then rerun full QA.";
    case "solver-gap":
      return "P2 manual review; prove the answer independently or extend the deterministic solver, then rerun full QA.";
  }
}

function auditMainlandPepQuestion(question: Question, hkAnswers: Map<string, string>): MainlandPepFullQuestionBankQaRow {
  const sourceRow = auditQuestion(question, hkAnswers);
  const acceptedAnswers = acceptedAnswersFor(question);
  const solvableStatus: QaCheckStatus = sourceRow.independentAnswer ? "pass" : "fail";
  const answerMatchStatus: QaCheckStatus = sourceRow.independentAnswer
    ? isExpectedAnswerRepresented(question, sourceRow.independentAnswer)
      ? "pass"
      : "fail"
    : "not-checkable";
  const qaStatus: MainlandPepQuestionQaStatus = sourceRow.status === "pass" ? "pass" : "review-required";

  return {
    questionId: question.id,
    grade: question.grade,
    batch: sourceRow.batch,
    type: question.type,
    topicId: question.topicId,
    topic: question.topic,
    storedAnswer: question.answer,
    acceptedAnswers,
    independentAnswer: sourceRow.independentAnswer,
    solvableStatus,
    answerMatchStatus,
    qaStatus,
    severity: mainlandPepQaSeverityFor(sourceRow.status),
    sourceStatus: sourceRow.status,
    notes: sourceRow.notes,
    recommendedAction: recommendedActionFor(sourceRow.status)
  };
}

function expectedBatchCounts() {
  return {
    "primary-rag-v1": expectedMainlandPepPrimaryQuestionCount,
    "junior-rag-v2-1200": expectedMainlandPepJuniorQuestionCount,
    "seed-v1": 900,
    "rag-v2": 900,
    "rag-v3": 1500,
    "rag-v4": 1500
  };
}

function mainlandPepInventoryIssues(
  rows: MainlandPepFullQuestionBankQaRow[],
  sourceQuestions: Question[],
  duplicateIdCount: number
) {
  const issues: string[] = [];
  const primaryQuestions = sourceQuestions.filter((question) => mainlandPepScopeFor(question) === "primary").length;
  const juniorQuestions = sourceQuestions.filter((question) => mainlandPepScopeFor(question) === "junior").length;
  const highQuestions = sourceQuestions.filter((question) => mainlandPepScopeFor(question) === "high").length;
  const mainlandPepPublisherRowsWithoutMetadata = questions.filter(
    (question) => question.publisher === "MAINLAND_PEP" && !mainlandPepScopeFor(question)
  );
  const batchCounts = countBy(rows.map((row) => row.batch));

  if (rows.length !== expectedMainlandPepFullQuestionBankCount) {
    issues.push(`Expected ${expectedMainlandPepFullQuestionBankCount} Mainland PEP questions; found ${rows.length}.`);
  }
  if (primaryQuestions !== expectedMainlandPepPrimaryQuestionCount) {
    issues.push(`Expected ${expectedMainlandPepPrimaryQuestionCount} Mainland PEP primary questions; found ${primaryQuestions}.`);
  }
  if (juniorQuestions !== expectedMainlandPepJuniorQuestionCount) {
    issues.push(`Expected ${expectedMainlandPepJuniorQuestionCount} Mainland PEP junior questions; found ${juniorQuestions}.`);
  }
  if (highQuestions !== expectedMainlandPepHighQuestionCount) {
    issues.push(`Expected ${expectedMainlandPepHighQuestionCount} Mainland PEP high-school questions; found ${highQuestions}.`);
  }
  Object.entries(expectedBatchCounts()).forEach(([batch, expectedCount]) => {
    if ((batchCounts[batch] ?? 0) !== expectedCount) {
      issues.push(`Expected ${expectedCount} rows in batch ${batch}; found ${batchCounts[batch] ?? 0}.`);
    }
  });
  if (duplicateIdCount > 0) issues.push(`Found ${duplicateIdCount} duplicate Mainland PEP question IDs.`);
  if (mainlandPepPublisherRowsWithoutMetadata.length > 0) {
    issues.push(`Found ${mainlandPepPublisherRowsWithoutMetadata.length} Mainland PEP publisher rows without generation metadata.`);
  }
  return issues;
}

function mainlandPepPassSampleRows(rows: MainlandPepFullQuestionBankQaRow[], perCell = 3) {
  const counts = new Map<string, number>();
  return rows.filter((row) => {
    if (row.qaStatus !== "pass") return false;
    const key = `${row.grade}|${row.batch}|${row.type}`;
    const count = counts.get(key) ?? 0;
    counts.set(key, count + 1);
    return count < perCell;
  });
}

export function buildMainlandPepFullQuestionBankQaReport(
  reportDate = new Date().toISOString().slice(0, 10)
): MainlandPepFullQuestionBankQaReport {
  const hkAnswers = hkIndependentAnswersById();
  const sourceQuestions = mainlandPepQuestionsForQa();
  const rows = sourceQuestions.map((question) => auditMainlandPepQuestion(question, hkAnswers));
  const reviewRows = rows.filter((row) => row.qaStatus !== "pass");
  const passSampleRows = mainlandPepPassSampleRows(rows);
  const reviewIds = new Set(reviewRows.map((row) => row.questionId));
  const manualReviewQueueRows = [
    ...reviewRows,
    ...passSampleRows.filter((row) => !reviewIds.has(row.questionId))
  ];
  const sourceStatusCounts = blankStatusCounts();
  rows.forEach((row) => {
    sourceStatusCounts[row.sourceStatus] += 1;
  });

  const duplicateIdCount = duplicateOverflowCount(rows.map((row) => row.questionId));
  const inventoryIssues = mainlandPepInventoryIssues(rows, sourceQuestions, duplicateIdCount);
  const primaryQuestions = sourceQuestions.filter((question) => mainlandPepScopeFor(question) === "primary").length;
  const juniorQuestions = sourceQuestions.filter((question) => mainlandPepScopeFor(question) === "junior").length;
  const highQuestions = sourceQuestions.filter((question) => mainlandPepScopeFor(question) === "high").length;
  const p0Rows = rows.filter((row) => row.severity === "P0").length;
  const p1Rows = rows.filter((row) => row.severity === "P1").length;
  const p2Rows = rows.filter((row) => row.severity === "P2").length;

  const releaseRecommendation =
    inventoryIssues.length || p0Rows > 0 || p1Rows > 0
      ? "Red: Mainland PEP release is blocked until inventory, P0, and P1 rows are fixed and full QA is rerun."
      : p2Rows > 0
        ? "Amber: no P0/P1 blockers, but solver-gap rows require S18 manual proof or deterministic solver expansion."
        : "Green: all current Mainland PEP questions have deterministic row-level solvability and answer-key match verdicts; keep pass-sample manual review before external quality claims.";

  return {
    reportDate,
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions: rows.length,
      expectedQuestions: expectedMainlandPepFullQuestionBankCount,
      primaryQuestions,
      juniorQuestions,
      highQuestions,
      passRows: rows.length - reviewRows.length,
      reviewRows: reviewRows.length,
      p0Rows,
      p1Rows,
      p2Rows,
      duplicateIdCount,
      inventoryIssueCount: inventoryIssues.length,
      manualReviewQueueRows: manualReviewQueueRows.length,
      sourceStatusCounts,
      solvableStatusCounts: countBy(rows.map((row) => row.solvableStatus)),
      answerMatchStatusCounts: countBy(rows.map((row) => row.answerMatchStatus)),
      qaStatusCounts: countBy(rows.map((row) => row.qaStatus)),
      gradeCounts: countBy(rows.map((row) => row.grade)),
      batchCounts: countBy(rows.map((row) => row.batch)),
      typeCounts: countBy(rows.map((row) => row.type)),
      releaseRecommendation
    },
    rows,
    reviewRows,
    manualReviewQueueRows,
    inventoryIssues,
    assumptions: [
      "The current Mainland PEP bank is identified by checked-in primary, junior, and high-school generation metadata.",
      "Solvable means an independent deterministic solver derives an answer from the checked-in prompt, options, diagram data, or generation metadata.",
      "Answer-key match means the independent answer matches answer or acceptedAnswers under MAIS answer normalization.",
      "All non-pass rows require 100% S18 manual review; passing rows enter a deterministic grade/batch/type sample queue before external quality claims.",
      "No live LLM provider, OCR provider, external textbook corpus, or exam-paper source text is used by this audit."
    ]
  };
}

function exactPromptKey(question: Question) {
  return `${question.grade}:${question.type}:${question.prompt.zh}`.replace(/\s+/g, "");
}

function ragV4PublicInventoryIssues(
  gradeCounts: Record<string, number>,
  duplicateIdCount: number,
  duplicateExactPromptCount: number,
  publicRagV4Questions: number
) {
  const issues: string[] = [];
  if (mainlandPepHighRagV4Questions.length !== 1500) {
    issues.push(`Expected exactly 1500 rag-v4 questions; found ${mainlandPepHighRagV4Questions.length}.`);
  }
  ["S4", "S5", "S6"].forEach((grade) => {
    if ((gradeCounts[grade] ?? 0) !== 500) issues.push(`Expected ${grade} to have 500 rag-v4 questions; found ${gradeCounts[grade] ?? 0}.`);
  });
  if (publicRagV4Questions !== 1500) {
    issues.push(`Expected 1500 rag-v4 questions in the public Mainland PEP high-school bank; found ${publicRagV4Questions}.`);
  }
  if (duplicateIdCount > 0) issues.push(`Found ${duplicateIdCount} duplicate rag-v4 question IDs.`);
  if (duplicateExactPromptCount > 0) issues.push(`Found ${duplicateExactPromptCount} duplicate rag-v4 exact prompts.`);
  return issues;
}

export function buildMainlandHighRagV4PublicSolvabilityAudit(
  reportDate = new Date().toISOString().slice(0, 10)
): MainlandHighRagV4PublicSolvabilityAuditReport {
  const hkAnswers = hkIndependentAnswersById();
  const rows = mainlandPepHighRagV4Questions.map((question) =>
    auditQuestion(question, hkAnswers, { batchOverride: "rag-v4", requireExplanationAnswerReach: true })
  );
  const failingRows = rows.filter((row) => row.status !== "pass");
  const statusCounts = blankStatusCounts();
  rows.forEach((row) => {
    statusCounts[row.status] += 1;
  });

  const gradeCounts = countBy(mainlandPepHighRagV4Questions.map((question) => question.grade));
  const duplicateIdCount = duplicateOverflowCount(mainlandPepHighRagV4Questions.map((question) => question.id));
  const duplicateExactPromptCount = duplicateOverflowCount(mainlandPepHighRagV4Questions.map(exactPromptKey));
  const publicRagV4Questions = questions.filter((question) => Boolean(mainlandPepHighRagV4QuestionGenerationMetadata[question.id])).length;
  const inventoryIssues = ragV4PublicInventoryIssues(gradeCounts, duplicateIdCount, duplicateExactPromptCount, publicRagV4Questions);
  const publicMainlandPepHighQuestions = questions.filter((question) => Boolean(mainlandPepHighQuestionGenerationMetadata[question.id])).length;

  return {
    reportDate,
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions: mainlandPepHighRagV4Questions.length,
      expectedQuestions: 1500,
      publicIntegrated: publicRagV4Questions === 1500,
      publicRagV4Questions,
      publicMainlandPepHighQuestions,
      gradeCounts,
      passRows: rows.length - failingRows.length,
      failingRows: failingRows.length,
      duplicateIdCount,
      duplicateExactPromptCount,
      statusCounts,
      batchCounts: countBy(rows.map((row) => row.batch)),
      releaseRecommendation:
        failingRows.length || inventoryIssues.length
          ? "Red: rag-v4 public integration is blocked until failing rows or inventory issues are fixed and regenerated."
          : "Green: all rag-v4 public rows are deterministically solvable, answer-key matched, and present in the public Mainland PEP high-school bank."
    },
    rows,
    failingRows,
    inventoryIssues,
    assumptions: [
      "RAG-v4 is included in public mainlandPepHighQuestions after S18 approval and S04/S08 integration.",
      "Solvable means the answer is derivable from checked-in prompt and options without external sources.",
      "Answer-key match means the independent answer matches answer or acceptedAnswers under MAIS answer normalization.",
      "Multiple-choice rows must have four unique options with exactly one option matching the independent answer.",
      "Fill-in and short-answer explanations must visibly reach the stored answer.",
      "No live LLM provider, OCR provider, textbook corpus, or exam-paper source text is used by this audit."
    ]
  };
}

function escapeMarkdownCell(value: string | number) {
  return String(value).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

export function fullQuestionBankAuditMarkdown(report: FullQuestionBankAuditReport) {
  const summaryRows = [
    ["Total questions", report.summary.totalQuestions],
    ["HK questions", report.summary.hkQuestions],
    ["Mainland PEP primary questions", report.summary.mainlandPepPrimaryQuestions],
    ["Mainland PEP junior questions", report.summary.mainlandPepJuniorQuestions],
    ["Mainland PEP high questions", report.summary.mainlandPepHighQuestions],
    ["Mainland BNU primary approved questions", report.summary.mainlandBnuPrimaryQuestions],
    ["Mainland BNU junior approved questions", report.summary.mainlandBnuJuniorQuestions],
    ["Mainland BNU high approved questions", report.summary.mainlandBnuHighQuestions],
    ["Mainland HJB junior V2 questions", report.summary.mainlandHjbJuniorQuestions],
    ["Mainland HJB primary V1 questions", report.summary.mainlandHjbPrimaryQuestions],
    ["Mainland HJB high V2 default questions", report.summary.mainlandHjbHighQuestions],
    ["US California live questions", report.summary.unitedStatesCaliforniaQuestions],
    ["US North Carolina live questions", report.summary.unitedStatesNorthCarolinaQuestions],
    ["US Arkansas K-G12 live questions", report.summary.unitedStatesArkansasQuestions],
    ["US Florida G6-G8 live questions", report.summary.unitedStatesFloridaMiddleSchoolQuestions],
    ["Passing rows", report.summary.passRows],
    ["Failing rows", report.summary.failingRows],
    ["Release recommendation", report.summary.releaseRecommendation]
  ];
  const statusRows = Object.entries(report.summary.statusCounts);
  const batchRows = Object.entries(report.summary.batchCounts);
  const rowsForTable = report.failingRows.length ? report.failingRows : report.rows.slice(0, 20);

  const table = (headers: string[], rows: Array<Array<string | number>>) => [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`)
  ].join("\n");

  return [
    "# S18 Full Question Bank Solvability And Answer-Key Audit",
    "",
    `- Date: ${report.reportDate}`,
    "- Session ID: S18",
    `- Scope: 285 HK questions plus 1200 Mainland PEP primary questions plus 1200 Mainland PEP junior questions plus 4800 Mainland PEP high-school questions plus 1500 Mainland BNU primary V1 questions plus 1500 Mainland HJB primary V1 questions plus 1500 Mainland HJB high-school V2 default questions plus ${expectedUnitedStatesArkansasK5QuestionCount} US Arkansas K-G5 questions plus ${expectedUnitedStatesArkansasG6G12QuestionCount} US Arkansas G6-G12 questions plus 75 US Florida G6-G8 live questions`,
    "- Output type: Deterministic content QA report; no live LLM or external math service",
    "",
    "## Executive Summary",
    "",
    table(["Metric", "Value"], summaryRows),
    "",
    "## Status Counts",
    "",
    table(["Status", "Count"], statusRows),
    "",
    "## Batch Counts",
    "",
    table(["Batch", "Count"], batchRows),
    "",
    report.failingRows.length ? "## Failing Rows" : "## Sample Passing Rows",
    "",
    table(
      ["questionId", "track", "batch", "grade", "topicId", "type", "storedAnswer", "independentAnswer", "status", "severity", "notes"],
      rowsForTable.map((row) => [
        row.questionId,
        row.curriculumTrack,
        row.batch,
        row.grade,
        row.topicId,
        row.type,
        row.storedAnswer,
        row.independentAnswer,
        row.status,
        row.severity,
        row.notes.join("; ")
      ])
    ),
    "",
    "## Assumptions",
    "",
    ...report.assumptions.map((assumption) => `- ${assumption}`),
    ""
  ].join("\n");
}

function escapeCsvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function fullQuestionBankAuditCsv(report: FullQuestionBankAuditReport) {
  const headers = [
    "questionId",
    "curriculumTrack",
    "batch",
    "grade",
    "topicId",
    "type",
    "storedAnswer",
    "independentAnswer",
    "status",
    "severity",
    "notes"
  ];
  const rows = report.rows.map((row) => [
    row.questionId,
    row.curriculumTrack,
    row.batch,
    row.grade,
    row.topicId,
    row.type,
    row.storedAnswer,
    row.independentAnswer,
    row.status,
    row.severity,
    row.notes.join("; ")
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function mainlandPepFullQuestionBankQaMarkdown(report: MainlandPepFullQuestionBankQaReport) {
  const summaryRows = [
    ["Expected Mainland PEP questions", report.summary.expectedQuestions],
    ["Actual Mainland PEP questions", report.summary.totalQuestions],
    ["Primary questions", report.summary.primaryQuestions],
    ["Junior questions", report.summary.juniorQuestions],
    ["High-school questions", report.summary.highQuestions],
    ["Passing rows", report.summary.passRows],
    ["Rows requiring review", report.summary.reviewRows],
    ["P0 rows", report.summary.p0Rows],
    ["P1 rows", report.summary.p1Rows],
    ["P2 rows", report.summary.p2Rows],
    ["Duplicate IDs", report.summary.duplicateIdCount],
    ["Inventory issues", report.summary.inventoryIssueCount],
    ["Manual review queue rows", report.summary.manualReviewQueueRows],
    ["Release recommendation", report.summary.releaseRecommendation]
  ];
  const sourceStatusRows = Object.entries(report.summary.sourceStatusCounts);
  const solvabilityRows = Object.entries(report.summary.solvableStatusCounts);
  const answerMatchRows = Object.entries(report.summary.answerMatchStatusCounts);
  const batchRows = Object.entries(report.summary.batchCounts);
  const typeRows = Object.entries(report.summary.typeCounts);
  const inventoryRows = report.inventoryIssues.length ? report.inventoryIssues.map((issue) => [issue]) : [["None"]];
  const rowsForTable = report.reviewRows.length ? report.reviewRows : report.manualReviewQueueRows.slice(0, 30);

  const table = (headers: string[], rows: Array<Array<string | number>>) => [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`)
  ].join("\n");

  return [
    "# S18 Mainland PEP Full Question-Bank Solvability And Answer-Key QA",
    "",
    `- Date: ${report.reportDate}`,
    "- Session ID: S18",
    "- Scope: 1200 Mainland PEP primary questions, 1200 Mainland PEP junior questions, and 4800 Mainland PEP high-school questions",
    "- Output type: Row-level deterministic QA report; no live LLM, OCR, external textbook corpus, or exam-paper source text",
    "",
    "## Executive Summary",
    "",
    table(["Metric", "Value"], summaryRows),
    "",
    "## Source Status Counts",
    "",
    table(["Status", "Count"], sourceStatusRows),
    "",
    "## Solvability Counts",
    "",
    table(["Solvable status", "Count"], solvabilityRows),
    "",
    "## Answer Match Counts",
    "",
    table(["Answer match status", "Count"], answerMatchRows),
    "",
    "## Batch Counts",
    "",
    table(["Batch", "Count"], batchRows),
    "",
    "## Type Counts",
    "",
    table(["Type", "Count"], typeRows),
    "",
    "## Inventory Issues",
    "",
    table(["Issue"], inventoryRows),
    "",
    report.reviewRows.length ? "## Rows Requiring 100% Manual Review" : "## Pass-Sample Manual Review Queue",
    "",
    table(
      [
        "questionId",
        "grade",
        "batch",
        "type",
        "topic",
        "storedAnswer",
        "acceptedAnswers",
        "independentAnswer",
        "solvableStatus",
        "answerMatchStatus",
        "qaStatus",
        "severity",
        "notes",
        "recommendedAction"
      ],
      rowsForTable.map((row) => [
        row.questionId,
        row.grade,
        row.batch,
        row.type,
        row.topic.zhHans ?? row.topic.zh ?? row.topic.en,
        row.storedAnswer,
        row.acceptedAnswers.join("; "),
        row.independentAnswer,
        row.solvableStatus,
        row.answerMatchStatus,
        row.qaStatus,
        row.severity,
        row.notes.join("; "),
        row.recommendedAction
      ])
    ),
    "",
    "## Retest And Remaining Risk",
    "",
    "- Retest required after any source-data, answer-key, accepted-answer, option, explanation, or solver change: rerun `npm run type-check`, `npm run test:question-bank`, and `npm run qa:full-question-bank`.",
    "- Remaining risk after a green deterministic audit: passing rows still need S18 pass-sample review for age appropriateness, Simplified Chinese naturalness, topic fit, and explanation quality before external quality claims.",
    "",
    "## Assumptions",
    "",
    ...report.assumptions.map((assumption) => `- ${assumption}`),
    ""
  ].join("\n");
}

export function mainlandPepFullQuestionBankQaCsv(report: MainlandPepFullQuestionBankQaReport) {
  const headers = [
    "questionId",
    "grade",
    "batch",
    "type",
    "topic",
    "topicId",
    "storedAnswer",
    "acceptedAnswers",
    "independentAnswer",
    "solvableStatus",
    "answerMatchStatus",
    "qaStatus",
    "severity",
    "sourceStatus",
    "notes",
    "recommendedAction"
  ];
  const rows = report.rows.map((row) => [
    row.questionId,
    row.grade,
    row.batch,
    row.type,
    row.topic.zhHans ?? row.topic.zh ?? row.topic.en,
    row.topicId,
    row.storedAnswer,
    row.acceptedAnswers.join("; "),
    row.independentAnswer,
    row.solvableStatus,
    row.answerMatchStatus,
    row.qaStatus,
    row.severity,
    row.sourceStatus,
    row.notes.join("; "),
    row.recommendedAction
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function mainlandHighRagV4PublicSolvabilityAuditMarkdown(report: MainlandHighRagV4PublicSolvabilityAuditReport) {
  const summaryRows = [
    ["Public-integrated", String(report.summary.publicIntegrated)],
    ["Expected rag-v4 questions", report.summary.expectedQuestions],
    ["Actual rag-v4 questions", report.summary.totalQuestions],
    ["Public rag-v4 questions", report.summary.publicRagV4Questions],
    ["Public Mainland PEP high-school questions", report.summary.publicMainlandPepHighQuestions],
    ["S4 rag-v4 rows", report.summary.gradeCounts.S4 ?? 0],
    ["S5 rag-v4 rows", report.summary.gradeCounts.S5 ?? 0],
    ["S6 rag-v4 rows", report.summary.gradeCounts.S6 ?? 0],
    ["Duplicate IDs", report.summary.duplicateIdCount],
    ["Duplicate exact prompts", report.summary.duplicateExactPromptCount],
    ["Passing rows", report.summary.passRows],
    ["Failing rows", report.summary.failingRows],
    ["Release recommendation", report.summary.releaseRecommendation]
  ];
  const statusRows = Object.entries(report.summary.statusCounts);
  const batchRows = Object.entries(report.summary.batchCounts);
  const rowsForTable = report.failingRows.length ? report.failingRows : report.rows.slice(0, 30);
  const inventoryRows = report.inventoryIssues.length ? report.inventoryIssues.map((issue) => [issue]) : [["None"]];

  const table = (headers: string[], rows: Array<Array<string | number>>) => [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`)
  ].join("\n");

  return [
    "# S18 Mainland PEP High RAG-v4 Public Integration Solvability And Answer-Key Audit",
    "",
    `- Date: ${report.reportDate}`,
    "- Session ID: S18",
    "- Scope: 1500 public-integrated Mainland PEP high-school rag-v4 questions",
    "- Output type: Deterministic content QA report; no live LLM, OCR, textbook corpus, or exam-paper source text",
    "- Public rollout status: integrated after S18 approval; this audit verifies the promoted rag-v4 slice remains green",
    "",
    "## Executive Summary",
    "",
    table(["Metric", "Value"], summaryRows),
    "",
    "## Status Counts",
    "",
    table(["Status", "Count"], statusRows),
    "",
    "## Batch Counts",
    "",
    table(["Batch", "Count"], batchRows),
    "",
    "## Inventory Issues",
    "",
    table(["Issue"], inventoryRows),
    "",
    report.failingRows.length ? "## Failing Rows" : "## Sample Passing Rows",
    "",
    table(
      ["questionId", "track", "batch", "grade", "topicId", "type", "storedAnswer", "independentAnswer", "status", "severity", "notes"],
      rowsForTable.map((row) => [
        row.questionId,
        row.curriculumTrack,
        row.batch,
        row.grade,
        row.topicId,
        row.type,
        row.storedAnswer,
        row.independentAnswer,
        row.status,
        row.severity,
        row.notes.join("; ")
      ])
    ),
    "",
    "## Assumptions",
    "",
    ...report.assumptions.map((assumption) => `- ${assumption}`),
    ""
  ].join("\n");
}

export function mainlandHighRagV4PublicSolvabilityAuditCsv(report: MainlandHighRagV4PublicSolvabilityAuditReport) {
  const headers = [
    "questionId",
    "curriculumTrack",
    "batch",
    "grade",
    "topicId",
    "type",
    "storedAnswer",
    "independentAnswer",
    "status",
    "severity",
    "notes"
  ];
  const rows = report.rows.map((row) => [
    row.questionId,
    row.curriculumTrack,
    row.batch,
    row.grade,
    row.topicId,
    row.type,
    row.storedAnswer,
    row.independentAnswer,
    row.status,
    row.severity,
    row.notes.join("; ")
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function auditMarkdown(rows: Array<{
  id: string;
  grade: string;
  topicId: string;
  type: Question["type"];
  prompt: string;
  storedAnswer: string;
  independentAnswer: string;
  status: string;
  notes: string[];
}>, aliasCoverage: Record<AliasKind, number>) {
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
