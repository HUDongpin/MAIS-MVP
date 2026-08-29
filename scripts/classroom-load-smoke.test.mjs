import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
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

async function temporaryRoot(t, label) {
  const root = await mkdtemp(path.join(tmpdir(), `mais-classroom-${label}-`));
  t.after(() => rm(root, { recursive: true, force: true }));
  return realpath(root);
}

async function rejectsWithCode(promise, expectedCode) {
  await assert.rejects(promise, (error) => {
    assert.equal(error?.code, expectedCode);
    assert.doesNotMatch(String(error?.message ?? ""), /credential-placeholder|body-secret-placeholder/u);
    return true;
  });
}

test("classroom load smoke is a standalone staging command with no production integration", () => {
  assert.equal(existsSync(smokePath), true, "classroom load smoke script must exist");

  const packageJson = JSON.parse(source("package.json"));
  assert.equal(packageJson.scripts?.["smoke:classroom-load"], "node scripts/classroom-load-smoke.mjs");
  assert.equal(
    packageJson.scripts?.["test:release-governance"],
    "node --test --test-concurrency=1 scripts/classroom-load-smoke.test.mjs scripts/release-build-gate.test.mjs scripts/release-governance.test.mjs"
  );

  const release = source("RELEASE.md");
  assert.match(release, /Classroom-concurrency load smoke \(staging only\)/u);
  assert.match(release, /not staging evidence/u);
  assert.match(release, /single-identity-seat-fanout/u);
  assert.match(release, /one disposable staging-only identity/u);
  assert.equal(release.includes(["--", "students"].join("")), false);
  assert.equal(release.includes(["CLASSROOM_LOAD", "STUDENTS"].join("_")), false);

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

  const smokeSource = source("scripts/classroom-load-smoke.mjs");
  assert.doesNotMatch(smokeSource, /response\.text\(/u);
  assert.match(smokeSource, /O_CREAT[\s\S]*O_EXCL[\s\S]*O_NOFOLLOW/u);
  assert.match(smokeSource, /fstatSync\([^)]*\)[\s\S]*nlink/u);
  assert.match(smokeSource, /fsyncSync\([^)]*\)[\s\S]*closeSync\([^)]*\)[\s\S]*renameSync/u);
  assert.doesNotMatch(smokeSource, /writeFile\(artifactPath/u);
  assert.match(smokeSource, /validateSessionContinuity[\s\S]*for \(let round[\s\S]*validateSessionContinuity[\s\S]*runClassRound/u);
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
      { baseUrl: "https://candidate-preview.example.test:8443", mode: "staging" },
      { CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST: "candidate-preview.example.test" }
    ),
    /port/i
  );
  assert.equal(
    resolveExecutionTarget(
      { baseUrl: "https://candidate-preview.example.test:443", mode: "staging" },
      { CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST: "candidate-preview.example.test" }
    ).baseUrl,
    stagingUrl,
    "an explicit default HTTPS port canonicalizes to the standard origin"
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

  await rejectsWithCode(
    fetchWithOriginLock(
      `${redirector.origin}/login`,
      { method: "POST", body: "credential-placeholder" },
      { expectedOrigin: redirector.origin, maxRedirects: 2 }
    ),
    "redirect-origin-mismatch"
  );
  assert.equal(foreignRequests, 0, "cross-origin redirect target must never receive the request");
});

test("write redirect matrix is fixed-code, bounded, and cancels every rejected redirect body", async () => {
  const fetchWithOriginLock = requiredExport("fetchWithOriginLock");
  const origin = "https://candidate-preview.example.test";

  const redirectResponse = (status, location, onCancel = () => {}) => ({
    body: { cancel: async () => onCancel() },
    headers: new Headers(location === undefined ? {} : { Location: location }),
    status,
    url: ""
  });

  for (const status of [301, 302, 303]) {
    let calls = 0;
    let cancellations = 0;
    await rejectsWithCode(
      fetchWithOriginLock(
        `${origin}/write`,
        { body: "body-secret-placeholder", method: "POST" },
        {
          expectedOrigin: origin,
          fetchImpl: async () => {
            calls += 1;
            return redirectResponse(status, "/next", () => { cancellations += 1; });
          }
        }
      ),
      "redirect-method-change"
    );
    assert.equal(calls, 1);
    assert.equal(cancellations, 1);
  }

  for (const status of [307, 308]) {
    const requests = [];
    const response = await fetchWithOriginLock(
      `${origin}/write`,
      { body: "body-secret-placeholder", method: "POST" },
      {
        expectedOrigin: origin,
        fetchImpl: async (url, options) => {
          requests.push({ body: options.body, method: options.method, url: String(url) });
          return requests.length === 1
            ? redirectResponse(status, "/next")
            : new Response("ok", { status: 200 });
        }
      }
    );
    assert.equal(response.status, 200);
    assert.deepEqual(requests, [
      { body: "body-secret-placeholder", method: "POST", url: `${origin}/write` },
      { body: "body-secret-placeholder", method: "POST", url: `${origin}/next` }
    ]);
  }

  await rejectsWithCode(
    fetchWithOriginLock(`${origin}/missing`, { method: "GET" }, {
      expectedOrigin: origin,
      fetchImpl: async () => redirectResponse(302, undefined)
    }),
    "redirect-location-missing"
  );
  await rejectsWithCode(
    fetchWithOriginLock(`${origin}/invalid`, { method: "GET" }, {
      expectedOrigin: origin,
      fetchImpl: async () => redirectResponse(302, "http://[")
    }),
    "redirect-location-invalid"
  );

  let redirectCalls = 0;
  let redirectCancellations = 0;
  await rejectsWithCode(
    fetchWithOriginLock(`${origin}/loop`, { method: "GET" }, {
      expectedOrigin: origin,
      maxRedirects: 1,
      fetchImpl: async () => {
        redirectCalls += 1;
        return redirectResponse(302, "/loop", () => { redirectCancellations += 1; });
      }
    }),
    "redirect-limit-exceeded"
  );
  assert.equal(redirectCalls, 2);
  assert.equal(redirectCancellations, 2);
});

test("CLI and configuration keep credentials out of arguments and bound classroom load", () => {
  const parseArgs = requiredExport("parseArgs");
  const buildSmokeConfig = requiredExport("buildSmokeConfig");

  const args = parseArgs([
    "--mode", "staging",
    "--base-url", "https://candidate-preview.example.test",
    "--seat-concurrency", "20",
    "--rounds", "4",
    "--json"
  ], {});
  assert.equal(args.seatConcurrency, 20);
  assert.equal(args.rounds, 4);
  assert.equal(args.json, true);
  assert.equal(parseArgs([], { CLASSROOM_LOAD_SEAT_CONCURRENCY: "12" }).seatConcurrency, 12);

  let legacyStudentsFailure;
  try {
    parseArgs(["--students", "20"], {});
  } catch (error) {
    legacyStudentsFailure = error;
  }
  assert.ok(legacyStudentsFailure instanceof Error);
  const removedSeatEnv = ["CLASSROOM_LOAD", "STUDENTS"].join("_");
  assert.equal(source("scripts/classroom-load-smoke.mjs").includes(removedSeatEnv), false);

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

  assert.throws(() => parseArgs(["--seat-concurrency", "0"], {}), /seat concurrency/i);
  assert.throws(() => parseArgs(["--seat-concurrency", "201"], {}), /seat concurrency/i);
  assert.throws(() => parseArgs(["--rounds", "0"], {}), /rounds/i);
  assert.throws(() => parseArgs(["--rounds", "51"], {}), /rounds/i);

  const config = buildSmokeConfig(args, {
    CLASSROOM_LOAD_READ_P95_MS: "3000",
    CLASSROOM_LOAD_TIMEOUT_MS: "30000",
    CLASSROOM_LOAD_WRITE_P95_MS: "2000"
  });
  assert.equal(config.seatConcurrency, 20);
  assert.equal(config.rounds, 4);
  assert.equal(config.timeoutMs, 30_000);
  assert.equal(config.writeThresholdMs, 2_000);
  assert.equal(config.readThresholdMs, 3_000);
  assert.throws(() => buildSmokeConfig(args, { CLASSROOM_LOAD_TIMEOUT_MS: "999999" }), /timeout/i);
});

test("bounded response reader rejects declared and chunked oversized bodies without leaking body content", async () => {
  const readBoundedResponseBody = requiredExport("readBoundedResponseBody");
  assert.deepEqual(smokeModule.responseBodyLimits, {
    dashboard: 2 * 1024 * 1024,
    lessonEntry: 256 * 1024,
    login: 64 * 1024,
    questionBank: 8 * 1024 * 1024,
    session: 64 * 1024,
    write: 256 * 1024
  });

  const declared = new Response("body-secret-placeholder", {
    headers: { "Content-Length": "999" }
  });
  await rejectsWithCode(readBoundedResponseBody(declared, { maxBytes: 16 }), "response-body-too-large");
  assert.equal(declared.body.locked, false);

  let chunkedCanceled = false;
  const chunked = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("12345678"));
      controller.enqueue(new TextEncoder().encode("body-secret-placeholder"));
    },
    cancel() {
      chunkedCanceled = true;
    }
  }));
  await rejectsWithCode(readBoundedResponseBody(chunked, { maxBytes: 12 }), "response-body-too-large");
  assert.equal(chunkedCanceled, true);
  assert.equal(chunked.body.locked, false, "reader lock must always be released");

  const invalidLength = new Response("{}", { headers: { "Content-Length": "not-an-integer" } });
  await rejectsWithCode(
    readBoundedResponseBody(invalidLength, { maxBytes: 16 }),
    "response-content-length-invalid"
  );

  const valid = new Response("{\"ok\":true}");
  assert.equal(await readBoundedResponseBody(valid, { maxBytes: 64 }), "{\"ok\":true}");
  assert.equal(valid.body.locked, false);
});

test("request timeout remains effective while waiting for a bounded response body", async (t) => {
  const timedFetch = requiredExport("timedFetch");
  const slow = await listen((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.flushHeaders();
    setTimeout(() => response.end("{\"ok\":true}"), 80);
  });
  t.after(slow.close);

  const result = await timedFetch(`${slow.origin}/slow`, {
    expectedOrigin: slow.origin,
    maxResponseBytes: 64,
    timeoutMs: 10
  });
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "request-timeout");
  assert.equal(Object.hasOwn(result, "text"), false, "failed requests must not expose a raw body");
  assert.equal(Object.hasOwn(result, "error"), false, "failed requests must not expose a raw error");
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

test("run report enforces exact measured topology and honest single-identity seat fanout", () => {
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

  const endpointResult = (name, kind, thresholdMs, requests = 2) => ({
    errorCount: 0,
    errorRate: 0,
    kind,
    maxMs: 30,
    name,
    ok: true,
    p50Ms: 20,
    p95Ms: 30,
    requests,
    statuses: [200],
    thresholdMs
  });
  const exactResults = [
    endpointResult("attempts", "write", 2_000),
    endpointResult("lesson-progress", "write", 2_000),
    endpointResult("dashboard", "read", 3_000)
  ];
  const baseInput = {
    auth: redactedAuthSummary("cookie", 0),
    config: { grade: "P1", readThresholdMs: 3_000, rounds: 1, seatConcurrency: 2, writeThresholdMs: 2_000 },
    continuity: { checks: 2, status: "pass" },
    discovery: { lessonEntryResolved: true, questionPoolSize: 2, status: "pass" },
    generatedAt: "2026-08-29T00:00:00.000Z",
    loginDurations: [],
    results: exactResults,
    target: {
      baseUrl: "http://127.0.0.1:3417",
      evidenceMode: "local-verification",
      expectedOrigin: "http://127.0.0.1:3417",
      stagingEvidence: false
    }
  };
  const report = buildRunReport(baseInput);
  assert.equal(report.evidenceMode, "local-verification");
  assert.equal(report.stagingEvidence, false);
  assert.equal(report.loadShape, "single-identity-seat-fanout");
  assert.equal(report.seatConcurrency, 2);
  assert.equal(report.totalRequests, 6);
  assert.deepEqual(report.continuity, { checks: 2, status: "pass" });
  assert.deepEqual(report.discovery, { lessonEntryResolved: true, questionPoolSize: 2, status: "pass" });
  assert.deepEqual(report.results.map((result) => result.name), ["attempts", "lesson-progress", "dashboard"]);
  assert.deepEqual(report.auth, { distinctIdentities: 1, kind: "cookie", loginCount: 0 });
  assert.equal(Object.hasOwn(report.auth, "username"), false);
  assert.equal(Object.hasOwn(report.auth, "password"), false);
  assert.equal(Object.hasOwn(report.auth, "cookie"), false);
  assert.equal(Object.hasOwn(report, "students"), false);

  const invalidTopologies = [
    exactResults.slice(0, 2),
    [exactResults[0], exactResults[0], exactResults[1], exactResults[2]],
    [...exactResults, endpointResult("extra-endpoint", "read", 1_000)],
    [endpointResult("attempts", "write", 2_000, 1), exactResults[1], exactResults[2]]
  ];
  for (const results of invalidTopologies) {
    assert.throws(
      () => buildRunReport({ ...baseInput, results }),
      (error) => error?.code === "report-topology-invalid"
    );
  }
});

test("credential continuity mismatch stops before discovery or any measured write", async () => {
  const runSmoke = requiredExport("runSmoke");
  const calls = [];
  let reportWrites = 0;
  const jsonResponse = (payload, init = {}) => {
    const body = JSON.stringify(payload);
    return new Response(body, {
      ...init,
      headers: {
        "Content-Length": String(Buffer.byteLength(body)),
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });
  };
  const fetchImpl = async (url) => {
    const pathname = new URL(url).pathname;
    calls.push(pathname);
    if (pathname === "/api/auth/login") {
      return jsonResponse(
        { user: { id: "login-user-placeholder", role: "student" } },
        { headers: { "Set-Cookie": "session-cookie-placeholder; Path=/" } }
      );
    }
    if (pathname === "/api/auth/session-state") {
      return jsonResponse({ user: { id: "changed-user-placeholder", role: "student" } });
    }
    throw new Error("unexpected request after continuity mismatch");
  };

  await rejectsWithCode(
    runSmoke(
      {
        baseUrl: "http://127.0.0.1:3417",
        grade: "P1",
        json: true,
        mode: "local",
        rounds: 1,
        selfTest: false,
        seatConcurrency: 2
      },
      {
        CLASSROOM_LOAD_PASSWORD: "password-placeholder",
        CLASSROOM_LOAD_USERNAME: "username-placeholder"
      },
      {
        fetchImpl,
        writeReport: async () => { reportWrites += 1; }
      }
    ),
    "session-continuity-mismatch"
  );
  assert.deepEqual(calls, ["/api/auth/login", "/api/auth/session-state"]);
  assert.equal(calls.some((pathname) => ["/api/attempts", "/api/lesson-progress", "/api/dashboard"].includes(pathname)), false);
  assert.equal(reportWrites, 0);
});

test("identity swap before round two preserves only round-one measurements and writes no report", async () => {
  const runSmoke = requiredExport("runSmoke");
  const measuredCalls = [];
  let reportWrites = 0;
  let sessionChecks = 0;
  const jsonResponse = (payload, init = {}) => {
    const body = JSON.stringify(payload);
    return new Response(body, {
      ...init,
      headers: {
        "Content-Length": String(Buffer.byteLength(body)),
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });
  };
  const fetchImpl = async (url, options) => {
    const pathname = new URL(url).pathname;
    if (pathname === "/api/auth/login") {
      return jsonResponse(
        { user: { id: "stable-user-placeholder", role: "student" } },
        { headers: { "Set-Cookie": "session-cookie-placeholder; Path=/" } }
      );
    }
    if (pathname === "/api/auth/session-state") {
      sessionChecks += 1;
      return jsonResponse({
        user: {
          id: sessionChecks < 3 ? "stable-user-placeholder" : "changed-user-placeholder",
          role: "student"
        }
      });
    }
    if (pathname === "/api/questions") {
      return jsonResponse({ questions: [{ id: "question-placeholder", options: ["1"] }] });
    }
    if (pathname === "/api/lesson-entry") {
      return jsonResponse({ lessonEntryTarget: { slug: "lesson-placeholder" } });
    }
    if (["/api/attempts", "/api/lesson-progress", "/api/dashboard"].includes(pathname)) {
      measuredCalls.push(`${options.method ?? "GET"} ${pathname}`);
      return jsonResponse({ ok: true });
    }
    throw new Error("unexpected request");
  };

  await rejectsWithCode(
    runSmoke(
      {
        baseUrl: "http://127.0.0.1:3417",
        grade: "P1",
        json: true,
        mode: "local",
        rounds: 2,
        selfTest: false,
        seatConcurrency: 1
      },
      {
        CLASSROOM_LOAD_PASSWORD: "password-placeholder",
        CLASSROOM_LOAD_USERNAME: "username-placeholder"
      },
      {
        fetchImpl,
        printReport: false,
        writeReport: async () => { reportWrites += 1; }
      }
    ),
    "session-continuity-mismatch"
  );
  assert.equal(sessionChecks, 3);
  assert.deepEqual(measuredCalls, [
    "POST /api/attempts",
    "POST /api/lesson-progress",
    "GET /api/dashboard"
  ]);
  assert.equal(reportWrites, 0);
});

test("safe report writer enforces 0700 directory, 0600 atomic regular file, and bounded output", async (t) => {
  const writeSafeReport = requiredExport("writeSafeReport");
  const root = await temporaryRoot(t, "safe-report");
  const localTmp = path.join(root, ".tmp");
  const reportDir = path.join(localTmp, "classroom-load-smoke");
  const finalPath = path.join(reportDir, "last-run.json");
  await mkdir(reportDir, { recursive: true, mode: 0o777 });
  await chmod(reportDir, 0o777);

  const result = await writeSafeReport({ ok: true, stagingEvidence: false }, { rootDir: root });
  assert.equal(result, finalPath);
  const directoryStat = await lstat(reportDir);
  const finalStat = await lstat(finalPath);
  assert.equal(directoryStat.isDirectory(), true);
  assert.equal(directoryStat.isSymbolicLink(), false);
  assert.equal(directoryStat.mode & 0o777, 0o700);
  assert.equal(finalStat.isFile(), true);
  assert.equal(finalStat.isSymbolicLink(), false);
  assert.equal(finalStat.nlink, 1);
  assert.equal(finalStat.mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(await readFile(finalPath, "utf8")), { ok: true, stagingEvidence: false });

  await writeFile(finalPath, "stable-final\n", { mode: 0o600 });
  await rejectsWithCode(
    writeSafeReport({ payload: "body-secret-placeholder" }, { maxBytes: 16, rootDir: root }),
    "artifact-report-too-large"
  );
  assert.equal(await readFile(finalPath, "utf8"), "stable-final\n");
  assert.deepEqual((await readdir(reportDir)).sort(), ["last-run.json"]);
});

test("safe report writer rejects symlinked parent components before target modification", async (t) => {
  const writeSafeReport = requiredExport("writeSafeReport");

  const tmpSymlinkRoot = await temporaryRoot(t, "tmp-symlink");
  const tmpSymlinkTarget = path.join(tmpSymlinkRoot, "outside-tmp");
  await mkdir(tmpSymlinkTarget, { mode: 0o700 });
  await writeFile(path.join(tmpSymlinkTarget, "sentinel"), "unchanged\n");
  await symlink(tmpSymlinkTarget, path.join(tmpSymlinkRoot, ".tmp"));
  await rejectsWithCode(writeSafeReport({ ok: true }, { rootDir: tmpSymlinkRoot }), "artifact-parent-unsafe");
  assert.equal(await readFile(path.join(tmpSymlinkTarget, "sentinel"), "utf8"), "unchanged\n");
  assert.equal(existsSync(path.join(tmpSymlinkTarget, "classroom-load-smoke")), false);

  const dirSymlinkRoot = await temporaryRoot(t, "dir-symlink");
  const dirSymlinkTarget = path.join(dirSymlinkRoot, "outside-report");
  await mkdir(path.join(dirSymlinkRoot, ".tmp"), { mode: 0o700 });
  await mkdir(dirSymlinkTarget, { mode: 0o700 });
  await writeFile(path.join(dirSymlinkTarget, "sentinel"), "unchanged\n");
  await symlink(dirSymlinkTarget, path.join(dirSymlinkRoot, ".tmp", "classroom-load-smoke"));
  await rejectsWithCode(writeSafeReport({ ok: true }, { rootDir: dirSymlinkRoot }), "artifact-parent-unsafe");
  assert.equal(await readFile(path.join(dirSymlinkTarget, "sentinel"), "utf8"), "unchanged\n");
  assert.equal(existsSync(path.join(dirSymlinkTarget, "last-run.json")), false);
});

test("safe report writer rejects group or world writable .tmp before creating output", async (t) => {
  const writeSafeReport = requiredExport("writeSafeReport");
  const root = await temporaryRoot(t, "unsafe-tmp-mode");
  const localTmp = path.join(root, ".tmp");
  await mkdir(localTmp, { mode: 0o777 });
  await chmod(localTmp, 0o777);

  await rejectsWithCode(writeSafeReport({ ok: true }, { rootDir: root }), "artifact-parent-unsafe");
  assert.equal(existsSync(path.join(localTmp, "classroom-load-smoke")), false);
  assert.equal((await lstat(localTmp)).mode & 0o777, 0o777);
});

test("cwd-bound artifact child rejects a parent-validated directory swapped to an outside symlink", async (t) => {
  const writeSafeReport = requiredExport("writeSafeReport");
  const launchArtifactWorker = requiredExport("launchArtifactWorker");
  const root = await temporaryRoot(t, "artifact-swap");
  const localTmp = path.join(root, ".tmp");
  const artifactDir = path.join(localTmp, "classroom-load-smoke");
  const movedArtifactDir = path.join(localTmp, "classroom-load-smoke-original");
  const outside = path.join(root, "outside");
  await mkdir(artifactDir, { recursive: true, mode: 0o700 });
  await chmod(localTmp, 0o700);
  await chmod(artifactDir, 0o700);
  await mkdir(outside, { mode: 0o700 });
  await writeFile(path.join(outside, "sentinel"), "outside-unchanged\n", { mode: 0o600 });

  let launchAttempts = 0;
  await rejectsWithCode(
    writeSafeReport(
      { ok: true },
      {
        launchChild: async (options) => {
          launchAttempts += 1;
          await rename(artifactDir, movedArtifactDir);
          await symlink(outside, artifactDir);
          return launchArtifactWorker(options);
        },
        rootDir: root
      }
    ),
    "artifact-child-identity-mismatch"
  );
  assert.equal(launchAttempts, 1);
  assert.equal(await readFile(path.join(outside, "sentinel"), "utf8"), "outside-unchanged\n");
  assert.equal(existsSync(path.join(outside, "last-run.json")), false);
  assert.equal(existsSync(path.join(movedArtifactDir, "last-run.json")), false);
});

test("safe report writer replaces final symlink and hardlink without modifying their targets", async (t) => {
  const writeSafeReport = requiredExport("writeSafeReport");
  const root = await temporaryRoot(t, "link-replacement");
  const reportDir = path.join(root, ".tmp", "classroom-load-smoke");
  const finalPath = path.join(reportDir, "last-run.json");
  await mkdir(reportDir, { recursive: true, mode: 0o700 });

  const symlinkTarget = path.join(root, "symlink-target.txt");
  await writeFile(symlinkTarget, "symlink-target-unchanged\n", { mode: 0o600 });
  await symlink(symlinkTarget, finalPath);
  await writeSafeReport({ generation: "symlink-replacement" }, { rootDir: root });
  assert.equal(await readFile(symlinkTarget, "utf8"), "symlink-target-unchanged\n");
  assert.equal((await lstat(finalPath)).isSymbolicLink(), false);
  assert.equal((await lstat(finalPath)).nlink, 1);

  await rm(finalPath);
  const hardlinkTarget = path.join(root, "hardlink-target.txt");
  await writeFile(hardlinkTarget, "hardlink-target-unchanged\n", { mode: 0o600 });
  await link(hardlinkTarget, finalPath);
  assert.equal((await lstat(finalPath)).nlink, 2);
  await writeSafeReport({ generation: "hardlink-replacement" }, { rootDir: root });
  assert.equal(await readFile(hardlinkTarget, "utf8"), "hardlink-target-unchanged\n");
  const finalStat = await lstat(finalPath);
  assert.equal(finalStat.isFile(), true);
  assert.equal(finalStat.nlink, 1);
  assert.equal(finalStat.mode & 0o777, 0o600);
});

test("classroom smoke artifact stays in ignored local-only storage", () => {
  const ignored = spawnSync("git", ["check-ignore", "-q", ".tmp/classroom-load-smoke/last-run.json"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(ignored.status, 0, ignored.stderr || ignored.stdout);
});
