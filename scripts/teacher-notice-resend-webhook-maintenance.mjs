import { existsSync } from "node:fs";
import postgres from "postgres";

import {
  maintainTeacherNoticeResendWebhookPostgres,
  maintainTeacherNoticeResendWebhookSqlite,
  teacherNoticeResendWebhookMaintenanceBudgetMs
} from "../lib/server/userStore/teacherNoticeResendWebhookPersistence.ts";
import {
  assertTeacherNoticeResendWebhookTargetConfirmation,
  assertTeacherNoticeResendWebhookTargetUnchanged,
  prepareTeacherNoticeResendWebhookMutationTarget
} from "./teacher-notice-resend-webhook-target-guard.mjs";

const plainArguments = new Set([
  "--apply",
  "--preflight",
  "--provider=postgres",
  "--provider=sqlite"
]);
let reconciliationLimit = 100;
let retentionLimit = 100;
for (const argument of process.argv.slice(2)) {
  if (plainArguments.has(argument)) continue;
  const match = /^--(reconciliation|retention)-limit=([1-9][0-9]{0,3})$/u.exec(argument);
  if (!match) throw new Error(`Unknown argument: ${argument}`);
  const value = Number(match[2]);
  if (!Number.isSafeInteger(value) || value > 1_000) {
    throw new Error(`${match[1]} limit must be between 1 and 1000.`);
  }
  if (match[1] === "reconciliation") reconciliationLimit = value;
  else retentionLimit = value;
}

const apply = process.argv.includes("--apply");
const preflight = process.argv.includes("--preflight");
if (apply === preflight) throw new Error("Choose exactly one of --preflight or --apply.");
const postgresProvider = process.argv.includes("--provider=postgres");
const sqliteProvider = process.argv.includes("--provider=sqlite");
if (postgresProvider === sqliteProvider) {
  throw new Error("An explicit provider is required; choose exactly one storage provider.");
}
const provider = postgresProvider ? "postgres" : "sqlite";
const target = prepareTeacherNoticeResendWebhookMutationTarget({
  action: "maintain",
  provider,
  postgresUrl: process.env.POSTGRES_URL,
  sqlitePath: process.env.HK_MATH_DB_PATH
});

if (preflight) {
  process.stdout.write(JSON.stringify({
    provider: target.provider,
    fingerprint: target.fingerprint,
    requiredConfirmation: target.requiredConfirmation,
    reconciliationLimit,
    retentionLimit
  }) + "\n");
} else {
  assertTeacherNoticeResendWebhookTargetConfirmation(
    target,
    process.env.MAIS_RESEND_WEBHOOK_MAINTENANCE_CONFIRM
  );
  const revalidatedTarget = prepareTeacherNoticeResendWebhookMutationTarget({
    action: "maintain",
    provider,
    postgresUrl: process.env.POSTGRES_URL,
    sqlitePath: process.env.HK_MATH_DB_PATH
  });
  assertTeacherNoticeResendWebhookTargetUnchanged(target, revalidatedTarget);
  const monotonicNow = () => globalThis.performance.now();
  const deadlineAt = monotonicNow() + teacherNoticeResendWebhookMaintenanceBudgetMs;
  let result;
  if (provider === "postgres") {
    const sql = postgres(process.env.POSTGRES_URL, { max: 1, prepare: false });
    try {
      result = await maintainTeacherNoticeResendWebhookPostgres(sql, {
        reconciliationLimit,
        retentionLimit,
        deadlineAt,
        monotonicNow
      });
    } finally {
      await sql.end({ timeout: 5 });
    }
  } else {
    const dbPath = revalidatedTarget.canonicalTarget.slice("sqlite:".length);
    if (!existsSync(dbPath)) {
      throw new Error("SQLite maintenance target must already exist.");
    }
    result = await maintainTeacherNoticeResendWebhookSqlite(dbPath, {
      reconciliationLimit,
      retentionLimit,
      deadlineAt,
      monotonicNow
    });
  }
  process.stdout.write(JSON.stringify(result) + "\n");
}
