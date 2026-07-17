import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createNovaLensPersistenceStore,
  type NovaLensPersistenceDatabase
} from "@/lib/server/userStore/novaLensPersistence";

function createTestStore(database: NovaLensPersistenceDatabase, ids: string[]) {
  const generatedIds = [...ids];

  return createNovaLensPersistenceStore({
    canViewRun: (_database, viewer, run) => (
      viewer.role === "admin" ||
      viewer.id === run.user_id ||
      (viewer.id === "teacher-1" && run.user_id === "student-1")
    ),
    createId: () => generatedIds.shift() ?? "fallback-id",
    now: () => new Date("2026-06-20T10:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

test("NovaLens persistence store normalizes policy updates without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/novaLensPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database: NovaLensPersistenceDatabase = {
    nova_lens_policy: null,
    nova_lens_policy_events: [],
    nova_lens_runs: [],
    users: [{ id: "admin-1", role: "admin" }]
  };
  const store = createTestStore(database, ["policy-event-1"]);

  const defaultPolicy = await store.getNovaLensPolicy();
  assert.equal(defaultPolicy.enabled, true);
  assert.deepEqual(defaultPolicy.allowedRoles, ["student", "teacher", "parent", "admin"]);
  assert.equal(defaultPolicy.maxSelectionLength, 500);
  assert.equal(defaultPolicy.retentionDays, 90);

  const result = await store.updateNovaLensPolicy("admin-1", {
    allowedRoles: ["student", "teacher", "teacher"],
    blockedPatterns: [" api key ", "api key", " hidden instruction "],
    enabled: false,
    enabledSurfaces: ["lesson"],
    maxSelectionLength: 2200,
    retentionDays: 0
  });

  assert.equal(result.policy.enabled, false);
  assert.deepEqual(result.policy.allowedRoles, ["student", "teacher"]);
  assert.deepEqual(result.policy.enabledSurfaces, ["lesson"]);
  assert.equal(result.policy.maxSelectionLength, 1800);
  assert.equal(result.policy.retentionDays, 1);
  assert.deepEqual(result.policy.blockedPatterns, ["api key", "hidden instruction"]);
  assert.equal(result.policy.updatedBy, "admin-1");
  assert.equal(result.event?.id, "nova-lens-policy-event-policy-event-1");
  assert.deepEqual(result.event?.changedFields, [
    "enabled",
    "allowedRoles",
    "enabledSurfaces",
    "maxSelectionLength",
    "retentionDays",
    "blockedPatterns"
  ]);
  assert.equal(database.nova_lens_policy_events.length, 1);
});

test("NovaLens persistence owns root policy and run normalization helpers", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/novaLensPersistence.ts"), "utf8");
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/novaLensPersistence") as Record<string, unknown>;

  const defaultPolicy = helpers.defaultNovaLensPolicyRecord;
  const normalizePolicy = helpers.normalizeNovaLensPolicyRecord;
  const normalizePolicyEvent = helpers.normalizeNovaLensPolicyEventRecord;
  const normalizeRun = helpers.normalizeNovaLensRunRecord;
  const runNeedsPersistenceSync = helpers.novaLensRunNeedsPersistenceSync;

  assert.equal(typeof defaultPolicy, "function");
  assert.equal(typeof normalizePolicy, "function");
  assert.equal(typeof normalizePolicyEvent, "function");
  assert.equal(typeof normalizeRun, "function");
  assert.equal(typeof runNeedsPersistenceSync, "function");
  assert.match(persistenceSource, /export function defaultNovaLensPolicyRecord\b/);
  assert.match(persistenceSource, /export function normalizeNovaLensPolicyRecord\b/);
  assert.match(persistenceSource, /export function normalizeNovaLensPolicyEventRecord\b/);
  assert.match(persistenceSource, /export function normalizeNovaLensRunRecord\b/);
  assert.match(persistenceSource, /export function novaLensRunNeedsPersistenceSync\b/);
  assert.doesNotMatch(compatibilitySource, /function defaultNovaLensPolicyRecord\b/);
  assert.doesNotMatch(compatibilitySource, /function normalizeNovaLensPolicyRecord\b/);
  assert.doesNotMatch(compatibilitySource, /function normalizeNovaLensPolicyEventRecord\b/);
  assert.doesNotMatch(compatibilitySource, /function normalizeNovaLensRunRecord\b/);
  assert.match(compatibilitySource, /defaultNovaLensPolicyRecordFromNovaLensPersistence/);
  assert.match(compatibilitySource, /normalizeNovaLensPolicyRecordFromNovaLensPersistence/);
  assert.doesNotMatch(compatibilitySource, /normalizeNovaLensPolicyEventRecordFromNovaLensPersistence/);
  assert.match(compatibilitySource, /normalizeNovaLensRunRecordFromNovaLensPersistence/);
  assert.match(compatibilitySource, /novaLensRunNeedsPersistenceSyncFromNovaLensPersistence/);

  const now = "2026-06-20T10:00:00.000Z";
  const policy = (defaultPolicy as (now: string) => { updated_at: string; retention_days: number })(now);
  assert.equal(policy.updated_at, now);
  assert.equal(policy.retention_days, 90);

  const normalizedPolicy = (normalizePolicy as (value: unknown, now: string) => { allowed_roles: string[]; max_selection_length: number; blocked_patterns: string[] })({
    allowed_roles: ["student", "teacher", "teacher", "ghost"],
    max_selection_length: 40,
    blocked_patterns: [" api key ", "api key", ""]
  }, now);
  assert.deepEqual(normalizedPolicy.allowed_roles, ["student", "teacher"]);
  assert.equal(normalizedPolicy.max_selection_length, 80);
  assert.deepEqual(normalizedPolicy.blocked_patterns, ["api key"]);

  const normalizedEvent = (normalizePolicyEvent as (
    value: unknown,
    now: string,
    createId: () => string
  ) => { id: string; changed_fields: string[] } | null)({
    changed_fields: ["enabled", "unknown"],
    previous_policy: null,
    next_policy: { enabled: false }
  }, now, () => "generated-event");
  assert.equal(normalizedEvent?.id, "nova-lens-policy-event-generated-event");
  assert.deepEqual(normalizedEvent?.changed_fields, ["enabled"]);

  const normalizedRun = (normalizeRun as (value: Record<string, unknown>) => { role: string; surface: string; status: string; selected_text_preview: string })({
    id: "run-1",
    user_id: "",
    user_name: "",
    role: "ghost",
    surface: "unknown",
    action: "unknown",
    status: "unknown",
    selected_text_preview: "A".repeat(200),
    selected_text_hash: "hash",
    page: "",
    policy_flags: ["allowed", "allowed"],
    allowed_scopes: [],
    denied_scopes: [],
    prompt_tokens: null,
    completion_tokens: null,
    total_tokens: null,
    latency_ms: null,
    created_at: now
  });
  assert.equal(normalizedRun.role, "student");
  assert.equal(normalizedRun.surface, "general");
  assert.equal(normalizedRun.status, "error");
  assert.equal(normalizedRun.selected_text_preview.length, 160);

  assert.equal((runNeedsPersistenceSync as (run: Record<string, unknown>) => boolean)(normalizedRun), false);
  assert.equal((runNeedsPersistenceSync as (run: Record<string, unknown>) => boolean)({ ...normalizedRun, status: "unknown" }), true);
});

test("NovaLens persistence owns policy event collection normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/novaLensPersistence.ts"), "utf8");
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/novaLensPersistence") as Record<string, unknown>;
  const normalizePolicyEvents = helpers.normalizeNovaLensPolicyEventRecords;

  assert.equal(typeof normalizePolicyEvents, "function");
  assert.match(persistenceSource, /export function normalizeNovaLensPolicyEventRecords\b/);
  assert.match(compatibilitySource, /normalizeNovaLensPolicyEventRecordsFromNovaLensPersistence/);
  assert.doesNotMatch(compatibilitySource, /nova_lens_policy_events: \(database\.nova_lens_policy_events \?\? \[\]\)/);

  const normalized = (normalizePolicyEvents as (
    records: unknown[] | undefined,
    now: string,
    createId: () => string
  ) => Array<{ id: string; actor_id: string; changed_fields: string[]; created_at: string }>)([
    null,
    {
      actor_id: "",
      changed_fields: ["enabled", "enabled", "unknown"],
      previous_policy: null,
      next_policy: { enabled: false },
      created_at: ""
    },
    {
      id: "policy-event-existing",
      actor_id: "admin-1",
      changed_fields: ["retentionDays"],
      previous_policy: { retention_days: 30 },
      next_policy: { retention_days: 120 },
      created_at: "2026-06-19T09:00:00.000Z"
    }
  ], "2026-06-20T10:00:00.000Z", () => "generated-event");

  assert.deepEqual(normalized.map((event) => event.id), [
    "nova-lens-policy-event-generated-event",
    "policy-event-existing"
  ]);
  assert.equal(normalized[0]?.actor_id, "unknown");
  assert.deepEqual(normalized[0]?.changed_fields, ["enabled"]);
  assert.equal(normalized[0]?.created_at, "2026-06-20T10:00:00.000Z");
  assert.deepEqual((normalizePolicyEvents as (
    records: unknown[] | undefined,
    now: string,
    createId: () => string
  ) => unknown[])(undefined, "2026-06-20T10:00:00.000Z", () => "generated-event"), []);
});

test("NovaLens persistence owns run visibility checks for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/novaLensPersistence.ts"), "utf8");
  const compatibilitySource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/novaLensPersistence") as Record<string, unknown>;

  assert.equal(typeof helpers.canViewNovaLensRun, "function");
  assert.match(persistenceSource, /export function canViewNovaLensRun\b/);
  assert.doesNotMatch(compatibilitySource, /function canViewNovaLensRun\(/);
  assert.match(compatibilitySource, /canViewNovaLensRun as canViewNovaLensRunFromNovaLensPersistence/);

  const canViewNovaLensRun = helpers.canViewNovaLensRun as (
    database: NovaLensPersistenceDatabase,
    viewer: { id: string; role: "student" | "teacher" | "parent" | "admin" },
    run: { user_id: string }
  ) => boolean;
  const database = {
    nova_lens_policy: null,
    nova_lens_policy_events: [],
    nova_lens_runs: [],
    users: [],
    teacher_classes: [
      { id: "class-owned", teacher_id: "teacher-1", name: "S3A", grade: "S3" },
      { id: "class-shared", teacher_id: "teacher-2", name: "S4B", grade: "S4" },
      { id: "class-other", teacher_id: "teacher-2", name: "S5C", grade: "S5" }
    ],
    school_memberships: [
      { user_id: "teacher-1", role: "teacher", class_id: "class-shared" }
    ],
    class_enrollments: [
      { class_id: "class-owned", student_id: "student-1" },
      { class_id: "class-shared", student_id: "student-2" },
      { class_id: "class-other", student_id: "student-3" }
    ],
    guardian_links: [
      { parent_id: "parent-1", student_id: "student-2", status: "active" },
      { parent_id: "parent-1", student_id: "student-3", status: "revoked" }
    ]
  } satisfies NovaLensPersistenceDatabase;

  assert.equal(canViewNovaLensRun(database, { id: "admin-1", role: "admin" }, { user_id: "student-3" }), true);
  assert.equal(canViewNovaLensRun(database, { id: "student-1", role: "student" }, { user_id: "student-1" }), true);
  assert.equal(canViewNovaLensRun(database, { id: "student-1", role: "student" }, { user_id: "student-2" }), false);
  assert.equal(canViewNovaLensRun(database, { id: "teacher-1", role: "teacher" }, { user_id: "student-1" }), true);
  assert.equal(canViewNovaLensRun(database, { id: "teacher-1", role: "teacher" }, { user_id: "student-2" }), true);
  assert.equal(canViewNovaLensRun(database, { id: "teacher-1", role: "teacher" }, { user_id: "student-3" }), false);
  assert.equal(canViewNovaLensRun(database, { id: "parent-1", role: "parent" }, { user_id: "student-2" }), true);
  assert.equal(canViewNovaLensRun(database, { id: "parent-1", role: "parent" }, { user_id: "student-3" }), false);
});

test("NovaLens persistence store records runs with retention and delegated access checks", async () => {
  const database: NovaLensPersistenceDatabase = {
    nova_lens_policy: {
      enabled: true,
      allowed_roles: ["student", "teacher", "parent", "admin"],
      enabled_surfaces: ["lesson", "practice"],
      max_selection_length: 500,
      retention_days: 1,
      blocked_patterns: ["api key"],
      updated_at: "2026-06-20T09:00:00.000Z"
    },
    nova_lens_policy_events: [],
    nova_lens_runs: [
      {
        id: "run-old",
        user_id: "student-1",
        user_name: "Old Student",
        role: "student",
        surface: "lesson",
        action: "explain",
        status: "completed",
        selected_text_preview: "expired",
        selected_text_hash: "hash-old",
        page: "/lesson/old",
        policy_flags: [],
        allowed_scopes: [],
        denied_scopes: [],
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null,
        latency_ms: null,
        created_at: "2026-06-18T10:00:00.000Z"
      }
    ],
    users: [
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" },
      { id: "teacher-1", role: "teacher" }
    ]
  };
  const store = createTestStore(database, ["run-new"]);

  const saved = await store.recordNovaLensRun({
    user_id: "student-1",
    user_name: "Ada Learner",
    role: "student",
    surface: "lesson",
    action: "explain",
    status: "completed",
    selected_text_preview: "A".repeat(200),
    selected_text_hash: "hash-new",
    page: "/lesson/factoring",
    lesson_slug: "factoring",
    policy_flags: ["allowed", "allowed"],
    allowed_scopes: ["student-dashboard"],
    denied_scopes: ["teacher-dashboard"],
    model: "unit-model",
    prompt_tokens: 5,
    completion_tokens: 7,
    total_tokens: 12,
    latency_ms: 123,
    created_at: "2026-06-20T09:30:00.000Z"
  });

  assert.equal(saved.id, "run-new");
  assert.equal(saved.selectedTextPreview.length, 160);
  assert.deepEqual(database.nova_lens_runs.map((run) => run.id), ["run-new"]);

  const studentRuns = await store.listNovaLensRunsForUser("student-1", { limit: 10, surface: "lesson" });
  assert.equal(studentRuns.runs.length, 1);
  assert.equal(studentRuns.runs[0]?.id, "run-new");
  assert.deepEqual(studentRuns.runs[0]?.policyFlags, ["allowed"]);

  const otherStudentRuns = await store.listNovaLensRunsForUser("student-2", { limit: 10 });
  assert.equal(otherStudentRuns.runs.length, 0);

  const teacherRuns = await store.listNovaLensRunsForUser("teacher-1", { limit: 10 });
  assert.equal(teacherRuns.runs[0]?.userId, "student-1");
});
