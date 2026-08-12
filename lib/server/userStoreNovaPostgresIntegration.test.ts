import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import postgres from "postgres";

const integrationUrl = process.env.MAIS_POSTGRES_INTEGRATION_URL?.trim();
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workerPath = path.join(repositoryRoot, "scripts/nova-postgres-integration-worker.ts");
const tsxPath = path.join(repositoryRoot, "node_modules/.bin/tsx");
const resultPrefix = "NOVA_POSTGRES_INTEGRATION_RESULT=";
const workerTimeoutMs = 120_000;
// These are the reviewed production release budgets: auth has an explicit
// production override, while policy and rate retain their route defaults.
const admissionDeadlinesMs = {
  auth: 3_500,
  policy: 1_500,
  rate: 2_000
} as const;

type WorkerOutcome = {
  exitCode: number;
  result: Record<string, unknown>;
};

type StateRow = {
  payload: unknown;
  revision: string;
};

function assertIntegrationDatabaseBoundary(configuredUrl: string) {
  const parsedUrl = new URL(configuredUrl);
  assert.ok(
    ["postgres:", "postgresql:"].includes(parsedUrl.protocol),
    "Nova PostgreSQL integration tests require a PostgreSQL URL"
  );
  assert.ok(
    ["127.0.0.1", "localhost"].includes(parsedUrl.hostname),
    "Nova PostgreSQL integration tests refuse non-local databases"
  );
  assert.ok(
    ["5432", "55432"].includes(parsedUrl.port || "5432"),
    "Nova PostgreSQL integration tests refuse unexpected local ports"
  );
  assert.equal(parsedUrl.pathname, "/mais_nova_ci", "unexpected integration database name");
  assert.equal(parsedUrl.search, "", "integration database URL must not contain query parameters");
  assert.equal(parsedUrl.hash, "", "integration database URL must not contain a fragment");
}

function afterIntegrationDatabaseBoundary<T>(configuredUrl: string, action: () => T): T {
  assertIntegrationDatabaseBoundary(configuredUrl);
  return action();
}

function redactWorkerOutput(value: string) {
  return value.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgres://[redacted]");
}

async function runWorker(command: string, input: unknown = {}): Promise<WorkerOutcome> {
  if (!integrationUrl) throw new Error("MAIS_POSTGRES_INTEGRATION_URL is unavailable.");
  return new Promise((resolve, reject) => {
    const child = spawn(tsxPath, ["--tsconfig", "tsconfig.json", workerPath, command], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        AI_TUTOR_AUTH_ADMISSION_DEADLINE_MS: String(admissionDeadlinesMs.auth),
        AI_TUTOR_CLASSROOM_POLICY_ADMISSION_DEADLINE_MS: String(admissionDeadlinesMs.policy),
        AI_TUTOR_ADMISSION_STATEMENT_TIMEOUT_MS: "1500",
        AI_TUTOR_QUOTA_LOOKUP_TIMEOUT_MS: "1000",
        AI_TUTOR_RATE_LIMIT_ADMISSION_DEADLINE_MS: String(admissionDeadlinesMs.rate),
        HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        NODE_ENV: "test",
        POSTGRES_MAX_CONNECTIONS: "2",
        POSTGRES_URL: integrationUrl
      },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Nova PostgreSQL integration worker timed out for ${command}.`));
    }, workerTimeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      const resultLine = stdout
        .split(/\r?\n/u)
        .findLast((line) => line.startsWith(resultPrefix));
      if (!resultLine) {
        reject(new Error(
          `Nova PostgreSQL integration worker emitted no result for ${command}: ${redactWorkerOutput(stderr)}`
        ));
        return;
      }
      try {
        resolve({
          exitCode: exitCode ?? -1,
          result: JSON.parse(resultLine.slice(resultPrefix.length)) as Record<string, unknown>
        });
      } catch (error) {
        reject(new Error(
          `Nova PostgreSQL integration worker emitted invalid JSON for ${command}: ${String(error)}`
        ));
      }
    });
    child.stdin.end(JSON.stringify(input));
  });
}

async function runSuccessfulWorker(command: string, input: unknown = {}) {
  const outcome = await runWorker(command, input);
  assert.equal(outcome.exitCode, 0, `${command} failed: ${String(outcome.result.error ?? "unknown error")}`);
  return outcome.result;
}

async function resetPublicSchema(sql: postgres.Sql) {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await sql.unsafe("CREATE SCHEMA public");
}

async function readState(sql: postgres.Sql) {
  const rows = await sql<StateRow[]>`
    SELECT payload, revision::text AS revision
    FROM app_state
    WHERE id = 'primary'
  `;
  assert.equal(rows.length, 1, "expected one primary app_state row");
  const row = rows[0];
  const payload = typeof row.payload === "string" ? JSON.parse(row.payload) as unknown : row.payload;
  assert.ok(payload && typeof payload === "object" && !Array.isArray(payload));
  return { ...row, payload: payload as Record<string, unknown> };
}

function arrayFromPayload(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  assert.ok(Array.isArray(value), `${key} must remain a JSON array`);
  return value as Array<Record<string, unknown>>;
}

test("Nova PostgreSQL harness rejects destructive targets before creating a client", () => {
  const rejectedUrls = [
    "postgres://postgres:postgres@db.example.com:5432/mais_nova_ci",
    "postgres://postgres:postgres@127.0.0.1:5432/production",
    "postgres://postgres:postgres@127.0.0.1:6432/mais_nova_ci",
    "https://127.0.0.1:5432/mais_nova_ci",
    "postgres://postgres:postgres@127.0.0.1:5432/mais_nova_ci?sslmode=require"
  ];

  for (const rejectedUrl of rejectedUrls) {
    let clientCreated = false;
    assert.throws(() => afterIntegrationDatabaseBoundary(rejectedUrl, () => {
      clientCreated = true;
    }));
    assert.equal(clientCreated, false, `client creation must remain blocked for ${rejectedUrl}`);
  }

  let clientCreated = false;
  afterIntegrationDatabaseBoundary(
    "postgres://postgres:postgres@127.0.0.1:55432/mais_nova_ci",
    () => {
      clientCreated = true;
    }
  );
  assert.equal(clientCreated, true);
});

test(
  "Nova PostgreSQL v3 migration, rollback compatibility, and admission projections are executable",
  { skip: integrationUrl ? false : "MAIS_POSTGRES_INTEGRATION_URL is not configured" },
  async (t) => {
    assert.ok(integrationUrl);
    const sql = afterIntegrationDatabaseBoundary(integrationUrl, () => postgres(integrationUrl, {
      connect_timeout: 5,
      idle_timeout: 5,
      max: 4,
      onnotice: () => undefined,
      prepare: false
    }));

    try {
      await resetPublicSchema(sql);

      await t.test("fresh PostgreSQL 16 bootstrap creates the attested v3 schema", async () => {
        const readiness = await runSuccessfulWorker("readiness");
        assert.equal(readiness.provider, "postgres");
        assert.equal(readiness.schemaReady, true);

        const rows = await sql<Array<{
          compatibility_function_ready: boolean;
          compatibility_trigger_ready: boolean;
          message_journal_ready: boolean;
          policy_projection_ready: boolean;
          schema_ready: boolean;
          usage_journal_ready: boolean;
        }>>`
          SELECT
            EXISTS (SELECT 1 FROM auth_schema_migrations WHERE version = 3) AS schema_ready,
            to_regclass('public.projection_class_ai_tutor_policies') IS NOT NULL
              AS policy_projection_ready,
            to_regclass('public.ai_tutor_message_journal') IS NOT NULL AS message_journal_ready,
            to_regclass('public.ai_tutor_usage_journal') IS NOT NULL AS usage_journal_ready,
            EXISTS (
              SELECT 1 FROM pg_proc WHERE proname = 'sync_ai_tutor_compatibility_from_state'
            ) AS compatibility_function_ready,
            EXISTS (
              SELECT 1 FROM pg_trigger
              WHERE tgname = 'app_state_ai_tutor_compatibility'
                AND NOT tgisinternal
                AND tgenabled = 'O'
            ) AS compatibility_trigger_ready
        `;
        assert.deepEqual(rows[0], {
          compatibility_function_ready: true,
          compatibility_trigger_ready: true,
          message_journal_ready: true,
          policy_projection_ready: true,
          schema_ready: true,
          usage_journal_ready: true
        });
        const versionRows = await sql<Array<{ server_version_num: number }>>`
          SELECT current_setting('server_version_num')::int AS server_version_num
        `;
        assert.ok(
          versionRows[0]?.server_version_num >= 160_000
            && versionRows[0].server_version_num < 170_000,
          "the executable SQL gate must stay pinned to PostgreSQL 16"
        );
        const activeRows = await sql<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS count
          FROM pg_stat_activity
          WHERE datname = 'mais_nova_ci'
            AND pid <> pg_backend_pid()
        `;
        assert.equal(activeRows[0]?.count, 0, "worker must close every postgres.js client before exit");
      });

      let studentId = "";
      const restrictedClassId = "000-integration-fallback-class";
      await t.test("two concurrent v2-to-v3 bootstraps reconcile classroom projections before readiness", async () => {
        const state = await readState(sql);
        const payload = structuredClone(state.payload);
        const users = arrayFromPayload(payload, "users");
        const student = users.find((candidate) => candidate.role === "student");
        if (!student || typeof student.id !== "string") {
          throw new Error("Initial state must include a student seed.");
        }
        studentId = student.id as string;

        payload.teacher_classes = [
          ...arrayFromPayload(payload, "teacher_classes").filter((record) => record.id !== restrictedClassId),
          {
            id: restrictedClassId,
            teacher_id: "integration-teacher",
            name: "Integration fallback class",
            grade: "P1",
            academic_year: "2026-2027",
            description_en: "Integration only",
            description_zh: "Integration only",
            invite_code: "INTTEST1",
            created_at: "2026-08-12T00:00:00.000Z",
            updated_at: "2026-08-12T00:00:00.000Z"
          }
        ];
        payload.class_enrollments = [
          ...arrayFromPayload(payload, "class_enrollments").filter((record) => (
            record.id !== "integration-fallback-enrollment"
          )),
          {
            id: "integration-fallback-enrollment",
            class_id: restrictedClassId,
            student_id: studentId,
            joined_at: "2026-08-12T00:00:00.000Z"
          }
        ];
        payload.class_ai_tutor_policies = [
          ...arrayFromPayload(payload, "class_ai_tutor_policies").filter((record) => (
            record.class_id !== restrictedClassId
          )),
          {
            class_id: restrictedClassId,
            mode: "fallback-only",
            previous_live_mode: "limited",
            per_student_minute_limit: 1,
            per_student_hour_limit: 5,
            fallback_on_failure: true,
            updated_by: "integration-teacher",
            updated_at: "2026-08-12T00:00:00.000Z"
          }
        ];
        payload.ai_tutor_messages = [
          ...arrayFromPayload(payload, "ai_tutor_messages"),
          {
            id: "integration-v2-backfill-message",
            user_id: studentId,
            role: "student",
            content: "Legacy v2 message backfill",
            context_json: null,
            created_at: "2026-08-12T00:10:00.000Z"
          }
        ];
        payload.ai_tutor_usage = [
          ...arrayFromPayload(payload, "ai_tutor_usage"),
          {
            id: "integration-v2-backfill-usage",
            user_id: studentId,
            model: "qwen3.8-max",
            prompt_tokens: 4,
            completion_tokens: 5,
            total_tokens: 9,
            error: null,
            created_at: "2026-08-12T00:10:01.000Z"
          }
        ];

        await sql`DROP TRIGGER IF EXISTS app_state_ai_tutor_compatibility ON app_state`;
        await sql`DROP FUNCTION IF EXISTS sync_ai_tutor_compatibility_from_state()`;
        await sql`
          UPDATE app_state
          SET payload = to_jsonb(${JSON.stringify(payload)}::text),
              revision = revision + 1,
              updated_at = NOW()
          WHERE id = 'primary'
        `;
        assert.equal(
          (await sql<Array<{ payload_type: string }>>`
            SELECT jsonb_typeof(payload) AS payload_type FROM app_state WHERE id = 'primary'
          `)[0]?.payload_type,
          "string",
          "the upgrade fixture must execute the legacy JSONB scalar-string repair path"
        );
        await sql`DELETE FROM projection_class_ai_tutor_policies`;
        await sql`DELETE FROM projection_class_enrollments`;
        await sql`DELETE FROM projection_teacher_classes`;
        await sql`
          INSERT INTO auth_users (
            id,
            username,
            normalized_username,
            email,
            normalized_email,
            password_hash,
            password_salt,
            school_id,
            password_must_change,
            role,
            created_at
          ) VALUES (
            ${studentId},
            ${String(student.username ?? "integration-student")},
            ${String(student.normalized_username ?? "integration-student")},
            ${typeof student.email === "string" ? student.email : null},
            ${typeof student.normalized_email === "string" ? student.normalized_email : null},
            ${String(student.password_hash ?? "integration-hash")},
            ${String(student.password_salt ?? "integration-salt")},
            ${typeof student.school_id === "string" ? student.school_id : null},
            ${student.password_must_change === true},
            'student',
            ${String(student.created_at ?? "2026-08-12T00:00:00.000Z")}
          )
          ON CONFLICT (id) DO UPDATE SET role = excluded.role
        `;
        await sql`
          INSERT INTO auth_student_profiles (
            user_id,
            name,
            grade,
            curriculum_track,
            curriculum_region,
            textbook_publisher,
            parent_invite_code,
            avatar_id,
            avatar_image_data_url,
            avatar_media_object_key
          ) VALUES (
            ${studentId},
            ${String(student.name ?? student.username ?? "Integration Student")},
            ${String(student.grade ?? "P1")},
            ${typeof student.curriculum_track === "string" ? student.curriculum_track : "HK"},
            ${typeof student.curriculum_region === "string" ? student.curriculum_region : "HK"},
            ${typeof student.textbook_publisher === "string"
              ? student.textbook_publisher
              : "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"},
            ${typeof student.parent_invite_code === "string" ? student.parent_invite_code : null},
            ${typeof student.avatar_id === "string" ? student.avatar_id : null},
            ${typeof student.avatar_image_data_url === "string" ? student.avatar_image_data_url : null},
            ${typeof student.avatar_media_object_key === "string" ? student.avatar_media_object_key : null}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            name = excluded.name,
            grade = excluded.grade,
            curriculum_track = excluded.curriculum_track,
            curriculum_region = excluded.curriculum_region,
            textbook_publisher = excluded.textbook_publisher
        `;
        await sql`DELETE FROM auth_schema_migrations WHERE version = 3`;
        await sql`
          INSERT INTO auth_schema_migrations (version, applied_at)
          VALUES (2, NOW())
          ON CONFLICT (version) DO NOTHING
        `;

        const [first, second] = await Promise.all([
          runSuccessfulWorker("readiness"),
          runSuccessfulWorker("readiness")
        ]);
        assert.equal(first.schemaReady, true);
        assert.equal(second.schemaReady, true);
        assert.equal(
          (await sql<Array<{ payload_type: string }>>`
            SELECT jsonb_typeof(payload) AS payload_type FROM app_state WHERE id = 'primary'
          `)[0]?.payload_type,
          "object",
          "v3 migration must persist an object readable by exact-v2 rollback SQL"
        );

        const projectionRows = await sql<Array<{
          class_count: number;
          enrollment_count: number;
          policy_count: number;
          schema_ready: boolean;
        }>>`
          SELECT
            (SELECT COUNT(*)::int FROM projection_teacher_classes WHERE id = ${restrictedClassId})
              AS class_count,
            (SELECT COUNT(*)::int FROM projection_class_enrollments
              WHERE id = 'integration-fallback-enrollment') AS enrollment_count,
            (SELECT COUNT(*)::int FROM projection_class_ai_tutor_policies
              WHERE class_id = ${restrictedClassId}) AS policy_count,
            EXISTS (SELECT 1 FROM auth_schema_migrations WHERE version = 3) AS schema_ready
        `;
        assert.deepEqual(projectionRows[0], {
          class_count: 1,
          enrollment_count: 1,
          policy_count: 1,
          schema_ready: true
        });
        const backfillRows = await sql<Array<{
          message_matches: boolean;
          usage_matches: boolean;
        }>>`
          SELECT
            EXISTS (
              SELECT 1 FROM ai_tutor_message_journal
              WHERE id = 'integration-v2-backfill-message'
                AND user_id = ${studentId}
                AND record->>'content' = 'Legacy v2 message backfill'
            ) AS message_matches,
            EXISTS (
              SELECT 1 FROM ai_tutor_usage_journal
              WHERE id = 'integration-v2-backfill-usage'
                AND user_id = ${studentId}
                AND accounted_tokens = 9
                AND record->>'model' = 'qwen3.8-max'
            ) AS usage_matches
        `;
        assert.deepEqual(backfillRows[0], { message_matches: true, usage_matches: true });
        const admissionStageTimings: Array<Record<string, unknown>> = [];
        for (let attempt = 1; attempt <= 5; attempt += 1) {
          const admission = await runSuccessfulWorker("admission", { userId: studentId });
          assert.equal(admission.policyMode, "fallback-only");
          assert.equal(admission.rateAllowed, true);
          const stageMs = admission.stageMs as Record<string, unknown>;
          for (const [stage, deadlineMs] of Object.entries(admissionDeadlinesMs)) {
            assert.equal(typeof stageMs[stage], "number");
            assert.ok(
              Number(stageMs[stage]) < deadlineMs,
              `cold ${stage} admission attempt ${attempt} must finish inside ${deadlineMs}ms`
            );
          }
          admissionStageTimings.push(stageMs);
        }
        t.diagnostic(`Nova cold admission stage timings: ${JSON.stringify(admissionStageTimings)}`);
      });

      await t.test("journal writers are idempotent narrow dual-writes readable by the v2 snapshot", async () => {
        const message = {
          id: "integration-message-1",
          user_id: studentId,
          role: "student",
          content: "PostgreSQL rollback compatibility probe",
          context_json: null,
          created_at: "2026-08-12T01:00:00.000Z"
        };
        const usage = {
          id: "integration-usage-1",
          user_id: studentId,
          model: "qwen3.8-max",
          prompt_tokens: 5,
          completion_tokens: 7,
          total_tokens: 12,
          error: null,
          created_at: "2026-08-12T01:00:01.000Z"
        };
        const before = await readState(sql);
        assert.deepEqual(await runSuccessfulWorker("write-message", message), { result: true });
        assert.deepEqual(await runSuccessfulWorker("write-usage", usage), { result: true });
        const afterWrite = await readState(sql);
        assert.equal(Number(afterWrite.revision), Number(before.revision) + 2);

        const messageRaw = arrayFromPayload(afterWrite.payload, "ai_tutor_messages")
          .filter((record) => record.id === message.id);
        const usageRaw = arrayFromPayload(afterWrite.payload, "ai_tutor_usage")
          .filter((record) => record.id === usage.id);
        assert.deepEqual(messageRaw, [message]);
        assert.deepEqual(usageRaw, [usage]);

        const journalCounts = await sql<Array<{
          message_count: number;
          usage_count: number;
        }>>`
          SELECT
            (SELECT COUNT(*)::int FROM ai_tutor_message_journal WHERE id = ${message.id})
              AS message_count,
            (SELECT COUNT(*)::int FROM ai_tutor_usage_journal WHERE id = ${usage.id})
              AS usage_count
        `;
        assert.deepEqual(journalCounts[0], { message_count: 1, usage_count: 1 });

        assert.deepEqual(await runSuccessfulWorker("write-message", message), { result: true });
        assert.deepEqual(await runSuccessfulWorker("write-usage", usage), { result: true });
        const afterRetry = await readState(sql);
        assert.equal(afterRetry.revision, afterWrite.revision, "same-id retries must not rewrite app_state");
        assert.equal(
          arrayFromPayload(afterRetry.payload, "ai_tutor_messages")
            .filter((record) => record.id === message.id).length,
          1
        );
        assert.equal(
          arrayFromPayload(afterRetry.payload, "ai_tutor_usage")
            .filter((record) => record.id === usage.id).length,
          1
        );

        const collision = await runWorker("write-message", { ...message, content: "conflicting content" });
        assert.equal(collision.exitCode, 1);
        assert.match(String(collision.result.error), /conflicting/i);
        const afterCollision = await readState(sql);
        assert.equal(afterCollision.revision, afterRetry.revision);
        assert.deepEqual(
          arrayFromPayload(afterCollision.payload, "ai_tutor_messages")
            .filter((record) => record.id === message.id),
          [message]
        );

        const concurrentMessages = [
          {
            ...message,
            content: "Concurrent writer A",
            created_at: "2026-08-12T01:10:00.000Z",
            id: "integration-concurrent-message-a"
          },
          {
            ...message,
            content: "Concurrent writer B",
            created_at: "2026-08-12T01:10:01.000Z",
            id: "integration-concurrent-message-b"
          }
        ];
        const beforeConcurrent = await readState(sql);
        await Promise.all(concurrentMessages.map((record) => (
          runSuccessfulWorker("write-message", record)
        )));
        const afterConcurrent = await readState(sql);
        assert.equal(Number(afterConcurrent.revision), Number(beforeConcurrent.revision) + 2);
        for (const record of concurrentMessages) {
          assert.deepEqual(
            arrayFromPayload(afterConcurrent.payload, "ai_tutor_messages")
              .filter((candidate) => candidate.id === record.id),
            [record]
          );
        }
      });

      await t.test("the persistent compatibility trigger preserves v2 rollback and v3 roll-forward visibility", async () => {
        const rollbackMessage = {
          id: "integration-v2-message",
          user_id: studentId,
          role: "tutor",
          content: "Written by simulated v2 rollback",
          context_json: null,
          created_at: "2026-08-12T02:00:00.000Z"
        };
        const rollbackUsage = {
          id: "integration-v2-usage",
          user_id: studentId,
          model: "qwen3.8-max",
          prompt_tokens: 3,
          completion_tokens: 5,
          total_tokens: 8,
          error: null,
          created_at: "2026-08-12T02:00:01.000Z"
        };
        const policyXminBefore = await sql<Array<{ xmin: string }>>`
          SELECT xmin::text AS xmin
          FROM projection_class_ai_tutor_policies
          WHERE class_id = ${restrictedClassId}
        `;
        assert.equal(policyXminBefore.length, 1);

        const beforeRollbackWrite = await readState(sql);
        const rollbackPayload = structuredClone(beforeRollbackWrite.payload);
        rollbackPayload.ai_tutor_messages = [
          ...arrayFromPayload(rollbackPayload, "ai_tutor_messages"),
          rollbackMessage
        ];
        rollbackPayload.ai_tutor_usage = [
          ...arrayFromPayload(rollbackPayload, "ai_tutor_usage"),
          rollbackUsage
        ];
        await sql`
          UPDATE app_state
          SET payload = ${JSON.stringify(rollbackPayload)}::jsonb,
              revision = revision + 1,
              updated_at = NOW()
          WHERE id = 'primary'
        `;

        const journalRows = await sql<Array<{
          message_count: number;
          projected_message_count: number;
          usage_count: number;
        }>>`
          SELECT
            (SELECT COUNT(*)::int FROM ai_tutor_message_journal WHERE id = ${rollbackMessage.id})
              AS message_count,
            (SELECT COUNT(*)::int FROM projection_ai_tutor_messages
              WHERE id = ${rollbackMessage.id}
                AND user_id = ${rollbackMessage.user_id}
                AND created_at = ${rollbackMessage.created_at}
                AND record->>'content' = ${rollbackMessage.content}) AS projected_message_count,
            (SELECT COUNT(*)::int FROM ai_tutor_usage_journal WHERE id = ${rollbackUsage.id})
              AS usage_count
        `;
        assert.deepEqual(journalRows[0], {
          message_count: 1,
          projected_message_count: 1,
          usage_count: 1
        });

        const policyXminAfter = await sql<Array<{ xmin: string }>>`
          SELECT xmin::text AS xmin
          FROM projection_class_ai_tutor_policies
          WHERE class_id = ${restrictedClassId}
        `;
        assert.equal(
          policyXminAfter[0]?.xmin,
          policyXminBefore[0]?.xmin,
          "a tutor-only snapshot append must not rescan or rewrite classroom policy projections"
        );

        const state = await readState(sql);
        const rawMessages = arrayFromPayload(state.payload, "ai_tutor_messages");
        const rawUsage = arrayFromPayload(state.payload, "ai_tutor_usage");
        assert.equal(rawMessages.filter((record) => record.id === rollbackMessage.id).length, 1);
        assert.equal(rawUsage.filter((record) => record.id === rollbackUsage.id).length, 1);
        const v2VisibleTokens = rawUsage
          .filter((record) => (
            record.user_id === studentId
            && typeof record.created_at === "string"
            && record.created_at >= "2026-08-12T00:00:00.000Z"
          ))
          .reduce((total, record) => total + Number(
            record.total_tokens ?? Number(record.prompt_tokens ?? 0) + Number(record.completion_tokens ?? 0)
          ), 0);
        const v2AdmissionRows = await sql<Array<{
          payload_type: string;
          policy_mode: string | null;
          total_tokens: string;
          user_role: string | null;
        }>>`
          WITH authoritative_state AS (
            SELECT payload
            FROM app_state
            WHERE id = 'primary'
            LIMIT 1
          ), student AS (
            SELECT user_record->>'role' AS role
            FROM authoritative_state
            CROSS JOIN LATERAL jsonb_array_elements(
              CASE WHEN jsonb_typeof(payload->'users') = 'array'
                THEN payload->'users' ELSE '[]'::jsonb END
            ) AS user_items(user_record)
            WHERE user_record->>'id' = ${studentId}
            LIMIT 1
          ), enrolled_classes AS (
            SELECT teacher_class_record->>'id' AS class_id
            FROM authoritative_state
            CROSS JOIN LATERAL jsonb_array_elements(
              CASE WHEN jsonb_typeof(payload->'class_enrollments') = 'array'
                THEN payload->'class_enrollments' ELSE '[]'::jsonb END
            ) AS enrollment_items(enrollment_record)
            CROSS JOIN LATERAL jsonb_array_elements(
              CASE WHEN jsonb_typeof(payload->'teacher_classes') = 'array'
                THEN payload->'teacher_classes' ELSE '[]'::jsonb END
            ) AS teacher_class_items(teacher_class_record)
            WHERE enrollment_record->>'student_id' = ${studentId}
              AND teacher_class_record->>'id' = enrollment_record->>'class_id'
          ), resolved_policy AS (
            SELECT policy_record->>'mode' AS mode
            FROM authoritative_state
            CROSS JOIN LATERAL jsonb_array_elements(
              CASE WHEN jsonb_typeof(payload->'class_ai_tutor_policies') = 'array'
                THEN payload->'class_ai_tutor_policies' ELSE '[]'::jsonb END
            ) AS policy_items(policy_record)
            WHERE policy_record->>'class_id' IN (SELECT class_id FROM enrolled_classes)
            ORDER BY policy_record->>'class_id'
            LIMIT 1
          ), v2_usage AS (
            SELECT COALESCE(SUM(
              CASE WHEN jsonb_typeof(usage_record->'total_tokens') = 'number'
                THEN (usage_record->>'total_tokens')::double precision
                ELSE
                  CASE WHEN jsonb_typeof(usage_record->'prompt_tokens') = 'number'
                    THEN (usage_record->>'prompt_tokens')::double precision ELSE 0 END
                  + CASE WHEN jsonb_typeof(usage_record->'completion_tokens') = 'number'
                    THEN (usage_record->>'completion_tokens')::double precision ELSE 0 END
              END
            ), 0)::text AS total_tokens
            FROM authoritative_state
            CROSS JOIN LATERAL jsonb_array_elements(
              CASE WHEN jsonb_typeof(payload->'ai_tutor_usage') = 'array'
                THEN payload->'ai_tutor_usage' ELSE '[]'::jsonb END
            ) AS usage_items(usage_record)
            WHERE usage_record->>'user_id' = ${studentId}
              AND usage_record->>'created_at' >= '2026-08-12T00:00:00.000Z'
          )
          SELECT
            jsonb_typeof(payload) AS payload_type,
            (SELECT mode FROM resolved_policy) AS policy_mode,
            (SELECT total_tokens FROM v2_usage) AS total_tokens,
            (SELECT role FROM student) AS user_role
          FROM authoritative_state
        `;
        assert.deepEqual(v2AdmissionRows[0], {
          payload_type: "object",
          policy_mode: "fallback-only",
          total_tokens: String(v2VisibleTokens),
          user_role: "student"
        }, "simulated v2 policy and quota readers must remain strict after a rollback write");
        const quota = await runSuccessfulWorker("quota", {
          sinceIso: "2026-08-12T00:00:00.000Z",
          userId: studentId
        });
        assert.equal(quota.tokens, v2VisibleTokens);

        const beforeConflict = await readState(sql);
        const conflictPayload = structuredClone(beforeConflict.payload);
        conflictPayload.ai_tutor_messages = [
          ...arrayFromPayload(conflictPayload, "ai_tutor_messages"),
          { ...rollbackMessage, content: "conflict" }
        ];
        const conflictUpdate = sql`
          UPDATE app_state
          SET payload = ${JSON.stringify(conflictPayload)}::jsonb,
              revision = revision + 1
          WHERE id = 'primary'
        `;
        await assert.rejects(conflictUpdate, (error: unknown) => (
          typeof error === "object" && error !== null && "code" in error && error.code === "23505"
        ));
        const afterConflict = await readState(sql);
        assert.equal(
          arrayFromPayload(afterConflict.payload, "ai_tutor_messages")
            .filter((record) => record.id === rollbackMessage.id).length,
          1
        );
      });

      await t.test("invalid v2 classroom source rolls back migration and never writes the v3 marker", async () => {
        const state = await readState(sql);
        const payload = structuredClone(state.payload);
        payload.class_enrollments = [
          ...arrayFromPayload(payload, "class_enrollments"),
          {
            id: "integration-orphan-enrollment",
            class_id: "missing-integration-class",
            student_id: studentId,
            joined_at: "2026-08-12T03:00:00.000Z"
          }
        ];
        payload.class_ai_tutor_policies = arrayFromPayload(payload, "class_ai_tutor_policies")
          .map((record) => record.class_id === restrictedClassId
            ? { ...record, mode: "invalid-fail-open-mode" }
            : record);
        await resetPublicSchema(sql);
        await sql`
          CREATE TABLE app_state (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'platform',
            state_kind TEXT NOT NULL DEFAULT 'app-snapshot',
            schema_version INTEGER NOT NULL,
            revision BIGINT NOT NULL DEFAULT 0,
            payload JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
          )
        `;
        await sql`
          CREATE TABLE auth_schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        await sql`
          INSERT INTO app_state (
            id, tenant_id, state_kind, schema_version, revision, payload, updated_at
          ) VALUES (
            'primary', 'platform', 'app-snapshot', 1, 1,
            ${JSON.stringify(payload)}::jsonb, NOW()
          )
        `;
        await sql`INSERT INTO auth_schema_migrations (version) VALUES (2)`;

        const readiness = await runWorker("readiness");
        assert.equal(readiness.exitCode, 1);
        assert.match(String(readiness.result.error), /classroom source data failed migration validation/i);
        assert.match(String(readiness.result.error), /policy_records_valid/i);
        const markerRows = await sql<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS count FROM auth_schema_migrations WHERE version = 3
        `;
        assert.equal(markerRows[0]?.count, 0);
        const triggerRows = await sql<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS count
          FROM pg_trigger
          WHERE tgname = 'app_state_ai_tutor_compatibility' AND NOT tgisinternal
        `;
        assert.equal(triggerRows[0]?.count, 0, "failed migration DDL must roll back with its marker");
        assert.equal(
          (await sql<Array<{ table_name: string | null }>>`
            SELECT to_regclass('public.ai_tutor_message_journal')::text AS table_name
          `)[0]?.table_name,
          null,
          "failed migration must roll back its v3-only tables"
        );

        payload.class_enrollments = arrayFromPayload(payload, "class_enrollments")
          .filter((record) => record.id !== "integration-orphan-enrollment");
        payload.class_ai_tutor_policies = arrayFromPayload(payload, "class_ai_tutor_policies")
          .map((record) => record.class_id === restrictedClassId
            ? { ...record, mode: "fallback-only" }
            : record);
        await sql`
          UPDATE app_state SET payload = ${JSON.stringify(payload)}::jsonb WHERE id = 'primary'
        `;
        const retry = await runSuccessfulWorker("readiness");
        assert.equal(retry.schemaReady, true, "a corrected fixture must pass on a new readiness attempt");
      });

      const residualConnections = await sql<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM pg_stat_activity
        WHERE datname = 'mais_nova_ci'
          AND pid <> pg_backend_pid()
      `;
      assert.equal(
        residualConnections[0]?.count,
        0,
        "every integration worker must close all postgres.js clients"
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
);
