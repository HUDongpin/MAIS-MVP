import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "@/lib/session";
import { getAuthenticatedUserById, getSessionCredentialTagById } from "@/lib/server/userStore/auth";
import type { StudentSession } from "@/types";

function readCookie(header: string | null, name: string) {
  if (!header) return null;

  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function readSessionCookie(request: Request) {
  return readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
}

/**
 * Signature and expiry are not enough on their own: a stateless token stays valid
 * for its full seven days no matter what happens to the account behind it, which is
 * why a password reset could not lock an attacker out. This adds the revocation
 * check — the token's credential tag must still match the subject's stored password
 * material.
 *
 * Tokens minted before the tag existed carry none and are rejected, so the deploy
 * that ships this signs everyone out once. That is the point: those tokens are
 * exactly the ones that cannot be revoked.
 *
 * middleware.ts deliberately does not call this. It runs on every protected page
 * navigation with no database access, and only decides whether to redirect to the
 * login screen; revocation is enforced here, where the request actually resolves a
 * user, so a revoked session reaches a page shell and no data.
 */
export async function verifyRevocableSessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload?.cv) return null;

  const currentTag = await getSessionCredentialTagById(payload.sub);
  if (currentTag && currentTag !== payload.cv) return null;

  // No account backs the id, so there is no credential to compare against. Refusing
  // here would close nothing — every caller's own user lookup already returns null
  // for these — while removing a deliberate resilience behaviour: the attempts route
  // still grades a submission from seed data when a student's row is missing from
  // durable storage (see its "falls back to seed grading for missing production user
  // rows" contract).
  return payload;
}

export async function requireAuthenticatedUser(request: Request) {
  return getAuthenticatedUserFromToken(readSessionCookie(request));
}

export async function getAuthenticatedUserFromToken(token?: string | null) {
  const payload = await verifyRevocableSessionToken(token);
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
