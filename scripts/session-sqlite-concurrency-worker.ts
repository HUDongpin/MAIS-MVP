import crypto from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";

const resultPrefix = "SESSION_SQLITE_WORKER_RESULT=";
const userId = process.env.SESSION_SQLITE_TEST_USER_ID ?? "student-peter";
const username = process.env.SESSION_SQLITE_TEST_USERNAME ?? "student.peter@example.edu.hk";
const currentPassword = process.env.SESSION_SQLITE_CURRENT_PASSWORD ?? "12345";
const nextPassword = process.env.SESSION_SQLITE_NEXT_PASSWORD ?? "changed-demo-password";

function emitResult(result: Record<string, unknown>) {
  process.stdout.write(`${resultPrefix}${JSON.stringify(result)}\n`);
}

function waitForReleaseFile(releasePath: string) {
  const waitBuffer = new Int32Array(new SharedArrayBuffer(4));
  const deadline = Date.now() + 30_000;
  while (!existsSync(releasePath)) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for the SQLite concurrency test barrier release.");
    }
    Atomics.wait(waitBuffer, 0, 0, 20);
  }
}

function installPasswordHashBarrier() {
  const readyPath = process.env.SESSION_SQLITE_BARRIER_READY;
  const releasePath = process.env.SESSION_SQLITE_BARRIER_RELEASE;
  const barrierPassword = process.env.SESSION_SQLITE_BARRIER_PASSWORD;
  if (!readyPath || !releasePath || !barrierPassword) return;

  const originalPbkdf2Sync = crypto.pbkdf2Sync;
  let reachedBarrier = false;
  Object.defineProperty(crypto, "pbkdf2Sync", {
    configurable: true,
    value(password: crypto.BinaryLike, ...args: Parameters<typeof crypto.pbkdf2Sync> extends [crypto.BinaryLike, ...infer Rest] ? Rest : never) {
      if (!reachedBarrier && String(password) === barrierPassword) {
        reachedBarrier = true;
        writeFileSync(readyPath, "ready", { flag: "wx" });
        waitForReleaseFile(releasePath);
      }
      return originalPbkdf2Sync.call(crypto, password, ...args);
    },
    writable: true
  });
  syncBuiltinESMExports();
}

function waitForOperationStart() {
  const readyPath = process.env.SESSION_SQLITE_START_READY;
  const releasePath = process.env.SESSION_SQLITE_START_RELEASE;
  if (!readyPath || !releasePath) return;
  writeFileSync(readyPath, "ready", { flag: "wx" });
  waitForReleaseFile(releasePath);
}

async function main() {
  const command = process.argv[2];
  if (!command) throw new Error("A worker command is required.");

  installPasswordHashBarrier();

  const store = await import("@/lib/server/userStore");
  waitForOperationStart();

  if (command === "initialize" || command === "login") {
    const result = await store.authenticateUserForLogin(
      username,
      process.env.SESSION_SQLITE_PASSWORD ?? currentPassword
    );
    emitResult({
      status: result.status,
      sessionRevision: result.status === "authenticated" ? result.sessionRevision : null
    });
    return;
  }

  if (command === "login-route") {
    const [{ POST }, { SESSION_COOKIE_NAME, verifySessionToken }] = await Promise.all([
      import("@/app/api/auth/login/route"),
      import("@/lib/session")
    ]);
    const response = await POST(new Request("https://mais.example.test/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `192.0.2.${process.pid % 255}`
      },
      body: JSON.stringify({
        username,
        password: process.env.SESSION_SQLITE_PASSWORD ?? currentPassword,
        curriculumProfile: {
          region: "HK",
          publisher: "HK_UNITED_PRIME_MIA"
        },
        grade: "S4",
        language: "en",
        theme: "dark"
      })
    }));
    const token = response.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = token ? await verifySessionToken(token) : null;
    emitResult({
      status: response.status,
      sessionRevision: payload?.sr ?? null,
      subject: payload?.sub ?? null
    });
    return;
  }

  if (command === "change-password") {
    const result = await store.changeAuthenticatedUserPassword({
      userId,
      currentPassword,
      password: nextPassword
    });
    emitResult({
      status: result.status,
      sessionRevision: result.status === "updated" ? result.sessionRevision : null
    });
    return;
  }

  if (command === "throwing-password-change") {
    try {
      await store.changeAuthenticatedUserPassword({
        userId,
        currentPassword,
        password: { length: 8 } as unknown as string
      });
    } catch (error) {
      emitResult({
        status: "threw",
        errorName: error instanceof Error ? error.name : "unknown"
      });
      return;
    }
    throw new Error("The malformed password mutation unexpectedly completed.");
  }

  if (command === "disable" || command === "enable") {
    const result = await store.setUserDisabledState(userId, command === "disable");
    emitResult({
      status: result.status,
      sessionRevision: result.status === "updated" ? result.sessionRevision : null,
      disabledAt: result.status === "updated" ? result.disabledAt : null
    });
    return;
  }

  if (command === "logout-all") {
    const result = await store.revokeAllUserSessions(userId);
    emitResult({
      status: result.status,
      sessionRevision: result.status === "revoked" ? result.sessionRevision : null
    });
    return;
  }

  if (command === "session-check") {
    const revision = Number(process.env.SESSION_SQLITE_REVISION);
    const { createSessionToken, verifySessionToken } = await import("@/lib/session");
    const token = await createSessionToken({ userId, sessionRevision: revision });
    const payload = await verifySessionToken(token);
    const session = payload
      ? await store.getAuthenticatedUserForSession(payload.sub, payload.sr)
      : null;
    emitResult({ status: session ? "authenticated" : "rejected", revision });
    return;
  }

  if (command === "guardian-read-normalize") {
    const foundation = await store.getParentFoundationData(
      "sqlite-guardian-provider-boundary-missing-parent"
    );
    emitResult({
      foundation: foundation === null ? "missing" : "found",
      status: "read"
    });
    return;
  }

  throw new Error(`Unsupported worker command: ${command}`);
}

main().catch((error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
