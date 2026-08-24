import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  constantTimeTeacherNoticeCronBearerMatches
} from "@/lib/server/teacherNoticeEmailOutboxHandlers";
import {
  normalizeTeacherNoticeRequestIdempotency
} from "@/lib/server/userStore/teacherOpsNoticePersistence";
import {
  selectTeacherOpsReminderBatch
} from "@/lib/server/userStore/teacherOpsReminderPersistence";
import {
  createContinuousTeacherNoticeEmailOutboxReadiness,
  resolveTeacherNoticeEmailOutboxRetentionAction,
  teacherNoticeEmailOutboxPiiRetentionMs,
  teacherNoticeEmailOutboxRetentionContract,
  teacherNoticeEmailOutboxSchemaVersion,
  teacherNoticeEmailOutboxTerminalRetention,
  teacherNoticeEmailOutboxTerminalTombstone,
  teacherNoticeEmailOutboxTombstoneRetentionMs
} from "@/lib/server/userStore/teacherNoticeEmailOutboxPersistence";

test("cron bearer comparison is strict and does not accept whitespace or alternate schemes", () => {
  assert.equal(constantTimeTeacherNoticeCronBearerMatches("Bearer exact-secret", "exact-secret"), true);
  assert.equal(constantTimeTeacherNoticeCronBearerMatches("Bearer exact-secret ", "exact-secret"), false);
  assert.equal(constantTimeTeacherNoticeCronBearerMatches("bearer exact-secret", "exact-secret"), false);
  assert.equal(constantTimeTeacherNoticeCronBearerMatches("Bearer other-secret", "exact-secret"), false);
  assert.equal(constantTimeTeacherNoticeCronBearerMatches(null, "exact-secret"), false);
  assert.equal(constantTimeTeacherNoticeCronBearerMatches("Bearer exact-secret", ""), false);
});

test("request idempotency binds the actor, operation, and payload without retaining the key", () => {
  const first = normalizeTeacherNoticeRequestIdempotency({
    actorId: "teacher-1",
    key: "teacher-request-00000001",
    operation: "notice-send",
    payload: { noticeId: "notice-1" }
  });
  const replay = normalizeTeacherNoticeRequestIdempotency({
    actorId: "teacher-1",
    key: "teacher-request-00000001",
    operation: "notice-send",
    payload: { noticeId: "notice-1" }
  });
  const conflict = normalizeTeacherNoticeRequestIdempotency({
    actorId: "teacher-1",
    key: "teacher-request-00000001",
    operation: "notice-send",
    payload: { noticeId: "notice-2" }
  });

  assert.deepEqual(first, replay);
  assert.match(first!.keyHash, /^[a-f0-9]{64}$/u);
  assert.match(first!.requestHash, /^[a-f0-9]{64}$/u);
  assert.notEqual(first!.keyHash, "teacher-request-00000001");
  assert.notEqual(first!.requestHash, conflict!.requestHash);
  assert.equal(normalizeTeacherNoticeRequestIdempotency({
    actorId: "teacher-1",
    key: "short",
    operation: "notice-send",
    payload: { noticeId: "notice-1" }
  }), null);
});

test("reminder paging finds eligible work beyond the first 100 and resumes without starvation", () => {
  const items = Array.from({ length: 235 }, (_, index) => ({
    assignmentId: `assignment-${String(index).padStart(3, "0")}`,
    studentId: `student-${String(index).padStart(3, "0")}`,
    eligible: index >= 120
  }));

  const first = selectTeacherOpsReminderBatch({
    items,
    cursor: null,
    limit: 100,
    isEligible: (item) => item.eligible
  });
  assert.equal(first.items.length, 100);
  assert.equal(first.items[0]?.assignmentId, "assignment-120");
  assert.ok(first.nextCursor);

  const second = selectTeacherOpsReminderBatch({
    items,
    cursor: first.nextCursor,
    limit: 100,
    isEligible: (item) => item.eligible
  });
  assert.equal(second.items.length, 15);
  assert.equal(second.items[0]?.assignmentId, "assignment-220");
  assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.assignmentId)).size, 115);
});

test("terminal completion starts bounded PII and non-PII tombstone retention windows", () => {
  assert.equal(teacherNoticeEmailOutboxSchemaVersion, 2);
  assert.equal(teacherNoticeEmailOutboxPiiRetentionMs, 30 * 24 * 60 * 60 * 1_000);
  assert.ok(teacherNoticeEmailOutboxTombstoneRetentionMs >= 365 * 24 * 60 * 60 * 1_000);
  const now = "2026-08-24T00:00:00.000Z";
  const retention = teacherNoticeEmailOutboxTerminalRetention(now);
  assert.equal(retention.pii_expires_at, "2026-09-23T00:00:00.000Z");
  assert.equal(retention.pii_purged_at, null);
  assert.equal(retention.tombstone_expires_at, "2027-09-28T00:00:00.000Z");
  assert.deepEqual(teacherNoticeEmailOutboxRetentionContract.directPiiFields, [
    "recipient_id", "student_id", "guardian_id", "teacher_id", "queued_by_id",
    "class_id", "email", "locale", "delivery"
  ]);
  assert.ok(teacherNoticeEmailOutboxRetentionContract.tombstoneFields.includes("recipient_fingerprint"));
  assert.ok(teacherNoticeEmailOutboxRetentionContract.tombstoneFields.includes("content_revision"));
  for (const field of teacherNoticeEmailOutboxRetentionContract.directPiiFields) {
    assert.equal((teacherNoticeEmailOutboxRetentionContract.tombstoneFields as readonly string[]).includes(field), false);
  }
});

test("terminal PII purge removes direct family fields and leaves only the bounded tombstone", () => {
  const now = "2026-09-23T00:00:00.000Z";
  const patch = teacherNoticeEmailOutboxTerminalTombstone({
    recipientId: "recipient-family-1",
    providerMessageId: "11111111-1111-4111-8111-111111111111",
    now
  });
  assert.equal(patch.recipient_id, null);
  assert.equal(patch.student_id, null);
  assert.equal(patch.guardian_id, null);
  assert.equal(patch.teacher_id, null);
  assert.equal(patch.class_id, null);
  assert.equal(patch.email, null);
  assert.match(patch.recipient_fingerprint, /^[a-f0-9]{64}$/u);
  assert.equal(patch.pii_purged_at, now);
  assert.ok(Date.parse(patch.tombstone_expires_at) > Date.parse(now));
});

test("terminal retention deterministically purges PII before deleting the non-PII tombstone", () => {
  const terminal = {
    status: "blocked" as const,
    pii_expires_at: "2026-09-23T00:00:00.000Z",
    pii_purged_at: null,
    tombstone_expires_at: "2027-09-28T00:00:00.000Z"
  };
  assert.equal(resolveTeacherNoticeEmailOutboxRetentionAction({
    row: terminal,
    now: "2026-09-22T23:59:59.999Z"
  }), "retain");
  assert.equal(resolveTeacherNoticeEmailOutboxRetentionAction({
    row: terminal,
    now: terminal.pii_expires_at
  }), "purge-pii");
  assert.equal(resolveTeacherNoticeEmailOutboxRetentionAction({
    row: { ...terminal, pii_purged_at: terminal.pii_expires_at },
    now: "2027-09-27T23:59:59.999Z"
  }), "retain");
  assert.equal(resolveTeacherNoticeEmailOutboxRetentionAction({
    row: { ...terminal, pii_purged_at: terminal.pii_expires_at },
    now: terminal.tombstone_expires_at
  }), "delete-tombstone");
  assert.equal(resolveTeacherNoticeEmailOutboxRetentionAction({
    row: { ...terminal, status: "pending", pii_expires_at: null, tombstone_expires_at: null },
    now: terminal.tombstone_expires_at
  }), "retain");
});

test("outbox tests are a named package gate and PostgreSQL 16 runs without a skip-only contract", async () => {
  const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const workflow = await readFile(path.join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
  assert.match(packageJson.scripts?.["test:teacher-notice-outbox"] ?? "", /userStoreTeacherNoticeEmailOutbox/u);
  assert.match(packageJson.scripts?.["test:teacher-notice-outbox"] ?? "", /teacherNoticeEmailDelivery\.test\.ts/u);
  assert.match(packageJson.scripts?.["test:teacher-notice-outbox:postgres16"] ?? "", /MAIS_OUTBOX_POSTGRES16_INTEGRATION_URL/u);
  assert.match(workflow, /Run durable teacher-notice outbox unit and SQLite gates[\s\S]*npm run test:teacher-notice-outbox/u);
  assert.match(workflow, /MAIS_OUTBOX_POSTGRES16_INTEGRATION_URL:/u);
  assert.match(workflow, /npm run test:teacher-notice-outbox:postgres16/u);
  assert.match(workflow, /merge_group:/u);
  const realPostgresJob = workflow.match(/  teacher-notice-outbox-postgres16:[\s\S]*?(?=\n  [a-z][a-z0-9-]+:|$)/u)?.[0] ?? "";
  assert.match(realPostgresJob, /github\.event_name == 'push'[\s\S]*github\.ref == 'refs\/heads\/main'/u);
  assert.match(realPostgresJob, /github\.event_name == 'merge_group'/u);
  assert.match(realPostgresJob, /uses: actions\/checkout@v4/u);
});

test("runtime schema readiness re-attests every operation and never latches success or invokes DDL", async () => {
  let checks = 0;
  let ready = true;
  const ensureReady = createContinuousTeacherNoticeEmailOutboxReadiness({
    attest: async () => {
      checks += 1;
      return ready;
    }
  });
  await ensureReady();
  await ensureReady();
  assert.equal(checks, 2);
  ready = false;
  await assert.rejects(ensureReady(), /schema migration is required/i);
  assert.equal(checks, 3);
});
