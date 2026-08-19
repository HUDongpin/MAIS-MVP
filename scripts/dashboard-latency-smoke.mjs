#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_BASE_URL = "https://mais.ac";
const DEFAULT_ARTIFACT_DIR = path.join(REPO_ROOT, ".tmp", "dashboard-latency-smoke");
const DEMO_LOGIN = {
  password: "12345",
  username: "Student Shirleen"
};

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.DASHBOARD_SMOKE_BASE_URL || DEFAULT_BASE_URL,
    cookie: process.env.DASHBOARD_SMOKE_COOKIE || "",
    grade: process.env.DASHBOARD_SMOKE_GRADE || "P1",
    json: false,
    password: process.env.DASHBOARD_SMOKE_PASSWORD || "",
    samples: boundedInteger(process.env.DASHBOARD_SMOKE_SAMPLES, 3, 1, 20),
    selfTest: false,
    username: process.env.DASHBOARD_SMOKE_USERNAME || ""
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
    } else if (arg === "--samples") {
      args.samples = boundedInteger(argv[++index], args.samples, 1, 20);
    } else if (arg === "--self-test") {
      args.selfTest = true;
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
  const bypassSecret = process.env.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET
    || process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypassSecret) headers["x-vercel-protection-bypass"] = bypassSecret;
  return headers;
}

function demoLoginEnabled(env = process.env) {
  return env.DASHBOARD_SMOKE_USE_DEMO_LOGIN === "1";
}

function dashboardSmokeCredentials(args) {
  if (args.username && args.password) {
    return {
      authMode: "username-password",
      password: args.password,
      username: args.username
    };
  }

  if (demoLoginEnabled()) {
    return {
      authMode: "demo-login",
      ...DEMO_LOGIN
    };
  }

  return null;
}

function smokeConfig(args) {
  return {
    artifactDir: process.env.DASHBOARD_SMOKE_ARTIFACT_DIR || DEFAULT_ARTIFACT_DIR,
    baseUrl: normalizeBaseUrl(args.baseUrl),
    dashboardThresholdMs: boundedInteger(process.env.DASHBOARD_SMOKE_DASHBOARD_P95_MS, 2_500, 500, 60_000),
    grade: args.grade,
    samples: args.samples,
    secondaryThresholdMs: boundedInteger(process.env.DASHBOARD_SMOKE_SECONDARY_P95_MS, 5_000, 500, 60_000),
    sessionThresholdMs: boundedInteger(process.env.DASHBOARD_SMOKE_SESSION_P95_MS, 2_000, 500, 60_000),
    timeoutMs: boundedInteger(process.env.DASHBOARD_SMOKE_TIMEOUT_MS, 20_000, 1_000, 120_000)
  };
}

function dashboardEndpoints(config) {
  return [
    {
      name: "session",
      path: "/api/me?includeLessonEntry=false",
      thresholdMs: config.sessionThresholdMs
    },
    {
      name: "dashboard",
      path: `/api/dashboard?grade=${encodeURIComponent(config.grade)}`,
      thresholdMs: config.dashboardThresholdMs
    },
    {
      name: "assignments",
      path: "/api/assignments",
      thresholdMs: config.secondaryThresholdMs
    },
    {
      name: "gamification-summary",
      path: "/api/gamification/summary",
      thresholdMs: config.secondaryThresholdMs
    },
    {
      name: "rewards",
      path: "/api/rewards",
      thresholdMs: config.secondaryThresholdMs
    }
  ];
}

async function timedFetch(url, { body, headers = {}, method = "GET", timeoutMs = 20_000 } = {}) {
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
  } finally {
    clearTimeout(timeout);
  }
}

async function loginCookie(args, config) {
  if (args.cookie) {
    return {
      authMode: "cookie",
      baseUrl: config.baseUrl,
      cookie: args.cookie
    };
  }
  const credentials = dashboardSmokeCredentials(args);
  if (!credentials) {
    throw new Error("Dashboard smoke requires DASHBOARD_SMOKE_COOKIE, DASHBOARD_SMOKE_USERNAME/DASHBOARD_SMOKE_PASSWORD, or DASHBOARD_SMOKE_USE_DEMO_LOGIN=1.");
  }

  const response = await timedFetch(`${config.baseUrl}/api/auth/login`, {
    body: JSON.stringify({
      curriculumTrack: process.env.DASHBOARD_SMOKE_CURRICULUM_TRACK || "US_CA_MATH",
      grade: config.grade,
      language: process.env.DASHBOARD_SMOKE_LANGUAGE || "en",
      password: credentials.password,
      username: credentials.username
    }),
    headers: {
      "Content-Type": "application/json",
      ...authHeaders("")
    },
    method: "POST",
    timeoutMs: config.timeoutMs
  });

  if (!response.ok) {
    throw new Error(`Dashboard smoke login failed with HTTP ${response.status}.`);
  }

  const cookie = cookieHeaderFromSetCookie(response.headers);
  if (!cookie) throw new Error("Dashboard smoke login succeeded but no session cookie was returned.");
  return {
    authMode: credentials.authMode,
    baseUrl: normalizeBaseUrl(new URL(response.finalUrl || config.baseUrl).origin),
    cookie
  };
}

async function sampleEndpoint(endpoint, config, baseUrl, cookie) {
  const samples = [];
  for (let index = 0; index < config.samples; index += 1) {
    const response = await timedFetch(`${baseUrl}${endpoint.path}`, {
      headers: authHeaders(cookie),
      timeoutMs: config.timeoutMs
    });
    samples.push({
      elapsedMs: response.elapsedMs,
      ok: response.ok,
      status: response.status
    });
  }

  const durations = samples.map((sample) => sample.elapsedMs);
  const p95 = percentile(durations, 95);
  const ok = samples.every((sample) => sample.ok) && p95 !== null && p95 <= endpoint.thresholdMs;
  return {
    ...endpoint,
    maxMs: Math.max(...durations),
    ok,
    p50Ms: percentile(durations, 50),
    p95Ms: p95,
    samples,
    statuses: [...new Set(samples.map((sample) => sample.status))]
  };
}

async function runSmoke(args) {
  const config = smokeConfig(args);
  const session = await loginCookie(args, config);
  const endpoints = dashboardEndpoints(config);
  const results = [];

  for (const endpoint of endpoints) {
    results.push(await sampleEndpoint(endpoint, config, session.baseUrl, session.cookie));
  }

  const report = {
    authMode: session.authMode,
    baseUrl: session.baseUrl,
    requestedBaseUrl: config.baseUrl,
    grade: config.grade,
    generatedAt: new Date().toISOString(),
    ok: results.every((result) => result.ok),
    results,
    samples: config.samples
  };

  await fs.mkdir(config.artifactDir, { recursive: true });
  await fs.writeFile(path.join(config.artifactDir, "last-run.json"), `${JSON.stringify(report, null, 2)}\n`);

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Dashboard latency smoke: ${report.ok ? "PASS" : "FAIL"} ${session.baseUrl} grade=${config.grade} samples=${config.samples}`);
    if (session.baseUrl !== config.baseUrl) {
      console.log(`Resolved base URL after login redirect: ${config.baseUrl} -> ${session.baseUrl}`);
    }
    for (const result of results) {
      console.log(
        `${result.ok ? "PASS" : "FAIL"} ${result.name}: p50=${result.p50Ms}ms p95=${result.p95Ms}ms max=${result.maxMs}ms threshold=${result.thresholdMs}ms status=${result.statuses.join("/")}`
      );
    }
    console.log(`Artifact: ${path.join(config.artifactDir, "last-run.json")}`);
  }

  if (!report.ok) process.exitCode = 1;
}

function runSelfTest() {
  assert.equal(stripTrailingSlash("https://mais.ac///"), "https://mais.ac");
  assert.equal(normalizeBaseUrl("http://localhost:3001/"), "http://127.0.0.1:3001");
  assert.equal(percentile([100, 200, 300], 95), 300);
  assert.equal(percentile([100, 200, 300], 50), 200);
  const headers = {
    get: (name) => name.toLowerCase() === "set-cookie" ? "a=1; Path=/, b=2; Path=/" : null
  };
  assert.equal(cookieHeaderFromSetCookie(headers), "a=1; b=2");
  const defaultConfig = smokeConfig({ baseUrl: DEFAULT_BASE_URL, grade: "P1", samples: 1 });
  const defaultEndpoints = dashboardEndpoints(defaultConfig);
  assert.equal(defaultEndpoints.some((endpoint) => endpoint.name === "dashboard"), true);
  assert.equal(defaultConfig.dashboardThresholdMs, 2_500, "single-user dashboard p95 budget");
  assert.equal(defaultConfig.sessionThresholdMs, 2_000, "single-user session p95 budget");
  assert.equal(defaultConfig.secondaryThresholdMs, 5_000, "single-user secondary p95 budget");
  assert.equal(defaultEndpoints.find((endpoint) => endpoint.name === "dashboard").thresholdMs, 2_500);
  assert.equal(defaultEndpoints.find((endpoint) => endpoint.name === "session").thresholdMs, 2_000);
  assert.equal(defaultEndpoints.find((endpoint) => endpoint.name === "rewards").thresholdMs, 5_000);

  // The env overrides are the documented escape hatch for a knowingly-slow
  // period; a lowered default must never take that away.
  const originalDashboardBudget = process.env.DASHBOARD_SMOKE_DASHBOARD_P95_MS;
  process.env.DASHBOARD_SMOKE_DASHBOARD_P95_MS = "9000";
  assert.equal(
    smokeConfig({ baseUrl: DEFAULT_BASE_URL, grade: "P1", samples: 1 }).dashboardThresholdMs,
    9_000,
    "DASHBOARD_SMOKE_DASHBOARD_P95_MS still overrides the default"
  );
  if (originalDashboardBudget === undefined) {
    delete process.env.DASHBOARD_SMOKE_DASHBOARD_P95_MS;
  } else {
    process.env.DASHBOARD_SMOKE_DASHBOARD_P95_MS = originalDashboardBudget;
  }
  assert.equal(dashboardSmokeCredentials({ username: "", password: "" }), null);
  assert.equal(dashboardSmokeCredentials({ username: "student", password: "secret" }).authMode, "username-password");
  const originalDemoFlag = process.env.DASHBOARD_SMOKE_USE_DEMO_LOGIN;
  process.env.DASHBOARD_SMOKE_USE_DEMO_LOGIN = "1";
  assert.equal(dashboardSmokeCredentials({ username: "", password: "" }).authMode, "demo-login");
  if (originalDemoFlag === undefined) {
    delete process.env.DASHBOARD_SMOKE_USE_DEMO_LOGIN;
  } else {
    process.env.DASHBOARD_SMOKE_USE_DEMO_LOGIN = originalDemoFlag;
  }
  console.log("dashboard-latency-smoke self-test: PASS");
}

const args = parseArgs(process.argv.slice(2));
if (args.selfTest) {
  runSelfTest();
} else {
  await runSmoke(args);
}
