/**
 * Post-login redirect targets.
 *
 * Extracted verbatim from `app/login/page.tsx` so the logic can be tested by
 * calling it. `lib/loginRedirect.test.ts` previously asserted regexes against
 * the page's *source text*, which both broke on harmless renames and could pass
 * while the stated property was false — and, because nothing in CI ran it, it
 * had been red since `2ae49925` without anyone noticing.
 *
 * Behaviour here is intentionally identical to what the page did before the
 * extraction; this is a testability change, not a behaviour change.
 */

export type LoginRole = "student" | "teacher" | "parent" | "admin";

export const studentWorkspacePath = "/dashboard";
export const teacherWorkspacePath = "/teacher/dashboard";
export const parentWorkspacePath = "/parent";

export function workspaceForRole(role?: LoginRole) {
  if (role === "teacher" || role === "admin") return teacherWorkspacePath;
  if (role === "parent") return parentWorkspacePath;
  return studentWorkspacePath;
}

export function nextPathStartsWith(value: string, root: string) {
  return value === root || value.startsWith(`${root}/`);
}

/**
 * Resolves the `?next=` target a successful login should land on, falling back
 * to the role's own workspace whenever the request asks for somewhere that role
 * may not open.
 *
 * SECURITY: the off-origin guard below rejects `//evil.com` but NOT
 * `/\evil.com`. For http(s) URLs the WHATWG URL parser treats a backslash as
 * equivalent to a forward slash in the authority position, so `/\evil.com`
 * resolves to `https://evil.com/` — an open redirect for the student branch,
 * which returns `value` unchanged. The teacher and parent branches happen to be
 * protected because their prefix checks fail. The durable fix is to stop
 * pattern-matching the string and let the URL parser decide:
 *
 *     const base = "https://mais.invalid";
 *     const resolved = new URL(value, base);
 *     if (resolved.origin !== base) return workspaceForRole(role);
 *
 * That is deliberately NOT applied here: this extraction is behaviour-preserving
 * so it can land as a reviewable no-op, and the redirect fix belongs in its own
 * change with the other three call sites
 * (`app/api/auth/google/callback/handler.ts`, `lib/server/googleOAuth.ts`,
 * `app/change-password/page.tsx`). `loginRedirect.test.ts` pins the current
 * behaviour, including the bypass, so that fix flips those cases deliberately
 * rather than by accident.
 */
export function safeWorkspaceTarget(value: string | null, role?: LoginRole) {
  if (!value?.startsWith("/") || value.startsWith("//")) return workspaceForRole(role);
  if (role === "teacher" || role === "admin") {
    return nextPathStartsWith(value, "/teacher") ? value : workspaceForRole(role);
  }
  if (role === "parent") return nextPathStartsWith(value, "/parent") ? value : workspaceForRole(role);
  if (role === "student" && (nextPathStartsWith(value, "/teacher") || nextPathStartsWith(value, "/parent"))) {
    return workspaceForRole(role);
  }
  return value;
}
