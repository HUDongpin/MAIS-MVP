import type {
  PracticeMissionPreviewQuestion,
  PracticeMissionSetupTopicOption
} from "@/components/practice/PracticeMissionSetupControls";
import type { Question } from "@/types";

/**
 * The parked "Mission Setup" teaser on the marketing pages (e.g. /about) only ever
 * renders 5 preview cards for the current filter selection and shows at most the first
 * two options per card. Shipping the full question bank (~24.5k questions / ~16MB of
 * RSC JSON) to the browser just to power that teaser was the dominant cost of the
 * ~1.7MB `/about` payload. This builds a small, grade-stratified sample instead so the
 * dropdowns and preview stay representative while the payload drops by ~95x.
 */
export const PREVIEW_TOPICS_PER_GRADE = 6;
export const PREVIEW_QUESTIONS_PER_TOPIC = 5;
export const PREVIEW_OPTIONS_PER_QUESTION = 2;

export type PracticeMissionPreviewSample = {
  previewItems: PracticeMissionPreviewQuestion[];
  topicOptions: PracticeMissionSetupTopicOption[];
};

export function buildPracticeMissionPreviewSample(
  questions: readonly Question[],
  {
    topicsPerGrade = PREVIEW_TOPICS_PER_GRADE,
    questionsPerTopic = PREVIEW_QUESTIONS_PER_TOPIC,
    optionsPerQuestion = PREVIEW_OPTIONS_PER_QUESTION
  }: {
    topicsPerGrade?: number;
    questionsPerTopic?: number;
    optionsPerQuestion?: number;
  } = {}
): PracticeMissionPreviewSample {
  // Pass 1: record, per grade, the topics in first-appearance order, and the first
  // question seen for each topic (drives the topic dropdown label + grade).
  const topicOrderByGrade = new Map<string, string[]>();
  const gradeSeenTopics = new Map<string, Set<string>>();
  const topicFirstQuestion = new Map<string, Question>();
  for (const question of questions) {
    if (!topicFirstQuestion.has(question.topicId)) {
      topicFirstQuestion.set(question.topicId, question);
    }
    let order = topicOrderByGrade.get(question.grade);
    if (!order) {
      order = [];
      topicOrderByGrade.set(question.grade, order);
    }
    let seen = gradeSeenTopics.get(question.grade);
    if (!seen) {
      seen = new Set<string>();
      gradeSeenTopics.set(question.grade, seen);
    }
    if (!seen.has(question.topicId)) {
      seen.add(question.topicId);
      order.push(question.topicId);
    }
  }

  // Select a bounded, grade-stratified set of topics so every grade is represented.
  const selectedTopicIds = new Set<string>();
  for (const order of topicOrderByGrade.values()) {
    for (const topicId of order.slice(0, topicsPerGrade)) {
      selectedTopicIds.add(topicId);
    }
  }

  // Pass 2: walk the questions in original order and keep the first N per selected
  // topic. Original order preserves the "first 5 of grade G" default preview view.
  const perTopicCount = new Map<string, number>();
  const previewItems: PracticeMissionPreviewQuestion[] = [];
  for (const question of questions) {
    if (!selectedTopicIds.has(question.topicId)) continue;
    const count = perTopicCount.get(question.topicId) ?? 0;
    if (count >= questionsPerTopic) continue;
    perTopicCount.set(question.topicId, count + 1);
    previewItems.push({
      id: question.id,
      difficulty: question.difficulty,
      grade: question.grade,
      options: question.options?.slice(0, optionsPerQuestion),
      prompt: question.prompt,
      topic: question.topic,
      topicId: question.topicId,
      type: question.type
    });
  }

  const topicOptions: PracticeMissionSetupTopicOption[] = [];
  for (const topicId of selectedTopicIds) {
    const question = topicFirstQuestion.get(topicId);
    if (!question) continue;
    topicOptions.push({ topicId, grade: question.grade, topic: question.topic });
  }

  return { previewItems, topicOptions };
}
