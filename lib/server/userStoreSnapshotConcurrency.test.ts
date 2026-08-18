import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { after } from "node:test";

const databaseDirectory = mkdtempSync(path.join(tmpdir(), "mais-snapshot-concurrency-"));
process.env.HK_MATH_DB_DIR = databaseDirectory;
const databasePath = path.join(databaseDirectory, "hk-math-db.sqlite");
// Compiled sibling of this test — the child processes load the same store this
// suite does, so each one opens its own DatabaseSync handle on the same file.
const storeModulePath = path.join(__dirname, "userStore.js");

after(() => {
  rmSync(databaseDirectory, { recursive: true, force: true });
});

type ProgressRow = { user_id: string; lesson_slug?: string; topic_id: string; status: string };

function storedProgressFor(userId: string) {
  const storage = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = storage.prepare("SELECT payload, revision FROM app_state WHERE id = 'primary'").get() as {
      payload: string;
      revision: number;
    };
    const payload = JSON.parse(row.payload) as { lesson_progress?: ProgressRow[] };
    return {
      revision: Number(row.revision),
      completed: new Set(
        (payload.lesson_progress ?? [])
          .filter((progress) => progress.user_id === userId && progress.status === "completed")
          .map((progress) => progress.lesson_slug ?? progress.topic_id)
      )
    };
  } finally {
    storage.close();
  }
}

// Each child completes its own disjoint set of lessons. Every completion is a
// separate read-modify-write of the whole snapshot, so if a write can be lost,
// the loser's slugs are simply absent at the end.
function completeLessonsInChildProcess(slugs: string[], userId: string) {
  return new Promise<{ code: number | null; stderr: string }>((resolve) => {
    const child = spawn(
      process.execPath,
      [
        "-e",
        `const store = require(${JSON.stringify(storeModulePath)});
         (async () => {
           for (const slug of ${JSON.stringify(slugs)}) {
             await store.updateLessonProgress({ userId: ${JSON.stringify(userId)}, slug, action: "complete" });
           }
         })().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });`
      ],
      { env: { ...process.env, HK_MATH_DB_DIR: databaseDirectory }, stdio: ["ignore", "ignore", "pipe"] }
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => resolve({ code, stderr }));
  });
}

test("concurrent mutations from separate connections all persist", async () => {
  const store = await import("./userStore");
  const userId = "student-peter";

  // Initialise the snapshot and pick real lessons from this student's track.
  const roadmap = await store.getRoadmapData(userId);
  // topic id and lesson slug coincide for every topic except quadratic-patterns
  // (lessonSlugForTopic), which is excluded so the stored key stays predictable.
  const slugs = (roadmap?.topics ?? [])
    .map((topic) => topic.id)
    .filter((slug) => slug !== "quadratic-patterns")
    .slice(0, 12);
  assert.ok(slugs.length >= 12, "the student's roadmap should offer enough lessons to contend over");

  const alreadyCompleted = storedProgressFor(userId).completed;
  const contested = slugs.filter((slug) => !alreadyCompleted.has(slug));
  assert.ok(contested.length >= 8, "need uncompleted lessons to contend over");

  const first = contested.filter((_, index) => index % 2 === 0);
  const second = contested.filter((_, index) => index % 2 === 1);
  const revisionBefore = storedProgressFor(userId).revision;

  const [a, b] = await Promise.all([
    completeLessonsInChildProcess(first, userId),
    completeLessonsInChildProcess(second, userId)
  ]);

  assert.equal(a.code, 0, `first writer failed: ${a.stderr}`);
  assert.equal(b.code, 0, `second writer failed: ${b.stderr}`);

  const final = storedProgressFor(userId);
  const missing = [...first, ...second].filter((slug) => !final.completed.has(slug));
  assert.deepEqual(missing, [], "every concurrent completion must survive — a missing slug is a lost update");
  assert.ok(
    final.revision >= revisionBefore + first.length + second.length,
    `expected at least ${first.length + second.length} committed revisions, saw ${final.revision - revisionBefore}`
  );
});
