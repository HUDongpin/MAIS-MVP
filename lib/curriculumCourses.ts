import { formatUnitedStatesGradeLabel, textForLanguage } from "./i18n";
import type { CurriculumTrack, GradeId, Language, LocalizedText, SecondaryOrganization, Topic } from "../types";

/**
 * The course seam.
 *
 * `Topic.grade` is a single required `GradeId`, and until this module there was
 * no way to say anything else about where a topic sits in a curriculum. That is
 * fine for a grade-organized track and wrong for every course-organized one:
 * Texas TEKS and Virginia SOL address secondary mathematics as Algebra I /
 * Geometry / Algebra II (and Algebra I is commonly taken in grade 8 OR 9), and
 * North Carolina's NC Math 1/2/3 is an integrated pathway with no
 * Algebra/Geometry split at all.
 *
 * This is not hypothetical debt. Arkansas already ships wrong: its own profile
 * in `data/rag/usMath.ts` records the standards as
 *   "2023 Arkansas Mathematics Standards for K-8, Algebra I, Geometry, and
 *    secondary mathematics courses"
 * and instructs the repo to "Preserve ... course-level Algebra/Geometry
 * organization", while its shipped topics are `us-ar-math-g09-chapter-01` …
 * `us-ar-math-g12-chapter-05` and render as "Grade 10" to a learner whose
 * school teaches Geometry in grade 9.
 *
 * `Topic.grade` is persisted in the topics, questions and lessons records, so
 * adding this seam after a state is live is a data migration rather than a
 * config change. It lands before any state is onboarded, deliberately.
 *
 * WHAT THIS MODULE DOES NOT DO: it does not invent course names. Assigning
 * "Algebra I" to `us-ar-math-g09-*` without a cited source would be exactly the
 * fabricated-metadata failure the state-adaptation plan exists to prevent.
 * Arkansas is declared `course`-organized because its own profile says so, its
 * secondary topics carry no `courseId` because nothing in the tree supplies
 * one, and `auditSecondaryCourseLabelling` counts that as a declared defect
 * held under a ratchet that can only fall.
 */

/**
 * Secondary organization per track. Exhaustive by construction: adding a member
 * to `CurriculumTrack` without adding it here is a compile error, which is the
 * point — a new state must state how its secondary mathematics is organized
 * before it can ship.
 */
export const secondaryOrganizationByTrack = {
  HK: "grade",
  MAINLAND_PEP_HIGH: "grade",
  US_CA_MATH: "grade",
  US_NC_MATH: "integrated",
  US_AR_MATH: "course",
  US_FL_MATH: "grade"
} as const satisfies Record<CurriculumTrack, SecondaryOrganization>;

export function secondaryOrganizationFor(track: CurriculumTrack): SecondaryOrganization {
  return secondaryOrganizationByTrack[track];
}

/**
 * Grades that count as "secondary" for this rule — the band where a
 * course-organized curriculum stops speaking in grade numbers. S1/S2 are US
 * grades 7/8, which every framework still addresses by grade; S3–S6 are grades
 * 9–12.
 */
const secondaryGrades: readonly GradeId[] = ["S3", "S4", "S5", "S6"];

export function isSecondaryGrade(grade: GradeId): boolean {
  return secondaryGrades.includes(grade);
}

/**
 * True when a topic is required to carry a `courseId`: its track addresses
 * secondary mathematics by course (or as an integrated pathway) and the topic
 * sits in the secondary band.
 */
export function requiresCourseId(track: CurriculumTrack, grade: GradeId): boolean {
  return secondaryOrganizationFor(track) !== "grade" && isSecondaryGrade(grade);
}

/**
 * The label a learner should actually see for a topic.
 *
 * A course-organized topic that carries a course shows the course; everything
 * else falls back to the grade label that shipped before this seam existed, so
 * every currently-correct surface is byte-identical.
 */
export function formatTopicGradeOrCourseLabel(
  topic: Pick<Topic, "curriculumTrack" | "grade" | "courseId" | "courseLabel">,
  language: Language,
  compact = false
): string {
  if (requiresCourseId(topic.curriculumTrack, topic.grade) && topic.courseLabel) {
    const label: LocalizedText = topic.courseLabel;
    return textForLanguage(label, language);
  }
  return formatUnitedStatesGradeLabel(topic.grade, language, compact);
}

export type SecondaryCourseLabellingViolation = {
  topicId: string;
  track: CurriculumTrack;
  grade: GradeId;
  reason: "missing-course-id" | "course-id-without-label";
};

/**
 * Gate: every secondary topic on a course-organized or integrated track must
 * carry a `courseId`, and a `courseId` must carry a renderable label.
 *
 * Returns violations rather than throwing so the caller can hold them under a
 * ratchet. See `secondaryCourseLabellingCeilings` for the recorded baseline.
 */
export function auditSecondaryCourseLabelling(topics: readonly Topic[]): SecondaryCourseLabellingViolation[] {
  const violations: SecondaryCourseLabellingViolation[] = [];
  for (const topic of topics) {
    if (!requiresCourseId(topic.curriculumTrack, topic.grade)) continue;
    if (!topic.courseId) {
      violations.push({ topicId: topic.id, track: topic.curriculumTrack, grade: topic.grade, reason: "missing-course-id" });
      continue;
    }
    if (!topic.courseLabel) {
      violations.push({ topicId: topic.id, track: topic.curriculumTrack, grade: topic.grade, reason: "course-id-without-label" });
    }
  }
  return violations;
}

/**
 * Recorded ceilings, per track, for topics that should carry a course and do
 * not. These are DECLARED DEBT, not an allowance: the number may fall and may
 * never rise. Arkansas's 20 secondary chapter topics are the whole of it.
 *
 * Closing Arkansas's 20 needs a cited Arkansas course map (which course each
 * `us-ar-math-g09..g12-chapter-NN` belongs to). Until someone transcribes that
 * from the Arkansas standards, inventing the mapping here would be worse than
 * recording the gap.
 */
export const secondaryCourseLabellingCeilings = {
  HK: 0,
  MAINLAND_PEP_HIGH: 0,
  US_CA_MATH: 0,
  US_NC_MATH: 0,
  US_AR_MATH: 20,
  US_FL_MATH: 0
} as const satisfies Record<CurriculumTrack, number>;

export function secondaryCourseLabellingViolationsByTrack(
  topics: readonly Topic[]
): Record<CurriculumTrack, number> {
  const counts = {
    HK: 0,
    MAINLAND_PEP_HIGH: 0,
    US_CA_MATH: 0,
    US_NC_MATH: 0,
    US_AR_MATH: 0,
    US_FL_MATH: 0
  } satisfies Record<CurriculumTrack, number>;
  for (const violation of auditSecondaryCourseLabelling(topics)) {
    counts[violation.track] += 1;
  }
  return counts;
}
