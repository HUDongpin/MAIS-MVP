import { usMathLiveTopics } from "./usMathTopics";
import type { Difficulty, LocalizedText, Question, QuestionType, Topic } from "@/types";

const math = (expression: string) => `\\(${expression}\\)`;

function localized(en: string, zh = en): LocalizedText {
  return { en, zh, zhHans: zh };
}

function compactId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatNumericOption(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function fallbackDistractorFor(answer: string, offset: number) {
  const numericAnswer = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(answer);
  if (!numericAnswer) return `${answer} choice ${offset}`;
  return `${formatNumericOption(Number(numericAnswer[1]) + offset)}${numericAnswer[2]}`;
}

function optionsFor(answer: string, distractors: string[]) {
  const uniqueDistractors = Array.from(new Set(distractors.filter((value) => value !== answer)));
  let offset = 1;
  while (uniqueDistractors.length < 3) {
    const candidate = fallbackDistractorFor(answer, offset);
    if (candidate !== answer && !uniqueDistractors.includes(candidate)) uniqueDistractors.push(candidate);
    offset += 1;
  }
  return [...uniqueDistractors.slice(0, 3), answer].map((value) => localized(value));
}

function questionBase(topic: Topic, index: number, difficulty: Difficulty, type: QuestionType) {
  return {
    id: `us-live-${compactId(topic.id)}-${index + 1}`,
    curriculumTrack: topic.curriculumTrack,
    curriculumProfile: topic.curriculumProfile,
    region: topic.region,
    publisher: topic.publisher,
    canonicalTopicId: topic.canonicalTopicId,
    grade: topic.grade,
    topicId: topic.id,
    topic: topic.title,
    difficulty,
    type
  } satisfies Pick<
    Question,
    | "id"
    | "curriculumTrack"
    | "curriculumProfile"
    | "region"
    | "publisher"
    | "canonicalTopicId"
    | "grade"
    | "topicId"
    | "topic"
    | "difficulty"
    | "type"
  >;
}

function arithmeticQuestions(topic: Topic, seed: number): Question[] {
  const first = 8 + seed;
  const second = 5 + (seed % 4);
  const sum = first + second;
  const product = (2 + (seed % 5)) * 6;

  return [
    {
      ...questionBase(topic, 0, "Low", "multiple-choice"),
      prompt: localized(`${topic.title.en}: What is ${math(`${first} + ${second}`)}?`),
      options: optionsFor(String(sum), [String(sum - 1), String(sum + 2), String(sum + 4)]),
      answer: String(sum),
      acceptedAnswers: [String(sum)],
      explanation: localized(`Add the parts: ${math(`${first} + ${second} = ${sum}`)}.`)
    },
    {
      ...questionBase(topic, 1, "Medium", "fill-in"),
      prompt: localized(`${topic.title.en}: A class arranges ${2 + (seed % 5)} equal rows with 6 counters in each row. How many counters are there?`),
      answer: String(product),
      acceptedAnswers: [String(product)],
      explanation: localized(`Equal rows can be modeled by multiplication: ${math(`${2 + (seed % 5)} \\times 6 = ${product}`)}.`)
    }
  ];
}

function fractionRatioQuestions(topic: Topic, seed: number): Question[] {
  const numerator = 2 + (seed % 3);
  const denominator = numerator * 3;
  const simplified = "1/3";
  const percent = 25 + (seed % 3) * 5;
  const fractionOf = percent === 25 ? 80 : percent === 30 ? 90 : 100;
  const result = Math.round((percent / 100) * fractionOf);

  return [
    {
      ...questionBase(topic, 0, "Low", "multiple-choice"),
      prompt: localized(`${topic.title.en}: Which fraction is equivalent to ${math(`${numerator}/${denominator}`)}?`),
      options: optionsFor(simplified, ["1/2", "2/3", "3/4"]),
      answer: simplified,
      acceptedAnswers: [simplified],
      explanation: localized(`Divide the numerator and denominator by ${numerator}: ${math(`${numerator}/${denominator} = 1/3`)}.`)
    },
    {
      ...questionBase(topic, 1, "Medium", "fill-in"),
      prompt: localized(`${topic.title.en}: What is ${percent}% of ${fractionOf}?`),
      answer: String(result),
      acceptedAnswers: [String(result)],
      explanation: localized(`${percent}% means ${math(`${percent}/100`)}, so the value is ${result}.`)
    }
  ];
}

function algebraQuestions(topic: Topic, seed: number): Question[] {
  const solution = 3 + (seed % 5);
  const constant = 4 + (seed % 4);
  const right = 2 * solution + constant;
  const slope = 2 + (seed % 3);
  const input = 4;
  const output = slope * input - 1;

  return [
    {
      ...questionBase(topic, 0, "Medium", "fill-in"),
      prompt: localized(`${topic.title.en}: Solve ${math(`2x + ${constant} = ${right}`)}.`),
      answer: String(solution),
      acceptedAnswers: [String(solution), `x=${solution}`, `x = ${solution}`],
      explanation: localized(`Subtract ${constant}, then divide by 2: ${math(`x = ${solution}`)}.`)
    },
    {
      ...questionBase(topic, 1, "High", "multiple-choice"),
      prompt: localized(`${topic.title.en}: If ${math(`f(x) = ${slope}x - 1`)}, what is ${math("f(4)")} ?`),
      options: optionsFor(String(output), [String(output - 2), String(output + 1), String(output + 3)]),
      answer: String(output),
      acceptedAnswers: [String(output)],
      explanation: localized(`Substitute ${math("x = 4")}: ${math(`${slope}\\times4 - 1 = ${output}`)}.`)
    }
  ];
}

function geometryQuestions(topic: Topic, seed: number): Question[] {
  const length = 5 + (seed % 5);
  const width = 3 + (seed % 4);
  const area = length * width;
  const perimeter = 2 * (length + width);

  return [
    {
      ...questionBase(topic, 0, "Medium", "fill-in"),
      prompt: localized(`${topic.title.en}: A rectangle is ${length} cm by ${width} cm. What is its area in square centimeters?`),
      answer: `${area} cm^2`,
      acceptedAnswers: [String(area), `${area}cm^2`, `${area} square centimeters`],
      explanation: localized(`Area is length times width: ${math(`${length}\\times${width} = ${area}`)} square centimeters.`)
    },
    {
      ...questionBase(topic, 1, "High", "multiple-choice"),
      prompt: localized(`${topic.title.en}: The same rectangle is ${length} cm by ${width} cm. What is its perimeter?`),
      options: optionsFor(`${perimeter} cm`, [`${area} cm`, `${perimeter - 2} cm`, `${perimeter + 4} cm`]),
      answer: `${perimeter} cm`,
      acceptedAnswers: [String(perimeter), `${perimeter}cm`, `${perimeter} cm`],
      explanation: localized(`Perimeter adds all sides: ${math(`2(${length}+${width}) = ${perimeter}`)} cm.`)
    }
  ];
}

function dataProbabilityQuestions(topic: Topic, seed: number): Question[] {
  const a = 10 + seed;
  const b = 12 + seed;
  const c = 14 + seed;
  const mean = (a + b + c) / 3;

  return [
    {
      ...questionBase(topic, 0, "Medium", "multiple-choice"),
      prompt: localized(`${topic.title.en}: Find the mean of ${a}, ${b}, and ${c}.`),
      options: optionsFor(String(mean), [String(mean - 2), String(mean + 2), String(mean + 4)]),
      answer: String(mean),
      acceptedAnswers: [String(mean)],
      explanation: localized(`The sum is ${a + b + c}. Divide by 3 to get ${mean}.`)
    },
    {
      ...questionBase(topic, 1, "High", "fill-in"),
      prompt: localized(`${topic.title.en}: A fair six-sided die is rolled once. What is the probability of an even number?`),
      answer: "1/2",
      acceptedAnswers: ["1/2", "0.5", "50%"],
      explanation: localized(`The even outcomes are 2, 4, and 6, so ${math("3/6 = 1/2")}.`)
    }
  ];
}

function coordinateQuestions(topic: Topic, seed: number): Question[] {
  const y2 = 6 + seed;
  const slope = (y2 - 2) / 2;

  return [
    {
      ...questionBase(topic, 0, "Medium", "multiple-choice"),
      prompt: localized(`${topic.title.en}: Point A is at ${math("(2, -3)")}. Which quadrant is it in?`),
      options: [localized("I"), localized("II"), localized("III"), localized("IV")],
      answer: "IV",
      acceptedAnswers: ["IV", "4", "Quadrant IV"],
      explanation: localized("Positive x and negative y place the point in Quadrant IV.")
    },
    {
      ...questionBase(topic, 1, "High", "fill-in"),
      prompt: localized(`${topic.title.en}: Find the slope through ${math("(1, 2)")} and ${math(`(3, ${y2})`)}.`),
      answer: String(slope),
      acceptedAnswers: [String(slope)],
      explanation: localized(`Slope is ${math(`(${y2}-2)/(3-1) = ${slope}`)}.`)
    }
  ];
}

function advancedQuestions(topic: Topic, seed: number): Question[] {
  const coefficient = 2 + (seed % 4);

  return [
    {
      ...questionBase(topic, 0, "High", "fill-in"),
      prompt: localized(`${topic.title.en}: Differentiate ${math(`${coefficient}x^2`)} with respect to ${math("x")}.`),
      answer: `${coefficient * 2}x`,
      acceptedAnswers: [`${coefficient * 2} x`, `${coefficient * 2}*x`],
      explanation: localized(`Use the power rule: ${math(`d(${coefficient}x^2)/dx = ${coefficient * 2}x`)}.`)
    },
    {
      ...questionBase(topic, 1, "High", "short-answer"),
      prompt: localized(`${topic.title.en}: A model doubles every hour. If it starts at 5, what is the value after 3 hours?`),
      answer: "40",
      acceptedAnswers: ["40"],
      explanation: localized(`Doubling 3 times gives ${math("5\\times2^3 = 40")}.`)
    }
  ];
}

function questionsForTopic(topic: Topic, index: number): Question[] {
  const key = `${topic.id} ${topic.canonicalTopicId ?? ""} ${topic.title.en}`.toLowerCase();
  const seed = (index % 9) + 1;

  if (/coordinate|slope|graph|function|linear|algebra|equation|polynomial|quadratic/.test(key)) {
    return /coordinate|slope|graph/.test(key) ? coordinateQuestions(topic, seed) : algebraQuestions(topic, seed);
  }

  if (/fraction|decimal|percent|ratio|rate|proportion|speed/.test(key)) return fractionRatioQuestions(topic, seed);
  if (/geometry|shape|angle|area|perimeter|volume|circle|trig/.test(key)) return geometryQuestions(topic, seed);
  if (/data|stat|probability|average|mean|inference/.test(key)) return dataProbabilityQuestions(topic, seed);
  if (/calculus|advanced|modeling/.test(key)) return advancedQuestions(topic, seed);

  return arithmeticQuestions(topic, seed);
}

export const usMathLiveQuestions: Question[] = usMathLiveTopics.flatMap(questionsForTopic);
