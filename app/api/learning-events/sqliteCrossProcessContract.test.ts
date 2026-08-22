import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

type WorkerResult = {
  status: number;
  body: {
    acknowledgedEventIds?: unknown;
    durablyPersisted?: unknown;
  };
};

function workerSource() {
  return `
    import { access, writeFile } from "node:fs/promises";
    import path from "node:path";
    const [workerId, root] = process.argv.slice(2);
    process.env.AUTH_SESSION_SECRET = process.env.PROBE_AUTH_SECRET;
    process.env.HK_MATH_DB_DIR = path.join(root, "db");
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.POSTGRES_URL;
    const [{ POST }, { getAuthenticatedUserById }] = await Promise.all([
      import(${JSON.stringify(path.join(process.cwd(), "app/api/learning-events/route.ts"))}),
      import(${JSON.stringify(path.join(process.cwd(), "lib/server/userStore.ts"))})
    ]);
    if (!await getAuthenticatedUserById(process.env.PROBE_USER_ID)) throw new Error("prewarm failed");
    await writeFile(path.join(root, "ready-" + workerId), "ready");
    while (true) {
      try { await access(path.join(root, "release")); break; }
      catch { await new Promise((resolve) => setTimeout(resolve, 5)); }
    }
    const response = await POST(new Request("https://example.test/api/learning-events", {
      method: "POST",
      headers: {
        Cookie: process.env.PROBE_COOKIE,
        "Content-Type": "application/json",
        "X-MAIS-Analytics-User-Id": encodeURIComponent(process.env.PROBE_USER_ID)
      },
      body: JSON.stringify({ generation: 0, events: [{
        id: "tracked-cross-process-" + workerId,
        type: "page-view",
        source: "visualization-lab",
        timestamp: workerId === "a" ? "2026-08-12T14:00:00.000Z" : "2026-08-12T14:00:01.000Z",
        grade: "S3",
        topicId: "tracked-cross-process-topic-" + workerId
      }] })
    }));
    await writeFile(path.join(root, "result-" + workerId + ".json"), JSON.stringify({
      status: response.status,
      body: await response.json()
    }));
  `;
}

test("SQLite cross-process learning-event appends never both ACK while losing a revision", async () => {
  const tmpBase = path.join(process.cwd(), ".tmp");
  await mkdir(tmpBase, { recursive: true });
  const root = await mkdtemp(path.join(tmpBase, "learning-events-cross-process-"));
  await mkdir(path.join(root, "db"));
  const workerPath = path.join(root, "worker.mjs");
  await writeFile(workerPath, workerSource());

  const previous = {
    auth: process.env.AUTH_SESSION_SECRET,
    dir: process.env.HK_MATH_DB_DIR,
    demo: process.env.HK_MATH_ENABLE_DEMO_USER,
    provider: process.env.HK_MATH_STORAGE_PROVIDER,
    path: process.env.HK_MATH_DB_PATH,
    postgres: process.env.POSTGRES_URL
  };
  const authSecret = "tracked-cross-process-contract-secret";
  try {
    process.env.AUTH_SESSION_SECRET = authSecret;
    process.env.HK_MATH_DB_DIR = path.join(root, "db");
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.POSTGRES_URL;

    const register = await import("@/app/api/auth/register/route");
    const registration = await register.POST(new Request("https://example.test/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "student",
        name: "SQLite Cross Process Student",
        username: "sqlite-cross-process@example.test",
        email: "sqlite-cross-process@example.test",
        password: "start12345",
        grade: "S3",
        curriculumTrack: "US_CA_MATH",
        language: "en",
        theme: "dark"
      })
    }));
    assert.equal(registration.status, 200);
    const session = await registration.json() as { user: { id: string } };
    const cookie = registration.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie);

    const children = ["a", "b"].map((id) => spawn(
      process.execPath,
      ["--import", "tsx", workerPath, id, root],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PROBE_AUTH_SECRET: authSecret,
          PROBE_COOKIE: cookie,
          PROBE_USER_ID: session.user.id
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    ));

    const deadline = Date.now() + 30_000;
    while (true) {
      try {
        await Promise.all(["a", "b"].map((id) => readFile(path.join(root, `ready-${id}`))));
        break;
      } catch {
        if (Date.now() > deadline) throw new Error("workers did not become ready");
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }
    await writeFile(path.join(root, "release"), "release");
    await Promise.all(children.map((child) => new Promise<void>((resolve, reject) => {
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(stderr)));
    })));

    const results = await Promise.all(["a", "b"].map(async (id) =>
      JSON.parse(await readFile(path.join(root, `result-${id}.json`), "utf8")) as WorkerResult
    ));
    const acknowledgedIds = results
      .filter((result) => result.status === 200 && result.body.durablyPersisted === true)
      .flatMap((result) => Array.isArray(result.body.acknowledgedEventIds)
        ? result.body.acknowledgedEventIds.filter((id): id is string => typeof id === "string")
        : []);

    const sqlite = new DatabaseSync(path.join(root, "db", "hk-math-db.sqlite"), { readOnly: true });
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as { payload: string };
    sqlite.close();
    const payload = JSON.parse(row.payload) as { learning_events: Array<{ id: string }> };
    const persistedIds = new Set(payload.learning_events.map((event) => event.id));
    for (const id of acknowledgedIds) {
      assert.equal(persistedIds.has(id), true, `durable ACK ${id} must survive the competing process`);
    }

    const genericWorkerPath = path.join(root, "generic-writer.mjs");
    const exactWorkerPath = path.join(root, "exact-after-generic.mjs");
    await writeFile(genericWorkerPath, `
      import { access, writeFile } from "node:fs/promises";
      import path from "node:path";
      const root = process.argv[2];
      process.env.AUTH_SESSION_SECRET = process.env.PROBE_AUTH_SECRET;
      process.env.HK_MATH_DB_DIR = path.join(root, "db");
      process.env.HK_MATH_ENABLE_DEMO_USER = "false";
      process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
      delete process.env.HK_MATH_DB_PATH;
      delete process.env.POSTGRES_URL;
      const { __userStoreSqliteSnapshotTestHooks } = await import(${JSON.stringify(path.join(process.cwd(), "lib/server/userStore.ts"))});
      try {
        await __userStoreSqliteSnapshotTestHooks.mutateGeneric(async (database) => {
          await writeFile(path.join(root, "generic-mutator-ready"), "ready");
          while (true) {
            try { await access(path.join(root, "exact-commit-finished")); break; }
            catch { await new Promise((resolve) => setTimeout(resolve, 5)); }
          }
          const settings = database.user_settings.find((entry) => entry.user_id === process.env.PROBE_USER_ID);
          if (!settings) throw new Error("missing user settings");
          settings.theme = settings.theme === "dark" ? "light" : "dark";
          return "generic-ack";
        });
        await writeFile(path.join(root, "generic-result.json"), JSON.stringify({ status: "ack" }));
      } catch (error) {
        await writeFile(path.join(root, "generic-result.json"), JSON.stringify({
          status: "rejected",
          message: error instanceof Error ? error.message : String(error)
        }));
      }
    `);
    await writeFile(exactWorkerPath, `
      import { access, writeFile } from "node:fs/promises";
      import path from "node:path";
      const root = process.argv[2];
      process.env.AUTH_SESSION_SECRET = process.env.PROBE_AUTH_SECRET;
      process.env.HK_MATH_DB_DIR = path.join(root, "db");
      process.env.HK_MATH_ENABLE_DEMO_USER = "false";
      process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
      delete process.env.HK_MATH_DB_PATH;
      delete process.env.POSTGRES_URL;
      while (true) {
        try { await access(path.join(root, "generic-mutator-ready")); break; }
        catch { await new Promise((resolve) => setTimeout(resolve, 5)); }
      }
      const { POST } = await import(${JSON.stringify(path.join(process.cwd(), "app/api/learning-events/route.ts"))});
      const response = await POST(new Request("https://example.test/api/learning-events", {
        method: "POST",
        headers: {
          Cookie: process.env.PROBE_COOKIE,
          "Content-Type": "application/json",
          "X-MAIS-Analytics-User-Id": encodeURIComponent(process.env.PROBE_USER_ID)
        },
        body: JSON.stringify({ generation: 0, events: [{
          id: "tracked-exact-after-generic-read",
          type: "page-view",
          source: "visualization-lab",
          timestamp: "2026-08-12T14:00:02.000Z",
          grade: "S3",
          topicId: "tracked-exact-after-generic-topic"
        }] })
      }));
      await writeFile(path.join(root, "exact-after-generic-result.json"), JSON.stringify({
        status: response.status,
        body: await response.json()
      }));
      await writeFile(path.join(root, "exact-commit-finished"), "done");
    `);

    const conflictWorkers = [genericWorkerPath, exactWorkerPath].map((scriptPath) => spawn(
      process.execPath,
      ["--import", "tsx", scriptPath, root],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PROBE_AUTH_SECRET: authSecret,
          PROBE_COOKIE: cookie,
          PROBE_USER_ID: session.user.id
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    ));
    await Promise.all(conflictWorkers.map((child) => new Promise<void>((resolve, reject) => {
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(stderr)));
    })));
    const exactAfterGeneric = JSON.parse(
      await readFile(path.join(root, "exact-after-generic-result.json"), "utf8")
    ) as WorkerResult;
    const genericResult = JSON.parse(
      await readFile(path.join(root, "generic-result.json"), "utf8")
    ) as { status: "ack" | "rejected"; message?: string };
    assert.equal(exactAfterGeneric.status, 200);
    assert.equal(exactAfterGeneric.body.durablyPersisted, true);
    assert.equal(
      genericResult.status,
      "rejected",
      "a generic mutator that read an obsolete revision must not ACK or overwrite an exact commit"
    );

    const finalSqlite = new DatabaseSync(path.join(root, "db", "hk-math-db.sqlite"), { readOnly: true });
    const finalRow = finalSqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as { payload: string };
    finalSqlite.close();
    const finalPayload = JSON.parse(finalRow.payload) as { learning_events: Array<{ id: string }> };
    assert.equal(
      finalPayload.learning_events.some((event) => event.id === "tracked-exact-after-generic-read"),
      true,
      "the exact ACKed event must survive the losing generic writer"
    );

    const genericFirstWorkerPath = path.join(root, "generic-first.mjs");
    const exactAfterGenericCommitWorkerPath = path.join(root, "exact-after-generic-commit.mjs");
    await writeFile(genericFirstWorkerPath, `
      import { writeFile } from "node:fs/promises";
      import path from "node:path";
      const root = process.argv[2];
      process.env.AUTH_SESSION_SECRET = process.env.PROBE_AUTH_SECRET;
      process.env.HK_MATH_DB_DIR = path.join(root, "db");
      process.env.HK_MATH_ENABLE_DEMO_USER = "false";
      process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
      delete process.env.HK_MATH_DB_PATH;
      delete process.env.POSTGRES_URL;
      const { __userStoreSqliteSnapshotTestHooks } = await import(${JSON.stringify(path.join(process.cwd(), "lib/server/userStore.ts"))});
      await __userStoreSqliteSnapshotTestHooks.mutateGeneric(async (database) => {
        const settings = database.user_settings.find((entry) => entry.user_id === process.env.PROBE_USER_ID);
        if (!settings) throw new Error("missing user settings");
        settings.theme = "dark";
        return "generic-first-ack";
      });
      await writeFile(path.join(root, "generic-first-committed"), "done");
    `);
    await writeFile(exactAfterGenericCommitWorkerPath, `
      import { access, writeFile } from "node:fs/promises";
      import path from "node:path";
      const root = process.argv[2];
      process.env.AUTH_SESSION_SECRET = process.env.PROBE_AUTH_SECRET;
      process.env.HK_MATH_DB_DIR = path.join(root, "db");
      process.env.HK_MATH_ENABLE_DEMO_USER = "false";
      process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
      delete process.env.HK_MATH_DB_PATH;
      delete process.env.POSTGRES_URL;
      while (true) {
        try { await access(path.join(root, "generic-first-committed")); break; }
        catch { await new Promise((resolve) => setTimeout(resolve, 5)); }
      }
      const { POST } = await import(${JSON.stringify(path.join(process.cwd(), "app/api/learning-events/route.ts"))});
      const response = await POST(new Request("https://example.test/api/learning-events", {
        method: "POST",
        headers: {
          Cookie: process.env.PROBE_COOKIE,
          "Content-Type": "application/json",
          "X-MAIS-Analytics-User-Id": encodeURIComponent(process.env.PROBE_USER_ID)
        },
        body: JSON.stringify({ generation: 0, events: [{
          id: "tracked-exact-after-generic-commit",
          type: "page-view",
          source: "visualization-lab",
          timestamp: "2026-08-12T14:00:03.000Z",
          grade: "S3",
          topicId: "tracked-exact-after-generic-commit-topic"
        }] })
      }));
      await writeFile(path.join(root, "exact-after-generic-commit-result.json"), JSON.stringify({
        status: response.status,
        body: await response.json()
      }));
    `);
    const orderedWorkers = [genericFirstWorkerPath, exactAfterGenericCommitWorkerPath].map((scriptPath) => spawn(
      process.execPath,
      ["--import", "tsx", scriptPath, root],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PROBE_AUTH_SECRET: authSecret,
          PROBE_COOKIE: cookie,
          PROBE_USER_ID: session.user.id
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    ));
    await Promise.all(orderedWorkers.map((child) => new Promise<void>((resolve, reject) => {
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(stderr)));
    })));
    const exactAfterGenericCommit = JSON.parse(
      await readFile(path.join(root, "exact-after-generic-commit-result.json"), "utf8")
    ) as WorkerResult;
    assert.equal(exactAfterGenericCommit.status, 200);
    assert.equal(exactAfterGenericCommit.body.durablyPersisted, true);

    const orderedSqlite = new DatabaseSync(path.join(root, "db", "hk-math-db.sqlite"), { readOnly: true });
    const orderedRow = orderedSqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as { payload: string };
    orderedSqlite.close();
    const orderedPayload = JSON.parse(orderedRow.payload) as {
      learning_events: Array<{ id: string }>;
      user_settings: Array<{ user_id: string; theme: string }>;
    };
    assert.equal(
      orderedPayload.learning_events.some((event) => event.id === "tracked-exact-after-generic-commit"),
      true
    );
    assert.equal(
      orderedPayload.user_settings.find((entry) => entry.user_id === session.user.id)?.theme,
      "dark",
      "a generic commit that linearizes first and the later exact append must both persist"
    );
  } finally {
    if (previous.auth === undefined) delete process.env.AUTH_SESSION_SECRET; else process.env.AUTH_SESSION_SECRET = previous.auth;
    if (previous.dir === undefined) delete process.env.HK_MATH_DB_DIR; else process.env.HK_MATH_DB_DIR = previous.dir;
    if (previous.demo === undefined) delete process.env.HK_MATH_ENABLE_DEMO_USER; else process.env.HK_MATH_ENABLE_DEMO_USER = previous.demo;
    if (previous.provider === undefined) delete process.env.HK_MATH_STORAGE_PROVIDER; else process.env.HK_MATH_STORAGE_PROVIDER = previous.provider;
    if (previous.path === undefined) delete process.env.HK_MATH_DB_PATH; else process.env.HK_MATH_DB_PATH = previous.path;
    if (previous.postgres === undefined) delete process.env.POSTGRES_URL; else process.env.POSTGRES_URL = previous.postgres;
    await rm(root, { recursive: true, force: true });
  }
});
