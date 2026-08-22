#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, rmSync, mkdirSync, symlinkSync } from "node:fs";
import path from "node:path";
import { rejectDirectBrowserEntry } from "./reject-direct-browser-entry.mjs";

const cwd = process.cwd();
const args = parseArgs(process.argv.slice(2));
const runBrowser = Boolean(args.browser);
if (runBrowser) rejectDirectBrowserEntry("verify-google-oauth-slice --browser");
const port = Number(args.port ?? 3057);
const baseUrl = `http://127.0.0.1:${port}`;
const authSessionSecretFixture = crypto.randomUUID().replaceAll("-", "");
const googleClientSecretFixture = crypto.randomUUID().replaceAll("-", "");
const redactedEnv = {
  AUTH_SESSION_SECRET: authSessionSecretFixture,
  GOOGLE_OAUTH_ENABLED: "true",
  GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
  GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
  GOOGLE_OAUTH_REDIRECT_URI: `${baseUrl}/api/auth/google/callback`
};

runStep("A19 readiness self-test", [process.execPath, ["scripts/check-google-oauth-readiness.mjs", "--self-test"]]);

  runExpectedFailure(
    "A19 example env stays fail-closed",
    process.execPath,
    ["scripts/check-google-oauth-readiness.mjs", "--env-file", ".env.local.example", "--mode", "local"]
  );

  runStep("A19 redacted local readiness", [
    process.execPath,
    ["scripts/check-google-oauth-readiness.mjs", "--env-file", "/dev/null", "--mode", "local"],
    { env: { ...process.env, ...redactedEnv } }
  ]);

  runStep("A11/A12 Google auth TypeScript compile", ["npx", ["tsc", "-p", "tsconfig.google-auth-tests.json"]], {
    before: prepareCompiledTestLinks
  });

  runStep("A11/A12 Google auth Node tests", [
    process.execPath,
    [
      "--test",
      ".tmp/google-auth-tests/app/api/auth/google/start/route.test.js",
      ".tmp/google-auth-tests/app/api/auth/google/callback/route.test.js",
      ".tmp/google-auth-tests/lib/server/googleOAuth.test.js",
      ".tmp/google-auth-tests/lib/server/userStoreGoogleAuth.test.js"
    ]
  ], {
    before: createCompiledTestLinks
  });

  runStep("A22 diff check", ["git", ["diff", "--check"]]);

  console.log("A11 browser smoke is owner-runner only; the direct --browser entry is disabled.");

  console.log("Google OAuth slice verification: pass");

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function runStep(label, commandTuple, options = {}) {
  console.log(`\n== ${label} ==`);
  options.before?.();
  const [command, commandArgs, spawnOptions = {}] = commandTuple;
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: process.env,
    stdio: "inherit",
    ...spawnOptions
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function runExpectedFailure(label, command, commandArgs) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: process.env,
    stdio: "inherit"
  });
  if (result.status === 0) {
    throw new Error(`${label} unexpectedly passed.`);
  }
  console.log(`${label}: blocked as expected`);
}

function prepareCompiledTestLinks() {
  rmSync(path.join(cwd, ".tmp", "google-auth-tests"), { recursive: true, force: true });
}

function createCompiledTestLinks() {
  const aliasDir = path.join(cwd, ".tmp", "google-auth-tests", "node_modules", "@");
  mkdirSync(aliasDir, { recursive: true });
  for (const name of ["components", "lib", "data", "types"]) {
    const target = path.join(aliasDir, name);
    if (!existsSync(target)) symlinkSync(`../../${name}`, target);
  }
}
