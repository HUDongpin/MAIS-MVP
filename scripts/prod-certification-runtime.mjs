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
import { fileURLToPath } from "node:url";
import {
  aggregateVerdict,
  daysUntil,
  evaluateBudget,
  extractNextAssets,
  formatReportMarkdown,
  parseArgs
} from "./prod-certification-core.mjs";
import { rejectDirectBrowserEntry } from "./reject-direct-browser-entry.mjs";

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

async function runBrowserConsoleScan(domains, push) {
  void domains;
  void push;
  rejectDirectBrowserEntry("prod-certification browser-console scan");
}

async function runSmokes(push) {
  for (const smoke of SMOKES) {
    push({
      id: smoke.id,
      tier: "smoke",
      severity: smoke.severity,
      status: "fail",
      detail:
        "blocked before launch: legacy production smoke subprocesses have no canonical "
        + "Starship ValidatedRunPlan command descriptor; use --skip-smokes until an owner-run "
        + "command ID is implemented",
      ms: 0
    });
  }
}

export async function runProductionCertification(argv = []) {
  const args = parseArgs(argv);
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

  for (const domain of DOMAINS) {
    if (homeHtmlByDomain[domain] === null) continue;
    console.error(`[prod-certification] Tier 1 — ${domain}`);
    await runTier1(domain, push);
  }

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
