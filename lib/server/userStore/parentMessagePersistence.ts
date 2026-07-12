import { randomUUID } from "crypto";
import { parentMessageBodyMaxLength, parentMessageSubjectMaxLength } from "@/lib/parentConstraints";
import type {
  GradeId,
  ParentChildSummary,
  ParentMessageCategory,
  ParentMessagesData,
  ParentMessageThread,
  StudentSession,
  TeacherMessageAttachment,
  TeacherMessageEntry,
  TeacherMessagePriority,
  TeacherMessageSenderRole,
  TeacherMessageStatus,
  TeacherReport,
  TeacherReportType
} from "@/types";

type UserRole = StudentSession["role"];

type ParentMessageUserRecord = {
  id: string;
  username?: string;
  role: UserRole;
};

type ParentMessageStudentProfileRecord = {
  user_id: string;
  name?: string;
  grade?: GradeId;
};

type ParentMessageGuardianLinkRecord = {
  parent_id: string;
  student_id: string;
  status: string;
};

type ParentMessageClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type ParentMessageTeacherClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade?: GradeId;
};

type ParentMessageThreadRecord = {
  id: string;
  class_id?: string;
  student_id: string;
  teacher_id: string;
  guardian_id?: string;
  assignment_id?: string;
  topic_id?: string;
  report_id?: string;
  parent_category?: ParentMessageCategory;
  subject_en: string;
  subject_zh: string;
  latest_message: string;
  status: TeacherMessageStatus;
  priority: TeacherMessagePriority;
  starred: boolean;
  last_message_at: string;
  created_at: string;
};

type ParentMessageEntryRecord = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: TeacherMessageSenderRole;
  recipient_id: string;
  body: string;
  attachments: TeacherMessageAttachment[];
  created_at: string;
};

type ParentMessageReportRecord = {
  id: string;
  type: TeacherReportType;
  student_id?: string;
};

export type ParentMessagePersistenceDatabase = {
  class_enrollments: ParentMessageClassEnrollmentRecord[];
  guardian_links: ParentMessageGuardianLinkRecord[];
  student_profiles?: ParentMessageStudentProfileRecord[];
  teacher_classes: ParentMessageTeacherClassRecord[];
  teacher_message_entries: ParentMessageEntryRecord[];
  teacher_messages: ParentMessageThreadRecord[];
  teacher_reports?: ParentMessageReportRecord[];
  users: ParentMessageUserRecord[];
};

export type ParentMessagePersistenceStoreDependencies = {
  createEntryId?: () => string;
  createThreadId?: () => string;
  getParentChildSummaries: (
    database: ParentMessagePersistenceDatabase,
    user: ParentMessageUserRecord
  ) => ParentChildSummary[];
  getParentReportsForStudent: (
    database: ParentMessagePersistenceDatabase,
    studentId: string
  ) => TeacherReport[];
  mutateDatabase?: <T>(
    mutator: (database: ParentMessagePersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  now?: () => Date;
  readDatabase: () => Promise<ParentMessagePersistenceDatabase>;
};

export type ParentMessagePersistenceStore = ReturnType<typeof createParentMessagePersistenceStore>;

type ParentMessageCreateResult =
  | { status: "created"; thread: ParentMessageThread }
  | { status: "forbidden" | "invalid" | "not-found" | "too-long"; thread?: undefined };

type ParentMessageReplyResult =
  | { status: "sent"; thread: ParentMessageThread }
  | { status: "forbidden" | "invalid" | "not-found" | "too-long"; thread?: undefined };

const validParentMessageCategories = new Set<ParentMessageCategory>([
  "learning-support",
  "homework",
  "wellbeing",
  "report-question",
  "logistics"
]);

const parentMessageCategories: ParentMessagesData["categories"] = [
  { id: "learning-support", label: { en: "Learning support", zh: "學習支援" } },
  { id: "homework", label: { en: "Homework", zh: "家課 / 作業" } },
  { id: "wellbeing", label: { en: "Wellbeing", zh: "身心狀態" } },
  { id: "report-question", label: { en: "Report question", zh: "報告查詢" } },
  { id: "logistics", label: { en: "Logistics", zh: "行政安排" } }
];

export function isValidParentMessageCategory(value: unknown): value is ParentMessageCategory {
  return validParentMessageCategories.has(value as ParentMessageCategory);
}

export function normalizeParentMessageCategory(value: unknown): ParentMessageCategory {
  return isValidParentMessageCategory(value)
    ? value as ParentMessageCategory
    : "learning-support";
}

function canUseParentArea(user?: ParentMessageUserRecord | null): user is ParentMessageUserRecord {
  return user?.role === "parent" || user?.role === "admin";
}

function studentProfileFor(database: ParentMessagePersistenceDatabase, userId: string) {
  return database.student_profiles?.find((profile) => profile.user_id === userId);
}

function parentCanAccessStudentInDatabase(
  database: ParentMessagePersistenceDatabase,
  parentId: string,
  studentId: string
) {
  const parent = database.users.find((candidate) => candidate.id === parentId);
  if (parent?.role === "admin") {
    return database.users.some((candidate) => candidate.id === studentId && candidate.role === "student");
  }
  return database.guardian_links.some((link) => (
    link.parent_id === parentId &&
    link.student_id === studentId &&
    link.status === "active"
  ));
}

function teacherClassesForStudent(database: ParentMessagePersistenceDatabase, studentId: string) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.student_id === studentId)
    .map((enrollment) => database.teacher_classes.find((teacherClass) => teacherClass.id === enrollment.class_id))
    .filter((teacherClass): teacherClass is ParentMessageTeacherClassRecord => Boolean(teacherClass));
}

function firstTeacherClassForParentMessage(database: ParentMessagePersistenceDatabase, studentId: string) {
  return teacherClassesForStudent(database, studentId)[0] ?? null;
}

function toParentMessageThreadBase(database: ParentMessagePersistenceDatabase, record: ParentMessageThreadRecord) {
  const profile = studentProfileFor(database, record.student_id);
  const guardianProfile = record.guardian_id ? studentProfileFor(database, record.guardian_id) : null;
  const guardianUser = record.guardian_id ? database.users.find((candidate) => candidate.id === record.guardian_id) : null;

  return {
    id: record.id,
    classId: record.class_id,
    studentId: record.student_id,
    studentName: profile?.name ?? "Unknown student",
    teacherId: record.teacher_id,
    guardianId: record.guardian_id,
    guardianName: guardianProfile?.name ?? guardianUser?.username,
    assignmentId: record.assignment_id,
    topicId: record.topic_id,
    reportId: record.report_id,
    parentCategory: record.parent_category,
    subject: {
      en: record.subject_en,
      zh: record.subject_zh
    },
    latestMessage: record.latest_message,
    status: record.status,
    priority: record.priority,
    starred: record.starred,
    lastMessageAt: record.last_message_at,
    createdAt: record.created_at
  };
}

function toParentMessageEntry(database: ParentMessagePersistenceDatabase, record: ParentMessageEntryRecord): TeacherMessageEntry {
  const senderProfile = studentProfileFor(database, record.sender_id);
  const senderUser = database.users.find((candidate) => candidate.id === record.sender_id);
  return {
    id: record.id,
    threadId: record.thread_id,
    senderId: record.sender_id,
    senderRole: record.sender_role,
    senderName: senderProfile?.name ?? senderUser?.username ?? (record.sender_role === "teacher" ? "Teacher" : "Student"),
    recipientId: record.recipient_id,
    body: record.body,
    attachments: record.attachments ?? [],
    createdAt: record.created_at
  };
}

function buildParentMessageThread(
  database: ParentMessagePersistenceDatabase,
  thread: ParentMessageThreadRecord
): ParentMessageThread {
  const teacher = database.users.find((candidate) => candidate.id === thread.teacher_id);
  const teacherProfile = studentProfileFor(database, thread.teacher_id);
  const classRecord = thread.class_id ? database.teacher_classes.find((candidate) => candidate.id === thread.class_id) : null;
  return {
    ...toParentMessageThreadBase(database, thread),
    className: classRecord?.name,
    teacherName: teacherProfile?.name ?? teacher?.username ?? "Teacher",
    messages: database.teacher_message_entries
      .filter((entry) => entry.thread_id === thread.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((entry) => toParentMessageEntry(database, entry))
  };
}

export function createParentMessagePersistenceStore({
  createEntryId = () => `message-entry-${randomUUID()}`,
  createThreadId = () => `message-thread-${randomUUID()}`,
  getParentChildSummaries,
  getParentReportsForStudent,
  mutateDatabase,
  now = () => new Date(),
  readDatabase
}: ParentMessagePersistenceStoreDependencies) {
  const runMutation = async <T>(mutator: (database: ParentMessagePersistenceDatabase) => T | Promise<T>) => {
    if (!mutateDatabase) {
      throw new Error("Parent message persistence mutation dependency is not configured.");
    }
    return mutateDatabase(mutator);
  };

  return {
    async getParentMessagesData(
      parentId: string,
      selectedStudentId?: string | null,
      selectedThreadId?: string | null
    ): Promise<ParentMessagesData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === parentId);
      if (!canUseParentArea(user)) return null;
      const children = getParentChildSummaries(database, user);
      const allowedStudentIds = new Set(children.map((child) => child.student.id));
      const selectedThreadRecord = selectedThreadId
        ? database.teacher_messages.find((thread) =>
            thread.id === selectedThreadId &&
            thread.guardian_id === parentId &&
            allowedStudentIds.has(thread.student_id)
          ) ?? null
        : null;
      const selectedStudent = selectedThreadRecord?.student_id ??
        (selectedStudentId && allowedStudentIds.has(selectedStudentId) ? selectedStudentId : null);
      const selectedChild = selectedStudent
        ? children.find((child) => child.student.id === selectedStudent) ?? null
        : null;
      const visibleStudentIds = selectedStudent ? new Set([selectedStudent]) : allowedStudentIds;
      const threads = database.teacher_messages
        .filter((thread) => (
          thread.guardian_id === parentId &&
          allowedStudentIds.has(thread.student_id) &&
          visibleStudentIds.has(thread.student_id)
        ))
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
        .map((thread) => buildParentMessageThread(database, thread));
      const selectedThread = selectedThreadId
        ? threads.find((thread) => thread.id === selectedThreadId) ?? null
        : threads[0] ?? null;

      return {
        generatedAt: now().toISOString(),
        children,
        selectedChild,
        threads,
        selectedThread,
        categories: parentMessageCategories,
        reports: Array.from(visibleStudentIds).flatMap((studentId) => getParentReportsForStudent(database, studentId))
      };
    },
    async createParentMessageThread({
      parentId,
      studentId,
      category,
      subject,
      body,
      reportId
    }: {
      parentId: string;
      studentId: string;
      category?: ParentMessageCategory;
      subject: string;
      body: string;
      reportId?: string | null;
    }): Promise<ParentMessageCreateResult> {
      const trimmedSubject = subject.trim();
      const trimmedBody = body.trim();
      if (!trimmedSubject || !trimmedBody) return { status: "invalid" };
      if (trimmedSubject.length > parentMessageSubjectMaxLength || trimmedBody.length > parentMessageBodyMaxLength) {
        return { status: "too-long" };
      }
      if (category !== undefined && !validParentMessageCategories.has(category)) return { status: "invalid" };

      return runMutation((database) => {
        const parent = database.users.find((candidate) => candidate.id === parentId);
        if (!canUseParentArea(parent) || !parentCanAccessStudentInDatabase(database, parentId, studentId)) {
          return { status: "forbidden" };
        }
        const teacherClass = firstTeacherClassForParentMessage(database, studentId);
        if (!teacherClass) return { status: "not-found" };
        const report = reportId
          ? database.teacher_reports?.find((candidate) =>
              candidate.id === reportId &&
              candidate.type === "parent-summary" &&
              candidate.student_id === studentId
            ) ?? null
          : null;
        if (reportId && !report) return { status: "not-found" };
        const timestamp = now().toISOString();
        const thread: ParentMessageThreadRecord = {
          id: createThreadId(),
          class_id: teacherClass.id,
          student_id: studentId,
          teacher_id: teacherClass.teacher_id,
          guardian_id: parent.id,
          report_id: report?.id,
          parent_category: normalizeParentMessageCategory(category),
          subject_en: trimmedSubject,
          subject_zh: trimmedSubject,
          latest_message: trimmedBody,
          status: "unread",
          priority: "normal",
          starred: false,
          last_message_at: timestamp,
          created_at: timestamp
        };
        database.teacher_messages.unshift(thread);
        database.teacher_message_entries.push({
          id: createEntryId(),
          thread_id: thread.id,
          sender_id: parent.id,
          sender_role: "parent",
          recipient_id: teacherClass.teacher_id,
          body: trimmedBody,
          attachments: [],
          created_at: timestamp
        });
        return { status: "created", thread: buildParentMessageThread(database, thread) };
      });
    },
    async replyToParentMessageThread({
      parentId,
      threadId,
      body
    }: {
      parentId: string;
      threadId: string;
      body: string;
    }): Promise<ParentMessageReplyResult> {
      const trimmedBody = body.trim();
      if (!trimmedBody) return { status: "invalid" };
      if (trimmedBody.length > parentMessageBodyMaxLength) return { status: "too-long" };

      return runMutation((database) => {
        const parent = database.users.find((candidate) => candidate.id === parentId);
        if (!canUseParentArea(parent)) return { status: "forbidden" };
        const thread = database.teacher_messages.find((candidate) => candidate.id === threadId && candidate.guardian_id === parentId);
        if (!thread || !parentCanAccessStudentInDatabase(database, parentId, thread.student_id)) {
          return { status: "not-found" };
        }

        const timestamp = now().toISOString();
        database.teacher_message_entries.push({
          id: createEntryId(),
          thread_id: thread.id,
          sender_id: parent.id,
          sender_role: "parent",
          recipient_id: thread.teacher_id,
          body: trimmedBody,
          attachments: [],
          created_at: timestamp
        });
        thread.latest_message = trimmedBody;
        thread.status = "unread";
        thread.last_message_at = timestamp;
        return { status: "sent", thread: buildParentMessageThread(database, thread) };
      });
    }
  };
}
