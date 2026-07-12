import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { sessionCookieOptions } from "@/lib/server/sessionCookie";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAuthRouteJsonBoundary("auth-logout", () => handleLogout(request));
}

async function handleLogout(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(request, 0)
  });

  return response;
}
