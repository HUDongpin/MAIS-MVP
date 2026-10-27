import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const readCourseFromStore = String.raw`
  (async () => {
    const { topics } = await import("./data/topics.ts");
    const source = topics.find((topic) => topic.curriculumTrack === "US_CA_MATH");
    if (!source) throw new Error("California seed topic missing");
    if (process.env.SEED_COURSE === "1") {
      source.courseId = "reviewed-course";
      source.courseLabel = { en: "Geometry", zh: "幾何", zhHans: "几何" };
    }
    const { getRoadmapData, getAdaptiveLearningDecision } = await import("./lib/server/userStore.ts");
    const roadmap = await getRoadmapData("synthetic-student", source.grade, "US_CA_MATH");
    const result = roadmap.topics.find((topic) => topic.id === source.id);
    if (!result) throw new Error("seed topic absent from roadmap");
    const decision = await getAdaptiveLearningDecision({
      userId: "synthetic-student", grade: source.grade, topicId: source.id, curriculumTrack: "US_CA_MATH"
    });
    if (!decision || decision.topic.id !== source.id) throw new Error("focused adaptive topic missing");
    process.stdout.write(JSON.stringify({
      topicId: source.id,
      adaptiveCourseId: decision.topic.courseId ?? null,
      adaptiveCourseLabel: decision.topic.courseLabel ?? null,
      courseId: result.courseId ?? null,
      courseLabel: result.courseLabel ?? null,
      grade: result.grade
    }));
  })().catch((error) => { console.error(error); process.exitCode = 1; });
`;

function readCourse(dbDir: string, withCourse: boolean) {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", readCourseFromStore], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HK_MATH_STORAGE_PROVIDER: "sqlite",
      HK_MATH_DB_DIR: dbDir,
      HK_MATH_DB_PATH: path.join(dbDir, "hk-math-db.sqlite"),
      HK_MATH_ENABLE_DEMO_USER: "false",
      SEED_COURSE: withCourse ? "1" : "0"
    },
    encoding: "utf8",
    timeout: 120_000
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as { adaptiveCourseId: string | null; adaptiveCourseLabel: { en: string; zh: string; zhHans?: string } | null; topicId: string; courseId: string | null; courseLabel: { en: string; zh: string; zhHans?: string } | null; grade: string };
}

function storedCourseId(dbDir: string, topicId: string): string | null {
  const storage = new DatabaseSync(path.join(dbDir, "hk-math-db.sqlite"), { readOnly: true });
  try {
    const row = storage.prepare("SELECT payload FROM app_state WHERE id = 'primary'").get() as { payload: string } | undefined;
    assert.ok(row, "SQLite snapshot should exist after a roadmap read");
    const parsed = JSON.parse(row.payload) as { topics: Array<{ id: string; course_id?: string }> };
    const topic = parsed.topics.find((candidate) => candidate.id === topicId);
    assert.ok(topic, "California seed topic should be stored");
    return topic.course_id ?? null;
  } finally {
    storage.close();
  }
}

test("an existing SQLite topic receives newly reviewed course metadata without changing its grade", () => {
  const dbDir = mkdtempSync(path.join(tmpdir(), "mais-course-seam-"));

  try {
    const before = readCourse(dbDir, false);
    assert.equal(before.courseId, null);
    const after = readCourse(dbDir, true);
    assert.equal(after.grade, before.grade);
    assert.equal(after.courseId, "reviewed-course");
    assert.equal(after.adaptiveCourseId, after.courseId);
    assert.deepEqual(after.adaptiveCourseLabel, after.courseLabel);
    assert.deepEqual(after.courseLabel, { en: "Geometry", zh: "幾何", zhHans: "几何" });
    assert.equal(storedCourseId(dbDir, after.topicId), "reviewed-course");
  } finally {
    rmSync(dbDir, { recursive: true, force: true });
  }
});

test("a withdrawn course mapping stops appearing for an existing SQLite topic", () => {
  const dbDir = mkdtempSync(path.join(tmpdir(), "mais-course-withdrawal-"));
  try {
    const before = readCourse(dbDir, true);
    assert.equal(before.courseId, "reviewed-course");
    assert.equal(before.adaptiveCourseId, before.courseId);
    assert.deepEqual(before.adaptiveCourseLabel, before.courseLabel);
    const after = readCourse(dbDir, false);
    assert.equal(after.grade, before.grade);
    assert.equal(after.courseId, null);
    assert.equal(after.courseLabel, null);
    assert.equal(after.adaptiveCourseId, null);
    assert.equal(after.adaptiveCourseLabel, null);
    assert.equal(storedCourseId(dbDir, after.topicId), null);
  } finally {
    rmSync(dbDir, { recursive: true, force: true });
  }
});
