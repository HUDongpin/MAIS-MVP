import assert from "node:assert/strict";
import test from "node:test";
import { backfillPostgresHotAuthTablesForAdmin, buildRedactedAdminStorageSnapshot } from "@/lib/server/userStore";

test("hot auth table backfill is unavailable outside the Postgres provider", async () => {
  const result = await backfillPostgresHotAuthTablesForAdmin("admin-1");

  assert.deepEqual(result, {
    status: "not-postgres",
    provider: "sqlite"
  });
});

test("admin storage snapshot is tenant-scoped and redacts full database secrets", () => {
  const snapshot = buildRedactedAdminStorageSnapshot({
    users: [
      {
        id: "admin-1",
        username: "Primary Admin",
        normalized_username: "primary admin",
        email: "admin@example.test",
        normalized_email: "admin@example.test",
        password_hash: "hash-secret-admin",
        password_salt: "salt-secret-admin",
        school_id: "school-a",
        password_must_change: false,
        role: "admin",
        created_at: "2026-06-12T00:00:00.000Z"
      },
      {
        id: "student-1",
        username: "Sensitive Student",
        normalized_username: "sensitive student",
        email: "student@example.test",
        normalized_email: "student@example.test",
        password_hash: "hash-secret-student",
        password_salt: "salt-secret-student",
        school_id: "school-a",
        password_must_change: true,
        role: "student",
        created_at: "2026-06-12T00:01:00.000Z"
      },
      {
        id: "teacher-2",
        username: "Other Tenant Teacher",
        normalized_username: "other tenant teacher",
        password_hash: "hash-secret-teacher",
        password_salt: "salt-secret-teacher",
        school_id: "school-b",
        role: "teacher",
        created_at: "2026-06-12T00:02:00.000Z"
      }
    ],
    student_profiles: [
      {
        user_id: "student-1",
        name: "Sensitive Student",
        grade: "S3",
        parent_invite_code: "INVITE-SECRET",
        avatar_image_data_url: "data:image/png;base64,SECRETIMAGE"
      }
    ],
    user_settings: [
      {
        user_id: "student-1",
        language: "en",
        theme: "dark",
        selected_grade: "S3",
        updated_at: "2026-06-12T00:03:00.000Z"
      }
    ],
    schools: [
      {
        id: "school-a",
        code: "ALPHA",
        normalized_code: "ALPHA",
        name: "Alpha School",
        academic_year: "2026-2027",
        contact_name: "Private Contact",
        contact_email: "contact@alpha.example",
        created_by: "admin-1",
        created_at: "2026-06-12T00:00:00.000Z",
        updated_at: "2026-06-12T00:00:00.000Z"
      },
      {
        id: "school-b",
        code: "BETA",
        normalized_code: "BETA",
        name: "Beta School",
        academic_year: "2026-2027",
        created_by: "admin-1",
        created_at: "2026-06-12T00:00:00.000Z",
        updated_at: "2026-06-12T00:00:00.000Z"
      }
    ],
    school_memberships: [
      {
        id: "membership-1",
        school_id: "school-a",
        user_id: "student-1",
        role: "student",
        class_id: "class-a",
        created_at: "2026-06-12T00:00:00.000Z"
      }
    ],
    teacher_classes: [
      {
        id: "class-a",
        teacher_id: "admin-1",
        school_id: "school-a",
        class_code: "S3A",
        name: "S3A Mathematics",
        grade: "S3",
        academic_year: "2026-2027",
        description_en: "Private class description",
        description_zh: "Private class description",
        invite_code: "CLASS-INVITE-SECRET",
        created_at: "2026-06-12T00:00:00.000Z",
        updated_at: "2026-06-12T00:00:00.000Z"
      }
    ],
    password_reset_tokens: [
      {
        id: "reset-1",
        user_id: "student-1",
        token_hash: "reset-token-secret",
        expires_at: "2026-06-13T00:00:00.000Z",
        used_at: null,
        created_at: "2026-06-12T00:00:00.000Z"
      }
    ],
    provisioning_row_results: [
      {
        id: "row-1",
        type: "student",
        row_index: 1,
        status: "created",
        action: "create",
        errors: [],
        warnings: [],
        school_id: "school-a",
        user_id: "student-1",
        username: "student@example.test",
        name: "Sensitive Student",
        role: "student",
        temporary_password: "one-time-password-secret"
      }
    ],
    ai_tutor_messages: [
      {
        id: "message-1",
        user_id: "student-1",
        role: "student",
        content: "Raw tutor content",
        context_json: { private: "raw-context-secret" },
        created_at: "2026-06-12T00:00:00.000Z"
      }
    ],
    questions: [
      {
        id: "question-1",
        curriculum_track: "HK",
        grade: "S3",
        topic_id: "topic-1",
        difficulty: "Medium",
        type: "multiple-choice",
        prompt_en: "Private prompt",
        prompt_zh: "Private prompt",
        options: null,
        answer: "answer-secret",
        explanation_en: "Private explanation",
        explanation_zh: "Private explanation"
      }
    ]
  });

  assert.equal(snapshot.kind, "redacted-admin-storage-summary");
  assert.equal(snapshot.minimumPrivilege, true);
  assert.deepEqual(snapshot.dataLayer.hotAuthTables, {
    mode: "postgres-row-hot-path",
    readFlagEnv: "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
    readEnabled: false,
    shadowSyncOnPostgres: true,
    tables: [
      "auth_users",
      "auth_student_profiles",
      "auth_user_settings",
      "auth_password_reset_tokens"
    ]
  });
  assert.equal(snapshot.tableCounts.users, 3);
  assert.equal(snapshot.tableCounts.password_reset_tokens, 1);
  assert.equal(snapshot.database.users.length, 3);
  assert.deepEqual(snapshot.database.users[1], {
    id: "student-1",
    role: "student",
    tenantId: "school:school-a",
    schoolId: "school-a",
    createdAt: "2026-06-12T00:01:00.000Z",
    hasEmail: true,
    hasPasswordCredential: true,
    passwordMustChange: true,
    hasProfile: true,
    hasSettings: true
  });
  assert.deepEqual(snapshot.tenants.map((tenant) => tenant.tenantId), [
    "platform",
    "school:school-a",
    "school:school-b"
  ]);

  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes("password_hash"), false);
  assert.equal(serialized.includes("hash-secret"), false);
  assert.equal(serialized.includes("password_salt"), false);
  assert.equal(serialized.includes("salt-secret"), false);
  assert.equal(serialized.includes("token_hash"), false);
  assert.equal(serialized.includes("reset-token-secret"), false);
  assert.equal(serialized.includes("temporary_password"), false);
  assert.equal(serialized.includes("one-time-password-secret"), false);
  assert.equal(serialized.includes("raw-context-secret"), false);
  assert.equal(serialized.includes("data:image"), false);
  assert.equal(serialized.includes("answer-secret"), false);
  assert.equal(serialized.includes("student@example.test"), false);
  assert.equal(serialized.includes("INVITE-SECRET"), false);
});
