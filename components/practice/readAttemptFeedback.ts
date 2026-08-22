import type { AttemptFeedback, LocalizedText } from "@/types";

function readLocalizedText(value: unknown): LocalizedText | null {
  if (!value || typeof value !== "object") return null;
  const localized = value as Partial<LocalizedText>;
  if (
    typeof localized.en !== "string" ||
    typeof localized.zh !== "string" ||
    (typeof localized.zhHans !== "undefined" && typeof localized.zhHans !== "string")
  ) {
    return null;
  }

  return {
    en: localized.en,
    zh: localized.zh,
    ...(typeof localized.zhHans === "string" ? { zhHans: localized.zhHans } : {})
  };
}

export function readAttemptFeedback(value: unknown): AttemptFeedback | null {
  if (!value || typeof value !== "object") return null;
  const feedback = value as Partial<AttemptFeedback>;
  const explanation = readLocalizedText(feedback.explanation);
  const correctAnswer = typeof feedback.correctAnswer === "undefined"
    ? undefined
    : readLocalizedText(feedback.correctAnswer);

  if (typeof feedback.correct !== "boolean" || !explanation || correctAnswer === null) return null;

  return {
    correct: feedback.correct,
    explanation,
    ...(correctAnswer ? { correctAnswer } : {})
  };
}
