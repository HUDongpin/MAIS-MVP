import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsStudentProfilePersistenceStore,
  type TeacherOpsStudentProfilePersistenceDatabase,
  type TeacherOpsStudentProfilePersistenceStoreDependencies
} from "@/lib/server/userStore/teacherOpsStudentProfilePersistence";
import type {
  Assignment,
  GuardianLink,
  MistakeBookItem,
  StudentSession,
  Submission,
  TeacherClass,
  TeacherMessage,
  TeacherStudentMasteryTarget
} from "@/types";

function createDatabase(): TeacherOpsStudentProfilePersistenceDatabase {
  return {
    ai_tutor_messages: [
      {
        id: "ai-older",
        user_id: "student-1",
        role: "student",
        content: "Can you explain factorisation?",
        created_at: "2026-06-19T09:00:00.000Z"
      },
      {
        id: "ai-newer",
        user_id: "student-1",
        role: "tutor",
        content: "Try grouping the terms first.",
        created_at: "2026-06-20T11:00:00.000Z"
      },
      {
        id: "ai-outside-window",
        user_id: "student-1",
        role: "student",
        content: "Old message",
        created_at: "2026-05-01T00:00:00.000Z"
      }
    ],
    assignments: [
      {
        id: "assignment-old",
        class_id: "class-1",
        updated_at: "2026-06-19T10:00:00.000Z"
      },
      {
        id: "assignment-new",
        class_id: "class-1",
        updated_at: "2026-06-20T10:00:00.000Z"
      }
    ],
    attempts: [
      {
        id: "attempt-old",
        user_id: "student-1",
        question_id: "question-1",
        selected_answer: "A",
        is_correct: true,
        duration_seconds: 42,
        created_at: "2026-06-18T08:00:00.000Z"
      },
      {
        id: "attempt-new",
        user_id: "student-1",
        question_id: "missing-question",
        selected_answer: "B",
        is_correct: false,
        duration_seconds: null,
        created_at: "2026-06-20T12:00:00.000Z"
      }
    ],
    class_enrollments: [
      {
        id: "enrollment-1",
        class_id: "class-1",
        student_id: "student-1"
      },
      {
        id: "enrollment-2",
        class_id: "class-other",
        student_id: "student-2"
      }
    ],
    guardian_links: [
      {
        id: "guardian-active",
        parent_id: "parent-1",
        student_id: "student-1",
        status: "active"
      },
      {
        id: "guardian-inactive",
        parent_id: "parent-2",
        student_id: "student-1",
        status: "inactive"
      }
    ],
    learning_events: [
      {
        id: "event-1",
        user_id: "student-1",
        created_at: "2026-06-19T08:30:00.000Z"
      }
    ],
    lesson_progress: [
      {
        user_id: "student-1",
        topic_id: "topic-1",
        mastery: 80,
        status: "completed",
        updated_at: "2026-06-18T09:00:00.000Z"
      },
      {
        user_id: "student-1",
        topic_id: "topic-2",
        mastery: 40,
        status: "in-progress",
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    mistakes: [
      {
        user_id: "student-1",
        question_id: "question-1",
        wrong_attempts: 3,
        mastered: false,
        last_attempt_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    questions: [
      {
        id: "question-1",
        topic_id: "topic-1"
      }
    ],
    school_memberships: [
      {
        user_id: "teacher-member",
        class_id: "class-1",
        role: "teacher"
      }
    ],
    submissions: [
      {
        id: "submission-new",
        assignment_id: "assignment-new",
        student_id: "student-1",
        status: "submitted",
        updated_at: "2026-06-20T13:00:00.000Z"
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        teacher_id: "teacher-1",
        name: "3A",
        grade: "S3"
      },
      {
        id: "class-other",
        teacher_id: "teacher-other",
        name: "4B",
        grade: "S4"
      }
    ],
    teacher_mastery_targets: [
      {
        id: "target-1",
        teacher_id: "teacher-1",
        student_id: "student-1",
        topic_id: "topic-2",
        mastery: 70,
        note: "Raise target after review lesson.",
        updated_at: "2026-06-20T10:30:00.000Z"
      }
    ],
    teacher_messages: [
      {
        id: "message-1",
        teacher_id: "teacher-1",
        student_id: "student-1",
        last_message_at: "2026-06-20T07:00:00.000Z"
      },
      {
        id: "message-other-teacher",
        teacher_id: "teacher-other",
        student_id: "student-1",
        last_message_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    topics: [
      {
        id: "topic-1",
        grade: "S3",
        title_en: "Linear Equations",
        title_zh: "一元一次方程"
      },
      {
        id: "topic-2",
        grade: "S3",
        title_en: "Factorisation",
        title_zh: "因式分解"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-member", role: "teacher" },
      { id: "teacher-other", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" },
      { id: "parent-1", role: "parent" }
    ],
    visualization_sessions: [
      {
        id: "viz-1",
        user_id: "student-1",
        updated_at: "2026-06-19T12:00:00.000Z"
      }
    ]
  };
}

function createTestStore(
  database: TeacherOpsStudentProfilePersistenceDatabase,
  ensureParentInviteCodeForStudent: TeacherOpsStudentProfilePersistenceStoreDependencies["ensureParentInviteCodeForStudent"] =
    async (studentId) => `INVITE-${studentId}`
) {
  return createTeacherOpsStudentProfilePersistenceStore({
    now: () => new Date("2026-06-21T12:00:00.000Z"),
    readDatabase: async () => database,
    ensureParentInviteCodeForStudent,
    studentSessionProjection: (_database, user) =>
      user.role === "student"
        ? ({
            id: user.id,
            role: "student",
            name: user.id === "student-1" ? "Ada Student" : user.id
          } as unknown as StudentSession)
        : null,
    classProjection: (_database, teacherClass) =>
      ({
        id: teacherClass.id,
        teacherId: teacherClass.teacher_id,
        name: teacherClass.name,
        grade: teacherClass.grade
      } as TeacherClass),
    guardianLinkProjection: (_database, link) =>
      ({
        id: link.id,
        parentId: link.parent_id,
        studentId: link.student_id,
        status: link.status
      } as GuardianLink),
    assignmentProjection: (_database, assignment) =>
      ({
        id: assignment.id,
        classId: assignment.class_id,
        updatedAt: assignment.updated_at
      } as Assignment),
    submissionProjection: (_database, submission) =>
      ({
        id: submission.id,
        assignmentId: submission.assignment_id,
        studentId: submission.student_id,
        status: submission.status,
        updatedAt: submission.updated_at
      } as Submission),
    messageProjection: (_database, message) =>
      ({
        id: message.id,
        teacherId: message.teacher_id,
        studentId: message.student_id
      } as TeacherMessage),
    mistakeProjection: (_database, mistake) =>
      ({
        questionId: mistake.question_id,
        wrongAttempts: mistake.wrong_attempts,
        mastered: mistake.mastered
      } as MistakeBookItem),
    topicIdsForClass: (_database, teacherClass) =>
      teacherClass.id === "class-1" ? ["topic-1", "topic-2"] : [],
    topicTitleProjection: (_database, topic) => ({
      en: topic.title_en,
      zh: topic.title_zh
    }),
    topicLabelForQuestion: (_database, question) => ({
      en: `Topic ${question.topic_id}`,
      zh: `課題 ${question.topic_id}`
    }),
    masteryTargetProjection: (_database, target) =>
      ({
        topicId: target.topic_id,
        mastery: target.mastery,
        note: target.note,
        updatedAt: target.updated_at,
        teacherName: `Teacher ${target.teacher_id}`
      } as TeacherStudentMasteryTarget)
  });
}

test("teacher ops student profile persistence builds a profile without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsStudentProfilePersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const result = await createTestStore(createDatabase()).getTeacherStudentProfileData("teacher-1", "student-1");

  assert.equal(result?.student.id, "student-1");
  assert.deepEqual(result?.classes.map((teacherClass) => teacherClass.id), ["class-1"]);
  assert.equal(result?.parentInviteCode, "INVITE-student-1");
  assert.deepEqual(result?.guardianLinks.map((link) => link.id), ["guardian-active"]);
  assert.equal(result?.averageMastery, 60);
  assert.equal(result?.recentActivityAt, "2026-06-20T13:00:00.000Z");
  assert.deepEqual(result?.progress.map((progress) => ({
    topicId: progress.topicId,
    mastery: progress.mastery,
    target: progress.teacherMasteryTarget?.mastery ?? null
  })), [
    { topicId: "topic-2", mastery: 40, target: 70 },
    { topicId: "topic-1", mastery: 80, target: null }
  ]);
  assert.deepEqual(result?.assignments.map((item) => `${item.assignment.id}:${item.submission?.id ?? "none"}`), [
    "assignment-new:submission-new",
    "assignment-old:none"
  ]);
  assert.deepEqual(result?.messages.map((message) => message.id), ["message-1"]);
  assert.deepEqual(result?.recentAttempts.map((attempt) => `${attempt.id}:${attempt.topic.en}`), [
    "attempt-new:Unknown topic",
    "attempt-old:Topic topic-1"
  ]);
  assert.deepEqual(result?.mistakes.map((mistake) => mistake.questionId), ["question-1"]);
  assert.equal(result?.aiTutor.messageCount7d, 2);
  assert.equal(result?.aiTutor.lastMessageAt, "2026-06-20T11:00:00.000Z");
});

test("teacher ops student profile exposes an ordered AI tutor transcript to authorised teachers", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.getStudentAiTutorTranscriptForTeacher({
    userId: "teacher-1",
    studentId: "student-1"
  });
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.studentName, "Ada Student");
  // Newest-first then re-sorted oldest -> newest so the panel reads as a conversation.
  assert.deepEqual(result.messages.map((message) => message.id), [
    "ai-outside-window",
    "ai-older",
    "ai-newer"
  ]);
  assert.deepEqual(result.messages.map((message) => message.role), ["student", "student", "tutor"]);

  const limited = await store.getStudentAiTutorTranscriptForTeacher({
    userId: "teacher-1",
    studentId: "student-1",
    limit: 2
  });
  assert.equal(limited.status, "ok");
  if (limited.status !== "ok") return;
  // The two most recent messages, presented chronologically.
  assert.deepEqual(limited.messages.map((message) => message.id), ["ai-older", "ai-newer"]);
});

test("teacher ops student profile transcript enforces the same access boundary as the profile", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const memberResult = await store.getStudentAiTutorTranscriptForTeacher({
    userId: "teacher-member",
    studentId: "student-1"
  });
  assert.equal(memberResult.status, "ok");

  const adminResult = await store.getStudentAiTutorTranscriptForTeacher({
    userId: "admin-1",
    studentId: "student-1"
  });
  assert.equal(adminResult.status, "ok");

  // A teacher who does not own the student's class cannot read the transcript.
  const otherTeacher = await store.getStudentAiTutorTranscriptForTeacher({
    userId: "teacher-other",
    studentId: "student-1"
  });
  assert.equal(otherTeacher.status, "forbidden");

  // A student cannot use the teacher path at all.
  const studentViewer = await store.getStudentAiTutorTranscriptForTeacher({
    userId: "student-1",
    studentId: "student-1"
  });
  assert.equal(studentViewer.status, "forbidden");

  // An enrolled id that has no student user record is reported as not found.
  const orphanDatabase = createDatabase();
  orphanDatabase.class_enrollments.push({ class_id: "class-1", student_id: "student-ghost" });
  const orphanStore = createTestStore(orphanDatabase);
  const missingStudent = await orphanStore.getStudentAiTutorTranscriptForTeacher({
    userId: "admin-1",
    studentId: "student-ghost"
  });
  assert.equal(missingStudent.status, "student-not-found");
});

test("teacher ops student profile persistence preserves teacher, admin, and membership access semantics", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const memberResult = await store.getTeacherStudentProfileData("teacher-member", "student-1");
  assert.deepEqual(memberResult?.classes.map((teacherClass) => teacherClass.id), ["class-1"]);
  assert.deepEqual(memberResult?.messages, []);

  const adminResult = await store.getTeacherStudentProfileData("admin-1", "student-1");
  assert.deepEqual(adminResult?.messages.map((message) => message.id), [
    "message-other-teacher",
    "message-1"
  ]);

  assert.equal(await store.getTeacherStudentProfileData("student-1", "student-1"), null);
  assert.equal(await store.getTeacherStudentProfileData("teacher-other", "student-1"), null);
  assert.equal(await store.getTeacherStudentProfileData("teacher-1", "missing-student"), null);
});

test("teacher ops student profile persistence does not create parent invite codes for rejected requests", async () => {
  const ensureCalls: string[] = [];
  const store = createTestStore(createDatabase(), async (studentId) => {
    ensureCalls.push(studentId);
    return `INVITE-${studentId}`;
  });

  assert.equal(await store.getTeacherStudentProfileData("teacher-other", "student-1"), null);
  assert.equal(await store.getTeacherStudentProfileData("teacher-1", "missing-student"), null);
  assert.deepEqual(ensureCalls, []);
});

test("teacher ops student profile persistence owns teacher class lookup boundary", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.doesNotMatch(rootSource, /function teacherClassForStudent\b/);
});

test("legacy userStore delegates teacher student profile reads to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /createTeacherOpsStudentProfilePersistenceStore/);
  assert.match(source, /export const getTeacherStudentProfileData = teacherOpsUserStore\.getTeacherStudentProfileData/);
  assert.doesNotMatch(source, /export async function getTeacherStudentProfileData/);
});
