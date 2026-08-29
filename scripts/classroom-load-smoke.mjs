#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
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
const requiredMeasuredEndpoints = ["attempts", "lesson-progress", "dashboard"];
const maxReportBytes = 1024 * 1024;

export const responseBodyLimits = Object.freeze({
  dashboard: 2 * 1024 * 1024,
  lessonEntry: 256 * 1024,
  login: 64 * 1024,
  questionBank: 8 * 1024 * 1024,
  session: 64 * 1024,
  write: 256 * 1024
});

class ClassroomSmokeError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "ClassroomSmokeError";
    this.code = code;
  }
}

function smokeFailure(code, message = code) {
  return new ClassroomSmokeError(code, message);
}

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
    seatConcurrency: boundedInteger(env.CLASSROOM_LOAD_SEAT_CONCURRENCY, 15, 1, 200, "seat concurrency"),
    selfTest: false,
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
    } else if (argument === "--seat-concurrency") {
      args.seatConcurrency = boundedInteger(
        readArgumentValue(argv, index, "--seat-concurrency"),
        args.seatConcurrency,
        1,
        200,
        "seat concurrency"
      );
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
    seatConcurrency: boundedInteger(args.seatConcurrency, 15, 1, 200, "seat concurrency"),
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
  if (parsed.port) {
    throw new Error("Remote staging mode rejects noncanonical explicit HTTPS ports.");
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
    throw smokeFailure("request-origin-mismatch");
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
      await cancelResponseBody(response);
      throw smokeFailure("response-origin-mismatch");
    }
    if (!redirectStatuses.has(response.status)) return response;

    if (redirectCount === maxRedirects) {
      await cancelResponseBody(response);
      throw smokeFailure("redirect-limit-exceeded");
    }

    const location = response.headers.get("location");
    if (!location) {
      await cancelResponseBody(response);
      throw smokeFailure("redirect-location-missing");
    }
    let nextUrl;
    try {
      nextUrl = new URL(location, currentUrl);
    } catch {
      await cancelResponseBody(response);
      throw smokeFailure("redirect-location-invalid");
    }
    if (nextUrl.origin !== canonicalExpectedOrigin) {
      await cancelResponseBody(response);
      throw smokeFailure("redirect-origin-mismatch");
    }
    if (!["GET", "HEAD"].includes(method) && ![307, 308].includes(response.status)) {
      await cancelResponseBody(response);
      throw smokeFailure("redirect-method-change");
    }
    if (response.status === 303 && method !== "HEAD") {
      method = "GET";
      body = undefined;
    }
    await cancelResponseBody(response);
    currentUrl = nextUrl;
  }

  throw smokeFailure("redirect-limit-exceeded");
}

async function cancelResponseBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // Cancellation is best-effort cleanup; the fixed policy error remains the
    // only externally visible category.
  }
}

export async function readBoundedResponseBody(response, { maxBytes }) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    await cancelResponseBody(response);
    throw smokeFailure("response-limit-invalid");
  }

  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^(?:0|[1-9]\d*)$/u.test(declaredLength)) {
      await cancelResponseBody(response);
      throw smokeFailure("response-content-length-invalid");
    }
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength)) {
      await cancelResponseBody(response);
      throw smokeFailure("response-content-length-invalid");
    }
    if (parsedLength > maxBytes) {
      await cancelResponseBody(response);
      throw smokeFailure("response-body-too-large");
    }
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // Preserve only the fixed bounded-body category.
        }
        throw smokeFailure("response-body-too-large");
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes).toString("utf8");
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

export async function timedFetch(
  url,
  { expectedOrigin, fetchImpl = fetch, maxResponseBytes, timeoutMs, ...requestOptions }
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchWithOriginLock(
      url,
      { ...requestOptions, signal: controller.signal },
      { expectedOrigin, fetchImpl }
    );
    const text = await readBoundedResponseBody(response, { maxBytes: maxResponseBytes });
    if (!response.ok) {
      return {
        elapsedMs: Date.now() - startedAt,
        errorCode: "http-error",
        headers: response.headers,
        ok: false,
        status: response.status,
        url: response.url || url
      };
    }
    return {
      elapsedMs: Date.now() - startedAt,
      headers: response.headers,
      ok: true,
      status: response.status,
      text,
      url: response.url || url
    };
  } catch (error) {
    const errorCode = controller.signal.aborted
      ? "request-timeout"
      : error instanceof ClassroomSmokeError
        ? error.code
        : "request-failed";
    return {
      elapsedMs: Date.now() - startedAt,
      errorCode,
      headers: new Headers(),
      ok: false,
      status: 0,
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
    throw smokeFailure("session-continuity-invalid");
  }
  return user.id;
}

export async function validateSessionContinuity(session, target, config, env = process.env, runtime = {}) {
  const response = await timedFetch(`${target.baseUrl}/api/auth/session-state?includeLessonEntry=false`, {
    expectedOrigin: target.expectedOrigin,
    fetchImpl: runtime.fetchImpl ?? fetch,
    headers: { Cookie: session.cookie, ...protectionHeaders(env) },
    maxResponseBytes: responseBodyLimits.session,
    timeoutMs: config.timeoutMs
  });
  if (!response.ok) throw smokeFailure("session-continuity-unavailable");
  const actualUserId = authenticatedUserId(parseJson(response.text));
  if (session.expectedUserId && actualUserId !== session.expectedUserId) {
    throw smokeFailure("session-continuity-mismatch");
  }
  return actualUserId;
}

async function authenticate(target, config, env = process.env, runtime = {}) {
  const authentication = readAuthenticationInput(env);
  if (authentication.kind === "cookie") {
    const expectedUserId = await validateSessionContinuity(
      { cookie: authentication.cookie, expectedUserId: null },
      target,
      config,
      env,
      runtime
    );
    return {
      auth: redactedAuthSummary("cookie", 0),
      cookie: authentication.cookie,
      continuityChecks: 1,
      expectedUserId,
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
    fetchImpl: runtime.fetchImpl ?? fetch,
    headers: { "Content-Type": "application/json", ...protectionHeaders(env) },
    maxResponseBytes: responseBodyLimits.login,
    method: "POST",
    timeoutMs: config.timeoutMs
  });
  if (response.status === 429) throw smokeFailure("login-rate-limited");
  if (!response.ok) throw smokeFailure("login-failed");

  const cookie = cookieHeaderFromSetCookie(response.headers);
  if (!cookie) throw smokeFailure("login-cookie-missing");
  const loginUserId = authenticatedUserId(parseJson(response.text));
  await validateSessionContinuity(
    { cookie, expectedUserId: loginUserId },
    target,
    config,
    env,
    runtime
  );
  return {
    auth: redactedAuthSummary("credentials", 1),
    cookie,
    continuityChecks: 1,
    expectedUserId: loginUserId,
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

async function discoverWorkload(session, target, config, env = process.env, runtime = {}) {
  const headers = buildStudentHeaders(session, env);
  const curriculumTrack = env.CLASSROOM_LOAD_CURRICULUM_TRACK ?? "US_CA_MATH";
  const [questionsResponse, lessonResponse] = await Promise.all([
    timedFetch(
      `${target.baseUrl}/api/questions?grade=${encodeURIComponent(config.grade)}&curriculumTrack=${encodeURIComponent(curriculumTrack)}`,
      {
        expectedOrigin: target.expectedOrigin,
        fetchImpl: runtime.fetchImpl ?? fetch,
        headers,
        maxResponseBytes: responseBodyLimits.questionBank,
        timeoutMs: config.timeoutMs
      }
    ),
    timedFetch(`${target.baseUrl}/api/lesson-entry?grade=${encodeURIComponent(config.grade)}`, {
      expectedOrigin: target.expectedOrigin,
      fetchImpl: runtime.fetchImpl ?? fetch,
      headers,
      maxResponseBytes: responseBodyLimits.lessonEntry,
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

async function runClassRound(sessions, workload, target, config, round, env = process.env, runtime = {}) {
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
          fetchImpl: runtime.fetchImpl ?? fetch,
          headers: { "Content-Type": "application/json", ...buildStudentHeaders(session, env) },
          maxResponseBytes: responseBodyLimits.write,
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
        fetchImpl: runtime.fetchImpl ?? fetch,
        headers: { "Content-Type": "application/json", ...buildStudentHeaders(session, env) },
        maxResponseBytes: responseBodyLimits.write,
        method: "POST",
        timeoutMs: config.timeoutMs
      })
    },
    {
      endpoint: "dashboard",
      request: (session) => timedFetch(`${target.baseUrl}/api/dashboard?grade=${encodeURIComponent(config.grade)}`, {
        expectedOrigin: target.expectedOrigin,
        fetchImpl: runtime.fetchImpl ?? fetch,
        headers: buildStudentHeaders(session, env),
        maxResponseBytes: responseBodyLimits.dashboard,
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

function exactMeasuredResults(results, config) {
  if (!Array.isArray(results) || results.length !== requiredMeasuredEndpoints.length) {
    throw smokeFailure("report-topology-invalid");
  }
  const byName = new Map();
  for (const result of results) {
    if (!requiredMeasuredEndpoints.includes(result?.name) || byName.has(result.name)) {
      throw smokeFailure("report-topology-invalid");
    }
    byName.set(result.name, result);
  }
  const expectedRequests = config.seatConcurrency * config.rounds;
  if (!Number.isSafeInteger(expectedRequests) || expectedRequests < 1) {
    throw smokeFailure("report-topology-invalid");
  }
  const ordered = requiredMeasuredEndpoints.map((name) => byName.get(name));
  if (ordered.some((result) => !result || result.requests !== expectedRequests)) {
    throw smokeFailure("report-topology-invalid");
  }
  return { expectedRequests, ordered };
}

export function buildRunReport({
  auth,
  config,
  continuity,
  discovery,
  generatedAt,
  loginDurations,
  results,
  target
}) {
  if (auth?.distinctIdentities !== 1 || continuity?.status !== "pass" || discovery?.status !== "pass") {
    throw smokeFailure("report-topology-invalid");
  }
  const measured = exactMeasuredResults(results, config);
  return {
    auth,
    baseUrl: target.baseUrl,
    continuity,
    discovery,
    evidenceMode: target.evidenceMode,
    generatedAt,
    grade: config.grade,
    login: {
      count: loginDurations.length,
      maxMs: loginDurations.length ? Math.max(...loginDurations) : null,
      p50Ms: percentile(loginDurations, 50),
      p95Ms: percentile(loginDurations, 95)
    },
    loadShape: "single-identity-seat-fanout",
    ok: measured.ordered.every((result) => result.ok),
    readThresholdMs: config.readThresholdMs,
    results: measured.ordered,
    rounds: config.rounds,
    seatConcurrency: config.seatConcurrency,
    stagingEvidence: target.stagingEvidence,
    totalRequests: measured.expectedRequests * requiredMeasuredEndpoints.length,
    writeThresholdMs: config.writeThresholdMs
  };
}

async function lstatOrNull(targetPath) {
  try {
    return await fs.lstat(targetPath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw smokeFailure("artifact-parent-unsafe");
  }
}

async function requireRealDirectory(targetPath, { create = false, exactMode = null } = {}) {
  let targetStat = await lstatOrNull(targetPath);
  if (!targetStat && create) {
    try {
      await fs.mkdir(targetPath, { mode: exactMode ?? 0o700 });
    } catch (error) {
      if (error?.code !== "EEXIST") throw smokeFailure("artifact-parent-unsafe");
    }
    targetStat = await lstatOrNull(targetPath);
  }
  if (!targetStat?.isDirectory() || targetStat.isSymbolicLink()) {
    throw smokeFailure("artifact-parent-unsafe");
  }
  let realPath;
  try {
    realPath = await fs.realpath(targetPath);
  } catch {
    throw smokeFailure("artifact-parent-unsafe");
  }
  if (realPath !== path.resolve(targetPath)) throw smokeFailure("artifact-parent-unsafe");

  if (exactMode !== null) {
    try {
      await fs.chmod(targetPath, exactMode);
      targetStat = await fs.lstat(targetPath);
    } catch {
      throw smokeFailure("artifact-parent-unsafe");
    }
    if (!targetStat.isDirectory() || targetStat.isSymbolicLink() || (targetStat.mode & 0o777) !== exactMode) {
      throw smokeFailure("artifact-parent-unsafe");
    }
  }
}

export async function writeSafeReport(report, { maxBytes = maxReportBytes, rootDir = repoRoot } = {}) {
  let serialized;
  try {
    serialized = `${JSON.stringify(report, null, 2)}\n`;
  } catch {
    throw smokeFailure("artifact-report-invalid");
  }
  const payload = Buffer.from(serialized, "utf8");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || payload.byteLength > maxBytes) {
    throw smokeFailure("artifact-report-too-large");
  }

  const exactRoot = path.resolve(rootDir);
  const localTmpDir = path.join(exactRoot, ".tmp");
  const exactArtifactDir = path.join(localTmpDir, "classroom-load-smoke");
  const finalPath = path.join(exactArtifactDir, "last-run.json");
  await requireRealDirectory(exactRoot);
  await requireRealDirectory(localTmpDir, { create: true });
  await requireRealDirectory(exactArtifactDir, { create: true, exactMode: 0o700 });

  const tempPath = path.join(exactArtifactDir, `.last-run.${process.pid}.${randomUUID()}.tmp`);
  let tempHandle = null;
  let renamed = false;
  try {
    tempHandle = await fs.open(
      tempPath,
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW | fsConstants.O_WRONLY,
      0o600
    );
    await tempHandle.chmod(0o600);
    const tempStat = await tempHandle.stat();
    if (!tempStat.isFile() || tempStat.nlink !== 1 || (tempStat.mode & 0o777) !== 0o600) {
      throw smokeFailure("artifact-temp-unsafe");
    }
    await tempHandle.writeFile(payload);
    await tempHandle.sync();
    await tempHandle.close();
    tempHandle = null;
    await fs.rename(tempPath, finalPath);
    renamed = true;

    const finalStat = await fs.lstat(finalPath);
    if (
      !finalStat.isFile()
      || finalStat.isSymbolicLink()
      || finalStat.nlink !== 1
      || (finalStat.mode & 0o777) !== 0o600
    ) {
      throw smokeFailure("artifact-final-unsafe");
    }
    return finalPath;
  } catch (error) {
    try {
      await tempHandle?.close();
    } catch {
      // Keep the fixed artifact category below.
    }
    if (!renamed) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // The path may never have been created.
      }
    }
    if (error instanceof ClassroomSmokeError) throw error;
    throw smokeFailure("artifact-write-failed");
  }
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
    `Classroom load smoke: ${report.ok ? "PASS" : "FAIL"} mode=${report.evidenceMode} target=${report.baseUrl} grade=${report.grade} seatConcurrency=${report.seatConcurrency} loadShape=${report.loadShape} rounds=${report.rounds} requests=${report.totalRequests}`
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

export async function runSmoke(args, env = process.env, runtime = {}) {
  const target = resolveExecutionTarget(args, env);
  const config = buildSmokeConfig(args, env);
  const authentication = await authenticate(target, config, env, runtime);
  const session = {
    cookie: authentication.cookie,
    expectedUserId: authentication.expectedUserId
  };
  const sessions = Array.from(
    { length: config.seatConcurrency },
    (_, index) => ({ ...session, seat: index + 1 })
  );
  const workload = await discoverWorkload(session, target, config, env, runtime);

  const measurements = [];
  let continuityChecks = authentication.continuityChecks;
  for (let round = 0; round < config.rounds; round += 1) {
    await validateSessionContinuity(session, target, config, env, runtime);
    continuityChecks += 1;
    measurements.push(...await runClassRound(sessions, workload, target, config, round, env, runtime));
  }
  const results = aggregateMeasurements(measurements, endpointBudgets(config));
  const report = buildRunReport({
    auth: authentication.auth,
    config,
    continuity: { checks: continuityChecks, status: "pass" },
    discovery: {
      lessonEntryResolved: true,
      questionPoolSize: workload.questions.length,
      status: "pass"
    },
    generatedAt: new Date().toISOString(),
    loginDurations: authentication.loginDurations,
    results,
    target
  });
  const reportWriter = runtime.writeReport ?? ((nextReport) => writeSafeReport(nextReport));
  await reportWriter(report);
  if (runtime.printReport !== false) printReport(report, args.json);
  if (!report.ok) process.exitCode = 1;
  return report;
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
    const errorCode = error instanceof ClassroomSmokeError ? error.code : "configuration-error";
    console.error(`Classroom load smoke failed: ${errorCode}`);
    process.exitCode = 1;
  });
}
