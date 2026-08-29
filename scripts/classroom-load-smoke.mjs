#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "..");
const artifactDir = path.join(repoRoot, ".tmp", "classroom-load-smoke");
const artifactPath = path.join(artifactDir, "last-run.json");

const productionHosts = new Set([
  "mais.ac",
  "www.mais.ac",
  "mais.hk",
  "www.mais.hk"
]);
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const hostnamePattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/iu;

function readArgumentValue(argv, index, label) {
  const value = argv[index + 1];
  if (typeof value !== "string" || !value || value.startsWith("--")) {
    throw new Error(`${label} requires a value.`);
  }
  return value;
}

function boundedInteger(value, fallback, min, max, label) {
  if (value === undefined || value === null || value === "") return fallback;
  if (!/^\d+$/u.test(String(value))) {
    throw new Error(`${label} must be an integer from ${min} through ${max}.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be an integer from ${min} through ${max}.`);
  }
  return parsed;
}

export function parseArgs(argv, env = process.env) {
  const args = {
    baseUrl: env.CLASSROOM_LOAD_BASE_URL ?? "",
    grade: env.CLASSROOM_LOAD_GRADE ?? "P1",
    json: false,
    mode: env.CLASSROOM_LOAD_MODE ?? "",
    rounds: boundedInteger(env.CLASSROOM_LOAD_ROUNDS, 3, 1, 50, "rounds"),
    selfTest: false,
    students: boundedInteger(env.CLASSROOM_LOAD_STUDENTS, 15, 1, 200, "students")
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base-url") {
      args.baseUrl = readArgumentValue(argv, index, "--base-url");
      index += 1;
    } else if (argument === "--grade") {
      args.grade = readArgumentValue(argv, index, "--grade");
      index += 1;
    } else if (argument === "--json") {
      args.json = true;
    } else if (argument === "--mode") {
      args.mode = readArgumentValue(argv, index, "--mode");
      index += 1;
    } else if (argument === "--rounds") {
      args.rounds = boundedInteger(readArgumentValue(argv, index, "--rounds"), args.rounds, 1, 50, "rounds");
      index += 1;
    } else if (argument === "--self-test") {
      args.selfTest = true;
    } else if (argument === "--students") {
      args.students = boundedInteger(readArgumentValue(argv, index, "--students"), args.students, 1, 200, "students");
      index += 1;
    } else if (
      argument === "--cookie"
      || argument === "--password"
      || argument === "--username"
      || argument.startsWith("--cookie=")
      || argument.startsWith("--password=")
      || argument.startsWith("--username=")
    ) {
      throw new Error("Authentication values are accepted only through environment variables.");
    } else {
      throw new Error("Unknown classroom load smoke argument.");
    }
  }

  return args;
}

export function buildSmokeConfig(args, env = process.env) {
  if (typeof args.grade !== "string" || !args.grade.trim()) {
    throw new Error("grade must be a non-empty value.");
  }
  return {
    grade: args.grade.trim(),
    readThresholdMs: boundedInteger(env.CLASSROOM_LOAD_READ_P95_MS, 3_000, 500, 120_000, "read p95 threshold"),
    rounds: boundedInteger(args.rounds, 3, 1, 50, "rounds"),
    students: boundedInteger(args.students, 15, 1, 200, "students"),
    timeoutMs: boundedInteger(env.CLASSROOM_LOAD_TIMEOUT_MS, 30_000, 1_000, 180_000, "timeout"),
    writeThresholdMs: boundedInteger(env.CLASSROOM_LOAD_WRITE_P95_MS, 2_000, 500, 120_000, "write p95 threshold")
  };
}

function isLoopbackHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function parseStagingHostAllowlist(rawValue) {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    throw new Error("CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST is required for staging mode.");
  }

  const rawEntries = rawValue.split(",");
  if (rawEntries.some((entry) => !entry.trim())) {
    throw new Error("The staging host allowlist contains an empty entry.");
  }

  const entries = rawEntries.map((entry) => entry.trim().toLowerCase());
  for (const entry of entries) {
    if (
      entry.includes("*")
      || isIP(entry) !== 0
      || !hostnamePattern.test(entry)
    ) {
      throw new Error("The staging host allowlist must contain exact DNS hostnames only; wildcards, URLs, ports, paths, and IP addresses are invalid.");
    }
    if (productionHosts.has(entry)) {
      throw new Error("Known production hosts are permanently forbidden in the classroom staging allowlist.");
    }
  }
  if (new Set(entries).size !== entries.length) {
    throw new Error("The staging host allowlist must not contain duplicate entries.");
  }
  return new Set(entries);
}

function explicitOrigin(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Classroom load smoke requires an explicit base URL.");
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("The classroom load base URL must be a valid HTTP(S) origin.");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol)
    || parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
  ) {
    throw new Error("The classroom load base URL must be an origin only, without credentials, path, query, or fragment.");
  }
  return parsed;
}

export function resolveExecutionTarget(args, env = process.env) {
  if (args.mode !== "staging" && args.mode !== "local") {
    throw new Error("Classroom load smoke requires explicit --mode staging or --mode local.");
  }

  const parsed = explicitOrigin(args.baseUrl);
  const hostname = parsed.hostname.toLowerCase();
  const expectedOrigin = parsed.origin;

  if (args.mode === "local") {
    if (!isLoopbackHostname(hostname)) {
      throw new Error("Local verification mode accepts loopback hosts only.");
    }
    if (!parsed.port) {
      throw new Error("Local verification mode requires an explicit loopback port.");
    }
    return {
      baseUrl: expectedOrigin,
      evidenceMode: "local-verification",
      expectedOrigin,
      stagingEvidence: false
    };
  }

  if (isLoopbackHostname(hostname)) {
    throw new Error("Staging mode cannot target a loopback host; use explicit local mode instead.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Remote staging mode requires an HTTPS origin.");
  }
  if (productionHosts.has(hostname)) {
    throw new Error("Known production hosts are permanently forbidden for the classroom load smoke.");
  }

  const allowlist = parseStagingHostAllowlist(env.CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST);
  if (!allowlist.has(hostname)) {
    throw new Error("The requested staging hostname is not exactly allowlisted.");
  }

  return {
    baseUrl: expectedOrigin,
    evidenceMode: "staging",
    expectedOrigin,
    stagingEvidence: true
  };
}

export async function fetchWithOriginLock(
  url,
  requestOptions = {},
  { expectedOrigin, fetchImpl = fetch, maxRedirects = 3 } = {}
) {
  const canonicalExpectedOrigin = explicitOrigin(expectedOrigin).origin;
  let currentUrl = new URL(url);
  if (currentUrl.origin !== canonicalExpectedOrigin) {
    throw new Error("Request origin must exactly match the requested origin.");
  }

  let method = String(requestOptions.method ?? "GET").toUpperCase();
  let body = requestOptions.body;
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await fetchImpl(currentUrl, {
      ...requestOptions,
      body,
      method,
      redirect: "manual"
    });
    const responseUrl = new URL(response.url || currentUrl);
    if (responseUrl.origin !== canonicalExpectedOrigin) {
      await response.body?.cancel();
      throw new Error("Response origin must exactly match the requested origin.");
    }
    if (!redirectStatuses.has(response.status)) return response;

    if (redirectCount === maxRedirects) {
      await response.body?.cancel();
      throw new Error("Classroom load request exceeded the bounded redirect limit.");
    }

    const location = response.headers.get("location");
    if (!location) {
      await response.body?.cancel();
      throw new Error("Redirect response omitted its location.");
    }
    const nextUrl = new URL(location, currentUrl);
    if (nextUrl.origin !== canonicalExpectedOrigin) {
      await response.body?.cancel();
      throw new Error("Redirect origin must exactly match the requested origin.");
    }
    if (!["GET", "HEAD"].includes(method) && ![307, 308].includes(response.status)) {
      await response.body?.cancel();
      throw new Error("Method-changing redirects are forbidden for classroom write requests.");
    }
    if (response.status === 303 && method !== "HEAD") {
      method = "GET";
      body = undefined;
    }
    await response.body?.cancel();
    currentUrl = nextUrl;
  }

  throw new Error("Classroom load request exceeded the bounded redirect limit.");
}

function percentile(values, percentileValue) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1));
  return sorted[index];
}

export function aggregateMeasurements(measurements, budgets) {
  const byEndpoint = new Map();
  for (const measurement of measurements) {
    if (!byEndpoint.has(measurement.endpoint)) byEndpoint.set(measurement.endpoint, []);
    byEndpoint.get(measurement.endpoint).push(measurement);
  }

  return [...byEndpoint.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, samples]) => {
      const budget = budgets[name] ?? { kind: "read", thresholdMs: Number.POSITIVE_INFINITY };
      const durations = samples.map((sample) => sample.elapsedMs);
      const errors = samples.filter((sample) => !sample.ok);
      const p95Ms = percentile(durations, 95);
      return {
        errorCount: errors.length,
        errorRate: samples.length ? errors.length / samples.length : 0,
        kind: budget.kind,
        maxMs: durations.length ? Math.max(...durations) : null,
        name,
        ok: errors.length === 0 && p95Ms !== null && p95Ms <= budget.thresholdMs,
        p50Ms: percentile(durations, 50),
        p95Ms,
        requests: samples.length,
        statuses: [...new Set(samples.map((sample) => sample.status))].sort((left, right) => left - right),
        thresholdMs: budget.thresholdMs
      };
    });
}

export function buildAttemptBody({ durationSeconds, expectedUserId, questionId, selectedAnswer }) {
  return { durationSeconds, expectedUserId, questionId, selectedAnswer };
}

export function buildLessonProgressBody({ lessonSlug, round, rounds }) {
  return {
    action: round === rounds - 1 ? "complete" : "update",
    durationSeconds: 30,
    slug: lessonSlug
  };
}

function protectionHeaders(env = process.env) {
  const secret = env.CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET;
  return typeof secret === "string" && secret
    ? { "x-vercel-protection-bypass": secret }
    : {};
}

export function buildStudentHeaders({ cookie, expectedUserId }, env = process.env) {
  if (typeof cookie !== "string" || !cookie || typeof expectedUserId !== "string" || !expectedUserId) {
    throw new Error("Authenticated classroom requests require a session and expected user binding.");
  }
  return {
    Cookie: cookie,
    "X-MAIS-Expected-User-Id": expectedUserId,
    ...protectionHeaders(env)
  };
}

function setCookieValues(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get("set-cookie");
  return raw ? raw.split(/,(?=\s*[^;,=\s]+=)/u).map((cookie) => cookie.trim()) : [];
}

function cookieHeaderFromSetCookie(headers) {
  return setCookieValues(headers)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function timedFetch(url, { expectedOrigin, timeoutMs, ...requestOptions }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchWithOriginLock(
      url,
      { ...requestOptions, signal: controller.signal },
      { expectedOrigin }
    );
    const text = await response.text();
    return {
      elapsedMs: Date.now() - startedAt,
      headers: response.headers,
      ok: response.ok,
      status: response.status,
      text,
      url: response.url
    };
  } catch {
    return {
      elapsedMs: Date.now() - startedAt,
      errorCode: "request-error",
      headers: new Headers(),
      ok: false,
      status: 0,
      text: "",
      url
    };
  } finally {
    clearTimeout(timer);
  }
}

function readAuthenticationInput(env = process.env) {
  const cookie = env.CLASSROOM_LOAD_COOKIE;
  const username = env.CLASSROOM_LOAD_USERNAME;
  const password = env.CLASSROOM_LOAD_PASSWORD;
  const hasCookie = typeof cookie === "string" && cookie.length > 0;
  const hasUsername = typeof username === "string" && username.length > 0;
  const hasPassword = typeof password === "string" && password.length > 0;

  if (hasCookie && (hasUsername || hasPassword)) {
    throw new Error("Choose either cookie authentication or credential authentication, not both.");
  }
  if (hasCookie) return { cookie, kind: "cookie" };
  if (hasUsername !== hasPassword) {
    throw new Error("Credential authentication requires both configured username and password variables.");
  }
  if (hasUsername && hasPassword) return { kind: "credentials", password, username };
  throw new Error("Classroom load smoke requires configured staging/local authentication variables.");
}

function authenticatedUserId(payload) {
  const user = payload?.user;
  if (typeof user?.id !== "string" || !user.id || user.role !== "student") {
    throw new Error("Classroom load authentication did not resolve a student session.");
  }
  return user.id;
}

async function authenticate(target, config, env = process.env) {
  const authentication = readAuthenticationInput(env);
  if (authentication.kind === "cookie") {
    const response = await timedFetch(`${target.baseUrl}/api/auth/session-state?includeLessonEntry=false`, {
      expectedOrigin: target.expectedOrigin,
      headers: { Cookie: authentication.cookie, ...protectionHeaders(env) },
      timeoutMs: config.timeoutMs
    });
    if (!response.ok) throw new Error("Cookie session validation failed.");
    return {
      auth: redactedAuthSummary("cookie", 0),
      cookie: authentication.cookie,
      expectedUserId: authenticatedUserId(parseJson(response.text)),
      loginDurations: []
    };
  }

  const response = await timedFetch(`${target.baseUrl}/api/auth/login`, {
    body: JSON.stringify({
      curriculumTrack: env.CLASSROOM_LOAD_CURRICULUM_TRACK ?? "US_CA_MATH",
      grade: config.grade,
      language: env.CLASSROOM_LOAD_LANGUAGE ?? "en",
      password: authentication.password,
      username: authentication.username
    }),
    expectedOrigin: target.expectedOrigin,
    headers: { "Content-Type": "application/json", ...protectionHeaders(env) },
    method: "POST",
    timeoutMs: config.timeoutMs
  });
  if (response.status === 429) throw new Error("Credential login was rate limited; wait for the staging/local login window before retrying.");
  if (!response.ok) throw new Error("Credential login failed.");

  const cookie = cookieHeaderFromSetCookie(response.headers);
  if (!cookie) throw new Error("Credential login returned no session cookie.");
  return {
    auth: redactedAuthSummary("credentials", 1),
    cookie,
    expectedUserId: authenticatedUserId(parseJson(response.text)),
    loginDurations: [response.elapsedMs]
  };
}

function firstOptionText(question) {
  const option = Array.isArray(question?.options) ? question.options[0] : null;
  if (typeof option === "string") return option;
  if (option && typeof option === "object") return option.en ?? option.zh ?? option.zhHans ?? null;
  return null;
}

function questionWorkload(payload, limit = 20) {
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  return questions
    .filter((question) => typeof question?.id === "string" && question.id)
    .slice(0, limit)
    .map((question) => ({
      questionId: question.id,
      selectedAnswer: firstOptionText(question) ?? "1"
    }));
}

async function discoverWorkload(session, target, config, env = process.env) {
  const headers = buildStudentHeaders(session, env);
  const curriculumTrack = env.CLASSROOM_LOAD_CURRICULUM_TRACK ?? "US_CA_MATH";
  const [questionsResponse, lessonResponse] = await Promise.all([
    timedFetch(
      `${target.baseUrl}/api/questions?grade=${encodeURIComponent(config.grade)}&curriculumTrack=${encodeURIComponent(curriculumTrack)}`,
      { expectedOrigin: target.expectedOrigin, headers, timeoutMs: config.timeoutMs }
    ),
    timedFetch(`${target.baseUrl}/api/lesson-entry?grade=${encodeURIComponent(config.grade)}`, {
      expectedOrigin: target.expectedOrigin,
      headers,
      timeoutMs: config.timeoutMs
    })
  ]);

  if (!questionsResponse.ok) throw new Error("Classroom load smoke could not read its staging/local question workload.");
  const questions = questionWorkload(parseJson(questionsResponse.text));
  if (!questions.length) throw new Error("Classroom load smoke found no questions for the configured workload.");

  if (!lessonResponse.ok) throw new Error("Classroom load smoke could not read its staging/local lesson workload.");
  const lessonSlug = parseJson(lessonResponse.text)?.lessonEntryTarget?.slug;
  if (typeof lessonSlug !== "string" || !lessonSlug) {
    throw new Error("Classroom load smoke found no lesson entry for the configured workload.");
  }
  return { lessonSlug, questions };
}

function summarizeResponse(endpoint, response) {
  return {
    elapsedMs: response.elapsedMs,
    endpoint,
    errorCode: response.errorCode,
    ok: response.ok,
    status: response.status
  };
}

async function runClassRound(sessions, workload, target, config, round, env = process.env) {
  const measurements = [];
  const phases = [
    {
      endpoint: "attempts",
      request: (session) => {
        const question = workload.questions[(session.seat + round) % workload.questions.length];
        return timedFetch(`${target.baseUrl}/api/attempts`, {
          body: JSON.stringify(buildAttemptBody({
            durationSeconds: 12,
            expectedUserId: session.expectedUserId,
            questionId: question.questionId,
            selectedAnswer: question.selectedAnswer
          })),
          expectedOrigin: target.expectedOrigin,
          headers: { "Content-Type": "application/json", ...buildStudentHeaders(session, env) },
          method: "POST",
          timeoutMs: config.timeoutMs
        });
      }
    },
    {
      endpoint: "lesson-progress",
      request: (session) => timedFetch(`${target.baseUrl}/api/lesson-progress`, {
        body: JSON.stringify(buildLessonProgressBody({ lessonSlug: workload.lessonSlug, round, rounds: config.rounds })),
        expectedOrigin: target.expectedOrigin,
        headers: { "Content-Type": "application/json", ...buildStudentHeaders(session, env) },
        method: "POST",
        timeoutMs: config.timeoutMs
      })
    },
    {
      endpoint: "dashboard",
      request: (session) => timedFetch(`${target.baseUrl}/api/dashboard?grade=${encodeURIComponent(config.grade)}`, {
        expectedOrigin: target.expectedOrigin,
        headers: buildStudentHeaders(session, env),
        timeoutMs: config.timeoutMs
      })
    }
  ];

  for (const phase of phases) {
    const responses = await Promise.all(sessions.map((session) => phase.request(session)));
    measurements.push(...responses.map((response) => summarizeResponse(phase.endpoint, response)));
  }
  return measurements;
}

function endpointBudgets(config) {
  return {
    attempts: { kind: "write", thresholdMs: config.writeThresholdMs },
    dashboard: { kind: "read", thresholdMs: config.readThresholdMs },
    "lesson-progress": { kind: "write", thresholdMs: config.writeThresholdMs }
  };
}

export function redactedAuthSummary(kind, loginCount) {
  if (!new Set(["cookie", "credentials"]).has(kind)) {
    throw new Error("Unsupported classroom authentication shape.");
  }
  return { distinctIdentities: 1, kind, loginCount };
}

export function buildRunReport({ auth, config, generatedAt, loginDurations, results, target, workload }) {
  return {
    auth,
    baseUrl: target.baseUrl,
    concurrency: config.students,
    evidenceMode: target.evidenceMode,
    generatedAt,
    grade: config.grade,
    login: {
      count: loginDurations.length,
      maxMs: loginDurations.length ? Math.max(...loginDurations) : null,
      p50Ms: percentile(loginDurations, 50),
      p95Ms: percentile(loginDurations, 95)
    },
    ok: results.length > 0 && results.every((result) => result.ok),
    readThresholdMs: config.readThresholdMs,
    results,
    rounds: config.rounds,
    stagingEvidence: target.stagingEvidence,
    totalRequests: results.reduce((total, result) => total + result.requests, 0),
    workload,
    writeThresholdMs: config.writeThresholdMs
  };
}

async function writeReport(report) {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (!report.stagingEvidence) {
    console.log("LOCAL VERIFICATION ONLY — not staging evidence.");
  }
  console.log(
    `Classroom load smoke: ${report.ok ? "PASS" : "FAIL"} mode=${report.evidenceMode} target=${report.baseUrl} grade=${report.grade} students=${report.concurrency} rounds=${report.rounds} requests=${report.totalRequests}`
  );
  console.log(
    `Authentication shape: ${report.auth.kind}; distinct identities=${report.auth.distinctIdentities}; login count=${report.auth.loginCount}`
  );
  for (const result of report.results) {
    console.log(
      `${result.ok ? "PASS" : "FAIL"} ${result.name} [${result.kind}]: p50=${result.p50Ms}ms p95=${result.p95Ms}ms max=${result.maxMs}ms threshold=${result.thresholdMs}ms n=${result.requests} errors=${result.errorCount} status=${result.statuses.join("/")}`
    );
  }
  console.log(`Artifact: ${artifactPath}`);
}

async function runSmoke(args, env = process.env) {
  const target = resolveExecutionTarget(args, env);
  const config = buildSmokeConfig(args, env);
  const authentication = await authenticate(target, config, env);
  const session = {
    cookie: authentication.cookie,
    expectedUserId: authentication.expectedUserId
  };
  const sessions = Array.from({ length: config.students }, (_, index) => ({ ...session, seat: index + 1 }));
  const workload = await discoverWorkload(session, target, config, env);

  const measurements = [];
  for (let round = 0; round < config.rounds; round += 1) {
    measurements.push(...await runClassRound(sessions, workload, target, config, round, env));
  }
  const results = aggregateMeasurements(measurements, endpointBudgets(config));
  const report = buildRunReport({
    auth: authentication.auth,
    config,
    generatedAt: new Date().toISOString(),
    loginDurations: authentication.loginDurations,
    results,
    target,
    workload: { lessonSlug: workload.lessonSlug, questionPoolSize: workload.questions.length }
  });
  await writeReport(report);
  printReport(report, args.json);
  if (!report.ok) process.exitCode = 1;
}

function runSelfTest() {
  assert.deepEqual(
    resolveExecutionTarget(
      { baseUrl: "https://preview.example.test", mode: "staging" },
      { CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST: "preview.example.test" }
    ),
    {
      baseUrl: "https://preview.example.test",
      evidenceMode: "staging",
      expectedOrigin: "https://preview.example.test",
      stagingEvidence: true
    }
  );
  assert.throws(
    () => resolveExecutionTarget(
      { baseUrl: "https://www.mais.ac", mode: "staging" },
      { CLASSROOM_LOAD_STAGING_HOST_ALLOWLIST: "www.mais.ac" }
    ),
    /production/iu
  );
  assert.equal(
    resolveExecutionTarget({ baseUrl: "http://127.0.0.1:3417", mode: "local" }, {}).stagingEvidence,
    false
  );
  const aggregated = aggregateMeasurements(
    [{ elapsedMs: 20, endpoint: "attempts", ok: false, status: 500 }],
    { attempts: { kind: "write", thresholdMs: 2_000 } }
  );
  assert.equal(aggregated[0].ok, false);
  assert.equal(aggregated[0].p50Ms, 20);
  assert.equal(aggregated[0].p95Ms, 20);
  assert.equal(aggregated[0].maxMs, 20);
  console.log("classroom-load-smoke self-test: PASS");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    runSelfTest();
    return;
  }
  await runSmoke(args);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown classroom load smoke failure.";
    console.error(`Classroom load smoke failed: ${message}`);
    process.exitCode = 1;
  });
}
