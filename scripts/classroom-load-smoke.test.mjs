import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
const smokePath = path.join(scriptsDir, "classroom-load-smoke.mjs");
const smokeModule = existsSync(smokePath)
  ? await import(`${pathToFileURL(smokePath).href}?unit-test=${Date.now()}`)
  : {};

function requiredExport(name) {
  assert.equal(typeof smokeModule[name], "function", `Missing classroom smoke export: ${name}`);
  return smokeModule[name];
}

function source(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

async function listen(handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

test("classroom load smoke is a standalone staging command with no production integration", () => {
  assert.equal(existsSync(smokePath), true, "classroom load smoke script must exist");

  const packageJson = JSON.parse(source("package.json"));
  assert.equal(packageJson.scripts?.["smoke:classroom-load"], "node scripts/classroom-load-smoke.mjs");

  const release = source("RELEASE.md");
  assert.match(release, /Classroom-concurrency load smoke \(staging only\)/u);
  assert.match(release, /not staging evidence/u);

  for (const relativePath of [
    "scripts/prod-certification.mjs",
    "scripts/prod-certification.test.mjs",
    "scripts/deploy-vercel-production.mjs",
    ".github/workflows/production-deploy.yml"
  ]) {
    assert.doesNotMatch(source(relativePath), /classroom-load-smoke|smoke:classroom-load/u, `${relativePath} must not integrate the write smoke`);
  }

  const governedSources = [
    existsSync(smokePath) ? source("scripts/classroom-load-smoke.mjs") : "",
    release,
    source("package.json"),
    source("scripts/release-governance.test.mjs")
  ].join("\n");
  const removedProductionBypass = ["CLASSROOM_LOAD", "ALLOW", "PRODUCTION"].join("_");
  assert.equal(governedSources.includes(removedProductionBypass), false);
});

test("staging targets require an exact, valid allowlist and permanently deny production hosts", () => {
  const resolveExecutionTarget = requiredExport("resolveExecutionTarget");
  const stagingUrl = "https://candidate-preview.example.test";

  assert.deepEqual(
    resolveExecutionTarget(
      { baseUrl: stagingUrl, mode: "staging" },
      { CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST: "candidate-preview.example.test" }
    ),
    {
      baseUrl: stagingUrl,
      evidenceMode: "staging",
      expectedOrigin: stagingUrl,
      stagingEvidence: true
    }
  );

  assert.throws(() => resolveExecutionTarget({ baseUrl: stagingUrl, mode: "staging" }, {}), /allowlist/i);
  assert.throws(
    () => resolveExecutionTarget(
      { baseUrl: stagingUrl, mode: "staging" },
      { CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST: "other-preview.example.test" }
    ),
    /exactly allowlisted/i
  );

  for (const invalidAllowlist of [
    "",
    "*",
    "*.example.test",
    "https://candidate-preview.example.test",
    "candidate-preview.example.test,",
    ",candidate-preview.example.test",
    "candidate-preview.example.test:443",
    "127.0.0.1",
    "candidate-preview.example.test/path",
    "mais.ac"
  ]) {
    assert.throws(
      () => resolveExecutionTarget(
        { baseUrl: stagingUrl, mode: "staging" },
        { CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST: invalidAllowlist }
      ),
      /allowlist|production/i,
      `invalid allowlist must fail closed: ${invalidAllowlist || "<empty>"}`
    );
  }

  for (const productionHost of ["mais.ac", "www.mais.ac", "mais.hk", "www.mais.hk"]) {
    assert.throws(
      () => resolveExecutionTarget(
        { baseUrl: `https://${productionHost}`, mode: "staging" },
        { CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST: productionHost }
      ),
      /production/i
    );
  }

  assert.throws(
    () => resolveExecutionTarget(
      { baseUrl: "http://candidate-preview.example.test", mode: "staging" },
      { CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST: "candidate-preview.example.test" }
    ),
    /HTTPS/i
  );
  assert.throws(
    () => resolveExecutionTarget(
      { baseUrl: `${stagingUrl}/nested`, mode: "staging" },
      { CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST: "candidate-preview.example.test" }
    ),
    /origin/i
  );
});

test("loopback runs require explicit local mode and can never become staging evidence", () => {
  const resolveExecutionTarget = requiredExport("resolveExecutionTarget");

  assert.deepEqual(resolveExecutionTarget({ baseUrl: "http://127.0.0.1:3417", mode: "local" }, {}), {
    baseUrl: "http://127.0.0.1:3417",
    evidenceMode: "local-verification",
    expectedOrigin: "http://127.0.0.1:3417",
    stagingEvidence: false
  });
  assert.throws(() => resolveExecutionTarget({ baseUrl: "http://127.0.0.1:3417", mode: "staging" }, {}), /staging|loopback/i);
  assert.throws(() => resolveExecutionTarget({ baseUrl: "https://candidate-preview.example.test", mode: "local" }, {}), /loopback/i);
  assert.throws(() => resolveExecutionTarget({ baseUrl: "http://127.0.0.1", mode: "local" }, {}), /port/i);
  assert.throws(() => resolveExecutionTarget({ baseUrl: "http://127.0.0.1:3417", mode: "" }, {}), /mode/i);
});

test("same-origin redirect handling follows bounded redirects and rejects cross-origin before forwarding", async (t) => {
  const fetchWithOriginLock = requiredExport("fetchWithOriginLock");

  const sameOrigin = await listen((request, response) => {
    if (request.url === "/start") {
      response.writeHead(307, { Location: "/final" });
      response.end();
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end("{\"ok\":true}");
  });
  t.after(sameOrigin.close);

  const followed = await fetchWithOriginLock(
    `${sameOrigin.origin}/start`,
    { method: "POST", body: "probe" },
    { expectedOrigin: sameOrigin.origin, maxRedirects: 2 }
  );
  assert.equal(followed.status, 200);
  assert.equal(followed.url, `${sameOrigin.origin}/final`);

  let foreignRequests = 0;
  const foreignOrigin = await listen((_request, response) => {
    foreignRequests += 1;
    response.writeHead(200);
    response.end("unexpected");
  });
  t.after(foreignOrigin.close);

  const redirector = await listen((_request, response) => {
    response.writeHead(307, { Location: `${foreignOrigin.origin}/receive` });
    response.end();
  });
  t.after(redirector.close);

  await assert.rejects(
    fetchWithOriginLock(
      `${redirector.origin}/login`,
      { method: "POST", body: "credential-placeholder" },
      { expectedOrigin: redirector.origin, maxRedirects: 2 }
    ),
    /redirect origin/i
  );
  assert.equal(foreignRequests, 0, "cross-origin redirect target must never receive the request");
});

test("CLI and configuration keep credentials out of arguments and bound classroom load", () => {
  const parseArgs = requiredExport("parseArgs");
  const buildSmokeConfig = requiredExport("buildSmokeConfig");

  const args = parseArgs([
    "--mode", "staging",
    "--base-url", "https://candidate-preview.example.test",
    "--students", "20",
    "--rounds", "4",
    "--json"
  ], {});
  assert.equal(args.students, 20);
  assert.equal(args.rounds, 4);
  assert.equal(args.json, true);

  for (const secretFlag of ["--cookie", "--password", "--username", "--password=do-not-echo-value"]) {
    let failure;
    try {
      parseArgs([secretFlag, "do-not-echo-value"], {});
    } catch (error) {
      failure = error;
    }
    assert.ok(failure instanceof Error);
    assert.doesNotMatch(failure.message, /do-not-echo-value/u);
  }

  assert.throws(() => parseArgs(["--students", "0"], {}), /students/i);
  assert.throws(() => parseArgs(["--students", "201"], {}), /students/i);
  assert.throws(() => parseArgs(["--rounds", "0"], {}), /rounds/i);
  assert.throws(() => parseArgs(["--rounds", "51"], {}), /rounds/i);

  const config = buildSmokeConfig(args, {
    CLASSROOM_LOAD_READ_P95_MS: "3000",
    CLASSROOM_LOAD_TIMEOUT_MS: "30000",
    CLASSROOM_LOAD_WRITE_P95_MS: "2000"
  });
  assert.equal(config.students, 20);
  assert.equal(config.rounds, 4);
  assert.equal(config.timeoutMs, 30_000);
  assert.equal(config.writeThresholdMs, 2_000);
  assert.equal(config.readThresholdMs, 3_000);
  assert.throws(() => buildSmokeConfig(args, { CLASSROOM_LOAD_TIMEOUT_MS: "999999" }), /timeout/i);
});

test("current student API request builders preserve explicit writes and expected-user guards", () => {
  const buildAttemptBody = requiredExport("buildAttemptBody");
  const buildLessonProgressBody = requiredExport("buildLessonProgressBody");
  const buildStudentHeaders = requiredExport("buildStudentHeaders");

  assert.deepEqual(buildAttemptBody({
    durationSeconds: 12,
    expectedUserId: "student-id-placeholder",
    questionId: "question-id-placeholder",
    selectedAnswer: "answer-placeholder"
  }), {
    durationSeconds: 12,
    expectedUserId: "student-id-placeholder",
    questionId: "question-id-placeholder",
    selectedAnswer: "answer-placeholder"
  });
  assert.deepEqual(buildLessonProgressBody({ lessonSlug: "lesson-placeholder", round: 0, rounds: 2 }), {
    action: "update",
    durationSeconds: 30,
    slug: "lesson-placeholder"
  });
  assert.deepEqual(buildLessonProgressBody({ lessonSlug: "lesson-placeholder", round: 1, rounds: 2 }), {
    action: "complete",
    durationSeconds: 30,
    slug: "lesson-placeholder"
  });

  const headers = buildStudentHeaders({
    cookie: "session-cookie-placeholder",
    expectedUserId: "student-id-placeholder"
  }, {});
  assert.equal(headers.Cookie, "session-cookie-placeholder");
  assert.equal(headers["X-MAIS-Expected-User-Id"], "student-id-placeholder");

  assert.match(source("app/api/attempts/route.ts"), /bodyExpectedUserConstraints\(body\)[\s\S]*requireConstraint:\s*true/u);
  assert.match(source("app/api/lesson-entry/route.ts"), /expectedUserConstraintsFromRequest\(request\)[\s\S]*requireConstraint:\s*true/u);
  assert.match(source("app/api/lesson-progress/route.ts"), /slug:\s*record\.slug[\s\S]*action,[\s\S]*durationSeconds/u);
});

test("aggregation fails every request error and reports p50 p95 and max", () => {
  const aggregateMeasurements = requiredExport("aggregateMeasurements");
  const budgets = {
    attempts: { kind: "write", thresholdMs: 2_000 },
    dashboard: { kind: "read", thresholdMs: 3_000 }
  };
  const results = aggregateMeasurements([
    { elapsedMs: 100, endpoint: "attempts", ok: true, status: 200 },
    { elapsedMs: 300, endpoint: "attempts", ok: true, status: 200 },
    { elapsedMs: 50, endpoint: "dashboard", ok: false, status: 500 }
  ], budgets);

  assert.deepEqual(results[0], {
    errorCount: 0,
    errorRate: 0,
    kind: "write",
    maxMs: 300,
    name: "attempts",
    ok: true,
    p50Ms: 100,
    p95Ms: 300,
    requests: 2,
    statuses: [200],
    thresholdMs: 2_000
  });
  assert.equal(results[1].name, "dashboard");
  assert.equal(results[1].ok, false, "one fast HTTP error must fail the endpoint");
  assert.equal(results[1].errorCount, 1);
  assert.equal(results[1].errorRate, 1);
  assert.equal(results[1].p50Ms, 50);
  assert.equal(results[1].p95Ms, 50);
  assert.equal(results[1].maxMs, 50);
});

test("auth summaries and run reports expose only redacted shape counts", () => {
  const redactedAuthSummary = requiredExport("redactedAuthSummary");
  const buildRunReport = requiredExport("buildRunReport");

  assert.deepEqual(redactedAuthSummary("credentials", 1), {
    distinctIdentities: 1,
    kind: "credentials",
    loginCount: 1
  });
  assert.deepEqual(redactedAuthSummary("cookie", 0), {
    distinctIdentities: 1,
    kind: "cookie",
    loginCount: 0
  });

  const report = buildRunReport({
    auth: redactedAuthSummary("cookie", 0),
    config: { grade: "P1", readThresholdMs: 3_000, rounds: 1, students: 2, writeThresholdMs: 2_000 },
    generatedAt: "2026-08-29T00:00:00.000Z",
    loginDurations: [],
    results: [],
    target: {
      baseUrl: "http://127.0.0.1:3417",
      evidenceMode: "local-verification",
      expectedOrigin: "http://127.0.0.1:3417",
      stagingEvidence: false
    },
    workload: { lessonSlug: "lesson-placeholder", questionPoolSize: 2 }
  });
  assert.equal(report.evidenceMode, "local-verification");
  assert.equal(report.stagingEvidence, false);
  assert.deepEqual(report.auth, { distinctIdentities: 1, kind: "cookie", loginCount: 0 });
  assert.equal(Object.hasOwn(report.auth, "username"), false);
  assert.equal(Object.hasOwn(report.auth, "password"), false);
  assert.equal(Object.hasOwn(report.auth, "cookie"), false);
});

test("classroom smoke artifact stays in ignored local-only storage", () => {
  const ignored = spawnSync("git", ["check-ignore", "-q", ".tmp/classroom-load-smoke/last-run.json"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(ignored.status, 0, ignored.stderr || ignored.stdout);
});
