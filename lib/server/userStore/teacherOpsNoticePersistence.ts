import { createHash } from "node:crypto";
import type {
  GuardianLinkStatus,
  SchoolMembershipRole,
  TeacherClassCollaboratorRole,
  TeacherNotice,
  TeacherNoticeAudience,
  TeacherNoticeDeliveryAttempt,
  TeacherNoticeDeliveryStatus,
  TeacherNoticeRecipient,
  TeacherNoticeRecipientStatus,
  TeacherNoticeSourceKind,
  TeacherNoticeStatus
} from "@/types";

type TeacherOpsNoticeUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsNoticeUserRecord = {
  id: string;
  role: TeacherOpsNoticeUserRole;
  username?: string;
};

type TeacherOpsNoticeStudentProfileRecord = {
  user_id: string;
  name?: string;
};

type TeacherOpsNoticeClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
};

type TeacherOpsNoticeAssignmentRecord = {
  id: string;
  class_id: string;
};

type TeacherOpsNoticeClassEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

type TeacherOpsNoticeGuardianLinkRecord = {
  id: string;
  parent_id: string;
  student_id: string;
  status: GuardianLinkStatus;
};

type TeacherOpsNoticeSchoolMembershipRecord = {
  user_id: string;
  role: SchoolMembershipRole;
  class_id?: string;
};

type TeacherOpsNoticeClassCollaboratorRecord = {
  id: string;
  class_id: string;
  teacher_id: string;
  role: Exclude<TeacherClassCollaboratorRole, "owner">;
  status: "active" | "invited" | "inactive";
};

type TeacherOpsNoticeRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  audience: TeacherNoticeAudience;
  channel_id: string;
  channel_name: string;
  subject_en: string;
  subject_zh: string;
  body_en: string;
  body_zh: string;
  status: TeacherNoticeStatus;
  assignment_id?: string;
  source_kind?: TeacherNoticeSourceKind;
  source_id?: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

type TeacherOpsNoticeRecipientRecord = {
  id: string;
  notice_id: string;
  student_id: string;
  guardian_id?: string;
  status: TeacherNoticeRecipientStatus;
  acknowledged_by?: string;
  acknowledged_at: string | null;
  created_at: string;
};

type TeacherOpsNoticeDeliveryAttemptRecord = {
  id: string;
  notice_id: string;
  channel_id: string;
  channel_name: string;
  status: TeacherNoticeDeliveryStatus;
  provider_message_id?: string;
  error_code?: string;
  error_message?: string;
  attempted_at: string;
  request_idempotency_key_hash?: string;
  request_idempotency_request_hash?: string;
  queued_by_id?: string;
  provider_contact_started_at?: string;
};

type TeacherOpsNoticeChannel = {
  id: string;
  name: string;
};

export type TeacherOpsNoticePersistenceDatabase = {
  assignments: TeacherOpsNoticeAssignmentRecord[];
  class_enrollments: TeacherOpsNoticeClassEnrollmentRecord[];
  guardian_links: TeacherOpsNoticeGuardianLinkRecord[];
  school_memberships?: TeacherOpsNoticeSchoolMembershipRecord[];
  student_profiles?: TeacherOpsNoticeStudentProfileRecord[];
  teacher_class_collaborators: TeacherOpsNoticeClassCollaboratorRecord[];
  teacher_classes: TeacherOpsNoticeClassRecord[];
  teacher_notice_delivery_attempts: TeacherOpsNoticeDeliveryAttemptRecord[];
  teacher_notice_recipients: TeacherOpsNoticeRecipientRecord[];
  teacher_notices: TeacherOpsNoticeRecord[];
  users: TeacherOpsNoticeUserRecord[];
};

export type TeacherOpsNoticeDeliveryResult = {
  status: TeacherNoticeDeliveryStatus;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type TeacherOpsNoticePersistenceStoreDependencies = {
  readDatabase: () => Promise<TeacherOpsNoticePersistenceDatabase>;
  mutateDatabase: <T>(mutator: (database: TeacherOpsNoticePersistenceDatabase) => T | Promise<T>) => Promise<T>;
  createId: () => string;
  now: () => Date;
  getNotificationSummary: (classId?: string) => { channels: TeacherOpsNoticeChannel[] };
  queueNoticeEmail: (input: { teacherId: string; noticeId: string; idempotencyKey: string }) => Promise<QueueTeacherNoticeEmailResult>;
  sendNotification: (input: { channelId: string; markdown: string }) => Promise<TeacherOpsNoticeDeliveryResult>;
  toDeliveryAttempt?: (attempt: TeacherOpsNoticeDeliveryAttemptRecord) => TeacherNoticeDeliveryAttempt;
  toNotice?: (database: TeacherOpsNoticePersistenceDatabase, notice: TeacherOpsNoticeRecord) => TeacherNotice;
};

type CreateTeacherNoticeParams = {
  teacherId: string;
  classId: string;
  channelId?: string;
  audience: TeacherNoticeAudience;
  subject: string;
  body: string;
  assignmentId?: string | null;
  dueAt?: string | null;
};

type CreateTeacherNoticeResult =
  | { status: "created"; notice: TeacherNotice }
  | { status: "assignment-not-found" | "forbidden" | "invalid" | "not-found" };

type SendTeacherNoticeParams = {
  teacherId: string;
  noticeId: string;
  idempotencyKey?: string;
};

type QueueTeacherNoticeEmailResult =
  | { status: "queued"; queued: number; reused: number; recovered: number; skipped: number }
  | { status: "no-eligible"; skipped: number }
  | { status: "invalid" }
  | { status: "conflict" }
  | { status: "not-found" };

type SendTeacherNoticeResult =
  | {
      status: "sent";
      notice: TeacherNotice;
      attempt: TeacherNoticeDeliveryAttempt;
      email: Extract<QueueTeacherNoticeEmailResult, { status: "queued" | "no-eligible" }>;
    }
  | { status: "invalid" | "conflict" | "not-found" };

const validTeacherNoticeAudiences = new Set<TeacherNoticeAudience>(["parents", "students", "both"]);
const validTeacherNoticeSourceKinds = new Set<TeacherNoticeSourceKind>(["manual", "teacher-review-lesson", "assignment-reminder", "system"]);
const teacherNoticeIdempotencyKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{15,127}$/u;

function canonicalTeacherNoticeRequestValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalTeacherNoticeRequestValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalTeacherNoticeRequestValue(entry)])
  );
}

function teacherNoticeRequestDigest(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalTeacherNoticeRequestValue(value)), "utf8")
    .digest("hex");
}

export function normalizeTeacherNoticeRequestIdempotency({
  actorId,
  key,
  operation,
  payload
}: {
  actorId: string;
  key: string;
  operation: "notice-send" | "reminder-run";
  payload: unknown;
}) {
  const normalizedActorId = actorId.trim();
  const normalizedKey = key.trim();
  if (!normalizedActorId || !teacherNoticeIdempotencyKeyPattern.test(normalizedKey)) return null;
  return {
    keyHash: teacherNoticeRequestDigest({ actorId: normalizedActorId, key: normalizedKey, operation }),
    requestHash: teacherNoticeRequestDigest({ actorId: normalizedActorId, operation, payload })
  };
}

export type TeacherOpsNoticePersistenceStore = ReturnType<typeof createTeacherOpsNoticePersistenceStore>;

export function isValidTeacherNoticeSourceKind(sourceKind: unknown): sourceKind is TeacherNoticeSourceKind {
  return validTeacherNoticeSourceKinds.has(sourceKind as TeacherNoticeSourceKind);
}

export function normalizeTeacherNoticeSourceKind(sourceKind: unknown): TeacherNoticeSourceKind | undefined {
  return isValidTeacherNoticeSourceKind(sourceKind) ? sourceKind : undefined;
}

export function normalizeTeacherOpsNoticeRecord<
  Record extends {
    assignment_id?: string;
    source_kind?: unknown;
    source_id?: unknown;
  }
>(
  notice: Record,
  dependencies: {
    deletedAssignmentIds: ReadonlySet<string>;
  }
): Record & {
  assignment_id: string | undefined;
  source_kind: TeacherNoticeSourceKind | undefined;
  source_id: string | undefined;
} {
  return {
    ...notice,
    assignment_id: notice.assignment_id && !dependencies.deletedAssignmentIds.has(notice.assignment_id) ? notice.assignment_id : undefined,
    source_kind: normalizeTeacherNoticeSourceKind(notice.source_kind),
    source_id: typeof notice.source_id === "string" && notice.source_id.trim() ? notice.source_id.trim() : undefined
  };
}

function canUseTeacherArea(user?: TeacherOpsNoticeUserRecord | null): user is TeacherOpsNoticeUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function studentProfileFor(database: TeacherOpsNoticePersistenceDatabase, userId: string) {
  return database.student_profiles?.find((profile) => profile.user_id === userId);
}

function teacherCanAccessClass(
  database: TeacherOpsNoticePersistenceDatabase,
  user: TeacherOpsNoticeUserRecord,
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

function teacherCanMutateOperationsClass(
  database: TeacherOpsNoticePersistenceDatabase,
  user: TeacherOpsNoticeUserRecord,
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

export function teacherOpsNoticeRecipientRecordsForClass({
  database,
  classId,
  noticeId,
  audience,
  now,
  studentIds,
  createId
}: {
  database: TeacherOpsNoticePersistenceDatabase;
  classId: string;
  noticeId: string;
  audience: TeacherNoticeAudience;
  now: string;
  studentIds?: string[];
  createId: () => string;
}) {
  const allowedStudentIds = studentIds?.length ? new Set(studentIds) : null;
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId && (!allowedStudentIds || allowedStudentIds.has(enrollment.student_id)))
    .flatMap((enrollment) => {
      const activeGuardians = database.guardian_links.filter(
        (link) => link.student_id === enrollment.student_id && link.status === "active"
      );
      if (audience === "students") {
        return [{
          id: `notice-recipient-${createId()}`,
          notice_id: noticeId,
          student_id: enrollment.student_id,
          status: "pending" as const,
          acknowledged_at: null,
          created_at: now
        }];
      }

      if (activeGuardians.length) {
        return activeGuardians.map((guardian): TeacherOpsNoticeRecipientRecord => ({
          id: `notice-recipient-${createId()}`,
          notice_id: noticeId,
          student_id: enrollment.student_id,
          guardian_id: guardian.parent_id,
          status: "pending",
          acknowledged_at: null,
          created_at: now
        }));
      }

      return [{
        id: `notice-recipient-${createId()}`,
        notice_id: noticeId,
        student_id: enrollment.student_id,
        status: "pending" as const,
        acknowledged_at: null,
        created_at: now
      }];
    });
}

export function toTeacherOpsNoticeRecipient(
  database: TeacherOpsNoticePersistenceDatabase,
  record: TeacherOpsNoticeRecipientRecord
): TeacherNoticeRecipient {
  const studentProfile = studentProfileFor(database, record.student_id);
  const student = database.users.find((candidate) => candidate.id === record.student_id);
  const guardianProfile = record.guardian_id ? studentProfileFor(database, record.guardian_id) : null;
  const guardian = record.guardian_id ? database.users.find((candidate) => candidate.id === record.guardian_id) : null;

  return {
    id: record.id,
    noticeId: record.notice_id,
    studentId: record.student_id,
    studentName: studentProfile?.name ?? student?.username ?? "Unknown student",
    guardianId: record.guardian_id,
    guardianName: guardianProfile?.name ?? guardian?.username,
    status: record.status,
    acknowledgedBy: record.acknowledged_by,
    acknowledgedAt: record.acknowledged_at,
    createdAt: record.created_at
  };
}

export function toTeacherOpsNoticeDeliveryAttempt(
  record: TeacherOpsNoticeDeliveryAttemptRecord
): TeacherNoticeDeliveryAttempt {
  return {
    id: record.id,
    noticeId: record.notice_id,
    channelId: record.channel_id,
    channelName: record.channel_name,
    status: record.status,
    providerMessageId: record.provider_message_id,
    errorCode: record.error_code,
    errorMessage: record.error_message,
    attemptedAt: record.attempted_at
  };
}

export function toTeacherOpsNotice(
  database: TeacherOpsNoticePersistenceDatabase,
  record: TeacherOpsNoticeRecord
): TeacherNotice {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === record.class_id);
  const recipients = database.teacher_notice_recipients
    .filter((recipient) => recipient.notice_id === record.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((recipient) => toTeacherOpsNoticeRecipient(database, recipient));
  const deliveryAttempts = database.teacher_notice_delivery_attempts
    .filter((attempt) => attempt.notice_id === record.id)
    .sort((a, b) => b.attempted_at.localeCompare(a.attempted_at))
    .map(toTeacherOpsNoticeDeliveryAttempt);
  const acknowledged = recipients.filter((recipient) => recipient.status === "acknowledged").length;

  return {
    id: record.id,
    teacherId: record.teacher_id,
    classId: record.class_id,
    className: teacherClass?.name ?? record.class_id,
    audience: record.audience,
    channelId: record.channel_id,
    channelName: record.channel_name,
    subject: {
      en: record.subject_en,
      zh: record.subject_zh
    },
    body: {
      en: record.body_en,
      zh: record.body_zh
    },
    status: record.status,
    assignmentId: record.assignment_id,
    source: record.source_kind
      ? {
          kind: record.source_kind,
          id: record.source_id
        }
      : undefined,
    dueAt: record.due_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    sentAt: record.sent_at,
    recipients,
    deliveryAttempts,
    acknowledgement: {
      total: recipients.length,
      acknowledged,
      pending: Math.max(0, recipients.length - acknowledged)
    }
  };
}

export function teacherOpsNoticeAckLink(origin: string | undefined, recipientId: string) {
  const path = `/parent/notices?recipientId=${encodeURIComponent(recipientId)}`;
  return origin ? `${origin.replace(/\/$/, "")}${path}` : path;
}

export function buildTeacherOpsNoticeMarkdown({
  database,
  notice,
  origin
}: {
  database: TeacherOpsNoticePersistenceDatabase;
  notice: TeacherOpsNoticeRecord;
  origin?: string;
}) {
  const recipients = database.teacher_notice_recipients.filter((recipient) => recipient.notice_id === notice.id);
  const firstRecipient = recipients.find((recipient) => recipient.guardian_id) ?? recipients[0];
  const ackLink = firstRecipient ? teacherOpsNoticeAckLink(origin, firstRecipient.id) : "/parent/notices";
  const dueLine = notice.due_at ? `\n> 截止 / Due: ${new Date(notice.due_at).toLocaleString("zh-HK")}` : "";
  return [
    `## ${notice.subject_zh || notice.subject_en}`,
    `班級 / Class: ${database.teacher_classes.find((teacherClass) => teacherClass.id === notice.class_id)?.name ?? notice.class_id}`,
    dueLine.trim(),
    notice.body_zh || notice.body_en,
    "",
    `[在 MAIS 確認回執 / Confirm in MAIS](${ackLink})`
  ].filter(Boolean).join("\n\n");
}

export function createTeacherOpsNoticeRecord({
  database,
  teacher,
  teacherClass,
  channelId,
  subject,
  body,
  audience,
  assignmentId,
  sourceKind,
  sourceId,
  dueAt,
  studentIds,
  now,
  createId,
  getNotificationSummary
}: {
  database: TeacherOpsNoticePersistenceDatabase;
  teacher: TeacherOpsNoticeUserRecord;
  teacherClass: TeacherOpsNoticeClassRecord;
  channelId?: string;
  subject: string;
  body: string;
  audience: TeacherNoticeAudience;
  assignmentId?: string | null;
  sourceKind?: TeacherNoticeSourceKind;
  sourceId?: string | null;
  dueAt?: string | null;
  studentIds?: string[];
  now: string;
  createId: () => string;
  getNotificationSummary: (classId?: string) => { channels: TeacherOpsNoticeChannel[] };
}) {
  const notificationSummary = getNotificationSummary(teacherClass.id);
  const channel = notificationSummary.channels.find((candidate) => candidate.id === channelId) ?? notificationSummary.channels[0];
  const notice: TeacherOpsNoticeRecord = {
    id: `notice-${createId()}`,
    teacher_id: teacher.id,
    class_id: teacherClass.id,
    audience,
    channel_id: channel?.id ?? "manual-wecom",
    channel_name: channel?.name ?? "Manual / unconfigured WeCom group",
    subject_en: subject,
    subject_zh: subject,
    body_en: body,
    body_zh: body,
    status: "draft",
    assignment_id: assignmentId ?? undefined,
    source_kind: normalizeTeacherNoticeSourceKind(sourceKind),
    source_id: sourceId?.trim() || undefined,
    due_at: dueAt ?? null,
    created_at: now,
    updated_at: now,
    sent_at: null
  };
  database.teacher_notices.unshift(notice);
  database.teacher_notice_recipients.push(
    ...teacherOpsNoticeRecipientRecordsForClass({
      database,
      classId: teacherClass.id,
      noticeId: notice.id,
      audience,
      now,
      studentIds,
      createId
    })
  );
  return notice;
}

export async function sendTeacherOpsNoticeRecord({
  database,
  notice,
  origin,
  now,
  createId,
  sendNotification
}: {
  database: TeacherOpsNoticePersistenceDatabase;
  notice: TeacherOpsNoticeRecord;
  origin?: string;
  now: () => Date;
  createId: () => string;
  sendNotification: (input: { channelId: string; markdown: string }) => Promise<TeacherOpsNoticeDeliveryResult>;
}) {
  const attemptedAt = now().toISOString();
  const result = await sendNotification({
    channelId: notice.channel_id,
    markdown: buildTeacherOpsNoticeMarkdown({ database, notice, origin })
  });
  const attempt: TeacherOpsNoticeDeliveryAttemptRecord = {
    id: `notice-delivery-${createId()}`,
    notice_id: notice.id,
    channel_id: notice.channel_id,
    channel_name: notice.channel_name,
    status: result.status,
    provider_message_id: result.providerMessageId,
    error_code: result.errorCode,
    error_message: result.errorMessage,
    attempted_at: attemptedAt
  };
  database.teacher_notice_delivery_attempts.unshift(attempt);
  notice.status = result.status === "sent" ? "sent" : result.status === "disabled" ? "queued" : "failed";
  notice.sent_at = result.status === "sent" || result.status === "disabled" ? attemptedAt : notice.sent_at;
  notice.updated_at = attemptedAt;
  return attempt;
}

export function createTeacherOpsNoticePersistenceStore({
  mutateDatabase,
  createId,
  now,
  getNotificationSummary,
  queueNoticeEmail,
  sendNotification,
  toDeliveryAttempt = toTeacherOpsNoticeDeliveryAttempt,
  toNotice = toTeacherOpsNotice
}: TeacherOpsNoticePersistenceStoreDependencies) {
  return {
    async createTeacherNotice({
      teacherId,
      classId,
      channelId,
      audience,
      subject,
      body,
      assignmentId,
      dueAt
    }: CreateTeacherNoticeParams): Promise<CreateTeacherNoticeResult> {
      const trimmedSubject = subject.trim();
      const trimmedBody = body.trim();
      if (!trimmedSubject || !trimmedBody || !validTeacherNoticeAudiences.has(audience)) return { status: "invalid" };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const teacherClass = teacherCanMutateOperationsClass(database, user, classId);
        if (!teacherClass) return { status: "not-found" as const };
        if (assignmentId && !database.assignments.some((assignment) => assignment.id === assignmentId && assignment.class_id === classId)) {
          return { status: "assignment-not-found" as const };
        }

        const nowIso = now().toISOString();
        const notice = createTeacherOpsNoticeRecord({
          database,
          teacher: user,
          teacherClass,
          channelId,
          subject: trimmedSubject,
          body: trimmedBody,
          audience,
          assignmentId,
          dueAt,
          now: nowIso,
          createId,
          getNotificationSummary
        });
        return { status: "created" as const, notice: toNotice(database, notice) };
      });
    },

    async sendTeacherNotice({
      teacherId,
      noticeId,
      idempotencyKey
    }: SendTeacherNoticeParams): Promise<SendTeacherNoticeResult> {
      const resolvedIdempotencyKey = idempotencyKey ?? `legacy-notice-send/${noticeId}`;
      const idempotency = normalizeTeacherNoticeRequestIdempotency({
        actorId: teacherId,
        key: resolvedIdempotencyKey,
        operation: "notice-send",
        payload: { noticeId }
      });
      if (!idempotency) return { status: "invalid" };

      const prepared = await mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "not-found" as const };
        const notice = database.teacher_notices.find((candidate) => candidate.id === noticeId);
        if (!notice || !teacherCanMutateOperationsClass(database, user, notice.class_id)) {
          return { status: "not-found" as const };
        }

        const keyedAttempts = database.teacher_notice_delivery_attempts.filter(
          (attempt) => attempt.request_idempotency_key_hash === idempotency.keyHash
        );
        if (
          keyedAttempts.length > 1 ||
          keyedAttempts.some((attempt) =>
            attempt.request_idempotency_request_hash !== idempotency.requestHash ||
            attempt.notice_id !== notice.id ||
            attempt.queued_by_id !== user.id
          )
        ) {
          return { status: "conflict" as const };
        }

        if (!database.teacher_notice_recipients.some((recipient) => recipient.notice_id === notice.id)) {
          database.teacher_notice_recipients.push(
            ...teacherOpsNoticeRecipientRecordsForClass({
              database,
              classId: notice.class_id,
              noticeId: notice.id,
              audience: notice.audience,
              now: now().toISOString(),
              createId
            })
          );
        }

        const existingAttempt = keyedAttempts[0];
        if (existingAttempt) {
          return { status: "prepared" as const, attemptId: existingAttempt.id };
        }

        const preparedAt = now().toISOString();
        const attempt: TeacherOpsNoticeDeliveryAttemptRecord = {
          id: `notice-delivery-${createId()}`,
          notice_id: notice.id,
          channel_id: notice.channel_id,
          channel_name: notice.channel_name,
          status: "queued",
          attempted_at: preparedAt,
          request_idempotency_key_hash: idempotency.keyHash,
          request_idempotency_request_hash: idempotency.requestHash,
          queued_by_id: user.id
        };
        database.teacher_notice_delivery_attempts.unshift(attempt);
        notice.status = "queued";
        notice.updated_at = preparedAt;
        return { status: "prepared" as const, attemptId: attempt.id };
      });
      if (prepared.status !== "prepared") return prepared;

      const email = await queueNoticeEmail({
        teacherId,
        noticeId,
        idempotencyKey: resolvedIdempotencyKey.trim()
      });
      if (email.status === "invalid" || email.status === "conflict" || email.status === "not-found") {
        return email;
      }

      const claim = await mutateDatabase((database) => {
        const attempt = database.teacher_notice_delivery_attempts.find(
          (candidate) => candidate.id === prepared.attemptId
        );
        const notice = database.teacher_notices.find((candidate) => candidate.id === noticeId);
        const queueActor = database.users.find((candidate) => candidate.id === attempt?.queued_by_id);
        if (
          !attempt || !notice || !queueActor || !canUseTeacherArea(queueActor) ||
          attempt.notice_id !== notice.id ||
          attempt.request_idempotency_key_hash !== idempotency.keyHash ||
          attempt.request_idempotency_request_hash !== idempotency.requestHash ||
          !teacherCanMutateOperationsClass(database, queueActor, notice.class_id)
        ) {
          return { status: "not-found" as const };
        }
        if (attempt.provider_contact_started_at) {
          return { status: "replay" as const };
        }
        const providerContactStartedAt = now().toISOString();
        attempt.provider_contact_started_at = providerContactStartedAt;
        attempt.attempted_at = providerContactStartedAt;
        return {
          status: "claimed" as const,
          channelId: attempt.channel_id,
          markdown: buildTeacherOpsNoticeMarkdown({ database, notice })
        };
      });
      if (claim.status === "not-found") return claim;

      if (claim.status === "claimed") {
        const delivery = await sendNotification({
          channelId: claim.channelId,
          markdown: claim.markdown
        });
        await mutateDatabase((database) => {
          const attempt = database.teacher_notice_delivery_attempts.find(
            (candidate) => candidate.id === prepared.attemptId
          );
          const notice = database.teacher_notices.find((candidate) => candidate.id === noticeId);
          if (
            !attempt || !notice || attempt.status !== "queued" ||
            !attempt.provider_contact_started_at ||
            attempt.request_idempotency_key_hash !== idempotency.keyHash ||
            attempt.request_idempotency_request_hash !== idempotency.requestHash
          ) return false;
          attempt.status = delivery.status;
          attempt.provider_message_id = delivery.providerMessageId;
          attempt.error_code = delivery.errorCode;
          attempt.error_message = delivery.errorMessage;
          notice.status = delivery.status === "sent" ? "sent" : delivery.status === "disabled" ? "queued" : "failed";
          notice.sent_at = delivery.status === "sent"
            ? attempt.provider_contact_started_at
            : notice.sent_at;
          notice.updated_at = attempt.provider_contact_started_at;
          return true;
        });
      }

      return mutateDatabase((database) => {
        const attempt = database.teacher_notice_delivery_attempts.find(
          (candidate) => candidate.id === prepared.attemptId
        );
        const notice = database.teacher_notices.find((candidate) => candidate.id === noticeId);
        if (!attempt || !notice) return { status: "not-found" as const };
        return {
          status: "sent" as const,
          notice: toNotice(database, notice),
          attempt: toDeliveryAttempt(attempt),
          email
        };
      });
    }
  };
}
