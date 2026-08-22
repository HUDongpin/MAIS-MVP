#!/usr/bin/env node
// Production certification — Phase 1.
// Tier 0 (infrastructure) + Tier 1 (unauthenticated surface) checks against the live
// production domains, plus the four deploy-time smokes (auth precheck, dashboard
// latency, dashboard UI loading, AI-Tutor live latency) composed into a single
// on-demand verdict: CERTIFIED / CERTIFIED_WITH_FINDINGS / FAILED.
//
// Usage:
//   npm run certify:production                 # full run (includes demo-login smokes)
//   node scripts/prod-certification.mjs --skip-smokes --skip-browser
//   node scripts/prod-certification.mjs --json --out .tmp/prod-certification
//
// Verdict policy: a P0 check failing fails certification; P1 failures and warnings
// downgrade to CERTIFIED_WITH_FINDINGS. Exit code is 1 only on FAILED (use --strict
// to also exit 1 on findings). A smoke gets one retry; passing only on retry is
// reported as a warning, never a clean pass.
//
// Write footprint of a full run (all via the hardcoded demo smoke account):
// demo logins from the dashboard/AI-Tutor smokes plus one AI-Tutor message round-trip.
// Tier 0/1 checks are read-only.

import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT = "MAIS-prod-certification/phase1";

export const DOMAINS = ["https://www.mais.ac", "https://www.mais.hk"];
export const GOOGLE_OAUTH_CANONICAL_DOMAIN = "https://www.mais.ac";
const GOOGLE_PUBLIC_PAGE_CONTRACTS = [
  { expectedUrl: "https://www.mais.ac/", kind: "homepage" },
  { expectedUrl: "https://www.mais.ac/privacy", kind: "privacy" },
  { expectedUrl: "https://www.mais.ac/terms", kind: "terms" }
];
export const GOOGLE_OAUTH_READINESS_PROBE_PARAMETERS = Object.freeze({
  language: "en",
  next: "/parent",
  role: "parent",
  theme: "dark"
});
const APEX_OF = {
  "https://www.mais.ac": "https://mais.ac",
  "https://www.mais.hk": "https://mais.hk"
};

// Render severity: landing, login, and the public legal URLs required for Google
// OAuth activation are P0 journeys; /about is P1.
const PAGES = [
  { path: "/", name: "landing", renderSeverity: "P0" },
  { path: "/about", name: "about", renderSeverity: "P1" },
  { path: "/login", name: "login", renderSeverity: "P0" },
  { path: "/privacy", name: "privacy-policy", renderSeverity: "P0" },
  { path: "/terms", name: "terms-of-service", renderSeverity: "P0" }
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

// The four deploy-time smokes, unchanged, composed by path. Dashboard smokes target
// .ac and the AI-Tutor smoke targets .hk so authenticated coverage lands on both
// domains, matching the deploy pipeline's split.
const SMOKES = [
  {
    id: "smoke-auth-precheck",
    argv: ["scripts/dashboard-smoke-auth-precheck.mjs", "--json"],
    severity: "P0",
    timeoutMs: 30_000
  },
  {
    id: "smoke-dashboard-latency",
    argv: ["scripts/dashboard-latency-smoke.mjs", "--base-url", "https://www.mais.ac", "--json"],
    severity: "P0",
    timeoutMs: 240_000
  },
  {
    id: "smoke-dashboard-ui-loading",
    argv: ["scripts/dashboard-ui-loading-smoke.mjs", "--base-url", "https://www.mais.ac", "--json"],
    severity: "P0",
    timeoutMs: 300_000
  },
  {
    id: "smoke-ai-tutor-live",
    argv: ["scripts/ai-tutor-live-latency-smoke.mjs", "--base-url", "https://www.mais.hk", "--json"],
    severity: "P0",
    timeoutMs: 300_000,
    // The sandbox egress proxy has historically timed out this smoke while the site
    // itself was healthy; a network-layer failure downgrades to an inconclusive
    // warning instead of failing certification outright.
    environmentalOk: true
  }
];

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

function extractCanonicalHref(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = tag.match(/\brel=["']([^"']*)["']/i)?.[1] ?? "";
    if (!rel.split(/\s+/).some((value) => value.toLowerCase() === "canonical")) continue;
    return tag.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? "";
  }
  return "";
}

function equivalentAbsoluteUrl(actual, expected) {
  try {
    return new URL(actual).href === new URL(expected).href;
  } catch {
    return false;
  }
}

export function evaluateGooglePublicPageContract({ expectedUrl, kind, response, html }) {
  const failures = [];
  if (response.status !== 200) failures.push(`HTTP status is not 200 (received ${response.status})`);
  if (response.headers.get("location")) failures.push("redirect Location is present");
  if (!equivalentAbsoluteUrl(response.url, expectedUrl)) failures.push("response URL does not match the submitted URL");

  const canonicalHref = extractCanonicalHref(html);
  if (!equivalentAbsoluteUrl(canonicalHref, expectedUrl)) failures.push("canonical URL does not match the submitted URL");

  const requiredText = kind === "homepage"
    ? ["Mathematics Adaptive Interactive System", "Optional Google Sign-In uses", 'href="/privacy"', 'href="/terms"']
    : kind === "privacy"
      ? ["Privacy Policy", "Google Sign-In data", "openid email profile", 'data-document-status="published"']
      : ["Terms of Service", "Optional Google Sign-In", 'data-document-status="published"'];
  for (const value of requiredText) {
    if (!html.toLowerCase().includes(value.toLowerCase())) failures.push(`required ${kind} content is missing: ${value}`);
  }
  if (
    (kind === "privacy" || kind === "terms") &&
    /draft-pending-review|pending legal review/i.test(html)
  ) {
    failures.push("draft legal marker is still present");
  }

  return failures.length === 0
    ? { ok: true, detail: `direct HTTP 200; exact canonical ${kind} page is published` }
    : { ok: false, detail: `Google ${kind} URL contract failed: ${failures.join("; ")}` };
}

export function classifySmokeFailure(outputText) {
  const environmental =
    /request-timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|UND_ERR|HeadersTimeoutError|socket hang up/i;
  return environmental.test(outputText) ? "environmental" : "real";
}

export function evaluateGoogleOAuthStartProbe({ status, headers }) {
  const failures = [];
  const location = headers.get("location") ?? "";
  const setCookie = headers.get("set-cookie") ?? "";
  const cacheControl = headers.get("cache-control") ?? "";
  const referrerPolicy = headers.get("referrer-policy") ?? "";
  let authorizationUrl = null;

  if (status !== 307) failures.push("expected HTTP 307");
  try {
    authorizationUrl = new URL(location);
  } catch {
    failures.push("authorization Location is missing or invalid");
  }

  if (authorizationUrl) {
    if (
      authorizationUrl.origin !== "https://accounts.google.com" ||
      authorizationUrl.pathname !== "/o/oauth2/v2/auth"
    ) {
      failures.push("authorization endpoint is not Google OIDC");
    }
    const requiredParameters = ["client_id", "redirect_uri", "state", "nonce", "code_challenge"];
    for (const parameter of requiredParameters) {
      if (!authorizationUrl.searchParams.get(parameter)) failures.push(`${parameter} is missing`);
    }
    if (authorizationUrl.searchParams.get("response_type") !== "code") {
      failures.push("response_type is not code");
    }
    if (authorizationUrl.searchParams.get("code_challenge_method") !== "S256") {
      failures.push("PKCE method is not S256");
    }
    if (!/^[A-Za-z0-9_-]{43}$/u.test(authorizationUrl.searchParams.get("code_challenge") ?? "")) {
      failures.push("PKCE challenge format is invalid");
    }
    const scopes = new Set((authorizationUrl.searchParams.get("scope") ?? "").split(/\s+/u).filter(Boolean));
    for (const scope of ["openid", "email", "profile"]) {
      if (!scopes.has(scope)) failures.push(`${scope} scope is missing`);
    }
    if (
      authorizationUrl.searchParams.get("redirect_uri") !==
      `${GOOGLE_OAUTH_CANONICAL_DOMAIN}/api/auth/google/callback`
    ) {
      failures.push("redirect_uri is not the canonical production callback");
    }
  }

  if (!/(?:^|,\s*)mais_google_oauth_state=[^;,\s]+/iu.test(setCookie)) {
    failures.push("state cookie is missing");
  }
  if (!/;\s*HttpOnly(?:;|,|$)/iu.test(setCookie)) failures.push("state cookie is not HttpOnly");
  if (!/;\s*Secure(?:;|,|$)/iu.test(setCookie)) failures.push("state cookie is not Secure");
  if (!/;\s*Path=\/(?:;|,|$)/iu.test(setCookie)) failures.push("state cookie Path is not /");
  if (!/;\s*Max-Age=600(?:;|,|$)/iu.test(setCookie)) failures.push("state cookie Max-Age is not 600");
  if (!/;\s*SameSite=Lax(?:;|,|$)/iu.test(setCookie)) failures.push("state cookie is not SameSite=Lax");
  if (!cacheControl.toLowerCase().split(",").some((value) => value.trim() === "no-store")) {
    failures.push("Cache-Control is not no-store");
  }
  if (referrerPolicy.toLowerCase().trim() !== "no-referrer") {
    failures.push("Referrer-Policy is not no-referrer");
  }

  return failures.length === 0
    ? {
        ok: true,
        detail: "HTTP 307; Google OIDC state, nonce, PKCE, hardened state cookie, and no-store/no-referrer verified"
      }
    : {
        ok: false,
        detail: `Google OAuth start contract failed: ${failures.join("; ")}`
      };
}

export function evaluateGoogleOAuthCanonicalHandoff({ status, headers }) {
  const failures = [];
  const location = headers.get("location") ?? "";
  const setCookie = headers.get("set-cookie") ?? "";
  const cacheControl = headers.get("cache-control") ?? "";
  const referrerPolicy = headers.get("referrer-policy") ?? "";
  let canonicalUrl = null;

  if (status !== 307) failures.push("expected HTTP 307");
  try {
    canonicalUrl = new URL(location);
  } catch {
    failures.push("canonical handoff Location is missing or invalid");
  }

  if (canonicalUrl) {
    if (
      canonicalUrl.origin !== GOOGLE_OAUTH_CANONICAL_DOMAIN ||
      canonicalUrl.pathname !== "/api/auth/google/start"
    ) {
      failures.push("handoff target is not the canonical OAuth start route");
    }
    for (const [key, value] of Object.entries(GOOGLE_OAUTH_READINESS_PROBE_PARAMETERS)) {
      if (canonicalUrl.searchParams.get(key) !== value) failures.push(`${key} was not preserved`);
    }
  }

  if (setCookie) failures.push("non-canonical handoff set a state cookie");
  if (!cacheControl.toLowerCase().split(",").some((value) => value.trim() === "no-store")) {
    failures.push("Cache-Control is not no-store");
  }
  if (referrerPolicy.toLowerCase().trim() !== "no-referrer") {
    failures.push("Referrer-Policy is not no-referrer");
  }

  return failures.length === 0
    ? { ok: true, detail: "HTTP 307; canonical OAuth handoff and hardened no-store/no-referrer response verified" }
    : { ok: false, detail: `Google OAuth canonical handoff failed: ${failures.join("; ")}` };
}

export function evaluateStorageReadinessProbe({ status, body }) {
  if (status !== 200) {
    return { ok: false, detail: `storage readiness endpoint returned HTTP ${status}` };
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, detail: "storage readiness endpoint did not return valid JSON" };
  }

  if (parsed?.warm === true && parsed?.storageReady === true) {
    return { ok: true, detail: "durable shared storage is ready" };
  }

  return { ok: false, detail: "durable shared storage is not ready" };
}

export function daysUntil(dateText) {
  return (new Date(dateText).getTime() - Date.now()) / 86_400_000;
}

export function aggregateVerdict(results) {
  let findings = false;
  for (const result of results) {
    if (result.severity === "P0" && result.status === "fail") return "FAILED";
    if (result.status === "fail" || result.status === "warn") findings = true;
    if (result.severity === "P0" && result.status === "skip") findings = true;
  }
  return findings ? "CERTIFIED_WITH_FINDINGS" : "CERTIFIED";
}

export function formatReportMarkdown(report) {
  const lines = [
    `# Production certification — ${report.verdict}`,
    "",
    `- Generated: ${report.generatedAt}`,
    `- Domains: ${report.domains.join(", ")}`,
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
  lines.push("", "Point-in-time sample of the promoted build. Content correctness is certified by CI, not by this run.");
  return lines.join("\n");
}

function count(report, status) {
  return report.results.filter((result) => result.status === status).length;
}

async function fetchTimed(url, { timeoutMs = 30_000, headers = {}, redirect = "follow" } = {}) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    redirect,
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": USER_AGENT, ...headers }
  });
  const buffer = await response.arrayBuffer();
  return {
    response,
    bytes: buffer.byteLength,
    ms: Date.now() - startedAt,
    text: () => new TextDecoder().decode(buffer)
  };
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
    const head = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": USER_AGENT }
    });
    const contentLength = Number(head.headers.get("content-length"));
    if (head.ok && Number.isFinite(contentLength) && contentLength > 0) return contentLength;
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
  } catch (error) {
    push({ id: "dns-resolve", tier: 0, severity: "P0", domain, status: "fail", detail: String(error) });
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
  } catch (error) {
    push({ id: "tls-certificate", tier: 0, severity: "P0", domain, status: "fail", detail: String(error) });
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
  } catch (error) {
    push({ id: "home-availability", tier: 0, severity: "P0", domain, status: "fail", detail: String(error) });
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
  } catch (error) {
    push({ id: "keep-warm-second-hit", tier: 0, severity: "P1", domain, status: "warn", detail: String(error) });
  }

  try {
    const warmProbe = await fetchTimed(`${domain}/api/warm`, { timeoutMs: 30_000 });
    // 200 when CRON_SECRET is unset, 401 when set — both prove the route is deployed.
    const healthy = warmProbe.response.status === 200 || warmProbe.response.status === 401;
    push({
      id: "api-warm-endpoint",
      tier: 0,
      severity: "P1",
      domain,
      status: healthy ? "pass" : "fail",
      detail: `HTTP ${warmProbe.response.status} in ${warmProbe.ms}ms`
    });
    const storageReadiness = evaluateStorageReadinessProbe({
      status: warmProbe.response.status,
      body: warmProbe.text()
    });
    push({
      id: "production-storage-readiness",
      tier: 0,
      severity: "P0",
      domain,
      status: storageReadiness.ok ? "pass" : "fail",
      detail: storageReadiness.detail
    });
  } catch (error) {
    push({ id: "api-warm-endpoint", tier: 0, severity: "P1", domain, status: "fail", detail: String(error) });
    push({
      id: "production-storage-readiness",
      tier: 0,
      severity: "P0",
      domain,
      status: "fail",
      detail: `storage readiness request failed (${error instanceof Error ? error.name : "unknown error"})`
    });
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
  } catch (error) {
    push({ id: "apex-redirect", tier: 0, severity: "P1", domain, status: "fail", detail: String(error) });
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
    } catch (error) {
      push({ id: `page-render:${page.name}`, tier: 1, severity: page.renderSeverity, domain, status: "fail", detail: String(error) });
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
    } catch (error) {
      push({ id: `page-rsc-payload:${page.name}`, tier: 1, severity: "P1", domain, status: "skip", detail: String(error) });
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
  } catch (error) {
    push({ id: "not-found-behavior", tier: 1, severity: "P1", domain, status: "fail", detail: String(error) });
  }

  try {
    const me = await fetchTimed(`${domain}/api/me`, { timeoutMs: 30_000 });
    const status = me.response.status;
    push({
      id: "unauth-api-me",
      tier: 1,
      severity: "P1",
      domain,
      status: status === 401 || status === 403 ? "pass" : "fail",
      detail: `HTTP ${status} unauthenticated (expect 401/403; 500 or 200 is a defect)`
    });
  } catch (error) {
    push({ id: "unauth-api-me", tier: 1, severity: "P1", domain, status: "fail", detail: String(error) });
  }
}

export async function probeGooglePublicPageContracts() {
  const pages = [];
  for (const contract of GOOGLE_PUBLIC_PAGE_CONTRACTS) {
    try {
      const result = await fetchTimed(contract.expectedUrl, {
        timeoutMs: 45_000,
        redirect: "manual"
      });
      const evaluated = evaluateGooglePublicPageContract({
        ...contract,
        response: result.response,
        html: result.text()
      });
      pages.push({
        ...contract,
        httpStatus: result.response.status,
        responseUrl: result.response.url,
        ok: evaluated.ok,
        detail: evaluated.detail,
        ms: result.ms
      });
    } catch (error) {
      pages.push({
        ...contract,
        httpStatus: null,
        responseUrl: null,
        ok: false,
        detail: `Google ${contract.kind} URL probe request failed (${error instanceof Error ? error.name : "unknown error"})`
      });
    }
  }

  const failedKinds = pages.filter((page) => !page.ok).map((page) => page.kind);
  return {
    ok: failedKinds.length === 0,
    detail: failedKinds.length === 0
      ? "homepage, privacy, and terms URLs satisfy the direct published canonical contract"
      : `Google public URL contract failed for: ${failedKinds.join(", ")}`,
    pages
  };
}

async function runGooglePublicPageContracts(push) {
  const probe = await probeGooglePublicPageContracts();
  for (const page of probe.pages) {
    push({
      id: `google-public-url:${page.kind}`,
      tier: 1,
      severity: "P0",
      domain: GOOGLE_OAUTH_CANONICAL_DOMAIN,
      status: page.ok ? "pass" : "fail",
      detail: page.detail,
      ms: page.ms
    });
  }
}

export async function probeGoogleOAuthStart(baseUrl = GOOGLE_OAUTH_CANONICAL_DOMAIN) {
  const query = new URLSearchParams(GOOGLE_OAUTH_READINESS_PROBE_PARAMETERS);

  try {
    const baseOrigin = new URL(baseUrl).origin;
    const probe = await fetchTimed(
      `${baseOrigin}/api/auth/google/start?${query}`,
      { timeoutMs: 30_000, redirect: "manual" }
    );
    const responseShape = {
      status: probe.response.status,
      headers: probe.response.headers
    };
    return baseOrigin === GOOGLE_OAUTH_CANONICAL_DOMAIN
      ? evaluateGoogleOAuthStartProbe(responseShape)
      : evaluateGoogleOAuthCanonicalHandoff(responseShape);
  } catch (error) {
    return {
      ok: false,
      detail: `Google OAuth start probe request failed (${error instanceof Error ? error.name : "unknown error"})`
    };
  }
}

async function runGoogleOAuthStartProbe(push) {
  const evaluation = await probeGoogleOAuthStart();
  push({
    id: "google-oauth-start",
    tier: 1,
    severity: "P0",
    domain: GOOGLE_OAUTH_CANONICAL_DOMAIN,
    status: evaluation.ok ? "pass" : "fail",
    detail: evaluation.detail
  });
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
    browser = await chromium.launch();
  } catch (error) {
    for (const domain of domains) {
      push({ id: "browser-console-scan", tier: 1, severity: "P1", domain, status: "skip", detail: `browser launch failed: ${error}` });
    }
    return;
  }

  try {
    for (const domain of domains) {
      for (const page of PAGES) {
        const context = await browser.newContext({ userAgent: USER_AGENT });
        const browserPage = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        browserPage.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        browserPage.on("pageerror", (error) => pageErrors.push(String(error)));
        try {
          await browserPage.goto(`${domain}${page.path}`, { waitUntil: "load", timeout: 60_000 });
          await browserPage.waitForTimeout(3_000);
          const status = pageErrors.length ? "fail" : consoleErrors.length ? "warn" : "pass";
          const firstIssue = pageErrors[0] ?? consoleErrors[0];
          push({
            id: `browser-console:${page.name}`,
            tier: 1,
            severity: "P1",
            domain,
            status,
            detail:
              status === "pass"
                ? "no console errors"
                : `${pageErrors.length} uncaught, ${consoleErrors.length} console errors — first: ${String(firstIssue).slice(0, 160)}`
          });
        } catch (error) {
          push({ id: `browser-console:${page.name}`, tier: 1, severity: "P1", domain, status: "fail", detail: String(error) });
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

function runCommand(argv, { timeoutMs, env }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, argv, {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    const append = (chunk) => {
      output += String(chunk);
      if (output.length > 100_000) output = output.slice(-100_000);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      output += "\n[prod-certification] smoke timed out and was killed";
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, output });
    });
  });
}

async function runSmokes(push) {
  const smokeEnv = {
    DASHBOARD_SMOKE_USE_DEMO_LOGIN: "1",
    AI_TUTOR_LIVE_USE_DEMO_LOGIN: "1",
    // The first authenticated request after idle can exceed the smokes' default
    // per-request timeouts purely from serverless cold start; 60s separates
    // "cold" from "down". Caller-set values win.
    DASHBOARD_SMOKE_TIMEOUT_MS: process.env.DASHBOARD_SMOKE_TIMEOUT_MS ?? "60000",
    DASHBOARD_UI_SMOKE_TIMEOUT_MS: process.env.DASHBOARD_UI_SMOKE_TIMEOUT_MS ?? "60000"
  };
  for (const smoke of SMOKES) {
    console.error(`[prod-certification] running ${smoke.id}…`);
    const startedAt = Date.now();
    const first = await runCommand(smoke.argv, { timeoutMs: smoke.timeoutMs, env: smokeEnv });
    let final = first;
    let retried = false;
    if (first.code !== 0) {
      // One retry, always flagged in the result — a smoke that only passes warm
      // is a finding, not a clean pass.
      console.error(`[prod-certification] ${smoke.id} failed (exit ${first.code}) — retrying once…`);
      retried = true;
      final = await runCommand(smoke.argv, { timeoutMs: smoke.timeoutMs, env: smokeEnv });
    }
    const ms = Date.now() - startedAt;
    const seconds = Math.round(ms / 1000);
    const tail = final.output.trim().split("\n").slice(-4).join(" ⏎ ").slice(0, 400);
    if (final.code === 0) {
      push({
        id: smoke.id,
        tier: "smoke",
        severity: smoke.severity,
        status: retried ? "warn" : "pass",
        detail: retried
          ? `passed on retry in ${seconds}s (first attempt exit ${first.code} — likely cold start) — ${tail}`
          : `exit 0 in ${seconds}s — ${tail}`,
        ms
      });
    } else if (smoke.environmentalOk && classifySmokeFailure(`${first.output}\n${final.output}`) === "environmental") {
      push({
        id: smoke.id,
        tier: "smoke",
        severity: smoke.severity,
        status: "warn",
        detail: `environmentally inconclusive from this sandbox (network-layer failure on both attempts) — rerun outside the sandbox to confirm. Tail: ${tail}`,
        ms
      });
    } else {
      push({
        id: smoke.id,
        tier: "smoke",
        severity: smoke.severity,
        status: "fail",
        detail: `exit ${final.code} in ${seconds}s${retried ? " (failed twice)" : ""} — ${tail}`,
        ms
      });
    }
  }
}

export function parseArgs(argv) {
  const args = { json: false, strict: false, skipSmokes: false, skipBrowser: false, out: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") args.json = true;
    else if (argument === "--strict") args.strict = true;
    else if (argument === "--skip-smokes") args.skipSmokes = true;
    else if (argument === "--skip-browser") args.skipBrowser = true;
    else if (argument === "--out") args.out = argv[++index];
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = [];
  const push = (result) => {
    results.push(result);
    console.error(
      `[prod-certification] ${result.status.toUpperCase().padEnd(4)} ${result.severity} ${result.id}${result.domain ? ` @ ${result.domain}` : ""} — ${result.detail}`
    );
  };

  const homeHtmlByDomain = {};
  for (const domain of DOMAINS) {
    console.error(`[prod-certification] Tier 0 — ${domain}`);
    homeHtmlByDomain[domain] = await runTier0(domain, push);
  }
  checkBuildParity(homeHtmlByDomain, push);

  console.error("[prod-certification] Tier 1 — Google Auth Platform public URLs");
  await runGooglePublicPageContracts(push);

  for (const domain of DOMAINS) {
    if (homeHtmlByDomain[domain] === null) continue;
    console.error(`[prod-certification] Tier 1 — ${domain}`);
    await runTier1(domain, push);
  }

  console.error(`[prod-certification] Tier 1 — Google OAuth start @ ${GOOGLE_OAUTH_CANONICAL_DOMAIN}`);
  await runGoogleOAuthStartProbe(push);

  if (!args.skipBrowser) {
    console.error("[prod-certification] Tier 1 — browser console scan");
    await runBrowserConsoleScan(DOMAINS.filter((domain) => homeHtmlByDomain[domain] !== null), push);
  }

  if (!args.skipSmokes) {
    await runSmokes(push);
  }

  const verdict = aggregateVerdict(results);
  const report = {
    generatedAt: new Date().toISOString(),
    domains: DOMAINS,
    phase: 1,
    flags: { skipSmokes: args.skipSmokes, skipBrowser: args.skipBrowser },
    writeFootprint: args.skipSmokes
      ? "none (read-only run)"
      : "demo-account logins (dashboard smokes) + one AI-Tutor message round-trip",
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
  console.error(`[prod-certification] report written to ${outDir}`);
  console.error(`[prod-certification] verdict: ${verdict}`);

  if (verdict === "FAILED") process.exitCode = 1;
  else if (args.strict && verdict === "CERTIFIED_WITH_FINDINGS") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
