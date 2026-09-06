import { createHash } from "node:crypto";

export type TeacherNoticeEmailLocale = "en" | "zh-Hant" | "zh-Hans";

export type TeacherNoticeEmailInput = {
  recipientId: string;
  email: string;
  locale: TeacherNoticeEmailLocale;
  durableDeliveryKey: string;
  contentRevision: string;
};

type TeacherNoticeEmailEnvironment = Record<string, string | undefined>;

type TeacherNoticeEmailDeliveryOptions = {
  env?: TeacherNoticeEmailEnvironment;
  fetchImpl?: typeof fetch;
};

export type TeacherNoticeEmailDeliveryStatus =
  | "accepted"
  | "deferred"
  | "ambiguous"
  | "terminal-failure"
  | "configuration-blocked"
  | "disabled";

export type TeacherNoticeEmailErrorCode =
  | "missing-configuration"
  | "invalid-configuration"
  | "provider-authentication-failed"
  | "provider-permission-denied"
  | "provider-security-block"
  | "provider-quota-exceeded"
  | "sender-configuration-invalid"
  | "invalid-input"
  | "invalid-request"
  | "provider-rejected"
  | "idempotency-conflict"
  | "concurrent-request"
  | "resource-locked"
  | "rate-limited"
  | "provider-conflict"
  | "provider-unavailable"
  | "timeout"
  | "transport-error"
  | "invalid-response";

export type TeacherNoticeEmailDeliveryResult = {
  channel: "email";
  provider: "resend";
  status: TeacherNoticeEmailDeliveryStatus;
  errorCode?: TeacherNoticeEmailErrorCode;
  providerMessageId?: string;
  missingVariables?: string[];
  invalidVariables?: string[];
  httpStatus?: number;
  retryAfterSeconds?: number;
};

type ResolvedConfiguration = {
  apiKey: string;
  from: string;
  baseOrigin: string;
  timeoutMs: number;
};

type ConfigurationResolution =
  | { ok: true; configuration: ResolvedConfiguration }
  | {
      ok: false;
      result: TeacherNoticeEmailDeliveryResult;
    };

type ProviderErrorName =
  | "application_error"
  | "concurrent_idempotent_requests"
  | "daily_quota_exceeded"
  | "internal_server_error"
  | "invalid_access"
  | "invalid_from_address"
  | "invalid_idempotent_request"
  | "invalid_parameter"
  | "invalid_permission"
  | "invalid_region"
  | "method_not_allowed"
  | "missing_required_field"
  | "monthly_quota_exceeded"
  | "not_found"
  | "rate_limit_exceeded"
  | "resource_locked"
  | "restricted_api_key"
  | "security_error"
  | "suspended_api_key"
  | "validation_error";

type LocalizedReminder = {
  subject: string;
  lead: string;
  action: string;
  safety: string;
};

const resendEmailEndpoint = "https://api.resend.com/emails";
const resendUserAgent = "MAIS-MVP/teacher-notice";
const defaultDeliveryTimeoutMs = 12_000;
const minDeliveryTimeoutMs = 10;
const maxDeliveryTimeoutMs = 30_000;
const maxProviderResponseBytes = 8_192;
const maxRetryAfterSeconds = 86_400;

const exactInputKeys = [
  "contentRevision",
  "durableDeliveryKey",
  "email",
  "locale",
  "recipientId"
] as const;

const supportedLocales = new Set<TeacherNoticeEmailLocale>(["en", "zh-Hant", "zh-Hans"]);

const providerErrorNames = new Set<ProviderErrorName>([
  "application_error",
  "concurrent_idempotent_requests",
  "daily_quota_exceeded",
  "internal_server_error",
  "invalid_access",
  "invalid_from_address",
  "invalid_idempotent_request",
  "invalid_parameter",
  "invalid_permission",
  "invalid_region",
  "method_not_allowed",
  "missing_required_field",
  "monthly_quota_exceeded",
  "not_found",
  "rate_limit_exceeded",
  "resource_locked",
  "restricted_api_key",
  "security_error",
  "suspended_api_key",
  "validation_error"
]);

const localizedReminders: Record<TeacherNoticeEmailLocale, LocalizedReminder> = {
  en: {
    subject: "New MAIS family notice",
    lead: "A new family notice is available in MAIS.",
    action: "Sign in to review and acknowledge it",
    safety: "If you were not expecting this notice, contact your school."
  },
  "zh-Hant": {
    subject: "MAIS 新家校通知",
    lead: "MAIS 有一則新的家校通知。",
    action: "請登入後查看並確認",
    safety: "如你未預期收到此通知，請聯絡學校。"
  },
  "zh-Hans": {
    subject: "MAIS 新家校通知",
    lead: "MAIS 有一则新的家校通知。",
    action: "请登录后查看并确认",
    safety: "如你未预期收到此通知，请联系学校。"
  }
};

function baseResult(
  status: TeacherNoticeEmailDeliveryStatus,
  fields: Omit<TeacherNoticeEmailDeliveryResult, "channel" | "provider" | "status"> = {}
): TeacherNoticeEmailDeliveryResult {
  return {
    channel: "email",
    provider: "resend",
    status,
    ...fields
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isStrictIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 200 &&
    /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u.test(value)
  );
}

function isStrictEmail(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length < 3 ||
    value.length > 254 ||
    value !== value.trim() ||
    /[^\x21-\x7e]/u.test(value) ||
    value.includes(",") ||
    value.includes("<") ||
    value.includes(">")
  ) {
    return false;
  }

  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  if (
    localPart.length < 1 ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(localPart) ||
    domain.length < 3 ||
    domain.includes("..")
  ) {
    return false;
  }

  const labels = domain.split(".");
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u.test(label)
    )
  );
}

function isStrictSender(value: string): boolean {
  if (
    value.length < 3 ||
    value.length > 320 ||
    value !== value.trim() ||
    /[\r\n]/u.test(value) ||
    value.includes(",")
  ) {
    return false;
  }

  if (isStrictEmail(value)) return true;
  const displayMatch = /^([A-Za-z0-9][A-Za-z0-9 .'-]{0,79}) <([^<>]+)>$/u.exec(value);
  return Boolean(displayMatch && isStrictEmail(displayMatch[2]));
}

function isValidDeliveryInput(input: unknown): input is TeacherNoticeEmailInput {
  if (!isPlainObject(input)) return false;
  const keys = Object.keys(input).sort();
  if (
    keys.length !== exactInputKeys.length ||
    keys.some((key, index) => key !== exactInputKeys[index])
  ) {
    return false;
  }

  return (
    isStrictIdentifier(input.recipientId) &&
    isStrictEmail(input.email) &&
    typeof input.locale === "string" &&
    supportedLocales.has(input.locale as TeacherNoticeEmailLocale) &&
    isStrictIdentifier(input.durableDeliveryKey) &&
    isStrictIdentifier(input.contentRevision)
  );
}

function isStrictSecret(value: string): boolean {
  return (
    value.length >= 8 &&
    value.length <= 512 &&
    value === value.trim() &&
    !/[\s\x00-\x1f\x7f]/u.test(value)
  );
}

function parseCanonicalHttpsOrigin(value: string): string | undefined {
  if (value !== value.trim() || value.length > 2_048) return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      value !== url.origin
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

function getTimeoutMs(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return defaultDeliveryTimeoutMs;
  if (!/^\d+$/u.test(value)) return undefined;
  const timeoutMs = Number(value);
  return Number.isSafeInteger(timeoutMs) &&
    timeoutMs >= minDeliveryTimeoutMs &&
    timeoutMs <= maxDeliveryTimeoutMs
    ? timeoutMs
    : undefined;
}

function resolveConfiguration(env: TeacherNoticeEmailEnvironment): ConfigurationResolution {
  const missingVariables: string[] = [];
  const invalidVariables: string[] = [];

  let apiKey: string | undefined;
  const dedicatedApiKey = env.TEACHER_NOTICE_RESEND_API_KEY;
  if (dedicatedApiKey) {
    if (isStrictSecret(dedicatedApiKey)) apiKey = dedicatedApiKey;
    else invalidVariables.push("TEACHER_NOTICE_RESEND_API_KEY");
  } else {
    missingVariables.push("TEACHER_NOTICE_RESEND_API_KEY");
  }

  const from = env.TEACHER_NOTICE_FROM;
  if (!from) missingVariables.push("TEACHER_NOTICE_FROM");
  else if (!isStrictSender(from)) invalidVariables.push("TEACHER_NOTICE_FROM");

  const baseUrl = env.TEACHER_NOTICE_BASE_URL;
  const allowedOrigin = env.TEACHER_NOTICE_ALLOWED_ORIGIN;
  if (!baseUrl) missingVariables.push("TEACHER_NOTICE_BASE_URL");
  if (!allowedOrigin) missingVariables.push("TEACHER_NOTICE_ALLOWED_ORIGIN");

  const parsedBaseOrigin = baseUrl ? parseCanonicalHttpsOrigin(baseUrl) : undefined;
  const parsedAllowedOrigin = allowedOrigin
    ? parseCanonicalHttpsOrigin(allowedOrigin)
    : undefined;
  if (baseUrl && !parsedBaseOrigin) invalidVariables.push("TEACHER_NOTICE_BASE_URL");
  if (allowedOrigin && !parsedAllowedOrigin) {
    invalidVariables.push("TEACHER_NOTICE_ALLOWED_ORIGIN");
  }
  if (
    parsedBaseOrigin &&
    parsedAllowedOrigin &&
    parsedBaseOrigin !== parsedAllowedOrigin
  ) {
    invalidVariables.push("TEACHER_NOTICE_BASE_URL", "TEACHER_NOTICE_ALLOWED_ORIGIN");
  }

  const timeoutMs = getTimeoutMs(env.TEACHER_NOTICE_DELIVERY_TIMEOUT_MS);
  if (timeoutMs === undefined) invalidVariables.push("TEACHER_NOTICE_DELIVERY_TIMEOUT_MS");

  if (missingVariables.length > 0 || invalidVariables.length > 0) {
    return {
      ok: false,
      result: baseResult("configuration-blocked", {
        errorCode: missingVariables.length > 0 ? "missing-configuration" : "invalid-configuration",
        ...(missingVariables.length > 0 ? { missingVariables } : {}),
        ...(invalidVariables.length > 0
          ? { invalidVariables: [...new Set(invalidVariables)] }
          : {})
      })
    };
  }

  return {
    ok: true,
    configuration: {
      apiKey: apiKey!,
      from: from!,
      baseOrigin: parsedBaseOrigin!,
      timeoutMs: timeoutMs!
    }
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildAcknowledgementUrl(baseOrigin: string, recipientId: string): string {
  const acknowledgementUrl = new URL("/parent/notices", baseOrigin);
  acknowledgementUrl.search = "";
  acknowledgementUrl.searchParams.set("recipientId", recipientId);
  acknowledgementUrl.hash = "";
  return acknowledgementUrl.toString();
}

function buildPayload(
  input: TeacherNoticeEmailInput,
  configuration: ResolvedConfiguration
): Record<"from" | "to" | "subject" | "text" | "html", string | string[]> {
  const reminder = localizedReminders[input.locale];
  const acknowledgementUrl = buildAcknowledgementUrl(
    configuration.baseOrigin,
    input.recipientId
  );
  return {
    from: configuration.from,
    to: [input.email],
    subject: reminder.subject,
    text: `${reminder.lead}\n\n${reminder.action}:\n${acknowledgementUrl}\n\n${reminder.safety}`,
    html: `<p>${escapeHtml(reminder.lead)}</p><p>${escapeHtml(reminder.action)}: <a href="${escapeHtml(acknowledgementUrl)}">${escapeHtml(reminder.action)}</a></p><p>${escapeHtml(reminder.safety)}</p>`
  };
}

function buildIdempotencyKey(input: TeacherNoticeEmailInput): string {
  const deliveryHash = createHash("sha256")
    .update(input.durableDeliveryKey)
    .update("\0")
    .update(input.recipientId)
    .update("\0")
    .update(input.contentRevision)
    .digest("hex");
  return `teacher-notice/${deliveryHash}`;
}

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Cancellation is best-effort and must not expose provider diagnostics.
  }
}

async function readBoundedProviderBody(
  response: Response,
  signal: AbortSignal
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  const contentLength = response.headers.get("Content-Length");
  if (contentLength && /^\d+$/u.test(contentLength)) {
    const declaredBytes = Number(contentLength);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes > maxProviderResponseBytes) {
      await cancelResponseBody(response);
      return { ok: false };
    }
  }

  if (!response.body) return { ok: true, value: null };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let serializedBody = "";
  const abortReader = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abortReader, { once: true });

  try {
    while (true) {
      const chunk = await reader.read();
      if (signal.aborted) throw new Error("delivery-aborted");
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > maxProviderResponseBytes) {
        await reader.cancel();
        return { ok: false };
      }
      serializedBody += decoder.decode(chunk.value, { stream: true });
    }
    serializedBody += decoder.decode();
  } finally {
    signal.removeEventListener("abort", abortReader);
    try {
      reader.releaseLock();
    } catch {
      // The stream may already be cancelled or errored.
    }
  }

  if (!serializedBody) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(serializedBody) as unknown };
  } catch {
    return { ok: false };
  }
}

function getProviderErrorName(value: unknown): ProviderErrorName | undefined {
  if (!isPlainObject(value) || typeof value.name !== "string") return undefined;
  return providerErrorNames.has(value.name as ProviderErrorName)
    ? (value.name as ProviderErrorName)
    : undefined;
}

function getProviderMessageId(value: unknown): string | undefined {
  if (!isPlainObject(value) || typeof value.id !== "string") return undefined;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value.id
    )
  ) {
    return undefined;
  }
  return value.id.toLowerCase();
}

function getRetryAfterSeconds(response: Response): number | undefined {
  const rawValue = response.headers.get("Retry-After")?.trim();
  if (!rawValue) return undefined;

  if (/^\d+(?:\.\d+)?$/u.test(rawValue)) {
    const seconds = Number(rawValue);
    if (!Number.isFinite(seconds) || seconds < 0) return undefined;
    return Math.min(Math.ceil(seconds), maxRetryAfterSeconds);
  }

  const retryAt = Date.parse(rawValue);
  if (Number.isNaN(retryAt)) return undefined;
  const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1_000));
  return Math.min(seconds, maxRetryAfterSeconds);
}

function classifyProviderFailure(
  response: Response,
  providerErrorName: ProviderErrorName | undefined
): TeacherNoticeEmailDeliveryResult {
  const httpStatus = response.status;
  const retryAfterSeconds = getRetryAfterSeconds(response);

  if (httpStatus === 409) {
    if (providerErrorName === "concurrent_idempotent_requests") {
      return baseResult("deferred", {
        errorCode: "concurrent-request",
        httpStatus,
        ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds })
      });
    }
    if (providerErrorName === "resource_locked") {
      return baseResult("deferred", {
        errorCode: "resource-locked",
        httpStatus,
        ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds })
      });
    }
    if (providerErrorName === "invalid_idempotent_request") {
      return baseResult("terminal-failure", {
        errorCode: "idempotency-conflict",
        httpStatus
      });
    }
    return baseResult("ambiguous", {
      errorCode: "provider-conflict",
      httpStatus
    });
  }

  if (httpStatus === 423 && providerErrorName === "resource_locked") {
    return baseResult("deferred", {
      errorCode: "resource-locked",
      httpStatus,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds })
    });
  }

  if (httpStatus === 429) {
    if (
      providerErrorName === "daily_quota_exceeded" ||
      providerErrorName === "monthly_quota_exceeded"
    ) {
      return baseResult("configuration-blocked", {
        errorCode: "provider-quota-exceeded",
        httpStatus
      });
    }
    return baseResult("deferred", {
      errorCode: "rate-limited",
      httpStatus,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds })
    });
  }

  if (httpStatus === 401) {
    return baseResult("configuration-blocked", {
      errorCode: "provider-authentication-failed",
      httpStatus
    });
  }

  if (httpStatus === 403) {
    if (
      providerErrorName === "validation_error" ||
      providerErrorName === "invalid_from_address" ||
      providerErrorName === "invalid_region"
    ) {
      return baseResult("configuration-blocked", {
        errorCode: "sender-configuration-invalid",
        httpStatus
      });
    }
    if (providerErrorName === "security_error") {
      return baseResult("configuration-blocked", {
        errorCode: "provider-security-block",
        httpStatus
      });
    }
    if (
      providerErrorName === "restricted_api_key" ||
      providerErrorName === "invalid_access" ||
      providerErrorName === "suspended_api_key"
    ) {
      return baseResult("configuration-blocked", {
        errorCode: "provider-authentication-failed",
        httpStatus
      });
    }
    if (providerErrorName === "invalid_permission") {
      return baseResult("configuration-blocked", {
        errorCode: "provider-permission-denied",
        httpStatus
      });
    }
    return baseResult("configuration-blocked", {
      errorCode: "provider-permission-denied",
      httpStatus
    });
  }

  if (httpStatus === 451) {
    return baseResult("configuration-blocked", {
      errorCode: "provider-security-block",
      httpStatus
    });
  }

  if (httpStatus === 422 && providerErrorName === "invalid_from_address") {
    return baseResult("configuration-blocked", {
      errorCode: "sender-configuration-invalid",
      httpStatus
    });
  }

  if (httpStatus === 408 || httpStatus === 425 || httpStatus >= 500) {
    return baseResult("ambiguous", {
      errorCode: "provider-unavailable",
      httpStatus,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds })
    });
  }

  if (httpStatus === 400 || httpStatus === 422) {
    return baseResult("terminal-failure", {
      errorCode: "invalid-request",
      httpStatus
    });
  }

  return baseResult("terminal-failure", {
    errorCode: "provider-rejected",
    httpStatus
  });
}

export async function deliverTeacherNoticeEmail(
  input: TeacherNoticeEmailInput,
  { env = process.env, fetchImpl = fetch }: TeacherNoticeEmailDeliveryOptions = {}
): Promise<TeacherNoticeEmailDeliveryResult> {
  if (env.TEACHER_NOTICE_EMAIL_ENABLED !== "true") {
    return baseResult("disabled");
  }

  const configurationResolution = resolveConfiguration(env);
  if (!configurationResolution.ok) return configurationResolution.result;
  if (!isValidDeliveryInput(input)) {
    return baseResult("terminal-failure", { errorCode: "invalid-input" });
  }

  const { configuration } = configurationResolution;
  const payload = buildPayload(input, configuration);
  const serializedPayload = JSON.stringify(payload);
  const abortController = new AbortController();
  let didTimeOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      didTimeOut = true;
      abortController.abort();
      reject(new Error("teacher-notice-delivery-timeout"));
    }, configuration.timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchImpl(resendEmailEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configuration.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": buildIdempotencyKey(input),
          "User-Agent": resendUserAgent
        },
        body: serializedPayload,
        signal: abortController.signal
      }),
      timeout
    ]);

    const providerBody = await Promise.race([
      readBoundedProviderBody(response, abortController.signal),
      timeout
    ]);

    if (!providerBody.ok) {
      if (response.ok) {
        return baseResult("ambiguous", {
          errorCode: "invalid-response",
          httpStatus: response.status
        });
      }
      return classifyProviderFailure(response, undefined);
    }

    if (!response.ok) {
      return classifyProviderFailure(response, getProviderErrorName(providerBody.value));
    }

    const messageId = getProviderMessageId(providerBody.value);
    if (!messageId) {
      return baseResult("ambiguous", {
        errorCode: "invalid-response",
        httpStatus: response.status
      });
    }

    return baseResult("accepted", { providerMessageId: messageId });
  } catch {
    return didTimeOut || abortController.signal.aborted
      ? baseResult("ambiguous", { errorCode: "timeout" })
      : baseResult("ambiguous", { errorCode: "transport-error" });
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
