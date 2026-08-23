import assert from "node:assert/strict";
import test from "node:test";

import { Webhook } from "svix";

import {
  TEACHER_NOTICE_RESEND_WEBHOOK_MAX_BODY_BYTES,
  verifyTeacherNoticeResendWebhook,
  type TeacherNoticeResendWebhookEventType
} from "./teacherNoticeResendWebhook";

const signingSecret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const otherSigningSecret = "whsec_NjKhX7v0hJnt3KlaQn4k4aoFz9khB7nW";
const eventId = "msg_parent_notice_webhook_test_1";
const providerMessageId = "550e8400-e29b-41d4-a716-446655440000";
const occurredAt = "2026-08-23T01:02:03.004Z";

const supportedTypes = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.failed",
  "email.suppressed",
  "email.complained"
] as const satisfies readonly TeacherNoticeResendWebhookEventType[];

function payload(
  type: string = "email.delivered",
  data: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    type,
    created_at: occurredAt,
    data: {
      email_id: providerMessageId,
      to: ["guardian-private@example.test"],
      subject: "Private family notice subject",
      html: "<p>Private family notice body</p>",
      headers: { "x-private-diagnostic": "must-not-escape" },
      ...data
    }
  });
}

function signedHeaders(
  rawBody: string,
  options: {
    id?: string;
    secret?: string;
    timestampMs?: number;
  } = {}
): Headers {
  const id = options.id ?? eventId;
  const timestampSeconds = Math.floor((options.timestampMs ?? Date.now()) / 1_000);
  const secret = options.secret ?? signingSecret;
  const signature = new Webhook(secret).sign(
    id,
    new Date(timestampSeconds * 1_000),
    rawBody
  );

  return new Headers({
    "svix-id": id,
    "svix-timestamp": String(timestampSeconds),
    "svix-signature": signature
  });
}

function verify(rawBody: string, headers = signedHeaders(rawBody)) {
  return verifyTeacherNoticeResendWebhook(rawBody, headers, {
    env: { RESEND_WEBHOOK_SECRET: signingSecret }
  });
}

test("all supported delivery lifecycle events verify and return only the safe envelope", () => {
  for (const type of supportedTypes) {
    const rawBody = payload(type);
    const result = verify(rawBody);

    assert.deepEqual(result, {
      ok: true,
      event: {
        eventId,
        type,
        occurredAt,
        providerMessageId
      }
    });
    assert.deepEqual(Object.keys(result).sort(), ["event", "ok"]);
    if (result.ok) {
      assert.deepEqual(Object.keys(result.event).sort(), [
        "eventId",
        "occurredAt",
        "providerMessageId",
        "type"
      ]);
    }
    assert.doesNotMatch(
      JSON.stringify(result),
      /guardian-private|Private family|x-private-diagnostic|must-not-escape/u
    );
  }
});

test("verification is bound to the exact raw body bytes", () => {
  const rawBody = payload();
  const headers = signedHeaders(rawBody);

  assert.deepEqual(verifyTeacherNoticeResendWebhook(`${rawBody} `, headers, {
    env: { RESEND_WEBHOOK_SECRET: signingSecret }
  }), {
    ok: false,
    error: "signature-verification-failed"
  });
});

test("the Svix default five-minute freshness window rejects old and future signatures", () => {
  const rawBody = payload();
  const sixMinutes = 6 * 60 * 1_000;

  for (const timestampMs of [Date.now() - sixMinutes, Date.now() + sixMinutes]) {
    assert.deepEqual(verify(rawBody, signedHeaders(rawBody, { timestampMs })), {
      ok: false,
      error: "signature-verification-failed"
    });
  }
});

test("each missing required Svix header is rejected with one stable error", () => {
  const rawBody = payload();

  for (const name of ["svix-id", "svix-timestamp", "svix-signature"] as const) {
    const headers = signedHeaders(rawBody);
    headers.delete(name);
    assert.deepEqual(verify(rawBody, headers), {
      ok: false,
      error: "missing-header"
    });
  }
});

test("duplicate and malformed Svix headers are rejected before verification", () => {
  const rawBody = payload();

  const duplicateCases = ["svix-id", "svix-timestamp", "svix-signature"] as const;
  for (const name of duplicateCases) {
    const headers = signedHeaders(rawBody);
    headers.append(name, headers.get(name) ?? "duplicate");
    assert.deepEqual(verify(rawBody, headers), {
      ok: false,
      error: "invalid-header"
    });
  }

  const malformed: Array<[string, string]> = [
    ["svix-id", "msg one"],
    ["svix-id", "msg_one\r\nInjected: value"],
    ["svix-timestamp", "1700000000junk"],
    ["svix-timestamp", "1700000000.5"],
    ["svix-signature", "v1,not base64"],
    ["svix-signature", "v1,"],
    ["svix-signature", "v1,abc==="]
  ];

  for (const [name, value] of malformed) {
    const headers = signedHeaders(rawBody);
    if (/\r|\n/u.test(value)) {
      assert.throws(() => headers.set(name, value), TypeError);
      continue;
    }
    headers.set(name, value);
    assert.deepEqual(verify(rawBody, headers), {
      ok: false,
      error: "invalid-header"
    });
  }
});

test("missing, malformed, and wrong signing secrets fail closed without diagnostics", () => {
  const rawBody = payload();
  const headers = signedHeaders(rawBody);

  const cases = [
    {
      env: {},
      expected: { ok: false, error: "missing-configuration" }
    },
    {
      env: { RESEND_WEBHOOK_SECRET: "not-a-webhook-secret" },
      expected: { ok: false, error: "invalid-configuration" }
    },
    {
      env: { RESEND_WEBHOOK_SECRET: otherSigningSecret },
      expected: { ok: false, error: "signature-verification-failed" }
    }
  ] as const;

  for (const fixture of cases) {
    const result = verifyTeacherNoticeResendWebhook(rawBody, headers, {
      env: fixture.env
    });
    assert.deepEqual(result, fixture.expected);
    assert.doesNotMatch(
      JSON.stringify(result),
      /whsec_|MfKQ9|NjKhX|guardian-private|Private family/u
    );
  }
});

test("oversized bodies are rejected using UTF-8 byte length", () => {
  const rawBody = `"${"界".repeat(TEACHER_NOTICE_RESEND_WEBHOOK_MAX_BODY_BYTES)}"`;
  assert.ok(Buffer.byteLength(rawBody, "utf8") > TEACHER_NOTICE_RESEND_WEBHOOK_MAX_BODY_BYTES);

  assert.deepEqual(verify(rawBody, signedHeaders(rawBody)), {
    ok: false,
    error: "body-too-large"
  });
});

test("an exactly 64 KiB signed valid payload is accepted at the body boundary", () => {
  const bodyWithEmptyPadding = payload("email.sent", { padding: "" });
  const remainingBytes =
    TEACHER_NOTICE_RESEND_WEBHOOK_MAX_BODY_BYTES -
    Buffer.byteLength(bodyWithEmptyPadding, "utf8");
  assert.ok(remainingBytes > 0);

  const rawBody = payload("email.sent", { padding: "a".repeat(remainingBytes) });
  assert.equal(
    Buffer.byteLength(rawBody, "utf8"),
    TEACHER_NOTICE_RESEND_WEBHOOK_MAX_BODY_BYTES
  );
  assert.deepEqual(verify(rawBody, signedHeaders(rawBody)), {
    ok: true,
    event: {
      eventId,
      type: "email.sent",
      occurredAt,
      providerMessageId
    }
  });
});

test("signed invalid JSON is distinguished from an invalid signature", () => {
  const rawBody = "{signed-but-not-json";

  assert.deepEqual(verify(rawBody, signedHeaders(rawBody)), {
    ok: false,
    error: "invalid-json"
  });
});

test("malformed JSON with a wrong or tampered signature fails before JSON parsing", () => {
  const rawBody = "{malformed-and-untrusted-json";

  assert.deepEqual(
    verifyTeacherNoticeResendWebhook(rawBody, signedHeaders(rawBody), {
      env: { RESEND_WEBHOOK_SECRET: otherSigningSecret }
    }),
    { ok: false, error: "signature-verification-failed" }
  );

  const tamperedHeaders = signedHeaders(rawBody);
  const signature = tamperedHeaders.get("svix-signature");
  assert.ok(signature);
  const originalCharacter = signature[3];
  tamperedHeaders.set(
    "svix-signature",
    `${signature.slice(0, 3)}${originalCharacter === "A" ? "B" : "A"}${signature.slice(4)}`
  );
  assert.deepEqual(verify(rawBody, tamperedHeaders), {
    ok: false,
    error: "signature-verification-failed"
  });
});

test("unknown signed event types are normalized to ignored without echoing the type", () => {
  const rawBody = payload("email.future_private_event");
  const result = verify(rawBody);

  assert.deepEqual(result, {
    ok: true,
    event: {
      eventId,
      type: "ignored",
      occurredAt,
      providerMessageId
    }
  });
  assert.doesNotMatch(JSON.stringify(result), /future_private_event/u);
});

test("supported events require one exact provider UUID", () => {
  const missingBody = JSON.stringify({
    type: "email.delivered",
    created_at: occurredAt,
    data: {}
  });
  assert.deepEqual(verify(missingBody, signedHeaders(missingBody)), {
    ok: false,
    error: "missing-provider-message-id"
  });

  for (const emailId of [
    "",
    "550e8400-e29b-41d4-a716-44665544000",
    "550e8400-e29b-01d4-a716-446655440000",
    "550e8400-e29b-41d4-0716-446655440000",
    `${providerMessageId},550e8400-e29b-41d4-a716-446655440001`
  ]) {
    const rawBody = payload("email.delivered", { email_id: emailId });
    assert.deepEqual(verify(rawBody, signedHeaders(rawBody)), {
      ok: false,
      error: "invalid-provider-message-id"
    });
  }
});

test("payload shape and occurrence timestamp are strictly normalized", () => {
  const invalidPayloads = [
    "[]",
    "null",
    JSON.stringify({ type: "email.delivered", created_at: occurredAt, data: [] }),
    JSON.stringify({ type: 123, created_at: occurredAt, data: { email_id: providerMessageId } }),
    JSON.stringify({
      type: "email.delivered",
      created_at: "2026-08-23 01:02:03",
      data: { email_id: providerMessageId }
    }),
    JSON.stringify({
      type: "email.delivered",
      created_at: "not-a-date",
      data: { email_id: providerMessageId }
    }),
    JSON.stringify({
      type: "email.delivered",
      created_at: "2026-02-31T01:02:03.004Z",
      data: { email_id: providerMessageId }
    }),
    JSON.stringify({
      type: "email.delivered",
      created_at: "2026-08-23T24:00:00.000Z",
      data: { email_id: providerMessageId }
    }),
    JSON.stringify({
      type: "email.delivered",
      created_at: "2026-04-31T01:02:03.004+08:00",
      data: { email_id: providerMessageId }
    }),
    JSON.stringify({
      type: "email.delivered",
      created_at: "2026-08-23T01:60:03.004Z",
      data: { email_id: providerMessageId }
    }),
    JSON.stringify({
      type: "email.delivered",
      created_at: "2025-02-29T01:02:03.004Z",
      data: { email_id: providerMessageId }
    }),
    JSON.stringify({
      type: "email.delivered",
      created_at: "2026-08-23T01:02:60.004Z",
      data: { email_id: providerMessageId }
    }),
    JSON.stringify({
      type: "email.delivered",
      created_at: "2026-08-23T01:02:03.004+24:00",
      data: { email_id: providerMessageId }
    }),
    JSON.stringify({
      type: "email.delivered",
      created_at: "2026-08-23T01:02:03.004+08:60",
      data: { email_id: providerMessageId }
    })
  ];

  for (const rawBody of invalidPayloads) {
    assert.deepEqual(verify(rawBody, signedHeaders(rawBody)), {
      ok: false,
      error: "invalid-payload"
    });
  }
});

test("valid leap days and numeric offsets round-trip to a canonical UTC instant", () => {
  const fixtures = [
    ["2024-02-29T09:02:03.004+08:00", "2024-02-29T01:02:03.004Z"],
    ["2026-08-22T17:02:03.004-08:00", "2026-08-23T01:02:03.004Z"]
  ] as const;

  for (const [providerOccurredAt, expectedOccurredAt] of fixtures) {
    const rawBody = JSON.stringify({
      type: "email.delivered",
      created_at: providerOccurredAt,
      data: { email_id: providerMessageId }
    });
    assert.deepEqual(verify(rawBody, signedHeaders(rawBody)), {
      ok: true,
      event: {
        eventId,
        type: "email.delivered",
        occurredAt: expectedOccurredAt,
        providerMessageId
      }
    });
  }
});

test("Svix multi-signature rotation accepts a valid signature among unrelated signatures", () => {
  const rawBody = payload("email.sent");
  const headers = signedHeaders(rawBody);
  const timestamp = Number(headers.get("svix-timestamp"));
  const unrelatedSignature = new Webhook(otherSigningSecret).sign(
    eventId,
    new Date(timestamp * 1_000),
    rawBody
  );
  headers.set(
    "svix-signature",
    `${unrelatedSignature} ${headers.get("svix-signature")}`
  );

  assert.deepEqual(verify(rawBody, headers), {
    ok: true,
    event: {
      eventId,
      type: "email.sent",
      occurredAt,
      providerMessageId
    }
  });
});

test("only a raw string body and a Headers instance are accepted", () => {
  const rawBody = payload();
  const headers = signedHeaders(rawBody);

  assert.deepEqual(
    verifyTeacherNoticeResendWebhook(JSON.parse(rawBody) as unknown as string, headers, {
      env: { RESEND_WEBHOOK_SECRET: signingSecret }
    }),
    { ok: false, error: "invalid-body" }
  );
  assert.deepEqual(
    verifyTeacherNoticeResendWebhook(rawBody, {} as Headers, {
      env: { RESEND_WEBHOOK_SECRET: signingSecret }
    }),
    { ok: false, error: "invalid-header" }
  );
});
