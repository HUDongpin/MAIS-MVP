import assert from "node:assert/strict";
import test from "node:test";

import {
  createParentNoticePersistenceStore,
  type ParentNoticePersistenceDatabase
} from "@/lib/server/userStore/parentNoticePersistence";

function createDatabase(): ParentNoticePersistenceDatabase {
  return {
    guardian_links: [
      { parent_id: "parent-1", student_id: "student-1", status: "active" },
      { parent_id: "parent-2", student_id: "student-2", status: "active" },
      { parent_id: "parent-revoked", student_id: "student-3", status: "revoked" }
    ],
    student_profiles: [
      { user_id: "student-1", name: "Ada Student" },
      { user_id: "student-2", name: "Ben Student" },
      { user_id: "student-3", name: "Cam Student" }
    ],
    teacher_classes: [{ id: "class-1", name: "S3 Algebra" }],
    teacher_notice_delivery_attempts: [],
    teacher_notice_recipients: [
      {
        id: "recipient-1",
        notice_id: "notice-1",
        student_id: "student-1",
        guardian_id: "parent-1",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-08-23T08:00:00.000Z"
      },
      {
        id: "recipient-2-same-notice",
        notice_id: "notice-1",
        student_id: "student-2",
        guardian_id: "parent-2",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-08-23T08:00:00.000Z"
      },
      {
        id: "recipient-revoked",
        notice_id: "notice-1",
        student_id: "student-3",
        guardian_id: "parent-revoked",
        status: "pending",
        acknowledged_at: null,
        created_at: "2026-08-23T08:00:00.000Z"
      }
    ],
    teacher_notices: [{
      id: "notice-1",
      teacher_id: "teacher-1",
      class_id: "class-1",
      audience: "parents",
      channel_id: "channel-1",
      channel_name: "Class channel",
      subject_en: "Reminder",
      subject_zh: "提醒",
      body_en: "Review today",
      body_zh: "今天重溫",
      status: "sent",
      due_at: null,
      created_at: "2026-08-23T08:00:00.000Z",
      updated_at: "2026-08-23T08:00:00.000Z",
      sent_at: "2026-08-23T08:00:00.000Z"
    }],
    teacher_review_lessons: [],
    users: [
      { id: "parent-1", role: "parent" },
      { id: "parent-2", role: "parent" },
      { id: "parent-revoked", role: "parent" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" },
      { id: "student-3", role: "student" }
    ]
  };
}

test("parent notice acknowledgement handler returns an exact safe receipt and enforces guardian ownership", async () => {
  let handlerModule: Record<string, unknown> = {};
  try {
    handlerModule = await import("@/app/api/parent/handlers") as Record<string, unknown>;
  } catch {
    // The extraction RED is an assertion failure until the production handler module exists.
  }
  assert.equal(typeof handlerModule.createParentNoticeAckHandler, "function");
  if (typeof handlerModule.createParentNoticeAckHandler !== "function") return;

  const database = createDatabase();
  const clock = { value: "2026-08-23T09:00:00.000Z" };
  const store = createParentNoticePersistenceStore({
    now: () => new Date(clock.value),
    getParentChildSummaries: () => [],
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
  const createHandler = handlerModule.createParentNoticeAckHandler as (dependencies: {
    authenticateParent: (request: Request) => Promise<{ user: { id: string } } | null>;
    acknowledgeNotice: typeof store.acknowledgeParentNotice;
  }) => (request: Request, context: { params: Promise<{ recipientId: string }> }) => Promise<Response>;
  const handler = createHandler({
    authenticateParent: async (request) => {
      const id = request.headers.get("x-test-user-id");
      return id ? { user: { id } } : null;
    },
    acknowledgeNotice: store.acknowledgeParentNotice
  });
  const call = (userId: string, recipientId: string) => handler(
    new Request(`http://localhost/api/parent/notices/${recipientId}/ack`, {
      method: "POST",
      headers: {
        "x-test-user-id": userId,
        "X-MAIS-Expected-User-Id": userId
      }
    }),
    { params: Promise.resolve({ recipientId }) }
  );

  const adminResponse = await call("admin-1", "recipient-1");
  assert.equal(adminResponse.status, 403);
  assert.deepEqual(await adminResponse.json(), { error: "forbidden" });

  const hiddenRecipientResponses = await Promise.all([
    call("parent-2", "recipient-1"),
    call("parent-revoked", "recipient-revoked"),
    call("parent-2", "recipient-does-not-exist")
  ]);
  for (const response of hiddenRecipientResponses) {
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "not-found" });
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  for (const recipientId of ["recipient-1", "recipient-2-same-notice", "recipient-revoked"]) {
    assert.equal(
      database.teacher_notice_recipients.find((recipient) => recipient.id === recipientId)?.status,
      "pending"
    );
  }

  const malformedResponse = await call("parent-1", "%E0%A4%A");
  assert.equal(malformedResponse.status, 400);
  assert.deepEqual(await malformedResponse.json(), { error: "invalid" });
  assert.equal(malformedResponse.headers.get("cache-control"), "private, no-store");

  const firstResponse = await call("parent-1", "recipient-1");
  const firstBody = await firstResponse.json() as Record<string, unknown>;
  assert.equal(firstResponse.status, 200);
  assert.deepEqual(Object.keys(firstBody), ["receipt"]);
  assert.deepEqual(firstBody, {
    receipt: {
      recipientId: "recipient-1",
      status: "acknowledged",
      acknowledgedAt: "2026-08-23T09:00:00.000Z"
    }
  });
  assert.deepEqual(Object.keys(firstBody.receipt as Record<string, unknown>).sort(), [
    "acknowledgedAt", "recipientId", "status"
  ]);
  assert.doesNotMatch(JSON.stringify(firstBody), /recipient-2-same-notice|parent-2|student-2/);
  assert.equal(
    database.teacher_notice_recipients.find((recipient) => recipient.id === "recipient-2-same-notice")?.status,
    "pending",
    "acknowledging one family's recipient must neither expose nor mutate the other active family"
  );

  clock.value = "2026-08-23T20:00:00.000Z";
  const repeatResponse = await call("parent-1", "recipient-1");
  assert.deepEqual(await repeatResponse.json(), firstBody);
  assert.equal(database.teacher_notice_recipients[0].acknowledged_at, "2026-08-23T09:00:00.000Z");
});
