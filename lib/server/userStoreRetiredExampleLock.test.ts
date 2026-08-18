import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

/**
 * The case that decides whether switching demo access off is a real fix or a
 * cosmetic one.
 *
 * Seeded accounts stop being *synced* when the flag flips, but the rows an earlier
 * demo-enabled deploy already wrote stay in the database — and a production
 * database almost certainly has them, because seeding used to be on by default.
 * Without the retire-lock, flipping the flag would leave every one of those rows
 * still answering to the published password.
 *
 * The read cache is disabled so each call re-normalizes and picks up the flag
 * change in-process; without it the first read's snapshot would be served
 * throughout and the test would prove nothing.
 */
function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("switching demo access off retires the credential on seed rows that already exist", async () => {
  const previousAuthSecret = process.env.AUTH_SESSION_SECRET;
  const previousDbDir = process.env.HK_MATH_DB_DIR;
  const previousDbPath = process.env.HK_MATH_DB_PATH;
  const previousDemoFlag = process.env.HK_MATH_ENABLE_DEMO_USER;
  const previousFastLoginFlag = process.env.HK_MATH_ENABLE_INTERNAL_FAST_LOGIN;
  const previousReadCache = process.env.HK_MATH_DISABLE_SQLITE_READ_CACHE;
  const previousStorageProvider = process.env.HK_MATH_STORAGE_PROVIDER;
  const dbDir = await mkdtemp(path.join(tmpdir(), "mais-retired-example-lock-"));

  try {
    process.env.AUTH_SESSION_SECRET = "retired-example-lock-test-secret";
    process.env.HK_MATH_DB_DIR = dbDir;
    process.env.HK_MATH_DISABLE_SQLITE_READ_CACHE = "true";
    process.env.HK_MATH_ENABLE_DEMO_USER = "true";
    delete process.env.HK_MATH_ENABLE_INTERNAL_FAST_LOGIN;
    delete process.env.HK_MATH_DB_PATH;
    delete process.env.HK_MATH_STORAGE_PROVIDER;

    const { authenticateUserForLogin } = await import("./userStore");

    // Demo access on: the row exists and answers to the published password. This is
    // the state a production database is already in.
    const seeded = await authenticateUserForLogin("HK Student Peter", "12345");
    assert.equal(seeded.status, "authenticated");

    // The internal California accounts follow the fast-login switch, which is off, so
    // they are retired even while the demo accounts are on — and must not be reachable
    // on the published password either.
    assert.equal((await authenticateUserForLogin("Student Jon", "12345")).status, "invalid");

    // Flip the switch. Nothing re-seeds the row, so if the credential were not
    // actively retired it would still be "12345".
    process.env.HK_MATH_ENABLE_DEMO_USER = "false";
    assert.equal((await authenticateUserForLogin("HK Student Peter", "12345")).status, "invalid");

    // The account itself survives — classes, submissions and ledgers reference these
    // ids — so flipping back restores the credential rather than rebuilding the world.
    process.env.HK_MATH_ENABLE_DEMO_USER = "true";
    assert.equal((await authenticateUserForLogin("HK Student Peter", "12345")).status, "authenticated");
  } finally {
    restoreEnv("AUTH_SESSION_SECRET", previousAuthSecret);
    restoreEnv("HK_MATH_DB_DIR", previousDbDir);
    restoreEnv("HK_MATH_DB_PATH", previousDbPath);
    restoreEnv("HK_MATH_ENABLE_DEMO_USER", previousDemoFlag);
    restoreEnv("HK_MATH_ENABLE_INTERNAL_FAST_LOGIN", previousFastLoginFlag);
    restoreEnv("HK_MATH_DISABLE_SQLITE_READ_CACHE", previousReadCache);
    restoreEnv("HK_MATH_STORAGE_PROVIDER", previousStorageProvider);
    await rm(dbDir, { recursive: true, force: true });
  }
});
