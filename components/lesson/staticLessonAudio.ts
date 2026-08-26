import type { LessonBlock, LessonDetail, TextbookPublisher } from "@/types";

const staticLessonAudioPathPrefix = "/audio/lessons/us-ca-math";
const staticLessonAudioBlockTypes = new Set<LessonBlock["type"]>(["concept"]);

// These source assets remain preserved for review, but the lesson package is
// candidate-only. Block the exact former slugs at the runtime adapter so an
// accidental seed import cannot make their audio live again.
export const heldCandidateStaticLessonAudioSlugs = new Set<string>([
  "us-ca-math-p1-1-h1-picture-join-stories-to-10",
  "us-ca-math-p1-1-h2-picture-story-addition-equations",
  "us-ca-math-p1-1-h3-cube-train-join-models-to-10",
  "us-ca-math-p1-1-h4-join-stories-within-10",
  "us-ca-math-p1-1-h5-model-equation-join-stories-to-10",
  "us-ca-math-p1-1-h6-equation-match-join-stories-to-10",
  "us-ca-math-p1-1-l1-picture-take-away-stories-to-10",
  "us-ca-math-p1-1-l2-picture-story-subtraction-equations",
  "us-ca-math-p1-1-l3-cube-train-take-away-models-to-10",
  "us-ca-math-p1-1-l4-take-away-stories-within-10",
  "us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10",
  "us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10"
]);

function safeStaticAudioSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}
export function lessonUsesStaticAudioOnly(lesson: Pick<LessonDetail, "curriculumProfile" | "publisher"> | null | undefined) {
  const publisher = lesson?.publisher ?? lesson?.curriculumProfile?.publisher;
  return publisher === ("US_CA_MATH" satisfies TextbookPublisher);
}

export function staticLessonAudioUrlForBlock(
  lesson: Pick<LessonDetail, "curriculumProfile" | "publisher" | "slug">,
  block: Pick<LessonBlock, "id" | "type">
) {
  if (!lessonUsesStaticAudioOnly(lesson) || !staticLessonAudioBlockTypes.has(block.type)) return null;
  if (heldCandidateStaticLessonAudioSlugs.has(lesson.slug)) return null;

  return [
    staticLessonAudioPathPrefix,
    safeStaticAudioSegment(lesson.slug),
    `${safeStaticAudioSegment(block.id)}.mp3`
  ].join("/");
}
