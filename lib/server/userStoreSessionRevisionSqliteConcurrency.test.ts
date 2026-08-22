import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const repositoryRoot = process.cwd();
const tsxPath = path.join(repositoryRoot, "node_modules/.bin/tsx");
const workerPath = path.join(repositoryRoot, "scripts/session-sqlite-concurrency-worker.ts");
const resultPrefix = "SESSION_SQLITE_WORKER_RESULT=";
const demoUserId = "student-peter";
const demoUsername = "student.peter@example.edu.hk";
const demoPassword = "12345";
const changedPassword = "changed-demo-password";
const workerTimeoutMs = 120_000;

type WorkerResult = Record<string, unknown>;

type RunningWorker = {
  result: Promise<WorkerResult>;
};

function workerEnvironment(databasePath: string, additions: Record<string, string> = {}) {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    AUTH_SESSION_SECRET: "sqlite-session-concurrency-test-secret",
    HK_MATH_DB_PATH: databasePath,
    HK_MATH_DISABLE_SQLITE_READ_CACHE: "true",
    HK_MATH_ENABLE_DEMO_USER: "true",
    HK_MATH_STORAGE_PROVIDER: "sqlite",
    NODE_ENV: "test",
    SESSION_SQLITE_TEST_USER_ID: demoUserId,
    SESSION_SQLITE_TEST_USERNAME: demoUsername,
    ...additions
  };
  delete environment.POSTGRES_URL;
  delete environment.VERCEL;
  delete environment.VERCEL_ENV;
  return environment;
}

function startWorker(
  command: string,
  databasePath: string,
  additions: Record<string, string> = {}
): RunningWorker {
  const child = spawn(tsxPath, ["--tsconfig", "tsconfig.json", workerPath, command], {
    cwd: repositoryRoot,
    env: workerEnvironment(databasePath, additions),
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";

  const result = new Promise<WorkerResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`SQLite session worker ${command} timed out.`));
    }, workerTimeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (exitCode, signal) => {
      clearTimeout(timer);
      if (exitCode !== 0) {
        reject(new Error(
          `SQLite session worker ${command} exited with ${String(exitCode)} (${signal ?? "no signal"}): ${stderr.trim()}`
        ));
        return;
      }

      const resultLine = stdout
        .split(/\r?\n/)
        .find((line) => line.startsWith(resultPrefix));
      if (!resultLine) {
        reject(new Error(`SQLite session worker ${command} emitted no structured result: ${stderr.trim()}`));
        return;
      }

      try {
        resolve(JSON.parse(resultLine.slice(resultPrefix.length)) as WorkerResult);
      } catch (error) {
        reject(error);
      }
    });
  });

  return { result };
}

async function runWorker(
  command: string,
  databasePath: string,
  additions: Record<string, string> = {}
) {
  return startWorker(command, databasePath, additions).result;
}

async function waitForFile(filePath: string, workerResult: Promise<WorkerResult>) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      await access(filePath);
      return;
    } catch {
      const workerSettled = await Promise.race([
        workerResult.then(
          () => true,
          (error) => Promise.reject(error)
        ),
        new Promise<false>((resolve) => setTimeout(() => resolve(false), 25))
      ]);
      if (workerSettled) {
        throw new Error("Password-change worker exited before reaching the test barrier.");
      }
    }
  }
  throw new Error("Timed out waiting for password-change worker to reach the test barrier.");
}

async function releaseAfterContenderStarts(
  releasePath: string,
  contenderResult: Promise<WorkerResult>
) {
  const earlyOutcome = await Promise.race([
    contenderResult.then((value) => ({ state: "settled" as const, value })),
    new Promise<{ state: "pending" }>((resolve) => {
      setTimeout(() => resolve({ state: "pending" }), 750);
    })
  ]);
  await writeFile(releasePath, "release", { flag: "wx" });
  return earlyOutcome.state === "settled" ? earlyOutcome.value : contenderResult;
}

function persistedDemoUser(databasePath: string) {
  const storage = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = storage.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as {
      payload?: unknown;
    } | undefined;
    if (typeof row?.payload !== "string") {
      assert.fail("SQLite app_state must contain a string payload");
    }
    const payload = JSON.parse(row.payload) as {
      users?: Array<{
        id?: unknown;
        session_revision?: unknown;
        disabled_at?: unknown;
      }>;
    };
    const user = payload.users?.find((candidate) => candidate.id === demoUserId);
    assert.ok(user, "demo user must remain in the persisted snapshot");
    return user;
  } finally {
    storage.close();
  }
}

function corruptDemoAuthStateForReadNormalization(databasePath: string) {
  const storage = new DatabaseSync(databasePath);
  try {
    const row = storage.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as {
      payload?: unknown;
    } | undefined;
    if (typeof row?.payload !== "string") {
      assert.fail("SQLite app_state must contain a string payload before normalization setup");
    }
    const payload = JSON.parse(row.payload) as {
      users?: Array<Record<string, unknown>>;
    };
    const user = payload.users?.find((candidate) => candidate.id === demoUserId);
    assert.ok(user, "demo user must exist before normalization setup");
    delete user.session_revision;
    delete user.disabled_at;
    user.password_hash = "";
    user.password_salt = "";
    storage.prepare(`
      UPDATE app_state
      SET payload = ?, revision = revision + 1, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(payload), new Date().toISOString(), "primary");
  } finally {
    storage.close();
  }
}

async function initializeDatabase(databasePath: string) {
  const initialized = await runWorker("initialize", databasePath);
  assert.deepEqual(initialized, { status: "authenticated", sessionRevision: 1 });
}

test("SQLite serializes cross-process password change and disable without losing revocation", { timeout: 180_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-session-sqlite-disable-"));
  const databasePath = path.join(directory, "app.sqlite");
  const readyPath = path.join(directory, "password-ready");
  const releasePath = path.join(directory, "password-release");
  const contenderReadyPath = path.join(directory, "disable-ready");
  const contenderStartPath = path.join(directory, "disable-start");

  try {
    await initializeDatabase(databasePath);
    const passwordWorker = startWorker("change-password", databasePath, {
      SESSION_SQLITE_BARRIER_PASSWORD: changedPassword,
      SESSION_SQLITE_BARRIER_READY: readyPath,
      SESSION_SQLITE_BARRIER_RELEASE: releasePath,
      SESSION_SQLITE_CURRENT_PASSWORD: demoPassword,
      SESSION_SQLITE_NEXT_PASSWORD: changedPassword
    });
    await waitForFile(readyPath, passwordWorker.result);

    const disableWorker = startWorker("disable", databasePath, {
      SESSION_SQLITE_START_READY: contenderReadyPath,
      SESSION_SQLITE_START_RELEASE: contenderStartPath
    });
    await waitForFile(contenderReadyPath, disableWorker.result);
    await writeFile(contenderStartPath, "start", { flag: "wx" });
    const disableResultPromise = releaseAfterContenderStarts(releasePath, disableWorker.result);
    const [passwordResult, disableResult] = await Promise.all([
      passwordWorker.result,
      disableResultPromise
    ]);

    assert.deepEqual(passwordResult, { status: "updated", sessionRevision: 2 });
    assert.equal(disableResult.status, "updated");
    assert.equal(disableResult.sessionRevision, 3);
    assert.equal(typeof disableResult.disabledAt, "string");

    const persistedUser = persistedDemoUser(databasePath);
    assert.equal(persistedUser.session_revision, 3);
    assert.equal(typeof persistedUser.disabled_at, "string");
    assert.deepEqual(await runWorker("login", databasePath, {
      SESSION_SQLITE_PASSWORD: changedPassword
    }), { status: "invalid", sessionRevision: null });
    assert.deepEqual(await runWorker("session-check", databasePath, {
      SESSION_SQLITE_REVISION: "1"
    }), { status: "rejected", revision: 1 });
    assert.deepEqual(await runWorker("session-check", databasePath, {
      SESSION_SQLITE_REVISION: "2"
    }), { status: "rejected", revision: 2 });
  } finally {
    await writeFile(releasePath, "release").catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});

test("SQLite serializes cross-process password change and logout-all and releases a thrown mutator lock", { timeout: 180_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-session-sqlite-logout-"));
  const databasePath = path.join(directory, "app.sqlite");
  const readyPath = path.join(directory, "password-ready");
  const releasePath = path.join(directory, "password-release");
  const contenderReadyPath = path.join(directory, "logout-ready");
  const contenderStartPath = path.join(directory, "logout-start");

  try {
    await initializeDatabase(databasePath);
    const passwordWorker = startWorker("change-password", databasePath, {
      SESSION_SQLITE_BARRIER_PASSWORD: changedPassword,
      SESSION_SQLITE_BARRIER_READY: readyPath,
      SESSION_SQLITE_BARRIER_RELEASE: releasePath,
      SESSION_SQLITE_CURRENT_PASSWORD: demoPassword,
      SESSION_SQLITE_NEXT_PASSWORD: changedPassword
    });
    await waitForFile(readyPath, passwordWorker.result);

    const logoutWorker = startWorker("logout-all", databasePath, {
      SESSION_SQLITE_START_READY: contenderReadyPath,
      SESSION_SQLITE_START_RELEASE: contenderStartPath
    });
    await waitForFile(contenderReadyPath, logoutWorker.result);
    await writeFile(contenderStartPath, "start", { flag: "wx" });
    const logoutResultPromise = releaseAfterContenderStarts(releasePath, logoutWorker.result);
    const [passwordResult, logoutResult] = await Promise.all([
      passwordWorker.result,
      logoutResultPromise
    ]);

    assert.deepEqual(passwordResult, { status: "updated", sessionRevision: 2 });
    assert.deepEqual(logoutResult, { status: "revoked", sessionRevision: 3 });
    assert.equal(persistedDemoUser(databasePath).session_revision, 3);
    assert.deepEqual(await runWorker("session-check", databasePath, {
      SESSION_SQLITE_REVISION: "1"
    }), { status: "rejected", revision: 1 });
    assert.deepEqual(await runWorker("session-check", databasePath, {
      SESSION_SQLITE_REVISION: "2"
    }), { status: "rejected", revision: 2 });

    const thrown = await runWorker("throwing-password-change", databasePath, {
      SESSION_SQLITE_CURRENT_PASSWORD: changedPassword
    });
    assert.equal(thrown.status, "threw");
    assert.equal(persistedDemoUser(databasePath).session_revision, 3);

    const postThrowLogout = await runWorker("logout-all", databasePath);
    assert.deepEqual(postThrowLogout, { status: "revoked", sessionRevision: 4 });
    assert.equal(persistedDemoUser(databasePath).session_revision, 4);
    await assert.rejects(
      runWorker("unsupported-command", databasePath),
      /exited with 1[\s\S]*Unsupported worker command/
    );
  } finally {
    await writeFile(releasePath, "release").catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});

test("SQLite read-triggered normalization re-reads under lock instead of overwriting a concurrent logout", { timeout: 180_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-session-sqlite-normalize-"));
  const databasePath = path.join(directory, "app.sqlite");
  const readerReadyPath = path.join(directory, "reader-ready");
  const readerReleasePath = path.join(directory, "reader-release");
  const logoutReadyPath = path.join(directory, "logout-ready");
  const logoutStartPath = path.join(directory, "logout-start");

  try {
    await initializeDatabase(databasePath);
    corruptDemoAuthStateForReadNormalization(databasePath);

    const reader = startWorker("login", databasePath, {
      SESSION_SQLITE_BARRIER_PASSWORD: demoPassword,
      SESSION_SQLITE_BARRIER_READY: readerReadyPath,
      SESSION_SQLITE_BARRIER_RELEASE: readerReleasePath,
      SESSION_SQLITE_PASSWORD: demoPassword
    });
    await waitForFile(readerReadyPath, reader.result);

    const logout = startWorker("logout-all", databasePath, {
      SESSION_SQLITE_START_READY: logoutReadyPath,
      SESSION_SQLITE_START_RELEASE: logoutStartPath
    });
    await waitForFile(logoutReadyPath, logout.result);
    await writeFile(logoutStartPath, "start", { flag: "wx" });
    const logoutResultPromise = releaseAfterContenderStarts(readerReleasePath, logout.result);
    const [readerResult, logoutResult] = await Promise.all([
      reader.result,
      logoutResultPromise
    ]);

    assert.deepEqual(logoutResult, { status: "revoked", sessionRevision: 3 });
    assert.deepEqual(readerResult, { status: "authenticated", sessionRevision: 3 });
    assert.equal(persistedDemoUser(databasePath).session_revision, 3);
    assert.deepEqual(await runWorker("session-check", databasePath, {
      SESSION_SQLITE_REVISION: "2"
    }), { status: "rejected", revision: 2 });
    assert.deepEqual(await runWorker("session-check", databasePath, {
      SESSION_SQLITE_REVISION: "3"
    }), { status: "authenticated", revision: 3 });
  } finally {
    await writeFile(readerReleasePath, "release").catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});

test("fixed demo login uses persisted revision, disabled state, and changed password with curriculum selection", { timeout: 180_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-session-sqlite-demo-login-"));
  const databasePath = path.join(directory, "app.sqlite");

  try {
    await initializeDatabase(databasePath);

    assert.deepEqual(await runWorker("logout-all", databasePath), {
      status: "revoked",
      sessionRevision: 2
    });
    assert.deepEqual(await runWorker("login-route", databasePath, {
      SESSION_SQLITE_PASSWORD: demoPassword
    }), { status: 200, sessionRevision: 2, subject: demoUserId });

    assert.equal((await runWorker("disable", databasePath)).sessionRevision, 3);
    assert.deepEqual(await runWorker("login-route", databasePath, {
      SESSION_SQLITE_PASSWORD: demoPassword
    }), { status: 401, sessionRevision: null, subject: null });
    assert.deepEqual(await runWorker("enable", databasePath), {
      status: "updated",
      sessionRevision: 4,
      disabledAt: null
    });
    assert.deepEqual(await runWorker("login-route", databasePath, {
      SESSION_SQLITE_PASSWORD: demoPassword
    }), { status: 200, sessionRevision: 4, subject: demoUserId });

    assert.deepEqual(await runWorker("change-password", databasePath, {
      SESSION_SQLITE_CURRENT_PASSWORD: demoPassword,
      SESSION_SQLITE_NEXT_PASSWORD: changedPassword
    }), { status: "updated", sessionRevision: 5 });
    assert.deepEqual(await runWorker("login-route", databasePath, {
      SESSION_SQLITE_PASSWORD: changedPassword
    }), { status: 200, sessionRevision: 5, subject: demoUserId });
    assert.deepEqual(await runWorker("login", databasePath, {
      SESSION_SQLITE_PASSWORD: changedPassword
    }), { status: "authenticated", sessionRevision: 5 });
    assert.deepEqual(await runWorker("login-route", databasePath, {
      SESSION_SQLITE_PASSWORD: demoPassword
    }), { status: 401, sessionRevision: null, subject: null });
    assert.deepEqual(await runWorker("login", databasePath, {
      SESSION_SQLITE_PASSWORD: demoPassword
    }), { status: "invalid", sessionRevision: null });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
