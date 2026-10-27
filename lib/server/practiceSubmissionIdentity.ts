/** A request identity is generated once per intended practice check, not per retry. */
export function validPracticeSubmissionId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function practiceSubmissionAttemptId(userId: string, submissionId?: string) {
  if (submissionId === undefined) return undefined;
  if (!validPracticeSubmissionId(submissionId)) throw new Error("Invalid practice submission identity.");
  // Existing TEXT primary keys provide durable deduplication without new schema.
  return `practice:${userId}:${submissionId.toLowerCase()}`;
}

export class PracticeSubmissionConflictError extends Error {
  readonly code = "practice-submission-conflict";
  constructor() { super("This practice submission identity already belongs to different work."); }
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, canonicalJson(record[key])]));
  }
  return value;
}

export function assertMatchingPracticeSubmission(
  existing: {
    user_id: string; question_id: string; selected_answer: string;
    duration_seconds: number | null; answer_work_photos?: unknown;
  },
  input: {
    userId: string; questionId: string; selectedAnswer: string;
    durationSeconds?: number | null; answerWorkPhotos?: readonly unknown[];
  },
  duration: number | null = typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds) && input.durationSeconds > 0
    ? Math.round(input.durationSeconds) : null
) {
  const photos = input.answerWorkPhotos?.length ? input.answerWorkPhotos : null;
  if (existing.user_id !== input.userId || existing.question_id !== input.questionId ||
      existing.selected_answer !== input.selectedAnswer || existing.duration_seconds !== duration ||
      JSON.stringify(canonicalJson(existing.answer_work_photos ?? null)) !== JSON.stringify(canonicalJson(photos))) {
    throw new PracticeSubmissionConflictError();
  }
}
