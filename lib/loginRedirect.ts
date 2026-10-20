/**
 * Post-login redirect targets.
 *
 * Extracted verbatim from `app/login/page.tsx` so the logic can be tested by
 * calling it. `lib/loginRedirect.test.ts` previously asserted regexes against
 * the page's *source text*, which both broke on harmless renames and could pass
 * while the stated property was false — and, because nothing in CI ran it, it
 * had been red since `2ae49925` without anyone noticing.
 *
 * The extraction itself was behaviour-preserving, including the open-redirect
 * bypass it inherited; closing that bypass is the one deliberate behaviour
 * change since, and `lib/safeRedirectPath.ts` carries the full account of it.
 * Both guards below now resolve the requested path with the URL parser before
 * the role filter runs, so the filter sees the path that will actually open.
 */

import { sameOriginPath } from "@/lib/safeRedirectPath";

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
 * Two independent filters, in this order:
 *
 *   1. `sameOriginPath` rejects anything that is not an in-app path. This is
 *      the security boundary: `window.location.replace` will follow
 *      `/\evil.example` off-origin, and only the URL parser can tell that it
 *      does.
 *   2. The per-role prefix filter keeps a teacher URL from opening on a student
 *      session and vice versa. It is a product rule, not an off-origin defence
 *      — it covered the backslash case for teachers and parents only because
 *      `/\evil.example` does not start with `/teacher` or `/parent`. Students
 *      got no such accidental cover: their branch accepts any path that is not
 *      a teacher or parent route, so for them the bypass was wide open.
 */
export function safeWorkspaceTarget(value: string | null, role?: LoginRole) {
  const target = sameOriginPath(value);
  if (!target) return workspaceForRole(role);
  if (role === "teacher" || role === "admin") {
    return nextPathStartsWith(target, "/teacher") ? target : workspaceForRole(role);
  }
  if (role === "parent") return nextPathStartsWith(target, "/parent") ? target : workspaceForRole(role);
  if (role === "student" && (nextPathStartsWith(target, "/teacher") || nextPathStartsWith(target, "/parent"))) {
    return workspaceForRole(role);
  }
  return target;
}

/**
 * Resolves the `?next=` target `/change-password` should land on once the
 * temporary password has been replaced.
 *
 * The login page builds that link as
 * `/change-password?next=<already-sanitized target>`, but the page is reachable
 * directly with any `next` at all, so it validates its own input rather than
 * trusting the referring flow. It deliberately keeps the shape it had in
 * `app/change-password/page.tsx`: no per-role prefix filter (the role is only
 * known from the password-change response, and the page is a dead end for every
 * role), plus a refusal to bounce back to `/login`, which would send a user who
 * has just set a password back to the form they came from.
 */
export function safeChangePasswordTarget(value: string | null, role?: LoginRole) {
  const target = sameOriginPath(value);
  if (!target || target.startsWith("/login")) return workspaceForRole(role);
  return target;
}
