import { questions as seedQuestions } from "@/data/questions";
import type { AttemptFeedback, LocalizedText } from "@/types";

type GradingQuestion = {
  answer: string;
  accepted_answers?: string[] | null;
  options?: LocalizedText[] | null;
};

export function normalizeAnswer(value: string) {
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

export function questionAnswerMatches(question: GradingQuestion, selectedAnswer: string) {
  const acceptedAnswers = [question.answer, ...(question.accepted_answers ?? [])];
  if (acceptedAnswers.some((answer) => answerMatches(selectedAnswer, answer))) return true;

  return (question.options ?? []).some((option) => {
    const localizedOptions = [option.en, option.zh, option.zhHans ?? ""].filter(Boolean);
    const selectedOption = localizedOptions.some((optionText) => answerMatches(selectedAnswer, optionText));
    const acceptedOption = acceptedAnswers.some((answer) =>
      localizedOptions.some((optionText) => answerMatches(answer, optionText))
    );
    return selectedOption && acceptedOption;
  });
}

export function gradeSeedQuestionAttempt(questionId: string, selectedAnswer: string): AttemptFeedback | null {
  const question = seedQuestions.find((candidate) => candidate.id === questionId);
  if (!question) return null;

  const correct = questionAnswerMatches(
    {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    },
    selectedAnswer
  );

  return {
    correct,
    explanation: question.explanation,
    correctAnswer: correct ? undefined : question.answer
  };
}
