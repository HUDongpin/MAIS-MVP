import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("concurrent exact retries preserve one legacy visualization reward and fresh-process visibility", { timeout: 120_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-visualization-reward-migration-"));
  const dbPath = path.join(directory, "app.sqlite");
  const barrierPath = path.join(directory, "start");
  const moduleId = "function-graph";
  const topicId = "topic-functions";
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    AUTH_SESSION_SECRET: "visualization-reward-migration-secret",
    HK_MATH_DB_PATH: dbPath,
    HK_MATH_ENABLE_DEMO_USER: "false",
    HK_MATH_STORAGE_PROVIDER: "sqlite",
    POSTGRES_URL: ""
  };
  const runScript = (source: string, env: NodeJS.ProcessEnv = childEnv) => execFileAsync(process.execPath, [
    "--import",
    "tsx",
    "--input-type=module",
    "--eval",
    source
  ], {
    cwd: process.cwd(),
    env,
    maxBuffer: 4 * 1024 * 1024,
    timeout: 90_000
  });

  try {
    const { stdout: setupOutput } = await runScript(`
      const auth = await import("./lib/server/userStore/auth.ts");
      const created = await auth.createStudentUser({
        name: "Visualization Migration Student",
        username: "visualization-migration-student@example.test",
        password: "start12345",
        grade: "S3",
        curriculumTrack: "HK",
        language: "en",
        theme: "light"
      });
      if (created.status !== "created") throw new Error("student setup failed");
      console.log(JSON.stringify({ userId: created.session.user.id }));
    `);
    const { userId } = JSON.parse(setupOutput.trim().split("\n").at(-1) ?? "null") as {
      userId: string;
    };
    const legacySourceKey = `visualization-complete:${userId}:${moduleId}`;

    const sqlite = new DatabaseSync(dbPath);
    try {
      const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as {
        payload: string;
      };
      const payload = JSON.parse(row.payload) as {
        reward_point_ledger: unknown[];
      };
      payload.reward_point_ledger.push({
        id: "legacy-visualization-reward",
        student_id: userId,
        amount: 20,
        reason: "visualization-complete",
        label_en: "Legacy visualization completion",
        label_zh: "舊視覺化完成獎勵",
        source_key: legacySourceKey,
        created_at: "2026-08-08T12:00:00.000Z"
      });
      sqlite.prepare(`
        UPDATE app_state
        SET payload = ?, revision = revision + 1, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(payload), "2026-08-09T00:00:00.000Z", "primary");
    } finally {
      sqlite.close();
    }

    const workerSource = `
      const { existsSync } = await import("node:fs");
      const { setTimeout: delay } = await import("node:timers/promises");
      const store = await import("./lib/server/userStore.ts");
      while (!existsSync(process.env.MAIS_VIZ_REWARD_BARRIER)) await delay(2);
      const session = await store.markVisualizationSession({
        userId: process.env.MAIS_VIZ_REWARD_USER_ID,
        moduleId: ${JSON.stringify(moduleId)},
        topicId: ${JSON.stringify(topicId)},
        source: "visualization-lab"
      });
      console.log(JSON.stringify({ moduleId: session.module_id, topicId: session.topic_id }));
    `;
    const workers = Array.from({ length: 6 }, () => runScript(workerSource, {
      ...childEnv,
      MAIS_VIZ_REWARD_BARRIER: barrierPath,
      MAIS_VIZ_REWARD_USER_ID: userId
    }));
    await writeFile(barrierPath, "go", "utf8");
    const outputs = await Promise.all(workers);
    for (const { stdout } of outputs) {
      assert.deepEqual(JSON.parse(stdout.trim().split("\n").at(-1) ?? "null"), { moduleId, topicId });
    }

    const durableSqlite = new DatabaseSync(dbPath, { readOnly: true });
    const durableRow = durableSqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as {
      payload: string;
    };
    durableSqlite.close();
    const durable = JSON.parse(durableRow.payload) as {
      reward_point_ledger?: Array<{ reason?: string; source_key?: string; student_id?: string }>;
      visualization_sessions?: Array<{ module_id?: string; topic_id?: string; user_id?: string }>;
    };
    const studentVisualizationRewards = durable.reward_point_ledger?.filter((entry) =>
      entry.student_id === userId && entry.reason === "visualization-complete"
    ) ?? [];
    assert.deepEqual(studentVisualizationRewards.map((entry) => entry.source_key), [legacySourceKey]);
    assert.equal(
      durable.visualization_sessions?.filter((session) =>
        session.user_id === userId && session.module_id === moduleId && session.topic_id === topicId
      ).length,
      1
    );

    const { stdout: rereadOutput } = await runScript(`
      const store = await import("./lib/server/userStore.ts");
      const rewards = await store.getStudentRewardsData(${JSON.stringify(userId)});
      const sessions = await store.listVisualizationSessionsForUser(${JSON.stringify(userId)});
      console.log(JSON.stringify({
        balance: rewards?.summary.balance,
        legacyRows: rewards?.ledger.filter((entry) => entry.sourceKey === ${JSON.stringify(legacySourceKey)}).length,
        sessionRows: sessions.filter((session) => session.moduleId === ${JSON.stringify(moduleId)} && session.topicId === ${JSON.stringify(topicId)}).length
      }));
    `);
    assert.deepEqual(JSON.parse(rereadOutput.trim().split("\n").at(-1) ?? "null"), {
      balance: 20,
      legacyRows: 1,
      sessionRows: 1
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
