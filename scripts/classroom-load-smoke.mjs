#!/usr/bin/env node
// Classroom-concurrency load smoke: N students hitting the student write/read
// path at the same time, the way one classroom starting a lesson together does.
//
// The single-user dashboard latency smoke (scripts/dashboard-latency-smoke.mjs)
// answers "is the site fast when nobody else is on it". This one answers the
// question that actually breaks a school day: does the WRITE path hold up when
// a whole class submits at once. It reuses that script's arg parsing, cookie
// handling, percentile helpers and --json/--self-test conventions on purpose —
// the two smokes should stay readable side by side.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_ARTIFACT_DIR = path.join(REPO_ROOT, ".tmp", "classroom-load-smoke");
// Deliberately NO default base URL. The dashboard latency smoke can default to
// production because it only reads; this one submits real practice attempts and
// lesson progress, so an accidental bare `npm run smoke:classroom-load` must not
// be able to write a synthetic classroom into a live student's account.
const PRODUCTION_HOSTS = new Set(["mais.ac", "www.mais.ac", "mais.hk", "www.mais.hk"]);

// The internal fast-login seeds (lib/server/internalCaliforniaFastLogin.ts) are a
// fixed roster, not a factory: US_CA_MATH ships exactly two student seeds. A
// 15-seat run therefore drives 15 concurrent request streams across those two
// identities, not 15 distinct user rows — so it loads request concurrency and
// same-row write contention, not per-row fan-out. The report states the distinct
// identity count so a reader never mistakes one for the other.
const DEMO_STUDENTS = [
  { password: "12345", username: "Student Shirleen" },
  { password: "12345", username: "Student Jon" }
];

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.CLASSROOM_LOAD_BASE_URL || "",
    cookie: process.env.CLASSROOM_LOAD_COOKIE || "",
    grade: process.env.CLASSROOM_LOAD_GRADE || "P1",
    json: false,
    password: process.env.CLASSROOM_LOAD_PASSWORD || "",
    rounds: boundedInteger(process.env.CLASSROOM_LOAD_ROUNDS, 3, 1, 50),
    selfTest: false,
    students: boundedInteger(process.env.CLASSROOM_LOAD_STUDENTS, 15, 1, 200),
    username: process.env.CLASSROOM_LOAD_USERNAME || ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      args.baseUrl = argv[++index];
    } else if (arg === "--cookie") {
      args.cookie = argv[++index] ?? "";
    } else if (arg === "--grade") {
      args.grade = argv[++index] ?? args.grade;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--password") {
      args.password = argv[++index] ?? "";
    } else if (arg === "--rounds") {
      args.rounds = boundedInteger(argv[++index], args.rounds, 1, 50);
    } else if (arg === "--self-test") {
      args.selfTest = true;
    } else if (arg === "--students") {
      args.students = boundedInteger(argv[++index], args.students, 1, 200);
    } else if (arg === "--username") {
      args.username = argv[++index] ?? "";
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function percentile(values, percentileValue) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1));
  return sorted[index];
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function normalizeBaseUrl(value) {
  const parsed = new URL(stripTrailingSlash(value));
  if (parsed.hostname === "localhost") {
    parsed.hostname = "127.0.0.1";
  }
  return parsed.toString().replace(/\/+$/, "");
}

function setCookieValues(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get("set-cookie");
  return raw ? raw.split(/,(?=\s*[^;,=\s]+=)/).map((cookie) => cookie.trim()) : [];
}

function cookieHeaderFromSetCookie(headers) {
  return setCookieValues(headers)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function authHeaders(cookie) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  const bypassSecret = process.env.CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET
    || process.env.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET
    || process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypassSecret) headers["x-vercel-protection-bypass"] = bypassSecret;
  return headers;
}

function demoLoginEnabled(env = process.env) {
  return env.CLASSROOM_LOAD_USE_DEMO_LOGIN === "1" || env.DASHBOARD_SMOKE_USE_DEMO_LOGIN === "1";
}

// Mirrors dashboardSmokeCredentials, but returns a ROSTER: one entry per virtual
// student, round-robined over whatever identities are available.
//
// `identities` is the DISTINCT set actually used, and it matters operationally:
// /api/auth/login rate-limits per username (authRateLimitRules.loginIdentifier,
// 12 per 15 minutes by default). Logging in once per identity and sharing that
// cookie across the seats assigned to it keeps a 15-seat class — and a re-run
// five minutes later — from tripping that limit. Seats sharing an identity are
// not a fidelity loss: distinct logins of one account produce the same session
// subject server-side anyway.
function classroomSmokeCredentials(args, studentCount = 1) {
  const roster = args.username && args.password
    ? [{ password: args.password, username: args.username }]
    : demoLoginEnabled()
      ? DEMO_STUDENTS
      : null;
  if (!roster) return null;

  const students = Array.from({ length: studentCount }, (_, index) => ({
    ...roster[index % roster.length],
    seat: index + 1
  }));
  const identities = roster.slice(0, Math.min(roster.length, studentCount));

  return {
    authMode: args.username && args.password ? "username-password" : "demo-login",
    distinctIdentities: identities.length,
    identities,
    students
  };
}

// A write smoke pointed at a live domain would enrol a fake classroom in real
// students' progress. Refusing by default is the only safe posture; the escape
// hatch exists so an owner-approved production capacity test is still possible,
// but it has to be typed out on purpose.
function assertTargetIsNotProduction(baseUrl, env = process.env) {
  const { hostname } = new URL(baseUrl);
  if (!PRODUCTION_HOSTS.has(hostname.toLowerCase())) return;
  if (env.CLASSROOM_LOAD_ALLOW_PRODUCTION === "1") return;
  throw new Error(
    `Refusing to run the classroom load smoke against production host ${hostname}: it submits real practice attempts and lesson progress. Point --base-url at staging, or set CLASSROOM_LOAD_ALLOW_PRODUCTION=1 with owner approval.`
  );
}

function requiredBaseUrl(args) {
  if (!args.baseUrl) {
    throw new Error("Classroom load smoke requires an explicit --base-url (or CLASSROOM_LOAD_BASE_URL); it writes, so it has no default target.");
  }
  const baseUrl = normalizeBaseUrl(args.baseUrl);
  assertTargetIsNotProduction(baseUrl);
  return baseUrl;
}

function smokeConfig(args) {
  return {
    artifactDir: process.env.CLASSROOM_LOAD_ARTIFACT_DIR || DEFAULT_ARTIFACT_DIR,
    baseUrl: requiredBaseUrl(args),
    grade: args.grade,
    // A read is allowed to be slower than a write here: the dashboard aggregates,
    // the writes are the thing that must not queue up behind a classroom.
    readThresholdMs: boundedInteger(process.env.CLASSROOM_LOAD_READ_P95_MS, 3_000, 500, 120_000),
    rounds: args.rounds,
    students: args.students,
    timeoutMs: boundedInteger(process.env.CLASSROOM_LOAD_TIMEOUT_MS, 30_000, 1_000, 180_000),
    writeThresholdMs: boundedInteger(process.env.CLASSROOM_LOAD_WRITE_P95_MS, 2_000, 500, 120_000)
  };
}

function endpointBudgets(config) {
  return {
    attempts: { kind: "write", thresholdMs: config.writeThresholdMs },
    dashboard: { kind: "read", thresholdMs: config.readThresholdMs },
    "lesson-progress": { kind: "write", thresholdMs: config.writeThresholdMs }
  };
}

async function timedFetch(url, { body, headers = {}, method = "GET", timeoutMs = 30_000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      body,
      headers,
      method,
      signal: controller.signal
    });
    const text = await response.text();
    return {
      elapsedMs: Date.now() - startedAt,
      finalUrl: response.url,
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

async function loginIdentity(identity, config) {
  const response = await timedFetch(`${config.baseUrl}/api/auth/login`, {
    body: JSON.stringify({
      curriculumTrack: process.env.CLASSROOM_LOAD_CURRICULUM_TRACK || "US_CA_MATH",
      grade: config.grade,
      language: process.env.CLASSROOM_LOAD_LANGUAGE || "en",
      password: identity.password,
      username: identity.username
    }),
    headers: {
      "Content-Type": "application/json",
      ...authHeaders("")
    },
    method: "POST",
    timeoutMs: config.timeoutMs
  });

  // 429 here is almost always the per-username login limit rather than a real
  // capacity signal, and it is invisible in the latency numbers — so name the
  // cause and the fix instead of surfacing a bare status code.
  if (response.status === 429) {
    throw new Error(
      `Classroom load smoke login for ${identity.username} was rate limited (HTTP 429). /api/auth/login allows ${"12"} logins per username per 15 minutes by default (authRateLimitRules.loginIdentifier); either wait out the window or raise HK_MATH_E2E_LOGIN_IDENTIFIER_MAX on the target deployment.`
    );
  }
  if (!response.ok) {
    throw new Error(`Classroom load smoke login failed for ${identity.username} with HTTP ${response.status}.`);
  }

  const cookie = cookieHeaderFromSetCookie(response.headers);
  if (!cookie) {
    throw new Error(`Classroom load smoke login for ${identity.username} returned no session cookie.`);
  }

  return {
    baseUrl: normalizeBaseUrl(new URL(response.finalUrl || config.baseUrl).origin),
    cookie,
    loginMs: response.elapsedMs,
    username: identity.username
  };
}

// Content IDs move constantly (parallel content-QA branches retag lessons and
// question banks), so the workload discovers real ones per run instead of
// pinning literals that rot into 404s and read as a latency regression.
function firstOptionText(question) {
  const option = Array.isArray(question?.options) ? question.options[0] : null;
  if (typeof option === "string") return option;
  if (option && typeof option === "object") {
    return option.en ?? option.zh ?? option.zhHans ?? null;
  }
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

async function discoverWorkload(session, config) {
  const [questionsResponse, lessonResponse] = await Promise.all([
    timedFetch(
      `${session.baseUrl}/api/questions?grade=${encodeURIComponent(config.grade)}&curriculumTrack=${encodeURIComponent(process.env.CLASSROOM_LOAD_CURRICULUM_TRACK || "US_CA_MATH")}`,
      { headers: authHeaders(session.cookie), timeoutMs: config.timeoutMs }
    ),
    timedFetch(`${session.baseUrl}/api/lesson-entry?grade=${encodeURIComponent(config.grade)}`, {
      headers: authHeaders(session.cookie),
      timeoutMs: config.timeoutMs
    })
  ]);

  if (!questionsResponse.ok) {
    throw new Error(`Classroom load smoke could not read the question bank (HTTP ${questionsResponse.status}).`);
  }
  const questions = questionWorkload(parseJson(questionsResponse.text));
  if (!questions.length) {
    throw new Error(`Classroom load smoke found no practice questions for grade ${config.grade}; nothing to load-test.`);
  }

  if (!lessonResponse.ok) {
    throw new Error(`Classroom load smoke could not read a lesson entry target (HTTP ${lessonResponse.status}).`);
  }
  const lessonSlug = parseJson(lessonResponse.text)?.lessonEntryTarget?.slug;
  if (typeof lessonSlug !== "string" || !lessonSlug) {
    throw new Error(`Classroom load smoke found no lesson entry slug for grade ${config.grade}; nothing to load-test.`);
  }

  return { lessonSlug, questions };
}

// One seat's turn: submit an attempt, record lesson progress, reload the
// dashboard — the same three calls the student client makes per practice item.
async function runSeatRound(session, workload, config, round) {
  const question = workload.questions[(session.seat + round) % workload.questions.length];
  const measurements = [];

  const attempt = await timedFetch(`${session.baseUrl}/api/attempts`, {
    body: JSON.stringify({
      durationSeconds: 12,
      questionId: question.questionId,
      selectedAnswer: question.selectedAnswer
    }),
    headers: { "Content-Type": "application/json", ...authHeaders(session.cookie) },
    method: "POST",
    timeoutMs: config.timeoutMs
  });
  measurements.push({ endpoint: "attempts", round, seat: session.seat, ...summarize(attempt) });

  const progress = await timedFetch(`${session.baseUrl}/api/lesson-progress`, {
    body: JSON.stringify({
      action: round === config.rounds - 1 ? "complete" : "update",
      durationSeconds: 30,
      slug: workload.lessonSlug
    }),
    headers: { "Content-Type": "application/json", ...authHeaders(session.cookie) },
    method: "POST",
    timeoutMs: config.timeoutMs
  });
  measurements.push({ endpoint: "lesson-progress", round, seat: session.seat, ...summarize(progress) });

  const dashboard = await timedFetch(`${session.baseUrl}/api/dashboard?grade=${encodeURIComponent(config.grade)}`, {
    headers: authHeaders(session.cookie),
    timeoutMs: config.timeoutMs
  });
  measurements.push({ endpoint: "dashboard", round, seat: session.seat, ...summarize(dashboard) });

  return measurements;
}

function summarize(response) {
  return {
    elapsedMs: response.elapsedMs,
    error: response.error,
    ok: response.ok,
    status: response.status
  };
}

function aggregate(measurements, budgets) {
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
      const p95 = percentile(durations, 95);
      return {
        errorCount: errors.length,
        errorRate: samples.length ? errors.length / samples.length : 0,
        // An error is a failure regardless of latency: a fast 500 is not a pass.
        ok: errors.length === 0 && p95 !== null && p95 <= budget.thresholdMs,
        kind: budget.kind,
        maxMs: durations.length ? Math.max(...durations) : null,
        name,
        p50Ms: percentile(durations, 50),
        p95Ms: p95,
        requests: samples.length,
        statuses: [...new Set(samples.map((sample) => sample.status))].sort((a, b) => a - b),
        thresholdMs: budget.thresholdMs
      };
    });
}

async function runSmoke(args) {
  const config = smokeConfig(args);
  const credentials = classroomSmokeCredentials(args, config.students);
  if (!args.cookie && !credentials) {
    throw new Error("Classroom load smoke requires CLASSROOM_LOAD_COOKIE, --username/--password, or DASHBOARD_SMOKE_USE_DEMO_LOGIN=1.");
  }

  // Log the distinct identities in concurrently, then seat the class on top of
  // them. One login per identity rather than per seat is what keeps the login
  // rate limit from capping how large a classroom this smoke can model.
  let sessions;
  if (args.cookie) {
    sessions = Array.from({ length: config.students }, (_, index) => ({
      baseUrl: config.baseUrl,
      cookie: args.cookie,
      loginMs: 0,
      seat: index + 1,
      username: "cookie"
    }));
  } else {
    const loggedIn = await Promise.all(
      credentials.identities.map((identity) => loginIdentity(identity, config))
    );
    const byUsername = new Map(loggedIn.map((session) => [session.username, session]));
    sessions = credentials.students.map((student) => {
      const identity = byUsername.get(student.username);
      return {
        baseUrl: identity.baseUrl,
        cookie: identity.cookie,
        loginMs: identity.loginMs,
        seat: student.seat,
        username: student.username
      };
    });
  }

  // Re-assert AFTER login. The effective target is the redirect-resolved origin,
  // not the one that was typed: a staging alias that 308s to a live domain would
  // otherwise pass the pre-flight check and then land every write on production.
  // This still costs one login round-trip to the resolved host before it trips —
  // login writes no student data, and every attempt/progress write is downstream
  // of this check, so nothing lands in a real account.
  for (const baseUrl of new Set(sessions.map((session) => session.baseUrl))) {
    assertTargetIsNotProduction(baseUrl);
  }

  const workload = await discoverWorkload(sessions[0], config);

  const measurements = [];
  for (let round = 0; round < config.rounds; round += 1) {
    const roundResults = await Promise.all(
      sessions.map((session) => runSeatRound(session, workload, config, round))
    );
    for (const seatMeasurements of roundResults) measurements.push(...seatMeasurements);
  }

  const results = aggregate(measurements, endpointBudgets(config));
  // One sample per actual login, not per seat — repeating an identity's login
  // time once per seat would invent percentiles out of a single measurement.
  const loginDurations = [...new Map(sessions.map((session) => [session.username, session.loginMs])).values()];
  const report = {
    authMode: args.cookie ? "cookie" : credentials.authMode,
    baseUrl: sessions[0].baseUrl,
    concurrency: config.students,
    distinctIdentities: args.cookie ? 1 : credentials.distinctIdentities,
    generatedAt: new Date().toISOString(),
    grade: config.grade,
    login: {
      count: loginDurations.length,
      maxMs: loginDurations.length ? Math.max(...loginDurations) : null,
      p50Ms: percentile(loginDurations, 50),
      p95Ms: percentile(loginDurations, 95)
    },
    ok: results.every((result) => result.ok),
    readThresholdMs: config.readThresholdMs,
    requestedBaseUrl: config.baseUrl,
    results,
    rounds: config.rounds,
    totalRequests: measurements.length,
    workload: { lessonSlug: workload.lessonSlug, questionPoolSize: workload.questions.length },
    writeThresholdMs: config.writeThresholdMs
  };

  await fs.mkdir(config.artifactDir, { recursive: true });
  await fs.writeFile(path.join(config.artifactDir, "last-run.json"), `${JSON.stringify(report, null, 2)}\n`);

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `Classroom load smoke: ${report.ok ? "PASS" : "FAIL"} ${report.baseUrl} grade=${config.grade} students=${config.students} rounds=${config.rounds} requests=${report.totalRequests}`
    );
    console.log(
      `Identities: ${report.distinctIdentities} distinct account(s) across ${config.students} concurrent seats (${report.login.count} login(s), p95=${report.login.p95Ms}ms max=${report.login.maxMs}ms)`
    );
    for (const result of results) {
      console.log(
        `${result.ok ? "PASS" : "FAIL"} ${result.name} [${result.kind}]: p50=${result.p50Ms}ms p95=${result.p95Ms}ms max=${result.maxMs}ms threshold=${result.thresholdMs}ms n=${result.requests} errors=${result.errorCount} status=${result.statuses.join("/")}`
      );
    }
    console.log(`Artifact: ${path.join(config.artifactDir, "last-run.json")}`);
  }

  if (!report.ok) process.exitCode = 1;
}

function runSelfTest() {
  assert.equal(stripTrailingSlash("https://mais.ac///"), "https://mais.ac");
  assert.equal(normalizeBaseUrl("http://localhost:3210/"), "http://127.0.0.1:3210");
  assert.equal(percentile([100, 200, 300], 95), 300);
  assert.equal(percentile([100, 200, 300], 50), 200);
  assert.equal(percentile([], 95), null);

  const headers = {
    get: (name) => name.toLowerCase() === "set-cookie" ? "a=1; Path=/, b=2; Path=/" : null
  };
  assert.equal(cookieHeaderFromSetCookie(headers), "a=1; b=2");

  assert.deepEqual(parseArgs(["--students", "20", "--rounds", "4", "--json"]).students, 20);
  assert.equal(parseArgs(["--rounds", "4"]).rounds, 4);
  assert.equal(parseArgs([]).students, 15, "default classroom size is 15 students");
  assert.equal(parseArgs([]).rounds, 3);
  assert.equal(parseArgs(["--students", "9999"]).students, 200, "student count is clamped");
  assert.throws(() => parseArgs(["--nope"]), /Unknown argument/);

  // A write smoke must never acquire a default target, and must refuse live domains.
  assert.throws(() => smokeConfig(parseArgs([])), /requires an explicit --base-url/);
  assert.throws(
    () => smokeConfig(parseArgs(["--base-url", "https://www.mais.ac"])),
    /Refusing to run the classroom load smoke against production host/
  );
  assert.throws(() => smokeConfig(parseArgs(["--base-url", "https://mais.hk"])), /production host/);
  const originalAllowProduction = process.env.CLASSROOM_LOAD_ALLOW_PRODUCTION;
  process.env.CLASSROOM_LOAD_ALLOW_PRODUCTION = "1";
  assert.equal(
    smokeConfig(parseArgs(["--base-url", "https://www.mais.ac"])).baseUrl,
    "https://www.mais.ac",
    "the owner-approved escape hatch still works"
  );
  if (originalAllowProduction === undefined) {
    delete process.env.CLASSROOM_LOAD_ALLOW_PRODUCTION;
  } else {
    process.env.CLASSROOM_LOAD_ALLOW_PRODUCTION = originalAllowProduction;
  }
  assert.equal(smokeConfig(parseArgs(["--base-url", "https://staging.example.com"])).baseUrl, "https://staging.example.com");

  const config = smokeConfig(parseArgs(["--base-url", "http://127.0.0.1:3287"]));
  assert.equal(config.writeThresholdMs, 2_000, "default write p95 budget is 2000ms");
  assert.equal(config.readThresholdMs, 3_000);
  assert.equal(endpointBudgets(config).attempts.kind, "write");
  assert.equal(endpointBudgets(config)["lesson-progress"].thresholdMs, 2_000);
  assert.equal(endpointBudgets(config).dashboard.kind, "read");

  assert.equal(classroomSmokeCredentials({ password: "", username: "" }, 3), null);
  const explicit = classroomSmokeCredentials({ password: "secret", username: "student" }, 3);
  assert.equal(explicit.authMode, "username-password");
  assert.equal(explicit.students.length, 3);
  assert.equal(explicit.distinctIdentities, 1);
  assert.equal(explicit.identities.length, 1, "three seats on one account need exactly one login");
  assert.deepEqual(explicit.students.map((student) => student.seat), [1, 2, 3]);

  const originalDemoFlag = process.env.DASHBOARD_SMOKE_USE_DEMO_LOGIN;
  process.env.DASHBOARD_SMOKE_USE_DEMO_LOGIN = "1";
  const demo = classroomSmokeCredentials({ password: "", username: "" }, 5);
  assert.equal(demo.authMode, "demo-login");
  assert.equal(demo.students.length, 5, "roster round-robins to fill every seat");
  assert.equal(demo.distinctIdentities, DEMO_STUDENTS.length);
  assert.equal(demo.students[0].username, DEMO_STUDENTS[0].username);
  assert.equal(demo.students[DEMO_STUDENTS.length].username, DEMO_STUDENTS[0].username, "seats wrap around the roster");
  // The login count must track distinct identities, not seats: /api/auth/login
  // allows only 12 logins per username per 15 minutes.
  assert.equal(demo.identities.length, DEMO_STUDENTS.length, "five seats still need only one login per identity");
  const smallClass = classroomSmokeCredentials({ password: "", username: "" }, 1);
  assert.equal(smallClass.identities.length, 1, "a one-seat class logs in once, not once per roster entry");
  assert.equal(smallClass.distinctIdentities, 1);
  if (originalDemoFlag === undefined) {
    delete process.env.DASHBOARD_SMOKE_USE_DEMO_LOGIN;
  } else {
    process.env.DASHBOARD_SMOKE_USE_DEMO_LOGIN = originalDemoFlag;
  }

  assert.equal(firstOptionText({ options: [{ en: "four", zh: "四" }] }), "four");
  assert.equal(firstOptionText({ options: ["7"] }), "7");
  assert.equal(firstOptionText({}), null);
  assert.deepEqual(questionWorkload({ questions: [{ id: "q1", options: [{ en: "a", zh: "a" }] }, { id: "" }] }), [
    { questionId: "q1", selectedAnswer: "a" }
  ]);
  assert.deepEqual(questionWorkload({ questions: [{ id: "q2" }] }), [{ questionId: "q2", selectedAnswer: "1" }]);

  const budgets = endpointBudgets(config);
  const fast = aggregate(
    [
      { elapsedMs: 100, endpoint: "attempts", ok: true, status: 200 },
      { elapsedMs: 150, endpoint: "attempts", ok: true, status: 200 }
    ],
    budgets
  );
  assert.equal(fast[0].ok, true);
  assert.equal(fast[0].errorCount, 0);
  assert.equal(fast[0].requests, 2);
  assert.equal(fast[0].p95Ms, 150);

  const slow = aggregate([{ elapsedMs: 9_000, endpoint: "attempts", ok: true, status: 200 }], budgets);
  assert.equal(slow[0].ok, false, "a write over the p95 budget fails");

  const errored = aggregate([{ elapsedMs: 20, endpoint: "attempts", ok: false, status: 500 }], budgets);
  assert.equal(errored[0].ok, false, "a fast error still fails");
  assert.equal(errored[0].errorRate, 1);

  console.log("classroom-load-smoke self-test: PASS");
}

const args = parseArgs(process.argv.slice(2));
if (args.selfTest) {
  runSelfTest();
} else {
  await runSmoke(args);
}
