import { questions as seedQuestions } from "@/data/questions";
import { answerMatches, normalizeAnswer, parseScalarAnswer, questionAnswerMatches } from "@/lib/server/answerMatching";
import type { AttemptFeedback } from "@/types";

export { answerMatches, normalizeAnswer, parseScalarAnswer, questionAnswerMatches };

type GradeableQuestion = {
  id: string;
  answer: string;
  acceptedAnswers?: string[] | null;
  options?: Parameters<typeof questionAnswerMatches>[0]["options"];
  explanation: AttemptFeedback["explanation"];
};

export function gradeQuestionAttempt(question: GradeableQuestion, selectedAnswer: string): AttemptFeedback {
  const correct = questionAnswerMatches(
    {
      id: question.id,
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

export function gradeSeedQuestionAttempt(questionId: string, selectedAnswer: string): AttemptFeedback | null {
  const question = seedQuestions.find((candidate) => candidate.id === questionId);
  if (!question) return null;

  return gradeQuestionAttempt(question, selectedAnswer);
}
