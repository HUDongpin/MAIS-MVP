#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rejectDirectBrowserEntry } from "./reject-direct-browser-entry.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_BASE_URL = "https://mais.ac";
const DEFAULT_ARTIFACT_DIR = path.join(REPO_ROOT, ".tmp", "dashboard-ui-loading-smoke");
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

function bypassHeaders() {
  const bypassSecret = process.env.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET
    || process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return bypassSecret ? { "x-vercel-protection-bypass": bypassSecret } : {};
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
    artifactDir: process.env.DASHBOARD_UI_SMOKE_ARTIFACT_DIR || DEFAULT_ARTIFACT_DIR,
    baseUrl: normalizeBaseUrl(args.baseUrl),
    grade: args.grade,
    loadingHiddenThresholdMs: boundedInteger(process.env.DASHBOARD_UI_SMOKE_LOADING_HIDDEN_MS, 8_000, 500, 60_000),
    readyThresholdMs: boundedInteger(process.env.DASHBOARD_UI_SMOKE_READY_MS, 12_000, 1_000, 90_000),
    timeoutMs: boundedInteger(process.env.DASHBOARD_UI_SMOKE_TIMEOUT_MS, 30_000, 1_000, 120_000)
  };
}

function cookieHeaderToPlaywrightCookies(cookieHeader, baseUrl) {
  const url = new URL(baseUrl);
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      const name = separatorIndex === -1 ? part : part.slice(0, separatorIndex);
      const value = separatorIndex === -1 ? "" : part.slice(separatorIndex + 1);
      return {
        name,
        value,
        domain: url.hostname,
        path: "/",
        httpOnly: false,
        secure: url.protocol === "https:",
        sameSite: "Lax"
      };
    });
}

function loadingTextPattern() {
  return /Loading dashboard data\.\.\.|正在載入儀表板資料\.\.\.|正在载入仪表板资料\.\.\./i;
}

function readyTextPattern() {
  return /Learning Course|學習課程|学习课程|Welcome back|歡迎回來|欢迎回来/i;
}

function loadErrorPattern() {
  return /Could not load dashboard data\.|暫時無法載入學生儀表板資料。|暂时无法载入学生仪表板资料。/i;
}

async function loginBrowserSession(context, args, config) {
  if (args.cookie) {
    await context.addCookies(cookieHeaderToPlaywrightCookies(args.cookie, config.baseUrl));
    return { baseUrl: config.baseUrl, authMode: "cookie" };
  }

  const credentials = dashboardSmokeCredentials(args);
  if (!credentials) {
    throw new Error("Dashboard UI smoke requires DASHBOARD_SMOKE_COOKIE, DASHBOARD_SMOKE_USERNAME/DASHBOARD_SMOKE_PASSWORD, or DASHBOARD_SMOKE_USE_DEMO_LOGIN=1.");
  }

  const response = await context.request.post(`${config.baseUrl}/api/auth/login`, {
    data: {
      curriculumTrack: process.env.DASHBOARD_SMOKE_CURRICULUM_TRACK || "US_CA_MATH",
      grade: config.grade,
      language: process.env.DASHBOARD_SMOKE_LANGUAGE || "en",
      password: credentials.password,
      username: credentials.username
    },
    headers: {
      "Content-Type": "application/json",
      ...bypassHeaders()
    },
    timeout: config.timeoutMs
  });

  if (!response.ok()) {
    throw new Error(`Dashboard UI smoke login failed with HTTP ${response.status()}.`);
  }

  return {
    authMode: credentials.authMode,
    baseUrl: normalizeBaseUrl(new URL(response.url() || config.baseUrl).origin)
  };
}

async function runUiSmoke(args) {
  rejectDirectBrowserEntry(
    `dashboard-ui-loading-smoke${args.json ? " --json" : ""}`
  );
}

function runSelfTest() {
  assert.equal(normalizeBaseUrl("http://localhost:3001/"), "http://127.0.0.1:3001");
  assert.equal(loadingTextPattern().test("Loading dashboard data..."), true);
  assert.equal(loadingTextPattern().test("正在載入儀表板資料..."), true);
  assert.deepEqual(cookieHeaderToPlaywrightCookies("a=1; b=two=2", "https://www.mais.ac").map((cookie) => [cookie.name, cookie.value, cookie.domain]), [
    ["a", "1", "www.mais.ac"],
    ["b", "two=2", "www.mais.ac"]
  ]);
  assert.equal(smokeConfig({ baseUrl: DEFAULT_BASE_URL, grade: "P1" }).loadingHiddenThresholdMs, 8_000);
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
  console.log("dashboard-ui-loading-smoke self-test: PASS");
}

const args = parseArgs(process.argv.slice(2));
if (args.selfTest) {
  runSelfTest();
} else {
  await runUiSmoke(args);
}
