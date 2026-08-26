import assert from "node:assert/strict";
import test from "node:test";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import {
  SessionCookieIssuanceError,
  sessionCookieFailureResponse,
  setSessionCookie
} from "@/lib/server/sessionCookie";
import { getActiveUserSessionRevision } from "@/lib/server/userStore/auth";

test("setSessionCookie mints from the current active persisted revision", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = "session-cookie-revision-test-secret";

  try {
    const expectedRevision = await getActiveUserSessionRevision("student-peter");
    assert.ok(expectedRevision);

    const response = NextResponse.json({ ok: true });
    await setSessionCookie(response, "student-peter", new Request("https://mais.example.test/login"), expectedRevision);
    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    assert.ok(cookie?.value);

    const payload = await verifySessionToken(cookie.value);
    assert.equal(payload?.sub, "student-peter");
    assert.equal(payload?.sr, expectedRevision);
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = previousSecret;
  }
});

test("setSessionCookie rejects missing or inactive persisted users", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = "session-cookie-revision-test-secret";

  try {
    await assert.rejects(
      setSessionCookie(
        NextResponse.json({ ok: true }),
        "missing-session-cookie-user",
        new Request("https://mais.example.test/login"),
        1
      ),
      (error: unknown) => error instanceof SessionCookieIssuanceError && error.code === "account-inactive"
    );
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = previousSecret;
  }
});

test("setSessionCookie refuses to mint without the revision proven by authentication", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = "session-cookie-revision-test-secret";

  try {
    const unsafeIssuer = setSessionCookie as unknown as (
      response: NextResponse,
      userId: string,
      request: Request
    ) => Promise<void>;
    await assert.rejects(
      unsafeIssuer(
        NextResponse.json({ ok: true }),
        "student-peter",
        new Request("https://mais.example.test/login")
      ),
      (error: unknown) => error instanceof SessionCookieIssuanceError && error.code === "authenticated-revision-invalid"
    );
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = previousSecret;
  }
});

test("setSessionCookie cannot adopt a newer revision after the authenticated mutation", async () => {
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = "session-cookie-revision-test-secret";

  try {
    const currentRevision = await getActiveUserSessionRevision("student-peter");
    assert.ok(currentRevision);

    await assert.rejects(
      setSessionCookie(
        NextResponse.json({ ok: true }),
        "student-peter",
        new Request("https://mais.example.test/login"),
        currentRevision + 1
      ),
      (error: unknown) => error instanceof SessionCookieIssuanceError && error.code === "revision-mismatch"
    );
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = previousSecret;
  }
});

test("session cookie failures distinguish account state, CAS, and service availability", async () => {
  const request = new Request("https://mais.example.test/login");
  const inactive = sessionCookieFailureResponse(
    new SessionCookieIssuanceError("account-inactive"),
    request
  );
  assert.equal(inactive.status, 401);
  assert.equal((await inactive.json()).code, "session-account-inactive");
  assert.equal(inactive.cookies.get(SESSION_COOKIE_NAME)?.maxAge, 0);

  const changed = sessionCookieFailureResponse(
    new SessionCookieIssuanceError("revision-mismatch"),
    request
  );
  assert.equal(changed.status, 409);
  assert.equal((await changed.json()).code, "session-state-changed");
  assert.equal(changed.cookies.get(SESSION_COOKIE_NAME)?.maxAge, 0);

  const unavailable = sessionCookieFailureResponse(
    new SessionCookieIssuanceError("storage-unavailable"),
    request
  );
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).code, "session-service-unavailable");
  assert.doesNotMatch(JSON.stringify(await sessionCookieFailureResponse(
    new SessionCookieIssuanceError("storage-unavailable"),
    request
  ).json()), /secret|database|storage/i);
});

test("committed password updates report success even when the replacement cookie loses a CAS race", async () => {
  const response = sessionCookieFailureResponse(
    new SessionCookieIssuanceError("revision-mismatch"),
    new Request("https://mais.example.test/change-password"),
    { committedAction: "password-updated" }
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    code: "account-updated-session-refresh-required",
    error: "Your password was updated, but this device could not stay signed in. Sign in again with your new password.",
    accountUpdated: true
  });
  assert.equal(response.cookies.get(SESSION_COOKIE_NAME)?.maxAge, 0);
});
