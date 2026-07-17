import { questions as seedQuestions } from "@/data/questions";
import { answerMatches, normalizeAnswer, parseScalarAnswer, questionAnswerMatches } from "@/lib/server/answerMatching";
import type { AttemptFeedback } from "@/types";

export { answerMatches, normalizeAnswer, parseScalarAnswer, questionAnswerMatches };

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
