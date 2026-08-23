import { createHash } from "node:crypto";

export type TeacherNoticeEmailRecipient = {
  recipientId: string;
  email: string;
  acknowledgementUrl: string;
};

export type TeacherNoticeEmailInput = {
  noticeId: string;
  classId: string;
  className: string;
  subject: string;
  body: string;
  dueAt?: string | null;
  idempotencyKey: string;
  recipients: TeacherNoticeEmailRecipient[];
};

type TeacherNoticeEmailEnvironment = Record<string, string | undefined>;

type TeacherNoticeEmailDeliveryOptions = {
  env?: TeacherNoticeEmailEnvironment;
  fetchImpl?: typeof fetch;
};

export type TeacherNoticeEmailRecipientResult =
  | {
      recipientId: string;
      status: "sent";
      providerMessageId: string;
    }
  | {
      recipientId: string;
      status: "failed";
      errorCode: "timeout" | "transport-error";
    }
  | {
      recipientId: string;
      status: "deferred";
      errorCode: "rate-limited";
      retryAfterSeconds?: number;
    }
  | {
      recipientId: string;
      status: "failed";
      errorCode:
        | "idempotency-conflict"
        | "invalid-request"
        | "rate-limited"
        | "provider-unavailable"
        | "provider-rejected"
        | "invalid-response";
      httpStatus: number;
      retryAfterSeconds?: number;
    };

export type TeacherNoticeEmailDeliveryResult =
  | {
      channel: "email";
      provider: "resend";
      status: "disabled";
      results: [];
    }
  | {
      channel: "email";
      provider: "resend";
      status: "not-configured";
      missingVariables: string[];
      results: [];
    }
  | {
      channel: "email";
      provider: "resend";
      status: "class-not-allowed";
      results: [];
    }
  | {
      channel: "email";
      provider: "resend";
      status: "invalid";
      errorCode: "invalid-input";
      results: [];
    }
  | {
      channel: "email";
      provider: "resend";
      status: "sent" | "partial" | "failed";
      results: TeacherNoticeEmailRecipientResult[];
    };

const resendEmailEndpoint = "https://api.resend.com/emails";
const resendUserAgent = "MAIS-MVP/teacher-notice";
const defaultDeliveryTimeoutMs = 12_000;
const minDeliveryTimeoutMs = 1_000;
const maxDeliveryTimeoutMs = 30_000;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildIdempotencyKey(input: TeacherNoticeEmailInput, recipientId: string): string {
  const digest = createHash("sha256")
    .update(`${input.idempotencyKey}\0${input.noticeId}\0${recipientId}`)
    .digest("hex");
  return `teacher-notice/${digest}`;
}

function buildEmailContent(input: TeacherNoticeEmailInput, acknowledgementUrl: string) {
  const dueText = input.dueAt ? `\nDue: ${input.dueAt}` : "";
  const dueHtml = input.dueAt
    ? `<p><strong>Due:</strong> ${escapeHtml(input.dueAt)}</p>`
    : "";

  return {
    text: `${input.className}\n\n${input.body}${dueText}\n\nAcknowledge: ${acknowledgementUrl}`,
    html: [
      `<p><strong>Class:</strong> ${escapeHtml(input.className)}</p>`,
      `<p>${escapeHtml(input.body).replaceAll("\n", "<br>")}</p>`,
      dueHtml,
      `<p><a href="${escapeHtml(acknowledgementUrl)}">Acknowledge this notice</a></p>`
    ].join("")
  };
}

function getProviderErrorCode(
  httpStatus: number
): Exclude<
  Extract<TeacherNoticeEmailRecipientResult, { status: "failed" }>["errorCode"],
  "timeout" | "transport-error" | "invalid-response"
> {
  if (httpStatus === 409) return "idempotency-conflict";
  if (httpStatus === 422) return "invalid-request";
  if (httpStatus === 429) return "rate-limited";
  if (httpStatus >= 500) return "provider-unavailable";
  return "provider-rejected";
}

function getRetryAfterSeconds(response: Response): number | undefined {
  const rawValue = response.headers.get("Retry-After")?.trim();
  if (!rawValue) return undefined;

  const seconds = Number(rawValue);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : undefined;
}

function getDeliveryTimeoutMs(env: TeacherNoticeEmailEnvironment): number {
  const configured = Number(env.TEACHER_NOTICE_DELIVERY_TIMEOUT_MS);
  if (!Number.isFinite(configured) || configured <= 0) return defaultDeliveryTimeoutMs;
  return Math.min(
    Math.max(Math.floor(configured), minDeliveryTimeoutMs),
    maxDeliveryTimeoutMs
  );
}

function hasTextWithin(value: string, maxLength: number): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
}

function isValidEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function isValidAcknowledgementUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isValidDeliveryInput(input: TeacherNoticeEmailInput): boolean {
  if (
    !hasTextWithin(input.noticeId, 200) ||
    !hasTextWithin(input.classId, 200) ||
    !hasTextWithin(input.className, 300) ||
    !hasTextWithin(input.subject, 500) ||
    !hasTextWithin(input.body, 100_000) ||
    !hasTextWithin(input.idempotencyKey, 1_000) ||
    input.recipients.length === 0 ||
    input.recipients.length > 500
  ) {
    return false;
  }

  if (
    input.dueAt &&
    (!hasTextWithin(input.dueAt, 100) || Number.isNaN(Date.parse(input.dueAt)))
  ) {
    return false;
  }

  const recipientIds = new Set<string>();
  for (const recipient of input.recipients) {
    if (
      !hasTextWithin(recipient.recipientId, 200) ||
      recipientIds.has(recipient.recipientId) ||
      !isValidEmail(recipient.email) ||
      !isValidAcknowledgementUrl(recipient.acknowledgementUrl)
    ) {
      return false;
    }
    recipientIds.add(recipient.recipientId);
  }

  return true;
}

async function getProviderMessageId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as unknown;
    if (!body || typeof body !== "object" || !("id" in body)) return undefined;
    const id = (body as { id?: unknown }).id;
    return typeof id === "string" && hasTextWithin(id, 500) ? id : undefined;
  } catch {
    return undefined;
  }
}

export async function deliverTeacherNoticeEmails(
  input: TeacherNoticeEmailInput,
  { env = process.env, fetchImpl = fetch }: TeacherNoticeEmailDeliveryOptions = {}
): Promise<TeacherNoticeEmailDeliveryResult> {
  if (env.TEACHER_NOTICE_EMAIL_ENABLED?.trim().toLowerCase() !== "true") {
    return {
      channel: "email",
      provider: "resend",
      status: "disabled",
      results: []
    };
  }

  const requiredVariables = [
    "RESEND_API_KEY",
    "TEACHER_NOTICE_EMAIL_ALLOWED_CLASS_IDS",
    "TEACHER_NOTICE_FROM"
  ] as const;
  const missingVariables = requiredVariables.filter((name) => !env[name]?.trim());

  if (missingVariables.length) {
    return {
      channel: "email",
      provider: "resend",
      status: "not-configured",
      missingVariables,
      results: []
    };
  }

  if (!isValidDeliveryInput(input)) {
    return {
      channel: "email",
      provider: "resend",
      status: "invalid",
      errorCode: "invalid-input",
      results: []
    };
  }

  const allowedClassIds = new Set(
    env.TEACHER_NOTICE_EMAIL_ALLOWED_CLASS_IDS!
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  if (!allowedClassIds.has(input.classId.trim())) {
    return {
      channel: "email",
      provider: "resend",
      status: "class-not-allowed",
      results: []
    };
  }

  const resendApiKey = env.RESEND_API_KEY!.trim();
  const resendFrom = env.TEACHER_NOTICE_FROM!.trim();

  const results: TeacherNoticeEmailRecipientResult[] = [];
  let deferRemainingRecipients = false;
  let deferredRetryAfterSeconds: number | undefined;
  for (const recipient of input.recipients) {
    if (deferRemainingRecipients) {
      results.push({
        recipientId: recipient.recipientId,
        status: "deferred",
        errorCode: "rate-limited",
        ...(deferredRetryAfterSeconds === undefined
          ? {}
          : { retryAfterSeconds: deferredRetryAfterSeconds })
      });
      continue;
    }

    const content = buildEmailContent(input, recipient.acknowledgementUrl);
    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        abortController.abort();
        reject(new DOMException("Teacher notice delivery timed out", "AbortError"));
      }, getDeliveryTimeoutMs(env));
    });

    try {
      const response = await Promise.race([
        fetchImpl(resendEmailEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": buildIdempotencyKey(input, recipient.recipientId),
            "User-Agent": resendUserAgent
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [recipient.email],
            subject: input.subject,
            text: content.text,
            html: content.html
          }),
          signal: abortController.signal
        }),
        timeout
      ]);

      if (!response.ok) {
        const retryAfterSeconds = getRetryAfterSeconds(response);
        if (response.status === 429) {
          deferRemainingRecipients = true;
          deferredRetryAfterSeconds = retryAfterSeconds;
        }
        results.push({
          recipientId: recipient.recipientId,
          status: "failed",
          errorCode: getProviderErrorCode(response.status),
          httpStatus: response.status,
          ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds })
        });
        continue;
      }

      const providerMessageId = await Promise.race([getProviderMessageId(response), timeout]);
      if (abortController.signal.aborted) {
        results.push({
          recipientId: recipient.recipientId,
          status: "failed",
          errorCode: "timeout"
        });
      } else if (!providerMessageId) {
        results.push({
          recipientId: recipient.recipientId,
          status: "failed",
          errorCode: "invalid-response",
          httpStatus: response.status
        });
      } else {
        results.push({
          recipientId: recipient.recipientId,
          status: "sent",
          providerMessageId
        });
      }
    } catch {
      results.push({
        recipientId: recipient.recipientId,
        status: "failed",
        errorCode: abortController.signal.aborted ? "timeout" : "transport-error"
      });
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  const sentCount = results.filter((result) => result.status === "sent").length;
  const status = sentCount === results.length ? "sent" : sentCount === 0 ? "failed" : "partial";
  return { channel: "email", provider: "resend", status, results };
}
