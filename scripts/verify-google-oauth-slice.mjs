#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import ts from "typescript";

import { createGoogleOAuthE2ePathEnvironment } from "./google-oauth-e2e-environment.mjs";

const cwd = process.cwd();
const args = parseArgs(process.argv.slice(2));
const runBrowser = Boolean(args.browser);
const requestedPort = parsePort(args.port);
const port = requestedPort ?? (runBrowser ? await findAvailablePort() : 3057);
const runId = buildRunId(args["run-id"] ?? process.env.PLAYWRIGHT_RUN_ID);
const baseUrl = `http://127.0.0.1:${port}`;
const compiledTestRoot = path.join(".tmp", `google-auth-tests-${runId}`);
const e2eRunRoot = path.join(".tmp", `e2e-run-${runId}`);
const browserNextDistDir = path.join(e2eRunRoot, "next-dist");
const browserTsconfigPath = `tsconfig.google-oauth-${runId}.tmp.json`;
const compiledTestRootAbsolute = resolveSafeRunDirectory(compiledTestRoot, `google-auth-tests-${runId}`);
const e2eRunRootAbsolute = resolveSafeRunDirectory(e2eRunRoot, `e2e-run-${runId}`);
const browserTsconfigAbsolute = resolveSafeGeneratedRootFile(browserTsconfigPath, `tsconfig.google-oauth-${runId}.tmp.json`);
const syntheticBaseEnv = withoutCredentialEnv(process.env);
const verificationPathEnv = createGoogleOAuthE2ePathEnvironment({ cwd, e2eRunRoot: e2eRunRootAbsolute });
const isolatedBaseEnv = { ...syntheticBaseEnv, ...verificationPathEnv };
const authSessionSecretFixture = crypto.randomUUID().replaceAll("-", "");
const googleClientSecretFixture = crypto.randomUUID().replaceAll("-", "");
const googleStateSecretFixture = crypto.randomUUID().replaceAll("-", "");
const redactedEnv = {
  AUTH_SESSION_SECRET: authSessionSecretFixture,
  GOOGLE_OAUTH_ENABLED: "true",
  GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
  GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
  GOOGLE_OAUTH_REDIRECT_URI: `${baseUrl}/api/auth/google/callback`,
  GOOGLE_OAUTH_STATE_SECRET: googleStateSecretFixture
};
const isolatedStorageEnv = {
  HK_MATH_STORAGE_PROVIDER: "sqlite",
  POSTGRES_URL: "",
  VERCEL: "",
  VERCEL_ENV: ""
};

let devServer = null;
let nextEnvSnapshot = null;
let verificationPassed = false;

try {
  prepareVerificationPathEnvironment();
  runHarnessSafetySelfTest();
  runStep("A19 readiness self-test", [
    process.execPath,
    ["scripts/check-google-oauth-readiness.mjs", "--self-test"],
    { env: isolatedBaseEnv }
  ]);

  runExpectedFailure(
    "A19 example env stays fail-closed",
    process.execPath,
    ["scripts/check-google-oauth-readiness.mjs", "--env-file", ".env.local.example", "--mode", "local"],
    { env: isolatedBaseEnv }
  );

  runStep("A19 redacted local readiness", [
    process.execPath,
    ["scripts/check-google-oauth-readiness.mjs", "--env-file", "/dev/null", "--mode", "local"],
    { env: { ...isolatedBaseEnv, ...redactedEnv } }
  ]);

  runStep("A11/A12 Google auth TypeScript compile", [
    "npx",
    ["tsc", "-p", "tsconfig.google-auth-tests.json", "--outDir", compiledTestRoot],
    { env: isolatedBaseEnv }
  ], {
    before: prepareCompiledTestLinks
  });

  runStep("A11/A12 Google auth Node tests", [
    process.execPath,
    [
      "--test",
      "--test-concurrency=1",
      path.join(compiledTestRoot, "app/api/auth/google/start/route.test.js"),
      path.join(compiledTestRoot, "app/api/auth/google/callback/route.test.js"),
      path.join(compiledTestRoot, "lib/authRedirect.test.js"),
      path.join(compiledTestRoot, "lib/publicSiteIdentity.test.js"),
      path.join(compiledTestRoot, "lib/server/googleOAuth.test.js"),
      path.join(compiledTestRoot, "lib/server/userStoreGoogleAuth.test.js")
    ],
    { env: { ...isolatedBaseEnv, ...isolatedStorageEnv } }
  ], {
    before: createCompiledTestLinks
  });

  runStep("A10/A22 Google OAuth release contract tests", [
    process.execPath,
    [
      "--test",
      "--test-concurrency=1",
      "scripts/check-google-oauth-legal-approval.test.mjs",
      "scripts/google-oauth-e2e-environment.test.mjs",
      "scripts/release-build-gate.test.mjs",
      "scripts/prod-certification.test.mjs",
      "scripts/deploy-vercel-production.test.mjs"
    ],
    { env: isolatedBaseEnv }
  ]);

  runStep("A19 Google OAuth production env-name contract", [
    process.execPath,
    [
      "--test",
      "--test-name-pattern=production env guard requires every server-side Google OAuth variable",
      "scripts/release-env-guard.test.mjs"
    ],
    { env: isolatedBaseEnv }
  ]);

  runStep("A22 diff check", ["git", ["diff", "--check"]]);

  if (runBrowser) {
    await runBrowserSmoke();
  } else {
    console.log("A11 browser smoke skipped; pass --browser to run Playwright desktop/mobile coverage.");
  }

  console.log("Google OAuth slice verification: pass");
  verificationPassed = true;
} finally {
  try {
    await stopDevServer();
  } finally {
    try {
      restoreNextEnvSnapshot();
    } finally {
      cleanupBrowserTsconfig();
      if (verificationPassed) cleanupSuccessfulRunArtifacts();
    }
  }
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

function parsePort(value) {
  if (value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`--port must be an integer between 1 and 65535; received ${String(value)}.`);
  }
  return parsed;
}

function buildRunId(prefix) {
  const safePrefix = String(prefix ?? "google-oauth")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "google-oauth";
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  return `${safePrefix}-${timestamp}-${process.pid}`;
}

function withoutCredentialEnv(env) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) =>
      !/^(?:AUTH_SESSION_SECRET|GOOGLE_OAUTH_.*|NEXTAUTH_SECRET|NEXT_PUBLIC_.*(?:AUTH|OAUTH).*SECRET)$/iu.test(key)
    )
  );
}

function resolveSafeRunDirectory(relativePath, expectedBasename) {
  const tmpRoot = path.resolve(cwd, ".tmp");
  const absolutePath = path.resolve(cwd, relativePath);
  if (path.dirname(absolutePath) !== tmpRoot || path.basename(absolutePath) !== expectedBasename) {
    throw new Error(`Refusing unsafe Google OAuth generated directory: ${relativePath}`);
  }
  return absolutePath;
}

function resolveSafeGeneratedRootFile(relativePath, expectedBasename) {
  const absolutePath = path.resolve(cwd, relativePath);
  if (
    path.dirname(absolutePath) !== cwd ||
    path.basename(absolutePath) !== expectedBasename ||
    !/^tsconfig\.google-oauth-[a-zA-Z0-9._-]+\.tmp\.json$/u.test(expectedBasename)
  ) {
    throw new Error(`Refusing unsafe Google OAuth generated root file: ${relativePath}`);
  }
  return absolutePath;
}

function runHarnessSafetySelfTest() {
  if (compiledTestRootAbsolute === e2eRunRootAbsolute) {
    throw new Error("Google OAuth verifier generated directories must be distinct.");
  }
  for (const unsafePath of [".", ".tmp", path.join(".tmp", "..")]) {
    let rejected = false;
    try {
      resolveSafeRunDirectory(unsafePath, "never-matches");
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error(`Harness safety self-test accepted unsafe path: ${unsafePath}`);
  }
  try {
    resolveSafeGeneratedRootFile("tsconfig.json", "tsconfig.json");
    throw new Error("Harness safety self-test accepted the shared tsconfig.json file.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("accepted the shared")) throw error;
  }
  const scrubbed = withoutCredentialEnv({
    AUTH_SESSION_SECRET: "fixture",
    GOOGLE_OAUTH_CLIENT_SECRET: "fixture",
    GOOGLE_OAUTH_STATE_SECRET: "fixture",
    NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_SECRET: "fixture",
    PATH: "fixture-path"
  });
  if (Object.keys(scrubbed).some((key) => key !== "PATH") || scrubbed.PATH !== "fixture-path") {
    throw new Error("Harness safety self-test did not isolate credential-shaped environment variables.");
  }
  console.log(`Harness isolation self-test: pass (${runId})`);
}

function cleanupSuccessfulRunArtifacts() {
  rmSync(compiledTestRootAbsolute, { recursive: true, force: true });
  rmSync(e2eRunRootAbsolute, { recursive: true, force: true });
}

function prepareVerificationPathEnvironment() {
  for (const directory of new Set(Object.values(verificationPathEnv))) {
    mkdirSync(directory, { recursive: true });
  }
}

function cleanupBrowserTsconfig() {
  rmSync(browserTsconfigAbsolute, { force: true });
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

function runExpectedFailure(label, command, commandArgs, options = {}) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: options.env ?? process.env,
    stdio: "inherit"
  });
  if (result.status === 0) {
    throw new Error(`${label} unexpectedly passed.`);
  }
  console.log(`${label}: blocked as expected`);
}

function prepareCompiledTestLinks() {
  rmSync(compiledTestRootAbsolute, { recursive: true, force: true });
}

function createCompiledTestLinks() {
  const aliasDir = path.join(cwd, compiledTestRoot, "node_modules", "@");
  mkdirSync(aliasDir, { recursive: true });
  for (const name of ["components", "lib", "data", "types"]) {
    const target = path.join(aliasDir, name);
    if (!existsSync(target)) symlinkSync(`../../${name}`, target);
  }
}

async function runBrowserSmoke() {
  console.log("\n== A11 browser smoke ==");
  await assertPortAvailable(port);

  const browserEnv = {
    ...isolatedBaseEnv,
    ...redactedEnv,
    ...isolatedStorageEnv,
    HK_MATH_DB_DIR: path.join(e2eRunRoot, "db"),
    MAIS_ALLOW_SHARED_LOCAL_E2E_SERVER: "1",
    NEXT_DIST_DIR: browserNextDistDir,
    NEXT_TSCONFIG_PATH: browserTsconfigPath,
    PLAYWRIGHT_BASE_URL: baseUrl,
    PLAYWRIGHT_E2E_ROOT: e2eRunRoot,
    PLAYWRIGHT_NEXT_DIST_DIR: browserNextDistDir,
    PLAYWRIGHT_PORT: String(port),
    PLAYWRIGHT_RUN_ID: runId,
    PLAYWRIGHT_SKIP_WEBSERVER: "1"
  };

  runStep("A22 browser isolation preflight", [
    process.execPath,
    ["scripts/release-env-guard.mjs", "e2e", "--json"],
    { env: browserEnv }
  ]);

  writeBrowserTsconfig();
  snapshotNextEnv();

  devServer = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd,
    env: browserEnv,
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
      env: browserEnv
    }
  ]);
}

function writeBrowserTsconfig() {
  const baseTsconfigPath = path.join(cwd, "tsconfig.json");
  const { config: baseTsconfig, error } = ts.readConfigFile(baseTsconfigPath, (filePath) => readFileSync(filePath, "utf8"));
  if (error || !Array.isArray(baseTsconfig?.exclude)) {
    throw new Error(`Could not read exclude globs from ${baseTsconfigPath} for Google OAuth browser isolation.`);
  }
  writeFileSync(
    browserTsconfigAbsolute,
    `${JSON.stringify({
      extends: "./tsconfig.json",
      compilerOptions: { plugins: [{ name: "next" }] },
      include: [
        "**/*.ts",
        "**/*.tsx",
        "components/visualizations/signature/**/*.jsx",
        "next-env.d.ts",
        `${browserNextDistDir}/types/**/*.ts`
      ],
      exclude: Array.isArray(baseTsconfig.exclude) ? baseTsconfig.exclude : ["node_modules"]
    }, null, 2)}\n`,
    "utf8"
  );
}

function snapshotNextEnv() {
  const nextEnvPath = path.join(cwd, "next-env.d.ts");
  const content = existsSync(nextEnvPath) ? readFileSync(nextEnvPath, "utf8") : null;
  const generatedRouteReference = `/// <reference path="./${browserNextDistDir.split(path.sep).join("/")}/types/routes.d.ts" />`;
  nextEnvSnapshot = {
    existed: existsSync(nextEnvPath),
    nextEnvPath,
    content,
    expectedGeneratedContent: content?.replace(
      /^\/\/\/ <reference path="\.\/.*\/types\/routes\.d\.ts" \/>$/mu,
      generatedRouteReference
    ) ?? generatedRouteReference
  };
}

function restoreNextEnvSnapshot() {
  if (!nextEnvSnapshot) return;
  const currentContent = existsSync(nextEnvSnapshot.nextEnvPath)
    ? readFileSync(nextEnvSnapshot.nextEnvPath, "utf8")
    : null;
  if (
    currentContent !== nextEnvSnapshot.content &&
    currentContent !== nextEnvSnapshot.expectedGeneratedContent
  ) {
    nextEnvSnapshot = null;
    throw new Error("next-env.d.ts changed unexpectedly during Google OAuth browser verification; refusing to overwrite it.");
  }
  if (nextEnvSnapshot.existed) {
    writeFileSync(nextEnvSnapshot.nextEnvPath, nextEnvSnapshot.content, "utf8");
  } else {
    rmSync(nextEnvSnapshot.nextEnvPath, { force: true });
  }
  nextEnvSnapshot = null;
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.once("listening", () => {
      const address = server.address();
      const assignedPort = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) reject(error);
        else if (assignedPort) resolve(assignedPort);
        else reject(new Error("Could not allocate a loopback port for Google OAuth browser verification."));
      });
    });
    server.listen(0, "127.0.0.1");
  });
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

  signalChildProcess(processToStop, "SIGINT");
  if (await waitForChildExit(processToStop, 3000)) return;
  signalChildProcess(processToStop, "SIGTERM");
  if (await waitForChildExit(processToStop, 2000)) return;
  signalChildProcess(processToStop, "SIGKILL");
  await waitForChildExit(processToStop, 1000);
}

function signalChildProcess(child, signal) {
  if (process.platform === "win32") {
    child.kill(signal);
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exited) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.off("exit", onExit);
      resolve(exited);
    };
    const onExit = () => finish(true);
    const timeout = setTimeout(() => {
      finish(false);
    }, timeoutMs);
    child.once("exit", onExit);
    if (child.exitCode !== null || child.signalCode !== null) finish(true);
  });
}
