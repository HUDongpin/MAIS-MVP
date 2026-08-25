import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { __practiceAttemptStoreTestHooks } from "@/lib/server/practiceAttemptStore";

test("fast learning-event schema preserves exact payload and a monotonic generation", () => {
  const ddl = __practiceAttemptStoreTestHooks.postgresStudentActivitySchemaSql().join("\n");

  assert.match(ddl, /class_id TEXT/i);
  assert.match(ddl, /assignment_id TEXT/i);
  assert.match(ddl, /competency_id TEXT/i);
  assert.match(ddl, /lrs_delivery_status TEXT NOT NULL DEFAULT 'pending'/i);
  assert.match(ddl, /lrs_attempts INTEGER NOT NULL DEFAULT 0/i);
  assert.match(ddl, /lrs_statement_id TEXT/i);
  assert.match(ddl, /lrs_next_retry_at TIMESTAMPTZ/i);
  assert.match(ddl, /generation BIGINT NOT NULL DEFAULT 0/i);
  assert.match(ddl, /ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS class_id TEXT/i);
  assert.match(ddl, /ALTER TABLE learning_event_clears ADD COLUMN IF NOT EXISTS generation BIGINT NOT NULL DEFAULT 0/i);
  assert.match(ddl, /UPDATE learning_event_clears SET generation = 1 WHERE generation = 0/i);
});

test("fast event rows persist LRS delivery jobs and expose an owner-fenced update path", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/practiceAttemptStore.ts"), "utf8");
  const appendStart = source.indexOf("export async function appendLearningEventsFast");
  const clearStart = source.indexOf("export async function clearLearningEventsFast", appendStart);
  const deliveryStart = source.indexOf("export async function recordLearningEventLrsDeliveryFast", appendStart);
  const deliveryEnd = source.indexOf("export type FastLearningEventRow", deliveryStart);
  const appendSource = source.slice(appendStart, clearStart);
  const deliverySource = source.slice(deliveryStart, deliveryEnd);

  assert.notEqual(deliveryStart, -1);
  assert.notEqual(deliveryEnd, -1);
  assert.match(appendSource, /lrs_delivery_status/);
  assert.match(deliverySource, /getPostgresClient\(\)\.begin/);
  assert.match(deliverySource, /acquireLearningEventUserLock\(sql, userId\)/);
  assert.match(deliverySource, /WHERE id = \$\{delivery\.eventId\}[\s\S]*user_id = \$\{userId\}/);
  assert.match(deliverySource, /lrs_statement_id/);
  assert.match(deliverySource, /lrs_next_retry_at/);
  assert.match(deliverySource, /SELECT id, lrs_attempts, lrs_delivery_status/);
  assert.match(deliverySource, /learningEventLrsDeliveryTransitionAllowed/);
  assert.match(
    deliverySource,
    /Number\(current\.lrs_attempts\) \+ delivery\.attempts/,
    "the Postgres path must accumulate retry attempts instead of resetting them"
  );
  assert.match(deliverySource, /COALESCE\(\$\{delivery\.statementId \?\? null\}, lrs_statement_id\)/);
});

test("fast append and clear share a per-user transaction fence instead of client timestamps", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/practiceAttemptStore.ts"), "utf8");
  const receiptHelperStart = source.indexOf("function canonicalLearningEventClearedAt");
  const generationHelperStart = source.indexOf("async function currentLearningEventGeneration");
  const appendStart = source.indexOf("export async function appendLearningEventsFast");
  const clearStart = source.indexOf("export async function clearLearningEventsFast", appendStart);
  const appendSource = source.slice(generationHelperStart, clearStart);
  const receiptHelperSource = source.slice(receiptHelperStart, generationHelperStart);
  const clearEnd = source.indexOf("export type FastLearningEventRow", clearStart);
  const clearSource = source.slice(clearStart, clearEnd);

  assert.notEqual(receiptHelperStart, -1);
  assert.notEqual(generationHelperStart, -1);
  assert.notEqual(appendStart, -1);
  assert.notEqual(clearStart, -1);
  assert.notEqual(clearEnd, -1);
  assert.match(receiptHelperSource, /new Date\(value\)/);
  assert.match(receiptHelperSource, /Number\.isFinite\(parsed\.getTime\(\)\)/);
  assert.match(receiptHelperSource, /parsed\.toISOString\(\)/);
  assert.match(receiptHelperSource, /throw new TypeError\("Learning-event clearedAt must be a canonical ISO timestamp\."\)/);
  assert.match(appendSource, /getPostgresClient\(\)\.begin/);
  assert.match(appendSource, /acquireLearningEventUserLock\(sql, userId\)/);
  assert.match(appendSource, /generation !== currentGeneration/);
  assert.match(appendSource, /cleared_at/);
  assert.match(appendSource, /clearedAt: currentGenerationState\.clearedAt/);
  assert.match(appendSource, /learningEventRowMatches\(existing, userId, event\)/);
  assert.match(
    appendSource,
    /created_at::text AS created_at/,
    "exact replay comparisons must preserve the stored timestamp milliseconds"
  );
  assert.doesNotMatch(appendSource, /eventIsAfterClear|event\.timestamp\).*clearedAt/);
  assert.match(clearSource, /getPostgresClient\(\)\.begin/);
  assert.match(clearSource, /acquireLearningEventUserLock\(sql, userId\)/);
  assert.match(clearSource, /requireCanonicalLearningEventClearedAt\(clearedAt\)/);
  assert.match(clearSource, /generation = learning_event_clears\.generation \+ 1/);
  assert.match(clearSource, /RETURNING generation, cleared_at/);
  assert.match(clearSource, /clearedAt: requireCanonicalLearningEventClearedAt\(rows\[0\]\?\.cleared_at\)/);
});

test("server-generated practice learning rows join the same clear ordering lock", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/practiceAttemptStore.ts"), "utf8");
  const persistStart = source.indexOf("async function persistQuestionAttempt");
  const submitStart = source.indexOf("export async function submitQuestionAttemptFast", persistStart);
  const persistSource = source.slice(persistStart, submitStart);

  assert.notEqual(persistStart, -1);
  assert.notEqual(submitStart, -1);
  assert.match(persistSource, /getPostgresClient\(\)\.begin/);
  assert.match(persistSource, /acquireLearningEventUserLock\(sql, input\.userId\)/);
  assert.match(persistSource, /INSERT INTO learning_events/);
  assert.match(
    persistSource,
    /lrs_delivery_status[\s\S]*lrs_updated_at[\s\S]*"disabled"[\s\S]*input\.now/,
    "server-generated practice rows must not pretend to have a runnable pending LRS job"
  );
});

test("fast append exposes an exact-replay streak side effect and invalidates the dashboard projection cache", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/practiceAttemptStore.ts"), "utf8");
  const routeSource = await readFile(path.join(process.cwd(), "app/api/learning-events/route.ts"), "utf8");
  const userStoreSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const store = await import("@/lib/server/practiceAttemptStore");

  assert.equal(store.__practiceAttemptStoreTestHooks.hasThreeConsecutiveUtcLearningDays([
    "2026-08-07T23:59:59.000Z",
    "2026-08-08T00:00:00.000Z",
    "2026-08-09T12:00:00.000Z"
  ], "2026-08-09T23:59:59.000Z"), true);
  assert.equal(store.__practiceAttemptStoreTestHooks.hasThreeConsecutiveUtcLearningDays([
    "2026-08-06T23:59:59.000Z",
    "2026-08-08T00:00:00.000Z",
    "2026-08-09T12:00:00.000Z"
  ], "2026-08-09T23:59:59.000Z"), false);

  assert.match(source, /async function fastLearningStreakRewardAt/);
  assert.match(
    source,
    /appendLearningEventsFast[\s\S]*fastLearningStreakRewardAt\(sql/,
    "fast append must calculate the canonical side effect before returning"
  );
  assert.match(source, /learningStreakRewardAt/);
  assert.doesNotMatch(
    source.slice(
      source.indexOf("async function fastLearningStreakRewardAt"),
      source.indexOf("function attemptFeedback")
    ),
    /INSERT INTO reward_point_ledger/,
    "the fast detector must not create an orphan reward row outside the canonical reward store"
  );
  assert.match(
    userStoreSource,
    /export function invalidateStudentDashboardCacheForUser\(userId: string\)[\s\S]*clearStudentDashboardCacheForUser\(userId\)/
  );
  assert.match(routeSource, /invalidateStudentDashboardCacheForUser/);
  assert.match(routeSource, /ensureFastLearningStreakReward/);
  assert.ok(
    routeSource.indexOf("if (usesFastRows && insertedIds.size > 0)") <
      routeSource.indexOf("if (learningStreakRewardAt)"),
    "a committed fast event row must invalidate the dashboard before any later side effect can return 503"
  );
  assert.match(
    routeSource,
    /learningStreakRewardAt[\s\S]*await ensureFastLearningStreakReward/,
    "the route must heal the canonical reward store on exact replay before ACK"
  );
  assert.match(
    routeSource,
    /insertedIds\.size > 0[\s\S]*invalidateStudentDashboardCacheForUser\(authenticated\.user\.id\)/,
    "a committed fast-row append must invalidate any cached dashboard view"
  );
  const ensureStart = userStoreSource.indexOf("export async function ensureFastLearningStreakReward");
  const ensureEnd = userStoreSource.indexOf("function mergeStudentDashboardRecordsBy", ensureStart);
  const ensureSource = userStoreSource.slice(ensureStart, ensureEnd);
  assert.match(
    ensureSource,
    /await mutateDatabase[\s\S]*clearStudentDashboardCacheForUser\(userId\)/,
    "an exact replay that heals the canonical reward must invalidate the cached reward/dashboard projection"
  );
});

test("fast authoritative clear ACK is not lost when the legacy mirror fails", async () => {
  const source = await readFile(path.join(process.cwd(), "app/api/learning-events/route.ts"), "utf8");
  const userStoreSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const deleteStart = source.indexOf("export async function DELETE");
  const deleteSource = source.slice(deleteStart);

  assert.notEqual(deleteStart, -1);
  assert.match(
    deleteSource,
    /clearLearningEventsForUser\(\s*authenticated\.user\.id,\s*clearResult\.clearedAt,\s*clearResult\.generation\s*\)[\s\S]*?catch/
  );
  assert.match(deleteSource, /Legacy learning-event clear mirror failed/);
  assert.match(deleteSource, /generation: clearResult\.generation/);
  assert.match(deleteSource, /clearedAt: clearResult\.clearedAt/);
  assert.ok(
    (userStoreSource.match(/NOT EXISTS\s*\(\s*SELECT 1\s*FROM learning_event_clears/g) ?? []).length >= 5,
    "the authoritative fast clear receipt must mask stale learning and visualization snapshot rows in every dashboard/teacher projection"
  );
});

test("hot practice-accuracy rewards are overlaid into canonical reward readers and bypass stale projections", async () => {
  const attemptSource = await readFile(path.join(process.cwd(), "lib/server/practiceAttemptStore.ts"), "utf8");
  const userStoreSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(attemptSource, /INSERT INTO reward_point_ledger/);
  assert.match(userStoreSource, /overlayHotPracticeAccuracyRewards/);
  assert.match(userStoreSource, /FROM reward_point_ledger[\s\S]*reason = 'practice-accuracy'/);
  assert.match(
    userStoreSource,
    /readPostgresDatabaseFrom[\s\S]*overlayPostgresHotRowsIfEnabled/,
    "student and teacher reward APIs must read the durable hot reward overlay"
  );
  assert.ok(
    (userStoreSource.match(/hot_practice_accuracy_reward_count/g) ?? []).length >= 3,
    "student gamification plus both teacher projections must detect unreconciled hot rewards"
  );
  assert.ok(
    (userStoreSource.match(/NOT EXISTS\s*\([\s\S]*?source_key[\s\S]*?source_key/g) ?? []).length >= 3,
    "fast projections must resume once each hot reward source_key is present in canonical state"
  );
});
