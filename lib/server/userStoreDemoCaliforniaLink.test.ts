import assert from "node:assert/strict";
import test from "node:test";

import type { GradeId, TeacherInboxThread } from "@/types";
import {
  normalizeTeacherOpsAssignmentCollections,
  teacherOpsSeedAssignmentRecords,
  teacherOpsSeedSubmissionRecords
} from "@/lib/server/userStore/teacherOpsAssignmentPersistence";
import {
  normalizeTeacherOpsClassCollections,
  teacherOpsSeedClassEnrollmentRecords,
  teacherOpsSeedTeacherClassRecords
} from "@/lib/server/userStore/teacherOpsClassPersistence";
import { createTeacherOpsInboxPersistenceStore } from "@/lib/server/userStore/teacherOpsInboxPersistence";
import {
  createStudentActivityPersistenceStore,
  type StudentActivityPersistenceDatabase
} from "@/lib/server/userStore/studentActivityPersistence";

const seededAt = "2026-06-20T10:00:00.000Z";
const jonId = "student-jon-us-ca-super";
const shirleenId = "student-shirleen-us";
const scottId = "teacher-scott-us";
const rhiId = "teacher-rhi-us-ca-super";
const peterId = "student-peter";
const mainlandStudentId = "student-li-mainland";
const californiaClassId = "class-us-ca-p1-2026";
const sampleAssignmentId = "assignment-us-ca-p1-add-subtract-check";
const jonSubmissionId = "submission-us-ca-p1-add-subtract-check-jon";

const seedOptions = {
  demoTeacherId: "teacher-ms-chan",
  demoUserId: peterId,
  gradeIds: [] as readonly GradeId[],
  internalCaliforniaSuperTeacherId: rhiId,
  mainlandDemoTeacherId: "teacher-mainland-phoebe",
  mainlandDemoUserId: mainlandStudentId,
  normalizeClassCode: (classCode: string) => classCode.trim().toUpperCase(),
  shouldSeedDemoUser: () => true,
  unitedStatesDemoTeacherId: scottId,
  unitedStatesDemoUserId: shirleenId
};

function seededDatabase(): StudentActivityPersistenceDatabase & {
  teacher_classes: NonNullable<StudentActivityPersistenceDatabase["teacher_classes"]>;
  teacher_message_entries: NonNullable<StudentActivityPersistenceDatabase["teacher_message_entries"]>;
  teacher_messages: NonNullable<StudentActivityPersistenceDatabase["teacher_messages"]>;
  users: Array<{ id: string; role: "student" | "teacher"; username: string }>;
} {
  return {
    visualization_sessions: [],
    assignment_submission_attempts: [],
    teacher_classes: teacherOpsSeedTeacherClassRecords(seededAt, seedOptions),
    class_enrollments: teacherOpsSeedClassEnrollmentRecords(seededAt, seedOptions),
    assignments: teacherOpsSeedAssignmentRecords(seededAt, { demoTeacherId: seedOptions.demoTeacherId }),
    submissions: teacherOpsSeedSubmissionRecords(seededAt, seedOptions),
    teacher_messages: [],
    teacher_message_entries: [],
    users: [
      { id: scottId, role: "teacher", username: "Teacher Scott" },
      { id: rhiId, role: "teacher", username: "Teacher Rhi" },
      { id: jonId, role: "student", username: "Student Jon" },
      { id: shirleenId, role: "student", username: "Student Shirleen" },
      { id: peterId, role: "student", username: "HK Student Peter" },
      { id: mainlandStudentId, role: "student", username: "Student Peter" }
    ],
    student_profiles: [
      { user_id: jonId, name: "Student Jon" },
      { user_id: scottId, name: "Teacher Scott" },
      { user_id: shirleenId, name: "Student Shirleen" }
    ]
  };
}

function studentStore(database: StudentActivityPersistenceDatabase) {
  let nextId = 0;
  return createStudentActivityPersistenceStore({
    createId: () => `generated-${++nextId}`,
    now: () => new Date(seededAt),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

function inboxStore(database: ReturnType<typeof seededDatabase>) {
  let nextId = 0;
  const inboxDatabase = {
    student_profiles: database.student_profiles,
    teacher_classes: database.teacher_classes.flatMap((teacherClass) =>
      teacherClass.teacher_id ? [{ id: teacherClass.id, teacher_id: teacherClass.teacher_id }] : []
    ),
    teacher_message_entries: database.teacher_message_entries,
    teacher_messages: database.teacher_messages,
    users: database.users
  };
  return createTeacherOpsInboxPersistenceStore({
    createId: () => `reply-${++nextId}`,
    now: () => new Date(seededAt),
    readDatabase: async () => inboxDatabase,
    mutateDatabase: async (mutator) => mutator(inboxDatabase),
    toInboxThread: (sourceDatabase, thread) => ({
      id: thread.id,
      classId: thread.class_id,
      studentId: thread.student_id,
      studentName: thread.student_id,
      teacherId: thread.teacher_id,
      subject: { en: thread.subject_en, zh: thread.subject_zh },
      latestMessage: thread.latest_message,
      status: thread.status,
      priority: thread.priority,
      starred: thread.starred,
      lastMessageAt: thread.last_message_at,
      createdAt: thread.created_at,
      studentGrade: "P1",
      messages: sourceDatabase.teacher_message_entries
        .filter((entry) => entry.thread_id === thread.id)
        .map((entry) => ({
          id: entry.id,
          threadId: entry.thread_id,
          senderId: entry.sender_id,
          senderRole: entry.sender_role,
          senderName: entry.sender_id,
          recipientId: entry.recipient_id,
          body: entry.body,
          attachments: entry.attachments,
          createdAt: entry.created_at
        })),
      studentContext: {
        averageMastery: 0,
        activeMistakes: [],
        currentAssignments: []
      }
    }) satisfies TeacherInboxThread
  });
}

test("Student Jon sees Teacher Scott's sample assignment, can submit it, and can message him", async () => {
  const database = seededDatabase();
  const students = studentStore(database);

  const jonAssignments = await students.getStudentAssignments(jonId);
  assert.deepEqual(jonAssignments.map((item) => item.assignment.id), [sampleAssignmentId]);
  assert.equal(jonAssignments[0]?.assignment.title.en, "Add and subtract check");
  assert.equal(jonAssignments[0]?.assignment.createdBy, scottId);
  assert.equal(jonAssignments[0]?.submission.id, jonSubmissionId);
  assert.equal(jonAssignments[0]?.submission.status, "not-started");
  assert.equal(jonAssignments[0]?.className, "California Grade 1 Mathematics");

  const shirleenAssignments = await students.getStudentAssignments(shirleenId);
  assert.deepEqual(shirleenAssignments.map((item) => item.assignment.id), [sampleAssignmentId]);
  assert.equal(shirleenAssignments[0]?.submission.id, "submission-us-ca-p1-add-subtract-check-shirleen");
  assert.deepEqual(
    (await students.getStudentAssignments(peterId)).map((item) => item.assignment.id),
    ["assignment-quadratics-checkpoint"]
  );
  assert.deepEqual(await students.getStudentAssignments(mainlandStudentId), []);
  assert.deepEqual(await students.getStudentAssignments("student-unlinked"), []);

  const submitted = await students.submitAssignmentWork({
    userId: jonId,
    assignmentId: sampleAssignmentId,
    answerText: "7",
    kind: "initial"
  });
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.status === "submitted" ? submitted.submission.status : null, "submitted");
  assert.equal(submitted.status === "submitted" ? submitted.submission.studentId : null, jonId);
  assert.equal(
    database.submissions?.find((submission) => submission.id === "submission-us-ca-p1-add-subtract-check-shirleen")?.status,
    "not-started"
  );
  assert.equal(
    (await students.getStudentAssignments(jonId))[0]?.submission.status,
    "submitted"
  );

  assert.equal((await students.submitAssignmentWork({
    userId: peterId,
    assignmentId: sampleAssignmentId,
    answerText: "7",
    kind: "initial"
  })).status, "not-found");
  assert.equal((await students.submitAssignmentWork({
    userId: mainlandStudentId,
    assignmentId: sampleAssignmentId,
    answerText: "7",
    kind: "initial"
  })).status, "not-found");
  assert.equal((await students.submitAssignmentWork({
    userId: jonId,
    assignmentId: "assignment-quadratics-checkpoint",
    answerText: "7",
    kind: "initial"
  })).status, "not-found");

  const messages = await students.getStudentMessagesData(jonId);
  assert.deepEqual(messages.classes.map((teacherClass) => ({
    id: teacherClass.id,
    teacherId: teacherClass.teacherId
  })), [{ id: californiaClassId, teacherId: scottId }]);
  assert.deepEqual(messages.threads, []);

  const created = await students.createStudentMessageThread({
    studentId: jonId,
    classId: californiaClassId,
    assignmentId: sampleAssignmentId,
    subject: "Add and subtract check",
    body: "Can you show me the first question?"
  });
  assert.equal(created.status, "created");
  assert.equal(created.status === "created" ? created.thread.teacherId : null, scottId);
  assert.equal(created.status === "created" ? created.thread.teacherName : null, "Teacher Scott");
  assert.equal(created.status === "created" ? created.thread.classId : null, californiaClassId);
  assert.equal(created.status === "created" ? created.thread.studentId : null, jonId);

  const jonThread = created.status === "created" ? created.thread : null;
  assert.ok(jonThread);
  const jonMessages = await students.getStudentMessagesData(jonId, jonThread.id);
  assert.equal(jonMessages.selectedThread?.id, jonThread.id);
  assert.deepEqual(
    (await students.getStudentMessagesData(shirleenId)).threads.map((thread) => thread.id),
    []
  );
  assert.equal((await students.createStudentMessageThread({
    studentId: "student-unlinked",
    classId: californiaClassId,
    subject: "Hello",
    body: "Can I join?"
  })).status, "not-found");

  const mainlandMessage = await students.createStudentMessageThread({
    studentId: mainlandStudentId,
    classId: californiaClassId,
    subject: "Wrong class",
    body: "This should stay with my own teacher."
  });
  assert.equal(mainlandMessage.status, "created");
  assert.notEqual(mainlandMessage.status === "created" ? mainlandMessage.thread.teacherId : null, scottId);
  assert.equal(
    mainlandMessage.status === "created" ? mainlandMessage.thread.classId : null,
    "class-mainland-s4-2026"
  );

  const reply = await inboxStore(database).replyToTeacherMessageThread({
    teacherId: scottId,
    threadId: jonThread.id,
    body: "Yes. Start from the bigger number."
  });
  assert.equal(reply.status, "sent");
  const replyEntry = database.teacher_message_entries.find((entry) => entry.sender_role === "teacher" && entry.thread_id === jonThread.id);
  assert.equal(replyEntry?.sender_id, scottId);
  assert.equal(replyEntry?.recipient_id, jonId);
  assert.equal(replyEntry?.body, "Yes. Start from the bigger number.");
  assert.equal((await inboxStore(database).replyToTeacherMessageThread({
    teacherId: rhiId,
    threadId: jonThread.id,
    body: "I am a different teacher."
  })).status, "not-found");

  const afterReply = await students.getStudentMessagesData(jonId, jonThread.id);
  assert.equal(afterReply.selectedThread?.messages.at(-1)?.senderRole, "teacher");
  assert.equal(afterReply.selectedThread?.messages.at(-1)?.senderName, "Teacher Scott");
});

test("missing Jon linkage is backfilled idempotently and does not reset other demo rows", async () => {
  const producedAt = "2026-06-21T10:00:00.000Z";
  const classOptions = {
    ...seedOptions,
    shouldSeedDemoUser: () => false
  };
  const existingClass = teacherOpsSeedTeacherClassRecords(seededAt, seedOptions)
    .find((teacherClass) => teacherClass.id === californiaClassId);
  assert.ok(existingClass);

  const firstClasses = normalizeTeacherOpsClassCollections({
    teacher_classes: [{
      ...existingClass,
      description_en: "Kept production description."
    }],
    class_enrollments: [
      {
        id: "enrollment-us-ca-p1-student-shirleen",
        class_id: californiaClassId,
        student_id: shirleenId,
        joined_at: seededAt
      },
      {
        id: "enrollment-custom-other",
        class_id: californiaClassId,
        student_id: "student-other",
        joined_at: seededAt
      }
    ]
  }, producedAt, classOptions);
  const secondClasses = normalizeTeacherOpsClassCollections({
    teacher_classes: firstClasses.teacher_classes,
    class_enrollments: firstClasses.class_enrollments
  }, "2026-06-22T10:00:00.000Z", classOptions);

  assert.deepEqual(secondClasses, firstClasses);
  assert.equal(
    firstClasses.teacher_classes.find((teacherClass) => teacherClass.id === californiaClassId)?.description_en,
    "Kept production description."
  );
  assert.deepEqual(
    firstClasses.class_enrollments
      .filter((enrollment) => enrollment.student_id === jonId)
      .map((enrollment) => enrollment.class_id),
    [californiaClassId]
  );
  assert.equal(
    firstClasses.class_enrollments.filter((enrollment) => enrollment.id === "enrollment-us-ca-p1-student-jon").length,
    1
  );
  assert.equal(
    firstClasses.class_enrollments.find((enrollment) => enrollment.id === "enrollment-custom-other")?.student_id,
    "student-other"
  );
  assert.equal(
    firstClasses.class_enrollments.some((enrollment) =>
      enrollment.student_id === peterId && enrollment.class_id === californiaClassId
    ),
    false
  );
  assert.equal(
    firstClasses.class_enrollments.some((enrollment) =>
      enrollment.student_id === mainlandStudentId && enrollment.class_id === californiaClassId
    ),
    false
  );

  const submittedShirleen = {
    id: "submission-us-ca-p1-add-subtract-check-shirleen",
    assignment_id: sampleAssignmentId,
    student_id: shirleenId,
    status: "submitted" as const,
    score: 3,
    submitted_at: seededAt,
    graded_at: null,
    feedback_en: "Kept.",
    feedback_zh: "",
    updated_at: seededAt
  };
  const assignmentOptions = {
    deletedAssignmentIds: new Set<string>(),
    demoTeacherId: seedOptions.demoTeacherId,
    demoUserId: peterId,
    shouldSeedDemoUser: () => false
  };
  const firstAssignments = normalizeTeacherOpsAssignmentCollections({
    assignments: [],
    submissions: [submittedShirleen]
  }, producedAt, assignmentOptions);
  const jonRow = firstAssignments.submissions.find((submission) => submission.id === jonSubmissionId);
  assert.equal(jonRow?.student_id, jonId);
  assert.equal(jonRow?.status, "not-started");
  assert.equal(
    firstAssignments.submissions.find((submission) => submission.student_id === shirleenId)?.status,
    "submitted"
  );
  assert.equal(
    firstAssignments.submissions.find((submission) => submission.student_id === shirleenId)?.score,
    3
  );

  const afterJonSubmits = firstAssignments.submissions.map((submission) =>
    submission.id === jonSubmissionId
      ? { ...submission, status: "submitted" as const, score: 9, submitted_at: producedAt }
      : submission
  );
  const secondAssignments = normalizeTeacherOpsAssignmentCollections({
    assignments: firstAssignments.assignments,
    submissions: afterJonSubmits
  }, "2026-06-22T10:00:00.000Z", assignmentOptions);
  assert.equal(
    secondAssignments.submissions.find((submission) => submission.id === jonSubmissionId)?.status,
    "submitted"
  );
  assert.equal(
    secondAssignments.submissions.find((submission) => submission.id === jonSubmissionId)?.score,
    9
  );
  assert.equal(
    secondAssignments.submissions.filter((submission) => submission.id === jonSubmissionId).length,
    1
  );

  const deleted = normalizeTeacherOpsAssignmentCollections({
    assignments: secondAssignments.assignments,
    submissions: secondAssignments.submissions
  }, producedAt, {
    ...assignmentOptions,
    deletedAssignmentIds: new Set([sampleAssignmentId])
  });
  assert.equal(deleted.assignments.some((assignment) => assignment.id === sampleAssignmentId), false);
  assert.equal(deleted.submissions.some((submission) => submission.student_id === jonId), false);
  assert.equal(deleted.submissions.some((submission) => submission.student_id === shirleenId), false);
});
