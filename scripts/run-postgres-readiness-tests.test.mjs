import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedTests = [
  "app/api/admin/storage/health/route.test.ts",
  "app/api/warm/route.test.ts",
  "lib/server/userStore/postgresStorageReadiness.test.ts",
  "lib/server/userStoreAuthAdminStoragePersistence.test.ts"
];

test("the formal Postgres readiness runner, package script, and CI use the exact reviewed tests", async () => {
  const runner = await import("./run-postgres-readiness-tests.mjs");
  assert.deepEqual(runner.postgresReadinessTests, expectedTests);
  assert.deepEqual(runner.postgresReadinessNodeArgs, ["--import", "tsx", "--test", ...expectedTests]);
  assert.equal(typeof runner.assertPostgresReadinessRunnerContract, "function");
  await runner.assertPostgresReadinessRunnerContract();

  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(
    packageJson.scripts?.["test:postgres-readiness"],
    "node --test scripts/run-postgres-readiness-tests.test.mjs && node scripts/run-postgres-readiness-tests.mjs"
  );

  const ci = await readFile(".github/workflows/ci.yml", "utf8");
  assert.match(ci, /- name: Postgres readiness contract[\s\S]*?run: npm run test:postgres-readiness/u);

  assert.match(ci, /on:\s*[\s\S]*?merge_group:/u);
  const postgresJob = ci.slice(
    ci.indexOf("  postgres-integration:"),
    ci.indexOf("  visualization-browser:")
  );
  assert.match(postgresJob, /github\.event_name == 'pull_request'/u);
  assert.match(postgresJob, /github\.event_name == 'merge_group'/u);
  assert.match(
    postgresJob,
    /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/u
  );
  assert.match(
    postgresJob,
    /github\.event_name == 'workflow_dispatch' && inputs\.full_validation/u
  );
  assert.match(
    postgresJob,
    /uses: actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683[^\n]*\n\s+with:\s+ref: \$\{\{ github\.sha \}\}/u,
    "the database gate must test the exact event SHA for PR, merge queue, main, and manual runs"
  );
  assert.match(postgresJob, /EXPECTED_EVENT_SHA: \$\{\{ github\.sha \}\}/u);
  assert.match(postgresJob, /git rev-parse HEAD/u);

  const integrationTest = await readFile(
    "lib/server/userStoreNovaPostgresIntegration.test.ts",
    "utf8"
  );
  assert.match(integrationTest, /process\.env\.CI === "true"/u);
  assert.match(integrationTest, /integrationRequired/u);
  assert.match(
    integrationTest,
    /skip: integrationUrl \? false : integrationRequired \? false/u,
    "CI must fail instead of silently skipping when its real PostgreSQL URL is missing"
  );
});
