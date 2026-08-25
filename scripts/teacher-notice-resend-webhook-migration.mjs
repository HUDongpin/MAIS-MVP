import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";

import {
  migrateTeacherNoticeResendWebhookPostgresSchema,
  migrateTeacherNoticeResendWebhookSqliteSchema
} from "../lib/server/userStore/teacherNoticeResendWebhookPersistence.ts";
import {
  assertTeacherNoticeResendWebhookTargetConfirmation,
  assertTeacherNoticeResendWebhookTargetUnchanged,
  prepareTeacherNoticeResendWebhookMutationTarget
} from "./teacher-notice-resend-webhook-target-guard.mjs";

const allowedArguments = new Set([
  "--apply",
  "--preflight",
  "--provider=postgres",
  "--provider=sqlite"
]);
for (const argument of process.argv.slice(2)) {
  if (!allowedArguments.has(argument)) throw new Error(`Unknown argument: ${argument}`);
}

const apply = process.argv.includes("--apply");
const preflight = process.argv.includes("--preflight");
if (apply === preflight) {
  throw new Error("Choose exactly one of --preflight or --apply.");
}
const postgresProvider = process.argv.includes("--provider=postgres");
const sqliteProvider = process.argv.includes("--provider=sqlite");
if (postgresProvider === sqliteProvider) {
  throw new Error("An explicit provider is required; choose exactly one storage provider.");
}
const provider = postgresProvider ? "postgres" : "sqlite";
const target = prepareTeacherNoticeResendWebhookMutationTarget({
  action: "migrate",
  provider,
  postgresUrl: process.env.POSTGRES_URL,
  sqlitePath: process.env.HK_MATH_DB_PATH
});

if (preflight) {
  process.stdout.write(JSON.stringify({
    provider: target.provider,
    fingerprint: target.fingerprint,
    requiredConfirmation: target.requiredConfirmation
  }) + "\n");
} else {
  assertTeacherNoticeResendWebhookTargetConfirmation(
    target,
    process.env.MAIS_RESEND_WEBHOOK_MIGRATION_CONFIRM
  );
  const revalidatedTarget = prepareTeacherNoticeResendWebhookMutationTarget({
    action: "migrate",
    provider,
    postgresUrl: process.env.POSTGRES_URL,
    sqlitePath: process.env.HK_MATH_DB_PATH
  });
  assertTeacherNoticeResendWebhookTargetUnchanged(target, revalidatedTarget);
  if (provider === "postgres") {
    const sql = postgres(process.env.POSTGRES_URL, { max: 1, prepare: false });
    try {
      await migrateTeacherNoticeResendWebhookPostgresSchema(sql);
    } finally {
      await sql.end({ timeout: 5 });
    }
  } else {
    const storage = new DatabaseSync(revalidatedTarget.canonicalTarget.slice("sqlite:".length));
    try {
      migrateTeacherNoticeResendWebhookSqliteSchema(storage);
    } finally {
      storage.close();
    }
  }
}
