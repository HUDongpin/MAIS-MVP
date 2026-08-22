import { createHash, randomUUID } from "crypto";
import { parentMessageBodyMaxLength, parentMessageSubjectMaxLength } from "@/lib/parentConstraints";
import { toParentChildSummarySafe, toParentReportSafe } from "@/lib/server/userStore/parentSafeDto";
import type {
  GradeId,
  ParentChildSummary,
  ParentMessageCategory,
  ParentMessagesData,
  ParentMessageThreadSafe,
  StudentSession,
  TeacherMessageAttachment,
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
  parent_idempotency_key_hash?: string;
  parent_idempotency_request_hash?: string;
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
  parent_idempotency_key_hash?: string;
  parent_idempotency_request_hash?: string;
};

type ParentMessageReportRecord = {
  id: string;
  type: TeacherReportType;
  student_id?: string;
  class_id?: string;
  generated_by?: string;
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
  | { status: "created" | "replayed"; thread: ParentMessageThreadSafe }
  | { status: "conflict" | "forbidden" | "invalid" | "not-found" | "too-long"; thread?: undefined };

type ParentMessageReplyResult =
  | { status: "sent" | "replayed"; thread: ParentMessageThreadSafe; entryId: string }
  | { status: "conflict" | "forbidden" | "invalid" | "not-found" | "too-long"; entryId?: undefined; thread?: undefined };

type ParentMessageCreateReplayResult =
  | { status: "missing" }
  | { status: "replayed"; thread: ParentMessageThreadSafe }
  | { status: "conflict" | "forbidden" | "invalid" | "too-long"; thread?: undefined };

type ParentMessageReplyReplayResult =
  | { status: "missing" }
  | { status: "replayed"; thread: ParentMessageThreadSafe; entryId: string }
  | { status: "conflict" | "forbidden" | "invalid" | "not-found" | "too-long"; entryId?: undefined; thread?: undefined };

export const parentMessageIdempotencyKeyMinLength = 16;
export const parentMessageIdempotencyKeyMaxLength = 128;

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
  return user?.role === "parent";
}

function studentProfileFor(database: ParentMessagePersistenceDatabase, userId: string) {
  return database.student_profiles?.find((profile) => profile.user_id === userId);
}

function parentCanAccessStudentInDatabase(
  database: ParentMessagePersistenceDatabase,
  parentId: string,
  studentId: string
) {
  return database.guardian_links.some((link) => (
    link.parent_id === parentId &&
    link.student_id === studentId &&
    link.status === "active"
  ));
}

function validIdempotencyKey(value: string) {
  return value.length >= parentMessageIdempotencyKeyMinLength &&
    value.length <= parentMessageIdempotencyKeyMaxLength &&
    /^[A-Za-z0-9._:~-]+$/u.test(value);
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function idempotencyKeyHash(scope: "create" | "reply", parentId: string, key: string) {
  return digest(`${scope}\u0000${parentId}\u0000${key}`);
}

function createRequestHash({
  parentId,
  studentId,
  classId,
  category,
  subject,
  body,
  reportId
}: {
  parentId: string;
  studentId: string;
  classId: string;
  category?: ParentMessageCategory;
  subject: string;
  body: string;
  reportId?: string | null;
}) {
  return digest(JSON.stringify({
    parentId,
    studentId,
    classId,
    category: normalizeParentMessageCategory(category),
    subject,
    body,
    reportId: reportId || null
  }));
}

function replyRequestHash({ parentId, threadId, body }: { parentId: string; threadId: string; body: string }) {
  return digest(JSON.stringify({ parentId, threadId, body }));
}

function exactTeacherClassForStudent(
  database: ParentMessagePersistenceDatabase,
  studentId: string,
  classId: string
) {
  if (!classId) return null;
  const enrolled = database.class_enrollments.some((enrollment) => (
    enrollment.class_id === classId && enrollment.student_id === studentId
  ));
  if (!enrolled) return null;
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId) ?? null;
  if (!teacherClass) return null;
  const teacher = database.users.find((candidate) => (
    candidate.id === teacherClass.teacher_id && candidate.role === "teacher"
  ));
  return teacher ? teacherClass : null;
}

function exactReportTeacherClass(
  database: ParentMessagePersistenceDatabase,
  studentId: string,
  classId: string,
  reportId: string
) {
  const report = database.teacher_reports?.find((candidate) => (
    candidate.id === reportId &&
    candidate.type === "parent-summary" &&
    candidate.student_id === studentId &&
    candidate.class_id === classId &&
    typeof candidate.generated_by === "string" &&
    Boolean(candidate.generated_by)
  )) ?? null;
  if (!report) return null;
  const teacherClass = exactTeacherClassForStudent(database, studentId, classId);
  if (!teacherClass || teacherClass.teacher_id !== report.generated_by) return null;
  return { report, teacherClass };
}

function teacherClassesForStudent(database: ParentMessagePersistenceDatabase, studentId: string) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.student_id === studentId)
    .map((enrollment) => exactTeacherClassForStudent(database, studentId, enrollment.class_id))
    .filter((teacherClass): teacherClass is ParentMessageTeacherClassRecord => Boolean(teacherClass));
}

function parentDisplayName(
  database: ParentMessagePersistenceDatabase,
  userId: string,
  fallback: string
) {
  const profile = studentProfileFor(database, userId);
  return profile?.name ?? fallback;
}

function toParentMessageEntrySafe(database: ParentMessagePersistenceDatabase, record: ParentMessageEntryRecord) {
  return {
    id: record.id,
    senderRole: record.sender_role,
    senderName: parentDisplayName(
      database,
      record.sender_id,
      record.sender_role === "teacher" ? "Teacher" : record.sender_role === "parent" ? "Parent" : "Student"
    ),
    body: record.body,
    createdAt: record.created_at
  };
}

function buildParentMessageThread(
  database: ParentMessagePersistenceDatabase,
  thread: ParentMessageThreadRecord
): ParentMessageThreadSafe {
  const teacherProfile = studentProfileFor(database, thread.teacher_id);
  const classRecord = thread.class_id ? database.teacher_classes.find((candidate) => candidate.id === thread.class_id) : null;
  const studentProfile = studentProfileFor(database, thread.student_id);
  return {
    id: thread.id,
    classId: thread.class_id ?? "",
    className: classRecord?.name ?? "",
    studentId: thread.student_id,
    studentName: studentProfile?.name ?? "Unknown student",
    teacherName: teacherProfile?.name ?? "Teacher",
    ...(thread.report_id ? { reportId: thread.report_id } : {}),
    ...(thread.parent_category ? { parentCategory: thread.parent_category } : {}),
    subject: {
      en: thread.subject_en,
      zh: thread.subject_zh
    },
    latestMessage: thread.latest_message,
    status: thread.status,
    priority: thread.priority,
    lastMessageAt: thread.last_message_at,
    createdAt: thread.created_at,
    messages: database.teacher_message_entries
      .filter((entry) => entry.thread_id === thread.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((entry) => toParentMessageEntrySafe(database, entry))
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

  type CreateParams = {
    parentId: string;
    studentId: string;
    classId: string;
    idempotencyKey: string;
    category?: ParentMessageCategory;
    subject: string;
    body: string;
    reportId?: string | null;
  };
  type ReplyParams = {
    parentId: string;
    threadId: string;
    idempotencyKey: string;
    body: string;
  };

  function normalizedCreateInput(input: CreateParams) {
    const normalized = {
      ...input,
      parentId: input.parentId.trim(),
      studentId: input.studentId.trim(),
      classId: input.classId.trim(),
      idempotencyKey: input.idempotencyKey.trim(),
      subject: input.subject.trim(),
      body: input.body.trim(),
      reportId: input.reportId?.trim() || null
    };
    if (
      !normalized.parentId ||
      !normalized.studentId ||
      !normalized.classId ||
      !normalized.subject ||
      !normalized.body ||
      !validIdempotencyKey(normalized.idempotencyKey) ||
      (normalized.category !== undefined && !validParentMessageCategories.has(normalized.category))
    ) return { status: "invalid" as const };
    if (
      normalized.subject.length > parentMessageSubjectMaxLength ||
      normalized.body.length > parentMessageBodyMaxLength
    ) return { status: "too-long" as const };
    return { status: "valid" as const, value: normalized };
  }

  function normalizedReplyInput(input: ReplyParams) {
    const normalized = {
      ...input,
      parentId: input.parentId.trim(),
      threadId: input.threadId.trim(),
      idempotencyKey: input.idempotencyKey.trim(),
      body: input.body.trim()
    };
    if (
      !normalized.parentId ||
      !normalized.threadId ||
      !normalized.body ||
      !validIdempotencyKey(normalized.idempotencyKey)
    ) return { status: "invalid" as const };
    if (normalized.body.length > parentMessageBodyMaxLength) return { status: "too-long" as const };
    return { status: "valid" as const, value: normalized };
  }

  function createReplayFromDatabase(
    database: ParentMessagePersistenceDatabase,
    input: ReturnType<typeof normalizedCreateInput> & { status: "valid" }
  ): ParentMessageCreateReplayResult {
    const { value } = input;
    const parent = database.users.find((candidate) => candidate.id === value.parentId);
    if (!canUseParentArea(parent) || !parentCanAccessStudentInDatabase(database, value.parentId, value.studentId)) {
      return { status: "forbidden" };
    }
    const keyHash = idempotencyKeyHash("create", value.parentId, value.idempotencyKey);
    const existing = database.teacher_messages.find((candidate) => (
      candidate.guardian_id === value.parentId &&
      candidate.parent_idempotency_key_hash === keyHash
    ));
    if (!existing) return { status: "missing" };
    const requestHash = createRequestHash(value);
    if (existing.parent_idempotency_request_hash !== requestHash) return { status: "conflict" };
    return { status: "replayed", thread: buildParentMessageThread(database, existing) };
  }

  function currentReplyTarget(
    database: ParentMessagePersistenceDatabase,
    parentId: string,
    threadId: string
  ) {
    const parent = database.users.find((candidate) => candidate.id === parentId);
    if (!canUseParentArea(parent)) return { status: "forbidden" as const };
    const thread = database.teacher_messages.find((candidate) => (
      candidate.id === threadId && candidate.guardian_id === parentId
    ));
    if (
      !thread ||
      !thread.class_id ||
      !parentCanAccessStudentInDatabase(database, parentId, thread.student_id)
    ) return { status: "not-found" as const };
    const teacherClass = exactTeacherClassForStudent(database, thread.student_id, thread.class_id);
    if (!teacherClass || teacherClass.teacher_id !== thread.teacher_id) {
      return { status: "not-found" as const };
    }
    return { status: "found" as const, parent, teacherClass, thread };
  }

  function replyReplayFromDatabase(
    database: ParentMessagePersistenceDatabase,
    input: ReturnType<typeof normalizedReplyInput> & { status: "valid" }
  ): ParentMessageReplyReplayResult {
    const { value } = input;
    const target = currentReplyTarget(database, value.parentId, value.threadId);
    if (target.status !== "found") return target;
    const keyHash = idempotencyKeyHash("reply", value.parentId, value.idempotencyKey);
    const existing = database.teacher_message_entries.find((candidate) => (
      candidate.thread_id === value.threadId &&
      candidate.sender_id === value.parentId &&
      candidate.parent_idempotency_key_hash === keyHash
    ));
    if (!existing) return { status: "missing" };
    if (existing.parent_idempotency_request_hash !== replyRequestHash(value)) return { status: "conflict" };
    return {
      status: "replayed",
      entryId: existing.id,
      thread: buildParentMessageThread(database, target.thread)
    };
  }

  return {
    async getParentMessagesData(
      parentId: string,
      selectedStudentId?: string | null,
      selectedThreadId?: string | null
    ): Promise<ParentMessagesData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === parentId);
      if (!canUseParentArea(user)) return null;
      const rawChildren = getParentChildSummaries(database, user);
      const children = rawChildren.map(toParentChildSummarySafe);
      const allowedStudentIds = new Set(children.map((child) => child.student.id));
      const hasStudentFilter = selectedStudentId !== undefined && selectedStudentId !== null;
      const hasThreadFilter = selectedThreadId !== undefined && selectedThreadId !== null;
      if (hasStudentFilter && !allowedStudentIds.has(selectedStudentId)) return null;
      const selectedThreadRecord = hasThreadFilter
        ? database.teacher_messages.find((thread) => (
            thread.id === selectedThreadId &&
            thread.guardian_id === parentId &&
            allowedStudentIds.has(thread.student_id)
          )) ?? null
        : null;
      if (hasThreadFilter && !selectedThreadRecord) return null;
      if (selectedThreadRecord && hasStudentFilter && selectedThreadRecord.student_id !== selectedStudentId) return null;

      const selectedChild = hasStudentFilter
        ? children.find((child) => child.student.id === selectedStudentId) ?? null
        : null;
      const visibleStudentIds = hasStudentFilter ? new Set([selectedStudentId]) : allowedStudentIds;
      const threads = database.teacher_messages
        .filter((thread) => (
          thread.guardian_id === parentId &&
          allowedStudentIds.has(thread.student_id) &&
          visibleStudentIds.has(thread.student_id)
        ))
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
        .map((thread) => buildParentMessageThread(database, thread));
      const selectedThread = selectedThreadRecord
        ? buildParentMessageThread(database, selectedThreadRecord)
        : null;
      const composeTargets = Array.from(visibleStudentIds).flatMap((studentId) => (
        teacherClassesForStudent(database, studentId).map((teacherClass) => ({
          studentId,
          classId: teacherClass.id,
          className: teacherClass.name,
          teacherName: parentDisplayName(database, teacherClass.teacher_id, "Teacher")
        }))
      ));

      return {
        generatedAt: now().toISOString(),
        children,
        selectedChild,
        threads,
        selectedThread,
        categories: parentMessageCategories,
        reports: Array.from(visibleStudentIds)
          .flatMap((studentId) => getParentReportsForStudent(database, studentId))
          .map(toParentReportSafe),
        composeTargets
      };
    },

    async findParentMessageCreateReplay(input: CreateParams): Promise<ParentMessageCreateReplayResult> {
      const normalized = normalizedCreateInput(input);
      if (normalized.status !== "valid") return normalized;
      return createReplayFromDatabase(await readDatabase(), normalized);
    },

    async createParentMessageThread(input: CreateParams): Promise<ParentMessageCreateResult> {
      const normalized = normalizedCreateInput(input);
      if (normalized.status !== "valid") return normalized;
      const { value } = normalized;

      return runMutation((database): ParentMessageCreateResult => {
        const replay = createReplayFromDatabase(database, normalized);
        if (replay.status !== "missing") return replay;

        const parent = database.users.find((candidate) => candidate.id === value.parentId);
        if (!canUseParentArea(parent)) return { status: "forbidden" };
        const reportTarget = value.reportId
          ? exactReportTeacherClass(database, value.studentId, value.classId, value.reportId)
          : null;
        const teacherClass = value.reportId
          ? reportTarget?.teacherClass ?? null
          : exactTeacherClassForStudent(database, value.studentId, value.classId);
        if (!teacherClass || (value.reportId && !reportTarget)) return { status: "not-found" };

        const keyHash = idempotencyKeyHash("create", value.parentId, value.idempotencyKey);
        const requestHash = createRequestHash(value);
        const timestamp = now().toISOString();
        const thread: ParentMessageThreadRecord = {
          id: createThreadId(),
          class_id: teacherClass.id,
          student_id: value.studentId,
          teacher_id: teacherClass.teacher_id,
          guardian_id: parent.id,
          ...(reportTarget ? { report_id: reportTarget.report.id } : {}),
          parent_category: normalizeParentMessageCategory(value.category),
          subject_en: value.subject,
          subject_zh: value.subject,
          latest_message: value.body,
          status: "unread",
          priority: "normal",
          starred: false,
          last_message_at: timestamp,
          created_at: timestamp,
          parent_idempotency_key_hash: keyHash,
          parent_idempotency_request_hash: requestHash
        };
        const entryId = createEntryId();
        database.teacher_messages.unshift(thread);
        database.teacher_message_entries.push({
          id: entryId,
          thread_id: thread.id,
          sender_id: parent.id,
          sender_role: "parent",
          recipient_id: teacherClass.teacher_id,
          body: value.body,
          attachments: [],
          created_at: timestamp
        });
        return { status: "created", thread: buildParentMessageThread(database, thread) };
      });
    },

    async findParentMessageReplyReplay(input: ReplyParams): Promise<ParentMessageReplyReplayResult> {
      const normalized = normalizedReplyInput(input);
      if (normalized.status !== "valid") return normalized;
      return replyReplayFromDatabase(await readDatabase(), normalized);
    },

    async replyToParentMessageThread(input: ReplyParams): Promise<ParentMessageReplyResult> {
      const normalized = normalizedReplyInput(input);
      if (normalized.status !== "valid") return normalized;
      const { value } = normalized;

      return runMutation((database): ParentMessageReplyResult => {
        const replay = replyReplayFromDatabase(database, normalized);
        if (replay.status !== "missing") return replay;
        const target = currentReplyTarget(database, value.parentId, value.threadId);
        if (target.status !== "found") return target;

        const timestamp = now().toISOString();
        const entryId = createEntryId();
        database.teacher_message_entries.push({
          id: entryId,
          thread_id: target.thread.id,
          sender_id: target.parent.id,
          sender_role: "parent",
          recipient_id: target.thread.teacher_id,
          body: value.body,
          attachments: [],
          created_at: timestamp,
          parent_idempotency_key_hash: idempotencyKeyHash("reply", value.parentId, value.idempotencyKey),
          parent_idempotency_request_hash: replyRequestHash(value)
        });
        target.thread.latest_message = value.body;
        target.thread.status = "unread";
        target.thread.last_message_at = timestamp;
        return {
          status: "sent",
          entryId,
          thread: buildParentMessageThread(database, target.thread)
        };
      });
    }
  };
}
