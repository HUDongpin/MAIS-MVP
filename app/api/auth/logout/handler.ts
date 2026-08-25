import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/session";
import {
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";
import { sessionCookieOptions } from "@/lib/server/sessionCookie";

type LogoutHandlerDependencies = {
  requireAuthenticatedUser: typeof requireAuthenticatedUser;
};

export function createLogoutHandler({
  requireAuthenticatedUser: authenticate = requireAuthenticatedUser
}: Partial<LogoutHandlerDependencies> = {}) {
  return async function handleLogoutRequest(request: Request) {
    const authenticated = await authenticate(request);
    if (authenticated) {
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
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...sessionCookieOptions(request, 0)
    });

    return response;
  };
}

export const handleLogout = createLogoutHandler();
