import {
  addForumLivePulse,
  addForumReply,
  cleanForumAttachments,
  cleanForumMultilineText,
  cleanForumText,
  cloneForumThreads,
  createForumThread,
  defaultForumModerationState,
  filterForumThreads,
  forumBodyMaxLength,
  forumMentionNames,
  forumModerationVisible,
  forumReportNoteMaxLength,
  forumSubjectMaxLength,
  forumTagMaxLength,
  forumTextNeedsReview,
  forumTitleMaxLength,
  isForumAuditEvent,
  isForumNotification,
  isForumReport,
  isForumThread,
  pageForumThreads,
  searchForumThreads,
  summarizeForum,
  type ForumAuditAction,
  type ForumAuditEvent,
  type ForumClassSpace,
  type ForumFilter,
  type ForumModerationStatus,
  type ForumNotification,
  type ForumParticipantRole,
  type ForumReport,
  type ForumReportReason,
  type ForumThread,
  type ForumThreadKind,
  type ForumThreadMode,
  type ForumWorkspaceData
} from "@/lib/forum";
import type { GradeId } from "@/types";

type TeacherOpsForumUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsForumUserRecord = {
  id: string;
  username: string;
  role: TeacherOpsForumUserRole;
};

type TeacherOpsForumStudentProfileRecord = {
  user_id: string;
  name: string;
};

type TeacherOpsForumClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsForumEnrollmentRecord = {
  id?: string;
  class_id: string;
  student_id: string;
};

type TeacherOpsForumClassCollaboratorRecord = {
  id: string;
  class_id: string;
  teacher_id: string;
  role: "co-teacher" | "viewer";
  status: "active" | "revoked" | "invited" | "inactive";
};

type TeacherOpsForumSchoolMembershipRecord = {
  user_id: string;
  role: string;
  class_id?: string;
};

type TeacherOpsForumThreadRecord = ForumThread;
type TeacherOpsForumReportRecord = ForumReport;
type TeacherOpsForumAuditEventRecord = ForumAuditEvent;
type TeacherOpsForumNotificationRecord = ForumNotification;

export type TeacherOpsForumPersistenceDatabase = {
  class_enrollments: TeacherOpsForumEnrollmentRecord[];
  forum_audit_events: TeacherOpsForumAuditEventRecord[];
  forum_notifications: TeacherOpsForumNotificationRecord[];
  forum_reports: TeacherOpsForumReportRecord[];
  forum_threads: TeacherOpsForumThreadRecord[];
  school_memberships?: TeacherOpsForumSchoolMembershipRecord[];
  student_profiles?: TeacherOpsForumStudentProfileRecord[];
  teacher_class_collaborators: TeacherOpsForumClassCollaboratorRecord[];
  teacher_classes: TeacherOpsForumClassRecord[];
  users: TeacherOpsForumUserRecord[];
};

export type TeacherOpsForumPersistenceStoreDependencies = {
  createId: (prefix: string) => string;
  displayNameForUser: (database: TeacherOpsForumPersistenceDatabase, userId: string) => string;
  mutateDatabase: <T>(mutator: (database: TeacherOpsForumPersistenceDatabase) => T) => Promise<T>;
  now: () => Date;
  readDatabase: () => Promise<TeacherOpsForumPersistenceDatabase>;
};

export type TeacherOpsForumPersistenceStore = ReturnType<typeof createTeacherOpsForumPersistenceStore>;

type TeacherOpsSeedForumThreadRecordsOptions = {
  shouldSeedDemoUser: () => boolean;
  seedThreads: ForumThread[];
};

export type TeacherOpsForumCollectionRecords = {
  forum_threads?: unknown[];
  forum_reports?: unknown[];
  forum_audit_events?: unknown[];
  forum_notifications?: unknown[];
};

export type TeacherOpsForumNormalizedCollections = {
  forum_threads: TeacherOpsForumThreadRecord[];
  forum_reports: TeacherOpsForumReportRecord[];
  forum_audit_events: TeacherOpsForumAuditEventRecord[];
  forum_notifications: TeacherOpsForumNotificationRecord[];
};

function mergeTeacherOpsForumSeedRecordsPreservingExisting<T>(
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

function forumThreadKey(record: unknown) {
  const thread = record as { threadId?: unknown } | null;
  return typeof thread?.threadId === "string" ? thread.threadId : "";
}

export function teacherOpsSeedForumThreadRecords(
  now: string,
  options: TeacherOpsSeedForumThreadRecordsOptions
): TeacherOpsForumThreadRecord[] {
  if (!options.shouldSeedDemoUser()) return [];
  return cloneForumThreads(options.seedThreads).map((thread) => ({
    ...thread,
    moderation: thread.moderation ?? defaultForumModerationState("visible", thread.updatedAt || now),
    replies: thread.replies.map((reply) => ({
      ...reply,
      moderation: reply.moderation ?? defaultForumModerationState("visible", reply.createdAt || now)
    })),
    live: thread.live
      ? {
          ...thread.live,
          pulses: thread.live.pulses.map((pulse) => ({
            ...pulse,
            moderation: pulse.moderation ?? defaultForumModerationState("visible", pulse.createdAt || now)
          }))
        }
      : undefined
  }));
}

export function normalizeTeacherOpsForumThreadRecord(record: unknown, now: string): TeacherOpsForumThreadRecord | null {
  if (!isForumThread(record)) return null;
  const [thread] = cloneForumThreads([record]);
  const meTooUserIds = Array.from(new Set((thread.meTooUserIds ?? []).filter((userId) => typeof userId === "string" && userId.trim()).map((userId) => userId.trim())));
  return {
    ...thread,
    meTooUserIds,
    meTooCount: Math.max(Math.round(Number(thread.meTooCount) || 0), meTooUserIds.length),
    attachments: cleanForumAttachments(thread.attachments, now),
    moderation: thread.moderation ?? defaultForumModerationState("visible", thread.updatedAt || now),
    replies: thread.replies.map((reply) => ({
      ...reply,
      attachments: cleanForumAttachments(reply.attachments, now),
      moderation: reply.moderation ?? defaultForumModerationState("visible", reply.createdAt || now)
    })),
    live: thread.live
      ? {
          ...thread.live,
          pulses: thread.live.pulses.map((pulse) => ({
            ...pulse,
            attachments: cleanForumAttachments(pulse.attachments, now),
            moderation: pulse.moderation ?? defaultForumModerationState("visible", pulse.createdAt || now)
          }))
        }
      : undefined
  };
}

export function normalizeTeacherOpsForumCollections(
  collections: TeacherOpsForumCollectionRecords,
  now: string,
  options: TeacherOpsSeedForumThreadRecordsOptions
): TeacherOpsForumNormalizedCollections {
  return {
    forum_threads: mergeTeacherOpsForumSeedRecordsPreservingExisting<unknown>(
      collections.forum_threads,
      teacherOpsSeedForumThreadRecords(now, options),
      forumThreadKey
    )
      .map((thread) => normalizeTeacherOpsForumThreadRecord(thread, now))
      .filter((thread): thread is TeacherOpsForumThreadRecord => Boolean(thread)),
    forum_reports: (collections.forum_reports ?? [])
      .filter(isForumReport)
      .map((report) => ({
        ...report,
        note: report.note.slice(0, forumReportNoteMaxLength)
      })),
    forum_audit_events: (collections.forum_audit_events ?? [])
      .filter(isForumAuditEvent)
      .slice(0, 500),
    forum_notifications: (collections.forum_notifications ?? [])
      .filter(isForumNotification)
      .slice(0, 500)
  };
}

function localizedForumText(value: string) {
  return { en: value, zh: value, zhHans: value };
}

function forumActorRole(user: TeacherOpsForumUserRecord): ForumParticipantRole | "admin" {
  if (user.role === "admin") return "admin";
  return user.role === "teacher" ? "teacher" : "student";
}

function forumAccentForName(name: string): ForumThread["author"]["accent"] {
  const accents: ForumThread["author"]["accent"][] = ["cyan", "indigo", "emerald", "amber", "rose"];
  const seed = Array.from(name || "MAIS").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return accents[seed % accents.length];
}

function sortClassRecords(records: TeacherOpsForumClassRecord[]) {
  return [...records].sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));
}

function teacherCanAccessClass(
  database: TeacherOpsForumPersistenceDatabase,
  user: TeacherOpsForumUserRecord,
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
  database: TeacherOpsForumPersistenceDatabase,
  user: TeacherOpsForumUserRecord
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

  return sortClassRecords(database.teacher_classes.filter((teacherClass) => (
    user.role === "admin" ||
    teacherClass.teacher_id === user.id ||
    membershipClassIds.has(teacherClass.id)
  )));
}

function teacherOperationClassRecordsFor(
  database: TeacherOpsForumPersistenceDatabase,
  user: TeacherOpsForumUserRecord
) {
  const records = new Map(teacherClassRecordsFor(database, user).map((teacherClass) => [teacherClass.id, teacherClass]));
  database.teacher_class_collaborators
    .filter((collaborator) => collaborator.teacher_id === user.id && collaborator.status === "active")
    .forEach((collaborator) => {
      const teacherClass = database.teacher_classes.find((candidate) => candidate.id === collaborator.class_id);
      if (teacherClass) records.set(teacherClass.id, teacherClass);
    });

  return sortClassRecords(Array.from(records.values()));
}

function teacherCanReadOperationsClass(
  database: TeacherOpsForumPersistenceDatabase,
  user: TeacherOpsForumUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (teacherCanAccessClass(database, user, classId)) return teacherClass;
  const collaborator = database.teacher_class_collaborators.find(
    (candidate) => candidate.class_id === classId && candidate.teacher_id === user.id && candidate.status === "active"
  );
  return collaborator ? teacherClass : null;
}

function teacherCanMutateOperationsClass(
  database: TeacherOpsForumPersistenceDatabase,
  user: TeacherOpsForumUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (teacherCanAccessClass(database, user, classId)) return teacherClass;
  const collaborator = database.teacher_class_collaborators.find(
    (candidate) =>
      candidate.class_id === classId &&
      candidate.teacher_id === user.id &&
      candidate.status === "active" &&
      candidate.role === "co-teacher"
  );
  return collaborator ? teacherClass : null;
}

function studentClassIds(database: TeacherOpsForumPersistenceDatabase, userId: string) {
  return new Set(
    database.class_enrollments
      .filter((enrollment) => enrollment.student_id === userId)
      .map((enrollment) => enrollment.class_id)
  );
}

function normalizeForumMentionName(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function updateForumModeration(
  moderation: ForumThread["moderation"],
  status: ForumModerationStatus,
  actor: TeacherOpsForumUserRecord,
  reason: string,
  now: string
) {
  return {
    ...(moderation ?? defaultForumModerationState("visible", now)),
    status,
    reason: reason.slice(0, 240),
    reviewedBy: actor.id,
    reviewedAt: now,
    updatedAt: now
  };
}

function touchForumThread(thread: TeacherOpsForumThreadRecord, now: string) {
  thread.updatedAt = now;
  return thread;
}

function forumTargetModeration(thread: TeacherOpsForumThreadRecord, targetType: "thread" | "reply" | "pulse", targetId: string) {
  if (targetType === "thread" && targetId === thread.threadId) {
    return {
      current: thread.moderation,
      authorId: thread.author.id,
      update: (moderation: ForumThread["moderation"]) => {
        thread.moderation = moderation;
      }
    };
  }

  if (targetType === "reply") {
    const reply = thread.replies.find((candidate) => candidate.replyId === targetId);
    if (!reply) return null;
    return {
      current: reply.moderation,
      authorId: reply.author.id,
      update: (moderation: ForumThread["moderation"]) => {
        reply.moderation = moderation;
      }
    };
  }

  const pulse = thread.live?.pulses.find((candidate) => candidate.pulseId === targetId);
  if (!pulse) return null;
  return {
    current: pulse.moderation,
    authorId: pulse.author.id,
    update: (moderation: ForumThread["moderation"]) => {
      pulse.moderation = moderation;
    }
  };
}

function forumThreadAuthorCanMutate(user: TeacherOpsForumUserRecord, thread: TeacherOpsForumThreadRecord) {
  return thread.author.id === user.id;
}

export function createTeacherOpsForumPersistenceStore({
  createId,
  displayNameForUser,
  mutateDatabase,
  now,
  readDatabase
}: TeacherOpsForumPersistenceStoreDependencies) {
  function forumDisplayNameForUser(database: TeacherOpsForumPersistenceDatabase, userId: string) {
    return displayNameForUser(database, userId);
  }

  function forumAuthorForUser(database: TeacherOpsForumPersistenceDatabase, user: TeacherOpsForumUserRecord) {
    const name = forumDisplayNameForUser(database, user.id);
    return {
      id: user.id,
      name,
      role: user.role === "teacher" || user.role === "admin" ? "teacher" as const : "student" as const,
      accent: forumAccentForName(name)
    };
  }

  function forumClassSpaceForRecord(database: TeacherOpsForumPersistenceDatabase, record: TeacherOpsForumClassRecord): ForumClassSpace {
    return {
      classId: record.id,
      name: localizedForumText(record.name),
      grade: record.grade,
      teacherName: forumDisplayNameForUser(database, record.teacher_id) || "Teacher",
      memberCount: database.class_enrollments.filter((enrollment) => enrollment.class_id === record.id).length
    };
  }

  function forumClassRecordsForUser(database: TeacherOpsForumPersistenceDatabase, user: TeacherOpsForumUserRecord) {
    if (user.role === "admin") return database.teacher_classes;
    if (user.role === "teacher") return teacherOperationClassRecordsFor(database, user);
    if (user.role !== "student") return [];

    const enrolledClassIds = studentClassIds(database, user.id);
    return sortClassRecords(database.teacher_classes.filter((teacherClass) => enrolledClassIds.has(teacherClass.id)));
  }

  function forumClassAccessForUser(database: TeacherOpsForumPersistenceDatabase, user: TeacherOpsForumUserRecord, classId: string) {
    const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
    if (!teacherClass) return null;

    if (user.role === "admin") {
      return { classRecord: teacherClass, canPost: true, canModerate: true, canSeeAudit: true };
    }

    if (user.role === "teacher") {
      const canRead = teacherCanReadOperationsClass(database, user, classId);
      const canMutate = teacherCanMutateOperationsClass(database, user, classId);
      if (!canRead) return null;
      return {
        classRecord: teacherClass,
        canPost: Boolean(canMutate),
        canModerate: Boolean(canMutate),
        canSeeAudit: Boolean(canMutate)
      };
    }

    const enrolled = user.role === "student" && database.class_enrollments.some(
      (enrollment) => enrollment.class_id === classId && enrollment.student_id === user.id
    );
    return enrolled
      ? { classRecord: teacherClass, canPost: true, canModerate: false, canSeeAudit: false }
      : null;
  }

  function forumThreadForUser(database: TeacherOpsForumPersistenceDatabase, user: TeacherOpsForumUserRecord, threadId: string) {
    const thread = database.forum_threads.find((candidate) => candidate.threadId === threadId);
    if (!thread) return null;
    const access = forumClassAccessForUser(database, user, thread.classId);
    if (!access) return null;
    if (!access.canModerate && !forumModerationVisible(thread.moderation)) return null;
    return { thread, access };
  }

  function forumAuditEvent({
    action,
    actor,
    classId,
    threadId,
    targetType,
    targetId,
    details
  }: {
    action: ForumAuditAction;
    actor: TeacherOpsForumUserRecord;
    classId: string;
    threadId?: string;
    targetType?: ForumAuditEvent["targetType"];
    targetId?: string;
    details?: ForumAuditEvent["details"];
  }): TeacherOpsForumAuditEventRecord {
    return {
      auditId: createId("forum-audit"),
      classId,
      threadId,
      action,
      actorId: actor.id,
      actorName: actor.username,
      actorRole: forumActorRole(actor),
      targetType,
      targetId,
      createdAt: now().toISOString(),
      details
    };
  }

  function pushForumAudit(database: TeacherOpsForumPersistenceDatabase, event: TeacherOpsForumAuditEventRecord) {
    database.forum_audit_events.unshift(event);
    database.forum_audit_events = database.forum_audit_events.slice(0, 500);
  }

  function forumClassParticipantUsers(database: TeacherOpsForumPersistenceDatabase, classId: string) {
    const participantIds = new Set<string>();
    const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
    if (teacherClass) participantIds.add(teacherClass.teacher_id);
    database.class_enrollments
      .filter((enrollment) => enrollment.class_id === classId)
      .forEach((enrollment) => participantIds.add(enrollment.student_id));
    database.teacher_class_collaborators
      .filter((collaborator) => collaborator.class_id === classId && collaborator.status === "active")
      .forEach((collaborator) => participantIds.add(collaborator.teacher_id));
    (database.school_memberships ?? [])
      .filter((membership) => membership.class_id === classId && (membership.role === "teacher" || membership.role === "admin"))
      .forEach((membership) => participantIds.add(membership.user_id));

    return database.users.filter((user) => participantIds.has(user.id) && user.role !== "parent");
  }

  function forumClassModeratorUserIds(database: TeacherOpsForumPersistenceDatabase, classId: string) {
    return forumClassParticipantUsers(database, classId)
      .filter((user) => user.role === "teacher" || user.role === "admin")
      .map((user) => user.id);
  }

  function forumMentionedUserIds(database: TeacherOpsForumPersistenceDatabase, classId: string, ...values: string[]) {
    const mentionNames = new Set(forumMentionNames(...values).map(normalizeForumMentionName));
    if (!mentionNames.size) return [];

    return forumClassParticipantUsers(database, classId)
      .filter((user) => {
        const profileName = database.student_profiles?.find((profile) => profile.user_id === user.id)?.name;
        return [user.username, profileName].some((candidate) => candidate && mentionNames.has(normalizeForumMentionName(candidate)));
      })
      .map((user) => user.id);
  }

  function pushForumNotifications(database: TeacherOpsForumPersistenceDatabase, input: {
    classId: string;
    threadId: string;
    actor: TeacherOpsForumUserRecord;
    recipientIds: string[];
    type: ForumNotification["type"];
    title: string;
    body: string;
    targetType: ForumNotification["targetType"];
    targetId: string;
  }) {
    const timestamp = now().toISOString();
    const recipientIds = Array.from(new Set(input.recipientIds))
      .filter((recipientId) => recipientId && recipientId !== input.actor.id);

    for (const recipientId of recipientIds) {
      database.forum_notifications.unshift({
        notificationId: createId("forum-notification"),
        classId: input.classId,
        threadId: input.threadId,
        recipientId,
        actorId: input.actor.id,
        actorName: forumDisplayNameForUser(database, input.actor.id),
        type: input.type,
        title: localizedForumText(input.title),
        body: localizedForumText(input.body),
        targetType: input.targetType,
        targetId: input.targetId,
        createdAt: timestamp
      });
    }

    database.forum_notifications = database.forum_notifications.slice(0, 500);
  }

  function forumNotificationsForUser(database: TeacherOpsForumPersistenceDatabase, userId: string, classId: string) {
    return database.forum_notifications
      .filter((notification) => notification.recipientId === userId && notification.classId === classId)
      .slice(0, 20);
  }

  async function getForumWorkspaceData({
    userId,
    classId,
    filter = "all",
    query = "",
    page = 1,
    pageSize
  }: {
    userId: string;
    classId?: string | null;
    filter?: ForumFilter;
    query?: string | null;
    page?: number;
    pageSize?: number;
  }): Promise<ForumWorkspaceData | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!user || user.role === "parent") return null;

    const classRecords = forumClassRecordsForUser(database, user);
    const requestedClassId = classId?.trim();
    const activeClass = requestedClassId
      ? classRecords.find((record) => record.id === requestedClassId) ?? null
      : classRecords[0] ?? null;
    if (!activeClass) {
      if (requestedClassId) return null;
      return {
        classes: [],
        activeClassId: null,
        threads: [],
        pageInfo: { page: 1, pageSize: 8, totalThreads: 0, totalPages: 1, query: "" },
        summary: summarizeForum([], ""),
        permissions: { canPost: false, canModerate: false, canSeeAudit: false }
      };
    }

    const access = forumClassAccessForUser(database, user, activeClass.id);
    if (!access) return null;
    const filteredThreads = filterForumThreads(database.forum_threads, filter, activeClass.id)
      .filter((thread) => access.canModerate || forumModerationVisible(thread.moderation));
    const searchResult = searchForumThreads(filteredThreads, query);
    const paged = pageForumThreads(searchResult.threads, page, pageSize, searchResult.query);

    return {
      classes: classRecords.map((record) => forumClassSpaceForRecord(database, record)),
      activeClassId: activeClass.id,
      threads: cloneForumThreads(paged.threads),
      pageInfo: paged.pageInfo,
      summary: summarizeForum(database.forum_threads, activeClass.id),
      permissions: {
        canPost: access.canPost,
        canModerate: access.canModerate,
        canSeeAudit: access.canSeeAudit
      },
      reports: access.canModerate ? database.forum_reports.filter((report) => report.classId === activeClass.id).slice(0, 50) : undefined,
      auditEvents: access.canSeeAudit ? database.forum_audit_events.filter((event) => event.classId === activeClass.id).slice(0, 50) : undefined,
      notifications: forumNotificationsForUser(database, user.id, activeClass.id)
    };
  }

  async function createClassForumThread({
    userId,
    classId,
    title,
    body,
    subject,
    tags,
    attachments,
    mode,
    kind
  }: {
    userId: string;
    classId: string;
    title: unknown;
    body: unknown;
    subject: unknown;
    tags: unknown;
    attachments?: unknown;
    mode: ForumThreadMode;
    kind: ForumThreadKind;
  }) {
    const cleanTitle = cleanForumText(title, forumTitleMaxLength);
    const cleanBody = cleanForumMultilineText(body, forumBodyMaxLength);
    const cleanSubject = cleanForumText(subject, forumSubjectMaxLength);
    const cleanTags = Array.isArray(tags)
      ? tags.map((tag) => cleanForumText(tag, forumTagMaxLength)).filter(Boolean).slice(0, 4)
      : typeof tags === "string"
        ? tags.split(",").map((tag) => cleanForumText(tag, forumTagMaxLength)).filter(Boolean).slice(0, 4)
        : [];
    if (!cleanTitle || !cleanBody) return { status: "invalid" as const };

    return mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user || user.role === "parent") return { status: "forbidden" as const };
      const access = forumClassAccessForUser(database, user, classId);
      if (!access || !access.canPost) return { status: "not-found" as const };
      const author = forumAuthorForUser(database, user);
      if (author.role !== "teacher" && (mode === "live" || kind === "teacher-note")) return { status: "forbidden" as const };

      const thread = createForumThread({
        classId,
        title: cleanTitle,
        body: cleanBody,
        subject: cleanSubject,
        tags: cleanTags,
        attachments,
        mode,
        kind,
        author
      });
      database.forum_threads.unshift(thread);
      pushForumAudit(database, forumAuditEvent({
        action: "thread-created",
        actor: user,
        classId,
        threadId: thread.threadId,
        targetType: "thread",
        targetId: thread.threadId,
        details: {
          mode,
          kind,
          needsReview: forumTextNeedsReview(cleanTitle, cleanBody, cleanSubject, cleanTags.join(" "))
        }
      }));
      const mentionedUserIds = forumMentionedUserIds(database, classId, cleanTitle, cleanBody);
      const recipientIds = Array.from(new Set([
        ...forumClassModeratorUserIds(database, classId),
        ...mentionedUserIds
      ]));
      pushForumNotifications(database, {
        classId,
        threadId: thread.threadId,
        actor: user,
        recipientIds,
        type: mentionedUserIds.length ? "mention" : "thread",
        title: mentionedUserIds.length ? "You were mentioned in a class discussion" : "New class discussion",
        body: cleanTitle,
        targetType: "thread",
        targetId: thread.threadId
      });

      return { status: "created" as const, thread };
    });
  }

  async function addClassForumReply({
    userId,
    threadId,
    body,
    attachments
  }: {
    userId: string;
    threadId: string;
    body: unknown;
    attachments?: unknown;
  }) {
    const cleanBody = cleanForumMultilineText(body, forumBodyMaxLength);
    if (!cleanBody) return { status: "invalid" as const };

    return mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user || user.role === "parent") return { status: "forbidden" as const };
      const found = forumThreadForUser(database, user, threadId);
      if (!found) return { status: "not-found" as const };
      if (found.thread.locked || found.thread.moderation?.status === "deleted") return { status: "locked" as const };
      const author = forumAuthorForUser(database, user);
      const nextThread = addForumReply(found.thread, { body: cleanBody, attachments, author });
      Object.assign(found.thread, nextThread);
      const reply = found.thread.replies.at(-1);
      pushForumAudit(database, forumAuditEvent({
        action: "reply-created",
        actor: user,
        classId: found.thread.classId,
        threadId,
        targetType: "reply",
        targetId: reply?.replyId,
        details: { needsReview: forumTextNeedsReview(cleanBody) }
      }));
      const mentionedUserIds = forumMentionedUserIds(database, found.thread.classId, cleanBody);
      pushForumNotifications(database, {
        classId: found.thread.classId,
        threadId,
        actor: user,
        recipientIds: Array.from(new Set([
          found.thread.author.id,
          ...mentionedUserIds,
          ...(forumTextNeedsReview(cleanBody) ? forumClassModeratorUserIds(database, found.thread.classId) : [])
        ])),
        type: mentionedUserIds.length ? "mention" : "reply",
        title: mentionedUserIds.length ? "You were mentioned in a reply" : "New forum reply",
        body: cleanBody.slice(0, 160),
        targetType: "reply",
        targetId: reply?.replyId ?? threadId
      });
      return { status: "created" as const, thread: found.thread, reply };
    });
  }

  async function addClassForumLivePulse({
    userId,
    threadId,
    body,
    attachments
  }: {
    userId: string;
    threadId: string;
    body: unknown;
    attachments?: unknown;
  }) {
    const cleanBody = cleanForumMultilineText(body, 600);
    if (!cleanBody) return { status: "invalid" as const };

    return mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user || user.role === "parent") return { status: "forbidden" as const };
      const found = forumThreadForUser(database, user, threadId);
      if (!found) return { status: "not-found" as const };
      if (!found.thread.live || !found.thread.live.active || found.thread.locked) return { status: "locked" as const };
      const author = forumAuthorForUser(database, user);
      const nextThread = addForumLivePulse(found.thread, { body: cleanBody, attachments, author });
      Object.assign(found.thread, nextThread);
      const pulse = found.thread.live?.pulses.at(-1);
      pushForumAudit(database, forumAuditEvent({
        action: "live-pulse-created",
        actor: user,
        classId: found.thread.classId,
        threadId,
        targetType: "pulse",
        targetId: pulse?.pulseId,
        details: { needsReview: forumTextNeedsReview(cleanBody) }
      }));
      const mentionedUserIds = forumMentionedUserIds(database, found.thread.classId, cleanBody);
      pushForumNotifications(database, {
        classId: found.thread.classId,
        threadId,
        actor: user,
        recipientIds: Array.from(new Set([
          found.thread.author.id,
          ...mentionedUserIds,
          ...(forumTextNeedsReview(cleanBody) ? forumClassModeratorUserIds(database, found.thread.classId) : [])
        ])),
        type: mentionedUserIds.length ? "mention" : "reply",
        title: mentionedUserIds.length ? "You were mentioned in a live response" : "New live response",
        body: cleanBody.slice(0, 160),
        targetType: "pulse",
        targetId: pulse?.pulseId ?? threadId
      });
      return { status: "created" as const, thread: found.thread, pulse };
    });
  }

  async function updateClassForumThread({
    userId,
    threadId,
    action,
    value,
    title,
    body,
    reason,
    targetType,
    targetId,
    moderationStatus
  }: {
    userId: string;
    threadId: string;
    action: "me-too" | "resolve" | "pin" | "lock" | "hide" | "delete" | "edit" | "moderate";
    value?: boolean;
    title?: unknown;
    body?: unknown;
    reason?: unknown;
    targetType?: "thread" | "reply" | "pulse";
    targetId?: unknown;
    moderationStatus?: ForumModerationStatus;
  }) {
    return mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user || user.role === "parent") return { status: "forbidden" as const };
      const found = forumThreadForUser(database, user, threadId);
      if (!found) return { status: "not-found" as const };
      const { thread, access } = found;
      const timestamp = now().toISOString();

      if (action === "me-too") {
        if (thread.locked) return { status: "locked" as const };
        const meTooUserIds = Array.from(new Set((thread.meTooUserIds ?? []).filter(Boolean)));
        const alreadyCounted = meTooUserIds.includes(user.id);
        if (!alreadyCounted) {
          meTooUserIds.push(user.id);
          thread.meTooCount = Math.max(thread.meTooCount + 1, meTooUserIds.length);
          thread.meTooUserIds = meTooUserIds;
        }
        touchForumThread(thread, timestamp);
        pushForumAudit(database, forumAuditEvent({ action: "me-too-added", actor: user, classId: thread.classId, threadId, targetType: "thread", targetId: threadId, details: { duplicate: alreadyCounted } }));
        return { status: "updated" as const, thread };
      }

      if (action === "resolve") {
        if (!access.canModerate && !forumThreadAuthorCanMutate(user, thread)) return { status: "forbidden" as const };
        thread.resolved = typeof value === "boolean" ? value : !thread.resolved;
        touchForumThread(thread, timestamp);
        pushForumAudit(database, forumAuditEvent({ action: "resolved-updated", actor: user, classId: thread.classId, threadId, targetType: "thread", targetId: threadId, details: { resolved: thread.resolved } }));
        return { status: "updated" as const, thread };
      }

      if (action === "edit") {
        if (thread.locked || (!access.canModerate && !forumThreadAuthorCanMutate(user, thread))) return { status: "forbidden" as const };
        const cleanTitle = cleanForumText(title, forumTitleMaxLength);
        const cleanBody = cleanForumMultilineText(body, forumBodyMaxLength);
        if (!cleanTitle || !cleanBody) return { status: "invalid" as const };
        thread.title = localizedForumText(cleanTitle);
        thread.body = localizedForumText(cleanBody);
        thread.moderation = {
          ...(thread.moderation ?? defaultForumModerationState("visible", timestamp)),
          status: forumTextNeedsReview(cleanTitle, cleanBody) ? "needs-review" : thread.moderation?.status === "hidden" ? "hidden" : "visible",
          updatedAt: timestamp
        };
        touchForumThread(thread, timestamp);
        pushForumAudit(database, forumAuditEvent({ action: "thread-edited", actor: user, classId: thread.classId, threadId, targetType: "thread", targetId: threadId }));
        return { status: "updated" as const, thread };
      }

      if (action === "moderate") {
        if (!access.canModerate) return { status: "forbidden" as const };
        const cleanTargetType = targetType === "reply" || targetType === "pulse" ? targetType : "thread";
        const cleanTargetId = typeof targetId === "string" && targetId.trim() ? targetId.trim() : thread.threadId;
        const nextStatus: ForumModerationStatus = moderationStatus === "visible" || moderationStatus === "needs-review" || moderationStatus === "hidden" || moderationStatus === "deleted"
          ? moderationStatus
          : "visible";
        const target = forumTargetModeration(thread, cleanTargetType, cleanTargetId);
        if (!target) return { status: "not-found" as const };

        target.update(updateForumModeration(target.current, nextStatus, user, cleanForumText(reason, 240) || "teacher moderation", timestamp));
        if (cleanTargetType === "thread" && (nextStatus === "hidden" || nextStatus === "deleted")) {
          thread.locked = true;
          if (thread.live) thread.live.active = false;
        }
        touchForumThread(thread, timestamp);
        pushForumAudit(database, forumAuditEvent({
          action: nextStatus === "deleted" && cleanTargetType === "thread" ? "thread-deleted" : "moderation-updated",
          actor: user,
          classId: thread.classId,
          threadId,
          targetType: cleanTargetType,
          targetId: cleanTargetId,
          details: { status: nextStatus }
        }));
        pushForumNotifications(database, {
          classId: thread.classId,
          threadId,
          actor: user,
          recipientIds: [target.authorId],
          type: "moderation",
          title: "Forum moderation update",
          body: `A teacher set this item to ${nextStatus}.`,
          targetType: cleanTargetType,
          targetId: cleanTargetId
        });
        return { status: "updated" as const, thread };
      }

      if (action === "pin" || action === "lock" || action === "hide" || action === "delete") {
        if (!access.canModerate && action !== "delete") return { status: "forbidden" as const };
        if (action === "delete" && !access.canModerate && !forumThreadAuthorCanMutate(user, thread)) return { status: "forbidden" as const };
        if (action === "pin") {
          thread.pinned = typeof value === "boolean" ? value : !thread.pinned;
          pushForumAudit(database, forumAuditEvent({ action: "pinned-updated", actor: user, classId: thread.classId, threadId, targetType: "thread", targetId: threadId, details: { pinned: thread.pinned } }));
        }
        if (action === "lock") {
          thread.locked = typeof value === "boolean" ? value : !thread.locked;
          if (thread.live) thread.live.active = !thread.locked;
          pushForumAudit(database, forumAuditEvent({ action: "locked-updated", actor: user, classId: thread.classId, threadId, targetType: "thread", targetId: threadId, details: { locked: thread.locked } }));
        }
        if (action === "hide" || action === "delete") {
          const nextStatus: ForumModerationStatus = action === "delete" ? "deleted" : "hidden";
          thread.moderation = updateForumModeration(thread.moderation, nextStatus, user, cleanForumText(reason, 240) || action, timestamp);
          thread.locked = true;
          if (thread.live) thread.live.active = false;
          pushForumAudit(database, forumAuditEvent({
            action: action === "delete" ? "thread-deleted" : "moderation-updated",
            actor: user,
            classId: thread.classId,
            threadId,
            targetType: "thread",
            targetId: threadId,
            details: { status: nextStatus }
          }));
        }
        touchForumThread(thread, timestamp);
        return { status: "updated" as const, thread };
      }

      return { status: "invalid" as const };
    });
  }

  async function reportClassForumContent({
    userId,
    threadId,
    targetType,
    targetId,
    reason,
    note
  }: {
    userId: string;
    threadId: string;
    targetType: "thread" | "reply" | "pulse";
    targetId: string;
    reason: ForumReportReason;
    note?: unknown;
  }) {
    const cleanNote = cleanForumMultilineText(note, forumReportNoteMaxLength);
    const cleanReason: ForumReportReason = ["unsafe-content", "harassment", "off-topic", "privacy", "other"].includes(reason) ? reason : "other";

    return mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user || user.role === "parent") return { status: "forbidden" as const };
      const found = forumThreadForUser(database, user, threadId);
      if (!found) return { status: "not-found" as const };
      const target = forumTargetModeration(found.thread, targetType, targetId || threadId);
      if (!target) return { status: "not-found" as const };

      const timestamp = now().toISOString();
      const report: TeacherOpsForumReportRecord = {
        reportId: createId("forum-report"),
        classId: found.thread.classId,
        threadId,
        targetType,
        targetId: targetId || threadId,
        reason: cleanReason,
        note: cleanNote,
        reporterId: user.id,
        reporterName: forumDisplayNameForUser(database, user.id) || user.username,
        createdAt: timestamp
      };
      const nextStatus: ForumModerationStatus = target.current?.status === "hidden" || target.current?.status === "deleted"
        ? target.current.status
        : "needs-review";
      const moderation = {
        ...(target.current ?? defaultForumModerationState("visible", timestamp)),
        status: nextStatus,
        reportCount: (target.current?.reportCount ?? 0) + 1,
        reason: cleanReason,
        updatedAt: timestamp
      };
      target.update(moderation);
      touchForumThread(found.thread, timestamp);
      database.forum_reports.unshift(report);
      database.forum_reports = database.forum_reports.slice(0, 500);
      pushForumAudit(database, forumAuditEvent({
        action: "content-reported",
        actor: user,
        classId: found.thread.classId,
        threadId,
        targetType: "report",
        targetId: report.reportId,
        details: { reason: cleanReason, reportedTargetType: targetType, reportedTargetId: report.targetId }
      }));
      pushForumNotifications(database, {
        classId: found.thread.classId,
        threadId,
        actor: user,
        recipientIds: forumClassModeratorUserIds(database, found.thread.classId),
        type: "report",
        title: "Forum report needs review",
        body: cleanNote || cleanReason,
        targetType: "report",
        targetId: report.reportId
      });
      return { status: "reported" as const, report, thread: found.thread };
    });
  }

  async function markForumNotificationsRead({
    userId,
    classId,
    notificationIds
  }: {
    userId: string;
    classId?: string | null;
    notificationIds?: unknown;
  }) {
    return mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!user || user.role === "parent") return { status: "forbidden" as const };
      const idSet = Array.isArray(notificationIds)
        ? new Set(notificationIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim()))
        : null;
      const timestamp = now().toISOString();

      let updated = 0;
      for (const notification of database.forum_notifications) {
        if (notification.recipientId !== user.id) continue;
        if (classId && notification.classId !== classId) continue;
        if (idSet && !idSet.has(notification.notificationId)) continue;
        if (!notification.readAt) {
          notification.readAt = timestamp;
          updated += 1;
        }
      }

      return { status: "updated" as const, updated };
    });
  }

  return {
    addClassForumLivePulse,
    addClassForumReply,
    createClassForumThread,
    getForumWorkspaceData,
    markForumNotificationsRead,
    reportClassForumContent,
    updateClassForumThread
  };
}
