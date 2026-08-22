import assert from "node:assert/strict";
import test from "node:test";

import { createLogoutAllHandler } from "@/app/api/auth/logout-all/handler";
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

  const response = await handle(new Request("https://mais.example.test/api/auth/logout-all", {
    method: "POST"
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
    method: "POST"
  }));

  assert.equal(response.status, 401);
});
