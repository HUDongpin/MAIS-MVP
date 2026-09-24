#!/usr/bin/env node
// Manual staging/preview-only classroom concurrency smoke.
//
// This tool writes practice attempts and lesson progress. It deliberately has
// no default URL, unconditionally rejects known production hosts, and is not
// invoked by any deployment or production-certification path.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVED_VERCEL_PROJECT_ID,
  APPROVED_VERCEL_PROJECT_NAME,
  APPROVED_VERCEL_TEAM_ID,
  APPROVED_VERCEL_TEAM_SLUG,
  isValidVercelToken,
  validateVercelDeploymentIdentity,
} from "./vercel-provider-evidence.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_ARTIFACT_DIR = path.join(REPO_ROOT, ".tmp", "classroom-load-smoke");
const DEFAULT_MAX_RESPONSE_BODY_BYTES = 1024 * 1024;
const MAX_ARTIFACT_FINGERPRINT_BYTES = 8 * 1024 * 1024;
const MAX_PREVIEW_EVIDENCE_BYTES = 1024 * 1024;
const MAX_PREVIEW_PROVIDER_BODY_BYTES = 1024 * 1024;
const PREVIEW_PROVIDER_TIMEOUT_MS = 10_000;
const CANDIDATE_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]+$/u;
const IMMUTABLE_VERCEL_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/u;
const PRODUCTION_HOSTS = new Set(["mais.ac", "www.mais.ac", "mais.hk", "www.mais.hk"]);
const DEMO_STUDENT_USERNAMES = ["Student Shirleen", "Student Jon"];
const DEFERRED_USERNAME_OPTION = Symbol("classroom-load-deferred-username-option");
const RESOLVED_CLASSROOM_CREDENTIALS = Symbol("classroom-load-resolved-credentials");

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
  let deferredUsernameOptionIndex = null;
  const args = {
    artifactDir: env.CLASSROOM_LOAD_ARTIFACT_DIR || "",
    baseUrl: env.CLASSROOM_LOAD_BASE_URL || "",
    cookie: "",
    grade: env.CLASSROOM_LOAD_GRADE || "P1",
    json: false,
    password: "",
    rounds: boundedInteger(env.CLASSROOM_LOAD_ROUNDS, 3, 1, 50, "CLASSROOM_LOAD_ROUNDS"),
    selfTest: false,
    students: boundedInteger(env.CLASSROOM_LOAD_STUDENTS, 15, 1, 200, "CLASSROOM_LOAD_STUDENTS"),
    username: ""
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
      // Retain only the option location here. Its potentially identifying value
      // is neither copied nor read until Preview authority is established.
      deferredUsernameOptionIndex = index;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${option}`);
    }
  }

  Object.defineProperty(args, DEFERRED_USERNAME_OPTION, {
    enumerable: false,
    value: deferredUsernameOptionIndex === null
      ? null
      : { argv, optionIndex: deferredUsernameOptionIndex },
  });

  return args;
}

function resolveClassroomCredentials(args, env = process.env) {
  const alreadyResolved = args?.[RESOLVED_CLASSROOM_CREDENTIALS];
  if (alreadyResolved) return alreadyResolved;
  const deferredUsername = args?.[DEFERRED_USERNAME_OPTION];
  const resolved = {
    ...args,
    cookie: args?.cookie || env.CLASSROOM_LOAD_COOKIE || "",
    password: args?.password || env.CLASSROOM_LOAD_PASSWORD || "",
    username: deferredUsername
      ? requiredOptionValue(deferredUsername.argv, deferredUsername.optionIndex, "--username")
      : args?.username || env.CLASSROOM_LOAD_USERNAME || "",
  };
  Object.defineProperty(args, RESOLVED_CLASSROOM_CREDENTIALS, {
    enumerable: false,
    value: resolved,
  });
  Object.defineProperty(resolved, RESOLVED_CLASSROOM_CREDENTIALS, {
    enumerable: false,
    value: resolved,
  });
  return resolved;
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

async function readPreviewEvidenceFile(evidencePath) {
  if (
    typeof evidencePath !== "string" ||
    !evidencePath ||
    !path.isAbsolute(evidencePath) ||
    evidencePath.includes("\0") ||
    hasTraversalSegment(evidencePath)
  ) {
    throw new Error("Classroom Preview evidence file must be one absolute canonical path.");
  }
  const resolved = path.resolve(evidencePath);
  let pathnameStats;
  try {
    pathnameStats = await fs.lstat(resolved);
  } catch {
    throw new Error("Classroom Preview evidence file is unavailable.");
  }
  if (
    !pathnameStats.isFile() ||
    pathnameStats.nlink !== 1 ||
    (pathnameStats.mode & 0o022) !== 0 ||
    !Number.isSafeInteger(pathnameStats.size) ||
    pathnameStats.size < 1 ||
    pathnameStats.size > MAX_PREVIEW_EVIDENCE_BYTES
  ) {
    throw new Error("Classroom Preview evidence file is not a safe regular file.");
  }
  const canonical = await fs.realpath(resolved);
  if (canonical !== resolved || fsConstants.O_NOFOLLOW === undefined) {
    throw new Error("Classroom Preview evidence file must not use symlinks.");
  }

  let handle;
  try {
    handle = await fs.open(resolved, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const openedStats = await handle.stat();
    if (
      !sameNode(pathnameStats, openedStats) ||
      !openedStats.isFile() ||
      openedStats.nlink !== 1 ||
      (openedStats.mode & 0o022) !== 0 ||
      openedStats.size !== pathnameStats.size ||
      openedStats.mtimeMs !== pathnameStats.mtimeMs ||
      openedStats.ctimeMs !== pathnameStats.ctimeMs
    ) {
      throw new Error("Classroom Preview evidence file changed while opening.");
    }
    const bytes = Buffer.alloc(openedStats.size);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, null);
      if (!bytesRead) throw new Error("Classroom Preview evidence file changed while reading.");
      offset += bytesRead;
    }
    const afterRead = await handle.stat();
    if (
      !sameNode(openedStats, afterRead) ||
      afterRead.size !== offset ||
      afterRead.mtimeMs !== openedStats.mtimeMs ||
      afterRead.ctimeMs !== openedStats.ctimeMs
    ) {
      throw new Error("Classroom Preview evidence file changed while reading.");
    }
    return bytes.toString("utf8");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Classroom Preview evidence")) throw error;
    throw new Error("Classroom Preview evidence file could not be read safely.");
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

export async function loadPreviewBinding(baseUrl, env = process.env, dependencies = {}) {
  const fail = (detail = "identity") => {
    throw new Error(`Classroom Preview evidence failed provider-verified ${detail} binding.`);
  };
  const immutableUrl = normalizeExactOrigin(baseUrl, "Classroom load base URL");
  const hostname = new URL(immutableUrl).hostname;
  if (!IMMUTABLE_VERCEL_HOST_PATTERN.test(hostname)) fail("immutable URL");

  const expectedCandidateSha = String(env.CLASSROOM_LOAD_EXPECTED_CANDIDATE_SHA ?? "").trim();
  if (!CANDIDATE_SHA_PATTERN.test(expectedCandidateSha)) fail("candidate SHA");
  const serialized = await readPreviewEvidenceFile(env.CLASSROOM_LOAD_PREVIEW_EVIDENCE_FILE);
  let record;
  try {
    record = JSON.parse(serialized);
  } catch {
    fail("identity");
  }
  const deploymentEvidence = record?.deploymentEvidence;
  const providerEvidence = record?.providerEvidence;
  const sourcePackageEvidence = providerEvidence?.sourcePackageEvidence;
  const stagingPackage = record?.stagingPackage;
  const deploymentId = String(record?.deploymentId ?? "");
  let recordUrl;
  let inspectedUrl;
  let providerUrl;
  try {
    recordUrl = normalizeExactOrigin(record?.deploymentUrl, "Classroom Preview deployment URL");
    inspectedUrl = normalizeExactOrigin(deploymentEvidence?.deploymentUrl, "Classroom Preview inspected URL");
    providerUrl = normalizeExactOrigin(providerEvidence?.deploymentUrl, "Classroom Preview provider URL");
  } catch {
    fail("immutable URL");
  }
  if (
    record?.candidateSha !== expectedCandidateSha ||
    deploymentEvidence?.candidateSha !== expectedCandidateSha
  ) {
    fail("candidate SHA");
  }

  if (
    record?.dryRun !== false ||
    record?.inspectVerified !== true ||
    record?.providerSourceVerified !== true ||
    record?.target !== "preview" ||
    record?.project !== APPROVED_VERCEL_PROJECT_NAME ||
    ![APPROVED_VERCEL_TEAM_ID, APPROVED_VERCEL_TEAM_SLUG].includes(record?.scope) ||
    !DEPLOYMENT_ID_PATTERN.test(deploymentId) ||
    recordUrl !== immutableUrl ||
    inspectedUrl !== immutableUrl ||
    providerUrl !== immutableUrl ||
    deploymentEvidence?.deploymentId !== deploymentId ||
    deploymentEvidence?.readyState !== "READY" ||
    deploymentEvidence?.target !== "preview" ||
    providerEvidence?.deploymentId !== deploymentId ||
    providerEvidence?.projectId !== APPROVED_VERCEL_PROJECT_ID ||
    providerEvidence?.projectName !== APPROVED_VERCEL_PROJECT_NAME ||
    providerEvidence?.teamId !== APPROVED_VERCEL_TEAM_ID ||
    providerEvidence?.teamSlug !== APPROVED_VERCEL_TEAM_SLUG ||
    providerEvidence?.target !== "preview" ||
    providerEvidence?.source !== "cli" ||
    providerEvidence?.sourceSha256Verified !== true ||
    providerEvidence?.fileModesVerified !== true ||
    !/^[0-9a-f]{64}$/u.test(String(providerEvidence?.sourceManifestRoot ?? "")) ||
    stagingPackage?.sourceKind !== "clean-head-tracked-regular-blobs" ||
    stagingPackage?.gitSourceVerified !== true ||
    stagingPackage?.candidateSha !== expectedCandidateSha ||
    stagingPackage?.objectFormat !== "sha1" ||
    stagingPackage?.sourceManifestAlgorithm !== "sha256-canonical-json-lines-v2" ||
    !/^[0-9a-f]{40}$/u.test(String(stagingPackage?.sourceTreeObject ?? "")) ||
    !/^[0-9a-f]{64}$/u.test(String(stagingPackage?.sourceManifestRoot ?? "")) ||
    stagingPackage?.manifest?.schemaVersion !== 2 ||
    stagingPackage?.manifest?.path !== "vercel-staging-manifest.json" ||
    !/^[0-9a-f]{40}$/u.test(String(stagingPackage?.manifest?.rawSha1 ?? "")) ||
    !/^[0-9a-f]{64}$/u.test(String(stagingPackage?.manifest?.sha256 ?? "")) ||
    stagingPackage?.excludedPolicy?.dataEase !== true ||
    stagingPackage?.excludedPolicy?.publicQuestionIllustrations !== true ||
    stagingPackage?.excludedPolicy?.localSecretsAndGeneratedOutputs !== true ||
    sourcePackageEvidence?.verified !== true ||
    sourcePackageEvidence?.candidateSha !== expectedCandidateSha ||
    sourcePackageEvidence?.contentSha256Verified !== true ||
    sourcePackageEvidence?.fileModesVerified !== true ||
    sourcePackageEvidence?.sourceTreeObject !== stagingPackage?.sourceTreeObject ||
    sourcePackageEvidence?.sourceManifestRoot !== stagingPackage?.sourceManifestRoot ||
    sourcePackageEvidence?.manifestRawSha1 !== stagingPackage?.manifest?.rawSha1 ||
    sourcePackageEvidence?.manifestSha256 !== stagingPackage?.manifest?.sha256 ||
    sourcePackageEvidence?.fileCount !== stagingPackage?.fileCount ||
    sourcePackageEvidence?.totalBytes !== stagingPackage?.totalBytes ||
    providerEvidence?.sourceManifestRoot !== stagingPackage?.sourceManifestRoot
  ) {
    fail("identity");
  }

  const token = env.CLASSROOM_LOAD_VERCEL_TOKEN;
  if (!isValidVercelToken(token)) {
    throw new Error("Classroom Preview provider revalidation credential is unavailable; details redacted.");
  }
  const providerFetch = dependencies.fetchImpl ?? globalThis.fetch;
  const managementUrl = new URL(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(deploymentId)}`,
  );
  managementUrl.searchParams.set("teamId", APPROVED_VERCEL_TEAM_ID);
  const providerResponse = await timedFetch(
    managementUrl.href,
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "user-agent": "MAIS-Classroom-Preview-Revalidation/1.0",
      },
      maxBodyBytes: MAX_PREVIEW_PROVIDER_BODY_BYTES,
      method: "GET",
      redirect: "error",
      timeoutMs: PREVIEW_PROVIDER_TIMEOUT_MS,
    },
    providerFetch,
  );
  if (
    !providerResponse.ok ||
    providerResponse.status !== 200 ||
    providerResponse.finalUrl !== managementUrl.href
  ) {
    throw new Error("Classroom Preview provider revalidation failed; management API details redacted.");
  }
  const providerPayload = parseJson(providerResponse.text);
  let authoritativeIdentity;
  try {
    authoritativeIdentity = validateVercelDeploymentIdentity({
      candidateSha: expectedCandidateSha,
      deploymentId,
      deploymentUrl: immutableUrl,
      payload: providerPayload,
      sourcePackageEvidence,
      target: "preview",
    });
  } catch {
    throw new Error("Classroom Preview provider revalidation failed; provider evidence details redacted.");
  }
  if (
    authoritativeIdentity.deploymentId !== deploymentId ||
    authoritativeIdentity.deploymentUrl !== immutableUrl ||
    authoritativeIdentity.projectId !== APPROVED_VERCEL_PROJECT_ID ||
    authoritativeIdentity.teamId !== APPROVED_VERCEL_TEAM_ID ||
    authoritativeIdentity.target !== "preview" ||
    authoritativeIdentity.source !== "cli" ||
    authoritativeIdentity.sourceManifestRoot !== stagingPackage.sourceManifestRoot ||
    authoritativeIdentity.sourceSha256Verified !== true ||
    authoritativeIdentity.fileModesVerified !== true
  ) {
    throw new Error("Classroom Preview provider revalidation failed; identity details redacted.");
  }

  return {
    candidateSha: expectedCandidateSha,
    deploymentId,
    environment: "preview",
    immutableUrl,
    projectId: APPROVED_VERCEL_PROJECT_ID,
    projectName: APPROVED_VERCEL_PROJECT_NAME,
    teamId: APPROVED_VERCEL_TEAM_ID,
    teamSlug: APPROVED_VERCEL_TEAM_SLUG,
  };
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

export function classroomSensitiveValues(
  args = {},
  env = process.env,
  { includeClassroomCredentials = true } = {},
) {
  const resolved = args?.[RESOLVED_CLASSROOM_CREDENTIALS];
  const values = [env.CLASSROOM_LOAD_VERCEL_TOKEN];
  if (resolved) values.push(resolved.cookie, resolved.password, resolved.username);
  if (includeClassroomCredentials) {
    values.push(
      args?.cookie,
      args?.password,
      args?.username,
      env.CLASSROOM_LOAD_COOKIE,
      env.CLASSROOM_LOAD_DEMO_PASSWORD,
      env.DASHBOARD_SMOKE_PASSWORD,
      env.CLASSROOM_LOAD_PASSWORD,
      env.CLASSROOM_LOAD_USERNAME,
      env.CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET,
      env.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET,
      env.VERCEL_AUTOMATION_BYPASS_SECRET,
    );
  }
  return values.filter((candidate) => typeof candidate === "string" && candidate.length > 0);
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
  const curriculumTrack = env.CLASSROOM_LOAD_CURRICULUM_TRACK?.trim();
  const response = await timedFetch(
    `${config.baseUrl}/api/auth/login`,
    {
      body: JSON.stringify({
        grade: config.grade,
        language: env.CLASSROOM_LOAD_LANGUAGE || "en",
        password: identity.password,
        username: identity.username,
        ...(curriculumTrack ? { curriculumTrack } : {})
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
  const curriculumTrack = env.CLASSROOM_LOAD_CURRICULUM_TRACK?.trim() || "";
  const headers = authHeaders(session.cookie, session.userId, env);
  const questionsUrl = new URL(`${session.baseUrl}/api/questions`);
  questionsUrl.searchParams.set("grade", config.grade);
  if (curriculumTrack) questionsUrl.searchParams.set("curriculumTrack", curriculumTrack);
  const lessonUrl = new URL(`${session.baseUrl}/api/lesson-entry`);
  lessonUrl.searchParams.set("grade", config.grade);
  lessonUrl.searchParams.set("expectedUserId", session.userId);
  const [questionsResponse, lessonResponse] = await Promise.all([
    timedFetch(
      questionsUrl.toString(),
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

function attemptPersistenceAcknowledged(response) {
  return parseJson(response.text)?.persisted === true;
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

  // Writes never follow redirects. A 3xx fails and throws without following
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
  measurements.push({
    endpoint: "attempts",
    round,
    seat: session.seat,
    ...summarize(attempt),
    // HTTP 200 can contain grading feedback after a failed row transaction.
    // The classroom write gate succeeds only after the API confirms persistence.
    ok: attempt.ok && attemptPersistenceAcknowledged(attempt)
  });

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

async function safeResultFingerprint(artifactPath, hooks = {}) {
  const stats = await safeResultTarget(artifactPath);
  if (!stats) return null;
  await hooks.beforeFingerprintRead?.(artifactPath);
  if (fsConstants.O_NOFOLLOW === undefined) {
    throw new Error("Artifact result fingerprint requires no-follow filesystem support.");
  }
  if (!Number.isSafeInteger(stats.size) || stats.size > MAX_ARTIFACT_FINGERPRINT_BYTES) {
    throw new Error("Artifact result is too large to fingerprint safely.");
  }

  let handle;
  try {
    handle = await fs.open(artifactPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const openedStats = await handle.stat();
    if (
      !sameNode(stats, openedStats) ||
      openedStats.nlink !== 1 ||
      (openedStats.mode & 0o170000) !== 0o100000 ||
      (openedStats.mode & 0o077) !== 0 ||
      (openedStats.mode & 0o777) !== 0o600 ||
      openedStats.size !== stats.size ||
      openedStats.mtimeMs !== stats.mtimeMs ||
      openedStats.ctimeMs !== stats.ctimeMs
    ) {
      throw new Error("Artifact result changed while opening its fingerprint.");
    }

    const bytes = Buffer.alloc(openedStats.size);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, null);
      if (!bytesRead) throw new Error("Artifact result changed while reading its fingerprint.");
      offset += bytesRead;
    }
    const afterRead = await handle.stat();
    if (
      !sameNode(openedStats, afterRead) ||
      afterRead.nlink !== 1 ||
      afterRead.size !== openedStats.size ||
      afterRead.mtimeMs !== openedStats.mtimeMs ||
      afterRead.ctimeMs !== openedStats.ctimeMs
    ) {
      throw new Error("Artifact result changed while fingerprinting.");
    }
    return {
      ctimeMs: afterRead.ctimeMs,
      dev: afterRead.dev,
      digest: createHash("sha256").update(bytes).digest("hex"),
      ino: afterRead.ino,
      mode: afterRead.mode,
      mtimeMs: afterRead.mtimeMs,
      size: afterRead.size
    };
  } catch (error) {
    if (error?.message?.startsWith("Artifact result ")) throw error;
    throw new Error("Artifact result could not be safely fingerprinted.");
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

function sameFingerprint(left, right) {
  if (!left || !right) return left === right;
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mode === right.mode &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs &&
    left.digest === right.digest
  );
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
  let lockOwned = false;
  let lockHandle;
  let lockStats;
  let lockFdStats;
  let temporaryPath;
  let temporaryHandle;
  let temporaryOpenedExclusively = false;
  let temporaryStats;
  let temporaryFingerprint;
  let directoryHandle;
  let directoryFdStats;

  const assertDirectoryStable = async (phase) => {
    const current = await safeExistingDirectory(targetDirectory, "Artifact directory");
    const currentFdStats = directoryHandle
      ? await directoryHandle.stat().catch(() => null)
      : null;
    if (
      !directoryFdStats ||
      !currentFdStats?.isDirectory() ||
      !sameNode(directoryStats.stats, current.stats) ||
      !sameNode(directoryFdStats, currentFdStats) ||
      !sameNode(currentFdStats, current.stats)
    ) {
      throw new Error(`Artifact directory changed during ${phase}.`);
    }
    return current.stats;
  };

  const assertLockStable = async (phase) => {
    const currentPathStats = await fs.lstat(lockPath).catch(() => null);
    const currentFdStats = lockHandle
      ? await lockHandle.stat().catch(() => null)
      : null;
    const isSafeLockDirectory = (stats) => (
      stats?.isDirectory() === true &&
      (stats.mode & 0o170000) === 0o040000 &&
      (stats.mode & 0o777) === 0o700
    );
    const sameLockSnapshot = (left, right) => (
      sameNode(left, right) &&
      left.mode === right.mode &&
      left.nlink === right.nlink &&
      left.mtimeMs === right.mtimeMs &&
      left.ctimeMs === right.ctimeMs
    );
    if (
      !lockStats ||
      !lockFdStats ||
      !isSafeLockDirectory(currentPathStats) ||
      !isSafeLockDirectory(currentFdStats) ||
      !sameLockSnapshot(lockStats, currentPathStats) ||
      !sameLockSnapshot(lockFdStats, currentFdStats) ||
      !sameLockSnapshot(currentFdStats, currentPathStats)
    ) {
      throw new Error(`Artifact writer lock changed during ${phase}.`);
    }
    return currentPathStats;
  };

  try {
    const directoryFlags = fsConstants.O_RDONLY |
      (fsConstants.O_DIRECTORY ?? 0) |
      (fsConstants.O_NOFOLLOW ?? 0);
    directoryHandle = await fs.open(targetDirectory, directoryFlags);
    directoryFdStats = await directoryHandle.stat();
    if (!directoryFdStats.isDirectory() || !sameNode(directoryStats.stats, directoryFdStats)) {
      throw new Error("Artifact directory changed while opening its durability handle.");
    }
    try {
      await fs.mkdir(lockPath, { mode: 0o700 });
    } catch (error) {
      if (error?.code === "EEXIST") throw new Error("Artifact result writer race detected; refusing concurrent output.");
      throw error;
    }
    lockOwned = true;
    lockStats = await fs.lstat(lockPath);
    if (
      typeof fsConstants.O_DIRECTORY !== "number" ||
      typeof fsConstants.O_NOFOLLOW !== "number"
    ) {
      throw new Error("Artifact writer lock requires no-follow directory handles.");
    }
    const lockFlags = fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW;
    lockHandle = await fs.open(lockPath, lockFlags);
    lockFdStats = await lockHandle.stat();
    const openedLockPathStats = await fs.lstat(lockPath).catch(() => null);
    if (
      !openedLockPathStats ||
      !lockStats.isDirectory() ||
      !lockFdStats.isDirectory() ||
      !openedLockPathStats.isDirectory() ||
      (lockStats.mode & 0o777) !== 0o700 ||
      (lockFdStats.mode & 0o777) !== 0o700 ||
      (openedLockPathStats.mode & 0o777) !== 0o700 ||
      !sameNode(lockStats, lockFdStats) ||
      !sameNode(lockFdStats, openedLockPathStats)
    ) {
      throw new Error("Artifact writer lock changed while opening its no-follow directory handle.");
    }
    lockStats = openedLockPathStats;
    lockFdStats = await lockHandle.stat();
    await hooks.afterLock?.({ artifactPath, lockHandle, lockPath, targetDirectory });
    await assertDirectoryStable("lock creation");
    await assertLockStable("lock creation");
    const existingFingerprint = await safeResultFingerprint(artifactPath, hooks);
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    temporaryPath = path.join(targetDirectory, `.last-run.json.${process.pid}.${randomUUID()}.tmp`);
    const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | (fsConstants.O_NOFOLLOW ?? 0);
    temporaryHandle = await fs.open(temporaryPath, flags, 0o600);
    temporaryOpenedExclusively = true;
    temporaryStats = await temporaryHandle.stat();
    await temporaryHandle.chmod(0o600);
    await temporaryHandle.writeFile(serialized, "utf8");
    await temporaryHandle.sync();
    const writtenTemporaryStats = await temporaryHandle.stat();
    if (!sameNode(temporaryStats, writtenTemporaryStats)) {
      throw new Error("Temporary artifact changed while writing through its retained handle.");
    }
    temporaryFingerprint = await safeResultFingerprint(temporaryPath);
    const fingerprintedTemporaryFdStats = await temporaryHandle.stat();
    if (
      !temporaryFingerprint ||
      !fingerprintedTemporaryFdStats.isFile() ||
      !sameNode(temporaryStats, temporaryFingerprint) ||
      !sameNode(temporaryStats, fingerprintedTemporaryFdStats) ||
      !sameNode(temporaryFingerprint, fingerprintedTemporaryFdStats)
    ) {
      throw new Error("Temporary artifact changed while binding its pathname fingerprint to the retained handle.");
    }
    await assertDirectoryStable("report write");
    await assertLockStable("report write");
    await hooks.beforeCommit?.({ artifactPath, targetDirectory, temporaryPath });
    await assertDirectoryStable("commit admission");
    await assertLockStable("commit admission");
    const currentExistingFingerprint = await safeResultFingerprint(artifactPath, hooks);
    if (
      !sameFingerprint(existingFingerprint, currentExistingFingerprint)
    ) {
      throw new Error("Artifact result changed during report write.");
    }

    await hooks.beforeRename?.({ artifactPath, targetDirectory, temporaryPath });
    await assertDirectoryStable("final commit");
    await assertLockStable("final commit");
    const finalExistingFingerprint = await safeResultFingerprint(artifactPath, hooks);
    if (!sameFingerprint(existingFingerprint, finalExistingFingerprint)) {
      throw new Error("Artifact result changed during final commit admission.");
    }

    await assertDirectoryStable("temporary commit verification");
    const currentTemporaryFingerprint = await safeResultFingerprint(temporaryPath);
    if (!sameFingerprint(temporaryFingerprint, currentTemporaryFingerprint)) {
      throw new Error("Temporary artifact changed before final commit.");
    }

    // Node's pathname API has no portable rename-no-replace primitive. The
    // lock plus fingerprints fail closed at every defined checkpoint and the
    // final rename publishes a complete file atomically, but a non-cooperative
    // writer can still win the uncloseable validation-to-rename window.
    await fs.rename(temporaryPath, artifactPath);
    temporaryPath = undefined;
    try {
      await directoryHandle.sync();
    } catch {
      throw new Error("Artifact directory fsync failure after atomic replacement.");
    }
    await assertDirectoryStable("post-commit verification");
    await assertLockStable("post-commit verification");
    const finalStats = await safeResultTarget(artifactPath);
    if (!finalStats || !sameNode(temporaryStats, finalStats)) {
      throw new Error("Artifact result changed during atomic replacement.");
    }
    return artifactPath;
  } finally {
    // Cleanup is identity-checked best effort only: pathname lstat followed by
    // unlink/rmdir has an unavoidable entry-level TOCTOU window. On an
    // identity mismatch, retain the path and make no absolute ownership claim.
    let directoryStillOwned = false;
    try {
      await assertDirectoryStable("transaction cleanup");
      directoryStillOwned = true;
    } catch {}

    if (temporaryPath && temporaryOpenedExclusively && directoryStillOwned && temporaryHandle) {
      try {
        await assertDirectoryStable("temporary cleanup");
        const currentTemporaryFdStats = await temporaryHandle.stat();
        const currentTemporaryStats = await fs.lstat(temporaryPath);
        await assertDirectoryStable("temporary cleanup");
        if (
          currentTemporaryFdStats.isFile() &&
          currentTemporaryStats.isFile() &&
          sameNode(currentTemporaryFdStats, currentTemporaryStats) &&
          (!temporaryStats || sameNode(temporaryStats, currentTemporaryFdStats))
        ) {
          await fs.unlink(temporaryPath);
        }
      } catch {}
    }
    if (temporaryHandle) {
      const ownedTemporaryHandle = temporaryHandle;
      temporaryHandle = undefined;
      await ownedTemporaryHandle.close().catch(() => {});
    }
    if (lockOwned && directoryStillOwned && lockHandle) {
      try {
        const currentPathStats = await fs.lstat(lockPath);
        const currentFdStats = await lockHandle.stat();
        if (
          lockStats &&
          lockFdStats &&
          currentPathStats.isDirectory() &&
          currentFdStats.isDirectory() &&
          (currentPathStats.mode & 0o777) === 0o700 &&
          (currentFdStats.mode & 0o777) === 0o700 &&
          sameNode(lockStats, currentPathStats) &&
          sameNode(lockFdStats, currentFdStats) &&
          sameNode(currentFdStats, currentPathStats)
        ) {
          await fs.rmdir(lockPath);
        }
      } catch {}
    }
    if (lockHandle) {
      const ownedLockHandle = lockHandle;
      lockHandle = undefined;
      await ownedLockHandle.close().catch(() => {});
    }
    if (directoryHandle) await directoryHandle.close().catch(() => {});
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
  const resolvePreviewBinding = dependencies.loadPreviewBinding ?? loadPreviewBinding;
  const previewBinding = isLoopbackOrigin(config.baseUrl)
    ? null
    : await resolvePreviewBinding(config.baseUrl, env, {
      fetchImpl: dependencies.previewProviderFetch ?? globalThis.fetch,
    });
  const credentialArgs = resolveClassroomCredentials(args, env);
  let authMode;
  let distinctIdentities;
  let sessions;

  if (credentialArgs.cookie) {
    const resolved = await resolveCookie(credentialArgs.cookie, config, env);
    assertTargetIsNotProduction(resolved.baseUrl);
    authMode = "cookie";
    distinctIdentities = 1;
    sessions = Array.from({ length: config.students }, (_, index) => ({
      ...resolved,
      seat: index + 1
    }));
  } else {
    const roster = classroomSmokeCredentials(credentialArgs, config.students, env);
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
    if (previewBinding && origin !== previewBinding.immutableUrl) {
      throw new Error("Classroom Preview binding resolved away from the provider-verified immutable deployment.");
    }
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
    previewBinding,
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

export async function runSmoke(args, dependencies = {}) {
  const { artifactPath, report } = await executeClassroomLoad(args, dependencies);
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
  if (!report.ok) {
    const setExitCode = dependencies.setExitCode ?? ((code) => { process.exitCode = code; });
    setExitCode(1);
  }
}

async function runSelfTest() {
  const selfTestPreviewBinding = async (immutableUrl) => ({
    candidateSha: "a".repeat(40),
    deploymentId: "dpl_ClassroomSelfTest123",
    environment: "preview",
    immutableUrl,
    projectId: APPROVED_VERCEL_PROJECT_ID,
    projectName: APPROVED_VERCEL_PROJECT_NAME,
    teamId: APPROVED_VERCEL_TEAM_ID,
    teamSlug: APPROVED_VERCEL_TEAM_SLUG,
  });
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
      loadPreviewBinding: selfTestPreviewBinding,
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
        loadPreviewBinding: selfTestPreviewBinding,
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
      loadPreviewBinding: selfTestPreviewBinding,
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
        loadPreviewBinding: selfTestPreviewBinding,
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

export async function runClassroomLoadCli(
  argv = process.argv.slice(2),
  env = process.env,
  dependencies = {},
) {
  let args;
  try {
    args = parseArgs(argv, env);
    if (args.selfTest) {
      await runSelfTest();
    } else {
      await runSmoke(args, { ...dependencies, env });
    }
    return true;
  } catch (error) {
    const secrets = classroomSensitiveValues(args, env, {
      includeClassroomCredentials: Boolean(args?.[RESOLVED_CLASSROOM_CREDENTIALS]),
    });
    const message = redactSensitiveText(error instanceof Error ? error.message : String(error), secrets);
    const printError = dependencies.printError ?? ((printable) => console.error(printable));
    const setExitCode = dependencies.setExitCode ?? ((code) => { process.exitCode = code; });
    printError(`classroom-load-smoke: ${message}`);
    setExitCode(1);
    return false;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH;
if (isMain) await runClassroomLoadCli();
