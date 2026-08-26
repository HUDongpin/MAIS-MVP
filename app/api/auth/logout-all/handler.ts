import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/session";
import {
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";
import { sessionCookieOptions } from "@/lib/server/sessionCookie";
import { revokeAllUserSessions } from "@/lib/server/userStore/auth";

type LogoutAllHandlerDependencies = {
  requireAuthenticatedUser: typeof requireAuthenticatedUser;
  revokeAllUserSessions: typeof revokeAllUserSessions;
};

export function createLogoutAllHandler({
  requireAuthenticatedUser: authenticate = requireAuthenticatedUser,
  revokeAllUserSessions: revokeSessions = revokeAllUserSessions
}: Partial<LogoutAllHandlerDependencies> = {}) {
  return async function handleLogoutAllRequest(request: Request) {
    const authenticated = await authenticate(request);
    if (!authenticated) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const expectedUserConflict = guardExpectedAuthenticatedUser(
      authenticated,
      expectedUserConstraintsFromRequest(request),
      { requireConstraint: true }
    );
    if (expectedUserConflict) {
      return new NextResponse(expectedUserConflict.body, {
        status: expectedUserConflict.status,
        headers: expectedUserConflict.headers
      });
    }

    const revoked = await revokeSessions(authenticated.user.id);
    if (revoked.status !== "revoked") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...sessionCookieOptions(request, 0)
    });
    return response;
  };
}

export const handleLogoutAll = createLogoutAllHandler();
