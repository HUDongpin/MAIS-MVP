import { NextResponse } from "next/server";
import {
  isPasswordResetDeliveryConfigured,
  sendPasswordResetLink
} from "@/lib/server/passwordResetDelivery";
import { handlePasswordResetRequest } from "@/lib/server/passwordResetRequest";
import {
  authRateLimitRules,
  consumeAuthRateLimit,
  withAuthRouteJsonBoundary
} from "@/lib/server/authRouteGuards";
import { createPasswordResetRequest } from "@/lib/server/userStore/auth";

export const runtime = "nodejs";

const exposeLocalResetLinks =
  process.env.NODE_ENV !== "production" || process.env.HK_MATH_EXPOSE_LOCAL_RESET_LINKS === "true";

export async function POST(request: Request) {
  return withAuthRouteJsonBoundary("auth-password-reset-request", () => handlePasswordResetRequestRoute(request));
}

async function handlePasswordResetRequestRoute(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const identifier = typeof (body as { identifier?: unknown } | null)?.identifier === "string"
    ? (body as { identifier: string }).identifier.trim()
    : "";
  const ipRateLimit = consumeAuthRateLimit({
    request,
    scope: "password-reset-ip",
    rule: authRateLimitRules.passwordResetIp
  });
  if (ipRateLimit) return ipRateLimit;

  if (identifier) {
    const identifierRateLimit = consumeAuthRateLimit({
      request,
      scope: "password-reset-identifier",
      subject: identifier,
      rule: authRateLimitRules.passwordResetIdentifier
    });
    if (identifierRateLimit) return identifierRateLimit;
  }

  const result = await handlePasswordResetRequest({
    body,
    deliveryConfigured: isPasswordResetDeliveryConfigured(),
    exposeLocalResetLinks,
    requestUrl: request.url,
    createResetRequest: createPasswordResetRequest,
    sendResetLink: sendPasswordResetLink
  });

  return NextResponse.json(result.body, { status: result.status });
}
