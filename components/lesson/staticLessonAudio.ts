import type { LessonBlock, LessonDetail, TextbookPublisher } from "@/types";

const staticLessonAudioPathPrefix = "/audio/lessons/us-ca-math";
const staticLessonAudioBlockTypes = new Set<LessonBlock["type"]>(["concept"]);

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

  return [
    staticLessonAudioPathPrefix,
    safeStaticAudioSegment(lesson.slug),
    `${safeStaticAudioSegment(block.id)}.mp3`
  ].join("/");
}
