import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import {
  authRateLimitRules,
  consumeAuthRateLimit,
  withAuthRouteJsonBoundary
} from "@/lib/server/authRouteGuards";
import { changeAuthenticatedUserPassword } from "@/lib/server/userStore/auth";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  return withAuthRouteJsonBoundary("auth-password-change", () => handlePasswordChange(request));
}

async function handlePasswordChange(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null) as unknown;
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const password = typeof body.password === "string" ? body.password : "";
  const ipRateLimit = consumeAuthRateLimit({
    request,
    scope: "password-change-ip",
    rule: authRateLimitRules.passwordChangeIp
  });
  if (ipRateLimit) return ipRateLimit;

  const userRateLimit = consumeAuthRateLimit({
    request,
    scope: "password-change-user",
    subject: authenticated.user.id,
    rule: authRateLimitRules.passwordChangeUser
  });
  if (userRateLimit) return userRateLimit;

  const result = await changeAuthenticatedUserPassword({
    userId: authenticated.user.id,
    currentPassword,
    password
  });

  if (result.status !== "updated") {
    return NextResponse.json({ error: "Current password is invalid or the new password is too short." }, { status: 400 });
  }

  return NextResponse.json(result.session);
}
