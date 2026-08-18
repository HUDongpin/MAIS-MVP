import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";

const databaseDirectory = mkdtempSync(path.join(tmpdir(), "mais-snapshot-read-cost-"));
process.env.HK_MATH_DB_DIR = databaseDirectory;
// Every read re-derives the snapshot, so any cached read would hide the cost this
// test is guarding. Force each call down the real load path.
process.env.HK_MATH_DISABLE_SQLITE_READ_CACHE = "1";

after(() => {
  rmSync(databaseDirectory, { recursive: true, force: true });
});

// The store reaches pbkdf2Sync through the CommonJS crypto namespace object, so
// replacing the property here counts every derivation the load path performs.
let derivations = 0;
const realPbkdf2Sync = crypto.pbkdf2Sync;
(crypto as { pbkdf2Sync: typeof crypto.pbkdf2Sync }).pbkdf2Sync = ((...args: Parameters<typeof crypto.pbkdf2Sync>) => {
  derivations += 1;
  return realPbkdf2Sync(...args);
}) as typeof crypto.pbkdf2Sync;

test("re-reading an unchanged snapshot does not re-derive demo passwords", async () => {
  const store = await import("./userStore");

  // Bootstrap: seeding the demo accounts legitimately hashes passwords.
  await store.getRoadmapData("student-peter");
  await store.getRoadmapData("student-peter");
  const afterWarmup = derivations;

  for (let index = 0; index < 5; index += 1) {
    await store.getRoadmapData("student-peter");
  }

  const perRead = (derivations - afterWarmup) / 5;
  assert.equal(
    derivations - afterWarmup,
    0,
    `reading an unchanged snapshot derived ${perRead} pbkdf2 hashes per read; the demo-account ` +
      `verification in normalizeDatabase/databaseNeedsPersistenceSync must stay cached ` +
      `(each derivation is 120k iterations and every mutation pays for a read)`
  );
});
