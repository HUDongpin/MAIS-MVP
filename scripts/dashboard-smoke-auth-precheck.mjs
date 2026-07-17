#!/usr/bin/env node
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  return {
    json: argv.includes("--json"),
    selfTest: argv.includes("--self-test")
  };
}

function hasValue(value) {
  return Boolean(String(value ?? "").trim());
}

export function dashboardSmokeAuthStatus(env = process.env) {
  const hasCookie = hasValue(env.DASHBOARD_SMOKE_COOKIE);
  const hasUsername = hasValue(env.DASHBOARD_SMOKE_USERNAME);
  const hasPassword = hasValue(env.DASHBOARD_SMOKE_PASSWORD);
  const hasCredentials = hasUsername && hasPassword;
  const hasDemoLogin = env.DASHBOARD_SMOKE_USE_DEMO_LOGIN === "1";
  const hasBypass = hasValue(env.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET)
    || hasValue(env.VERCEL_AUTOMATION_BYPASS_SECRET);

  return {
    ok: hasCookie || hasCredentials || hasDemoLogin,
    authModes: [
      hasCookie ? "cookie" : null,
      hasCredentials ? "username-password" : null,
      hasDemoLogin ? "demo-login" : null
    ].filter(Boolean),
    variables: {
      DASHBOARD_SMOKE_COOKIE: hasCookie ? "present" : "missing",
      DASHBOARD_SMOKE_USERNAME: hasUsername ? "present" : "missing",
      DASHBOARD_SMOKE_PASSWORD: hasPassword ? "present" : "missing",
      DASHBOARD_SMOKE_USE_DEMO_LOGIN: hasDemoLogin ? "enabled" : "disabled",
      DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET: hasBypass ? "present" : "missing"
    },
    requirement: "Set DASHBOARD_SMOKE_COOKIE, DASHBOARD_SMOKE_USERNAME plus DASHBOARD_SMOKE_PASSWORD, or DASHBOARD_SMOKE_USE_DEMO_LOGIN=1."
  };
}

export function formatDashboardSmokeAuthStatus(status) {
  return [
    `Auth modes: ${status.authModes.length ? status.authModes.join(", ") : "none"}`,
    ...Object.entries(status.variables).map(([name, value]) => `${name}: ${value}`),
    status.ok ? null : status.requirement
  ].filter(Boolean).join("\n");
}

export function assertDashboardSmokeAuthReady({
  context = "Dashboard smoke",
  env = process.env
} = {}) {
  const status = dashboardSmokeAuthStatus(env);
  if (status.ok) return status;

  throw new Error([
    `${context} requires dashboard smoke credentials before creating a Vercel deployment.`,
    formatDashboardSmokeAuthStatus(status)
  ].join("\n"));
}

function printStatus(status, json) {
  if (json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log(`Dashboard smoke auth readiness: ${status.ok ? "PASS" : "FAIL"}`);
  console.log(formatDashboardSmokeAuthStatus(status));
}

function runSelfTest() {
  assert.equal(dashboardSmokeAuthStatus({}).ok, false);
  assert.equal(dashboardSmokeAuthStatus({ DASHBOARD_SMOKE_COOKIE: "cookie" }).ok, true);
  assert.equal(dashboardSmokeAuthStatus({ DASHBOARD_SMOKE_USERNAME: "student", DASHBOARD_SMOKE_PASSWORD: "secret" }).ok, true);
  assert.equal(dashboardSmokeAuthStatus({ DASHBOARD_SMOKE_USE_DEMO_LOGIN: "1" }).ok, true);
  assert.equal(dashboardSmokeAuthStatus({ DASHBOARD_SMOKE_USERNAME: "student" }).ok, false);
  assert.equal(
    dashboardSmokeAuthStatus({ VERCEL_AUTOMATION_BYPASS_SECRET: "secret" }).variables.DASHBOARD_SMOKE_VERCEL_PROTECTION_BYPASS_SECRET,
    "present"
  );
  console.log("dashboard-smoke-auth-precheck self-test: PASS");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    runSelfTest();
  } else {
    const status = dashboardSmokeAuthStatus();
    printStatus(status, args.json);
    if (!status.ok) process.exitCode = 1;
  }
}
