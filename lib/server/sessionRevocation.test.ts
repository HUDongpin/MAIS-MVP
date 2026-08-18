import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

/**
 * Session tokens are stateless HMACs with a seven-day life. Before the credential
 * tag existed, nothing could take one back: a leaked cookie outlived a password
 * change and a password reset, so the recovery flow gave the account owner no way to
 * evict whoever had the cookie. These tests pin the two directions that matter —
 * a token minted before the credential rotates stops verifying, and one minted after
 * keeps working.
 */
function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("rotating a password revokes the sessions minted against the old one", async () => {
  const previousAuthSecret = process.env.AUTH_SESSION_SECRET;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousDbPath = process.env.HK_MATH_DB_PATH;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-session-revocation-"));

  try {
    process.env.AUTH_SESSION_SECRET = "session-revocation-test-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.HK_MATH_STORAGE_PROVIDER;

    const { createStudentUser, changeAuthenticatedUserPassword, createPasswordResetRequest, resetUserPassword } =
      await import("./userStore");
    const { createSessionTokenForUserId } = await import("./sessionCookie");
    const { getAuthenticatedUserFromToken, verifyRevocableSessionToken } = await import("./auth");
    const { createSessionToken } = await import("@/lib/session");

    const created = await createStudentUser({
      name: "Revocation Student",
      username: "revocation-student@example.test",
      email: "revocation-student@example.test",
      password: "first12345",
      grade: "S3",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      language: "en",
      theme: "dark"
    });
    assert.equal(created.status, "created");
    if (created.status !== "created") return;

    const userId = created.session.user.id;

    const beforeChange = await createSessionTokenForUserId(userId);
    assert.equal((await getAuthenticatedUserFromToken(beforeChange))?.user.id, userId);

    const changed = await changeAuthenticatedUserPassword({
      userId,
      currentPassword: "first12345",
      password: "second12345"
    });
    assert.equal(changed.status, "updated");

    assert.equal(await verifyRevocableSessionToken(beforeChange), null);
    assert.equal(await getAuthenticatedUserFromToken(beforeChange), null);

    const afterChange = await createSessionTokenForUserId(userId);
    assert.equal((await getAuthenticatedUserFromToken(afterChange))?.user.id, userId);

    // Same again through the reset path, which is the one the audit called out: a
    // password reset that does not evict the attacker is not a recovery flow.
    const resetRequest = await createPasswordResetRequest("revocation-student@example.test");
    assert.ok(resetRequest?.token);

    const reset = await resetUserPassword(resetRequest.token, "third12345");
    assert.equal(reset.status, "reset");

    assert.equal(await getAuthenticatedUserFromToken(afterChange), null);
    assert.equal((await getAuthenticatedUserFromToken(await createSessionTokenForUserId(userId)))?.user.id, userId);

    // A correctly signed token that predates the credential tag carries no `cv` and
    // is therefore unrevocable, so it is refused rather than grandfathered in.
    const legacyToken = await createSessionToken(userId, null);
    assert.equal(await verifyRevocableSessionToken(legacyToken), null);

    // A signed, tagged token naming an account that no longer exists is deliberately
    // NOT refused here — there is no credential left to compare it against, and the
    // user lookup behind it returns nothing anyway.
    const orphan = await createSessionToken("no-such-user", "a-tag-from-when-the-row-existed");
    assert.equal((await verifyRevocableSessionToken(orphan))?.sub, "no-such-user");
    assert.equal(await getAuthenticatedUserFromToken(orphan), null);
  } finally {
    restoreEnv("AUTH_SESSION_SECRET", previousAuthSecret);
    restoreEnv("HK_MATH_DB_DIR", previousDbDir);
    restoreEnv("HK_MATH_DB_PATH", previousDbPath);
    restoreEnv("HK_MATH_ENABLE_DEMO_USER", previousDemoFlag);
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    await rm(dbDir, { recursive: true, force: true });
  }
});
