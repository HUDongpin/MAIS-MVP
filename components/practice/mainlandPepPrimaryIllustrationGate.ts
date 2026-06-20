import type { PublicQuestion } from "@/types";

const fullyBlockedMainlandPepPrimaryTopicIds = new Set([
  "pep-primary-p1-lower-within-100-add-sub",
  "pep-primary-p1-lower-money-data-review",
  "pep-primary-p1-upper-shapes-position-time",
  "pep-primary-p2-lower-division-remainder",
  "pep-primary-p2-lower-place-value-measurement-data",
  "pep-primary-p3-lower-statistics-review",
  "pep-primary-p3-upper-measurement-time-geometry",
  "pep-primary-p4-lower-decimals-average",
  "pep-primary-p4-lower-perimeter-area-lines",
  "pep-primary-p4-upper-large-numbers-multiplication",
  "pep-primary-p5-lower-factors-fractions",
  "pep-primary-p5-lower-volume-data",
  "pep-primary-p5-upper-polygon-area",
  "pep-primary-p6-lower-negative-review",
  "pep-primary-p6-lower-ratio-proportion-scale",
  "pep-primary-p6-upper-coordinate-data",
  "pep-primary-p6-upper-percent-fractions"
]);

const multiplicationArraysTopicId = "pep-primary-p2-upper-multiplication-arrays";
const areaDecimalsTopicId = "pep-primary-p3-lower-area-decimals";

export function shouldHideMainlandPepPrimaryPracticeIllustration(question: PublicQuestion) {
  if (!question.id.startsWith("pep-primary-")) return false;
  if (fullyBlockedMainlandPepPrimaryTopicIds.has(question.topicId)) return true;

  const numbers = extractQuestionNumbers(question);
  if (question.topicId === multiplicationArraysTopicId) return firstTwoNumbersWouldClamp(numbers, 2, 8, 2, 9);
  if (question.topicId === areaDecimalsTopicId) return firstTwoNumbersWouldClamp(numbers, 4, 12, 3, 8);

  return false;
}

function firstTwoNumbersWouldClamp(
  numbers: number[],
  firstMin: number,
  firstMax: number,
  secondMin: number,
  secondMax: number
) {
  const [first, second] = numbers;
  if (first === undefined || second === undefined) return true;

  return first < firstMin || first > firstMax || second < secondMin || second > secondMax;
}

function extractQuestionNumbers(question: PublicQuestion) {
  const prompt = question.prompt.zhHans ?? question.prompt.zh ?? question.prompt.en;
  const cleaned = prompt
    .replace(/第\s*\d+\s*小组[:：]?/g, "")
    .replace(/第\s*\d+\s*题[:：]?/g, "");

  return [...cleaned.matchAll(/-?\d+(?:\.\d+)?/g)]
    .map((match) => Number(match[0]))
    .filter((value) => Number.isFinite(value))
    .slice(0, 8);
}
