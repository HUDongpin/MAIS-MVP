import assert from "node:assert/strict";
import test from "node:test";

import { Webhook } from "svix";

import {
  createTeacherNoticeResendWebhookHandler,
  readTeacherNoticeResendWebhookRawBody
} from "./teacherNoticeResendWebhookHandler";

const secret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const emailId = "550e8400-e29b-41d4-a716-446655440000";

function signedRequest(type = "email.delivered", id = "evt-safe-1") {
  const body = JSON.stringify({
    type,
    created_at: "2026-08-23T01:02:03.004000001Z",
    data: {
      created_at: "2026-08-23T01:02:03.000Z",
      email_id: emailId,
      from: "MAIS <notices@example.test>",
      to: ["private-parent@example.test"],
      subject: "Private subject"
    }
  });
  const timestamp = Math.floor(Date.now() / 1_000);
  const signature = new Webhook(secret).sign(id, new Date(timestamp * 1_000), body);
  return new Request("https://mais.example/api/webhooks/resend/teacher-notices", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": String(timestamp),
      "svix-signature": signature
    },
    body
  });
}

test("bounded raw reader accepts 64 KiB and rejects the next byte without returning payload", async () => {
  const exact = new Request("https://mais.example/webhook", {
    method: "POST",
    body: "a".repeat(65_536)
  });
  assert.equal((await readTeacherNoticeResendWebhookRawBody(exact)).status, "ok");

  const oversized = new Request("https://mais.example/webhook", {
    method: "POST",
    body: "a".repeat(65_537)
  });
  assert.deepEqual(await readTeacherNoticeResendWebhookRawBody(oversized), { status: "too-large" });
});

test("signed known, unknown, and unmatched events return only safe 200 receipts", async () => {
  const persisted: unknown[] = [];
  const handler = createTeacherNoticeResendWebhookHandler({
    env: { RESEND_WEBHOOK_SECRET: secret },
    persist: async (event) => {
      persisted.push(event);
      return { status: "unmatched" as const };
    }
  });
  for (const type of ["email.delivered", "email.future_event"]) {
    const response = await handler(signedRequest(type, `evt-${type}`));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(persisted.length, 1, "signed unknown events must be acknowledged without persistence");
  assert.doesNotMatch(JSON.stringify(persisted), /private-parent|Private subject/u);
});

test("signed unknown events with future payload shapes return 200 without persistence", async () => {
  let persistenceCalls = 0;
  const handler = createTeacherNoticeResendWebhookHandler({
    env: { RESEND_WEBHOOK_SECRET: secret },
    persist: async () => {
      persistenceCalls += 1;
      return { status: "applied" as const };
    }
  });
  const body = JSON.stringify({ type: "email.future_without_current_data" });
  const timestamp = Math.floor(Date.now() / 1_000);
  const id = "evt-future-without-current-data";
  const signature = new Webhook(secret).sign(id, new Date(timestamp * 1_000), body);
  const response = await handler(new Request("https://mais.example/webhook", {
    method: "POST",
    headers: {
      "svix-id": id,
      "svix-timestamp": String(timestamp),
      "svix-signature": signature
    },
    body
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  assert.equal(persistenceCalls, 0);
});

test("invalid signature, malformed body, oversize, and unavailable storage use stable safe status codes", async () => {
  const handler = createTeacherNoticeResendWebhookHandler({
    env: { RESEND_WEBHOOK_SECRET: secret },
    persist: async () => { throw new Error("private SQL detail"); }
  });
  const badSignature = signedRequest();
  badSignature.headers.set("svix-signature", "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
  assert.equal((await handler(badSignature)).status, 401);
  const malformedBody = "{";
  const timestamp = Math.floor(Date.now() / 1_000);
  const malformedSignature = new Webhook(secret).sign(
    "evt-malformed",
    new Date(timestamp * 1_000),
    malformedBody
  );
  assert.equal((await handler(new Request("https://mais.example/webhook", {
    method: "POST",
    headers: {
      "svix-id": "evt-malformed",
      "svix-timestamp": String(timestamp),
      "svix-signature": malformedSignature
    },
    body: malformedBody
  }))).status, 400);
  assert.equal((await handler(new Request("https://mais.example/webhook", { method: "POST", body: "a".repeat(65_537) }))).status, 413);
  const unavailable = await handler(signedRequest());
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: "Service temporarily unavailable." });
});
