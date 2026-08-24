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

function settlePostgresLockOrderProbePromise<T>(promise: Promise<T>) {
  return promise.then(
    (value) => ({ status: "fulfilled" as const, value }),
    (reason: unknown) => ({ status: "rejected" as const, reason })
  );
}

const postgresAuthorityWorkerStagePrefix = "OUTBOX_PG_AUTHORITY_STAGE=";
const postgresAuthorityWorkerStages = [
  "schema-ready",
  "conflict-co-teacher-viewer-complete",
  "conflict-active-revoked-complete",
  "authority-reset",
  "evidence-attempt-queued",
  "evidence-cutoff-queued",
  "evidence-mutated",
  "evidence-sweep-complete",
  "complete"
] as const;
type PostgresAuthorityWorkerStage = typeof postgresAuthorityWorkerStages[number];
type PostgresAuthorityWorkerStageTracker = {
  observeLine: (line: string) => boolean;
  getLastStage: () => PostgresAuthorityWorkerStage | null;
};
type PostgresAuthorityWorkerTimerScheduler = {
  set: (callback: () => void, delayMs: number) => unknown;
  clear: (handle: unknown) => void;
};
type PostgresAuthorityWorkerWatchdog = {
  recordProgress: () => boolean;
  settle: () => boolean;
};

const postgresOutboxMigrationWorkerStagePrefix = "OUTBOX_PG_MIGRATION_STAGE=";
const postgresOutboxMigrationWorkerStages = [
  "process-started",
  "import-ready",
  "migration-started",
  "migration-complete"
] as const;
type PostgresOutboxMigrationWorkerStage = typeof postgresOutboxMigrationWorkerStages[number];
type PostgresOutboxMigrationWorkerController = {
  ready: Promise<void>;
  result: Promise<void>;
  start: () => void;
  terminate: () => void;
};

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function postgresOutboxMigrationWorkerSafeStageSummary(stage: unknown) {
  if (
    typeof stage === "string" &&
    postgresOutboxMigrationWorkerStages.includes(stage as PostgresOutboxMigrationWorkerStage)
  ) {
    return `after stage ${stage}`;
  }
  return "before the first allowlisted stage";
}

async function runPostgresOutboxMigrationWorkersTogether(
  workers: PostgresOutboxMigrationWorkerController[]
) {
  const results = workers.map((worker) => worker.result);
  for (const result of results) void result.catch(() => undefined);
  try {
    await Promise.all(workers.map((worker) => worker.ready));
    for (const worker of workers) worker.start();
    await Promise.all(results);
  } catch (error) {
    for (const worker of workers) worker.terminate();
    await Promise.allSettled(results);
    throw error;
  }
}

function postgresAuthorityWorkerSafeStageSummary(stage: unknown) {
  if (
    typeof stage === "string" &&
    postgresAuthorityWorkerStages.includes(stage as PostgresAuthorityWorkerStage)
  ) {
    return `after stage ${stage}`;
  }
  return "before the first allowlisted stage";
}

function postgresAuthorityWorkerSafeErrorName(value: unknown) {
  const allowedNames = new Set([
    "Error",
    "TypeError",
    "RangeError",
    "PostgresError",
    "TeacherNoticeEmailOutboxDeadlineError"
  ]);
  const candidate = value instanceof Error
    ? value.name
    : typeof value === "string"
      ? /^([A-Za-z][A-Za-z0-9]*):(?:\s|$)/u.exec(value.trimStart())?.[1]
      : undefined;
  return candidate && allowedNames.has(candidate) ? candidate : "WorkerError";
}

function createPostgresAuthorityWorkerStageTracker(
  onProgress: (stage: PostgresAuthorityWorkerStage) => void
): PostgresAuthorityWorkerStageTracker {
  let nextStageIndex = 0;
  let lastStage: PostgresAuthorityWorkerStage | null = null;
  return {
    observeLine(line) {
      const expectedStage = postgresAuthorityWorkerStages[nextStageIndex];
      if (expectedStage === undefined || line !== `${postgresAuthorityWorkerStagePrefix}${expectedStage}`) {
        return false;
      }
      nextStageIndex += 1;
      lastStage = expectedStage;
      onProgress(expectedStage);
      return true;
    },
    getLastStage() {
      return lastStage;
    }
  };
}

function createPostgresAuthorityWorkerWatchdog(options: {
  inactivityTimeoutMs: number;
  hardTimeoutMs: number;
  onTimeout: (kind: "inactivity" | "hard") => void;
  scheduler?: PostgresAuthorityWorkerTimerScheduler;
}): PostgresAuthorityWorkerWatchdog {
  const { inactivityTimeoutMs, hardTimeoutMs, onTimeout } = options;
  if (!Number.isSafeInteger(inactivityTimeoutMs) || inactivityTimeoutMs <= 0) {
    throw new Error("PostgreSQL authority worker inactivity timeout must be a positive integer.");
  }
  if (!Number.isSafeInteger(hardTimeoutMs) || hardTimeoutMs <= 0) {
    throw new Error("PostgreSQL authority worker hard timeout must be a positive integer.");
  }
  if (inactivityTimeoutMs >= hardTimeoutMs) {
    throw new Error("PostgreSQL authority worker inactivity timeout must be shorter than its hard timeout.");
  }
  const scheduler = options.scheduler ?? {
    set: (callback: () => void, delayMs: number) => setTimeout(callback, delayMs),
    clear: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>)
  };
  let settled = false;
  let inactivityHandle: unknown;
  let hardHandle: unknown;
  const clearTimers = () => {
    if (inactivityHandle !== undefined) scheduler.clear(inactivityHandle);
    if (hardHandle !== undefined) scheduler.clear(hardHandle);
    inactivityHandle = undefined;
    hardHandle = undefined;
  };
  const timeOut = (kind: "inactivity" | "hard") => {
    if (settled) return;
    settled = true;
    clearTimers();
    onTimeout(kind);
  };
  const armInactivityTimer = () => scheduler.set(
    () => timeOut("inactivity"),
    inactivityTimeoutMs
  );
  inactivityHandle = armInactivityTimer();
  hardHandle = scheduler.set(() => timeOut("hard"), hardTimeoutMs);
  return {
    recordProgress() {
      if (settled) return false;
      if (inactivityHandle !== undefined) scheduler.clear(inactivityHandle);
      inactivityHandle = armInactivityTimer();
      return true;
    },
    settle() {
      if (settled) return false;
      settled = true;
      clearTimers();
      return true;
    }
  };
}

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

test("lock-order probe promise settlement observes both outcomes without a late rejection handler", async () => {
  const expectedError = new Error("fixture rejection");
  const rejected = settlePostgresLockOrderProbePromise(Promise.reject(expectedError));
  const fulfilled = settlePostgresLockOrderProbePromise(Promise.resolve("fixture value"));

  assert.deepEqual(await rejected, { status: "rejected", reason: expectedError });
  assert.deepEqual(await fulfilled, { status: "fulfilled", value: "fixture value" });
});

test("authority worker stage tracking accepts only the fixed next allowlisted stage", () => {
  const progress: PostgresAuthorityWorkerStage[] = [];
  const tracker = createPostgresAuthorityWorkerStageTracker((stage) => progress.push(stage));

  assert.equal(tracker.observeLine(`${postgresAuthorityWorkerStagePrefix}unknown-stage`), false);
  assert.equal(tracker.getLastStage(), null);
  assert.equal(tracker.observeLine(`${postgresAuthorityWorkerStagePrefix}schema-ready`), true);
  assert.equal(tracker.observeLine(`${postgresAuthorityWorkerStagePrefix}schema-ready`), false);
  assert.equal(tracker.observeLine(`${postgresAuthorityWorkerStagePrefix}authority-reset`), false);
  assert.equal(tracker.getLastStage(), "schema-ready");
  for (const stage of postgresAuthorityWorkerStages.slice(1)) {
    assert.equal(tracker.observeLine(`${postgresAuthorityWorkerStagePrefix}${stage}`), true);
  }
  assert.deepEqual(progress, postgresAuthorityWorkerStages);
  assert.equal(tracker.getLastStage(), "complete");
});

test("authority worker watchdog resets only inactivity, preserves its hard cap, and settles once", () => {
  let now = 0;
  let nextHandle = 1;
  const timers = new Map<number, { callback: () => void; at: number }>();
  const scheduler: PostgresAuthorityWorkerTimerScheduler = {
    set: (callback, delayMs) => {
      const handle = nextHandle++;
      timers.set(handle, { callback, at: now + delayMs });
      return handle;
    },
    clear: (handle) => { timers.delete(Number(handle)); }
  };
  const advance = (durationMs: number) => {
    now += durationMs;
    while (true) {
      const due = Array.from(timers.entries())
        .filter(([, timer]) => timer.at <= now)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
      if (!due) break;
      timers.delete(due[0]);
      due[1].callback();
    }
  };
  const timeouts: Array<"inactivity" | "hard"> = [];
  const watchdog = createPostgresAuthorityWorkerWatchdog({
    inactivityTimeoutMs: 75,
    hardTimeoutMs: 240,
    onTimeout: (kind) => timeouts.push(kind),
    scheduler
  });

  advance(70);
  assert.equal(watchdog.recordProgress(), true);
  advance(70);
  assert.equal(watchdog.recordProgress(), true);
  advance(70);
  assert.equal(watchdog.recordProgress(), true);
  advance(30);
  assert.deepEqual(timeouts, ["hard"]);
  assert.equal(watchdog.recordProgress(), false);
  assert.equal(watchdog.settle(), false);
  advance(1_000);
  assert.deepEqual(timeouts, ["hard"]);

  assert.throws(() => createPostgresAuthorityWorkerWatchdog({
    inactivityTimeoutMs: 240,
    hardTimeoutMs: 240,
    onTimeout: () => undefined,
    scheduler
  }), /inactivity.*hard/i);
});

test("migration workers start together only after every cold import is ready and all settle on failure", async () => {
  const readyOne = createDeferred<void>();
  const readyTwo = createDeferred<void>();
  const resultOne = createDeferred<void>();
  const resultTwo = createDeferred<void>();
  const starts: number[] = [];
  const terminated: number[] = [];
  const workers: PostgresOutboxMigrationWorkerController[] = [
    {
      ready: readyOne.promise,
      result: resultOne.promise,
      start: () => starts.push(1),
      terminate: () => {
        terminated.push(1);
        resultOne.resolve();
      }
    },
    {
      ready: readyTwo.promise,
      result: resultTwo.promise,
      start: () => starts.push(2),
      terminate: () => {
        terminated.push(2);
        resultTwo.resolve();
      }
    }
  ];

  const coordinated = runPostgresOutboxMigrationWorkersTogether(workers);
  readyOne.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(starts, [], "a fast import must wait for every independent worker");
  readyTwo.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(starts, [1, 2], "migration begins only after the shared readiness barrier");
  const expectedError = new Error("fixture migration failure");
  resultOne.reject(expectedError);
  await assert.rejects(coordinated, (error: unknown) => error === expectedError);
  assert.deepEqual(terminated, [1, 2], "a failed cohort must terminate and settle every child");
});

test("migration worker readiness rejection starts none and cleans the full cohort", async () => {
  const expectedError = new Error("fixture import failure");
  const firstReady = createDeferred<void>();
  const secondReady = createDeferred<void>();
  const firstResult = createDeferred<void>();
  const secondResult = createDeferred<void>();
  const starts: number[] = [];
  const terminated: number[] = [];
  const worker = (
    id: number,
    ready: Promise<void>,
    result: ReturnType<typeof createDeferred<void>>
  ): PostgresOutboxMigrationWorkerController => ({
    ready,
    result: result.promise,
    start: () => starts.push(id),
    terminate: () => {
      terminated.push(id);
      result.resolve();
    }
  });
  const coordinated = runPostgresOutboxMigrationWorkersTogether([
    worker(1, firstReady.promise, firstResult),
    worker(2, secondReady.promise, secondResult)
  ]);

  firstReady.reject(expectedError);
  await assert.rejects(coordinated, (error: unknown) => error === expectedError);
  assert.deepEqual(starts, [], "no migration may start before the readiness barrier succeeds");
  assert.deepEqual(terminated, [1, 2], "readiness failure must clean every child");
});

test("migration worker synchronous start failure terminates and settles the full cohort", async () => {
  const expectedError = new Error("fixture start failure");
  const results = [
    createDeferred<void>(),
    createDeferred<void>(),
    createDeferred<void>()
  ];
  const starts: number[] = [];
  const terminated: number[] = [];
  const workers = results.map((result, index): PostgresOutboxMigrationWorkerController => {
    const id = index + 1;
    return {
      ready: Promise.resolve(),
      result: result.promise,
      start: () => {
        starts.push(id);
        if (id === 2) throw expectedError;
      },
      terminate: () => {
        terminated.push(id);
        result.resolve();
      }
    };
  });

  await assert.rejects(
    runPostgresOutboxMigrationWorkersTogether(workers),
    (error: unknown) => error === expectedError
  );
  assert.deepEqual(starts, [1, 2], "the coordinator must stop dispatching after start fails");
  assert.deepEqual(terminated, [1, 2, 3], "start failure must clean even an undispatched child");
});

test("single migration worker delegates ready, start, and cleanup to the guarded coordinator", async () => {
  const source = await readFile(path.join(
    process.cwd(),
    "lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts"
  ), "utf8");
  const wrapperStart = source.lastIndexOf("\nfunction runPostgresOutboxMigrationWorker(");
  const wrapperEnd = source.indexOf("\nfunction runPostgresAlterTableBarrierWorker(", wrapperStart);
  assert.ok(wrapperStart >= 0 && wrapperEnd > wrapperStart, "single migration wrapper is missing");
  const wrapper = source.slice(wrapperStart, wrapperEnd);

  assert.match(
    wrapper,
    /return runPostgresOutboxMigrationWorkersTogether\(\[worker\]\)/u,
    "the single-worker path must use the same guarded lifecycle as a concurrent cohort"
  );
  assert.doesNotMatch(
    wrapper,
    /void worker\.ready\.then/u,
    "a floating ready continuation can turn a synchronous start error into an unhandled rejection"
  );
});

test("migration worker stage summaries expose only fixed protocol progress", () => {
  assert.equal(
    postgresOutboxMigrationWorkerSafeStageSummary("import-ready"),
    "after stage import-ready"
  );
  for (const unsafeStage of [null, "unknown", "migration-started\nprivate detail", 1]) {
    assert.equal(
      postgresOutboxMigrationWorkerSafeStageSummary(unsafeStage),
      "before the first allowlisted stage"
    );
  }
});

test("authority worker failure summaries accept only an allowlisted stage", () => {
  assert.equal(
    postgresAuthorityWorkerSafeStageSummary("evidence-mutated"),
    "after stage evidence-mutated"
  );
  for (const unsafeStage of [null, undefined, "unknown-stage", "evidence-mutated\nraw diagnostic", 1]) {
    assert.equal(
      postgresAuthorityWorkerSafeStageSummary(unsafeStage),
      "before the first allowlisted stage"
    );
  }
});

test("authority worker error classification never returns raw stderr", () => {
  assert.equal(
    postgresAuthorityWorkerSafeErrorName("PostgresError: lock timeout on private row"),
    "PostgresError"
  );
  assert.equal(
    postgresAuthorityWorkerSafeErrorName(new TypeError("private fixture detail")),
    "TypeError"
  );
  for (const unsafeError of [
    "FamilySecretError: guardian-raw-id",
    "postgreserror: lower-case spoof",
    "PostgresErrorWithoutDelimiter private detail",
    { name: "PostgresError", message: "not an Error instance" },
    null
  ]) {
    const name = postgresAuthorityWorkerSafeErrorName(unsafeError);
    assert.equal(name, "WorkerError");
    assert.doesNotMatch(name, /guardian|private|secret|spoof/i);
  }
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
      const safeStages = new Set(${JSON.stringify(postgresAuthorityWorkerStages)});
      const emitStage = (stage) => {
        if (!safeStages.has(stage)) throw new Error("invalid authority worker stage");
        process.stdout.write("${postgresAuthorityWorkerStagePrefix}" + stage + "\\n");
      };
      const sql = postgres(process.env.POSTGRES_URL, {
        connect_timeout: 5,
        idle_timeout: 5,
        max: 1,
        onnotice: () => undefined,
        prepare: false
      });
      await store.__userStoreAiTutorPostgresTestHooks.ensureSchema();
      emitStage("schema-ready");
      const replaceAuthorityConflict = async (records) => {
        const stateRows = await sql.unsafe("SELECT payload FROM public.app_state WHERE id = 'primary'");
        if (stateRows.length !== 1) throw new Error("fixture app_state is unavailable");
        const payloadValue = stateRows[0].payload;
        const payload = typeof payloadValue === "string" ? JSON.parse(payloadValue) : payloadValue;
        payload.teacher_class_collaborators = payload.teacher_class_collaborators
          .filter((record) => !String(record.id).startsWith("pg-outbox-collaborator-"));
        payload.teacher_class_collaborators.push(...records);
        await sql.unsafe(
          "UPDATE public.app_state SET payload = $1::pg_catalog.text::pg_catalog.jsonb, revision = revision + 1 WHERE id = 'primary'",
          [JSON.stringify(payload)]
        );
        await store.__userStorePostgresStorageReadinessTestHooks.reattestCurrentSnapshot();
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
      emitStage("conflict-co-teacher-viewer-complete");
      const activeRevoked = await runConflict("active-revoked", [
        { id: "pg-outbox-collaborator-active", class_id: "class-s3a-2026", teacher_id: "teacher-ms-chan", role: "co-teacher", status: "active" },
        { id: "pg-outbox-collaborator-revoked", class_id: "class-s3a-2026", teacher_id: "teacher-ms-chan", role: "co-teacher", status: "revoked" }
      ]);
      emitStage("conflict-active-revoked-complete");
      await replaceAuthorityConflict([]);
      emitStage("authority-reset");
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
      emitStage("evidence-attempt-queued");
      const deliveryCutoffNoticeId = await queueEvidenceFixture("delivery-cutoff");
      emitStage("evidence-cutoff-queued");
      const attemptProviderId = "11111111-1111-4111-8111-111111111111";
      const attemptCompletedAt = "2026-08-23T00:01:00.000Z";
      const cutoffProviderId = "22222222-2222-4222-8222-222222222222";
      const cutoffCompletedAt = "2026-08-23T00:02:00.000Z";
      store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.claimOperationWrapper = async (
        transactionSql,
        operation
      ) => {
        const constraintRows = await transactionSql.unsafe(
          "SELECT pg_catalog.pg_get_constraintdef(constraint_record.oid, false) AS definition " +
          "FROM pg_catalog.pg_constraint AS constraint_record " +
          "JOIN pg_catalog.pg_class AS relation ON relation.oid = constraint_record.conrelid " +
          "JOIN pg_catalog.pg_namespace AS relation_namespace ON relation_namespace.oid = relation.relnamespace " +
          "WHERE relation_namespace.nspname = 'public' " +
          "AND relation.relname = 'teacher_notice_email_outbox' " +
          "AND constraint_record.conname = 'teacher_notice_email_outbox_state_fields_ck' " +
          "AND constraint_record.contype = 'c' " +
          "AND constraint_record.convalidated = TRUE"
        );
        const definition = constraintRows[0] && constraintRows[0].definition;
        if (
          constraintRows.length !== 1 ||
          typeof definition !== "string" ||
          !definition.startsWith("CHECK (") ||
          !definition.endsWith(")") ||
          definition.includes(";")
        ) {
          throw new Error("fixture state-fields constraint definition is unavailable");
        }
        await transactionSql.unsafe(
          "ALTER TABLE public.teacher_notice_email_outbox DROP CONSTRAINT teacher_notice_email_outbox_state_fields_ck"
        );
        await transactionSql.unsafe(
          "UPDATE public.teacher_notice_email_outbox SET status = 'leased', attempt_count = 8, first_enqueued_at = pg_catalog.now(), next_attempt_at = pg_catalog.now(), lease_token = $2, lease_expires_at = pg_catalog.now() - INTERVAL '1 minute', provider_message_id = $3, last_http_status = 202, completed_at = $4::pg_catalog.timestamptz WHERE notice_id = $1",
          [attemptLimitNoticeId, "11111111-1111-4111-8111-111111111112", attemptProviderId, attemptCompletedAt]
        );
        await transactionSql.unsafe(
          "UPDATE public.teacher_notice_email_outbox SET status = 'leased', attempt_count = 1, first_enqueued_at = pg_catalog.now() - INTERVAL '24 hours', next_attempt_at = pg_catalog.now(), lease_token = $2, lease_expires_at = pg_catalog.now() - INTERVAL '1 minute', provider_message_id = $3, last_http_status = 503, completed_at = $4::pg_catalog.timestamptz WHERE notice_id = $1",
          [deliveryCutoffNoticeId, "22222222-2222-4222-8222-222222222223", cutoffProviderId, cutoffCompletedAt]
        );
        emitStage("evidence-mutated");
        const result = await operation();
        await transactionSql.unsafe(
          "ALTER TABLE public.teacher_notice_email_outbox ADD CONSTRAINT teacher_notice_email_outbox_state_fields_ck " + definition
        );
        return result;
      };
      let evidenceAggregate;
      try {
        evidenceAggregate = await store.deliverTeacherNoticeEmailOutboxBatch(1);
      } finally {
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks
          .claimOperationWrapper = null;
      }
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
      emitStage("evidence-sweep-complete");
      await sql.end({ timeout: 5 });
      emitStage("complete");
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
    let stdoutLineBuffer = "";
    let stderr = "";
    let lastStage: PostgresAuthorityWorkerStage | null = null;
    const safeStageSummary = () => postgresAuthorityWorkerSafeStageSummary(lastStage);
    const safeErrorName = (value: unknown) => postgresAuthorityWorkerSafeErrorName(value);
    let finished = false;
    let watchdog!: PostgresAuthorityWorkerWatchdog;
    const finishOnce = (action: () => void) => {
      if (finished) return false;
      finished = true;
      watchdog.settle();
      action();
      return true;
    };
    watchdog = createPostgresAuthorityWorkerWatchdog({
      inactivityTimeoutMs: 75_000,
      hardTimeoutMs: 240_000,
      onTimeout: (kind) => {
        child.kill("SIGKILL");
        finishOnce(() => reject(new Error(
          `PostgreSQL outbox authority worker ${kind} timeout ${safeStageSummary()}.`
        )));
      }
    });
    const tracker = createPostgresAuthorityWorkerStageTracker((stage) => {
      lastStage = stage;
      watchdog.recordProgress();
    });
    const observeCompleteLines = () => {
      const lines = stdoutLineBuffer.split(/\r?\n/u);
      stdoutLineBuffer = lines.pop() ?? "";
      for (const line of lines) tracker.observeLine(line);
    };
    child.stdout.on("data", (chunk) => {
      const output = String(chunk);
      stdout += output;
      stdoutLineBuffer += output;
      observeCompleteLines();
    });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => {
      finishOnce(() => reject(new Error(
        `PostgreSQL outbox authority worker child error (${safeErrorName(error)}) ${safeStageSummary()}.`
      )));
    });
    child.on("exit", (code) => {
      if (stdoutLineBuffer !== "") {
        tracker.observeLine(stdoutLineBuffer.replace(/\r$/u, ""));
        stdoutLineBuffer = "";
      }
      const marker = stdout.split(/\r?\n/u).find((line) => line.startsWith(resultPrefix));
      if (code !== 0) {
        finishOnce(() => reject(new Error(
          `PostgreSQL outbox authority worker failed (${code}; ${safeErrorName(stderr)}) ${safeStageSummary()}.`
        )));
        return;
      }
      if (!marker) {
        finishOnce(() => reject(new Error(
          `PostgreSQL outbox authority worker failed (MissingResult) ${safeStageSummary()}.`
        )));
        return;
      }
      finishOnce(() => {
        try {
          resolve(JSON.parse(marker.slice(resultPrefix.length)) as Record<string, unknown>);
        } catch (error) {
          reject(new Error(
            `PostgreSQL outbox authority worker returned invalid result JSON (InvalidResult) ${safeStageSummary()}.`
          ));
        }
      });
    });
  });
}

function runPostgresPublicationAtomicityWorker(configuredUrl: string) {
  const resultPrefix = "OUTBOX_PG_PUBLICATION_ATOMICITY_RESULT=";
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
      try {
        await store.__userStoreAiTutorPostgresTestHooks.ensureSchema();
        await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.migrateSchema();
        const created = await store.createTeacherNotice({
          teacherId: "teacher-ms-chan",
          classId: "class-s3a-2026",
          audience: "parents",
          subject: "PostgreSQL publication atomicity fixture",
          body: "Fixture-only rollback evidence."
        });
        if (created.status !== "created") throw new Error("atomicity notice could not be created");
        const noticeId = created.notice.id;
        const capture = async () => {
          const rows = await sql.unsafe(
            "SELECT pg_catalog.jsonb_build_object(" +
              "'state', (SELECT pg_catalog.jsonb_build_object('revision', revision, 'updatedAt', updated_at, 'payloadDigest', pg_catalog.md5(payload::pg_catalog.text)) FROM public.app_state WHERE id = 'primary')," +
              "'marker', (SELECT pg_catalog.jsonb_build_object('revision', state_revision, 'attestedAt', attested_at) FROM public.app_state_readiness_markers WHERE state_id = 'primary')," +
              "'projectionUsersDigest', (SELECT pg_catalog.md5(COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(projected) ORDER BY projected.id), '[]'::pg_catalog.jsonb)::pg_catalog.text) FROM public.projection_users AS projected)," +
              "'outboxDigest', (SELECT pg_catalog.md5(COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(outbox_row) ORDER BY outbox_row.id), '[]'::pg_catalog.jsonb)::pg_catalog.text) FROM public.teacher_notice_email_outbox AS outbox_row WHERE outbox_row.notice_id = $1)" +
            ") AS evidence",
            [noticeId]
          );
          if (rows.length !== 1 || !rows[0].evidence) throw new Error("atomicity evidence is unavailable");
          return JSON.stringify(rows[0].evidence);
        };

        const before = await capture();
        let fullWriterRejected = false;
        store.__userStorePostgresStorageReadinessTestHooks.configureFullWriterFault({
          mode: "post-returning-drift",
          observeStage: () => undefined
        });
        try {
          await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks
            .queueNoticeEmailForAtomicityProbe({ teacherId: "teacher-ms-chan", noticeId });
        } catch {
          fullWriterRejected = true;
        } finally {
          store.__userStorePostgresStorageReadinessTestHooks.clearFullWriterFault();
        }
        const fullWriterRolledBack = await capture() === before;

        let outboxInsertRejected = false;
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.failAfterPublicationOutboxInsert = () => {
          throw new Error("Integration outbox insert failpoint.");
        };
        try {
          await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks
            .queueNoticeEmailForAtomicityProbe({ teacherId: "teacher-ms-chan", noticeId });
        } catch {
          outboxInsertRejected = true;
        } finally {
          store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.failAfterPublicationOutboxInsert = null;
        }
        const outboxInsertRolledBack = await capture() === before;
        process.stdout.write("${resultPrefix}" + JSON.stringify({
          fullWriterRejected,
          fullWriterRolledBack,
          outboxInsertRejected,
          outboxInsertRolledBack
        }) + "\\n", () => process.exit(0));
      } finally {
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.failAfterPublicationOutboxInsert = null;
        store.__userStorePostgresStorageReadinessTestHooks.clearFullWriterFault();
        await sql.end({ timeout: 5 });
        await store.__userStoreAiTutorPostgresTestHooks.closePostgresClients().catch(() => undefined);
      }
    })().catch((error) => {
      process.stderr.write((error instanceof Error ? error.name + ": " + error.message : "worker failed") + "\\n");
      process.exit(1);
    });
  `;
  return new Promise<{
    fullWriterRejected: boolean;
    fullWriterRolledBack: boolean;
    outboxInsertRejected: boolean;
    outboxInsertRolledBack: boolean;
  }>((resolve, reject) => {
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
      reject(new Error("PostgreSQL publication atomicity worker timed out."));
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
        reject(new Error(`PostgreSQL publication atomicity worker failed (${code}): ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(JSON.parse(marker.slice(resultPrefix.length)));
    });
  });
}

function runPostgresPublicationClaimLockOrderWorker(configuredUrl: string) {
  const resultPrefix = "OUTBOX_PG_PUBLICATION_CLAIM_LOCK_ORDER_RESULT=";
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
      const deferred = () => {
        let resolve;
        const promise = new Promise((done) => { resolve = done; });
        return { promise, resolve };
      };
      const settleImmediately = ${settlePostgresLockOrderProbePromise.toString()};
      const waitFor = (promise, label) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(label + " timed out")), 15_000);
        promise.then(
          (value) => { clearTimeout(timeout); resolve(value); },
          (error) => { clearTimeout(timeout); reject(error); }
        );
      });
      const observeExactLockWait = async (waitingPid, holderPid, queryFragment) => {
        for (let attempt = 0; attempt < 400; attempt += 1) {
          const rows = await sql.unsafe(
            "SELECT " +
            "  activity.wait_event_type = 'Lock' " +
            "    AND $2::pg_catalog.int4 = ANY(pg_catalog.pg_blocking_pids(activity.pid)) AS activity_wait, " +
            "  pg_catalog.strpos(activity.query, $3::pg_catalog.text) > 0 AS query_matches, " +
            "  EXISTS (" +
            "    SELECT 1 FROM pg_catalog.pg_locks AS waiting " +
            "    JOIN pg_catalog.pg_locks AS holder " +
            "      ON holder.locktype = waiting.locktype " +
            "     AND holder.database IS NOT DISTINCT FROM waiting.database " +
            "     AND holder.relation IS NOT DISTINCT FROM waiting.relation " +
            "     AND holder.page IS NOT DISTINCT FROM waiting.page " +
            "     AND holder.tuple IS NOT DISTINCT FROM waiting.tuple " +
            "     AND holder.virtualxid IS NOT DISTINCT FROM waiting.virtualxid " +
            "     AND holder.transactionid IS NOT DISTINCT FROM waiting.transactionid " +
            "     AND holder.classid IS NOT DISTINCT FROM waiting.classid " +
            "     AND holder.objid IS NOT DISTINCT FROM waiting.objid " +
            "     AND holder.objsubid IS NOT DISTINCT FROM waiting.objsubid " +
            "    WHERE waiting.pid = $1::pg_catalog.int4 AND waiting.granted = FALSE " +
            "      AND holder.pid = $2::pg_catalog.int4 AND holder.granted = TRUE" +
            "  ) AS exact_lock_match " +
            "FROM pg_catalog.pg_stat_activity AS activity " +
            "WHERE activity.pid = $1::pg_catalog.int4",
            [waitingPid, holderPid, queryFragment]
          );
          if (
            rows.length === 1 &&
            rows[0].activity_wait === true &&
            rows[0].query_matches === true &&
            rows[0].exact_lock_match === true
          ) return true;
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        return false;
      };
      const legacyPublicationHasCapability = deferred();
      const legacyTerminalTupleLocked = deferred();
      const allowLegacyPublicationDml = deferred();
      const allowLegacyStateLock = deferred();
      const legacyPublicationReachedOutboxDml = deferred();
      const allowLegacyPublicationOutboxDml = deferred();
      const fixedPublicationHasCapability = deferred();
      const fixedClaimReachedStorageRelation = deferred();
      const allowFixedPublicationDml = deferred();
      try {
        await store.__userStoreAiTutorPostgresTestHooks.ensureSchema();
        await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.migrateSchema();
        const created = await store.createTeacherNotice({
          teacherId: "teacher-ms-chan",
          classId: "class-s3a-2026",
          audience: "parents",
          subject: "PostgreSQL publication claim lock-order fixture",
          body: "Fixture-only lock-order evidence."
        });
        if (created.status !== "created") throw new Error("lock-order notice could not be created");
        const noticeId = created.notice.id;
        const initialPublication = await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks
          .queueNoticeEmailForAtomicityProbe({ teacherId: "teacher-ms-chan", noticeId });
        if (
          initialPublication.status !== "queued" ||
          initialPublication.queued !== 1 ||
          initialPublication.reused !== 0 ||
          initialPublication.recovered !== 0
        ) throw new Error("lock-order terminal fixture was not created exactly once");
        const terminalRows = await sql.unsafe(
          "UPDATE public.teacher_notice_email_outbox " +
          "SET status = 'blocked', completed_at = pg_catalog.clock_timestamp(), " +
          "    last_error_code = 'provider-invalid-request', last_http_status = 422, " +
          "    lease_token = NULL, lease_expires_at = NULL, provider_message_id = NULL, " +
          "    pii_expires_at = pg_catalog.clock_timestamp() - INTERVAL '1 second', " +
          "    pii_purged_at = NULL, tombstone_expires_at = pg_catalog.clock_timestamp() + INTERVAL '1 day', " +
          "    updated_at = pg_catalog.clock_timestamp() " +
          "WHERE notice_id = $1 AND status = 'pending' RETURNING id",
          [noticeId]
        );
        if (terminalRows.length !== 1) throw new Error("lock-order terminal tuple was not prepared exactly once");
        const terminalRowId = terminalRows[0].id;

        let legacyPublicationPid = 0;
        let legacyClaimPid = 0;
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.afterStorageCapability = async (kind, backendPid) => {
          if (kind !== "publication") return;
          legacyPublicationPid = backendPid;
          legacyPublicationHasCapability.resolve();
          await allowLegacyPublicationDml.promise;
        };
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.beforePublicationOutboxDml = async () => {
          legacyPublicationReachedOutboxDml.resolve();
          await allowLegacyPublicationOutboxDml.promise;
        };
        const legacyPublicationSettled = settleImmediately(
          store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks
            .queueNoticeEmailForAtomicityProbe({ teacherId: "teacher-ms-chan", noticeId })
        );
        await waitFor(legacyPublicationHasCapability.promise, "legacy publication capability barrier");
        const legacyClaimSettled = settleImmediately(
          store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks
            .runLegacyTerminalMaintenanceLockOrderProbe({
            noticeId,
            onTerminalTupleLocked: async (backendPid) => {
              legacyClaimPid = backendPid;
              legacyTerminalTupleLocked.resolve();
              await allowLegacyStateLock.promise;
            }
            })
        );
        await waitFor(legacyTerminalTupleLocked.promise, "legacy terminal tuple barrier");
        allowLegacyPublicationDml.resolve();
        await waitFor(legacyPublicationReachedOutboxDml.promise, "legacy publication outbox DML barrier");
        allowLegacyPublicationOutboxDml.resolve();
        const legacyPublicationWaitObserved = await observeExactLockWait(
          legacyPublicationPid,
          legacyClaimPid,
          "teacher_notice_email_outbox"
        );
        if (!legacyPublicationWaitObserved) {
          throw new Error("legacy publication did not prove a database-side terminal tuple wait");
        }
        allowLegacyStateLock.resolve();
        const legacyClaimOutcome = await legacyClaimSettled;
        const legacyBlockedCode = legacyClaimOutcome.status === "rejected" &&
          legacyClaimOutcome.reason && typeof legacyClaimOutcome.reason === "object" &&
          "code" in legacyClaimOutcome.reason
          ? String(legacyClaimOutcome.reason.code)
          : "";
        if (legacyBlockedCode !== "55P03" && legacyBlockedCode !== "40P01") {
          throw new Error("legacy lock-order probe did not fail with a bounded lock conflict");
        }
        const legacyPublicationOutcome = await waitFor(
          legacyPublicationSettled,
          "legacy publication completion"
        );
        if (legacyPublicationOutcome.status === "rejected") throw legacyPublicationOutcome.reason;
        const legacyPublicationResult = legacyPublicationOutcome.value;
        if (
          legacyPublicationResult.status !== "queued" ||
          legacyPublicationResult.queued !== 0 ||
          legacyPublicationResult.reused !== 1 ||
          legacyPublicationResult.recovered !== 0
        ) throw new Error("legacy publication did not replay the exact terminal durable tuple");

        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.afterStorageCapability = null;
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.beforePublicationOutboxDml = null;
        let fixedPublicationPid = 0;
        let fixedClaimPid = 0;
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.afterStorageCapability = async (kind, backendPid) => {
          if (kind !== "publication") return;
          fixedPublicationPid = backendPid;
          fixedPublicationHasCapability.resolve();
          await allowFixedPublicationDml.promise;
        };
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.beforeStorageRelationLock = (kind, backendPid) => {
          if (kind !== "claim") return;
          fixedClaimPid = backendPid;
          fixedClaimReachedStorageRelation.resolve();
        };

        const fixedPublicationSettled = settleImmediately(
          store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks
            .queueNoticeEmailForAtomicityProbe({ teacherId: "teacher-ms-chan", noticeId })
        );
        await waitFor(fixedPublicationHasCapability.promise, "fixed publication capability barrier");
        const fixedClaimSettled = settleImmediately(
          store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks
            .claimNextForLockOrderProbe()
        );
        await waitFor(fixedClaimReachedStorageRelation.promise, "fixed claim relation barrier");
        const fixedClaimWaitObserved = await observeExactLockWait(
          fixedClaimPid,
          fixedPublicationPid,
          "postgres_storage_readiness_relation_lock"
        );
        if (!fixedClaimWaitObserved) {
          throw new Error("fixed claim did not prove a database-side higher relation wait");
        }
        allowFixedPublicationDml.resolve();
        const [fixedPublicationOutcome, fixedClaimOutcome] = await waitFor(
          Promise.all([fixedPublicationSettled, fixedClaimSettled]),
          "fixed publication and claim completion"
        );
        if (fixedPublicationOutcome.status === "rejected") throw fixedPublicationOutcome.reason;
        if (fixedClaimOutcome.status === "rejected") throw fixedClaimOutcome.reason;
        const fixedPublicationResult = fixedPublicationOutcome.value;
        const fixedClaimResult = fixedClaimOutcome.value;
        if (
          fixedPublicationResult.status !== "queued" ||
          fixedPublicationResult.queued !== 0 ||
          fixedPublicationResult.reused !== 1 ||
          fixedPublicationResult.recovered !== 0
        ) throw new Error("fixed publication did not replay the exact terminal durable tuple");
        if (fixedClaimResult !== null) {
          throw new Error("fixed claim unexpectedly leased a terminal durable tuple");
        }

        const markerRows = await sql.unsafe(
          "SELECT state.revision = marker.state_revision AS consistent " +
          "FROM public.app_state AS state " +
          "JOIN public.app_state_readiness_markers AS marker " +
          "ON marker.state_id = state.id AND marker.tenant_id = state.tenant_id " +
          "AND marker.state_kind = state.state_kind AND marker.schema_version = state.schema_version " +
          "WHERE state.id = 'primary'"
        );
        const outboxRows = await sql.unsafe(
          "SELECT pg_catalog.count(*)::pg_catalog.int4 AS row_count, " +
          "  pg_catalog.count(DISTINCT (recipient_fingerprint, content_revision))::pg_catalog.int4 AS durable_count, " +
          "  pg_catalog.bool_and(status = 'blocked' AND last_error_code = 'provider-invalid-request' " +
          "    AND last_http_status = 422 AND completed_at IS NOT NULL AND provider_message_id IS NULL " +
          "    AND tombstone_expires_at > pg_catalog.clock_timestamp()) AS terminal_evidence_exact, " +
          "  pg_catalog.bool_and(pii_purged_at IS NOT NULL AND recipient_id IS NULL AND student_id IS NULL " +
          "    AND guardian_id IS NULL AND teacher_id IS NULL AND queued_by_id IS NULL AND class_id IS NULL " +
          "    AND email IS NULL AND locale IS NULL) AS terminal_pii_purged, " +
          "  pg_catalog.bool_and(lease_token IS NULL AND lease_expires_at IS NULL) AS lease_absent " +
          "  , pg_catalog.bool_and(id = $2) AS same_terminal_tuple " +
          "FROM public.teacher_notice_email_outbox WHERE notice_id = $1",
          [noticeId, terminalRowId]
        );
        const terminal = outboxRows[0];
        process.stdout.write("${resultPrefix}" + JSON.stringify({
          legacyBlockedCode,
          legacyPublicationWaitObserved,
          legacyPublicationQueued: legacyPublicationResult.queued,
          legacyPublicationReused: legacyPublicationResult.reused,
          legacyPublicationRecovered: legacyPublicationResult.recovered,
          fixedClaimWaitObserved,
          fixedPublicationQueued: fixedPublicationResult.queued,
          fixedPublicationReused: fixedPublicationResult.reused,
          fixedPublicationRecovered: fixedPublicationResult.recovered,
          fixedClaimCompleted: fixedClaimResult === null,
          stateMarkerConsistent: markerRows.length === 1 && markerRows[0].consistent === true,
          durableUnique: terminal?.row_count === 1 && terminal?.durable_count === 1,
          terminalEvidenceExact: terminal?.terminal_evidence_exact === true,
          terminalPiiPurged: terminal?.terminal_pii_purged === true,
          leaseAbsent: terminal?.lease_absent === true,
          sameTerminalTuple: terminal?.same_terminal_tuple === true
        }) + "\\n", () => process.exit(0));
      } finally {
        allowLegacyPublicationDml.resolve();
        allowLegacyStateLock.resolve();
        allowLegacyPublicationOutboxDml.resolve();
        allowFixedPublicationDml.resolve();
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.beforeStorageRelationLock = null;
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.afterStorageCapability = null;
        store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.beforePublicationOutboxDml = null;
        await sql.end({ timeout: 5 });
        await store.__userStoreAiTutorPostgresTestHooks.closePostgresClients().catch(() => undefined);
      }
    })().catch((error) => {
      process.stderr.write((error instanceof Error ? error.name + ": " + error.message : "worker failed") + "\\n");
      process.exit(1);
    });
  `;
  return new Promise<{
    legacyBlockedCode: string;
    legacyPublicationWaitObserved: boolean;
    legacyPublicationQueued: number;
    legacyPublicationReused: number;
    legacyPublicationRecovered: number;
    fixedClaimWaitObserved: boolean;
    fixedPublicationQueued: number;
    fixedPublicationReused: number;
    fixedPublicationRecovered: number;
    fixedClaimCompleted: boolean;
    stateMarkerConsistent: boolean;
    durableUnique: boolean;
    terminalEvidenceExact: boolean;
    terminalPiiPurged: boolean;
    leaseAbsent: boolean;
    sameTerminalTuple: boolean;
  }>((resolve, reject) => {
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
        MAIS_TEST_POSTGRES_MUTATION_LOCK_TIMEOUT_MS: "30000",
        MAIS_TEST_POSTGRES_MUTATION_STATEMENT_TIMEOUT_MS: "45000",
        TEACHER_NOTICE_EMAIL_ENABLED: "false"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("PostgreSQL publication and claim lock-order worker timed out."));
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
        reject(new Error(`PostgreSQL publication and claim lock-order worker failed (${code}): ${stderr.slice(0, 500)}`));
        return;
      }
      resolve(JSON.parse(marker.slice(resultPrefix.length)));
    });
  });
}

function startPostgresOutboxMigrationWorker(
  configuredUrl: string,
  workerId: number
): PostgresOutboxMigrationWorkerController {
  const resultPrefix = `OUTBOX_PG_MIGRATION_${workerId}=`;
  const source = `
    await (async () => {
      const emitStage = (stage) => new Promise((resolve) => {
        process.stdout.write("${postgresOutboxMigrationWorkerStagePrefix}" + stage + "\\n", resolve);
      });
      await emitStage("process-started");
      const store = await import("./lib/server/userStore.ts");
      await emitStage("import-ready");
      let command = "";
      for await (const chunk of process.stdin) {
        command += String(chunk);
        if (command.includes("\\n")) break;
      }
      if (command.trim() !== "start") throw new Error("migration start command is invalid");
      await emitStage("migration-started");
      await store.__userStoreTeacherNoticeEmailOutboxPostgresTestHooks.migrateSchema();
      await emitStage("migration-complete");
      process.stdout.write("${resultPrefix}ok\\n", () => process.exit(0));
    })().catch((error) => {
      process.stderr.write(
        (error instanceof Error ? error.name + ": " + error.message : "migration failed") + "\\n",
        () => process.exit(1)
      );
    });
  `;
  const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", source], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_MAX_CONNECTIONS: "1",
      POSTGRES_URL: configuredUrl
    },
    stdio: ["pipe", "pipe", "pipe"]
  });
  let resolveReady!: () => void;
  let rejectReady!: (reason?: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  let resolveResult!: () => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<void>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  void ready.catch(() => undefined);
  void result.catch(() => undefined);

  let stdout = "";
  let stderr = "";
  let stdoutLineBuffer = "";
  let nextStageIndex = 0;
  let lastStage: PostgresOutboxMigrationWorkerStage | null = null;
  let resultSettled = false;
  let startSent = false;
  const safeStageSummary = () => postgresOutboxMigrationWorkerSafeStageSummary(lastStage);
  const settleRejected = (error: Error, terminate: boolean) => {
    if (resultSettled) return;
    resultSettled = true;
    watchdog.settle();
    if (terminate) child.kill("SIGKILL");
    rejectReady(error);
    rejectResult(error);
  };
  const watchdog = createPostgresAuthorityWorkerWatchdog({
    inactivityTimeoutMs: 60_000,
    hardTimeoutMs: 120_000,
    onTimeout: (kind) => {
      if (resultSettled) return;
      resultSettled = true;
      child.kill("SIGKILL");
      const error = new Error(
        `PostgreSQL outbox migration worker ${workerId} ${kind} timeout ${safeStageSummary()}.`
      );
      rejectReady(error);
      rejectResult(error);
    }
  });
  const observeLine = (line: string) => {
    const expectedStage = postgresOutboxMigrationWorkerStages[nextStageIndex];
    if (expectedStage === undefined || line !== `${postgresOutboxMigrationWorkerStagePrefix}${expectedStage}`) {
      return;
    }
    nextStageIndex += 1;
    lastStage = expectedStage;
    watchdog.recordProgress();
    if (expectedStage === "import-ready") resolveReady();
  };
  child.stdout.on("data", (chunk) => {
    const text = String(chunk);
    stdout += text;
    stdoutLineBuffer += text;
    const lines = stdoutLineBuffer.split(/\r?\n/u);
    stdoutLineBuffer = lines.pop() ?? "";
    for (const line of lines) observeLine(line);
  });
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  child.stdin.on("error", (error) => settleRejected(error, true));
  child.on("error", (error) => settleRejected(error, false));
  child.on("close", (code) => {
    if (stdoutLineBuffer) observeLine(stdoutLineBuffer);
    if (resultSettled) return;
    resultSettled = true;
    watchdog.settle();
    const completed = lastStage === "migration-complete";
    if (code !== 0 || !completed || !stdout.split(/\r?\n/u).includes(`${resultPrefix}ok`)) {
      const errorName = postgresAuthorityWorkerSafeErrorName(stderr);
      const error = new Error(
        `PostgreSQL outbox migration worker ${workerId} failed (${code}; ${errorName}) ${safeStageSummary()}.`
      );
      rejectReady(error);
      rejectResult(error);
      return;
    }
    resolveReady();
    resolveResult();
  });

  return {
    ready,
    result,
    start() {
      if (startSent || resultSettled) return;
      startSent = true;
      child.stdin.end("start\n");
    },
    terminate() {
      if (!resultSettled) child.kill("SIGKILL");
    }
  };
}

function runPostgresOutboxMigrationWorker(configuredUrl: string, workerId: number) {
  const worker = startPostgresOutboxMigrationWorker(configuredUrl, workerId);
  return runPostgresOutboxMigrationWorkersTogether([worker]);
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
    await runPostgresOutboxMigrationWorkersTogether(
      Array.from({ length: 4 }, (_, workerId) =>
        startPostgresOutboxMigrationWorker(postgres16IntegrationUrl, workerId + 1)
      )
    );
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
    assert.deepEqual(await runPostgresPublicationAtomicityWorker(postgres16IntegrationUrl), {
      fullWriterRejected: true,
      fullWriterRolledBack: true,
      outboxInsertRejected: true,
      outboxInsertRolledBack: true
    }, "storage and outbox publication failures must roll back state, projections, marker, and outbox together");
    const publicationClaimLockOrder = await runPostgresPublicationClaimLockOrderWorker(
      postgres16IntegrationUrl
    );
    assert.ok(
      publicationClaimLockOrder.legacyBlockedCode === "55P03" ||
        publicationClaimLockOrder.legacyBlockedCode === "40P01",
      "the test-only legacy lock order must reproduce a bounded PostgreSQL lock conflict"
    );
    assert.deepEqual({
      ...publicationClaimLockOrder,
      legacyBlockedCode: "allowlisted"
    }, {
      legacyBlockedCode: "allowlisted",
      legacyPublicationWaitObserved: true,
      legacyPublicationQueued: 0,
      legacyPublicationReused: 1,
      legacyPublicationRecovered: 0,
      fixedClaimWaitObserved: true,
      fixedPublicationQueued: 0,
      fixedPublicationReused: 1,
      fixedPublicationRecovered: 0,
      fixedClaimCompleted: true,
      stateMarkerConsistent: true,
      durableUnique: true,
      terminalEvidenceExact: true,
      terminalPiiPurged: true,
      leaseAbsent: true,
      sameTerminalTuple: true
    }, "terminal-row publication replay and production claim must serialize with database-proven lock waits");
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
