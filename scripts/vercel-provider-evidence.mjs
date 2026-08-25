import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildVercelSourceContentRequests,
  findVercelStagingManifestUid,
  validateVercelCliSourcePackageEvidence,
  validateVercelSourceFileContent
} from "./vercel-source-provenance.mjs";

export const APPROVED_VERCEL_PROJECT_ID = "prj_rjuY7fXculXzklpoG1L8xg7Tfdr1";
export const APPROVED_VERCEL_PROJECT_NAME = "mais-mvp";
export const APPROVED_VERCEL_TEAM_ID = "team_i9xhhYXUeYBOCLcfWBjTqlYG";
export const APPROVED_VERCEL_TEAM_SLUG = "peter-dongpin-hu-s-projects";
export const APPROVED_PRODUCTION_ORIGINS = Object.freeze([
  "https://www.mais.ac",
  "https://www.mais.hk"
]);

const SHA1_PATTERN = /^[a-f0-9]{40}$/u;
const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]{8,128}$/u;
const VERCEL_TOKEN_MIN_LENGTH = 20;
const VERCEL_TOKEN_MAX_LENGTH = 4_096;
const MAX_JSON_BYTES = 32 * 1024 * 1024;
const MAX_FILE_JSON_BYTES = 172 * 1024 * 1024;
const DEFAULT_CONTENT_CONCURRENCY = 4;
const MAX_PROVIDER_RETRIES = 4;
const MAX_RETRY_AFTER_MS = 30_000;
const MAX_RATE_LIMIT_RESET_WAIT_MS = 65_000;
const TRANSIENT_PROVIDER_STATUSES = new Set([429, 502, 503, 504]);

export function isValidVercelToken(value) {
  return typeof value === "string" &&
    value.length >= VERCEL_TOKEN_MIN_LENGTH &&
    value.length <= VERCEL_TOKEN_MAX_LENGTH &&
    !/[\s\u0000-\u001f\u007f-\u009f]/u.test(value);
}

export async function readVercelToken({
  env = process.env,
  homeDirectory = os.homedir(),
  readFile = fs.readFile
} = {}) {
  if (isValidVercelToken(env.VERCEL_TOKEN)) return env.VERCEL_TOKEN;
  const candidates = [
    path.join(homeDirectory, "Library", "Application Support", "com.vercel.cli", "auth.json"),
    path.join(homeDirectory, ".local", "share", "com.vercel.cli", "auth.json"),
    path.join(homeDirectory, ".config", "com.vercel.cli", "auth.json"),
    path.join(homeDirectory, ".vercel", "auth.json")
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(await readFile(candidate, "utf8"));
      if (isValidVercelToken(parsed?.token)) return parsed.token;
    } catch {
      // Continue through fixed Vercel CLI credential locations without exposing details.
    }
  }
  throw new Error("Vercel provider credential is unavailable or invalid; details redacted.");
}

export function canonicalVercelDeploymentOrigin(value) {
  try {
    const raw = String(value ?? "").trim();
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/u.test(url.hostname)
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function canonicalProductionAliasOrigin(value) {
  try {
    const rawValue = value && typeof value === "object" ? value.alias : value;
    const raw = String(rawValue ?? "").trim();
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function validateVercelProductionAliases(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.aliases)) {
    throw new Error("Vercel provider evidence failed: alias response was invalid.");
  }
  const aliases = new Set(payload.aliases.map(canonicalProductionAliasOrigin).filter(Boolean));
  if (APPROVED_PRODUCTION_ORIGINS.some((origin) => !aliases.has(origin))) {
    throw new Error("Vercel provider evidence failed: exact production aliases were not bound to the deployment.");
  }
  return [...APPROVED_PRODUCTION_ORIGINS];
}

export function validateVercelProductionAliasBindings(payloads) {
  if (!Array.isArray(payloads) || payloads.length !== APPROVED_PRODUCTION_ORIGINS.length) {
    throw new Error("Vercel provider evidence failed: current production alias evidence was invalid.");
  }
  return payloads.map((payload, index) => {
    const deploymentUrl = canonicalVercelDeploymentOrigin(payload?.url);
    if (
      !DEPLOYMENT_ID_PATTERN.test(String(payload?.id ?? "")) ||
      !deploymentUrl ||
      payload?.readyState !== "READY" ||
      payload?.target !== "production" ||
      payload?.projectId !== APPROVED_VERCEL_PROJECT_ID ||
      payload?.project?.id !== APPROVED_VERCEL_PROJECT_ID ||
      payload?.project?.name !== APPROVED_VERCEL_PROJECT_NAME ||
      payload?.ownerId !== APPROVED_VERCEL_TEAM_ID ||
      payload?.team?.id !== APPROVED_VERCEL_TEAM_ID ||
      payload?.team?.slug !== APPROVED_VERCEL_TEAM_SLUG
    ) {
      throw new Error("Vercel provider evidence failed: current production alias identity did not match.");
    }
    return {
      origin: APPROVED_PRODUCTION_ORIGINS[index],
      deploymentId: payload.id,
      deploymentUrl,
      projectId: APPROVED_VERCEL_PROJECT_ID,
      projectName: APPROVED_VERCEL_PROJECT_NAME,
      teamId: APPROVED_VERCEL_TEAM_ID,
      teamSlug: APPROVED_VERCEL_TEAM_SLUG
    };
  });
}

export function validateCurrentVercelProductionDeployments(payloads) {
  const bindings = validateVercelProductionAliasBindings(payloads);
  if (
    bindings.some((binding) =>
      binding.deploymentId !== bindings[0].deploymentId ||
      binding.deploymentUrl !== bindings[0].deploymentUrl
    )
  ) {
    throw new Error("Vercel provider evidence failed: production aliases did not share one deployment.");
  }
  return {
    ...bindings[0],
    productionAliases: [...APPROVED_PRODUCTION_ORIGINS],
    projectId: APPROVED_VERCEL_PROJECT_ID,
    projectName: APPROVED_VERCEL_PROJECT_NAME,
    teamId: APPROVED_VERCEL_TEAM_ID,
    teamSlug: APPROVED_VERCEL_TEAM_SLUG
  };
}

export async function readCurrentVercelProductionDeployment({
  env = process.env,
  fetchImpl = globalThis.fetch,
  token
} = {}) {
  const bindings = await readVercelProductionAliasBindings({ env, fetchImpl, token });
  if (
    bindings.some((binding) =>
      binding.deploymentId !== bindings[0].deploymentId ||
      binding.deploymentUrl !== bindings[0].deploymentUrl
    )
  ) {
    throw new Error("Vercel provider evidence failed: production aliases did not share one deployment.");
  }
  return {
    ...bindings[0],
    productionAliases: [...APPROVED_PRODUCTION_ORIGINS]
  };
}

export async function readVercelProductionAliasBindings({
  env = process.env,
  fetchImpl = globalThis.fetch,
  token
} = {}) {
  const credential = isValidVercelToken(token)
    ? token
    : await readVercelToken({ env });
  const payloads = await Promise.all(APPROVED_PRODUCTION_ORIGINS.map(async (origin) => {
    const hostname = new URL(origin).hostname;
    const url = new URL(
      `https://api.vercel.com/v13/deployments/${encodeURIComponent(hostname)}`
    );
    url.searchParams.set("teamId", APPROVED_VERCEL_TEAM_ID);
    return fetchVercelApiJson(url.href, credential, { fetchImpl });
  }));
  return validateVercelProductionAliasBindings(payloads);
}

export function validateVercelDeploymentIdentity({
  candidateSha,
  deploymentId,
  deploymentUrl,
  payload,
  sourcePackageEvidence,
  target
}) {
  const expectedOrigin = canonicalVercelDeploymentOrigin(deploymentUrl);
  const providerOrigin = canonicalVercelDeploymentOrigin(payload?.url);
  if (
    !SHA1_PATTERN.test(String(candidateSha ?? "")) ||
    !DEPLOYMENT_ID_PATTERN.test(String(deploymentId ?? "")) ||
    !expectedOrigin ||
    providerOrigin !== expectedOrigin ||
    payload?.id !== deploymentId ||
    payload?.readyState !== "READY" ||
    payload?.target !== target ||
    payload?.projectId !== APPROVED_VERCEL_PROJECT_ID ||
    payload?.project?.id !== APPROVED_VERCEL_PROJECT_ID ||
    payload?.project?.name !== APPROVED_VERCEL_PROJECT_NAME ||
    payload?.ownerId !== APPROVED_VERCEL_TEAM_ID ||
    payload?.team?.id !== APPROVED_VERCEL_TEAM_ID ||
    payload?.team?.slug !== APPROVED_VERCEL_TEAM_SLUG ||
    payload?.source !== "cli" ||
    String(payload?.meta?.maisCandidateSha ?? "").toLowerCase() !== candidateSha ||
    sourcePackageEvidence?.verified !== true ||
    sourcePackageEvidence?.candidateSha !== candidateSha ||
    sourcePackageEvidence?.contentSha256Verified !== true ||
    sourcePackageEvidence?.fileModesVerified !== true
  ) {
    throw new Error("Vercel provider evidence failed: deployment identity or source proof did not match the approved target.");
  }
  return {
    deploymentId,
    deploymentUrl: expectedOrigin,
    projectId: APPROVED_VERCEL_PROJECT_ID,
    projectName: APPROVED_VERCEL_PROJECT_NAME,
    teamId: APPROVED_VERCEL_TEAM_ID,
    teamSlug: APPROVED_VERCEL_TEAM_SLUG,
    target,
    source: "cli",
    sourceManifestRoot: sourcePackageEvidence.sourceManifestRoot,
    sourceSha256Verified: true,
    fileModesVerified: true
  };
}

export async function verifyVercelProviderDeployment({
  candidateSha,
  contentConcurrency = DEFAULT_CONTENT_CONCURRENCY,
  deploymentId,
  deploymentUrl,
  env = process.env,
  expectedStaging,
  fetchImpl = globalThis.fetch,
  requireProductionAliases = false,
  target,
  token
}) {
  if (
    !SHA1_PATTERN.test(String(candidateSha ?? "")) ||
    !DEPLOYMENT_ID_PATTERN.test(String(deploymentId ?? "")) ||
    !canonicalVercelDeploymentOrigin(deploymentUrl) ||
    (target !== "preview" && target !== "production") ||
    !Number.isSafeInteger(contentConcurrency) ||
    contentConcurrency < 1 ||
    contentConcurrency > 8
  ) {
    throw new Error("Vercel provider evidence failed: verification input was invalid.");
  }
  const credential = isValidVercelToken(token)
    ? token
    : await readVercelToken({ env });
  const apiUrl = (pathname) => {
    const url = new URL(`https://api.vercel.com${pathname}`);
    url.searchParams.set("teamId", APPROVED_VERCEL_TEAM_ID);
    return url.href;
  };
  const encodedDeploymentId = encodeURIComponent(deploymentId);
  const [payload, filesPayload, aliasesPayload] = await Promise.all([
    fetchVercelApiJson(apiUrl(`/v13/deployments/${encodedDeploymentId}`), credential, {
      fetchImpl
    }),
    fetchVercelApiJson(apiUrl(`/v6/deployments/${encodedDeploymentId}/files`), credential, {
      fetchImpl
    }),
    requireProductionAliases
      ? fetchVercelApiJson(apiUrl(`/v2/deployments/${encodedDeploymentId}/aliases`), credential, {
          fetchImpl
        })
      : Promise.resolve(null)
  ]);
  const manifestUid = findVercelStagingManifestUid(filesPayload);
  const manifestContentPayload = await fetchVercelApiJson(
    apiUrl(`/v8/deployments/${encodedDeploymentId}/files/${encodeURIComponent(manifestUid)}`),
    credential,
    { fetchImpl, maxBytes: MAX_JSON_BYTES }
  );
  const requestArguments = {
    releaseBinding: { candidateSha },
    filesPayload,
    manifestContentPayload,
    expectedStaging
  };
  const contentRequests = buildVercelSourceContentRequests(requestArguments);
  const verifiedSourceContents = new Map();
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(contentConcurrency, contentRequests.length) },
    async () => {
      while (cursor < contentRequests.length) {
        const request = contentRequests[cursor++];
        const encodedLength = Math.ceil(request.size / 3) * 4;
        const maxBytes = Math.min(MAX_FILE_JSON_BYTES, encodedLength + 8_192);
        if (maxBytes < encodedLength) {
          throw new Error("Vercel provider evidence failed: source file response exceeded its bound.");
        }
        const contentPayload = await fetchVercelApiJson(
          apiUrl(`/v8/deployments/${encodedDeploymentId}/files/${encodeURIComponent(request.uid)}`),
          credential,
          { fetchImpl, maxBytes }
        );
        verifiedSourceContents.set(
          request.uid,
          validateVercelSourceFileContent(request, contentPayload)
        );
      }
    }
  );
  await Promise.all(workers);
  const sourcePackageEvidence = validateVercelCliSourcePackageEvidence({
    ...requestArguments,
    verifiedSourceContents
  });
  const deploymentEvidence = validateVercelDeploymentIdentity({
    candidateSha,
    deploymentId,
    deploymentUrl,
    payload,
    sourcePackageEvidence,
    target
  });
  const productionAliases = requireProductionAliases
    ? validateVercelProductionAliases(aliasesPayload)
    : [];
  return {
    ...deploymentEvidence,
    productionAliases,
    sourcePackageEvidence
  };
}

export async function fetchVercelApiJson(url, token, {
  fetchImpl = globalThis.fetch,
  maxBytes = MAX_JSON_BYTES,
  now = Date.now,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  timeoutMs = 30_000
} = {}) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Vercel provider evidence failed: management API target was invalid.");
  }
  if (
    parsedUrl.origin !== "https://api.vercel.com" ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.port ||
    !isValidVercelToken(token) ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > MAX_FILE_JSON_BYTES
  ) {
    throw new Error("Vercel provider evidence failed: management API request was invalid.");
  }
  for (let attempt = 0; attempt <= MAX_PROVIDER_RETRIES; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(parsedUrl.href, {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
          "user-agent": "MAIS-Provider-Evidence/1.0"
        }
      });
    } catch {
      if (attempt < MAX_PROVIDER_RETRIES) {
        await sleep(providerRetryDelayMs(null, attempt, now(), null));
        continue;
      }
      throw new Error("Vercel provider evidence failed: management API request failed; details redacted.");
    }
    if (response?.ok) {
      const bytes = await readBodyLimited(response, maxBytes);
      try {
        return JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw new Error("Vercel provider evidence failed: management API response was invalid JSON.");
      }
    }
    if (TRANSIENT_PROVIDER_STATUSES.has(response?.status)) {
      try {
        await response?.body?.cancel();
      } catch {
        // The response body is provider-controlled and never included in evidence.
      }
      if (attempt >= MAX_PROVIDER_RETRIES) {
        throw new Error("Vercel provider evidence failed: management API request failed; details redacted.");
      }
      await sleep(providerRetryDelayMs(
        response.headers?.get?.("retry-after") ?? null,
        attempt,
        now(),
        response.headers?.get?.("x-ratelimit-reset") ?? null
      ));
      continue;
    }
    throw new Error("Vercel provider evidence failed: management API request failed; details redacted.");
  }
  throw new Error("Vercel provider evidence failed: management API request failed; details redacted.");
}

export function providerRetryDelayMs(
  retryAfter,
  attempt,
  now = Date.now(),
  rateLimitReset = null
) {
  const seconds = typeof retryAfter === "string" && /^\d{1,5}$/u.test(retryAfter.trim())
    ? Number(retryAfter.trim())
    : Number.NaN;
  if (Number.isFinite(seconds)) {
    return Math.min(MAX_RETRY_AFTER_MS, Math.max(250, seconds * 1_000));
  }
  const dateMs = typeof retryAfter === "string" ? Date.parse(retryAfter) : Number.NaN;
  if (Number.isFinite(dateMs)) {
    return Math.min(MAX_RETRY_AFTER_MS, Math.max(250, dateMs - now));
  }
  const resetSeconds = typeof rateLimitReset === "string" && /^\d{10,13}$/u.test(rateLimitReset.trim())
    ? Number(rateLimitReset.trim())
    : Number.NaN;
  if (Number.isFinite(resetSeconds)) {
    const resetMs = resetSeconds > 10_000_000_000
      ? resetSeconds
      : resetSeconds * 1_000;
    return Math.min(
      MAX_RATE_LIMIT_RESET_WAIT_MS,
      Math.max(250, resetMs - now + 1_000)
    );
  }
  return Math.min(MAX_RETRY_AFTER_MS, 500 * 2 ** Math.min(attempt, 5));
}

async function readBodyLimited(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("Vercel provider evidence failed: management API response exceeded its bound.");
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Vercel provider evidence failed: management API response exceeded its bound.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
