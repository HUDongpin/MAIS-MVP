import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

function hermeticChildEnv({
  temporaryRoot,
  databaseDirectory,
  authSessionSecret = "hermetic-attempt-route-test-secret"
}: {
  temporaryRoot: string;
  databaseDirectory: string;
  authSessionSecret?: string;
}): NodeJS.ProcessEnv {
  // Strict allowlist: child processes never inherit the parent's database,
  // provider, deployment, or credential-bearing environment.
  return {
    PATH: process.env.PATH ?? "",
    HOME: temporaryRoot,
    TMPDIR: temporaryRoot,
    LANG: process.env.LANG ?? "C.UTF-8",
    LC_ALL: process.env.LC_ALL ?? "C.UTF-8",
    NODE_ENV: "test",
    NODE_OPTIONS: "",
    AUTH_SESSION_SECRET: authSessionSecret,
    HK_MATH_DB_PATH: "",
    HK_MATH_DB_DIR: databaseDirectory,
    HK_MATH_DISABLE_SQLITE_READ_CACHE: "1",
    HK_MATH_STORAGE_PROVIDER: "sqlite",
    HK_MATH_ENABLE_DEMO_USER: "true",
    MAINLAND_PEP_CONTENT_ENABLED: "true",
    POSTGRES_URL: "",
    AUTH_FUNNEL_DB_PATH: "",
    VERCEL: "",
    VERCEL_ENV: "",
    CLASSROOM_LOAD_COOKIE: "",
    CLASSROOM_LOAD_DEMO_PASSWORD: "",
    CLASSROOM_LOAD_PASSWORD: "",
    CLASSROOM_LOAD_USERNAME: "",
    CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET: "",
    DASHBOARD_SMOKE_COOKIE: "",
    DASHBOARD_SMOKE_PASSWORD: "",
    DASHBOARD_SMOKE_USERNAME: "",
    DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET: "",
    VERCEL_AUTOMATION_BYPASS_SECRET: "",
    DEEPSEEK_API_KEY: "",
    LLM_API_KEY: "",
    QWEN_API_KEY: "",
    DEEPINFRA_API_KEY: "",
    OPENAI_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    GOOGLE_API_KEY: "",
    GEMINI_API_KEY: "",
    SIMPLETEX_API_KEY: "",
    SIMPLETEX_APP_ID: "",
    BLOB_READ_WRITE_TOKEN: "",
    DATABASE_URL: "",
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: ""
  };
}

test("attempts POST returns persisted true only after the isolated local fallback commits", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "mais-attempt-route-local-"));
  const databaseDirectory = await mkdtemp(join(temporaryRoot, "database-"));
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
    env: hermeticChildEnv({
      temporaryRoot,
      databaseDirectory,
      authSessionSecret: "isolated-attempt-route-test-secret"
    }),
    timeout: 15_000
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const output = JSON.parse(result.stdout);
  assert.equal(output.committed.status, 200);
  assert.equal(output.committed.body.persisted, true);
  assert.equal(output.committed.body.correct, true);
  assert.equal(output.missing.status, 404);
  assert.deepEqual(output.missing.body, { error: "Question not found." });
  assert.equal(existsSync(join(databaseDirectory, "hk-math-db.sqlite")), true, "the child must use its task-owned database directory");
});

test("attempts POST serializes fast-path persistence acknowledgements without an external Postgres service", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "mais-attempt-route-mocked-persistence-"));
  const databaseDirectory = await mkdtemp(join(temporaryRoot, "database-"));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
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
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: hermeticChildEnv({ temporaryRoot, databaseDirectory }),
        timeout: 15_000
      }
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

test("attempts POST enforces the authenticated curriculum profile at the fast-path boundary", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "mais-attempt-route-mocked-curriculum-"));
  const databaseDirectory = await mkdtemp(join(temporaryRoot, "database-"));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  const script = `
    import assert from "node:assert/strict";
    import { mock } from "node:test";

    const profiles = {
      hk: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      mainland: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      northCarolina: { region: "US", publisher: "US_NC_MATH" }
    };
    const questions = {
      "fixture-hk": profiles.hk,
      "fixture-mainland": profiles.mainland,
      "fixture-us-nc": profiles.northCarolina
    };
    let activeProfile = profiles.hk;
    const fastPathCalls = [];

    mock.module("@/lib/server/auth", {
      namedExports: {
        bodyExpectedUserConstraints: () => [],
        expectedUserConstraintsFromRequest: () => [],
        guardExpectedAuthenticatedUser: () => null,
        requireAuthenticatedUser: async () => ({
          user: { curriculumProfile: activeProfile, id: "fixture-user", role: "student" }
        })
      }
    });
    mock.module("@/lib/server/practiceAttemptStore", {
      namedExports: {
        practiceAttemptFastPathPersistsRows: () => true,
        submitQuestionAttemptFast: async (input) => {
          fastPathCalls.push({ questionId: input.questionId, curriculumTrack: input.curriculumTrack });
          const questionProfile = questions[input.questionId];
          const scope = input.curriculumTrack;
          const authorized = Boolean(
            questionProfile &&
              scope &&
              typeof scope === "object" &&
              questionProfile.region === scope.region &&
              questionProfile.publisher === scope.publisher
          );
          if (!authorized) return null;
          return {
            correct: true,
            explanation: { en: "fixture", zh: "测试", zhHans: "测试" },
            persisted: true
          };
        }
      }
    });

    const { POST } = await import("./app/api/attempts/route.ts");
    async function submit(questionId, bodyOverrides = {}) {
      const response = await POST(new Request("http://localhost/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, selectedAnswer: "A", ...bodyOverrides })
      }));
      return { body: await response.json(), status: response.status };
    }

    activeProfile = profiles.hk;
    const hkForeign = await submit("fixture-mainland", { curriculumProfile: profiles.mainland });
    assert.equal(hkForeign.status, 404);
    assert.deepEqual(hkForeign.body, { error: "Question not found." });

    activeProfile = profiles.mainland;
    const mainlandForeign = await submit("fixture-us-nc", { curriculumTrack: "US_NC_MATH" });
    assert.equal(mainlandForeign.status, 404);
    assert.deepEqual(mainlandForeign.body, { error: "Question not found." });

    activeProfile = profiles.northCarolina;
    const northCarolinaForeign = await submit("fixture-hk", { curriculumTrack: "HK" });
    assert.equal(northCarolinaForeign.status, 404);
    assert.deepEqual(northCarolinaForeign.body, { error: "Question not found." });

    const northCarolinaValid = await submit("fixture-us-nc", { curriculumProfile: profiles.hk });
    assert.equal(northCarolinaValid.status, 200);
    assert.equal(northCarolinaValid.body.persisted, true);
    assert.equal(northCarolinaValid.body.correct, true);

    assert.deepEqual(fastPathCalls, [
      { questionId: "fixture-mainland", curriculumTrack: profiles.hk },
      { questionId: "fixture-us-nc", curriculumTrack: profiles.mainland },
      { questionId: "fixture-hk", curriculumTrack: profiles.northCarolina },
      { questionId: "fixture-us-nc", curriculumTrack: profiles.northCarolina }
    ]);
    process.stdout.write("curriculum scope boundary verified");
  `;
  const result = spawnSync(
    process.execPath,
    ["--no-warnings", "--experimental-test-module-mocks", "--import", "tsx", "--input-type=module", "-e", script],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: hermeticChildEnv({ temporaryRoot, databaseDirectory }),
      timeout: 15_000
    }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(result.stdout, "curriculum scope boundary verified");
});

test("attempts POST enforces live HK/Mainland scope and reports empty NC availability with the real SQLite store", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "mais-attempt-route-curriculum-"));
  const databaseDirectory = await mkdtemp(join(temporaryRoot, "database-"));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  const script = `
    import assert from "node:assert/strict";
    import { mock } from "node:test";

    const profiles = {
      hk: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      mainland: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      northCarolina: { region: "US", publisher: "US_NC_MATH" }
    };
    let activeProfile = profiles.hk;
    mock.module("@/lib/server/auth", {
      namedExports: {
        bodyExpectedUserConstraints: () => [],
        expectedUserConstraintsFromRequest: () => [],
        guardExpectedAuthenticatedUser: () => null,
        requireAuthenticatedUser: async () => ({
          user: { curriculumProfile: activeProfile, id: "fixture-user", role: "student" }
        })
      }
    });

    const { POST } = await import("./app/api/attempts/route.ts");
    const { usMathLiveQuestions } = await import("./data/usMathQuestions.ts");
    assert.equal(usMathLiveQuestions.length, 0, "NC currently has no live question source");
    async function submit(questionId, bodyOverrides = {}) {
      const response = await POST(new Request("http://localhost/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, selectedAnswer: "5", ...bodyOverrides })
      }));
      return { body: await response.json(), status: response.status };
    }

    activeProfile = profiles.hk;
    const hkToMainland = await submit("pep-high-s4-mc-001", { curriculumProfile: profiles.mainland });
    assert.equal(hkToMainland.status, 404);
    assert.deepEqual(hkToMainland.body, { error: "Question not found." });

    activeProfile = profiles.mainland;
    const mainlandToHk = await submit("q1", { curriculumTrack: "HK" });
    assert.equal(mainlandToHk.status, 404);
    assert.deepEqual(mainlandToHk.body, { error: "Question not found." });

    activeProfile = profiles.northCarolina;
    const northCarolinaToHkUnavailable = await submit("q1", { curriculumProfile: profiles.hk });
    assert.equal(northCarolinaToHkUnavailable.status, 404);
    assert.deepEqual(northCarolinaToHkUnavailable.body, { error: "Question not found." });

    const northCarolinaToMainlandUnavailable = await submit("pep-high-s4-mc-001", { curriculumProfile: profiles.mainland });
    assert.equal(northCarolinaToMainlandUnavailable.status, 404);
    assert.deepEqual(northCarolinaToMainlandUnavailable.body, { error: "Question not found." });

    activeProfile = profiles.hk;
    const hkValid = await submit("q1", { curriculumTrack: "MAINLAND_PEP_HIGH" });
    assert.equal(hkValid.status, 200);
    assert.equal(hkValid.body.persisted, true);
    assert.equal(hkValid.body.correct, true);
    process.stdout.write("real curriculum store verified");
  `;
  const result = spawnSync(
    process.execPath,
    ["--no-warnings", "--experimental-test-module-mocks", "--import", "tsx", "--input-type=module", "-e", script],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: hermeticChildEnv({ temporaryRoot, databaseDirectory }),
      timeout: 15_000
    }
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(result.stdout, "real curriculum store verified");
  assert.equal(existsSync(join(databaseDirectory, "hk-math-db.sqlite")), true, "the child must use its task-owned database directory");
});
