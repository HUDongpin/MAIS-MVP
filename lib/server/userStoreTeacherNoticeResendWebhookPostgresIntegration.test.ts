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
  readTeacherNoticeResendWebhookDeliverySafePostgres
} from "./userStore/teacherNoticeResendWebhookPersistence";
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
  return sql<Array<{ digest: unknown }>>`
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
  `;
}

test("PostgreSQL 16 migration, concurrent replay, ordering, and exact readiness are real", async () => {
  const sql = postgres(integrationUrl, { max: 6, prepare: false });
  try {
    await sql.unsafe(`
      DROP SCHEMA IF EXISTS hostile_resend_webhook CASCADE;
      DROP TABLE IF EXISTS public.teacher_notice_resend_message_state CASCADE;
      DROP TABLE IF EXISTS public.teacher_notice_resend_webhook_events CASCADE;
      DROP TABLE IF EXISTS public.teacher_notice_resend_webhook_schema_migrations CASCADE;
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
    await migrateTeacherNoticeResendWebhookPostgresSchema(sql);
    assert.equal(await attestTeacherNoticeResendWebhookPostgresSchema(sql), true);

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
    assert.deepEqual(await sql<Array<{ latest_event_id: string }>>`
      SELECT latest_event_id
      FROM public.teacher_notice_resend_message_state
      WHERE provider_message_id = ${unmatchedProvider}::pg_catalog.uuid
    `, [{ latest_event_id: "evt-pg-unmatched" }]);
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
    assert.deepEqual(await sql<Array<{
      matched_outbox_id: string;
      latest_event_id: string;
      latest_event_type: string;
    }>>`
      SELECT matched_outbox_id, latest_event_id, latest_event_type
      FROM public.teacher_notice_resend_message_state
      WHERE provider_message_id = ${budgetProvider}::pg_catalog.uuid
    `, [{
      matched_outbox_id: "outbox-pg-budget",
      latest_event_id: "evt-pg-budget-212",
      latest_event_type: "email.delivered"
    }]);

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
