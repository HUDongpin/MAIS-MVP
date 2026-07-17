import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import * as teacherOpsLiveSessionPersistence from "@/lib/server/userStore/teacherOpsLiveSessionPersistence";
import {
  createTeacherOpsLiveSessionPersistenceStore,
  type TeacherOpsLiveSessionPersistenceDatabase,
  type TeacherOpsLiveSessionToolStateRecord
} from "@/lib/server/userStore/teacherOpsLiveSessionPersistence";
import type {
  ClassroomWorkSample,
  ClassroomLiveSession,
  LocalizedText,
  MathWorkbenchState,
  TeacherClass,
  TeacherLiveAttendanceEntry,
  TeacherLiveProjectionState,
  TeacherLiveScreenSyncState,
  TeacherLiveSession,
  TeacherLivePromptType,
  TeacherLiveToolState,
  TimerState,
  WhiteboardStroke
} from "@/types";

const fixedNow = "2026-06-21T08:00:00.000Z";

type TeacherOpsLiveSessionSeedBoundaryModule = {
  normalizeTeacherOpsLiveSessionCollections?: (
    collections: {
      teacher_live_prompts?: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_prompts"];
      teacher_live_responses?: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_responses"];
      teacher_live_sessions?: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_sessions"];
    },
    now: string,
    options: {
      demoTeacherId: string;
      demoUserId: string;
      shouldSeedDemoUser: () => boolean;
    }
  ) => {
    teacher_live_prompts: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_prompts"];
    teacher_live_responses: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_responses"];
    teacher_live_sessions: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_sessions"];
  };
  teacherOpsSeedTeacherLiveSessionRecords?: (
    now: string,
    options: {
      demoTeacherId: string;
      shouldSeedDemoUser: () => boolean;
    }
  ) => TeacherOpsLiveSessionPersistenceDatabase["teacher_live_sessions"];
  teacherOpsSeedTeacherLivePromptRecords?: (
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
    }
  ) => TeacherOpsLiveSessionPersistenceDatabase["teacher_live_prompts"];
  teacherOpsSeedTeacherLiveResponseRecords?: (
    now: string,
    options: {
      demoUserId: string;
      shouldSeedDemoUser: () => boolean;
    }
  ) => TeacherOpsLiveSessionPersistenceDatabase["teacher_live_responses"];
};

test("teacher ops live-session persistence owns seed live session, prompt, and response records for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"),
    "utf8"
  );
  const liveModule = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as TeacherOpsLiveSessionSeedBoundaryModule;

  const seedTeacherLiveSessionRecords = liveModule.teacherOpsSeedTeacherLiveSessionRecords;
  const seedTeacherLivePromptRecords = liveModule.teacherOpsSeedTeacherLivePromptRecords;
  const seedTeacherLiveResponseRecords = liveModule.teacherOpsSeedTeacherLiveResponseRecords;
  if (
    typeof seedTeacherLiveSessionRecords !== "function" ||
    typeof seedTeacherLivePromptRecords !== "function" ||
    typeof seedTeacherLiveResponseRecords !== "function"
  ) {
    assert.fail("Expected teacher live seed helpers to be exported");
  }

  assert.match(persistenceSource, /export function teacherOpsSeedTeacherLiveSessionRecords\b/);
  assert.match(persistenceSource, /export function teacherOpsSeedTeacherLivePromptRecords\b/);
  assert.match(persistenceSource, /export function teacherOpsSeedTeacherLiveResponseRecords\b/);
  assert.match(rootSource, /teacherOpsSeedTeacherLiveSessionRecords as seedTeacherLiveSessionsFromTeacherOpsLiveSession/);
  assert.match(rootSource, /teacherOpsSeedTeacherLivePromptRecords as seedTeacherLivePromptsFromTeacherOpsLiveSession/);
  assert.match(rootSource, /teacherOpsSeedTeacherLiveResponseRecords as seedTeacherLiveResponsesFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function seedTeacherLiveSessions\b/);
  assert.doesNotMatch(rootSource, /function seedTeacherLivePrompts\b/);
  assert.doesNotMatch(rootSource, /function seedTeacherLiveResponses\b/);

  assert.deepEqual(
    seedTeacherLiveSessionRecords(fixedNow, {
      demoTeacherId: "teacher-ms-chan",
      shouldSeedDemoUser: () => false
    }),
    []
  );
  assert.deepEqual(
    seedTeacherLivePromptRecords(fixedNow, {
      shouldSeedDemoUser: () => false
    }),
    []
  );
  assert.deepEqual(
    seedTeacherLiveResponseRecords(fixedNow, {
      demoUserId: "student-peter",
      shouldSeedDemoUser: () => false
    }),
    []
  );

  assert.deepEqual(
    seedTeacherLiveSessionRecords(fixedNow, {
      demoTeacherId: "teacher-ms-chan",
      shouldSeedDemoUser: () => true
    }),
    [
      {
        id: "live-s3a-quadratic-check",
        class_id: "class-s3a-2026",
        teacher_id: "teacher-ms-chan",
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
        started_at: fixedNow,
        ended_at: null,
        created_at: fixedNow,
        updated_at: fixedNow
      }
    ]
  );
  assert.deepEqual(
    seedTeacherLivePromptRecords(fixedNow, {
      shouldSeedDemoUser: () => true
    }),
    [
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
        created_at: fixedNow
      }
    ]
  );
  assert.deepEqual(
    seedTeacherLiveResponseRecords(fixedNow, {
      demoUserId: "student-peter",
      shouldSeedDemoUser: () => true
    }),
    [
      {
        id: "live-response-s3a-peter",
        session_id: "live-s3a-quadratic-check",
        prompt_id: "live-prompt-s3a-axis",
        student_id: "student-peter",
        answer: "b",
        is_correct: true,
        submitted_at: fixedNow
      }
    ]
  );
});

test("teacher ops live-session persistence owns live collection normalization for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"),
    "utf8"
  );
  const liveModule = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as TeacherOpsLiveSessionSeedBoundaryModule;

  assert.equal(typeof liveModule.normalizeTeacherOpsLiveSessionCollections, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsLiveSessionCollections\b/);
  assert.match(rootSource, /normalizeTeacherOpsLiveSessionCollections as normalizeTeacherLiveSessionCollectionsFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /\n    teacher_live_sessions: mergeSeedRecordsPreservingExisting\(/);
  assert.doesNotMatch(rootSource, /\n    teacher_live_prompts: mergeSeedRecordsPreservingExisting\(/);
  assert.doesNotMatch(rootSource, /\n    teacher_live_responses: mergeSeedRecordsPreservingExisting\(/);

  const normalized = liveModule.normalizeTeacherOpsLiveSessionCollections?.({
    teacher_live_sessions: [
      {
        id: "live-s3a-quadratic-check",
        class_id: "class-custom",
        teacher_id: "teacher-custom",
        status: "ended",
        join_code: "OLD123",
        current_prompt_id: "live-prompt-s3a-axis",
        ended_at: "2026-06-19T10:00:00.000Z",
        updated_at: "2026-06-19T10:00:00.000Z"
      },
      {
        id: "live-custom",
        class_id: "class-custom",
        teacher_id: "teacher-custom",
        status: "active",
        join_code: "NEW123",
        current_prompt_id: "prompt-custom",
        ended_at: null,
        updated_at: "2026-06-19T11:00:00.000Z"
      }
    ],
    teacher_live_prompts: [
      {
        id: "live-prompt-s3a-axis",
        session_id: "live-s3a-quadratic-check",
        type: "exit-ticket",
        question_en: "Legacy prompt",
        question_zh: "Legacy prompt",
        options: [],
        created_at: "2026-06-19T10:00:00.000Z"
      },
      {
        id: "prompt-custom",
        session_id: "live-custom",
        type: "poll",
        question_en: "Custom prompt",
        question_zh: "Custom prompt",
        options: [],
        created_at: "2026-06-19T11:00:00.000Z"
      }
    ],
    teacher_live_responses: [
      {
        id: "live-response-s3a-peter",
        session_id: "live-s3a-quadratic-check",
        prompt_id: "live-prompt-s3a-axis",
        student_id: "student-custom",
        answer: "legacy",
        is_correct: false,
        submitted_at: "2026-06-19T10:05:00.000Z"
      },
      {
        id: "response-custom",
        session_id: "live-custom",
        prompt_id: "prompt-custom",
        student_id: "student-custom",
        answer: "custom",
        is_correct: null,
        submitted_at: "2026-06-19T11:05:00.000Z"
      }
    ]
  }, fixedNow, {
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    shouldSeedDemoUser: () => true
  });

  assert.deepEqual(normalized?.teacher_live_sessions.map((session) => session.id), [
    "live-s3a-quadratic-check",
    "live-custom"
  ]);
  assert.equal(normalized?.teacher_live_sessions[0]?.teacher_id, "teacher-custom");
  assert.deepEqual(normalized?.teacher_live_prompts.map((prompt) => prompt.id), [
    "live-prompt-s3a-axis",
    "prompt-custom"
  ]);
  assert.equal(normalized?.teacher_live_prompts[0]?.question_en, "Legacy prompt");
  assert.deepEqual(normalized?.teacher_live_responses.map((response) => response.id), [
    "live-response-s3a-peter",
    "response-custom"
  ]);
  assert.equal(normalized?.teacher_live_responses[0]?.student_id, "student-custom");

  assert.deepEqual(liveModule.normalizeTeacherOpsLiveSessionCollections?.({
    teacher_live_sessions: [],
    teacher_live_prompts: [],
    teacher_live_responses: []
  }, fixedNow, {
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    shouldSeedDemoUser: () => false
  }), {
    teacher_live_sessions: [],
    teacher_live_prompts: [],
    teacher_live_responses: []
  });
});

function createDatabase(): TeacherOpsLiveSessionPersistenceDatabase {
  return {
    school_memberships: [
      {
        user_id: "teacher-member",
        class_id: "class-owned",
        role: "teacher"
      }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        name: "Owned class",
        grade: "S2"
      },
      {
        id: "class-other",
        teacher_id: "teacher-2",
        name: "Other class",
        grade: "S1"
      }
    ],
    teacher_live_sessions: [
      {
        id: "session-owned",
        class_id: "class-owned",
        status: "active",
        join_code: "OWN123",
        current_prompt_id: "prompt-owned",
        ended_at: null,
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "session-owned-ended",
        class_id: "class-owned",
        status: "ended",
        join_code: "END123",
        current_prompt_id: "prompt-ended",
        ended_at: "2026-06-20T09:30:00.000Z",
        updated_at: "2026-06-20T09:00:00.000Z"
      },
      {
        id: "session-other",
        class_id: "class-other",
        status: "ended",
        join_code: "OTH123",
        current_prompt_id: "prompt-other",
        ended_at: "2026-06-20T11:30:00.000Z",
        updated_at: "2026-06-20T11:00:00.000Z"
      }
    ],
    teacher_live_prompts: [
      {
        id: "prompt-owned",
        session_id: "session-owned",
        options: [
          { id: "A", label: { en: "A", zh: "A" } },
          { id: "B", label: { en: "B", zh: "B" } }
        ],
        correct_option_id: "B"
      },
      {
        id: "prompt-ended",
        session_id: "session-owned-ended",
        options: [{ id: "done", label: { en: "Done", zh: "Done" } }]
      }
    ],
    teacher_live_responses: [
      {
        id: "response-existing",
        session_id: "session-owned",
        prompt_id: "prompt-owned",
        student_id: "student-1",
        answer: "A",
        is_correct: false,
        submitted_at: "2026-06-20T10:05:00.000Z"
      }
    ],
    teacher_live_tool_states: [
      {
        session_id: "session-owned",
        active_tool: "buzzer",
        attendance: [
          {
            studentId: "student-1",
            studentName: "Ada",
            status: "absent",
            checkedInAt: null,
            updatedAt: "2026-06-20T10:00:00.000Z"
          },
          {
            studentId: "student-2",
            studentName: "Ben",
            status: "absent",
            checkedInAt: null,
            updatedAt: "2026-06-20T10:00:00.000Z"
          }
        ],
        buzzer: {
          id: "buzzer-open",
          status: "open",
          openedAt: "2026-06-20T10:00:00.000Z",
          closedAt: null,
          entries: []
        },
        random_call: {
          currentStudentId: null,
          currentStudentName: null,
          selectedStudentIds: [],
          allowRepeats: false,
          updatedAt: null
        },
        timer: {
          mode: "countdown",
          status: "idle",
          durationSeconds: 180,
          remainingSeconds: 180,
          startedAt: null,
          pausedAt: null,
          updatedAt: null
        },
        teams: {
          teams: [],
          updatedAt: null
        },
        projection: {
          mode: "answers",
          showNames: false,
          selectedWorkSampleId: null,
          updatedAt: null
        },
        screen_sync: {
          target: "classroom",
          title: { en: "Live classroom", zh: "即時課堂" },
          href: "/classroom",
          locked: false,
          updatedAt: null
        },
        whiteboard_strokes: [],
        math_workbench: {
          tool: "function-graph",
          topicId: null,
          title: { en: "Function Graph Explorer", zh: "函數圖像探索器" },
          parameters: { a: 1, b: -2, c: -3 },
          locked: false,
          updatedAt: null
        },
        events: [],
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        session_id: "session-owned-ended",
        active_tool: "buzzer",
        attendance: [],
        buzzer: {
          id: "buzzer-ended",
          status: "closed",
          openedAt: "2026-06-20T09:00:00.000Z",
          closedAt: "2026-06-20T09:10:00.000Z",
          entries: []
        },
        random_call: {
          currentStudentId: null,
          currentStudentName: null,
          selectedStudentIds: [],
          allowRepeats: false,
          updatedAt: null
        },
        timer: {
          mode: "countdown",
          status: "idle",
          durationSeconds: 180,
          remainingSeconds: 180,
          startedAt: null,
          pausedAt: null,
          updatedAt: null
        },
        teams: {
          teams: [],
          updatedAt: null
        },
        projection: {
          mode: "answers",
          showNames: false,
          selectedWorkSampleId: null,
          updatedAt: null
        },
        screen_sync: {
          target: "classroom",
          title: { en: "Live classroom", zh: "即時課堂" },
          href: "/classroom",
          locked: false,
          updatedAt: null
        },
        whiteboard_strokes: [],
        math_workbench: {
          tool: "function-graph",
          topicId: null,
          title: { en: "Function Graph Explorer", zh: "函數圖像探索器" },
          parameters: { a: 1, b: -2, c: -3 },
          locked: false,
          updatedAt: null
        },
        events: [],
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    classroom_work_samples: [],
    topics: [
      {
        id: "topic-s2",
        grade: "S2",
        title_en: "Linear equations",
        title_zh: "一次方程"
      },
      {
        id: "topic-s1",
        grade: "S1",
        title_en: "Numbers",
        title_zh: "數"
      }
    ],
    lessons: [
      {
        slug: "linear-equations",
        topic_id: "topic-s2",
        title_en: "Linear equations lesson",
        title_zh: "一次方程課節"
      }
    ],
    class_enrollments: [
      { class_id: "class-owned", student_id: "student-1" },
      { class_id: "class-owned", student_id: "student-2" },
      { class_id: "class-other", student_id: "student-other" }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "teacher-member", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" },
      { id: "student-other", role: "student" }
    ]
  };
}

function classFixture(
  teacherClass: TeacherOpsLiveSessionPersistenceDatabase["teacher_classes"][number]
): TeacherClass {
  return {
    id: teacherClass.id,
    teacherId: teacherClass.teacher_id,
    name: teacherClass.name,
    grade: teacherClass.grade,
    academicYear: "2026-2027",
    description: { en: teacherClass.name, zh: teacherClass.name },
    studentCount: 2,
    inviteCode: "INVITE",
    createdAt: "2026-06-20T08:00:00.000Z",
    updatedAt: "2026-06-20T08:00:00.000Z"
  };
}

function liveSessionFixture(
  session: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_sessions"][number]
): TeacherLiveSession {
  return {
    id: session.id,
    classId: session.class_id,
    className: session.class_id,
    grade: "S2",
    status: session.status,
    title: { en: session.title_en ?? session.id, zh: session.title_zh ?? session.id },
    lessonTitle: { en: session.lesson_title_en ?? "Lesson", zh: session.lesson_title_zh ?? "Lesson" },
    visualizationTitle: { en: session.visualization_title_en ?? "Visualization", zh: session.visualization_title_zh ?? "Visualization" },
    joinCode: session.join_code,
    startedAt: session.started_at ?? "2026-06-20T08:00:00.000Z",
    endedAt: session.ended_at,
    currentPrompt: {
      id: "prompt-1",
      type: "poll",
      question: { en: "Check", zh: "Check" },
      options: []
    },
    studentCount: 2,
    responseSummary: {
      promptId: "prompt-1",
      totalSubmissions: 0,
      correctCount: 0,
      accuracy: null,
      submittedStudentIds: [],
      submissions: [],
      commonAnswers: [],
      needsReteach: false
    },
    workSamples: [],
    toolState: {
      activeTool: "attendance",
      attendance: [],
      randomCall: {
        currentStudentId: null,
        currentStudentName: null,
        selectedStudentIds: [],
        allowRepeats: false,
        updatedAt: null
      },
      buzzer: {
        id: "buzzer-1",
        status: "idle",
        openedAt: null,
        closedAt: null,
        entries: []
      },
      timer: {
        mode: "countdown",
        status: "idle",
        durationSeconds: 0,
        remainingSeconds: 0,
        startedAt: null,
        pausedAt: null,
        updatedAt: "2026-06-20T08:00:00.000Z"
      },
      teams: {
        teams: [],
        updatedAt: null
      },
      projection: {
        mode: "answers",
        showNames: true,
        selectedWorkSampleId: null,
        updatedAt: null
      },
      screenSync: {
        target: "classroom",
        title: { en: "Classroom", zh: "Classroom" },
        href: "/teacher/live",
        locked: false,
        updatedAt: null
      },
      whiteboard: {
        strokes: [],
        updatedAt: null
      },
      mathWorkbench: {
        tool: "function-graph",
        topicId: null,
        title: { en: "Math workbench", zh: "Math workbench" },
        parameters: {},
        locked: false,
        updatedAt: null
      },
      events: []
    }
  };
}

function classroomLiveSessionFixture({
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
  return {
    id: teacherSession.id,
    className: teacherSession.className,
    status: teacherSession.status,
    title: teacherSession.title,
    lessonTitle: teacherSession.lessonTitle,
    joinCode: teacherSession.joinCode,
    currentPrompt: teacherSession.currentPrompt,
    viewerStudentId,
    viewerMode,
    canSubmit: viewerMode === "student" && teacherSession.status === "active" && !response,
    submitted: Boolean(response),
    submittedAnswer: response?.answer ?? null,
    workSamples: teacherSession.workSamples,
    toolState: teacherSession.toolState
  };
}

test("teacher ops live-session persistence owns live tool default state helpers", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  for (const name of [
    "defaultTeacherOpsRandomCallState",
    "defaultTeacherOpsBuzzerRound",
    "defaultTeacherOpsTimerState",
    "defaultTeacherOpsTeamScoreState",
    "defaultTeacherOpsProjectionState",
    "defaultTeacherOpsScreenSyncState",
    "defaultTeacherOpsMathWorkbenchState"
  ]) {
    assert.equal(typeof helpers[name], "function", `${name} should be exported by teacherOpsLiveSessionPersistence`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
  }

  assert.match(rootSource, /defaultTeacherOpsRandomCallState as defaultRandomCallStateFromTeacherOpsLiveSession/);
  assert.match(rootSource, /defaultTeacherOpsScreenSyncState as defaultScreenSyncStateFromTeacherOpsLiveSession/);
  assert.match(rootSource, /defaultTeacherOpsMathWorkbenchState as defaultMathWorkbenchStateFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function defaultRandomCallState\b/);
  assert.doesNotMatch(rootSource, /function defaultBuzzerRound\b/);
  assert.doesNotMatch(rootSource, /function defaultTimerState\b/);
  assert.doesNotMatch(rootSource, /function defaultTeamScoreState\b/);
  assert.doesNotMatch(rootSource, /function defaultProjectionState\b/);
  assert.doesNotMatch(rootSource, /function defaultScreenSyncState\b/);
  assert.doesNotMatch(rootSource, /function defaultMathWorkbenchState\b/);

  const defaultRandomCallState = helpers.defaultTeacherOpsRandomCallState as (updatedAt?: string | null) => unknown;
  const defaultBuzzerRound = helpers.defaultTeacherOpsBuzzerRound as (createId?: () => string) => unknown;
  const defaultTimerState = helpers.defaultTeacherOpsTimerState as (updatedAt?: string | null) => unknown;
  const defaultTeamScoreState = helpers.defaultTeacherOpsTeamScoreState as (updatedAt?: string | null) => unknown;
  const defaultProjectionState = helpers.defaultTeacherOpsProjectionState as (updatedAt?: string | null) => unknown;
  const defaultScreenSyncState = helpers.defaultTeacherOpsScreenSyncState as (updatedAt?: string | null) => unknown;
  const defaultMathWorkbenchState = helpers.defaultTeacherOpsMathWorkbenchState as (updatedAt?: string | null) => unknown;

  assert.deepEqual(defaultRandomCallState(fixedNow), {
    currentStudentId: null,
    currentStudentName: null,
    selectedStudentIds: [],
    allowRepeats: false,
    updatedAt: fixedNow
  });
  assert.deepEqual(defaultBuzzerRound(() => "fixed-id"), {
    id: "buzzer-fixed-id",
    status: "idle",
    openedAt: null,
    closedAt: null,
    entries: []
  });
  assert.deepEqual(defaultTimerState(fixedNow), {
    mode: "countdown",
    status: "idle",
    durationSeconds: 180,
    remainingSeconds: 180,
    startedAt: null,
    pausedAt: null,
    updatedAt: fixedNow
  });
  assert.deepEqual(defaultTeamScoreState(fixedNow), { teams: [], updatedAt: fixedNow });
  assert.deepEqual(defaultProjectionState(fixedNow), {
    mode: "answers",
    showNames: false,
    selectedWorkSampleId: null,
    updatedAt: fixedNow
  });
  assert.deepEqual(defaultScreenSyncState(fixedNow), {
    target: "classroom",
    title: { en: "Live classroom", zh: "即時課堂" },
    href: "/classroom",
    locked: false,
    updatedAt: fixedNow
  });
  assert.deepEqual(defaultMathWorkbenchState(fixedNow), {
    tool: "function-graph",
    topicId: null,
    title: { en: "Function Graph Explorer", zh: "函數圖像探索器" },
    parameters: { a: 1, b: -2, c: -3 },
    locked: false,
    updatedAt: fixedNow
  });
});

test("teacher ops live-session persistence owns default prompt options helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.defaultTeacherOpsLivePromptOptions,
    "function",
    "defaultTeacherOpsLivePromptOptions should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function defaultTeacherOpsLivePromptOptions\b/);

  const defaultTeacherOpsLivePromptOptions =
    helpers.defaultTeacherOpsLivePromptOptions as (type: TeacherLivePromptType) => unknown;

  assert.deepEqual(defaultTeacherOpsLivePromptOptions("exit-ticket"), [
    { id: "green", label: { en: "Ready to continue", zh: "可以繼續" } },
    { id: "yellow", label: { en: "Need one more example", zh: "需要多一個例子" } },
    { id: "red", label: { en: "Please reteach", zh: "需要重講" } }
  ]);
  assert.deepEqual(defaultTeacherOpsLivePromptOptions("poll"), [
    { id: "a", label: { en: "A", zh: "A" } },
    { id: "b", label: { en: "B", zh: "B" } },
    { id: "c", label: { en: "C", zh: "C" } },
    { id: "d", label: { en: "D", zh: "D" } }
  ]);
  assert.match(rootSource, /defaultTeacherOpsLivePromptOptions as defaultLivePromptOptionsFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function defaultLivePromptOptions\b/);
});

test("teacher ops live-session persistence owns live prompt projection helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsLivePromptFromRecord,
    "function",
    "teacherOpsLivePromptFromRecord should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsLivePromptFromRecord\b/);

  const teacherOpsLivePromptFromRecord = helpers.teacherOpsLivePromptFromRecord as (
    record: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_prompts"][number]
  ) => TeacherLiveSession["currentPrompt"];

  assert.deepEqual(teacherOpsLivePromptFromRecord({
    id: "prompt-exit",
    session_id: "session-owned",
    type: "exit-ticket",
    question_en: "Ready to continue?",
    question_zh: "可以繼續嗎？",
    options: [{ id: "ready", label: { en: "Ready", zh: "可以" } }],
    correct_option_id: "ready"
  }), {
    id: "prompt-exit",
    type: "exit-ticket",
    question: { en: "Ready to continue?", zh: "可以繼續嗎？" },
    options: [{ id: "ready", label: { en: "Ready", zh: "可以" } }],
    correctOptionId: "ready"
  });

  assert.deepEqual(teacherOpsLivePromptFromRecord({
    id: "prompt-minimal",
    session_id: "session-owned",
    options: []
  }), {
    id: "prompt-minimal",
    type: "poll",
    question: { en: "", zh: "" },
    options: [],
    correctOptionId: undefined
  });

  assert.match(rootSource, /teacherOpsLivePromptFromRecord as livePromptFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function livePromptFromRecord\b/);
});

test("teacher ops live-session persistence owns live response summary projection helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsLiveResponseSummaryForPrompt,
    "function",
    "teacherOpsLiveResponseSummaryForPrompt should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsLiveResponseSummaryForPrompt\b/);

  const teacherOpsLiveResponseSummaryForPrompt = helpers.teacherOpsLiveResponseSummaryForPrompt as (input: {
    database: TeacherOpsLiveSessionPersistenceDatabase;
    prompt: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_prompts"][number];
    studentNameForLiveAction: (
      database: TeacherOpsLiveSessionPersistenceDatabase,
      studentId: string
    ) => string;
  }) => TeacherLiveSession["responseSummary"];

  const database = createDatabase();
  const prompt = database.teacher_live_prompts.find((candidate) => candidate.id === "prompt-owned");
  assert.ok(prompt);
  database.teacher_live_responses.push(
    {
      id: "response-correct",
      session_id: "session-owned",
      prompt_id: "prompt-owned",
      student_id: "student-2",
      answer: "B",
      is_correct: true,
      submitted_at: "2026-06-20T10:03:00.000Z"
    },
    {
      id: "response-reteach",
      session_id: "session-owned",
      prompt_id: "prompt-owned",
      student_id: "student-other",
      answer: "A",
      is_correct: false,
      submitted_at: "2026-06-20T10:04:00.000Z"
    },
    {
      id: "response-c",
      session_id: "session-owned",
      prompt_id: "prompt-owned",
      student_id: "student-extra",
      answer: "C",
      is_correct: false,
      submitted_at: "2026-06-20T10:06:00.000Z"
    }
  );

  const summary = teacherOpsLiveResponseSummaryForPrompt({
    database,
    prompt,
    studentNameForLiveAction: (_database, studentId) => ({
      "student-1": "Ada",
      "student-2": "Ben",
      "student-other": "Other Student",
      "student-extra": "Extra Student"
    })[studentId] ?? "Student"
  });

  assert.deepEqual(summary, {
    promptId: "prompt-owned",
    totalSubmissions: 4,
    correctCount: 1,
    accuracy: 25,
    submittedStudentIds: ["student-1", "student-2", "student-other", "student-extra"],
    submissions: [
      {
        studentId: "student-2",
        studentName: "Ben",
        answer: "B",
        isCorrect: true,
        submittedAt: "2026-06-20T10:03:00.000Z"
      },
      {
        studentId: "student-other",
        studentName: "Other Student",
        answer: "A",
        isCorrect: false,
        submittedAt: "2026-06-20T10:04:00.000Z"
      },
      {
        studentId: "student-1",
        studentName: "Ada",
        answer: "A",
        isCorrect: false,
        submittedAt: "2026-06-20T10:05:00.000Z"
      },
      {
        studentId: "student-extra",
        studentName: "Extra Student",
        answer: "C",
        isCorrect: false,
        submittedAt: "2026-06-20T10:06:00.000Z"
      }
    ],
    commonAnswers: [
      { answer: "A", count: 2, isCorrect: false },
      { answer: "B", count: 1, isCorrect: true },
      { answer: "C", count: 1, isCorrect: false }
    ],
    needsReteach: true
  });

  const promptWithoutCorrectOption = database.teacher_live_prompts.find((candidate) => candidate.id === "prompt-ended");
  assert.ok(promptWithoutCorrectOption);
  assert.equal(teacherOpsLiveResponseSummaryForPrompt({
    database,
    prompt: promptWithoutCorrectOption,
    studentNameForLiveAction: () => "Student"
  }).accuracy, null);

  assert.match(rootSource, /teacherOpsLiveResponseSummaryForPrompt as liveResponseSummaryFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function liveResponseSummary\b/);
});

test("teacher ops live-session persistence owns lesson-kit slide-section projection helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsLessonKitSlideSectionsForSession,
    "function",
    "teacherOpsLessonKitSlideSectionsForSession should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsLessonKitSlideSectionsForSession\b/);

  const teacherOpsLessonKitSlideSectionsForSession = helpers.teacherOpsLessonKitSlideSectionsForSession as (
    database: TeacherOpsLiveSessionPersistenceDatabase & {
      teacher_lesson_kits?: Array<{
        id: string;
        sections: NonNullable<TeacherLiveSession["slideSections"]>;
      }>;
    },
    sessionId: string
  ) => TeacherLiveSession["slideSections"];

  const database = createDatabase() as TeacherOpsLiveSessionPersistenceDatabase & {
    teacher_lesson_kits: Array<{
      id: string;
      sections: NonNullable<TeacherLiveSession["slideSections"]>;
    }>;
  };
  const session = database.teacher_live_sessions.find((candidate) => candidate.id === "session-owned");
  assert.ok(session);
  session.lesson_kit_id = "kit-live";
  database.teacher_lesson_kits = [
    {
      id: "kit-live",
      sections: [
        {
          id: "guide-section",
          kind: "learning-guide",
          title: { en: "Guide", zh: "學習單" },
          content: { en: "Guide", zh: "學習單" },
          items: [],
          order: 1
        },
        {
          id: "activity-section",
          kind: "classroom-activity",
          title: { en: "Activity", zh: "活動" },
          content: { en: "Activity", zh: "活動" },
          items: [],
          order: 3
        },
        {
          id: "slides-section",
          kind: "slides",
          title: { en: "Slides", zh: "簡報" },
          content: { en: "Slides", zh: "簡報" },
          items: [],
          order: 2
        },
        {
          id: "blackboard-section",
          kind: "blackboard-design",
          title: { en: "Blackboard", zh: "板書" },
          content: { en: "Blackboard", zh: "板書" },
          items: [],
          order: 4
        },
        {
          id: "homework-section",
          kind: "homework",
          title: { en: "Homework", zh: "功課" },
          content: { en: "Homework", zh: "功課" },
          items: [],
          order: 0
        }
      ]
    }
  ];

  assert.deepEqual(
    teacherOpsLessonKitSlideSectionsForSession(database, "session-owned")?.map((section) => section.id),
    ["slides-section", "activity-section", "blackboard-section"]
  );
  assert.deepEqual(teacherOpsLessonKitSlideSectionsForSession(database, "missing-session"), []);
  session.lesson_kit_id = "missing-kit";
  assert.deepEqual(teacherOpsLessonKitSlideSectionsForSession(database, "session-owned"), []);

  assert.doesNotMatch(rootSource, /function lessonKitSlideSectionsForSession\b/);
  assert.doesNotMatch(rootSource, /lessonKitSlideSectionsForSession: \(sessionDatabase/);
});

test("teacher ops live-session persistence owns live student-name resolution helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsLiveStudentNameFor,
    "function",
    "teacherOpsLiveStudentNameFor should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsLiveStudentNameFor\b/);

  const teacherOpsLiveStudentNameFor = helpers.teacherOpsLiveStudentNameFor as (
    database: TeacherOpsLiveSessionPersistenceDatabase & {
      student_profiles?: Array<{ user_id: string; name: string }>;
      users: Array<{ id: string; role: "student" | "teacher" | "parent" | "admin"; username?: string }>;
    },
    studentId: string
  ) => string;

  const database = createDatabase() as TeacherOpsLiveSessionPersistenceDatabase & {
    student_profiles: Array<{ user_id: string; name: string }>;
    users: Array<{ id: string; role: "student" | "teacher" | "parent" | "admin"; username?: string }>;
  };
  database.student_profiles = [{ user_id: "student-1", name: "Ada Profile" }];
  database.users = [
    ...database.users.map((user) => user.id === "student-2" ? { ...user, username: "ben-login" } : user),
    { id: "student-missing-profile", role: "student", username: "fallback-login" }
  ];

  assert.equal(teacherOpsLiveStudentNameFor(database, "student-1"), "Ada Profile");
  assert.equal(teacherOpsLiveStudentNameFor(database, "student-2"), "ben-login");
  assert.equal(teacherOpsLiveStudentNameFor(database, "student-missing-profile"), "fallback-login");
  assert.equal(teacherOpsLiveStudentNameFor(database, "unknown-student"), "Student");

  assert.match(rootSource, /teacherOpsLiveStudentNameFor as liveStudentNameFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function liveStudentName\b/);
});

test("teacher ops live-session persistence owns live student-id resolution helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsLiveStudentIdsForClass,
    "function",
    "teacherOpsLiveStudentIdsForClass should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsLiveStudentIdsForClass\b/);

  const teacherOpsLiveStudentIdsForClass = helpers.teacherOpsLiveStudentIdsForClass as (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    classId: string
  ) => string[];

  const database = createDatabase();

  assert.deepEqual(teacherOpsLiveStudentIdsForClass(database, "class-owned"), ["student-1", "student-2"]);
  assert.deepEqual(teacherOpsLiveStudentIdsForClass(database, "class-other"), ["student-other"]);
  assert.deepEqual(teacherOpsLiveStudentIdsForClass(database, "missing-class"), []);

  assert.match(rootSource, /teacherOpsLiveStudentIdsForClass as liveStudentIdsForClassFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /studentIdsForClass: \(sessionDatabase, classId\) => teacherStudentIdsForClass\(sessionDatabase as Database, classId\)/);
  assert.doesNotMatch(rootSource, /studentIdsForClass: \(database, classId\) => teacherStudentIdsForClass\(database as Database, classId\),\n\s+studentNameForLiveAction/);
});

test("teacher ops live-session persistence owns live join-code generation helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.generateTeacherOpsLiveJoinCode,
    "function",
    "generateTeacherOpsLiveJoinCode should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function generateTeacherOpsLiveJoinCode\b/);

  const generateTeacherOpsLiveJoinCode = helpers.generateTeacherOpsLiveJoinCode as (
    database: TeacherOpsLiveSessionPersistenceDatabase,
    teacherClass: { grade: string },
    createId?: () => string,
    now?: () => Date
  ) => string;
  const database = createDatabase();
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === "class-owned");
  assert.ok(teacherClass);
  database.teacher_live_sessions.push(
    {
      id: "collision-a",
      class_id: "class-owned",
      status: "active",
      join_code: "S2ABC",
      current_prompt_id: "prompt-a",
      ended_at: null,
      updated_at: fixedNow
    },
    {
      id: "collision-b",
      class_id: "class-owned",
      status: "active",
      join_code: "S2DEF",
      current_prompt_id: "prompt-b",
      ended_at: null,
      updated_at: fixedNow
    }
  );
  const ids = ["abc-ignored", "def-ignored", "ghi-ignored"];

  assert.equal(generateTeacherOpsLiveJoinCode(database, teacherClass, () => ids.shift() ?? "zzz", () => new Date(fixedNow)), "S2GHI");

  const fallbackDatabase = createDatabase();
  const fallbackClass = fallbackDatabase.teacher_classes.find((candidate) => candidate.id === "class-owned");
  assert.ok(fallbackClass);
  fallbackDatabase.teacher_live_sessions.push({
    id: "fallback-collision",
    class_id: "class-owned",
    status: "active",
    join_code: "S2AAA",
    current_prompt_id: "prompt-fallback",
    ended_at: null,
    updated_at: fixedNow
  });
  const fallbackSuffix = new Date(fixedNow).getTime().toString(36).slice(-3).toUpperCase();
  assert.equal(
    generateTeacherOpsLiveJoinCode(fallbackDatabase, fallbackClass, () => "aaa", () => new Date(fixedNow)),
    `S2${fallbackSuffix}`
  );

  assert.match(rootSource, /generateTeacherOpsLiveJoinCode as generateLiveJoinCodeFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function generateJoinCode\b/);
});

test("teacher ops live-session persistence owns client timer projection helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsTimerForClient,
    "function",
    "teacherOpsTimerForClient should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsTimerForClient\b/);

  const teacherOpsTimerForClient = helpers.teacherOpsTimerForClient as (timer: TimerState, nowMs?: number) => TimerState;
  const nowMs = Date.parse("2026-06-21T08:00:00.000Z");
  const runningCountdown: TimerState = {
    mode: "countdown",
    status: "running",
    durationSeconds: 300,
    remainingSeconds: 120,
    startedAt: "2026-06-21T07:59:30.000Z",
    pausedAt: null,
    updatedAt: null
  };
  const runningStopwatch: TimerState = {
    mode: "stopwatch",
    status: "running",
    durationSeconds: 0,
    remainingSeconds: 86_390,
    startedAt: "2026-06-21T07:59:30.000Z",
    pausedAt: null,
    updatedAt: null
  };
  const idleCountdown: TimerState = { ...runningCountdown, status: "idle", startedAt: null };
  const invalidStartedAt: TimerState = { ...runningCountdown, startedAt: "not-a-date" };

  assert.deepEqual(teacherOpsTimerForClient(runningCountdown, nowMs), {
    ...runningCountdown,
    remainingSeconds: 90
  });
  assert.deepEqual(teacherOpsTimerForClient(runningStopwatch, nowMs), {
    ...runningStopwatch,
    remainingSeconds: 86_400
  });
  assert.equal(teacherOpsTimerForClient(idleCountdown, nowMs), idleCountdown);
  assert.equal(teacherOpsTimerForClient(invalidStartedAt, nowMs), invalidStartedAt);

  assert.match(rootSource, /teacherOpsTimerForClient as timerForClientFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function timerForClient\b/);
});

test("teacher ops live-session persistence owns classroom live-session projection helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsClassroomLiveSessionFromTeacherSession,
    "function",
    "teacherOpsClassroomLiveSessionFromTeacherSession should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsClassroomLiveSessionFromTeacherSession\b/);

  const teacherOpsClassroomLiveSessionFromTeacherSession =
    helpers.teacherOpsClassroomLiveSessionFromTeacherSession as (input: {
      teacherSession: TeacherLiveSession;
      viewerMode: ClassroomLiveSession["viewerMode"];
      viewerStudentId?: string;
      response?: { answer: string } | null;
    }) => ClassroomLiveSession;

  const database = createDatabase();
  const sessionRecord = database.teacher_live_sessions.find((session) => session.id === "session-owned");
  assert.ok(sessionRecord);
  const teacherSession = liveSessionFixture(sessionRecord);
  const selectedSample: TeacherLiveSession["workSamples"][number] = {
    id: "sample-selected",
    sessionId: teacherSession.id,
    studentId: "student-1",
    studentName: "Ada",
    imageDataUrl: "data:image/png;base64,selected",
    caption: "Selected work",
    status: "selected",
    createdAt: "2026-06-21T07:50:00.000Z",
    selectedAt: "2026-06-21T07:55:00.000Z"
  };
  const submittedSample: TeacherLiveSession["workSamples"][number] = {
    ...selectedSample,
    id: "sample-submitted",
    studentId: "student-2",
    studentName: "Ben",
    imageDataUrl: "data:image/png;base64,submitted",
    caption: "Submitted work",
    status: "submitted",
    selectedAt: null
  };
  const sessionWithClassroomState: TeacherLiveSession = {
    ...teacherSession,
    workSamples: [submittedSample, selectedSample],
    toolState: {
      ...teacherSession.toolState,
      attendance: [
        {
          studentId: "student-1",
          studentName: "Ada",
          status: "late",
          checkedInAt: "2026-06-21T07:45:00.000Z",
          updatedAt: "2026-06-21T07:45:00.000Z"
        },
        {
          studentId: "student-2",
          studentName: "Ben",
          status: "present",
          checkedInAt: "2026-06-21T07:40:00.000Z",
          updatedAt: "2026-06-21T07:40:00.000Z"
        }
      ]
    }
  };

  const studentProjection = teacherOpsClassroomLiveSessionFromTeacherSession({
    teacherSession: sessionWithClassroomState,
    viewerMode: "student",
    viewerStudentId: "student-1",
    response: { answer: "B" }
  });
  assert.equal(studentProjection.id, sessionWithClassroomState.id);
  assert.equal(studentProjection.attendanceStatus, "late");
  assert.equal(studentProjection.viewerStudentId, "student-1");
  assert.deepEqual(studentProjection.workSamples.map((sample) => sample.id), ["sample-selected"]);
  assert.equal(studentProjection.canSubmit, false);
  assert.equal(studentProjection.submitted, true);
  assert.equal(studentProjection.submittedAnswer, "B");

  assert.equal(
    teacherOpsClassroomLiveSessionFromTeacherSession({
      teacherSession: sessionWithClassroomState,
      viewerMode: "student",
      viewerStudentId: "student-2",
      response: null
    }).canSubmit,
    true
  );

  const teacherPreview = teacherOpsClassroomLiveSessionFromTeacherSession({
    teacherSession: sessionWithClassroomState,
    viewerMode: "teacher-preview"
  });
  assert.equal(teacherPreview.attendanceStatus, undefined);
  assert.deepEqual(teacherPreview.workSamples.map((sample) => sample.id), ["sample-submitted", "sample-selected"]);

  assert.match(rootSource, /teacherOpsClassroomLiveSessionFromTeacherSession as classroomLiveSessionFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function toClassroomLiveSession\b/);
});

test("teacher ops live-session persistence owns default tool-state record factory", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.defaultTeacherOpsLiveToolStateRecordForSession,
    "function",
    "defaultTeacherOpsLiveToolStateRecordForSession should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function defaultTeacherOpsLiveToolStateRecordForSession\b/);

  const defaultTeacherOpsLiveToolStateRecordForSession =
    helpers.defaultTeacherOpsLiveToolStateRecordForSession as (input: {
      database: TeacherOpsLiveSessionPersistenceDatabase;
      session: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_sessions"][number];
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
    }) => TeacherOpsLiveSessionToolStateRecord;

  const database = createDatabase();
  const session = database.teacher_live_sessions.find((candidate) => candidate.id === "session-owned");
  assert.ok(session);
  const record = defaultTeacherOpsLiveToolStateRecordForSession({
    database,
    session,
    nowIso: fixedNow,
    studentIdsForClass: (sessionDatabase, classId) =>
      sessionDatabase.class_enrollments
        .filter((enrollment) => enrollment.class_id === classId)
        .map((enrollment) => enrollment.student_id),
    studentNameForLiveAction: (_database, studentId) =>
      studentId === "student-1" ? "Ada" : studentId === "student-2" ? "Ben" : "Student",
    createId: () => "fixed-id"
  });

  assert.deepEqual(record, {
    session_id: "session-owned",
    active_tool: "attendance",
    attendance: [
      {
        studentId: "student-1",
        studentName: "Ada",
        status: "absent",
        checkedInAt: null,
        updatedAt: fixedNow
      },
      {
        studentId: "student-2",
        studentName: "Ben",
        status: "absent",
        checkedInAt: null,
        updatedAt: fixedNow
      }
    ],
    random_call: {
      currentStudentId: null,
      currentStudentName: null,
      selectedStudentIds: [],
      allowRepeats: false,
      updatedAt: null
    },
    buzzer: {
      id: "buzzer-fixed-id",
      status: "idle",
      openedAt: null,
      closedAt: null,
      entries: []
    },
    timer: {
      mode: "countdown",
      status: "idle",
      durationSeconds: 180,
      remainingSeconds: 180,
      startedAt: null,
      pausedAt: null,
      updatedAt: null
    },
    teams: { teams: [], updatedAt: null },
    projection: {
      mode: "answers",
      showNames: false,
      selectedWorkSampleId: null,
      updatedAt: null
    },
    screen_sync: {
      target: "classroom",
      title: { en: "Live classroom", zh: "即時課堂" },
      href: "/classroom?code=OWN123",
      locked: false,
      updatedAt: null
    },
    whiteboard_strokes: [],
    math_workbench: {
      tool: "function-graph",
      topicId: null,
      title: { en: "Function Graph Explorer", zh: "函數圖像探索器" },
      parameters: { a: 1, b: -2, c: -3 },
      locked: false,
      updatedAt: null
    },
    events: [
      {
        id: "live-event-fixed-id",
        type: "session",
        label: { en: "Live classroom started", zh: "即時課堂已開始" },
        createdAt: fixedNow
      }
    ],
    updated_at: fixedNow
  });

  assert.match(rootSource, /defaultTeacherOpsLiveToolStateRecordForSession as defaultToolStateRecordForSessionFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function defaultToolStateRecordForSession\b/);
});

test("teacher ops live-session persistence owns live attendance projection helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsAttendanceForSession,
    "function",
    "teacherOpsAttendanceForSession should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsAttendanceForSession\b/);

  const teacherOpsAttendanceForSession = helpers.teacherOpsAttendanceForSession as (input: {
    database: TeacherOpsLiveSessionPersistenceDatabase;
    session: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_sessions"][number];
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
  }) => TeacherLiveAttendanceEntry[];

  const database = createDatabase();
  const session = database.teacher_live_sessions.find((candidate) => candidate.id === "session-owned");
  assert.ok(session);
  const attendance = teacherOpsAttendanceForSession({
    database,
    session,
    existing: [
      {
        studentId: "student-1",
        studentName: "Old Ada",
        status: "late",
        checkedInAt: "2026-06-21T07:55:00.000Z",
        updatedAt: "2026-06-21T07:55:00.000Z"
      },
      {
        studentId: "student-removed",
        studentName: "Removed",
        status: "present",
        checkedInAt: "2026-06-21T07:50:00.000Z",
        updatedAt: "2026-06-21T07:50:00.000Z"
      }
    ],
    nowIso: fixedNow,
    studentIdsForClass: (sessionDatabase, classId) =>
      sessionDatabase.class_enrollments
        .filter((enrollment) => enrollment.class_id === classId)
        .map((enrollment) => enrollment.student_id),
    studentNameForLiveAction: (_database, studentId) =>
      studentId === "student-1" ? "Ada Updated" : studentId === "student-2" ? "Ben" : "Student"
  });

  assert.deepEqual(attendance, [
    {
      studentId: "student-1",
      studentName: "Ada Updated",
      status: "late",
      checkedInAt: "2026-06-21T07:55:00.000Z",
      updatedAt: "2026-06-21T07:55:00.000Z"
    },
    {
      studentId: "student-2",
      studentName: "Ben",
      status: "absent",
      checkedInAt: null,
      updatedAt: fixedNow
    }
  ]);

  assert.doesNotMatch(rootSource, /function attendanceForSession\b/);
});

test("teacher ops live-session persistence owns live tool-state projection helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsLiveToolStateForSession,
    "function",
    "teacherOpsLiveToolStateForSession should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsLiveToolStateForSession\b/);

  const teacherOpsLiveToolStateForSession = helpers.teacherOpsLiveToolStateForSession as (input: {
    database: TeacherOpsLiveSessionPersistenceDatabase;
    session: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_sessions"][number];
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
  }) => TeacherLiveToolState;

  const database = createDatabase();
  const session = database.teacher_live_sessions.find((candidate) => candidate.id === "session-owned");
  assert.ok(session);
  const record = database.teacher_live_tool_states.find((candidate) => candidate.session_id === session.id);
  assert.ok(record);
  record.attendance = [
    {
      studentId: "student-1",
      studentName: "Old Ada",
      status: "late",
      checkedInAt: "2026-06-20T10:01:00.000Z",
      updatedAt: "2026-06-20T10:01:00.000Z"
    }
  ];
  record.timer = {
    mode: "countdown",
    status: "running",
    durationSeconds: 180,
    remainingSeconds: 100,
    startedAt: "2026-06-21T07:59:30.000Z",
    pausedAt: null,
    updatedAt: "2026-06-21T07:59:30.000Z"
  };
  record.events = [
    {
      id: "event-old",
      type: "session",
      label: { en: "Old", zh: "舊" },
      createdAt: "2026-06-20T10:00:00.000Z"
    },
    {
      id: "event-new",
      type: "attendance",
      label: { en: "New", zh: "新" },
      createdAt: "2026-06-20T10:02:00.000Z"
    }
  ];

  const projected = teacherOpsLiveToolStateForSession({
    database,
    session,
    nowIso: fixedNow,
    nowMs: Date.parse(fixedNow),
    studentIdsForClass: (sessionDatabase, classId) =>
      sessionDatabase.class_enrollments
        .filter((enrollment) => enrollment.class_id === classId)
        .map((enrollment) => enrollment.student_id),
    studentNameForLiveAction: (_database, studentId) =>
      studentId === "student-1" ? "Ada Updated" : studentId === "student-2" ? "Ben" : "Student"
  });

  assert.equal(projected.activeTool, "buzzer");
  assert.deepEqual(projected.attendance, [
    {
      studentId: "student-1",
      studentName: "Ada Updated",
      status: "late",
      checkedInAt: "2026-06-20T10:01:00.000Z",
      updatedAt: "2026-06-20T10:01:00.000Z"
    },
    {
      studentId: "student-2",
      studentName: "Ben",
      status: "absent",
      checkedInAt: null,
      updatedAt: "2026-06-20T10:00:00.000Z"
    }
  ]);
  assert.equal(projected.timer.remainingSeconds, 70);
  assert.deepEqual(projected.events.map((event) => event.id), ["event-new", "event-old"]);

  const sessionWithoutRecord = database.teacher_live_sessions.find((candidate) => candidate.id === "session-other");
  assert.ok(sessionWithoutRecord);
  const fallback = teacherOpsLiveToolStateForSession({
    database,
    session: sessionWithoutRecord,
    nowIso: fixedNow,
    nowMs: Date.parse(fixedNow),
    studentIdsForClass: (sessionDatabase, classId) =>
      sessionDatabase.class_enrollments
        .filter((enrollment) => enrollment.class_id === classId)
        .map((enrollment) => enrollment.student_id),
    studentNameForLiveAction: (_database, studentId) => studentId === "student-other" ? "Other Student" : "Student",
    createId: () => "fixed-id"
  });
  assert.equal(fallback.activeTool, "attendance");
  assert.deepEqual(fallback.attendance.map((entry) => [entry.studentId, entry.studentName, entry.status]), [
    ["student-other", "Other Student", "absent"]
  ]);
  assert.equal(fallback.screenSync.href, "/classroom?code=OTH123");
  assert.deepEqual(fallback.events.map((event) => event.id), ["live-event-fixed-id"]);

  assert.doesNotMatch(rootSource, /function toTeacherLiveToolState\b/);
});

test("teacher ops live-session persistence owns ensure tool-state record helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsEnsureLiveToolStateRecord,
    "function",
    "teacherOpsEnsureLiveToolStateRecord should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsEnsureLiveToolStateRecord\b/);

  const teacherOpsEnsureLiveToolStateRecord = helpers.teacherOpsEnsureLiveToolStateRecord as (input: {
    database: TeacherOpsLiveSessionPersistenceDatabase;
    session: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_sessions"][number];
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
  }) => TeacherOpsLiveSessionToolStateRecord;

  const database = createDatabase();
  const session = database.teacher_live_sessions.find((candidate) => candidate.id === "session-owned");
  assert.ok(session);
  const existingRecord = database.teacher_live_tool_states.find((candidate) => candidate.session_id === session.id);
  assert.ok(existingRecord);
  existingRecord.attendance = [
    {
      studentId: "student-1",
      studentName: "Old Ada",
      status: "late",
      checkedInAt: "2026-06-21T07:55:00.000Z",
      updatedAt: "2026-06-21T07:55:00.000Z"
    }
  ];
  const initialRecordCount = database.teacher_live_tool_states.length;
  const studentIdsForClass = (
    sessionDatabase: TeacherOpsLiveSessionPersistenceDatabase,
    classId: string
  ) => sessionDatabase.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
  const studentNameForLiveAction = (_database: TeacherOpsLiveSessionPersistenceDatabase, studentId: string) =>
    studentId === "student-1" ? "Ada Updated" : studentId === "student-2" ? "Ben" : studentId === "student-other" ? "Other Student" : "Student";

  const ensuredExisting = teacherOpsEnsureLiveToolStateRecord({
    database,
    session,
    nowIso: fixedNow,
    studentIdsForClass,
    studentNameForLiveAction
  });

  assert.equal(ensuredExisting, existingRecord);
  assert.equal(database.teacher_live_tool_states.length, initialRecordCount);
  assert.equal(ensuredExisting.active_tool, "buzzer");
  assert.deepEqual(ensuredExisting.attendance, [
    {
      studentId: "student-1",
      studentName: "Ada Updated",
      status: "late",
      checkedInAt: "2026-06-21T07:55:00.000Z",
      updatedAt: "2026-06-21T07:55:00.000Z"
    },
    {
      studentId: "student-2",
      studentName: "Ben",
      status: "absent",
      checkedInAt: null,
      updatedAt: fixedNow
    }
  ]);

  const sessionWithoutRecord = database.teacher_live_sessions.find((candidate) => candidate.id === "session-other");
  assert.ok(sessionWithoutRecord);
  const ensuredCreated = teacherOpsEnsureLiveToolStateRecord({
    database,
    session: sessionWithoutRecord,
    nowIso: fixedNow,
    studentIdsForClass,
    studentNameForLiveAction,
    createId: () => "fixed-id"
  });

  assert.equal(database.teacher_live_tool_states.length, initialRecordCount + 1);
  assert.equal(database.teacher_live_tool_states.at(-1), ensuredCreated);
  assert.equal(ensuredCreated.session_id, "session-other");
  assert.equal(ensuredCreated.active_tool, "attendance");
  assert.deepEqual(ensuredCreated.attendance.map((entry) => [entry.studentId, entry.studentName, entry.status]), [
    ["student-other", "Other Student", "absent"]
  ]);
  assert.equal(ensuredCreated.screen_sync.href, "/classroom?code=OTH123");
  assert.deepEqual(ensuredCreated.events.map((event) => event.id), ["live-event-fixed-id"]);

  assert.match(rootSource, /teacherOpsEnsureLiveToolStateRecord as ensureLiveToolStateRecordFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function ensureTeacherLiveToolStateRecord\b/);
});

test("teacher ops live-session persistence owns live tool event append helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.appendTeacherOpsLiveToolEvent,
    "function",
    "appendTeacherOpsLiveToolEvent should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function appendTeacherOpsLiveToolEvent\b/);

  const appendTeacherOpsLiveToolEvent = helpers.appendTeacherOpsLiveToolEvent as (
    record: TeacherOpsLiveSessionToolStateRecord,
    createId: () => string,
    type: "random-call",
    label: LocalizedText,
    nowIso: string,
    student?: { id: string; name: string }
  ) => void;

  const database = createDatabase();
  const record = database.teacher_live_tool_states.find((candidate) => candidate.session_id === "session-owned");
  assert.ok(record);
  record.events = Array.from({ length: 30 }, (_, index) => ({
    id: `event-${index}`,
    type: "session",
    label: { en: `Event ${index}`, zh: `事件 ${index}` },
    createdAt: `2026-06-21T07:${String(index).padStart(2, "0")}:00.000Z`
  }));

  appendTeacherOpsLiveToolEvent(
    record,
    () => "fixed-id",
    "random-call",
    { en: "Random call selected", zh: "已抽選學生" },
    fixedNow,
    { id: "student-1", name: "Ada" }
  );

  assert.equal(record.events.length, 30);
  assert.equal(record.events[0]?.id, "event-1");
  assert.deepEqual(record.events.at(-1), {
    id: "live-event-fixed-id",
    type: "random-call",
    label: { en: "Random call selected", zh: "已抽選學生" },
    studentId: "student-1",
    studentName: "Ada",
    createdAt: fixedNow
  });
  assert.equal(record.updated_at, fixedNow);

  assert.doesNotMatch(rootSource, /function appendTeacherLiveEvent\b/);
});

test("teacher ops live-session persistence owns classroom work-sample projection helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsClassroomWorkSampleFromRecord,
    "function",
    "teacherOpsClassroomWorkSampleFromRecord should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsClassroomWorkSampleFromRecord\b/);

  const teacherOpsClassroomWorkSampleFromRecord = helpers.teacherOpsClassroomWorkSampleFromRecord as (input: {
    database: TeacherOpsLiveSessionPersistenceDatabase;
    sample: TeacherOpsLiveSessionPersistenceDatabase["classroom_work_samples"][number];
    studentNameForLiveAction: (
      database: TeacherOpsLiveSessionPersistenceDatabase,
      studentId: string
    ) => string;
    mediaObjectUrlFromKey: (value: unknown) => string | undefined;
    normalizeObjectKey: (value: unknown) => string | undefined;
  }) => ClassroomWorkSample;

  const database = createDatabase();
  const projected = teacherOpsClassroomWorkSampleFromRecord({
    database,
    sample: {
      id: "sample-object-backed",
      session_id: "session-owned",
      student_id: "student-1",
      image_data_url: "data:image/png;base64,fallback",
      image_object_key: "classroom/sample.png",
      caption: "Function graph",
      status: "selected",
      created_at: "2026-06-21T07:50:00.000Z",
      selected_at: "2026-06-21T07:55:00.000Z"
    },
    studentNameForLiveAction: (_database, studentId) => studentId === "student-1" ? "Ada Projected" : "Student",
    mediaObjectUrlFromKey: (value) => value === "classroom/sample.png" ? "/media/classroom/sample.png" : undefined,
    normalizeObjectKey: (value) => typeof value === "string" ? `normalized:${value}` : undefined
  });

  assert.deepEqual(projected, {
    id: "sample-object-backed",
    sessionId: "session-owned",
    studentId: "student-1",
    studentName: "Ada Projected",
    imageDataUrl: "/media/classroom/sample.png",
    imageObjectKey: "normalized:classroom/sample.png",
    imageUrl: "/media/classroom/sample.png",
    caption: "Function graph",
    status: "selected",
    createdAt: "2026-06-21T07:50:00.000Z",
    selectedAt: "2026-06-21T07:55:00.000Z"
  });

  const fallback = teacherOpsClassroomWorkSampleFromRecord({
    database,
    sample: {
      id: "sample-data-url",
      session_id: "session-owned",
      student_id: "student-2",
      image_data_url: "data:image/png;base64,only-data",
      caption: "No object key",
      status: "submitted",
      created_at: "2026-06-21T07:52:00.000Z",
      selected_at: null
    },
    studentNameForLiveAction: (_database, studentId) => studentId === "student-2" ? "Ben Projected" : "Student",
    mediaObjectUrlFromKey: () => undefined,
    normalizeObjectKey: () => undefined
  });

  assert.equal(fallback.studentName, "Ben Projected");
  assert.equal(fallback.imageDataUrl, "data:image/png;base64,only-data");
  assert.equal(fallback.imageObjectKey, undefined);
  assert.equal(fallback.imageUrl, undefined);
  assert.equal(fallback.selectedAt, null);

  assert.doesNotMatch(rootSource, /function toClassroomWorkSample\b/);
});

test("teacher ops live-session persistence owns classroom work-sample list projection helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsClassroomWorkSamplesForSession,
    "function",
    "teacherOpsClassroomWorkSamplesForSession should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsClassroomWorkSamplesForSession\b/);

  const teacherOpsClassroomWorkSamplesForSession = helpers.teacherOpsClassroomWorkSamplesForSession as (input: {
    database: TeacherOpsLiveSessionPersistenceDatabase;
    sessionId: string;
    studentNameForLiveAction: (
      database: TeacherOpsLiveSessionPersistenceDatabase,
      studentId: string
    ) => string;
    mediaObjectUrlFromKey: (value: unknown) => string | undefined;
    normalizeObjectKey: (value: unknown) => string | undefined;
  }) => ClassroomWorkSample[];

  const database = createDatabase();
  database.classroom_work_samples.push(
    {
      id: "sample-submitted-older",
      session_id: "session-owned",
      student_id: "student-1",
      image_data_url: "data:image/png;base64,older",
      caption: "Older submitted",
      status: "submitted",
      created_at: "2026-06-21T07:48:00.000Z",
      selected_at: null
    },
    {
      id: "sample-hidden",
      session_id: "session-owned",
      student_id: "student-1",
      image_data_url: "data:image/png;base64,hidden",
      caption: "Hidden",
      status: "hidden",
      created_at: "2026-06-21T07:59:00.000Z",
      selected_at: null
    },
    {
      id: "sample-submitted-newer",
      session_id: "session-owned",
      student_id: "student-2",
      image_object_key: "classroom/newer.png",
      caption: "Newer submitted",
      status: "submitted",
      created_at: "2026-06-21T07:58:00.000Z",
      selected_at: null
    },
    {
      id: "sample-selected-older",
      session_id: "session-owned",
      student_id: "student-1",
      image_object_key: "classroom/selected.png",
      caption: "Selected",
      status: "selected",
      created_at: "2026-06-21T07:45:00.000Z",
      selected_at: "2026-06-21T07:55:00.000Z"
    },
    {
      id: "sample-other-session",
      session_id: "session-other",
      student_id: "student-other",
      image_data_url: "data:image/png;base64,other",
      caption: "Other session",
      status: "selected",
      created_at: "2026-06-21T07:59:30.000Z",
      selected_at: "2026-06-21T08:00:00.000Z"
    }
  );

  const projected = teacherOpsClassroomWorkSamplesForSession({
    database,
    sessionId: "session-owned",
    studentNameForLiveAction: (_database, studentId) => studentId === "student-2" ? "Ben Projected" : "Ada Projected",
    mediaObjectUrlFromKey: (value) => typeof value === "string" ? `/media/${value}` : undefined,
    normalizeObjectKey: (value) => typeof value === "string" ? `normalized:${value}` : undefined
  });

  assert.deepEqual(projected.map((sample) => sample.id), [
    "sample-selected-older",
    "sample-submitted-newer",
    "sample-submitted-older"
  ]);
  assert.equal(projected[0]?.studentName, "Ada Projected");
  assert.equal(projected[1]?.studentName, "Ben Projected");
  assert.equal(projected[1]?.imageDataUrl, "/media/classroom/newer.png");
  assert.equal(projected[1]?.imageObjectKey, "normalized:classroom/newer.png");
  assert.deepEqual(teacherOpsClassroomWorkSamplesForSession({
    database,
    sessionId: "missing-session",
    studentNameForLiveAction: () => "Student",
    mediaObjectUrlFromKey: () => undefined,
    normalizeObjectKey: () => undefined
  }), []);

  assert.doesNotMatch(rootSource, /function lessonKitWorkSamplesForSession\b/);
  assert.doesNotMatch(rootSource, /lessonKitWorkSamplesForSession\(database as Database/);
});

test("teacher ops live-session persistence owns teacher live-session projection helper", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");

  assert.equal(
    typeof helpers.teacherOpsTeacherLiveSessionFromRecord,
    "function",
    "teacherOpsTeacherLiveSessionFromRecord should be exported by teacherOpsLiveSessionPersistence"
  );
  assert.match(helperSource, /export function teacherOpsTeacherLiveSessionFromRecord\b/);

  const teacherOpsTeacherLiveSessionFromRecord = helpers.teacherOpsTeacherLiveSessionFromRecord as (input: {
    database: TeacherOpsLiveSessionPersistenceDatabase;
    session: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_sessions"][number];
    livePromptFromRecord: (
      prompt: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_prompts"][number]
    ) => TeacherLiveSession["currentPrompt"];
    liveResponseSummary: (
      database: TeacherOpsLiveSessionPersistenceDatabase,
      prompt: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_prompts"][number]
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
  }) => TeacherLiveSession | null;

  const database = createDatabase();
  const session = database.teacher_live_sessions.find((candidate) => candidate.id === "session-owned");
  assert.ok(session);
  Object.assign(session, {
    title_en: "Live algebra",
    title_zh: "即時代數",
    lesson_slug: "linear-equations",
    lesson_title_en: "Linear equations lesson",
    lesson_title_zh: "一次方程課節",
    topic_id: "topic-s2",
    topic_title_en: "Linear equations",
    topic_title_zh: "一次方程",
    visualization_title_en: "Graph explorer",
    visualization_title_zh: "圖像探索",
    lesson_kit_id: "kit-live",
    started_at: "2026-06-21T07:45:00.000Z"
  });
  const prompt = database.teacher_live_prompts.find((candidate) => candidate.id === "prompt-owned");
  assert.ok(prompt);
  Object.assign(prompt, {
    type: "poll" as const,
    question_en: "Which graph is linear?",
    question_zh: "哪一個圖像是一次函數？"
  });
  database.classroom_work_samples.push(
    {
      id: "sample-submitted-newer",
      session_id: "session-owned",
      student_id: "student-2",
      image_data_url: "data:image/png;base64,newer",
      caption: "Submitted graph",
      status: "submitted",
      created_at: "2026-06-21T07:58:00.000Z",
      selected_at: null
    },
    {
      id: "sample-selected-older",
      session_id: "session-owned",
      student_id: "student-1",
      image_data_url: "data:image/png;base64,fallback",
      image_object_key: "media/live/selected.png",
      caption: "Selected graph",
      status: "selected",
      created_at: "2026-06-21T07:50:00.000Z",
      selected_at: "2026-06-21T07:59:00.000Z"
    },
    {
      id: "sample-hidden",
      session_id: "session-owned",
      student_id: "student-1",
      image_data_url: "data:image/png;base64,hidden",
      caption: "Hidden graph",
      status: "hidden",
      created_at: "2026-06-21T07:59:30.000Z",
      selected_at: null
    }
  );

  const responseSummary: TeacherLiveSession["responseSummary"] = {
    promptId: "prompt-owned",
    totalSubmissions: 1,
    correctCount: 0,
    accuracy: 0,
    submittedStudentIds: ["student-1"],
    submissions: [
      {
        studentId: "student-1",
        studentName: "Ada Live",
        answer: "A",
        isCorrect: false,
        submittedAt: "2026-06-21T07:56:00.000Z"
      }
    ],
    commonAnswers: [{ answer: "A", count: 1, isCorrect: false }],
    needsReteach: true
  };
  const dependencies = {
    livePromptFromRecord: (promptRecord: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_prompts"][number]) => ({
      id: promptRecord.id,
      type: promptRecord.type ?? "poll",
      question: {
        en: promptRecord.question_en ?? "Question",
        zh: promptRecord.question_zh ?? promptRecord.question_en ?? "Question"
      },
      options: promptRecord.options,
      correctOptionId: promptRecord.correct_option_id
    }),
    liveResponseSummary: (
      sessionDatabase: TeacherOpsLiveSessionPersistenceDatabase,
      promptRecord: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_prompts"][number]
    ) => {
      assert.equal(sessionDatabase, database);
      assert.equal(promptRecord.id, "prompt-owned");
      return responseSummary;
    },
    studentIdsForClass: (
      sessionDatabase: TeacherOpsLiveSessionPersistenceDatabase,
      classId: string
    ) => sessionDatabase.class_enrollments
      .filter((enrollment) => enrollment.class_id === classId)
      .map((enrollment) => enrollment.student_id),
    studentNameForLiveAction: (_sessionDatabase: TeacherOpsLiveSessionPersistenceDatabase, studentId: string) =>
      studentId === "student-1" ? "Ada Live" : studentId === "student-2" ? "Ben Live" : "Student",
    mediaObjectUrlFromKey: (value: unknown) => value === "media/live/selected.png"
      ? "/media/live/selected.png"
      : undefined,
    normalizeObjectKey: (value: unknown) => typeof value === "string"
      ? `normalized:${value}`
      : undefined,
    nowIso: fixedNow,
    nowMs: Date.parse(fixedNow)
  };

  const projected = teacherOpsTeacherLiveSessionFromRecord({
    database,
    session,
    ...dependencies
  });

  assert.ok(projected);
  assert.equal(projected.id, "session-owned");
  assert.equal(projected.className, "Owned class");
  assert.equal(projected.grade, "S2");
  assert.deepEqual(projected.title, { en: "Live algebra", zh: "即時代數" });
  assert.deepEqual(projected.lessonTitle, { en: "Linear equations lesson", zh: "一次方程課節" });
  assert.equal(projected.lessonSlug, "linear-equations");
  assert.deepEqual(projected.topicTitle, { en: "Linear equations", zh: "一次方程" });
  assert.deepEqual(projected.visualizationTitle, { en: "Graph explorer", zh: "圖像探索" });
  assert.equal(projected.currentPrompt.id, "prompt-owned");
  assert.equal(projected.currentPrompt.question.zh, "哪一個圖像是一次函數？");
  assert.equal(projected.studentCount, 2);
  assert.deepEqual(projected.responseSummary, responseSummary);
  assert.equal(projected.lessonKitId, "kit-live");
  assert.deepEqual(projected.slideSections, []);
  assert.deepEqual(projected.workSamples.map((sample) => sample.id), ["sample-selected-older", "sample-submitted-newer"]);
  assert.equal(projected.workSamples[0]?.studentName, "Ada Live");
  assert.equal(projected.workSamples[0]?.imageDataUrl, "/media/live/selected.png");
  assert.equal(projected.workSamples[0]?.imageObjectKey, "normalized:media/live/selected.png");
  assert.equal(projected.workSamples[1]?.studentName, "Ben Live");
  assert.equal(projected.toolState.activeTool, "buzzer");
  assert.deepEqual(projected.toolState.attendance.map((entry) => [entry.studentId, entry.studentName]), [
    ["student-1", "Ada Live"],
    ["student-2", "Ben Live"]
  ]);

  assert.equal(teacherOpsTeacherLiveSessionFromRecord({
    database,
    session: { ...session, id: "session-missing-class", class_id: "missing-class" },
    ...dependencies
  }), null);
  assert.equal(teacherOpsTeacherLiveSessionFromRecord({
    database,
    session: { ...session, id: "session-missing-prompt", current_prompt_id: "missing-prompt" },
    ...dependencies
  }), null);

  assert.match(rootSource, /teacherOpsTeacherLiveSessionFromRecord as teacherLiveSessionFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /function toTeacherLiveSession\b/);
});

function createTestStore(database: TeacherOpsLiveSessionPersistenceDatabase) {
  let idCounter = 0;

  return createTeacherOpsLiveSessionPersistenceStore({
    createLiveToolStateRecord: (_database, session, nowIso) => ({
      session_id: session.id,
      active_tool: "attendance",
      attendance: [
        {
          studentId: "student-1",
          studentName: "Ada",
          status: "absent",
          checkedInAt: null,
          updatedAt: nowIso
        },
        {
          studentId: "student-2",
          studentName: "Ben",
          status: "absent",
          checkedInAt: null,
          updatedAt: nowIso
        }
      ],
      buzzer: {
        id: "buzzer-new",
        status: "idle",
        openedAt: null,
        closedAt: null,
        entries: []
      },
      random_call: {
        currentStudentId: null,
        currentStudentName: null,
        selectedStudentIds: [],
        allowRepeats: false,
        updatedAt: null
      },
      timer: {
        mode: "countdown",
        status: "idle",
        durationSeconds: 180,
        remainingSeconds: 180,
        startedAt: null,
        pausedAt: null,
        updatedAt: null
      },
      teams: {
        teams: [],
        updatedAt: null
      },
      projection: {
        mode: "answers",
        showNames: false,
        selectedWorkSampleId: null,
        updatedAt: null
      },
      screen_sync: {
        target: "classroom",
        title: { en: "Live classroom", zh: "即時課堂" },
        href: "/classroom",
        locked: false,
        updatedAt: null
      },
      whiteboard_strokes: [],
      math_workbench: {
        tool: "function-graph",
        topicId: null,
        title: { en: "Function Graph Explorer", zh: "函數圖像探索器" },
        parameters: { a: 1, b: -2, c: -3 },
        locked: false,
        updatedAt: null
      },
      events: [
        {
          id: "live-event-fixture",
          type: "session",
          label: { en: "Live classroom started", zh: "即時課堂已開始" },
          createdAt: session.started_at ?? nowIso
        }
      ],
      updated_at: nowIso
    }),
    createId: () => `generated-${++idCounter}`,
    defaultPromptOptions: (type: TeacherLivePromptType) => type === "exit-ticket"
      ? [
          { id: "green", label: { en: "Ready", zh: "可以" } },
          { id: "red", label: { en: "Reteach", zh: "重講" } }
        ]
      : [
          { id: "a", label: { en: "A", zh: "A" } },
          { id: "b", label: { en: "B", zh: "B" } }
        ],
    now: () => new Date(fixedNow),
    mutateDatabase: async (mutator) => mutator(database),
    readDatabase: async () => database,
    ensureLiveToolStateRecord: (sessionDatabase, session, nowIso) => {
      let record = sessionDatabase.teacher_live_tool_states.find((candidate) => candidate.session_id === session.id);
      if (!record) {
        record = {
          session_id: session.id,
          active_tool: "attendance",
          attendance: [
            {
              studentId: "student-1",
              studentName: "Ada",
              status: "absent",
              checkedInAt: null,
              updatedAt: nowIso
            },
            {
              studentId: "student-2",
              studentName: "Ben",
              status: "absent",
              checkedInAt: null,
              updatedAt: nowIso
            }
          ],
          buzzer: {
            id: "buzzer-created",
            status: "idle",
            openedAt: null,
            closedAt: null,
            entries: []
          },
          random_call: {
            currentStudentId: null,
            currentStudentName: null,
            selectedStudentIds: [],
            allowRepeats: false,
            updatedAt: null
          },
          timer: {
            mode: "countdown",
            status: "idle",
            durationSeconds: 180,
            remainingSeconds: 180,
            startedAt: null,
            pausedAt: null,
            updatedAt: null
          },
          teams: {
            teams: [],
            updatedAt: null
          },
          projection: {
            mode: "answers",
            showNames: false,
            selectedWorkSampleId: null,
            updatedAt: null
          },
          screen_sync: {
            target: "classroom",
            title: { en: "Live classroom", zh: "即時課堂" },
            href: "/classroom",
            locked: false,
            updatedAt: null
          },
          whiteboard_strokes: [],
          math_workbench: {
            tool: "function-graph",
            topicId: null,
            title: { en: "Function Graph Explorer", zh: "函數圖像探索器" },
            parameters: { a: 1, b: -2, c: -3 },
            locked: false,
            updatedAt: null
          },
          events: [],
          updated_at: nowIso
        };
        sessionDatabase.teacher_live_tool_states.push(record);
      }
      return record;
    },
    mediaObjectKeyFromPayload: (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
      const objectKey = (value as { objectKey?: unknown }).objectKey;
      return typeof objectKey === "string" && objectKey.startsWith("media/") ? objectKey : undefined;
    },
    defaultMathWorkbenchState: (nowIso = null) => ({
      tool: "function-graph",
      topicId: null,
      title: { en: "Function Graph Explorer", zh: "函數圖像探索器" },
      parameters: { a: 1, b: -2, c: -3 },
      locked: false,
      updatedAt: nowIso
    }),
    defaultRandomCallState: (nowIso = null) => ({
      currentStudentId: null,
      currentStudentName: null,
      selectedStudentIds: [],
      allowRepeats: false,
      updatedAt: nowIso
    }),
    defaultScreenSyncState: (nowIso = null) => ({
      target: "classroom",
      title: { en: "Live classroom", zh: "即時課堂" },
      href: "/classroom",
      locked: false,
      updatedAt: nowIso
    }),
    normalizeWhiteboardStroke: (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const record = value as {
        id?: unknown;
        tool?: unknown;
        color?: unknown;
        width?: unknown;
        points?: unknown;
        createdAt?: unknown;
      };
      const points = Array.isArray(record.points)
        ? record.points
            .map((point) => {
              const candidate = point as { x?: unknown; y?: unknown };
              return typeof candidate.x === "number" && typeof candidate.y === "number"
                ? { x: Math.max(0, Math.min(1, candidate.x)), y: Math.max(0, Math.min(1, candidate.y)) }
                : null;
            })
            .filter((point): point is { x: number; y: number } => Boolean(point))
        : [];
      return typeof record.id === "string"
        ? {
            id: record.id,
            tool: record.tool === "highlighter" ? "highlighter" : "pen",
            color: typeof record.color === "string" ? record.color : "#0891b2",
            width: typeof record.width === "number" ? Math.max(1, Math.min(18, Math.round(record.width))) : 4,
            points,
            createdAt: typeof record.createdAt === "string" ? record.createdAt : fixedNow
          }
        : null;
    },
    resolveLiveSessionContext: (sessionDatabase, teacherClass, topicId) => {
      const topic = sessionDatabase.topics.find((candidate) => candidate.id === topicId && candidate.grade === teacherClass.grade) ??
        sessionDatabase.topics.find((candidate) => candidate.grade === teacherClass.grade);
      const lesson = topic
        ? sessionDatabase.lessons.find((candidate) => candidate.topic_id === topic.id)
        : null;
      const topicTitle: LocalizedText | null = topic
        ? { en: topic.title_en, zh: topic.title_zh }
        : null;

      return {
        lessonSlug: lesson?.slug,
        lessonTitle: lesson ? { en: lesson.title_en, zh: lesson.title_zh } : { en: `${teacherClass.grade} lesson`, zh: `${teacherClass.grade} 課節` },
        topicId: topic?.id,
        topicTitle,
        visualizationTitle: topicTitle
          ? { en: `${topicTitle.en} visualization`, zh: `${topicTitle.zh} 視覺化` }
          : { en: "Current visualization", zh: "目前視覺化" }
      };
    },
    studentIdsForClass: (sessionDatabase, classId) =>
      sessionDatabase.class_enrollments
        .filter((enrollment) => enrollment.class_id === classId)
        .map((enrollment) => enrollment.student_id),
    studentNameForLiveAction: (_database, studentId) => studentId === "student-1" ? "Ada" : studentId === "student-2" ? "Ben" : "Student",
    timerForClient: (timer) => timer,
    toClassroomLiveSession: (_database, input) => classroomLiveSessionFixture(input),
    toClass: (_database, teacherClass) => classFixture(teacherClass),
    toLiveSession: (_database, session) => liveSessionFixture(session)
  });
}

test("teacher ops live session persistence owns whiteboard stroke normalization", async () => {
  const module = teacherOpsLiveSessionPersistence as Record<string, unknown>;
  assert.equal(typeof module.normalizeTeacherOpsWhiteboardStroke, "function");

  const normalizeTeacherOpsWhiteboardStroke =
    module.normalizeTeacherOpsWhiteboardStroke as (value: unknown) => WhiteboardStroke | null;
  const points = Array.from({ length: 130 }, (_, index) => ({
    x: index % 2 === 0 ? 1.4 : -0.2,
    y: index % 3 === 0 ? 1.2 : 0.25
  }));

  assert.deepEqual(normalizeTeacherOpsWhiteboardStroke({
    id: "stroke-1",
    tool: "highlighter",
    color: "abcdef0123456789abcdef012345",
    width: 21.6,
    points: [...points, { x: "bad", y: 0.4 }],
    createdAt: "2026-06-21T08:00:00.000Z"
  }), {
    id: "stroke-1",
    tool: "highlighter",
    color: "abcdef0123456789abcdef01",
    width: 18,
    points: points.slice(0, 120).map((point) => ({
      x: Math.max(0, Math.min(1, point.x)),
      y: Math.max(0, Math.min(1, point.y))
    })),
    createdAt: "2026-06-21T08:00:00.000Z"
  });
  assert.equal(normalizeTeacherOpsWhiteboardStroke({
    id: "stroke-2",
    tool: "eraser",
    color: "",
    width: -4,
    points: []
  })?.tool, "pen");
  assert.equal(normalizeTeacherOpsWhiteboardStroke({ tool: "pen" }), null);

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /function normalizeWhiteboardStroke\b/);
});

test("teacher ops live session persistence owns attendance entry normalization", async () => {
  const module = teacherOpsLiveSessionPersistence as Record<string, unknown>;
  assert.equal(typeof module.normalizeTeacherOpsLiveAttendanceEntry, "function");

  const normalizeTeacherOpsLiveAttendanceEntry =
    module.normalizeTeacherOpsLiveAttendanceEntry as (value: unknown, now: string) => TeacherLiveAttendanceEntry | null;

  assert.deepEqual(normalizeTeacherOpsLiveAttendanceEntry({
    studentId: "student-1",
    studentName: "  Ada  ",
    status: "present",
    checkedInAt: "2026-06-21T07:58:00.000Z",
    updatedAt: "2026-06-21T08:00:00.000Z"
  }, fixedNow), {
    studentId: "student-1",
    studentName: "Ada",
    status: "present",
    checkedInAt: "2026-06-21T07:58:00.000Z",
    updatedAt: "2026-06-21T08:00:00.000Z"
  });
  assert.deepEqual(normalizeTeacherOpsLiveAttendanceEntry({
    studentId: "student-2",
    studentName: "",
    status: "unknown",
    checkedInAt: 123,
    updatedAt: 456
  }, fixedNow), {
    studentId: "student-2",
    studentName: "Student",
    status: "absent",
    checkedInAt: null,
    updatedAt: fixedNow
  });
  assert.equal(normalizeTeacherOpsLiveAttendanceEntry({ studentName: "Ada" }, fixedNow), null);

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /function normalizeAttendanceEntry\b/);
});

test("teacher ops live session persistence owns live tool payload normalizers", async () => {
  const module = teacherOpsLiveSessionPersistence as Record<string, unknown>;
  assert.equal(typeof module.normalizeTeacherOpsLiveTarget, "function");
  assert.equal(typeof module.normalizeTeacherOpsMathWorkbenchTool, "function");
  assert.equal(typeof module.normalizeTeacherOpsProjectionMode, "function");

  const normalizeTeacherOpsLiveTarget =
    module.normalizeTeacherOpsLiveTarget as (value: unknown) => TeacherLiveScreenSyncState["target"];
  const normalizeTeacherOpsMathWorkbenchTool =
    module.normalizeTeacherOpsMathWorkbenchTool as (value: unknown) => MathWorkbenchState["tool"];
  const normalizeTeacherOpsProjectionMode =
    module.normalizeTeacherOpsProjectionMode as (value: unknown) => TeacherLiveProjectionState["mode"];

  assert.equal(normalizeTeacherOpsLiveTarget("math-workbench"), "math-workbench");
  assert.equal(normalizeTeacherOpsLiveTarget("bad-target"), "classroom");
  assert.equal(normalizeTeacherOpsMathWorkbenchTool("geometry"), "geometry");
  assert.equal(normalizeTeacherOpsMathWorkbenchTool("algebra-tiles"), "function-graph");
  assert.equal(normalizeTeacherOpsProjectionMode("work-samples"), "work-samples");
  assert.equal(normalizeTeacherOpsProjectionMode("student-names"), "answers");

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /function normalizeLiveTarget\b/);
  assert.doesNotMatch(rootSource, /function normalizeMathWorkbenchTool\b/);
  assert.doesNotMatch(rootSource, /function normalizeProjectionMode\b/);
});

test("teacher ops live session persistence owns live action payload coercion helpers", async () => {
  const module = teacherOpsLiveSessionPersistence as Record<string, unknown>;

  for (const name of [
    "teacherOpsLivePayloadObject",
    "teacherOpsPayloadString",
    "teacherOpsBoundedPayloadNumber",
    "teacherOpsPayloadBoolean",
    "chooseTeacherOpsRandomCallableStudent"
  ]) {
    assert.equal(typeof module[name], "function", `${name} should be exported by teacherOpsLiveSessionPersistence`);
  }

  const livePayloadObject = module.teacherOpsLivePayloadObject as (payload: unknown) => Record<string, unknown>;
  const payloadString = module.teacherOpsPayloadString as (payload: Record<string, unknown>, key: string) => string;
  const boundedPayloadNumber =
    module.teacherOpsBoundedPayloadNumber as (payload: Record<string, unknown>, key: string, fallback: number, min: number, max: number) => number;
  const payloadBoolean = module.teacherOpsPayloadBoolean as (payload: Record<string, unknown>, key: string, fallback?: boolean) => boolean;
  const chooseRandomCallableStudent =
    module.chooseTeacherOpsRandomCallableStudent as (record: TeacherOpsLiveSessionPersistenceDatabase["teacher_live_tool_states"][number]) => { studentId: string } | null;

  assert.deepEqual(livePayloadObject({ a: 1 }), { a: 1 });
  assert.deepEqual(livePayloadObject(["bad"]), {});
  assert.equal(payloadString({ name: "  Ada  ", empty: "   " }, "name"), "Ada");
  assert.equal(payloadString({ name: "  Ada  ", empty: "   " }, "empty"), "");
  assert.equal(boundedPayloadNumber({ count: "4.6" }, "count", 2, 1, 5), 5);
  assert.equal(boundedPayloadNumber({ count: "bad" }, "count", 2, 1, 5), 2);
  assert.equal(payloadBoolean({ locked: true }, "locked"), true);
  assert.equal(payloadBoolean({ locked: "yes" }, "locked", true), true);

  const record = createDatabase().teacher_live_tool_states[0];
  record.attendance = [
    { studentId: "student-present", studentName: "Ada", status: "present", checkedInAt: null, updatedAt: fixedNow },
    { studentId: "student-absent", studentName: "Ben", status: "absent", checkedInAt: null, updatedAt: fixedNow }
  ];
  record.random_call = { ...record.random_call, selectedStudentIds: [], allowRepeats: false };
  assert.equal(chooseRandomCallableStudent(record)?.studentId, "student-present");
  record.attendance = [];
  assert.equal(chooseRandomCallableStudent(record), null);

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /function livePayloadObject\b/);
  assert.doesNotMatch(rootSource, /function boundedPayloadNumber\b/);
  assert.doesNotMatch(rootSource, /function payloadString\b/);
  assert.doesNotMatch(rootSource, /function payloadBoolean\b/);
  assert.doesNotMatch(rootSource, /function chooseRandomCallableStudent\b/);
});

test("teacher ops live session persistence owns durable tool-state record normalization", async () => {
  const module = teacherOpsLiveSessionPersistence as Record<string, unknown>;
  assert.equal(typeof module.normalizeTeacherOpsLiveToolStateRecord, "function");

  const normalizeTeacherOpsLiveToolStateRecord =
    module.normalizeTeacherOpsLiveToolStateRecord as (
      record: Record<string, unknown> | undefined,
      now: string
    ) => Record<string, unknown> | null;

  assert.equal(normalizeTeacherOpsLiveToolStateRecord(undefined, fixedNow), null);
  assert.equal(normalizeTeacherOpsLiveToolStateRecord({ active_tool: "timer" }, fixedNow), null);

  assert.deepEqual(normalizeTeacherOpsLiveToolStateRecord({
    session_id: "session-owned",
    active_tool: "poll",
    attendance: [
      {
        studentId: "student-1",
        studentName: "  Ada  ",
        status: "present",
        checkedInAt: 123,
        updatedAt: 456
      },
      { studentName: "Missing id" }
    ],
    random_call: {
      currentStudentId: 123,
      currentStudentName: "Ben",
      selectedStudentIds: ["student-1", 2, "student-2"],
      allowRepeats: "yes",
      updatedAt: 789
    },
    buzzer: {
      id: "round-1",
      status: "open",
      openedAt: "2026-06-21T07:55:00.000Z",
      closedAt: 123,
      entries: [
        {
          studentId: "student-1",
          studentName: "Ada",
          submittedAt: "2026-06-21T07:56:00.000Z",
          rank: "not-a-number"
        },
        { studentId: "bad" }
      ]
    },
    timer: {
      mode: "stopwatch",
      status: "running",
      durationSeconds: 9000,
      remainingSeconds: -5,
      startedAt: "2026-06-21T07:57:00.000Z",
      pausedAt: 123,
      updatedAt: "2026-06-21T07:58:00.000Z"
    },
    teams: {
      teams: [
        {
          id: "team-a",
          name: { en: "  Alpha  ", zh: "  甲  " },
          studentIds: ["student-1", 3, "student-2"],
          score: 2.4
        },
        { name: { en: "No id", zh: "No id" } }
      ],
      updatedAt: "2026-06-21T07:59:00.000Z"
    },
    projection: {
      mode: "work-samples",
      showNames: true,
      selectedWorkSampleId: 123,
      updatedAt: 456
    },
    screen_sync: {
      target: "bad-target",
      title: { en: "  Board  ", zh: "" },
      href: "",
      locked: true,
      updatedAt: "2026-06-21T08:00:00.000Z"
    },
    whiteboard_strokes: [
      {
        id: "stroke-1",
        tool: "highlighter",
        color: "#ff0",
        width: 99,
        points: [{ x: 2, y: -1 }, { x: "bad", y: 0.5 }],
        createdAt: "2026-06-21T08:01:00.000Z"
      }
    ],
    math_workbench: {
      tool: "geometry",
      topicId: 123,
      title: "Geometry",
      parameters: null,
      locked: true,
      updatedAt: 456
    },
    events: [
      {
        id: "event-1",
        type: "timer",
        label: { en: "  Start  ", zh: "  開始  " },
        studentId: 123,
        studentName: "Ada",
        createdAt: "2026-06-21T08:02:00.000Z"
      },
      {
        type: "session",
        createdAt: "2026-06-21T08:03:00.000Z"
      }
    ],
    updated_at: 123
  }, fixedNow), {
    session_id: "session-owned",
    active_tool: "attendance",
    attendance: [
      {
        studentId: "student-1",
        studentName: "Ada",
        status: "present",
        checkedInAt: null,
        updatedAt: fixedNow
      }
    ],
    random_call: {
      currentStudentId: null,
      currentStudentName: "Ben",
      selectedStudentIds: ["student-1", "student-2"],
      allowRepeats: false,
      updatedAt: null
    },
    buzzer: {
      id: "round-1",
      status: "open",
      openedAt: "2026-06-21T07:55:00.000Z",
      closedAt: null,
      entries: [
        {
          studentId: "student-1",
          studentName: "Ada",
          submittedAt: "2026-06-21T07:56:00.000Z",
          rank: 1
        }
      ]
    },
    timer: {
      mode: "stopwatch",
      status: "running",
      durationSeconds: 7200,
      remainingSeconds: 0,
      startedAt: "2026-06-21T07:57:00.000Z",
      pausedAt: null,
      updatedAt: "2026-06-21T07:58:00.000Z"
    },
    teams: {
      teams: [
        {
          id: "team-a",
          name: { en: "Alpha", zh: "甲" },
          studentIds: ["student-1", "student-2"],
          score: 2
        }
      ],
      updatedAt: "2026-06-21T07:59:00.000Z"
    },
    projection: {
      mode: "work-samples",
      showNames: true,
      selectedWorkSampleId: null,
      updatedAt: null
    },
    screen_sync: {
      target: "classroom",
      title: { en: "Board", zh: "Board" },
      href: "/classroom",
      locked: true,
      updatedAt: "2026-06-21T08:00:00.000Z"
    },
    whiteboard_strokes: [
      {
        id: "stroke-1",
        tool: "highlighter",
        color: "#ff0",
        width: 18,
        points: [{ x: 1, y: 0 }],
        createdAt: "2026-06-21T08:01:00.000Z"
      }
    ],
    math_workbench: {
      tool: "geometry",
      topicId: null,
      title: { en: "Function Graph Explorer", zh: "函數圖像探索器" },
      parameters: {},
      locked: true,
      updatedAt: null
    },
    events: [
      {
        id: "event-1",
        type: "timer",
        label: { en: "Start", zh: "開始" },
        studentName: "Ada",
        createdAt: "2026-06-21T08:02:00.000Z"
      }
    ],
    updated_at: fixedNow
  });

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /function normalizeTeacherLiveToolStateRecord\b/);
});

test("teacher ops live-session persistence reads accessible sessions without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const session = await createTestStore(createDatabase()).getTeacherLiveSessionById("teacher-1", "session-owned");

  assert.equal(session?.id, "session-owned");
  assert.equal(session?.classId, "class-owned");
  assert.equal(session?.status, "active");
});

test("teacher ops live-session persistence keeps lookup scoped to admins owners and class teacher memberships", async () => {
  const store = createTestStore(createDatabase());

  assert.equal((await store.getTeacherLiveSessionById("teacher-member", "session-owned"))?.id, "session-owned");
  assert.equal((await store.getTeacherLiveSessionById("admin-1", "session-other"))?.id, "session-other");
  assert.equal(await store.getTeacherLiveSessionById("teacher-1", "session-other"), null);
  assert.equal(await store.getTeacherLiveSessionById("student-1", "session-owned"), null);
  assert.equal(await store.getTeacherLiveSessionById("teacher-1", "missing-session"), null);
});

test("teacher ops live-session persistence builds scoped teacher live data", async () => {
  const store = createTestStore(createDatabase());

  const data = await store.getTeacherLiveData("teacher-1");

  assert.equal(data?.generatedAt, fixedNow);
  assert.deepEqual(data?.classes.map((teacherClass) => teacherClass.id), ["class-owned"]);
  assert.equal(data?.activeSession?.id, "session-owned");
  assert.deepEqual(data?.recentSessions.map((session) => session.id), ["session-owned", "session-owned-ended"]);

  const adminData = await store.getTeacherLiveData("admin-1");
  assert.deepEqual(adminData?.classes.map((teacherClass) => teacherClass.id), ["class-other", "class-owned"]);
  assert.equal(adminData?.activeSession?.id, "session-owned");
  assert.deepEqual(adminData?.recentSessions.map((session) => session.id), [
    "session-other",
    "session-owned",
    "session-owned-ended"
  ]);
  assert.equal(await store.getTeacherLiveData("student-1"), null);
});

test("teacher ops live-session persistence starts sessions through fake storage", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  assert.deepEqual(
    await store.startTeacherLiveSession({
      teacherId: "teacher-1",
      classId: "class-owned",
      promptType: "poll",
      question: "   ",
      correctOptionId: "b",
      topicId: "topic-s2"
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.startTeacherLiveSession({
      teacherId: "student-1",
      classId: "class-owned",
      promptType: "poll",
      question: "Which option?",
      correctOptionId: "b",
      topicId: "topic-s2"
    }),
    { status: "forbidden" }
  );
  assert.deepEqual(
    await store.startTeacherLiveSession({
      teacherId: "teacher-1",
      classId: "class-other",
      promptType: "poll",
      question: "Which option?",
      correctOptionId: "b",
      topicId: "topic-s2"
    }),
    { status: "not-found" }
  );

  const result = await store.startTeacherLiveSession({
    teacherId: "teacher-member",
    classId: "class-owned",
    promptType: "poll",
    question: "  Which graph is linear?  ",
    correctOptionId: "b",
    topicId: "topic-s2"
  });

  assert.equal(result.status, "started");
  assert.equal(result.session?.id, "live-generated-1");
  assert.equal(result.session?.joinCode, "S2GEN");
  assert.equal(database.teacher_live_sessions[0]?.id, "live-generated-1");
  assert.equal(database.teacher_live_sessions[0]?.status, "active");
  assert.equal(database.teacher_live_sessions[0]?.teacher_id, "teacher-member");
  assert.equal(database.teacher_live_sessions[0]?.class_id, "class-owned");
  assert.equal(database.teacher_live_sessions[0]?.current_prompt_id, "live-prompt-generated-2");
  assert.equal(database.teacher_live_sessions[0]?.lesson_slug, "linear-equations");
  assert.equal(database.teacher_live_sessions[0]?.topic_id, "topic-s2");
  assert.equal(database.teacher_live_sessions[0]?.started_at, fixedNow);
  assert.equal(database.teacher_live_sessions[0]?.ended_at, null);
  assert.equal(database.teacher_live_sessions[1]?.id, "session-owned");
  assert.equal(database.teacher_live_sessions[1]?.status, "ended");
  assert.equal(database.teacher_live_sessions[1]?.ended_at, fixedNow);
  assert.deepEqual(database.teacher_live_prompts.at(-1), {
    id: "live-prompt-generated-2",
    session_id: "live-generated-1",
    type: "poll",
    question_en: "Which graph is linear?",
    question_zh: "Which graph is linear?",
    options: [
      { id: "a", label: { en: "A", zh: "A" } },
      { id: "b", label: { en: "B", zh: "B" } }
    ],
    correct_option_id: "b",
    created_at: fixedNow
  });
  assert.equal(database.teacher_live_tool_states.at(-1)?.session_id, "live-generated-1");
  assert.equal(database.teacher_live_tool_states.at(-1)?.updated_at, fixedNow);
});

test("teacher ops live-session persistence resolves classroom sessions for enrolled students and teacher previews", async () => {
  const store = createTestStore(createDatabase());

  const studentSubmitted = await store.getClassroomLiveSessionForStudent("student-1", " own123 ");
  assert.equal(studentSubmitted?.id, "session-owned");
  assert.equal(studentSubmitted?.viewerMode, "student");
  assert.equal(studentSubmitted?.viewerStudentId, "student-1");
  assert.equal(studentSubmitted?.submitted, true);
  assert.equal(studentSubmitted?.canSubmit, false);
  assert.equal(studentSubmitted?.submittedAnswer, "A");

  const studentOpen = await store.getClassroomLiveSessionForStudent("student-2", "OWN123");
  assert.equal(studentOpen?.submitted, false);
  assert.equal(studentOpen?.canSubmit, true);

  const teacherPreview = await store.getClassroomLiveSessionForTeacherPreview("teacher-member", "OWN123");
  assert.equal(teacherPreview?.viewerMode, "teacher-preview");
  assert.equal(teacherPreview?.canSubmit, false);

  assert.equal(await store.getClassroomLiveSessionForStudent("student-other", "OWN123"), null);
  assert.equal(await store.getClassroomLiveSessionForStudent("student-1", "END123"), null);
  assert.equal(await store.getClassroomLiveSessionForTeacherPreview("teacher-1", "OTH123"), null);
  assert.equal(await store.getClassroomLiveSessionForTeacherPreview("student-1", "OWN123"), null);
});

test("teacher ops live-session persistence submits classroom responses through fake storage", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const updated = await store.submitClassroomLiveResponse({
    userId: "student-1",
    sessionId: "session-owned",
    promptId: "prompt-owned",
    answer: "B"
  });

  assert.equal(updated.status, "submitted");
  assert.equal(updated.session?.id, "session-owned");
  assert.equal(database.teacher_live_responses.find((response) => response.id === "response-existing")?.answer, "B");
  assert.equal(database.teacher_live_responses.find((response) => response.id === "response-existing")?.is_correct, true);
  assert.equal(database.teacher_live_responses.find((response) => response.id === "response-existing")?.submitted_at, fixedNow);
  assert.equal(database.teacher_live_sessions.find((session) => session.id === "session-owned")?.updated_at, fixedNow);

  const created = await store.submitClassroomLiveResponse({
    userId: "student-2",
    sessionId: "session-owned",
    promptId: "prompt-owned",
    answer: "Open explanation"
  });

  assert.equal(created.status, "submitted");
  assert.deepEqual(database.teacher_live_responses.at(-1), {
    id: "live-response-generated-1",
    session_id: "session-owned",
    prompt_id: "prompt-owned",
    student_id: "student-2",
    answer: "Open explanation",
    is_correct: false,
    submitted_at: fixedNow
  });
  assert.deepEqual(
    await store.submitClassroomLiveResponse({
      userId: "student-2",
      sessionId: "session-owned",
      promptId: "prompt-owned",
      answer: "   "
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.submitClassroomLiveResponse({
      userId: "student-other",
      sessionId: "session-owned",
      promptId: "prompt-owned",
      answer: "A"
    }),
    { status: "forbidden" }
  );
  assert.deepEqual(
    await store.submitClassroomLiveResponse({
      userId: "student-1",
      sessionId: "session-owned-ended",
      promptId: "prompt-ended",
      answer: "done"
    }),
    { status: "not-found" }
  );
});

test("teacher ops live-session persistence submits classroom live actions through fake storage", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const attendance = await store.submitClassroomLiveAction({
    userId: "student-2",
    sessionId: "session-owned",
    action: "attendance-check-in"
  });

  const record = database.teacher_live_tool_states.find((candidate) => candidate.session_id === "session-owned");
  const studentAttendance = record?.attendance.find((entry) => entry.studentId === "student-2");
  assert.equal(attendance.status, "updated");
  assert.equal(attendance.session?.id, "session-owned");
  assert.equal(attendance.session?.viewerMode, "student");
  assert.equal(attendance.session?.viewerStudentId, "student-2");
  assert.equal(studentAttendance?.status, "present");
  assert.equal(studentAttendance?.checkedInAt, fixedNow);
  assert.equal(studentAttendance?.updatedAt, fixedNow);
  assert.equal(record?.active_tool, "attendance");
  assert.equal(record?.events.at(-1)?.type, "attendance");
  assert.equal(database.teacher_live_sessions.find((session) => session.id === "session-owned")?.updated_at, fixedNow);

  const buzzer = await store.submitClassroomLiveAction({
    userId: "student-1",
    sessionId: "session-owned",
    action: "buzzer-submit"
  });

  assert.equal(buzzer.status, "updated");
  assert.equal(record?.active_tool, "buzzer");
  assert.deepEqual(record?.buzzer.entries, [
    {
      studentId: "student-1",
      studentName: "Ada",
      submittedAt: fixedNow,
      rank: 1
    }
  ]);
  assert.equal(record?.events.at(-1)?.type, "buzzer");

  const screenAck = await store.submitClassroomLiveAction({
    userId: "student-1",
    sessionId: "session-owned",
    action: "screen-ack"
  });

  assert.equal(screenAck.status, "updated");
  assert.equal(record?.events.at(-1)?.type, "screen-sync");

  const workSample = await store.submitClassroomLiveAction({
    userId: "student-1",
    sessionId: "session-owned",
    action: "work-sample-submit",
    payload: {
      imageDataUrl: "data:image/png;base64,abc",
      imageObject: { objectKey: "media/work-sample-1.png" },
      caption: "x".repeat(260)
    }
  });

  assert.equal(workSample.status, "updated");
  assert.equal(record?.active_tool, "projector");
  assert.equal(record?.events.at(-1)?.type, "projector");
  assert.equal(database.classroom_work_samples.length, 1);
  assert.match(database.classroom_work_samples[0]?.id ?? "", /^work-sample-generated-/);
  assert.equal(database.classroom_work_samples[0]?.session_id, "session-owned");
  assert.equal(database.classroom_work_samples[0]?.student_id, "student-1");
  assert.equal(database.classroom_work_samples[0]?.image_data_url, "data:image/png;base64,abc");
  assert.equal(database.classroom_work_samples[0]?.image_object_key, "media/work-sample-1.png");
  assert.equal(database.classroom_work_samples[0]?.caption.length, 240);
  assert.equal(database.classroom_work_samples[0]?.status, "submitted");
  assert.equal(database.classroom_work_samples[0]?.created_at, fixedNow);
  assert.equal(database.classroom_work_samples[0]?.selected_at, null);
});

test("teacher ops live-session persistence rejects invalid classroom live actions", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  assert.deepEqual(
    await store.submitClassroomLiveAction({
      userId: "student-1",
      sessionId: "session-owned-ended",
      action: "attendance-check-in"
    }),
    { status: "not-found" }
  );
  assert.deepEqual(
    await store.submitClassroomLiveAction({
      userId: "student-other",
      sessionId: "session-owned",
      action: "attendance-check-in"
    }),
    { status: "forbidden" }
  );
  database.teacher_live_tool_states.find((record) => record.session_id === "session-owned")!.buzzer.status = "closed";
  assert.deepEqual(
    await store.submitClassroomLiveAction({
      userId: "student-1",
      sessionId: "session-owned",
      action: "buzzer-submit"
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.submitClassroomLiveAction({
      userId: "student-1",
      sessionId: "session-owned",
      action: "work-sample-submit",
      payload: {
        imageDataUrl: "not-image-data",
        imageObject: { objectKey: "../bad" }
      }
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.submitClassroomLiveAction({
      userId: "student-1",
      sessionId: "session-owned",
      action: "unknown-action"
    }),
    { status: "invalid" }
  );
});

test("teacher ops live-session persistence updates teacher live tools through fake storage", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const record = database.teacher_live_tool_states.find((candidate) => candidate.session_id === "session-owned") as any;

  const opened = await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "attendance-open"
  });

  assert.equal(opened.status, "updated");
  assert.equal(opened.session?.id, "session-owned");
  assert.equal(record.active_tool, "attendance");
  assert.equal(record.events.at(-1)?.type, "attendance");

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "attendance-set",
    payload: { studentId: "student-1", status: "late" }
  });
  assert.equal(record.attendance.find((entry: { studentId: string }) => entry.studentId === "student-1")?.status, "late");
  assert.equal(record.attendance.find((entry: { studentId: string }) => entry.studentId === "student-1")?.updatedAt, fixedNow);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "random-call",
    payload: { allowRepeats: false }
  });
  assert.equal(record.active_tool, "random-call");
  assert.equal(record.random_call.currentStudentId, "student-1");
  assert.deepEqual(record.random_call.selectedStudentIds, ["student-1"]);
  assert.equal(record.events.at(-1)?.type, "random-call");

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "random-call-reset"
  });
  assert.equal(record.random_call.currentStudentId, null);
  assert.deepEqual(record.random_call.selectedStudentIds, []);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "buzzer-open"
  });
  assert.equal(record.active_tool, "buzzer");
  assert.match(record.buzzer.id, /^buzzer-generated-/);
  assert.equal(record.buzzer.status, "open");
  assert.equal(record.buzzer.openedAt, fixedNow);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "buzzer-close"
  });
  assert.equal(record.buzzer.status, "closed");
  assert.equal(record.buzzer.closedAt, fixedNow);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "timer-start",
    payload: { mode: "countdown", durationSeconds: 35.6 }
  });
  assert.equal(record.active_tool, "timer");
  assert.equal(record.timer.status, "running");
  assert.equal(record.timer.durationSeconds, 36);
  assert.equal(record.timer.remainingSeconds, 36);
  assert.equal(record.timer.startedAt, fixedNow);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "timer-pause"
  });
  assert.equal(record.timer.status, "paused");
  assert.equal(record.timer.pausedAt, fixedNow);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "timer-resume"
  });
  assert.equal(record.timer.status, "running");
  assert.equal(record.timer.startedAt, fixedNow);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "timer-stop"
  });
  assert.equal(record.timer.status, "ended");

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "teams-auto",
    payload: { teamCount: 2 }
  });
  assert.equal(record.active_tool, "teams");
  assert.deepEqual(record.teams.teams.map((team: { studentIds: string[] }) => team.studentIds), [["student-1"], ["student-2"]]);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "team-score",
    payload: { teamId: "team-1", delta: 3 }
  });
  assert.equal(record.teams.teams[0]?.score, 3);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "projector-set",
    payload: { mode: "work-samples", showNames: true, selectedWorkSampleId: "sample-1" }
  });
  assert.equal(record.active_tool, "projector");
  assert.deepEqual(record.projection, {
    mode: "work-samples",
    showNames: true,
    selectedWorkSampleId: "sample-1",
    updatedAt: fixedNow
  });

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "screen-sync",
    payload: { target: "math-workbench", title: "Explore", href: "/x", locked: false }
  });
  assert.equal(record.active_tool, "screen-sync");
  assert.deepEqual(record.screen_sync, {
    target: "math-workbench",
    title: { en: "Explore", zh: "Explore" },
    href: "/x",
    locked: false,
    updatedAt: fixedNow
  });

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "whiteboard-open"
  });
  assert.equal(record.active_tool, "whiteboard");
  assert.equal(record.screen_sync.target, "whiteboard");
  assert.equal(record.screen_sync.href, "/classroom?code=OWN123");

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "whiteboard-add-stroke",
    payload: {
      tool: "highlighter",
      color: "#f59e0b",
      width: 7,
      points: [{ x: -1, y: 0.5 }, { x: 1.5, y: 0.7 }]
    }
  });
  assert.equal(record.whiteboard_strokes.length, 1);
  assert.equal(record.whiteboard_strokes[0]?.tool, "highlighter");
  assert.deepEqual(record.whiteboard_strokes[0]?.points, [{ x: 0, y: 0.5 }, { x: 1, y: 0.7 }]);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "whiteboard-undo"
  });
  assert.equal(record.whiteboard_strokes.length, 0);

  record.whiteboard_strokes.push({ id: "stroke-old", tool: "pen", color: "#000", width: 1, points: [{ x: 0, y: 0 }], createdAt: fixedNow });
  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "whiteboard-clear"
  });
  assert.equal(record.whiteboard_strokes.length, 0);

  await store.updateTeacherLiveTool({
    teacherId: "teacher-member",
    sessionId: "session-owned",
    action: "math-workbench-set",
    payload: {
      tool: "geometry",
      topicId: "topic-s2",
      title: "Triangle lab",
      parameters: { sides: 3 },
      locked: true
    }
  });
  assert.equal(record.active_tool, "math-workbench");
  assert.deepEqual(record.math_workbench, {
    tool: "geometry",
    topicId: "topic-s2",
    title: { en: "Triangle lab", zh: "Triangle lab" },
    parameters: { sides: 3 },
    locked: true,
    updatedAt: fixedNow
  });
  assert.equal(database.teacher_live_sessions.find((session) => session.id === "session-owned")?.updated_at, fixedNow);
});

test("teacher ops live-session persistence rejects invalid teacher live tool updates", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  assert.deepEqual(
    await store.updateTeacherLiveTool({
      teacherId: "student-1",
      sessionId: "session-owned",
      action: "attendance-open"
    }),
    { status: "forbidden" }
  );
  assert.deepEqual(
    await store.updateTeacherLiveTool({
      teacherId: "teacher-1",
      sessionId: "session-other",
      action: "attendance-open"
    }),
    { status: "not-found" }
  );
  assert.deepEqual(
    await store.updateTeacherLiveTool({
      teacherId: "teacher-member",
      sessionId: "session-owned-ended",
      action: "attendance-open"
    }),
    { status: "not-found" }
  );
  assert.deepEqual(
    await store.updateTeacherLiveTool({
      teacherId: "teacher-member",
      sessionId: "session-owned",
      action: "attendance-set",
      payload: { studentId: "missing-student", status: "present" }
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.updateTeacherLiveTool({
      teacherId: "teacher-member",
      sessionId: "session-owned",
      action: "team-score",
      payload: { teamId: "missing-team", delta: 3 }
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.updateTeacherLiveTool({
      teacherId: "teacher-member",
      sessionId: "session-owned",
      action: "whiteboard-add-stroke",
      payload: { points: [{ x: 0, y: 0 }] }
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.updateTeacherLiveTool({
      teacherId: "teacher-member",
      sessionId: "session-owned",
      action: "unknown-action"
    }),
    { status: "invalid" }
  );
});

test("teacher ops live-session persistence ends sessions through fake storage", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.endTeacherLiveSession({
    teacherId: "teacher-member",
    sessionId: "session-owned"
  });

  assert.equal(result.status, "ended");
  assert.equal(result.session?.id, "session-owned");
  assert.equal(database.teacher_live_sessions.find((session) => session.id === "session-owned")?.status, "ended");
  assert.equal(database.teacher_live_sessions.find((session) => session.id === "session-owned")?.ended_at, fixedNow);
  assert.equal(database.teacher_live_sessions.find((session) => session.id === "session-owned")?.updated_at, fixedNow);
  assert.deepEqual(
    await store.endTeacherLiveSession({
      teacherId: "student-1",
      sessionId: "session-owned"
    }),
    { status: "forbidden" }
  );
  assert.deepEqual(
    await store.endTeacherLiveSession({
      teacherId: "teacher-1",
      sessionId: "session-other"
    }),
    { status: "not-found" }
  );
});

test("legacy userStore delegates teacher live-session and classroom live operations to extracted persistence", async () => {
  const userStoreSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(
    userStoreSource,
    /export const getTeacherLiveSessionById = teacherOpsUserStore\.getTeacherLiveSessionById;/
  );
  assert.match(
    userStoreSource,
    /export const getTeacherLiveData = teacherOpsUserStore\.getTeacherLiveData;/
  );
  assert.match(
    userStoreSource,
    /export const startTeacherLiveSession = teacherOpsUserStore\.startTeacherLiveSession;/
  );
  assert.match(
    userStoreSource,
    /export const getClassroomLiveSessionForStudent = studentActivityUserStore\.getClassroomLiveSessionForStudent;/
  );
  assert.match(
    userStoreSource,
    /export const getClassroomLiveSessionForTeacherPreview = teacherOpsUserStore\.getClassroomLiveSessionForTeacherPreview;/
  );
  assert.match(
    userStoreSource,
    /export const submitClassroomLiveResponse = studentActivityUserStore\.submitClassroomLiveResponse;/
  );
  assert.match(
    userStoreSource,
    /export const submitClassroomLiveAction = studentActivityUserStore\.submitClassroomLiveAction;/
  );
  assert.match(
    userStoreSource,
    /export const updateTeacherLiveTool = teacherOpsUserStore\.updateTeacherLiveTool;/
  );
  assert.match(
    userStoreSource,
    /export const endTeacherLiveSession = teacherOpsUserStore\.endTeacherLiveSession;/
  );
});

test("teacher ops live-session persistence owns attendance and live tool type normalization helpers", async () => {
  const storeModule = await import("@/lib/server/userStore/teacherOpsLiveSessionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsLiveSessionPersistence.ts"),
    "utf8"
  );

  assert.equal(typeof storeModule.isValidAttendanceStatus, "function");
  assert.equal(typeof storeModule.normalizeAttendanceStatus, "function");
  assert.equal(typeof storeModule.isValidTeacherLiveToolType, "function");
  assert.equal(typeof storeModule.normalizeTeacherLiveToolType, "function");
  assert.equal(typeof storeModule.normalizeTeacherLiveEventType, "function");
  assert.match(helperSource, /export function isValidAttendanceStatus\(/);
  assert.match(helperSource, /export function normalizeAttendanceStatus\(/);
  assert.match(helperSource, /export function isValidTeacherLiveToolType\(/);
  assert.match(helperSource, /export function normalizeTeacherLiveToolType\(/);
  assert.match(helperSource, /export function normalizeTeacherLiveEventType\(/);
  assert.match(rootSource, /normalizeAttendanceStatus as normalizeAttendanceStatusFromTeacherOpsLiveSession/);
  assert.match(rootSource, /normalizeTeacherLiveToolType as normalizeTeacherLiveToolTypeFromTeacherOpsLiveSession/);
  assert.match(rootSource, /normalizeTeacherLiveEventType as normalizeTeacherLiveEventTypeFromTeacherOpsLiveSession/);
  assert.doesNotMatch(rootSource, /const validAttendanceStatuses\b/);
  assert.doesNotMatch(rootSource, /const validTeacherLiveToolTypes\b/);

  const isValidAttendanceStatus = storeModule.isValidAttendanceStatus as (status: unknown) => boolean;
  const normalizeAttendanceStatus = storeModule.normalizeAttendanceStatus as (status: unknown) => string;
  const isValidTeacherLiveToolType = storeModule.isValidTeacherLiveToolType as (toolType: unknown) => boolean;
  const normalizeTeacherLiveToolType = storeModule.normalizeTeacherLiveToolType as (toolType: unknown) => string;
  const normalizeTeacherLiveEventType = storeModule.normalizeTeacherLiveEventType as (toolType: unknown) => string;

  assert.equal(isValidAttendanceStatus("late"), true);
  assert.equal(isValidAttendanceStatus("remote"), false);
  assert.equal(normalizeAttendanceStatus("excused"), "excused");
  assert.equal(normalizeAttendanceStatus("remote"), "absent");
  assert.equal(isValidTeacherLiveToolType("math-workbench"), true);
  assert.equal(isValidTeacherLiveToolType("poll"), false);
  assert.equal(normalizeTeacherLiveToolType("screen-sync"), "screen-sync");
  assert.equal(normalizeTeacherLiveToolType("poll"), "attendance");
  assert.equal(normalizeTeacherLiveEventType("whiteboard"), "whiteboard");
  assert.equal(normalizeTeacherLiveEventType("session"), "session");
  assert.equal(normalizeTeacherLiveEventType("poll"), "session");
});
