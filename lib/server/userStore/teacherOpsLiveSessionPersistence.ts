import { randomUUID } from "node:crypto";

import type {
  AttendanceStatus,
  BuzzerRound,
  ClassroomLiveSession,
  ClassroomWorkSample,
  GradeId,
  LocalizedText,
  MathWorkbenchState,
  TeacherClass,
  TeacherLiveAttendanceEntry,
  TeacherLiveData,
  TeacherLiveEvent,
  TeacherLivePromptOption,
  TeacherLivePromptType,
  TeacherLiveProjectionState,
  TeacherLiveRandomCallState,
  TeacherLiveScreenSyncState,
  TeacherLiveSession,
  TeacherLiveSessionStatus,
  TeacherLiveToolState,
  TeacherLiveToolType,
  TeamScoreState,
  TimerState,
  WhiteboardStroke
} from "@/types";

type TeacherOpsLiveSessionUserRole = "student" | "teacher" | "parent" | "admin";

const validAttendanceStatuses = new Set<AttendanceStatus>(["present", "late", "absent", "excused"]);
const validTeacherLiveToolTypes = new Set<TeacherLiveToolType>([
  "attendance",
  "random-call",
  "buzzer",
  "timer",
  "teams",
  "projector",
  "screen-sync",
  "whiteboard",
  "math-workbench"
]);

export function isValidAttendanceStatus(status: unknown): status is AttendanceStatus {
  return validAttendanceStatuses.has(status as AttendanceStatus);
}

export function normalizeAttendanceStatus(status: unknown): AttendanceStatus {
  return isValidAttendanceStatus(status) ? status : "absent";
}

export function isValidTeacherLiveToolType(toolType: unknown): toolType is TeacherLiveToolType {
  return validTeacherLiveToolTypes.has(toolType as TeacherLiveToolType);
}

export function normalizeTeacherLiveToolType(toolType: unknown): TeacherLiveToolType {
  return isValidTeacherLiveToolType(toolType) ? toolType : "attendance";
}

export function normalizeTeacherLiveEventType(toolType: unknown): TeacherLiveToolType | "session" {
  if (toolType === "session") return "session";
  return isValidTeacherLiveToolType(toolType) ? toolType : "session";
}

export function normalizeTeacherOpsWhiteboardStroke(value: unknown): WhiteboardStroke | null {
  const stroke = value as Partial<WhiteboardStroke> | null;
  if (!stroke || typeof stroke !== "object" || typeof stroke.id !== "string") return null;
  const points = Array.isArray(stroke.points)
    ? stroke.points
        .map((point) => {
          const candidate = point as { x?: unknown; y?: unknown };
          return typeof candidate.x === "number" && typeof candidate.y === "number"
            ? { x: Math.max(0, Math.min(1, candidate.x)), y: Math.max(0, Math.min(1, candidate.y)) }
            : null;
        })
        .filter((point): point is { x: number; y: number } => Boolean(point))
        .slice(0, 120)
    : [];
  return {
    id: stroke.id,
    tool: stroke.tool === "highlighter" ? "highlighter" : "pen",
    color: typeof stroke.color === "string" && stroke.color.trim() ? stroke.color.slice(0, 24) : "#0891b2",
    width: typeof stroke.width === "number" ? Math.max(1, Math.min(18, Math.round(stroke.width))) : 4,
    points,
    createdAt: typeof stroke.createdAt === "string" ? stroke.createdAt : new Date().toISOString()
  };
}

export function normalizeTeacherOpsLiveAttendanceEntry(value: unknown, now: string): TeacherLiveAttendanceEntry | null {
  const entry = value as Partial<TeacherLiveAttendanceEntry> | null;
  if (!entry || typeof entry !== "object" || typeof entry.studentId !== "string") return null;
  const status = normalizeAttendanceStatus(entry.status);
  return {
    studentId: entry.studentId,
    studentName: typeof entry.studentName === "string" && entry.studentName.trim() ? entry.studentName.trim() : "Student",
    status,
    checkedInAt: typeof entry.checkedInAt === "string" ? entry.checkedInAt : null,
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : now
  };
}

type TeacherOpsLiveSessionUserRecord = {
  id: string;
  role: TeacherOpsLiveSessionUserRole;
  username?: string;
};

type TeacherOpsLiveSessionStudentProfileRecord = {
  user_id: string;
  name: string;
};

type TeacherOpsLiveSessionClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsLiveSessionSchoolMembershipRecord = {
  user_id: string;
  class_id?: string;
  role: TeacherOpsLiveSessionUserRole;
};

export type TeacherOpsLiveSessionRecord = {
  id: string;
  class_id: string;
  teacher_id?: string;
  status: TeacherLiveSessionStatus;
  title_en?: string;
  title_zh?: string;
  lesson_slug?: string;
  lesson_title_en?: string;
  lesson_title_zh?: string;
  topic_id?: string;
  topic_title_en?: string;
  topic_title_zh?: string;
  visualization_title_en?: string;
  visualization_title_zh?: string;
  join_code: string;
  current_prompt_id: string;
  lesson_kit_id?: string;
  started_at?: string;
  ended_at: string | null;
  created_at?: string;
  updated_at: string;
};

type TeacherOpsLiveSessionPromptRecord = {
  id: string;
  session_id: string;
  type?: TeacherLivePromptType;
  question_en?: string;
  question_zh?: string;
  options: TeacherLivePromptOption[];
  correct_option_id?: string;
  created_at?: string;
};

type TeacherOpsLiveSessionResponseRecord = {
  id: string;
  session_id: string;
  prompt_id: string;
  student_id: string;
  answer: string;
  is_correct: boolean | null;
  submitted_at: string;
};

export type TeacherOpsSeedTeacherLiveSessionRecord = {
  id: string;
  class_id: string;
  teacher_id: string;
  status: TeacherLiveSessionStatus;
  title_en: string;
  title_zh: string;
  lesson_slug?: string;
  lesson_title_en: string;
  lesson_title_zh: string;
  topic_id?: string;
  topic_title_en?: string;
  topic_title_zh?: string;
  visualization_title_en: string;
  visualization_title_zh: string;
  join_code: string;
  current_prompt_id: string;
  lesson_kit_id?: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TeacherOpsSeedTeacherLivePromptRecord = {
  id: string;
  session_id: string;
  type: TeacherLivePromptType;
  question_en: string;
  question_zh: string;
  options: TeacherLivePromptOption[];
  correct_option_id?: string;
  created_at: string;
};

export type TeacherOpsSeedTeacherLiveResponseRecord = {
  id: string;
  session_id: string;
  prompt_id: string;
  student_id: string;
  answer: string;
  is_correct: boolean | null;
  submitted_at: string;
};

type TeacherOpsSeedTeacherLiveSessionRecordsOptions = {
  demoTeacherId: string;
  shouldSeedDemoUser: () => boolean;
};

export function teacherOpsSeedTeacherLiveSessionRecords(
  now: string,
  options: TeacherOpsSeedTeacherLiveSessionRecordsOptions
): TeacherOpsSeedTeacherLiveSessionRecord[] {
  return options.shouldSeedDemoUser()
    ? [
        {
          id: "live-s3a-quadratic-check",
          class_id: "class-s3a-2026",
          teacher_id: options.demoTeacherId,
          status: "active",
          title_en: "S3A quadratic checkpoint",
          title_zh: "中三A二次函數即時檢查",
          lesson_slug: "quadratic-functions",
          lesson_title_en: "Quadratic Functions: Shape, Vertex, and Intercepts",
          lesson_title_zh: "二次函數：形狀、頂點與截距",
          topic_id: "quadratic-patterns",
          topic_title_en: "Quadratic Patterns",
          topic_title_zh: "二次規律",
          visualization_title_en: "Function Graph Explorer",
          visualization_title_zh: "函數圖像探索器",
          join_code: "S3A82",
          current_prompt_id: "live-prompt-s3a-axis",
          started_at: now,
          ended_at: null,
          created_at: now,
          updated_at: now
        }
      ]
    : [];
}

type TeacherOpsSeedTeacherLivePromptRecordsOptions = {
  shouldSeedDemoUser: () => boolean;
};

export function teacherOpsSeedTeacherLivePromptRecords(
  now: string,
  options: TeacherOpsSeedTeacherLivePromptRecordsOptions
): TeacherOpsSeedTeacherLivePromptRecord[] {
  return options.shouldSeedDemoUser()
    ? [
        {
          id: "live-prompt-s3a-axis",
          session_id: "live-s3a-quadratic-check",
          type: "poll",
          question_en: "For \\(y = x^2 - 4x + 3\\), what is the axis of symmetry?",
          question_zh: "對於 \\(y = x^2 - 4x + 3\\)，對稱軸是甚麼？",
          options: [
            { id: "a", label: { en: "\\(x = -2\\)", zh: "\\(x = -2\\)" } },
            { id: "b", label: { en: "\\(x = 2\\)", zh: "\\(x = 2\\)" } },
            { id: "c", label: { en: "\\(y = 2\\)", zh: "\\(y = 2\\)" } }
          ],
          correct_option_id: "b",
          created_at: now
        }
      ]
    : [];
}

type TeacherOpsSeedTeacherLiveResponseRecordsOptions = {
  demoUserId: string;
  shouldSeedDemoUser: () => boolean;
};

export function teacherOpsSeedTeacherLiveResponseRecords(
  now: string,
  options: TeacherOpsSeedTeacherLiveResponseRecordsOptions
): TeacherOpsSeedTeacherLiveResponseRecord[] {
  return options.shouldSeedDemoUser()
    ? [
        {
          id: "live-response-s3a-peter",
          session_id: "live-s3a-quadratic-check",
          prompt_id: "live-prompt-s3a-axis",
          student_id: options.demoUserId,
          answer: "b",
          is_correct: true,
          submitted_at: now
        }
      ]
    : [];
}

export type TeacherOpsLiveSessionCollectionRecords = {
  teacher_live_prompts?: TeacherOpsSeedTeacherLivePromptRecord[];
  teacher_live_responses?: TeacherOpsSeedTeacherLiveResponseRecord[];
  teacher_live_sessions?: TeacherOpsSeedTeacherLiveSessionRecord[];
};

export type TeacherOpsLiveSessionCollectionNormalizationOptions = {
  demoTeacherId: string;
  demoUserId: string;
  shouldSeedDemoUser: () => boolean;
};

function mergeTeacherOpsLiveSessionSeedRecordsPreservingExisting<T>(
  existingRecords: T[] | undefined,
  seedRecords: T[],
  keyFor: (record: T) => string
) {
  const existingByKey = new Map((existingRecords ?? []).map((record) => [keyFor(record), record]));
  const seedKeys = new Set(seedRecords.map(keyFor));
  const seedOrExistingRecords = seedRecords.map((record) => existingByKey.get(keyFor(record)) ?? record);
  const extraRecords = (existingRecords ?? []).filter((record) => !seedKeys.has(keyFor(record)));
  return [...seedOrExistingRecords, ...extraRecords];
}

export function normalizeTeacherOpsLiveSessionCollections(
  collections: TeacherOpsLiveSessionCollectionRecords,
  now: string,
  options: TeacherOpsLiveSessionCollectionNormalizationOptions
): {
  teacher_live_prompts: TeacherOpsSeedTeacherLivePromptRecord[];
  teacher_live_responses: TeacherOpsSeedTeacherLiveResponseRecord[];
  teacher_live_sessions: TeacherOpsSeedTeacherLiveSessionRecord[];
} {
  return {
    teacher_live_sessions: mergeTeacherOpsLiveSessionSeedRecordsPreservingExisting(
      collections.teacher_live_sessions,
      teacherOpsSeedTeacherLiveSessionRecords(now, {
        demoTeacherId: options.demoTeacherId,
        shouldSeedDemoUser: options.shouldSeedDemoUser
      }),
      (session) => session.id
    ),
    teacher_live_prompts: mergeTeacherOpsLiveSessionSeedRecordsPreservingExisting(
      collections.teacher_live_prompts,
      teacherOpsSeedTeacherLivePromptRecords(now, {
        shouldSeedDemoUser: options.shouldSeedDemoUser
      }),
      (prompt) => prompt.id
    ),
    teacher_live_responses: mergeTeacherOpsLiveSessionSeedRecordsPreservingExisting(
      collections.teacher_live_responses,
      teacherOpsSeedTeacherLiveResponseRecords(now, {
        demoUserId: options.demoUserId,
        shouldSeedDemoUser: options.shouldSeedDemoUser
      }),
      (response) => response.id
    )
  };
}

type TeacherOpsLiveSessionEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type TeacherOpsLiveSessionClassroomWorkSampleRecord = {
  id: string;
  session_id: string;
  student_id: string;
  image_data_url?: string;
  image_object_key?: string;
  caption: string;
  status: "submitted" | "selected" | "hidden";
  created_at: string;
  selected_at: string | null;
};

type TeacherOpsLiveSessionTopicRecord = {
  id: string;
  grade: GradeId;
  title_en: string;
  title_zh: string;
};

type TeacherOpsLiveSessionLessonRecord = {
  slug: string;
  topic_id: string;
  title_en: string;
  title_zh: string;
};

type TeacherOpsLiveSessionLessonKitRecord = {
  id: string;
  sections: NonNullable<TeacherLiveSession["slideSections"]>;
};

type TeacherOpsLiveSessionAttendanceEntry = TeacherLiveAttendanceEntry;

type TeacherOpsLiveSessionBuzzerEntry = {
  studentId: string;
  studentName: string;
  submittedAt: string;
  rank: number;
};

type TeacherOpsLiveSessionBuzzerRound = {
  id: string;
  status: BuzzerRound["status"];
  openedAt: string | null;
  closedAt: string | null;
  entries: TeacherOpsLiveSessionBuzzerEntry[];
};

type TeacherOpsLiveSessionEventRecord = TeacherLiveEvent;

export type TeacherOpsLiveSessionToolStateRecord = {
  session_id: string;
  active_tool: TeacherLiveToolType;
  attendance: TeacherOpsLiveSessionAttendanceEntry[];
  random_call: TeacherLiveRandomCallState;
  buzzer: TeacherOpsLiveSessionBuzzerRound;
  timer: TimerState;
  teams: TeamScoreState;
  projection: TeacherLiveProjectionState;
  screen_sync: TeacherLiveScreenSyncState;
  whiteboard_strokes: WhiteboardStroke[];
  math_workbench: MathWorkbenchState;
  events: TeacherOpsLiveSessionEventRecord[];
  updated_at: string;
  [key: string]: unknown;
};

export type TeacherOpsLiveSessionPersistenceDatabase = {
  class_enrollments: TeacherOpsLiveSessionEnrollmentRecord[];
  classroom_work_samples: TeacherOpsLiveSessionClassroomWorkSampleRecord[];
  lessons: TeacherOpsLiveSessionLessonRecord[];
  school_memberships?: TeacherOpsLiveSessionSchoolMembershipRecord[];
  student_profiles?: TeacherOpsLiveSessionStudentProfileRecord[];
  teacher_classes: TeacherOpsLiveSessionClassRecord[];
  teacher_lesson_kits?: TeacherOpsLiveSessionLessonKitRecord[];
  teacher_live_prompts: TeacherOpsLiveSessionPromptRecord[];
  teacher_live_responses: TeacherOpsLiveSessionResponseRecord[];
  teacher_live_sessions: TeacherOpsLiveSessionRecord[];
  teacher_live_tool_states: TeacherOpsLiveSessionToolStateRecord[];
  topics: TeacherOpsLiveSessionTopicRecord[];
  users: TeacherOpsLiveSessionUserRecord[];
};

type TeacherOpsLiveSessionContext = {
  lessonSlug?: string;
  lessonTitle: LocalizedText;
  topicId?: string;
  topicTitle?: LocalizedText | null;
  visualizationTitle: LocalizedText;
};

type TeacherOpsLiveJoinCodeDatabase = {
  teacher_live_sessions: unknown[];
};

export type TeacherOpsLiveSessionPersistenceStoreDependencies = {
  createLiveToolStateRecord: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    session: TeacherOpsLiveSessionRecord,
    nowIso: string
  ) => TeacherOpsLiveSessionToolStateRecord;
  createId?: () => string;
  defaultPromptOptions: (type: TeacherLivePromptType) => TeacherLivePromptOption[];
  defaultMathWorkbenchState: (updatedAt?: string | null) => MathWorkbenchState;
  defaultRandomCallState: (updatedAt?: string | null) => TeacherLiveRandomCallState;
  defaultScreenSyncState: (updatedAt?: string | null) => TeacherLiveScreenSyncState;
  ensureLiveToolStateRecord: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    session: TeacherOpsLiveSessionRecord,
    nowIso: string
  ) => TeacherOpsLiveSessionToolStateRecord;
  mediaObjectKeyFromPayload: (value: unknown) => string | undefined;
  normalizeWhiteboardStroke: (value: unknown) => WhiteboardStroke | null;
  mutateDatabase: <Result>(
    mutator: (database: TeacherOpsLiveSessionPersistenceDatabase) => Result | Promise<Result>
  ) => Promise<Result>;
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsLiveSessionPersistenceDatabase>;
  resolveLiveSessionContext: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    teacherClass: TeacherOpsLiveSessionClassRecord,
    topicId?: string
  ) => TeacherOpsLiveSessionContext;
  studentNameForLiveAction: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    studentId: string
  ) => string;
  studentIdsForClass: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    classId: string
  ) => string[];
  timerForClient: (timer: TimerState) => TimerState;
  toClass: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    teacherClass: TeacherOpsLiveSessionClassRecord
  ) => TeacherClass;
  toClassroomLiveSession: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    input: {
      teacherSession: TeacherLiveSession;
      viewerMode: ClassroomLiveSession["viewerMode"];
      viewerStudentId?: string;
      response?: TeacherOpsLiveSessionResponseRecord | null;
    }
  ) => ClassroomLiveSession;
  toLiveSession: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    session: TeacherOpsLiveSessionRecord
  ) => TeacherLiveSession | null;
};

export type TeacherOpsLiveSessionPersistenceStore = ReturnType<typeof createTeacherOpsLiveSessionPersistenceStore>;

function canUseTeacherArea(user?: TeacherOpsLiveSessionUserRecord | null): user is TeacherOpsLiveSessionUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherCanAccessClass(
  database: TeacherOpsLiveSessionPersistenceDatabase,
  user: TeacherOpsLiveSessionUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (
    user.role !== "admin" &&
    teacherClass.teacher_id !== user.id &&
    !(database.school_memberships ?? []).some(
      (membership) =>
        membership.user_id === user.id &&
        membership.class_id === classId &&
        (membership.role === "teacher" || membership.role === "admin")
    )
  ) {
    return null;
  }
  return teacherClass;
}

function teacherClassRecordsFor(
  database: TeacherOpsLiveSessionPersistenceDatabase,
  user: TeacherOpsLiveSessionUserRecord
) {
  const membershipClassIds = new Set(
    (database.school_memberships ?? [])
      .filter((membership) => (
        membership.user_id === user.id &&
        membership.class_id &&
        (membership.role === "teacher" || membership.role === "admin")
      ))
      .map((membership) => membership.class_id as string)
  );

  return database.teacher_classes
    .filter((teacherClass) =>
      user.role === "admin" || teacherClass.teacher_id === user.id || membershipClassIds.has(teacherClass.id)
    )
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));
}

export function generateTeacherOpsLiveJoinCode(
  database: TeacherOpsLiveJoinCodeDatabase,
  teacherClass: { grade: string },
  createId: () => string = randomUUID,
  now: () => Date = () => new Date()
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${teacherClass.grade}${createId().slice(0, 3)}`.replace(/-/g, "").toUpperCase();
    if (!database.teacher_live_sessions.some((session) => {
      const record = session as { join_code?: unknown } | null;
      return record && typeof record.join_code === "string" && record.join_code === code;
    })) {
      return code;
    }
  }
  return `${teacherClass.grade}${now().getTime().toString(36).slice(-3)}`.toUpperCase();
}

export function defaultTeacherOpsLivePromptOptions(type: TeacherLivePromptType): TeacherLivePromptOption[] {
  if (type === "exit-ticket") {
    return [
      { id: "green", label: { en: "Ready to continue", zh: "可以繼續" } },
      { id: "yellow", label: { en: "Need one more example", zh: "需要多一個例子" } },
      { id: "red", label: { en: "Please reteach", zh: "需要重講" } }
    ];
  }

  return [
    { id: "a", label: { en: "A", zh: "A" } },
    { id: "b", label: { en: "B", zh: "B" } },
    { id: "c", label: { en: "C", zh: "C" } },
    { id: "d", label: { en: "D", zh: "D" } }
  ];
}

export function teacherOpsLivePromptFromRecord(
  record: TeacherOpsLiveSessionPromptRecord
): TeacherLiveSession["currentPrompt"] {
  return {
    id: record.id,
    type: record.type ?? "poll",
    question: {
      en: record.question_en ?? "",
      zh: record.question_zh ?? record.question_en ?? ""
    },
    options: record.options,
    correctOptionId: record.correct_option_id
  };
}

export function teacherOpsLiveResponseSummaryForPrompt({
  database,
  prompt,
  studentNameForLiveAction
}: {
  database: TeacherOpsLiveSessionPersistenceDatabase;
  prompt: TeacherOpsLiveSessionPromptRecord;
  studentNameForLiveAction: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    studentId: string
  ) => string;
}): TeacherLiveSession["responseSummary"] {
  const responses = database.teacher_live_responses.filter((response) => response.prompt_id === prompt.id);
  const answerCounts = new Map<string, { count: number; isCorrect: boolean | null }>();
  responses.forEach((response) => {
    const current = answerCounts.get(response.answer) ?? { count: 0, isCorrect: response.is_correct };
    current.count += 1;
    current.isCorrect = response.is_correct;
    answerCounts.set(response.answer, current);
  });
  const correctCount = responses.filter((response) => response.is_correct === true).length;
  const accuracy = responses.length && prompt.correct_option_id ? Math.round((correctCount / responses.length) * 100) : null;

  return {
    promptId: prompt.id,
    totalSubmissions: responses.length,
    correctCount,
    accuracy,
    submittedStudentIds: responses.map((response) => response.student_id),
    submissions: responses
      .map((response) => ({
        studentId: response.student_id,
        studentName: studentNameForLiveAction(database, response.student_id),
        answer: response.answer,
        isCorrect: response.is_correct,
        submittedAt: response.submitted_at
      }))
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
    commonAnswers: Array.from(answerCounts.entries())
      .map(([answer, value]) => ({
        answer,
        count: value.count,
        isCorrect: value.isCorrect
      }))
      .sort((a, b) => b.count - a.count || a.answer.localeCompare(b.answer))
      .slice(0, 4),
    needsReteach: Boolean(responses.length >= 3 && accuracy !== null && accuracy < 65)
  };
}

export function teacherOpsLessonKitSlideSectionsForSession(
  database: TeacherOpsLiveSessionPersistenceDatabase,
  sessionId: string
): TeacherLiveSession["slideSections"] {
  const session = database.teacher_live_sessions.find((candidate) => candidate.id === sessionId);
  const kit = session?.lesson_kit_id
    ? database.teacher_lesson_kits?.find((candidate) => candidate.id === session.lesson_kit_id)
    : null;

  return kit?.sections
    .filter((section) => (
      section.kind === "slides" ||
      section.kind === "classroom-activity" ||
      section.kind === "blackboard-design"
    ))
    .sort((a, b) => a.order - b.order) ?? [];
}

export function teacherOpsLiveStudentNameFor(
  database: TeacherOpsLiveSessionPersistenceDatabase,
  studentId: string
) {
  const profile = database.student_profiles?.find((candidate) => candidate.user_id === studentId);
  const user = database.users.find((candidate) => candidate.id === studentId);
  return profile?.name ?? user?.username ?? "Student";
}

export function teacherOpsLiveStudentIdsForClass(
  database: TeacherOpsLiveSessionPersistenceDatabase,
  classId: string
) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

export function teacherOpsTimerForClient(timer: TimerState, nowMs = Date.now()): TimerState {
  if (timer.status !== "running" || !timer.startedAt) return timer;
  const startedAtMs = Date.parse(timer.startedAt);
  if (!Number.isFinite(startedAtMs)) return timer;
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  if (timer.mode === "stopwatch") {
    return {
      ...timer,
      remainingSeconds: Math.min(24 * 60 * 60, timer.remainingSeconds + elapsedSeconds)
    };
  }
  return {
    ...timer,
    remainingSeconds: Math.max(0, timer.remainingSeconds - elapsedSeconds)
  };
}

export function teacherOpsClassroomLiveSessionFromTeacherSession({
  teacherSession,
  viewerMode,
  viewerStudentId,
  response
}: {
  teacherSession: TeacherLiveSession;
  viewerMode: ClassroomLiveSession["viewerMode"];
  viewerStudentId?: string;
  response?: { answer: string } | null;
}): ClassroomLiveSession {
  const attendanceEntry = viewerStudentId
    ? teacherSession.toolState.attendance.find((entry) => entry.studentId === viewerStudentId)
    : null;
  return {
    id: teacherSession.id,
    className: teacherSession.className,
    status: teacherSession.status,
    title: teacherSession.title,
    lessonTitle: teacherSession.lessonTitle,
    joinCode: teacherSession.joinCode,
    currentPrompt: teacherSession.currentPrompt,
    viewerStudentId,
    attendanceStatus: attendanceEntry?.status,
    workSamples: viewerMode === "teacher-preview"
      ? teacherSession.workSamples
      : teacherSession.workSamples.filter((sample) => sample.status === "selected"),
    toolState: teacherSession.toolState,
    viewerMode,
    canSubmit: viewerMode === "student" && teacherSession.status === "active" && !response,
    submitted: Boolean(response),
    submittedAnswer: response?.answer ?? null
  };
}

export function teacherOpsAttendanceForSession({
  database,
  session,
  existing,
  nowIso,
  studentIdsForClass,
  studentNameForLiveAction
}: {
  database: TeacherOpsLiveSessionPersistenceDatabase;
  session: TeacherOpsLiveSessionRecord;
  existing: TeacherLiveAttendanceEntry[];
  nowIso: string;
  studentIdsForClass: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    classId: string
  ) => string[];
  studentNameForLiveAction: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    studentId: string
  ) => string;
}): TeacherLiveAttendanceEntry[] {
  const existingByStudentId = new Map(existing.map((entry) => [entry.studentId, entry]));
  return studentIdsForClass(database, session.class_id).map((studentId) => {
    const current = existingByStudentId.get(studentId);
    return current
      ? { ...current, studentName: studentNameForLiveAction(database, studentId) }
      : {
          studentId,
          studentName: studentNameForLiveAction(database, studentId),
          status: "absent",
          checkedInAt: null,
          updatedAt: nowIso
        };
  });
}

export function defaultTeacherOpsLiveToolStateRecordForSession({
  database,
  session,
  nowIso,
  studentIdsForClass,
  studentNameForLiveAction,
  createId = randomUUID
}: {
  database: TeacherOpsLiveSessionPersistenceDatabase;
  session: TeacherOpsLiveSessionRecord;
  nowIso: string;
  studentIdsForClass: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    classId: string
  ) => string[];
  studentNameForLiveAction: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    studentId: string
  ) => string;
  createId?: () => string;
}): TeacherOpsLiveSessionToolStateRecord {
  return {
    session_id: session.id,
    active_tool: "attendance",
    attendance: teacherOpsAttendanceForSession({
      database,
      session,
      existing: [],
      nowIso,
      studentIdsForClass,
      studentNameForLiveAction
    }),
    random_call: defaultTeacherOpsRandomCallState(),
    buzzer: defaultTeacherOpsBuzzerRound(createId),
    timer: defaultTeacherOpsTimerState(),
    teams: defaultTeacherOpsTeamScoreState(),
    projection: defaultTeacherOpsProjectionState(),
    screen_sync: {
      ...defaultTeacherOpsScreenSyncState(),
      href: `/classroom?code=${encodeURIComponent(session.join_code)}`
    },
    whiteboard_strokes: [],
    math_workbench: defaultTeacherOpsMathWorkbenchState(),
    events: [
      {
        id: `live-event-${createId()}`,
        type: "session",
        label: { en: "Live classroom started", zh: "即時課堂已開始" },
        createdAt: session.started_at ?? nowIso
      }
    ],
    updated_at: nowIso
  };
}

export function teacherOpsEnsureLiveToolStateRecord({
  database,
  session,
  nowIso,
  studentIdsForClass,
  studentNameForLiveAction,
  createId
}: {
  database: TeacherOpsLiveSessionPersistenceDatabase;
  session: TeacherOpsLiveSessionRecord;
  nowIso: string;
  studentIdsForClass: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    classId: string
  ) => string[];
  studentNameForLiveAction: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    studentId: string
  ) => string;
  createId?: () => string;
}): TeacherOpsLiveSessionToolStateRecord {
  let record = database.teacher_live_tool_states.find((candidate) => candidate.session_id === session.id);
  if (!record) {
    record = defaultTeacherOpsLiveToolStateRecordForSession({
      database,
      session,
      nowIso,
      studentIdsForClass,
      studentNameForLiveAction,
      createId
    });
    database.teacher_live_tool_states.push(record);
  }
  record.attendance = teacherOpsAttendanceForSession({
    database,
    session,
    existing: record.attendance,
    nowIso,
    studentIdsForClass,
    studentNameForLiveAction
  });
  return record;
}

export function teacherOpsLiveToolStateForSession({
  database,
  session,
  nowIso,
  nowMs,
  studentIdsForClass,
  studentNameForLiveAction,
  createId
}: {
  database: TeacherOpsLiveSessionPersistenceDatabase;
  session: TeacherOpsLiveSessionRecord;
  nowIso: string;
  nowMs?: number;
  studentIdsForClass: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    classId: string
  ) => string[];
  studentNameForLiveAction: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    studentId: string
  ) => string;
  createId?: () => string;
}): TeacherLiveToolState {
  const record = database.teacher_live_tool_states.find((candidate) => candidate.session_id === session.id) ??
    defaultTeacherOpsLiveToolStateRecordForSession({
      database,
      session,
      nowIso,
      studentIdsForClass,
      studentNameForLiveAction,
      createId
    });
  const attendance = teacherOpsAttendanceForSession({
    database,
    session,
    existing: record.attendance,
    nowIso: record.updated_at ?? nowIso,
    studentIdsForClass,
    studentNameForLiveAction
  });

  return {
    activeTool: record.active_tool,
    attendance,
    randomCall: record.random_call,
    buzzer: record.buzzer,
    timer: teacherOpsTimerForClient(record.timer, nowMs),
    teams: record.teams,
    projection: record.projection,
    screenSync: record.screen_sync,
    whiteboard: {
      strokes: record.whiteboard_strokes,
      updatedAt: record.updated_at
    },
    mathWorkbench: record.math_workbench,
    events: record.events.slice(-30).reverse()
  };
}

export function teacherOpsLivePayloadObject(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
}

export function teacherOpsPayloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function teacherOpsBoundedPayloadNumber(payload: Record<string, unknown>, key: string, fallback: number, min: number, max: number) {
  const value = Number(payload[key]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function teacherOpsPayloadBoolean(payload: Record<string, unknown>, key: string, fallback = false) {
  return typeof payload[key] === "boolean" ? payload[key] as boolean : fallback;
}

export function chooseTeacherOpsRandomCallableStudent(record: TeacherOpsLiveSessionToolStateRecord) {
  const presentStudents = record.attendance.filter((entry) => entry.status === "present" || entry.status === "late");
  const preferred = presentStudents.length ? presentStudents : record.attendance;
  const uncalled = preferred.filter(
    (entry) => record.random_call.allowRepeats || !record.random_call.selectedStudentIds.includes(entry.studentId)
  );
  const pool = uncalled.length ? uncalled : preferred;
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function normalizeTeacherOpsLiveTarget(value: unknown): TeacherLiveScreenSyncState["target"] {
  return ["classroom", "prompt", "visualization", "whiteboard", "math-workbench"].includes(String(value))
    ? value as TeacherLiveScreenSyncState["target"]
    : "classroom";
}

export function normalizeTeacherOpsMathWorkbenchTool(value: unknown): MathWorkbenchState["tool"] {
  return ["function-graph", "coordinate-plane", "geometry", "compass-straightedge"].includes(String(value))
    ? value as MathWorkbenchState["tool"]
    : "function-graph";
}

export function normalizeTeacherOpsProjectionMode(value: unknown): TeacherLiveProjectionState["mode"] {
  return value === "work-samples" ? "work-samples" : "answers";
}

function teacherOpsLocalizedFromUnknown(value: unknown, fallback: LocalizedText): LocalizedText {
  const candidate = value as Partial<LocalizedText> | null;
  if (!candidate || typeof candidate !== "object") return fallback;
  const en = typeof candidate.en === "string" && candidate.en.trim() ? candidate.en.trim() : fallback.en;
  const zh = typeof candidate.zh === "string" && candidate.zh.trim() ? candidate.zh.trim() : en;
  return { en, zh };
}

export function defaultTeacherOpsRandomCallState(updatedAt: string | null = null): TeacherLiveRandomCallState {
  return {
    currentStudentId: null,
    currentStudentName: null,
    selectedStudentIds: [],
    allowRepeats: false,
    updatedAt
  };
}

export function defaultTeacherOpsBuzzerRound(createId: () => string = randomUUID): BuzzerRound {
  return {
    id: `buzzer-${createId()}`,
    status: "idle",
    openedAt: null,
    closedAt: null,
    entries: []
  };
}

export function defaultTeacherOpsTimerState(updatedAt: string | null = null): TimerState {
  return {
    mode: "countdown",
    status: "idle",
    durationSeconds: 180,
    remainingSeconds: 180,
    startedAt: null,
    pausedAt: null,
    updatedAt
  };
}

export function defaultTeacherOpsTeamScoreState(updatedAt: string | null = null): TeamScoreState {
  return { teams: [], updatedAt };
}

export function defaultTeacherOpsProjectionState(updatedAt: string | null = null): TeacherLiveProjectionState {
  return {
    mode: "answers",
    showNames: false,
    selectedWorkSampleId: null,
    updatedAt
  };
}

export function defaultTeacherOpsScreenSyncState(updatedAt: string | null = null): TeacherLiveScreenSyncState {
  return {
    target: "classroom",
    title: { en: "Live classroom", zh: "即時課堂" },
    href: "/classroom",
    locked: false,
    updatedAt
  };
}

export function defaultTeacherOpsMathWorkbenchState(updatedAt: string | null = null): MathWorkbenchState {
  return {
    tool: "function-graph",
    topicId: null,
    title: { en: "Function Graph Explorer", zh: "函數圖像探索器" },
    parameters: { a: 1, b: -2, c: -3 },
    locked: false,
    updatedAt
  };
}

export function normalizeTeacherOpsLiveToolStateRecord(
  record: Partial<TeacherOpsLiveSessionToolStateRecord> | undefined,
  now: string
): TeacherOpsLiveSessionToolStateRecord | null {
  if (!record || typeof record.session_id !== "string") return null;
  const activeTool = normalizeTeacherLiveToolType(record.active_tool);
  const randomCall = record.random_call ?? defaultTeacherOpsRandomCallState();
  const buzzer = record.buzzer ?? defaultTeacherOpsBuzzerRound();
  const timer = record.timer ?? defaultTeacherOpsTimerState();
  const teams = record.teams ?? defaultTeacherOpsTeamScoreState();
  const projection = record.projection ?? defaultTeacherOpsProjectionState();
  const screenSync = record.screen_sync ?? defaultTeacherOpsScreenSyncState();
  const mathWorkbench = record.math_workbench ?? defaultTeacherOpsMathWorkbenchState();

  return {
    session_id: record.session_id,
    active_tool: activeTool,
    attendance: Array.isArray(record.attendance)
      ? record.attendance
          .map((entry) => normalizeTeacherOpsLiveAttendanceEntry(entry, now))
          .filter((entry): entry is TeacherLiveAttendanceEntry => Boolean(entry))
      : [],
    random_call: {
      currentStudentId: typeof randomCall.currentStudentId === "string" ? randomCall.currentStudentId : null,
      currentStudentName: typeof randomCall.currentStudentName === "string" ? randomCall.currentStudentName : null,
      selectedStudentIds: Array.isArray(randomCall.selectedStudentIds)
        ? randomCall.selectedStudentIds.filter((id): id is string => typeof id === "string").slice(0, 80)
        : [],
      allowRepeats: randomCall.allowRepeats === true,
      updatedAt: typeof randomCall.updatedAt === "string" ? randomCall.updatedAt : null
    },
    buzzer: {
      id: typeof buzzer.id === "string" ? buzzer.id : `buzzer-${randomUUID()}`,
      status: buzzer.status === "open" || buzzer.status === "closed" ? buzzer.status : "idle",
      openedAt: typeof buzzer.openedAt === "string" ? buzzer.openedAt : null,
      closedAt: typeof buzzer.closedAt === "string" ? buzzer.closedAt : null,
      entries: Array.isArray(buzzer.entries)
        ? buzzer.entries
            .filter((entry) => typeof entry.studentId === "string" && typeof entry.studentName === "string" && typeof entry.submittedAt === "string")
            .map((entry, index) => ({ ...entry, rank: Math.max(1, Math.round(Number(entry.rank) || index + 1)) }))
            .slice(0, 12)
        : []
    },
    timer: {
      mode: timer.mode === "stopwatch" ? "stopwatch" : "countdown",
      status: ["idle", "running", "paused", "ended"].includes(timer.status) ? timer.status : "idle",
      durationSeconds: Math.max(0, Math.min(7200, Math.round(Number(timer.durationSeconds) || 180))),
      remainingSeconds: Math.max(0, Math.min(7200, Math.round(Number(timer.remainingSeconds) || 0))),
      startedAt: typeof timer.startedAt === "string" ? timer.startedAt : null,
      pausedAt: typeof timer.pausedAt === "string" ? timer.pausedAt : null,
      updatedAt: typeof timer.updatedAt === "string" ? timer.updatedAt : null
    },
    teams: {
      teams: Array.isArray(teams.teams)
        ? teams.teams
            .filter((team) => typeof team.id === "string")
            .map((team, index) => ({
              id: team.id,
              name: teacherOpsLocalizedFromUnknown(team.name, { en: `Team ${index + 1}`, zh: `第 ${index + 1} 組` }),
              studentIds: Array.isArray(team.studentIds) ? team.studentIds.filter((id): id is string => typeof id === "string") : [],
              score: Math.round(Number(team.score) || 0)
            }))
            .slice(0, 8)
        : [],
      updatedAt: typeof teams.updatedAt === "string" ? teams.updatedAt : null
    },
    projection: {
      mode: normalizeTeacherOpsProjectionMode(projection.mode),
      showNames: projection.showNames === true,
      selectedWorkSampleId: typeof projection.selectedWorkSampleId === "string" ? projection.selectedWorkSampleId : null,
      updatedAt: typeof projection.updatedAt === "string" ? projection.updatedAt : null
    },
    screen_sync: {
      target: normalizeTeacherOpsLiveTarget(screenSync.target),
      title: teacherOpsLocalizedFromUnknown(screenSync.title, { en: "Live classroom", zh: "即時課堂" }),
      href: typeof screenSync.href === "string" && screenSync.href.trim() ? screenSync.href.slice(0, 240) : "/classroom",
      locked: screenSync.locked === true,
      updatedAt: typeof screenSync.updatedAt === "string" ? screenSync.updatedAt : null
    },
    whiteboard_strokes: Array.isArray(record.whiteboard_strokes)
      ? record.whiteboard_strokes
          .map(normalizeTeacherOpsWhiteboardStroke)
          .filter((stroke): stroke is WhiteboardStroke => Boolean(stroke))
          .slice(-80)
      : [],
    math_workbench: {
      tool: normalizeTeacherOpsMathWorkbenchTool(mathWorkbench.tool),
      topicId: typeof mathWorkbench.topicId === "string" ? mathWorkbench.topicId : null,
      title: teacherOpsLocalizedFromUnknown(mathWorkbench.title, { en: "Function Graph Explorer", zh: "函數圖像探索器" }),
      parameters: mathWorkbench.parameters && typeof mathWorkbench.parameters === "object" ? mathWorkbench.parameters : {},
      locked: mathWorkbench.locked === true,
      updatedAt: typeof mathWorkbench.updatedAt === "string" ? mathWorkbench.updatedAt : null
    },
    events: Array.isArray(record.events)
      ? record.events
          .filter((event) => typeof event.id === "string" && typeof event.createdAt === "string")
          .map((event): TeacherLiveEvent => {
            const liveEvent: TeacherLiveEvent = {
              id: event.id as string,
              type: normalizeTeacherLiveEventType(event.type),
              label: teacherOpsLocalizedFromUnknown(event.label, { en: "Classroom update", zh: "課堂更新" }),
              createdAt: event.createdAt as string
            };
            if (typeof event.studentId === "string") liveEvent.studentId = event.studentId;
            if (typeof event.studentName === "string") liveEvent.studentName = event.studentName;
            return liveEvent;
          })
          .slice(-30)
      : [],
    updated_at: typeof record.updated_at === "string" ? record.updated_at : now
  };
}

export function appendTeacherOpsLiveToolEvent(
  record: TeacherOpsLiveSessionToolStateRecord,
  createId: () => string,
  type: TeacherLiveToolType | "session",
  label: LocalizedText,
  nowIso: string,
  student?: { id: string; name: string }
) {
  record.events.push({
    id: `live-event-${createId()}`,
    type,
    label,
    studentId: student?.id,
    studentName: student?.name,
    createdAt: nowIso
  });
  record.events = record.events.slice(-30);
  record.updated_at = nowIso;
}

export function teacherOpsClassroomWorkSampleFromRecord({
  database,
  sample,
  studentNameForLiveAction,
  mediaObjectUrlFromKey,
  normalizeObjectKey
}: {
  database: TeacherOpsLiveSessionPersistenceDatabase;
  sample: TeacherOpsLiveSessionClassroomWorkSampleRecord;
  studentNameForLiveAction: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    studentId: string
  ) => string;
  mediaObjectUrlFromKey: (value: unknown) => string | undefined;
  normalizeObjectKey: (value: unknown) => string | undefined;
}): ClassroomWorkSample {
  const imageUrl = mediaObjectUrlFromKey(sample.image_object_key);
  return {
    id: sample.id,
    sessionId: sample.session_id,
    studentId: sample.student_id,
    studentName: studentNameForLiveAction(database, sample.student_id),
    imageDataUrl: imageUrl ?? sample.image_data_url ?? "",
    imageObjectKey: normalizeObjectKey(sample.image_object_key),
    imageUrl,
    caption: sample.caption,
    status: sample.status,
    createdAt: sample.created_at,
    selectedAt: sample.selected_at
  };
}

export function teacherOpsClassroomWorkSamplesForSession({
  database,
  sessionId,
  studentNameForLiveAction,
  mediaObjectUrlFromKey,
  normalizeObjectKey
}: {
  database: TeacherOpsLiveSessionPersistenceDatabase;
  sessionId: string;
  studentNameForLiveAction: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    studentId: string
  ) => string;
  mediaObjectUrlFromKey: (value: unknown) => string | undefined;
  normalizeObjectKey: (value: unknown) => string | undefined;
}): ClassroomWorkSample[] {
  return database.classroom_work_samples
    .filter((sample) => sample.session_id === sessionId && sample.status !== "hidden")
    .sort((a, b) => {
      const aSelected = a.status === "selected" ? 0 : 1;
      const bSelected = b.status === "selected" ? 0 : 1;
      return aSelected - bSelected || b.created_at.localeCompare(a.created_at);
    })
    .map((sample) => teacherOpsClassroomWorkSampleFromRecord({
      database,
      sample,
      studentNameForLiveAction,
      mediaObjectUrlFromKey,
      normalizeObjectKey
    }));
}

export function teacherOpsTeacherLiveSessionFromRecord({
  database,
  session,
  livePromptFromRecord,
  liveResponseSummary,
  studentIdsForClass,
  studentNameForLiveAction,
  mediaObjectUrlFromKey,
  normalizeObjectKey,
  nowIso,
  nowMs,
  createId
}: {
  database: TeacherOpsLiveSessionPersistenceDatabase;
  session: TeacherOpsLiveSessionRecord;
  livePromptFromRecord: (prompt: TeacherOpsLiveSessionPromptRecord) => TeacherLiveSession["currentPrompt"];
  liveResponseSummary: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    prompt: TeacherOpsLiveSessionPromptRecord
  ) => TeacherLiveSession["responseSummary"];
  studentIdsForClass: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    classId: string
  ) => string[];
  studentNameForLiveAction: (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    studentId: string
  ) => string;
  mediaObjectUrlFromKey: (value: unknown) => string | undefined;
  normalizeObjectKey: (value: unknown) => string | undefined;
  nowIso: string;
  nowMs?: number;
  createId?: () => string;
}): TeacherLiveSession | null {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === session.class_id);
  const prompt = database.teacher_live_prompts.find((candidate) => candidate.id === session.current_prompt_id);
  if (!teacherClass || !prompt) return null;

  const workSamples = teacherOpsClassroomWorkSamplesForSession({
    database,
    sessionId: session.id,
    studentNameForLiveAction,
    mediaObjectUrlFromKey,
    normalizeObjectKey
  });

  return {
    id: session.id,
    classId: session.class_id,
    className: teacherClass.name,
    grade: teacherClass.grade,
    status: session.status,
    title: { en: session.title_en ?? "", zh: session.title_zh ?? session.title_en ?? "" },
    lessonTitle: { en: session.lesson_title_en ?? "", zh: session.lesson_title_zh ?? session.lesson_title_en ?? "" },
    lessonSlug: session.lesson_slug,
    topicId: session.topic_id,
    topicTitle: session.topic_title_en || session.topic_title_zh
      ? {
          en: session.topic_title_en ?? session.topic_id ?? "",
          zh: session.topic_title_zh ?? session.topic_title_en ?? session.topic_id ?? ""
        }
      : undefined,
    visualizationTitle: {
      en: session.visualization_title_en ?? "",
      zh: session.visualization_title_zh ?? session.visualization_title_en ?? ""
    },
    joinCode: session.join_code,
    startedAt: session.started_at ?? session.created_at ?? session.updated_at,
    endedAt: session.ended_at,
    currentPrompt: livePromptFromRecord(prompt),
    studentCount: studentIdsForClass(database, session.class_id).length,
    responseSummary: liveResponseSummary(database, prompt),
    lessonKitId: session.lesson_kit_id,
    slideSections: teacherOpsLessonKitSlideSectionsForSession(database, session.id),
    workSamples,
    toolState: teacherOpsLiveToolStateForSession({
      database,
      session,
      nowIso,
      nowMs,
      studentIdsForClass,
      studentNameForLiveAction,
      createId
    })
  };
}

export function createTeacherOpsLiveSessionPersistenceStore({
  createLiveToolStateRecord,
  createId = randomUUID,
  defaultMathWorkbenchState,
  defaultPromptOptions,
  defaultRandomCallState,
  defaultScreenSyncState,
  ensureLiveToolStateRecord,
  mediaObjectKeyFromPayload,
  mutateDatabase,
  normalizeWhiteboardStroke,
  now = () => new Date(),
  readDatabase,
  resolveLiveSessionContext,
  studentIdsForClass,
  studentNameForLiveAction,
  timerForClient,
  toClass,
  toClassroomLiveSession,
  toLiveSession
}: TeacherOpsLiveSessionPersistenceStoreDependencies) {
  return {
    async getClassroomLiveSessionForStudent(userId: string, joinCode: string): Promise<ClassroomLiveSession | null> {
      const database = await readDatabase();
      const normalizedCode = joinCode.trim().toUpperCase();
      const session = database.teacher_live_sessions.find(
        (candidate) =>
          candidate.join_code.toUpperCase() === normalizedCode &&
          candidate.status === "active" &&
          candidate.ended_at === null
      );
      if (!session) return null;

      const enrolled = database.class_enrollments.some(
        (enrollment) => enrollment.class_id === session.class_id && enrollment.student_id === userId
      );
      if (!enrolled) return null;

      const teacherSession = toLiveSession(database, session);
      if (!teacherSession) return null;
      const response = database.teacher_live_responses.find(
        (candidate) =>
          candidate.student_id === userId &&
          candidate.session_id === session.id &&
          candidate.prompt_id === session.current_prompt_id
      );

      return toClassroomLiveSession(database, {
        teacherSession,
        viewerMode: "student",
        viewerStudentId: userId,
        response
      });
    },
    async getClassroomLiveSessionForTeacherPreview(
      userId: string,
      joinCode: string
    ): Promise<ClassroomLiveSession | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user || !canUseTeacherArea(user)) return null;

      const normalizedCode = joinCode.trim().toUpperCase();
      const session = database.teacher_live_sessions.find(
        (candidate) => candidate.join_code.toUpperCase() === normalizedCode
      );
      if (!session || !teacherCanAccessClass(database, user, session.class_id)) return null;

      const teacherSession = toLiveSession(database, session);
      if (!teacherSession) return null;

      return toClassroomLiveSession(database, {
        teacherSession,
        viewerMode: "teacher-preview"
      });
    },
    async endTeacherLiveSession({
      teacherId,
      sessionId
    }: {
      teacherId: string;
      sessionId: string;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const session = database.teacher_live_sessions.find((candidate) => candidate.id === sessionId);
        if (!session || !teacherCanAccessClass(database, user, session.class_id)) {
          return { status: "not-found" as const };
        }

        const nowIso = now().toISOString();
        session.status = "ended";
        session.ended_at = nowIso;
        session.updated_at = nowIso;

        return { status: "ended" as const, session: toLiveSession(database, session) };
      });
    },
    async getTeacherLiveData(userId: string): Promise<TeacherLiveData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const classRecords = teacherClassRecordsFor(database, user);
      const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
      const sessions = database.teacher_live_sessions
        .filter((session) => classIds.has(session.class_id))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((session) => toLiveSession(database, session))
        .filter((session): session is TeacherLiveSession => Boolean(session));

      return {
        generatedAt: now().toISOString(),
        classes: classRecords.map((teacherClass) => toClass(database, teacherClass)),
        activeSession: sessions.find((session) => session.status === "active") ?? sessions[0] ?? null,
        recentSessions: sessions.slice(0, 6)
      };
    },
    async startTeacherLiveSession({
      teacherId,
      classId,
      promptType,
      question,
      correctOptionId,
      topicId
    }: {
      teacherId: string;
      classId: string;
      promptType: TeacherLivePromptType;
      question: string;
      correctOptionId?: string;
      topicId?: string;
    }) {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion) return { status: "invalid" as const };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const teacherClass = teacherCanAccessClass(database, user, classId);
        if (!teacherClass) return { status: "not-found" as const };

        const nowIso = now().toISOString();
        const sessionContext = resolveLiveSessionContext(database, teacherClass, topicId);
        const sessionId = `live-${createId()}`;
        const promptId = `live-prompt-${createId()}`;
        const options = defaultPromptOptions(promptType);
        const correct = promptType === "poll" && correctOptionId && options.some((option) => option.id === correctOptionId)
          ? correctOptionId
          : promptType === "poll"
            ? options[0]?.id
            : undefined;

        database.teacher_live_sessions
          .filter((session) => session.class_id === classId && session.status === "active")
          .forEach((session) => {
            session.status = "ended";
            session.ended_at = nowIso;
            session.updated_at = nowIso;
          });

        const sessionRecord: TeacherOpsLiveSessionRecord = {
          id: sessionId,
          class_id: classId,
          teacher_id: user.id,
          status: "active",
          title_en: `${teacherClass.name} live check`,
          title_zh: `${teacherClass.name} 即時課堂檢查`,
          lesson_slug: sessionContext.lessonSlug,
          lesson_title_en: sessionContext.lessonTitle.en,
          lesson_title_zh: sessionContext.lessonTitle.zh,
          topic_id: sessionContext.topicId,
          topic_title_en: sessionContext.topicTitle?.en,
          topic_title_zh: sessionContext.topicTitle?.zh,
          visualization_title_en: sessionContext.visualizationTitle.en,
          visualization_title_zh: sessionContext.visualizationTitle.zh,
          join_code: generateTeacherOpsLiveJoinCode(database, teacherClass, createId, now),
          current_prompt_id: promptId,
          started_at: nowIso,
          ended_at: null,
          created_at: nowIso,
          updated_at: nowIso
        };

        database.teacher_live_sessions.unshift(sessionRecord);
        database.teacher_live_prompts.push({
          id: promptId,
          session_id: sessionId,
          type: promptType,
          question_en: trimmedQuestion,
          question_zh: trimmedQuestion,
          options,
          correct_option_id: correct,
          created_at: nowIso
        });
        database.teacher_live_tool_states.push(createLiveToolStateRecord(database, sessionRecord, nowIso));

        const session = toLiveSession(database, sessionRecord);
        return session ? { status: "started" as const, session } : { status: "invalid" as const };
      });
    },
    async getTeacherLiveSessionById(userId: string, sessionId: string): Promise<TeacherLiveSession | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const session = database.teacher_live_sessions.find((candidate) => candidate.id === sessionId);
      if (!session || !teacherCanAccessClass(database, user, session.class_id)) return null;

      return toLiveSession(database, session);
    },
    async submitClassroomLiveResponse({
      userId,
      sessionId,
      promptId,
      answer
    }: {
      userId: string;
      sessionId: string;
      promptId: string;
      answer: string;
    }) {
      const trimmedAnswer = answer.trim();
      if (!trimmedAnswer) return { status: "invalid" as const };

      return mutateDatabase((database) => {
        const session = database.teacher_live_sessions.find((candidate) => candidate.id === sessionId);
        const prompt = database.teacher_live_prompts.find(
          (candidate) => candidate.id === promptId && candidate.session_id === sessionId
        );
        if (!session || !prompt || session.status !== "active") return { status: "not-found" as const };

        const enrolled = database.class_enrollments.some(
          (enrollment) => enrollment.class_id === session.class_id && enrollment.student_id === userId
        );
        if (!enrolled) return { status: "forbidden" as const };

        const option = prompt.options.find((candidate) => candidate.id === trimmedAnswer);
        const storedAnswer = option?.id ?? trimmedAnswer;
        const isCorrect = prompt.correct_option_id ? storedAnswer === prompt.correct_option_id : null;
        const nowIso = now().toISOString();
        const existing = database.teacher_live_responses.find(
          (candidate) =>
            candidate.session_id === sessionId &&
            candidate.prompt_id === promptId &&
            candidate.student_id === userId
        );

        if (existing) {
          existing.answer = storedAnswer;
          existing.is_correct = isCorrect;
          existing.submitted_at = nowIso;
        } else {
          database.teacher_live_responses.push({
            id: `live-response-${createId()}`,
            session_id: sessionId,
            prompt_id: promptId,
            student_id: userId,
            answer: storedAnswer,
            is_correct: isCorrect,
            submitted_at: nowIso
          });
        }

        session.updated_at = nowIso;
        return { status: "submitted" as const, session: toLiveSession(database, session) };
      });
    },
    async updateTeacherLiveTool({
      teacherId,
      sessionId,
      action,
      payload
    }: {
      teacherId: string;
      sessionId: string;
      action: string;
      payload?: unknown;
    }) {
      const toolPayload = teacherOpsLivePayloadObject(payload);

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const session = database.teacher_live_sessions.find((candidate) => candidate.id === sessionId);
        if (!session || !teacherCanAccessClass(database, user, session.class_id)) return { status: "not-found" as const };
        if (session.status !== "active") return { status: "not-found" as const };

        const nowIso = now().toISOString();
        const record = ensureLiveToolStateRecord(database, session, nowIso);

        if (action === "attendance-open") {
          record.active_tool = "attendance";
          appendTeacherOpsLiveToolEvent(record, createId, "attendance", { en: "Attendance opened", zh: "已開啟考勤" }, nowIso);
        } else if (action === "attendance-set") {
          const studentId = teacherOpsPayloadString(toolPayload, "studentId");
          const status = isValidAttendanceStatus(toolPayload.status) ? toolPayload.status : null;
          const entry = record.attendance.find((candidate) => candidate.studentId === studentId);
          if (!entry || !status) return { status: "invalid" as const };
          entry.status = status;
          entry.checkedInAt = status === "present" && !entry.checkedInAt ? nowIso : entry.checkedInAt;
          entry.updatedAt = nowIso;
          record.active_tool = "attendance";
          appendTeacherOpsLiveToolEvent(
            record,
            createId,
            "attendance",
            { en: `${entry.studentName}: ${status}`, zh: `${entry.studentName}: ${status}` },
            nowIso,
            { id: entry.studentId, name: entry.studentName }
          );
        } else if (action === "random-call") {
          const allowRepeats = teacherOpsPayloadBoolean(toolPayload, "allowRepeats", record.random_call.allowRepeats);
          record.random_call.allowRepeats = allowRepeats;
          const selected = chooseTeacherOpsRandomCallableStudent(record);
          if (!selected) return { status: "invalid" as const };
          record.random_call.currentStudentId = selected.studentId;
          record.random_call.currentStudentName = selected.studentName;
          record.random_call.updatedAt = nowIso;
          if (!record.random_call.selectedStudentIds.includes(selected.studentId)) {
            record.random_call.selectedStudentIds.push(selected.studentId);
          }
          record.active_tool = "random-call";
          appendTeacherOpsLiveToolEvent(
            record,
            createId,
            "random-call",
            { en: `Called ${selected.studentName}`, zh: `點名 ${selected.studentName}` },
            nowIso,
            { id: selected.studentId, name: selected.studentName }
          );
        } else if (action === "random-call-reset") {
          record.random_call = defaultRandomCallState(nowIso);
          record.active_tool = "random-call";
          appendTeacherOpsLiveToolEvent(
            record,
            createId,
            "random-call",
            { en: "Random call history reset", zh: "已重設隨機點名紀錄" },
            nowIso
          );
        } else if (action === "buzzer-open") {
          record.buzzer = {
            id: `buzzer-${createId()}`,
            status: "open",
            openedAt: nowIso,
            closedAt: null,
            entries: []
          };
          record.active_tool = "buzzer";
          appendTeacherOpsLiveToolEvent(record, createId, "buzzer", { en: "Buzzer round opened", zh: "搶答已開始" }, nowIso);
        } else if (action === "buzzer-close") {
          record.buzzer.status = "closed";
          record.buzzer.closedAt = nowIso;
          record.active_tool = "buzzer";
          appendTeacherOpsLiveToolEvent(record, createId, "buzzer", { en: "Buzzer round closed", zh: "搶答已結束" }, nowIso);
        } else if (action === "timer-start") {
          const mode = toolPayload.mode === "stopwatch" ? "stopwatch" : "countdown";
          const durationSeconds = teacherOpsBoundedPayloadNumber(toolPayload, "durationSeconds", 180, 0, 7200);
          record.timer = {
            mode,
            status: "running",
            durationSeconds,
            remainingSeconds: mode === "countdown" ? durationSeconds : 0,
            startedAt: nowIso,
            pausedAt: null,
            updatedAt: nowIso
          };
          record.active_tool = "timer";
          appendTeacherOpsLiveToolEvent(record, createId, "timer", { en: "Timer started", zh: "計時器已開始" }, nowIso);
        } else if (action === "timer-pause") {
          record.timer = { ...timerForClient(record.timer), status: "paused", startedAt: null, pausedAt: nowIso, updatedAt: nowIso };
          record.active_tool = "timer";
          appendTeacherOpsLiveToolEvent(record, createId, "timer", { en: "Timer paused", zh: "計時器已暫停" }, nowIso);
        } else if (action === "timer-resume") {
          record.timer = { ...record.timer, status: "running", startedAt: nowIso, pausedAt: null, updatedAt: nowIso };
          record.active_tool = "timer";
          appendTeacherOpsLiveToolEvent(record, createId, "timer", { en: "Timer resumed", zh: "計時器已繼續" }, nowIso);
        } else if (action === "timer-stop") {
          record.timer = { ...timerForClient(record.timer), status: "ended", startedAt: null, pausedAt: null, updatedAt: nowIso };
          record.active_tool = "timer";
          appendTeacherOpsLiveToolEvent(record, createId, "timer", { en: "Timer ended", zh: "計時器已結束" }, nowIso);
        } else if (action === "teams-auto") {
          const teamCount = teacherOpsBoundedPayloadNumber(toolPayload, "teamCount", 4, 2, 8);
          const students = studentIdsForClass(database, session.class_id);
          const teams = Array.from({ length: teamCount }, (_, index) => ({
            id: `team-${index + 1}`,
            name: { en: `Team ${index + 1}`, zh: `第 ${index + 1} 組` },
            studentIds: [] as string[],
            score: 0
          }));
          students.forEach((studentId, index) => teams[index % teamCount]?.studentIds.push(studentId));
          record.teams = { teams, updatedAt: nowIso };
          record.active_tool = "teams";
          appendTeacherOpsLiveToolEvent(record, createId, "teams", { en: "Teams created", zh: "已建立分組" }, nowIso);
        } else if (action === "team-score") {
          const teamId = teacherOpsPayloadString(toolPayload, "teamId");
          const delta = teacherOpsBoundedPayloadNumber(toolPayload, "delta", 0, -100, 100);
          const team = record.teams.teams.find((candidate) => candidate.id === teamId);
          if (!team || delta === 0) return { status: "invalid" as const };
          team.score += delta;
          record.teams.updatedAt = nowIso;
          record.active_tool = "teams";
          appendTeacherOpsLiveToolEvent(
            record,
            createId,
            "teams",
            { en: `${team.name.en} ${delta > 0 ? "+" : ""}${delta}`, zh: `${team.name.zh} ${delta > 0 ? "+" : ""}${delta}` },
            nowIso
          );
        } else if (action === "projector-set") {
          record.projection = {
            mode: normalizeTeacherOpsProjectionMode(toolPayload.mode),
            showNames: teacherOpsPayloadBoolean(toolPayload, "showNames", record.projection.showNames),
            selectedWorkSampleId: teacherOpsPayloadString(toolPayload, "selectedWorkSampleId") || null,
            updatedAt: nowIso
          };
          record.active_tool = "projector";
          appendTeacherOpsLiveToolEvent(record, createId, "projector", { en: "Projection updated", zh: "已更新上屏" }, nowIso);
        } else if (action === "screen-sync") {
          const target = normalizeTeacherOpsLiveTarget(toolPayload.target);
          const titleText = teacherOpsPayloadString(toolPayload, "title");
          const href = teacherOpsPayloadString(toolPayload, "href");
          record.screen_sync = {
            target,
            title: titleText ? { en: titleText, zh: titleText } : defaultScreenSyncState(nowIso).title,
            href: href || `/classroom?code=${encodeURIComponent(session.join_code)}`,
            locked: teacherOpsPayloadBoolean(toolPayload, "locked", true),
            updatedAt: nowIso
          };
          record.active_tool = "screen-sync";
          appendTeacherOpsLiveToolEvent(record, createId, "screen-sync", { en: "Student screens synced", zh: "已同步學生畫面" }, nowIso);
        } else if (action === "whiteboard-open") {
          record.active_tool = "whiteboard";
          record.screen_sync = {
            target: "whiteboard",
            title: { en: "Whiteboard", zh: "白板" },
            href: `/classroom?code=${encodeURIComponent(session.join_code)}`,
            locked: true,
            updatedAt: nowIso
          };
          appendTeacherOpsLiveToolEvent(record, createId, "whiteboard", { en: "Whiteboard opened", zh: "已開啟白板" }, nowIso);
        } else if (action === "whiteboard-add-stroke") {
          const points = Array.isArray(toolPayload.points) ? toolPayload.points : [];
          const stroke = normalizeWhiteboardStroke({
            id: `stroke-${createId()}`,
            tool: toolPayload.tool === "highlighter" ? "highlighter" : "pen",
            color: teacherOpsPayloadString(toolPayload, "color") || "#0891b2",
            width: teacherOpsBoundedPayloadNumber(toolPayload, "width", 4, 1, 18),
            points,
            createdAt: nowIso
          });
          if (!stroke || stroke.points.length < 2) return { status: "invalid" as const };
          record.whiteboard_strokes.push(stroke);
          record.whiteboard_strokes = record.whiteboard_strokes.slice(-80);
          record.active_tool = "whiteboard";
          appendTeacherOpsLiveToolEvent(
            record,
            createId,
            "whiteboard",
            { en: "Whiteboard annotation added", zh: "已加入白板批注" },
            nowIso
          );
        } else if (action === "whiteboard-undo") {
          record.whiteboard_strokes.pop();
          record.active_tool = "whiteboard";
          appendTeacherOpsLiveToolEvent(record, createId, "whiteboard", { en: "Whiteboard undo", zh: "已撤銷白板批注" }, nowIso);
        } else if (action === "whiteboard-clear") {
          record.whiteboard_strokes = [];
          record.active_tool = "whiteboard";
          appendTeacherOpsLiveToolEvent(record, createId, "whiteboard", { en: "Whiteboard cleared", zh: "已清空白板" }, nowIso);
        } else if (action === "math-workbench-set") {
          const title = teacherOpsPayloadString(toolPayload, "title");
          const parameters = toolPayload.parameters && typeof toolPayload.parameters === "object" && !Array.isArray(toolPayload.parameters)
            ? toolPayload.parameters as Record<string, number | string | boolean>
            : defaultMathWorkbenchState(nowIso).parameters;
          record.math_workbench = {
            tool: normalizeTeacherOpsMathWorkbenchTool(toolPayload.tool),
            topicId: (teacherOpsPayloadString(toolPayload, "topicId") || session.topic_id) ?? null,
            title: title ? { en: title, zh: title } : defaultMathWorkbenchState(nowIso).title,
            parameters,
            locked: teacherOpsPayloadBoolean(toolPayload, "locked", true),
            updatedAt: nowIso
          };
          record.active_tool = "math-workbench";
          appendTeacherOpsLiveToolEvent(
            record,
            createId,
            "math-workbench",
            { en: "Math workbench pushed", zh: "已推送數學工具" },
            nowIso
          );
        } else {
          return { status: "invalid" as const };
        }

        record.updated_at = nowIso;
        session.updated_at = nowIso;
        return { status: "updated" as const, session: toLiveSession(database, session) };
      });
    },
    async submitClassroomLiveAction({
      userId,
      sessionId,
      action,
      payload
    }: {
      userId: string;
      sessionId: string;
      action: string;
      payload?: unknown;
    }) {
      const toolPayload = teacherOpsLivePayloadObject(payload);

      return mutateDatabase((database) => {
        const session = database.teacher_live_sessions.find((candidate) => candidate.id === sessionId);
        if (!session || session.status !== "active") return { status: "not-found" as const };

        const enrolled = database.class_enrollments.some(
          (enrollment) => enrollment.class_id === session.class_id && enrollment.student_id === userId
        );
        if (!enrolled) return { status: "forbidden" as const };

        const nowIso = now().toISOString();
        const studentName = studentNameForLiveAction(database, userId);
        const record = ensureLiveToolStateRecord(database, session, nowIso);

        if (action === "attendance-check-in") {
          const entry = record.attendance.find((candidate) => candidate.studentId === userId);
          if (!entry) return { status: "not-found" as const };
          entry.status = "present";
          entry.checkedInAt = entry.checkedInAt ?? nowIso;
          entry.updatedAt = nowIso;
          record.active_tool = "attendance";
          appendTeacherOpsLiveToolEvent(
            record,
            createId,
            "attendance",
            { en: `${studentName} checked in`, zh: `${studentName} 已簽到` },
            nowIso,
            { id: userId, name: studentName }
          );
        } else if (action === "buzzer-submit") {
          if (record.buzzer.status !== "open") return { status: "invalid" as const };
          if (!record.buzzer.entries.some((entry) => entry.studentId === userId)) {
            record.buzzer.entries.push({
              studentId: userId,
              studentName,
              submittedAt: nowIso,
              rank: record.buzzer.entries.length + 1
            });
          }
          record.active_tool = "buzzer";
          appendTeacherOpsLiveToolEvent(
            record,
            createId,
            "buzzer",
            { en: `${studentName} buzzed`, zh: `${studentName} 已搶答` },
            nowIso,
            { id: userId, name: studentName }
          );
        } else if (action === "screen-ack") {
          appendTeacherOpsLiveToolEvent(
            record,
            createId,
            "screen-sync",
            { en: `${studentName} synced`, zh: `${studentName} 已同步` },
            nowIso,
            { id: userId, name: studentName }
          );
        } else if (action === "work-sample-submit") {
          const imageDataUrl = teacherOpsPayloadString(toolPayload, "imageDataUrl");
          const cleanImageDataUrl = imageDataUrl.startsWith("data:image/") && imageDataUrl.length <= 700000
            ? imageDataUrl
            : undefined;
          const imageObjectKey = mediaObjectKeyFromPayload(toolPayload.imageObject);
          if (!cleanImageDataUrl && !imageObjectKey) return { status: "invalid" as const };

          database.classroom_work_samples.push({
            id: `work-sample-${createId()}`,
            session_id: session.id,
            student_id: userId,
            ...(cleanImageDataUrl ? { image_data_url: cleanImageDataUrl } : {}),
            ...(imageObjectKey ? { image_object_key: imageObjectKey } : {}),
            caption: teacherOpsPayloadString(toolPayload, "caption").slice(0, 240),
            status: "submitted",
            created_at: nowIso,
            selected_at: null
          });
          record.active_tool = "projector";
          appendTeacherOpsLiveToolEvent(
            record,
            createId,
            "projector",
            { en: `${studentName} submitted work`, zh: `${studentName} 已提交作答` },
            nowIso,
            { id: userId, name: studentName }
          );
        } else {
          return { status: "invalid" as const };
        }

        record.updated_at = nowIso;
        session.updated_at = nowIso;
        const teacherSession = toLiveSession(database, session);
        const response = database.teacher_live_responses.find(
          (candidate) =>
            candidate.student_id === userId &&
            candidate.session_id === session.id &&
            candidate.prompt_id === session.current_prompt_id
        );
        return teacherSession
          ? {
              status: "updated" as const,
              session: toClassroomLiveSession(database, {
                teacherSession,
                viewerMode: "student",
                viewerStudentId: userId,
                response
              })
            }
          : { status: "not-found" as const };
      });
    }
  };
}
