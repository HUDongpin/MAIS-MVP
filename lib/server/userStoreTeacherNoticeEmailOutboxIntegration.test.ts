import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import postgres from "postgres";

import {
  attestTeacherNoticeEmailOutboxPostgresCatalog,
  teacherNoticeEmailOutboxPostgresSchemaStatements
} from "@/lib/server/userStore/teacherNoticeEmailOutboxPersistence";

const postgres16IntegrationUrl = process.env.MAIS_OUTBOX_POSTGRES16_INTEGRATION_URL?.trim();

function sourceSection(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `missing source section start: ${start}`);
  assert.ok(endIndex > startIndex, `missing source section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertPostgres16IntegrationBoundary(configuredUrl: string) {
  const parsedUrl = new URL(configuredUrl);
  assert.ok(["postgres:", "postgresql:"].includes(parsedUrl.protocol));
  assert.ok(["127.0.0.1", "localhost"].includes(parsedUrl.hostname));
  assert.ok(["5432", "55439"].includes(parsedUrl.port));
  assert.equal(parsedUrl.pathname, "/mais_outbox_ci");
  assert.equal(parsedUrl.search, "");
  assert.equal(parsedUrl.hash, "");
}

function productionCatalogProbeFromSource(source: string) {
  const section = sourceSection(
    source,
    "async function hasTeacherNoticeEmailOutboxPostgresSchema(",
    "async function migrateTeacherNoticeEmailOutboxPostgresSchema()"
  );
  const startMarker = "const rows = await sql<Array<{ catalog: unknown }>>`";
  const start = section.indexOf(startMarker);
  assert.ok(start >= 0, "production catalog probe start is missing");
  const queryStart = start + startMarker.length;
  const queryEnd = section.indexOf("`;\n    return attestTeacherNoticeEmailOutboxPostgresCatalog", queryStart);
  assert.ok(queryEnd > queryStart, "production catalog probe end is missing");
  const query = section.slice(queryStart, queryEnd);
  assert.doesNotMatch(query, /\$\{/u, "real-engine test requires the exact non-interpolated production probe");
  return query;
}

test("PostgreSQL 16 gate accepts only its dedicated loopback CI database", () => {
  assert.doesNotThrow(() => assertPostgres16IntegrationBoundary(
    "postgres://postgres:postgres@127.0.0.1:5432/mais_outbox_ci"
  ));
  assert.doesNotThrow(() => assertPostgres16IntegrationBoundary(
    "postgres://postgres:postgres@localhost:55439/mais_outbox_ci"
  ));
  assert.throws(() => assertPostgres16IntegrationBoundary(
    "postgres://postgres:postgres@db.example.com:5432/mais_outbox_ci"
  ));
  assert.throws(() => assertPostgres16IntegrationBoundary(
    "postgres://postgres:postgres@127.0.0.1:5432/production"
  ));
});

async function resetOutboxSchema(sql: postgres.Sql) {
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await sql.unsafe("CREATE SCHEMA public");
  for (const statement of teacherNoticeEmailOutboxPostgresSchemaStatements) {
    await sql.unsafe(statement);
  }
}

async function readMigrationCatalogDigest(sql: postgres.Sql) {
  const rows = await sql<Array<{ digest: string }>>`
    WITH target_relations AS (
      SELECT relation.oid, relation.relname, relation.relkind,
        relation.relpersistence, relation.relrowsecurity, relation.relforcerowsecurity
      FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname IN ('teacher_notice_email_outbox', 'teacher_notice_email_outbox_schema_migrations')
    )
    SELECT pg_catalog.md5(pg_catalog.jsonb_build_object(
      'relations', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'oid', relation.oid,
          'name', relation.relname,
          'kind', relation.relkind,
          'persistence', relation.relpersistence,
          'rowSecurity', relation.relrowsecurity,
          'forceRowSecurity', relation.relforcerowsecurity,
          'comment', pg_catalog.obj_description(relation.oid, 'pg_class')
        ) ORDER BY relation.relname)
        FROM target_relations AS relation
      ), '[]'::pg_catalog.jsonb),
      'columns', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'relation', relation.relname,
          'position', attribute.attnum,
          'name', attribute.attname,
          'type', pg_catalog.format_type(attribute.atttypid, attribute.atttypmod),
          'notNull', attribute.attnotnull,
          'default', pg_catalog.pg_get_expr(attribute_default.adbin, attribute_default.adrelid, false)
        ) ORDER BY relation.relname, attribute.attnum)
        FROM target_relations AS relation
        JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = relation.oid
        LEFT JOIN pg_catalog.pg_attrdef AS attribute_default
          ON attribute_default.adrelid = relation.oid AND attribute_default.adnum = attribute.attnum
        WHERE attribute.attnum > 0 AND NOT attribute.attisdropped
      ), '[]'::pg_catalog.jsonb),
      'constraints', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'relation', relation.relname,
          'name', constraint_record.conname,
          'definition', pg_catalog.pg_get_constraintdef(constraint_record.oid, false)
        ) ORDER BY relation.relname, constraint_record.conname)
        FROM target_relations AS relation
        JOIN pg_catalog.pg_constraint AS constraint_record ON constraint_record.conrelid = relation.oid
      ), '[]'::pg_catalog.jsonb),
      'indexes', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.pg_get_indexdef(index_record.indexrelid, 0, false)
          ORDER BY pg_catalog.pg_get_indexdef(index_record.indexrelid, 0, false))
        FROM target_relations AS relation
        JOIN pg_catalog.pg_index AS index_record ON index_record.indrelid = relation.oid
      ), '[]'::pg_catalog.jsonb),
      'markerRows', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(marker) ORDER BY marker.singleton, marker.version)
        FROM public.teacher_notice_email_outbox_schema_migrations AS marker
      ), '[]'::pg_catalog.jsonb)
    )::pg_catalog.text) AS digest
  `;
  assert.match(rows[0]?.digest ?? "", /^[a-f0-9]{32}$/u);
  return rows[0]!.digest;
}

function withHostileOutboxSearchPath(configuredUrl: string) {
  const url = new URL(configuredUrl);
  url.searchParams.set("options", "-c search_path=hostile_shadow,pg_catalog,public");
  return url.toString();
}

async function installHostileOutboxShadowSchema(sql: postgres.Sql) {
  await sql.unsafe("DROP SCHEMA IF EXISTS hostile_shadow CASCADE");
  await sql.unsafe("CREATE SCHEMA hostile_shadow");
  await sql.unsafe("CREATE UNLOGGED TABLE hostile_shadow.teacher_notice_email_outbox (id pg_catalog.text PRIMARY KEY, sentinel pg_catalog.text NOT NULL)");
  await sql.unsafe("ALTER TABLE hostile_shadow.teacher_notice_email_outbox ENABLE ROW LEVEL SECURITY");
  await sql.unsafe("ALTER TABLE hostile_shadow.teacher_notice_email_outbox FORCE ROW LEVEL SECURITY");
  await sql.unsafe("INSERT INTO hostile_shadow.teacher_notice_email_outbox VALUES ('shadow-outbox', 'untouched')");
  await sql.unsafe("CREATE UNIQUE INDEX teacher_notice_email_outbox_provider_message_uq ON hostile_shadow.teacher_notice_email_outbox (sentinel)");
  await sql.unsafe("CREATE TABLE hostile_shadow.teacher_notice_email_outbox_schema_migrations (singleton pg_catalog.bool PRIMARY KEY, version pg_catalog.int4 NOT NULL, applied_at pg_catalog.timestamptz NOT NULL)");
  await sql.unsafe("INSERT INTO hostile_shadow.teacher_notice_email_outbox_schema_migrations VALUES (TRUE, 999, pg_catalog.clock_timestamp())");
  await sql.unsafe("COMMENT ON TABLE hostile_shadow.teacher_notice_email_outbox_schema_migrations IS 'hostile-shadow-marker'");
  await sql.unsafe("CREATE TABLE hostile_shadow.teacher_notice_email_outbox_deadline_probe (id pg_catalog.text PRIMARY KEY, phase pg_catalog.text NOT NULL)");
  await sql.unsafe("INSERT INTO hostile_shadow.teacher_notice_email_outbox_deadline_probe VALUES ('shadow-probe', 'untouched')");
  await sql.unsafe("CREATE TABLE hostile_shadow.app_state (id pg_catalog.text PRIMARY KEY, payload pg_catalog.jsonb NOT NULL)");
  await sql.unsafe("INSERT INTO hostile_shadow.app_state VALUES ('shadow-state', '{\"sentinel\":true}'::pg_catalog.jsonb)");
  await sql.unsafe("CREATE FUNCTION hostile_shadow.clock_timestamp() RETURNS pg_catalog.timestamptz LANGUAGE sql IMMUTABLE AS 'SELECT ''1900-01-01T00:00:00Z''::pg_catalog.timestamptz'");
}

async function readHostileOutboxShadowDigest(sql: postgres.Sql) {
  const rows = await sql<Array<{ digest: string }>>`
    SELECT pg_catalog.md5(pg_catalog.jsonb_build_object(
      'outbox', (SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(row_record) ORDER BY row_record.id)
        FROM hostile_shadow.teacher_notice_email_outbox AS row_record),
      'outboxProviderIndex', pg_catalog.pg_get_indexdef(
        pg_catalog.to_regclass('hostile_shadow.teacher_notice_email_outbox_provider_message_uq')),
      'outboxRelationSecurity', (SELECT pg_catalog.jsonb_build_object(
          'persistence', relation.relpersistence,
          'rowSecurity', relation.relrowsecurity,
          'forceRowSecurity', relation.relforcerowsecurity)
        FROM pg_catalog.pg_class AS relation
        JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'hostile_shadow'
          AND relation.relname = 'teacher_notice_email_outbox'),
      'marker', (SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(marker_record) ORDER BY marker_record.singleton)
        FROM hostile_shadow.teacher_notice_email_outbox_schema_migrations AS marker_record),
      'markerComment', pg_catalog.obj_description(
        pg_catalog.to_regclass('hostile_shadow.teacher_notice_email_outbox_schema_migrations'), 'pg_class'),
      'probe', (SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(probe_record) ORDER BY probe_record.id)
        FROM hostile_shadow.teacher_notice_email_outbox_deadline_probe AS probe_record),
      'state', (SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(state_record) ORDER BY state_record.id)
        FROM hostile_shadow.app_state AS state_record),
      'clock', hostile_shadow.clock_timestamp()
    )::pg_catalog.text) AS digest
  `;
  assert.match(rows[0]?.digest ?? "", /^[a-f0-9]{32}$/u);
  return rows[0]!.digest;
}

async function readProductionOutboxCatalog(sql: postgres.Sql, query: string) {
  const rows = await sql.unsafe<Array<{ catalog: unknown }>>(query);
  assert.equal(rows.length, 1);
  return rows[0]!.catalog;
}

function runPostgresAuthorityConflictWorker(configuredUrl: string) {
  const resultPrefix = "OUTBOX_PG_AUTHORITY_RESULT=";
  const source = `
    await (async () => {
      const postgres = (await import("postgres")).default;
      const store = await import("./lib/server/userStore.ts");
      const sql = postgres(process.env.POSTGRES_URL, {
        connect_timeout: 5,
        idle_timeout: 5,
        max: 1,
        onnotice: () => undefined,
        prepare: false
      });
      await store.__userStoreAiTutorPostgresTestHooks.ensureSchema();
      const replaceAuthorityConflict = async (records) => {
        const stateRows = await sql.unsafe("SELECT payload FROM public.app_state WHERE id = 'primary'");
        if (stateRows.length !== 1) throw new Error("fixture app_state is unavailable");
        const payloadValue = stateRows[0].payload;
        const payload = typeof payloadValue === "string" ? JSON.parse(payloadValue) : payloadValue;
        payload.teacher_class_collaborators = payload.teacher_class_collaborators
          .filter((record) => !String(record.id).startsWith("pg-outbox-collaborator-"));
        payload.teacher_class_collaborators.push(...records);
        await sql.unsafe(
          "UPDATE public.app_state SET payload = $1::pg_catalog.jsonb, revision = revision + 1 WHERE id = 'primary'",
          [JSON.stringify(payload)]
        );
      };
      const runConflict = async (suffix, records) => {
        await replaceAuthorityConflict([]);
        const notice = await store.createTeacherNotice({
          teacherId: "teacher-ms-chan",
          classId: "class-s3a-2026",
          audience: "parents",
          subject: "PostgreSQL outbox authority " + suffix,
          body: "Fixture-only authority quarantine assertion."
        });
        if (notice.status !== "created") throw new Error("fixture notice could not be created");
        const queued = await store.sendTeacherNotice({
          teacherId: "teacher-ms-chan",
          noticeId: notice.notice.id
        });
        if (queued.status !== "sent" || queued.email.status !== "queued" || queued.email.queued !== 1) {
          throw new Error("fixture notice was not queued");
        }
        await replaceAuthorityConflict(records);
        const aggregate = await store.deliverTeacherNoticeEmailOutboxBatch(1);
        const outboxRows = await sql.unsafe(
          "SELECT status, last_error_code FROM public.teacher_notice_email_outbox WHERE notice_id = $1",
          [notice.notice.id]
        );
        return {
          claimed: aggregate.claimed,
          status: outboxRows[0] && outboxRows[0].status,
          error: outboxRows[0] && outboxRows[0].last_error_code
        };
      };
      const coTeacherViewer = await runConflict("co-teacher-viewer", [
        { id: "pg-outbox-collaborator-active", class_id: "class-s3a-2026", teacher_id: "teacher-ms-chan", role: "co-teacher", status: "active" },
        { id: "pg-outbox-collaborator-viewer", class_id: "class-s3a-2026", teacher_id: "teacher-ms-chan", role: "viewer", status: "active" }
      ]);
      const activeRevoked = await runConflict("active-revoked", [
        { id: "pg-outbox-collaborator-active", class_id: "class-s3a-2026", teacher_id: "teacher-ms-chan", role: "co-teacher", status: "active" },
        { id: "pg-outbox-collaborator-revoked", class_id: "class-s3a-2026", teacher_id: "teacher-ms-chan", role: "co-teacher", status: "revoked" }
      ]);
      await replaceAuthorityConflict([]);
      const queueEvidenceFixture = async (suffix) => {
        const notice = await store.createTeacherNotice({
          teacherId: "teacher-ms-chan",
          classId: "class-s3a-2026",
          audience: "parents",
          subject: "PostgreSQL outbox evidence " + suffix,
          body: "Fixture-only evidence-preservation assertion."
        });
        if (notice.status !== "created") throw new Error("evidence notice could not be created");
        const queued = await store.sendTeacherNotice({
          teacherId: "teacher-ms-chan",
          noticeId: notice.notice.id
        });
        if (queued.status !== "sent" || queued.email.status !== "queued" || queued.email.queued !== 1) {
          throw new Error("evidence notice was not queued");
        }
        return notice.notice.id;
      };
      const attemptLimitNoticeId = await queueEvidenceFixture("attempt-limit");
      const deliveryCutoffNoticeId = await queueEvidenceFixture("delivery-cutoff");
      await sql.unsafe(
        "ALTER TABLE public.teacher_notice_email_outbox DROP CONSTRAINT teacher_notice_email_outbox_state_fields_ck"
      );
      const attemptProviderId = "11111111-1111-4111-8111-111111111111";
      const attemptCompletedAt = "2026-08-23T00:01:00.000Z";
      await sql.unsafe(
        "UPDATE public.teacher_notice_email_outbox SET status = 'leased', attempt_count = 8, first_enqueued_at = pg_catalog.now(), next_attempt_at = pg_catalog.now(), lease_token = $2, lease_expires_at = pg_catalog.now() - INTERVAL '1 minute', provider_message_id = $3, last_http_status = 202, completed_at = $4::pg_catalog.timestamptz WHERE notice_id = $1",
        [attemptLimitNoticeId, "11111111-1111-4111-8111-111111111112", attemptProviderId, attemptCompletedAt]
      );
      const cutoffProviderId = "22222222-2222-4222-8222-222222222222";
      const cutoffCompletedAt = "2026-08-23T00:02:00.000Z";
      await sql.unsafe(
        "UPDATE public.teacher_notice_email_outbox SET status = 'leased', attempt_count = 1, first_enqueued_at = pg_catalog.now() - INTERVAL '24 hours', next_attempt_at = pg_catalog.now(), lease_token = $2, lease_expires_at = pg_catalog.now() - INTERVAL '1 minute', provider_message_id = $3, last_http_status = 503, completed_at = $4::pg_catalog.timestamptz WHERE notice_id = $1",
        [deliveryCutoffNoticeId, "22222222-2222-4222-8222-222222222223", cutoffProviderId, cutoffCompletedAt]
      );
      const evidenceAggregate = await store.deliverTeacherNoticeEmailOutboxBatch(1);
      const evidenceFor = async (noticeId, providerId, httpStatus, completedAt) => {
        const rows = await sql.unsafe(
          "SELECT status, last_error_code, provider_message_id = $2::pg_catalog.text AS provider_preserved, last_http_status = $3::pg_catalog.int4 AS http_preserved, completed_at = $4::pg_catalog.timestamptz AS completion_preserved FROM public.teacher_notice_email_outbox WHERE notice_id = $1",
          [noticeId, providerId, httpStatus, completedAt]
        );
        if (rows.length !== 1) throw new Error("evidence outbox row is unavailable");
        return {
          status: rows[0].status,
          error: rows[0].last_error_code,
          providerPreserved: rows[0].provider_preserved,
          httpPreserved: rows[0].http_preserved,
          completionPreserved: rows[0].completion_preserved
        };
      };
      const evidenceSweep = {
        claimed: evidenceAggregate.claimed,
        attemptLimit: await evidenceFor(attemptLimitNoticeId, attemptProviderId, 202, attemptCompletedAt),
        deliveryCutoff: await evidenceFor(deliveryCutoffNoticeId, cutoffProviderId, 503, cutoffCompletedAt)
      };
      await sql.end({ timeout: 5 });
      process.stdout.write("${resultPrefix}" + JSON.stringify({ coTeacherViewer, activeRevoked, evidenceSweep }) + "\\n", () => process.exit(0));
    })().catch((error) => {
      process.stderr.write((error instanceof Error ? error.name + ": " + error.message : "worker failed") + "\\n");
      process.exit(1);
    });
  `;
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", source], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "test",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        HK_MATH_POSTGRES_HOT_AUTH_TABLES: "true",
        HK_MATH_ENABLE_DEMO_USER: "true",
        POSTGRES_MAX_CONNECTIONS: "2",
        POSTGRES_URL: configuredUrl,
        TEACHER_NOTICE_EMAIL_ENABLED: "false"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("PostgreSQL outbox authority worker timed out."));
    }, 60_000);
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      const marker = stdout.split(/\r?\n/u).find((line) => line.startsWith(resultPrefix));
      if (code !== 0 || !marker) {
        reject(new Error(`PostgreSQL outbox authority worker failed (${code}): ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(JSON.parse(marker.slice(resultPrefix.length)) as Record<string, unknown>);
    });
  });
}

function runPostgresOutboxMigrationWorker(configuredUrl: string, workerId: number) {
  const resultPrefix = `OUTBOX_PG_MIGRATION_${workerId}=`;
  const source = `
    await (async () => {
      const store = await import("./lib/server/userStore.ts");
      await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.migrateSchema();
      process.stdout.write("${resultPrefix}ok\\n", () => process.exit(0));
    })().catch((error) => {
      process.stderr.write((error instanceof Error ? error.name + ": " + error.message : "migration failed") + "\\n");
      process.exit(1);
    });
  `;
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", source], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "test",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        POSTGRES_MAX_CONNECTIONS: "1",
        POSTGRES_URL: configuredUrl
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`PostgreSQL outbox migration worker ${workerId} timed out.`));
    }, 30_000);
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0 || !stdout.split(/\r?\n/u).includes(`${resultPrefix}ok`)) {
        reject(new Error(`PostgreSQL outbox migration worker ${workerId} failed (${code}): ${stderr.slice(0, 500)}`));
        return;
      }
      resolve();
    });
  });
}

function runPostgresAlterTableBarrierWorker(configuredUrl: string) {
  const resultPrefix = "OUTBOX_PG_ALTER_BARRIER_RESULT=";
  const source = `
    await (async () => {
      const postgres = (await import("postgres")).default;
      const store = await import("./lib/server/userStore.ts");
      const ddlSql = postgres(process.env.POSTGRES_URL, {
        connect_timeout: 5,
        idle_timeout: 5,
        max: 1,
        onnotice: () => undefined,
        prepare: false
      });
      await ddlSql.unsafe("SET lock_timeout = '250ms'");
      await ddlSql.unsafe("SET statement_timeout = '1000ms'");
      let blockedCode = null;
      const operationCompleted = await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks
        .runAlterTableBarrierProbe({
          onLocked: async () => {
            try {
              await ddlSql.unsafe("ALTER TABLE public.teacher_notice_email_outbox ADD COLUMN barrier_during_transaction pg_catalog.text");
            } catch (error) {
              blockedCode = error && typeof error === "object" && "code" in error ? String(error.code) : null;
            }
          }
        });
      await ddlSql.unsafe("SET lock_timeout = '2000ms'");
      await ddlSql.unsafe("SET statement_timeout = '3000ms'");
      await ddlSql.unsafe("ALTER TABLE public.teacher_notice_email_outbox DROP COLUMN IF EXISTS barrier_during_transaction");
      await ddlSql.unsafe("ALTER TABLE public.teacher_notice_email_outbox ADD COLUMN barrier_after_commit pg_catalog.text");
      await ddlSql.unsafe("ALTER TABLE public.teacher_notice_email_outbox DROP COLUMN barrier_after_commit");
      const afterReleaseAttests = await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.attestSchema();
      await ddlSql.end({ timeout: 5 });
      process.stdout.write("${resultPrefix}" + JSON.stringify({
        blockedCode,
        operationCompleted,
        afterReleaseAttests
      }) + "\\n", () => process.exit(0));
    })().catch((error) => {
      process.stderr.write((error instanceof Error ? error.name + ": " + error.message : "ALTER barrier failed") + "\\n");
      process.exit(1);
    });
  `;
  return new Promise<{
    blockedCode: string | null;
    operationCompleted: boolean;
    afterReleaseAttests: boolean;
  }>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", source], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "test",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        POSTGRES_MAX_CONNECTIONS: "1",
        POSTGRES_URL: configuredUrl
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("PostgreSQL outbox ALTER TABLE barrier worker timed out."));
    }, 30_000);
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      const marker = stdout.split(/\r?\n/u).find((line) => line.startsWith(resultPrefix));
      if (code !== 0 || !marker) {
        reject(new Error(`PostgreSQL outbox ALTER TABLE barrier worker failed (${code}): ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(JSON.parse(marker.slice(resultPrefix.length)) as {
        blockedCode: string | null;
        operationCompleted: boolean;
        afterReleaseAttests: boolean;
      });
    });
  });
}

function runPostgresProviderMappingBarrierWorker(configuredUrl: string) {
  const resultPrefix = "OUTBOX_PG_PROVIDER_MAPPING_BARRIER_RESULT=";
  const source = `
    await (async () => {
      const postgres = (await import("postgres")).default;
      const store = await import("./lib/server/userStore.ts");
      const providerMessageId = "33333333-3333-4333-8333-333333333333";
      const advisorySql = postgres(process.env.POSTGRES_URL, {
        connect_timeout: 5, idle_timeout: 5, max: 1, onnotice: () => undefined, prepare: false
      });
      const ddlSql = postgres(process.env.POSTGRES_URL, {
        connect_timeout: 5, idle_timeout: 5, max: 1, onnotice: () => undefined, prepare: false
      });
      await advisorySql.unsafe("SET lock_timeout = '250ms'");
      await advisorySql.unsafe("SET statement_timeout = '1000ms'");
      await ddlSql.unsafe("SET lock_timeout = '250ms'");
      await ddlSql.unsafe("SET statement_timeout = '1000ms'");
      let providerBlockedCode = null;
      let ddlBlockedCode = null;
      const operationCompleted = await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks
        .runProviderMappingBarrierProbe({
          providerMessageId,
          onLocked: async () => {
            try {
              await advisorySql.unsafe(
                "SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1, 0))",
                ["mais-resend-teacher-notice-webhook-v2:" + providerMessageId]
              );
            } catch (error) {
              providerBlockedCode = error && typeof error === "object" && "code" in error ? String(error.code) : null;
            }
            try {
              await ddlSql.unsafe("ALTER TABLE public.teacher_notice_email_outbox ADD COLUMN provider_mapping_barrier pg_catalog.text");
            } catch (error) {
              ddlBlockedCode = error && typeof error === "object" && "code" in error ? String(error.code) : null;
            }
          }
        });
      await ddlSql.unsafe("SET lock_timeout = '2000ms'");
      await ddlSql.unsafe("SET statement_timeout = '3000ms'");
      await ddlSql.unsafe("ALTER TABLE public.teacher_notice_email_outbox DROP COLUMN IF EXISTS provider_mapping_barrier");
      await ddlSql.unsafe("ALTER TABLE public.teacher_notice_email_outbox ADD COLUMN provider_mapping_after_commit pg_catalog.text");
      await ddlSql.unsafe("ALTER TABLE public.teacher_notice_email_outbox DROP COLUMN provider_mapping_after_commit");
      const afterReleaseAttests = await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.attestSchema();
      await Promise.all([advisorySql.end({ timeout: 5 }), ddlSql.end({ timeout: 5 })]);
      process.stdout.write("${resultPrefix}" + JSON.stringify({
        providerBlockedCode, ddlBlockedCode, operationCompleted, afterReleaseAttests
      }) + "\\n", () => process.exit(0));
    })().catch((error) => {
      process.stderr.write((error instanceof Error ? error.name + ": " + error.message : "provider barrier failed") + "\\n");
      process.exit(1);
    });
  `;
  return new Promise<{
    providerBlockedCode: string | null;
    ddlBlockedCode: string | null;
    operationCompleted: boolean;
    afterReleaseAttests: boolean;
  }>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", source], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "test",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        POSTGRES_MAX_CONNECTIONS: "1",
        POSTGRES_URL: configuredUrl
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("PostgreSQL outbox provider mapping barrier worker timed out."));
    }, 30_000);
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      const marker = stdout.split(/\r?\n/u).find((line) => line.startsWith(resultPrefix));
      if (code !== 0 || !marker) {
        reject(new Error(`PostgreSQL outbox provider mapping barrier worker failed (${code}): ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(JSON.parse(marker.slice(resultPrefix.length)) as {
        providerBlockedCode: string | null;
        ddlBlockedCode: string | null;
        operationCompleted: boolean;
        afterReleaseAttests: boolean;
      });
    });
  });
}

function runPostgresDeadlineRollbackWorker(configuredUrl: string, probeId: string) {
  const resultPrefix = "OUTBOX_PG_DEADLINE_RESULT=";
  const source = `
    await (async () => {
      const store = await import("./lib/server/userStore.ts");
      let rejected = false;
      let code = null;
      try {
        await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.runDeadlineRollbackProbe({
          probeId: ${JSON.stringify(probeId)},
          budgetMs: 1000,
          pauseMs: 2000
        });
      } catch (error) {
        rejected = true;
        code = error && typeof error === "object" && "code" in error ? String(error.code) : null;
      }
      process.stdout.write("${resultPrefix}" + JSON.stringify({ rejected, code }) + "\\n", () => process.exit(0));
    })().catch((error) => {
      process.stderr.write((error instanceof Error ? error.name + ": " + error.message : "deadline probe failed") + "\\n");
      process.exit(1);
    });
  `;
  return new Promise<{ rejected: boolean; code: string | null }>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", source], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "test",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        POSTGRES_MAX_CONNECTIONS: "1",
        POSTGRES_URL: configuredUrl
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("PostgreSQL outbox deadline rollback worker timed out."));
    }, 30_000);
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      const marker = stdout.split(/\r?\n/u).find((line) => line.startsWith(resultPrefix));
      if (code !== 0 || !marker) {
        reject(new Error(`PostgreSQL outbox deadline rollback worker failed (${code}): ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(JSON.parse(marker.slice(resultPrefix.length)) as { rejected: boolean; code: string | null });
    });
  });
}

test("manual notice sending atomically queues email before one idempotent WeCom contact", async () => {
  const helper = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsNoticePersistence.ts"), "utf8");
  const root = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const sendMethod = sourceSection(helper, "async sendTeacherNotice", "\n  };\n}");

  assert.match(helper, /queueNoticeEmail/);
  assert.doesNotMatch(sendMethod, /sendTeacherOpsNoticeRecord|origin/);
  assert.match(sendMethod, /request_idempotency_key_hash/);
  assert.match(sendMethod, /provider_contact_started_at/);
  assert.match(sendMethod, /teacherCanMutateOperationsClass\(database, queueActor, notice\.class_id\)/);
  assert.match(sendMethod, /queueNoticeEmail/);
  assert.match(sendMethod, /sendNotification/);
  assert.ok(
    sendMethod.indexOf("await queueNoticeEmail") < sendMethod.indexOf("await sendNotification"),
    "the durable email transaction must commit before any WeCom provider contact"
  );
  assert.match(root, /queueNoticeEmail:\s*queueTeacherNoticeEmail/);
  assert.match(root, /mutateDatabaseWithTeacherNoticeEmailOutbox/);
});

test("missing-work reminders create queued runs and publish every notice through the same transaction", async () => {
  const helper = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsReminderPersistence.ts"), "utf8");
  const root = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const route = await readFile(path.join(process.cwd(), "app/api/teacher/reminders/run/route.ts"), "utf8");
  const handlers = await readFile(path.join(process.cwd(), "lib/server/teacherNoticeEmailOutboxHandlers.ts"), "utf8");
  const runMethod = sourceSection(helper, "async runTeacherMissingWorkReminders", "\n  };\n}");

  assert.match(helper, /mutateDatabaseWithNoticeOutbox/);
  assert.doesNotMatch(runMethod, /sendNoticeRecord|origin/);
  assert.match(runMethod, /status:\s*"queued"/);
  assert.match(runMethod, /noticeIds/);
  assert.match(root, /mutateDatabaseWithNoticeOutbox:[\s\S]*mutateDatabaseWithTeacherNoticeEmailOutbox/);
  assert.match(helper, /commitWithoutEligibleRows:\s*true/);
  assert.match(root, /prepared\.noEligible\s*&&\s*!mutation\.commitWithoutEligibleRows/);
  assert.doesNotMatch(route, /result\.status === "no-eligible"\s*\?\s*409/);
  assert.match(handlers, /code:\s*"IDEMPOTENCY_CONFLICT"/);
  assert.match(route, /createTeacherMissingWorkReminderRunHandler/);
  assert.match(handlers, /Cache-Control["']:\s*["']private, no-store/);
});

test("production outbox DDL and catalog probe attest exact PostgreSQL 16 semantics", {
  skip: postgres16IntegrationUrl ? false : "requires a dedicated loopback PostgreSQL 16 database"
}, async () => {
  assert.ok(postgres16IntegrationUrl);
  assertPostgres16IntegrationBoundary(postgres16IntegrationUrl);
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const catalogProbe = productionCatalogProbeFromSource(source);
  const sql = postgres(postgres16IntegrationUrl, {
    connect_timeout: 5,
    idle_timeout: 5,
    max: 1,
    onnotice: () => undefined,
    prepare: false
  });

  const attests = async () => attestTeacherNoticeEmailOutboxPostgresCatalog(
    await readProductionOutboxCatalog(sql, catalogProbe)
  );

  try {
    const versionRows = await sql<Array<{ version: number }>>`
      SELECT pg_catalog.current_setting('server_version_num')::pg_catalog.int4 AS version
    `;
    assert.ok(versionRows[0]!.version >= 160000 && versionRows[0]!.version < 170000,
      "catalog golden is intentionally scoped to PostgreSQL major 16");

    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("CREATE SCHEMA public");
    await sql.unsafe(`CREATE TABLE public.teacher_notice_email_outbox (
      id pg_catalog.text PRIMARY KEY,
      status pg_catalog.text NOT NULL,
      next_attempt_at pg_catalog.timestamptz NOT NULL,
      lease_expires_at pg_catalog.timestamptz,
      first_enqueued_at pg_catalog.timestamptz NOT NULL
    )`);
    await sql.unsafe(`CREATE TABLE public.teacher_notice_email_outbox_schema_migrations (
      singleton pg_catalog.bool PRIMARY KEY DEFAULT TRUE,
      version pg_catalog.int4 NOT NULL DEFAULT 1,
      applied_at pg_catalog.timestamptz NOT NULL DEFAULT pg_catalog.now()
    )`);
    await sql.unsafe("INSERT INTO public.teacher_notice_email_outbox_schema_migrations (singleton, version, applied_at) VALUES (TRUE, 1, '2026-08-23T00:00:00Z'::pg_catalog.timestamptz)");
    await sql.unsafe("COMMENT ON TABLE public.teacher_notice_email_outbox_schema_migrations IS 'mais:teacher-notice-email-outbox:legacy-v1'");
    const malformedCatalogBefore = await readMigrationCatalogDigest(sql);
    await assert.rejects(
      runPostgresOutboxMigrationWorker(postgres16IntegrationUrl, 90),
      /migration worker 90 failed/u
    );
    assert.equal(
      await readMigrationCatalogDigest(sql),
      malformedCatalogBefore,
      "failed exact same-transaction attestation must roll back DDL, index, marker, and comment"
    );

    await installHostileOutboxShadowSchema(sql);
    const hostileCatalogBefore = await readHostileOutboxShadowDigest(sql);
    const hostileSearchPathUrl = withHostileOutboxSearchPath(postgres16IntegrationUrl);
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("CREATE SCHEMA public");
    await runPostgresOutboxMigrationWorker(hostileSearchPathUrl, 91);
    assert.equal(await attests(), true, "migration must create and attest only the exact public catalog");
    assert.equal(
      await readHostileOutboxShadowDigest(sql),
      hostileCatalogBefore,
      "hostile search_path objects must remain byte-for-byte semantically unchanged after migration"
    );

    await sql.unsafe(`CREATE TABLE public.teacher_notice_email_outbox_deadline_probe (
      id pg_catalog.text PRIMARY KEY,
      phase pg_catalog.text NOT NULL
    )`);
    const deadlineProbeId = "deadline-rollback-probe";
    assert.deepEqual(await runPostgresDeadlineRollbackWorker(hostileSearchPathUrl, deadlineProbeId), {
      rejected: true,
      code: "57014"
    });
    const countProbeRows = async () => Number((await sql<Array<{ count: number }>>`
      SELECT pg_catalog.count(*)::pg_catalog.int4 AS count
      FROM public.teacher_notice_email_outbox_deadline_probe
      WHERE id = ${deadlineProbeId}
    `)[0]?.count ?? -1);
    assert.equal(await countProbeRows(), 0, "timed-out transaction must roll back its pre-timeout insert");
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(await countProbeRows(), 0, "destroyed deadline lane must not commit after the caller observes timeout");
    assert.equal(
      await readHostileOutboxShadowDigest(sql),
      hostileCatalogBefore,
      "runtime transactions must not resolve the hostile outbox, app-state, function, or probe shadows"
    );
    await sql.unsafe("DROP TABLE public.teacher_notice_email_outbox_deadline_probe");

    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("CREATE SCHEMA public");
    await Promise.all(Array.from({ length: 4 }, (_, workerId) =>
      runPostgresOutboxMigrationWorker(postgres16IntegrationUrl, workerId + 1)
    ));
    assert.equal(await attests(), true, "cold concurrent migrations must serialize to the exact v2 catalog");
    assert.deepEqual(await runPostgresAlterTableBarrierWorker(postgres16IntegrationUrl), {
      blockedCode: "55P03",
      operationCompleted: true,
      afterReleaseAttests: true
    }, "same-transaction relation locks must block ALTER TABLE until attested DML commits");
    assert.deepEqual(await runPostgresProviderMappingBarrierWorker(postgres16IntegrationUrl), {
      providerBlockedCode: "55P03",
      ddlBlockedCode: "55P03",
      operationCompleted: true,
      afterReleaseAttests: true
    }, "provider completion must hold its provider advisory and exact-catalog relation barrier until commit");

    await resetOutboxSchema(sql);
    assert.equal(await attests(), true, "production PostgreSQL 16 catalog must attest exactly");
    const insertProviderMapping = async (suffix: string, providerMessageId: string) => sql`
      INSERT INTO public.teacher_notice_email_outbox (
        id, notice_id, recipient_id, recipient_fingerprint, student_id, guardian_id, teacher_id,
        queued_by_id, queued_by_fingerprint, class_id, email, locale, durable_delivery_key,
        content_revision, status, attempt_count, first_enqueued_at, next_attempt_at,
        provider_message_id, completed_at, created_at, updated_at, pii_expires_at, tombstone_expires_at
      ) VALUES (
        ${`provider-row-${suffix}`}, ${`provider-notice-${suffix}`}, ${`provider-recipient-${suffix}`},
        ${`provider-recipient-fingerprint-${suffix}`}, ${`provider-student-${suffix}`},
        ${`provider-guardian-${suffix}`}, 'teacher-ms-chan', 'teacher-ms-chan',
        'provider-teacher-fingerprint', 'class-s3a-2026', ${`${suffix}@example.test`}, 'en',
        ${`teacher-notice-email/provider-${suffix}`}, 'revision-1', 'provider-accepted', 1,
        '2026-08-24T00:00:00.000Z'::pg_catalog.timestamptz,
        '2026-08-24T00:00:00.000Z'::pg_catalog.timestamptz,
        ${providerMessageId}, '2026-08-24T00:01:00.000Z'::pg_catalog.timestamptz,
        '2026-08-24T00:00:00.000Z'::pg_catalog.timestamptz,
        '2026-08-24T00:01:00.000Z'::pg_catalog.timestamptz,
        '2026-09-23T00:01:00.000Z'::pg_catalog.timestamptz,
        '2027-09-28T00:01:00.000Z'::pg_catalog.timestamptz
      )
    `;
    const duplicateProviderId = "44444444-4444-4444-8444-444444444444";
    await insertProviderMapping("one", duplicateProviderId);
    await assert.rejects(insertProviderMapping("two", duplicateProviderId), (error: unknown) =>
      Boolean(error && typeof error === "object" && "code" in error && error.code === "23505"));

    const rejectsDrift = async (label: string, mutate: () => Promise<unknown>) => {
      await resetOutboxSchema(sql);
      await mutate();
      assert.equal(await attests(), false, label);
    };

    await rejectsDrift("weakened CHECK must fail closed", async () => {
      await sql.unsafe("ALTER TABLE teacher_notice_email_outbox DROP CONSTRAINT teacher_notice_email_outbox_state_fields_ck");
      await sql.unsafe("ALTER TABLE teacher_notice_email_outbox ADD CONSTRAINT teacher_notice_email_outbox_state_fields_ck CHECK (TRUE)");
    });
    await rejectsDrift("NOT VALID CHECK must fail closed", async () => {
      await sql.unsafe("ALTER TABLE teacher_notice_email_outbox DROP CONSTRAINT teacher_notice_email_outbox_attempt_count_ck");
      await sql.unsafe("ALTER TABLE teacher_notice_email_outbox ADD CONSTRAINT teacher_notice_email_outbox_attempt_count_ck CHECK (attempt_count >= 0) NOT VALID");
    });
    await rejectsDrift("wrong relation kind must fail closed", async () => {
      await sql.unsafe("ALTER TABLE teacher_notice_email_outbox_schema_migrations RENAME TO teacher_notice_email_outbox_schema_migrations_table");
      await sql.unsafe("CREATE VIEW teacher_notice_email_outbox_schema_migrations AS SELECT singleton, version, applied_at FROM teacher_notice_email_outbox_schema_migrations_table");
    });
    await rejectsDrift("unlogged outbox relation must fail closed", async () => {
      await sql.unsafe("ALTER TABLE public.teacher_notice_email_outbox SET UNLOGGED");
    });
    await rejectsDrift("outbox RLS must fail closed", async () => {
      await sql.unsafe("ALTER TABLE public.teacher_notice_email_outbox ENABLE ROW LEVEL SECURITY");
    });
    await rejectsDrift("outbox force RLS must fail closed", async () => {
      await sql.unsafe("ALTER TABLE public.teacher_notice_email_outbox FORCE ROW LEVEL SECURITY");
    });
    await rejectsDrift("unlogged migration marker must fail closed", async () => {
      await sql.unsafe("ALTER TABLE public.teacher_notice_email_outbox_schema_migrations SET UNLOGGED");
    });
    await rejectsDrift("migration marker RLS must fail closed", async () => {
      await sql.unsafe("ALTER TABLE public.teacher_notice_email_outbox_schema_migrations ENABLE ROW LEVEL SECURITY");
    });
    await rejectsDrift("migration marker force RLS must fail closed", async () => {
      await sql.unsafe("ALTER TABLE public.teacher_notice_email_outbox_schema_migrations FORCE ROW LEVEL SECURITY");
    });
    await rejectsDrift("missing primary key must fail closed", async () => {
      await sql.unsafe("ALTER TABLE teacher_notice_email_outbox DROP CONSTRAINT teacher_notice_email_outbox_pkey");
    });
    await rejectsDrift("wrong unique key order must fail closed", async () => {
      await sql.unsafe("ALTER TABLE teacher_notice_email_outbox DROP CONSTRAINT teacher_notice_email_outbox_delivery_revision_uq");
      await sql.unsafe("ALTER TABLE teacher_notice_email_outbox ADD CONSTRAINT teacher_notice_email_outbox_delivery_revision_uq UNIQUE (recipient_id, notice_id, content_revision)");
    });
    await rejectsDrift("wrong eligible index order must fail closed", async () => {
      await sql.unsafe("DROP INDEX teacher_notice_email_outbox_eligible_idx");
      await sql.unsafe("CREATE INDEX teacher_notice_email_outbox_eligible_idx ON teacher_notice_email_outbox (next_attempt_at, status, lease_expires_at, first_enqueued_at)");
    });
    await rejectsDrift("wrong eligible index opclass must fail closed", async () => {
      await sql.unsafe("DROP INDEX teacher_notice_email_outbox_eligible_idx");
      await sql.unsafe("CREATE INDEX teacher_notice_email_outbox_eligible_idx ON teacher_notice_email_outbox (status text_pattern_ops, next_attempt_at, lease_expires_at, first_enqueued_at)");
    });
    await rejectsDrift("wrong eligible index collation must fail closed", async () => {
      await sql.unsafe("DROP INDEX teacher_notice_email_outbox_eligible_idx");
      await sql.unsafe("CREATE INDEX teacher_notice_email_outbox_eligible_idx ON teacher_notice_email_outbox (status COLLATE \"C\", next_attempt_at, lease_expires_at, first_enqueued_at)");
    });
    await rejectsDrift("wrong provider unique index key must fail closed", async () => {
      await sql.unsafe("DROP INDEX public.teacher_notice_email_outbox_provider_message_uq");
      await sql.unsafe("CREATE UNIQUE INDEX teacher_notice_email_outbox_provider_message_uq ON public.teacher_notice_email_outbox (notice_id) WHERE provider_message_id IS NOT NULL");
    });
    await rejectsDrift("wrong provider unique index predicate must fail closed", async () => {
      await sql.unsafe("DROP INDEX public.teacher_notice_email_outbox_provider_message_uq");
      await sql.unsafe("CREATE UNIQUE INDEX teacher_notice_email_outbox_provider_message_uq ON public.teacher_notice_email_outbox (provider_message_id) WHERE provider_message_id IS NULL");
    });
    await rejectsDrift("wrong provider unique index opclass must fail closed", async () => {
      await sql.unsafe("DROP INDEX public.teacher_notice_email_outbox_provider_message_uq");
      await sql.unsafe("CREATE UNIQUE INDEX teacher_notice_email_outbox_provider_message_uq ON public.teacher_notice_email_outbox (provider_message_id pg_catalog.text_pattern_ops) WHERE provider_message_id IS NOT NULL");
    });
    await rejectsDrift("wrong provider unique index collation must fail closed", async () => {
      await sql.unsafe("DROP INDEX public.teacher_notice_email_outbox_provider_message_uq");
      await sql.unsafe("CREATE UNIQUE INDEX teacher_notice_email_outbox_provider_message_uq ON public.teacher_notice_email_outbox (provider_message_id COLLATE \"C\") WHERE provider_message_id IS NOT NULL");
    });
    await rejectsDrift("wrong marker cardinality must fail closed", async () => {
      await sql.unsafe("DELETE FROM teacher_notice_email_outbox_schema_migrations");
    });

    await resetOutboxSchema(sql);
    assert.deepEqual(await runPostgresAuthorityConflictWorker(postgres16IntegrationUrl), {
      coTeacherViewer: { claimed: 0, status: "dead-letter", error: "authorization-changed" },
      activeRevoked: { claimed: 0, status: "dead-letter", error: "authorization-changed" },
      evidenceSweep: {
        claimed: 0,
        attemptLimit: {
          status: "dead-letter",
          error: "quarantined-invalid-row",
          providerPreserved: true,
          httpPreserved: true,
          completionPreserved: true
        },
        deliveryCutoff: {
          status: "dead-letter",
          error: "quarantined-invalid-row",
          providerPreserved: true,
          httpPreserved: true,
          completionPreserved: true
        }
      }
    });
  } finally {
    await sql.unsafe("DROP SCHEMA IF EXISTS hostile_shadow CASCADE").catch(() => undefined);
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE").catch(() => undefined);
    await sql.unsafe("CREATE SCHEMA public").catch(() => undefined);
    await sql.end({ timeout: 5 });
  }
});
