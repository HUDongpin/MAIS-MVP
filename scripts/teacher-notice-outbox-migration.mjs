#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";

const allowedTargetPattern = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?:[1-9][0-9]{1,4}\/[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/u;

function teacherNoticeOutboxMigrationTarget(postgresUrl) {
  if (typeof postgresUrl !== "string" || !postgresUrl.trim()) {
    throw new Error("POSTGRES_URL is required.");
  }
  const parsed = new URL(postgresUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || parsed.search || parsed.hash) {
    throw new Error("POSTGRES_URL target is invalid.");
  }
  const database = decodeURIComponent(parsed.pathname.slice(1));
  if (!parsed.hostname || !database || database.includes("/") || database.includes("\\")) {
    throw new Error("POSTGRES_URL target is invalid.");
  }
  const target = `${parsed.hostname.toLowerCase()}:${parsed.port || "5432"}/${database}`;
  if (!allowedTargetPattern.test(target)) {
    throw new Error("POSTGRES_URL target is invalid.");
  }
  return target;
}

export function authorizeTeacherNoticeOutboxMigration({
  postgresUrl,
  allowedTargets,
  mode,
  confirmation
}) {
  if (mode !== "preflight" && mode !== "apply") {
    throw new Error("Exactly one migration mode is required.");
  }
  const target = teacherNoticeOutboxMigrationTarget(postgresUrl);
  const allowlist = typeof allowedTargets === "string"
    ? allowedTargets.split(",").map((value) => value.trim()).filter(Boolean)
    : [];
  if (
    allowlist.length === 0 ||
    allowlist.some((value) => !allowedTargetPattern.test(value)) ||
    !allowlist.includes(target)
  ) {
    throw new Error("Database target is not explicitly allowlisted.");
  }
  const expectedConfirmation = mode === "apply"
    ? `migrate-teacher-notice-email-outbox-v2:${target}`
    : `preflight-teacher-notice-email-outbox-v2:${target}`;
  if (confirmation !== expectedConfirmation) {
    throw new Error("Migration confirmation is invalid.");
  }
  return { target, mode };
}

function parseMode(argv) {
  if (argv.length !== 1 || (argv[0] !== "--preflight" && argv[0] !== "--apply")) {
    throw new Error("Use exactly one of --preflight or --apply.");
  }
  return argv[0] === "--apply" ? "apply" : "preflight";
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  authorizeTeacherNoticeOutboxMigration({
    postgresUrl: process.env.POSTGRES_URL,
    allowedTargets: process.env.MAIS_OUTBOX_MIGRATION_ALLOWED_TARGETS,
    mode,
    confirmation: process.env.MAIS_OUTBOX_MIGRATION_CONFIRMATION
  });

  process.env.HK_MATH_STORAGE_PROVIDER = "postgres";
  const store = await import("../lib/server/userStore.ts");
  if (
    typeof store.preflightTeacherNoticeEmailOutboxPostgresSchema !== "function" ||
    typeof store.migrateTeacherNoticeEmailOutboxPostgresSchema !== "function"
  ) {
    throw new Error("Teacher notice outbox migration entry is unavailable.");
  }
  if (mode === "apply") await store.migrateTeacherNoticeEmailOutboxPostgresSchema();
  const schemaReady = await store.preflightTeacherNoticeEmailOutboxPostgresSchema();
  if (schemaReady !== true) throw new Error("Teacher notice outbox schema is not ready.");
  process.stdout.write(`${JSON.stringify({ ok: true, mode, schemaReady: true })}\n`);
}

const isDirect = Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirect) {
  main().catch(() => {
    process.stderr.write(`${JSON.stringify({ ok: false, error: "teacher-notice-outbox-migration-refused-or-failed" })}\n`);
    process.exitCode = 1;
  });
}
