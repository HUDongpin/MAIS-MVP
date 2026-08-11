import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const userStorePath = join(process.cwd(), "lib/server/userStore.ts");
const resolverPath = join(process.cwd(), "app/api/ai-tutor/resolve/route.ts");
const authPath = join(process.cwd(), "lib/server/auth.ts");

test("Nova Postgres admission uses a narrow policy read and atomic per-user rate ledger", async () => {
  const source = await readFile(userStorePath, "utf8");

  assert.match(source, /const hotAuthSchemaVersion = 2;/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS ai_governance_rate_limit_events/);
  assert.match(
    source,
    /CREATE INDEX IF NOT EXISTS ai_governance_rate_limit_events_user_capability_idx/
  );
  assert.match(source, /AS event_items\(event_record\)/);
  assert.match(source, /async function resolveStudentAiTutorPolicyFromPostgresHotPath/);
  assert.match(source, /payload->'class_enrollments'/);
  assert.match(source, /payload->'teacher_classes'/);
  assert.match(source, /payload->'class_ai_tutor_policies'/);
  assert.match(source, /AS policy_items\(policy_record\)/);
  assert.match(source, /async function consumeAiCapabilityRateLimitFromPostgresHotPath/);
  assert.match(source, /pg_advisory_xact_lock\(hashtextextended/);
  assert.match(source, /set_config\('lock_timeout'/);
  assert.match(source, /set_config\('statement_timeout'/);
  assert.match(source, /throwIfAiTutorAdmissionAborted/);
  assert.match(
    source,
    /resolveStudentAiTutorPolicyBeforeSnapshot:\s*resolveStudentAiTutorPolicyFromPostgresHotPath/
  );
  assert.match(
    source,
    /consumeAiCapabilityRateLimitBeforeSnapshot:\s*consumeAiCapabilityRateLimitFromPostgresHotPath/
  );
  assert.match(
    source,
    /readAiTutorRateLimitEventsAfterSnapshot:\s*readAiTutorRateLimitEventsFromPostgresHotPath/
  );
});

test("Nova Postgres rate admission does not route through the global app_state mutation", async () => {
  const source = await readFile(userStorePath, "utf8");
  const start = source.indexOf("async function consumeAiCapabilityRateLimitFromPostgresHotPath");
  const endMarker = "\n}\n\nasync function readAiTutorRateLimitEventsFromPostgresHotPath";
  const end = source.indexOf(endMarker, start + 1);

  assert.ok(start >= 0, "expected the dedicated Nova Postgres rate-limit function");
  assert.ok(end > start, "expected a bounded dedicated function body");
  const functionSource = source.slice(start, end + 2);

  assert.doesNotMatch(functionSource, /mutateDatabase\(/);
  assert.doesNotMatch(functionSource, /FOR UPDATE/);
  assert.match(functionSource, /INSERT INTO ai_governance_rate_limit_events/);
  assert.match(functionSource, /capability !== "ai-tutor-chat"/);
  assert.ok(
    functionSource.indexOf("pg_advisory_xact_lock") < functionSource.indexOf("clock_timestamp()"),
    "the authoritative decision time must be read after the per-key lock"
  );
});

test("Nova Postgres policy read is authoritative and transaction-bounded", async () => {
  const source = await readFile(userStorePath, "utf8");
  const start = source.indexOf("async function resolveStudentAiTutorPolicyFromPostgresHotPath");
  const end = source.indexOf("\nasync function consumeAiCapabilityRateLimitFromPostgresHotPath", start + 1);

  assert.ok(start >= 0 && end > start);
  const functionSource = source.slice(start, end);

  assert.match(functionSource, /FROM app_state/);
  assert.match(functionSource, /set_config\('statement_timeout'/);
  assert.match(functionSource, /AS user_items\(user_record\)/);
  assert.match(functionSource, /AS enrollment_items\(enrollment_record\)/);
  assert.match(functionSource, /AS teacher_class_items\(teacher_class_record\)/);
  assert.match(functionSource, /AS policy_items\(policy_record\)/);
  assert.doesNotMatch(functionSource, /FROM projection_/);
});

test("Nova Postgres token quota uses a bounded abortable aggregate before snapshot fallback", async () => {
  const source = await readFile(userStorePath, "utf8");
  const start = source.indexOf("async function getAITutorTokenUsageSinceFromPostgresHotPath");
  const end = source.indexOf("\nasync function readAiTutorRateLimitEventsFromPostgresHotPath", start + 1);

  assert.ok(start >= 0, "expected a dedicated Nova Postgres token-usage function");
  assert.ok(end > start, "expected a bounded dedicated token-usage function body");
  const functionSource = source.slice(start, end);

  assert.match(source, /aiTutorQuotaLookupTimeoutMs - 250/);
  assert.match(functionSource, /payload->'ai_tutor_usage'/);
  assert.match(functionSource, /jsonb_array_elements/);
  assert.match(functionSource, /usage_record->'total_tokens'/);
  assert.match(functionSource, /usage_record->'prompt_tokens'/);
  assert.match(functionSource, /usage_record->'completion_tokens'/);
  assert.match(functionSource, /set_config\('statement_timeout'/);
  assert.match(functionSource, /query\.cancel\(\)/);
  assert.match(functionSource, /signal\?\.addEventListener\("abort"/);
  assert.match(functionSource, /signal\?\.removeEventListener\("abort"/);
  assert.doesNotMatch(functionSource, /readDatabase\(/);
  assert.doesNotMatch(functionSource, /selectPostgresStateRows\(/);
  assert.doesNotMatch(functionSource, /normalizeDatabase\(/);
  assert.doesNotMatch(functionSource, /FOR UPDATE/);
  assert.doesNotMatch(functionSource, /mutateDatabase\(/);
  assert.match(
    source,
    /getAITutorTokenUsageSinceBeforeSnapshot:\s*getAITutorTokenUsageSinceFromPostgresHotPath/
  );
});

test("Nova quota soft timeout aborts the pending Postgres lookup", async () => {
  const source = await readFile(resolverPath, "utf8");

  assert.match(source, /async function withSoftTimeout<T>\([\s\S]*?new AbortController\(\)/);
  assert.match(source, /timeoutController\.abort\(new DOMException\("Operation timed out\.", "TimeoutError"\)\)/);
  assert.match(
    source,
    /\(signal\) => getAITutorTokenUsageSince\(authenticatedUserId, quotaSince, signal\)/
  );
});

test("Nova authentication uses one authoritative cancellable Postgres join without snapshot fallback", async () => {
  const source = await readFile(userStorePath, "utf8");
  const clientStart = source.indexOf("function getAiTutorAuthAdmissionPostgresClient");
  const clientEnd = source.indexOf("\nfunction defaultStudentAiTutorPolicy", clientStart + 1);
  const start = source.indexOf("async function getAuthenticatedUserByIdForAiTutorAdmissionFromPostgresHotPath");
  const end = source.indexOf("\nexport const getAuthenticatedUserByIdForAiTutorAdmission", start + 1);

  assert.ok(clientStart >= 0 && clientEnd > clientStart, "expected a bounded dedicated client factory");
  const clientSource = source.slice(clientStart, clientEnd);
  assert.ok(start >= 0, "expected a dedicated Nova Postgres authentication function");
  assert.ok(end > start, "expected a bounded dedicated authentication function body");
  const functionSource = source.slice(start, end);

  assert.match(clientSource, /max:\s*1/);
  assert.match(clientSource, /connect_timeout:\s*2/);
  assert.match(clientSource, /application_name:\s*"mais-ai-tutor-auth-admission"/);
  assert.doesNotMatch(
    clientSource,
    /connection:\s*\{[\s\S]*statement_timeout/,
    "Neon pooled connections must not receive statement_timeout as a startup parameter"
  );
  assert.match(functionSource, /aiTutorAuthAdmissionSlot\.run\(signal/);
  assert.match(functionSource, /getAiTutorAuthAdmissionPostgresClient\(\)\.begin\(async \(sql\)/);
  assert.doesNotMatch(
    functionSource,
    /\.reserve\(\)/,
    "postgres.js 3.4.9 reserved clients do not expose begin() at runtime"
  );
  assert.ok(
    functionSource.indexOf("throwIfAiTutorAdmissionAborted(signal)")
      < functionSource.indexOf("set_config("),
    "an abort during BEGIN must stop work before the transaction-local timeout statement"
  );
  assert.match(functionSource, /set_config\([\s\S]*'statement_timeout'/);
  assert.match(functionSource, /FROM auth_users AS auth_user/);
  assert.match(functionSource, /LEFT JOIN auth_student_profiles AS student_profile/);
  assert.match(functionSource, /LEFT JOIN auth_user_settings AS user_settings/);
  assert.match(functionSource, /FROM auth_schema_migrations/);
  assert.match(functionSource, /WHERE version = \$\{hotAuthSchemaVersion\}/);
  assert.match(functionSource, /FALSE AS schema_ready/);
  assert.match(functionSource, /runCancellableAuthAdmissionQuery/);
  assert.match(functionSource, /storageFreeExampleAuthenticatedUser/);
  assert.match(
    functionSource,
    /if \(!postgresHotAuthTablesEnabled\(\)\)\s*\{[\s\S]*throw new Error/,
    "Postgres configuration drift must fail closed instead of restoring the snapshot path"
  );
  assert.doesNotMatch(functionSource, /ensurePostgresStateTable/);
  assert.doesNotMatch(functionSource, /readDatabase\(/);
  assert.doesNotMatch(functionSource, /selectPostgresStateRows\(/);
  assert.doesNotMatch(functionSource, /normalizeDatabase\(/);
  assert.doesNotMatch(functionSource, /catch\s*\{[\s\S]*return null/);
});

test("Nova authentication verifies the session before the dedicated admission lookup", async () => {
  const source = await readFile(authPath, "utf8");
  const start = source.indexOf("export async function getAiTutorAuthenticatedUserFromToken");
  const end = source.indexOf("\nexport function canAccessTeacherArea", start + 1);

  assert.ok(start >= 0 && end > start, "expected a bounded Nova token-authentication function");
  const functionSource = source.slice(start, end);

  assert.ok(
    functionSource.indexOf("verifySessionToken(token)")
      < functionSource.indexOf("getAuthenticatedUserByIdForAiTutorAdmission"),
    "signed session verification must complete before the database lookup"
  );
  assert.match(functionSource, /if \(!payload\) return null/);
  assert.match(functionSource, /getAuthenticatedUserByIdForAiTutorAdmission\(payload\.sub, signal\)/);
});
