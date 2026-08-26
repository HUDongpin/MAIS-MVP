import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  assertTeacherNoticeResendWebhookTargetConfirmation,
  assertTeacherNoticeResendWebhookTargetUnchanged,
  prepareTeacherNoticeResendWebhookMutationTarget
} from "./teacher-notice-resend-webhook-target-guard.mjs";

const migrationScript = new URL("./teacher-notice-resend-webhook-migration.mjs", import.meta.url);
const maintenanceScript = new URL("./teacher-notice-resend-webhook-maintenance.mjs", import.meta.url);

function runMigration(args, environment = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", migrationScript.pathname, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      POSTGRES_URL: "",
      HK_MATH_DB_PATH: "",
      HK_MATH_STORAGE_PROVIDER: "",
      MAIS_RESEND_WEBHOOK_MIGRATION_CONFIRM: "",
      ...environment
    }
  });
}

function runMaintenance(args, environment = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", maintenanceScript.pathname, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      POSTGRES_URL: "",
      HK_MATH_DB_PATH: "",
      MAIS_RESEND_WEBHOOK_MAINTENANCE_CONFIRM: "",
      ...environment
    }
  });
}

test("target guard accepts only canonical disposable PostgreSQL and bounded SQLite targets", () => {
  const postgresTarget = prepareTeacherNoticeResendWebhookMutationTarget({
    action: "migrate",
    provider: "postgres",
    postgresUrl: "postgres://fixture:fixture@127.0.0.1:5432/mais_resend_webhook_test_review"
  });
  assert.equal(postgresTarget.provider, "postgres");
  assert.match(postgresTarget.fingerprint, /^[a-f0-9]{64}$/u);
  assert.doesNotMatch(postgresTarget.canonicalTarget, /fixture/u);
  assert.doesNotThrow(() => assertTeacherNoticeResendWebhookTargetConfirmation(
    postgresTarget,
    postgresTarget.requiredConfirmation
  ));
  assert.throws(
    () => assertTeacherNoticeResendWebhookTargetConfirmation(postgresTarget, "mismatched"),
    /confirmation/i
  );
  assert.doesNotThrow(() => assertTeacherNoticeResendWebhookTargetUnchanged(
    postgresTarget,
    { ...postgresTarget }
  ));
  assert.throws(() => assertTeacherNoticeResendWebhookTargetUnchanged(
    postgresTarget,
    { ...postgresTarget, fingerprint: "0".repeat(64) }
  ), /changed/i);

  for (const postgresUrl of [
    "postgres://user:pass@db.production.example/mais_resend_webhook_test_review",
    "postgres://user:pass@127.0.0.1/postgres",
    "postgres://user:pass@127.0.0.1/mais_production",
    "postgres://user:pass@127.0.0.1/mais_resend_webhook_test_review?sslmode=require"
  ]) {
    assert.throws(() => prepareTeacherNoticeResendWebhookMutationTarget({
      action: "migrate",
      provider: "postgres",
      postgresUrl
    }), /disposable|loopback|query/i);
  }

  const sqlitePath = path.join(tmpdir(), "mais-resend-webhook-tests", "migration.sqlite");
  mkdirSync(path.dirname(sqlitePath), { recursive: true });
  const sqliteTarget = prepareTeacherNoticeResendWebhookMutationTarget({
    action: "migrate",
    provider: "sqlite",
    sqlitePath
  });
  assert.equal(
    sqliteTarget.canonicalTarget,
    `sqlite:${path.join(
      realpathSync.native(tmpdir()),
      "mais-resend-webhook-tests",
      path.basename(sqlitePath)
    )}`
  );
  for (const broadPath of ["/", path.join(tmpdir(), "owner.sqlite"), process.cwd()]) {
    assert.throws(() => prepareTeacherNoticeResendWebhookMutationTarget({
      action: "migrate",
      provider: "sqlite",
      sqlitePath: broadPath
    }), /allowlisted|file/i);
  }
});

test("dangling SQLite file symlinks fail before a subprocess can create the outside target", async () => {
  const allowedRoot = path.join(tmpdir(), "mais-resend-webhook-tests");
  const outside = await mkdtemp(path.join(tmpdir(), "mais-resend-webhook-broken-outside-"));
  const outsideTarget = path.join(outside, "outside.sqlite");
  const link = path.join(allowedRoot, `broken-${process.pid}-${Date.now()}.sqlite`);
  await mkdir(allowedRoot, { recursive: true });
  await symlink(outsideTarget, link);
  try {
    assert.throws(() => prepareTeacherNoticeResendWebhookMutationTarget({
      action: "migrate",
      provider: "sqlite",
      sqlitePath: link
    }), /symbolic|symlink/i);

    const canonicalTarget = `sqlite:${path.join(realpathSync.native(allowedRoot), path.basename(link))}`;
    const fingerprint = createHash("sha256")
      .update(`teacher-notice-resend-webhook-v2\0migrate\0${canonicalTarget}`)
      .digest("hex");
    const subprocess = runMigration(["--apply", "--provider=sqlite"], {
      HK_MATH_DB_PATH: link,
      MAIS_RESEND_WEBHOOK_MIGRATION_CONFIRM: `confirm:migrate:${fingerprint}`
    });
    assert.notEqual(subprocess.status, 0);
    assert.match(`${subprocess.stderr}${subprocess.stdout}`, /symbolic|symlink/i);
    assert.equal(existsSync(outsideTarget), false);
  } finally {
    await rm(link, { force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("canonical SQLite guard rejects an allowlisted lexical path that escapes through a symlink", async () => {
  const allowedRoot = path.join(tmpdir(), "mais-resend-webhook-tests");
  const outside = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(path.join(tmpdir(), "mais-resend-webhook-outside-"))
  );
  const link = path.join(allowedRoot, `escape-${process.pid}-${Date.now()}`);
  await mkdir(allowedRoot, { recursive: true });
  await symlink(outside, link);
  try {
    assert.throws(() => prepareTeacherNoticeResendWebhookMutationTarget({
      action: "migrate",
      provider: "sqlite",
      sqlitePath: path.join(link, "escaped.sqlite")
    }), /canonical|symlink|allowlisted/i);
  } finally {
    await rm(link, { force: true });
    await rm(outside, { recursive: true, force: true });
  }

  const cwd = await mkdtemp(path.join(tmpdir(), "mais-resend-webhook-cwd-"));
  const escapedRoot = await mkdtemp(path.join(tmpdir(), "mais-resend-webhook-root-escape-"));
  await symlink(escapedRoot, path.join(cwd, ".local"));
  try {
    assert.throws(() => prepareTeacherNoticeResendWebhookMutationTarget({
      action: "migrate",
      provider: "sqlite",
      sqlitePath: path.join(cwd, ".local", "escaped.sqlite"),
      cwd
    }), /canonical|symlink|allowlisted/i);
  } finally {
    await rm(cwd, { recursive: true, force: true });
    await rm(escapedRoot, { recursive: true, force: true });
  }
});

test("migration subprocess rejects missing provider, unsafe targets, and mismatch before opening storage", () => {
  const noProvider = runMigration(["--apply"]);
  assert.notEqual(noProvider.status, 0);
  assert.match(`${noProvider.stderr}${noProvider.stdout}`, /explicit.*provider/i);

  const production = runMigration(["--apply", "--provider=postgres"], {
    POSTGRES_URL: "postgres://private:private@db.production.example/mais_resend_webhook_ci",
    MAIS_RESEND_WEBHOOK_MIGRATION_CONFIRM: "not-valid"
  });
  assert.notEqual(production.status, 0);
  assert.match(`${production.stderr}${production.stdout}`, /loopback|container/i);

  const broad = runMigration(["--apply", "--provider=sqlite"], {
    HK_MATH_DB_PATH: path.join(tmpdir(), "owner.sqlite"),
    MAIS_RESEND_WEBHOOK_MIGRATION_CONFIRM: "not-valid"
  });
  assert.notEqual(broad.status, 0);
  assert.match(`${broad.stderr}${broad.stdout}`, /allowlisted/i);

  const unopened = path.join(tmpdir(), "mais-resend-webhook-tests", "mismatched.sqlite");
  assert.equal(existsSync(unopened), false);
  const mismatch = runMigration(["--apply", "--provider=sqlite"], {
    HK_MATH_DB_PATH: unopened,
    MAIS_RESEND_WEBHOOK_MIGRATION_CONFIRM: "not-valid"
  });
  assert.notEqual(mismatch.status, 0);
  assert.match(`${mismatch.stderr}${mismatch.stdout}`, /confirmation/i);
  assert.equal(existsSync(unopened), false, "confirmation must fail before the SQLite file is opened");
});

test("destructive PostgreSQL target confirmation is action- and target-bound", () => {
  const target = prepareTeacherNoticeResendWebhookMutationTarget({
    action: "destroy-test",
    provider: "postgres",
    postgresUrl: "postgres://postgres:postgres@localhost:5432/mais_resend_webhook_ci"
  });
  assert.match(target.requiredConfirmation, /^confirm:destroy-test:/u);
  const other = prepareTeacherNoticeResendWebhookMutationTarget({
    action: "destroy-test",
    provider: "postgres",
    postgresUrl: "postgres://postgres:postgres@localhost:5432/mais_resend_webhook_test_other"
  });
  assert.notEqual(target.requiredConfirmation, other.requiredConfirmation);
  assert.throws(
    () => assertTeacherNoticeResendWebhookTargetConfirmation(target, other.requiredConfirmation),
    /confirmation/i
  );
});

test("maintenance subprocess is explicit, target-bound, and fails before opening storage", () => {
  const noProvider = runMaintenance(["--apply"]);
  assert.notEqual(noProvider.status, 0);
  assert.match(`${noProvider.stderr}${noProvider.stdout}`, /explicit.*provider/i);

  const unopened = path.join(
    tmpdir(),
    "mais-resend-webhook-tests",
    `maintenance-mismatch-${process.pid}.sqlite`
  );
  assert.equal(existsSync(unopened), false);
  const mismatch = runMaintenance(["--apply", "--provider=sqlite"], {
    HK_MATH_DB_PATH: unopened,
    MAIS_RESEND_WEBHOOK_MAINTENANCE_CONFIRM: "not-valid"
  });
  assert.notEqual(mismatch.status, 0);
  assert.match(`${mismatch.stderr}${mismatch.stdout}`, /confirmation/i);
  assert.equal(existsSync(unopened), false);
});

test("package and CI wire the focused and non-skipping PostgreSQL gates", async () => {
  const [{ readFile }, packageJson] = await Promise.all([
    import("node:fs/promises"),
    import("../package.json", { with: { type: "json" } }).then((module) => module.default)
  ]);
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const migrationSource = await readFile(migrationScript, "utf8");
  const maintenanceSource = await readFile(maintenanceScript, "utf8");
  assert.equal(
    packageJson.scripts["test:teacher-notice-resend-webhook"],
    "node scripts/run-teacher-notice-resend-webhook-tests.mjs"
  );
  assert.match(packageJson.scripts["migrate:teacher-notice-resend-webhook"], /--import tsx/u);
  assert.match(packageJson.scripts["maintain:teacher-notice-resend-webhook"], /--import tsx/u);
  assert.match(workflow, /resend-webhook-postgres-integration:/u);
  assert.match(workflow, /postgres:16-alpine/u);
  assert.match(workflow, /MAIS_RESEND_WEBHOOK_POSTGRES_INTEGRATION_CONFIRM:/u);
  assert.match(workflow, /npm run test:teacher-notice-resend-webhook:postgres/u);
  assert.doesNotMatch(workflow, /RESEND_WEBHOOK_PG_OPTIONAL|continue-on-error/u);
  assert.match(migrationSource, /assertTeacherNoticeResendWebhookTargetUnchanged/u);
  assert.match(maintenanceSource, /assertTeacherNoticeResendWebhookTargetUnchanged/u);
});
