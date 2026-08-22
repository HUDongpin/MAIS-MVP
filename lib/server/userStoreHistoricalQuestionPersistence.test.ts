import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("userStore materializes referenced retired HK questions before every persisted-state normalization", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  const materializerStart = source.indexOf(
    "async function databaseWithReferencedHistoricalHongKongQuestions"
  );
  const materializerEnd = source.indexOf(
    "async function normalizeDatabaseWithReferencedHistoricalHongKongQuestions",
    materializerStart
  );
  assert.notEqual(materializerStart, -1, "historical materializer definition must exist");
  assert.notEqual(materializerEnd, -1, "historical normalizer definition must follow the materializer");
  const materializerSource = source.slice(materializerStart, materializerEnd);
  assert.match(materializerSource, /materializeReferencedRetiredHongKongQuestions\(/);
  assert.match(materializerSource, /questions/);
  assert.match(
    source,
    /async function normalizeDatabaseWithReferencedHistoricalHongKongQuestions\([\s\S]*databaseWithReferencedHistoricalHongKongQuestions/
  );
  assert.match(
    source,
    /retiredHongKongQuestionRecordsNeedPersistenceSync\(parsed\.questions, database\.questions\)/
  );

  assert.equal(
    source.match(/normalizeDatabase\(/g)?.length,
    2,
    "only the function definition and the historical wrapper may reference normalizeDatabase directly"
  );

  const wrapperCallCount = source.match(/normalizeDatabaseWithReferencedHistoricalHongKongQuestions\(/g)?.length ?? 0;
  assert.equal(wrapperCallCount, 6, "expected one definition plus legacy, SQLite, two Postgres, and admin call sites");
  const sqliteStart = source.indexOf("async function loadSqliteDatabase");
  const sqliteEnd = source.indexOf("async function readSqliteDatabase", sqliteStart);
  const sqliteSource = source.slice(sqliteStart, sqliteEnd);
  assert.match(
    sqliteSource,
    /if \(row\) \{[\s\S]*if \(!hasCoreTables\(parsed\)\) \{[\s\S]*refusing to overwrite it[\s\S]*normalizeDatabaseWithReferencedHistoricalHongKongQuestions\(parsed\)/
  );
  assert.doesNotMatch(sqliteSource, /Could not read SQLite application state\. Recreating it/);
  assert.doesNotMatch(sqliteSource, /catch\s*\(/);
  assert.match(sqliteSource, /const database = await readLegacyDatabase\(\) \?\? createInitialDatabase\(\)/);

  const mutationStart = source.indexOf("async function mutateDatabase<T>");
  const mutationEnd = source.indexOf("const toAuthenticatedUser", mutationStart);
  const mutationSource = source.slice(mutationStart, mutationEnd);
  assert.equal(
    mutationSource.match(/databaseWithReferencedHistoricalHongKongQuestions\(/g)?.length,
    2,
    "Postgres and SQLite mutations must rematerialize historical questions immediately before writing"
  );
  assert.match(
    mutationSource,
    /databaseWithReferencedHistoricalHongKongQuestions\([\s\S]*referencedHistoricalQuestionIdsFromPostgres\(sql\)/
  );
  assert.match(mutationSource, /writePostgresDatabaseWith\(sql, databaseToPersist, true\)/);
  assert.match(mutationSource, /writeSqliteDatabase\(databaseToPersist/);
  assert.match(mutationSource, /cacheSqliteDatabase\(databaseToPersist/);
});

test("Postgres historical reference discovery covers only optional hot activity deltas", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const start = source.indexOf("async function referencedHistoricalQuestionIdsFromPostgres");
  const end = source.indexOf("async function normalizeLockedPostgresState", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const helperSource = source.slice(start, end);

  for (const table of [
    "practice_attempts",
    "mistake_book_items",
    "learning_events"
  ]) {
    assert.ok(helperSource.includes(table), `${table}: missing historical reference source`);
  }
  assert.match(helperSource, /information_schema\.tables/);
  assert.match(helperSource, /current_schema\(\)/);
  assert.match(helperSource, /question_id = ANY\(\$\{retiredQuestionIds\}\)/);
  assert.doesNotMatch(helperSource, /projection_(?:attempts|mistake_book_items|learning_events)/);
  assert.match(
    source,
    /normalizeLockedPostgresState[\s\S]*referencedHistoricalQuestionIdsFromPostgres\(sql\)/
  );
  assert.match(
    source,
    /readPostgresDatabaseFrom[\s\S]*referencedHistoricalQuestionIdsFromPostgres\(sql\)/
  );
});

test("an existing corrupt SQLite app-state payload fails closed without being overwritten", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-corrupt-sqlite-state-"));
  const databasePath = path.join(directory, "hk-math-db.sqlite");
  const corruptPayload = "{not-valid-json";
  const originalUpdatedAt = "2026-08-09T04:05:06.000Z";
  const originalRevision = 37;

  const seed = new DatabaseSync(databasePath);
  seed.exec(`
    CREATE TABLE app_state (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      state_kind TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      revision INTEGER NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  seed.prepare(`
    INSERT INTO app_state (id, tenant_id, state_kind, schema_version, revision, payload, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    "primary",
    "platform",
    "app-snapshot",
    1,
    originalRevision,
    corruptPayload,
    originalUpdatedAt
  );
  seed.close();

  try {
    const probe = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "--eval",
        [
          "try {",
          '  const store = await import("./lib/server/userStore.ts");',
          '  await store.getAuthenticatedUserById("corrupt-state-probe");',
          "} catch (error) {",
          '  if (!(error instanceof SyntaxError) || !error.message.includes("JSON")) throw error;',
          "  process.exitCode = 23;",
          "}"
        ].join("\n")
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          HK_MATH_DB_PATH: databasePath,
          HK_MATH_STORAGE_PROVIDER: "sqlite",
          HK_MATH_DISABLE_SQLITE_READ_CACHE: "true",
          NODE_ENV: "test"
        },
        timeout: 60_000
      }
    );

    assert.equal(
      probe.status,
      23,
      `corrupt persisted state must reject with the exact JSON parse failure instead of initializing; stdout=${probe.stdout}; stderr=${probe.stderr}`
    );

    const verify = new DatabaseSync(databasePath, { readOnly: true });
    const row = verify.prepare(`
      SELECT revision, payload, updated_at
      FROM app_state
      WHERE id = ?
    `).get("primary") as {
      revision: number;
      payload: string;
      updated_at: string;
    } | undefined;
    verify.close();

    assert.equal(row?.revision, originalRevision);
    assert.equal(row?.payload, corruptPayload);
    assert.equal(row?.updated_at, originalUpdatedAt);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
