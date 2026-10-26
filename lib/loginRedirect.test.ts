import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  nextPathStartsWith,
  parentWorkspacePath,
  safeChangePasswordTarget,
  safeWorkspaceTarget,
  studentWorkspacePath,
  teacherWorkspacePath,
  workspaceForRole
} from "@/lib/loginRedirect";

/**
 * This file used to assert regexes against `app/login/page.tsx`'s source text.
 * That had two failure modes, both of which actually bit:
 *
 *   - It broke on harmless renames. `californiaGradeAware.test.ts` went red
 *     purely because a constant was renamed, with no behaviour change.
 *   - It could pass while asserting the opposite of the truth. The old test
 *     "successful login uses client-side dashboard routing instead of a full
 *     document reload" only forbade `window.location.assign(` and required
 *     `router.replace(` to appear *somewhere* in a 3,000-line file.
 *
 * Commit 2ae49925 ("fix(auth): quarantine stale account documents") then
 * deliberately replaced `router.replace` with `window.location.replace` and
 * dropped `useRouter`, which is the correct mechanism for that fix: a full
 * document navigation discards the client React tree and router cache, so no
 * stale account data survives a login. The old test asserted the pre-2ae49925
 * behaviour and had been red ever since, unnoticed, because no npm script or
 * workflow ran this file.
 *
 * The logic now lives in `lib/loginRedirect.ts` and is tested by calling it.
 * The one source-text assertion that remains is the kind that check is actually
 * suited to: an architectural constraint about which navigation primitive the
 * login page is allowed to use.
 */

const roles = ["student", "teacher", "parent", "admin"] as const;

/**
 * The spellings of "leave the app" that reach a redirect sink. `offOriginNext`
 * is the subset the old `startsWith("/") && !startsWith("//")` check let
 * through or caught by accident; `lib/safeRedirectPath.test.ts` owns the wider
 * matrix and the proof that each one resolves off-origin in a browser.
 */
const offOriginNext = [
  "//evil.example",
  "//evil.example/path",
  "///evil.example",
  "/\\evil.example",
  "/\\evil.example/path",
  "/\\\\evil.example",
  "/\\/evil.example",
  "/\t/evil.example",
  "https://evil.example",
  "http://evil.example/path",
  "\\\\evil.example",
  "javascript:alert(document.domain)"
] as const;

test("each role lands on its own workspace", () => {
  assert.equal(workspaceForRole("student"), studentWorkspacePath);
  assert.equal(workspaceForRole("teacher"), teacherWorkspacePath);
  assert.equal(workspaceForRole("admin"), teacherWorkspacePath);
  assert.equal(workspaceForRole("parent"), parentWorkspacePath);
});

test("an unknown or absent role defaults to the student workspace", () => {
  assert.equal(workspaceForRole(undefined), studentWorkspacePath);
  assert.equal(workspaceForRole(), studentWorkspacePath);
});

test("student login defaults to the dashboard, not the lesson entry route", () => {
  // Regression: the student default briefly pointed at /student/lessons, which
  // dropped students into lesson content instead of their workspace.
  assert.equal(workspaceForRole("student"), "/dashboard");
  assert.notEqual(workspaceForRole("student"), "/student/lessons");
});

test("prefix matching requires a full path segment", () => {
  assert.equal(nextPathStartsWith("/teacher", "/teacher"), true);
  assert.equal(nextPathStartsWith("/teacher/dashboard", "/teacher"), true);
  // Must not match a different route that merely shares a prefix.
  assert.equal(nextPathStartsWith("/teacherly", "/teacher"), false);
  assert.equal(nextPathStartsWith("/teachers/1", "/teacher"), false);
});

test("a missing or relative next target falls back to the role workspace", () => {
  for (const value of [null, "", "dashboard", "./dashboard", "../admin"]) {
    assert.equal(safeWorkspaceTarget(value, "student"), studentWorkspacePath);
    assert.equal(safeWorkspaceTarget(value, "teacher"), teacherWorkspacePath);
    assert.equal(safeWorkspaceTarget(value, "parent"), parentWorkspacePath);
  }
});

test("an off-origin next target is rejected for every role", () => {
  for (const role of roles) {
    for (const value of offOriginNext) {
      assert.equal(
        safeWorkspaceTarget(value, role),
        workspaceForRole(role),
        `${role} <- ${JSON.stringify(value)}`
      );
    }
  }
  // Also with no role at all, which is the student fallback.
  for (const value of offOriginNext) {
    assert.equal(safeWorkspaceTarget(value, undefined), studentWorkspacePath, JSON.stringify(value));
  }
});

test("the role filter sees the normalized path, not the requested spelling", () => {
  // `/teacher/../admin` used to pass the `/teacher` prefix filter and then open
  // `/admin`, because the sink resolves the dot segments after the filter has
  // run. The guard now filters the path that will actually open.
  assert.equal(safeWorkspaceTarget("/teacher/../admin", "teacher"), teacherWorkspacePath);
  assert.equal(safeWorkspaceTarget("/parent/../progress", "parent"), parentWorkspacePath);
  assert.equal(safeWorkspaceTarget("/progress/../teacher/gradebook", "student"), studentWorkspacePath);
  assert.equal(safeWorkspaceTarget("/teacher/./gradebook", "teacher"), "/teacher/gradebook");
});

test("a percent-encoded separator stays an in-app path", () => {
  // `/%5Cevil.example` is one path segment in every sink, not an authority, so
  // it is kept — and the role filter still applies to it.
  assert.equal(safeWorkspaceTarget("/%5Cevil.example", "student"), "/%5Cevil.example");
  assert.equal(safeWorkspaceTarget("/%2F%2Fevil.example", "student"), "/%2F%2Fevil.example");
  assert.equal(safeWorkspaceTarget("/%5Cevil.example", "teacher"), teacherWorkspacePath);
  assert.equal(safeWorkspaceTarget("/%5Cevil.example", "parent"), parentWorkspacePath);
});

test("next targets are filtered by authenticated role", () => {
  // A teacher URL must never open on a student session, and vice versa.
  assert.equal(safeWorkspaceTarget("/teacher/gradebook", "teacher"), "/teacher/gradebook");
  assert.equal(safeWorkspaceTarget("/teacher/gradebook", "admin"), "/teacher/gradebook");
  assert.equal(safeWorkspaceTarget("/teacher/gradebook", "student"), studentWorkspacePath);
  assert.equal(safeWorkspaceTarget("/teacher/gradebook", "parent"), parentWorkspacePath);

  assert.equal(safeWorkspaceTarget("/parent/reports", "parent"), "/parent/reports");
  assert.equal(safeWorkspaceTarget("/parent/reports", "student"), studentWorkspacePath);

  // A teacher asking for a student route gets their own workspace instead.
  assert.equal(safeWorkspaceTarget("/progress", "teacher"), teacherWorkspacePath);
  assert.equal(safeWorkspaceTarget("/progress", "student"), "/progress");
});

test("a same-origin student route is preserved", () => {
  for (const value of ["/progress", "/mistake-book", "/dashboard", "/student/lessons/fractions"]) {
    assert.equal(safeWorkspaceTarget(value, "student"), value);
  }
});

test("a query string and fragment survive on an allowed target", () => {
  assert.equal(
    safeWorkspaceTarget("/teacher/gradebook?classId=c1#top", "teacher"),
    "/teacher/gradebook?classId=c1#top"
  );
});

/**
 * This case used to be pinned the other way round, asserting that
 * `/\evil.example` was returned to a student unchanged, so that closing the
 * bypass would be a deliberate flip of a named test rather than a quiet side
 * effect of some refactor. This is that flip.
 *
 * For http(s) URLs the WHATWG parser treats `\` like `/` in the authority
 * position, so `/\evil.example` resolved to `https://evil.example/` once the
 * page handed it to `window.location.replace` — reached straight after a
 * genuine successful login. Students took the full force of it, because their
 * branch returned the requested path; teachers and parents were covered only
 * because that path does not start with their prefix.
 */
test("a backslash next target is rejected for every role, students included", () => {
  assert.equal(safeWorkspaceTarget("/\\evil.example", "student"), studentWorkspacePath);
  assert.equal(safeWorkspaceTarget("/\\evil.example/path", "student"), studentWorkspacePath);
  assert.equal(safeWorkspaceTarget("/\\evil.example", "teacher"), teacherWorkspacePath);
  assert.equal(safeWorkspaceTarget("/\\evil.example", "parent"), parentWorkspacePath);
  assert.equal(safeWorkspaceTarget("/\\evil.example", "admin"), teacherWorkspacePath);

  // Not protection by prefix: a backslash target that *does* start with an
  // allowed prefix is still off-origin, and still rejected.
  assert.equal(safeWorkspaceTarget("/\\evil.example/teacher", "teacher"), teacherWorkspacePath);
  assert.equal(safeWorkspaceTarget("/\\evil.example/parent", "parent"), parentWorkspacePath);
});

/**
 * `/change-password` validates its own `?next=`. The login page builds that
 * link with an already-sanitized target, but the page is reachable directly
 * with any `next` at all, and the router push there is as much a redirect sink
 * as the login one.
 */
test("the change-password target rejects every off-origin next, for every role", () => {
  for (const role of roles) {
    for (const value of offOriginNext) {
      assert.equal(
        safeChangePasswordTarget(value, role),
        workspaceForRole(role),
        `${role} <- ${JSON.stringify(value)}`
      );
    }
    assert.equal(safeChangePasswordTarget(null, role), workspaceForRole(role));
    assert.equal(safeChangePasswordTarget("", role), workspaceForRole(role));
    assert.equal(safeChangePasswordTarget("dashboard", role), workspaceForRole(role));
  }
});

test("the change-password target does not bounce back to the login form", () => {
  // Someone who has just set a password must not be returned to /login.
  assert.equal(safeChangePasswordTarget("/login", "student"), studentWorkspacePath);
  assert.equal(safeChangePasswordTarget("/login?next=/dashboard", "teacher"), teacherWorkspacePath);
  assert.equal(safeChangePasswordTarget("/dashboard/../login", "parent"), parentWorkspacePath);
});

test("the change-password target keeps an in-app path for any role", () => {
  // No per-role prefix filter here, by design: the role is only known from the
  // password-change response, and the page is a dead end for every role.
  assert.equal(safeChangePasswordTarget("/teacher/gradebook", "teacher"), "/teacher/gradebook");
  assert.equal(safeChangePasswordTarget("/progress?tab=week#top", "student"), "/progress?tab=week#top");
  assert.equal(safeChangePasswordTarget("/parent/reports", "parent"), "/parent/reports");
  assert.equal(safeChangePasswordTarget("/teacher/../admin", "teacher"), "/admin");
});

test("login completes with a full document navigation, not client-side routing", () => {
  // An architectural constraint, which is what a source-text assertion is
  // actually good for. 2ae49925 made this deliberate: a full navigation drops
  // the client React tree and router cache so a login cannot inherit the
  // previous account's cached documents. Reintroducing `router.replace` here
  // would silently restore that bug.
  const source = readFileSync(path.join(process.cwd(), "app/login/page.tsx"), "utf8");

  assert.match(source, /window\.location\.replace\(/);
  assert.doesNotMatch(
    source,
    /router\.replace\(/,
    "client-side routing on login success would carry stale account state (2ae49925)"
  );
  assert.doesNotMatch(source, /useRouter\(/);
});

test("the login page does not prefetch a protected workspace before authentication", () => {
  const source = readFileSync(path.join(process.cwd(), "app/login/page.tsx"), "utf8");

  assert.doesNotMatch(source, /router\.prefetch\(/);
});
