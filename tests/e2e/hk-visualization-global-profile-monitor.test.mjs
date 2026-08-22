import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_DEFAULT_INTERVAL_MS,
  HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_MAX_GAP_MS,
  buildHkVisualizationGlobalProfileReceipt,
  hashHkVisualizationGlobalProfileMonitorSources,
  parseHkVisualizationGlobalProfileMonitorArgs,
  resolveHkVisualizationGlobalProfileMonitorPaths,
  runHkVisualizationGlobalProfileMonitor,
  sampleHkVisualizationGlobalProfiles,
  validateHkVisualizationGlobalProfileReceipt,
} from "./hk-visualization-global-profile-monitor.mjs";
import { HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY } from "./hk-visualization-profile-process-sampler.mjs";
import { buildHkVisualizationStarshipPathManifest } from "./hk-visualization-starship-path-contract.mjs";

const workspace = "/Volumes/Starship/MAIS-hk-viz-labs-wt";
const lstart = "Tue Aug 11 10:00:00 2026";
let fixtureOrdinal = 0;

function createFixture(label) {
  fixtureOrdinal += 1;
  const runId = `hk-viz-global-monitor-test-${process.pid}-${Date.now()}-${fixtureOrdinal}-${label}`;
  const manifest = buildHkVisualizationStarshipPathManifest({
    workspace,
    runId,
  });
  assert.ok(manifest.artifactRoot.startsWith(`${workspace}/.tmp/`));
  for (const path of [
    manifest.artifactRoot,
    manifest.globalProfileMonitorDir,
    manifest.browserProfileParent,
    manifest.nodeCompileCacheDir,
    manifest.npmCacheDir,
    manifest.npmLogsDir,
    manifest.xdgCacheDir,
    manifest.xdgConfigDir,
    manifest.xdgStateDir,
  ]) {
    mkdirSync(path, { recursive: true });
  }
  writeFileSync(
    manifest.pathManifestFile,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const paths = resolveHkVisualizationGlobalProfileMonitorPaths({
    manifest,
    manifestPath: manifest.pathManifestFile,
    receiptPath: manifest.globalProfileMonitorReceiptPath,
    readyPath: manifest.globalProfileMonitorReadyPath,
    stopPath: manifest.globalProfileMonitorStopPath,
    pidPath: manifest.globalProfileMonitorPidPath,
  });
  const profilePath = join(
    manifest.browserProfileParent,
    `playwright_chromiumdev_profile-${label}`,
  );
  mkdirSync(profilePath, { recursive: true });
  return { manifest, paths, profilePath };
}

function phaseOneRow(pid, executable = "Google Chrome") {
  return `${pid} 1 ${pid} ${lstart} SN ${executable}`;
}

function phaseTwoRow(pid, command) {
  return `${pid} 1 ${pid} ${lstart} ${command}`;
}

function ok(stdout, overrides = {}) {
  return {
    error: undefined,
    signal: null,
    status: 0,
    stdout,
    stderr: "",
    ...overrides,
  };
}

function fakeTwoPhasePs(profilePaths, calls = null, extraArgument = "") {
  const profileByPid = new Map(
    profilePaths.map((path, index) => [500 + index, path]),
  );
  return (command, args, options) => {
    if (calls) {
      calls.push({
        command,
        args: [...args],
        options: {
          encoding: options.encoding,
          env: { ...options.env },
          maxBuffer: options.maxBuffer,
          timeout: options.timeout,
        },
      });
    }
    if (args[0] === "-axww") {
      return ok(
        [...profileByPid.keys()].map((pid) => phaseOneRow(pid)).join("\n"),
      );
    }
    const pid = Number(args[2]);
    assert.ok(profileByPid.has(pid), `Unexpected targeted PID ${pid}.`);
    return ok(
      phaseTwoRow(
        pid,
        `Google Chrome ${extraArgument} --user-data-dir=${profileByPid.get(pid)}`,
      ),
    );
  };
}

function monitorSample(fixture, ordinal, phase, elapsed, profilePaths = [fixture.profilePath]) {
  return sampleHkVisualizationGlobalProfiles({
    manifest: fixture.manifest,
    ordinal,
    phase,
    monitorStartedAt: 0,
    monotonicNow: () => elapsed,
    spawn: fakeTwoPhasePs(profilePaths),
  });
}

function validReceipt(fixture, stopReason = "stop-file") {
  return buildHkVisualizationGlobalProfileReceipt({
    manifest: fixture.manifest,
    paths: fixture.paths,
    intervalMs: 1_000,
    monitorPid: 4_242,
    startedAtUtc: "2026-08-10T00:00:00.000Z",
    completedAtUtc: "2026-08-10T00:00:01.800Z",
    stopReason,
    samples: [
      monitorSample(fixture, 0, "first", 0),
      monitorSample(fixture, 1, "periodic", 900),
      monitorSample(fixture, 2, "final", 1_800),
    ],
  });
}

test("CLI requires five explicit Starship paths and a bounded interval", () => {
  const fixture = createFixture("cli");
  const argv = [
    "--manifest",
    fixture.paths.manifestPath,
    "--receipt",
    fixture.paths.receiptPath,
    "--ready",
    fixture.paths.readyPath,
    "--stop",
    fixture.paths.stopPath,
    "--pid",
    fixture.paths.pidPath,
    "--interval-ms",
    "750",
  ];
  assert.deepEqual(parseHkVisualizationGlobalProfileMonitorArgs(argv), {
    intervalMs: 750,
    ...fixture.paths,
  });
  assert.equal(
    parseHkVisualizationGlobalProfileMonitorArgs(argv.slice(0, -2)).intervalMs,
    HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_DEFAULT_INTERVAL_MS,
  );
  for (const invalidArgv of [
    argv.slice(2),
    [...argv, "--unknown", "value"],
    [...argv, "--pid", fixture.paths.pidPath],
    [...argv.slice(0, -1), "1001"],
    [...argv.slice(0, -1), "0"],
    [...argv, "--dangling"],
  ]) {
    assert.throws(
      () => parseHkVisualizationGlobalProfileMonitorArgs(invalidArgv),
      /requires|unknown|duplicate|integer|pairs/i,
    );
  }
  const rawMarker = "MONITOR_CLI_RAW_MARKER_MUST_NOT_LEAK";
  assert.throws(
    () =>
      parseHkVisualizationGlobalProfileMonitorArgs([
        ...argv,
        `--${rawMarker}`,
        rawMarker,
      ]),
    (error) => {
      assert.doesNotMatch(String(error?.message), new RegExp(rawMarker));
      assert.match(String(error?.message), /length=|sha256=/);
      return true;
    },
  );
});

test("monitor paths bind to dedicated Starship aliases and reject every foreign alias", () => {
  const fixture = createFixture("paths");
  assert.equal(
    fixture.paths.receiptPath,
    fixture.manifest.globalProfileMonitorReceiptPath,
  );
  assert.notEqual(
    fixture.paths.receiptPath,
    fixture.manifest.runtimeProfileReceiptPath,
  );
  for (const mutate of [
    (paths) => {
      paths.receiptPath = fixture.manifest.runtimeProfileReceiptPath;
    },
    (paths) => {
      paths.readyPath = join(fixture.manifest.servicePidDir, "ready.json");
    },
    (paths) => {
      paths.stopPath = "/tmp/hk-viz-monitor-stop";
    },
    (paths) => {
      paths.manifestPath = fixture.manifest.globalProfileMonitorReceiptPath;
    },
  ]) {
    const candidate = { ...fixture.paths };
    mutate(candidate);
    assert.throws(
      () =>
        resolveHkVisualizationGlobalProfileMonitorPaths({
          manifest: fixture.manifest,
          ...candidate,
        }),
      /must equal|Starship|inside/i,
    );
  }
});

test("one monitor sample binds privacy-bounded policies and retains identities, hashes, and paths only", () => {
  const fixture = createFixture("sample");
  const secondProfilePath = join(
    fixture.manifest.browserProfileParent,
    "playwright_chromiumdev_profile-second",
  );
  mkdirSync(secondProfilePath, { recursive: true });
  const secret = "MONITOR_DECOY_SECRET_41d83";
  const calls = [];
  const sample = sampleHkVisualizationGlobalProfiles({
    manifest: fixture.manifest,
    ordinal: 0,
    phase: "first",
    monitorStartedAt: 100,
    monotonicNow: () => 112.5,
    spawn: fakeTwoPhasePs(
      [secondProfilePath, fixture.profilePath],
      calls,
      `--decoy-secret=${secret}`,
    ),
  });
  assert.equal(sample.monotonicElapsedMs, 12.5);
  assert.deepEqual(sample.rawProfilePaths, [
    fixture.profilePath,
    secondProfilePath,
  ].sort());
  assert.deepEqual(sample.validatedProfilePaths, sample.rawProfilePaths);
  assert.deepEqual(sample.errors, []);
  assert.equal(sample.processEvidence.candidateIdentities.length, 2);
  assert.equal(sample.processEvidence.observations.length, 2);
  assert.ok(
    sample.processEvidence.observations.every((entry) =>
      /^[a-f0-9]{64}$/.test(entry.commandSha256),
    ),
  );
  assert.equal(JSON.stringify(sample).includes(secret), false);
  assert.equal(JSON.stringify(sample).includes("--user-data-dir"), false);
  assert.ok(calls.every((call) => call.command === "/bin/ps"));
  assert.deepEqual(calls[0].options.env, { LANG: "C", LC_ALL: "C" });
  assert.equal(
    calls.filter((call) => call.args[0] === "-axww").length,
    1,
  );
  assert.equal(
    calls.filter((call) => call.args[0] === "-ww").length,
    2,
  );
});

test("foreign profile and two-phase sampler errors fail the monitor sample closed", async (t) => {
  const fixture = createFixture("sample-negative");
  await t.test("foreign profile", () => {
    const foreign = "/var/folders/example/playwright_chromiumdev_profile-foreign";
    const sample = sampleHkVisualizationGlobalProfiles({
      manifest: fixture.manifest,
      ordinal: 0,
      phase: "first",
      monitorStartedAt: 0,
      monotonicNow: () => 1,
      spawn: fakeTwoPhasePs([foreign]),
    });
    assert.ok(sample.errors.length > 0);
    assert.deepEqual(sample.validatedProfilePaths, []);
  });

  await t.test("Starship path without Playwright profile prefix", () => {
    const wrongPrefix = join(
      fixture.manifest.browserProfileParent,
      "ordinary-browser-profile",
    );
    const sample = sampleHkVisualizationGlobalProfiles({
      manifest: fixture.manifest,
      ordinal: 0,
      phase: "first",
      monitorStartedAt: 0,
      monotonicNow: () => 1,
      spawn: fakeTwoPhasePs([wrongPrefix]),
    });
    assert.ok(
      sample.errors.some((error) => /global-profile-wrong-prefix/.test(error)),
    );
    assert.deepEqual(sample.validatedProfilePaths, []);
  });

  await t.test("phase-one ps error has no raw message", () => {
    const secret = "PS_ERROR_SECRET_ae91";
    const sample = sampleHkVisualizationGlobalProfiles({
      manifest: fixture.manifest,
      ordinal: 0,
      phase: "first",
      monitorStartedAt: 0,
      monotonicNow: () => 1,
      spawn: () => ({
        error: Object.assign(new Error(secret), { code: "ETIMEDOUT" }),
        signal: null,
        status: null,
      }),
    });
    assert.ok(sample.errors.length > 0);
    assert.equal(JSON.stringify(sample).includes(secret), false);
  });
});

test("receipt binds monitor and sampler source hashes plus exact two-phase policy", () => {
  const fixture = createFixture("source-policy");
  const receipt = validReceipt(fixture);
  assert.deepEqual(
    receipt.sourceHashes,
    hashHkVisualizationGlobalProfileMonitorSources(),
  );
  assert.deepEqual(
    receipt.profileProcessSamplerPolicy,
    HK_VISUALIZATION_PROFILE_PROCESS_SAMPLER_POLICY,
  );
  assert.equal(JSON.stringify(receipt).includes("--user-data-dir="), false);
  assert.equal(JSON.stringify(receipt).includes("decoy-secret"), false);
});

test("strict receipt validator accepts only contiguous identity-safe evidence with bounded gaps", () => {
  const fixture = createFixture("validator-positive");
  assert.deepEqual(
    validateHkVisualizationGlobalProfileReceipt(validReceipt(fixture), fixture),
    {
      maxGapMs: 900,
      profilePathUnion: [fixture.profilePath],
      sampleCount: 3,
      stopReason: "stop-file",
    },
  );
  assert.equal(
    validateHkVisualizationGlobalProfileReceipt(
      validReceipt(fixture, "sigterm"),
      fixture,
    ).stopReason,
    "sigterm",
  );
});

test("receipt validator accepts a targeted Chrome identity whose transient state column was absent", () => {
  const fixture = createFixture("validator-missing-state");
  const sampleWithMissingState = (ordinal, phase, elapsed) => {
    let call = 0;
    return sampleHkVisualizationGlobalProfiles({
      manifest: fixture.manifest,
      ordinal,
      phase,
      monitorStartedAt: 0,
      monotonicNow: () => elapsed,
      spawn: () => {
        call += 1;
        if (call === 1) {
          return ok(`505 1 505 ${lstart} Google Chrome`);
        }
        return ok(
          phaseTwoRow(
            505,
            `Google Chrome --user-data-dir=${fixture.profilePath}`,
          ),
        );
      },
    });
  };
  const receipt = buildHkVisualizationGlobalProfileReceipt({
    manifest: fixture.manifest,
    paths: fixture.paths,
    intervalMs: 1_000,
    monitorPid: 4_243,
    startedAtUtc: "2026-08-10T00:00:00.000Z",
    completedAtUtc: "2026-08-10T00:00:00.100Z",
    stopReason: "stop-file",
    samples: [
      sampleWithMissingState(0, "first", 0),
      sampleWithMissingState(1, "final", 100),
    ],
  });
  assert.equal(receipt.samples[0].processEvidence.candidateIdentities[0].state, "?");
  assert.deepEqual(
    validateHkVisualizationGlobalProfileReceipt(receipt, fixture),
    {
      maxGapMs: 100,
      profilePathUnion: [fixture.profilePath],
      sampleCount: 2,
      stopReason: "stop-file",
    },
  );
});

test("strict receipt validator rejects source, policy, identity, path, ordering, union, and error drift", async (t) => {
  const fixture = createFixture("validator-negative");
  const mutations = [
    ["runId", (receipt) => (receipt.runId = "foreign-run")],
    ["manifestHash", (receipt) => (receipt.manifestHash = "0".repeat(64))],
    ["source hash", (receipt) => (receipt.sourceHashes.samplerSha256 = "0".repeat(64))],
    ["path", (receipt) => (receipt.paths.readyPath = receipt.paths.stopPath)],
    [
      "policy",
      (receipt) => receipt.profileProcessSamplerPolicy.phaseOne.args.pop(),
    ],
    ["ordinal", (receipt) => (receipt.samples[1].ordinal = 7)],
    ["first", (receipt) => (receipt.samples[0].phase = "periodic")],
    ["last", (receipt) => (receipt.samples.at(-1).phase = "periodic")],
    ["sample count", (receipt) => (receipt.sampleCount = 2)],
    [
      "gap",
      (receipt) => {
        receipt.samples[1].monotonicElapsedMs =
          HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_MAX_GAP_MS + 1;
        receipt.samples[2].monotonicElapsedMs =
          HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_MAX_GAP_MS + 2;
        receipt.maxGapMs = HK_VISUALIZATION_GLOBAL_PROFILE_MONITOR_MAX_GAP_MS + 1;
        receipt.durationMs = receipt.samples[2].monotonicElapsedMs;
      },
    ],
    [
      "foreign raw path",
      (receipt) => {
        receipt.samples[1].rawProfilePaths = [
          "/tmp/playwright_chromiumdev_profile-foreign",
        ];
        receipt.samples[1].validatedProfilePaths = [
          "/tmp/playwright_chromiumdev_profile-foreign",
        ];
      },
    ],
    [
      "process path",
      (receipt) =>
        (receipt.samples[1].processEvidence.observations[0].profilePath =
          join(fixture.manifest.browserProfileParent, "different")),
    ],
    [
      "identity",
      (receipt) =>
        (receipt.samples[1].processEvidence.observations[0].identity.identityHash =
          "0".repeat(64)),
    ],
    [
      "candidate identity hash derivation",
      (receipt) =>
        (receipt.samples[1].processEvidence.candidateIdentities[0].pgid += 1),
    ],
    [
      "observation identity fields",
      (receipt) =>
        (receipt.samples[1].processEvidence.observations[0].identity.ppid += 1),
    ],
    [
      "incomplete candidate resolution",
      (receipt) => receipt.samples[1].processEvidence.observations.pop(),
    ],
    ["union", (receipt) => (receipt.profilePathUnion = [])],
    ["sample errors", (receipt) => receipt.samples[1].errors.push("hidden")],
    ["top errors", (receipt) => receipt.errors.push("hidden")],
    ["status", (receipt) => (receipt.status = "failed")],
    ["stop reason", (receipt) => (receipt.stopReason = "natural-exit")],
    [
      "raw command injection",
      (receipt) =>
        (receipt.samples[1].processEvidence.observations[0].command =
          "secret argv"),
    ],
    ["extra key", (receipt) => (receipt.extra = true)],
  ];
  for (const [name, mutate] of mutations) {
    await t.test(name, () => {
      const receipt = structuredClone(validReceipt(fixture));
      mutate(receipt);
      assert.throws(
        () => validateHkVisualizationGlobalProfileReceipt(receipt, fixture),
        /not fail-closed evidence|exact v1 key set/i,
      );
    });
  }
});

test("lifecycle writes pid, samples before ready, binds source hashes, and atomically seals receipt", async () => {
  const fixture = createFixture("lifecycle");
  let monotonic = 0;
  let wallClockOrdinal = 0;
  const receipt = await runHkVisualizationGlobalProfileMonitor({
    manifest: fixture.manifest,
    paths: fixture.paths,
    intervalMs: 1_000,
    monitorPid: 4_242,
    spawn: fakeTwoPhasePs([fixture.profilePath]),
    monotonicNow: () => {
      const current = monotonic;
      monotonic += 100;
      return current;
    },
    wallClockNow: () =>
      new Date(`2026-08-10T00:00:0${wallClockOrdinal++}.000Z`),
    wait: async () => {
      throw new Error("stop-file fixture must not enter periodic wait");
    },
    requestedStopReason: () => "stop-file",
  });
  assert.equal(readFileSync(fixture.paths.pidPath, "utf8"), "4242\n");
  const ready = JSON.parse(readFileSync(fixture.paths.readyPath, "utf8"));
  assert.equal(ready.firstSampleOrdinal, 0);
  assert.deepEqual(ready.firstSampleErrors, []);
  assert.deepEqual(
    ready.sourceHashes,
    hashHkVisualizationGlobalProfileMonitorSources(),
  );
  const onDiskReceipt = JSON.parse(
    readFileSync(fixture.paths.receiptPath, "utf8"),
  );
  assert.deepEqual(onDiskReceipt, receipt);
  assert.deepEqual(receipt.samples.map((sample) => sample.phase), [
    "first",
    "final",
  ]);
  assert.deepEqual(
    validateHkVisualizationGlobalProfileReceipt(receipt, fixture),
    {
      maxGapMs: 100,
      profilePathUnion: [fixture.profilePath],
      sampleCount: 2,
      stopReason: "stop-file",
    },
  );
  assert.deepEqual(
    readdirSync(fixture.manifest.globalProfileMonitorDir).filter((name) =>
      name.endsWith(".tmp"),
    ),
    [],
  );
});

test("lifecycle seals a failed receipt when its expected parent disappears", async () => {
  const fixture = createFixture("lifecycle-parent-exit");
  let monotonic = 0;
  const expectedParentPid = 9_876;
  const receipt = await runHkVisualizationGlobalProfileMonitor({
    manifest: fixture.manifest,
    paths: fixture.paths,
    intervalMs: 1_000,
    monitorPid: 4_244,
    expectedParentPid,
    spawn: fakeTwoPhasePs([fixture.profilePath]),
    monotonicNow: () => monotonic++,
    wallClockNow: () => new Date("2026-08-10T00:00:00.000Z"),
    wait: async () => {
      throw new Error("a dead parent must stop before periodic waiting");
    },
    expectedParentIsAlive: () => false,
    requestedStopReason: () => null,
  });
  assert.equal(receipt.status, "failed");
  assert.equal(receipt.stopReason, "parent-exit");
  assert.ok(
    receipt.errors.some((error) =>
      error.includes(`expected parent/runner process ${expectedParentPid}`),
    ),
  );
  assert.ok(existsSync(fixture.paths.receiptPath));
  assert.throws(
    () => validateHkVisualizationGlobalProfileReceipt(receipt, fixture),
    /not fail-closed evidence/i,
  );
});
