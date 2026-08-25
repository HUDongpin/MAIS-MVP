import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import test from "node:test";

import postgres from "postgres";

const integrationUrl = process.env.MAIS_POSTGRES_INTEGRATION_URL?.trim();
const integrationRequired = process.env.CI === "true";
const repositoryRoot = process.cwd();
const workerPath = path.join(repositoryRoot, "scripts/nova-postgres-integration-worker.ts");
const tsxPath = path.join(repositoryRoot, "node_modules/.bin/tsx");
const resultPrefix = "NOVA_POSTGRES_INTEGRATION_RESULT=";
const workerTimeoutMs = 120_000;
const lockObservationTimeoutMs = 30_000;
const storageContractAdvisoryLockKey = "mais-postgres-storage-contract-v1";
const fourWriterCapabilityBarrierKey = "mais-test-postgres-capability-barrier-v1";
const fourWriterMutationLockTimeoutMs = 30_000;
const fourWriterMutationStatementTimeoutMs = 45_000;
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

type StateEvidence = {
  payload_digest: string;
  revision: string;
  updated_at: string;
};

type MarkerEvidence = {
  attested_at: string;
  contract_version: number;
  schema_version: number;
  state_id: string;
  state_kind: string;
  state_revision: string;
  tenant_id: string;
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
    ["5432", "55432", "55440"].includes(parsedUrl.port || "5432"),
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

async function runWorker(
  command: string,
  input: unknown = {},
  options: {
    bootstrapLockHoldMs?: number;
    capabilityBarrier?: boolean;
    capabilityStateLockHoldMs?: number;
    hotAuthTables?: boolean;
    mutationLockTimeoutMs?: number;
    mutationStatementTimeoutMs?: number;
    readinessObservationLockHoldMs?: number;
    shadowSearchPath?: boolean;
  } = {}
): Promise<WorkerOutcome> {
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
        HK_MATH_POSTGRES_HOT_AUTH_TABLES: options.hotAuthTables === false ? "false" : "true",
        HK_MATH_STORAGE_PROVIDER: "postgres",
        MAIS_TEST_POSTGRES_BOOTSTRAP_LOCK_HOLD_MS: String(options.bootstrapLockHoldMs ?? 0),
        MAIS_TEST_POSTGRES_CAPABILITY_BARRIER: options.capabilityBarrier === true ? "true" : "false",
        MAIS_TEST_POSTGRES_CAPABILITY_STATE_LOCK_HOLD_MS: String(
          options.capabilityStateLockHoldMs ?? 0
        ),
        MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: String(options.mutationLockTimeoutMs ?? 0),
        MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: String(
          options.mutationStatementTimeoutMs ?? 0
        ),
        MAIS_TEST_POSTGRES_READINESS_OBSERVATION_LOCK_HOLD_MS: String(
          options.readinessObservationLockHoldMs ?? 0
        ),
        NODE_ENV: "test",
        PGOPTIONS: options.shadowSearchPath
          ? "-c search_path=integration_shadow,public"
          : process.env.PGOPTIONS,
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

async function runSuccessfulWorker(
  command: string,
  input: unknown = {},
  options: {
    bootstrapLockHoldMs?: number;
    capabilityBarrier?: boolean;
    capabilityStateLockHoldMs?: number;
    hotAuthTables?: boolean;
    mutationLockTimeoutMs?: number;
    mutationStatementTimeoutMs?: number;
    readinessObservationLockHoldMs?: number;
    shadowSearchPath?: boolean;
  } = {}
) {
  const outcome = await runWorker(command, input, options);
  assert.equal(outcome.exitCode, 0, `${command} failed: ${String(outcome.result.error ?? "unknown error")}`);
  return outcome.result;
}

async function waitForStorageContractAdvisoryLock(
  sql: postgres.Sql,
  { granted }: { granted: boolean }
) {
  const deadline = performance.now() + lockObservationTimeoutMs;
  while (performance.now() < deadline) {
    const rows = await sql<Array<{ locked: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_locks
        WHERE locktype = 'advisory'
          AND database = (
            SELECT oid
            FROM pg_catalog.pg_database
            WHERE datname = pg_catalog.current_database()
          )
          AND granted = ${granted}
          AND pid <> pg_backend_pid()
          AND classid::bigint = (
            (pg_catalog.hashtextextended(${storageContractAdvisoryLockKey}, 0) >> 32)
            & 4294967295
          )
          AND objid::bigint = (
            pg_catalog.hashtextextended(${storageContractAdvisoryLockKey}, 0)
            & 4294967295
          )
          AND objsubid = 1
      ) AS locked
    `;
    if (rows[0]?.locked === true) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for the fixture advisory lock boundary.");
}

async function waitForBootstrapAdvisoryLock(sql: postgres.Sql) {
  await waitForStorageContractAdvisoryLock(sql, { granted: true });
}

async function waitForAppStateLock(sql: postgres.Sql, { granted }: { granted: boolean }) {
  const deadline = performance.now() + lockObservationTimeoutMs;
  while (performance.now() < deadline) {
    const rows = await sql<Array<{ observed: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_locks AS lock
        INNER JOIN pg_catalog.pg_class AS relation ON relation.oid = lock.relation
        INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND relation.relname = 'app_state'
          AND lock.pid <> pg_backend_pid()
          AND lock.granted = ${granted}
          AND lock.mode IN ('RowShareLock', 'AccessExclusiveLock')
      ) AS observed
    `;
    if (rows[0]?.observed === true) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for the fixture app_state lock boundary.");
}

async function waitForAppStateCapabilityTableLock(sql: postgres.Sql) {
  const deadline = performance.now() + lockObservationTimeoutMs;
  while (performance.now() < deadline) {
    const rows = await sql<Array<{ observed: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_locks AS lock
        INNER JOIN pg_catalog.pg_class AS relation ON relation.oid = lock.relation
        INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND relation.relname = 'app_state'
          AND lock.pid <> pg_backend_pid()
          AND lock.granted
          AND lock.mode = 'ShareRowExclusiveLock'
      ) AS observed
    `;
    if (rows[0]?.observed === true) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for the capability table-lock boundary.");
}

async function waitForAppStateCapabilityTableLockQueue(
  sql: postgres.Sql,
  expectedWaiting: number
) {
  const deadline = performance.now() + lockObservationTimeoutMs;
  while (performance.now() < deadline) {
    const rows = await sql<Array<{ granted_count: number; waiting_count: number }>>`
      SELECT
        COUNT(*) FILTER (WHERE lock.granted)::integer AS granted_count,
        COUNT(*) FILTER (WHERE NOT lock.granted)::integer AS waiting_count
      FROM pg_catalog.pg_locks AS lock
      INNER JOIN pg_catalog.pg_class AS relation ON relation.oid = lock.relation
      INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = 'app_state'
        AND lock.mode = 'ShareRowExclusiveLock'
    `;
    if (rows[0]?.granted_count === 1 && rows[0]?.waiting_count === expectedWaiting) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for the four-writer capability table-lock queue.");
}

async function acquireFourWriterCapabilityBarrier(sql: postgres.ReservedSql) {
  await sql`
    SELECT pg_catalog.pg_advisory_lock(
      pg_catalog.hashtextextended(${fourWriterCapabilityBarrierKey}, 0)
    )
  `;
}

async function releaseFourWriterCapabilityBarrier(sql: postgres.ReservedSql) {
  const rows = await sql<Array<{ released: boolean }>>`
    SELECT pg_catalog.pg_advisory_unlock(
      pg_catalog.hashtextextended(${fourWriterCapabilityBarrierKey}, 0)
    ) AS released
  `;
  assert.equal(rows[0]?.released, true, "the four-writer capability barrier was not held");
}

async function waitForAppStateObservationLock(
  sql: postgres.Sql,
  { granted }: { granted: boolean }
) {
  const deadline = performance.now() + lockObservationTimeoutMs;
  while (performance.now() < deadline) {
    const rows = await sql<Array<{ observed: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_locks AS lock
        INNER JOIN pg_catalog.pg_class AS relation ON relation.oid = lock.relation
        INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND relation.relname = 'app_state'
          AND lock.pid <> pg_backend_pid()
          AND lock.granted = ${granted}
          AND lock.mode IN ('AccessShareLock', 'AccessExclusiveLock')
      ) AS observed
    `;
    if (rows[0]?.observed === true) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for the fixture readiness observation lock boundary.");
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

async function readStateEvidence(sql: postgres.Sql) {
  const rows = await sql<StateEvidence[]>`
    SELECT
      pg_catalog.md5(payload::text) AS payload_digest,
      revision::text AS revision,
      updated_at::text AS updated_at
    FROM public.app_state
    WHERE id = 'primary'
      AND tenant_id = 'platform'
      AND state_kind = 'app-snapshot'
      AND schema_version = 1
  `;
  assert.equal(rows.length, 1, "expected one canonical primary app_state row");
  return rows[0] as StateEvidence;
}

async function readStorageReadinessMarkerCount(sql: postgres.Sql) {
  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM public.app_state_readiness_markers
    WHERE state_id = 'primary'
  `;
  assert.equal(rows.length, 1);
  return rows[0]?.count ?? -1;
}

async function readStorageReadinessMarkerEvidence(sql: postgres.Sql) {
  return sql<MarkerEvidence[]>`
    SELECT
      state_id,
      tenant_id,
      state_kind,
      schema_version,
      state_revision::text AS state_revision,
      contract_version,
      attested_at::text AS attested_at
    FROM public.app_state_readiness_markers
    WHERE state_id = 'primary'
    ORDER BY state_id, tenant_id, state_kind, schema_version
  `;
}

async function assertStrictStorageReady(expected: boolean) {
  assert.deepEqual(await runSuccessfulWorker("strict-readiness"), { ready: expected });
}

async function assertBootstrapRejectedDuringPhysicalDrift(label: string) {
  const outcome = await runWorker("readiness");
  assert.equal(outcome.exitCode, 1, `${label}: bootstrap must fail closed`);
  assert.match(
    String(outcome.result.error),
    /Postgres storage readiness is unavailable\./u,
    `${label}: bootstrap must expose only the stable storage error`
  );
}

async function installCanonicalReadinessTrigger(sql: postgres.Sql) {
  await sql`DROP TRIGGER IF EXISTS app_state_readiness_invalidate ON public.app_state`;
  await sql`
    CREATE TRIGGER app_state_readiness_invalidate
    AFTER INSERT OR UPDATE OF id, payload, revision, tenant_id, state_kind, schema_version
    ON public.app_state
    FOR EACH ROW
    EXECUTE FUNCTION public.invalidate_app_state_readiness_marker()
  `;
}

async function installCanonicalReadinessFunction(sql: postgres.Sql) {
  await sql`
    CREATE OR REPLACE FUNCTION public.invalidate_app_state_readiness_marker()
    RETURNS trigger
    LANGUAGE plpgsql
    VOLATILE
    SECURITY INVOKER
    SET search_path = pg_catalog, public
    AS $mais_readiness$
    BEGIN
      IF TG_OP = 'UPDATE' THEN
        DELETE FROM public.app_state_readiness_markers
        WHERE state_id IN (OLD.id, NEW.id);
      ELSE
        DELETE FROM public.app_state_readiness_markers
        WHERE state_id = NEW.id;
      END IF;
      RETURN NEW;
    END
    $mais_readiness$
  `;
}

function arrayFromPayload(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  assert.ok(Array.isArray(value), `${key} must remain a JSON array`);
  return value as Array<Record<string, unknown>>;
}

function postgresJson(value: unknown) {
  return value as Parameters<postgres.Sql["json"]>[0];
}

function guardianInvitationDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
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

  clientCreated = false;
  afterIntegrationDatabaseBoundary(
    "postgres://postgres:postgres@127.0.0.1:55440/mais_nova_ci",
    () => {
      clientCreated = true;
    }
  );
  assert.equal(clientCreated, true);
});

test(
  "Nova PostgreSQL v4 migration, rollback compatibility, and admission projections are executable",
  {
    skip: integrationUrl ? false : integrationRequired ? false
      : "MAIS_POSTGRES_INTEGRATION_URL is not configured"
  },
  async (t) => {
    assert.ok(
      integrationUrl,
      "CI real PostgreSQL integration must provide MAIS_POSTGRES_INTEGRATION_URL."
    );
    const sql = afterIntegrationDatabaseBoundary(integrationUrl, () => postgres(integrationUrl, {
      connect_timeout: 5,
      idle_timeout: 5,
      max: 4,
      onnotice: () => undefined,
      prepare: false
    }));

    try {
      await resetPublicSchema(sql);

      await t.test("fresh PostgreSQL 16 bootstrap creates the attested v4 schema", async () => {
        const firstReadiness = runWorker("readiness", {}, { bootstrapLockHoldMs: 1_500 });
        void firstReadiness.catch(() => undefined);
        await waitForBootstrapAdvisoryLock(sql);
        const secondReadiness = runWorker("readiness");
        const readinessOutcomes = await Promise.allSettled([firstReadiness, secondReadiness]);
        assert.equal(
          readinessOutcomes.every((outcome) => (
            outcome.status === "fulfilled"
            && outcome.value.exitCode === 0
            && outcome.value.result.provider === "postgres"
            && outcome.value.result.schemaReady === true
          )),
          true,
          "both independent cold gates must converge after exact advisory-lock contention"
        );

        const rows = await sql<Array<{
          compatibility_function_ready: boolean;
          compatibility_trigger_ready: boolean;
          message_journal_ready: boolean;
          policy_projection_ready: boolean;
          schema_ready: boolean;
          usage_journal_ready: boolean;
        }>>`
          SELECT
            EXISTS (SELECT 1 FROM auth_schema_migrations WHERE version = 4) AS schema_ready,
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
        const misplacedObjects = await sql<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS count
          FROM pg_catalog.pg_class AS relation
          INNER JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'pg_catalog'
            AND relation.relname = ANY(${[
              "app_state",
              "app_state_readiness_markers",
              "auth_schema_migrations",
              "auth_users",
              "projection_users"
            ]}::text[])
        `;
        assert.equal(
          misplacedObjects[0]?.count,
          0,
          "bootstrap must never create MAIS relations inside pg_catalog"
        );
        const versionRows = await sql<Array<{ server_version_num: number }>>`
          SELECT current_setting('server_version_num')::int AS server_version_num
        `;
        assert.ok(
          versionRows[0]?.server_version_num >= 160_000
            && versionRows[0].server_version_num < 170_000,
          "the executable SQL gate must stay pinned to PostgreSQL 16"
        );

        await assertStrictStorageReady(true);
        await sql`CREATE DOMAIN public.timestamptz AS pg_catalog.timestamptz`;
        await sql`
          ALTER TABLE public.app_state
          ALTER COLUMN updated_at TYPE public.timestamptz
          USING updated_at::pg_catalog.timestamptz::public.timestamptz
        `;
        await assertStrictStorageReady(false);
        await sql`
          ALTER TABLE public.app_state
          ALTER COLUMN updated_at TYPE pg_catalog.timestamptz
          USING updated_at::pg_catalog.timestamptz
        `;
        await assertStrictStorageReady(true);
        await sql`DROP DOMAIN public.timestamptz`;

        await sql`CREATE DOMAIN public.text AS pg_catalog.text`;
        await sql`
          ALTER TABLE public.auth_users
          ALTER COLUMN email TYPE public.text USING email::pg_catalog.text::public.text
        `;
        assert.deepEqual(await runSuccessfulWorker("hot-auth-readiness"), { ready: false });
        await sql`
          ALTER TABLE public.auth_users
          ALTER COLUMN email TYPE pg_catalog.text USING email::pg_catalog.text
        `;
        assert.deepEqual(await runSuccessfulWorker("hot-auth-readiness"), { ready: true });
        await sql`DROP DOMAIN public.text`;

        await sql`DROP TRIGGER app_state_readiness_invalidate ON public.app_state`;
        await sql`
          CREATE TRIGGER app_state_readiness_invalidate
          AFTER INSERT OR UPDATE OF id, payload, revision, tenant_id, state_kind, schema_version
          ON public.app_state
          FOR EACH ROW
          WHEN (false)
          EXECUTE FUNCTION public.invalidate_app_state_readiness_marker()
        `;
        await assertStrictStorageReady(false);
        await installCanonicalReadinessTrigger(sql);
        await assertStrictStorageReady(true);

        await sql`ALTER TABLE public.app_state DROP CONSTRAINT app_state_pkey`;
        await sql`
          ALTER TABLE public.app_state
          ADD CONSTRAINT app_state_pkey PRIMARY KEY (id) DEFERRABLE INITIALLY IMMEDIATE
        `;
        await assertStrictStorageReady(false);
        await sql`ALTER TABLE public.app_state DROP CONSTRAINT app_state_pkey`;
        await sql`
          ALTER TABLE public.app_state ADD CONSTRAINT app_state_pkey PRIMARY KEY (id)
        `;
        await assertStrictStorageReady(true);

        await sql`
          /* physical_attestation_set_unlogged_drift */
          ALTER TABLE public.app_state SET UNLOGGED
        `;
        try {
          await assertStrictStorageReady(false);
          await assertBootstrapRejectedDuringPhysicalDrift("unlogged app_state");
        } finally {
          await sql`ALTER TABLE public.app_state SET LOGGED`;
        }
        await assertStrictStorageReady(true);

        await sql`
          /* physical_attestation_enable_rls_drift */
          ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY
        `;
        try {
          await assertStrictStorageReady(false);
          await assertBootstrapRejectedDuringPhysicalDrift("row-security auth_users");
        } finally {
          await sql`ALTER TABLE public.auth_users DISABLE ROW LEVEL SECURITY`;
        }
        await assertStrictStorageReady(true);

        await sql`
          /* physical_attestation_force_rls_drift */
          ALTER TABLE public.auth_users FORCE ROW LEVEL SECURITY
        `;
        try {
          await assertStrictStorageReady(false);
          await assertBootstrapRejectedDuringPhysicalDrift("forced-row-security auth_users");
        } finally {
          await sql`ALTER TABLE public.auth_users NO FORCE ROW LEVEL SECURITY`;
        }
        await assertStrictStorageReady(true);

        await sql`
          CREATE OR REPLACE FUNCTION public.invalidate_app_state_readiness_marker()
          RETURNS trigger
          LANGUAGE plpgsql
          VOLATILE
          SECURITY INVOKER
          SET search_path = public, pg_catalog
          AS $mais_readiness$
          BEGIN
            IF TG_OP = 'UPDATE' THEN
              DELETE FROM public.app_state_readiness_markers
              WHERE state_id IN (OLD.id, NEW.id);
            ELSE
              DELETE FROM public.app_state_readiness_markers
              WHERE state_id = NEW.id;
            END IF;
            RETURN NEW;
          END
          $mais_readiness$
        `;
        await assertStrictStorageReady(false);
        await installCanonicalReadinessFunction(sql);
        await assertStrictStorageReady(true);

        await sql`DROP TRIGGER app_state_readiness_invalidate ON public.app_state`;
        await sql`
          CREATE TRIGGER app_state_readiness_invalidate
          AFTER INSERT OR UPDATE OF id, payload, revision, tenant_id, state_kind, schema_version
          ON public.app_state
          FOR EACH ROW
          EXECUTE FUNCTION public.invalidate_app_state_readiness_marker('fixture-argument')
        `;
        await assertStrictStorageReady(false);
        await installCanonicalReadinessTrigger(sql);
        await assertStrictStorageReady(true);

        await sql`DROP SCHEMA IF EXISTS integration_shadow CASCADE`;
        await sql`CREATE SCHEMA integration_shadow`;
        await sql`CREATE TABLE integration_shadow.app_state (LIKE public.app_state INCLUDING ALL)`;
        await sql`
          CREATE TABLE integration_shadow.app_state_readiness_markers
          (LIKE public.app_state_readiness_markers INCLUDING ALL)
        `;
        await sql`
          CREATE TABLE integration_shadow.auth_schema_migrations
          (LIKE public.auth_schema_migrations INCLUDING ALL)
        `;
        await sql`CREATE TABLE integration_shadow.auth_users (LIKE public.auth_users INCLUDING ALL)`;
        await sql`
          CREATE TABLE integration_shadow.auth_student_profiles
          (LIKE public.auth_student_profiles INCLUDING ALL)
        `;
        await sql`
          CREATE TABLE integration_shadow.auth_user_settings
          (LIKE public.auth_user_settings INCLUDING ALL)
        `;
        await sql`
          CREATE TABLE integration_shadow.auth_password_reset_tokens
          (LIKE public.auth_password_reset_tokens INCLUDING ALL)
        `;
        assert.deepEqual(
          await runSuccessfulWorker("strict-readiness", {}, { shadowSearchPath: true }),
          { ready: true },
          "strict readiness must bind every relation to public despite a shadow search_path"
        );
        assert.deepEqual(
          await runSuccessfulWorker("write-message", {
            id: "integration-shadow-search-path-message",
            user_id: "integration-shadow-user",
            role: "student",
            content: "Search path capability sentinel",
            context_json: null,
            created_at: "2026-08-12T00:00:00.000Z"
          }, { shadowSearchPath: true }),
          { result: true },
          "a partial writer capability must bind subsequent writes to public"
        );
        assert.equal(
          (await sql<Array<{ count: number }>>`
            SELECT COUNT(*)::int AS count
            FROM integration_shadow.app_state
          `)[0]?.count,
          0,
          "a shadow app_state must never receive a capability-backed write"
        );
        await sql`DROP SCHEMA integration_shadow CASCADE`;

        const heldReadiness = runWorker(
          "strict-readiness",
          {},
          { readinessObservationLockHoldMs: 1_500 }
        );
        void heldReadiness.catch(() => undefined);
        await waitForAppStateObservationLock(sql, { granted: true });
        const queuedDdl = sql`
          ALTER TABLE public.app_state ALTER COLUMN updated_at DROP NOT NULL
        `;
        void queuedDdl.catch(() => undefined);
        await waitForAppStateObservationLock(sql, { granted: false });
        const [readinessOutcome, ddlOutcome] = await Promise.allSettled([heldReadiness, queuedDdl]);
        assert.equal(readinessOutcome.status, "fulfilled");
        if (readinessOutcome.status === "fulfilled") {
          assert.equal(readinessOutcome.value.exitCode, 0);
          assert.deepEqual(readinessOutcome.value.result, { ready: true });
        }
        assert.equal(ddlOutcome.status, "fulfilled");
        await assertStrictStorageReady(false);
        await sql`ALTER TABLE public.app_state ALTER COLUMN updated_at SET NOT NULL`;
        await assertStrictStorageReady(true);

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
      await t.test("two concurrent v2-to-v4 bootstraps reconcile classroom projections before readiness", async () => {
        // A valid v2 fixture already has the complete snapshot mirrored into its
        // hot-auth tables. Materialize that invariant before downgrading the
        // migration marker and converting the payload to the legacy scalar form.
        await runSuccessfulWorker("read-full-snapshot");
        const state = await readState(sql);
        const payload = structuredClone(state.payload);
        const users = arrayFromPayload(payload, "users");
        const student = users.find((candidate) => candidate.role === "student");
        if (!student || typeof student.id !== "string") {
          throw new Error("Initial state must include a student seed.");
        }
        studentId = student.id as string;
        const studentProfile = arrayFromPayload(payload, "student_profiles")
          .find((candidate) => candidate.user_id === studentId);
        if (!studentProfile) {
          throw new Error("Initial state must include the selected student's profile.");
        }

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
            ${String(studentProfile.name ?? student.username ?? "Integration Student")},
            ${String(studentProfile.grade ?? "P1")},
            ${typeof studentProfile.curriculum_track === "string" ? studentProfile.curriculum_track : "HK"},
            ${typeof studentProfile.curriculum_region === "string" ? studentProfile.curriculum_region : "HK"},
            ${typeof studentProfile.textbook_publisher === "string"
              ? studentProfile.textbook_publisher
              : "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"},
            ${typeof studentProfile.parent_invite_code === "string" ? studentProfile.parent_invite_code : null},
            ${typeof studentProfile.avatar_id === "string" ? studentProfile.avatar_id : null},
            ${typeof studentProfile.avatar_image_data_url === "string" ? studentProfile.avatar_image_data_url : null},
            ${typeof studentProfile.avatar_media_object_key === "string" ? studentProfile.avatar_media_object_key : null}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            name = excluded.name,
            grade = excluded.grade,
            curriculum_track = excluded.curriculum_track,
            curriculum_region = excluded.curriculum_region,
            textbook_publisher = excluded.textbook_publisher
        `;
        await sql`DELETE FROM auth_schema_migrations WHERE version = 4`;
        await sql`
          INSERT INTO auth_schema_migrations (version, applied_at)
          VALUES (2, NOW())
          ON CONFLICT (version) DO NOTHING
        `;

        const firstReadiness = runSuccessfulWorker(
          "readiness",
          {},
          { bootstrapLockHoldMs: 1_500 }
        );
        void firstReadiness.catch(() => undefined);
        await waitForBootstrapAdvisoryLock(sql);
        const secondReadiness = runSuccessfulWorker("readiness");
        const [first, second] = await Promise.all([firstReadiness, secondReadiness]);
        assert.equal(first.schemaReady, true);
        assert.equal(second.schemaReady, true);
        assert.equal(
          (await sql<Array<{ payload_type: string }>>`
            SELECT jsonb_typeof(payload) AS payload_type FROM app_state WHERE id = 'primary'
          `)[0]?.payload_type,
          "object",
          "v4 migration must persist an object readable by exact-v2 rollback SQL"
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
            EXISTS (SELECT 1 FROM auth_schema_migrations WHERE version = 4) AS schema_ready
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
          const admission = await runSuccessfulWorker("admission", { userId: studentId, sessionRevision: 1 });
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

        /* generic_writer_bootstrap_lock_order_barrier */
        const beforeLockOrder = await readState(sql);
        const lockOrderBarrierSql = await sql.reserve();
        let lockOrderBarrierHeld = false;
        const lockOrderWorkers: Array<Promise<WorkerOutcome>> = [];
        try {
          await acquireFourWriterCapabilityBarrier(lockOrderBarrierSql);
          lockOrderBarrierHeld = true;
          const genericWriter = runWorker(
            "full-snapshot-rewrite",
            {},
            {
              capabilityBarrier: true,
              mutationLockTimeoutMs: fourWriterMutationLockTimeoutMs,
              mutationStatementTimeoutMs: fourWriterMutationStatementTimeoutMs
            }
          );
          lockOrderWorkers.push(genericWriter);
          void genericWriter.catch(() => undefined);
          await waitForAppStateLock(sql, { granted: true });
          const forcedBootstrap = runWorker("force-bootstrap");
          lockOrderWorkers.push(forcedBootstrap);
          void forcedBootstrap.catch(() => undefined);
          await waitForStorageContractAdvisoryLock(sql, { granted: false });
          await releaseFourWriterCapabilityBarrier(lockOrderBarrierSql);
          lockOrderBarrierHeld = false;
          const [genericWriterOutcome, forcedBootstrapOutcome] = await Promise.all([
            genericWriter,
            forcedBootstrap
          ]);
          assert.equal(
            genericWriterOutcome.exitCode,
            0,
            String(genericWriterOutcome.result.error ?? "generic full-snapshot writer failed")
          );
          assert.deepEqual(genericWriterOutcome.result, { rewritten: true });
          assert.equal(
            forcedBootstrapOutcome.exitCode,
            0,
            String(forcedBootstrapOutcome.result.error ?? "forced bootstrap failed")
          );
          assert.deepEqual(forcedBootstrapOutcome.result, { bootstrapped: true });
        } finally {
          if (lockOrderBarrierHeld) {
            await releaseFourWriterCapabilityBarrier(lockOrderBarrierSql);
          }
          await Promise.allSettled(lockOrderWorkers);
          lockOrderBarrierSql.release();
        }
        const afterLockOrder = await readState(sql);
        assert.equal(
          Number(afterLockOrder.revision),
          Number(beforeLockOrder.revision) + 1
        );
        await assertStrictStorageReady(true);
        /* generic_writer_bootstrap_lock_order_barrier_end */
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

        const markerBeforeReplay = await sql<Array<{
          attested_at: string;
          state_revision: string;
        }>>`
          SELECT attested_at::text AS attested_at, state_revision::text AS state_revision
          FROM app_state_readiness_markers
          WHERE state_id = 'primary'
        `;
        assert.equal(markerBeforeReplay.length, 1);

        assert.deepEqual(await runSuccessfulWorker("write-message", message), { result: true });
        assert.deepEqual(await runSuccessfulWorker("write-usage", usage), { result: true });
        const afterRetry = await readState(sql);
        assert.equal(afterRetry.revision, afterWrite.revision, "same-id retries must not rewrite app_state");
        assert.equal(
          arrayFromPayload(afterRetry.payload, "ai_tutor_messages")
            .filter((record) => record.id === message.id).length,
          1
        );
        const markerAfterReplay = await sql<Array<{
          attested_at: string;
          state_revision: string;
        }>>`
          SELECT attested_at::text AS attested_at, state_revision::text AS state_revision
          FROM app_state_readiness_markers
          WHERE state_id = 'primary'
        `;
        assert.deepEqual(
          markerAfterReplay,
          markerBeforeReplay,
          "same-id no-delta replay must not advance revision or attested_at"
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

        const concurrentMessage = {
          ...message,
          content: "Concurrent idempotent message",
          created_at: "2026-08-12T01:10:00.000Z",
          id: "integration-concurrent-message"
        };
        const concurrentUsage = {
          ...usage,
          created_at: "2026-08-12T01:10:01.000Z",
          id: "integration-concurrent-usage"
        };
        const beforeConcurrent = await readState(sql);
        /* four_writer_serialization_barrier */
        assert.ok(
          fourWriterMutationLockTimeoutMs > fourWriterMutationStatementTimeoutMs / 2,
          "the four-writer fixture lock budget must exceed its deterministic barrier setup budget"
        );
        const fourWriterTimeoutOptions = {
          mutationLockTimeoutMs: fourWriterMutationLockTimeoutMs,
          mutationStatementTimeoutMs: fourWriterMutationStatementTimeoutMs
        };
        const barrierSql = await sql.reserve();
        let barrierHeld = false;
        const activeWriters: Array<Promise<unknown>> = [];
        try {
          await acquireFourWriterCapabilityBarrier(barrierSql);
          barrierHeld = true;
          const firstConcurrentWriter = runWorker(
            "write-message",
            concurrentMessage,
            { ...fourWriterTimeoutOptions, capabilityBarrier: true }
          );
          activeWriters.push(firstConcurrentWriter);
          void firstConcurrentWriter.catch(() => undefined);
          await waitForAppStateCapabilityTableLock(sql);
          const queuedWriters = [
            runSuccessfulWorker("write-message", concurrentMessage, fourWriterTimeoutOptions),
            runSuccessfulWorker("write-usage", concurrentUsage, fourWriterTimeoutOptions),
            runSuccessfulWorker("write-usage", concurrentUsage, fourWriterTimeoutOptions)
          ];
          activeWriters.push(...queuedWriters);
          for (const writer of queuedWriters) void writer.catch(() => undefined);
          await waitForAppStateCapabilityTableLockQueue(sql, 3);
          await releaseFourWriterCapabilityBarrier(barrierSql);
          barrierHeld = false;
          const [firstConcurrentWriterOutcome, ...queuedWriterResults] = await Promise.all([
            firstConcurrentWriter,
            ...queuedWriters
          ]);
          assert.equal(
            firstConcurrentWriterOutcome.exitCode,
            0,
            String(firstConcurrentWriterOutcome.result.error ?? "first writer failed")
          );
          const concurrentWriterResults = [
            firstConcurrentWriterOutcome.result,
            ...queuedWriterResults
          ];
          assert.deepEqual(
            concurrentWriterResults,
            [
              { result: true },
              { result: true },
              { result: true },
              { result: true }
            ],
            "four independent writers must serialize without a table-lock upgrade deadlock"
          );
        } finally {
          if (barrierHeld) await releaseFourWriterCapabilityBarrier(barrierSql);
          await Promise.allSettled(activeWriters);
          barrierSql.release();
        }
        /* four_writer_serialization_barrier_end */
        const afterConcurrent = await readState(sql);
        assert.equal(Number(afterConcurrent.revision), Number(beforeConcurrent.revision) + 2);
        assert.deepEqual(
          arrayFromPayload(afterConcurrent.payload, "ai_tutor_messages")
            .filter((candidate) => candidate.id === concurrentMessage.id),
          [concurrentMessage]
        );
        assert.deepEqual(
          arrayFromPayload(afterConcurrent.payload, "ai_tutor_usage")
            .filter((candidate) => candidate.id === concurrentUsage.id),
          [concurrentUsage]
        );

        assert.ok(integrationUrl);
        const driftSql = postgres(integrationUrl, {
          connect_timeout: 5,
          idle_timeout: 5,
          max: 1,
          onnotice: () => undefined,
          prepare: false
        });
        try {
          const driftCases = [
            {
              name: "ALTER TABLE nullability",
              apply: () => driftSql`
                ALTER TABLE public.app_state ALTER COLUMN updated_at DROP NOT NULL
              `,
              restore: () => driftSql`
                ALTER TABLE public.app_state ALTER COLUMN updated_at SET NOT NULL
              `
            },
            {
              name: "drop and replace invalidation trigger",
              apply: async () => {
                await driftSql`DROP TRIGGER app_state_readiness_invalidate ON public.app_state`;
                await driftSql`
                  CREATE TRIGGER app_state_readiness_invalidate
                  AFTER INSERT OR UPDATE OF id, payload, revision, tenant_id, state_kind, schema_version
                  ON public.app_state
                  FOR EACH ROW
                  WHEN (false)
                  EXECUTE FUNCTION public.invalidate_app_state_readiness_marker()
                `;
              },
              restore: () => installCanonicalReadinessTrigger(driftSql)
            },
            {
              name: "marker drift",
              apply: () => driftSql`
                UPDATE app_state_readiness_markers
                SET contract_version = 2
                WHERE state_id = 'primary'
              `,
              restore: async () => undefined
            },
            {
              name: "migration drift",
              apply: () => driftSql`DELETE FROM auth_schema_migrations WHERE version = 4`,
              restore: () => driftSql`
                INSERT INTO auth_schema_migrations (version, applied_at)
                VALUES (4, NOW())
                ON CONFLICT (version) DO NOTHING
              `
            }
          ];

          for (const [index, drift] of driftCases.entries()) {
            await assertStrictStorageReady(true);
            const beforeDrift = await readState(sql);
            const driftMessage = {
              ...message,
              content: `Capability drift sentinel ${index}`,
              created_at: `2026-08-12T01:2${index}:00.000Z`,
              id: `integration-capability-drift-${index}`
            };
            let driftStarted = false;
            try {
              // Relation-lock ordering separately proves that concurrent DDL waits for an
              // in-flight writer. Commit the drift first here so this case instead proves
              // that every new partial writer revalidates its current capability.
              driftStarted = true;
              await drift.apply();
              await assertStrictStorageReady(false);
              const writerOutcome = await runWorker("write-message", driftMessage);
              assert.equal(
                writerOutcome.exitCode,
                1,
                `${drift.name}: writer must fail closed`
              );
              const afterDrift = await readState(sql);
              assert.equal(afterDrift.revision, beforeDrift.revision, drift.name);
              assert.equal(
                arrayFromPayload(afterDrift.payload, "ai_tutor_messages")
                  .some((candidate) => candidate.id === driftMessage.id),
                false,
                drift.name
              );
              assert.equal(
                (await sql<Array<{ count: number }>>`
                  SELECT COUNT(*)::int AS count
                  FROM ai_tutor_message_journal
                  WHERE id = ${driftMessage.id}
                `)[0]?.count,
                0,
                drift.name
              );
            } finally {
              if (driftStarted) {
                await drift.restore();
                await runSuccessfulWorker("reattest-readiness");
                await assertStrictStorageReady(true);
              }
            }
          }
        } finally {
          await driftSql.end({ timeout: 5 });
        }

        const fullWriterFaultCases = [
          {
            mode: "suppress-returning",
            rejectedAt: "returning-received",
            stages: [
              "capability-acquired",
              "update-executing",
              "returning-received"
            ]
          },
          {
            mode: "rewrite-returning",
            rejectedAt: "returning-received",
            stages: [
              "capability-acquired",
              "update-executing",
              "returning-received"
            ]
          },
          {
            mode: "post-returning-drift",
            rejectedAt: "final-reread-received",
            stages: [
              "capability-acquired",
              "update-executing",
              "returning-received",
              "returning-validated",
              "final-reread-executing",
              "final-reread-received"
            ]
          }
        ] as const;

        for (const fault of fullWriterFaultCases) {
          await assertStrictStorageReady(true);
          const beforeFaultState = await readStateEvidence(sql);
          const beforeFaultMarker = await readStorageReadinessMarkerEvidence(sql);
          assert.equal(beforeFaultMarker.length, 1);
          assert.deepEqual(
            await runSuccessfulWorker("full-snapshot-fault", { mode: fault.mode }),
            {
              rejected: true,
              rejectedAt: fault.rejectedAt,
              stages: fault.stages
            },
            fault.mode
          );
          assert.deepEqual(await readStateEvidence(sql), beforeFaultState, fault.mode);
          assert.deepEqual(
            await readStorageReadinessMarkerEvidence(sql),
            beforeFaultMarker,
            fault.mode
          );
          await assertStrictStorageReady(true);
        }

        const beforeValidFullWrite = await readState(sql);
        assert.deepEqual(
          await runSuccessfulWorker("full-snapshot-rewrite"),
          { rewritten: true }
        );
        const afterValidFullWrite = await readState(sql);
        assert.equal(
          Number(afterValidFullWrite.revision),
          Number(beforeValidFullWrite.revision) + 1
        );
        await assertStrictStorageReady(true);

        const canonicalStateRows = await sql<Array<{
          payload: unknown;
          revision: string;
          updated_at: string;
        }>>`
          SELECT payload, revision::text AS revision, updated_at::text AS updated_at
          FROM public.app_state
          WHERE id = 'primary'
            AND tenant_id = 'platform'
            AND state_kind = 'app-snapshot'
            AND schema_version = 1
        `;
        assert.equal(canonicalStateRows.length, 1);
        const canonicalState = canonicalStateRows[0];
        assert.ok(canonicalState);
        const canonicalEvidence = await readStateEvidence(sql);
        let malformedStateInstalled = false;
        try {
          await sql`
            UPDATE public.app_state
            SET payload = '{}'::jsonb,
                revision = revision + 1,
                updated_at = NOW()
            WHERE id = 'primary'
              AND tenant_id = 'platform'
              AND state_kind = 'app-snapshot'
              AND schema_version = 1
          `;
          malformedStateInstalled = true;
          const malformedEvidence = await readStateEvidence(sql);
          assert.equal(await readStorageReadinessMarkerCount(sql), 0);

          const malformedSentinelMessage = {
            ...message,
            content: "Malformed storage must remain fail closed",
            created_at: "2026-08-12T01:40:00.000Z",
            id: "integration-malformed-storage-message"
          };
          const malformedOperations = [
            { command: "read-full-snapshot", input: {} },
            { command: "full-snapshot-rewrite", input: {} },
            { command: "write-message", input: malformedSentinelMessage }
          ];
          for (const operation of malformedOperations) {
            const outcome = await runWorker(operation.command, operation.input);
            assert.equal(outcome.exitCode, 1, `${operation.command} must reject malformed state`);
            assert.match(
              String(outcome.result.error),
              /incomplete|readiness|migration validation/i,
              `${operation.command} must report a stable fail-closed storage error`
            );
            assert.deepEqual(
              await readStateEvidence(sql),
              malformedEvidence,
              `${operation.command} must not rewrite malformed payload or metadata`
            );
            assert.equal(
              await readStorageReadinessMarkerCount(sql),
              0,
              `${operation.command} must not attest malformed state`
            );
          }
          assert.equal(
            (await sql<Array<{ count: number }>>`
              SELECT COUNT(*)::int AS count
              FROM public.ai_tutor_message_journal
              WHERE id = ${malformedSentinelMessage.id}
            `)[0]?.count,
            0,
            "partial writers must not persist a journal row against malformed state"
          );
        } finally {
          if (malformedStateInstalled) {
            await sql`
              UPDATE public.app_state
              SET payload = ${sql.json(postgresJson(canonicalState.payload))}::jsonb,
                  revision = ${canonicalState.revision}::bigint,
                  updated_at = ${canonicalState.updated_at}::timestamptz
              WHERE id = 'primary'
                AND tenant_id = 'platform'
                AND state_kind = 'app-snapshot'
                AND schema_version = 1
            `;
            const restoredEvidence = await readStateEvidence(sql);
            const markerCountBeforeReattestation = await readStorageReadinessMarkerCount(sql);
            const reattestation = await runSuccessfulWorker("reattest-readiness");
            assert.deepEqual(restoredEvidence, canonicalEvidence);
            assert.equal(markerCountBeforeReattestation, 0);
            assert.deepEqual(reattestation, { reattested: true });
          }
        }
        await assertStrictStorageReady(true);
      });

      await t.test("guardian invitation reads stay no-write and the next full writer persists fail-closed repair", async () => {
        const baselineRows = await sql<Array<{
          payload: unknown;
          revision: string;
          updated_at: string;
        }>>`
          SELECT payload, revision::text AS revision, updated_at::text AS updated_at
          FROM public.app_state
          WHERE id = 'primary'
            AND tenant_id = 'platform'
            AND state_kind = 'app-snapshot'
            AND schema_version = 1
        `;
        assert.equal(baselineRows.length, 1);
        const baseline = baselineRows[0];
        assert.ok(baseline?.payload && typeof baseline.payload === "object");
        const firstDigest = guardianInvitationDigest(`MAIS-${"A".repeat(24)}`);
        const secondDigest = guardianInvitationDigest(`MAIS-${"B".repeat(24)}`);
        const independentDigest = guardianInvitationDigest(`MAIS-${"C".repeat(24)}`);
        const expectedProjection = [{
          id: "postgres-independent-authority",
          studentId: "postgres-student-independent",
          version: 1
        }];
        let stateChanged = false;

        try {
          const safelySanitizablePayload = structuredClone(
            baseline.payload
          ) as Record<string, unknown>;
          safelySanitizablePayload.guardian_invitations = [
            {
              id: "postgres-shared-authority",
              student_id: "postgres-student-quarantined",
              version: 1,
              token_digest: firstDigest,
              expires_at: "2026-08-28T10:00:00.000Z",
              consumed_at: null,
              consumed_by_parent_id: null,
              consumed_relationship: null,
              consumed_link_id: null,
              revoked_at: null,
              created_by: "postgres-teacher-a",
              created_at: "2026-08-25T10:00:00.000Z"
            },
            {
              id: "postgres-shared-authority",
              version: 2,
              token_digest: secondDigest,
              expires_at: "not-an-iso-timestamp",
              created_by: "postgres-teacher-a",
              created_at: "2026-08-25T11:00:00.000Z"
            },
            {
              id: "postgres-independent-authority",
              student_id: "postgres-student-independent",
              version: 1,
              token_digest: independentDigest.toUpperCase(),
              expires_at: "2026-08-28T10:00:00.000Z",
              consumed_at: null,
              consumed_by_parent_id: null,
              consumed_relationship: null,
              consumed_link_id: null,
              revoked_at: null,
              created_by: "postgres-teacher-b",
              created_at: "2026-08-25T10:00:00.000Z"
            }
          ];
          await sql`
            UPDATE public.app_state
            SET payload = ${sql.json(postgresJson(safelySanitizablePayload))}::jsonb,
                revision = revision + 1,
                updated_at = NOW()
            WHERE id = 'primary'
              AND tenant_id = 'platform'
              AND state_kind = 'app-snapshot'
              AND schema_version = 1
          `;
          stateChanged = true;
          assert.equal(await readStorageReadinessMarkerCount(sql), 0);
          assert.deepEqual(await runSuccessfulWorker("reattest-readiness"), {
            reattested: true
          });

          const beforeRead = await readStateEvidence(sql);
          const markerBeforeRead = await readStorageReadinessMarkerEvidence(sql);
          assert.equal(markerBeforeRead.length, 1);
          assert.deepEqual(
            await runSuccessfulWorker("guardian-invitation-read"),
            { invitations: expectedProjection }
          );
          assert.deepEqual(
            await readStateEvidence(sql),
            beforeRead,
            "a safely sanitized PostgreSQL read must not rewrite app_state metadata or payload"
          );
          assert.deepEqual(
            await readStorageReadinessMarkerEvidence(sql),
            markerBeforeRead,
            "a safely sanitized PostgreSQL read must not refresh readiness metadata"
          );

          const beforeRepair = await readState(sql);
          assert.deepEqual(await runSuccessfulWorker("full-snapshot-rewrite"), {
            rewritten: true
          });
          const repaired = await readState(sql);
          assert.equal(Number(repaired.revision), Number(beforeRepair.revision) + 1);
          assert.deepEqual(arrayFromPayload(repaired.payload, "guardian_invitations"), [{
            id: "postgres-independent-authority",
            student_id: "postgres-student-independent",
            version: 1,
            token_digest: independentDigest,
            expires_at: "2026-08-28T10:00:00.000Z",
            consumed_at: null,
            consumed_by_parent_id: null,
            consumed_relationship: null,
            consumed_link_id: null,
            revoked_at: null,
            created_by: "postgres-teacher-b",
            created_at: "2026-08-25T10:00:00.000Z"
          }]);
          await assertStrictStorageReady(true);

          const nonArrayPayload = structuredClone(repaired.payload);
          nonArrayPayload.guardian_invitations = "legacy-plaintext-collection";
          await sql`
            UPDATE public.app_state
            SET payload = ${sql.json(postgresJson(nonArrayPayload))}::jsonb,
                revision = revision + 1,
                updated_at = NOW()
            WHERE id = 'primary'
              AND tenant_id = 'platform'
              AND state_kind = 'app-snapshot'
              AND schema_version = 1
          `;
          const nonArrayEvidence = await readStateEvidence(sql);
          assert.equal(await readStorageReadinessMarkerCount(sql), 0);
          const rejectedRead = await runWorker("guardian-invitation-read");
          assert.equal(rejectedRead.exitCode, 1);
          assert.match(String(rejectedRead.result.error), /snapshot is incomplete/u);
          assert.deepEqual(await readStateEvidence(sql), nonArrayEvidence);
          assert.equal(await readStorageReadinessMarkerCount(sql), 0);
        } finally {
          if (stateChanged) {
            await sql`
              UPDATE public.app_state
              SET payload = ${sql.json(postgresJson(baseline.payload))}::jsonb,
                  revision = ${baseline.revision}::bigint,
                  updated_at = ${baseline.updated_at}::timestamptz
              WHERE id = 'primary'
                AND tenant_id = 'platform'
                AND state_kind = 'app-snapshot'
                AND schema_version = 1
            `;
            assert.equal(await readStorageReadinessMarkerCount(sql), 0);
            assert.deepEqual(await runSuccessfulWorker("reattest-readiness"), {
              reattested: true
            });
          }
        }
        await assertStrictStorageReady(true);
      });

      await t.test("the persistent compatibility trigger preserves v2 rollback and v4 roll-forward visibility", async () => {
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
          SET payload = ${sql.json(postgresJson(rollbackPayload))}::jsonb,
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
          SET payload = ${sql.json(postgresJson(conflictPayload))}::jsonb,
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

      await t.test("session reset dual-writes revision and token use, supports flag-off fallback, and rolls back atomically", async () => {
        const before = await readState(sql);
        const fixtureUser = arrayFromPayload(before.payload, "users")
          .find((record) => record.id === studentId);
        assert.ok(fixtureUser);
        const identifier = typeof fixtureUser.username === "string"
          ? fixtureUser.username
          : typeof fixtureUser.email === "string"
            ? fixtureUser.email
            : "";
        assert.ok(identifier);

        const reset = await runSuccessfulWorker("session-reset", { identifier, userId: studentId });
        assert.equal(reset.oldSessionRejected, true);
        assert.equal(reset.replacementSessionAccepted, true);
        assert.equal(reset.replayRejected, true);
        assert.equal(Number(reset.resetRevision), Number(reset.beforeRevision) + 1);

        const afterReset = await readState(sql);
        const snapshotUser = arrayFromPayload(afterReset.payload, "users")
          .find((record) => record.id === studentId);
        assert.equal(snapshotUser?.session_revision, reset.resetRevision);
        const snapshotTokens = arrayFromPayload(afterReset.payload, "password_reset_tokens")
          .filter((record) => record.user_id === studentId)
          .sort((left, right) => String(left.created_at).localeCompare(String(right.created_at)));
        assert.ok(snapshotTokens.length > 0);
        assert.equal(typeof snapshotTokens.at(-1)?.used_at, "string");

        const hotState = await sql<Array<{
          session_revision: number;
          used_tokens: number;
        }>>`
          SELECT
            auth_user.session_revision,
            (
              SELECT COUNT(*)::int
              FROM auth_password_reset_tokens
              WHERE user_id = ${studentId}
                AND used_at IS NOT NULL
            ) AS used_tokens
          FROM auth_users AS auth_user
          WHERE auth_user.id = ${studentId}
        `;
        assert.equal(hotState[0]?.session_revision, reset.resetRevision);
        assert.ok((hotState[0]?.used_tokens ?? 0) > 0);

        const flagOff = await runSuccessfulWorker(
          "session-flag-off",
          { sessionRevision: reset.resetRevision, userId: studentId },
          { hotAuthTables: false }
        );
        assert.deepEqual(flagOff, {
          activeRevision: reset.resetRevision,
          authenticated: true
        });

        const rollback = await runSuccessfulWorker("session-reset-rollback", {
          identifier,
          userId: studentId
        });
        assert.deepEqual(rollback, {
          resetRolledBack: true,
          stateExact: true,
          markerExact: true,
          authExact: true,
          tokensExact: true,
          cleanupSymmetric: true,
          fullRewriteDidNotResurrect: true
        });

        const malformedExpiry = await runSuccessfulWorker("session-reset-malformed-expiry", {
          userId: studentId
        });
        assert.deepEqual(malformedExpiry, {
          resetRejected: true,
          revisionUnchanged: true,
          tokenStillUnused: true
        });
      });

      await t.test("invalid v2 classroom source rolls back migration and never writes the v4 marker", async () => {
        await assertStrictStorageReady(true);
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
            ${sql.json(postgresJson(payload))}::jsonb, NOW()
          )
        `;
        await sql`INSERT INTO auth_schema_migrations (version) VALUES (2)`;

        const readiness = await runWorker("readiness");
        assert.equal(readiness.exitCode, 1);
        assert.match(String(readiness.result.error), /classroom source data failed migration validation/i);
        assert.match(String(readiness.result.error), /policy_records_valid/i);
        const markerRows = await sql<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS count FROM auth_schema_migrations WHERE version = 4
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
          "failed migration must roll back its v4-only tables"
        );
        const strictReadiness = await runWorker("strict-readiness");
        assert.equal(
          strictReadiness.exitCode,
          1,
          "strict durable readiness must fail closed when a canonical relation is absent"
        );
        assert.match(
          String(strictReadiness.result.error),
          /relation "public\.[a-z0-9_]+" does not exist/iu
        );

        payload.class_enrollments = arrayFromPayload(payload, "class_enrollments")
          .filter((record) => record.id !== "integration-orphan-enrollment");
        payload.class_ai_tutor_policies = arrayFromPayload(payload, "class_ai_tutor_policies")
          .map((record) => record.class_id === restrictedClassId
            ? { ...record, mode: "fallback-only" }
            : record);
        await sql`
          UPDATE app_state SET payload = ${sql.json(postgresJson(payload))}::jsonb WHERE id = 'primary'
        `;
        const retry = await runSuccessfulWorker("readiness");
        assert.equal(retry.schemaReady, true, "a corrected fixture must pass on a new readiness attempt");
        await assertStrictStorageReady(true);
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
