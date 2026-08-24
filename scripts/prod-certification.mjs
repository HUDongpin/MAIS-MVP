#!/usr/bin/env node
// Production certification — Phase 1, strictly read-only.
// Tier 0 (infrastructure), Tier 1 (unauthenticated surface), parent/login contracts,
// and explicit release-binding probes compose one point-in-time verdict.
//
// Usage:
//   npm run certify:production -- --candidate-sha <40-hex> --deployment-id <dpl_id> \
//     --deployment-url https://<deployment>.vercel.app --build-id <next-build-id>
//   node scripts/prod-certification.mjs <binding args> --skip-browser --json
//
// Verdict policy: a P0 failure fails certification; every other failure, warning,
// or skip downgrades to CERTIFIED_WITH_FINDINGS. Strict mode is the non-disableable
// default, so both FAILED and CERTIFIED_WITH_FINDINGS exit nonzero.
//
// Remote write footprint: none. This script issues only GET/HEAD requests and never
// authenticates. The write-authorization arguments establish a fail-closed contract
// for future, separate synthetic-family probes; Phase 1 executes no write probe.

import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT = "MAIS-prod-certification/phase1";

export const DOMAINS = ["https://www.mais.ac", "https://www.mais.hk"];
const APEX_OF = {
  "https://www.mais.ac": "https://mais.ac",
  "https://www.mais.hk": "https://mais.hk"
};

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
    `- Next BUILD_ID: ${report.releaseBinding.buildId}`,
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
  } catch (error) {
    push({ id: "api-warm-endpoint", tier: 0, severity: "P1", domain, status: "fail", detail: String(error) });
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
    const contract = inspectCacheCookieContract(me.response.headers);
    push({
      id: "unauth-api-me",
      tier: 1,
      severity: "P1",
      domain,
      status: (status === 401 || status === 403) && contract.ok ? "pass" : "fail",
      detail: `HTTP ${status} unauthenticated; ${contract.ok ? "no-store, no cookie" : `contract missing ${contract.missing.join(", ")}`}`
    });
  } catch (error) {
    push({ id: "unauth-api-me", tier: 1, severity: "P1", domain, status: "fail", detail: String(error) });
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
  } catch (error) {
    push({ id: "unauth-parent-foundation", tier: 1, severity: "P0", domain, status: "fail", detail: String(error) });
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
  } catch (error) {
    push({ id: "unauth-parent-entry", tier: 1, severity: "P0", domain, status: "fail", detail: String(error) });
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
    throw new Error("--build-id must be an 8-128 character Next BUILD_ID.");
  }
  return {
    candidateSha: releaseBinding.candidateSha.toLowerCase(),
    deploymentId: releaseBinding.deploymentId,
    deploymentUrl,
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
    else if (argument === "--build-id") args.releaseBinding.buildId = readRequiredArgument(argv, index++, argument);
    else if (argument === "--allow-production-writes") args.rawWriteAuthorization.allowProductionWrites = true;
    else if (argument === "--synthetic-test-family-id") {
      args.rawWriteAuthorization.syntheticFamilyId = readRequiredArgument(argv, index++, argument);
    } else if (argument === "--write-target") {
      args.rawWriteAuthorization.writeTarget = readRequiredArgument(argv, index++, argument);
    } else if (argument === "--synthetic-test-family-confirmation") {
      args.rawWriteAuthorization.confirmation = readRequiredArgument(argv, index++, argument);
    }
    else throw new Error(`Unknown argument: ${argument}`);
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
  { localSha, localBuildId, attestation }
) {
  if (localSha !== releaseBinding.candidateSha) {
    throw new Error("Candidate binding failed: --candidate-sha does not equal the local release-source HEAD.");
  }
  if (localBuildId !== releaseBinding.buildId) {
    throw new Error("Build binding failed: --build-id does not equal the local .next/BUILD_ID.");
  }

  const buildStartedAt = Date.parse(attestation?.buildStartedAt ?? "");
  const completedAt = Date.parse(attestation?.completedAt ?? "");
  const attestationMatches =
    attestation?.schemaVersion === 1 &&
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

  return {
    ...releaseBinding,
    localHeadMatched: true,
    localBuildIdMatched: true,
    localBuildAttestationMatched: true,
    buildStartedAt: attestation.buildStartedAt,
    completedAt: attestation.completedAt
  };
}

function assertLocalReleaseBinding(releaseBinding) {
  const localSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: REPO_ROOT,
    encoding: "utf8"
  }).trim().toLowerCase();

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
    attestation
  });
}

function responseBindingHeader(headers, names) {
  for (const name of names) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

async function runLiveBuildBinding(releaseBinding, push) {
  const origins = [releaseBinding.deploymentUrl, ...DOMAINS];
  const candidateHeaders = [];
  const deploymentHeaders = [];
  for (const origin of origins) {
    const manifestUrl = `${origin}/_next/static/${encodeURIComponent(releaseBinding.buildId)}/_buildManifest.js`;
    try {
      const result = await fetchTimed(manifestUrl, { timeoutMs: 30_000 });
      const contentType = (result.response.headers.get("content-type") ?? "").toLowerCase();
      const noCookie = !result.response.headers.get("set-cookie");
      const healthy = result.response.ok && /javascript|text\/plain/u.test(contentType) && noCookie;
      push({
        id: "live-build-manifest-binding",
        tier: 0,
        severity: "P0",
        domain: origin,
        status: healthy ? "pass" : "fail",
        detail: `HTTP ${result.response.status}; BUILD_ID path ${healthy ? "present with no cookie" : "failed content/cookie contract"}`
      });

      const cacheControl = (result.response.headers.get("cache-control") ?? "").toLowerCase();
      push({
        id: "live-build-manifest-cache",
        tier: 0,
        severity: "P1",
        domain: origin,
        status: /public|immutable|max-age=/u.test(cacheControl) && noCookie ? "pass" : "warn",
        detail: noCookie ? "static response cookie-free; cache policy inspected" : "unexpected Set-Cookie on static build asset"
      });

      const candidate = responseBindingHeader(result.response.headers, [
        "x-mais-candidate-sha",
        "x-vercel-git-commit-sha"
      ]);
      const deployment = responseBindingHeader(result.response.headers, [
        "x-mais-deployment-id",
        "x-vercel-deployment-id"
      ]);
      if (candidate) candidateHeaders.push(candidate.toLowerCase());
      if (deployment) deploymentHeaders.push(deployment);
    } catch (error) {
      push({
        id: "live-build-manifest-binding",
        tier: 0,
        severity: "P0",
        domain: origin,
        status: "fail",
        detail: String(error)
      });
    }
  }

  const candidateMismatch = candidateHeaders.some((value) => value !== releaseBinding.candidateSha);
  const deploymentMismatch = deploymentHeaders.some((value) => value !== releaseBinding.deploymentId);
  const metadataComplete = candidateHeaders.length > 0 && deploymentHeaders.length > 0;
  push({
    id: "live-release-metadata-binding",
    tier: 0,
    severity: "P0",
    status: candidateMismatch || deploymentMismatch ? "fail" : metadataComplete ? "pass" : "warn",
    detail: candidateMismatch || deploymentMismatch
      ? "candidate or deployment response metadata mismatched the supplied binding"
      : metadataComplete
        ? "candidate SHA and deployment ID response metadata matched"
        : "live response metadata did not expose both candidate SHA and deployment ID; BUILD_ID path evidence remains separate"
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const releaseBinding = assertLocalReleaseBinding(args.releaseBinding);
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
    detail: "candidate SHA matched local HEAD and BUILD_ID matched the fresh local build"
  });
  await runLiveBuildBinding(releaseBinding, push);

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
  }

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
      : "none (GET/HEAD only; no authentication and no mutating route)",
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
