import { formatGradeLabelForCurriculum, textForLanguage } from "./i18n";
import type { Language, Topic } from "../types";

type TopicPlacement = Pick<Topic, "id" | "curriculumTrack" | "grade" | "courseId" | "courseLabel">;

export type TopicCourseMetadataIssue = {
  topicId: string;
  reason: "missing-course-id" | "missing-course-label" | "blank-course-id" | "blank-course-label";
};

/** Keep the persisted grade for filtering; use a verified course label for a topic when supplied. */
export function formatTopicPlacementLabel(topic: TopicPlacement, language: Language, compact = false): string {
  const courseLabel = topic.courseLabel && textForLanguage(topic.courseLabel, language).trim();
  if (topic.courseId?.trim() && courseLabel) return courseLabel;
  return formatGradeLabelForCurriculum(topic.grade, language, topic.curriculumTrack, compact);
}

/** A partial course reference must not enter topic data unnoticed. */
export function auditTopicCourseMetadata(topics: readonly TopicPlacement[]): TopicCourseMetadataIssue[] {
  const issues: TopicCourseMetadataIssue[] = [];
  for (const topic of topics) {
    if (topic.courseId === undefined && topic.courseLabel === undefined) continue;
    if (topic.courseId === undefined) {
      issues.push({ topicId: topic.id, reason: "missing-course-id" });
    } else if (!topic.courseId.trim()) {
      issues.push({ topicId: topic.id, reason: "blank-course-id" });
    }
    if (topic.courseLabel === undefined) {
      issues.push({ topicId: topic.id, reason: "missing-course-label" });
    } else if ([topic.courseLabel.en, topic.courseLabel.zh, topic.courseLabel.zhHans ?? topic.courseLabel.zh].some((label) => !label.trim())) {
      issues.push({ topicId: topic.id, reason: "blank-course-label" });
    }
  }
  return issues;
}
