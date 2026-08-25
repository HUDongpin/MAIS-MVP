import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const userStorePath = join(process.cwd(), "lib/server/userStore.ts");
const resolverPath = join(process.cwd(), "app/api/ai-tutor/resolve/route.ts");
const authPath = join(process.cwd(), "lib/server/auth.ts");

test("Nova Postgres admission uses a narrow policy read and atomic per-user rate ledger", async () => {
  const source = await readFile(userStorePath, "utf8");

  assert.match(source, /const hotAuthSchemaVersion = 3;/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS ai_governance_rate_limit_events/);
  assert.match(
    source,
    /CREATE INDEX IF NOT EXISTS ai_governance_rate_limit_events_user_capability_idx/
  );
  assert.match(source, /AS event_items\(event_record\)/);
  assert.match(source, /async function resolveStudentAiTutorPolicyFromPostgresHotPath/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS projection_class_ai_tutor_policies/);
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
  const endMarker = "\n}\n\nasync function getAITutorTokenUsageSinceFromPostgresHotPath";
  const end = source.indexOf(endMarker, start + 1);

  assert.ok(start >= 0, "expected the dedicated Nova Postgres rate-limit function");
  assert.ok(end > start, "expected a bounded dedicated function body");
  const functionSource = source.slice(start, end + 2);

  assert.doesNotMatch(functionSource, /mutateDatabase\(/);
  assert.doesNotMatch(functionSource, /FOR UPDATE/);
  assert.doesNotMatch(functionSource, /ensurePostgresStateTable/);
  assert.doesNotMatch(functionSource, /getPostgresClient/);
  assert.match(functionSource, /aiTutorRateAdmissionSlot\.run\(admissionSignal/);
  assert.match(functionSource, /const client = getAiTutorRateAdmissionPostgresClient\(\)/);
  assert.match(functionSource, /runAbortBoundedAiTutorPostgresOperation\(\{/);
  assert.match(
    functionSource,
    /abortOperation: \(\) => destroyAiTutorAdmissionPostgresClient\("rate", client\)/
  );
  assert.match(functionSource, /operation: \(\) => client\.begin\(async \(sql\) =>/);
  assert.ok(
    (functionSource.match(/runCancellableAiTutorAdmissionQuery/g) ?? []).length >= 7,
    "every rate-limit SQL statement must be abortable"
  );
  assert.match(functionSource, /INSERT INTO ai_governance_rate_limit_events/);
  assert.match(functionSource, /capability !== "ai-tutor-chat"/);
  assert.ok(
    functionSource.indexOf("pg_advisory_xact_lock") < functionSource.indexOf("clock_timestamp()"),
    "the authoritative decision time must be read after the per-key lock"
  );
});

test("Nova Postgres policy admission uses one dedicated abort-bounded projection join", async () => {
  const source = await readFile(userStorePath, "utf8");
  const clientStart = source.indexOf("function createAiTutorAdmissionPostgresClient");
  const clientEnd = source.indexOf("\nasync function resolveStudentAiTutorPolicyFromPostgresHotPath", clientStart + 1);
  const start = source.indexOf("async function resolveStudentAiTutorPolicyFromPostgresHotPath");
  const end = source.indexOf("\nasync function consumeAiCapabilityRateLimitFromPostgresHotPath", start + 1);

  assert.ok(clientStart >= 0 && clientEnd > clientStart, "expected a dedicated policy client factory");
  assert.ok(start >= 0 && end > start, "expected a bounded dedicated policy function");
  const clientSource = source.slice(clientStart, clientEnd);
  const functionSource = source.slice(start, end);

  assert.match(clientSource, /max:\s*1/);
  assert.match(clientSource, /connect_timeout:\s*connectTimeout/);
  assert.match(clientSource, /fetch_types:\s*false/);
  assert.match(clientSource, /application_name:\s*applicationName/);
  assert.match(clientSource, /mais-ai-tutor-policy-admission/);
  assert.match(clientSource, /mais-ai-tutor-policy-admission[\s\S]*connectTimeout:\s*2/);
  assert.match(clientSource, /mais-ai-tutor-rate-admission[\s\S]*connectTimeout:\s*2/);
  assert.match(source, /primeAiTutorGovernanceAdmissionPostgresClients\(\)/);
  assert.doesNotMatch(source, /client\.reserve\(\)/);
  assert.match(source, /operation: \(\) => client\.begin\(async \(sql\) =>/);
  assert.match(
    source,
    /abortOperation: \(\) => destroyAiTutorAdmissionPostgresClient\(kind, client\)/
  );
  assert.match(source, /SELECT set_config\([\s\S]*'statement_timeout'/);
  assert.match(source, /await sql`SELECT 1 AS ready`/);
  assert.match(
    source,
    /await Promise\.allSettled\(\[[\s\S]*getClient: getAiTutorPolicyAdmissionPostgresClient[\s\S]*slot: aiTutorPolicyAdmissionSlot[\s\S]*getClient: getAiTutorRateAdmissionPostgresClient[\s\S]*slot: aiTutorRateAdmissionSlot/,
    "an active primer attempt must own both connection legs through settlement"
  );
  assert.match(source, /await slot\.run\(operationSignal/);
  assert.doesNotMatch(source, /policySql`SELECT 1`/);
  assert.doesNotMatch(source, /rateSql`SELECT 1`/);
  assert.match(
    clientSource,
    /connection:\s*\{\s*application_name:\s*applicationName\s*\}/,
    "Neon pooled connections must receive only the supported application_name startup parameter"
  );
  assert.match(functionSource, /aiTutorPolicyAdmissionSlot\.run\(admissionSignal/);
  assert.match(functionSource, /const client = getAiTutorPolicyAdmissionPostgresClient\(\)/);
  assert.match(functionSource, /runAbortBoundedAiTutorPostgresOperation\(\{/);
  assert.match(
    functionSource,
    /abortOperation: \(\) => destroyAiTutorAdmissionPostgresClient\("policy", client\)/
  );
  assert.match(functionSource, /operation: \(\) => client\.begin\(async \(sql\) =>/);
  assert.match(functionSource, /set_config\('lock_timeout'/);
  assert.match(functionSource, /set_config\('statement_timeout'/);
  assert.match(functionSource, /FROM auth_users/);
  assert.match(functionSource, /projection_teacher_classes/);
  assert.match(functionSource, /projection_class_enrollments/);
  assert.match(functionSource, /projection_class_ai_tutor_policies/);
  assert.match(functionSource, /FROM auth_schema_migrations/);
  assert.match(functionSource, /runAiTutorPolicyAdmissionQuery/);
  assert.doesNotMatch(functionSource, /ensurePostgresStateTable/);
  assert.doesNotMatch(functionSource, /getPostgresClient/);
  assert.doesNotMatch(functionSource, /FROM app_state/);
  assert.doesNotMatch(functionSource, /jsonb_array_elements/);
});

test("Nova Postgres token quota uses a bounded abortable aggregate before snapshot fallback", async () => {
  const source = await readFile(userStorePath, "utf8");
  const start = source.indexOf("async function getAITutorTokenUsageSinceFromPostgresHotPath");
  const end = source.indexOf("\nasync function readAiTutorRateLimitEventsFromPostgresHotPath", start + 1);

  assert.ok(start >= 0, "expected a dedicated Nova Postgres token-usage function");
  assert.ok(end > start, "expected a bounded dedicated token-usage function body");
  const functionSource = source.slice(start, end);

  assert.match(source, /aiTutorQuotaLookupTimeoutMs - 250/);
  assert.match(functionSource, /FROM ai_tutor_usage_journal/);
  assert.match(functionSource, /SUM\(accounted_tokens\)/);
  assert.doesNotMatch(functionSource, /payload->'ai_tutor_usage'/);
  assert.doesNotMatch(functionSource, /jsonb_array_elements/);
  assert.match(functionSource, /set_config\('statement_timeout'/);
  assert.ok((functionSource.match(/runCancellableAiTutorAdmissionQuery/g) ?? []).length >= 2);
  assert.doesNotMatch(functionSource, /readDatabase\(/);
  assert.match(functionSource, /ensurePostgresStateTable/);
  assert.match(functionSource, /getPostgresClient\(\)\.begin/);
  assert.doesNotMatch(functionSource, /aiTutorPolicyAdmissionSlot/);
  assert.doesNotMatch(functionSource, /selectPostgresStateRows\(/);
  assert.doesNotMatch(functionSource, /normalizeDatabase\(/);
  assert.doesNotMatch(functionSource, /FOR UPDATE/);
  assert.doesNotMatch(functionSource, /mutateDatabase\(/);
  assert.match(
    source,
    /getAITutorTokenUsageSinceBeforeSnapshot:\s*getAITutorTokenUsageSinceFromPostgresHotPath/
  );
});

test("Nova journal writers dual-write the legacy snapshot without full snapshot hydration", async () => {
  const source = await readFile(userStorePath, "utf8");
  const messageStart = source.indexOf("async function recordAITutorMessageFromPostgresJournal");
  const usageStart = source.indexOf("async function recordAITutorUsageFromPostgresJournal");
  const writerEnd = source.indexOf("\nconst aiTutorAdmissionStatementTimeoutMs", usageStart + 1);
  const markerIndex = source.indexOf("INSERT INTO auth_schema_migrations (version, applied_at)");

  assert.ok(messageStart >= 0 && usageStart > messageStart && writerEnd > usageStart);
  const messageSource = source.slice(messageStart, usageStart);
  const usageSource = source.slice(usageStart, writerEnd);
  assert.match(messageSource, /INSERT INTO ai_tutor_message_journal/);
  assert.match(usageSource, /INSERT INTO ai_tutor_usage_journal/);
  for (const writerSource of [messageSource, usageSource]) {
    assert.match(writerSource, /aiTutorPersistenceLane\.run\(\(\) => getPostgresClient\(\)\.begin/);
    assert.match(writerSource, /ON CONFLICT \(id\) DO NOTHING/);
    assert.match(writerSource, /UPDATE app_state/);
    assert.match(writerSource, /jsonb_set/);
    assert.match(writerSource, /jsonb_array_elements/);
    assert.doesNotMatch(writerSource, /mutateDatabase/);
    assert.doesNotMatch(writerSource, /readPostgresDatabaseFrom/);
    assert.doesNotMatch(writerSource, /normalizeDatabase/);
    assert.doesNotMatch(writerSource, /syncPostgresProjectionTablesWith/);
  }

  assert.match(source, /CREATE TABLE IF NOT EXISTS ai_tutor_message_journal/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS ai_tutor_usage_journal/);
  assert.match(source, /CREATE OR REPLACE TRIGGER app_state_ai_tutor_compatibility/);
  assert.match(source, /NEW\.payload := new_state_payload/);
  assert.match(source, /BEFORE INSERT OR UPDATE OF payload ON app_state/);
  assert.match(source, /INSERT INTO projection_ai_tutor_messages/);
  assert.match(source, /old_state_payload->'ai_tutor_messages'[\s\S]*IS DISTINCT FROM new_state_payload->'ai_tutor_messages'/);
  assert.match(source, /old_state_payload->'ai_tutor_usage'[\s\S]*IS DISTINCT FROM new_state_payload->'ai_tutor_usage'/);
  assert.match(source, /WITH ORDINALITY AS policy_items\(policy_record, ordinality\)/);
  assert.ok(source.indexOf("INSERT INTO ai_tutor_message_journal") < markerIndex);
  assert.ok(source.indexOf("INSERT INTO ai_tutor_usage_journal") < markerIndex);
  assert.ok(source.indexOf("CREATE OR REPLACE TRIGGER app_state_ai_tutor_compatibility") < markerIndex);
});

test("Nova v3 migration makes classroom projections authoritative before the marker", async () => {
  const source = await readFile(userStorePath, "utf8");
  const bootstrapStart = source.indexOf("async function bootstrapPostgresStateTables");
  const markerIndex = source.indexOf("INSERT INTO auth_schema_migrations (version, applied_at)", bootstrapStart);
  const bootstrapSource = source.slice(bootstrapStart, markerIndex);

  assert.match(bootstrapSource, /return sql\.begin\(async \(migrationSql\) =>/);
  assert.match(bootstrapSource, /pg_advisory_xact_lock\(hashtextextended\('mais-ai-tutor-schema-v3'/);
  assert.match(bootstrapSource, /FROM app_state[\s\S]*FOR UPDATE OF app_state/);
  assert.match(bootstrapSource, /failedClassroomChecks/);
  assert.match(bootstrapSource, /teacher_classes_array_valid/);
  assert.match(bootstrapSource, /enrollments_resolve/);
  assert.match(bootstrapSource, /policies_resolve/);
  assert.match(bootstrapSource, /classroom_projection_ready/);
  assert.match(bootstrapSource, /INSERT INTO projection_teacher_classes[\s\S]*FROM app_state/);
  assert.match(bootstrapSource, /INSERT INTO projection_class_enrollments[\s\S]*FROM app_state/);
  assert.match(bootstrapSource, /DELETE FROM projection_teacher_classes/);
  assert.match(bootstrapSource, /DELETE FROM projection_class_enrollments/);
  assert.match(bootstrapSource, /old_state_payload->'teacher_classes'[\s\S]*IS DISTINCT FROM new_state_payload->'teacher_classes'/);
  assert.match(bootstrapSource, /old_state_payload->'class_enrollments'[\s\S]*IS DISTINCT FROM new_state_payload->'class_enrollments'/);
  assert.ok(bootstrapSource.indexOf("INSERT INTO projection_teacher_classes") < bootstrapSource.indexOf("INSERT INTO projection_class_ai_tutor_policies"));
  assert.ok(bootstrapSource.indexOf("INSERT INTO projection_class_enrollments") < bootstrapSource.indexOf("INSERT INTO projection_class_ai_tutor_policies"));
});

test("slow rate admission cannot occupy the policy or authentication connection lane", async () => {
  const source = await readFile(userStorePath, "utf8");
  assert.match(source, /const postgresGeneralMaxConnections = Math\.min\(postgresMaxConnections, 2\)/);
  assert.match(source, /const aiTutorPostgresWarmConnectionBudget = postgresGeneralMaxConnections \+ 3/);
  assert.match(source, /max:\s*postgresGeneralMaxConnections/);
  assert.match(source, /function getAiTutorAuthAdmissionPostgresClient/);
  assert.match(source, /mais-ai-tutor-auth-admission/);
  assert.match(source, /function getAiTutorPolicyAdmissionPostgresClient/);
  assert.match(source, /mais-ai-tutor-policy-admission/);
  assert.match(source, /function getAiTutorRateAdmissionPostgresClient/);
  assert.match(source, /mais-ai-tutor-rate-admission/);
  assert.match(source, /aiTutorAuthAdmissionSlot\.run\(admissionSignal[\s\S]*destroyAiTutorAdmissionPostgresClient\("auth", client\)[\s\S]*client\.begin/);
  assert.match(source, /aiTutorPolicyAdmissionSlot\.run\(admissionSignal[\s\S]*destroyAiTutorAdmissionPostgresClient\("policy", client\)[\s\S]*client\.begin/);
  assert.match(source, /aiTutorRateAdmissionSlot\.run\(admissionSignal[\s\S]*destroyAiTutorAdmissionPostgresClient\("rate", client\)[\s\S]*client\.begin/);
  assert.doesNotMatch(source, /aiTutorGovernanceAdmissionSlot/);
  assert.ok(aiTutorPostgresWarmConnectionBudgetForSource(source) <= 5);
});

function aiTutorPostgresWarmConnectionBudgetForSource(source: string) {
  const match = source.match(/const aiTutorPostgresWarmConnectionBudget = postgresGeneralMaxConnections \+ (\d+)/);
  assert.ok(match);
  return 2 + Number(match[1]);
}

test("Nova quota soft timeout aborts the pending Postgres lookup", async () => {
  const source = await readFile(resolverPath, "utf8");

  assert.match(source, /async function withSoftTimeout<T>\([\s\S]*?new AbortController\(\)/);
  assert.match(source, /timeoutController\.abort\(new DOMException\("Operation timed out\.", "TimeoutError"\)\)/);
  assert.match(
    source,
    /\(signal\) => getAITutorTokenUsageSince\(authenticatedUserId, quotaSince, signal\)/
  );
});

test("Nova authentication uses one authoritative abort-bounded Postgres join without snapshot fallback", async () => {
  const source = await readFile(userStorePath, "utf8");
  const clientStart = source.indexOf("function createAiTutorAdmissionPostgresClient");
  const clientEnd = source.indexOf("\nasync function resolveStudentAiTutorPolicyFromPostgresHotPath", clientStart + 1);
  const start = source.indexOf("async function getAuthenticatedUserByIdForAiTutorAdmissionFromPostgresHotPath");
  const end = source.indexOf("\nexport const getAuthenticatedUserByIdForAiTutorAdmission", start + 1);

  assert.ok(clientStart >= 0 && clientEnd > clientStart, "expected a bounded dedicated client factory");
  const clientSource = source.slice(clientStart, clientEnd);
  assert.ok(start >= 0, "expected a dedicated Nova Postgres authentication function");
  assert.ok(end > start, "expected a bounded dedicated authentication function body");
  const functionSource = source.slice(start, end);

  assert.match(clientSource, /max:\s*1/);
  assert.match(clientSource, /connect_timeout:\s*connectTimeout/);
  assert.match(clientSource, /fetch_types:\s*false/);
  assert.match(clientSource, /application_name:\s*applicationName/);
  assert.match(clientSource, /mais-ai-tutor-auth-admission/);
  assert.match(clientSource, /connectTimeout:\s*2/);
  assert.match(
    clientSource,
    /connection:\s*\{\s*application_name:\s*applicationName\s*\}/,
    "Neon pooled connections must receive only the supported application_name startup parameter"
  );
  assert.match(functionSource, /const authenticated = await aiTutorAuthAdmissionSlot\.run\(admissionSignal/);
  assert.match(functionSource, /const client = getAiTutorAuthAdmissionPostgresClient\(\)/);
  assert.match(functionSource, /runAbortBoundedAiTutorPostgresOperation\(\{/);
  assert.match(
    functionSource,
    /abortOperation: \(\) => destroyAiTutorAdmissionPostgresClient\("auth", client\)/
  );
  assert.match(functionSource, /operation: \(\) => client\.begin\(async \(sql\) =>/);
  assert.ok(
    functionSource.indexOf("runCancellableAuthAdmissionQuery")
      < functionSource.indexOf("primeAiTutorGovernanceAdmissionPostgresClients()"),
    "policy and rate handshakes must start only after auth query and transaction cleanup"
  );
  assert.doesNotMatch(
    functionSource,
    /\.reserve\(\)/,
    "postgres.js 3.4.9 reserved clients do not expose begin() at runtime"
  );
  assert.ok(
    functionSource.indexOf("throwIfAiTutorAdmissionAborted(admissionSignal)")
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
