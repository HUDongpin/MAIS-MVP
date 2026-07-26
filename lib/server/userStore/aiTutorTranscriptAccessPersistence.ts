import type { AITutorTranscriptAccessSummary, StudentSession } from "@/types";

type UserRole = StudentSession["role"];

export type AITutorTranscriptAccessRecord = {
  id: string;
  viewer_id: string;
  viewer_name: string;
  viewer_role: UserRole;
  student_id: string;
  student_name: string;
  message_count: number;
  created_at: string;
};

export type AITutorTranscriptAccessUserRecord = {
  id: string;
  role: UserRole;
};

export type AITutorTranscriptAccessPersistenceDatabase = {
  ai_tutor_transcript_access_events: AITutorTranscriptAccessRecord[];
  users: AITutorTranscriptAccessUserRecord[];
};

export type AITutorTranscriptAccessPersistenceStoreDependencies = {
  canView?: (
    database: AITutorTranscriptAccessPersistenceDatabase,
    viewer: AITutorTranscriptAccessUserRecord,
    record: AITutorTranscriptAccessRecord
  ) => boolean;
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<AITutorTranscriptAccessPersistenceDatabase>;
  mutateDatabase: <T>(
    mutator: (database: AITutorTranscriptAccessPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
};

export type AITutorTranscriptAccessPersistenceStore = ReturnType<
  typeof createAiTutorTranscriptAccessPersistenceStore
>;

const userRoles: UserRole[] = ["student", "teacher", "parent", "admin"];
const dayMs = 24 * 60 * 60 * 1000;
// These records live in the single app_state snapshot that every mutation rewrites
// under a row lock, so an unbounded audit log taxes the whole write path: measured
// at ~279 bytes/record against a ~4.2MB production payload, 5000 rows would be ~32%
// of the snapshot. A projection table would not help -- projections are shadows
// derived from the snapshot, so the payload keeps the rows either way.
// Bound both dimensions instead: age out beyond the retention window (the
// compliance-facing knob, mirroring the Nova Lens retentionDays policy) and keep a
// row cap as an absolute backstop (~12% worst case) so a burst cannot balloon it.
const accessEventRetentionDays = 365;
const maxStoredAccessEvents = 2000;

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}

function cleanText(value: unknown, maxLength: number, fallback = "") {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return cleaned || fallback;
}

function boundedMessageCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100000, Math.round(value)));
}

export function normalizeAiTutorTranscriptAccessRecord(
  value: unknown,
  now = new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID()
): AITutorTranscriptAccessRecord | null {
  const record = typeof value === "object" && value !== null
    ? value as Partial<AITutorTranscriptAccessRecord>
    : null;
  if (!record) return null;

  return {
    id: typeof record.id === "string" && record.id ? record.id : `ai-tutor-transcript-access-${createId()}`,
    viewer_id: cleanText(record.viewer_id, 160, "unknown"),
    viewer_name: cleanText(record.viewer_name, 160, "Unknown teacher"),
    viewer_role: isUserRole(record.viewer_role) ? record.viewer_role : "teacher",
    student_id: cleanText(record.student_id, 160, "unknown"),
    student_name: cleanText(record.student_name, 160, "Unknown student"),
    message_count: boundedMessageCount(record.message_count),
    created_at: typeof record.created_at === "string" && record.created_at ? record.created_at : now
  };
}

export function normalizeAiTutorTranscriptAccessRecords(
  records: unknown,
  now = new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID()
): AITutorTranscriptAccessRecord[] {
  if (!Array.isArray(records)) return [];
  return records
    .map((record) => normalizeAiTutorTranscriptAccessRecord(record, now, createId))
    .filter((record): record is AITutorTranscriptAccessRecord => Boolean(record));
}

function accessRecordToSummary(record: AITutorTranscriptAccessRecord): AITutorTranscriptAccessSummary {
  return {
    id: record.id,
    viewerId: record.viewer_id,
    viewerName: record.viewer_name,
    viewerRole: record.viewer_role,
    studentId: record.student_id,
    studentName: record.student_name,
    messageCount: record.message_count,
    createdAt: record.created_at
  };
}

function defaultCanView(
  _database: AITutorTranscriptAccessPersistenceDatabase,
  viewer: AITutorTranscriptAccessUserRecord,
  record: AITutorTranscriptAccessRecord
) {
  return viewer.role === "admin" || record.viewer_id === viewer.id;
}

export function createAiTutorTranscriptAccessPersistenceStore({
  canView = defaultCanView,
  createId = () => crypto.randomUUID(),
  now = () => new Date(),
  readDatabase,
  mutateDatabase
}: AITutorTranscriptAccessPersistenceStoreDependencies) {
  return {
    async recordAiTutorTranscriptAccess(input: {
      viewerId: string;
      viewerName: string;
      viewerRole: UserRole;
      studentId: string;
      studentName: string;
      messageCount: number;
    }): Promise<AITutorTranscriptAccessSummary> {
      const saved = await mutateDatabase((database) => {
        const record = normalizeAiTutorTranscriptAccessRecord(
          {
            id: `ai-tutor-transcript-access-${createId()}`,
            viewer_id: input.viewerId,
            viewer_name: input.viewerName,
            viewer_role: input.viewerRole,
            student_id: input.studentId,
            student_name: input.studentName,
            message_count: input.messageCount,
            created_at: now().toISOString()
          },
          now().toISOString(),
          createId
        );
        // record is always non-null because we supply a well-formed object.
        const nonNullRecord = record as AITutorTranscriptAccessRecord;
        const retentionCutoffMs = now().getTime() - accessEventRetentionDays * dayMs;
        // Drop anything past the retention window, keeping records whose timestamp we
        // cannot parse rather than silently discarding unreadable audit evidence.
        const retained = database.ai_tutor_transcript_access_events.filter((event) => {
          const createdMs = Date.parse(event.created_at);
          return !Number.isFinite(createdMs) || createdMs >= retentionCutoffMs;
        });
        retained.push(nonNullRecord);
        database.ai_tutor_transcript_access_events = retained.length > maxStoredAccessEvents
          ? retained.slice(-maxStoredAccessEvents)
          : retained;
        return nonNullRecord;
      });

      return accessRecordToSummary(saved);
    },

    async listAiTutorTranscriptAccessForViewer(
      viewerId: string,
      options: { limit?: number } = {}
    ): Promise<AITutorTranscriptAccessSummary[]> {
      const database = await readDatabase();
      const viewer = database.users.find((user) => user.id === viewerId);
      if (!viewer) return [];
      const limit = Math.min(200, Math.max(1, Math.round(options.limit ?? 50)));

      return database.ai_tutor_transcript_access_events
        .filter((record) => canView(database, viewer, record))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
        .map(accessRecordToSummary);
    }
  };
}
