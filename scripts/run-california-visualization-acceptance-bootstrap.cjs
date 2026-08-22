#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync } = require("node:fs");
const path = require("node:path");

const EXPECTED_WORKTREE_ROOT =
  "/Volumes/Starship/MAIS-MVP/.worktrees/a06-ca-viz-resume-20260819";
const worktreeRoot = path.resolve(__dirname, "..");
assert.equal(worktreeRoot, EXPECTED_WORKTREE_ROOT,
  "California acceptance bootstrap must run from the exact isolated worktree");
assert.equal(realpathSync(worktreeRoot), worktreeRoot,
  "California acceptance bootstrap worktree must not traverse a symlink");

const runnerPath = path.join(worktreeRoot, "scripts/run-california-visualization-acceptance.mts");
const runnerIdentity = lstatSync(runnerPath);
assert.ok(runnerIdentity.isFile() && !runnerIdentity.isSymbolicLink(),
  "California acceptance runner must be one regular non-symlink file");
const tsxLoader = require.resolve("tsx", { paths: [worktreeRoot] });
assert.ok(realpathSync(tsxLoader).startsWith(`${path.join(worktreeRoot, "node_modules")}${path.sep}`),
  "California acceptance bootstrap must use the worktree-local tsx loader");
const bootstrapTmpParent = "/Volumes/Starship/.ca-viz-tmp";
mkdirSync(bootstrapTmpParent, { recursive: true, mode: 0o700 });
const bootstrapTmpParentIdentity = lstatSync(bootstrapTmpParent);
assert.ok(bootstrapTmpParentIdentity.isDirectory() && !bootstrapTmpParentIdentity.isSymbolicLink(),
  "California acceptance bootstrap temp parent must be one real directory");
assert.equal(realpathSync(bootstrapTmpParent), bootstrapTmpParent,
  "California acceptance bootstrap temp parent must remain on the Starship volume");
const bootstrapTmpRoot = mkdtempSync(
  path.join(bootstrapTmpParent, "ca-viz-acceptance-bootstrap-")
);
assert.equal(realpathSync(bootstrapTmpRoot), bootstrapTmpRoot,
  "California acceptance bootstrap temp root must not traverse a symlink");

const SAFE_INHERITED_ENV_KEYS = [
  "CODEX_HOME",
  "COLORTERM",
  "FORCE_COLOR",
  "HOME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LOGNAME",
  "NO_COLOR",
  "PATH",
  "SHELL",
  "TERM",
  "TZ",
  "USER",
  "home"
];
const cleanEnvironment = { CA_VIZ_ACCEPTANCE_CLEAN_BOOTSTRAP: "1" };
for (const key of SAFE_INHERITED_ENV_KEYS) {
  if (process.env[key] !== undefined) cleanEnvironment[key] = process.env[key];
}
cleanEnvironment.TMPDIR = bootstrapTmpRoot;
cleanEnvironment.TMP = bootstrapTmpRoot;
cleanEnvironment.TEMP = bootstrapTmpRoot;

let result;
try {
  result = spawnSync(
    process.execPath,
    ["--import", tsxLoader, runnerPath, ...process.argv.slice(2)],
    {
      cwd: worktreeRoot,
      env: cleanEnvironment,
      shell: false,
      stdio: "inherit"
    }
  );
} finally {
  const bootstrapTmpIdentity = lstatSync(bootstrapTmpRoot);
  assert.ok(bootstrapTmpIdentity.isDirectory() && !bootstrapTmpIdentity.isSymbolicLink(),
    "California acceptance bootstrap temp root identity changed before cleanup");
  assert.equal(realpathSync(bootstrapTmpRoot), bootstrapTmpRoot,
    "California acceptance bootstrap temp root escaped before cleanup");
  rmSync(bootstrapTmpRoot, { recursive: true, force: false });
}
if (result.error) throw result.error;
if (result.signal) {
  process.kill(process.pid, result.signal);
} else {
  process.exitCode = result.status ?? 1;
}
