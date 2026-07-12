import { validGradeSet } from "@/data/grades";
import { isActiveDifficulty } from "@/lib/difficulty";
import type { CurriculumTrack, Difficulty, GradeId } from "@/types";

const validCurriculumTracks = new Set<CurriculumTrack>([
  "HK",
  "MAINLAND_PEP_HIGH",
  "US_CA_MATH",
  "US_NC_MATH",
  "US_AR_MATH",
  "US_FL_MATH"
]);

export type QuestionFilter = {
  grade?: GradeId;
  difficulty?: Difficulty;
  topicId?: string;
  curriculumTrack?: CurriculumTrack;
};

export function isValidQuestionFilter(value: unknown): value is QuestionFilter {
  const filter = value as { grade?: unknown; difficulty?: unknown; topicId?: unknown; curriculumTrack?: unknown } | null;
  return (
    (!filter?.grade || validGradeSet.has(filter.grade as GradeId)) &&
    (!filter?.difficulty || isActiveDifficulty(filter.difficulty)) &&
    (!filter?.topicId || typeof filter.topicId === "string") &&
    (!filter?.curriculumTrack || validCurriculumTracks.has(filter.curriculumTrack as CurriculumTrack))
  );
}
