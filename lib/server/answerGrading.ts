import { questions as seedQuestions } from "@/data/questions";
import { localizedCorrectAnswerForFeedback } from "@/lib/server/answerFeedback";
import { answerMatches, normalizeAnswer, parseScalarAnswer, questionAnswerMatches } from "@/lib/server/answerMatching";
import type { AttemptFeedback } from "@/types";

export { answerMatches, normalizeAnswer, parseScalarAnswer, questionAnswerMatches };

export function gradeSeedQuestionAttempt(questionId: string, selectedAnswer: string): AttemptFeedback | null {
  const question = seedQuestions.find((candidate) => candidate.id === questionId);
  if (!question) return null;

  const correct = questionAnswerMatches(
    {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null,
      prompt: question.prompt
    },
    selectedAnswer
  );

  return {
    correct,
    explanation: question.explanation,
    correctAnswer: correct ? undefined : localizedCorrectAnswerForFeedback({
      type: question.type,
      answer: question.answer,
      acceptedAnswers: question.acceptedAnswers,
      options: question.options
    })
  };
}
