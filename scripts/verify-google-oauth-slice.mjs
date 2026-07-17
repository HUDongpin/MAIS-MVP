#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync, mkdirSync, symlinkSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const cwd = process.cwd();
const args = parseArgs(process.argv.slice(2));
const runBrowser = Boolean(args.browser);
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

let devServer = null;

try {
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

  if (runBrowser) {
    await runBrowserSmoke();
  } else {
    console.log("A11 browser smoke skipped; pass --browser to run Playwright desktop/mobile coverage.");
  }

  console.log("Google OAuth slice verification: pass");
} finally {
  await stopDevServer();
}

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

async function runBrowserSmoke() {
  console.log("\n== A11 browser smoke ==");
  await assertPortAvailable(port);

  devServer = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd,
    env: {
      ...process.env,
      ...redactedEnv
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32"
  });
  devServer.stdout.on("data", (chunk) => process.stdout.write(chunk));
  devServer.stderr.on("data", (chunk) => process.stderr.write(chunk));

  await waitForReady(`${baseUrl}/login?next=%2Fdashboard`, 120_000);
  runStep("A11 Playwright Google OAuth login entry", [
    "npx",
    ["playwright", "test", "tests/e2e/google-oauth-login.spec.ts"],
    {
      env: {
        ...process.env,
        PLAYWRIGHT_SKIP_WEBSERVER: "1",
        PLAYWRIGHT_BASE_URL: baseUrl
      }
    }
  ]);
}

async function assertPortAvailable(portNumber) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", () => reject(new Error(`Port ${portNumber} is already in use.`)));
    server.once("listening", () => {
      server.close(resolve);
    });
    server.listen(portNumber, "127.0.0.1");
  });
}

async function waitForReady(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Dev server not ready yet.
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stopDevServer() {
  if (!devServer) return;
  const processToStop = devServer;
  devServer = null;

  if (processToStop.killed) return;
  if (process.platform === "win32") {
    processToStop.kill();
  } else {
    try {
      process.kill(-processToStop.pid, "SIGINT");
    } catch {
      processToStop.kill("SIGINT");
    }
  }

  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 5000);
    processToStop.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
