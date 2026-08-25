import assert from "node:assert/strict";
import test from "node:test";

import { createPasswordChangeHandler } from "@/app/api/auth/password-change/handler";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { SessionCookieIssuanceError } from "@/lib/server/sessionCookie";

test("successful password change re-signs the current device after revision increment", async () => {
  let cookieUserId = "";
  let cookieSessionRevision = 0;
  let rateLimitChecks = 0;
  const session = {
    user: {
      id: "student-1"
    }
  };
  const dependencies: NonNullable<Parameters<typeof createPasswordChangeHandler>[0]> = {
    requireAuthenticatedUser: async () => session as never,
    consumeAuthRateLimit: () => {
      rateLimitChecks += 1;
      return null;
    },
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
  };
  const handle = createPasswordChangeHandler(dependencies);

  const missingConstraint = await handle(new Request("https://mais.example.test/api/auth/password-change", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      currentPassword: "current-password",
      password: "new-password"
    })
  }));
  assert.equal(missingConstraint.status, 409);
  assert.equal(rateLimitChecks, 0);
  assert.equal(cookieUserId, "");

  const response = await handle(new Request("https://mais.example.test/api/auth/password-change", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-MAIS-Expected-User-Id": "student-1"
    },
    body: JSON.stringify({
      currentPassword: "current-password",
      password: "new-password",
      expectedUserId: "student-1"
    })
  }));

  assert.equal(response.status, 200);
  assert.equal(rateLimitChecks, 2);
  assert.equal(cookieUserId, "student-1");
  assert.equal(cookieSessionRevision, 2);
});

for (const [label, url, headers] of [
  [
    "header",
    "https://mais.example.test/api/auth/password-change",
    { "content-type": "application/json", "X-MAIS-Expected-User-Id": "student-2" }
  ],
  [
    "query",
    "https://mais.example.test/api/auth/password-change?expectedUserId=student-2",
    { "content-type": "application/json" }
  ]
] as const) {
  test(`password change rejects a stale expected user from the ${label} before rate limits or mutation`, async () => {
    let rateLimitChecks = 0;
    let passwordMutations = 0;
    let cookieWrites = 0;
    const dependencies: NonNullable<Parameters<typeof createPasswordChangeHandler>[0]> = {
      requireAuthenticatedUser: async () => ({ user: { id: "student-1" } }) as never,
      consumeAuthRateLimit: () => {
        rateLimitChecks += 1;
        return null;
      },
      changeAuthenticatedUserPassword: async () => {
        passwordMutations += 1;
        throw new Error("password mutation must not run");
      },
      setSessionCookie: async () => {
        cookieWrites += 1;
      }
    };
    const handle = createPasswordChangeHandler(dependencies);

    const response = await handle(new Request(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        currentPassword: "current-password",
        password: "new-password"
      })
    }));

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      code: "authenticated-user-changed",
      error: "The authenticated user changed. Reload before retrying."
    });
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(rateLimitChecks, 0);
    assert.equal(passwordMutations, 0);
    assert.equal(cookieWrites, 0);
  });
}

test("password change rejects disagreeing transport and JSON users before rate limits or mutation", async () => {
  let rateLimitChecks = 0;
  let passwordMutations = 0;
  const dependencies: NonNullable<Parameters<typeof createPasswordChangeHandler>[0]> = {
    requireAuthenticatedUser: async () => ({ user: { id: "student-1" } }) as never,
    consumeAuthRateLimit: () => {
      rateLimitChecks += 1;
      return null;
    },
    changeAuthenticatedUserPassword: async () => {
      passwordMutations += 1;
      throw new Error("password mutation must not run");
    },
    setSessionCookie: async () => undefined
  };
  const handle = createPasswordChangeHandler(dependencies);

  const response = await handle(new Request("https://mais.example.test/api/auth/password-change", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-MAIS-Expected-User-Id": "student-1"
    },
    body: JSON.stringify({
      expectedUserId: "student-2",
      currentPassword: "current-password",
      password: "new-password"
    })
  }));

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    code: "authenticated-user-changed",
    error: "The authenticated user changed. Reload before retrying."
  });
  assert.equal(rateLimitChecks, 0);
  assert.equal(passwordMutations, 0);
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
    headers: {
      "content-type": "application/json",
      "X-MAIS-Expected-User-Id": "student-1"
    },
    body: JSON.stringify({
      currentPassword: "current-password",
      password: "new-password",
      expectedUserId: "student-1"
    })
  }));

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    code: "account-updated-session-refresh-required",
    error: "Your password was updated, but this device could not stay signed in. Sign in again with your new password.",
    accountUpdated: true
  });
  assert.equal(response.cookies.get(SESSION_COOKIE_NAME)?.maxAge, 0);
});
