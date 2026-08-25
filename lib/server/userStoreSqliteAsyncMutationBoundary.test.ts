import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  SqliteAsyncMutationError,
  runSqliteMutationBoundary
} from "@/lib/server/userStore/sqliteMutationBoundary";

type State = { value: string };

function createHarness(storage: DatabaseSync) {
  return {
    storage,
    loadState: () => {
      const row = storage.prepare("SELECT payload FROM state WHERE id = 1").get() as { payload: string };
      return JSON.parse(row.payload) as State;
    },
    writeState: (state: State) => {
      storage.prepare("UPDATE state SET payload = ?, revision = revision + 1 WHERE id = 1")
        .run(JSON.stringify(state));
      const row = storage.prepare("SELECT revision FROM state WHERE id = 1").get() as { revision: number };
      return String(row.revision);
    }
  };
}

test("an async SQLite mutator is rejected and rolled back before any durable ACK", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-sqlite-async-boundary-"));
  const dbPath = path.join(directory, "state.sqlite");
  const first = new DatabaseSync(dbPath);
  const second = new DatabaseSync(dbPath);

  try {
    first.exec("PRAGMA busy_timeout = 50");
    second.exec("PRAGMA busy_timeout = 50");
    first.exec("CREATE TABLE state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL)");
    first.prepare("INSERT INTO state (id, revision, payload) VALUES (1, 1, ?)")
      .run(JSON.stringify({ value: "initial" }));

    const mutation = runSqliteMutationBoundary({
      ...createHarness(first),
      mutate: async (state) => {
        state.value = "must-roll-back";
        return "async-ack";
      }
    });

    await assert.rejects(mutation, SqliteAsyncMutationError);
    assert.doesNotThrow(() => {
      second.exec("BEGIN IMMEDIATE");
      second.prepare("UPDATE state SET payload = ?, revision = revision + 1 WHERE id = 1")
        .run(JSON.stringify({ value: "concurrent-writer" }));
      second.exec("COMMIT");
    }, "a rejected async callback must release SQLite's process-wide writer lock");
    const durable = second.prepare("SELECT revision, payload FROM state WHERE id = 1").get() as {
      payload: string;
      revision: number;
    };
    assert.equal(durable.revision, 2);
    assert.deepEqual(JSON.parse(durable.payload), { value: "concurrent-writer" });
  } finally {
    first.close();
    second.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("an async SQLite state loader is rejected and releases the writer lock", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-sqlite-async-loader-"));
  const dbPath = path.join(directory, "state.sqlite");
  const first = new DatabaseSync(dbPath);
  const second = new DatabaseSync(dbPath);

  try {
    first.exec("PRAGMA busy_timeout = 50");
    second.exec("PRAGMA busy_timeout = 50");
    first.exec("CREATE TABLE state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL)");
    first.prepare("INSERT INTO state (id, revision, payload) VALUES (1, 1, ?)")
      .run(JSON.stringify({ value: "initial" }));

    await assert.rejects(
      runSqliteMutationBoundary({
        ...createHarness(first),
        loadState: (async () => ({ value: "async-loader" })) as unknown as () => State,
        mutate: () => "must-not-run"
      }),
      SqliteAsyncMutationError
    );
    assert.doesNotThrow(() => {
      second.exec("BEGIN IMMEDIATE");
      second.prepare("UPDATE state SET payload = ?, revision = revision + 1 WHERE id = 1")
        .run(JSON.stringify({ value: "writer-after-loader-rejection" }));
      second.exec("COMMIT");
    });
    const durable = second.prepare("SELECT revision, payload FROM state WHERE id = 1").get() as {
      payload: string;
      revision: number;
    };
    assert.equal(durable.revision, 2);
    assert.deepEqual(JSON.parse(durable.payload), { value: "writer-after-loader-rejection" });
  } finally {
    first.close();
    second.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("production persistence code has no async database mutator callbacks", async () => {
  const persistenceDirectory = path.join(process.cwd(), "lib/server/userStore");
  const paths = [
    path.join(process.cwd(), "lib/server/userStore.ts"),
    ...(await readdir(persistenceDirectory))
      .filter((fileName) => fileName.endsWith(".ts"))
      .map((fileName) => path.join(persistenceDirectory, fileName))
  ];

  for (const filePath of paths) {
    const source = await readFile(filePath, "utf8");
    assert.doesNotMatch(
      source,
      /(?:mutateDatabase|runMutation)\s*\(\s*async\b/,
      `${path.relative(process.cwd(), filePath)} must reserve/compensate external I/O outside every database mutation wrapper`
    );
  }

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /async function loadSqliteDatabaseForMutation\b/);
  assert.match(
    rootSource,
    /const fallbackDatabase = await sqliteMutationFallbackDatabase\(storage\);[\s\S]*?runSqliteMutationBoundary\(\{[\s\S]*?loadState: \(\) => loadSqliteDatabaseForMutation\(storage, fallbackDatabase\)/,
    "legacy filesystem fallback must resolve before BEGIN IMMEDIATE enters the synchronous boundary"
  );
  assert.match(
    rootSource,
    /async function synchronizeSqliteDatabaseForRead[\s\S]*?const fallbackDatabase = await sqliteMutationFallbackDatabase\(storage\);[\s\S]*?BEGIN IMMEDIATE[\s\S]*?const database = loadSqliteDatabaseForMutation\(storage, fallbackDatabase\)/,
    "cold read synchronization must also finish legacy filesystem I/O before its writer lock"
  );
  assert.doesNotMatch(
    rootSource,
    /BEGIN IMMEDIATE[\s\S]{0,500}?await loadSqliteDatabaseForMutation/,
    "no SQLite read/normalization path may await its state loader while holding the writer lock"
  );
});

test("a synchronous SQLite mutator keeps read-modify-write in one immediate transaction", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-sqlite-sync-commit-"));
  const dbPath = path.join(directory, "state.sqlite");
  const storage = new DatabaseSync(dbPath);

  try {
    storage.exec("CREATE TABLE state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL)");
    storage.prepare("INSERT INTO state (id, revision, payload) VALUES (1, 1, ?)")
      .run(JSON.stringify({ value: "initial" }));

    const result = await runSqliteMutationBoundary({
      ...createHarness(storage),
      mutate: (state) => {
        state.value = "sync-committed";
        return "sync-ack";
      }
    });

    assert.equal(result, "sync-ack");
    const durable = storage.prepare("SELECT revision, payload FROM state WHERE id = 1").get() as {
      payload: string;
      revision: number;
    };
    assert.equal(durable.revision, 2);
    assert.deepEqual(JSON.parse(durable.payload), { value: "sync-committed" });
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});
