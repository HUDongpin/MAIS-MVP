import type {
  ContentSafetyAlertCounts,
  ContentSafetyAlertsData,
  ContentSafetyCategory,
  ContentSafetyFlag,
  ContentSafetyFlagStatus,
  ContentSafetySeverity,
  ContentSafetySource,
  StudentSession
} from "@/types";

// Persistence for content-safety flags & alerts.
//
// When the classifier flags a student's tutor message, a durable flag record is
// written here and escalated to the student's teacher(s) and to admins. The
// module mirrors the structure of novaLensPersistence: a self-contained DB
// subset type, record normalization, and a store factory wired into the main
// userStore. Visibility follows the same rule used elsewhere — a teacher can see
// a flag only for a student enrolled in a class they own or co-teach; admins see
// everything.

type UserRole = StudentSession["role"];

export type ContentSafetyFlagRecord = {
  id: string;
  student_id: string;
  student_name: string;
  category: ContentSafetyCategory;
  severity: ContentSafetySeverity;
  source: ContentSafetySource;
  status: ContentSafetyFlagStatus;
  excerpt: string;
  matched_terms: string[];
  page: string | null;
  topic_id: string | null;
  lesson_slug: string | null;
  language: string;
  blocked_reply: boolean;
  created_at: string;
  acknowledged_by: string | null;
  acknowledged_by_name: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
};

type ContentSafetyUserRecord = {
  id: string;
  // The users table keys the display handle as `username`; some seeded/session
  // records also carry `name`. Prefer `name`, fall back to `username`.
  name?: string;
  username?: string;
  role: UserRole;
};

function displayNameForUser(user: ContentSafetyUserRecord | undefined, fallback: string) {
  return user?.name || user?.username || fallback;
}

type ContentSafetyTeacherClassRecord = {
  id: string;
  teacher_id: string;
};

type ContentSafetyClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type ContentSafetySchoolMembershipRecord = {
  user_id: string;
  role: string;
  class_id?: string;
};

export type ContentSafetyPersistenceDatabase = {
  content_safety_flags: ContentSafetyFlagRecord[];
  class_enrollments?: ContentSafetyClassEnrollmentRecord[];
  teacher_classes?: ContentSafetyTeacherClassRecord[];
  school_memberships?: ContentSafetySchoolMembershipRecord[];
  users: ContentSafetyUserRecord[];
};

export type ContentSafetyPersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<ContentSafetyPersistenceDatabase>;
  mutateDatabase: <T>(mutator: (database: ContentSafetyPersistenceDatabase) => T | Promise<T>) => Promise<T>;
};

export type ContentSafetyPersistenceStore = ReturnType<typeof createContentSafetyPersistenceStore>;

const contentSafetyCategorySet = new Set<ContentSafetyCategory>([
  "self-harm",
  "abuse",
  "violence",
  "sexual",
  "harassment"
]);
const contentSafetySeveritySet = new Set<ContentSafetySeverity>(["critical", "high", "medium"]);
const contentSafetySourceSet = new Set<ContentSafetySource>(["student-input", "tutor-output"]);
const contentSafetyStatusSet = new Set<ContentSafetyFlagStatus>(["new", "acknowledged", "resolved"]);

const maxStoredFlags = 5000;
const maxExcerptLength = 200;
const maxMatchedTerms = 8;
const maxMatchedTermLength = 80;
const maxResolutionNoteLength = 500;

const severityRank: Record<ContentSafetySeverity, number> = {
  critical: 3,
  high: 2,
  medium: 1
};

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeMatchedTerms(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => cleanString(item, maxMatchedTermLength))
      .filter(Boolean)
  )).slice(0, maxMatchedTerms);
}

export function normalizeContentSafetyFlagRecord(
  value: unknown,
  now = new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID()
): ContentSafetyFlagRecord | null {
  const record = typeof value === "object" && value !== null ? value as Partial<ContentSafetyFlagRecord> : null;
  if (!record) return null;

  const studentId = cleanString(record.student_id, 160);
  if (!studentId) return null;
  if (!contentSafetyCategorySet.has(record.category as ContentSafetyCategory)) return null;

  const status = contentSafetyStatusSet.has(record.status as ContentSafetyFlagStatus)
    ? record.status as ContentSafetyFlagStatus
    : "new";

  return {
    id: cleanString(record.id, 120) || `content-safety-${createId()}`,
    student_id: studentId,
    student_name: cleanString(record.student_name, 160) || "Student",
    category: record.category as ContentSafetyCategory,
    severity: contentSafetySeveritySet.has(record.severity as ContentSafetySeverity)
      ? record.severity as ContentSafetySeverity
      : "high",
    source: contentSafetySourceSet.has(record.source as ContentSafetySource)
      ? record.source as ContentSafetySource
      : "student-input",
    status,
    excerpt: cleanString(record.excerpt, maxExcerptLength),
    matched_terms: normalizeMatchedTerms(record.matched_terms),
    page: cleanString(record.page, 220) || null,
    topic_id: cleanString(record.topic_id, 160) || null,
    lesson_slug: cleanString(record.lesson_slug, 160) || null,
    language: cleanString(record.language, 16) || "en",
    blocked_reply: record.blocked_reply === true,
    created_at: cleanString(record.created_at, 40) || now,
    acknowledged_by: cleanString(record.acknowledged_by, 160) || null,
    acknowledged_by_name: cleanString(record.acknowledged_by_name, 160) || null,
    acknowledged_at: cleanString(record.acknowledged_at, 40) || null,
    resolved_by: cleanString(record.resolved_by, 160) || null,
    resolved_by_name: cleanString(record.resolved_by_name, 160) || null,
    resolved_at: cleanString(record.resolved_at, 40) || null,
    resolution_note: cleanString(record.resolution_note, maxResolutionNoteLength) || null
  };
}

export function normalizeContentSafetyFlagRecords(
  records: unknown[] | undefined,
  now = new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID()
): ContentSafetyFlagRecord[] {
  return (records ?? [])
    .map((record) => normalizeContentSafetyFlagRecord(record, now, createId))
    .filter((record): record is ContentSafetyFlagRecord => Boolean(record));
}

function contentSafetyFlagToPublic(record: ContentSafetyFlagRecord): ContentSafetyFlag {
  return {
    id: record.id,
    studentId: record.student_id,
    studentName: record.student_name,
    category: record.category,
    severity: record.severity,
    source: record.source,
    status: record.status,
    excerpt: record.excerpt,
    matchedTerms: record.matched_terms,
    language: record.language,
    blockedReply: record.blocked_reply,
    createdAt: record.created_at,
    ...(record.page ? { page: record.page } : {}),
    ...(record.topic_id ? { topicId: record.topic_id } : {}),
    ...(record.lesson_slug ? { lessonSlug: record.lesson_slug } : {}),
    ...(record.acknowledged_by ? { acknowledgedBy: record.acknowledged_by } : {}),
    ...(record.acknowledged_by_name ? { acknowledgedByName: record.acknowledged_by_name } : {}),
    ...(record.acknowledged_at ? { acknowledgedAt: record.acknowledged_at } : {}),
    ...(record.resolved_by ? { resolvedBy: record.resolved_by } : {}),
    ...(record.resolved_by_name ? { resolvedByName: record.resolved_by_name } : {}),
    ...(record.resolved_at ? { resolvedAt: record.resolved_at } : {}),
    ...(record.resolution_note ? { resolutionNote: record.resolution_note } : {})
  };
}

// Teacher visibility mirrors the shared rule (see novaLensPersistence): a teacher
// sees a student's flags when the student is enrolled in a class the teacher owns
// or co-teaches (via a school membership). Admins see everything.
function studentIdsVisibleToViewer(
  database: ContentSafetyPersistenceDatabase,
  viewer: ContentSafetyUserRecord
): "all" | Set<string> {
  if (viewer.role === "admin") return "all";
  if (viewer.role !== "teacher") return new Set<string>();

  const membershipClassIds = new Set(
    (database.school_memberships ?? [])
      .filter((membership) => (
        membership.user_id === viewer.id &&
        membership.class_id &&
        (membership.role === "teacher" || membership.role === "admin")
      ))
      .map((membership) => membership.class_id as string)
  );
  const visibleClassIds = new Set(
    (database.teacher_classes ?? [])
      .filter((teacherClass) => teacherClass.teacher_id === viewer.id || membershipClassIds.has(teacherClass.id))
      .map((teacherClass) => teacherClass.id)
  );
  return new Set(
    (database.class_enrollments ?? [])
      .filter((enrollment) => visibleClassIds.has(enrollment.class_id))
      .map((enrollment) => enrollment.student_id)
  );
}

function canViewerSeeStudent(visibleStudentIds: "all" | Set<string>, studentId: string) {
  return visibleStudentIds === "all" || visibleStudentIds.has(studentId);
}

function emptyCounts(): ContentSafetyAlertCounts {
  return { new: 0, acknowledged: 0, resolved: 0, total: 0, open: 0 };
}

function countFlags(records: ContentSafetyFlagRecord[]): ContentSafetyAlertCounts {
  const counts = emptyCounts();
  for (const record of records) {
    counts.total += 1;
    counts[record.status] += 1;
  }
  counts.open = counts.new + counts.acknowledged;
  return counts;
}

function sortByUrgency(records: ContentSafetyFlagRecord[]) {
  // New before acknowledged before resolved; within a status, most severe first,
  // then newest first — so the flag a teacher must act on sits at the top.
  const statusRank: Record<ContentSafetyFlagStatus, number> = { new: 0, acknowledged: 1, resolved: 2 };
  return [...records].sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) return statusRank[a.status] - statusRank[b.status];
    if (severityRank[b.severity] !== severityRank[a.severity]) return severityRank[b.severity] - severityRank[a.severity];
    return b.created_at.localeCompare(a.created_at);
  });
}

export function createContentSafetyPersistenceStore({
  createId = () => crypto.randomUUID(),
  mutateDatabase,
  now: currentTime = () => new Date(),
  readDatabase
}: ContentSafetyPersistenceStoreDependencies) {
  return {
    async recordContentSafetyFlag(input: {
      studentId: string;
      studentName?: string;
      category: ContentSafetyCategory;
      severity: ContentSafetySeverity;
      source: ContentSafetySource;
      excerpt: string;
      matchedTerms?: string[];
      page?: string;
      topicId?: string;
      lessonSlug?: string;
      language?: string;
      blockedReply?: boolean;
    }): Promise<ContentSafetyFlag> {
      const nowIso = currentTime().toISOString();
      let saved: ContentSafetyFlagRecord | null = null;
      await mutateDatabase((database) => {
        if (!Array.isArray(database.content_safety_flags)) database.content_safety_flags = [];
        const studentName = input.studentName
          || displayNameForUser(database.users.find((user) => user.id === input.studentId), "Student");
        const record = normalizeContentSafetyFlagRecord({
          id: `content-safety-${createId()}`,
          student_id: input.studentId,
          student_name: studentName,
          category: input.category,
          severity: input.severity,
          source: input.source,
          status: "new",
          excerpt: input.excerpt,
          matched_terms: input.matchedTerms ?? [],
          page: input.page ?? null,
          topic_id: input.topicId ?? null,
          lesson_slug: input.lessonSlug ?? null,
          language: input.language ?? "en",
          blocked_reply: input.blockedReply === true,
          created_at: nowIso
        }, nowIso, createId);
        if (!record) return;
        saved = record;
        database.content_safety_flags.push(record);
        if (database.content_safety_flags.length > maxStoredFlags) {
          database.content_safety_flags = database.content_safety_flags.slice(-maxStoredFlags);
        }
      });

      if (!saved) throw new Error("Failed to record content-safety flag.");
      return contentSafetyFlagToPublic(saved);
    },

    async listContentSafetyAlertsForViewer(
      viewerId: string,
      options: { status?: ContentSafetyFlagStatus; limit?: number; studentId?: string } = {}
    ): Promise<ContentSafetyAlertsData> {
      const database = await readDatabase();
      const generatedAt = currentTime().toISOString();
      const viewer = database.users.find((user) => user.id === viewerId);
      if (!viewer || (viewer.role !== "teacher" && viewer.role !== "admin")) {
        return { generatedAt, flags: [], counts: emptyCounts() };
      }

      const visibleStudentIds = studentIdsVisibleToViewer(database, viewer);
      const limit = Math.min(500, Math.max(1, Math.round(options.limit ?? 200)));
      const visibleRecords = (database.content_safety_flags ?? []).filter((record) => (
        canViewerSeeStudent(visibleStudentIds, record.student_id) &&
        (!options.studentId || record.student_id === options.studentId)
      ));

      // Counts reflect everything the viewer can see (so a badge/summary is
      // stable); the returned flag list respects the optional status filter.
      const counts = countFlags(visibleRecords);
      const filtered = options.status
        ? visibleRecords.filter((record) => record.status === options.status)
        : visibleRecords;
      const flags = sortByUrgency(filtered).slice(0, limit).map(contentSafetyFlagToPublic);

      return { generatedAt, flags, counts };
    },

    async countOpenContentSafetyAlertsForViewer(viewerId: string): Promise<number> {
      const database = await readDatabase();
      const viewer = database.users.find((user) => user.id === viewerId);
      if (!viewer || (viewer.role !== "teacher" && viewer.role !== "admin")) return 0;

      const visibleStudentIds = studentIdsVisibleToViewer(database, viewer);
      return (database.content_safety_flags ?? []).filter((record) => (
        record.status !== "resolved" &&
        canViewerSeeStudent(visibleStudentIds, record.student_id)
      )).length;
    },

    async updateContentSafetyFlagStatus(input: {
      flagId: string;
      actorId: string;
      status: Extract<ContentSafetyFlagStatus, "acknowledged" | "resolved">;
      note?: string;
    }): Promise<{ ok: true; flag: ContentSafetyFlag } | { ok: false; reason: "not-found" | "forbidden" }> {
      const nowIso = currentTime().toISOString();
      let result: { ok: true; flag: ContentSafetyFlag } | { ok: false; reason: "not-found" | "forbidden" } = {
        ok: false,
        reason: "not-found"
      };

      await mutateDatabase((database) => {
        if (!Array.isArray(database.content_safety_flags)) database.content_safety_flags = [];
        const actor = database.users.find((user) => user.id === input.actorId);
        const record = database.content_safety_flags.find((candidate) => candidate.id === input.flagId);
        if (!record) {
          result = { ok: false, reason: "not-found" };
          return;
        }
        if (!actor || (actor.role !== "teacher" && actor.role !== "admin")) {
          result = { ok: false, reason: "forbidden" };
          return;
        }
        const visibleStudentIds = studentIdsVisibleToViewer(database, actor);
        if (!canViewerSeeStudent(visibleStudentIds, record.student_id)) {
          result = { ok: false, reason: "forbidden" };
          return;
        }

        const actorName = displayNameForUser(actor, "Educator");
        const note = cleanString(input.note, maxResolutionNoteLength) || null;
        if (input.status === "acknowledged") {
          record.status = "acknowledged";
          record.acknowledged_by = actor.id;
          record.acknowledged_by_name = actorName;
          record.acknowledged_at = nowIso;
        } else {
          record.status = "resolved";
          // Resolving implies it was seen; backfill acknowledgement if skipped.
          if (!record.acknowledged_by) {
            record.acknowledged_by = actor.id;
            record.acknowledged_by_name = actorName;
            record.acknowledged_at = nowIso;
          }
          record.resolved_by = actor.id;
          record.resolved_by_name = actorName;
          record.resolved_at = nowIso;
          if (note) record.resolution_note = note;
        }
        result = { ok: true, flag: contentSafetyFlagToPublic(record) };
      });

      return result;
    }
  };
}
