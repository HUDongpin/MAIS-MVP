import type postgres from "postgres";
import { lockLearnerAuthority } from "./learnerAuthoritySchema";
import { requestMutationActor } from "@/lib/server/requestMutationActor";
import { LearnerAuthorityError } from "@/lib/server/learnerAuthorityState";
import { teacherNoticeEmailOutboxTombstoneRetentionMs } from "@/lib/server/userStore/teacherNoticeEmailOutboxPersistence";

type AccountDataSql = postgres.Sql | postgres.TransactionSql;

// Hot writers take shared activity -> account. Snapshot writers take global
// capability -> exclusive activity -> account; reacquiring shared while owning
// exclusive is supported by PostgreSQL's same-session advisory lock semantics.
export function postgresStudentActivitySharedLockQuery(sql: AccountDataSql) {
  return sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtextextended('mais:student-activity', 0))`;
}

export function postgresStudentActivityExclusiveLockQuery(sql: AccountDataSql) {
  return sql`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mais:student-activity', 0))`;
}

// This lock is shared by account erasure, reset, and every hot subject writer.
// Writers that also acquire the snapshot capability MUST acquire it first.
export function postgresAccountDataLockQuery(sql: AccountDataSql, userId: string) {
  return sql`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${`mais:account-data:${userId}`}, 0))`;
}

export function postgresAccountExistsQuery(sql: AccountDataSql, userId: string) {
  return sql<Array<{ account_exists: boolean }>>`
    SELECT EXISTS (SELECT 1 FROM public.auth_users WHERE id = ${userId}) AS account_exists
  `;
}

export async function lockPostgresAccountData(sql: AccountDataSql, userId: string) {
  const installed = await lockLearnerAuthority(sql, "shared");
  await postgresStudentActivitySharedLockQuery(sql);
  await postgresAccountDataLockQuery(sql, userId);
  return installed;
}

export async function lockExistingPostgresAccountData(sql: AccountDataSql, userId: string) {
  const installed = await lockPostgresAccountData(sql, userId);
  if (installed) {
    const actor = await requestMutationActor();
    if (actor) {
      const rows = await sql<Array<{ allowed: boolean }>>`SELECT auth.role=${actor.role} AND auth.disabled_at IS NULL
        AND auth.session_revision=${actor.sessionRevision} AND account.generation=${actor.generation}::uuid
        AND account.mode<>'erased' AS allowed FROM public.auth_users auth JOIN learner_authority.accounts account ON account.user_id=auth.id
        WHERE auth.id=${actor.userId}`;
      if (rows.length !== 1 || rows[0].allowed !== true || Date.now() >= actor.expiresAt) throw new LearnerAuthorityError("authority-actor-rejected", 401);
    }
  }
  const rows = await postgresAccountExistsQuery(sql, userId);
  return rows[0]?.account_exists === true;
}

export async function configurePostgresAccountWriteTransaction(sql: AccountDataSql) {
  await sql`
    SELECT
      pg_catalog.set_config('search_path', 'pg_catalog, public', true),
      pg_catalog.set_config('lock_timeout', '1000ms', true),
      pg_catalog.set_config('statement_timeout', '5000ms', true)
  `;
}

const subjectTables = [
  ["practice_attempts", "user_id"], ["mistake_book_items", "user_id"], ["adaptive_skill_states", "user_id"],
  ["learning_events", "user_id"], ["learning_event_clears", "user_id"], ["reward_point_ledger", "student_id"],
  ["ai_tutor_message_journal", "user_id"], ["ai_tutor_usage_journal", "user_id"], ["ai_governance_rate_limit_events", "user_id"]
] as const;

// Caller holds the global snapshot capability and this account's lock.
// Static relation names only; subject identifiers remain query parameters.
export async function erasePostgresAccountData(sql: AccountDataSql, userId: string) {
  for (const [table, subjectColumn] of subjectTables) {
    const relation = `public.${table}`;
    const rows = await sql<Array<{ relation_exists: boolean }>>`
      SELECT pg_catalog.to_regclass(${relation}) IS NOT NULL AS relation_exists
    `;
    if (rows[0]?.relation_exists === true) {
      await sql.unsafe(`DELETE FROM ${relation} WHERE ${subjectColumn} = $1`, [userId]);
    }
  }
  const outboxRows = await sql<Array<{ relation_exists: boolean }>>`
    SELECT pg_catalog.to_regclass('public.teacher_notice_email_outbox') IS NOT NULL AS relation_exists
  `;
  if (outboxRows[0]?.relation_exists !== true) return;
  await sql`
    UPDATE public.teacher_notice_email_outbox
    SET status = CASE WHEN status IN ('provider-accepted', 'blocked', 'dead-letter') THEN status ELSE 'blocked' END,
        last_error_code = CASE WHEN status IN ('pending', 'retryable', 'leased') THEN 'account-erased' ELSE last_error_code END,
        completed_at = COALESCE(completed_at, pg_catalog.clock_timestamp()),
        lease_token = NULL, lease_expires_at = NULL,
        recipient_id = NULL, student_id = NULL, guardian_id = NULL,
        teacher_id = NULL, queued_by_id = NULL, class_id = NULL, email = NULL, locale = NULL,
        updated_at = pg_catalog.clock_timestamp(),
        pii_expires_at = pg_catalog.clock_timestamp(), pii_purged_at = pg_catalog.clock_timestamp(),
        tombstone_expires_at = GREATEST(tombstone_expires_at,
          pg_catalog.clock_timestamp() + ${teacherNoticeEmailOutboxTombstoneRetentionMs} * INTERVAL '1 millisecond')
    WHERE recipient_id = ${userId} OR student_id = ${userId} OR guardian_id = ${userId}
  `;
}

function timestampOrNull(value: string | undefined) {
  if (value === undefined) return null;
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) throw new Error("Invalid analytics reset timestamp.");
  return timestamp.toISOString();
}

// Caller holds this account's lock. Snapshot resets additionally hold the
// global capability; hot append reads the marker while holding the same lock.
export async function resetPostgresLearningEventsInTransaction(
  sql: AccountDataSql,
  userId: string,
  requestedCutoff?: string,
  snapshotFloor?: string
): Promise<string> {
  const requested = timestampOrNull(requestedCutoff);
  const floor = timestampOrNull(snapshotFloor);
  const rows = await sql<Array<{ cleared_at: string | Date }>>`
    SELECT GREATEST(
      pg_catalog.clock_timestamp(),
      (SELECT cleared_at FROM public.learning_event_clears WHERE user_id = ${userId}),
      (SELECT MAX(created_at) FROM public.learning_events WHERE user_id = ${userId}),
      ${requested}::pg_catalog.timestamptz,
      ${floor}::pg_catalog.timestamptz
    ) AS cleared_at
  `;
  const cutoff = new Date(rows[0]?.cleared_at ?? "");
  if (!Number.isFinite(cutoff.getTime())) throw new Error("Invalid PostgreSQL analytics reset clock.");
  const clearedAt = cutoff.toISOString();
  await sql`DELETE FROM public.learning_events WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO public.learning_event_clears (user_id, cleared_at)
    VALUES (${userId}, ${clearedAt})
    ON CONFLICT (user_id) DO UPDATE SET cleared_at = GREATEST(learning_event_clears.cleared_at, excluded.cleared_at)
  `;
  return clearedAt;
}
