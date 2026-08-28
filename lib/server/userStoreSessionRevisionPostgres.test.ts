import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { authAdminStorageHotAuthUserRows } from "@/lib/server/userStore/authAdminStoragePersistence";
import { projectedUserRecord } from "@/lib/server/userStore/authSessionPersistence";

const userStorePath = path.join(process.cwd(), "lib/server/userStore.ts");
const authSessionPersistencePath = path.join(
  process.cwd(),
  "lib/server/userStore/authSessionPersistence.ts"
);
const integrationWorkerPath = path.join(
  process.cwd(),
  "scripts/nova-postgres-integration-worker.ts"
);

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
  assert.match(source, /ALTER TABLE public\.auth_users ADD COLUMN IF NOT EXISTS session_revision INTEGER NOT NULL DEFAULT 1/);
  assert.match(source, /ALTER TABLE public\.auth_users ADD COLUMN IF NOT EXISTS disabled_at TEXT/);
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

test("Postgres password change and disable revoke reset tokens in the app-state and hot-table transaction", async () => {
  const [source, authSessionPersistenceSource] = await Promise.all([
    readFile(userStorePath, "utf8"),
    readFile(authSessionPersistencePath, "utf8")
  ]);
  const authStoreStart = source.indexOf("const authSessionPersistenceStore = createAuthSessionPersistenceStore(");
  const authStoreEnd = source.indexOf("\nconst authProvisioningPersistenceStore", authStoreStart);
  const authStoreSource = source.slice(authStoreStart, authStoreEnd);
  const mutationStart = source.indexOf("async function mutateDatabase<T>(");
  const mutationEnd = source.indexOf("\ntype TeacherNoticeEmailOutboxMutation", mutationStart);
  const mutationSource = source.slice(mutationStart, mutationEnd);
  const writerStart = source.indexOf("async function writePostgresDatabaseWith(");
  const writerEnd = source.indexOf("\nasync function rewriteCurrentPostgresStorageSnapshotForIntegrationTest", writerStart);
  const writerSource = source.slice(writerStart, writerEnd);
  const hotSyncStart = source.indexOf("async function syncPostgresHotAuthTablesWith(");
  const hotSyncEnd = source.indexOf("\nfunction postgresProjectionRecord", hotSyncStart);
  const hotSyncSource = source.slice(hotSyncStart, hotSyncEnd);
  const disableStart = authSessionPersistenceSource.indexOf("    async setUserDisabledState(");
  const disableEnd = authSessionPersistenceSource.indexOf("\n    async updateUserSettings(", disableStart);
  const disableSource = authSessionPersistenceSource.slice(disableStart, disableEnd);
  const passwordChangeStart = authSessionPersistenceSource.indexOf("    async changeAuthenticatedUserPassword(");
  const passwordChangeEnd = authSessionPersistenceSource.indexOf("\n    async createPasswordResetRequest(", passwordChangeStart);
  const passwordChangeSource = authSessionPersistenceSource.slice(passwordChangeStart, passwordChangeEnd);

  assert.ok([
    authStoreStart,
    authStoreEnd,
    mutationStart,
    mutationEnd,
    writerStart,
    writerEnd,
    hotSyncStart,
    hotSyncEnd,
    disableStart,
    disableEnd,
    passwordChangeStart,
    passwordChangeEnd
  ].every((index) => index >= 0));
  assert.match(disableSource, /return runMutation\(\(database\) => \{[\s\S]*?if \(disabled\) \{[\s\S]*?revokeUnusedPasswordResetTokensForUser\(database, userId, updatedAt\)/u);
  assert.match(passwordChangeSource, /return runMutation\(\(database\) => \{[\s\S]*?revokeUnusedPasswordResetTokensForUser\(database, userId, nowDate\.toISOString\(\)\)/u);
  assert.match(authStoreSource, /mutateDatabase: async <T>[\s\S]*?await mutateDatabase\(\(database\) => mutator\(database as AuthSessionPersistenceDatabase\)\)/u);
  assert.match(
    mutationSource,
    /if \(storageProvider === "postgres"\)[\s\S]*?return getPostgresClient\(\)\.begin\(async \(sql\) => \{[\s\S]*?const result = await mutator\(database\)[\s\S]*?await writePostgresDatabaseWith\(sql, database, storageCapability\)[\s\S]*?return result/u
  );
  assert.match(
    writerSource,
    /const payload = postgresDatabasePayload\(database\)[\s\S]*?UPDATE public\.app_state AS state[\s\S]*?payload = \$\{sql\.json\(payload\)\}[\s\S]*?await syncPostgresHotAuthTablesWith\(sql, database\)/u
  );
  assert.match(
    hotSyncSource,
    /const hotRows = hotAuthRowsFromDatabase\(database\)[\s\S]*?const tokens = hotAuthPasswordResetTokenRows\(hotRows\.passwordResetTokens\)[\s\S]*?INSERT INTO auth_password_reset_tokens[\s\S]*?used_at = excluded\.used_at/u
  );
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
    /acquirePostgresStorageMutationCapability\([\s\S]*?INSERT INTO public\.auth_password_reset_tokens[\s\S]*?UPDATE public\.app_state[\s\S]*?password_reset_tokens[\s\S]*?AND state\.revision = \$\{storageCapability\.previousRevision\}[\s\S]*?RETURNING state\.revision[\s\S]*?advancePostgresStorageReadinessAfterMutation\(/
  );
  assert.match(
    createResetSource,
    /jsonb_build_object\([\s\S]*?'id', \$\{tokenRecord\.id\}::text[\s\S]*?'user_id', \$\{tokenRecord\.user_id\}::text[\s\S]*?'token_hash', \$\{tokenRecord\.token_hash\}::text[\s\S]*?'expires_at', \$\{tokenRecord\.expires_at\}::text[\s\S]*?'created_at', \$\{tokenRecord\.created_at\}::text/
  );
  assert.match(
    source,
    /async function resetUserPasswordInPostgresHotTables\([\s\S]*?FROM public\.auth_password_reset_tokens[\s\S]*?FOR UPDATE[\s\S]*?UPDATE public\.auth_users[\s\S]*?session_revision = session_revision \+ 1[\s\S]*?disabled_at IS NULL[\s\S]*?RETURNING session_revision/
  );
  assert.match(
    resetSource,
    /acquirePostgresStorageMutationCapability\([\s\S]*?UPDATE public\.app_state[\s\S]*?session_revision[\s\S]*?revision = revision \+ 1[\s\S]*?AND state\.revision = \$\{storageCapability\.previousRevision\}[\s\S]*?RETURNING state\.revision[\s\S]*?advancePostgresStorageReadinessAfterMutation\(/
  );
  assert.doesNotMatch(createResetSource, /SELECT\s+(?:state\.)?payload\b|attestCurrentPostgresStorageSnapshot/iu);
  assert.doesNotMatch(resetSource, /SELECT\s+(?:state\.)?payload\b|attestCurrentPostgresStorageSnapshot/iu);
  assert.match(
    resetSource,
    /UPDATE public\.app_state[\s\S]*?password_reset_tokens[\s\S]*?used_at[\s\S]*?\$\{usedAt\}/
  );
  assert.match(
    resetSource,
    /jsonb_build_object\([\s\S]*?'password_hash', \$\{hashedPassword\.hash\}::text[\s\S]*?'password_salt', \$\{hashedPassword\.salt\}::text[\s\S]*?'session_revision', \$\{sessionRevision as number\}::integer/
  );
  assert.match(resetSource, /jsonb_build_object\('used_at', \$\{usedAt\}::text\)/);
  assert.match(resetSource, /if \(!resetToken\) return \{ status: "invalid" as const \}/);
  assert.match(
    resetSource,
    /const expiresAtMs = Date\.parse\(resetToken\.expires_at\)[\s\S]*?Number\.isFinite\(expiresAtMs\)[\s\S]*?expiresAtMs <= nowMs/
  );
  assert.match(resetSource, /if \(!user \|\| !profile\) return \{ status: "invalid" as const \}/);
  assert.doesNotMatch(resetSource, /catch\s*\{\s*return undefined/);
});

test("Postgres password-reset hot paths fail closed, return exact rows, and keep token cleanup symmetric", async () => {
  const source = await readFile(userStorePath, "utf8");
  const createResetStart = source.indexOf("async function createPasswordResetRequestInPostgresHotTables");
  const createResetEnd = source.indexOf("\nexport const createPasswordResetRequest", createResetStart);
  const createResetSource = source.slice(createResetStart, createResetEnd);
  const resetStart = source.indexOf("async function resetUserPasswordInPostgresHotTables");
  const resetEnd = source.indexOf("\nexport const resetUserPassword", resetStart);
  const resetSource = source.slice(resetStart, resetEnd);
  const lockedReadStart = source.indexOf("async function normalizeLockedPostgresState(");
  const lockedReadEnd = source.indexOf("async function readPostgresDatabaseFrom(", lockedReadStart);
  const lockedReadSource = source.slice(lockedReadStart, lockedReadEnd);

  assert.match(createResetSource, /catch\s*\{\s*return null;\s*\}/u);
  assert.doesNotMatch(createResetSource, /catch\s*\{\s*return undefined;\s*\}/u);
  assert.match(createResetSource, /DELETE FROM public\.auth_password_reset_tokens[\s\S]*used_at IS NOT NULL[\s\S]*expires_at/u);
  assert.match(createResetSource, /pg_catalog\.jsonb_array_elements[\s\S]*password_reset_tokens[\s\S]*token_record->>'used_at'[\s\S]*token_record->>'expires_at'/u);

  assert.match(resetSource, /updatedUserRows\.length !== 1/u);
  assert.match(
    resetSource,
    /UPDATE public\.auth_password_reset_tokens[\s\S]*?SET used_at = \$\{usedAt\}[\s\S]*?WHERE user_id = \$\{resetToken\.user_id\}[\s\S]*?AND used_at IS NULL[\s\S]*?RETURNING id/u
  );
  assert.match(resetSource, /updatedTokenRows\.some\(\(row\) => row\.id === resetToken\.id\)/u);
  assert.match(
    resetSource,
    /WHEN token_record->>'user_id' = \$\{resetToken\.user_id\}[\s\S]*?COALESCE\(token_record->>'used_at', ''\) = ''[\s\S]*?jsonb_build_object\('used_at', \$\{usedAt\}::text\)/u
  );
  assert.match(resetSource, /__userStorePostgresStorageReadinessTestHooks\.failPasswordResetBeforeStateWrite/u);

  const overlayIndex = lockedReadSource.indexOf("overlayPostgresHotAuthRowsIfEnabled");
  const hotSyncIndex = lockedReadSource.indexOf("syncPostgresHotAuthTablesWith");
  assert.ok(overlayIndex >= 0 && hotSyncIndex > overlayIndex, "full rewrite must consume hot rows before shadow sync");
});

test("the password-reset rollback worker uses the in-transaction failpoint and exact evidence", async () => {
  const source = await readFile(integrationWorkerPath, "utf8");
  const start = source.indexOf('if (command === "session-reset-rollback")');
  const end = source.indexOf('\n    if (command === "write-message")', start);
  const rollbackSource = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(
    rollbackSource,
    /failPasswordResetBeforeStateWrite\s*=\s*\(\)\s*=>\s*\{\s*throw new Error/u
  );
  assert.match(rollbackSource, /failPasswordResetBeforeStateWrite\s*=\s*null/u);
  assert.match(
    rollbackSource,
    /tenant_id[\s\S]*state_kind[\s\S]*schema_version[\s\S]*revision[\s\S]*updated_at[\s\S]*payload/u
  );
  assert.match(rollbackSource, /app_state_readiness_markers/u);
  assert.match(rollbackSource, /auth_users/u);
  assert.match(rollbackSource, /auth_password_reset_tokens/u);
  assert.match(rollbackSource, /integration-reset-cleanup-used/u);
  assert.match(rollbackSource, /integration-reset-cleanup-expired/u);
  assert.match(rollbackSource, /integration-reset-cleanup-malformed/u);
  assert.match(
    rollbackSource,
    /await sql\.begin\(async \(fixtureSql\) => \{[\s\S]*?UPDATE public\.app_state[\s\S]*?INSERT INTO public\.auth_password_reset_tokens/u
  );
  assert.match(rollbackSource, /cleanupSymmetric/u);
  assert.match(rollbackSource, /fullRewriteDidNotResurrect/u);
  assert.doesNotMatch(rollbackSource, /SET payload = pg_catalog\.jsonb_set|SET payload = jsonb_set/u);
});
