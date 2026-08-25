import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/attempts/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

test("attempt submission rejects a validly signed stale session before question lookup", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = "attempt-session-revision-test-secret";

  try {
    const token = await createSessionToken({
      userId: "student-peter",
      sessionRevision: 999
    });
    const response = await POST(new Request("http://localhost/api/attempts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`
      },
      body: JSON.stringify({
        questionId: "does-not-exist-session-revision-probe",
        selectedAnswer: "A"
      })
    }));

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "Log in before submitting tracked practice attempts."
    });

    const currentToken = await createSessionToken({
      userId: "student-peter",
      sessionRevision: 1
    });
    const missingExpectedUser = await POST(new Request("http://localhost/api/attempts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(currentToken)}`
      },
      body: JSON.stringify({
        questionId: "does-not-exist-expected-user-probe",
        selectedAnswer: "A"
      })
    }));
    assert.equal(missingExpectedUser.status, 409);
    assert.deepEqual(await missingExpectedUser.json(), {
      code: "authenticated-user-changed",
      error: "The authenticated user changed. Reload before retrying."
    });

    const disagreeingExpectedUsers = await POST(new Request("http://localhost/api/attempts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(currentToken)}`,
        "X-MAIS-Expected-User-Id": "student-peter"
      },
      body: JSON.stringify({
        questionId: "does-not-exist-expected-user-probe",
        selectedAnswer: "A",
        expectedUserId: "student-other"
      })
    }));
    assert.equal(disagreeingExpectedUsers.status, 409);
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = previousSecret;
  }
});
