import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const scriptPath = path.join(process.cwd(), "scripts/teacher-notice-outbox-migration.mjs");
const migrationModulePromise = import("./teacher-notice-outbox-migration.mjs").catch(() => null);

test("teacher notice outbox migration guard requires an exact allowlisted target and confirmation", async () => {
  const migrationModule = await migrationModulePromise;
  assert.ok(migrationModule, "server-only migration entry must exist");
  const authorize = migrationModule.authorizeTeacherNoticeOutboxMigration;
  assert.equal(typeof authorize, "function");
  const postgresUrl = "postgres://operator:secret@127.0.0.1:55439/mais_outbox_ci";
  const target = "127.0.0.1:55439/mais_outbox_ci";

  assert.deepEqual(authorize({
    postgresUrl,
    allowedTargets: target,
    mode: "preflight",
    confirmation: `preflight-teacher-notice-email-outbox-v2:${target}`
  }), { target, mode: "preflight" });
  assert.deepEqual(authorize({
    postgresUrl,
    allowedTargets: `db.example.invalid:5432/other,${target}`,
    mode: "apply",
    confirmation: `migrate-teacher-notice-email-outbox-v2:${target}`
  }), { target, mode: "apply" });

  for (const input of [
    { postgresUrl, allowedTargets: "", mode: "preflight" },
    { postgresUrl, allowedTargets: "*", mode: "preflight" },
    { postgresUrl, allowedTargets: "127.0.0.1:55439/other", mode: "preflight" },
    { postgresUrl: `${postgresUrl}?sslmode=disable`, allowedTargets: target, mode: "preflight" },
    { postgresUrl, allowedTargets: target, mode: "preflight" },
    { postgresUrl, allowedTargets: target, mode: "preflight", confirmation: "preflight-teacher-notice-email-outbox-v2" },
    { postgresUrl, allowedTargets: target, mode: "apply" },
    { postgresUrl, allowedTargets: target, mode: "apply", confirmation: "migrate-teacher-notice-email-outbox-v2" }
  ]) {
    assert.throws(() => authorize(input));
  }
});

test("migration entry is package-wired, imports userStore only after authorization, and is absent from runtime routes", async () => {
  const source = await readFile(scriptPath, "utf8");
  const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8"));
  const namedGate = packageJson.scripts?.["test:teacher-notice-outbox"] ?? "";
  assert.match(source, /await import\(["']\.\.\/lib\/server\/userStore\.ts["']\)/);
  assert.ok(
    source.indexOf("authorizeTeacherNoticeOutboxMigration") < source.indexOf('await import("../lib/server/userStore.ts")'),
    "authorization must complete before the storage module is imported"
  );
  assert.match(source, /preflightTeacherNoticeEmailOutboxPostgresSchema/);
  assert.match(source, /migrateTeacherNoticeEmailOutboxPostgresSchema/);
  assert.match(packageJson.scripts?.["teacher-notice-outbox:preflight"] ?? "", /--preflight/);
  assert.match(packageJson.scripts?.["teacher-notice-outbox:migrate"] ?? "", /--apply/);
  assert.match(namedGate, /teacher-notice-outbox-migration\.test\.mjs/);

  const apiRoot = path.join(process.cwd(), "app/api");
  const routePaths = (await readdir(apiRoot, { recursive: true }))
    .filter((entry) => typeof entry === "string" && entry.endsWith("route.ts"));
  assert.ok(routePaths.length > 0, "runtime route inventory must not be empty");
  for (const routePath of routePaths) {
    const route = await readFile(path.join(apiRoot, routePath), "utf8");
    assert.doesNotMatch(route, /teacher-notice-outbox-migration|migrateTeacherNoticeEmailOutboxPostgresSchema/);
  }
});
