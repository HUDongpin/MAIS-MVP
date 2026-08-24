import assert from "node:assert/strict";
import test from "node:test";

import { createStorageHealthRouteHandler } from "@/app/api/admin/storage/health/route";

const privateNoStore = "private, no-store, max-age=0";

test("anonymous storage-health requests are private and never run diagnostics", async () => {
  let diagnosticsCalled = false;
  const handler = createStorageHealthRouteHandler({
    authenticate: async () => null,
    readStorageReadinessSnapshot: async () => {
      diagnosticsCalled = true;
      throw new Error("diagnostics must not run");
    }
  });

  const response = await handler(new Request("http://localhost/api/admin/storage/health"));

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Cache-Control"), privateNoStore);
  assert.deepEqual(await response.json(), { error: "Not authenticated." });
  assert.equal(diagnosticsCalled, false);
});

test("non-admin storage-health requests are private and never run diagnostics", async () => {
  let diagnosticsCalled = false;
  const handler = createStorageHealthRouteHandler({
    authenticate: async () => ({ user: { role: "teacher" } }) as never,
    readStorageReadinessSnapshot: async () => {
      diagnosticsCalled = true;
      throw new Error("diagnostics must not run");
    }
  });

  const response = await handler(new Request("http://localhost/api/admin/storage/health"));

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Cache-Control"), privateNoStore);
  assert.deepEqual(await response.json(), { error: "Admin role required." });
  assert.equal(diagnosticsCalled, false);
});

test("admin storage-health returns only the safe diagnostics DTO with private caching", async () => {
  const diagnosticsOptions: unknown[] = [];
  const handler = createStorageHealthRouteHandler({
    authenticate: async () => ({ user: { role: "admin" } }) as never,
    readStorageReadinessSnapshot: async (options) => {
      diagnosticsOptions.push(options);
      return {
        configuredPath: true,
        configuredUrl: true,
        dataLayer: { secretDiagnostic: "do-not-return" },
        databaseDirectory: "/private/storage",
        databasePath: "postgres://user:secret@localhost/database",
        durableReady: true,
        generatedAt: "2026-08-24T00:00:00.000Z",
        hotAuthTables: {
          counts: {
            auth_password_reset_tokens: 1,
            auth_student_profiles: 2,
            auth_user_settings: 3,
            auth_users: 4
          },
          mode: "postgres-row-hot-path",
          readEnabled: true,
          readFlagEnv: "HK_MATH_POSTGRES_HOT_AUTH_TABLES",
          shadowSyncOnPostgres: true,
          tables: ["auth_users"],
          tablesReady: true
        },
        message: "postgres provider detail must not escape",
        provider: "postgres",
        runtime: "vercel",
        status: "durable-ready",
        usingTmpFallback: false
      } as never;
    }
  });

  const response = await handler(new Request("http://localhost/api/admin/storage/health"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), privateNoStore);
  assert.deepEqual(diagnosticsOptions, [{ includeDiagnosticsCounts: true }]);
  assert.deepEqual(body, {
    storage: {
      configuredPath: true,
      configuredUrl: true,
      durableReady: true,
      hotAuthTables: {
        counts: {
          auth_password_reset_tokens: 1,
          auth_student_profiles: 2,
          auth_user_settings: 3,
          auth_users: 4
        },
        mode: "postgres-row-hot-path",
        readEnabled: true,
        shadowSyncOnPostgres: true,
        tablesReady: true
      },
      provider: "postgres",
      runtime: "vercel",
      status: "durable-ready",
      usingTmpFallback: false
    }
  });
  assert.doesNotMatch(
    JSON.stringify(body),
    /secret|"(?:databasePath|databaseDirectory|message|readFlagEnv|tables)"/u
  );
});

test("authentication failures become a private stable storage-health 503", async () => {
  let diagnosticsCalled = false;
  const handler = createStorageHealthRouteHandler({
    authenticate: async () => {
      throw new Error("session database connection detail");
    },
    readStorageReadinessSnapshot: async () => {
      diagnosticsCalled = true;
      throw new Error("diagnostics must not run");
    }
  });

  const response = await handler(new Request("http://localhost/api/admin/storage/health"));

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), privateNoStore);
  assert.deepEqual(await response.json(), { error: "Service temporarily unavailable." });
  assert.equal(diagnosticsCalled, false);
});

test("diagnostics failures become a private stable storage-health 503 without provider detail", async () => {
  const handler = createStorageHealthRouteHandler({
    authenticate: async () => ({ user: { role: "admin" } }) as never,
    readStorageReadinessSnapshot: async () => {
      throw new Error("postgres://user:secret@host/database relation auth_users failed");
    }
  });

  const response = await handler(new Request("http://localhost/api/admin/storage/health"));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), privateNoStore);
  assert.deepEqual(body, { error: "Service temporarily unavailable." });
  assert.doesNotMatch(JSON.stringify(body), /postgres|secret|auth_users|database/u);
});
