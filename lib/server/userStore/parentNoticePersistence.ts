import type {
  ParentChildSummary,
  ParentNoticeData,
  ParentNoticeReceiptSafe,
  ParentSafeTeacherDraft,
  StudentSession,
  TeacherNotice,
  TeacherNoticeAudience,
  TeacherNoticeDeliveryAttempt,
  TeacherNoticeDeliveryStatus,
  TeacherNoticeRecipient,
  TeacherNoticeRecipientStatus,
  TeacherNoticeSourceKind,
  TeacherNoticeStatus
} from "@/types";

type UserRole = StudentSession["role"];

type ParentNoticeUserRecord = {
  id: string;
  username?: string;
  disabled_at?: string | null;
  role: UserRole;
};

type ParentNoticeStudentProfileRecord = {
  user_id: string;
  name?: string;
};

type ParentNoticeGuardianLinkRecord = {
  parent_id: string;
  student_id: string;
  status: string;
};

type ParentNoticeClassRecord = {
  id: string;
  name: string;
};

type ParentNoticeRecord = {
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

type ParentNoticeRecipientRecord = {
  id: string;
  notice_id: string;
  student_id: string;
  guardian_id?: string;
  status: TeacherNoticeRecipientStatus;
  acknowledged_by?: string;
  acknowledged_at: string | null;
  created_at: string;
};

type ParentNoticeDeliveryAttemptRecord = {
  id: string;
  notice_id: string;
  channel_id: string;
  channel_name: string;
  status: TeacherNoticeDeliveryStatus;
  provider_message_id?: string;
  error_code?: string;
  error_message?: string;
  attempted_at: string;
};

type ParentNoticeReviewLessonRecord = {
  id: string;
};

type ParentSafeReviewLessonNoticeCopyRecord = {
  title_en: string;
  title_zh: string;
  source_snapshot: {
    assessmentTitle: {
      en: string;
      zh: string;
      zhHans?: string;
    };
  };
  objectives: Array<{
    en: string;
    zh: string;
    zhHans?: string;
  }>;
  items: Array<{
    category: string;
  }>;
  remediation_questions: Array<{
    validationStatus?: string;
  }>;
};

export type ParentNoticePersistenceDatabase = {
  guardian_links: ParentNoticeGuardianLinkRecord[];
  student_profiles: ParentNoticeStudentProfileRecord[];
  teacher_classes: ParentNoticeClassRecord[];
  teacher_notice_delivery_attempts: ParentNoticeDeliveryAttemptRecord[];
  teacher_notice_recipients: ParentNoticeRecipientRecord[];
  teacher_notices: ParentNoticeRecord[];
  teacher_review_lessons: ParentNoticeReviewLessonRecord[];
  users: ParentNoticeUserRecord[];
};

export type ParentNoticeMutationScope = {
  kind: "ack";
  parentId: string;
  recipientId: string;
};

export type ParentNoticePersistenceStoreDependencies = {
  getParentChildSummaries: (
    database: ParentNoticePersistenceDatabase,
    user: ParentNoticeUserRecord
  ) => ParentChildSummary[];
  now?: () => Date;
  readDatabase: () => Promise<ParentNoticePersistenceDatabase>;
  readParentDatabase?: (parentId: string) => Promise<ParentNoticePersistenceDatabase>;
  mutateDatabase: <T>(
    mutator: (database: ParentNoticePersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  mutateMutationDatabase?: <T>(
    scope: ParentNoticeMutationScope,
    mutator: (database: ParentNoticePersistenceDatabase) => T
  ) => Promise<T>;
};

export type ParentNoticePersistenceStore = ReturnType<typeof createParentNoticePersistenceStore>;

function toParentNoticeReceiptSafe(record: ParentNoticeRecipientRecord): ParentNoticeReceiptSafe {
  return {
    recipientId: record.id,
    status: "acknowledged",
    acknowledgedAt: record.acknowledged_at ?? ""
  };
}

function canUseParentArea(user?: ParentNoticeUserRecord | null): user is ParentNoticeUserRecord {
  return user?.role === "parent";
}

function studentProfileFor(database: ParentNoticePersistenceDatabase, userId: string) {
  return database.student_profiles.find((profile) => profile.user_id === userId);
}

function displayNameFor(database: ParentNoticePersistenceDatabase, userId: string, fallback: string) {
  const profile = studentProfileFor(database, userId);
  const user = database.users.find((candidate) => candidate.id === userId);
  return profile?.name ?? user?.username ?? fallback;
}

function parentCanAccessStudentInDatabase(
  database: ParentNoticePersistenceDatabase,
  parentId: string,
  studentId: string
) {
  return database.guardian_links.some((link) => (
    link.parent_id === parentId &&
    link.student_id === studentId &&
    link.status === "active"
  ));
}

function toTeacherNoticeRecipient(
  database: ParentNoticePersistenceDatabase,
  record: ParentNoticeRecipientRecord
): TeacherNoticeRecipient {
  return {
    id: record.id,
    noticeId: record.notice_id,
    studentId: record.student_id,
    studentName: displayNameFor(database, record.student_id, "Unknown student"),
    guardianId: record.guardian_id,
    guardianName: record.guardian_id ? displayNameFor(database, record.guardian_id, "Guardian") : undefined,
    status: record.status,
    acknowledgedBy: record.acknowledged_by,
    acknowledgedAt: record.acknowledged_at,
    createdAt: record.created_at
  };
}

function toTeacherNoticeDeliveryAttempt(record: ParentNoticeDeliveryAttemptRecord): TeacherNoticeDeliveryAttempt {
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

function toTeacherNotice(database: ParentNoticePersistenceDatabase, record: ParentNoticeRecord): TeacherNotice {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === record.class_id);
  const recipients = database.teacher_notice_recipients
    .filter((recipient) => recipient.notice_id === record.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((recipient) => toTeacherNoticeRecipient(database, recipient));
  const deliveryAttempts = database.teacher_notice_delivery_attempts
    .filter((attempt) => attempt.notice_id === record.id)
    .sort((a, b) => b.attempted_at.localeCompare(a.attempted_at))
    .map(toTeacherNoticeDeliveryAttempt);
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

export function parentSafeTeacherDraftFromNotice(
  database: ParentNoticePersistenceDatabase,
  record: ParentNoticeRecord,
  noticeOverride?: TeacherNotice
): ParentSafeTeacherDraft | null {
  if (record.source_kind !== "teacher-review-lesson" || !record.source_id) return null;
  const reviewLesson = database.teacher_review_lessons.find((candidate) => candidate.id === record.source_id);
  if (!reviewLesson) return null;
  const notice = noticeOverride ?? toTeacherNotice(database, record);

  return {
    id: `parent-safe-draft-${notice.id}`,
    noticeId: notice.id,
    sourceReviewLessonId: reviewLesson.id,
    classId: notice.classId,
    className: notice.className,
    teacherId: notice.teacherId,
    teacherName: displayNameFor(database, notice.teacherId, "Teacher"),
    title: notice.subject,
    summary: notice.body,
    status: notice.status,
    publishedAt: notice.sentAt ?? notice.updatedAt,
    acknowledgement: notice.acknowledgement
  };
}

export function parentSafeDraftForReviewLesson(
  database: ParentNoticePersistenceDatabase,
  reviewLessonId: string
) {
  return database.teacher_notices
    .filter((notice) => notice.source_kind === "teacher-review-lesson" && notice.source_id === reviewLessonId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((notice) => parentSafeTeacherDraftFromNotice(database, notice))
    .find((draft): draft is ParentSafeTeacherDraft => Boolean(draft)) ?? null;
}

export function parentSafeReviewLessonNoticeCopy(record: ParentSafeReviewLessonNoticeCopyRecord) {
  const mustTeachCount = record.items.filter((item) => item.category === "must-teach").length;
  const reviewedPracticeCount = record.remediation_questions.filter((question) => question.validationStatus === "validated").length;
  const assessmentTitleEn = record.source_snapshot.assessmentTitle.en;
  const assessmentTitleZh = record.source_snapshot.assessmentTitle.zhHans ?? record.source_snapshot.assessmentTitle.zh;
  const objectiveEn = record.objectives.slice(0, 3).map((objective) => objective.en).filter(Boolean).join("; ");
  const objectiveZh = record.objectives.slice(0, 3).map((objective) => objective.zhHans ?? objective.zh).filter(Boolean).join("；");

  return {
    subject: `Teacher-approved review: ${record.title_en} / 教師已審核講評：${record.title_zh}`,
    body: [
      `English: The teacher has approved a class-level review lesson for ${assessmentTitleEn}.`,
      objectiveEn ? `Focus: ${objectiveEn}.` : "",
      `The plan includes ${mustTeachCount} class discussion focus item(s) and ${reviewedPracticeCount} reviewed follow-up practice task(s).`,
      "This parent copy does not include individual student names, rankings, wrong-answer rosters, or teacher-only notes.",
      "",
      `中文：老師已審核 ${assessmentTitleZh} 的班級講評方案。`,
      objectiveZh ? `重點：${objectiveZh}。` : "",
      `方案包含 ${mustTeachCount} 個班級講評重點，以及 ${reviewedPracticeCount} 個已審核的課後跟進練習。`,
      "此家長版本不包含個別學生姓名、排名、錯答名單或教師私人備註。"
    ].filter(Boolean).join("\n")
  };
}

export function createParentNoticePersistenceStore({
  getParentChildSummaries,
  now = () => new Date(),
  readDatabase,
  readParentDatabase,
  mutateDatabase,
  mutateMutationDatabase
}: ParentNoticePersistenceStoreDependencies) {
  const loadParentDatabase = readParentDatabase ?? (async () => readDatabase());

  return {
    async getParentNoticeData(
      parentId: string,
      options: { selectedStudentId?: string | null; recipientId?: string | null } = {}
    ): Promise<ParentNoticeData | null> {
      const database = await loadParentDatabase(parentId);
      const user = database.users.find((candidate) => candidate.id === parentId);
      if (!canUseParentArea(user)) return null;
      const children = getParentChildSummaries(database, user);
      const allowedStudentIds = new Set(children.map((child) => child.student.id));
      let selectedStudentId: string | null = null;
      if (options.selectedStudentId !== undefined && options.selectedStudentId !== null) {
        if (!options.selectedStudentId || !allowedStudentIds.has(options.selectedStudentId)) return null;
        selectedStudentId = options.selectedStudentId;
      }

      let targetRecipient: ParentNoticeRecipientRecord | null = null;
      if (options.recipientId !== undefined && options.recipientId !== null) {
        if (!options.recipientId) return null;
        targetRecipient = database.teacher_notice_recipients.find((recipient) =>
          recipient.id === options.recipientId &&
          allowedStudentIds.has(recipient.student_id) &&
          recipient.guardian_id === parentId
        ) ?? null;
        if (!targetRecipient) return null;
      }
      if (selectedStudentId && targetRecipient && targetRecipient.student_id !== selectedStudentId) return null;

      const visibleStudentIds = targetRecipient
        ? new Set([targetRecipient.student_id])
        : selectedStudentId
          ? new Set([selectedStudentId])
          : allowedStudentIds;
      const targetNoticeId = targetRecipient?.notice_id ?? null;
      const notices = database.teacher_notices
        .filter((notice) => notice.status !== "draft")
        .filter((notice) => !targetNoticeId || notice.id === targetNoticeId)
        .filter((notice) =>
          database.teacher_notice_recipients.some(
            (recipient) =>
              recipient.notice_id === notice.id &&
              visibleStudentIds.has(recipient.student_id) &&
              recipient.guardian_id === parentId
          )
        )
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((notice) => {
          const fullNotice = toTeacherNotice(database, notice);
          const recipients = fullNotice.recipients.filter(
            (recipient) =>
              visibleStudentIds.has(recipient.studentId) &&
              recipient.guardianId === parentId &&
              (!targetRecipient || recipient.id === targetRecipient.id)
          );
          const acknowledged = recipients.filter((recipient) => recipient.status === "acknowledged").length;
          return {
            ...fullNotice,
            recipients,
            acknowledgement: {
              total: recipients.length,
              acknowledged,
              pending: Math.max(0, recipients.length - acknowledged)
            }
          };
        });
      const parentSafeDrafts = notices
        .filter((notice) => notice.source?.kind === "teacher-review-lesson" && notice.source.id)
        .map((notice) => {
          const sourceRecord = database.teacher_notices.find((record) => record.id === notice.id);
          return sourceRecord ? parentSafeTeacherDraftFromNotice(database, sourceRecord, notice) : null;
        })
        .filter((draft): draft is ParentSafeTeacherDraft => Boolean(draft));

      return {
        generatedAt: now().toISOString(),
        children,
        notices,
        parentSafeDrafts
      };
    },
    async acknowledgeParentNotice({
      parentId,
      recipientId
    }: {
      parentId: string;
      recipientId: string;
    }) {
      const mutate = (database: ParentNoticePersistenceDatabase) => {
        const user = database.users.find((candidate) => candidate.id === parentId);
        if (user?.role !== "parent") return { status: "forbidden" as const };
        const recipient = database.teacher_notice_recipients.find((candidate) => candidate.id === recipientId);
        if (!recipient) return { status: "not-found" as const };
        // Once the caller is known to be a parent, every inaccessible recipient is deliberately
        // indistinguishable from an absent one. A 403 here would reveal that another family's
        // recipient id exists; revoked links must close the same side channel.
        if (recipient.guardian_id !== parentId) return { status: "not-found" as const };
        if (!parentCanAccessStudentInDatabase(database, parentId, recipient.student_id)) {
          return { status: "not-found" as const };
        }

        // Acknowledgement is a receipt of record: `acknowledged_at` is the evidence of WHEN a
        // guardian confirmed a notice. A repeat POST — double click, retry, refresh, back
        // button — must not overwrite that with a later time. Deliberately placed after the
        // authorization checks above so a re-acknowledgement is still authorized, not waved
        // through by the early return.
        if (recipient.status === "acknowledged" && recipient.acknowledged_at) {
          return {
            status: "acknowledged" as const,
            receipt: toParentNoticeReceiptSafe(recipient)
          };
        }

        const updatedAt = now().toISOString();
        recipient.status = "acknowledged";
        recipient.acknowledged_by = parentId;
        recipient.acknowledged_at = updatedAt;
        const notice = database.teacher_notices.find((candidate) => candidate.id === recipient.notice_id);
        if (notice) notice.updated_at = updatedAt;
        return { status: "acknowledged" as const, receipt: toParentNoticeReceiptSafe(recipient) };
      };
      return mutateMutationDatabase
        ? mutateMutationDatabase({ kind: "ack", parentId, recipientId }, mutate)
        : mutateDatabase(mutate);
    }
  };
}
