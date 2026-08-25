import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";

import {
  assertTeacherNoticeResendWebhookTargetConfirmation,
  prepareTeacherNoticeResendWebhookMutationTarget
} from "../../scripts/teacher-notice-resend-webhook-target-guard.mjs";
import {
  attestTeacherNoticeResendWebhookPostgresSchema,
  maintainTeacherNoticeResendWebhookPostgres,
  migrateTeacherNoticeResendWebhookPostgresSchema,
  persistTeacherNoticeResendWebhookEventPostgres,
  readTeacherNoticeResendWebhookDeliverySafePostgres,
  teacherNoticeResendWebhookPostgresSchemaV2Statements
} from "./userStore/teacherNoticeResendWebhookPersistence";
import {
  attestTeacherNoticeEmailCronHeartbeatPostgresSchema,
  migrateTeacherNoticeEmailCronHeartbeatPostgresSchema,
  recordTeacherNoticeEmailCronHeartbeatFailedPostgres,
  recordTeacherNoticeEmailCronHeartbeatStartedPostgres,
  recordTeacherNoticeEmailCronHeartbeatSucceededPostgres,
  teacherNoticeEmailCronHeartbeatPostgresSchemaV1Statements
} from "./userStore/teacherNoticeEmailCronHeartbeatPersistence";
import { readTeacherNoticeOperationalSnapshotWithinPostgresTransaction } from
  "./userStore/teacherNoticeOperationalReadModel";
import { evaluateTeacherNoticeOperationalHealth } from
  "./teacherNoticeOperationalHealth";
import { teacherNoticeEmailOutboxPostgresV2DependencyFixtureStatements } from
  "./userStore/teacherNoticeEmailOutboxV2Dependency";
import type { TeacherNoticeResendWebhookEnvelope } from "./teacherNoticeResendWebhook";

const integrationUrl = process.env.MAIS_RESEND_WEBHOOK_POSTGRES_INTEGRATION_URL?.trim();
assert.ok(
  integrationUrl,
  "MAIS_RESEND_WEBHOOK_POSTGRES_INTEGRATION_URL is required; this real PostgreSQL gate must not skip."
);
const destructiveTarget = prepareTeacherNoticeResendWebhookMutationTarget({
  action: "destroy-test",
  provider: "postgres",
  postgresUrl: integrationUrl,
  sqlitePath: undefined,
  cwd: undefined,
  tmpDirectory: undefined
});
assertTeacherNoticeResendWebhookTargetConfirmation(
  destructiveTarget,
  process.env.MAIS_RESEND_WEBHOOK_POSTGRES_INTEGRATION_CONFIRM
);

const providerMessageId = "550e8400-e29b-41d4-a716-446655440000";

function event(overrides: Partial<TeacherNoticeResendWebhookEnvelope> = {}): TeacherNoticeResendWebhookEnvelope {
  return {
    eventId: "evt-pg-delivered",
    type: "email.delivered",
    occurredAt: "2026-08-23T01:02:03.004Z",
    occurredAtNs: "1787446923004000001",
    priority: 20,
    providerMessageId,
    ...overrides
  };
}

async function insertAcceptedOutbox(
  sql: postgres.Sql,
  id: string,
  acceptedProviderMessageId: string
) {
  await sql`
    INSERT INTO public.teacher_notice_email_outbox (
      id, notice_id, recipient_id, recipient_fingerprint, student_id, guardian_id,
      teacher_id, queued_by_id, queued_by_fingerprint, class_id, email, locale,
      durable_delivery_key, content_revision, status, attempt_count, first_enqueued_at,
      next_attempt_at, provider_message_id, completed_at, created_at, updated_at,
      pii_expires_at, tombstone_expires_at
    ) VALUES (
      ${id}, ${`notice-${id}`}, ${`recipient-${id}`}, ${`recipient-fingerprint-${id}`},
      ${`student-${id}`}, ${`guardian-${id}`}, ${`teacher-${id}`}, ${`teacher-${id}`},
      ${`queued-fingerprint-${id}`}, ${`class-${id}`}, ${`${id}@example.invalid`}, 'en',
      ${`delivery-${id}`}, 'revision-1', 'provider-accepted', 1,
      pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp(), ${acceptedProviderMessageId},
      pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp(),
      pg_catalog.clock_timestamp() + pg_catalog.make_interval(days => 30),
      pg_catalog.clock_timestamp() + pg_catalog.make_interval(days => 400)
    )
  `;
}

async function webhookCatalogDigest(sql: postgres.Sql) {
  return Array.from(await sql<Array<{ digest: unknown }>>`
    WITH target_relations AS (
      SELECT relation.oid, relation.relname, relation.relkind
      FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS relation_namespace
        ON relation_namespace.oid = relation.relnamespace
      WHERE relation_namespace.nspname = 'public'
        AND relation.relname IN (
          'teacher_notice_resend_message_state',
          'teacher_notice_resend_webhook_events',
          'teacher_notice_resend_webhook_schema_migrations'
        )
    )
    SELECT pg_catalog.jsonb_build_object(
      'relations', COALESCE((SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_array(relname, relkind::pg_catalog.text) ORDER BY relname
      ) FROM target_relations), '[]'::pg_catalog.jsonb),
      'columns', COALESCE((SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_array(relation.relname, attribute.attnum, attribute.attname,
          pg_catalog.format_type(attribute.atttypid, attribute.atttypmod),
          pg_catalog.pg_get_expr(attribute_default.adbin, attribute_default.adrelid, false))
        ORDER BY relation.relname, attribute.attnum
      ) FROM target_relations AS relation
      JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = relation.oid
      LEFT JOIN pg_catalog.pg_attrdef AS attribute_default
        ON attribute_default.adrelid = relation.oid AND attribute_default.adnum = attribute.attnum
      WHERE attribute.attnum > 0 AND NOT attribute.attisdropped), '[]'::pg_catalog.jsonb),
      'constraints', COALESCE((SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_array(relation.relname, constraint_record.conname,
          pg_catalog.pg_get_constraintdef(constraint_record.oid, false))
        ORDER BY relation.relname, constraint_record.conname
      ) FROM target_relations AS relation
      JOIN pg_catalog.pg_constraint AS constraint_record
        ON constraint_record.conrelid = relation.oid), '[]'::pg_catalog.jsonb),
      'indexes', COALESCE((SELECT pg_catalog.jsonb_agg(
        pg_catalog.pg_get_indexdef(index_record.indexrelid) ORDER BY index_record.indexrelid
      ) FROM target_relations AS relation
      JOIN pg_catalog.pg_index AS index_record ON index_record.indrelid = relation.oid),
        '[]'::pg_catalog.jsonb),
      'comments', COALESCE((SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_array(relation.relname,
          pg_catalog.obj_description(relation.oid, 'pg_class')) ORDER BY relation.relname
      ) FROM target_relations AS relation), '[]'::pg_catalog.jsonb)
    ) AS digest
  `);
}

test("PostgreSQL 16 migration, concurrent replay, ordering, and exact readiness are real", async () => {
  const sql = postgres(integrationUrl, { max: 6, prepare: false });
  try {
    await sql.unsafe(`
      DROP SCHEMA IF EXISTS hostile_resend_webhook CASCADE;
      DROP TABLE IF EXISTS public.teacher_notice_resend_message_state CASCADE;
      DROP TABLE IF EXISTS public.teacher_notice_resend_webhook_events CASCADE;
      DROP TABLE IF EXISTS public.teacher_notice_resend_webhook_schema_migrations CASCADE;
      DROP TABLE IF EXISTS public.teacher_notice_email_cron_heartbeat CASCADE;
      DROP TABLE IF EXISTS public.teacher_notice_email_cron_heartbeat_schema_migrations CASCADE;
      DROP TABLE IF EXISTS public.teacher_notice_email_outbox CASCADE;
      DROP TABLE IF EXISTS public.teacher_notice_email_outbox_schema_migrations CASCADE;
    `);
    for (const statement of teacherNoticeEmailOutboxPostgresV2DependencyFixtureStatements) {
      await sql.unsafe(statement);
    }
    await insertAcceptedOutbox(sql, "outbox-pg-1", providerMessageId);
    await sql.unsafe(`CREATE TABLE public.teacher_notice_resend_webhook_events (
      event_id pg_catalog.text PRIMARY KEY
    )`);
    const malformedBefore = await webhookCatalogDigest(sql);
    await assert.rejects(
      migrateTeacherNoticeResendWebhookPostgresSchema(sql),
      /partial or malformed/i
    );
    assert.deepEqual(await webhookCatalogDigest(sql), malformedBefore);
    await sql`DROP TABLE public.teacher_notice_resend_webhook_events`;

    for (const statement of teacherNoticeResendWebhookPostgresSchemaV2Statements) {
      await sql.unsafe(statement);
    }
    await sql`
      INSERT INTO public.teacher_notice_resend_webhook_events (
        event_id, provider_message_id, event_type, occurred_at, occurred_at_ns,
        priority, received_at, matched_outbox_id, retention_expires_at
      ) VALUES (
        'evt-pg-v2-preserved', ${providerMessageId}::pg_catalog.uuid, 'email.sent',
        pg_catalog.clock_timestamp(), 1, 0, pg_catalog.clock_timestamp(), NULL,
        pg_catalog.clock_timestamp() + pg_catalog.make_interval(days => 400)
      )
    `;
    await migrateTeacherNoticeResendWebhookPostgresSchema(sql);
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), true);
    const upgradeEvidence = await sql<Array<{
      event_count: number;
      index_ready: boolean;
      version: number;
    }>>`
      SELECT
        (SELECT pg_catalog.count(*)::pg_catalog.int4
          FROM public.teacher_notice_resend_webhook_events
          WHERE event_id = 'evt-pg-v2-preserved') AS event_count,
        pg_catalog.to_regclass(
          'public.teacher_notice_resend_webhook_events_unmatched_received_idx'
        ) IS NOT NULL AS index_ready,
        (SELECT version
          FROM public.teacher_notice_resend_webhook_schema_migrations
          WHERE singleton = TRUE) AS version
    `;
    assert.equal(upgradeEvidence[0]?.event_count, 1);
    assert.equal(upgradeEvidence[0]?.index_ready, true);
    assert.equal(upgradeEvidence[0]?.version, 3);

    await sql.unsafe(`
      DROP TABLE public.teacher_notice_resend_message_state CASCADE;
      DROP TABLE public.teacher_notice_resend_webhook_events CASCADE;
      DROP TABLE public.teacher_notice_resend_webhook_schema_migrations CASCADE;
    `);
    await migrateTeacherNoticeResendWebhookPostgresSchema(sql);
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), true);

    for (const statement of teacherNoticeEmailCronHeartbeatPostgresSchemaV1Statements) {
      await sql.unsafe(statement);
    }
    await sql`
      INSERT INTO public.teacher_notice_email_cron_heartbeat (
        singleton, run_id, release_sha, status, started_at, completed_at, updated_at
      ) VALUES (
        TRUE, '00000000-0000-4000-8000-000000000099', ${"9".repeat(40)}, 'failed',
        pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp(),
        pg_catalog.clock_timestamp()
      )
    `;
    await migrateTeacherNoticeEmailCronHeartbeatPostgresSchema(sql);
    assert.equal(await attestTeacherNoticeEmailCronHeartbeatPostgresSchema(sql), true);
    const heartbeatUpgrade = await sql<Array<{
      failure_preserved: boolean;
      version: number;
    }>>`
      SELECT
        (SELECT last_failed_at = completed_at
          FROM public.teacher_notice_email_cron_heartbeat
          WHERE singleton = TRUE) AS failure_preserved,
        (SELECT version
          FROM public.teacher_notice_email_cron_heartbeat_schema_migrations
          WHERE singleton = TRUE) AS version
    `;
    assert.deepEqual(
      Array.from(heartbeatUpgrade),
      [{ failure_preserved: true, version: 2 }]
    );
    await sql.unsafe(`
      DROP TABLE public.teacher_notice_email_cron_heartbeat CASCADE;
      DROP TABLE public.teacher_notice_email_cron_heartbeat_schema_migrations CASCADE;
    `);
    await migrateTeacherNoticeEmailCronHeartbeatPostgresSchema(sql);
    assert.equal(await attestTeacherNoticeEmailCronHeartbeatPostgresSchema(sql), true);
    assert.deepEqual(
      Array.from(await sql<Array<{ version: number }>>`
        SELECT version
        FROM public.teacher_notice_email_cron_heartbeat_schema_migrations
        WHERE singleton = TRUE
      `),
      [{ version: 2 }]
    );
    const failedIdentity = {
      releaseSha: "b".repeat(40),
      runId: "11111111-1111-4111-8111-111111111111"
    };
    await recordTeacherNoticeEmailCronHeartbeatStartedPostgres(sql, failedIdentity);
    await recordTeacherNoticeEmailCronHeartbeatFailedPostgres(sql, failedIdentity);
    const failedHeartbeat = await sql<Array<{
      completed: boolean;
      status: string;
    }>>`
      SELECT completed_at IS NOT NULL AS completed, status
      FROM public.teacher_notice_email_cron_heartbeat
      WHERE singleton = TRUE
    `;
    assert.equal(failedHeartbeat[0]?.status, "failed");
    assert.equal(failedHeartbeat[0]?.completed, true);

    const staleIdentity = {
      releaseSha: "c".repeat(40),
      runId: "22222222-2222-4222-8222-222222222222"
    };
    const successfulIdentity = {
      releaseSha: "a".repeat(40),
      runId: "33333333-3333-4333-8333-333333333333"
    };
    await recordTeacherNoticeEmailCronHeartbeatStartedPostgres(sql, staleIdentity);
    await recordTeacherNoticeEmailCronHeartbeatStartedPostgres(sql, successfulIdentity);
    await assert.rejects(
      recordTeacherNoticeEmailCronHeartbeatSucceededPostgres(sql, staleIdentity),
      /no longer current/i
    );
    const stillCurrent = await sql<Array<{ run_id: string; status: string }>>`
      SELECT run_id, status
      FROM public.teacher_notice_email_cron_heartbeat
      WHERE singleton = TRUE
    `;
    assert.equal(stillCurrent[0]?.run_id, successfulIdentity.runId);
    assert.equal(stillCurrent[0]?.status, "started");
    await recordTeacherNoticeEmailCronHeartbeatSucceededPostgres(
      sql,
      successfulIdentity
    );
    await assert.rejects(
      recordTeacherNoticeEmailCronHeartbeatFailedPostgres(sql, successfulIdentity),
      /no longer current/i
    );

    const results = await Promise.all(
      Array.from({ length: 12 }, () => persistTeacherNoticeResendWebhookEventPostgres(sql, event()))
    );
    assert.equal(results.filter((result) => result.status === "applied").length, 1);
    assert.equal(results.filter((result) => result.status === "replayed").length, 11);

    assert.deepEqual(await persistTeacherNoticeResendWebhookEventPostgres(sql, event({
      eventId: "evt-pg-sent-old",
      type: "email.sent",
      occurredAt: "2026-08-23T01:00:00.000Z",
      occurredAtNs: "1787446800000000000",
      priority: 0
    })), { status: "stale" });
    const state = await sql<Array<{ latest_event_type: string }>>`
      SELECT latest_event_type FROM public.teacher_notice_resend_message_state
      WHERE provider_message_id = ${providerMessageId}::pg_catalog.uuid
    `;
    assert.equal(state[0]?.latest_event_type, "email.delivered");
    assert.deepEqual(
      await readTeacherNoticeResendWebhookDeliverySafePostgres(sql, "outbox-pg-1"),
      { deliveryStatus: "delivered", lastEventAt: "2026-08-23T01:02:03.004Z" }
    );

    await assert.rejects(
      persistTeacherNoticeResendWebhookEventPostgres(sql, event({ type: "email.bounced", priority: 30 })),
      /conflicting replay/i
    );
    const count = await sql<Array<{ count: number }>>`
      SELECT pg_catalog.count(*)::pg_catalog.int4 AS count
      FROM public.teacher_notice_resend_webhook_events
    `;
    assert.equal(count[0]?.count, 2);

    const unmatchedProvider = "650e8400-e29b-41d4-a716-446655440000";
    assert.deepEqual(await persistTeacherNoticeResendWebhookEventPostgres(sql, event({
      eventId: "evt-pg-unmatched",
      providerMessageId: unmatchedProvider
    })), { status: "unmatched" });
    await insertAcceptedOutbox(sql, "outbox-pg-2", unmatchedProvider);
    const maintenance = await maintainTeacherNoticeResendWebhookPostgres(sql, {
      reconciliationLimit: 1,
      retentionLimit: 1
    });
    assert.equal(maintenance.reconciledProviders, 1);
    assert.equal(maintenance.eventsMatched, 1);
    assert.deepEqual(
      Array.from(await sql<Array<{ latest_event_id: string }>>`
        SELECT latest_event_id
        FROM public.teacher_notice_resend_message_state
        WHERE provider_message_id = ${unmatchedProvider}::pg_catalog.uuid
      `),
      [{ latest_event_id: "evt-pg-unmatched" }]
    );
    await sql`
      UPDATE public.teacher_notice_resend_webhook_events
      SET retention_expires_at = pg_catalog.clock_timestamp() - pg_catalog.make_interval(days => 1)
      WHERE event_id = 'evt-pg-unmatched'
    `;
    const retention = await maintainTeacherNoticeResendWebhookPostgres(sql, {
      reconciliationLimit: 1,
      retentionLimit: 1
    });
    assert.equal(retention.eventsDeleted, 1);
    assert.equal(retention.statesDeleted, 1);
    assert.equal(
      await readTeacherNoticeResendWebhookDeliverySafePostgres(sql, "outbox-pg-2"),
      null
    );

    const budgetProvider = "850e8400-e29b-41d4-a716-446655440000";
    await insertAcceptedOutbox(sql, "outbox-pg-budget", budgetProvider);
    await sql`
      INSERT INTO public.teacher_notice_resend_webhook_events (
        event_id, provider_message_id, event_type, occurred_at, occurred_at_ns,
        priority, received_at, matched_outbox_id, retention_expires_at
      )
      SELECT
        'evt-pg-budget-' || pg_catalog.lpad(sequence::pg_catalog.text, 3, '0'),
        ${budgetProvider}::pg_catalog.uuid,
        CASE WHEN sequence = 212 THEN 'email.delivered' ELSE 'email.sent' END,
        '2026-08-23T01:00:00.000Z'::pg_catalog.timestamptz,
        1787446800000000000::pg_catalog.numeric + sequence,
        CASE WHEN sequence = 212 THEN 20 ELSE 10 END,
        '2026-08-23T01:00:00.000Z'::pg_catalog.timestamptz,
        NULL,
        '2027-09-27T01:00:00.000Z'::pg_catalog.timestamptz
      FROM pg_catalog.generate_series(0, 212) AS sequence
    `;
    const budgetResults = [];
    for (let invocation = 0; invocation < 3; invocation += 1) {
      budgetResults.push(await maintainTeacherNoticeResendWebhookPostgres(sql, {
        reconciliationLimit: 100,
        retentionLimit: 1
      }));
    }
    assert.deepEqual(budgetResults.map((entry) => entry.eventsMatched), [100, 100, 13]);
    assert.deepEqual(budgetResults.map((entry) => entry.reconciledProviders), [1, 1, 1]);
    assert.deepEqual(
      budgetResults.map((entry) => entry.hasMoreReconciliation),
      [true, true, false]
    );
    assert.deepEqual(
      Array.from(await sql<Array<{
        matched_outbox_id: string;
        latest_event_id: string;
        latest_event_type: string;
      }>>`
        SELECT matched_outbox_id, latest_event_id, latest_event_type
        FROM public.teacher_notice_resend_message_state
        WHERE provider_message_id = ${budgetProvider}::pg_catalog.uuid
      `),
      [{
        matched_outbox_id: "outbox-pg-budget",
        latest_event_id: "evt-pg-budget-212",
        latest_event_type: "email.delivered"
      }]
    );

    const operationalSnapshot = await sql.begin((transaction) =>
      readTeacherNoticeOperationalSnapshotWithinPostgresTransaction({
        expectedReleaseSha: successfulIdentity.releaseSha,
        recentWindowSeconds: 3_600,
        sql: transaction
      })
    );
    assert.equal(operationalSnapshot.scheduler.candidateMatch, true);
    assert.equal(operationalSnapshot.scheduler.heartbeatStatus, "succeeded");
    assert.ok(
      operationalSnapshot.scheduler.heartbeatAgeSeconds !== null &&
      operationalSnapshot.scheduler.heartbeatAgeSeconds >= 0 &&
      operationalSnapshot.scheduler.heartbeatAgeSeconds < 60
    );
    assert.ok(
      operationalSnapshot.scheduler.lastFailureAgeSeconds !== null &&
      operationalSnapshot.scheduler.lastFailureAgeSeconds >= 0 &&
      operationalSnapshot.scheduler.lastFailureAgeSeconds < 60
    );
    const operationalHealth = evaluateTeacherNoticeOperationalHealth(
      operationalSnapshot
    );
    assert.equal(operationalHealth.status, "unhealthy");
    assert.ok(operationalHealth.reasons.includes("scheduler-heartbeat-failed"));
    assert.equal(operationalSnapshot.webhookReconciliation.unmatchedCount, 0);
    assert.ok(operationalSnapshot.outbox.counts.providerAccepted >= 2);

    await sql`ALTER TABLE public.teacher_notice_email_outbox SET UNLOGGED`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), false);
    await sql`ALTER TABLE public.teacher_notice_email_outbox SET LOGGED`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), true);

    await sql`ALTER TABLE public.teacher_notice_email_outbox_schema_migrations
      ENABLE ROW LEVEL SECURITY`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), false);
    await sql`ALTER TABLE public.teacher_notice_email_outbox_schema_migrations
      DISABLE ROW LEVEL SECURITY`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), true);

    await sql`ALTER TABLE public.teacher_notice_email_outbox ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE public.teacher_notice_email_outbox FORCE ROW LEVEL SECURITY`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), false);
    await sql`ALTER TABLE public.teacher_notice_email_outbox NO FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE public.teacher_notice_email_outbox DISABLE ROW LEVEL SECURITY`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), true);

    await sql`ALTER TABLE public.teacher_notice_resend_webhook_schema_migrations SET UNLOGGED`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), false);
    await sql`ALTER TABLE public.teacher_notice_resend_webhook_schema_migrations SET LOGGED`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), true);

    await sql`ALTER TABLE public.teacher_notice_resend_webhook_events ENABLE ROW LEVEL SECURITY`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), false);
    await sql`ALTER TABLE public.teacher_notice_resend_webhook_events DISABLE ROW LEVEL SECURITY`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), true);

    await sql`ALTER TABLE public.teacher_notice_resend_message_state ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE public.teacher_notice_resend_message_state FORCE ROW LEVEL SECURITY`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), false);
    await sql`ALTER TABLE public.teacher_notice_resend_message_state NO FORCE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE public.teacher_notice_resend_message_state DISABLE ROW LEVEL SECURITY`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), true);

    await sql.unsafe("CREATE SCHEMA hostile_resend_webhook");
    await sql.unsafe(`CREATE TABLE hostile_resend_webhook.teacher_notice_resend_webhook_events (
      event_id pg_catalog.text PRIMARY KEY
    )`);
    await sql.begin(async (hostileTransaction) => {
      await hostileTransaction`SELECT pg_catalog.set_config(
        'search_path', 'hostile_resend_webhook, public, pg_catalog', true
      )`;
      assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(hostileTransaction), true);
    });

    const ddlBlocker = postgres(integrationUrl, { max: 1, prepare: false });
    try {
      await sql.begin(async (transaction) => {
        await transaction`LOCK TABLE public.teacher_notice_resend_webhook_events IN ROW SHARE MODE`;
        await assert.rejects(ddlBlocker.begin(async (alterTransaction) => {
          await alterTransaction`SELECT pg_catalog.set_config('lock_timeout', '100ms', true)`;
          await alterTransaction`ALTER TABLE public.teacher_notice_resend_webhook_events
            ADD COLUMN barrier_payload pg_catalog.text`;
        }), /lock timeout|canceling statement/u);
      });
    } finally {
      await ddlBlocker.end({ timeout: 5 });
    }

    await sql`ALTER TABLE public.teacher_notice_resend_webhook_events ADD COLUMN payload pg_catalog.text`;
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), false);
    await assert.rejects(
      persistTeacherNoticeResendWebhookEventPostgres(sql, event({ eventId: "evt-after-drift" })),
      /could not be attested/i
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
});
