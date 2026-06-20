import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("Vercel registration is blocked before real-user writes when durable storage is not configured", async () => {
  const previousAuthSecret = process.env.AUTH_SESSION_SECRET;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousDbPath = process.env.HK_MATH_DB_PATH;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousPostgresUrl = process.env.POSTGRES_URL;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const previousVercel = process.env.VERCEL;
  const previousVercelEnv = process.env.VERCEL_ENV;
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-register-storage-gate-"));

  try {
    process.env.AUTH_SESSION_SECRET = "register-storage-gate-test-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "production";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.HK_MATH_STORAGE_PROVIDER;
    delete process.env.POSTGRES_URL;

    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.test/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "student",
        name: "Storage Gate Student",
        username: `storage-gate-${Date.now()}@example.test`,
        password: "12345",
        grade: "P1",
        curriculumProfile: { region: "US", publisher: "US_CA" },
        language: "en",
        theme: "dark"
      })
    }));
    const body = await response.json() as {
      code?: string;
      storage?: {
        provider?: string;
        durableReady?: boolean;
        usingTmpFallback?: boolean;
      };
    };

    assert.equal(response.status, 503);
    assert.equal(body.code, "durable-storage-required");
    assert.equal(body.storage?.provider, "sqlite");
    assert.equal(body.storage?.durableReady, false);
    assert.equal(body.storage?.usingTmpFallback, true);
  } finally {
    restoreEnv("AUTH_SESSION_SECRET", previousAuthSecret);
    restoreEnv("HK_MATH_DB_DIR", previousDbDir);
    restoreEnv("HK_MATH_DB_PATH", previousDbPath);
    restoreEnv("HK_MATH_ENABLE_DEMO_USER", previousDemoFlag);
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    restoreEnv("POSTGRES_URL", previousPostgresUrl);
    restoreEnv("VERCEL", previousVercel);
    restoreEnv("VERCEL_ENV", previousVercelEnv);
    await rm(dbDir, { recursive: true, force: true });
  }
});
