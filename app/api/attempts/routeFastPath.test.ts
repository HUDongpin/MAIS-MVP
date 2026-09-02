import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("attempts POST returns persisted true only after the isolated local fallback commits", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "mais-attempt-route-local-"));
  const databaseDirectory = await mkdtemp(join(temporaryRoot, "database-"));
  const inheritedDatabasePath = join(temporaryRoot, "inherited-hk-math.sqlite");
  const inheritedEnvironment = { ...process.env, HK_MATH_DB_PATH: inheritedDatabasePath };
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  const script = `
    import { POST } from "./app/api/attempts/route.ts";
    import { createSessionToken, SESSION_COOKIE_NAME } from "./lib/session.ts";
    const token = await createSessionToken({ userId: "student-peter", sessionRevision: 1 });
    const headers = {
      "content-type": "application/json",
      cookie: \`${"${SESSION_COOKIE_NAME}"}=\${encodeURIComponent(token)}\`,
      "X-MAIS-Expected-User-Id": "student-peter"
    };
    const committed = await POST(new Request("http://localhost/api/attempts", {
      method: "POST",
      headers,
      body: JSON.stringify({ expectedUserId: "student-peter", questionId: "q1", selectedAnswer: "5" })
    }));
    const missing = await POST(new Request("http://localhost/api/attempts", {
      method: "POST",
      headers,
      body: JSON.stringify({ expectedUserId: "student-peter", questionId: "missing-question", selectedAnswer: "5" })
    }));
    process.stdout.write(JSON.stringify({
      committed: { body: await committed.json(), status: committed.status },
      missing: { body: await missing.json(), status: missing.status }
    }));
  `;
  const result = spawnSync(process.execPath, ["--import", "tsx", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...inheritedEnvironment,
      AUTH_SESSION_SECRET: "isolated-attempt-route-test-secret",
      HK_MATH_DB_PATH: "",
      HK_MATH_DB_DIR: databaseDirectory,
      HK_MATH_DISABLE_SQLITE_READ_CACHE: "1",
      HK_MATH_STORAGE_PROVIDER: "sqlite",
      POSTGRES_URL: ""
    },
    timeout: 15_000
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const output = JSON.parse(result.stdout);
  assert.equal(output.committed.status, 200);
  assert.equal(output.committed.body.persisted, true);
  assert.equal(output.committed.body.correct, true);
  assert.equal(output.missing.status, 404);
  assert.deepEqual(output.missing.body, { error: "Question not found." });
  assert.equal(existsSync(inheritedDatabasePath), false, "the inherited database path must remain untouched");
  assert.equal(existsSync(join(databaseDirectory, "hk-math-db.sqlite")), true, "the child must use its task-owned database directory");
});

test("attempts POST serializes fast-path persistence acknowledgements without an external Postgres service", () => {
  for (const persisted of [false, true]) {
    const script = `
      import { mock } from "node:test";
      mock.module("@/lib/server/auth", {
        namedExports: {
          bodyExpectedUserConstraints: () => [],
          expectedUserConstraintsFromRequest: () => [],
          guardExpectedAuthenticatedUser: () => null,
          requireAuthenticatedUser: async () => ({
            user: {
              curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
              id: "fixture-user",
              role: "student"
            }
          })
        }
      });
      mock.module("@/lib/server/practiceAttemptStore", {
        namedExports: {
          practiceAttemptFastPathPersistsRows: () => true,
          submitQuestionAttemptFast: async () => ({
            correct: true,
            explanation: { en: "fixture", zh: "测试", zhHans: "测试" },
            persisted: ${persisted}
          })
        }
      });
      const { POST } = await import("./app/api/attempts/route.ts");
      const response = await POST(new Request("http://localhost/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: "fixture-question", selectedAnswer: "A" })
      }));
      process.stdout.write(JSON.stringify({ body: await response.json(), status: response.status }));
    `;
    const result = spawnSync(
      process.execPath,
      ["--no-warnings", "--experimental-test-module-mocks", "--import", "tsx", "--input-type=module", "-e", script],
      { cwd: process.cwd(), encoding: "utf8", timeout: 15_000 }
    );

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const output = JSON.parse(result.stdout);
    assert.equal(output.status, 200);
    assert.equal(output.body.persisted, persisted);
    assert.equal(output.body.correct, true);
    assert.deepEqual(output.body.explanation, { en: "fixture", zh: "测试", zhHans: "测试" });
  }
});

test("attempts route returns a durable persistence acknowledgement with compatible feedback", async () => {
  const source = await readFile(join(process.cwd(), "app/api/attempts/route.ts"), "utf8");

  assert.match(source, /submitQuestionAttemptFast/);
  assert.match(source, /practiceAttemptFastPathPersistsRows/);
  assert.match(source, /requireAuthenticatedUser/);
  assert.match(source, /import\("@\/lib\/server\/userStore\/studentActivity"\)/);
  assert.doesNotMatch(source, /^import .*@\/lib\/server\/userStore/m);
  assert.doesNotMatch(source, /gradeSeedQuestionAttempt|@\/lib\/server\/answerGrading/);
  assert.match(source, /persisted: true/);
  assert.match(source, /NextResponse\.json\(feedback\)/);
});
