import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SESSION_COOKIE_NAME } from "@/lib/session";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("real register and login handlers fail closed and clear cookies when session issuance is unavailable", async () => {
  const envKeys = [
    "AUTH_SESSION_SECRET",
    "HK_MATH_DB_PATH",
    "HK_MATH_ENABLE_DEMO_USER",
    "HK_MATH_STORAGE_PROVIDER",
    "NEXTAUTH_SECRET",
    "NODE_ENV",
    "POSTGRES_URL",
    "VERCEL",
    "VERCEL_ENV"
  ] as const;
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const databaseDirectory = await mkdtemp(path.join(tmpdir(), "mais-session-issuance-routes-"));
  const username = `session-issuance-${Date.now()}@example.test`;

  try {
    delete process.env.AUTH_SESSION_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.POSTGRES_URL;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    process.env.HK_MATH_DB_PATH = path.join(databaseDirectory, "app.sqlite");
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
    Object.defineProperty(process.env, "NODE_ENV", {
      configurable: true,
      enumerable: true,
      value: "production",
      writable: true
    });

    const [{ POST: register }, { POST: login }] = await Promise.all([
      import("@/app/api/auth/register/route"),
      import("@/app/api/auth/login/route")
    ]);
    const registerResponse = await register(new Request("https://mais.example.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        role: "student",
        name: "Session Issuance Student",
        username,
        password: "start12345",
        grade: "P1",
        curriculumProfile: { region: "US", publisher: "US_CA" },
        language: "en",
        theme: "dark"
      })
    }));

    assert.equal(registerResponse.status, 503);
    assert.deepEqual(await registerResponse.json(), {
      code: "account-created-session-refresh-required",
      error: "Your account was created, but this device could not be signed in. Sign in again with your new account.",
      accountCreated: true
    });
    assert.equal(registerResponse.cookies.get(SESSION_COOKIE_NAME)?.maxAge, 0);

    const loginResponse = await login(new Request("https://mais.example.test/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password: "start12345" })
    }));

    assert.equal(loginResponse.status, 503);
    assert.deepEqual(await loginResponse.json(), {
      code: "session-service-unavailable",
      error: "Sign-in is temporarily unavailable. Try again later."
    });
    assert.equal(loginResponse.cookies.get(SESSION_COOKIE_NAME)?.maxAge, 0);
  } finally {
    for (const key of envKeys) restoreEnv(key, previousEnv[key]);
    await rm(databaseDirectory, { recursive: true, force: true });
  }
});
