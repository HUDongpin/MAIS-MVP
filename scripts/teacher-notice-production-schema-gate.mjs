#!/usr/bin/env node

import { createHash, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import postgres from "postgres";

import {
  inspectTeacherNoticeEmailCronHeartbeatPostgresSchema,
  migrateTeacherNoticeEmailCronHeartbeatPostgresSchema,
  teacherNoticeEmailCronHeartbeatPostgresAdvisoryNamespace
} from "../lib/server/userStore/teacherNoticeEmailCronHeartbeatPersistence.ts";
import {
  inspectTeacherNoticeResendWebhookPostgresSchema,
  migrateTeacherNoticeResendWebhookPostgresSchema,
  teacherNoticeEmailOutboxPostgresAdvisoryDependency,
  teacherNoticeResendWebhookPostgresAdvisoryNamespace
} from "../lib/server/userStore/teacherNoticeResendWebhookPersistence.ts";

import {
  APPROVED_VERCEL_PROJECT_ID,
  APPROVED_VERCEL_PROJECT_NAME,
  APPROVED_VERCEL_TEAM_ID,
  APPROVED_VERCEL_TEAM_SLUG,
  fetchVercelApiJson,
  readVercelToken
} from "./vercel-provider-evidence.mjs";

const webhookStates = new Set(["empty", "upgradeable", "exact", "partial"]);
const heartbeatStates = new Set(["empty", "v1", "exact", "partial"]);
const sha1Pattern = /^[a-f0-9]{40}$/u;
const sha256Pattern = /^[a-f0-9]{64}$/u;
const aggregatePattern = /^(?:0|[1-9][0-9]{0,29})$/u;
const postgresVersionPattern = /^[1-9][0-9]{4,7}$/u;
const databaseOidPattern = /^(?:[1-9][0-9]{0,19})$/u;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maxGitOutputBytes = 1024 * 1024;
const maxVercelEnvironmentBytes = 4 * 1024 * 1024;

export function buildTeacherNoticeProductionSchemaPlan({
  heartbeatState,
  webhookState
}) {
  if (!webhookStates.has(webhookState) || !heartbeatStates.has(heartbeatState)) {
    throw new Error("Teacher notice production schema state was rejected.");
  }
  if (webhookState === "partial" || heartbeatState === "partial") {
    throw new Error("Teacher notice production partial schema was rejected.");
  }
  const operations = [];
  if (webhookState === "upgradeable") operations.push("webhook-v2-to-v3");
  if (webhookState === "empty") operations.push("webhook-install-v3");
  if (heartbeatState === "v1") operations.push("heartbeat-v1-to-v2");
  if (heartbeatState === "empty") operations.push("heartbeat-install-v2");
  return operations;
}

function assertAggregateStatistics(statistics) {
  if (
    !statistics ||
    typeof statistics !== "object" ||
    Array.isArray(statistics) ||
    !aggregatePattern.test(String(statistics.tableBytes ?? "")) ||
    !aggregatePattern.test(String(statistics.indexBytes ?? "")) ||
    !aggregatePattern.test(String(statistics.rowEstimate ?? ""))
  ) {
    throw new Error("Teacher notice production aggregate statistics were rejected.");
  }
  return {
    tableBytes: String(statistics.tableBytes),
    indexBytes: String(statistics.indexBytes),
    rowEstimate: String(statistics.rowEstimate)
  };
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildTeacherNoticeProductionSchemaPreflightEvidence({
  candidateSha,
  expectedTreeSha,
  heartbeatState,
  postgresMajor,
  statistics,
  targetFingerprint,
  webhookState
}) {
  const normalizedCandidateSha = String(candidateSha ?? "").trim().toLowerCase();
  const normalizedTreeSha = String(expectedTreeSha ?? "").trim().toLowerCase();
  const normalizedTargetFingerprint = String(targetFingerprint ?? "").trim().toLowerCase();
  if (
    !sha1Pattern.test(normalizedCandidateSha) ||
    !sha1Pattern.test(normalizedTreeSha) ||
    !sha256Pattern.test(normalizedTargetFingerprint) ||
    !Number.isSafeInteger(postgresMajor) ||
    postgresMajor < 16 ||
    postgresMajor > 99
  ) {
    throw new Error("Teacher notice production preflight binding was rejected.");
  }
  const operations = buildTeacherNoticeProductionSchemaPlan({
    heartbeatState,
    webhookState
  });
  const normalizedStatistics = assertAggregateStatistics(statistics);
  const safeBinding = {
    schemaVersion: 2,
    candidateSha: normalizedCandidateSha,
    expectedTreeSha: normalizedTreeSha,
    projectId: APPROVED_VERCEL_PROJECT_ID,
    projectName: APPROVED_VERCEL_PROJECT_NAME,
    teamId: APPROVED_VERCEL_TEAM_ID,
    teamSlug: APPROVED_VERCEL_TEAM_SLUG,
    targetFingerprint: normalizedTargetFingerprint,
    postgresMajor,
    webhookState,
    heartbeatState,
    operations,
    statistics: normalizedStatistics
  };
  const preflightDigest = sha256(JSON.stringify(safeBinding));
  const operationBinding = operations.length === 0 ? "none" : operations.join("+");
  const requiredConfirmation = [
    "confirm",
    "teacher-notice-production-schema",
    "v2",
    normalizedCandidateSha,
    normalizedTreeSha,
    APPROVED_VERCEL_PROJECT_ID,
    APPROVED_VERCEL_TEAM_ID,
    normalizedTargetFingerprint,
    operationBinding,
    preflightDigest
  ].join(":");
  return Object.freeze({
    ...safeBinding,
    operations: Object.freeze([...operations]),
    statistics: Object.freeze(normalizedStatistics),
    preflightDigest,
    requiredConfirmation
  });
}

export function assertTeacherNoticeProductionSchemaConfirmation(
  evidence,
  confirmation
) {
  const expected = Buffer.from(String(evidence?.requiredConfirmation ?? ""), "utf8");
  const actual = Buffer.from(typeof confirmation === "string" ? confirmation : "", "utf8");
  if (
    expected.length === 0 ||
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    throw new Error("Teacher notice production schema confirmation was rejected.");
  }
}

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(String(value ?? ""), "utf8");
}

export function buildTeacherNoticeProductionSchemaGitEnvironment(env = {}) {
  const child = {};
  for (const key of [
    "COMSPEC",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "TEMP",
    "TMP",
    "TMPDIR",
    "TZ",
    "WINDIR"
  ]) {
    if (typeof env?.[key] === "string") child[key] = env[key];
  }
  return {
    ...child,
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_KEY_0: "core.fsmonitor",
    GIT_CONFIG_KEY_1: "core.hooksPath",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_VALUE_0: "false",
    GIT_CONFIG_VALUE_1: "/dev/null",
    GIT_NO_LAZY_FETCH: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0"
  };
}

async function runQuietCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, {
      cwd: options.cwd,
      env: options.env,
      encoding: "buffer",
      maxBuffer: options.maxOutputBytes ?? maxGitOutputBytes,
      windowsHide: true
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error && typeof error.code === "number" ? error.code : error ? 1 : 0,
        stdout: toBuffer(stdout),
        stderr: toBuffer(stderr)
      });
    });
  });
}

async function runCommandText(runCommand, command, args, options) {
  const result = await runCommand(command, args, options);
  if (!result || result.exitCode !== 0) {
    throw new Error("Teacher notice production local binding was rejected.");
  }
  const output = toBuffer(result.stdout);
  if (output.length > maxGitOutputBytes) {
    throw new Error("Teacher notice production local binding was rejected.");
  }
  return output.toString("utf8").trim();
}

async function assertLocalCandidateBinding({
  candidateSha,
  env,
  expectedTreeSha,
  repositoryRoot,
  runCommand
}) {
  const commandOptions = {
    cwd: repositoryRoot,
    env: buildTeacherNoticeProductionSchemaGitEnvironment(env),
    maxOutputBytes: maxGitOutputBytes
  };
  const objectFormat = await runCommandText(
    runCommand,
    "git",
    ["rev-parse", "--show-object-format"],
    commandOptions
  );
  const head = await runCommandText(
    runCommand,
    "git",
    ["rev-parse", "--verify", "HEAD"],
    commandOptions
  );
  const tree = await runCommandText(
    runCommand,
    "git",
    ["rev-parse", "--verify", `${candidateSha}^{tree}`],
    commandOptions
  );
  const status = await runCommand(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    commandOptions
  );
  if (
    objectFormat !== "sha1" ||
    head.toLowerCase() !== candidateSha ||
    tree.toLowerCase() !== expectedTreeSha ||
    !status ||
    status.exitCode !== 0 ||
    toBuffer(status.stdout).length !== 0
  ) {
    throw new Error("Teacher notice production local binding was rejected.");
  }
}

function normalizeEnvironmentTargets(record) {
  const value = record?.target ?? record?.targets;
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === "string");
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => enabled === true)
      .map(([target]) => target);
  }
  return [];
}

function extractEnvironmentRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.envs)) return payload.envs;
  if (Array.isArray(payload?.environmentVariables)) return payload.environmentVariables;
  return [];
}

function validateProductionPostgresUrl(value) {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    value.length < 16 ||
    value.length > 16_384 ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(value)
  ) {
    throw new Error("Teacher notice production database target was rejected.");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Teacher notice production database target was rejected.");
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//u, ""));
  const sslMode = parsed.searchParams.get("sslmode");
  if (
    (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") ||
    !parsed.hostname ||
    !parsed.username ||
    !parsed.password ||
    !databaseName ||
    databaseName.includes("/") ||
    databaseName.length > 128 ||
    parsed.hash ||
    parsed.searchParams.getAll("sslmode").length !== 1 ||
    (sslMode !== "require" && sslMode !== "verify-full")
  ) {
    throw new Error("Teacher notice production database target was rejected.");
  }
  return {
    databaseName,
    hostname: parsed.hostname.toLowerCase(),
    port: parsed.port || "5432",
    raw: value
  };
}

async function withProductionPostgresSecret({
  env,
  fetchImpl,
  fetchJsonImpl,
  readTokenImpl
}, operation) {
  const token = await readTokenImpl({ env });
  const projectUrl = new URL(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(APPROVED_VERCEL_PROJECT_ID)}`
  );
  projectUrl.searchParams.set("teamId", APPROVED_VERCEL_TEAM_ID);
  const project = await fetchJsonImpl(projectUrl.href, token, {
    fetchImpl,
    maxBytes: maxVercelEnvironmentBytes,
    timeoutMs: 30_000
  });
  if (
    project?.id !== APPROVED_VERCEL_PROJECT_ID ||
    project?.name !== APPROVED_VERCEL_PROJECT_NAME ||
    project?.accountId !== APPROVED_VERCEL_TEAM_ID
  ) {
    throw new Error("Teacher notice production Vercel identity was rejected.");
  }
  const environmentUrl = new URL(
    `https://api.vercel.com/v10/projects/${encodeURIComponent(APPROVED_VERCEL_PROJECT_ID)}/env`
  );
  environmentUrl.searchParams.set("decrypt", "true");
  environmentUrl.searchParams.set("source", "vercel-cli:pull");
  environmentUrl.searchParams.set("teamId", APPROVED_VERCEL_TEAM_ID);
  const payload = await fetchJsonImpl(environmentUrl.href, token, {
    fetchImpl,
    maxBytes: maxVercelEnvironmentBytes,
    timeoutMs: 30_000
  });
  const matches = extractEnvironmentRecords(payload).filter((record) =>
    record?.key === "POSTGRES_URL" &&
    record?.type === "encrypted" &&
    normalizeEnvironmentTargets(record).includes("production") &&
    (record.gitBranch === undefined || record.gitBranch === null)
  );
  if (matches.length !== 1) {
    throw new Error("Teacher notice production POSTGRES_URL binding was rejected.");
  }
  let secret = validateProductionPostgresUrl(matches[0]?.value).raw;
  try {
    return await operation(secret);
  } finally {
    secret = null;
  }
}

function validateDatabaseInspection(inspection, productionUrl) {
  const identity = inspection?.databaseIdentity;
  const versionText = String(identity?.serverVersionNum ?? "");
  const databaseOid = String(identity?.databaseOid ?? "");
  const databaseName = typeof identity?.databaseName === "string"
    ? identity.databaseName
    : "";
  const parsedTarget = validateProductionPostgresUrl(productionUrl);
  if (
    databaseName !== parsedTarget.databaseName ||
    !databaseOidPattern.test(databaseOid) ||
    !postgresVersionPattern.test(versionText)
  ) {
    throw new Error("Teacher notice production database identity was rejected.");
  }
  const serverVersionNum = Number(versionText);
  const postgresMajor = Math.floor(serverVersionNum / 10_000);
  if (!Number.isSafeInteger(serverVersionNum) || postgresMajor < 16) {
    throw new Error("Teacher notice production PostgreSQL version was rejected.");
  }
  if (inspection?.outboxDependencyExact !== true) {
    throw new Error("Teacher notice production outbox dependency was rejected.");
  }
  const targetFingerprint = sha256([
    "teacher-notice-production-schema-target-v1",
    APPROVED_VERCEL_PROJECT_ID,
    APPROVED_VERCEL_TEAM_ID,
    parsedTarget.hostname,
    parsedTarget.port,
    databaseName,
    databaseOid,
    versionText
  ].join("\0"));
  return {
    heartbeatState: inspection?.heartbeatState,
    postgresMajor,
    statistics: assertAggregateStatistics(inspection?.statistics),
    targetFingerprint,
    webhookState: inspection?.webhookState
  };
}

async function closePostgresClient(client) {
  if (!client || typeof client.end !== "function") {
    throw new Error("Teacher notice production database client was rejected.");
  }
  await client.end({ timeout: 5 });
}

async function inspectProductionDatabase(client) {
  if (!client || typeof client.begin !== "function") {
    throw new Error("Teacher notice production database client was rejected.");
  }
  return client.begin(
    "isolation level repeatable read read only",
    async (sql) => {
      await sql.unsafe("SET LOCAL search_path = pg_catalog, public");
      await sql.unsafe("SET LOCAL lock_timeout = '2000ms'");
      await sql.unsafe("SET LOCAL statement_timeout = '15000ms'");
      await sql.unsafe("SET LOCAL idle_in_transaction_session_timeout = '15000ms'");
      for (const namespace of [
        teacherNoticeEmailOutboxPostgresAdvisoryDependency,
        teacherNoticeResendWebhookPostgresAdvisoryNamespace,
        teacherNoticeEmailCronHeartbeatPostgresAdvisoryNamespace
      ]) {
        await sql`SELECT pg_catalog.pg_advisory_xact_lock_shared(
          pg_catalog.hashtextextended(${namespace}, 0))`;
      }
      const identityRows = await sql`
        SELECT
          pg_catalog.current_database() AS "databaseName",
          database_record.oid::pg_catalog.text AS "databaseOid",
          pg_catalog.current_setting('server_version_num') AS "serverVersionNum"
        FROM pg_catalog.pg_database AS database_record
        WHERE database_record.datname = pg_catalog.current_database()
      `;
      if (!Array.isArray(identityRows) || identityRows.length !== 1) {
        throw new Error("Teacher notice production database identity was rejected.");
      }
      const webhook = await inspectTeacherNoticeResendWebhookPostgresSchema(sql);
      const heartbeatState =
        await inspectTeacherNoticeEmailCronHeartbeatPostgresSchema(sql);
      const statisticRows = await sql`
        WITH target_relations AS (
          SELECT relation.oid, relation.reltuples
          FROM pg_catalog.pg_class AS relation
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = relation.relnamespace
          WHERE namespace.nspname = 'public'
            AND relation.relkind = 'r'
            AND relation.relname IN (
              'teacher_notice_email_outbox',
              'teacher_notice_email_outbox_schema_migrations',
              'teacher_notice_resend_webhook_events',
              'teacher_notice_resend_message_state',
              'teacher_notice_resend_webhook_schema_migrations',
              'teacher_notice_email_cron_heartbeat',
              'teacher_notice_email_cron_heartbeat_schema_migrations'
            )
        )
        SELECT
          COALESCE((SELECT pg_catalog.sum(pg_catalog.pg_table_size(oid))
            FROM target_relations), 0)::pg_catalog.numeric(30, 0)::pg_catalog.text
            AS "tableBytes",
          COALESCE((SELECT pg_catalog.sum(pg_catalog.pg_indexes_size(oid))
            FROM target_relations), 0)::pg_catalog.numeric(30, 0)::pg_catalog.text
            AS "indexBytes",
          COALESCE((SELECT pg_catalog.ceil(pg_catalog.sum(
            CASE WHEN reltuples > 0 THEN reltuples ELSE 0 END
          )) FROM target_relations), 0)::pg_catalog.numeric(30, 0)::pg_catalog.text
            AS "rowEstimate"
      `;
      if (!Array.isArray(statisticRows) || statisticRows.length !== 1) {
        throw new Error("Teacher notice production aggregate statistics were rejected.");
      }
      return {
        databaseIdentity: identityRows[0],
        heartbeatState,
        outboxDependencyExact: webhook.outboxDependencyExact,
        statistics: statisticRows[0],
        webhookState: webhook.webhookState
      };
    }
  );
}

function constantTimeStringEqual(left, right) {
  const leftBuffer = Buffer.from(typeof left === "string" ? left : "", "utf8");
  const rightBuffer = Buffer.from(typeof right === "string" ? right : "", "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function resolveProductionGateDependencies(options) {
  const candidateSha = String(options.candidateSha ?? "").trim().toLowerCase();
  const expectedTreeSha = String(options.expectedTreeSha ?? "").trim().toLowerCase();
  if (!sha1Pattern.test(candidateSha) || !sha1Pattern.test(expectedTreeSha)) {
    throw new Error("invalid candidate binding");
  }
  const dependencies = {
    candidateSha,
    expectedTreeSha,
    repositoryRoot: path.resolve(options.repoRoot ?? repoRoot),
    runCommand: options.runCommand ?? runQuietCommand,
    readTokenImpl: options.readTokenImpl ?? readVercelToken,
    fetchJsonImpl: options.fetchJsonImpl ?? fetchVercelApiJson,
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    env: options.env ?? process.env,
    connectPostgres: options.connectPostgres ?? ((url) => postgres(url, {
      connect_timeout: 10,
      idle_timeout: 5,
      max: 1,
      prepare: false
    })),
    inspectDatabase: options.inspectDatabase ?? inspectProductionDatabase
  };
  if (
    typeof dependencies.runCommand !== "function" ||
    typeof dependencies.readTokenImpl !== "function" ||
    typeof dependencies.fetchJsonImpl !== "function" ||
    typeof dependencies.fetchImpl !== "function" ||
    typeof dependencies.connectPostgres !== "function" ||
    typeof dependencies.inspectDatabase !== "function"
  ) {
    throw new Error("invalid dependencies");
  }
  return dependencies;
}

function localBindingFromDependencies(dependencies) {
  return {
    candidateSha: dependencies.candidateSha,
    env: dependencies.env,
    expectedTreeSha: dependencies.expectedTreeSha,
    repositoryRoot: dependencies.repositoryRoot,
    runCommand: dependencies.runCommand
  };
}

async function readProductionInspection(dependencies) {
  return withProductionPostgresSecret(dependencies, async (productionUrl) => {
    const client = await dependencies.connectPostgres(productionUrl);
    try {
      return validateDatabaseInspection(
        await dependencies.inspectDatabase(client),
        productionUrl
      );
    } finally {
      await closePostgresClient(client);
    }
  });
}

function evidenceFromInspection(dependencies, inspection) {
  return buildTeacherNoticeProductionSchemaPreflightEvidence({
    candidateSha: dependencies.candidateSha,
    expectedTreeSha: dependencies.expectedTreeSha,
    ...inspection
  });
}

export async function preflightTeacherNoticeProductionSchema(options = {}) {
  try {
    const dependencies = resolveProductionGateDependencies(options);
    const localBinding = localBindingFromDependencies(dependencies);
    await assertLocalCandidateBinding(localBinding);
    const inspected = await readProductionInspection(dependencies);
    await assertLocalCandidateBinding(localBinding);
    return evidenceFromInspection(dependencies, inspected);
  } catch {
    throw new Error("Teacher notice production schema preflight failed; details redacted.");
  }
}

async function applyConfirmedMigrations(client, operations) {
  for (const operation of operations) {
    if (operation === "webhook-v2-to-v3" || operation === "webhook-install-v3") {
      await migrateTeacherNoticeResendWebhookPostgresSchema(client);
    } else if (
      operation === "heartbeat-install-v2" ||
      operation === "heartbeat-v1-to-v2"
    ) {
      await migrateTeacherNoticeEmailCronHeartbeatPostgresSchema(client);
    } else {
      throw new Error("Teacher notice production schema operation was rejected.");
    }
  }
}

function assertSameConfirmedPreflight(expected, current) {
  if (
    !constantTimeStringEqual(expected?.preflightDigest, current?.preflightDigest) ||
    !constantTimeStringEqual(expected?.targetFingerprint, current?.targetFingerprint) ||
    JSON.stringify(expected?.operations) !== JSON.stringify(current?.operations)
  ) {
    throw new Error("Teacher notice production schema preflight changed.");
  }
}

function assertExactPostflight(preflight, postflight) {
  if (
    postflight?.webhookState !== "exact" ||
    postflight?.heartbeatState !== "exact" ||
    !constantTimeStringEqual(
      preflight?.targetFingerprint,
      postflight?.targetFingerprint
    )
  ) {
    throw new Error("Teacher notice production schema post-attestation failed.");
  }
}

export async function applyTeacherNoticeProductionSchema(options = {}) {
  try {
    const dependencies = resolveProductionGateDependencies(options);
    const localBinding = localBindingFromDependencies(dependencies);
    const applyMigrations = options.applyMigrations ?? applyConfirmedMigrations;
    if (typeof applyMigrations !== "function") {
      throw new Error("invalid apply dependency");
    }

    const confirmedPreflight = await preflightTeacherNoticeProductionSchema(options);
    assertTeacherNoticeProductionSchemaConfirmation(
      confirmedPreflight,
      options.confirmation
    );
    await assertLocalCandidateBinding(localBinding);

    const sameConnectionPostflight = await withProductionPostgresSecret(
      dependencies,
      async (productionUrl) => {
        const client = await dependencies.connectPostgres(productionUrl);
        try {
          const immediatePreflight = evidenceFromInspection(
            dependencies,
            validateDatabaseInspection(
              await dependencies.inspectDatabase(client),
              productionUrl
            )
          );
          assertSameConfirmedPreflight(confirmedPreflight, immediatePreflight);
          assertTeacherNoticeProductionSchemaConfirmation(
            immediatePreflight,
            options.confirmation
          );
          await assertLocalCandidateBinding(localBinding);
          await applyMigrations(client, [...immediatePreflight.operations]);
          const postflight = evidenceFromInspection(
            dependencies,
            validateDatabaseInspection(
              await dependencies.inspectDatabase(client),
              productionUrl
            )
          );
          assertExactPostflight(confirmedPreflight, postflight);
          return postflight;
        } finally {
          await closePostgresClient(client);
        }
      }
    );
    await assertLocalCandidateBinding(localBinding);

    const independentlyRefetchedPostflight = evidenceFromInspection(
      dependencies,
      await readProductionInspection(dependencies)
    );
    assertExactPostflight(confirmedPreflight, independentlyRefetchedPostflight);
    await assertLocalCandidateBinding(localBinding);

    return Object.freeze({
      candidateSha: confirmedPreflight.candidateSha,
      expectedTreeSha: confirmedPreflight.expectedTreeSha,
      operations: confirmedPreflight.operations,
      preflightDigest: confirmedPreflight.preflightDigest,
      projectId: APPROVED_VERCEL_PROJECT_ID,
      teamId: APPROVED_VERCEL_TEAM_ID,
      targetFingerprint: confirmedPreflight.targetFingerprint,
      postflight: independentlyRefetchedPostflight,
      sameConnectionPostflight
    });
  } catch {
    throw new Error("Teacher notice production schema apply failed; details redacted.");
  }
}

function parseCliArguments(argv) {
  const parsed = {
    apply: false,
    dryRun: false,
    preflight: false,
    candidateSha: undefined,
    expectedTreeSha: undefined
  };
  for (const argument of argv) {
    if (argument === "--apply") parsed.apply = true;
    else if (argument === "--dry-run") parsed.dryRun = true;
    else if (argument === "--preflight") parsed.preflight = true;
    else if (argument.startsWith("--candidate-sha=")) {
      if (parsed.candidateSha !== undefined) throw new Error("duplicate argument");
      parsed.candidateSha = argument.slice("--candidate-sha=".length);
    } else if (argument.startsWith("--expected-tree-sha=")) {
      if (parsed.expectedTreeSha !== undefined) throw new Error("duplicate argument");
      parsed.expectedTreeSha = argument.slice("--expected-tree-sha=".length);
    } else {
      throw new Error("unknown argument");
    }
  }
  const modeCount = Number(parsed.apply) + Number(parsed.dryRun) + Number(parsed.preflight);
  if (modeCount !== 1) throw new Error("exactly one mode is required");
  return parsed;
}

async function main() {
  const arguments_ = parseCliArguments(process.argv.slice(2));
  if (arguments_.dryRun) {
    process.stdout.write(`${JSON.stringify({
      mode: "dry-run",
      mutation: false,
      network: false,
      ok: true,
      projectId: APPROVED_VERCEL_PROJECT_ID,
      teamId: APPROVED_VERCEL_TEAM_ID
    })}\n`);
    return;
  }
  const candidateSha = arguments_.candidateSha ?? process.env.MAIS_RELEASE_SHA;
  const expectedTreeSha = arguments_.expectedTreeSha ?? process.env.MAIS_RELEASE_TREE_SHA;
  if (arguments_.preflight) {
    const evidence = await preflightTeacherNoticeProductionSchema({
      candidateSha,
      expectedTreeSha
    });
    process.stdout.write(`${JSON.stringify({
      ...evidence,
      mode: "preflight",
      mutation: false,
      network: true,
      ok: true
    })}\n`);
    return;
  }
  const evidence = await applyTeacherNoticeProductionSchema({
    candidateSha,
    confirmation: process.env.MAIS_TEACHER_NOTICE_PRODUCTION_SCHEMA_CONFIRM,
    expectedTreeSha
  });
  process.stdout.write(`${JSON.stringify({
    ...evidence,
    mode: "apply",
    mutation: true,
    network: true,
    ok: true
  })}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch(() => {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      status: "teacher-notice-production-schema-gate-failed",
      detail: "redacted"
    })}\n`);
    process.exitCode = 1;
  });
}
