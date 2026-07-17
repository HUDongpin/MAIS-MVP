import { isValidGradeId } from "../data/grades";
import type {
  GradeId,
  LearningAnalyticsEvent,
  LearningAnalyticsEventSource,
  LearningAnalyticsEventType,
  LearningAnalyticsExportSummary,
  LearningAnalyticsInput,
  LearningAnalyticsSummary
} from "@/types";

export const analyticsWindowDays = 7;
export const maxStoredLearningAnalyticsEvents = 500;
export const learningAnalyticsUpdatedEventName = "hk-math-learning-analytics-updated";
export const throttledLearningAnalyticsFlushMs = 1000;

const dayMs = 24 * 60 * 60 * 1000;
const eventTypes = new Set<LearningAnalyticsEventType>([
  "mouse-click",
  "keyboard",
  "answer-correct",
  "answer-wrong",
  "hint-request",
  "visualization-slider",
  "visualization-drag",
  "visualization-probe",
  "visualization-simulate",
  "visualization-reset",
  "visualization-complete",
  "page-view",
  "mistake-review"
]);
const eventSources = new Set<LearningAnalyticsEventSource>([
  "adaptive-learning",
  "dashboard",
  "practice",
  "progress",
  "lesson",
  "ai-tutor",
  "mistake-book",
  "visualization-lab",
  "function-graph",
  "function-model",
  "geometry",
  "probability",
  "coordinate-plane",
  "trig-wave",
  "calculus-stats",
  "learning-path",
  "navigation"
]);
const highFrequencyLearningAnalyticsEventTypes = new Set<LearningAnalyticsEventType>([
  "visualization-slider",
  "visualization-drag",
  "visualization-probe"
]);

function toTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function countEvents(events: LearningAnalyticsEvent[], type: LearningAnalyticsEventType) {
  return events.filter((event) => event.type === type).length;
}

export function sanitizeAnalyticsId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "guest";
}

export function createLearningAnalyticsEvent(
  input: LearningAnalyticsInput,
  grade: GradeId,
  now: Date = new Date()
): LearningAnalyticsEvent {
  const timestamp = now.toISOString();
  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 10)}`,
    type: input.type,
    source: input.source,
    timestamp,
    grade,
    topicId: input.topicId,
    questionId: input.questionId,
    classId: input.classId,
    assignmentId: input.assignmentId,
    competencyId: input.competencyId,
    durationSeconds:
      typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds) && input.durationSeconds > 0
        ? Math.round(input.durationSeconds)
        : undefined
  };
}

export function isHighFrequencyLearningAnalyticsEvent(
  event: Pick<LearningAnalyticsEvent | LearningAnalyticsInput, "type">
) {
  return highFrequencyLearningAnalyticsEventTypes.has(event.type);
}

function coalescedLearningAnalyticsEventKey(event: LearningAnalyticsEvent) {
  return [
    event.type,
    event.source,
    event.grade,
    event.topicId,
    event.questionId ?? "",
    event.classId ?? "",
    event.assignmentId ?? "",
    event.competencyId ?? ""
  ].join("\u001f");
}

export function coalesceLearningAnalyticsEvents(events: LearningAnalyticsEvent[]) {
  const coalesced: LearningAnalyticsEvent[] = [];
  const highFrequencyIndexes = new Map<string, number>();

  events.forEach((event) => {
    if (!isHighFrequencyLearningAnalyticsEvent(event)) {
      coalesced.push(event);
      return;
    }

    const key = coalescedLearningAnalyticsEventKey(event);
    const existingIndex = highFrequencyIndexes.get(key);
    if (typeof existingIndex === "number") {
      coalesced[existingIndex] = event;
      return;
    }

    highFrequencyIndexes.set(key, coalesced.length);
    coalesced.push(event);
  });

  return coalesced;
}

function isOptionalCompactAnalyticsId(value: unknown) {
  return typeof value === "undefined" || (typeof value === "string" && value.trim().length > 0 && value.length <= 160);
}

export function isValidLearningAnalyticsEvent(value: unknown): value is LearningAnalyticsEvent {
  const record = value as Partial<LearningAnalyticsEvent> | null;
  const durationIsValid =
    typeof record?.durationSeconds === "undefined" ||
    (typeof record.durationSeconds === "number" && Number.isFinite(record.durationSeconds) && record.durationSeconds > 0);

  return (
    typeof record?.id === "string" &&
    typeof record?.type === "string" &&
    eventTypes.has(record.type as LearningAnalyticsEventType) &&
    typeof record?.source === "string" &&
    eventSources.has(record.source as LearningAnalyticsEventSource) &&
    typeof record?.timestamp === "string" &&
    Number.isFinite(new Date(record.timestamp).getTime()) &&
    isValidGradeId(record?.grade) &&
    typeof record?.topicId === "string" &&
    (typeof record?.questionId === "undefined" || typeof record.questionId === "string") &&
    isOptionalCompactAnalyticsId(record?.classId) &&
    isOptionalCompactAnalyticsId(record?.assignmentId) &&
    isOptionalCompactAnalyticsId(record?.competencyId) &&
    durationIsValid
  );
}

export function isValidLearningAnalyticsEventLog(value: unknown): value is LearningAnalyticsEvent[] {
  return Array.isArray(value) && value.every(isValidLearningAnalyticsEvent);
}

export function getRollingLearningAnalyticsEvents(
  events: LearningAnalyticsEvent[],
  options: { now?: Date | string; windowDays?: number } = {}
) {
  const nowMs = toTime(options.now ?? new Date());
  const windowDays = options.windowDays ?? analyticsWindowDays;
  const earliestMs = nowMs - windowDays * dayMs;

  return events
    .filter((event) => {
      const eventMs = toTime(event.timestamp);
      return eventMs >= earliestMs && eventMs <= nowMs;
    })
    .sort((a, b) => toTime(a.timestamp) - toTime(b.timestamp));
}

export function buildDailyLearningAnalyticsBuckets(
  events: LearningAnalyticsEvent[],
  options: { now?: Date | string; windowDays?: number } = {}
) {
  const now = new Date(options.now ?? new Date());
  const windowDays = options.windowDays ?? analyticsWindowDays;
  const buckets = Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(now);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (windowDays - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      events: 0,
      answers: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      durationSeconds: 0
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.date, bucket]));

  getRollingLearningAnalyticsEvents(events, { now, windowDays }).forEach((event) => {
    const date = event.timestamp.slice(0, 10);
    const bucket = bucketMap.get(date);
    if (!bucket) return;

    bucket.events += 1;
    if (event.type === "answer-correct" || event.type === "answer-wrong") {
      bucket.answers += 1;
      if (event.type === "answer-correct") bucket.correctAnswers += 1;
      if (event.type === "answer-wrong") bucket.wrongAnswers += 1;
      bucket.durationSeconds += event.durationSeconds ?? 0;
    }
  });

  return buckets;
}

export function summarizeLearningAnalytics(
  events: LearningAnalyticsEvent[],
  options: { now?: Date | string; windowDays?: number } = {}
): LearningAnalyticsSummary {
  const windowDays = options.windowDays ?? analyticsWindowDays;
  const rollingEvents = getRollingLearningAnalyticsEvents(events, { now: options.now, windowDays });
  const correctAnswers = countEvents(rollingEvents, "answer-correct");
  const wrongAnswers = countEvents(rollingEvents, "answer-wrong");
  const totalAnswers = correctAnswers + wrongAnswers;
  const answerDurations = rollingEvents
    .filter((event) => event.type === "answer-correct" || event.type === "answer-wrong")
    .map((event) => event.durationSeconds)
    .filter((duration): duration is number => typeof duration === "number");
  const visualizationEvents = rollingEvents.filter((event) => event.type.startsWith("visualization-")).length;
  const firstEventAt = rollingEvents[0]?.timestamp ?? null;
  const lastEventAt = rollingEvents[rollingEvents.length - 1]?.timestamp ?? null;
  const averageSeconds = answerDurations.length
    ? Math.round(answerDurations.reduce((total, duration) => total + duration, 0) / answerDurations.length)
    : null;

  return {
    windowDays,
    eventCount: rollingEvents.length,
    hasActivity: rollingEvents.length > 0,
    firstEventAt,
    lastEventAt,
    counts: {
      mouseClicks: countEvents(rollingEvents, "mouse-click"),
      keyboardEvents: countEvents(rollingEvents, "keyboard"),
      correctAnswers,
      wrongAnswers,
      hintRequests: countEvents(rollingEvents, "hint-request"),
      visualizationEvents,
      pageViews: countEvents(rollingEvents, "page-view"),
      mistakeReviews: countEvents(rollingEvents, "mistake-review")
    },
    answerStats: {
      total: totalAnswers,
      accuracy: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : null
    },
    duration: {
      averageSeconds,
      buckets: {
        fast: answerDurations.filter((duration) => duration < 60).length,
        steady: answerDurations.filter((duration) => duration >= 60 && duration <= 180).length,
        slow: answerDurations.filter((duration) => duration > 180).length
      }
    },
    engagementScore: rollingEvents.length
      ? Math.min(
          99,
          Math.round(
            48 +
              Math.min(26, (countEvents(rollingEvents, "mouse-click") + countEvents(rollingEvents, "keyboard")) / 3) +
              Math.min(25, (visualizationEvents + countEvents(rollingEvents, "hint-request") + totalAnswers) * 2)
          )
        )
      : null
  };
}

export function exportLearningAnalyticsSummary({
  events,
  studentId,
  grade,
  now = new Date(),
  windowDays = analyticsWindowDays
}: {
  events: LearningAnalyticsEvent[];
  studentId: string;
  grade: GradeId;
  now?: Date | string;
  windowDays?: number;
}): LearningAnalyticsExportSummary {
  const generatedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();

  return {
    generatedAt,
    studentId: sanitizeAnalyticsId(studentId),
    grade,
    summary: summarizeLearningAnalytics(events, { now, windowDays }),
    privacy: "Summary export excludes raw event timestamps, typed answers, coordinates, and individual selected answers."
  };
}
