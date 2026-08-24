import { Webhook, WebhookVerificationError } from "svix";

type TeacherNoticeResendWebhookEnvironment = Record<string, string | undefined>;

type TeacherNoticeResendWebhookOptions = {
  env?: TeacherNoticeResendWebhookEnvironment;
};

export type TeacherNoticeResendWebhookEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.failed"
  | "email.suppressed"
  | "email.complained";

export type TeacherNoticeResendWebhookEnvelope = {
  eventId: string;
  type: TeacherNoticeResendWebhookEventType;
  occurredAt: string;
  occurredAtNs: string;
  priority: number;
  providerMessageId: string;
};

export type TeacherNoticeResendWebhookError =
  | "missing-configuration"
  | "invalid-configuration"
  | "invalid-body"
  | "body-too-large"
  | "missing-header"
  | "invalid-header"
  | "signature-verification-failed"
  | "invalid-json"
  | "invalid-payload"
  | "missing-provider-message-id"
  | "invalid-provider-message-id";

export type TeacherNoticeResendWebhookResult =
  | { ok: true; event: TeacherNoticeResendWebhookEnvelope | { type: "ignored" } }
  | { ok: false; error: TeacherNoticeResendWebhookError };

type VerifiedHeaders = {
  eventId: string;
  timestamp: string;
  signature: string;
};

export const TEACHER_NOTICE_RESEND_WEBHOOK_MAX_BODY_BYTES = 64 * 1_024;

const maxSigningSecretLength = 512;
const maxSignatureHeaderLength = 4_096;

const supportedEventTypes = new Set<TeacherNoticeResendWebhookEventType>([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.failed",
  "email.suppressed",
  "email.complained"
]);

const eventIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/u;
const timestampPattern = /^[1-9][0-9]{0,12}$/u;
const signaturePattern = /^v1,[A-Za-z0-9+/]{43}=(?: v1,[A-Za-z0-9+/]{43}=)*$/u;
const signingSecretPattern = /^whsec_[A-Za-z0-9+/]{16,500}={0,2}$/u;
const providerMessageIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const providerTimestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|([+-])(\d{2}):(\d{2}))$/u;
const providerEventTypePattern = /^[a-z][a-z0-9_.-]{0,99}$/u;
const maxEnvelopeStringLength = 2_048;

const eventPriority: Record<TeacherNoticeResendWebhookEventType, number> = {
  "email.sent": 0,
  "email.delivery_delayed": 10,
  "email.delivered": 20,
  "email.bounced": 30,
  "email.failed": 40,
  "email.suppressed": 50,
  "email.complained": 60
};

export function teacherNoticeResendWebhookEventPriority(
  type: TeacherNoticeResendWebhookEventType | "ignored"
): number {
  return type === "ignored" ? eventPriority["email.sent"] : eventPriority[type];
}

export function compareTeacherNoticeResendWebhookEvents(
  left: Pick<TeacherNoticeResendWebhookEnvelope, "occurredAtNs" | "priority" | "eventId">,
  right: Pick<TeacherNoticeResendWebhookEnvelope, "occurredAtNs" | "priority" | "eventId">
): number {
  const leftNs = BigInt(left.occurredAtNs);
  const rightNs = BigInt(right.occurredAtNs);
  if (leftNs < rightNs) return -1;
  if (leftNs > rightNs) return 1;
  if (left.priority !== right.priority) return left.priority < right.priority ? -1 : 1;
  return left.eventId < right.eventId ? -1 : left.eventId > right.eventId ? 1 : 0;
}

function failure(error: TeacherNoticeResendWebhookError): TeacherNoticeResendWebhookResult {
  return { ok: false, error };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function resolveWebhook(env: TeacherNoticeResendWebhookEnvironment):
  | { ok: true; webhook: Webhook }
  | { ok: false; result: TeacherNoticeResendWebhookResult } {
  const signingSecret = env.RESEND_WEBHOOK_SECRET;
  if (signingSecret === undefined || signingSecret === "") {
    return { ok: false, result: failure("missing-configuration") };
  }
  if (
    signingSecret.length > maxSigningSecretLength ||
    signingSecret !== signingSecret.trim() ||
    !signingSecretPattern.test(signingSecret)
  ) {
    return { ok: false, result: failure("invalid-configuration") };
  }

  try {
    return { ok: true, webhook: new Webhook(signingSecret) };
  } catch {
    return { ok: false, result: failure("invalid-configuration") };
  }
}

function readVerifiedHeaders(headers: Headers):
  | { ok: true; headers: VerifiedHeaders }
  | { ok: false; result: TeacherNoticeResendWebhookResult } {
  const eventId = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");

  if (eventId === null || timestamp === null || signature === null) {
    return { ok: false, result: failure("missing-header") };
  }
  if (
    !eventIdPattern.test(eventId) ||
    !timestampPattern.test(timestamp) ||
    signature.length > maxSignatureHeaderLength ||
    !signaturePattern.test(signature)
  ) {
    return { ok: false, result: failure("invalid-header") };
  }

  return {
    ok: true,
    headers: { eventId, timestamp, signature }
  };
}

function normalizeOccurredAt(
  value: unknown
): { occurredAt: string; occurredAtNs: string } | undefined {
  if (typeof value !== "string" || value.length > 64) {
    return undefined;
  }

  const match = providerTimestampPattern.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fractionalSecond = match[7] ?? "";
  const millisecond = Number(fractionalSecond.padEnd(3, "0").slice(0, 3));
  const zone = match[8];
  const offsetSign = match[9];
  const offsetHour = Number(match[10] ?? "0");
  const offsetMinute = Number(match[11] ?? "0");

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return undefined;
  }

  const localCalendar = new Date(0);
  localCalendar.setUTCHours(0, 0, 0, 0);
  localCalendar.setUTCFullYear(year, month - 1, day);
  localCalendar.setUTCHours(hour, minute, second, millisecond);
  if (
    localCalendar.getUTCFullYear() !== year ||
    localCalendar.getUTCMonth() !== month - 1 ||
    localCalendar.getUTCDate() !== day ||
    localCalendar.getUTCHours() !== hour ||
    localCalendar.getUTCMinutes() !== minute ||
    localCalendar.getUTCSeconds() !== second ||
    localCalendar.getUTCMilliseconds() !== millisecond
  ) {
    return undefined;
  }

  const signedOffsetMinutes =
    zone === "Z"
      ? 0
      : (offsetSign === "+" ? 1 : -1) * (offsetHour * 60 + offsetMinute);
  const milliseconds = localCalendar.getTime() - signedOffsetMinutes * 60_000;
  if (!Number.isFinite(milliseconds)) return undefined;

  try {
    const normalized = new Date(milliseconds).toISOString();
    if (!/^\d{4}-/u.test(normalized)) return undefined;
    const subMillisecondDigits = fractionalSecond.padEnd(9, "0").slice(3, 9);
    return {
      occurredAt: normalized,
      occurredAtNs: String(
        BigInt(Math.trunc(milliseconds)) * BigInt(1_000_000) + BigInt(subMillisecondDigits)
      )
    };
  } catch {
    return undefined;
  }
}

function isBoundedString(value: unknown, allowEmpty = false): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxEnvelopeStringLength &&
    (allowEmpty || value.length > 0)
  );
}

function hasExactCommonResendDataSchema(data: Record<string, unknown>): boolean {
  return (
    normalizeOccurredAt(data.created_at) !== undefined &&
    isBoundedString(data.from) &&
    Array.isArray(data.to) &&
    data.to.length > 0 &&
    data.to.length <= 100 &&
    data.to.every((recipient) => isBoundedString(recipient)) &&
    isBoundedString(data.subject, true)
  );
}

function normalizePayload(
  value: unknown,
  eventId: string
): TeacherNoticeResendWebhookResult {
  if (!isPlainObject(value)) {
    return failure("invalid-payload");
  }
  if (
    typeof value.type !== "string" ||
    !providerEventTypePattern.test(value.type)
  ) {
    return failure("invalid-payload");
  }

  if (!supportedEventTypes.has(value.type as TeacherNoticeResendWebhookEventType)) {
    return { ok: true, event: { type: "ignored" } };
  }
  if (!isPlainObject(value.data)) return failure("invalid-payload");

  const occurredAt = normalizeOccurredAt(value.created_at);
  if (!occurredAt) return failure("invalid-payload");

  const providerMessageId = value.data.email_id;
  if (providerMessageId === undefined) {
    return failure("missing-provider-message-id");
  }
  if (
    typeof providerMessageId !== "string" ||
    !providerMessageIdPattern.test(providerMessageId)
  ) {
    return failure("invalid-provider-message-id");
  }

  const type = value.type as TeacherNoticeResendWebhookEventType;
  if (!hasExactCommonResendDataSchema(value.data)) {
    return failure("invalid-payload");
  }

  return {
    ok: true,
    event: {
      eventId,
      type,
      ...occurredAt,
      priority: teacherNoticeResendWebhookEventPriority(type),
      providerMessageId: providerMessageId.toLowerCase()
    }
  };
}

export function verifyTeacherNoticeResendWebhook(
  rawBody: string,
  headers: Headers,
  options: TeacherNoticeResendWebhookOptions = {}
): TeacherNoticeResendWebhookResult {
  if (typeof rawBody !== "string") return failure("invalid-body");
  if (!(headers instanceof Headers)) return failure("invalid-header");
  if (Buffer.byteLength(rawBody, "utf8") > TEACHER_NOTICE_RESEND_WEBHOOK_MAX_BODY_BYTES) {
    return failure("body-too-large");
  }

  const webhookResolution = resolveWebhook(options.env ?? process.env);
  if (!webhookResolution.ok) return webhookResolution.result;

  const headerResolution = readVerifiedHeaders(headers);
  if (!headerResolution.ok) return headerResolution.result;

  const { eventId, signature, timestamp } = headerResolution.headers;
  let verifiedPayload: unknown;
  try {
    verifiedPayload = webhookResolution.webhook.verify(rawBody, {
      "svix-id": eventId,
      "svix-timestamp": timestamp,
      "svix-signature": signature
    });
  } catch (error) {
    if (error instanceof SyntaxError) return failure("invalid-json");
    if (error instanceof WebhookVerificationError) {
      return failure("signature-verification-failed");
    }
    return failure("signature-verification-failed");
  }

  return normalizePayload(verifiedPayload, eventId);
}
