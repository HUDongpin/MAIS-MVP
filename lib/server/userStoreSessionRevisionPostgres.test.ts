import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { authAdminStorageHotAuthUserRows } from "@/lib/server/userStore/authAdminStoragePersistence";
import { projectedUserRecord } from "@/lib/server/userStore/authSessionPersistence";

const userStorePath = path.join(process.cwd(), "lib/server/userStore.ts");

function persistedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "student-1",
    username: "student-one",
    normalized_username: "student-one",
    password_hash: "hash",
    password_salt: "salt",
    role: "student",
    created_at: "2026-08-23T00:00:00.000Z",
    ...overrides
  };
}

test("hot-auth projection normalizes legacy session state and preserves revocation state", () => {
  const legacy = projectedUserRecord(persistedUser());
  assert.equal(legacy?.session_revision, 1);
  assert.equal(legacy?.disabled_at, null);

  const revoked = projectedUserRecord(persistedUser({
    session_revision: 8,
    disabled_at: "2026-08-23T01:00:00.000Z"
  }));
  assert.equal(revoked?.session_revision, 8);
  assert.equal(revoked?.disabled_at, "2026-08-23T01:00:00.000Z");

  const rows = authAdminStorageHotAuthUserRows([persistedUser({
    session_revision: 8,
    disabled_at: "2026-08-23T01:00:00.000Z"
  }) as never]);
  assert.equal(rows[0].session_revision, 8);
  assert.equal(rows[0].disabled_at, "2026-08-23T01:00:00.000Z");

  assert.throws(
    () => projectedUserRecord(persistedUser({ session_revision: 0 })),
    /invalid stored session revision/i
  );
  assert.throws(
    () => projectedUserRecord(persistedUser({ disabled_at: false })),
    /invalid stored disabled timestamp/i
  );
  assert.throws(
    () => projectedUserRecord(persistedUser({ disabled_at: "not-a-timestamp" })),
    /invalid stored disabled timestamp/i
  );
  assert.throws(
    () => authAdminStorageHotAuthUserRows([persistedUser({ session_revision: 0 }) as never]),
    /invalid stored session revision/i
  );
  assert.throws(
    () => authAdminStorageHotAuthUserRows([persistedUser({ disabled_at: false }) as never]),
    /invalid stored disabled timestamp/i
  );
});

test("Postgres hot-auth schema and upsert persist session revision and disabled timestamp", async () => {
  const source = await readFile(userStorePath, "utf8");

  assert.match(source, /const hotAuthSchemaVersion = 4/);
  assert.match(source, /session_revision INTEGER NOT NULL DEFAULT 1/);
  assert.match(source, /disabled_at TEXT/);
  assert.match(source, /ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS session_revision INTEGER NOT NULL DEFAULT 1/);
  assert.match(source, /ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS disabled_at TEXT/);
  assert.match(
    source,
    /sql\(users,[\s\S]*?"session_revision", "disabled_at"[\s\S]*?\)/
  );
  assert.match(source, /session_revision = excluded\.session_revision/);
  assert.match(source, /disabled_at = excluded\.disabled_at/);
});

test("snapshot normalization persists legacy session defaults instead of only projecting them in memory", async () => {
  const source = await readFile(userStorePath, "utf8");
  const start = source.indexOf("function databaseNeedsPersistenceSync");
  const end = source.indexOf("\nasync function loadSqliteDatabase", start);
  const persistenceSyncSource = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(persistenceSyncSource, /session_revision/);
  assert.match(persistenceSyncSource, /disabled_at/);
});

test("Postgres authentication and reset enforce revision atomically", async () => {
  const source = await readFile(userStorePath, "utf8");
  const createResetStart = source.indexOf("async function createPasswordResetRequestInPostgresHotTables");
  const createResetEnd = source.indexOf("\nexport const createPasswordResetRequest", createResetStart);
  const createResetSource = source.slice(createResetStart, createResetEnd);
  const resetStart = source.indexOf("async function resetUserPasswordInPostgresHotTables");
  const resetEnd = source.indexOf("\nexport const resetUserPassword", resetStart);
  const resetSource = source.slice(resetStart, resetEnd);

  assert.match(
    source,
    /async function getAuthenticatedUserForSessionFromPostgresHotTables\([\s\S]*?auth_user\.session_revision = \$\{sessionRevision\}[\s\S]*?auth_user\.disabled_at IS NULL/
  );
  assert.match(
    createResetSource,
    /SELECT payload[\s\S]*?FROM app_state[\s\S]*?FOR UPDATE[\s\S]*?INSERT INTO auth_password_reset_tokens[\s\S]*?UPDATE app_state[\s\S]*?password_reset_tokens/
  );
  assert.match(
    source,
    /async function resetUserPasswordInPostgresHotTables\([\s\S]*?FROM auth_password_reset_tokens[\s\S]*?FOR UPDATE[\s\S]*?UPDATE auth_users[\s\S]*?session_revision = session_revision \+ 1[\s\S]*?disabled_at IS NULL[\s\S]*?RETURNING session_revision/
  );
  assert.match(
    resetSource,
    /SELECT payload[\s\S]*?FROM app_state[\s\S]*?FOR UPDATE[\s\S]*?UPDATE app_state[\s\S]*?session_revision[\s\S]*?revision = revision \+ 1/
  );
  assert.match(
    resetSource,
    /UPDATE app_state[\s\S]*?password_reset_tokens[\s\S]*?used_at[\s\S]*?\$\{usedAt\}/
  );
  assert.match(resetSource, /if \(!resetToken\) return \{ status: "invalid" as const \}/);
  assert.match(
    resetSource,
    /const expiresAtMs = Date\.parse\(resetToken\.expires_at\)[\s\S]*?Number\.isFinite\(expiresAtMs\)[\s\S]*?expiresAtMs <= nowMs/
  );
  assert.match(resetSource, /if \(!user \|\| !profile\) return \{ status: "invalid" as const \}/);
  assert.doesNotMatch(resetSource, /catch\s*\{\s*return undefined/);
});
