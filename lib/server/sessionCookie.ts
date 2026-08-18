import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

export function sessionSecretMissingResponse() {
  return NextResponse.json(
    {
      code: "session-secret-missing",
      error: "AUTH_SESSION_SECRET or NEXTAUTH_SECRET is required before login sessions can be created."
    },
    { status: 503 }
  );
}

function shouldUseSecureCookie(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  return forwardedProto === "https" || new URL(request.url).protocol === "https:";
}

export function sessionCookieOptions(request: Request, maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: shouldUseSecureCookie(request)
  };
}

/**
 * Mints a session token bound to the subject's current password material, so the
 * token stops verifying the moment that password changes. Imported lazily because
 * this module is also pulled in by routes that only want `sessionCookieOptions`
 * (logout, for one) and have no business loading the user store.
 */
export async function createSessionTokenForUserId(userId: string) {
  const { getSessionCredentialTagById } = await import("@/lib/server/userStore/auth");
  return createSessionToken(userId, await getSessionCredentialTagById(userId));
}

export async function setSessionCookie(response: NextResponse, userId: string, request: Request) {
  response.cookies.set(SESSION_COOKIE_NAME, await createSessionTokenForUserId(userId), {
    ...sessionCookieOptions(request, SESSION_MAX_AGE_SECONDS)
  });
}
