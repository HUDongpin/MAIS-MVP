import type {
  NovaLensAction,
  NovaLensPolicy,
  NovaLensPolicyEvent,
  NovaLensRunStatus,
  NovaLensRunSummary,
  NovaLensSurface,
  StudentSession
} from "@/types";

type UserRole = StudentSession["role"];

export type NovaLensPersistenceRunRecord = {
  id: string;
  user_id: string;
  user_name: string;
  role: UserRole;
  surface: NovaLensSurface;
  action: NovaLensAction;
  status: NovaLensRunStatus;
  selected_text_preview: string;
  selected_text_hash: string;
  page: string;
  topic_id?: string;
  question_id?: string;
  lesson_slug?: string;
  block_id?: string;
  block_type?: string;
  policy_flags: string[];
  allowed_scopes: string[];
  denied_scopes: string[];
  model?: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  latency_ms: number | null;
  created_at: string;
};

export type NovaLensPersistencePolicyRecord = {
  enabled: boolean;
  allowed_roles: UserRole[];
  enabled_surfaces: NovaLensSurface[];
  max_selection_length: number;
  retention_days: number;
  blocked_patterns: string[];
  updated_at: string;
  updated_by?: string;
};

export type NovaLensPersistencePolicyEventRecord = {
  id: string;
  actor_id: string;
  changed_fields: NovaLensPolicyEvent["changedFields"];
  previous_policy: NovaLensPersistencePolicyRecord;
  next_policy: NovaLensPersistencePolicyRecord;
  created_at: string;
};

export type NovaLensPersistenceUserRecord = {
  id: string;
  role: UserRole;
};

type NovaLensVisibilityTeacherClassRecord = {
  id: string;
  teacher_id: string;
  name?: string;
  grade?: string;
};

type NovaLensVisibilityClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type NovaLensVisibilitySchoolMembershipRecord = {
  user_id: string;
  role: string;
  class_id?: string;
};

type NovaLensVisibilityGuardianLinkRecord = {
  parent_id: string;
  student_id: string;
  status: string;
};

export type NovaLensPersistenceDatabase = {
  class_enrollments?: NovaLensVisibilityClassEnrollmentRecord[];
  guardian_links?: NovaLensVisibilityGuardianLinkRecord[];
  nova_lens_policy?: NovaLensPersistencePolicyRecord | null;
  nova_lens_policy_events: NovaLensPersistencePolicyEventRecord[];
  nova_lens_runs: NovaLensPersistenceRunRecord[];
  school_memberships?: NovaLensVisibilitySchoolMembershipRecord[];
  teacher_classes?: NovaLensVisibilityTeacherClassRecord[];
  users: NovaLensPersistenceUserRecord[];
};

export type NovaLensPersistenceStoreDependencies = {
  canViewRun?: (
    database: NovaLensPersistenceDatabase,
    viewer: NovaLensPersistenceUserRecord,
    run: NovaLensPersistenceRunRecord
  ) => boolean;
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<NovaLensPersistenceDatabase>;
  mutateDatabase: <T>(mutator: (database: NovaLensPersistenceDatabase) => T | Promise<T>) => Promise<T>;
};

export type NovaLensPersistenceStore = ReturnType<typeof createNovaLensPersistenceStore>;

const dayMs = 24 * 60 * 60 * 1000;

const novaLensSurfaces: NovaLensSurface[] = [
  "lesson",
  "practice",
  "dashboard",
  "roadmap",
  "visualization",
  "teacher-console",
  "parent-console",
  "admin-console",
  "general"
];
const novaLensActions: NovaLensAction[] = [
  "explain",
  "simple-example",
  "why-step",
  "prerequisite-gap",
  "quick-check",
  "teaching-support",
  "risk-audit",
  "rewrite-follow-up",
  "family-support",
  "custom"
];
const novaLensRunStatuses: NovaLensRunStatus[] = ["completed", "blocked", "provider-fallback", "registration-required", "error"];
const novaLensRoles: UserRole[] = ["student", "teacher", "parent", "admin"];
const novaLensSurfaceSet = new Set<NovaLensSurface>(novaLensSurfaces);
const novaLensActionSet = new Set<NovaLensAction>(novaLensActions);
const novaLensRunStatusSet = new Set<NovaLensRunStatus>(novaLensRunStatuses);
const novaLensRoleSet = new Set<UserRole>(novaLensRoles);
const defaultNovaLensBlockedPatterns = [
  "system prompt",
  "hidden instruction",
  "answer key",
  "api key",
  "authorization",
  "bearer token",
  "session token"
];

export function defaultNovaLensPolicyRecord(now = new Date().toISOString()): NovaLensPersistencePolicyRecord {
  return {
    enabled: true,
    allowed_roles: ["student", "teacher", "parent", "admin"],
    enabled_surfaces: novaLensSurfaces,
    max_selection_length: 500,
    retention_days: 90,
    blocked_patterns: defaultNovaLensBlockedPatterns,
    updated_at: now
  };
}

function normalizeStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.replace(/\s+/g, " ").trim().slice(0, maxLength))
      .filter(Boolean)
  )).slice(0, maxItems);
}

export function normalizeNovaLensPolicyRecord(value: unknown, now = new Date().toISOString()): NovaLensPersistencePolicyRecord {
  const record = typeof value === "object" && value !== null ? value as Partial<NovaLensPersistencePolicyRecord> : {};
  const fallback = defaultNovaLensPolicyRecord(now);
  const allowedRoles = Array.isArray(record.allowed_roles)
    ? Array.from(new Set(record.allowed_roles.filter((role): role is UserRole => novaLensRoleSet.has(role as UserRole))))
    : fallback.allowed_roles;
  const enabledSurfaces = Array.isArray(record.enabled_surfaces)
    ? Array.from(new Set(record.enabled_surfaces.filter((surface): surface is NovaLensSurface => novaLensSurfaceSet.has(surface as NovaLensSurface))))
    : fallback.enabled_surfaces;
  const maxSelectionLength = typeof record.max_selection_length === "number" && Number.isFinite(record.max_selection_length)
    ? Math.min(1800, Math.max(80, Math.round(record.max_selection_length)))
    : fallback.max_selection_length;
  const retentionDays = typeof record.retention_days === "number" && Number.isFinite(record.retention_days)
    ? Math.min(365, Math.max(1, Math.round(record.retention_days)))
    : fallback.retention_days;
  const blockedPatterns = normalizeStringArray(record.blocked_patterns, 24, 120);

  return {
    enabled: record.enabled !== false,
    allowed_roles: allowedRoles,
    enabled_surfaces: enabledSurfaces,
    max_selection_length: maxSelectionLength,
    retention_days: retentionDays,
    blocked_patterns: blockedPatterns.length ? blockedPatterns : fallback.blocked_patterns,
    updated_at: typeof record.updated_at === "string" && record.updated_at ? record.updated_at : now,
    ...(typeof record.updated_by === "string" && record.updated_by ? { updated_by: record.updated_by } : {})
  };
}

const novaLensPolicyEventFieldSet = new Set<NovaLensPolicyEvent["changedFields"][number]>([
  "enabled",
  "allowedRoles",
  "enabledSurfaces",
  "maxSelectionLength",
  "retentionDays",
  "blockedPatterns"
]);

export function normalizeNovaLensPolicyEventRecord(
  value: unknown,
  now = new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID()
): NovaLensPersistencePolicyEventRecord | null {
  const record = typeof value === "object" && value !== null ? value as Partial<NovaLensPersistencePolicyEventRecord> : null;
  if (!record) return null;

  const changedFields = Array.isArray(record.changed_fields)
    ? Array.from(new Set(record.changed_fields.filter((field): field is NovaLensPolicyEvent["changedFields"][number] => (
      novaLensPolicyEventFieldSet.has(field as NovaLensPolicyEvent["changedFields"][number])
    ))))
    : [];

  return {
    id: typeof record.id === "string" && record.id ? record.id : `nova-lens-policy-event-${createId()}`,
    actor_id: typeof record.actor_id === "string" && record.actor_id ? record.actor_id : "unknown",
    changed_fields: changedFields,
    previous_policy: normalizeNovaLensPolicyRecord(record.previous_policy, now),
    next_policy: normalizeNovaLensPolicyRecord(record.next_policy, now),
    created_at: typeof record.created_at === "string" && record.created_at ? record.created_at : now
  };
}

export function normalizeNovaLensPolicyEventRecords(
  records: unknown[] | undefined,
  now = new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID()
): NovaLensPersistencePolicyEventRecord[] {
  return (records ?? [])
    .map((record) => normalizeNovaLensPolicyEventRecord(record, now, createId))
    .filter((record): record is NovaLensPersistencePolicyEventRecord => Boolean(record));
}

export function normalizeNovaLensRunRecord(value: NovaLensPersistenceRunRecord): NovaLensPersistenceRunRecord {
  const createdAt = typeof value.created_at === "string" && value.created_at ? value.created_at : new Date().toISOString();
  return {
    id: typeof value.id === "string" && value.id ? value.id : crypto.randomUUID(),
    user_id: typeof value.user_id === "string" && value.user_id ? value.user_id : "unknown",
    user_name: typeof value.user_name === "string" && value.user_name ? value.user_name : "Unknown user",
    role: novaLensRoleSet.has(value.role as UserRole) ? value.role : "student",
    surface: novaLensSurfaceSet.has(value.surface as NovaLensSurface) ? value.surface : "general",
    action: novaLensActionSet.has(value.action as NovaLensAction) ? value.action : "custom",
    status: novaLensRunStatusSet.has(value.status as NovaLensRunStatus) ? value.status : "error",
    selected_text_preview: typeof value.selected_text_preview === "string" ? value.selected_text_preview.slice(0, 160) : "",
    selected_text_hash: typeof value.selected_text_hash === "string" ? value.selected_text_hash.slice(0, 96) : "",
    page: typeof value.page === "string" && value.page ? value.page.slice(0, 220) : "/",
    ...(typeof value.topic_id === "string" && value.topic_id ? { topic_id: value.topic_id.slice(0, 160) } : {}),
    ...(typeof value.question_id === "string" && value.question_id ? { question_id: value.question_id.slice(0, 160) } : {}),
    ...(typeof value.lesson_slug === "string" && value.lesson_slug ? { lesson_slug: value.lesson_slug.slice(0, 160) } : {}),
    ...(typeof value.block_id === "string" && value.block_id ? { block_id: value.block_id.slice(0, 160) } : {}),
    ...(typeof value.block_type === "string" && value.block_type ? { block_type: value.block_type.slice(0, 80) } : {}),
    policy_flags: normalizeStringArray(value.policy_flags, 12, 80),
    allowed_scopes: normalizeStringArray(value.allowed_scopes, 12, 80),
    denied_scopes: normalizeStringArray(value.denied_scopes, 12, 80),
    ...(typeof value.model === "string" && value.model ? { model: value.model.slice(0, 120) } : {}),
    prompt_tokens: typeof value.prompt_tokens === "number" ? value.prompt_tokens : null,
    completion_tokens: typeof value.completion_tokens === "number" ? value.completion_tokens : null,
    total_tokens: typeof value.total_tokens === "number" ? value.total_tokens : null,
    latency_ms: typeof value.latency_ms === "number" ? value.latency_ms : null,
    created_at: createdAt
  };
}

export function novaLensRunNeedsPersistenceSync(run: Pick<NovaLensPersistenceRunRecord, "status" | "surface">) {
  return !novaLensRunStatusSet.has(run.status) || !novaLensSurfaceSet.has(run.surface);
}

function novaLensPolicyToPublic(record: NovaLensPersistencePolicyRecord): NovaLensPolicy {
  return {
    enabled: record.enabled,
    allowedRoles: record.allowed_roles,
    enabledSurfaces: record.enabled_surfaces,
    maxSelectionLength: record.max_selection_length,
    retentionDays: record.retention_days,
    blockedPatterns: record.blocked_patterns,
    updatedAt: record.updated_at,
    ...(record.updated_by ? { updatedBy: record.updated_by } : {})
  };
}

function novaLensPolicyEventToPublic(record: NovaLensPersistencePolicyEventRecord): NovaLensPolicyEvent {
  return {
    id: record.id,
    actorId: record.actor_id,
    changedFields: record.changed_fields,
    previousPolicy: novaLensPolicyToPublic(record.previous_policy),
    nextPolicy: novaLensPolicyToPublic(record.next_policy),
    createdAt: record.created_at
  };
}

function novaLensPolicyChangedFields(
  previous: NovaLensPersistencePolicyRecord,
  next: NovaLensPersistencePolicyRecord
): NovaLensPolicyEvent["changedFields"] {
  const changedFields: NovaLensPolicyEvent["changedFields"] = [];
  if (previous.enabled !== next.enabled) changedFields.push("enabled");
  if (JSON.stringify(previous.allowed_roles) !== JSON.stringify(next.allowed_roles)) changedFields.push("allowedRoles");
  if (JSON.stringify(previous.enabled_surfaces) !== JSON.stringify(next.enabled_surfaces)) changedFields.push("enabledSurfaces");
  if (previous.max_selection_length !== next.max_selection_length) changedFields.push("maxSelectionLength");
  if (previous.retention_days !== next.retention_days) changedFields.push("retentionDays");
  if (JSON.stringify(previous.blocked_patterns) !== JSON.stringify(next.blocked_patterns)) changedFields.push("blockedPatterns");
  return changedFields;
}

function novaLensRunToSummary(record: NovaLensPersistenceRunRecord): NovaLensRunSummary {
  return {
    id: record.id,
    userId: record.user_id,
    userName: record.user_name,
    role: record.role,
    surface: record.surface,
    action: record.action,
    status: record.status,
    selectedTextPreview: record.selected_text_preview,
    selectedTextHash: record.selected_text_hash,
    page: record.page,
    ...(record.topic_id ? { topicId: record.topic_id } : {}),
    ...(record.question_id ? { questionId: record.question_id } : {}),
    ...(record.lesson_slug ? { lessonSlug: record.lesson_slug } : {}),
    ...(record.block_id ? { blockId: record.block_id } : {}),
    ...(record.block_type ? { blockType: record.block_type } : {}),
    policyFlags: record.policy_flags,
    allowedScopes: record.allowed_scopes,
    deniedScopes: record.denied_scopes,
    ...(record.model ? { model: record.model } : {}),
    promptTokens: record.prompt_tokens,
    completionTokens: record.completion_tokens,
    totalTokens: record.total_tokens,
    latencyMs: record.latency_ms,
    createdAt: record.created_at
  };
}

function defaultCanViewRun(
  _database: NovaLensPersistenceDatabase,
  viewer: NovaLensPersistenceUserRecord,
  run: NovaLensPersistenceRunRecord
) {
  return viewer.role === "admin" || run.user_id === viewer.id;
}

export function canViewNovaLensRun(
  database: NovaLensPersistenceDatabase,
  viewer: NovaLensPersistenceUserRecord,
  run: Pick<NovaLensPersistenceRunRecord, "user_id">
) {
  if (viewer.role === "admin" || run.user_id === viewer.id) return true;
  if (viewer.role === "teacher") {
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
    return (database.class_enrollments ?? []).some(
      (enrollment) => enrollment.student_id === run.user_id && visibleClassIds.has(enrollment.class_id)
    );
  }
  if (viewer.role === "parent") {
    return (database.guardian_links ?? []).some((link) => (
      link.parent_id === viewer.id &&
      link.student_id === run.user_id &&
      link.status === "active"
    ));
  }
  return false;
}

export function createNovaLensPersistenceStore({
  canViewRun = defaultCanViewRun,
  createId = () => crypto.randomUUID(),
  mutateDatabase,
  now: currentTime = () => new Date(),
  readDatabase
}: NovaLensPersistenceStoreDependencies) {
  return {
    async getNovaLensPolicy() {
      const database = await readDatabase();
      return novaLensPolicyToPublic(normalizeNovaLensPolicyRecord(database.nova_lens_policy, currentTime().toISOString()));
    },

    async listNovaLensPolicyEventsForAdmin(options: { limit?: number } = {}) {
      const database = await readDatabase();
      const limit = Math.min(100, Math.max(1, Math.round(options.limit ?? 50)));
      const now = currentTime().toISOString();
      return database.nova_lens_policy_events
        .map((record) => normalizeNovaLensPolicyEventRecord(record, now, createId))
        .filter((record): record is NovaLensPersistencePolicyEventRecord => Boolean(record))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
        .map(novaLensPolicyEventToPublic);
    },

    async updateNovaLensPolicy(userId: string, input: Partial<NovaLensPolicy>) {
      let policy: NovaLensPersistencePolicyRecord = defaultNovaLensPolicyRecord(currentTime().toISOString());
      let event: NovaLensPersistencePolicyEventRecord | null = null;
      await mutateDatabase((database) => {
        const now = currentTime().toISOString();
        const current = normalizeNovaLensPolicyRecord(database.nova_lens_policy, now);
        policy = normalizeNovaLensPolicyRecord({
          enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled,
          allowed_roles: Array.isArray(input.allowedRoles) ? input.allowedRoles : current.allowed_roles,
          enabled_surfaces: Array.isArray(input.enabledSurfaces) ? input.enabledSurfaces : current.enabled_surfaces,
          max_selection_length: typeof input.maxSelectionLength === "number" ? input.maxSelectionLength : current.max_selection_length,
          retention_days: typeof input.retentionDays === "number" ? input.retentionDays : current.retention_days,
          blocked_patterns: Array.isArray(input.blockedPatterns) ? input.blockedPatterns : current.blocked_patterns,
          updated_at: now,
          updated_by: userId
        }, now);
        const changedFields = novaLensPolicyChangedFields(current, policy);
        if (changedFields.length > 0) {
          event = {
            id: `nova-lens-policy-event-${createId()}`,
            actor_id: userId,
            changed_fields: changedFields,
            previous_policy: current,
            next_policy: policy,
            created_at: policy.updated_at
          };
          database.nova_lens_policy_events.push(event);
        }
        database.nova_lens_policy = policy;
      });
      return {
        policy: novaLensPolicyToPublic(policy),
        ...(event ? { event: novaLensPolicyEventToPublic(event) } : {})
      };
    },

    async recordNovaLensRun(input: Omit<NovaLensPersistenceRunRecord, "id" | "created_at"> & { id?: string; created_at?: string }) {
      let saved: NovaLensPersistenceRunRecord | null = null;
      await mutateDatabase((database) => {
        const policy = normalizeNovaLensPolicyRecord(database.nova_lens_policy, currentTime().toISOString());
        const cutoffMs = currentTime().getTime() - policy.retention_days * dayMs;
        database.nova_lens_runs = database.nova_lens_runs.filter((run) => {
          const createdMs = Date.parse(run.created_at);
          return Number.isFinite(createdMs) && createdMs >= cutoffMs;
        });
        saved = normalizeNovaLensRunRecord({
          ...input,
          id: input.id ?? createId(),
          created_at: input.created_at ?? currentTime().toISOString()
        } as NovaLensPersistenceRunRecord);
        database.nova_lens_runs.push(saved);
      });

      return novaLensRunToSummary(saved ?? normalizeNovaLensRunRecord(input as NovaLensPersistenceRunRecord));
    },

    async listNovaLensRunsForUser(
      viewerId: string,
      options: { limit?: number; surface?: NovaLensSurface } = {}
    ) {
      const database = await readDatabase();
      const viewer = database.users.find((user) => user.id === viewerId);
      const limit = Math.min(200, Math.max(1, Math.round(options.limit ?? 50)));
      const policy = novaLensPolicyToPublic(normalizeNovaLensPolicyRecord(database.nova_lens_policy, currentTime().toISOString()));
      if (!viewer) return { policy, runs: [] as NovaLensRunSummary[] };

      const retentionCutoffMs = currentTime().getTime() - policy.retentionDays * dayMs;
      const runs = database.nova_lens_runs
        .filter((run) => {
          const createdMs = Date.parse(run.created_at);
          return Number.isFinite(createdMs) && createdMs >= retentionCutoffMs;
        })
        .filter((run) => (!options.surface || run.surface === options.surface) && canViewRun(database, viewer, run))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
        .map(novaLensRunToSummary);

      return { policy, runs };
    }
  };
}
