#!/usr/bin/env node

import { createHash, createHmac } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  canonicalVercelDeploymentOrigin,
  isValidVercelToken,
  readCurrentVercelProductionDeployment
} from "./vercel-provider-evidence.mjs";
import { verifyGithubCandidateChecks } from "./github-candidate-checks.mjs";

export const PARENT_PRODUCTION_ACCEPTANCE_ORIGINS = Object.freeze([
  "https://www.mais.ac",
  "https://www.mais.hk"
]);

const SYNTHETIC_TEACHER_INVITE_PATTERN = /^tinv_[0-9a-f]{32}$/u;
const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const SYNTHETIC_FAMILY_PATTERN = /^mais-synthetic-family-[a-z0-9][a-z0-9-]{2,63}$/u;
const SECRET_PATTERN = /^[^\s\u0000-\u001f\u007f-\u009f]{32,512}$/u;
const EXACT_SCHEMA_KEYS = Object.freeze([
  "appStorageState",
  "outboxState",
  "webhookState",
  "heartbeatState"
]);
const READ_ONLY_SMOKE_STATUS = Object.freeze([
  ["landing", 200],
  ["about", 200],
  ["login", 200],
  ["parent-entry", 307],
  ["parent-foundation", 403],
  ["session", 401],
  ["warm", 401]
]);
const MAX_RELEASE_RECORD_BYTES = 5 * 1024 * 1024;
const PRODUCTION_RUNTIME_REQUIRED_KEYS = Object.freeze([
  "TEACHER_NOTICE_HEALTH_SECRET"
]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function syntheticFamilyLabel(syntheticFamilyId) {
  return createHash("sha256")
    .update(syntheticFamilyId, "utf8")
    .digest("hex")
    .slice(0, 16);
}

export function deriveSyntheticFamilyAccounts({ syntheticFamilyId, secret }) {
  if (!SYNTHETIC_FAMILY_PATTERN.test(String(syntheticFamilyId ?? ""))) {
    throw new Error("A valid synthetic test family identifier is required.");
  }
  if (!SECRET_PATTERN.test(String(secret ?? ""))) {
    throw new Error("Synthetic-family credential derivation credential is unavailable or invalid.");
  }
  const label = syntheticFamilyLabel(syntheticFamilyId);
  const account = (role, username) => ({
    role,
    name: `MAIS Production Test ${role[0].toUpperCase()}${role.slice(1)} ${label}`,
    username,
    email: username,
    password: `Mais!${createHmac("sha256", secret)
      .update(`parent-production-acceptance\0${syntheticFamilyId}\0${role}`, "utf8")
      .digest("base64url")}`
  });
  return {
    teacher: account("teacher", `mais-prod-${label}-teacher@example.test`),
    student: account("student", `mais-prod-${label}-student@example.test`),
    parent: account("parent", `delivered+mais-prod-${label}@resend.dev`)
  };
}

function headerDirectives(value) {
  return new Set(
    String(value ?? "")
      .split(",")
      .map((directive) => directive.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function inspectProductionSessionCookie(setCookieHeader) {
  const raw = String(setCookieHeader ?? "");
  if (
    raw.length < 1 ||
    raw.length > 8_192 ||
    /[\r\n]/u.test(raw) ||
    /,\s*hk_math_session=/iu.test(raw)
  ) {
    throw new Error("Production session cookie contract failed.");
  }
  const segments = raw.split(";").map((segment) => segment.trim()).filter(Boolean);
  const firstEquals = segments[0]?.indexOf("=") ?? -1;
  const name = firstEquals > 0 ? segments[0].slice(0, firstEquals) : "";
  const value = firstEquals > 0 ? segments[0].slice(firstEquals + 1) : "";
  const attributes = new Map();
  for (const segment of segments.slice(1)) {
    const equals = segment.indexOf("=");
    const key = (equals < 0 ? segment : segment.slice(0, equals)).trim().toLowerCase();
    const attributeValue = equals < 0 ? true : segment.slice(equals + 1).trim();
    if (!key || attributes.has(key)) {
      throw new Error("Production session cookie contract failed.");
    }
    attributes.set(key, attributeValue);
  }
  const maxAge = Number(attributes.get("max-age"));
  if (
    name !== "hk_math_session" ||
    !value ||
    attributes.get("path") !== "/" ||
    attributes.get("secure") !== true ||
    attributes.get("httponly") !== true ||
    String(attributes.get("samesite") ?? "").toLowerCase() !== "lax" ||
    attributes.has("domain") ||
    !Number.isSafeInteger(maxAge) ||
    maxAge <= 0
  ) {
    throw new Error("Production session cookie contract failed.");
  }
  return {
    name: "hk_math_session",
    domain: "host-only",
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    expiresType: "persistent"
  };
}

export function inspectParentPrivateResponseHeaders(headers) {
  if (!headers || typeof headers.get !== "function") {
    throw new Error("Parent private response header contract failed.");
  }
  const cacheControl = headerDirectives(headers.get("cache-control"));
  const contentType = String(headers.get("content-type") ?? "").toLowerCase();
  const vercelCache = String(headers.get("x-vercel-cache") ?? "").trim().toUpperCase();
  let visibleCdnSafe = true;
  for (const headerName of ["cdn-cache-control", "vercel-cdn-cache-control"]) {
    if (!headers.has(headerName)) continue;
    const directives = headerDirectives(headers.get(headerName));
    visibleCdnSafe &&= directives.has("private") && directives.has("no-store");
  }
  const summary = {
    cacheControlPrivate: cacheControl.has("private"),
    cacheControlNoStore: cacheControl.has("no-store"),
    contentTypeJson: contentType.startsWith("application/json"),
    noSetCookie: !headers.has("set-cookie"),
    vercelCacheSafe: SAFE_VERCEL_CACHE_STATUSES.has(vercelCache) && visibleCdnSafe
  };
  if (Object.values(summary).some((value) => value !== true)) {
    throw new Error("Parent private response header contract failed.");
  }
  return summary;
}

export function inspectSessionIssuanceResponseHeaders(headers) {
  try {
    if (!headers || typeof headers.get !== "function" || typeof headers.has !== "function") {
      throw new Error("invalid headers");
    }
    const setCookies = typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
    if (setCookies.length !== 1) throw new Error("invalid cookie count");
    const cookie = inspectProductionSessionCookie(setCookies[0]);
    const cacheControl = headerDirectives(headers.get("cache-control"));
    const contentType = String(headers.get("content-type") ?? "").toLowerCase();
    const vercelCache = String(headers.get("x-vercel-cache") ?? "").trim().toUpperCase();
    let visibleCdnSafe = true;
    for (const headerName of ["cdn-cache-control", "vercel-cdn-cache-control"]) {
      if (!headers.has(headerName)) continue;
      const directives = headerDirectives(headers.get(headerName));
      visibleCdnSafe &&= directives.has("private") && directives.has("no-store");
    }
    const summary = {
      ...cookie,
      cacheControlPrivate: cacheControl.has("private"),
      cacheControlNoStore: cacheControl.has("no-store"),
      contentTypeJson: contentType.startsWith("application/json"),
      vercelCacheSafe: SAFE_VERCEL_CACHE_STATUSES.has(vercelCache) && visibleCdnSafe
    };
    if (Object.values(summary).some((value) => value === false)) {
      throw new Error("unsafe issuance headers");
    }
    return summary;
  } catch {
    throw new Error("Production session issuance header contract failed.");
  }
}

const INSTANCE_PROOF_PATTERN = /^v1\.[A-Za-z0-9_-]{22}$/u;
const RESEND_DELIVERED_TEST_RECIPIENT_PATTERN =
  /^delivered\+mais-prod-[a-f0-9]{16}@resend\.dev$/u;

export function validateConcurrentParentMessageEvidence({ kind, marker, responses }) {
  try {
    if (
      (kind !== "create" && kind !== "reply") ||
      typeof marker !== "string" ||
      marker.length < 1 ||
      marker.length > 2_000 ||
      !Array.isArray(responses) ||
      responses.length < 2 ||
      responses.length > 64
    ) {
      throw new Error("invalid input");
    }
    const instanceProofs = new Set();
    const threadIds = new Set();
    const entryIds = new Set();
    let createdCount = 0;
    let replayedCount = 0;
    for (const response of responses) {
      if (!isRecord(response) || !isRecord(response.body)) throw new Error("invalid response");
      inspectParentPrivateResponseHeaders(response.headers);
      const proof = response.headers.get("x-mais-production-instance-proof");
      if (!INSTANCE_PROOF_PATTERN.test(String(proof ?? ""))) throw new Error("invalid instance proof");
      instanceProofs.add(proof);
      const created = response.status === 201 && response.body.replayed === false;
      const replayed = response.status === 200 && response.body.replayed === true;
      if (!created && !replayed) throw new Error("invalid idempotency status");
      if (created) createdCount += 1;
      if (replayed) replayedCount += 1;
      const messageThread = response.body.thread;
      if (
        !isRecord(messageThread) ||
        typeof messageThread.id !== "string" ||
        !messageThread.id ||
        !Array.isArray(messageThread.messages) ||
        messageThread.messages.filter((message) => isRecord(message) && message.body === marker).length !== 1
      ) {
        throw new Error("invalid durable thread");
      }
      threadIds.add(messageThread.id);
      if (kind === "reply") {
        if (typeof response.body.entryId !== "string" || !response.body.entryId) {
          throw new Error("invalid durable reply");
        }
        entryIds.add(response.body.entryId);
      }
    }
    if (
      createdCount !== 1 ||
      replayedCount !== responses.length - 1 ||
      threadIds.size !== 1 ||
      (kind === "reply" && entryIds.size !== 1) ||
      instanceProofs.size < 2
    ) {
      throw new Error("idempotency or instance mismatch");
    }
    return {
      requestCount: responses.length,
      createdCount,
      replayedCount,
      distinctInstanceCount: instanceProofs.size,
      persistedExactlyOnce: true
    };
  } catch {
    throw new Error("Concurrent parent message evidence failed; details redacted.");
  }
}

export function validateResendWebhookDeliveryEvidence({ recipient, queue, health }) {
  try {
    if (
      !RESEND_DELIVERED_TEST_RECIPIENT_PATTERN.test(String(recipient ?? "")) ||
      !isRecord(queue) ||
      ![queue.queued, queue.reused, queue.recovered, queue.skipped].every((value) =>
        Number.isSafeInteger(value) && value >= 0
      ) ||
      queue.queued + queue.reused + queue.recovered < 1 ||
      !isRecord(health) ||
      !Number.isSafeInteger(health.deliveredEventDelta) ||
      health.deliveredEventDelta < 1 ||
      health.schedulerHealthy !== true ||
      health.webhookReconciled !== true ||
      health.outboxSettled !== true
    ) {
      throw new Error("provider mismatch");
    }
    return {
      officialTestRecipient: true,
      providerAccepted: true,
      providerDelivered: true,
      evidence: "signed-webhook-health"
    };
  } catch {
    throw new Error("Resend webhook delivery evidence failed; details redacted.");
  }
}

function healthDeliveredCount(payload) {
  const value = payload?.health?.providerEvents?.counts?.delivered;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("invalid delivered count");
  }
  return value;
}

export function validateTeacherNoticeHealthProgress({ before, after }) {
  try {
    const beforeDelivered = healthDeliveredCount(before);
    const afterDelivered = healthDeliveredCount(after);
    const health = after?.health;
    if (
      !isRecord(health) ||
      health.status !== "healthy" ||
      !Array.isArray(health.reasons) ||
      health.reasons.length !== 0 ||
      health.scheduler?.heartbeatStatus !== "succeeded" ||
      health.scheduler?.candidateMatch !== true ||
      !Number.isSafeInteger(health.scheduler?.heartbeatAgeSeconds) ||
      health.scheduler.heartbeatAgeSeconds < 0 ||
      health.scheduler.heartbeatAgeSeconds > 900 ||
      afterDelivered - beforeDelivered < 1 ||
      health.webhookReconciliation?.unmatchedCount !== 0 ||
      health.webhookReconciliation?.oldestUnmatchedAgeSeconds !== null ||
      health.outbox?.actionableCount !== 0 ||
      health.outbox?.staleLeaseCount !== 0 ||
      health.outbox?.counts?.pending !== 0 ||
      health.outbox?.counts?.retryable !== 0 ||
      health.outbox?.counts?.leased !== 0
    ) {
      throw new Error("health mismatch");
    }
    return {
      deliveredEventDelta: afterDelivered - beforeDelivered,
      schedulerHealthy: true,
      webhookReconciled: true,
      outboxSettled: true
    };
  } catch {
    throw new Error("Teacher notice health progress failed; details redacted.");
  }
}

const MAX_JSON_RESPONSE_BYTES = 1024 * 1024;
const APP_REQUEST_TIMEOUT_MS = 30_000;
const JSON_CONTENT_TYPE = "application/json";
const SAFE_VERCEL_CACHE_STATUSES = new Set(["BYPASS", "MISS"]);

export async function readBoundedJson(response) {
  const declaredLength = Number(response?.headers?.get?.("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_RESPONSE_BYTES) {
    throw new Error("Production acceptance response exceeded its bound.");
  }

  if (response?.body === null) return null;
  if (typeof response?.body?.getReader !== "function") {
    throw new Error("Production acceptance response body was invalid.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new Error("Production acceptance response body was invalid.");
      }
      byteLength += value.byteLength;
      if (byteLength > MAX_JSON_RESPONSE_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // The response is already rejected; cancellation is best-effort cleanup.
        }
        throw new Error("Production acceptance response exceeded its bound.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Production acceptance response was invalid JSON.");
  }
}

function safeAppUrl(origin, route) {
  if (
    !PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.includes(origin) ||
    typeof route !== "string" ||
    !route.startsWith("/") ||
    route.startsWith("//") ||
    /[\r\n]/u.test(route)
  ) {
    throw new Error("Production acceptance request target was rejected.");
  }
  const url = new URL(route, origin);
  if (url.origin !== origin || !url.pathname.startsWith("/")) {
    throw new Error("Production acceptance request target was rejected.");
  }
  return url;
}

async function appJsonRequest({
  origin,
  route,
  method = "GET",
  body,
  cookie,
  expectedUserId,
  certify = false,
  healthSecret,
  fetchImpl
}) {
  const url = safeAppUrl(origin, route);
  if (method !== "GET" && method !== "POST") {
    throw new Error("Production acceptance request method was rejected.");
  }
  const headers = {
    accept: JSON_CONTENT_TYPE,
    "user-agent": "MAIS-Parent-Production-Acceptance/1.0"
  };
  if (body !== undefined) headers["content-type"] = JSON_CONTENT_TYPE;
  if (cookie) headers.cookie = cookie;
  if (expectedUserId) headers["x-mais-expected-user-id"] = expectedUserId;
  if (certify) {
    headers.authorization = `Bearer ${healthSecret}`;
    headers["x-mais-production-certification"] = "parent-idempotency-v1";
  }
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(APP_REQUEST_TIMEOUT_MS),
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  } catch {
    throw new Error("Production acceptance application request failed; details redacted.");
  }
  return {
    status: response.status,
    headers: response.headers,
    body: await readBoundedJson(response)
  };
}

function sessionCookieFromResponse(response) {
  const setCookie = response.headers.get("set-cookie");
  const summary = inspectSessionIssuanceResponseHeaders(response.headers);
  const cookie = String(setCookie).split(";", 1)[0];
  if (!cookie.startsWith("hk_math_session=") || cookie.length <= "hk_math_session=".length) {
    throw new Error("Production session cookie contract failed.");
  }
  return { cookie, summary };
}

function validOpaqueId(value) {
  return typeof value === "string" && value.length >= 3 && value.length <= 256 && !/[\r\n]/u.test(value);
}

function accountSession(account, origin) {
  const session = account?.sessions?.[origin];
  if (!session?.cookie || !isRecord(session.cookieSummary)) {
    throw new Error("Synthetic production session is unavailable; details redacted.");
  }
  return session;
}

async function loginSyntheticAccount({ account, origin, expectedUserId, allowInvalidCredentials = false, fetchImpl }) {
  const response = await appJsonRequest({
    origin,
    route: "/api/auth/login",
    method: "POST",
    body: {
      username: account.username,
      password: account.password,
      grade: "S3",
      language: "en",
      theme: "light"
    },
    fetchImpl
  });
  if (allowInvalidCredentials && response.status === 401) return null;
  if (
    response.status !== 200 ||
    !isRecord(response.body?.user) ||
    response.body.user.role !== account.role ||
    !validOpaqueId(response.body.user.id) ||
    (expectedUserId && response.body.user.id !== expectedUserId)
  ) {
    throw new Error("Synthetic production account login failed; details redacted.");
  }
  const session = sessionCookieFromResponse(response);
  return {
    userId: response.body.user.id,
    cookie: session.cookie,
    cookieSummary: session.summary
  };
}

async function ensureSyntheticAccount({ account, origin, teacherInviteCode, fetchImpl }) {
  let response;
  let created = false;
  if (account.role === "teacher") {
    // Existing teachers remain usable when self-registration is closed or an invite rotates.
    const login = await loginSyntheticAccount({ account, origin, allowInvalidCredentials: true, fetchImpl });
    if (login) {
      response = { status: 200, body: { user: { id: login.userId, role: account.role } }, session: login };
    } else if (!teacherInviteCode) {
      throw new Error("MAIS_PARENT_SYNTHETIC_TEACHER_INVITE_CODE is required to register a new synthetic teacher; details redacted.");
    }
  }
  const registrationBody = account.role === "parent"
    ? {
        role: account.role,
        name: account.name,
        username: account.username,
        email: account.email,
        password: account.password,
        language: "en",
        theme: "light"
      }
    : {
        role: account.role,
        name: account.name,
        username: account.username,
        email: account.email,
        password: account.password,
        grade: "S3",
        ...(account.role === "teacher" ? { teacherInviteCode } : {}),
        curriculumTrack: "HK",
        curriculumProfile: {
          region: "HK",
          publisher: "HK_UNITED_PRIME_MIA"
        },
        language: "en",
        theme: "light"
      };
  if (!response) {
    response = await appJsonRequest({
      origin,
      route: "/api/auth/register",
      method: "POST",
      body: registrationBody,
      fetchImpl
    });
    created = response.status === 200;
  }
  if (response.status === 409) {
    const login = await loginSyntheticAccount({ account, origin, fetchImpl });
    response = {
      status: 200,
      body: { user: { id: login.userId, role: account.role } },
      session: login
    };
  }
  if (
    response.status !== 200 ||
    !isRecord(response.body) ||
    !isRecord(response.body.user) ||
    response.body.user.role !== account.role ||
    !validOpaqueId(response.body.user.id)
  ) {
    throw new Error("Synthetic production account could not be established; details redacted.");
  }
  const primarySession = response.session ?? {
    ...sessionCookieFromResponse(response),
    userId: response.body.user.id
  };
  const sessions = {
    [origin]: {
      cookie: primarySession.cookie,
      cookieSummary: primarySession.cookieSummary ?? primarySession.summary
    }
  };
  for (const alias of PARENT_PRODUCTION_ACCEPTANCE_ORIGINS) {
    if (alias === origin) continue;
    const login = await loginSyntheticAccount({
      account,
      origin: alias,
      expectedUserId: response.body.user.id,
      fetchImpl
    });
    sessions[alias] = {
      cookie: login.cookie,
      cookieSummary: login.cookieSummary
    };
  }
  return {
    created,
    role: account.role,
    userId: response.body.user.id,
    sessions
  };
}

async function verifyParentSessionAcrossAliases({ parent, fetchImpl }) {
  for (const origin of PARENT_PRODUCTION_ACCEPTANCE_ORIGINS) {
    const response = await appJsonRequest({
      origin,
      route: "/api/me",
      cookie: accountSession(parent, origin).cookie,
      expectedUserId: parent.userId,
      fetchImpl
    });
    inspectParentPrivateResponseHeaders(response.headers);
    if (
      response.status !== 200 ||
      response.body?.user?.id !== parent.userId ||
      response.body?.user?.role !== "parent"
    ) {
      throw new Error("Synthetic parent session did not persist across production aliases; details redacted.");
    }
  }
  return true;
}

async function ensureTeacherClass({ teacher, student, target, familyLabel, fetchImpl }) {
  const className = `MAIS Production Acceptance ${familyLabel}`;
  const common = {
    origin: target,
    cookie: accountSession(teacher, target).cookie,
    expectedUserId: teacher.userId,
    fetchImpl
  };
  let classesResponse = await appJsonRequest({
    ...common,
    route: "/api/teacher/classes"
  });
  if (classesResponse.status !== 200 || !Array.isArray(classesResponse.body?.classes)) {
    throw new Error("Synthetic production class inventory failed; details redacted.");
  }
  let teacherClass = classesResponse.body.classes.find((candidate) =>
    isRecord(candidate) && candidate.name === className
  );
  let classCreated = false;
  if (!teacherClass) {
    const createResponse = await appJsonRequest({
      ...common,
      route: "/api/teacher/classes",
      method: "POST",
      body: {
        name: className,
        grade: "S3",
        academicYear: "2026-2027",
        description: "Dedicated synthetic family for production acceptance."
      }
    });
    if (createResponse.status !== 201 || !isRecord(createResponse.body?.class)) {
      throw new Error("Synthetic production class creation failed; details redacted.");
    }
    teacherClass = createResponse.body.class;
    classCreated = true;
  }
  if (!validOpaqueId(teacherClass.id) || teacherClass.name !== className) {
    throw new Error("Synthetic production class identity failed; details redacted.");
  }

  const enrollment = await appJsonRequest({
    ...common,
    route: `/api/teacher/classes/${encodeURIComponent(teacherClass.id)}/students`,
    method: "POST",
    body: { username: student.username }
  });
  const duplicate = enrollment.status === 409 && enrollment.body?.error === "duplicate";
  if (enrollment.status !== 201 && !duplicate) {
    throw new Error("Synthetic production class enrollment failed; details redacted.");
  }
  return {
    classId: teacherClass.id,
    classCreated,
    enrollmentCreated: enrollment.status === 201
  };
}

async function readParentFoundation({ origin, parent, fetchImpl }) {
  const response = await appJsonRequest({
    origin,
    route: "/api/parent/foundation",
    cookie: accountSession(parent, origin).cookie,
    expectedUserId: parent.userId,
    fetchImpl
  });
  if (response.status !== 200 || !isRecord(response.body?.data)) {
    throw new Error("Synthetic parent foundation failed; details redacted.");
  }
  inspectParentPrivateResponseHeaders(response.headers);
  return response.body.data;
}

async function ensureGuardianLink({ teacher, student, parent, classId, target, fetchImpl }) {
  const initialFoundation = await readParentFoundation({ origin: target, parent, fetchImpl });
  const alreadyLinked = Array.isArray(initialFoundation.children) &&
    initialFoundation.children.some((child) => child?.student?.id === student.userId);
  let guardianLinkCreated = false;
  if (!alreadyLinked) {
    const invitation = await appJsonRequest({
      origin: target,
      route: `/api/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(student.userId)}/guardian-invitations`,
      method: "POST",
      cookie: accountSession(teacher, target).cookie,
      expectedUserId: teacher.userId,
      fetchImpl
    });
    const token = invitation.body?.invitation?.token;
    if (invitation.status !== 201 || !/^MAIS-[A-F0-9]{24}$/u.test(String(token ?? ""))) {
      throw new Error("Synthetic guardian invitation failed; details redacted.");
    }
    const link = await appJsonRequest({
      origin: target,
      route: "/api/parent/children/link",
      method: "POST",
      cookie: accountSession(parent, target).cookie,
      expectedUserId: parent.userId,
      body: { inviteCode: token, relationship: "guardian" },
      fetchImpl
    });
    inspectParentPrivateResponseHeaders(link.headers);
    if (link.status !== 200 || link.body?.link?.status !== "active") {
      throw new Error("Synthetic guardian link failed; details redacted.");
    }
    guardianLinkCreated = true;
  }

  for (const origin of PARENT_PRODUCTION_ACCEPTANCE_ORIGINS) {
    const foundation = await readParentFoundation({ origin, parent, fetchImpl });
    if (
      foundation.parent?.id !== parent.userId ||
      !Array.isArray(foundation.children) ||
      !foundation.children.some((child) => child?.student?.id === student.userId)
    ) {
      throw new Error("Synthetic guardian link did not persist across production aliases; details redacted.");
    }
  }
  return { guardianLinkCreated };
}

export function validateParentProductionAcceptanceExecutionId(value) {
  const normalized = String(value ?? "");
  if (!/^[1-9][0-9]{0,19}:[1-9][0-9]{0,5}$/u.test(normalized)) {
    throw new Error("Parent production acceptance execution identity is invalid.");
  }
  return normalized;
}

function acceptanceMessageKey(kind, candidateSha, syntheticFamilyId, executionId) {
  const digest = createHash("sha256")
    .update(`${candidateSha}\0${syntheticFamilyId}\0${executionId}\0${kind}`, "utf8")
    .digest("hex")
    .slice(0, 32);
  return `parent-production-${kind}:${digest}`;
}

async function certifiedParentWrite({
  origin,
  route,
  body,
  parent,
  healthSecret,
  fetchImpl
}) {
  return appJsonRequest({
    origin,
    route,
    method: "POST",
    body,
    cookie: accountSession(parent, origin).cookie,
    expectedUserId: parent.userId,
    certify: true,
    healthSecret,
    fetchImpl
  });
}

async function runConcurrentParentWrite({
  kind,
  route,
  body,
  marker,
  parent,
  healthSecret,
  fetchImpl,
  concurrency,
  maxReplayBatches
}) {
  const responses = [];
  for (let batch = 0; batch < maxReplayBatches; batch += 1) {
    const batchResponses = await Promise.all(Array.from({ length: concurrency }, (_, index) =>
      certifiedParentWrite({
        origin: PARENT_PRODUCTION_ACCEPTANCE_ORIGINS[index % PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.length],
        route,
        body,
        parent,
        healthSecret,
        fetchImpl
      })
    ));
    responses.push(...batchResponses);
    const proofs = new Set(responses.map((response) =>
      response.headers.get("x-mais-production-instance-proof")
    ).filter((value) => INSTANCE_PROOF_PATTERN.test(String(value ?? ""))));
    if (proofs.size >= 2) break;
  }
  return {
    summary: validateConcurrentParentMessageEvidence({ kind, marker, responses }),
    threadId: responses[0].body.thread.id
  };
}

async function verifyFinalMessagePersistence({
  parent,
  studentId,
  threadId,
  createMarker,
  replyMarker,
  fetchImpl
}) {
  const route = `/api/parent/messages?studentId=${encodeURIComponent(studentId)}&thread=${encodeURIComponent(threadId)}`;
  for (const origin of PARENT_PRODUCTION_ACCEPTANCE_ORIGINS) {
    const response = await appJsonRequest({
      origin,
      route,
      cookie: accountSession(parent, origin).cookie,
      expectedUserId: parent.userId,
      fetchImpl
    });
    inspectParentPrivateResponseHeaders(response.headers);
    if (response.status !== 200 || !Array.isArray(response.body?.data?.threads)) {
      throw new Error("Final parent message persistence read failed; details redacted.");
    }
    const thread = response.body.data.threads.find((candidate) => candidate?.id === threadId);
    if (
      !thread ||
      !Array.isArray(thread.messages) ||
      thread.messages.filter((message) => message?.body === createMarker).length !== 1 ||
      thread.messages.filter((message) => message?.body === replyMarker).length !== 1
    ) {
      throw new Error("Final parent message persistence evidence failed; details redacted.");
    }
  }
}

async function readTeacherNoticeHealth({ origin, healthSecret, fetchImpl }) {
  const response = await appJsonRequest({
    origin,
    route: "/api/health/teacher-notices",
    fetchImpl,
    healthSecret,
    certify: true
  });
  inspectParentPrivateResponseHeaders(response.headers);
  if ((response.status !== 200 && response.status !== 503) || !isRecord(response.body?.health)) {
    throw new Error("Teacher notice production health read failed; details redacted.");
  }
  return { status: response.status, payload: response.body };
}

function healthIsReady(payload) {
  const health = payload?.health;
  return health?.status === "healthy" &&
    Array.isArray(health.reasons) &&
    health.reasons.length === 0 &&
    health.scheduler?.heartbeatStatus === "succeeded" &&
    health.scheduler?.candidateMatch === true &&
    Number.isSafeInteger(health.scheduler?.heartbeatAgeSeconds) &&
    health.scheduler.heartbeatAgeSeconds >= 0 &&
    health.scheduler.heartbeatAgeSeconds <= 900;
}

async function waitForHealthyBaseline({ healthSecret, fetchImpl, sleep, healthPollAttempts }) {
  for (let attempt = 0; attempt < healthPollAttempts; attempt += 1) {
    const results = await Promise.all(PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.map((origin) =>
      readTeacherNoticeHealth({ origin, healthSecret, fetchImpl })
    ));
    if (results.every((result) => result.status === 200 && healthIsReady(result.payload))) {
      return results.map((result) => result.payload);
    }
    if (attempt < healthPollAttempts - 1) await sleep(15_000);
  }
  throw new Error("Teacher notice production health was not ready before the synthetic delivery; details redacted.");
}

async function ensureSyntheticNotice({
  teacher,
  classId,
  subject,
  target,
  fetchImpl
}) {
  const route = `/api/teacher/notices?classId=${encodeURIComponent(classId)}`;
  const inventory = await appJsonRequest({
    origin: target,
    route,
    cookie: accountSession(teacher, target).cookie,
    expectedUserId: teacher.userId,
    fetchImpl
  });
  if (inventory.status !== 200 || !Array.isArray(inventory.body?.notices)) {
    throw new Error("Synthetic teacher notice inventory failed; details redacted.");
  }
  let notice = inventory.body.notices.find((candidate) => candidate?.subject?.en === subject);
  let noticeCreated = false;
  if (!notice) {
    const created = await appJsonRequest({
      origin: target,
      route: "/api/teacher/notices",
      method: "POST",
      cookie: accountSession(teacher, target).cookie,
      expectedUserId: teacher.userId,
      body: {
        classId,
        audience: "parents",
        subject,
        body: "Dedicated synthetic delivery acceptance. No real family is targeted.",
        dueAt: null
      },
      fetchImpl
    });
    if (created.status !== 201 || !isRecord(created.body?.notice)) {
      throw new Error("Synthetic teacher notice creation failed; details redacted.");
    }
    notice = created.body.notice;
    noticeCreated = true;
  }
  if (!validOpaqueId(notice.id) || notice.subject?.en !== subject) {
    throw new Error("Synthetic teacher notice identity failed; details redacted.");
  }
  return { noticeId: notice.id, noticeCreated };
}

async function queueSyntheticNoticeDelivery({
  teacher,
  noticeId,
  idempotencyKey,
  target,
  fetchImpl
}) {
  const response = await appJsonRequest({
    origin: target,
    route: `/api/teacher/notices/${encodeURIComponent(noticeId)}/deliveries`,
    method: "POST",
    cookie: accountSession(teacher, target).cookie,
    expectedUserId: teacher.userId,
    body: { idempotencyKey },
    fetchImpl
  });
  const email = response.body?.email;
  if (
    response.status !== 202 ||
    !isRecord(email) ||
    email.status !== "queued" ||
    ![email.queued, email.reused, email.recovered, email.skipped].every((value) =>
      Number.isSafeInteger(value) && value >= 0
    ) ||
    email.queued + email.reused + email.recovered < 1
  ) {
    throw new Error("Synthetic Resend delivery queue failed; details redacted.");
  }
  return {
    queued: email.queued,
    reused: email.reused,
    recovered: email.recovered,
    skipped: email.skipped
  };
}

async function waitForHealthProgress({
  before,
  healthSecret,
  fetchImpl,
  sleep,
  healthPollAttempts
}) {
  for (let attempt = 0; attempt < healthPollAttempts; attempt += 1) {
    const after = await Promise.all(PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.map((origin) =>
      readTeacherNoticeHealth({ origin, healthSecret, fetchImpl })
    ));
    try {
      const progress = after.map((result, index) =>
        validateTeacherNoticeHealthProgress({ before: before[index], after: result.payload })
      );
      const first = progress[0];
      if (progress.every((candidate) => JSON.stringify(candidate) === JSON.stringify(first))) {
        return first;
      }
    } catch {
      // The worker or webhook may still be settling inside the bounded poll.
    }
    if (attempt < healthPollAttempts - 1) await sleep(10_000);
  }
  throw new Error("Teacher notice health did not record the synthetic provider delivery; details redacted.");
}

async function acknowledgeSyntheticNotice({
  parent,
  studentId,
  subject,
  target,
  fetchImpl
}) {
  const inventory = await appJsonRequest({
    origin: target,
    route: `/api/parent/notices?studentId=${encodeURIComponent(studentId)}`,
    cookie: accountSession(parent, target).cookie,
    expectedUserId: parent.userId,
    fetchImpl
  });
  inspectParentPrivateResponseHeaders(inventory.headers);
  if (inventory.status !== 200 || !Array.isArray(inventory.body?.data?.notices)) {
    throw new Error("Synthetic parent notice inventory failed; details redacted.");
  }
  const notice = inventory.body.data.notices.find((candidate) => candidate?.subject?.en === subject);
  if (!notice || !Array.isArray(notice.recipients) || notice.recipients.length !== 1) {
    throw new Error("Synthetic parent notice recipient failed; details redacted.");
  }
  const recipientId = notice.recipients[0]?.id;
  if (!validOpaqueId(recipientId)) {
    throw new Error("Synthetic parent notice recipient failed; details redacted.");
  }
  let acknowledgedAt = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await appJsonRequest({
      origin: target,
      route: `/api/parent/notices/${encodeURIComponent(recipientId)}/ack`,
      method: "POST",
      cookie: accountSession(parent, target).cookie,
      expectedUserId: parent.userId,
      fetchImpl
    });
    inspectParentPrivateResponseHeaders(response.headers);
    const receipt = response.body?.receipt;
    if (
      response.status !== 200 ||
      !isRecord(receipt) ||
      Object.keys(receipt).sort().join("\n") !== "acknowledgedAt\nrecipientId\nstatus" ||
      receipt.recipientId !== recipientId ||
      receipt.status !== "acknowledged" ||
      typeof receipt.acknowledgedAt !== "string" ||
      !Number.isFinite(Date.parse(receipt.acknowledgedAt)) ||
      (acknowledgedAt !== null && receipt.acknowledgedAt !== acknowledgedAt)
    ) {
      throw new Error("Synthetic parent notice acknowledgement failed; details redacted.");
    }
    acknowledgedAt = receipt.acknowledgedAt;
  }
  return true;
}

export async function runParentProductionAcceptance({
  toolingSha,
  toolingTreeSha,
  executionId,
  candidateSha,
  treeSha,
  syntheticFamilyId,
  target,
  releaseRecord,
  runtime = process.env,
  fetchImpl = globalThis.fetch,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  // Stay below the parent create route's 12/minute admission budget. Replays
  // are resolved before the limiter, so later batches can seek a second
  // process proof without weakening the one-create invariant.
  concurrency = 8,
  maxReplayBatches = 4,
  healthPollAttempts = 60,
  verifyToolingChecks = verifyGithubCandidateChecks,
  verifyCurrentDeployment = verifyParentProductionCurrentDeployment,
  toolingEnv = process.env,
  repoRoot = process.cwd()
}) {
  if (
    !SHA_PATTERN.test(String(toolingSha ?? "")) ||
    !SHA_PATTERN.test(String(toolingTreeSha ?? "")) ||
    typeof fetchImpl !== "function" ||
    typeof sleep !== "function" ||
    typeof verifyToolingChecks !== "function" ||
    typeof verifyCurrentDeployment !== "function" ||
    typeof repoRoot !== "string" ||
    !repoRoot ||
    !Number.isSafeInteger(concurrency) ||
    concurrency < 2 ||
    concurrency > 32 ||
    !Number.isSafeInteger(maxReplayBatches) ||
    maxReplayBatches < 1 ||
    maxReplayBatches > 8 ||
    !Number.isSafeInteger(healthPollAttempts) ||
    healthPollAttempts < 1 ||
    healthPollAttempts > 90
  ) {
    throw new Error("Parent production acceptance execution policy is invalid.");
  }
  const binding = requireBinding({
    candidateSha,
    treeSha,
    familyId: syntheticFamilyId,
    target
  });
  const execution = validateParentProductionAcceptanceExecutionId(executionId);
  assertRuntimeCredentials(runtime, binding.target);
  const toolingEvidence = await verifyToolingChecks({
    candidateSha: toolingSha,
    expectedTreeSha: toolingTreeSha,
    env: toolingEnv,
    repoRoot
  });
  if (toolingEvidence?.verified !== true) {
    throw new Error("Parent production acceptance tooling checks were not exact and green.");
  }
  const release = validateParentProductionReleaseRecord(releaseRecord, binding);
  const preflightDeployment = await verifyCurrentDeployment({
    env: toolingEnv,
    fetchImpl,
    releaseRecord
  });
  if (preflightDeployment?.providerBound !== true) {
    throw new Error("Parent production acceptance current deployment preflight failed.");
  }
  const accounts = deriveSyntheticFamilyAccounts({
    syntheticFamilyId: binding.familyId,
    secret: runtime.TEACHER_NOTICE_HEALTH_SECRET
  });
  const establishedTeacher = await ensureSyntheticAccount({
    account: accounts.teacher,
    origin: binding.target,
    teacherInviteCode: runtime.MAIS_PARENT_SYNTHETIC_TEACHER_INVITE_CODE,
    fetchImpl
  });
  const establishedStudent = await ensureSyntheticAccount({
    account: accounts.student,
    origin: binding.target,
    fetchImpl
  });
  const establishedParent = await ensureSyntheticAccount({
    account: accounts.parent,
    origin: binding.target,
    fetchImpl
  });
  const authenticatedAcrossAliases = await verifyParentSessionAcrossAliases({
    parent: establishedParent,
    fetchImpl
  });

  const familyLabel = syntheticFamilyLabel(binding.familyId);
  const teacherClass = await ensureTeacherClass({
    teacher: establishedTeacher,
    student: { ...establishedStudent, username: accounts.student.username },
    target: binding.target,
    familyLabel,
    fetchImpl
  });
  const guardian = await ensureGuardianLink({
    teacher: establishedTeacher,
    student: establishedStudent,
    parent: establishedParent,
    classId: teacherClass.classId,
    target: binding.target,
    fetchImpl
  });

  const createMarker = "MAIS synthetic create acceptance";
  const create = await runConcurrentParentWrite({
    kind: "create",
    route: "/api/parent/messages",
    body: {
      studentId: establishedStudent.userId,
      classId: teacherClass.classId,
      category: "logistics",
      subject: "MAIS synthetic parent production acceptance",
      body: createMarker,
      idempotencyKey: acceptanceMessageKey("create", binding.candidateSha, binding.familyId, execution)
    },
    marker: createMarker,
    parent: establishedParent,
    healthSecret: runtime.TEACHER_NOTICE_HEALTH_SECRET,
    fetchImpl,
    concurrency,
    maxReplayBatches
  });
  const replyMarker = "MAIS synthetic reply acceptance";
  const reply = await runConcurrentParentWrite({
    kind: "reply",
    route: `/api/parent/messages/${encodeURIComponent(create.threadId)}/reply`,
    body: {
      body: replyMarker,
      idempotencyKey: acceptanceMessageKey("reply", binding.candidateSha, binding.familyId, execution)
    },
    marker: replyMarker,
    parent: establishedParent,
    healthSecret: runtime.TEACHER_NOTICE_HEALTH_SECRET,
    fetchImpl,
    concurrency,
    maxReplayBatches
  });
  await verifyFinalMessagePersistence({
    parent: establishedParent,
    studentId: establishedStudent.userId,
    threadId: create.threadId,
    createMarker,
    replyMarker,
    fetchImpl
  });

  const healthBefore = await waitForHealthyBaseline({
    healthSecret: runtime.TEACHER_NOTICE_HEALTH_SECRET,
    fetchImpl,
    sleep,
    healthPollAttempts
  });
  const noticeSubject = `MAIS synthetic parent delivery ${binding.candidateSha.slice(0, 12)} ${familyLabel} ${execution.replace(":", "-")}`;
  const notice = await ensureSyntheticNotice({
    teacher: establishedTeacher,
    classId: teacherClass.classId,
    subject: noticeSubject,
    target: binding.target,
    fetchImpl
  });
  const deliveryQueue = await queueSyntheticNoticeDelivery({
    teacher: establishedTeacher,
    noticeId: notice.noticeId,
    idempotencyKey: acceptanceMessageKey("notice", binding.candidateSha, binding.familyId, execution),
    target: binding.target,
    fetchImpl
  });
  const health = await waitForHealthProgress({
    before: healthBefore,
    healthSecret: runtime.TEACHER_NOTICE_HEALTH_SECRET,
    fetchImpl,
    sleep,
    healthPollAttempts
  });
  const provider = validateResendWebhookDeliveryEvidence({
    recipient: accounts.parent.email,
    queue: deliveryQueue,
    health
  });
  const acknowledged = await acknowledgeSyntheticNotice({
    parent: establishedParent,
    studentId: establishedStudent.userId,
    subject: noticeSubject,
    target: binding.target,
    fetchImpl
  });
  const postflightDeployment = await verifyCurrentDeployment({
    env: toolingEnv,
    fetchImpl,
    releaseRecord
  });
  if (postflightDeployment?.providerBound !== true) {
    throw new Error("Parent production acceptance current deployment postflight failed.");
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    toolingSha,
    toolingTreeSha,
    toolingCiBound: true,
    currentProductionDeployment: {
      preflightBound: true,
      postflightBound: true
    },
    executionId: execution,
    candidateSha: binding.candidateSha,
    treeSha: binding.treeSha,
    target: binding.target,
    syntheticFamilyId: binding.familyId,
    release,
    accounts: {
      teacher: {
        role: "teacher",
        created: establishedTeacher.created,
        cookieContract: PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.every((origin) =>
          Boolean(accountSession(establishedTeacher, origin).cookieSummary)
        )
      },
      student: {
        role: "student",
        created: establishedStudent.created,
        cookieContract: PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.every((origin) =>
          Boolean(accountSession(establishedStudent, origin).cookieSummary)
        )
      },
      parent: {
        role: "parent",
        created: establishedParent.created,
        cookieContract: PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.every((origin) =>
          Boolean(accountSession(establishedParent, origin).cookieSummary)
        )
      }
    },
    cookie: {
      byOrigin: PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.map((origin) => ({
        origin,
        ...accountSession(establishedParent, origin).cookieSummary
      })),
      authenticatedAcrossAliases
    },
    family: {
      classReady: true,
      classCreated: teacherClass.classCreated,
      enrollmentReady: true,
      enrollmentCreated: teacherClass.enrollmentCreated,
      guardianLinkReady: true,
      guardianLinkCreated: guardian.guardianLinkCreated,
      crossAliasReadback: true
    },
    parentPrivateHeaderContract: true,
    idempotency: {
      create: create.summary,
      reply: reply.summary,
      crossAliasReadback: true
    },
    notification: {
      noticeCreated: notice.noticeCreated,
      queue: deliveryQueue,
      provider,
      health,
      acknowledged
    },
    writeFootprint: {
      syntheticAccountsCreated: [establishedTeacher, establishedStudent, establishedParent]
        .filter((account) => account.created).length,
      syntheticClassCreated: teacherClass.classCreated,
      syntheticEnrollmentCreated: teacherClass.enrollmentCreated,
      syntheticGuardianLinkCreated: guardian.guardianLinkCreated,
      parentMessageThreadsCreated: create.summary.createdCount,
      parentMessageRepliesCreated: reply.summary.createdCount,
      syntheticNoticesCreated: notice.noticeCreated ? 1 : 0,
      resendTestDeliveries: deliveryQueue.queued
    }
  };
}

function requireBinding(input) {
  const candidateSha = String(input?.candidateSha ?? "").toLowerCase();
  const treeSha = String(input?.treeSha ?? "").toLowerCase();
  const familyId = String(input?.familyId ?? "");
  const target = String(input?.target ?? "");
  if (
    !SHA_PATTERN.test(candidateSha) ||
    !SHA_PATTERN.test(treeSha) ||
    !SYNTHETIC_FAMILY_PATTERN.test(familyId) ||
    !PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.includes(target)
  ) {
    throw new Error("Parent production acceptance binding is invalid.");
  }
  return { candidateSha, familyId, target, treeSha };
}

export function parentProductionAcceptanceConfirmation(input) {
  const binding = requireBinding(input);
  return [
    "ALLOW_MAIS_PARENT_PRODUCTION_ACCEPTANCE",
    binding.familyId,
    binding.target,
    binding.candidateSha,
    binding.treeSha
  ].join(":");
}

function readRequiredArgument(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value for parent production acceptance.`);
  }
  return value;
}

function assertRuntimeCredentials(runtime, target) {
  const invite = runtime?.MAIS_PARENT_SYNTHETIC_TEACHER_INVITE_CODE;
  if (
    !SECRET_PATTERN.test(String(runtime?.TEACHER_NOTICE_HEALTH_SECRET ?? "")) ||
    (invite !== undefined && invite !== "" &&
      (typeof invite !== "string" || !SYNTHETIC_TEACHER_INVITE_PATTERN.test(invite))) ||
    !PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.includes(target)
  ) {
    throw new Error("Parent production acceptance runtime is unavailable or invalid.");
  }
}

export function parseParentProductionAcceptanceArgs(argv, runtime = process.env) {
  const parsed = {
    allowProductionWrites: false,
    allowResendTestDelivery: false,
    candidateSha: null,
    confirmation: null,
    releaseRecordPath: null,
    syntheticFamilyId: null,
    target: null,
    treeSha: null
  };
  const seen = new Set();
  const mark = (flag) => {
    if (seen.has(flag)) throw new Error(`Duplicate parent production acceptance argument: ${flag}`);
    seen.add(flag);
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--allow-production-writes") {
      mark(argument);
      parsed.allowProductionWrites = true;
    } else if (argument === "--allow-resend-test-delivery") {
      mark(argument);
      parsed.allowResendTestDelivery = true;
    } else if (argument === "--candidate-sha") {
      mark(argument);
      parsed.candidateSha = readRequiredArgument(argv, index, argument);
      index += 1;
    } else if (argument === "--tree-sha") {
      mark(argument);
      parsed.treeSha = readRequiredArgument(argv, index, argument);
      index += 1;
    } else if (argument === "--release-record") {
      mark(argument);
      parsed.releaseRecordPath = readRequiredArgument(argv, index, argument);
      index += 1;
    } else if (argument === "--target") {
      mark(argument);
      parsed.target = readRequiredArgument(argv, index, argument);
      index += 1;
    } else if (argument === "--synthetic-test-family-id") {
      mark(argument);
      parsed.syntheticFamilyId = readRequiredArgument(argv, index, argument);
      index += 1;
    } else if (argument === "--confirmation") {
      mark(argument);
      parsed.confirmation = readRequiredArgument(argv, index, argument);
      index += 1;
    } else {
      const safeFlag = String(argument ?? "").split("=", 1)[0].slice(0, 80);
      throw new Error(`Unknown argument for parent production acceptance: ${safeFlag}`);
    }
  }

  const binding = requireBinding({
    candidateSha: parsed.candidateSha,
    familyId: parsed.syntheticFamilyId,
    target: parsed.target,
    treeSha: parsed.treeSha
  });
  if (!parsed.allowProductionWrites || !parsed.allowResendTestDelivery) {
    throw new Error("Parent production acceptance requires both explicit production-write and Resend-test-delivery authorization.");
  }
  if (!parsed.releaseRecordPath) {
    throw new Error("Parent production acceptance requires an exact release record.");
  }
  const confirmation = parentProductionAcceptanceConfirmation(binding);
  if (parsed.confirmation !== confirmation) {
    throw new Error("Parent production acceptance confirmation did not match the exact family, target, SHA, and tree.");
  }
  assertRuntimeCredentials(runtime, binding.target);

  return {
    candidateSha: binding.candidateSha,
    treeSha: binding.treeSha,
    releaseRecordPath: parsed.releaseRecordPath,
    target: binding.target,
    syntheticFamilyId: binding.familyId,
    allowProductionWrites: true,
    allowResendTestDelivery: true,
    confirmation
  };
}

function assertExactSchemaEvidence(
  evidence,
  { candidateSha, treeSha, mode = null, requireNetwork = false }
) {
  if (
    !isRecord(evidence) ||
    evidence.candidateSha !== candidateSha ||
    evidence.expectedTreeSha !== treeSha ||
    (mode !== null && evidence.mode !== mode) ||
    (requireNetwork && evidence.network !== true) ||
    !Array.isArray(evidence.operations) ||
    evidence.operations.length !== 0 ||
    EXACT_SCHEMA_KEYS.some((key) => evidence[key] !== "exact")
  ) {
    throw new Error("release record schema evidence failed");
  }
}

function assertReadOnlySmokes(smokes) {
  if (!Array.isArray(smokes) || smokes.length !== PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.length) {
    throw new Error("release record read-only smoke evidence failed");
  }
  for (const [index, origin] of PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.entries()) {
    const smoke = smokes[index];
    if (
      !isRecord(smoke) ||
      smoke.baseUrl !== origin ||
      smoke.readOnly !== true ||
      smoke.requestCount !== READ_ONLY_SMOKE_STATUS.length ||
      !Array.isArray(smoke.checks) ||
      smoke.checks.length !== READ_ONLY_SMOKE_STATUS.length
    ) {
      throw new Error("release record read-only smoke evidence failed");
    }
    for (const [checkIndex, [id, status]] of READ_ONLY_SMOKE_STATUS.entries()) {
      const check = smoke.checks[checkIndex];
      if (!isRecord(check) || check.id !== id || check.status !== status) {
        throw new Error("release record read-only smoke evidence failed");
      }
    }
  }
}

export function validateParentProductionReleaseRecord(record, bindingInput) {
  try {
    const candidateSha = String(bindingInput?.candidateSha ?? "").toLowerCase();
    const treeSha = String(bindingInput?.treeSha ?? "").toLowerCase();
    if (!SHA_PATTERN.test(candidateSha) || !SHA_PATTERN.test(treeSha) || !isRecord(record)) {
      throw new Error("invalid binding");
    }
    if (
      record.candidateSha !== candidateSha ||
      record.target !== "production" ||
      record.inspectVerified !== true ||
      record.providerGitShaVerified !== true ||
      record.providerSourceVerified !== true ||
      record.promotionVerified !== true ||
      !isRecord(record.preDeployGithubEvidence) ||
      record.preDeployGithubEvidence.candidateSha !== candidateSha ||
      record.preDeployGithubEvidence.treeSha !== treeSha ||
      record.preDeployGithubEvidence.verified !== true ||
      !isRecord(record.prePromotionGithubEvidence) ||
      record.prePromotionGithubEvidence.candidateSha !== candidateSha ||
      record.prePromotionGithubEvidence.treeSha !== treeSha ||
      record.prePromotionGithubEvidence.verified !== true ||
      JSON.stringify(record.productionOrigins) !== JSON.stringify(PARENT_PRODUCTION_ACCEPTANCE_ORIGINS) ||
      !isRecord(record.finalProductionDeployment) ||
      !/^dpl_[A-Za-z0-9]{8,128}$/u.test(String(record.finalProductionDeployment.deploymentId ?? "")) ||
      !canonicalVercelDeploymentOrigin(record.finalProductionDeployment.deploymentUrl) ||
      JSON.stringify(record.finalProductionDeployment.productionAliases) !==
        JSON.stringify(PARENT_PRODUCTION_ACCEPTANCE_ORIGINS)
    ) {
      throw new Error("provider binding mismatch");
    }

    assertExactSchemaEvidence(record.prePromotionSchemaEvidence, {
      candidateSha,
      treeSha,
      mode: "preflight",
      requireNetwork: true
    });
    if (record.prePromotionSchemaEvidence.mutation !== false) {
      throw new Error("preflight mutation mismatch");
    }
    const apply = record.productionSchemaApplyEvidence;
    if (
      !isRecord(apply) ||
      apply.candidateSha !== candidateSha ||
      apply.expectedTreeSha !== treeSha ||
      apply.mode !== "apply" ||
      apply.mutation !== true ||
      apply.network !== true ||
      !Array.isArray(apply.operations) ||
      apply.operations.length !== 0
    ) {
      throw new Error("apply binding mismatch");
    }
    assertExactSchemaEvidence(apply.sameConnectionPostflight, {
      candidateSha,
      treeSha
    });
    assertExactSchemaEvidence(apply.postflight, {
      candidateSha,
      treeSha
    });
    assertReadOnlySmokes(record.productionReadOnlySmokes);
    const postgresMajor = record.prePromotionSchemaEvidence.postgresMajor;
    if (!Number.isSafeInteger(postgresMajor) || postgresMajor < 16) {
      throw new Error("postgres major mismatch");
    }
    return {
      candidateSha,
      treeSha,
      postgresMajor,
      productionOrigins: [...PARENT_PRODUCTION_ACCEPTANCE_ORIGINS],
      providerBound: true,
      schemaExact: true,
      readOnlySmokeBound: true
    };
  } catch {
    throw new Error("Parent production release record validation failed; details redacted.");
  }
}

export async function loadParentProductionReleaseRecord(filePath) {
  try {
    if (typeof filePath !== "string" || !filePath || /[\r\n]/u.test(filePath)) {
      throw new Error("invalid path");
    }
    const metadata = await lstat(filePath);
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      metadata.size < 2 ||
      metadata.size > MAX_RELEASE_RECORD_BYTES
    ) {
      throw new Error("invalid release record file");
    }
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    if (!isRecord(parsed)) throw new Error("invalid release record payload");
    return parsed;
  } catch {
    throw new Error("Parent production release record could not be loaded; details redacted.");
  }
}

export function buildParentProductionAcceptanceRuntime({
  runtimeEnvironment,
  target
}) {
  try {
    if (!isRecord(runtimeEnvironment)) {
      throw new Error("invalid provider payload");
    }
    const selected = {};
    for (const key of PRODUCTION_RUNTIME_REQUIRED_KEYS) {
      const runtimeValue = runtimeEnvironment[key];
      if (
        typeof runtimeValue !== "string" ||
        runtimeValue.length > 16_384 ||
        runtimeValue.includes("\0")
      ) {
        throw new Error("protected environment mismatch");
      }
      selected[key] = runtimeValue;
    }
    const teacherInviteCode = runtimeEnvironment.MAIS_PARENT_SYNTHETIC_TEACHER_INVITE_CODE;
    if (teacherInviteCode !== undefined && teacherInviteCode !== "") {
      selected.MAIS_PARENT_SYNTHETIC_TEACHER_INVITE_CODE = teacherInviteCode;
    }
    assertRuntimeCredentials(selected, target);
    return Object.freeze(selected);
  } catch {
    throw new Error("Parent production acceptance runtime failed validation; details redacted.");
  }
}

function assertParentProductionAcceptanceWorkflowContext(env) {
  const expectedWorkflow =
    "HUDongpin/MAIS-MVP/.github/workflows/parent-production-acceptance.yml@refs/heads/main";
  if (
    env?.CI !== "true" ||
    env?.GITHUB_ACTIONS !== "true" ||
    env?.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
    env?.GITHUB_REF !== "refs/heads/main" ||
    env?.GITHUB_REF_PROTECTED !== "true" ||
    env?.GITHUB_REPOSITORY !== "HUDongpin/MAIS-MVP" ||
    !SHA_PATTERN.test(String(env?.GITHUB_SHA ?? "")) ||
    env?.GITHUB_WORKFLOW_REF !== expectedWorkflow ||
    env?.MAIS_PARENT_PRODUCTION_ACCEPTANCE_ENV_SOURCE !== "github-production-health-v1" ||
    !/^[1-9][0-9]{0,19}$/u.test(String(env?.GITHUB_RUN_ID ?? "")) ||
    !/^[1-9][0-9]{0,5}$/u.test(String(env?.GITHUB_RUN_ATTEMPT ?? ""))
  ) {
    throw new Error("workflow context mismatch");
  }
}

export async function verifyParentProductionCurrentDeployment({
  env = process.env,
  fetchImpl = globalThis.fetch,
  releaseRecord
} = {}) {
  let token = null;
  try {
    assertParentProductionAcceptanceWorkflowContext(env);
    if (typeof fetchImpl !== "function") throw new Error("invalid provider binding input");
    token = env.VERCEL_TOKEN;
    if (!isValidVercelToken(token)) throw new Error("invalid provider token");
    const expectedDeploymentId = releaseRecord?.finalProductionDeployment?.deploymentId;
    const expectedDeploymentUrl = canonicalVercelDeploymentOrigin(
      releaseRecord?.finalProductionDeployment?.deploymentUrl
    );
    if (
      !/^dpl_[A-Za-z0-9]{8,128}$/u.test(String(expectedDeploymentId ?? "")) ||
      !expectedDeploymentUrl
    ) {
      throw new Error("release deployment binding unavailable");
    }
    const currentDeployment = await readCurrentVercelProductionDeployment({
      fetchImpl,
      token
    });
    if (
      currentDeployment.deploymentId !== expectedDeploymentId ||
      currentDeployment.deploymentUrl !== expectedDeploymentUrl
    ) {
      throw new Error("current production alias binding drifted");
    }
    return { providerBound: true };
  } catch {
    throw new Error("Parent production acceptance current deployment binding failed; details redacted.");
  } finally {
    token = null;
  }
}

export async function readParentProductionAcceptanceRuntime({
  env = process.env,
  target
} = {}) {
  try {
    assertParentProductionAcceptanceWorkflowContext(env);
    if (!PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.includes(target)) {
      throw new Error("invalid provider runtime input");
    }
    if (!isValidVercelToken(env.VERCEL_TOKEN)) throw new Error("invalid provider token");
    return buildParentProductionAcceptanceRuntime({
      runtimeEnvironment: env,
      target
    });
  } catch {
    throw new Error("Parent production acceptance runtime failed; details redacted.");
  }
}

function targetArgument(argv) {
  const indexes = argv
    .map((argument, index) => argument === "--target" ? index : -1)
    .filter((index) => index >= 0);
  if (indexes.length !== 1) {
    throw new Error("Parent production acceptance target argument is unavailable.");
  }
  const target = argv[indexes[0] + 1];
  if (!PARENT_PRODUCTION_ACCEPTANCE_ORIGINS.includes(target)) {
    throw new Error("Parent production acceptance target argument is invalid.");
  }
  return target;
}

function releaseRecordArgument(argv) {
  const indexes = argv
    .map((argument, index) => argument === "--release-record" ? index : -1)
    .filter((index) => index >= 0);
  if (indexes.length !== 1) {
    throw new Error("Parent production acceptance release-record argument is unavailable.");
  }
  const filePath = argv[indexes[0] + 1];
  if (!filePath || filePath.startsWith("--") || /[\r\n]/u.test(filePath)) {
    throw new Error("Parent production acceptance release-record argument is invalid.");
  }
  return filePath;
}

async function main() {
  const argv = process.argv.slice(2);
  const releaseRecord = await loadParentProductionReleaseRecord(releaseRecordArgument(argv));
  let runtime = await readParentProductionAcceptanceRuntime({
    env: process.env,
    releaseRecord,
    target: targetArgument(argv)
  });
  try {
    const args = parseParentProductionAcceptanceArgs(argv, runtime);
    const report = await runParentProductionAcceptance({
      toolingSha: process.env.GITHUB_SHA,
      toolingTreeSha: process.env.MAIS_PARENT_TOOLING_TREE_SHA,
      executionId: `${process.env.GITHUB_RUN_ID}:${process.env.GITHUB_RUN_ATTEMPT}`,
      candidateSha: args.candidateSha,
      treeSha: args.treeSha,
      syntheticFamilyId: args.syntheticFamilyId,
      target: args.target,
      releaseRecord,
      runtime
    });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    runtime = null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch {
    console.error("Parent production acceptance failed; details redacted.");
    process.exitCode = 1;
  }
}
