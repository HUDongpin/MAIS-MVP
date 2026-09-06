import assert from "node:assert/strict";
import test from "node:test";
import { NextResponse } from "next/server";
import {
  authRateLimitResponse,
  defaultLoginIdentifierMax,
  loginIdentifierMaxFromEnv,
  withAuthRouteJsonBoundary
} from "@/lib/server/authRouteGuards";

const privateNoStore = "private, no-store";

function assertPrivateNoStore(response: Response) {
  assert.equal(response.headers.get("Cache-Control"), privateNoStore);
  assert.equal(response.headers.get("CDN-Cache-Control"), privateNoStore);
  assert.equal(response.headers.get("Vercel-CDN-Cache-Control"), privateNoStore);
}

/**
 * `loginIdentifier` is the brute-force control on the login route. D-11 loosened it for the e2e
 * suite via `HK_MATH_E2E_LOGIN_IDENTIFIER_MAX`, so these tests exist to make sure that escape
 * hatch can only ever do the one thing it was reviewed to do.
 *
 * The important assertion is the first one: a deployment that does not set the variable keeps the
 * production ceiling exactly. Everything else guards the ways an override could go wrong.
 */

test("the production ceiling is 12 attempts per identifier", () => {
  assert.equal(defaultLoginIdentifierMax, 12);
});

test("an unset override leaves the production ceiling untouched", () => {
  assert.equal(loginIdentifierMaxFromEnv({}), 12);
});

test("a malformed override falls back to the production ceiling rather than failing open", () => {
  for (const value of ["", " ", "abc", "NaN", "1e6", "twelve", "12.9.9"]) {
    assert.equal(
      loginIdentifierMaxFromEnv({ HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: value }),
      12,
      `expected the default for ${JSON.stringify(value)}`
    );
  }
});

test("the override and a custom fallback cannot weaken the ceiling below production", () => {
  // The dangerous direction. A hostile or fat-fingered value must not make brute-forcing easier.
  for (const value of ["0", "-1", "-100", "1", "11"]) {
    assert.equal(
      loginIdentifierMaxFromEnv({ HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: value }),
      12,
      `override ${value} must not lower the ceiling`
    );
  }
  assert.equal(loginIdentifierMaxFromEnv({}, 50), 50);
  assert.equal(loginIdentifierMaxFromEnv({ HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: "5" }, 50), 50);
});

test("the override raises the ceiling only when explicitly set higher", () => {
  assert.equal(loginIdentifierMaxFromEnv({ HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: "400" }), 400);
  assert.equal(loginIdentifierMaxFromEnv({ HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: "13" }), 13);
});

test("auth JSON and rate-limit responses are private and non-cacheable", async () => {
  const response = await withAuthRouteJsonBoundary("test-auth-route", async () => {
    const publicResponse = NextResponse.json({ ok: true });
    publicResponse.headers.set("Cache-Control", "public, max-age=600");
    publicResponse.headers.set("CDN-Cache-Control", "public, max-age=600");
    publicResponse.headers.set("Vercel-CDN-Cache-Control", "public, max-age=600");
    return publicResponse;
  });

  assert.equal(response.status, 200);
  assertPrivateNoStore(response);

  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const failureResponse = await withAuthRouteJsonBoundary("test-auth-failure", async () => {
      throw new Error("database unavailable");
    });

    assert.equal(failureResponse.status, 503);
    assert.deepEqual(await failureResponse.json(), {
      code: "auth-service-unavailable",
      error: "Authentication service is temporarily unavailable. Please try again."
    });
    assertPrivateNoStore(failureResponse);
  } finally {
    console.error = originalConsoleError;
  }

  const rateLimitResponse = authRateLimitResponse(
    30,
    { max: 5, windowMs: 60_000 },
    Date.now() + 30_000
  );

  assert.equal(rateLimitResponse.status, 429);
  assertPrivateNoStore(rateLimitResponse);
});

test("observing the boundary preserves expected conflicts and session response headers", async () => {
  const original = NextResponse.json({ code: "authenticated-user-changed" }, { status: 409 });
  original.headers.set("Vary", "Cookie");
  original.headers.set("Retry-After", "3");
  original.cookies.set("synthetic-session", "fixture", { httpOnly: true });
  const response = await withAuthRouteJsonBoundary("auth-session-state", async () => original);
  assert.equal(response, original);
  assert.equal(response.status, 409);
  assert.equal(response.headers.get("Vary"), "Cookie");
  assert.equal(response.headers.get("Retry-After"), "3");
  assert.match(response.headers.get("Set-Cookie") ?? "", /synthetic-session=fixture/);
  assertPrivateNoStore(response);
});
