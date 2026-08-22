import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import {
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
  HK_VISUALIZATION_OWNED_PROCESS_LEDGER_SCHEMA,
  seedHkVisualizationOwnedProcessLedger,
} from "./hk-visualization-owned-process-ledger.mjs";
import {
  buildHkVisualizationStarshipPathManifest,
  validateHkVisualizationStarshipPathManifest,
} from "./hk-visualization-starship-path-contract.mjs";
import {
  HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS,
  HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS,
  HK_VISUALIZATION_WORKLOAD_CLEANUP_POST_RESERVE_MS,
  HK_VISUALIZATION_WORKLOAD_START_BARRIER_PROGRAM,
  HK_VISUALIZATION_WORKLOAD_START_BARRIER_SHELL,
  HK_VISUALIZATION_WORKLOAD_SUPERVISOR_SCHEMA,
  cleanupHkVisualizationOwnedProcessLedger,
  deriveHkVisualizationWorkloadCleanupPlan,
  hashHkVisualizationWorkloadCommand,
  hashHkVisualizationWorkloadSupervisorSources,
  parseHkVisualizationWorkloadSupervisorArgs,
  resolveHkVisualizationWorkloadSupervisorPaths,
  validateHkVisualizationWorkloadSupervisorReceipt,
} from "./hk-visualization-workload-supervisor.mjs";

const TEST_FILE = fileURLToPath(import.meta.url);
const E2E_DIR = dirname(TEST_FILE);
const WORKTREE = resolve(E2E_DIR, "../..");
const SUPERVISOR = join(E2E_DIR, "hk-visualization-workload-supervisor.mjs");
const STARSHIP_PREFIX = "/Volumes/Starship/";
const SUITE_TMP_PARENT = join(WORKTREE, ".tmp");
const LSTART_OBSERVER = "Tue Aug 11 00:00:00 2026";
const LSTART_LEADER = "Tue Aug 11 00:00:01 2026";
const LSTART_REUSED = "Tue Aug 11 00:00:02 2026";

assert.ok(
  WORKTREE.startsWith(STARSHIP_PREFIX),
  `Supervisor tests must run from /Volumes/Starship; received ${WORKTREE}`,
);
mkdirSync(SUITE_TMP_PARENT, { recursive: true });
const SUITE_ROOT = mkdtempSync(
  join(SUITE_TMP_PARENT, "hk-viz-workload-supervisor-ledger-contract-"),
);
process.stdout.write(`HK workload supervisor test artifact root: ${SUITE_ROOT}\n`);

const ownedPids = new Set();
const ownedPgids = new Set();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return Boolean(error && typeof error === "object" && error.code === "EPERM");
  }
}

function signalExactPid(pid, signal = "SIGKILL") {
  if (!Number.isSafeInteger(pid) || pid <= 1 || !isAlive(pid)) return;
  try {
    process.kill(pid, signal);
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ESRCH")) throw error;
  }
}

function signalExactGroup(pgid, signal = "SIGKILL") {
  if (!Number.isSafeInteger(pgid) || pgid <= 1) return;
  try {
    process.kill(-pgid, signal);
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ESRCH")) throw error;
  }
}

after(() => {
  for (const pgid of ownedPgids) signalExactGroup(pgid);
  for (const pid of ownedPids) signalExactPid(pid);
});

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function waitForFile(path, { timeoutMs = 12_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(path)) {
    if (Date.now() >= deadline)
      throw new Error(`Timed out waiting for Starship fixture file ${path}`);
    await wait(25);
  }
  return path;
}

async function waitForDead(pid, { timeoutMs = 8_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (isAlive(pid) && Date.now() < deadline) await wait(25);
  return !isAlive(pid);
}

async function waitForProcessExit(child, { timeoutMs = 15_000 } = {}) {
  if (child.exitCode !== null || child.signalCode !== null)
    return { code: child.exitCode, signal: child.signalCode };
  return await new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      signalExactPid(child.pid, "SIGKILL");
      rejectPromise(new Error(`Timed out waiting for owned pid ${child.pid}`));
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      ownedPids.delete(child.pid);
      resolvePromise({ code, signal });
    });
  });
}

function childEnvironment(manifest) {
  return {
    ...process.env,
    HOME: manifest.runtimeTmpDir,
    PLAYWRIGHT_PATH_MANIFEST_FILE: manifest.pathManifestFile,
    PLAYWRIGHT_RUN_ID: manifest.runId,
    PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3020",
    PLAYWRIGHT_BROWSER_CHANNEL: "chrome",
    PLAYWRIGHT_PORT: "3020",
    PLAYWRIGHT_E2E_ROOT: manifest.artifactRoot,
    PLAYWRIGHT_NEXT_DIST_DIR: manifest.nextDistDir,
    PLAYWRIGHT_NEXT_TSCONFIG_PATH: manifest.nextTsconfigPath,
    PLAYWRIGHT_OUTPUT_DIR: manifest.outputDir,
    PLAYWRIGHT_REPORT_DIR: manifest.reportDir,
    PLAYWRIGHT_JSON_OUTPUT_FILE: manifest.jsonReport,
    PLAYWRIGHT_RUNTIME_TMPDIR: manifest.runtimeTmpDir,
    PLAYWRIGHT_BROWSER_PROFILE_ROOT: manifest.browserProfileParent,
    PLAYWRIGHT_SERVICE_LOG_DIR: manifest.serviceLogDir,
    PLAYWRIGHT_SERVICE_PID_DIR: manifest.servicePidDir,
    HK_MATH_DB_PATH: manifest.databasePath,
    HK_MATH_STORAGE_PROVIDER: "sqlite",
    TMPDIR: manifest.runtimeTmpDir,
    TMP: manifest.runtimeTmpDir,
    TEMP: manifest.runtimeTmpDir,
    XDG_CACHE_HOME: manifest.xdgCacheDir,
    XDG_CONFIG_HOME: manifest.xdgConfigDir,
    XDG_STATE_HOME: manifest.xdgStateDir,
    CHROME_LOG_FILE: manifest.chromeLogPath,
    NODE_COMPILE_CACHE: manifest.nodeCompileCacheDir,
    NPM_CONFIG_CACHE: manifest.npmCacheDir,
    npm_config_cache: manifest.npmCacheDir,
    NPM_CONFIG_LOGS_DIR: manifest.npmLogsDir,
    npm_config_logs_dir: manifest.npmLogsDir,
    SQLITE_TMPDIR: manifest.sqliteTmpDir,
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

function supervisorControlArgs(
  manifest,
  command,
  commandArgs,
  runnerPid,
  deadlineEpochMs = Date.now() + 25_000,
) {
  const sourceHashes = hashHkVisualizationWorkloadSupervisorSources();
  const nextTsconfigSha256 = sha256(readFileSync(manifest.nextTsconfigPath));
  return [
    "--manifest",
    manifest.pathManifestFile,
    "--receipt",
    manifest.workloadSupervisorReceiptPath,
    "--ready",
    manifest.workloadSupervisorReadyPath,
    "--start",
    manifest.workloadSupervisorStartPath,
    "--pid",
    manifest.workloadSupervisorPidPath,
    "--leader",
    manifest.workloadSupervisorLeaderPath,
    "--next-env-snapshot",
    manifest.workloadSupervisorNextEnvSnapshotPath,
    "--runner-pid",
    String(runnerPid),
    "--deadline-epoch-ms",
    String(deadlineEpochMs),
    "--command-hash",
    hashHkVisualizationWorkloadCommand(command, commandArgs),
    "--next-tsconfig-sha256",
    nextTsconfigSha256,
    "--path-contract-source-hash",
    sourceHashes.pathContract,
    "--release-runner-source-hash",
    sourceHashes.releaseRunner,
    "--owned-process-ledger-source-hash",
    sourceHashes.ownedProcessLedger,
    "--supervisor-source-hash",
    sourceHashes.supervisor,
    "--",
    command,
    ...commandArgs,
  ];
}

const PLAYWRIGHT_FIXTURE_SOURCE = `#!/usr/bin/env node
const { spawn } = require("node:child_process");
const { existsSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const [mode, markerPath, nextEnvPath, nextTsconfigPath] = process.argv.slice(2);
if (!markerPath || !nextEnvPath || !nextTsconfigPath) process.exit(91);
writeFileSync(nextEnvPath, "/// mutated by owned supervisor fixture\\n");
if (!readFileSync(nextTsconfigPath, "utf8").includes("precreated")) process.exit(94);
rmSync(nextTsconfigPath);
if (mode === "normal") {
  const releasePath = markerPath + ".release.signal";
  writeFileSync(markerPath, JSON.stringify({ leaderPid: process.pid, mode, releasePath }) + "\\n");
  const releaseWait = new Int32Array(new SharedArrayBuffer(4));
  while (!existsSync(releasePath)) Atomics.wait(releaseWait, 0, 0, 25);
  process.exit(0);
}
if (mode === "detached-owned-tree") {
  const detachedMarkerPath = markerPath + ".detached.json";
  const grandchildProgram = [
    "const { writeFileSync } = require('node:fs');",
    "const markerPath = process.argv[1];",
    "writeFileSync(markerPath, JSON.stringify({ detachedPid: process.pid }) + '\\\\n');",
    "process.on('SIGTERM', () => {});",
    "process.on('SIGINT', () => {});",
    "setInterval(() => {}, 1000);",
  ].join("");
  const grandchild = spawn(process.execPath, ["-e", grandchildProgram, detachedMarkerPath], {
    detached: true,
    env: process.env,
    stdio: "ignore",
  });
  if (!Number.isSafeInteger(grandchild.pid) || grandchild.pid <= 1) process.exit(96);
  grandchild.unref();
  writeFileSync(markerPath, JSON.stringify({
    leaderPid: process.pid,
    detachedPid: grandchild.pid,
    detachedMarkerPath,
    mode,
  }) + "\\n");
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
  process.exit(0);
}
if (mode === "timeout") {
  writeFileSync(markerPath, JSON.stringify({ leaderPid: process.pid, mode }) + "\\n");
  setInterval(() => {}, 1000);
} else {
  if (mode !== "ignore-term-tree") process.exit(92);
  process.on("SIGTERM", () => {});
  process.on("SIGINT", () => {});
  const grandchildProgram = [
    "process.on('SIGTERM', () => {});",
    "process.on('SIGINT', () => {});",
    "setInterval(() => {}, 1000);",
  ].join("");
  const grandchild = spawn(process.execPath, ["-e", grandchildProgram], {
    env: process.env,
    stdio: "ignore",
  });
  if (!Number.isSafeInteger(grandchild.pid) || grandchild.pid <= 1) process.exit(93);
  writeFileSync(markerPath, JSON.stringify({ leaderPid: process.pid, grandchildPid: grandchild.pid, mode }) + "\\n");
  setInterval(() => {}, 1000);
}
`;

function prepareFixture(label) {
  const workspace = join(SUITE_ROOT, label);
  const playwrightCli = join(
    workspace,
    "node_modules",
    "@playwright",
    "test",
    "cli.js",
  );
  const command = process.execPath;
  const runId = `supervisor-${label}`;
  mkdirSync(dirname(playwrightCli), { recursive: true });
  writeFileSync(playwrightCli, PLAYWRIGHT_FIXTURE_SOURCE, { mode: 0o700 });
  chmodSync(playwrightCli, 0o700);
  writeFileSync(join(workspace, "next-env.d.ts"), "/// canonical fixture next-env\\n");
  const manifest = buildHkVisualizationStarshipPathManifest({ workspace, runId });
  assert.deepEqual(validateHkVisualizationStarshipPathManifest(manifest), []);
  for (const path of [
    manifest.artifactRoot,
    manifest.browserProfileParent,
    manifest.runtimeTmpDir,
    manifest.nextDistDir,
    manifest.outputDir,
    manifest.reportDir,
    manifest.serviceLogDir,
    manifest.servicePidDir,
    manifest.sqliteTmpDir,
    manifest.workloadSupervisorDir,
    manifest.workloadSupervisorTmpDir,
    manifest.xdgCacheDir,
    manifest.xdgConfigDir,
    manifest.xdgStateDir,
    manifest.nodeCompileCacheDir,
    manifest.npmCacheDir,
    manifest.npmLogsDir,
  ]) {
    assert.ok(path.startsWith(STARSHIP_PREFIX), `Fixture path escaped Starship: ${path}`);
    mkdirSync(path, { recursive: true });
  }
  writeFileSync(manifest.pathManifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    manifest.nextTsconfigPath,
    '{"fixture":"precreated"}\n',
    { flag: "wx", mode: 0o600 },
  );
  writeFileSync(manifest.workloadSupervisorStartPath, "start\n");
  return {
    workspace,
    command,
    playwrightCli,
    manifest,
    markerPath: join(manifest.workloadSupervisorDir, "workload.marker.json"),
    parentControlPath: join(manifest.workloadSupervisorDir, "parent.json"),
    canonicalNextEnv: readFileSync(join(workspace, "next-env.d.ts"), "utf8"),
  };
}

function launchSupervisor({
  fixture,
  mode,
  runnerPid = process.pid,
  deadlineEpochMs = Date.now() + 25_000,
}) {
  const commandArgs = [
    fixture.playwrightCli,
    mode,
    fixture.markerPath,
    join(fixture.workspace, "next-env.d.ts"),
    fixture.manifest.nextTsconfigPath,
  ];
  const supervisorArgs = supervisorControlArgs(
    fixture.manifest,
    fixture.command,
    commandArgs,
    runnerPid,
    deadlineEpochMs,
  );
  const logFd = openSync(fixture.manifest.workloadSupervisorLogPath, "a", 0o600);
  const child = spawn(process.execPath, [SUPERVISOR, ...supervisorArgs], {
    cwd: fixture.workspace,
    env: childEnvironment(fixture.manifest),
    stdio: ["ignore", logFd, logFd],
  });
  closeSync(logFd);
  ownedPids.add(child.pid);
  return { child, commandArgs, supervisorArgs };
}

function canonicalResolvedPaths(manifest) {
  return {
    manifestPath: manifest.pathManifestFile,
    receiptPath: manifest.workloadSupervisorReceiptPath,
    readyPath: manifest.workloadSupervisorReadyPath,
    startPath: manifest.workloadSupervisorStartPath,
    pidPath: manifest.workloadSupervisorPidPath,
    leaderPath: manifest.workloadSupervisorLeaderPath,
    nextEnvSnapshotPath: manifest.workloadSupervisorNextEnvSnapshotPath,
  };
}

function processEntry({
  pid,
  ppid,
  pgid,
  lstartToken,
  state = "S",
  executable = "node",
}) {
  return Object.freeze({
    pid,
    ppid,
    pgid,
    lstartToken,
    state,
    executableSha256: sha256(executable),
  });
}

function receiptFixture(manifest, commandHash, overrides = {}) {
  const now = Date.now();
  const deadlineEpochMs = now + 60_000;
  const cleanupStartedMonotonicNs = 100_000_000_000n;
  const cleanupDeadlineMonotonicNs =
    cleanupStartedMonotonicNs +
    BigInt(HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS) * 1_000_000n;
  const cleanupCompletedMonotonicNs =
    cleanupStartedMonotonicNs + 100_000_000n;
  const observer = processEntry({
    pid: 202,
    ppid: 201,
    pgid: 201,
    lstartToken: LSTART_OBSERVER,
    executable: "supervisor",
  });
  const leader = processEntry({
    pid: 203,
    ppid: 202,
    pgid: 203,
    lstartToken: LSTART_LEADER,
    state: "T",
    executable: "sh",
  });
  const ledger = {
    schemaVersion: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_SCHEMA,
    revision: 5,
    leader: {
      pid: leader.pid,
      ppid: leader.ppid,
      pgid: leader.pgid,
      lstartToken: leader.lstartToken,
    },
    identities: [
      {
        pid: leader.pid,
        lstartToken: leader.lstartToken,
        firstSeenPpid: leader.ppid,
        firstSeenPgid: leader.pgid,
        lastPpid: leader.ppid,
        lastPgid: leader.pgid,
        state: "S",
        executableSha256: sha256("node"),
        discoveredFromPid: null,
        discoveredFromLstartToken: null,
      },
    ],
    boundedPollingLimitation:
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
  };
  return {
    schemaVersion: HK_VISUALIZATION_WORKLOAD_SUPERVISOR_SCHEMA,
    runId: manifest.runId,
    manifestHash: manifest.manifestHash,
    runnerPid: 201,
    supervisorPid: 202,
    commandHash,
    deadlineEpochMs,
    lockNonceHash: sha256("fixture-lock-nonce"),
    sourceHashes: hashHkVisualizationWorkloadSupervisorSources(),
    observerIdentity: {
      pid: observer.pid,
      lstartToken: observer.lstartToken,
    },
    leaderIdentity: leader,
    leaderPid: leader.pid,
    pgid: leader.pgid,
    startedAtUtc: new Date(now - 1_000).toISOString(),
    completedAtUtc: new Date(now).toISOString(),
    stopReason: "workload-exit",
    workloadExitCode: 0,
    workloadSignal: null,
    processTable: {
      command: "/bin/ps",
      args: [...HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS],
      timeoutMs: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
      maxBufferBytes: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_MAX_BUFFER,
      readsProcessEnvironment: false,
    },
    cleanupTiming: {
      clock: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_MONOTONIC_CLOCK,
      outerGraceMs: HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS,
      postCleanupReserveMs:
        HK_VISUALIZATION_WORKLOAD_CLEANUP_POST_RESERVE_MS,
      maxBudgetMs: HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS,
      absoluteOuterDeadlineEpochMs:
        deadlineEpochMs + HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS,
      plannedBudgetMs: HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS,
      startedMonotonicNs: cleanupStartedMonotonicNs.toString(),
      deadlineMonotonicNs: cleanupDeadlineMonotonicNs.toString(),
      completedMonotonicNs: cleanupCompletedMonotonicNs.toString(),
      elapsedMs: 100,
      remainingMs:
        HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS - 100,
      expired: false,
      expiryPhase: null,
      sampleCount: 3,
      minimumSampleTimeoutMs: 4_900,
      maximumSampleTimeoutMs: 5_000,
    },
    boundedPollingLimitation:
      HK_VISUALIZATION_OWNED_PROCESS_LEDGER_BOUNDED_POLLING_LIMITATION,
    polling: {
      configuredPollMs: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS,
      sampleCount: 5,
      startedAtUtc: new Date(now - 900).toISOString(),
      completedAtUtc: new Date(now - 100).toISOString(),
      maxSampleStartGapMs: 55,
      samplesDigestSha256: sha256("samples"),
    },
    ledger,
    termSentAtUtc: null,
    killSentAtUtc: null,
    observations: [
      { phase: "seed", members: [leader] },
      { phase: "before-cleanup", members: [] },
      { phase: "final-confirmation", members: [] },
      { phase: "final", members: [] },
    ],
    signalEvidence: [],
    signalErrors: [],
    confirmedEmpty: true,
    finalConfirmationGapMs: HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS,
    finalLiveEntries: [],
    finalGroupMemberPids: [],
    ownedPgids: [203],
    nextEnvBeforeSha256: sha256("next-env"),
    nextEnvAfterSha256: sha256("next-env"),
    nextEnvRestored: true,
    nextTsconfigEvidence: {
      expectedSha256: sha256('{"fixture":"precreated"}\n'),
      preimage: {
        device: String(manifest.volumeIdentity.starshipRoot.device),
        inode: "12345",
        mode: 0o600,
        size: Buffer.byteLength('{"fixture":"precreated"}\n'),
        sha256: sha256('{"fixture":"precreated"}\n'),
      },
      disposition: "removed-by-workload",
      removed: true,
    },
    errors: [],
    status: "complete",
    ...overrides,
  };
}

test("argv parsing binds deadline, precreated tsconfig hash, four source hashes, Node command, CLI, and every control path byte-for-byte", () => {
  const fixture = prepareFixture("argv-contract");
  const args = ["test", "--project=desktop-chrome", "value with spaces"];
  args.unshift(fixture.playwrightCli);
  const deadlineEpochMs = Date.now() + 60_000;
  const argv = supervisorControlArgs(
    fixture.manifest,
    fixture.command,
    args,
    process.pid,
    deadlineEpochMs,
  );
  const parsed = parseHkVisualizationWorkloadSupervisorArgs(argv);
  assert.equal(parsed.command, fixture.command);
  assert.deepEqual(parsed.args, args);
  assert.equal(parsed.runnerPid, process.pid);
  assert.equal(parsed.deadlineEpochMs, deadlineEpochMs);
  assert.equal(
    parsed.nextTsconfigSha256,
    sha256(readFileSync(fixture.manifest.nextTsconfigPath)),
  );
  assert.deepEqual(
    Object.keys(parsed.sourceHashes).sort(),
    ["ownedProcessLedger", "pathContract", "releaseRunner", "supervisor"],
  );
  assert.equal(
    parsed.commandHash,
    hashHkVisualizationWorkloadCommand(fixture.command, args),
  );
  assert.throws(
    () => parseHkVisualizationWorkloadSupervisorArgs(argv.filter((value) => value !== "--")),
    /requires -- followed by one command/,
  );
  const staleDeadline = [...argv];
  staleDeadline[staleDeadline.indexOf("--deadline-epoch-ms") + 1] = String(
    Date.now() - 1,
  );
  assert.throws(
    () => parseHkVisualizationWorkloadSupervisorArgs(staleDeadline),
    /future safe integer/,
  );
  const rawMarker = "SUPERVISOR_CLI_RAW_MARKER_MUST_NOT_LEAK";
  assert.throws(
    () =>
      parseHkVisualizationWorkloadSupervisorArgs([
        `--${rawMarker}`,
        rawMarker,
        ...argv,
      ]),
    (error) => {
      assert.doesNotMatch(String(error?.message), new RegExp(rawMarker));
      assert.match(String(error?.message), /unknown control argument.*sha256=/);
      return true;
    },
  );
});

test(
  "supervisor refuses a non-Node workload command and a drifted precreated tsconfig before spawning a workload",
  { timeout: 15_000 },
  async () => {
    for (const [label, mutateArgs, expectedLog] of [
      [
        "non-node-command",
        (fixture, args) => {
          const separator = args.indexOf("--");
          const commandArgs = [fixture.playwrightCli, "normal"];
          args.splice(separator + 1, args.length, "/bin/sh", ...commandArgs);
          const commandHashIndex = args.indexOf("--command-hash") + 1;
          args[commandHashIndex] = hashHkVisualizationWorkloadCommand(
            "/bin/sh",
            commandArgs,
          );
        },
        /command path must equal process\.execPath/,
      ],
      [
        "tsconfig-hash-drift",
        (_fixture, args) => {
          args[args.indexOf("--next-tsconfig-sha256") + 1] = "0".repeat(64);
        },
        /run-specific tsconfig byte hash drifted/,
      ],
    ]) {
      const fixture = prepareFixture(label);
      const commandArgs = [
        fixture.playwrightCli,
        "normal",
        fixture.markerPath,
        join(fixture.workspace, "next-env.d.ts"),
        fixture.manifest.nextTsconfigPath,
      ];
      const args = supervisorControlArgs(
        fixture.manifest,
        fixture.command,
        commandArgs,
        process.pid,
      );
      mutateArgs(fixture, args);
      const logFd = openSync(
        fixture.manifest.workloadSupervisorLogPath,
        "a",
        0o600,
      );
      const child = spawn(process.execPath, [SUPERVISOR, ...args], {
        cwd: fixture.workspace,
        env: childEnvironment(fixture.manifest),
        stdio: ["ignore", logFd, logFd],
      });
      closeSync(logFd);
      ownedPids.add(child.pid);
      assert.deepEqual(await waitForProcessExit(child), {
        code: 1,
        signal: null,
      });
      assert.equal(existsSync(fixture.markerPath), false, label);
      assert.match(
        readFileSync(fixture.manifest.workloadSupervisorLogPath, "utf8"),
        expectedLog,
        label,
      );
    }
  },
);

test("path resolver accepts only canonical Starship aliases and rejects swaps and foreign strings", () => {
  const fixture = prepareFixture("path-contract");
  const expected = canonicalResolvedPaths(fixture.manifest);
  assert.deepEqual(
    resolveHkVisualizationWorkloadSupervisorPaths({
      manifest: fixture.manifest,
      ...expected,
    }),
    expected,
  );
  assert.throws(
    () =>
      resolveHkVisualizationWorkloadSupervisorPaths({
        manifest: fixture.manifest,
        ...expected,
        readyPath: fixture.manifest.workloadSupervisorPidPath,
      }),
    /readyPath must equal/,
  );
  assert.throws(
    () =>
      resolveHkVisualizationWorkloadSupervisorPaths({
        manifest: fixture.manifest,
        ...expected,
        receiptPath: "/tmp/forbidden-receipt.json",
      }),
    /must stay inside \/Volumes\/Starship/,
  );
});

test("supervisor source has a stopped-shell start barrier and no environment-reading ps or ownership-token path", () => {
  const source = readFileSync(SUPERVISOR, "utf8");
  assert.equal(HK_VISUALIZATION_WORKLOAD_START_BARRIER_SHELL, "/bin/sh");
  assert.equal(
    HK_VISUALIZATION_WORKLOAD_START_BARRIER_PROGRAM,
    'kill -STOP "$$"; exec "$@"',
  );
  assert.doesNotMatch(source, /\beww\b/);
  assert.doesNotMatch(source, /MAIS_HK_VISUALIZATION_WORKLOAD_TOKEN/);
  assert.doesNotMatch(source, /ownershipToken/);
  assert.match(source, /readsProcessEnvironment:\s*false/);
  assert.match(
    source,
    /requireFallbackBudget\("direct-child-before-sigkill", 1\);[\s\S]*child\.kill\("SIGKILL"\)/,
  );
  assert.match(
    source,
    /const fallbackWaitMs = requireFallbackBudget\([\s\S]*waitMilliseconds\(fallbackWaitMs\)/,
  );
  assert.doesNotMatch(
    source,
    /childExitPromise,[\s\S]{0,120}waitMilliseconds\(5_000\)/,
  );
  assert.deepEqual(HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_ARGS, [
    "-axww",
    "-o",
    "pid=,ppid=,pgid=,lstart=,state=,comm=",
  ]);
});

test("cleanup plan uses one monotonic budget and always reserves ten seconds inside the outer thirty-second grace", () => {
  const workloadDeadlineEpochMs = 1_000_000;
  const atWorkloadDeadline = deriveHkVisualizationWorkloadCleanupPlan({
    deadlineEpochMs: workloadDeadlineEpochMs,
    wallNowEpochMs: workloadDeadlineEpochMs,
    monotonicNowNs: 500_000_000_000n,
  });
  assert.deepEqual(atWorkloadDeadline, {
    absoluteOuterDeadlineEpochMs:
      workloadDeadlineEpochMs +
      HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS,
    plannedBudgetMs: HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS,
    startedMonotonicNs: 500_000_000_000n,
    deadlineMonotonicNs:
      500_000_000_000n +
      BigInt(HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS) * 1_000_000n,
  });
  assert.equal(
    atWorkloadDeadline.plannedBudgetMs +
      HK_VISUALIZATION_WORKLOAD_CLEANUP_POST_RESERVE_MS,
    HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS,
  );

  const latePlan = deriveHkVisualizationWorkloadCleanupPlan({
    deadlineEpochMs: workloadDeadlineEpochMs,
    wallNowEpochMs:
      workloadDeadlineEpochMs +
      HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS -
      HK_VISUALIZATION_WORKLOAD_CLEANUP_POST_RESERVE_MS +
      1,
    monotonicNowNs: 700_000_000_000n,
  });
  assert.equal(latePlan.plannedBudgetMs, 0);
  assert.equal(latePlan.deadlineMonotonicNs, latePlan.startedMonotonicNs);
});

test("receipt validator binds observer, leader lstart, no-env policy, polling limitation, exact ledger, and double-empty cleanup", () => {
  const fixture = prepareFixture("receipt-contract");
  const commandHash = hashHkVisualizationWorkloadCommand(fixture.command, ["test"]);
  const green = receiptFixture(fixture.manifest, commandHash);
  const validated = validateHkVisualizationWorkloadSupervisorReceipt(green, {
    manifest: fixture.manifest,
    commandHash,
    expectedDeadlineEpochMs: green.deadlineEpochMs,
    expectedNextTsconfigSha256:
      green.nextTsconfigEvidence.expectedSha256,
    expectedSourceHashes: green.sourceHashes,
  });
  assert.equal(validated.status, "complete");
  assert.equal(validated.leaderIdentity.lstartToken, LSTART_LEADER);
  assert.equal(validated.observerIdentity.lstartToken, LSTART_OBSERVER);
  for (const [mutation, pattern] of [
    [(value) => (value.processTable.args[0] = "eww"), /processTable-policy-drift/],
    [(value) => (value.leaderIdentity.lstartToken = LSTART_REUSED), /leaderIdentity|ledger-leader/],
    [(value) => (value.confirmedEmpty = false), /status-drift/],
    [(value) => (value.deadlineEpochMs += 1), /deadlineEpochMs-drift/],
    [
      (value) => (value.cleanupTiming.deadlineMonotonicNs = "120000000001"),
      /cleanupTiming-deadline-plan-drift/,
    ],
    [
      (value) => (value.cleanupTiming.completedMonotonicNs = "120000000000"),
      /cleanupTiming-(elapsed-drift|remaining-drift|expired-drift)|cleanup-confirmed-empty-after-deadline|status-drift/,
    ],
    [
      (value) => (value.cleanupTiming.maximumSampleTimeoutMs = 5_001),
      /cleanupTiming-sample-timeout-invalid/,
    ],
    [
      (value) => delete value.cleanupTiming.expiryPhase,
      /cleanupTiming-key-set-drift/,
    ],
    [(value) => (value.finalConfirmationGapMs = 1), /final-confirmation-gap/],
    [(value) => (value.ledger.identities[0].lastPgid = 1), /ledger-identity/],
    [(value) => (value.ownedPgids = []), /ownedPgids-missing-leader-pgid/],
    [
      (value) => (value.nextTsconfigEvidence.preimage.device = "1"),
      /next-tsconfig-evidence-invalid/,
    ],
    [
      (value) => (value.nextTsconfigEvidence.preimage.sha256 = "0".repeat(64)),
      /next-tsconfig-evidence-invalid/,
    ],
    [
      (value) =>
        value.signalErrors.push({
          scope: "pid",
          target: 203,
          signal: "SIGTERM",
          code: "EPERM",
          pid: 203,
          pgid: 203,
          lstartToken: LSTART_LEADER,
        }),
      /confirmed-empty-with-signal-errors|status-drift/,
    ],
    [(value) => (value.status = "failed"), /status-drift/],
  ]) {
    const drifted = structuredClone(green);
    mutation(drifted);
    assert.throws(
      () =>
        validateHkVisualizationWorkloadSupervisorReceipt(drifted, {
          manifest: fixture.manifest,
          commandHash,
          expectedDeadlineEpochMs: green.deadlineEpochMs,
        }),
      pattern,
    );
  }

  const expired = structuredClone(green);
  expired.cleanupTiming.completedMonotonicNs =
    expired.cleanupTiming.deadlineMonotonicNs;
  expired.cleanupTiming.elapsedMs =
    HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS;
  expired.cleanupTiming.remainingMs = 0;
  expired.cleanupTiming.expired = true;
  expired.cleanupTiming.expiryPhase = "after-kill-wait-complete";
  expired.confirmedEmpty = false;
  expired.observations.push({ phase: "deadline-expired", members: [] });
  expired.errors.push(
    "aggregate monotonic owned-process cleanup deadline elapsed",
  );
  expired.status = "failed";
  const validatedExpired = validateHkVisualizationWorkloadSupervisorReceipt(
    expired,
    {
      manifest: fixture.manifest,
      commandHash,
      expectedDeadlineEpochMs: green.deadlineEpochMs,
    },
  );
  assert.equal(validatedExpired.status, "failed");
  assert.equal(validatedExpired.cleanupTiming.expired, true);
});

test(
  "normal exit is seeded behind the stopped start barrier, continuously sampled, restored, and double-confirmed empty",
  { timeout: 25_000 },
  async () => {
    const fixture = prepareFixture("normal-exit");
    const { child, commandArgs } = launchSupervisor({ fixture, mode: "normal" });
    await waitForFile(fixture.markerPath);
    await waitForFile(fixture.manifest.workloadSupervisorLeaderPath);
    const marker = JSON.parse(readFileSync(fixture.markerPath, "utf8"));
    const leaderArtifact = JSON.parse(
      readFileSync(fixture.manifest.workloadSupervisorLeaderPath, "utf8"),
    );
    assert.equal(marker.leaderPid, leaderArtifact.leaderPid);
    assert.match(leaderArtifact.leaderIdentity.lstartToken, /2026$/);
    writeFileSync(marker.releasePath, "release\n");
    assert.deepEqual(await waitForProcessExit(child), { code: 0, signal: null });
    const receipt = JSON.parse(
      readFileSync(fixture.manifest.workloadSupervisorReceiptPath, "utf8"),
    );
    const validated = validateHkVisualizationWorkloadSupervisorReceipt(receipt, {
      manifest: fixture.manifest,
      commandHash: hashHkVisualizationWorkloadCommand(fixture.command, commandArgs),
    });
    assert.equal(validated.status, "complete");
    assert.equal(
      validated.nextTsconfigEvidence.disposition,
      "removed-by-workload",
    );
    assert.equal(receipt.processTable.readsProcessEnvironment, false);
    assert.equal(receipt.cleanupTiming.expired, false);
    assert.equal(
      receipt.cleanupTiming.plannedBudgetMs <=
        HK_VISUALIZATION_WORKLOAD_CLEANUP_MAX_BUDGET_MS,
      true,
    );
    assert.equal(
      receipt.cleanupTiming.maximumSampleTimeoutMs <=
        HK_VISUALIZATION_OWNED_PROCESS_LEDGER_PS_TIMEOUT_MS,
      true,
    );
    assert.equal(receipt.confirmedEmpty, true);
    assert.ok(
      receipt.finalConfirmationGapMs >=
        HK_VISUALIZATION_OWNED_PROCESS_LEDGER_POLL_MS,
    );
    assert.equal(receipt.observations.at(-2).phase, "final-confirmation");
    assert.equal(receipt.observations.at(-1).phase, "final");
    assert.deepEqual(receipt.finalLiveEntries, []);
    assert.equal(
      readFileSync(join(fixture.workspace, "next-env.d.ts"), "utf8"),
      fixture.canonicalNextEnv,
    );
    assert.equal(existsSync(fixture.manifest.nextTsconfigPath), false);
  },
);

test(
  "a continuously observed detached descendant in a new PGID remains ledger-owned after reparenting and is identity-safely killed",
  { timeout: 30_000 },
  async () => {
    const fixture = prepareFixture("detached-new-pgid");
    const { child, commandArgs } = launchSupervisor({
      fixture,
      mode: "detached-owned-tree",
    });
    await waitForFile(fixture.markerPath);
    const marker = JSON.parse(readFileSync(fixture.markerPath, "utf8"));
    ownedPgids.add(marker.detachedPid);
    await waitForFile(marker.detachedMarkerPath);
    const detachedMarker = JSON.parse(readFileSync(marker.detachedMarkerPath, "utf8"));
    assert.equal(detachedMarker.detachedPid, marker.detachedPid);
    assert.deepEqual(await waitForProcessExit(child, { timeoutMs: 20_000 }), {
      code: 1,
      signal: null,
    });
    const receipt = JSON.parse(
      readFileSync(fixture.manifest.workloadSupervisorReceiptPath, "utf8"),
    );
    validateHkVisualizationWorkloadSupervisorReceipt(receipt, {
      manifest: fixture.manifest,
      commandHash: hashHkVisualizationWorkloadCommand(fixture.command, commandArgs),
    });
    assert.equal(receipt.status, "failed");
    assert.match(receipt.errors.join("\n"), /observed owned processes remained/);
    const detachedIdentity = receipt.ledger.identities.find(
      ({ pid }) => pid === marker.detachedPid,
    );
    assert.ok(detachedIdentity, "detached process must remain in the retained ledger");
    assert.equal(detachedIdentity.firstSeenPpid, marker.leaderPid);
    assert.equal(detachedIdentity.lastPgid, marker.detachedPid);
    assert.ok(receipt.ownedPgids.includes(marker.detachedPid));
    assert.ok(
      receipt.signalEvidence.some(
        ({ pid, signal }) => pid === marker.detachedPid && signal === "SIGKILL",
      ),
    );
    assert.equal(receipt.confirmedEmpty, true);
    assert.equal(await waitForDead(marker.detachedPid), true);
    ownedPgids.delete(marker.detachedPid);
  },
);

test("ledger cleanup re-samples pid+lstart and never signals a foreign PID replacement", async () => {
  const observer = processEntry({
    pid: 92000,
    ppid: 1,
    pgid: 92000,
    lstartToken: LSTART_OBSERVER,
    executable: "observer",
  });
  const leader = processEntry({
    pid: 92001,
    ppid: observer.pid,
    pgid: 92001,
    lstartToken: LSTART_LEADER,
    executable: "leader",
  });
  const replacement = processEntry({
    ...leader,
    ppid: 1,
    lstartToken: LSTART_REUSED,
    executable: "foreign",
  });
  const ledger = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: {
      pid: leader.pid,
      ppid: leader.ppid,
      pgid: leader.pgid,
    },
    processes: [observer, leader],
  });
  const signals = [];
  const cleanup = await cleanupHkVisualizationOwnedProcessLedger({
    ledger,
    observerIdentity: { pid: observer.pid, lstartToken: observer.lstartToken },
    sampleProcesses: () => [observer, replacement],
    signalProcess(...args) {
      signals.push(args);
    },
    signalProcessGroup(...args) {
      signals.push(args);
    },
    wait: async () => {},
    pollMs: 1,
  });
  assert.deepEqual(signals, []);
  assert.deepEqual(cleanup.finalLiveEntries, []);
  assert.equal(cleanup.confirmedEmpty, false, "zero elapsed fake wait cannot forge double-empty proof");
});

test("ledger cleanup rejects unsafe injected PID/PGID identities before any signal", async () => {
  const observer = processEntry({
    pid: 93000,
    ppid: 1,
    pgid: 93000,
    lstartToken: LSTART_OBSERVER,
  });
  const leader = processEntry({
    pid: 93001,
    ppid: observer.pid,
    pgid: 93001,
    lstartToken: LSTART_LEADER,
  });
  const seeded = seedHkVisualizationOwnedProcessLedger({
    expectedLeader: {
      pid: leader.pid,
      ppid: leader.ppid,
      pgid: leader.pgid,
    },
    processes: [observer, leader],
  });
  for (const [label, mutate] of [
    ["pid-one", (ledger) => (ledger.identities[0].pid = 1)],
    ["pgid-one", (ledger) => (ledger.identities[0].lastPgid = 1)],
  ]) {
    const unsafeLedger = structuredClone(seeded);
    mutate(unsafeLedger);
    const signals = [];
    await assert.rejects(
      cleanupHkVisualizationOwnedProcessLedger({
        ledger: unsafeLedger,
        observerIdentity: {
          pid: observer.pid,
          lstartToken: observer.lstartToken,
        },
        sampleProcesses: () => [observer, leader],
        signalProcess(...args) {
          signals.push(args);
        },
        signalProcessGroup(...args) {
          signals.push(args);
        },
      }),
      /unsafe identity|leader identity|shape or policy/i,
      label,
    );
    assert.deepEqual(signals, [], label);
  }
});

test(
  "absolute deadline produces workload-timeout RED evidence and ledger-cleans the live leader",
  { timeout: 20_000 },
  async () => {
    const fixture = prepareFixture("deadline-timeout");
    const { child, commandArgs } = launchSupervisor({
      fixture,
      mode: "timeout",
      deadlineEpochMs: Date.now() + 1_500,
    });
    await waitForFile(fixture.markerPath);
    assert.deepEqual(await waitForProcessExit(child), { code: 1, signal: null });
    const receipt = JSON.parse(
      readFileSync(fixture.manifest.workloadSupervisorReceiptPath, "utf8"),
    );
    validateHkVisualizationWorkloadSupervisorReceipt(receipt, {
      manifest: fixture.manifest,
      commandHash: hashHkVisualizationWorkloadCommand(fixture.command, commandArgs),
    });
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.stopReason, "workload-timeout");
    assert.match(receipt.errors.join("\n"), /deadline elapsed/);
    assert.equal(receipt.cleanupTiming.expired, false);
    assert.equal(
      receipt.cleanupTiming.absoluteOuterDeadlineEpochMs,
      receipt.deadlineEpochMs +
        HK_VISUALIZATION_WORKLOAD_CLEANUP_OUTER_GRACE_MS,
    );
    assert.equal(receipt.confirmedEmpty, true);
    assert.deepEqual(receipt.finalLiveEntries, []);
  },
);

test(
  "an already-dead expected parent fails before workload spawn and cannot create a leader or marker",
  { timeout: 15_000 },
  async () => {
    const fixture = prepareFixture("dead-before-start");
    const exitedParent = spawn(process.execPath, ["-e", "process.exit(0)"], {
      cwd: fixture.workspace,
      env: childEnvironment(fixture.manifest),
      stdio: "ignore",
    });
    ownedPids.add(exitedParent.pid);
    const deadPid = exitedParent.pid;
    assert.deepEqual(await waitForProcessExit(exitedParent), {
      code: 0,
      signal: null,
    });
    const { child } = launchSupervisor({
      fixture,
      mode: "normal",
      runnerPid: deadPid,
    });
    assert.deepEqual(await waitForProcessExit(child), { code: 1, signal: null });
    assert.equal(existsSync(fixture.markerPath), false);
    assert.equal(existsSync(fixture.manifest.workloadSupervisorLeaderPath), false);
    assert.equal(existsSync(fixture.manifest.workloadSupervisorReceiptPath), false);
    assert.match(
      readFileSync(fixture.manifest.workloadSupervisorLogPath, "utf8"),
      /runner identity is unavailable/,
    );
  },
);

test(
  "runner SIGKILL reaps a TERM-ignoring leader and grandchild, records parent-exit RED, and restores exact files",
  { timeout: 35_000 },
  async () => {
    const fixture = prepareFixture("parent-sigkill");
    const commandArgs = [
      fixture.playwrightCli,
      "ignore-term-tree",
      fixture.markerPath,
      join(fixture.workspace, "next-env.d.ts"),
      fixture.manifest.nextTsconfigPath,
    ];
    const argvTemplate = supervisorControlArgs(
      fixture.manifest,
      fixture.command,
      commandArgs,
      process.pid,
      Date.now() + 30_000,
    ).map((value, index, values) =>
      values[index - 1] === "--runner-pid" ? "__RUNNER_PID__" : value,
    );
    const parentScriptPath = join(fixture.workspace, "owned-parent-runner.mjs");
    const parentConfigPath = join(fixture.workspace, "owned-parent-config.json");
    writeFileSync(
      parentScriptPath,
      `import { spawn } from "node:child_process";\n` +
        `import { closeSync, openSync, readFileSync, writeFileSync } from "node:fs";\n` +
        `const config = JSON.parse(readFileSync(process.argv[2], "utf8"));\n` +
        `const argv = config.argvTemplate.map((value) => value === "__RUNNER_PID__" ? String(process.pid) : value);\n` +
        `const logFd = openSync(config.logPath, "a", 0o600);\n` +
        `const supervisor = spawn(process.execPath, [config.supervisor, ...argv], { cwd: config.cwd, env: { ...process.env, ...config.environment }, stdio: ["ignore", logFd, logFd] });\n` +
        `closeSync(logFd);\n` +
        `writeFileSync(config.controlPath, JSON.stringify({ parentPid: process.pid, supervisorPid: supervisor.pid }) + "\\n");\n` +
        `setInterval(() => {}, 1000);\n`,
    );
    writeFileSync(
      parentConfigPath,
      `${JSON.stringify({
        argvTemplate,
        controlPath: fixture.parentControlPath,
        cwd: fixture.workspace,
        environment: childEnvironment(fixture.manifest),
        logPath: fixture.manifest.workloadSupervisorLogPath,
        supervisor: SUPERVISOR,
      })}\n`,
    );
    const parentLogPath = join(
      fixture.manifest.workloadSupervisorDir,
      "parent.log",
    );
    const parentLogFd = openSync(parentLogPath, "a", 0o600);
    const parent = spawn(process.execPath, [parentScriptPath, parentConfigPath], {
      cwd: fixture.workspace,
      env: childEnvironment(fixture.manifest),
      stdio: ["ignore", parentLogFd, parentLogFd],
    });
    closeSync(parentLogFd);
    ownedPids.add(parent.pid);

    await waitForFile(fixture.parentControlPath);
    await waitForFile(fixture.manifest.workloadSupervisorLeaderPath);
    await waitForFile(fixture.markerPath);
    const control = JSON.parse(readFileSync(fixture.parentControlPath, "utf8"));
    const marker = JSON.parse(readFileSync(fixture.markerPath, "utf8"));
    ownedPids.add(control.supervisorPid);
    ownedPgids.add(marker.leaderPid);
    process.kill(parent.pid, "SIGKILL");
    assert.deepEqual(await waitForProcessExit(parent), {
      code: null,
      signal: "SIGKILL",
    });
    await waitForFile(fixture.manifest.workloadSupervisorReceiptPath, {
      timeoutMs: 20_000,
    });
    const receipt = JSON.parse(
      readFileSync(fixture.manifest.workloadSupervisorReceiptPath, "utf8"),
    );
    validateHkVisualizationWorkloadSupervisorReceipt(receipt, {
      manifest: fixture.manifest,
      commandHash: hashHkVisualizationWorkloadCommand(fixture.command, commandArgs),
    });
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.stopReason, "parent-exit");
    assert.match(receipt.errors.join("\n"), /expected runner .* disappeared/);
    assert.equal(receipt.confirmedEmpty, true);
    assert.deepEqual(receipt.finalLiveEntries, []);
    assert.ok(receipt.ledger.identities.some(({ pid }) => pid === marker.grandchildPid));
    assert.ok(
      receipt.signalEvidence.some(
        ({ pid, signal }) => pid === marker.grandchildPid && signal === "SIGKILL",
      ),
    );
    assert.equal(
      readFileSync(join(fixture.workspace, "next-env.d.ts"), "utf8"),
      fixture.canonicalNextEnv,
    );
    assert.equal(existsSync(fixture.manifest.nextTsconfigPath), false);
    assert.equal(await waitForDead(marker.leaderPid), true);
    assert.equal(await waitForDead(marker.grandchildPid), true);
    ownedPgids.delete(marker.leaderPid);
    ownedPids.delete(control.supervisorPid);
  },
);
