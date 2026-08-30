#!/usr/bin/env node
// Manual staging/preview-only classroom concurrency smoke.
//
// This tool writes practice attempts and lesson progress. It deliberately has
// no default URL, unconditionally rejects known production hosts, and is not
// invoked by any deployment or production-certification path.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_ARTIFACT_DIR = path.join(REPO_ROOT, ".tmp", "classroom-load-smoke");
const PRODUCTION_HOSTS = new Set(["mais.ac", "www.mais.ac", "mais.hk", "www.mais.hk"]);
const DEMO_STUDENT_USERNAMES = ["Student Shirleen", "Student Jon"];

function requiredOptionValue(argv, index, option) {
  const value = argv[index + 1];
  if (typeof value !== "string" || !value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

export function boundedInteger(value, fallback, min, max, label = "value") {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && !value.trim()) {
    throw new Error(`${label} must be a finite number.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function parseArgs(argv, env = process.env) {
  const args = {
    artifactDir: env.CLASSROOM_LOAD_ARTIFACT_DIR || "",
    baseUrl: env.CLASSROOM_LOAD_BASE_URL || "",
    cookie: env.CLASSROOM_LOAD_COOKIE || "",
    grade: env.CLASSROOM_LOAD_GRADE || "P1",
    json: false,
    password: env.CLASSROOM_LOAD_PASSWORD || "",
    rounds: boundedInteger(env.CLASSROOM_LOAD_ROUNDS, 3, 1, 50, "CLASSROOM_LOAD_ROUNDS"),
    selfTest: false,
    students: boundedInteger(env.CLASSROOM_LOAD_STUDENTS, 15, 1, 200, "CLASSROOM_LOAD_STUDENTS"),
    username: env.CLASSROOM_LOAD_USERNAME || ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--json") {
      args.json = true;
    } else if (option === "--self-test") {
      args.selfTest = true;
    } else if (option === "--base-url") {
      args.baseUrl = requiredOptionValue(argv, index, option);
      index += 1;
    } else if (option === "--grade") {
      args.grade = requiredOptionValue(argv, index, option);
      index += 1;
    } else if (option === "--rounds") {
      args.rounds = boundedInteger(requiredOptionValue(argv, index, option), args.rounds, 1, 50, "--rounds");
      index += 1;
    } else if (option === "--students") {
      args.students = boundedInteger(requiredOptionValue(argv, index, option), args.students, 1, 200, "--students");
      index += 1;
    } else if (option === "--username") {
      args.username = requiredOptionValue(argv, index, option);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${option}`);
    }
  }

  return args;
}

export function percentile(values, percentileValue) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1)
  );
  return sorted[index];
}

export function normalizeBaseUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Classroom load smoke requires a valid absolute http(s) base URL.");
  }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
    throw new Error("Classroom load smoke requires an http(s) base URL.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Classroom load smoke refuses credentials embedded in the base URL.");
  }
  const canonicalHostname = parsed.hostname.toLowerCase().replace(/\.+$/u, "");
  const isLoopback =
    canonicalHostname === "localhost" ||
    canonicalHostname === "[::1]" ||
    /^127(?:\.\d{1,3}){3}$/u.test(canonicalHostname);
  if (parsed.protocol === "http:" && !isLoopback) {
    throw new Error("Classroom load smoke requires HTTPS for every non-loopback target.");
  }
  parsed.hostname = canonicalHostname === "localhost" ? "127.0.0.1" : canonicalHostname;
  return parsed.origin;
}

export function assertTargetIsNotProduction(baseUrl, _env = process.env) {
  const hostname = new URL(baseUrl).hostname.toLowerCase().replace(/\.+$/u, "");
  if (!PRODUCTION_HOSTS.has(hostname)) return;
  throw new Error(
    `Refusing staging-only classroom load smoke against production host ${hostname}; no production override is supported.`
  );
}

function requiredBaseUrl(args) {
  if (!args.baseUrl) {
    throw new Error(
      "Classroom load smoke requires an explicit --base-url (or CLASSROOM_LOAD_BASE_URL); it writes and has no default target."
    );
  }
  const baseUrl = normalizeBaseUrl(args.baseUrl);
  assertTargetIsNotProduction(baseUrl);
  return baseUrl;
}

export function smokeConfig(args, env = process.env) {
  return {
    artifactDir: path.resolve(args.artifactDir || env.CLASSROOM_LOAD_ARTIFACT_DIR || DEFAULT_ARTIFACT_DIR),
    baseUrl: requiredBaseUrl(args),
    grade: args.grade,
    readThresholdMs: boundedInteger(env.CLASSROOM_LOAD_READ_P95_MS, 3_000, 500, 120_000, "CLASSROOM_LOAD_READ_P95_MS"),
    rounds: boundedInteger(args.rounds, 3, 1, 50, "rounds"),
    students: boundedInteger(args.students, 15, 1, 200, "students"),
    timeoutMs: boundedInteger(env.CLASSROOM_LOAD_TIMEOUT_MS, 30_000, 1_000, 180_000, "CLASSROOM_LOAD_TIMEOUT_MS"),
    writeThresholdMs: boundedInteger(env.CLASSROOM_LOAD_WRITE_P95_MS, 2_000, 500, 120_000, "CLASSROOM_LOAD_WRITE_P95_MS")
  };
}

export function endpointBudgets(config) {
  return {
    attempts: { kind: "write", thresholdMs: config.writeThresholdMs },
    dashboard: { kind: "read", thresholdMs: config.readThresholdMs },
    "lesson-progress": { kind: "write", thresholdMs: config.writeThresholdMs }
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

function authHeaders(cookie, expectedUserId, env = process.env) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (expectedUserId) headers["X-MAIS-Expected-User-Id"] = expectedUserId;
  const bypassSecret =
    env.CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET ||
    env.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET ||
    env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypassSecret) headers["x-vercel-protection-bypass"] = bypassSecret;
  return headers;
}

function demoLoginEnabled(env = process.env) {
  return env.CLASSROOM_LOAD_USE_DEMO_LOGIN === "1" || env.DASHBOARD_SMOKE_USE_DEMO_LOGIN === "1";
}

export function classroomSmokeCredentials(args, studentCount, env = process.env) {
  let roster = null;
  let authMode = "";
  if (args.username || args.password) {
    if (!args.username || !args.password) {
      throw new Error("Classroom load smoke requires both username and password for explicit login.");
    }
    roster = [{ password: args.password, username: args.username }];
    authMode = "username-password";
  } else if (demoLoginEnabled(env)) {
    const demoPassword = env.CLASSROOM_LOAD_DEMO_PASSWORD || env.DASHBOARD_SMOKE_PASSWORD || "";
    if (!demoPassword) {
      throw new Error(
        "Demo roster login requires CLASSROOM_LOAD_DEMO_PASSWORD from the owner-approved demo seed contract; no credential is embedded in this script."
      );
    }
    roster = DEMO_STUDENT_USERNAMES.map((username) => ({ password: demoPassword, username }));
    authMode = "demo-login";
  }
  if (!roster) return null;

  const distinctRoster = [...new Map(roster.map((identity) => [identity.username, identity])).values()];
  const identities = distinctRoster.slice(0, Math.min(distinctRoster.length, studentCount));
  const students = Array.from({ length: studentCount }, (_, index) => ({
    ...identities[index % identities.length],
    seat: index + 1
  }));
  return {
    authMode,
    distinctIdentities: identities.length,
    identities,
    students
  };
}

export async function timedFetch(
  url,
  { body, headers = {}, method = "GET", redirect = "manual", timeoutMs = 30_000 } = {},
  fetchImpl = globalThis.fetch
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(url, {
      body,
      headers,
      method,
      redirect,
      signal: controller.signal
    });
    const text = await response.text();
    return {
      elapsedMs: Date.now() - startedAt,
      finalUrl: response.url || url,
      headers: response.headers,
      ok: response.ok,
      status: response.status,
      text
    };
  } catch (error) {
    return {
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      finalUrl: url,
      headers: new Headers(),
      ok: false,
      status: 0,
      text: ""
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function responseOrigin(response, fallbackUrl) {
  return normalizeBaseUrl(response.finalUrl || fallbackUrl);
}

function assertSafeResolvedResponse(response, requestedUrl) {
  const requestedBaseUrl = normalizeBaseUrl(requestedUrl);
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Classroom load smoke refuses a redirect response without a Location header.");
    }
    let redirectUrl;
    try {
      redirectUrl = new URL(location, requestedUrl);
    } catch {
      throw new Error("Classroom load smoke refuses an invalid redirect Location.");
    }
    const redirectOrigin = normalizeBaseUrl(redirectUrl.origin);
    assertTargetIsNotProduction(redirectOrigin);
    throw new Error(
      `Classroom load smoke refuses redirect from ${requestedBaseUrl} to ${redirectOrigin}.`
    );
  }
  const origin = responseOrigin(response, requestedUrl);
  assertTargetIsNotProduction(origin);
  if (origin !== requestedBaseUrl) {
    throw new Error(
      `Classroom load smoke refuses cross-origin response from ${requestedBaseUrl} to ${origin}.`
    );
  }
  return origin;
}

export async function loginIdentity(identity, config, env = process.env, fetchImpl = globalThis.fetch) {
  const response = await timedFetch(
    `${config.baseUrl}/api/auth/login`,
    {
      body: JSON.stringify({
        curriculumTrack: env.CLASSROOM_LOAD_CURRICULUM_TRACK || "US_CA_MATH",
        grade: config.grade,
        language: env.CLASSROOM_LOAD_LANGUAGE || "en",
        password: identity.password,
        username: identity.username
      }),
      headers: { "Content-Type": "application/json", ...authHeaders("", "", env) },
      method: "POST",
      timeoutMs: config.timeoutMs
    },
    fetchImpl
  );
  const resolvedBaseUrl = assertSafeResolvedResponse(response, config.baseUrl);

  if (response.status === 429) {
    throw new Error(`Classroom load smoke login for ${identity.username} was rate limited (HTTP 429).`);
  }
  if (!response.ok) {
    throw new Error(`Classroom load smoke login for ${identity.username} failed with HTTP ${response.status}.`);
  }
  const payload = parseJson(response.text);
  const userId = typeof payload?.user?.id === "string" ? payload.user.id : "";
  if (!userId || payload?.user?.role !== "student") {
    throw new Error(`Classroom load smoke login for ${identity.username} did not return an authenticated student session.`);
  }
  const cookie = cookieHeaderFromSetCookie(response.headers);
  if (!cookie) {
    throw new Error(`Classroom load smoke login for ${identity.username} returned no session cookie.`);
  }
  return {
    baseUrl: resolvedBaseUrl,
    cookie,
    loginMs: response.elapsedMs,
    userId,
    username: identity.username
  };
}

export async function resolveCookieSession(cookie, config, env = process.env, fetchImpl = globalThis.fetch) {
  const response = await timedFetch(
    `${config.baseUrl}/api/me?includeLessonEntry=false`,
    {
      headers: authHeaders(cookie, "", env),
      timeoutMs: config.timeoutMs
    },
    fetchImpl
  );
  const resolvedBaseUrl = assertSafeResolvedResponse(response, config.baseUrl);
  if (!response.ok) {
    throw new Error(`Classroom load smoke could not resolve the cookie session (HTTP ${response.status}).`);
  }
  const payload = parseJson(response.text);
  const userId = typeof payload?.user?.id === "string" ? payload.user.id : "";
  if (!userId || payload?.user?.role !== "student") {
    throw new Error("Classroom load smoke cookie must resolve to an authenticated student session.");
  }
  return {
    baseUrl: resolvedBaseUrl,
    cookie,
    loginMs: 0,
    userId,
    username: "cookie-session"
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

export async function discoverWorkload(session, config, env = process.env, fetchImpl = globalThis.fetch) {
  const curriculumTrack = env.CLASSROOM_LOAD_CURRICULUM_TRACK || "US_CA_MATH";
  const headers = authHeaders(session.cookie, session.userId, env);
  const lessonUrl = new URL(`${session.baseUrl}/api/lesson-entry`);
  lessonUrl.searchParams.set("grade", config.grade);
  lessonUrl.searchParams.set("expectedUserId", session.userId);
  const [questionsResponse, lessonResponse] = await Promise.all([
    timedFetch(
      `${session.baseUrl}/api/questions?grade=${encodeURIComponent(config.grade)}&curriculumTrack=${encodeURIComponent(curriculumTrack)}`,
      { headers, timeoutMs: config.timeoutMs },
      fetchImpl
    ),
    timedFetch(
      lessonUrl.toString(),
      { headers, timeoutMs: config.timeoutMs },
      fetchImpl
    )
  ]);

  // Discovery is read-only and completes before any attempt/progress write.
  // Reject a platform redirect here so a safe-looking preview cannot resolve
  // to a live origin and then receive the write workload.
  assertSafeResolvedResponse(questionsResponse, session.baseUrl);
  assertSafeResolvedResponse(lessonResponse, session.baseUrl);
  if (!questionsResponse.ok) {
    throw new Error(`Classroom load smoke could not read the question bank (HTTP ${questionsResponse.status}).`);
  }
  const questions = questionWorkload(parseJson(questionsResponse.text));
  if (!questions.length) {
    throw new Error(`Classroom load smoke found no practice questions for grade ${config.grade}.`);
  }
  if (!lessonResponse.ok) {
    throw new Error(`Classroom load smoke could not read a lesson entry target (HTTP ${lessonResponse.status}).`);
  }
  const lessonSlug = parseJson(lessonResponse.text)?.lessonEntryTarget?.slug;
  if (typeof lessonSlug !== "string" || !lessonSlug) {
    throw new Error(`Classroom load smoke found no lesson entry slug for grade ${config.grade}.`);
  }
  return { lessonSlug, questions };
}

function summarize(response) {
  return {
    elapsedMs: response.elapsedMs,
    error: response.error,
    ok: response.ok,
    status: response.status
  };
}

export async function runSeatRound(
  session,
  workload,
  config,
  round,
  env = process.env,
  fetchImpl = globalThis.fetch
) {
  const question = workload.questions[(session.seat - 1 + round) % workload.questions.length];
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(session.cookie, session.userId, env)
  };
  const measurements = [];

  // Writes never follow redirects. A 3xx is recorded as a failed request
  // rather than replaying a POST body to another origin.
  const attempt = await timedFetch(
    `${session.baseUrl}/api/attempts`,
    {
      body: JSON.stringify({
        durationSeconds: 12,
        expectedUserId: session.userId,
        questionId: question.questionId,
        selectedAnswer: question.selectedAnswer
      }),
      headers,
      method: "POST",
      redirect: "manual",
      timeoutMs: config.timeoutMs
    },
    fetchImpl
  );
  assertSafeResolvedResponse(attempt, session.baseUrl);
  measurements.push({ endpoint: "attempts", round, seat: session.seat, ...summarize(attempt) });

  // Current main binds lesson-progress to the authenticated cookie but does
  // not consume the expected-user guard used by /api/attempts. Keep that
  // limitation explicit rather than claiming a server-side identity guard.
  const progress = await timedFetch(
    `${session.baseUrl}/api/lesson-progress`,
    {
      body: JSON.stringify({
        action: round === config.rounds - 1 ? "complete" : "update",
        durationSeconds: 30,
        slug: workload.lessonSlug
      }),
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(session.cookie, "", env)
      },
      method: "POST",
      redirect: "manual",
      timeoutMs: config.timeoutMs
    },
    fetchImpl
  );
  assertSafeResolvedResponse(progress, session.baseUrl);
  measurements.push({ endpoint: "lesson-progress", round, seat: session.seat, ...summarize(progress) });

  const dashboard = await timedFetch(
    `${session.baseUrl}/api/dashboard?grade=${encodeURIComponent(config.grade)}`,
    {
      headers: authHeaders(session.cookie, session.userId, env),
      timeoutMs: config.timeoutMs
    },
    fetchImpl
  );
  assertSafeResolvedResponse(dashboard, session.baseUrl);
  measurements.push({ endpoint: "dashboard", round, seat: session.seat, ...summarize(dashboard) });
  return measurements;
}

export function aggregate(measurements, budgets) {
  const grouped = new Map();
  for (const measurement of measurements) {
    if (!grouped.has(measurement.endpoint)) grouped.set(measurement.endpoint, []);
    grouped.get(measurement.endpoint).push(measurement);
  }
  return [...grouped.entries()]
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

export async function writeReport(report, artifactDir) {
  const targetDirectory = path.resolve(artifactDir);
  const artifactPath = path.join(targetDirectory, "last-run.json");
  await fs.mkdir(targetDirectory, { recursive: true });
  await fs.writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  return artifactPath;
}

export async function executeClassroomLoad(args, dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const config = smokeConfig(args, env);
  const login = dependencies.loginIdentity ?? loginIdentity;
  const resolveCookie = dependencies.resolveCookieSession ?? resolveCookieSession;
  const discover = dependencies.discoverWorkload ?? discoverWorkload;
  const runRound = dependencies.runSeatRound ?? runSeatRound;
  const persistReport = dependencies.writeReport ?? writeReport;
  let authMode;
  let distinctIdentities;
  let sessions;

  if (args.cookie) {
    const resolved = await resolveCookie(args.cookie, config, env);
    assertTargetIsNotProduction(resolved.baseUrl);
    authMode = "cookie";
    distinctIdentities = 1;
    sessions = Array.from({ length: config.students }, (_, index) => ({
      ...resolved,
      seat: index + 1
    }));
  } else {
    const roster = classroomSmokeCredentials(args, config.students, env);
    if (!roster) {
      throw new Error(
        "Classroom load smoke requires CLASSROOM_LOAD_COOKIE, explicit username/password, or an enabled demo roster with CLASSROOM_LOAD_DEMO_PASSWORD."
      );
    }
    const loggedIn = await Promise.all(
      roster.identities.map(async (identity) => ({
        ...(await login(identity, config, env)),
        username: identity.username
      }))
    );
    for (const session of loggedIn) assertTargetIsNotProduction(session.baseUrl);
    const origins = new Set(loggedIn.map((session) => normalizeBaseUrl(session.baseUrl)));
    if (origins.size !== 1) {
      throw new Error("Classroom load smoke refuses identities resolved across multiple origins.");
    }
    const byUsername = new Map(loggedIn.map((session) => [session.username, session]));
    sessions = roster.students.map((student) => {
      const identity = byUsername.get(student.username);
      if (!identity) throw new Error("Classroom load smoke could not bind a seat to its login session.");
      return { ...identity, seat: student.seat };
    });
    authMode = roster.authMode;
    distinctIdentities = roster.distinctIdentities;
  }

  // This is the final redirect-origin gate before any attempt/progress write.
  for (const origin of new Set(sessions.map((session) => normalizeBaseUrl(session.baseUrl)))) {
    assertTargetIsNotProduction(origin);
  }
  const workload = await discover(sessions[0], config, env);
  const measurements = [];
  for (let round = 0; round < config.rounds; round += 1) {
    const roundResults = await Promise.all(
      sessions.map((session) => runRound(session, workload, config, round, env))
    );
    for (const seatMeasurements of roundResults) measurements.push(...seatMeasurements);
  }

  const results = aggregate(measurements, endpointBudgets(config));
  const expectedEndpointNames = ["attempts", "dashboard", "lesson-progress"];
  const expectedRequestsPerEndpoint = config.students * config.rounds;
  const endpointTopologyComplete =
    results.length === expectedEndpointNames.length &&
    expectedEndpointNames.every((name) =>
      results.some((result) => result.name === name && result.requests === expectedRequestsPerEndpoint)
    );
  const loginDurations = authMode === "cookie"
    ? []
    : [...new Map(sessions.map((session) => [session.username, session.loginMs])).values()];
  const report = {
    authMode,
    baseUrl: sessions[0].baseUrl,
    concurrency: config.students,
    distinctIdentities,
    endpointTopologyComplete,
    expectedRequestsPerEndpoint,
    generatedAt: new Date().toISOString(),
    grade: config.grade,
    login: {
      count: loginDurations.length,
      maxMs: loginDurations.length ? Math.max(...loginDurations) : null,
      p50Ms: percentile(loginDurations, 50),
      p95Ms: percentile(loginDurations, 95)
    },
    ok: endpointTopologyComplete && results.every((result) => result.ok),
    readThresholdMs: config.readThresholdMs,
    requestedBaseUrl: config.baseUrl,
    results,
    rounds: config.rounds,
    totalRequests: measurements.length,
    workload: {
      lessonSlug: workload.lessonSlug,
      questionPoolSize: workload.questions.length
    },
    writeThresholdMs: config.writeThresholdMs
  };
  const artifactPath = await persistReport(report, config.artifactDir);
  return { artifactPath, report };
}

async function runSmoke(args) {
  const { artifactPath, report } = await executeClassroomLoad(args);
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `Classroom load smoke: ${report.ok ? "PASS" : "FAIL"} ${report.baseUrl} grade=${report.grade} students=${report.concurrency} rounds=${report.rounds} requests=${report.totalRequests}`
    );
    console.log(
      `Identities: ${report.distinctIdentities}; logins=${report.login.count}; p95=${report.login.p95Ms}ms; max=${report.login.maxMs}ms`
    );
    for (const result of report.results) {
      console.log(
        `${result.ok ? "PASS" : "FAIL"} ${result.name} [${result.kind}]: p50=${result.p50Ms}ms p95=${result.p95Ms}ms max=${result.maxMs}ms threshold=${result.thresholdMs}ms n=${result.requests} errors=${result.errorCount} status=${result.statuses.join("/")}`
      );
    }
    console.log(`Artifact: ${artifactPath}`);
  }
  if (!report.ok) process.exitCode = 1;
}

async function runSelfTest() {
  assert.equal(normalizeBaseUrl("http://localhost:3210/"), "http://127.0.0.1:3210");
  assert.equal(normalizeBaseUrl("http://127.0.0.1:3210/"), "http://127.0.0.1:3210");
  assert.throws(() => normalizeBaseUrl("http://preview.example"), /requires HTTPS/i);
  assert.equal(percentile([100, 200, 300], 95), 300);
  assert.equal(percentile([], 95), null);
  assert.throws(() => parseArgs(["--unknown"], {}), /Unknown argument/);
  assert.throws(() => parseArgs(["--students", "not-a-number"], {}), /--students must be a finite number/);
  assert.throws(
    () => parseArgs([], { CLASSROOM_LOAD_ROUNDS: "not-a-number" }),
    /CLASSROOM_LOAD_ROUNDS must be a finite number/
  );
  assert.equal(parseArgs(["--students", "9999"], {}).students, 200);
  assert.equal(parseArgs(["--students", "0"], {}).students, 1);
  assert.equal(parseArgs(["--rounds", "9999"], {}).rounds, 50);
  assert.equal(parseArgs(["--rounds", "0"], {}).rounds, 1);
  assert.throws(() => smokeConfig(parseArgs([], {}), {}), /requires an explicit --base-url/i);
  for (const origin of ["https://mais.ac", "https://www.mais.ac", "https://mais.hk", "https://www.mais.hk"]) {
    assert.throws(
      () => smokeConfig(parseArgs(["--base-url", origin], {}), {}),
      /production host/i
    );
    assert.throws(
      () => smokeConfig(parseArgs(["--base-url", `${origin}.`], {}), {}),
      /production host/i
    );
  }
  const legacyOverrideEnv = { CLASSROOM_LOAD_ALLOW_PRODUCTION: "1" };
  assert.throws(
    () => smokeConfig(
      parseArgs(["--base-url", "https://www.mais.ac"], legacyOverrideEnv),
      legacyOverrideEnv
    ),
    /production host/i
  );
  const budgetEnv = {
    CLASSROOM_LOAD_BASE_URL: "https://preview.example",
    CLASSROOM_LOAD_READ_P95_MS: "4500",
    CLASSROOM_LOAD_WRITE_P95_MS: "1500"
  };
  const config = smokeConfig(parseArgs([], budgetEnv), budgetEnv);
  assert.deepEqual(endpointBudgets(config).attempts, { kind: "write", thresholdMs: 1_500 });
  assert.deepEqual(endpointBudgets(config)["lesson-progress"], { kind: "write", thresholdMs: 1_500 });
  assert.deepEqual(endpointBudgets(config).dashboard, { kind: "read", thresholdMs: 4_500 });
  assert.equal(
    aggregate([{ elapsedMs: 10, endpoint: "attempts", ok: false, status: 500 }], endpointBudgets(config))[0].ok,
    false
  );
  const roster = classroomSmokeCredentials(
    parseArgs([], {}),
    5,
    { CLASSROOM_LOAD_DEMO_PASSWORD: "fixture-only", CLASSROOM_LOAD_USE_DEMO_LOGIN: "1" }
  );
  assert.equal(roster.distinctIdentities, 2);
  assert.equal(roster.identities.length, 2);
  assert.equal(roster.students.length, 5);

  let loginCalls = 0;
  const demoEnv = {
    CLASSROOM_LOAD_BASE_URL: "https://preview.example",
    CLASSROOM_LOAD_DEMO_PASSWORD: "fixture-only",
    CLASSROOM_LOAD_USE_DEMO_LOGIN: "1"
  };
  const { report: demoReport } = await executeClassroomLoad(
    parseArgs(["--students", "5", "--rounds", "1"], demoEnv),
    {
      env: demoEnv,
      loginIdentity: async (identity) => {
        loginCalls += 1;
        return {
          baseUrl: "https://preview.example",
          cookie: `fixture-cookie-${loginCalls}`,
          loginMs: loginCalls,
          userId: `fixture-user-${loginCalls}`,
          username: identity.username
        };
      },
      discoverWorkload: async () => ({
        lessonSlug: "fixture-lesson",
        questions: [{ questionId: "fixture-question", selectedAnswer: "1" }]
      }),
      runSeatRound: async (session, _workload, _config, round) => [
        { elapsedMs: 10, endpoint: "attempts", ok: true, round, seat: session.seat, status: 200 },
        { elapsedMs: 11, endpoint: "lesson-progress", ok: true, round, seat: session.seat, status: 200 },
        { elapsedMs: 12, endpoint: "dashboard", ok: true, round, seat: session.seat, status: 200 }
      ],
      writeReport: async () => "fixture-artifact"
    }
  );
  assert.equal(loginCalls, 2, "five seats log in once per distinct demo identity");
  assert.equal(demoReport.distinctIdentities, 2);
  assert.equal(demoReport.login.count, 2);

  let discoveryCalls = 0;
  let redirectFetchCalls = 0;
  let writes = 0;
  await assert.rejects(
    () => executeClassroomLoad(
      parseArgs(["--base-url", "https://preview.example", "--username", "Fixture"], {
        CLASSROOM_LOAD_PASSWORD: "fixture-only"
      }),
      {
        env: { CLASSROOM_LOAD_PASSWORD: "fixture-only" },
        loginIdentity: (identity, redirectConfig, redirectEnv) => loginIdentity(
          identity,
          redirectConfig,
          redirectEnv,
          async (url, options) => {
            redirectFetchCalls += 1;
            assert.equal(options.redirect, "manual");
            return {
              headers: new Headers({ location: "https://www.mais.ac./api/auth/login" }),
              ok: false,
              status: 307,
              text: async () => "",
              url
            };
          }
        ),
        discoverWorkload: async () => {
          discoveryCalls += 1;
          return {
            lessonSlug: "fixture-lesson",
            questions: [{ questionId: "fixture-question", selectedAnswer: "1" }]
          };
        },
        runSeatRound: async () => {
          writes += 1;
          return [];
        },
        writeReport: async () => "fixture-artifact"
      }
    ),
    /production host/i
  );
  assert.equal(redirectFetchCalls, 1);
  assert.equal(discoveryCalls, 0);
  assert.equal(writes, 0);

  const fetchCalls = [];
  const fetchImpl = async (url, options) => {
    fetchCalls.push({ options, url });
    const status = fetchCalls.length === 1 ? 500 : 200;
    return {
      headers: new Headers(),
      ok: status === 200,
      status,
      text: async () => "{}",
      url
    };
  };
  const seatMeasurements = await runSeatRound(
    {
      baseUrl: "https://preview.example",
      cookie: "fixture-cookie",
      seat: 1,
      userId: "fixture-user"
    },
    { lessonSlug: "fixture-lesson", questions: [{ questionId: "fixture-question", selectedAnswer: "1" }] },
    { ...config, baseUrl: "https://preview.example", rounds: 1 },
    0,
    {},
    fetchImpl
  );
  assert.equal(fetchCalls.length, 3);
  for (const call of fetchCalls) {
    assert.equal(call.options.redirect, "manual", "smoke requests never follow redirects");
  }
  assert.equal(fetchCalls[0].options.headers["X-MAIS-Expected-User-Id"], "fixture-user");
  assert.equal(JSON.parse(fetchCalls[0].options.body).expectedUserId, "fixture-user");
  assert.equal(fetchCalls[1].options.headers["X-MAIS-Expected-User-Id"], undefined);
  assert.equal(JSON.parse(fetchCalls[1].options.body).expectedUserId, undefined);
  const requestResults = aggregate(seatMeasurements, endpointBudgets(config));
  assert.deepEqual(
    seatMeasurements.map((measurement) => measurement.endpoint),
    ["attempts", "lesson-progress", "dashboard"]
  );
  const attemptResult = requestResults.find((result) => result.name === "attempts");
  assert.ok(attemptResult);
  assert.ok(attemptResult.p95Ms < attemptResult.thresholdMs, "fixture HTTP 500 is fast");
  assert.equal(attemptResult.errorCount, 1);
  assert.equal(attemptResult.ok, false, "a fast HTTP 500 remains a failed endpoint");

  const errorEnv = {
    CLASSROOM_LOAD_BASE_URL: "https://preview.example",
    CLASSROOM_LOAD_PASSWORD: "fixture-only"
  };
  const { report: errorReport } = await executeClassroomLoad(
    parseArgs(["--username", "Fixture", "--students", "1", "--rounds", "1"], errorEnv),
    {
      env: errorEnv,
      loginIdentity: async (identity) => ({
        baseUrl: "https://preview.example",
        cookie: "fixture-cookie",
        loginMs: 1,
        userId: "fixture-user",
        username: identity.username
      }),
      discoverWorkload: async () => ({
        lessonSlug: "fixture-lesson",
        questions: [{ questionId: "fixture-question", selectedAnswer: "1" }]
      }),
      runSeatRound: async () => seatMeasurements,
      writeReport: async () => "fixture-artifact"
    }
  );
  assert.equal(errorReport.endpointTopologyComplete, true);
  assert.equal(errorReport.ok, false, "a fast HTTP 500 fails the complete run report");

  const artifactDir = await fs.mkdtemp(path.join(tmpdir(), "mais-classroom-load-self-test-"));
  try {
    const artifactEnv = {
      CLASSROOM_LOAD_ARTIFACT_DIR: artifactDir,
      CLASSROOM_LOAD_BASE_URL: "https://preview.example",
      CLASSROOM_LOAD_PASSWORD: "fixture-only"
    };
    const { artifactPath } = await executeClassroomLoad(
      parseArgs(["--username", "Fixture", "--students", "1", "--rounds", "1"], artifactEnv),
      {
        env: artifactEnv,
        loginIdentity: async (identity) => ({
          baseUrl: "https://preview.example",
          cookie: "fixture-cookie",
          loginMs: 1,
          userId: "fixture-user",
          username: identity.username
        }),
        discoverWorkload: async () => ({
          lessonSlug: "fixture-lesson",
          questions: [{ questionId: "fixture-question", selectedAnswer: "1" }]
        }),
        runSeatRound: async (session, _workload, _config, round) => [
          { elapsedMs: 10, endpoint: "attempts", ok: true, round, seat: session.seat, status: 200 },
          { elapsedMs: 11, endpoint: "lesson-progress", ok: true, round, seat: session.seat, status: 200 },
          { elapsedMs: 12, endpoint: "dashboard", ok: true, round, seat: session.seat, status: 200 }
        ]
      }
    );
    assert.equal(artifactPath, path.join(artifactDir, "last-run.json"));
    assert.equal(JSON.parse(await fs.readFile(artifactPath, "utf8")).ok, true);
  } finally {
    await fs.rm(artifactDir, { recursive: true, force: true });
  }
  console.log("classroom-load-smoke self-test: PASS");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.selfTest) {
      await runSelfTest();
    } else {
      await runSmoke(args);
    }
  } catch (error) {
    console.error(`classroom-load-smoke: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
