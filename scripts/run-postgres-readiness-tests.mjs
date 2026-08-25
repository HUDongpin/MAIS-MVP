import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const postgresReadinessTests = [
  "app/api/admin/storage/health/route.test.ts",
  "app/api/warm/route.test.ts",
  "lib/server/userStore/postgresStorageReadiness.test.ts",
  "lib/server/userStoreAuthAdminStoragePersistence.test.ts"
];
export const postgresReadinessNodeArgs = ["--import", "tsx", "--test", ...postgresReadinessTests];

export async function assertPostgresReadinessRunnerContract() {
  assert.equal(
    new Set(postgresReadinessTests).size,
    postgresReadinessTests.length,
    "Postgres readiness runner paths must be unique"
  );
  await Promise.all(postgresReadinessTests.map((testPath) => access(testPath)));
}

async function main() {
  await assertPostgresReadinessRunnerContract();
  const result = spawnSync(process.execPath, postgresReadinessNodeArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.signal) {
    throw new Error(`Postgres readiness tests terminated by ${result.signal}.`);
  }
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
