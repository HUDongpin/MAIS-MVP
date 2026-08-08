import assert from "node:assert/strict";
import test from "node:test";
import { defaultLoginIdentifierMax, loginIdentifierMaxFromEnv } from "@/lib/server/authRouteGuards";

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

test("the override cannot weaken the ceiling below production", () => {
  // The dangerous direction. A hostile or fat-fingered value must not make brute-forcing easier.
  for (const value of ["0", "-1", "-100", "1", "11"]) {
    assert.equal(
      loginIdentifierMaxFromEnv({ HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: value }),
      12,
      `override ${value} must not lower the ceiling`
    );
  }
});

test("the override raises the ceiling only when explicitly set higher", () => {
  assert.equal(loginIdentifierMaxFromEnv({ HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: "400" }), 400);
  assert.equal(loginIdentifierMaxFromEnv({ HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: "13" }), 13);
});

test("the fallback is a parameter, so no caller can be silently defaulted to something weaker", () => {
  // Guards a future refactor that passes a different fallback in: the floor still applies.
  assert.equal(loginIdentifierMaxFromEnv({}, 50), 50);
  assert.equal(loginIdentifierMaxFromEnv({ HK_MATH_E2E_LOGIN_IDENTIFIER_MAX: "5" }, 50), 50);
});
