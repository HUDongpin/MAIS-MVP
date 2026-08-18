import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { captureServerError } from "@/lib/server/errorMonitor";
import { consumeInMemoryRateLimit } from "@/lib/server/rateLimit";

type RateLimitRule = {
  max: number;
  windowMs: number;
};

type RateLimitScope =
  | "login-ip"
  | "login-identifier"
  | "register-ip"
  | "password-reset-ip"
  | "password-reset-identifier"
  | "password-reset-confirm-ip"
  | "password-reset-confirm-token"
  | "password-change-ip"
  | "password-change-user"
  | "funnel-ip";

/**
 * Production ceiling for per-identifier login attempts. This is the brute-force control: 12
 * attempts per identifier per 15 minutes. Do not change it to accommodate a test suite.
 */
export const defaultLoginIdentifierMax = 12;

/**
 * The e2e suite drives ~20 logins across four shared demo identifiers in one run, and Playwright
 * retries multiply that, so it trips this limit and every later login 429s — which surfaces as
 * "auth routing is broken" rather than as rate limiting (see D-11 in coordination/ff-ledger.md).
 *
 * `HK_MATH_E2E_LOGIN_IDENTIFIER_MAX` raises the ceiling for that run only. It is set in
 * `playwright.config.ts`'s webServer env alongside the existing `AI_TUTOR_MAX_REQUESTS_PER_MINUTE`
 * test knob, and nowhere else.
 *
 * Safety properties, all covered by authRouteGuards.test.ts:
 *   - absent, empty, non-numeric, zero or negative -> the production default, unchanged
 *   - it can only ever RAISE the ceiling, never lower it below the production default
 * The e2e webServer cannot reach a real datastore, so a raised ceiling there protects nothing
 * real; a deployment that never sets the variable is bit-for-bit unaffected.
 */
export function loginIdentifierMaxFromEnv(
  env: Record<string, string | undefined> = process.env,
  fallback: number = defaultLoginIdentifierMax
) {
  const parsed = Number.parseInt(env.HK_MATH_E2E_LOGIN_IDENTIFIER_MAX ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.max(parsed, fallback);
}

export const authRateLimitRules = {
  loginIp: { max: 300, windowMs: 15 * 60 * 1000 },
  loginIdentifier: { max: loginIdentifierMaxFromEnv(), windowMs: 15 * 60 * 1000 },
  registerIp: { max: 240, windowMs: 15 * 60 * 1000 },
  passwordResetIp: { max: 60, windowMs: 15 * 60 * 1000 },
  passwordResetIdentifier: { max: 5, windowMs: 15 * 60 * 1000 },
  passwordResetConfirmIp: { max: 40, windowMs: 15 * 60 * 1000 },
  passwordResetConfirmToken: { max: 8, windowMs: 15 * 60 * 1000 },
  passwordChangeIp: { max: 80, windowMs: 15 * 60 * 1000 },
  passwordChangeUser: { max: 8, windowMs: 15 * 60 * 1000 },
  funnelIp: { max: 600, windowMs: 15 * 60 * 1000 }
} satisfies Record<string, RateLimitRule>;

function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function clientIpForRequest(request: Request) {
  return (
    firstForwardedIp(request.headers.get("x-forwarded-for")) ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function rateLimitKey(scope: RateLimitScope, request: Request, subject = "") {
  const ipHash = hashKey(clientIpForRequest(request));
  const subjectHash = subject ? `:${hashKey(subject.toLowerCase().trim())}` : "";
  return `auth:${scope}:${ipHash}${subjectHash}`;
}

export function authRateLimitResponse(retryAfterSeconds: number, rule: RateLimitRule, resetAt: number) {
  const response = NextResponse.json(
    {
      code: "rate-limited",
      error: "Too many attempts. Please wait and try again."
    },
    { status: 429 }
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  response.headers.set("RateLimit-Limit", String(rule.max));
  response.headers.set("RateLimit-Remaining", "0");
  response.headers.set("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function consumeAuthRateLimit({
  request,
  scope,
  subject,
  rule
}: {
  request: Request;
  scope: RateLimitScope;
  subject?: string;
  rule: RateLimitRule;
}) {
  const result = consumeInMemoryRateLimit(rateLimitKey(scope, request, subject), rule);
  if (result.allowed) return null;

  return authRateLimitResponse(result.retryAfterSeconds, rule, result.resetAt);
}

function authFailureKind(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = typeof (error as { code?: unknown } | null)?.code === "string"
    ? (error as { code: string }).code
    : "";
  if (message.includes("data transfer quota")) return "postgres-quota";
  if (code === "CONNECT_TIMEOUT" || message.includes("CONNECT_TIMEOUT")) return "postgres-connect-timeout";
  if (code.startsWith("ECONN") || message.includes("ECONN")) return "postgres-connection";
  if (message.includes("POSTGRES_URL is required")) return "postgres-url-missing";
  if (message.includes("AUTH_SESSION_SECRET") || message.includes("NEXTAUTH_SECRET")) return "session-secret-missing";
  return "unclassified";
}

export async function withAuthRouteJsonBoundary(routeName: string, action: () => Promise<NextResponse>) {
  try {
    const response = await action();
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const kind = authFailureKind(error);
    console.error("Auth route failed", {
      route: routeName,
      error: error instanceof Error ? error.name : "UnknownError",
      kind
    });
    // Production error monitoring. Fire-and-forget and PII-scrubbed: see lib/server/errorMonitor.ts.
    captureServerError(error, { scope: "auth-route", route: routeName, kind, status: 503 });
    const response = NextResponse.json(
      {
        code: "auth-service-unavailable",
        error: "Authentication service is temporarily unavailable. Please try again."
      },
      { status: 503 }
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
