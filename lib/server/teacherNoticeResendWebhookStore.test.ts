import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import type { TeacherNoticeResendWebhookEnvelope } from "./teacherNoticeResendWebhook";
import {
  createTeacherNoticeResendWebhookMaintenance,
  createTeacherNoticeResendWebhookPersistence
} from "./teacherNoticeResendWebhookStore";

const event: TeacherNoticeResendWebhookEnvelope = {
  eventId: "evt-store",
  type: "email.delivered",
  occurredAt: "2026-08-23T01:02:03.004Z",
  occurredAtNs: "1787446923004000001",
  priority: 20,
  providerMessageId: "550e8400-e29b-41d4-a716-446655440000"
};

test("runtime store selects SQLite without auto-migration and never exposes configuration", async () => {
  const calls: unknown[] = [];
  const persist = createTeacherNoticeResendWebhookPersistence({
    env: {
      HK_MATH_STORAGE_PROVIDER: "sqlite",
      HK_MATH_DB_PATH: "relative/private.sqlite"
    },
    sqlitePersist: async (dbPath, receivedEvent) => {
      calls.push({ dbPath, event: receivedEvent });
      return { status: "applied" as const };
    },
    postgresPersist: async () => {
      throw new Error("must not use Postgres");
    }
  });
  assert.deepEqual(await persist(event), { status: "applied" });
  assert.deepEqual(calls, [{
    dbPath: path.resolve("relative/private.sqlite"),
    event
  }]);
});

test("runtime store requires one Postgres URL and delegates without fallback", async () => {
  const missing = createTeacherNoticeResendWebhookPersistence({
    env: { HK_MATH_STORAGE_PROVIDER: "postgres" },
    sqlitePersist: async () => ({ status: "applied" }),
    postgresPersist: async () => ({ status: "applied" })
  });
  await assert.rejects(missing(event), /POSTGRES_URL is required/u);

  let receivedUrl = "";
  const configured = createTeacherNoticeResendWebhookPersistence({
    env: {
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_URL: "postgres://private-user:private-password@example.invalid/private-db"
    },
    sqlitePersist: async () => {
      throw new Error("must not fall back to SQLite");
    },
    postgresPersist: async (url, receivedEvent) => {
      receivedUrl = url;
      assert.equal(receivedEvent, event);
      return { status: "replayed" as const };
    }
  });
  assert.deepEqual(await configured(event), { status: "replayed" });
  assert.match(receivedUrl, /^postgres:\/\//u);
});

test("bounded maintenance selects exactly one configured store without fallback", async () => {
  const monotonicNow = () => 1_000;
  const limits = {
    reconciliationLimit: 100,
    retentionLimit: 100,
    deadlineAt: 21_000,
    monotonicNow
  };
  const result = {
    reconciledProviders: 0,
    eventsMatched: 0,
    statesUpserted: 0,
    eventsDeleted: 0,
    statesDeleted: 0,
    hasMoreReconciliation: false,
    hasMoreRetention: false
  };
  const sqliteCalls: unknown[] = [];
  const sqliteMaintenance = createTeacherNoticeResendWebhookMaintenance({
    env: { HK_MATH_STORAGE_PROVIDER: "sqlite", HK_MATH_DB_PATH: "relative/private.sqlite" },
    sqliteMaintain: async (dbPath, receivedLimits) => {
      sqliteCalls.push({ dbPath, limits: receivedLimits });
      return result;
    },
    postgresMaintain: async () => {
      throw new Error("must not use PostgreSQL");
    }
  });
  assert.deepEqual(await sqliteMaintenance(limits), result);
  assert.deepEqual(sqliteCalls, [{ dbPath: path.resolve("relative/private.sqlite"), limits }]);

  const missingPostgres = createTeacherNoticeResendWebhookMaintenance({
    env: { HK_MATH_STORAGE_PROVIDER: "postgres" },
    sqliteMaintain: async () => result,
    postgresMaintain: async () => result
  });
  await assert.rejects(missingPostgres(limits), /POSTGRES_URL is required/u);

  let postgresUrl = "";
  const postgresMaintenance = createTeacherNoticeResendWebhookMaintenance({
    env: {
      HK_MATH_STORAGE_PROVIDER: "postgres",
      POSTGRES_URL: "postgres://private-user:private-password@example.invalid/private-db"
    },
    sqliteMaintain: async () => {
      throw new Error("must not fall back to SQLite");
    },
    postgresMaintain: async (url, receivedLimits) => {
      postgresUrl = url;
      assert.deepEqual(receivedLimits, limits);
      return result;
    }
  });
  assert.deepEqual(await postgresMaintenance(limits), result);
  assert.match(postgresUrl, /^postgres:\/\//u);
});

test("runtime persistence and maintenance fail closed on an unknown storage provider", async () => {
  let calls = 0;
  const persist = createTeacherNoticeResendWebhookPersistence({
    env: { HK_MATH_STORAGE_PROVIDER: "postgress" },
    sqlitePersist: async () => {
      calls += 1;
      return { status: "applied" };
    },
    postgresPersist: async () => {
      calls += 1;
      return { status: "applied" };
    }
  });
  await assert.rejects(persist(event), /storage provider is unsupported/i);

  const maintain = createTeacherNoticeResendWebhookMaintenance({
    env: { HK_MATH_STORAGE_PROVIDER: "postgress" },
    sqliteMaintain: async () => {
      calls += 1;
      throw new Error("must not be reached");
    },
    postgresMaintain: async () => {
      calls += 1;
      throw new Error("must not be reached");
    }
  });
  await assert.rejects(
    maintain({ reconciliationLimit: 100, retentionLimit: 100 }),
    /storage provider is unsupported/i
  );
  assert.equal(calls, 0);
});
