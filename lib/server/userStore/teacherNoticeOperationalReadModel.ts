import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import postgres from "postgres";

import { attestTeacherNoticeEmailOutboxSqliteSchema } from
  "./teacherNoticeEmailOutboxPersistence";
import {
  attestTeacherNoticeResendWebhookPostgresSchema,
  attestTeacherNoticeResendWebhookSqliteSchema,
  teacherNoticeEmailOutboxPostgresAdvisoryDependency,
  teacherNoticeResendWebhookPostgresAdvisoryNamespace,
  teacherNoticeResendWebhookPostgresReadRelationLockStatements,
  teacherNoticeResendWebhookTombstoneContract
} from "./teacherNoticeResendWebhookPersistence";
import {
  attestTeacherNoticeEmailCronHeartbeatPostgresSchema,
  attestTeacherNoticeEmailCronHeartbeatSqliteSchema,
  isTeacherNoticeEmailCronHeartbeatReleaseSha,
  teacherNoticeEmailCronHeartbeatPostgresAdvisoryNamespace,
  teacherNoticeEmailCronHeartbeatPostgresReadRelationLockStatements
} from "./teacherNoticeEmailCronHeartbeatPersistence";

export type TeacherNoticeOperationalSnapshot = {
  observedAt: string;
  scheduler: {
    candidateMatch: boolean;
    heartbeatAgeSeconds: number | null;
    heartbeatStatus: "missing" | "started" | "succeeded" | "failed";
    lastFailureAgeSeconds: number | null;
  };
  outbox: {
    actionableCount: number;
    counts: {
      blocked: number;
      deadLetter: number;
      leased: number;
      pending: number;
      providerAccepted: number;
      retryable: number;
    };
    oldestActionableAgeSeconds: number | null;
    recentTerminalCounts: {
      blocked: number;
      deadLetter: number;
    };
    staleLeaseCount: number;
  };
  providerEvents: {
    counts: {
      bounced: number;
      complained: number;
      delivered: number;
      deliveryDelayed: number;
      failed: number;
      sent: number;
      suppressed: number;
    };
    latestReceivedAt: string | null;
    windowSeconds: number;
  };
  webhookReconciliation: {
    oldestUnmatchedAgeSeconds: number | null;
    unmatchedCount: number;
  };
};

type AggregateRow = Record<string, unknown>;

export const teacherNoticeOperationalFutureTimestampToleranceMs = 5_000;

function requireObservedAt(value: Date): { iso: string; milliseconds: number } {
  const milliseconds = value.getTime();
  if (!Number.isFinite(milliseconds)) {
    throw new Error("Teacher notice operational observation time is invalid.");
  }
  return { iso: value.toISOString(), milliseconds };
}

function requireCount(row: AggregateRow, key: string): number {
  const raw = row[key];
  const value = typeof raw === "string" && /^\d+$/u.test(raw) ? Number(raw) : raw;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error("Teacher notice operational aggregate is invalid.");
  }
  return value as number;
}

function requireBoolean(row: AggregateRow, key: string): boolean {
  const value = row[key];
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  throw new Error("Teacher notice operational aggregate is invalid.");
}

function nullableTimestamp(value: unknown, observedAtMs?: number): string | null {
  if (value === null || value === undefined) return null;
  const milliseconds = value instanceof Date
    ? value.getTime()
    : typeof value === "string"
      ? Date.parse(value)
      : Number.NaN;
  if (!Number.isFinite(milliseconds)) {
    throw new Error("Teacher notice operational timestamp is invalid.");
  }
  if (
    observedAtMs !== undefined &&
    milliseconds - observedAtMs > teacherNoticeOperationalFutureTimestampToleranceMs
  ) {
    throw new Error("Teacher notice operational timestamp is in the future.");
  }
  return new Date(milliseconds).toISOString();
}

function ageSeconds(timestamp: unknown, observedAtMs: number): number | null {
  const normalized = nullableTimestamp(timestamp, observedAtMs);
  if (normalized === null) return null;
  const ageMilliseconds = observedAtMs - Date.parse(normalized);
  return ageMilliseconds < 0 ? 0 : Math.floor(ageMilliseconds / 1_000);
}

function operationalSnapshotFromAggregateRows({
  heartbeat,
  observation,
  outbox,
  providerEvents,
  recentWindowSeconds,
  reconciliation
}: {
  heartbeat: AggregateRow;
  observation: { iso: string; milliseconds: number };
  outbox: AggregateRow;
  providerEvents: AggregateRow;
  recentWindowSeconds: number;
  reconciliation: AggregateRow;
}): TeacherNoticeOperationalSnapshot {
  if (
    requireCount(outbox, "unknown_status") !== 0 ||
    requireCount(providerEvents, "unknown_event_type") !== 0
  ) {
    throw new Error("Teacher notice operational status integrity is invalid.");
  }
  const actionableCount = requireCount(outbox, "actionable");
  const blockedCount = requireCount(outbox, "blocked");
  const deadLetterCount = requireCount(outbox, "dead_letter");
  const pendingCount = requireCount(outbox, "pending");
  const providerAcceptedCount = requireCount(outbox, "provider_accepted");
  const retryableCount = requireCount(outbox, "retryable");
  const oldestActionableAgeSeconds = ageSeconds(
    outbox.oldest_actionable_at,
    observation.milliseconds
  );
  const latestActionableAt = nullableTimestamp(
    outbox.latest_actionable_at,
    observation.milliseconds
  );
  const latestTerminalAt = nullableTimestamp(
    outbox.latest_terminal_at,
    observation.milliseconds
  );
  const providerCounts = {
    bounced: requireCount(providerEvents, "bounced"),
    complained: requireCount(providerEvents, "complained"),
    delivered: requireCount(providerEvents, "delivered"),
    deliveryDelayed: requireCount(providerEvents, "delivery_delayed"),
    failed: requireCount(providerEvents, "failed"),
    sent: requireCount(providerEvents, "sent"),
    suppressed: requireCount(providerEvents, "suppressed")
  };
  const latestReceivedAt = nullableTimestamp(
    providerEvents.latest_received_at,
    observation.milliseconds
  );
  const providerEventCount = Object.values(providerCounts)
    .reduce((sum, count) => sum + count, 0);
  const unmatchedCount = requireCount(reconciliation, "unmatched");
  const oldestUnmatchedAgeSeconds = ageSeconds(
    reconciliation.oldest_unmatched_at,
    observation.milliseconds
  );
  const latestUnmatchedAt = nullableTimestamp(
    reconciliation.latest_unmatched_at,
    observation.milliseconds
  );
  const heartbeatRowCount = requireCount(heartbeat, "row_count");
  if (heartbeatRowCount > 1) {
    throw new Error("Teacher notice operational heartbeat aggregate is invalid.");
  }
  const candidateMatch = requireBoolean(heartbeat, "candidate_matches");
  const rawHeartbeatStatus = heartbeat.heartbeat_status;
  const heartbeatStatus = heartbeatRowCount === 0
    ? "missing"
    : rawHeartbeatStatus === "started" || rawHeartbeatStatus === "succeeded" ||
        rawHeartbeatStatus === "failed"
      ? rawHeartbeatStatus
      : null;
  const heartbeatStartedAt = nullableTimestamp(
    heartbeat.started_at,
    observation.milliseconds
  );
  const heartbeatCompletedAt = nullableTimestamp(
    heartbeat.completed_at,
    observation.milliseconds
  );
  const heartbeatUpdatedAt = nullableTimestamp(
    heartbeat.updated_at,
    observation.milliseconds
  );
  const heartbeatLastFailedAt = nullableTimestamp(
    heartbeat.last_failed_at,
    observation.milliseconds
  );
  if (
    heartbeatStatus === null ||
    (heartbeatRowCount === 0 && (
      candidateMatch || heartbeatStartedAt !== null || heartbeatCompletedAt !== null ||
      heartbeatUpdatedAt !== null || heartbeatLastFailedAt !== null ||
      rawHeartbeatStatus !== null
    )) ||
    (heartbeatRowCount === 1 && (
      heartbeatStartedAt === null || heartbeatUpdatedAt === null ||
      (heartbeatStatus === "started") !== (heartbeatCompletedAt === null)
    )) ||
    (
      heartbeatStartedAt !== null && heartbeatCompletedAt !== null &&
      Date.parse(heartbeatCompletedAt) < Date.parse(heartbeatStartedAt)
    ) ||
    (
      heartbeatStartedAt !== null && heartbeatUpdatedAt !== null &&
      Date.parse(heartbeatUpdatedAt) < Date.parse(heartbeatStartedAt)
    ) ||
    (
      heartbeatLastFailedAt !== null && heartbeatUpdatedAt !== null &&
      Date.parse(heartbeatLastFailedAt) > Date.parse(heartbeatUpdatedAt)
    ) ||
    (
      heartbeatStatus === "failed" &&
      (heartbeatLastFailedAt === null || heartbeatLastFailedAt !== heartbeatCompletedAt)
    )
  ) {
    throw new Error("Teacher notice operational heartbeat aggregate is invalid.");
  }
  const heartbeatAgeSeconds = heartbeatStatus === "missing"
    ? null
    : ageSeconds(
        heartbeatStatus === "started" ? heartbeatStartedAt : heartbeatCompletedAt,
        observation.milliseconds
      );
  const lastFailureAgeSeconds = heartbeatStatus === "missing"
    ? null
    : ageSeconds(heartbeatLastFailedAt, observation.milliseconds);
  if (
    actionableCount > pendingCount + retryableCount ||
    (actionableCount > 0) !== (oldestActionableAgeSeconds !== null) ||
    (actionableCount > 0) !== (latestActionableAt !== null) ||
    (providerAcceptedCount + blockedCount + deadLetterCount > 0) !==
      (latestTerminalAt !== null) ||
    (providerEventCount > 0) !== (latestReceivedAt !== null) ||
    (unmatchedCount > 0) !== (oldestUnmatchedAgeSeconds !== null) ||
    (unmatchedCount > 0) !== (latestUnmatchedAt !== null)
  ) {
    throw new Error("Teacher notice operational actionable aggregate is invalid.");
  }
  return {
    observedAt: observation.iso,
    scheduler: {
      candidateMatch,
      heartbeatAgeSeconds,
      heartbeatStatus,
      lastFailureAgeSeconds
    },
    outbox: {
      actionableCount,
      counts: {
        blocked: blockedCount,
        deadLetter: deadLetterCount,
        leased: requireCount(outbox, "leased"),
        pending: pendingCount,
        providerAccepted: providerAcceptedCount,
        retryable: retryableCount
      },
      oldestActionableAgeSeconds,
      recentTerminalCounts: {
        blocked: requireCount(outbox, "recent_blocked"),
        deadLetter: requireCount(outbox, "recent_dead_letter")
      },
      staleLeaseCount: requireCount(outbox, "stale_lease")
    },
    providerEvents: {
      counts: providerCounts,
      latestReceivedAt,
      windowSeconds: recentWindowSeconds
    },
    webhookReconciliation: {
      oldestUnmatchedAgeSeconds,
      unmatchedCount
    }
  };
}

export function readTeacherNoticeOperationalSnapshotFromSqlite({
  expectedReleaseSha,
  observedAt,
  recentWindowSeconds,
  storage
}: {
  expectedReleaseSha: string;
  observedAt: Date;
  recentWindowSeconds: number;
  storage: DatabaseSync;
}): TeacherNoticeOperationalSnapshot {
  const observation = requireObservedAt(observedAt);
  if (!isTeacherNoticeEmailCronHeartbeatReleaseSha(expectedReleaseSha)) {
    throw new Error("Teacher notice operational release SHA is invalid.");
  }
  if (!Number.isSafeInteger(recentWindowSeconds) || recentWindowSeconds <= 0) {
    throw new Error("Teacher notice operational recent window is invalid.");
  }
  const recentCutoff = new Date(
    observation.milliseconds - recentWindowSeconds * 1_000
  ).toISOString();

  const outbox = storage.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
      COUNT(CASE WHEN status = 'leased' THEN 1 END) AS leased,
      COUNT(CASE WHEN status = 'retryable' THEN 1 END) AS retryable,
      COUNT(CASE WHEN status = 'provider-accepted' THEN 1 END) AS provider_accepted,
      COUNT(CASE WHEN status = 'blocked' THEN 1 END) AS blocked,
      COUNT(CASE WHEN status = 'dead-letter' THEN 1 END) AS dead_letter,
      COUNT(CASE WHEN status NOT IN (
        'pending', 'leased', 'retryable', 'provider-accepted', 'blocked', 'dead-letter'
      ) THEN 1 END) AS unknown_status,
      COUNT(CASE WHEN status = 'leased' AND lease_expires_at <= ? THEN 1 END)
        AS stale_lease,
      COUNT(CASE
        WHEN status IN ('pending', 'retryable') AND next_attempt_at <= ? THEN 1
      END) AS actionable,
      MIN(CASE
        WHEN status IN ('pending', 'retryable') AND next_attempt_at <= ?
          THEN first_enqueued_at
      END)
        AS oldest_actionable_at,
      MAX(CASE
        WHEN status IN ('pending', 'retryable') AND next_attempt_at <= ?
          THEN first_enqueued_at
      END)
        AS latest_actionable_at,
      MAX(CASE
        WHEN status IN ('provider-accepted', 'blocked', 'dead-letter') THEN completed_at
      END)
        AS latest_terminal_at,
      COUNT(CASE WHEN status = 'blocked' AND completed_at >= ? THEN 1 END)
        AS recent_blocked,
      COUNT(CASE WHEN status = 'dead-letter' AND completed_at >= ? THEN 1 END)
        AS recent_dead_letter
    FROM teacher_notice_email_outbox
  `).get(
    observation.iso,
    observation.iso,
    observation.iso,
    observation.iso,
    recentCutoff,
    recentCutoff
  ) as AggregateRow;

  const providerEvents = storage.prepare(`
    SELECT
      COUNT(CASE WHEN event_type = 'email.sent' AND received_at >= ? THEN 1 END)
        AS sent,
      COUNT(CASE WHEN event_type = 'email.delivered' AND received_at >= ? THEN 1 END)
        AS delivered,
      COUNT(CASE WHEN event_type = 'email.delivery_delayed' AND received_at >= ? THEN 1 END)
        AS delivery_delayed,
      COUNT(CASE WHEN event_type = 'email.bounced' AND received_at >= ? THEN 1 END)
        AS bounced,
      COUNT(CASE WHEN event_type = 'email.failed' AND received_at >= ? THEN 1 END)
        AS failed,
      COUNT(CASE WHEN event_type = 'email.suppressed' AND received_at >= ? THEN 1 END)
        AS suppressed,
      COUNT(CASE WHEN event_type = 'email.complained' AND received_at >= ? THEN 1 END)
        AS complained,
      COUNT(CASE WHEN event_type NOT IN (
        'email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced',
        'email.failed', 'email.suppressed', 'email.complained'
      ) THEN 1 END) AS unknown_event_type,
      MAX(CASE WHEN received_at >= ? THEN received_at END) AS latest_received_at
    FROM teacher_notice_resend_webhook_events
    WHERE received_at >= ?
  `).get(
    recentCutoff,
    recentCutoff,
    recentCutoff,
    recentCutoff,
    recentCutoff,
    recentCutoff,
    recentCutoff,
    recentCutoff,
    recentCutoff
  ) as AggregateRow;

  const reconciliation = storage.prepare(`
    SELECT COUNT(*) AS unmatched,
      MIN(received_at) AS oldest_unmatched_at,
      MAX(received_at) AS latest_unmatched_at
    FROM teacher_notice_resend_webhook_events
    WHERE matched_outbox_id IS NULL
  `).get() as AggregateRow;

  const heartbeat = storage.prepare(`
    SELECT
      COUNT(*) AS row_count,
      MAX(status) AS heartbeat_status,
      COALESCE(MAX(CASE WHEN release_sha = ? THEN 1 ELSE 0 END), 0)
        AS candidate_matches,
      MAX(started_at) AS started_at,
      MAX(completed_at) AS completed_at,
      MAX(updated_at) AS updated_at,
      MAX(last_failed_at) AS last_failed_at
    FROM teacher_notice_email_cron_heartbeat
    WHERE singleton = 1
  `).get(expectedReleaseSha) as AggregateRow;

  return operationalSnapshotFromAggregateRows({
    heartbeat,
    observation,
    outbox,
    providerEvents,
    recentWindowSeconds,
    reconciliation
  });
}

type PostgresExecutor = postgres.Sql | postgres.TransactionSql;

function requireSingleAggregateRow(rows: readonly AggregateRow[]): AggregateRow {
  if (rows.length !== 1) {
    throw new Error("Teacher notice operational aggregate cardinality is invalid.");
  }
  return rows[0]!;
}

export async function readTeacherNoticeOperationalSnapshotFromPostgres({
  expectedReleaseSha,
  observedAt,
  recentWindowSeconds,
  sql
}: {
  expectedReleaseSha: string;
  observedAt: Date;
  recentWindowSeconds: number;
  sql: PostgresExecutor;
}): Promise<TeacherNoticeOperationalSnapshot> {
  const observation = requireObservedAt(observedAt);
  if (!isTeacherNoticeEmailCronHeartbeatReleaseSha(expectedReleaseSha)) {
    throw new Error("Teacher notice operational release SHA is invalid.");
  }
  if (!Number.isSafeInteger(recentWindowSeconds) || recentWindowSeconds <= 0) {
    throw new Error("Teacher notice operational recent window is invalid.");
  }
  const recentCutoff = new Date(
    observation.milliseconds - recentWindowSeconds * 1_000
  ).toISOString();
  const recentRetentionCutoff = new Date(
    Date.parse(recentCutoff) +
      teacherNoticeResendWebhookTombstoneContract.retentionDays * 24 * 60 * 60 * 1_000
  ).toISOString();

  const outboxRows = await sql<Array<AggregateRow>>`
    SELECT
      (pg_catalog.count(*) FILTER (WHERE status = 'pending'))::pg_catalog.text AS pending,
      (pg_catalog.count(*) FILTER (WHERE status = 'leased'))::pg_catalog.text AS leased,
      (pg_catalog.count(*) FILTER (WHERE status = 'retryable'))::pg_catalog.text AS retryable,
      (pg_catalog.count(*) FILTER (WHERE status = 'provider-accepted'))::pg_catalog.text
        AS provider_accepted,
      (pg_catalog.count(*) FILTER (WHERE status = 'blocked'))::pg_catalog.text AS blocked,
      (pg_catalog.count(*) FILTER (WHERE status = 'dead-letter'))::pg_catalog.text AS dead_letter,
      (pg_catalog.count(*) FILTER (WHERE status NOT IN (
        'pending', 'leased', 'retryable', 'provider-accepted', 'blocked', 'dead-letter'
      )))::pg_catalog.text AS unknown_status,
      (pg_catalog.count(*) FILTER (
        WHERE status = 'leased'
          AND lease_expires_at <= ${observation.iso}::pg_catalog.timestamptz
      ))::pg_catalog.text AS stale_lease,
      (pg_catalog.count(*) FILTER (
        WHERE status IN ('pending', 'retryable')
          AND next_attempt_at <= ${observation.iso}::pg_catalog.timestamptz
      ))::pg_catalog.text AS actionable,
      pg_catalog.min(first_enqueued_at) FILTER (
        WHERE status IN ('pending', 'retryable')
          AND next_attempt_at <= ${observation.iso}::pg_catalog.timestamptz
      ) AS oldest_actionable_at,
      pg_catalog.max(first_enqueued_at) FILTER (
        WHERE status IN ('pending', 'retryable')
          AND next_attempt_at <= ${observation.iso}::pg_catalog.timestamptz
      ) AS latest_actionable_at,
      pg_catalog.max(completed_at) FILTER (
        WHERE status IN ('provider-accepted', 'blocked', 'dead-letter')
      ) AS latest_terminal_at,
      (pg_catalog.count(*) FILTER (
        WHERE status = 'blocked'
          AND completed_at >= ${recentCutoff}::pg_catalog.timestamptz
      ))::pg_catalog.text AS recent_blocked,
      (pg_catalog.count(*) FILTER (
        WHERE status = 'dead-letter'
          AND completed_at >= ${recentCutoff}::pg_catalog.timestamptz
      ))::pg_catalog.text AS recent_dead_letter
    FROM public.teacher_notice_email_outbox
  `;

  const providerEventRows = await sql<Array<AggregateRow>>`
    SELECT
      (pg_catalog.count(*) FILTER (
        WHERE event_type = 'email.sent'
          AND received_at >= ${recentCutoff}::pg_catalog.timestamptz
      ))::pg_catalog.text AS sent,
      (pg_catalog.count(*) FILTER (
        WHERE event_type = 'email.delivered'
          AND received_at >= ${recentCutoff}::pg_catalog.timestamptz
      ))::pg_catalog.text AS delivered,
      (pg_catalog.count(*) FILTER (
        WHERE event_type = 'email.delivery_delayed'
          AND received_at >= ${recentCutoff}::pg_catalog.timestamptz
      ))::pg_catalog.text AS delivery_delayed,
      (pg_catalog.count(*) FILTER (
        WHERE event_type = 'email.bounced'
          AND received_at >= ${recentCutoff}::pg_catalog.timestamptz
      ))::pg_catalog.text AS bounced,
      (pg_catalog.count(*) FILTER (
        WHERE event_type = 'email.failed'
          AND received_at >= ${recentCutoff}::pg_catalog.timestamptz
      ))::pg_catalog.text AS failed,
      (pg_catalog.count(*) FILTER (
        WHERE event_type = 'email.suppressed'
          AND received_at >= ${recentCutoff}::pg_catalog.timestamptz
      ))::pg_catalog.text AS suppressed,
      (pg_catalog.count(*) FILTER (
        WHERE event_type = 'email.complained'
          AND received_at >= ${recentCutoff}::pg_catalog.timestamptz
      ))::pg_catalog.text AS complained,
      (pg_catalog.count(*) FILTER (WHERE event_type NOT IN (
        'email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced',
        'email.failed', 'email.suppressed', 'email.complained'
      )))::pg_catalog.text AS unknown_event_type,
      pg_catalog.max(received_at) FILTER (
        WHERE received_at >= ${recentCutoff}::pg_catalog.timestamptz
      ) AS latest_received_at
    FROM public.teacher_notice_resend_webhook_events
    WHERE retention_expires_at >= ${recentRetentionCutoff}::pg_catalog.timestamptz
      AND received_at >= ${recentCutoff}::pg_catalog.timestamptz
  `;

  const reconciliationRows = await sql<Array<AggregateRow>>`
    SELECT pg_catalog.count(*)::pg_catalog.text AS unmatched,
      pg_catalog.min(received_at) AS oldest_unmatched_at,
      pg_catalog.max(received_at) AS latest_unmatched_at
    FROM public.teacher_notice_resend_webhook_events
    WHERE matched_outbox_id IS NULL
  `;

  const heartbeatRows = await sql<Array<AggregateRow>>`
    SELECT
      pg_catalog.count(*)::pg_catalog.text AS row_count,
      pg_catalog.max(status) AS heartbeat_status,
      COALESCE(
        pg_catalog.bool_or(release_sha = ${expectedReleaseSha}),
        FALSE
      ) AS candidate_matches,
      pg_catalog.max(started_at) AS started_at,
      pg_catalog.max(completed_at) AS completed_at,
      pg_catalog.max(updated_at) AS updated_at,
      pg_catalog.max(last_failed_at) AS last_failed_at
    FROM public.teacher_notice_email_cron_heartbeat
    WHERE singleton = TRUE
  `;

  return operationalSnapshotFromAggregateRows({
    heartbeat: requireSingleAggregateRow(heartbeatRows),
    observation,
    outbox: requireSingleAggregateRow(outboxRows),
    providerEvents: requireSingleAggregateRow(providerEventRows),
    recentWindowSeconds,
    reconciliation: requireSingleAggregateRow(reconciliationRows)
  });
}

async function attestTeacherNoticeOperationalPostgresSchemas(
  sql: PostgresExecutor
): Promise<boolean> {
  return await attestTeacherNoticeResendWebhookPostgresSchema(sql) &&
    await attestTeacherNoticeEmailCronHeartbeatPostgresSchema(sql);
}

export async function readTeacherNoticeOperationalSnapshotFromAttestedPostgres({
  acquireLocks = acquireTeacherNoticeOperationalPostgresReadLocks,
  attest = attestTeacherNoticeOperationalPostgresSchemas,
  observedAt,
  expectedReleaseSha,
  recentWindowSeconds,
  sql
}: {
  acquireLocks?: (sql: PostgresExecutor) => Promise<void>;
  attest?: (sql: PostgresExecutor) => Promise<boolean>;
  observedAt: Date;
  expectedReleaseSha: string;
  recentWindowSeconds: number;
  sql: PostgresExecutor;
}): Promise<TeacherNoticeOperationalSnapshot> {
  await acquireLocks(sql);
  if (!await attest(sql)) {
    throw new Error("Teacher notice operational PostgreSQL schema could not be attested.");
  }
  return readTeacherNoticeOperationalSnapshotFromPostgres({
    expectedReleaseSha,
    observedAt,
    recentWindowSeconds,
    sql
  });
}

export async function acquireTeacherNoticeOperationalPostgresReadLocks(
  sql: PostgresExecutor
): Promise<void> {
  // Relation locks come first so a repeatable-read transaction cannot acquire
  // an MVCC snapshot through the advisory-lock SELECTs before migration DDL is
  // excluded.
  for (const statement of teacherNoticeResendWebhookPostgresReadRelationLockStatements) {
    await sql.unsafe(statement);
  }
  for (const statement of teacherNoticeEmailCronHeartbeatPostgresReadRelationLockStatements) {
    await sql.unsafe(statement);
  }
  for (const dependency of [
    teacherNoticeEmailOutboxPostgresAdvisoryDependency,
    teacherNoticeResendWebhookPostgresAdvisoryNamespace,
    teacherNoticeEmailCronHeartbeatPostgresAdvisoryNamespace
  ]) {
    const row = requireSingleAggregateRow(await sql<Array<AggregateRow>>`
      SELECT pg_catalog.pg_try_advisory_xact_lock_shared(
        pg_catalog.hashtextextended(${dependency}, 0)) AS acquired
    `);
    if (row.acquired !== true) {
      throw new Error("Teacher notice operational migration coordination is unavailable.");
    }
  }
}

type PostgresOperationalSnapshotReader = (arguments_: {
  expectedReleaseSha: string;
  observedAt: Date;
  recentWindowSeconds: number;
  sql: PostgresExecutor;
}) => Promise<TeacherNoticeOperationalSnapshot>;

async function readTeacherNoticeOperationalPostgresClock(
  sql: PostgresExecutor
): Promise<Date> {
  const row = requireSingleAggregateRow(await sql<Array<AggregateRow>>`
    SELECT pg_catalog.clock_timestamp() AS observed_at
  `);
  const observedAt = nullableTimestamp(row.observed_at);
  if (observedAt === null) {
    throw new Error("Teacher notice operational PostgreSQL clock is invalid.");
  }
  return new Date(observedAt);
}

export async function readTeacherNoticeOperationalSnapshotWithinPostgresTransaction({
  attest = attestTeacherNoticeOperationalPostgresSchemas,
  expectedReleaseSha,
  readSnapshot = readTeacherNoticeOperationalSnapshotFromPostgres,
  recentWindowSeconds,
  sql
}: {
  attest?: (sql: PostgresExecutor) => Promise<boolean>;
  expectedReleaseSha: string;
  readSnapshot?: PostgresOperationalSnapshotReader;
  recentWindowSeconds: number;
  sql: PostgresExecutor;
}): Promise<TeacherNoticeOperationalSnapshot> {
  if (!Number.isSafeInteger(recentWindowSeconds) || recentWindowSeconds <= 0) {
    throw new Error("Teacher notice operational recent window is invalid.");
  }
  if (!isTeacherNoticeEmailCronHeartbeatReleaseSha(expectedReleaseSha)) {
    throw new Error("Teacher notice operational release SHA is invalid.");
  }

  await sql.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
  await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
  await sql.unsafe("SET LOCAL lock_timeout = '1000ms'");
  await sql.unsafe("SET LOCAL statement_timeout = '5000ms'");
  await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '5000ms'");

  await acquireTeacherNoticeOperationalPostgresReadLocks(sql);
  const observedAt = await readTeacherNoticeOperationalPostgresClock(sql);
  if (!await attest(sql)) {
    throw new Error("Teacher notice operational PostgreSQL schema could not be attested.");
  }
  return readSnapshot({ expectedReleaseSha, observedAt, recentWindowSeconds, sql });
}

type OperationalReadArguments = {
  expectedReleaseSha: string;
  observedAt: Date;
  recentWindowSeconds: number;
};

type PostgresOperationalReadArguments = {
  expectedReleaseSha: string;
  recentWindowSeconds: number;
};

type TeacherNoticeOperationalReadModelOptions = {
  env?: Record<string, string | undefined>;
  now?: () => Date;
  postgresRead?: (
    postgresUrl: string,
    arguments_: PostgresOperationalReadArguments
  ) => Promise<TeacherNoticeOperationalSnapshot>;
  recentWindowSeconds?: number;
  sqliteRead?: (
    dbPath: string,
    arguments_: OperationalReadArguments
  ) => TeacherNoticeOperationalSnapshot | Promise<TeacherNoticeOperationalSnapshot>;
};

export const teacherNoticeOperationalRecentWindowSeconds = 3_600;

function readConfiguredSqliteOperationalSnapshot(
  dbPath: string,
  arguments_: OperationalReadArguments
): TeacherNoticeOperationalSnapshot {
  const storage = new DatabaseSync(dbPath, { readOnly: true });
  try {
    storage.exec("BEGIN");
    if (
      !attestTeacherNoticeEmailOutboxSqliteSchema(storage) ||
      !attestTeacherNoticeResendWebhookSqliteSchema(storage) ||
      !attestTeacherNoticeEmailCronHeartbeatSqliteSchema(storage)
    ) {
      throw new Error("Teacher notice operational SQLite schema could not be attested.");
    }
    const snapshot = readTeacherNoticeOperationalSnapshotFromSqlite({ storage, ...arguments_ });
    storage.exec("COMMIT");
    return snapshot;
  } catch (error) {
    try {
      storage.exec("ROLLBACK");
    } catch {
      // Preserve the original attestation/read failure.
    }
    throw error;
  } finally {
    storage.close();
  }
}

async function readConfiguredPostgresOperationalSnapshot(
  postgresUrl: string,
  arguments_: PostgresOperationalReadArguments
): Promise<TeacherNoticeOperationalSnapshot> {
  const client = postgres(postgresUrl, {
    connect_timeout: 5,
    idle_timeout: 5,
    max: 1,
    prepare: false
  });
  try {
    return await client.begin((sql) =>
      readTeacherNoticeOperationalSnapshotWithinPostgresTransaction({
        expectedReleaseSha: arguments_.expectedReleaseSha,
        recentWindowSeconds: arguments_.recentWindowSeconds,
        sql
      })
    );
  } finally {
    await client.end({ timeout: 1 });
  }
}

export function createTeacherNoticeOperationalReadModel(
  options: TeacherNoticeOperationalReadModelOptions = {}
) {
  const env = options.env ?? process.env;
  const now = options.now ?? (() => new Date());
  const postgresRead = options.postgresRead ?? readConfiguredPostgresOperationalSnapshot;
  const recentWindowSeconds = options.recentWindowSeconds ??
    teacherNoticeOperationalRecentWindowSeconds;
  const sqliteRead = options.sqliteRead ?? readConfiguredSqliteOperationalSnapshot;
  let inFlightPostgresRead: Promise<TeacherNoticeOperationalSnapshot> | null = null;

  return async function readTeacherNoticeOperationalSnapshot():
  Promise<TeacherNoticeOperationalSnapshot> {
    const provider = env.HK_MATH_STORAGE_PROVIDER?.trim().toLowerCase() || "sqlite";
    if (provider !== "sqlite" && provider !== "postgres") {
      throw new Error("Teacher notice operational storage provider is unsupported.");
    }
    if (provider === "sqlite" && (env.VERCEL || env.VERCEL_ENV)) {
      throw new Error("Teacher notice operational health requires durable storage on Vercel.");
    }
    const expectedReleaseSha = env.MAIS_RELEASE_SHA?.trim();

    if (provider === "postgres") {
      const postgresUrl = env.POSTGRES_URL?.trim();
      if (!postgresUrl) {
        throw new Error("POSTGRES_URL is required when HK_MATH_STORAGE_PROVIDER=postgres.");
      }
      if (!isTeacherNoticeEmailCronHeartbeatReleaseSha(expectedReleaseSha)) {
        throw new Error("MAIS_RELEASE_SHA is required for teacher notice operational health.");
      }
      if (inFlightPostgresRead === null) {
        const request = postgresRead(postgresUrl, {
          expectedReleaseSha,
          recentWindowSeconds
        });
        inFlightPostgresRead = request;
        request.then(
          () => {
            if (inFlightPostgresRead === request) inFlightPostgresRead = null;
          },
          () => {
            if (inFlightPostgresRead === request) inFlightPostgresRead = null;
          }
        );
      }
      return inFlightPostgresRead;
    }

    if (!isTeacherNoticeEmailCronHeartbeatReleaseSha(expectedReleaseSha)) {
      throw new Error("MAIS_RELEASE_SHA is required for teacher notice operational health.");
    }

    const defaultDirectory = path.join(process.cwd(), ".local");
    const dbPath = env.HK_MATH_DB_PATH?.trim()
      ? path.resolve(env.HK_MATH_DB_PATH)
      : path.join(
          path.resolve(env.HK_MATH_DB_DIR?.trim() || defaultDirectory),
          "hk-math-db.sqlite"
        );
    return sqliteRead(dbPath, {
      expectedReleaseSha,
      observedAt: now(),
      recentWindowSeconds
    });
  };
}
