import { usCaliforniaLessonCoverageByTopicId } from "@/data/usCaliforniaLessons";
import type { UnitedStatesMathTrack } from "@/types";

/**
 * The exact state-standard signal a U.S. lesson topic maps to. Used to sharpen the
 * AI tutor's RAG retrieval from a generic grade dump to the specific CCSS/state
 * standard the student is actually working on.
 */
export type UnitedStatesMathTopicStandards = {
  standardIds: string[];
  domainTags: string[];
  conceptIds: string[];
};

/**
 * Resolve the state standards, domains, and concepts for the topic a U.S. student is on.
 *
 * The tutor already sends the lesson `topicId`; this maps it to the precise standard set
 * (weighted highest in the U.S. math RAG scorer) without any client-side plumbing. Returns
 * `undefined` when the track/topic has no curated coverage, in which case retrieval falls
 * back to grade + concept matching.
 *
 * Currently backed by the California lesson coverage map (the phase-1 pilot state). Other
 * live U.S. tracks degrade gracefully until their topic→standard coverage is wired here.
 */
export function resolveUnitedStatesMathTopicStandards(
  curriculumTrack: UnitedStatesMathTrack | undefined,
  topicId: string | undefined
): UnitedStatesMathTopicStandards | undefined {
  if (!topicId) return undefined;

  if (curriculumTrack === "US_CA_MATH") {
    const record = usCaliforniaLessonCoverageByTopicId.get(topicId);
    if (!record || (!record.standardIds.length && !record.domainTags.length)) return undefined;
    return {
      standardIds: record.standardIds,
      domainTags: record.domainTags,
      conceptIds: record.conceptIds
    };
  }

  return undefined;
}
