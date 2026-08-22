import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter, once } from "node:events";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  acquireStarshipPlaywrightRunLock,
  buildStarshipPlaywrightInvocation,
  observeStarshipPlaywrightChild,
  restoreStarshipTrackedFile,
  snapshotStarshipTrackedFile
} from "./run-starship-playwright.mjs";

function resolveInnerWrapperTestRoot(environment) {
  const configuredRoot = environment.STARSHIP_INNER_WRAPPER_TEST_ROOT;
  if (typeof configuredRoot !== "string" || configuredRoot.trim() === "") {
    throw new Error("STARSHIP_INNER_WRAPPER_TEST_ROOT is required.");
  }
  if (!path.isAbsolute(configuredRoot)) {
    throw new Error("STARSHIP_INNER_WRAPPER_TEST_ROOT must be absolute.");
  }
  if (path.resolve(configuredRoot) !== configuredRoot) {
    throw new Error("STARSHIP_INNER_WRAPPER_TEST_ROOT must be lexically canonical.");
  }
  const rootStat = lstatSync(configuredRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("STARSHIP_INNER_WRAPPER_TEST_ROOT must be a physical non-symlink directory.");
  }
  const physicalRoot = realpathSync.native(configuredRoot);
  if (physicalRoot !== configuredRoot) {
    throw new Error("STARSHIP_INNER_WRAPPER_TEST_ROOT native realpath must match its configured path.");
  }
  const starshipRoot = realpathSync.native("/Volumes/Starship");
  if (path.dirname(physicalRoot) !== starshipRoot) {
    throw new Error("STARSHIP_INNER_WRAPPER_TEST_ROOT must be a direct child of /Volumes/Starship.");
  }
  if (readdirSync(physicalRoot).length !== 0) {
    throw new Error("STARSHIP_INNER_WRAPPER_TEST_ROOT must be empty at suite start.");
  }
  return physicalRoot;
}

const repositoryRoot = resolveInnerWrapperTestRoot(process.env);

function assertInnerWrapperTestRootPolicy() {
  const configuredRoot = process.env.STARSHIP_INNER_WRAPPER_TEST_ROOT;
  assert.equal(repositoryRoot, configuredRoot);
  assert.throws(
    () => resolveInnerWrapperTestRoot({}),
    /STARSHIP_INNER_WRAPPER_TEST_ROOT is required/u
  );
  assert.throws(
    () => resolveInnerWrapperTestRoot({ STARSHIP_INNER_WRAPPER_TEST_ROOT: "relative-root" }),
    /must be absolute/u
  );
  assert.throws(
    () => resolveInnerWrapperTestRoot({
      STARSHIP_INNER_WRAPPER_TEST_ROOT: realpathSync.native("/tmp")
    }),
    /direct child of \/Volumes\/Starship/u
  );
  const noncanonicalRoot = `${repositoryRoot}/../${path.basename(repositoryRoot)}`;
  assert.throws(
    () => resolveInnerWrapperTestRoot({ STARSHIP_INNER_WRAPPER_TEST_ROOT: noncanonicalRoot }),
    /lexically canonical/u
  );
  const physicalPolicyFixture = path.join(repositoryRoot, "root-policy");
  const physicalTarget = path.join(physicalPolicyFixture, "target");
  const physicalLink = path.join(physicalPolicyFixture, "link");
  mkdirSync(physicalTarget, { recursive: true });
  symlinkSync(physicalTarget, physicalLink);
  try {
    assert.throws(
      () => resolveInnerWrapperTestRoot({ STARSHIP_INNER_WRAPPER_TEST_ROOT: physicalTarget }),
      /direct child of \/Volumes\/Starship/u
    );
    assert.throws(
      () => resolveInnerWrapperTestRoot({ STARSHIP_INNER_WRAPPER_TEST_ROOT: physicalLink }),
      /native realpath must match|physical non-symlink directory/u
    );
  } finally {
    rmSync(physicalPolicyFixture, { force: true, recursive: true });
  }
  const nonfreshMarker = path.join(repositoryRoot, "nonfresh-marker");
  writeFileSync(nonfreshMarker, "occupied\n", "utf8");
  try {
    assert.throws(
      () => resolveInnerWrapperTestRoot({
        STARSHIP_INNER_WRAPPER_TEST_ROOT: repositoryRoot
      }),
      /empty at suite start/u
    );
  } finally {
    rmSync(nonfreshMarker, { force: true });
  }
}

async function waitForPath(filePath, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(filePath)) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for ${filePath}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function runRealSignalCleanupProbe(signal) {
  const fixtureRoot = path.join(
    repositoryRoot,
    ".tmp",
    `starship-wrapper-real-${signal.toLowerCase()}-${process.pid}`
  );
  const runtimeTemp = path.join(fixtureRoot, "runtime-tmp");
  const nodeCompileCache = path.join(fixtureRoot, "node-compile-cache");
  const readyPath = path.join(fixtureRoot, "ready.json");
  const cleanupPath = path.join(fixtureRoot, "cleanup.json");
  const trackedPath = path.join(fixtureRoot, "next-env.d.ts");
  const lockPath = path.join(fixtureRoot, "run.lock");
  mkdirSync(runtimeTemp, { recursive: true });
  mkdirSync(nodeCompileCache, { recursive: true });
  const childProgram = [
    `process.on("${signal}", () => {`,
    "  setTimeout(() => process.exit(0), 25);",
    "});",
    "setInterval(() => {}, 1_000);"
  ].join("\n");
  const probeProgram = [
    'import { spawn } from "node:child_process";',
    'import { writeFileSync } from "node:fs";',
    `import { acquireStarshipPlaywrightRunLock, observeStarshipPlaywrightChild, restoreStarshipTrackedFile, snapshotStarshipTrackedFile } from ${JSON.stringify(new URL("./run-starship-playwright.mjs", import.meta.url).href)};`,
    `const trackedPath = ${JSON.stringify(trackedPath)};`,
    `const lockPath = ${JSON.stringify(lockPath)};`,
    `const readyPath = ${JSON.stringify(readyPath)};`,
    `const cleanupPath = ${JSON.stringify(cleanupPath)};`,
    `const childProgram = ${JSON.stringify(childProgram)};`,
    'writeFileSync(trackedPath, "canonical-next-env\\n", "utf8");',
    "const snapshot = snapshotStarshipTrackedFile(trackedPath);",
    'const release = acquireStarshipPlaywrightRunLock(lockPath, { ownerPid: process.pid, runId: "real-signal" });',
    'const child = spawn(process.execPath, ["--input-type=module", "--eval", childProgram], { stdio: "ignore" });',
    "const observer = observeStarshipPlaywrightChild(child);",
    'writeFileSync(trackedPath, "temporary-e2e-route-types\\n", "utf8");',
    'writeFileSync(readyPath, `${JSON.stringify({ ownerPid: process.pid, childPid: child.pid })}\\n`, "utf8");',
    "let outcome = null;",
    "try {",
    "  outcome = await observer.outcome;",
    "  await new Promise((resolve) => setTimeout(resolve, 25));",
    "} finally {",
    "  try {",
    "    restoreStarshipTrackedFile(trackedPath, snapshot);",
    "  } finally {",
    "    try { release(); } finally { observer.dispose(); }",
    "  }",
    '  writeFileSync(cleanupPath, `${JSON.stringify({ outcome, listeners: { SIGINT: process.listenerCount("SIGINT"), SIGTERM: process.listenerCount("SIGTERM") } })}\\n`, "utf8");',
    "}"
  ].join("\n");
  const probe = spawn(process.execPath, ["--input-type=module", "--eval", probeProgram], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      NODE_COMPILE_CACHE: nodeCompileCache,
      TEMP: runtimeTemp,
      TMP: runtimeTemp,
      TMPDIR: runtimeTemp
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  probe.stderr.setEncoding("utf8");
  probe.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  try {
    await waitForPath(readyPath);
    assert.equal(probe.kill(signal), true);
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Signal cleanup probe timed out for ${signal}.`)),
        5_000
      );
    });
    const [code, exitSignal] = await Promise.race([once(probe, "exit"), timeout])
      .finally(() => clearTimeout(timeoutId));
    assert.equal(code, 0, stderr);
    assert.equal(exitSignal, null, stderr);
    assert.equal(readFileSync(trackedPath, "utf8"), "canonical-next-env\n");
    assert.equal(existsSync(lockPath), false);
    const cleanup = JSON.parse(readFileSync(cleanupPath, "utf8"));
    assert.deepEqual(cleanup.outcome, { code: null, signal });
    assert.deepEqual(cleanup.listeners, { SIGINT: 0, SIGTERM: 0 });
  } finally {
    if (probe.exitCode === null && probe.signalCode === null) probe.kill("SIGKILL");
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
}

test("focused Playwright wrapper sets all prelaunch paths before spawning Playwright", () => {
  assertInnerWrapperTestRootPolicy();
  const invocation = buildStarshipPlaywrightInvocation({
    args: ["test", "tests/e2e/example.spec.ts", "--project=desktop-chrome"],
    baseEnvironment: {
      PATH: "/bin",
      PLAYWRIGHT_BROWSER_CHANNEL: "firefox",
      TEMP: "/tmp",
      TMP: "/tmp",
      TMPDIR: "/var/folders/unsafe"
    },
    repositoryRoot,
    runId: "focused-wrapper"
  });
  assert.equal(invocation.cwd, repositoryRoot);
  assert.equal(invocation.command, process.execPath);
  assert.ok(invocation.args[0].endsWith("@playwright/test/cli.js"));
  assert.deepEqual(invocation.args.slice(1), [
    "test",
    "tests/e2e/example.spec.ts",
    "--project=desktop-chrome"
  ]);
  assert.equal(invocation.environment.PATH, "/bin");
  assert.equal(invocation.environment.PLAYWRIGHT_BROWSER_CHANNEL, "chrome");
  assert.equal(invocation.environment.PLAYWRIGHT_STARSHIP_PRELAUNCH, "1");
  assert.equal(invocation.environment.NEXT_TELEMETRY_DISABLED, "1");
  assert.deepEqual(
    JSON.parse(invocation.environment.MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON),
    ["test", "tests/e2e/example.spec.ts", "--project=desktop-chrome"]
  );
  assert.equal(invocation.environment.NODE_COMPILE_CACHE.endsWith("/node-compile-cache"), true);
  assert.equal(invocation.environment.npm_config_cache.endsWith("/npm-cache"), true);
  assert.equal(invocation.environment.TMPDIR, invocation.environment.PLAYWRIGHT_BROWSER_TEMP_DIR);
  assert.equal(invocation.environment.TMP, invocation.environment.PLAYWRIGHT_BROWSER_TEMP_DIR);
  assert.equal(invocation.environment.TEMP, invocation.environment.PLAYWRIGHT_BROWSER_TEMP_DIR);
  assert.equal(
    invocation.environment.PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH,
    invocation.pathManifest.paths.browserProcessEvidencePath
  );
  assert.equal(
    invocation.environment.PLAYWRIGHT_JSON_OUTPUT_FILE,
    path.join(invocation.pathManifest.paths.e2eRunRoot, "playwright-report.json")
  );
  assert.match(invocation.environment.PLAYWRIGHT_E2E_ROOT, /^\/Volumes\/Starship\//u);
});

test("focused Playwright wrapper rejects off-Starship repository roots and path overrides", () => {
  assert.throws(
    () => buildStarshipPlaywrightInvocation({
      args: ["test"],
      repositoryRoot: "/tmp/repository",
      runId: "unsafe-root"
    }),
    /\/Volumes\/Starship/u
  );
  assert.throws(
    () => buildStarshipPlaywrightInvocation({
      args: ["test"],
      baseEnvironment: { PLAYWRIGHT_E2E_ROOT: "/tmp/override" },
      repositoryRoot,
      runId: "unsafe-override"
    }),
    /PLAYWRIGHT_E2E_ROOT/u
  );
  assert.throws(
    () => buildStarshipPlaywrightInvocation({
      args: ["test"],
      baseEnvironment: { MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON: "[]" },
      repositoryRoot,
      runId: "unsafe-argv-override"
    }),
    /MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON/u
  );
  for (const args of [
    ["test", "--output=/tmp/off-starship"],
    ["test", "--config=/tmp/unsafe.config.ts"],
    ["test", "--reporter=html"],
    ["test", "--pass-with-no-tests"],
    ["test", "--test-list=/Volumes/Starship/selected-tests.txt"],
    ["test", "--test-list-invert", "/Volumes/Starship/skipped-tests.txt"]
    ,
    ["test", "tests/e2e/example.spec.ts", "--grep", "test"]
  ]) {
    assert.throws(
      () => buildStarshipPlaywrightInvocation({
        args,
        baseEnvironment: {},
        repositoryRoot,
        runId: "unsafe-cli-override"
      }),
      /forbids path-owning CLI override|rejects artifact-owning|forbids zero-test success|forbids pre-import test-list filtering|exactly one `test` command/u
    );
  }
});

test("focused wrapper serializes builds and restores tracked Next side effects exactly", () => {
  const fixtureRoot = path.join(repositoryRoot, ".tmp", `starship-wrapper-unit-${process.pid}`);
  const lockPath = path.join(fixtureRoot, "run.lock");
  const trackedPath = path.join(fixtureRoot, "next-env.d.ts");
  mkdirSync(fixtureRoot, { recursive: true });
  writeFileSync(trackedPath, "canonical-next-env\n", "utf8");
  const snapshot = snapshotStarshipTrackedFile(trackedPath);
  const release = acquireStarshipPlaywrightRunLock(lockPath, {
    ownerPid: process.pid,
    runId: "unit"
  });
  try {
    assert.equal(existsSync(lockPath), true);
    assert.throws(
      () => acquireStarshipPlaywrightRunLock(lockPath, { ownerPid: process.pid }),
      /Another Starship Playwright run owns/u
    );
    writeFileSync(trackedPath, "temporary-e2e-route-types\n", "utf8");
    restoreStarshipTrackedFile(trackedPath, snapshot);
    assert.equal(readFileSync(trackedPath, "utf8"), "canonical-next-env\n");
  } finally {
    release();
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
  assert.equal(existsSync(lockPath), false);
});

test("focused wrapper forwards SIGINT and retains the signal shield through cleanup", async () => {
  const processTarget = new EventEmitter();
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  const forwardedSignals = [];
  child.kill = (signal) => {
    forwardedSignals.push(signal);
    return true;
  };
  const observer = observeStarshipPlaywrightChild(child, { processTarget });
  let outcomeSettled = false;
  void observer.outcome.then(() => {
    outcomeSettled = true;
  });
  try {
    assert.equal(processTarget.listenerCount("SIGINT"), 1);
    assert.equal(processTarget.listenerCount("SIGTERM"), 1);
    processTarget.emit("SIGINT");
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(forwardedSignals, ["SIGINT"]);
    assert.equal(outcomeSettled, false);

    child.signalCode = "SIGINT";
    child.emit("exit", null, "SIGINT");
    assert.deepEqual(await observer.outcome, { code: null, signal: "SIGINT" });
    assert.equal(observer.isComplete(), true);
    assert.equal(processTarget.listenerCount("SIGINT"), 1);
    assert.equal(processTarget.listenerCount("SIGTERM"), 1);
  } finally {
    observer.dispose();
  }
  assert.equal(processTarget.listenerCount("SIGINT"), 0);
  assert.equal(processTarget.listenerCount("SIGTERM"), 0);
});

test("focused wrapper forwards SIGTERM and cleanup remains exact after child exit", async () => {
  const fixtureRoot = path.join(
    repositoryRoot,
    ".tmp",
    `starship-wrapper-signal-unit-${process.pid}`
  );
  const lockPath = path.join(fixtureRoot, "run.lock");
  const trackedPath = path.join(fixtureRoot, "next-env.d.ts");
  const processTarget = new EventEmitter();
  const child = new EventEmitter();
  const forwardedSignals = [];
  child.exitCode = null;
  child.signalCode = null;
  child.kill = (signal) => {
    forwardedSignals.push(signal);
    return true;
  };
  mkdirSync(fixtureRoot, { recursive: true });
  writeFileSync(trackedPath, "canonical-next-env\n", "utf8");
  const snapshot = snapshotStarshipTrackedFile(trackedPath);
  const release = acquireStarshipPlaywrightRunLock(lockPath, {
    ownerPid: process.pid,
    runId: "signal-unit"
  });
  const observer = observeStarshipPlaywrightChild(child, { processTarget });
  try {
    writeFileSync(trackedPath, "temporary-e2e-route-types\n", "utf8");
    processTarget.emit("SIGTERM");
    assert.deepEqual(forwardedSignals, ["SIGTERM"]);
    child.signalCode = "SIGTERM";
    child.emit("exit", null, "SIGTERM");
    assert.deepEqual(await observer.outcome, { code: null, signal: "SIGTERM" });
  } finally {
    try {
      restoreStarshipTrackedFile(trackedPath, snapshot);
    } finally {
      try {
        release();
      } finally {
        observer.dispose();
      }
    }
  }
  assert.equal(readFileSync(trackedPath, "utf8"), "canonical-next-env\n");
  assert.equal(existsSync(lockPath), false);
  assert.equal(processTarget.listenerCount("SIGINT"), 0);
  assert.equal(processTarget.listenerCount("SIGTERM"), 0);
  rmSync(fixtureRoot, { force: true, recursive: true });
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  test(`focused wrapper survives real ${signal} until child and cleanup complete`, async () => {
    await runRealSignalCleanupProbe(signal);
  });
}
