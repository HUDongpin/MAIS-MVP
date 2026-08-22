import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import {
  authRateLimitRules,
  consumeAuthRateLimit
} from "@/lib/server/authRouteGuards";
import { sessionCookieFailureResponse, setSessionCookie } from "@/lib/server/sessionCookie";
import { changeAuthenticatedUserPassword } from "@/lib/server/userStore/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type PasswordChangeHandlerDependencies = {
  requireAuthenticatedUser: typeof requireAuthenticatedUser;
  changeAuthenticatedUserPassword: typeof changeAuthenticatedUserPassword;
  setSessionCookie: typeof setSessionCookie;
};

export function createPasswordChangeHandler({
  requireAuthenticatedUser: authenticate = requireAuthenticatedUser,
  changeAuthenticatedUserPassword: changePassword = changeAuthenticatedUserPassword,
  setSessionCookie: writeSessionCookie = setSessionCookie
}: Partial<PasswordChangeHandlerDependencies> = {}) {
  return async function handlePasswordChangeRequest(request: Request) {
    const authenticated = await authenticate(request);
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

    const result = await changePassword({
      userId: authenticated.user.id,
      currentPassword,
      password
    });

    if (result.status !== "updated") {
      return NextResponse.json({ error: "Current password is invalid or the new password is too short." }, { status: 400 });
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

export const handlePasswordChange = createPasswordChangeHandler();
