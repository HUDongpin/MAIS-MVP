import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("fast learning-streak reward heals once into the canonical store and survives a fresh process", { timeout: 120_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mais-fast-streak-reward-"));
  const dbPath = path.join(directory, "app.sqlite");
  const barrierPath = path.join(directory, "start");
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    AUTH_SESSION_SECRET: "fast-streak-reward-secret",
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
        name: "Fast Streak Student",
        username: "fast-streak-student@example.test",
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

    const workerSource = `
      const { existsSync } = await import("node:fs");
      const { setTimeout: delay } = await import("node:timers/promises");
      const store = await import("./lib/server/userStore.ts");
      while (!existsSync(process.env.MAIS_FAST_STREAK_BARRIER)) await delay(2);
      const durable = await store.ensureFastLearningStreakReward(
        process.env.MAIS_FAST_STREAK_USER_ID,
        "2026-08-09T12:00:00.000Z"
      );
      console.log(JSON.stringify({ durable }));
    `;
    const workers = Array.from({ length: 6 }, () => runScript(workerSource, {
      ...childEnv,
      MAIS_FAST_STREAK_BARRIER: barrierPath,
      MAIS_FAST_STREAK_USER_ID: userId
    }));
    await writeFile(barrierPath, "go", "utf8");
    const workerOutputs = await Promise.all(workers);
    for (const { stdout } of workerOutputs) {
      assert.deepEqual(JSON.parse(stdout.trim().split("\n").at(-1) ?? "null"), { durable: true });
    }

    const sqlite = new DatabaseSync(dbPath, { readOnly: true });
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as {
      payload: string;
    };
    sqlite.close();
    const payload = JSON.parse(row.payload) as {
      gamification_events?: Array<{ source?: string; source_key?: string; student_id?: string }>;
      reward_point_ledger?: Array<{
        amount?: number;
        created_at?: string;
        id?: string;
        label_en?: string;
        label_zh?: string;
        reason?: string;
        source_key?: string;
        student_id?: string;
      }>;
    };
    const expectedSourceKey = `streak:${userId}:3-day`;
    assert.deepEqual(
      payload.reward_point_ledger?.filter((entry) => entry.source_key === expectedSourceKey),
      [{
        id: payload.reward_point_ledger?.find((entry) => entry.source_key === expectedSourceKey)?.id,
        student_id: userId,
        amount: 25,
        reason: "streak",
        label_en: "Kept a three-day learning streak",
        label_zh: "保持三日連續學習",
        source_key: expectedSourceKey,
        created_at: "2026-08-09T12:00:00.000Z"
      }]
    );
    assert.equal(
      payload.gamification_events?.filter((event) =>
        event.student_id === userId && event.source === "streak" && event.source_key === expectedSourceKey
      ).length,
      1
    );

    const { stdout: rereadOutput } = await runScript(`
      const store = await import("./lib/server/userStore.ts");
      const rewards = await store.getStudentRewardsData(${JSON.stringify(userId)});
      console.log(JSON.stringify({
        balance: rewards?.summary.balance,
        streakRows: rewards?.ledger.filter((entry) => entry.sourceKey === ${JSON.stringify(expectedSourceKey)}).length
      }));
    `);
    assert.deepEqual(JSON.parse(rereadOutput.trim().split("\n").at(-1) ?? "null"), {
      balance: 25,
      streakRows: 1
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
