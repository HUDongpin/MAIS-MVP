import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const userStorePath = join(process.cwd(), "lib/server/userStore.ts");

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
