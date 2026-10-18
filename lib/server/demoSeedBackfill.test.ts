import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  demoSeedBackfillFlagExplicitlyEnabled,
  retainRecordsUnlessNewDemoSeed,
  shouldBackfillDemoSeed
} from "@/lib/server/demoSeedBackfill";

const jonSubmissionId = "submission-us-ca-p1-add-subtract-check-jon";
const jonEnrollmentId = "enrollment-us-ca-p1-student-jon";

test("demo seed backfill is refused in production unless the flag is explicitly set", () => {
  assert.equal(demoSeedBackfillFlagExplicitlyEnabled(undefined), false);
  assert.equal(demoSeedBackfillFlagExplicitlyEnabled(""), false);
  assert.equal(demoSeedBackfillFlagExplicitlyEnabled("yes"), false);
  assert.equal(demoSeedBackfillFlagExplicitlyEnabled("on"), false);
  assert.equal(demoSeedBackfillFlagExplicitlyEnabled(" TRUE "), true);

  for (const flag of [undefined, "", "0", "false", "yes", "on"]) {
    assert.equal(
      shouldBackfillDemoSeed({
        VERCEL_ENV: "production",
        MAIS_DEMO_SEED_BACKFILL: flag,
        HK_MATH_ENABLE_DEMO_USER: "true"
      }),
      false,
      `production flag ${String(flag)}`
    );
  }

  assert.equal(shouldBackfillDemoSeed({ VERCEL_ENV: "production", MAIS_DEMO_SEED_BACKFILL: "1" }), true);
  assert.equal(shouldBackfillDemoSeed({ VERCEL_ENV: "production", MAIS_DEMO_SEED_BACKFILL: "true" }), true);
});

test("unset flag keeps historical backfill outside Vercel production and explicit 0 turns it off", () => {
  assert.equal(shouldBackfillDemoSeed({}), true);
  assert.equal(shouldBackfillDemoSeed({ VERCEL_ENV: "preview" }), true);
  assert.equal(shouldBackfillDemoSeed({ VERCEL_ENV: "development" }), true);
  assert.equal(shouldBackfillDemoSeed({ NODE_ENV: "production" }), true);
  assert.equal(shouldBackfillDemoSeed({ NODE_ENV: "test", MAIS_DEMO_SEED_BACKFILL: "0" }), false);
  assert.equal(shouldBackfillDemoSeed({ MAIS_DEMO_SEED_BACKFILL: "false" }), false);
  assert.equal(shouldBackfillDemoSeed({ MAIS_DEMO_SEED_BACKFILL: "1" }), true);
});

test("production without the flag drops new demo seed rows and an explicit flag keeps a stored score", () => {
  const seedIds = new Set([jonEnrollmentId, jonSubmissionId]);
  const seedRows = [
    { id: jonEnrollmentId, score: null as number | null, status: "not-started" },
    { id: jonSubmissionId, score: null as number | null, status: "not-started" }
  ];

  assert.deepEqual(
    retainRecordsUnlessNewDemoSeed([], seedRows, (row) => row.id, seedIds, false),
    []
  );

  const custom = { id: "enrollment-custom-other", score: 1, status: "submitted" };
  assert.deepEqual(
    retainRecordsUnlessNewDemoSeed([custom], [...seedRows, custom], (row) => row.id, seedIds, false),
    [custom]
  );

  const submitted = { id: jonSubmissionId, score: 9, status: "submitted" };
  const merged = seedRows.map((row) => (row.id === submitted.id ? submitted : row));
  const first = retainRecordsUnlessNewDemoSeed([], merged, (row) => row.id, seedIds, true);
  const second = retainRecordsUnlessNewDemoSeed(first, first, (row) => row.id, seedIds, true);
  assert.deepEqual(second, first);
  assert.equal(second.filter((row) => row.id === jonSubmissionId).length, 1);
  assert.equal(second.find((row) => row.id === jonSubmissionId)?.score, 9);

  const kept = retainRecordsUnlessNewDemoSeed([submitted], [submitted], (row) => row.id, seedIds, false);
  assert.deepEqual(kept, [submitted]);
});

test("user store persistence paths consult the demo seed backfill gate", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.match(source, /import \{[\s\S]*shouldBackfillDemoSeed[\s\S]*\} from "@\/lib\/server\/demoSeedBackfill"/);
  assert.match(source, /const allowDemoSeedBackfill = shouldBackfillDemoSeed\(\)/);
  assert.match(source, /allowDemoSeedBackfill \? storageSeedExampleAccountSeeds\(\) : \[\]/);
  assert.match(source, /if \(allowDemoSeedBackfill\) \{\s*syncDemoAccountsFromAuthSessionPersistence\(/);
  assert.match(source, /shouldBackfillDemoSeed\(\) && demoRecordsNeedSyncFromAuthSessionPersistence\(/);
  assert.match(source, /return allowDemoSeedBackfill\s*\?\s*normalizedDatabase\s*:\s*omitUnstoredDemoSeedRecords\(database, normalizedDatabase\)/);
});
