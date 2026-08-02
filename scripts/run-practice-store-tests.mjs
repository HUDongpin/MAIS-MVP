import { spawnSync } from "node:child_process";

// Practice-attempt storage gate: the SQLite hot-row fast path (attempt/mistake/
// adaptive/learning-event/reward rows + the snapshot read overlay) and the
// snapshot-cache contract that sits under it.
//
// Unlike the tsc-precompile runners in this directory these tests execute from
// TypeScript source: several of them spawn a child `node --import tsx` process
// that imports `lib/server/*.ts` with a different storage provider in the
// environment, and one asserts on the on-disk source text. Running them through
// tsx (the same mode `test:ccss-depth` and `test:source-regressions` use) keeps
// those paths honest.
const testFiles = [
  "lib/server/practiceAttemptStore.test.ts",
  "lib/server/userStoreSqliteSnapshotCache.test.ts",
  "lib/server/userStoreStudentActivityPersistence.test.ts",
  "lib/server/userStoreGamificationIslandPersistence.test.ts"
];

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "--tsconfig", "tsconfig.json", "--test", ...testFiles],
  {
    stdio: "inherit",
    env: process.env
  }
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
