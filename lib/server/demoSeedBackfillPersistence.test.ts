import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const jonEnrollmentId = "enrollment-us-ca-p1-student-jon";
const jonSubmissionId = "submission-us-ca-p1-add-subtract-check-jon";
const jonUserId = "student-jon-us-ca-super";
const peterUserId = "student-peter";
const californiaClassId = "class-us-ca-p1-2026";

type Row = { id: string; score?: number | null; status?: string };

type Snapshot = {
  assessments?: Row[];
  class_enrollments?: Row[];
  content_safety_flags?: Row[];
  reward_catalog?: Row[];
  reward_point_ledger?: Row[];
  submissions?: Row[];
  teacher_classes?: Row[];
  topics?: unknown[];
  users?: Row[];
};

function countId(rows: Row[] | undefined, id: string) {
  return (rows ?? []).filter((row) => row.id === id).length;
}

function readSnapshot(dbPath: string) {
  const storage = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const row = storage.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as { payload: string } | undefined;
    assert.ok(row, "persistent app_state row was not written");
    return JSON.parse(row.payload) as Snapshot;
  } finally {
    storage.close();
  }
}

function writeSnapshot(dbPath: string, snapshot: Snapshot) {
  const storage = new DatabaseSync(dbPath);
  try {
    const result = storage.prepare("UPDATE app_state SET payload = ? WHERE id = ?").run(JSON.stringify(snapshot), "primary");
    assert.equal(Number(result.changes), 1);
  } finally {
    storage.close();
  }
}

function probeEnv(dbPath: string, resultPath: string, flag: string | undefined, demoUserFlag: "true" | "false"): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HK_MATH_DB_PATH: dbPath,
    HK_MATH_ENABLE_DEMO_USER: demoUserFlag,
    HK_MATH_STORAGE_PROVIDER: "sqlite",
    NODE_ENV: "production",
    PROBE_RESULT_PATH: resultPath,
    VERCEL_ENV: "production"
  };
  if (flag === undefined) delete env.MAIS_DEMO_SEED_BACKFILL;
  else env.MAIS_DEMO_SEED_BACKFILL = flag;
  for (const key of [
    "HK_MATH_DB_DIR",
    "MAIS_BOOTSTRAP_ADMIN_EMAIL",
    "MAIS_BOOTSTRAP_ADMIN_NAME",
    "MAIS_BOOTSTRAP_ADMIN_PASSWORD",
    "MAIS_BOOTSTRAP_ADMIN_USERNAME",
    "POSTGRES_URL"
  ]) {
    delete env[key];
  }
  return env;
}

function runProbe(env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ["--import", "tsx", "lib/server/demoSeedBackfillProbe.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env,
    timeout: 120_000
  });
}

async function readProbe(resultPath: string, probe: ReturnType<typeof runProbe>) {
  let body = "";
  try {
    body = await readFile(resultPath, "utf8");
  } catch {
    body = "";
  }
  assert.equal(probe.status, 0, `${probe.stdout}\n${probe.stderr}\n${body}`);
  const parsed = JSON.parse(body) as { error?: string; jonStatus?: string; peterStatus?: string };
  assert.equal(parsed.error, undefined, parsed.error);
  return parsed;
}

test("production demo seed backfill stays off without the flag and is idempotent when enabled", { timeout: 240_000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mais-demo-seed-backfill-"));
  const refusedDb = path.join(root, "refused.sqlite");
  const enabledDb = path.join(root, "enabled.sqlite");
  const refusedResult = path.join(root, "refused.json");
  const enabledResult = path.join(root, "enabled.json");
  const enabledAgain = path.join(root, "enabled-again.json");

  try {
    const refused = runProbe(probeEnv(refusedDb, refusedResult, undefined, "true"));
    const refusedAuth = await readProbe(refusedResult, refused);
    const refusedSnapshot = readSnapshot(refusedDb);
    assert.equal(refusedAuth.jonStatus, "invalid");
    assert.equal(refusedAuth.peterStatus, "invalid");
    assert.equal(countId(refusedSnapshot.users, jonUserId), 0);
    assert.equal(countId(refusedSnapshot.users, peterUserId), 0);
    assert.equal(countId(refusedSnapshot.class_enrollments, jonEnrollmentId), 0);
    assert.equal(countId(refusedSnapshot.submissions, jonSubmissionId), 0);
    assert.equal(countId(refusedSnapshot.teacher_classes, californiaClassId), 0);
    assert.equal(countId(refusedSnapshot.content_safety_flags, "safety-flag-demo-new"), 0);
    assert.equal(countId(refusedSnapshot.reward_point_ledger, "reward-ledger-peter-lesson-complete"), 0);
    assert.ok((refusedSnapshot.topics ?? []).length > 0, "curriculum catalog should still be stored");
    assert.equal(countId(refusedSnapshot.reward_catalog, "reward-plush-toy"), 1);

    const enabled = runProbe(probeEnv(enabledDb, enabledResult, "1", "false"));
    const enabledAuth = await readProbe(enabledResult, enabled);
    const enabledSnapshot = readSnapshot(enabledDb);
    assert.equal(enabledAuth.jonStatus, "authenticated");
    assert.equal(enabledAuth.peterStatus, "invalid");
    assert.equal(countId(enabledSnapshot.users, jonUserId), 1);
    assert.equal(countId(enabledSnapshot.users, peterUserId), 0);
    assert.equal(countId(enabledSnapshot.class_enrollments, jonEnrollmentId), 1);
    assert.equal(countId(enabledSnapshot.teacher_classes, californiaClassId), 1);
    const seededSubmission = (enabledSnapshot.submissions ?? []).filter((row) => row.id === jonSubmissionId);
    assert.equal(seededSubmission.length, 1);
    assert.equal(seededSubmission[0]?.status, "not-started");
    assert.equal(seededSubmission[0]?.score, null);

    enabledSnapshot.submissions = (enabledSnapshot.submissions ?? []).map((row) =>
      row.id === jonSubmissionId ? { ...row, status: "submitted", score: 9 } : row
    );
    writeSnapshot(enabledDb, enabledSnapshot);

    const again = runProbe(probeEnv(enabledDb, enabledAgain, "1", "false"));
    await readProbe(enabledAgain, again);
    const persisted = readSnapshot(enabledDb);
    const jonSubmissions = (persisted.submissions ?? []).filter((row) => row.id === jonSubmissionId);
    assert.equal(jonSubmissions.length, 1);
    assert.equal(jonSubmissions[0]?.status, "submitted");
    assert.equal(jonSubmissions[0]?.score, 9);
    assert.equal(countId(persisted.class_enrollments, jonEnrollmentId), 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
