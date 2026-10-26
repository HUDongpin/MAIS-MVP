import assert from "node:assert/strict";
import { test } from "node:test";
import {
  handleGoogleOAuthCallback,
  safeWorkspaceTarget,
  type GoogleCallbackDependencies
} from "./handler";

/**
 * The Google callback's own `?next=` guard, and the redirect it feeds.
 *
 * The sink is `NextResponse.redirect(new URL(targetPath, request.url))`, so
 * whatever survives the guard is resolved by the same URL parser a browser
 * uses. Until `lib/safeRedirectPath.ts` landed, the guard was a
 * `startsWith("/") && !startsWith("//")` string check, and `/\evil.example`
 * walked straight through it onto `https://evil.example/` — reached after a
 * verified Google sign-in, which is what makes it a usable phishing step
 * rather than a curiosity.
 *
 * `next` arrives here out of the signed OAuth state, which `safeNextPath` in
 * `lib/server/googleOAuth.ts` already sanitizes on the way in and on the way
 * out. The end-to-end cases below deliberately bypass that by stubbing
 * `verifyGoogleOAuthState`, because the point is that this guard holds on its
 * own: a payload sealed by an older build, or any future path that reaches the
 * handler with an unsanitized `next`, must still not redirect off-origin.
 */

const roles = ["student", "teacher", "parent", "admin"] as const;

const workspaceFallbacks = {
  student: "/dashboard",
  teacher: "/teacher",
  parent: "/parent/connect",
  admin: "/teacher"
} as const;

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
  "javascript:alert(document.domain)",
  ""
] as const;

test("the callback's workspace target rejects every off-origin next, for every role", () => {
  for (const role of roles) {
    for (const value of offOriginNext) {
      assert.equal(
        safeWorkspaceTarget(value, role),
        workspaceFallbacks[role],
        `${role} <- ${JSON.stringify(value)}`
      );
    }
    // An absent role falls back to the student workspace.
    assert.equal(safeWorkspaceTarget("/\\evil.example", undefined), workspaceFallbacks.student);
  }
});

test("the callback's workspace target keeps the per-role filter", () => {
  assert.equal(safeWorkspaceTarget("/teacher/gradebook", "teacher"), "/teacher/gradebook");
  assert.equal(safeWorkspaceTarget("/teacher/gradebook", "admin"), "/teacher/gradebook");
  assert.equal(safeWorkspaceTarget("/teacher/gradebook", "student"), "/dashboard");
  assert.equal(safeWorkspaceTarget("/teacher/gradebook", "parent"), "/parent/connect");
  assert.equal(safeWorkspaceTarget("/parent/connect", "parent"), "/parent/connect");
  assert.equal(safeWorkspaceTarget("/parent/connect", "student"), "/dashboard");
  assert.equal(safeWorkspaceTarget("/progress", "student"), "/progress");
  assert.equal(safeWorkspaceTarget("/progress", "teacher"), "/teacher");

  // The filter sees the normalized path, so dot segments cannot step past it.
  assert.equal(safeWorkspaceTarget("/teacher/../admin", "teacher"), "/teacher");
  assert.equal(safeWorkspaceTarget("/teacher/./gradebook", "teacher"), "/teacher/gradebook");

  // Percent-encoded separators are one path segment, not an authority.
  assert.equal(safeWorkspaceTarget("/%5Cevil.example", "student"), "/%5Cevil.example");
});

function callbackDependencies(
  next: string,
  role: "student" | "teacher" | "parent" | "admin"
): GoogleCallbackDependencies {
  return {
    verifyGoogleOAuthState: async () => ({
      status: "valid",
      payload: { nonce: "nonce-fixture", next, role: "student" }
    }),
    getGoogleOAuthConfig: () => ({
      clientId: "redirect-target-client-id",
      clientSecret: "redirect-target-client-secret",
      redirectUri: "https://mais.test/api/auth/google/callback"
    }),
    exchangeGoogleAuthorizationCode: async () => ({ status: "ok", idToken: "verified-id-token" }),
    fetchGoogleJwks: async () => ({ keys: [] }),
    verifyGoogleIdToken: async () => ({
      status: "valid",
      profile: {
        subject: "google-subject-redirect-target",
        email: "verified.learner@example.test",
        emailVerified: true,
        name: "Verified Learner"
      }
    }),
    authenticateGoogleIdentityForLogin: async () => ({
      status: "authenticated",
      sessionRevision: 3,
      session: { user: { id: "redirect-target-user", role } }
    }),
    setSessionCookie: async () => {}
  };
}

async function callbackLocation(next: string, role: "student" | "teacher" | "parent" | "admin") {
  const response = await handleGoogleOAuthCallback(
    new Request("https://mais.test/api/auth/google/callback?state=state-fixture&code=auth-code"),
    callbackDependencies(next, role)
  );
  assert.equal(response.status, 307);
  const location = response.headers.get("location");
  assert.ok(location, `expected a redirect for ${JSON.stringify(next)}`);
  return new URL(location);
}

test("a verified Google sign-in never redirects off-origin, whatever next asked for", async () => {
  for (const role of roles) {
    for (const value of offOriginNext) {
      const location = await callbackLocation(value, role);
      assert.equal(
        location.origin,
        "https://mais.test",
        `${role} <- ${JSON.stringify(value)} redirected to ${location.href}`
      );
      assert.equal(location.pathname, workspaceFallbacks[role], `${role} <- ${JSON.stringify(value)}`);
    }
  }
});

test("a verified Google sign-in still lands on the requested in-app path", async () => {
  const studentLocation = await callbackLocation("/progress?topic=fractions", "student");
  assert.equal(studentLocation.origin, "https://mais.test");
  assert.equal(studentLocation.pathname, "/progress");
  assert.equal(studentLocation.searchParams.get("topic"), "fractions");

  const teacherLocation = await callbackLocation("/teacher/gradebook", "teacher");
  assert.equal(teacherLocation.origin, "https://mais.test");
  assert.equal(teacherLocation.pathname, "/teacher/gradebook");
});
