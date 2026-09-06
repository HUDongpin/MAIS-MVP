#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const cwd = process.cwd();
const scriptName = path.basename(fileURLToPath(import.meta.url));
const safeOutputRoots = [".local", ".tmp", "tmp", "temp", os.tmpdir()];

function usage() {
  return [
    `Usage: node scripts/${scriptName} --old <old-export.json> --current <fresh-export.json> [--out .local/postgres-migration/merged.json] [--summary-out <summary.json>] [--apply --confirm-apply apply-merged-snapshot]`,
    "",
    "Merges account registration records from an old admin storage export into a fresh admin storage export.",
    "Default behavior is dry-run: it prints safe counts only and does not write a merged snapshot.",
    "",
    "Safety rules:",
    "- admin users are skipped by default;",
    "- users with id, username, or email conflicts are skipped;",
    "- full merged snapshots may only be written under .local/, .tmp/, tmp/, temp/, or the OS temp directory;",
    "- live apply requires POSTGRES_URL in the process environment and an explicit confirmation string;",
    "- live apply refuses to write if POSTGRES_URL app_state no longer matches --current;",
    "- stdout never includes usernames, emails, password hashes, salts, cookies, or database URLs.",
    "",
    "Options:",
    "  --old <path>          Old quota-exhausted database admin export JSON.",
    "  --current <path>      Current fresh Postgres admin export JSON.",
    "  --out <path>          Write merged full snapshot JSON to a safe local-only path.",
    "  --summary-out <path>  Write safe summary JSON.",
    "  --apply               Write merged database payload to POSTGRES_URL app_state.",
    "  --confirm-apply <text>",
    "  --include-admins      Include old admin users. Requires --confirm-include-admins include-admins.",
    "  --confirm-include-admins <text>",
    "  --self-test           Run in-memory tests without reading files."
  ].join("\n");
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (key === "self-test" || key === "include-admins" || key === "apply") {
      args[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    args[key] = value;
    index += 1;
  }
  return args;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function assertSnapshot(value, label) {
  if (!isRecord(value) || !isRecord(value.database)) {
    throw new Error(`${label} must be an admin storage export with a database object.`);
  }
  if (!Array.isArray(value.database.users)) {
    throw new Error(`${label}.database.users must be an array.`);
  }
  return value;
}

function normalizeKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function userIndexes(users) {
  const ids = new Set();
  const usernames = new Set();
  const emails = new Set();
  users.forEach((user) => {
    if (!isRecord(user)) return;
    const id = typeof user.id === "string" ? user.id : "";
    const username = normalizeKey(user.normalized_username || user.username);
    const email = normalizeKey(user.normalized_email || user.email);
    if (id) ids.add(id);
    if (username) usernames.add(username);
    if (email) emails.add(email);
  });
  return { ids, usernames, emails };
}

function safeArray(database, table) {
  if (!Array.isArray(database[table])) database[table] = [];
  return database[table];
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function rowKey(row, keys) {
  if (!isRecord(row)) return "";
  return keys.map((key) => row[key] ?? "").join("\u001f");
}

function appendUniqueRows(target, source, keys, predicate) {
  const existing = new Set(target.map((row) => rowKey(row, keys)).filter(Boolean));
  let added = 0;
  let skippedConflicts = 0;
  source.forEach((row) => {
    const key = rowKey(row, keys);
    if (!key || !predicate(row)) return;
    if (existing.has(key)) {
      skippedConflicts += 1;
      return;
    }
    target.push(cloneJson(row));
    existing.add(key);
    added += 1;
  });
  return { added, skippedConflicts };
}

function mergeSnapshots(oldSnapshot, currentSnapshot, options = {}) {
  const oldDatabase = oldSnapshot.database;
  const merged = cloneJson(currentSnapshot);
  merged.generatedAt = new Date().toISOString();
  merged.mergedFrom = {
    oldGeneratedAt: typeof oldSnapshot.generatedAt === "string" ? oldSnapshot.generatedAt : null,
    currentGeneratedAt: typeof currentSnapshot.generatedAt === "string" ? currentSnapshot.generatedAt : null,
    mode: "registration-focused-admin-export-merge"
  };

  const currentUsers = safeArray(merged.database, "users");
  const indexes = userIndexes(currentUsers);
  const importedUserIds = new Set();
  const skippedUsers = {
    invalid: 0,
    admin: 0,
    idConflict: 0,
    usernameConflict: 0,
    emailConflict: 0
  };

  safeArray(oldDatabase, "users").forEach((user) => {
    if (!isRecord(user) || typeof user.id !== "string" || !user.id) {
      skippedUsers.invalid += 1;
      return;
    }
    if (user.role === "admin" && !options.includeAdmins) {
      skippedUsers.admin += 1;
      return;
    }

    const username = normalizeKey(user.normalized_username || user.username);
    const email = normalizeKey(user.normalized_email || user.email);
    if (indexes.ids.has(user.id)) {
      skippedUsers.idConflict += 1;
      return;
    }
    if (username && indexes.usernames.has(username)) {
      skippedUsers.usernameConflict += 1;
      return;
    }
    if (email && indexes.emails.has(email)) {
      skippedUsers.emailConflict += 1;
      return;
    }

    currentUsers.push(cloneJson(user));
    indexes.ids.add(user.id);
    if (username) indexes.usernames.add(username);
    if (email) indexes.emails.add(email);
    importedUserIds.add(user.id);
  });

  const mergedUserIds = new Set(currentUsers.map((user) => user.id).filter(Boolean));
  const importedOrKnownUser = (id) => typeof id === "string" && mergedUserIds.has(id);
  const ownedByImportedUser = (row, field = "user_id") => isRecord(row) && importedUserIds.has(row[field]);
  const counts = {
    users: importedUserIds.size,
    studentProfiles: appendUniqueRows(
      safeArray(merged.database, "student_profiles"),
      safeArray(oldDatabase, "student_profiles"),
      ["user_id"],
      (row) => ownedByImportedUser(row)
    ),
    userSettings: appendUniqueRows(
      safeArray(merged.database, "user_settings"),
      safeArray(oldDatabase, "user_settings"),
      ["user_id"],
      (row) => ownedByImportedUser(row)
    ),
    learnerProfiles: appendUniqueRows(
      safeArray(merged.database, "learner_profiles"),
      safeArray(oldDatabase, "learner_profiles"),
      ["user_id"],
      (row) => ownedByImportedUser(row)
    ),
    guardianLinks: appendUniqueRows(
      safeArray(merged.database, "guardian_links"),
      safeArray(oldDatabase, "guardian_links"),
      ["id"],
      (row) => (
        isRecord(row) &&
        (importedUserIds.has(row.parent_id) || importedUserIds.has(row.student_id)) &&
        importedOrKnownUser(row.parent_id) &&
        importedOrKnownUser(row.student_id)
      )
    )
  };

  const summary = {
    generatedAt: merged.generatedAt,
    dryRun: !options.writeSnapshot,
    includeAdmins: Boolean(options.includeAdmins),
    imported: {
      users: counts.users,
      studentProfiles: counts.studentProfiles.added,
      userSettings: counts.userSettings.added,
      learnerProfiles: counts.learnerProfiles.added,
      guardianLinks: counts.guardianLinks.added
    },
    skippedUsers,
    skippedExistingRows: {
      studentProfiles: counts.studentProfiles.skippedConflicts,
      userSettings: counts.userSettings.skippedConflicts,
      learnerProfiles: counts.learnerProfiles.skippedConflicts,
      guardianLinks: counts.guardianLinks.skippedConflicts
    },
    warnings: [
      "This tool is registration-focused; it does not claim to merge every historical learning, teacher, assignment, or analytics record.",
      "Review imported counts before applying the merged snapshot to a live database.",
      "The merged snapshot contains password hashes/salts and must remain in ignored local storage."
    ]
  };

  return { merged, summary };
}

function assertSafeOutputPath(outputPath) {
  const resolved = path.resolve(cwd, outputPath);
  const relative = path.relative(cwd, resolved);
  const insideRepoSafeRoot = safeOutputRoots
    .filter((root) => !path.isAbsolute(root))
    .some((root) => relative === root || relative.startsWith(`${root}${path.sep}`));
  const insideOsTmp = resolved === os.tmpdir() || resolved.startsWith(`${os.tmpdir()}${path.sep}`);
  if (!insideRepoSafeRoot && !insideOsTmp) {
    throw new Error(`Refusing to write full snapshot outside ignored local roots: ${outputPath}`);
  }
  return resolved;
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function applyMergedSnapshotInTransaction(
  transactionSql,
  snapshot,
  expectedCurrentDatabase
) {
  const schemaVersion = Number(snapshot.schemaVersion);
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error("Merged snapshot schema version is invalid.");
  }
  await transactionSql`
    SELECT
      pg_catalog.set_config('search_path', 'pg_catalog, public', true),
      pg_catalog.set_config('lock_timeout', '5000ms', true),
      pg_catalog.set_config('statement_timeout', '60000ms', true)
  `;
  const rows = await transactionSql`
    SELECT revision, payload
    FROM public.app_state
    WHERE id = 'primary'
      AND tenant_id = 'platform'
      AND state_kind = 'app-snapshot'
      AND schema_version = ${schemaVersion}
    FOR UPDATE OF app_state
  `;
  const currentRevision = Number(rows[0]?.revision);
  if (
    rows.length !== 1
    || !Number.isSafeInteger(currentRevision)
    || currentRevision < 1
    || !rows[0]?.payload
  ) {
    throw new Error("Target POSTGRES_URL does not contain the expected app_state row.");
  }
  if (stableStringify(rows[0].payload) !== stableStringify(expectedCurrentDatabase)) {
    throw new Error("Target app_state differs from --current snapshot; re-export current fresh state before applying.");
  }
  const updatedRows = await transactionSql`
    UPDATE public.app_state
    SET payload = ${JSON.stringify(snapshot.database)}::pg_catalog.jsonb,
        revision = public.app_state.revision + 1,
        updated_at = ${new Date().toISOString()}
    WHERE id = 'primary'
      AND tenant_id = 'platform'
      AND state_kind = 'app-snapshot'
      AND schema_version = ${schemaVersion}
      AND revision = ${currentRevision}
      AND payload = ${JSON.stringify(expectedCurrentDatabase)}::pg_catalog.jsonb
    RETURNING public.app_state.revision
  `;
  if (updatedRows.length !== 1 || Number(updatedRows[0]?.revision) !== currentRevision + 1) {
    throw new Error("Target app_state changed while the merged snapshot was being applied.");
  }
  await transactionSql`
    DELETE FROM public.app_state_readiness_markers
    WHERE state_id = 'primary'
  `;
  return { revision: currentRevision + 1, storageReady: false };
}

async function applyMergedSnapshotToPostgres(snapshot, expectedCurrentDatabase) {
  const postgresUrl = process.env.POSTGRES_URL?.trim();
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL is required for --apply.");
  }

  const sql = postgres(postgresUrl, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 3,
    prepare: false
  });
  try {
    return await sql.begin(async (transactionSql) => {
      return applyMergedSnapshotInTransaction(transactionSql, snapshot, expectedCurrentDatabase);
    });
  } finally {
    await sql.end({ timeout: 3 }).catch(() => {});
  }
}

function fakeSnapshot(database) {
  return {
    generatedAt: "2026-06-06T00:00:00.000Z",
    schemaVersion: 1,
    storage: { provider: "postgres", path: "postgres://[redacted]" },
    database: {
      users: [],
      student_profiles: [],
      user_settings: [],
      learner_profiles: [],
      guardian_links: [],
      ...database
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runSelfTest() {
  const current = fakeSnapshot({
    users: [
      {
        id: "student-current",
        username: "Current Student",
        normalized_username: "current student",
        email: "current@example.test",
        normalized_email: "current@example.test",
        role: "student"
      }
    ],
    student_profiles: [{ user_id: "student-current", name: "Current Student" }]
  });
  const old = fakeSnapshot({
    users: [
      {
        id: "student-old",
        username: "Old Student",
        normalized_username: "old student",
        email: "old@example.test",
        normalized_email: "old@example.test",
        role: "student"
      },
      {
        id: "parent-old",
        username: "Old Parent",
        normalized_username: "old parent",
        email: "old-parent@example.test",
        normalized_email: "old-parent@example.test",
        role: "parent"
      },
      {
        id: "admin-old",
        username: "Old Admin",
        normalized_username: "old admin",
        email: "old-admin@example.test",
        normalized_email: "old-admin@example.test",
        role: "admin"
      },
      {
        id: "student-conflict",
        username: "Current Student",
        normalized_username: "current student",
        email: "unique-conflict@example.test",
        normalized_email: "unique-conflict@example.test",
        role: "student"
      }
    ],
    student_profiles: [
      { user_id: "student-old", name: "Old Student" },
      { user_id: "student-conflict", name: "Conflict Student" }
    ],
    user_settings: [{ user_id: "student-old", language: "en", theme: "dark", selected_grade: "S3" }],
    learner_profiles: [{ user_id: "student-old", status: "completed" }],
    guardian_links: [
      { id: "link-old", parent_id: "parent-old", student_id: "student-old", status: "active" },
      { id: "link-conflict", parent_id: "parent-old", student_id: "missing-student", status: "active" }
    ]
  });

  const { merged, summary } = mergeSnapshots(old, current);
  assert(summary.imported.users === 2, "expected two non-conflicting non-admin users");
  assert(summary.skippedUsers.admin === 1, "expected admin skip");
  assert(summary.skippedUsers.usernameConflict === 1, "expected username conflict skip");
  assert(summary.imported.studentProfiles === 1, "expected one imported student profile");
  assert(summary.imported.userSettings === 1, "expected one imported settings row");
  assert(summary.imported.guardianLinks === 1, "expected one imported guardian link");
  assert(!merged.database.users.some((user) => user.id === "admin-old"), "admin should not be imported by default");
  console.log(JSON.stringify({ ok: true, selfTest: "passed", summary }, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args["self-test"]) {
    runSelfTest();
    return;
  }
  if (!args.old || !args.current) {
    throw new Error(`Missing required inputs.\n${usage()}`);
  }
  const includeAdmins = Boolean(args["include-admins"]);
  if (includeAdmins && args["confirm-include-admins"] !== "include-admins") {
    throw new Error("--include-admins requires --confirm-include-admins include-admins");
  }
  if (args.apply && args["confirm-apply"] !== "apply-merged-snapshot") {
    throw new Error("--apply requires --confirm-apply apply-merged-snapshot");
  }

  const oldSnapshot = assertSnapshot(await readJson(args.old), "old snapshot");
  const currentSnapshot = assertSnapshot(await readJson(args.current), "current snapshot");
  const { merged, summary } = mergeSnapshots(oldSnapshot, currentSnapshot, {
    includeAdmins,
    writeSnapshot: Boolean(args.out || args.apply)
  });

  if (args.out) {
    const outPath = assertSafeOutputPath(args.out);
    await writeJson(outPath, merged);
    summary.output = {
      mergedSnapshotWritten: true,
      path: path.relative(cwd, outPath) || outPath
    };
  }

  if (args.apply) {
    await applyMergedSnapshotToPostgres(merged, currentSnapshot.database);
    summary.applied = {
      target: "POSTGRES_URL",
      status: "written-readiness-invalidated",
      storageReady: false
    };
  }

  if (args["summary-out"]) {
    await writeJson(path.resolve(cwd, args["summary-out"]), summary);
  }

  console.log(JSON.stringify(summary, null, 2));
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "unknown error" }));
    process.exit(1);
  });
}
