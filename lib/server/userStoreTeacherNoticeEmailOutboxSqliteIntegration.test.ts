import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { teacherNoticeEmailOutboxSqliteSchema } from "@/lib/server/userStore/teacherNoticeEmailOutboxPersistence";

test("SQLite provider completion serializes at BEGIN IMMEDIATE and rejects a second outbox mapping", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-outbox-provider-map-"));
  const dbPath = path.join(directory, "outbox.sqlite");
  const first = new DatabaseSync(dbPath);
  const second = new DatabaseSync(dbPath);
  try {
    first.exec(teacherNoticeEmailOutboxSqliteSchema);
    first.exec("PRAGMA busy_timeout = 0");
    second.exec("PRAGMA busy_timeout = 0");
    const insertLease = first.prepare(`
      INSERT INTO teacher_notice_email_outbox (
        id, notice_id, recipient_id, recipient_fingerprint, student_id, guardian_id, teacher_id,
        queued_by_id, queued_by_fingerprint, class_id, email, locale, durable_delivery_key,
        content_revision, status, attempt_count, first_enqueued_at, next_attempt_at,
        lease_token, lease_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'leased', 1, ?, ?, ?, ?, ?, ?)
    `);
    const insert = (suffix: string) => insertLease.run(
      `row-${suffix}`, `notice-${suffix}`, `recipient-${suffix}`, `recipient-fingerprint-${suffix}`,
      `student-${suffix}`, `guardian-${suffix}`, "teacher-1", "teacher-1", "teacher-fingerprint",
      "class-1", `${suffix}@example.test`, "en", `teacher-notice-email/notice-${suffix}`,
      "revision-1", "2026-08-24T00:00:00.000Z", "2026-08-24T00:00:00.000Z",
      `lease-${suffix}`, "2026-08-24T00:02:00.000Z", "2026-08-24T00:00:00.000Z",
      "2026-08-24T00:00:00.000Z"
    );
    insert("one");
    insert("two");

    first.exec("BEGIN IMMEDIATE");
    assert.throws(() => second.exec("BEGIN IMMEDIATE"), /busy|locked/i,
      "a second completion writer must not cross the first writer's barrier");
    first.exec("ROLLBACK");

    const providerMessageId = "00000000-0000-4000-8000-000000000123";
    const complete = (storage: DatabaseSync, id: string) => storage.prepare(`
      UPDATE teacher_notice_email_outbox
      SET status = 'provider-accepted', provider_message_id = ?, completed_at = ?,
          lease_token = NULL, lease_expires_at = NULL, updated_at = ?,
          pii_expires_at = ?, tombstone_expires_at = ?
      WHERE id = ? AND status = 'leased'
    `).run(
      providerMessageId,
      "2026-08-24T00:01:00.000Z",
      "2026-08-24T00:01:00.000Z",
      "2026-09-23T00:01:00.000Z",
      "2027-09-28T00:01:00.000Z",
      id
    );

    first.exec("BEGIN IMMEDIATE");
    assert.equal(Number(complete(first, "row-one").changes), 1);
    first.exec("COMMIT");

    second.exec("BEGIN IMMEDIATE");
    assert.throws(() => complete(second, "row-two"), /unique/i,
      "one provider message identifier may map to only one outbox row");
    second.exec("ROLLBACK");
    assert.deepEqual({ ...first.prepare(`
      SELECT status, provider_message_id, lease_token FROM teacher_notice_email_outbox
      WHERE id = 'row-two'
    `).get() }, {
      status: "leased",
      provider_message_id: null,
      lease_token: "lease-two"
    });
  } finally {
    first.close();
    second.close();
    await rm(directory, { recursive: true, force: true });
  }
});

function runWorker(dbPath: string) {
  const source = `
    await (async () => {
      const { DatabaseSync } = await import("node:sqlite");
      const store = await import("./lib/server/userStore.ts");
      const first = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration one",
        body: "Review this notice in MAIS."
      });
      if (first.status !== "created") throw new Error("fixture notice could not be created");
      const firstQueue = await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: first.notice.id });
      const firstReplay = await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: first.notice.id });
      const firstDelivery = await store.deliverTeacherNoticeEmailOutboxBatch(1);
      const blockedStateDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      const blockedBeforeRecovery = blockedStateDb.prepare(
        "SELECT status, attempt_count, first_enqueued_at, next_attempt_at, provider_message_id, last_error_code, last_http_status, completed_at FROM teacher_notice_email_outbox WHERE notice_id = ?"
      ).get(first.notice.id);
      blockedStateDb.close();
      const blockedRecovery = await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: first.notice.id });
      const recoveredStateDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      const blockedAfterRecovery = recoveredStateDb.prepare(
        "SELECT status, attempt_count, first_enqueued_at, next_attempt_at, provider_message_id, last_error_code, last_http_status, completed_at FROM teacher_notice_email_outbox WHERE notice_id = ?"
      ).get(first.notice.id);
      recoveredStateDb.close();
      const blockedRecoveryDelivery = await store.deliverTeacherNoticeEmailOutboxBatch(1);

      const second = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration two",
        body: "Review the second notice in MAIS."
      });
      if (second.status !== "created") throw new Error("second fixture notice could not be created");
      const secondQueue = await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: second.notice.id });
      const leaseDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      leaseDb.prepare(
        "UPDATE teacher_notice_email_outbox SET status = 'leased', attempt_count = 1, lease_token = 'stale-token', lease_expires_at = '2000-01-01T00:00:00.000Z' WHERE notice_id = ?"
      ).run(second.notice.id);
      leaseDb.close();
      const concurrent = await Promise.all([
        store.deliverTeacherNoticeEmailOutboxBatch(1),
        store.deliverTeacherNoticeEmailOutboxBatch(1)
      ]);

      const third = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration three",
        body: "This row tests bounded dead-letter recovery."
      });
      if (third.status !== "created") throw new Error("third fixture notice could not be created");
      await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: third.notice.id });
      const deadDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      deadDb.prepare(
        "UPDATE teacher_notice_email_outbox SET status = 'dead-letter', attempt_count = 8, first_enqueued_at = '2000-01-01T00:00:00.000Z', last_error_code = 'timeout', completed_at = '2000-01-02T00:00:00.000Z', pii_expires_at = '2000-02-01T00:00:00.000Z', tombstone_expires_at = '2001-02-05T00:00:00.000Z' WHERE notice_id = ?"
      ).run(third.notice.id);
      deadDb.close();
      const deadLetterReplay = await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: third.notice.id });

      const fourth = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration four",
        body: "This row tests provider-contact blocked recovery."
      });
      if (fourth.status !== "created") throw new Error("fourth fixture notice could not be created");
      await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: fourth.notice.id });
      const unsafeBlockedDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      unsafeBlockedDb.prepare(
        "UPDATE teacher_notice_email_outbox SET status = 'blocked', attempt_count = 1, last_error_code = 'provider-authentication-failed', completed_at = '2026-08-23T01:00:00.000Z', pii_expires_at = '2026-09-22T01:00:00.000Z', tombstone_expires_at = '2027-09-27T01:00:00.000Z' WHERE notice_id = ?"
      ).run(fourth.notice.id);
      unsafeBlockedDb.close();
      const unsafeBlockedReplay = await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: fourth.notice.id });

      const fifth = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration five",
        body: "This row tests provider acceptance replay."
      });
      if (fifth.status !== "created") throw new Error("fifth fixture notice could not be created");
      await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: fifth.notice.id });
      const acceptedDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      acceptedDb.prepare(
        "UPDATE teacher_notice_email_outbox SET status = 'provider-accepted', attempt_count = 1, provider_message_id = '00000000-0000-4000-8000-000000000001', completed_at = '2026-08-23T01:00:00.000Z', pii_expires_at = '2026-09-22T01:00:00.000Z', tombstone_expires_at = '2027-09-27T01:00:00.000Z' WHERE notice_id = ?"
      ).run(fifth.notice.id);
      acceptedDb.close();
      const acceptedReplay = await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: fifth.notice.id });

      const sixth = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration six",
        body: "This row tests atomic rollback."
      });
      if (sixth.status !== "created") throw new Error("sixth fixture notice could not be created");
      await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: sixth.notice.id });
      const conflictDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      conflictDb.prepare(
        "UPDATE teacher_notice_email_outbox SET email = 'immutable-conflict@example.test', next_attempt_at = '2999-01-01T00:00:00.000Z' WHERE notice_id = ?"
      ).run(sixth.notice.id);
      const conflictStateRow = conflictDb.prepare("SELECT payload FROM app_state WHERE id = 'primary'").get();
      const conflictState = JSON.parse(conflictStateRow.payload);
      conflictState.teacher_notices.find((notice) => notice.id === sixth.notice.id).status = "draft";
      conflictDb.prepare("UPDATE app_state SET payload = ?, revision = revision + 1 WHERE id = 'primary'")
        .run(JSON.stringify(conflictState));
      conflictDb.close();
      let immutableConflictRejected = false;
      try {
        await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: sixth.notice.id });
      } catch {
        immutableConflictRejected = true;
      }

      const seventh = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration seven",
        body: "This row tests that teacher replay preserves Retry-After."
      });
      if (seventh.status !== "created") throw new Error("seventh fixture notice could not be created");
      await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: seventh.notice.id });
      const retryDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      const retryFirstEnqueuedAt = new Date(Date.now() - 60_000).toISOString();
      retryDb.prepare(
        "UPDATE teacher_notice_email_outbox SET status = 'retryable', attempt_count = 2, first_enqueued_at = ?, next_attempt_at = '2999-01-01T00:00:00.000Z', last_error_code = 'rate-limited', last_http_status = 429 WHERE notice_id = ?"
      ).run(retryFirstEnqueuedAt, seventh.notice.id);
      retryDb.close();
      const retryableReplay = await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: seventh.notice.id });

      const eighth = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration eight",
        body: "This row tests an in-flight boundary lease."
      });
      if (eighth.status !== "created") throw new Error("eighth fixture notice could not be created");
      await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: eighth.notice.id });
      const liveLeaseDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      liveLeaseDb.prepare(
        "UPDATE teacher_notice_email_outbox SET status = 'leased', attempt_count = 8, first_enqueued_at = '2000-01-01T00:00:00.000Z', lease_token = '00000000-0000-4000-8000-000000000010', lease_expires_at = '2999-01-01T00:00:00.000Z' WHERE notice_id = ?"
      ).run(eighth.notice.id);
      liveLeaseDb.close();
      const inFlightSweep = await store.deliverTeacherNoticeEmailOutboxBatch(1);

      const ninth = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "students",
        subject: "Outbox integration nine",
        body: "Student-only notices are not guardian email publications."
      });
      if (ninth.status !== "created") throw new Error("ninth fixture notice could not be created");
      const noEligible = await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: ninth.notice.id });

      const tenth = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration ten",
        body: "Contradictory state is quarantined without erasing provider evidence."
      });
      if (tenth.status !== "created") throw new Error("tenth fixture notice could not be created");
      await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: tenth.notice.id });
      const contradictionDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      contradictionDb.exec("PRAGMA ignore_check_constraints = ON");
      contradictionDb.prepare(
        "UPDATE teacher_notice_email_outbox SET provider_message_id = '00000000-0000-4000-8000-000000000099', last_http_status = 202, completed_at = '2026-08-23T00:42:00.000Z', next_attempt_at = '2000-01-01T00:00:00.000Z' WHERE notice_id = ?"
      ).run(tenth.notice.id);
      contradictionDb.exec("PRAGMA ignore_check_constraints = OFF");
      contradictionDb.close();
      const quarantineSweep = await store.deliverTeacherNoticeEmailOutboxBatch(1);

      const eleventh = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration eleven",
        body: "Conflicting co-teacher and viewer authority must quarantine."
      });
      if (eleventh.status !== "created") throw new Error("eleventh fixture notice could not be created");
      await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: eleventh.notice.id });
      const viewerConflictDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      const viewerConflictStateRow = viewerConflictDb.prepare("SELECT payload FROM app_state WHERE id = 'primary'").get();
      const viewerConflictState = JSON.parse(viewerConflictStateRow.payload);
      viewerConflictState.teacher_class_collaborators.push(
        { id: "outbox-collaborator-active", class_id: "class-s3a-2026", teacher_id: "teacher-ms-chan", role: "co-teacher", status: "active" },
        { id: "outbox-collaborator-viewer", class_id: "class-s3a-2026", teacher_id: "teacher-ms-chan", role: "viewer", status: "active" }
      );
      viewerConflictDb.prepare("UPDATE app_state SET payload = ?, revision = revision + 1 WHERE id = 'primary'")
        .run(JSON.stringify(viewerConflictState));
      viewerConflictDb.close();
      const viewerConflictSweep = await store.deliverTeacherNoticeEmailOutboxBatch(1);

      const restoreAuthorityDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      const restoreAuthorityRow = restoreAuthorityDb.prepare("SELECT payload FROM app_state WHERE id = 'primary'").get();
      const restoredAuthorityState = JSON.parse(restoreAuthorityRow.payload);
      restoredAuthorityState.teacher_class_collaborators = restoredAuthorityState.teacher_class_collaborators
        .filter((record) => !String(record.id).startsWith("outbox-collaborator-"));
      restoreAuthorityDb.prepare("UPDATE app_state SET payload = ?, revision = revision + 1 WHERE id = 'primary'")
        .run(JSON.stringify(restoredAuthorityState));
      restoreAuthorityDb.close();

      const twelfth = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration twelve",
        body: "Conflicting active and revoked authority must quarantine."
      });
      if (twelfth.status !== "created") throw new Error("twelfth fixture notice could not be created");
      await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: twelfth.notice.id });
      const revokedConflictDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      const revokedConflictStateRow = revokedConflictDb.prepare("SELECT payload FROM app_state WHERE id = 'primary'").get();
      const revokedConflictState = JSON.parse(revokedConflictStateRow.payload);
      revokedConflictState.teacher_class_collaborators.push(
        { id: "outbox-collaborator-active", class_id: "class-s3a-2026", teacher_id: "teacher-ms-chan", role: "co-teacher", status: "active" },
        { id: "outbox-collaborator-revoked", class_id: "class-s3a-2026", teacher_id: "teacher-ms-chan", role: "co-teacher", status: "revoked" }
      );
      revokedConflictDb.prepare("UPDATE app_state SET payload = ?, revision = revision + 1 WHERE id = 'primary'")
        .run(JSON.stringify(revokedConflictState));
      revokedConflictDb.close();
      const revokedConflictSweep = await store.deliverTeacherNoticeEmailOutboxBatch(1);

      const clearAuthorityDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      const clearAuthorityRow = clearAuthorityDb.prepare("SELECT payload FROM app_state WHERE id = 'primary'").get();
      const clearAuthorityState = JSON.parse(clearAuthorityRow.payload);
      clearAuthorityState.teacher_class_collaborators = clearAuthorityState.teacher_class_collaborators
        .filter((record) => !String(record.id).startsWith("outbox-collaborator-"));
      clearAuthorityDb.prepare("UPDATE app_state SET payload = ?, revision = revision + 1 WHERE id = 'primary'")
        .run(JSON.stringify(clearAuthorityState));
      clearAuthorityDb.close();

      const createContradictoryExpiredLease = async (
        subject,
        attemptCount,
        firstEnqueuedAt,
        completionAt,
        providerMessageId
      ) => {
        const notice = await store.createTeacherNotice({
          teacherId: "teacher-ms-chan",
          classId: "class-s3a-2026",
          audience: "parents",
          subject,
          body: "Expired contradictory lease evidence must be preserved."
        });
        if (notice.status !== "created") throw new Error("expired-lease fixture notice could not be created");
        await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: notice.notice.id });
        const corruptDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
        corruptDb.exec("PRAGMA ignore_check_constraints = ON");
        corruptDb.prepare(
          "UPDATE teacher_notice_email_outbox SET status = 'leased', attempt_count = ?, first_enqueued_at = ?, next_attempt_at = '2000-01-01T00:00:00.000Z', lease_token = '00000000-0000-4000-8000-000000000020', lease_expires_at = '2000-01-01T00:01:00.000Z', provider_message_id = ?, last_http_status = 202, completed_at = ? WHERE notice_id = ?"
        ).run(attemptCount, firstEnqueuedAt, providerMessageId, completionAt, notice.notice.id);
        corruptDb.exec("PRAGMA ignore_check_constraints = OFF");
        corruptDb.close();
        return {
          noticeId: notice.notice.id,
          completionAt,
          providerMessageId,
          sweep: await store.deliverTeacherNoticeEmailOutboxBatch(1)
        };
      };
      const attemptLimitContradiction = await createContradictoryExpiredLease(
        "Outbox integration thirteen",
        8,
        new Date().toISOString(),
        "2026-08-23T00:43:00.000Z",
        "00000000-0000-4000-8000-000000000096"
      );
      const deliveryWindowContradiction = await createContradictoryExpiredLease(
        "Outbox integration fourteen",
        1,
        "2000-01-01T00:00:00.000Z",
        "2026-08-23T00:44:00.000Z",
        "00000000-0000-4000-8000-000000000098"
      );
      const retryableContradictionNotice = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Outbox integration fifteen",
        body: "A due retryable contradiction must be quarantined without erasing evidence."
      });
      if (retryableContradictionNotice.status !== "created") {
        throw new Error("retryable contradiction fixture notice could not be created");
      }
      await store.sendTeacherNotice({
        teacherId: "teacher-ms-chan",
        noticeId: retryableContradictionNotice.notice.id
      });
      const retryableContradictionCompletedAt = "2026-08-23T00:45:00.000Z";
      const retryableContradictionDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      retryableContradictionDb.exec("PRAGMA ignore_check_constraints = ON");
      retryableContradictionDb.prepare(
        "UPDATE teacher_notice_email_outbox SET status = 'retryable', attempt_count = 2, next_attempt_at = '2000-01-01T00:00:00.000Z', provider_message_id = '00000000-0000-4000-8000-000000000097', last_http_status = 429, completed_at = ? WHERE notice_id = ?"
      ).run(retryableContradictionCompletedAt, retryableContradictionNotice.notice.id);
      retryableContradictionDb.exec("PRAGMA ignore_check_constraints = OFF");
      retryableContradictionDb.close();
      const retryableContradiction = {
        noticeId: retryableContradictionNotice.notice.id,
        completionAt: retryableContradictionCompletedAt,
        sweep: await store.deliverTeacherNoticeEmailOutboxBatch(1)
      };

      const sqlite = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      const outboxRows = sqlite.prepare(
        "SELECT notice_id, status, attempt_count, first_enqueued_at, next_attempt_at, lease_token, lease_expires_at, provider_message_id, last_error_code, last_http_status, completed_at FROM teacher_notice_email_outbox ORDER BY notice_id"
      ).all();
      const stateRow = sqlite.prepare("SELECT payload FROM app_state WHERE id = 'primary'").get();
      sqlite.close();
      const state = JSON.parse(stateRow.payload);
      const relevantNoticeIds = new Set([
        first.notice.id,
        second.notice.id,
        third.notice.id,
        fourth.notice.id,
        fifth.notice.id,
        sixth.notice.id,
        seventh.notice.id,
        eighth.notice.id,
        ninth.notice.id,
        tenth.notice.id,
        eleventh.notice.id,
        twelfth.notice.id,
        attemptLimitContradiction.noticeId,
        deliveryWindowContradiction.noticeId,
        retryableContradiction.noticeId
      ]);
      const notices = state.teacher_notices
        .filter((notice) => relevantNoticeIds.has(notice.id))
        .map((notice) => ({ id: notice.id, status: notice.status, sent_at: notice.sent_at }));
      process.stdout.write("OUTBOX_RESULT=" + JSON.stringify({
        firstQueue,
        firstReplay,
        firstDelivery,
        blockedBeforeRecovery,
        blockedRecovery,
        blockedAfterRecovery,
        blockedRecoveryDelivery,
        secondQueue,
        concurrent,
        deadLetterReplay,
        unsafeBlockedReplay,
        acceptedReplay,
        immutableConflictRejected,
        retryableReplay,
        retryFirstEnqueuedAt,
        inFlightSweep,
        noEligible,
        quarantineSweep,
        viewerConflictSweep,
        revokedConflictSweep,
        attemptLimitContradiction,
        deliveryWindowContradiction,
        retryableContradiction,
        noticeIds: {
          first: first.notice.id,
          second: second.notice.id,
          third: third.notice.id,
          fourth: fourth.notice.id,
          fifth: fifth.notice.id,
          sixth: sixth.notice.id,
          seventh: seventh.notice.id,
          eighth: eighth.notice.id,
          ninth: ninth.notice.id,
          tenth: tenth.notice.id,
          eleventh: eleventh.notice.id,
          twelfth: twelfth.notice.id,
          thirteenth: attemptLimitContradiction.noticeId,
          fourteenth: deliveryWindowContradiction.noticeId,
          fifteenth: retryableContradiction.noticeId
        },
        outboxRows,
        notices
      }) + "\\n");
    })().catch((error) => {
      process.stderr.write(String(error && error.stack ? error.stack : error) + "\\n");
      process.exitCode = 1;
    });
  `;
  return new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", source], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "test",
        HK_MATH_DB_PATH: dbPath,
        HK_MATH_STORAGE_PROVIDER: "sqlite",
        HK_MATH_ENABLE_DEMO_USER: "true",
        TEACHER_NOTICE_EMAIL_ENABLED: "false"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) reject(new Error(`SQLite outbox worker failed (${code}): ${stderr.slice(0, 1_000)}`));
      else resolve(stdout);
    });
  });
}

test("SQLite publication, replay, leasing, and blocked completion are durable without marking notices sent", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-teacher-notice-outbox-"));
  try {
    const output = await runWorker(path.join(directory, "outbox.sqlite"));
    const marker = output.split("\n").find((line) => line.startsWith("OUTBOX_RESULT="));
    assert.ok(marker, "worker must emit a bounded aggregate marker");
    const result = JSON.parse(marker.slice("OUTBOX_RESULT=".length)) as Record<string, any>;
    const emailAggregate = (sendResult: Record<string, any>) => {
      assert.equal(sendResult.status, "sent", "legacy teacher send must retain its successful outer contract");
      assert.ok(sendResult.notice, "legacy teacher send must retain its notice read model");
      assert.ok(sendResult.attempt, "legacy teacher send must retain its WeCom attempt read model");
      assert.ok(sendResult.email, "durable email state must be additive to the legacy send response");
      return sendResult.email;
    };

    assert.deepEqual(emailAggregate(result.firstQueue), { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 });
    assert.deepEqual(emailAggregate(result.firstReplay), { status: "queued", queued: 0, reused: 1, recovered: 0, skipped: 0 });
    assert.equal(result.firstReplay.attempt.id, result.firstQueue.attempt.id,
      "a replay must return the same durable WeCom attempt");
    assert.equal(result.firstDelivery.claimed, 1);
    assert.equal(result.firstDelivery.blocked, 1);
    assert.deepEqual(emailAggregate(result.blockedRecovery), { status: "queued", queued: 0, reused: 0, recovered: 1, skipped: 0 });
    assert.equal(result.blockedBeforeRecovery.status, "blocked");
    assert.equal(result.blockedAfterRecovery.status, "pending");
    assert.equal(result.blockedAfterRecovery.completed_at, null);
    for (const field of [
      "attempt_count", "first_enqueued_at", "next_attempt_at", "provider_message_id", "last_error_code", "last_http_status"
    ]) {
      assert.equal(result.blockedAfterRecovery[field], result.blockedBeforeRecovery[field], `${field} must survive safe recovery`);
    }
    assert.equal(result.blockedRecoveryDelivery.claimed, 1);
    assert.equal(result.blockedRecoveryDelivery.blocked, 1);
    assert.deepEqual(emailAggregate(result.secondQueue), { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 });
    assert.equal(result.concurrent.reduce((total: number, item: { claimed: number }) => total + item.claimed, 0), 1);
    assert.deepEqual(emailAggregate(result.deadLetterReplay), { status: "queued", queued: 0, reused: 1, recovered: 0, skipped: 0 });
    assert.deepEqual(emailAggregate(result.unsafeBlockedReplay), { status: "queued", queued: 0, reused: 1, recovered: 0, skipped: 0 });
    assert.deepEqual(emailAggregate(result.acceptedReplay), { status: "queued", queued: 0, reused: 1, recovered: 0, skipped: 0 });
    assert.equal(result.immutableConflictRejected, true);
    assert.deepEqual(emailAggregate(result.retryableReplay), { status: "queued", queued: 0, reused: 1, recovered: 0, skipped: 0 });
    assert.equal(result.inFlightSweep.claimed, 0);
    assert.deepEqual(emailAggregate(result.noEligible), { status: "no-eligible", skipped: 1 });
    assert.equal(result.quarantineSweep.claimed, 0);
    assert.equal(result.viewerConflictSweep.claimed, 0, "co-teacher plus viewer conflict must not contact the provider");
    assert.equal(result.revokedConflictSweep.claimed, 0, "active plus revoked conflict must not contact the provider");
    assert.equal(result.attemptLimitContradiction.sweep.claimed, 0, "attempt-limit contradiction must not contact the provider");
    assert.equal(result.deliveryWindowContradiction.sweep.claimed, 0, "delivery-window contradiction must not contact the provider");
    assert.equal(result.retryableContradiction.sweep.claimed, 0, "retryable contradiction must not contact the provider");
    const rowByNotice = new Map(result.outboxRows.map((row: Record<string, unknown>) => [row.notice_id, row]));
    assert.deepEqual(
      [
        result.noticeIds.first,
        result.noticeIds.second,
        result.noticeIds.fourth,
        result.noticeIds.fifth,
        result.noticeIds.sixth
      ].map((noticeId: string) => {
        const row = rowByNotice.get(noticeId) as Record<string, unknown>;
        return {
          status: row.status,
          attempt_count: row.attempt_count,
          provider_message_id: row.provider_message_id,
          last_error_code: row.last_error_code
        };
      }),
      [
        { status: "blocked", attempt_count: 2, provider_message_id: null, last_error_code: "delivery-disabled" },
        { status: "blocked", attempt_count: 2, provider_message_id: null, last_error_code: "delivery-disabled" },
        { status: "blocked", attempt_count: 1, provider_message_id: null, last_error_code: "provider-authentication-failed" },
        {
          status: "provider-accepted",
          attempt_count: 1,
          provider_message_id: "00000000-0000-4000-8000-000000000001",
          last_error_code: null
        },
        { status: "pending", attempt_count: 0, provider_message_id: null, last_error_code: null }
      ]
    );
    assert.equal(
      rowByNotice.has(result.noticeIds.third),
      false,
      "a terminal tombstone must be deleted after its deterministic retention deadline"
    );
    assert.deepEqual(rowByNotice.get(result.noticeIds.seventh), {
      notice_id: result.noticeIds.seventh,
      status: "retryable",
      attempt_count: 2,
      first_enqueued_at: result.retryFirstEnqueuedAt,
      next_attempt_at: "2999-01-01T00:00:00.000Z",
      lease_token: null,
      lease_expires_at: null,
      provider_message_id: null,
      last_error_code: "rate-limited",
      last_http_status: 429,
      completed_at: null
    });
    assert.equal((rowByNotice.get(result.noticeIds.eighth) as Record<string, unknown>).status, "leased");
    assert.equal((rowByNotice.get(result.noticeIds.eighth) as Record<string, unknown>).attempt_count, 8);
    assert.equal((rowByNotice.get(result.noticeIds.eighth) as Record<string, unknown>).first_enqueued_at, "2000-01-01T00:00:00.000Z");
    assert.equal((rowByNotice.get(result.noticeIds.eighth) as Record<string, unknown>).lease_expires_at, "2999-01-01T00:00:00.000Z");
    assert.equal(rowByNotice.has(result.noticeIds.ninth), false, "no-eligible publication must create no outbox row");
    assert.equal((rowByNotice.get(result.noticeIds.tenth) as Record<string, unknown>).status, "dead-letter");
    assert.equal((rowByNotice.get(result.noticeIds.tenth) as Record<string, unknown>).last_error_code, "quarantined-invalid-row");
    assert.equal(
      (rowByNotice.get(result.noticeIds.tenth) as Record<string, unknown>).provider_message_id,
      "00000000-0000-4000-8000-000000000099",
      "quarantine must preserve provider evidence"
    );
    assert.equal(
      (rowByNotice.get(result.noticeIds.tenth) as Record<string, unknown>).last_http_status,
      202,
      "quarantine must preserve provider HTTP evidence"
    );
    assert.equal(
      (rowByNotice.get(result.noticeIds.tenth) as Record<string, unknown>).completed_at,
      "2026-08-23T00:42:00.000Z",
      "quarantine must preserve prior completion evidence"
    );
    for (const noticeId of [result.noticeIds.eleventh, result.noticeIds.twelfth]) {
      assert.deepEqual({
        status: (rowByNotice.get(noticeId) as Record<string, unknown>).status,
        last_error_code: (rowByNotice.get(noticeId) as Record<string, unknown>).last_error_code
      }, {
        status: "dead-letter",
        last_error_code: "authorization-changed"
      });
    }
    for (const contradiction of [result.attemptLimitContradiction, result.deliveryWindowContradiction]) {
      const row = rowByNotice.get(contradiction.noticeId) as Record<string, unknown>;
      assert.equal(row.status, "dead-letter");
      assert.equal(row.last_error_code, "quarantined-invalid-row");
      assert.equal(row.provider_message_id, contradiction.providerMessageId);
      assert.equal(row.last_http_status, 202);
      assert.equal(row.completed_at, contradiction.completionAt,
        "expired contradictory rows must preserve historical completion evidence");
      assert.equal(row.lease_token, null);
      assert.equal(row.lease_expires_at, null);
    }
    const retryableContradiction = rowByNotice.get(result.retryableContradiction.noticeId) as Record<string, unknown>;
    assert.equal(retryableContradiction.status, "dead-letter");
    assert.equal(retryableContradiction.last_error_code, "quarantined-invalid-row");
    assert.equal(retryableContradiction.provider_message_id, "00000000-0000-4000-8000-000000000097");
    assert.equal(retryableContradiction.last_http_status, 429);
    assert.equal(retryableContradiction.completed_at, result.retryableContradiction.completionAt);
    assert.equal(retryableContradiction.lease_token, null);
    assert.equal(retryableContradiction.lease_expires_at, null);
    const noticeById = new Map(result.notices.map((notice: Record<string, unknown>) => [notice.id, notice]));
    for (const noticeId of [result.noticeIds.first, result.noticeIds.second, result.noticeIds.third, result.noticeIds.fourth, result.noticeIds.fifth]) {
      const notice = noticeById.get(noticeId) as Record<string, unknown>;
      assert.deepEqual({ status: notice.status, sent_at: notice.sent_at }, { status: "queued", sent_at: null });
    }
    assert.deepEqual(
      noticeById.get(result.noticeIds.sixth),
      { id: result.noticeIds.sixth, status: "draft", sent_at: null }
    );
    assert.deepEqual(
      noticeById.get(result.noticeIds.ninth),
      { id: result.noticeIds.ninth, status: "queued", sent_at: null },
      "student-only publication must preserve the WeCom attempt without claiming delivery"
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("SQLite worker purges terminal PII at its deadline and deletes only the expired non-PII tombstone", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-teacher-notice-retention-"));
  const dbPath = path.join(directory, "retention.sqlite");
  const source = `
    await (async () => {
      const { DatabaseSync } = await import("node:sqlite");
      const store = await import("./lib/server/userStore.ts");
      const created = await store.createTeacherNotice({
        teacherId: "teacher-ms-chan",
        classId: "class-s3a-2026",
        audience: "parents",
        subject: "Retention integration",
        body: "Verify terminal PII lifecycle."
      });
      if (created.status !== "created") throw new Error("retention notice could not be created");
      await store.sendTeacherNotice({ teacherId: "teacher-ms-chan", noticeId: created.notice.id });
      await store.deliverTeacherNoticeEmailOutboxBatch(1);

      const expiredPiiDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      expiredPiiDb.prepare(
        "UPDATE teacher_notice_email_outbox SET pii_expires_at = '2000-01-01T00:00:00.000Z', tombstone_expires_at = '2999-01-01T00:00:00.000Z' WHERE notice_id = ?"
      ).run(created.notice.id);
      expiredPiiDb.close();
      await store.deliverTeacherNoticeEmailOutboxBatch(1);

      const purgedDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      const purged = purgedDb.prepare(
        "SELECT recipient_id, student_id, guardian_id, teacher_id, queued_by_id, class_id, email, locale, recipient_fingerprint, queued_by_fingerprint, pii_purged_at, provider_message_id, status FROM teacher_notice_email_outbox WHERE notice_id = ?"
      ).get(created.notice.id);
      purgedDb.prepare(
        "UPDATE teacher_notice_email_outbox SET tombstone_expires_at = '2000-01-02T00:00:00.000Z' WHERE notice_id = ?"
      ).run(created.notice.id);
      purgedDb.close();
      await store.deliverTeacherNoticeEmailOutboxBatch(1);

      const expiredDb = new DatabaseSync(process.env.HK_MATH_DB_PATH);
      const remaining = expiredDb.prepare(
        "SELECT COUNT(*) AS count FROM teacher_notice_email_outbox WHERE notice_id = ?"
      ).get(created.notice.id);
      expiredDb.close();
      process.stdout.write("RETENTION_RESULT=" + JSON.stringify({ purged, remaining }) + "\\n");
    })().catch((error) => {
      process.stderr.write(String(error && error.stack ? error.stack : error) + "\\n");
      process.exitCode = 1;
    });
  `;
  try {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", source], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "test",
          HK_MATH_DB_PATH: dbPath,
          HK_MATH_STORAGE_PROVIDER: "sqlite",
          HK_MATH_ENABLE_DEMO_USER: "true",
          TEACHER_NOTICE_EMAIL_ENABLED: "false"
        },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => { stdout += String(chunk); });
      child.stderr.on("data", (chunk) => { stderr += String(chunk); });
      child.on("error", reject);
      child.on("exit", (code) => code === 0
        ? resolve(stdout)
        : reject(new Error(`SQLite retention worker failed (${code}): ${stderr.slice(0, 1_000)}`)));
    });
    const marker = output.split("\n").find((line) => line.startsWith("RETENTION_RESULT="));
    assert.ok(marker);
    const result = JSON.parse(marker.slice("RETENTION_RESULT=".length)) as Record<string, any>;
    assert.deepEqual({
      recipient_id: result.purged.recipient_id,
      student_id: result.purged.student_id,
      guardian_id: result.purged.guardian_id,
      teacher_id: result.purged.teacher_id,
      queued_by_id: result.purged.queued_by_id,
      class_id: result.purged.class_id,
      email: result.purged.email,
      locale: result.purged.locale
    }, {
      recipient_id: null,
      student_id: null,
      guardian_id: null,
      teacher_id: null,
      queued_by_id: null,
      class_id: null,
      email: null,
      locale: null
    });
    assert.match(result.purged.recipient_fingerprint, /^[a-f0-9]{64}$/u);
    assert.match(result.purged.queued_by_fingerprint, /^[a-f0-9]{64}$/u);
    assert.match(result.purged.pii_purged_at, /^\d{4}-\d{2}-\d{2}T/u);
    assert.equal(result.purged.status, "blocked");
    assert.equal(result.purged.provider_message_id, null);
    assert.equal(Number(result.remaining.count), 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
