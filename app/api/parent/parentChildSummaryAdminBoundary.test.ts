import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const privateHeaders = ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"] as const;

test("the real child-summary route rejects an authenticated admin without revealing the student", async () => {
  const databaseDirectory = await mkdtemp(path.join(tmpdir(), "mais-parent-admin-boundary-"));
  const environment = {
    AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET,
    HK_MATH_DB_PATH: process.env.HK_MATH_DB_PATH,
    HK_MATH_STORAGE_PROVIDER: process.env.HK_MATH_STORAGE_PROVIDER,
    MAIS_BOOTSTRAP_ADMIN_EMAIL: process.env.MAIS_BOOTSTRAP_ADMIN_EMAIL,
    MAIS_BOOTSTRAP_ADMIN_NAME: process.env.MAIS_BOOTSTRAP_ADMIN_NAME,
    MAIS_BOOTSTRAP_ADMIN_PASSWORD: process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD,
    MAIS_BOOTSTRAP_ADMIN_USERNAME: process.env.MAIS_BOOTSTRAP_ADMIN_USERNAME
  };
  const adminEmail = "parent-boundary-admin@example.test";
  const adminId = `admin-${createHash("sha1").update(adminEmail).digest("hex").slice(0, 16)}`;

  process.env.AUTH_SESSION_SECRET = "parent-boundary-test-secret-not-real";
  process.env.HK_MATH_DB_PATH = path.join(databaseDirectory, "parent-boundary.sqlite");
  process.env.HK_MATH_STORAGE_PROVIDER = "sqlite";
  process.env.MAIS_BOOTSTRAP_ADMIN_EMAIL = adminEmail;
  process.env.MAIS_BOOTSTRAP_ADMIN_USERNAME = adminEmail;
  process.env.MAIS_BOOTSTRAP_ADMIN_NAME = "Boundary Admin";
  process.env.MAIS_BOOTSTRAP_ADMIN_PASSWORD = "test-only-password";

  try {
    const session = await import("@/lib/session");
    const auth = await import("@/lib/server/auth");
    const route = await import("@/app/api/parent/children/[studentId]/summary/route");
    const token = await session.createSessionToken(adminId);
    const request = new Request("http://localhost/api/parent/children/student-peter/summary", {
      headers: { cookie: `${session.SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` }
    });

    const authenticated = await auth.requireAuthenticatedUser(request);
    assert.equal(authenticated?.user.id, adminId, "fixture must exercise a real authenticated admin");
    assert.equal(authenticated?.user.role, "admin");

    const response = await route.GET(request, {
      params: Promise.resolve({ studentId: "student-peter" })
    });
    const body = await response.json() as Record<string, unknown>;

    assert.ok(response.status === 403 || response.status === 404, `unexpected status ${response.status}`);
    assert.ok(
      body.error === "Parent access required." || body.error === "Child summary unavailable.",
      "the denial must use an opaque parent-route error"
    );
    assert.doesNotMatch(JSON.stringify(body), /student-peter|parent-boundary-admin|admin-[a-f0-9]+/i);
    for (const header of privateHeaders) {
      assert.equal(response.headers.get(header), "private, no-store", header);
    }
  } finally {
    for (const [key, value] of Object.entries(environment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(databaseDirectory, { recursive: true, force: true });
  }
});
