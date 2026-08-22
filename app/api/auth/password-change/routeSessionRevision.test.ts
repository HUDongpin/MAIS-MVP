import assert from "node:assert/strict";
import test from "node:test";

import { createPasswordChangeHandler } from "@/app/api/auth/password-change/handler";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { SessionCookieIssuanceError } from "@/lib/server/sessionCookie";

test("successful password change re-signs the current device after revision increment", async () => {
  let cookieUserId = "";
  let cookieSessionRevision = 0;
  const session = {
    user: {
      id: "student-1"
    }
  };
  const handle = createPasswordChangeHandler({
    requireAuthenticatedUser: async () => session as never,
    changeAuthenticatedUserPassword: async () => ({
      status: "updated" as const,
      sessionRevision: 2,
      session: {
        ...session,
        settings: {
          language: "en" as const,
          theme: "dark" as const,
          selectedGrade: "S3" as const
        }
      } as never
    }),
    setSessionCookie: async (_response, userId, _request, expectedSessionRevision) => {
      cookieUserId = userId;
      cookieSessionRevision = expectedSessionRevision ?? 0;
    }
  });

  const response = await handle(new Request("https://mais.example.test/api/auth/password-change", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      currentPassword: "current-password",
      password: "new-password"
    })
  }));

  assert.equal(response.status, 200);
  assert.equal(cookieUserId, "student-1");
  assert.equal(cookieSessionRevision, 2);
});

test("password change reports a committed update and clears the cookie after a revision race", async () => {
  const handle = createPasswordChangeHandler({
    requireAuthenticatedUser: async () => ({ user: { id: "student-1" } }) as never,
    changeAuthenticatedUserPassword: async () => ({
      status: "updated" as const,
      sessionRevision: 2,
      session: {
        user: { id: "student-1" },
        settings: { language: "en" as const, theme: "dark" as const, selectedGrade: "S3" as const }
      } as never
    }),
    setSessionCookie: async () => {
      throw new SessionCookieIssuanceError("revision-mismatch");
    }
  });

  const response = await handle(new Request("https://mais.example.test/api/auth/password-change", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ currentPassword: "current-password", password: "new-password" })
  }));

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    code: "account-updated-session-refresh-required",
    error: "Your password was updated, but this device could not stay signed in. Sign in again with your new password.",
    accountUpdated: true
  });
  assert.equal(response.cookies.get(SESSION_COOKIE_NAME)?.maxAge, 0);
});
