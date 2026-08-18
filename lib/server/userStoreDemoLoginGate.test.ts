import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

/**
 * The published demo password must not authenticate on a production deployment that
 * has not opted in.
 *
 * The env is set before the first `import("./userStore")` on purpose: the store
 * resolves its demo password once, when the module builds its persistence store, so
 * a later mutation would not be seen. That is also why this file exists separately
 * from userStoreDemoLogin.test.ts — one module registry can only hold one
 * configuration, and node's test runner gives each file its own process.
 */
function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("published demo credentials do not authenticate on a production deployment", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousVercelEnv = process.env.VERCEL_ENV;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousFastLoginFlag = process.env.HK_MATH_ENABLE_INTERNAL_FAST_LOGIN;
  const previousDemoPassword = process.env.HK_MATH_DEMO_PASSWORD;
  const previousAuthSecret = process.env.AUTH_SESSION_SECRET;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousDbPath = process.env.HK_MATH_DB_PATH;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-demo-login-gate-"));

  try {
    // Nothing opted in: exactly what a fresh production deployment looks like.
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.AUTH_SESSION_SECRET = "demo-login-gate-test-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    delete process.env.VERCEL_ENV;
    delete process.env.HK_MATH_ENABLE_DEMO_USER;
    delete process.env.HK_MATH_ENABLE_INTERNAL_FAST_LOGIN;
    delete process.env.HK_MATH_DEMO_PASSWORD;
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.HK_MATH_STORAGE_PROVIDER;

    const { authenticateFlexibleExampleAccountForLogin, authenticateUserForLogin } = await import("./userStore");

    // The regular store-backed login, which is what the seeded rows are reached through.
    for (const username of ["HK Student Peter", "HK Teacher Chan", "Teacher Phoebe", "Student Jon", "Teacher Rhi"]) {
      assert.equal(
        (await authenticateUserForLogin(username, "12345")).status,
        "invalid",
        `${username} must not authenticate with the published demo password`
      );
    }

    // The storage-free example fast path, which resolved a session from a seed
    // identifier with no database row behind it.
    const flexible = await authenticateFlexibleExampleAccountForLogin({
      username: "Student Peter",
      password: "12345",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      selectedGrade: "S4",
      language: "en",
      theme: "dark"
    });
    assert.notEqual(flexible.status, "authenticated");

    // And the login route as a whole, which additionally consults the internal
    // California fast path before it reaches the store.
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(new Request("https://example.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Teacher Scott", password: "12345" })
    }));

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    restoreEnv("NODE_ENV", previousNodeEnv);
    restoreEnv("VERCEL_ENV", previousVercelEnv);
    restoreEnv("HK_MATH_ENABLE_DEMO_USER", previousDemoFlag);
    restoreEnv("HK_MATH_ENABLE_INTERNAL_FAST_LOGIN", previousFastLoginFlag);
    restoreEnv("HK_MATH_DEMO_PASSWORD", previousDemoPassword);
    restoreEnv("AUTH_SESSION_SECRET", previousAuthSecret);
    restoreEnv("HK_MATH_DB_DIR", previousDbDir);
    restoreEnv("HK_MATH_DB_PATH", previousDbPath);
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    await rm(dbDir, { recursive: true, force: true });
  }
});
