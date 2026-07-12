import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const scriptArgs = ["scripts/dashboard-smoke-auth-precheck.mjs", "--json"];

function runPrecheck(env) {
  return spawnSync(process.execPath, scriptArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      ...env
    }
  });
}

test("dashboard smoke auth precheck fails closed without credentials", () => {
  const result = runPrecheck({});
  assert.notEqual(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, false);
  assert.deepEqual(parsed.authModes, []);
  assert.equal(parsed.variables.DASHBOARD_SMOKE_COOKIE, "missing");
  assert.equal(parsed.variables.DASHBOARD_SMOKE_USERNAME, "missing");
  assert.equal(parsed.variables.DASHBOARD_SMOKE_PASSWORD, "missing");
  assert.equal(parsed.variables.DASHBOARD_SMOKE_USE_DEMO_LOGIN, "disabled");
});

test("dashboard smoke auth precheck accepts cookie without leaking the value", () => {
  const result = runPrecheck({ DASHBOARD_SMOKE_COOKIE: "secret-cookie-value" });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.authModes, ["cookie"]);
  assert.equal(parsed.variables.DASHBOARD_SMOKE_COOKIE, "present");
  assert.doesNotMatch(result.stdout, /secret-cookie-value/);
});

test("dashboard smoke auth precheck accepts username and password without leaking values", () => {
  const result = runPrecheck({
    DASHBOARD_SMOKE_USERNAME: "Student Shirleen",
    DASHBOARD_SMOKE_PASSWORD: "secret-password-value"
  });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.authModes, ["username-password"]);
  assert.equal(parsed.variables.DASHBOARD_SMOKE_USERNAME, "present");
  assert.equal(parsed.variables.DASHBOARD_SMOKE_PASSWORD, "present");
  assert.doesNotMatch(result.stdout, /Student Shirleen|secret-password-value/);
});

test("dashboard smoke auth precheck accepts explicit demo login without leaking values", () => {
  const result = runPrecheck({ DASHBOARD_SMOKE_USE_DEMO_LOGIN: "1" });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.authModes, ["demo-login"]);
  assert.equal(parsed.variables.DASHBOARD_SMOKE_USE_DEMO_LOGIN, "enabled");
  assert.doesNotMatch(result.stdout, /12345|Student Shirleen/);
});

test("dashboard smoke auth precheck exports shared redacted helpers", async () => {
  const moduleUrl = pathToFileURL(path.join(repoRoot, "scripts", "dashboard-smoke-auth-precheck.mjs")).href;
  const {
    assertDashboardSmokeAuthReady,
    dashboardSmokeAuthStatus,
    formatDashboardSmokeAuthStatus
  } = await import(moduleUrl);

  const status = dashboardSmokeAuthStatus({ DASHBOARD_SMOKE_COOKIE: "secret-cookie-value" });
  const formatted = formatDashboardSmokeAuthStatus(status);

  assert.equal(status.ok, true);
  assert.match(formatted, /DASHBOARD_SMOKE_COOKIE: present/);
  assert.doesNotMatch(formatted, /secret-cookie-value/);
  assert.throws(
    () => assertDashboardSmokeAuthReady({ context: "Unit test deploy", env: {} }),
    /Unit test deploy requires dashboard smoke credentials/
  );
  assert.equal(dashboardSmokeAuthStatus({ DASHBOARD_SMOKE_USE_DEMO_LOGIN: "1" }).ok, true);
});
