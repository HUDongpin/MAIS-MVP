import assert from "node:assert/strict";
import { realpathSync, rmSync, symlinkSync } from "node:fs";
import test from "node:test";
import path from "node:path";

import {
  auditStarshipBrowserProcessRows,
  assertStarshipE2eEnvironment,
  assertStarshipPath,
  buildStarshipE2ePathManifest,
  parseMutableBrowserPathArguments,
  validateStarshipE2ePathManifest
} from "./starship-e2e-path-gate.mjs";

const repositoryRoot = realpathSync("/Volumes/Starship/MAIS-china-viz-labs-wt");

test("Starship path gate rejects every named off-volume location and symlink escape", () => {
  for (const unsafePath of [
    "/tmp/china-viz",
    "/var/folders/example/china-viz",
    "/Users/dongpinhu/Desktop/MAIS-MVP/.tmp/china-viz"
  ]) {
    assert.throws(() => assertStarshipPath("unsafe", unsafePath), /\/Volumes\/Starship/u);
  }

  const escapeRoot = path.join(repositoryRoot, ".tmp", `starship-path-escape-${process.pid}`);
  try {
    symlinkSync("/var/folders", escapeRoot);
    assert.throws(
      () => assertStarshipPath("symlink escape", path.join(escapeRoot, "china-viz")),
      /resolves outside \/Volumes\/Starship/u
    );
  } finally {
    rmSync(escapeRoot, { force: true });
  }
});

test("canonical manifest gives every mutable E2E path an absolute Starship owner", () => {
  const manifest = buildStarshipE2ePathManifest({
    repositoryRoot,
    runId: "path-contract-unit"
  });
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(
    manifest.contract.serverCommandOwnerPidSemantics,
    "shell-command-owner-that-execs-npm-start"
  );
  for (const [label, value] of Object.entries(manifest.paths)) {
    assert.equal(path.isAbsolute(value), true, label);
    assert.match(value, /^\/Volumes\/Starship\//u, label);
  }
  assert.equal(manifest.paths.repositoryRoot, repositoryRoot);
  assert.equal(manifest.paths.browserTempDir, path.join(manifest.paths.e2eRunRoot, "browser-temp"));
  assert.equal(
    manifest.paths.nextTsconfigPath,
    path.join(manifest.paths.e2eRunRoot, "tsconfig.playwright-path-contract-unit.tmp.json")
  );
  assert.equal(manifest.paths.serverLogPath, path.join(manifest.paths.e2eRunRoot, "server", "server.log"));
  assert.equal(
    manifest.paths.serverCommandOwnerPidPath,
    path.join(manifest.paths.e2eRunRoot, "server", "server-command-owner.pid")
  );
  assert.deepEqual(validateStarshipE2ePathManifest(manifest), manifest);
});

test("prelaunch environment requires the exact browser temp path before Playwright starts", () => {
  const manifest = buildStarshipE2ePathManifest({ repositoryRoot, runId: "env-unit" });
  const safe = {
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_COMPILE_CACHE: manifest.paths.nodeCompileCacheDir,
    PLAYWRIGHT_STARSHIP_PRELAUNCH: "1",
    TEMP: manifest.paths.browserTempDir,
    TMP: manifest.paths.browserTempDir,
    TMPDIR: manifest.paths.browserTempDir,
    npm_config_cache: manifest.paths.npmCacheDir
  };
  assert.deepEqual(
    assertStarshipE2eEnvironment(
      safe,
      manifest.paths.browserTempDir,
      manifest.paths.nodeCompileCacheDir
    ),
    safe
  );
  assert.throws(
    () => assertStarshipE2eEnvironment(
      { ...safe, PLAYWRIGHT_STARSHIP_PRELAUNCH: undefined },
      manifest.paths.browserTempDir,
      manifest.paths.nodeCompileCacheDir
    ),
    /before the Playwright Node process/u
  );
  assert.throws(
    () => assertStarshipE2eEnvironment(
      { ...safe, TMPDIR: "/var/folders/unsafe" },
      manifest.paths.browserTempDir,
      manifest.paths.nodeCompileCacheDir
    ),
    /TMPDIR/u
  );
  assert.throws(
    () => assertStarshipE2eEnvironment(
      { ...safe, TEMP: path.join(repositoryRoot, ".tmp", "another") },
      manifest.paths.browserTempDir,
      manifest.paths.nodeCompileCacheDir
    ),
    /must equal the canonical browser temp directory/u
  );
});

test("browser command parser isolates mutable profile, cache, crash, and database paths", () => {
  const command = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "--user-data-dir=/Volumes/Starship/run/profile",
    "--crash-dumps-dir=/Volumes/Starship/run/crash dumps",
    "--disk-cache-dir=/tmp/cache",
    "--database=/Users/example/Library/Crashpad"
  ].join(" ");
  assert.deepEqual(parseMutableBrowserPathArguments(command), [
    { flag: "user-data-dir", path: "/Volumes/Starship/run/profile" },
    { flag: "crash-dumps-dir", path: "/Volumes/Starship/run/crash dumps" },
    { flag: "disk-cache-dir", path: "/tmp/cache" },
    { flag: "database", path: "/Users/example/Library/Crashpad" }
  ]);
});

test("browser process audit covers fixture profiles and descendant Crashpad databases", () => {
  const browserTempDir = path.join(repositoryRoot, ".tmp", "process-audit", "browser-temp");
  const crashDumpDir = path.join(repositoryRoot, ".tmp", "process-audit", "crash");
  const crashpadDatabase = path.join(repositoryRoot, ".tmp", "process-audit", "crashpad-db");
  const rows = [
    { command: "node playwright", pid: 100, ppid: 1 },
    {
      command: `/Applications/Google Chrome --remote-debugging-pipe --user-data-dir=${browserTempDir}/global --crash-dumps-dir=${crashDumpDir}`,
      pid: 101,
      ppid: 100
    },
    {
      command: `/Applications/crashpad_handler --database=${crashpadDatabase}`,
      pid: 102,
      ppid: 101
    },
    {
      command: `/Applications/Google Chrome --remote-debugging-pipe --user-data-dir=${browserTempDir}/fixture --crash-dumps-dir=${crashDumpDir}`,
      pid: 103,
      ppid: 100
    }
  ];
  const audited = auditStarshipBrowserProcessRows({
    ancestorPid: 100,
    expectedBrowserTempDir: browserTempDir,
    rows
  });
  assert.deepEqual(
    audited.observations.map(({ userDataDir }) => userDataDir).sort(),
    [`${browserTempDir}/fixture`, `${browserTempDir}/global`]
  );
  assert.deepEqual(
    audited.processMutablePathAudit.find(({ flag }) => flag === "database"),
    { flag: "database", path: crashpadDatabase, pid: 102, processKind: "crashpad" }
  );

  const unsafeRows = rows.map((row) =>
    row.pid === 102
      ? { ...row, command: "/Applications/crashpad_handler --database=/var/folders/unsafe" }
      : row
  );
  assert.throws(
    () => auditStarshipBrowserProcessRows({
      ancestorPid: 100,
      expectedBrowserTempDir: browserTempDir,
      rows: unsafeRows
    }),
    /browser --database resolves outside \/Volumes\/Starship/u
  );
});

test("manifest validator rejects a single off-Starship mutable artifact", () => {
  const manifest = buildStarshipE2ePathManifest({ repositoryRoot, runId: "manifest-red" });
  const broken = structuredClone(manifest);
  broken.paths.reportDir = "/tmp/playwright-report";
  assert.throws(
    () => validateStarshipE2ePathManifest(broken),
    /paths\.reportDir/u
  );
});
