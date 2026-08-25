import { NextResponse } from "next/server";
import {
  bodyExpectedUserConstraints,
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";
import {
  authRateLimitRules,
  consumeAuthRateLimit
} from "@/lib/server/authRouteGuards";
import { sessionCookieFailureResponse, setSessionCookie } from "@/lib/server/sessionCookie";
import { changeAuthenticatedUserPassword } from "@/lib/server/userStore/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nextResponseFromExpectedUserConflict(response: Response) {
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers
  });
}

type PasswordChangeHandlerDependencies = {
  requireAuthenticatedUser: typeof requireAuthenticatedUser;
  consumeAuthRateLimit: typeof consumeAuthRateLimit;
  changeAuthenticatedUserPassword: typeof changeAuthenticatedUserPassword;
  setSessionCookie: typeof setSessionCookie;
};

export function createPasswordChangeHandler({
  requireAuthenticatedUser: authenticate = requireAuthenticatedUser,
  consumeAuthRateLimit: checkAuthRateLimit = consumeAuthRateLimit,
  changeAuthenticatedUserPassword: changePassword = changeAuthenticatedUserPassword,
  setSessionCookie: writeSessionCookie = setSessionCookie
}: Partial<PasswordChangeHandlerDependencies> = {}) {
  return async function handlePasswordChangeRequest(request: Request) {
    const authenticated = await authenticate(request);
    if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const transportExpectedUserConflict = guardExpectedAuthenticatedUser(
      authenticated,
      expectedUserConstraintsFromRequest(request)
    );
    if (transportExpectedUserConflict) {
      return nextResponseFromExpectedUserConflict(transportExpectedUserConflict);
    }

    const body = await request.json().catch(() => null) as unknown;
    const expectedUserConflict = guardExpectedAuthenticatedUser(
      authenticated,
      [
        ...expectedUserConstraintsFromRequest(request),
        ...bodyExpectedUserConstraints(body)
      ],
      { requireConstraint: true }
    );
    if (expectedUserConflict) return nextResponseFromExpectedUserConflict(expectedUserConflict);

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
    }

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const password = typeof body.password === "string" ? body.password : "";
    const ipRateLimit = checkAuthRateLimit({
      request,
      scope: "password-change-ip",
      rule: authRateLimitRules.passwordChangeIp
    });
    if (ipRateLimit) return ipRateLimit;

    const userRateLimit = checkAuthRateLimit({
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
