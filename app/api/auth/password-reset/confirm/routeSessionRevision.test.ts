import assert from "node:assert/strict";
import test from "node:test";

import { createPasswordResetConfirmHandler } from "@/app/api/auth/password-reset/confirm/handler";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { SessionCookieIssuanceError } from "@/lib/server/sessionCookie";

test("successful password reset mints a cookie from the incremented account revision", async () => {
  let cookieUserId = "";
  let cookieSessionRevision = 0;
  const handle = createPasswordResetConfirmHandler({
    resetUserPassword: async () => ({
      status: "reset" as const,
      sessionRevision: 7,
      session: {
        user: { id: "student-1" },
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

  const response = await handle(new Request("https://mais.example.test/api/auth/password-reset/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "valid-reset-token", password: "new-password" })
  }));

  assert.equal(response.status, 200);
  assert.equal(cookieUserId, "student-1");
  assert.equal(cookieSessionRevision, 7);
});

test("password reset reports a committed update and clears the cookie after account disable", async () => {
  const handle = createPasswordResetConfirmHandler({
    resetUserPassword: async () => ({
      status: "reset" as const,
      sessionRevision: 7,
      session: {
        user: { id: "student-1" },
        settings: { language: "en" as const, theme: "dark" as const, selectedGrade: "S3" as const }
      } as never
    }),
    setSessionCookie: async () => {
      throw new SessionCookieIssuanceError("account-inactive");
    }
  });

  const response = await handle(new Request("https://mais.example.test/api/auth/password-reset/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "valid-reset-token", password: "new-password" })
  }));

  assert.equal(response.status, 401);
  assert.equal((await response.json()).accountUpdated, true);
  assert.equal(response.cookies.get(SESSION_COOKIE_NAME)?.maxAge, 0);
});
