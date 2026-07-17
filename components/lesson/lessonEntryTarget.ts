import { topics } from "@/data/topics";
import { productionLessonByTopicId } from "@/data/lessons";
import { contentMatchesCurriculumProfile, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import { lessonHrefForTopicId, lessonSlugForTopicId } from "@/lib/lessonLinks";
import type { CurriculumProfile, GradeId, LessonEntryTarget } from "@/types";

export function publicLessonEntryTargetForGrade(
  grade: GradeId,
  curriculumProfile: CurriculumProfile | null | undefined
): LessonEntryTarget | null {
  const profile = normalizeCurriculumProfile(curriculumProfile);
  const topic = topics.find((candidate) =>
    productionLessonByTopicId.has(candidate.id) &&
    candidate.grade === grade &&
    contentMatchesCurriculumProfile(
      {
        curriculumTrack: candidate.curriculumTrack,
        region: candidate.region,
        publisher: candidate.publisher ?? candidate.curriculumProfile?.publisher
      },
      profile
    )
  );

  if (!topic) return null;

  return {
    href: lessonHrefForTopicId(topic.id),
    slug: lessonSlugForTopicId(topic.id),
    grade: topic.grade,
    topicId: topic.id
  };
}
