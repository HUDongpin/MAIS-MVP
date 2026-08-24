#!/usr/bin/env node
// Production certification — Phase 1, strictly read-only.
// Tier 0 (infrastructure), Tier 1 (unauthenticated surface), parent/login contracts,
// and explicit release-binding probes compose one point-in-time verdict.
//
// Usage:
//   npm run certify:production -- --candidate-sha <40-hex> --deployment-id <dpl_id> \
//     --deployment-url https://<deployment>.vercel.app --vercel-scope <team-id-or-slug> \
//     --build-id <local-next-build-id>
//   node scripts/prod-certification.mjs <binding args> --skip-browser --json
//
// Verdict policy: a P0 failure fails certification; every other failure, warning,
// or skip downgrades to CERTIFIED_WITH_FINDINGS. Strict mode is the non-disableable
// default, so both FAILED and CERTIFIED_WITH_FINDINGS exit nonzero.
//
// Remote mutation footprint: none. This script issues only GET/HEAD requests. It
// does not authenticate to the MAIS app. Read-only GitHub and Vercel management-API
// GETs bind the exact candidate checks, provider source bytes, deployment ownership,
// and production aliases. Phase 1 executes no application write probe.

import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import tls from "node:tls";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  BUILD_ARTIFACT_TREE_EXCLUSIONS,
  captureBuildArtifactTree
} from "./next-clean-build.mjs";
import {
  buildVercelStagingGitEnvironment,
  prepareVercelStaging
} from "./prepare-vercel-staging.mjs";
import {
  APPROVED_PRODUCTION_ORIGINS,
  APPROVED_VERCEL_PROJECT_ID,
  APPROVED_VERCEL_PROJECT_NAME,
  APPROVED_VERCEL_TEAM_ID,
  APPROVED_VERCEL_TEAM_SLUG,
  isValidVercelToken,
  validateVercelDeploymentIdentity,
  validateVercelProductionAliases,
  verifyVercelProviderDeployment
} from "./vercel-provider-evidence.mjs";
import {
  verifyGithubCandidateChecks
} from "./github-candidate-checks.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT = "MAIS-prod-certification/phase1";
const MAX_READ_ONLY_RESPONSE_BYTES = 32 * 1024 * 1024;
const MAX_READ_ONLY_REDIRECTS = 5;
const CERTIFICATION_CHILD_BASE_ENV_KEYS = Object.freeze([
  "CI",
  "COLORTERM",
  "COMSPEC",
  "FORCE_COLOR",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "NODE_OPTIONS",
  "NO_COLOR",
  "PATH",
  "PATHEXT",
  "SHELL",
  "SYSTEMROOT",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "TZ",
  "WINDIR"
]);

export const DOMAINS = [...APPROVED_PRODUCTION_ORIGINS];
export const BUILD_ATTESTATION_ARTIFACTS = Object.freeze([
  "BUILD_ID",
  "required-server-files.json",
  "server/app-paths-manifest.json"
]);
export const MAX_BUILD_ATTESTATION_AGE_MS = 24 * 60 * 60 * 1_000;
export const READ_ONLY_BROWSER_CONTEXT_OPTIONS = Object.freeze({
  userAgent: USER_AGENT,
  serviceWorkers: "block"
});
const APEX_OF = {
  "https://www.mais.ac": "https://mais.ac",
  "https://www.mais.hk": "https://mais.hk"
};

export function buildProductionCertificationChildEnvironment(
  purpose,
  env = process.env
) {
  if (purpose === "git") return buildVercelStagingGitEnvironment(env);
  const credentialKey = purpose === "github"
    ? "GITHUB_TOKEN"
    : purpose === "vercel"
      ? "VERCEL_TOKEN"
      : null;
  if (!credentialKey) {
    throw new Error("Production certification child environment purpose was rejected.");
  }
  const child = {};
  for (const key of [...CERTIFICATION_CHILD_BASE_ENV_KEYS, credentialKey]) {
    if (typeof env?.[key] === "string") child[key] = env[key];
  }
  return child;
}

// Render severity: the landing and login pages are P0 journeys; /about is P1.
const PAGES = [
  { path: "/", name: "landing", renderSeverity: "P0" },
  { path: "/about", name: "about", renderSeverity: "P1" },
  { path: "/login", name: "login", renderSeverity: "P0" }
];

export const BUDGETS = {
  homeTotalMsWarn: 6_000,
  homeTotalMsFail: 15_000,
  warmHitMsWarn: 5_000,
  htmlBytesWarn: 2 * 1024 * 1024,
  htmlBytesFail: 8 * 1024 * 1024,
  assetBytesWarn: 10 * 1024 * 1024,
  assetBytesFail: 25 * 1024 * 1024,
  rscBytesWarn: 1 * 1024 * 1024,
  rscBytesFail: 8 * 1024 * 1024,
  tlsMinDaysWarn: 14,
  maxAssetsPerPage: 60
};

const CANDIDATE_SHA_PATTERN = /^[a-f0-9]{40}$/u;
const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]{8,128}$/u;
const BUILD_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const BUILD_ATTESTATION_FUTURE_TOLERANCE_MS = 5 * 60 * 1_000;
const SYNTHETIC_FAMILY_ID_PATTERN = /^mais-synthetic-family-[a-z0-9][a-z0-9-]{2,63}$/u;

export function evaluateBudget(value, warnAt, failAt) {
  if (value > failAt) return "fail";
  if (value > warnAt) return "warn";
  return "pass";
}

export function extractNextAssets(html) {
  const assets = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/[^"?#]+)/g)) {
    assets.add(match[1]);
  }
  return [...assets].sort();
}

export function classifyWarmProbeStatus(status) {
  return status === 401 ? "pass" : "fail";
}

export function inspectCacheCookieContract(headers, { requirePrivate = false } = {}) {
  const cacheControl = (headers.get("cache-control") ?? "").toLowerCase();
  const directives = new Set(cacheControl.split(",").map((value) => value.trim()).filter(Boolean));
  const missing = [];
  if (!directives.has("no-store")) missing.push("no-store");
  if (requirePrivate && !directives.has("private")) missing.push("private");
  if (headers.get("set-cookie")) missing.push("no-set-cookie");
  return { ok: missing.length === 0, missing };
}

export function daysUntil(dateText) {
  return (new Date(dateText).getTime() - Date.now()) / 86_400_000;
}

export function aggregateVerdict(results) {
  let findings = false;
  for (const result of results) {
    if (result.severity === "P0" && result.status === "fail") return "FAILED";
    if (result.status === "fail" || result.status === "warn" || result.status === "skip") findings = true;
  }
  return findings ? "CERTIFIED_WITH_FINDINGS" : "CERTIFIED";
}

export function formatReportMarkdown(report) {
  const lines = [
    `# Production certification — ${report.verdict}`,
    "",
    `- Generated: ${report.generatedAt}`,
    `- Domains: ${report.domains.join(", ")}`,
    `- Candidate SHA: ${report.releaseBinding.candidateSha}`,
    `- Deployment: ${report.releaseBinding.deploymentId} (${report.releaseBinding.deploymentUrl})`,
    `- Local Next BUILD_ID: ${report.releaseBinding.buildId}`,
    `- Checks: ${report.results.length} (pass ${count(report, "pass")}, warn ${count(report, "warn")}, fail ${count(report, "fail")}, skip ${count(report, "skip")})`,
    `- Write footprint: ${report.writeFootprint}`,
    "",
    "| Status | Sev | Check | Domain | Detail |",
    "|--------|-----|-------|--------|--------|"
  ];
  for (const result of report.results) {
    const detail = String(result.detail ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
    lines.push(`| ${result.status.toUpperCase()} | ${result.severity} | ${result.id} | ${result.domain ?? "—"} | ${detail} |`);
  }
  lines.push(
    "",
    "Point-in-time read-only sample only. Deployment promotion, provider writes, and content correctness are not inferred by this run."
  );
  return lines.join("\n");
}

function count(report, status) {
  return report.results.filter((result) => result.status === status).length;
}

export async function fetchTimed(url, {
  timeoutMs = 30_000,
  headers = {},
  method = "GET",
  redirect = "same-origin",
  fetchImpl = globalThis.fetch,
  maxBytes = MAX_READ_ONLY_RESPONSE_BYTES
} = {}) {
  if (method !== "GET" && method !== "HEAD") {
    throw new Error("Read-only HTTP probe rejected a mutating method.");
  }
  const startedAt = Date.now();
  const initial = requireSafeReadOnlyUrl(url);
  const allowedOrigin = initial.origin;
  let current = initial;
  for (let hop = 0; hop <= MAX_READ_ONLY_REDIRECTS; hop += 1) {
    const response = await fetchImpl(current.href, {
      method,
      redirect: redirect === "error" ? "error" : "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": USER_AGENT, ...headers }
    });
    if (redirect === "same-origin" && isRedirectStatus(response.status)) {
      const location = response.headers.get("location");
      if (!location || hop === MAX_READ_ONLY_REDIRECTS) {
        throw new Error("Read-only HTTP redirect contract failed.");
      }
      const next = requireSafeReadOnlyUrl(new URL(location, current).href);
      if (next.origin !== allowedOrigin) {
        throw new Error("Read-only HTTP redirect left the approved origin.");
      }
      current = next;
      continue;
    }
    const buffer = method === "HEAD"
      ? new Uint8Array()
      : await readResponseBodyLimited(response, maxBytes);
    return {
      response,
      bytes: buffer.byteLength,
      finalUrl: current.href,
      ms: Date.now() - startedAt,
      text: () => new TextDecoder().decode(buffer)
    };
  }
  throw new Error("Read-only HTTP redirect contract failed.");
}

function isRedirectStatus(status) {
  return [301, 302, 303, 307, 308].includes(status);
}

function requireSafeReadOnlyUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Read-only HTTP target is invalid.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname ||
    net.isIP(url.hostname) !== 0
  ) {
    throw new Error("Read-only HTTP target is outside the approved public HTTPS boundary.");
  }
  return url;
}

async function readResponseBodyLimited(response, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("Read-only HTTP response limit is invalid.");
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("Read-only HTTP response exceeded its bounded size.");
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
        throw new Error("Read-only HTTP response exceeded its bounded size.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

function tlsCertificate(host) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 10_000 }, () => {
      const certificate = socket.getPeerCertificate();
      socket.end();
      resolve(certificate);
    });
    socket.on("error", reject);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("TLS handshake timeout"));
    });
  });
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index], index);
      }
    })
  );
  return results;
}

async function transferSize(url) {
  try {
    const head = await fetchTimed(url, { method: "HEAD", timeoutMs: 15_000 });
    const contentLength = Number(head.response.headers.get("content-length"));
    if (head.response.ok && Number.isFinite(contentLength) && contentLength > 0) return contentLength;
  } catch {
    // fall through to GET
  }
  try {
    const got = await fetchTimed(url, { timeoutMs: 20_000 });
    return got.response.ok ? got.bytes : 0;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

async function runTier0(domain, push) {
  const host = new URL(domain).host;

  try {
    const lookup = await dns.lookup(host);
    push({ id: "dns-resolve", tier: 0, severity: "P0", domain, status: "pass", detail: `${host} → ${lookup.address}` });
  } catch {
    push({ id: "dns-resolve", tier: 0, severity: "P0", domain, status: "fail", detail: "DNS resolution failed; details redacted" });
    return null; // nothing else on this domain can work
  }

  try {
    const certificate = await tlsCertificate(host);
    const daysLeft = daysUntil(certificate.valid_to);
    const status = daysLeft <= 0 ? "fail" : daysLeft < BUDGETS.tlsMinDaysWarn ? "warn" : "pass";
    push({
      id: "tls-certificate",
      tier: 0,
      severity: "P0",
      domain,
      status,
      detail: `expires ${certificate.valid_to} (${daysLeft.toFixed(0)} days)`
    });
  } catch {
    push({ id: "tls-certificate", tier: 0, severity: "P0", domain, status: "fail", detail: "TLS certificate probe failed; details redacted" });
  }

  let home = null;
  try {
    home = await fetchTimed(domain, { timeoutMs: BUDGETS.homeTotalMsFail + 5_000 });
    const okStatus = home.response.ok
      ? evaluateBudget(home.ms, BUDGETS.homeTotalMsWarn, BUDGETS.homeTotalMsFail)
      : "fail";
    push({
      id: "home-availability",
      tier: 0,
      severity: "P0",
      domain,
      status: okStatus,
      detail: `HTTP ${home.response.status} in ${home.ms}ms (${formatBytes(home.bytes)})`,
      ms: home.ms
    });
  } catch {
    push({ id: "home-availability", tier: 0, severity: "P0", domain, status: "fail", detail: "home availability probe failed; details redacted" });
    return null;
  }

  try {
    const warmHit = await fetchTimed(domain, { timeoutMs: 30_000 });
    push({
      id: "keep-warm-second-hit",
      tier: 0,
      severity: "P1",
      domain,
      status: warmHit.ms > BUDGETS.warmHitMsWarn ? "warn" : "pass",
      detail: `warm hit ${warmHit.ms}ms (first hit ${home.ms}ms)`,
      ms: warmHit.ms
    });
  } catch {
    push({ id: "keep-warm-second-hit", tier: 0, severity: "P1", domain, status: "warn", detail: "second-hit probe failed; details redacted" });
  }

  try {
    const warmProbe = await fetchTimed(`${domain}/api/warm`, { timeoutMs: 30_000 });
    // Production requires CRON_SECRET. An unauthenticated read-only probe must be
    // rejected with 401; 503 means missing configuration and 200 is fail-open.
    const contract = inspectCacheCookieContract(warmProbe.response.headers, { requirePrivate: true });
    const status = classifyWarmProbeStatus(warmProbe.response.status);
    push({
      id: "api-warm-endpoint",
      tier: 0,
      severity: "P1",
      domain,
      status: status === "pass" && contract.ok ? "pass" : "fail",
      detail: `HTTP ${warmProbe.response.status} in ${warmProbe.ms}ms; ${contract.ok ? "private no-store, no cookie" : `contract missing ${contract.missing.join(", ")}`}`
    });
  } catch {
    push({ id: "api-warm-endpoint", tier: 0, severity: "P1", domain, status: "fail", detail: "warm endpoint probe failed; details redacted" });
  }

  try {
    const apex = await fetchTimed(APEX_OF[domain], { timeoutMs: 30_000, redirect: "manual" });
    const status = apex.response.status;
    if (status >= 300 && status < 400) {
      const location = apex.response.headers.get("location") ?? "";
      push({
        id: "apex-redirect",
        tier: 0,
        severity: "P1",
        domain,
        status: location.startsWith(domain) ? "pass" : "warn",
        detail: `HTTP ${status} → ${location || "(no location)"}`
      });
    } else {
      push({
        id: "apex-redirect",
        tier: 0,
        severity: "P1",
        domain,
        status: status === 200 ? "pass" : "fail",
        detail: status === 200 ? "apex serves directly (no redirect)" : `HTTP ${status}`
      });
    }
  } catch {
    push({ id: "apex-redirect", tier: 0, severity: "P1", domain, status: "fail", detail: "apex redirect probe failed; details redacted" });
  }

  const missingHeaders = ["strict-transport-security", "x-content-type-options"].filter(
    (header) => !home.response.headers.get(header)
  );
  push({
    id: "security-headers",
    tier: 0,
    severity: "P1",
    domain,
    status: missingHeaders.length ? "warn" : "pass",
    detail: missingHeaders.length ? `missing: ${missingHeaders.join(", ")}` : "hsts + nosniff present"
  });

  return home.text();
}

function checkBuildParity(homeHtmlByDomain, push) {
  const domains = Object.keys(homeHtmlByDomain).filter((domain) => homeHtmlByDomain[domain] !== null);
  if (domains.length < 2) {
    push({ id: "build-parity", tier: 0, severity: "P0", status: "skip", detail: "needs both domains reachable" });
    return;
  }
  const [first, second] = domains;
  const firstAssets = extractNextAssets(homeHtmlByDomain[first]);
  const secondAssets = extractNextAssets(homeHtmlByDomain[second]);
  const onlyFirst = firstAssets.filter((asset) => !secondAssets.includes(asset));
  const onlySecond = secondAssets.filter((asset) => !firstAssets.includes(asset));
  if (firstAssets.length === 0) {
    push({ id: "build-parity", tier: 0, severity: "P0", status: "skip", detail: "no /_next assets found in landing HTML" });
    return;
  }
  if (onlyFirst.length === 0 && onlySecond.length === 0) {
    push({
      id: "build-parity",
      tier: 0,
      severity: "P0",
      status: "pass",
      detail: `both domains serve the same build (${firstAssets.length} shared assets)`
    });
  } else {
    push({
      id: "build-parity",
      tier: 0,
      severity: "P0",
      status: "fail",
      detail: `asset sets differ — only ${first}: ${onlyFirst.slice(0, 3).join(", ") || "none"}; only ${second}: ${onlySecond.slice(0, 3).join(", ") || "none"}`
    });
  }
}

async function runTier1(domain, push) {
  for (const page of PAGES) {
    const url = `${domain}${page.path}`;
    let result;
    try {
      result = await fetchTimed(url, { timeoutMs: 45_000 });
    } catch {
      push({ id: `page-render:${page.name}`, tier: 1, severity: page.renderSeverity, domain, status: "fail", detail: "page render probe failed; details redacted" });
      continue;
    }

    push({
      id: `page-render:${page.name}`,
      tier: 1,
      severity: page.renderSeverity,
      domain,
      status: result.response.ok ? "pass" : "fail",
      detail: `HTTP ${result.response.status} in ${result.ms}ms`,
      ms: result.ms
    });
    if (!result.response.ok) continue;

    push({
      id: `page-html-weight:${page.name}`,
      tier: 1,
      severity: "P1",
      domain,
      status: evaluateBudget(result.bytes, BUDGETS.htmlBytesWarn, BUDGETS.htmlBytesFail),
      detail: `${formatBytes(result.bytes)} HTML`
    });

    const assets = extractNextAssets(result.text()).slice(0, BUDGETS.maxAssetsPerPage);
    if (assets.length > 0) {
      const sizes = await mapLimit(assets, 8, (asset) => transferSize(`${domain}${asset}`));
      const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
      push({
        id: `page-asset-weight:${page.name}`,
        tier: 1,
        severity: "P1",
        domain,
        status: evaluateBudget(totalBytes, BUDGETS.assetBytesWarn, BUDGETS.assetBytesFail),
        detail: `${formatBytes(totalBytes)} transfer across ${assets.length} /_next assets`
      });
    }

    try {
      const rsc = await fetchTimed(url, { timeoutMs: 45_000, headers: { rsc: "1" } });
      const contentType = rsc.response.headers.get("content-type") ?? "";
      if (rsc.response.ok && contentType.includes("text/x-component")) {
        push({
          id: `page-rsc-payload:${page.name}`,
          tier: 1,
          severity: "P1",
          domain,
          status: evaluateBudget(rsc.bytes, BUDGETS.rscBytesWarn, BUDGETS.rscBytesFail),
          detail: `${formatBytes(rsc.bytes)} flight payload`
        });
      } else {
        push({
          id: `page-rsc-payload:${page.name}`,
          tier: 1,
          severity: "P1",
          domain,
          status: "skip",
          detail: `no flight response (HTTP ${rsc.response.status}, ${contentType || "no content-type"})`
        });
      }
    } catch {
      push({ id: `page-rsc-payload:${page.name}`, tier: 1, severity: "P1", domain, status: "skip", detail: "RSC payload probe failed; details redacted" });
    }
  }

  try {
    const missing = await fetchTimed(`${domain}/prod-cert-nonexistent-${Date.now()}`, { timeoutMs: 30_000 });
    push({
      id: "not-found-behavior",
      tier: 1,
      severity: "P1",
      domain,
      status: missing.response.status === 404 ? "pass" : "fail",
      detail: `HTTP ${missing.response.status} for a nonexistent route`
    });
  } catch {
    push({ id: "not-found-behavior", tier: 1, severity: "P1", domain, status: "fail", detail: "not-found probe failed; details redacted" });
  }

  try {
    const me = await fetchTimed(`${domain}/api/me`, { timeoutMs: 30_000 });
    const status = me.response.status;
    const contract = inspectCacheCookieContract(me.response.headers);
    push({
      id: "unauth-api-me",
      tier: 1,
      severity: "P1",
      domain,
      status: (status === 401 || status === 403) && contract.ok ? "pass" : "fail",
      detail: `HTTP ${status} unauthenticated; ${contract.ok ? "no-store, no cookie" : `contract missing ${contract.missing.join(", ")}`}`
    });
  } catch {
    push({ id: "unauth-api-me", tier: 1, severity: "P1", domain, status: "fail", detail: "unauthenticated identity probe failed; details redacted" });
  }

  try {
    const foundation = await fetchTimed(`${domain}/api/parent/foundation`, {
      timeoutMs: 30_000,
      redirect: "manual"
    });
    const status = foundation.response.status;
    const contract = inspectCacheCookieContract(foundation.response.headers, { requirePrivate: true });
    push({
      id: "unauth-parent-foundation",
      tier: 1,
      severity: "P0",
      domain,
      status: (status === 401 || status === 403) && contract.ok ? "pass" : "fail",
      detail: `HTTP ${status}; ${contract.ok ? "private no-store, no cookie" : `contract missing ${contract.missing.join(", ")}`}`
    });
  } catch {
    push({ id: "unauth-parent-foundation", tier: 1, severity: "P0", domain, status: "fail", detail: "parent foundation probe failed; details redacted" });
  }

  try {
    const parent = await fetchTimed(`${domain}/parent`, { timeoutMs: 30_000, redirect: "manual" });
    const location = parent.response.headers.get("location") ?? "";
    const target = location ? new URL(location, domain) : null;
    const redirectedToLogin =
      [302, 303, 307, 308].includes(parent.response.status) &&
      target?.origin === domain &&
      target.pathname === "/login" &&
      target.searchParams.get("next") === "/parent";
    const contract = inspectCacheCookieContract(parent.response.headers);
    push({
      id: "unauth-parent-entry",
      tier: 1,
      severity: "P0",
      domain,
      status: redirectedToLogin && contract.ok ? "pass" : "fail",
      detail: `HTTP ${parent.response.status} to ${target?.pathname ?? "(missing)"}; ${contract.ok ? "no-store, no cookie" : `contract missing ${contract.missing.join(", ")}`}`
    });
  } catch {
    push({ id: "unauth-parent-entry", tier: 1, severity: "P0", domain, status: "fail", detail: "parent entry probe failed; details redacted" });
  }
}

export function isReadOnlyBrowserRequestAllowed(request, allowedOrigin) {
  const methodValue = typeof request?.method === "function" ? request.method() : request?.method;
  const urlValue = typeof request?.url === "function" ? request.url() : request?.url;
  const method = String(methodValue ?? "").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  try {
    const url = new URL(String(urlValue ?? ""));
    return url.protocol === "https:" && url.origin === allowedOrigin;
  } catch {
    return false;
  }
}

function sanitizeBrowserTarget(value) {
  try {
    const url = new URL(String(value ?? ""));
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return "invalid-or-relative-target";
  }
}

function appendBlockedBrowserRecord(blockedRequests, entry) {
  blockedRequests.push({
    kind: String(entry?.kind ?? "request").slice(0, 40),
    method: String(entry?.method ?? "").toUpperCase().slice(0, 16),
    target: sanitizeBrowserTarget(entry?.target)
  });
}

// This function must remain self-contained because Playwright serializes it into
// each fresh page before any application script executes.
export function browserReadOnlyInitScript() {
  const record = (kind, target) => {
    try {
      const result = globalThis.__maisRecordBlockedBrowserMutation?.({
        kind,
        target: String(target ?? "")
      });
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch {
      // The network route remains the fail-closed backstop for HTTP requests.
    }
  };
  const installValue = (target, key, value) => {
    try {
      Object.defineProperty(target, key, {
        configurable: false,
        enumerable: true,
        value,
        writable: false
      });
      return target[key] === value;
    } catch {
      try {
        target[key] = value;
        return target[key] === value;
      } catch {
        return false;
      }
    }
  };

  const blockedBeacon = (target) => {
    record("sendBeacon", target);
    return false;
  };
  class BlockedWebSocket {
    constructor(target) {
      record("WebSocket", target);
      throw new Error("WebSocket blocked by the MAIS read-only certification guard");
    }
  }
  class BlockedEventSource {
    constructor(target) {
      record("EventSource", target);
      throw new Error("EventSource blocked by the MAIS read-only certification guard");
    }
  }
  class BlockedWorker {
    constructor(target) {
      record("Worker", target);
      throw new Error("Worker blocked by the MAIS read-only certification guard");
    }
  }
  class BlockedSharedWorker {
    constructor(target) {
      record("SharedWorker", target);
      throw new Error("SharedWorker blocked by the MAIS read-only certification guard");
    }
  }
  class BlockedWebTransport {
    constructor(target) {
      record("WebTransport", target);
      throw new Error("WebTransport blocked by the MAIS read-only certification guard");
    }
  }
  class BlockedRTCPeerConnection {
    constructor() {
      record("RTCPeerConnection", "browser-direct-channel");
      throw new Error("WebRTC blocked by the MAIS read-only certification guard");
    }
  }

  const marker = Object.freeze({
    version: 2,
    sendBeacon: Boolean(globalThis.navigator) && installValue(globalThis.navigator, "sendBeacon", blockedBeacon),
    webSocket: installValue(globalThis, "WebSocket", BlockedWebSocket),
    eventSource: installValue(globalThis, "EventSource", BlockedEventSource),
    worker: installValue(globalThis, "Worker", BlockedWorker),
    sharedWorker: installValue(globalThis, "SharedWorker", BlockedSharedWorker),
    webTransport: installValue(globalThis, "WebTransport", BlockedWebTransport),
    rtcPeerConnection: installValue(
      globalThis,
      "RTCPeerConnection",
      BlockedRTCPeerConnection
    ),
    webkitRtcPeerConnection: installValue(
      globalThis,
      "webkitRTCPeerConnection",
      BlockedRTCPeerConnection
    )
  });
  installValue(globalThis, "__maisReadOnlyBrowserGuard", marker);
}

export async function installReadOnlyBrowserGuards(context, allowedOrigin, blockedRequests) {
  await context.exposeBinding("__maisRecordBlockedBrowserMutation", (_source, entry) => {
    appendBlockedBrowserRecord(blockedRequests, entry);
  });
  await context.addInitScript(browserReadOnlyInitScript);
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (isReadOnlyBrowserRequestAllowed(request, allowedOrigin)) {
      await route.continue();
      return;
    }
    appendBlockedBrowserRecord(blockedRequests, {
      kind: "network-request",
      method: request.method(),
      target: request.url()
    });
    await route.abort("blockedbyclient");
  });
  await context.routeWebSocket(/.*/u, async (webSocketRoute) => {
    appendBlockedBrowserRecord(blockedRequests, {
      kind: "websocket-route",
      method: "WEBSOCKET",
      target: webSocketRoute.url()
    });
    await webSocketRoute.close({ code: 1008, reason: "read-only certification" });
  });
}

export function appendBrowserSkipResults(domains, push) {
  for (const domain of domains) {
    push({
      id: "browser-console-scan",
      tier: 1,
      severity: "P1",
      domain,
      status: "skip",
      detail: "browser checks explicitly skipped; a clean certification is forbidden"
    });
  }
}

async function runBrowserConsoleScan(domains, push) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    for (const domain of domains) {
      push({ id: "browser-console-scan", tier: 1, severity: "P1", domain, status: "skip", detail: "playwright not installed" });
    }
    return;
  }

  let browser;
  try {
    browser = await chromium.launch({
      args: [
        "--disable-features=WebTransport",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"
      ]
    });
  } catch {
    for (const domain of domains) {
      push({ id: "browser-console-scan", tier: 1, severity: "P1", domain, status: "skip", detail: "browser launch failed; details redacted" });
    }
    return;
  }

  try {
    for (const domain of domains) {
      for (const page of PAGES) {
        const context = await browser.newContext(READ_ONLY_BROWSER_CONTEXT_OPTIONS);
        const blockedRequests = [];
        let guardInstalled = false;
        try {
          await installReadOnlyBrowserGuards(context, domain, blockedRequests);
          guardInstalled = true;
        } catch {
          push({
            id: `browser-read-only-guard:${page.name}`,
            tier: 1,
            severity: "P0",
            domain,
            status: "fail",
            detail: "could not install read-only browser guard; details redacted"
          });
        }
        if (!guardInstalled) {
          await context.close();
          continue;
        }
        const browserPage = await context.newPage();
        let consoleErrorCount = 0;
        let pageErrorCount = 0;
        browserPage.on("console", (message) => {
          if (message.type() === "error") consoleErrorCount += 1;
        });
        browserPage.on("pageerror", () => {
          pageErrorCount += 1;
        });
        try {
          await browserPage.goto(`${domain}${page.path}`, { waitUntil: "load", timeout: 60_000 });
          await browserPage.waitForTimeout(3_000);
          const guardState = await browserPage.evaluate(() => globalThis.__maisReadOnlyBrowserGuard ?? null);
          const guardHealthy =
            guardState?.version === 2 &&
            guardState.sendBeacon === true &&
            guardState.webSocket === true &&
            guardState.eventSource === true &&
            guardState.worker === true &&
            guardState.sharedWorker === true &&
            guardState.webTransport === true &&
            guardState.rtcPeerConnection === true &&
            guardState.webkitRtcPeerConnection === true;
          push({
            id: `browser-read-only-guard:${page.name}`,
            tier: 1,
            severity: "P0",
            domain,
            status: guardHealthy ? "pass" : "fail",
            detail: guardHealthy
              ? `${blockedRequests.length} disallowed browser request(s) blocked; no query values retained`
              : "one or more browser mutation channels were not blocked"
          });
          const status = pageErrorCount ? "fail" : consoleErrorCount ? "warn" : "pass";
          push({
            id: `browser-console:${page.name}`,
            tier: 1,
            severity: "P1",
            domain,
            status,
            detail:
              status === "pass"
                ? "no console errors"
                : `${pageErrorCount} uncaught, ${consoleErrorCount} console errors; details redacted`
          });
        } catch {
          push({ id: `browser-console:${page.name}`, tier: 1, severity: "P1", domain, status: "fail", detail: "navigation or browser scan failed; details redacted" });
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

function readRequiredArgument(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

function canonicalDeploymentUrl(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !url.hostname.endsWith(".vercel.app")
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function validateReleaseBinding(releaseBinding) {
  if (!CANDIDATE_SHA_PATTERN.test(releaseBinding.candidateSha ?? "")) {
    throw new Error("--candidate-sha must be an exact 40-character hexadecimal commit SHA.");
  }
  if (!DEPLOYMENT_ID_PATTERN.test(releaseBinding.deploymentId ?? "")) {
    throw new Error("--deployment-id must be an exact Vercel dpl_ identifier.");
  }
  const deploymentUrl = canonicalDeploymentUrl(releaseBinding.deploymentUrl ?? "");
  if (!deploymentUrl) {
    throw new Error("--deployment-url must be a canonical HTTPS *.vercel.app origin.");
  }
  if (!BUILD_ID_PATTERN.test(releaseBinding.buildId ?? "")) {
    throw new Error("--build-id must be an 8-128 character local Next BUILD_ID.");
  }
  const vercelScope = String(releaseBinding.vercelScope ?? "");
  if (![APPROVED_VERCEL_TEAM_ID, APPROVED_VERCEL_TEAM_SLUG].includes(vercelScope)) {
    throw new Error("--vercel-scope must identify the approved MAIS Vercel team.");
  }
  return {
    candidateSha: releaseBinding.candidateSha.toLowerCase(),
    deploymentId: releaseBinding.deploymentId,
    deploymentUrl,
    vercelScope,
    buildId: releaseBinding.buildId
  };
}

function validateWriteAuthorization(raw) {
  const supplied = Boolean(raw.syntheticFamilyId || raw.writeTarget || raw.confirmation);
  if (!raw.allowProductionWrites) {
    if (supplied) throw new Error("Synthetic write arguments require --allow-production-writes.");
    return { authorized: false };
  }
  if (!SYNTHETIC_FAMILY_ID_PATTERN.test(raw.syntheticFamilyId ?? "")) {
    throw new Error("--allow-production-writes requires an exact --synthetic-test-family-id.");
  }
  if (!DOMAINS.includes(raw.writeTarget)) {
    throw new Error("--allow-production-writes requires --write-target to equal an approved production origin.");
  }
  const expected = `ALLOW_SYNTHETIC_TEST_FAMILY_WRITES:${raw.syntheticFamilyId}@${raw.writeTarget}`;
  if (raw.confirmation !== expected) {
    throw new Error("--allow-production-writes requires the exact synthetic test-family confirmation for its target.");
  }
  return {
    authorized: true,
    target: raw.writeTarget,
    syntheticFamilyConfirmed: true
  };
}

export function parseArgs(argv) {
  const args = {
    json: false,
    strict: true,
    skipBrowser: false,
    out: null,
    readOnly: true,
    releaseBinding: {},
    rawWriteAuthorization: {
      allowProductionWrites: false,
      syntheticFamilyId: null,
      writeTarget: null,
      confirmation: null
    }
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") args.json = true;
    else if (argument === "--strict") args.strict = true;
    else if (argument === "--skip-browser") args.skipBrowser = true;
    else if (argument === "--out") args.out = readRequiredArgument(argv, index++, argument);
    else if (argument === "--candidate-sha") args.releaseBinding.candidateSha = readRequiredArgument(argv, index++, argument);
    else if (argument === "--deployment-id") args.releaseBinding.deploymentId = readRequiredArgument(argv, index++, argument);
    else if (argument === "--deployment-url") args.releaseBinding.deploymentUrl = readRequiredArgument(argv, index++, argument);
    else if (argument === "--vercel-scope") args.releaseBinding.vercelScope = readRequiredArgument(argv, index++, argument);
    else if (argument === "--build-id") args.releaseBinding.buildId = readRequiredArgument(argv, index++, argument);
    else if (argument === "--allow-production-writes") args.rawWriteAuthorization.allowProductionWrites = true;
    else if (argument === "--synthetic-test-family-id") {
      args.rawWriteAuthorization.syntheticFamilyId = readRequiredArgument(argv, index++, argument);
    } else if (argument === "--write-target") {
      args.rawWriteAuthorization.writeTarget = readRequiredArgument(argv, index++, argument);
    } else if (argument === "--synthetic-test-family-confirmation") {
      args.rawWriteAuthorization.confirmation = readRequiredArgument(argv, index++, argument);
    }
    else {
      const flag = String(argument).split("=", 1)[0].slice(0, 80);
      throw new Error(flag.startsWith("--") ? `Unknown argument flag: ${flag}` : "Unknown argument.");
    }
  }
  const releaseBinding = validateReleaseBinding(args.releaseBinding);
  const writeAuthorization = validateWriteAuthorization(args.rawWriteAuthorization);
  return {
    json: args.json,
    strict: args.strict,
    skipBrowser: args.skipBrowser,
    out: args.out,
    readOnly: true,
    releaseBinding,
    writeAuthorization
  };
}

export function validateLocalReleaseBindingEvidence(
  releaseBinding,
  {
    localSha,
    localBuildId,
    attestation,
    currentSourceClean,
    currentArtifactDigests,
    currentArtifactTree,
    nowMs = Date.now()
  }
) {
  if (localSha !== releaseBinding.candidateSha) {
    throw new Error("Candidate binding failed: --candidate-sha does not equal the local release-source HEAD.");
  }
  if (localBuildId !== releaseBinding.buildId) {
    throw new Error("Build binding failed: --build-id does not equal the local .next/BUILD_ID.");
  }
  if (currentSourceClean !== true) {
    throw new Error("Build binding failed: the current worktree is not clean.");
  }

  const buildStartedAt = Date.parse(attestation?.buildStartedAt ?? "");
  const completedAt = Date.parse(attestation?.completedAt ?? "");
  const attestationMatches =
    attestation?.schemaVersion === 3 &&
    attestation.candidateSha === releaseBinding.candidateSha &&
    attestation.buildId === releaseBinding.buildId &&
    attestation.distDir === ".next" &&
    attestation.sourceTreeClean === true &&
    attestation.sourceTreeStable === true &&
    Number.isFinite(buildStartedAt) &&
    Number.isFinite(completedAt) &&
    completedAt >= buildStartedAt;
  if (!attestationMatches) {
    throw new Error(
      "Build binding failed: .next/mais-build-attestation.json must prove a clean, stable default build from the exact candidate SHA."
    );
  }
  if (
    buildStartedAt > nowMs + BUILD_ATTESTATION_FUTURE_TOLERANCE_MS ||
    completedAt > nowMs + BUILD_ATTESTATION_FUTURE_TOLERANCE_MS
  ) {
    throw new Error("Build binding failed: build attestation timestamps are in the future.");
  }
  if (nowMs - completedAt > MAX_BUILD_ATTESTATION_AGE_MS) {
    throw new Error("Build binding failed: a fresh build attestation completed within 24 hours is required.");
  }
  if (
    !isExactArtifactDigestRecord(attestation.artifactDigests) ||
    !isExactArtifactDigestRecord(currentArtifactDigests)
  ) {
    throw new Error("Build binding failed: build artifact digest evidence is incomplete or out of scope.");
  }
  for (const relativePath of BUILD_ATTESTATION_ARTIFACTS) {
    if (attestation.artifactDigests[relativePath] !== currentArtifactDigests[relativePath]) {
      throw new Error(`Build binding failed: artifact digest mismatch for ${relativePath}.`);
    }
  }
  if (
    !isValidLocalArtifactTree(attestation.artifactTree) ||
    !isValidLocalArtifactTree(currentArtifactTree) ||
    attestation.artifactTree.root !== currentArtifactTree.root ||
    attestation.artifactTree.fileCount !== currentArtifactTree.fileCount ||
    attestation.artifactTree.totalBytes !== currentArtifactTree.totalBytes
  ) {
    throw new Error("Build binding failed: complete local artifact tree integrity did not match.");
  }

  return {
    ...releaseBinding,
    localHeadMatched: true,
    localBuildIdMatched: true,
    localBuildAttestationMatched: true,
    buildStartedAt: attestation.buildStartedAt,
    completedAt: attestation.completedAt,
    artifactDigestsMatched: true,
    localArtifactTreeMatched: true
  };
}

function isValidLocalArtifactTree(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.algorithm === "sha256" &&
    Array.isArray(value.exclusions) &&
    value.exclusions.length === BUILD_ARTIFACT_TREE_EXCLUSIONS.length &&
    value.exclusions.every(
      (entry, index) => entry === BUILD_ARTIFACT_TREE_EXCLUSIONS[index]
    ) &&
    Number.isSafeInteger(value.fileCount) &&
    value.fileCount > 0 &&
    Number.isSafeInteger(value.totalBytes) &&
    value.totalBytes >= 0 &&
    typeof value.root === "string" &&
    SHA256_PATTERN.test(value.root)
  );
}

function isExactArtifactDigestRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  const expectedKeys = [...BUILD_ATTESTATION_ARTIFACTS].sort();
  return keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]) &&
    BUILD_ATTESTATION_ARTIFACTS.every(
      (relativePath) => typeof value[relativePath] === "string" && SHA256_PATTERN.test(value[relativePath])
    );
}

function captureCurrentBuildArtifactDigests() {
  const digests = {};
  for (const relativePath of BUILD_ATTESTATION_ARTIFACTS) {
    let contents;
    try {
      contents = fs.readFileSync(path.join(REPO_ROOT, ".next", ...relativePath.split("/")));
    } catch {
      throw new Error(`Build binding failed: required local build artifact is unavailable: ${relativePath}.`);
    }
    digests[relativePath] = createHash("sha256").update(contents).digest("hex");
  }
  return digests;
}

async function assertLocalReleaseBinding(releaseBinding) {
  const localSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: buildProductionCertificationChildEnvironment("git")
  }).trim().toLowerCase();
  const currentSourceClean = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: buildProductionCertificationChildEnvironment("git"),
      maxBuffer: 4 * 1024 * 1024
    }
  ).length === 0;

  let localBuildId;
  let attestation;
  try {
    localBuildId = fs.readFileSync(path.join(REPO_ROOT, ".next", "BUILD_ID"), "utf8").trim();
    attestation = JSON.parse(
      fs.readFileSync(
        path.join(REPO_ROOT, ".next", "mais-build-attestation.json"),
        "utf8"
      )
    );
  } catch {
    throw new Error(
      "Build binding failed: a fresh local .next/BUILD_ID and mais-build-attestation.json are required before certification."
    );
  }
  return validateLocalReleaseBindingEvidence(releaseBinding, {
    localSha,
    localBuildId,
    attestation,
    currentSourceClean,
    currentArtifactDigests: captureCurrentBuildArtifactDigests(),
    currentArtifactTree: await captureBuildArtifactTree({
      nextBuildDir: path.join(REPO_ROOT, ".next")
    })
  });
}

export function validateVercelDeploymentEvidence(
  releaseBinding,
  payload,
  { sourcePackageEvidence, aliasesPayload } = {}
) {
  try {
    if (![APPROVED_VERCEL_TEAM_ID, APPROVED_VERCEL_TEAM_SLUG].includes(releaseBinding.vercelScope)) {
      throw new Error("scope mismatch");
    }
    validateVercelDeploymentIdentity({
      candidateSha: releaseBinding.candidateSha,
      deploymentId: releaseBinding.deploymentId,
      deploymentUrl: releaseBinding.deploymentUrl,
      payload,
      sourcePackageEvidence,
      target: "production"
    });
    const productionOrigins = validateVercelProductionAliases(aliasesPayload);
    return {
      deploymentId: releaseBinding.deploymentId,
      deploymentUrl: releaseBinding.deploymentUrl,
      candidateSha: releaseBinding.candidateSha,
      productionAliases: productionOrigins.map((origin) => new URL(origin).hostname),
      readyState: "READY",
      source: "cli",
      sourceManifestRoot: sourcePackageEvidence.sourceManifestRoot,
      target: "production"
    };
  } catch {
    throw new Error("Vercel deployment binding failed: provider identity, source bytes, or aliases did not match.");
  }
}

export function validateVercelAliasEvidence(payload) {
  try {
    return validateVercelProductionAliases(payload)
      .map((origin) => new URL(origin).hostname);
  } catch {
    throw new Error("Vercel deployment binding failed: one or more exact production aliases are not assigned to this deployment.");
  }
}

export function buildVercelDeploymentFetchOptions(token) {
  if (!isValidVercelToken(token)) {
    throw new Error("VERCEL_TOKEN is unavailable or invalid.");
  }
  return {
    timeoutMs: 30_000,
    redirect: "error",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json"
    }
  };
}

async function runGithubCandidateBinding(releaseBinding, push, env = process.env) {
  try {
    const gitEnv = buildProductionCertificationChildEnvironment("git", env);
    const expectedTreeSha = execFileSync(
      "git",
      ["rev-parse", `${releaseBinding.candidateSha}^{tree}`],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: gitEnv
      }
    ).trim().toLowerCase();
    const evidence = await verifyGithubCandidateChecks({
      candidateSha: releaseBinding.candidateSha,
      expectedTreeSha,
      env: buildProductionCertificationChildEnvironment("github", env),
      repoRoot: REPO_ROOT,
      runCommand: (command, args, options = {}) =>
        runProductionCertificationGitCommand(command, args, {
          ...options,
          env: gitEnv
        })
    });
    push({
      id: "github-candidate-checks",
      tier: 0,
      severity: "P0",
      status: "pass",
      detail: `GitHub confirmed the exact commit/tree and ${evidence.releaseChecks.length} latest successful release checks`
    });
  } catch {
    push({
      id: "github-candidate-checks",
      tier: 0,
      severity: "P0",
      status: "fail",
      detail: "GitHub exact-SHA candidate or required-check evidence could not be proven; details redacted"
    });
  }
}

async function runProductionCertificationGitCommand(command, args, options = {}) {
  if (command !== "git") {
    throw new Error("Production certification Git command was rejected.");
  }
  try {
    const stdout = execFileSync(command, args, {
      cwd: options.cwd,
      encoding: "buffer",
      env: options.env,
      maxBuffer: 64 * 1024 * 1024
    });
    return { exitCode: 0, stderr: "", stdout };
  } catch {
    return { exitCode: 1, stderr: "", stdout: Buffer.alloc(0) };
  }
}

async function runVercelDeploymentBinding(releaseBinding, push, env = process.env) {
  try {
    const expectedStaging = await prepareVercelStaging({
      dryRun: true,
      repoRoot: REPO_ROOT,
      runId: "production-certification-readonly"
    });
    const evidence = await verifyVercelProviderDeployment({
      candidateSha: releaseBinding.candidateSha,
      deploymentId: releaseBinding.deploymentId,
      deploymentUrl: releaseBinding.deploymentUrl,
      env: buildProductionCertificationChildEnvironment("vercel", env),
      expectedStaging,
      requireProductionAliases: true,
      target: "production"
    });
    push({
      id: "vercel-source-package-binding",
      tier: 0,
      severity: "P0",
      status: "pass",
      detail: "provider source files were read back and their modes, sizes, SHA-1, SHA-256, and Git blob IDs matched the exact clean Git-bound package"
    });
    push({
      id: "vercel-deployment-binding",
      tier: 0,
      severity: "P0",
      status: "pass",
      detail: "provider confirmed approved team/project, immutable deployment ID, CLI source, and READY production target"
    });
    for (const domain of DOMAINS) {
      push({
        id: "vercel-production-alias-binding",
        tier: 0,
        severity: "P0",
        domain,
        status: evidence.productionAliases.includes(domain) ? "pass" : "fail",
        detail: evidence.productionAliases.includes(domain)
          ? "provider assigned this origin to the exact deployment"
          : "provider did not assign this origin to the exact deployment"
      });
    }
  } catch {
    push({
      id: "vercel-source-package-binding",
      tier: 0,
      severity: "P0",
      status: "fail",
      detail: "Vercel source package provenance could not be proven; details redacted"
    });
    push({
      id: "vercel-deployment-binding",
      tier: 0,
      severity: "P0",
      status: "fail",
      detail: "Vercel deployment evidence query failed; details redacted"
    });
    for (const domain of DOMAINS) {
      push({
        id: "vercel-production-alias-binding",
        tier: 0,
        severity: "P0",
        domain,
        status: "fail",
        detail: "alias binding could not be proven from provider evidence"
      });
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const releaseBinding = await assertLocalReleaseBinding(args.releaseBinding);
  const results = [];
  const push = (result) => {
    results.push(result);
    console.error(
      `[prod-certification] ${result.status.toUpperCase().padEnd(4)} ${result.severity} ${result.id}${result.domain ? ` @ ${result.domain}` : ""} — ${result.detail}`
    );
  };

  push({
    id: "local-release-binding",
    tier: 0,
    severity: "P0",
    status: "pass",
    detail: "candidate SHA matched clean local HEAD; fresh schema-v3 local build readiness attestation and complete artifact tree matched"
  });
  await runGithubCandidateBinding(releaseBinding, push);
  await runVercelDeploymentBinding(releaseBinding, push);

  const homeHtmlByDomain = {};
  for (const domain of DOMAINS) {
    console.error(`[prod-certification] Tier 0 — ${domain}`);
    homeHtmlByDomain[domain] = await runTier0(domain, push);
  }
  checkBuildParity(homeHtmlByDomain, push);

  for (const domain of DOMAINS) {
    if (homeHtmlByDomain[domain] === null) continue;
    console.error(`[prod-certification] Tier 1 — ${domain}`);
    await runTier1(domain, push);
  }

  if (!args.skipBrowser) {
    console.error("[prod-certification] Tier 1 — browser console scan");
    await runBrowserConsoleScan(DOMAINS.filter((domain) => homeHtmlByDomain[domain] !== null), push);
  } else {
    appendBrowserSkipResults(DOMAINS, push);
  }

  await assertLocalReleaseBinding(args.releaseBinding);
  push({
    id: "final-local-release-binding",
    tier: 0,
    severity: "P0",
    status: "pass",
    detail: "local HEAD, clean source, and complete local artifact tree remained stable through certification"
  });
  await runGithubCandidateBinding(releaseBinding, (result) => push({
    ...result,
    id: `final-${result.id}`
  }));
  await runVercelDeploymentBinding(releaseBinding, (result) => push({
    ...result,
    id: `final-${result.id}`
  }));

  const verdict = aggregateVerdict(results);
  const report = {
    generatedAt: new Date().toISOString(),
    domains: DOMAINS,
    phase: 1,
    flags: {
      strict: args.strict,
      readOnly: true,
      skipBrowser: args.skipBrowser,
      writeAuthorization: args.writeAuthorization
    },
    releaseBinding,
    writeFootprint: args.writeAuthorization.authorized
      ? "none (GET/HEAD only; synthetic-family authorization supplied but no write probe is implemented or executed in Phase 1)"
      : "none (GET/HEAD only; no MAIS app authentication; GitHub/Vercel credentials used only for provider management-API GETs)",
    results,
    verdict
  };

  const outDir = args.out ?? path.join(REPO_ROOT, ".tmp", "prod-certification", report.generatedAt.replaceAll(":", "-"));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "report.md"), `${formatReportMarkdown(report)}\n`);

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReportMarkdown(report));
  }
  console.error("[prod-certification] report written to the configured private output directory");
  console.error(`[prod-certification] verdict: ${verdict}`);

  if (verdict === "FAILED") process.exitCode = 1;
  else if (args.strict && verdict === "CERTIFIED_WITH_FINDINGS") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch {
    console.error("[prod-certification] certification failed; details redacted");
    process.exitCode = 1;
  }
}
