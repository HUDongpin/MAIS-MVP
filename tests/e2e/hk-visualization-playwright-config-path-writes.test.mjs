import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildHkVisualizationStarshipPathManifest,
} from "./hk-visualization-starship-path-contract.mjs";
import {
  buildHkVisualizationCanonicalE2eTsconfigBytes,
} from "./hk-visualization-e2e-tsconfig-contract.mjs";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const configPath = join(workspace, "playwright.config.ts");
const supportRoot = join(
  workspace,
  ".tmp",
  `hk-viz-playwright-config-path-writes-${process.pid}`,
);
let fixtureCounter = 0;

mkdirSync(supportRoot, { recursive: true });

after(() => {
  rmSync(supportRoot, { recursive: true, force: true });
});

function expectedBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function nextFixture(label) {
  fixtureCounter += 1;
  const runId = `hk-viz-config-path-write-${process.pid}-${fixtureCounter}-${label}`;
  const manifest = buildHkVisualizationStarshipPathManifest({
    runId,
    workspace,
  });
  return {
    manifest,
    materializeDirectories() {
      for (const directory of managedDirectories(manifest)) {
        mkdirSync(directory, { recursive: true });
      }
    },
    prewriteManifest() {
      mkdirSync(dirname(manifest.pathManifestFile), { recursive: true });
      writeFileSync(manifest.pathManifestFile, expectedBytes(manifest), {
        mode: 0o600,
      });
    },
    prewriteTsconfig() {
      writeFileSync(
        manifest.nextTsconfigPath,
        buildHkVisualizationCanonicalE2eTsconfigBytes({
          workspace,
          nextDistDir: manifest.nextDistDir,
        }),
        { mode: 0o600 },
      );
    },
    materializeCanonicalInputs() {
      this.materializeDirectories();
      this.prewriteManifest();
      this.prewriteTsconfig();
    },
    cleanup() {
      rmSync(manifest.nextTsconfigPath, { force: true });
      rmSync(manifest.artifactRoot, { recursive: true, force: true });
    },
  };
}

function managedDirectories(manifest) {
  return [
    manifest.artifactRoot,
    manifest.nextDistDir,
    manifest.runtimeTmpDir,
    manifest.outputDir,
    manifest.reportDir,
    manifest.serviceLogDir,
    manifest.servicePidDir,
    manifest.nodeCompileCacheDir,
    manifest.npmCacheDir,
    manifest.npmLogsDir,
    manifest.sqliteTmpDir,
    manifest.xdgCacheDir,
    manifest.xdgConfigDir,
    manifest.xdgStateDir,
    manifest.globalProfileMonitorDir,
    manifest.globalProfileMonitorTmpDir,
    manifest.workloadSupervisorDir,
    manifest.workloadSupervisorTmpDir,
  ];
}

function childEnvironment(manifest) {
  return {
    LANG: "C",
    LC_ALL: "C",
    PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    PLAYWRIGHT_RUN_ID: manifest.runId,
    PLAYWRIGHT_SKIP_WEBSERVER: "1",
    PLAYWRIGHT_E2E_ROOT: manifest.artifactRoot,
    PLAYWRIGHT_NEXT_DIST_DIR: manifest.nextDistDir,
    PLAYWRIGHT_NEXT_TSCONFIG_PATH: manifest.nextTsconfigPath,
    HK_MATH_DB_PATH: manifest.databasePath,
    SQLITE_TMPDIR: manifest.sqliteTmpDir,
    PLAYWRIGHT_OUTPUT_DIR: manifest.outputDir,
    PLAYWRIGHT_REPORT_DIR: manifest.reportDir,
    PLAYWRIGHT_JSON_OUTPUT_FILE: manifest.jsonReport,
    PLAYWRIGHT_RUNTIME_TMPDIR: manifest.runtimeTmpDir,
    HOME: manifest.runtimeTmpDir,
    PLAYWRIGHT_BROWSER_PROFILE_ROOT: manifest.browserProfileParent,
    PLAYWRIGHT_SERVICE_LOG_DIR: manifest.serviceLogDir,
    PLAYWRIGHT_SERVICE_PID_DIR: manifest.servicePidDir,
    PLAYWRIGHT_PATH_MANIFEST_FILE: manifest.pathManifestFile,
    NODE_COMPILE_CACHE: manifest.nodeCompileCacheDir,
    NPM_CONFIG_CACHE: manifest.npmCacheDir,
    npm_config_cache: manifest.npmCacheDir,
    NPM_CONFIG_LOGS_DIR: manifest.npmLogsDir,
    npm_config_logs_dir: manifest.npmLogsDir,
    TMPDIR: manifest.runtimeTmpDir,
    TMP: manifest.runtimeTmpDir,
    TEMP: manifest.runtimeTmpDir,
    XDG_CACHE_HOME: manifest.xdgCacheDir,
    XDG_CONFIG_HOME: manifest.xdgConfigDir,
    XDG_STATE_HOME: manifest.xdgStateDir,
    CHROME_LOG_FILE: manifest.chromeLogPath,
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

function importConfig(manifest) {
  return spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      `await import(${JSON.stringify(configPath)});`,
    ],
    {
      cwd: workspace,
      env: childEnvironment(manifest),
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
}

function assertImportSucceeded(result) {
  assert.equal(
    result.status,
    0,
    `config import failed\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  assert.equal(result.signal, null);
  assert.equal(result.error, undefined);
}

function assertImportRejected(result, pattern) {
  assert.notEqual(
    result.status,
    0,
    `config import unexpectedly succeeded\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  assert.match(`${result.stdout}\n${result.stderr}`, pattern);
}

function modeBits(filePath) {
  return lstatSync(filePath).mode & 0o777;
}

test("source contract is a no-follow zero-write verifier", () => {
  const source = readFileSync(configPath, "utf8");
  assert.doesNotMatch(source, /\bmkdirSync\b/);
  assert.doesNotMatch(source, /\bwriteFileSync\b/);
  assert.doesNotMatch(source, /\bcreateExclusiveDurableRegularFile\b/);
  assert.doesNotMatch(source, /\bO_CREAT\b/);
  assert.doesNotMatch(source, /\bO_EXCL\b/);
  assert.doesNotMatch(source, /\bO_WRONLY\b/);
  assert.doesNotMatch(source, /\bfsyncSync\b/);
  assert.doesNotMatch(source, /\bfchmodSync\b/);
  assert.doesNotMatch(
    source,
    /\b(?:0[xob][0-9a-f_]+|[0-9][0-9_]*)n\b/i,
  );
  assert.match(source, /O_NOFOLLOW/);
  assert.match(source, /O_RDONLY/);
  assert.match(source, /lstatSync/);
});

test("a runner-prewritten exact v6 manifest is verified without rewriting it", () => {
  const fixture = nextFixture("prewritten-exact");
  try {
    fixture.materializeCanonicalInputs();
    const oldTime = new Date("2001-02-03T04:05:06.000Z");
    utimesSync(fixture.manifest.pathManifestFile, oldTime, oldTime);
    utimesSync(fixture.manifest.nextTsconfigPath, oldTime, oldTime);
    const paths = [
      fixture.manifest.pathManifestFile,
      fixture.manifest.nextTsconfigPath,
    ];
    const before = paths.map((filePath) => ({
      bytes: readFileSync(filePath),
      metadata: lstatSync(filePath, { bigint: true }),
    }));

    const result = importConfig(fixture.manifest);
    assertImportSucceeded(result);

    for (const [index, filePath] of paths.entries()) {
      const after = lstatSync(filePath, { bigint: true });
      assert.equal(after.dev, before[index].metadata.dev);
      assert.equal(after.ino, before[index].metadata.ino);
      assert.equal(after.mtimeNs, before[index].metadata.mtimeNs);
      assert.deepEqual(readFileSync(filePath), before[index].bytes);
    }
  } finally {
    fixture.cleanup();
  }
});

test("a direct scoped import refuses a missing runner manifest without creating it", () => {
  const fixture = nextFixture("missing-manifest");
  try {
    fixture.materializeDirectories();
    fixture.prewriteTsconfig();
    const tsconfigBefore = readFileSync(fixture.manifest.nextTsconfigPath);
    const result = importConfig(fixture.manifest);
    assertImportRejected(result, /manifest.*must be prewritten|ENOENT/i);
    assert.equal(existsSync(fixture.manifest.pathManifestFile), false);
    assert.deepEqual(readFileSync(fixture.manifest.nextTsconfigPath), tsconfigBefore);
  } finally {
    fixture.cleanup();
  }
});

test("a direct scoped import refuses a missing runner tsconfig without creating it", () => {
  const fixture = nextFixture("missing-tsconfig");
  try {
    fixture.materializeDirectories();
    fixture.prewriteManifest();
    const manifestBefore = readFileSync(fixture.manifest.pathManifestFile);
    const result = importConfig(fixture.manifest);
    assertImportRejected(result, /tsconfig.*must be prewritten|ENOENT/i);
    assert.equal(existsSync(fixture.manifest.nextTsconfigPath), false);
    assert.deepEqual(readFileSync(fixture.manifest.pathManifestFile), manifestBefore);
  } finally {
    fixture.cleanup();
  }
});

test("a byte-different pre-existing path manifest is rejected and preserved", () => {
  const fixture = nextFixture("manifest-byte-drift");
  try {
    fixture.materializeDirectories();
    fixture.prewriteTsconfig();
    const compactButEquivalent = Buffer.from(
      `${JSON.stringify(fixture.manifest)}\n`,
      "utf8",
    );
    writeFileSync(fixture.manifest.pathManifestFile, compactButEquivalent, {
      mode: 0o600,
    });
    const tsconfigBefore = readFileSync(fixture.manifest.nextTsconfigPath);

    const result = importConfig(fixture.manifest);
    assertImportRejected(result, /manifest.*byte|byte.*manifest|identity/i);
    assert.deepEqual(
      readFileSync(fixture.manifest.pathManifestFile),
      compactButEquivalent,
    );
    assert.deepEqual(
      readFileSync(fixture.manifest.nextTsconfigPath),
      tsconfigBefore,
    );
  } finally {
    fixture.cleanup();
  }
});

test("a JSON-different pre-existing path manifest is rejected and preserved", () => {
  const fixture = nextFixture("manifest-json-drift");
  try {
    fixture.materializeDirectories();
    fixture.prewriteTsconfig();
    const jsonDrift = Buffer.from(
      `${JSON.stringify(
        { ...fixture.manifest, manifestHash: "0".repeat(64) },
        null,
        2,
      )}\n`,
      "utf8",
    );
    writeFileSync(fixture.manifest.pathManifestFile, jsonDrift, { mode: 0o600 });
    const tsconfigBefore = readFileSync(fixture.manifest.nextTsconfigPath);

    const result = importConfig(fixture.manifest);
    assertImportRejected(result, /manifest.*JSON identity.*drift/i);
    assert.deepEqual(readFileSync(fixture.manifest.pathManifestFile), jsonDrift);
    assert.deepEqual(
      readFileSync(fixture.manifest.nextTsconfigPath),
      tsconfigBefore,
    );
  } finally {
    fixture.cleanup();
  }
});

test("a pre-existing regular disposable tsconfig is rejected and preserved", () => {
  const fixture = nextFixture("tsconfig-regular");
  const sentinel = Buffer.from('{"doNotOverwrite":true}\n', "utf8");
  try {
    fixture.materializeDirectories();
    fixture.prewriteManifest();
    writeFileSync(fixture.manifest.nextTsconfigPath, sentinel, { mode: 0o600 });
    const result = importConfig(fixture.manifest);
    assertImportRejected(result, /tsconfig.*byte identity.*drift/i);
    assert.deepEqual(readFileSync(fixture.manifest.nextTsconfigPath), sentinel);
  } finally {
    fixture.cleanup();
  }
});

test("a dangling tsconfig symlink is rejected without creating its target", () => {
  const fixture = nextFixture("tsconfig-dangling-symlink");
  const danglingTarget = join(supportRoot, `${fixture.manifest.runId}-target.json`);
  try {
    fixture.materializeDirectories();
    fixture.prewriteManifest();
    symlinkSync(danglingTarget, fixture.manifest.nextTsconfigPath);
    const result = importConfig(fixture.manifest);
    assertImportRejected(result, /tsconfig.*symlink|pre-existing.*tsconfig/i);
    assert.equal(lstatSync(fixture.manifest.nextTsconfigPath).isSymbolicLink(), true);
    assert.equal(existsSync(danglingTarget), false);
  } finally {
    fixture.cleanup();
    rmSync(danglingTarget, { force: true });
  }
});

test("a dangling path-manifest symlink is rejected without creating its target", () => {
  const fixture = nextFixture("manifest-dangling-symlink");
  const danglingTarget = join(supportRoot, `${fixture.manifest.runId}-target.json`);
  try {
    fixture.materializeDirectories();
    fixture.prewriteTsconfig();
    symlinkSync(danglingTarget, fixture.manifest.pathManifestFile);
    const result = importConfig(fixture.manifest);
    assertImportRejected(result, /manifest.*symlink|symlink.*manifest|symlink alias/i);
    assert.equal(lstatSync(fixture.manifest.pathManifestFile).isSymbolicLink(), true);
    assert.equal(existsSync(danglingTarget), false);
  } finally {
    fixture.cleanup();
    rmSync(danglingTarget, { force: true });
  }
});

test("a symlinked generated parent is rejected by the frozen physical Starship contract", () => {
  const fixture = nextFixture("symlink-parent");
  const physicalTarget = join(supportRoot, `${fixture.manifest.runId}-parent`);
  try {
    mkdirSync(physicalTarget, { recursive: true });
    symlinkSync(physicalTarget, fixture.manifest.artifactRoot);
    const result = importConfig(fixture.manifest);
    assertImportRejected(result, /symlink alias|physical Starship entry/i);
  } finally {
    fixture.cleanup();
    rmSync(physicalTarget, { recursive: true, force: true });
  }
});

test("runner-prewritten manifest and tsconfig must both use mode 0600", () => {
  for (const target of ["manifest", "tsconfig"]) {
    const fixture = nextFixture(`wrong-mode-${target}`);
    try {
      fixture.materializeCanonicalInputs();
      const targetPath =
        target === "manifest"
          ? fixture.manifest.pathManifestFile
          : fixture.manifest.nextTsconfigPath;
      chmodSync(targetPath, 0o644);
      const result = importConfig(fixture.manifest);
      assertImportRejected(result, /must use mode 0600/i);
      assert.equal(modeBits(targetPath), 0o644);
    } finally {
      fixture.cleanup();
    }
  }
});

test("a missing managed directory is rejected without materializing it", () => {
  const fixture = nextFixture("missing-directory");
  try {
    fixture.materializeCanonicalInputs();
    rmSync(fixture.manifest.xdgStateDir, { recursive: true, force: true });
    const result = importConfig(fixture.manifest);
    assertImportRejected(result, /materialized directory.*must be precreated|ENOENT/i);
    assert.equal(existsSync(fixture.manifest.xdgStateDir), false);
  } finally {
    fixture.cleanup();
  }
});

test("an ancestor swap during missing-manifest verification writes nothing to the alias target", () => {
  const fixture = nextFixture("ancestor-open-swap");
  const heldRoot = join(supportRoot, `${fixture.manifest.runId}-held`);
  const aliasTarget = join(supportRoot, `${fixture.manifest.runId}-alias-target`);
  try {
    fixture.materializeDirectories();
    fixture.prewriteTsconfig();
    mkdirSync(aliasTarget, { recursive: true });
    const mutationScript = `
      import fs from "node:fs";
      import { syncBuiltinESMExports } from "node:module";
      const originalLstatSync = fs.lstatSync;
      let swapped = false;
      fs.lstatSync = function(filePath, ...args) {
        const stack = new Error().stack ?? "";
        if (
          !swapped &&
          filePath === ${JSON.stringify(fixture.manifest.pathManifestFile)} &&
          /existingEntry|readStableRegularFile/.test(stack)
        ) {
          fs.renameSync(${JSON.stringify(fixture.manifest.artifactRoot)}, ${JSON.stringify(heldRoot)});
          fs.symlinkSync(${JSON.stringify(aliasTarget)}, ${JSON.stringify(fixture.manifest.artifactRoot)}, "dir");
          swapped = true;
        }
        return originalLstatSync.call(this, filePath, ...args);
      };
      syncBuiltinESMExports();
      try {
        await import(${JSON.stringify(configPath)});
        process.exitCode = 90;
      } catch (error) {
        process.stderr.write(
          "A11_SWAPPED=" + String(swapped) + "\\n" +
          String(error instanceof Error ? error.message : error),
        );
      } finally {
        fs.lstatSync = originalLstatSync;
        syncBuiltinESMExports();
        if (fs.lstatSync(${JSON.stringify(fixture.manifest.artifactRoot)}).isSymbolicLink()) {
          fs.unlinkSync(${JSON.stringify(fixture.manifest.artifactRoot)});
          fs.renameSync(${JSON.stringify(heldRoot)}, ${JSON.stringify(fixture.manifest.artifactRoot)});
        }
      }
      if (!swapped) process.exitCode = 91;
    `;
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "--eval", mutationScript],
      {
        cwd: workspace,
        env: {
          ...childEnvironment(fixture.manifest),
          NODE_DISABLE_COMPILE_CACHE: "1",
        },
        encoding: "utf8",
        timeout: 30_000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    assert.equal(result.status, 0, `stdout=${result.stdout}\nstderr=${result.stderr}`);
    assert.match(result.stderr, /A11_SWAPPED=true/);
    assert.match(result.stderr, /prewritten|symlink alias|changed/i);
    assert.deepEqual(readdirSync(aliasTarget), []);
  } finally {
    if (existsSync(fixture.manifest.artifactRoot)) {
      const metadata = lstatSync(fixture.manifest.artifactRoot);
      if (metadata.isSymbolicLink()) unlinkSync(fixture.manifest.artifactRoot);
    }
    if (existsSync(heldRoot) && !existsSync(fixture.manifest.artifactRoot)) {
      renameSync(heldRoot, fixture.manifest.artifactRoot);
    }
    fixture.cleanup();
    rmSync(aliasTarget, { recursive: true, force: true });
    rmSync(heldRoot, { recursive: true, force: true });
  }
});
