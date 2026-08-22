import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

function resolveExplicitTestRoot(value) {
  if (typeof value !== "string" || value.trim().length === 0 || !path.isAbsolute(value)) {
    throw new Error(
      "STARSHIP_SUPERVISOR_TEST_ROOT must name one explicit fresh canonical directory directly under /Volumes/Starship/."
    );
  }
  const lexical = path.resolve(value);
  if (value !== lexical) {
    throw new Error(
      "STARSHIP_SUPERVISOR_TEST_ROOT must be canonical lexical input without aliases."
    );
  }
  if (path.dirname(lexical) !== "/Volumes/Starship") {
    throw new Error(
      "STARSHIP_SUPERVISOR_TEST_ROOT must be a short root directly under /Volumes/Starship/."
    );
  }
  const stat = lstatSync(lexical);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("STARSHIP_SUPERVISOR_TEST_ROOT must be a real non-symlink directory.");
  }
  const canonical = realpathSync.native(lexical);
  if (canonical !== lexical) {
    throw new Error("STARSHIP_SUPERVISOR_TEST_ROOT must equal its canonical path without aliases.");
  }
  if (readdirSync(canonical).length !== 0) {
    throw new Error("STARSHIP_SUPERVISOR_TEST_ROOT must be fresh and empty before the suite starts.");
  }
  return canonical;
}

const testSourcePath = fileURLToPath(import.meta.url);
const repositoryRoot = resolveExplicitTestRoot(process.env.STARSHIP_SUPERVISOR_TEST_ROOT);
const supervisorSourcePath = realpathSync(
  fileURLToPath(new URL("./run-starship-playwright-supervised.mjs", import.meta.url))
);

function uniqueFixtureRoot(label) {
  return path.join(
    repositoryRoot,
    ".tmp",
    `starship-playwright-supervisor-${label}-${process.pid}-${randomUUID()}`
  );
}

async function waitForPath(filePath, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(filePath)) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${filePath}.`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function fixtureEnvironment(fixtureRoot, extra = {}) {
  const runtimeTemp = path.join(fixtureRoot, ".tmp", "outer-runtime-temp");
  mkdirSync(runtimeTemp, { recursive: true });
  return {
    PATH: process.env.PATH,
    TEMP: runtimeTemp,
    TMP: runtimeTemp,
    TMPDIR: runtimeTemp,
    ...extra
  };
}

async function expectSupervisorFailure(execution) {
  let terminalError = null;
  try {
    await execution;
  } catch (error) {
    terminalError = error;
  }
  assert.ok(terminalError instanceof Error);
  assert.match(terminalError.receiptPath, /^\/Volumes\/Starship\//u);
  return {
    error: terminalError,
    receipt: JSON.parse(readFileSync(terminalError.receiptPath, "utf8"))
  };
}

function assertProcessDead(pid) {
  assert.throws(
    () => process.kill(pid, 0),
    (error) => error?.code === "ESRCH"
  );
}

function nativeProcessGroupProbe(pgid) {
  assert.ok(Number.isInteger(pgid) && pgid > 0);
  const processGroupTarget = -pgid;
  return process.kill(processGroupTarget, 0);
}

function nativeProcessGroupSignal(pgid, signal) {
  assert.ok(Number.isInteger(pgid) && pgid > 0);
  const processGroupTarget = -pgid;
  return process.kill(processGroupTarget, signal);
}

function assertProcessGroupDead(pgid) {
  assert.throws(
    () => nativeProcessGroupProbe(pgid),
    (error) => error?.code === "ESRCH"
  );
}

function exactProcessWitness(value, label) {
  assert.ok(Number.isInteger(value?.pid) && value.pid > 0, `${label} requires a positive PID`);
  assert.ok(Number.isInteger(value?.pgid) && value.pgid > 0, `${label} requires a positive PGID`);
  assert.ok(
    typeof value?.startToken === "string" && value.startToken.length > 0,
    `${label} requires a non-empty OS start token`
  );
  return Object.freeze({ pid: value.pid, pgid: value.pgid, startToken: value.startToken });
}

function captureExactProcessWitness(pid) {
  assert.ok(Number.isInteger(pid) && pid > 0);
  const observed = spawnSync(
    "/bin/ps",
    ["-p", String(pid), "-o", "pid=,pgid=,lstart="],
    { encoding: "utf8", maxBuffer: 64 * 1024 }
  );
  if (observed.error) throw observed.error;
  if (observed.status !== 0) {
    throw new Error(`Could not observe process witness for PID ${pid}; status=${observed.status}.`);
  }
  const match = observed.stdout.match(/^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/u);
  if (!match) throw new Error(`Malformed process witness for PID ${pid}.`);
  return exactProcessWitness({
    pgid: Number(match[2]),
    pid: Number(match[1]),
    startToken: match[3]
  }, "captured process witness");
}

function exactReceiptProcessWitness(receipt, pid, label) {
  const candidates = [
    ...(receipt?.registry?.seenIdentities ?? []),
    ...(receipt?.cleanup?.ownedUniverse?.firstRows ?? []),
    ...(receipt?.cleanup?.ownedUniverse?.actions ?? []).flatMap(
      ({ witnesses }) => witnesses ?? []
    ),
    ...(receipt?.cleanup?.recordedProcessGroupTermination ?? []).flatMap(
      ({ finalMembers }) => finalMembers ?? []
    )
  ].filter((candidate) => candidate?.pid === pid);
  const identities = new Map();
  for (const candidate of candidates) {
    const identity = exactProcessWitness(candidate, label);
    identities.set(
      `${identity.pid}:${identity.pgid}:${identity.startToken}`,
      identity
    );
  }
  assert.equal(
    identities.size,
    1,
    `${label} must have one unambiguous immutable receipt identity`
  );
  return [...identities.values()][0];
}

function signalExactProcessGroupForTestCleanup(witness, processControl = {}) {
  const expectedWitness = exactProcessWitness(witness, "exact process-group signal witness");
  const observeWitness = processControl.observeWitness ?? captureExactProcessWitness;
  const probeGroup = processControl.probeGroup ?? nativeProcessGroupProbe;
  const signalGroup = processControl.signalGroup ?? nativeProcessGroupSignal;
  let groupAlreadyGoneAtDeadline = false;
  let probeError = null;
  try {
    probeGroup(expectedWitness.pgid);
  } catch (error) {
    if (error?.code === "ESRCH") groupAlreadyGoneAtDeadline = true;
    else probeError = error instanceof Error ? error.message : String(error);
  }
  if (groupAlreadyGoneAtDeadline) {
    return Object.freeze({
      absentAtSignal: true,
      attempted: false,
      groupAlreadyGoneAtDeadline: true,
      probeError,
      safetyTriggered: false,
      sent: false,
      signal: null
    });
  }
  if (probeError) {
    return Object.freeze({
      absentAtSignal: false,
      attempted: false,
      failedClosed: true,
      groupAlreadyGoneAtDeadline: false,
      probeError,
      safetyTriggered: false,
      sent: false,
      signal: null
    });
  }
  let currentWitness;
  try {
    currentWitness = exactProcessWitness(
      observeWitness(expectedWitness.pid),
      "fresh exact process-group signal witness"
    );
  } catch (error) {
    return Object.freeze({
      absentAtSignal: false,
      attempted: false,
      failedClosed: true,
      groupAlreadyGoneAtDeadline: false,
      observationError: error instanceof Error ? error.message : String(error),
      probeError: null,
      safetyTriggered: false,
      sent: false,
      signal: null
    });
  }
  if (
    currentWitness.pid !== expectedWitness.pid ||
    currentWitness.pgid !== expectedWitness.pgid ||
    currentWitness.startToken !== expectedWitness.startToken
  ) {
    return Object.freeze({
      absentAtSignal: false,
      attempted: false,
      currentWitness,
      expectedWitness,
      failedClosed: true,
      groupAlreadyGoneAtDeadline: false,
      identityMismatch: true,
      probeError: null,
      safetyTriggered: false,
      sent: false,
      signal: null
    });
  }
  let signalError = null;
  let absentAtSignal = false;
  let sent = false;
  try {
    signalGroup(expectedWitness.pgid, "SIGKILL");
    sent = true;
  } catch (error) {
    if (error?.code === "ESRCH") absentAtSignal = true;
    else signalError = error instanceof Error ? error.message : String(error);
  }
  return Object.freeze({
    absentAtSignal,
    attempted: true,
    currentWitness,
    expectedWitness,
    groupAlreadyGoneAtDeadline: false,
    probeError,
    safetyTriggered: true,
    sent,
    signal: "SIGKILL",
    signalError
  });
}

function armProcessGroupSafetyKill(witness, deadlineMs, processControl = {}) {
  const expectedWitness = exactProcessWitness(witness, "safety kill witness");
  assert.ok(Number.isInteger(deadlineMs) && deadlineMs > 0);
  let timer = null;
  let resolveOutcome;
  const outcome = new Promise((resolve) => {
    resolveOutcome = resolve;
  });
  timer = setTimeout(() => {
    timer = null;
    resolveOutcome(signalExactProcessGroupForTestCleanup(expectedWitness, processControl));
  }, deadlineMs);
  return Object.freeze({
    cancel() {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      resolveOutcome(Object.freeze({
        absentAtSignal: false,
        attempted: false,
        cancelled: true,
        groupAlreadyGoneAtDeadline: false,
        probeError: null,
        safetyTriggered: false,
        sent: false,
        signal: null
      }));
    },
    outcome
  });
}

function assertExactSignalEscalationReceipt(receipt, safetyWitness) {
  const expectedLeader = exactProcessWitness(
    safetyWitness,
    "signal escalation receipt leader witness"
  );
  assert.equal(
    receipt.child.processGroupId,
    expectedLeader.pgid,
    "receipt child process group must be the exact observed inner PGID"
  );
  assert.equal(receipt.signals.forwarded.length, 1);
  const [forwarded] = receipt.signals.forwarded;
  assert.equal(forwarded.processGroupId, expectedLeader.pgid);
  assert.equal(forwarded.signal, "SIGTERM");
  assert.equal(forwarded.sent, true);
  assert.equal(forwarded.escalated, true);
  assert.deepEqual(
    forwarded.actions.map(({ signal }) => signal),
    ["SIGTERM", "SIGKILL"]
  );
  for (const action of forwarded.actions) {
    assert.equal(
      action.processGroupId,
      expectedLeader.pgid,
      `native ${action.signal} action must target the exact inner process group`
    );
    assert.equal(action.sent, true, `native ${action.signal} action must be sent`);
    assert.ok(action.witnesses.length > 0);
    const leaderWitness = action.witnesses.find(({ pid }) => pid === expectedLeader.pid);
    assert.ok(
      leaderWitness,
      `native ${action.signal} action must include the exact inner leader PID`
    );
    assert.deepEqual(
      {
        pgid: leaderWitness.pgid,
        pid: leaderWitness.pid,
        startToken: leaderWitness.startToken
      },
      expectedLeader,
      `native ${action.signal} action must use the exact immutable inner leader identity`
    );
  }

  const cleanupTermination = receipt.cleanup.processGroupTermination;
  assert.equal(cleanupTermination.term.sent, false);
  assert.equal(cleanupTermination.kill.sent, false);
  assert.deepEqual(cleanupTermination.finalMembers, []);
  assert.equal(cleanupTermination.provenEmpty, true);
  assert.deepEqual(receipt.cleanup.ownedUniverse.actions, []);
  assert.deepEqual(receipt.cleanup.ownedUniverse.finalRows, []);
  assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
  assert.deepEqual(receipt.registry.commandTransitions, []);
  assert.deepEqual(receipt.registry.identityMismatches, []);
}

function exactFileExpectation(filePath) {
  const stat = statSync(filePath, { bigint: true });
  const bytes = readFileSync(filePath);
  return Object.freeze({
    device: stat.dev.toString(10),
    exists: true,
    inode: stat.ino.toString(10),
    mode: Number(stat.mode & 0o777n).toString(8).padStart(3, "0"),
    path: filePath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length
  });
}

function probeTestHarnessRoot(explicitRoot) {
  const environment = {
    PATH: process.env.PATH,
    TEMP: repositoryRoot,
    TMP: repositoryRoot,
    TMPDIR: repositoryRoot
  };
  if (explicitRoot !== undefined) {
    environment.STARSHIP_SUPERVISOR_TEST_ROOT = explicitRoot;
  }
  return spawnSync(process.execPath, [
    "--test",
    "--test-reporter=spec",
    "--test-name-pattern=test harness uses the explicit canonical Starship scratch root",
    testSourcePath
  ], {
    encoding: "utf8",
    env: environment
  });
}

test("test harness uses the explicit canonical Starship scratch root", () => {
  const explicitRoot = process.env.STARSHIP_SUPERVISOR_TEST_ROOT;
  assert.equal(typeof explicitRoot, "string");
  assert.equal(repositoryRoot, realpathSync(explicitRoot));
  assert.match(repositoryRoot, /^\/Volumes\/Starship\/[^/]+$/u);
  assert.equal(
    path.relative(repositoryRoot, uniqueFixtureRoot("containment-check")).startsWith(".."),
    false
  );
});

test("test harness rejects a lexical alias for its explicit Starship scratch root", () => {
  const lexicalAlias = `${repositoryRoot}/../${path.basename(repositoryRoot)}`;
  const result = probeTestHarnessRoot(lexicalAlias);
  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /canonical.*alias/iu);
});

test("test harness fails closed for missing, off-Starship, and non-fresh scratch roots", () => {
  const missing = probeTestHarnessRoot(undefined);
  assert.notEqual(missing.status, 0, `${missing.stdout}\n${missing.stderr}`);
  assert.match(`${missing.stdout}\n${missing.stderr}`, /must name one explicit fresh canonical/iu);

  const offStarship = probeTestHarnessRoot("/tmp/off-starship-supervisor-test-root");
  assert.notEqual(offStarship.status, 0, `${offStarship.stdout}\n${offStarship.stderr}`);
  assert.match(`${offStarship.stdout}\n${offStarship.stderr}`, /directly under \/Volumes\/Starship/iu);

  const occupiedPath = path.join(repositoryRoot, "non-fresh-marker");
  writeFileSync(occupiedPath, "occupied\n", { mode: 0o600 });
  try {
    const nonFresh = probeTestHarnessRoot(repositoryRoot);
    assert.notEqual(nonFresh.status, 0, `${nonFresh.stdout}\n${nonFresh.stderr}`);
    assert.match(`${nonFresh.stdout}\n${nonFresh.stderr}`, /fresh and empty/iu);
  } finally {
    unlinkSync(occupiedPath);
  }
});

test("supervisor rejects off-Starship roots and non-fresh run identities before launch", async () => {
  const {
    buildSupervisedStarshipPlaywrightInvocation,
    parseSupervisedStarshipPlaywrightCli
  } = await import("./run-starship-playwright-supervised.mjs");
  const fixtureRoot = uniqueFixtureRoot("preflight");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runtimeTemp = path.join(fixtureRoot, ".tmp", "runtime-temp");
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(runtimeTemp, { recursive: true });
  writeFileSync(innerRunnerPath, "process.exit(0);\n", { mode: 0o600 });
  try {
    assert.throws(
    () => buildSupervisedStarshipPlaywrightInvocation({
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath: "/tmp/run-starship-playwright.mjs",
      repositoryRoot: "/tmp/repository",
      runId: "unsafe"
    }),
    /\/Volumes\/Starship/u
  );
  assert.throws(
    () => buildSupervisedStarshipPlaywrightInvocation({
      baseEnvironment: {
        PATH: process.env.PATH,
        TEMP: path.join(fixtureRoot, ".tmp", "safe-temp"),
        TMP: path.join(fixtureRoot, ".tmp", "safe-temp"),
        TMPDIR: path.join(fixtureRoot, ".tmp", "safe-temp"),
        XDG_CACHE_HOME: "/var/folders/off-starship-cache"
      },
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      repositoryRoot: fixtureRoot,
      runId: "unsafe-inherited-cache"
    }),
    /XDG_CACHE_HOME.*\/Volumes\/Starship/u
  );
  assert.throws(
    () => buildSupervisedStarshipPlaywrightInvocation({
      baseEnvironment: {
        NODE_OPTIONS: "--require=/tmp/off-starship-preload.cjs",
        PATH: process.env.PATH,
        TEMP: path.join(fixtureRoot, ".tmp", "safe-temp"),
        TMP: path.join(fixtureRoot, ".tmp", "safe-temp"),
        TMPDIR: path.join(fixtureRoot, ".tmp", "safe-temp")
      },
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      repositoryRoot: fixtureRoot,
      runId: "unsafe-node-options"
    }),
    /rejects inherited NODE_OPTIONS/iu
  );
  assert.deepEqual(parseSupervisedStarshipPlaywrightCli([
    "--repository-root",
    fixtureRoot,
    "--inner-runner",
    innerRunnerPath,
    "--run-id",
    "cli-contract",
    "--term-grace-ms",
    "1200",
    "--kill-grace-ms",
    "3400",
    "--",
    "test",
    "tests/e2e/example.spec.ts"
  ]), {
    innerArgs: ["test", "tests/e2e/example.spec.ts"],
    innerRunnerPath,
    killGraceMs: 3400,
    repositoryRoot: fixtureRoot,
    runId: "cli-contract",
    termGraceMs: 1200
  });
  for (const invalidArgv of [
    ["--repository-root", fixtureRoot, "--run-id", "missing-runner", "--", "test"],
    ["--repository-root", fixtureRoot, "--inner-runner", innerRunnerPath, "--run-id", "bad/id", "--", "test"],
    ["--repository-root", fixtureRoot, "--inner-runner", innerRunnerPath, "--run-id", "duplicate", "--run-id", "again", "--", "test"],
    ["--repository-root", fixtureRoot, "--inner-runner", innerRunnerPath, "--run-id", "bad-command", "--", "show-report"]
  ]) {
    assert.throws(
      () => parseSupervisedStarshipPlaywrightCli(invalidArgv),
      /required|duplicate|runId|exact `test`/iu
    );
  }

    const invocation = buildSupervisedStarshipPlaywrightInvocation({
      baseEnvironment: {
        PATH: process.env.PATH,
        TEMP: runtimeTemp,
        TMP: runtimeTemp,
        TMPDIR: runtimeTemp
      },
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      repositoryRoot: fixtureRoot,
      runId: "fresh-contract"
    });
    assert.equal(invocation.cwd, realpathSync(fixtureRoot));
    assert.match(invocation.paths.supervisorRoot, /^\/Volumes\/Starship\//u);
    assert.equal(
      invocation.paths.nextTsconfigPath,
      path.join(
        invocation.paths.e2eRunRoot,
        "tsconfig.playwright-fresh-contract.tmp.json"
      )
    );
    mkdirSync(invocation.paths.e2eRunRoot, { recursive: true });
    assert.throws(
      () => buildSupervisedStarshipPlaywrightInvocation({
        baseEnvironment: {
          PATH: process.env.PATH,
          TEMP: runtimeTemp,
          TMP: runtimeTemp,
          TMPDIR: runtimeTemp
        },
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "fresh-contract"
      }),
      /fresh.*already exists|already exists.*fresh/iu
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("supervisor runs a normal inner runner in an owned process group and seals exact terminal evidence", async () => {
  const {
    executeSupervisedStarshipPlaywright
  } = await import("./run-starship-playwright-supervised.mjs");
  const fixtureRoot = uniqueFixtureRoot("normal");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const outerRuntimeTemp = path.join(fixtureRoot, ".tmp", "outer-runtime-temp");
  const nextEnvPath = path.join(fixtureRoot, "next-env.d.ts");
  const runId = "normal-path";
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(outerRuntimeTemp, { recursive: true });
  writeFileSync(nextEnvPath, "canonical-next-env\n", { mode: 0o640 });
  chmodSync(nextEnvPath, 0o640);
  writeFileSync(innerRunnerPath, [
    'import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    'const argv = process.argv.slice(2);',
    'const runId = argv[argv.indexOf("--run-id") + 1];',
    'const runRoot = path.join(process.cwd(), ".tmp", `e2e-run-${runId}`);',
    'mkdirSync(path.join(runRoot, "evidence"), { recursive: true });',
    'const fullRunReceipt = { closure: { sha256: "a".repeat(64) }, contract: "starship-playwright-full-run-runtime-source-hold-v2", rawCanary: "outer-must-carry-without-self-approval", resolutionDirectories: [{ path: "/Volumes/Starship/raw-directory-canary" }], schemaVersion: 2 };',
    'writeFileSync(path.join(runRoot, "evidence", "full-run-runtime-source-hold.json"), `${JSON.stringify(fullRunReceipt)}\n`, { mode: 0o600 });',
    'const lockPath = path.join(process.cwd(), ".tmp", "starship-playwright-run.lock");',
    'writeFileSync(lockPath, `${JSON.stringify({ ownerPid: process.pid, repositoryRoot: process.cwd(), runId })}\n`, { mode: 0o600 });',
    'writeFileSync(path.join(runRoot, "fake-observed.json"), `${JSON.stringify({ argv, marker: process.env.SUPERVISOR_TEST_MARKER, temp: { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR } })}\n`, "utf8");',
    'console.log("fake-inner-normal-stdout");',
    'console.error("fake-inner-normal-stderr");',
    'unlinkSync(lockPath);'
  ].join("\n"), { mode: 0o600 });
  const listenersBefore = {
    SIGINT: process.listenerCount("SIGINT"),
    SIGTERM: process.listenerCount("SIGTERM")
  };
  try {
    const result = await executeSupervisedStarshipPlaywright({
      baseEnvironment: {
        PATH: process.env.PATH,
        SUPERVISOR_TEST_MARKER: "exact-environment",
        TEMP: outerRuntimeTemp,
        TMP: outerRuntimeTemp,
        TMPDIR: outerRuntimeTemp
      },
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      repositoryRoot: fixtureRoot,
      runId,
      stderrSink: null,
      stdoutSink: null
    });
    const receipt = JSON.parse(readFileSync(result.receiptPath, "utf8"));
    assert.equal(receipt.contract, "starship-playwright-supervisor-v2");
    assert.equal(receipt.schemaVersion, 2);
    assert.equal(receipt.status, "passed");
    assert.equal(receipt.releaseReady, false);
    const innerHold = receipt.innerEvidence.fullRunRuntimeSourceHold;
    const expectedInnerHoldPath = path.join(
      receipt.paths.e2eRunRoot,
      "evidence",
      "full-run-runtime-source-hold.json"
    );
    const expectedInnerHoldRaw = `${JSON.stringify({
      closure: { sha256: "a".repeat(64) },
      contract: "starship-playwright-full-run-runtime-source-hold-v2",
      rawCanary: "outer-must-carry-without-self-approval",
      resolutionDirectories: [{ path: "/Volumes/Starship/raw-directory-canary" }],
      schemaVersion: 2
    })}\n`;
    assert.equal(innerHold.path, expectedInnerHoldPath);
    assert.equal(innerHold.rawUtf8, expectedInnerHoldRaw);
    assert.equal(
      innerHold.receipt.sha256,
      createHash("sha256").update(expectedInnerHoldRaw).digest("hex")
    );
    assert.equal(Object.hasOwn(innerHold, "valid"), false);
    assert.equal(Object.hasOwn(innerHold, "approved"), false);
    assert.deepEqual(receipt.child.outcome, {
      code: 0,
      signal: null,
      spawnError: null
    });
    assert.deepEqual(receipt.child.argv, [
      process.execPath,
      innerRunnerPath,
      "--run-id",
      runId,
      "--",
      "test",
      "tests/e2e/example.spec.ts"
    ]);
    assert.match(receipt.child.environment.sha256, /^[a-f0-9]{64}$/u);
    assert.equal(receipt.cleanup.complete, true);
    assert.ok(receipt.cleanup.ownedUniverse.consecutiveZeroScans >= 2);
    assert.equal(receipt.cleanup.orphanScan.provenEmpty, true);
    assert.equal(receipt.cleanup.processGroupTermination.provenEmpty, true);
    assert.deepEqual(receipt.cleanup.orphanScan.finalMembers, []);
    assert.equal(receipt.cleanup.runLock.removed, false);
    assert.equal(receipt.cleanup.runLock.status, "already-absent");
    assert.equal(receipt.cleanup.supervisorLock.ownerValidated, true);
    assert.equal(receipt.cleanup.supervisorLock.status, "removed-owned");
    assert.match(
      receipt.cleanup.supervisorLock.quarantine.quarantined.sha256,
      /^[a-f0-9]{64}$/u
    );
    assert.equal(receipt.cleanup.nextEnv.exact, true);
    assert.equal(receipt.cleanup.nextEnv.restored, false);
    assert.equal(receipt.cleanup.nextEnv.before.mode, "640");
    assert.equal(receipt.cleanup.nextTsconfig.status, "already-absent");
    assert.deepEqual(receipt.signals.forwarded, []);
    assert.equal(receipt.signals.finalization.acceptanceOpenedSequence, 0);
    assert.equal(receipt.signals.finalization.acceptanceClosedSequence, 0);
    assert.equal(receipt.signals.finalization.terminalEvidenceClosedSequence, 0);
    assert.equal(receipt.signals.finalization.outerExitEvidenceRequired, true);
    assert.equal(receipt.signals.journal.deliveredCount, 0);
    assert.equal(receipt.signals.journal.snapshotExact, true);
    assert.equal(receipt.signals.journal.receipt.exact, true);
    assert.equal(receipt.signals.journal.receipt.final.size, 0);
    assert.equal(
      receipt.signals.journal.receipt.final.sha256,
      createHash("sha256").update(Buffer.alloc(0)).digest("hex")
    );
    assert.match(readFileSync(receipt.paths.stdoutPath, "utf8"), /fake-inner-normal-stdout/u);
    assert.match(readFileSync(receipt.paths.stderrPath, "utf8"), /fake-inner-normal-stderr/u);
    assert.equal(receipt.logs.stdout.exact, true);
    assert.equal(receipt.logs.stderr.exact, true);
    assert.equal(receipt.logs.stdout.stream.ended, true);
    assert.equal(receipt.logs.stdout.stream.timedOut, false);
    assert.equal(receipt.logs.stderr.stream.ended, true);
    assert.equal(receipt.logs.stderr.stream.timedOut, false);
    assert.match(receipt.logs.stdout.final.sha256, /^[a-f0-9]{64}$/u);
    assert.match(receipt.logs.stderr.final.sha256, /^[a-f0-9]{64}$/u);
    assert.equal(receipt.logs.stdout.final.inode, receipt.logs.stdout.initial.inode);
    assert.equal(receipt.logs.stderr.final.inode, receipt.logs.stderr.initial.inode);
    assert.match(receipt.preload.sha256, /^[a-f0-9]{64}$/u);
    assert.equal(receipt.preload.before.sha256, receipt.preload.after.sha256);
    assert.equal(receipt.registry.journalSnapshotExact, true);
    assert.ok(receipt.registry.preloadAckCount >= 1);
    assert.deepEqual(
      receipt.cleanup.recordedProcessGroupTermination
        .map(({ processGroupId }) => processGroupId)
        .sort((left, right) => left - right),
      receipt.registry.recordedProcessGroups
    );
    assert.ok(receipt.registry.preloadAcks.some(
      ({ pid, preloadSha256 }) =>
        pid === receipt.child.processGroupId && preloadSha256 === receipt.preload.sha256
    ));
    assert.equal(receipt.runner.before.sha256, receipt.runner.after.sha256);
    assert.equal(receipt.supervisor.before.sha256, receipt.supervisor.after.sha256);
    for (const identity of [
      receipt.runner.before,
      receipt.runner.after,
      receipt.preload.before,
      receipt.preload.after,
      receipt.logs.stdout.initial,
      receipt.logs.stdout.final,
      receipt.logs.stderr.initial,
      receipt.logs.stderr.final,
      receipt.registry.journal.initial,
      receipt.registry.journal.final,
      receipt.cleanup.supervisorLock.observed
    ]) {
      assert.match(identity.device, /^\d+$/u);
      assert.match(identity.inode, /^\d+$/u);
      assert.equal(typeof identity.device, "string");
      assert.equal(typeof identity.inode, "string");
    }
    assert.equal(receipt.runner.before.sha256, receipt.runner.after.sha256);
    assert.equal(receipt.supervisor.before.sha256, receipt.supervisor.after.sha256);
    assert.equal(readFileSync(nextEnvPath, "utf8"), "canonical-next-env\n");
    assert.equal((statSync(nextEnvPath).mode & 0o777).toString(8), "640");
    assert.equal(existsSync(receipt.paths.runLockPath), false);
    const observed = JSON.parse(readFileSync(
      path.join(receipt.paths.e2eRunRoot, "fake-observed.json"),
      "utf8"
    ));
    assert.deepEqual(observed.argv, [
      "--run-id",
      runId,
      "--",
      "test",
      "tests/e2e/example.spec.ts"
    ]);
    assert.equal(observed.marker, "exact-environment");
    assert.deepEqual(observed.temp, {
      TEMP: receipt.paths.runtimeTempDir,
      TMP: receipt.paths.runtimeTempDir,
      TMPDIR: receipt.paths.runtimeTempDir
    });
    for (const [name, value] of Object.entries(receipt.paths)) {
      assert.match(value, /^\/Volumes\/Starship\//u, name);
    }
  } finally {
    assert.deepEqual({
      SIGINT: process.listenerCount("SIGINT"),
      SIGTERM: process.listenerCount("SIGTERM")
    }, listenersBefore);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("preload records descriptor-bound O_EXCL O_NOFOLLOW tsconfig creation exactly", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("descriptor-tsconfig");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "descriptor-tsconfig";
  const exactBytes = '{"descriptorOwned":true}\n';
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { closeSync, constants, fsyncSync, openSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const target = path.join(process.cwd(), ".tmp", ${JSON.stringify(`e2e-run-${runId}`)}, ${JSON.stringify(`tsconfig.playwright-${runId}.tmp.json`)});`,
    `const bytes = Buffer.from(${JSON.stringify(exactBytes)});`,
    'const descriptor = openSync(target, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);',
    'writeFileSync(descriptor, bytes);',
    'fsyncSync(descriptor);',
    'closeSync(descriptor);'
  ].join("\n"), { mode: 0o600 });
  try {
    const result = await executeSupervisedStarshipPlaywright({
      baseEnvironment: fixtureEnvironment(fixtureRoot),
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      repositoryRoot: fixtureRoot,
      runId,
      stderrSink: null,
      stdoutSink: null
    });
    const receipt = JSON.parse(readFileSync(result.receiptPath, "utf8"));
    assert.equal(receipt.registry.tsconfigCreationCount, 1);
    const [creation] = receipt.registry.tsconfigCreations;
    const creatorAck = receipt.registry.preloadAcks.find(({ pid }) => pid === creation.pid);
    assert.ok(creatorAck, "the descriptor creator must have an exact preload ACK");
    assert.equal(creation.pgid, creatorAck.pgid);
    assert.equal(creation.startToken, creatorAck.startToken);
    assert.equal(creation.processCommandSha256, creatorAck.processCommandSha256);
    assert.equal(receipt.cleanup.nextTsconfig.status, "archived");
    assert.deepEqual(receipt.cleanup.nextTsconfig.creation, creation);
    assert.equal(creation.sha256, createHash("sha256")
      .update(exactBytes)
      .digest("hex"));
    assert.equal(receipt.cleanup.nextTsconfig.source.device, creation.device);
    assert.equal(receipt.cleanup.nextTsconfig.source.inode, creation.inode);
    assert.equal(receipt.cleanup.nextTsconfig.archive.device, creation.device);
    assert.equal(receipt.cleanup.nextTsconfig.archive.inode, creation.inode);
    assert.equal(readFileSync(receipt.paths.tsconfigArchivePath, "utf8"), exactBytes);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("preloaded promisified execFile preserves Node overload, result, error, and registry contracts", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("promisified-exec-file");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const optionsOnlyEmitterPath = path.join(fixtureScripts, "options-only-emitter.sh");
  const runId = "promisified-exec-file";
  const observationPath = path.join(
    fixtureRoot,
    ".tmp",
    `e2e-run-${runId}`,
    "promisified-exec-file.json"
  );
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(optionsOnlyEmitterPath, [
    "#!/bin/sh",
    "printf options-only-stdout",
    "printf options-only-stderr >&2"
  ].join("\n"), { mode: 0o700 });
  chmodSync(optionsOnlyEmitterPath, 0o700);
  writeFileSync(innerRunnerPath, [
    'import { execFile } from "node:child_process";',
    'import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    'import { promisify } from "node:util";',
    'const argv = process.argv.slice(2);',
    'const runId = argv[argv.indexOf("--run-id") + 1];',
    'const runRoot = path.join(process.cwd(), ".tmp", `e2e-run-${runId}`);',
    'mkdirSync(runRoot, { recursive: true });',
    'const lockPath = path.join(process.cwd(), ".tmp", "starship-playwright-run.lock");',
    'writeFileSync(lockPath, `${JSON.stringify({ ownerPid: process.pid, repositoryRoot: process.cwd(), runId })}\\n`, { mode: 0o600 });',
    'const execFileAsync = promisify(execFile);',
    'const argsOptionsPending = execFileAsync("/bin/sh", ["-c", "printf promisified-stdout; printf promisified-stderr >&2"], { encoding: "utf8" });',
    'const argsOptionsChildPid = argsOptionsPending.child?.pid ?? null;',
    'const argsOptionsResult = await argsOptionsPending;',
    `const optionsOnlyPending = execFileAsync(${JSON.stringify(optionsOnlyEmitterPath)}, { encoding: "utf8" });`,
    'const optionsOnlyChildPid = optionsOnlyPending.child?.pid ?? null;',
    'const optionsOnlyResult = await optionsOnlyPending;',
    'const bufferPending = execFileAsync("/bin/sh", ["-c", "printf buffer-stdout; printf buffer-stderr >&2"], { encoding: "buffer" });',
    'const bufferChildPid = bufferPending.child?.pid ?? null;',
    'const bufferResult = await bufferPending;',
    'const rejectionPending = execFileAsync("/bin/sh", ["-c", "printf rejected-stdout; printf rejected-stderr >&2; exit 7"], { encoding: "utf8" });',
    'const rejectionChildPid = rejectionPending.child?.pid ?? null;',
    'let rejection;',
    'try {',
    '  const value = await rejectionPending;',
    '  rejection = { settled: "resolved", value };',
    '} catch (error) {',
    '  rejection = { code: error.code, stderr: error.stderr, stdout: error.stdout, settled: "rejected" };',
    '}',
    `writeFileSync(${JSON.stringify(observationPath)}, JSON.stringify({ argsOptions: { childPid: argsOptionsChildPid, hasOwnChild: Object.hasOwn(argsOptionsPending, "child"), result: argsOptionsResult }, buffer: { childPid: bufferChildPid, hasOwnChild: Object.hasOwn(bufferPending, "child"), stderrHex: bufferResult.stderr.toString("hex"), stderrIsBuffer: Buffer.isBuffer(bufferResult.stderr), stdoutHex: bufferResult.stdout.toString("hex"), stdoutIsBuffer: Buffer.isBuffer(bufferResult.stdout) }, optionsOnly: { childPid: optionsOnlyChildPid, hasOwnChild: Object.hasOwn(optionsOnlyPending, "child"), result: optionsOnlyResult }, rejection: { childPid: rejectionChildPid, hasOwnChild: Object.hasOwn(rejectionPending, "child"), ...rejection } }) + "\\n", "utf8");`,
    'unlinkSync(lockPath);'
  ].join("\n"), { mode: 0o600 });
  try {
    const result = await executeSupervisedStarshipPlaywright({
      baseEnvironment: fixtureEnvironment(fixtureRoot),
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      repositoryRoot: fixtureRoot,
      runId,
      stderrSink: null,
      stdoutSink: null
    });
    const observation = JSON.parse(readFileSync(observationPath, "utf8"));
    const receipt = JSON.parse(readFileSync(result.receiptPath, "utf8"));
    assert.equal(observation.argsOptions.hasOwnChild, true);
    assert.equal(Number.isInteger(observation.argsOptions.childPid), true);
    assert.deepEqual(observation.argsOptions.result, {
      stderr: "promisified-stderr",
      stdout: "promisified-stdout"
    });
    assert.equal(observation.optionsOnly.hasOwnChild, true);
    assert.equal(Number.isInteger(observation.optionsOnly.childPid), true);
    assert.deepEqual(observation.optionsOnly.result, {
      stderr: "options-only-stderr",
      stdout: "options-only-stdout"
    });
    assert.equal(observation.buffer.hasOwnChild, true);
    assert.equal(Number.isInteger(observation.buffer.childPid), true);
    assert.equal(observation.buffer.stdoutIsBuffer, true);
    assert.equal(observation.buffer.stderrIsBuffer, true);
    assert.equal(observation.buffer.stdoutHex, Buffer.from("buffer-stdout").toString("hex"));
    assert.equal(observation.buffer.stderrHex, Buffer.from("buffer-stderr").toString("hex"));
    assert.equal(observation.rejection.hasOwnChild, true);
    assert.equal(Number.isInteger(observation.rejection.childPid), true);
    assert.deepEqual(observation.rejection, {
      childPid: observation.rejection.childPid,
      code: 7,
      hasOwnChild: true,
      settled: "rejected",
      stderr: "rejected-stderr",
      stdout: "rejected-stdout"
    });
    assert.equal(receipt.registry.intentCount, 4);
    assert.equal(receipt.registry.resultCount, 4);
    assert.equal(receipt.registry.unmatchedIntentCount, 0);
    const journalRecords = readFileSync(receipt.paths.registryJournalPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const intentRecords = journalRecords.filter(({ value }) => value.kind === "execFile");
    assert.equal(intentRecords.length, 4);
    const matchedResultPids = [];
    for (const intentRecord of intentRecords) {
      assert.equal(intentRecord.value.parentPid, receipt.child.processGroupId);
      const resultRecord = journalRecords.find(
        ({ fileName }) => fileName === `${intentRecord.value.eventId}.result.json`
      );
      assert.ok(resultRecord);
      assert.equal(resultRecord.value.classification, "spawned");
      matchedResultPids.push(resultRecord.value.pid);
    }
    const observedChildPids = [
      observation.argsOptions.childPid,
      observation.buffer.childPid,
      observation.optionsOnly.childPid,
      observation.rejection.childPid
    ];
    assert.equal(new Set(observedChildPids).size, 4);
    assert.deepEqual(
      matchedResultPids.sort((left, right) => left - right),
      observedChildPids.sort((left, right) => left - right)
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("supervisor harvests a stubborn grandchild and exactly repairs SIGKILL side effects", async () => {
  const {
    executeSupervisedStarshipPlaywright
  } = await import("./run-starship-playwright-supervised.mjs");
  const fixtureRoot = uniqueFixtureRoot("sigkill");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const outerRuntimeTemp = path.join(fixtureRoot, ".tmp", "outer-runtime-temp");
  const nextEnvPath = path.join(fixtureRoot, "next-env.d.ts");
  const runId = "sigkill-path";
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(outerRuntimeTemp, { recursive: true });
  writeFileSync(nextEnvPath, "canonical-next-env-byte-for-byte\n", { mode: 0o640 });
  chmodSync(nextEnvPath, 0o640);
  writeFileSync(innerRunnerPath, [
    'import { spawn } from "node:child_process";',
    'import { chmodSync, existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    'const argv = process.argv.slice(2);',
    'const runId = argv[argv.indexOf("--run-id") + 1];',
    'const repositoryRoot = realpathSync.native(process.cwd());',
    'const runRoot = path.join(repositoryRoot, ".tmp", `e2e-run-${runId}`);',
    'mkdirSync(runRoot, { recursive: true });',
    'writeFileSync(path.join(repositoryRoot, "next-env.d.ts"), "mutated-route-types\\n", { mode: 0o600 });',
    'chmodSync(path.join(repositoryRoot, "next-env.d.ts"), 0o600);',
    'writeFileSync(path.join(repositoryRoot, ".tmp", "starship-playwright-run.lock"), `${JSON.stringify({ createdAt: new Date().toISOString(), ownerPid: process.pid, repositoryRoot, runId })}\\n`, { mode: 0o600 });',
    'writeFileSync(path.join(runRoot, `tsconfig.playwright-${runId}.tmp.json`), `${JSON.stringify({ extends: "../../tsconfig.json", include: [`.tmp/e2e-run-${runId}/next-dist/types/**/*.ts`, "next-dist/types/**/*.ts"] }, null, 2)}\\n`, { mode: 0o600 });',
    'const grandchildReadyPath = path.join(runRoot, "stubborn-grandchild.json");',
    'const grandchildProgram = [',
    '  `import { writeFileSync } from "node:fs";`,',
    '  `process.on("SIGTERM", () => {});`,',
    '  `writeFileSync(${JSON.stringify(grandchildReadyPath)}, JSON.stringify({ pid: process.pid, ppid: process.ppid }) + "\\\\n", "utf8");`,',
    '  `setInterval(() => {}, 1000);`',
    '].join("\\n");',
    'spawn(process.execPath, ["--input-type=module", "--eval", grandchildProgram], { detached: false, stdio: "ignore" });',
    'const deadline = Date.now() + 5000;',
    'while (!existsSync(grandchildReadyPath)) {',
    '  if (Date.now() >= deadline) throw new Error("grandchild did not become ready");',
    '  await new Promise((resolve) => setTimeout(resolve, 10));',
    '}',
    'process.kill(process.pid, "SIGKILL");'
  ].join("\n"), { mode: 0o600 });
  const listenersBefore = {
    SIGINT: process.listenerCount("SIGINT"),
    SIGTERM: process.listenerCount("SIGTERM")
  };
  let terminalError;
  let grandchildPid = null;
  try {
    try {
      await executeSupervisedStarshipPlaywright({
        baseEnvironment: {
          PATH: process.env.PATH,
          TEMP: outerRuntimeTemp,
          TMP: outerRuntimeTemp,
          TMPDIR: outerRuntimeTemp
        },
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        killGraceMs: 3_000,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 150
      });
    } catch (error) {
      terminalError = error;
    }
    assert.ok(terminalError instanceof Error);
    assert.match(terminalError.receiptPath, /^\/Volumes\/Starship\//u);
    const receipt = JSON.parse(readFileSync(terminalError.receiptPath, "utf8"));
    const innerStderr = readFileSync(receipt.paths.stderrPath, "utf8");
    assert.match(terminalError.message, /SIGKILL/u, innerStderr);
    const grandchild = JSON.parse(readFileSync(
      path.join(receipt.paths.e2eRunRoot, "stubborn-grandchild.json"),
      "utf8"
    ));
    grandchildPid = grandchild.pid;
    assert.equal(receipt.status, "failed");
    assert.deepEqual(receipt.child.outcome, {
      code: null,
      signal: "SIGKILL",
      spawnError: null
    });
    assert.equal(receipt.cleanup.complete, true);
    assert.equal(receipt.cleanup.orphanScan.provenEmpty, true);
    assert.ok(receipt.cleanup.orphanScan.initialMembers.length >= 1);
    assert.deepEqual(receipt.cleanup.orphanScan.finalMembers, []);
    assert.equal(receipt.cleanup.processGroupTermination.term.sent, true);
    assert.equal(receipt.cleanup.processGroupTermination.kill.sent, true);
    assert.equal(receipt.cleanup.processGroupTermination.provenEmpty, true);
    assert.ok(receipt.cleanup.processGroupTermination.term.membersAfterGrace.length >= 1);
    assert.deepEqual(receipt.cleanup.processGroupTermination.kill.membersAfterGrace, []);
    assert.equal(receipt.cleanup.nextEnv.restored, true);
    assert.equal(receipt.cleanup.nextEnv.atomic, true);
    assert.equal(receipt.cleanup.nextEnv.exact, true);
    assert.equal(receipt.cleanup.nextEnv.before.mode, "640");
    assert.equal(receipt.cleanup.nextEnv.after.mode, "640");
    assert.equal(readFileSync(nextEnvPath, "utf8"), "canonical-next-env-byte-for-byte\n");
    assert.equal((statSync(nextEnvPath).mode & 0o777).toString(8), "640");
    assert.equal(receipt.cleanup.runLock.ownerValidated, true);
    assert.equal(receipt.cleanup.runLock.removed, true);
    assert.equal(receipt.cleanup.runLock.status, "removed-owned");
    assert.equal(existsSync(receipt.paths.runLockPath), false);
    assert.equal(receipt.cleanup.nextTsconfig.status, "archived");
    assert.equal(receipt.cleanup.nextTsconfig.creation.sha256, receipt.cleanup.nextTsconfig.source.sha256);
    assert.equal(receipt.registry.tsconfigCreationCount, 1);
    assert.equal(receipt.cleanup.nextTsconfig.sourceAbsent, true);
    assert.equal(existsSync(receipt.paths.nextTsconfigPath), false);
    assert.equal(existsSync(receipt.paths.tsconfigArchivePath), true);
    assert.equal(
      receipt.cleanup.nextTsconfig.source.sha256,
      receipt.cleanup.nextTsconfig.archive.sha256
    );
    assert.throws(
      () => process.kill(grandchildPid, 0),
      (error) => error?.code === "ESRCH"
    );
  } finally {
    if (Number.isInteger(grandchildPid)) {
      try {
        process.kill(grandchildPid, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
    }
    assert.deepEqual({
      SIGINT: process.listenerCount("SIGINT"),
      SIGTERM: process.listenerCount("SIGTERM")
    }, listenersBefore);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  test(`supervisor forwards ${signal} to the exact owned process group and removes listeners`, async () => {
    const {
      executeSupervisedStarshipPlaywright
    } = await import("./run-starship-playwright-supervised.mjs");
    const fixtureRoot = uniqueFixtureRoot(signal.toLowerCase());
    const fixtureScripts = path.join(fixtureRoot, "scripts");
    const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
    const outerRuntimeTemp = path.join(fixtureRoot, ".tmp", "outer-runtime-temp");
    const nextEnvPath = path.join(fixtureRoot, "next-env.d.ts");
    const runId = `${signal.toLowerCase()}-path`;
    const readyPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "ready.json");
    const handledPath = path.join(
      fixtureRoot,
      ".tmp",
      `e2e-run-${runId}`,
      "handled-signal.json"
    );
    const processTarget = new EventEmitter();
    mkdirSync(fixtureScripts, { recursive: true });
    mkdirSync(outerRuntimeTemp, { recursive: true });
    writeFileSync(nextEnvPath, "canonical-next-env\n", { mode: 0o640 });
    writeFileSync(innerRunnerPath, [
      'import { mkdirSync, writeFileSync } from "node:fs";',
      'import path from "node:path";',
      'const argv = process.argv.slice(2);',
      'const runId = argv[argv.indexOf("--run-id") + 1];',
      'const runRoot = path.join(process.cwd(), ".tmp", `e2e-run-${runId}`);',
      'mkdirSync(runRoot, { recursive: true });',
      `process.on(${JSON.stringify(signal)}, () => {`,
      `  writeFileSync(path.join(runRoot, "handled-signal.json"), JSON.stringify({ pid: process.pid, signal: ${JSON.stringify(signal)} }) + "\\n", "utf8");`,
      '  process.exit(0);',
      '});',
      'writeFileSync(path.join(runRoot, "ready.json"), JSON.stringify({ pid: process.pid }) + "\\n", "utf8");',
      'setInterval(() => {}, 1000);'
    ].join("\n"), { mode: 0o600 });
    let terminalError;
    try {
      const execution = executeSupervisedStarshipPlaywright({
        baseEnvironment: {
          PATH: process.env.PATH,
          TEMP: outerRuntimeTemp,
          TMP: outerRuntimeTemp,
          TMPDIR: outerRuntimeTemp
        },
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        processTarget,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      });
      await waitForPath(readyPath);
      processTarget.emit(signal);
      try {
        await execution;
      } catch (error) {
        terminalError = error;
      }
      assert.ok(terminalError instanceof Error);
      const receipt = JSON.parse(readFileSync(terminalError.receiptPath, "utf8"));
      assert.equal(receipt.status, "failed");
      assert.equal(receipt.cleanup.complete, true);
      assert.deepEqual(receipt.child.outcome, {
        code: 0,
        signal: null,
        spawnError: null
      });
      assert.equal(receipt.signals.forwarded.length, 1);
      assert.equal(receipt.signals.forwarded[0].signal, signal);
      assert.equal(receipt.signals.forwarded[0].sent, true);
      assert.equal(
        receipt.signals.forwarded[0].processGroupId,
        receipt.child.processGroupId
      );
      assert.deepEqual(JSON.parse(readFileSync(handledPath, "utf8")), {
        pid: receipt.child.processGroupId,
        signal
      });
      assert.equal(processTarget.listenerCount("SIGINT"), 0);
      assert.equal(processTarget.listenerCount("SIGTERM"), 0);
    } finally {
      processTarget.removeAllListeners();
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });
}

test("supervisor preserves a foreign run lock and fails closed with a terminal receipt", async () => {
  const {
    executeSupervisedStarshipPlaywright
  } = await import("./run-starship-playwright-supervised.mjs");
  const fixtureRoot = uniqueFixtureRoot("foreign-lock");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const outerRuntimeTemp = path.join(fixtureRoot, ".tmp", "outer-runtime-temp");
  const nextEnvPath = path.join(fixtureRoot, "next-env.d.ts");
  const runId = "foreign-lock-path";
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(outerRuntimeTemp, { recursive: true });
  writeFileSync(nextEnvPath, "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { writeFileSync } from "node:fs";',
    'import path from "node:path";',
    'const argv = process.argv.slice(2);',
    'const runId = argv[argv.indexOf("--run-id") + 1];',
    'writeFileSync(path.join(process.cwd(), ".tmp", "starship-playwright-run.lock"), JSON.stringify({ ownerPid: process.pid + 1, repositoryRoot: process.cwd(), runId }) + "\\n", { mode: 0o600 });'
  ].join("\n"), { mode: 0o600 });
  let terminalError;
  try {
    try {
      await executeSupervisedStarshipPlaywright({
        baseEnvironment: {
          PATH: process.env.PATH,
          TEMP: outerRuntimeTemp,
          TMP: outerRuntimeTemp,
          TMPDIR: outerRuntimeTemp
        },
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      });
    } catch (error) {
      terminalError = error;
    }
    assert.ok(terminalError instanceof Error);
    const receipt = JSON.parse(readFileSync(terminalError.receiptPath, "utf8"));
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.cleanup.complete, false);
    assert.equal(receipt.cleanup.runLock.status, "foreign-unremoved");
    assert.equal(receipt.cleanup.runLock.ownerValidated, false);
    assert.equal(receipt.cleanup.runLock.removed, false);
    assert.equal(receipt.cleanup.runLock.foreignPreserved, true);
    assert.equal(existsSync(receipt.paths.runLockPath), true);
    assert.deepEqual(receipt.child.outcome, {
      code: 0,
      signal: null,
      spawnError: null
    });
    assert.match(
      receipt.violations.join("\n"),
      /Run-lock cleanup is incomplete.*foreign-unremoved/u
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("supervisor harvests a Playwright-style detached child after the inner runner is SIGKILLed", async () => {
  const {
    executeSupervisedStarshipPlaywright
  } = await import("./run-starship-playwright-supervised.mjs");
  const fixtureRoot = uniqueFixtureRoot("detached-escape");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const outerRuntimeTemp = path.join(fixtureRoot, ".tmp", "outer-runtime-temp");
  const nextEnvPath = path.join(fixtureRoot, "next-env.d.ts");
  const runId = "detached-escape";
  const escapedReadyPath = path.join(
    fixtureRoot,
    ".tmp",
    `e2e-run-${runId}`,
    "escaped-detached.json"
  );
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(outerRuntimeTemp, { recursive: true });
  writeFileSync(nextEnvPath, "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { spawn } from "node:child_process";',
    'import { existsSync, mkdirSync } from "node:fs";',
    'import path from "node:path";',
    'const argv = process.argv.slice(2);',
    'const runId = argv[argv.indexOf("--run-id") + 1];',
    'const runRoot = path.join(process.cwd(), ".tmp", `e2e-run-${runId}`);',
    'mkdirSync(runRoot, { recursive: true });',
    `const readyPath = ${JSON.stringify(escapedReadyPath)};`,
    'const detachedProgram = [',
    '  `import { writeFileSync } from "node:fs";`,',
    '  `process.on("SIGTERM", () => {});`,',
    '  `writeFileSync(${JSON.stringify(readyPath)}, JSON.stringify({ pid: process.pid, pgid: process.pid, ppid: process.ppid }) + "\\\\n", "utf8");`,',
    '  `setInterval(() => {}, 1000);`',
    '].join("\\n");',
    'const detached = spawn(process.execPath, ["--input-type=module", "--eval", detachedProgram], { detached: true, stdio: "ignore" });',
    'detached.unref();',
    'const deadline = Date.now() + 5000;',
    'while (!existsSync(readyPath)) {',
    '  if (Date.now() >= deadline) throw new Error("detached child did not become ready");',
    '  await new Promise((resolve) => setTimeout(resolve, 10));',
    '}',
    'process.kill(process.pid, "SIGKILL");'
  ].join("\n"), { mode: 0o600 });
  let terminalError;
  let escapedPid = null;
  let escapedWitness = null;
  try {
    try {
      await executeSupervisedStarshipPlaywright({
        baseEnvironment: {
          PATH: process.env.PATH,
          TEMP: outerRuntimeTemp,
          TMP: outerRuntimeTemp,
          TMPDIR: outerRuntimeTemp
        },
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        killGraceMs: 3_000,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 150
      });
    } catch (error) {
      terminalError = error;
    }
    assert.ok(terminalError instanceof Error);
    const receipt = JSON.parse(readFileSync(terminalError.receiptPath, "utf8"));
    escapedPid = JSON.parse(readFileSync(escapedReadyPath, "utf8")).pid;
    escapedWitness = exactReceiptProcessWitness(receipt, escapedPid, "escaped child receipt");
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.cleanup.complete, true);
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assert.ok(receipt.cleanup.ownedUniverse.consecutiveZeroScans >= 2);
    assert.ok(receipt.cleanup.validatedDetachedProcessGroups.includes(escapedPid));
    assert.match(receipt.preload.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(receipt.registry.intentCount >= 1);
    assert.throws(
      () => process.kill(escapedPid, 0),
      (error) => error?.code === "ESRCH"
    );
  } finally {
    if (escapedWitness) signalExactProcessGroupForTestCleanup(escapedWitness);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("supervisor fails closed and harvests a detached child left behind by an inner zero exit", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("zero-residual");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "zero-residual";
  const readyPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "residual.json");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { spawn } from "node:child_process";',
    'import { existsSync, mkdirSync } from "node:fs";',
    'import path from "node:path";',
    `const readyPath = ${JSON.stringify(readyPath)};`,
    'mkdirSync(path.dirname(readyPath), { recursive: true });',
    'const program = [',
    '  `import { writeFileSync } from "node:fs";`,',
    '  `process.on("SIGTERM", () => {});`,',
    '  `writeFileSync(${JSON.stringify(readyPath)}, JSON.stringify({ pid: process.pid, pgid: process.pid }) + "\\\\n");`,',
    '  `setInterval(() => {}, 1000);`',
    '].join("\\n");',
    'const child = spawn(process.execPath, ["--input-type=module", "--eval", program], { detached: true, stdio: "ignore" });',
    'child.unref();',
    'const deadline = Date.now() + 5000;',
    'while (!existsSync(readyPath)) {',
    '  if (Date.now() >= deadline) throw new Error("residual did not become ready");',
    '  await new Promise((resolve) => setTimeout(resolve, 10));',
    '}'
  ].join("\n"), { mode: 0o600 });
  let residualPid = null;
  let residualWitness = null;
  try {
    const { error, receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        killGraceMs: 3_000,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 100
      })
    );
    residualPid = JSON.parse(readFileSync(readyPath, "utf8")).pid;
    residualWitness = exactReceiptProcessWitness(receipt, residualPid, "residual child receipt");
    assert.deepEqual(receipt.child.outcome, { code: 0, signal: null, spawnError: null });
    assert.equal(receipt.cleanup.complete, true);
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assert.ok(receipt.cleanup.ownedUniverse.firstRows.some(({ pid }) => pid === residualPid));
    assert.ok(receipt.cleanup.validatedDetachedProcessGroups.includes(residualPid));
    assert.match(error.message, /exited zero.*residual owned process/iu);
    assertProcessDead(residualPid);
  } finally {
    if (residualWitness) signalExactProcessGroupForTestCleanup(residualWitness);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("supervisor harvests a process group after its detached leader exits before its stubborn grandchild", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("leader-exit");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "leader-exit";
  const runRoot = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`);
  const leaderPath = path.join(runRoot, "leader.json");
  const grandchildPath = path.join(runRoot, "group-grandchild.json");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { spawn } from "node:child_process";',
    'import { existsSync, mkdirSync } from "node:fs";',
    'import path from "node:path";',
    `const runRoot = ${JSON.stringify(runRoot)};`,
    `const leaderPath = ${JSON.stringify(leaderPath)};`,
    `const grandchildPath = ${JSON.stringify(grandchildPath)};`,
    'mkdirSync(runRoot, { recursive: true });',
    'const grandchildProgram = [',
    '  `import { writeFileSync } from "node:fs";`,',
    '  `process.on("SIGTERM", () => {});`,',
    '  `writeFileSync(${JSON.stringify(grandchildPath)}, JSON.stringify({ pid: process.pid, ppid: process.ppid }) + "\\\\n");`,',
    '  `setInterval(() => {}, 1000);`',
    '].join("\\n");',
    'const leaderProgram = [',
    '  `const { spawn } = require("node:child_process");`,',
    '  `const { existsSync, writeFileSync } = require("node:fs");`,',
    '  `const child = spawn(process.execPath, ["--input-type=module", "--eval", ${JSON.stringify(grandchildProgram)}], { detached: false, stdio: "ignore" });`,',
    '  `writeFileSync(${JSON.stringify(leaderPath)}, JSON.stringify({ pid: process.pid, childPid: child.pid }) + "\\\\n");`,',
    '  `const deadline = Date.now() + 5000;`,',
    '  `(async () => { while (!existsSync(${JSON.stringify(grandchildPath)})) { if (Date.now() >= deadline) process.exit(91); await new Promise((resolve) => setTimeout(resolve, 10)); } process.exit(0); })();`',
    '].join("\\n");',
    'const leader = spawn(process.execPath, ["--eval", leaderProgram], { detached: true, stdio: "ignore" });',
    'leader.unref();',
    'const deadline = Date.now() + 5000;',
    'while (!existsSync(grandchildPath)) {',
    '  if (Date.now() >= deadline) throw new Error("group grandchild did not become ready");',
    '  await new Promise((resolve) => setTimeout(resolve, 10));',
    '}',
    'await new Promise((resolve, reject) => { leader.once("exit", resolve); leader.once("error", reject); });'
  ].join("\n"), { mode: 0o600 });
  let leaderPid = null;
  let grandchildPid = null;
  let grandchildWitness = null;
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        killGraceMs: 3_000,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 100
      })
    );
    const leader = JSON.parse(readFileSync(leaderPath, "utf8"));
    const grandchild = JSON.parse(readFileSync(grandchildPath, "utf8"));
    leaderPid = leader.pid;
    grandchildPid = grandchild.pid;
    grandchildWitness = exactReceiptProcessWitness(
      receipt,
      grandchildPid,
      "leader-exit grandchild receipt"
    );
    assert.equal(leader.childPid, grandchildPid);
    assert.notEqual(leaderPid, grandchildPid);
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assert.ok(receipt.cleanup.validatedDetachedProcessGroups.includes(leaderPid));
    assert.ok(receipt.cleanup.ownedUniverse.actions.some(
      ({ processGroupId, signal }) => processGroupId === leaderPid && signal === "SIGKILL"
    ));
    assertProcessDead(leaderPid);
    assertProcessDead(grandchildPid);
  } finally {
    if (grandchildWitness) signalExactProcessGroupForTestCleanup(grandchildWitness);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("pre-spawn intent and synchronous result identity close the spawn registry window", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("registry-window");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "registry-window";
  const pidPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "window-pid.json");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { spawn } from "node:child_process";',
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const pidPath = ${JSON.stringify(pidPath)};`,
    'mkdirSync(path.dirname(pidPath), { recursive: true });',
    'const child = spawn(process.execPath, ["--eval", "process.on(\\"SIGTERM\\",()=>{});setInterval(()=>{},1000)"], { detached: true, stdio: "ignore" });',
    'child.unref();',
    'writeFileSync(pidPath, JSON.stringify({ pid: child.pid }) + "\\n", "utf8");',
    'process.kill(process.pid, "SIGKILL");'
  ].join("\n"), { mode: 0o600 });
  let childPid = null;
  let childWitness = null;
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        killGraceMs: 3_000,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 100
      })
    );
    childPid = JSON.parse(readFileSync(pidPath, "utf8")).pid;
    childWitness = exactReceiptProcessWitness(receipt, childPid, "registry-window child receipt");
    assert.ok(receipt.registry.intentCount >= 1);
    assert.equal(receipt.registry.resultCount, receipt.registry.intentCount);
    assert.ok(receipt.registry.seenIdentities.some(({ pid }) => pid === childPid));
    assert.ok(receipt.cleanup.validatedDetachedProcessGroups.includes(childPid));
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assertProcessDead(childPid);
  } finally {
    if (childWitness) signalExactProcessGroupForTestCleanup(childWitness);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a PID or PGID reuse-style registry mismatch is recorded but never signaled", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("reuse-mismatch");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "reuse-mismatch";
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  const foreign = spawn(
    process.execPath,
    ["--eval", "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],
    { detached: true, env: { ...process.env }, stdio: "ignore" }
  );
  foreign.unref();
  assert.ok(Number.isInteger(foreign.pid));
  const foreignWitness = captureExactProcessWitness(foreign.pid);
  writeFileSync(innerRunnerPath, [
    'import { createHash } from "node:crypto";',
    'import { fsyncSync, writeSync } from "node:fs";',
    'const hash = (value) => createHash("sha256").update(value).digest("hex");',
    'const registryFd = Number(process.env.STARSHIP_SUPERVISOR_REGISTRY_FD);',
    'const nonceHash = hash(process.env.STARSHIP_SUPERVISOR_RUN_NONCE);',
    'const tokenHash = hash(process.env.STARSHIP_SUPERVISOR_RUN_TOKEN);',
    'const eventId = "forged-reuse-identity";',
    'const createdAt = new Date().toISOString();',
    'const argvSha256 = "a".repeat(64);',
    'const commandSha256 = "b".repeat(64);',
    `const foreignPid = ${foreign.pid};`,
    'for (const [suffix, value] of [',
    '  ["intent", { argvSha256, commandSha256, createdAt, detachedRequested: true, eventId, kind: "spawn", parentPgid: process.pid, parentPid: process.pid, parentProcessCommandSha256: "c".repeat(64), parentStartToken: "Mon Jan  1 00:00:00 1990", runNonceSha256: nonceHash, runTokenSha256: tokenHash, schemaVersion: 1 }],',
    '  ["result", { argvSha256, classification: "spawned", commandSha256, createdAt, errorSha256: null, eventId, pgid: foreignPid, pid: foreignPid, processCommandSha256: "0".repeat(64), runNonceSha256: nonceHash, runTokenSha256: tokenHash, schemaVersion: 1, startToken: "Mon Jan  1 00:00:00 1990" }]',
    ']) {',
    '  const bytes = Buffer.from(JSON.stringify({ fileName: `${eventId}.${suffix}.json`, value }) + "\\n", "utf8");',
    '  writeSync(registryFd, bytes, 0, bytes.length, null);',
    '  fsyncSync(registryFd);',
    '}'
  ].join("\n"), { mode: 0o600 });
  try {
    const { error, receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.match(error.message, /identity validation failed/iu);
    assert.ok(receipt.registry.identityMismatches.some(
      ({ pid, reason }) => pid === foreign.pid && reason === "live-registry-identity-mismatch"
    ));
    assert.equal(receipt.cleanup.ownedUniverse.actions.some(
      ({ processGroupId }) => processGroupId === foreign.pid
    ), false);
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, false);
    assert.equal(receipt.cleanup.recordedProcessGroupTermination.find(
      ({ processGroupId }) => processGroupId === foreign.pid
    )?.provenEmpty, false);
    assert.equal(receipt.cleanup.complete, false);
    assert.doesNotThrow(() => process.kill(foreign.pid, 0));
  } finally {
    signalExactProcessGroupForTestCleanup(foreignWitness);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("pre-spawn, immediate, and repeated termination requests are queued, identity-checked, and listeners are removed", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("repeated-signals");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "repeated-signals";
  const processTarget = new EventEmitter();
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const readyPath = ${JSON.stringify(path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "ready.json"))};`,
    'mkdirSync(path.dirname(readyPath), { recursive: true });',
    'writeFileSync(readyPath, JSON.stringify({ pid: process.pid }) + "\\n");',
    'setInterval(() => {}, 1000);'
  ].join("\n"), { mode: 0o600 });
  try {
    const execution = executeSupervisedStarshipPlaywright({
      baseEnvironment: fixtureEnvironment(fixtureRoot),
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      processTarget,
      repositoryRoot: fixtureRoot,
      runId,
      stderrSink: null,
      stdoutSink: null
    });
    assert.equal(processTarget.listenerCount("SIGINT"), 1);
    assert.equal(processTarget.listenerCount("SIGTERM"), 1);
    processTarget.emit("SIGTERM");
    processTarget.emit("SIGTERM");
    processTarget.emit("SIGINT");
    const { receipt } = await expectSupervisorFailure(execution);
    assert.deepEqual(receipt.signals.forwarded.map(({ signal }) => signal), [
      "SIGTERM",
      "SIGTERM",
      "SIGINT"
    ]);
    assert.ok(receipt.signals.forwarded.some(({ sent }) => sent));
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assert.equal(receipt.cleanup.ownedUniverse.consecutiveZeroScans >= 2, true);
    assert.equal(processTarget.listenerCount("SIGINT"), 0);
    assert.equal(processTarget.listenerCount("SIGTERM"), 0);
  } finally {
    processTarget.removeAllListeners();
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("lexical and O_NOFOLLOW gates reject symlink components and preflight next-env links before spawn", async () => {
  const {
    buildSupervisedStarshipPlaywrightInvocation,
    executeSupervisedStarshipPlaywright
  } = await import("./run-starship-playwright-supervised.mjs");
  const fixtureRoot = uniqueFixtureRoot("symlink-preflight");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const linkRoot = path.join(
    fixtureRoot,
    ".tmp",
    `supervisor-repository-link-${process.pid}-${randomUUID()}`
  );
  const markerPath = path.join(fixtureRoot, "inner-ran.txt");
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(path.dirname(linkRoot), { recursive: true });
  writeFileSync(innerRunnerPath, [
    'import { writeFileSync } from "node:fs";',
    `writeFileSync(${JSON.stringify(markerPath)}, "ran\\n");`
  ].join("\n"), { mode: 0o600 });
  symlinkSync(fixtureRoot, linkRoot);
  try {
    assert.throws(
      () => buildSupervisedStarshipPlaywrightInvocation({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath: path.join(linkRoot, "scripts", "fake-inner.mjs"),
        repositoryRoot: linkRoot,
        runId: "symlink-component"
      }),
      /symbolic-link component/iu
    );
    const externalNextEnv = path.join(fixtureRoot, "external-next-env.txt");
    writeFileSync(externalNextEnv, "external-must-not-change\n", { mode: 0o600 });
    symlinkSync(externalNextEnv, path.join(fixtureRoot, "next-env.d.ts"));
    const { receipt: prelaunchReceipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "next-env-link",
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(prelaunchReceipt.status, "failed");
    assert.equal(prelaunchReceipt.child.processGroupId, null);
    assert.match(prelaunchReceipt.child.outcome.spawnError, /symbolic-link component/iu);
    assert.equal(prelaunchReceipt.cleanup.supervisorLock.status, "removed-owned");
    assert.equal(existsSync(markerPath), false);
    assert.equal(readFileSync(externalNextEnv, "utf8"), "external-must-not-change\n");
    assert.equal(
      existsSync(path.join(fixtureRoot, ".tmp", "starship-playwright-supervisor-run.lock")),
      false
    );
  } finally {
    if (lstatSync(linkRoot).isSymbolicLink()) unlinkSync(linkRoot);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("runtime next-env symlink replacement is preserved and cannot be mistaken for an exact restore", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("next-env-replacement");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const nextEnvPath = path.join(fixtureRoot, "next-env.d.ts");
  const externalPath = path.join(fixtureRoot, "external-next-env.txt");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(nextEnvPath, "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(externalPath, "foreign-bytes\n", { mode: 0o600 });
  writeFileSync(innerRunnerPath, [
    'import { symlinkSync, unlinkSync } from "node:fs";',
    `unlinkSync(${JSON.stringify(nextEnvPath)});`,
    `symlinkSync(${JSON.stringify(externalPath)}, ${JSON.stringify(nextEnvPath)});`
  ].join("\n"), { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "next-env-replacement",
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(receipt.cleanup.nextEnv.status, "unsafe-foreign-preserved");
    assert.equal(receipt.cleanup.nextEnv.foreignPreserved, true);
    assert.equal(receipt.cleanup.nextEnv.exact, false);
    assert.equal(lstatSync(nextEnvPath).isSymbolicLink(), true);
    assert.equal(readFileSync(externalPath, "utf8"), "foreign-bytes\n");
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

for (const linkKind of ["existing-target", "dangling-target"]) {
  test(`runtime ${linkKind} tsconfig symlink is preserved and never archived`, async () => {
    const { executeSupervisedStarshipPlaywright } = await import(
      "./run-starship-playwright-supervised.mjs"
    );
    const fixtureRoot = uniqueFixtureRoot(`tsconfig-${linkKind}`);
    const fixtureScripts = path.join(fixtureRoot, "scripts");
    const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
    const runId = `tsconfig-${linkKind}`;
    const tsconfigPath = path.join(
      fixtureRoot,
      ".tmp",
      `e2e-run-${runId}`,
      `tsconfig.playwright-${runId}.tmp.json`
    );
    const targetPath = path.join(fixtureRoot, `${linkKind}-target.json`);
    mkdirSync(fixtureScripts, { recursive: true });
    writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
    if (linkKind === "existing-target") {
      writeFileSync(targetPath, "foreign-tsconfig\n", { mode: 0o600 });
    }
    writeFileSync(innerRunnerPath, [
      'import { symlinkSync } from "node:fs";',
      `symlinkSync(${JSON.stringify(targetPath)}, ${JSON.stringify(tsconfigPath)});`
    ].join("\n"), { mode: 0o600 });
    try {
      const { receipt } = await expectSupervisorFailure(
        executeSupervisedStarshipPlaywright({
          baseEnvironment: fixtureEnvironment(fixtureRoot),
          innerArgs: ["test", "tests/e2e/example.spec.ts"],
          innerRunnerPath,
          repositoryRoot: fixtureRoot,
          runId,
          stderrSink: null,
          stdoutSink: null
        })
      );
      assert.equal(receipt.cleanup.nextTsconfig.status, "unsafe-foreign-preserved");
      assert.equal(receipt.cleanup.nextTsconfig.foreignPreserved, true);
      assert.equal(lstatSync(tsconfigPath).isSymbolicLink(), true);
      assert.equal(existsSync(receipt.paths.tsconfigArchivePath), false);
      if (linkKind === "existing-target") {
        assert.equal(readFileSync(targetPath, "utf8"), "foreign-tsconfig\n");
      } else {
        assert.equal(existsSync(targetPath), false);
      }
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });
}

test("outer lock inode and nonce replacement is preserved and makes the terminal receipt fail closed", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("outer-lock-replacement");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "outer-lock-replacement";
  const lockPath = path.join(fixtureRoot, ".tmp", "starship-playwright-supervisor-run.lock");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { unlinkSync, writeFileSync } from "node:fs";',
    `const lockPath = ${JSON.stringify(lockPath)};`,
    'unlinkSync(lockPath);',
    `writeFileSync(lockPath, JSON.stringify({ nonce: "foreign-replacement", ownerPid: process.ppid, repositoryRoot: process.cwd(), runId: ${JSON.stringify(runId)}, runTokenSha256: process.env.STARSHIP_SUPERVISOR_RUN_TOKEN_SHA256 }) + "\\n", { mode: 0o600 });`
  ].join("\n"), { mode: 0o600 });
  try {
    const { error, receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.match(error.message, /Outer supervisor lock cleanup is incomplete/iu);
    assert.equal(receipt.cleanup.complete, false);
    assert.equal(receipt.cleanup.supervisorLock.status, "foreign-replacement-preserved");
    assert.equal(receipt.cleanup.supervisorLock.foreignPreserved, true);
    assert.equal(receipt.cleanup.supervisorLock.ownerValidated, false);
    assert.equal(receipt.cleanup.supervisorLock.removed, false);
    assert.equal(existsSync(lockPath), true);
    assert.match(readFileSync(lockPath, "utf8"), /foreign-replacement/u);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a pre-existing outer global lock blocks spawn, is preserved, and still produces a terminal receipt", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("outer-lock-preexisting");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const markerPath = path.join(fixtureRoot, "inner-ran.txt");
  const lockPath = path.join(fixtureRoot, ".tmp", "starship-playwright-supervisor-run.lock");
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(path.dirname(lockPath), { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { writeFileSync } from "node:fs";',
    `writeFileSync(${JSON.stringify(markerPath)}, "ran\\n");`
  ].join("\n"), { mode: 0o600 });
  writeFileSync(lockPath, '{"nonce":"foreign-active-run"}\n', { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "outer-lock-preexisting",
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(receipt.child.processGroupId, null);
    assert.equal(receipt.cleanup.supervisorLock.status, "not-acquired");
    assert.equal(receipt.cleanup.supervisorLock.removed, false);
    assert.equal(existsSync(markerPath), false);
    assert.equal(readFileSync(lockPath, "utf8"), '{"nonce":"foreign-active-run"}\n');
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
test(`prelaunch ${signal} is sealed through the exact terminal signal protocol`, async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const signalLabel = signal.toLowerCase();
  const fixtureRoot = uniqueFixtureRoot(`prelaunch-${signalLabel}-terminal-evidence`);
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = `prelaunch-${signalLabel}-terminal-evidence`;
  const receiptPath = path.join(
    fixtureRoot,
    ".tmp",
    `starship-playwright-supervisor-${runId}`,
    "supervisor-terminal-receipt.json"
  );
  const processTarget = new EventEmitter();
  const inheritedOn = processTarget.on.bind(processTarget);
  const inheritedRemoveListener = processTarget.removeListener.bind(processTarget);
  const removalReceipts = [];
  let signalInjected = false;
  processTarget.on = (eventName, listener) => {
    inheritedOn(eventName, listener);
    if (eventName === "SIGTERM" && !signalInjected) {
      signalInjected = true;
      processTarget.emit(signal);
    }
    return processTarget;
  };
  processTarget.removeListener = (eventName, listener) => {
    if (["SIGINT", "SIGTERM"].includes(eventName)) {
      let sealed = false;
      try {
        const parsed = JSON.parse(readFileSync(receiptPath, "utf8"));
        sealed = parsed.status === "failed";
      } catch {}
      removalReceipts.push({ eventName, sealed });
    }
    return inheritedRemoveListener(eventName, listener);
  };
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(path.join(fixtureRoot, ".tmp"), { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, "process.exit(0);\n", { mode: 0o600 });
  writeFileSync(
    path.join(fixtureRoot, ".tmp", "starship-playwright-supervisor-run.lock"),
    "foreign-supervisor-lock\n",
    { mode: 0o600 }
  );
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        processTarget,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(signalInjected, true);
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.releaseReady, false);
    assert.deepEqual(
      receipt.signals.forwarded.map(
        ({ acceptance, parentDeathRelevant, phase, sequence, signal }) => ({
          acceptance,
          parentDeathRelevant,
          phase,
          sequence,
          signal
        })
      ),
      [{
        acceptance: "accepted",
        parentDeathRelevant: false,
        phase: "prelaunch",
        sequence: 1,
        signal
      }]
    );
    assert.deepEqual(
      receipt.violations.filter((value) => value === `Supervisor received ${signal}.`),
      [`Supervisor received ${signal}.`]
    );
    assert.equal(receipt.signals.finalization.acceptanceOpenedSequence, 0);
    assert.equal(receipt.signals.finalization.acceptanceClosedSequence, 1);
    assert.equal(receipt.signals.finalization.terminalEvidenceClosedSequence, 1);
    assert.equal(receipt.signals.finalization.outerExitEvidenceRequired, true);
    assert.equal(
      receipt.signals.finalization.guarantee,
      "Node callback delivered before terminalEvidenceClosed; not wall-clock signal arrival or file-seal atomicity."
    );
    assert.deepEqual(receipt.signals.finalization.releaseGreenRequires, {
      liveSignalJournalMatchesReceipt: true,
      outerExitCode: 0,
      outerExitSignal: null,
      validatorRunsAfterOuterProcessExit: true
    });
    const journalBytes = readFileSync(receipt.signals.journal.path);
    const journalRecords = journalBytes.toString("utf8").trimEnd().split("\n").map(
      (line) => JSON.parse(line)
    );
    assert.deepEqual(journalRecords, receipt.signals.journal.deliveredRecords);
    assert.equal(journalRecords.length, 1);
    assert.equal(receipt.signals.journal.deliveredCount, 1);
    assert.equal(receipt.signals.journal.receipt.final.size, journalBytes.length);
    assert.equal(
      receipt.signals.journal.receipt.final.sha256,
      createHash("sha256").update(journalBytes).digest("hex")
    );
    assert.equal(
      receipt.signals.journal.expectedSha256,
      receipt.signals.journal.receipt.final.sha256
    );
    assert.equal(receipt.signals.journal.snapshotExact, true);
    assert.equal(receipt.signals.journal.receipt.exact, true);
    assert.deepEqual(removalReceipts, [
      { eventName: "SIGINT", sealed: true },
      { eventName: "SIGTERM", sealed: true }
    ]);
    assert.equal(processTarget.listenerCount("SIGINT"), 0);
    assert.equal(processTarget.listenerCount("SIGTERM"), 0);
  } finally {
    processTarget.removeAllListeners();
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});
}

test("stdout path replacement cannot inherit the held descriptor receipt or produce a green seal", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("log-replacement");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "log-replacement";
  const supervisorRoot = path.join(
    fixtureRoot,
    ".tmp",
    `starship-playwright-supervisor-${runId}`
  );
  const stdoutPath = path.join(supervisorRoot, "inner.stdout.log");
  const displacedPath = path.join(supervisorRoot, "displaced-original-stdout.log");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { renameSync, writeFileSync } from "node:fs";',
    `renameSync(${JSON.stringify(stdoutPath)}, ${JSON.stringify(displacedPath)});`,
    `writeFileSync(${JSON.stringify(stdoutPath)}, "foreign-log-replacement\\n", { mode: 0o600 });`,
    'console.log("owned-descriptor-output");'
  ].join("\n"), { mode: 0o600 });
  try {
    const { error, receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.match(error.message, /log path\/inode\/bytes receipts are incomplete/iu);
    assert.equal(receipt.logs.stdout.exact, false);
    assert.notEqual(receipt.logs.stdout.initial.inode, receipt.logs.stdout.final.inode);
    assert.equal(receipt.logs.stderr.exact, true);
    assert.equal(readFileSync(stdoutPath, "utf8"), "foreign-log-replacement\n");
    assert.match(readFileSync(displacedPath, "utf8"), /owned-descriptor-output/u);
    assert.equal(receipt.cleanup.complete, false);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a terminal log sink write failure is captured in the receipt and fails closed", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("log-write-failure");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, 'console.log("stdout-that-must-be-sealed");\n', { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "log-write-failure",
        stderrSink: null,
        stdoutSink: {
          write() {
            throw new Error("synthetic terminal sink refusal");
          }
        }
      })
    );
    assert.equal(receipt.logs.stdout.exact, false);
    assert.ok(receipt.logs.stdout.errors.some(
      ({ destination, error }) => destination === "sink" && /sink refusal/u.test(error)
    ));
    assert.match(readFileSync(receipt.paths.stdoutPath, "utf8"), /stdout-that-must-be-sealed/u);
    assert.equal(receipt.logs.stdout.final.sha256, receipt.logs.stdout.streamedSha256);
    assert.equal(receipt.cleanup.complete, false);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("preload ownership constants survive inner process.env deletion and still harvest a native detached child", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("immutable-preload-env");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "immutable-preload-env";
  const readyPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "native-child.pid");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { spawn } from "node:child_process";',
    'import { existsSync, mkdirSync } from "node:fs";',
    'import path from "node:path";',
    `const readyPath = ${JSON.stringify(readyPath)};`,
    'mkdirSync(path.dirname(readyPath), { recursive: true });',
    'for (const name of Object.keys(process.env)) { if (name.startsWith("STARSHIP_SUPERVISOR_")) delete process.env[name]; }',
    'const shellProgram = `trap \'\' TERM INT; echo $$ > ${readyPath}; while :; do /bin/sleep 1; done`;',
    'const child = spawn("/bin/sh", ["-c", shellProgram], { detached: true, env: { PATH: process.env.PATH }, stdio: "ignore" });',
    'child.unref();',
    'const deadline = Date.now() + 5000;',
    'while (!existsSync(readyPath)) {',
    '  if (Date.now() >= deadline) throw new Error("native detached child did not become ready");',
    '  await new Promise((resolve) => setTimeout(resolve, 10));',
    '}',
    'process.kill(process.pid, "SIGKILL");'
  ].join("\n"), { mode: 0o600 });
  let nativePid = null;
  let nativeWitness = null;
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        killGraceMs: 3_000,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 100
      })
    );
    nativePid = Number(readFileSync(readyPath, "utf8").trim());
    assert.ok(Number.isInteger(nativePid));
    nativeWitness = exactReceiptProcessWitness(receipt, nativePid, "native detached child receipt");
    assert.ok(
      receipt.registry.seenIdentities.some(({ pid }) => pid === nativePid),
      JSON.stringify({
        actions: receipt.cleanup.ownedUniverse.actions,
        identityMismatches: receipt.registry.identityMismatches,
        registry: receipt.registry,
        violations: receipt.violations
      })
    );
    assert.ok(receipt.cleanup.validatedDetachedProcessGroups.includes(nativePid));
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assertProcessDead(nativePid);
  } finally {
    if (nativeWitness) signalExactProcessGroupForTestCleanup(nativeWitness);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("byte-identical next-env replacement with a foreign inode is preserved and remains RED", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("next-env-identical-inode");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const nextEnvPath = path.join(fixtureRoot, "next-env.d.ts");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(nextEnvPath, "canonical-next-env\n", { mode: 0o640 });
  const originalInode = statSync(nextEnvPath).ino;
  writeFileSync(innerRunnerPath, [
    'import { chmodSync, unlinkSync, writeFileSync } from "node:fs";',
    `unlinkSync(${JSON.stringify(nextEnvPath)});`,
    `writeFileSync(${JSON.stringify(nextEnvPath)}, "canonical-next-env\\n", { mode: 0o640 });`,
    `chmodSync(${JSON.stringify(nextEnvPath)}, 0o640);`
  ].join("\n"), { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "next-env-identical-inode",
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(receipt.cleanup.nextEnv.status, "foreign-replacement-preserved");
    assert.equal(receipt.cleanup.nextEnv.exact, false);
    assert.equal(receipt.cleanup.nextEnv.foreignPreserved, true);
    assert.notEqual(statSync(nextEnvPath).ino, originalInode);
    assert.equal(readFileSync(nextEnvPath, "utf8"), "canonical-next-env\n");
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a signal-ignoring inner is escalated and cannot leave the supervisor awaiting forever", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("signal-escalation");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "signal-escalation";
  const readyPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "ready.json");
  const processTarget = new EventEmitter();
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const readyPath = ${JSON.stringify(readyPath)};`,
    'mkdirSync(path.dirname(readyPath), { recursive: true });',
    'process.on("SIGTERM", () => {});',
    'process.on("SIGINT", () => {});',
    'writeFileSync(readyPath, JSON.stringify({ pid: process.pid }) + "\\n");',
    'setInterval(() => {}, 1000);'
  ].join("\n"), { mode: 0o600 });
  let innerPid = null;
  let safety = null;
  let safetyWitness = null;
  try {
    const execution = executeSupervisedStarshipPlaywright({
      baseEnvironment: fixtureEnvironment(fixtureRoot),
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      killGraceMs: 1_000,
      processTarget,
      repositoryRoot: fixtureRoot,
      runId,
      stderrSink: null,
      stdoutSink: null,
      termGraceMs: 100
    });
    await waitForPath(readyPath);
    innerPid = JSON.parse(readFileSync(readyPath, "utf8")).pid;
    safetyWitness = captureExactProcessWitness(innerPid);
    assert.equal(safetyWitness.pgid, innerPid);
    safety = armProcessGroupSafetyKill(safetyWitness, 1_500);
    processTarget.emit("SIGTERM");
    const [{ receipt }, safetyObservation] = await Promise.all([
      expectSupervisorFailure(execution),
      safety.outcome
    ]);
    safety = null;
    assert.equal(safetyObservation.safetyTriggered, false);
    assert.equal(safetyObservation.groupAlreadyGoneAtDeadline, true);
    assert.equal(safetyObservation.attempted, false);
    assert.equal(safetyObservation.sent, false);
    assert.equal(safetyObservation.absentAtSignal, true);
    assert.equal(safetyObservation.probeError, null);
    assert.equal(safetyObservation.signal, null);
    assertExactSignalEscalationReceipt(receipt, safetyWitness);
    const wrongKillGroupReceipt = structuredClone(receipt);
    const nativeKill = wrongKillGroupReceipt.signals.forwarded[0].actions.find(
      ({ signal }) => signal === "SIGKILL"
    );
    nativeKill.processGroupId += 1;
    assert.throws(
      () => assertExactSignalEscalationReceipt(wrongKillGroupReceipt, safetyWitness),
      /SIGKILL.*process group|process group.*SIGKILL/iu
    );
    for (const [signal, field, mutate, expectedError] of [
      ["SIGTERM", "pid", (value) => value + 1, /SIGTERM.*leader PID/iu],
      ["SIGKILL", "startToken", (value) => `${value}-foreign`, /SIGKILL.*immutable/iu],
      ["SIGKILL", "pgid", (value) => value + 1, /SIGKILL.*immutable/iu]
    ]) {
      const wrongLeaderReceipt = structuredClone(receipt);
      const action = wrongLeaderReceipt.signals.forwarded[0].actions.find(
        (candidate) => candidate.signal === signal
      );
      const leaderWitness = action.witnesses.find(({ pid }) => pid === safetyWitness.pid);
      leaderWitness[field] = mutate(leaderWitness[field]);
      assert.throws(
        () => assertExactSignalEscalationReceipt(wrongLeaderReceipt, safetyWitness),
        expectedError,
        `${signal} ${field} mutant must not satisfy the immutable leader receipt`
      );
    }
    assert.ok(receipt.signals.forwarded[0].actions.some(
      ({ sent, signal }) => sent === true && signal === "SIGKILL"
    ));
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assert.equal(receipt.cleanup.ownedUniverse.finalRows.length, 0);
    assertProcessDead(innerPid);
  } finally {
    safety?.cancel();
    if (safetyWitness) signalExactProcessGroupForTestCleanup(safetyWitness);
    processTarget.removeAllListeners();
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("the escalation safety deadline kills a genuinely live process group", async () => {
  const fixtureRoot = uniqueFixtureRoot("live-group-safety-deadline");
  const readyPath = path.join(fixtureRoot, "ready.json");
  mkdirSync(fixtureRoot, { recursive: true });
  assert.doesNotMatch(
    readFileSync(testSourcePath, "utf8"),
    /process\.kill\(\s*-[^,]+,\s*["']SIGKILL["']/u,
    "test fallbacks must not contain a bare negative-PID SIGKILL"
  );
  const injectedWitness = Object.freeze({
    pgid: 9_000_002,
    pid: 9_000_001,
    startToken: "injected-start-token"
  });
  const probePermissionCalls = [];
  const probePermission = armProcessGroupSafetyKill(injectedWitness, 1, {
    observeWitness() {
      probePermissionCalls.push("observe");
      return injectedWitness;
    },
    probeGroup() {
      probePermissionCalls.push("probe");
      const error = new Error("probe denied");
      error.code = "EPERM";
      throw error;
    },
    signalGroup() {
      probePermissionCalls.push("signal");
    }
  });
  const probePermissionOutcome = await probePermission.outcome;
  assert.deepEqual(probePermissionCalls, ["probe"]);
  assert.equal(probePermissionOutcome.attempted, false);
  assert.equal(probePermissionOutcome.sent, false);
  assert.equal(probePermissionOutcome.absentAtSignal, false);
  assert.equal(probePermissionOutcome.failedClosed, true);
  assert.match(probePermissionOutcome.probeError, /probe denied/u);

  const cleanupProbePermissionCalls = [];
  const cleanupProbePermissionOutcome = signalExactProcessGroupForTestCleanup(
    injectedWitness,
    {
      observeWitness() {
        cleanupProbePermissionCalls.push("observe");
        return injectedWitness;
      },
      probeGroup() {
        cleanupProbePermissionCalls.push("probe");
        const error = new Error("cleanup probe denied");
        error.code = "EPERM";
        throw error;
      },
      signalGroup() {
        cleanupProbePermissionCalls.push("signal");
      }
    }
  );
  assert.deepEqual(cleanupProbePermissionCalls, ["probe"]);
  assert.equal(cleanupProbePermissionOutcome.attempted, false);
  assert.equal(cleanupProbePermissionOutcome.sent, false);
  assert.equal(cleanupProbePermissionOutcome.failedClosed, true);
  assert.match(cleanupProbePermissionOutcome.probeError, /cleanup probe denied/u);

  const cleanupReuseCalls = [];
  const cleanupReuseOutcome = signalExactProcessGroupForTestCleanup(injectedWitness, {
    observeWitness() {
      cleanupReuseCalls.push("observe");
      return { ...injectedWitness, startToken: "cleanup-foreign-reused-start-token" };
    },
    probeGroup() {
      cleanupReuseCalls.push("probe");
    },
    signalGroup() {
      cleanupReuseCalls.push("signal");
    }
  });
  assert.deepEqual(cleanupReuseCalls, ["probe", "observe"]);
  assert.equal(cleanupReuseOutcome.attempted, false);
  assert.equal(cleanupReuseOutcome.sent, false);
  assert.equal(cleanupReuseOutcome.identityMismatch, true);
  assert.equal(cleanupReuseOutcome.failedClosed, true);

  for (const [label, observeWitness, errorPattern] of [
    [
      "malformed",
      () => ({ pgid: injectedWitness.pgid, pid: "not-a-pid", startToken: "bad" }),
      /positive PID/u
    ],
    [
      "scan-error",
      () => {
        throw new Error("fresh scan failed");
      },
      /fresh scan failed/u
    ]
  ]) {
    const calls = [];
    const safety = armProcessGroupSafetyKill(injectedWitness, 1, {
      observeWitness() {
        calls.push("observe");
        return observeWitness();
      },
      probeGroup() {
        calls.push("probe");
      },
      signalGroup() {
        calls.push("signal");
      }
    });
    const outcome = await safety.outcome;
    assert.deepEqual(calls, ["probe", "observe"], label);
    assert.equal(outcome.attempted, false, label);
    assert.equal(outcome.sent, false, label);
    assert.equal(outcome.absentAtSignal, false, label);
    assert.equal(outcome.failedClosed, true, label);
    assert.match(outcome.observationError, errorPattern, label);
  }

  const startTokenMismatchCalls = [];
  const startTokenMismatch = armProcessGroupSafetyKill(injectedWitness, 1, {
    observeWitness() {
      startTokenMismatchCalls.push("observe");
      return { ...injectedWitness, startToken: "foreign-reused-start-token" };
    },
    probeGroup() {
      startTokenMismatchCalls.push("probe");
    },
    signalGroup() {
      startTokenMismatchCalls.push("signal");
    }
  });
  const startTokenMismatchOutcome = await startTokenMismatch.outcome;
  assert.deepEqual(startTokenMismatchCalls, ["probe", "observe"]);
  assert.equal(startTokenMismatchOutcome.attempted, false);
  assert.equal(startTokenMismatchOutcome.sent, false);
  assert.equal(startTokenMismatchOutcome.absentAtSignal, false);
  assert.equal(startTokenMismatchOutcome.identityMismatch, true);
  assert.equal(startTokenMismatchOutcome.failedClosed, true);

  const absentAtSignalCalls = [];
  const absentAtSignal = armProcessGroupSafetyKill(injectedWitness, 1, {
    observeWitness() {
      absentAtSignalCalls.push("observe");
      return injectedWitness;
    },
    probeGroup() {
      absentAtSignalCalls.push("probe");
    },
    signalGroup() {
      absentAtSignalCalls.push("signal");
      const error = new Error("group exited before SIGKILL");
      error.code = "ESRCH";
      throw error;
    }
  });
  const absentAtSignalOutcome = await absentAtSignal.outcome;
  assert.deepEqual(absentAtSignalCalls, ["probe", "observe", "signal"]);
  assert.equal(absentAtSignalOutcome.attempted, true);
  assert.equal(absentAtSignalOutcome.sent, false);
  assert.equal(absentAtSignalOutcome.absentAtSignal, true);
  assert.equal(absentAtSignalOutcome.signalError, null);

  const validWitnessCalls = [];
  const validWitness = armProcessGroupSafetyKill(injectedWitness, 1, {
    observeWitness() {
      validWitnessCalls.push("observe");
      return injectedWitness;
    },
    probeGroup() {
      validWitnessCalls.push("probe");
    },
    signalGroup(pgid, signal) {
      validWitnessCalls.push({ pgid, signal });
    }
  });
  const validWitnessOutcome = await validWitness.outcome;
  assert.deepEqual(validWitnessCalls, [
    "probe",
    "observe",
    { pgid: injectedWitness.pgid, signal: "SIGKILL" }
  ]);
  assert.equal(validWitnessOutcome.attempted, true);
  assert.equal(validWitnessOutcome.sent, true);
  assert.equal(validWitnessOutcome.absentAtSignal, false);
  assert.equal(validWitnessOutcome.signalError, null);

  const stubborn = spawn(process.execPath, [
    "--input-type=module",
    "--eval",
    [
      'import { writeFileSync } from "node:fs";',
      'process.on("SIGTERM", () => {});',
      `writeFileSync(${JSON.stringify(readyPath)}, JSON.stringify({ pid: process.pid }) + "\\n");`,
      "setInterval(() => {}, 1000);"
    ].join("\n")
  ], {
    detached: true,
    env: { PATH: process.env.PATH },
    stdio: "ignore"
  });
  let stubbornWitness = null;
  try {
    await waitForPath(readyPath);
    stubbornWitness = captureExactProcessWitness(stubborn.pid);
    assert.equal(stubbornWitness.pgid, stubborn.pid);
    const safety = armProcessGroupSafetyKill(stubbornWitness, 1_500);
    const childExit = new Promise((resolve) => stubborn.once("exit", resolve));
    const observation = await safety.outcome;
    assert.equal(observation.safetyTriggered, true);
    assert.equal(observation.groupAlreadyGoneAtDeadline, false);
    assert.equal(observation.attempted, true);
    assert.equal(observation.sent, true);
    assert.equal(observation.absentAtSignal, false);
    assert.equal(observation.probeError, null);
    assert.equal(observation.signal, "SIGKILL");
    assert.equal(observation.signalError, null);
    await childExit;
    assertProcessDead(stubborn.pid);
    assertProcessGroupDead(stubborn.pid);
  } finally {
    if (stubbornWitness) signalExactProcessGroupForTestCleanup(stubbornWitness);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("registry parent replacement cannot redirect descriptor-anchored child evidence", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("registry-parent-replacement");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "registry-parent-replacement";
  const supervisorRoot = path.join(
    fixtureRoot,
    ".tmp",
    `starship-playwright-supervisor-${runId}`
  );
  const registryDir = path.join(supervisorRoot, "child-registry");
  const displacedRegistryDir = path.join(supervisorRoot, "child-registry-owned-displaced");
  const redirectedTarget = path.join(
    fixtureRoot,
    ".tmp",
    `supervisor-registry-redirect-target-${process.pid}-${randomUUID()}`
  );
  const childPidPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "child.pid");
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(redirectedTarget, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { spawn } from "node:child_process";',
    'import { mkdirSync, renameSync, symlinkSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const registryDir = ${JSON.stringify(registryDir)};`,
    `const displacedRegistryDir = ${JSON.stringify(displacedRegistryDir)};`,
    `const redirectedTarget = ${JSON.stringify(redirectedTarget)};`,
    `const childPidPath = ${JSON.stringify(childPidPath)};`,
    'renameSync(registryDir, displacedRegistryDir);',
    'symlinkSync(redirectedTarget, registryDir, "dir");',
    'const child = spawn("/bin/sh", ["-c", "trap \'\' TERM INT; while :; do /bin/sleep 1; done"], { detached: true, env: { PATH: process.env.PATH }, stdio: "ignore" });',
    'child.unref();',
    'mkdirSync(path.dirname(childPidPath), { recursive: true });',
    'writeFileSync(childPidPath, String(child.pid) + "\\n", "utf8");',
    'process.kill(process.pid, "SIGKILL");'
  ].join("\n"), { mode: 0o600 });
  let childPid = null;
  let childWitness = null;
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        killGraceMs: 3_000,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 100
      })
    );
    childPid = Number(readFileSync(childPidPath, "utf8").trim());
    childWitness = exactReceiptProcessWitness(
      receipt,
      childPid,
      "redirected registry child receipt"
    );
    assert.deepEqual(readdirSync(redirectedTarget), []);
    assert.equal(receipt.registry.intentCount >= 1, true);
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assert.equal(receipt.registry.journal.exact, false);
    assertProcessDead(childPid);
  } finally {
    if (childWitness) signalExactProcessGroupForTestCleanup(childWitness);
    rmSync(redirectedTarget, { force: true, recursive: true });
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("an unmatched spawn intent cannot be green without an exact terminal disposition", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("unmatched-intent");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { createHash } from "node:crypto";',
    'import { execFileSync } from "node:child_process";',
    'import { fsyncSync, writeSync } from "node:fs";',
    'const hash = (value) => createHash("sha256").update(value).digest("hex");',
    'const output = execFileSync("ps", ["-p", String(process.pid), "-o", "pid=,pgid=,lstart=,command="], { encoding: "utf8" }).trim();',
    'const match = output.match(/^\\s*(\\d+)\\s+(\\d+)\\s+(\\S+\\s+\\S+\\s+\\d+\\s+\\d\\d:\\d\\d:\\d\\d\\s+\\d{4})\\s+(.*)$/u);',
    'const eventId = "manual-unmatched-intent";',
    'const value = { argvSha256: "a".repeat(64), commandSha256: "b".repeat(64), createdAt: new Date().toISOString(), detachedRequested: true, eventId, kind: "spawn", parentPgid: Number(match[2]), parentPid: process.pid, parentProcessCommandSha256: hash(Buffer.from(match[4], "utf8")), parentStartToken: match[3].trim(), runNonceSha256: hash(process.env.STARSHIP_SUPERVISOR_RUN_NONCE), runTokenSha256: hash(process.env.STARSHIP_SUPERVISOR_RUN_TOKEN), schemaVersion: 1 };',
    'const bytes = Buffer.from(JSON.stringify({ fileName: `${eventId}.intent.json`, value }) + "\\n", "utf8");',
    'const fd = Number(process.env.STARSHIP_SUPERVISOR_REGISTRY_FD);',
    'writeSync(fd, bytes, 0, bytes.length, null);',
    'fsyncSync(fd);'
  ].join("\n"), { mode: 0o600 });
  try {
    const { error, receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "unmatched-intent",
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.match(error.message, /no exact terminal result/iu);
    assert.equal(receipt.registry.unmatchedIntentCount, 1);
    assert.deepEqual(receipt.registry.abandonedIntents, []);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("signals received during the final process-group audit fail the sealed receipt exactly once", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("terminal-audit-signals");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const processTarget = new EventEmitter();
  const inheritedSetTimeout = globalThis.setTimeout;
  let supervisorProcessScanTimers = 0;
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { createHash } from "node:crypto";',
    'import { execFileSync } from "node:child_process";',
    'import { fsyncSync, writeSync } from "node:fs";',
    'const hash = (value) => createHash("sha256").update(value).digest("hex");',
    'const output = execFileSync("ps", ["-p", String(process.pid), "-o", "pid=,pgid=,lstart=,command="], { encoding: "utf8" }).trim();',
    'const match = output.match(/^\\s*(\\d+)\\s+(\\d+)\\s+(\\S+\\s+\\S+\\s+\\d+\\s+\\d\\d:\\d\\d:\\d\\d\\s+\\d{4})\\s+(.*)$/u);',
    'const eventId = "terminal-audit-unmatched-intent";',
    'const value = { argvSha256: "a".repeat(64), commandSha256: "b".repeat(64), createdAt: new Date().toISOString(), detachedRequested: true, eventId, kind: "spawn", parentPgid: Number(match[2]), parentPid: process.pid, parentProcessCommandSha256: hash(Buffer.from(match[4], "utf8")), parentStartToken: match[3].trim(), runNonceSha256: hash(process.env.STARSHIP_SUPERVISOR_RUN_NONCE), runTokenSha256: hash(process.env.STARSHIP_SUPERVISOR_RUN_TOKEN), schemaVersion: 1 };',
    'const bytes = Buffer.from(JSON.stringify({ fileName: `${eventId}.intent.json`, value }) + "\\n", "utf8");',
    'const fd = Number(process.env.STARSHIP_SUPERVISOR_REGISTRY_FD);',
    'writeSync(fd, bytes, 0, bytes.length, null);',
    'fsyncSync(fd);'
  ].join("\n"), { mode: 0o600 });
  globalThis.setTimeout = (callback, delay, ...args) => {
    const fromSupervisor = delay === 25 &&
      new Error().stack?.includes("run-starship-playwright-supervised.mjs");
    if (fromSupervisor) {
      supervisorProcessScanTimers += 1;
      if (supervisorProcessScanTimers === 2) {
        return inheritedSetTimeout(() => {
          processTarget.emit("SIGINT");
          processTarget.emit("SIGTERM");
          callback(...args);
        }, delay);
      }
    }
    return inheritedSetTimeout(callback, delay, ...args);
  };
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        processTarget,
        repositoryRoot: fixtureRoot,
        runId: "terminal-audit-signals",
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(supervisorProcessScanTimers, 2);
    assert.equal(receipt.status, "failed");
    assert.deepEqual(
      receipt.signals.forwarded.map(({ phase, signal }) => ({ phase, signal })),
      [
        { phase: "terminal-cleanup", signal: "SIGINT" },
        { phase: "terminal-cleanup", signal: "SIGTERM" }
      ]
    );
    assert.deepEqual(
      receipt.violations.filter((value) => /^Supervisor received SIG(?:INT|TERM)\.$/u.test(value)),
      ["Supervisor received SIGINT.", "Supervisor received SIGTERM."]
    );
    assert.equal(receipt.registry.unmatchedIntentCount, 1);
    assert.deepEqual(receipt.registry.abandonedIntents, []);
    assert.ok(receipt.violations.some((value) => /no exact terminal result/iu.test(value)));
    assert.equal(processTarget.listenerCount("SIGINT"), 0);
    assert.equal(processTarget.listenerCount("SIGTERM"), 0);
  } finally {
    globalThis.setTimeout = inheritedSetTimeout;
    processTarget.removeAllListeners();
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("real signals sent during synchronous terminal receipt sealing cannot leave a green artifact", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const fixtureRoot = uniqueFixtureRoot(`physical-seal-${signal.toLowerCase()}`);
    const fixtureScripts = path.join(fixtureRoot, "scripts");
    const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
    const senderReadyPath = path.join(fixtureRoot, ".tmp", "sender-ready.json");
    const triggerPath = path.join(fixtureRoot, ".tmp", "seal-window-trigger.json");
    const senderAckPath = path.join(fixtureRoot, ".tmp", "sender-ack.json");
    const inheritedStringify = JSON.stringify;
    const listenersBefore = {
      SIGINT: process.listenerCount("SIGINT"),
      SIGTERM: process.listenerCount("SIGTERM")
    };
    mkdirSync(fixtureScripts, { recursive: true });
    writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
    writeFileSync(innerRunnerPath, "process.exit(0);\n", { mode: 0o600 });
    const sender = spawn(process.execPath, [
      "-e",
      [
        'const { existsSync, writeFileSync } = require("node:fs");',
        `const triggerPath = ${inheritedStringify(triggerPath)};`,
        `const senderReadyPath = ${inheritedStringify(senderReadyPath)};`,
        `const senderAckPath = ${inheritedStringify(senderAckPath)};`,
        `const parentPid = ${process.pid};`,
        `const signal = ${inheritedStringify(signal)};`,
        'writeFileSync(senderReadyPath, `${JSON.stringify({ pid: process.pid })}\\n`, "utf8");',
        'const wait = () => {',
        '  if (!existsSync(triggerPath)) return setTimeout(wait, 1);',
        '  let success = false;',
        '  let error = null;',
        '  try { process.kill(parentPid, signal); success = true; }',
        '  catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }',
        '  writeFileSync(senderAckPath, `${JSON.stringify({ error, signal, success })}\\n`, "utf8");',
        '};',
        'wait();'
      ].join("\n")
    ], {
      env: fixtureEnvironment(fixtureRoot),
      stdio: ["ignore", "ignore", "ignore"]
    });
    try {
      await waitForPath(senderReadyPath);
      let terminalReceiptStringifyCount = 0;
      JSON.stringify = (value, ...args) => {
        const isTerminalReceipt = value?.contract === "starship-playwright-supervisor-v2" &&
          value?.schemaVersion === 2 &&
          value?.signals &&
          Array.isArray(value?.violations);
        if (isTerminalReceipt) {
          terminalReceiptStringifyCount += 1;
          writeFileSync(triggerPath, `${inheritedStringify({ signal })}\n`, "utf8");
          const deadline = Date.now() + 5_000;
          while (!existsSync(senderAckPath)) {
            if (Date.now() >= deadline) {
              throw new Error(`Timed out waiting for real ${signal} sender ACK during receipt seal.`);
            }
          }
        }
        return inheritedStringify(value, ...args);
      };
      let executionResult = null;
      let terminalError = null;
      try {
        executionResult = await executeSupervisedStarshipPlaywright({
          baseEnvironment: fixtureEnvironment(fixtureRoot),
          innerArgs: ["test", "tests/e2e/example.spec.ts"],
          innerRunnerPath,
          repositoryRoot: fixtureRoot,
          runId: `physical-seal-${signal.toLowerCase()}`,
          stderrSink: null,
          stdoutSink: null
        });
      } catch (error) {
        terminalError = error;
      }
      const receiptPath = terminalError?.receiptPath ?? executionResult?.receiptPath;
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
      const senderAck = JSON.parse(readFileSync(senderAckPath, "utf8"));
      assert.deepEqual(
        {
          forwarded: receipt.signals.forwarded
            .filter((entry) => entry.signal === signal)
            .map(({ signal: forwardedSignal }) => forwardedSignal),
          senderSuccess: senderAck.success,
          status: receipt.status,
          stringifyCount: terminalReceiptStringifyCount
        },
        {
          forwarded: [signal],
          senderSuccess: true,
          status: "failed",
          stringifyCount: 2
        }
      );
      assert.equal(terminalError instanceof Error, true);
      assert.deepEqual(
        receipt.violations.filter((value) => value === `Supervisor received ${signal}.`),
        [`Supervisor received ${signal}.`]
      );
      assert.deepEqual(
        receipt.signals.forwarded.map(({ acceptance, parentDeathRelevant, phase, signal: value }) => ({
          acceptance,
          parentDeathRelevant,
          phase,
          signal: value
        })),
        [{
          acceptance: "after-acceptance-close",
          parentDeathRelevant: false,
          phase: "post-acceptance-close",
          signal
        }]
      );
      assert.match(receipt.signals.finalization.candidateReceiptSha256, /^[a-f0-9]{64}$/u);
      assert.equal(receipt.signals.finalization.acceptanceOpenedSequence, 0);
      assert.equal(receipt.signals.finalization.acceptanceClosedSequence, 0);
      assert.equal(receipt.signals.finalization.candidateDeliveredCount, 0);
      assert.equal(receipt.signals.finalization.terminalEvidenceClosedSequence, 1);
      assert.equal(receipt.signals.finalization.outerExitEvidenceRequired, true);
      assert.equal(
        receipt.signals.finalization.guarantee,
        "Node callback delivered before terminalEvidenceClosed; not wall-clock signal arrival or file-seal atomicity."
      );
      assert.deepEqual(receipt.signals.finalization.releaseGreenRequires, {
        liveSignalJournalMatchesReceipt: true,
        outerExitCode: 0,
        outerExitSignal: null,
        validatorRunsAfterOuterProcessExit: true
      });
      assert.equal(receipt.signals.journal.deliveredCount, 1);
      assert.equal(receipt.signals.journal.deliveredRecords[0].signal, signal);
      assert.equal(receipt.signals.journal.receipt.exact, true);
      assert.equal(receipt.signals.journal.snapshotExact, true);
      assert.equal(
        receipt.signals.journal.expectedSha256,
        receipt.signals.journal.receipt.final.sha256
      );
      assert.equal(
        receipt.signals.journal.receipt.final.sha256,
        createHash("sha256")
          .update(readFileSync(receipt.signals.journal.path))
          .digest("hex")
      );
      assert.deepEqual({
        SIGINT: process.listenerCount("SIGINT"),
        SIGTERM: process.listenerCount("SIGTERM")
      }, listenersBefore);
    } finally {
      JSON.stringify = inheritedStringify;
      try {
        process.kill(sender.pid, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  }
});

test("an unmatched intent from a SIGKILLed exact parent receives only the explicit abandoned disposition", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("abandoned-intent");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { createHash } from "node:crypto";',
    'import { execFileSync } from "node:child_process";',
    'import { fsyncSync, writeSync } from "node:fs";',
    'const hash = (value) => createHash("sha256").update(value).digest("hex");',
    'const output = execFileSync("ps", ["-p", String(process.pid), "-o", "pid=,pgid=,lstart=,command="], { encoding: "utf8" }).trim();',
    'const match = output.match(/^\\s*(\\d+)\\s+(\\d+)\\s+(\\S+\\s+\\S+\\s+\\d+\\s+\\d\\d:\\d\\d:\\d\\d\\s+\\d{4})\\s+(.*)$/u);',
    'const eventId = "manual-abandoned-intent";',
    'const value = { argvSha256: "a".repeat(64), commandSha256: "b".repeat(64), createdAt: new Date().toISOString(), detachedRequested: true, eventId, kind: "spawn", parentPgid: Number(match[2]), parentPid: process.pid, parentProcessCommandSha256: hash(Buffer.from(match[4], "utf8")), parentStartToken: match[3].trim(), runNonceSha256: hash(process.env.STARSHIP_SUPERVISOR_RUN_NONCE), runTokenSha256: hash(process.env.STARSHIP_SUPERVISOR_RUN_TOKEN), schemaVersion: 1 };',
    'const bytes = Buffer.from(JSON.stringify({ fileName: `${eventId}.intent.json`, value }) + "\\n", "utf8");',
    'const fd = Number(process.env.STARSHIP_SUPERVISOR_REGISTRY_FD);',
    'writeSync(fd, bytes, 0, bytes.length, null);',
    'fsyncSync(fd);',
    'process.kill(process.pid, "SIGKILL");'
  ].join("\n"), { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "abandoned-intent",
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.ok(receipt.registry.unmatchedIntentCount >= 1);
    assert.equal(
      receipt.registry.abandonedIntents.length,
      receipt.registry.unmatchedIntentCount
    );
    assert.ok(receipt.registry.abandonedIntents.some(
      ({ classification, eventId }) =>
        classification === "abandoned-parent-death" && eventId === "manual-abandoned-intent"
    ));
    assert.equal(receipt.violations.some((value) => /no exact terminal result/iu.test(value)), false);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("real CLI prelaunch and repeated signals still seal cleanup and terminal evidence", async () => {
  const fixtureRoot = uniqueFixtureRoot("real-cli-signals");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const supervisorCliPath = path.join(fixtureScripts, "run-starship-playwright-supervised.mjs");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "real-cli-signals";
  const receiptPath = path.join(
    fixtureRoot,
    ".tmp",
    `starship-playwright-supervisor-${runId}`,
    "supervisor-terminal-receipt.json"
  );
  mkdirSync(fixtureScripts, { recursive: true });
  copyFileSync(supervisorSourcePath, supervisorCliPath);
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(
    innerRunnerPath,
    `/*${"x".repeat(16 * 1024 * 1024)}*/\nsetInterval(() => {}, 1000);\n`,
    { mode: 0o600 }
  );
  const cli = spawn(process.execPath, [
    supervisorCliPath,
    "--repository-root", fixtureRoot,
    "--inner-runner", innerRunnerPath,
    "--run-id", runId,
    "--term-grace-ms", "100",
    "--kill-grace-ms", "3000",
    "--",
    "test",
    "tests/e2e/example.spec.ts"
  ], {
    env: fixtureEnvironment(fixtureRoot),
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  cli.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  try {
    await waitForPath(receiptPath);
    process.kill(cli.pid, "SIGTERM");
    process.kill(cli.pid, "SIGINT");
    process.kill(cli.pid, "SIGTERM");
    const outcome = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("real CLI signal test timed out")),
        10_000
      );
      cli.once("exit", (code, signal) => {
        clearTimeout(timer);
        resolve({ code, signal });
      });
    });
    assert.equal(outcome.signal, null, stderr);
    assert.equal(outcome.code, 1, stderr);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.cleanup.complete, true);
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assert.ok(receipt.signals.forwarded.length >= 1);
    assert.equal(existsSync(receipt.paths.supervisorLockPath), false);
  } finally {
    try {
      process.kill(cli.pid, "SIGKILL");
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("closing the canonical stdout descriptor is a real log-write failure and remains RED", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("canonical-log-fd-failure");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "canonical-log-fd-failure";
  const readyPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "ready");
  const releasePath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "release");
  const stdoutPath = path.join(
    fixtureRoot,
    ".tmp",
    `starship-playwright-supervisor-${runId}`,
    "inner.stdout.log"
  );
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { existsSync, mkdirSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const readyPath = ${JSON.stringify(readyPath)};`,
    `const releasePath = ${JSON.stringify(releasePath)};`,
    'mkdirSync(path.dirname(readyPath), { recursive: true });',
    'writeFileSync(readyPath, "ready\\n", "utf8");',
    'while (!existsSync(releasePath)) await new Promise((resolve) => setTimeout(resolve, 10));',
    'console.log("canonical-descriptor-write-must-fail");'
  ].join("\n"), { mode: 0o600 });
  try {
    const execution = executeSupervisedStarshipPlaywright({
      baseEnvironment: fixtureEnvironment(fixtureRoot),
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      repositoryRoot: fixtureRoot,
      runId,
      stderrSink: null,
      stdoutSink: null
    });
    await waitForPath(readyPath);
    const stdoutStat = statSync(stdoutPath);
    let closedDescriptor = null;
    for (let descriptor = 3; descriptor < 1024; descriptor += 1) {
      try {
        const observed = fstatSync(descriptor);
        if (observed.dev === stdoutStat.dev && observed.ino === stdoutStat.ino) {
          closeSync(descriptor);
          closedDescriptor = descriptor;
          break;
        }
      } catch {}
    }
    assert.ok(Number.isInteger(closedDescriptor));
    writeFileSync(releasePath, "release\n", "utf8");
    const { receipt } = await expectSupervisorFailure(execution);
    assert.equal(receipt.logs.stdout.exact, false);
    assert.ok(receipt.logs.stdout.errors.some(
      ({ destination }) => ["file", "fsync", "close"].includes(destination)
    ));
    assert.equal(receipt.cleanup.complete, false);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a same-PID start-token PGID exec transition is audited without an identity mismatch", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("same-group-command-transition");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const helperPath = path.join(fixtureScripts, "same_group_exec.py");
  const runId = "same-group-command-transition";
  const pidPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "transition.pid");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(helperPath, [
    "import os",
    "import time",
    `pid_path = ${JSON.stringify(pidPath)}`,
    "os.environ.clear()",
    "os.makedirs(os.path.dirname(pid_path), exist_ok=True)",
    "with open(pid_path, 'w', encoding='utf-8') as handle:",
    "    handle.write(str(os.getpid()) + '\\n')",
    "    handle.flush()",
    "    os.fsync(handle.fileno())",
    "time.sleep(0.25)",
    "os.execve('/bin/sh', ['sh', '-c', \"trap '' TERM INT; while :; do /bin/sleep 1; done\"], {'PATH': '/usr/bin:/bin'})"
  ].join("\n"), { mode: 0o600 });
  writeFileSync(innerRunnerPath, [
    'import { spawn } from "node:child_process";',
    'import { existsSync } from "node:fs";',
    `const helperPath = ${JSON.stringify(helperPath)};`,
    `const pidPath = ${JSON.stringify(pidPath)};`,
    'const child = spawn("/usr/bin/python3", [helperPath], { stdio: ["ignore", "inherit", "inherit"] });',
    'child.unref();',
    'const deadline = Date.now() + 5000;',
    'while (!existsSync(pidPath)) { if (Date.now() >= deadline) throw new Error("same-group exec process not ready"); await new Promise((resolve) => setTimeout(resolve, 10)); }',
    'await new Promise((resolve) => setTimeout(resolve, 500));'
  ].join("\n"), { mode: 0o600 });
  let transitionPid = null;
  try {
    const { error, receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 100
      })
    );
    transitionPid = Number(readFileSync(pidPath, "utf8").trim());
    assert.match(error.message, /residual owned process/iu);
    assert.doesNotMatch(error.message, /identity validation/iu);
    assert.equal(receipt.registry.identityMismatches.length, 0);
    assert.ok(receipt.registry.commandTransitions.some((transition) =>
      transition.pid === transitionPid &&
      transition.pgid === receipt.child.processGroupId &&
      transition.startToken.length > 0 &&
      /^[a-f0-9]{64}$/u.test(transition.registeredCommandSha256) &&
      /^[a-f0-9]{64}$/u.test(transition.observedCommandSha256) &&
      transition.registeredCommandSha256 !== transition.observedCommandSha256 &&
      transition.reason === "live-registry-command-transition"
    ));
    assert.equal(receipt.cleanup.ownedUniverse.actions.some(
      ({ processGroupId }) => processGroupId === receipt.child.processGroupId
    ), true);
    assert.equal(receipt.cleanup.processGroupTermination.provenEmpty, true);
    assertProcessDead(transitionPid);
  } finally {
    if (Number.isInteger(transitionPid)) {
      try {
        process.kill(transitionPid, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
    }
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a previously validated command-changed detached pipe holder is harvested", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("command-change-eof");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const helperPath = path.join(fixtureScripts, "escape_pipe.py");
  const runId = "command-change-eof";
  const pidPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "escaped.pid");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(helperPath, [
    "import os",
    "import time",
    `pid_path = ${JSON.stringify(pidPath)}`,
    "os.environ.clear()",
    "os.setsid()",
    "os.makedirs(os.path.dirname(pid_path), exist_ok=True)",
    "with open(pid_path, 'w', encoding='utf-8') as handle:",
    "    handle.write(str(os.getpid()) + '\\n')",
    "    handle.flush()",
    "    os.fsync(handle.fileno())",
    "time.sleep(0.25)",
    "os.execve('/bin/sh', ['sh', '-c', \"trap '' TERM INT; while :; do /bin/sleep 1; done\"], {'PATH': '/usr/bin:/bin'})"
  ].join("\n"), { mode: 0o600 });
  writeFileSync(innerRunnerPath, [
    'import { spawn } from "node:child_process";',
    'import { existsSync } from "node:fs";',
    `const helperPath = ${JSON.stringify(helperPath)};`,
    `const pidPath = ${JSON.stringify(pidPath)};`,
    'const child = spawn("/usr/bin/python3", [helperPath], { stdio: ["ignore", "inherit", "inherit"] });',
    'child.unref();',
    'const deadline = Date.now() + 5000;',
    'while (!existsSync(pidPath)) { if (Date.now() >= deadline) throw new Error("escaped pipe holder not ready"); await new Promise((resolve) => setTimeout(resolve, 10)); }',
    'await new Promise((resolve) => setTimeout(resolve, 500));'
  ].join("\n"), { mode: 0o600 });
  let escapedPid = null;
  let escapedWitness = null;
  try {
    const { error, receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 100
      })
    );
    escapedPid = Number(readFileSync(pidPath, "utf8").trim());
    escapedWitness = exactReceiptProcessWitness(
      receipt,
      escapedPid,
      "command-changed detached child receipt"
    );
    assert.match(error.message, /identity validation|residual owned process/iu);
    assert.equal(receipt.logs.stdout.stream.ended, true);
    assert.equal(receipt.logs.stdout.stream.timedOut, false);
    assert.ok(receipt.registry.identityMismatches.some(({ pid }) => pid === escapedPid));
    assert.equal(receipt.cleanup.ownedUniverse.actions.some(
      ({ processGroupId }) => processGroupId === escapedPid
    ), true);
    assert.ok(receipt.cleanup.validatedDetachedProcessGroups.includes(escapedPid));
    assert.equal(receipt.cleanup.detachedProcessGroupTermination.every(
      ({ provenEmpty }) => provenEmpty
    ), true);
    assertProcessDead(escapedPid);
  } finally {
    if (escapedWitness) signalExactProcessGroupForTestCleanup(escapedWitness);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a token-scrubbed residual in the exact inner process group is harvested", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("inner-group-token-scrub");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const helperPath = path.join(fixtureScripts, "scrub_inner_group.py");
  const runId = "inner-group-token-scrub";
  const pidPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "residual.pid");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(helperPath, [
    "import os",
    "import time",
    `pid_path = ${JSON.stringify(pidPath)}`,
    "os.makedirs(os.path.dirname(pid_path), exist_ok=True)",
    "with open(pid_path, 'w', encoding='utf-8') as handle:",
    "    handle.write(str(os.getpid()) + '\\n')",
    "    handle.flush()",
    "    os.fsync(handle.fileno())",
    "time.sleep(0.25)",
    "os.environ.clear()",
    "os.execve('/bin/sh', ['sh', '-c', \"trap '' TERM INT; while :; do /bin/sleep 1; done\"], {'PATH': '/usr/bin:/bin'})"
  ].join("\n"), { mode: 0o600 });
  writeFileSync(innerRunnerPath, [
    'import { spawn } from "node:child_process";',
    'import { existsSync } from "node:fs";',
    `const helperPath = ${JSON.stringify(helperPath)};`,
    `const pidPath = ${JSON.stringify(pidPath)};`,
    'const child = spawn("/usr/bin/python3", [helperPath], { detached: false, stdio: "ignore" });',
    'child.unref();',
    'const deadline = Date.now() + 5000;',
    'while (!existsSync(pidPath)) { if (Date.now() >= deadline) throw new Error("inner residual not ready"); await new Promise((resolve) => setTimeout(resolve, 10)); }',
    'await new Promise((resolve) => setTimeout(resolve, 350));'
  ].join("\n"), { mode: 0o600 });
  let residualPid = null;
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 100
      })
    );
    residualPid = Number(readFileSync(pidPath, "utf8").trim());
    assert.equal(receipt.cleanup.processGroupTermination.provenEmpty, true);
    assert.deepEqual(receipt.cleanup.processGroupTermination.finalMembers, []);
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assertProcessDead(residualPid);
  } finally {
    if (Number.isInteger(residualPid)) {
      try {
        process.kill(residualPid, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH") throw error;
      }
    }
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("correct token with a wrong nonce is conjunctively foreign and is never signaled", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("wrong-nonce");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "wrong-nonce";
  const handshakePath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "handshake.json");
  const releasePath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "release");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { existsSync, mkdirSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const handshakePath = ${JSON.stringify(handshakePath)};`,
    `const releasePath = ${JSON.stringify(releasePath)};`,
    'mkdirSync(path.dirname(handshakePath), { recursive: true });',
    'writeFileSync(handshakePath, JSON.stringify({ nonce: process.env.STARSHIP_SUPERVISOR_RUN_NONCE, token: process.env.STARSHIP_SUPERVISOR_RUN_TOKEN }) + "\\n", { mode: 0o600 });',
    'while (!existsSync(releasePath)) await new Promise((resolve) => setTimeout(resolve, 10));'
  ].join("\n"), { mode: 0o600 });
  let foreign = null;
  let foreignWitness = null;
  try {
    const execution = executeSupervisedStarshipPlaywright({
      baseEnvironment: fixtureEnvironment(fixtureRoot),
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      repositoryRoot: fixtureRoot,
      runId,
      stderrSink: null,
      stdoutSink: null
    });
    await waitForPath(handshakePath);
    const handshake = JSON.parse(readFileSync(handshakePath, "utf8"));
    foreign = spawn(
      process.execPath,
      ["--eval", "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],
      {
        detached: true,
        env: {
          PATH: process.env.PATH,
          STARSHIP_SUPERVISOR_RUN_NONCE: `${handshake.nonce}-wrong`,
          STARSHIP_SUPERVISOR_RUN_TOKEN: handshake.token
        },
        stdio: "ignore"
      }
    );
    foreign.unref();
    foreignWitness = captureExactProcessWitness(foreign.pid);
    writeFileSync(releasePath, "release\n", "utf8");
    const { receipt } = await execution;
    assert.equal(receipt.status, "passed");
    assert.equal(receipt.cleanup.ownedUniverse.actions.some(
      ({ processGroupId }) => processGroupId === foreign.pid
    ), false);
    assert.doesNotThrow(() => process.kill(foreign.pid, 0));
  } finally {
    if (foreignWitness) signalExactProcessGroupForTestCleanup(foreignWitness);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("runtime preload ACK retains exact inner ownership after its environment is scrubbed", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("scrubbed-inner-ack");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "scrubbed-inner-ack";
  const readyPath = path.join(fixtureRoot, ".tmp", `e2e-run-${runId}`, "ready");
  const processTarget = new EventEmitter();
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const readyPath = ${JSON.stringify(readyPath)};`,
    'for (const name of Object.keys(process.env)) if (name.startsWith("STARSHIP_SUPERVISOR_")) delete process.env[name];',
    'process.on("SIGTERM", () => {});',
    'mkdirSync(path.dirname(readyPath), { recursive: true });',
    'writeFileSync(readyPath, "ready\\n", "utf8");',
    'setInterval(() => {}, 1000);'
  ].join("\n"), { mode: 0o600 });
  try {
    const execution = executeSupervisedStarshipPlaywright({
      baseEnvironment: fixtureEnvironment(fixtureRoot),
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      processTarget,
      repositoryRoot: fixtureRoot,
      runId,
      stderrSink: null,
      stdoutSink: null,
      termGraceMs: 100
    });
    await waitForPath(readyPath);
    processTarget.emit("SIGTERM");
    const { receipt } = await expectSupervisorFailure(execution);
    assert.equal(receipt.cleanup.ownedUniverse.provenEmpty, true);
    assert.ok(receipt.registry.preloadAcks.some(
      ({ pid }) => pid === receipt.child.processGroupId
    ));
    assert.ok(receipt.signals.forwarded.some(({ actions }) =>
      actions.some(({ processGroupId, signal }) =>
        processGroupId === receipt.child.processGroupId && signal === "SIGKILL"
      )
    ));
    assertProcessDead(receipt.child.processGroupId);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a regular tsconfig created outside the preload receipt path is preserved as unproven", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("unproven-tsconfig");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "unproven-tsconfig";
  const tsconfigPath = path.join(
    fixtureRoot,
    ".tmp",
    `e2e-run-${runId}`,
    `tsconfig.playwright-${runId}.tmp.json`
  );
  const exactBytes = '{"foreign":"unproven"}\n';
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { spawnSync } from "node:child_process";',
    `const target = ${JSON.stringify(tsconfigPath)};`,
    `const exactBytes = ${JSON.stringify(exactBytes)};`,
    'const result = spawnSync("/bin/sh", ["-c", "printf %s \\\"$EXACT_BYTES\\\" > \\\"$TARGET\\\""], { env: { EXACT_BYTES: exactBytes, PATH: process.env.PATH, TARGET: target }, stdio: "ignore" });',
    'if (result.status !== 0) throw new Error(`native writer failed ${result.status}`);'
  ].join("\n"), { mode: 0o600 });
  try {
    const { error, receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.match(error.message, /tsconfig cleanup is incomplete/iu);
    assert.equal(receipt.cleanup.nextTsconfig.status, "unproven-creation-preserved");
    assert.equal(receipt.cleanup.nextTsconfig.creationRecordCount, 0);
    assert.equal(existsSync(tsconfigPath), true);
    assert.equal(readFileSync(tsconfigPath, "utf8"), exactBytes);
    assert.equal(receipt.registry.tsconfigCreationCount, 0);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a runtime preload path replacement cannot produce a descendant ACK or a green receipt", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("preload-runtime-replacement");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { spawnSync } from "node:child_process";',
    'import { renameSync, symlinkSync } from "node:fs";',
    'const preloadPath = process.env.STARSHIP_SUPERVISOR_PRELOAD_PATH;',
    'const displaced = `${preloadPath}.owned-displaced`;',
    'renameSync(preloadPath, displaced);',
    'symlinkSync(displaced, preloadPath);',
    'const child = spawnSync(process.execPath, ["--eval", "process.exit(0)"], { stdio: "ignore" });',
    'if (child.status === 0) throw new Error("replaced preload unexpectedly initialized");'
  ].join("\n"), { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "preload-runtime-replacement",
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(receipt.preload.after, null);
    assert.ok(receipt.violations.some((value) => /preload postflight failed/iu.test(value)));
    assert.equal(receipt.registry.preloadAckCount, 1);
    assert.equal(lstatSync(receipt.paths.preloadPath).isSymbolicLink(), true);
    assert.equal(receipt.releaseReady, false);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a false cleanup conjunction is always a terminal violation", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("cleanup-conjunction");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "cleanup-conjunction";
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const supervisorRoot = path.join(process.cwd(), ".tmp", ${JSON.stringify(`starship-playwright-supervisor-${runId}`)});`,
    'mkdirSync(supervisorRoot, { recursive: true });',
    'writeFileSync(path.join(supervisorRoot, "next-env.d.ts.atomic-restore.tmp"), "foreign-temp\\n", { mode: 0o600 });'
  ].join("\n"), { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(receipt.cleanup.complete, false);
    assert.equal(receipt.status, "failed");
    assert.ok(receipt.violations.some((value) => /cleanup.*not complete/iu.test(value)));
    assert.equal(
      readFileSync(receipt.paths.nextEnvRestoreTempPath, "utf8"),
      "foreign-temp\n"
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("an asynchronous terminal sink failure is sealed instead of escaping the receipt", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("async-sink-error");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const asyncFailingSink = {
    write(_bytes, callback) {
      setImmediate(() => callback?.(new Error("asynchronous closed sink")));
      return true;
    }
  };
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, 'process.stdout.write("async-sink-bytes\\n");\n', { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "async-sink-error",
        stderrSink: null,
        stdoutSink: asyncFailingSink
      })
    );
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.logs.stdout.exact, false);
    assert.ok(receipt.logs.stdout.errors.some(
      ({ destination, error }) => destination === "sink" && /asynchronous closed sink/u.test(error)
    ));
    assert.ok(receipt.violations.some((value) => /terminal log/iu.test(value)));
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("process discovery ignores PATH-shadowed ps and never aliases mismatched snapshots", async () => {
  const {
    executeSupervisedStarshipPlaywright,
    joinExactProcessSnapshotRows
  } = await import("./run-starship-playwright-supervised.mjs");
  assert.equal(typeof joinExactProcessSnapshotRows, "function");
  const stable = " 101  101  1 Ss   Tue Aug 11 22:10:56 2026 /usr/bin/node exact-runner\n";
  const mixed = [
    " 101  101  1 Rs   Tue Aug 11 22:10:56 2026 /usr/bin/node exact-runner TOKEN=wrong-status",
    " 102  102  1 Ss   Tue Aug 11 22:10:56 2026 /usr/bin/node other TOKEN=wrong-pid"
  ].join("\n");
  assert.deepEqual(joinExactProcessSnapshotRows(stable, mixed), []);
  assert.deepEqual(
    joinExactProcessSnapshotRows(
      stable,
      " 101  101  1 Ss   Tue Aug 11 22:10:56 2026 /usr/bin/node exact-runner TOKEN=owned\n"
    ).map(({ environmentCommand, pid }) => ({ environmentCommand, pid })),
    [{ environmentCommand: "/usr/bin/node exact-runner TOKEN=owned", pid: 101 }]
  );

  const fixtureRoot = uniqueFixtureRoot("absolute-ps");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const shadowBin = path.join(fixtureRoot, "shadow-bin");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  mkdirSync(fixtureScripts, { recursive: true });
  mkdirSync(shadowBin, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, "process.exit(0);\n", { mode: 0o600 });
  const shadowPs = path.join(shadowBin, "ps");
  writeFileSync(shadowPs, "#!/bin/sh\nexit 97\n", { mode: 0o700 });
  chmodSync(shadowPs, 0o700);
  try {
    const result = await executeSupervisedStarshipPlaywright({
      baseEnvironment: fixtureEnvironment(fixtureRoot, {
        PATH: `${shadowBin}:${process.env.PATH}`
      }),
      innerArgs: ["test", "tests/e2e/example.spec.ts"],
      innerRunnerPath,
      repositoryRoot: fixtureRoot,
      runId: "absolute-ps",
      stderrSink: null,
      stdoutSink: null
    });
    const receipt = JSON.parse(readFileSync(result.receiptPath, "utf8"));
    assert.equal(receipt.status, "passed");
    assert.ok(receipt.registry.preloadAckCount >= 1);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("transient runner and preload mutation cannot be hidden by byte-for-byte restoration", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("transient-source-mutation");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { chmodSync, readFileSync, statSync, writeFileSync } from "node:fs";',
    'import { fileURLToPath } from "node:url";',
    'const runnerPath = fileURLToPath(import.meta.url);',
    'const runnerBytes = readFileSync(runnerPath);',
    'const runnerMode = statSync(runnerPath).mode & 0o777;',
    'const preloadPath = process.env.STARSHIP_SUPERVISOR_PRELOAD_PATH;',
    'const preloadBytes = readFileSync(preloadPath);',
    'const preloadMode = statSync(preloadPath).mode & 0o777;',
    'writeFileSync(runnerPath, Buffer.concat([runnerBytes, Buffer.from("// transient-runner\\n")]));',
    'writeFileSync(runnerPath, runnerBytes);',
    'chmodSync(runnerPath, runnerMode);',
    'writeFileSync(preloadPath, Buffer.concat([preloadBytes, Buffer.from("// transient-preload\\n")]));',
    'writeFileSync(preloadPath, preloadBytes);',
    'chmodSync(preloadPath, preloadMode);'
  ].join("\n"), { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "transient-source-mutation",
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(receipt.runner.before.sha256, receipt.runner.after.sha256);
    assert.notEqual(receipt.runner.before.ctimeNs, receipt.runner.after.ctimeNs);
    assert.equal(receipt.preload.before.sha256, receipt.preload.after.sha256);
    assert.notEqual(receipt.preload.before.ctimeNs, receipt.preload.after.ctimeNs);
    assert.ok(receipt.violations.some((value) => /runner changed/iu.test(value)));
    assert.ok(receipt.violations.some((value) => /preload changed/iu.test(value)));
    const innerAck = receipt.registry.preloadAcks.find(
      ({ pid }) => pid === receipt.child.processGroupId
    );
    assert.equal(innerAck.runnerPathSha256, receipt.runner.before.pathSha256);
    assert.equal(innerAck.runnerSha256, receipt.runner.before.sha256);
    assert.equal(innerAck.preloadPathSha256, receipt.preload.before.pathSha256);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("matching run-lock metadata on a foreign inode is preserved", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("foreign-matching-run-lock");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "foreign-matching-run-lock";
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { renameSync, unlinkSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const runId = ${JSON.stringify(runId)};`,
    'const lockPath = path.join(process.cwd(), ".tmp", "starship-playwright-run.lock");',
    'const replacementPath = `${lockPath}.foreign-replacement`;',
    'const bytes = `${JSON.stringify({ ownerPid: process.pid, repositoryRoot: process.cwd(), runId })}\\n`;',
    'writeFileSync(lockPath, bytes, { mode: 0o600 });',
    'writeFileSync(replacementPath, bytes, { mode: 0o600 });',
    'unlinkSync(lockPath);',
    'renameSync(replacementPath, lockPath);'
  ].join("\n"), { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(receipt.cleanup.runLock.status, "unproven-creation-preserved");
    assert.equal(receipt.cleanup.runLock.foreignPreserved, true);
    assert.equal(receipt.cleanup.runLock.creationRecordCount, 1);
    assert.equal(receipt.registry.runLockCreationCount, 1);
    assert.notEqual(
      receipt.cleanup.runLock.source.inode,
      receipt.registry.runLockCreations[0].inode
    );
    assert.equal(existsSync(receipt.paths.runLockPath), true);
    assert.equal(
      JSON.parse(readFileSync(receipt.paths.runLockPath, "utf8")).runId,
      runId
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("post-child and prelaunch signal ownership is retained until each receipt is sealed", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  for (const scenario of ["post-child", "prelaunch"]) {
    const fixtureRoot = uniqueFixtureRoot(`signal-seal-${scenario}`);
    const fixtureScripts = path.join(fixtureRoot, "scripts");
    const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
    const runId = `signal-seal-${scenario}`;
    const receiptPath = path.join(
      fixtureRoot,
      ".tmp",
      `starship-playwright-supervisor-${runId}`,
      "supervisor-terminal-receipt.json"
    );
    const processTarget = new EventEmitter();
    const removalReceipts = [];
    const inheritedRemoveListener = processTarget.removeListener.bind(processTarget);
    processTarget.removeListener = (eventName, listener) => {
      if (["SIGINT", "SIGTERM"].includes(eventName)) {
        let sealed = false;
        try {
          const parsed = JSON.parse(readFileSync(receiptPath, "utf8"));
          sealed = parsed.status === "passed" || parsed.status === "failed";
        } catch {}
        removalReceipts.push({ eventName, sealed });
      }
      return inheritedRemoveListener(eventName, listener);
    };
    mkdirSync(fixtureScripts, { recursive: true });
    writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
    writeFileSync(innerRunnerPath, "process.exit(0);\n", { mode: 0o600 });
    if (scenario === "prelaunch") {
      mkdirSync(path.join(fixtureRoot, ".tmp"), { recursive: true });
      writeFileSync(
        path.join(fixtureRoot, ".tmp", "starship-playwright-supervisor-run.lock"),
        "foreign-supervisor-lock\n",
        { mode: 0o600 }
      );
    }
    try {
      const execution = executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        processTarget,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      });
      if (scenario === "prelaunch") await expectSupervisorFailure(execution);
      else await execution;
      assert.deepEqual(removalReceipts, [
        { eventName: "SIGINT", sealed: true },
        { eventName: "SIGTERM", sealed: true }
      ]);
      assert.equal(processTarget.listenerCount("SIGINT"), 0);
      assert.equal(processTarget.listenerCount("SIGTERM"), 0);
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  }
});

test("foreign cleanup destinations are never replaced and restore chmod is descriptor-bound", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("no-replace-destinations");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const runId = "no-replace-destinations";
  const supervisorRoot = path.join(
    fixtureRoot,
    ".tmp",
    `starship-playwright-supervisor-${runId}`
  );
  const foreignDestinations = {
    nextEnv: path.join(supervisorRoot, "displaced-next-env.d.ts"),
    runLock: path.join(supervisorRoot, "removed-owned-inner-run.lock"),
    tsconfig: path.join(
      supervisorRoot,
      "archived-run-specific-tsconfig",
      `tsconfig.playwright-${runId}.tmp.json`
    )
  };
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(innerRunnerPath, [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    `const runId = ${JSON.stringify(runId)};`,
    `const foreign = ${JSON.stringify(foreignDestinations)};`,
    'writeFileSync(path.join(process.cwd(), "next-env.d.ts"), "mutated-next-env\\n", { mode: 0o600 });',
    'writeFileSync(path.join(process.cwd(), ".tmp", "starship-playwright-run.lock"), `${JSON.stringify({ ownerPid: process.pid, repositoryRoot: process.cwd(), runId })}\\n`, { mode: 0o600 });',
    'writeFileSync(path.join(process.cwd(), ".tmp", `e2e-run-${runId}`, `tsconfig.playwright-${runId}.tmp.json`), "{\\"owned\\":true}\\n", { mode: 0o600 });',
    'for (const destination of Object.values(foreign)) {',
    '  mkdirSync(path.dirname(destination), { recursive: true });',
    '  writeFileSync(destination, `foreign:${path.basename(destination)}\\n`, { mode: 0o600 });',
    '}'
  ].join("\n"), { mode: 0o600 });
  try {
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId,
        stderrSink: null,
        stdoutSink: null
      })
    );
    assert.equal(receipt.cleanup.nextEnv.status, "restore-race-preserved");
    assert.equal(receipt.cleanup.nextEnv.displaced.status, "quarantine-collision-preserved");
    assert.equal(receipt.cleanup.runLock.status, "quarantine-collision-preserved");
    assert.equal(receipt.cleanup.nextTsconfig.status, "archive-collision-preserved");
    for (const destination of Object.values(foreignDestinations)) {
      assert.equal(
        readFileSync(destination, "utf8"),
        `foreign:${path.basename(destination)}\n`
      );
    }
    assert.equal(
      (statSync(receipt.paths.nextEnvRestoreTempPath).mode & 0o777).toString(8),
      "640"
    );
    assert.equal(readFileSync(receipt.paths.runLockPath, "utf8").includes(runId), true);
    assert.equal(existsSync(receipt.paths.nextTsconfigPath), true);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a recorded group remains a terminal obligation when its leader exits before the first sample", async () => {
  const { executeSupervisedStarshipPlaywright } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  const fixtureRoot = uniqueFixtureRoot("recorded-unsampled-group");
  const fixtureScripts = path.join(fixtureRoot, "scripts");
  const innerRunnerPath = path.join(fixtureScripts, "fake-inner.mjs");
  const orphanHelperPath = path.join(fixtureScripts, "unsampled_group.py");
  const groupInfoPath = path.join(fixtureRoot, ".tmp", "unsampled-group.json");
  mkdirSync(fixtureScripts, { recursive: true });
  writeFileSync(path.join(fixtureRoot, "next-env.d.ts"), "canonical-next-env\n", { mode: 0o640 });
  writeFileSync(orphanHelperPath, [
    "import json",
    "import os",
    `info_path = ${JSON.stringify(groupInfoPath)}`,
    "os.setsid()",
    "leader_pid = os.getpid()",
    "child_pid = os.fork()",
    "if child_pid:",
    "    os._exit(0)",
    "os.environ.clear()",
    "os.makedirs(os.path.dirname(info_path), exist_ok=True)",
    "with open(info_path, 'w', encoding='utf-8') as handle:",
    "    json.dump({'childPid': os.getpid(), 'leaderPid': leader_pid, 'pgid': os.getpgrp()}, handle)",
    "    handle.write('\\n')",
    "    handle.flush()",
    "    os.fsync(handle.fileno())",
    "os.execve('/bin/sh', ['sh', '-c', \"trap '' TERM INT; while :; do /bin/sleep 1; done\"], {'PATH': '/usr/bin:/bin'})"
  ].join("\n"), { mode: 0o600 });
  const leader = spawn("/usr/bin/python3", [orphanHelperPath], {
    detached: false,
    stdio: "ignore"
  });
  leader.unref();
  let groupInfo = null;
  let groupWitness = null;
  try {
    await waitForPath(groupInfoPath);
    groupInfo = JSON.parse(readFileSync(groupInfoPath, "utf8"));
    groupWitness = captureExactProcessWitness(groupInfo.childPid);
    assert.equal(groupWitness.pgid, groupInfo.pgid);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assertProcessDead(groupInfo.leaderPid);
    assert.doesNotThrow(() => process.kill(groupInfo.childPid, 0));
    writeFileSync(innerRunnerPath, [
      'import { createHash, randomBytes } from "node:crypto";',
      'import { fsyncSync, writeFileSync } from "node:fs";',
      `const recorded = ${JSON.stringify(groupInfo)};`,
      'const hash = (value) => createHash("sha256").update(String(value)).digest("hex");',
      'const eventId = `recorded-${randomBytes(8).toString("hex")}`;',
      'const now = new Date().toISOString();',
      'const commandSha256 = hash("recorded-unsampled-command");',
      'const argvSha256 = hash("[]");',
      'const ownership = {',
      '  runNonceSha256: hash(process.env.STARSHIP_SUPERVISOR_RUN_NONCE),',
      '  runTokenSha256: hash(process.env.STARSHIP_SUPERVISOR_RUN_TOKEN),',
      '  schemaVersion: 1',
      '};',
      'const intent = { ...ownership, argvSha256, commandSha256, createdAt: now, detachedRequested: true, eventId, kind: "spawn", parentPgid: process.pid, parentPid: process.pid, parentProcessCommandSha256: hash("parent"), parentStartToken: "recorded-parent-start" };',
      'const result = { ...ownership, argvSha256, classification: "spawned", commandSha256, createdAt: now, errorSha256: null, eventId, pgid: recorded.pgid, pid: recorded.leaderPid, processCommandSha256: hash("exited-leader"), startToken: "exited-before-first-sample" };',
      'for (const [suffix, value] of [["intent", intent], ["result", result]]) {',
      '  writeFileSync(3, `${JSON.stringify({ fileName: `${eventId}.${suffix}.json`, value })}\\n`);',
      '  fsyncSync(3);',
      '}'
    ].join("\n"), { mode: 0o600 });
    const { receipt } = await expectSupervisorFailure(
      executeSupervisedStarshipPlaywright({
        baseEnvironment: fixtureEnvironment(fixtureRoot),
        innerArgs: ["test", "tests/e2e/example.spec.ts"],
        innerRunnerPath,
        repositoryRoot: fixtureRoot,
        runId: "recorded-unsampled-group",
        stderrSink: null,
        stdoutSink: null,
        termGraceMs: 100
      })
    );
    const obligation = receipt.cleanup.recordedProcessGroupTermination.find(
      ({ processGroupId }) => processGroupId === groupInfo.pgid
    );
    assert.ok(obligation);
    assert.equal(obligation.provenEmpty, false);
    assert.ok(obligation.finalMembers.some(({ pid }) => pid === groupInfo.childPid));
    assert.equal(obligation.actions.length, 0);
    assert.deepEqual(
      receipt.cleanup.recordedProcessGroupTermination
        .map(({ processGroupId }) => processGroupId)
        .sort((left, right) => left - right),
      receipt.registry.recordedProcessGroups
    );
    assert.equal(receipt.cleanup.complete, false);
    assert.equal(receipt.status, "failed");
    assert.doesNotThrow(() => process.kill(groupInfo.childPid, 0));
  } finally {
    if (groupWitness) signalExactProcessGroupForTestCleanup(groupWitness);
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a foreign source inode interposed after final validation is never unlinked", async () => {
  const { disposeExactRegularFileNoReplace } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  assert.equal(typeof disposeExactRegularFileNoReplace, "function");
  const fixtureRoot = uniqueFixtureRoot("late-source-interposition");
  const sourcePath = path.join(fixtureRoot, "active", "owned.lock");
  const destinationPath = path.join(fixtureRoot, "archive", "owned.lock");
  const displacedPath = path.join(fixtureRoot, "active", "owned.displaced");
  mkdirSync(path.dirname(sourcePath), { recursive: true });
  mkdirSync(path.dirname(destinationPath), { recursive: true });
  writeFileSync(sourcePath, "owned-source\n", { mode: 0o600 });
  const expected = exactFileExpectation(sourcePath);
  try {
    const disposition = disposeExactRegularFileNoReplace({
      containmentRoot: fixtureRoot,
      destinationPath,
      expected,
      interposition: {
        afterAtomicSourceRevalidationBeforeRename() {
          renameSync(sourcePath, displacedPath);
          writeFileSync(sourcePath, "foreign-late-source\n", { mode: 0o600 });
        }
      },
      label: "late source interposition",
      removeSource: true,
      sourcePath
    });
    assert.equal(disposition.status, "foreign-source-preserved");
    assert.equal(disposition.removed, false);
    assert.equal(disposition.foreignPreserved, true);
    assert.equal(readFileSync(sourcePath, "utf8"), "foreign-late-source\n");
    assert.equal(readFileSync(displacedPath, "utf8"), "owned-source\n");
    assert.equal(existsSync(destinationPath), false);
    assert.notEqual(
      exactFileExpectation(sourcePath).inode,
      expected.inode
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("a parent swapped after final validation cannot redirect link or unlink", async () => {
  const { disposeExactRegularFileNoReplace } = await import(
    "./run-starship-playwright-supervised.mjs"
  );
  for (const phase of ["link", "unlink"]) {
    const fixtureRoot = uniqueFixtureRoot(`parent-swap-${phase}`);
    const sourceParent = path.join(fixtureRoot, "active");
    const destinationParent = path.join(fixtureRoot, "archive");
    const movedParent = path.join(fixtureRoot, `${phase}-held-parent`);
    const sourcePath = path.join(sourceParent, "owned.lock");
    const destinationPath = path.join(destinationParent, "owned.lock");
    mkdirSync(sourceParent, { recursive: true });
    mkdirSync(destinationParent, { recursive: true });
    writeFileSync(sourcePath, "owned-parent-source\n", { mode: 0o600 });
    const expected = exactFileExpectation(sourcePath);
    const interposition = phase === "link"
      ? {
          afterFinalParentValidationBeforeLink() {
            renameSync(destinationParent, movedParent);
            mkdirSync(destinationParent, { recursive: true });
            writeFileSync(path.join(destinationParent, "foreign.marker"), "foreign-parent\n");
          }
        }
      : {
          afterFinalParentValidationBeforeUnlink() {
            renameSync(sourceParent, movedParent);
            mkdirSync(sourceParent, { recursive: true });
            writeFileSync(sourcePath, "foreign-parent-source\n", { mode: 0o600 });
          }
        };
    try {
      const disposition = disposeExactRegularFileNoReplace({
        containmentRoot: fixtureRoot,
        destinationPath,
        expected,
        interposition,
        label: `parent swap ${phase}`,
        removeSource: true,
        sourcePath
      });
      assert.equal(disposition.status, "parent-replacement-preserved");
      assert.equal(disposition.removed, false);
      assert.equal(disposition.foreignPreserved, true);
      if (phase === "link") {
        assert.equal(readFileSync(sourcePath, "utf8"), "owned-parent-source\n");
        assert.equal(existsSync(destinationPath), false);
        assert.equal(
          readFileSync(path.join(destinationParent, "foreign.marker"), "utf8"),
          "foreign-parent\n"
        );
      } else {
        assert.equal(readFileSync(sourcePath, "utf8"), "foreign-parent-source\n");
        assert.equal(
          readFileSync(path.join(movedParent, "owned.lock"), "utf8"),
          "owned-parent-source\n"
        );
        assert.equal(existsSync(destinationPath), false);
      }
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  }
});
