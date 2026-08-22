import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

type Result = { status: number; body: Record<string, unknown> };

test("SQLite cross-process append and clear linearize without a durable resurrection ACK", async () => {
  const tmpBase = path.join(process.cwd(), ".tmp");
  await mkdir(tmpBase, { recursive: true });
  const root = await mkdtemp(path.join(tmpBase, "learning-events-append-clear-"));
  const dbDir = path.join(root, "db");
  await mkdir(dbDir);
  const previous = {
    auth: process.env.AUTH_SESSION_SECRET,
    dir: process.env.HK_MATH_DB_DIR,
    demo: process.env.HK_MATH_ENABLE_DEMO_USER,
    provider: process.env.HK_MATH_STORAGE_PROVIDER,
    path: process.env.HK_MATH_DB_PATH,
    postgres: process.env.POSTGRES_URL
  };
  const authSecret = "append-clear-cross-process-test-secret";
  try {
    process.env.AUTH_SESSION_SECRET = authSecret;
    process.env.HK_MATH_DB_DIR = dbDir;
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
        name: "Append Clear Student",
        username: "append-clear@example.test",
        email: "append-clear@example.test",
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
    const workerPath = path.join(root, "worker.mjs");
    await writeFile(workerPath, `
      import { access, writeFile } from "node:fs/promises";
      import path from "node:path";
      const [kind, root] = process.argv.slice(2);
      process.env.AUTH_SESSION_SECRET = process.env.PROBE_AUTH_SECRET;
      process.env.HK_MATH_DB_DIR = path.join(root, "db");
      process.env.HK_MATH_ENABLE_DEMO_USER = "false";
      process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
      delete process.env.HK_MATH_DB_PATH;
      delete process.env.POSTGRES_URL;
      const [{ POST, DELETE }, { getAuthenticatedUserById }] = await Promise.all([
        import(${JSON.stringify(path.join(process.cwd(), "app/api/learning-events/route.ts"))}),
        import(${JSON.stringify(path.join(process.cwd(), "lib/server/userStore.ts"))})
      ]);
      await getAuthenticatedUserById(process.env.PROBE_USER_ID);
      await writeFile(path.join(root, "ready-" + kind), "ready");
      while (true) {
        try { await access(path.join(root, "release")); break; }
        catch { await new Promise((resolve) => setTimeout(resolve, 5)); }
      }
      const headers = {
        Cookie: process.env.PROBE_COOKIE,
        "X-MAIS-Analytics-User-Id": encodeURIComponent(process.env.PROBE_USER_ID)
      };
      const response = kind === "append"
        ? await POST(new Request("https://example.test/api/learning-events", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ generation: 0, events: [{
              id: "append-clear-race-event",
              type: "page-view",
              source: "visualization-lab",
              timestamp: "2099-08-13T07:00:00.000Z",
              grade: "S3",
              topicId: "append-clear-race-topic"
            }] })
          }))
        : await DELETE(new Request("https://example.test/api/learning-events", {
            method: "DELETE",
            headers: {
              ...headers,
              "X-MAIS-Analytics-Generation": "0",
              "X-MAIS-Analytics-Clear-Request-Id": "append-clear-race-request"
            }
          }));
      await writeFile(path.join(root, "result-" + kind + ".json"), JSON.stringify({
        status: response.status,
        body: await response.json()
      }));
    `);
    const env = {
      ...process.env,
      PROBE_AUTH_SECRET: authSecret,
      PROBE_COOKIE: cookie,
      PROBE_USER_ID: session.user.id
    };
    const workers = ["append", "clear"].map((kind) => spawn(
      process.execPath,
      ["--import", "tsx", workerPath, kind, root],
      { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] }
    ));
    const deadline = Date.now() + 30_000;
    while (true) {
      try {
        await Promise.all(["append", "clear"].map((kind) =>
          readFile(path.join(root, `ready-${kind}`))
        ));
        break;
      } catch {
        if (Date.now() > deadline) throw new Error("append/clear workers did not become ready");
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }
    await writeFile(path.join(root, "release"), "release");
    await Promise.all(workers.map((child) => new Promise<void>((resolve, reject) => {
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(stderr)));
    })));

    const [append, clear] = await Promise.all(["append", "clear"].map(async (kind) =>
      JSON.parse(await readFile(path.join(root, `result-${kind}.json`), "utf8")) as Result
    ));
    assert.equal(clear.status, 200);
    assert.equal(clear.body.durablyPersisted, true);
    const sqlite = new DatabaseSync(path.join(dbDir, "hk-math-db.sqlite"), { readOnly: true });
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as { payload: string };
    sqlite.close();
    const payload = JSON.parse(row.payload) as {
      learning_events: Array<{ id: string }>;
      learning_event_clears: Array<{ generation: number; request_id?: string }>;
    };
    assert.equal(payload.learning_event_clears.some((entry) =>
      entry.generation === 1 && entry.request_id === "append-clear-race-request"
    ), true);
    if (append.status === 200 && append.body.durablyPersisted === true) {
      // If append linearized first, clear removed it. If clear linearized first,
      // the generation-zero append could not receive a durable 200.
      assert.equal(
        payload.learning_events.some((entry) => entry.id === "append-clear-race-event"),
        false
      );
    } else {
      assert.equal(append.status, 409);
      assert.equal(append.body.reason, "generation-mismatch");
    }
  } finally {
    for (const [key, value] of Object.entries({
      AUTH_SESSION_SECRET: previous.auth,
      HK_MATH_DB_DIR: previous.dir,
      HK_MATH_ENABLE_DEMO_USER: previous.demo,
      HK_MATH_STORAGE_PROVIDER: previous.provider,
      HK_MATH_DB_PATH: previous.path,
      POSTGRES_URL: previous.postgres
    })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(root, { recursive: true, force: true });
  }
});
