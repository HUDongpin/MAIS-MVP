import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { visualizationCompletionRewardSourceKey } from "@/lib/server/userStore/gamificationRewardRedemptionPersistence";

const execFileAsync = promisify(execFile);

test("SQLite and Postgres persist the same catalog-decoupled application snapshot", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(
    source,
    /function compactDatabaseForPersistence\(database: Database\): Database[\s\S]*?topics: removeSeedRecords\([\s\S]*?lessons: removeSeedRecords\([\s\S]*?lesson_blocks: removeSeedRecords\([\s\S]*?questions: removeSeedRecords\(/
  );
  assert.match(
    source,
    /function stringifyPersistentDatabase\(database: Database\) \{\s*return JSON\.stringify\(compactDatabaseForPersistence\(database\)\);\s*\}/
  );
  assert.match(
    source,
    /function stringifyPostgresDatabase\(database: Database\) \{\s*return stringifyPersistentDatabase\(database\);\s*\}/
  );
  assert.match(
    source,
    /\.run\(stateRecordId, stateTenantId, stateKind, schemaVersion, stringifyPersistentDatabase\(database\), now\)/
  );
  assert.doesNotMatch(
    source,
    /\.run\(stateRecordId, stateTenantId, stateKind, schemaVersion, JSON\.stringify\(database\), now\)/
  );
  assert.match(
    source,
    /SELECT payload, revision, updated_at FROM app_state WHERE id = \?[\s\S]*?A readable state must never be replaced with a fresh database[\s\S]*?databaseNeedsPersistenceSync\(parsed, database\)[\s\S]*?return synchronizeSqliteDatabaseForRead\(storage\)/
  );
  assert.match(
    source,
    /async function synchronizeSqliteDatabaseForRead[\s\S]*?fallbackDatabase = await sqliteMutationFallbackDatabase\(storage\)[\s\S]*?BEGIN IMMEDIATE[\s\S]*?loadSqliteDatabaseForMutation\(storage, fallbackDatabase\)[\s\S]*?writeSqliteDatabaseRow\(storage, database\)[\s\S]*?COMMIT/
  );
  assert.doesNotMatch(source, /Could not read SQLite application state\. Recreating it\./);
  assert.match(
    source,
    /const run = mutationQueue[\s\S]*?\.catch\(\(error\) => \{[\s\S]*?clearSqliteReadCache\(\);[\s\S]*?throw error;[\s\S]*?\}\);/
  );
});

test("a compact SQLite snapshot durably rehydrates catalog rows and concurrent activity after restart", async () => {
  const dbDirectory = await mkdtemp(path.join(tmpdir(), "mais-sqlite-compaction-"));
  const dbPath = path.join(dbDirectory, "hk-math-db.sqlite");
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    AUTH_SESSION_SECRET: "sqlite-compaction-contract-secret",
    HK_MATH_DB_PATH: dbPath,
    HK_MATH_ENABLE_DEMO_USER: "true",
    HK_MATH_STORAGE_PROVIDER: "sqlite",
    NODE_ENV: "production"
  };
  const runModuleScript = (source: string) => execFileAsync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", source],
    { cwd: process.cwd(), env: childEnv, maxBuffer: 4 * 1024 * 1024 }
  );

  try {
    const { stdout: phaseOneStdout } = await runModuleScript(`
      const store = await import("./lib/server/userStore.ts");
      const auth = await import("./lib/server/userStore/auth.ts");
      const created = await auth.createStudentUser({
        name: "SQLite Compaction Student",
        username: "sqlite-compaction-student@example.test",
        password: "start12345",
        grade: "P1",
        curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
        language: "en",
        theme: "light"
      });
      if (created.status !== "created") throw new Error("Could not create SQLite compaction student.");
      const userId = created.session.user.id;
      const teacher = await auth.createTeacherUser({
        name: "SQLite Compaction Teacher",
        username: "sqlite-compaction-teacher@example.test",
        password: "start12345",
        grade: "P1",
        curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
        language: "en",
        theme: "light"
      });
      if (teacher.status !== "created") throw new Error("Could not create SQLite compaction teacher.");
      const teacherId = teacher.session.user.id;
      const teacherClass = await store.createTeacherClass({
        teacherId,
        name: "SQLite Compaction Class",
        grade: "P1",
        academicYear: "2026-2027",
        description: "Persistence contract class."
      });
      if (teacherClass.status !== "created") throw new Error("Could not create SQLite compaction class.");
      const enrollment = await store.addStudentToTeacherClass({
        teacherId,
        classId: teacherClass.class.id,
        username: "sqlite-compaction-student@example.test"
      });
      if (enrollment.status !== "added") throw new Error("Could not enroll SQLite compaction student.");
      const assignment = await store.createTeacherAssignment({
        teacherId,
        classId: teacherClass.class.id,
        studentIds: [userId],
        title: "Explore a visualization",
        description: "Complete the linked visualization.",
        contentType: "visualization",
        targetId: "sqlite-compaction-module-0",
        dueAt: null,
        allowRetake: true,
        showAnswers: false,
        countTowardsGrade: false,
        language: "en"
      });
      if (assignment.status !== "created") throw new Error("Could not create SQLite compaction assignment.");
      const assignmentId = assignment.assignment.id;
      const baseTimestamp = Date.parse("2026-08-09T09:00:00.000Z");
      await store.appendLearningEvents(userId, [
        {
          id: "sqlite-compaction-streak-1",
          type: "visualization-probe",
          source: "visualization-lab",
          timestamp: "2026-08-07T09:00:00.000Z",
          grade: "P1",
          topicId: "sqlite-compaction-streak-topic"
        },
        {
          id: "sqlite-compaction-streak-2",
          type: "visualization-probe",
          source: "visualization-lab",
          timestamp: "2026-08-08T09:00:00.000Z",
          grade: "P1",
          topicId: "sqlite-compaction-streak-topic"
        }
      ]);
      await Promise.all(Array.from({ length: 4 }, (_, index) => Promise.all([
        store.appendLearningEvents(userId, [{
          id: "sqlite-compaction-event-" + index,
          type: "visualization-probe",
          source: "visualization-lab",
          timestamp: new Date(baseTimestamp + index).toISOString(),
          grade: "P1",
          topicId: "sqlite-compaction-topic-" + index
        }]),
        store.markVisualizationSession({
          userId,
          moduleId: "sqlite-compaction-module-" + index,
          topicId: "sqlite-compaction-topic-" + index,
          source: "visualization-lab"
        })
      ])));
      await store.markVisualizationSession({
        userId,
        moduleId: "sqlite-compaction-module-0",
        topicId: "sqlite-compaction-topic-0",
        source: "visualization-lab"
      });
      await Promise.all([
        "configured-topic-a",
        "configured-topic-b",
        "configured-topic-a",
        "configured-topic-b"
      ].map((topicId) => store.markVisualizationSession({
        userId,
        moduleId: "configured-visualization-lab",
        topicId,
        source: "visualization-lab"
      })));
      console.log(JSON.stringify({ assignmentId, userId }));
    `);
    const { assignmentId, userId } = JSON.parse(phaseOneStdout.trim().split("\n").at(-1) ?? "null") as {
      assignmentId: string;
      userId: string;
    };

    const sqlite = new DatabaseSync(dbPath, { readOnly: true });
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as { payload: string };
    sqlite.close();
    const payload = JSON.parse(row.payload) as Record<string, unknown>;
    assert.ok(Buffer.byteLength(row.payload) < 8 * 1024 * 1024, "compact snapshot should stay below 8 MiB");
    assert.deepEqual(payload.topics, []);
    assert.deepEqual(payload.lessons, []);
    assert.deepEqual(payload.lesson_blocks, []);
    assert.deepEqual(payload.questions, []);
    assert.equal(
      (payload.user_settings as Array<{ selected_grade: string; user_id: string }>).find(({ user_id }) => user_id === userId)?.selected_grade,
      "P1"
    );
    assert.ok(
      (payload.lesson_progress as Array<{ user_id: string }>).some(({ user_id }) => user_id === userId),
      "non-catalog lesson progress must remain in the shared application snapshot"
    );
    assert.equal((payload.learning_events as Array<{ id: string }>).filter(({ id }) => id.startsWith("sqlite-compaction-event-")).length, 4);
    assert.equal((payload.learning_events as Array<{ id: string }>).filter(({ id }) => id.startsWith("sqlite-compaction-streak-")).length, 2);
    assert.equal((payload.visualization_sessions as Array<{ module_id: string }>).filter(({ module_id }) => module_id.startsWith("sqlite-compaction-module-")).length, 4);
    assert.equal(
      (payload.visualization_sessions as Array<{ module_id: string; topic_id: string }>).filter(
        ({ module_id }) => module_id === "configured-visualization-lab"
      ).length,
      2,
      "one shared configured module must persist a separate row for each topic"
    );
    const assignmentSubmission = (payload.submissions as Array<{
      assignment_id: string;
      score: number | null;
      status: string;
      student_id: string;
    }>).find((submission) => submission.assignment_id === assignmentId && submission.student_id === userId);
    assert.deepEqual(
      { score: assignmentSubmission?.score, status: assignmentSubmission?.status },
      { score: 100, status: "graded" }
    );
    const rewardLedger = (payload.reward_point_ledger as Array<{
      reason: string;
      source_key: string;
      student_id: string;
    }>).filter((entry) => entry.student_id === userId);
    assert.equal(rewardLedger.filter(({ reason }) => reason === "streak").length, 1);
    assert.equal(rewardLedger.filter(({ reason }) => reason === "visualization-complete").length, 6);
    assert.equal(
      rewardLedger.filter(
        ({ source_key }) => source_key ===
          visualizationCompletionRewardSourceKey(
            userId,
            "sqlite-compaction-module-0",
            "sqlite-compaction-topic-0"
          )
      ).length,
      1,
      "repeating a completed visualization session must not duplicate its reward"
    );
    assert.equal(
      rewardLedger.filter(({ source_key }) => [
        visualizationCompletionRewardSourceKey(userId, "configured-visualization-lab", "configured-topic-a"),
        visualizationCompletionRewardSourceKey(userId, "configured-visualization-lab", "configured-topic-b")
      ].includes(source_key)).length,
      2,
      "concurrent ambiguous retries must award each exact module/topic scope only once"
    );
    const gamificationEvents = (payload.gamification_events as Array<{
      source_key: string;
      student_id: string;
    }>).filter((entry) => entry.student_id === userId);
    assert.equal(gamificationEvents.filter(({ source_key }) => source_key.includes(":3-day")).length, 1);
    assert.equal(gamificationEvents.filter(({ source_key }) => source_key.includes("visualization-complete:")).length, 6);

    const { stdout } = await runModuleScript(`
      const store = await import("./lib/server/userStore.ts");
      const questions = await store.getPublicQuestions({
        grade: "P1",
        curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" }
      });
      const sessions = await store.listVisualizationSessionsForUser(${JSON.stringify(userId)});
      const assignments = await store.getStudentAssignments(${JSON.stringify(userId)});
      const rewards = await store.getStudentRewardsData(${JSON.stringify(userId)});
      console.log(JSON.stringify({
        assignmentStatus: assignments.find(({ assignment }) => assignment.id === ${JSON.stringify(assignmentId)})?.submission.status ?? null,
        questionCount: questions.length,
        rewardReasons: rewards.ledger.map(({ reason }) => reason).sort(),
        sessionCount: sessions.filter(({ moduleId }) => moduleId.startsWith("sqlite-compaction-module-")).length,
        configuredSessionCount: sessions.filter(({ moduleId }) => moduleId === "configured-visualization-lab").length
      }));
    `);
    const durable = JSON.parse(stdout.trim().split("\n").at(-1) ?? "null") as {
      assignmentStatus: string | null;
      questionCount: number;
      rewardReasons: string[];
      sessionCount: number;
      configuredSessionCount: number;
    };
    assert.equal(durable.assignmentStatus, "graded");
    assert.equal(durable.sessionCount, 4);
    assert.equal(durable.configuredSessionCount, 2);
    assert.equal(durable.rewardReasons.filter((reason) => reason === "streak").length, 1);
    assert.equal(durable.rewardReasons.filter((reason) => reason === "visualization-complete").length, 6);
    assert.ok(durable.questionCount > 0, "catalog questions must rehydrate after a fresh process restart");
  } finally {
    await rm(dbDirectory, { recursive: true, force: true });
  }
});
