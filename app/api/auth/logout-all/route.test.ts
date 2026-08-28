import assert from "node:assert/strict";
import test from "node:test";

import { createLogoutAllHandler } from "@/app/api/auth/logout-all/handler";
import { createLogoutHandler } from "@/app/api/auth/logout/handler";
import { SESSION_COOKIE_NAME } from "@/lib/session";

test("logout-all increments the authenticated account revision and clears this device cookie", async () => {
  let revokedUserId = "";
  const handle = createLogoutAllHandler({
    requireAuthenticatedUser: async () => ({ user: { id: "student-1" } }) as never,
    revokeAllUserSessions: async (userId) => {
      revokedUserId = userId;
      return { status: "revoked" as const, sessionRevision: 9 };
    }
  });

  const missingConstraint = await handle(new Request("https://mais.example.test/api/auth/logout-all", {
    method: "POST"
  }));
  assert.equal(missingConstraint.status, 409);
  assert.equal(revokedUserId, "");

  const response = await handle(new Request("https://mais.example.test/api/auth/logout-all", {
    method: "POST",
    headers: { "X-MAIS-Expected-User-Id": "student-1" }
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(revokedUserId, "student-1");
  assert.equal(response.cookies.get(SESSION_COOKIE_NAME)?.value, "");
  assert.equal(response.cookies.get(SESSION_COOKIE_NAME)?.maxAge, 0);
});

test("logout-all fails closed if the account disappears or is disabled during revocation", async () => {
  const handle = createLogoutAllHandler({
    requireAuthenticatedUser: async () => ({ user: { id: "student-1" } }) as never,
    revokeAllUserSessions: async () => ({ status: "invalid" as const })
  });

  const response = await handle(new Request("https://mais.example.test/api/auth/logout-all", {
    method: "POST",
    headers: { "X-MAIS-Expected-User-Id": "student-1" }
  }));

  assert.equal(response.status, 401);
});

test("single-device logout cannot clear a replacement account cookie from a stale document", async () => {
  const handle = createLogoutHandler({
    requireAuthenticatedUser: async () => ({ user: { id: "student-b" } }) as never
  });

  const staleResponse = await handle(new Request("https://mais.example.test/api/auth/logout", {
    method: "POST",
    headers: { "X-MAIS-Expected-User-Id": "student-a" }
  }));
  assert.equal(staleResponse.status, 409);
  assert.equal(staleResponse.headers.get("set-cookie"), null);

  const currentResponse = await handle(new Request("https://mais.example.test/api/auth/logout", {
    method: "POST",
    headers: { "X-MAIS-Expected-User-Id": "student-b" }
  }));
  assert.equal(currentResponse.status, 200);
  assert.equal(currentResponse.cookies.get(SESSION_COOKIE_NAME)?.value, "");
  assert.equal(currentResponse.cookies.get(SESSION_COOKIE_NAME)?.maxAge, 0);
});
