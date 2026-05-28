import { topics } from "@/data/topics";
import { lessonHrefForTopicId } from "@/lib/lessonLinks";
import type { GradeId } from "@/types";

export function guestRecommendedLessonHrefForGrade(grade: GradeId) {
  const gradeTopics = topics.filter((topic) => topic.curriculumTrack === "HK" && topic.grade === grade);
  const recommendedTopic = gradeTopics.find((topic) => topic.status === "in-progress") ?? gradeTopics[0] ?? null;

  return recommendedTopic ? lessonHrefForTopicId(recommendedTopic.id) : "/lesson";
}
