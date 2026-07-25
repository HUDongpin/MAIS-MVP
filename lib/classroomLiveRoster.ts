import type {
  ClassroomLiveAttentionReason,
  ClassroomLiveRoster,
  ClassroomLiveRosterCounts,
  ClassroomLiveRosterEntry,
  ClassroomLiveStudentState,
  LearningAnalyticsEvent
} from "@/types";

// A learning event tagged with the student who produced it. The teacher-side
// roster reads across many students, so the studentId travels with each event
// rather than being implied by the caller.
export type ClassroomLiveRosterEventInput = Pick<
  LearningAnalyticsEvent,
  "type" | "source" | "topicId" | "questionId" | "durationSeconds" | "timestamp"
> & { studentId: string };

export type ClassroomLiveRosterStudentInput = {
  studentId: string;
  studentName: string;
};

export type BuildClassroomLiveRosterInput = {
  classId: string;
  className: string;
  students: ClassroomLiveRosterStudentInput[];
  events: ClassroomLiveRosterEventInput[];
  now?: Date | string | number;
  windowMinutes?: number;
  idleSeconds?: number;
};

// Tuned for a 90-minute self-paced lesson: only the last 20 minutes of activity
// describe "right now", and a student silent for 3 minutes has stopped working.
export const defaultRosterWindowMinutes = 20;
export const defaultRosterIdleSeconds = 180;

// Stuck is a claim about the student, so keep the bar concrete: two wrong
// answers with no correct in between, or leaning on hints twice.
const stuckConsecutiveWrong = 2;
const stuckHintCount = 2;
// "Done" needs a real completion signal, not just momentum — a finished
// visualization, or a clean run of correct answers before they stopped.
const doneConsecutiveCorrect = 3;

// Sort order for "who needs me right now": the student the teacher should walk
// to first comes first.
const stateRank: Record<ClassroomLiveStudentState, number> = {
  stuck: 0,
  idle: 1,
  offline: 2,
  working: 3,
  done: 4
};

const answerEventTypes = new Set<LearningAnalyticsEvent["type"]>(["answer-correct", "answer-wrong"]);

function toMs(value: Date | string | number) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

function isAnswerEvent(event: ClassroomLiveRosterEventInput) {
  return answerEventTypes.has(event.type);
}

function trailingRun(
  answers: ClassroomLiveRosterEventInput[],
  matchType: LearningAnalyticsEvent["type"]
) {
  let run = 0;
  for (let index = answers.length - 1; index >= 0; index -= 1) {
    if (answers[index].type !== matchType) break;
    run += 1;
  }
  return run;
}

function deriveEntry(
  student: ClassroomLiveRosterStudentInput,
  allEvents: ClassroomLiveRosterEventInput[],
  nowMs: number,
  windowStartMs: number,
  idleSeconds: number
): ClassroomLiveRosterEntry {
  const base: ClassroomLiveRosterEntry = {
    studentId: student.studentId,
    studentName: student.studentName,
    state: "offline",
    needsAttention: false,
    reason: "not-started",
    lastActiveAt: null,
    secondsSinceActive: null,
    currentTopicId: null,
    currentSource: null,
    lastQuestionId: null,
    lastAnswerCorrect: null,
    correctCount: 0,
    wrongCount: 0,
    hintCount: 0,
    consecutiveWrong: 0
  };

  // Ascending by time so "trailing" means "most recent".
  const events = [...allEvents].sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
  if (events.length === 0) return base;

  const lastOverall = events[events.length - 1];
  const lastOverallMs = toMs(lastOverall.timestamp);
  const inWindow = events.filter((event) => {
    const eventMs = toMs(event.timestamp);
    return eventMs >= windowStartMs && eventMs <= nowMs;
  });

  // Seen before, but not in the live window — present in the class list yet not
  // working the current stretch of the lesson.
  if (inWindow.length === 0) {
    return {
      ...base,
      state: "offline",
      reason: "inactive",
      lastActiveAt: lastOverall.timestamp,
      secondsSinceActive: Math.max(0, Math.round((nowMs - lastOverallMs) / 1000)),
      currentTopicId: lastOverall.topicId ?? null,
      currentSource: lastOverall.source
    };
  }

  const last = inWindow[inWindow.length - 1];
  const lastMs = toMs(last.timestamp);
  const secondsSinceActive = Math.max(0, Math.round((nowMs - lastMs) / 1000));

  const answers = inWindow.filter(isAnswerEvent);
  const correctCount = answers.filter((event) => event.type === "answer-correct").length;
  const wrongCount = answers.filter((event) => event.type === "answer-wrong").length;
  const hintCount = inWindow.filter((event) => event.type === "hint-request").length;
  const consecutiveWrong = trailingRun(answers, "answer-wrong");
  const consecutiveCorrect = trailingRun(answers, "answer-correct");
  const lastAnswer = answers[answers.length - 1] ?? null;
  const lastAnswerCorrect = lastAnswer ? lastAnswer.type === "answer-correct" : null;

  const stuck = consecutiveWrong >= stuckConsecutiveWrong || hintCount >= stuckHintCount;
  const silent = secondsSinceActive > idleSeconds;

  let state: ClassroomLiveStudentState;
  let reason: ClassroomLiveAttentionReason | null;
  if (stuck) {
    state = "stuck";
    reason = consecutiveWrong >= stuckConsecutiveWrong ? "repeated-wrong" : "many-hints";
  } else if (last.type === "visualization-complete") {
    state = "done";
    reason = null;
  } else if (!silent) {
    state = "working";
    reason = null;
  } else if (consecutiveCorrect >= doneConsecutiveCorrect) {
    state = "done";
    reason = null;
  } else {
    state = "idle";
    // A wrong last answer they walked away from is worth flagging differently
    // from simply going quiet mid-task.
    reason = lastAnswerCorrect === false ? "wrong-answer" : "idle";
  }

  return {
    studentId: student.studentId,
    studentName: student.studentName,
    state,
    needsAttention: state === "stuck",
    reason,
    lastActiveAt: last.timestamp,
    secondsSinceActive,
    currentTopicId: last.topicId ?? null,
    currentSource: last.source,
    lastQuestionId: lastAnswer?.questionId ?? last.questionId ?? null,
    lastAnswerCorrect,
    correctCount,
    wrongCount,
    hintCount,
    consecutiveWrong
  };
}

function compareEntries(a: ClassroomLiveRosterEntry, b: ClassroomLiveRosterEntry) {
  const rankDelta = stateRank[a.state] - stateRank[b.state];
  if (rankDelta !== 0) return rankDelta;

  // Within a state, surface the student who has been waiting or struggling the
  // longest first. `null` (never active) sorts as "longest".
  const aSince = a.secondsSinceActive ?? Number.POSITIVE_INFINITY;
  const bSince = b.secondsSinceActive ?? Number.POSITIVE_INFINITY;
  if (aSince !== bSince) return bSince - aSince;

  return a.studentName.localeCompare(b.studentName);
}

export function buildClassroomLiveRoster(input: BuildClassroomLiveRosterInput): ClassroomLiveRoster {
  const nowMs = toMs(input.now ?? new Date());
  const windowMinutes = input.windowMinutes ?? defaultRosterWindowMinutes;
  const idleSeconds = input.idleSeconds ?? defaultRosterIdleSeconds;
  const windowStartMs = nowMs - windowMinutes * 60 * 1000;

  const eventsByStudent = new Map<string, ClassroomLiveRosterEventInput[]>();
  for (const event of input.events) {
    const bucket = eventsByStudent.get(event.studentId);
    if (bucket) {
      bucket.push(event);
    } else {
      eventsByStudent.set(event.studentId, [event]);
    }
  }

  const students = input.students
    .map((student) =>
      deriveEntry(student, eventsByStudent.get(student.studentId) ?? [], nowMs, windowStartMs, idleSeconds)
    )
    .sort(compareEntries);

  const counts: ClassroomLiveRosterCounts = {
    total: students.length,
    stuck: 0,
    idle: 0,
    working: 0,
    done: 0,
    offline: 0
  };
  for (const student of students) {
    counts[student.state] += 1;
  }

  return {
    generatedAt: new Date(nowMs).toISOString(),
    classId: input.classId,
    className: input.className,
    windowMinutes,
    counts,
    students
  };
}
