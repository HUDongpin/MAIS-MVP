import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  nextPathStartsWith,
  parentWorkspacePath,
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

test("a protocol-relative next target is rejected for every role", () => {
  for (const role of ["student", "teacher", "parent", "admin"] as const) {
    assert.equal(safeWorkspaceTarget("//evil.example", role), workspaceForRole(role));
    assert.equal(safeWorkspaceTarget("//evil.example/path", role), workspaceForRole(role));
  }
});

test("an absolute off-origin next target is rejected for every role", () => {
  for (const role of ["student", "teacher", "parent", "admin"] as const) {
    assert.equal(safeWorkspaceTarget("https://evil.example", role), workspaceForRole(role));
    assert.equal(safeWorkspaceTarget("http://evil.example", role), workspaceForRole(role));
  }
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
 * Pins the CURRENT behaviour of the backslash case, which is a known open
 * redirect documented in `lib/loginRedirect.ts`. For http(s) URLs the WHATWG
 * parser treats `\` like `/` in the authority position, so `/\evil.example`
 * resolves to `https://evil.example/` once the page hands it to
 * `window.location.replace`.
 *
 * This test exists so the fix is a deliberate, visible flip rather than a
 * silent behaviour change: when the URL-parser guard lands, these assertions
 * become `workspaceForRole(role)` for every role.
 */
test("KNOWN GAP: a backslash next target is not yet rejected for students", () => {
  assert.equal(
    safeWorkspaceTarget("/\\evil.example", "student"),
    "/\\evil.example",
    "still accepted — see the SECURITY note in lib/loginRedirect.ts"
  );
  // Teacher and parent are protected only incidentally, by their prefix checks.
  assert.equal(safeWorkspaceTarget("/\\evil.example", "teacher"), teacherWorkspacePath);
  assert.equal(safeWorkspaceTarget("/\\evil.example", "parent"), parentWorkspacePath);
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
