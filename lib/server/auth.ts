import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { getAuthenticatedUserById } from "@/lib/server/userStore/auth";
import type { StudentSession } from "@/types";

function readCookie(header: string | null, name: string) {
  if (!header) return null;

  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function requireAuthenticatedUser(request: Request) {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  return getAuthenticatedUserFromToken(token);
}

export async function getAuthenticatedUserFromToken(token?: string | null) {
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return getAuthenticatedUserById(payload.sub);
}

export function canAccessTeacherArea(user?: Pick<StudentSession, "role"> | null) {
  return user?.role === "teacher" || user?.role === "admin";
}

export function canAccessParentArea(user?: Pick<StudentSession, "role"> | null) {
  return user?.role === "parent" || user?.role === "admin";
}

export async function requireTeacherUser(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!canAccessTeacherArea(authenticated?.user)) return null;

  return authenticated;
}

export async function requireParentUser(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!canAccessParentArea(authenticated?.user)) return null;

  return authenticated;
}
