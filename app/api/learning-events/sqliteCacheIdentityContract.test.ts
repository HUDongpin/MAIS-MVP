import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const userStorePath = path.join(process.cwd(), "lib/server/userStore.ts");

function childEnvironment(dbDir: string) {
  return {
    ...process.env,
    AUTH_SESSION_SECRET: "sqlite-cache-identity-test-secret",
    HK_MATH_DB_DIR: dbDir,
    HK_MATH_ENABLE_DEMO_USER: "false",
    HK_MATH_STORAGE_PROVIDER: "sqlite",
    HK_MATH_DB_PATH: "",
    POSTGRES_URL: ""
  };
}

function spawnModule(source: string, root: string, dbDir: string) {
  return spawn(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", source, root],
    {
      cwd: process.cwd(),
      env: childEnvironment(dbDir),
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
}

async function waitForExit(child: ReturnType<typeof spawn>) {
  let stderr = "";
  child.stderr?.on("data", (chunk) => { stderr += chunk; });
  await new Promise<void>((resolve, reject) => {
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(stderr)));
  });
}

async function waitForFile(filePath: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      return await readFile(filePath, "utf8");
    } catch {
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${filePath}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
}

function exactAppendSource(eventId: string) {
  return `
    const root = process.argv[1];
    const { appendLearningEvents } = await import(${JSON.stringify(userStorePath)});
    const receipt = await appendLearningEvents("cache-identity-student", [{
      id: ${JSON.stringify(eventId)},
      type: "page-view",
      source: "visualization-lab",
      timestamp: "2026-08-13T06:00:00.000Z",
      grade: "S3",
      topicId: "cache-identity-topic"
    }], 0);
    await (await import("node:fs/promises")).writeFile(
      (await import("node:path")).default.join(root, ${JSON.stringify(`exact-${eventId}.json`)}),
      JSON.stringify(receipt)
    );
  `;
}

test("normalization caches only its atomic payload identity and invalidates after a peer exact commit", async () => {
  const tmpBase = path.join(process.cwd(), ".tmp");
  await mkdir(tmpBase, { recursive: true });
  const root = await mkdtemp(path.join(tmpBase, "sqlite-normalization-cache-"));
  const dbDir = path.join(root, "db");
  await mkdir(dbDir);
  try {
    const seed = spawnModule(`
      const { __userStoreSqliteSnapshotTestHooks: hooks } = await import(${JSON.stringify(userStorePath)});
      await hooks.readLearningEventIds();
    `, root, dbDir);
    await waitForExit(seed);

    const sqlitePath = path.join(dbDir, "hk-math-db.sqlite");
    const sqlite = new DatabaseSync(sqlitePath);
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as { payload: string };
    const payload = JSON.parse(row.payload) as Record<string, unknown>;
    delete payload.learning_events;
    sqlite.prepare(`
      UPDATE app_state
      SET payload = ?, revision = revision + 1, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(payload), "2026-08-13T05:00:00.000Z", "primary");
    sqlite.close();

    const normalizer = spawnModule(`
      import { access, writeFile } from "node:fs/promises";
      import path from "node:path";
      const root = process.argv[1];
      const { __userStoreSqliteSnapshotTestHooks: hooks } = await import(${JSON.stringify(userStorePath)});
      hooks.setAfterNormalizationCasHook(async () => {
        await writeFile(path.join(root, "normalization-cas-returned"), "ready");
        while (true) {
          try { await access(path.join(root, "resume-normalization")); break; }
          catch { await new Promise((resolve) => setTimeout(resolve, 5)); }
        }
      });
      const first = await hooks.readLearningEventIds();
      hooks.setAfterNormalizationCasHook(null);
      const second = await hooks.readLearningEventIds();
      await writeFile(path.join(root, "normalization-result.json"), JSON.stringify({ first, second }));
    `, root, dbDir);
    await waitForFile(path.join(root, "normalization-cas-returned"));

    const eventId = "peer-after-normalization-cas";
    const exact = spawnModule(exactAppendSource(eventId), root, dbDir);
    await waitForExit(exact);
    await writeFile(path.join(root, "resume-normalization"), "resume");
    await waitForExit(normalizer);

    const result = JSON.parse(
      await readFile(path.join(root, "normalization-result.json"), "utf8")
    ) as { first: string[]; second: string[] };
    assert.equal(result.first.includes(eventId), false, "the already-started read may return its older atomic snapshot");
    assert.equal(result.second.includes(eventId), true, "the older identity must invalidate before the next read");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("initialization re-reads the committed winner after a peer exact append", async () => {
  const tmpBase = path.join(process.cwd(), ".tmp");
  await mkdir(tmpBase, { recursive: true });
  const root = await mkdtemp(path.join(tmpBase, "sqlite-initialization-cache-"));
  const dbDir = path.join(root, "db");
  await mkdir(dbDir);
  try {
    const initializer = spawnModule(`
      import { access, writeFile } from "node:fs/promises";
      import path from "node:path";
      const root = process.argv[1];
      const { __userStoreSqliteSnapshotTestHooks: hooks } = await import(${JSON.stringify(userStorePath)});
      hooks.setAfterInitializationCommitHook(async () => {
        await writeFile(path.join(root, "initialization-committed"), "ready");
        while (true) {
          try { await access(path.join(root, "resume-initialization")); break; }
          catch { await new Promise((resolve) => setTimeout(resolve, 5)); }
        }
      });
      const first = await hooks.readLearningEventIds();
      hooks.setAfterInitializationCommitHook(null);
      const second = await hooks.readLearningEventIds();
      await writeFile(path.join(root, "initialization-result.json"), JSON.stringify({ first, second }));
    `, root, dbDir);
    await waitForFile(path.join(root, "initialization-committed"));

    const eventId = "peer-after-initialization-commit";
    const exact = spawnModule(exactAppendSource(eventId), root, dbDir);
    await waitForExit(exact);
    await writeFile(path.join(root, "resume-initialization"), "resume");
    await waitForExit(initializer);

    const result = JSON.parse(
      await readFile(path.join(root, "initialization-result.json"), "utf8")
    ) as { first: string[]; second: string[] };
    assert.equal(result.first.includes(eventId), true);
    assert.equal(result.second.includes(eventId), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
