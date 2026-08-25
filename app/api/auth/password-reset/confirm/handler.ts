import { NextResponse } from "next/server";
import {
  authRateLimitRules,
  consumeAuthRateLimit
} from "@/lib/server/authRouteGuards";
import { sessionCookieFailureResponse, setSessionCookie } from "@/lib/server/sessionCookie";
import { resetUserPassword } from "@/lib/server/userStore/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type PasswordResetConfirmHandlerDependencies = {
  resetUserPassword: typeof resetUserPassword;
  setSessionCookie: typeof setSessionCookie;
};

export function createPasswordResetConfirmHandler({
  resetUserPassword: resetPassword = resetUserPassword,
  setSessionCookie: writeSessionCookie = setSessionCookie
}: Partial<PasswordResetConfirmHandlerDependencies> = {}) {
  return async function handlePasswordResetConfirmRequest(request: Request) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
    }

    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!token || password.length < 5) {
      return NextResponse.json({ error: "A reset token and a password of at least 5 characters are required." }, { status: 400 });
    }

    const ipRateLimit = consumeAuthRateLimit({
      request,
      scope: "password-reset-confirm-ip",
      rule: authRateLimitRules.passwordResetConfirmIp
    });
    if (ipRateLimit) return ipRateLimit;

    const tokenRateLimit = consumeAuthRateLimit({
      request,
      scope: "password-reset-confirm-token",
      subject: token,
      rule: authRateLimitRules.passwordResetConfirmToken
    });
    if (tokenRateLimit) return tokenRateLimit;

    const result = await resetPassword(token, password);
    if (result.status !== "reset") {
      return NextResponse.json({ error: "The reset link is invalid or expired." }, { status: 400 });
    }

    const response = NextResponse.json(result.session);
    try {
      await writeSessionCookie(response, result.session.user.id, request, result.sessionRevision);
    } catch (error) {
      return sessionCookieFailureResponse(error, request, { committedAction: "password-updated" });
    }

    return response;
  };
}

export const handlePasswordResetConfirm = createPasswordResetConfirmHandler();
