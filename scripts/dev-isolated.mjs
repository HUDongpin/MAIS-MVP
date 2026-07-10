#!/usr/bin/env node
// Launch `next dev` in an isolated build dir + owned port so parallel MAIS
// sessions never rewrite the shared root `.next` (which breaks other sessions'
// `next start` with 400s on hashed chunks and TS6053 during tsc gates).
//
// Usage:
//   node scripts/dev-isolated.mjs [--port 3210] [--dist .tmp/dev-<label>]
// Env overrides: DEV_ISOLATED_PORT, NEXT_DIST_DIR
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const tmpRoot = path.join(repoRoot, ".tmp");
const defaultGraceMs = 2000;

function fail(message) {
  console.error(`dev-isolated: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag !== "--port" && flag !== "--dist") fail(`unknown argument: ${flag}`);
    if (Object.hasOwn(parsed, flag)) fail(`duplicate argument: ${flag}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`${flag} requires a value`);
    parsed[flag] = value;
    index += 1;
  }
  return parsed;
}

function validatedPort(value) {
  if (!/^[1-9]\d*$/.test(value)) fail("port must be a decimal integer from 1 to 65535");
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    fail("port must be a decimal integer from 1 to 65535");
  }
  return String(port);
}

function isProperDescendant(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function resolveThroughExistingAncestor(candidate) {
  const suffix = [];
  let cursor = candidate;
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) fail(`dist cannot be resolved safely: ${candidate}`);
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.resolve(fs.realpathSync.native(cursor), ...suffix);
}

function validatedDistDir(value) {
  if (!value?.trim()) fail("dist must be a proper descendant of repo .tmp");
  const absolute = path.resolve(repoRoot, value);
  if (!isProperDescendant(absolute, tmpRoot)) {
    fail("dist must be a proper descendant of repo .tmp");
  }
  const canonicalRepo = fs.realpathSync.native(repoRoot);
  const canonicalTmp = resolveThroughExistingAncestor(tmpRoot);
  if (canonicalTmp !== path.join(canonicalRepo, ".tmp")) {
    fail("dist symlink escape is outside the canonical repo .tmp");
  }
  const canonicalDist = resolveThroughExistingAncestor(absolute);
  if (!isProperDescendant(canonicalDist, canonicalTmp)) {
    fail("dist symlink escape is outside repo .tmp");
  }
  return path.relative(repoRoot, absolute);
}

function validatedPositiveInteger(value, label, fallback) {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(value)) fail(`${label} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) fail(`${label} must be a positive integer`);
  return parsed;
}

function testOverride(name, fallback) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  if (process.env.NODE_ENV !== "test" || process.env.DEV_ISOLATED_ALLOW_TEST_OVERRIDES !== "1") {
    fail(`${name} is restricted to explicit test overrides`);
  }
  return value;
}

function signalExitCode(signal) {
  return 128 + (os.constants.signals[signal] ?? 1);
}

const args = parseArgs(process.argv.slice(2));
const port = validatedPort(
  args["--port"] ?? process.env.DEV_ISOLATED_PORT ?? String(3200 + (process.pid % 300))
);
const distDir = validatedDistDir(
  args["--dist"] ?? process.env.NEXT_DIST_DIR ?? path.join(".tmp", `dev-${process.pid}`)
);
const shutdownGraceMs = validatedPositiveInteger(
  process.env.DEV_ISOLATED_SHUTDOWN_GRACE_MS,
  "DEV_ISOLATED_SHUTDOWN_GRACE_MS",
  defaultGraceMs
);

const runtimeBin = testOverride("DEV_ISOLATED_RUNTIME_BIN", process.execPath);

const nextBin = require.resolve("next/dist/bin/next");
console.log(`dev-isolated: NEXT_DIST_DIR=${distDir} port=${port}`);
const child = spawn(runtimeBin, [nextBin, "dev", "--port", port], {
  cwd: repoRoot,
  detached: process.platform !== "win32",
  stdio: "inherit",
  env: { ...process.env, NEXT_DIST_DIR: distDir }
});

let finished = false;
let shutdownSignal;
let escalationTimer;
const forwardedSignals = ["SIGINT", "SIGTERM", "SIGHUP"];

function sendToChild(signal) {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") {
      console.error(`dev-isolated: failed to forward ${signal}: ${error?.code ?? "UNKNOWN"}`);
    }
  }
}

function cleanup() {
  if (escalationTimer) clearTimeout(escalationTimer);
  for (const signal of forwardedSignals) process.removeListener(signal, signalHandlers[signal]);
}

function finish(exitCode) {
  if (finished) return;
  finished = true;
  cleanup();
  process.exitCode = exitCode;
}

function handleSignal(signal) {
  if (finished) return;
  if (shutdownSignal) {
    sendToChild("SIGKILL");
    return;
  }
  shutdownSignal = signal;
  sendToChild(signal);
  escalationTimer = setTimeout(() => {
    console.warn(`dev-isolated: ${signal} grace expired; escalating child to SIGKILL`);
    sendToChild("SIGKILL");
  }, shutdownGraceMs);
}

const signalHandlers = Object.fromEntries(
  forwardedSignals.map((signal) => [signal, () => handleSignal(signal)])
);
for (const signal of forwardedSignals) process.on(signal, signalHandlers[signal]);

child.once("error", (error) => {
  console.error(`dev-isolated: failed to start child (${error?.code ?? "UNKNOWN"})`);
  finish(1);
});

child.once("exit", (code, signal) => {
  if (shutdownSignal) finish(signalExitCode(shutdownSignal));
  else if (code !== null) finish(code);
  else finish(signalExitCode(signal));
});
