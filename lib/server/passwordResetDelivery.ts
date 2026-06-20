type PasswordResetDeliveryFetch = typeof fetch;

export type PasswordResetDeliveryChannel = "resend" | "webhook" | "none";
export type PasswordResetDeliveryStatus = "sent" | "failed" | "not-configured";

export type PasswordResetDeliveryResult = {
  status: PasswordResetDeliveryStatus;
  channel: PasswordResetDeliveryChannel;
  errorCode?: "http-error" | "request-failed" | "timeout";
  httpStatus?: number;
};

type PasswordResetDeliveryConfig =
  | {
      channel: "resend";
      apiKey: string;
      from: string;
      timeoutMs: number;
    }
  | {
      channel: "webhook";
      webhookUrl: string;
      timeoutMs: number;
    }
  | {
      channel: "none";
      timeoutMs: number;
    };

type PasswordResetDeliveryEnv = Record<string, string | undefined>;

const defaultDeliveryTimeoutMs = 12000;
const minDeliveryTimeoutMs = 1000;
const maxDeliveryTimeoutMs = 30000;
const passwordResetSubject = "MAIS Math Lab password reset";

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function cleanEnvValue(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function readPasswordResetDeliveryConfig(env: PasswordResetDeliveryEnv = process.env): PasswordResetDeliveryConfig {
  const timeoutMs = boundedNumber(
    env.PASSWORD_RESET_DELIVERY_TIMEOUT_MS,
    defaultDeliveryTimeoutMs,
    minDeliveryTimeoutMs,
    maxDeliveryTimeoutMs
  );
  const resendApiKey = cleanEnvValue(env.RESEND_API_KEY);
  const resendFrom = cleanEnvValue(env.PASSWORD_RESET_FROM);
  if (resendApiKey && resendFrom) {
    return {
      channel: "resend",
      apiKey: resendApiKey,
      from: resendFrom,
      timeoutMs
    };
  }

  const webhookUrl = cleanEnvValue(env.PASSWORD_RESET_WEBHOOK_URL);
  if (webhookUrl) {
    return {
      channel: "webhook",
      webhookUrl,
      timeoutMs
    };
  }

  return {
    channel: "none",
    timeoutMs
  };
}

export function isPasswordResetDeliveryConfigured(env: PasswordResetDeliveryEnv = process.env) {
  return readPasswordResetDeliveryConfig(env).channel !== "none";
}

function configuredBaseUrl(env: PasswordResetDeliveryEnv) {
  const candidate = cleanEnvValue(env.PASSWORD_RESET_BASE_URL);
  if (!candidate) return "";

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function buildPasswordResetUrl({
  requestUrl,
  token,
  env = process.env
}: {
  requestUrl: string;
  token: string;
  env?: PasswordResetDeliveryEnv;
}) {
  const origin = configuredBaseUrl(env) || new URL(requestUrl).origin;
  const resetUrl = new URL("/reset-password", origin);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}

function passwordResetText(resetUrl: string, expiresAt: string) {
  return [
    "A password reset was requested for your MAIS Math Lab account.",
    `Open this secure link to set a new password: ${resetUrl}`,
    `This link expires at ${expiresAt}.`,
    "If you did not request this, you can ignore this email."
  ].join("\n\n");
}

function passwordResetHtml(resetUrl: string, expiresAt: string) {
  const escapedResetUrl = resetUrl.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  const escapedExpiresAt = expiresAt.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return [
    "<p>A password reset was requested for your MAIS Math Lab account.</p>",
    `<p><a href="${escapedResetUrl}">Set a new password</a></p>`,
    `<p>This link expires at ${escapedExpiresAt}.</p>`,
    "<p>If you did not request this, you can ignore this email.</p>"
  ].join("");
}

async function withTimeout<T>(timeoutMs: number, action: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await action(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function requestFailureResult(config: PasswordResetDeliveryConfig, error: unknown): PasswordResetDeliveryResult {
  return {
    status: "failed",
    channel: config.channel,
    errorCode: error instanceof Error && error.name === "AbortError" ? "timeout" : "request-failed"
  };
}

export async function sendPasswordResetLink({
  to,
  resetUrl,
  expiresAt,
  env = process.env,
  fetchImpl = fetch
}: {
  to: string;
  resetUrl: string;
  expiresAt: string;
  env?: PasswordResetDeliveryEnv;
  fetchImpl?: PasswordResetDeliveryFetch;
}): Promise<PasswordResetDeliveryResult> {
  const config = readPasswordResetDeliveryConfig(env);
  if (config.channel === "none") {
    return { status: "not-configured", channel: "none" };
  }

  const subject = passwordResetSubject;
  const text = passwordResetText(resetUrl, expiresAt);
  const html = passwordResetHtml(resetUrl, expiresAt);

  if (config.channel === "resend") {
    try {
      const response = await withTimeout(config.timeoutMs, (signal) =>
        fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          signal,
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: config.from,
            to,
            subject,
            text,
            html
          })
        })
      );

      return response.ok
        ? { status: "sent", channel: "resend" }
        : { status: "failed", channel: "resend", errorCode: "http-error", httpStatus: response.status };
    } catch (error) {
      return requestFailureResult(config, error);
    }
  }

  try {
    const response = await withTimeout(config.timeoutMs, (signal) =>
      fetchImpl(config.webhookUrl, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "password_reset.requested",
          to,
          subject,
          text,
          html,
          resetUrl,
          expiresAt
        })
      })
    );

    return response.ok
      ? { status: "sent", channel: "webhook" }
      : { status: "failed", channel: "webhook", errorCode: "http-error", httpStatus: response.status };
  } catch (error) {
    return requestFailureResult(config, error);
  }
}
