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

export async function setSessionCookie(response: NextResponse, userId: string, request: Request) {
  response.cookies.set(SESSION_COOKIE_NAME, await createSessionToken(userId), {
    ...sessionCookieOptions(request, SESSION_MAX_AGE_SECONDS)
  });
}
