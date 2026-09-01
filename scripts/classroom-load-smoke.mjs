#!/usr/bin/env node
// Manual staging/preview-only classroom concurrency smoke.
//
// This tool writes practice attempts and lesson progress. It deliberately has
// no default URL, unconditionally rejects known production hosts, and is not
// invoked by any deployment or production-certification path.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_ARTIFACT_DIR = path.join(REPO_ROOT, ".tmp", "classroom-load-smoke");
const DEFAULT_MAX_RESPONSE_BODY_BYTES = 1024 * 1024;
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

function isLoopbackOrigin(value) {
  const hostname = new URL(value).hostname.toLowerCase().replace(/\.+$/u, "");
  return hostname === "localhost" || hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/u.test(hostname);
}

function normalizeExactOrigin(value, label) {
  if (typeof value !== "string" || /[*,\s]/u.test(value)) {
    throw new Error(`${label} must be one exact origin, not a wildcard or list.`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid absolute http(s) origin.`);
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error(`${label} must be a normalized origin without a path, query, fragment, or credentials.`);
  }
  return normalizeBaseUrl(parsed.origin);
}

export function assertApprovedOrigin(baseUrl, env = process.env) {
  const normalizedBaseUrl = normalizeExactOrigin(baseUrl, "Classroom load base URL");
  if (isLoopbackOrigin(normalizedBaseUrl)) return normalizedBaseUrl;
  const configured = env.CLASSROOM_LOAD_APPROVED_ORIGIN;
  if (!configured) {
    throw new Error(
      "Classroom load smoke requires an approved origin (CLASSROOM_LOAD_APPROVED_ORIGIN) for every non-loopback target; derive the exact origin from task-owned Preview evidence."
    );
  }
  const normalizedApproved = normalizeExactOrigin(configured, "CLASSROOM_LOAD_APPROVED_ORIGIN");
  if (normalizedApproved !== normalizedBaseUrl) {
    throw new Error(
      `Classroom load smoke base URL ${normalizedBaseUrl} does not match the exact approved origin.`
    );
  }
  return normalizedBaseUrl;
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
  const baseUrl = normalizeExactOrigin(args.baseUrl, "Classroom load base URL");
  assertTargetIsNotProduction(baseUrl);
  return baseUrl;
}

export function smokeConfig(args, env = process.env) {
  return {
    artifactDir: args.artifactDir || env.CLASSROOM_LOAD_ARTIFACT_DIR || DEFAULT_ARTIFACT_DIR,
    baseUrl: assertApprovedOrigin(requiredBaseUrl(args), env),
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

function classroomProtectionBypassSecret(env = process.env) {
  return (
    env.CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET ||
    env.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET ||
    env.VERCEL_AUTOMATION_BYPASS_SECRET ||
    ""
  );
}

function classroomDemoPassword(env = process.env) {
  return env.CLASSROOM_LOAD_DEMO_PASSWORD || env.DASHBOARD_SMOKE_PASSWORD || "";
}

export function classroomSensitiveValues(args = {}, env = process.env) {
  return [
    args.cookie,
    args.password,
    args.username,
    env.CLASSROOM_LOAD_COOKIE,
    env.CLASSROOM_LOAD_DEMO_PASSWORD,
    env.DASHBOARD_SMOKE_PASSWORD,
    env.CLASSROOM_LOAD_PASSWORD,
    env.CLASSROOM_LOAD_USERNAME,
    env.CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET,
    env.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET,
    env.VERCEL_AUTOMATION_BYPASS_SECRET
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);
}

function authHeaders(cookie, expectedUserId, env = process.env) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (expectedUserId) headers["X-MAIS-Expected-User-Id"] = expectedUserId;
  const bypassSecret = classroomProtectionBypassSecret(env);
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
    const demoPassword = classroomDemoPassword(env);
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
  {
    body,
    headers = {},
    maxBodyBytes = DEFAULT_MAX_RESPONSE_BODY_BYTES,
    method = "GET",
    redirect = "manual",
    timeoutMs = 30_000
  } = {},
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
    const text = await readResponseTextWithLimit(response, maxBodyBytes, controller);
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

async function readResponseTextWithLimit(response, maxBodyBytes, controller) {
  const limit = boundedInteger(
    maxBodyBytes,
    DEFAULT_MAX_RESPONSE_BODY_BYTES,
    1,
    DEFAULT_MAX_RESPONSE_BODY_BYTES,
    "response body byte limit"
  );
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > limit) {
      controller.abort();
      throw new Error(`Classroom load smoke response body exceeded ${limit} bytes.`);
    }
    return text;
  }

  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > limit) {
        controller.abort();
        await reader.cancel("response body byte limit exceeded").catch(() => {});
        throw new Error(`Classroom load smoke response body exceeded ${limit} bytes.`);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export function redactSensitiveText(value, secrets = []) {
  let redacted = typeof value === "string" ? value : String(value);
  const uniqueSecrets = [...new Set(
    secrets.filter((candidate) => typeof candidate === "string" && candidate.length > 0)
  )].sort((left, right) => right.length - left.length);
  for (const secret of uniqueSecrets) {
    redacted = redacted.split(secret).join("[REDACTED]");
  }
  return redacted;
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

function hasTraversalSegment(value) {
  return value.split(/[\\/]+/u).some((segment) => segment === "..");
}

async function safeExistingDirectory(directory, label, { allowPermissive = false } = {}) {
  let stats;
  try {
    stats = await fs.lstat(directory);
  } catch (error) {
    throw new Error(`${label} must already exist as a directory.`);
  }
  if (!stats.isDirectory() || (stats.mode & 0o170000) !== 0o040000) {
    throw new Error(`${label} must be a real directory, not a symlink or other node type.`);
  }
  if (!allowPermissive && (stats.mode & 0o077) !== 0) {
    throw new Error(`${label} must not be group/other accessible.`);
  }
  if (allowPermissive && (stats.mode & 0o022) !== 0 && (stats.mode & 0o1000) === 0) {
    throw new Error(`${label} must not be group/other writable unless it is a sticky directory.`);
  }
  const canonical = await fs.realpath(directory);
  if (canonical !== path.resolve(directory)) {
    throw new Error(`${label} must be a canonical path without symlink ancestors.`);
  }
  return { canonical, stats };
}

async function ensureDirectoryComponent(directory, label, options = {}) {
  try {
    await safeExistingDirectory(directory, label, options);
  } catch (error) {
    if (!/must already exist/u.test(error instanceof Error ? error.message : String(error))) throw error;
    try {
      await fs.mkdir(directory, { mode: 0o700 });
    } catch (mkdirError) {
      if (mkdirError?.code !== "EEXIST") throw mkdirError;
    }
    await safeExistingDirectory(directory, label, options);
  }
}

async function ensureDirectoryChain(baseDirectory, targetParent, label) {
  const relative = path.relative(baseDirectory, targetParent);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes its approved root.`);
  }
  let current = baseDirectory;
  for (const component of relative.split(path.sep)) {
    current = path.join(current, component);
    await ensureDirectoryComponent(current, `${label} ancestor`, { allowPermissive: true });
  }
}

async function resolveArtifactDirectory(artifactDir, env = process.env) {
  if (typeof artifactDir !== "string" || !artifactDir.trim()) {
    throw new Error("Artifact directory must be a non-empty path.");
  }
  if (artifactDir.includes("\0") || hasTraversalSegment(artifactDir)) {
    throw new Error("Artifact directory traversal is not allowed.");
  }
  const rawCandidate = path.resolve(artifactDir);
  const defaultDirectory = path.resolve(DEFAULT_ARTIFACT_DIR);
  if (rawCandidate === defaultDirectory) {
    const repository = await safeExistingDirectory(REPO_ROOT, "Repository root", { allowPermissive: true });
    await ensureDirectoryChain(repository.canonical, path.dirname(defaultDirectory), "Repository artifact directory");
    await ensureDirectoryComponent(defaultDirectory, "Default artifact directory");
    return safeExistingDirectory(defaultDirectory, "Default artifact directory");
  }

  const temporaryRoot = (await safeExistingDirectory(await fs.realpath(tmpdir()), "OS temporary root", { allowPermissive: true })).canonical;
  const approvedRoots = [{ canonical: temporaryRoot, exact: false }];
  const explicitRoot = env.CLASSROOM_LOAD_APPROVED_ARTIFACT_ROOT;
  if (explicitRoot) {
    if (!path.isAbsolute(explicitRoot) || hasTraversalSegment(explicitRoot)) {
      throw new Error("CLASSROOM_LOAD_APPROVED_ARTIFACT_ROOT must be an absolute canonical path.");
    }
    approvedRoots.push({
      canonical: (await safeExistingDirectory(path.resolve(explicitRoot), "Explicit artifact root")).canonical,
      exact: true
    });
  }
  const rawParent = path.dirname(rawCandidate);
  let rawParentStats;
  try {
    rawParentStats = await fs.lstat(rawParent);
  } catch {
    rawParentStats = null;
  }
  const rawParentIsSystemTemporaryAlias = path.resolve(rawParent) === path.resolve(tmpdir());
  if (rawParentStats?.isSymbolicLink() && !rawParentIsSystemTemporaryAlias) {
    throw new Error("Artifact directory has a symlink ancestor.");
  }
  const canonicalParent = rawParentStats
    ? await fs.realpath(rawParent)
    : null;
  for (const root of approvedRoots) {
    if ((root.exact && rawCandidate === root.canonical) || canonicalParent === root.canonical) {
      await safeExistingDirectory(root.canonical, "Approved artifact root", { allowPermissive: true });
      const candidate = root.exact && rawCandidate === root.canonical
        ? root.canonical
        : path.join(root.canonical, path.basename(rawCandidate));
      if (candidate !== root.canonical) {
        await ensureDirectoryComponent(candidate, "Artifact directory");
      }
      return safeExistingDirectory(candidate, "Artifact directory");
    }
  }
  throw new Error(
    "Artifact directory must be the repository default or a canonical direct descendant of an approved task-owned root."
  );
}

function sameNode(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

async function safeResultTarget(artifactPath) {
  try {
    const stats = await fs.lstat(artifactPath);
    if (!stats.isFile() || (stats.mode & 0o170000) !== 0o100000) {
      throw new Error("Artifact result must be a regular file, not a symlink or other node type.");
    }
    if (stats.nlink !== 1) throw new Error("Artifact result hardlinks are not allowed.");
    if ((stats.mode & 0o077) !== 0 || (stats.mode & 0o777) !== 0o600) {
      throw new Error("Artifact result must have mode 0600 and no group/other access.");
    }
    return stats;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function writeReport(report, artifactDir, env = process.env, hooks = {}) {
  const admittedDirectory = await resolveArtifactDirectory(artifactDir, env);
  const targetDirectory = admittedDirectory.canonical;
  const artifactPath = path.join(targetDirectory, "last-run.json");
  const lockPath = path.join(targetDirectory, ".last-run.json.lock");
  await hooks.beforeLock?.(targetDirectory);
  const directoryStats = await safeExistingDirectory(targetDirectory, "Artifact directory");
  if (!sameNode(admittedDirectory.stats, directoryStats.stats)) {
    throw new Error("Artifact directory changed between admission and lock creation.");
  }
  try {
    await fs.mkdir(lockPath, { mode: 0o700 });
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("Artifact result writer race detected; refusing concurrent output.");
    throw error;
  }

  let temporaryPath;
  let temporaryStats;
  try {
    const existingStats = await safeResultTarget(artifactPath);
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    temporaryPath = path.join(targetDirectory, `.last-run.json.${process.pid}.${randomUUID()}.tmp`);
    const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | (fsConstants.O_NOFOLLOW ?? 0);
    const handle = await fs.open(temporaryPath, flags, 0o600);
    try {
      await handle.chmod(0o600);
      await handle.writeFile(serialized, "utf8");
      await handle.sync();
      temporaryStats = await handle.stat();
    } finally {
      await handle.close();
    }
    const currentDirectoryStats = await safeExistingDirectory(targetDirectory, "Artifact directory");
    if (!sameNode(directoryStats.stats, currentDirectoryStats.stats)) {
      throw new Error("Artifact directory changed during report write.");
    }
    const currentExistingStats = await safeResultTarget(artifactPath);
    if (existingStats && (!currentExistingStats || !sameNode(existingStats, currentExistingStats))) {
      throw new Error("Artifact result changed during report write.");
    }
    await fs.rename(temporaryPath, artifactPath);
    temporaryPath = undefined;
    const finalStats = await safeResultTarget(artifactPath);
    if (!finalStats || !sameNode(temporaryStats, finalStats)) {
      throw new Error("Artifact result changed during atomic replacement.");
    }
    return artifactPath;
  } finally {
    if (temporaryPath) await fs.rm(temporaryPath, { force: true }).catch(() => {});
    await fs.rmdir(lockPath).catch(() => {});
  }
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
  const artifactPath = await persistReport(report, config.artifactDir, env);
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
    CLASSROOM_LOAD_APPROVED_ORIGIN: "https://preview.example",
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
    CLASSROOM_LOAD_APPROVED_ORIGIN: "https://preview.example",
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
        CLASSROOM_LOAD_APPROVED_ORIGIN: "https://preview.example",
        CLASSROOM_LOAD_PASSWORD: "fixture-only"
      }),
      {
        env: {
          CLASSROOM_LOAD_APPROVED_ORIGIN: "https://preview.example",
          CLASSROOM_LOAD_PASSWORD: "fixture-only"
        },
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
    CLASSROOM_LOAD_APPROVED_ORIGIN: "https://preview.example",
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
      CLASSROOM_LOAD_APPROVED_ORIGIN: "https://preview.example",
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
    assert.equal(path.basename(artifactPath), "last-run.json");
    assert.equal(await fs.realpath(path.dirname(artifactPath)), await fs.realpath(artifactDir));
    assert.equal(JSON.parse(await fs.readFile(artifactPath, "utf8")).ok, true);
    const initialArtifactStats = await fs.lstat(artifactPath);
    assert.equal(initialArtifactStats.mode & 0o777, 0o600);
    assert.equal(initialArtifactStats.nlink, 1);
    await writeReport({ replaced: true }, artifactDir, artifactEnv);
    assert.deepEqual(JSON.parse(await fs.readFile(artifactPath, "utf8")), { replaced: true });
    const replacementArtifactStats = await fs.lstat(artifactPath);
    assert.equal(replacementArtifactStats.mode & 0o777, 0o600);
    assert.equal(replacementArtifactStats.nlink, 1);
    const writerLockPath = path.join(artifactDir, ".last-run.json.lock");
    await fs.mkdir(writerLockPath, { mode: 0o700 });
    try {
      await assert.rejects(
        () => writeReport({ race: true }, artifactDir, artifactEnv),
        /race|concurrent|artifact/i
      );
    } finally {
      await fs.rmdir(writerLockPath);
    }

    await assert.rejects(
      () => writeReport({ escape: true }, `${artifactDir}/../mais-classroom-load-escape`),
      /artifact directory|approved|descendant/i
    );

    const symlinkFixtureRoot = await fs.mkdtemp(path.join(tmpdir(), "mais-classroom-load-symlink-fixture-"));
    const symlinkTarget = path.join(symlinkFixtureRoot, "target");
    const symlinkParent = path.join(symlinkFixtureRoot, "link");
    await fs.mkdir(symlinkTarget, { mode: 0o700 });
    await fs.symlink(symlinkTarget, symlinkParent);
    try {
      await assert.rejects(
        () => writeReport({ symlink: true }, path.join(symlinkParent, "nested")),
        /symlink|artifact directory|unsafe/i
      );
    } finally {
      await fs.rm(symlinkFixtureRoot, { recursive: true, force: true });
    }

    const finalSymlinkDir = await fs.mkdtemp(path.join(tmpdir(), "mais-classroom-load-final-symlink-"));
    const finalSymlinkTarget = path.join(finalSymlinkDir, "outside.json");
    const finalSymlink = path.join(finalSymlinkDir, "last-run.json");
    await fs.writeFile(finalSymlinkTarget, "outside\n", { mode: 0o600 });
    await fs.symlink(finalSymlinkTarget, finalSymlink);
    try {
      await assert.rejects(
        () => writeReport({ symlink: true }, finalSymlinkDir),
        /symlink|unsafe|artifact/i
      );
    } finally {
      await fs.rm(finalSymlinkDir, { recursive: true, force: true });
    }

    const hardlinkDir = await fs.mkdtemp(path.join(tmpdir(), "mais-classroom-load-hardlink-"));
    const hardlinkTarget = path.join(hardlinkDir, "other.json");
    const hardlinkResult = path.join(hardlinkDir, "last-run.json");
    await fs.writeFile(hardlinkTarget, "shared\n", { mode: 0o600 });
    await fs.link(hardlinkTarget, hardlinkResult);
    try {
      await assert.rejects(
        () => writeReport({ hardlink: true }, hardlinkDir),
        /hardlink|unsafe|artifact/i
      );
    } finally {
      await fs.rm(hardlinkDir, { recursive: true, force: true });
    }

    const unsafeModeDir = await fs.mkdtemp(path.join(tmpdir(), "mais-classroom-load-unsafe-mode-"));
    const unsafeModeResult = path.join(unsafeModeDir, "last-run.json");
    await fs.writeFile(unsafeModeResult, "unsafe\n", { mode: 0o644 });
    try {
      await assert.rejects(
        () => writeReport({ unsafeMode: true }, unsafeModeDir),
        /permission|unsafe|artifact/i
      );
    } finally {
      await fs.rm(unsafeModeDir, { recursive: true, force: true });
    }
  } finally {
    await fs.rm(artifactDir, { recursive: true, force: true });
  }

  const approvedOriginBaseArgs = parseArgs(["--base-url", "https://preview.example", "--username", "Fixture"], {
    CLASSROOM_LOAD_PASSWORD: "fixture-only"
  });
  assert.equal(assertApprovedOrigin("http://127.0.0.1:3210", {}), "http://127.0.0.1:3210");
  assert.throws(
    () => smokeConfig(approvedOriginBaseArgs, { CLASSROOM_LOAD_PASSWORD: "fixture-only" }),
    /approved origin/i
  );
  const mismatchedOriginEnv = {
    CLASSROOM_LOAD_APPROVED_ORIGIN: "https://other-preview.example",
    CLASSROOM_LOAD_PASSWORD: "fixture-only"
  };
  assert.throws(
    () => smokeConfig(approvedOriginBaseArgs, mismatchedOriginEnv),
    /approved origin/i
  );
  assert.throws(
    () => smokeConfig(approvedOriginBaseArgs, {
      CLASSROOM_LOAD_APPROVED_ORIGIN: "https://*.preview.example",
      CLASSROOM_LOAD_PASSWORD: "fixture-only"
    }),
    /wildcard|exact origin/i
  );
  let unapprovedFetchCalls = 0;
  await assert.rejects(
    () => executeClassroomLoad(approvedOriginBaseArgs, {
      env: { CLASSROOM_LOAD_PASSWORD: "fixture-only" },
      loginIdentity: async () => {
        unapprovedFetchCalls += 1;
        throw new Error("network must not be reached");
      }
    }),
    /approved origin/i
  );
  assert.equal(unapprovedFetchCalls, 0, "missing approved origin blocks before login/fetch");
  await assert.rejects(
    () => executeClassroomLoad(approvedOriginBaseArgs, {
      env: mismatchedOriginEnv,
      loginIdentity: async () => {
        unapprovedFetchCalls += 1;
        throw new Error("network must not be reached");
      }
    }),
    /approved origin/i
  );
  assert.equal(unapprovedFetchCalls, 0, "mismatched approved origin blocks before login/fetch");
  console.log("classroom-load-smoke self-test: PASS");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
if (isMain) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    if (args.selfTest) {
      await runSelfTest();
    } else {
      await runSmoke(args);
    }
  } catch (error) {
    const secrets = classroomSensitiveValues(args, process.env);
    const message = redactSensitiveText(error instanceof Error ? error.message : String(error), secrets);
    console.error(`classroom-load-smoke: ${message}`);
    process.exitCode = 1;
  }
}
