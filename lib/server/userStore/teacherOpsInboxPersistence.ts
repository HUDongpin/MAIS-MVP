import type {
  CurriculumProfile,
  ParentMessageCategory,
  TeacherInboxData,
  TeacherInboxThread,
  TeacherMessage,
  TeacherMessageAttachment,
  TeacherMessageEntry,
  TeacherMessagePriority,
  TeacherMessageSenderRole,
  TeacherMessageStatus
} from "@/types";

type TeacherOpsInboxUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsInboxUserRecord = {
  id: string;
  role: TeacherOpsInboxUserRole;
  username?: string;
};

type TeacherOpsInboxClassRecord = {
  id: string;
  teacher_id: string;
};

type TeacherOpsInboxStudentProfileRecord = {
  user_id: string;
  name?: string;
};

type TeacherOpsInboxSchoolMembershipRecord = {
  user_id: string;
  role: TeacherOpsInboxUserRole;
  class_id?: string;
};

type TeacherOpsInboxMessageRecord = {
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

type TeacherOpsInboxMessageEntryRecord = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: TeacherMessageSenderRole;
  recipient_id: string;
  body: string;
  attachments: TeacherMessageAttachment[];
  created_at: string;
};

export type TeacherOpsInboxPersistenceDatabase = {
  school_memberships?: TeacherOpsInboxSchoolMembershipRecord[];
  student_profiles?: TeacherOpsInboxStudentProfileRecord[];
  teacher_classes: TeacherOpsInboxClassRecord[];
  teacher_message_entries: TeacherOpsInboxMessageEntryRecord[];
  teacher_messages: TeacherOpsInboxMessageRecord[];
  users: TeacherOpsInboxUserRecord[];
};

export type TeacherOpsInboxPersistenceStoreDependencies = {
  readDatabase: () => Promise<TeacherOpsInboxPersistenceDatabase>;
  mutateDatabase: <T>(mutator: (database: TeacherOpsInboxPersistenceDatabase) => T | Promise<T>) => Promise<T>;
  createId: () => string;
  now: () => Date;
  toInboxThread: (
    database: TeacherOpsInboxPersistenceDatabase,
    thread: TeacherOpsInboxMessageRecord
  ) => TeacherInboxThread;
};

type ReplyToTeacherMessageThreadParams = {
  teacherId: string;
  threadId: string;
  body: string;
};

type ReplyToTeacherMessageThreadResult =
  | { status: "sent"; thread: TeacherInboxThread }
  | { status: "forbidden" | "invalid" | "not-found" };

type UpdateTeacherMessageThreadParams = {
  teacherId: string;
  threadId: string;
  status?: TeacherMessageStatus;
  starred?: boolean;
};

type UpdateTeacherMessageThreadResult =
  | { status: "updated"; thread: TeacherInboxThread }
  | { status: "forbidden" | "not-found" };

export type TeacherOpsInboxPersistenceStore = ReturnType<typeof createTeacherOpsInboxPersistenceStore>;

export type TeacherOpsInboxMessageCollectionRecord = Omit<
  TeacherOpsInboxMessageRecord,
  "assignment_id" | "parent_category" | "starred"
> & {
  assignment_id?: string;
  parent_category?: unknown;
  starred?: boolean | null;
};

export type TeacherOpsInboxMessageEntryCollectionRecord = TeacherOpsInboxMessageEntryRecord;

export type TeacherOpsInboxCollectionRecords = {
  teacher_message_entries?: TeacherOpsInboxMessageEntryCollectionRecord[];
  teacher_messages?: TeacherOpsInboxMessageCollectionRecord[];
};

export type TeacherOpsInboxCollectionNormalizationOptions = {
  deletedAssignmentIds: ReadonlySet<string>;
  demoTeacherId: string;
  demoUserId: string;
  isValidParentMessageCategory: (value: unknown) => value is ParentMessageCategory;
  shouldSeedDemoUser: () => boolean;
};

function mergeTeacherOpsInboxSeedRecordsPreservingExisting<T>(
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

export function normalizeTeacherOpsMessageRecord<
  Record extends {
    starred?: boolean | null;
    assignment_id?: string;
    parent_category?: unknown;
  }
>(
  message: Record,
  dependencies: {
    deletedAssignmentIds: ReadonlySet<string>;
    isValidParentMessageCategory: (value: unknown) => value is ParentMessageCategory;
  }
): Record & {
  starred: boolean;
  assignment_id: string | undefined;
  parent_category: ParentMessageCategory | undefined;
} {
  return {
    ...message,
    starred: message.starred ?? false,
    assignment_id: message.assignment_id && !dependencies.deletedAssignmentIds.has(message.assignment_id) ? message.assignment_id : undefined,
    parent_category: dependencies.isValidParentMessageCategory(message.parent_category) ? message.parent_category : undefined
  };
}

export function normalizeTeacherOpsInboxCollections(
  collections: TeacherOpsInboxCollectionRecords,
  now: string,
  options: TeacherOpsInboxCollectionNormalizationOptions
): {
  teacher_message_entries: TeacherOpsInboxMessageEntryCollectionRecord[];
  teacher_messages: Array<TeacherOpsInboxMessageCollectionRecord & {
    assignment_id: string | undefined;
    parent_category: ParentMessageCategory | undefined;
    starred: boolean;
  }>;
} {
  return {
    teacher_messages: mergeTeacherOpsInboxSeedRecordsPreservingExisting<
      TeacherOpsInboxMessageCollectionRecord | TeacherOpsInboxMessageRecord
    >(
      collections.teacher_messages,
      teacherOpsSeedTeacherMessageRecords(now, options),
      (message) => message.id
    ).map((message) => normalizeTeacherOpsMessageRecord(message, {
      deletedAssignmentIds: options.deletedAssignmentIds,
      isValidParentMessageCategory: options.isValidParentMessageCategory
    })),
    teacher_message_entries: mergeTeacherOpsInboxSeedRecordsPreservingExisting<
      TeacherOpsInboxMessageEntryCollectionRecord | TeacherOpsInboxMessageEntryRecord
    >(
      collections.teacher_message_entries,
      teacherOpsSeedTeacherMessageEntryRecords(now, options),
      (entry) => entry.id
    )
  };
}

type TeacherOpsInboxCurriculumProfileDependencies = {
  curriculumProfileForClass: (
    database: TeacherOpsInboxPersistenceDatabase,
    teacherClass: TeacherOpsInboxClassRecord
  ) => CurriculumProfile;
  curriculumProfileForUser: (
    database: TeacherOpsInboxPersistenceDatabase,
    userId?: string | null
  ) => CurriculumProfile;
};

export function teacherOpsInboxCurriculumProfileForThread(
  database: TeacherOpsInboxPersistenceDatabase,
  thread: TeacherOpsInboxMessageRecord,
  dependencies: TeacherOpsInboxCurriculumProfileDependencies
): CurriculumProfile {
  const teacherClass = thread.class_id ? database.teacher_classes.find((candidate) => candidate.id === thread.class_id) : null;
  return teacherClass
    ? dependencies.curriculumProfileForClass(database, teacherClass)
    : dependencies.curriculumProfileForUser(database, thread.student_id);
}

export function teacherOpsSeedTeacherMessageRecords(
  now: string,
  {
    demoTeacherId,
    demoUserId,
    shouldSeedDemoUser
  }: {
    demoTeacherId: string;
    demoUserId: string;
    shouldSeedDemoUser: () => boolean;
  }
): TeacherOpsInboxMessageRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "message-thread-quadratic-help",
          class_id: "class-s3a-2026",
          student_id: demoUserId,
          teacher_id: demoTeacherId,
          assignment_id: "assignment-quadratics-checkpoint",
          topic_id: "quadratic-functions",
          subject_en: "Need help with vertex form",
          subject_zh: "想請教頂點式",
          latest_message: "I can expand the brackets, but I am not sure how to read the vertex from the graph.",
          status: "unread",
          priority: "normal",
          starred: false,
          last_message_at: now,
          created_at: now
        }
      ]
    : [];
}

export function teacherOpsSeedTeacherMessageEntryRecords(
  now: string,
  {
    demoTeacherId,
    demoUserId,
    shouldSeedDemoUser
  }: {
    demoTeacherId: string;
    demoUserId: string;
    shouldSeedDemoUser: () => boolean;
  }
): TeacherOpsInboxMessageEntryRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "message-entry-quadratic-help-student",
          thread_id: "message-thread-quadratic-help",
          sender_id: demoUserId,
          sender_role: "student",
          recipient_id: demoTeacherId,
          body: "I can expand the brackets, but I am not sure how to read the vertex from the graph.",
          attachments: [],
          created_at: now
        }
      ]
    : [];
}

function canUseTeacherArea(user?: TeacherOpsInboxUserRecord | null): user is TeacherOpsInboxUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherClassRecordsFor(database: TeacherOpsInboxPersistenceDatabase, user: TeacherOpsInboxUserRecord) {
  const membershipClassIds = new Set(
    (database.school_memberships ?? [])
      .filter((membership) => (
        membership.user_id === user.id &&
        membership.class_id &&
        (membership.role === "teacher" || membership.role === "admin")
      ))
      .map((membership) => membership.class_id as string)
  );

  return database.teacher_classes.filter((teacherClass) => (
    user.role === "admin" ||
    teacherClass.teacher_id === user.id ||
    membershipClassIds.has(teacherClass.id)
  ));
}

function teacherMessagesFor(
  database: TeacherOpsInboxPersistenceDatabase,
  user: TeacherOpsInboxUserRecord,
  classIds: Set<string>
) {
  return database.teacher_messages
    .filter((thread) => (
      user.role === "admin" ||
      thread.teacher_id === user.id ||
      (thread.class_id ? classIds.has(thread.class_id) : false)
    ))
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
}

export const teacherOpsInboxMessagesFor = teacherMessagesFor;

export function toTeacherOpsMessage(
  database: {
    student_profiles?: TeacherOpsInboxStudentProfileRecord[];
    users: Array<{ id: string; username?: string }>;
  },
  record: TeacherOpsInboxMessageRecord
): TeacherMessage {
  const profile = (database.student_profiles ?? []).find((candidate) => candidate.user_id === record.student_id);
  const guardianProfile = record.guardian_id
    ? (database.student_profiles ?? []).find((candidate) => candidate.user_id === record.guardian_id)
    : null;
  const guardianUser = record.guardian_id
    ? database.users.find((candidate) => candidate.id === record.guardian_id)
    : null;

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

export function toTeacherOpsMessageEntry(
  database: {
    student_profiles?: TeacherOpsInboxStudentProfileRecord[];
    users: Array<{ id: string; username?: string }>;
  },
  record: TeacherOpsInboxMessageEntryRecord
): TeacherMessageEntry {
  const senderProfile = (database.student_profiles ?? []).find((candidate) => candidate.user_id === record.sender_id);
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

export function createTeacherOpsInboxPersistenceStore({
  readDatabase,
  mutateDatabase,
  createId,
  now,
  toInboxThread
}: TeacherOpsInboxPersistenceStoreDependencies) {
  return {
    async getTeacherInboxData(userId: string, selectedThreadId?: string | null): Promise<TeacherInboxData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
      const threads = teacherMessagesFor(database, user, classIds).map((thread) => toInboxThread(database, thread));
      const selectedThread =
        threads.find((thread) => thread.id === selectedThreadId) ??
        threads.find((thread) => thread.status !== "resolved") ??
        threads[0] ??
        null;

      return { threads, selectedThread };
    },

    async replyToTeacherMessageThread({
      teacherId,
      threadId,
      body
    }: ReplyToTeacherMessageThreadParams): Promise<ReplyToTeacherMessageThreadResult> {
      const trimmedBody = body.trim();
      if (!trimmedBody) return { status: "invalid" };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
        const thread = teacherMessagesFor(database, user, classIds).find((candidate) => candidate.id === threadId);
        if (!thread) return { status: "not-found" as const };

        const nowIso = now().toISOString();
        database.teacher_message_entries.push({
          id: `message-entry-${createId()}`,
          thread_id: thread.id,
          sender_id: user.id,
          sender_role: "teacher",
          recipient_id: thread.guardian_id ?? thread.student_id,
          body: trimmedBody,
          attachments: [],
          created_at: nowIso
        });
        thread.latest_message = trimmedBody;
        thread.status = "open";
        thread.last_message_at = nowIso;

        return { status: "sent" as const, thread: toInboxThread(database, thread) };
      });
    },

    async updateTeacherMessageThread({
      teacherId,
      threadId,
      status,
      starred
    }: UpdateTeacherMessageThreadParams): Promise<UpdateTeacherMessageThreadResult> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
        const thread = teacherMessagesFor(database, user, classIds).find((candidate) => candidate.id === threadId);
        if (!thread) return { status: "not-found" as const };

        if (status) thread.status = status;
        if (typeof starred === "boolean") thread.starred = starred;

        return { status: "updated" as const, thread: toInboxThread(database, thread) };
      });
    }
  };
}
